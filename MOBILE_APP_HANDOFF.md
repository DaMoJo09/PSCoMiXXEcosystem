# Press Start CoMiXX - Mobile App Development Handoff
## Complete Specification for New Chat Session
### December 2025

---

# PROJECT OVERVIEW

## Goal
Build a **mobile-first Progressive Web App (PWA)** version of Press Start CoMiXX - a comprehensive creative ecosystem for comics, trading cards, covers, animation, drawing, and battle gameplay. This mobile app should replicate the full functionality from the existing HTML5 implementation while being built with modern React/TypeScript architecture.

## Key Exclusions
**DO NOT INCLUDE:**
- CYOA (Choose Your Own Adventure) Maker
- Visual Novel Maker

These are desktop-only features and should be excluded from the mobile implementation.

---

# REFERENCE FILES

The following files are attached and contain critical implementation details:

1. **`attached_assets/press-start-comixx-v11_1765262957337.html`** (21,348 lines)
   - Complete working HTML5 implementation
   - Contains all JavaScript logic, CSS, and HTML structure
   - Reference for exact behavior and styling

2. **`attached_assets/PRESS-START-COMIXX-COMPLETE-SPEC_1765262963724.md`** (3,315 lines)
   - Complete technical specification document
   - Every color value, pixel measurement, font choice
   - Animation timing, interaction behaviors
   - Data structures for all features

---

# CORE MODULES TO IMPLEMENT

## 1. Comic Builder Module
**Priority: HIGH**

### Features:
- Multi-page comic creation with panel layouts
- 15+ panel layout templates (full, 2-row, 3-row, 4-grid, 6-grid, manga, action, hero, dramatic, splash, dynamic, slant, burst, stairs)
- Image/video import into panels
- PS Express-style transform handles for media (scale, rotate, pan)
- Speech bubbles with 12+ styles
- Sound effects (36+ preset effects)
- Emoji/sticker system (600+ emojis in 10 categories)
- Full drawing/inking system with animation frames
- Onion skin for animation
- Export to PNG/GIF

### Panel Data Structure:
```javascript
{
    panels: [{ x: 2, y: 2, w: 96, h: 96 }],
    panelMedia: { panelIndex: { src, scale, rotation, offsetX, offsetY, isVideo } },
    pageElements: [], // bubbles, effects, emojis
    drawingData: null, // Base64 PNG
    drawFrames: [null], // Animation frames
    panelDrawings: {}
}
```

---

## 2. Card Creator Module
**Priority: HIGH**

### Features:
- Trading card creation with front/back sides
- 6 card style presets (gold, silver, fire, ice, neon, nature)
- 6 card templates (classic, retro, neon, tcg, premium, minimal)
- Customizable stats with point allocation system (PWR, SPD, INT)
- 6 rarity levels with stat pools (Common: 150, Uncommon: 180, Rare: 210, Epic: 250, Legendary: 300, Mythic: 350)
- Font customization (title, name, body)
- Holographic effects (shimmer, rainbow)
- Card evolution/XP system
- Export front/back as PNG

### Card Dimensions:
- Display: min(85%, 320px) wide on mobile
- Aspect ratio: 2.5:3.5
- Export: 750px × 1050px

### Card Data Structure:
```javascript
{
    id, title, name, bio,
    frontImage, backImage, frontTransform, backTransform,
    style, template, borderColor, accentColor, textColor,
    holoEffect, texture,
    titleFont, nameFont, bodyFont,
    stats: { pwr: 50, spd: 50, int: 50 },
    stat1Label, stat2Label, stat3Label,
    rarity, pointsUsed,
    backTitle, abilities, quote,
    cardNumber, edition, handle,
    xp, level, durability, battlesPlayed, battlesWon, evolutionState
}
```

---

## 3. Cover Creator Module
**Priority: MEDIUM**

### Features:
- Comic book cover design
- Header with series name, issue number, price
- Main title and tagline
- Front and back cover images
- 5 style templates (classic, dark, vintage, neon, manga)
- Custom barcode placement
- Credits and author info on back

### Cover Dimensions:
- Display: min(85%, 340px) wide on mobile
- Aspect ratio: 6.625:10.25
- Export: 663px × 1025px

---

## 4. Drawing System (Motion Studio)
**Priority: HIGH**

### Features:
- Full canvas drawing with pen, marker, eraser tools
- 10 color palette + custom colors
- 5 brush sizes (2, 4, 8, 16, 32 px)
- Animation frame support
- Onion skin toggle (25% opacity of previous frame)
- Frame navigation, copy/paste, delete
- Playback with FPS control (6, 8, 12, 15, 24 fps)
- Undo/redo history
- Export as animated GIF

