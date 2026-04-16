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
JWT-based Single Sign-On (SSO) is integrated across the PSCoMiXX ecosystem, with CoMiXX acting as the identity provider. The platform integrates with Press Start LMS for educational submissions and offers a robust export and publish pipeline for content bundling (PS Content Bundle v1), validation, and synchronization to the Emergent streaming platform. Full bidirectional integration with FX Studio via `postMessage` for asset return and a dedicated `/fx-studio` route. **Target-aware FX protocol**: FX Studio postMessage now includes `target` context (cover, backCover, priceTag, panel) — when FX returns an asset it auto-applies to the selected element. `event.source` validation prevents cross-tab message injection. **Cross-App Asset Pipeline**: `SendToMenu` component (`client/src/components/ecosystem/SendToMenu.tsx`) provides "Send To" dropdown in creator pages (ComicCreator, HopCreator) targeting FX Studio, PS Streaming, Press Start LMS, and Asset Library via `useHandoff` hook (`client/src/hooks/useHandoff.ts`). **HOPs 3-Mode System**: Still/Pan/Video mode selector with mode-aware export filtering, Stitch Mode for panoramic world building (`client/src/components/hop/HopStitchMode.tsx`), Pan Player with parallax layers (`client/src/components/hop/HopPanPlayer.tsx`).

### Feature Management & Monetization
A database-driven feature flag system allows dynamic toggling of features. Subscription and usage tracking supports multiple tiers (Free, Creator, Pro, Studio, Lifetime, School) with server-side usage tracking and frontend feature gating for AI generations, exports, projects, and storage. An Admin Asset Store (`platform_assets` table) provides full CRUD management for curated platform assets (images, audio, fonts, templates, etc.) with free/paid pricing, category/tag organization, bulk import via JSON, and a public store endpoint that protects paid asset file URLs. Full asset governance model with rights metadata per asset: `sourceType` (original, licensed-restricted, creator-owned, etc.), `rightsClass` (safe-redistributable, system-use-only, embedded-output-only, etc.), `usageMode` (preview-only, system-use-and-export, publish-only, downloadable, admin-only), `unlockType` (free, xp, premium, hybrid, founders-pass), `allowedOutputs` (comic, hop, vn, cyoa, card, motion, cover), `schoolSafe` flag, and `licenseNotes`. Export validation endpoint (`POST /api/export/validate`) checks all asset permissions before export/publish: usage mode, rights class, student safety, XP requirements, unlock status, output type compatibility, and download/publish permissions.

### Content Creation & Management
The platform offers several creator tools:
- **Comic Creator:** Drawing tools, CSS filters, text formatting, auto-save, undo/redo, offline saving, various export options, per-page narrator caption boxes, and per-spread theme music. **Default cover system**: first spread's left page auto-creates a front cover panel for new projects. **Mark Last Page**: tagging a spread as "last page" auto-provisions a back cover panel (placed on the right page or as a new spread). Unmarking removes auto-generated back covers. `isLastPage` flag stored per spread. **Canvas Overview**: Adobe XD-style infinite canvas showing all spreads with connection lines, zoom/pan controls, minimap. Single-click selects spread (layers panel updates), double-click opens for editing. Floating spread inspector shows panel counts, content items, and theme music info. Layers panel stays fully accessible in overview mode.
- **Visual Novel Creator:** A Ren'Py-inspired engine with scenes, characters, dialogue, and transitions. **Canvas/Flowchart View**: infinite canvas showing all scenes as draggable connected nodes with choice-based branching lines; sidebar (scenes/characters/backgrounds tabs) stays fully visible in canvas view. Floating scene inspector shows dialogue count, character count, branching info, and transitions. Double-click to enter scene editor. Scene positions saved to project data. Purple accent color theme.
- **CYOA Builder:** An interactive fiction engine with story generation, node editing, variables, conditional choices, and per-node background audio. **Infinite Canvas Graph**: Adobe XD-style open canvas with draggable nodes, bezier connection lines (dashed for conditional paths), zoom/pan controls, minimap. Floating node inspector shows choices, effects, ending type, and text preview. Node positions saved to project data.
- **Card Creator:** Supports TCG and Sports modes with specific card types and a Pack Builder.
- **Motion Studio:** Video/GIF export, drawing layers, selection/shape/fill tools, eyedropper, virtualized frame list, and a professional NLE-style timeline with draggable audio clips, keyframe editor, and track visibility/lock toggles.
- **HOPs (Hot One-Page Stories):** A viral short-form content format for the streaming platform. Features: per-scene layer system (media/text/effect/caption), 10 vibe modes (one-tap color filters with canvas-generated gradients), 12 text animations (typewriter, fade, bounce, glitch, neon, etc.), beat react system (9 modes with BPM snap), Zone Out mode (full-screen immersive playback), viewport modes (16:9/9:16/4:3/1:1), standard/moving display toggle (pan animation), PNG export via `html-to-image`, scene duplication, auto-save to localStorage, keyboard shortcuts, audio with volume/loop/BPM, project import for scene assets. **Studio Canvas**: infinite pan/zoom mind-map canvas with 6 node types (idea/character/scene/theme/beat/reference), SVG connections, sticky notes, reference image board, freehand drawing/annotation layer (`client/src/components/hop/HopStudioCanvas.tsx`). **Waveform Timeline**: Web Audio API waveform visualization, peak-analysis beat detection, per-scene start/end times with snap-to-beat/fill sync modes, playhead scrubbing (`client/src/components/hop/HopWaveformTimeline.tsx`). **Full Export Pipeline**: video export (MediaRecorder WebM), image exports (cover art/poster/story card in multiple aspect ratios), QR code generation, tier-based watermark, auto-generated social copy with hashtags and platform links, export metadata (`client/src/components/hop/HopExportPanel.tsx`). **Scene Templates**: 10 presets (cinematic opener, action sequence, dialogue beat, musical climax, cool down, CYOA branch, montage, dream sequence, horror reveal, title card) with pre-configured duration/mood/camera/lighting/transition/sound pack. **Enhanced Scene Fields**: mood, camera angle, lighting, location, lyrics/narration segment, sound pack, sync mode per scene. **Sound Packs**: 10 ambient/SFX/mood packs with free/premium tiers. **Director/Producer Badges**: auto-awarded on save (5+ scenes = Director, music sync = Producer) via `POST /api/hop/check-badges`. **View Modes**: Builder (scene editor) / Canvas (mind map) / Timeline (waveform) toggle. Route: `/creator/hop?id=<projectId>`.

