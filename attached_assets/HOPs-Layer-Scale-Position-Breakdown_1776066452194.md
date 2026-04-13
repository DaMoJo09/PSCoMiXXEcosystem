# HOPs Builder — Layer, Scale & Position Technical Breakdown

> Reference implementation from PressStart FX Studio (Lovable).
> Use this to replicate exact rendering behavior.

---

## 1. Data Model — `HopLayer`

Every scene has its own array of layers stored in a `sceneLayers` map:

```typescript
sceneLayers: Record<string /* sceneId */, HopLayer[]>
```

Each `HopLayer` has these transform/rendering fields:

```typescript
interface HopLayer {
  id: string;
  name: string;
  type: "media" | "text" | "effect" | "audio" | "caption";
  visible: boolean;
  locked: boolean;

  // ── TRANSFORM ──
  positionX: number;   // px offset from canvas CENTER (0 = centered)
  positionY: number;   // px offset from canvas CENTER (0 = centered)
  scale: number;       // percentage (100 = 1x, 200 = 2x, 50 = 0.5x)
  rotation: number;    // degrees

  // ── STACKING ──
  zIndex: number;      // lower = behind, higher = in front
  opacity: number;     // 0.0 to 1.0

  // ── MEDIA FIT ──
  objectFit: "cover" | "contain" | "fill";  // DEFAULT: "contain" (NO CROP!)

  // ── BLEND ──
  blendMode: "normal" | "multiply" | "screen" | "overlay" | ...;

  // ── SHADOW ──
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;

  // ── CONTENT ──
  dataUrl?: string;    // image/video data URL or blob URL
  text?: string;       // for text/caption layers
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bold?: boolean;
  italic?: boolean;

  // ── PARALLAX ──
  parallaxDepth?: number; // 0-100 (0=background/slow, 100=foreground/fast)

  // ── MOTION BLUR ──
  motionBlur?: number;       // 0-20 px
  motionBlurAngle?: number;  // 0-360 degrees

  // ── BEAT REACT ──
  beatReact?: "none"|"pulse"|"bounce"|"shake"|"glow"|"zoom"|"rotate"|"flash"|"tilt";
  beatIntensity?: number; // 0-100

  // ── TEXT ANIMATION ──
  textAnimation?: "none"|"typewriter"|"fade-in"|"slide-up"|"glitch"|"bounce"|"wave"|"neon-flicker"|"zoom-in"|"spin-in"|"shake"|"rainbow";
}
```

### Default Layer Creation

```typescript
function createDefaultLayer(type, index) {
  return {
    id: `layer-${Date.now()}-${index}`,
    name: `${type} ${index + 1}`,
    type,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: index,
    positionX: 0,     // CENTERED
    positionY: 0,     // CENTERED
    scale: 100,       // 1x — no scaling
    rotation: 0,
    objectFit: "contain",  // ← CRITICAL: never crop
    blendMode: "normal",
    parallaxDepth: Math.min(100, Math.round((index / Math.max(1, index + 1)) * 100)),
  };
}
```

---

## 2. Canvas Coordinate System

The canvas uses a **center-origin** coordinate system:

```
┌─────────────────────────────────────────┐
│                                         │
│              (-200, -300)               │
│                  ↑                      │
│                  │                      │
│  (-400,0) ←── (0,0) ──→ (400,0)       │
│                  │                      │
│                  ↓                      │
│              (200, 300)                │
│                                         │
└─────────────────────────────────────────┘
        Canvas: 800w × 600h
```

- `positionX = 0, positionY = 0` → element is dead center
- Positive X → moves right
- Positive Y → moves down

---

## 3. How Layers Are Rendered on Canvas (THE KEY PART)

### Step 1: The outer positioning shell

Each layer gets an absolutely-positioned wrapper that places it relative to the canvas center:

```tsx
<div style={{
  position: "absolute",
  left: `calc(50% + ${layer.positionX}px)`,   // ← center + offset
  top: `calc(50% + ${layer.positionY}px)`,    // ← center + offset
  transform: "translate(-50%, -50%)",          // ← center the element on that point
  opacity: layer.opacity,
  mixBlendMode: layer.blendMode || "normal",
  filter: dropShadowFilter + motionBlurFilter, // combined CSS filters
  zIndex: layer.zIndex + 1,
  ...beatReactAnimationStyles,                 // if playing + BPM set
}}>
```

