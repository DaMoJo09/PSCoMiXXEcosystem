# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application designed as an AI-assisted creative studio for generating diverse digital content, including comics, trading cards, visual novels, and motion comics. It integrates drawing tools and comprehensive project management, aiming to be the central content creation hub for the PSCoMiXX ecosystem. The platform focuses on enhancing content discoverability, optimizing marketplace functionality, and providing scalable solutions for publishing, monetization, and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, Vite, and Wouter, featuring a brutalist aesthetic with dark themes, hard shadows, and neon accents. Styling uses TailwindCSS v4, Radix UI, and shadcn/ui. State management relies on TanStack Query and React Context, emphasizing component composition, path aliases, separation of concerns, and mobile responsiveness.

### Backend
An Express.js server on Node.js provides RESTful endpoints. It uses session-based authentication with Passport.js (local strategy, scrypt hashing) and secures endpoints with middleware for authentication, role-based authorization, and rate limiting.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed through Drizzle ORM. The schema supports users, polymorphic projects, assets, versions, and audit logs, utilizing JSONB and UUID primary keys. Drizzle Kit manages migrations.

### Security
The platform implements rate limiting, Helmet.js, strong password policies, secure session management, COPPA/FERPA compliance, content safety features, AI resilience, audit logging, and SSO support.

### Ecosystem SSO
JWT-based single sign-on is integrated across the PSCoMiXX ecosystem, with CoMiXX acting as the identity provider. It supports token issuance, verification, OAuth-style authorization, and ecosystem logins.

### Webhook Service
A standardized event dispatch system with delivery logging and a retry queue supports various platform events.

### Export & Publish Pipeline
The ExportService generates scene/timeline JSON and PNG layer exports. The PublishService handles content bundling (PS Content Bundle v1), validation, saving, synchronization to the Emergent streaming platform, and webhook dispatch.

### Feature Flags System
Dynamic toggling of features is managed via database-stored feature flags, impacting both frontend rendering and backend logic.

### Subscription & Usage Tracking
Supports multiple subscription tiers (Free, Creator, Pro, Studio, Lifetime, School) with server-side usage tracking and frontend feature gating for AI generations, exports, projects, and storage.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages, conforming to the PS Content Bundle v1 format, with validation, bundling, saving, synchronization, version tracking, and admin review.

### XP & Account System
Includes Student (6-17) and Creator (18+) accounts with an XP system for scaled leveling, based on verified active time and action-based rewards. The heartbeat system uses dual verification: client-side activity tracking (mouse, keyboard, touch, scroll with 90s idle timeout) cross-checked against server-side API call activity (120s threshold). XP is only awarded when both client AND server confirm genuine usage — no AFK farming possible. A progression engine manages 30 levels, 15 achievements, 5 content packs, 6 rewards, and 6 certifications.

### Certification System
Project-based certifications are tied to real output and require XP thresholds, level requirements, and published work. Each certification generates a unique verifiable code and integrates with the ecosystem.

### PSLMS Integration
Integrates with Press Start LMS, enabling student submission of creations and allowing PSLMS to fetch comics via API using shared keys and email matching.

### UI/UX Design
The UI/UX employs a brutalist dark theme with neon accents, card-style containers, and gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation.

### Project Persistence & Navigation
Features smart project resumption, server-side deduplication, and auto-save-on-unmount.

### Creator Tools
A suite of tools includes:
- **Comic Creator:** Supports drawing, CSS filters, text formatting, auto-save, undo/redo, offline saving, and various export options, including a "Text Page" panel option for prose-heavy content.
- **Visual Novel Creator:** A Ren'Py-inspired engine with scenes, characters, dialogue, and transitions.
- **CYOA Builder:** An interactive fiction engine with story generation, node editing, variables, and conditional choices.
- **Card Creator:** Supports TCG and Sports modes with specific card types and a Pack Builder.

### Print Studio
Provides a creation-to-print pipeline with an export dashboard, print quote request form, package offerings, and a customer review & rating system for printed products (1-5 stars, verified order badges, product type filtering).

