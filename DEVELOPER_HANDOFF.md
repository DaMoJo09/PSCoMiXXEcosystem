# PSCoMiXX Creator - Developer Handoff Document

## Product Overview

**PSCoMiXX Creator** is a comprehensive creative studio platform for building comics, trading cards, visual novels, motion graphics, CYOA (Choose Your Own Adventure) stories, and cover art. The platform features AI-assisted content generation, professional drawing tools, and a full community ecosystem with monetization capabilities.

**Target Users:** Comic creators, visual storytellers, indie game developers, content creators

**Design Philosophy:** Noir/brutalist black-and-white aesthetic with hard shadows and bold typography

---

## Feature List by Module

### 1. Comic Creator
- **Dual-page spread editing** - Work on left/right pages simultaneously
- **30 panel templates** across 9 categories:
  - Basic (full page, half, thirds, quarters)
  - Grid layouts (2x2, 2x3, 3x2, 3x3, 4x4)
  - Action panels (diagonal, dynamic, splash)
  - Dialogue-focused (conversation, interview, drama)
  - Manga-style (right-to-left, speed lines)
  - Webtoon (vertical scroll)
  - Cinematic (letterbox, widescreen)
  - Creative (circular, overlapping)
  - Classic (golden age, sunday strip)
- **Freeform panel creation** - Draw custom panel shapes
- **Layer management** - Reorder, lock, show/hide layers per panel
- **Asset library integration** - 89 built-in assets:
  - 48 speech bubble styles
  - 41 action effect overlays (POW, BAM, CRASH, etc.)
- **Speech bubble text overlay** - Add custom text with font/size/color controls
- **Drawing tools** - Vector and raster drawing with brush sizes and colors
- **AI image generation** - Generate panel artwork via Pollinations.ai
- **Multi-format export** - PNG single page, all pages, or print-ready spreads
- **Real-time collaboration** - Cursor sharing, user presence, session management

### 2. Motion Studio (After Effects-style)
- **Multi-track timeline** - Video, audio, image layers
- **Keyframe animation** - Position, scale, rotation, opacity
- **Easing presets** - Linear, ease-in, ease-out, ease-in-out, bounce, elastic
- **Effects system**:
  - Blur, glow, shadow, sepia, invert, saturation
  - Blend modes (normal, multiply, screen, overlay, etc.)
- **Onion skinning** - Ghost frames for animation reference
- **Drawing on frames** - Vector/raster tools on each frame
- **Audio tracks** - Background music and sound effects
- **Storyboard import** - Convert comic panels to motion sequences
- **Playback controls** - Play, pause, scrub, loop
- **Export** - Video output (planned: MP4, GIF, WebM)

### 3. Trading Card Creator
- **Card templates** - Multiple frame designs
- **Stat blocks** - Attack, defense, cost, HP
- **Rarity system** - Common, uncommon, rare, epic, legendary
- **Evolution chains** - Link cards in progression
- **Front/back artwork** - Separate art for each side
- **Lore editor** - Card descriptions and flavor text
- **Batch export** - Export entire card sets
- **Battle simulator** - Test card gameplay (planned)

### 4. Visual Novel Creator
- **Scene graph** - Visual node-based scene flow
- **Character management** - Sprites, expressions, colors
- **Dialogue editor** - Speaker, text, character sprites
- **Choice branching** - Multiple choice options per scene
- **Background management** - Scene backgrounds
- **Voiceover timing** - Audio sync markers (planned)
- **Story Forge integration** - Import/export story structures

### 5. CYOA Creator
- **Node-based flowchart** - Drag-and-drop story nodes
- **Branching validation** - Check for dead ends
- **Ending tags** - Mark conclusion nodes
- **Auto-layout** - Organize node positions
- **Export formats** - Story Forge, Visual Novel, standalone
- **Coordinates system** - X/Y positioning per node

### 6. Cover Art Creator
- **Layout presets** - Front, back, spine templates
- **Typography tools** - Title, subtitle, author placement
- **Bleed/safe margins** - Print-ready guides
- **Foil/finish previews** - Special printing effects (planned)
- **AI text-to-cover** - Generate cover concepts
- **ISBN/barcode** - Back cover elements

