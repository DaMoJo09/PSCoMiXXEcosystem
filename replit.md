# PSCoMiXX Creator

## Overview

PSCoMiXX Creator is a comprehensive desktop application for creating comics, trading cards, visual novels, CYOA (Choose Your Own Adventure) stories, cover art, and motion comics. The application provides a full-featured creative studio with AI-assisted generation, drawing tools, and project management capabilities.

The system is designed as part of the PSCoMiXX ecosystem, integrating with companion platforms for publishing, monetization, and community engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TailwindCSS v4 with custom design tokens for styling

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui components following the "new-york" style variant
- Custom components organized by function (layout, tools, UI)
- Design system based on CSS variables for theming with hard shadows and brutalist aesthetics

**State Management:**
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state
- Local component state for UI interactions

**Key Design Patterns:**
- Component composition with slots and variants using class-variance-authority
- Path aliases for clean imports (@/, @shared/, @assets/)
- Separation of concerns: pages, components, hooks, contexts, and utilities

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- HTTP server creation using Node's native `http` module
- Session-based authentication with Passport.js

**Authentication & Authorization:**
- Local strategy authentication (email/password)
- Password hashing using Node's native scrypt
- Session management with express-session and MemoryStore
- Role-based access control (creator vs admin roles)

**API Design:**
- RESTful API endpoints under `/api` prefix
- Middleware for authentication (`isAuthenticated`) and authorization (`isAdmin`)
- CRUD operations for users, projects, and assets
- Structured error handling with proper HTTP status codes

**Key Design Decisions:**
- Session cookies for authentication (secure in production)
- Middleware-based route protection
- Server-side rendering fallback for SPA routing

### Data Storage

**Database:**
- PostgreSQL via Neon serverless
- Drizzle ORM for type-safe database operations
- WebSocket-based connection pooling for serverless environments

**Schema Design:**
- `users` table: Authentication and user profiles with role-based access
- `projects` table: Polymorphic storage for all creative work types (comic, card, vn, cyoa, cover, motion)
- `assets` table: Media file metadata with optional project association
- JSONB columns for flexible, type-specific project data
- UUID primary keys for all entities
- Cascade deletes for referential integrity

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Schema definitions in shared directory for client/server type sharing

**Rationale:**
- JSONB for project data allows each creative type to have custom fields without schema changes
- Polymorphic project table simplifies querying across all content types
- Neon serverless provides auto-scaling with WebSocket connections for better cold start performance

### External Dependencies

**AI Image Generation:**
- Pollinations.ai for AI-generated artwork
- Client-side integration with encoded prompts
- Random seed generation for variety

**Third-party Libraries:**
- `@neondatabase/serverless`: PostgreSQL client optimized for edge/serverless
- `drizzle-orm` & `drizzle-zod`: Database ORM with Zod schema validation
- `passport` & `passport-local`: Authentication middleware
- `date-fns`: Date formatting and manipulation
- `sonner`: Toast notifications
- `recharts`: Data visualization for admin analytics
- `embla-carousel-react`: Carousel/slider functionality
- `lucide-react`: Icon system

**Development Tools:**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- ESBuild for server bundling in production
- PostCSS with Autoprefixer for CSS processing

**Font Resources:**
- Google Fonts: Space Grotesk (display), Inter (sans-serif), JetBrains Mono (monospace)

**Ecosystem Integration Points:**
- Designed for future integration with:
  - `pscomixx.com`: Main brand website
  - `comixx.website`: Marketing/landing page
  - `pscomixx.online`: Web creator platform
  - `psstreaming.online`: Publishing and monetization platform
  - `pscomixx-6hljpllm.manus.space`: Reference implementation

**Build & Deployment:**
- Production build bundles both client (Vite) and server (ESBuild)
- Server dependencies selectively bundled to reduce syscalls
- Static file serving from dist/public
- Environment variable configuration for database and session secrets
- Vite plugin for OpenGraph image meta tag updates based on Replit domain

---

## PSCoMiXX Mobile Companion - Build Plan

### Design Consistency Requirements