### Publishing & Community
Projects progress through draft, review, and publication stages. A Creator Marketplace allows for browsing, filtering, and selling projects or asset packs with content ratings and student filtering. A Community Library provides a multi-format browse page with type filter tabs (All, Comics, Novels, CYOA, Cards, HOPs), search, sorting, and dedicated viewers: comic reader, VN dialogue reader (keyboard + touch), CYOA branching player with back/restart, card collection viewer with stats, HOP slideshow player with progress bars and play/pause. Type-colored badges distinguish content. Bookmarking and view tracking. A Comic Series System groups comics into chapters with auto-numbering and subscriptions. A Print Studio provides a creation-to-print pipeline with an export dashboard and print quote requests. Demo content seeded via `/api/admin/seed-demo-content` (admin only) creates a full 10-page comic, 13-node CYOA, 10-scene VN, 5-card TCG deck, and 12-scene 90s HOP.

### User Progression & Analytics
An XP and Account system includes Student (6-17) and Creator (18+) accounts with an XP system for scaled leveling based on verified active time and action-based rewards. A Certification System ties project-based certifications to output. Admin-only Platform Analytics Dashboard provides 50+ KPIs, and an internal Platform Event Tracking system records user actions. A Teacher Dashboard provides features for student rosters, assignments, and submissions. New user onboarding is action-driven, guiding users through initial project creation and celebrating XP gains. **OnboardingWizard** (`client/src/components/OnboardingWizard.tsx`): 6 creator types (comic, vn, cyoa, card, motion, hop) with 3 quick-start modes (Blank/Template/AI). Glass morphism design with animated backgrounds. AI mode navigates to Story Forge (`/tools/story`). **Creator Flow Bar**: persistent "Create → Enhance → Publish" 3-step indicator on Dashboard, highlighting current stage based on user's projects. **Example/Remix Showcase**: "See What's Possible" section on Dashboard with 4 pre-built template examples (comic, CYOA, VN, card) that create real projects with template data via "Remix This" buttons. **FirstProjectGuide** (`client/src/components/FirstProjectGuide.tsx`): contextual step-by-step tutorial overlay per editor type (comic, vn, cyoa, card, motion, hop) with 3 guided steps each, minimizable floating panel, progress tracking via localStorage.

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
- `helmet` (CSP, security headers)
- `express-rate-limit` (global: 200/min, auth: 10/15min, AI: 10/min)
- Session cookies: httpOnly, secure in production, sameSite lax, 7-day expiry
- Stripe webhook signature validation
- Sensitive credentials stored as encrypted Replit Secrets (ADMIN_PASSWORD, EMERGENT_WEBHOOK_SECRET, FX_STUDIO_API_KEY)