### Drawing State:
```javascript
{
    drawMode: false,
    drawTool: 'pen',
    drawColor: '#000000',
    drawSize: 4,
    drawHistory: [],
    drawRedoStack: [],
    drawFrameIndex: 0,
    drawFPS: 12,
    onionSkin: true,
    animPlaying: false
}
```

---

## 5. Speech Bubble System
**Priority: HIGH**

### Bubble Types (12):
1. **Standard** - White with black border
2. **Shout** - Yellow background
3. **Burst** - Star-shaped, orange/red
4. **Whisper** - Translucent gray, dashed border
5. **Thought** - Cloud bubble with smaller bubbles
6. **Scream** - Red with shake animation
7. **Robot** - Dark blue, cyan text, monospace
8. **Drip** - Gradient purple, stylized
9. **Glitch** - Black with green text, glitch animation
10. **Retro** - Cream/brown, box shadow
11. **Neon** - Dark with cyan glow
12. **Graffiti** - Orange/yellow gradient

### Bubble Data:
```javascript
{
    type: 'bubble',
    cls: 'shout', // bubble style
    text: 'Hello!',
    x: 50, y: 50, // percent position
    scale: 1
}
```

---

## 6. Sound Effects System
**Priority: MEDIUM**

### 36+ Preset Effects:
- **Classic**: POW!, BANG!, BOOM!, ZAP!, WHAM!, CRASH!
- **Action**: KAPOW!, SMASH!, SLAM!, THWACK!, WHOOSH!, ZOOM!
- **Impact**: SPLAT!, CRACK!, SNAP!, POP!, BIFF!, BONK!
- **Sounds**: SIZZLE!, BUZZ!, CRUNCH!, SWOOSH!, THUD!, CLICK!
- **Gen-Z/Slang**: SLAY!, RIZZ!, BUSSIN!, NO CAP!, FIRE!, GOAT!, YEET!, BRUH!, SHEESH!, W!, L!, NPC!
- **Custom text option**

### Effect Styling:
```css
.effect {
    font-family: 'Bangers', cursive;
    font-size: clamp(20px, 6vw, 32px);
    text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
    -webkit-text-stroke: 1px #000;
    transform: rotate(-10deg) skew(-5deg);
}
```

---

## 7. AI Image Generation
**Priority: HIGH**

### 8 AI Models (via Pollinations.ai):
1. **Flow Studio** (FLUX.1-schnell) - High-quality comic art
2. **Classic Freestyle** (Pollinations) - Fast, experimental
3. **Anime Studio** (Pony Diffusion) - Anime/manga style
4. **Comic LineLab** (SDXL Comic) - Pure comic book look
5. **Sketch Mode** (Turbo) - Fast rough sketches
6. **Style Blender** (Kandinsky) - Painterly/abstract
7. **Character Lock** (SDXL LoRA) - Consistent characters
8. **Retro Toon** (SD Cartoon) - Saturday morning cartoon

### Generation Limits by Tier:
- Free: 0
- Plus: 10/month
- Pro: Unlimited
- Classroom: 50/month

### Endpoint Pattern:
```
https://image.pollinations.ai/prompt/{encoded_prompt}?model={model}&width=512&height=512&nologo=true
```

---

## 8. Battle System
**Priority: HIGH**

### 9 Battle Modes:
1. **Friendly Battle** - No card loss, 5 credits reward
2. **For Keeps** - Winner takes opponent's card, 25 credits
3. **Chaos Mode** - Random modifiers each round, 15 credits
4. **I Declare War** - First to 10 points, 20 credits
5. **PS21** - Blackjack-style card game, 15 credits
6. **Rumble Royale** - Endless streak vs AI, 5 credits
7. **Tag Team 2v2** - 2 cards vs 2 cards, 25 credits
8. **Sudden Death** - One round high variance, 15 credits
9. **Mystery Pack Duel** - Random pack showdown, 20 credits

### Chaos Modifiers (12):
- Brain Boost (INT doubled)
- Power Surge (PWR doubled)
- Speed Demon (SPD doubled)
- Power Drain/Slow Motion/Brain Fog (stat = 0)
- Giant Killer (Legendary+ -20% PWR)
- Underdog (Common/Uncommon +10 all)
- Switcheroo (PWR/INT swap)
- Reverse Rarity (lowest wins)
- Lucky Star (random +25)
- Battle Worn (stats scale with durability)

