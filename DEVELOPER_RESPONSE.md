# PSCoMiXX Creator — Complete Developer Response

**From:** MoJo (Project Owner)  
**To:** Contract Developer  
**Re:** Complete asset and information request for identical platform rebuild

---

## 1. Complete Source Code Export

### How to Get the Full Codebase

**Option 1: Download from Replit (Easiest)**
1. In Replit, click the three dots menu (⋯)
2. Select "Download as zip"
3. This includes all source files

**Option 2: GitHub Export**
```bash
# From Replit shell:
git init
git add .
git commit -m "Full codebase export"
git remote add origin https://github.com/YOUR_REPO
git push -u origin main
```

---

### File Structure Overview

```
/
├── client/
│   ├── src/
│   │   ├── pages/ (37 files)
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── ArtistPage.tsx
│   │   │   ├── AssetBuilder.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── BlogPage.tsx
│   │   │   ├── CardBattle.tsx
│   │   │   ├── CardCreator.tsx
│   │   │   ├── CollabHub.tsx
│   │   │   ├── CollaborateModule.tsx
│   │   │   ├── CollabSession.tsx
│   │   │   ├── ComicCreator.tsx
│   │   │   ├── CommunityChains.tsx
│   │   │   ├── ContactPage.tsx
│   │   │   ├── CoverCreator.tsx
│   │   │   ├── CYOABuilder.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── EarnModule.tsx
│   │   │   ├── EcosystemHub.tsx
│   │   │   ├── EventsModule.tsx
│   │   │   ├── ExhibitionsPage.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LearnModule.tsx
│   │   │   ├── MotionStudio.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── Notifications.tsx
│   │   │   ├── PortfolioPage.tsx
│   │   │   ├── PromptFactory.tsx
│   │   │   ├── PublishModule.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ShopPage.tsx
│   │   │   ├── SocialFeed.tsx
│   │   │   ├── SocialMessages.tsx
│   │   │   ├── SocialProfile.tsx
│   │   │   ├── StoryForge.tsx
│   │   │   ├── UserSearch.tsx
│   │   │   └── VNCreator.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── social/
│   │   │   │   └── PostComposer.tsx
│   │   │   ├── tools/
│   │   │   │   ├── AIGenerator.tsx
│   │   │   │   ├── AssetBrowser.tsx
│   │   │   │   ├── DrawingCanvas.tsx
│   │   │   │   ├── DrawingWorkspace.tsx
│   │   │   │   ├── EmojiPicker.tsx
│   │   │   │   ├── SoundEffects.tsx
│   │   │   │   ├── TextElement.tsx
│   │   │   │   ├── TransformableElement.tsx
│   │   │   │   └── UnifiedRenderer.tsx
│   │   │   ├── ui/ (60+ shadcn components)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ... (see full list below)
│   │   │   └── LegalGate.tsx
│   │   │
│   │   ├── contexts/
│   │   │   ├── AssetLibraryContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   ├── CrossModeAssetContext.tsx
│   │   │   ├── EcosystemContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-analytics.tsx
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-toast.ts
│   │   │   ├── useAdmin.ts
│   │   │   └── useProjects.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── aiModels.ts
│   │   │   ├── analytics.ts
│   │   │   ├── api.ts
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   │
│   │   └── App.tsx
│   │
│   └── index.html
│
├── server/
│   ├── auth.ts
│   ├── db.ts
│   ├── index.ts
│   ├── routes.ts
│   ├── static.ts
│   ├── storage.ts
│   └── vite.ts
│
├── shared/
│   └── schema.ts (1388 lines - complete Drizzle schema)
│
├── attached_assets/ (89+ files)
│   ├── Speech bubbles (48 PNG files)
│   ├── Action effects (41 PNG files)
│   ├── Sample videos (MP4)
│   └── PDF template reference
│
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── vite.config.ts
├── components.json (shadcn config)
├── replit.md
├── DEVELOPER_HANDOFF.md
└── BUILD_PLAN.md
```

---

## 2. Database

### Complete Schema (shared/schema.ts)

The schema file is 1388 lines and includes:

**Core Tables:**
- `users` - Authentication and profiles
- `projects` - All creative works (JSONB data)
- `assets` - Uploaded media files

