# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a responsive web application designed as an AI-assisted creative studio. It enables users to generate comics, trading cards, visual novels, CYOA stories, cover art, and motion comics, integrating drawing tools and project management features. The platform serves as the content creation hub for the broader PSCoMiXX ecosystem, fostering a creator-first environment focused on discoverability, marketplace optimization, and scalability for publishing, monetization, and community interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, Vite, and Wouter for routing. Styling utilizes TailwindCSS v4, custom design tokens, Radix UI primitives, and shadcn/ui components, adhering to a brutalist aesthetic with hard shadows, a dark theme, and neon accents. State management employs TanStack Query for server state and React Context for authentication. The design prioritizes component composition, path aliases, separation of concerns, and mobile responsiveness with specific mobile navigation elements.

### Backend
An Express.js server, built with Node.js, handles API requests. Authentication is session-based via Passport.js with a local strategy and scrypt hashing. The API provides RESTful endpoints with middleware for authentication, role-based authorization, and rate limiting.

### Security
Security measures include rate limiting, Helmet.js for security headers, strong password policies, secure session management, COPPA/FERPA compliance, and content safety features like student account filtering and prompt sanitization. AI resilience is ensured with retries and graceful error handling. Audit logging tracks critical actions, and SSO infrastructure is supported.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed using Drizzle ORM for type-safe operations. The schema supports users, polymorphic projects, assets, versions, and audit logs, leveraging JSONB for flexible data and UUID primary keys. Drizzle Kit manages database migrations.

### Subscription & Usage Tracking
The platform supports Free, Creator, Pro, Studio, and Lifetime tiers, each with specific limits on AI generations, exports, projects, and storage. Usage is tracked and enforced server-side, with frontend feature gates prompting upgrades.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages, adhering to the PS Content Bundle v1 format. The pipeline handles validation, bundling, saving, and syncing to the Emergent streaming platform, with version tracking and an admin review queue.

### XP & Account System
Two account types exist: Student (6-17) and Creator (18+), with students having restricted monetization. An XP system uses scaled leveling, earned through time-based heartbeats and action-based rewards.

### PSLMS Integration
Integration with Press Start LMS allows students to submit creations to portfolios and enables PSLMS to fetch student comics via API using a shared secret API key and email-based user matching.

### UI/UX Design
The UI/UX employs a brutalist aesthetic with a dark theme, neon accents, card-style containers, and gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and PWA installation options.

### Project Persistence & Navigation
Creator tools implement smart project resumption, redirecting to the most recently updated project of a specific type. Server-side deduplication prevents duplicate project creation, with a `forceNew: true` bypass. Auto-save-on-unmount functionality uses `navigator.sendBeacon` and `beforeunload` handlers, merging data fields to prevent loss. A `projectConfirmedRef` guard prevents autosave before project existence is confirmed. Invalid project IDs in URLs trigger redirection to find/create a valid project.

### My Library (Private)
A private workspace displays all user projects with filtering and search capabilities, showing key project information and using loading skeletons.

### Portfolio Website (Public-Facing)
Each user has an editable public portfolio website to display published works and artworks, accessible without authentication.

### Comic Creator
Supports direct drawing within panels, a dedicated toolbar, CSS filters, advanced text formatting, auto-save, a 50-level undo/redo system, and offline saving with IndexedDB. Export options include PNG, print-ready PDF, and JSON project data.

### Cover Editor (Integrated into Comic Creator Right Sidebar)
Cover editing is integrated directly into ComicCreator's right sidebar — no full-screen overlay or standalone route. Panels can be designated as "Front Cover" or "Back Cover" via buttons in the layers panel. When a cover-designated panel is selected, the right sidebar shows `CoverPropertiesPanel.tsx` with Content/Style/Images tabs containing all cover editing controls (title, author, ISBN, price, text effects/arch, templates, color themes, text layers, image layers, AI generation, filters, FX Studio effects, bold/italic/uppercase toggles for title/subtitle/author/back blurb, and banner text with inline color picker). Cover content (background images, title, author, text/image layers) renders directly on the designated panel in the canvas via `TransformableElement` wrappers — all master cover elements (banner, publisher, issue#, title, subtitle, tagline, author, price box, ISBN, back-publisher) are individually transformable (drag, resize, rotate) with transforms persisted in `coverDesignData` (keys: `titleTransform`, `subtitleTransform`, `authorTransform`, `bannerTransform`, `priceBoxTransform`, `issueNumberTransform`, `publisherTransform`, `taglineTransform`, `isbnTransform`, `backPublisherTransform`, `backTitleTransform`, `backAuthorTransform`, `backBlurbTransform`). Default transforms are defined in `defaultCover` and all TransformableElement fallbacks reference `defaultCover` as the single source of truth — clearing elements preserves their transforms for re-use. The `CoverEditorPanel.tsx` exports shared types/constants (`CoverData`, `defaultCover`, `FONT_OPTIONS`, `GENRE_TEMPLATES`, `COVER_TEMPLATES`, `FILTER_PRESETS`, `TextLayer`, `ImageLayer`). `ImageLayer` supports optional `blendMode` for FX overlays. Cover design data is stored in `project.data.coverDesign` and autosaved alongside spreads. Panel interface has `coverRole?: "front-cover" | "back-cover"` field. Quick Preview modal renders cover design on both dedicated front/back cover pages and on spread panels with coverRole. Export (PNG/PDF) includes cover rendering with all text elements, backgrounds, and styling. A `canvasCapture.ts` utility handles html2canvas calls with an `onclone` sanitizer for modern CSS colors. All cover elements appear in the layers panel as selectable items when a cover panel is active — grouped into Cover Elements, Image Layers, and Text Layers with click-to-select highlighting. Classic comic book cover features include: price box shape options (rectangle/circle/diamond) with custom colors, issue date field, barcode visual rendering for ISBN on back covers (toggleable via showBarcode), and banner background color inline picker.