### Code Quality
- TypeScript strict mode with zero errors (`npm run check`)
- Route-level lazy loading via React.lazy for all 60+ pages (except Dashboard, AuthPage, LandingPage)
- Vendor code splitting: recharts/d3, jspdf, radix, tanstack-query in separate chunks (React stays in entry to preserve initialization order)
- Service worker disabled (unregistered on load) after stale-cache production incident; can re-enable later with proper versioning
- Duplicate backend methods consolidated (follow/unfollow/isFollowing)
- Schema types reconciled between frontend, backend, and shared models
- CI pipeline script: `scripts/ci.sh` (npm ci → typecheck → build → test)
- Environment variable validation at server startup (`server/envValidation.ts`)
- Payment transaction audit logging (`server/paymentAudit.ts`)

### Partner Integration API
- `GET /api/v1/integration/health` — health check
- `GET /api/v1/integration/projects/:id` — fetch project data
- `GET /api/v1/integration/projects/:id/export` — export project bundle
- `POST /api/v1/integration/assets/import` — import external assets
- `POST /api/v1/integration/webhook/test` — test webhook delivery
- `POST /api/v1/integration/render-handoff` — render pipeline handoff (Reallusion/Unreal)
- Auth via `X-API-Key` header or Bearer token, timing-safe comparison

### MADMIXEDMEDIA Creative Workforce Ecosystem
Three-platform connected creative education + publishing + workforce operating system:
- **CoMiXX (this app):** Creator studio, XP engine, Skill Passport, project publishing
- **Press Start LMS (pressstart.tech):** Learning pathways, lessons, certifications
- **Press Start Streaming (psstreaming.com):** Content distribution, creator channels, school stations

**Ecosystem Tables:** `xp_events`, `xp_balances`, `skill_tags`, `competencies`, `passport_entries`, `external_tools`, `external_submissions`, `role_eligibility_rules`, `apprenticeship_tracks`, `apprenticeship_applications`, `production_roles`, `mentor_reviews`, `bug_reports`, `creator_channels`, `school_stations`, `pathways`, `user_pathway_progress`, `sync_queue`, `sync_logs`, `sso_audit_log`, `school_safe_policies`, `districts`, `classrooms`, `classroom_memberships`, `policy_audit_log`, `workforce_signals`, `workforce_profiles`, `workforce_endorsements`, `xp_ingestion_rules`, `xp_ingestion_log`, `launch_tickets`

**Ecosystem API Routes (`/api/ecosystem/`):**
- XP: `POST /xp/event`, `GET /xp/breakdown`, `GET /xp/events`
- Passport: `GET /passport/:userId?`, `POST /passport/entry`
- Roles: `GET /roles/eligibility`, `GET /roles/rules`, `PUT /roles/rules/:id`
- Apprenticeships: `GET /apprenticeships/tracks`, `POST /apprenticeships/tracks`, `GET /apprenticeships/applications`, `POST /apprenticeships/apply`, `PUT /apprenticeships/applications/:id/review`
- External Tools: `GET /external-tools`, `POST /external-tools`, `GET /external-submissions`, `POST /external-submissions`, `PUT /external-submissions/:id/review`
- Bug Reports: `GET /bug-reports`, `POST /bug-reports`, `PUT /bug-reports/:id`
- Pathways: `GET /pathways`, `POST /pathways/:id/enroll`
- Cross-platform Ingest: `POST /ingest/xp`, `POST /ingest/passport-entry` (JWT auth via ECOSYSTEM_JWT_SECRET)
- Cross-platform Sync: `POST /api/ecosystem/sync` (queue-based with exponential backoff retries)
- Sync Status: `GET /api/sync/status`, `GET /api/sync/history`, `POST /api/sync/retry/:id`
- Admin Sync: `GET /api/admin/sync/dashboard`, `GET /api/admin/sync/health`, `GET /api/admin/sso/audit`

**Sync Engine (`server/syncEngine.ts`):** Queue-based cross-platform sync with exponential backoff (2s base, 5min max), 5 retries, stale recovery, worker loop (10s interval). Functions: `enqueueSyncEvent()`, `startSyncWorker()`, `getSyncStatus()`, `getSyncHistory()`, `retrySyncEvent()`, `getSyncHealthMetrics()`, `logSSOAudit()`, `getSSOHealthMetrics()`.

**SSO Hardening (`server/sso.ts`):** JWT tokens include `aud: "madmixedmedia-ecosystem"`, `jti`, `nbf` claims. Structured error responses with request IDs and elapsed timing. All SSO attempts audit-logged to `sso_audit_log` table. Error codes: TOKEN_MISSING, TOKEN_MALFORMED, TOKEN_SIGNATURE_INVALID, TOKEN_EXPIRED, TOKEN_NOT_YET_VALID, TOKEN_ISSUER_INVALID, TOKEN_AUDIENCE_INVALID, USER_NOT_FOUND, SESSION_ERROR, INTERNAL_ERROR.

