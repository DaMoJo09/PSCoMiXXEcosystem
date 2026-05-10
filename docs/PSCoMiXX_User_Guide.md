# PSCoMiXX

## Official User Guide

**Version 1.0 — Production Edition**
*For creators, students, teachers, and schools.*

---

\newpage

## Table of Contents

1. Introduction
2. What PSCoMiXX Is
3. System Requirements
4. Account Setup
5. The Sidebar — Your Map
6. The XP System
7. Creator vs Student Accounts
8. Safety & Moderation
9. Comic Builder
10. Trading Card Creator
11. Visual Novel
12. CYOA Builder
13. Cover Creator
14. HOP Creator
15. Motion Studio
16. Inkblade (Drawing Surface)
17. AI Tools — Prompt Factory & Story Forge
18. FX Studio Bridge
19. My Library
20. My Portfolio
21. Print Studio
22. Marketplace
23. Community Library
24. Publishing Pipeline
25. Cross-Platform Sync (Web · Desktop · Mobile)
26. Keyboard Shortcuts
27. Troubleshooting
28. FAQ
29. Best Practices
30. Glossary
31. Appendix A — Beginner Quick Start
32. Appendix B — Advanced Creator Workflow
33. Appendix C — Teacher / Classroom Workflow
34. Appendix D — Screenshot Checklist

---

\newpage

## 1. Introduction

PSCoMiXX is the creation engine of the Press Start ecosystem. It lets anyone — from a 10-year-old on a Chromebook to a working studio — make **comics, trading cards, visual novels, choose-your-own-adventure stories, motion clips, covers, and HOPs**, then publish, share, and even sell them.

This guide walks through every mode, every menu, and every workflow. If you read it cover to cover, you can use the entire app confidently without help.

> **How to use this guide**
> - First time? Skip to **Appendix A — Beginner Quick Start**.
> - Teacher? Jump to **Appendix C — Teacher / Classroom Workflow**.
> - Stuck? See **Section 27 — Troubleshooting**.

---

## 2. What PSCoMiXX Is

PSCoMiXX is one app with **seven creator modes** plus AI assistants, a marketplace, a portfolio system, and a print shop. It runs on the web, on desktop (Mac/Windows/Linux), and on mobile (iOS/Android).

| Mode | What you make |
|---|---|
| **Comic Builder** | Multi-page comics with panels, characters, dialogue |
| **Trading Card Creator** | Single collectible cards with stats, frames, rarity |
| **Visual Novel** | Dialogue-driven scenes with sprites and backgrounds |
| **CYOA Builder** | Branching choose-your-own-adventure stories |
| **Cover Creator** | Book / comic / album covers |
| **HOP Creator** | Short vertical looping stories (TikTok-style) |
| **Motion Studio** | Frame-by-frame animation |

---

## 3. System Requirements

### Web (recommended for everyone)
- **Browser:** Chrome 110+, Edge 110+, Safari 16+, Firefox 110+
- **RAM:** 4 GB minimum, 8 GB recommended
- **Resolution:** 1280 × 720 minimum (works on Chromebooks)
- **Internet:** required for AI, publishing, marketplace; offline editing supported for existing projects

### Desktop App
- **Mac:** macOS 11+
- **Windows:** Windows 10 1809+
- **Linux:** Ubuntu 20.04+ or equivalent
- The desktop app is a thin wrapper around the web app — updates push automatically when we publish; no reinstall.

### Mobile
- **iOS:** 14+
- **Android:** Android 8 (API 26)+
- Touch-optimized UI; full editor on tablets, lighter editor on phones.

> **Chromebook note:** Editors auto-fit the screen. Toolbars scroll horizontally if they don't fit. No setup required.

---

\newpage

## 4. Account Setup

1. Go to **pscomixx.com** and click **Sign Up**.
2. Choose your account type: **Creator** (full features) or **Student** (school-managed).
3. Enter email, username, and password.
4. Verify your email by clicking the link in your inbox.
5. Complete the **Character-First Onboarding** — pick an avatar, set your creator name, choose your starting path.
6. You land on the **Dashboard** with a Get Started checklist.

```
[ INSERT SCREENSHOT — Sign-up screen ]
Suggested callouts:
  1. Email field
  2. Account-type toggle (Creator / Student)
  3. Invite-code field (optional)
  4. Sign-up button
```