### Card Creator
Supports TCG and Sports modes with specific card types and fields. Sports mode includes 16 sports, various templates, team-level settings, and a Pack Builder with a 3-column roster grid preview and a "Print Team Sheet" export.

### Print Studio (CoMiXX Print & Merch)
A creation-to-print pipeline module with a landing page, an export dashboard for asset type selection and print-ready settings, a print quote request form, and package offerings for different audiences. Database support (`print_quote_requests`) and API endpoints (`/api/print-quotes`) are included.

### Creator Marketplace
A public storefront for browsing, searching, and filtering content. Creators can list projects or asset packs for free or sale (via Stripe Checkout), with content rating and student filtering. Purchased asset packs can be imported.

### Marketplace Reviews
A `marketplace_reviews` table stores ratings and review text, with a "verified purchase" flag. API endpoints facilitate review submission and retrieval, and the UI displays reviews on listing pages. Analytics are tracked in `creator_analytics`.

### Community Library
A Webtoons-style browse page with search, sorting, and a comic reader for vertical scrolling. It lists only approved and published comics, allows users to "like" comics, add comments (threaded replies), track views, and bookmark comics with reading progress. Series management and a follower system are integrated. Thumbnail auto-generation is available, and a "Preview as Reader" option in ComicCreator allows pre-publication viewing.

### Motion Studio
Supports video/GIF export with progress tracking, using a Web Worker for GIF encoding. Features drawing layers, selection tools, shape tools, fill tool, eyedropper, audio clip integration with a timeline, throttled canvas drawing, and a virtualized frame list.

### Platform Analytics Dashboard
An admin-only analytics dashboard at `/analytics` provides 40+ KPIs across 7 tabs: Overview, Growth, Engagement, Content, Revenue, AI & Platform, and User Health. The API endpoint (`GET /api/analytics/platform`) aggregates data from users, projects, subscriptions, revenue events, marketplace listings, engagement events, and usage tracking tables. Charts use recharts. KPIs include DAU/MAU ratio, retention, activation rate, content velocity, cross-tool adoption, ARPU, AI adoption rate, and more. Future-thinking KPI descriptions are included for metrics not yet tracked. Accessible via the Admin Dashboard's "Platform Analytics" button.

### FX Studio Integration
Integrates with FX Studio (pressplays.site) to browse, import, and apply visual effects. Available in Motion Studio for frames and in Cover Editor (CoverPropertiesPanel Images tab) for applying FX overlays to front/back covers. FX layers are added as ImageLayers with `blendMode: "screen"` at 70% opacity. Users can paste FX image URLs or upload FX images directly. The Dashboard "Tools & Utilities" section links directly to FX Studio (replaced former Asset Builder). The Asset Builder route (`/tools/assets`) has been removed.

### PWA & Offline Mode
Includes a Service Worker (v6) for app shell, font, and asset caching, with version-based invalidation and dynamic cache limits. Projects are saved locally using IndexedDB for offline use, with timestamp-based conflict resolution and background syncing. UI components provide install prompts, network status notifications, and update prompts. iOS PWA support is included.

### Accessibility
Features keyboard shortcuts, a skip-to-content link, Aria labels, a high-contrast mode, and respect for `prefers-reduced-motion`. A global `ErrorBoundary` handles page crashes.

### Mobile Responsiveness
Designed for mobile with a top header, hamburger menu, bottom navigation bar, and slide-in drawer. Creator tools display desktop-recommended banners. Public pages are fully responsive and touch-friendly.

### SEO
Includes `robots.txt`, a dynamic `sitemap.xml`, Open Graph (OG) image endpoints, and full SEO meta tags with JSON-LD structured data.

### Landing Page (Go-to-Market)
A full marketing landing page at `/landing` and `/welcome` featuring a glitch-effect hero, feature showcase, audience sections, a "How It Works" flow, testimonials, pricing CTA, and legal links.

### New User Onboarding
An `OnboardingWizard` component guides new users through a 3-step flow (Welcome → Pick Your Tools → Quick Tips → Dashboard) on their first login, stored per-user via `localStorage`.

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