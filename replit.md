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
JWT-based Single Sign-On (SSO) is integrated across the PSCoMiXX ecosystem, with CoMiXX acting as the identity provider. The platform integrates with Press Start LMS for educational submissions and offers a robust export and publish pipeline for content bundling (PS Content Bundle v1), validation, and synchronization to the PSStreaming platform (psstreaming.com). Full bidirectional integration with FX Studio via `postMessage` for asset return and a dedicated `/fx-studio` route. **Target-aware FX protocol**: FX Studio postMessage now includes `target` context (cover, backCover, priceTag, panel) — when FX returns an asset it auto-applies to the selected element. `event.source` validation prevents cross-tab message injection. **Cross-App Asset Pipeline**: `SendToMenu` component (`client/src/components/ecosystem/SendToMenu.tsx`) provides "Send To" dropdown in creator pages (ComicCreator, HopCreator) targeting FX Studio, PS Streaming, Press Start LMS, and Asset Library via `useHandoff` hook (`client/src/hooks/useHandoff.ts`). **HOPs 3-Mode System**: Still/Pan/Video mode selector with mode-aware export filtering, Stitch Mode for panoramic world building (`client/src/components/hop/HopStitchMode.tsx`), Pan Player with parallax layers (`client/src/components/hop/HopPanPlayer.tsx`).

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

