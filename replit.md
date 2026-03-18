# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application that functions as an AI-assisted creative studio. Its primary purpose is to empower users to generate various forms of digital content, including comics, trading cards, visual novels, choose-your-own-adventure stories, cover art, and motion comics. The platform integrates drawing tools and comprehensive project management features. It serves as the central content creation hub for the broader PSCoMiXX ecosystem, aiming to foster a creator-first environment through enhanced discoverability, optimized marketplace functionality, and scalable solutions for publishing, monetization, and community engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, Vite, and Wouter for routing. Styling leverages TailwindCSS v4, custom design tokens, Radix UI primitives, and shadcn/ui components, adhering to a brutalist aesthetic featuring hard shadows, a dark theme, and neon accents. State management is handled by TanStack Query for server state and React Context for authentication. Key design principles include component composition, path aliases, separation of concerns, and mobile responsiveness with dedicated navigation elements.

### Backend
The backend utilizes an Express.js server on Node.js. Authentication is session-based using Passport.js with a local strategy and scrypt hashing. The API provides RESTful endpoints, secured with middleware for authentication, role-based authorization, and rate limiting.

### Security
The platform implements robust security measures including rate limiting, Helmet.js for security headers, strong password policies, secure session management, COPPA/FERPA compliance, and content safety features like student account filtering and prompt sanitization. AI resilience is achieved through retries and graceful error handling. Audit logging tracks critical actions, and SSO infrastructure is supported.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed through Drizzle ORM for type-safe operations. The schema supports users, polymorphic projects, assets, versions, and audit logs, utilizing JSONB for flexible data and UUID primary keys. Drizzle Kit manages database migrations.

### Subscription & Usage Tracking
The platform supports Free, Creator, Pro, Studio, and Lifetime subscription tiers, each with defined limits on AI generations, exports, projects, and storage. Usage is tracked and enforced server-side, with frontend feature gates prompting upgrades.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages, conforming to the PS Content Bundle v1 format. The pipeline manages validation, bundling, saving, and synchronization with the Emergent streaming platform, incorporating version tracking and an admin review queue.

### XP & Account System
Two account types are supported: Student (6-17) and Creator (18+), with students having restricted monetization capabilities. An XP system employs scaled leveling, earned via time-based heartbeats and action-based rewards.

### PSLMS Integration
Integration with Press Start LMS allows students to submit creations to portfolios and enables PSLMS to fetch student comics via API using a shared secret key and email-based user matching.

### UI/UX Design
The UI/UX adopts a brutalist aesthetic with a dark theme, neon accents, card-style containers, and gradient accents. Typography includes Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and PWA installation options.

### Project Persistence & Navigation
Creator tools feature smart project resumption, redirecting users to their most recently updated project of a specific type. Server-side deduplication prevents duplicate project creation, with a `forceNew: true` bypass. Auto-save-on-unmount functionality uses `navigator.sendBeacon` and `beforeunload` handlers, merging data fields to prevent loss. Invalid project IDs in URLs redirect to a project discovery/creation flow.

### Creator Tools
The suite of creator tools includes:
- **Comic Creator:** Supports direct drawing, a dedicated toolbar, CSS filters, advanced text formatting, auto-save, a 50-level undo/redo system, and offline saving with IndexedDB. Export options include PNG, print-ready PDF, and JSON project data. The Cover Editor is integrated into the Comic Creator's right sidebar, allowing panels to be designated as front or back covers with extensive editing controls for text, images, and AI generation, rendering directly on the canvas.
- **Visual Novel Creator:** A full Ren'Py-inspired engine with scenes, characters, backgrounds, and dialogue editing. Features include ADV/NVL text modes, typewriter text, scene transitions, tint overlays, rollback (← key), character side portraits, Ren'Py quick menu bar (Back/Skip/Auto/Log/Hide/Mode/Full/Quit), music URL per scene with looping, scene labels, stage directions per dialogue line, a Script View tab with syntax-highlighted Ren'Py-style display, H key to hide textbox, fullscreen playtest mode, Ren'Py .rpy export, and dual export (JSON project + standalone playable HTML).
- **CYOA Builder:** An interactive fiction engine with story-to-CYOA generation, node editing, visual graph view, and a Script View with Ren'Py pseudocode. Features include a variables/flags system (`StoryVariable` with set/add/toggle operations), conditional choices (`ChoiceCondition` with ==, !=, >, <, >=, <= operators), `VarEffectEditor` and `ConditionEditor` components for authoring, runtime variable evaluation in preview with a debug panel, conditional choice hiding with "locked" count display (including all-locked messaging), node color coding, search/filter, stats bar with conditional choice count, "quick play from here," fullscreen preview with typewriter effect, ending tracker, path history replay for correct back-navigation variable state, and playable HTML export with full JS variables engine and conditional choice support.
- **Card Creator:** Supports TCG and Sports modes with specific card types, fields, and a Pack Builder.

