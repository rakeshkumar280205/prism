import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Set cache headers for static assets
  // Hashed files (*.hash.js, *.hash.css) can be cached long-term
  app.use((req, res, next) => {
    if (req.path.match(/\.[a-f0-9]{8}\.(js|css|woff2|png|svg)$/i)) {
      // Long-term cache for hashed assets (1 year)
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      // Short-term cache for non-hashed assets (1 hour)
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
    next();
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (no caching for HTML)
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
