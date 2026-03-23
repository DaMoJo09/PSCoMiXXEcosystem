# PRESS START CoMiXX
## Complete Go-To-Market Product Guide
### pscomixx.com

**Confidential — MADMixedMedia LLC**
**Last Updated: March 2026**

---

# TABLE OF CONTENTS

1. Executive Summary
2. Complete Feature Map
3. Cross-Mode Workflow — The "Send To" System
4. Script Mode Deep Dive — 4 Formats
5. Ecosystem Integration
6. Pricing Matrix
7. Education Section
8. Technical Architecture
9. GTM Talking Points
10. Competitive Differentiation
11. Product Roadmap
12. Key URLs & Resources

---

# 1. EXECUTIVE SUMMARY

## The Elevator Pitch

**Press Start CoMiXX is the first AI-powered creative studio built for comics, trading cards, visual novels, motion graphics, and interactive fiction — all from a single browser tab.** It serves three audiences simultaneously: K-12 classrooms (COPPA/FERPA compliant), indie creators (marketplace + monetization), and studios (API access + collaboration). No downloads. No installs. Just press start.

## The One Script → Three Outputs Pipeline

A single script written in FX Studio or Story Forge can produce:

```
                    ┌──────────────────┐
                    │   COMIC BOOK     │
                    │  (Panel layouts,  │
                    │   speech bubbles) │
                    ├──────────────────┤
 YOUR SCRIPT ──────►   VISUAL NOVEL   │
                    │  (Scenes, sprites,│
                    │   dialogue trees) │
                    ├──────────────────┤
                    │   CYOA STORY     │
                    │  (Node graph,     │
                    │   branching paths)│
                    └──────────────────┘
```

Write once. Create three different content formats. Publish everywhere.

## Key Numbers

| Metric | Value |
|--------|-------|
| Creative modes | 10 |
| Panel templates | 50+ |
| Speech bubble styles | 40+ |
| AI models available | Flux.1, SDXL, Kandinsky |
| Subscription tiers | 5 (Free through Lifetime) |
| Founders Pass slots | 300 (limited) |
| XP levels | 30 |
| Achievements | 15 |
| Platform KPIs tracked | 40+ |

---

# 2. COMPLETE FEATURE MAP

## Mode 1: Comic Creator
**The flagship tool.** A professional comic page editor rivaling desktop software.

| Feature | Details |
|---------|---------|
| Panel Layouts | 50+ templates: Basic, Grid, Action, Dialogue, Manga, Webtoon, Cinematic, Creative, Book/Novel |
| Drawing Tools | Brush, pen, eraser, shape tools, fill, eyedropper, multi-layer support |
| Speech Bubbles | 40+ SVG presets: Classic Round, Cloud Thought, Burst Shout, Narration Box, Whisper, and more |
| Sound Effects | Built-in POW!, BAM!, BOOM! presets with custom text |
| Comic Filters | Classic Comic, Ink & Paper, Noir, Manga — with halftone and screentone overlays |
| Text Pages | Full-panel prose for books, kids' books, graphic novels (Georgia serif, book-style formatting) |
| AI Generation | Generate panel art, backgrounds, characters, and full scenes |
| Script Import | Auto-convert scripts to comic layouts (4 format detection) |
| Cover Designer | Front and back cover editor with templates and FX Studio effects |
| Auto-Save | Continuous saving with undo/redo history |
| Export | PNG at 300 DPI — Standard Comic (6.625" x 10.25"), Digest, Magazine, Manga (JIS B6) |

## Mode 2: Visual Novel Creator
**Ren'Py-inspired interactive storytelling.**

| Feature | Details |
|---------|---------|
| Scene Management | Backgrounds, music, transitions (Fade, Slide, Dissolve) |
| Character System | Multiple expressions, screen positions (left/center/right) |
| Dialogue Engine | Typewriter text effects, character name plates |
| Choice Branching | Player choices that alter story paths |
| Templates | School Days, Star Explorers, Magic Academy, and more |
| Export | Ren'Py-style script export |

## Mode 3: CYOA Builder
**Visual flowchart editor for interactive fiction.**

| Feature | Details |
|---------|---------|
| Node Graph | Drag-and-drop story nodes with visual connections |
| Variables | Track choices with Set, Add, Toggle operations |
| Conditional Logic | Choices appear only when conditions are met |
| Ending Types | Good, Bad, Neutral ending categories |
| AI Story Generation | AI-assisted narrative creation |
| Export | Standalone HTML interactive pages, flowchart images |