### Free-Form Portfolio
Each creator's Portfolio page (`client/src/pages/PortfolioPage.tsx`) is fully customizable so creators can express their own brand/feel. `users.portfolioTheme` (jsonb) holds preset, colors (accent/accent2/text/muted), background (solid/gradient/image/pattern with safe URL/hex regex), surface (color/border/radius/shadow), fonts (12-font roster, display+body), layout style (grid/magazine/reel/compact), heroStyle (split/centered/minimal), section visibility flags (showStats/showAbout/showSocial/showWorks/showArtworks), opt-in intro/featured block (`intro.enabled` + headline/body/imageUrl), and section ordering (`sections.order`). Customizer dialog (`client/src/components/portfolio/PortfolioCustomizer.tsx`) opens via the "CUSTOMIZE" button next to Edit/Share with 6 tabs: Presets/Colors/Fonts/Background/Layout/Sections. Theme helpers (`client/src/lib/portfolioTheme.ts`) provide 8 presets, 12 fonts, defaults, and CSS-var/background/surface helpers. Sections render in a flex column using CSS `order` based on `sectionOrder.indexOf(...)` — works/artworks split into separate galleries with helper components (`WorksHeader`/`EmptyGalleryCard`/`ProjectGallery`/`ArtworkGallery`). Public portfolio endpoint (`GET /api/portfolio/:userId/public`) returns the full theme + socialLinks + totalMinutes for parity with owner view. Server hardens user-controlled JSON via `sanitizePortfolioTheme()` in `server/routes.ts`: strict Zod schemas reject unknown keys, colors are regex-validated (hex/rgb/hsla), URLs must be `http(s)://...`, all enums whitelisted, numeric ranges clamped, text length capped (200/2000/2048), payload capped at 12KB (UTF-8 byte length), and `sections.order` normalized to a canonical permutation containing each of intro/about/works/artworks exactly once.

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
- Sensitive credentials stored as encrypted Replit Secrets (ADMIN_PASSWORD, PSSTREAMING_WEBHOOK_SECRET / legacy EMERGENT_WEBHOOK_SECRET, FX_STUDIO_API_KEY)

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
### App Store Readiness Progress (Apr 2026)
- **Batch A (shipped)**: Global footer with Terms/Privacy/Contact/Get Started links on all non-creator pages. First-time-visitor redirect to `/get-started` for new users (gated on onboarding completion + projects fetch success, key scoped per `user.id`). Export reminder banner in ComicCreator (shows after 24h since last export, dismissed per project, reset on project switch). All 4 export handlers (PNG single/all, PDF, JSON) call `markProjectExported()`.
- **Batch B (shipped)**: Crash telemetry — `window.error` + `unhandledrejection` handlers in App.tsx (throttled 5/min/source) post to `/api/client-error`; server endpoint logs via `console.error` (no blocking I/O), rate-limited 30/min, payloads truncated. Image upload pipeline hardening — shared `client/src/lib/imageValidation.ts` with HEIC detection (Safari OK, Chrome/Android shows "share as JPEG" guidance) and per-media caps (12MB image / 50MB video / 20MB audio). Refactored `ImageUpload`, `ComicCreator` thumbnail upload, and `AssetLibraryContext.importFromFile/importFromFiles` to use the shared validator.
- **Classic Comic Starter (shipped)**: New "Start Now" remix card on Dashboard (`handleClassicComicStarter` in `client/src/pages/Dashboard.tsx`) builds a 6-spread project — front cover spread, 3 story spreads, a full-spread vintage promo/ad page (auto-fetches a vintage platform template snapshot from `/api/promo/templates`), 1 more story spread, and a back-cover spread tagged `isLastPage`. Equivalent to ~11 reading-page mini-comic. Front/back cover panels carry `coverRole` so the cover editor opens automatically. Falls back to an empty promo spread if the template fetch fails — the user can pick one in-creator.
- **Vintage Promo Templates (shipped)**: Three new platform-type seed templates with mid-century comic-ad aesthetics (cream paper grain via inline SVG noise, fixed red/yellow palette, vintage display typography): `vintage-mail-order` (single hero illo + headline + body + mail-order coupon, "How to Hypnotize" style), `vintage-novelty` (yellow paper, two-column body, "Send No Money" CTA, X-Ray Spex style), `vintage-triple-feature` (three horizontal strips with cover-art slot + title + "ON SALE" badge per strip, Marvel monsters page style). `PromoPageRenderer` is now layout-aware — switches on `template.layoutStyle` between `ModernBody` (original) and the 3 vintage body components. The mandatory disclosure label and image allowlist still apply on top of every layout. Each seed ships with curated `images.unsplash.com` stock photos (allowlisted host) so users see a realistic populated ad on first open instead of empty illustration slots. Seed loop is now per-layoutStyle idempotent AND backfill-aware: on each boot it inserts new layoutStyles and refreshes empty image fields on platform-managed templates without overwriting any admin/creator edits.
- **Comic Creator UX (shipped)**: 1) Auto-fit zoom — `ComicCreator.tsx` now picks an initial zoom on mount (and on fullscreen / layers-panel toggle / spread type change between regular and promo) that fits the natural spread inside the available canvas viewport, fixing a "page spill" issue where pages overflowed the canvas on smaller screens. The user keeps control: any manual +/- click flips a `hasAutoFittedRef` ref so subsequent re-fits never override their pick, and clicking the % readout (now a button) bumps a `refitNonce` state to force one re-fit. Auto-fit clamps to [25, 100] so it only ever scales DOWN. 2) Spread flex container now uses `justify-center` so pages center horizontally even when smaller than the canvas. 3) Right-click → "Insert Promo / Vintage Ad…" menu item added to BOTH page context menus (gated on `promoPagesEnabled`), opening the Promo Page Studio without forcing the user back to the bottom toolbar. 4) Layers panel got page tabs (`Left Page (n) | Right Page (n)`) so users can see both pages' panel counts and switch between them in one click — fixes the "super long empty layers panel" on cover spreads where the active page only has one panel. When a page has 0 panels, the layers list now shows a centered empty-state card with a tip ("Press P and drag to add a panel") and a one-click jump-to-other-page link instead of dead space.
- **Promo Free-Form Layer (shipped)**: `PromoPageStudio.tsx` now lets creators add and free-transform unlimited text + image elements on top of any promo template — no more "fill these 4 fields" limitation. New `PromoElement` type + `freeElements?: PromoElement[]` on `PromoTemplateData`; all geometry stored as % of the page so it scales correctly across studio preview, comic-creator overview, and the export pipeline. `PromoPageRenderer` accepts an `editing` prop that suppresses its read-only `<FreeElementsLayer>` so the studio's interactive `<FreeFormCanvas>` renders the same elements with drag/resize/rotate handles. Editor supports: pointer-tracked drag (move) and 4-corner resize (resize-tl/tr/bl/br) with deltas converted from pixels to canvas %, top rotate handle that computes angle from element center, double-click text → contentEditable textarea (saves on blur, ESC cancels), Delete/Backspace to remove the selected element, and a side-panel `ElementPropertiesPanel` with font family/size/color/weight/italic/align for text and src/alt/fit for images plus precise X/Y/W/H/rotation inputs. Studio dialog widened to 95vw with a 3-column layout (gallery | big interactive canvas | side panel that toggles between the original "Layout" template fields and "Element" properties). Toolbar above the canvas: + Text, + From Assets (opens `<AssetBrowser>` which surfaces user library, built-in effects/bubbles, and FX Studio output — selecting any asset drops it as a free image element), bring forward / send backward / duplicate / delete. Layer ordering uses `moveLayer()` + `reindexZ()` to keep z-values contiguous and non-negative so the server normalizer never collapses layers. Server-side `sanitizePromoCustomData()` (re-used by both POST `/api/promo/projects/:projectId/instances` and PATCH `/api/promo/instances/:id`) validates each element with strict zod (kind whitelist, regex-validated hex color, bounded text/url/font lengths, finite numbers), clamps geometry, caps the array at 50 elements, and re-normalizes z by relative order (not per-element clamping) so save/reload always preserves the editor's layering. Image src goes through the existing `isPromoImageAllowed` allowlist at render time, and the read-only renderer paints "Image blocked" if a stale src no longer passes.
- **Promo Studio Look-and-Feel (shipped)**: `PromoPageStudio.tsx` now lets users fully customize the look of their promo pages without ever leaving the dialog. 1) **Image upload from device** — replaced the prior URL-only image fields with the project's standard `ImageUpload` component (drag-drop OR click; FileReader → data URL; goes through the shared HEIC-aware `validateImageFile` and the 12 MB image cap). The promo image-allowlist already accepts `data:` URIs, so uploaded images render inline with no backend storage and no host-allowlist worries. Hero image and Logo each get their own upload slot. The vintage-triple-feature layout shows three full strip editors instead — each with its own Title, Subtitle, Badge, and uploader. 2) **Vintage filter presets** — new `VINTAGE_FILTERS` map (Sepia, Black & White, Newsprint, Faded, Punchy Comic, Warm Comic, Cool Comic, Cyanotype, Noir Halftone) applied via CSS `filter:` to all images in the page through the `getPromoImageStyle(data)` helper. Wired into all 4 layout body components (`ModernBody`, `VintageMailOrderBody`, `VintageNoveltyBody`, `VintageTripleFeatureBody`). 3) **Image transform controls** — new sliders for Image Scale (25-250%) and Position X / Y (0-100%, mapped to `object-position` and `transform: scale()`), plus a "Reset look to defaults" link. 4) **Type extensions** — `PromoTemplateData` gained `imageFilter`, `imageScale`, `imagePositionX`, `imagePositionY`, and a typed `strips: PromoStrip[]` field; cleaned up the prior `as any` cast in `VintageTripleFeatureBody`. Server `templateJson` is `jsonb` so no schema migration was needed.
- **Promo Page Studio (shipped)**: School-safe in-comic promo/ad page system with 4 types — platform (first-party), sponsor (vetted partners), student (classroom media-literacy assignments), creator (self-promotion). New tables `promoTemplates` / `promoInstances` / `promoReviews` (`shared/schema.ts`); storage CRUD in `server/storage.ts` (incl. `listPromoTemplatesForUser` audience-filter and `getPromoInstance` for ownership checks); routes `/api/promo/*` in `server/routes.ts`; centralized `checkPromoTemplateAccess(req, t)` enforces fail-closed feature flag (`promo_pages_enabled` MUST be explicit `true`), separate `promo_sponsors_enabled` flag for sponsor type, and the student safety contract — students can only ever see/use templates that are `status=approved` AND `isSchoolSafe=true` AND non-sponsor type. PATCH/DELETE on instances verify project ownership. Frontend: `client/src/components/promo/PromoPageStudio.tsx` (gallery + editor + `PromoPageRenderer`); the mandatory disclosure label ("SPONSORED PAGE" / "STUDENT-CREATED PROMO" / "CREATOR PROMO") uses HARDCODED yellow-on-black colors that cannot be overridden by template/custom data, so no editor can hide it via accent recoloring. Image URLs in promo pages are restricted to a vetted host allowlist (own infra, R2/S3, Unsplash/Pexels) to block tracking-pixel-style requests. ComicCreator integration: `Spread` interface extended with `isPromoPage`/`promoTemplateId`/`promoTemplateSnapshot`/`promoCustomData`; "+ Promo Page" button gated by feature flag; promo render branch over the spread canvas; `exportPromoToCanvas()` helper using html2canvas + react-dom/client wired into all-PNG sync export and full-PDF export so promo pages print inline; JSON export auto-includes promo metadata via spreads serialization. Admin moderation in `AdminControlRoom.tsx` Promo Pages tab — pending-review queue, approve/reject (writes `promo_reviews`), school-safe toggle, preview dialog. Four platform seed templates created on startup. No third-party tracking pixels, no behavioral targeting.
- **Portfolio Free-Form Customization B1 (shipped)**: Each creator can now style their public Portfolio page to express their own brand. New `portfolioTheme` jsonb column on `users` (additive, non-destructive — added via direct SQL since drizzle-kit push hung on unrelated interactive prompt). Schema field added to `shared/schema.ts`; server allows the field through `PATCH /api/profile`, returns it from `GET /api/profile` and from the public `GET /api/portfolio/:userId/public` endpoint so visitors see the creator's styling. Theme contract lives in `client/src/lib/portfolioTheme.ts` — types, 8 presets (Cyber Noir / Vintage Pulp / Sunday Funnies / Indie Pastel / Brutalist Print / Noir Ink / Horror Vintage / Neon Arcade), 12 Google Font options with `ensureGoogleFonts()` injector, plus `mergeTheme`, `themeToCssVars`, `backgroundCss`, `surfaceCss`, `fontStack` helpers. UI: `client/src/components/portfolio/PortfolioCustomizer.tsx` is a 6-tab dialog (Presets / Colors / Fonts / Background / Layout / Sections) with color pickers, sliders, intro-block editor, and section show/hide + reorder. `PortfolioPage.tsx` rewired — outer wrapper applies CSS vars + theme background, hero supports `split`/`centered`/`minimal` styles using accent + display font, bio uses themed surface + accent left-border, sections render in `theme.sections.order` with show/hide gating, gallery split into separate Works (published projects) and Artworks (owner-only) sections each rendered via `ProjectGallery`/`ArtworkGallery` with 4 layout modes (`grid`/`magazine`/`reel`/`compact`). New owner-only "CUSTOMIZE" button next to Edit/Share opens the dialog. Add/edit artwork dialog hoisted to a standalone controlled `Dialog` (no longer inside the legacy gallery header). Public viewers automatically see the creator's saved theme; if no theme is set, a sensible "Cyber Noir" default matches the previous look so existing portfolios stay visually unchanged.
- **Batch C (later)**: Apple-friendly first-run flow (theme → 3 photos → 3 panels → bubble → export), App Store-safe copy, splash/icons.
- **Batch D**: Capacitor wrap + iOS/iPad test builds.
- **Batch E**: Lovable/FX side + handshake completion (CoMiXX side already wired).
- Out of scope for agent: App Store listing copy, screenshots, preview video, legal page actual text, App Store Connect submission.