### Creator Marketplace
A public storefront for browsing, filtering, and selling projects or asset packs via Stripe Checkout, with content rating and student filtering.

### Marketplace Reviews
Stores ratings and review text with a "verified purchase" flag, displayed on listing pages.

### Community Library
A Webtoons-style browse page with search, sorting, a comic reader, "like" and comment features, view tracking, and bookmarking with reading progress. Includes series management and a follower system.

### Comic Series System
Allows creators to group comics into series with chapters, supporting auto-numbering, subscriptions, featured series, and per-series stats.

### Motion Studio
Supports video/GIF export with progress tracking, drawing layers, selection tools, shape tools, fill tool, eyedropper, audio clip integration with a timeline, and a virtualized frame list.

### Platform Analytics Dashboard
An admin-only dashboard provides 50+ KPIs across various tabs (growth, engagement, content, revenue, AI & platform, user health, schools), utilizing SQL aggregation queries for fast loading.

### Platform Event Tracking
An internal analytics system tracks page views, feature usage, tool opens, exports, and AI generations. Data is stored in a `platform_events` table and client-side events are batched.

### Teacher Dashboard
An enhanced dashboard for teachers with tabs for Student Roster, Assignments, Submissions, Projects, and Analytics.

### Creator Profile
Public creator profiles display avatar, cover image, bio, XP progress, social links, follower/following counts, and published works.

### Assignment Submit Button
A reusable component for students to submit projects to active assignments.

### HOPs (Hot One-Page Stories)
A viral short-form content format for the streaming platform. Route: `/creator/hop`. Supports single HOPs and series. Each HOP has scenes with assets (image/gif/video/audio), text overlays, captions, and transitions (cut/fade/zoom/glitch). Audio track support with loop/volume controls. Clip length modes: 30s, 90s, custom. Loop modes: single_loop, full_series_loop, manual_advance. Fullscreen preview player with loop counter and audio sync. XP events: `hop_created` (25 XP), `hop_saved` (25 XP), `hop_published` (100 XP), `hop_series_created` (150 XP). Integrated into publish pipeline as `hop` content type. Files: `client/src/pages/HopCreator.tsx`, `shared/schema.ts` (hopDataSchema, hopSceneSchema).

### Comic Audio Enhancement
Per-spread theme music support in the Comic Creator. Each spread can have attached audio with volume, loop, and autoplay controls. Audio uploaded as base64 data URLs. Controls in the spread navigation bar (add/play/pause/remove). Hidden `<audio>` element handles playback with autoPlay support. SpreadAudio interface: src, name, volume, loop, autoplay.

### FX Studio Integration
Full bidirectional integration with FX Studio (pscomixx.online) covering all 12+ creative modes. FX Studio opens in a new browser tab via `window.open()` (iframe embedding blocked by Lovable hosting headers). The `useFxStudio` hook manages the tab lifecycle, `postMessage` bridge for real-time asset return (`panel-fx-return`, `asset-export`, `fx-studio-ready`, `fx-studio-closed` events), and tab-closed polling. A `FxStudioStatusBar` component shows connection status at the bottom of the screen while FX Studio is open. The sidebar, comic creator toolbar, and motion studio toolbar all open FX Studio in a new tab. The layout-sync endpoint accepts all mode types with automatic asset_tag resolution. Local-first `fx_effects` table stores synced assets with upstream mirroring to FX Studio's Supabase edge function. Retry protocol retries without preview_data_url on upstream failure. Cloud sync button enables bidirectional push (CoMiXX → FX Studio). Health check at `/api/fx-studio/health`. Asset tag taxonomy covers 28+ tags organized into 9 folder groups. The `/fx-studio` route auto-opens FX Studio in a new tab.

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
Uses SHA-256 and perceptual hashing against a `blocked_hashes` DB table to scan all image uploads.

### Transactional Emails
Branded HTML email templates are sent via Resend for welcome, notifications, and confirmations.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai
- **AI Text Generation:** Pollinations.ai

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
- **Resend:** Transactional emails.
- **Stripe:** Payment processing (Stripe Checkout).
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `www.pscomixx.online`, `psstreaming.online`.