### Battle Flow:
1. MODE SELECT → 2. CARD SELECT → 3. OPPONENT MATCH → 4. BATTLE ROUNDS → 5. RESULT

### Multiplayer Battle Codes:
- 6-character alphanumeric codes
- Valid chars: ABCDEFGHJKLMNPQRSTUVWXYZ23456789

---

## 9. Collection Manager
**Priority: MEDIUM**

### Features:
- View all created cards
- Filter by category (Heroes, Villains, Legends, Mythic, Sports, Won in Battle)
- Filter by rarity
- Search by name
- View card stats and battle history
- Lock/unlock cards
- Share cards (generate share codes)

---

## 10. User System
**Priority: HIGH**

### User Profile:
```javascript
{
    id, name, handle, avatar,
    credits: 50, // starting credits
    xp: 0, level: 1,
    joinDate,
    isTeacher: false,
    classCode: null
}
```

### Credits Economy:
- Read comic: 5
- Rate comic: 10
- Create comic: 25
- Share comic: 15
- Viral comic (100+ views): 50
- Win battle: 5-25 (varies by mode)
- Daily login: 10
- First card: 50

### Rarity Upgrade Costs:
- Uncommon: 100 credits
- Rare: 250 credits
- Epic: 500 credits
- Legendary: 1000 credits
- Mythic: 2500 credits

---

## 11. Subscription System
**Priority: LOW (can use flags)

### Tier Limits:
| Feature | Free | Plus | Pro | Classroom |
|---------|------|------|-----|-----------|
| Daily Exports | 3 | 10 | ∞ | ∞ |
| AI Gens/Month | 0 | 10 | ∞ | 50 |
| Cloud Saves | 5 | 50 | ∞ | 100 |
| Watermark | Yes | No | No | No |

---

# DESIGN SYSTEM

## Color Palette

### Dark Mode (Default):
```css
--studio-bg: #0a0a0a;
--studio-sidebar: #111111;
--studio-accent: #ffffff;
--studio-accent-dark: #888888;
--studio-text: #ffffff;
--studio-text-muted: #888888;
--studio-border: #2a2a2a;
--studio-hover: #1a1a1a;
--studio-active: #222222;
```

### Light Mode:
```css
--studio-bg: #f5f5f5;
--studio-sidebar: #ffffff;
--studio-accent: #000000;
--studio-text: #000000;
--studio-border: #e0e0e0;
--studio-hover: #f0f0f0;
```

## Typography

### Fonts:
- **Display**: 'Bebas Neue' - headers, titles
- **Comic**: 'Bangers' - bubbles, effects
- **System**: system-ui - body text
- **Mono**: 'Courier New' - robot/glitch bubbles

### User-Selectable Fonts (20):
Bangers, Bebas Neue, Creepster, Permanent Marker, Anton, Luckiest Guy, Bungee, Black Ops One, Russo One, Righteous, Pacifico, Lobster, Dancing Script, Orbitron, Press Start 2P, VT323, Cinzel, Playfair Display, Georgia, system-ui

## Responsive Sizing (clamp):
```css
font-size: clamp(12px, 3vw, 18px);    /* Bubbles */
font-size: clamp(20px, 6vw, 32px);    /* Effects */
font-size: clamp(28px, 8vw, 48px);    /* Emojis */
padding: clamp(10px, 2vw, 16px);       /* Bubble padding */
gap: clamp(6px, 1.5vw, 10px);          /* Grid gaps */
```

---

# UI COMPONENTS

## Mobile Layout Structure:
```
┌─────────────────────────────────────┐
│ HEADER (50px)                       │
│ [Back] [Logo] [Actions...] [Theme]  │
├─────────────────────────────────────┤
│                                     │
│         CANVAS AREA                 │
│      (centered, aspect ratio)       │
│                                     │
│         ┌───────────────┐           │
│         │    CANVAS     │           │
│         └───────────────┘           │
│                                     │
├─────────────────────────────────────┤
│ PAGE DOTS   ● ━━ ● ● ● [+]          │
├─────────────────────────────────────┤
│ MOBILE TOOLBAR                      │
│ [Layout][Bubble][FX][Emoji][Draw]   │
├─────────────────────────────────────┤
│ BOTTOM NAV (60px + safe area)       │
│ [📖Comic] [🎴Card] [📕Cover] [⚔️]   │
└─────────────────────────────────────┘
```

## Sheet Component (Bottom Drawer):
- Slides up from bottom
- Max height: 80vh
- Body max height: 55vh
- Border radius (top): 24px
- Handle: 48px × 5px centered pill

