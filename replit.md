# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a desktop application designed for comprehensive content creation, including comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. It offers an AI-assisted creative studio with drawing tools and project management, serving as a core part of the broader PSCoMiXX ecosystem for publishing, monetization, and community interaction. The project aims to be a discoverable, marketplace-optimized, and scalable platform, fostering a creator-first environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript, Vite, Wouter.
- **Styling:** TailwindCSS v4 with custom design tokens, Radix UI primitives, shadcn/ui components ("new-york" style). Brutalist aesthetic with hard shadows, dark theme, and neon accents.
- **State Management:** TanStack Query for server state, React Context for authentication.
- **Design Patterns:** Component composition (class-variance-authority), path aliases, separation of concerns.
- **Mobile Companion:** Consistent brutalist aesthetic, dark theme, neon accents, shared component design, and core features like card builder, social media hub, real-time collaboration, and content viewers.

### Backend
- **Server:** Express.js with TypeScript, Node.js `http` module.
- **Authentication:** Session-based with Passport.js (local strategy, scrypt hashing, `express-session` with MemoryStore).
- **API:** RESTful endpoints (`/api`), middleware for authentication and role-based authorization (creator, admin).
- **Key Decisions:** Session cookies for authentication, middleware for route protection.

### Data Storage
- **Database:** PostgreSQL via Neon serverless, Drizzle ORM for type-safe operations.
- **Schema:** `users`, `projects` (polymorphic), `assets`, `project_versions`, `publish_jobs`, `engagement_events`. Uses JSONB for flexible project data, UUID primary keys, cascade deletes.
- **Migrations:** Drizzle Kit.

### Content Publishing Pipeline
- **Project Lifecycle:** draft → review → approved/rejected → published.
- **PS Content Bundle v1:** Standard Zod-validated format for all published content types, including creator metadata, payload, assets, visibility, tags, and age rating.
- **Pipeline Steps:** validate → bundle → save → sync (Emergent platform).
- **Emergent Streaming Integration:** Real API sync to `gamexclub.preview.emergentagent.com` (will become `madmixedmedia.com`) for content and creator profile synchronization.
- **Version Tracking:** `project_versions` table snapshots project data at each publish.
- **Job Tracking:** `publish_jobs` table tracks pipeline status.
- **Engagement Events:** `engagement_events` table receives inbound analytics from Emergent streaming platform via webhook.
- **Admin Review Queue:** Page for approving/rejecting submitted projects.

### XP & Account System
- **Account Types:** Student (6-17) and Creator (18+), determined by date of birth. Students have restricted access to monetization features.
- **XP System:** Time-based progression (10 XP per minute of active use, 1000 XP per level), tracked via heartbeat.
- **XP Display:** Level badge and XP progress bar, along with account type badge.

### PSLMS Integration (Press Start LMS)
- **Purpose:** Allows students to send CoMiXX creations to their PSLMS portfolio and enables PSLMS to fetch student comics via API.
- **Authentication:** Shared secret via `PSLMS_API_KEY`.
- **User Matching:** Email-based matching.
- **"Send to Portfolio" Button:** Visible to student accounts, sends project data to PSLMS webhook.

### System Design Choices
- **UI/UX:** Brutalist aesthetic with hard shadows, dark theme (zinc-900/950), neon accent colors (cyan, magenta, yellow), card-style containers, gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono.
- **Sidebar:** Auto-hide navigation sidebar collapses to icon-only strip (48px), expands to full width (256px) on hover with smooth transition. Pin/unpin toggle to keep sidebar open. Layout adjusts main content padding dynamically.
- **Mobile Design:** Bottom tab bar navigation, consistent page headers, shared modal/dialog styling.
- **Future SEO & Marketplace:** Planned migration to Next.js (App Router) for SSR/SSG of marketing and marketplace pages, with a focus on comprehensive metadata and structured data.

### My Library (Private)
- **Library Page:** Private workspace displaying all user projects with status and type filters.
- **Project Cards:** Show thumbnail, type, status, and last-edited time.
- **Search:** Filter projects by title.

### Portfolio Website (Public-Facing)
- **Owner View:** Editable portfolio website for the logged-in user, showing published works and artworks.
- **Public View:** Shareable public page viewable by anyone, showing only published/approved work.
- **Profile Editing:** Hero section, bio, creator class, social links (owner-only).
- **Published Works Gallery:** Displays published/approved projects with type badges.
- **Artworks:** Manual portfolio artworks with CRUD functionality (owner-only).

### Comic Creator Panel Filters
- **CSS Filters:** Panels support visual filters (grayscale, sepia, vintage, etc.) applied via a right-click context menu, stored in the `filter` field of the Panel interface.
- **Panel Defaults:** New panels default to 3px black borders for professional comic look.
- **Text Formatting:** Bold, italic, alignment (left/center/right), uppercase toggle, line height, and letter spacing controls in Caption Properties panel.
- **Auto-Save:** Debounced 3-second auto-save functionality.

