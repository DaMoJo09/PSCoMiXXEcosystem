# Press Start CoMiXX — Complete Platform Guide
### Go-To-Market Reference | pscomixx.com

---

## 1. WHAT IS PRESS START CoMiXX?

Press Start CoMiXX is a K-12 and creator-focused AI-powered creative studio where anyone can make comics, trading cards, visual novels, motion comics, choose-your-own-adventure stories, and illustrated books — all from a single browser-based platform. No downloads, no installs.

It's designed for three audiences:
- **Students (ages 6-17)** — Safe, COPPA/FERPA-compliant creative tools for classrooms
- **Indie Creators (18+)** — Professional publishing, monetization, and community features
- **Studios & Teams** — Collaboration, API access, and bulk content production

CoMiXX is part of the MAD Mixed Media ecosystem, connecting to FX Studio (visual effects), PS Streaming (content distribution), and Press Start LMS (education).

---

## 2. SIGN-IN & ACCOUNT SYSTEM

### Account Types
| Type | Age | Access |
|------|-----|--------|
| **Student** | 6-17 | Safe mode, teacher oversight, no monetization, content filters active |
| **Creator** | 18+ | Full access: marketplace, monetization, advanced tools, social features |

### How Sign-In Works
- **Email + Password** — Standard registration with secure password hashing
- **Google OAuth** — One-click Google sign-in
- **Ecosystem SSO** — Users signed into any MAD Mixed Media platform (PressPlays, PS Streaming, LMS) are automatically recognized across all platforms via secure JWT tokens
- **School SSO (SAML)** — Schools and districts can connect their existing identity provider so students sign in with their school credentials

### Safety & Compliance
- **Age verification** at signup (date of birth required)
- **Parental consent** required for users under 18
- **COPPA & FERPA compliant** — student data is protected; activity is visible only to assigned teachers
- **Content moderation** — all uploads are scanned (hash-based image filtering)
- **Early Adopter Gate** — currently active, restricting signups to approved waitlist members (can be toggled off at launch)

### Legal Gates
Before using any creative tool, users must accept:
1. NDA & IP Disclosure (content ownership terms)
2. User Agreement (Terms of Service)

---

## 3. PRICING & SUBSCRIPTION TIERS

| Tier | Price | Projects | AI Generations | Exports | Storage | Key Features |
|------|-------|----------|----------------|---------|---------|--------------|
| **Free** | $0 | 3 | 3/day | 2/month | 100 MB | Basic tools, community access, XP progression |
| **Creator** | $9.99/mo | 20 | 50/day | 30/month | 1 GB | Watermark removal, asset packs, FX Studio access |
| **Pro** | $19.99/mo | 100 | 200/day | Unlimited | 5 GB | Commercial license, priority rendering, motion export |
| **Studio** | $39.99/mo | Unlimited | Unlimited | Unlimited | 20 GB | Collaboration tools, API access, early access features |
| **Founders Pass** | $199 one-time | Pro features | Pro features | Unlimited | 5 GB | Lifetime Pro access, Founders badge, exclusive drops, priority feature requests |

**Founders Pass** is limited to the first 300 users — a one-time payment for lifetime Pro access.

**Payment processing** is handled by Stripe Checkout (PCI-compliant, secure).

**School accounts** are handled through separate educational agreements (DPA) rather than standard checkout.

---

## 4. CREATOR TOOLS — THE FULL SUITE

### 4A. Comic Creator
The flagship tool. A full-featured comic page editor.

- **Panel Layouts** — 50+ templates across Basic, Grid, Action, Dialogue, Manga, Webtoon, Cinematic, Creative, and Book/Novel categories
- **Drawing Tools** — Brush, pen, eraser, shape tools, fill, eyedropper, layers
- **Speech Bubbles** — 40+ styles (classic round, cloud thought, burst shout, narration box, whisper, and more)
- **Sound Effects** — Built-in POW!, BAM!, BOOM! presets with custom text
- **CSS Filters** — Comic-specific: "Classic Comic," "Ink & Paper," "Noir," "Manga" with halftone/screentone overlays
- **Text Pages** — Full-panel prose text for books, kids' books, and graphic novels (Georgia serif, book-style formatting)
- **AI Integration** — Generate panel art, backgrounds, and characters with the built-in AI generator
- **Script Import** — Paste or import a script and auto-generate comic layouts
- **Auto-Save** — Work is continuously saved; undo/redo history preserved
- **Cover Designer** — Front and back cover editor with templates
- **Export Options:**
  - PNG at 300 DPI (print-ready)
  - Standard Comic size (6.625" x 10.25" with bleed)
  - Digest, Magazine, and Manga (JIS B6) sizes

### 4B. Visual Novel Creator
A Ren'Py-inspired interactive story engine.

