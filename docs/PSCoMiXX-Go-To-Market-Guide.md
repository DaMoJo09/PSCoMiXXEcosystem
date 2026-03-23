PRESS START CoMiXX

Complete Product & Go-To-Market Guide

pscomixx.com

Part of the PressStart Ecosystem

pscomixx.com • pscomixx.online • pslms.com • psstreaming.online

Prepared: March 2026

CONFIDENTIAL



1. Executive Summary

Press Start CoMiXX (pscomixx.com) is a browser-based AI-powered creative studio for comics, trading cards, visual novels, motion graphics, interactive fiction, and illustrated books. It is the creation hub of the PressStart ecosystem — a unified platform spanning visual effects (FX Studio), education (PressStart LMS), and streaming (PSStreaming).



The One Script → Three Outputs Pipeline:

Write once in FX Studio's Script Mode (Comic, Screenplay, Novel, or Kids Book format), then send structured content to CoMiXX for automatic conversion into Comics, Visual Novels, and CYOA (Choose Your Own Adventure) experiences.



Key Value Proposition:

No downloads, no installs — runs entirely in the browser as a Progressive Web App (PWA)

Free tier with core tool access — premium features unlock with subscription

Ecosystem-wide identity — one account, one subscription, unified XP/progress across all platforms

Built for creators AND classrooms — individual plans + school/district licensing + Founders Pass for early supporters

AI-powered creation — generate panel art, backgrounds, characters, and full narratives with built-in AI



2. Complete Feature Map

2.1 Creative Modes (10 Tools)

Mode | What It Does | Key Features
--- | --- | ---
Comic Creator | Full comic/manga/graphic novel editor — the flagship | 50+ panel templates, 40+ speech bubble styles, comic filters (Noir, Manga, Halftone), text pages for prose, AI generation, cover designer, auto-save, 300 DPI export
Visual Novel Creator | Ren'Py-inspired interactive storytelling engine | Scene management, character sprites with expressions, dialogue with typewriter effects, choice branching, transitions (Fade, Slide, Dissolve), Ren'Py script export
CYOA Builder | Interactive fiction with visual flowcharts | Node-based story graph, variable system (Set/Add/Toggle), conditional logic, ending types (Good/Bad/Neutral), AI story generation, standalone HTML export
Card Creator | Trading card and sports card design | TCG mode (Character/Spell/Item), Sports mode (Player/Coach/Legend), MTG/Pokemon/Yu-Gi-Oh! style templates, rarity system (Common to Mythic), pack simulator, 300 DPI export
Motion Studio | Frame-by-frame animation and video | Multi-track timeline, onion skinning, keyframe easing (Linear/Bounce/Elastic), raster + vector drawing, audio sync, GIF/WebM export up to 1080p
Prompt Factory | AI prompt engineering lab | Style presets (Anime, Pixar, Noir), reference image upload, AI-enhanced prompt generation, reusable Style DNA configurations
Story Forge | AI-powered narrative builder | Character builder (roles/flaws/motivations), story parameters (genre/conflict/tone), full markdown story generation, direct export to CYOA and Visual Novel tools
Import Center | Bulk asset pipeline | CBZ/CBR comic archive import, image sequences, project JSON, incoming queue for ComfyUI/iClone/Character Creator assets
Print Studio | Digital-to-physical production | Export dashboard (300 DPI, bleed, trim marks, CMYK), T-shirts, posters, sticker sheets, print quote requests, pre-configured print packages
Marketplace & Community | Social publishing and monetization | Webtoons-style library, comic series with subscriptions, creator profiles, follower system, DMs, Stripe-powered marketplace, reviews with verified purchase badges

2.2 Universal "Send To" Workflow

Every tool connects through a seamless content routing system. This enables a circular production loop:

Write a script in FX Studio (pscomixx.online)

Send to CoMiXX — auto-converted to comic panels, visual novel scenes, or CYOA nodes

Edit panels in the Comic Creator with drawing tools, AI generation, and speech bubbles

Send individual panels back to FX Studio for effects processing

Publish to Community Library, Marketplace, or PS Streaming

Export to Print Studio for physical production



Additional routes include FX Studio round-trip editing (CoMiXX → FX Studio → CoMiXX), LMS assignment submission, and direct PNG/PDF download.

2.3 Script Mode — The Content Engine

FX Studio's Script Mode is the strategic centerpiece of the production pipeline. CoMiXX auto-detects which of four formats is being sent and renders each one differently:

