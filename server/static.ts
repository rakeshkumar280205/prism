// DEPRECATED: Frontend serving has been removed from backend
//
// The backend now runs as an API-only service.
// Frontend is deployed separately to Vercel and makes API calls to this backend.
//
// This file is kept for historical reference but is no longer used.
// The serveStatic() function previously served frontend build artifacts from dist/public,
// which created a hard dependency on the frontend being built first.
//
// Migration: Use Vite dev server locally, deploy frontend to Vercel, backend to Render