### Step 2: FreeTransformWrapper (interactive handles)

Inside the positioning shell, the `FreeTransformWrapper` component wraps the content:

```tsx
<FreeTransformWrapper
  positionX={layer.positionX}
  positionY={layer.positionY}
  scale={layer.scale}
  rotation={layer.rotation}
  selected={selectedLayerId === layer.id && !isPlaying}
  locked={layer.locked}
  zoom={1}
  snapEnabled={!isPlaying}
  canvasWidth={canvasWidth}
  canvasHeight={canvasHeight}
  onSelect={() => selectLayer(layer.id)}
  onTransformChange={(updates) => updateLayer(layer.id, updates)}
>
  {/* layer content goes here */}
</FreeTransformWrapper>
```

The FreeTransformWrapper:
- Renders 8 resize handles (corners + midpoints) + rotation knob when selected
- Handles drag (move), resize (scale), and rotate via pointer events
- Reports delta changes back via `onTransformChange`
- Divides pointer deltas by `zoom` for correct movement at any zoom level
- Snaps to center/edges/thirds within 8px threshold

### Step 3: The inner content transform

Inside the FreeTransformWrapper, the actual content (image/video/text) gets its scale and rotation:

```tsx
<div style={{
  transform: `rotate(${layer.rotation}deg) scale(${layer.scale / 100})`,
}}>
  {/* For images: */}
  <img
    src={layer.dataUrl}
    style={{ objectFit: layer.objectFit || "contain" }}  // NEVER CROP
  />

  {/* For text: */}
  <span style={{
    fontFamily: layer.fontFamily,
    fontSize: `${layer.fontSize}px`,
    color: layer.fontColor,
    WebkitTextStroke: `${layer.strokeWidth}px ${layer.strokeColor}`,
  }}>
    {layer.text}
  </span>
</div>
```

### CRITICAL: The transform chain is:

```
Canvas (800×600)
  └─ Positioning shell: left: calc(50% + Xpx), top: calc(50% + Ypx), translate(-50%,-50%)
       └─ FreeTransformWrapper (handles drag/resize/rotate interaction)
            └─ Content div: transform: rotate(R°) scale(S/100)
                 └─ <img> with objectFit: "contain"  ← NO CROP
```

---

## 4. Layer Sorting

Layers render in `zIndex` order (ascending = back to front):

```tsx
[...layers]
  .sort((a, b) => a.zIndex - b.zIndex)
  .filter(l => l.visible)
  .map(layer => renderLayer(layer))
```

### Reordering Logic

When a user drags layer A above layer B in the layers panel, swap their `zIndex` values:

```typescript
function reorderLayers(fromIdx, toIdx) {
  const updated = [...layers];
  const [moved] = updated.splice(fromIdx, 1);
  updated.splice(toIdx, 0, moved);
  // Reassign zIndex based on new array position
  return updated.map((layer, i) => ({ ...layer, zIndex: i }));
}
```

---

## 5. Background Layer vs Regular Layer

A "background" is just a media layer whose `dataUrl` matches `scene.assetUrl`. When the user clicks "SET BG", the layer is flagged by matching the scene's asset URL.

Background layers get special positioning (fill the whole scene):

```typescript
function getLayerShellStyle(scene, layer) {
  if (isBackgroundLayer(scene, layer)) {
    return {
      position: "absolute",
      inset: 0,           // fills entire canvas
      overflow: "hidden",
    };
  }
  // Regular layers use center-offset positioning
  return {
    position: "absolute",
    left: `calc(50% + ${layer.positionX}px)`,
    top: `calc(50% + ${layer.positionY}px)`,
    transform: "translate(-50%, -50%)",
  };
}
```

For backgrounds, the inner content div uses full width/height with transform:

```tsx
<div style={{
  width: canvasWidth,
  height: canvasHeight,
  transform: `translate(${layer.positionX}px, ${layer.positionY}px) rotate(${layer.rotation}deg) scale(${layer.scale / 100})`,
  transformOrigin: "center center",
}}>
  <img src={layer.dataUrl} style={{ objectFit: "contain" }} className="w-full h-full" />
</div>
```

---

## 6. Snap-to-Grid System

