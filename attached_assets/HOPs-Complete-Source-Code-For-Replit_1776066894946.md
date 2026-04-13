# HOPs Builder — Complete 1:1 Source Code for Replit

This document contains the **exact production code** from FX Studio's HOP Builder.
Copy each file into the corresponding path to achieve full feature parity.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Source Files](#source-files)
4. [CSS Animations](#css-animations)
5. [Dependencies](#dependencies)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    HopBuilder.tsx (3687 lines)            │
│  ┌─────────┐  ┌──────────────────────┐  ┌─────────────┐ │
│  │ Left     │  │ Canvas Area          │  │ Right Panel │ │
│  │ Panel    │  │                      │  │ (contextual)│ │
│  │ ─────── │  │ FreeTransformWrapper │  │ ──────────  │ │
│  │ SCENES  │  │ per layer            │  │ SCENE props │ │
│  │ AUDIO   │  │                      │  │ TEXT props  │ │
│  │ ASSETS  │  │ Ken Burns camera     │  │ MEDIA props │ │
│  │         │  │ Snap guides          │  │ EFFECT props│ │
│  │         │  │ Beat-reactive pulse  │  │ Beat React  │ │
│  │         │  │ Parallax layers      │  │ Parallax    │ │
│  │         │  │                      │  │ Motion Blur │ │
│  └─────────┘  └──────────────────────┘  └─────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ HopTimeline.tsx — AE-style multi-track timeline     │ │
│  │ Scene blocks | Layer keyframes | Audio clips        │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Coordinate System
- **Center-origin**: (0,0) = dead center of canvas
- **Positioning shell**: `left: calc(50% + Xpx)`, `top: calc(50% + Ypx)`, `transform: translate(-50%, -50%)`
- **Content transform (inner div)**: `rotate(Rdeg) scale(S/100)` where scale 100 = 1x
- **Background layers**: Use `inset: 0` (fill canvas) instead of center-origin positioning
- **objectFit**: Default `"contain"` — NEVER crop imported content

### Display Modes
1. **Standard** — scene-by-scene with transitions, Ken Burns camera
2. **Moving HOP** — panoramic horizontal scroll (Roku screensaver style)
   - Sub-modes: "standard" (scene-cycling) and "screensaver" (smooth continuous pan)
   - Parallax depth per layer (0=background/slow, 100=foreground/fast)

### Key Patterns
- Layers are stored per-scene: `sceneLayers[sceneId] → HopLayer[]`
- Backgrounds are regular media layers (not CSS backgrounds) — fully transformable
- `isSceneBackgroundLayer()` checks if a media layer IS the scene's assetUrl
- Text animation re-triggering via React `key` prop: `key={layerId-animation-sceneId-animKey}`
- Font preloading: `ensureFontLoaded(fontName)` called before rendering text
- Gapless audio via Web Audio API (`AudioBufferSourceNode.loop = true`)

---

## File Structure

```
src/
├── types/
│   └── hop-types.ts              # Core data models (HopProject, HopScene, etc.)
├── components/
│   ├── hop/
│   │   ├── HopLayersPanel.tsx     # Layer type definitions (HopLayer, HopBlendMode, etc.)
│   │   ├── HopTimeline.tsx        # AE-style multi-track timeline with keyframes
│   │   ├── HopAssetBrowser.tsx    # Asset library browser + bulk import
│   │   ├── HopEffectPicker.tsx    # Vibe presets + vintage overlays + library effects
│   │   ├── HopExportPanel.tsx     # Export size presets (TikTok, IG, YT, etc.)
│   │   └── HopProjectsDrawer.tsx  # Cloud project save/load drawer
│   └── shared/
│       └── FreeTransformWrapper.tsx # Drag/resize/rotate handles for canvas elements
├── data/
│   └── hop-scene-templates.ts     # Scene templates + social copy generator
└── pages/
    └── HopBuilder.tsx             # Main page component (3687 lines)
```

---

## Source Files


### `src/types/hop-types.ts`

```ts
export type HopProjectType = "single" | "series";
export type HopClipLength = "30s" | "90s" | "custom";
export type HopLoopMode = "single_loop" | "full_series_loop" | "manual_advance";
export type HopVisibility = "private" | "unlisted" | "public";
export type HopSyncStatus = "draft" | "queued" | "published" | "failed";
export type HopSceneAssetType = "image" | "gif" | "video" | "text_card" | "motion_scene";
export type HopTransition = "cut" | "fade" | "zoom" | "glitch" | "wipe-left" | "wipe-right" | "wipe-up" | "wipe-down" | "iris" | "slide-left" | "slide-right" | "blur-through";

export interface HopCameraKeyframe {
  x: number;       // viewport offset X (-100 to 100, percentage)
  y: number;       // viewport offset Y (-100 to 100, percentage)
  zoom: number;    // zoom factor (1 = 100%, 1.5 = 150%)
}

export interface HopScene {
  id: string;
  order: number;
  assetType: HopSceneAssetType;
  assetUrl?: string;
  textOverlay?: string;
  caption?: string;
  duration: number; // seconds
  transition: HopTransition;
  loopInScene: boolean;
  effects: string[];
  // Camera pan/zoom (Ken Burns)
  cameraStart?: HopCameraKeyframe;
  cameraEnd?: HopCameraKeyframe;
  cameraEasing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  // Scene metadata (Section 3.1)
  mood?: string;
  cameraAngle?: string;
  lighting?: string;
  location?: string;
  lyricsSegment?: string;
  characters?: string;
  soundPack?: string;
}

export interface HopPreviewSettings {
  autoplay: boolean;
  mutedByDefault: boolean;
  showCaptions: boolean;
}

export interface HopProject {
  id: string;
  title: string;
  description: string;
  type: HopProjectType;
  coverImage: string | null;
  audioTrack: string | null;
  audioBpm: number | null;
  tags: string[];
  visibility: HopVisibility;
  loopMode: HopLoopMode;
  clipLengthMode: HopClipLength;
  totalDuration: number;
  scenes: HopScene[];
  syncStatus: HopSyncStatus;
  previewSettings: HopPreviewSettings;
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export function createDefaultHopScene(order: number): HopScene {
  return {
    id: `scene-${Date.now()}-${order}`,
    order,
    assetType: "image",
    assetUrl: undefined,
    textOverlay: "",
    caption: "",
    duration: 5,
    transition: "cut",
    loopInScene: false,
    effects: [],
  };
}

export function createDefaultHopProject(): HopProject {
  return {
    id: `hop-${Date.now()}`,
    title: "Untitled HOP",
    description: "",
    type: "single",
    coverImage: null,
    audioTrack: null,
    audioBpm: null,
    tags: [],
    visibility: "private",
    loopMode: "single_loop",
    clipLengthMode: "30s",
    totalDuration: 30,
    scenes: [createDefaultHopScene(0)],
    syncStatus: "draft",
    previewSettings: { autoplay: true, mutedByDefault: false, showCaptions: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

```

---

### `src/components/hop/HopLayersPanel.tsx`

```tsx
import { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, GripVertical, Trash2, Plus, ChevronUp, ChevronDown, Image as ImageIcon, Type, Music, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type HopBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";

export type HopBeatReactType = "none" | "pulse" | "bounce" | "shake" | "glow" | "zoom" | "rotate" | "flash" | "tilt";

export interface HopLayer {
  id: string;
  name: string;
  type: "media" | "text" | "effect" | "audio" | "caption";
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  dataUrl?: string;
  text?: string;
  effectId?: string;
  // Free transform
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  // Media fit
  objectFit: "cover" | "contain" | "fill";
  // Blend mode
  blendMode: HopBlendMode;
  // Text styling
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bold?: boolean;
  italic?: boolean;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  // Beat react
  beatReact?: HopBeatReactType;
  beatIntensity?: number; // 0-100
  // Text animation
  textAnimation?: "none" | "typewriter" | "fade-in" | "slide-up" | "glitch" | "bounce" | "wave" | "neon-flicker" | "zoom-in" | "spin-in" | "shake" | "rainbow";
  // Motion blur
  motionBlur?: number;       // 0-20 px
  motionBlurAngle?: number;  // 0-360 degrees
  // Parallax depth for screensaver mode (0 = background/slowest, 100 = foreground/fastest)
  parallaxDepth?: number;
}

interface HopLayersPanelProps {
  layers: HopLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayers: (fromIdx: number, toIdx: number) => void;
  onAddLayer: (type: HopLayer["type"]) => void;
  onUpdateLayer: (id: string, updates: Partial<HopLayer>) => void;
}

const LAYER_ICONS: Record<HopLayer["type"], React.ReactNode> = {
  media: <ImageIcon className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
  effect: <Sparkles className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
  caption: <Type className="w-3.5 h-3.5" />,
};

const HopLayersPanel = ({
  layers, selectedLayerId, onSelectLayer, onToggleVisibility,
  onToggleLock, onDeleteLayer, onReorderLayers, onAddLayer, onUpdateLayer,
}: HopLayersPanelProps) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-pressstart text-[11px] text-foreground">LAYERS</span>
        <div className="flex gap-0.5">
          {(["media", "text", "effect"] as const).map(t => (
            <button
              key={t}
              onClick={() => onAddLayer(t)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title={`Add ${t} layer`}
            >
              {LAYER_ICONS[t]}
            </button>
          ))}
          <button
            onClick={() => onAddLayer("media")}
            className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
            title="Add layer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <p className="font-pressstart text-[10px] text-muted-foreground p-3 text-center">
            No layers — add media, text, or effects
          </p>
        ) : (
          layers.map((layer, index) => (
            <div
              key={layer.id}
              draggable
              onDragStart={() => setDragIdx(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== index) onReorderLayers(dragIdx, index);
                setDragIdx(null);
              }}
              onClick={() => onSelectLayer(layer.id)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 border-b border-border cursor-pointer transition-colors",
                selectedLayerId === layer.id ? "bg-primary/10" : "hover:bg-secondary/50"
              )}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab shrink-0" />
              <span className="text-muted-foreground shrink-0">{LAYER_ICONS[layer.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-pressstart text-[10px] text-foreground truncate">{layer.name}</p>
                <p className="font-pressstart text-[8px] text-muted-foreground">{layer.type} • {Math.round(layer.opacity * 100)}%</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className="p-0.5 hover:bg-muted rounded-sm">
                  {layer.visible ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground/40" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className="p-0.5 hover:bg-muted rounded-sm">
                  {layer.locked ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground/40" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                  className="p-0.5 hover:bg-destructive/20 rounded-sm">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected layer properties */}
      {selectedLayerId && (() => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return null;
        return (
          <div className="border-t border-border p-2 space-y-2 shrink-0">
            <span className="font-pressstart text-[10px] text-primary block">LAYER PROPS</span>
            <div>
              <span className="font-pressstart text-[8px] text-muted-foreground block mb-0.5">NAME</span>
              <input
                value={layer.name}
                onChange={e => onUpdateLayer(layer.id, { name: e.target.value })}
                className="w-full bg-secondary text-foreground font-pressstart text-[10px] px-2 py-1 rounded border border-border"
              />
            </div>
            <div>
              <span className="font-pressstart text-[8px] text-muted-foreground block mb-0.5">OPACITY: {Math.round(layer.opacity * 100)}%</span>
              <input
                type="range" min={0} max={1} step={0.01}
                value={layer.opacity}
                onChange={e => onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 accent-primary"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HopLayersPanel;

```

---

### `src/components/hop/HopTimeline.tsx`

```tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Diamond, Repeat, Trash2, ChevronRight, ChevronDown, ZoomIn, ZoomOut, Magnet, Plus, Volume2, VolumeX, Music, Upload, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HopScene, HopTransition } from "@/types/hop-types";
import { HopLayer } from "@/components/hop/HopLayersPanel";
import { Slider } from "@/components/ui/slider";
import Tip from "@/components/ui/tip";

/* ─── Keyframe types ─── */
export type HopEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic";

export interface HopKeyframe {
  id: string;
  time: number; // seconds from scene start
  property: string;
  value: number;
  easing: HopEasing;
}

export interface HopLayerKeyframes {
  [layerId: string]: HopKeyframe[];
}

/* ─── Audio clip types ─── */
export interface HopAudioClip {
  id: string;
  name: string;
  dataUrl: string;
  startTime: number; // offset in timeline (seconds)
  duration: number; // actual audio duration
  trimStart: number;
  trimEnd: number;
  volume: number;
  muted: boolean;
  color: string;
}

const AUDIO_COLORS = [
  "hsl(280, 60%, 55%)", "hsl(200, 70%, 50%)", "hsl(140, 60%, 45%)",
  "hsl(30, 80%, 55%)", "hsl(350, 70%, 55%)", "hsl(50, 80%, 50%)",
];

const ANIMATABLE_PROPS = [
  { key: "positionX", label: "X", min: -500, max: 500 },
  { key: "positionY", label: "Y", min: -500, max: 500 },
  { key: "scale", label: "SCALE", min: 10, max: 500 },
  { key: "rotation", label: "ROT", min: -360, max: 360 },
  { key: "opacity", label: "OPACITY", min: 0, max: 1 },
] as const;

const EASING_OPTIONS: { value: HopEasing; label: string }[] = [
  { value: "linear", label: "LINEAR" },
  { value: "ease-in", label: "EASE IN" },
  { value: "ease-out", label: "EASE OUT" },
  { value: "ease-in-out", label: "EASE I/O" },
  { value: "bounce", label: "BOUNCE" },
  { value: "elastic", label: "ELASTIC" },
];

interface HopTimelineProps {
  scenes: HopScene[];
  currentSceneIdx: number;
  previewSceneIdx: number;
  isPlaying: boolean;
  loopCount: number;
  totalDuration: number;
  sceneLayers: Record<string, HopLayer[]>;
  selectedLayerId: string | null;
  keyframes: HopLayerKeyframes;
  currentTime: number; // seconds within current scene
  audioTrack: string | null;
  audioWaveform: number[];
  isMuted: boolean;
  audioClips?: HopAudioClip[];
  onAudioClipsChange?: (clips: HopAudioClip[]) => void;
  onTogglePlay: () => void;
  onSelectScene: (idx: number) => void;
  onAddScene: () => void;
  onReorderScenes: (from: number, to: number) => void;
  onSelectLayer: (id: string | null) => void;
  onAddKeyframe: (layerId: string, property: string, time: number, value: number) => void;
  onDeleteKeyframe: (keyframeId: string) => void;
  onSetEasing: (keyframeId: string, easing: HopEasing) => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onAudioUpload: () => void;
}

const HopTimeline: React.FC<HopTimelineProps> = ({
  scenes, currentSceneIdx, previewSceneIdx, isPlaying, loopCount,
  totalDuration, sceneLayers, selectedLayerId, keyframes, currentTime,
  audioTrack, audioWaveform, isMuted, audioClips, onAudioClipsChange,
  onTogglePlay, onSelectScene, onAddScene, onReorderScenes,
  onSelectLayer, onAddKeyframe, onDeleteKeyframe, onSetEasing,
  onSeek, onToggleMute, onAudioUpload,
}) => {
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null);
  const [dragSceneIdx, setDragSceneIdx] = useState<number | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);

  const activeSceneIdx = isPlaying ? previewSceneIdx : currentSceneIdx;
  const activeScene = scenes[activeSceneIdx];
  const sceneDuration = activeScene?.duration || 5;
  const activeLayers = activeScene ? (sceneLayers[activeScene.id] || []) : [];

  const toggleExpandLayer = (id: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute scene start times
  const sceneStarts = scenes.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + scenes[i - 1].duration);
    return acc;
  }, []);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * totalDuration / zoom;
    onSeek(Math.max(0, Math.min(totalDuration, time)));
  }, [totalDuration, zoom, onSeek]);

  // Global playhead position
  const globalTime = sceneStarts[activeSceneIdx] + currentTime;
  const playheadPct = totalDuration > 0 ? (globalTime / totalDuration) * 100 : 0;

  // Snap time to grid
  const snapTime = useCallback((t: number) => {
    if (!snapEnabled) return t;
    const grid = 0.25; // quarter second grid
    return Math.round(t / grid) * grid;
  }, [snapEnabled]);

  return (
    <div className="shrink-0 border-t-2 border-primary/20 bg-card/95 backdrop-blur-sm flex flex-col select-none transition-all duration-200" style={{ height: 220 }}>
      {/* ─── Transport bar ─── */}
      <div className="flex items-center gap-0.5 px-2 py-0.5 border-b border-border/30 bg-secondary/30 min-h-[30px] shrink-0">
        <Tip label="Go to start">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSeek(0)}>
            <SkipBack className="w-3 h-3" />
          </Button>
        </Tip>
        <Tip label={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          <Button
            variant={isPlaying ? "default" : "ghost"}
            size="icon"
            className={`h-6 w-6 ${isPlaying ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.4)]" : ""}`}
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
        </Tip>
        <Tip label="Go to end">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSeek(totalDuration)}>
            <SkipForward className="w-3 h-3" />
          </Button>
        </Tip>

        <div className="h-3.5 w-px bg-border/30 mx-0.5" />

        {/* Time display */}
        <div className="bg-background/60 rounded px-1.5 py-0.5 flex items-center gap-1 border border-border/20">
          <span className="font-pressstart text-[9px] text-primary font-mono tabular-nums">
            {globalTime.toFixed(1)}s
          </span>
          <span className="font-pressstart text-[7px] text-muted-foreground/40">/</span>
          <span className="font-pressstart text-[8px] text-muted-foreground/60 font-mono tabular-nums">
            {totalDuration.toFixed(1)}s
          </span>
        </div>

        <div className="h-3.5 w-px bg-border/30 mx-0.5" />

        {/* Loop counter */}
        {isPlaying && (
          <div className="flex items-center gap-1">
            <Repeat className="w-3 h-3 text-primary" />
            <span className="font-pressstart text-[8px] text-primary">{loopCount}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Snap toggle */}
        <Tip label={snapEnabled ? "Snap ON" : "Snap OFF"}>
          <Button variant="ghost" size="icon" className={`h-5 w-5 ${snapEnabled ? "text-primary" : "text-muted-foreground/40"}`}
            onClick={() => setSnapEnabled(!snapEnabled)}>
            <Magnet className="w-3 h-3" />
          </Button>
        </Tip>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <Tip label="Zoom out timeline">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="w-3 h-3" />
            </Button>
          </Tip>
          <span className="font-pressstart text-[7px] text-muted-foreground/50 w-6 text-center">{Math.round(zoom * 100)}%</span>
          <Tip label="Zoom in timeline">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
              <ZoomIn className="w-3 h-3" />
            </Button>
          </Tip>
        </div>

        {/* Keyframe controls for selected */}
        {selectedLayerId && activeScene && (
          <>
            <div className="h-3.5 w-px bg-border/30 mx-0.5" />
            <Tip label="Add keyframe at current time (K)">
              <Button variant="outline" size="sm" className="h-5 px-1.5 font-pressstart text-[8px] gap-0.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  const layer = activeLayers.find(l => l.id === selectedLayerId);
                  if (!layer) return;
                  ANIMATABLE_PROPS.forEach(p => {
                    const val = p.key === "opacity" ? layer.opacity : (layer as any)[p.key] ?? 0;
                    onAddKeyframe(selectedLayerId, p.key, snapTime(currentTime), val);
                  });
                }}>
                <Diamond className="w-2.5 h-2.5 fill-primary" /> +KEY
              </Button>
            </Tip>
          </>
        )}

        {/* Selected keyframe easing */}
        {selectedKfId && (() => {
          const allKfs = Object.values(keyframes).flat();
          const kf = allKfs.find(k => k.id === selectedKfId);
          if (!kf) return null;
          return (
            <>
              <select value={kf.easing} onChange={e => onSetEasing(selectedKfId, e.target.value as HopEasing)}
                className="h-5 px-1 font-pressstart text-[8px] bg-background/50 border border-border/30 rounded text-foreground">
                {EASING_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <Tip label="Delete keyframe">
                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/70 hover:text-destructive"
                  onClick={() => { onDeleteKeyframe(selectedKfId); setSelectedKfId(null); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Tip>
            </>
          );
        })()}
      </div>

      {/* ─── Timeline body ─── */}
      <div className="flex flex-1 overflow-hidden min-h-0" ref={timelineBodyRef}>
        {/* Track labels */}
        <div className="w-24 shrink-0 border-r border-border/30 overflow-y-auto bg-secondary/10">
          {/* Scene track label */}
          <div className="h-12 flex items-center px-2 border-b border-border/20 font-pressstart text-[7px] text-muted-foreground gap-1">
            <span className="text-accent">▶</span> SCENES
          </div>

          {/* Layer tracks */}
          {activeLayers.map(layer => (
            <React.Fragment key={layer.id}>
              <button
                onClick={() => { onSelectLayer(layer.id); toggleExpandLayer(layer.id); }}
                className={cn(
                  "w-full h-6 flex items-center px-2 gap-1 text-left border-b border-border/10 transition-all font-pressstart text-[7px]",
                  selectedLayerId === layer.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                {expandedLayers.has(layer.id) ? <ChevronDown className="w-2.5 h-2.5 shrink-0" /> : <ChevronRight className="w-2.5 h-2.5 shrink-0" />}
                <span className="truncate">{layer.name}</span>
              </button>
              {expandedLayers.has(layer.id) && ANIMATABLE_PROPS.map(p => (
                <div key={p.key} className="h-4 flex items-center pl-5 pr-2 border-b border-border/5 font-pressstart text-[6px] text-muted-foreground/50">
                  {p.label}
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Audio track labels — multi-clip */}
          {audioClips && audioClips.length > 0 ? (
            audioClips.map((clip) => (
              <div key={clip.id} className={cn(
                "h-7 flex items-center px-2 gap-1 border-b border-border/10 font-pressstart text-[7px] transition-colors",
                clip.muted ? "text-muted-foreground/30" : "text-muted-foreground"
              )}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clip.color }} />
                <span className="truncate flex-1">{clip.name}</span>
                <button onClick={() => {
                  if (!onAudioClipsChange) return;
                  onAudioClipsChange(audioClips.map(c => c.id === clip.id ? { ...c, muted: !c.muted } : c));
                }} className="shrink-0">
                  {clip.muted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                </button>
                <button onClick={() => {
                  if (!onAudioClipsChange) return;
                  onAudioClipsChange(audioClips.filter(c => c.id !== clip.id));
                }} className="shrink-0 text-destructive/60 hover:text-destructive">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          ) : null}
          {/* Add audio track button */}
          <div className={cn(
            "h-7 flex items-center px-2 gap-1 cursor-pointer transition-colors font-pressstart text-[7px]",
            audioTrack || (audioClips && audioClips.length > 0)
              ? "text-primary hover:bg-primary/5"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )} onClick={() => {
            // Upload new audio clip
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file || !onAudioClipsChange) return;
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                const newClip: HopAudioClip = {
                  id: `aclip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  name: file.name.replace(/\.[^.]+$/, "").slice(0, 20),
                  dataUrl,
                  startTime: 0,
                  duration: 10, // will be updated when decoded
                  trimStart: 0,
                  trimEnd: 0,
                  volume: 80,
                  muted: false,
                  color: AUDIO_COLORS[(audioClips?.length || 0) % AUDIO_COLORS.length],
                };
                onAudioClipsChange([...(audioClips || []), newClip]);
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }}>
            <Plus className="w-3 h-3" />
            <span>ADD AUDIO</span>
          </div>
        </div>

        {/* Ruler + tracks area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto relative">
          {/* Time ruler */}
          <div ref={rulerRef} className="h-5 border-b border-border/50 relative cursor-pointer sticky top-0 bg-card/90 z-20"
            onClick={handleRulerClick}>
            {(() => {
              const totalW = totalDuration * zoom;
              const interval = zoom >= 2 ? 0.5 : zoom >= 1 ? 1 : 2;
              const marks: number[] = [];
              for (let t = 0; t <= totalDuration; t += interval) marks.push(t);
              return marks.map(t => (
                <span key={t} className="absolute top-0 font-pressstart text-[6px] text-muted-foreground/60 whitespace-nowrap"
                  style={{ left: `${(t / totalDuration) * 100}%`, transform: "translateX(-50%)" }}>
                  {t % 1 === 0 ? `${t}s` : `${t.toFixed(1)}`}
                </span>
              ));
            })()}
            {/* Playhead on ruler */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30"
              style={{ left: `${playheadPct}%` }}>
              <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 bg-destructive rounded-sm" />
            </div>
          </div>

          {/* Scene track — proportional blocks */}
          <div className="h-12 flex items-center border-b border-border/20 relative" style={{ minWidth: `${zoom * 100}%` }}>
            {scenes.map((scene, i) => {
              const widthPct = totalDuration > 0 ? (scene.duration / totalDuration) * 100 : 0;
              const isActive = activeSceneIdx === i;
              return (
                <button key={scene.id}
                  draggable
                  onDragStart={() => setDragSceneIdx(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (dragSceneIdx !== null && dragSceneIdx !== i) onReorderScenes(dragSceneIdx, i); setDragSceneIdx(null); }}
                  onClick={() => onSelectScene(i)}
                  className={cn(
                    "h-10 rounded-sm overflow-hidden transition-all relative group shrink-0",
                    isActive ? "ring-2 ring-primary ring-inset shadow-[0_0_8px_hsl(var(--primary)/0.3)]" : "ring-1 ring-border/50 hover:ring-primary/30"
                  )}
                  style={{ width: `${widthPct}%`, minWidth: 24 }}>
                  {scene.assetUrl ? (
                    <img src={scene.assetUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", scene.assetType === "text_card" ? "bg-secondary" : "bg-card")}>
                      <span className="font-pressstart text-[5px] text-muted-foreground/40">{i + 1}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-0.5 pointer-events-none">
                    <span className="font-pressstart text-[5px] text-white/70">{scene.duration}s</span>
                  </div>
                  {scene.transition !== "cut" && i > 0 && (
                    <div className="absolute top-0.5 left-0.5 bg-accent/80 rounded px-0.5 pointer-events-none">
                      <span className="font-pressstart text-[4px] text-white">{scene.transition}</span>
                    </div>
                  )}
                </button>
              );
            })}
            {/* Add scene button */}
            <button onClick={onAddScene}
              className="h-10 w-6 rounded-sm border border-dashed border-border/50 hover:border-primary/30 flex items-center justify-center shrink-0 transition-colors ml-0.5">
              <span className="font-pressstart text-[8px] text-muted-foreground">+</span>
            </button>
          </div>

          {/* Layer keyframe rows */}
          {activeLayers.map(layer => {
            const layerKfs = keyframes[layer.id] || [];
            return (
              <React.Fragment key={layer.id}>
                {/* Main row — shows all keyframes as diamonds */}
                <div className="h-6 relative border-b border-border/10" style={{ minWidth: `${zoom * 100}%` }}>
                  {layerKfs.map(kf => {
                    const globalKfTime = sceneStarts[activeSceneIdx] + kf.time;
                    const pct = totalDuration > 0 ? (globalKfTime / totalDuration) * 100 : 0;
                    return (
                      <button key={kf.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedKfId(kf.id); onSeek(globalKfTime); }}
                        className={cn(
                          "absolute top-1 transition-all",
                          selectedKfId === kf.id ? "text-primary scale-125" : "text-accent hover:text-primary"
                        )}
                        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
                        <Diamond className="w-3 h-3 fill-current" />
                      </button>
                    );
                  })}
                </div>

                {/* Expanded sub-property rows */}
                {expandedLayers.has(layer.id) && ANIMATABLE_PROPS.map(prop => {
                  const propKfs = layerKfs.filter(kf => kf.property === prop.key);
                  return (
                    <div key={prop.key} className="h-4 relative border-b border-border/5" style={{ minWidth: `${zoom * 100}%` }}
                      onDoubleClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const time = (x / rect.width) * totalDuration / zoom;
                        const val = prop.key === "opacity" ? layer.opacity : (layer as any)[prop.key] ?? 0;
                        onAddKeyframe(layer.id, prop.key, snapTime(time - sceneStarts[activeSceneIdx]), val);
                      }}>
                      {/* Draw lines between keyframes */}
                      {propKfs.length >= 2 && propKfs.slice(0, -1).map((kf, ki) => {
                        const next = propKfs[ki + 1];
                        const startPct = totalDuration > 0 ? ((sceneStarts[activeSceneIdx] + kf.time) / totalDuration) * 100 : 0;
                        const endPct = totalDuration > 0 ? ((sceneStarts[activeSceneIdx] + next.time) / totalDuration) * 100 : 0;
                        return (
                          <div key={`line-${kf.id}`} className="absolute top-1/2 h-px bg-accent/40"
                            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
                        );
                      })}
                      {propKfs.map(kf => {
                        const globalKfTime = sceneStarts[activeSceneIdx] + kf.time;
                        const pct = totalDuration > 0 ? (globalKfTime / totalDuration) * 100 : 0;
                        return (
                          <button key={kf.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedKfId(kf.id); }}
                            className={cn(
                              "absolute top-0.5 w-2 h-2 rounded-full transition-all",
                              selectedKfId === kf.id ? "bg-primary scale-125 ring-1 ring-primary" : "bg-accent/60 hover:bg-primary"
                            )}
                            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                            title={`${prop.label}: ${kf.value.toFixed(2)} @ ${kf.time.toFixed(2)}s`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Audio clip blocks — block-based arrangement like Graffiti mode */}
          {audioClips && audioClips.length > 0 ? (
            audioClips.map((clip) => {
              const clipStart = totalDuration > 0 ? (clip.startTime / totalDuration) * 100 : 0;
              const clipDur = clip.duration - clip.trimStart - clip.trimEnd;
              const clipWidth = totalDuration > 0 ? (clipDur / totalDuration) * 100 : 0;
              return (
                <div key={clip.id} className="h-7 relative border-b border-border/10" style={{ minWidth: `${zoom * 100}%` }}>
                  <div
                    className={cn(
                      "absolute top-0.5 bottom-0.5 rounded-sm cursor-grab active:cursor-grabbing transition-opacity",
                      clip.muted ? "opacity-30" : "opacity-100"
                    )}
                    style={{
                      left: `${clipStart}%`,
                      width: `${Math.max(1, clipWidth)}%`,
                      backgroundColor: clip.color + "44",
                      borderLeft: `2px solid ${clip.color}`,
                      borderRight: `2px solid ${clip.color}`,
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("clipId", clip.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!onAudioClipsChange) return;
                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const newStart = (x / rect.width) * totalDuration;
                      onAudioClipsChange(audioClips.map(c =>
                        c.id === clip.id ? { ...c, startTime: Math.max(0, newStart) } : c
                      ));
                    }}
                  >
                    {/* Mini waveform bars inside the block */}
                    <div className="flex items-end gap-[1px] h-full px-0.5">
                      {Array.from({ length: Math.max(4, Math.min(40, Math.round(clipWidth))) }, (_, i) => (
                        <div key={i} className="flex-1 rounded-t-sm" style={{
                          height: `${20 + Math.random() * 60}%`,
                          backgroundColor: clip.color + "88",
                        }} />
                      ))}
                    </div>
                    <div className="absolute top-0 left-1 pointer-events-none">
                      <span className="font-pressstart text-[5px]" style={{ color: clip.color }}>{clip.name}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Legacy single audio track display */
            <div className="h-7 relative" style={{ minWidth: `${zoom * 100}%` }}>
              {audioTrack && audioWaveform.length > 0 ? (
                <div className="flex items-end gap-[1px] h-full w-full bg-primary/5 rounded px-0.5">
                  {audioWaveform.map((v, i) => (
                    <div key={i} className="flex-1 bg-primary/30 rounded-t-sm" style={{ height: `${Math.max(2, v * 24)}px` }} />
                  ))}
                </div>
              ) : audioTrack ? (
                <div className="flex-1 h-full bg-primary/5 rounded flex items-center justify-center">
                  <span className="font-pressstart text-[6px] text-primary/50">♫ Audio loaded</span>
                </div>
              ) : null}
            </div>
          )}
          {/* Add audio button track */}
          <div className="h-7 relative" style={{ minWidth: `${zoom * 100}%` }}>
            <button onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "audio/*";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file || !onAudioClipsChange) { onAudioUpload(); return; }
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  const newClip: HopAudioClip = {
                    id: `aclip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                    name: file.name.replace(/\.[^.]+$/, "").slice(0, 20),
                    dataUrl,
                    startTime: 0,
                    duration: 10,
                    trimStart: 0,
                    trimEnd: 0,
                    volume: 80,
                    muted: false,
                    color: AUDIO_COLORS[(audioClips?.length || 0) % AUDIO_COLORS.length],
                  };
                  onAudioClipsChange([...(audioClips || []), newClip]);
                };
                reader.readAsDataURL(file);
              };
              input.click();
            }}
              className="w-full h-full rounded border border-dashed border-border/30 hover:border-primary/30 flex items-center justify-center gap-1 transition-colors">
              <Plus className="w-3 h-3 text-muted-foreground/30" />
              <span className="font-pressstart text-[6px] text-muted-foreground/30">DROP AUDIO CLIP</span>
            </button>
          </div>

          {/* Global playhead line */}
          <div className="absolute top-5 bottom-0 w-px bg-destructive/60 pointer-events-none z-10"
            style={{ left: `${playheadPct}%` }} />
        </div>
      </div>
    </div>
  );
};

export default HopTimeline;

```

---

### `src/components/hop/HopAssetBrowser.tsx`

```tsx
import { useState, useCallback } from "react";
import { useAssetLibrary, AssetCategory, LibraryAsset } from "@/hooks/useAssetLibrary";
import { Library, Search, Download, Film, BookOpen, Gamepad2, CreditCard, Disc3, Upload } from "lucide-react";
import { toast } from "sonner";

interface HopAssetBrowserProps {
  onSelectAsset: (dataUrl: string, name: string) => void;
  onLoadHop?: (projectData: any) => void;
}

const CATS: { id: AssetCategory | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "character", label: "CHARS" },
  { id: "background", label: "BG" },
  { id: "effect", label: "FX" },
  { id: "overlay", label: "OVERLAY" },
  { id: "cover", label: "COVER" },
  { id: "title", label: "TITLE" },
];

const IMPORT_SOURCES = [
  { id: "comic", label: "COMIC", icon: BookOpen, desc: "Import comic pages as HOP scenes" },
  { id: "visual-novel", label: "VN", icon: Film, desc: "Import VN scenes as HOP" },
  { id: "cyoa", label: "CYOA", icon: Gamepad2, desc: "Import CYOA paths as scenes" },
  { id: "card", label: "CARDS", icon: CreditCard, desc: "Import card designs as scenes" },
];

const HopAssetBrowser = ({ onSelectAsset, onLoadHop }: HopAssetBrowserProps) => {
  const { assets, isLoading } = useAssetLibrary();
  const [cat, setCat] = useState<AssetCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  const filtered = assets.filter(a => {
    if (cat !== "all" && a.category !== cat) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Find saved HOPs in library
  const savedHops = assets.filter(a =>
    a.metadata && (a.metadata as any).type === "hop-project"
  );

  // Import multiple images as HOP scenes
  const handleBulkImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;
      let loaded = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          onSelectAsset(reader.result as string, file.name.replace(/\.[^.]+$/, ""));
          loaded++;
          if (loaded === files.length) toast.success(`${loaded} images imported as scenes! 🎬`);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  }, [onSelectAsset]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border shrink-0">
        <span className="font-pressstart text-[11px] text-foreground flex items-center gap-1 mb-2">
          <Library className="w-3.5 h-3.5" /> ASSET LIBRARY
        </span>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-secondary text-foreground font-pressstart text-[10px] pl-6 pr-2 py-1.5 rounded border border-border"
            placeholder="Search..."
          />
        </div>
        <div className="flex gap-0.5 flex-wrap">
          {CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`font-pressstart text-[8px] px-1.5 py-0.5 rounded transition-colors ${
                cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* ─── Import as HOP section ─── */}
        <div>
          <button onClick={() => setShowImport(!showImport)}
            className="w-full flex items-center justify-between px-2 py-2 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors">
            <span className="font-pressstart text-[9px] text-primary flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> IMPORT AS HOP
            </span>
            <span className="font-pressstart text-[7px] text-muted-foreground">{showImport ? "▲" : "▼"}</span>
          </button>
          {showImport && (
            <div className="mt-1.5 space-y-1">
              <button onClick={handleBulkImport}
                className="w-full py-2.5 rounded border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 transition-all font-pressstart text-[8px] text-primary">
                <Upload className="w-3.5 h-3.5" /> BULK IMPORT IMAGES
              </button>
              <p className="font-pressstart text-[7px] text-muted-foreground/60 text-center">
                Select multiple images → each becomes a scene
              </p>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {IMPORT_SOURCES.map(src => (
                  <button key={src.id} onClick={handleBulkImport}
                    className="flex flex-col items-center gap-1 p-2 rounded border border-border hover:border-primary/30 bg-secondary/50 hover:bg-secondary transition-colors">
                    <src.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-pressstart text-[7px] text-muted-foreground">{src.label}</span>
                    <span className="font-pressstart text-[5px] text-muted-foreground/50 text-center leading-relaxed">{src.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Saved HOPs ─── */}
        {savedHops.length > 0 && (
          <div>
            <span className="font-pressstart text-[9px] text-foreground flex items-center gap-1 mb-1.5">
              <Disc3 className="w-3 h-3 text-primary" /> SAVED HOPS
            </span>
            <div className="space-y-1">
              {savedHops.map(hop => (
                <button key={hop.id} onClick={() => {
                  const meta = hop.metadata as any;
                  if (meta?.projectData && onLoadHop) {
                    onLoadHop(meta.projectData);
                  } else {
                    onSelectAsset(hop.dataUrl, hop.name);
                  }
                }}
                  className="w-full flex items-center gap-2 p-1.5 rounded border border-border hover:border-primary/30 bg-secondary/30 transition-colors group">
                  {hop.dataUrl && (
                    <div className="w-8 h-8 rounded bg-card border border-border overflow-hidden shrink-0">
                      <img src={hop.dataUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-pressstart text-[8px] text-foreground truncate">{hop.name}</p>
                    <p className="font-pressstart text-[6px] text-muted-foreground">HOP Project</p>
                  </div>
                  <Disc3 className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Regular assets ─── */}
        {isLoading ? (
          <p className="font-pressstart text-[10px] text-muted-foreground text-center py-4">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="font-pressstart text-[10px] text-muted-foreground text-center py-4">
            No assets found. Create some in FX Studio, Character Creator, or Graffiti mode!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map(asset => (
              <button
                key={asset.id}
                onClick={() => onSelectAsset(asset.dataUrl, asset.name)}
                className="group relative rounded border border-border overflow-hidden hover:border-primary/50 transition-colors bg-secondary"
              >
                <div className="aspect-square">
                  <img src={asset.thumbnailUrl || asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div className="px-1 py-0.5 bg-card/80">
                  <p className="font-pressstart text-[7px] text-foreground truncate">{asset.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HopAssetBrowser;

```

---

### `src/components/hop/HopEffectPicker.tsx`

```tsx
import { useState } from "react";
import { useAssetLibrary } from "@/hooks/useAssetLibrary";
import { EFFECT_LIBRARY } from "@/types/fx-types";
import { Sparkles, Library, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HopEffectPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEffect: (dataUrl: string, name: string) => void;
}

type Tab = "library" | "presets" | "vintage";

const VIBE_PRESETS = [
  { id: "glow", label: "GLOW", emoji: "✨", gradient: "radial-gradient(circle, rgba(255,200,50,0.4) 0%, transparent 70%)" },
  { id: "vignette", label: "VIGNETTE", emoji: "🌑", gradient: "radial-gradient(ellipse, transparent 50%, rgba(0,0,0,0.8) 100%)" },
  { id: "neon-wash", label: "NEON WASH", emoji: "💜", gradient: "linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(0,255,255,0.2) 100%)" },
  { id: "fire-overlay", label: "FIRE", emoji: "🔥", gradient: "linear-gradient(to top, rgba(255,69,0,0.5) 0%, rgba(255,165,0,0.2) 50%, transparent 100%)" },
  { id: "ice", label: "ICE", emoji: "❄️", gradient: "linear-gradient(to bottom, rgba(0,191,255,0.3) 0%, rgba(135,206,250,0.1) 100%)" },
  { id: "sunset", label: "SUNSET", emoji: "🌅", gradient: "linear-gradient(to top, rgba(255,94,77,0.4) 0%, rgba(255,154,0,0.3) 40%, rgba(255,200,100,0.1) 100%)" },
  { id: "matrix", label: "MATRIX", emoji: "🟢", gradient: "linear-gradient(to bottom, rgba(0,255,0,0.1) 0%, rgba(0,128,0,0.3) 100%)" },
  { id: "blood", label: "BLOOD", emoji: "🩸", gradient: "linear-gradient(to top, rgba(139,0,0,0.5) 0%, transparent 60%)" },
  { id: "dreamy", label: "DREAMY", emoji: "💫", gradient: "radial-gradient(circle at 30% 50%, rgba(255,182,193,0.3) 0%, rgba(176,224,230,0.2) 50%, transparent 100%)" },
  { id: "noir", label: "NOIR", emoji: "🎬", gradient: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)" },
  { id: "electric", label: "ELECTRIC", emoji: "⚡", gradient: "linear-gradient(45deg, rgba(0,255,255,0.2) 0%, rgba(255,0,255,0.2) 50%, rgba(255,255,0,0.2) 100%)" },
  { id: "smoke-fade", label: "SMOKE", emoji: "💨", gradient: "linear-gradient(to top, rgba(100,100,100,0.4) 0%, rgba(50,50,50,0.2) 40%, transparent 80%)" },
];

/* ─── Vintage Comic Overlay Pack ─── */
const VINTAGE_PRESETS = [
  { id: "halftone-dots", label: "HALFTONE DOTS", emoji: "📰", type: "halftone" as const },
  { id: "halftone-lines", label: "HALFTONE LINES", emoji: "📃", type: "halftone-lines" as const },
  { id: "aged-paper", label: "AGED PAPER", emoji: "📜", type: "aged-paper" as const },
  { id: "film-grain", label: "FILM GRAIN", emoji: "🎞️", type: "grain" as const },
  { id: "sepia-wash", label: "SEPIA WASH", emoji: "🟤", type: "sepia" as const },
  { id: "color-shift-warm", label: "WARM SHIFT", emoji: "🌅", type: "color-warm" as const },
  { id: "color-shift-cool", label: "COOL SHIFT", emoji: "🧊", type: "color-cool" as const },
  { id: "color-shift-faded", label: "FADED PRINT", emoji: "🖨️", type: "faded" as const },
  { id: "comic-screen-tone", label: "SCREEN TONE", emoji: "🔲", type: "screen-tone" as const },
  { id: "newspaper", label: "NEWSPAPER", emoji: "📰", type: "newspaper" as const },
  { id: "vhs-scanlines", label: "VHS SCANLINES", emoji: "📺", type: "scanlines" as const },
  { id: "dust-scratches", label: "DUST & SCRATCHES", emoji: "✨", type: "dust" as const },
];

function generateVintageOverlay(type: string, w = 400, h = 400): string {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  switch (type) {
    case "halftone": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      const dotSize = 4;
      const gap = 8;
      for (let y = 0; y < h; y += gap) {
        for (let x = (y / gap % 2) * (gap / 2); x < w; x += gap) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize / 2 + Math.random() * 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "halftone-lines": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (Math.random() - 0.5) * 2);
        ctx.stroke();
      }
      break;
    }
    case "aged-paper": {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, "rgba(210,180,140,0.15)");
      grad.addColorStop(0.6, "rgba(180,150,100,0.2)");
      grad.addColorStop(1, "rgba(120,80,40,0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Add noise
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 139 : 80},${Math.random() > 0.5 ? 69 : 40},${Math.random() > 0.5 ? 19 : 10},${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
      break;
    }
    case "grain": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 8000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const v = Math.random() * 255;
        ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.08})`;
        ctx.fillRect(x, y, 1, 1);
      }
      break;
    }
    case "sepia": {
      ctx.fillStyle = "rgba(112,66,20,0.2)";
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "color-warm": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(255,140,0,0.15)");
      grad.addColorStop(1, "rgba(255,69,0,0.1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "color-cool": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(70,130,180,0.15)");
      grad.addColorStop(1, "rgba(100,149,237,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "faded": {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(180,160,130,0.08)";
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "screen-tone": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          if ((x + y) % 8 === 0) {
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }
      break;
    }
    case "newspaper": {
      // Yellow tint + halftone combo
      ctx.fillStyle = "rgba(255,250,200,0.12)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 0; y < h; y += 6) {
        for (let x = (y / 6 % 2) * 3; x < w; x += 6) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "scanlines": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 0; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1);
      }
      break;
    }
    case "dust": {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 2;
        ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Scratches
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, 0);
        ctx.lineTo(Math.random() * w, h);
        ctx.stroke();
      }
      break;
    }
    default:
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, w, h);
  }
  return canvas.toDataURL("image/png");
}