**Portfolio & Commerce:**
- `portfolioArtworks` - Showcase pieces
- `artworkCategories` - Filtering categories
- `portfolioEvents` - Exhibitions/events
- `blogPosts` - User blog content
- `contactMessages` - Contact form submissions
- `newsletterSubscribers` - Email list
- `artistProfiles` - Extended user profiles
- `favorites` - Saved artworks
- `cartItems` - Shopping cart
- `orders` - Purchase records

**Ecosystem/XP:**
- `creatorRoles` - Role definitions
- `userRoles` - Role assignments
- `creatorXp` - Experience points
- `xpTransactions` - XP history
- `badges` - Achievement definitions
- `userBadges` - Earned badges

**Learning:**
- `learningPathways` - Course structures
- `lessons` - Individual lessons
- `lessonProgress` - User progress

**Community:**
- `schools` - Educational institutions
- `creatorTeams` - Collaboration groups
- `teamMembers` - Team membership

### Sample Data Structures

**Comic Project Data (JSONB):**
```json
{
  "spreads": [
    {
      "id": "spread_1",
      "leftPage": [
        {
          "id": "panel_1",
          "x": 0, "y": 0,
          "width": 50, "height": 50,
          "type": "rectangle",
          "zIndex": 0,
          "contents": [
            {
              "id": "content_1",
              "type": "image",
              "data": { "url": "/attached_assets/image.png" },
              "transform": {
                "x": 0, "y": 0,
                "width": 200, "height": 200,
                "rotation": 0,
                "scaleX": 1, "scaleY": 1
              },
              "zIndex": 0
            }
          ]
        }
      ],
      "rightPage": []
    }
  ]
}
```

**Trading Card Data (JSONB):**
```json
{
  "name": "Dragon Knight",
  "type": "creature",
  "rarity": "rare",
  "stats": { "attack": 5, "defense": 3, "cost": 4 },
  "frontImage": "url",
  "backImage": "url",
  "lore": "A legendary warrior...",
  "evolution": { "stage": 2, "nextCardId": null }
}
```

---

## 3. Static Assets

### Built-in Asset Library (attached_assets/)

**Speech Bubbles (48 files):**
```
Comic_Speech_Bubbles_No_Middle_1_*.png through
Comic_Speech_Bubbles_No_Middle_48_*.png
```

**Action Effects (41 files):**
```
8_*.png  → Effect overlay
9_*.png  → Effect overlay
...
48_*.png → Effect overlay
```

Named effects include: POW, BAM, CRASH, KABOOM, WOW, BOOM, WHAM, ZAP, BANG, SMASH, THWACK, CRUNCH, WHOOSH, SLASH, KAPOW, SPLAT, THUD, CRACK, SNAP, SIZZLE, FWOOSH, ZING, WHOMP, THUMP, CLANG, SWOOSH, BLAST, RUMBLE, FLASH, SPARK, etc.

**Other Assets:**
- `4d6ae1e8-*.mp4` - Sample video
- `CoMixxFallIng_*.mp4` - Landing page video
- `Blank-Comic-Book-Templates_*.pdf` - Template reference

### UI Assets

**Fonts (Google Fonts - not self-hosted):**
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Bangers&display=swap" rel="stylesheet">
```

**Icons:** Lucide React (no custom icons)

**Favicon/PWA:** Not yet configured (needs to be added)

---

## 4. Environment Variables

### Required Variables

```env
# Database (PostgreSQL via Neon)
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Session
SESSION_SECRET=your-random-secret-here

# Optional - Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### NOT Currently Implemented

```env
# These are NOT in use yet:
STRIPE_SECRET_KEY=         # Planned
STRIPE_PUBLISHABLE_KEY=    # Planned
CLOUDINARY_URL=            # Not using (direct DB storage)
```

**Answer:** No additional API keys beyond DATABASE_URL and SESSION_SECRET are required for current functionality.

---

## 5. API Documentation

### Authentication Endpoints

**GET /api/auth/user**
```json
// Response (logged in):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Username",
  "role": "creator",
  "ipDisclosureAccepted": "2024-01-01T00:00:00.000Z",
  "userAgreementAccepted": "2024-01-01T00:00:00.000Z"
}

// Response (not logged in):
401 Unauthorized
```

**POST /api/auth/signup**
```json
// Request:
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Username"
}

// Response (success):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Username",
  "role": "creator"
}

// Response (error):
{ "message": "Email already exists" }
```

**POST /api/auth/login**
```json
// Request:
{
  "email": "user@example.com",
  "password": "password"
}

// Response (success):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Username",
  "role": "creator"
}

// Response (error):
{ "message": "Invalid credentials" }
```

