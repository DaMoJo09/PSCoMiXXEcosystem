# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application that acts as an AI-assisted creative studio. Its primary purpose is to enable users to generate comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. The platform integrates drawing tools and project management features, serving as the content creation hub for the broader PSCoMiXX ecosystem. It aims to foster a creator-first environment, emphasizing discoverability, marketplace optimization, and scalability for publishing, monetization, and community interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The application uses React with TypeScript, Vite, and Wouter for routing. Styling leverages TailwindCSS v4, custom design tokens, Radix UI primitives, and shadcn/ui components, adhering to a brutalist aesthetic with hard shadows, a dark theme, and neon accents. State management uses TanStack Query for server state and React Context for authentication. The design prioritizes component composition, path aliases, and separation of concerns, offering a mobile-responsive layout with specific mobile navigation elements.

### Backend
An Express.js server built with Node.js manages API requests. Authentication is session-based via Passport.js with a local strategy and scrypt hashing. The API provides RESTful endpoints with middleware for authentication, role-based authorization, and rate limiting.

### Security
Robust security measures include rate limiting, Helmet.js for security headers, strong password policies, secure session management, and COPPA/FERPA compliance. Content safety features like student account filtering, profanity filters, and prompt sanitization are in place. AI resilience is handled with retries and graceful error messages. Comprehensive audit logging tracks critical user and system actions, and SSO infrastructure is supported. The system also includes graceful shutdown procedures and health monitoring endpoints.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed using Drizzle ORM for type-safe operations. The schema supports various entities including users, projects (polymorphic), assets, versions, and audit logs, leveraging JSONB for flexible data and UUID primary keys. Drizzle Kit manages database migrations.

### Subscription & Usage Tracking
The platform supports Free, Creator, Pro, Studio, and Lifetime tiers, each with specific limits on AI generations, exports, projects, and storage. Usage is tracked per user, and server-side enforcement ensures limits are respected, with frontend feature gates providing upgrade prompts for premium features.

### Content Publishing Pipeline
Projects move through draft, review, and publication stages, adhering to the PS Content Bundle v1 format. The pipeline handles validation, bundling, saving, and syncing to the Emergent streaming platform, with version tracking and an admin review queue for approvals.

### XP & Account System
Two account types exist: Student (6-17) and Creator (18+), with students having restricted monetization. An XP system uses scaled leveling, earned through time-based heartbeats and action-based rewards with cooldowns. Level is derived from total XP.

### PSLMS Integration
Integration with Press Start LMS allows students to submit creations to their portfolios and enables PSLMS to fetch student comics via API using a shared secret API key and email-based user matching.

### UI/UX Design
The UI/UX employs a brutalist aesthetic with a dark theme, neon accents, card-style containers, and gradient accents. Typography includes Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and PWA installation options.

