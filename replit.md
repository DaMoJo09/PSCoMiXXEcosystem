# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is an AI-assisted web application designed as a creative studio for generating diverse digital content like comics, trading cards, visual novels, and motion comics. It offers integrated drawing tools and comprehensive project management, aiming to be a central content creation hub for the PSCoMiXX ecosystem. The platform focuses on enhancing content discoverability, optimizing marketplace functionality, and providing scalable solutions for publishing, monetization, and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Design
The application features a brutalist aesthetic with dark themes, hard shadows, and neon accents. Styling is implemented using TailwindCSS v4, Radix UI, and shadcn/ui. Typography utilizes Space Grotesk, Inter, and JetBrains Mono. Navigation includes a dynamic auto-hide sidebar. Mobile responsiveness is prioritized with a top header, hamburger menu, bottom navigation, and slide-in drawer. **Chromebook compatibility**: Touch-friendly 44px minimum hit targets on coarse-pointer devices (`@media (pointer: coarse)`), `touch-manipulation` on interactive elements, drawing canvas supports both mouse and touch events, Radix ContextMenu long-press support for right-click alternatives, `hover:none` fallback CSS activates group-hover effects on touch. All features work on ChromeOS/Chrome browser at 1366x768.

### Frontend
Built with React, TypeScript, Vite, and Wouter, the frontend uses TanStack Query and React Context for state management, emphasizing component composition and separation of concerns. It supports PWA features, offline mode, and accessibility standards.

### Backend
An Express.js server on Node.js provides RESTful endpoints. It uses session-based authentication with Passport.js (local strategy, scrypt hashing) and secures endpoints with middleware for authentication, role-based authorization, and rate limiting. A standardized event dispatch system with delivery logging and a retry queue supports various platform events via webhooks.

### Data Storage
PostgreSQL, hosted via Neon serverless, serves as the primary database, accessed through Drizzle ORM. The schema supports users, polymorphic projects, assets, versions, and audit logs. Drizzle Kit manages migrations.

### Security
The platform implements rate limiting (auth: 20/15min, community/store: 60/min, event tracking: 60/min), Helmet.js, strong password policies, secure session management, COPPA/FERPA compliance, content safety features (including content moderation using SHA-256 and perceptual hashing), AI resilience, audit logging, and SSO support.

### Ecosystem Integration
JWT-based Single Sign-On (SSO) is integrated across the PSCoMiXX ecosystem, with CoMiXX acting as the identity provider. The platform integrates with Press Start LMS for educational submissions and offers a robust export and publish pipeline for content bundling (PS Content Bundle v1), validation, and synchronization to the Emergent streaming platform. It also features full bidirectional integration with FX Studio via `postMessage` for asset return and a dedicated `/fx-studio` route.

### Feature Management & Monetization
A database-driven feature flag system allows dynamic toggling of features. Subscription and usage tracking supports multiple tiers (Free, Creator, Pro, Studio, Lifetime, School) with server-side usage tracking and frontend feature gating for AI generations, exports, projects, and storage. An Admin Asset Store (`platform_assets` table) provides full CRUD management for curated platform assets (images, audio, fonts, templates, etc.) with free/paid pricing, category/tag organization, bulk import via JSON, and a public store endpoint that protects paid asset file URLs. Full asset governance model with rights metadata per asset: `sourceType` (original, licensed-restricted, creator-owned, etc.), `rightsClass` (safe-redistributable, system-use-only, embedded-output-only, etc.), `usageMode` (preview-only, system-use-and-export, publish-only, downloadable, admin-only), `unlockType` (free, xp, premium, hybrid, founders-pass), `allowedOutputs` (comic, hop, vn, cyoa, card, motion, cover), `schoolSafe` flag, and `licenseNotes`. Export validation endpoint (`POST /api/export/validate`) checks all asset permissions before export/publish: usage mode, rights class, student safety, XP requirements, unlock status, output type compatibility, and download/publish permissions.

