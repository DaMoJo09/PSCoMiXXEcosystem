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

### XP & Account System
- **Account Types:** Student (ages 6-17) and Creator (18+), determined by date of birth at signup.
- **Student Restrictions:** No access to monetization features (Pricing page hidden from sidebar). Publishing still allowed for portfolio building.
- **XP System:** Time-based progression - 10 XP per minute of active use, tracked via heartbeat (POST /api/xp/heartbeat every 60 seconds). 1000 XP per level. Max 5 minutes credited per heartbeat to prevent manipulation.
- **XP Display:** Level badge and XP progress bar shown in sidebar, account type badge (Student/Creator) displayed alongside.
- **Schema Fields:** `dateOfBirth` (date), `accountType` (student/creator), `xp` (integer), `level` (integer), `totalMinutes` (integer) on users table.
- **API Endpoints:**
  - `POST /api/xp/heartbeat` - records activity time, awards XP
  - `GET /api/xp/stats` - returns current XP, level, totalMinutes

### PSLMS Integration (Press Start LMS)
- **Purpose:** Allows students to send their CoMiXX creations to their PSLMS portfolio, and lets PSLMS fetch student comics via API.
- **PSLMS Domain:** `https://pressstart.tech` (configurable via `PSLMS_API_URL` env var)
- **Authentication:** Shared secret via `PSLMS_API_KEY` env var. PSLMS sends `Authorization: Bearer <key>` to fetch comics. CoMiXX signs outbound webhooks with `PSLMS_WEBHOOK_SECRET`.
- **User Matching:** Email-based matching across both apps (same email = same student).
- **"Send to Portfolio" Button:** Visible only to Student accounts in Comic Creator. Sends project data to PSLMS webhook at `POST {PSLMS_API_URL}/api/webhooks/comixx`.
- **Webhook Payload:** `{event: "comic.submitted", user_id, user_email, user_name, title, project_type, image_url, xp: 50, project_id, submitted_at}`
- **API Endpoints (for PSLMS to call):**
  - `GET /api/pslms/comics?email=student@example.com` - list student's comics (requires API key)
  - `GET /api/pslms/comics/:id` - get full comic data with creator info (requires API key)
  - `POST /api/pslms/send-to-portfolio` - send comic to PSLMS (session auth, student-facing)
  - `GET /api/pslms/health` - integration health check (public)
- **Env Vars:** `PSLMS_API_URL` (set), `PSLMS_API_KEY` (shared secret), `PSLMS_WEBHOOK_SECRET` (optional signing)

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

### Mad Mixed Media (Streaming) Integration
- **Streaming Webhooks:** `/api/webhooks/streaming` receives events from Mad Mixed Media streaming platform, forwards to PSLMS.
- **Portfolio Webhook:** `/api/webhooks/streaming/portfolio` sends streaming content to PSLMS student portfolios.
- **Authentication:** Shared `PSLMS_API_KEY` or `PSLMS_WEBHOOK_SECRET` via `x-api-key` or `x-webhook-secret` headers.
- **Auto-Publish on Approval:** Admin project approval now auto-triggers the publish pipeline to sync content to Emergent streaming platform.

### My Library (Private)
- **Library Page:** `/library` - private workspace showing ALL user projects (comics, cards, VNs, CYOAs, covers, motion comics).
- **Filters:** Status filters (All, In Progress, Completed) + type filters (Comic, Card, VN, CYOA, Cover, Motion).
- **Continue Editing:** Click any project card to open it in the correct editor (`/creator/{type}?id={projectId}`).
- **Project Cards:** Show thumbnail, type badge, status badge (Draft/In Review/Needs Work/Approved/Published), last-edited time.
- **Search:** Filter projects by title.

