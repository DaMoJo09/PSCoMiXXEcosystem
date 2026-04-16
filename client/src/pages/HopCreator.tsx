import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Play, Pause, Repeat,
  Music, Image as ImageIcon, Film, Type, GripVertical,
  Volume2, VolumeX, ChevronUp, ChevronDown, Eye, X, EyeOff,
  Zap, Clock, Sparkles, Settings2, Loader2, Download,
  Maximize2, SkipForward, SkipBack, FolderOpen, Search,
  Lock, Unlock, Copy, Layers, Monitor, Smartphone, Tablet, Square,
  Palette, Wand2, LayoutGrid, Timer, PenTool, FileText, Expand, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useProjects, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { apiRequest } from "@/lib/queryClient";
import { saveProjectWithOfflineFallback } from "@/lib/offlineStorage";
import type { HopScene, HopData, Project } from "@shared/schema";
import HopStudioCanvas from "@/components/hop/HopStudioCanvas";
import type { CanvasNode, CanvasConnection, CanvasStickyNote, CanvasReferenceImage } from "@/components/hop/HopStudioCanvas";
import HopWaveformTimeline from "@/components/hop/HopWaveformTimeline";
import HopExportPanel from "@/components/hop/HopExportPanel";
import HopStitchMode from "@/components/hop/HopStitchMode";
import type { StitchSegment } from "@/components/hop/HopStitchMode";
import HopPanPlayer from "@/components/hop/HopPanPlayer";
import type { ParallaxLayer } from "@/components/hop/HopPanPlayer";
import SendToMenu from "@/components/ecosystem/SendToMenu";
import { SCENE_TEMPLATES, SOUND_PACKS, CAMERA_ANGLES, LIGHTING_PRESETS, MOOD_PRESETS } from "@/components/hop/hopSceneTemplates";

type HopLayer = {
  id: string;
  name: string;
  type: "media" | "text" | "effect" | "caption";
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
  blendMode: string;
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
  beatReact?: string;
  beatIntensity?: number;
  textAnimation?: string;
  motionBlur?: number;
  parallaxDepth?: number;
  stitchMode?: boolean;
  stitchRepeat?: number;
};

type TextOverlayStyle = {
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
  animation: string;
};

type HopAudioClip = {
  id: string;
  name: string;
  dataUrl: string;
  startTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  color: string;
};

type ViewportMode = "desktop" | "mobile" | "tablet" | "square";
type DisplayMode = "standard" | "moving";
type ScrollDirection = "forward" | "backward";
type HopMode = "still" | "pan" | "video";

const VIEWPORT_SIZES: Record<ViewportMode, { w: number; h: number; label: string }> = {
  desktop: { w: 800, h: 500, label: "16:9" },
  mobile: { w: 280, h: 500, label: "9:16" },
  tablet: { w: 450, h: 500, label: "4:3" },
  square: { w: 500, h: 500, label: "1:1" },
};

const TRANSITIONS = [
  { id: "cut", label: "✕", color: "bg-zinc-700" },
  { id: "fade", label: "■", color: "bg-zinc-600" },
  { id: "slide-left", label: "←", color: "bg-zinc-700" },
  { id: "slide-right", label: "→", color: "bg-zinc-700" },
  { id: "slide-up", label: "↑", color: "bg-zinc-700" },
  { id: "dissolve", label: "◌", color: "bg-zinc-700" },
  { id: "wipe-left", label: "◄", color: "bg-zinc-700" },
  { id: "wipe-right", label: "►", color: "bg-zinc-700" },
  { id: "wipe-up", label: "▲", color: "bg-zinc-700" },
  { id: "wipe-down", label: "▼", color: "bg-zinc-700" },
  { id: "iris", label: "◉", color: "bg-zinc-700" },
  { id: "zoom", label: "⊕", color: "bg-zinc-700" },
  { id: "blur-through", label: "◈", color: "bg-zinc-700" },
  { id: "spin", label: "↻", color: "bg-zinc-700" },
  { id: "glitch", label: "⚡", color: "bg-zinc-700" },
  { id: "flash", label: "✦", color: "bg-zinc-700" },
] as const;

const CAMERA_PRESETS = [
  { id: "none", label: "NONE", start: { x: 0, y: 0, zoom: 1 }, end: { x: 0, y: 0, zoom: 1 } },
  { id: "zoom-in", label: "ZOOM IN", start: { x: 0, y: 0, zoom: 1 }, end: { x: 0, y: 0, zoom: 1.4 } },
  { id: "zoom-out", label: "ZOOM OUT", start: { x: 0, y: 0, zoom: 1.4 }, end: { x: 0, y: 0, zoom: 1 } },
  { id: "pan-left", label: "PAN LEFT", start: { x: 10, y: 0, zoom: 1.2 }, end: { x: -10, y: 0, zoom: 1.2 } },
  { id: "pan-right", label: "PAN RIGHT", start: { x: -10, y: 0, zoom: 1.2 }, end: { x: 10, y: 0, zoom: 1.2 } },
  { id: "pan-up", label: "PAN UP", start: { x: 0, y: 5, zoom: 1.2 }, end: { x: 0, y: -5, zoom: 1.2 } },
  { id: "pan-down", label: "PAN DOWN", start: { x: 0, y: -5, zoom: 1.2 }, end: { x: 0, y: 5, zoom: 1.2 } },
  { id: "drift-nw", label: "DRIFT NW", start: { x: 5, y: 5, zoom: 1.15 }, end: { x: -5, y: -5, zoom: 1.3 } },
  { id: "drift-se", label: "DRIFT SE", start: { x: -5, y: -5, zoom: 1.3 }, end: { x: 5, y: 5, zoom: 1.15 } },
] as const;

function getCameraStyle(scene: HopScene, progress: number): React.CSSProperties {
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

const TEXT_PRESETS = [
  { id: "subtitle", label: "SUBTITLE", font: "'Press Start 2P', monospace", size: 12, color: "#FFFFFF", stroke: "#000000", strokeW: 0, bgColor: "#000000", bgOpacity: 60, anim: "none" },
  { id: "title", label: "TITLE", font: "'Bangers', cursive", size: 32, color: "#FFD700", stroke: "#000000", strokeW: 3, bgColor: "#000000", bgOpacity: 0, anim: "none" },
  { id: "shout", label: "SHOUT", font: "'Anton', sans-serif", size: 48, color: "#FF0000", stroke: "#FFFFFF", strokeW: 4, bgColor: "#000000", bgOpacity: 0, anim: "shake" },
  { id: "whisper", label: "WHISPER", font: "'Press Start 2P', monospace", size: 10, color: "#999999", stroke: "#000000", strokeW: 0, bgColor: "#000000", bgOpacity: 30, anim: "fade-in" },
  { id: "neon", label: "NEON", font: "'Audiowide', cursive", size: 24, color: "#00FFFF", stroke: "#FF00FF", strokeW: 2, bgColor: "#000000", bgOpacity: 0, anim: "neon-flicker" },
  { id: "comic", label: "COMIC", font: "'Bangers', cursive", size: 28, color: "#FFFFFF", stroke: "#000000", strokeW: 4, bgColor: "#FF0000", bgOpacity: 80, anim: "bounce" },
];

const TEXT_ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "typewriter", label: "Typewriter" },
  { id: "fade-in", label: "Fade In" },
  { id: "slide-up", label: "Slide Up" },
  { id: "glitch", label: "Glitch" },
  { id: "bounce", label: "Bounce" },
  { id: "wave", label: "Wave" },
  { id: "neon-flicker", label: "Neon" },
  { id: "zoom-in", label: "Zoom In" },
  { id: "spin-in", label: "Spin In" },
  { id: "shake", label: "Shake" },
  { id: "rainbow", label: "Rainbow" },
];

const VIBE_MODES = [
  { id: "lofi-chill", label: "LO-FI CHILL", colors: ["rgba(128,0,255,0.25)", "transparent"], blend: "screen" },
  { id: "golden-hour", label: "GOLDEN HOUR", colors: ["rgba(255,165,0,0.35)", "rgba(255,69,0,0.15)"], blend: "overlay" },
  { id: "cyberpunk", label: "CYBERPUNK", colors: ["rgba(0,255,255,0.2)", "rgba(255,0,255,0.25)"], blend: "screen" },
  { id: "noir", label: "NOIR", colors: ["rgba(0,0,0,0.5)", "transparent"], blend: "multiply" },
  { id: "anime-pop", label: "ANIME POP", colors: ["rgba(255,105,180,0.3)", "rgba(255,255,0,0.15)"], blend: "screen" },
  { id: "vintage", label: "VINTAGE", colors: ["rgba(139,90,43,0.25)", "rgba(210,180,140,0.2)"], blend: "overlay" },
  { id: "ice-cold", label: "ICE COLD", colors: ["rgba(0,191,255,0.3)", "rgba(173,216,230,0.1)"], blend: "screen" },
  { id: "fire", label: "FIRE", colors: ["rgba(255,69,0,0.4)", "rgba(255,165,0,0.15)"], blend: "screen" },
  { id: "dream", label: "DREAM", colors: ["rgba(255,182,193,0.3)", "rgba(176,224,230,0.2)"], blend: "screen" },
  { id: "matrix", label: "MATRIX", colors: ["rgba(0,255,0,0.15)", "rgba(0,100,0,0.25)"], blend: "screen" },
];

const BLEND_MODES = ["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"];

const BEAT_REACT_MODES = [
  { id: "none", label: "None" },
  { id: "pulse", label: "Pulse" },
  { id: "bounce", label: "Bounce" },
  { id: "shake", label: "Shake" },
  { id: "glow", label: "Glow" },
  { id: "zoom", label: "Zoom" },
  { id: "rotate", label: "Rotate" },
  { id: "flash", label: "Flash" },
  { id: "tilt", label: "Tilt" },
];

const FONT_FAMILIES = [
  "'Press Start 2P', monospace",
  "'Bangers', cursive",
  "'Anton', sans-serif",
  "'Audiowide', cursive",
  "'Space Grotesk', sans-serif",
  "'Inter', sans-serif",
  "'JetBrains Mono', monospace",
  "serif",
  "sans-serif",
  "monospace",
];

function generateId(prefix = "scene") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultScene(order: number): HopScene {
  return {
    id: generateId(),
    order,
    assetType: "image",
    duration: 5,
    transition: "cut",
    loopInScene: false,
  };
}

function createDefaultLayer(type: HopLayer["type"], name: string, zIndex: number): HopLayer {
  return {
    id: generateId("layer"),
    name,
    type,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    objectFit: "contain",
    blendMode: "normal",
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 14,
    fontColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 2,
    bold: false,
    italic: false,
    textAnimation: "none",
    beatReact: "none",
    beatIntensity: 50,
  };
}

function defaultTextStyle(): TextOverlayStyle {
  return {
    fontFamily: "'Press Start 2P', monospace",
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
}

function generateVibeGradient(colors: string[]): string {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(200, 200, 0, 200, 200, 280);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1] || "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);
  return canvas.toDataURL("image/png");
}