function generateGradientDataUrl(gradient: string, w = 400, h = 400): string {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // Draw using a temporary div trick
  const el = document.createElement("div");
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.background = gradient;
  
  // Parse gradient manually for canvas
  // For simplicity, create a semi-transparent color overlay
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);
  
  // Use offscreen rendering
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:${gradient}"></div>
    </foreignObject>
  </svg>`;
  
  const img = new Image();
  const blob = new Blob([svg], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

const HopEffectPicker = ({ isOpen, onClose, onSelectEffect }: HopEffectPickerProps) => {
  const [tab, setTab] = useState<Tab>("presets");
  const { assets } = useAssetLibrary();

  const effectAssets = assets.filter(a => a.category === "effect" || a.tags?.includes("effect"));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[500px] max-h-[70vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col animate-fade-in shadow-2xl">
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-pressstart text-[11px] text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" /> EFFECT PICKER
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex border-b border-border shrink-0">
          {([
            { id: "presets" as const, label: "VIBE PRESETS", icon: <Wand2 className="w-3 h-3" /> },
            { id: "vintage" as const, label: "VINTAGE COMIC", icon: <Sparkles className="w-3 h-3" /> },
            { id: "library" as const, label: "MY EFFECTS", icon: <Library className="w-3 h-3" /> },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex-1 py-2 flex items-center justify-center gap-1.5 font-pressstart text-[9px] transition-all",
                tab === t.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {tab === "presets" && (
            <div className="grid grid-cols-3 gap-2">
              {VIBE_PRESETS.map(preset => (
                <button key={preset.id}
                  onClick={() => {
                    // Generate a canvas-based data URL for the gradient
                    const canvas = document.createElement("canvas");
                    canvas.width = 400; canvas.height = 400;
                    const ctx = canvas.getContext("2d")!;
                    // Create gradient approximation
                    const colors: Record<string, [string, string]> = {
                      "glow": ["rgba(255,200,50,0.4)", "rgba(255,200,50,0)"],
                      "vignette": ["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"],
                      "neon-wash": ["rgba(138,43,226,0.3)", "rgba(0,255,255,0.2)"],
                      "fire-overlay": ["rgba(255,69,0,0.5)", "rgba(255,165,0,0)"],
                      "ice": ["rgba(0,191,255,0.3)", "rgba(135,206,250,0)"],
                      "sunset": ["rgba(255,94,77,0.4)", "rgba(255,200,100,0.1)"],
                      "matrix": ["rgba(0,255,0,0.1)", "rgba(0,128,0,0.3)"],
                      "blood": ["rgba(139,0,0,0.5)", "rgba(139,0,0,0)"],
                      "dreamy": ["rgba(255,182,193,0.3)", "rgba(176,224,230,0.2)"],
                      "noir": ["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"],
                      "electric": ["rgba(0,255,255,0.3)", "rgba(255,0,255,0.2)"],
                      "smoke-fade": ["rgba(100,100,100,0.4)", "rgba(50,50,50,0)"],
                    };
                    const [c1, c2] = colors[preset.id] || ["rgba(255,255,255,0.2)", "rgba(0,0,0,0)"];
                    const grad = preset.id === "glow" || preset.id === "vignette" || preset.id === "dreamy"
                      ? ctx.createRadialGradient(200, 200, 0, 200, 200, 200)
                      : ctx.createLinearGradient(0, 0, 400, 400);
                    grad.addColorStop(0, c1);
                    grad.addColorStop(1, c2);
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, 400, 400);
                    const dataUrl = canvas.toDataURL("image/png");
                    onSelectEffect(dataUrl, preset.label);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 transition-all group">
                  <div className="w-full aspect-square rounded-md overflow-hidden border border-border/50"
                    style={{ background: preset.gradient }}>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="font-pressstart text-[8px] text-muted-foreground group-hover:text-foreground">{preset.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === "vintage" && (
            <div className="grid grid-cols-3 gap-2">
              {VINTAGE_PRESETS.map(preset => (
                <button key={preset.id}
                  onClick={() => {
                    const dataUrl = generateVintageOverlay(preset.type);
                    onSelectEffect(dataUrl, preset.label);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 transition-all group">
                  <div className="w-full aspect-square rounded-md overflow-hidden border border-border/50 bg-card/80 flex items-center justify-center">
                    <span className="text-3xl">{preset.emoji}</span>
                  </div>
                  <span className="font-pressstart text-[7px] text-muted-foreground group-hover:text-foreground text-center">{preset.label}</span>
                </button>
              ))}
            </div>
          )}

          {tab === "library" && (
            effectAssets.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="font-pressstart text-[9px] text-muted-foreground">No effects in your library yet</p>
                <p className="font-pressstart text-[7px] text-muted-foreground/60">Create effects in FX Studio and save them to your library</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {effectAssets.map(asset => (
                  <button key={asset.id}
                    onClick={() => { onSelectEffect(asset.dataUrl, asset.name); onClose(); }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 transition-all">
                    <div className="w-full aspect-square rounded overflow-hidden bg-card">
                      <img src={asset.thumbnailUrl || asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-pressstart text-[7px] text-muted-foreground truncate w-full text-center">{asset.name}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default HopEffectPicker;

```

---

### `src/components/hop/HopExportPanel.tsx`

```tsx
import { Download, Smartphone, Monitor, Square } from "lucide-react";

export type ExportPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  platform: string;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: "tiktok", label: "TikTok / Reels", width: 1080, height: 1920, icon: <Smartphone className="w-3.5 h-3.5" />, platform: "9:16" },
  { id: "ig-story", label: "IG Story", width: 1080, height: 1920, icon: <Smartphone className="w-3.5 h-3.5" />, platform: "9:16" },
  { id: "ig-post", label: "IG Post", width: 1080, height: 1080, icon: <Square className="w-3.5 h-3.5" />, platform: "1:1" },
  { id: "ig-reel", label: "IG Reel", width: 1080, height: 1920, icon: <Smartphone className="w-3.5 h-3.5" />, platform: "9:16" },
  { id: "youtube-short", label: "YT Short", width: 1080, height: 1920, icon: <Smartphone className="w-3.5 h-3.5" />, platform: "9:16" },
  { id: "landscape", label: "Landscape", width: 1920, height: 1080, icon: <Monitor className="w-3.5 h-3.5" />, platform: "16:9" },
  { id: "twitter", label: "X / Twitter", width: 1200, height: 675, icon: <Monitor className="w-3.5 h-3.5" />, platform: "16:9" },
  { id: "custom", label: "Custom", width: 1080, height: 1080, icon: <Download className="w-3.5 h-3.5" />, platform: "—" },
];

interface HopExportPanelProps {
  selectedPreset: string;
  onSelectPreset: (id: string) => void;
  customWidth: number;
  customHeight: number;
  onCustomSize: (w: number, h: number) => void;
}

const HopExportPanel = ({ selectedPreset, onSelectPreset, customWidth, customHeight, onCustomSize }: HopExportPanelProps) => {
  const preset = EXPORT_PRESETS.find(p => p.id === selectedPreset);

  return (
    <div className="space-y-2">
      <span className="font-pressstart text-[11px] text-foreground block">EXPORT SIZE</span>
      <div className="grid grid-cols-2 gap-1">
        {EXPORT_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectPreset(p.id)}
            className={`flex items-center gap-1.5 p-2 rounded border text-left transition-all ${
              selectedPreset === p.id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {p.icon}
            <div className="min-w-0">
              <div className="font-pressstart text-[9px] truncate">{p.label}</div>
              <div className="font-pressstart text-[7px] opacity-60">{p.platform}</div>
            </div>
          </button>
        ))}
      </div>

      {selectedPreset === "custom" && (
        <div className="flex gap-2">
          <div>
            <span className="font-pressstart text-[8px] text-muted-foreground block mb-0.5">WIDTH</span>
            <input
              type="number" value={customWidth}
              onChange={e => onCustomSize(parseInt(e.target.value) || 1080, customHeight)}
              className="w-full bg-secondary text-foreground font-pressstart text-[10px] px-2 py-1 rounded border border-border text-center"
            />
          </div>
          <div>
            <span className="font-pressstart text-[8px] text-muted-foreground block mb-0.5">HEIGHT</span>
            <input
              type="number" value={customHeight}
              onChange={e => onCustomSize(customWidth, parseInt(e.target.value) || 1080)}
              className="w-full bg-secondary text-foreground font-pressstart text-[10px] px-2 py-1 rounded border border-border text-center"
            />
          </div>
        </div>
      )}

      {preset && selectedPreset !== "custom" && (
        <div className="font-pressstart text-[8px] text-muted-foreground/60 text-center">
          {preset.width} × {preset.height}px
        </div>
      )}
    </div>
  );
};

export default HopExportPanel;

```

---

### `src/components/hop/HopProjectsDrawer.tsx`

```tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FolderOpen, Plus, Trash2, Clock, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HopProjectRecord {
  id: string;
  title: string;
  thumbnail_url: string | null;
  updated_at: string;
}

interface HopProjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (projectData: any, projectId: string) => void;
  onNewProject: () => void;
  currentProjectId: string | null;
  getProjectData: () => any;
  getDataUrl: () => Promise<string | null>;
  projectTitle: string;
  isLoggedIn: boolean;
}

