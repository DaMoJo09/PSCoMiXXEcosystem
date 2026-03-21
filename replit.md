# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application that serves as an AI-assisted creative studio. It enables users to generate various digital content, including comics, trading cards, visual novels, and motion comics, integrating drawing tools and comprehensive project management. The platform aims to be the central content creation hub for the PSCoMiXX ecosystem, focusing on enhanced discoverability, optimized marketplace functionality, and scalable solutions for publishing, monetization, and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, Vite, and Wouter, using TailwindCSS v4, Radix UI, and shadcn/ui for styling. It features a brutalist aesthetic with dark themes, hard shadows, and neon accents. State management relies on TanStack Query and React Context. Key principles include component composition, path aliases, separation of concerns, and mobile responsiveness.

### Backend
The backend is an Express.js server on Node.js, utilizing session-based authentication with Passport.js (local strategy, scrypt hashing). It provides RESTful endpoints secured with middleware for authentication, role-based authorization, and rate limiting.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed through Drizzle ORM. The schema supports users, polymorphic projects, assets, versions, and audit logs, using JSONB and UUID primary keys. Drizzle Kit manages migrations.

### Security
The platform implements rate limiting, Helmet.js, strong password policies, secure session management, COPPA/FERPA compliance, content safety features, AI resilience, audit logging, and SSO support.

### Ecosystem SSO (server/sso.ts)
JWT-based single sign-on across the PSCoMiXX ecosystem (pressplays.site, psstreaming.com, pressstart.tech). Issues ecosystem tokens via `POST /api/auth/sso/token`, validates inbound tokens via `POST /api/auth/sso/validate`, and provides SSO login at `POST /api/auth/sso/login`. Requires `ECOSYSTEM_JWT_SECRET` env var. Tokens carry user ID, email, name, role, tier, and origin.

### Webhook Service (server/webhookService.ts)
Standardized event dispatch system with delivery logging to `webhook_delivery_log` table. Supports retry queue with configurable attempts (3 retries, exponential backoff). Events: `project.published`, `project.exported`, `user.created`, `user.tier_changed`, `assignment.submitted`, `xp.milestone`. Retry worker runs on 60s interval, started in `registerRoutes()`.

### Export Pipeline (server/exportService.ts + server/publishService.ts)
- **ExportService:** Generates scene-json, timeline-json, and PNG layer exports for external tools (Unreal Engine, Reallusion iClone). Tracked via `export_jobs` DB table.
- **PublishService:** Unified publish pipeline — bundles content to PS Content Bundle v1 format, validates, saves, syncs to Emergent streaming platform, and dispatches webhooks.
- **API endpoints:** `POST /api/export` (internal), `POST /api/v1/projects/:id/export` (versioned API), `GET /api/v1/projects` (public listing), `GET /api/v1/projects/:id` (public detail).

### Feature Flags System
11 feature flags stored in the `feature_flags` DB table, toggled from Admin Control Room. The `useFeatureFlag(key)` hook (in `client/src/hooks/useFeatureFlag.ts`) queries the public endpoint `GET /api/feature-flags/:key` and defaults to `false` (fail-closed) when a flag is missing. Sidebar sections (Marketplace, Print Studio, Social, AI Tools, Community, Motion Studio) are conditionally rendered based on flags. Backend gates: `payments_enabled` blocks Stripe checkout; `export_restrictions` enforces export quotas (fail-closed when missing). Other flags: `appsumo_redemption`, `early_adopter_gate`, `invite_system`.

### Subscription & Usage Tracking
Supports Free, Creator, Pro, Studio, Lifetime, and School subscription tiers with limits on AI generations, exports, projects, and storage. Usage is tracked server-side, with frontend feature gates prompting upgrades. School tier supports bulk checkout and district inquiry endpoints.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages, conforming to the PS Content Bundle v1 format. The pipeline handles validation, bundling, saving, synchronization with the Emergent streaming platform, version tracking, and admin review.

### XP & Account System
Supports Student (6-17) and Creator (18+) accounts, with students having restricted monetization. An XP system uses scaled leveling via time-based heartbeats and action-based rewards.

### PSLMS Integration
Integrates with Press Start LMS, allowing students to submit creations to portfolios and enabling PSLMS to fetch comics via API using a shared secret key and email-based user matching.

### UI/UX Design
The UI/UX features a brutalist dark theme with neon accents, card-style containers, and gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and PWA installation options.

### Project Persistence & Navigation
Features smart project resumption, server-side deduplication (with `forceNew: true` bypass), and auto-save-on-unmount functionality using `navigator.sendBeacon` and `beforeunload` handlers. Invalid project IDs redirect to project discovery/creation.

### Creator Tools
The suite includes:
- **Comic Creator:** Supports direct drawing, CSS filters, advanced text formatting, auto-save, 50-level undo/redo, offline saving with IndexedDB, and export options (PNG, PDF, JSON). Integrated Cover Editor.
- **Visual Novel Creator:** A Ren'Py-inspired engine with scenes, characters, backgrounds, dialogue editing, ADV/NVL text modes, scene transitions, rollback, and Ren'Py quick menu bar. Exports as Ren'Py .rpy and playable HTML.
- **CYOA Builder:** An interactive fiction engine with story-to-CYOA generation, node editing, visual graph view, variables/flags system, conditional choices, "quick play from here," and playable HTML export.
- **Card Creator:** Supports TCG and Sports modes with specific card types, fields, and a Pack Builder.

