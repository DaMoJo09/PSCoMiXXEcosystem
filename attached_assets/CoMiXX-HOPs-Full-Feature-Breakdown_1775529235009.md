# CoMiXX HOPs — Full Feature Breakdown for Replit Implementation

**Version:** 2.0  
**Date:** 2026-04-07  
**Source:** FX Studio HOP Builder (production build)  
**Purpose:** 1:1 feature parity reference for Replit/CoMiXX implementation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models & Types](#2-data-models--types)
3. [Scene System](#3-scene-system)
4. [Layer System](#4-layer-system)
5. [Playback Modes](#5-playback-modes)
6. [Audio System](#6-audio-system)
7. [Text System & Animations](#7-text-system--animations)
8. [Vibe Modes (One-Tap Filters)](#8-vibe-modes-one-tap-filters)
9. [Beat React System](#9-beat-react-system)
10. [Keyframe Animation](#10-keyframe-animation)
11. [Free Transform / On-Canvas Editing](#11-free-transform--on-canvas-editing)
12. [Zone Out Mode (Immersive Playback)](#12-zone-out-mode-immersive-playback)
13. [Export System](#13-export-system)
14. [Project Management & Persistence](#14-project-management--persistence)
15. [Asset Library Integration](#15-asset-library-integration)
16. [Publishing & Ecosystem Sync](#16-publishing--ecosystem-sync)
17. [UI Layout & Panels](#17-ui-layout--panels)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [Context Menu](#19-context-menu)
20. [Viewport Modes](#20-viewport-modes)
21. [Database Schema](#21-database-schema)

---

## 1. Architecture Overview

The HOP Builder is a single-page React component (`/hops` route) that provides a professional short-form looping media editor. Think of it as a simplified After Effects meets TikTok video creator, optimized for looping content.

**Key architectural decisions:**
- All state is React `useState` (no external state manager)
- Layers are stored per-scene in a `Record<sceneId, HopLayer[]>` map
- Keyframes are stored per-scene in a `Record<sceneId, Record<layerId, HopKeyframe[]>>` map
- Audio uses the **Web Audio API** for gapless looping (with HTML `<audio>` fallback)
- Exports use `html-to-image` (toPng) for frame capture + Canvas API for compositing
- Autosave every 30 seconds to `localStorage`

---

## 2. Data Models & Types

### HopProject (Top-level project)
```typescript
type HopProject = {
  id: string;                    // e.g. "hop-1712345678"
  title: string;                 // default: "Untitled HOP"
  description: string;
  type: "single" | "series";
  coverImage: string | null;
  audioTrack: string | null;     // base64 data URL of audio file
  audioBpm: number | null;       // for beat sync
  tags: string[];
  visibility: "private" | "unlisted" | "public";
  loopMode: "single_loop" | "full_series_loop" | "manual_advance";
  clipLengthMode: "30s" | "90s" | "custom";
  totalDuration: number;         // sum of all scene durations
  scenes: HopScene[];
  syncStatus: "draft" | "queued" | "published" | "failed";
  previewSettings: {
    autoplay: boolean;
    mutedByDefault: boolean;
    showCaptions: boolean;
  };
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
};
```

### HopScene (Individual scene in timeline)
```typescript
type HopScene = {
  id: string;                    // e.g. "scene-1712345678-0"
  order: number;
  assetType: "image" | "gif" | "video" | "text_card" | "motion_scene";
  assetUrl?: string;             // base64 data URL
  textOverlay?: string;          // text for overlays or text_card scenes
  caption?: string;              // bottom caption
  duration: number;              // seconds (default: 5, range: 1-30)
  transition: "cut" | "fade" | "zoom" | "glitch";
  loopInScene: boolean;
  effects: string[];             // effect IDs
};
```

### HopLayer (Per-scene compositing layer)
```typescript
type HopLayer = {
  id: string;
  name: string;
  type: "media" | "text" | "effect" | "audio" | "caption";
  visible: boolean;
  locked: boolean;
  opacity: number;               // 0.0 - 1.0
  zIndex: number;
  dataUrl?: string;              // image/video/gif data
  text?: string;                 // for text/caption layers
  effectId?: string;
  
  // Transform
  positionX: number;             // pixels from center
  positionY: number;             // pixels from center
  scale: number;                 // percentage (100 = normal)
  rotation: number;              // degrees
  
  // Media fit
  objectFit: "cover" | "contain" | "fill";
  
  // Blend mode (CSS mix-blend-mode)
  blendMode: "normal" | "multiply" | "screen" | "overlay" | "darken" | 
             "lighten" | "color-dodge" | "color-burn" | "hard-light" | 
             "soft-light" | "difference" | "exclusion";
  
  // Text styling
  fontFamily?: string;
  fontSize?: number;             // px
  fontColor?: string;            // hex
  strokeColor?: string;
  strokeWidth?: number;          // px
  bold?: boolean;
  italic?: boolean;
  
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  
  // Beat React
  beatReact?: "none" | "pulse" | "bounce" | "shake" | "glow" | 
              "zoom" | "rotate" | "flash" | "tilt";
  beatIntensity?: number;        // 0-100
  
  // Text Animation
  textAnimation?: "none" | "typewriter" | "fade-in" | "slide-up" | "glitch" | 
                  "bounce" | "wave" | "neon-flicker" | "zoom-in" | "spin-in" | 
                  "shake" | "rainbow";
};
```

### HopKeyframe (Animation keyframe)
```typescript
type HopKeyframe = {
  id: string;
  time: number;          // seconds from scene start
  property: string;      // "positionX" | "positionY" | "scale" | "rotation" | "opacity"
  value: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic";
};
```

### HopAudioClip (Multi-track audio)
```typescript
type HopAudioClip = {
  id: string;
  name: string;
  dataUrl: string;       // base64 audio
  startTime: number;     // offset in timeline (seconds)
  duration: number;      // actual audio duration
  trimStart: number;
  trimEnd: number;
  volume: number;        // 0.0 - 1.0
  muted: boolean;
  color: string;         // HSL color for timeline visualization
};
```

### TextOverlayStyle (Per-scene text overlay styling)
```typescript
type TextOverlayStyle = {
  fontFamily: string;    // default: "Press Start 2P"
  fontSize: number;      // default: 14
  color: string;         // default: "#FFFFFF"
  strokeColor: string;   // default: "#000000"
  strokeWidth: number;   // default: 2
  bgColor: string;       // default: "#000000"
  bgOpacity: number;     // 0-100, default: 50
  textAlign: "left" | "center" | "right";
  position: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  animation: TextAnimationType;  // see Text Animations section
};
```

---

## 3. Scene System

### Scene Management
- **Add scene**: Creates empty scene with default 5s duration, "cut" transition
- **Remove scene**: Minimum 1 scene required
- **Duplicate scene**: Deep clones scene data + all associated layers
- **Reorder scenes**: Drag-and-drop in both left panel and bottom timeline
- **Scene thumbnails**: Live preview thumbnails in left panel showing first frame

### Scene Properties (Right Panel)
- Duration slider: 1–30 seconds
- Transition picker: Cut ✂️ | Fade 🌫️ | Zoom 🔍 | Glitch ⚡
- Loop in Scene toggle
- Text overlay input + styling
- Caption input (bottom overlay)

### Import Flow ("handleVibeDropped" — the core import function)
When an asset is dropped/uploaded:
1. If only 1 empty scene exists → fills that scene + auto-creates Background layer + auto-starts playback
2. If current selected scene is empty → fills that scene
3. Otherwise → creates a new scene with the asset

Accepted formats: images (PNG, JPG, GIF, WebP, SVG), videos (MP4, WebM, OGG, MOV)

---

## 4. Layer System

### Layer Types
| Type | Icon | Purpose |
|------|------|---------|
| `media` | 🖼️ | Image, GIF, or video content |
| `text` | T | Styled text with animations |
| `effect` | ✨ | FX overlays from effect library |
| `audio` | 🎵 | Scene-level audio (reserved) |
| `caption` | T | Bottom captions |

### Layer Operations
- **Add**: Creates layer with sensible defaults
- **Delete**: Remove layer, deselect if was selected
- **Duplicate**: Deep clone with " copy" suffix
- **Reorder**: Drag-and-drop changes z-index
- **Toggle visibility**: Eye icon
- **Toggle lock**: Lock icon prevents editing
- **Copy/Paste**: Ctrl+C / Ctrl+V across scenes

### Layer Properties (Right Panel when layer selected)
**Media layers:**
- Name input
- Replace Media button (file upload)
- Fit Mode: COVER | CONTAIN | FILL
- Opacity slider (0-100%)
- Blend Mode dropdown (12 CSS blend modes)
- Beat React selector + intensity slider

**Text layers:**
- Text input
- Font family dropdown (full font registry)
- Font size slider (8-96px)
- Font color picker
- Stroke color + width
- Bold / Italic toggles
- Text Animation selector (12 presets)
- Shadow controls (color, blur, X, Y)
- Beat React + intensity

**Effect layers:**
- Opens Effect Picker modal to browse/select FX
- Same transform + blend controls as media

### Background Layer Convention
The first media layer named "Background" with zIndex 0 gets special treatment:
- Fills entire canvas (`inset: 0`) instead of being positioned from center
- Uses `objectFit` to fill frame
- No max-width/height constraints

---

## 5. Playback Modes

### Two Display Modes
1. **Standard Mode** (`hopDisplayMode: "standard"`)
   - Scene-cycling: shows one scene at a time, transitions between them
   - Duration-based: each scene plays for its `duration` seconds
   - Transitions: CSS animation classes applied 500ms before scene change
   
2. **Moving Mode** (`hopDisplayMode: "moving"`)
   - Panoramic horizontal strip of all scenes side by side
   - Scene widths are proportional to duration: `width = duration * 120px`
   - Two sub-modes:
     - **Standard**: Scene cycling within the strip view
     - **Screensaver**: Continuous smooth horizontal scroll (Roku-style)
   - Screensaver settings:
     - Scroll speed: 5-150 px/sec (slider)
     - Direction: Left or Right
     - Seamless toggle: removes borders between scenes for continuous look

### Playback Engine
- Scene cycling via `setTimeout` chain (not requestAnimationFrame for scene switching)
- Screensaver scroll uses `requestAnimationFrame` with `performance.now()` delta-time
- Loop counter increments each time sequence completes
- Video elements auto-play when their scene is active, pause otherwise
- Transitions: CSS classes `hop-transition-fade`, `hop-transition-zoom`, `hop-transition-glitch`

---

## 6. Audio System

### Primary Audio Track
- Single audio file attached to entire HOP project
- Supports: MP3, WAV, OGG, AAC, M4A, FLAC
- **Gapless looping** via Web Audio API:
  ```
  AudioContext → decodeAudioData → AudioBufferSourceNode (loop: true) → GainNode → destination
  ```
- Fallback to HTML `<audio loop>` if Web Audio fails
- Mute/unmute toggles GainNode value (0 or 1)
- Audio buffer cached, invalidated when track changes

### BPM & Beat Sync
- Manual BPM input (1-300)
- "Snap to BPM" button: adjusts all scene durations to nearest beat multiple
  ```
  beatDuration = 60 / bpm
  bars = max(2, round(scene.duration / beatDuration))
  scene.duration = bars * beatDuration
  ```

### Waveform Visualization
- Generated on audio load using Web Audio API `decodeAudioData`
- 100 samples averaged from channel data
- Rendered as vertical bars in the Audio tab

### Multi-Track Audio Clips
- Additional audio clips on the timeline
- Each clip has: start time, duration, trim points, volume, mute, color
- Drag-and-drop audio files to "+ DROP AUDIO CLIP" zone
- Visual representation in timeline as colored bars

---

## 7. Text System & Animations

### Text Sources
1. **Scene Text Overlay**: Per-scene styled text positioned at top/center/bottom
2. **Text Layers**: Independent text layers with free transform

### Text Presets (Quick-Apply)
| Preset | Font | Size | Color | Style |
|--------|------|------|-------|-------|
| SUBTITLE | Press Start 2P | 12 | White | Black bg 60% |
| TITLE | Bangers | 32 | Gold | Black stroke 3px |
| SHOUT | Anton | 48 | Red | White stroke 4px, bold |
| WHISPER | Press Start 2P | 10 | Gray | Black bg 30%, italic |
| NEON | Audiowide | 24 | Cyan | Magenta stroke 2px, glitch anim |
| COMIC | Bangers | 28 | White | Black stroke 4px, red bg 80% |

### Text Animations (12 Presets)
Each maps to a CSS `@keyframes` animation class:

| ID | Label | CSS Class | Description |
|----|-------|-----------|-------------|
| `none` | None | — | Static |
| `typewriter` | Typewriter ⌨️ | `hop-text-typewriter` | Characters appear one by one (steps + overflow clip) |
| `fade-in` | Fade In 🌫️ | `animate-fade-in` | Opacity 0→1 over 1s |
| `slide-up` | Slide Up ⬆️ | `hop-text-slide-up` | translateY(30px→0) + fade |
| `glitch` | Glitch ⚡ | `hop-text-glitch` | Rapid clip-path + translate jitter |
| `bounce` | Bounce 🏀 | `hop-text-bounce` | Spring-like vertical bounce |
| `wave` | Wave 🌊 | `hop-text-wave` | Individual character Y oscillation |
| `neon-flicker` | Neon Flicker 💡 | `hop-text-neon-flicker` | Opacity + text-shadow flicker |
| `zoom-in` | Zoom In 🔍 | `hop-text-zoom-in` | Scale(0→1) + fade |
| `spin-in` | Spin In 🔄 | `hop-text-spin-in` | rotate(360→0) + scale |
| `shake` | Shake 🫨 | `hop-text-shake` | Rapid X/Y jitter |
| `rainbow` | Rainbow 🌈 | `hop-text-rainbow` | Hue-rotate filter cycling |

### CSS Keyframes Required
```css
@keyframes hop-typewriter { from { max-width: 0 } to { max-width: 100% } }
@keyframes hop-slide-up { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
@keyframes hop-glitch { /* clip-path + translate jitter at 0%/20%/40%/60%/80%/100% */ }
@keyframes hop-bounce-text { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-18px) } }
@keyframes hop-wave { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
@keyframes hop-neon-flicker { /* opacity + text-shadow cycling */ }
@keyframes hop-zoom-in { from { opacity:0; transform:scale(0.2) } to { opacity:1; transform:scale(1) } }
@keyframes hop-spin-in { from { opacity:0; transform:rotate(360deg) scale(0.3) } to { opacity:1; transform:rotate(0) scale(1) } }
@keyframes hop-shake-text { /* translateX oscillation ±6px */ }
@keyframes hop-rainbow { 0% { filter:hue-rotate(0deg) } 100% { filter:hue-rotate(360deg) } }
```

---

## 8. Vibe Modes (One-Tap Filters)

10 preset color-grade overlays applied as effect layers with blend modes:

| ID | Label | Emoji | Gradient Colors | Blend Mode |
|----|-------|-------|-----------------|------------|
| `lofi-chill` | LO-FI CHILL | 🌙 | purple 25% → transparent | screen |
| `golden-hour` | GOLDEN HOUR | 🌅 | orange 35% → red-orange 15% | overlay |
| `cyberpunk` | CYBERPUNK | ⚡ | cyan 20% → magenta 25% | screen |
| `noir` | NOIR | 🎬 | black 50% → transparent | multiply |
| `anime-pop` | ANIME POP | ✨ | hot pink 30% → yellow 15% | screen |
| `vintage` | VINTAGE | 📷 | brown 25% → tan 20% | overlay |
| `ice-cold` | ICE COLD | ❄️ | deep sky blue 30% → light blue 10% | screen |
| `fire` | FIRE | 🔥 | red-orange 40% → orange 15% | screen |
| `dream` | DREAM | 💫 | light pink 30% → powder blue 20% | screen |
| `matrix` | MATRIX | 🟢 | green 15% → dark green 25% | screen |

**Implementation:**
- Creates a 400×400 canvas gradient → converts to data URL
- Adds as effect layer named "VIBE: {label}" with opacity 0.8
- Replaces any existing vibe layer (filters by `name.startsWith("VIBE:")`)
- "Apply to ALL" option: applies same vibe to every scene
- Right-click on vibe button → apply to all scenes

---

## 9. Beat React System

Layers can react to the audio BPM with 9 animation presets:

| Mode | CSS Animation | Variables Used |
|------|---------------|----------------|
| `none` | — | — |
| `pulse` | `hop-beat-pulse-layer` | `--hop-beat-intensity` (scale) |
| `bounce` | `hop-beat-bounce` | `--hop-beat-px` (translateY) |
| `shake` | `hop-beat-shake` | `--hop-beat-px` (translateX) |
| `glow` | `hop-beat-glow` | brightness filter |
| `zoom` | `hop-beat-zoom` | `--hop-beat-intensity` (scale) |
| `rotate` | `hop-beat-rotate` | `--hop-beat-deg` (rotation) |
| `flash` | `hop-beat-flash` | `--hop-base-opacity` (opacity) |
| `tilt` | `hop-beat-tilt` | `--hop-beat-deg` (skew) |

**Animation timing:** `duration = 60 / bpm` seconds, `ease-out`, `infinite`
**Intensity:** 0-100 slider controlling magnitude of effect via CSS custom properties

---

## 10. Keyframe Animation

### Animatable Properties
| Property | Label | Min | Max |
|----------|-------|-----|-----|
| `positionX` | X | -500 | 500 |
| `positionY` | Y | -500 | 500 |
| `scale` | SCALE | 10 | 500 |
| `rotation` | ROT | -360 | 360 |
| `opacity` | OPACITY | 0 | 1 |

### Easing Curves
Linear, Ease In, Ease Out, Ease In/Out, Bounce, Elastic

### Keyframe Operations
- Add keyframe at current time for selected property
- Delete individual keyframes
- Change easing per keyframe
- Keyframes sorted by time ascending
- Visual diamond markers on timeline tracks

---

## 11. Free Transform / On-Canvas Editing

Uses the shared `FreeTransformWrapper` component providing:
- **8 resize handles** (corners + midpoints)
- **Rotation knob** (top center)
- **Drag to move** (click and drag body)
- **Dominant-axis scaling** logic
- **ESC to deselect**, click empty space to deselect

Applies to: media layers, text layers, effect layers (non-background)

Background layers fill the canvas and are NOT free-transformable.

---

## 12. Zone Out Mode (Immersive Playback)

Full-screen cinematic playback mode:

### Standard Zone Out
- Full-screen black background
- Canvas scales to fill screen while maintaining aspect ratio:
  ```
  scale = min(window.innerWidth / canvasW, window.innerHeight / canvasH)
  ```
- Scene cycling with transitions
- Loop counter visible

### Moving Screensaver Zone Out
- Panoramic strip fills screen height
- Continuous horizontal scroll animation
- Scenes duplicated for seamless loop wrapping
- All layers rendered per-scene with correct transforms

### Zone Out UI Overlay
- Top bar: Loop counter, scene indicator, mute button, EXIT button
- Bottom left: HOP title + metadata (type, episode, duration)
- Bottom center: "ESC or double-click to exit"
- Exit methods: ESC key, double-click, EXIT button

---

## 13. Export System

### Export Presets
| ID | Label | Dimensions | Platform |
|----|-------|-----------|----------|
| `tiktok` | TikTok / Reels | 1080×1920 | 9:16 |
| `ig-story` | IG Story | 1080×1920 | 9:16 |
| `ig-post` | IG Post | 1080×1080 | 1:1 |
| `ig-reel` | IG Reel | 1080×1920 | 9:16 |
| `youtube-short` | YT Short | 1080×1920 | 9:16 |
| `landscape` | Landscape | 1920×1080 | 16:9 |
| `twitter` | X / Twitter | 1200×675 | 16:9 |
| `custom` | Custom | User-defined | — |

### PNG Export
- Single frame capture via `toPng` from `html-to-image`
- `pixelRatio: 2` for retina quality
- Filters out elements with `data-export-hide` attribute

### GIF Export
- Uses `gifenc` library
- Iterates through scenes (max 20)
- 4 frames per scene
- 480px width, proportional height
- Forces "standard" display mode during capture
- Object-cover fitting to fill frame (no black bars)
- 150ms settle delay per scene for DOM rendering

### Video Export (WebM)
- Uses `MediaRecorder` API with `canvas.captureStream(0)`
- Codec: VP9 preferred, VP8 fallback
- Bitrate: 5 Mbps
- 24 FPS
- Max dimension capped at 1080px
- Iterates through all scenes, rendering each for its duration
- Object-cover fitting for 1:1 fill
- Forces "standard" mode during capture

### Export Pipeline (Critical for 1:1 parity)
1. Force `hopDisplayMode` to "standard"
2. Wait for 2 `requestAnimationFrame` cycles
3. For each scene:
   a. Set `selectedSceneIdx` and `previewSceneIdx` to current scene
   b. Wait for RAF + 150ms settle
   c. Capture frame via `toPng`
   d. Load as `Image` element
   e. Draw to export canvas using object-cover math:
   ```
   imgRatio = img.width / img.height
   canvasRatio = renderW / renderH
   if (imgRatio > canvasRatio) { crop width }
   else { crop height }
   ctx.drawImage(img, sx, sy, sw, sh, 0, 0, renderW, renderH)
   ```
4. Restore original display mode

---

## 14. Project Management & Persistence

### Local Storage
- Auto-saves every 30 seconds to `localStorage` key: `"hop-builder-autosave"`
- Manual save via Ctrl+S or Save button
- Save status indicator: idle → saving → saved ✓ (3s timeout)

### Saved Data Structure
```typescript
{
  hop: HopProject,
  sceneLayers: Record<string, HopLayer[]>,
  sceneTextStyles: Record<string, TextOverlayStyle>,
  sceneKeyframes: Record<string, Record<string, HopKeyframe[]>>,
  exportPreset: string,
  audioClips: HopAudioClip[],
  hopDisplayMode: "standard" | "moving",
  scrollSpeed: number,
  scrollDirection: "left" | "right",
  seamlessStitch: boolean
}
```

### Cloud Projects (Supabase)
- Save/load via `hop_projects` table
- Project data stored as JSONB in `project_data` column
- Thumbnail stored as `thumbnail_url`
- Projects drawer shows all user's saved HOPs
- New Project button resets all state

---

## 15. Asset Library Integration

### Saving to Library
- Saves to IndexedDB (`press-start-asset-library` database)
- Category: `"hop"`
- Includes full project data in `metadata.projectData`
- Generates thumbnail via `toPng`
- Tags: `["hop", "project", ...userTags]`

### Loading from Library
- Via `sessionStorage` key `"hop-library-load"`:
  1. Library page stores project data in sessionStorage
  2. Navigates to `/hops`
  3. HOP Builder reads sessionStorage on mount
  4. Reconstructs full project state
  5. Clears sessionStorage key
- Direct load function `loadHopFromLibrary(projectData)` also available

### Asset Import from Other Modes
- Receives `{ importImage: dataUrl, importName: string }` via React Router state
- Processes through `handleVibeDropped`

---

## 16. Publishing & Ecosystem Sync

### Publish to Streaming
Invokes `publish-hop` edge function with payload:
```typescript
{
  contentType: "hop",
  title, description,
  creatorEmail, creatorId,
  thumbnail,
  exportSize: { width, height, preset },
  metadata: { type, loopMode, clipLengthMode, totalDuration, sceneCount, bpm, tags, previewSettings },
  scenes: [{ ...scene, layers: sceneLayers[scene.id] }],
  audioTrack,
  seriesId, seriesTitle, episodeNumber,
  visibility
}
```
On success: fires `xp-action` with action "publish"

### CoMiXX Sync
Uses `useSyncToCoMiXX` hook:
- Exports as type `"hop-project"` with `asset_tag: "hop-loop"`
- Includes mode hints for comic/VN integration

---

## 17. UI Layout & Panels

### Header Bar (Top)
Left to right:
- Mode icon + "HOP BUILDER" label
- Import button
- Editable project title input
- Play/Stop toggle
- Moving mode sub-mode toggle (Standard | Scroll) — only when Moving mode active
- Zone Out button
- Mute/Unmute toggle
- Settings gear (toggles settings panel)
- Save button with status indicator
- Projects button (opens drawer)
- Viewport mode buttons (16:9 | 9:16 | 4:3 | 1:1)
- Standard/Moving HOP toggle
- Publish button
- Save HOP (to library)
- GIF export
- MP4 export
- CoMiXX sync
- Zoom controls
- Save to Library
- Send To menu

### Left Panel (w-60, 240px)
Three tabs:
1. **SCENES**: Scene list with thumbnails, add/remove/duplicate, drag reorder, upload/text buttons
2. **AUDIO**: Audio upload, waveform viz, BPM input, snap-to-beat, audio management
3. **ASSETS**: Asset browser for importing from library

### Center: Canvas Area
- Zoomable canvas container (scroll wheel zoom)
- Aspect ratio determined by export preset
- Moving mode shows horizontal strip of all scenes
- Free transform handles on selected layer
- Moving mode info bar: "MOVING HOP • {scenes} scenes • {duration}s • {speed}px/sec scale"

### Right Panel (w-72, 288px)
**Top section: LAYERS panel**
- Layer list with drag reorder
- Add buttons: Media, Text, FX, + generic
- Per-layer: grip handle, type icon, name, opacity %, visibility/lock/delete buttons
- Selected layer highlight

**Bottom section: Context-sensitive properties**
Determined by `rightContext`:
- `"scene"`: Scene properties + Vibe Modes grid + text overlay styling
- `"media-layer"`: Media properties + fit mode + blend + beat react
- `"text-layer"`: Text properties + font + animation + shadow + beat react
- `"effect-layer"`: Effect properties + blend + beat react

### Bottom: Timeline
- Multi-track timeline (After Effects style)
- Scene track with drag-reorderable thumbnails
- Layer tracks with keyframe diamonds
- Audio track with waveform + clip visualization
- Playback controls: Skip back, Play/Pause, Skip forward
- Time display: current time / total duration
- Loop count
- Timeline zoom (0.5x - 4x)
- Snap to Grid toggle
- Add Audio Clip button + drop zone

---

## 18. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause (via timeline) |
| `Escape` | Exit Zone Out / Deselect layer |
| `Delete` / `Backspace` | Delete selected layer |
| `Ctrl+C` | Copy selected layer |
| `Ctrl+V` | Paste layer |
| `Ctrl+D` | Duplicate selected layer |
| `Ctrl+S` | Save project |
| `V` | Select/pointer mode (deselect tools) |

Note: Shortcuts are suppressed when focus is in INPUT, TEXTAREA, or SELECT elements.

---

## 19. Context Menu

Right-click on canvas shows:
- PLAY / STOP
- ZONE OUT
- ADD SCENE
- (separator)
- ADD AUDIO / REPLACE AUDIO
- MUTE / UNMUTE (if audio exists)
- REMOVE AUDIO (if audio exists)
- SNAP TO {bpm} BPM (if BPM set)
- (separator)
- PUBLISH

---

## 20. Viewport Modes

Preview aspect ratios (editor-only, doesn't affect export):

| Mode | Width | Height | Label |
|------|-------|--------|-------|
| `desktop` | 800 | 500 | 16:9 |
| `mobile` | 280 | 500 | 9:16 |
| `tablet` | 450 | 500 | 4:3 |
| `square` | 500 | 500 | 1:1 |

---

## 21. Database Schema

### hop_projects table (already exists)
```sql
CREATE TABLE hop_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled HOP',
  is_template BOOLEAN DEFAULT false,
  project_data JSONB DEFAULT '{}',   -- full serialized project state
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE hop_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own hops" ON hop_projects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### project_data JSONB structure
The `project_data` column stores the full serialized state:
```json
{
  "hop": { /* HopProject */ },
  "sceneLayers": { "scene-id": [ /* HopLayer[] */ ] },
  "sceneTextStyles": { "scene-id": { /* TextOverlayStyle */ } },
  "sceneKeyframes": { "scene-id": { "layer-id": [ /* HopKeyframe[] */ ] } },
  "exportPreset": "tiktok",
  "audioClips": [ /* HopAudioClip[] */ ],
  "hopDisplayMode": "standard",
  "scrollSpeed": 30,
  "scrollDirection": "left",
  "seamlessStitch": true
}
```

---

## Appendix: File Map

| File | Purpose |
|------|---------|
| `src/pages/HopBuilder.tsx` | Main builder (3159 lines) |
| `src/types/hop-types.ts` | Core types: HopProject, HopScene |
| `src/components/hop/HopLayersPanel.tsx` | Layer type definitions + basic layers UI |
| `src/components/hop/HopTimeline.tsx` | Multi-track timeline component |
| `src/components/hop/HopExportPanel.tsx` | Export presets + size picker |
| `src/components/hop/HopAssetBrowser.tsx` | Asset import browser |
| `src/components/hop/HopEffectPicker.tsx` | FX library browser |
| `src/components/hop/HopProjectsDrawer.tsx` | Cloud projects manager |
| `src/components/shared/FreeTransformWrapper.tsx` | On-canvas transform handles |
| `src/hooks/useCanvasZoom.ts` | Canvas zoom logic |
| `src/components/shared/ZoomControls.tsx` | Zoom UI controls |

---

*This document represents the complete feature set of the FX Studio HOP Builder as of 2026-04-07. All features described are implemented and production-ready.*
