import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Play, Pause, Repeat,
  Music, Image as ImageIcon, Film, Type, GripVertical,
  Volume2, VolumeX, ChevronUp, ChevronDown, Eye, X, EyeOff,
  Zap, Clock, Sparkles, Settings2, Loader2, Download,
  Maximize2, SkipForward, SkipBack, FolderOpen, Search,
  Lock, Unlock, Copy, Layers, Monitor, Smartphone, Tablet, Square,
  Palette, Wand2, LayoutGrid, Timer, PenTool, FileText
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

const VIEWPORT_SIZES: Record<ViewportMode, { w: number; h: number; label: string }> = {
  desktop: { w: 800, h: 500, label: "16:9" },
  mobile: { w: 280, h: 500, label: "9:16" },
  tablet: { w: 450, h: 500, label: "4:3" },
  square: { w: 500, h: 500, label: "1:1" },
};

const TRANSITIONS = [
  { id: "cut", label: "Cut", icon: "✂️" },
  { id: "fade", label: "Fade", icon: "🌫️" },
  { id: "zoom", label: "Zoom", icon: "🔍" },
  { id: "glitch", label: "Glitch", icon: "⚡" },
] as const;

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
    objectFit: "cover",
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
  const [clipLengthMode, setClipLengthMode] = useState<"30s" | "90s" | "custom">("30s");
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

  const [viewportMode, setViewportMode] = useState<ViewportMode>("mobile");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("standard");
  const [leftTab, setLeftTab] = useState<"scenes" | "audio" | "vibes">("scenes");
  const [rightContext, setRightContext] = useState<"scene" | "layer">("scene");
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [viewMode, setViewMode] = useState<"builder" | "canvas" | "timeline">("builder");
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasConnections, setCanvasConnections] = useState<CanvasConnection[]>([]);
  const [canvasStickyNotes, setCanvasStickyNotes] = useState<CanvasStickyNote[]>([]);
  const [canvasReferenceImages, setCanvasReferenceImages] = useState<CanvasReferenceImage[]>([]);
  const [canvasAnnotations, setCanvasAnnotations] = useState<{ points: { x: number; y: number }[]; color: string; width: number }[]>([]);
  const [beatMarkers, setBeatMarkers] = useState<{ id: string; timePosition: number; label?: string; autoDetected: boolean }[]>([]);
  const [showSceneTemplates, setShowSceneTemplates] = useState(false);
  const [transitionClass, setTransitionClass] = useState("");
  const [transformMode, setTransformMode] = useState<'move' | 'resize' | 'rotate' | null>(null);
  const transformStartRef = useRef<{ mouseX: number; mouseY: number; layerX: number; layerY: number; layerScale: number; layerRotation: number; canvasScale: number } | null>(null);
  const [dragReorderLayerId, setDragReorderLayerId] = useState<string | null>(null);

  const { data: allProjects } = useProjects(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const targetDuration = clipLengthMode === "30s" ? 30 : clipLengthMode === "90s" ? 90 : null;

  const startAudioFromBeginning = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    const playId = ++audioPlayIdRef.current;
    el.volume = audioTrack.volume;
    el.loop = audioTrack.loop;
    el.currentTime = 0;
    const attempt = () => {
      if (audioPlayIdRef.current !== playId) return;
      el.play().catch(() => {});
    };
    if (el.readyState >= 2) attempt();
    else {
      el.load();
      el.addEventListener("canplay", () => { if (audioPlayIdRef.current === playId) attempt(); }, { once: true });
    }
  }, [audioTrack]);

  const resumeAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    el.volume = audioTrack.volume;
    el.loop = audioTrack.loop;
    if (el.readyState >= 2) el.play().catch(() => {});
  }, [audioTrack]);

  const pauseAudioNow = useCallback(() => {
    audioPlayIdRef.current++;
    audioRef.current?.pause();
  }, []);

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
    canvasNodes: canvasNodes.length > 0 ? canvasNodes : undefined,
    canvasConnections: canvasConnections.length > 0 ? canvasConnections : undefined,
    canvasStickyNotes: canvasStickyNotes.length > 0 ? canvasStickyNotes : undefined,
    canvasReferenceImages: canvasReferenceImages.length > 0 ? canvasReferenceImages : undefined,
    canvasAnnotations: canvasAnnotations.length > 0 ? canvasAnnotations : undefined,
    beatMarkers: beatMarkers.length > 0 ? beatMarkers : undefined,
  } as any), [hopType, clipLengthMode, loopMode, scenes, tags, visibility, totalDuration, audioTrack, sceneLayers, sceneTextStyles, audioClips, displayMode, canvasNodes, canvasConnections, canvasStickyNotes, canvasReferenceImages, canvasAnnotations, beatMarkers]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const hopData = buildHopData();
      if (effectiveProjectId) {
        await saveProjectWithOfflineFallback(effectiveProjectId, { title, data: hopData }, "hop");
        toast.success("HOP saved");
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
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [buildHopData, title, effectiveProjectId, createProject]);

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
    if (emptyScene && !isPlaying) {
      setIsPlaying(true);
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
    } catch (err: any) {
      toast.error("Export failed: " + (err.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  }, [title]);

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
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    el.volume = audioTrack.volume;
    el.loop = audioTrack.loop;
    if (!(isPlaying && !audioMuted)) el.pause();
  }, [isPlaying, audioMuted, audioTrack, showPreview, zoneOutMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (zoneOutMode) { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); }
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoneOutMode, showPreview, selectedLayerId, removeLayer, duplicateLayer, handleSave, pauseAudioNow, currentLayers, currentSceneId]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const getCanvasScale = useCallback(() => {
    if (!canvasRef.current) return 1;
    const rect = canvasRef.current.getBoundingClientRect();
    return rect.width / viewport.w;
  }, [viewport.w]);

  const handleTransformStart = useCallback((e: React.MouseEvent | React.TouchEvent, mode: 'move' | 'resize' | 'rotate') => {
    if (!selectedLayer || selectedLayer.locked) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setTransformMode(mode);
    transformStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      layerX: selectedLayer.positionX,
      layerY: selectedLayer.positionY,
      layerScale: selectedLayer.scale,
      layerRotation: selectedLayer.rotation,
      canvasScale: getCanvasScale(),
    };
  }, [selectedLayer, getCanvasScale]);

  useEffect(() => {
    if (!transformMode || !transformStartRef.current || !selectedLayerId) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) e.preventDefault();
      const start = transformStartRef.current!;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const cs = start.canvasScale || 1;
      if (transformMode === 'move') {
        const dx = (clientX - start.mouseX) / cs;
        const dy = (clientY - start.mouseY) / cs;
        updateLayer(selectedLayerId, {
          positionX: Math.round(start.layerX + dx),
          positionY: Math.round(start.layerY + dy),
        });
      } else if (transformMode === 'resize') {
        const dx = (clientX - start.mouseX) / cs;
        const dy = (clientY - start.mouseY) / cs;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sign = (dx + dy) > 0 ? 1 : -1;
        const newScale = Math.max(10, Math.min(500, start.layerScale + sign * (dist / 50) * start.layerScale * 0.5));
        updateLayer(selectedLayerId, { scale: Math.round(newScale) });
      } else if (transformMode === 'rotate') {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 + (start.layerX * cs);
        const centerY = rect.top + rect.height / 2 + (start.layerY * cs);
        const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
        updateLayer(selectedLayerId, { rotation: Math.round(angle) });
      }
    };
    const handleUp = () => {
      setTransformMode(null);
      transformStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [transformMode, selectedLayerId, updateLayer]);

  const handleLayerReorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    const displayLayers = [...(sceneLayers[currentSceneId] || [])].sort((a, b) => b.zIndex - a.zIndex);
    const fromIdx = displayLayers.findIndex(l => l.id === fromId);
    const toIdx = displayLayers.findIndex(l => l.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = displayLayers.splice(fromIdx, 1);
    displayLayers.splice(toIdx, 0, moved);
    const maxZ = displayLayers.length - 1;
    const reindexed = displayLayers.map((l, i) => ({ ...l, zIndex: maxZ - i }));
    setSceneLayers(sl => ({ ...sl, [currentSceneId]: reindexed }));
  }, [currentSceneId, sceneLayers]);

  const previewScene = scenes[previewSceneIndex];
  const previewLayers = previewScene ? (sceneLayers[previewScene.id] || []) : [];
  const previewTextStyle = previewScene ? (sceneTextStyles[previewScene.id] || defaultTextStyle()) : defaultTextStyle();

  const renderCanvas = (scene: HopScene | undefined, layers: HopLayer[], textStyle: TextOverlayStyle, ref?: React.RefObject<HTMLDivElement | null>) => {
    if (!scene) return <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><p className="text-xs text-zinc-600">No scene</p></div>;
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    return (
      <div ref={ref as any} className="relative w-full h-full overflow-hidden bg-black" style={{ aspectRatio: `${viewport.w}/${viewport.h}` }}>
        {scene.assetUrl && !layers.find(l => l.name === "Background" && l.type === "media") && (
          <div className="absolute inset-0">
            {scene.assetType === "video" ? (
              <video src={scene.assetUrl} className={`w-full h-full object-cover ${displayMode === "moving" ? "hop-moving-mode" : ""}`} style={displayMode === "moving" ? { "--hop-scene-dur": `${scene.duration}s` } as React.CSSProperties : undefined} autoPlay loop muted playsInline data-testid="canvas-bg-video" />
            ) : (
              <img src={scene.assetUrl} alt="" className={`w-full h-full object-cover ${displayMode === "moving" ? "hop-moving-mode" : ""}`} style={displayMode === "moving" ? { "--hop-scene-dur": `${scene.duration}s` } as React.CSSProperties : undefined} data-testid="canvas-bg-image" />
            )}
          </div>
        )}
        {sortedLayers.filter(l => l.visible).map(layer => {
          const isBg = layer.name === "Background" && layer.zIndex === 0;
          const style: React.CSSProperties = {
            position: "absolute",
            opacity: layer.opacity,
            mixBlendMode: layer.blendMode as any,
            zIndex: layer.zIndex,
            ...(isBg ? { inset: 0 } : {
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) translate(${layer.positionX}px,${layer.positionY}px) scale(${layer.scale / 100}) rotate(${layer.rotation}deg)`,
            }),
          };
          const beatAnim = layer.beatReact && layer.beatReact !== "none" && audioBpm
            ? { animation: `hop-beat-${layer.beatReact} ${60 / audioBpm}s ease-out infinite`, "--hop-beat-intensity": `${1 + (layer.beatIntensity || 50) / 200}` } as React.CSSProperties
            : {};
          if (layer.type === "media" && layer.dataUrl) {
            const isVideo = layer.dataUrl.startsWith("data:video/") || layer.dataUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
            const movingClass = displayMode === "moving" && isBg ? "hop-moving-mode" : "";
            const movingStyle = displayMode === "moving" && isBg ? { "--hop-scene-dur": `${scene.duration}s` } as React.CSSProperties : {};
            return (
              <div key={layer.id} style={style} onClick={() => { if (!layer.locked) { setSelectedLayerId(layer.id); setRightContext("layer"); } }}>
                <div style={{ ...beatAnim, ...movingStyle }} className={movingClass}>
                  {isVideo ? (
                    <video src={layer.dataUrl} className="w-full h-full" style={{ objectFit: layer.objectFit }} autoPlay loop muted playsInline draggable={false} />
                  ) : (
                    <img src={layer.dataUrl} alt={layer.name} className="w-full h-full" style={{ objectFit: layer.objectFit }} draggable={false} />
                  )}
                </div>
              </div>
            );
          }
          if (layer.type === "effect" && layer.dataUrl) {
            return (
              <div key={layer.id} style={{ ...style, ...beatAnim, inset: 0, position: "absolute" }}>
                <img src={layer.dataUrl} alt={layer.name} className="w-full h-full object-cover" draggable={false} />
              </div>
            );
          }
          if (layer.type === "text" && layer.text) {
            const textAnim = layer.textAnimation && layer.textAnimation !== "none" ? `hop-text-${layer.textAnimation} 1s ease-out forwards` : undefined;
            return (
              <div key={layer.id} style={style} onClick={() => { if (!layer.locked) { setSelectedLayerId(layer.id); setRightContext("layer"); } }}>
                <div style={beatAnim}>
                  <div style={{
                    fontFamily: layer.fontFamily,
                    fontSize: `${layer.fontSize || 14}px`,
                    color: layer.fontColor || "#fff",
                    fontWeight: layer.bold ? "bold" : "normal",
                    fontStyle: layer.italic ? "italic" : "normal",
                    WebkitTextStroke: layer.strokeWidth ? `${layer.strokeWidth}px ${layer.strokeColor || "#000"}` : undefined,
                    textShadow: layer.shadowBlur ? `${layer.shadowX || 0}px ${layer.shadowY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000"}` : undefined,
                    animation: textAnim,
                    whiteSpace: "pre-wrap",
                    textAlign: "center",
                    padding: "8px",
                  }}>
                    {layer.text}
                  </div>
                </div>
              </div>
            );
          }
          if (layer.type === "caption" && layer.text) {
            return (
              <div key={layer.id} style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: layer.zIndex, opacity: layer.opacity }}>
                <div className="bg-black/70 px-4 py-3 text-center" style={{ fontFamily: layer.fontFamily || "'Press Start 2P', monospace", fontSize: `${layer.fontSize || 12}px`, color: layer.fontColor || "#fff" }}>
                  {layer.text}
                </div>
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
              animation: textStyle.animation !== "none" ? `hop-text-${textStyle.animation} 1s ease-out forwards` : undefined,
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
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white select-none" data-testid="hop-creator">
      <style>{`
        @keyframes hop-text-typewriter { from { max-width: 0 } to { max-width: 100% } }
        @keyframes hop-text-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hop-text-slide-up { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes hop-text-glitch { 0% { clip-path: inset(0 0 80% 0); transform: translate(-4px, 2px) } 20% { clip-path: inset(20% 0 60% 0); transform: translate(4px, -2px) } 40% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, 4px) } 60% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -4px) } 80% { clip-path: inset(80% 0 0 0); transform: translate(4px, 2px) } 100% { clip-path: inset(0); transform: translate(0) } }
        @keyframes hop-text-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
        @keyframes hop-text-wave { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes hop-text-neon-flicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; text-shadow: 0 0 10px currentColor, 0 0 20px currentColor } 20%,24%,55% { opacity: 0.6; text-shadow: none } }
        @keyframes hop-text-zoom-in { from { opacity: 0; transform: scale(0.2) } to { opacity: 1; transform: scale(1) } }
        @keyframes hop-text-spin-in { from { opacity: 0; transform: rotate(360deg) scale(0.3) } to { opacity: 1; transform: rotate(0) scale(1) } }
        @keyframes hop-text-shake { 0%,100% { transform: translateX(0) } 10%,30%,50%,70%,90% { transform: translateX(-6px) } 20%,40%,60%,80% { transform: translateX(6px) } }
        @keyframes hop-text-rainbow { 0% { filter: hue-rotate(0deg) } 100% { filter: hue-rotate(360deg) } }
        @keyframes hop-beat-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(var(--hop-beat-intensity, 1.1)) } }
        @keyframes hop-beat-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes hop-beat-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
        @keyframes hop-beat-glow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.5) } }
        @keyframes hop-beat-zoom { 0%,100% { transform: scale(1) } 50% { transform: scale(var(--hop-beat-intensity, 1.15)) } }
        @keyframes hop-beat-rotate { 0%,100% { transform: rotate(0) } 50% { transform: rotate(5deg) } }
        @keyframes hop-beat-flash { 0%,100% { opacity: var(--hop-base-opacity, 1) } 50% { opacity: 0.3 } }
        @keyframes hop-beat-tilt { 0%,100% { transform: skewX(0) } 50% { transform: skewX(5deg) } }
        @keyframes hop-moving-pan { 0% { transform: translateX(0) } 100% { transform: translateX(-20%) } }
        .hop-moving-mode { animation: hop-moving-pan var(--hop-scene-dur, 5s) linear forwards; width: 140%; }
        .hop-transition-fade { animation: hop-tfade 0.5s ease-out forwards }
        @keyframes hop-tfade { to { opacity: 0 } }
        .hop-transition-zoom { animation: hop-tzoom 0.5s ease-in forwards }
        @keyframes hop-tzoom { to { transform: scale(1.5); opacity: 0 } }
        .hop-transition-glitch { animation: hop-tglitch 0.5s steps(4) forwards }
        @keyframes hop-tglitch { 0% { clip-path: inset(0) } 25% { clip-path: inset(20% 0 40% 0); transform: translate(8px,-4px) } 50% { clip-path: inset(50% 0 10% 0); transform: translate(-8px,4px) } 75% { clip-path: inset(10% 0 60% 0); transform: translate(4px,8px) } 100% { opacity: 0 } }
      `}</style>

      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-white/10 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 hover:bg-zinc-800 transition" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Zap className="w-4 h-4 text-orange-400" />
          <div className="flex items-center gap-0.5 mr-1">
            {([
              { id: "builder" as const, label: "BUILD", icon: LayoutGrid },
              { id: "canvas" as const, label: "CANVAS", icon: PenTool },
              { id: "timeline" as const, label: "TIMELINE", icon: Timer },
            ] as const).map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold tracking-wider transition ${viewMode === v.id ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}
                data-testid={`view-mode-${v.id}`}
              >
                <v.icon className="w-3 h-3" /> <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-white font-bold text-sm border-b border-transparent hover:border-zinc-600 focus:border-orange-500 outline-none px-1 py-0.5 w-40"
            data-testid="input-hop-title"
          />
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 mr-2">
            {(Object.keys(VIEWPORT_SIZES) as ViewportMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewportMode(mode)}
                className={`p-1 text-[9px] transition ${viewportMode === mode ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}
                title={VIEWPORT_SIZES[mode].label}
                data-testid={`button-viewport-${mode}`}
              >
                {mode === "desktop" ? <Monitor className="w-3 h-3" /> : mode === "mobile" ? <Smartphone className="w-3 h-3" /> : mode === "tablet" ? <Tablet className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDisplayMode(d => d === "standard" ? "moving" : "standard")}
            className={`px-2 py-1 text-[9px] font-bold transition ${displayMode === "moving" ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}
            data-testid="button-display-mode"
          >
            {displayMode === "standard" ? "STD" : "MOV"}
          </button>
          <button
            onClick={() => { setShowPreview(false); setZoneOutMode(true); setPreviewSceneIndex(0); setLoopCount(0); setIsPlaying(true); if (audioTrack && !audioMuted) startAudioFromBeginning(); }}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition"
            title="Zone Out"
            data-testid="button-zone-out"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportPng}
            disabled={exporting}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-green-400 transition"
            title="Export PNG"
            data-testid="button-export-png"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowExportPanel(true)}
            className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1"
            title="Full Export Panel"
            data-testid="button-export-panel"
          >
            <FileText className="w-3 h-3" /> Export
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50"
            data-testid="button-save"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
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
            onSceneSelect={(idx) => { setSelectedSceneIdx(idx); setSelectedLayerId(null); setRightContext("scene"); }}
            onSceneUpdate={(id, updates) => handleUpdateScene(id, updates)}
            onBeatMarkersChange={setBeatMarkers}
            onPlayToggle={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }}
            onAddScene={handleAddScene}
          />
        </div>
      )}

      {viewMode === "builder" && (
      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 bg-zinc-950 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-white/10 shrink-0">
            {(["scenes", "audio", "vibes"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition ${leftTab === tab ? "text-orange-400 border-b-2 border-orange-500 bg-zinc-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
                data-testid={`tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {leftTab === "scenes" && (
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-zinc-500 font-bold">{scenes.length} SCENES · {totalDuration}s</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => setShowSceneTemplates(true)} className="p-1 hover:bg-zinc-800 text-cyan-400 transition" title="From Template" data-testid="button-scene-templates">
                      <FileText className="w-3 h-3" />
                    </button>
                    <button onClick={handleAddScene} className="p-1 hover:bg-zinc-800 text-orange-400 transition" data-testid="button-add-scene">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    onClick={() => { setSelectedSceneIdx(idx); setSelectedLayerId(null); setRightContext("scene"); }}
                    className={`flex items-center gap-1.5 px-1.5 py-1.5 cursor-pointer transition text-xs ${
                      selectedSceneIdx === idx ? "bg-orange-900/30 border border-orange-500/50" : "bg-zinc-900/50 border border-transparent hover:border-white/10"
                    }`}
                    data-testid={`scene-item-${idx}`}
                  >
                    <div className="w-10 h-10 bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {scene.assetUrl ? (
                        scene.assetType === "video" ? <Film className="w-4 h-4 text-zinc-500" /> :
                        <img src={scene.assetUrl} alt="" className="w-full h-full object-cover" />
                      ) : scene.assetType === "text_card" ? <Type className="w-4 h-4 text-zinc-500" /> :
                        <ImageIcon className="w-4 h-4 text-zinc-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate text-[11px]">{scene.textOverlay || scene.caption || scene.title || `Scene ${idx + 1}`}</div>
                      <div className="text-[9px] text-zinc-500">{scene.duration}s · {scene.transition}{scene.mood ? ` · ${scene.mood.split(",")[0]}` : ""}{scene.templateId ? " [T]" : ""}</div>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "up"); }} className="p-0.5 hover:bg-zinc-700"><ChevronUp className="w-2.5 h-2.5 text-zinc-500" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, "down"); }} className="p-0.5 hover:bg-zinc-700"><ChevronDown className="w-2.5 h-2.5 text-zinc-500" /></button>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicateScene(idx); }} className="p-0.5 hover:bg-zinc-700" title="Duplicate"><Copy className="w-2.5 h-2.5 text-zinc-500" /></button>
                      {scenes.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveScene(scene.id); }} className="p-0.5 hover:bg-red-900/30 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                      )}
                    </div>
                  </div>
                ))}
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
                      <Music className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="text-[11px] text-zinc-300 truncate flex-1">{audioTrack.name}</span>
                      <button onClick={() => setAudioMuted(!audioMuted)} className="p-0.5" data-testid="button-audio-mute">
                        {audioMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-green-400" />}
                      </button>
                      <button onClick={() => setAudioTrack(null)} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-500 w-8">{Math.round(audioTrack.volume * 100)}%</span>
                        <input type="range" min="0" max="100" value={audioTrack.volume * 100} onChange={(e) => { const vol = Number(e.target.value) / 100; setAudioTrack(prev => prev ? { ...prev, volume: vol } : null); if (audioRef.current) audioRef.current.volume = vol; }} className="flex-1 h-1 accent-orange-500" data-testid="slider-audio-volume" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] text-zinc-500">BPM</label>
                        <input type="number" min="1" max="300" value={audioBpm || ""} onChange={(e) => setAudioBpm(Number(e.target.value) || null)} placeholder="120" className="w-16 bg-zinc-800 border border-white/10 text-xs text-white p-1 outline-none" data-testid="input-bpm" />
                        <button onClick={handleSnapToBpm} disabled={!audioBpm} className="px-2 py-1 text-[9px] bg-orange-900/40 hover:bg-orange-800/50 text-orange-400 border border-orange-500/30 disabled:opacity-30 transition" data-testid="button-snap-bpm">
                          SNAP
                        </button>
                      </div>
                      <button onClick={() => setAudioTrack(prev => prev ? { ...prev, loop: !prev.loop } : null)} className={`flex items-center gap-1 px-2 py-1 text-[9px] transition w-full ${audioTrack.loop ? "bg-orange-900/30 text-orange-400 border border-orange-500/50" : "bg-zinc-800 text-zinc-500 border border-white/10"}`} data-testid="button-audio-loop-toggle">
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
                      className="py-2 px-1.5 text-[9px] font-bold bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-orange-500/50 transition text-center"
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

        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/50">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div className="relative" style={{ width: `${viewport.w}px`, maxWidth: "100%", maxHeight: "100%" }}>
              <div className={`border-2 border-zinc-700 overflow-hidden relative ${transitionClass}`} style={{ aspectRatio: `${viewport.w}/${viewport.h}` }}>
                {renderCanvas(currentScene, currentLayers, currentTextStyle, canvasRef)}
                {selectedLayer && selectedLayer.name !== "Background" && !selectedLayer.locked && (selectedLayer.type === "media" || selectedLayer.type === "text") && (() => {
                  const frameSize = Math.max(60, selectedLayer.scale);
                  return (
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 998 }}>
                      <div
                        className="absolute pointer-events-auto"
                        style={{
                          left: "50%",
                          top: "50%",
                          width: `${frameSize}px`,
                          height: `${frameSize}px`,
                          transform: `translate(-50%,-50%) translate(${selectedLayer.positionX}px,${selectedLayer.positionY}px) rotate(${selectedLayer.rotation}deg)`,
                        }}
                      >
                        <div
                          className="absolute inset-0 border-2 border-orange-500/80"
                          style={{ cursor: transformMode === 'move' ? 'grabbing' : 'move', touchAction: 'none' }}
                          onMouseDown={(e) => handleTransformStart(e, 'move')}
                          onTouchStart={(e) => handleTransformStart(e, 'move')}
                          data-testid="transform-move"
                        />
                        {[
                          { x: 0, y: 0 },
                          { x: 1, y: 0 },
                          { x: 0, y: 1 },
                          { x: 1, y: 1 },
                        ].map((corner, i) => (
                          <div
                            key={i}
                            className="absolute w-5 h-5 bg-orange-500 border border-white"
                            style={{
                              left: corner.x ? '100%' : '0%',
                              top: corner.y ? '100%' : '0%',
                              transform: 'translate(-50%,-50%)',
                              cursor: (corner.x === corner.y) ? 'nwse-resize' : 'nesw-resize',
                              touchAction: 'none',
                              minWidth: '20px',
                              minHeight: '20px',
                            }}
                            onMouseDown={(e) => handleTransformStart(e, 'resize')}
                            onTouchStart={(e) => handleTransformStart(e, 'resize')}
                            data-testid={`transform-resize-${i}`}
                          />
                        ))}
                        <div
                          className="absolute left-1/2 flex flex-col items-center"
                          style={{ bottom: '100%', transform: 'translateX(-50%)', cursor: 'grab', marginBottom: '4px', touchAction: 'none' }}
                          onMouseDown={(e) => handleTransformStart(e, 'rotate')}
                          onTouchStart={(e) => handleTransformStart(e, 'rotate')}
                          data-testid="transform-rotate"
                        >
                          <div className="w-5 h-5 rounded-full bg-cyan-500 border border-white" />
                          <div className="w-px h-3 bg-cyan-500" />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {!currentScene?.assetUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center pointer-events-auto">
                    <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 mb-2">Drop media or click to upload</p>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAssetUpload(currentSceneId, e)} />
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition" data-testid="button-upload-asset">Choose File</button>
                      <button onClick={() => setShowProjectPicker(true)} className="px-3 py-1.5 text-xs bg-orange-900/40 hover:bg-orange-800/50 border border-orange-500/30 text-orange-400 transition flex items-center gap-1" data-testid="button-import-from-projects">
                        <FolderOpen className="w-3 h-3" /> My Projects
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-16 bg-zinc-950 border-t border-white/10 px-3 flex items-center gap-1 overflow-x-auto shrink-0">
            <div className="flex items-center gap-2 mr-3 shrink-0">
              <button onClick={() => setPreviewSceneIndex(Math.max(0, previewSceneIndex - 1))} className="p-1 hover:bg-zinc-800 transition" data-testid="timeline-prev"><SkipBack className="w-3 h-3" /></button>
              <button onClick={() => { const next = !isPlaying; setIsPlaying(next); if (next && audioTrack && !audioMuted) resumeAudio(); else pauseAudioNow(); }} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 transition" data-testid="timeline-play">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setPreviewSceneIndex(Math.min(scenes.length - 1, previewSceneIndex + 1))} className="p-1 hover:bg-zinc-800 transition" data-testid="timeline-next"><SkipForward className="w-3 h-3" /></button>
              <span className="text-[9px] text-zinc-500 font-mono">{selectedSceneIdx + 1}/{scenes.length}</span>
              {isPlaying && <span className="text-[9px] text-orange-400 font-mono flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />{loopCount}</span>}
            </div>
            {scenes.map((scene, idx) => {
              const w = targetDuration ? Math.min((scene.duration / targetDuration) * 100, 50) : (100 / scenes.length);
              return (
                <div
                  key={scene.id}
                  onClick={() => { setSelectedSceneIdx(idx); setPreviewSceneIndex(idx); }}
                  className={`h-10 flex items-center justify-center cursor-pointer border transition shrink-0 ${
                    selectedSceneIdx === idx ? "border-orange-500 bg-orange-900/20" : previewSceneIndex === idx && isPlaying ? "border-cyan-500/50 bg-cyan-900/10" : "border-white/10 bg-zinc-900 hover:bg-zinc-800"
                  }`}
                  style={{ width: `${Math.max(w, 6)}%`, minWidth: "50px" }}
                  data-testid={`timeline-scene-${idx}`}
                >
                  <div className="text-center">
                    <div className="text-[8px] text-zinc-400 font-mono">{idx + 1}</div>
                    <div className="text-[7px] text-zinc-600">{scene.duration}s</div>
                  </div>
                </div>
              );
            })}
            <button onClick={handleAddScene} className="h-10 w-10 flex items-center justify-center border border-dashed border-white/10 text-zinc-600 hover:text-orange-400 hover:border-orange-500/50 transition shrink-0" data-testid="timeline-add-scene">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="w-72 bg-zinc-950 border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="p-2 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1"><Layers className="w-3 h-3" /> Layers</span>
              <div className="flex gap-0.5">
                <button onClick={() => addLayer("media")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-orange-400 transition" title="Add Media"><ImageIcon className="w-3 h-3" /></button>
                <button onClick={() => addLayer("text")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-orange-400 transition" title="Add Text"><Type className="w-3 h-3" /></button>
                <button onClick={() => addLayer("effect")} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-orange-400 transition" title="Add Effect"><Sparkles className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {[...currentLayers].sort((a, b) => b.zIndex - a.zIndex).map(layer => (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={() => setDragReorderLayerId(layer.id)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); if (dragReorderLayerId) { handleLayerReorder(dragReorderLayerId, layer.id); setDragReorderLayerId(null); } }}
                  onDragEnd={() => setDragReorderLayerId(null)}
                  onClick={() => { setSelectedLayerId(layer.id); setRightContext("layer"); }}
                  className={`flex items-center gap-1 px-1.5 py-1 cursor-pointer transition text-[10px] ${
                    selectedLayerId === layer.id ? "bg-orange-900/30 border border-orange-500/50" :
                    dragReorderLayerId === layer.id ? "opacity-50 bg-zinc-900/30 border border-dashed border-orange-400/50" :
                    "bg-zinc-900/30 border border-transparent hover:border-white/10"
                  }`}
                  data-testid={`layer-item-${layer.id}`}
                >
                  <GripVertical className="w-2.5 h-2.5 text-zinc-600 shrink-0 cursor-grab" />
                  <span className="text-zinc-500 shrink-0">
                    {layer.type === "media" ? "🖼️" : layer.type === "text" ? "T" : layer.type === "effect" ? "✨" : "T"}
                  </span>
                  <span className="flex-1 truncate text-zinc-300">{layer.name}</span>
                  <span className="text-zinc-600 text-[8px] shrink-0">{Math.round(layer.opacity * 100)}%</span>
                  <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className="p-0.5">
                    {layer.visible ? <Eye className="w-2.5 h-2.5 text-zinc-500" /> : <EyeOff className="w-2.5 h-2.5 text-zinc-600" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} className="p-0.5">
                    {layer.locked ? <Lock className="w-2.5 h-2.5 text-red-400" /> : <Unlock className="w-2.5 h-2.5 text-zinc-600" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="p-0.5 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                </div>
              ))}
              {currentLayers.length === 0 && (
                <p className="text-[9px] text-zinc-600 text-center py-2">No layers — add media, text, or effects</p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {rightContext === "layer" && selectedLayer ? (
              <>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Layer Name</label>
                  <input value={selectedLayer.name} onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1.5 outline-none mt-0.5" />
                </div>

                {selectedLayer.type === "media" && (
                  <>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Media</label>
                      <input ref={layerFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleLayerFileUpload} />
                      <button onClick={() => layerFileRef.current?.click()} className="w-full mt-0.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition" data-testid="button-replace-layer-media">
                        {selectedLayer.dataUrl ? "Replace Media" : "Choose Media"}
                      </button>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Fit Mode</label>
                      <div className="flex gap-1 mt-0.5">
                        {(["cover", "contain", "fill"] as const).map(fit => (
                          <button key={fit} onClick={() => updateLayer(selectedLayer.id, { objectFit: fit })} className={`flex-1 py-1 text-[9px] transition ${selectedLayer.objectFit === fit ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{fit.toUpperCase()}</button>
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
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })} className={`px-2 py-1 text-[10px] font-bold transition ${selectedLayer.bold ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>B</button>
                      <button onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })} className={`px-2 py-1 text-[10px] italic transition ${selectedLayer.italic ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>I</button>
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
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Opacity</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input type="range" min="0" max="100" value={Math.round(selectedLayer.opacity * 100)} onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })} className="flex-1 h-1 accent-orange-500" />
                    <span className="text-[9px] text-zinc-500 w-8 text-right">{Math.round(selectedLayer.opacity * 100)}%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Blend Mode</label>
                  <select value={selectedLayer.blendMode} onChange={(e) => updateLayer(selectedLayer.id, { blendMode: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5">
                    {BLEND_MODES.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                  </select>
                </div>

                {selectedLayer.name !== "Background" && (
                  <>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold">Position</label>
                      <div className="grid grid-cols-2 gap-1 mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-zinc-600">X</span>
                          <input type="number" value={selectedLayer.positionX} onChange={(e) => updateLayer(selectedLayer.id, { positionX: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-zinc-600">Y</span>
                          <input type="number" value={selectedLayer.positionY} onChange={(e) => updateLayer(selectedLayer.id, { positionY: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Scale %</label>
                        <input type="number" min="10" max="500" value={selectedLayer.scale} onChange={(e) => updateLayer(selectedLayer.id, { scale: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold">Rotation</label>
                        <input type="number" min="-360" max="360" value={selectedLayer.rotation} onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Beat React</label>
                  <select value={selectedLayer.beatReact || "none"} onChange={(e) => updateLayer(selectedLayer.id, { beatReact: e.target.value })} className="w-full bg-zinc-900 border border-white/10 text-xs text-white p-1 mt-0.5">
                    {BEAT_REACT_MODES.map(br => <option key={br.id} value={br.id}>{br.label}</option>)}
                  </select>
                  {selectedLayer.beatReact && selectedLayer.beatReact !== "none" && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] text-zinc-600">Intensity</span>
                      <input type="range" min="0" max="100" value={selectedLayer.beatIntensity || 50} onChange={(e) => updateLayer(selectedLayer.id, { beatIntensity: Number(e.target.value) })} className="flex-1 h-1 accent-orange-500" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              currentScene && (
                <>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Scene {selectedSceneIdx + 1}</label>
                    {currentScene.assetUrl && (
                      <div className="flex gap-1 mt-1">
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAssetUpload(currentSceneId, e)} />
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition">Replace</button>
                        <button onClick={() => handleUpdateScene(currentSceneId, { assetUrl: undefined })} className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-red-900/30 border border-white/10 text-red-400 transition">Remove</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Duration</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input type="range" min="0.5" max="30" step="0.5" value={currentScene.duration} onChange={(e) => handleUpdateScene(currentSceneId, { duration: Number(e.target.value) })} className="flex-1 h-1 accent-orange-500" />
                      <span className="text-[9px] text-zinc-400 w-6 text-right">{currentScene.duration}s</span>
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 5, 10, 15].map(d => (
                        <button key={d} onClick={() => handleUpdateScene(currentSceneId, { duration: d })} className={`flex-1 py-0.5 text-[8px] transition ${currentScene.duration === d ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{d}s</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Transition</label>
                    <div className="grid grid-cols-4 gap-0.5 mt-0.5">
                      {TRANSITIONS.map(tr => (
                        <button key={tr.id} onClick={() => handleUpdateScene(currentSceneId, { transition: tr.id })} className={`py-1 text-[9px] transition ${currentScene.transition === tr.id ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                          {tr.label}
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
                            <button key={mode} onClick={() => handleUpdateScene(currentSceneId, { syncMode: mode })} className={`flex-1 py-0.5 text-[8px] transition ${currentScene.syncMode === mode ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{mode}</button>
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
                              <button key={t} onClick={() => setHopType(t)} className={`flex-1 py-1 text-[9px] transition ${hopType === t ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500">Duration Target</label>
                          <div className="flex gap-1 mt-0.5">
                            {(["30s", "90s", "custom"] as const).map(d => (
                              <button key={d} onClick={() => setClipLengthMode(d)} className={`flex-1 py-1 text-[9px] transition ${clipLengthMode === d ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>{d}</button>
                            ))}
                          </div>
                          {targetDuration && <div className={`text-[8px] mt-0.5 ${totalDuration > targetDuration ? "text-red-400" : "text-green-400"}`}>{totalDuration}s / {targetDuration}s</div>}
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
                          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} className="w-full bg-zinc-900 border border-white/10 text-[9px] text-white p-1 mt-0.5">
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
                              <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-900/30 border border-orange-500/30 text-[8px] text-orange-300">
                                {tag}
                                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400"><X className="w-2 h-2" /></button>
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
                      duration: tmpl.defaults.duration,
                      transition: tmpl.defaults.transition,
                      mood: tmpl.defaults.mood,
                      cameraAngle: tmpl.defaults.cameraAngle,
                      lighting: tmpl.defaults.lighting,
                      soundPack: tmpl.defaults.soundPack,
                      textOverlay: tmpl.defaults.textOverlay,
                      templateId: tmpl.id,
                    };
                    setScenes(prev => [...prev, applied]);
                    setSelectedSceneIdx(scenes.length);
                    setShowSceneTemplates(false);
                    toast.success(`Added "${tmpl.label}" scene`);
                  }}
                  className="w-full text-left p-3 bg-zinc-800 border border-white/10 hover:border-orange-500/50 transition"
                  data-testid={`template-${tmpl.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{tmpl.label}</span>
                    {tmpl.category === "premium" && <span className="text-[7px] text-orange-400 bg-orange-900/30 px-1.5 py-0.5 border border-orange-500/30">PREMIUM</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{tmpl.description}</p>
                  <div className="flex gap-2 mt-1 text-[8px] text-zinc-500">
                    <span>{tmpl.defaults.duration}s</span>
                    <span>{tmpl.defaults.transition}</span>
                    {tmpl.defaults.mood && <span>{tmpl.defaults.mood}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {zoneOutMode && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center" data-testid="zone-out-mode" onDoubleClick={() => { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); }}>
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-mono flex items-center gap-1"><Repeat className="w-3 h-3" /> {loopCount}</span>
              <span className="text-xs text-zinc-500 font-mono">Scene {previewSceneIndex + 1}/{scenes.length}</span>
              {audioTrack && (
                <button onClick={() => { const next = !audioMuted; setAudioMuted(next); if (!next && isPlaying) resumeAudio(); else pauseAudioNow(); }} className="p-1 hover:bg-white/10 transition">
                  {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
                </button>
              )}
            </div>
            <button onClick={() => { setZoneOutMode(false); setIsPlaying(false); pauseAudioNow(); }} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white font-bold transition" data-testid="button-exit-zone-out">EXIT</button>
          </div>
          <div className={`w-full h-full flex items-center justify-center ${transitionClass}`}>
            <div style={{ width: `${viewport.w}px`, height: `${viewport.h}px`, maxWidth: "100vw", maxHeight: "100vh", transform: `scale(${Math.min(window.innerWidth / viewport.w, window.innerHeight / viewport.h)})`, transformOrigin: "center center" }}>
              {renderCanvas(previewScene, previewLayers, previewTextStyle)}
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-[10px] text-zinc-600">ESC or double-click to exit</p>
            <p className="text-xs text-white font-bold mt-1">{title}</p>
            <p className="text-[9px] text-zinc-500">{hopType} · {totalDuration}s · {scenes.length} scenes</p>
          </div>
        </div>
      )}
    </div>
  );
}