- **Scene Management** — Backgrounds, music, and transitions (Fade, Slide, Dissolve)
- **Character System** — Define characters with multiple expressions and screen positions
- **Dialogue Engine** — Typewriter text effects, character name plates
- **Choice Branching** — Player choices that affect the story path
- **Templates** — "School Days," "Star Explorers," "Magic Academy," and more
- **Script Export** — Export the underlying Ren'Py-style script

### 4C. CYOA Builder (Choose Your Own Adventure)
A visual flowchart tool for interactive fiction.

- **Node Graph Editor** — Drag-and-drop story nodes connected by choice paths
- **Variable System** — Track player choices with Set, Add, Toggle operations
- **Conditional Logic** — Choices that only appear when conditions are met
- **Ending Types** — Good, Bad, or Neutral endings
- **Story Generation** — AI-assisted story creation
- **HTML Export** — Export as standalone interactive web pages

### 4D. Card Creator
Design trading cards and sports cards.

- **TCG Mode** — Character, Spell, and Item card types
- **Sports Mode** — Player, Coach, and Legend card types
- **Style Templates** — MTG, Pokemon, Yu-Gi-Oh! inspired layouts
- **Stats Editor** — Attack/Defense values, rarity levels, lore text
- **Pack Builder** — Design booster packs with rarity distributions (Common to Mythic)
- **Export** — 300 DPI print-ready: Poker Size (2.5" x 3.5"), Bridge, Tarot, or Mini

### 4E. Motion Studio
Frame-by-frame animation and video editing.

- **Timeline Editor** — Multi-track for video, audio, and effects
- **Animation Tools** — Onion skinning, easing presets (Linear, Bounce, Elastic), keyframe interpolation
- **Drawing Suite** — Raster and Vector modes with layers and blend modes
- **Audio Sync** — Import audio clips with volume control and timeline placement
- **Export Options:**
  - GIF (animated)
  - WebM video
  - Up to 1920x1080 (1080p) resolution

### 4F. Additional Creative Tools
- **Prompt Factory** — AI prompt generation and refinement
- **Story Forge** — Scripting and narrative development workspace
- **Import Center** — Bring in assets and scripts from external sources

---

## 5. FX STUDIO INTEGRATION

CoMiXX connects bidirectionally with FX Studio (the visual effects platform at pscomixx.online).

### What FX Studio Sends to CoMiXX

**Layout Mode:**
- Rendered spread PNGs with page targeting — FX Studio sends a finished page image and CoMiXX places it on the correct page automatically
- Panel layout data (JSON) with positions, sizes, and structure — CoMiXX converts it into editable comic panels

**Script Mode (4 formats auto-detected):**
| Format | Detection | How CoMiXX Renders It |
|--------|-----------|----------------------|
| **Novel** | Long prose descriptions, minimal dialogue | Full-panel text blocks, serif font, book-style padding, justified text |
| **Screenplay** | INT./EXT. scene headings | Monospace Courier font, left-aligned, screenplay spacing |
| **Kids Book** | Image references ([ART:] tags) | Image-heavy panels with spot art |
| **Comic** | Standard panel descriptions | Traditional comic layout with speech bubbles, captions, SFX |

### How It Works
1. Creator works in FX Studio's Layout or Script mode
2. Clicks "SEND TO CoMiXX"
3. FX Studio calls the CoMiXX sync endpoint
4. CoMiXX stores the data and returns a redirect URL
5. Creator lands in the Comic Creator with everything pre-loaded and ready to edit

### What CoMiXX Sends to FX Studio
- Individual comic panels for effects processing
- XP and time-spent events for ecosystem tracking

---

## 6. PUBLISHING & EXPORT PIPELINE

### Export Dashboard
Unified settings for professional output:
- **Trim Marks, Bleed, Safe Margins** — Toggle on/off
- **Color Modes** — RGB (digital) or CMYK (professional print)
- **Print Sizes** — Standard comic, digest, magazine, manga

### Print Studio
A creation-to-print pipeline:
- **Export Dashboard** — Prepare files for printing
- **Print Quote Request** — Get pricing from print partners
- **Print Packages** — Pre-configured bundles for common print runs

### Physical Merchandise
- **T-Shirts** — Adult, Youth, and Sleeve print areas
- **Posters** — Tabloid to Movie-size formats
- **Sticker Sheets** — Die-cut and vinyl options

### Content Publishing Flow
Projects progress through stages:
1. **Draft** — Work in progress
2. **Review** — Submitted for quality check
3. **Published** — Live in the Community Library and/or Marketplace

All published content conforms to the **PS Content Bundle v1** format for cross-platform compatibility.

---

## 7. COMMUNITY FEATURES

### Community Library
A Webtoons-style browse experience:
- Search, sort, and filter published comics
- Built-in comic reader with reading progress tracking
- Like, comment, and bookmark features
- View counts and engagement metrics