**Frontend Sync Components:** `SyncStatusIndicator` in Layout header (real-time sync status with retry controls), Sync Health tab and SSO Audit tab in EcosystemAdmin.

**XP Engine (`server/xpEngine.ts`):** Event-based XP with deduplication, cooldown, source/tool tagging, balance rollup, role eligibility checks.

**Ecosystem User Fields:** `ecosystemRole` (learner→lead), `conductScore`, `reliabilityScore`, `mentorId`

**Frontend Pages:** SkillPassportPage (with Workforce tab), ApprenticeshipPage, ExternalToolSubmissions, EcosystemPathways, EcosystemAdmin, SchoolSafeAdmin (`/admin/school-safe`)

**Phase 1 Engines:**
- **School-Safe Policy Engine** (`server/schoolSafeEngine.ts`): District→school→classroom→user cascade policy resolution. Controls messaging, content categories, marketplace, publishing, profile visibility, remix/collab, moderation, external contact.
- **Workforce Pipeline** (`server/workforceEngine.ts`): Signal recording, tier recomputation (exploring→professional), skill passport, endorsements. APIs: `/api/workforce/profile`, `/api/workforce/passport`, `/api/workforce/signal`, `/api/workforce/endorse`.
- **XP Ingestion Rules Engine** (`server/xpIngestionEngine.ts`): Rules-based external XP processing with deduplication, cooldown, hold/deny/translate/award actions. Seed defaults at startup. Unified `/api/ecosystem/ingest/xp` route.
- **App Handoff Flows** (`useHandoff.ts` hook): Secure launch tickets for CoMiXX↔FX Studio, CoMiXX→Streaming, LMS→CoMiXX. `POST /api/handoff/prepare` + `POST /api/handoff/consume`.
- **Ecosystem Navigation** (`EcosystemNav.tsx`): Hub/CoMiXX/FX/Streaming/LMS bar with SSO-aware navigation, desktop hub mode detection.

**XP Hooks:** HopCreator fires XP events on project create, save, export, and publish.

### Documentation
- `docs/PRODUCTION_READINESS.md` — checklist for production deployment
- `docs/DEPLOYMENT_GUIDE.md` — step-by-step deployment + school/district guide
- `docs/API_INTEGRATION.md` — partner API reference with examples
- `docs/PAYMENT_FLOW.md` — payment system documentation + audit trail
- `ECOSYSTEM_INTEGRATION.md` — cross-platform API reference for LMS and Streaming

### UI/Utility Libraries
- `react`, `typescript`, `vite`, `wouter`, `tailwindcss`

### Font Resources
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)

### Mobile App (Capacitor)
- **Capacitor v8** configured for iOS and Android native wrapper
- Bundle ID: `com.pscomixx.creator`
- App Name: `Press Start CoMiXX`
- Web dir: `dist/public`
- Plugins: SplashScreen, StatusBar, Keyboard, Haptics, Share, Filesystem
- **Platform detection** (`client/src/lib/platform.ts`): `isNativeApp()`, `shouldBlockDirectPayments()`, `getPlatform()`
- **Payment compliance**: Pricing page shows read-only plan info in native apps (no direct Stripe checkout). Users manage subscriptions via website. UpgradeModal says "View Plans" instead of "Upgrade Now"
- **Safe area handling**: CSS utilities for all four insets (`safe-area-top`, `safe-area-bottom`, `safe-area-x`, `native-top-offset`, `native-bottom-offset`). Mobile header and bottom nav use safe area classes
- **Legal links in mobile drawer**: Privacy Policy, Terms of Service, Settings & Account, Support & Contact accessible from mobile hamburger menu
- **Splash screen**: Native-feel loading with animated dots and branding, safe-area-aware padding
- Build commands: `npm run build && npx cap sync ios/android`, `npx cap open ios/android`
- iOS/Android project dirs not generated yet (need Xcode/Android Studio)

### Other Integrations
- **Resend:** Transactional emails.
- **Stripe:** Payment processing (Stripe Checkout). Uses Replit Connector with env var fallback (`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`). Admin endpoint `POST /api/admin/seed-stripe-products` creates subscription products/prices. Product-to-tier mapping uses metadata `tier` key or product name matching.
- **Mad Mixed Media:** Streaming platform for content and creator profile synchronization.
- **Ecosystem Integration Points:** `pscomixx.com`, `comixx.website`, `www.pscomixx.online`, `psstreaming.online`.