Format | Use Case | How CoMiXX Renders It
--- | --- | ---
Comic | Sequential art with PAGE/PANEL structure | Standard panel grid, dialogue → speech bubbles, narration → caption boxes, SFX → text overlays, description → AI art prompt
Screenplay | Film & TV scripts with INT./EXT. headings | Monospace Courier New font, left-aligned, 1.5x line height, 24px padding, scene headings as bold headers
Novel | Full prose for graphic novels and text-heavy books | Georgia serif, justified text, 1.8x line height, 32px padding, white background, no panel borders, all prose combined into full-page text blocks
Kids Book | Illustrated children's books with art directions | Image-heavy panels from [ART:] references, large text with generous spacing, spot art alongside prose

All formats arrive as structured JSON via the layout-sync endpoint. CoMiXX parses, detects the format, normalizes the data, and generates ready-to-edit comic spreads automatically.

2.4 PNG Layout Import

FX Studio's Layout Editor can also send rendered spread PNGs directly to CoMiXX:

FX Studio sends a high-resolution PNG with target_page metadata

CoMiXX receives it via POST /api/fx-studio/layout-sync

The image is automatically placed on the correct spread/page as a background panel

The creator can then add speech bubbles, text, and effects on top

This supports the "design in FX Studio, finish in CoMiXX" workflow for creators who prefer visual layout tools.



3. PressStart Ecosystem Integration

CoMiXX is the creation hub in a unified creative ecosystem. All platforms share identity, XP, and subscription state:

Platform | Purpose | URL
--- | --- | ---
CoMiXX Studio | Full comic/manga creation platform — the hub | pscomixx.com
PressPlays FX Studio | Production tools for FX, characters, scripts, layouts | pscomixx.online
PressStart LMS | Learning management for creative education | pslms.com
PSStreaming | Content streaming & portfolio showcase | psstreaming.online

3.1 Cross-Platform Sync

Identity: Single Sign-On (SSO):
HMAC-signed JWT tokens enable seamless cross-domain authentication. Users sign in once and access all platforms. School SSO (SAML) supported for districts with existing identity providers.

Gamification: Bidirectional XP sync:
XP, levels (30 tiers from Novice to Legendary), achievements (15), and active minutes stay consistent across CoMiXX, FX Studio, and LMS.

Subscriptions: Active pscomixx.com subscribers get complimentary FX Studio access:
Verified via real-time subscription check API.

3.2 Asset Synchronization

A tag-based taxonomy automatically routes exported assets to the correct location:

Layout spreads → auto-placed on the correct comic page

Character art → sprite grouping for Visual Novel mode

Scripts → structured JSON for Comic/VN/CYOA conversion

FX overlays → panel-level compositing

Interior page PNGs → background panels in Comic Creator

3.3 Round-Trip Editing

CoMiXX users can click "Edit in FX Studio" on any panel to launch a dedicated editing session. The asset is tracked by project_id and source panel, and FX Studio provides a "Return to CoMiXX" button that sends the edited version back for automatic replacement.

3.4 Webhook System

Standardized event dispatch with delivery logging and retry queue:

project.published — content goes live

project.exported — file generated

user.created — new account

user.tier_changed — subscription change



4. Pricing & Monetization

 | Free | Creator ($9.99/mo) | Pro ($19.99/mo) | Studio ($39.99/mo) | Founders Pass ($199 one-time) | School (Custom)
