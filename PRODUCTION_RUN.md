# Production Runbook (Minimal)

This app uses Express + Socket.IO (backend) and Vite/React (frontend). Auth relies on secure, cross-site cookies.

## Required Environment Variables (Production)
Set these before starting the backend:
- `MONGO_URI`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PORT` (default: 5000)

Backend fails fast at startup if critical env vars are missing.

## Start Commands
- Development backend: `npm run dev`
- Production backend: `npm run build` then `npm start`
- Frontend (client): `cd client && npm run build && npm run preview`

## HTTPS + Incognito Requirement
- Cookies use `SameSite=None; Secure` and require HTTPS transport.
- Testing auth in Incognito/private windows must be done over HTTPS.

## Operational Notes
- Graceful shutdown: SIGINT/SIGTERM close HTTP, Socket.IO, and Mongo with a 30s timeout.
- Request logging (production): minimal `[HTTP] METHOD PATH STATUS DURATION rid=...`.
- Error logging (production): `[ERROR] METHOD PATH STATUS — message rid=...]`.
- CSRF: Origin/Referer validation for unsafe methods.
- Rate limiting: Global and per-route limits enabled.
- Socket.IO: Auth required; events scoped by ward/role; generous per-IP connection throttling.

## Troubleshooting
- Check backend logs for `rid=...` to correlate requests and errors.
- Ensure HTTPS termination is configured; insecure (HTTP) requests will not establish auth.