### Invite Codes
If you have an invite code (school, teacher, partner, AppSumo), enter it on the sign-up screen. Some codes unlock pro features or class membership automatically.

### Forgot Password
Click **Forgot Password** → enter email → use the reset link sent to your inbox (valid for 1 hour).

---

## 5. The Sidebar — Your Map

The left sidebar is your navigation. Every section in this guide corresponds to a sidebar item.

```
[ INSERT SCREENSHOT — Sidebar (full, expanded) ]
Suggested callouts:
  1. Dashboard
  2. Get Started
  3. Creator modes (Comic, Card, VN, CYOA, Cover, HOP, Motion)
  4. AI Tools (Prompt Factory, Story Forge, FX, Import)
  5. My Library
  6. My Portfolio
  7. Marketplace
  8. Community Library
  9. Print Studio
  10. Achievements / Certifications / Rewards
  11. XP bar (bottom)
  12. Avatar / Profile menu
```

> **Admin tip:** Every sidebar item can be turned on or off per school in **/admin → Feature Flags**. If a tab is missing, it's been hidden by an admin.

---

\newpage

## 6. The XP System

XP (Experience Points) is the universal progression currency.

### How you earn XP

| Action | XP |
|---|---|
| Publish a comic spread | 25 |
| Complete a daily streak | 10 |
| Finish a course module (LMS) | 50 |
| Get a vote / like on Streaming | 5 |
| Sell a project on the marketplace | 100 |
| Earn a certification | 250+ |

### Levels & Titles
Every 1,000 XP = 1 level. Levels unlock cosmetic badges, new templates, and exclusive marketplace privileges at higher tiers.

### Where to see your XP
- **Sidebar bottom** — XP bar with progress to next level
- **Achievements** tab — full breakdown
- **Skill Passport** — public proof of your level

If XP doesn't show up after an action, hit the **Force Sync** icon on the sidebar XP bar.

---

## 7. Creator vs Student Accounts

| | Creator | Student |
|---|---|---|
| Marketplace browsing | Yes | Yes |
| Marketplace selling | Yes | No |
| Direct payments / Pricing page | Yes | No |
| Apprenticeships | Yes | No |
| Community Library | Yes | Yes |
| Portfolio | Yes | Yes (school-safe) |
| All creators / studios | Yes | Yes |
| LMS classroom features | Optional | Required |

Student accounts run in **school-safe mode**: stricter moderation, no payments, no DM with strangers, vetted asset libraries only.

---

## 8. Safety & Moderation

- **Pre-publish moderation** — every comic, motion clip, and asset is auto-scanned before going public.
- **Manual review queue** — admins review flagged content (`/admin/review-queue`).
- **School-safe mode** — restricts AI prompts, asset hosts, and external links.
- **Promo page allowlist** — promo and ad pages only pull images from a vetted host list (no tracking pixels).
- **Report button** — every piece of content has a report flag.
- **AI consent gate** — before any AI generation runs, the user explicitly consents.

---

\newpage

# PART II — THE CREATOR MODES

\newpage

## 9. Comic Builder

**Sidebar:** Comic Builder · **URL:** `/creator/comic`

The flagship tool. Build multi-spread comics with panels, characters, dialogue, and effects.

```
[ INSERT SCREENSHOT — Comic Builder full view ]
Suggested callouts:
  1. Top toolbar (New / Save / Export / Share / Publish / FX)
  2. Left tools panel (Pen, Eraser, Shape, Text, Panel, Asset)
  3. Center canvas — left page + right page (a "spread")
  4. Right Layers panel (every panel, image, text, sticker)
  5. Bottom spread navigator (page numbers, "+ add spread")
  6. Zoom slider
```

### Top toolbar

| Button | What it does |
|---|---|
| **New** | Create a fresh comic project |
| **Save** | Save to cloud (auto-saves every 30 s) |
| **Export** | PNG, PDF, or `.pscomixx` zip |
| **Share** | Public preview link |
| **Publish** | Push to Community Library / your Stage |
| **FX** | Open FX Studio for the selected panel |
| **Promo** | Insert a sponsor / promo page |
| **Fullscreen** | Hide chrome, max canvas |

