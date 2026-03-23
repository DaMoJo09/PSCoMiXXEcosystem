# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application that functions as an AI-assisted creative studio. It allows users to generate various digital content, including comics, trading cards, visual novels, and motion comics, by integrating drawing tools and comprehensive project management. The platform aims to be the central content creation hub for the PSCoMiXX ecosystem, focusing on enhanced discoverability, optimized marketplace functionality, and scalable solutions for publishing, monetization, and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React, TypeScript, Vite, and Wouter, styled with TailwindCSS v4, Radix UI, and shadcn/ui. It features a brutalist aesthetic with dark themes, hard shadows, and neon accents. State management is handled by TanStack Query and React Context, emphasizing component composition, path aliases, separation of concerns, and mobile responsiveness.

### Backend
The backend is an Express.js server on Node.js, utilizing session-based authentication with Passport.js (local strategy, scrypt hashing). It provides RESTful endpoints secured with middleware for authentication, role-based authorization, and rate limiting.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed through Drizzle ORM. The schema supports users, polymorphic projects, assets, versions, and audit logs, using JSONB and UUID primary keys. Drizzle Kit manages migrations.

### Security
The platform implements rate limiting, Helmet.js, strong password policies, secure session management, COPPA/FERPA compliance, content safety features, AI resilience, audit logging, and SSO support.

### Ecosystem SSO
JWT-based single sign-on is implemented across the PSCoMiXX ecosystem.

### Webhook Service
A standardized event dispatch system with delivery logging and a retry queue supports events like `project.published`, `project.exported`, `user.created`, and `user.tier_changed`.

### Export & Publish Pipeline
The ExportService generates scene-json, timeline-json, and PNG layer exports for external tools. The PublishService handles content bundling (PS Content Bundle v1), validation, saving, synchronization to the Emergent streaming platform, and webhook dispatch.

### Feature Flags System
Feature flags stored in the database allow dynamic toggling of features, affecting both frontend rendering and backend logic (e.g., `payments_enabled`, `export_restrictions`, `early_adopter_gate`).

### Subscription & Usage Tracking
Supports Free, Creator, Pro, Studio, Lifetime, and School subscription tiers with server-side usage tracking and frontend feature gates for AI generations, exports, projects, and storage.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages, conforming to the PS Content Bundle v1 format, handling validation, bundling, saving, synchronization, version tracking, and admin review.

### XP & Account System
Supports Student (6-17) and Creator (18+) accounts with an XP system for scaled leveling based on time and action-based rewards. The progression engine (`server/progressionEngine.ts`) manages 30 levels with named thresholds, 15 achievements, 5 content packs, and 6 rewards. Progression events fire automatically on project creation, publishing, export completion, and AI generation. The sidebar and dashboard XP widget both pull live data from `/api/xp/status` and `/api/progression/summary`. Action keys are normalized (legacy `export`/`generate` map to `export_completed`/`ai_generation`) to match the engine's XP_VALUES. Pages: `/achievements` (AchievementsPage), `/rewards` (RewardsPage).

### PSLMS Integration
Integrates with Press Start LMS, allowing students to submit creations and enabling PSLMS to fetch comics via API using a shared secret key and email-based user matching.

### UI/UX Design
The UI/UX features a brutalist dark theme with neon accents, card-style containers, and gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation.

### Project Persistence & Navigation
Features smart project resumption, server-side deduplication, and auto-save-on-unmount functionality.

### Creator Tools
A suite of tools includes:
- **Comic Creator:** Supports drawing, CSS filters, text formatting, auto-save, undo/redo, offline saving, and various export options. Includes a **Text Page** panel option for books, kids' books, and graphic novels (full-panel prose text with serif fonts, proper line height, and book-style padding). Panel templates include Book/Novel category (Full Text Page, Chapter Header + Text, Two Columns, Graphic Novel Panel, etc.).
- **Visual Novel Creator:** A Ren'Py-inspired engine with scenes, characters, dialogue, transitions, and export options.
- **CYOA Builder:** An interactive fiction engine with story generation, node editing, variables, conditional choices, and HTML export.
- **Card Creator:** Supports TCG and Sports modes with specific card types and a Pack Builder.