export default function HopCreator() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectId = params.get("id");

  const { data: existingProject } = useProject(projectId || "");
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("Untitled HOP");
  const [description, setDescription] = useState("");
  const [hopType, setHopType] = useState<"single" | "series">("single");
  const [clipLengthMode, setClipLengthMode] = useState<"30s" | "60s" | "90s" | "120s" | "custom">("30s");
  const [loopMode, setLoopMode] = useState<"single_loop" | "full_series_loop" | "manual_advance">("single_loop");
  const [scenes, setScenes] = useState<HopScene[]>([createDefaultScene(0)]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("private");

  const [audioTrack, setAudioTrack] = useState<{
    src: string; name: string; volume: number; loop: boolean; bpm?: number;
  } | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioBpm, setAudioBpm] = useState<number | null>(null);

  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const layerClipboardRef = useRef<HopLayer | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoneOutMode, setZoneOutMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [effectiveProjectId, setEffectiveProjectId] = useState<string | null>(projectId);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<string>("all");
  const [pickerSearch, setPickerSearch] = useState("");

  const [sceneLayers, setSceneLayers] = useState<Record<string, HopLayer[]>>({});
  const [sceneTextStyles, setSceneTextStyles] = useState<Record<string, TextOverlayStyle>>({});
  const [audioClips, setAudioClips] = useState<HopAudioClip[]>([]);

  const [hopMode, setHopMode] = useState<HopMode>("still");
  const [viewportMode, setViewportMode] = useState<ViewportMode>("mobile");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("standard");
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("forward");
  const [stitchSegments, setStitchSegments] = useState<StitchSegment[]>([]);
  const [parallaxLayers, setParallaxLayers] = useState<ParallaxLayer[]>([]);
  const [panoramaUrl, setPanoramaUrl] = useState<string>("");
  const [panoramaWidth, setPanoramaWidth] = useState(0);
  const [showSendTo, setShowSendTo] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const [leftTab, setLeftTab] = useState<"scenes" | "audio" | "vibes">("scenes");
  const [rightContext, setRightContext] = useState<"scene" | "layer">("scene");
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [viewMode, setViewMode] = useState<"builder" | "canvas" | "timeline" | "stitch">("builder");
  const [workflowTab, setWorkflowTab] = useState<"create" | "enhance" | "publish">("create");
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem("hop-builder-welcomed"); } catch { return true; }
  });
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [screensaverMode, setScreensaverMode] = useState(false);
  const [playbackElapsed, setPlaybackElapsed] = useState(0);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [zoneOutFullFill, setZoneOutFullFill] = useState(true);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasConnections, setCanvasConnections] = useState<CanvasConnection[]>([]);
  const [canvasStickyNotes, setCanvasStickyNotes] = useState<CanvasStickyNote[]>([]);
  const [canvasReferenceImages, setCanvasReferenceImages] = useState<CanvasReferenceImage[]>([]);
  const [canvasAnnotations, setCanvasAnnotations] = useState<{ points: { x: number; y: number }[]; color: string; width: number }[]>([]);
  const [beatMarkers, setBeatMarkers] = useState<{ id: string; timePosition: number; label?: string; autoDetected: boolean }[]>([]);
  const [showSceneTemplates, setShowSceneTemplates] = useState(false);
  const [transitionClass, setTransitionClass] = useState("");
  const [cameraProgress, setCameraProgress] = useState(0);
  const cameraRafRef = useRef<number | null>(null);
  const [dragReorderLayerId, setDragReorderLayerId] = useState<string | null>(null);
  const [timelineDragSceneId, setTimelineDragSceneId] = useState<string | null>(null);
  const [timelineDragOverIdx, setTimelineDragOverIdx] = useState<number | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"above" | "below">("above");

  const { data: allProjects } = useProjects(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const clipAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPlayIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const layerFileRef = useRef<HTMLInputElement>(null);

  const currentScene = scenes[selectedSceneIdx];
  const currentSceneId = currentScene?.id || "";
  const currentLayers = sceneLayers[currentSceneId] || [];
  const selectedLayer = currentLayers.find(l => l.id === selectedLayerId);
  const currentTextStyle = sceneTextStyles[currentSceneId] || defaultTextStyle();
  const viewport = VIEWPORT_SIZES[viewportMode];
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const targetDuration = clipLengthMode === "30s" ? 30 : clipLengthMode === "60s" ? 60 : clipLengthMode === "90s" ? 90 : clipLengthMode === "120s" ? 120 : null;

  const startGaplessAudio = useCallback(async () => {
    if (!audioTrack) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      if (!audioBufferRef.current) {
        const resp = await fetch(audioTrack.src);
        const arr = await resp.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(arr);
      }
      try { audioSourceRef.current?.stop(); } catch {}
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = audioTrack.loop;
      if (!audioGainRef.current) {
        audioGainRef.current = ctx.createGain();
        audioGainRef.current.connect(ctx.destination);
      }
      audioGainRef.current.gain.value = audioTrack.volume;
      source.connect(audioGainRef.current);
      source.start(0);
      audioSourceRef.current = source;
    } catch {
      const el = audioRef.current;
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    }
  }, [audioTrack]);

  const stopGaplessAudio = useCallback(() => {
    try { audioSourceRef.current?.stop(); } catch {}
    audioSourceRef.current = null;
    audioRef.current?.pause();
  }, []);

  useEffect(() => { audioBufferRef.current = null; }, [audioTrack]);

  useEffect(() => {
    if (audioGainRef.current && audioTrack) {
      audioGainRef.current.gain.value = audioMuted ? 0 : audioTrack.volume;
    }
  }, [audioMuted, audioTrack]);

  const startAudioFromBeginning = useCallback(() => {
    startGaplessAudio();
  }, [startGaplessAudio]);

  const resumeAudio = useCallback(() => {
    if (audioSourceRef.current) {
      if (audioGainRef.current && audioTrack) audioGainRef.current.gain.value = audioTrack.volume;
      return;
    }
    startGaplessAudio();
  }, [startGaplessAudio, audioTrack]);

  const pauseAudioNow = useCallback(() => {
    audioPlayIdRef.current++;
    stopGaplessAudio();
  }, [stopGaplessAudio]);

  useEffect(() => {
    if (existingProject) {
      setTitle(existingProject.title || "Untitled HOP");
      const data = existingProject.data as any;
      if (data) {
        if (data.type) setHopType(data.type);
        if (data.clipLengthMode) setClipLengthMode(data.clipLengthMode);
        if (data.loopMode) setLoopMode(data.loopMode);
        if (data.scenes?.length) setScenes(data.scenes);
        if (data.tags) setTags(data.tags);
        if (data.visibility) setVisibility(data.visibility);
        if (data.audioTrack) setAudioTrack(data.audioTrack);
        if (data.sceneLayers) setSceneLayers(data.sceneLayers);
        if (data.sceneTextStyles) setSceneTextStyles(data.sceneTextStyles);
        if (data.audioClips) setAudioClips(data.audioClips);
        if (data.displayMode) setDisplayMode(data.displayMode);
        if (data.hopMode) setHopMode(data.hopMode);
        if (data.stitchSegments) setStitchSegments(data.stitchSegments);
        if (data.parallaxLayers) setParallaxLayers(data.parallaxLayers);
        if (data.panoramaUrl) { setPanoramaUrl(data.panoramaUrl); setPanoramaWidth(data.panoramaWidth || 0); }
        if (data.canvasNodes) setCanvasNodes(data.canvasNodes);
        if (data.canvasConnections) setCanvasConnections(data.canvasConnections);
        if (data.canvasStickyNotes) setCanvasStickyNotes(data.canvasStickyNotes);
        if (data.canvasReferenceImages) setCanvasReferenceImages(data.canvasReferenceImages);
        if (data.canvasAnnotations) setCanvasAnnotations(data.canvasAnnotations);
        if (data.beatMarkers) setBeatMarkers(data.beatMarkers);
        if ((existingProject as any).description) setDescription((existingProject as any).description as string || "");
      }
    }
  }, [existingProject]);

  const buildHopData = useCallback((): HopData => ({
    type: hopType,
    clipLengthMode,
    loopMode,
    scenes,
    tags,
    visibility,
    totalDuration,
    audioTrack: audioTrack || undefined,
    previewSettings: { autoplay: true, mutedByDefault: false, showCaptions: true },
    streamingSyncStatus: "draft",
    sceneLayers,
    sceneTextStyles,
    audioClips,
    displayMode,
    hopMode,
    stitchSegments: stitchSegments.length > 0 ? stitchSegments : undefined,
    parallaxLayers: parallaxLayers.length > 0 ? parallaxLayers : undefined,
    panoramaUrl: panoramaUrl || undefined,
    panoramaWidth: panoramaWidth || undefined,
    canvasNodes: canvasNodes.length > 0 ? canvasNodes : undefined,
    canvasConnections: canvasConnections.length > 0 ? canvasConnections : undefined,
    canvasStickyNotes: canvasStickyNotes.length > 0 ? canvasStickyNotes : undefined,
    canvasReferenceImages: canvasReferenceImages.length > 0 ? canvasReferenceImages : undefined,
    canvasAnnotations: canvasAnnotations.length > 0 ? canvasAnnotations : undefined,
    beatMarkers: beatMarkers.length > 0 ? beatMarkers : undefined,
  } as any), [hopType, clipLengthMode, loopMode, scenes, tags, visibility, totalDuration, audioTrack, sceneLayers, sceneTextStyles, audioClips, displayMode, hopMode, stitchSegments, parallaxLayers, panoramaUrl, panoramaWidth, canvasNodes, canvasConnections, canvasStickyNotes, canvasReferenceImages, canvasAnnotations, beatMarkers]);

  const fireXpEvent = useCallback(async (action: string, projectId?: number | null, metadata?: Record<string, any>) => {
    try {
      await apiRequest("POST", "/api/ecosystem/xp/event", {
        action,
        source: "comixx",
        sourceApp: "comixx",
        toolUsed: "hop_creator",
        projectId: projectId || undefined,
        metadata: { projectType: "hop", ...metadata },
      });
    } catch {}
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const hopData = buildHopData();
      if (effectiveProjectId) {
        await saveProjectWithOfflineFallback(effectiveProjectId, { title, data: hopData }, "hop");
        toast.success("HOP saved");
        fireXpEvent("project_save", effectiveProjectId, { sceneCount: scenes.length });
        try {
          const badgeRes = await apiRequest("POST", "/api/hop/check-badges", {
            sceneCount: scenes.length,
            hasMusicSync: beatMarkers.length > 0 || !!audioTrack?.bpm,
          });
          const badgeData = await badgeRes.json();
          if (badgeData.awarded?.length > 0) {
            toast.success(`Badge earned: ${badgeData.awarded.join(", ")}`);
          }
        } catch {}
      } else {
        const project = await createProject.mutateAsync({
          title,
          type: "hop",
          status: "draft",
          data: hopData,
          forceNew: true,
        });
        setEffectiveProjectId(project.id);
        window.history.replaceState(null, "", `/creator/hop?id=${project.id}`);
        toast.success("HOP created");
        fireXpEvent("project_create", project.id, { sceneCount: scenes.length });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [buildHopData, title, effectiveProjectId, createProject, fireXpEvent]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (effectiveProjectId && scenes.length > 0) {
        const hopData = buildHopData();
        try {
          localStorage.setItem("hop-builder-autosave", JSON.stringify({ hop: hopData, title, projectId: effectiveProjectId }));
        } catch {}
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [buildHopData, title, effectiveProjectId, scenes]);

  const handleAddScene = useCallback(() => {
    setScenes(prev => [...prev, createDefaultScene(prev.length)]);
  }, []);

  const handleDuplicateScene = useCallback((idx: number) => {
    setScenes(prev => {
      const src = prev[idx];
      const dup: HopScene = { ...src, id: generateId(), order: prev.length };
      const next = [...prev, dup];
      if (sceneLayers[src.id]) {
        setSceneLayers(sl => ({
          ...sl,
          [dup.id]: sl[src.id].map(l => ({ ...l, id: generateId("layer") })),
        }));
      }
      if (sceneTextStyles[src.id]) {
        setSceneTextStyles(st => ({ ...st, [dup.id]: { ...st[src.id] } }));
      }
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }, [sceneLayers, sceneTextStyles]);

  const handleRemoveScene = useCallback((id: string) => {
    setScenes(prev => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
    setSceneLayers(sl => { const n = { ...sl }; delete n[id]; return n; });
    setSceneTextStyles(st => { const n = { ...st }; delete n[id]; return n; });
  }, []);

  const handleUpdateScene = useCallback((id: string, updates: Partial<HopScene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleMoveScene = useCallback((id: string, direction: "up" | "down") => {
    setScenes(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const handleTimelineSceneReorder = useCallback((fromId: string, toIdx: number) => {
    setScenes(prev => {
      const fromIdx = prev.findIndex(s => s.id === fromId);
      if (fromIdx < 0 || fromIdx === toIdx) return prev;
      const selectedId = prev[selectedSceneIdx]?.id;
      const previewId = prev[previewSceneIndex]?.id;
      const arr = [...prev];
      const [removed] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, removed);
      const reordered = arr.map((s, i) => ({ ...s, order: i }));
      if (selectedId) {
        const newSelIdx = reordered.findIndex(s => s.id === selectedId);
        if (newSelIdx >= 0) setSelectedSceneIdx(newSelIdx);
      }
      if (previewId) {
        const newPrevIdx = reordered.findIndex(s => s.id === previewId);
        if (newPrevIdx >= 0) setPreviewSceneIndex(newPrevIdx);
      }
      return reordered;
    });
  }, [selectedSceneIdx, previewSceneIndex]);

  const handleAssetUpload = useCallback((sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      let assetType: HopScene["assetType"] = "image";
      if (file.type.startsWith("video/")) assetType = "video";
      else if (file.type === "image/gif") assetType = "gif";
      handleUpdateScene(sceneId, { assetUrl: url, assetType });
      const layers = sceneLayers[sceneId] || [];
      if (layers.length === 0 || !layers.find(l => l.name === "Background")) {
        const bgLayer = createDefaultLayer("media", "Background", 0);
        bgLayer.dataUrl = url;
        setSceneLayers(sl => ({ ...sl, [sceneId]: [bgLayer, ...(sl[sceneId] || [])] }));
      } else {
        setSceneLayers(sl => ({
          ...sl,
          [sceneId]: (sl[sceneId] || []).map(l => l.name === "Background" ? { ...l, dataUrl: url } : l),
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [handleUpdateScene, sceneLayers]);

  const handleVibeDropped = useCallback((sceneId: string, url: string, assetType: HopScene["assetType"]) => {
    const emptyScene = !scenes.find(s => s.id === sceneId)?.assetUrl;
    handleUpdateScene(sceneId, { assetUrl: url, assetType });
    const layers = sceneLayers[sceneId] || [];
    if (layers.length === 0) {
      const bgLayer = createDefaultLayer("media", "Background", 0);
      bgLayer.dataUrl = url;
      setSceneLayers(sl => ({ ...sl, [sceneId]: [bgLayer] }));
    }
    if (emptyScene) {
      setPreviewSceneIndex(scenes.findIndex(s => s.id === sceneId));
    }
  }, [scenes, sceneLayers, isPlaying, handleUpdateScene]);

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAudioTrack({
        src: reader.result as string,
        name: file.name.replace(/\.[^.]+$/, ""),
        volume: 0.8,
        loop: true,
      });
      toast.success(`Audio loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleSnapToBpm = useCallback(() => {
    if (!audioBpm || audioBpm <= 0) return;
    const beatDur = 60 / audioBpm;
    setScenes(prev => prev.map(s => {
      const bars = Math.max(2, Math.round(s.duration / beatDur));
      return { ...s, duration: Math.round(bars * beatDur * 100) / 100 };
    }));
    toast.success(`Snapped all scenes to ${audioBpm} BPM`);
  }, [audioBpm]);

  const addLayer = useCallback((type: HopLayer["type"]) => {
    const layers = sceneLayers[currentSceneId] || [];
    const name = type === "media" ? `Media ${layers.length + 1}` :
                 type === "text" ? `Text ${layers.length + 1}` :
                 type === "effect" ? `Effect ${layers.length + 1}` :
                 `Caption ${layers.length + 1}`;
    const layer = createDefaultLayer(type, name, layers.length);
    if (type === "text" || type === "caption") {
      layer.text = type === "caption" ? "Caption text" : "Text";
    }
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: [...(sl[currentSceneId] || []), layer] }));
    setSelectedLayerId(layer.id);
    setRightContext("layer");
  }, [currentSceneId, sceneLayers]);

  const updateLayer = useCallback((layerId: string, updates: Partial<HopLayer>) => {
    setSceneLayers(sl => ({
      ...sl,
      [currentSceneId]: (sl[currentSceneId] || []).map(l => l.id === layerId ? { ...l, ...updates } : l),
    }));
  }, [currentSceneId]);

  const removeLayer = useCallback((layerId: string) => {
    setSceneLayers(sl => ({
      ...sl,
      [currentSceneId]: (sl[currentSceneId] || []).filter(l => l.id !== layerId),
    }));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
      setRightContext("scene");
    }
  }, [currentSceneId, selectedLayerId]);

  const duplicateLayer = useCallback((layerId: string) => {
    const layer = currentLayers.find(l => l.id === layerId);
    if (!layer) return;
    const dup = { ...layer, id: generateId("layer"), name: `${layer.name} copy` };
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: [...(sl[currentSceneId] || []), dup] }));
  }, [currentLayers, currentSceneId]);

  const applyVibe = useCallback((vibeId: string, allScenes = false) => {
    const vibe = VIBE_MODES.find(v => v.id === vibeId);
    if (!vibe) return;
    const dataUrl = generateVibeGradient(vibe.colors);
    const applyToScene = (sceneId: string) => {
      setSceneLayers(sl => {
        const layers = (sl[sceneId] || []).filter(l => !l.name.startsWith("VIBE:"));
        const vibeLayer = createDefaultLayer("effect", `VIBE: ${vibe.label}`, layers.length);
        vibeLayer.dataUrl = dataUrl;
        vibeLayer.opacity = 0.8;
        vibeLayer.blendMode = vibe.blend;
        return { ...sl, [sceneId]: [...layers, vibeLayer] };
      });
    };
    if (allScenes) {
      scenes.forEach(s => applyToScene(s.id));
      toast.success(`Applied ${vibe.label} to all scenes`);
    } else {
      applyToScene(currentSceneId);
      toast.success(`Applied ${vibe.label}`);
    }
  }, [scenes, currentSceneId]);

  const updateTextStyle = useCallback((updates: Partial<TextOverlayStyle>) => {
    setSceneTextStyles(st => ({
      ...st,
      [currentSceneId]: { ...(st[currentSceneId] || defaultTextStyle()), ...updates },
    }));
  }, [currentSceneId]);

  const applyTextPreset = useCallback((presetId: string) => {
    const preset = TEXT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    updateTextStyle({
      fontFamily: preset.font,
      fontSize: preset.size,
      color: preset.color,
      strokeColor: preset.stroke,
      strokeWidth: preset.strokeW,
      bgColor: preset.bgColor,
      bgOpacity: preset.bgOpacity,
      animation: preset.anim,
    });
    toast.success(`Applied ${preset.label} preset`);
  }, [updateTextStyle]);

  const handleImportFromProject = useCallback(async (project: Project) => {
    try {
      const res = await apiRequest("GET", `/api/projects/${project.id}/thumbnail`);
      const { thumbnail } = await res.json();
      if (!thumbnail) {
        toast.error("This project has no visual content to import");
        return;
      }
      const isGif = thumbnail.includes("image/gif");
      const isVideo = thumbnail.includes("video/");
      handleVibeDropped(currentSceneId, thumbnail, isVideo ? "video" : isGif ? "gif" : "image");
      setShowProjectPicker(false);
      toast.success(`Imported from "${project.title}"`);
    } catch {
      toast.error("Failed to import project content");
    }
  }, [currentSceneId, handleVibeDropped]);

  const handleLayerFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLayerId) return;
    const reader = new FileReader();
    reader.onload = () => updateLayer(selectedLayerId, { dataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [selectedLayerId, updateLayer]);

  const handleExportPng = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        filter: (node) => !(node as HTMLElement)?.dataset?.exportHide,
      });
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}_frame.png`;
      link.href = dataUrl;
      link.click();
      toast.success("PNG exported");
      fireXpEvent("project_export", effectiveProjectId, { format: "png" });
    } catch (err: any) {
      toast.error("Export failed: " + (err.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  }, [title, fireXpEvent, effectiveProjectId]);

  useEffect(() => {
    if (isPlaying && scenes.length > 0) {
      const cs = scenes[previewSceneIndex];
      if (!cs) return;
      const transition = cs.transition;
      setTransitionClass("");
      previewTimerRef.current = setTimeout(() => {
        if (transition !== "cut") {
          setTransitionClass(`hop-transition-${transition}`);
        }
        setTimeout(() => {
          const nextIdx = previewSceneIndex + 1;
          if (nextIdx >= scenes.length) {
            if (loopMode !== "manual_advance") {
              setPreviewSceneIndex(0);
              if (!zoneOutMode) setSelectedSceneIdx(0);
              setLoopCount(prev => prev + 1);
            } else {
              setIsPlaying(false);
            }
          } else {
            setPreviewSceneIndex(nextIdx);
            if (!zoneOutMode) setSelectedSceneIdx(nextIdx);
          }
          setTransitionClass("");
        }, transition !== "cut" ? 500 : 0);
      }, cs.duration * 1000 - (transition !== "cut" ? 500 : 0));
      return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
    }
  }, [showPreview, zoneOutMode, isPlaying, previewSceneIndex, scenes, loopMode]);

  useEffect(() => {
    if (!isPlaying) {
      setCameraProgress(0);
      if (cameraRafRef.current) cancelAnimationFrame(cameraRafRef.current);
      return;
    }
    const cs = scenes[previewSceneIndex];
    if (!cs || (!cs.cameraStart && !cs.cameraEnd)) { setCameraProgress(0); return; }
    const dur = cs.duration * 1000;
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(elapsed / dur, 1);
      setCameraProgress(p);
      if (p < 1) cameraRafRef.current = requestAnimationFrame(tick);
    };
    cameraRafRef.current = requestAnimationFrame(tick);
    return () => { if (cameraRafRef.current) cancelAnimationFrame(cameraRafRef.current); };
  }, [isPlaying, previewSceneIndex, scenes]);

  const SCROLL_SPEED = 30;
  useEffect(() => {
    if (!isPlaying || displayMode !== "moving") {
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
      if (!isPlaying) setScrollOffset(0);
      return;
    }
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const dir = scrollDirection === "forward" ? -1 : 1;
      setScrollOffset(prev => prev + dir * SCROLL_SPEED * dt);
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
    return () => { if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; } };
  }, [isPlaying, displayMode, scrollDirection]);

  useEffect(() => {
    if (!(isPlaying && !audioMuted)) {
      stopGaplessAudio();
    }
  }, [isPlaying, audioMuted, stopGaplessAudio]);

  useEffect(() => {
    if (!isPlaying) {
      Object.values(clipAudioRefs.current).forEach(el => { el.pause(); });
      return;
    }
    const playbackStart = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - playbackStart) / 1000;
      audioClips.forEach(clip => {
        const el = clipAudioRefs.current[clip.id];
        if (!el) return;
        el.volume = clip.muted ? 0 : clip.volume;
        const clipEnd = clip.startTime + clip.duration;
        if (elapsed >= clip.startTime && elapsed < clipEnd) {
          if (el.paused) {
            el.currentTime = elapsed - clip.startTime;
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) el.pause();
        }
      });
    }, 100);
    return () => {
      clearInterval(interval);
      Object.values(clipAudioRefs.current).forEach(el => { el.pause(); });
    };
  }, [isPlaying, audioClips]);

  const scrubAudioClips = useCallback((time: number) => {
    audioClips.forEach(clip => {
      const el = clipAudioRefs.current[clip.id];
      if (!el) return;
      el.volume = clip.muted ? 0 : clip.volume;
      const clipEnd = clip.startTime + clip.duration;
      if (time >= clip.startTime && time < clipEnd) {
        el.currentTime = time - clip.startTime;
      } else {
        el.pause();
      }
    });
  }, [audioClips]);

  useEffect(() => {
    if (zoneOutMode && isPlaying) {
      setPlaybackElapsed(0);
      playbackTimerRef.current = setInterval(() => setPlaybackElapsed(p => p + 1), 1000);
      return () => { if (playbackTimerRef.current) clearInterval(playbackTimerRef.current); };
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setPlaybackElapsed(0);
    }
  }, [zoneOutMode, isPlaying]);

  const moveLayerInStack = useCallback((layerId: string, direction: "up" | "down") => {
    const displayLayers = [...(sceneLayers[currentSceneId] || [])].sort((a, b) => b.zIndex - a.zIndex);
    const idx = displayLayers.findIndex(l => l.id === layerId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === displayLayers.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [displayLayers[idx], displayLayers[swapIdx]] = [displayLayers[swapIdx], displayLayers[idx]];
    const maxZ = displayLayers.length - 1;
    const reindexed = displayLayers.map((l, i) => ({ ...l, zIndex: maxZ - i }));
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: reindexed }));
  }, [currentSceneId, sceneLayers]);

  const moveLayerToExtreme = useCallback((layerId: string, position: "top" | "bottom") => {
    const displayLayers = [...(sceneLayers[currentSceneId] || [])].sort((a, b) => b.zIndex - a.zIndex);
    const idx = displayLayers.findIndex(l => l.id === layerId);
    if (idx < 0) return;
    const [moved] = displayLayers.splice(idx, 1);
    if (position === "top") displayLayers.unshift(moved);
    else displayLayers.push(moved);
    const maxZ = displayLayers.length - 1;
    const reindexed = displayLayers.map((l, i) => ({ ...l, zIndex: maxZ - i }));
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: reindexed }));
  }, [currentSceneId, sceneLayers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (zoneOutMode) { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); setScreensaverMode(false); }
        else if (showPreview) { setShowPreview(false); setIsPlaying(false); pauseAudioNow(); }
        else setSelectedLayerId(null);
      }
      if (e.key === " " && !showPreview && !zoneOutMode) {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLayerId) removeLayer(selectedLayerId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedLayerId) {
        e.preventDefault();
        const layer = currentLayers.find(l => l.id === selectedLayerId);
        if (layer) { layerClipboardRef.current = JSON.parse(JSON.stringify(layer)); toast.success("Layer copied"); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && layerClipboardRef.current) {
        e.preventDefault();
        const clip = layerClipboardRef.current;
        const dup = { ...JSON.parse(JSON.stringify(clip)), id: generateId("layer"), name: `${clip.name} copy`, positionX: clip.positionX + 10, positionY: clip.positionY + 10 };
        setSceneLayers(sl => ({ ...sl, [currentSceneId]: [...(sl[currentSceneId] || []), dup] }));
        setSelectedLayerId(dup.id);
        toast.success("Layer pasted");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedLayerId) { e.preventDefault(); duplicateLayer(selectedLayerId); }
      if ((e.ctrlKey || e.metaKey) && e.key === "]" && selectedLayerId) { e.preventDefault(); moveLayerInStack(selectedLayerId, "up"); }
      if ((e.ctrlKey || e.metaKey) && e.key === "[" && selectedLayerId) { e.preventDefault(); moveLayerInStack(selectedLayerId, "down"); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "]" && selectedLayerId) { e.preventDefault(); moveLayerToExtreme(selectedLayerId, "top"); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "[" && selectedLayerId) { e.preventDefault(); moveLayerToExtreme(selectedLayerId, "bottom"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoneOutMode, showPreview, selectedLayerId, removeLayer, duplicateLayer, handleSave, pauseAudioNow, currentLayers, currentSceneId, moveLayerInStack, moveLayerToExtreme]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const startLayerMove = useCallback((e: React.MouseEvent, layer: HopLayer) => {
    if (layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLayer = { ...layer };
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();
    const cs = canvasRect.width / viewport.w;
    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = (moveE.clientX - startX) / cs;
      const dy = (moveE.clientY - startY) / cs;
      updateLayer(layer.id, {
        positionX: Math.round(startLayer.positionX + dx),
        positionY: Math.round(startLayer.positionY + dy),
      });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [updateLayer, viewport.w]);

  const startLayerResize = useCallback((e: React.MouseEvent, layer: HopLayer, handle: string) => {
    if (layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = layer.scale;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();
    const cs = canvasRect.width / viewport.w;
    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = (moveE.clientX - startX) / cs;
      const dy = (moveE.clientY - startY) / cs;
      let delta = 0;
      if (handle.includes('e')) delta += dx;
      if (handle.includes('w')) delta -= dx;
      if (handle.includes('s')) delta += dy;
      if (handle.includes('n')) delta -= dy;
      const newScale = Math.max(10, Math.min(500, startScale + delta * 0.5));
      updateLayer(layer.id, { scale: Math.round(newScale) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [updateLayer, viewport.w]);

  const startLayerRotate = useCallback((e: React.MouseEvent, layer: HopLayer) => {
    if (layer.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const startAngle = layer.rotation;
    const el = (e.currentTarget as HTMLElement).parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const handleMouseMove = (moveE: MouseEvent) => {
      const mouseAngle = Math.atan2(moveE.clientY - centerY, moveE.clientX - centerX) * (180 / Math.PI);
      let newRotation = startAngle + (mouseAngle - startMouseAngle);
      if (moveE.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
      updateLayer(layer.id, { rotation: Math.round(newRotation) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [updateLayer]);

  const GIZMO_HANDLE_SIZE = 10;
  const GIZMO_HANDLES = [
    { position: 'nw', cursor: 'nwse-resize', x: -GIZMO_HANDLE_SIZE / 2, y: -GIZMO_HANDLE_SIZE / 2 },
    { position: 'n', cursor: 'ns-resize', x: '50%', y: -GIZMO_HANDLE_SIZE / 2, tx: '-50%' },
    { position: 'ne', cursor: 'nesw-resize', x: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)`, y: -GIZMO_HANDLE_SIZE / 2 },
    { position: 'w', cursor: 'ew-resize', x: -GIZMO_HANDLE_SIZE / 2, y: '50%', ty: '-50%' },
    { position: 'e', cursor: 'ew-resize', x: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)`, y: '50%', ty: '-50%' },
    { position: 'sw', cursor: 'nesw-resize', x: -GIZMO_HANDLE_SIZE / 2, y: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)` },
    { position: 's', cursor: 'ns-resize', x: '50%', y: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)`, tx: '-50%' },
    { position: 'se', cursor: 'nwse-resize', x: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)`, y: `calc(100% - ${GIZMO_HANDLE_SIZE / 2}px)` },
  ] as const;

  const renderGizmo = (layer: HopLayer) => {
    if (layer.id !== selectedLayerId || layer.locked) return null;
    return (
      <>
        <div className="absolute inset-0 border-2 border-white pointer-events-none" style={{ boxShadow: '0 0 0 1px black' }} />
        {GIZMO_HANDLES.map((handle) => (
          <div
            key={handle.position}
            className="absolute bg-white border-2 border-black z-50"
            style={{
              width: GIZMO_HANDLE_SIZE,
              height: GIZMO_HANDLE_SIZE,
              left: handle.x,
              top: handle.y,
              cursor: handle.cursor,
              transform: `${handle.tx ? `translateX(${handle.tx})` : ''} ${handle.ty ? `translateY(${handle.ty})` : ''}`.trim() || undefined,
            }}
            onMouseDown={(e) => startLayerResize(e, layer, handle.position)}
            data-testid={`transform-resize-${handle.position}`}
          />
        ))}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center cursor-grab hover:bg-gray-300 z-50"
          onMouseDown={(e) => startLayerRotate(e, layer)}
          data-testid="transform-rotate"
        >
          <RotateCcw className="w-3 h-3" />
        </div>
        <div
          className="absolute inset-0 z-10 cursor-move"
          onMouseDown={(e) => startLayerMove(e, layer)}
          data-testid="transform-move"
        />
      </>
    );
  };

  const handleLayerReorder = useCallback((fromId: string, toId: string, position?: "above" | "below") => {
    if (fromId === toId) return;
    const displayLayers = [...(sceneLayers[currentSceneId] || [])].sort((a, b) => b.zIndex - a.zIndex);
    const fromIdx = displayLayers.findIndex(l => l.id === fromId);
    let toIdx = displayLayers.findIndex(l => l.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = displayLayers.splice(fromIdx, 1);
    if (position === "below" && fromIdx < toIdx) toIdx--;
    else if (position === "above" && fromIdx > toIdx) toIdx;
    displayLayers.splice(position === "below" ? toIdx + 1 : toIdx, 0, moved);
    const maxZ = displayLayers.length - 1;
    const reindexed = displayLayers.map((l, i) => ({ ...l, zIndex: maxZ - i }));
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: reindexed }));
  }, [currentSceneId, sceneLayers]);

  const previewScene = scenes[previewSceneIndex];
  const previewLayers = previewScene ? (sceneLayers[previewScene.id] || []) : [];
  const previewTextStyle = previewScene ? (sceneTextStyles[previewScene.id] || defaultTextStyle()) : defaultTextStyle();

  const renderCanvas = (scene: HopScene | undefined, layers: HopLayer[], textStyle: TextOverlayStyle, ref?: React.RefObject<HTMLDivElement | null>, allowBleed?: boolean) => {
    if (!scene) return <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><p className="text-xs text-zinc-600">No scene</p></div>;
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    const camStyle = getCameraStyle(scene, isPlaying ? cameraProgress : 0);
    return (
      <div ref={ref as any} className={`relative w-full h-full bg-black ${allowBleed ? 'overflow-visible' : 'overflow-hidden'}`} style={{ aspectRatio: `${viewport.w}/${viewport.h}` }}>
        <div className={`absolute inset-0 ${displayMode === "moving" ? "overflow-visible" : ""}`} style={{ ...camStyle, ...(displayMode === "moving" && scrollOffset !== 0 ? { transform: `${camStyle?.transform || ""} translateX(${scrollOffset}px)`.trim() } : {}) }}>
        {scene.assetUrl && !layers.find(l => l.name === "Background" && l.type === "media") && (
          <div className="absolute inset-0">
            {scene.assetType === "video" ? (
              <video src={scene.assetUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline data-testid="canvas-bg-video" />
            ) : (
              <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" data-testid="canvas-bg-image" />
            )}
          </div>
        )}
        {sortedLayers.filter(l => l.visible).map(layer => {
          const parallaxShift = layer.parallaxDepth ? layer.parallaxDepth * 0.3 : 0;
          const isBgLayer = layer.type === "media" && layer.dataUrl && layer.dataUrl === scene.assetUrl;
          const shadowFilter = (layer.shadowBlur && layer.shadowBlur > 0)
            ? `drop-shadow(${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"})`
            : "";
          const motionBlurFilter = (layer.motionBlur && layer.motionBlur > 0)
            ? `blur(${layer.motionBlur * 0.3}px)`
            : "";
          const combinedFilter = [shadowFilter, motionBlurFilter].filter(Boolean).join(" ") || undefined;
          const beatIntensityNorm = (layer.beatIntensity ?? 50) / 100;
          const beatAnim: React.CSSProperties = (layer.beatReact && layer.beatReact !== "none" && audioBpm)
            ? {
              animation: `hop-beat-${layer.beatReact} ${60 / audioBpm}s ease-out infinite`,
              "--hop-beat-intensity": `${1 + beatIntensityNorm * 0.3}`,
              "--hop-beat-px": `${Math.round(beatIntensityNorm * 12)}px`,
              "--hop-beat-deg": `${Math.round(beatIntensityNorm * 8)}deg`,
            } as React.CSSProperties
            : {};
          const onLayerClick = (e: React.MouseEvent) => { e.stopPropagation(); if (!layer.locked) { setSelectedLayerId(layer.id); setRightContext("layer"); } };
          const layerDataAttr = { "data-layer-id": layer.id };
          const canBleed = allowBleed || displayMode === "moving";
          const shellStyle: React.CSSProperties = isBgLayer ? {
            position: "absolute",
            inset: 0,
            overflow: canBleed ? "visible" : "hidden",
            opacity: layer.opacity,
            mixBlendMode: layer.blendMode as any,
            zIndex: layer.zIndex + 1,
            filter: combinedFilter,
            ...beatAnim,
          } : {
            position: "absolute",
            left: `calc(50% + ${layer.positionX}px)`,
            top: `calc(50% + ${layer.positionY + parallaxShift}px)`,
            transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale / 100})`,
            overflow: canBleed ? "visible" : undefined,
            opacity: layer.opacity,
            mixBlendMode: layer.blendMode as any,
            zIndex: layer.zIndex + 1,
            filter: combinedFilter,
            ...beatAnim,
          };
          const isStitched = layer.stitchMode && displayMode === "moving";
          const stitchCount = layer.stitchRepeat || 2;
          if (layer.type === "media" && layer.dataUrl) {
            const isVideo = layer.dataUrl.startsWith("data:video/") || layer.dataUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
            if (isStitched && !isBgLayer) {
              const scrollPct = 100 / stitchCount;
              return (
                <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                  <div style={{ width: `${stitchCount * 100}%`, display: "flex", animation: `hop-stitch-scroll ${scene.duration}s linear infinite`, "--hop-stitch-shift": `-${scrollPct}%` } as React.CSSProperties}>
                    {Array.from({ length: stitchCount }).map((_, si) => (
                      isVideo ? (
                        <video key={si} src={layer.dataUrl} className="h-full shrink-0" style={{ width: `${scrollPct}%`, objectFit: layer.objectFit || "contain" }} autoPlay loop muted playsInline draggable={false} />
                      ) : (
                        <img key={si} src={layer.dataUrl} alt={layer.name} className="h-full shrink-0" style={{ width: `${scrollPct}%`, objectFit: layer.objectFit || "contain" }} draggable={false} />
                      )
                    ))}
                  </div>
                  {allowBleed && renderGizmo(layer)}
                </div>
              );
            }
            if (isBgLayer) {
              return (
                <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                  <div style={{ width: viewport.w, height: viewport.h, transform: `translate(${layer.positionX}px, ${layer.positionY}px) rotate(${layer.rotation}deg) scale(${layer.scale / 100})`, transformOrigin: "center center" }}>
                    {isVideo ? (
                      <video src={layer.dataUrl} className="w-full h-full" style={{ objectFit: layer.objectFit || "contain" }} autoPlay loop muted playsInline draggable={false} />
                    ) : (
                      <img src={layer.dataUrl} alt={layer.name} className="w-full h-full" style={{ objectFit: layer.objectFit || "contain" }} draggable={false} />
                    )}
                  </div>
                  {allowBleed && renderGizmo(layer)}
                </div>
              );
            }
            return (
              <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                {isVideo ? (
                  <video src={layer.dataUrl} style={{ objectFit: layer.objectFit || "contain" }} autoPlay loop muted playsInline draggable={false} />
                ) : (
                  <img src={layer.dataUrl} alt={layer.name} style={{ objectFit: layer.objectFit || "contain" }} draggable={false} />
                )}
                {allowBleed && renderGizmo(layer)}
              </div>
            );
          }
          if (layer.type === "effect" && layer.dataUrl) {
            return (
              <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                <img src={layer.dataUrl} alt={layer.name} style={{ objectFit: layer.objectFit || "contain" }} draggable={false} />
                {allowBleed && renderGizmo(layer)}
              </div>
            );
          }
          if (layer.type === "text" && layer.text) {
            const isTypewriter = layer.textAnimation === "typewriter";
            const textAnim = isTypewriter
              ? `hop-text-typewriter 2s steps(${Math.max(1, (layer.text || "").length)}, end) forwards, hop-typewriter-cursor 0.75s step-end infinite`
              : layer.textAnimation && layer.textAnimation !== "none" ? `hop-text-${layer.textAnimation} 1s ease-out forwards` : undefined;
            return (
              <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                <div className="px-4 py-2 whitespace-nowrap" style={{
                  fontFamily: layer.fontFamily,
                  fontSize: `${layer.fontSize || 14}px`,
                  color: layer.fontColor || "#fff",
                  fontWeight: layer.bold ? 700 : 400,
                  fontStyle: layer.italic ? "italic" : "normal",
                  WebkitTextStroke: layer.strokeWidth ? `${layer.strokeWidth}px ${layer.strokeColor || "#000"}` : undefined,
                  textShadow: layer.shadowBlur ? `${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"}` : undefined,
                  animation: textAnim,
                  overflow: isTypewriter ? "hidden" : undefined,
                  borderRight: isTypewriter ? "2px solid" : undefined,
                  textAlign: "center",
                }}>
                  {layer.text}
                </div>
                {allowBleed && renderGizmo(layer)}
              </div>
            );
          }
          if (layer.type === "caption" && layer.text) {
            return (
              <div key={layer.id} style={shellStyle} onClick={onLayerClick} {...layerDataAttr}>
                <div className="bg-black/70 px-4 py-3 text-center whitespace-nowrap" style={{ fontFamily: layer.fontFamily || "'Press Start 2P', monospace", fontSize: `${layer.fontSize || 12}px`, color: layer.fontColor || "#fff" }}>
                  {layer.text}
                </div>
                {allowBleed && renderGizmo(layer)}
              </div>
            );
          }
          return null;
        })}
        {scene.textOverlay && (
          <div className="absolute left-0 right-0 z-[50] px-4 py-2" style={{
            ...(textStyle.position === "top" ? { top: 0 } : textStyle.position === "center" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: 0 }),
          }}>
            <div style={{
              fontFamily: textStyle.fontFamily,
              fontSize: `${textStyle.fontSize}px`,
              color: textStyle.color,
              fontWeight: textStyle.bold ? "bold" : "normal",
              fontStyle: textStyle.italic ? "italic" : "normal",
              WebkitTextStroke: textStyle.strokeWidth ? `${textStyle.strokeWidth}px ${textStyle.strokeColor}` : undefined,
              backgroundColor: `${textStyle.bgColor}${Math.round(textStyle.bgOpacity * 2.55).toString(16).padStart(2, "0")}`,
              textAlign: textStyle.textAlign,
              padding: "6px 12px",
              animation: textStyle.animation === "typewriter"
                ? `hop-text-typewriter 2s steps(${Math.max(1, (scene.textOverlay || "").length)}, end) forwards, hop-typewriter-cursor 0.75s step-end infinite`
                : textStyle.animation !== "none" ? `hop-text-${textStyle.animation} 1s ease-out forwards` : undefined,
              overflow: textStyle.animation === "typewriter" ? "hidden" : undefined,
              whiteSpace: textStyle.animation === "typewriter" ? "nowrap" : undefined,
              borderRight: textStyle.animation === "typewriter" ? "2px solid" : undefined,
            }}>
              {scene.textOverlay}
            </div>
          </div>
        )}
        {scene.caption && !layers.find(l => l.type === "caption") && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 z-[49]">
            <p className="text-xs text-white text-center font-mono">{scene.caption}</p>
          </div>
        )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white select-none" data-testid="hop-creator">
      <style>{`
        @keyframes hop-stitch-scroll { 0% { transform: translateX(0) } 100% { transform: translateX(var(--hop-stitch-shift, -50%)) } }
        .hop-screensaver-ken-burns { animation: hop-kenburns 25s ease-in-out infinite alternate; transform-origin: center center }
        @keyframes hop-kenburns { 0% { transform: scale(1) translate(0,0) } 25% { transform: scale(1.15) translate(-2%,1%) } 50% { transform: scale(1.1) translate(1%,-1.5%) } 75% { transform: scale(1.2) translate(-1%,-0.5%) } 100% { transform: scale(1.05) translate(1.5%,1%) } }
      `}</style>

      <div className="bg-zinc-950 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between px-3 py-1 gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="px-3 py-1 border border-white/20 hover:bg-zinc-800 transition text-[10px] font-bold tracking-widest text-white" data-testid="button-back">
              HOPS
            </Link>
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-bold tracking-wider text-white">HOP BUILDER</span>
            </div>
          </div>
          <div className="flex items-center gap-0">
            {([
              { id: "create" as const, label: "CREATE", icon: "◉" },
              { id: "enhance" as const, label: "ENHANCE", icon: "⚡" },
              { id: "publish" as const, label: "PUBLISH", icon: "✦" },
            ] as const).map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => {
                  setWorkflowTab(tab.id);
                  if (tab.id === "create") setViewMode("builder");
                  if (tab.id === "publish") setShowExportPanel(true);
                }}
                className={`flex items-center gap-1 px-3 py-1 text-[9px] font-bold tracking-widest transition border-y border-r first:border-l ${
                  workflowTab === tab.id
                    ? "bg-white text-black border-white/20"
                    : "bg-transparent text-zinc-500 border-white/10 hover:text-zinc-300 hover:bg-zinc-900"
                } ${i === 0 ? "border-l" : ""}`}
                data-testid={`workflow-tab-${tab.id}`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
          <div className="w-20" />
        </div>
        <div className="flex items-center gap-1 px-2 py-1 border-t border-white/5 overflow-x-auto">
          <button onClick={() => setShowProjectPicker(true)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-import">
            IMPORT
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-white font-bold text-xs tracking-wider border-b border-transparent hover:border-zinc-600 focus:border-white/30 outline-none px-1 py-0.5 w-28 shrink-0"
            data-testid="input-hop-title"
          />
          <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
          <button onClick={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-play-toolbar">
            ▶ Play
          </button>
          <button onClick={() => { setIsPlaying(false); setPreviewSceneIndex(0); pauseAudioNow(); }} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-stop-toolbar">
            ⏹ Stop
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
          <button onClick={() => { setHopMode("still"); setDisplayMode("standard"); }} className={`px-2 py-0.5 text-[9px] font-bold tracking-wider border border-white/10 transition shrink-0 ${hopMode === "still" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500"}`} data-testid="button-mode-still">STILL</button>
          <button onClick={() => { setHopMode("pan"); setDisplayMode("moving"); }} className={`px-2 py-0.5 text-[9px] font-bold tracking-wider border border-white/10 transition shrink-0 ${hopMode === "pan" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500"}`} data-testid="button-mode-pan">PAN</button>
          <button onClick={() => { setHopMode("video"); setDisplayMode("standard"); }} className={`px-2 py-0.5 text-[9px] font-bold tracking-wider border border-white/10 transition shrink-0 ${hopMode === "video" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500"}`} data-testid="button-mode-video">VIDEO</button>
          {hopMode === "pan" && (
            <>
              <button onClick={() => setScrollDirection(d => d === "forward" ? "backward" : "forward")} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-scroll-direction">
                {scrollDirection === "forward" ? "→ FWD" : "← BWD"}
              </button>
              <button onClick={() => setViewMode(viewMode === "stitch" ? "builder" : "stitch")} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-stitch-toggle">STITCH</button>
            </>
          )}
          <button
            onClick={() => { setShowPreview(false); setZoneOutMode(true); setPreviewSceneIndex(0); setLoopCount(0); setIsPlaying(true); if (audioTrack && !audioMuted) startAudioFromBeginning(); }}
            className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0"
            data-testid="button-zone-out"
          >
            ZONE OUT
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
          <button onClick={handleSave} disabled={saving} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0 flex items-center gap-1" data-testid="button-save-toolbar">
            {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />} Save
          </button>
          <button onClick={handleAddScene} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-new-hop">+ New HOP</button>
          <button onClick={() => setShowProjectPicker(true)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">Projects</button>
          <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
          <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wider shrink-0 ${hopMode !== "still" ? "text-white" : "text-zinc-600"}`}>
            {hopMode === "pan" ? `>> PAN ${scrollDirection === "forward" ? "→" : "←"} ${isPlaying ? Math.abs(Math.round(scrollOffset)) + "px" : "READY"}` : hopMode === "video" ? ">> VIDEO" : ">> STILL"}
          </span>
          <button onClick={() => setShowExportPanel(true)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0" data-testid="button-publish-toolbar">Publish</button>
          <button onClick={handleSave} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">Save HOP</button>
          <button onClick={handleExportPng} disabled={exporting} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">GIF</button>
          <button onClick={() => setShowExportPanel(true)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">MP4</button>
          <Link href="/" className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">CoMiXX</Link>
          <span className="text-[9px] text-zinc-500 shrink-0">100%</span>
          <button onClick={() => setShowExportPanel(true)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition shrink-0">LIBRARY</button>
          <div className="relative shrink-0">
            <button onClick={() => setShowSendTo(!showSendTo)} className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition" data-testid="button-send-to">SEND TO</button>
            {showSendTo && (
              <div className="absolute right-0 top-full mt-1 z-50">
                <SendToMenu projectId={effectiveProjectId || undefined} contentType="hop" onClose={() => setShowSendTo(false)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === "canvas" && (
        <div className="flex-1 overflow-hidden">
          <HopStudioCanvas
            nodes={canvasNodes}
            connections={canvasConnections}
            stickyNotes={canvasStickyNotes}
            referenceImages={canvasReferenceImages}
            annotations={canvasAnnotations}
            onNodesChange={setCanvasNodes}
            onConnectionsChange={setCanvasConnections}
            onStickyNotesChange={setCanvasStickyNotes}
            onReferenceImagesChange={setCanvasReferenceImages}
            onAnnotationsChange={setCanvasAnnotations}
            sceneIds={scenes.map(s => s.id)}
          />
        </div>
      )}

      {viewMode === "timeline" && (
        <div className="flex-1 overflow-hidden">
          <HopWaveformTimeline
            scenes={scenes}
            audioSrc={audioTrack?.src}
            audioBpm={audioBpm}
            beatMarkers={beatMarkers}
            isPlaying={isPlaying}
            selectedSceneIdx={selectedSceneIdx}
            totalDuration={totalDuration}
            audioClips={audioClips}
            onAudioClipsChange={setAudioClips}
            onSceneSelect={(idx) => { setSelectedSceneIdx(idx); setSelectedLayerId(null); setRightContext("scene"); }}
            onSceneUpdate={(id, updates) => handleUpdateScene(id, updates)}
            onBeatMarkersChange={setBeatMarkers}
            onPlayToggle={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }}
            onAddScene={handleAddScene}
            onScrub={(time) => { if (audioRef.current) audioRef.current.currentTime = time; scrubAudioClips(time); }}
          />
        </div>
      )}

      {viewMode === "stitch" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <HopStitchMode
            segments={stitchSegments}
            onSegmentsChange={setStitchSegments}
            canvasHeight={VIEWPORT_SIZES[viewportMode].h}
            onExportPanorama={(url, w) => {
              setPanoramaUrl(url);
              setPanoramaWidth(w);
              toast.success(`Panorama built: ${w}px wide`);
              setViewMode("builder");
            }}
          />
          {panoramaUrl && (
            <div className="bg-zinc-950 border-t border-zinc-800 p-2">
              <div className="text-[10px] text-zinc-500 mb-1">Pan Preview</div>
              <HopPanPlayer
                panoramaUrl={panoramaUrl}
                panoramaWidth={panoramaWidth}
                viewportWidth={Math.min(VIEWPORT_SIZES[viewportMode].w, 600)}
                viewportHeight={200}
                parallaxLayers={parallaxLayers}
                autoPlay={false}
              />
            </div>
          )}
        </div>
      )}

      {viewMode === "builder" && (
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 bg-zinc-950 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-white/10 shrink-0">
            {([
              { id: "scenes" as const, icon: "◻", label: "SCENES" },
              { id: "audio" as const, icon: "♪", label: "AUDIO" },
              { id: "vibes" as const, icon: "⊞", label: "ASSETS" },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest transition ${leftTab === tab.id ? "text-white border-b border-white bg-black" : "text-zinc-600 hover:text-zinc-400"}`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="mr-0.5">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {leftTab === "scenes" && (
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-zinc-500 font-bold tracking-wider">{scenes.length} SCENES · {totalDuration}s</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => setShowSceneTemplates(true)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition" title="From Template" data-testid="button-scene-templates">
                      <FileText className="w-3 h-3" />
                    </button>
                    <button onClick={handleAddScene} className="p-1 hover:bg-zinc-800 text-zinc-400 transition" data-testid="button-add-scene">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i < scenes.length ? "#fff" : "transparent", border: i < scenes.length ? "none" : "1px solid rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    onClick={() => { setSelectedSceneIdx(idx); setSelectedLayerId(null); setRightContext("scene"); }}
                    className={`relative group px-2 py-2 cursor-pointer transition ${
                      selectedSceneIdx === idx ? "bg-zinc-800 border border-white/20" : "bg-zinc-900/30 border border-transparent hover:border-white/10"
                    }`}
                    data-testid={`scene-item-${idx}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-14 h-10 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {scene.assetUrl ? (
                          scene.assetType === "video" ? <Film className="w-4 h-4 text-zinc-500" /> :
                          <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" />
                        ) : <ImageIcon className="w-4 h-4 text-zinc-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300 text-[11px] font-bold tracking-wide">{scene.textOverlay || scene.caption || `Scene ${idx + 1}`}</div>
                        <div className="text-[9px] text-zinc-600">{scene.duration}s · {scene.transition}</div>
                      </div>
                    </div>
                    <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "up"); }} className="p-0.5 bg-zinc-700 hover:bg-zinc-600"><ChevronUp className="w-2.5 h-2.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "down"); }} className="p-0.5 bg-zinc-700 hover:bg-zinc-600"><ChevronDown className="w-2.5 h-2.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicateScene(idx); }} className="p-0.5 bg-zinc-700 hover:bg-zinc-600"><Copy className="w-2.5 h-2.5" /></button>
                      {scenes.length > 1 && <button onClick={(e) => { e.stopPropagation(); handleRemoveScene(scene.id); }} className="p-0.5 bg-zinc-800 hover:bg-zinc-700"><Trash2 className="w-2.5 h-2.5 text-zinc-400" /></button>}
                    </div>
                  </div>
                ))}
                <div className="flex gap-1 mt-2">
                  <button onClick={handleAddScene} className="flex-1 py-2 text-[10px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition flex items-center justify-center gap-1" data-testid="button-add-scene-bottom">
                    <Plus className="w-3 h-3" /> + SCENE
                  </button>
                  <button onClick={() => addLayer("text")} className="flex-1 py-2 text-[10px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition flex items-center justify-center gap-1" data-testid="button-add-text-left">
                    <Type className="w-3 h-3" /> + TEXT
                  </button>
                </div>
              </div>
            )}

            {leftTab === "audio" && (
              <div className="p-3 space-y-3">
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                <button onClick={() => audioInputRef.current?.click()} className="w-full py-2 text-xs bg-zinc-800 hover:bg-zinc-700 border border-dashed border-white/10 transition flex items-center justify-center gap-1.5" data-testid="button-upload-audio">
                  <Upload className="w-3.5 h-3.5" /> {audioTrack ? "Replace Audio" : "Upload Audio"}
                </button>
                {audioTrack && (
                  <>
                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-2 py-1.5">
                      <Music className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-[11px] text-zinc-300 truncate flex-1">{audioTrack.name}</span>
                      <button onClick={() => setAudioMuted(!audioMuted)} className="p-0.5" data-testid="button-audio-mute">
                        {audioMuted ? <VolumeX className="w-3 h-3 text-zinc-500" /> : <Volume2 className="w-3 h-3 text-white" />}
                      </button>
                      <button onClick={() => setAudioTrack(null)} className="p-0.5 hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-500 w-8">{Math.round(audioTrack.volume * 100)}%</span>
                        <input type="range" min="0" max="100" value={audioTrack.volume * 100} onChange={(e) => { const vol = Number(e.target.value) / 100; setAudioTrack(prev => prev ? { ...prev, volume: vol } : null); if (audioRef.current) audioRef.current.volume = vol; }} className="flex-1 h-1 accent-white" data-testid="slider-audio-volume" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] text-zinc-500">BPM</label>
                        <input type="number" min="1" max="300" value={audioBpm || ""} onChange={(e) => setAudioBpm(Number(e.target.value) || null)} placeholder="120" className="w-16 bg-zinc-800 border border-white/10 text-xs text-white p-1 outline-none" data-testid="input-bpm" />
                        <button onClick={handleSnapToBpm} disabled={!audioBpm} className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-white border border-white/20 disabled:opacity-30 transition" data-testid="button-snap-bpm">
                          SNAP
                        </button>
                      </div>
                      <button onClick={() => setAudioTrack(prev => prev ? { ...prev, loop: !prev.loop } : null)} className={`flex items-center gap-1 px-2 py-1 text-[9px] transition w-full ${audioTrack.loop ? "bg-white text-black border border-white" : "bg-zinc-800 text-zinc-500 border border-white/10"}`} data-testid="button-audio-loop-toggle">
                        <Repeat className="w-3 h-3" /> {audioTrack.loop ? "Looping" : "Once"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {leftTab === "vibes" && (
              <div className="p-3">
                <p className="text-[9px] text-zinc-500 font-bold mb-2">ONE-TAP FILTERS</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIBE_MODES.map(vibe => (
                    <button
                      key={vibe.id}
                      onClick={() => applyVibe(vibe.id)}
                      onContextMenu={(e) => { e.preventDefault(); applyVibe(vibe.id, true); }}
                      className="py-2 px-1.5 text-[9px] font-bold bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-white/30 transition text-center"
                      title={`${vibe.label} (right-click: all scenes)`}
                      data-testid={`vibe-${vibe.id}`}
                    >
                      {vibe.label}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-zinc-600 mt-2 text-center">Right-click to apply to all scenes</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/80 border-b border-white/5 shrink-0">
            <span className="text-[9px] text-zinc-500 font-bold tracking-wider">
              {displayMode === "moving" ? "SCROLL" : "STANDARD"} HOP · {scenes.length} scenes · {totalDuration}s · {displayMode === "moving" ? `${SCROLL_SPEED}px/s ${scrollDirection === "forward" ? "→" : "←"}` : "static"}
            </span>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-hidden relative" style={{ minHeight: 0 }}>
            <div className="flex items-center gap-2 px-3 h-full py-3" style={{ minWidth: "fit-content" }}>
              {scenes.map((scene, idx) => {
                const sLayers = sceneLayers[scene.id] || [];
                const sTextStyle = sceneTextStyles[scene.id] || defaultTextStyle();
                const isSelected = selectedSceneIdx === idx;
                const isPlayed = previewSceneIndex === idx && isPlaying;
                return (
                  <div
                    key={scene.id}
                    className={`relative shrink-0 transition-all cursor-pointer group overflow-visible ${
                      isSelected ? "ring-2 ring-white" : isPlayed ? "ring-1 ring-white/50" : "ring-1 ring-white/10 hover:ring-white/20"
                    }`}
                    style={{ height: "90%", aspectRatio: `${viewport.w}/${viewport.h}`, zIndex: isSelected ? 10 : 1 }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-testid="transform-move"], [data-testid^="transform-resize"], [data-testid="transform-rotate"]')) return;
                      setSelectedSceneIdx(idx);
                      setSelectedLayerId(null);
                      setRightContext("scene");
                    }}
                    data-testid={`canvas-scene-${idx}`}
                  >
                    <div className="absolute top-1 left-1 z-[60] px-1.5 py-0.5 bg-black/70 border border-white/10 pointer-events-none">
                      <span className="text-[8px] text-zinc-300 font-mono font-bold">{idx + 1}</span>
                      <span className="text-[8px] text-zinc-500 ml-1 font-mono">{scene.duration}s</span>
                    </div>
                    <div className="w-full h-full overflow-visible relative">
                      <div className="w-full h-full relative overflow-visible">
                        {renderCanvas(scene, sLayers, sTextStyle, isSelected ? canvasRef : undefined, isSelected)}
                      </div>
                    </div>
                    {!scene.assetUrl && sLayers.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="absolute inset-2 border-2 border-dashed border-white/10 rounded" />
                        <div className="text-center pointer-events-auto relative z-20">
                          <p className="text-[10px] font-bold tracking-widest text-white/60 mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>DROP VIBE</p>
                          <p className="text-[9px] text-zinc-600">Scene {idx + 1}</p>
                          <input ref={isSelected ? fileInputRef : undefined} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAssetUpload(scene.id, e)} />
                          <button onClick={(e) => { e.stopPropagation(); setSelectedSceneIdx(idx); setTimeout(() => fileInputRef.current?.click(), 50); }} className="text-[9px] text-white/40 hover:text-white/70 underline underline-offset-2 transition mt-1 block mx-auto" data-testid={`button-upload-asset-${idx}`}>browse</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div
                className="shrink-0 flex items-center justify-center border-2 border-dashed border-white/10 hover:border-white/30 transition cursor-pointer"
                style={{ height: "90%", aspectRatio: `${viewport.w}/${viewport.h}`, minWidth: "120px" }}
                onClick={handleAddScene}
                data-testid="canvas-add-scene"
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 text-zinc-600 mx-auto mb-1" />
                  <span className="text-[9px] text-zinc-600 font-bold tracking-wider">+ SCENE</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5">
              <button onClick={() => setShowExportPanel(true)} className="px-2.5 py-1 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center gap-1" data-testid="button-save-to-library">
                <FolderOpen className="w-3 h-3" /> SAVE TO LIBRARY
              </button>
              <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center gap-1" data-testid="button-save">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} SAVE
              </button>
              <div className="flex-1" />
              <span className="text-[8px] text-zinc-600 font-mono">Total: {totalDuration}s · {scenes.length} scene{scenes.length !== 1 ? "s" : ""} · {displayMode === "moving" ? `${SCROLL_SPEED}px/s ${scrollDirection === "forward" ? "→" : "←"}` : "static"}</span>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => setPreviewSceneIndex(Math.max(0, previewSceneIndex - 1))} className="p-1 hover:bg-zinc-800 transition text-zinc-500" data-testid="timeline-prev"><SkipBack className="w-3 h-3" /></button>
              <button onClick={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 transition text-white" data-testid="timeline-play">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setPreviewSceneIndex(Math.min(scenes.length - 1, previewSceneIndex + 1))} className="p-1 hover:bg-zinc-800 transition text-zinc-500" data-testid="timeline-next"><SkipForward className="w-3 h-3" /></button>
              <span className="text-[9px] text-zinc-500 font-mono">0.0s</span>
              <span className="text-[9px] text-zinc-400 font-mono">{totalDuration}.0s</span>
              {isPlaying && <span className="text-[9px] text-white font-mono flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />{loopCount}</span>}
              <Settings2 className="w-3.5 h-3.5 text-zinc-600 hover:text-white cursor-pointer" onClick={() => setShowSettings(!showSettings)} />
            </div>
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] text-zinc-600 font-bold tracking-wider w-16 shrink-0">SCENES</span>
                <div className="flex-1 flex gap-1 items-center overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
                  {scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      draggable
                      onDragStart={(e) => { setTimelineDragSceneId(scene.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTimelineDragOverIdx(idx); }}
                      onDragLeave={() => { if (timelineDragOverIdx === idx) setTimelineDragOverIdx(null); }}
                      onDrop={(e) => { e.preventDefault(); if (timelineDragSceneId) handleTimelineSceneReorder(timelineDragSceneId, idx); setTimelineDragSceneId(null); setTimelineDragOverIdx(null); }}
                      onDragEnd={() => { setTimelineDragSceneId(null); setTimelineDragOverIdx(null); }}
                      onClick={() => { setSelectedSceneIdx(idx); setPreviewSceneIndex(idx); setRightContext("scene"); }}
                      className={`relative flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                        timelineDragSceneId === scene.id ? "opacity-40" : ""
                      } ${timelineDragOverIdx === idx && timelineDragSceneId !== scene.id ? "ring-2 ring-white" : ""} ${
                        selectedSceneIdx === idx ? "ring-2 ring-white" : previewSceneIndex === idx && isPlaying ? "ring-1 ring-white/50" : ""
                      }`}
                      style={{ width: `${Math.max(80, (scene.duration / Math.max(totalDuration, 1)) * 300)}px`, height: "32px" }}
                      data-testid={`timeline-scene-${idx}`}
                    >
                      <div className="w-full h-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        {scene.assetUrl ? (
                          scene.assetType === "video" ? (
                            <div className="w-full h-full bg-zinc-700 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-400" /></div>
                          ) : (
                            <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <span className="text-[7px] text-zinc-600 font-mono">Scene {idx + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 flex items-center justify-between">
                        <span className="text-[7px] text-white font-mono">{idx + 1}</span>
                        <span className="text-[7px] text-zinc-400 font-mono">{scene.duration}s</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddScene} className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-white border border-dashed border-white/10 hover:border-white/30 transition shrink-0" data-testid="timeline-add-scene">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-zinc-600 font-bold tracking-wider w-16 shrink-0">+ ADD AUDIO</span>
                <div className="flex-1 h-6 bg-zinc-900/50 border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/20 transition" onClick={() => audioInputRef.current?.click()}>
                  {audioTrack ? (
                    <span className="text-[8px] text-zinc-400 truncate px-1 flex items-center gap-1"><Music className="w-2.5 h-2.5 text-white" /> {audioTrack.name}</span>
                  ) : (
                    <span className="text-[8px] text-zinc-600">+ ADD AUDIO CLIP</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-72 bg-zinc-950 border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-[9px] text-zinc-400 font-bold tracking-widest">✦ SEND TO</span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-zinc-600">▶</span>
              <span className="text-[9px] text-zinc-400 font-bold tracking-wider">1080P</span>
            </div>
          </div>
          <div className="p-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white uppercase tracking-widest font-bold flex items-center gap-1.5">✦ LAYERS</span>
              <div className="flex gap-1">
                <button onClick={() => addLayer("media")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white transition" title="Add Media"><ImageIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => addLayer("text")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white transition" title="Add Text"><Type className="w-3.5 h-3.5" /></button>
                <button onClick={() => addLayer("effect")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white transition" title="Add Effect"><Sparkles className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShowSettings(!showSettings)} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white transition" title="Settings"><Settings2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[7px] text-zinc-600 uppercase tracking-wider border-b border-white/5 mb-0.5">
              <span className="w-3" />
              <span className="w-3 text-center">#</span>
              <span className="w-4" />
              <span className="flex-1">Name</span>
              <span className="w-5 text-center">Op</span>
              <span className="w-4" />
              <span className="w-4" />
              <span className="w-4" />
              <span className="w-4" />
            </div>
            <div className="space-y-0 max-h-40 overflow-y-auto mb-2" data-testid="layer-stack-panel">
              {[...currentLayers].sort((a, b) => b.zIndex - a.zIndex).map((layer, displayIdx) => (
                <div key={layer.id}>
                  {dragReorderLayerId && dragOverLayerId === layer.id && dragOverPosition === "above" && dragReorderLayerId !== layer.id && (
                    <div className="h-0.5 bg-white mx-1 rounded-full" />
                  )}
                  <div
                    draggable
                    onDragStart={(e) => { setDragReorderLayerId(layer.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const rect = e.currentTarget.getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      setDragOverLayerId(layer.id);
                      setDragOverPosition(e.clientY < midY ? "above" : "below");
                    }}
                    onDragLeave={() => { if (dragOverLayerId === layer.id) setDragOverLayerId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragReorderLayerId && dragReorderLayerId !== layer.id) {
                        handleLayerReorder(dragReorderLayerId, layer.id, dragOverPosition);
                      }
                      setDragReorderLayerId(null);
                      setDragOverLayerId(null);
                    }}
                    onDragEnd={() => { setDragReorderLayerId(null); setDragOverLayerId(null); }}
                    onClick={() => { setSelectedLayerId(layer.id); setRightContext("layer"); }}
                    className={`group flex items-center gap-0.5 px-1 py-0.5 cursor-pointer transition-all text-[10px] ${
                      selectedLayerId === layer.id ? "bg-zinc-800 border-l-2 border-l-white border-y border-r border-white/10" :
                      dragReorderLayerId === layer.id ? "opacity-40 bg-zinc-900/20 border border-dashed border-white/15" :
                      "border-l-2 border-l-transparent border-y border-r border-transparent hover:bg-zinc-900/50 hover:border-white/5"
                    }`}
                    data-testid={`layer-item-${layer.id}`}
                  >
                    <GripVertical className="w-2.5 h-2.5 text-zinc-700 group-hover:text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing" />
                    <span className="text-[7px] text-zinc-600 w-3 text-center font-mono shrink-0">{layer.zIndex}</span>
                    <span className="text-zinc-500 shrink-0 w-4 text-center text-[9px]">
                      {layer.type === "media" ? "🖼" : layer.type === "text" ? "T" : layer.type === "effect" ? "✨" : "¶"}
                    </span>
                    <span className="flex-1 truncate text-zinc-300 min-w-0">{layer.name}</span>
                    <span className="text-[7px] text-zinc-600 w-5 text-center font-mono shrink-0">{Math.round(layer.opacity * 100)}</span>
                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); moveLayerInStack(layer.id, "up"); }} className="p-0.5 hover:text-white text-zinc-600" title="Move Up (Ctrl+])"><ChevronUp className="w-2.5 h-2.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayerInStack(layer.id, "down"); }} className="p-0.5 hover:text-white text-zinc-600" title="Move Down (Ctrl+[)"><ChevronDown className="w-2.5 h-2.5" /></button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className="p-0.5 shrink-0">
                      {layer.visible ? <Eye className="w-2.5 h-2.5 text-zinc-500" /> : <EyeOff className="w-2.5 h-2.5 text-zinc-600" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} className="p-0.5 shrink-0">
                      {layer.locked ? <Lock className="w-2.5 h-2.5 text-white" /> : <Unlock className="w-2.5 h-2.5 text-zinc-700" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="p-0.5 hover:text-white text-zinc-700 shrink-0"><Trash2 className="w-2.5 h-2.5" /></button>
                  </div>
                  {dragReorderLayerId && dragOverLayerId === layer.id && dragOverPosition === "below" && dragReorderLayerId !== layer.id && (
                    <div className="h-0.5 bg-white mx-1 rounded-full" />
                  )}
                </div>
              ))}
              {currentLayers.length === 0 && (
                <p className="text-[10px] text-zinc-600 text-center py-4">No layers — add media, text or effects</p>
              )}
            </div>
            <div className="space-y-1">
              <button onClick={() => { addLayer("media"); setTimeout(() => layerFileRef.current?.click(), 100); }} className="w-full py-1.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center justify-center gap-1.5" data-testid="button-upload-media-right">
                <Upload className="w-3 h-3" /> Upload Media
              </button>
              <button onClick={() => addLayer("text")} className="w-full py-1.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center justify-center gap-1.5" data-testid="button-add-text-right">
                <Type className="w-3 h-3" /> Add Text
              </button>
              <button onClick={() => addLayer("effect")} className="w-full py-1.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center justify-center gap-1.5" data-testid="button-add-effect-right">
                <Sparkles className="w-3 h-3" /> Add Effect
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {rightContext === "layer" && selectedLayer ? (
              <>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-zinc-500">■</span>
                    <span className="text-[10px] text-white font-bold tracking-widest uppercase">
                      {selectedLayer.type === "media" ? "MEDIA LAYER" : selectedLayer.type === "text" ? "TEXT LAYER" : selectedLayer.type === "effect" ? "EFFECT LAYER" : "CAPTION LAYER"}
                    </span>
                  </div>
                  <input value={selectedLayer.name} onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none font-mono" />
                </div>

                {selectedLayer.type === "media" && (
                  <>
                    <div>
                      <input ref={layerFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleLayerFileUpload} />
                      <button onClick={() => layerFileRef.current?.click()} className="w-full py-1.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5" data-testid="button-replace-layer-media">
                        <Upload className="w-3 h-3" /> {selectedLayer.dataUrl ? "Replace Media" : "Choose Media"}
                      </button>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">FIT MODE</span>
                      <div className="flex gap-1 mt-1">
                        {(["cover", "contain", "fill"] as const).map(fit => (
                          <button key={fit} onClick={() => updateLayer(selectedLayer.id, { objectFit: fit })} className={`flex-1 py-1 text-[9px] font-bold tracking-wider transition ${selectedLayer.objectFit === fit ? "bg-white text-black" : "bg-zinc-800 text-zinc-500 hover:text-white"}`}>{fit.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(selectedLayer.type === "text" || selectedLayer.type === "caption") && (
                  <>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Text</label>
                      <textarea value={selectedLayer.text || ""} onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none resize-none h-14 mt-0.5" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Font</label>
                      <select value={selectedLayer.fontFamily || ""} onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5">
                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Size</label>
                        <input type="number" min="8" max="96" value={selectedLayer.fontSize || 14} onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Color</label>
                        <input type="color" value={selectedLayer.fontColor || "#FFFFFF"} onChange={(e) => updateLayer(selectedLayer.id, { fontColor: e.target.value })} className="w-8 h-6 mt-0.5 cursor-pointer bg-transparent" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Stroke</label>
                        <input type="color" value={selectedLayer.strokeColor || "#000000"} onChange={(e) => updateLayer(selectedLayer.id, { strokeColor: e.target.value })} className="w-8 h-6 mt-0.5 cursor-pointer bg-transparent" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Stroke W</label>
                        <input type="number" min={0} max={20} step={1} value={selectedLayer.strokeWidth || 0} onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })} className="w-12 bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5" data-testid="input-stroke-width" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })} className={`px-2 py-1 text-[10px] font-bold transition ${selectedLayer.bold ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>B</button>
                      <button onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })} className={`px-2 py-1 text-[10px] italic transition ${selectedLayer.italic ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>I</button>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Text Animation</label>
                      <select value={selectedLayer.textAnimation || "none"} onChange={(e) => updateLayer(selectedLayer.id, { textAnimation: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5">
                        {TEXT_ANIMATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Shadow</label>
                      <div className="grid grid-cols-4 gap-1 mt-0.5">
                        <input type="number" placeholder="Blur" value={selectedLayer.shadowBlur || 0} onChange={(e) => updateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) })} className="bg-zinc-900 border border-white/10 text-[9px] text-white p-1" />
                        <input type="number" placeholder="X" value={selectedLayer.shadowX || 0} onChange={(e) => updateLayer(selectedLayer.id, { shadowX: Number(e.target.value) })} className="bg-zinc-900 border border-white/10 text-[9px] text-white p-1" />
                        <input type="number" placeholder="Y" value={selectedLayer.shadowY || 0} onChange={(e) => updateLayer(selectedLayer.id, { shadowY: Number(e.target.value) })} className="bg-zinc-900 border border-white/10 text-[9px] text-white p-1" />
                        <input type="color" value={selectedLayer.shadowColor || "#000000"} onChange={(e) => updateLayer(selectedLayer.id, { shadowColor: e.target.value })} className="w-full h-6 cursor-pointer bg-transparent" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">OPACITY: {Math.round(selectedLayer.opacity * 100)}%</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="range" min="0" max="100" value={Math.round(selectedLayer.opacity * 100)} onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })} className="flex-1 h-1 accent-white" />
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">BLEND MODE</span>
                  <select value={selectedLayer.blendMode} onChange={(e) => updateLayer(selectedLayer.id, { blendMode: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-1 uppercase tracking-wider">
                    {BLEND_MODES.map(bm => <option key={bm} value={bm}>{bm.toUpperCase()}</option>)}
                  </select>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">MOTION BLUR: {selectedLayer.motionBlur || 0}PX</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="range" min="0" max="20" value={selectedLayer.motionBlur || 0} onChange={(e) => updateLayer(selectedLayer.id, { motionBlur: Number(e.target.value) })} className="flex-1 h-1 accent-white" />
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">PARALLAX DEPTH: {selectedLayer.parallaxDepth || 0}%</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="range" min="0" max="100" value={selectedLayer.parallaxDepth || 0} onChange={(e) => updateLayer(selectedLayer.id, { parallaxDepth: Number(e.target.value) })} className="flex-1 h-1 accent-white" />
                  </div>
                </div>

                {selectedLayer.type === "media" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">STITCH LOOP</span>
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { stitchMode: !selectedLayer.stitchMode })}
                        className={`px-2 py-0.5 text-[8px] font-bold tracking-wider border transition ${selectedLayer.stitchMode ? "bg-white border-white text-black" : "bg-zinc-800 border-white/10 text-zinc-400 hover:text-white"}`}
                        data-testid="button-stitch-toggle"
                      >
                        {selectedLayer.stitchMode ? "ON" : "OFF"}
                      </button>
                    </div>
                    {selectedLayer.stitchMode && (
                      <div className="mt-1">
                        <span className="text-[8px] text-zinc-600">REPEATS: {selectedLayer.stitchRepeat || 2}x</span>
                        <input type="range" min="2" max="8" value={selectedLayer.stitchRepeat || 2} onChange={(e) => updateLayer(selectedLayer.id, { stitchRepeat: Number(e.target.value) })} className="w-full h-1 accent-white mt-0.5" data-testid="input-stitch-repeat" />
                        <p className="text-[7px] text-zinc-600 mt-0.5">Tiles image end-to-end for seamless moving loop</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">LAYER ORDER</span>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex items-center gap-0.5 flex-1">
                      <span className="text-[8px] text-zinc-600">Z</span>
                      <input type="number" min="0" value={selectedLayer.zIndex} onChange={(e) => updateLayer(selectedLayer.id, { zIndex: Number(e.target.value) })} className="w-12 bg-zinc-900 border border-white/10 text-[9px] text-white p-1 font-mono" data-testid="input-layer-zindex" />
                    </div>
                    <button onClick={() => moveLayerToExtreme(selectedLayer.id, "top")} className="px-1.5 py-0.5 text-[7px] font-bold tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition" title="Ctrl+Shift+]" data-testid="button-layer-to-front">FRONT</button>
                    <button onClick={() => moveLayerInStack(selectedLayer.id, "up")} className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition" title="Ctrl+]"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveLayerInStack(selectedLayer.id, "down")} className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition" title="Ctrl+["><ChevronDown className="w-3 h-3" /></button>
                    <button onClick={() => moveLayerToExtreme(selectedLayer.id, "bottom")} className="px-1.5 py-0.5 text-[7px] font-bold tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition" title="Ctrl+Shift+[" data-testid="button-layer-to-back">BACK</button>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">POSITION</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-zinc-600">X</span>
                      <input type="number" value={selectedLayer.positionX} onChange={(e) => updateLayer(selectedLayer.id, { positionX: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 font-mono" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-zinc-600">Y</span>
                      <input type="number" value={selectedLayer.positionY} onChange={(e) => updateLayer(selectedLayer.id, { positionY: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 font-mono" />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">TRANSFORM</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <div>
                      <span className="text-[7px] text-zinc-600">Scale %</span>
                      <input type="number" min="10" max="500" value={selectedLayer.scale} onChange={(e) => updateLayer(selectedLayer.id, { scale: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 font-mono" />
                    </div>
                    <div>
                      <span className="text-[7px] text-zinc-600">Rotation °</span>
                      <input type="number" min="-360" max="360" value={selectedLayer.rotation} onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 font-mono" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Beat React</label>
                  <select value={selectedLayer.beatReact || "none"} onChange={(e) => updateLayer(selectedLayer.id, { beatReact: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5">
                    {BEAT_REACT_MODES.map(br => <option key={br.id} value={br.id}>{br.label}</option>)}
                  </select>
                  {selectedLayer.beatReact && selectedLayer.beatReact !== "none" && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] text-zinc-600">Intensity</span>
                      <input type="range" min="0" max="100" value={selectedLayer.beatIntensity || 50} onChange={(e) => updateLayer(selectedLayer.id, { beatIntensity: Number(e.target.value) })} className="flex-1 h-1 accent-white" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              currentScene && (
                <>
                  <div className="border-b border-white/10 pb-2 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">⚙ VIBE MODES</span>
                      <button onClick={() => {}} className="text-[8px] text-zinc-600 hover:text-white transition tracking-wider">CLEAR</button>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {VIBE_MODES.slice(0, 10).map(vibe => (
                        <button
                          key={vibe.id}
                          onClick={() => applyVibe(vibe.id)}
                          onContextMenu={(e) => { e.preventDefault(); applyVibe(vibe.id, true); }}
                          className="w-full aspect-square flex items-center justify-center text-[10px] transition hover:ring-1 hover:ring-white/30"
                          style={{ background: `linear-gradient(135deg, ${vibe.colors[0]}, ${vibe.colors[1] || "transparent"})`, border: "1px solid rgba(255,255,255,0.1)" }}
                          title={`${vibe.label} (right-click: all scenes)`}
                          data-testid={`vibe-${vibe.id}`}
                        >
                          <span className="opacity-0 group-hover:opacity-100">{vibe.label[0]}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[7px] text-zinc-700 mt-1 text-center tracking-wider">TAP · VIBE SCENE · RIGHT-CLICK · ALL</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-white font-bold tracking-widest uppercase">SCENE {selectedSceneIdx + 1}</span>
                    {currentScene.assetUrl && (
                      <div className="flex gap-1 mt-1.5">
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAssetUpload(currentSceneId, e)} />
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition">Replace</button>
                        <button onClick={() => handleUpdateScene(currentSceneId, { assetUrl: undefined })} className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-400 transition">Remove</button>
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-900/50 p-2 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <LayoutGrid className="w-3 h-3 text-zinc-500" />
                      <span className="text-[9px] text-zinc-400 font-bold tracking-wider">HOP LENGTH: {totalDuration}s</span>
                    </div>
                    <div className="flex gap-1 mb-1.5">
                      {([30, 60, 90, 120] as const).map(dur => (
                        <button
                          key={dur}
                          onClick={() => setClipLengthMode(`${dur}s` as any)}
                          className={`flex-1 py-1 text-[9px] font-bold tracking-wider transition border ${
                            targetDuration === dur ? "bg-white border-white text-black" : "bg-zinc-800 border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
                          }`}
                          data-testid={`hop-length-${dur}`}
                        >
                          {dur}s
                        </button>
                      ))}
                    </div>
                    <span className="text-[8px] text-zinc-600">{scenes.length} scenes · {totalDuration}s total</span>
                    {targetDuration && <div className={`text-[8px] mt-0.5 ${totalDuration > targetDuration ? "text-zinc-400" : "text-white"}`}>{totalDuration}s / {targetDuration}s target</div>}
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">ADD BACKGROUND</span>
                    <button onClick={() => addLayer("media")} className="w-full mt-1 py-1.5 text-[9px] font-bold tracking-wider bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white transition flex items-center justify-center gap-1" data-testid="button-add-bg-layer">
                      <Plus className="w-3 h-3" /> + Add BG Layer
                    </button>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">SCENE DURATION: {currentScene.duration}S</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="range" min="0.5" max="30" step="0.5" value={currentScene.duration} onChange={(e) => handleUpdateScene(currentSceneId, { duration: Number(e.target.value) })} className="flex-1 h-1 accent-white" />
                      <span className="text-[9px] text-zinc-400 w-6 text-right">{currentScene.duration}s</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">TRANSITION</span>
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {TRANSITIONS.map(tr => (
                        <button
                          key={tr.id}
                          onClick={() => handleUpdateScene(currentSceneId, { transition: tr.id })}
                          className={`h-7 flex items-center justify-center text-[10px] transition border ${
                            currentScene.transition === tr.id
                              ? `${tr.color} border-white/40 text-white ring-1 ring-white/30`
                              : `${tr.color} border-transparent text-white/70 hover:border-white/20`
                          }`}
                          title={tr.id}
                          data-testid={`transition-${tr.id}`}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">CAMERA MOTION</span>
                    <div className="grid grid-cols-3 gap-1 mt-1.5">
                      {CAMERA_PRESETS.map(cp => (
                        <button
                          key={cp.id}
                          onClick={() => {
                            if (cp.id === "none") {
                              handleUpdateScene(currentSceneId, { cameraStart: undefined, cameraEnd: undefined, cameraAngle: undefined });
                            } else {
                              handleUpdateScene(currentSceneId, { cameraStart: { ...cp.start }, cameraEnd: { ...cp.end }, cameraAngle: cp.id });
                            }
                          }}
                          className={`py-1.5 text-[8px] font-bold tracking-wider transition border ${
                            currentScene.cameraAngle === cp.id || (!currentScene.cameraAngle && cp.id === "none")
                              ? "bg-zinc-700 border-white/30 text-white"
                              : "bg-zinc-900 border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
                          }`}
                          data-testid={`camera-${cp.id}`}
                        >
                          {cp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Text Overlay</label>
                    <textarea value={currentScene.textOverlay || ""} onChange={(e) => handleUpdateScene(currentSceneId, { textOverlay: e.target.value })} placeholder="Overlay text..." className="w-full mt-0.5 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none resize-none h-12" data-testid="input-text-overlay" />
                    {currentScene.textOverlay && (
                      <>
                        <div className="flex gap-0.5 mt-1 flex-wrap">
                          {TEXT_PRESETS.map(p => (
                            <button key={p.id} onClick={() => applyTextPreset(p.id)} className="px-1.5 py-0.5 text-[8px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition">{p.label}</button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1.5">
                          <div>
                            <label className="text-[8px] text-zinc-600">Position</label>
                            <select value={currentTextStyle.position} onChange={(e) => updateTextStyle({ position: e.target.value as any })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-0.5">
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] text-zinc-600">Align</label>
                            <select value={currentTextStyle.textAlign} onChange={(e) => updateTextStyle({ textAlign: e.target.value as any })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-0.5">
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] text-zinc-600">Animation</label>
                            <select value={currentTextStyle.animation} onChange={(e) => updateTextStyle({ animation: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-0.5">
                              {TEXT_ANIMATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-1">
                          <div className="flex items-center gap-0.5">
                            <label className="text-[8px] text-zinc-600">Text</label>
                            <input type="color" value={currentTextStyle.color} onChange={(e) => updateTextStyle({ color: e.target.value })} className="w-5 h-4 cursor-pointer bg-transparent" />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <label className="text-[8px] text-zinc-600">BG</label>
                            <input type="color" value={currentTextStyle.bgColor} onChange={(e) => updateTextStyle({ bgColor: e.target.value })} className="w-5 h-4 cursor-pointer bg-transparent" />
                          </div>
                          <div className="flex items-center gap-0.5 flex-1">
                            <label className="text-[8px] text-zinc-600">Op</label>
                            <input type="range" min="0" max="100" value={currentTextStyle.bgOpacity} onChange={(e) => updateTextStyle({ bgOpacity: Number(e.target.value) })} className="flex-1 h-1 accent-orange-500" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Caption</label>
                    <input value={currentScene.caption || ""} onChange={(e) => handleUpdateScene(currentSceneId, { caption: e.target.value })} placeholder="Bottom caption..." className="w-full mt-0.5 bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none" data-testid="input-caption" />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={currentScene.loopInScene} onChange={(e) => handleUpdateScene(currentSceneId, { loopInScene: e.target.checked })} className="accent-orange-500" data-testid="checkbox-loop-in-scene" />
                    <span className="text-[10px] text-zinc-400">Loop this scene</span>
                  </label>

                  <div className="border-t border-white/10 pt-2 mt-2">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Scene Details</span>
                    <div className="space-y-1.5 mt-1">
                      <div>
                        <label className="text-[8px] text-zinc-600">Mood</label>
                        <select value={currentScene.mood || ""} onChange={(e) => handleUpdateScene(currentSceneId, { mood: e.target.value || undefined })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                          <option value="">None</option>
                          {MOOD_PRESETS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Camera Angle</label>
                        <select value={currentScene.cameraAngle || ""} onChange={(e) => handleUpdateScene(currentSceneId, { cameraAngle: e.target.value || undefined })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                          <option value="">None</option>
                          {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Lighting</label>
                        <select value={currentScene.lighting || ""} onChange={(e) => handleUpdateScene(currentSceneId, { lighting: e.target.value || undefined })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                          <option value="">None</option>
                          {LIGHTING_PRESETS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Location</label>
                        <input value={currentScene.location || ""} onChange={(e) => handleUpdateScene(currentSceneId, { location: e.target.value || undefined })} placeholder="Scene location..." className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5 outline-none" />
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Sound Pack</label>
                        <select value={currentScene.soundPack || ""} onChange={(e) => handleUpdateScene(currentSceneId, { soundPack: e.target.value || undefined })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                          <option value="">None</option>
                          {SOUND_PACKS.map(sp => <option key={sp.id} value={sp.id}>{sp.label} ({sp.category}){sp.tier === "premium" ? " *" : ""}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Lyrics / Narration</label>
                        <input value={currentScene.lyricsSegment || ""} onChange={(e) => handleUpdateScene(currentSceneId, { lyricsSegment: e.target.value || undefined })} placeholder="Lyrics segment..." className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5 outline-none" />
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-600">Sync Mode</label>
                        <div className="flex gap-0.5 mt-0.5">
                          {(["manual", "snap-to-beat", "fill"] as const).map(mode => (
                            <button key={mode} onClick={() => handleUpdateScene(currentSceneId, { syncMode: mode })} className={`flex-1 py-0.5 text-[8px] transition ${currentScene.syncMode === mode ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>{mode}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Project Settings</span>
                      <button onClick={() => setShowSettings(!showSettings)} className="p-0.5 hover:bg-zinc-800"><Settings2 className="w-3 h-3 text-zinc-500" /></button>
                    </div>
                    {showSettings && (
                      <div className="space-y-2 mt-1">
                        <div>
                          <label className="text-[9px] text-zinc-500">HOP Type</label>
                          <div className="flex gap-1 mt-0.5">
                            {(["single", "series"] as const).map(t => (
                              <button key={t} onClick={() => setHopType(t)} className={`flex-1 py-1 text-[9px] transition ${hopType === t ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500">Duration Target</label>
                          <div className="flex gap-1 mt-0.5">
                            {(["30s", "60s", "90s", "120s", "custom"] as const).map(d => (
                              <button key={d} onClick={() => setClipLengthMode(d)} className={`flex-1 py-1 text-[9px] transition ${clipLengthMode === d ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>{d}</button>
                            ))}
                          </div>
                          {targetDuration && <div className={`text-[8px] mt-0.5 ${totalDuration > targetDuration ? "text-zinc-400" : "text-white"}`}>{totalDuration}s / {targetDuration}s</div>}
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500">Loop Mode</label>
                          <select value={loopMode} onChange={(e) => setLoopMode(e.target.value as any)} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                            <option value="single_loop">Single Loop</option>
                            <option value="full_series_loop">Full Series Loop</option>
                            <option value="manual_advance">Manual Advance</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500">Visibility</label>
                          <select value={visibility} onChange={(e) => { const v = e.target.value as any; setVisibility(v); if (v === "public") fireXpEvent("project_publish", effectiveProjectId); }} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
                            <option value="private">Private</option>
                            <option value="unlisted">Unlisted</option>
                            <option value="public">Public</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500">Tags</label>
                          <div className="flex gap-1 mt-0.5">
                            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTag()} placeholder="Add tag..." className="flex-1 bg-zinc-900 border border-white/10 text-[9px] text-white p-1 outline-none" />
                            <button onClick={handleAddTag} className="px-2 bg-zinc-800 hover:bg-zinc-700 text-[9px] transition">+</button>
                          </div>
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {tags.map(tag => (
                              <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 border border-white/20 text-[8px] text-zinc-300">
                                {tag}
                                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-white"><X className="w-2 h-2" /></button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
      )}

      {audioTrack && <audio key={audioTrack.src.slice(0, 64)} ref={audioRef} src={audioTrack.src} preload="auto" loop={audioTrack.loop} />}
      {audioClips.map(clip => (
        <audio
          key={clip.id}
          ref={el => { if (el) clipAudioRefs.current[clip.id] = el; else delete clipAudioRefs.current[clip.id]; }}
          src={clip.dataUrl}
          preload="auto"
        />
      ))}

      {showProjectPicker && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4" data-testid="project-picker-overlay">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><FolderOpen className="w-4 h-4 text-orange-400" /> Import from My Projects</h3>
              <button onClick={() => setShowProjectPicker(false)} className="p-1 hover:bg-zinc-800 transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0">
              <div className="flex-1 flex items-center bg-zinc-800 border border-white/10 px-2">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search projects..." className="flex-1 bg-transparent text-xs text-white p-1.5 outline-none" />
              </div>
              <div className="flex gap-1">
                {[{ key: "all", label: "All" },{ key: "comic", label: "Comic" },{ key: "card", label: "Card" },{ key: "vn", label: "VN" },{ key: "cyoa", label: "CYOA" },{ key: "motion", label: "Motion" }].map(f => (
                  <button key={f.key} onClick={() => setPickerFilter(f.key)} className={`px-2 py-1 text-[9px] transition ${pickerFilter === f.key ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {(() => {
                const filtered = (allProjects || []).filter(p => p.type !== "hop").filter(p => pickerFilter === "all" || p.type === pickerFilter).filter(p => !pickerSearch || p.title.toLowerCase().includes(pickerSearch.toLowerCase()));
                return filtered.length === 0 ? (
                  <div className="text-center py-12"><FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-2" /><p className="text-xs text-zinc-500">No projects found</p></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filtered.map(project => (
                      <button key={project.id} onClick={() => handleImportFromProject(project)} className="group bg-zinc-800 border border-white/10 hover:border-orange-500/50 transition text-left overflow-hidden">
                        <div className="aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                          {project.thumbnail ? <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ImageIcon className="w-6 h-6 text-zinc-700" />}
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] text-white truncate font-medium">{project.title}</p>
                          <span className="text-[9px] text-orange-400 uppercase tracking-wider">{project.type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showExportPanel && (
        <HopExportPanel
          scenes={scenes}
          title={title}
          projectId={effectiveProjectId}
          totalDuration={totalDuration}
          userTier="free"
          canvasRef={canvasRef}
          onClose={() => setShowExportPanel(false)}
          renderCanvas={() => canvasRef.current}
          hopMode={hopMode}
          panoramaUrl={panoramaUrl}
        />
      )}

      {showSceneTemplates && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4" data-testid="scene-templates-overlay">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-bold text-white">Scene Templates</h3>
              <button onClick={() => setShowSceneTemplates(false)} className="p-1 hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {SCENE_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    const scene = createDefaultScene(scenes.length);
                    const applied: HopScene = {
                      ...scene,
                      ...tmpl.scene,
                      templateId: tmpl.id,
                    };
                    const placeholderText = tmpl.scene.textOverlay || tmpl.label;
                    const textLayer = createDefaultLayer("text", placeholderText, 0);
                    textLayer.text = placeholderText;
                    textLayer.fontSize = tmpl.scene.textOverlay ? 28 : 18;
                    textLayer.fontColor = "#FFFFFF";
                    textLayer.strokeWidth = tmpl.scene.textOverlay ? 3 : 1;
                    textLayer.strokeColor = "#000000";
                    textLayer.positionY = 0;
                    setScenes(prev => [...prev, applied]);
                    setSceneLayers(prev => ({ ...prev, [applied.id]: [textLayer] }));
                    setSelectedSceneIdx(scenes.length);
                    setShowSceneTemplates(false);
                    toast.success(`Added "${tmpl.label}" scene`);
                  }}
                  className="w-full text-left p-3 bg-zinc-800 border border-white/10 hover:border-white/30 transition"
                  data-testid={`template-${tmpl.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tmpl.emoji}</span>
                    <span className="text-xs font-bold text-white">{tmpl.label}</span>
                    <span className="ml-auto text-[7px] text-zinc-500 uppercase border border-white/10 px-1.5 py-0.5">{tmpl.category}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">{tmpl.description}</p>
                  <div className="flex gap-2 mt-1.5 text-[8px] text-zinc-500">
                    <span>{tmpl.scene.duration || 5}s</span>
                    <span>{tmpl.scene.transition || "cut"}</span>
                    {tmpl.scene.mood && <span>{tmpl.scene.mood}</span>}
                    {tmpl.scene.cameraStart && <span>cam: {tmpl.scene.cameraStart.zoom}x→{tmpl.scene.cameraEnd?.zoom || 1}x</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div className="fixed inset-0 bg-black/90 z-[95] flex items-center justify-center p-4" data-testid="welcome-dialog">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-bold tracking-widest text-white">HOP BUILDER</h2>
              </div>
              <p className="text-[11px] text-zinc-500 mb-6">Create animated motion comics</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">1</div>
                  <div>
                    <p className="text-[11px] font-bold text-white tracking-wider">ADD ASSETS</p>
                    <p className="text-[10px] text-zinc-500">Import images, characters or effects as layers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">2</div>
                  <div>
                    <p className="text-[11px] font-bold text-white tracking-wider">ANIMATE</p>
                    <p className="text-[10px] text-zinc-500">Set keyframes — position, scale, opacity over time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">3</div>
                  <div>
                    <p className="text-[11px] font-bold text-white tracking-wider">EXPORT</p>
                    <p className="text-[10px] text-zinc-500">Save as GIF, MP4, or publish as interactive HOP</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setShowWelcome(false); try { localStorage.setItem("hop-builder-welcomed", "1"); } catch {} }}
                className="w-full mt-6 py-2.5 text-[11px] font-bold tracking-widest bg-white text-black hover:bg-zinc-200 transition flex items-center justify-center gap-2"
                data-testid="button-welcome-dismiss"
              >
                <span>◆</span> ADD FIRST LAYER
              </button>
              <p className="text-[9px] text-zinc-600 text-center mt-3">This only shows once — you've got this!</p>
            </div>
          </div>
        </div>
      )}

      {zoneOutMode && (
        <div className="fixed inset-0 bg-black z-[100]" data-testid="zone-out-mode" onDoubleClick={() => { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); setScreensaverMode(false); }}>
          <div className={`absolute inset-0 overflow-hidden ${transitionClass}`}>
            {zoneOutFullFill ? (
              <div className={`w-full h-full ${screensaverMode ? "hop-screensaver-ken-burns" : ""}`}>
                <div className="w-full h-full relative overflow-hidden">
                  {renderCanvas(previewScene, previewLayers, previewTextStyle)}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div style={{ width: `${viewport.w}px`, height: `${viewport.h}px`, maxWidth: "100vw", maxHeight: "100vh", transform: `scale(${Math.min(window.innerWidth / viewport.w, window.innerHeight / viewport.h)})`, transformOrigin: "center center" }}>
                  {renderCanvas(previewScene, previewLayers, previewTextStyle)}
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-4 left-5 z-20">
            <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase">LOOPS SCREENSAVER</p>
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
            <span className="text-sm text-white font-mono tabular-nums">{Math.floor(playbackElapsed / 60).toString().padStart(2, "0")}:{(playbackElapsed % 60).toString().padStart(2, "0")}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }} className="p-1 hover:bg-white/10 rounded transition">
                {isPlaying ? <Square className="w-3 h-3 text-white fill-white" /> : <Play className="w-3 h-3 text-white fill-white" />}
              </button>
              <button onClick={() => setScreensaverMode(!screensaverMode)} className={`p-1 hover:bg-white/10 rounded transition ${screensaverMode ? "text-cyan-400" : "text-zinc-500"}`} title="Screensaver Mode">
                <Maximize2 className="w-3 h-3" />
              </button>
              <button onClick={() => setZoneOutFullFill(!zoneOutFullFill)} className={`p-1 hover:bg-white/10 rounded transition ${zoneOutFullFill ? "text-cyan-400" : "text-zinc-500"}`} title="Fill Screen">
                <Expand className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">Loop {loopCount} · Scene {previewSceneIndex + 1}/{scenes.length}</span>
          </div>

          <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
            {audioTrack && (
              <button onClick={() => { const next = !audioMuted; setAudioMuted(next); if (!next && isPlaying) resumeAudio(); else pauseAudioNow(); }} className="p-1 hover:bg-white/10 rounded transition">
                {audioMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}
            <button onClick={() => { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); setScreensaverMode(false); }} className="px-3 py-1 text-[10px] font-bold tracking-wider bg-white/10 hover:bg-white/20 text-white transition" data-testid="button-exit-zone-out">
              EXIT
            </button>
          </div>

          <div className="absolute bottom-5 left-5 z-20">
            <p className="text-white font-bold text-lg tracking-wider">{title || "Untitled HOP"}</p>
            <p className="text-[10px] text-zinc-500 tracking-wider mt-0.5">{hopType === "single" ? "Single" : "Multi"} HOP · {totalDuration}s</p>
          </div>

          <div className="absolute bottom-5 right-5 z-20">
            {previewScene?.assetUrl && (
              <div className="w-16 h-10 border border-white/20 overflow-hidden opacity-60 hover:opacity-100 transition">
                {(previewScene.assetUrl.match(/\.(mp4|webm|mov)/i) || previewScene.assetUrl.startsWith("data:video/")) ? (
                  <video src={previewScene.assetUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={previewScene.assetUrl} className="w-full h-full object-cover" alt="" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
