# Architecture Notes: Panel Layout, Image Filters & Bidirectional CoMiXX Sync

---

## 1. Panel Layout Mode — FULL IMPLEMENTATION SPEC (NEW MODE: `/layout`)

### Vision
A comic page composition tool where users arrange images/assets into panel grids. Lightweight InDesign for comics. This is the **next feature to build**.

### Route & Navigation
- Add route `/layout` in `src/App.tsx` → `<PanelLayoutMode />`
- Add entry to `src/components/ModeNav.tsx` MODES array:
  ```typescript
  { path: "/layout", label: "LAYOUT", icon: LayoutGrid, color: "text-neon-green" }
  ```
  (import `LayoutGrid` from `lucide-react`)

### Page Structure (3-column layout)
```
┌─────────────┬────────────────────────┬──────────────┐
│  TEMPLATES  │     CANVAS (CSS Grid)  │  PROPERTIES  │
│  & ASSETS   │     with panels        │  per-panel   │
│  (left 240) │     (flex-1)           │  (right 260) │
└─────────────┴────────────────────────┴──────────────┘
```

### Data Types — create in `src/types/layout-types.ts`
```typescript
export type PageSize = "us-comic" | "manga-b5" | "euro-a4" | "square" | "custom";
export type BorderStyle = "thick-ink" | "thin" | "rounded" | "borderless" | "jagged" | "torn" | "double";
export type PanelFit = "cover" | "contain" | "fill" | "none";

export interface PanelCell {
  id: string;
  row: number;       // grid row start (1-based)
  col: number;       // grid col start (1-based)
  rowSpan: number;   // how many rows this panel spans
  colSpan: number;   // how many cols this panel spans
  imageUrl: string | null;       // data URL or storage URL
  imageFit: PanelFit;
  imageOffsetX: number;          // pan within panel (px)
  imageOffsetY: number;
  imageZoom: number;             // 50-300, default 100
  borderStyle: BorderStyle;
  borderWidth: number;           // 1-12 px
  borderColor: string;           // hex
  backgroundColor: string;       // hex, default "#FFFFFF"
  caption: string;               // narration text overlay
  captionPosition: "top" | "bottom" | "none";
  captionFont: string;
  captionFontSize: number;
  bleed: boolean;                // extend past gutter
  rotation: number;              // slight tilt for dynamic layouts (-5 to 5 deg)
  fxLayers: string[];            // IDs of FX compositions from /studio to overlay
}

export interface PageTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  panels: Pick<PanelCell, "row" | "col" | "rowSpan" | "colSpan">[];
  thumbnail: string; // SVG string for preview
}

export interface ComicPage {
  id: string;
  name: string;
  pageSize: PageSize;
  customWidth?: number;    // mm
  customHeight?: number;   // mm
  gutterWidth: number;     // px, default 8
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  backgroundColor: string;
  panels: PanelCell[];
  template: string;        // template ID used
}

// Page dimension constants (in mm, for export DPI calc)
export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  "us-comic":  { width: 168.3, height: 260.4, label: "US Comic (6.625×10.25\")" },
  "manga-b5":  { width: 176, height: 250, label: "Manga B5" },
  "euro-a4":   { width: 210, height: 297, label: "European A4" },
  "square":    { width: 200, height: 200, label: "Square" },
  "custom":    { width: 200, height: 300, label: "Custom" },
};
```

### Built-in Templates — create in `src/data/page-templates.ts`
Provide at least these templates:
```
1. "single"      — 1×1 splash page
2. "2-equal"     — 2 rows, 1 col each
3. "3-equal"     — 3 rows, 1 col each
4. "2x2"         — 2×2 grid
5. "3x3"         — 3×3 grid (9 panels)
6. "manga-right" — Manga-style irregular: top wide panel + 2 below + 1 tall side
7. "action"      — Big top panel (2 col span) + 3 small below
8. "widescreen"  — 3 horizontal strips
9. "L-shape"     — L-shaped panel arrangement
10. "diagonal"   — Panels with slight rotation for dynamic feel
```
Each template defines `{ id, name, rows, cols, panels: [{row, col, rowSpan, colSpan}] }`.

### Left Panel — Templates & Assets (`src/components/layout/TemplatePanel.tsx`)
Two tabs:
1. **TEMPLATES tab**: Grid of template thumbnails. Click to apply (replaces current layout, confirms if panels have content).
2. **ASSETS tab**: 
   - **Upload** button (file input for images, accepts PNG/JPG/WebP)
   - **From CoMiXX** button — fetches from `GET /functions/v1/get-effects` and shows thumbnail grid
   - **From Other Modes** — quick links to open `/studio`, `/character`, `/draw` in new tab, or list recent exports
   - Draggable asset thumbnails that can be dropped onto panel cells