### Comic Series System
Creators can group comics into series:
- Chapter ordering and auto-numbering
- Series subscriptions (readers get notified of new chapters)
- Featured series spotlights
- Per-series analytics (reads, subscribers, completion rate)

### Social Network
A built-in social platform ("PSCOMIXX Social"):
- **Feed & Explore** — Share posts, projects, and media
- **Follow System** — Follow creators, see their updates
- **Direct Messaging** — Private conversations between users
- **Community Chains** — Collaborative creative projects where multiple users contribute
- **Notifications** — Real-time updates on follows, likes, comments

### Creator Profiles
Public profile pages displaying:
- Avatar, cover image, and bio
- XP progress bar and level
- Social links
- Follower/following counts
- Published works gallery
- Artist stats (Creativity, Storytelling, Artistry, Collaboration)

---

## 8. MARKETPLACE

### For Sellers
- List comics, asset packs, and creative projects for sale
- Set prices or offer free downloads
- Track sales, views, and engagement analytics
- Stripe-powered secure checkout

### For Buyers
- Browse and filter by category, price, rating
- Purchase with one-click Stripe Checkout
- Leave reviews and ratings
- "Verified Purchase" badges on reviews
- Purchase history and re-downloads

### Content Safety
- Student-appropriate content filtering
- Content rating system
- Admin moderation and review queue

---

## 9. XP & PROGRESSION SYSTEM

### How XP Works
- **Time-based:** 10 XP per minute of active use (heartbeat tracking)
- **Action-based:** XP for saving projects, exporting, publishing, AI generation
- **30 levels** with named thresholds across 8 tiers:
  - Novice → Rookie → Learner → Creator → Mentor → Professional → Founder → Legendary

### Achievements
- 15 unlockable achievements triggered by milestones (first project, first publish, export milestones, etc.)
- Badge display on creator profiles

### Rewards
- 6 claimable rewards unlocked by leveling up
- 5 content packs that unlock as users progress
- Rewards include exclusive asset packs and platform entitlements

### Where Users See Progress
- Sidebar XP widget (always visible)
- Dashboard XP summary
- Dedicated Achievements page (`/achievements`)
- Dedicated Rewards page (`/rewards`)

---

## 10. EDUCATION FEATURES

### Teacher Dashboard
A classroom management hub with 5 tabs:
1. **Students** — Roster showing names, XP, levels, time spent, last active
2. **Assignments** — Create tasks with specific project types and due dates
3. **Submissions** — Grade student work (0-100 scale) with written feedback
4. **Projects** — Birds-eye view of all student projects
5. **Analytics** — Class-level metrics: total XP, active students, tool usage

### PSLMS Integration
- Students can submit creations directly to Press Start LMS assignments
- LMS can fetch comics via API using shared secret keys
- Email-based user matching between platforms

### Student Safety
- Mandatory content filters
- No access to monetization or marketplace selling
- No financial transactions
- Activity visible to teachers and admins
- Age-appropriate content gating

---

## 11. ADMIN & PLATFORM MANAGEMENT

### Admin Dashboard
40+ KPIs across multiple categories:
- **Growth:** User signups, student vs. creator counts, 30-day growth rate
- **Engagement:** DAU/MAU ratios, retention rates, activation rate, avg time spent
- **Content:** Content velocity, publish rate, platform views
- **Revenue:** Total revenue, ARPU, conversion rates, marketplace sales
- **AI & Platform:** AI adoption rate, unique AI users, daily/monthly generations
- **User Health:** Power creators, at-risk users (30d inactive), cross-tool adoption

### Admin Control Room
- **Feature Flags** — Toggle platform features on/off globally
- **Monetization** — Manage AppSumo codes and invite codes
- **User Management** — Waitlist approvals, team access, role management
- **Security & Audit** — Activity logs tracking all admin operations

### Content Moderation
- **Moderation Console** — Handle reported content (spam, harassment, inappropriate, copyright)
- **Review Queue** — Pre-publication review with approve/reject actions
- **Image Scanning** — SHA-256 and perceptual hash checking on all uploads

---

## 12. TRANSACTIONAL EMAILS

Branded HTML emails sent via Resend for:
- Welcome (new account)
- Assignment notifications (student)
- Submission confirmations (student)
- Grade notifications (student)
- Purchase confirmations (marketplace)
- Subscription confirmations (plan changes)

---

## 13. TECHNICAL HIGHLIGHTS

### Performance & Reliability
- **PWA & Offline Mode** — Works offline with service worker caching and IndexedDB; background sync when reconnected
- **Auto-Save** — Continuous saving with conflict resolution
- **Smart Project Resumption** — Server-side deduplication prevents duplicate projects