## Button Sizes:
| Type | Height | Touch Target |
|------|--------|--------------|
| Header Button | auto | 44px min |
| Tool Button | 38px | 44px |
| Tool Strip Button | 38px × 38px | 44px |
| Nav Item | flex | 60px |

---

# TOUCH GESTURES

## Panel Media Gestures:
1. **Single finger drag** - Pan media within panel
2. **Two finger pinch** - Scale media (0.3x - 5.0x)
3. **Two finger rotate** - Rotate media (-360° to 360°)

## Element Gestures:
- Drag to move (bubbles, effects, emojis)
- Tap to select
- Double-tap to edit text

## Orientation Change Handling:
- Cancel all active gestures
- Clear animation intervals
- Debounced re-render (800ms delay)

---

# ANIMATIONS

## Key Animations:
```css
/* Selection pulse */
@keyframes selectPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.01); }
}

/* Scream shake */
@keyframes shake {
    0%, 100% { transform: rotate(-1deg); }
    50% { transform: rotate(1deg); }
}

/* Glitch effect */
@keyframes glitch {
    0%, 100% { text-shadow: 2px 0 #f00, -2px 0 #00f; }
    50% { text-shadow: -2px 0 #f00, 2px 0 #00f; }
}

/* Sheet slide */
.sheet { transform: translateY(100%); transition: 0.3s ease-out; }
.sheet.show { transform: translateY(0); }
```

## Timing:
- Standard transition: 0.15s ease
- Smooth transition: 0.3s ease-out
- Spring-like: 0.4s cubic-bezier(0.4, 0, 0.2, 1)
- Bouncy: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)

---

# DATA PERSISTENCE

## LocalStorage Keys:
| Key | Description |
|-----|-------------|
| pscomixx_state | Complete app state |
| pscomixx_tier | Subscription tier |
| pscomixx_exports_today | Daily export count |
| pscomixx_ai_gens_month | Monthly AI usage |
| pscomixx_player_name | User display name |
| pscomixx_legal_accepted | Terms accepted |

## State Auto-Save:
- Debounced save (1000ms after changes)
- Save on significant actions
- Load on app start

---

# PERFORMANCE OPTIMIZATIONS

## iOS Specific:
- Disable heavy background animations (stars, comets)
- Use `will-change` sparingly
- Avoid `-webkit-overflow-scrolling: touch` in modals
- Handle orientation changes gracefully

## General:
- Lazy load images
- Debounce resize handlers
- Use CSS transforms for animations
- Avoid layout thrashing
- Batch DOM updates

---

# PWA REQUIREMENTS

## Meta Tags:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0a0a0a">
```

## Safe Area Handling:
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

---

# TECHNOLOGY STACK RECOMMENDATION

## Frontend:
- **Framework**: React with TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS v4
- **Routing**: Wouter
- **State**: TanStack Query + Context

## Backend:
- **Server**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with sessions

## Deployment:
- **Platform**: Replit
- **Domain**: pressstart.space (custom domain)

---

# IMPLEMENTATION ORDER

1. **Phase 1: Core UI Framework**
   - App shell and navigation
   - Theme system (dark/light)
   - Sheet/modal components
   - Bottom navigation

2. **Phase 2: Card Creator**
   - Card canvas and templates
   - Stats system
   - Rarity system
   - Export functionality

3. **Phase 3: Comic Builder**
   - Panel layouts
   - Media import and transform
   - Speech bubbles
   - Sound effects

4. **Phase 4: Drawing System**
   - Canvas drawing
   - Tools and colors
   - Animation frames
   - Export

5. **Phase 5: Battle System**
   - Battle modes
   - AI opponent
   - Multiplayer codes
   - Rewards

6. **Phase 6: AI Integration**
   - Model selector
   - Prompt input
   - Image generation
   - Usage limits

7. **Phase 7: User System**
   - Authentication
   - Credits economy
   - Cloud saves
   - Subscriptions

---

# NOTES FOR DEVELOPER

1. **Refer to the HTML file** for exact implementation details - it's a complete working app
2. **Use the spec document** for precise measurements and data structures
3. **Mobile-first** - all features should work on touch devices
4. **iOS is primary target** - test thoroughly on Safari iOS
5. **Noir/brutalist aesthetic** - black/white/grayscale only
6. **No CYOA or Visual Novel** - those are desktop-only features
7. **PWA required** - must work offline and be installable

---

*Document generated for Press Start CoMiXX mobile app development*
*Reference: Desktop app at current Replit project*