### Canvas Area (`src/components/layout/LayoutCanvas.tsx`)
- Use **CSS Grid** container:
  ```css
  display: grid;
  grid-template-rows: repeat(var(--rows), 1fr);
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: var(--gutter);
  ```
- Each `PanelCell` renders as a `<div>` with:
  - `grid-row: row / span rowSpan; grid-column: col / span colSpan;`
  - Inner `<img>` with `object-fit` per `imageFit`, `transform: translate(offsetX, offsetY) scale(zoom/100)`
  - Border rendered via CSS `border` or SVG overlay for jagged/torn styles
  - Caption overlay as absolute-positioned text block
  - Drop zone: `onDragOver` + `onDrop` to accept images
  - Click to select (highlights border, opens properties)
- Aspect ratio maintained via the `PAGE_SIZES` constant
- Canvas should be wrapped in a container that scales to fit viewport while preserving aspect ratio

### Right Panel — Properties (`src/components/layout/PanelProperties.tsx`)
When a panel is selected, show controls for:
- **Image**: Upload/replace, fit mode (cover/contain/fill), zoom slider (50-300), pan X/Y
- **Border**: Style dropdown, width slider (1-12), color picker
- **Caption**: Text input, position (top/bottom/none), font picker, font size
- **Background**: Color picker (for empty panels)
- **Bleed**: Toggle
- **Rotation**: Slider (-5 to 5 degrees)
- **Delete Panel** / **Merge with adjacent** / **Split panel**

### Page Settings (`src/components/layout/PageSettings.tsx`)
Collapsible section at top of right panel or in a modal:
- Page size dropdown (US Comic, Manga B5, Euro A4, Square, Custom)
- Custom dimensions (width/height in mm, only if "custom")
- Gutter width slider (0-20px)
- Margins (top/bottom/left/right, 0-40px)
- Page background color

### Toolbar (`src/components/layout/LayoutToolbar.tsx`)
Top bar with:
- Page name (editable)
- Template quick-switch (icon buttons for common layouts)
- **Add Panel** — adds a new 1×1 cell to next available grid position
- **Export PNG** — uses `html-to-image` (already installed) at 300 DPI
- **Export PDF** — use browser print or a lightweight lib
- **→ EXPORT to CoMiXX** — uses existing `useSyncToCoMiXX` hook with the full page as data URL
- Zoom controls for canvas view (50%, 75%, 100%, 150%)

### Drag-Drop Implementation
- Use native HTML5 drag-drop (no extra dependency needed):
  - Assets in left panel: `draggable=true`, `onDragStart` sets `dataTransfer` with image URL
  - Panel cells: `onDragOver` (preventDefault), `onDrop` reads URL and sets `imageUrl`
  - Panel reorder: drag grip on panel to swap positions
- OR use `@dnd-kit/core` if native HTML5 proves insufficient (would need `npm install @dnd-kit/core @dnd-kit/sortable`)

### State Management
- Use `useState` in the page component (`src/pages/PanelLayoutMode.tsx`)
- State shape: `ComicPage` object
- Template application: replace `panels` array with template's panel definitions + clear images
- Panel operations: add, remove, merge, split, update properties

### Export Logic
- PNG: Use `html-to-image`'s `toPng()` on the canvas container ref (same pattern as FX Studio's `useExport.ts`)
- For 300 DPI: render at 3x scale (CSS `transform: scale(3)` on a hidden clone) then export
- CoMiXX sync: capture data URL → `useSyncToCoMiXX({ name, getDataUrl, type: "comic-page" })`

### File Structure
```
src/
  types/layout-types.ts           — all types above
  data/page-templates.ts          — template definitions
  pages/PanelLayoutMode.tsx       — main page component
  components/layout/
    TemplatePanel.tsx              — left panel (templates + assets)
    LayoutCanvas.tsx               — CSS Grid canvas
    PanelProperties.tsx            — right panel (per-panel controls)
    PageSettings.tsx               — page-level settings
    LayoutToolbar.tsx              — top toolbar
    PanelCell.tsx                  — individual panel cell component
```