### Portfolio Website (Public-Facing)
- **Owner View:** `/portfolio` - editable portfolio website for the logged-in user. Shows published works + artworks.
- **Public View:** `/portfolio/:userId` - shareable public page viewable by anyone without login. Shows only published/approved work.
- **Hero Section:** Cover image, avatar, name, tagline with edit mode for owner only.
- **Profile Editing:** Bio, creator class, social links (Twitter, Instagram, Website, YouTube) with smart URL handling (accepts handles or full URLs). Owner-only.
- **Share Button:** Copies public portfolio URL to clipboard for easy sharing.
- **Published Works Gallery:** Shows published/approved projects with type badges, thumbnails, click-to-view detail modal.
- **Artworks:** Manual portfolio artworks from `portfolioArtworks` table with full CRUD (owner-only) and category filtering.
- **Stats Row:** Level, XP, creator class, published count, artwork count, studio time, social links.
- **API Routes:** `GET/PATCH /api/profile`, `GET /api/projects`, `GET/POST/PATCH/DELETE /api/portfolio`, `GET /api/portfolio/:userId/public` (public, no auth).
- **Sidebar:** "My Work" section with "My Library" and "My Portfolio" links.

### Comic Creator Panel Filters
- **CSS Filters:** Panels support visual filters (grayscale, sepia, vintage, high contrast, blur, invert, warm, cool, noir, dreamy, etc.) applied via right-click context menu.
- **Filter Property:** `filter` field on Panel interface, applied as CSS filter to panel content container.
- **Auto-Save:** Debounced 3-second auto-save with `userEditCountRef` to skip first trigger after initial project load, preventing data overwrite.

### Creator Marketplace
- **Browse:** `/marketplace` - public storefront with search, type filters (Comic, Card, VN, CYOA, Cover, Motion, Asset Pack), and listing cards.
- **Listing Detail:** `/marketplace/listing/:id` - full listing view with hero image, price, description, tags, preview gallery, buy button.
- **Sell Content:** `/marketplace/sell` - creators list published/approved projects for sale with price, description, tags. Students cannot sell.
- **Purchases & Sales:** `/marketplace/purchases` - tabbed page showing purchase history and seller dashboard with earnings.
- **Stripe Integration:** Uses Stripe Checkout in `payment` mode (one-time purchases). Checkout creates a pending order, verify-purchase confirms via Stripe session.
- **Database Tables:** `marketplace_listings` (seller, project, price, type, status, stripe IDs, sales count, earnings), `marketplace_orders` (buyer, listing, seller, amount, status, stripe session/payment intent).
- **Security:** Server-side student restriction on listing creation, seller ownership verification on updates/deletes, purchase verification before download access.
- **API Endpoints:**
  - `GET /api/marketplace/listings` - browse (public)
  - `GET /api/marketplace/listings/:id` - detail (public)
  - `POST /api/marketplace/listings` - create listing (creator only)
  - `PUT /api/marketplace/listings/:id` - update (owner only)
  - `DELETE /api/marketplace/listings/:id` - delete (owner/admin)
  - `GET /api/marketplace/my-listings` - seller's listings
  - `POST /api/marketplace/checkout` - initiate Stripe checkout
  - `POST /api/marketplace/verify-purchase` - confirm payment
  - `GET /api/marketplace/purchases` - buyer's orders
  - `GET /api/marketplace/earnings` - seller's orders + total
  - `GET /api/marketplace/listings/:id/download` - download content (verified purchasers only)
- **Sidebar:** "Marketplace" section with Browse, Sell Content (creator only), My Purchases.

### Motion Studio Audio
- **Audio Clips:** Upload audio files (any format), stored as data URLs in project data.
- **AudioClip Interface:** id, name, src, startFrame, durationFrames, volume, muted.
- **Timeline Visualization:** Audio clips shown as emerald-colored blocks in the audio track with faux waveform SVG display.
- **Playback Sync:** Web Audio API decodes and plays audio synchronized with frame timeline, with offset calculation for mid-clip starts.
- **Controls:** Upload button, mute/unmute toggle, volume slider in transport bar. Per-clip mute/delete in timeline.
- **Save/Load:** Audio clips persisted with project data in all save paths (manual, auto-save, beacon).

### Ecosystem Integration Points (Planned/Future)
- `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.