## Mode 4: Card Creator
**TCG and Sports card design.**

| Feature | Details |
|---------|---------|
| Card Types | TCG (Character, Spell, Item) and Sports (Player, Coach, Legend) |
| Style Templates | MTG, Pokemon, Yu-Gi-Oh!, Cyberpunk inspired layouts |
| Stats Editor | Attack/Defense, rarity levels (Common to Mythic), lore text |
| Pack Builder | Design booster packs with rarity distributions |
| Export | 300 DPI — Poker (2.5" x 3.5"), Bridge, Tarot, Mini sizes |

## Mode 5: Motion Studio
**Frame-by-frame animation and video editing.**

| Feature | Details |
|---------|---------|
| Timeline | Multi-track for video, audio, and effects |
| Animation | Onion skinning, easing presets (Linear, Bounce, Elastic), keyframes |
| Drawing | Raster and Vector modes with layers and blend modes |
| Audio | Import clips, volume control, timeline sync |
| Export | GIF, WebM — up to 1920x1080 (1080p) |

## Mode 6: Prompt Factory
**AI prompt engineering lab.**

| Feature | Details |
|---------|---------|
| Style Presets | Anime, Pixar, Noir, Watercolor, and more |
| Reference Upload | Upload an image to guide AI style |
| AI Enhancement | Automatically upgrade descriptions into professional prompts |
| Style DNA | Generate reusable style configurations across tools |

## Mode 7: Story Forge
**AI-powered narrative builder.**

| Feature | Details |
|---------|---------|
| Character Builder | Roles, flaws, motivations, backstories |
| Story Parameters | Genre, conflict type, tone, setting |
| AI Generation | Full markdown stories with branching choice points |
| Cross-Tool Export | Send directly to CYOA Builder or Visual Novel Creator |

## Mode 8: Import Center
**Bulk asset pipeline.**

| Feature | Details |
|---------|---------|
| File Formats | CBZ/CBR comic archives, image sequences, project JSON |
| External Sources | Queue for assets from ComfyUI, iClone, Character Creator |
| Batch Processing | Import multiple files simultaneously |

## Mode 9: Print Studio
**Digital-to-physical pipeline.**

| Feature | Details |
|---------|---------|
| Export Dashboard | Print-ready files: 300 DPI with bleed, trim marks, safe margins |
| Color Modes | RGB (digital) and CMYK (professional print) |
| Physical Merch | T-Shirts (Adult/Youth/Sleeve), Posters (Tabloid to Movie), Stickers (Die-cut/Vinyl) |
| Print Quotes | Request pricing from print partners for bulk orders |
| Packages | Pre-configured bundles for common print runs |

## Mode 10: Community & Marketplace
**Social publishing and monetization.**

| Feature | Details |
|---------|---------|
| Community Library | Webtoons-style browse, search, filter, built-in reader |
| Series System | Group comics into series with chapters, auto-numbering, subscriptions |
| Social Network | Feed, Explore, followers, DMs, Community Chains (collaborative projects) |
| Creator Profiles | Avatar, bio, XP progress, social links, published works gallery |
| Marketplace | Sell comics and asset packs via Stripe Checkout |
| Reviews | Star ratings, review text, "Verified Purchase" badges |

---

# 3. CROSS-MODE WORKFLOW — THE "SEND TO" SYSTEM

The platform's most powerful feature is the universal **Send To** pipeline that connects every tool.

## How It Works

```
┌─────────────┐     SEND TO     ┌─────────────┐
│  FX Studio  │ ──────────────► │   CoMiXX    │
│ (pscomixx   │                 │  Comic      │
│  .online)   │ ◄────────────── │  Creator    │
└─────────────┘    SEND PANEL   └──────┬──────┘
                                       │
                                   SEND TO
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             ┌────────────┐   ┌──────────────┐   ┌──────────────┐
             │ Visual     │   │ CYOA         │   │ Print        │
             │ Novel      │   │ Builder      │   │ Studio       │
             └────────────┘   └──────────────┘   └──────────────┘
```

### Key Flows