### Security
- Rate limiting on all endpoints
- Helmet.js security headers
- Encrypted password storage (scrypt)
- Secure session management
- Audit logging for compliance
- Content moderation (hash-based image scanning)

### Accessibility
- Keyboard shortcuts throughout
- Skip-to-content links
- ARIA labels on interactive elements
- High-contrast mode
- Respects prefers-reduced-motion
- Global error boundary

### Mobile Responsive
- Optimized for mobile with hamburger menu, bottom navigation bar, and slide-in drawers
- Touch-friendly interfaces across all tools

### SEO Ready
- Dynamic sitemap.xml
- Open Graph image endpoints
- Full SEO meta tags with JSON-LD structured data
- robots.txt configured

---

## 14. ECOSYSTEM MAP

Press Start CoMiXX sits at the center of the MAD Mixed Media ecosystem:

```
                    ┌─────────────────┐
                    │  PS Streaming    │
                    │ (Distribution)   │
                    └────────▲────────┘
                             │
┌──────────────┐    ┌────────┴────────┐    ┌──────────────┐
│  FX Studio   │◄──►│   PSCoMiXX      │◄──►│  Press Start  │
│ (Effects)    │    │  (Creation)      │    │    LMS        │
│ pressplays   │    │  pscomixx.com    │    │ (Education)   │
└──────────────┘    └────────┬────────┘    └──────────────┘
                             │
                    ┌────────▼────────┐
                    │   Marketplace   │
                    │  (Monetization) │
                    └─────────────────┘
```

### Cross-Platform Features
- **Single Sign-On** — One account works across all platforms
- **XP Sync** — XP earned anywhere counts everywhere
- **Content Sync** — Published content flows to PS Streaming automatically
- **Asset Exchange** — Panels and effects move between CoMiXX and FX Studio
- **Assignment Flow** — Teachers assign in LMS, students create in CoMiXX, submissions flow back

---

## 15. COMPETITIVE POSITIONING

### What Makes CoMiXX Different

| vs. Canva/Adobe | CoMiXX is purpose-built for comics and sequential art, not general design |
|---|---|
| vs. Clip Studio | CoMiXX is browser-based, no download, built for K-12 safety |
| vs. Pixton | CoMiXX has AI generation, motion comics, marketplace, and a full ecosystem |
| vs. Webtoon Canvas | CoMiXX offers creation + distribution + monetization + education in one place |

### Key Differentiators
1. **AI-Powered** — Generate art, backgrounds, characters, and scripts with AI
2. **K-12 Safe** — COPPA/FERPA compliant with teacher dashboards and content moderation
3. **Full Ecosystem** — Creation, effects, streaming, education, and marketplace all connected
4. **Multi-Format** — Comics, cards, visual novels, CYOA, motion comics, and books from one platform
5. **Creator Economy** — Built-in marketplace with Stripe payments, not just a tool
6. **Founders Pass** — Lifetime access model creates urgency and loyalty

---

## 16. TALKING POINTS FOR INVESTORS / PARTNERS

### For Schools & Districts
> "Press Start CoMiXX gives every student a professional creative studio that's safe, COPPA-compliant, and integrated with your existing LMS. Teachers get real-time dashboards showing student engagement, progress, and submissions — no extra software to manage."

### For Indie Creators
> "Create comics, trading cards, visual novels, and animated content — all in your browser. Publish to our community library, sell on our marketplace, and earn real revenue through Stripe. No gatekeepers."

### For Investors
> "CoMiXX is the Canva of sequential art — a vertical SaaS platform serving the $7B+ comic/manga market and the $15B+ EdTech market simultaneously. Our freemium model with 5 revenue tiers, integrated marketplace, and ecosystem lock-in create multiple monetization paths with strong retention."

### For Studio Partners
> "API access, collaboration tools, and bulk content production capabilities at the Studio tier. Export in professional print formats or stream directly to our distribution platform."

---

## 17. LAUNCH CHECKLIST

- [ ] **Early Adopter Gate**: Currently ON — turn off when ready for public signups
- [ ] **Stripe Products**: 4 products configured (Creator, Pro, Studio, Founders Pass)
- [ ] **Founders Pass Counter**: Limited to 300 — track remaining slots
- [ ] **Feature Flags**: Review all flags in Admin Control Room before launch
- [ ] **Waitlist**: Approve initial batch of waitlisted users
- [ ] **Landing Page**: Live at /landing and /welcome
- [ ] **SEO**: Sitemap, OG tags, and JSON-LD all configured
- [ ] **Transactional Emails**: All templates active via Resend
- [ ] **Domain**: pscomixx.com (A record → 34.111.179.208)

---

*This guide covers the complete Press Start CoMiXX platform as of March 2026. For technical documentation, see replit.md in the project root.*
