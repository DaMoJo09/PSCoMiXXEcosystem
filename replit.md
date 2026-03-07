# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a desktop application providing an AI-assisted creative studio for generating comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. It integrates drawing tools and project management features, serving as the content creation hub for the broader PSCoMiXX ecosystem. The platform emphasizes discoverability, marketplace optimization, and scalability, aiming to foster a creator-first environment for publishing, monetization, and community interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The application utilizes React with TypeScript, Vite, and Wouter for routing. Styling is managed with TailwindCSS v4, custom design tokens, Radix UI primitives, and shadcn/ui components, adhering to a brutalist aesthetic featuring hard shadows, a dark theme, and neon accents. State management is handled by TanStack Query for server state and React Context for authentication. The design emphasizes component composition, path aliases, and separation of concerns. A mobile companion app shares this aesthetic and core features.

### Backend
An Express.js server built with Node.js handles API requests. Authentication is session-based using Passport.js with a local strategy and scrypt hashing, secured with `express-session`. The API provides RESTful endpoints with middleware for authentication and role-based authorization.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, accessed using Drizzle ORM for type-safe operations. The schema includes `users`, `projects` (polymorphic), `assets`, `project_versions`, `publish_jobs`, and `engagement_events`, leveraging JSONB for flexible project data and UUID primary keys. Drizzle Kit manages database migrations.

### Content Publishing Pipeline
Projects progress through draft, review, and publication stages. Content adheres to the PS Content Bundle v1, a Zod-validated format. The pipeline validates, bundles, saves, and syncs content to the Emergent streaming platform. Version tracking and job tracking are implemented, and an admin review queue manages project approvals.

### XP & Account System
The platform supports Student (6-17) and Creator (18+) account types, with students having restricted monetization access. An XP system tracks user progression based on active usage, displayed through level badges and progress bars.

### PSLMS Integration
Integration with Press Start LMS allows students to submit creations to their portfolios and enables PSLMS to fetch student comics via API, authenticated using a shared secret API key and user matching via email.

### System Design Choices
The UI/UX adopts a brutalist aesthetic with a dark theme (zinc-900/950), neon accents, card-style containers, and gradient accents. Typography includes Space Grotesk, Inter, and JetBrains Mono. A dynamic auto-hide sidebar provides navigation and includes a PWA install button for desktop installation. Future plans include migration to Next.js for improved SEO and marketplace capabilities.

### My Library (Private)
A private workspace displays all user projects with filtering and search capabilities. Project cards show key information like thumbnail, type, status, and last-edited time.

### Portfolio Website (Public-Facing)
Each user has an editable portfolio website for displaying published works and artworks. It includes profile editing options and a gallery of published projects, accessible publicly without authentication.

### Comic Creator Features
The comic creator supports direct drawing within panels with a dedicated toolbar, CSS filters for visual effects, and advanced text formatting options. Auto-save functionality is built-in.

### Cover Creator
The cover creator features transformable text elements (title, subtitle, author, back blurb, banner, price box, issue number) with extensive editing controls including text effects and arching. It integrates with the asset library for adding transformable image layers and supports print-ready export at 300 DPI.

### Card Creator
The card creator supports TCG and Sports modes, offering specific card types and fields for each. Sports mode includes 16 sports with various templates and stat fields. It features name arching and print-ready export at 300 DPI for both single cards and packs.

### Creator Marketplace
A public storefront allows browsing, searching, and filtering content. Creators can list published projects or asset packs for free or sale, with paid listings handled via Stripe Checkout. Users can import purchased asset packs into their library.

### Community Library
A Webtoons-style community library provides a browse page with search, sorting, and a comic reader for vertical scrolling. Only approved and published comics are listed, and users can like comics.

### Motion Studio Features
The motion studio supports video/GIF export in various formats and resolutions, with progress tracking. It includes drawing layers, selection tools, shape tools, a fill tool, and an eyedropper. Audio clips can be uploaded, played, and synchronized with the timeline.

### FX Studio Integration
Integration with FX Studio (pressplays.site) allows importing effects into the Motion Studio through a server-proxied API, enabling users to browse, import, and apply effects to their frames.

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