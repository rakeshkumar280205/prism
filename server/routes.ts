import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import express from "express";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storageConfig });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Socket.IO Setup
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });
  });

  // Serve static files from uploads
  app.use("/uploads", express.static(uploadDir));

  // Session Setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret_key_change_me",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Set to true in production with HTTPS
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Strategies
  // 1. User Strategy (Mobile/Password)
  passport.use(
    "user-local",
    new LocalStrategy({ usernameField: "mobile" }, async (mobile, password, done) => {
      try {
        const user = await storage.getUserByMobile(mobile);
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
        const admin = await storage.getAdminByAdminId(adminId);
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

  app.post(api.auth.loginUser.path, (req, res, next) => {
    passport.authenticate("user-local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.loginAdmin.path, (req, res, next) => {
    passport.authenticate("admin-local", (err: any, admin: any, info: any) => {
      if (err) return next(err);
      if (!admin) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(admin, (err) => {
        if (err) return next(err);
        return res.json(admin);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
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

  app.post(api.users.register.path, async (req, res) => {
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
      const user = await storage.updateUser((req.user as any).id, input);
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // === Admin Routes ===

  app.post(api.admins.create.path, async (req, res) => {
    // Only Super Admin can create admins
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const input = api.admins.create.input.parse(req.body);
      const existing = await storage.getAdminByAdminId(input.adminId);
      if (existing) return res.status(400).json({ message: "Admin ID already exists" });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const admin = await storage.createAdmin({ ...input, password: hashedPassword, createdBy: (req.user as any).id });
      res.status(201).json(admin);
    } catch (err) {
      res.status(500).json({ message: "Creation failed" });
    }
  });

  app.get(api.admins.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    const admins = await storage.listAdmins();
    res.json(admins);
  });

  app.put(api.admins.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const adminId = Number(req.params.id);
      const input = api.admins.update.input.parse(req.body);
      
      // Hash password if provided
      if (input.password) {
        input.password = await bcrypt.hash(input.password, 10);
      }
      
      const admin = await storage.updateAdmin(adminId, input);
      res.json(admin);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.admins.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden" });
    try {
      const adminId = Number(req.params.id);
      const admin = await storage.getAdmin(adminId);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      if (admin.role === "SUPER_ADMIN") return res.status(403).json({ message: "Cannot delete Super Admin" });
      
      await storage.deleteAdmin(adminId);
      res.json({ message: "Admin deleted" });
    } catch (err) {
      res.status(500).json({ message: "Deletion failed" });
    }
  });

  // === Issue Routes ===

  app.get(api.issues.list.path, async (req, res) => {
    const filters = req.query as { ward?: string; status?: string; category?: string; createdBy?: string };
    const user = req.user as any;
    const userId = req.isAuthenticated() && user.type === 'user' ? user.id : undefined;
    
    const parsedFilters: any = {
      status: filters.status,
      category: filters.category,
      search: req.query.search as string,
      createdBy: filters.createdBy ? parseInt(filters.createdBy) : undefined,
    };

    // Ward restriction logic
    if (req.isAuthenticated() && user.type === "admin") {
      if (user.role !== "SUPER_ADMIN") {
        // Regular admins are restricted to their assigned ward
        parsedFilters.ward = user.wardAssigned;
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
  });

  app.post(api.issues.create.path, upload.single("image"), async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    try {
      // Parse body fields manually since generic FormData doesn't auto-validate via Zod middleware
      // We expect title, description, category, ward, address
      const issueData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        ward: req.body.ward,
        address: req.body.address,
      };

      // Check for exact duplicate (Smart handling: ward, category, title, address)
      const duplicate = await storage.findDuplicateIssue(issueData);
      if (duplicate) {
        return res.status(409).json({ 
          message: "A similar issue already exists in this ward and category with the same title and location.", 
          issueId: duplicate.id 
        });
      }
      
      const issue = await storage.createIssue({ 
        ...issueData, 
        image: req.file ? req.file.filename : undefined,
        createdBy: user.id 
      });
      io.emit("issue:new", issue); // Real-time
      res.status(201).json(issue);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Issue creation failed" });
    }
  });

  app.patch(api.issues.updateStatus.path, async (req, res) => {
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
      const updatedIssue = await storage.updateIssueStatus(issueId, status);
      io.emit("issue:update", updatedIssue); // Real-time
      res.json(updatedIssue);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.patch(api.issues.update.path, upload.single("image"), async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized" });
    try {
      const issueId = Number(req.params.id);
      const issue = await storage.getIssue(issueId);
      if (!issue) return res.status(404).json({ message: "Issue not found" });
      if (issue.createdBy !== (req.user as any).id) return res.status(403).json({ message: "Can only edit your own issues" });

      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description) updates.description = req.body.description;
      if (req.body.category) updates.category = req.body.category;
      if (req.body.ward) updates.ward = req.body.ward;
      if (req.body.address) updates.address = req.body.address;
      if (req.file) updates.image = req.file.filename;

      const updated = await (storage as any).updateIssue(issueId, updates);
      io.emit("issue:update", updated); // Real-time
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.issues.delete.path, async (req, res) => {
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
      io.emit("issue:delete", { id: issueId });
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Deletion failed" });
    }
  });

  app.post(api.issues.vote.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).type !== "user") return res.status(401).json({ message: "Unauthorized. Only users can vote." });
    try {
      const result = await storage.toggleVote(Number(req.params.id), (req.user as any).id);
      io.emit("issue:vote", { id: Number(req.params.id), votes: result.votes });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Vote failed" });
    }
  });

  app.get(api.issues.analytics.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = (req.user as any);
      let analytics;
      
      if (user.type === "user") {
        analytics = await (storage as any).getAnalytics(user.id, undefined, false);
      } else if (user.type === "admin") {
        if (user.role === "SUPER_ADMIN") {
          analytics = await (storage as any).getAnalytics(undefined, undefined, true);
        } else {
          // Explicitly use wardAssigned for non-super admins
          analytics = await (storage as any).getAnalytics(undefined, user.wardAssigned, false);
        }
      }
      
      res.json(analytics);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Seed Super Admin if not exists
  const superAdmin = await storage.getAdminByAdminId("superadmin");
  if (!superAdmin) {
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
    console.log("Super Admin seeded: superadmin / admin123");
  }

  return httpServer;
}