const HopProjectsDrawer = ({
  isOpen, onClose, onLoadProject, onNewProject,
  currentProjectId, getProjectData, getDataUrl, projectTitle, isLoggedIn,
}: HopProjectsDrawerProps) => {
  const [projects, setProjects] = useState<HopProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("hop_projects")
        .select("id, title, thumbnail_url, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      setProjects((data as HopProjectRecord[]) || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isOpen) fetchProjects();
  }, [isOpen, fetchProjects]);

  const saveCurrentProject = async () => {
    if (!isLoggedIn) { toast.error("Sign in to save projects"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const projectData = getProjectData();
      const thumbnail = await getDataUrl();

      if (currentProjectId) {
        await supabase.from("hop_projects").update({
          title: projectTitle || "Untitled HOP",
          project_data: projectData,
          thumbnail_url: thumbnail?.slice(0, 500000) || null, // cap size
          updated_at: new Date().toISOString(),
        }).eq("id", currentProjectId);
        toast.success("Project saved! 💾");
      } else {
        const { data, error } = await supabase.from("hop_projects").insert({
          user_id: user.id,
          title: projectTitle || "Untitled HOP",
          project_data: projectData,
          thumbnail_url: thumbnail?.slice(0, 500000) || null,
        }).select("id").single();
        if (error) throw error;
        if (data) {
          onLoadProject(projectData, data.id); // set the ID
          toast.success("Project created! 🎉");
        }
      }
      fetchProjects();
    } catch (err: any) {
      toast.error("Save failed: " + (err.message || "Unknown"));
    }
    setSaving(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await supabase.from("hop_projects").delete().eq("id", id);
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success("Project deleted");
  };

  const loadProject = async (id: string) => {
    try {
      const { data, error } = await supabase.from("hop_projects")
        .select("id, project_data")
        .eq("id", id)
        .single();
      if (error) throw error;
      onLoadProject(data.project_data, data.id);
      onClose();
      toast.success("Project loaded! 🔥");
    } catch {
      toast.error("Failed to load project");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full bg-card border-l border-border flex flex-col animate-fade-in">
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-pressstart text-[11px] text-foreground flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" /> MY HOPS
          </span>
          <button onClick={onClose} className="font-pressstart text-[10px] text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="p-2 border-b border-border flex gap-1 shrink-0">
          <button onClick={saveCurrentProject} disabled={saving}
            className="flex-1 py-2 rounded bg-primary/15 text-primary hover:bg-primary/25 font-pressstart text-[9px] flex items-center justify-center gap-1 border border-primary/30 transition-all disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? "SAVING..." : currentProjectId ? "SAVE" : "SAVE NEW"}
          </button>
          <button onClick={() => { onNewProject(); onClose(); }}
            className="flex-1 py-2 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] flex items-center justify-center gap-1 border border-border transition-all">
            <Plus className="w-3.5 h-3.5" /> NEW
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {!isLoggedIn ? (
            <p className="font-pressstart text-[9px] text-muted-foreground text-center py-8">Sign in to save projects</p>
          ) : loading ? (
            <p className="font-pressstart text-[9px] text-muted-foreground text-center py-8">Loading...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="font-pressstart text-[9px] text-muted-foreground">No saved projects yet</p>
              <p className="font-pressstart text-[7px] text-muted-foreground/60">Save your current HOP to get started</p>
            </div>
          ) : (
            projects.map(p => (
              <div key={p.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all hover:bg-secondary/50",
                  currentProjectId === p.id ? "border-primary/40 bg-primary/5" : "border-border"
                )}
                onClick={() => loadProject(p.id)}>
                <div className="w-12 h-12 rounded bg-card border border-border overflow-hidden shrink-0">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <FolderOpen className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-pressstart text-[9px] text-foreground truncate">{p.title}</p>
                  <p className="font-pressstart text-[7px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                  className="p-1 rounded hover:bg-destructive/20 shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HopProjectsDrawer;

```

---

### `src/components/shared/FreeTransformWrapper.tsx`

```tsx
import React, { useRef, useCallback, useState } from "react";

/**
 * FreeTransformWrapper — reusable drag/resize/rotate handles for any canvas element.
 *
 * Wraps a child element and renders interactive handles when selected.
 * Reports position, scale, and rotation changes via callbacks.
 */

export interface TransformState {
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
}

export interface SnapGuide {
  axis: "x" | "y";
  position: number; // px from center
}

interface FreeTransformWrapperProps {
  /** Current transform values */
  positionX: number;
  positionY: number;
  scale: number;       // percentage, 100 = 1x
  rotation: number;    // degrees
  /** Is this element selected? */
  selected: boolean;
  /** Is this element locked? */
  locked?: boolean;
  /** Canvas zoom level (for correct delta calculation) */
  zoom?: number;
  /** Enable snap-to-grid/center/edges */
  snapEnabled?: boolean;
  /** Canvas dimensions for snap calculations */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Snap threshold in px */
  snapThreshold?: number;
  /** Callback to report active snap guides for rendering */
  onSnapGuides?: (guides: SnapGuide[]) => void;
  /** Callbacks */
  onSelect: () => void;
  onTransformChange: (updates: Partial<TransformState>) => void;
  /** Children to render inside the transform box */
  children: React.ReactNode;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Whether to show rotation handle */
  showRotation?: boolean;
}

type HandleType = "TL" | "TR" | "BL" | "BR" | "TM" | "BM" | "LM" | "RM";

const HANDLE_CURSORS: Record<HandleType, string> = {
  TL: "nwse-resize", TR: "nesw-resize", BL: "nesw-resize", BR: "nwse-resize",
  TM: "ns-resize", BM: "ns-resize", LM: "ew-resize", RM: "ew-resize",
};

const FreeTransformWrapper: React.FC<FreeTransformWrapperProps> = ({
  positionX, positionY, scale, rotation, selected, locked = false,
  zoom = 1, snapEnabled = false, canvasWidth = 0, canvasHeight = 0,
  snapThreshold = 8, onSnapGuides,
  onSelect, onTransformChange, children, className,
  showRotation = true,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    type: "move" | "resize" | "rotate";
    startX: number; startY: number;
    startPosX: number; startPosY: number;
    startScale: number; startRotation: number;
    handle?: HandleType;
  } | null>(null);

  const [interacting, setInteracting] = useState(false);

  const getPointerPos = useCallback((e: PointerEvent | React.PointerEvent) => ({
    x: e.clientX, y: e.clientY,
  }), []);

  // ── MOVE ──
  const onMoveDown = useCallback((e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    onSelect();
    const pos = getPointerPos(e);
    dragState.current = {
      type: "move", startX: pos.x, startY: pos.y,
      startPosX: positionX, startPosY: positionY,
      startScale: scale, startRotation: rotation,
    };
    setInteracting(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [locked, positionX, positionY, scale, rotation, onSelect, getPointerPos]);

  // ── RESIZE ──
  const onResizeDown = useCallback((e: React.PointerEvent, handle: HandleType) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getPointerPos(e);
    dragState.current = {
      type: "resize", startX: pos.x, startY: pos.y,
      startPosX: positionX, startPosY: positionY,
      startScale: scale, startRotation: rotation, handle,
    };
    setInteracting(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [locked, positionX, positionY, scale, rotation, getPointerPos]);

  // ── ROTATE ──
  const onRotateDown = useCallback((e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getPointerPos(e);
    dragState.current = {
      type: "rotate", startX: pos.x, startY: pos.y,
      startPosX: positionX, startPosY: positionY,
      startScale: scale, startRotation: rotation,
    };
    setInteracting(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [locked, positionX, positionY, scale, rotation, getPointerPos]);

  // ── POINTER MOVE ──
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const pos = getPointerPos(e);
    const dx = (pos.x - ds.startX) / zoom;
    const dy = (pos.y - ds.startY) / zoom;

    if (ds.type === "move") {
      let newX = Math.round(ds.startPosX + dx);
      let newY = Math.round(ds.startPosY + dy);
      
      // Snap logic
      if (snapEnabled && canvasWidth > 0 && canvasHeight > 0) {
        const guides: SnapGuide[] = [];
        const halfW = canvasWidth / 2;
        const halfH = canvasHeight / 2;
        // Snap points: center (0,0), edges (-halfW, halfW, -halfH, halfH), thirds
        const xSnaps = [0, -halfW, halfW, -halfW / 3, halfW / 3, -halfW * 2/3, halfW * 2/3];
        const ySnaps = [0, -halfH, halfH, -halfH / 3, halfH / 3, -halfH * 2/3, halfH * 2/3];
        for (const sx of xSnaps) {
          if (Math.abs(newX - sx) < snapThreshold) { newX = sx; guides.push({ axis: "x", position: sx }); break; }
        }
        for (const sy of ySnaps) {
          if (Math.abs(newY - sy) < snapThreshold) { newY = sy; guides.push({ axis: "y", position: sy }); break; }
        }
        onSnapGuides?.(guides);
      }
      
      onTransformChange({ positionX: newX, positionY: newY });
    } else if (ds.type === "resize") {
      // Uniform scale based on drag direction relative to handle
      const handle = ds.handle!;
      // Use the dominant axis for more intuitive scaling
      let scaleDelta = 0;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dominant = absDx > absDy ? dx : dy;
      
      if (handle === "BR") {
        scaleDelta = dominant;
      } else if (handle === "TL") {
        scaleDelta = -dominant;
      } else if (handle === "TR") {
        scaleDelta = absDx > absDy ? dx : -dy;
      } else if (handle === "BL") {
        scaleDelta = absDx > absDy ? -dx : dy;
      } else if (handle === "RM") {
        scaleDelta = dx;
      } else if (handle === "LM") {
        scaleDelta = -dx;
      } else if (handle === "BM") {
        scaleDelta = dy;
      } else if (handle === "TM") {
        scaleDelta = -dy;
      }
      const newScale = Math.max(5, Math.min(2000, ds.startScale + scaleDelta));
      onTransformChange({ scale: Math.round(newScale) });
    } else if (ds.type === "rotate") {
      // Rotation based on angle from center
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startAngle = Math.atan2(ds.startY - cy, ds.startX - cx);
      const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const angleDiff = ((currentAngle - startAngle) * 180) / Math.PI;
      let newRotation = ds.startRotation + angleDiff;
      // Snap to 0/90/180/270 when close
      const snapAngles = [0, 90, 180, 270, -90, -180, -270];
      for (const snap of snapAngles) {
        if (Math.abs(newRotation - snap) < 3) { newRotation = snap; break; }
      }
      onTransformChange({ rotation: Math.round(newRotation) });
    }
  }, [zoom, onTransformChange, getPointerPos, snapEnabled, canvasWidth, canvasHeight, snapThreshold, onSnapGuides]);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
    setInteracting(false);
    onSnapGuides?.([]);
  }, [onSnapGuides]);

  const handleSize = 8;
  const handles: { type: HandleType; style: React.CSSProperties }[] = [
    { type: "TL", style: { top: -handleSize/2, left: -handleSize/2 } },
    { type: "TR", style: { top: -handleSize/2, right: -handleSize/2 } },
    { type: "BL", style: { bottom: -handleSize/2, left: -handleSize/2 } },
    { type: "BR", style: { bottom: -handleSize/2, right: -handleSize/2 } },
    { type: "TM", style: { top: -handleSize/2, left: "50%", marginLeft: -handleSize/2 } },
    { type: "BM", style: { bottom: -handleSize/2, left: "50%", marginLeft: -handleSize/2 } },
    { type: "LM", style: { top: "50%", left: -handleSize/2, marginTop: -handleSize/2 } },
    { type: "RM", style: { top: "50%", right: -handleSize/2, marginTop: -handleSize/2 } },
  ];

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", display: "inline-block", touchAction: "none" }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={onMoveDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}

      {/* Selection ring + handles */}
      {selected && !locked && (
        <>
          {/* Border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "1.5px solid hsl(var(--primary))",
              borderRadius: 2,
              boxShadow: "0 0 0 1px hsl(var(--primary) / 0.3)",
            }}
          />

          {/* Resize handles */}
          {handles.map(({ type, style }) => (
            <div
              key={type}
              onPointerDown={(e) => onResizeDown(e, type)}
              style={{
                ...style,
                position: "absolute",
                width: handleSize,
                height: handleSize,
                background: "hsl(var(--background))",
                border: "1.5px solid hsl(var(--primary))",
                borderRadius: type.length === 2 && !type.includes("M") ? 1 : "50%",
                cursor: HANDLE_CURSORS[type],
                zIndex: 50,
                pointerEvents: "auto",
                touchAction: "none",
              }}
            />
          ))}

          {/* Rotation handle */}
          {showRotation && (
            <>
              {/* Stem line */}
              <div
                className="pointer-events-none"
                style={{
                  position: "absolute",
                  top: -28,
                  left: "50%",
                  width: 1,
                  height: 24,
                  background: "hsl(var(--primary))",
                  transform: "translateX(-50%)",
                }}
              />
              {/* Rotation knob */}
              <div
                onPointerDown={onRotateDown}
                style={{
                  position: "absolute",
                  top: -36,
                  left: "50%",
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  borderRadius: "50%",
                  background: "hsl(var(--primary))",
                  border: "2px solid hsl(var(--background))",
                  cursor: "grab",
                  zIndex: 50,
                  pointerEvents: "auto",
                  touchAction: "none",
                }}
                title="Drag to rotate"
              />
            </>
          )}
        </>
      )}

      {/* Locked indicator */}
      {selected && locked && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: "1.5px dashed hsl(var(--muted-foreground) / 0.5)",
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
};

export default FreeTransformWrapper;

```

---

### `src/data/hop-scene-templates.ts`

```ts
import { HopScene, HopTransition } from "@/types/hop-types";

export interface HopSceneTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  category: "cinematic" | "action" | "dialogue" | "mood" | "music";
  scene: Partial<HopScene>;
}

export const HOP_SCENE_TEMPLATES: HopSceneTemplate[] = [
  {
    id: "cinematic-opener",
    label: "CINEMATIC OPENER",
    emoji: "🎬",
    description: "Wide shot, fade in, ambient audio",
    category: "cinematic",
    scene: {
      duration: 8,
      transition: "fade",
      mood: "cinematic, dramatic",
      cameraAngle: "wide establishing",
      lighting: "low-key, atmospheric",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 1.3 },
      cameraEasing: "ease-in-out",
    },
  },
  {
    id: "action-sequence",
    label: "ACTION SEQUENCE",
    emoji: "💥",
    description: "Quick cuts, burst FX, high energy",
    category: "action",
    scene: {
      duration: 3,
      transition: "cut",
      mood: "intense, high-energy",
      cameraAngle: "dynamic, close-up",
      lighting: "harsh, contrasty",
      cameraStart: { x: -5, y: 0, zoom: 1.2 },
      cameraEnd: { x: 5, y: 0, zoom: 1.5 },
      cameraEasing: "ease-out",
    },
  },
  {
    id: "dialogue-beat",
    label: "DIALOGUE BEAT",
    emoji: "💬",
    description: "Character focus, speech bubbles, soft BG",
    category: "dialogue",
    scene: {
      duration: 6,
      transition: "fade",
      mood: "conversational, intimate",
      cameraAngle: "medium shot",
      lighting: "soft, even",
      cameraStart: { x: 0, y: 0, zoom: 1.1 },
      cameraEnd: { x: 0, y: 0, zoom: 1.15 },
      cameraEasing: "ease-in-out",
    },
  },
  {
    id: "dramatic-reveal",
    label: "DRAMATIC REVEAL",
    emoji: "😱",
    description: "Slow zoom, tension build, iris transition",
    category: "cinematic",
    scene: {
      duration: 5,
      transition: "iris",
      mood: "suspenseful, mysterious",
      cameraAngle: "tight close-up",
      lighting: "dramatic, single source",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 2 },
      cameraEasing: "ease-in",
    },
  },
  {
    id: "transition-breather",
    label: "BREATHER",
    emoji: "🌙",
    description: "Slow pan, calm mood, wipe transition",
    category: "mood",
    scene: {
      duration: 7,
      transition: "wipe-right",
      mood: "calm, reflective",
      cameraAngle: "wide",
      lighting: "soft, warm",
      cameraStart: { x: -8, y: 0, zoom: 1.1 },
      cameraEnd: { x: 8, y: 0, zoom: 1.1 },
      cameraEasing: "linear",
    },
  },
  {
    id: "music-drop",
    label: "MUSIC DROP",
    emoji: "🔥",
    description: "Glitch transition, zoom burst, beat-synced",
    category: "music",
    scene: {
      duration: 4,
      transition: "glitch",
      mood: "explosive, hype",
      cameraAngle: "dynamic",
      lighting: "neon, high contrast",
      cameraStart: { x: 0, y: 0, zoom: 0.8 },
      cameraEnd: { x: 0, y: 0, zoom: 1.6 },
      cameraEasing: "ease-out",
    },
  },
  {
    id: "credits-roll",
    label: "CREDITS / OUTRO",
    emoji: "🎭",
    description: "Slow fade out, text card ready",
    category: "cinematic",
    scene: {
      duration: 10,
      transition: "fade",
      assetType: "text_card",
      mood: "closing, reflective",
      textOverlay: "Created with Press Start",
      cameraStart: { x: 0, y: 0, zoom: 1 },
      cameraEnd: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "lyric-card",
    label: "LYRIC CARD",
    emoji: "🎤",
    description: "Text-focused, bold typography, slide transition",
    category: "music",
    scene: {
      duration: 5,
      transition: "slide-left",
      assetType: "text_card",
      mood: "lyrical, expressive",
      textOverlay: "Your lyrics here...",
    },
  },
];

/** Generate social copy from HOP metadata */
export function generateSocialCopy(hop: {
  title: string;
  description: string;
  tags: string[];
  type: string;
  scenes: Array<{ caption?: string; mood?: string; textOverlay?: string }>;
  totalDuration: number;
}) {
  const moods = hop.scenes.map(s => s.mood).filter(Boolean);
  const captions = hop.scenes.map(s => s.caption || s.textOverlay).filter(Boolean);

  // Caption
  const captionParts: string[] = [];
  if (hop.title && hop.title !== "Untitled HOP") captionParts.push(hop.title);
  if (hop.description) captionParts.push(hop.description);
  else if (captions.length > 0) captionParts.push(captions[0]!);
  if (moods.length > 0) captionParts.push(`Vibes: ${moods.slice(0, 3).join(", ")}`);
  const caption = captionParts.join(" | ") || "Check out my new creation ✨";

  // Hashtags
  const baseHashtags = ["#PressStart", "#CoMiXX", "#HOP", "#DigitalArt"];
  const moodHashtags = moods.slice(0, 3).map(m => `#${m.split(",")[0].trim().replace(/\s+/g, "")}`);
  const tagHashtags = hop.tags.slice(0, 5).map(t => `#${t.replace(/\s+/g, "")}`);
  const hashtags = [...new Set([...baseHashtags, ...moodHashtags, ...tagHashtags])].slice(0, 12);

  // YouTube description
  const ytDesc = [
    hop.title || "Untitled HOP",
    "",
    hop.description || "Created with Press Start FX Studio",
    "",
    `Duration: ${hop.totalDuration}s | Scenes: ${hop.scenes.length}`,
    moods.length > 0 ? `Mood: ${moods.join(", ")}` : "",
    "",
    "Made with Press Start CoMiXX — https://pressstartgaming.com",
    "",
    hashtags.join(" "),
  ].filter(l => l !== undefined).join("\n");

  return { caption, hashtags, youtubeDescription: ytDesc };
}

```

---

### `src/pages/HopBuilder.tsx`

```tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import CanvasContextMenu from "@/components/CanvasContextMenu";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ALL_FONT_NAMES, FONT_CATEGORIES, FONT_REGISTRY, ensureFontLoaded } from "@/data/fonts";
import ModeHeader from "@/components/ModeHeader";
import SendToMenu from "@/components/SendToMenu";
import SaveToLibraryButton from "@/components/SaveToLibraryButton";
import { useSyncToCoMiXX } from "@/hooks/useSyncToCoMiXX";
import Tip from "@/components/ui/tip";
import { Slider } from "@/components/ui/slider";
import { toPng } from "html-to-image";
import { useUser } from "@/contexts/UserContext";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { supabase } from "@/integrations/supabase/client";
import HopAssetBrowser from "@/components/hop/HopAssetBrowser";
import HopExportPanel, { EXPORT_PRESETS } from "@/components/hop/HopExportPanel";
import HopProjectsDrawer from "@/components/hop/HopProjectsDrawer";
import HopEffectPicker from "@/components/hop/HopEffectPicker";
import FreeTransformWrapper, { SnapGuide } from "@/components/shared/FreeTransformWrapper";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import ZoomControls from "@/components/shared/ZoomControls";
import HopTimeline, { HopKeyframe, HopLayerKeyframes, HopEasing } from "@/components/hop/HopTimeline";
import {
  Play, Pause, Plus, Trash2, Image as ImageIcon,
  Film, Type, Music, Upload, Eye, EyeOff, Send, Repeat, Timer,
  Layers, ChevronUp, ChevronDown, Disc3, Zap, Volume2, VolumeX,
  Radio, Sparkles, Globe, Lock, Copy, Library, Download,
  Settings, Maximize, X, GripVertical, Wand2, Monitor, Smartphone, Square, Save,
  Unlock, FlipHorizontal, FolderOpen, Cloud, CloudOff, Palette, Heart,
  MoveHorizontal, ArrowRight, ArrowLeft,
} from "lucide-react";
import {
  HopProject, HopScene, HopSceneAssetType, HopTransition,
  createDefaultHopProject, createDefaultHopScene,
} from "@/types/hop-types";
import { HopLayer, HopBlendMode, HopBeatReactType } from "@/components/hop/HopLayersPanel";
import { HOP_SCENE_TEMPLATES, generateSocialCopy } from "@/data/hop-scene-templates";
import { cn } from "@/lib/utils";

/* ─── Left panel tabs — 3 tabs ─── */
type LeftTab = "scenes" | "assets" | "audio";

/* ─── Right panel context — auto-determined ─── */
type RightContext = "scene" | "text-layer" | "media-layer" | "effect-layer" | "audio" | "none";

const TRANSITION_OPTIONS: { id: HopTransition; label: string; emoji: string }[] = [
  { id: "cut", label: "CUT", emoji: "✂️" },
  { id: "fade", label: "FADE", emoji: "🌫️" },
  { id: "zoom", label: "ZOOM", emoji: "🔍" },
  { id: "glitch", label: "GLITCH", emoji: "⚡" },
  { id: "wipe-left", label: "WIPE ←", emoji: "◀️" },
  { id: "wipe-right", label: "WIPE →", emoji: "▶️" },
  { id: "wipe-up", label: "WIPE ↑", emoji: "🔼" },
  { id: "wipe-down", label: "WIPE ↓", emoji: "🔽" },
  { id: "iris", label: "IRIS", emoji: "🔘" },
  { id: "slide-left", label: "SLIDE ←", emoji: "⬅️" },
  { id: "slide-right", label: "SLIDE →", emoji: "➡️" },
  { id: "blur-through", label: "BLUR", emoji: "💫" },
];

const LAYER_ICONS: Record<HopLayer["type"], React.ReactNode> = {
  media: <ImageIcon className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
  effect: <Sparkles className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
  caption: <Type className="w-3.5 h-3.5" />,
};

const VIDEO_SOURCE_REGEX = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
function isVideoSource(url?: string): boolean {
  if (!url) return false;
  return url.startsWith("data:video/") || VIDEO_SOURCE_REGEX.test(url);
}

/* ─── Text overlay styling ─── */
interface TextOverlayStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  bgOpacity: number;
  textAlign: "left" | "center" | "right";
  position: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  animation: "none" | "typewriter" | "fade-in" | "slide-up" | "glitch" | "bounce" | "wave" | "neon-flicker" | "zoom-in" | "spin-in" | "shake" | "rainbow";
}

const DEFAULT_TEXT_STYLE: TextOverlayStyle = {
  fontFamily: "Press Start 2P",
  fontSize: 14,
  color: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 2,
  bgColor: "#000000",
  bgOpacity: 50,
  textAlign: "center",
  position: "bottom",
  bold: false,
  italic: false,
  animation: "none",
};

const TEXT_ANIMATIONS = [
  { id: "none" as const, label: "None", icon: "—" },
  { id: "typewriter" as const, label: "Typewriter", icon: "⌨️" },
  { id: "fade-in" as const, label: "Fade In", icon: "🌫️" },
  { id: "slide-up" as const, label: "Slide Up", icon: "⬆️" },
  { id: "glitch" as const, label: "Glitch", icon: "⚡" },
  { id: "bounce" as const, label: "Bounce", icon: "🏀" },
  { id: "wave" as const, label: "Wave", icon: "🌊" },
  { id: "neon-flicker" as const, label: "Neon Flicker", icon: "💡" },
  { id: "zoom-in" as const, label: "Zoom In", icon: "🔍" },
  { id: "spin-in" as const, label: "Spin In", icon: "🔄" },
  { id: "shake" as const, label: "Shake", icon: "🫨" },
  { id: "rainbow" as const, label: "Rainbow", icon: "🌈" },
];

function getTextAnimClass(anim?: string): string {
  if (!anim || anim === "none") return "";
  const map: Record<string, string> = {
    "typewriter": "hop-text-typewriter",
    "fade-in": "animate-fade-in",
    "slide-up": "hop-text-slide-up",
    "glitch": "hop-text-glitch",
    "bounce": "hop-text-bounce",
    "wave": "hop-text-wave",
    "neon-flicker": "hop-text-neon-flicker",
    "zoom-in": "hop-text-zoom-in",
    "spin-in": "hop-text-spin-in",
    "shake": "hop-text-shake",
    "rainbow": "hop-text-rainbow",
  };
  return map[anim] || "";
}

const TEXT_PRESETS = [
  { label: "SUBTITLE", style: { fontFamily: "Press Start 2P", fontSize: 12, color: "#FFFFFF", bgColor: "#000000", bgOpacity: 60, position: "bottom" as const, strokeWidth: 0 } },
  { label: "TITLE", style: { fontFamily: "Bangers", fontSize: 32, color: "#FFD700", strokeColor: "#000000", strokeWidth: 3, bgOpacity: 0, position: "center" as const } },
  { label: "SHOUT", style: { fontFamily: "Anton", fontSize: 48, color: "#FF0000", strokeColor: "#FFFFFF", strokeWidth: 4, bgOpacity: 0, position: "center" as const, bold: true } },
  { label: "WHISPER", style: { fontFamily: "Press Start 2P", fontSize: 10, color: "#CCCCCC", strokeWidth: 0, bgColor: "#000000", bgOpacity: 30, position: "bottom" as const, italic: true } },
  { label: "NEON", style: { fontFamily: "Audiowide", fontSize: 24, color: "#00FFFF", strokeColor: "#FF00FF", strokeWidth: 2, bgOpacity: 0, position: "center" as const, animation: "glitch" as const } },
  { label: "COMIC", style: { fontFamily: "Bangers", fontSize: 28, color: "#FFFFFF", strokeColor: "#000000", strokeWidth: 4, bgColor: "#FF0000", bgOpacity: 80, position: "top" as const } },
];

function createDefaultLayer(type: HopLayer["type"], index: number): HopLayer {
  const names: Record<HopLayer["type"], string> = {
    media: "Media", text: "Text", effect: "FX", audio: "Audio", caption: "Caption",
  };
  return {
    id: `layer-${Date.now()}-${index}`,
    name: `${names[type]} ${index + 1}`,
    type, visible: true, locked: false, opacity: 1, zIndex: index,
    positionX: 0, positionY: 0, scale: 100, rotation: 0,
    objectFit: "contain",
    blendMode: "normal",
    fontFamily: "Press Start 2P", fontSize: 14, fontColor: "#FFFFFF",
    strokeColor: "#000000", strokeWidth: 2, bold: false, italic: false,
    shadowColor: "#000000", shadowBlur: 0, shadowX: 0, shadowY: 0,
    beatReact: "none", beatIntensity: 50,
    parallaxDepth: Math.min(100, Math.round((index / Math.max(1, index + 1)) * 100)),
  };
}

function isSceneBackgroundLayer(scene: HopScene, layer: HopLayer): boolean {
  return layer.type === "media" && Boolean(scene.assetUrl) && layer.dataUrl === scene.assetUrl;
}

function getHopLayerShellStyle(scene: HopScene, layer: HopLayer, parallaxShift = 0): React.CSSProperties {
  if (isSceneBackgroundLayer(scene, layer)) {
    return {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
    };
  }

  return {
    position: "absolute",
    left: `calc(50% + ${layer.positionX + parallaxShift}px)`,
    top: `calc(50% + ${layer.positionY}px)`,
    transform: "translate(-50%, -50%)",
  };
}

function renderHopLayerContent(
  scene: HopScene,
  layer: HopLayer,
  frameWidth: number,
  frameHeight: number,
  options: { autoPlay?: boolean; dataHopVideo?: boolean; animKey?: string } = {}
) {
  const isBackground = isSceneBackgroundLayer(scene, layer);
  const mediaClassName = cn(
    "pointer-events-none",
    isBackground ? "w-full h-full" : ""
  );
  const mediaStyle: React.CSSProperties = {
    objectFit: layer.objectFit || "contain",
    display: "block",
  };

  // Ensure font is loaded before rendering text
  const fontName = layer.fontFamily || "Press Start 2P";
  if ((layer.type === "text" || layer.type === "caption") && fontName) {
    ensureFontLoaded(fontName);
  }

  // Build a key that re-triggers CSS animations on scene change / play toggle
  const textAnimKey = `${layer.id}-${(layer as any).textAnimation}-${scene.id}-${options.animKey || ""}`;

  return (
    <div
      style={isBackground
        ? {
            width: frameWidth,
            height: frameHeight,
            transform: `translate(${layer.positionX}px, ${layer.positionY}px) rotate(${layer.rotation}deg) scale(${layer.scale / 100})`,
            transformOrigin: "center center",
          }
        : {
            transform: `rotate(${layer.rotation}deg) scale(${layer.scale / 100})`,
          }}
    >
      {layer.dataUrl && (
        isVideoSource(layer.dataUrl)
          ? <video src={layer.dataUrl} className={mediaClassName} style={mediaStyle} data-hop-video={options.dataHopVideo ? "true" : undefined} autoPlay={options.autoPlay ?? true} loop muted playsInline />
          : <img src={layer.dataUrl} alt={layer.name} className={mediaClassName} style={mediaStyle} />
      )}
      {(layer.type === "text" || layer.type === "caption") && (
        <div className="px-4 py-2 whitespace-nowrap">
          <span style={{
            fontFamily: fontName,
            fontSize: `${layer.fontSize || 14}px`,
            color: layer.fontColor || "#FFFFFF",
            fontWeight: layer.bold ? 700 : 400,
            fontStyle: layer.italic ? "italic" : "normal",
            WebkitTextStroke: (layer.strokeWidth || 0) > 0 ? `${layer.strokeWidth}px ${layer.strokeColor || "#000"}` : undefined,
          }} key={textAnimKey} className={cn("drop-shadow-lg", getTextAnimClass((layer as any).textAnimation))}>{layer.text || "Text"}</span>
        </div>
      )}
    </div>
  );
}

const BEAT_REACT_OPTIONS: { value: HopBeatReactType; label: string; icon: string }[] = [
  { value: "none", label: "OFF", icon: "—" },
  { value: "pulse", label: "PULSE", icon: "💗" },
  { value: "bounce", label: "BOUNCE", icon: "⬆️" },
  { value: "shake", label: "SHAKE", icon: "🫨" },
  { value: "glow", label: "GLOW", icon: "✨" },
  { value: "zoom", label: "ZOOM", icon: "🔍" },
  { value: "rotate", label: "ROTATE", icon: "🔄" },
  { value: "flash", label: "FLASH", icon: "⚡" },
  { value: "tilt", label: "TILT", icon: "📐" },
];

function getBeatReactStyle(layer: HopLayer, bpm: number | null, isPlaying: boolean): React.CSSProperties {
  if (!isPlaying || !bpm || !layer.beatReact || layer.beatReact === "none") return {};
  const duration = `${60 / bpm}s`;
  const intensity = (layer.beatIntensity ?? 50) / 100;
  const animName = `hop-beat-${layer.beatReact === "pulse" ? "pulse-layer" : layer.beatReact}`;
  return {
    "--hop-beat-intensity": `${intensity * 0.3}`,
    "--hop-beat-px": `${Math.round(intensity * 12)}px`,
    "--hop-beat-deg": `${Math.round(intensity * 8)}deg`,
    "--hop-base-opacity": `${layer.opacity}`,
    animation: `${animName} ${duration} ease-out infinite`,
  } as React.CSSProperties;
}

/* ─── Camera Ken Burns helper ─── */
function getCameraStyle(scene: any, progress: number): React.CSSProperties {
  if (!scene?.cameraStart && !scene?.cameraEnd) return {};
  const start = scene.cameraStart || { x: 0, y: 0, zoom: 1 };
  const end = scene.cameraEnd || { x: 0, y: 0, zoom: 1 };
  const easing = scene.cameraEasing || "ease-in-out";
  // For CSS animation we use start values and animate to end
  const x = start.x + (end.x - start.x) * progress;
  const y = start.y + (end.y - start.y) * progress;
  const zoom = start.zoom + (end.zoom - start.zoom) * progress;
  return {
    transform: `translate(${x}%, ${y}%) scale(${zoom})`,
    transformOrigin: "center center",
    transition: "none",
  };
}

const CAMERA_PRESETS = [
  { id: "zoom-in", label: "ZOOM IN", start: { x: 0, y: 0, zoom: 1 }, end: { x: 0, y: 0, zoom: 1.4 } },
  { id: "zoom-out", label: "ZOOM OUT", start: { x: 0, y: 0, zoom: 1.4 }, end: { x: 0, y: 0, zoom: 1 } },
  { id: "pan-left", label: "PAN LEFT", start: { x: 10, y: 0, zoom: 1.2 }, end: { x: -10, y: 0, zoom: 1.2 } },
  { id: "pan-right", label: "PAN RIGHT", start: { x: -10, y: 0, zoom: 1.2 }, end: { x: 10, y: 0, zoom: 1.2 } },
  { id: "pan-up", label: "PAN UP", start: { x: 0, y: 5, zoom: 1.2 }, end: { x: 0, y: -5, zoom: 1.2 } },
  { id: "pan-down", label: "PAN DOWN", start: { x: 0, y: -5, zoom: 1.2 }, end: { x: 0, y: 5, zoom: 1.2 } },
  { id: "drift-nw", label: "DRIFT NW", start: { x: 5, y: 5, zoom: 1.15 }, end: { x: -5, y: -5, zoom: 1.3 } },
  { id: "drift-se", label: "DRIFT SE", start: { x: -5, y: -5, zoom: 1.3 }, end: { x: 5, y: 5, zoom: 1.15 } },
  { id: "none", label: "NONE", start: { x: 0, y: 0, zoom: 1 }, end: { x: 0, y: 0, zoom: 1 } },
];

/* ─── Motion blur CSS filter helper ─── */
function getMotionBlurFilter(layer: HopLayer): string {
  if (!layer.motionBlur || layer.motionBlur <= 0) return "";
  // CSS blur approximation (true directional blur requires SVG filter)
  return `blur(${layer.motionBlur}px)`;
}


/* ─── ONE-TAP VIBE MODES — the viral wow factor ─── */
const VIBE_MODES = [
  { id: "lofi-chill", label: "LO-FI CHILL", emoji: "🌙", gradient: ["rgba(138,43,226,0.25)", "rgba(0,0,0,0)"], blendMode: "screen" as HopBlendMode, tint: "#8B5CF6" },
  { id: "golden-hour", label: "GOLDEN HOUR", emoji: "🌅", gradient: ["rgba(255,165,0,0.35)", "rgba(255,94,77,0.15)"], blendMode: "overlay" as HopBlendMode, tint: "#F59E0B" },
  { id: "cyberpunk", label: "CYBERPUNK", emoji: "⚡", gradient: ["rgba(0,255,255,0.2)", "rgba(255,0,255,0.25)"], blendMode: "screen" as HopBlendMode, tint: "#06B6D4" },
  { id: "noir", label: "NOIR", emoji: "🎬", gradient: ["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"], blendMode: "multiply" as HopBlendMode, tint: "#6B7280" },
  { id: "anime-pop", label: "ANIME POP", emoji: "✨", gradient: ["rgba(255,105,180,0.3)", "rgba(255,255,0,0.15)"], blendMode: "screen" as HopBlendMode, tint: "#EC4899" },
  { id: "vintage", label: "VINTAGE", emoji: "📷", gradient: ["rgba(139,69,19,0.25)", "rgba(210,180,140,0.2)"], blendMode: "overlay" as HopBlendMode, tint: "#92400E" },
  { id: "ice-cold", label: "ICE COLD", emoji: "❄️", gradient: ["rgba(0,191,255,0.3)", "rgba(135,206,250,0.1)"], blendMode: "screen" as HopBlendMode, tint: "#38BDF8" },
  { id: "fire", label: "FIRE", emoji: "🔥", gradient: ["rgba(255,69,0,0.4)", "rgba(255,165,0,0.15)"], blendMode: "screen" as HopBlendMode, tint: "#EF4444" },
  { id: "dream", label: "DREAM", emoji: "💫", gradient: ["rgba(255,182,193,0.3)", "rgba(176,224,230,0.2)"], blendMode: "screen" as HopBlendMode, tint: "#F9A8D4" },
  { id: "matrix", label: "MATRIX", emoji: "🟢", gradient: ["rgba(0,255,0,0.15)", "rgba(0,128,0,0.25)"], blendMode: "screen" as HopBlendMode, tint: "#22C55E" },
];

const sLabel = "font-pressstart text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider";

const HopBuilder: React.FC = () => {
  const location = useLocation();
  const { email, isLoggedIn } = useUser();
  const { syncToCoMiXX, isSyncing } = useSyncToCoMiXX();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasAreaHeight, setCanvasAreaHeight] = useState(650);
  const { zoom: hopZoom, zoomIn: hopZoomIn, zoomOut: hopZoomOut, resetZoom: hopResetZoom, containerRef: hopZoomRef } = useCanvasZoom();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Gapless audio loop via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);

  const [leftTab, setLeftTab] = useState<LeftTab>("scenes");
  const [hop, setHop] = useState<HopProject>(createDefaultHopProject);

  // Undo/Redo
  const { pushState: pushUndo } = useUndoRedo<HopProject>(
    (restored) => setHop(restored)
  );
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSceneIdx, setPreviewSceneIdx] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [zoneOutMode, setZoneOutMode] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectsDrawer, setShowProjectsDrawer] = useState(false);
  const [showEffectPicker, setShowEffectPicker] = useState(false);
  const [cloudProjectId, setCloudProjectId] = useState<string | null>(null);

  // Viewport preview
  type ViewportMode = "desktop" | "mobile" | "tablet" | "square";
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const effectiveDesktopH = Math.max(400, canvasAreaHeight - 30); // 30px for label + padding
  const VIEWPORT_SIZES: Record<ViewportMode, { w: number; h: number; label: string }> = {
    desktop: { w: 800, h: effectiveDesktopH, label: "FILL" },
    mobile: { w: 280, h: 500, label: "9:16" },
    tablet: { w: 450, h: 500, label: "4:3" },
    square: { w: 500, h: 500, label: "1:1" },
  };

  // Layers per scene
  const [sceneLayers, setSceneLayers] = useState<Record<string, HopLayer[]>>({});
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Keyframes per scene
  const [sceneKeyframes, setSceneKeyframes] = useState<Record<string, HopLayerKeyframes>>({});
  const [currentTime, setCurrentTime] = useState(0); // seconds within current scene

  // Clipboard for copy/paste
  const clipboardRef = useRef<HopLayer | null>(null);

  // Text overlay styling per scene
  const [sceneTextStyles, setSceneTextStyles] = useState<Record<string, TextOverlayStyle>>({});
  const [transitionClass, setTransitionClass] = useState<string>("");
  const [cameraProgress, setCameraProgress] = useState(0); // 0-1 progress through current scene
  const cameraAnimRef = useRef<number | null>(null);
  const sceneStartTimeRef = useRef<number>(0);

  // Export
  const [exportPreset, setExportPreset] = useState("tiktok");
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);

  // Drag state for timeline
  const [dragSceneIdx, setDragSceneIdx] = useState<number | null>(null);

  // Audio waveform data
  const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Multi-audio clips
  const [audioClips, setAudioClips] = useState<import("@/components/hop/HopTimeline").HopAudioClip[]>([]);

  // Moving HOP mode (panoramic horizontal scroll like Roku screensaver)
  type HopDisplayMode = "standard" | "moving";
  const [hopDisplayMode, setHopDisplayMode] = useState<HopDisplayMode>("standard");
  const [scrollSpeed, setScrollSpeed] = useState(30); // pixels per second
  const [scrollDirection, setScrollDirection] = useState<"left" | "right">("left");
  const [seamlessStitch, setSeamlessStitch] = useState(true); // Seamless scene edges for Roku-style look
  // Playback mode within Moving HOP: "standard" = scene-cycling, "screensaver" = smooth scroll
  type MovingPlaybackMode = "standard" | "screensaver";
  const [movingPlaybackMode, setMovingPlaybackMode] = useState<MovingPlaybackMode>("screensaver");
  const movingContainerRef = useRef<HTMLDivElement>(null);
  const movingAnimRef = useRef<number | null>(null);
  const movingOffsetRef = useRef(0);
  const [parallaxOffset, setParallaxOffset] = useState(0); // current scroll px for parallax layers
  const zoneOutMovingRef = useRef<HTMLDivElement>(null);
  const zoneOutAnimRef = useRef<number | null>(null);
  const zoneOutOffsetRef = useRef(0);

  // Snap guides for visual feedback
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  // Viral metrics — watch time tracking
  const watchStartRef = useRef<number | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Has content — determines if we show the empty state
  const hasContent = hop.scenes.some(s => s.assetUrl || s.assetType === "text_card" || (sceneLayers[s.id] || []).length > 0);

  // Legacy migration: convert scene.assetUrl to proper layers
  // Measure available canvas area height dynamically
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = Math.floor(entry.contentRect.height);
      if (h > 100) setCanvasAreaHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let migrated = false;
    for (const scene of hop.scenes) {
      if (scene.assetUrl && !(sceneLayers[scene.id] || []).some(l => l.dataUrl === scene.assetUrl)) {
        const existing = sceneLayers[scene.id] || [];
        const bgLayer = createDefaultLayer("media", 0);
        bgLayer.dataUrl = scene.assetUrl;
        bgLayer.name = scene.caption || "Background";
        bgLayer.objectFit = "contain";
        bgLayer.zIndex = 0;
        bgLayer.scale = 100;
        const shifted = existing.map(l => ({ ...l, zIndex: l.zIndex + 1 }));
        setSceneLayers(prev => ({ ...prev, [scene.id]: [bgLayer, ...shifted] }));
        migrated = true;
      }
    }
    if (migrated) toast.success("🔄 Migrated backgrounds to layers — now fully transformable!");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Import asset from other modes — deferred to run AFTER autosave load
  const pendingImportRef = useRef<{ dataUrl: string; name: string } | null>(null);
  useEffect(() => {
    const state = location.state as any;
    if (state?.importImage) {
      pendingImportRef.current = { dataUrl: state.importImage, name: state.importName || "Imported Asset" };
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to exit zone out mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoneOutMode) {
          setZoneOutMode(false);
          setIsPlaying(false);
          stopGaplessAudio();
        } else if (selectedLayerId) {
          setSelectedLayerId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoneOutMode]);

  // Keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+D, Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Delete selected layer
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId && selectedScene) {
        e.preventDefault();
        deleteLayer(selectedLayerId);
        return;
      }

      // V = select/pointer mode (already default — ensure deselect tool state)
      if (!mod && e.key === "v") {
        e.preventDefault();
        return;
      }

      if (!mod) return;

      // Copy layer
      if (e.key === "c" && selectedLayerId) {
        e.preventDefault();
        const layer = currentSceneLayers.find(l => l.id === selectedLayerId);
        if (layer) { clipboardRef.current = { ...layer }; toast.success("Layer copied"); }
      }

      // Paste layer
      if (e.key === "v" && clipboardRef.current && selectedScene) {
        e.preventDefault();
        const pasted = { ...clipboardRef.current, id: `layer-${Date.now()}-paste`, name: `${clipboardRef.current.name} copy`, zIndex: currentSceneLayers.length };
        setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...(prev[selectedScene.id] || []), pasted] }));
        setSelectedLayerId(pasted.id);
        toast.success("Layer pasted");
      }

      // Duplicate layer
      if (e.key === "d" && selectedLayerId && selectedScene) {
        e.preventDefault();
        duplicateLayer(selectedLayerId);
      }

      // Save
      if (e.key === "s") {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally no deps — always fresh closures

  // Save to localStorage
  const saveKey = "hop-builder-autosave";
  const saveProject = useCallback(() => {
    try {
      const data = { hop, sceneLayers, sceneTextStyles, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch };
      localStorage.setItem(saveKey, JSON.stringify(data));
      toast.success("Project saved!");
    } catch { toast.error("Save failed — project too large"); }
  }, [hop, sceneLayers, sceneTextStyles, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch]);

  // Load from localStorage on mount, or from library via sessionStorage
  // Then process any pending import from Send To
  useEffect(() => {
    try {
      // If there's a pending import from another mode, skip autosave restore
      // so the imported asset lands cleanly
      if (pendingImportRef.current) {
        // Still load autosave but then immediately add the imported asset
        const saved = localStorage.getItem(saveKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.hop) setHop(data.hop);
          if (data.sceneLayers) setSceneLayers(data.sceneLayers);
          if (data.sceneTextStyles) setSceneTextStyles(data.sceneTextStyles);
          if (data.exportPreset) setExportPreset(data.exportPreset);
          if (data.audioClips) setAudioClips(data.audioClips);
          if (data.hopDisplayMode) setHopDisplayMode(data.hopDisplayMode);
          if (data.scrollSpeed) setScrollSpeed(data.scrollSpeed);
          if (data.scrollDirection) setScrollDirection(data.scrollDirection);
          if (data.seamlessStitch !== undefined) setSeamlessStitch(data.seamlessStitch);
        }
        // Use functional setHop to add imported asset as a new scene
        // AND create the matching media layer so it renders on canvas
        const pending = pendingImportRef.current;
        pendingImportRef.current = null;
        const isVideo = pending.dataUrl.startsWith("data:video/");
        
        let targetSceneId = "";
        let targetSceneIdx = 0;
        setHop(prev => {
          const isFirstEmpty = prev.scenes.length === 1 && !prev.scenes[0].assetUrl && prev.scenes[0].assetType !== "text_card";
          if (isFirstEmpty) {
            targetSceneId = prev.scenes[0].id;
            targetSceneIdx = 0;
            return {
              ...prev,
              scenes: [{ ...prev.scenes[0], assetUrl: pending.dataUrl, assetType: isVideo ? "video" : "image", caption: pending.name }],
              updatedAt: new Date().toISOString(),
            };
          }
          const scene = createDefaultHopScene(prev.scenes.length);
          scene.assetUrl = pending.dataUrl;
          scene.assetType = isVideo ? "video" : "image";
          scene.caption = pending.name;
          targetSceneId = scene.id;
          targetSceneIdx = prev.scenes.length;
          return { ...prev, scenes: [...prev.scenes, scene], updatedAt: new Date().toISOString() };
        });
        
        // Create a proper media layer so the asset actually renders on canvas
        if (targetSceneId) {
          const bgLayer = createDefaultLayer("media", 0);
          bgLayer.dataUrl = pending.dataUrl;
          bgLayer.name = pending.name || "Imported Asset";
          bgLayer.objectFit = "contain";
          bgLayer.zIndex = 0;
          bgLayer.scale = 100;
          setSceneLayers(prev => {
            const existing = prev[targetSceneId] || [];
            const shifted = existing.map(l => ({ ...l, zIndex: l.zIndex + 1 }));
            return { ...prev, [targetSceneId]: [bgLayer, ...shifted] };
          });
        }
        
        // Navigate to the imported scene so it's visible on canvas
        setSelectedSceneIdx(targetSceneIdx);
        setSelectedLayerId(null);
        // Delay playback start to ensure state is committed
        setTimeout(() => {
          setIsPlaying(true);
          setPreviewSceneIdx(targetSceneIdx);
        }, 100);
        toast.success(`🔥 "${pending.name}" sent to HOPs!`);
        return;
      }
      // Check if navigated from library with a HOP to open
      const libraryLoad = sessionStorage.getItem("hop-library-load");
      if (libraryLoad) {
        sessionStorage.removeItem("hop-library-load");
        const data = JSON.parse(libraryLoad);
        if (data.hop) setHop(data.hop);
        if (data.sceneLayers) setSceneLayers(data.sceneLayers);
        if (data.sceneTextStyles) setSceneTextStyles(data.sceneTextStyles);
        if (data.sceneKeyframes) setSceneKeyframes(data.sceneKeyframes);
        if (data.exportPreset) setExportPreset(data.exportPreset);
        if (data.audioClips) setAudioClips(data.audioClips);
        if (data.hopDisplayMode) setHopDisplayMode(data.hopDisplayMode);
        if (data.scrollSpeed) setScrollSpeed(data.scrollSpeed);
        if (data.scrollDirection) setScrollDirection(data.scrollDirection);
        if (data.seamlessStitch !== undefined) setSeamlessStitch(data.seamlessStitch);
        toast.success("HOP loaded from library! 🎬");
        return;
      }
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.hop) setHop(data.hop);
        if (data.sceneLayers) setSceneLayers(data.sceneLayers);
        if (data.sceneTextStyles) setSceneTextStyles(data.sceneTextStyles);
        if (data.exportPreset) setExportPreset(data.exportPreset);
        if (data.audioClips) setAudioClips(data.audioClips);
        if (data.hopDisplayMode) setHopDisplayMode(data.hopDisplayMode);
        if (data.scrollSpeed) setScrollSpeed(data.scrollSpeed);
        if (data.scrollDirection) setScrollDirection(data.scrollDirection);
        if (data.seamlessStitch !== undefined) setSeamlessStitch(data.seamlessStitch);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave every 30s with status indicator
  useEffect(() => {
    if (!hasContent) return;
    const interval = setInterval(() => {
      try {
        setSaveStatus("saving");
        const data = { hop, sceneLayers, sceneTextStyles, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch };
        localStorage.setItem(saveKey, JSON.stringify(data));
        setLastSaveTime(new Date());
        setTimeout(() => setSaveStatus("saved"), 500);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [hop, sceneLayers, sceneTextStyles, exportPreset, hasContent]);

  const selectedScene = hop.scenes[selectedSceneIdx] || null;
  const totalSceneDuration = hop.scenes.reduce((sum, s) => sum + s.duration, 0);
  const currentSceneLayers = selectedScene ? (sceneLayers[selectedScene.id] || []) : [];
  const selectedLayer = currentSceneLayers.find(l => l.id === selectedLayerId) || null;

  // Determine right panel context
  const rightContext: RightContext = useMemo(() => {
    if (selectedLayer) {
      if (selectedLayer.type === "text" || selectedLayer.type === "caption") return "text-layer";
      if (selectedLayer.type === "media") return "media-layer";
      if (selectedLayer.type === "effect") return "effect-layer";
      if (selectedLayer.type === "audio") return "audio";
    }
    if (selectedScene) return "scene";
    return "none";
  }, [selectedLayer, selectedScene]);

  const updateHop = useCallback((updates: Partial<HopProject>) => {
    setHop(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  }, []);

  const updateScene = useCallback((idx: number, updates: Partial<HopScene>) => {
    setHop(prev => {
      const scenes = [...prev.scenes];
      scenes[idx] = { ...scenes[idx], ...updates };
      return { ...prev, scenes, updatedAt: new Date().toISOString() };
    });
  }, []);

  /* ═══════════════════════════════════════════════════════════
     THE CORE: handleVibeDropped — ONE function for all imports
     ═══════════════════════════════════════════════════════════ */
  const handleVibeDropped = useCallback((dataUrl: string, name: string) => {
    const isFirstScene = hop.scenes.length === 1 && !hop.scenes[0].assetUrl && (sceneLayers[hop.scenes[0].id] || []).length === 0 && hop.scenes[0].assetType !== "text_card";

    const addBgLayer = (sceneId: string) => {
      const existing = sceneLayers[sceneId] || [];
      const bgLayer = createDefaultLayer("media", existing.length);
      bgLayer.dataUrl = dataUrl;
      bgLayer.name = name;
      bgLayer.objectFit = "contain";
      bgLayer.locked = false;
      bgLayer.zIndex = 0;
      bgLayer.scale = 100;
      // Push existing layers up one z-index
      const shifted = existing.map(l => ({ ...l, zIndex: l.zIndex + 1 }));
      setSceneLayers(prev => ({ ...prev, [sceneId]: [bgLayer, ...shifted] }));
      setSelectedLayerId(bgLayer.id);
    };

    if (isFirstScene) {
      const sceneId = hop.scenes[0].id;
      const isVideo = dataUrl.startsWith("data:video/");
      setHop(prev => ({
        ...prev,
        scenes: [{ ...prev.scenes[0], assetType: isVideo ? "video" : "image", assetUrl: dataUrl, caption: name }],
        updatedAt: new Date().toISOString(),
      }));
      addBgLayer(sceneId);
      setSelectedSceneIdx(0);
      setIsPlaying(true);
      setPreviewSceneIdx(0);
      toast.success("🔥 Vibe loaded — loop preview started!");
    } else if (selectedScene && !selectedScene.assetUrl && (sceneLayers[selectedScene.id] || []).length === 0) {
      // Fill current empty scene with a BG layer
      const isVideo = dataUrl.startsWith("data:video/");
      updateScene(selectedSceneIdx, { assetType: isVideo ? "video" : "image", assetUrl: dataUrl, caption: name });
      addBgLayer(selectedScene.id);
      toast.success(`"${name}" added to scene ${selectedSceneIdx + 1}`);
    } else {
      // Add as new scene with BG layer
      const scene = createDefaultHopScene(hop.scenes.length);
      scene.assetType = dataUrl.startsWith("data:video/") ? "video" : "image";
      scene.assetUrl = dataUrl;
      scene.caption = name;
      setHop(prev => ({ ...prev, scenes: [...prev.scenes, scene], updatedAt: new Date().toISOString() }));
      setSelectedSceneIdx(hop.scenes.length);
      // Add BG layer to the new scene
      const bgLayer = createDefaultLayer("media", 0);
      bgLayer.dataUrl = dataUrl;
      bgLayer.name = name;
      bgLayer.objectFit = "contain";
      bgLayer.locked = false;
      bgLayer.zIndex = 0;
      bgLayer.scale = 100;
      setSceneLayers(prev => ({ ...prev, [scene.id]: [bgLayer] }));
      setSelectedLayerId(bgLayer.id);
      toast.success(`"${name}" → new scene ${hop.scenes.length + 1}`);
    }
  }, [hop.scenes, selectedScene, selectedSceneIdx, sceneLayers, updateScene]);

  const addScene = useCallback(() => {
    setHop(prev => {
      const scene = createDefaultHopScene(prev.scenes.length);
      return { ...prev, scenes: [...prev.scenes, scene], updatedAt: new Date().toISOString() };
    });
    setSelectedSceneIdx(hop.scenes.length);
    setSelectedLayerId(null);
  }, [hop.scenes.length]);

  const removeScene = useCallback((idx: number) => {
    if (hop.scenes.length <= 1) { toast.error("Need at least one scene"); return; }
    setHop(prev => {
      const scenes = prev.scenes.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
      return { ...prev, scenes, updatedAt: new Date().toISOString() };
    });
    if (selectedSceneIdx >= hop.scenes.length - 1) setSelectedSceneIdx(Math.max(0, hop.scenes.length - 2));
    setSelectedLayerId(null);
  }, [hop.scenes.length, selectedSceneIdx]);

  const duplicateScene = useCallback((idx: number) => {
    setHop(prev => {
      const source = prev.scenes[idx];
      const clone: HopScene = { ...source, id: `scene-${Date.now()}-dup`, order: idx + 1 };
      const scenes = [...prev.scenes];
      scenes.splice(idx + 1, 0, clone);
      return { ...prev, scenes: scenes.map((s, i) => ({ ...s, order: i })), updatedAt: new Date().toISOString() };
    });
    // Copy layers too
    const sourceId = hop.scenes[idx]?.id;
    if (sourceId && sceneLayers[sourceId]) {
      const newId = `scene-${Date.now()}-dup`;
      setSceneLayers(prev => ({ ...prev, [newId]: prev[sourceId].map(l => ({ ...l, id: `layer-${Date.now()}-${Math.random()}` })) }));
    }
    setSelectedSceneIdx(idx + 1);
    toast.success("Scene duplicated");
  }, [hop.scenes, sceneLayers]);
  /* ─── Import as layer (not scene background) — used by IMPORT button ─── */
  const handleImportAsLayer = useCallback((dataUrl: string, name: string) => {
    const currentScene = hop.scenes[selectedSceneIdx] || hop.scenes[0];
    if (!currentScene) {
      handleVibeDropped(dataUrl, name);
      return;
    }
    // If scene has no layers at all, treat as first BG
    const layers = sceneLayers[currentScene.id] || [];
    if (layers.length === 0 && currentScene.assetType !== "text_card") {
      handleVibeDropped(dataUrl, name);
      return;
    }
    // Add as a transformable media layer
    const newLayer = createDefaultLayer("media", layers.length);
    newLayer.dataUrl = dataUrl;
    newLayer.name = name;
    newLayer.locked = false;
    newLayer.objectFit = "contain";
    setSceneLayers(prev => ({ ...prev, [currentScene.id]: [...(prev[currentScene.id] || []), newLayer] }));
    setSelectedLayerId(newLayer.id);
    toast.success(`🖼️ "${name}" added as layer — drag to position`);
  }, [hop.scenes, selectedSceneIdx, sceneLayers, handleVibeDropped]);

  /* ─── Layer management ─── */
  const addLayer = useCallback((type: HopLayer["type"]) => {
    if (!selectedScene) return;
    // Effect layers open the picker instead of adding an empty layer
    if (type === "effect") {
      setShowEffectPicker(true);
      return;
    }
    // Media layers open file picker immediately so the layer gets content
    if (type === "media") {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*,video/*,image/gif";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const layers = sceneLayers[selectedScene.id] || [];
          const newLayer = createDefaultLayer("media", layers.length);
          newLayer.dataUrl = reader.result as string;
          newLayer.name = file.name.replace(/\.[^.]+$/, "");
          newLayer.locked = false;
          newLayer.objectFit = "contain";
          setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...(prev[selectedScene.id] || []), newLayer] }));
          setSelectedLayerId(newLayer.id);
          toast.success(`🖼️ "${newLayer.name}" added as layer`);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    const layers = sceneLayers[selectedScene.id] || [];
    const newLayer = createDefaultLayer(type, layers.length);
    if (type === "text") newLayer.text = "Text";
    newLayer.locked = false;
    setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...layers, newLayer] }));
    setSelectedLayerId(newLayer.id);
    toast.success(`${type} layer added`);
  }, [selectedScene, sceneLayers]);

  const updateLayer = useCallback((id: string, updates: Partial<HopLayer>) => {
    if (!selectedScene) return;
    setSceneLayers(prev => ({
      ...prev,
      [selectedScene.id]: (prev[selectedScene.id] || []).map(l => l.id === id ? { ...l, ...updates } : l),
    }));
  }, [selectedScene]);

  const deleteLayer = useCallback((id: string) => {
    if (!selectedScene) return;
    setSceneLayers(prev => ({
      ...prev,
      [selectedScene.id]: (prev[selectedScene.id] || []).filter(l => l.id !== id),
    }));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [selectedScene, selectedLayerId]);

  const reorderLayers = useCallback((fromLayerId: string, toLayerId: string) => {
    if (!selectedScene) return;
    setSceneLayers(prev => {
      const layers = [...(prev[selectedScene.id] || [])];
      const fromLayer = layers.find(l => l.id === fromLayerId);
      const toLayer = layers.find(l => l.id === toLayerId);
      if (!fromLayer || !toLayer) return prev;
      const fromZ = fromLayer.zIndex;
      const toZ = toLayer.zIndex;
      return {
        ...prev,
        [selectedScene.id]: layers.map(l => {
          if (l.id === fromLayer.id) return { ...l, zIndex: toZ };
          if (l.id === toLayer.id) return { ...l, zIndex: fromZ };
          return l;
        }),
      };
    });
  }, [selectedScene]);

  // Add effect from picker
  const addEffectFromPicker = useCallback((dataUrl: string, name: string) => {
    if (!selectedScene) return;
    const layers = sceneLayers[selectedScene.id] || [];
    const newLayer = createDefaultLayer("effect", layers.length);
    newLayer.dataUrl = dataUrl;
    newLayer.name = name;
    newLayer.objectFit = "contain";
    newLayer.locked = false;
    setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...layers, newLayer] }));
    setSelectedLayerId(newLayer.id);
    toast.success(`✨ "${name}" effect added!`);
  }, [selectedScene, sceneLayers]);

  // Project management
  const getProjectData = useCallback(() => {
    return { hop, sceneLayers, sceneTextStyles, sceneKeyframes, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch };
  }, [hop, sceneLayers, sceneTextStyles, sceneKeyframes, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch]);

  const loadProjectData = useCallback((data: any, projectId: string) => {
    if (data.hop) setHop(data.hop);
    if (data.sceneLayers) setSceneLayers(data.sceneLayers);
    if (data.sceneTextStyles) setSceneTextStyles(data.sceneTextStyles);
    if (data.sceneKeyframes) setSceneKeyframes(data.sceneKeyframes);
    if (data.exportPreset) setExportPreset(data.exportPreset);
    if (data.audioClips) setAudioClips(data.audioClips);
    setCloudProjectId(projectId);
    setSelectedSceneIdx(0);
    setSelectedLayerId(null);
  }, []);

  const newProject = useCallback(() => {
    setHop(createDefaultHopProject());
    setSceneLayers({});
    setSceneTextStyles({});
    setSceneKeyframes({});
    setCloudProjectId(null);
    setSelectedSceneIdx(0);
    setSelectedLayerId(null);
    setExportPreset("tiktok");
    setLastSaveTime(null);
    setAudioClips([]);
    toast.success("New project started! 🎬");
  }, []);



  // Apply a one-tap Vibe Mode to the current scene
  const applyVibeMode = useCallback((vibeId: string) => {
    if (!selectedScene) { toast.error("Select a scene first"); return; }
    const vibe = VIBE_MODES.find(v => v.id === vibeId);
    if (!vibe) return;

    // Create a canvas gradient for the vibe effect
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, vibe.gradient[0]);
    grad.addColorStop(1, vibe.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    const dataUrl = canvas.toDataURL("image/png");

    // Remove any existing vibe layers, add the new one
    const layers = (sceneLayers[selectedScene.id] || []).filter(l => !l.name.startsWith("VIBE:"));
    const vibeLayer = createDefaultLayer("effect", layers.length);
    vibeLayer.dataUrl = dataUrl;
    vibeLayer.name = `VIBE: ${vibe.label}`;
    vibeLayer.blendMode = vibe.blendMode;
    vibeLayer.opacity = 0.8;
    vibeLayer.objectFit = "contain";
    setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...layers, vibeLayer] }));
    setSelectedLayerId(vibeLayer.id);
    toast.success(`${vibe.emoji} ${vibe.label} vibe applied!`);
  }, [selectedScene, sceneLayers]);

  // Apply vibe to ALL scenes at once
  const applyVibeToAll = useCallback((vibeId: string) => {
    const vibe = VIBE_MODES.find(v => v.id === vibeId);
    if (!vibe) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, vibe.gradient[0]);
    grad.addColorStop(1, vibe.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    const dataUrl = canvas.toDataURL("image/png");

    setSceneLayers(prev => {
      const next = { ...prev };
      for (const scene of hop.scenes) {
        const layers = (next[scene.id] || []).filter(l => !l.name.startsWith("VIBE:"));
        const vibeLayer = createDefaultLayer("effect", layers.length);
        vibeLayer.dataUrl = dataUrl;
        vibeLayer.name = `VIBE: ${vibe.label}`;
        vibeLayer.blendMode = vibe.blendMode;
        vibeLayer.opacity = 0.8;
        vibeLayer.objectFit = "contain";
        next[scene.id] = [...layers, vibeLayer];
      }
      return next;
    });
    toast.success(`${vibe.emoji} ${vibe.label} applied to ALL ${hop.scenes.length} scenes!`);
  }, [hop.scenes]);

  const duplicateLayer = useCallback((id: string) => {
    if (!selectedScene) return;
    const layers = sceneLayers[selectedScene.id] || [];
    const source = layers.find(l => l.id === id);
    if (!source) return;
    const clone: HopLayer = { ...source, id: `layer-${Date.now()}-dup`, name: `${source.name} copy`, zIndex: layers.length };
    setSceneLayers(prev => ({ ...prev, [selectedScene.id]: [...(prev[selectedScene.id] || []), clone] }));
    setSelectedLayerId(clone.id);
    toast.success("Layer duplicated");
  }, [selectedScene, sceneLayers]);

  /* ─── Keyframe management ─── */
  const currentSceneKeyframes = useMemo(() => {
    if (!selectedScene) return {};
    return sceneKeyframes[selectedScene.id] || {};
  }, [selectedScene, sceneKeyframes]);

  const addKeyframe = useCallback((layerId: string, property: string, time: number, value: number) => {
    if (!selectedScene) return;
    const sceneId = selectedScene.id;
    setSceneKeyframes(prev => {
      const sceneKfs = { ...(prev[sceneId] || {}) };
      const layerKfs = [...(sceneKfs[layerId] || [])];
      // Replace if exists at same time+property
      const existingIdx = layerKfs.findIndex(k => k.property === property && Math.abs(k.time - time) < 0.01);
      const kf: HopKeyframe = { id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time, property, value, easing: "ease-in-out" };
      if (existingIdx >= 0) layerKfs[existingIdx] = kf;
      else layerKfs.push(kf);
      layerKfs.sort((a, b) => a.time - b.time);
      sceneKfs[layerId] = layerKfs;
      return { ...prev, [sceneId]: sceneKfs };
    });
  }, [selectedScene]);

  const deleteKeyframe = useCallback((kfId: string) => {
    if (!selectedScene) return;
    const sceneId = selectedScene.id;
    setSceneKeyframes(prev => {
      const sceneKfs = { ...(prev[sceneId] || {}) };
      for (const layerId of Object.keys(sceneKfs)) {
        sceneKfs[layerId] = sceneKfs[layerId].filter(k => k.id !== kfId);
      }
      return { ...prev, [sceneId]: sceneKfs };
    });
  }, [selectedScene]);

  const setKeyframeEasing = useCallback((kfId: string, easing: HopEasing) => {
    if (!selectedScene) return;
    const sceneId = selectedScene.id;
    setSceneKeyframes(prev => {
      const sceneKfs = { ...(prev[sceneId] || {}) };
      for (const layerId of Object.keys(sceneKfs)) {
        sceneKfs[layerId] = sceneKfs[layerId].map(k => k.id === kfId ? { ...k, easing } : k);
      }
      return { ...prev, [sceneId]: sceneKfs };
    });
  }, [selectedScene]);

  /* ─── File upload ─── */
  const handleFileUpload = useCallback((accept: string) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handleVibeDropped(reader.result as string, file.name.replace(/\.[^.]+$/, ""));
      reader.readAsDataURL(file);
    };
    input.click();
  }, [handleVibeDropped]);

  const handleAudioUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "audio/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateHop({ audioTrack: reader.result as string });
        // Generate waveform
        generateWaveform(reader.result as string);
        toast.success("🎵 Audio loop attached — your HOP has a heartbeat!");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [updateHop]);

  // Waveform generator
  const generateWaveform = useCallback(async (audioDataUrl: string) => {
    try {
      const audioContext = new AudioContext();
      const response = await fetch(audioDataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const samples = 100;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }
      const max = Math.max(...waveform);
      setAudioWaveform(waveform.map(v => v / max));
      audioContext.close();
    } catch {
      setAudioWaveform([]);
    }
  }, []);

  // Generate waveform when audio track exists on mount
  useEffect(() => {
    if (hop.audioTrack && audioWaveform.length === 0) {
      generateWaveform(hop.audioTrack);
    }
  }, [hop.audioTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Global drag & drop ─── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = () => handleVibeDropped(reader.result as string, file.name.replace(/\.[^.]+$/, ""));
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("audio/")) {
        const reader = new FileReader();
        reader.onload = () => {
          updateHop({ audioTrack: reader.result as string });
          generateWaveform(reader.result as string);
          toast.success("🎵 Audio dropped!");
        };
        reader.readAsDataURL(file);
      }
    }
  }, [handleVibeDropped, updateHop, generateWaveform]);

  /* ─── Gapless audio helpers ─── */
  const startGaplessAudio = useCallback(async () => {
    if (!hop.audioTrack) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      // Decode buffer if not cached or source changed
      if (!audioBufferRef.current) {
        const resp = await fetch(hop.audioTrack);
        const arr = await resp.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(arr);
      }
      // Stop any existing source
      try { audioSourceRef.current?.stop(); } catch {}
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true; // Web Audio API loop is gapless
      if (!audioGainRef.current) {
        audioGainRef.current = ctx.createGain();
        audioGainRef.current.connect(ctx.destination);
      }
      audioGainRef.current.gain.value = hop.previewSettings.mutedByDefault ? 0 : 1;
      source.connect(audioGainRef.current);
      source.start(0);
      audioSourceRef.current = source;
    } catch (err) {
      // Fallback to HTML audio
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
    }
  }, [hop.audioTrack, hop.previewSettings.mutedByDefault]);

  const stopGaplessAudio = useCallback(() => {
    try { audioSourceRef.current?.stop(); } catch {}
    audioSourceRef.current = null;
    if (audioRef.current) audioRef.current.pause();
  }, []);

  // Invalidate cached buffer when audio track changes
  useEffect(() => { audioBufferRef.current = null; }, [hop.audioTrack]);

  // Sync mute state
  useEffect(() => {
    if (audioGainRef.current) audioGainRef.current.gain.value = hop.previewSettings.mutedByDefault ? 0 : 1;
    if (audioRef.current) audioRef.current.muted = hop.previewSettings.mutedByDefault;
  }, [hop.previewSettings.mutedByDefault]);

  /* ─── Playback ─── */
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
      setIsPlaying(false);
      canvasRef.current?.querySelectorAll<HTMLVideoElement>('video[data-hop-video="true"]').forEach(v => v.pause());
      stopGaplessAudio();
    } else {
      if (!hop.scenes.length) return;
      setIsPlaying(true);
      setPreviewSceneIdx(selectedSceneIdx);
      startGaplessAudio();
    }
  }, [isPlaying, hop.scenes.length, selectedSceneIdx, startGaplessAudio, stopGaplessAudio]);

  // Standard mode scene-cycling playback (skip when screensaver scroll is active)
  useEffect(() => {
    if (!isPlaying || hop.scenes.length <= 1 || (hopDisplayMode === "moving" && movingPlaybackMode === "screensaver")) return;
    const scene = hop.scenes[previewSceneIdx] ?? hop.scenes[0];
    const durationMs = Math.max(1, scene?.duration ?? 5) * 1000;
    const nextScene = hop.scenes[(previewSceneIdx + 1) % hop.scenes.length];
    const transition = nextScene?.transition || "cut";
    if (playTimerRef.current) clearTimeout(playTimerRef.current);

    const transitionDuration = 500;
    const transitionTimer = setTimeout(() => {
      if (transition === "fade") setTransitionClass("hop-transition-fade");
      else if (transition === "zoom") setTransitionClass("hop-transition-zoom");
      else if (transition === "glitch") setTransitionClass("hop-transition-glitch");
      else if (transition === "wipe-left") setTransitionClass("hop-transition-wipe-left");
      else if (transition === "wipe-right") setTransitionClass("hop-transition-wipe-right");
      else if (transition === "wipe-up") setTransitionClass("hop-transition-wipe-up");
      else if (transition === "wipe-down") setTransitionClass("hop-transition-wipe-down");
      else if (transition === "iris") setTransitionClass("hop-transition-iris");
      else if (transition === "slide-left") setTransitionClass("hop-transition-slide-left");
      else if (transition === "slide-right") setTransitionClass("hop-transition-slide-right");
      else if (transition === "blur-through") setTransitionClass("hop-transition-blur-through");
    }, Math.max(0, durationMs - transitionDuration));

    playTimerRef.current = setTimeout(() => {
      setTransitionClass("");
      setPreviewSceneIdx((prev) => {
        const next = (prev + 1) % hop.scenes.length;
        if (next === 0) setLoopCount(c => c + 1);
        return next;
      });
      setTimeout(() => setTransitionClass(""), 50);
    }, durationMs);
    return () => {
      if (playTimerRef.current) { clearTimeout(playTimerRef.current); playTimerRef.current = null; }
      clearTimeout(transitionTimer);
    };
  }, [isPlaying, previewSceneIdx, hop.scenes, hopDisplayMode]);

  useEffect(() => () => { if (playTimerRef.current) clearTimeout(playTimerRef.current); }, []);

  // Camera Ken Burns progress animation
  useEffect(() => {
    if (!isPlaying) {
      setCameraProgress(0);
      if (cameraAnimRef.current) { cancelAnimationFrame(cameraAnimRef.current); cameraAnimRef.current = null; }
      return;
    }
    sceneStartTimeRef.current = performance.now();
    const scene = hop.scenes[previewSceneIdx];
    if (!scene) return;
    const durationMs = Math.max(1, scene.duration) * 1000;
    
    const animate = (now: number) => {
      const elapsed = now - sceneStartTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      setCameraProgress(progress);
      if (progress < 1) cameraAnimRef.current = requestAnimationFrame(animate);
    };
    cameraAnimRef.current = requestAnimationFrame(animate);
    return () => { if (cameraAnimRef.current) { cancelAnimationFrame(cameraAnimRef.current); cameraAnimRef.current = null; } };
  }, [isPlaying, previewSceneIdx, hop.scenes]);

  // mute effect handled by the gapless audio sync above

  useEffect(() => {
    const activeIdx = isPlaying ? previewSceneIdx : selectedSceneIdx;
    const scene = hop.scenes[activeIdx];
    if (!scene) return;
    const sceneHasVideo = scene.assetType === "video" || isVideoSource(scene.assetUrl);
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (!el) return;
      if (id === scene.id && sceneHasVideo) { if (isPlaying) el.currentTime = 0; el.play().catch(() => {}); } else { el.pause(); }
    });
  }, [isPlaying, previewSceneIdx, selectedSceneIdx, hop.scenes]);

  useEffect(() => {
    if (zoneOutMode && !isPlaying) {
      setIsPlaying(true);
      setPreviewSceneIdx(0);
      setLoopCount(0);
      setWatchSeconds(0);
      startGaplessAudio();
    }
  }, [zoneOutMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch time counter — ticks every second while Zone Out is active
  useEffect(() => {
    if (zoneOutMode && isPlaying) {
      watchStartRef.current = Date.now();
      watchTimerRef.current = setInterval(() => {
        if (watchStartRef.current) {
          setWatchSeconds(Math.floor((Date.now() - watchStartRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (watchTimerRef.current) { clearInterval(watchTimerRef.current); watchTimerRef.current = null; }
      watchStartRef.current = null;
    }
    return () => { if (watchTimerRef.current) { clearInterval(watchTimerRef.current); watchTimerRef.current = null; } };
  }, [zoneOutMode, isPlaying]);

  /* ─── Moving HOP scroll animation — smooth continuous pan (screensaver mode only) ─── */
  useEffect(() => {
    if (hopDisplayMode !== "moving" || movingPlaybackMode !== "screensaver" || !isPlaying || !movingContainerRef.current) {
      if (movingAnimRef.current) { cancelAnimationFrame(movingAnimRef.current); movingAnimRef.current = null; }
      return;
    }
    const container = movingContainerRef.current;
    const parentEl = container.parentElement;
    if (!parentEl) return;
    // Calculate total scrollable width (all real scenes, not loop copies)
    const pxPerSec = 120;
    const totalStripWidth = hop.scenes.reduce((sum, s) => sum + Math.max(80, s.duration * pxPerSec), 0);
    const viewWidth = parentEl.clientWidth;
    const maxScroll = Math.max(0, totalStripWidth - viewWidth);

    let lastTime = performance.now();
    let frameCount = 0;
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const dir = scrollDirection === "right" ? 1 : -1;
      movingOffsetRef.current += scrollSpeed * dt * dir;
      if (movingOffsetRef.current > totalStripWidth) movingOffsetRef.current = 0;
      if (movingOffsetRef.current < 0) movingOffsetRef.current = totalStripWidth;
      container.style.transform = `translateX(-${movingOffsetRef.current}px)`;
      // Update parallax offset every 3 frames to avoid excessive re-renders
      frameCount++;
      if (frameCount % 3 === 0) setParallaxOffset(movingOffsetRef.current);
      movingAnimRef.current = requestAnimationFrame(animate);
    };
    movingAnimRef.current = requestAnimationFrame(animate);
    return () => { if (movingAnimRef.current) { cancelAnimationFrame(movingAnimRef.current); movingAnimRef.current = null; } };
  }, [hopDisplayMode, movingPlaybackMode, isPlaying, scrollSpeed, scrollDirection, hop.scenes]);

  /* ─── Zone Out scroll animation for moving screensaver mode ─── */
  useEffect(() => {
    if (!zoneOutMode || hopDisplayMode !== "moving" || movingPlaybackMode !== "screensaver" || !zoneOutMovingRef.current) {
      if (zoneOutAnimRef.current) { cancelAnimationFrame(zoneOutAnimRef.current); zoneOutAnimRef.current = null; }
      return;
    }
    const container = zoneOutMovingRef.current;
    const pxPerSec = 120;
    const totalStripWidth = hop.scenes.reduce((sum, s) => sum + Math.max(80, s.duration * pxPerSec), 0);
    const canvasH = VIEWPORT_SIZES[viewportMode].h;
    const screenScale = window.innerHeight / canvasH;

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const dir = scrollDirection === "right" ? 1 : -1;
      zoneOutOffsetRef.current += scrollSpeed * dt * dir;
      if (zoneOutOffsetRef.current > totalStripWidth) zoneOutOffsetRef.current = 0;
      if (zoneOutOffsetRef.current < 0) zoneOutOffsetRef.current = totalStripWidth;
      container.style.transform = `scale(${screenScale}) translateX(-${zoneOutOffsetRef.current}px)`;
      zoneOutAnimRef.current = requestAnimationFrame(animate);
    };
    zoneOutAnimRef.current = requestAnimationFrame(animate);
    return () => { if (zoneOutAnimRef.current) { cancelAnimationFrame(zoneOutAnimRef.current); zoneOutAnimRef.current = null; } };
  }, [zoneOutMode, hopDisplayMode, movingPlaybackMode, scrollSpeed, scrollDirection, hop.scenes, viewportMode]);

  useEffect(() => {
    if (!isPlaying && movingContainerRef.current) {
      movingOffsetRef.current = 0;
      movingContainerRef.current.style.transform = "translateX(0)";
    }
  }, [isPlaying]);

  const getDataUrl = useCallback(async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    try {
      return await toPng(canvasRef.current, { pixelRatio: 2, filter: (node) => !(node as HTMLElement)?.dataset?.exportHide });
    } catch { toast.error("Export failed"); return null; }
  }, []);

  /* ─── Save full HOP to library (project data + thumbnail) ─── */
  const saveHopToLibrary = useCallback(async () => {
    try {
      const thumbUrl = await getDataUrl();
      const DB_NAME = "press-start-asset-library";
      const STORE_NAME = "assets";
      const DB_VERSION = 1;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(STORE_NAME)) {
            const store = d.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("category", "category", { unique: false });
            store.createIndex("createdAt", "createdAt", { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const projectData = { hop, sceneLayers, sceneTextStyles, sceneKeyframes, exportPreset, audioClips, hopDisplayMode, scrollSpeed, scrollDirection, seamlessStitch };
      const asset = {
        id: `hop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: hop.title || "Untitled HOP",
        category: "hop",
        dataUrl: thumbUrl || "",
        createdAt: Date.now(),
        tags: ["hop", "project", ...hop.tags],
        syncedToCloud: false,
        metadata: { type: "hop-project", projectData },
      };
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(asset);
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      toast.success(`Saved "${hop.title}" to library! 📚`);
    } catch {
      toast.error("Failed to save HOP to library");
    }
  }, [getDataUrl, hop, sceneLayers, sceneTextStyles, sceneKeyframes, exportPreset, audioClips]);

  /* ─── Export to CoMiXX ─── */
  const exportToCoMiXX = useCallback(async () => {
    const preset = EXPORT_PRESETS.find(p => p.id === exportPreset);
    await syncToCoMiXX({
      name: hop.title || "HOP Export",
      getDataUrl,
      type: "hop-project",
      asset_tag: "hop-loop",
      mode_hints: {
        comic: { sceneCount: hop.scenes.length, totalDuration: totalSceneDuration, loopMode: hop.loopMode },
        vn: { type: hop.type, episodeNumber: hop.episodeNumber },
      },
    });
  }, [syncToCoMiXX, hop, getDataUrl, exportPreset, totalSceneDuration]);

  /* ─── GIF export (frame-by-frame through scenes) ─── */
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  const exportAsGif = useCallback(async () => {
    if (!canvasRef.current || isExportingGif) return;
    setIsExportingGif(true);
    // Force standard mode for export
    const prevMode = hopDisplayMode;
    setHopDisplayMode("standard");
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
      const gif = GIFEncoder();
      const preset = EXPORT_PRESETS.find(p => p.id === exportPreset);
      const ew = preset && exportPreset !== "custom" ? preset.width : customW;
      const eh = preset && exportPreset !== "custom" ? preset.height : customH;
      const w = 480, h = Math.round(480 / (ew / eh));
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w; tempCanvas.height = h;
      const ctx = tempCanvas.getContext("2d")!;

      const framesPerScene = 4;

      for (let si = 0; si < Math.min(hop.scenes.length, 20); si++) {
        setSelectedSceneIdx(si);
        setPreviewSceneIdx(si);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise(r => setTimeout(r, 150));
        const dataUrl = await toPng(canvasRef.current!, { pixelRatio: 1, filter: (node) => !(node as HTMLElement)?.dataset?.exportHide });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = dataUrl;
        });
        for (let f = 0; f < framesPerScene; f++) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, w, h);
          // Draw image fitted using object-cover logic
          const imgRatio = img.width / img.height;
          const canvasRatio = w / h;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgRatio > canvasRatio) {
            sw = img.height * canvasRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / canvasRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const palette = quantize(imageData.data, 256, { format: "rgba4444", oneBitAlpha: true }) as number[][];
          const index = applyPalette(imageData.data, palette, "rgba4444") as Uint8Array;
          gif.writeFrame(index, w, h, { palette, delay: Math.round((hop.scenes[si]?.duration || 5) * 1000 / framesPerScene), transparent: true, dispose: 2 });
        }
      }
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${hop.title || "hop"}.gif`; a.click();
      URL.revokeObjectURL(url);
      toast.success("GIF exported! 🎬");
    } catch (err: any) {
      toast.error("GIF export failed: " + err.message);
    } finally {
      setHopDisplayMode(prevMode);
      setIsExportingGif(false);
    }
  }, [canvasRef, hop, exportPreset, customW, customH, isExportingGif, hopDisplayMode]);

  /* ─── MP4/WebM export — full scene-by-scene video capture ─── */
  const exportAsVideo = useCallback(async () => {
    if (!canvasRef.current || isExportingVideo) return;
    setIsExportingVideo(true);
    // Force standard mode for export
    const prevMode = hopDisplayMode;
    setHopDisplayMode("standard");
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const preset = EXPORT_PRESETS.find(p => p.id === exportPreset);
      const ew = preset && exportPreset !== "custom" ? preset.width : customW;
      const eh = preset && exportPreset !== "custom" ? preset.height : customH;
      // Cap render size for performance
      const maxDim = 1080;
      const ratio = ew / eh;
      const renderW = ew > eh ? Math.min(ew, maxDim) : Math.round(Math.min(eh, maxDim) * ratio);
      const renderH = ew > eh ? Math.round(Math.min(ew, maxDim) / ratio) : Math.min(eh, maxDim);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = renderW; tempCanvas.height = renderH;
      const ctx = tempCanvas.getContext("2d")!;

      const stream = tempCanvas.captureStream(0);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9" : "video/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const done = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });
      mediaRecorder.start();

      const fps = 24;
      const frameDuration = 1000 / fps;

      for (let si = 0; si < hop.scenes.length; si++) {
        setSelectedSceneIdx(si);
        setPreviewSceneIdx(si);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        // Wait for DOM to settle
        await new Promise(r => setTimeout(r, 150));
        const dataUrl = await toPng(canvasRef.current!, {
          pixelRatio: 1,
          width: canvasRef.current!.offsetWidth,
          height: canvasRef.current!.offsetHeight,
          filter: (node) => !(node as HTMLElement)?.dataset?.exportHide,
        });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = dataUrl;
        });
        const sceneDuration = (hop.scenes[si]?.duration || 5) * 1000;
        const frameCount = Math.max(1, Math.round(sceneDuration / frameDuration));

        for (let f = 0; f < frameCount; f++) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, renderW, renderH);
          // Draw image using object-cover logic for 1:1 fill
          const imgRatio = img.width / img.height;
          const canvasRatio = renderW / renderH;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgRatio > canvasRatio) {
            sw = img.height * canvasRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / canvasRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, renderW, renderH);
          (stream.getVideoTracks()[0] as any).requestFrame?.();
          await new Promise(r => setTimeout(r, frameDuration));
        }
        toast.info(`Scene ${si + 1}/${hop.scenes.length} captured`);
      }

      mediaRecorder.stop();
      const blob = await done;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hop.title || "hop"}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Video exported! 🎥");
    } catch (err: any) {
      toast.error("Video export failed: " + err.message);
    } finally {
      setHopDisplayMode(prevMode);
      setIsExportingVideo(false);
    }
  }, [canvasRef, hop, exportPreset, customW, customH, isExportingVideo, hopDisplayMode]);

  /* ─── Load HOP from library ─── */
  const loadHopFromLibrary = useCallback((projectData: any) => {
    if (projectData.hop) setHop(projectData.hop);
    if (projectData.sceneLayers) setSceneLayers(projectData.sceneLayers);
    if (projectData.sceneTextStyles) setSceneTextStyles(projectData.sceneTextStyles);
    if (projectData.sceneKeyframes) setSceneKeyframes(projectData.sceneKeyframes);
    if (projectData.exportPreset) setExportPreset(projectData.exportPreset);
    if (projectData.audioClips) setAudioClips(projectData.audioClips);
    if (projectData.hopDisplayMode) setHopDisplayMode(projectData.hopDisplayMode);
    if (projectData.scrollSpeed) setScrollSpeed(projectData.scrollSpeed);
    if (projectData.scrollDirection) setScrollDirection(projectData.scrollDirection);
    if (projectData.seamlessStitch !== undefined) setSeamlessStitch(projectData.seamlessStitch);
    setSelectedSceneIdx(0);
    setSelectedLayerId(null);
    toast.success("HOP loaded from library! 🎬");
  }, []);

  const handlePublish = useCallback(async () => {
    if (!isLoggedIn || !email) { toast.error("Connect your Press Start account to publish"); return; }
    if (hop.scenes.every(s => !s.assetUrl && s.assetType !== "text_card")) { toast.error("Add at least one scene with content"); return; }
    setIsPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const preset = EXPORT_PRESETS.find(p => p.id === exportPreset);
      const hopPayload = {
        contentType: "hop",
        title: hop.title, description: hop.description,
        creatorEmail: email, creatorId: user?.id || "",
        thumbnail: hop.coverImage || hop.scenes.find(s => s.assetUrl)?.assetUrl || null,
        exportSize: preset ? { width: preset.width, height: preset.height, preset: preset.id } : { width: customW, height: customH, preset: "custom" },
        metadata: {
          type: hop.type, loopMode: hop.loopMode, clipLengthMode: hop.clipLengthMode,
          totalDuration: totalSceneDuration, sceneCount: hop.scenes.length,
          bpm: hop.audioBpm, tags: hop.tags, previewSettings: hop.previewSettings,
        },
        scenes: hop.scenes.map(s => ({
          id: s.id, order: s.order, assetType: s.assetType, assetUrl: s.assetUrl,
          textOverlay: s.textOverlay, caption: s.caption, duration: s.duration,
          transition: s.transition, loopInScene: s.loopInScene, effects: s.effects,
          layers: sceneLayers[s.id] || [],
        })),
        audioTrack: hop.audioTrack,
        seriesId: hop.seriesId, seriesTitle: hop.seriesTitle, episodeNumber: hop.episodeNumber,
        visibility: hop.visibility,
      };
      const { error } = await supabase.functions.invoke("publish-hop", { body: hopPayload });
      if (error) throw error;
      updateHop({ syncStatus: "queued" });
      toast.success("HOP published to Streaming! 🚀");
      if (user) {
        await supabase.functions.invoke("xp-action", { body: { email, action: "publish" } });
      }
    } catch (err: any) {
      console.error("Publish failed:", err);
      updateHop({ syncStatus: "failed" });
      toast.error("Publish failed: " + (err.message || "Unknown error"));
    } finally { setIsPublishing(false); }
  }, [hop, email, isLoggedIn, updateHop, totalSceneDuration, exportPreset, customW, customH, sceneLayers]);

  const displayScene = isPlaying ? hop.scenes[previewSceneIdx] : selectedScene;
  const displayLayers = displayScene ? (sceneLayers[displayScene.id] || []) : [];

  const preset = EXPORT_PRESETS.find(p => p.id === exportPreset);
  const exportW = preset && exportPreset !== "custom" ? preset.width : customW;
  const exportH = preset && exportPreset !== "custom" ? preset.height : customH;
  const canvasAspect = exportW / exportH;

  // Beat snap helper
  const snapToBeat = useCallback(() => {
    if (!hop.audioBpm || hop.audioBpm <= 0) { toast.error("Set BPM first"); return; }
    const beatDuration = 60 / hop.audioBpm;
    const minBars = 2;
    setHop(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => {
        const bars = Math.max(minBars, Math.round(s.duration / beatDuration));
        return { ...s, duration: parseFloat((bars * beatDuration).toFixed(2)) };
      }),
      updatedAt: new Date().toISOString(),
    }));
    toast.success(`⚡ Scenes snapped to ${hop.audioBpm} BPM`);
  }, [hop.audioBpm]);

  /* ═══════════════════════════════════════════════════════════
     ZONE OUT MODE
     ═══════════════════════════════════════════════════════════ */
      if (zoneOutMode) {
    const isMovingScreensaver = hopDisplayMode === "moving" && movingPlaybackMode === "screensaver";
    const pxPerSec = 120;
    const canvasH = VIEWPORT_SIZES[viewportMode].h;
    const screenScale = window.innerHeight / canvasH;

    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onDoubleClick={() => { setZoneOutMode(false); setIsPlaying(false); stopGaplessAudio(); zoneOutOffsetRef.current = 0; }}>
        {hop.audioTrack && (
          <audio ref={audioRef} src={hop.audioTrack} loop preload="auto" muted={hop.previewSettings.mutedByDefault} style={{ display: "none" }} />
        )}
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">

          {isMovingScreensaver ? (
            /* ── Screensaver scroll: panoramic strip fills screen height, scrolls horizontally ── */
            <div className="w-full h-full overflow-hidden flex items-center" style={{ position: "relative" }}>
              <div ref={zoneOutMovingRef} className="flex" style={{
                height: canvasH,
                width: "max-content",
                willChange: "transform",
                transformOrigin: "left center",
              }}>
                {/* Render all scenes side-by-side, duplicated for seamless loop */}
                {[...hop.scenes, ...hop.scenes].map((scene, si) => {
                  const sceneW = Math.max(80, scene.duration * pxPerSec);
                  const sceneLayersArr = sceneLayers[scene.id] || [];
                  return (
                    <div key={`zo-${si}`} className="relative shrink-0 overflow-hidden" style={{ width: sceneW, height: canvasH }}>
                      {scene.assetType === "text_card" ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                          <p className="font-pressstart text-2xl text-white leading-relaxed">{scene.textOverlay || "..."}</p>
                        </div>
                      ) : sceneLayersArr.length === 0 ? (
                        <div className="absolute inset-0 bg-black" />
                      ) : null}
                      {/* All layers — backgrounds are now proper layers */}
                      {sceneLayersArr.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                        return (
                        <div key={layer.id} style={{
                          ...getHopLayerShellStyle(scene, layer),
                          opacity: layer.opacity,
                          mixBlendMode: (layer.blendMode || "normal") as any,
                          zIndex: layer.zIndex + 1,
                          pointerEvents: "none",
                          filter: [
                            (layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"})` : "",
                            getMotionBlurFilter(layer),
                          ].filter(Boolean).join(" ") || undefined,
                        }}>
                          {renderHopLayerContent(scene, layer, sceneW, canvasH)}
                        </div>
                        );
                      })}
                      {/* Text overlay */}
                      {scene.textOverlay && scene.assetType !== "text_card" && (() => {
                        const style = sceneTextStyles[scene.id] || DEFAULT_TEXT_STYLE;
                        const posClass = style.position === "top" ? "top-4" : style.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-14";
                        return (
                          <div className={cn("absolute inset-x-0 px-4 z-25 flex flex-col items-center", posClass)}>
                            <span style={{
                              fontFamily: style.fontFamily, fontSize: `${style.fontSize}px`, color: style.color,
                              fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? "italic" : "normal",
                              WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
                              backgroundColor: style.bgOpacity > 0 ? `${style.bgColor}${Math.round(style.bgOpacity * 2.55).toString(16).padStart(2, "0")}` : undefined,
                              padding: style.bgOpacity > 0 ? "4px 10px" : undefined, borderRadius: style.bgOpacity > 0 ? "6px" : undefined,
                            }}>{scene.textOverlay}</span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Standard scene-cycling zone out ── */
            (() => {
              const canvasW = VIEWPORT_SIZES[viewportMode].w;
              return (
                <div className="relative overflow-hidden" style={{
                  width: canvasW,
                  height: canvasH,
                  transform: `scale(${Math.min(window.innerWidth / canvasW, window.innerHeight / canvasH)})`,
                  transformOrigin: "center center",
                }}>
            {displayScene && (
              <>
                {/* Scene background — layers contain the background, only show text_card fallback if no layers */}
                {displayLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {displayScene.assetType === "text_card" ? (
                      <div className="p-8 text-center">
                        <p className="font-pressstart text-2xl text-white leading-relaxed">{displayScene.textOverlay || "..."}</p>
                      </div>
                    ) : <div className="absolute inset-0 bg-black" />}
                  </div>
                )}
                {/* All layers rendered by z-index */}
                {[...displayLayers].sort((a, b) => a.zIndex - b.zIndex).filter(l => l.visible).map(layer => {
                  return (
                  <div key={layer.id} style={{
                    ...getHopLayerShellStyle(displayScene, layer),
                    opacity: layer.opacity,
                    mixBlendMode: layer.blendMode || "normal" as any,
                    filter: [
                      (layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"})` : "",
                      getMotionBlurFilter(layer),
                    ].filter(Boolean).join(" ") || undefined,
                    zIndex: layer.zIndex + 1,
                    pointerEvents: "none",
                    ...getBeatReactStyle(layer, hop.audioBpm, isPlaying),
                  }}>
                    {renderHopLayerContent(displayScene, layer, canvasW, canvasH, { dataHopVideo: true, animKey: `zo-${previewSceneIdx}-${loopCount}` })}
                  </div>
                  );
                })}
                {displayScene.caption && (
                  <div className="absolute bottom-16 inset-x-0 px-8 z-30 text-center">
                    <span className="font-pressstart text-sm text-white bg-black/50 px-6 py-3 rounded-xl">{displayScene.caption}</span>
                  </div>
                )}
              </>
            )}
                </div>
              );
            })()
          )}

          {/* Always-visible exit bar at top */}
          <div className="absolute top-0 inset-x-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="w-3.5 h-3.5 text-primary" />
              <span className="font-pressstart text-[10px] text-primary">{loopCount} LOOPS</span>
              {!isMovingScreensaver && (
                <span className="font-pressstart text-[10px] text-white/50">Scene {previewSceneIdx + 1}/{hop.scenes.length}</span>
              )}
              {isMovingScreensaver && (
                <span className="font-pressstart text-[10px] text-white/50">SCREENSAVER</span>
              )}
            </div>
            {/* Viral metrics — center */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="font-pressstart text-[14px] text-white tabular-nums">
                  {Math.floor(watchSeconds / 60)}:{(watchSeconds % 60).toString().padStart(2, "0")}
                </span>
                <span className="font-pressstart text-[6px] text-white/30 mt-0.5">WATCH TIME</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className={cn(
                  "font-pressstart text-[14px] tabular-nums",
                  loopCount >= 10 ? "text-primary animate-pulse" : loopCount >= 5 ? "text-primary" : "text-white/70"
                )}>
                  {loopCount >= 10 ? "🔥" : loopCount >= 5 ? "⚡" : "👀"} {loopCount}
                </span>
                <span className="font-pressstart text-[6px] text-white/30 mt-0.5">
                  {loopCount >= 10 ? "HOOKED" : loopCount >= 5 ? "LOCKED IN" : "FALL-IN"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateHop({ previewSettings: { ...hop.previewSettings, mutedByDefault: !hop.previewSettings.mutedByDefault } })}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                {hop.previewSettings.mutedByDefault ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={() => { setZoneOutMode(false); setIsPlaying(false); stopGaplessAudio(); zoneOutOffsetRef.current = 0; }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors font-pressstart text-[9px]">
                <X className="w-4 h-4" /> EXIT
              </button>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 z-40">
            <div className="font-pressstart text-sm text-white drop-shadow-lg">{hop.title}</div>
            <div className="font-pressstart text-[10px] text-white/40 mt-1">
              {hop.type === "series" && hop.seriesTitle ? `${hop.seriesTitle} • EP ${hop.episodeNumber || 1}` : "Single HOP"} • {totalSceneDuration}s
            </div>
          </div>
          <div className="absolute bottom-3 inset-x-0 text-center z-40">
            <span className="font-pressstart text-[8px] text-white/20">ESC or double-click to exit</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN BUILDER LAYOUT — redesigned flagship flow
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden"
      onDragOver={handleDragOver} onDrop={handleDrop}>
      {hop.audioTrack && (
        <audio ref={audioRef} src={hop.audioTrack} loop preload="auto" muted={hop.previewSettings.mutedByDefault} style={{ display: "none" }} />
      )}

      {/* ─── Header ─── */}
      <ModeHeader title="HOP BUILDER" icon={<Disc3 className="w-5 h-5" />} onImport={(dataUrl, name) => handleImportAsLayer(dataUrl, name || "Import")}>
        {/* Editable project title */}
        <input
          type="text"
          value={hop.title}
          onChange={e => updateHop({ title: e.target.value })}
          placeholder="Untitled HOP"
          className="font-pressstart text-[10px] bg-secondary/50 border border-border rounded px-2 py-1 text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-secondary/80 placeholder:text-muted-foreground/50"
          title="Click to rename your HOP"
        />
        <Tip label="Preview HOP">
          <button onClick={togglePlay}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded font-pressstart text-[10px] transition-all",
              isPlaying ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}>
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? "Stop" : "Play"}
          </button>
        </Tip>
        {hopDisplayMode === "moving" && (
          <div className="flex items-center bg-secondary/40 rounded border border-border overflow-hidden">
            <Tip label="Standard scene-by-scene playback">
              <button
                onClick={() => setMovingPlaybackMode("standard")}
                className={cn("px-2 py-1.5 font-pressstart text-[8px] transition-all",
                  movingPlaybackMode === "standard" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                STANDARD
              </button>
            </Tip>
            <div className="w-px h-4 bg-border" />
            <Tip label="Screensaver-style smooth horizontal scroll">
              <button
                onClick={() => setMovingPlaybackMode("screensaver")}
                className={cn("px-2 py-1.5 font-pressstart text-[8px] transition-all",
                  movingPlaybackMode === "screensaver" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                SCROLL
              </button>
            </Tip>
          </div>
        )}
        <Tip label="Zone Out — cinematic loop mode">
          <button onClick={() => setZoneOutMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-pressstart text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all">
            <Maximize className="w-3.5 h-3.5" /> ZONE OUT
          </button>
        </Tip>
        <Tip label="Mute/Unmute">
          <button onClick={() => updateHop({ previewSettings: { ...hop.previewSettings, mutedByDefault: !hop.previewSettings.mutedByDefault } })}
            className="p-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            {hop.previewSettings.mutedByDefault ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </Tip>
        <Tip label="Project Settings">
          <button onClick={() => setShowSettings(!showSettings)}
            className={cn("p-1.5 rounded transition-colors", showSettings ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground")}>
            <Settings className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <Tip label="Save Project">
          <button onClick={() => { saveProject(); setSaveStatus("saving"); setLastSaveTime(new Date()); setTimeout(() => setSaveStatus("saved"), 500); setTimeout(() => setSaveStatus("idle"), 3000); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded font-pressstart text-[10px] transition-all",
              saveStatus === "saving" ? "bg-primary/20 text-primary animate-pulse" : saveStatus === "saved" ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            {saveStatus === "saving" ? <Cloud className="w-3.5 h-3.5 animate-pulse" /> : saveStatus === "saved" ? <Cloud className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved ✓" : "Save"}
          </button>
        </Tip>
        <Tip label="New HOP">
          <button onClick={newProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-pressstart text-[10px] bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-all">
            <Plus className="w-3.5 h-3.5" /> New HOP
          </button>
        </Tip>
        <Tip label="My Projects">
          <button onClick={() => setShowProjectsDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-pressstart text-[10px] bg-secondary text-muted-foreground hover:text-foreground transition-all">
            <FolderOpen className="w-3.5 h-3.5" /> Projects
          </button>
        </Tip>
        {/* Viewport preview buttons */}
        <div className="flex items-center gap-0.5 bg-secondary rounded px-1 py-0.5">
          {([
            { id: "desktop" as ViewportMode, icon: <Monitor className="w-3 h-3" />, label: "16:9" },
            { id: "mobile" as ViewportMode, icon: <Smartphone className="w-3 h-3" />, label: "9:16" },
            { id: "tablet" as ViewportMode, icon: <Monitor className="w-3 h-3" />, label: "4:3" },
            { id: "square" as ViewportMode, icon: <Square className="w-3 h-3" />, label: "1:1" },
          ]).map(v => (
            <Tip key={v.id} label={`Preview ${v.label}`}>
              <button onClick={() => setViewportMode(v.id)}
                className={cn("p-1 rounded transition-colors", viewportMode === v.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {v.icon}
              </button>
            </Tip>
          ))}
          <div className="w-px h-5 bg-border" />
          <Tip label={hopDisplayMode === "standard" ? "Switch to Moving HOP (panoramic scroll)" : "Switch to Standard HOP"}>
            <button onClick={() => setHopDisplayMode(hopDisplayMode === "standard" ? "moving" : "standard")}
              className={cn("flex items-center gap-1 px-2 py-1 rounded font-pressstart text-[8px] border transition-all",
                hopDisplayMode === "moving" ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground hover:text-foreground border-border"
              )}>
              <MoveHorizontal className="w-3 h-3" /> {hopDisplayMode === "moving" ? "MOVING" : "STANDARD"}
            </button>
          </Tip>
        </div>
        <Tip label="Publish to Streaming">
          <button onClick={handlePublish} disabled={isPublishing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/15 text-primary hover:bg-primary/25 font-pressstart text-[10px] border border-primary/30 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {isPublishing ? "..." : "Publish"}
          </button>
        </Tip>
        <Tip label="Save full HOP to library">
          <button onClick={saveHopToLibrary}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded font-pressstart text-[10px] bg-secondary text-muted-foreground hover:text-foreground border border-border transition-all">
            <Library className="w-3.5 h-3.5" /> Save HOP
          </button>
        </Tip>
        <Tip label="Export GIF">
          <button onClick={exportAsGif} disabled={isExportingGif || !hasContent}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded font-pressstart text-[10px] bg-secondary text-muted-foreground hover:text-foreground border border-border disabled:opacity-50 transition-all">
            <Film className="w-3.5 h-3.5" /> {isExportingGif ? "..." : "GIF"}
          </button>
        </Tip>
        <Tip label="Export Video (WebM)">
          <button onClick={exportAsVideo} disabled={isExportingVideo || !hasContent}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded font-pressstart text-[10px] bg-secondary text-muted-foreground hover:text-foreground border border-border disabled:opacity-50 transition-all">
            <Monitor className="w-3.5 h-3.5" /> {isExportingVideo ? "..." : "MP4"}
          </button>
        </Tip>
        <Tip label="Send to CoMiXX">
          <button onClick={exportToCoMiXX} disabled={isSyncing || !hasContent}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded font-pressstart text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 disabled:opacity-50 transition-all">
            <Send className="w-3.5 h-3.5" /> {isSyncing ? "..." : "CoMiXX"}
          </button>
        </Tip>
        <ZoomControls zoom={hopZoom} zoomIn={hopZoomIn} zoomOut={hopZoomOut} resetZoom={hopResetZoom} />
        <SaveToLibraryButton getDataUrl={getDataUrl} assetName={hop.title || "HOP"} category="hop" />
        <SendToMenu getDataUrl={getDataUrl} assetName={hop.title} currentMode="hops" />
      </ModeHeader>

      {/* ─── Settings overlay ─── */}
      {showSettings && (
        <div className="shrink-0 border-b border-border bg-card/80 px-4 py-3 animate-fade-in">
          <div className="flex flex-wrap gap-4 items-start max-w-5xl mx-auto">
            <div className="flex-1 min-w-[160px]">
              <span className={sLabel}>TITLE</span>
              <input value={hop.title} onChange={e => updateHop({ title: e.target.value })}
                className="w-full bg-secondary text-foreground font-pressstart text-[10px] px-2.5 py-1.5 rounded border border-border" placeholder="Name your HOP..." />
            </div>
            <div className="flex-1 min-w-[160px]">
              <span className={sLabel}>DESCRIPTION</span>
              <input value={hop.description} onChange={e => updateHop({ description: e.target.value })}
                className="w-full bg-secondary text-foreground font-pressstart text-[10px] px-2.5 py-1.5 rounded border border-border" />
            </div>
            <div className="w-28">
              <span className={sLabel}>TYPE</span>
              <div className="flex gap-1">
                {(["single", "series"] as const).map(t => (
                  <button key={t} onClick={() => updateHop({ type: t })}
                    className={cn("flex-1 py-1.5 rounded font-pressstart text-[8px] border transition-all",
                      hop.type === t ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>{t === "single" ? "🎯" : "📚"} {t}</button>
                ))}
              </div>
            </div>
            <div className="w-32">
              <span className={sLabel}>VISIBILITY</span>
              <div className="flex gap-1">
                {([
                  { id: "private" as const, icon: <Lock className="w-3 h-3" /> },
                  { id: "unlisted" as const, icon: <EyeOff className="w-3 h-3" /> },
                  { id: "public" as const, icon: <Globe className="w-3 h-3" /> },
                ]).map(v => (
                  <button key={v.id} onClick={() => updateHop({ visibility: v.id })}
                    className={cn("flex-1 py-1.5 rounded border flex items-center justify-center transition-all",
                      hop.visibility === v.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>{v.icon}</button>
                ))}
              </div>
            </div>
            <div className="w-36">
              <span className={sLabel}>LOOP MODE</span>
              <div className="flex gap-1">
                {(["single_loop", "full_series_loop", "manual_advance"] as const).map(m => (
                  <button key={m} onClick={() => updateHop({ loopMode: m })}
                    className={cn("flex-1 py-1.5 rounded font-pressstart text-[7px] border transition-all",
                      hop.loopMode === m ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>{m === "single_loop" ? "🔁" : m === "full_series_loop" ? "🔄" : "👆"}</button>
                ))}
              </div>
            </div>
            <div className="w-40">
              <span className={sLabel}>HOP MODE</span>
              <div className="flex gap-1">
                {([
                  { id: "standard" as HopDisplayMode, label: "STANDARD", icon: "🔁" },
                  { id: "moving" as HopDisplayMode, label: "MOVING", icon: "🎞️" },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => setHopDisplayMode(m.id)}
                    className={cn("flex-1 py-1.5 rounded font-pressstart text-[7px] border transition-all",
                      hopDisplayMode === m.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>{m.icon} {m.label}</button>
                ))}
              </div>
              {hopDisplayMode === "moving" && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-pressstart text-[7px] text-muted-foreground shrink-0">SPEED</span>
                    <Slider value={[scrollSpeed]} onValueChange={([v]) => setScrollSpeed(v)} min={5} max={150} step={5} className="flex-1" />
                    <span className="font-pressstart text-[7px] text-muted-foreground w-8 text-right">{scrollSpeed}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setScrollDirection("left")}
                      className={cn("flex-1 py-1 rounded font-pressstart text-[7px] border flex items-center justify-center gap-1 transition-all",
                        scrollDirection === "left" ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                      )}><ArrowLeft className="w-3 h-3" /> LEFT</button>
                    <button onClick={() => setScrollDirection("right")}
                      className={cn("flex-1 py-1 rounded font-pressstart text-[7px] border flex items-center justify-center gap-1 transition-all",
                        scrollDirection === "right" ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                      )}><ArrowRight className="w-3 h-3" /> RIGHT</button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-pressstart text-[7px] text-muted-foreground">SEAMLESS</span>
                    <button onClick={() => setSeamlessStitch(!seamlessStitch)}
                      className={cn("px-2 py-0.5 rounded font-pressstart text-[7px] border transition-all",
                        seamlessStitch ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                      )}>{seamlessStitch ? "ON" : "OFF"}</button>
                  </div>
                </div>
              )}
              <input value={hop.tags.join(", ")} onChange={e => updateHop({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1.5 rounded border border-border" placeholder="tag1, tag2" />
            </div>
            <div>
              <span className={sLabel}>EXPORT SIZE</span>
              <select value={exportPreset} onChange={e => setExportPreset(e.target.value)}
                className="bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1.5 rounded border border-border">
                {EXPORT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} ({p.platform})</option>)}
              </select>
            </div>
            <div className="flex items-end gap-1 flex-wrap">
              <button onClick={async () => {
                const url = await getDataUrl();
                if (url) { const a = document.createElement("a"); a.href = url; a.download = `${hop.title || "hop"}.png`; a.click(); toast.success("Exported!"); }
              }} className="px-3 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center gap-1">
                <Download className="w-3 h-3" /> PNG
              </button>
              <button onClick={exportAsGif} disabled={isExportingGif || !hasContent}
                className="px-3 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center gap-1 disabled:opacity-50">
                <Film className="w-3 h-3" /> {isExportingGif ? "..." : "GIF"}
              </button>
              <button onClick={exportAsVideo} disabled={isExportingVideo || !hasContent}
                className="px-3 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center gap-1 disabled:opacity-50">
                <Monitor className="w-3 h-3" /> {isExportingVideo ? "..." : "MP4"}
              </button>
              <button onClick={exportToCoMiXX} disabled={isSyncing || !hasContent}
                className="px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-pressstart text-[9px] border border-primary/30 flex items-center gap-1 disabled:opacity-50">
                <Send className="w-3 h-3" /> {isSyncing ? "SYNCING..." : "CoMiXX"}
              </button>
              <button onClick={saveHopToLibrary}
                className="px-3 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center gap-1">
                <Library className="w-3 h-3" /> SAVE HOP
              </button>
              <button onClick={() => {
                const social = generateSocialCopy({
                  title: hop.title, description: hop.description, tags: hop.tags,
                  type: hop.type, scenes: hop.scenes, totalDuration: totalSceneDuration,
                });
                navigator.clipboard.writeText(`${social.caption}\n\n${social.hashtags.join(" ")}`);
                toast.success("📋 Social copy copied to clipboard!");
              }} disabled={!hasContent}
                className="px-3 py-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center gap-1 disabled:opacity-50">
                <Copy className="w-3 h-3" /> SOCIAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main workspace ─── */}
      <CanvasContextMenu actions={[
        { label: "NEW HOP", icon: "🆕", onClick: newProject },
        { separator: true, label: "" },
        { label: "PLAY / STOP", icon: "▶️", onClick: togglePlay },
        { label: "ZONE OUT", icon: "🎬", onClick: () => setZoneOutMode(true) },
        { label: "ADD SCENE", icon: "➕", onClick: addScene },
        { separator: true, label: "" },
        { label: hop.audioTrack ? "REPLACE AUDIO" : "ADD AUDIO", icon: "🎵", onClick: handleAudioUpload },
        ...(hop.audioTrack ? [
          { label: hop.previewSettings.mutedByDefault ? "UNMUTE" : "MUTE", icon: hop.previewSettings.mutedByDefault ? "🔊" : "🔇", onClick: () => updateHop({ previewSettings: { ...hop.previewSettings, mutedByDefault: !hop.previewSettings.mutedByDefault } }) },
          { label: "REMOVE AUDIO", icon: "❌", onClick: () => { updateHop({ audioTrack: null, audioBpm: null }); setAudioWaveform([]); toast.success("Audio removed"); } },
          ...(hop.audioBpm ? [{ label: `SNAP TO ${hop.audioBpm} BPM`, icon: "⚡", onClick: snapToBeat }] : []),
        ] : []),
        { separator: true, label: "" },
        { label: "PUBLISH", icon: "🚀", onClick: handlePublish, disabled: isPublishing },
      ]} title="HOP BUILDER" icon={<Disc3 className="w-4 h-4" />} onImport={(dataUrl, name) => handleImportAsLayer(dataUrl, name)} getDataUrl={getDataUrl} sendAssetName={hop.title}>
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ═══ LEFT PANEL: Only 2 tabs — Scenes + Assets ═══ */}
        <aside className="w-60 xl:w-68 flex flex-col shrink-0 overflow-hidden border-r border-border bg-card/50">
          <div className="flex shrink-0 border-b border-border">
            {([
              { id: "scenes" as const, label: "SCENES", icon: <Film className="w-3.5 h-3.5" /> },
              { id: "audio" as const, label: "AUDIO", icon: <Music className="w-3.5 h-3.5" /> },
              { id: "assets" as const, label: "ASSETS", icon: <Library className="w-3.5 h-3.5" /> },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setLeftTab(tab.id)}
                className={cn(
                  "flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all font-pressstart text-[9px] relative",
                  leftTab === tab.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  tab.id === "audio" && hop.audioTrack && leftTab !== "audio" && "after:absolute after:top-1.5 after:right-1.5 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary"
                )}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ═══ AUDIO TAB — the heartbeat of your HOP ═══ */}
            {leftTab === "audio" && (
              <div className="p-3 space-y-4">
                {/* Hero audio section */}
                {!hop.audioTrack ? (
                  <div className="space-y-3">
                    <div className="text-center py-6 space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-pressstart text-[11px] text-foreground">MUSIC DRIVES THE VIBE</p>
                        <p className="font-pressstart text-[8px] text-muted-foreground mt-1">Add a track and scenes snap to the beat</p>
                      </div>
                    </div>
                    <button onClick={handleAudioUpload}
                      className="w-full py-4 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 transition-all group">
                      <Upload className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="font-pressstart text-[10px] text-primary">UPLOAD AUDIO</span>
                      <span className="font-pressstart text-[7px] text-muted-foreground">MP3, WAV, OGG, M4A</span>
                    </button>
                    <div className="text-center">
                      <span className="font-pressstart text-[7px] text-muted-foreground/50">or drag & drop audio anywhere</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Audio loaded state */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Disc3 className={cn("w-4 h-4 text-primary", isPlaying && "animate-spin")} style={{ animationDuration: "2s" }} />
                          </div>
                          <div>
                            <p className="font-pressstart text-[9px] text-foreground">AUDIO LOADED</p>
                            <p className="font-pressstart text-[7px] text-muted-foreground">{totalSceneDuration}s total</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => updateHop({ previewSettings: { ...hop.previewSettings, mutedByDefault: !hop.previewSettings.mutedByDefault } })}
                            className="p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors">
                            {hop.previewSettings.mutedByDefault ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        </div>
                      </div>

                      {/* Waveform */}
                      {audioWaveform.length > 0 && (
                        <div className="flex items-end gap-[1px] h-10 bg-card/50 rounded p-1">
                          {audioWaveform.map((v, i) => (
                            <div key={i} className="flex-1 bg-primary/50 rounded-t-sm" style={{ height: `${Math.max(4, v * 32)}px` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BPM + Sync */}
                    <div className="space-y-2">
                      <span className={sLabel}>TEMPO / BPM</span>
                      <div className="flex gap-2">
                        <input type="number" value={hop.audioBpm || ""} onChange={e => updateHop({ audioBpm: parseInt(e.target.value) || null })}
                          className="flex-1 bg-secondary text-foreground font-pressstart text-[10px] px-3 py-2 rounded border border-border text-center" placeholder="Enter BPM..." />
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[80, 100, 120, 140].map(bpm => (
                          <button key={bpm} onClick={() => updateHop({ audioBpm: bpm })}
                            className={cn("py-1.5 rounded font-pressstart text-[8px] border transition-all",
                              hop.audioBpm === bpm ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                            )}>{bpm}</button>
                        ))}
                      </div>
                      {hop.audioBpm && (
                        <button onClick={snapToBeat}
                          className="w-full py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-pressstart text-[10px] flex items-center justify-center gap-2 transition-all">
                          <Zap className="w-4 h-4" /> SNAP ALL SCENES TO {hop.audioBpm} BPM
                        </button>
                      )}
                    </div>

                    {/* Audio actions */}
                    <div className="space-y-1.5">
                      <span className={sLabel}>ACTIONS</span>
                      <button onClick={handleAudioUpload}
                        className="w-full py-2 rounded border border-border hover:border-primary/30 font-pressstart text-[8px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors">
                        <Upload className="w-3 h-3" /> REPLACE MAIN AUDIO
                      </button>
                      <button onClick={() => { updateHop({ audioTrack: null, audioBpm: null }); setAudioWaveform([]); toast.success("Audio removed"); }}
                        className="w-full py-2 rounded border border-destructive/30 hover:border-destructive/50 font-pressstart text-[8px] text-destructive/70 hover:text-destructive flex items-center justify-center gap-1.5 transition-colors">
                        <Trash2 className="w-3 h-3" /> REMOVE MAIN AUDIO
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── MULTI-CLIP AUDIO TRACKS ─── */}
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className={sLabel}>AUDIO CLIPS ({audioClips.length})</span>
                  </div>
                  <p className="font-pressstart text-[7px] text-muted-foreground/60">
                    Layer multiple audio clips on the timeline. Each clip can be repositioned, trimmed, muted, and volume-adjusted independently.
                  </p>

                  {audioClips.length > 0 && (
                    <div className="space-y-1.5">
                      {audioClips.map((clip, ci) => (
                        <div key={clip.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30 group">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: clip.color }} />
                          <span className="flex-1 font-pressstart text-[8px] text-foreground truncate">{clip.name}</span>
                          <div className="flex items-center gap-1">
                            <input type="range" min={0} max={100} value={clip.volume}
                              onChange={(e) => setAudioClips(prev => prev.map(c => c.id === clip.id ? { ...c, volume: parseInt(e.target.value) } : c))}
                              className="w-12 h-1 accent-primary" title={`Volume: ${clip.volume}%`} />
                            <button onClick={() => setAudioClips(prev => prev.map(c => c.id === clip.id ? { ...c, muted: !c.muted } : c))}
                              className="p-1 rounded hover:bg-secondary transition-colors">
                              {clip.muted ? <VolumeX className="w-3 h-3 text-muted-foreground/40" /> : <Volume2 className="w-3 h-3 text-primary" />}
                            </button>
                            <button onClick={() => setAudioClips(prev => prev.filter(c => c.id !== clip.id))}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3 h-3 text-destructive/60" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file"; input.accept = "audio/*"; input.multiple = true;
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      files.forEach((file, fi) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const AUDIO_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
                          const newClip = {
                            id: `aclip-${Date.now()}-${fi}-${Math.random().toString(36).slice(2, 5)}`,
                            name: file.name.replace(/\.[^.]+$/, "").slice(0, 20),
                            dataUrl: reader.result as string,
                            startTime: 0,
                            duration: 10,
                            trimStart: 0,
                            trimEnd: 0,
                            volume: 80,
                            muted: false,
                            color: AUDIO_COLORS[(audioClips.length + fi) % AUDIO_COLORS.length],
                          };
                          setAudioClips(prev => [...prev, newClip]);
                        };
                        reader.readAsDataURL(file);
                      });
                      if (files.length > 0) toast.success(`Added ${files.length} audio clip${files.length > 1 ? "s" : ""} 🎵`);
                    };
                    input.click();
                  }}
                    className="w-full py-3 rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 transition-all group">
                    <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-pressstart text-[9px] text-primary">ADD AUDIO CLIPS</span>
                  </button>
                  <p className="font-pressstart text-[6px] text-muted-foreground/40 text-center">
                    Supports MP3, WAV, OGG, M4A • Select multiple files at once
                  </p>
                </div>
              </div>
            )}

            {/* ═══ SCENES TAB — visual storyboard ═══ */}
            {leftTab === "scenes" && (
              <div className="p-2 space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-pressstart text-[9px] text-muted-foreground">{hop.scenes.length} SCENES • {totalSceneDuration}s</span>
                  <button onClick={addScene} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all" title="Add scene">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scene Templates */}
                <div className="flex gap-1 flex-wrap mb-2">
                  {HOP_SCENE_TEMPLATES.slice(0, 6).map(tmpl => (
                    <button key={tmpl.id} onClick={() => {
                      const scene = createDefaultHopScene(hop.scenes.length);
                      Object.assign(scene, tmpl.scene);
                      setHop(prev => ({ ...prev, scenes: [...prev.scenes, scene], updatedAt: new Date().toISOString() }));
                      setSelectedSceneIdx(hop.scenes.length);
                      setSelectedLayerId(null);
                      toast.success(`${tmpl.emoji} ${tmpl.label} scene added!`);
                    }}
                      className="px-1.5 py-1 rounded border border-border bg-secondary/30 hover:bg-primary/10 hover:border-primary/30 font-pressstart text-[6px] text-muted-foreground hover:text-foreground transition-all"
                      title={tmpl.description}>
                      {tmpl.emoji}
                    </button>
                  ))}
                </div>

                {hop.scenes.map((scene, i) => {
                  const layerCount = (sceneLayers[scene.id] || []).length;
                  const isActive = selectedSceneIdx === i;
                  return (
                    <div key={scene.id}
                      draggable
                      onDragStart={() => setDragSceneIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragSceneIdx !== null && dragSceneIdx !== i) {
                          setHop(prev => {
                            const scenes = [...prev.scenes];
                            const [moved] = scenes.splice(dragSceneIdx, 1);
                            scenes.splice(i, 0, moved);
                            return { ...prev, scenes: scenes.map((s, idx) => ({ ...s, order: idx })), updatedAt: new Date().toISOString() };
                          });
                          setSelectedSceneIdx(i);
                        }
                        setDragSceneIdx(null);
                      }}
                      onClick={() => { setSelectedSceneIdx(i); setSelectedLayerId(null); }}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all group relative",
                        isActive ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" : "bg-secondary/30 border-border hover:border-primary/20"
                      )}>
                      <GripVertical className="w-3 h-3 text-muted-foreground/30 cursor-grab shrink-0" />
                      <div className="w-12 h-12 rounded bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {(() => {
                          const thumbLayers = (sceneLayers[scene.id] || []).filter(l => l.visible && l.dataUrl);
                          const firstImg = thumbLayers[0];
                          if (firstImg) {
                            return isVideoSource(firstImg.dataUrl!)
                              ? <video src={firstImg.dataUrl} className="w-full h-full object-cover" muted playsInline />
                              : <img src={firstImg.dataUrl} alt="" className="w-full h-full object-cover" />;
                          }
                          if (scene.assetUrl) {
                            return isVideoSource(scene.assetUrl) || scene.assetType === "video"
                              ? <video src={scene.assetUrl} className="w-full h-full object-cover" muted playsInline />
                              : <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" />;
                          }
                          if (scene.assetType === "text_card") return <Type className="w-4 h-4 text-muted-foreground/40" />;
                          return <div className="text-center"><Plus className="w-4 h-4 text-muted-foreground/20" /></div>;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-pressstart text-[9px] text-foreground truncate">{scene.caption || `Scene ${i + 1}`}</div>
                        <div className="font-pressstart text-[7px] text-muted-foreground mt-0.5">
                          {scene.duration}s • {scene.transition} {layerCount > 0 ? `• ${layerCount}L` : ""}
                        </div>
                        {/* Hover quick controls */}
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); updateScene(i, { duration: Math.max(1, scene.duration - 1) }); }}
                            className="px-1 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <span className="font-pressstart text-[7px]">-1s</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateScene(i, { duration: Math.min(30, scene.duration + 1) }); }}
                            className="px-1 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <span className="font-pressstart text-[7px]">+1s</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateScene(i, { loopInScene: !scene.loopInScene }); }}
                            className={cn("p-0.5 rounded transition-colors", scene.loopInScene ? "text-primary" : "text-muted-foreground/40")}>
                            <Repeat className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); duplicateScene(i); }}
                            className="p-0.5 text-muted-foreground hover:text-primary"><Copy className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeScene(i); }}
                            className="p-0.5 text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Quick add buttons */}
                <div className="flex gap-1 pt-1">
                  <button onClick={() => handleFileUpload("image/*,video/*,image/gif")}
                    className="flex-1 py-2 rounded border-2 border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-1 transition-colors">
                    <ImageIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="font-pressstart text-[8px] text-muted-foreground">+ SCENE</span>
                  </button>
                  <button onClick={() => {
                    // Add a text layer to the current scene (or create a new scene if none)
                    const targetScene = selectedScene || hop.scenes[hop.scenes.length - 1];
                    if (targetScene) {
                      const layers = sceneLayers[targetScene.id] || [];
                      const newLayer = createDefaultLayer("text", layers.length);
                      newLayer.text = "Your text";
                      newLayer.fontSize = 24;
                      newLayer.fontFamily = "Bangers";
                      newLayer.fontColor = "#FFFFFF";
                      newLayer.locked = false;
                      setSceneLayers(prev => ({ ...prev, [targetScene.id]: [...(prev[targetScene.id] || []), newLayer] }));
                      setSelectedLayerId(newLayer.id);
                      toast.success("✏️ Text layer added — drag to position");
                    }
                  }}
                    className="flex-1 py-2 rounded border-2 border-dashed border-border hover:border-primary/30 flex items-center justify-center gap-1 transition-colors">
                    <Type className="w-3 h-3 text-muted-foreground" />
                    <span className="font-pressstart text-[8px] text-muted-foreground">+ TEXT</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══ ASSETS TAB ═══ */}
            {leftTab === "assets" && (
              <HopAssetBrowser onSelectAsset={handleVibeDropped} onLoadHop={loadHopFromLibrary} />
            )}
          </div>

          {/* Persistent save bar at bottom of left panel */}
          <div className="shrink-0 border-t border-border p-2 flex gap-1.5">
            <button onClick={saveHopToLibrary}
              className="flex-1 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 font-pressstart text-[9px] border border-primary/30 flex items-center justify-center gap-1.5 transition-all">
              <Save className="w-3.5 h-3.5" /> SAVE TO LIBRARY
            </button>
            <button onClick={() => { saveProject(); toast.success("Project saved! 💾"); }}
              className="flex-1 py-2 rounded bg-secondary text-muted-foreground hover:text-foreground font-pressstart text-[9px] border border-border flex items-center justify-center gap-1.5 transition-all">
              <Save className="w-3.5 h-3.5" /> SAVE
            </button>
          </div>
        </aside>

        {/* ═══ CENTER: Canvas ═══ */}
        <div ref={canvasAreaRef} className={cn("flex-1 flex min-w-0 overflow-hidden", hopDisplayMode === "moving" ? "items-start p-2" : "items-center justify-center p-0")}
           style={{ backgroundColor: "#0a0a0f" }}>

          {/* Empty state — "Drop your first vibe" */}
          {!hasContent ? (
            <div ref={dropZoneRef}
              onClick={() => handleFileUpload("image/*,video/*,image/gif")}
              className="w-[400px] h-[500px] rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60
                bg-gradient-to-b from-primary/5 to-transparent cursor-pointer transition-all duration-300
                flex flex-col items-center justify-center gap-6 group hover:scale-[1.02]">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Disc3 className="w-10 h-10 text-primary animate-spin" style={{ animationDuration: "4s" }} />
              </div>
              <div className="text-center space-y-2">
                <p className="font-pressstart text-sm text-primary">DROP YOUR FIRST VIBE</p>
                <p className="font-pressstart text-[9px] text-muted-foreground">Drag image, video, or audio here</p>
                <p className="font-pressstart text-[8px] text-muted-foreground/50">or click to browse</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={(e) => { e.stopPropagation(); setLeftTab("assets"); }}
                  className="px-4 py-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground font-pressstart text-[9px] transition-colors flex items-center gap-1.5">
                  <Library className="w-3.5 h-3.5" /> From Library
                </button>
                <button onClick={(e) => { e.stopPropagation();
                  const scene = createDefaultHopScene(0);
                  setHop(prev => ({ ...prev, scenes: [scene], updatedAt: new Date().toISOString() }));
                  const newLayer = createDefaultLayer("text", 0);
                  newLayer.text = "Your text";
                  newLayer.fontSize = 32;
                  newLayer.fontFamily = "Bangers";
                  newLayer.fontColor = "#FFFFFF";
                  newLayer.locked = false;
                  setSceneLayers(prev => ({ ...prev, [scene.id]: [newLayer] }));
                  setSelectedLayerId(newLayer.id);
                  toast.success("✏️ Text layer added — select to edit");
                }}
                  className="px-4 py-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground font-pressstart text-[9px] transition-colors flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> + Text
                </button>
              </div>
            </div>
          ) : hopDisplayMode === "moving" ? (
            /* ═══ MOVING HOP — full panoramic working area ═══ */
            <div className="flex flex-col gap-2 w-full h-full" ref={hopZoomRef}>
              <div className="flex items-center gap-2 px-2">
                <span className="font-pressstart text-[8px] text-muted-foreground">🎞️ MOVING HOP • {hop.scenes.length} scenes • {totalSceneDuration}s • {scrollSpeed}px/s {scrollDirection === "left" ? "←" : "→"}</span>
                {isPlaying && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <MoveHorizontal className="w-2.5 h-2.5 text-primary animate-pulse" />
                    <span className="font-pressstart text-[7px] text-primary">SCROLLING</span>
                  </span>
                )}
              </div>
              {/* Time ruler */}
              <div className="relative w-full h-5 bg-card/50 border-b border-border overflow-hidden">
                <div className="flex h-full" style={{ width: "max-content" }}>
                  {hop.scenes.map((scene, si) => {
                    const pxPerSec = 120;
                    const sceneW = Math.max(80, scene.duration * pxPerSec);
                    return (
                      <div key={scene.id} className={cn(
                        "relative border-r border-border/30 flex items-end px-1 cursor-pointer transition-colors",
                        selectedSceneIdx === si ? "bg-primary/10" : "hover:bg-secondary/50"
                      )} style={{ width: sceneW }} onClick={() => { setSelectedSceneIdx(si); setSelectedLayerId(null); }}>
                        <span className="font-pressstart text-[6px] text-muted-foreground">{si + 1}</span>
                        <span className="font-pressstart text-[5px] text-muted-foreground/50 ml-auto">{scene.duration}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Scrollable panoramic strip — full width, horizontally scrollable */}
              <div className="w-full overflow-x-auto overflow-y-hidden flex-1" style={{ scrollbarWidth: "thin" }}>
                <div ref={canvasRef} className="relative rounded-lg"
                  style={{
                    display: "flex",
                    width: "max-content",
                    height: VIEWPORT_SIZES[viewportMode].h,
                    backgroundColor: "#0a0a0f",
                    boxShadow: "0 15px 40px -12px rgba(0,0,0,0.4)",
                  }}
                  onClick={(e) => { if (e.target === e.currentTarget) setSelectedLayerId(null); }}>
                  {/* Inner scrolling container for playback animation */}
                  <div ref={movingContainerRef} className="flex h-full" style={{ width: "max-content", willChange: "transform" }}>
                    {hop.scenes.map((scene, si) => {
                      const pxPerSec = 120;
                      const sceneW = Math.max(80, scene.duration * pxPerSec);
                      const sceneLayersArr = sceneLayers[scene.id] || [];
                      const isActive = selectedSceneIdx === si;
                      return (
                        <div key={scene.id} className={cn(
                          "relative shrink-0 overflow-hidden",
                          !seamlessStitch && "border-r",
                          !seamlessStitch && (isActive && !isPlaying ? "border-r-primary/50 ring-inset ring-2 ring-primary/20" : "border-r-border/20")
                        )}
                          style={{ width: sceneW, height: VIEWPORT_SIZES[viewportMode].h }}
                          onClick={() => { setSelectedSceneIdx(si); setSelectedLayerId(null); }}>
                          {/* Scene background — empty state only when no layers */}
                          {scene.assetType === "text_card" ? (
                            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                              <p className="font-pressstart text-base text-white leading-relaxed">{scene.textOverlay || "Your text here"}</p>
                            </div>
                          ) : sceneLayersArr.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/20">
                              <div className="text-center">
                                <Plus className="w-8 h-8 text-muted-foreground/15 mx-auto mb-1" />
                                <span className="font-pressstart text-[8px] text-muted-foreground/25">Scene {si + 1}</span>
                              </div>
                            </div>
                          ) : null}
                          {/* ALL layers with FreeTransform — backgrounds are now regular layers */}
                          {sceneLayersArr.filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                            const isActiveScene = !isPlaying;
                              const depth = layer.parallaxDepth ?? 0;
                              // Parallax: foreground layers (high depth) shift opposite to scroll
                              // Max shift: ±60px at full depth during screensaver
                              const isScreensaver = hopDisplayMode === "moving" && movingPlaybackMode === "screensaver" && isPlaying;
                              const parallaxShift = isScreensaver ? (depth / 100) * Math.sin(parallaxOffset * 0.005) * 60 : 0;
                              return (
                              <div key={layer.id} style={{
                                ...getHopLayerShellStyle(scene, layer, parallaxShift),
                                opacity: layer.opacity,
                                mixBlendMode: (layer.blendMode || "normal") as any,
                                 zIndex: layer.zIndex + 1,
                                filter: (layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"})` : undefined,
                                ...getBeatReactStyle(layer, hop.audioBpm, isPlaying),
                              }}>
                                {isActiveScene ? (
                                  <FreeTransformWrapper
                                    positionX={layer.positionX}
                                    positionY={layer.positionY}
                                    scale={layer.scale}
                                    rotation={layer.rotation}
                                    selected={selectedLayerId === layer.id}
                                    locked={layer.locked}
                                    zoom={1}
                                    onSelect={() => { setSelectedSceneIdx(si); setSelectedLayerId(layer.id); }}
                                    onTransformChange={(updates) => {
                                      // Update layer in the correct scene
                                      setSceneLayers(prev => ({
                                        ...prev,
                                        [scene.id]: (prev[scene.id] || []).map(l => l.id === layer.id ? { ...l, ...updates } : l),
                                      }));
                                    }}
                                  >
                                    {renderHopLayerContent(scene, layer, sceneW, VIEWPORT_SIZES[viewportMode].h)}
                                  </FreeTransformWrapper>
                                ) : (
                                  renderHopLayerContent(scene, layer, sceneW, VIEWPORT_SIZES[viewportMode].h)
                                )}
                              </div>
                            );
                          })}
                          {/* Text overlay */}
                          {scene.textOverlay && scene.assetType !== "text_card" && (() => {
                            const style = sceneTextStyles[scene.id] || DEFAULT_TEXT_STYLE;
                            const posClass = style.position === "top" ? "top-4" : style.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-14";
                            return (
                              <div className={cn("absolute inset-x-0 px-4 z-25 flex flex-col items-center", posClass)}>
                                <span style={{
                                  fontFamily: style.fontFamily, fontSize: `${style.fontSize}px`, color: style.color,
                                  fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? "italic" : "normal",
                                  WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
                                  backgroundColor: style.bgOpacity > 0 ? `${style.bgColor}${Math.round(style.bgOpacity * 2.55).toString(16).padStart(2, "0")}` : undefined,
                                  padding: style.bgOpacity > 0 ? "4px 10px" : undefined, borderRadius: style.bgOpacity > 0 ? "6px" : undefined,
                                }}>{scene.textOverlay}</span>
                              </div>
                            );
                          })()}
                          {/* Scene number + duration badge */}
                          {!isPlaying && (
                            <div className="absolute top-2 left-2 z-30 flex items-center gap-1" data-export-hide>
                              <span className="bg-black/60 rounded-full px-2 py-0.5 font-pressstart text-[7px] text-white/70">{si + 1}</span>
                              <span className="bg-black/40 rounded-full px-1.5 py-0.5 font-pressstart text-[6px] text-white/50">{scene.duration}s</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Loop copies for seamless playback */}
                    {isPlaying && seamlessStitch && hop.scenes.slice(0, Math.min(3, hop.scenes.length)).map((scene) => {
                      const pxPerSec = 120;
                      const sceneW = Math.max(80, scene.duration * pxPerSec);
                      return (
                        <div key={`loop-${scene.id}`} className={cn("relative shrink-0 overflow-hidden", !seamlessStitch && "border-r border-dashed border-border/20")}
                          style={{ width: sceneW, height: VIEWPORT_SIZES[viewportMode].h, pointerEvents: "none" }}>
                          {(sceneLayers[scene.id] || []).filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex).map(layer => (
                            <div key={layer.id} style={{
                              ...getHopLayerShellStyle(scene, layer),
                              opacity: layer.opacity,
                              zIndex: layer.zIndex + 1,
                            }}>
                              {renderHopLayerContent(scene, layer, sceneW, VIEWPORT_SIZES[viewportMode].h)}
                            </div>
                          ))}
                          {scene.assetType === "text_card" && (
                            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                              <p className="font-pressstart text-base text-white leading-relaxed">{scene.textOverlay || ""}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Footer info */}
              <div className="flex items-center gap-3 px-2">
                <span className="font-pressstart text-[7px] text-muted-foreground/50">
                  Total strip: {hop.scenes.reduce((sum, s) => sum + Math.max(80, s.duration * 120), 0)}px • {totalSceneDuration}s • 120px/sec scale
                </span>
              </div>
            </div>
          ) : (
            /* Actual canvas — standard mode */
            <div className="flex flex-col items-center justify-center w-full h-full gap-0" ref={hopZoomRef}>
              <div style={{ transform: `scale(${hopZoom})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}>
              <div className="flex items-center gap-2">
                <span className="font-pressstart text-[8px] text-muted-foreground">{VIEWPORT_SIZES[viewportMode].label} PREVIEW</span>
                {isPlaying && hop.audioTrack && hop.audioBpm && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <Heart className="w-2.5 h-2.5 text-primary animate-pulse" style={{ animationDuration: `${60 / hop.audioBpm}s` }} />
                    <span className="font-pressstart text-[7px] text-primary">{hop.audioBpm} BPM</span>
                  </span>
                )}
              </div>
              <div ref={canvasRef} className={cn("relative shrink-0 rounded-lg overflow-hidden", transitionClass)}
                style={{
                  width: VIEWPORT_SIZES[viewportMode].w,
                  height: VIEWPORT_SIZES[viewportMode].h,
                  backgroundColor: "#0a0a0f",
                  boxShadow: isPlaying && hop.audioTrack && hop.audioBpm
                    ? `0 0 30px 2px hsl(var(--primary) / 0.3), 0 25px 60px -12px rgba(0,0,0,0.5)`
                    : "0 25px 60px -12px rgba(0,0,0,0.5)",
                  transition: "width 0.3s ease, height 0.3s ease, box-shadow 0.3s ease",
                  animation: isPlaying && hop.audioTrack && hop.audioBpm
                    ? `hop-beat-pulse ${60 / hop.audioBpm}s ease-in-out infinite` : undefined,
                }}
                onClick={(e) => { if (e.target === e.currentTarget) setSelectedLayerId(null); }}
                onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedLayerId(null); }}>

                {/* Camera Ken Burns wrapper — wraps all scene content */}
                <div className="absolute inset-0 hop-ken-burns" style={{
                  ...getCameraStyle(displayScene, isPlaying ? cameraProgress : 0),
                }}>
                {/* Scene background — show empty state only if no layers exist */}
                {displayScene && displayLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
                    {displayScene.assetType === "text_card" ? (
                      <div className="p-8 text-center">
                        <p className="font-pressstart text-base text-white leading-relaxed">{displayScene.textOverlay || "Your text here"}</p>
                      </div>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => handleFileUpload("image/*,video/*,image/gif")}>
                        <ImageIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <span className="font-pressstart text-[10px] text-muted-foreground/30">Click to add background</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ALL layers with FreeTransform — backgrounds are now regular layers */}
                {[...displayLayers].sort((a, b) => a.zIndex - b.zIndex).filter(l => l.visible).map(layer => {
                  return (
                    <div key={layer.id} style={{
                      position: "absolute",
                      left: `calc(50% + ${layer.positionX}px)`,
                      top: `calc(50% + ${layer.positionY}px)`,
                      transform: "translate(-50%, -50%)",
                      opacity: layer.opacity,
                      mixBlendMode: layer.blendMode || "normal" as any,
                      filter: [
                        (layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"})` : "",
                        getMotionBlurFilter(layer),
                      ].filter(Boolean).join(" ") || undefined,
                      zIndex: layer.zIndex + 1,
                      ...getBeatReactStyle(layer, hop.audioBpm, isPlaying),
                    } as React.CSSProperties}>
                      <FreeTransformWrapper
                        positionX={layer.positionX}
                        positionY={layer.positionY}
                        scale={layer.scale}
                        rotation={layer.rotation}
                        selected={selectedLayerId === layer.id && !isPlaying}
                        locked={layer.locked}
                        zoom={1}
                        snapEnabled={!isPlaying}
                        canvasWidth={VIEWPORT_SIZES[viewportMode].w}
                        canvasHeight={VIEWPORT_SIZES[viewportMode].h}
                        onSnapGuides={setSnapGuides}
                        onSelect={() => setSelectedLayerId(layer.id)}
                        onTransformChange={(updates) => updateLayer(layer.id, updates)}
                      >
                        {displayScene && renderHopLayerContent(displayScene, layer, VIEWPORT_SIZES[viewportMode].w, VIEWPORT_SIZES[viewportMode].h, { autoPlay: isPlaying, dataHopVideo: true, animKey: `main-${previewSceneIdx}-${loopCount}` })}
                      </FreeTransformWrapper>
                    </div>
                  );
                })}

                {/* Snap guide lines */}
                {!isPlaying && snapGuides.length > 0 && (
                  <>
                    {snapGuides.map((g, i) => (
                      g.axis === "x" ? (
                        <div key={`snap-${i}`} data-export-hide className="absolute top-0 bottom-0 pointer-events-none z-40" style={{
                          left: `calc(50% + ${g.position}px)`,
                          width: 1,
                          background: "hsl(var(--primary) / 0.6)",
                          boxShadow: "0 0 4px hsl(var(--primary) / 0.4)",
                        }} />
                      ) : (
                        <div key={`snap-${i}`} data-export-hide className="absolute left-0 right-0 pointer-events-none z-40" style={{
                          top: `calc(50% + ${g.position}px)`,
                          height: 1,
                          background: "hsl(var(--primary) / 0.6)",
                          boxShadow: "0 0 4px hsl(var(--primary) / 0.4)",
                        }} />
                      )
                    ))}
                  </>
                )}

                {/* Screen edge guides — top & bottom safe area indicators */}
                {!isPlaying && (
                  <>
                    {/* Top edge */}
                    <div data-export-hide className="absolute left-0 right-0 top-0 pointer-events-none z-50" style={{ height: 1, background: "rgba(0,255,255,0.35)" }}>
                      <span className="absolute left-1 top-1 font-pressstart text-[6px] text-cyan-400/50 select-none">TOP</span>
                    </div>
                    {/* Bottom edge */}
                    <div data-export-hide className="absolute left-0 right-0 bottom-0 pointer-events-none z-50" style={{ height: 1, background: "rgba(0,255,255,0.35)" }}>
                      <span className="absolute left-1 bottom-1 font-pressstart text-[6px] text-cyan-400/50 select-none">BOTTOM</span>
                    </div>
                    {/* Top safe zone (5%) */}
                    <div data-export-hide className="absolute left-0 right-0 top-0 pointer-events-none z-50" style={{ height: "5%", borderBottom: "1px dashed rgba(0,255,255,0.15)" }}>
                      <span className="absolute right-1 bottom-0 font-pressstart text-[5px] text-cyan-400/25 select-none">SAFE</span>
                    </div>
                    {/* Bottom safe zone (5%) */}
                    <div data-export-hide className="absolute left-0 right-0 bottom-0 pointer-events-none z-50" style={{ height: "5%", borderTop: "1px dashed rgba(0,255,255,0.15)" }}>
                      <span className="absolute right-1 top-0 font-pressstart text-[5px] text-cyan-400/25 select-none">SAFE</span>
                    </div>
                  </>
                )}

                {displayScene?.textOverlay && displayScene.assetType !== "text_card" && (() => {
                  const style = sceneTextStyles[displayScene.id] || DEFAULT_TEXT_STYLE;
                  const posClass = style.position === "top" ? "top-4" : style.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-14";
                  const alignClass = style.textAlign === "left" ? "text-left items-start" : style.textAlign === "right" ? "text-right items-end" : "text-center items-center";
                  const animClass = getTextAnimClass(style.animation);
                  return (
                    <div className={cn("absolute inset-x-0 px-4 z-25 flex flex-col", posClass, alignClass)}>
                      <span className={cn(animClass)} style={{
                        fontFamily: style.fontFamily,
                        fontSize: `${style.fontSize}px`,
                        color: style.color,
                        fontWeight: style.bold ? 700 : 400,
                        fontStyle: style.italic ? "italic" : "normal",
                        WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
                        backgroundColor: style.bgOpacity > 0 ? `${style.bgColor}${Math.round(style.bgOpacity * 2.55).toString(16).padStart(2, "0")}` : undefined,
                        padding: style.bgOpacity > 0 ? "4px 10px" : undefined,
                        borderRadius: style.bgOpacity > 0 ? "6px" : undefined,
                        textAlign: style.textAlign,
                        lineHeight: 1.4,
                      }}>{displayScene.textOverlay}</span>
                    </div>
                  );
                })()}

                {/* Caption */}
                {displayScene?.caption && (
                  <div className="absolute bottom-10 inset-x-0 px-6 z-30 text-center">
                    <span className="font-pressstart text-[10px] text-white bg-black/60 px-3 py-1.5 rounded-lg">{displayScene.caption}</span>
                  </div>
                )}
                </div>{/* end camera Ken Burns wrapper */}

                {/* Loop indicator */}
                {isPlaying && (
                  <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1" data-export-hide>
                    <Repeat className="w-3 h-3 text-primary" /><span className="font-pressstart text-[9px] text-primary">{loopCount}</span>
                  </div>
                )}

                {/* Bottom info bar */}
                <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent z-20 flex items-end justify-between">
                  <div>
                    <div className="font-pressstart text-[10px] text-white truncate">{hop.title}</div>
                    <div className="font-pressstart text-[8px] text-white/50 mt-0.5">
                      {hop.type === "series" && hop.seriesTitle ? `${hop.seriesTitle} • EP ${hop.episodeNumber || 1}` : "Single"} • {totalSceneDuration}s
                    </div>
                  </div>
                  {lastSaveTime && (
                    <div className="flex items-center gap-1 text-white/30">
                      <Cloud className="w-2.5 h-2.5" />
                      <span className="font-pressstart text-[6px]">saved {lastSaveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL: Contextual — Layers + Properties ═══ */}
        <aside className="w-60 xl:w-68 flex flex-col shrink-0 overflow-hidden border-l border-border bg-card/50">
          {/* Layers header with add buttons */}
          <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
            <span className="font-pressstart text-[10px] text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> LAYERS
            </span>
            {selectedScene && (
              <div className="flex gap-0.5">
                {(["media", "text", "effect"] as const).map(t => (
                  <button key={t} onClick={() => addLayer(t)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={`Add ${t}`}>
                    {LAYER_ICONS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!selectedScene ? (
              <p className="font-pressstart text-[9px] text-muted-foreground text-center p-4">Select a scene</p>
            ) : currentSceneLayers.length === 0 ? (
              <div className="p-4 text-center space-y-3">
                <p className="font-pressstart text-[9px] text-muted-foreground">No layers yet</p>
                <div className="flex flex-col gap-1">
                  <button onClick={() => addLayer("media")}
                    className="py-2 rounded border border-dashed border-border hover:border-primary/30 font-pressstart text-[8px] text-muted-foreground flex items-center justify-center gap-1 transition-colors">
                    <Upload className="w-3 h-3" /> Upload Media
                  </button>
                  <button onClick={() => addLayer("text")}
                    className="py-2 rounded border border-dashed border-border hover:border-primary/30 font-pressstart text-[8px] text-muted-foreground flex items-center justify-center gap-1 transition-colors">
                    <Type className="w-3 h-3" /> Add Text
                  </button>
                  <button onClick={() => addLayer("effect")}
                    className="py-2 rounded border border-dashed border-border hover:border-primary/30 font-pressstart text-[8px] text-muted-foreground flex items-center justify-center gap-1 transition-colors">
                    <Sparkles className="w-3 h-3" /> Add Effect
                  </button>
                </div>
              </div>
            ) : (
              [...currentSceneLayers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
                <div key={layer.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("layerId", layer.id); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fromId = e.dataTransfer.getData("layerId");
                    if (fromId && fromId !== layer.id) reorderLayers(fromId, layer.id);
                  }}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 border-b border-border cursor-pointer transition-all",
                    selectedLayerId === layer.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"
                  )}>
                  <GripVertical className="w-3 h-3 text-muted-foreground/30 cursor-grab shrink-0" />
                  <span className="shrink-0 text-muted-foreground">{LAYER_ICONS[layer.type]}</span>
                  {layer.dataUrl && (
                    <div className="w-7 h-7 rounded bg-card border border-border overflow-hidden shrink-0">
                      <img src={layer.dataUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-pressstart text-[8px] text-foreground truncate">{layer.name}</p>
                    <p className="font-pressstart text-[7px] text-muted-foreground">{Math.round(layer.opacity * 100)}% • {layer.blendMode !== "normal" ? layer.blendMode : ""}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className="p-0.5 hover:bg-muted rounded-sm">
                      {layer.visible ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground/40" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} className="p-0.5 hover:bg-muted rounded-sm">
                      {layer.locked ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground/40" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }} className="p-0.5 hover:bg-primary/20 rounded-sm" title="Duplicate layer">
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="p-0.5 hover:bg-destructive/20 rounded-sm">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ═══ ONE-TAP VIBE MODES — the wow factor ═══ */}
          {hasContent && selectedScene && (
            <div className="border-t border-border p-2 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-pressstart text-[9px] text-foreground flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-primary" /> VIBE MODES
                </span>
                <button onClick={() => {
                  // Remove vibe from current scene
                  if (selectedScene) {
                    setSceneLayers(prev => ({
                      ...prev,
                      [selectedScene.id]: (prev[selectedScene.id] || []).filter(l => !l.name.startsWith("VIBE:")),
                    }));
                    toast.success("Vibe cleared");
                  }
                }} className="font-pressstart text-[7px] text-muted-foreground hover:text-destructive transition-colors">CLEAR</button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {VIBE_MODES.map(vibe => {
                  const isActive = currentSceneLayers.some(l => l.name === `VIBE: ${vibe.label}`);
                  return (
                    <button key={vibe.id} onClick={() => applyVibeMode(vibe.id)}
                      onContextMenu={(e) => { e.preventDefault(); applyVibeToAll(vibe.id); }}
                      className={cn(
                        "px-2 py-1.5 rounded-md font-pressstart text-[7px] border transition-all hover:scale-105",
                        isActive
                          ? "border-primary/50 bg-primary/15 text-primary shadow-sm shadow-primary/20"
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                      title={`Click: apply to scene • Right-click: apply to ALL`}>
                      <span className="text-xs">{vibe.emoji}</span>
                    </button>
                  );
                })}
              </div>
              <p className="font-pressstart text-[6px] text-muted-foreground/50 mt-1 text-center">tap = this scene • right-click = all scenes</p>
            </div>
          )}

          {/* ═══ CONTEXTUAL PROPERTIES ═══ */}
          <div className="border-t border-border shrink-0 max-h-[45%] overflow-y-auto">
            {/* SCENE properties — when no layer selected */}
            {rightContext === "scene" && selectedScene && (
              <div className="p-2.5 space-y-2">
                <span className="font-pressstart text-[9px] text-primary block">SCENE {selectedSceneIdx + 1}</span>

                {/* HOP Total Duration */}
                <div className="bg-secondary/50 rounded p-2 border border-border/30">
                  <span className="font-pressstart text-[7px] text-muted-foreground block mb-0.5">🎬 HOP LENGTH: {totalSceneDuration}s</span>
                  <p className="font-pressstart text-[6px] text-muted-foreground/60">{hop.scenes.length} scenes • {hop.scenes.map(s => `${s.duration}s`).join(" + ")}</p>
                </div>

                {/* Add background layer */}
                <span className="font-pressstart text-[7px] text-muted-foreground">ADD BACKGROUND</span>
                <button onClick={() => handleFileUpload("image/*,video/*,image/gif")}
                  className="w-full h-14 rounded-lg border border-dashed border-border hover:border-primary/30 flex items-center justify-center transition-colors overflow-hidden">
                  <span className="font-pressstart text-[8px] text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> + Add BG Layer</span>
                </button>

                {/* Scene Duration */}
                <div>
                  <span className={sLabel}>SCENE DURATION: {selectedScene.duration}s</span>
                  <Slider value={[selectedScene.duration]} min={1} max={60} step={0.5} onValueChange={([v]) => updateScene(selectedSceneIdx, { duration: v })} />
                </div>

                {/* Transition */}
                <div>
                  <span className={sLabel}>TRANSITION</span>
                  <div className="grid grid-cols-4 gap-1">
                    {TRANSITION_OPTIONS.map(t => (
                      <button key={t.id} onClick={() => updateScene(selectedSceneIdx, { transition: t.id })}
                        className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                          selectedScene.transition === t.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                        )}>{t.emoji}</button>
                    ))}
                  </div>
                </div>

                {/* Camera Pan/Zoom (Ken Burns) */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>📹 CAMERA MOTION</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {CAMERA_PRESETS.map(preset => {
                      const isActive = selectedScene.cameraStart?.x === preset.start.x &&
                        selectedScene.cameraStart?.y === preset.start.y &&
                        selectedScene.cameraStart?.zoom === preset.start.zoom;
                      return (
                        <button key={preset.id} onClick={() => updateScene(selectedSceneIdx, {
                          cameraStart: preset.start,
                          cameraEnd: preset.end,
                          cameraEasing: "ease-in-out",
                        } as any)}
                          className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                            isActive ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                          )}>{preset.label}</button>
                      );
                    })}
                  </div>
                  {selectedScene.cameraStart && (
                    <div className="mt-2 space-y-1.5">
                      <div>
                        <span className={sLabel}>START ZOOM: {(selectedScene.cameraStart?.zoom || 1).toFixed(1)}x</span>
                        <Slider value={[selectedScene.cameraStart?.zoom || 1]} min={0.5} max={2.5} step={0.05}
                          onValueChange={([v]) => updateScene(selectedSceneIdx, {
                            cameraStart: { ...(selectedScene.cameraStart || { x: 0, y: 0, zoom: 1 }), zoom: v }
                          } as any)} />
                      </div>
                      <div>
                        <span className={sLabel}>END ZOOM: {(selectedScene.cameraEnd?.zoom || 1).toFixed(1)}x</span>
                        <Slider value={[selectedScene.cameraEnd?.zoom || 1]} min={0.5} max={2.5} step={0.05}
                          onValueChange={([v]) => updateScene(selectedSceneIdx, {
                            cameraEnd: { ...(selectedScene.cameraEnd || { x: 0, y: 0, zoom: 1 }), zoom: v }
                          } as any)} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <span className={sLabel}>START X: {selectedScene.cameraStart?.x || 0}</span>
                          <Slider value={[selectedScene.cameraStart?.x || 0]} min={-30} max={30} step={1}
                            onValueChange={([v]) => updateScene(selectedSceneIdx, {
                              cameraStart: { ...(selectedScene.cameraStart || { x: 0, y: 0, zoom: 1 }), x: v }
                            } as any)} />
                        </div>
                        <div>
                          <span className={sLabel}>START Y: {selectedScene.cameraStart?.y || 0}</span>
                          <Slider value={[selectedScene.cameraStart?.y || 0]} min={-30} max={30} step={1}
                            onValueChange={([v]) => updateScene(selectedSceneIdx, {
                              cameraStart: { ...(selectedScene.cameraStart || { x: 0, y: 0, zoom: 1 }), y: v }
                            } as any)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <span className={sLabel}>END X: {selectedScene.cameraEnd?.x || 0}</span>
                          <Slider value={[selectedScene.cameraEnd?.x || 0]} min={-30} max={30} step={1}
                            onValueChange={([v]) => updateScene(selectedSceneIdx, {
                              cameraEnd: { ...(selectedScene.cameraEnd || { x: 0, y: 0, zoom: 1 }), x: v }
                            } as any)} />
                        </div>
                        <div>
                          <span className={sLabel}>END Y: {selectedScene.cameraEnd?.y || 0}</span>
                          <Slider value={[selectedScene.cameraEnd?.y || 0]} min={-30} max={30} step={1}
                            onValueChange={([v]) => updateScene(selectedSceneIdx, {
                              cameraEnd: { ...(selectedScene.cameraEnd || { x: 0, y: 0, zoom: 1 }), y: v }
                            } as any)} />
                        </div>
                      </div>
                      <div>
                        <span className={sLabel}>EASING</span>
                        <div className="flex gap-1">
                          {(["linear", "ease-in", "ease-out", "ease-in-out"] as const).map(e => (
                            <button key={e} onClick={() => updateScene(selectedSceneIdx, { cameraEasing: e } as any)}
                              className={cn("flex-1 py-1 rounded font-pressstart text-[6px] border transition-all",
                                (selectedScene as any).cameraEasing === e ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                              )}>{e.split("-").map(w => w[0].toUpperCase()).join("")}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <span className={sLabel}>CAPTION</span>
                  <input value={selectedScene.caption || ""} onChange={e => updateScene(selectedSceneIdx, { caption: e.target.value })}
                    className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1.5 rounded border border-border" placeholder="Optional..." />
                </div>

                {/* Text overlay */}
                <div>
                  <span className={sLabel}>TEXT OVERLAY</span>
                  <textarea value={selectedScene.textOverlay || ""} onChange={e => updateScene(selectedSceneIdx, { textOverlay: e.target.value })}
                    className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1.5 rounded border border-border resize-none" rows={2} placeholder="Add text over this scene..." />
                </div>

                {/* Scene Metadata */}
                <div className="border-t border-border/30 pt-2 space-y-1.5">
                  <span className={sLabel}>📋 SCENE METADATA</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="font-pressstart text-[6px] text-muted-foreground/60 block mb-0.5">MOOD</span>
                      <input value={(selectedScene as any).mood || ""} onChange={e => updateScene(selectedSceneIdx, { mood: e.target.value } as any)}
                        className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1.5 py-1 rounded border border-border" placeholder="dark, cinematic..." />
                    </div>
                    <div>
                      <span className="font-pressstart text-[6px] text-muted-foreground/60 block mb-0.5">CAMERA</span>
                      <input value={(selectedScene as any).cameraAngle || ""} onChange={e => updateScene(selectedSceneIdx, { cameraAngle: e.target.value } as any)}
                        className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1.5 py-1 rounded border border-border" placeholder="wide, close-up..." />
                    </div>
                    <div>
                      <span className="font-pressstart text-[6px] text-muted-foreground/60 block mb-0.5">LIGHTING</span>
                      <input value={(selectedScene as any).lighting || ""} onChange={e => updateScene(selectedSceneIdx, { lighting: e.target.value } as any)}
                        className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1.5 py-1 rounded border border-border" placeholder="neon, low-key..." />
                    </div>
                    <div>
                      <span className="font-pressstart text-[6px] text-muted-foreground/60 block mb-0.5">LOCATION</span>
                      <input value={(selectedScene as any).location || ""} onChange={e => updateScene(selectedSceneIdx, { location: e.target.value } as any)}
                        className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1.5 py-1 rounded border border-border" placeholder="rooftop, city..." />
                    </div>
                  </div>
                  <div>
                    <span className="font-pressstart text-[6px] text-muted-foreground/60 block mb-0.5">LYRICS / NOTES</span>
                    <input value={(selectedScene as any).lyricsSegment || ""} onChange={e => updateScene(selectedSceneIdx, { lyricsSegment: e.target.value } as any)}
                      className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1.5 py-1 rounded border border-border" placeholder="verse 1, bars 1-4..." />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-pressstart text-[8px] text-muted-foreground">LOOP THIS SCENE</span>
                  <button onClick={() => updateScene(selectedSceneIdx, { loopInScene: !selectedScene.loopInScene })}
                    className={cn("px-2 py-1 rounded font-pressstart text-[8px] border transition-all",
                      selectedScene.loopInScene ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>{selectedScene.loopInScene ? "🔁 ON" : "OFF"}</button>
                </div>
              </div>
            )}

            {/* TEXT LAYER properties — contextual */}
            {(rightContext === "text-layer") && selectedLayer && (
              <div className="p-2.5 space-y-2">
                <span className="font-pressstart text-[9px] text-primary block">✏️ TEXT LAYER</span>
                <input value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })}
                  className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1 rounded border border-border" />
                <textarea value={selectedLayer.text || ""} onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })}
                  className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1 rounded border border-border resize-none" rows={2} placeholder="Your text..." />

                {/* Font picker */}
                <div>
                  <span className={sLabel}>FONT</span>
                  <select value={selectedLayer.fontFamily || "Press Start 2P"} onChange={e => { updateLayer(selectedLayer.id, { fontFamily: e.target.value }); ensureFontLoaded(e.target.value); }}
                    className="w-full bg-secondary text-foreground font-pressstart text-[8px] px-2 py-1 rounded border border-border">
                    {FONT_CATEGORIES.map(cat => (
                      <optgroup key={cat.id} label={cat.label}>
                        {(cat.id === "all" ? ALL_FONT_NAMES : FONT_REGISTRY.filter(f => f.category === cat.id).map(f => f.name)).map(f => (
                          <option key={`${cat.id}-${f}`} value={f}>{f}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={sLabel}>SIZE: {selectedLayer.fontSize || 14}px</span>
                  <Slider value={[selectedLayer.fontSize || 14]} min={8} max={96} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { fontSize: v })} />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className={sLabel}>COLOR</span>
                    <input type="color" value={selectedLayer.fontColor || "#FFFFFF"} onChange={e => updateLayer(selectedLayer.id, { fontColor: e.target.value })}
                      className="w-full h-6 rounded border border-border cursor-pointer" />
                  </div>
                  <div>
                    <span className={sLabel}>STROKE</span>
                    <input type="color" value={selectedLayer.strokeColor || "#000000"} onChange={e => updateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                      className="w-full h-6 rounded border border-border cursor-pointer" />
                  </div>
                </div>
                <div>
                  <span className={sLabel}>STROKE WIDTH: {selectedLayer.strokeWidth || 0}px</span>
                  <Slider value={[selectedLayer.strokeWidth || 0]} min={0} max={8} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { strokeWidth: v })} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })}
                    className={cn("flex-1 py-1 rounded font-pressstart text-[8px] border transition-all",
                      selectedLayer.bold ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>B</button>
                  <button onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })}
                    className={cn("flex-1 py-1 rounded font-pressstart text-[8px] border transition-all italic",
                      selectedLayer.italic ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                    )}>I</button>
                </div>

                {/* Text Animation */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>✨ TEXT ANIMATION</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {TEXT_ANIMATIONS.map(a => (
                      <button key={a.id} onClick={() => updateLayer(selectedLayer.id, { textAnimation: a.id } as any)}
                        className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                          (selectedLayer as any).textAnimation === a.id || (!((selectedLayer as any).textAnimation) && a.id === "none")
                            ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                        )}>{a.icon} {a.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={sLabel}>OPACITY: {Math.round(selectedLayer.opacity * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity}
                    onChange={e => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1.5 accent-primary" />
                </div>
                <div>
                  <span className={sLabel}>BLEND MODE</span>
                  <select value={selectedLayer.blendMode || "normal"} onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value as HopBlendMode })}
                    className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-2 py-1 rounded border border-border">
                    {(["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"] as const).map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={sLabel}>SHADOW BLUR: {selectedLayer.shadowBlur || 0}px</span>
                  <Slider value={[selectedLayer.shadowBlur || 0]} min={0} max={50} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { shadowBlur: v })} />
                </div>
                {(selectedLayer.shadowBlur || 0) > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <span className={sLabel}>SHADOW COLOR</span>
                      <input type="color" value={selectedLayer.shadowColor || "#000000"} onChange={e => updateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                        className="w-full h-6 rounded border border-border cursor-pointer" />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <span className={sLabel}>X</span>
                        <input type="number" value={selectedLayer.shadowX || 0} onChange={e => updateLayer(selectedLayer.id, { shadowX: parseInt(e.target.value) || 0 })}
                          className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1 py-0.5 rounded border border-border text-center" />
                      </div>
                      <div className="flex-1">
                        <span className={sLabel}>Y</span>
                        <input type="number" value={selectedLayer.shadowY || 0} onChange={e => updateLayer(selectedLayer.id, { shadowY: parseInt(e.target.value) || 0 })}
                          className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-1 py-0.5 rounded border border-border text-center" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Motion Blur */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>💫 MOTION BLUR: {selectedLayer.motionBlur || 0}px</span>
                  <Slider value={[selectedLayer.motionBlur || 0]} min={0} max={20} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlur: v })} />
                  {(selectedLayer.motionBlur || 0) > 0 && (
                    <div className="mt-1">
                      <span className={sLabel}>ANGLE: {selectedLayer.motionBlurAngle || 0}°</span>
                      <Slider value={[selectedLayer.motionBlurAngle || 0]} min={0} max={360} step={15} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlurAngle: v })} />
                    </div>
                  )}
                </div>
                {/* Parallax Depth */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>🌊 PARALLAX DEPTH: {selectedLayer.parallaxDepth ?? 0}%</span>
                  <Slider value={[selectedLayer.parallaxDepth ?? 0]} min={0} max={100} step={5} onValueChange={([v]) => updateLayer(selectedLayer.id, { parallaxDepth: v })} />
                  <p className="font-mono text-[8px] text-muted-foreground/60 mt-0.5">0 = background (slow) • 100 = foreground (fast)</p>
                </div>
                {/* Beat React Toggle */}
                {hop.audioBpm && (
                  <div className="border-t border-border/30 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={sLabel}>🎵 BEAT REACT</span>
                      <button onClick={() => updateLayer(selectedLayer.id, { beatReact: (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "none" : "pulse", beatIntensity: selectedLayer.beatIntensity ?? 50 })}
                        className={cn("relative w-8 h-4 rounded-full transition-colors", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "bg-primary" : "bg-secondary border border-border")}>
                        <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "left-[17px] bg-primary-foreground" : "left-0.5 bg-muted-foreground")} />
                      </button>
                    </div>
                    {selectedLayer.beatReact && selectedLayer.beatReact !== "none" && (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          {BEAT_REACT_OPTIONS.filter(o => o.value !== "none").map(opt => (
                            <button key={opt.value} onClick={() => updateLayer(selectedLayer.id, { beatReact: opt.value })}
                              className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                                selectedLayer.beatReact === opt.value ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                              )}>{opt.icon} {opt.label}</button>
                          ))}
                        </div>
                        <div>
                          <span className={sLabel}>INTENSITY: {selectedLayer.beatIntensity ?? 50}%</span>
                          <input type="range" min={10} max={100} step={5} value={selectedLayer.beatIntensity ?? 50}
                            onChange={e => updateLayer(selectedLayer.id, { beatIntensity: parseInt(e.target.value) })} className="w-full h-1.5 accent-primary" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MEDIA LAYER properties */}
            {rightContext === "media-layer" && selectedLayer && (
              <div className="p-2.5 space-y-2">
                <span className="font-pressstart text-[9px] text-primary block">🖼️ MEDIA LAYER</span>
                <input value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })}
                  className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1 rounded border border-border" />
                <button onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*,video/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => updateLayer(selectedLayer.id, { dataUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }} className="w-full py-2 rounded border border-dashed border-border hover:border-primary/30 font-pressstart text-[8px] text-muted-foreground flex items-center justify-center gap-1 transition-colors">
                  <Upload className="w-3 h-3" /> Replace Media
                </button>
                {/* Object Fit */}
                <div>
                  <span className={sLabel}>FIT MODE</span>
                  <div className="flex gap-1">
                    {(["cover", "contain", "fill"] as const).map(f => (
                      <button key={f} onClick={() => updateLayer(selectedLayer.id, { objectFit: f })}
                        className={cn("flex-1 py-1 rounded font-pressstart text-[7px] border transition-all",
                          selectedLayer.objectFit === f ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                        )}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={sLabel}>OPACITY: {Math.round(selectedLayer.opacity * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity}
                    onChange={e => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1.5 accent-primary" />
                </div>
                <div>
                  <span className={sLabel}>BLEND MODE</span>
                  <select value={selectedLayer.blendMode || "normal"} onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value as HopBlendMode })}
                    className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-2 py-1 rounded border border-border">
                    {(["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"] as const).map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                {/* Motion Blur */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>💫 MOTION BLUR: {selectedLayer.motionBlur || 0}px</span>
                  <Slider value={[selectedLayer.motionBlur || 0]} min={0} max={20} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlur: v })} />
                  {(selectedLayer.motionBlur || 0) > 0 && (
                    <div className="mt-1">
                      <span className={sLabel}>ANGLE: {selectedLayer.motionBlurAngle || 0}°</span>
                      <Slider value={[selectedLayer.motionBlurAngle || 0]} min={0} max={360} step={15} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlurAngle: v })} />
                    </div>
                  )}
                </div>
                {/* Parallax Depth */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>🌊 PARALLAX DEPTH: {selectedLayer.parallaxDepth ?? 0}%</span>
                  <Slider value={[selectedLayer.parallaxDepth ?? 0]} min={0} max={100} step={5} onValueChange={([v]) => updateLayer(selectedLayer.id, { parallaxDepth: v })} />
                  <p className="font-mono text-[8px] text-muted-foreground/60 mt-0.5">0 = background (slow) • 100 = foreground (fast)</p>
                </div>
                {/* Beat React Toggle */}
                {hop.audioBpm && (
                  <div className="border-t border-border/30 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={sLabel}>🎵 BEAT REACT</span>
                      <button onClick={() => updateLayer(selectedLayer.id, { beatReact: (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "none" : "pulse", beatIntensity: selectedLayer.beatIntensity ?? 50 })}
                        className={cn("relative w-8 h-4 rounded-full transition-colors", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "bg-primary" : "bg-secondary border border-border")}>
                        <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "left-[17px] bg-primary-foreground" : "left-0.5 bg-muted-foreground")} />
                      </button>
                    </div>
                    {selectedLayer.beatReact && selectedLayer.beatReact !== "none" && (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          {BEAT_REACT_OPTIONS.filter(o => o.value !== "none").map(opt => (
                            <button key={opt.value} onClick={() => updateLayer(selectedLayer.id, { beatReact: opt.value })}
                              className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                                selectedLayer.beatReact === opt.value ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                              )}>{opt.icon} {opt.label}</button>
                          ))}
                        </div>
                        <div>
                          <span className={sLabel}>INTENSITY: {selectedLayer.beatIntensity ?? 50}%</span>
                          <input type="range" min={10} max={100} step={5} value={selectedLayer.beatIntensity ?? 50}
                            onChange={e => updateLayer(selectedLayer.id, { beatIntensity: parseInt(e.target.value) })} className="w-full h-1.5 accent-primary" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* EFFECT LAYER properties */}
            {rightContext === "effect-layer" && selectedLayer && (
              <div className="p-2.5 space-y-2">
                <span className="font-pressstart text-[9px] text-primary block">✨ EFFECT LAYER</span>
                <input value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })}
                  className="w-full bg-secondary text-foreground font-pressstart text-[9px] px-2 py-1 rounded border border-border" />
                {selectedLayer.dataUrl && (
                  <div className="w-full h-16 rounded border border-border overflow-hidden">
                    <img src={selectedLayer.dataUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <button onClick={() => setShowEffectPicker(true)}
                  className="w-full py-2 rounded border border-dashed border-primary/30 hover:border-primary/50 font-pressstart text-[8px] text-primary flex items-center justify-center gap-1 transition-colors bg-primary/5 hover:bg-primary/10">
                  <Sparkles className="w-3 h-3" /> {selectedLayer.dataUrl ? "SWAP EFFECT" : "PICK EFFECT"}
                </button>
                <div>
                  <span className={sLabel}>FIT MODE</span>
                  <div className="flex gap-1">
                    {(["cover", "contain", "fill"] as const).map(f => (
                      <button key={f} onClick={() => updateLayer(selectedLayer.id, { objectFit: f })}
                        className={cn("flex-1 py-1 rounded font-pressstart text-[7px] border transition-all",
                          selectedLayer.objectFit === f ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
                        )}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={sLabel}>OPACITY: {Math.round(selectedLayer.opacity * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity}
                    onChange={e => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1.5 accent-primary" />
                </div>
                <div>
                  <span className={sLabel}>BLEND MODE</span>
                  <select value={selectedLayer.blendMode || "normal"} onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value as HopBlendMode })}
                    className="w-full bg-secondary text-foreground font-pressstart text-[7px] px-2 py-1 rounded border border-border">
                    {(["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"] as const).map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                {/* Motion Blur */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>💫 MOTION BLUR: {selectedLayer.motionBlur || 0}px</span>
                  <Slider value={[selectedLayer.motionBlur || 0]} min={0} max={20} step={1} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlur: v })} />
                  {(selectedLayer.motionBlur || 0) > 0 && (
                    <div className="mt-1">
                      <span className={sLabel}>ANGLE: {selectedLayer.motionBlurAngle || 0}°</span>
                      <Slider value={[selectedLayer.motionBlurAngle || 0]} min={0} max={360} step={15} onValueChange={([v]) => updateLayer(selectedLayer.id, { motionBlurAngle: v })} />
                    </div>
                  )}
                </div>
                {/* Parallax Depth */}
                <div className="border-t border-border/30 pt-2">
                  <span className={sLabel}>🌊 PARALLAX DEPTH: {selectedLayer.parallaxDepth ?? 0}%</span>
                  <Slider value={[selectedLayer.parallaxDepth ?? 0]} min={0} max={100} step={5} onValueChange={([v]) => updateLayer(selectedLayer.id, { parallaxDepth: v })} />
                  <p className="font-mono text-[8px] text-muted-foreground/60 mt-0.5">0 = background (slow) • 100 = foreground (fast)</p>
                </div>
                {/* Beat React Toggle */}
                {hop.audioBpm && (
                  <div className="border-t border-border/30 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={sLabel}>🎵 BEAT REACT</span>
                      <button onClick={() => updateLayer(selectedLayer.id, { beatReact: (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "none" : "pulse", beatIntensity: selectedLayer.beatIntensity ?? 50 })}
                        className={cn("relative w-8 h-4 rounded-full transition-colors", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "bg-primary" : "bg-secondary border border-border")}>
                        <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", (selectedLayer.beatReact && selectedLayer.beatReact !== "none") ? "left-[17px] bg-primary-foreground" : "left-0.5 bg-muted-foreground")} />
                      </button>
                    </div>
                    {selectedLayer.beatReact && selectedLayer.beatReact !== "none" && (
                      <>
                        <div className="grid grid-cols-3 gap-1">
                          {BEAT_REACT_OPTIONS.filter(o => o.value !== "none").map(opt => (
                            <button key={opt.value} onClick={() => updateLayer(selectedLayer.id, { beatReact: opt.value })}
                              className={cn("py-1 rounded font-pressstart text-[6px] border transition-all",
                                selectedLayer.beatReact === opt.value ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                              )}>{opt.icon} {opt.label}</button>
                          ))}
                        </div>
                        <div>
                          <span className={sLabel}>INTENSITY: {selectedLayer.beatIntensity ?? 50}%</span>
                          <input type="range" min={10} max={100} step={5} value={selectedLayer.beatIntensity ?? 50}
                            onChange={e => updateLayer(selectedLayer.id, { beatIntensity: parseInt(e.target.value) })} className="w-full h-1.5 accent-primary" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {rightContext === "none" && (
              <div className="p-4 text-center">
                <p className="font-pressstart text-[9px] text-muted-foreground">Click a scene or layer to edit</p>
              </div>
            )}
          </div>
        </aside>
      </div>
      </CanvasContextMenu>

      {/* ═══ BOTTOM: AE-Style Multi-Track Timeline ═══ */}
      <HopTimeline
        scenes={hop.scenes}
        currentSceneIdx={selectedSceneIdx}
        previewSceneIdx={previewSceneIdx}
        isPlaying={isPlaying}
        loopCount={loopCount}
        totalDuration={totalSceneDuration}
        sceneLayers={sceneLayers}
        selectedLayerId={selectedLayerId}
        keyframes={currentSceneKeyframes}
        currentTime={currentTime}
        audioTrack={hop.audioTrack}
        audioWaveform={audioWaveform}
        isMuted={hop.previewSettings.mutedByDefault}
        audioClips={audioClips}
        onAudioClipsChange={setAudioClips}
        onTogglePlay={togglePlay}
        onSelectScene={(i) => { setSelectedSceneIdx(i); setSelectedLayerId(null); setCurrentTime(0); }}
        onAddScene={addScene}
        onReorderScenes={(from, to) => {
          setHop(prev => {
            const scenes = [...prev.scenes];
            const [moved] = scenes.splice(from, 1);
            scenes.splice(to, 0, moved);
            return { ...prev, scenes: scenes.map((s, idx) => ({ ...s, order: idx })), updatedAt: new Date().toISOString() };
          });
        }}
        onSelectLayer={setSelectedLayerId}
        onAddKeyframe={addKeyframe}
        onDeleteKeyframe={deleteKeyframe}
        onSetEasing={setKeyframeEasing}
        onSeek={(time) => {
          // Determine which scene this global time falls in
          let acc = 0;
          for (let i = 0; i < hop.scenes.length; i++) {
            if (time <= acc + hop.scenes[i].duration) {
              setSelectedSceneIdx(i);
              setCurrentTime(Math.max(0, time - acc));
              if (isPlaying) setPreviewSceneIdx(i);
              return;
            }
            acc += hop.scenes[i].duration;
          }
          setSelectedSceneIdx(hop.scenes.length - 1);
          setCurrentTime(hop.scenes[hop.scenes.length - 1]?.duration || 0);
        }}
        onToggleMute={() => updateHop({ previewSettings: { ...hop.previewSettings, mutedByDefault: !hop.previewSettings.mutedByDefault } })}
        onAudioUpload={handleAudioUpload}
      />

      {/* Projects Drawer */}
      <HopProjectsDrawer
        isOpen={showProjectsDrawer}
        onClose={() => setShowProjectsDrawer(false)}
        onLoadProject={loadProjectData}
        onNewProject={newProject}
        currentProjectId={cloudProjectId}
        getProjectData={getProjectData}
        getDataUrl={getDataUrl}
        projectTitle={hop.title}
        isLoggedIn={isLoggedIn}
      />

      {/* Effect Picker */}
      <HopEffectPicker
        isOpen={showEffectPicker}
        onClose={() => setShowEffectPicker(false)}
        onSelectEffect={addEffectFromPicker}
      />
    </div>
  );
};

export default HopBuilder;

```

---


## CSS Animations

Add these to your global CSS file (index.css or equivalent):

```css
/* ─── HOP Builder Transitions ─── */
.hop-transition-fade {
  animation: hop-fade 0.5s ease-in-out;
}
.hop-transition-zoom {
  animation: hop-zoom 0.5s ease-in-out;
}
.hop-transition-glitch {
  animation: hop-glitch 0.5s steps(6);
}
.hop-transition-wipe-left {
  animation: hop-wipe-left 0.6s ease-in-out;
}
.hop-transition-wipe-right {
  animation: hop-wipe-right 0.6s ease-in-out;
}
.hop-transition-wipe-up {
  animation: hop-wipe-up 0.6s ease-in-out;
}
.hop-transition-wipe-down {
  animation: hop-wipe-down 0.6s ease-in-out;
}
.hop-transition-iris {
  animation: hop-iris 0.6s ease-in-out;
}
.hop-transition-slide-left {
  animation: hop-slide-left 0.5s ease-in-out;
}
.hop-transition-slide-right {
  animation: hop-slide-right 0.5s ease-in-out;
}
.hop-transition-blur-through {
  animation: hop-blur-through 0.6s ease-in-out;
}

@keyframes hop-fade {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes hop-zoom {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes hop-glitch {
  0% { transform: translate(0); filter: none; }
  15% { transform: translate(-4px, 2px); filter: hue-rotate(90deg) saturate(3); }
  30% { transform: translate(3px, -3px); filter: hue-rotate(180deg); }
  45% { transform: translate(-2px, 1px); filter: hue-rotate(270deg) contrast(2); }
  60% { transform: translate(4px, -1px); filter: hue-rotate(45deg); }
  75% { transform: translate(-1px, 3px); filter: invert(0.3); }
  100% { transform: translate(0); filter: none; }
}
@keyframes hop-wipe-left {
  0% { clip-path: inset(0 0 0 0); }
  50% { clip-path: inset(0 100% 0 0); }
  51% { clip-path: inset(0 0 0 100%); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes hop-wipe-right {
  0% { clip-path: inset(0 0 0 0); }
  50% { clip-path: inset(0 0 0 100%); }
  51% { clip-path: inset(0 100% 0 0); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes hop-wipe-up {
  0% { clip-path: inset(0 0 0 0); }
  50% { clip-path: inset(0 0 100% 0); }
  51% { clip-path: inset(100% 0 0 0); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes hop-wipe-down {
  0% { clip-path: inset(0 0 0 0); }
  50% { clip-path: inset(100% 0 0 0); }
  51% { clip-path: inset(0 0 100% 0); }
  100% { clip-path: inset(0 0 0 0); }
}
@keyframes hop-iris {
  0% { clip-path: circle(100% at center); }
  50% { clip-path: circle(0% at center); }
  51% { clip-path: circle(0% at center); }
  100% { clip-path: circle(100% at center); }
}
@keyframes hop-slide-left {
  0% { transform: translateX(0); opacity: 1; }
  50% { transform: translateX(-100%); opacity: 0; }
  51% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes hop-slide-right {
  0% { transform: translateX(0); opacity: 1; }
  50% { transform: translateX(100%); opacity: 0; }
  51% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes hop-blur-through {
  0% { filter: blur(0px); opacity: 1; }
  50% { filter: blur(20px); opacity: 0.3; }
  100% { filter: blur(0px); opacity: 1; }
}

/* ─── Ken Burns Camera Animation ─── */
.hop-ken-burns {
  will-change: transform;
}

/* ─── HOP Text Animations ─── */
.hop-text-slide-up {
  display: inline-block;
  animation: hop-slide-up 0.6s ease-out both;
}
.hop-text-glitch {
  display: inline-block;
  animation: hop-text-glitch-anim 0.8s steps(4) infinite;
}
.hop-text-bounce {
  display: inline-block;
  animation: hop-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.hop-text-typewriter {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  animation: hop-typewriter-loop 4s steps(30) infinite, hop-blink-caret 0.75s step-end infinite;
  border-right: 3px solid currentColor;
}

@keyframes hop-slide-up {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes hop-text-glitch-anim {
  0% { transform: translate(0); text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; }
  25% { transform: translate(-2px, 1px); text-shadow: -2px 0 #ff0000, 2px 0 #00ffff; }
  50% { transform: translate(1px, -1px); text-shadow: 2px 2px #ff0000, -2px -2px #00ffff; }
  75% { transform: translate(-1px, 2px); text-shadow: -2px 2px #ff0000, 2px -2px #00ffff; }
  100% { transform: translate(0); text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; }
}
@keyframes hop-bounce {
  from { transform: translateY(-40px) scale(0.8); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes hop-typewriter-loop {
  0% { max-width: 0; }
  45% { max-width: 100%; }
  55% { max-width: 100%; }
  100% { max-width: 0; }
}
@keyframes hop-blink-caret {
  from, to { border-color: currentColor; }
  50% { border-color: transparent; }
}

/* ─── Extra HOP Text Animations ─── */
.hop-text-wave {
  display: inline-block;
  animation: hop-wave 1.2s ease-in-out infinite alternate;
}
.hop-text-neon-flicker {
  display: inline-block;
  animation: hop-neon-flicker 1.5s ease-in-out infinite;
}
.hop-text-zoom-in {
  display: inline-block;
  animation: hop-zoom-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.hop-text-spin-in {
  display: inline-block;
  animation: hop-spin-in 0.6s ease-out both;
}
.hop-text-shake {
  display: inline-block;
  animation: hop-text-shake-anim 0.4s ease-in-out infinite;
}
.hop-text-rainbow {
  animation: hop-rainbow 3s linear infinite;
  background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes hop-wave {
  0% { transform: translateY(0) rotate(-1deg); }
  100% { transform: translateY(-8px) rotate(1deg); }
}
@keyframes hop-neon-flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { text-shadow: 0 0 7px currentColor, 0 0 10px currentColor, 0 0 21px currentColor, 0 0 42px currentColor; opacity: 1; }
  20%, 24%, 55% { text-shadow: none; opacity: 0.6; }
}
@keyframes hop-zoom-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes hop-spin-in {
  from { transform: rotate(-360deg) scale(0); opacity: 0; }
  to { transform: rotate(0) scale(1); opacity: 1; }
}
@keyframes hop-text-shake-anim {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px) rotate(-1deg); }
  75% { transform: translateX(4px) rotate(1deg); }
}
@keyframes hop-rainbow {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

/* ─── Beat-reactive canvas pulse ─── */
@keyframes hop-beat-pulse {
  0%, 100% { box-shadow: 0 0 20px 1px hsl(var(--primary) / 0.15), 0 25px 60px -12px rgba(0,0,0,0.5); }
  50% { box-shadow: 0 0 40px 4px hsl(var(--primary) / 0.35), 0 25px 60px -12px rgba(0,0,0,0.5); }
}

/* ─── Beat-reactive layer animations ─── */
@keyframes hop-beat-pulse-layer {
  0%, 100% { transform: var(--hop-base-transform) scale(1); }
  15% { transform: var(--hop-base-transform) scale(calc(1 + var(--hop-beat-intensity, 0.08))); }
  40% { transform: var(--hop-base-transform) scale(1); }
}
@keyframes hop-beat-bounce {
  0%, 100% { transform: var(--hop-base-transform) translateY(0); }
  15% { transform: var(--hop-base-transform) translateY(calc(-1 * var(--hop-beat-px, 6px))); }
  40% { transform: var(--hop-base-transform) translateY(0); }
}
@keyframes hop-beat-shake {
  0%, 100% { transform: var(--hop-base-transform) translateX(0); }
  10% { transform: var(--hop-base-transform) translateX(calc(-1 * var(--hop-beat-px, 4px))); }
  20% { transform: var(--hop-base-transform) translateX(var(--hop-beat-px, 4px)); }
  30% { transform: var(--hop-base-transform) translateX(calc(-0.5 * var(--hop-beat-px, 4px))); }
  40% { transform: var(--hop-base-transform) translateX(0); }
}
@keyframes hop-beat-glow {
  0%, 100% { filter: var(--hop-base-filter, none) brightness(1); }
  15% { filter: var(--hop-base-filter, none) brightness(calc(1 + var(--hop-beat-intensity, 0.3))); }
  40% { filter: var(--hop-base-filter, none) brightness(1); }
}
@keyframes hop-beat-zoom {
  0%, 100% { transform: var(--hop-base-transform) scale(1); }
  15% { transform: var(--hop-base-transform) scale(calc(1 + var(--hop-beat-intensity, 0.15))); }
  50% { transform: var(--hop-base-transform) scale(1); }
}
@keyframes hop-beat-rotate {
  0%, 100% { transform: var(--hop-base-transform) rotate(0deg); }
  15% { transform: var(--hop-base-transform) rotate(calc(var(--hop-beat-deg, 3deg))); }
  30% { transform: var(--hop-base-transform) rotate(calc(-0.5 * var(--hop-beat-deg, 3deg))); }
  45% { transform: var(--hop-base-transform) rotate(0deg); }
}
@keyframes hop-beat-flash {
  0%, 100% { opacity: var(--hop-base-opacity, 1); }
  10% { opacity: calc(var(--hop-base-opacity, 1) * (1 - var(--hop-beat-intensity, 0.4))); }
  25% { opacity: var(--hop-base-opacity, 1); }
}
@keyframes hop-beat-tilt {
  0%, 100% { transform: var(--hop-base-transform) perspective(400px) rotateX(0deg); }
  15% { transform: var(--hop-base-transform) perspective(400px) rotateX(calc(var(--hop-beat-deg, 5deg))); }
  40% { transform: var(--hop-base-transform) perspective(400px) rotateX(0deg); }
}
```

---

## Dependencies

These npm packages are required:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.462.0",
    "sonner": "^1.7.4",
    "framer-motion": "^12.34.0",
    "html-to-image": "^1.11.13",
    "gifenc": "^1.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@supabase/supabase-js": "^2.97.0"
  }
}
```

### Key External Dependencies Used by HOPs:
- **html-to-image** (`toPng`) — Canvas snapshot for thumbnails & PNG export
- **gifenc** (`GIFEncoder, quantize, applyPalette`) — GIF export
- **MediaRecorder API** (browser built-in) — WebM/MP4 video export
- **Web Audio API** (browser built-in) — Gapless audio looping & waveform generation
- **IndexedDB** (browser built-in) — Local asset library storage

### Shared Components Referenced (implement or stub):
- `ModeHeader` — Top header bar with import button
- `SendToMenu` — "Send to" dropdown for cross-mode asset sharing
- `SaveToLibraryButton` — Quick-save to local asset library
- `CanvasContextMenu` — Right-click context menu wrapper
- `ZoomControls` — Zoom in/out/reset buttons
- `Tip` — Tooltip wrapper (uses Radix Tooltip)
- `Slider` — shadcn/ui slider (uses Radix Slider)
- `useCanvasZoom` — Hook for Ctrl+scroll zoom
- `useUndoRedo` — Undo/redo state management
- `useSyncToCoMiXX` — Sync to CoMiXX platform
- `useUser` — User authentication context
- `useAssetLibrary` — IndexedDB-based local asset library
- `ensureFontLoaded` from `@/data/fonts` — Dynamic Google Fonts loader

---

## Implementation Notes for Replit

1. **NEVER crop images** — All media uses `objectFit: "contain"` by default
2. **Layer z-index swap** — `reorderLayers()` swaps z-index values by ID, not array position
3. **Background detection** — `isSceneBackgroundLayer()` matches `layer.dataUrl === scene.assetUrl`
4. **Typewriter loop** — CSS animation cycles: type in → hold → erase → repeat (4s infinite)
5. **Beat React** — CSS custom properties (`--hop-beat-intensity`, `--hop-beat-px`, `--hop-beat-deg`) drive the animation amplitude
6. **Zone Out mode** — Fullscreen immersive playback with viral metrics HUD (watch time + loop count + "Fall-In" score)
7. **Moving HOP scroll** — Uses `requestAnimationFrame` with `translateX(-offset)` on a container div, parallax via `sin(offset * 0.005) * 60 * (depth/100)`
8. **Export pipeline** — Strips UI elements via `data-export-hide` attribute filter in `toPng()`
9. **Autosave** — localStorage every 30s + manual save to IndexedDB library + cloud save via Supabase