### Left tools panel
- **Pen / Brush / Inkblade** — vector drawing surface
- **Eraser** — soft or hard
- **Shape** — rectangle, circle, speech bubble, thought bubble, caption
- **Text** — drag-to-place text with style presets
- **Panel** — draw a new panel border
- **Asset** — open the asset library (characters, backgrounds, props, FX)

### Right Layers panel
- Drag to reorder
- Eye icon to hide/show
- Lock icon to prevent accidental edits
- Right-click for **Duplicate / Delete / Send to Back / Bring to Front**

### Step-by-step: your first comic
1. Click **New** → name your comic.
2. Click **Panel** in the left tools, then drag on the page to draw a panel.
3. With the panel selected, **Asset → Backgrounds**, drag one in.
4. Drag a character from **Asset → Characters** into the panel.
5. **Text → Speech Bubble**, place it, type dialogue.
6. Repeat for the second page of the spread.
7. Click **+** at the bottom navigator to add the next spread.
8. Click **Save** (or wait for auto-save).
9. When done, **Publish**.

```
[ INSERT SCREENSHOT — Comic Builder mid-project ]
Suggested callouts:
  1. Selected panel (highlighted border)
  2. Asset library open (Characters tab)
  3. Speech bubble being placed
  4. Layers list growing on the right
```

### Pro tips
- Hold **Shift** while resizing to keep aspect ratio.
- Hold **Alt** while dragging to duplicate.
- Click a panel, then click **FX** in the toolbar — FX Studio opens with that panel pre-loaded.
- Use **Promo Page** to insert a sponsor or ad page between spreads (school-safe templates available).

### Right-click menu
Duplicate · Delete · Send to FX Studio · Lock · Convert text to bubble · Replace asset

### Common mistakes
- Drawing on the page background instead of inside a panel — switch to **Panel** tool first to define a panel, then add content inside.
- Forgetting to set page count — go to **Settings → Pages** to add or remove spreads.
- Exporting before saving — always Save first.

---

\newpage

## 10. Trading Card Creator

**Sidebar:** Card Creator · **URL:** `/creator/card`

Make a single full-bleed card (front + optional back).

```
[ INSERT SCREENSHOT — Card Creator ]
Suggested callouts:
  1. Template picker (Trading / Character / Stat / Promo / Custom)
  2. Card preview (center)
  3. Stat editor (right)
  4. Frame library (left)
  5. Export menu (top right)
```

### Workflow
1. Pick a card template.
2. Drag in artwork.
3. Fill in name, attributes, stat fields.
4. Pick a frame style and rarity color.
5. **Export** as PNG (single) or print-ready PDF, or **Publish to Marketplace**.

### Pro tips
- Click any text field for instant style options (font, weight, glow).
- Use the **Frame Library** to swap card borders without losing your art.
- Match the rarity color to your card's tier — collectors notice.

---

\newpage

## 11. Visual Novel

**Sidebar:** Visual Novel · **URL:** `/creator/vn`

Dialogue-driven scene editor with backgrounds, sprites, and a script timeline.

```
[ INSERT SCREENSHOT — Visual Novel scene editor ]
Suggested callouts:
  1. Background library (left)
  2. Scene preview (center)
  3. Sprite library (right)
  4. Script timeline (bottom — each line is one beat)
  5. Speaker dropdown
  6. Preview / Play button
```

### Step-by-step
1. Click **+ New Scene** → pick a background.
2. Drag a character sprite onto the stage.
3. Add a dialogue beat → type the line, pick the speaker.
4. Add another beat: change sprite expression, move to another position, advance dialogue.
5. **Preview** to play the scene.
6. **Export** as MP4 / WebM / image series, or **Publish** as an interactive web reader.

### Pro tips
- Use the **Speaker dropdown** to control which character is "talking" — it auto-styles the bubble.
- Multiple sprites per beat are fine; toggle visibility per beat.
- The script is text — copy/paste into a doc to edit a draft offline.

---

\newpage

## 12. CYOA Builder

**Sidebar:** CYOA Builder · **URL:** `/creator/cyoa`

Branching choose-your-own-adventure stories.

```
[ INSERT SCREENSHOT — CYOA story map ]
Suggested callouts:
  1. Opening node (top)
  2. Branching choices (arrows)
  3. Ending node (highlighted)
  4. Orphan-check warning (if any)
  5. Test / Play button
```