| From | To | What Transfers |
|------|----|---------------|
| FX Studio (Layout Mode) | Comic Creator | Rendered spread PNGs auto-placed by page number |
| FX Studio (Script Mode) | Comic Creator | Script data auto-converted to panels (4 formats) |
| Story Forge | CYOA Builder | Full narrative with branching choice points |
| Story Forge | Visual Novel | Scenes, characters, and dialogue trees |
| Comic Creator | FX Studio | Individual panels for effects processing |
| Comic Creator | Print Studio | Print-ready exports with bleed/trim |
| Any Tool | Marketplace | Published content for sale |
| Any Tool | Community Library | Free public sharing |
| Any Tool | PS Streaming | Auto-sync to streaming platform |

### The URL Param System

When FX Studio sends content to CoMiXX, it uses a clean redirect flow:

1. FX Studio calls `POST /api/fx-studio/layout-sync` with the payload
2. CoMiXX stores the data and returns a redirect URL
3. The creator's browser opens CoMiXX with the content pre-loaded:
   - `pscomixx.com/comic?fromScript=<ID>` — Script data
   - `pscomixx.com/comic?fromLayout=<ID>` — Layout/PNG data

No copy-paste. No file downloads. One click.

---

# 4. SCRIPT MODE DEEP DIVE — 4 FORMATS

FX Studio's Script Mode supports four distinct script formats. CoMiXX auto-detects which format is being used and renders it appropriately.

## Format Detection Logic

| Format | Detection Signal | Example |
|--------|-----------------|---------|
| **Comic** | Standard panel descriptions with dialogue | `Panel 1: Wide shot of city. HERO: "Let's go!"` |
| **Screenplay** | Lines starting with `INT.` or `EXT.` | `INT. APARTMENT - NIGHT` |
| **Novel** | Long prose descriptions (100+ chars), minimal dialogue | Full paragraphs of narrative text |
| **Kids Book** | Image reference tags `[ART:]` | `[ART: bunny in garden] The little bunny hopped...` |

## How Each Format Renders in CoMiXX

### Comic Format (Default)
- Standard panel grid layout
- Dialogue → Speech bubbles (positioned by character)
- Narration → Caption boxes (top/bottom of panel)
- SFX → Sound effect text overlays
- Description → Used as AI generation prompt for panel art

### Screenplay Format
- Monospace Courier New font
- Left-aligned text
- 1.5x line height with 24px padding
- Scene headings preserved as bold headers
- Action lines and dialogue formatted per industry standard

### Novel Format
- Georgia serif font, 16px
- Justified text alignment
- 1.8x line height, 32px padding
- White background, no panel borders
- All prose combined into full-panel text blocks
- Book-style page formatting

### Kids Book Format
- Image-heavy panels from `[ART:]` references
- Large text with generous spacing
- Simplified layouts suitable for young readers
- Spot art placement alongside text

## The Full Pipeline

```
FX Studio Script Editor
        │
        ▼
detectScriptFormat() ──► "comic" / "screenplay" / "novel" / "kidsbook"
        │
        ▼
normalizePressPlaysPanel(panel, format)
        │
        ▼
scriptToComic(scriptData) ──► Spread[] (ready for Comic Creator canvas)
```

---

# 5. ECOSYSTEM INTEGRATION

Press Start CoMiXX is the creation hub in a four-platform ecosystem.

## The Ecosystem Map

