export type HopProjectType = "single" | "series";
export type HopClipLength = "30s" | "90s" | "custom";
export type HopLoopMode = "single_loop" | "full_series_loop" | "manual_advance";
export type HopVisibility = "private" | "unlisted" | "public";
export type HopSyncStatus = "draft" | "queued" | "published" | "failed";
export type HopSceneAssetType = "image" | "gif" | "video" | "text_card" | "motion_scene";
export type HopTransition = "cut" | "fade" | "zoom" | "glitch" | "wipe-left" | "wipe-right" | "wipe-up" | "wipe-down" | "iris" | "slide-left" | "slide-right" | "blur-through";

export interface HopCameraKeyframe {
  x: number;
  y: number;
  zoom: number;
}

export interface HopScene {
  id: string;
  order: number;
  assetType: HopSceneAssetType;
  assetUrl?: string;
  textOverlay?: string;
  caption?: string;
  duration: number;
  transition: HopTransition;
  loopInScene: boolean;
  effects: string[];
  cameraStart?: HopCameraKeyframe;
  cameraEnd?: HopCameraKeyframe;
  cameraEasing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
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
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  objectFit: "cover" | "contain" | "fill";
  blendMode: HopBlendMode;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bold?: boolean;
  italic?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  beatReact?: HopBeatReactType;
  beatIntensity?: number;
  textAnimation?: "none" | "typewriter" | "fade-in" | "slide-up" | "glitch" | "bounce" | "wave" | "neon-flicker" | "zoom-in" | "spin-in" | "shake" | "rainbow";
  motionBlur?: number;
  motionBlurAngle?: number;
  parallaxDepth?: number;
  stitchMode?: boolean;
  stitchRepeat?: number;
}

export type HopEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic";

export interface HopKeyframe {
  id: string;
  time: number;
  property: string;
  value: number;
  easing: HopEasing;
}

export interface HopLayerKeyframes {
  [layerId: string]: HopKeyframe[];
}

export interface HopAudioClip {
  id: string;
  name: string;
  dataUrl: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  muted: boolean;
  color: string;
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

export const CAMERA_PRESETS = [
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

export const VIBE_MODES = [
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

export const TRANSITION_OPTIONS: { id: HopTransition; label: string; emoji: string }[] = [
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

export const BEAT_REACT_OPTIONS: { value: HopBeatReactType; label: string; icon: string }[] = [
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

export const TEXT_ANIMATIONS = [
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

export function getTextAnimClass(anim?: string): string {
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

export function getBeatReactStyle(layer: HopLayer, bpm: number | null, isPlaying: boolean): React.CSSProperties {
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

export function getCameraStyle(scene: any, progress: number): React.CSSProperties {
  if (!scene?.cameraStart && !scene?.cameraEnd) return {};
  const start = scene.cameraStart || { x: 0, y: 0, zoom: 1 };
  const end = scene.cameraEnd || { x: 0, y: 0, zoom: 1 };
  const x = start.x + (end.x - start.x) * progress;
  const y = start.y + (end.y - start.y) * progress;
  const zoom = start.zoom + (end.zoom - start.zoom) * progress;
  return {
    transform: `translate(${x}%, ${y}%) scale(${zoom})`,
    transformOrigin: "center center",
    transition: "none",
  };
}

export function isSceneBackgroundLayer(scene: { assetUrl?: string }, layer: HopLayer): boolean {
  return layer.type === "media" && Boolean(scene.assetUrl) && layer.dataUrl === scene.assetUrl;
}

export function getHopLayerShellStyle(scene: { assetUrl?: string }, layer: HopLayer, parallaxShift = 0): React.CSSProperties {
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

export function getMotionBlurFilter(layer: HopLayer): string {
  if (!layer.motionBlur || layer.motionBlur <= 0) return "";
  return `blur(${layer.motionBlur}px)`;
}

export const VIDEO_SOURCE_REGEX = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
export function isVideoSource(url?: string): boolean {
  if (!url) return false;
  return url.startsWith("data:video/") || VIDEO_SOURCE_REGEX.test(url);
}