### Concept
Each "node" is a story page with text + image. Each node has 1–4 **choices** that link to other nodes.

### Step-by-step
1. Start with the **Opening Node** (auto-created).
2. Write text, add an image.
3. Click **+ Choice** → label the choice ("Open the door"), then either **Link** to an existing node or **Create New**.
4. Repeat to grow the tree.
5. Use **Story Map** view to see the whole graph.
6. **Test** in the built-in reader.
7. **Publish** as a playable web story.

### Pro tips
- Loop nodes back to early ones for replayable stories.
- Tag terminal nodes as **Endings** so the reader celebrates them.
- Watch the **Orphan check** — nodes with no incoming links are flagged.

---

\newpage

## 13. Cover Creator

**Sidebar:** Cover Creator · **URL:** `/creator/cover`

Make polished comic, book, or album covers with title, byline, and full-bleed art.

```
[ INSERT SCREENSHOT — Cover Creator ]
Suggested callouts:
  1. Template picker
  2. Cover canvas
  3. Title / byline editor
  4. Price-tag layer (for marketplace listings)
  5. Export menu
```

Workflow is the same shape as Card Creator: pick a template, drop in artwork, edit text, export.

---

## 14. HOP Creator

**Sidebar:** HOP Creator · **URL:** `/creator/hop`

A **HOP** is a Hot One-Page Story — a vertical, short, looping piece optimized for streaming.

```
[ INSERT SCREENSHOT — HOP Creator ]
Suggested callouts:
  1. 9:16 vertical canvas
  2. HOP timeline (bottom)
  3. Asset / audio panel (right)
  4. Loop preview button
  5. Export / Publish to Stage
```

### Workflow
1. Pick aspect ratio (9:16 default).
2. Add background, characters, text, audio.
3. Use the **HOP timeline** to time reveals (text at 1.5 s, character moves at 3 s, etc.).
4. **Preview** in loop mode.
5. **Export** as MP4 / WebM / GIF.
6. **Publish to Stage** — goes straight to PS Streaming.

---

\newpage

## 15. Motion Studio

**Sidebar:** Motion Studio · **URL:** `/creator/motion`

Frame-by-frame animation studio with onion skin, layers, and timeline.

```
[ INSERT SCREENSHOT — Motion Studio full view ]
Suggested callouts:
  1. Tools sidebar (left)
  2. Frame canvas (center)
  3. Inspector / properties (right)
  4. Timeline (bottom — every frame)
  5. Playback controls
  6. Export button (top right)
  7. Onion-skin toggle
```

### Tools
- **Pen / Eraser / Brush**
- **Onion skin toggle** — see previous + next frame as ghosts
- **Layer manager** — multiple layers per frame
- **Audio track** — drop in an MP3 or WAV

### Step-by-step
1. Click **+ Frame** to add a new frame.
2. Draw or import an image.
3. Toggle **Onion Skin** to see the previous frame faintly.
4. Repeat — most short animations need 12–24 frames per second.
5. Press **Spacebar** to play.
6. Drop audio on the audio track.
7. **Export** as GIF, WebM, MP4, or sprite sheet.

### Pro tips
- Use **Duplicate Frame** to start a new frame from the previous one.
- Lock background layers so you only animate the foreground.
- Export as **sprite sheet** for use in games.

---

\newpage

## 16. Inkblade (Drawing Surface)

**Sidebar:** Inkblade · **URL:** `/inkblade`

The vector drawing engine that powers brushes everywhere. Direct access for sandbox practice and custom brush design.

```
[ INSERT SCREENSHOT — Inkblade sandbox ]
Suggested callouts:
  1. Brush picker
  2. Pressure curve
  3. Canvas
  4. Brush Lab (custom shapes)
```

- Pressure-sensitive (with stylus)
- Vector lines — scale up cleanly
- Custom brush shapes via **Brush Lab**

---

## 17. AI Tools — Prompt Factory & Story Forge

### Prompt Factory · `/tools/prompt`
Turn rough ideas into polished prompts for AI image generation.

```
[ INSERT SCREENSHOT — Prompt Factory ]
Suggested callouts:
  1. Style picker
  2. Mood selector
  3. Subject / character field
  4. Generated prompt output
  5. Send to Image Gen button
```

