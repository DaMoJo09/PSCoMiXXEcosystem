# PRESS START CoMiXX
## Complete Technical Specification & Recreation Guide
### Version 11 - December 2025

---

# DOCUMENT PURPOSE

This document provides every detail needed to recreate Press Start CoMiXX from scratch. Every color value, pixel measurement, font choice, animation timing, and interaction behavior is documented. A developer who has never seen the app should be able to build an identical copy using only this specification.

---

# TABLE OF CONTENTS

1. [Application Identity](#1-application-identity)
2. [Technology Stack](#2-technology-stack)
3. [Color System](#3-color-system)
4. [Typography System](#4-typography-system)
5. [Spacing & Sizing System](#5-spacing--sizing-system)
6. [Layout Architecture](#6-layout-architecture)
7. [Component Library](#7-component-library)
8. [Icon System](#8-icon-system)
9. [Animation System](#9-animation-system)
10. [Comic Builder Module](#10-comic-builder-module)
11. [Card Creator Module](#11-card-creator-module)
12. [Cover Creator Module](#12-cover-creator-module)
13. [Drawing System](#13-drawing-system)
14. [Speech Bubbles](#14-speech-bubbles)
15. [Sound Effects](#15-sound-effects)
16. [Emoji/Sticker System](#16-emojisticker-system)
17. [AI Image Generation](#17-ai-image-generation)
18. [Battle System](#18-battle-system)
19. [User System](#19-user-system)
20. [Subscription System](#20-subscription-system)
21. [Data Persistence](#21-data-persistence)
22. [Touch Gestures](#22-touch-gestures)
23. [Keyboard Shortcuts](#23-keyboard-shortcuts)
24. [Accessibility](#24-accessibility)
25. [Performance Optimizations](#25-performance-optimizations)
26. [Error Handling](#26-error-handling)
27. [Export System](#27-export-system)

---

# 1. APPLICATION IDENTITY

## 1.1 Name & Branding
- **Full Name**: Press Start CoMiXX
- **Short Name**: CoMiXX
- **Logo Text Line 1**: "PRESS START"
- **Logo Text Line 2**: "CoMiXX" (displayed below in accent color)
- **Tagline**: None displayed in UI

## 1.2 App Icon
- **Shape**: Rounded square (8px border-radius on 44px icon)
- **Content**: Custom logo image (external file reference)
- **Sizes Used**: 32px, 44px (responsive based on viewport)

## 1.3 Meta Information
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0a0a0a">
<title>Press Start CoMixx</title>
```

---

# 2. TECHNOLOGY STACK

## 2.1 Frontend
- **Framework**: None (Vanilla JavaScript)
- **Rendering**: Direct DOM manipulation via innerHTML
- **State Management**: Single global state object `S`
- **Bundling**: None (single HTML file)

## 2.2 External Dependencies

### Google Fonts (loaded via CSS @import)
```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bangers&display=swap');
```

### Firebase (loaded via script tags)
```html
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
```

### html2canvas (for export)
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

### Google Analytics
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

## 2.3 Browser Support
- **Primary**: Safari on iOS (iPhone, iPad)
- **Secondary**: Chrome on Android
- **Tertiary**: Desktop Chrome, Firefox, Safari, Edge

---

# 3. COLOR SYSTEM

## 3.1 CSS Custom Properties

### Dark Mode (Default)
```css
:root {
    --studio-bg: #0a0a0a;
    --studio-sidebar: #111111;
    --studio-accent: #ffffff;
    --studio-accent-dark: #888888;
    --studio-text: #ffffff;
    --studio-text-muted: #888888;
    --studio-border: #2a2a2a;
    --studio-hover: #1a1a1a;
    --studio-active: #222222;
    --studio-success: #ffffff;
    --studio-warning: #cccccc;
    --studio-danger: #888888;
}
```

### Light Mode
```css
.light-mode {
    --studio-bg: #f5f5f5;
    --studio-sidebar: #ffffff;
    --studio-accent: #000000;
    --studio-accent-dark: #666666;
    --studio-text: #000000;
    --studio-text-muted: #666666;
    --studio-border: #e0e0e0;
    --studio-hover: #f0f0f0;
    --studio-active: #e8e8e8;
    --studio-success: #000000;
    --studio-warning: #444444;
    --studio-danger: #666666;
}
```

## 3.2 Color Definitions Table

| Variable | Dark Mode | Light Mode | Usage |
|----------|-----------|------------|-------|
| --studio-bg | #0a0a0a (RGB: 10,10,10) | #f5f5f5 (RGB: 245,245,245) | Main background |
| --studio-sidebar | #111111 (RGB: 17,17,17) | #ffffff (RGB: 255,255,255) | Sidebar, header, toolbar backgrounds |
| --studio-accent | #ffffff (RGB: 255,255,255) | #000000 (RGB: 0,0,0) | Primary accent, active states |
| --studio-accent-dark | #888888 (RGB: 136,136,136) | #666666 (RGB: 102,102,102) | Secondary accent |
| --studio-text | #ffffff (RGB: 255,255,255) | #000000 (RGB: 0,0,0) | Primary text |
| --studio-text-muted | #888888 (RGB: 136,136,136) | #666666 (RGB: 102,102,102) | Secondary text, labels, hints |
| --studio-border | #2a2a2a (RGB: 42,42,42) | #e0e0e0 (RGB: 224,224,224) | Borders, dividers |
| --studio-hover | #1a1a1a (RGB: 26,26,26) | #f0f0f0 (RGB: 240,240,240) | Hover states |
| --studio-active | #222222 (RGB: 34,34,34) | #e8e8e8 (RGB: 232,232,232) | Active/pressed states |

## 3.3 Card Style Colors

### Gold Style
```javascript
{
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    accent: '#c9a227',
    gradient: 'linear-gradient(90deg, #c9a227, #f4d03f, #c9a227)',
    statsBg: '#1a1a2e'
}
```

### Silver Style
```javascript
{
    background: 'linear-gradient(135deg, #2a2a3e, #3a3a4e)',
    accent: '#aaa',
    gradient: 'linear-gradient(90deg, #888, #ccc, #888)',
    statsBg: '#2a2a3e'
}
```

### Fire Style
```javascript
{
    background: 'linear-gradient(135deg, #1a0505, #2a0a0a)',
    accent: '#ff4500',
    gradient: 'linear-gradient(90deg, #ff4500, #ff8c00, #ff4500)',
    statsBg: '#1a0505'
}
```

### Ice Style
```javascript
{
    background: 'linear-gradient(135deg, #051a2a, #0a2540)',
    accent: '#00bfff',
    gradient: 'linear-gradient(90deg, #00bfff, #87ceeb, #00bfff)',
    statsBg: '#051a2a'
}
```

### Neon Style
```javascript
{
    background: 'linear-gradient(135deg, #1a0520, #0a0520)',
    accent: '#ff00ff',
    gradient: 'linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff)',
    statsBg: '#1a0520'
}
```

### Nature Style
```javascript
{
    background: 'linear-gradient(135deg, #0a1a0a, #102010)',
    accent: '#fff',
    gradient: 'linear-gradient(90deg, #fff, #86efac, #fff)',
    statsBg: '#0a1a0a'
}
```

## 3.4 Rarity Colors

| Rarity | Text Color | Glow Effect | Stat Pool |
|--------|------------|-------------|-----------|
| COMMON | #9ca3af | none | 150 |
| UNCOMMON | #ffffff | 0 0 10px #fff | 180 |
| RARE | #cccccc | 0 0 12px #ccc | 210 |
| EPIC | #a855f7 | 0 0 15px #a855f7 | 250 |
| LEGENDARY | #999999 | 0 0 20px #999 | 300 |
| MYTHIC | #06b6d4 | 0 0 25px #06b6d4, 0 0 50px #fff | 350 |

## 3.5 Sound Effect Color Palette
```javascript
const EFFECT_COLORS = [
    '#ff0000',  // Pure Red
    '#ff9800',  // Orange
    '#ffeb3b',  // Yellow
    '#4caf50',  // Green
    '#2196f3',  // Blue
    '#9c27b0',  // Purple
    '#ff1493',  // Deep Pink
    '#00ffff',  // Cyan
    '#ff4081',  // Pink
    '#7c4dff',  // Deep Purple
    '#00e676',  // Light Green
    '#ffd600',  // Amber
    '#e040fb',  // Purple Pink
    '#76ff03',  // Light Green 2
    '#f50057',  // Pink Red
    '#651fff'   // Deep Purple 2
];
```

## 3.6 Panel Colors
- **Panel Background (empty)**: #fafafa
- **Panel Border (default)**: #e0e0e0
- **Panel Border (hover)**: #ccc
- **Panel Border (selected)**: var(--studio-accent)
- **Panel Placeholder Text**: #bbb
- **Panel Placeholder Icon**: #ddd

## 3.7 Canvas Colors
- **Canvas Background**: #ffffff
- **Canvas Shadow**: 0 8px 32px rgba(0,0,0,0.4)

---

# 4. TYPOGRAPHY SYSTEM

## 4.1 Font Families

### Primary Display Font
```css
font-family: 'Bebas Neue', sans-serif;
```
- **Usage**: App title, headers, sheet titles, card titles
- **Characteristics**: All caps, condensed, bold appearance

### Comic Font
```css
font-family: 'Bangers', cursive;
```
- **Usage**: Speech bubbles, sound effects, comic text
- **Characteristics**: Comic book style, playful

### System Font
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
- **Usage**: Body text, inputs, UI elements
- **Characteristics**: Native platform appearance

### Monospace Font
```css
font-family: 'Courier New', monospace;
```
- **Usage**: Robot bubbles, retro bubbles, glitch effects
- **Characteristics**: Fixed-width, technical appearance

## 4.2 Font Size Scale

### Using clamp() for Responsive Sizing
```css
/* Format: clamp(minimum, preferred, maximum) */

/* Logo Text */
font-size: clamp(14px, 3.5vw, 20px);    /* Main logo */
font-size: clamp(10px, 2.5vw, 13px);    /* Sub logo */

/* Headers */
font-size: clamp(18px, 4vw, 24px);      /* Sheet titles */
font-size: clamp(16px, 4vw, 20px);      /* Section titles */

/* Body Text */
font-size: clamp(12px, 3vw, 18px);      /* Bubbles */
font-size: clamp(14px, 3.5vw, 18px);    /* Buttons */
font-size: clamp(20px, 6vw, 32px);      /* Effects */
font-size: clamp(28px, 8vw, 48px);      /* Emojis */
```

### Fixed Sizes
| Element | Desktop | Mobile |
|---------|---------|--------|
| Header Title | 16px | 13px |
| Header Subtitle | 10px | 9px |
| Header Button | 11px | 10px |
| Toolbar Button | 12px | 10px |
| Nav Item Label | 10px | 10px |
| Input Text | 16px | 16px (prevents iOS zoom) |
| Small Label | 9px | 9px |
| Tiny Text | 8px | 8px |

## 4.3 Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Labels, buttons |
| Semi-Bold | 600 | Headers, emphasized text |
| Bold | 700 | Strong emphasis |
| Black | 900 | Scream bubbles |

## 4.4 Letter Spacing
| Context | Value |
|---------|-------|
| Logo Main | 2px |
| Logo Sub | 1px |
| Sheet Title | 3px |
| Section Title | 1-2px |
| Button Text | 0.5-1px |
| Nav Labels | 0.5px |
| Normal Text | 0 (normal) |

## 4.5 Line Heights
| Context | Value |
|---------|-------|
| Logo | 1.1 |
| Headers | 1.2 |
| Body | 1.4-1.5 |
| Buttons | 1 |
| Multi-line Text | 1.6 |

## 4.6 Available User Fonts
```javascript
const FONTS = [
    { name: 'Bangers', category: 'comic' },
    { name: 'Bebas Neue', category: 'display' },
    { name: 'Creepster', category: 'horror' },
    { name: 'Permanent Marker', category: 'handwritten' },
    { name: 'Anton', category: 'display' },
    { name: 'Luckiest Guy', category: 'comic' },
    { name: 'Bungee', category: 'display' },
    { name: 'Black Ops One', category: 'display' },
    { name: 'Russo One', category: 'display' },
    { name: 'Righteous', category: 'display' },
    { name: 'Pacifico', category: 'script' },
    { name: 'Lobster', category: 'script' },
    { name: 'Dancing Script', category: 'script' },
    { name: 'Orbitron', category: 'scifi' },
    { name: 'Press Start 2P', category: 'pixel' },
    { name: 'VT323', category: 'pixel' },
    { name: 'Cinzel', category: 'elegant' },
    { name: 'Playfair Display', category: 'elegant' },
    { name: 'Georgia', category: 'serif' },
    { name: 'system-ui', category: 'system' }
];
```

---

# 5. SPACING & SIZING SYSTEM

## 5.1 Base Spacing Units
| Name | Value | Usage |
|------|-------|-------|
| 2xs | 2px | Minimal gaps |
| xs | 4px | Tight spacing |
| sm | 6px | Small gaps |
| md | 8px | Standard gap |
| lg | 12px | Large gap |
| xl | 16px | Section spacing |
| 2xl | 20px | Major sections |
| 3xl | 24px | Panel padding |

## 5.2 Responsive Spacing (clamp)
```css
gap: clamp(6px, 1.5vw, 10px);   /* Grid items */
gap: clamp(8px, 2vw, 12px);     /* Section items */
padding: clamp(10px, 2vw, 16px); /* Bubble padding */
padding: clamp(12px, 3vw, 18px); /* Option buttons */
```

## 5.3 Component Dimensions

### Header
- Height: 50px (desktop), ~46px (mobile with smaller padding)
- Padding: 8px 12px (desktop), 6px 8px (mobile)
- Gap: 12px (desktop), 8px (mobile)

### Sidebar
- Width: 220px
- Item Padding: 10px 16px
- Section Padding: 12px 0
- Border Left (active): 3px solid accent

### Bottom Navigation
- Height: 60px + safe-area-inset-bottom
- Item Padding: 8px
- Icon Size: 24px
- Label Size: 10px

### Buttons
| Type | Height | Padding | Border Radius |
|------|--------|---------|---------------|
| Header Button | auto | 8px 14px | 6px |
| Tool Button | 38px | 0 14px | 6px |
| Tool Strip Button | 38px × 38px | 0 | 8px |
| Spread Button | auto | 10px 18px | 6px |
| Page Add Button | 28px × 28px | 0 | 6px |
| Zoom Button | 24px × 24px | 0 | 4px |

### Page Dots
- Inactive: 10px × 10px circle
- Active: 24px × 10px pill
- Gap: 8px

### Sheets
- Border Radius (top): 24px
- Max Height: 80vh
- Body Max Height: 55vh
- Handle: 48px × 5px
- Header Padding: 0 20px 16px
- Body Padding: 16px

### Canvas Sizes
| Type | Mobile Width | Desktop Width | Aspect Ratio |
|------|--------------|---------------|--------------|
| Comic | min(98%, 520px) | min(90%, 600px) | 8.5:11 |
| Card | min(85%, 320px) | min(60%, 380px) | 2.5:3.5 |
| Cover | min(85%, 340px) | min(65%, 420px) | 6.625:10.25 |

---

# 6. LAYOUT ARCHITECTURE

## 6.1 Overall Structure
```
┌────────────────────────────────────────────────────┐
│ SIDEBAR (220px, hidden on mobile)                  │
│ ┌────────────────────────────────────────────────┐ │
│ │ Logo + Brand                                   │ │
│ ├────────────────────────────────────────────────┤ │
│ │ CREATE Section                                 │ │
│ │   Comic Builder                                │ │
│ │   Card Creator                                 │ │
│ │   Cover Creator                                │ │
│ ├────────────────────────────────────────────────┤ │
│ │ PLAY Section                                   │ │
│ │   Card Battle                                  │ │
│ │   Collection                                   │ │
│ ├────────────────────────────────────────────────┤ │
│ │ User Profile Footer                            │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ MAIN CONTENT AREA                                  │
│ ┌────────────────────────────────────────────────┐ │
│ │ HEADER                                         │ │
│ │ [Back] [Logo] [Title]    [Actions...] [☼/☽]   │ │
│ ├────────────────────────────────────────────────┤ │
│ │ TAB BAR (desktop only)                         │ │
│ │ [Comic] [Card] [Cover]                         │ │
│ ├────────────────────────────────────────────────┤ │
│ │ TOOL STRIP (desktop only)                      │ │
│ │ [Layout][Bubble][Effects][Emoji][Draw][Save]   │ │
│ ├────────────────────────────────────────────────┤ │
│ │                                                │ │
│ │              CANVAS AREA                       │ │
│ │           (centered, aspect ratio)             │ │
│ │                                                │ │
│ │         ┌─────────────────────┐                │ │
│ │         │                     │                │ │
│ │         │      CANVAS         │                │ │
│ │         │                     │                │ │
│ │         └─────────────────────┘                │ │
│ │                                                │ │
│ ├────────────────────────────────────────────────┤ │
│ │ PAGE BAR                                       │ │
│ │ ● ━━ ● ● ● [+]                                │ │
│ ├────────────────────────────────────────────────┤ │
│ │ MOBILE TOOLBAR (mobile only)                   │ │
│ │ [Layout][Bubble][Effects][Emoji][Draw][Save]   │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ BOTTOM NAV (mobile only, fixed)                │ │
│ │ [📖Comic] [🎴Card] [📕Cover] [⚔️Battle]       │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

FLOATING ELEMENTS (when active):
┌─────────────────────────────────────────────────────┐
│ ACTION PANEL (when panel selected)                  │
│ Position: right side (desktop) / bottom (mobile)    │
│ ┌─────┐                                             │
│ │ ✕   │ CLOSE                                       │
│ │ 📷  │ MEDIA                                       │
│ │ 🔍+ │ ZOOM IN                                     │
│ │ 🔍- │ ZOOM OUT                                    │
│ │ ↺   │ ROTATE LEFT                                 │
│ │ ↻   │ ROTATE RIGHT                                │
│ │ 🔄  │ EDIT                                        │
│ │ 🗑️  │ DELETE                                      │
│ └─────┘                                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ SHEET (slides up from bottom)                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ═══════════════ (drag handle)                   │ │
│ │ SHEET TITLE                              [X]    │ │
│ ├─────────────────────────────────────────────────┤ │
│ │                                                 │ │
│ │           SHEET CONTENT                         │ │
│ │        (scrollable, max 55vh)                   │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 6.2 CSS Structure

### Root Container
```css
body {
    margin: 0;
    padding: 0;
    font-family: system-ui, sans-serif;
    background: var(--studio-bg);
    color: var(--studio-text);
    overflow: hidden;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
}
```

### Main Layout
```css
.studio-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
}

@media (min-width: 1024px) {
    .studio-main {
        margin-left: 220px; /* Sidebar width */
    }
}

@media (max-width: 1023px) {
    .studio-main {
        padding-bottom: 70px; /* Bottom nav height */
    }
}
```

### Canvas Area
```css
.canvas-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    position: relative;
    overflow: visible;
    min-height: 0;
    background: var(--studio-bg);
}
```

---

# 7. COMPONENT LIBRARY

## 7.1 Header Component

### Structure
```html
<div class="header">
    <div class="header-left">
        <button class="header-back">[←]</button>
        <div class="logo">
            <img class="logo-img" src="..." />
            <div class="logo-text">
                PRESS START
                <span>CoMiXX</span>
            </div>
        </div>
    </div>
    <div class="header-actions">
        <button class="header-btn header-btn-ghost">[Templates]</button>
        <button class="header-btn header-btn-ghost">[Collab]</button>
        <button class="header-btn header-btn-primary">[Save]</button>
        <button class="header-btn header-btn-ghost">[☼/☽]</button>
        <button class="header-btn header-btn-ghost">[≡]</button>
    </div>
</div>
```

### CSS
```css
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--studio-sidebar);
    border-bottom: 1px solid var(--studio-border);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    gap: 12px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.header-back {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid var(--studio-border);
    color: var(--studio-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
}

.header-back:hover {
    background: var(--studio-hover);
    color: var(--studio-text);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-shrink: 1;
    min-width: 0;
}

.header-btn {
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
}

.header-btn-ghost {
    background: transparent;
    border: 1px solid var(--studio-border);
    color: var(--studio-text-muted);
}

.header-btn-ghost:hover {
    background: var(--studio-hover);
    color: var(--studio-text);
    border-color: var(--studio-accent-dark);
}

.header-btn-primary {
    background: var(--studio-accent);
    border: none;
    color: #1a1216;
}

.header-btn-primary:hover {
    background: #e4b5c5;
}

/* Mobile adjustments */
@media (max-width: 767px) {
    .header {
        padding: 6px 8px;
        gap: 8px;
    }
    .header-actions {
        gap: 4px;
        padding-right: 8px;
    }
    .header-btn {
        padding: 6px 8px;
        font-size: 10px;
    }
    .hide-mobile {
        display: none !important;
    }
}
```

## 7.2 Sheet Component

### Structure
```html
<div class="sheet-backdrop show" onclick="closeSheet()"></div>
<div class="sheet show">
    <div class="sheet-handle"></div>
    <div class="sheet-header">
        <span class="sheet-title">TITLE</span>
        <button class="sheet-close">[×]</button>
    </div>
    <div class="sheet-body">
        <!-- Content here -->
    </div>
</div>
```

### CSS
```css
.sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 599;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}

.sheet-backdrop.show {
    opacity: 1;
    pointer-events: auto;
}

.sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--studio-sidebar);
    border-radius: 24px 24px 0 0;
    max-height: 80vh;
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
    z-index: 9999;
    padding-bottom: env(safe-area-inset-bottom);
    border-top: 2px solid var(--studio-accent);
    box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
}

.sheet.show {
    transform: translateY(0);
}

.sheet-handle {
    width: 48px;
    height: 5px;
    background: var(--studio-border);
    border-radius: 3px;
    margin: 14px auto;
}

.sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px 16px;
}

.sheet-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(18px, 4vw, 24px);
    letter-spacing: 3px;
    color: var(--studio-text);
}

.sheet-close {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--studio-hover);
    border: 1px solid var(--studio-border);
    color: var(--studio-text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
}

.sheet-close:hover {
    background: var(--studio-active);
}

.sheet-body {
    padding: 16px;
    overflow-y: auto;
    max-height: 55vh;
    -webkit-overflow-scrolling: touch;
    background: var(--studio-sidebar);
}
```

## 7.3 Button Variants

### Tool Button
```css
.tool-btn {
    flex-shrink: 0;
    height: 38px;
    padding: 0 14px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid var(--studio-border);
    color: var(--studio-text-muted);
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.tool-btn:hover {
    background: var(--studio-hover);
    color: var(--studio-text);
    border-color: var(--studio-accent-dark);
}

.tool-btn:active {
    background: var(--studio-active);
}

.tool-btn.save-btn {
    background: var(--studio-accent);
    color: var(--studio-bg);
    border: none;
    font-weight: 600;
}
```

### Option Button (Grid Items)
```css
.option-btn {
    background: var(--studio-bg);
    border: 2px solid var(--studio-border);
    border-radius: 12px;
    padding: clamp(12px, 3vw, 18px);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 80px;
    transition: all 0.15s ease;
}

.option-btn:hover {
    border-color: var(--studio-accent);
    background: var(--studio-hover);
}

.option-btn:active {
    border-color: var(--studio-accent);
    transform: scale(0.95);
}
```

### Nav Item
```css
.nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    cursor: pointer;
    color: var(--studio-text-muted);
    transition: all 0.15s ease;
}

.nav-item:hover {
    color: var(--studio-text);
}

.nav-item.active {
    color: var(--studio-accent);
}

.nav-item span {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
}
```

## 7.4 Grid Layouts
```css
.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(8px, 2vw, 12px);
}

.grid-5 {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: clamp(6px, 1.5vw, 10px);
}
```

## 7.5 Modal Component
```css
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
}

.modal-box {
    background: var(--studio-sidebar);
    padding: 24px;
    border-radius: 16px;
    max-width: 400px;
    width: 100%;
    border: 1px solid var(--studio-border);
}

.modal-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    margin-bottom: 16px;
}

.modal-btns {
    display: flex;
    gap: 10px;
}

.modal-btns .btn {
    flex: 1;
}
```

---

# 8. ICON SYSTEM

## 8.1 Icon Implementation
All icons are inline SVGs with consistent styling:

```javascript
const icon = (name, size = 24) => {
    const icons = { /* icon definitions */ };
    return `<svg 
        width="${size}" 
        height="${size}" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
    >${icons[name] || ''}</svg>`;
};
```

## 8.2 Complete Icon Library

### Navigation Icons
```javascript
// Play icon (solid fill)
play: '<polygon points="5,3 19,12 5,21" fill="currentColor"/>'

// X/Close icon
x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'

// Plus icon
plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'

// Arrow Left
'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'

// Chevron Left/Right
'chevron-left': '<polyline points="15 18 9 12 15 6"/>'
'chevron-right': '<polyline points="9 18 15 12 9 6"/>'

// Home
home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'

// Menu (hamburger)
menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>'
```

### Content Icons
```javascript
// Image
image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'

// Video
video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>'

// Bubble (speech)
bubble: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'

// Message Circle
'message-circle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'
```

### Tool Icons
```javascript
// Edit
edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'

// Pencil
pencil: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'

// Eraser
eraser: '<path d="M20 20H7L2 15l10-10 8 8-5 7z"/><path d="M18 13l-8-8"/>'

// Paintbrush
paintbrush: '<path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>'

// Trash
trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'

// Undo/Redo
undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'
redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>'
```

### Layout Icons
```javascript
// Grid
grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'

// Layout
layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'

// Layers
layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'

// Move
move: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>'

// Maximize
maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'
```

### Action Icons
```javascript
// Save
save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>'

// Download
download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'

// Upload
upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'

// Share
share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'

// Check
check: '<polyline points="20 6 9 17 4 12"/>'
```

### Special Icons
```javascript
// Zap (effects)
zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'

// Sparkles
sparkles: '<path d="M12 3L14 8L20 9L15 13L17 20L12 16L7 20L9 13L4 9L10 8L12 3Z"/>'

// Star
star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'

// Sun/Moon (theme toggle)
sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>...'
moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'

// Smile (emoji)
smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>'

// Globe (publish)
globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
```

### Tab Icons
```javascript
// Comic tab
comic: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'

// Card tab
card: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="18" x2="12" y2="18"/>'

// Book (cover tab)
book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
```

---

# 9. ANIMATION SYSTEM

## 9.1 Timing Functions
```css
/* Standard easing */
transition: all 0.15s ease;

/* Smooth easing */
transition: all 0.3s ease-out;

/* Spring-like easing */
transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);

/* Bouncy easing */
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

## 9.2 Keyframe Animations

### Selection Pulse
```css
@keyframes selectPulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.01);
    }
}

/* Usage */
.panel.selected::after {
    animation: selectPulse 2s ease-in-out infinite;
}
```

### Bubble Shake (Scream)
```css
@keyframes shake {
    0%, 100% {
        transform: rotate(-1deg);
    }
    50% {
        transform: rotate(1deg);
    }
}

/* Usage */
.bubble.scream {
    animation: shake 0.3s ease-in-out infinite;
}
```

### Glitch Effect
```css
@keyframes glitch {
    0%, 100% {
        text-shadow: 2px 0 #f00, -2px 0 #00f;
    }
    50% {
        text-shadow: -2px 0 #f00, 2px 0 #00f;
    }
}

/* Usage */
.bubble.glitch {
    animation: glitch 0.5s ease-in-out infinite;
}
```

### Twinkle (Reader Stars)
```css
@keyframes twinkle {
    0% { opacity: 0.3; }
    100% { opacity: 0.7; }
}

.reader-bg-stars {
    animation: twinkle 5s ease-in-out infinite alternate;
}
```

### Gizmo Fade In
```css
@keyframes gizmoFadeIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.element.selected .delete-btn,
.element.selected .edit-btn {
    animation: gizmoFadeIn 0.2s ease-out 0.1s both;
}
```

### Slide Up (Sheet)
```css
.sheet {
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
}

.sheet.show {
    transform: translateY(0);
}
```

### Sidebar Slide
```css
.sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.open {
    transform: translateX(0);
}
```

## 9.3 Hover Transitions
```css
/* Standard hover */
button {
    transition: all 0.15s ease;
}

/* Scale on active */
.option-btn:active {
    transform: scale(0.95);
}

/* Brightness on hover */
.element:hover:not(.selected) {
    filter: brightness(1.05);
}
```

## 9.4 Page Transitions
```css
.reader-page {
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
}

/* Transition classes */
.page-enter-left {
    transform: translateX(100%);
    opacity: 0;
}

.page-enter-right {
    transform: translateX(-100%);
    opacity: 0;
}

.page-fade-in {
    opacity: 0;
}

.page-zoom-in {
    transform: scale(0.8);
    opacity: 0;
}
```

---

# 10. COMIC BUILDER MODULE

## 10.1 Page Data Structure
```javascript
function createPage() {
    return {
        panels: [
            { x: 2, y: 2, w: 96, h: 96 }  // Default: single full panel
        ],
        panelMedia: {},      // { panelIndex: { src, scale, rotation, offsetX, offsetY, isVideo } }
        pageElements: [],    // Array of bubbles, effects, emojis
        drawingData: null,   // Base64 PNG of drawing layer
        drawFrames: [null],  // Animation frames
        panelDrawings: {},   // Per-panel drawings
        elementAnimations: {}
    };
}
```

## 10.2 Panel Templates

### Full Page (1 panel)
```javascript
{ id: 'full', name: 'Full Page', panels: [
    { x: 2, y: 2, w: 96, h: 96 }
]}
```

### 2 Rows (2 panels)
```javascript
{ id: '2-row', name: '2 Rows', panels: [
    { x: 2, y: 2, w: 96, h: 47 },
    { x: 2, y: 51, w: 96, h: 47 }
]}
```

### 3 Rows (3 panels)
```javascript
{ id: '3-row', name: '3 Rows', panels: [
    { x: 2, y: 2, w: 96, h: 31 },
    { x: 2, y: 35, w: 96, h: 31 },
    { x: 2, y: 68, w: 96, h: 30 }
]}
```

### 4 Grid (4 panels)
```javascript
{ id: '4-grid', name: '4 Grid', panels: [
    { x: 2, y: 2, w: 47, h: 47 },
    { x: 51, y: 2, w: 47, h: 47 },
    { x: 2, y: 51, w: 47, h: 47 },
    { x: 51, y: 51, w: 47, h: 47 }
]}
```

### 6 Grid (6 panels)
```javascript
{ id: '6-grid', name: '6 Grid', panels: [
    { x: 2, y: 2, w: 31, h: 47 },
    { x: 35, y: 2, w: 31, h: 47 },
    { x: 68, y: 2, w: 30, h: 47 },
    { x: 2, y: 51, w: 31, h: 47 },
    { x: 35, y: 51, w: 31, h: 47 },
    { x: 68, y: 51, w: 30, h: 47 }
]}
```

### Manga Style (6 panels)
```javascript
{ id: 'manga-1', name: 'Manga', panels: [
    { x: 2, y: 2, w: 60, h: 38 },
    { x: 64, y: 2, w: 34, h: 18 },
    { x: 64, y: 22, w: 34, h: 18 },
    { x: 2, y: 42, w: 96, h: 24 },
    { x: 2, y: 68, w: 47, h: 30 },
    { x: 51, y: 68, w: 47, h: 30 }
]}
```

### Action (4 panels)
```javascript
{ id: 'action', name: 'Action', panels: [
    { x: 2, y: 2, w: 96, h: 48 },
    { x: 2, y: 52, w: 32, h: 46 },
    { x: 36, y: 52, w: 32, h: 46 },
    { x: 70, y: 52, w: 28, h: 46 }
]}
```

### Hero Shot (4 panels)
```javascript
{ id: 'hero', name: 'Hero Shot', panels: [
    { x: 2, y: 2, w: 60, h: 96 },
    { x: 64, y: 2, w: 34, h: 31 },
    { x: 64, y: 35, w: 34, h: 31 },
    { x: 64, y: 68, w: 34, h: 30 }
]}
```

### Dramatic (3 panels)
```javascript
{ id: 'dramatic', name: 'Dramatic', panels: [
    { x: 2, y: 2, w: 96, h: 60 },
    { x: 2, y: 64, w: 48, h: 34 },
    { x: 52, y: 64, w: 46, h: 34 }
]}
```

### Splash (4 panels)
```javascript
{ id: 'splash', name: 'Splash', panels: [
    { x: 2, y: 2, w: 70, h: 70 },
    { x: 74, y: 2, w: 24, h: 34 },
    { x: 74, y: 38, w: 24, h: 34 },
    { x: 2, y: 74, w: 96, h: 24 }
]}
```

### Dynamic (4 panels)
```javascript
{ id: 'dynamic', name: 'Dynamic', panels: [
    { x: 2, y: 2, w: 48, h: 47 },
    { x: 52, y: 2, w: 46, h: 47 },
    { x: 2, y: 51, w: 46, h: 47 },
    { x: 50, y: 51, w: 48, h: 47 }
]}
```

### Slant (4 panels with skew)
```javascript
{ id: 'slant-1', name: 'Slant', panels: [
    { x: 2, y: 2, w: 96, h: 30, skew: -3 },
    { x: 2, y: 34, w: 47, h: 30, skew: 3 },
    { x: 51, y: 34, w: 47, h: 30, skew: -3 },
    { x: 2, y: 68, w: 96, h: 30, skew: 3 }
]}
```

### Burst (5 panels)
```javascript
{ id: 'burst', name: 'Burst', panels: [
    { x: 20, y: 20, w: 60, h: 60 },
    { x: 2, y: 2, w: 25, h: 25 },
    { x: 73, y: 2, w: 25, h: 25 },
    { x: 2, y: 73, w: 25, h: 25 },
    { x: 73, y: 73, w: 25, h: 25 }
]}
```

### Stairs (4 panels)
```javascript
{ id: 'stairs', name: 'Stairs', panels: [
    { x: 2, y: 2, w: 40, h: 30 },
    { x: 30, y: 25, w: 40, h: 30 },
    { x: 58, y: 48, w: 40, h: 30 },
    { x: 2, y: 70, w: 96, h: 28 }
]}
```

## 10.3 Panel Media Object
```javascript
{
    src: 'data:image/jpeg;base64,...' or 'blob:...',
    isVideo: false,
    scale: 1,           // Range: 0.3 - 5.0
    rotation: 0,        // Range: -360 to 360 degrees
    offsetX: 0,         // Range: -100 to 100 (percent)
    offsetY: 0          // Range: -100 to 100 (percent)
}
```

## 10.4 Panel CSS
```css
.panel {
    position: absolute;
    background: #fafafa;
    cursor: pointer;
    overflow: visible !important;
    border: 2px solid #e0e0e0;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.panel:hover:not(.selected) {
    border-color: #ccc;
}

.panel.selected {
    border-color: var(--studio-accent);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    z-index: 50 !important;
    overflow: visible !important;
}

.panel.selected::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid var(--studio-accent);
    border-radius: 8px;
    pointer-events: none;
    box-shadow: 0 0 20px rgba(255,255,255,0.2);
    animation: selectPulse 2s ease-in-out infinite;
}

.panel-media {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    background: #fafafa;
    transform-origin: center center;
}

.panel-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #bbb;
    font-size: 11px;
    font-weight: 500;
    background: #fafafa;
    gap: 8px;
}

.panel-placeholder-icon {
    font-size: 24px;
    color: #ddd;
}
```

## 10.5 PS Express Style Handles
```css
.ps-handle {
    position: absolute;
    background: #ffffff;
    border: 2px solid #000;
    z-index: 100;
    cursor: pointer;
    touch-action: none;
}

.ps-handle.corner {
    width: 14px;
    height: 14px;
    border-radius: 3px;
}

.ps-handle.edge {
    border-radius: 4px;
}

/* Corner positions */
.ps-handle.nw { top: -7px; left: -7px; cursor: nw-resize; }
.ps-handle.ne { top: -7px; right: -7px; cursor: ne-resize; }
.ps-handle.sw { bottom: -7px; left: -7px; cursor: sw-resize; }
.ps-handle.se { bottom: -7px; right: -7px; cursor: se-resize; }

/* Edge positions (horizontal) */
.ps-handle.top { 
    top: -4px; 
    left: 50%; 
    transform: translateX(-50%); 
    width: 30px; 
    height: 8px; 
    cursor: n-resize; 
}
.ps-handle.bottom { 
    bottom: -4px; 
    left: 50%; 
    transform: translateX(-50%); 
    width: 30px; 
    height: 8px; 
    cursor: s-resize; 
}

/* Edge positions (vertical) */
.ps-handle.left { 
    left: -4px; 
    top: 50%; 
    transform: translateY(-50%); 
    width: 8px; 
    height: 30px; 
    cursor: w-resize; 
}
.ps-handle.right { 
    right: -4px; 
    top: 50%; 
    transform: translateY(-50%); 
    width: 8px; 
    height: 30px; 
    cursor: e-resize; 
}
```

## 10.6 Action Panel (Panel Selected)
```css
.action-panel {
    position: fixed;
    z-index: 100;
    display: flex;
    gap: 4px;
    padding: 8px;
    background: rgba(17, 17, 17, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 12px;
    border: 1px solid var(--studio-border);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

/* Desktop: vertical on right */
@media (min-width: 768px) {
    .action-panel {
        top: 60px;
        right: 10px;
        flex-direction: column;
    }
}

/* Mobile: horizontal at bottom */
@media (max-width: 767px) {
    .action-panel {
        bottom: 152px;
        left: 50%;
        transform: translateX(-50%);
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 90%;
    }
}

.action-panel button {
    min-width: 44px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--studio-hover);
    border: 1px solid var(--studio-border);
    color: var(--studio-text);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    touch-action: manipulation;
}

.action-panel button span {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
```

---

# 11. CARD CREATOR MODULE

## 11.1 Card Data Structure
```javascript
{
    id: 'card_' + Date.now(),
    
    // Display fields
    title: 'HERO CARD',
    name: 'YOUR NAME',
    bio: 'A mysterious hero with incredible powers...',
    
    // Images
    frontImage: null,           // Base64 or blob URL
    backImage: null,
    backBgImage: null,
    frontTransform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    backTransform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    
    // Style
    style: 'gold',              // gold, silver, fire, ice, neon, nature
    template: 'classic',        // classic, retro, neon, tcg, premium, minimal
    borderColor: '#999',
    accentColor: '#bbb',
    textColor: '#ffffff',
    holoEffect: 'none',         // none, shimmer, rainbow
    texture: 'none',            // none, noise, paper
    
    // Fonts
    titleFont: 'Bebas Neue',
    nameFont: 'Bebas Neue',
    bodyFont: 'system-ui',
    
    // Stats
    stats: { pwr: 50, spd: 50, int: 50 },
    stat1Label: 'PWR',
    stat2Label: 'SPD',
    stat3Label: 'INT',
    
    // Rarity & Points
    rarity: 'COMMON',
    pointsUsed: 150,
    
    // Back content
    backTitle: 'ORIGIN STORY',
    abilities: 'Super strength, flight, laser vision',
    quote: '"With great power..."',
    
    // Metadata
    cardNumber: '#001',
    edition: '',
    handle: '',                 // @username
    affiliation: '',
    realName: '',
    team: '',
    position: '',
    jersey: '',
    season: '2025',
    
    // Collection
    category: 'heroes',
    locked: false,
    createdAt: new Date().toISOString(),
    
    // Evolution system
    xp: 0,
    level: 0,
    durability: 100,
    battlesPlayed: 0,
    battlesWon: 0,
    battlesLost: 0,
    evolutionState: 'BASE',
    streakBest: 0,
    lastBattleDate: null,
    
    // Origin tracking
    origin: 'created',          // created, won, traded, pack
    wonFrom: null,
    wonFromPlayer: null,
    shareCode: null
}
```

## 11.2 Card Templates
| ID | Name | Description |
|----|------|-------------|
| classic | Classic | Standard trading card with metallic border |
| retro | Retro | Vintage baseball card with cream background |
| neon | Neon | Cyberpunk with glow effects |
| tcg | TCG | Game-style with type icons |
| premium | Premium | Holographic luxury finish |
| minimal | Minimal | Clean, modern design |

## 11.3 Card Dimensions
```
Display (responsive):
- Mobile: min(85%, 320px) wide
- Desktop: min(60%, 380px) wide
- Aspect ratio: 2.5:3.5

Export:
- Width: 750px
- Height: 1050px
- Resolution: 300 DPI equivalent
```

## 11.4 Card Style Presets
```javascript
const CARD_PRESETS = [
    { id: 'hero', name: 'Hero', style: 'gold', title: 'HERO CARD' },
    { id: 'villain', name: 'Villain', style: 'fire', title: 'VILLAIN' },
    { id: 'legendary', name: 'Legendary', style: 'gold', title: 'LEGENDARY' },
    { id: 'rare', name: 'Rare', style: 'silver', title: 'RARE CARD' },
    { id: 'epic', name: 'Epic', style: 'fire', title: 'EPIC' },
    { id: 'common', name: 'Common', style: 'silver', title: 'COMMON' }
];
```

## 11.5 Stat Point System
- Total points determined by rarity
- Each stat can range from 0-99
- Sum of all stats must equal point pool
- Sliders adjust automatically to maintain balance

```javascript
// Point pools by rarity
const RARITY_POOLS = {
    'COMMON': 150,
    'UNCOMMON': 180,
    'RARE': 210,
    'EPIC': 250,
    'LEGENDARY': 300,
    'MYTHIC': 350
};

// Adjustment logic
function adjustStats(changedStat, newValue) {
    const pool = RARITY_POOLS[S.card.rarity];
    const others = ['pwr', 'spd', 'int'].filter(s => s !== changedStat);
    const remaining = pool - newValue;
    
    // Distribute remaining evenly to other stats
    const each = Math.floor(remaining / 2);
    S.card.stats[others[0]] = each;
    S.card.stats[others[1]] = remaining - each;
}
```

---

# 12. COVER CREATOR MODULE

## 12.1 Cover Data Structure
```javascript
{
    // Header content
    series: 'PRESS START',
    issue: '#1',
    price: '$4.99',
    
    // Main content
    title: 'ADVENTURE',
    tagline: 'THE STORY BEGINS',
    
    // Images
    frontImage: null,
    backImage: null,
    backBgImage: null,
    barcodeImage: null,
    frontTransform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    backTransform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    
    // Style
    style: 'classic',           // classic, dark, vintage, neon, manga
    template: 'classic',
    
    // Back content
    backText: 'In a world where heroes rise...',
    author: 'Created by YOU',
    credits: 'Art & Story: Your Name\nColors: Your Name',
    website: 'pscomixx.online',
    
    // Fonts
    titleFont: 'Bangers',
    seriesFont: 'Bangers',
    bodyFont: 'system-ui'
}
```

## 12.2 Cover Dimensions
```
Display (responsive):
- Mobile: min(85%, 340px) wide
- Desktop: min(65%, 420px) wide
- Aspect ratio: 6.625:10.25

Export:
- Width: 663px
- Height: 1025px
```

## 12.3 Cover Style Templates

### Classic
- Header: Red (#c62828)
- Background: Dark gray (#222)
- Border: Yellow/gold

### Dark
- Header: Dark gray (#333)
- Background: Near black (#0a0a0a)
- Border: Silver

### Vintage
- Header: Brown (#8b4513)
- Background: Cream (#f4e4c1)
- Border: Brown

### Neon
- Header: Purple gradient (#9370db)
- Background: Dark purple gradient (#1a0a2a to #2a1a4a)
- Border: Cyan glow

### Manga
- Header: Pink (#ff69b4)
- Background: Light pink (#fff5f8)
- Border: Black

## 12.4 Cover Presets
```javascript
const COVER_PRESETS = [
    { id: 'action', name: 'Action', style: 'classic', series: 'ACTION COMICS' },
    { id: 'horror', name: 'Horror', style: 'dark', series: 'TALES OF TERROR' },
    { id: 'romance', name: 'Romance', style: 'vintage', series: 'LOVE STORIES' },
    { id: 'scifi', name: 'Sci-Fi', style: 'dark', series: 'FUTURE WORLDS' },
    { id: 'fantasy', name: 'Fantasy', style: 'vintage', series: 'MYSTIC REALMS' },
    { id: 'superhero', name: 'Superhero', style: 'classic', series: 'SUPER HEROES' }
];
```

---

# 13. DRAWING SYSTEM

## 13.1 Drawing State
```javascript
{
    drawMode: false,
    drawTool: 'pen',        // pen, marker, eraser
    drawColor: '#000000',
    drawSize: 4,            // 2, 4, 8, 16, 32
    drawHistory: [],        // For undo
    drawRedoStack: [],      // For redo
    drawFrameIndex: 0,
    drawFPS: 12,
    onionSkin: true,
    animPlaying: false,
    drawUIHidden: false,
    copiedFrame: null,
    drawPanelIndex: null    // null = full page
}
```

## 13.2 Drawing Tools

### Pen
- Smooth strokes
- Full opacity
- Clean edges
- Variable width based on pressure (if available)

### Marker
- Thick strokes
- Semi-transparent (alpha ~0.7)
- Soft edges
- Consistent width

### Eraser
- Removes content
- Uses destination-out composite mode
- Variable size

## 13.3 Color Palette
```javascript
const DRAW_COLORS = [
    '#000000',  // Black
    '#ffffff',  // White
    '#ff0000',  // Red
    '#ff6600',  // Orange
    '#ffcc00',  // Yellow
    '#00cc00',  // Green
    '#0066ff',  // Blue
    '#9933ff',  // Purple
    '#ff66cc',  // Pink
    '#666666'   // Gray
];
```

## 13.4 Brush Sizes
```javascript
const DRAW_SIZES = [2, 4, 8, 16, 32];
```

## 13.5 Animation Features

### Frame Management
- Add new frame (duplicates current or blank)
- Delete current frame
- Navigate between frames
- Copy/paste frames

### Onion Skin
- Shows previous frame at 25% opacity
- Helps with animation continuity
- Can be toggled on/off

### Playback
- FPS options: 6, 8, 12, 15, 24
- Loop playback
- Frame-by-frame stepping

## 13.6 Drawing Canvas Setup
```javascript
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

// High DPI support
const dpr = window.devicePixelRatio || 1;
canvas.width = containerWidth * dpr;
canvas.height = containerHeight * dpr;
ctx.scale(dpr, dpr);

// Smooth lines
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
```

---

# 14. SPEECH BUBBLES

## 14.1 Bubble Types

### Standard Speech
```css
.bubble {
    min-width: 50px;
    padding: clamp(10px, 2vw, 16px);
    font-family: 'Bangers', cursive;
    font-size: clamp(12px, 3vw, 18px);
    text-align: center;
    background: #fff;
    color: #000;
    border: clamp(2px, 0.5vw, 3px) solid #000;
    border-radius: 16px;
    position: relative;
    max-width: clamp(120px, 40vw, 220px);
    word-wrap: break-word;
}

/* Speech pointer */
.bubble::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    border: 10px solid transparent;
    border-top-color: #000;
}
```

### Shout
```css
.bubble.shout {
    background: #ffeb3b;
    border: 3px solid #999;
}
```

### Burst
```css
.bubble.burst {
    background: #ff5722;
    color: #fff;
    border-radius: 0;
    clip-path: polygon(
        50% 0%, 61% 35%, 98% 35%, 68% 57%, 
        79% 91%, 50% 70%, 21% 91%, 32% 57%, 
        2% 35%, 39% 35%
    );
}
.bubble.burst::after {
    display: none;
}
```

### Whisper
```css
.bubble.whisper {
    background: rgba(200, 200, 200, 0.7);
    color: #555;
    font-style: italic;
    font-size: 12px;
    border: 2px dashed #999;
}
.bubble.whisper::after {
    border-top-color: rgba(200, 200, 200, 0.7);
}
```

### Thought
```css
.bubble.thought {
    background: #fff;
    border-radius: 50%;
    padding: 16px 20px;
}
.bubble.thought::after {
    border: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    bottom: -8px;
}
.bubble.thought::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    bottom: -16px;
    left: calc(50% + 10px);
}
```

### Scream
```css
.bubble.scream {
    background: #ff1744;
    color: #fff;
    font-weight: 900;
    text-transform: uppercase;
    border: 4px solid #b71c1c;
    animation: shake 0.3s ease-in-out infinite;
}
.bubble.scream::after {
    border-top-color: #ff1744;
}
```

### Robot
```css
.bubble.robot {
    background: #263238;
    color: #4fc3f7;
    font-family: 'Courier New', monospace;
    border: 2px solid #4fc3f7;
    border-radius: 4px;
}
.bubble.robot::after {
    border-top-color: #263238;
}
```

### Drip
```css
.bubble.drip {
    background: linear-gradient(180deg, #e040fb, #7c4dff);
    color: #fff;
    border-radius: 20px 20px 20px 4px;
    font-family: 'Bangers', cursive;
}
.bubble.drip::after {
    border-top-color: #7c4dff;
}
```

### Glitch
```css
.bubble.glitch {
    background: #000;
    color: #0f0;
    font-family: 'Courier New', monospace;
    border: 2px solid #0f0;
    text-shadow: 2px 0 #f00, -2px 0 #00f;
    animation: glitch 0.5s ease-in-out infinite;
}
.bubble.glitch::after {
    border-top-color: #000;
}
```

### Retro
```css
.bubble.retro {
    background: #f5e6d3;
    color: #5d4037;
    border: 3px solid #8d6e63;
    font-family: 'Courier New', monospace;
    border-radius: 4px;
    box-shadow: 4px 4px 0 #5d4037;
}
.bubble.retro::after {
    border-top-color: #f5e6d3;
}
```

### Neon
```css
.bubble.neon {
    background: #0a0a1a;
    color: #fff;
    border: 2px solid #00ffff;
    box-shadow: 0 0 10px #00ffff, inset 0 0 10px rgba(0, 255, 255, 0.1);
    text-shadow: 0 0 10px #00ffff;
}
.bubble.neon::after {
    border-top-color: #0a0a1a;
}
```

### Graffiti
```css
.bubble.graffiti {
    background: linear-gradient(135deg, #ff6b35, #f7931e, #ffeb3b);
    color: #000;
    font-family: 'Bangers', cursive;
    font-weight: 900;
    border-radius: 8px;
    border: 3px solid #000;
}
.bubble.graffiti::after {
    display: none;
}
```

## 14.2 Bubble Data Structure
```javascript
{
    type: 'bubble',
    cls: '',                // '', 'shout', 'burst', etc.
    text: 'Hello!',
    x: 50,                  // Percent from left
    y: 50,                  // Percent from top
    scale: 1
}
```

---

# 15. SOUND EFFECTS

## 15.1 Effect List
```javascript
const EFFECTS = [
    // Classic (6)
    { text: 'POW!', color: '#ff0000' },
    { text: 'BANG!', color: '#ff9800' },
    { text: 'BOOM!', color: '#ffeb3b' },
    { text: 'ZAP!', color: '#2196f3' },
    { text: 'WHAM!', color: '#9c27b0' },
    { text: 'CRASH!', color: '#4caf50' },
    
    // Action (6)
    { text: 'KAPOW!', color: '#e91e63' },
    { text: 'SMASH!', color: '#f44336' },
    { text: 'SLAM!', color: '#ff5722' },
    { text: 'THWACK!', color: '#795548' },
    { text: 'WHOOSH!', color: '#00bcd4' },
    { text: 'ZOOM!', color: '#3f51b5' },
    
    // Impact (6)
    { text: 'SPLAT!', color: '#8bc34a' },
    { text: 'CRACK!', color: '#ffc107' },
    { text: 'SNAP!', color: '#ff4081' },
    { text: 'POP!', color: '#7c4dff' },
    { text: 'BIFF!', color: '#00e676' },
    { text: 'BONK!', color: '#ff6e40' },
    
    // Sounds (6)
    { text: 'SIZZLE!', color: '#ff1744' },
    { text: 'BUZZ!', color: '#ffea00' },
    { text: 'CRUNCH!', color: '#d500f9' },
    { text: 'SWOOSH!', color: '#00b0ff' },
    { text: 'THUD!', color: '#6d4c41' },
    { text: 'CLICK!', color: '#b388ff' },
    
    // Gen-Z / Slang (12)
    { text: 'SLAY!', color: '#e040fb' },
    { text: 'RIZZ!', color: '#ff80ab' },
    { text: 'BUSSIN!', color: '#69f0ae' },
    { text: 'NO CAP!', color: '#40c4ff' },
    { text: 'FIRE!', color: '#ff6d00' },
    { text: 'GOAT!', color: '#ffd600' },
    { text: 'YEET!', color: '#76ff03' },
    { text: 'BRUH!', color: '#ea80fc' },
    { text: 'SHEESH!', color: '#18ffff' },
    { text: 'W!', color: '#00e5ff' },
    { text: 'L!', color: '#ff1744' },
    { text: 'NPC!', color: '#b2ff59' },
    
    // Custom
    { text: 'CUSTOM', color: 'custom' }
];
```

## 15.2 Effect Styling
```css
.effect {
    font-family: 'Bangers', cursive;
    font-size: clamp(20px, 6vw, 32px);
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    -webkit-text-stroke: 1px #000;
    transform: rotate(-10deg) skew(-5deg);
    cursor: grab;
}
```

## 15.3 Effect Data Structure
```javascript
{
    type: 'effect',
    text: 'POW!',
    color: '#ff0000',
    x: 50,                  // Percent
    y: 50,                  // Percent
    scale: 1
}
```

---

# 16. EMOJI/STICKER SYSTEM

## 16.1 Emoji Categories
1. **Faces** - 😀😃😄😁 etc. (~93 emojis)
2. **Gestures** - 👋🤚✋ etc. (~54 emojis)
3. **People** - 👶🧒👦 etc. (~48 emojis)
4. **Animals** - 🐶🐱🐭 etc. (~80 emojis)
5. **Nature** - 🌸🌹🌺 etc. (~36 emojis)
6. **Food** - 🍔🍟🍕 etc. (~48 emojis)
7. **Activities** - ⚽🏀🎮 etc. (~60 emojis)
8. **Objects** - 📱💻⌚ etc. (~72 emojis)
9. **Symbols** - ❤️💛💚 etc. (~96 emojis)
10. **Special/Gaming** - 🔥💥⭐ etc. (~48 emojis)

## 16.2 Emoji Styling
```css
.emoji-sticker {
    font-size: clamp(28px, 8vw, 48px);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
}

.emoji-btn {
    aspect-ratio: 1;
    font-size: clamp(24px, 6vw, 32px);
    background: #1a1a1a;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 2px solid transparent;
}

.emoji-btn:hover {
    border-color: var(--studio-accent);
    background: var(--studio-hover);
}
```

## 16.3 Emoji Data Structure
```javascript
{
    type: 'emoji',
    char: '😀',
    x: 50,
    y: 50,
    scale: 1
}
```

---

# 17. AI IMAGE GENERATION

## 17.1 AI Models
```javascript
const AI_MODELS = {
    'flux': {
        name: 'Flow Studio',
        engine: 'FLUX.1-schnell',
        icon: '⭐',
        description: 'High-quality and smooth. Creates polished comic art with natural flow, clean shading, and cinematic lighting.',
        bestFor: 'Comic covers, hero shots, key art, vibrant backgrounds',
        styleTip: 'Add detail + lighting cues: "Clean 2D comic art, dramatic shadows, bold outlines, dynamic pose"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt}?model=flux&width=512&height=512&nologo=true'
    },
    'pollinations': {
        name: 'Classic Freestyle',
        engine: 'Pollinations',
        icon: '🎨',
        description: 'Fast, loose, imaginative. Soft, dreamy, stylized looks perfect for experimenting.',
        bestFor: 'Backgrounds, quick character tests, dream panels, fast drafts',
        styleTip: 'Be casual and expressive: "Trippy neon comic city, glitch graffiti, surreal atmosphere"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&nologo=true'
    },
    'anime': {
        name: 'Anime Studio',
        engine: 'Pony Diffusion',
        icon: '✨',
        description: 'Bright anime look with consistent characters. Expressive eyes, smooth shading, stable output.',
        bestFor: 'Manga-style pages, anime characters, cute mascots, bright scenes',
        styleTip: 'Keep prompts short + vibe-focused: "Anime hero, sharp cel shading, expressive eyes"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},anime style,cel shading?width=512&height=512&nologo=true'
    },
    'comic': {
        name: 'Comic LineLab',
        engine: 'SDXL Comic',
        icon: '📰',
        description: 'Pure comic book look. Thick lines, flat colors, inking consistency, stylized shadows.',
        bestFor: 'Traditional comic pages, consistent characters, retro/modern comic style',
        styleTip: 'Mention line weight + flat color: "Thick black ink lines, flat colors, 90s comic style"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},comic book style,thick ink lines,flat colors?width=512&height=512&nologo=true'
    },
    'sketch': {
        name: 'Sketch Mode',
        engine: 'Turbo',
        icon: '✏️',
        description: 'INSANELY fast. Great for quick roughs, silhouettes, and layout ideas.',
        bestFor: 'Panel planning, silhouette blocking, pose ideas, storyboard thumbnails',
        styleTip: 'Keep it simple: "Rough comic sketch, simple lines, storyboard frame"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},sketch,rough lines,storyboard?width=512&height=512&nologo=true'
    },
    'painterly': {
        name: 'Style Blender',
        engine: 'Kandinsky',
        icon: '🖌️',
        description: 'Painterly + abstract. Softer gradients, emotional scenes, fantasy landscapes.',
        bestFor: 'Emotional scenes, magic/dream sequences, painterly backgrounds',
        styleTip: 'Describe mood, not detail: "Misty blue forest, soft brush strokes, dreamy lighting"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},painterly,soft gradients,atmospheric?width=512&height=512&nologo=true'
    },
    'consistent': {
        name: 'Character Lock',
        engine: 'SDXL LoRA',
        icon: '🔒',
        description: 'Same character every time. Consistent faces across pages for long-form comics.',
        bestFor: 'Series characters, repeat panels, identity consistency, visual novels',
        styleTip: 'Add character details: "consistent character, comic pose, clean lines, waist-up shot"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},consistent character design,same face?width=512&height=512&nologo=true'
    },
    'toon': {
        name: 'Retro Toon',
        engine: 'SD Cartoon',
        icon: '🎪',
        description: 'Saturday-morning-cartoon style. Thick outlines, bright flat colors, expressive shapes.',
        bestFor: 'Humor comics, kids book-style panels, cartoon characters',
        styleTip: 'Keep it playful: "Bright cartoon, exaggerated shapes, thick outlines, playful energy"',
        endpoint: 'https://image.pollinations.ai/prompt/{prompt},cartoon style,thick outlines,bright colors,playful?width=512&height=512&nologo=true'
    }
};
```

## 17.2 Generation Limits
| Tier | Monthly Limit |
|------|---------------|
| Free | 0 |
| Plus | 10 |
| Pro | Unlimited (999) |
| Classroom | 50 |

## 17.3 AI Lab UI
```
┌─────────────────────────────────────────────────────┐
│ AI IMAGE LAB                                    [×] │
├─────────────────────────────────────────────────────┤
│ [Model Selector Grid - 8 models]                    │
│                                                     │
│ Selected: Flow Studio ⭐                            │
│ "High-quality and smooth..."                        │
│ Best for: Comic covers, hero shots...               │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Enter your prompt here...                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [🎨 Generate Image]                                 │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │         [Generated Image Preview]               │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Use in Panel] [Save to Gallery] [Regenerate]       │
└─────────────────────────────────────────────────────┘
```

---

# 18. BATTLE SYSTEM

## 18.1 Battle Modes
```javascript
const BATTLE_MODES = [
    { 
        id: 'BASE_FRIENDLY', 
        name: 'Friendly Battle', 
        icon: '🤝', 
        description: 'Safe practice - no card loss', 
        reward: 5 
    },
    { 
        id: 'BASE_FOR_KEEPS', 
        name: 'For Keeps', 
        icon: '💀', 
        description: 'Winner takes opponent card!', 
        reward: 25 
    },
    { 
        id: 'CHAOS', 
        name: 'Chaos Mode', 
        icon: '🌀', 
        description: 'Random modifiers each round', 
        reward: 15 
    },
    { 
        id: 'DECLARE_WAR', 
        name: 'I Declare War', 
        icon: '⚔️', 
        description: 'First to 10 points wins', 
        reward: 20 
    },
    { 
        id: 'PS21', 
        name: 'PS21', 
        icon: '🃏', 
        description: 'Blackjack-style card game', 
        reward: 15 
    },
    { 
        id: 'RUMBLE_ROYALE', 
        name: 'Rumble Royale', 
        icon: '👑', 
        description: 'Endless streak vs AI', 
        reward: 5 
    },
    { 
        id: 'TAG_TEAM', 
        name: 'Tag Team 2v2', 
        icon: '🏷️', 
        description: '2 cards vs 2 cards', 
        reward: 25 
    },
    { 
        id: 'SUDDEN_DEATH', 
        name: 'Sudden Death', 
        icon: '💥', 
        description: 'One round, high variance', 
        reward: 15 
    },
    { 
        id: 'MYSTERY_PACK', 
        name: 'Mystery Pack Duel', 
        icon: '📦', 
        description: 'Random pack showdown', 
        reward: 20 
    }
];
```

## 18.2 Chaos Modifiers
```javascript
const CHAOS_MODIFIERS = [
    { id: 'DOUBLE_INT', name: 'Brain Boost', icon: '🧠', description: 'INT doubled!' },
    { id: 'DOUBLE_PWR', name: 'Power Surge', icon: '💪', description: 'PWR doubled!' },
    { id: 'DOUBLE_SPD', name: 'Speed Demon', icon: '⚡', description: 'SPD doubled!' },
    { id: 'ZERO_PWR', name: 'Power Drain', icon: '🔋', description: 'PWR set to 0!' },
    { id: 'ZERO_SPD', name: 'Slow Motion', icon: '🐌', description: 'SPD set to 0!' },
    { id: 'ZERO_INT', name: 'Brain Fog', icon: '💭', description: 'INT set to 0!' },
    { id: 'LEGENDARY_NERF', name: 'Giant Killer', icon: '🗡️', description: 'Legendary+ cards -20% PWR' },
    { id: 'LOW_RARITY_BUFF', name: 'Underdog', icon: '🐕', description: 'Common/Uncommon +10 all stats' },
    { id: 'STAT_SWAP', name: 'Switcheroo', icon: '🔄', description: 'PWR and INT swap!' },
    { id: 'LOWEST_RARITY_WINS', name: 'Reverse Rarity', icon: '🔃', description: 'Lowest rarity wins round!' },
    { id: 'RANDOM_BOOST', name: 'Lucky Star', icon: '🌟', description: 'Random stat +25' },
    { id: 'DURABILITY_MATTERS', name: 'Battle Worn', icon: '🛡️', description: 'Stats scale with durability' }
];
```

## 18.3 Battle State
```javascript
currentBattle: {
    mode: null,                 // Battle mode ID
    phase: 'SELECT',            // SELECT, BATTLE, ROUND, RESULT
    playerCards: [],            // Selected player cards
    aiCards: [],                // AI opponent cards
    currentRound: 0,
    playerScore: 0,
    aiScore: 0,
    rounds: [],                 // Round history
    chaosModifier: null,        // Active chaos modifier
    streakCount: 0,             // Win streak
    ps21State: null,            // PS21 game state
    warPoints: { player: 0, ai: 0 },
    log: []                     // Battle log
}
```

## 18.4 Battle Flow
1. **MODE SELECT**: Choose battle type
2. **CARD SELECT**: Pick card(s) for battle
3. **OPPONENT MATCH**: Find opponent (AI or player)
4. **BATTLE ROUNDS**:
   - Each player picks stat to compare
   - Higher stat wins round
   - First to 3 rounds wins (varies by mode)
5. **RESULT**: Show winner, distribute rewards

## 18.5 Multiplayer Battle Codes
```javascript
// Valid characters (excludes confusing ones like O, 0, I, 1)
const BATTLE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Generate 6-character code
function generateBattleCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += BATTLE_CODE_CHARS[Math.floor(Math.random() * BATTLE_CODE_CHARS.length)];
    }
    return code;
}
```

---

# 19. USER SYSTEM

## 19.1 User Profile
```javascript
user: {
    id: 'user_' + Date.now(),
    name: 'New Player',
    handle: '@player',
    avatar: null,
    credits: 50,                // Starting credits
    xp: 0,
    level: 1,
    joinDate: new Date().toISOString(),
    isTeacher: false,
    classCode: null
}
```

## 19.2 Credits Economy
```javascript
const CREDIT_REWARDS = {
    'read_comic': 5,
    'rate_comic': 10,
    'create_comic': 25,
    'share_comic': 15,
    'viral_comic': 50,          // 100+ views
    'complete_chapter': 100,
    'win_battle': 5,
    'win_battle_keeps': 25,
    'daily_login': 10,
    'first_card': 50,
    'teacher_bonus': 0          // Variable
};

const RARITY_COSTS = {
    'UNCOMMON': 100,
    'RARE': 250,
    'EPIC': 500,
    'LEGENDARY': 1000,
    'MYTHIC': 2500
};
```

## 19.3 Card Categories
```javascript
const cardCategories = [
    { id: 'heroes', name: 'Heroes', icon: '🦸', color: '#ccc' },
    { id: 'villains', name: 'Villains', icon: '😈', color: '#888' },
    { id: 'legends', name: 'Legends', icon: '⭐', color: '#999' },
    { id: 'mythic', name: 'Mythic', icon: '🔮', color: '#bbb' },
    { id: 'sports', name: 'Sports', icon: '🏀', color: '#fff' },
    { id: 'won', name: 'Won in Battle', icon: '⚔️', color: '#fff' }
];
```

## 19.4 Classroom System
```javascript
classroom: {
    code: 'PRESS' + randomCode(),
    name: 'My Classroom',
    students: [],
    challenges: [],
    settings: {
        allowKeepsBattles: false,
        requireBattleApproval: true,
        battleHoursOnly: true,
        battleHoursStart: '12:00',
        battleHoursEnd: '13:00'
    }
}
```

---

# 20. SUBSCRIPTION SYSTEM

## 20.1 Tier Limits
```javascript
const TIER_LIMITS = {
    free: { 
        exports: 3,             // Per day
        aiGens: 0,              // Per month
        cloudSaves: 5, 
        watermark: true 
    },
    plus: { 
        exports: 10, 
        aiGens: 10, 
        cloudSaves: 50, 
        watermark: false 
    },
    pro: { 
        exports: 999,           // Unlimited
        aiGens: 999, 
        cloudSaves: 999, 
        watermark: false 
    },
    classroom: { 
        exports: 999, 
        aiGens: 50, 
        cloudSaves: 100, 
        watermark: false 
    }
};
```

## 20.2 Admin Configuration
```javascript
adminConfig: {
    watermarksEnabled: true,        // Add watermark to free exports
    exportLimitsEnabled: true,      // Enforce daily limits
    premiumFeaturesLocked: true,    // Lock premium features
    classroomMode: false,           // Unlock all for classroom
    aiLimitsEnabled: true,          // Enforce AI limits
    showUpgradePrompts: true,       // Show upgrade modals
    maintenanceMode: false,         // Disable app
    debugMode: false                // Show debug info
}
```

---

# 21. DATA PERSISTENCE

## 21.1 LocalStorage Keys
| Key | Type | Description |
|-----|------|-------------|
| pscomixx_state | JSON | Complete app state |
| pscomixx_tier | string | User subscription tier |
| pscomixx_tier_expiry | string | Tier expiration date |
| pscomixx_exports_today | number | Daily export count |
| pscomixx_exports_date | string | Export count date |
| pscomixx_ai_gens_month | number | Monthly AI generations |
| pscomixx_ai_gens_month_date | string | AI gen count month |
| pscomixx_player_name | string | User display name |
| pscomixx_legal_accepted | boolean | Terms accepted |
| pscomixx_legal_timestamp | string | Acceptance time |
| pscomixx_user_age | string | User age |
| pscomixx_parental_consent | boolean | Parental consent |
| pscomixx_school_account | boolean | School account flag |
| pscomixx_admin_config | JSON | Admin settings |
| pscomixx_ai_model | string | Selected AI model |
| pscomixx_creator_toggles | JSON | Creator preferences |

## 21.2 State Saving
```javascript
function saveState() {
    try {
        localStorage.setItem('pscomixx_state', JSON.stringify({
            pages: S.pages,
            card: S.card,
            cover: S.cover,
            cardCollection: S.cardCollection,
            // ... other persistent state
        }));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

// Auto-save on changes
let saveTimeout;
function queueSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveState, 1000);
}
```

## 21.3 Firebase Structure
```
/users/{userId}
    /profile
        name, handle, avatar, credits, xp, level
    /cards
        /{cardId}
            Card data
    /comics
        /{comicId}
            Comic data

/feed/{postId}
    authorId, author, content, thumbnail
    type, likes, comments[], timestamp

/battles/{battleCode}
    host, guest, mode, phase
    rounds[], scores, winner

/classrooms/{code}
    teacher, name, students[]
    challenges[], settings

/notifications/{userId}/{notifId}
    type, message, read, timestamp
```

---

# 22. TOUCH GESTURES

## 22.1 Panel Media Gestures

### Single Finger Drag (Pan)
```javascript
function startPanelDrag(e, panelIndex) {
    if (window.isOrientationChanging) return;
    
    const touch = e.touches[0];
    panelGizmoActive = true;
    gizmoStartX = touch.clientX;
    gizmoStartY = touch.clientY;
    
    const media = getPage().panelMedia[panelIndex];
    gizmoStartOffsetX = media?.offsetX || 0;
    gizmoStartOffsetY = media?.offsetY || 0;
}

function onPanelDrag(e) {
    if (!panelGizmoActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const dx = touch.clientX - gizmoStartX;
    const dy = touch.clientY - gizmoStartY;
    
    // Sensitivity factor
    const sensitivity = 0.3;
    
    media.offsetX = gizmoStartOffsetX + dx * sensitivity;
    media.offsetY = gizmoStartOffsetY + dy * sensitivity;
    
    // Clamp values
    media.offsetX = Math.max(-100, Math.min(100, media.offsetX));
    media.offsetY = Math.max(-100, Math.min(100, media.offsetY));
    
    updateMediaTransform();
}
```

### Two Finger Pinch (Zoom)
```javascript
function startPanelPinch(e) {
    if (e.touches.length !== 2) return;
    
    panelPinchActive = true;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    pinchStartDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    pinchStartScale = media?.scale || 1;
}

function onPanelPinch(e) {
    if (!panelPinchActive || e.touches.length !== 2) return;
    e.preventDefault();
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    const scaleFactor = currentDist / pinchStartDist;
    media.scale = pinchStartScale * scaleFactor;
    
    // Clamp scale
    media.scale = Math.max(0.3, Math.min(5, media.scale));
    
    updateMediaTransform();
}
```

### Two Finger Rotate
```javascript
function startPanelRotate(e) {
    if (e.touches.length !== 2) return;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    rotateStartAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
    ) * 180 / Math.PI;
    
    rotateStartRotation = media?.rotation || 0;
}

function onPanelRotate(e) {
    if (e.touches.length !== 2) return;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
    ) * 180 / Math.PI;
    
    const deltaAngle = currentAngle - rotateStartAngle;
    media.rotation = rotateStartRotation + deltaAngle;
    
    updateMediaTransform();
}
```

## 22.2 Element Gestures

### Drag to Move
```javascript
function startElementDrag(e, elementIndex) {
    e.preventDefault();
    e.stopPropagation();
    
    elDragActive = true;
    elDragIndex = elementIndex;
    
    const touch = e.touches[0];
    const element = getPage().pageElements[elementIndex];
    
    elDragStartX = touch.clientX;
    elDragStartY = touch.clientY;
    elDragOrigX = element.x;
    elDragOrigY = element.y;
}

function onElementDrag(e) {
    if (!elDragActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const canvas = document.querySelector('.canvas');
    const rect = canvas.getBoundingClientRect();
    
    const dx = touch.clientX - elDragStartX;
    const dy = touch.clientY - elDragStartY;
    
    // Convert to percentage
    const dxPercent = (dx / rect.width) * 100;
    const dyPercent = (dy / rect.height) * 100;
    
    element.x = elDragOrigX + dxPercent;
    element.y = elDragOrigY + dyPercent;
    
    // Clamp to canvas
    element.x = Math.max(0, Math.min(100, element.x));
    element.y = Math.max(0, Math.min(100, element.y));
    
    updateElementPosition();
}
```

## 22.3 Orientation Change Handling
```javascript
let isOrientationChanging = false;

function handleOrientationChange() {
    isOrientationChanging = true;
    
    // Cancel all active gestures
    panelGizmoActive = false;
    panelPinchActive = false;
    elDragActive = false;
    
    // Clear animation intervals
    clearInterval(drawAnimInterval);
    clearInterval(panelAnimIntervals);
    
    // Debounced re-render
    setTimeout(() => {
        isOrientationChanging = false;
        render();
    }, 800);
}

window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', debounce(handleResize, 600));
```

---

# 23. KEYBOARD SHORTCUTS

| Key | Action |
|-----|--------|
| Ctrl/Cmd + S | Save/Export |
| Ctrl/Cmd + Z | Undo (drawing mode) |
| Ctrl/Cmd + Shift + Z | Redo (drawing mode) |
| Delete/Backspace | Delete selected element |
| Escape | Deselect / Close sheet |
| Arrow Left | Previous page |
| Arrow Right | Next page |
| Space | Play/pause animation |

---

# 24. ACCESSIBILITY

## 24.1 Touch Targets
- Minimum touch target: 44px × 44px
- Button padding: At least 8px
- Adequate spacing between interactive elements

## 24.2 Color Contrast
- Text on dark: White (#fff) on #0a0a0a (contrast > 15:1)
- Muted text: #888 on #0a0a0a (contrast > 4.5:1)
- Accent elements: High visibility

## 24.3 Focus States
```css
button:focus-visible {
    outline: 2px solid var(--studio-accent);
    outline-offset: 2px;
}
```

## 24.4 Screen Reader Support
- Semantic HTML structure
- ARIA labels on interactive elements
- Alt text for images

---

# 25. PERFORMANCE OPTIMIZATIONS

## 25.1 iOS Optimizations
```javascript
// Disable heavy animations on iOS
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const style = document.createElement('style');
    style.textContent = `
        .stars, .stars-layer-2, .stars-layer-3,
        .comet, .nebula, .particle {
            display: none !important;
        }
        .space-bg {
            background: #000 !important;
        }
    `;
    document.head.appendChild(style);
}
```

## 25.2 Toast Optimization
```javascript
// Direct DOM update for toasts on mobile (avoid full render)
const toast = m => {
    S.toast = m;
    
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        let toastEl = document.getElementById('mobile-toast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'mobile-toast';
            toastEl.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #222;
                color: #fff;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 13px;
                z-index: 99999;
                pointer-events: none;
            `;
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = m;
        toastEl.style.display = 'block';
        
        setTimeout(() => {
            toastEl.style.display = 'none';
            S.toast = null;
        }, 2000);
    } else {
        render();
        setTimeout(() => { S.toast = null; render(); }, 2500);
    }
};
```

## 25.3 Debounced Operations
```javascript
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Usage
const debouncedResize = debounce(handleResize, 600);
window.addEventListener('resize', debouncedResize);
```

## 25.4 Image Optimization
- Use object-fit: contain for images
- Lazy load images outside viewport
- Compress exported images

---

# 26. ERROR HANDLING

## 26.1 Try-Catch Wrapping
```javascript
function safeOperation(operation, fallback) {
    try {
        return operation();
    } catch (e) {
        console.warn('Operation failed:', e);
        return fallback;
    }
}
```

## 26.2 Gesture Error Recovery
```javascript
function endPanelGizmo() {
    const wasActive = panelGizmoActive;
    panelGizmoActive = false;
    
    if (wasActive && !window.isOrientationChanging) {
        setTimeout(() => {
            try {
                render();
            } catch (e) {
                console.warn('Post-gesture render error:', e);
            }
        }, 50);
    }
    
    // Cleanup listeners (both capture and non-capture)
    try {
        window.removeEventListener('touchmove', onPanelGizmo, { capture: true });
        window.removeEventListener('touchmove', onPanelGizmo);
        window.removeEventListener('touchend', endPanelGizmo, { capture: true });
        window.removeEventListener('touchend', endPanelGizmo);
    } catch (e) {}
}
```

## 26.3 Storage Error Handling
```javascript
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('Storage save failed:', e);
        // Possibly quota exceeded
        if (e.name === 'QuotaExceededError') {
            toast('Storage full! Please export and clear some projects.');
        }
        return false;
    }
}
```

---

# 27. EXPORT SYSTEM

## 27.1 Image Export
```javascript
async function exportPage(pageIndex) {
    const canvas = document.querySelector('.canvas');
    
    // Use html2canvas
    const exportCanvas = await html2canvas(canvas, {
        scale: 2,                   // 2x resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
    });
    
    // Convert to blob
    exportCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comic-page-${pageIndex + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}
```

## 27.2 Card Export Dimensions
- Width: 750px
- Height: 1050px

## 27.3 Cover Export Dimensions
- Width: 663px
- Height: 1025px

## 27.4 Watermark (Free Tier)
```javascript
function addWatermark(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    ctx.font = '14px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('Made with Press Start CoMiXX', canvas.width - 10, canvas.height - 10);
    
    ctx.restore();
}
```

---

# APPENDIX A: COMPLETE EMOJI LIST

[Due to space constraints, this contains the first 50 emojis from each category. The full list contains 500+ emojis.]

**Faces (93 total)**
😀😃😄😁😆😅🤣😂🙂😉😊😇🥰😍🤩😘😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧...

**Gestures (54 total)**
👋🤚🖐️✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆🖕👇☝️👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍️💪🦾🦿🦵🦶👂🦻👃🧠🫀🫁🦷🦴👀👁️👅👄...

[Full list available in source code]

---

# APPENDIX B: FILTER DEFINITIONS

```javascript
const FILTERS = [
    { id: 'none', name: 'None', css: '' },
    { id: 'bw', name: 'B&W', css: 'grayscale(100%)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(50%) contrast(90%) brightness(90%)' },
    { id: 'comic', name: 'Comic', css: 'contrast(150%) saturate(150%)' },
    { id: 'pop', name: 'Pop Art', css: 'contrast(200%) saturate(200%) brightness(110%)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(100%) contrast(150%) brightness(80%)' },
    { id: 'sunset', name: 'Sunset', css: 'sepia(30%) saturate(150%) hue-rotate(-20deg)' },
    { id: 'cool', name: 'Cool', css: 'saturate(80%) hue-rotate(180deg)' },
    { id: 'warm', name: 'Warm', css: 'saturate(120%) hue-rotate(-30deg) brightness(105%)' },
    { id: 'fade', name: 'Fade', css: 'opacity(70%) brightness(110%)' },
    { id: 'dramatic', name: 'Dramatic', css: 'contrast(130%) brightness(90%) saturate(120%)' }
];
```

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| V11 | Dec 2025 | Orientation crash fix, submenu repositioning, scaling fixes |
| V10 | Nov 2025 | Social features, community feed |
| V9 | Oct 2025 | AI image generation integration |
| V8 | Sep 2025 | Battle system overhaul |
| V7 | Aug 2025 | Drawing mode with animation |
| V6 | Jul 2025 | Card evolution system |
| V5 | Jun 2025 | Multiplayer battles |
| V4 | May 2025 | Cover creator |
| V3 | Apr 2025 | Card creator |
| V2 | Mar 2025 | Panel templates |
| V1 | Feb 2025 | Basic comic builder |

---

*Document created for Lambda D.R.E.A.M. Academy*
*Last updated: December 2025*
*Total specification length: ~2,500 lines*