### Styling Notes
- Use existing design tokens from `index.css` (bg-background, text-foreground, border-border, etc.)
- Font: `font-pressstart` for labels (same as all other modes)
- Scrollable panels with `max-h-[calc(100vh-...)]` and `overflow-y-auto`
- Panel hover: subtle glow or highlight using `ring-2 ring-primary`
- Selected panel: `ring-2 ring-primary ring-inset` (same pattern as CanvasArea.tsx)

### Integration Points
- **useSyncToCoMiXX**: Already exists at `src/hooks/useSyncToCoMiXX.ts` — reuse for export
- **useExport**: Already exists at `src/hooks/useExport.ts` — reuse for PNG capture
- **ModeNav**: Add `/layout` entry to the MODES array
- **App.tsx**: Add `<Route path="/layout" element={<PanelLayoutMode />} />`

---

## 2. Image Filter Editor (IMPLEMENTED ✅ at `/filters`)

### Current State
Full layered filter pipeline with 27+ filters (including Comic Print and Newsprint), 16 blend modes, per-layer opacity, reorder, and parameter controls. Auto-expanding layer panel for easy adjustment.

### Filter Categories
Comic (Halftone, Cel-Shade, Manga Screen, Pop Art, Vintage Print, Ink Threshold, Duotone, Comic Print, Newsprint), Color (Hue Shift, Brightness/Contrast, Saturation, Invert, Sepia), Blur (Gaussian, Motion, Sharpen), Distort (Chromatic Aberration, Glitch RGB, Pixelate), Artistic (Sketch Lines, Oil Paint, Edge Detect, Emboss, Posterize), Style (Vignette, Grain).

---

## 3. Graffiti / Drawing Mode (IMPLEMENTED ✅ at `/draw`)

### Current State
Full graffiti art studio with 16 drawing tools, background surfaces, text stamping with 3D effects, and export options.

### Tool Categories
- **Spray Cans** (5 types): Standard, Fat Cap (wide heavy coverage), Skinny (tight precise), Flare (fan-shaped), Drip (paint blobs with gravity physics)
- **Drawing Tools** (5 types): Marker (thick/transparent with multiply blend), Pencil (thin/rough with jitter), Brush (smooth quadratic curves), Chalk (textured with random fill rects), Stipple (dot pattern)
- **Utility Tools** (6 types): Splatter, Smudge (pixel displacement), Line (preview overlay), Fill (flood fill with tolerance), Eraser, Stencil

### Spray Physics System
- **Overspray**: Faint halo particles beyond main spray radius (adjustable 0-100%)
- **Drip Physics**: Gravity-driven paint drips with `requestAnimationFrame` animation loop. Drips slow via 0.98 damping, fade over 30-120 frame life.
- **Streaks**: Directional paint streaks that follow spray motion (toggle on/off + 5-100% intensity slider). Renders thin lines along movement angle with random perpendicular offset for realism.
- **Pressure Sensitivity**: Pen tablet support affecting size, density, and opacity

### Background System
- **Photo Upload**: Import any image as background surface with controls for opacity, zoom (30-300%), pan X/Y (±500px), blur (0-10px), grayscale (0-100%), flip H/V, lock position
- **18 Built-in Surface Presets** across 7 categories:
  - Solid: None, Black, White
  - Brick: Red Brick, White Brick, Grey Brick (CSS gradient patterns)
  - Concrete: Standard, Dark, Stained
  - Metal: Brushed, Rust
  - Wood: Fence, Plank
  - School: Subway Tile, Stucco, Chalkboard, Corkboard
  - Urban: Locker, Dumpster

### Graffiti Text Stamper
- **42+ Fonts** across Comic, Graffiti, Hand-drawn, and Classic categories
- **3D Styles**: EXTRUDE (block depth with shadow color), RETRO (dual-color offset), EMBOSS (subtle depth effect)
- Controls: Font size (20-300), rotation (±45°), skew (±30°), extrude depth (1-20), color picker

### Color Palettes
6 palettes × 15 colors: Spider-Verse, Neon, Classic, Pastel, Chrome, Earth

### Export Options
- PNG with black background
- PNG with transparent background
- Sticker export (auto white die-cut border + drop shadow)

---

## 4. Bidirectional CoMiXX Sync

### Current State
- One-way export: FX Studio → CoMiXX via `POST /get-effects`
- All modes can push assets via `useSyncToCoMiXX` hook (see `src/hooks/useSyncToCoMiXX.ts`)
- API base: `https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/get-effects`
- Auth: `apikey` header with anon key from `VITE_SUPABASE_PUBLISHABLE_KEY`