--- | --- | --- | --- | --- | --- | ---
Comic Creator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
Visual Novel Creator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
CYOA Builder | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
Card Creator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
Motion Studio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
Community Library | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
XP & Achievements | ✓ | ✓ | ✓ | ✓ | ✓ | ✓
Projects | 3 | 20 | 100 | Unlimited | 100 (Pro) | Custom
AI Generations/Day | 3 | 50 | 200 | Unlimited | 200 (Pro) | Custom
Exports/Month | 2 | 30 | Unlimited | Unlimited | Unlimited | Unlimited
Storage | 100 MB | 1 GB | 5 GB | 20 GB | 5 GB (Pro) | Custom
Watermark removal | ✗ | ✓ | ✓ | ✓ | ✓ | ✓
FX Studio access | ✗ | ✓ | ✓ | ✓ | ✓ | ✓
Asset packs | ✗ | Starter | Full | Full | Full | Full
Commercial license | ✗ | ✗ | ✓ | ✓ | ✓ | ✗
Motion export (GIF/WebM) | ✗ | ✗ | ✓ | ✓ | ✓ | ✓
Priority rendering | ✗ | ✗ | ✓ | ✓ | ✓ | ✗
Collaboration tools | ✗ | ✗ | ✗ | ✓ (coming) | ✗ | ✓
API / Plugin access | ✗ | ✗ | ✗ | ✓ | ✗ | ✗
Early access features | ✗ | ✗ | ✗ | ✓ | ✗ | ✗
Founders badge | ✗ | ✗ | ✗ | ✗ | ✓ | ✗
Exclusive asset drops | ✗ | ✗ | ✗ | ✗ | ✓ | ✗
Priority feature requests | ✗ | ✗ | ✗ | ✗ | ✓ | ✗
Classroom dashboard | ✗ | ✗ | ✗ | ✗ | ✗ | ✓
Student tracking | ✗ | ✗ | ✗ | ✗ | ✗ | ✓
LMS integration | ✗ | ✗ | ✗ | ✗ | ✗ | ✓
Bulk licensing | ✗ | ✗ | ✗ | ✗ | ✗ | ✓

Business Rule: Active pscomixx.com subscribers automatically receive complimentary PressPlays FX Studio access at their corresponding tier level.

Founders Pass: Limited to the first 300 users. One-time $199 payment for lifetime Pro access, Founders badge, exclusive drops, and priority feature requests. The urgency play: "The earliest supporters get the best deal. Forever."



5. Education & Classroom Use

Press Start CoMiXX is designed with education as a first-class use case:

5.1 For Students

All core creative tools accessible on the Free tier — zero friction for classroom use

Age-appropriate accounts (ages 6-17) with mandatory content filters

Gamified progress tracking: 30 XP levels, 15 achievements, 6 claimable rewards

Assignment submission directly to teacher dashboard

PWA installable on school Chromebooks and tablets

Parental consent required at signup (COPPA compliant)

5.2 For Teachers

Teacher Dashboard with 5 tabs:
- Students — Roster showing names, XP, levels, time spent, last active
- Assignments — Create tasks with specific project types (Comic, Card, VN, CYOA) and due dates
- Submissions — Grade student work (0-100 scale) with written feedback
- Projects — Birds-eye view of all student-created projects
- Analytics — Class metrics: total XP, active students, tool usage distribution

Assignment integration via LMS sync

Transactional emails for assignment notifications, submission confirmations, and grade notifications

5.3 For Districts

Bulk licensing with custom pricing

SSO integration with existing identity providers (SAML)

COPPA and FERPA compliant — student data stays within the ecosystem

Data Processing Agreement (DPA) available for institutional use

Content moderation: SHA-256 + perceptual hash scanning on all uploads, admin review queue

Audit logging of all administrative actions

Dedicated support and onboarding

5.4 Talking Points for District Buyers

Replaces 3-5 separate creative software subscriptions (comics, animation, card design, interactive fiction, visual storytelling)

Zero IT overhead: browser-based, works on Chromebooks, no software installation

Built-in assessment through assignment/submission/grading flow

Engagement metrics prove student participation

Cross-curricular: English (writing/scripting), Art (visual design), STEM (logic/branching in CYOA), Digital Literacy



6. Technical Architecture

6.1 Frontend Stack

React 19 + TypeScript + Vite (fast build, HMR)

Tailwind CSS v4 + Radix UI + shadcn/ui design system

TanStack Query for server state, React Context for auth/theme

Framer Motion for animations

Wouter for lightweight client-side routing

Progressive Web App (PWA) with Service Worker, IndexedDB, offline sync

Canvas API for drawing tools and panel rendering

6.2 Backend & Infrastructure

Node.js + Express.js (TypeScript via tsx)

PostgreSQL hosted on Neon serverless

Drizzle ORM with migration tooling (drizzle-kit)

Session-based auth via Passport.js (local strategy, scrypt hashing)

WebSockets (ws) for real-time collaboration features

File storage: local disk (uploads/), 50MB max, MIME type allowlist

6.3 Security

Passport.js + scrypt password hashing with unique salts

express-session backed by PostgreSQL (connect-pg-simple)

Rate limiting: Global 200 req/min, Auth 10/15min, AI 10/min

Helmet.js with strict Content Security Policy

HMAC-SHA256 signed JWTs for cross-domain SSO (1-hour expiry)

Content moderation: SHA-256 + perceptual hash scanning on all image uploads