### Print Studio
Provides a creation-to-print pipeline with an export dashboard, print quote request form, and package offerings.

### Creator Marketplace
A public storefront for browsing, filtering, and selling projects or asset packs via Stripe Checkout, with content rating and student filtering.

### Marketplace Reviews
Stores ratings and review text with a "verified purchase" flag, displayed on listing pages.

### Community Library
A Webtoons-style browse page with search, sorting, a comic reader, "like" and comment features, view tracking, and bookmarking with reading progress. Includes series management and a follower system.

### Comic Series System
Allows creators to group comics into series with chapters, supporting auto-numbering, series subscriptions, featured series, and per-series stats.

### Motion Studio
Supports video/GIF export with progress tracking, drawing layers, selection tools, shape tools, fill tool, eyedropper, audio clip integration with a timeline, and a virtualized frame list.

### Platform Analytics Dashboard
An admin-only dashboard providing 40+ KPIs across various tabs for growth, engagement, content, revenue, AI & platform, and user health.

### Teacher Dashboard
An enhanced dashboard for teachers with tabs for Student Roster, Assignments, Submissions, Projects, and Analytics.

### Creator Profile
Public creator profiles display avatar, cover image, bio, XP progress, social links, follower/following counts, and published works.

### Assignment Submit Button
A reusable component for students to submit projects to active assignments.

### FX Studio Integration
Integrates bidirectionally with FX Studio (pressplays.site) for asset exchange across all creator tools. XP and time spent events are forwarded to PSStreaming. Supports exporting panels to FX Studio and importing effects back into panels, and importing `comic-script` type assets from PressPlays into various creator tools. **Layout Sync**: `POST /api/fx-studio/layout-sync` receives panel layout data (pages with panel positions) or script data from FX Studio's "SEND TO" button, stores it via the effects API, and returns a redirect URL (`/comic?fromLayout=ID` or `/comic?fromScript=ID`). The Comic Creator handles both `fromLayout` and `fromScript` URL params to auto-import layouts and scripts. `layoutToSpreads()` in `scriptImport.ts` converts layout data to comic spreads. The endpoint supports CORS for cross-origin calls from the Lovable-hosted FX Studio app.

### PWA & Offline Mode
Includes a Service Worker for caching and offline use with IndexedDB, featuring conflict resolution, background syncing, and update notifications.

### Accessibility
Features keyboard shortcuts, skip-to-content links, Aria labels, high-contrast mode, `prefers-reduced-motion` respect, and a global `ErrorBoundary`.

### Mobile Responsiveness
Optimized for mobile with a top header, hamburger menu, bottom navigation bar, and slide-in drawer.

### SEO
Includes `robots.txt`, dynamic `sitemap.xml`, Open Graph (OG) image endpoints, and full SEO meta tags with JSON-LD structured data.

### Landing Page
A marketing landing page at `/landing` and `/welcome` showcasing features, audience sections, "How It Works," testimonials, pricing CTA, and legal links.

### New User Onboarding
An `OnboardingWizard` guides new users through a 3-step flow on their first login.

### File Storage
Local disk storage at `uploads/` directory with DB tracking via `exported_files` table. Supports base64 upload, max 50MB file size, and MIME type allowlist. Uploads are scanned by content moderation.

### Content Moderation
Uses SHA-256 and perceptual hashing against `blocked_hashes` DB table to scan all image uploads.

### Transactional Emails
Branded HTML email templates sent via Resend for welcome, assignment notifications, submission confirmations, grade notifications, purchase confirmations, and subscription confirmations.

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
- **Resend:** For transactional emails.
- **Stripe:** For payment processing (Stripe Checkout).
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.