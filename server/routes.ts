import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { Server as SocketIOServer } from "socket.io";
import express from "express";
import rateLimit from "express-rate-limit";
import { upload } from "./middleware/upload";
import { uploadToCloudinary } from "./utils/uploadToCloudinary";
import { getCloudinary } from "./utils/cloudinary";
import crypto from "crypto";

// Helper: Extract Cloudinary publicId from URL
function extractCloudinaryPublicId(url: string): string | null {
  try {
    // Cloudinary URLs format: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<publicId>.<ext>
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

// Register all routes and socket handlers
export async function registerRoutes(
  httpServer,
  app
) {
  const storage = getStorage();
  // Trust proxy in production for secure cookies behind reverse proxies
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Health monitoring state
  const healthState = {
    isSessionStoreHealthy: true,
    lastSessionError: null,
  };

  // Lightweight health check for ops/monitoring
  app.get("/health", async (_req, res) => {
    const checks = [];
    const timestamp = new Date().toISOString();

    // Check session store health
    if (!healthState.isSessionStoreHealthy) {
      checks.push({ component: "session_store", status: "unhealthy", error: healthState.lastSessionError?.message });
    }

    // Check MongoDB connectivity
    try {
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) { // 1 = connected
        checks.push({ component: "mongodb", status: "unhealthy", error: `Connection state: ${dbState}` });
      }
    } catch (err) {
      checks.push({ component: "mongodb", status: "unhealthy", error: "Connection check failed" });
    }

    // Return 503 if any checks failed
    if (checks.length > 0) {
      return res.status(503).json({ status: "unhealthy", timestamp, checks });
    }

    res.json({ status: "ok", timestamp });
  });

  // Socket.IO Setup (align CORS allowlist with HTTP CORS logic, include Render external URL fallback)
  const socketAllowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL].filter(Boolean)
    : true;



  if (process.env.NODE_ENV === "production" && Array.isArray(socketAllowedOrigins) && socketAllowedOrigins.length === 0) {
    console.error("FATAL: FRONTEND_URL or RENDER_EXTERNAL_URL must be set for Socket.IO CORS.");
    process.exit(1);
  }

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        // Allow requests with Origin: null (health checks, server-to-server)
        if (!origin) return callback(null, true);
        // In development, allow all origins
        if (socketAllowedOrigins === true) return callback(null, true);
        // In production, check allowlist
        if (Array.isArray(socketAllowedOrigins) && socketAllowedOrigins.includes(origin)) {
          return callback(null, origin);
        }
        // Silently deny unknown origins (no thrown error)
        callback(null, false);
      },
      credentials: true,
    },
  });

  // Attach session auth to sockets once session middleware is available
  // Generous per-IP connection throttle to prevent flood abuse (no protocol change)
  const SOCKET_CONNECT_WINDOW_MS = 60_000; // 60 seconds
  const SOCKET_CONNECT_MAX_PER_IP = 60; // generous cap per minute

  function getSocketClientIp(socket: any): string {
    const xfwd = socket.handshake?.headers?.["x-forwarded-for"];
    if (typeof xfwd === "string" && xfwd.length > 0) {
      return xfwd.split(",")[0].trim();
    }
    return socket.handshake?.address || "unknown";
  }

  // Move __socketConnectHistory into middleware closure to eliminate TDZ hazard
  // (module-scope Map captured by closure causes "Cannot access 'X' before initialization" after esbuild minification)
  io.use((() => {
    const __socketConnectHistory = new Map<string, number[]>();
    return (socket, next) => {
      const ip = getSocketClientIp(socket);
      const now = Date.now();
      const history = __socketConnectHistory.get(ip) || [];
      const recent = history.filter((ts) => now - ts <= SOCKET_CONNECT_WINDOW_MS);
      recent.push(now);
      if (recent.length === 0) {
        // Cleanup empty entries to prevent unbounded map growth
        __socketConnectHistory.delete(ip);
      } else {
        __socketConnectHistory.set(ip, recent);
      }

      if (recent.length > SOCKET_CONNECT_MAX_PER_IP) {
        // Log reason only (avoid PII like IP addresses)
        console.warn(`[SOCKET] connection throttled — ${recent.length}/${SOCKET_CONNECT_MAX_PER_IP} in ${SOCKET_CONNECT_WINDOW_MS / 1000}s`);
        return next(new Error("Too many connections"));
      }
      next();
    };
  })());

  io.on("connection", (socket) => {
    const req = socket.request as any;
    const authUser = req?.authUser;

    (async () => {
      try {
        if (!authUser) {
          socket.disconnect(true);
          return;
        }

        if (authUser.type === "user") {
          const user = await storage.getUser(authUser.id);
          if (!user) {
            socket.disconnect(true);
            return;
          }
          socket.join(`user:${user.id}`);
        } else if (authUser.type === "admin") {
          const admin = await storage.getAdmin(authUser.id);
          if (!admin) {
            socket.disconnect(true);
            return;
          }
          socket.join(`admin:${admin.id}`);
          if (admin.wardAssigned) {
            socket.join(`ward:${admin.wardAssigned}`);
          }
          if (admin.role === "SUPER_ADMIN") {
            socket.join("role:super_admin");
          }
        } else {
          socket.disconnect(true);
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("New client connected", socket.id);
        }
      } catch (err) {
        console.error("[SOCKET] auth failed —", err instanceof Error ? err.message : "unknown error");
        socket.disconnect(true);
      }
    })().catch(() => socket.disconnect(true));

    // Handle socket errors to prevent silent failures
    socket.on("error", (error) => {
      console.error(`Socket error [${socket.id}]:`, error);
    });

    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`Client disconnected [${socket.id}] reason: ${reason}`);
      }
    });
  });

  const emitIssueScoped = (ioServer: any, event: string, payload: any, ward?: string | number) => {
    if (ward) {
      ioServer.to(`ward:${ward}`).emit(event, payload);
    }
    ioServer.to("role:super_admin").emit(event, payload);
  };

  // Session Setup
  const isProduction = process.env.NODE_ENV === "production";
  const sessionMaxAgeMs = 1000 * 60 * 60 * 24; // 24h

  // SESSION_SECRET is required; generate random one for development if not provided
  const sessionSecret = process.env.SESSION_SECRET || (() => {
    if (isProduction) {
      throw new Error("FATAL: SESSION_SECRET environment variable is required in production");
    }
    // Development: generate a temporary random secret (session data won't persist across restarts, which is fine for dev)
    return crypto.randomBytes(32).toString("hex");
  })();

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient() as any,
    ttl: sessionMaxAgeMs / 1000,
  });

  sessionStore.on("error", (err) => {
    console.error("Session store error:", err.message);
    healthState.isSessionStoreHealthy = false;
    healthState.lastSessionError = err;

    // Log stack trace only in development
    if (process.env.NODE_ENV !== "production") {
      console.error("Session store stack:", err.stack);
    }
  });

  // Monitor session store ready state
  sessionStore.on("connect", () => {
    healthState.isSessionStoreHealthy = true;
    healthState.lastSessionError = null;
    if (process.env.NODE_ENV !== "production") {
      console.log("Session store connected and healthy");
    }
  });

  sessionStore.on("disconnect", () => {
    console.error("Session store disconnected - sessions will fail");
    healthState.isSessionStoreHealthy = false;
    healthState.lastSessionError = new Error("Session store disconnected");
  });

  const sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax", // "none" required for cross-origin (Vercel → Render)
      secure: isProduction, // Must be true in production when sameSite=none
      maxAge: sessionMaxAgeMs,
    },
  });

  app.use(sessionMiddleware);

  // Attach session auth to sockets AFTER session middleware is initialized (eliminates TDZ)
  io.use((socket, next) => {
    sessionMiddleware(socket.request as any, {} as any, () => {
      const req = socket.request as any;
      const passportUser = req.session?.passport?.user;
      if (!passportUser) {
        const err: any = new Error("Unauthorized");
        err.data = { message: "Unauthorized socket" };
        return next(err);
      }
      req.authUser = passportUser;
      return next();
    });
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Apply global API limiter to all /api routes (skips safe methods)
  app.use("/api", globalApiLimiter);

  // CSRF protection middleware (Origin/Referer validation for state-changing requests)
  const csrfAllowedOrigins = isProduction
    ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL].filter(Boolean)
    : ["http://localhost:5173", "http://localhost:3000"];

  const csrfExcludedPaths = new Set([
    api.auth.loginUser.path,
    api.auth.loginAdmin.path,
    api.users.register.path,
    api.auth.logout.path, // optional exclusion per requirements
  ]);

  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    // Only protect state-changing methods
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    // Do not interfere with Socket.IO transports
    if (req.path.startsWith("/socket.io")) return next();
    // Exclude selected auth routes (match by originalUrl without query, prefix-safe)
    const originalUrl = req.originalUrl as string | undefined;
    const pathname = originalUrl ? originalUrl.split("?")[0] : req.path;
    if ([...csrfExcludedPaths].some((p) => pathname.startsWith(p))) return next();

    const origin = (req.headers.origin as string | undefined) || undefined;
    let checkOrigin = origin;

    // Fallback to Referer if Origin missing
    if (!checkOrigin) {
      const referer = req.headers.referer as string | undefined;
      if (referer) {
        try {
          checkOrigin = new URL(referer).origin;
        } catch {
          // ignore invalid referer format
        }
      }
    }

    if (!checkOrigin || !csrfAllowedOrigins.includes(checkOrigin)) {
      return res.status(403).json({ message: "Forbidden: invalid request origin" });
    }

    return next();
  });

  // Passport Strategies
  // 1. User Strategy (Mobile/Password)
  passport.use(
    "user-local",
    new LocalStrategy({ usernameField: "mobile" }, async (mobile, password, done) => {
      try {
        const user = await storage.getUserByMobileForAuth(mobile);
        if (!user) return done(null, false, { message: "User not found" });
        if (!(await bcrypt.compare(password, user.password))) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, { ...user, type: "user" });
      } catch (err) {
        return done(err);
      }
    })
  );

  // 2. Admin Strategy (AdminId/Password)
  passport.use(
    "admin-local",
    new LocalStrategy({ usernameField: "adminId" }, async (adminId, password, done) => {
      try {
        const admin = await storage.getAdminByAdminIdForAuth(adminId);
        if (!admin) return done(null, false, { message: "Admin not found" });
        if (!(await bcrypt.compare(password, admin.password))) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, { ...admin, type: "admin" });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, { id: user.id, type: user.type });
  });

  passport.deserializeUser(async (obj: any, done) => {
    try {
      if (obj.type === "user") {
        const user = await storage.getUser(obj.id);
        done(null, user ? { ...user, type: "user" } : null);
      } else if (obj.type === "admin") {
        const admin = await storage.getAdmin(obj.id);
        done(null, admin ? { ...admin, type: "admin" } : null);
      } else {
        done(new Error("Unknown user type"));
      }
    } catch (err) {
      done(err);
    }
  });

  // === Auth Routes ===

  // Rate limiter for login endpoints (5 attempts per minute per IP)
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { message: "Too many login attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter for image uploads (10 uploads per hour per IP)
  const imageUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { message: "Too many image uploads. Please try later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Global fallback rate limiter for /api (non-GET) to mitigate floods
  const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
    message: { message: "Too many requests, please slow down" },
  });

  // Per-route rate limiters (generous, additive)
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many registrations, please try later" },
  });

  const createAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many admin creations, please try later" },
  });

  const updateAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many admin updates, please try later" },
  });

  const deleteAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many admin deletions, please try later" },
  });

  const issueStatusLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many status updates, please try later" },
  });

  const issueUpdateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many issue updates, please try later" },
  });

  const issueDeleteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many issue deletions, please try later" },
  });

  const issueVoteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many votes, please slow down" },
  });

  const analyticsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many analytics requests, please try later" },
  });

  app.post(api.auth.loginUser.path, loginLimiter, (req, res, next) => {
    passport.authenticate("user-local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Session persistence error during login:", loginErr);
          return res.status(500).json({ message: "Session creation failed. Please try again." });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.loginAdmin.path, loginLimiter, (req, res, next) => {
    passport.authenticate("admin-local", (err: any, admin: any, info: any) => {
      if (err) return next(err);
      if (!admin) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(admin, (loginErr) => {
        if (loginErr) {
          console.error("Session persistence error during admin login:", loginErr);
          return res.status(500).json({ message: "Session creation failed. Please try again." });
        }
        return res.json(admin);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error("Logout error (passport):", logoutErr);
        // Continue to destroy session even if passport logout fails
      }

      if (req.session) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error("Session destruction error:", sessionErr);
            // Log but still indicate logout success to prevent client retry loops
            // Session will auto-expire on server side
          }
          // Clear session cookie from client
          res.clearCookie("connect.sid", { path: "/" });
          res.json({ message: "Logged out" });
        });
      } else {
        res.clearCookie("connect.sid", { path: "/" });
        res.json({ message: "Logged out" });
      }
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      if (user.type === "user") return res.json({ user });
      if (user.type === "admin") return res.json({ admin: user });
    }
    res.json(null);
  });

  // === User Routes ===

  app.post(api.users.register.path, registerLimiter, async (req, res) => {
    try {
      const input = api.users.register.input.parse(req.body);
      const existing = await storage.getUserByMobile(input.mobile);
      if (existing) return res.status(400).json({ message: "Mobile number already registered" });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.users.updateProfile.input.parse(req.body);

      // Hash password if provided and not already hashed
      if (input.password) {
        if (!isBcryptHash(input.password)) {
          input.password = await bcrypt.hash(input.password, 10);
        }
      }

      const user = await storage.updateUser((req.user as any).id, input);
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // === Admin Routes ===

  app.post(api.admins.create.path, createAdminLimiter, async (req, res) => {
    // Only Super Admin can create admins
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const input = api.admins.create.input.parse(req.body);
      const existing = await storage.getAdminByAdminId(input.adminId);
      if (existing) return res.status(400).json({ message: "Admin ID already exists" });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const admin = await storage.createAdmin({ ...input, password: hashedPassword, createdBy: (req.user as any).id });

      await storage.createAuditLog({
        actorId: (req.user as any).id,
        actorType: "admin",
        actorName: (req.user as any).name,
        action: "create_admin",
        targetId: admin.id,
        targetType: "admin",
        details: `Created admin ${admin.adminId} for ward ${admin.wardAssigned}`,
      });

      res.status(201).json(admin);
    } catch (err) {
      res.status(500).json({ message: "Creation failed" });
    }
  });

  app.get(api.admins.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const admins = await storage.listAdmins();
      res.json(admins);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.get("/api/audit-logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const logs = await storage.listAuditLogs();
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.put(api.admins.update.path, updateAdminLimiter, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const adminId = Number(req.params.id);
      const input = api.admins.update.input.parse(req.body);

      // Hash password if provided
      if (input.password) {
        if (!isBcryptHash(input.password)) {
          input.password = await bcrypt.hash(input.password, 10);
        }
      }

      const admin = await storage.updateAdmin(adminId, input);
      res.json(admin);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.admins.delete.path, deleteAdminLimiter, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const adminId = Number(req.params.id);
      const admin = await storage.getAdmin(adminId);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      if (admin.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot delete Super Admin" });

      await storage.deleteAdmin(adminId);

      await storage.createAuditLog({
        actorId: (req.user as any).id,
        actorType: "admin",
        actorName: (req.user as any).name,
        action: "delete_admin",
        targetId: adminId,
        targetType: "admin",
        details: `Deleted admin account: ${admin.adminId}`,
      });

      res.json({ message: "Admin deleted" });
    } catch (err) {
      res.status(500).json({ message: "Deletion failed" });
    }
  });

  // === Issue Routes ===

  app.get(api.issues.list.path, async (req, res) => {
    try {
      const filters = req.query as { ward?: string; status?: string; category?: string; createdBy?: string };
      const user = req.user as any;
      const userId = req.isAuthenticated() && user.type === 'user' ? user.id : undefined;

      const parsedFilters: any = {
        status: filters.status,
        category: filters.category,
        createdBy: filters.createdBy ? parseInt(filters.createdBy) : undefined,
      };

      // Ward restriction logic
      if (req.isAuthenticated() && user.type === "admin") {
        if (user.role !== "SUPER_ADMIN") {
          // Regular admins are restricted to their assigned ward; deny if missing to avoid over-broad queries
          if (!user.wardAssigned) {
            return res.status(403).json({ message: "Assigned ward is required for admin access" });
          }

          parsedFilters.ward = user.wardAssigned.toString();
        } else if (filters.ward) {
          // Super admins can filter by any ward
          parsedFilters.ward = filters.ward;
        }
      } else {
        // Users/Public can filter by ward if provided
        parsedFilters.ward = filters.ward;
      }

      const issues = await (storage as any).getIssues(parsedFilters, userId);
      res.json(issues);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post("/api/issues/check-duplicates", imageUploadLimiter, async (req, res) => {
    // Only authenticated users can check duplicates (prevents anonymous abuse)
    if (!req.isAuthenticated() || (req.user as any).type !== "user") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { ward, category, title } = req.body;
      if (!ward || !category || !title) return res.status(400).json({ message: "Missing required fields" });
      const duplicates = await (storage as any).findPotentialDuplicates({ ward, category, title });
      res.json(duplicates);
    } catch (err) {
      res.status(500).json({ message: "Duplicate check failed" });
    }
  });

  app.post(api.issues.create.path, upload.single("image"), imageUploadLimiter, async (req, res) => {
    console.log("[UPLOAD:START] POST /api/issues reached", { hasFile: !!req.file, fileName: req.file?.originalname });
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized" });
    try {
      // Create issue first (without image)
      const issueData: any = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        ward: req.body.ward,
        address: req.body.address,
        image: undefined,
      };

      const requiredFields = ["title", "description", "category", "ward", "address"] as const;
      const missingField = requiredFields.find((field) => typeof issueData[field] !== "string" || issueData[field].trim() === "");
      if (missingField) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate ward range (1-200) - ensure valid integer within valid range
      const wardNum = parseInt(issueData.ward, 10);
      if (isNaN(wardNum) || !Number.isInteger(wardNum) || wardNum < 1 || wardNum > 200) {
        return res.status(400).json({ message: "Ward must be an integer between 1 and 200" });
      }

      const issue = await storage.createIssue({ ...issueData, createdBy: (req.user as any).id });

      // Upload image to Cloudinary if provided (after issue creation to get issueId)
      if (req.file) {
        console.log("[UPLOAD:CLOUDINARY_INVOKE] Calling uploadToCloudinary", { issueId: issue.id, fileSize: req.file.buffer.length });
        try {
          const uploadResult = await uploadToCloudinary(req.file.buffer, { issueId: issue.id });
          console.log("[UPLOAD:CLOUDINARY_SUCCESS] Upload completed", { url: uploadResult.url, publicId: uploadResult.publicId });
          // Update issue with image URL
          const updatedIssue = await storage.updateIssue(issue.id, { image: uploadResult.url });
          if (!updatedIssue) return res.status(404).json({ message: "Issue not found" });
          emitIssueScoped(io, "issue:new", { id: updatedIssue.id }, updatedIssue.ward); // Scoped emit
          res.status(201).json(updatedIssue);
          return;
        } catch (uploadError) {
          const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
          console.error("[UPLOAD:CLOUDINARY_ERROR] Upload failed", { error: errorMsg, issueId: issue.id });
          // Image upload failed - rollback by deleting the created issue to maintain consistency
          try {
            await storage.deleteIssue(issue.id);
            console.log("[UPLOAD:ROLLBACK_SUCCESS] Issue deleted after upload failure", { issueId: issue.id });
          } catch (deleteErr) {
            console.error("CRITICAL: Failed to delete issue after image upload failure:", deleteErr);
          }

          const errorMessage = errorMsg;
          let message = "Image upload failed";
          let statusCode = 400;

          if (errorMessage === "Image dimensions too large") {
            message = "Image dimensions too large";
          } else if (errorMessage === "Image service unavailable") {
            message = "Image service unavailable";
            statusCode = 503;
          } else if (errorMessage === "Image upload timeout") {
            message = "Image upload timeout";
            statusCode = 503;
          }

          // Return error without emitting socket event (issue was rolled back)
          return res.status(statusCode).json({ message });
        }
      }

      emitIssueScoped(io, "issue:new", { id: issue.id }, issue.ward); // Scoped emit
      console.log("[UPLOAD:NO_IMAGE] No image provided, issue created without image", { issueId: issue.id });
      res.status(201).json(issue);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Issue creation failed" });
    }
  });

  app.patch(api.issues.updateStatus.path, issueStatusLimiter, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "admin") return res.status(403).json({ message: "Forbidden" });
    try {
      const user = (req.user as any);
      const issueId = Number(req.params.id);
      const issue = await storage.getIssue(issueId);

      if (!issue) return res.status(404).json({ message: "Issue not found" });

      // Admin ward restriction
      if (user.role !== "SUPER_ADMIN" && issue.ward !== user.wardAssigned) {
        return res.status(403).json({ message: "You can only update issues in your assigned ward" });
      }

      const { status } = req.body;

      // Validate status: only allow known values
      const allowedStatuses = ["Pending", "In Progress", "Resolved"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Allowed values: Pending, In Progress, Resolved" });
      }

      const updatedIssue = await storage.updateIssueStatus(issueId, status);

      await storage.createAuditLog({
        actorId: user.id,
        actorType: "admin",
        actorName: user.name,
        action: "update_status",
        targetId: updatedIssue.id,
        targetType: "issue",
        details: `Updated issue status to ${status}`,
      });

      emitIssueScoped(io, "issue:update", { id: updatedIssue.id }, issue.ward); // Scoped emit
      res.json(updatedIssue);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.patch(api.issues.update.path, upload.single("image"), issueUpdateLimiter, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized" });
    try {
      const issueId = Number(req.params.id);
      const issue = await storage.getIssue(issueId);
      if (!issue) return res.status(404).json({ message: "Issue not found" });
      if (issue.createdBy !== (req.user as any).id) return res.status(403).json({ message: "Can only edit your own issues" });

      if (req.body && req.body.createdBy !== undefined) {
        delete req.body.createdBy;
      }

      // Store old image URL for cleanup (if being replaced)
      const oldImageUrl = issue.image;

      const updates: any = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.ward !== undefined) updates.ward = req.body.ward;
      if (req.body.address !== undefined) updates.address = req.body.address;
      // Prevent ownership changes
      if (updates.createdBy !== undefined) delete updates.createdBy;

      // Handle optional image upload to Cloudinary
      if (req.file) {
        try {
          const uploadResult = await uploadToCloudinary(req.file.buffer, { issueId });
          updates.image = uploadResult.url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : "";
          let message = "Image upload failed";
          let statusCode = 400;

          if (errorMessage === "Image dimensions too large") {
            message = "Image dimensions too large";
          } else if (errorMessage === "Image service unavailable") {
            message = "Image service unavailable";
            statusCode = 503;
          } else if (errorMessage === "Image upload timeout") {
            message = "Image upload timeout";
            statusCode = 503;
          }

          return res.status(statusCode).json({ message });
        }
      }

      const updated = await storage.updateIssue(issueId, updates);
      if (!updated) return res.status(404).json({ message: "Issue not found" });

      emitIssueScoped(io, "issue:update", { id: updated?.id }, updated?.ward); // Scoped emit
      res.json(updated);

      // Cleanup old Cloudinary image after response sent (prevents orphaned resources)
      if (oldImageUrl && req.file) {
        const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
        if (oldPublicId) {
          // Fire-and-forget cleanup with better error handling
          (async () => {
            try {
              const cloudinary = getCloudinary();
              await cloudinary.uploader.destroy(oldPublicId);
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.warn(`[Cleanup] Old image cleanup failed for ${oldPublicId}: ${errorMsg}`);
            }
          })().catch((err) => {
            console.error("[Cleanup] Unexpected error in image cleanup:", err);
          });
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.issues.delete.path, issueDeleteLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const issueId = Number(req.params.id);
      const issue = await storage.getIssue(issueId);
      if (!issue) return res.status(404).json({ message: "Issue not found" });

      const user = (req.user as any);
      const isOwner = user.type === "user" && issue.createdBy === user.id;
      const isAdmin = user.type === "admin";

      if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

      // Admin ward restriction
      if (user.type === "admin" && user.role !== "SUPER_ADMIN" && issue.ward !== user.wardAssigned) {
        return res.status(403).json({ message: "You can only delete issues in your assigned ward" });
      }

      await storage.deleteIssue(issueId);

      if (user.type === "admin") {
        await storage.createAuditLog({
          actorId: user.id,
          actorType: "admin",
          actorName: user.name,
          action: "delete_issue",
          targetId: issueId,
          targetType: "issue",
          details: `Deleted issue: ${issue.title}`,
        });
      }

      emitIssueScoped(io, "issue:delete", { id: issueId }, issue.ward);
      res.status(204).end();

      // Cleanup Cloudinary folder after response sent (prevents orphaned resources)
      const folderPath = `issues/${issueId}`;
      // Fire-and-forget cleanup with better error handling
      (async () => {
        try {
          const cloudinary = getCloudinary();
          await cloudinary.api.delete_resources_by_prefix(folderPath);
          await cloudinary.api.delete_folder(folderPath);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Cleanup] Cloudinary folder cleanup failed for ${folderPath}: ${errorMsg}`);
        }
      })().catch((err) => {
        console.error("[Cleanup] Unexpected error in folder cleanup:", err);
      });
    } catch (err) {
      res.status(500).json({ message: "Deletion failed" });
    }
  });

  app.post(api.issues.vote.path, issueVoteLimiter, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized. Only users can vote." });
    try {
      const issueId = Number(req.params.id);
      const issue = await storage.getIssue(issueId);
      const result = await storage.toggleVote(issueId, (req.user as any).id);
      emitIssueScoped(io, "issue:vote", { id: issueId, votes: result.votes }, issue?.ward);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Vote failed" });
    }
  });

  app.get(api.issues.analytics.path, analyticsLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = (req.user as any);
      let analytics;

      if (user.type === "user") {
        analytics = await (storage as any).getAnalytics(user.id, user.ward, false);
      } else if (user.type === "admin") {
        if (user.role === "SUPER_ADMIN") {
          analytics = await (storage as any).getAnalytics(undefined, undefined, true);
        } else {
          if (!user.wardAssigned) {
            return res.status(403).json({ message: "Assigned ward is required for admin analytics" });
          }
          // Explicitly use wardAssigned for non-super admins
          analytics = await (storage as any).getAnalytics(undefined, user.wardAssigned.toString(), false);
        }
      }

      res.json(analytics);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Seed Super Admin if not exists (DEVELOPMENT ONLY)
  const seedSuperAdmin = async () => {
    // SECURITY: Never seed default credentials in production
    if (process.env.NODE_ENV === "production") {
      return;
    }

    try {
      const superAdmin = await storage.getAdminByAdminId("superadmin");
      if (superAdmin) {
        if (process.env.NODE_ENV !== "production") {
          console.log("Super Admin account already exists");
        }
        return;
      }

      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createAdmin({
        adminId: "superadmin",
        password: hashedPassword,
        name: "Super Administrator",
        role: "SUPER_ADMIN",
        wardAssigned: "All",
        isActive: true,
        createdBy: null
      });

      console.log("Super Admin account created (adminId: superadmin)");
    } catch (err) {
      console.error("Failed to seed Super Admin:", err);
    }
  };

  seedSuperAdmin().catch((err) => {
    console.error("CRITICAL: Super Admin seeding failed:", err);
  });

  return { httpServer, io, sessionStore };
}
