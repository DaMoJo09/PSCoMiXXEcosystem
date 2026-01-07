# PSCoMiXX Creator

## Overview
PSCoMiXX Creator is a desktop application designed for comprehensive content creation, including comics, trading cards, visual novels, CYOA stories, cover art, and motion comics. It offers an AI-assisted creative studio with drawing tools and project management, serving as a core part of the broader PSCoMiXX ecosystem for publishing, monetization, and community interaction. The project aims to be a discoverable, marketplace-optimized, and scalable platform, fostering a creator-first environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript, Vite for bundling, Wouter for routing.
- **Styling:** TailwindCSS v4 with custom design tokens, Radix UI primitives, shadcn/ui components ("new-york" style), brutalist aesthetic with hard shadows and dark theme.
- **State Management:** TanStack Query for server state, React Context for authentication.
- **Design Patterns:** Component composition (class-variance-authority), path aliases, separation of concerns.
- **Mobile Companion:** Will maintain visual and interaction consistency with desktop, including brutalist aesthetic, dark theme, neon accents, and shared component design. Features include core infrastructure, card builder, social media hub, real-time collaboration, card games, VN/CYOA viewer, and performance optimizations.

### Backend
- **Server:** Express.js with TypeScript, Node.js `http` module.
- **Authentication:** Session-based with Passport.js (local strategy, scrypt hashing, `express-session` with MemoryStore).
- **API:** RESTful endpoints (`/api`), middleware for authentication and authorization (role-based: creator, admin).
- **Key Decisions:** Session cookies for authentication, middleware for route protection, server-side rendering fallback.

### Data Storage
- **Database:** PostgreSQL via Neon serverless, Drizzle ORM for type-safe operations, WebSocket pooling.
- **Schema:** `users`, `projects` (polymorphic for various creative types), `assets`. Uses JSONB for flexible project data, UUID primary keys, cascade deletes.
- **Migrations:** Drizzle Kit.

### System Design Choices
- **UI/UX:** Brutalist aesthetic with hard shadows, dark theme (zinc-900/950), neon accent colors (cyan, magenta, yellow), card-style containers with thick borders, gradient accents. Typography uses Space Grotesk, Inter, and JetBrains Mono.
- **Mobile Design:** Bottom tab bar navigation, consistent page headers, shared modal/dialog styling, and iconography.
- **Future SEO & Marketplace:** Planned migration to Next.js (App Router) for SSR/SSG of marketing and marketplace pages. Focus on server-rendered HTML, internal linking, canonicalization, robots.txt, sitemap.xml, comprehensive metadata (title, meta description, OpenGraph, Twitter Cards), and structured data (JSON-LD). Marketplace will feature product listings with trust signals, friction reduction in checkout, and upsell strategies.

## External Dependencies

### AI Services
- **AI Image Generation:** Pollinations.ai.

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
- ESBuild, PostCSS, Autoprefixer, Replit-specific plugins.

### Font Resources
- Google Fonts: Space Grotesk, Inter, JetBrains Mono.

### Ecosystem Integration Points (Planned/Future)
- `pscomixx.com`, `comixx.website`, `pscomixx.online`, `psstreaming.online`.