### Cover Creator
- **Transformable Master Text:** Title, subtitle, author, and back blurb are `TransformableElement` components with drag/resize/rotate. Transform states stored as `titleTransform`, `subtitleTransform`, `authorTransform`, `backBlurbTransform` in CoverData.
- **Text Layer Editing Panel:** Sidebar shows full editing controls for selected text layers: text content, font, color, fontSize, bold/italic/uppercase, text effect (none/comic/outline/3d/retro/glow/neon/fire/ice), stroke color/width, and text arch slider.
- **Text Arch:** `textArch` property on TextLayer (-100 to 100) renders arched text via SVG `<textPath>`.

### Card Creator
- **Card Modes:** TCG mode (trading card game) and Sports mode toggled via sidebar buttons.
- **TCG Mode:** Character, Weapon, Spell, Event, Location, Item types with ATK/DEF/Cost stats.
- **Sports Mode:** Player, Coach, MVP, Rookie, Team, All-Star, Legend, Captain types with sport-specific fields: Sport, Position, Jersey #, Season, Team Name, School/Org, Grade, Height, Weight, Stat Line, Awards.
- **Sports Support:** 16 sports with position lists (Baseball, Basketball, Football, Soccer, Hockey, Volleyball, Track & Field, Swimming, Tennis, Lacrosse, Wrestling, Softball, Cheerleading, Gymnastics, Cross Country, Other). Designed for schools and rec teams to create cards for their teams.
- **Sports Templates:** Baseball Classic, Basketball Court, Football Gridiron, Soccer Pitch, Hockey Ice, Varsity Classic, Retro Sports, Neon Athlete, Team Spirit, Rookie Card.
- **Sports Card Preview:** Photo-forward layout with jersey number badge, position/team overlay on image gradient, stat line and school info.
- **Name Arch:** `nameArch` property on CardData renders the card name with SVG arch. Slider control in style sidebar (-100 to 100).

### Creator Marketplace
- **Browse:** Public storefront with search, type filters, and pricing filters (All/Free/Paid) for various content.
- **Listing Detail:** Full listing view with hero image, price, description, tags, preview gallery, and buy/claim button.
- **Free Listings:** Creators can list content for free ($0). Free items use a "Get Free" flow that bypasses Stripe, creating a completed order directly via `/api/marketplace/claim-free`.
- **Paid Listings:** Minimum $0.99, uses Stripe Checkout for one-time purchases.
- **Asset Packs:** Creators can upload image asset packs directly (without needing a published project). Pack assets stored as data URLs in `downloadData` field. Users can import purchased/claimed asset packs into their personal Asset Library.
- **Sell Content:** Creators can list published/approved projects or upload asset packs for sale or free (students cannot sell). Two listing modes: "Published Project" or "Asset Pack".
- **Purchases & Sales:** Tabbed page showing purchase history (with "Import to Library" for asset packs) and a seller dashboard with earnings.
- **Stripe Integration:** Uses Stripe Checkout for paid purchases only.
- **Database Tables:** `marketplace_listings`, `marketplace_orders`.

### Portfolio Sharing
- **Share Modal:** Portfolio share button opens a dedicated modal with the shareable URL displayed, copy-to-clipboard functionality, and social sharing buttons (Twitter, Facebook, LinkedIn).
- **Public URL Pattern:** `/portfolio/{userId}` accessible without authentication.

### Motion Studio Audio
- **Audio Clips:** Upload audio files, stored as data URLs in project data.
- **AudioClip Interface:** Includes id, name, src, startFrame, durationFrames, volume, and muted.
- **Timeline Visualization:** Audio clips displayed as emerald-colored blocks in the audio track with faux waveform SVG.
- **Playback Sync:** Web Audio API decodes and plays audio synchronized with the frame timeline.
- **Controls:** Upload, mute/unmute, and volume controls.

### FX Studio Integration (pressplays.site)
- **Purpose:** Sync effects created in the FX Maker app into CoMiXX Motion Studio.
- **Server Proxy:** All FX Studio API calls routed through the server to secure API keys.
- **FX Browser Panel:** Floating panel in Motion Studio toolbar displaying effects from FX Studio with previews.
- **Import Functionality:** "Save to Library" imports effect preview as an asset; "Add to Frame" adds effect preview as an image layer.
- **Search:** Filter effects by name or type.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai (image.pollinations.ai) — free, no API key required.
- **AI Text Generation:** Pollinations.ai (text.pollinations.ai) — free, no API key required. Server-side proxy at `/api/ai/generate-text`.
- **Access Policy:** All AI features are free and open to all users. No subscription gating or paywall.

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
- ESBuild, PostCSS, Autoprefixer.

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono.

### Mad Mixed Media (Streaming) Integration
- **Streaming Webhooks:** Receives events from Mad Mixed Media streaming platform, forwards to PSLMS.
- **Authentication:** Shared `PSLMS_API_KEY` or `PSLMS_WEBHOOK_SECRET` for webhook security.
- **Auto-Publish on Approval:** Admin project approval auto-triggers the publish pipeline to sync content to Emergent streaming platform.

### Ecosystem Integration Points
- `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.