### 7. Asset Library & Browser
- **Category filtering** - Sprites, backgrounds, characters, effects, bubbles
- **Search and tags** - Find assets quickly
- **Favorites** - Star frequently used assets
- **Upload pipeline** - Import custom images, videos, audio
- **Cross-tool linking** - Use same assets across all creators
- **AI asset generation** - Create new assets via prompts

### 8. AI Integration (Pollinations.ai)
- **Text-to-image generation** - Create artwork from prompts
- **Prompt templates** - Pre-built prompt starters
- **Random seed generation** - Variety in outputs
- **Style presets** - Comic, manga, realistic, etc.
- **Planned expansions**:
  - Text-to-motion (animate still images)
  - Dialogue generation
  - Story assistance

### 9. User System & Authentication
- **Email/password authentication** - Secure signup/login
- **User roles**:
  - Creator (default)
  - Admin (full platform access)
  - Extended roles: student, mentor, school_admin, hub_staff, pro_creator
- **Legal gate** - NDA, IP disclosure, user agreement acceptance
- **Session management** - Secure cookies
- **Profile settings** - Display name, bio, avatar
- **Password hashing** - Node.js scrypt

### 10. Community & Social Features
- **Social feed** - Share creations
- **User profiles** - Portfolio pages
- **Direct messaging** - Creator-to-creator chat
- **Collaboration hub** - Team projects
- **Events/exhibitions** - Community showcases
- **Notifications** - Activity alerts
- **Comments/reactions** - Engagement on posts
- **Blog/portfolio** - Personal showcase pages

### 11. Learning Module
- **Learning pathways** - Structured courses by topic:
  - Comics, animation, 3D, worldbuilding, writing, tools
- **Lessons** - Video + text content
- **Progress tracking** - Completion percentages
- **Challenges** - Hands-on exercises
- **XP rewards** - Gamified learning
- **Badges** - Achievement unlocks
- **Difficulty levels** - Beginner, intermediate, advanced

### 12. Monetization & Shop
- **Shop integration** - Sell creations
- **Shopping cart** - Add items for purchase
- **Orders** - Track purchases
- **Pricing** - Set prices for work
- **Availability toggles** - Mark items as for sale

### 13. Admin Dashboard
- **User management** - View/edit users
- **Content moderation** - Review flagged content
- **Analytics** - Platform statistics
- **Role assignment** - Promote users
- **System settings** - Platform configuration

### 14. Additional Tools
- **Prompt Factory** - AI prompt builder and templates
- **Story Forge** - Branching narrative exporter
- **Asset Builder** - Custom asset creation
- **Print-on-Demand** - Publishing integration (planned)

---

## Technical Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type-safe development |
| Vite 7 | Build tool & dev server |
| TailwindCSS v4 | Styling |
| Radix UI | Accessible component primitives |
| shadcn/ui | Pre-built component library |
| Wouter | Client-side routing |
| TanStack Query | Server state management |
| Framer Motion | Animations |
| Lucide React | Icon system |
| Canvas API | Drawing/rendering |
| Recharts | Data visualization |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server framework |
| TypeScript | Type-safe server code |
| Passport.js | Authentication |
| express-session | Session management |
| WebSocket (ws) | Real-time collaboration |
| Node.js scrypt | Password hashing |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| Neon Serverless | Hosted PostgreSQL |
| Drizzle ORM | Type-safe database queries |
| drizzle-zod | Schema validation |
| JSONB columns | Flexible project data storage |

### Build & Deployment
| Technology | Purpose |
|------------|---------|
| ESBuild | Server bundling |
| Vite | Client bundling |
| Replit | Hosting platform |
| PWA | Offline-capable web app |

---

## Database Schema

### Core Tables

#### `users`
```sql
id          VARCHAR PRIMARY KEY (UUID)
email       TEXT NOT NULL UNIQUE
password    TEXT NOT NULL (hashed)
name        TEXT NOT NULL
role        TEXT DEFAULT 'creator' (creator | admin)
ip_disclosure_accepted    TIMESTAMP
user_agreement_accepted   TIMESTAMP
created_at  TIMESTAMP
```

