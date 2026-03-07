# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application providing an AI-assisted creative studio for generating comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. It integrates drawing tools and project management features, serving as the content creation hub for the broader PSCoMiXX ecosystem. The platform emphasizes discoverability, marketplace optimization, and scalability, aiming to foster a creator-first environment for publishing, monetization, and community interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The application utilizes React with TypeScript, Vite, and Wouter for routing. Styling is managed with TailwindCSS v4, custom design tokens, Radix UI primitives, and shadcn/ui components, adhering to a brutalist aesthetic featuring hard shadows, a dark theme, and neon accents. State management is handled by TanStack Query for server state and React Context for authentication. The design emphasizes component composition, path aliases, and separation of concerns. Mobile-responsive layout with bottom nav bar, hamburger menu, and desktop-recommended banners on creator tools.

### Backend
An Express.js server built with Node.js handles API requests. Authentication is session-based using Passport.js with a local strategy and scrypt hashing, secured with `express-session`. The API provides RESTful endpoints with middleware for authentication, role-based authorization, and rate limiting (`express-rate-limit`).

### Security
- **Rate Limiting:** Global API limiter (200 req/min), auth limiter (10 attempts/15 min), AI limiter (10 req/min).
- **Password Policy:** Minimum 8 characters, at least one letter and one number.
- **Session Secret:** Uses `SESSION_SECRET` env var or `REPL_ID`, never hardcoded.
- **COPPA Compliance:** Parental consent checkbox for student accounts, `parentalConsentAt` timestamp stored in DB.
- **Content Safety:** Student accounts get safety-filtered AI prompts ("safe for children, family friendly"), mature marketplace content blocked.
- **Content Moderation:** `blockStudents` middleware, content reporting system, admin review queue.
- **Prompt Sanitization:** HTML tags and script injection stripped from AI prompts, 2000 char limit.
- **AI Resilience:** Retry with exponential backoff (3 attempts), 15s timeout, graceful error messages.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed using Drizzle ORM for type-safe operations. The schema includes `users`, `projects` (polymorphic), `assets`, `project_versions`, `publish_jobs`, `engagement_events`, `marketplace_reviews`, `creator_analytics`, `usage_tracking`, leveraging JSONB for flexible project data and UUID primary keys. Drizzle Kit manages database migrations.

### Subscription & Usage Tracking
- **Tier Entitlements:** Free, Creator, Pro, Studio, Lifetime tiers with limits on AI generations/day, exports/month, max projects, and storage.
- **Usage Tracking:** `usage_tracking` table tracks AI generations and exports per user per day/month.
- **Server-Side Enforcement:** AI and export endpoints check usage limits before processing, return 403 when exceeded.
- **Frontend Feature Gates:** `FeatureGate` component and `useSubscription` hook wrap premium features with upgrade prompts.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages. Content adheres to the PS Content Bundle v1, a Zod-validated format. The pipeline validates, bundles, saves, and syncs content to the Emergent streaming platform. Version tracking and job tracking are implemented, and an admin review queue manages project approvals.

### XP & Account System
The platform supports Student (6-17) and Creator (18+) account types, with students having restricted monetization access. An XP system tracks user progression based on active usage, displayed through level badges and progress bars.

### PSLMS Integration
Integration with Press Start LMS allows students to submit creations to their portfolios and enables PSLMS to fetch student comics via API, authenticated using a shared secret API key and user matching via email.

### System Design Choices
The UI/UX adopts a brutalist aesthetic with a dark theme (zinc-900/950), neon accents, card-style containers, and gradient accents. Typography includes Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and includes a PWA install button for desktop installation.

### My Library (Private)
A private workspace displays all user projects with filtering and search capabilities. Project cards show key information like thumbnail, type, status, and last-edited time. Loading skeletons shown during data fetch.

### Portfolio Website (Public-Facing)
Each user has an editable portfolio website for displaying published works and artworks. It includes profile editing options and a gallery of published projects, accessible publicly without authentication.

### Comic Creator Features
The comic creator supports direct drawing within panels with a dedicated toolbar (pen, eraser, color picker, brush size), CSS filters for visual effects, and advanced text formatting options. Auto-save functionality is built-in. Full undo/redo system with 50-level history (Ctrl+Z / Ctrl+Shift+Z). Offline save with IndexedDB fallback.

### Cover Creator
The cover creator features transformable text elements (title, subtitle, author, back blurb, banner, price box, issue number) with extensive editing controls including text effects and arching. It integrates with the asset library for adding transformable image layers and supports print-ready export at 300 DPI.

### Card Creator
The card creator supports TCG and Sports modes, offering specific card types and fields for each. Sports mode includes 16 sports with various templates and stat fields. It features name arching and print-ready export at 300 DPI for both single cards and packs.