### Print Studio (CoMiXX Print & Merch)
This module provides a creation-to-print pipeline with a landing page, an export dashboard for asset type selection and print-ready settings, a print quote request form, and package offerings. It includes database support (`print_quote_requests`) and API endpoints (`/api/print-quotes`).

### Creator Marketplace
A public storefront for browsing, searching, and filtering content. Creators can list projects or asset packs for free or sale via Stripe Checkout, with content rating and student filtering. Purchased asset packs can be imported.

### Marketplace Reviews
A `marketplace_reviews` table stores ratings and review text, including a "verified purchase" flag. API endpoints facilitate review submission and retrieval, and the UI displays reviews on listing pages.

### Community Library
A Webtoons-style browse page with search, sorting, and a comic reader for vertical scrolling. It lists approved and published comics, allows users to "like," comment (threaded replies), track views, and bookmark comics with reading progress. Series management and a follower system are integrated.

### Motion Studio
Supports video/GIF export with progress tracking, using a Web Worker for GIF encoding. Features drawing layers, selection tools, shape tools, fill tool, eyedropper, audio clip integration with a timeline, and a virtualized frame list.

### Platform Analytics Dashboard
An admin-only dashboard provides 40+ KPIs across 7 tabs: Overview, Growth, Engagement, Content, Revenue, AI & Platform, and User Health. The API endpoint (`GET /api/analytics/platform`) aggregates data from various sources, and charts use recharts.

### FX Studio Integration (Bidirectional Pipeline)
Integrates with FX Studio (pressplays.site) for bidirectional FX asset exchange across all creator tools. The `FxBrowserPanel` component provides a reusable FX browser with tag-based folder navigation (Overlays, Backgrounds, Characters, Pages, etc.), search, save-to-library, and context-specific import actions. Server-side proxy routes (`/api/fx-studio/effects`) handle CRUD operations against the FX Studio Supabase backend.

**Bidirectional Pipeline (Comic Creator):**
- **Export**: Right-click panel → "Send to FX Studio" captures panel as PNG, pushes via `pushTaggedAsset()` with `type: "comixx-panel-export"`, `source_panel_id`, and full metadata. Opens `pressplays.site/studio?import=<effectId>&returnTo=comixx` in new tab.
- **Import**: FX browser "Apply to Panel" inserts effects directly into selected panel; "Return to Panel" auto-targets the original panel from `source_panel_id` or metadata, navigating to correct spread and handling cover-aware insertion.
- **FX Returns**: Dedicated folder polls for `type: "panel-fx-return"` assets matching the current project, with 15s auto-refresh.
- **Tag Folders**: Hierarchical folder groups (Covers, Pages, Overlays, Art Assets, Branding) matching the shared PressPlays asset tag taxonomy, plus "My Project" and "FX Returns" project-scoped folders.
- **Shared API**: GET proxy forwards `asset_tag`, `project_id`, `type`, `search`, `limit`, `offset` params to Supabase. POST forwards `source_panel_id` and `type` fields.

**Integration Points:**
- **Comic Creator**: FX Studio tab in Asset Library dialog with Apply to Panel + Return to Panel actions, panel context menu "Send to FX Studio", sidebar shortcut to pressplays.site
- **Motion Studio**: Floating FX browser panel with per-frame effect application
- **Visual Novel Creator**: FX button in header; imports effects as scene backgrounds
- **CYOA Builder**: FX button in header; imports as node images (when node selected) or backgrounds (when no node selected), with target indicator and clear option
- **Card Creator**: FX button in header; imports effects as front/back card art based on active side

### PWA & Offline Mode
Includes a Service Worker (v6) for app shell, font, and asset caching, with version-based invalidation and dynamic cache limits. Projects are saved locally using IndexedDB for offline use, with timestamp-based conflict resolution and background syncing. UI components provide install prompts, network status, and update notifications. iOS PWA support is included.

### Accessibility
Features keyboard shortcuts, a skip-to-content link, Aria labels, a high-contrast mode, and respect for `prefers-reduced-motion`. A global `ErrorBoundary` handles page crashes.

### Mobile Responsiveness
The design is optimized for mobile with a top header, hamburger menu, bottom navigation bar, and slide-in drawer. Creator tools display desktop-recommended banners, and public pages are fully responsive.

### SEO
Includes `robots.txt`, a dynamic `sitemap.xml`, Open Graph (OG) image endpoints, and full SEO meta tags with JSON-LD structured data.

### Landing Page
A full marketing landing page at `/landing` and `/welcome` featuring a glitch-effect hero, feature showcase, audience sections, a "How It Works" flow, testimonials, pricing CTA, and legal links.

### New User Onboarding
An `OnboardingWizard` component guides new users through a 3-step flow (Welcome → Pick Your Tools → Quick Tips → Dashboard) on their first login, with progress stored per-user via `localStorage`.

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