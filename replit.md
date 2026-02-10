# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a desktop application designed for comprehensive content creation, including comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. It offers an AI-assisted creative studio with drawing tools and project management, serving as a core part of the broader PSCoMiXX ecosystem for publishing, monetization, and community interaction. The project aims to be a discoverable, marketplace-optimized, and scalable platform, fostering a creator-first environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript, Vite for bundling, Wouter for routing.
- **Styling:** TailwindCSS v4 with custom design tokens, Radix UI primitives, shadcn/ui components ("new-york" style), brutalist aesthetic with hard shadows and dark theme.
- **State Management:** TanStack Query for server state, React Context for authentication.
- **Design Patterns:** Component composition (class-variance-authority), path aliases, separation of concerns.
- **Mobile Companion:** Will maintain visual and interaction consistency with desktop, including brutalist aesthetic, dark theme, neon accents, and shared component design. Features include core infrastructure, card builder, social media hub, real-time collaboration, card games, VN/CYOA viewer, and performance optimizations.

### Backend
- **Server:** Express.js with TypeScript, Node.js `http` module.
- **Authentication:** Session-based with Passport.js (local strategy, scrypt hashing, `express-session` with MemoryStore).
- **API:** RESTful endpoints (`/api`), middleware for authentication and authorization (role-based: creator, admin).
- **Key Decisions:** Session cookies for authentication, middleware for route protection, server-side rendering fallback.

### Data Storage
- **Database:** PostgreSQL via Neon serverless, Drizzle ORM for type-safe operations, WebSocket pooling.
- **Schema:** `users`, `projects` (polymorphic for various creative types), `assets`, `project_versions`, `publish_jobs`, `engagement_events`. Uses JSONB for flexible project data, UUID primary keys, cascade deletes.
- **Migrations:** Drizzle Kit.

### Content Publishing Pipeline
- **Project Lifecycle:** draft → review → approved/rejected → published
- **PS Content Bundle v1:** Standard Zod-validated format for all published content types (comic, trading_card, visual_novel, cyoa, cover, motion). Includes creator metadata, payload, assets, visibility, tags, age rating.
- **Pipeline Steps:** validate → bundle → save → sync (Emergent platform integration LIVE)
- **Emergent Streaming Integration:** Real API sync to `gamexclub.preview.emergentagent.com` (will become `madmixedmedia.com`). Uses `EMERGENT_API_URL` and `EMERGENT_WEBHOOK_SECRET` env vars. Supports content sync, creator profile sync, and health checks. Content types mapped: comic→pages[], visual_novel→scenes, cyoa→nodes, trading_card→card data.
- **Bundle Builder:** `server/publishPipeline.ts` - converts project data into PSContentBundle, validates via Zod, runs async pipeline with job tracking.
- **Version Tracking:** `project_versions` table snapshots project data at each publish.
- **Job Tracking:** `publish_jobs` table tracks pipeline status (queued → building → syncing → complete/failed).
- **Engagement Events:** `engagement_events` table receives inbound analytics from Emergent streaming platform via webhook (`/api/webhooks/engagement`).
- **Admin Review Queue:** `/admin/review-queue` page with approve/reject workflow. Admin accounts and mojocreative1@gmail.com have access.
- **API Endpoints:**
  - `POST /api/projects/:id/submit-review` - creator submits for review
  - `GET /api/admin/review-queue` - admin gets pending reviews
  - `POST /api/admin/projects/:id/approve` - admin approves
  - `POST /api/admin/projects/:id/reject` - admin rejects (with reason)
  - `POST /api/projects/:id/publish` - triggers publish pipeline
  - `GET /api/publish-jobs/:id` - check job status
  - `GET /api/projects/:id/versions` - version history
  - `GET /api/projects/:id/bundle-preview` - preview bundle without publishing
  - `POST /api/webhooks/engagement` - inbound engagement events
  - `GET /api/content/:contentId/engagement` - engagement summary
  - `GET /api/streaming/health` - check Emergent platform connection (admin only)

### System Design Choices
- **UI/UX:** Brutalist aesthetic with hard shadows, dark theme (zinc-900/950), neon accent colors (cyan, magenta, yellow), card-style containers with thick borders, gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono.
- **Mobile Design:** Bottom tab bar navigation, consistent page headers, shared modal/dialog styling, and iconography.
- **Future SEO & Marketplace:** Planned migration to Next.js (App Router) for SSR/SSG of marketing and marketplace pages. Focus on server-rendered HTML, internal linking, canonicalization, robots.txt, sitemap.xml, comprehensive metadata (title, meta description, OpenGraph, Twitter Cards), and structured data (JSON-LD). Marketplace will feature product listings with trust signals, friction reduction in checkout, and upsell strategies.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai.

### Databases & ORMs
- `@neondatabase/serverless`: PostgreSQL client.
- `drizzle-orm`, `drizzle-zod`: ORM and Zod schema validation.

### Authentication
- `passport`, `passport-local`: Authentication middleware.

### UI/Utility Libraries
- `date-fns`: Date manipulation.
- `sonner`: Toast notifications.
- `recharts`: Data visualization.
- `embla-carousel-react`: Carousel functionality.
- `lucide-react`: Icons.
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss`.

### Development Tools
- ESBuild, PostCSS, Autoprefixer, Replit-specific plugins.

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono.

### Ecosystem Integration Points (Planned/Future)
- `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.