### Content Creation & Management
The platform offers several creator tools:
- **Comic Creator:** Drawing tools, CSS filters, text formatting, auto-save, undo/redo, offline saving, various export options, per-page narrator caption boxes, and per-spread theme music.
- **Visual Novel Creator:** A Ren'Py-inspired engine with scenes, characters, dialogue, and transitions.
- **CYOA Builder:** An interactive fiction engine with story generation, node editing, variables, conditional choices, and per-node background audio.
- **Card Creator:** Supports TCG and Sports modes with specific card types and a Pack Builder.
- **Motion Studio:** Video/GIF export, drawing layers, selection/shape/fill tools, eyedropper, virtualized frame list, and a professional NLE-style timeline with draggable audio clips, keyframe editor, and track visibility/lock toggles.
- **HOPs (Hot One-Page Stories):** A viral short-form content format for the streaming platform. Features: per-scene layer system (media/text/effect/caption), 10 vibe modes (one-tap color filters with canvas-generated gradients), 12 text animations (typewriter, fade, bounce, glitch, neon, etc.), beat react system (9 modes with BPM snap), Zone Out mode (full-screen immersive playback), viewport modes (16:9/9:16/4:3/1:1), standard/moving display toggle (pan animation), PNG export via `html-to-image`, scene duplication, auto-save to localStorage, keyboard shortcuts, audio with volume/loop/BPM, project import for scene assets. Route: `/creator/hop?id=<projectId>`.

### Publishing & Community
Projects progress through draft, review, and publication stages. A Creator Marketplace allows for browsing, filtering, and selling projects or asset packs with content ratings and student filtering. A Community Library provides a multi-format browse page with type filter tabs (All, Comics, Novels, CYOA, Cards, HOPs), search, sorting, and dedicated viewers: comic reader, VN dialogue reader (keyboard + touch), CYOA branching player with back/restart, card collection viewer with stats, HOP slideshow player with progress bars and play/pause. Type-colored badges distinguish content. Bookmarking and view tracking. A Comic Series System groups comics into chapters with auto-numbering and subscriptions. A Print Studio provides a creation-to-print pipeline with an export dashboard and print quote requests. Demo content seeded via `/api/admin/seed-demo-content` (admin only) creates a full 10-page comic, 13-node CYOA, 10-scene VN, 5-card TCG deck, and 12-scene 90s HOP.

### User Progression & Analytics
An XP and Account system includes Student (6-17) and Creator (18+) accounts with an XP system for scaled leveling based on verified active time and action-based rewards. A Certification System ties project-based certifications to output. Admin-only Platform Analytics Dashboard provides 50+ KPIs, and an internal Platform Event Tracking system records user actions. A Teacher Dashboard provides features for student rosters, assignments, and submissions. New user onboarding is action-driven, guiding users through initial project creation and celebrating XP gains.

### File Storage
Local disk storage at `uploads/` directory with DB tracking via `exported_files` table, supporting base64 upload, max 50MB file size, and MIME type allowlist.

### SEO
Includes `robots.txt`, dynamic `sitemap.xml`, Open Graph (OG) image endpoints, and full SEO meta tags with JSON-LD structured data.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai
- **AI Text Generation:** Pollinations.ai

### Databases & ORMs
- `@neondatabase/serverless`
- `drizzle-orm`

### Authentication
- `passport`

### Security
- `express-rate-limit`

### UI/Utility Libraries
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss`

### Font Resources
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)

### Other Integrations
- **Resend:** Transactional emails.
- **Stripe:** Payment processing (Stripe Checkout). Uses Replit Connector with env var fallback (`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`). Admin endpoint `POST /api/admin/seed-stripe-products` creates subscription products/prices. Product-to-tier mapping uses metadata `tier` key or product name matching.
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `www.pscomixx.online`, `psstreaming.online`.