The mobile version MUST maintain visual and interaction consistency with the desktop app:

**Visual Identity (Match Desktop Exactly):**
- Brutalist aesthetic with hard shadows (shadow-brutal class)
- Dark theme with zinc-900/950 backgrounds
- Neon accent colors: Cyan (#0ff), Magenta (#f0f), Yellow (#ff0)
- Card-style containers with thick borders (border-2, border-white/black)
- Gradient accents (bg-gradient-to-r from-cyan-500 to-purple-500)

**Typography (Same Fonts):**
- Space Grotesk for headings/display text
- Inter for body text and UI elements
- JetBrains Mono for code/stats

**UI Components (Shared Design System):**
- Reuse all shadcn/ui components with same styling
- Same button variants (default, outline, ghost)
- Same form inputs with consistent focus states
- Same toast notifications (sonner)
- Same icons (lucide-react)

**Navigation Patterns:**
- Bottom tab bar for mobile (mirrors desktop sidebar)
- Consistent page headers with back navigation
- Same modal/dialog styling
- Familiar iconography throughout

### Mobile Build Phases

#### Phase 1: Core Infrastructure & Authentication
- Mobile-optimized responsive layouts
- Same auth flow (login/register/password reset)
- Device token storage for push notifications
- Offline session caching
- Bottom tab navigation: Home | Create | Social | Profile

#### Phase 2: Card Builder & XP System Foundation
**Database Additions:**
- `card_templates` - Pre-designed card layouts
- `cards` - User cards with stats (attack, defense, speed, special)
- `xp_wallets` - User XP balance (synced desktop/mobile)
- `xp_events` - Activity log for XP earning

**XP Economy:**
| Activity | XP Earned |
|----------|-----------|
| Daily Login | +5 XP |
| Post Content | +10 XP |
| Get a Like | +2 XP |
| Collab Session | +25 XP |
| Win Card Battle | +50 XP |
| Complete VN/CYOA | +15 XP |

| Card Upgrade | XP Cost |
|--------------|---------|
| Stat +1 (Lvl 1-5) | 20 XP |
| Stat +1 (Lvl 6-10) | 50 XP |
| Stat +1 (Lvl 11+) | 100 XP |
| Unlock Special Ability | 200 XP |

**Features:**
- Touch-friendly card designer
- Template gallery
- Stat upgrade system
- Offline draft saving

#### Phase 3: Social Media Hub
**Database Additions:**
- `post_reactions` - Multiple reaction types (❤️ 🔥 😂 💎 🎨)
- `notifications` - Activity alerts

**Features:**
- Infinite scroll feed
- Quick post composer
- Comments & reactions
- Follow system
- Direct messages
- Push notifications

#### Phase 4: Real-time Collaboration
**Database Additions:**
- `collab_sessions` - Active collaboration rooms
- `collab_share_codes` - 6-character invite codes (e.g., "ABC123")
- `collab_presence` - Live cursor positions

**Features:**
- Share code generation & entry
- Live cursors showing collaborators
- Edit locking to prevent conflicts
- WebSocket real-time updates
- In-session chat
- Roles: Owner, Editor, Viewer

#### Phase 5: Card Games & Competitive Features
**Database Additions:**
- `card_decks` - Battle deck collections
- `card_matches` - Game history
- `leaderboards` - Global rankings

**Features:**
- Deck builder UI
- Quick match (random opponent)
- Friend battles (challenge system)
- Stat-based combat mechanics
- Win rewards (XP + rare drops)
- Weekly tournaments
- Global & friend leaderboards

#### Phase 6: VN/CYOA Viewer
**Database Additions:**
- `viewer_progress` - Reading position tracking
- `published_stories` - Public content library

**Features:**
- Browse published Visual Novels
- CYOA reader with choice tracking
- Save/resume progress
- Bookmarks & favorites
- Ratings & comments

#### Phase 7: Polish & Launch
- Performance optimization
- Offline content packs
- Tutorial & onboarding
- Dark/light mode toggle
- Accessibility improvements
- App store compliance