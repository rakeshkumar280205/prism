import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer, type Server } from "http";
import { connectMongo } from "./mongo";
import mongoose from "mongoose";
import { storage } from "./storage";

// Validate required environment variables EARLY (fail-fast)
function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    { name: "MONGO_URI", value: process.env.MONGO_URI },
    { name: "SESSION_SECRET", value: process.env.SESSION_SECRET },
    { name: "CLOUDINARY_CLOUD_NAME", value: process.env.CLOUDINARY_CLOUD_NAME },
    { name: "CLOUDINARY_API_KEY", value: process.env.CLOUDINARY_API_KEY },
    { name: "CLOUDINARY_API_SECRET", value: process.env.CLOUDINARY_API_SECRET },
  ];

  const missing = required.filter(({ value }) => !value).map(({ name }) => name);

  if (missing.length > 0) {
    console.error(
      `FATAL: Missing required environment variables in production: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

// Run validation before anything else
validateProductionEnvironment();

// Global unhandled rejection handler to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL: Unhandled Promise Rejection detected");
  console.error("Reason:", reason);
  console.error("Promise:", promise);
  // Log but don't exit immediately - allow graceful shutdown handlers to work
});

const app = express();
const httpServer = createServer(app);
let server: Server;
let io: any; // Socket.IO server instance
let sessionStore: any; // Session store instance for cleanup

// Schedule auto-delete job for old resolved issues
let autoDeleteIntervalId: NodeJS.Timeout | null = null; // Store interval ID for cleanup

function scheduleAutoDeleteJob() {
  let isAutoDeleting = false; // Lock to prevent concurrent execution
  let consecutiveFailures = 0; // Track repeated failures

  autoDeleteIntervalId = setInterval(async () => {
    // Skip if already running (prevent overlap)
    if (isAutoDeleting) return;

    isAutoDeleting = true;
    try {
      if ((storage as any).deleteOldResolvedIssues) {
        await (storage as any).deleteOldResolvedIssues();
        consecutiveFailures = 0; // Reset on success
      }
    } catch (err) {
      consecutiveFailures++;
      console.error(`[CRITICAL] Auto-delete task failed (${consecutiveFailures} consecutive failure(s)):`, err);

      // Alert on repeated failures (may indicate persistent issue)
      if (consecutiveFailures >= 3) {
        console.error(`[ALERT] Auto-delete has failed ${consecutiveFailures} times - old data may be accumulating!`);
      }
    } finally {
      isAutoDeleting = false; // Always release lock
    }
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  // Allow process to exit even if interval is active
  if (autoDeleteIntervalId) {
    autoDeleteIntervalId.unref();
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS: allow only known origins, support credentials, and handle preflight
const isProduction = process.env.NODE_ENV === "production";
const devOrigins = ["http://localhost:5173", "http://localhost:3000"];
const allowedOrigins = isProduction
  ? [process.env.FRONTEND_URL].filter(Boolean) as string[]
  : devOrigins;

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests without Origin (server-to-server, curl) and same-origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Enable automatic handling of preflight requests
app.options("*", cors(corsOptions));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  if (process.env.NODE_ENV === "production") return;

  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Only capture responses in development (avoid overhead and sensitive data logging in production)
  if (process.env.NODE_ENV !== "production") {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await connectMongo();
  const result = await registerRoutes(httpServer, app);
  server = result.httpServer;
  io = result.io;
  sessionStore = result.sessionStore;

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log errors but hide stack traces in production
    if (process.env.NODE_ENV !== "production") {
      console.error("Error:", err);
    } else {
      console.error("Error:", message);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Schedule auto-delete job after app is fully ready (listening)
    scheduleAutoDeleteJob();
  });

  // Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received, shutting down gracefully...`);
    // Stop scheduling new auto-delete jobs
    if (autoDeleteIntervalId) {
      clearInterval(autoDeleteIntervalId);
      autoDeleteIntervalId = null;
    }
    // Note: In-progress delete job will complete (has its own lock via isAutoDeleting flag)

    // Detach session store listeners to avoid memory leaks
    if (sessionStore?.removeAllListeners) {
      sessionStore.removeAllListeners();
    }

    // Close Socket.IO server
    io.close(() => {
      log("Socket.IO server closed");
    });

    // Close HTTP server and wait for all connections to close
    return new Promise<void>((resolve) => {
      let resolved = false;
      server.close(async () => {
        console.log("✓ HTTP server closed");

        try {
          await mongoose.connection.close();
          console.log("✓ MongoDB connection closed");
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } catch (err) {
          console.error("✗ Error during MongoDB shutdown:", err instanceof Error ? err.message : err);
          if (!resolved) {
            resolved = true;
            resolve(); // Still resolve to proceed with exit
          }
        }
      });

      // Force exit after extended timeout (30 seconds) to prevent indefinite hangs
      setTimeout(() => {
        if (!resolved) {
          console.error("✗ Graceful shutdown timeout after 30s: forcing exit");
          resolved = true;
          resolve();
        }
      }, 30000);
    });
  };

  // Wrap shutdown calls to catch any async errors and ensure clean exit
  process.on("SIGINT", () => {
    shutdown("SIGINT")
      .catch((err) => {
        console.error("Error during SIGINT shutdown:", err);
      })
      .finally(() => {
        process.exit(0);
      });
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM")
      .catch((err) => {
        console.error("Error during SIGTERM shutdown:", err);
      })
      .finally(() => {
        process.exit(0);
      });
  });
})().catch((err) => {
  console.error("FATAL: Startup failed:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error("Stack trace:", err.stack);
  }
  process.exit(1);
});