```
┌──────────────────────────────────────────────────────────────┐
│                    MAD MIXED MEDIA ECOSYSTEM                 │
│                                                              │
│   ┌────────────────┐          ┌────────────────┐             │
│   │  FX STUDIO     │◄────────►│  PRESS START   │             │
│   │  pscomixx      │  Assets  │  CoMiXX        │             │
│   │  .online       │  Scripts │  pscomixx.com   │             │
│   │                │  Layouts │                 │             │
│   │  Visual FX     │          │  Creation Hub   │             │
│   └────────────────┘          └───────┬─────────┘             │
│                                       │                      │
│              ┌────────────────────────┼──────────────┐       │
│              │                        │              │       │
│              ▼                        ▼              ▼       │
│   ┌────────────────┐    ┌────────────────┐  ┌────────────┐  │
│   │  PS STREAMING  │    │  PRESS START   │  │ MARKETPLACE │  │
│   │  psstreaming   │    │  LMS           │  │ (Built-in)  │  │
│   │  .online       │    │  pressstart    │  │             │  │
│   │                │    │  .tech         │  │ Stripe-     │  │
│   │  Distribution  │    │  Education     │  │ powered     │  │
│   └────────────────┘    └────────────────┘  └────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Integration Points

### Single Sign-On (SSO)
- **Ecosystem SSO:** JWT-based (HMAC-SHA256). Sign in once, recognized on all four platforms.
- **School SSO (SAML):** Districts connect their existing identity provider. Students use school credentials.
- **Token Flow:** `POST /api/auth/sso/token` → 1-hour JWT → `/api/auth/sso/redirect?target=streaming` → signed URL → target platform verifies via `/api/auth/sso/verify`

### XP Sync
- XP earned on any platform counts everywhere
- Time-spent events forwarded to PS Streaming
- Action events (create, publish, export) synchronized across platforms
- Creator tier and level visible on all platforms

### Content Sync
- Published content auto-syncs to PS Streaming for distribution
- Content bundles follow PS Content Bundle v1 format
- Version tracking across platforms
- Webhook dispatch on `project.published`, `project.exported`, `user.created`, `user.tier_changed`

### LMS Integration
- Students submit creations directly to Press Start LMS assignments
- LMS fetches comics via API (shared secret key + email matching)
- Teacher grade/feedback flows back to CoMiXX
- Assignment notifications sent via email

### FX Studio Integration
- **Inbound:** Layout PNGs, panel layouts, scripts (4 formats)
- **Outbound:** Individual panels for effects processing
- **Sync Endpoint:** `POST /api/fx-studio/layout-sync` (CORS-enabled, public)
- **Bidirectional:** Round-trip editing with return URLs

---

# 6. PRICING MATRIX

## Tier Comparison

| | FREE | CREATOR | PRO | STUDIO | FOUNDERS PASS |
|---|---|---|---|---|---|
| **Price** | $0 | $9.99/mo | $19.99/mo | $39.99/mo | $199 one-time |
| **Projects** | 3 | 20 | 100 | Unlimited | 100 (Pro) |
| **AI Gens/Day** | 3 | 50 | 200 | Unlimited | 200 (Pro) |
| **Exports/Month** | 2 | 30 | Unlimited | Unlimited | Unlimited |
| **Storage** | 100 MB | 1 GB | 5 GB | 20 GB | 5 GB (Pro) |
| **Watermark** | Yes | Removed | Removed | Removed | Removed |
| **Commercial License** | No | No | Yes | Yes | Yes |
| **FX Studio Access** | No | Yes | Yes | Yes | Yes |
| **Motion Export** | No | No | Yes | Yes | Yes |
| **Priority Rendering** | No | No | Yes | Yes | Yes |
| **Collaboration** | No | No | No | Yes (coming) | No |
| **API Access** | No | No | No | Yes | No |
| **Early Access Features** | No | No | No | Yes | No |
| **Founders Badge** | No | No | No | No | Yes |
| **Exclusive Drops** | No | No | No | No | Yes |
| **Priority Feature Requests** | No | No | No | No | Yes |

## Founders Pass — The Urgency Play

- **Limited to 300 users** — first come, first served
- **One-time $199** — lifetime Pro access, never pay again
- **Exclusive:** Founders Badge on profile, priority feature requests, exclusive asset drops
- **Positioning:** "The earliest supporters get the best deal. Forever."

## School Pricing

- Handled through separate educational agreements (DPA)
- Not available via standard Stripe Checkout
- Custom pricing for districts based on seat count
- Includes COPPA/FERPA compliance documentation
- Teacher dashboards included at no extra cost

## Payment Infrastructure

- **Stripe Checkout** — PCI-compliant, secure
- **Subscription management** — upgrade, downgrade, cancel anytime
- **Marketplace payments** — creator payouts via Stripe
- **Usage tracking** — server-side enforcement of all tier limits

---

# 7. EDUCATION SECTION

## For Students (Ages 6-17)

### What They Get
- Safe, age-appropriate creative tools with content filters
- XP progression system that gamifies learning
- 30 levels with named thresholds (Novice → Legendary)
- Achievement badges displayed on profiles
- Submit work directly to teacher assignments
- Community Library access (reading, liking, commenting)

### Safety Features
- COPPA/FERPA compliant
- Mandatory content moderation on all uploads
- No access to monetization or marketplace selling
- No financial transactions
- Activity visible to assigned teachers
- Parental consent required at signup
- Hash-based image scanning (SHA-256 + perceptual hashing)

## For Teachers

### Teacher Dashboard (5 Tabs)
1. **Students** — Roster: names, XP, levels, time spent, last active
2. **Assignments** — Create tasks with project types (Comic, Card, VN, CYOA) and due dates
3. **Submissions** — Grade work (0-100), provide written feedback
4. **Projects** — Birds-eye view of all student projects
5. **Analytics** — Class metrics: total XP, active students, tool usage distribution

### Classroom Benefits
- No software to install — runs in any browser
- LMS integration (Press Start LMS) for existing workflows
- Assignment-based learning with structured project types
- Real-time visibility into student engagement and progress
- STEM/STEAM alignment through creative technology

## For Districts & Administrators

### Compliance & Security
- **COPPA compliant** — children's data protected per federal law
- **FERPA compliant** — student education records secured
- **Data Processing Agreement (DPA)** — available for institutional use
- **School SSO (SAML)** — connect existing identity providers
- **Audit logging** — all administrative actions tracked
- **Content moderation** — automated + admin review queue

### Talking Points for District Buyers

> "Press Start CoMiXX replaces the need for multiple creative software licenses. One platform covers comics, animation, interactive fiction, card design, and visual storytelling — all with built-in teacher dashboards and COPPA/FERPA compliance. Students sign in with their existing school credentials via SAML SSO."

### ROI Arguments
- Replaces 3-5 separate software subscriptions
- Zero IT overhead (browser-based, no installs)
- Built-in assessment through assignment/submission/grading flow
- Engagement metrics prove student participation
- Cross-curricular: English (writing), Art (design), STEM (logic/coding in CYOA)

---

# 8. TECHNICAL ARCHITECTURE

## Stack Overview

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Wouter |
| **Styling** | Tailwind CSS v4, Radix UI, shadcn/ui |
| **State** | TanStack Query (server state), React Context (auth, theme) |
| **Backend** | Node.js, Express.js, TypeScript (tsx) |
| **Database** | PostgreSQL (Neon serverless), Drizzle ORM |
| **Auth** | Passport.js (local strategy), scrypt hashing, session-based |
| **Real-time** | WebSockets (ws) for collaboration |
| **Payments** | Stripe (Checkout, subscriptions, marketplace) |
| **Email** | Resend (transactional emails) |
| **AI** | Pollinations.ai (Flux.1, SDXL, Kandinsky) |
| **Analytics** | Google Analytics + custom internal analytics |
| **PWA** | Service Worker, IndexedDB, offline mode |

## Security Architecture

| Feature | Implementation |
|---------|---------------|
| Passwords | scrypt with unique salts |
| Sessions | express-session + connect-pg-simple (PostgreSQL-backed) |
| Rate Limiting | Global: 200 req/min, Auth: 10/15min, AI: 10/min |
| Headers | Helmet.js with strict CSP |
| Content Moderation | SHA-256 + perceptual hash scanning on all uploads |
| Audit Trail | All sensitive actions logged with timestamps |
| API Keys | SHA-256 hashed, `psc_` prefixed |
| SSO Tokens | HMAC-SHA256 signed JWTs, 1-hour expiry |

## Infrastructure

| Feature | Details |
|---------|---------|
| **Hosting** | Replit (auto-scaling) |
| **Database** | Neon serverless PostgreSQL |
| **CDN/Static** | Vite build, service worker caching |
| **File Storage** | Local disk (`uploads/`), 50MB max, MIME allowlist |
| **PWA** | Full offline support with IndexedDB sync queue |
| **Webhooks** | Event dispatch with delivery logging and retry queue |

## Data Model Highlights

- UUID primary keys throughout
- JSONB columns for flexible project metadata
- Polymorphic project types (comic, vn, cyoa, card, motion)
- Versioning and audit logs on all content
- Feature flags stored in database for dynamic toggling

---

# 9. GTM TALKING POINTS

## For Investors

> **The Opportunity:** CoMiXX is the Canva of sequential art — a vertical SaaS platform serving the $7B+ global comic/manga market and the $15B+ EdTech market simultaneously.

> **The Moat:** Our ecosystem (creation + effects + streaming + education) creates platform lock-in that horizontal tools can't replicate. A student who learns on CoMiXX in school becomes a Creator who publishes on our marketplace and streams on our platform.

> **The Revenue Model:** Five subscription tiers (Free → $39.99/mo), a limited Founders Pass ($199 lifetime), marketplace transaction fees, and institutional contracts. Multiple monetization paths with compounding retention.

> **Traction Metrics:** 40+ KPIs tracked in real-time, including DAU/MAU ratios, activation rates, content velocity, AI adoption, revenue per user, and user health scores.

## For Indie Creators

> **Why CoMiXX:** Create comics, trading cards, visual novels, and animations — all in your browser. No expensive software. No steep learning curves.

> **The AI Advantage:** Generate panel art, backgrounds, and characters with built-in AI. Use the Prompt Factory to refine your style. Let Story Forge build your narrative.

> **Earn Money:** Publish to our community library for exposure, or sell on our marketplace. Stripe-powered payments. You keep your IP. Commercial license included at Pro tier.

> **Build an Audience:** Creator profiles, follower system, series subscriptions, and cross-platform distribution to PS Streaming. Your work reaches readers everywhere.

## For Educators

> **Why CoMiXX in the Classroom:** Students learn storytelling, visual communication, logic (CYOA branching), and digital literacy through guided creative projects. Built-in assignments, grading, and analytics make it easy to assess.

> **Safety First:** COPPA and FERPA compliant from day one. Content moderation, age gating, parental consent, and full teacher visibility into student activity.

> **Zero Friction:** Browser-based — works on Chromebooks, iPads, and desktops. No downloads, no IT tickets, no license keys. Students sign in with school SSO.

## For EdTech Buyers

> **Integration Ready:** SAML SSO, LMS integration, webhook events, and API access. CoMiXX fits into your existing tech stack, not the other way around.

> **Proven Engagement:** Gamified XP system with 30 levels and 15 achievements keeps students coming back. Teacher dashboards show exactly who's engaged and who needs support.

> **Cost Effective:** One platform replaces separate subscriptions for comics (Pixton), animation (Toontastic), card design, and interactive fiction tools. Custom district pricing available.

---

# 10. COMPETITIVE DIFFERENTIATION

## Head-to-Head Comparison

| Feature | CoMiXX | Canva | Adobe Express | Clip Studio | Pixton | Webtoon Canvas |
|---------|--------|-------|---------------|-------------|--------|---------------|
| Comic-specific tools | Full suite | Basic | None | Full suite | Basic | None |
| AI generation | Built-in | Built-in | Built-in | None | None | None |
| Visual novels | Yes | No | No | No | No | No |
| CYOA/Interactive fiction | Yes | No | No | No | No | No |
| Trading cards | Yes | Templates only | No | No | No | No |
| Motion/Animation | Yes | Basic | Basic | Yes | No | No |
| K-12 safety (COPPA) | Yes | Canva for Ed | No | No | Yes | No |
| Teacher dashboards | Yes | Limited | No | No | Yes | No |
| Built-in marketplace | Yes | No | No | No | No | No |
| School SSO (SAML) | Yes | Yes | Yes | No | Yes | No |
| Browser-based | Yes | Yes | Yes | No (desktop) | Yes | Yes |
| Free tier | Yes | Yes | Yes | No ($50/yr) | Limited | Yes |
| Ecosystem integration | 4 platforms | Standalone | Adobe suite | Standalone | Standalone | Standalone |
| Script-to-comic pipeline | Yes | No | No | No | No | No |
| Print-ready export | Yes | Yes | Yes | Yes | No | No |

## Why CoMiXX Wins

### vs. Canva / Adobe Express
"Canva and Adobe are horizontal design tools. They can make a poster that looks like a comic page, but they can't build a multi-page comic with speech bubbles, panel layouts, page-to-page flow, and reading order. CoMiXX is purpose-built for sequential art."

### vs. Clip Studio Paint
"Clip Studio is the industry standard for professional manga artists — but it's a $50/year desktop download with a steep learning curve. CoMiXX is browser-based, AI-assisted, and accessible to a 10-year-old on a Chromebook. Different audience, different market."

### vs. Pixton
"Pixton offers basic avatar-based comics for classrooms. CoMiXX offers professional-grade creation tools with AI generation, 5 creative modes beyond comics, a marketplace for monetization, and a full ecosystem. It's the difference between a toy and a tool."

### vs. Webtoon Canvas
"Webtoon Canvas is a distribution platform — you create elsewhere and upload. CoMiXX is creation AND distribution AND monetization in one place. Plus visual novels, CYOA, trading cards, and motion graphics that Webtoon can't touch."

---

# 11. PRODUCT ROADMAP

## Recently Shipped (Q1 2026)

- Text Panel feature for prose-heavy books, kids' books, and graphic novels
- Book/Novel template category (6 templates)
- FX Studio Script Mode integration with 4-format auto-detection
- FX Studio Layout Mode with PNG auto-placement by target page
- Ecosystem SSO across all four platforms
- XP sync with PS Streaming
- Creator Marketplace with Stripe Checkout
- Comic Series System with subscriber notifications
- Teacher Dashboard with assignments, grading, and analytics
- Motion Studio with GIF/WebM export
- Print Studio with quote request pipeline
- Community Chains (collaborative creative projects)
- PWA with full offline support

## Planned (Q2-Q3 2026)

| Feature | Target | Impact |
|---------|--------|--------|
| Real-time collaboration | Q2 2026 | Multiple creators editing the same project simultaneously |
| Mobile-native drawing | Q2 2026 | Touch-optimized drawing tools for tablets |
| Marketplace creator payouts | Q2 2026 | Automated Stripe Connect payouts to sellers |
| Advanced AI style transfer | Q2 2026 | Apply your art style to AI-generated panels |
| Video export (MP4) | Q3 2026 | Motion Studio exports to MP4 with audio |
| Plugin/Extension API | Q3 2026 | Third-party developers build on the platform |
| White-label for schools | Q3 2026 | Custom-branded instances for large districts |
| Language localization | Q3 2026 | Spanish, French, Japanese, Korean |

## Future Vision (Q4 2026+)

- **AI Story Director** — Full AI co-pilot that suggests panel compositions, dialogue, and pacing
- **3D asset integration** — Import 3D models from iClone/Character Creator into comic panels
- **Live streaming creation** — Stream your creation process to PS Streaming in real-time
- **Marketplace subscriptions** — Readers subscribe to creators for ongoing series access
- **AR comic reader** — View comics in augmented reality on mobile devices

---

# 12. KEY URLs & RESOURCES

## Platform URLs

| Platform | URL | Purpose |
|----------|-----|---------|
| Press Start CoMiXX | [pscomixx.com](https://pscomixx.com) | Main creative studio |
| CoMiXX (alternate) | [comixx.website](https://comixx.website) | Alternate domain |
| FX Studio | [pscomixx.online](https://pscomixx.online) | Visual effects studio |
| PS Streaming | [psstreaming.online](https://psstreaming.online) | Content distribution |
| Press Start LMS | [pressstart.tech](https://pressstart.tech) | Education platform |

## Key Pages

| Page | Path | Purpose |
|------|------|---------|
| Landing Page | `/landing` or `/welcome` | Marketing homepage |
| Pricing | `/pricing` | Tier comparison and checkout |
| Dashboard | `/` (authenticated) | Creator home base |
| Comic Creator | `/comic` or `/creator/comic` | Comic editing studio |
| Community Library | `/community` | Browse published content |
| Marketplace | `/marketplace` | Buy and sell content |
| Ecosystem Hub | `/ecosystem` | Cross-platform navigation |
| Creator Profile | `/creator/:username` | Public creator page |
| Admin Dashboard | `/admin` | Platform analytics (admin only) |
| Teacher Dashboard | `/teacher` | Classroom management |

## API Endpoints (Key)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fx-studio/layout-sync` | POST | Receive layouts/scripts from FX Studio |
| `/api/auth/sso/token` | POST | Generate ecosystem SSO token |
| `/api/auth/sso/redirect` | GET | Redirect to ecosystem platform |
| `/api/xp/heartbeat` | POST | Track time-spent XP |
| `/api/xp/action` | POST | Track action-based XP |
| `/api/progression/summary` | GET | User's full progression data |

## Contact

| Purpose | Email |
|---------|-------|
| General | info@pscomixx.com |
| Privacy | privacy@pscomixx.com |
| Schools/Districts | districts@pscomixx.com |
| COPPA Requests | coppa@pscomixx.com |

## DNS Configuration

| Domain | Record | Value |
|--------|--------|-------|
| pscomixx.com | A | 34.111.179.208 |

---

*Press Start CoMiXX — Complete Go-To-Market Product Guide*
*Confidential — MADMixedMedia LLC*
*March 2026*