### Project Persistence & Navigation
All creator tools implement smart project resumption, redirecting to the most recently updated project of a specific type. Projects with actual saved data are prioritized over empty/never-updated ones in the redirect sort. Server-side dedup on `POST /api/projects` prevents duplicate project creation by returning existing projects of the same type, but can be bypassed with `forceNew: true` (used by Dashboard's "New" buttons to allow creating fresh projects). All creator effects use `cancelled` flags and cleanup returns to prevent race conditions. New projects are only created when none exist. If the project fetch fails, it rejects (no silent empty-array fallback) so the creation guard stays active. Auto-save-on-unmount functionality uses `navigator.sendBeacon` and `beforeunload` handlers, with the autosave endpoint merging data fields to prevent data loss. A `projectConfirmedRef` guard ensures autosave only runs after the project is confirmed to exist in the database, preventing 404 spam. If a URL contains a stale/invalid project ID, the creator detects the fetch error and redirects to find/create a valid project.

### My Library (Private)
A private workspace displays all user projects with filtering and search capabilities, showing key project information and using loading skeletons.

### Portfolio Website (Public-Facing)
Each user has an editable public portfolio website to display published works and artworks, accessible without authentication.

### Comic Creator
Supports direct drawing within panels with a dedicated toolbar, CSS filters, advanced text formatting, auto-save, a full undo/redo system (50-level history), and offline saving with IndexedDB. Export options include PNG (current page/full comic), print-ready PDF, and JSON project data.

### Cover Creator
Features transformable text elements with extensive editing controls and integrates with the asset library for image layers. It supports print-ready export at 300 DPI, with snap-to-grid alignment, aspect ratio locking, and rotational snapping.

### Card Creator
Supports TCG and Sports modes with specific card types and fields. Sports mode includes 16 sports, various templates, team-level settings, and a Pack Builder with a 3-column roster grid preview and a "Print Team Sheet" export for organizations.

### Print Studio (CoMiXX Print & Merch)
A creation-to-print pipeline module with four pages under `/print-studio`:
- **Print Studio Landing** (`/print-studio`): Marketing overview with hero, feature grid (6 output types), audience sections (Schools/Creators/Programs), how-it-works flow, and product bundles.
- **Export Dashboard** (`/print-studio/export`): Asset type selector (Comic Book, Trading Card, T-Shirt, Poster, Sticker Sheet) with print-ready export settings (DPI, bleed, trim marks, CMYK notes, size presets). Links to relevant creator tools for export.
- **Print Quote Request** (`/print-studio/quote`): Form for requesting print quotes with fields for name, org, account type, product type (multi-select), quantity, size, deadline, notes. Submits to `POST /api/print-quotes`. Shows user's previous requests with status badges.
- **Packages** (`/print-studio/packages`): Three audience tabs (Schools/Programs/Creators) with package details and 4 bundle cards (Comic Launch, School Showcase, Creator Merch, Fundraiser).
- **Database**: `print_quote_requests` table with userId, name, organization, accountType, productType, quantity, size, deadline, notes, artworkUrl, status, createdAt.
- **API**: `POST /api/print-quotes`, `GET /api/print-quotes`, `GET /api/admin/print-quotes`, `PATCH /api/admin/print-quotes/:id/status`.

### Creator Marketplace
A public storefront for browsing, searching, and filtering content. Creators can list projects or asset packs for free or sale (via Stripe Checkout), with content rating and student filtering. Purchased asset packs can be imported into the user's library.

### Marketplace Reviews
A `marketplace_reviews` table stores ratings (1-5) and review text, with a "verified purchase" flag. API endpoints facilitate review submission and retrieval, and the UI displays reviews on listing pages. Analytics are tracked in `creator_analytics`.

### Community Library
A Webtoons-style browse page with search, sorting, and a comic reader for vertical scrolling. Only approved and published comics are listed, and users can "like" comics. Features include:
- **Comments**: Authenticated users can comment on comics (2000 char limit, threaded replies via parentId). Comments show author avatar/name/timestamp with delete for own comments.
- **View Tracking**: `viewCount` column on projects, incremented on comic reader mount via POST `/api/community/comic/:id/view`. Displayed in reader header.
- **Bookmarks / Continue Reading**: Users can bookmark comics with reading progress (spread index). "Continue Reading" section in community library shows bookmarked comics (filtered to published/approved only).
- **Series & Chapters**: `comic_series` table groups comics. Projects have `seriesId`/`seriesOrder`. Series management in Library page (create/edit/delete, assign comics). Public series page at `/community/series/:id`. Community library shows public series section.
- **Follower System**: Uses existing `user_follows` table. Follow/unfollow buttons on portfolio pages and comic reader creator cards. Follower/following counts on portfolio.
- **Thumbnail Auto-Generation**: ComicCreator can generate thumbnails from first panel image or front cover. Auto-generated on publish/submit-for-review if none exists.
- **Comic Preview**: "Preview as Reader" option in ComicCreator opens comic in reader mode at `/creator/comic/preview?id=X` using ComicReader with `isPreview` prop (disables views/comments/bookmarks).

### Database Tables (Community Features)
- `comic_comments`: id, comic_id, author_id, text, parent_id, created_at
- `comic_bookmarks`: id, user_id, project_id, last_spread_index, created_at, updated_at
- `comic_series`: id, user_id, title, description, cover_image, created_at, updated_at
- Projects columns: `view_count`, `series_id`, `series_order`

### Motion Studio
Supports video/GIF export with progress tracking, using a Web Worker for GIF encoding. Features drawing layers, selection tools, shape tools, fill tool, eyedropper, and audio clip integration synchronized with a timeline. Canvas drawing is throttled, and the frame list is virtualized.

### FX Studio Integration
Integrates with FX Studio (pressplays.site) via a server-proxied API to allow users to browse, import, and apply effects to Motion Studio frames.

### PWA & Offline Mode
Includes a Service Worker (v6) for app shell, font, and asset caching, with version-based invalidation and dynamic cache size limits (max 100 entries). On activation, the SW pre-caches the Vite-built app shell by parsing `/` for script/CSS references. Projects are saved locally using IndexedDB for offline use, with timestamp-based conflict resolution and background syncing. Sync status is indicated in the UI sidebar. PWA components live in `client/src/components/pwa/`:
- **InstallBanner**: Dismissible top banner prompting install after 2+ visits, hidden for 7 days after dismissal.
- **NetworkStatusToast**: Global online/offline toast notifications via Sonner, triggers sync on reconnect with result feedback.
- **UpdatePrompt**: Detects waiting SW updates and shows persistent "Update Now" toast; user-controlled activation (no auto `skipWaiting`).
iOS PWA support includes `apple-mobile-web-app-capable`, multiple touch icon sizes, and a branded splash screen in `index.html`.

### Accessibility
Features keyboard shortcuts (accessible via `?`), a skip-to-content link, Aria labels for UI elements, a high-contrast mode, and respect for `prefers-reduced-motion` settings. A global `ErrorBoundary` handles page crashes.

### Mobile Responsiveness
Designed for mobile with a top header, hamburger menu, bottom navigation bar, and slide-in drawer for full sidebar content. Creator tools display desktop-recommended banners. Public pages are fully responsive and touch-friendly, with viewport settings for safe area support and pinch-to-zoom.

### SEO
Includes `robots.txt` for controlling indexing, a dynamic `sitemap.xml`, and Open Graph (OG) image endpoints for community, portfolio, and marketplace listings. Full SEO meta tags in `client/index.html` with JSON-LD structured data (WebApplication, Organization, WebSite, FAQPage).

### Landing Page (Go-to-Market)
Full marketing landing page at `/landing` and `/welcome` with: glitch-effect hero section with video background, feature showcase (6 tools), audience sections (Schools/Education, Indie Creators, Studios/Professionals), 3-step "How It Works" flow, testimonial cards, pricing CTA, and footer with legal links.

### New User Onboarding
`OnboardingWizard` component shown on first login (per-user via `localStorage` keyed by user ID). 3-step flow: Welcome → Pick Your Tools → Quick Tips → Dashboard. Integrated into Dashboard page.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai (image.pollinations.ai)
- **AI Text Generation:** Pollinations.ai (text.pollinations.ai)

### Databases & ORMs
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm`, `drizzle-zod` (ORM and Zod schema validation)

### Authentication
- `passport`, `passport-local` (Authentication middleware)

### Security
- `express-rate-limit` (API rate limiting)

### UI/Utility Libraries
- `date-fns` (Date manipulation)
- `sonner` (Toast notifications)
- `recharts` (Data visualization)
- `embla-carousel-react` (Carousel functionality)
- `lucide-react` (Icons)
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss` (Core frontend stack)

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono

### Other Integrations
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.