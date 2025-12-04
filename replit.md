# PSCoMiXX Creator

## Overview

PSCoMiXX Creator is a comprehensive desktop application for creating comics, trading cards, visual novels, CYOA (Choose Your Own Adventure) stories, cover art, and motion comics. The application provides a full-featured creative studio with AI-assisted generation, drawing tools, and project management capabilities.

The system is designed as part of the PSCoMiXX ecosystem, integrating with companion platforms for publishing, monetization, and community engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TailwindCSS v4 with custom design tokens for styling

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui components following the "new-york" style variant
- Custom components organized by function (layout, tools, UI)
- Design system based on CSS variables for theming with hard shadows and brutalist aesthetics

**State Management:**
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state
- Local component state for UI interactions

**Key Design Patterns:**
- Component composition with slots and variants using class-variance-authority
- Path aliases for clean imports (@/, @shared/, @assets/)
- Separation of concerns: pages, components, hooks, contexts, and utilities

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- HTTP server creation using Node's native `http` module
- Session-based authentication with Passport.js

**Authentication & Authorization:**
- Local strategy authentication (email/password)
- Password hashing using Node's native scrypt
- Session management with express-session and MemoryStore
- Role-based access control (creator vs admin roles)

**API Design:**
- RESTful API endpoints under `/api` prefix
- Middleware for authentication (`isAuthenticated`) and authorization (`isAdmin`)
- CRUD operations for users, projects, and assets
- Structured error handling with proper HTTP status codes

**Key Design Decisions:**
- Session cookies for authentication (secure in production)
- Middleware-based route protection
- Server-side rendering fallback for SPA routing

### Data Storage

**Database:**
- PostgreSQL via Neon serverless
- Drizzle ORM for type-safe database operations
- WebSocket-based connection pooling for serverless environments

**Schema Design:**
- `users` table: Authentication and user profiles with role-based access
- `projects` table: Polymorphic storage for all creative work types (comic, card, vn, cyoa, cover, motion)
- `assets` table: Media file metadata with optional project association
- JSONB columns for flexible, type-specific project data
- UUID primary keys for all entities
- Cascade deletes for referential integrity

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Schema definitions in shared directory for client/server type sharing

**Rationale:**
- JSONB for project data allows each creative type to have custom fields without schema changes
- Polymorphic project table simplifies querying across all content types
- Neon serverless provides auto-scaling with WebSocket connections for better cold start performance

### External Dependencies

**AI Image Generation:**
- Pollinations.ai for AI-generated artwork
- Client-side integration with encoded prompts
- Random seed generation for variety

**Third-party Libraries:**
- `@neondatabase/serverless`: PostgreSQL client optimized for edge/serverless
- `drizzle-orm` & `drizzle-zod`: Database ORM with Zod schema validation
- `passport` & `passport-local`: Authentication middleware
- `date-fns`: Date formatting and manipulation
- `sonner`: Toast notifications
- `recharts`: Data visualization for admin analytics
- `embla-carousel-react`: Carousel/slider functionality
- `lucide-react`: Icon system

**Development Tools:**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- ESBuild for server bundling in production
- PostCSS with Autoprefixer for CSS processing

**Font Resources:**
- Google Fonts: Space Grotesk (display), Inter (sans-serif), JetBrains Mono (monospace)

**Ecosystem Integration Points:**
- Designed for future integration with:
  - `pscomixx.com`: Main brand website
  - `comixx.website`: Marketing/landing page
  - `pscomixx.online`: Web creator platform
  - `psstreaming.online`: Publishing and monetization platform
  - `pscomixx-6hljpllm.manus.space`: Reference implementation

**Build & Deployment:**
- Production build bundles both client (Vite) and server (ESBuild)
- Server dependencies selectively bundled to reduce syscalls
- Static file serving from dist/public
- Environment variable configuration for database and session secrets
- Vite plugin for OpenGraph image meta tag updates based on Replit domain