API keys: SHA-256 hashed, psc_ prefixed

Audit logging on all sensitive actions

6.4 Integrations

Integration | Direction | Protocol | Purpose
--- | --- | --- | ---
FX Studio (pscomixx.online) | Bidirectional | REST API + JSON | Asset sync, script/layout import, round-trip editing
PressStart LMS | Bidirectional | REST API | Assignment submission, portfolio publishing, XP sync
PSStreaming | Push | REST API + Webhooks | Content publishing, XP/time-spent sync
Stripe | Bidirectional | Stripe API + Webhooks | Subscription management, marketplace payments
Resend | Push | REST API | Transactional emails (welcome, assignments, purchases)
Pollinations.ai | Pull | REST API | AI image generation (Flux.1, SDXL, Kandinsky), AI text generation
Google Analytics | Push | GA4 SDK | User analytics and engagement tracking



7. Go-To-Market Strategic Talking Points

7.1 For Investors & Partners

Full-stack creative ecosystem with unified identity and revenue model

Dual-market opportunity: individual creators ($9.99-39.99/mo) AND educational institutions (per-seat licensing) PLUS a Founders Pass ($199 lifetime) for early adopter urgency

Network effects: each platform drives users to others (CoMiXX → FX Studio → Streaming → LMS)

Zero-friction onboarding: core tools free, no download, PWA-installable

One Script → Three Outputs multiplies content value from a single creative effort

Built-in marketplace creates a creator economy with transaction revenue on top of subscriptions

40+ platform KPIs tracked in real-time: DAU/MAU ratios, activation rates, content velocity, AI adoption, ARPU, user health scores

7.2 For Creators

Professional-grade tools at indie pricing — or free to start

Create comics, manga, trading cards, visual novels, motion graphics, CYOA stories, and illustrated books in one platform

AI-powered: generate panel art, backgrounds, characters, and full narratives without leaving the editor

Publish to the Community Library for exposure, or sell on the Marketplace with Stripe payments

Build your audience: creator profiles, follower system, series subscriptions, cross-platform distribution to PS Streaming

You keep your IP: full content ownership, commercial license at Pro tier

Seamless pipeline from concept (Story Forge) to script (FX Studio) to finished pages (Comic Creator) to print (Print Studio)

7.3 For Educators

Engage students through creative expression and gamification (30 XP levels, 15 achievements)

Curriculum-aligned tools: scriptwriting (ELA), visual design (Art), branching logic (STEM), digital literacy

No IT overhead: browser-based, works on Chromebooks, no software installation

Track student progress with built-in teacher dashboard: assignments, grading, analytics

Safe environment: COPPA/FERPA compliant, content moderation, age-appropriate filtering

Affordable school plans with dedicated support and DPA documentation

7.4 For EdTech Buyers

Proven engagement model through gamification (XP, levels, achievements drive retention)

LMS integration ready (PressStart LMS sync, assignment workflows, grade passback)

Data privacy: student data stays within the ecosystem, no third-party ad tracking, FERPA compliant

Scalable from single classroom to district-wide deployment with SAML SSO

Cross-curricular: supports ELA, Art, Digital Media, and CTE standards

Replaces multiple point solutions: one platform for comics, animation, card design, interactive fiction, and visual storytelling



8. Competitive Differentiation

Capability | CoMiXX | Canva/Adobe | Clip Studio | Pixton | Webtoon Canvas
--- | --- | --- | --- | --- | ---
Comic-specific tools | ✓ Built for comics (50+ templates, 40+ bubbles) | Generic templates | ✓ Professional | Basic avatar comics | ✗ Upload only
AI generation | ✓ Built-in (Flux.1, SDXL, Kandinsky) | ✓ Built-in | ✗ None | ✗ None | ✗ None
Script → Page pipeline | ✓ One Script → 3 Outputs (4 formats) | ✗ None | ✗ None | ✗ None | ✗ None
Visual novels | ✓ Full Ren'Py-style engine | ✗ None | ✗ None | ✗ None | ✗ None
CYOA / Interactive fiction | ✓ Node-based builder with variables | ✗ None | ✗ None | ✗ None | ✗ None
Trading cards | ✓ TCG + Sports with pack simulator | Templates only | ✗ None | ✗ None | ✗ None
Motion / Animation | ✓ Timeline, keyframes, GIF/WebM | Basic | ✓ Limited | ✗ None | ✗ None
Browser-based (no install) | ✓ PWA | ✓ Web | ✗ Desktop only ($50/yr) | ✓ Web | ✓ Web
Free tier | ✓ Core tools free | Limited free | ✗ Paid only | Limited free | ✓ Free upload
Education features | ✓ Teacher dashboard, LMS, COPPA | Canva for Education | ✗ None | ✓ Basic classroom | ✗ None
Gamification / XP | ✓ 30 levels, cross-platform XP | ✗ None | ✗ None | ✗ None | ✗ None
Built-in marketplace | ✓ Stripe-powered, creator payouts | ✗ None | ✗ Asset store | ✗ None | ✗ None
Unified ecosystem | ✓ 4 platforms (FX + LMS + Streaming) | Partial (Adobe CC) | ✗ Standalone | ✗ Standalone | ✗ Standalone
Print-ready export | ✓ 300 DPI, bleed, CMYK, merch | ✓ Print | ✓ Print | ✗ None | ✗ None
Starting price | $0 (Free forever) | $13/mo | $50/yr | $8/mo | $0 (upload only)