When dragging, layers snap to these positions (relative to center):

```typescript
const halfW = canvasWidth / 2;
const halfH = canvasHeight / 2;

const xSnaps = [0, -halfW, halfW, -halfW/3, halfW/3, -halfW*2/3, halfW*2/3];
const ySnaps = [0, -halfH, halfH, -halfH/3, halfH/3, -halfH*2/3, halfH*2/3];

// Snap threshold: 8px
for (const sx of xSnaps) {
  if (Math.abs(newX - sx) < 8) { newX = sx; showGuide("x", sx); break; }
}
```

Visual guides render as 1px cyan lines:

```tsx
<div style={{
  position: "absolute",
  left: `calc(50% + ${guide.position}px)`,
  top: 0, bottom: 0,
  width: 1,
  background: "hsl(var(--primary) / 0.6)",
}} />
```

---

## 7. Viewport Sizes

```typescript
const VIEWPORT_SIZES = {
  desktop: { w: 800, h: 600, label: "DESKTOP" },
  mobile:  { w: 390, h: 690, label: "MOBILE" },
  square:  { w: 600, h: 600, label: "SQUARE" },
};
```

---

## 8. CSS Shadow & Motion Blur

Applied as CSS `filter` on the positioning shell:

```typescript
// Drop shadow
const shadowFilter = layer.shadowBlur > 0
  ? `drop-shadow(${layer.shadowX}px ${layer.shadowY}px ${layer.shadowBlur}px ${layer.shadowColor})`
  : "";

// Motion blur (uses CSS blur + clip)
const motionBlurFilter = layer.motionBlur > 0
  ? `blur(${layer.motionBlur * 0.3}px)`
  : "";
```

---

## 9. Beat React (Audio-Synced Animation)

When playing with a BPM track, layers with `beatReact` get CSS animations:

```typescript
function getBeatReactStyle(layer, bpm, isPlaying) {
  if (!isPlaying || !bpm || layer.beatReact === "none") return {};
  const duration = `${60 / bpm}s`;
  const intensity = (layer.beatIntensity ?? 50) / 100;
  return {
    "--hop-beat-intensity": `${intensity * 0.3}`,
    "--hop-beat-px": `${Math.round(intensity * 12)}px`,
    "--hop-beat-deg": `${Math.round(intensity * 8)}deg`,
    animation: `hop-beat-${layer.beatReact} ${duration} ease-out infinite`,
  };
}
```

---

## 10. Text Layer Rendering

Text layers use `display: inline-block` and `whitespace: nowrap`:

```tsx
<div className="px-4 py-2 whitespace-nowrap">
  <span
    key={`${layer.id}-${layer.textAnimation}-${scene.id}`}  // key forces animation restart
    style={{
      fontFamily: layer.fontFamily,
      fontSize: `${layer.fontSize}px`,
      color: layer.fontColor,
      fontWeight: layer.bold ? 700 : 400,
      fontStyle: layer.italic ? "italic" : "normal",
      WebkitTextStroke: `${layer.strokeWidth}px ${layer.strokeColor}`,
    }}
    className={getTextAnimClass(layer.textAnimation)}
  >
    {layer.text || "Text"}
  </span>
</div>
```

The `key` prop includes `textAnimation` + `scene.id` to force React to remount and re-trigger CSS animations when switching scenes or toggling play.

---

## 11. Summary: Rendering Pipeline

```
1. Get scene layers:     sceneLayers[scene.id]
2. Filter visible:       .filter(l => l.visible)
3. Sort by zIndex:       .sort((a, b) => a.zIndex - b.zIndex)
4. For each layer:
   a. Position shell:    absolute, calc(50% + X), calc(50% + Y), translate(-50%,-50%)
   b. Apply opacity:     layer.opacity
   c. Apply blend:       mixBlendMode: layer.blendMode
   d. Apply filters:     drop-shadow + motion-blur
   e. Apply beat react:  CSS animation if playing + BPM
   f. Wrap in FreeTransformWrapper (handles when selected, noop when playing)
   g. Inner content:     rotate(R) scale(S/100)
   h. Media:             <img> objectFit="contain" (NEVER CROP)
   i. Text:              styled <span> with animation class
```

This is the exact rendering pipeline. Replicate this and layers will position, scale, and stack identically.