### Story Forge · `/tools/story`
AI-assisted story brainstorming. Give it a logline, get a beat sheet, character list, and dialogue starters.

```
[ INSERT SCREENSHOT — Story Forge ]
Suggested callouts:
  1. Logline input
  2. Beat sheet output
  3. Character list
  4. Dialogue starters
  5. Send to Comic Builder button
```

### Import Center
Bulk-import images, scripts, or `.pscomixx` projects from your computer.

---

\newpage

## 18. FX Studio Bridge

PSCoMiXX talks to **PS FX Studio** (a separate app at pscomixx.online) through the FX button.

### How to use it
1. In any creator, click a panel or asset.
2. Click the **FX** button in the toolbar.
3. FX Studio opens in a new tab; the bottom status bar in CoMiXX turns yellow → green when handshake completes.
4. Pick an effect, customize, hit **Send to Comic**.
5. The asset appears back in your panel automatically.
6. A success toast confirms: *"Asset received: [name] → Panel"*.

```
[ INSERT SCREENSHOT — FX Studio popup with handshake bar visible in CoMiXX ]
Suggested callouts:
  1. FX button in CoMiXX toolbar
  2. FX Studio popup window
  3. Handshake status bar (bottom of CoMiXX)
  4. "Send to Comic" button in FX Studio
```

### If the status bar stays yellow ("Handshaking…")
The FX Studio app is missing the handshake snippet. Admins: see `docs/desktop-setup/FX_STUDIO_HANDSHAKE.md` for the copy-paste fix to install on the FX Studio side. After 10 seconds CoMiXX will show a clear error toast pointing at that doc.

### Popup blocked
Allow popups for pscomixx.com in your browser, then try again.

---

## 19. My Library

**Sidebar:** My Library · **URL:** `/library`

Every project you've ever made.

```
[ INSERT SCREENSHOT — My Library ]
Suggested callouts:
  1. Filter by type (Comic / Card / VN / CYOA / Cover / HOP / Motion)
  2. Filter by status (Draft / Published / Archived)
  3. Sort menu
  4. Project card (click to resume)
  5. Right-click menu (Duplicate / Delete / Export / Publish / Move)
  6. Bulk-select checkbox
```

- Click any project to resume.
- Right-click → **Duplicate / Delete / Export / Publish / Move to Folder**.
- Bulk-select with **Shift+click**.

---

\newpage

## 20. My Portfolio

**Sidebar:** My Portfolio · **URL:** `/portfolio`

Your public showcase. Pick which projects appear, customize the theme.

```
[ INSERT SCREENSHOT — Portfolio editor ]
Suggested callouts:
  1. Layout picker (Grid / Magazine / Slideshow)
  2. Theme color picker
  3. Pinned projects (top 3)
  4. About Me section
  5. Public preview link
```

- Choose layout (grid, magazine, slideshow)
- Pick a color theme or build a custom one
- Add an "About Me" section
- Pin your top 3 projects to the top
- Share the link: `pscomixx.com/portfolio/your-username`

### Skill Passport
A condensed, certification-first version at `/passport/your-username` — designed for academic and employer audiences.

### Embed
Copy the **Embed code** from Settings → Portfolio to put your work on any external site.

---

## 21. Print Studio

**Sidebar:** Print Studio · **URL:** `/print-studio`

Order physical prints of your work.

```
[ INSERT SCREENSHOT — Print Studio ]
Suggested callouts:
  1. Product picker (single comic, card pack, poster, bundle)
  2. Project picker
  3. Quantity / format
  4. Price preview
  5. Order button
```

- **Print Studio** — main shop
- **Export Dashboard** — track print jobs
- **Packages** — bulk print bundles for classrooms / stores
- **Request Quote** — custom orders

---

\newpage

## 22. Marketplace

**Sidebar:** Marketplace · **URL:** `/marketplace`

### Browsing
Browse projects, asset packs, character bundles, brushes, templates. Filter by category, price, rarity, creator level.

```
[ INSERT SCREENSHOT — Marketplace browse ]
Suggested callouts:
  1. Category filter
  2. Price filter
  3. Rarity filter
  4. Item card (preview, price, creator, rating)
  5. Add to Cart button
```

### Buying
Click any item → **Add to Cart** → checkout via Stripe → asset unlocks in your Library.