### Proposed: Import FROM CoMiXX
Add a `useImportFromCoMiXX` hook:
```typescript
// Fetch assets from CoMiXX by type
const { data, isLoading } = useImportFromCoMiXX({ 
  type: "panel" | "character" | "background" | "all",
  limit: 20 
});
// Returns: { id, name, preview_data_url, type, created_at }[]
```

### API Requirements (CoMiXX side)
- `GET /functions/v1/get-effects` already supports fetching — need to add:
  - `?type=panel` filter param
  - `?search=batman` text search
  - Pagination: `?offset=0&limit=20`
- Response should include `preview_data_url` as base64 or a storage URL for thumbnails

### Asset Browser Component
A shared `<AssetBrowser />` modal that:
1. Shows a grid of thumbnails from CoMiXX
2. Allows filtering by type (panels, characters, backgrounds, FX)
3. Click to import into current mode
4. Works in Layout Mode, Filter Editor, Studio, and Price Tag Maker

---

## 5. Price Tag Hero Image (IMPLEMENTED ✅)
Users can now import a hero pose image (transparent PNG recommended) that replaces the silhouette in the Classic and Marvel price tag styles.

---

## 6. FX Studio (IMPLEMENTED ✅ at `/studio`)

### Current State
Full animation compositing studio with 30+ procedural SVG effects, keyframe timeline, bullet time modes, and multi-layer compositing.

### Effect Categories
- **Comic**: Comic Titles (28 styles, 3D extrusion), Bubbles (7 styles), SFX Text, Speed Lines (6 styles), Sketch Text, Text Blocks, Price Tags (7 styles), Cracked Glass
- **Game**: Energy Blasts, Impact, Burst, Shockwave, Swoosh, Damage Numbers, Slash, Pixel Bursts, Shield Auras, Power-Ups, Poison Clouds
- **Atmospheric**: Explosions, Blood (4 styles), Smoke, Fire, Dust, Rain, Snow, Fog, Particles
- **Style**: Halftone, Glitch (4 styles), Sketch (9 styles), Emoji, Graffiti (12 tag styles), Stickers

### Text Effects — Unified Font System
All text-capable effects (Comic Titles, SFX Text, Sketch Text, Text Blocks, Graffiti Text, Stickers) share the same 42+ font library with 3D extrusion support (extrudeDepth, extrudeColor, perspective, rotateY).

### Animation System
- Keyframe timeline with 6 easing types (linear, ease-in, ease-out, ease-in-out, bounce, elastic)
- Bullet Time modes: Slow-Mo, Matrix, Ramp Up, Ramp Down, Freeze
- All numeric properties are keyframeable via ControlledSlider pattern

---

## 7. Character Creator (IMPLEMENTED ✅ at `/character`)
SVG-based sketch creator with modular parts (head, body, arms, legs, accessories, expressions), BG FX builder, and export at 1200×1800px.

---

## 8. BG FX Studio (IMPLEMENTED ✅ at `/bgfx`)
Procedural background generator with 24 SVG generators, multi-layer system with 12 blend modes, and 800×600px workspace.

---

## 9. Asset Tagging System & Direct Canvas Sync (NEXT PRIORITY)

### Vision
A standardized tagging system that labels every exported asset with its intended placement in the CoMiXX comic production pipeline. When assets arrive in CoMiXX, they are auto-routed to the correct canvas slot (cover, interior page, back cover, etc.) based on their tag — eliminating manual sorting.

### Asset Tags (include in every sync payload)
Every asset exported via `useSyncToCoMiXX` should include an `asset_tag` field:

```typescript
export type AssetTag =
  | "cover"           // Front cover artwork
  | "back-cover"      // Back cover artwork
  | "interior-page"   // Standard interior comic page
  | "splash-page"     // Full-bleed splash/hero page
  | "price-tag"       // Corner box / price tag overlay
  | "barcode"         // UPC/ISBN barcode block
  | "logo"            // Series/publisher logo
  | "title-block"     // Issue title / masthead
  | "character-art"   // Standalone character asset (from /character)
  | "background"      // Background art (from /bgfx)
  | "fx-overlay"      // Transparent FX layer (from /studio)
  | "speech-bubble"   // Dialog bubble asset
  | "sfx-text"        // Sound effect text overlay
  | "graffiti"        // Graffiti/sticker art (from /draw)
  | "filter-output"   // Post-processed filtered image (from /filters)
  | "panel-strip"     // Horizontal comic strip export
  | "variant-cover"   // Alternate cover artwork
  | "credits-page"    // Credits/colophon page
  | "ad-page"         // Advertisement page placeholder
  | "pin-up"          // Pin-up / bonus art page
  | "chapter-break";  // Chapter divider page
```

