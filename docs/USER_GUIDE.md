# Press Start | MADMIXEDMEDIA — Official User Guide

**For PSCoMiXX, PS FX Studio, PS Streaming, and Press Start LMS**

Version 1.0 · Production Edition
For creators, students, teachers, schools, and studios.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [What the Ecosystem Is](#2-what-the-ecosystem-is)
3. [Platform Overview](#3-platform-overview)
4. [System Requirements](#4-system-requirements)
5. [Account Setup](#5-account-setup)
6. [SSO / Single Sign-On](#6-sso--single-sign-on)
7. [The XP System](#7-the-xp-system)
8. [Creator vs Student Accounts](#8-creator-vs-student-accounts)
9. [Safety Features & Moderation](#9-safety-features--moderation)
10. [Press Start Hub](#10-press-start-hub)
11. [PS CoMiXX](#11-ps-comixx)
    - 11.1 Comic Builder
    - 11.2 Trading Card Creator
    - 11.3 Visual Novel
    - 11.4 CYOA Builder
    - 11.5 Cover Creator
    - 11.6 HOP Creator
    - 11.7 Motion Studio
    - 11.8 Inkblade (Drawing Surface)
    - 11.9 AI Tools
    - 11.10 My Library & Portfolio
    - 11.11 Print Studio
    - 11.12 Marketplace
    - 11.13 Community Library
12. [PS FX Studio](#12-ps-fx-studio)
13. [PS Streaming](#13-ps-streaming)
14. [Press Start LMS](#14-press-start-lms)
15. [Publishing Pipeline](#15-publishing-pipeline)
16. [Marketplace System](#16-marketplace-system)
17. [Portfolio Features](#17-portfolio-features)
18. [Cross-Platform Sync](#18-cross-platform-sync)
19. [Recommended Workflows](#19-recommended-workflows)
20. [Keyboard Shortcuts](#20-keyboard-shortcuts)
21. [Troubleshooting](#21-troubleshooting)
22. [FAQ](#22-faq)
23. [Best Practices](#23-best-practices)
24. [Glossary](#24-glossary)
25. [Appendix A — Screenshot Checklist](#25-appendix-a--screenshot-checklist)
26. [Appendix B — Beginner Quick Start](#26-appendix-b--beginner-quick-start)
27. [Appendix C — Advanced Creator Workflow](#27-appendix-c--advanced-creator-workflow)
28. [Appendix D — Teacher / Classroom Workflow](#28-appendix-d--teacher--classroom-workflow)
29. [Appendix E — Troubleshooting Reference](#29-appendix-e--troubleshooting-reference)

---

## 1. Introduction

Welcome to **Press Start | MADMIXEDMEDIA** — a connected ecosystem of creative tools built so that anyone, from a 10-year-old on a Chromebook to a working studio, can make comics, animated stories, trading cards, visual novels, and motion content, then publish, share, and even sell their work.

This guide walks through every app, every mode, every menu, and every workflow. If you read it cover to cover, you will be able to use the entire ecosystem confidently without needing extra help.

> **How to use this guide**
> - First time? Skip to **Appendix B — Beginner Quick Start**.
> - Teacher? Jump to **Appendix D — Teacher / Classroom Workflow**.
> - Looking to publish or sell? See **Section 15 — Publishing Pipeline**.
> - Stuck? Check **Section 21 — Troubleshooting**.

---

## 2. What the Ecosystem Is

Press Start is four apps that talk to each other:

| App | What it's for | Lives at |
|---|---|---|
| **PSCoMiXX** | Make comics, cards, visual novels, CYOAs, HOPs, and motion stories | pscomixx.com |
| **PS FX Studio** | AI-assisted effects, characters, backgrounds, motion FX | pscomixx.online |
| **PS Streaming** | Stream and publish HOPs and motion content; events, voting, leaderboards | psstreaming.com |
| **Press Start LMS** | Courses, assignments, certifications, classroom management | pressstart.tech |

Everything ties together with one login (SSO), one XP system, one portfolio, and one creator profile.

---

## 3. Platform Overview

```
                      ┌─────────────────┐
                      │  Press Start    │
                      │  Hub & Profile  │
                      └────────┬────────┘
                               │ SSO + XP
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      ┌──────────┐       ┌──────────┐       ┌──────────┐
      │ PSCoMiXX │◀────▶│  FX Studio │       │   LMS    │
      │ (create) │ assets│ (effects)  │       │ (learn)  │
      └────┬─────┘       └──────────┘       └────┬─────┘
           │ publish                              │ assignments
           ▼                                      ▼
      ┌──────────┐                          ┌──────────┐
      │Streaming │                          │Portfolio │
      │ (share)  │──────── XP / votes ─────▶│(showcase)│
      └──────────┘                          └──────────┘
```

You make in CoMiXX → polish in FX Studio → publish to Streaming → showcase in your Portfolio → earn XP across all four.

---

## 4. System Requirements

### Web (recommended for everyone)
- **Browser:** Chrome 110+, Edge 110+, Safari 16+, Firefox 110+
- **RAM:** 4 GB minimum, 8 GB recommended
- **Resolution:** 1280×720 minimum (works on Chromebooks)
- **Internet:** Required for AI features, publishing, and marketplace; offline mode supported for editing existing projects

### Desktop App (Tauri)
- **Mac:** macOS 11+
- **Windows:** Windows 10 1809+
- **Linux:** Ubuntu 20.04+ or equivalent
- **Disk:** ~120 MB
- The desktop app is a thin wrapper around the web app — updates happen automatically when we publish, no reinstall required.

### Mobile (Capacitor)
- **iOS:** 14+
- **Android:** Android 8 (API 26)+
- Touch-optimized UI; some heavy editors are read-only on phones, full editor on tablets.

> **Chromebook note:** The editors are optimized for Chromebook screens (1366×768). Toolbars scroll horizontally if they don't fit. Canvases auto-fit to the viewport.

---

## 5. Account Setup

### Step-by-step
1. Go to **pscomixx.com** and click **Sign Up**.
2. Choose your account type: **Creator** (free, full features) or **Student** (school-managed, restricted).
3. Enter email, username, and password.
4. Verify your email by clicking the link sent to your inbox.
5. Complete the **Character-First Onboarding** — pick a starting avatar, set your creator name, and choose your first creative path (Comics, Cards, VN, etc.).
6. You're dropped into the **Dashboard** with a Get Started checklist.

[SCREENSHOT: Sign-up screen]
[CALLOUTS: 1. Email field 2. Account-type toggle 3. Invite-code field (optional) 4. Sign-up button]

### Invite Codes
If you have an invite code (from a school, teacher, partner, or AppSumo), enter it on the sign-up screen. Some codes unlock pro features or class membership automatically.

### Forgot Password
Click **Forgot Password** on the login page → enter your email → check your inbox for a reset link (valid for 1 hour).

---

## 6. SSO / Single Sign-On

One login works across all four apps.

### How it works
- You log in once at PSCoMiXX (or any ecosystem app).
- Click **PS Streaming** or **Press Start LMS** in your sidebar — you're taken there already signed in.
- The system uses a short-lived JWT token to pass you between apps. No re-typing passwords.

### What syncs
- Username, profile, avatar
- XP, level, badges
- Subscription tier
- Portfolio URL

### Pro tip
If you log out of one app, you stay logged into the others. Use **Settings → Log out everywhere** to sign out of the entire ecosystem at once.

---

## 7. The XP System

XP (Experience Points) is the universal currency for progression.

### How you earn XP

| Action | XP |
|---|---|
| Publish a comic spread | 25 |
| Complete a daily streak | 10 |
| Finish a course module (LMS) | 50 |
| Get a vote/like on Streaming | 5 |
| Sell a project on the marketplace | 100 |
| Earn a certification | 250+ |

### Levels & Titles
Every 1,000 XP = 1 level. Levels unlock cosmetic badges, new templates, and (at higher tiers) exclusive marketplace privileges.

### Where to see your XP
- Sidebar bottom → XP bar with progress to next level
- **Achievements** tab → full breakdown
- **Skill Passport** → public proof of your level

### XP across apps
XP earned anywhere syncs back to your Hub profile within seconds. If something doesn't show up, hit the **Force Sync** button (sidebar XP bar → refresh icon).

---

## 8. Creator vs Student Accounts

| | Creator | Student |
|---|---|---|
| Marketplace browsing | ✅ | ✅ |
| Marketplace selling | ✅ | ❌ |
| Direct payments / Pricing page | ✅ | ❌ |
| Apprenticeships | ✅ | ❌ |
| Community Library | ✅ | ✅ |
| Portfolio | ✅ | ✅ (school-safe) |
| All creators / studios | ✅ | ✅ |
| LMS classroom features | Optional | Required |

Student accounts run in **school-safe mode**: stricter moderation, no direct payments, no DM with strangers, vetted asset libraries only.

---

## 9. Safety Features & Moderation

- **Pre-publish moderation** — every comic, motion clip, and asset goes through automated content scanning before becoming public.
- **Manual review queue** — admins review flagged content (`/admin/review-queue`).
- **School-safe mode** — restricts AI prompts, asset hosts, and external links.
- **Promo page allowlist** — promo and ad pages can only pull images from a vetted host list (no tracking pixels).
- **Report button** — every piece of content has a report flag for misuse.
- **AI consent gate** — before any AI generation runs, the user explicitly consents (Apple Guideline 5.1.2(i) compliant).

---

## 10. Press Start Hub

The Hub is the home base. It's the **Dashboard** screen at `/`.

### What's on it
- **Welcome banner** — your level, current streak, next unlock
- **Continue Working** cards — your most recent projects, one click to resume
- **Recommended Next Steps** — based on what you've made
- **Stage stats** (creators) — published count, total views, "Go to Stage" link to PS Streaming
- **Activity feed** — community highlights, your followers' new work
- **Announcements** — platform news, new features, events

[SCREENSHOT: Dashboard]
[CALLOUTS: 1. XP/level bar (sidebar) 2. Continue Working 3. Recommended 4. Your Stage 5. Activity Feed]

### Notifications
Top-right bell icon → in-app notifications for likes, comments, follows, sale alerts, classroom assignments, certification awards.

### Profile
Click your avatar (sidebar bottom) → **My Profile** to see your public creator page, recent uploads, certifications, and portfolio link.

---

## 11. PS CoMiXX

PSCoMiXX is the creation engine. There are six creator modes — pick one based on what you're making.

### How to choose

| Want to make… | Use this mode |
|---|---|
| A multi-page comic with panels | **Comic Builder** |
| A character / collectible card | **Trading Card Creator** |
| A dialogue-driven story with backgrounds | **Visual Novel** |
| A branching, choice-driven story | **CYOA Builder** |
| A book or comic cover | **Cover Creator** |
| A short, looping vertical animated story (TikTok-style) | **HOP Creator** |
| Frame-by-frame animation | **Motion Studio** |

---

### 11.1 Comic Builder (`/creator/comic`)

The flagship tool. Build multi-spread comics with panels, characters, dialogue, and effects.

#### What's on screen

[SCREENSHOT: Comic Builder Full View]
[CALLOUTS:
1. Top toolbar — New / Save / Export / Share / Publish / FX
2. Left tools panel — Pen / Eraser / Shape / Text / Panel / Asset
3. Center canvas — left page + right page (a "spread")
4. Right Layers panel — every panel, image, text box, sticker
5. Bottom — spread navigator (page numbers, add new spread)
6. Zoom slider]

#### Toolbar breakdown (top)
| Button | What it does |
|---|---|
| **New** | Create a fresh comic project |
| **Save** | Save to cloud (auto-saves every 30s) |
| **Export** | PNG, PDF, or `.pscomixx` zip |
| **Share** | Public preview link |
| **Publish** | Push to Community Library / your Stage |
| **FX** | Open FX Studio for the selected panel |
| **Promo** | Insert a sponsor / promo page |
| **Fullscreen** | Hide chrome, max canvas |

#### Tools panel (left)
- **Pen / Brush / Inkblade** — vector drawing surface for sketches and inking
- **Eraser** — soft or hard
- **Shape** — rectangle, circle, speech bubble, thought bubble, caption box
- **Text** — drag-to-place text with style presets
- **Panel** — draw a new panel border on the page
- **Asset** — open the asset library (characters, backgrounds, props, FX)

#### Layers panel (right)
- Drag to reorder
- Eye icon to hide/show
- Lock icon to prevent accidental edits
- Right-click for **Duplicate / Delete / Send to Back / Bring to Front**

#### Step-by-step: Make your first comic
1. Click **New** → name your comic.
2. Click **Panel** in the left tools, then drag on the page to draw a panel rectangle.
3. With the panel selected, click **Asset → Backgrounds** and drag one in.
4. Drag a character from **Asset → Characters** into the panel.
5. Click **Text → Speech Bubble**, place it, type dialogue.
6. Repeat for the second page of the spread.
7. Click **+** at the bottom navigator to add the next spread.
8. Click **Save** (or wait for auto-save).
9. When done, click **Publish** to share.

#### Pro tips
- Hold **Shift** while resizing to keep aspect ratio.
- Hold **Alt** while dragging to duplicate.
- Click a panel, then click **FX** in the toolbar — FX Studio opens with that panel pre-loaded.
- Use **Promo Page** to insert a styled sponsor or ad page between spreads (school-safe templates available).

#### Right-click menu
- Duplicate
- Delete
- Send to FX Studio
- Lock
- Convert text to bubble
- Replace asset

#### Common mistakes
- Drawing on the page background instead of inside a panel — switch to **Panel** tool first to define a panel, then add content inside.
- Forgetting to set page count — go to **Settings → Pages** to add or remove spreads.
- Exporting before saving — always Save first.

---

### 11.2 Trading Card Creator (`/creator/card`)

Make a single full-bleed card (front + optional back).

#### Workflow
1. Pick a card template (Trading, Character, Stat, Promo, Custom).
2. Drag in artwork.
3. Fill in name, attributes, stat fields.
4. Pick a frame style and rarity color.
5. **Export** as PNG (single) or print-ready PDF, or **Publish to Marketplace**.

#### Pro tips
- Click any text field for instant style options (font, weight, glow).
- Use the **Frame Library** to swap card borders without losing your art.
- Match the rarity color to your card's tier — collectors notice.

[SCREENSHOT: Card Creator]
[CALLOUTS: 1. Template picker 2. Card preview 3. Stat editor 4. Frame library 5. Export menu]

---

### 11.3 Visual Novel (`/creator/vn`)

Dialogue-driven scene editor with backgrounds, sprites, and a script timeline.

#### What's on screen
- **Scene preview** — center
- **Script timeline** — bottom (each line is one beat)
- **Sprite library** — right
- **Background library** — left

#### Step-by-step
1. Click **+ New Scene** → pick a background.
2. Drag a character sprite onto the stage.
3. Add a dialogue beat → type the line, pick the speaker.
4. Add another beat: change sprite expression, move to another position, advance dialogue.
5. **Preview** to play the scene.
6. **Export** to MP4 / WebM / image series, or **Publish** as an interactive web reader.

#### Pro tips
- Use the **Speaker dropdown** to control which character is "talking" — it auto-styles the bubble.
- Multiple sprites per beat are fine; toggle visibility per beat.
- The script is text — copy/paste it into a doc to edit a draft offline.

---

### 11.4 CYOA Builder (`/creator/cyoa`)

Branching choose-your-own-adventure stories.

#### Concept
Each "node" is a story page with text + image. Each node has 1-4 **choices** that link to other nodes.

#### Step-by-step
1. Start with the **Opening Node** (auto-created).
2. Write text, add an image.
3. Click **+ Choice** → label the choice ("Open the door"), then either **Link** to an existing node or **Create New**.
4. Repeat to grow the tree.
5. Use **Story Map** view to see the whole graph.
6. **Test** in the built-in reader.
7. **Publish** as a playable web story.

#### Pro tips
- Loop nodes back to early ones for replayable stories.
- Use the **Endings** tag for terminal nodes — the reader celebrates them.
- Watch the **Orphan check** — nodes with no incoming links are flagged.

---

### 11.5 Cover Creator (`/creator/cover`)

Make a polished comic / book / album cover with title, byline, and full-bleed art.

Workflow is the same shape as Card Creator: pick a template, drop artwork, edit text, export. Includes a **price tag** layer for marketplace listings.

---

### 11.6 HOP Creator (`/creator/hop`)

A **HOP** is a Hot One-Page Story — a vertical, short, looping piece optimized for streaming. Think TikTok meets webcomic.

#### Workflow
1. Pick aspect ratio (9:16 default).
2. Add background, characters, text, audio.
3. Use the **HOP timeline** to time reveals (text appears at 1.5s, character moves at 3s, etc.).
4. **Preview** in loop mode.
5. **Export** as MP4 / WebM / GIF.
6. **Publish to Stage** → goes straight to PS Streaming.

---

### 11.7 Motion Studio (`/creator/motion`)

Frame-by-frame animation studio with onion skin, layers, and timeline.

#### What's on screen

[SCREENSHOT: Motion Studio]
[CALLOUTS:
1. Tools sidebar (left)
2. Frame canvas (center)
3. Inspector / properties (right)
4. Timeline (bottom)
5. Playback controls
6. Export button (top right)]

#### Tools
- **Pen / Eraser / Brush**
- **Onion skin toggle** — see previous + next frame ghosts
- **Layer manager** — multiple layers per frame
- **Audio track** — drop in an MP3 or WAV

#### Step-by-step
1. Click **+ Frame** to add a new frame.
2. Draw or import an image.
3. Toggle **Onion Skin** to see the previous frame faintly.
4. Repeat — most short animations need 12-24 frames per second.
5. Press **Spacebar** to play.
6. Drop audio on the audio track.
7. **Export** as GIF, WebM, MP4, or sprite sheet.

#### Pro tips
- Use the **Duplicate Frame** button to start a new frame from the previous one.
- Lock background layers so you only animate the foreground.
- Export as **sprite sheet** for use in games.

---

### 11.8 Inkblade (Drawing Surface)

The vector drawing engine that powers brushes everywhere. Direct access at `/inkblade` (sandbox mode).

- Pressure-sensitive (with stylus)
- Vector lines — scale up cleanly
- Custom brush shapes via **Brush Lab**

---

### 11.9 AI Tools

Found under **AI Tools** in the sidebar.

#### Prompt Factory (`/tools/prompt`)
Turn rough ideas into polished prompts for AI image generation. Pick a style, mood, character, and Prompt Factory builds the full prompt for you.

#### Story Forge (`/tools/story`)
AI-assisted story brainstorming. Give it a logline, get a beat sheet, character list, and dialogue starters.

#### Import Center (`/tools/import`)
Bulk-import images, scripts, or `.pscomixx` projects from your computer.

#### FX Studio (link)
Opens **PS FX Studio** in a popup — see Section 12.

---

### 11.10 My Library & Portfolio

#### My Library (`/library`)
Every project you've ever made, filterable by type (comic, card, VN, etc.), date, status (draft, published, archived).

- Click any project to resume.
- Right-click → **Duplicate / Delete / Export / Publish / Move to Folder**.
- Bulk-select with **Shift+click**.

#### My Portfolio (`/portfolio`)
Your public showcase. Pick which projects appear, customize the theme.

- Choose layout (grid, magazine, slideshow)
- Pick a color theme or build a custom one
- Add an "About Me" section
- Pin your top 3 projects to the top
- Share the link: `pscomixx.com/portfolio/your-username`

---

### 11.11 Print Studio (`/print-studio`)

Order physical prints of your work.

- **Print Studio** — main shop
- **Export Dashboard** — track print jobs
- **Packages** — bulk print bundles for classrooms / stores
- **Request Quote** — custom orders

---

### 11.12 Marketplace

See Section 16.

---

### 11.13 Community Library (`/community`)

Browse, read, and like other creators' published work.

- **Featured** — editor's picks
- **New** — most recent uploads
- **Series** — multi-part stories
- **Genre filters** — sci-fi, fantasy, slice-of-life, etc.
- **Read inline** with the built-in **Comic Reader**

Click the **heart** to like, **bookmark** to save, **+ Follow** the creator.

---

## 12. PS FX Studio

Lives at **pscomixx.online**. Opens as a popup from the FX button in any creator tab.

### Modes
- **FX** — general effects browser
- **Character** — AI character generator
- **Portrait** — face-focused portraits
- **Graffiti** — text effects, stylized type
- **BGFX** — background generator
- **Filter** — apply filters to existing art
- **Cover** — cover-style FX
- **Layout** — page-layout FX
- **Overlay** — semi-transparent overlays
- **Price Tag** — marketplace stickers
- **Title** — title cards
- **Bubble** — speech-bubble styles
- **Script** — handwritten / script fonts
- **HOPs** — short-clip FX

### Workflow: Apply an FX to a comic panel
1. In Comic Builder, click a panel.
2. Click the **FX** button in the toolbar.
3. FX Studio opens in a new tab; the bottom status bar in CoMiXX turns yellow → green when handshake completes.
4. Pick an effect, customize, hit **Send to Comic**.
5. The asset appears back in your panel automatically.
6. A success toast confirms: *"Asset received: [name] → Panel"*.

[SCREENSHOT: FX Studio Main]
[CALLOUTS: 1. Mode tabs 2. Effect grid 3. Preview 4. Customize panel 5. Send to Comic button]

### Asset Lab
Pre-export workspace for any FX. Crop, mask, remove background, color-shift before sending.

### Background Removal
One-click — built into Asset Lab.

### Mobile / Tablet controls
Touch-optimized; pinch to zoom, two-finger pan. Stylus pressure supported.

### If the connection bar stays yellow
The FX Studio app needs the handshake snippet installed. Admins: see `docs/desktop-setup/FX_STUDIO_HANDSHAKE.md`.

---

## 13. PS Streaming

Lives at **psstreaming.com**. Open from the sidebar **PS Streaming** link (SSO).

### What it is
The discovery, viewing, and live-event surface for everything published from CoMiXX (especially HOPs and motion clips).

### Sections
- **Channels** — creators you follow + curated channels
- **Discovery** — trending, new, recommended for you
- **Live Events** — scheduled premieres, watch parties
- **Voting** — vote on entries in active contests
- **Leaderboards** — top creators by week / month / all-time
- **Your Stage** — your published content + analytics

### Uploading
HOPs and motion clips published from CoMiXX appear here automatically. You can also upload directly via the upload button.

### XP integration
Every view, like, vote, and comment earns small XP for both viewer and creator.

### Moderation
Same review queue as CoMiXX — content is auto-scanned, manually reviewed if flagged.

### Analytics
Per-creator dashboard: views, watch time, likes, comments, follower growth, top countries.

---

## 14. Press Start LMS

Lives at **pressstart.tech**. SSO from sidebar.

### For Students
- **My Courses** — enrolled curricula
- **Assignments** — current and past
- **Submit Work** — drop a CoMiXX project URL or upload directly
- **Progress** — XP, completion %, certifications earned
- **Portfolio** — auto-syncs from CoMiXX

### For Teachers
- **Classroom** — student roster, invite codes
- **Assignment Builder** — pick a creative tool, set rubric, due date
- **Submission Review** — see student work inline (CoMiXX viewer embedded)
- **Grade & Feedback** — per-student notes + rubric scoring
- **Class Analytics** — engagement, completion, XP trends
- **Certifications** — award skill certifications that appear in student portfolios

### Recommended assignment workflow
1. Teacher creates an assignment: "Make a 4-spread sci-fi comic."
2. Students click the assignment link → it deep-links into CoMiXX with a starter template.
3. Students create, save, hit **Submit to LMS** in the CoMiXX share menu.
4. Teacher reviews, grades, awards XP and an optional certification.
5. Certified work auto-appears in the student's Skill Passport.

---

## 15. Publishing Pipeline

A standard "create → publish" flow:

```
[Draft in CoMiXX] ──► [Save] ──► [Publish] ──► [Moderation] ──► [Live]
                                       │
                                       ├──► Community Library (everyone)
                                       ├──► Your Stage (your followers + Streaming)
                                       ├──► Portfolio (your public profile)
                                       └──► Marketplace (if priced)
```

### How to publish
1. In any creator, click **Publish** (top toolbar).
2. Pick visibility: **Public**, **Unlisted**, or **Private**.
3. Pick destinations: Community Library, Your Stage, Portfolio, Marketplace.
4. Add tags and a short description.
5. Click **Publish** — content enters the moderation queue.
6. Most submissions clear in under 60 seconds. Flagged ones go to manual review.

### After publishing
- You get a shareable URL.
- Creators earn XP per view and per like.
- Analytics show views, demographics, retention.

---

## 16. Marketplace System

### Browsing (`/marketplace`)
Browse projects, asset packs, character bundles, brushes, templates. Filter by category, price, rarity, creator level.

### Buying
Click any item → **Add to Cart** → checkout via Stripe → asset unlocks in your Library.

### Selling (Creators only, `/marketplace/sell`)
1. Open the project you want to sell.
2. Click **Publish → Marketplace**.
3. Set price (USD), description, preview images.
4. Pick license (personal use / commercial / royalty-free).
5. Submit. Marketplace review takes ~24 hours.
6. Once approved, your item is live. You earn 70% per sale (30% platform fee).

### Payouts
Connect a Stripe account in **Settings → Payouts**. Earnings are paid weekly once you cross $25.

### Marketplace XP
You earn XP for every sale. Top sellers get featured placement.

---

## 17. Portfolio Features

### What it is
Your public creator page at `pscomixx.com/portfolio/your-username` — what teachers, recruiters, classmates, and fans see.

### Customization
- **Theme** — color, font, layout (grid / magazine / slideshow)
- **Header** — banner image, tagline, links to social
- **Pinned Projects** — your top 3 at the top
- **Sections** — About Me, Skills, Certifications, Recent Work, Contact
- **Portfolio Theme contracts** — themes are defined in `client/src/lib/portfolioTheme.ts` for consistent branding

### Skill Passport (`/passport/your-username`)
A condensed, certification-first version of your portfolio designed for academic / employer audiences.

### Embed your portfolio
Copy the **Embed code** from Settings → Portfolio to put your work on any external site.

---

## 18. Cross-Platform Sync

| What | Synced via | Latency |
|---|---|---|
| Login | SSO JWT | Instant |
| XP | Background sync engine | <5 seconds |
| Profile / avatar | Hub propagation | <10 seconds |
| Published projects | Streaming API | <30 seconds |
| Certifications | LMS → Hub → Portfolio | <30 seconds |
| Marketplace earnings | Stripe webhook | Real-time |

If something doesn't sync, hit **XP Force Sync** in the sidebar XP bar.

### Offline
- Editing existing projects works offline.
- Saves are queued and pushed when you reconnect.
- AI features and publishing require internet.
- Pending changes appear in the sidebar with a count.

---

## 19. Recommended Workflows

### Solo creator (comic series)
1. **Plan** in Story Forge — beat sheet, characters.
2. **Draft characters** in FX Studio (Character mode).
3. **Build comic** in Comic Builder, panel by panel.
4. **Polish** with FX Studio for special effects.
5. **Publish** to Community Library and Your Stage.
6. **Promote** via PS Streaming.
7. **Sell** asset packs (templates, brushes) on Marketplace.

### Classroom (teacher)
1. Create assignment in LMS.
2. Students complete in CoMiXX.
3. Submit to LMS.
4. Teacher grades, awards certification.
5. Certified work appears in student portfolios + Skill Passports.

### Studio (commercial)
1. Build IP in CoMiXX.
2. Maintain canon assets in shared Library.
3. Publish episodes to Streaming.
4. Monetize via Marketplace asset packs.
5. Use analytics to track audience growth.

### School-safe creative club
1. All accounts created as Student type.
2. Marketplace, Pricing, Apprenticeships hidden via admin flags.
3. Curated featured-content channel for inspiration.
4. Weekly publishing event with leaderboard.

---

## 20. Keyboard Shortcuts

### Universal
| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + D` | Duplicate selection |
| `Ctrl/Cmd + C / V / X` | Copy / paste / cut |
| `Delete` | Delete selection |
| `Esc` | Cancel current action |
| `?` | Show shortcut overlay |

### Comic Builder
| Shortcut | Action |
|---|---|
| `P` | Panel tool |
| `T` | Text tool |
| `B` | Brush |
| `E` | Eraser |
| `A` | Asset library |
| `+ / -` | Zoom in / out |
| `0` | Zoom to 100% |
| `F` | Fullscreen toggle |
| `Space (hold) + drag` | Pan canvas |

### Motion Studio
| Shortcut | Action |
|---|---|
| `Spacebar` | Play / pause |
| `←` / `→` | Previous / next frame |
| `O` | Onion skin toggle |
| `N` | New frame |
| `Shift + N` | Duplicate frame |
| `L` | New layer |

### FX Studio
| Shortcut | Action |
|---|---|
| `R` | Regenerate |
| `Enter` | Send to Comic |
| `M` | Toggle mask tool |

---

## 21. Troubleshooting

### Login / SSO

**"Could not generate SSO link"**
→ The target app's API is unreachable. Try direct login at the app URL. If it persists, check your network.

**Logged in to CoMiXX but logged out of Streaming**
→ Click the Streaming link in the sidebar — SSO will re-authenticate you automatically.

### FX Studio

**FX status bar stuck on yellow "Handshaking…"**
→ FX Studio app at pscomixx.online doesn't have the handshake snippet. Admin must install it (`docs/desktop-setup/FX_STUDIO_HANDSHAKE.md`).

**Popup blocked**
→ Allow popups for pscomixx.com in your browser. Then try again.

**Asset never returns**
→ Check the FX Studio tab is still open. Re-open if closed mid-session.

### Comic Builder

**Canvas is tiny on Chromebook**
→ Already fixed in latest update. Force-refresh (Ctrl+Shift+R) to load the new responsive layout.

**Toolbar buttons cut off**
→ Scroll the toolbar horizontally — it scrolls on small screens.

**Auto-save isn't working**
→ Check your internet connection. Pending saves queue offline and push when reconnected.

### Publishing

**Stuck in moderation > 5 min**
→ Likely flagged for manual review. Wait up to 24 hours, or contact support with project ID.

**Publish button greyed out**
→ Project must be saved first. Hit Save, then Publish.

### Marketplace

**Sale not showing in payouts**
→ Stripe webhook may be delayed. Check **Settings → Payouts** the next day.

**Item rejected by review**
→ Check the rejection reason in the marketplace dashboard. Most common: missing license, low-resolution preview, duplicated asset.

### Performance

**Editor laggy**
→ Close other tabs. Lower zoom. Hide layers you're not editing. Disable Onion Skin if not needed.

**Out of memory on Chromebook**
→ Save and reload. Use **My Library** to keep one project open at a time.

---

## 22. FAQ

**Q: Is it free?**
A: Free tier covers everything for personal use. Paid tiers unlock higher AI quotas, more storage, and marketplace selling.

**Q: Do I own what I make?**
A: Yes, 100%. You retain full IP rights to all work created on the platform.

**Q: Can I use my work commercially?**
A: Yes — your original work, freely. Marketplace assets are governed by their individual licenses (always check).

**Q: Does it work offline?**
A: Editing existing projects, yes. AI features, publishing, and marketplace require internet.

**Q: Where's my data stored?**
A: Cloud (Replit Object Storage, encrypted). Tauri desktop app also keeps a local copy as a `.pscomixx` zip for offline access.

**Q: Can I export and leave?**
A: Yes. **Export → Full Backup** gives you a `.pscomixx` zip of all your projects.

**Q: How do I delete my account?**
A: Settings → Account → Delete Account. 30-day grace period before permanent deletion.

**Q: Is my child's data safe?**
A: Student accounts run in school-safe mode with stricter moderation, no direct payments, and FERPA/COPPA-aligned controls.

**Q: Can I use my own AI prompts?**
A: Yes, in Creator accounts. Student accounts have curated prompt templates only.

**Q: Where do I report a bug?**
A: Settings → Help → Report a Bug, or email support listed on `/contact`.

---

## 23. Best Practices

### Creators
- **Save often.** Auto-save is your safety net, not your strategy.
- **Name projects clearly.** "Untitled (43)" is your enemy.
- **Tag everything.** Better tags = better discovery.
- **Build a series.** Returning audiences come from consistency.
- **Publish weekly** to stay on the leaderboards.
- **Engage** — like and comment back. Community is the multiplier.

### Teachers
- Use **invite codes** to add students in bulk.
- Build **rubrics** before assigning — students do better with clear targets.
- Award **certifications** sparingly so they retain value.
- Schedule a **weekly publishing event** so kids see their work shared.

### Studios
- Use **shared library folders** for canon assets.
- Tag everything with project + episode metadata.
- Use **Marketplace asset packs** as a secondary revenue stream.
- Publish trailers as **HOPs** to drive traffic to long-form work.

### Schools (admin)
- Audit `/admin/feature-flags` weekly to keep the surface tight for kids.
- Review flagged content within 24 hours.
- Run a quarterly student showcase via **PS Streaming** live events.

---

## 24. Glossary

| Term | Meaning |
|---|---|
| **Spread** | Two facing pages of a comic |
| **Panel** | A single bordered frame inside a comic page |
| **Sprite** | A character image with multiple expressions/poses |
| **Beat** | One step in a Visual Novel script |
| **Node** | A page in a CYOA story |
| **HOP** | Hot One-Page Story — short vertical looping clip |
| **Spread navigator** | Bottom strip showing all spreads in a comic |
| **Onion skin** | Faint ghost of previous/next animation frame |
| **FX** | Effects produced in PS FX Studio |
| **SSO** | Single sign-on across ecosystem apps |
| **XP** | Experience Points — universal progression currency |
| **Skill Passport** | Public certification-focused profile |
| **Stage** | A creator's personal Streaming channel |
| **Inkblade** | The vector drawing engine that powers brushes |
| **Asset Lab** | Pre-export workspace inside FX Studio |
| **Promo Page** | Sponsored or themed page inserted between comic spreads |
| **Feature Flag** | Admin toggle to show/hide a tab or feature |
| **Tauri** | The desktop wrapper framework |
| **Capacitor** | The mobile wrapper framework |
| **`.pscomixx`** | Project file format (a zip) |

---

## 25. Appendix A — Screenshot Checklist

Production: capture each screen in both **Light** and **Dark** mode at 1920×1080 (and 1366×768 for Chromebook callouts).

### Hub
- [ ] Sign-up screen
- [ ] Login screen
- [ ] Onboarding (character pick)
- [ ] Dashboard (full)
- [ ] Profile page
- [ ] Notifications panel

### CoMiXX Comic Builder
- [ ] Empty new project
- [ ] Mid-project full view (annotated)
- [ ] Toolbar close-up
- [ ] Layers panel close-up
- [ ] Asset library open
- [ ] Promo page editor
- [ ] Publish modal

### CoMiXX other modes
- [ ] Card Creator
- [ ] Visual Novel scene editor
- [ ] CYOA story map
- [ ] Cover Creator
- [ ] HOP timeline
- [ ] Motion Studio with onion skin

### FX Studio
- [ ] Mode tabs
- [ ] Character generator
- [ ] BGFX result
- [ ] Asset Lab
- [ ] Background removal before/after
- [ ] Send-to-Comic flow

### Streaming
- [ ] Discovery page
- [ ] Channel page
- [ ] HOP playback
- [ ] Live event page
- [ ] Leaderboard
- [ ] Creator analytics

### LMS
- [ ] Student dashboard
- [ ] Teacher dashboard
- [ ] Assignment builder
- [ ] Submission review
- [ ] Certifications page

### Cross-cutting
- [ ] Sidebar (expanded + collapsed)
- [ ] Sidebar (Chromebook narrow)
- [ ] Admin Control Room (Feature Flags tab)
- [ ] Marketplace browse
- [ ] Marketplace sell flow
- [ ] Portfolio (light + dark themes)
- [ ] Skill Passport

---

## 26. Appendix B — Beginner Quick Start

**Goal: publish your first comic in under 30 minutes.**

1. Sign up at pscomixx.com.
2. Pick "Comics" in onboarding.
3. Land on Dashboard → click **Get Started**.
4. Pick the **Comic Builder** quick-start template.
5. Use the example characters and backgrounds. Don't draw from scratch.
6. Type dialogue into the pre-placed speech bubbles.
7. Add 1 more spread.
8. Hit **Save**, then **Publish → Public**.
9. Share the link with one friend.
10. Done. You shipped. Now make 9 more.

---

## 27. Appendix C — Advanced Creator Workflow

### Weekly publishing pipeline
- **Monday** — outline next episode (Story Forge).
- **Tuesday** — draft characters / backgrounds in FX Studio.
- **Wednesday** — block out panels in Comic Builder.
- **Thursday** — dialogue + lettering pass.
- **Friday** — FX polish + cover.
- **Saturday** — publish + cross-post HOP teaser to Streaming.
- **Sunday** — engage with community, plan next week.

### Asset organization
- One folder per series.
- Subfolders: `characters/`, `backgrounds/`, `props/`, `fx/`, `covers/`.
- Reuse character sprites — don't redraw.

### Monetization layers
1. **Free** comic on Community Library → builds audience.
2. **Marketplace** — sell character pack, cover templates, brushes you used.
3. **Premium episodes** — paid unlock.
4. **Print** via Print Studio — physical copies for fans.

---

## 28. Appendix D — Teacher / Classroom Workflow

### Setup (one-time)
1. Create a Teacher account.
2. Generate classroom invite code (LMS → Classroom → Invite).
3. Distribute to students.
4. Approve students as they join.

### Each unit
1. Create assignment with rubric and due date.
2. Link a CoMiXX template.
3. Students work in class / at home.
4. Submit via CoMiXX **Share → Submit to LMS**.
5. Review + grade in LMS.
6. Award certification for top work.

### End of term
- Run a **PS Streaming** live event showcasing the best student work.
- Export each student's portfolio PDF for parents / report cards.
- Reset classroom for next cohort (LMS → Classroom → Archive).

---

## 29. Appendix E — Troubleshooting Reference

### Top 10 issues, in order of frequency

1. **FX won't connect** → handshake snippet missing on FX Studio side.
2. **Canvas tiny on Chromebook** → force refresh.
3. **Lost work** → check My Library → trash; check local Tauri backup.
4. **Login failed** → password reset; check email for verification link.
5. **Publish stuck** → check moderation status in Library.
6. **AI generation failed** → check daily quota; try again in 1 minute.
7. **Sale not credited** → 24-hour Stripe webhook delay.
8. **Slow editor** → close other tabs; lower zoom; disable Onion Skin.
9. **Sync conflict** → resolve via sidebar conflict modal (Keep Local / Keep Server / Keep Both).
10. **Missing tab in sidebar** → admin has hidden it via Feature Flag; ask admin or check if you have a Student account.

### Admin-only diagnostics
- `/admin` → Feature Flags (toggle visibility)
- `/admin/review-queue` → moderation
- `/admin/control` → user roster, invite codes, AppSumo redemption, audit logs
- `/analytics` → platform-wide stats

### Production support
- **Server logs:** Replit deployment logs panel
- **Database health:** Settings → System → DB Status
- **Stripe webhook:** Settings → Integrations → Stripe → Webhook Status
- **Object storage usage:** Settings → System → Storage

---

## End of Guide

**Version 1.0 — Production Edition**
For corrections or additions, edit `/docs/USER_GUIDE.md` in the repository. This guide is intentionally checked into source control so it ships with every release.

> *"Make something today."* — Press Start | MADMIXEDMEDIA
