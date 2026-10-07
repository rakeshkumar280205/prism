# Prism

Prism is a municipal issue reporting and tracking platform where citizens can report local problems, vote on community priorities, and monitor resolution progress, while ward admins and super admins manage workflows and oversight.

## Highlights

- Citizen and admin authentication with secure session cookies
- Role-based access (`USER`, `ADMIN`, `SUPER_ADMIN`)
- Issue reporting with optional image upload (Cloudinary)
- Ward-aware access controls for issue management
- Real-time updates with Socket.IO (`issue:new`, `issue:update`, `issue:delete`, `issue:vote`)
- Voting system to prioritize issues
- Analytics dashboard (status, category, ward, monthly trends)
- Super admin features for admin management and audit logs
- English + Kannada UI language support
- Security hardening: rate limiting, CSRF origin checks, CORS allowlist, secure headers

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TanStack Query
- Wouter
- Tailwind CSS + Radix UI
- Socket.IO Client

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Passport (Local strategies) + express-session + connect-mongo
- Socket.IO
- Cloudinary + Multer (memory storage)

## Repository Structure

```text
.
├── client/                 # React frontend
│   ├── src/components/     # UI and feature components
│   ├── src/pages/          # Route pages
│   ├── src/hooks/          # Data/auth/socket hooks
│   └── src/lib/            # API base, i18n, utilities
├── server/                 # Express backend
│   ├── routes.ts           # API routes and Socket.IO setup
│   ├── storage.ts          # Mongo-backed data access layer
│   ├── models/             # Mongoose models
│   ├── middleware/         # Upload middleware
│   └── utils/              # Cloudinary/upload helpers
├── shared/                 # Shared schemas and API contracts
├── script/build.ts         # Production build script
└── PRODUCTION_RUN.md       # Production runbook
```

## Core Workflows

### Citizens
- Register/login
- Report issues with category, ward, location, and optional image
- Vote/unvote on issues
- Track own submissions and profile
- View ward issue feed and analytics

### Admins
- Login to dashboard
- Update issue status (`Pending`, `In Progress`, `Resolved`)
- Delete issues within permitted scope
- View analytics by role scope

### Super Admins
- Create, list, update, and delete admin accounts
- Access system-wide analytics
- View audit logs

## API Overview

Base path: `/api`

- Auth: `/login`, `/admin/login`, `/logout`, `/me`
- Users: `/register`, `/users/profile`
- Admins: `/admins`, `/admins/:id`, `/audit-logs`
- Issues: `/issues`, `/issues/:id`, `/issues/:id/status`, `/issues/:id/vote`, `/issues/check-duplicates`
- Analytics: `/analytics`
- Health: `/api/health`, `/health`

See `shared/routes.ts` and `client/src/api-contract.ts` for route contracts.

## Prerequisites

- Node.js (recommended v20+)
- npm
- MongoDB instance
- Cloudinary account (for image uploads)

## Environment Variables

### Backend (`server`)

Required for production:

- `MONGO_URI`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FRONTEND_URL` (or `RENDER_EXTERNAL_URL`) for production CORS/cookies
- `PORT` (defaults to `5000`)

### Frontend (`client`)

- `VITE_API_BASE_URL` (for local dev typically `http://localhost:5000`)

## Local Development

### 1) Install dependencies

```bash
npm install
cd client && npm install
```

### 2) Run backend (from repo root)

```bash
npm run dev
```

Backend default: `http://localhost:5000`

### 3) Run frontend (new terminal)

```bash
cd client
VITE_API_BASE_URL=http://localhost:5000 npm run dev
```

Frontend default: `http://localhost:5173`

## Build and Run

### Backend (production bundle)

```bash
npm run build
npm start
```

### Frontend

```bash
cd client
npm run build
npm run preview
```

## Security and Operations Notes

- Session cookies are configured for secure cross-site auth in production (`SameSite=None; Secure`)
- HTTPS is required in production for authentication to work correctly
- API is protected by layered rate limiting and origin checks
- Socket.IO connections are authenticated and ward/role scoped
- Old resolved issues are auto-cleaned periodically by background job
- Production startup fails fast when critical environment variables are missing

For deployment and runtime troubleshooting, see `PRODUCTION_RUN.md`.

## Default Development Seed

In non-production mode, a default super admin account is seeded if missing:

- `adminId`: `superadmin`
- `password`: `admin123`

Do not use default credentials in production.

## License

MIT