### Project Endpoints

**GET /api/projects**
```json
// Response:
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "My Comic",
    "type": "comic",
    "status": "draft",
    "data": { /* JSONB - type specific */ },
    "thumbnail": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET /api/projects?type=comic**
```json
// Filters by project type
// Same response format as above
```

**POST /api/projects**
```json
// Request:
{
  "title": "New Comic",
  "type": "comic",
  "data": { "spreads": [] }
}

// Response:
{
  "id": "uuid",
  "userId": "uuid",
  "title": "New Comic",
  "type": "comic",
  "status": "draft",
  "data": { "spreads": [] },
  "createdAt": "..."
}
```

**PATCH /api/projects/:id**
```json
// Request (partial update):
{
  "title": "Updated Title",
  "data": { /* updated JSONB */ }
}

// Response: Updated project object
```

### AI Endpoints

**POST /api/ai/image**
```json
// Request:
{
  "prompt": "A superhero flying through clouds",
  "style": "comic"
}

// Response:
{
  "url": "https://pollinations.ai/p/...",
  "seed": 12345
}
```

### WebSocket Protocol

**Connection:** `ws://[host]/ws`

**Events:**

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join` | Client → Server | `{ sessionId, userId, userName }` | Join collaboration |
| `user_joined` | Server → Client | `{ userId, userName, color }` | User joined notification |
| `user_left` | Server → Client | `{ userId }` | User left notification |
| `cursor_move` | Both | `{ userId, x, y, pageId }` | Cursor position update |
| `edit` | Both | `{ userId, operation, data }` | Edit operation sync |
| `lock` | Both | `{ userId, elementId }` | Element lock |
| `unlock` | Both | `{ userId, elementId }` | Element unlock |

---

## 6. Third-Party Service Details

### Pollinations.ai (AI Image Generation)

**Base URL:** `https://pollinations.ai`

**Endpoint:** `GET /p/{encoded_prompt}`

**Prompt Format:**
```javascript
const encodedPrompt = encodeURIComponent(`${style} style: ${prompt}`);
const seed = Math.floor(Math.random() * 1000000);
const url = `https://pollinations.ai/p/${encodedPrompt}?seed=${seed}`;
```

**Rate Limits:** None observed (public API)

**Style Presets:**
- comic
- manga
- realistic
- cartoon
- noir
- watercolor

### Neon (PostgreSQL)

**Region:** Auto-selected by Neon
**Connection:** WebSocket pooling via `@neondatabase/serverless`
**Pool Config:** Default (handled by driver)

### Planned Integrations (Not Implemented)

- **Stripe:** No test account configured yet
- **Print-on-demand:** Not selected yet
- **Video export:** Using browser Canvas recording (planned)

---

## 7. Design System Specifics

### Color Palette (CSS Variables)

```css
:root {
  --background: 0 0% 0%;           /* #000000 Pure black */
  --foreground: 0 0% 100%;         /* #FFFFFF Pure white */
  --card: 0 0% 5%;                 /* #0d0d0d Near black */
  --card-foreground: 0 0% 100%;    /* #FFFFFF */
  --popover: 0 0% 5%;              /* #0d0d0d */
  --popover-foreground: 0 0% 100%; /* #FFFFFF */
  --primary: 0 0% 100%;            /* #FFFFFF */
  --primary-foreground: 0 0% 0%;   /* #000000 */
  --secondary: 0 0% 15%;           /* #262626 */
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 10%;               /* #1a1a1a */
  --muted-foreground: 0 0% 60%;    /* #999999 */
  --accent: 0 0% 15%;              /* #262626 */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62% 50%;        /* Red for errors */
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 20%;              /* #333333 */
  --input: 0 0% 20%;               /* #333333 */
  --ring: 0 0% 100%;               /* #FFFFFF */
  --radius: 0rem;                  /* Sharp corners - brutalist */
}
```

### Typography

```css
--font-display: 'Space Grotesk', sans-serif;  /* Headings, titles */
--font-body: 'Inter', sans-serif;             /* Body text */
--font-mono: 'JetBrains Mono', monospace;     /* Code, technical */
--font-comic: 'Bangers', cursive;             /* Comic bubbles */
```

### Component Styling (Brutalist)

**Buttons:**
- Solid white on black (primary)
- White border on black (outline)
- No border-radius (sharp corners)
- Hard shadow on hover: `4px 4px 0 white`

**Cards:**
- Black background
- 2px white border
- No border-radius
- Hard shadow: `4px 4px 0 white`

**Inputs:**
- Black background
- White border
- White text
- No border-radius

**Modals:**
- Black background
- 2px white border
- Hard shadow

### shadcn/ui Configuration (components.json)

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 8. Business Logic Clarifications

### User Roles & Permissions

| Role | Access | Restrictions |
|------|--------|--------------|
| `creator` | All creator tools, projects, social | No admin panel |
| `admin` | Everything + admin dashboard | None |
| `student` | Learning modules, limited tools | No monetization |
| `mentor` | Teaching features, review tools | Can't modify admin |
| `school_admin` | School management, student roster | School scope only |
| `hub_staff` | Hub management features | Hub scope only |
| `pro_creator` | All features + monetization | No admin |

### Legal Gate Flow

1. **Trigger:** After login, before accessing any creator tool
2. **Required Acceptances:**
   - IP Disclosure Agreement (one-time)
   - User Agreement (one-time)
3. **Behavior:**
   - Modal blocks access until accepted
   - Timestamps stored in user record
   - Once accepted, never shown again
4. **Pre-acceptance Access:** Landing page only

### XP & Badge System

**XP Actions:**
| Action | XP Reward |
|--------|-----------|
| Complete lesson | 25 XP |
| Complete pathway | 100 XP |
| Publish project | 50 XP |
| Earn badge | Varies by badge |
| Daily login | 5 XP |
| Collaboration | 25 XP |

**Tier Progression:**
| Level Range | Tier |
|-------------|------|
| 1-10 | Learner |
| 11-25 | Creator |
| 26-50 | Mentor |
| 51-100 | Professional |
| 100+ | Founder |

**Badge Rarities:**
- Common: 10 XP
- Uncommon: 25 XP
- Rare: 50 XP
- Epic: 100 XP
- Legendary: 250 XP

---

## 9. Testing & QA

### Known Issues

1. **Bubble text auto-resize:** Text doesn't expand bubble bounds (clips on long text)
2. **Video export:** Not implemented yet (planned)
3. **Mobile responsive:** Some creator tools need mobile optimization
4. **Collaboration:** Works but needs stress testing with many users

### Test Accounts

Create these for testing:
```
Admin:
  email: admin@pscomixx.com
  password: [generate secure]
  role: admin