### Sync Payload Update
The `useSyncToCoMiXX` hook payload should be extended:
```typescript
const payload = {
  name: options.name,
  asset_tag: options.assetTag || "fx-overlay",  // NEW FIELD
  target_page: options.targetPage || null,       // e.g. page number in CoMiXX
  layers: [],
  canvas_background: "transparent",
  preview_data_url: previewDataUrl,
  total_frames: 1,
  fps: 1,
  type: options.type || "static-asset",
  description: options.name,
  layer_count: 0,
};
```

### Auto-Tagging by Mode
Each mode should auto-assign its default tag:
| Mode | Route | Default Tag |
|------|-------|-------------|
| Layout (Cover template) | /layout | `cover` or `back-cover` |
| Layout (Interior) | /layout | `interior-page` |
| Layout (Splash) | /layout | `splash-page` |
| Character Creator | /character | `character-art` |
| BG FX Studio | /bgfx | `background` |
| FX Studio | /studio | `fx-overlay` |
| Drawing / Graffiti | /draw | `graffiti` |
| Filter Editor | /filters | `filter-output` |
| Price Tag Maker | /pricetag | `price-tag` |

### Direct Canvas Sync (Layout → CoMiXX)
The Layout mode's cover and page exports should sync **directly** to the CoMiXX canvas:
1. Export includes `asset_tag` + `target_page` metadata
2. CoMiXX receives the tagged asset and auto-places it on the correct canvas page
3. Cover → CoMiXX cover slot, Back Cover → back cover slot, Page N → page N
4. This enables a **live round-trip**: edit in PressPlays Layout → push to CoMiXX → pull back for filtering → push updated version

### CoMiXX API Extension Needed
The `POST /get-effects` endpoint (or a new dedicated endpoint) should accept:
- `asset_tag` (string) — routing tag for auto-placement
- `target_page` (number | null) — specific page number for interior pages
- `project_id` (string | null) — CoMiXX project to sync into

The `GET /get-effects` endpoint should support filtering:
- `?asset_tag=cover` — fetch only cover assets
- `?asset_tag=price-tag` — fetch only price tags
- `?project_id=xxx` — fetch assets for a specific CoMiXX project

---

## Priority Order (Remaining)
1. **Asset Tagging System** — extend sync hook + UI tag selectors in all modes
2. **Direct Canvas Sync** — Layout mode ↔ CoMiXX bidirectional page mapping
3. **Bidirectional Sync + Asset Browser** — pull tagged assets FROM CoMiXX back into any mode