#### `projects`
```sql
id          VARCHAR PRIMARY KEY (UUID)
user_id     VARCHAR REFERENCES users(id)
title       TEXT NOT NULL
type        TEXT NOT NULL (comic | card | vn | cyoa | cover | motion)
status      TEXT DEFAULT 'draft' (draft | published)
data        JSONB NOT NULL (type-specific structure)
thumbnail   TEXT (URL)
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

#### `assets`
```sql
id          VARCHAR PRIMARY KEY (UUID)
user_id     VARCHAR REFERENCES users(id)
project_id  VARCHAR REFERENCES projects(id)
url         TEXT NOT NULL
type        TEXT NOT NULL (image | video | audio)
filename    TEXT NOT NULL
metadata    JSONB
created_at  TIMESTAMP
```

### Portfolio & Commerce Tables
- `portfolio_artworks` - Showcase finished work
- `artwork_categories` - Filtering categories
- `portfolio_events` - Exhibitions and events
- `blog_posts` - User blog content
- `contact_messages` - Contact form submissions
- `newsletter_subscribers` - Email list
- `artist_profiles` - Extended user profiles
- `favorites` - Saved artworks
- `cart_items` - Shopping cart
- `orders` - Purchase records

### Ecosystem Tables
- `creator_roles` - Role definitions
- `user_roles` - Role assignments
- `creator_xp` - Experience points
- `xp_transactions` - XP history
- `badges` - Achievement definitions
- `user_badges` - Earned badges

### Learning Tables
- `learning_pathways` - Course structures
- `lessons` - Individual lessons
- `lesson_progress` - User progress tracking

### Community Tables (Extended Schema)
- `schools` - Educational institutions
- `creator_teams` - Collaboration groups
- `team_members` - Team membership
- `social_posts` - Feed content
- `post_comments` - Engagement
- `direct_messages` - Private messaging
- `notifications` - Activity alerts
- `community_events` - Gatherings
- `event_registrations` - RSVPs

---

## Project Data Structures (JSONB)

### Comic Data
```typescript
{
  pages: [{
    id: string,
    panels: [{
      id: string,
      x: number, y: number,
      width: number, height: number,
      content: { type: 'image'|'video'|'drawing'|'text', data: any }
    }]
  }]
}
```

### Trading Card Data
```typescript
{
  name: string,
  type: string,
  rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary',
  stats: { attack?: number, defense?: number, cost?: number },
  frontImage?: string,
  backImage?: string,
  lore?: string,
  evolution?: { stage: number, nextCardId?: string }
}
```

### Visual Novel Data
```typescript
{
  scenes: [{
    id: string,
    title: string,
    background?: string,
    dialogue: [{ speaker?: string, text: string, characterSprite?: string }],
    choices?: [{ text: string, nextSceneId: string }]
  }],
  characters: [{
    id: string,
    name: string,
    color?: string,
    sprites: Record<string, string>
  }]
}
```

### CYOA Data
```typescript
{
  nodes: [{
    id: string,
    title: string,
    content: string,
    x: number, y: number,
    isEnding?: boolean,
    choices?: [{ text: string, targetNodeId: string }]
  }]
}
```

### Motion Data
```typescript
{
  timeline: {
    duration: number,
    tracks: [{
      id: string,
      type: 'video'|'audio',
      clips: [{
        id: string,
        assetUrl: string,
        startTime: number,
        duration: number
      }]
    }]
  },
  effects: [{ type: string, params: Record<string, any> }]
}
```

### Cover Data
```typescript
{
  front: {
    title: string,
    subtitle?: string,
    author?: string,
    heroImage?: string
  },
  back?: {
    synopsis?: string,
    isbn?: string,
    barcode?: string,
    qrLink?: string
  },
  spine?: { text: string }
}
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/user` | Get current user |
| POST | `/api/auth/admin-login` | Admin authentication |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| GET | `/api/projects?type=comic` | Filter by type |
| GET | `/api/projects/:id` | Get single project |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| PATCH | `/api/projects/:id/publish` | Publish project |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List user's assets |
| POST | `/api/assets` | Upload asset |
| DELETE | `/api/assets/:id` | Delete asset |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/image` | Generate AI image |
| GET | `/api/ai/prompts` | Get prompt templates |

### Collaboration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/collab/session` | Create collaboration session |
| WebSocket | `/ws` | Real-time events (cursors, edits) |

### Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/posts` | Social feed |
| POST | `/api/posts/:id/comment` | Add comment |
| GET/POST | `/api/messages` | Direct messages |
| GET | `/api/notifications` | User notifications |
| GET/POST | `/api/events` | Community events |

### Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pathways` | Learning pathways |
| GET | `/api/pathways/:id/lessons` | Pathway lessons |
| POST | `/api/lessons/:id/progress` | Update progress |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update user |
| GET | `/api/admin/analytics` | Platform stats |

---

## UI/UX Design System

### Color Palette
```css
--background: #000000 (pure black)
--foreground: #ffffff (pure white)
--accent: #ffffff (white on black)
--muted: #1a1a1a (dark gray)
--border: #333333 (medium gray)
```

### Typography
- **Display:** Space Grotesk (Google Fonts)
- **Body:** Inter (Google Fonts)
- **Monospace:** JetBrains Mono (Google Fonts)

### Design Principles
- Hard shadows (no soft shadows)
- High contrast black/white
- Bold, blocky components
- Brutalist aesthetic
- Minimal gradients
- Sharp edges (minimal border-radius)

### Component Library
- Built on shadcn/ui (New York style variant)
- Radix UI primitives for accessibility
- Custom styling via Tailwind

---

## File Structure

```
/
├── client/
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   │   ├── ComicCreator.tsx
│   │   │   ├── MotionStudio.tsx
│   │   │   ├── CardCreator.tsx
│   │   │   ├── VNCreator.tsx
│   │   │   ├── CYOACreator.tsx
│   │   │   ├── CoverCreator.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/         # shadcn components
│   │   │   ├── tools/      # Creator-specific components
│   │   │   └── layout/     # Layout components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── App.tsx         # Main app with routes
│   └── index.html
├── server/
│   ├── index.ts            # Express server entry
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database interface
│   ├── auth.ts             # Passport configuration
│   └── static.ts           # Static file serving
├── shared/
│   └── schema.ts           # Drizzle schema + Zod validation
├── attached_assets/        # Built-in asset library
├── package.json
├── vite.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

---

## Current State vs Planned

### Fully Functional
- Comic Creator (panels, templates, layers, drawing, export)
- Motion Studio (timeline, effects, playback)
- Asset Browser (89 assets, categories, search)
- User authentication (signup, login, sessions)
- Legal gate (NDA/agreements)
- Project CRUD (create, save, load, delete)
- AI image generation
- Real-time collaboration (cursors, presence)

### Partially Implemented
- Trading Card Creator (UI exists, battle simulator planned)
- Visual Novel Creator (basic flow, voiceover timing planned)
- CYOA Creator (nodes work, advanced validation planned)
- Cover Creator (basic layout, foil effects planned)
- Community features (scaffolded, not fully connected)
- Learning module (schema exists, content needed)
- Shop/monetization (cart/orders exist, payments not integrated)

### Planned/Not Started
- Mobile app (spec exists in separate document)
- Text-to-motion AI
- Video export (MP4, GIF, WebM)
- Print-on-demand integration
- Full social media features
- Stripe/payment integration
- Advanced analytics

---

## Environment Variables

```env
DATABASE_URL=postgresql://...     # Neon PostgreSQL connection
SESSION_SECRET=...                # Express session secret
VITE_GA_MEASUREMENT_ID=...        # Google Analytics (optional)
```

---

## Build Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production server
npm run db:push      # Sync database schema
npm run check        # TypeScript type checking
```

---

## Deployment

Currently configured for Replit deployment with:
- Automatic HTTPS/SSL
- Custom domain support (pressstart.space)
- PostgreSQL via Neon
- PWA capabilities
- Auto-restart on changes

---

## Notes for Development

1. **JSONB for flexibility** - Each project type stores its data in a JSONB column, allowing schema evolution without migrations

2. **Shared types** - All types are defined in `shared/schema.ts` for use by both frontend and backend

3. **Asset path handling** - Built-in assets are served from `/attached_assets/` via Express static route

4. **Collaboration** - WebSocket server handles real-time cursor sharing and edit synchronization

5. **Authentication flow** - Passport local strategy with session cookies; legal agreements must be accepted before full access

6. **Export pipeline** - Canvas-based rendering for PNG export; video export is in development

7. **AI integration** - Pollinations.ai for image generation; prompts are URL-encoded and sent via query params

---

*Document generated: December 2024*
*PSCoMiXX Creator v1.0*