Creator:
  email: creator@pscomixx.com
  password: [generate secure]
  role: creator

Student:
  email: student@pscomixx.com
  password: [generate secure]
  role: student (via role assignment)
```

### Browser Support

**Required:**
- Chrome 90+ (primary target)
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Chrome for Android

---

## 10. Deployment Target

### Current Setup

- [x] **Replit** (current deployment)
- [ ] Netlify (not compatible - needs server)
- [ ] Vercel (possible with modifications)
- [ ] Self-hosted (requires Node.js + PostgreSQL)

### Domain Configuration

- **Primary:** pressstart.space (not yet configured)
- **Subdomains:** None currently
- **SSL:** Provided by Replit automatically

### PWA Requirements (To Be Implemented)

```json
// manifest.json (needs to be created)
{
  "name": "PSCoMiXX Creator",
  "short_name": "PSCoMiXX",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 11. Answers to Developer Questions

### 1. Functionality not in handoff doc?

All core functionality is documented. Some scaffolded-but-incomplete features:
- Card Battle gameplay (UI exists, no game logic)
- Full social messaging (basic implementation)
- Payment processing (not connected)
- Learning content (structure exists, no lessons)

### 2. Multiple environments?

Currently single environment (development/production on same Replit). No staging.

### 3. Other team members?

Just me (MoJo). No other developers to coordinate with.

### 4. Priority order for incremental build?

1. **Auth + Legal Gate** (required for everything)
2. **Comic Creator** (most complete, reference implementation)
3. **Motion Studio** (key differentiator)
4. **Asset Library** (shared across tools)
5. **Other creators** (Card, VN, CYOA, Cover)
6. **Community features**
7. **Monetization**

### 5. Hard deadlines?

No hard deadlines currently. Quality over speed.

---

## Delivery Method

**Recommended:** Download as ZIP from Replit

1. Click three dots (⋯) in Replit
2. Select "Download as zip"
3. Includes all source code, assets, and configs

The zip will contain everything needed for a 1:1 rebuild.

---

*Response prepared: December 2024*
*PSCoMiXX Creator v1.0*