### Creator Marketplace
A public storefront allows browsing, searching, and filtering content. Creators can list published projects or asset packs for free or sale, with paid listings handled via Stripe Checkout. Users can import purchased asset packs into their library. Content rating system (everyone/teen/mature) with student filtering.

### Marketplace Reviews
- **Schema:** `marketplace_reviews` table with rating (1-5), review text, verified purchase flag.
- **API:** `GET/POST /api/marketplace/listings/:id/reviews`.
- **UI:** Reviews section on listing detail page with star ratings, verified purchase badges, write-review form (purchasers only).
- **Analytics:** `creator_analytics` table tracks views/clicks. `GET /api/marketplace/analytics` returns creator dashboard data.

### Community Library
A Webtoons-style community library provides a browse page with search, sorting, and a comic reader for vertical scrolling. Only approved and published comics are listed, and users can like comics.

### Motion Studio Features
The motion studio supports video/GIF export in various formats and resolutions, with progress tracking. GIF encoding runs in a Web Worker to prevent UI freezing. It includes drawing layers (multiple per frame with visibility, opacity, blend mode, reorder), selection tools (rect, ellipse, lasso), shape tools (rect, ellipse, line, arrow, polygon, star), a fill tool, and an eyedropper. Audio clips can be uploaded, played, and synchronized with the timeline. Canvas drawing is throttled with requestAnimationFrame. Frame list virtualized for 50+ frames.

### FX Studio Integration
Integration with FX Studio (pressplays.site) allows importing effects into the Motion Studio through a server-proxied API, enabling users to browse, import, and apply effects to their frames.

### PWA & Offline Mode
- **Service Worker:** App shell caching, font caching, icon/SVG asset caching. Version-based cache invalidation.
- **IndexedDB Storage:** Projects saved locally when offline via `offlineStorage.ts`.
- **Conflict Resolution:** Timestamp-based conflict detection on sync. UI shows "Keep Local" / "Keep Server" / "Keep Both" options.
- **Background Sync:** Periodic sync every 30 seconds when online. Sync status indicator in sidebar (pending count, last sync time).
- **Offline Save Wiring:** ComicCreator and MotionStudio auto-save to IndexedDB when offline.

### Accessibility
- **Keyboard Shortcuts:** `?` key opens shortcuts help dialog showing all available shortcuts by category.
- **Skip-to-Content:** Hidden skip link for screen readers.
- **Aria Labels:** All icon-only buttons have aria-labels, especially when sidebar is collapsed.
- **High Contrast Mode:** Toggle in Settings that applies yellow primary accents and maximum contrast borders.
- **Reduced Motion:** Respects `prefers-reduced-motion` OS setting with manual override in Settings. Kills all animations/transitions.
- **Error Boundary:** Global ErrorBoundary catches page crashes with retry/go-home options.

### Mobile Responsiveness
- **Layout:** Mobile top header with hamburger menu, bottom navigation bar (Home, Community, Market, AI Tools, Portfolio).
- **Slide-in Drawer:** Mobile navigation drawer renders full AppSidebar.
- **Creator Tools:** Desktop-recommended banner on creator tool pages with dismiss option.
- **Public Pages:** Community library, marketplace, portfolio, auth, and landing pages are fully responsive with touch-friendly targets.
- **Viewport:** `viewport-fit=cover` for safe area support, pinch-to-zoom enabled.

### SEO
- **robots.txt:** Allows public pages, blocks API and creator tools.
- **sitemap.xml:** Dynamic generation from community comics and marketplace listings.
- **OG Image Endpoints:** `/og/community/:id`, `/og/portfolio/:userId`, `/og/marketplace/:id`.
- **Meta Tags:** OG and Twitter Card tags for pressstart.space.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai (image.pollinations.ai)
- **AI Text Generation:** Pollinations.ai (text.pollinations.ai)
All AI features are free and accessible to all users without paywalls.

### Databases & ORMs
- `@neondatabase/serverless`: PostgreSQL client.
- `drizzle-orm`, `drizzle-zod`: ORM and Zod schema validation.

### Authentication
- `passport`, `passport-local`: Authentication middleware.

### Security
- `express-rate-limit`: API rate limiting.

### UI/Utility Libraries
- `date-fns`: Date manipulation.
- `sonner`: Toast notifications.
- `recharts`: Data visualization.
- `embla-carousel-react`: Carousel functionality.
- `lucide-react`: Icons.
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss`.

### Development Tools
- ESBuild, PostCSS, Autoprefixer.

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono.

### Mad Mixed Media Integration
- Integrates with Mad Mixed Media streaming platform for content and creator profile synchronization, including webhooks and auto-publishing on project approval.

### Ecosystem Integration Points
- `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.
