# Public Infrastructure Issue Reporter

## Overview

A full-stack civic issue reporting web application that enables citizens to report local infrastructure problems (roads, drainage, streetlights, garbage, etc.), vote on issues, and track resolution progress. The platform supports three user roles: regular users who can report and vote on issues, ward-assigned admins who manage issues in their jurisdiction, and super admins who oversee the entire system and manage admin accounts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration for a municipal blue color scheme
- **Real-time Updates**: Socket.IO client for live issue status updates
- **Animations**: Framer Motion for page transitions and micro-interactions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful endpoints with Zod schema validation for type-safe request/response handling
- **Authentication**: Session-based auth using Passport.js with Local Strategy, bcrypt for password hashing
- **File Uploads**: Multer middleware for handling image uploads (stored in `/uploads` directory)
- **Real-time**: Socket.IO server for broadcasting issue updates to connected clients

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Database Tables**:
  - `users`: Citizens who report issues (mobile-based login)
  - `admins`: Administrative accounts with ward assignments (adminId-based login)
  - `issues`: Reported infrastructure problems with status tracking
  - `votes`: Many-to-many relationship tracking user votes on issues

### Shared Code
- The `shared/` directory contains code used by both frontend and backend
- `shared/schema.ts`: Database schema and Zod validation schemas
- `shared/routes.ts`: API contract definitions with request/response types

### Build System
- Development: `tsx` for running TypeScript directly
- Production: esbuild bundles server code, Vite builds client assets
- Output: Server bundle goes to `dist/index.cjs`, client assets to `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle Kit**: Used for schema migrations (`npm run db:push`)

### Authentication & Sessions
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **passport** + **passport-local**: Authentication strategy
- **bcryptjs**: Password hashing

### Real-time Communication
- **Socket.IO**: WebSocket-based real-time updates for issue status changes and dashboard updates

### File Storage
- Local filesystem storage in `/uploads` directory
- Images served at `/uploads/:filename`

### Frontend Libraries
- **@tanstack/react-query**: Data fetching and caching
- **recharts**: Analytics charts and visualizations
- **date-fns**: Date formatting utilities
- **socket.io-client**: Real-time client connection

### UI Framework
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component collection (configured in `components.json`)
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library