Key Differentiator: CoMiXX is the only platform that combines AI-powered comic creation, multi-format content tools (comics + cards + VN + CYOA + motion), a built-in marketplace, and K-12 education compliance in a single browser-based product.



9. Product Roadmap

Timeline | Feature | Impact
--- | --- | ---
Shipped (Q1 2026) | Text Panel for prose-heavy books/novels | Full book publishing capability
Shipped (Q1 2026) | FX Studio 4-format script import | One Script → Three Outputs pipeline complete
Shipped (Q1 2026) | PNG layout auto-placement from FX Studio | Visual layout → comic page in one click
Shipped (Q1 2026) | Ecosystem SSO across all platforms | Frictionless cross-platform identity
Shipped (Q1 2026) | Creator Marketplace with Stripe | Monetization activated
Shipped (Q1 2026) | Comic Series with subscriber notifications | Reader retention and engagement
Shipped (Q1 2026) | Teacher Dashboard (5 tabs) | Classroom management complete
Shipped (Q1 2026) | Motion Studio with GIF/WebM export | Animation production ready
Shipped (Q1 2026) | PWA with full offline support | Works without internet
Q2 2026 | Real-time collaboration | Multiple creators editing simultaneously
Q2 2026 | Marketplace creator payouts (Stripe Connect) | Automated seller payments
Q2 2026 | Advanced AI style transfer | Apply your art style to AI panels
Q2 2026 | Mobile-native drawing tools | Touch-optimized for tablets
Q3 2026 | Video export (MP4 with audio) | Motion Studio → broadcast-ready
Q3 2026 | Plugin/Extension API | Third-party developers build on the platform
Q3 2026 | White-label for school districts | Custom-branded instances
Q3 2026 | Language localization (ES, FR, JA, KO) | International expansion
Q4 2026 | AI Story Director | Full AI co-pilot for panel composition and pacing
Q4 2026+ | 3D asset integration (iClone/CC) | 3D models → comic panels
Q4 2026+ | Live streaming creation | Stream your process to PS Streaming
Q4 2026+ | AR comic reader | Augmented reality viewing on mobile



10. Key URLs & Resources

Resource | URL
--- | ---
CoMiXX Studio (Live App) | https://pscomixx.com
CoMiXX (Alternate) | https://comixx.website
FX Studio | https://pscomixx.online
PressStart LMS | https://pslms.com
PSStreaming | https://psstreaming.online
Landing Page | https://pscomixx.com/landing
Pricing Page | https://pscomixx.com/pricing
Community Library | https://pscomixx.com/community
Marketplace | https://pscomixx.com/marketplace
Ecosystem Hub | https://pscomixx.com/ecosystem



Key API Endpoints:

POST /api/fx-studio/layout-sync — Receive layouts, scripts, and PNGs from FX Studio

POST /api/auth/sso/token — Generate ecosystem SSO token

GET /api/auth/sso/redirect?target=streaming — Cross-platform redirect

POST /api/xp/heartbeat — Track time-spent XP

POST /api/xp/action — Track action-based XP

GET /api/progression/summary — User progression data



Contact:

General: info@pscomixx.com

Privacy: privacy@pscomixx.com

Schools/Districts: districts@pscomixx.com

COPPA Requests: coppa@pscomixx.com



DNS: pscomixx.com — A record → 34.111.179.208



For partnership inquiries, licensing, or demo requests:

Visit pscomixx.com or contact us through the platform.