## Tech Stack Notes
- All modes are React SPA routes, no SSR needed
- React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Canvas-based filters use `getImageData()` / `putImageData()` for pixel-level processing
- Layout mode should use CSS Grid (not `react-grid-layout` — keep it dependency-free)
- `html-to-image` already installed for PNG export
- Spray paint physics use `requestAnimationFrame` for drip gravity animation
- ControlledSlider pattern (local state + useEffect sync) prevents UI lag during keyframe interpolation
- Design tokens defined in `src/index.css` — use `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc.
- Pixel font class: `font-pressstart` (Press Start 2P) used for all labels app-wide

---

## Layout → CoMiXX Panel Flow (Implementation Guide for Both Sides)

### Overview
PressPlays Layout Mode can now export full comic page spreads directly to CoMiXX as production-ready PNG assets. This section documents how both sides should handle the data flow for maximum automation.

### What PressPlays Sends (POST to `/get-effects`)

```json
{
  "name": "Layout Spread 1",
  "type": "static-asset",
  "asset_tag": "interior-page",
  "target_page": 1,
  "preview_data_url": "<base64 PNG at 2x resolution>",
  "layers": [],
  "canvas_background": "transparent",
  "total_frames": 1,
  "fps": 1,
  "layer_count": 0,
  "description": "Layout Spread 1"
}
```

Key fields for CoMiXX:
- `asset_tag`: Always `"interior-page"` for layout spreads. Could also be `"cover"` or `"back-cover"` if template detection is added later.
- `target_page`: Integer — maps to the CoMiXX project page number. Spread 1 → page 1, Spread 2 → page 3, etc.
- `preview_data_url`: High-res PNG (2x pixel ratio), ready to drop directly onto a canvas or panel.

### What CoMiXX Should Do on Receive

1. **Match by `asset_tag` + `target_page`**:
   - If `asset_tag === "interior-page"` and `target_page` is set → auto-assign to that page in the comic project
   - If `asset_tag === "cover"` → route to cover slot
   - If `asset_tag === "back-cover"` → route to back cover slot

2. **Panel-level placement** (recommended approach):
   - The PNG contains the **full spread** (2 pages side-by-side with gutters/margins baked in)
   - CoMiXX can either:
     - **Option A (Simple)**: Use the full spread PNG as a background layer for 2 pages
     - **Option B (Advanced)**: Slice the spread in half and assign each half to its respective page
   - For single-page exports, the PNG is one page — assign directly

3. **Text Panel Support** (future enhancement):
   - PressPlays Script Mode can export `type: "comic-script"` payloads with structured text (chapters, dialogue, narration)
   - CoMiXX could render these as **text-only panels** — no image, just formatted text
   - This enables the **Novel format**: full prose pages that live alongside comic panels
   - Recommended CoMiXX panel type: `{ type: "text", content: "...", format: "novel" | "screenplay" | "comic" }`

### Script Mode → CoMiXX Text Panel Flow

PressPlays Script Mode now supports 4 formats: **Comic**, **Screenplay**, **Kids Book**, and **Novel**.

For Novel format specifically, the script payload contains:
```json
{
  "script_data": {
    "title": "The Midnight Garden",
    "pages": [
      {
        "page_number": 1,
        "panels": [
          {
            "panel_number": 1,
            "description": "Chapter 1 prose text...",
            "dialogue": [
              { "character": "ELENA", "line": "This can't be real.", "style": "normal" }
            ],
            "narrations": [],
            "sfx": [],
            "suggested_layout": { "size": "splash", "aspect": "landscape" }
          }
        ]
      }
    ],
    "metadata": {
      "total_pages": 3,
      "total_panels": 3,
      "total_dialogue_lines": 5,
      "characters": ["ELENA", "THE GARDEN"]
    }
  },
  "type": "comic-script",
  "asset_tag": "interior-page"
}
```

### Recommended CoMiXX Text Panel Implementation

1. **Detect `type: "comic-script"` with novel content** (long `description` fields, few/no images)
2. **Create text panels** that render prose with proper typography:
   - Chapter headings: large, centered, serif font
   - Body text: readable size (14-16px), justified or left-aligned
   - Character dialogue: indented or styled distinctly
   - Scene breaks (`***`): centered ornamental divider
3. **Allow mixed pages**: a comic page can have both image panels AND text panels
4. **Novel pages**: full-page text panels (single panel, `size: "splash"`)

### Bidirectional Flow Summary

```
PressPlays Layout Mode                    CoMiXX
┌──────────────────────┐                 ┌──────────────────────┐
│ Build spread with    │  ── PNG ───►    │ Auto-place on page N │
│ panels + templates   │  asset_tag +    │ based on asset_tag   │
│                      │  target_page    │ + target_page        │
└──────────────────────┘                 └──────────────────────┘

PressPlays Script Mode                    CoMiXX
┌──────────────────────┐                 ┌──────────────────────┐
│ Write novel/comic    │  ── JSON ───►   │ Create text panels   │
│ script with chapters │  script_data +  │ or import dialogue   │
│ + dialogue + prose   │  type           │ into speech bubbles  │
└──────────────────────┘                 └──────────────────────┘

                    CoMiXX                           PressPlays
                    ┌──────────────────┐             ┌──────────────────┐
                    │ "Edit in FX      │  ── URL ──► │ Round-trip edit   │
                    │  Studio" button  │  ?import=   │ with Return btn   │
                    └──────────────────┘             └──────────────────┘
```

### API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/get-effects` | POST | Save asset (layout PNG or script JSON) |
| `/get-effects` | GET | Fetch assets (filter by `asset_tag`, `project_id`) |
| `/get-effects?asset_tag=interior-page` | GET | Get all layout pages |
| `/get-effects?type=comic-script` | GET | Get all script exports |

### Format Detection for CoMiXX Import Page

When CoMiXX receives a `comic-script` type asset, detect the format from `script_data.metadata`:
- **Novel**: High word count in `description`, few `dialogue` entries relative to text → render as prose pages
- **Screenplay**: Contains `scene-heading` elements → render as formatted screenplay
- **Comic**: Contains `panel` + `dialogue` + `sfx` → standard comic panel flow
- **Kids Book**: Contains `[ART:]` image references → illustration-heavy pages