### Print Studio (CoMiXX Print & Merch)
Provides a creation-to-print pipeline with a landing page, export dashboard, print quote request form, and package offerings, supported by database and API endpoints.

### Creator Marketplace
A public storefront for browsing and filtering content. Creators can list projects or asset packs for free or sale via Stripe Checkout, with content rating and student filtering.

### Marketplace Reviews
Stores ratings and review text with a "verified purchase" flag, facilitated by API endpoints and displayed on listing pages.

### Community Library
A Webtoons-style browse page with search, sorting, a comic reader, "like" and comment features, view tracking, and bookmarking with reading progress. Includes series management and a follower system.

### Motion Studio
Supports video/GIF export with progress tracking via Web Worker for GIF encoding. Features drawing layers, selection tools, shape tools, fill tool, eyedropper, audio clip integration with a timeline, and a virtualized frame list.

### Platform Analytics Dashboard
An admin-only dashboard providing 40+ KPIs across 7 tabs (Overview, Growth, Engagement, Content, Revenue, AI & Platform, User Health). Uses `recharts` and aggregates data via `GET /api/analytics/platform`.

### Teacher Dashboard (client/src/pages/TeacherDashboard.tsx)
Enhanced dashboard for teachers with 5 tabs: Student Roster (with last-active time, total minutes, XP, level), Assignments (CRUD), Submissions (grading with grade/feedback), Projects (all student projects), and Analytics (class-wide stats, top students by XP, projects by tool). Backend endpoints: `GET /api/teacher/students`, `GET /api/teacher/student-projects`, `GET /api/teacher/analytics`, assignment/submission CRUD.

### Creator Profile (client/src/pages/CreatorProfilePage.tsx)
Public creator profile at `/creator/:username` showing avatar, cover image, bio, tagline, creator class, XP progress, social links, follower/following counts, and published works grid. Backend endpoint: `GET /api/creator/:username`.

### Assignment Submit Button (client/src/components/tools/AssignmentSubmitButton.tsx)
Reusable component for student accounts to submit projects to active assignments. Fetches active assignments via `GET /api/student/active-assignments`, filters by project type, and submits via `POST /api/assignments/:id/submit`.

### FX Studio Integration (Bidirectional Pipeline)
Integrates with FX Studio (pressplays.site) for bidirectional FX asset exchange across all creator tools via the `FxBrowserPanel`. XP heartbeat and action events are forwarded to PSStreaming (`POST https://psstreaming.com/api/webhooks/time-spent`) via fire-and-forget with 5s timeout, using the shared `PSLMS_API_KEY` in the `X-API-Key` header — so time/XP earned in CoMiXX is synced to the streaming platform.
- **Bidirectional Pipeline (Comic Creator):** Allows exporting panels to FX Studio and importing effects back into panels, handling cover-aware insertion and versioning.
- **Script Import Pipeline (PressPlays → CoMiXX):** Imports `comic-script` type assets from PressPlays, converting them into CYOA nodes, VN scenes, or comic spreads, and creating new projects.
- **Integration Points:** FX browser panels and context menus are available in Comic Creator, Motion Studio, Visual Novel Creator, and CYOA Builder for context-specific asset application.

### PWA & Offline Mode
Includes a Service Worker for caching and offline use with IndexedDB. Features timestamp-based conflict resolution, background syncing, install prompts, network status, and update notifications.

### Accessibility
Features keyboard shortcuts, skip-to-content links, Aria labels, high-contrast mode, `prefers-reduced-motion` respect, and a global `ErrorBoundary`.

### Mobile Responsiveness
Optimized for mobile with a top header, hamburger menu, bottom navigation bar, and slide-in drawer. Creator tools display desktop-recommended banners; public pages are fully responsive.

### SEO
Includes `robots.txt`, dynamic `sitemap.xml`, Open Graph (OG) image endpoints, and full SEO meta tags with JSON-LD structured data.

### Landing Page
A marketing landing page at `/landing` and `/welcome` featuring a glitch-effect hero, feature showcase, audience sections, "How It Works," testimonials, pricing CTA, and legal links.

### New User Onboarding
An `OnboardingWizard` guides new users through a 3-step flow (Welcome → Pick Your Tools → Quick Tips → Dashboard) on their first login, with progress stored via `localStorage`.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai (image.pollinations.ai)
- **AI Text Generation:** Pollinations.ai (text.pollinations.ai)

### Databases & ORMs
- `@neondatabase/serverless`
- `drizzle-orm`, `drizzle-zod`

### Authentication
- `passport`, `passport-local`

### Security
- `express-rate-limit`

### UI/Utility Libraries
- `date-fns`
- `sonner`
- `recharts`
- `embla-carousel-react`
- `lucide-react`
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss`

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono

### Other Integrations
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.