### Selling (Creators only)
1. Open the project you want to sell.
2. Click **Publish → Marketplace**.
3. Set price (USD), description, preview images.
4. Pick license (personal use / commercial / royalty-free).
5. Submit. Marketplace review takes ~24 hours.
6. Once approved, your item is live. You earn **70 % per sale** (30 % platform fee).

### Payouts
Connect a Stripe account in **Settings → Payouts**. Earnings paid weekly once you cross **$25**.

---

## 23. Community Library

**Sidebar:** Community Library · **URL:** `/community`

Browse, read, and like other creators' published work.

```
[ INSERT SCREENSHOT — Community Library ]
Suggested callouts:
  1. Featured (editor's picks)
  2. New (most recent)
  3. Series (multi-part stories)
  4. Genre filters
  5. Read inline (built-in Comic Reader)
  6. Heart / Bookmark / Follow
```

---

\newpage

## 24. Publishing Pipeline

```
[Draft in CoMiXX] → [Save] → [Publish] → [Moderation] → [Live]
                                  │
                                  ├─► Community Library (everyone)
                                  ├─► Your Stage (your followers + Streaming)
                                  ├─► Portfolio (your public profile)
                                  └─► Marketplace (if priced)
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
- You earn XP per view and per like.
- Analytics show views, demographics, retention.

---

## 25. Cross-Platform Sync (Web · Desktop · Mobile)

| What | Synced via | Latency |
|---|---|---|
| Login | SSO JWT | Instant |
| XP | Background sync | < 5 s |
| Profile / avatar | Hub propagation | < 10 s |
| Published projects | Streaming API | < 30 s |
| Certifications | LMS → Hub → Portfolio | < 30 s |
| Marketplace earnings | Stripe webhook | Real-time |

### Offline (Desktop)
- Editing existing projects works offline.
- Saves are queued and pushed when you reconnect.
- AI features and publishing require internet.
- Pending changes appear in the sidebar with a count.

> **Update flow:** Web users get updates the moment we publish. Desktop and mobile users (which are thin wrappers around the web app) get updates the next time they open the app — no reinstall needed. Only **native** changes (window, icon, file-system access) require a new installer.

---

\newpage

## 26. Keyboard Shortcuts

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
| `0` | Zoom to 100 % |
| `F` | Fullscreen toggle |
| `Space (hold) + drag` | Pan canvas |

### Motion Studio

| Shortcut | Action |
|---|---|
| `Spacebar` | Play / pause |
| `← / →` | Previous / next frame |
| `O` | Onion-skin toggle |
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

\newpage

## 27. Troubleshooting

### Login

**"Could not generate SSO link"**
The target app's API is unreachable. Try direct login at the app URL.

**Logged into CoMiXX but logged out of Streaming or LMS**
Click that link in the sidebar — SSO will re-authenticate you automatically.

### FX Studio

**Status bar stuck on yellow "Handshaking…"**
FX Studio app at pscomixx.online is missing the handshake snippet. Admin must install it from `docs/desktop-setup/FX_STUDIO_HANDSHAKE.md`.

**Popup blocked**
Allow popups for pscomixx.com in your browser, then try again.

**Asset never returns**
Make sure the FX Studio tab is still open. Re-open if closed mid-session.

### Comic Builder

**Canvas is tiny on Chromebook**
Already fixed. Force-refresh (Ctrl + Shift + R) to load the new responsive layout.

**Toolbar buttons cut off**
Scroll the toolbar horizontally — it scrolls on small screens.

**Auto-save isn't working**
Check internet. Pending saves queue offline and push when reconnected.

### Publishing

**Stuck in moderation > 5 min**
Likely flagged for manual review. Wait up to 24 hours, or contact support with project ID.

**Publish button greyed out**
Project must be saved first. Hit Save, then Publish.

### Marketplace

**Sale not showing in payouts**
Stripe webhook may be delayed. Check **Settings → Payouts** the next day.

**Item rejected by review**
Check rejection reason in the marketplace dashboard. Most common: missing license, low-resolution preview, duplicated asset.

### Performance

**Editor laggy**
Close other tabs. Lower zoom. Hide layers you're not editing. Disable Onion Skin if not needed.

**Out of memory on Chromebook**
Save and reload. Use **My Library** to keep one project open at a time.

---

\newpage

## 28. FAQ

**Q: Is it free?**
A: Free tier covers everything for personal use. Paid tiers unlock higher AI quotas, more storage, and marketplace selling.

**Q: Do I own what I make?**
A: Yes, 100 %. You retain full IP rights to all work.

**Q: Can I use my work commercially?**
A: Yes — your original work, freely. Marketplace assets are governed by their individual licenses; always check.

**Q: Does it work offline?**
A: Editing existing projects, yes. AI features, publishing, and marketplace require internet.

**Q: Where is my data stored?**
A: Cloud (encrypted Object Storage). Tauri desktop app also keeps a local copy as a `.pscomixx` zip for offline access.

**Q: Can I export and leave?**
A: Yes. **Export → Full Backup** gives you a `.pscomixx` zip of every project.

**Q: How do I delete my account?**
A: Settings → Account → Delete Account. 30-day grace period before permanent deletion.

**Q: Is my child's data safe?**
A: Student accounts run in school-safe mode with stricter moderation, no direct payments, and FERPA/COPPA-aligned controls.

**Q: Can I use my own AI prompts?**
A: Creator accounts, yes. Student accounts use curated prompt templates only.

**Q: Where do I report a bug?**
A: Settings → Help → Report a Bug, or email support listed on `/contact`.

---

\newpage

## 29. Best Practices

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

### School admins
- Audit **/admin → Feature Flags** weekly to keep the surface tight for kids.
- Review flagged content within 24 hours.
- Run a quarterly student showcase via **PS Streaming** live events.

---

## 30. Glossary

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

\newpage

## 31. Appendix A — Beginner Quick Start

**Goal: publish your first comic in under 30 minutes.**

1. Sign up at **pscomixx.com**.
2. Pick "Comics" in onboarding.
3. Land on Dashboard → click **Get Started**.
4. Pick the **Comic Builder** quick-start template.
5. Use the example characters and backgrounds — don't draw from scratch.
6. Type dialogue into the pre-placed speech bubbles.
7. Add 1 more spread.
8. Hit **Save**, then **Publish → Public**.
9. Share the link with one friend.
10. Done. You shipped. Now make 9 more.

---

## 32. Appendix B — Advanced Creator Workflow

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
1. **Free** comic on Community Library — builds audience.
2. **Marketplace** — sell character packs, cover templates, brushes you used.
3. **Premium episodes** — paid unlock.
4. **Print** via Print Studio — physical copies for fans.

---

\newpage

## 33. Appendix C — Teacher / Classroom Workflow

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

## 34. Appendix D — Screenshot Checklist

Capture each at **1920 × 1080** in Light mode (and **1366 × 768** for Chromebook callouts).

### Sign-up & Onboarding
- [ ] Sign-up screen
- [ ] Onboarding — character pick
- [ ] Dashboard (full)

### Sidebar
- [ ] Sidebar expanded
- [ ] Sidebar collapsed
- [ ] Sidebar at Chromebook width (1366)

### Comic Builder
- [ ] Empty new project
- [ ] Mid-project full view
- [ ] Toolbar close-up
- [ ] Layers panel close-up
- [ ] Asset library open
- [ ] Promo page editor
- [ ] Publish modal

### Other creator modes
- [ ] Card Creator
- [ ] Visual Novel scene editor
- [ ] CYOA story map
- [ ] Cover Creator
- [ ] HOP timeline
- [ ] Motion Studio with onion skin
- [ ] Inkblade sandbox

### AI tools
- [ ] Prompt Factory
- [ ] Story Forge
- [ ] Import Center

### FX Studio bridge
- [ ] CoMiXX with handshake bar visible
- [ ] FX Studio popup open
- [ ] "Send to Comic" success toast

### My stuff
- [ ] My Library
- [ ] My Portfolio (light + dark)
- [ ] Skill Passport
- [ ] Print Studio

### Marketplace
- [ ] Marketplace browse
- [ ] Marketplace sell flow

### Community
- [ ] Community Library

### Admin (optional)
- [ ] Admin Control Room
- [ ] Feature Flags tab

---

**End of Guide — PSCoMiXX User Guide v1.0**

*To update this guide, edit `docs/PSCoMiXX_User_Guide.md` and re-run `node docs/build-pdf.mjs`.*

> *"Make something today."* — Press Start | MADMIXEDMEDIA
