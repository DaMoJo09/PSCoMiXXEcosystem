import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Repeat,
  Plus, Trash2, Copy, Save, Download, Upload,
  Wand2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Maximize2,
  Sparkles, Film, Music,
  Eye, EyeOff, Lock, Unlock,
  X, Pen, Eraser, MousePointer, Undo2, Redo2,
  Circle, Square, Minus, ArrowRight, PenTool, Pencil,
  Palette, Type, Image as ImageIcon,
  BookOpen, Layers, MonitorPlay, Check,
  Blend, Droplets, Zap, Move, RotateCcw, FlipHorizontal,
  Diamond, Clock, TrendingUp, Sliders, GitBranch, Aperture,
  Volume2, VolumeX, Grid3X3, Focus, Lightbulb, Wind, Flame,
  Pipette, PaintBucket, Star, Pentagon, Lasso, SquareDashed, CircleDashed,
  Scissors, Clipboard, ClipboardPaste,
  FileVideo, Settings2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useUpdateProject, useCreateProject, useProjects } from "@/hooks/useProjects";
import { AssetBrowser } from "@/components/tools/AssetBrowser";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { apiRequest } from "@/lib/queryClient";
import { saveProjectWithOfflineFallback } from "@/lib/offlineStorage";

// Easing presets
const EASING_PRESETS = [
  { id: "linear", name: "Linear", curve: "linear" },
  { id: "ease-in", name: "Ease In", curve: "ease-in" },
  { id: "ease-out", name: "Ease Out", curve: "ease-out" },
  { id: "ease-in-out", name: "Ease In Out", curve: "ease-in-out" },
  { id: "bounce", name: "Bounce", curve: "bounce" },
  { id: "elastic", name: "Elastic", curve: "elastic" },
];

// FX Presets
const FX_PRESETS = [
  { id: "shake", name: "Shake", icon: Wind, color: "text-white" },
  { id: "zoom-in", name: "Zoom In", icon: ZoomIn, color: "text-white" },
  { id: "zoom-out", name: "Zoom Out", icon: ZoomOut, color: "text-white" },
  { id: "pan-left", name: "Pan Left", icon: ArrowLeft, color: "text-white" },
  { id: "pan-right", name: "Pan Right", icon: ArrowRight, color: "text-white" },
  { id: "fade-in", name: "Fade In", icon: Aperture, color: "text-white" },
  { id: "fade-out", name: "Fade Out", icon: Aperture, color: "text-white" },
  { id: "blur", name: "Blur", icon: Focus, color: "text-white" },
  { id: "flash", name: "Flash", icon: Lightbulb, color: "text-white" },
  { id: "glow", name: "Glow", icon: Flame, color: "text-white" },
];

// Blend Modes
const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"
];

// Drawing Types
type DrawingMode = "raster" | "vector";
type RasterTool = "pen" | "eraser" | "select" | "rect-select" | "ellipse-select" | "lasso-select" | "shape-rect" | "shape-ellipse" | "shape-line" | "shape-arrow" | "shape-polygon" | "shape-star" | "fill" | "eyedropper";
type VectorTool = "pen" | "pencil" | "select" | "line" | "rectangle" | "ellipse" | "arrow";

interface VectorPath {
  id: string;
  type: "path" | "line" | "rectangle" | "ellipse" | "arrow";
  points: { x: number; y: number }[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  closed: boolean;
}

interface ImageLayer {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
}

interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  blendMode: string;
  imageData: string;
}

interface Frame {
  id: string;
  imageData: string;
  vectorPaths: VectorPath[];
  imageLayers: ImageLayer[];
  drawingLayers?: DrawingLayer[];
  duration: number;
  effects?: string[];
  opacity?: number;
  blendMode?: string;
  easing?: string;
  keyframe?: { x: number; y: number; scale: number; rotation: number; opacity: number };
}

interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  visible: boolean;
  locked: boolean;
}

interface AudioClip {
  id: string;
  name: string;
  src: string;
  startFrame: number;
  durationFrames: number;
  volume: number;
  muted: boolean;
}

const COLORS = [
  "#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", 
  "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#8800ff",
  "#888888", "#444444"
];

// Map CSS blend modes to Canvas composite operations
const mapBlendMode = (mode: string): GlobalCompositeOperation => {
  const modeMap: Record<string, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };
  return modeMap[mode] || 'source-over';
};

// Composite frame with effects and image layers applied (for export/output)
const compositeFrameWithEffects = (frame: Frame): Promise<string> => {
  return new Promise((resolve) => {
    const drawingLayers = frame.drawingLayers?.filter(l => l.visible) || [];
    const hasDrawingLayers = drawingLayers.length > 0;
    const hasRaster = !!frame.imageData;
    const imgLayers = frame.imageLayers?.filter(l => l.visible) || [];
    
    if (!hasRaster && !hasDrawingLayers && imgLayers.length === 0) {
      resolve("");
      return;
    }
    
    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      resolve(frame.imageData || "");
      return;
    }
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const loadImg = (src: string): Promise<HTMLImageElement | null> => {
      if (!src || !src.startsWith('data:')) return Promise.resolve(null);
      return new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
      });
    };

    const drawDrawingLayers = async () => {
      if (hasDrawingLayers) {
        for (const dl of drawingLayers) {
          const dlImg = await loadImg(dl.imageData);
          if (dlImg) {
            ctx.save();
            ctx.globalAlpha = (dl.opacity ?? 100) / 100;
            ctx.globalCompositeOperation = mapBlendMode(dl.blendMode || 'normal');
            ctx.drawImage(dlImg, 0, 0);
            ctx.restore();
          }
        }
      } else if (hasRaster) {
        const rasterImg = await loadImg(frame.imageData);
        if (rasterImg) {
          ctx.globalAlpha = (frame.opacity ?? 100) / 100;
          ctx.globalCompositeOperation = mapBlendMode(frame.blendMode || 'normal');
          ctx.drawImage(rasterImg, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    };
    
    const drawImageLayers = async () => {
      if (imgLayers.length === 0) return;
      const loaded = await Promise.all(imgLayers.map(async (layer) => {
        const lImg = await loadImg(layer.src);
        return { img: lImg, layer };
      }));
      loaded.forEach(({ img: li, layer: l }) => {
        if (!li) return;
        ctx.save();
        ctx.globalAlpha = l.opacity / 100;
        if (l.rotation) {
          const cx = l.x + l.width / 2;
          const cy = l.y + l.height / 2;
          ctx.translate(cx, cy);
          ctx.rotate((l.rotation * Math.PI) / 180);
          ctx.drawImage(li, -l.width / 2, -l.height / 2, l.width, l.height);
        } else {
          ctx.drawImage(li, l.x, l.y, l.width, l.height);
        }
        ctx.restore();
      });
    };
    
    const applyEffectsAndResolve = () => {
      if (frame.effects?.length) {
        frame.effects.forEach(effectId => {
          if (effectId === 'vignette') {
            const gradient = ctx.createRadialGradient(960, 540, 0, 960, 540, 1100);
            gradient.addColorStop(0.7, 'transparent');
            gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, offscreen.width, offscreen.height);
          } else if (effectId === 'sepia') {
            ctx.fillStyle = 'rgba(112,66,20,0.2)';
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(0, 0, offscreen.width, offscreen.height);
            ctx.globalCompositeOperation = 'source-over';
          }
        });
      }
      resolve(offscreen.toDataURL('image/png'));
    };
    
    (async () => {
      await drawDrawingLayers();
      await drawImageLayers();
      applyEffectsAndResolve();
    })();
  });
};

function encodeGIFInWorker(
  frameDataArrays: Uint8ClampedArray[],
  width: number,
  height: number,
  delayMs: number,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/gifEncoder.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'progress') {
        onProgress?.(e.data.progress);
      } else if (e.data.type === 'done') {
        resolve(e.data.gifBytes as Uint8Array);
        worker.terminate();
      }
    };
    worker.onerror = (err) => {
      reject(new Error(err.message || 'GIF encoding worker failed'));
      worker.terminate();
    };
    const transferable = frameDataArrays.map(arr => arr.buffer);
    worker.postMessage({ frameDataArrays, width, height, delayMs }, transferable as any);
  });
}

function VirtualizedFrameList({
  frames,
  currentFrameIndex,
  onSelectFrame,
  maxHeight
}: {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (idx: number) => void;
  maxHeight: number;
}) {
  const ITEM_HEIGHT = 40;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const useVirtualization = frames.length > 50;
  const visibleCount = Math.ceil(maxHeight / ITEM_HEIGHT) + 2;
  const startIdx = useVirtualization ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 1) : 0;
  const endIdx = useVirtualization ? Math.min(frames.length, startIdx + visibleCount) : frames.length;
  const totalHeight = frames.length * ITEM_HEIGHT;

  useEffect(() => {
    if (useVirtualization && containerRef.current) {
      const targetScroll = currentFrameIndex * ITEM_HEIGHT - maxHeight / 2;
      containerRef.current.scrollTop = Math.max(0, targetScroll);
    }
  }, [currentFrameIndex, useVirtualization, maxHeight]);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ maxHeight }}
      onScroll={useVirtualization ? (e) => setScrollTop((e.target as HTMLDivElement).scrollTop) : undefined}
    >
      <div style={useVirtualization ? { height: totalHeight, position: 'relative' } : undefined} className={useVirtualization ? undefined : "space-y-1"}>
        {frames.slice(startIdx, endIdx).map((frame, i) => {
          const idx = startIdx + i;
          return (
            <button
              key={frame.id}
              onClick={() => onSelectFrame(idx)}
              data-testid={`button-frame-${idx}`}
              className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                idx === currentFrameIndex
                  ? 'bg-white/20 border border-white/50'
                  : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent'
              }`}
              style={useVirtualization ? { position: 'absolute', top: idx * ITEM_HEIGHT, height: ITEM_HEIGHT - 4, left: 0, right: 0 } : undefined}
            >
              <div className="w-10 h-6 bg-[#252525] rounded overflow-hidden flex-shrink-0">
                {frame.imageData && <img src={frame.imageData} loading="lazy" className="w-full h-full object-cover" alt="" />}
              </div>
              <span className="text-xs text-zinc-300">Frame {idx + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MotionStudio() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const { hasFeature, isAdmin } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("Export");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Project state
  const [title, setTitle] = useState("Untitled Project");
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(10000);
  const [zoom, setZoom] = useState(100);
  
  // Frame state
  const [frames, setFrames] = useState<Frame[]>([
    { id: "frame_1", imageData: "", vectorPaths: [], imageLayers: [], drawingLayers: [{ id: "dl_1", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }], duration: 1000 }
  ]);
  
  // Image Layer state
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [isResizingLayer, setIsResizingLayer] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; layerX: number; layerY: number } | null>(null);
  const imageLayerInputRef = useRef<HTMLInputElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  
  // Track state
  const [tracks] = useState<Track[]>([
    { id: "track_video", name: "Video", type: "video", visible: true, locked: false },
    { id: "track_effects", name: "Effects", type: "effects", visible: true, locked: false },
    { id: "track_audio", name: "Audio", type: "audio", visible: true, locked: false },
  ]);
  
  // Panel visibility
  const [showAssets, setShowAssets] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  
  // Drawing state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("raster");
  const [rasterTool, setRasterTool] = useState<RasterTool>("pen");
  const [vectorTool, setVectorTool] = useState<VectorTool>("pencil");
  const [brushColor, setBrushColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [brushSize, setBrushSize] = useState(4);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  
  // Vector state
  const [vectorPaths, setVectorPaths] = useState<VectorPath[]>([]);
  const [currentPath, setCurrentPath] = useState<VectorPath | null>(null);
  const [isPenCreating, setIsPenCreating] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  
  // Selection state
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectionPath, setSelectionPath] = useState<{ x: number; y: number }[]>([]);
  const [selectionImageData, setSelectionImageData] = useState<ImageData | null>(null);
  const [clipboardImageData, setClipboardImageData] = useState<ImageData | null>(null);
  const [clipboardRect, setClipboardRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [selectionMoveStart, setSelectionMoveStart] = useState<{ x: number; y: number } | null>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const marchingAntsRef = useRef<number>(0);
  const marchingAntsAnimRef = useRef<number | null>(null);

  // Shape drawing state
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<{ tool: string; start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // Drawing Layers state
  const [activeDrawingLayerId, setActiveDrawingLayerId] = useState<string>("dl_1");
  const activeDrawingLayerRef = useRef<string>("dl_1");
  activeDrawingLayerRef.current = activeDrawingLayerId;

  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Comic Preview Mode
  const [showComicPreview, setShowComicPreview] = useState(false);
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const previewIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Apply to Panel
  const [showApplyPanel, setShowApplyPanel] = useState(false);
  const { data: comicProjects } = useProjects();
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const { data: selectedComic } = useProject(selectedComicId || '');
  
  // Enhanced Motion Studio Features
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(30);
  const [onionSkinFrames, setOnionSkinFrames] = useState(2);
  
  // Effects & Blend
  const [frameOpacity, setFrameOpacity] = useState(100);
  const [blendMode, setBlendMode] = useState("normal");
  const [selectedEasing, setSelectedEasing] = useState("ease-in-out");
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  
  // FX Panel
  const [showFXPanel, setShowFXPanel] = useState(false);
  
  // Asset Browser
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  
  // FX Studio Browser (pressplays.site sync)
  const [showFxBrowser, setShowFxBrowser] = useState(false);
  const [fxEffects, setFxEffects] = useState<FxEffect[]>([]);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSearchQuery, setFxSearchQuery] = useState("");
  const [importingFxId, setImportingFxId] = useState<string | null>(null);
  const { addAsset } = useAssetLibrary();
  
  // Video/GIF Export Dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"gif" | "webm">("gif");
  const [exportFps, setExportFps] = useState(12);
  const [exportQuality, setExportQuality] = useState(80);
  const [exportResolution, setExportResolution] = useState<"1920x1080" | "1280x720" | "960x540" | "640x360">("1280x720");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState("");

  // Timeline zoom and scrubbing
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Keyframes (per-frame animation properties)
  const [keyframes, setKeyframes] = useState<Record<string, { x: number; y: number; scale: number; rotation: number; opacity: number }>>({});

  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Map<string, { source: AudioBufferSourceNode; gainNode: GainNode; buffer: AudioBuffer }>>(new Map());
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Global mouse/keyboard handlers for drag operations
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingScrubber(false);
      setIsDraggingLayer(false);
      setDragStart(null);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDraggingScrubber(false);
        setIsDraggingLayer(false);
        setIsResizingLayer(null);
        setDragStart(null);
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize project
  useEffect(() => {
    if (!projectId && !createProject.isPending) {
      createProject.mutateAsync({
        title: "Untitled Project",
        type: "motion",
        status: "draft",
        data: { frames: [], tracks: [] },
      }).then((newProject) => {
        navigate(`/creator/motion?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
      });
    }
  }, [projectId]);

  // Track whether we imported from comic panel so project load doesn't overwrite
  const importedFromPanelRef = useRef(false);

  // Load panel data from comic builder (when launched via "Edit in Motion Studio")
  useEffect(() => {
    const panelParam = searchParams.get('panel');
    const panelEditStr = sessionStorage.getItem('panel_edit_data');
    if (panelParam && panelEditStr) {
      try {
        const panelData = JSON.parse(panelEditStr);
        if (panelData.projectId) {
          setSelectedComicId(panelData.projectId);
          setSelectedPanelId(panelData.panelId);
        }
        if (panelData.contents && panelData.contents.length > 0) {
          const imageLayers: ImageLayer[] = [];
          panelData.contents.forEach((content: any, idx: number) => {
            const src = content.data?.url || content.data?.drawingData || content.data?.imageUrl || content.data?.src || null;
            if (src && (content.type === "image" || content.type === "gif" || content.type === "ai_image" || content.type === "drawing" || content.type === "sticker")) {
              imageLayers.push({
                id: `imported_${Date.now()}_${idx}`,
                src,
                x: content.transform?.x || 0,
                y: content.transform?.y || 0,
                width: content.transform?.width || 400,
                height: content.transform?.height || 400,
                rotation: content.transform?.rotation || 0,
                opacity: 100,
                locked: false,
                visible: true,
                name: content.data?.name || `Layer ${idx + 1}`,
              });
            }
          });
          if (imageLayers.length > 0) {
            importedFromPanelRef.current = true;
            setFrames(prev => {
              const updated = [...prev];
              updated[0] = { ...updated[0], imageLayers };
              return updated;
            });
            toast.success(`Loaded ${imageLayers.length} layer(s) from comic panel`);
          }
        }
        sessionStorage.removeItem('panel_edit_data');
      } catch (e) {
        console.error('Failed to load panel data:', e);
      }
    }
  }, []);

  // Load project data (skip if we imported from a comic panel)
  useEffect(() => {
    if (project && !importedFromPanelRef.current) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.frames?.length > 0) {
        setFrames(data.frames);
      }
      if (data?.audioClips?.length > 0) {
        setAudioClips(data.audioClips);
      }
    } else if (project && importedFromPanelRef.current) {
      setTitle(project.title);
    }
  }, [project]);

  // Auto-save system for Motion Studio
  const msAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msEditCountRef = useRef(0);
  const msInitialLoadRef = useRef(false);
  const msPendingSaveRef = useRef(false);
  const msLatestDataRef = useRef({ title, frames, tracks, projectId, audioClips });
  msLatestDataRef.current = { title, frames, tracks, projectId, audioClips };

  useEffect(() => {
    if (project && !msInitialLoadRef.current) {
      msInitialLoadRef.current = true;
      msEditCountRef.current = 0;
    }
  }, [project]);

  useEffect(() => {
    if (!projectId || !msInitialLoadRef.current) return;
    msEditCountRef.current += 1;
    if (msEditCountRef.current <= 1) return;
    msPendingSaveRef.current = true;
    if (msAutoSaveTimerRef.current) clearTimeout(msAutoSaveTimerRef.current);
    msAutoSaveTimerRef.current = setTimeout(async () => {
      msPendingSaveRef.current = false;
      await saveProjectWithOfflineFallback(projectId, { title, data: { frames, tracks, audioClips } }, 'motion');
    }, 3000);
    return () => {
      if (msAutoSaveTimerRef.current) clearTimeout(msAutoSaveTimerRef.current);
    };
  }, [frames, title, projectId, audioClips]);

  useEffect(() => {
    return () => {
      if (msPendingSaveRef.current) {
        const { projectId: pid, title: t, frames: f, tracks: tk, audioClips: ac } = msLatestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { frames: f, tracks: tk, audioClips: ac } })], { type: "application/json" })
          );
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (msPendingSaveRef.current) {
        const { projectId: pid, title: t, frames: f, tracks: tk, audioClips: ac } = msLatestDataRef.current;
        if (pid) {
          navigator.sendBeacon(
            `/api/projects/${pid}/autosave`,
            new Blob([JSON.stringify({ title: t, data: { frames: f, tracks: tk, audioClips: ac } })], { type: "application/json" })
          );
        }
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = 1920;
    canvas.height = 1080;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = context;
    
    saveToHistory();
  }, []);

  // Load frame image and effects when switching frames
  // Image layers are rendered as HTML overlays, NOT on the raster canvas,
  // to keep canvas data clean for compositing during save/export/apply.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = ctxRef.current;
    if (!canvas || !context) return;
    
    const currentFrame = frames[currentFrameIndex];
    
    const dlayers = currentFrame?.drawingLayers;
    if (dlayers && dlayers.length > 0) {
      const activeLayer = dlayers.find(l => l.id === activeDrawingLayerRef.current) || dlayers[0];
      if (activeLayer.id !== activeDrawingLayerRef.current) {
        setActiveDrawingLayerId(activeLayer.id);
      }
      if (activeLayer.imageData && activeLayer.imageData.startsWith('data:')) {
        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0);
        };
        img.src = activeLayer.imageData;
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    } else if (currentFrame?.imageData) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      img.src = currentFrame.imageData;
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Load vector paths for this frame
    setVectorPaths(currentFrame?.vectorPaths || []);
    
    // Restore frame effects state
    if (currentFrame) {
      setActiveEffects(currentFrame.effects || []);
      setFrameOpacity(currentFrame.opacity ?? 100);
      setBlendMode(currentFrame.blendMode || 'normal');
      setSelectedEasing(currentFrame.easing || 'linear');
      if (currentFrame.keyframe) {
        setKeyframes(prev => ({ ...prev, [currentFrame.id]: currentFrame.keyframe! }));
      }
    }
  }, [currentFrameIndex, frames]);

  // Auto-save effects metadata when changed (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentFrame = frames[currentFrameIndex];
      if (!currentFrame) return;
      
      // Only update if metadata differs from stored
      const needsUpdate = 
        JSON.stringify(currentFrame.effects) !== JSON.stringify(activeEffects) ||
        currentFrame.opacity !== frameOpacity ||
        currentFrame.blendMode !== blendMode ||
        currentFrame.easing !== selectedEasing;
        
      if (needsUpdate) {
        setFrames(prev => prev.map((f, i) => 
          i === currentFrameIndex ? {
            ...f,
            effects: activeEffects,
            opacity: frameOpacity,
            blendMode,
            easing: selectedEasing
          } : f
        ));
      }
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timeoutId);
  }, [activeEffects, frameOpacity, blendMode, selectedEasing, currentFrameIndex]);

  // History management
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL("image/png");
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), dataUrl];
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const prevIndex = historyIndex - 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[prevIndex];
    setHistoryIndex(prevIndex);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const nextIndex = historyIndex + 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[nextIndex];
    setHistoryIndex(nextIndex);
  }, [historyIndex, history]);

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setVectorPaths([]);
    saveToHistory();
    toast.success("Canvas cleared");
  }, [saveToHistory]);

  // Marching ants animation for selection
  const drawMarchingAnts = useCallback(() => {
    const selCanvas = selectionCanvasRef.current;
    if (!selCanvas) return;
    const sCtx = selCanvas.getContext('2d');
    if (!sCtx) return;
    sCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);

    const offset = marchingAntsRef.current;
    marchingAntsRef.current = (offset + 1) % 16;

    sCtx.setLineDash([6, 4]);
    sCtx.lineDashOffset = -offset;
    sCtx.strokeStyle = '#000';
    sCtx.lineWidth = 1.5;

    if (selectionRect) {
      sCtx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      sCtx.strokeStyle = '#fff';
      sCtx.lineDashOffset = -(offset + 5);
      sCtx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    }

    if (selectionPath.length > 2) {
      sCtx.beginPath();
      sCtx.moveTo(selectionPath[0].x, selectionPath[0].y);
      for (let i = 1; i < selectionPath.length; i++) {
        sCtx.lineTo(selectionPath[i].x, selectionPath[i].y);
      }
      sCtx.closePath();
      sCtx.strokeStyle = '#000';
      sCtx.lineDashOffset = -offset;
      sCtx.stroke();
      sCtx.strokeStyle = '#fff';
      sCtx.lineDashOffset = -(offset + 5);
      sCtx.stroke();
    }

    marchingAntsAnimRef.current = requestAnimationFrame(drawMarchingAnts);
  }, [selectionRect, selectionPath]);

  useEffect(() => {
    if (selectionRect || selectionPath.length > 2) {
      marchingAntsAnimRef.current = requestAnimationFrame(drawMarchingAnts);
    }
    return () => {
      if (marchingAntsAnimRef.current) cancelAnimationFrame(marchingAntsAnimRef.current);
    };
  }, [selectionRect, selectionPath, drawMarchingAnts]);

  // Flood fill algorithm
  const floodFill = useCallback((startX: number, startY: number, fillColorHex: string) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    const r = parseInt(fillColorHex.slice(1, 3), 16);
    const g = parseInt(fillColorHex.slice(3, 5), 16);
    const b = parseInt(fillColorHex.slice(5, 7), 16);

    const idx = (Math.floor(startY) * w + Math.floor(startX)) * 4;
    const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2], targetA = data[idx + 3];

    if (r === targetR && g === targetG && b === targetB && targetA === 255) return;

    const tolerance = 32;
    const matchesTarget = (i: number) => {
      return Math.abs(data[i] - targetR) <= tolerance &&
             Math.abs(data[i + 1] - targetG) <= tolerance &&
             Math.abs(data[i + 2] - targetB) <= tolerance &&
             Math.abs(data[i + 3] - targetA) <= tolerance;
    };

    const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Uint8Array(w * h);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const pi = cy * w + cx;
      if (visited[pi]) continue;
      const ci = pi * 4;
      if (!matchesTarget(ci)) continue;
      visited[pi] = 1;
      data[ci] = r;
      data[ci + 1] = g;
      data[ci + 2] = b;
      data[ci + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    ctx.putImageData(imgData, 0, 0);
    saveToHistory();
  }, [saveToHistory]);

  // Eyedropper
  const pickColor = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
    setBrushColor(hex);
    toast.success(`Color picked: ${hex}`);
  }, []);

  // Draw shape on raster canvas
  const drawShapeOnCanvas = useCallback((tool: string, start: { x: number; y: number }, end: { x: number; y: number }, preview = false) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    if (preview) {
      const selCanvas = selectionCanvasRef.current;
      if (!selCanvas) return;
      const sCtx = selCanvas.getContext('2d');
      if (!sCtx) return;
      sCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);
      sCtx.strokeStyle = brushColor;
      sCtx.fillStyle = fillColor === 'transparent' ? 'transparent' : fillColor;
      sCtx.lineWidth = brushSize;
      sCtx.lineCap = 'round';
      sCtx.lineJoin = 'round';
      drawShapePath(sCtx, tool, start, end, fillColor !== 'transparent');
      return;
    }

    ctx.strokeStyle = brushColor;
    ctx.fillStyle = fillColor === 'transparent' ? 'transparent' : fillColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawShapePath(ctx, tool, start, end, fillColor !== 'transparent');
    saveToHistory();
  }, [brushColor, fillColor, brushSize, saveToHistory]);

  const drawShapePath = (ctx: CanvasRenderingContext2D, tool: string, start: { x: number; y: number }, end: { x: number; y: number }, doFill: boolean) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;

    ctx.beginPath();
    if (tool === 'shape-rect') {
      ctx.rect(x, y, w, h);
    } else if (tool === 'shape-ellipse') {
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (tool === 'shape-line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else if (tool === 'shape-arrow') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = 20;
      ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    } else if (tool === 'shape-polygon') {
      const sides = 6;
      const radius = Math.sqrt(w * w + h * h) / 2;
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const px = cx + radius * Math.cos(a);
        const py = cy + radius * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (tool === 'shape-star') {
      const spikes = 5;
      const outerRadius = Math.sqrt(w * w + h * h) / 2;
      const innerRadius = outerRadius * 0.4;
      for (let i = 0; i < spikes * 2; i++) {
        const a = (Math.PI * i) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    if (doFill && tool !== 'shape-line' && tool !== 'shape-arrow') ctx.fill();
    ctx.stroke();
  };

  // Selection operations
  const copySelection = useCallback(() => {
    if (!selectionRect) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y, w, h } = selectionRect;
    const data = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.abs(w), Math.abs(h));
    setClipboardImageData(data);
    setClipboardRect({ x, y, w, h });
    toast.success("Selection copied");
  }, [selectionRect]);

  const cutSelection = useCallback(() => {
    if (!selectionRect) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y, w, h } = selectionRect;
    const data = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.abs(w), Math.abs(h));
    setClipboardImageData(data);
    setClipboardRect({ x, y, w, h });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
    setSelectionRect(null);
    saveToHistory();
    toast.success("Selection cut");
  }, [selectionRect, saveToHistory]);

  const pasteSelection = useCallback(() => {
    if (!clipboardImageData || !clipboardRect) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.putImageData(clipboardImageData, clipboardRect.x, clipboardRect.y);
    setSelectionRect({ ...clipboardRect });
    saveToHistory();
    toast.success("Pasted");
  }, [clipboardImageData, clipboardRect, saveToHistory]);

  const deleteSelection = useCallback(() => {
    if (!selectionRect) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    setSelectionRect(null);
    saveToHistory();
    toast.success("Selection deleted");
  }, [selectionRect, saveToHistory]);

  const clearSelection = useCallback(() => {
    setSelectionRect(null);
    setSelectionPath([]);
    const selCanvas = selectionCanvasRef.current;
    if (selCanvas) {
      const sCtx = selCanvas.getContext('2d');
      if (sCtx) sCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);
    }
  }, []);

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    const frameId = frames[currentFrameIndex]?.id;
    const currentKeyframe = frameId ? keyframes[frameId] : undefined;
    const activeId = activeDrawingLayerRef.current;
    
    setFrames(prev => prev.map((f, i) => {
      if (i !== currentFrameIndex) return f;
      const existingLayers = f.drawingLayers && f.drawingLayers.length > 0
        ? f.drawingLayers
        : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: f.imageData }];
      const updatedLayers = existingLayers.map(l =>
        l.id === activeId ? { ...l, imageData } : l
      );
      return {
        ...f, 
        imageData, 
        vectorPaths,
        drawingLayers: updatedLayers,
        effects: activeEffects,
        opacity: frameOpacity,
        blendMode,
        easing: selectedEasing,
        keyframe: currentKeyframe
      };
    }));
  }, [currentFrameIndex, vectorPaths, activeEffects, frameOpacity, blendMode, selectedEasing, keyframes, frames]);

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    
    try {
      const canvas = canvasRef.current;
      const imageData = canvas ? canvas.toDataURL('image/png') : frames[currentFrameIndex]?.imageData || "";
      const frameId = frames[currentFrameIndex]?.id;
      const currentKeyframe = frameId ? keyframes[frameId] : undefined;
      
      const updatedFrames = frames.map((f, i) => 
        i === currentFrameIndex ? { 
          ...f, 
          imageData, 
          vectorPaths,
          effects: activeEffects,
          opacity: frameOpacity,
          blendMode,
          easing: selectedEasing,
          keyframe: currentKeyframe
        } : f
      );
      
      setFrames(updatedFrames);
      
      await updateProject.mutateAsync({
        id: projectId,
        data: { title, data: { frames: updatedFrames, tracks, audioClips } },
      });
      toast.success("Project saved");
    } catch {
      toast.error("Failed to save");
    }
    setIsSaving(false);
  };

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error("Please select an audio file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newClip: AudioClip = {
        id: `audio_${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        src: reader.result as string,
        startFrame: currentFrameIndex,
        durationFrames: Math.max(frames.length - currentFrameIndex, 1),
        volume: 1,
        muted: false,
      };
      setAudioClips(prev => [...prev, newClip]);
      toast.success(`Added audio: ${newClip.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [currentFrameIndex, frames.length]);

  const loadFxEffects = useCallback(async () => {
    setFxLoading(true);
    try {
      const effects = await fxStudioApi.listEffects();
      setFxEffects(Array.isArray(effects) ? effects : []);
    } catch (err: any) {
      toast.error("Failed to load FX Studio effects");
    } finally {
      setFxLoading(false);
    }
  }, []);

  const importFxToLibrary = useCallback(async (effect: FxEffect) => {
    setImportingFxId(effect.id);
    try {
      const fullEffect = await fxStudioApi.getEffect(effect.id);
      
      const saved = await addAsset({
        name: effect.name,
        type: "effect",
        url: effect.preview_data_url || "",
        folderId: "effects",
        tags: effect.type ? effect.type.split(",").map((t: string) => t.trim()) : [],
      });

      if (saved) {
        toast.success(`"${effect.name}" saved to your Asset Library`);
      } else {
        toast.error("Failed to save to Asset Library");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import effect");
    } finally {
      setImportingFxId(null);
    }
  }, [addAsset]);

  const importFxAsLayer = useCallback(async (effect: FxEffect) => {
    if (!effect.preview_data_url) {
      toast.error("No preview image available for this effect");
      return;
    }
    const newLayer: ImageLayer = {
      id: `fxlayer_${Date.now()}`,
      src: effect.preview_data_url,
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: effect.name,
    };
    setFrames(prev => prev.map((f, i) =>
      i === currentFrameIndex
        ? { ...f, imageLayers: [...(f.imageLayers || []), newLayer] }
        : f
    ));
    toast.success(`"${effect.name}" added as layer to current frame`);
  }, [currentFrameIndex]);

  const addFrame = () => {
    saveCurrentFrame();
    const newLayerId = `dl_${Date.now()}`;
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: "",
      vectorPaths: [],
      imageLayers: [],
      drawingLayers: [{ id: newLayerId, name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: "" }],
      duration: 1000
    };
    setFrames(prev => [...prev, newFrame]);
    setCurrentFrameIndex(frames.length);
    setActiveDrawingLayerId(newLayerId);
    toast.success("Frame added");
  };

  const deleteFrame = () => {
    if (frames.length <= 1) {
      toast.error("Need at least one frame");
      return;
    }
    setFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
    setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1));
  };

  const duplicateFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    saveCanvasToActiveLayer();
    const currentFrame = frames[currentFrameIndex];
    const dlayers = currentFrame?.drawingLayers?.map(l => ({
      ...l,
      id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })) || [{ id: `dl_${Date.now()}`, name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: canvas.toDataURL('image/png') }];
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: canvas.toDataURL('image/png'),
      vectorPaths: [...vectorPaths],
      imageLayers: currentFrame?.imageLayers?.map(l => ({ ...l, id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })) || [],
      drawingLayers: dlayers,
      duration: 1000
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setActiveDrawingLayerId(dlayers[0].id);
    toast.success("Frame duplicated");
  };
  
  // Image Layer Functions
  const addImageLayer = (imageSrc: string, name: string = "Image Layer") => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const maxWidth = 400;
      const width = Math.min(img.width, maxWidth);
      const height = width / aspectRatio;
      
      const newLayer: ImageLayer = {
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        src: imageSrc,
        x: (1920 - width) / 2,
        y: (1080 - height) / 2,
        width,
        height,
        rotation: 0,
        opacity: 100,
        locked: false,
        visible: true,
        name
      };
      
      setFrames(prev => prev.map((f, i) => 
        i === currentFrameIndex 
          ? { ...f, imageLayers: [...(f.imageLayers || []), newLayer] }
          : f
      ));
      setSelectedLayerId(newLayer.id);
      toast.success("Image layer added");
    };
    img.src = imageSrc;
  };
  
  const handleImageLayerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      addImageLayer(result, file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };
  
  const updateImageLayer = (layerId: string, updates: Partial<ImageLayer>) => {
    setFrames(prev => prev.map((f, i) => 
      i === currentFrameIndex 
        ? { 
            ...f, 
            imageLayers: (f.imageLayers || []).map(l => 
              l.id === layerId ? { ...l, ...updates } : l
            )
          }
        : f
    ));
  };
  
  const deleteImageLayer = (layerId: string) => {
    setFrames(prev => prev.map((f, i) => 
      i === currentFrameIndex 
        ? { ...f, imageLayers: (f.imageLayers || []).filter(l => l.id !== layerId) }
        : f
    ));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    toast.success("Layer deleted");
  };
  
  const currentImageLayers = frames[currentFrameIndex]?.imageLayers || [];
  const selectedLayer = currentImageLayers.find(l => l.id === selectedLayerId);

  const getDrawingLayers = useCallback((): DrawingLayer[] => {
    const frame = frames[currentFrameIndex];
    if (!frame) return [];
    if (frame.drawingLayers && frame.drawingLayers.length > 0) return frame.drawingLayers;
    return [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: frame.imageData }];
  }, [frames, currentFrameIndex]);

  const currentDrawingLayers = getDrawingLayers();
  const activeDrawingLayer = currentDrawingLayers.find(l => l.id === activeDrawingLayerId) || currentDrawingLayers[0];

  const saveCanvasToActiveLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layerData = canvas.toDataURL('image/png');
    const activeId = activeDrawingLayerRef.current;
    setFrames(prev => prev.map((f, i) => {
      if (i !== currentFrameIndex) return f;
      const layers = f.drawingLayers && f.drawingLayers.length > 0
        ? f.drawingLayers
        : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: f.imageData }];
      return {
        ...f,
        drawingLayers: layers.map(l => l.id === activeId ? { ...l, imageData: layerData } : l),
        imageData: layerData
      };
    }));
  }, [currentFrameIndex]);

  const loadDrawingLayerToCanvas = useCallback((layerImageData: string) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (layerImageData && layerImageData.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = layerImageData;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const switchDrawingLayer = useCallback((newLayerId: string) => {
    if (newLayerId === activeDrawingLayerRef.current) return;
    saveCanvasToActiveLayer();
    const frame = frames[currentFrameIndex];
    const layers = frame?.drawingLayers && frame.drawingLayers.length > 0
      ? frame.drawingLayers
      : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: frame?.imageData || "" }];
    const newLayer = layers.find(l => l.id === newLayerId);
    if (newLayer) {
      setActiveDrawingLayerId(newLayerId);
      loadDrawingLayerToCanvas(newLayer.imageData);
    }
  }, [frames, currentFrameIndex, saveCanvasToActiveLayer, loadDrawingLayerToCanvas]);

  const addDrawingLayer = useCallback(() => {
    saveCanvasToActiveLayer();
    const frame = frames[currentFrameIndex];
    const layers = frame?.drawingLayers && frame.drawingLayers.length > 0
      ? frame.drawingLayers
      : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: frame?.imageData || "" }];
    const newLayer: DrawingLayer = {
      id: `dl_${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 100,
      locked: false,
      blendMode: "normal",
      imageData: ""
    };
    setFrames(prev => prev.map((f, i) => {
      if (i !== currentFrameIndex) return f;
      const existingLayers = f.drawingLayers && f.drawingLayers.length > 0
        ? f.drawingLayers
        : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: f.imageData }];
      return { ...f, drawingLayers: [...existingLayers, newLayer] };
    }));
    setActiveDrawingLayerId(newLayer.id);
    loadDrawingLayerToCanvas("");
    toast.success("Drawing layer added");
  }, [currentFrameIndex, frames, saveCanvasToActiveLayer, loadDrawingLayerToCanvas]);

  const deleteDrawingLayer = useCallback((layerId: string) => {
    const layers = getDrawingLayers();
    if (layers.length <= 1) {
      toast.error("Need at least one drawing layer");
      return;
    }
    const newLayers = layers.filter(l => l.id !== layerId);
    if (activeDrawingLayerRef.current === layerId) {
      setActiveDrawingLayerId(newLayers[0].id);
      loadDrawingLayerToCanvas(newLayers[0].imageData);
    }
    setFrames(prev => prev.map((f, i) =>
      i === currentFrameIndex ? { ...f, drawingLayers: newLayers } : f
    ));
    toast.success("Drawing layer deleted");
  }, [currentFrameIndex, getDrawingLayers, loadDrawingLayerToCanvas]);

  const duplicateDrawingLayer = useCallback((layerId: string) => {
    saveCanvasToActiveLayer();
    const layers = getDrawingLayers();
    const source = layers.find(l => l.id === layerId);
    if (!source) return;
    const newLayer: DrawingLayer = {
      ...source,
      id: `dl_${Date.now()}`,
      name: `${source.name} copy`
    };
    const idx = layers.findIndex(l => l.id === layerId);
    const newLayers = [...layers];
    newLayers.splice(idx + 1, 0, newLayer);
    setFrames(prev => prev.map((f, i) =>
      i === currentFrameIndex ? { ...f, drawingLayers: newLayers } : f
    ));
    setActiveDrawingLayerId(newLayer.id);
    loadDrawingLayerToCanvas(newLayer.imageData);
    toast.success("Drawing layer duplicated");
  }, [currentFrameIndex, saveCanvasToActiveLayer, getDrawingLayers, loadDrawingLayerToCanvas]);

  const mergeDownDrawingLayer = useCallback((layerId: string) => {
    const layers = getDrawingLayers();
    const idx = layers.findIndex(l => l.id === layerId);
    if (idx <= 0) {
      toast.error("No layer below to merge into");
      return;
    }
    saveCanvasToActiveLayer();
    const topLayer = layers[idx];
    const bottomLayer = layers[idx - 1];

    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const loadImg = (src: string): Promise<HTMLImageElement | null> => {
      if (!src || !src.startsWith('data:')) return Promise.resolve(null);
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    Promise.all([loadImg(bottomLayer.imageData), loadImg(topLayer.imageData)]).then(([bottomImg, topImg]) => {
      if (bottomImg) {
        offCtx.globalAlpha = bottomLayer.opacity / 100;
        offCtx.globalCompositeOperation = mapBlendMode(bottomLayer.blendMode);
        offCtx.drawImage(bottomImg, 0, 0);
      }
      if (topImg) {
        offCtx.globalAlpha = topLayer.opacity / 100;
        offCtx.globalCompositeOperation = mapBlendMode(topLayer.blendMode);
        offCtx.drawImage(topImg, 0, 0);
      }
      offCtx.globalAlpha = 1;
      offCtx.globalCompositeOperation = 'source-over';

      const mergedData = offscreen.toDataURL('image/png');
      const newLayers = layers.filter(l => l.id !== layerId);
      const bottomIdx = newLayers.findIndex(l => l.id === bottomLayer.id);
      newLayers[bottomIdx] = { ...bottomLayer, imageData: mergedData };

      setFrames(prev => prev.map((f, i) =>
        i === currentFrameIndex ? { ...f, drawingLayers: newLayers } : f
      ));
      if (activeDrawingLayerRef.current === layerId) {
        setActiveDrawingLayerId(bottomLayer.id);
        loadDrawingLayerToCanvas(mergedData);
      }
      toast.success("Layers merged");
    });
  }, [currentFrameIndex, saveCanvasToActiveLayer, getDrawingLayers, loadDrawingLayerToCanvas]);

  const reorderDrawingLayer = useCallback((layerId: string, direction: "up" | "down") => {
    saveCanvasToActiveLayer();
    const layers = getDrawingLayers();
    const idx = layers.findIndex(l => l.id === layerId);
    if (idx < 0) return;
    if (direction === "up" && idx >= layers.length - 1) return;
    if (direction === "down" && idx <= 0) return;
    const newLayers = [...layers];
    const swapIdx = direction === "up" ? idx + 1 : idx - 1;
    [newLayers[idx], newLayers[swapIdx]] = [newLayers[swapIdx], newLayers[idx]];
    setFrames(prev => prev.map((f, i) =>
      i === currentFrameIndex ? { ...f, drawingLayers: newLayers } : f
    ));
  }, [currentFrameIndex, saveCanvasToActiveLayer, getDrawingLayers]);

  const updateDrawingLayer = useCallback((layerId: string, updates: Partial<DrawingLayer>) => {
    setFrames(prev => prev.map((f, i) => {
      if (i !== currentFrameIndex) return f;
      const layers = f.drawingLayers && f.drawingLayers.length > 0
        ? f.drawingLayers
        : [{ id: "dl_default", name: "Layer 1", visible: true, opacity: 100, locked: false, blendMode: "normal", imageData: f.imageData }];
      return {
        ...f,
        drawingLayers: layers.map(l => l.id === layerId ? { ...l, ...updates } : l)
      };
    }));
  }, [currentFrameIndex]);

  const handleExport = async () => {
    if (!hasFeature("export") && !isAdmin) {
      setUpgradeFeatureName("Export");
      setShowUpgradeModal(true);
      return;
    }
    try {
      const trackRes = await fetch("/api/usage/track-export", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!trackRes.ok) {
        const err = await trackRes.json();
        if (err.code === "EXPORT_LIMIT_REACHED") {
          toast.error(err.message);
          setUpgradeFeatureName("More Exports");
          setShowUpgradeModal(true);
          return;
        }
      }
    } catch {}
    toast.info("Compositing frames with effects...");
    
    const canvas = canvasRef.current;
    const rasterImageData = canvas ? canvas.toDataURL('image/png') : frames[currentFrameIndex]?.imageData || "";
    const frameId = frames[currentFrameIndex]?.id;
    const currentKeyframe = frameId ? keyframes[frameId] : undefined;
    
    const updatedFrames = frames.map((f, i) => 
      i === currentFrameIndex ? { 
        ...f, 
        imageData: rasterImageData, 
        vectorPaths,
        effects: activeEffects,
        opacity: frameOpacity,
        blendMode,
        easing: selectedEasing,
        keyframe: currentKeyframe
      } : f
    );
    
    // Composite all frames with their effects and image layers applied
    const compositedFrames = await Promise.all(
      updatedFrames.map(async (frame) => {
        const compositedImage = await compositeFrameWithEffects(frame);
        return { ...frame, compositedImageData: compositedImage };
      })
    );
    
    const exportData = {
      version: "1.0",
      format: "PSDCF",
      project: { title, createdAt: new Date().toISOString() },
      frames: compositedFrames,
      tracks,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.psdcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported with effects applied!");
  };

  const handleVideoExport = async () => {
    if (!hasFeature("export") && !isAdmin) {
      setUpgradeFeatureName("Video/GIF Export");
      setShowUpgradeModal(true);
      return;
    }
    if (frames.length === 0) {
      toast.error("No frames to export");
      return;
    }
    try {
      const trackRes = await fetch("/api/usage/track-export", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!trackRes.ok) {
        const err = await trackRes.json();
        if (err.code === "EXPORT_LIMIT_REACHED") {
          toast.error(err.message);
          setUpgradeFeatureName("More Exports");
          setShowUpgradeModal(true);
          return;
        }
      }
    } catch {}

    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText("Preparing frames...");

    try {
      const canvas = canvasRef.current;
      const rasterImageData = canvas ? canvas.toDataURL('image/png') : frames[currentFrameIndex]?.imageData || "";

      const updatedFrames = frames.map((f, i) =>
        i === currentFrameIndex ? { ...f, imageData: rasterImageData, vectorPaths } : f
      );

      const [resW, resH] = exportResolution.split('x').map(Number);

      setExportStatusText("Compositing frames...");
      const compositedImages: string[] = [];
      for (let i = 0; i < updatedFrames.length; i++) {
        setExportProgress(Math.round((i / updatedFrames.length) * 30));
        const composited = await compositeFrameWithEffects(updatedFrames[i]);
        compositedImages.push(composited || "");
      }

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = resW;
      renderCanvas.height = resH;
      const renderCtx = renderCanvas.getContext('2d')!;

      if (exportFormat === "webm") {
        setExportStatusText("Encoding WebM video...");
        const stream = renderCanvas.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];

        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }

        const videoBitsPerSecond = Math.round((exportQuality / 100) * 10_000_000);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        const recorderDone = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
        recorder.start();

        const frameDurationMs = 1000 / exportFps;

        for (let i = 0; i < compositedImages.length; i++) {
          setExportProgress(30 + Math.round((i / compositedImages.length) * 60));
          setExportStatusText(`Rendering frame ${i + 1}/${compositedImages.length}...`);

          await new Promise<void>((resolve) => {
            if (!compositedImages[i]) {
              renderCtx.fillStyle = '#ffffff';
              renderCtx.fillRect(0, 0, resW, resH);
              (videoTrack as any).requestFrame?.();
              setTimeout(resolve, frameDurationMs);
              return;
            }
            const img = new Image();
            img.onload = () => {
              renderCtx.clearRect(0, 0, resW, resH);
              renderCtx.fillStyle = '#ffffff';
              renderCtx.fillRect(0, 0, resW, resH);
              renderCtx.drawImage(img, 0, 0, resW, resH);
              (videoTrack as any).requestFrame?.();
              setTimeout(resolve, frameDurationMs);
            };
            img.onerror = () => {
              renderCtx.fillStyle = '#ffffff';
              renderCtx.fillRect(0, 0, resW, resH);
              (videoTrack as any).requestFrame?.();
              setTimeout(resolve, frameDurationMs);
            };
            img.src = compositedImages[i];
          });
        }

        recorder.stop();
        await recorderDone;
        setExportProgress(95);
        setExportStatusText("Saving file...");

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setExportStatusText("Building GIF...");

        const loadedImages: HTMLImageElement[] = [];
        for (let i = 0; i < compositedImages.length; i++) {
          setExportProgress(30 + Math.round((i / compositedImages.length) * 20));
          await new Promise<void>((resolve) => {
            if (!compositedImages[i]) {
              const placeholder = new Image();
              placeholder.width = resW;
              placeholder.height = resH;
              loadedImages.push(placeholder);
              resolve();
              return;
            }
            const img = new Image();
            img.onload = () => { loadedImages.push(img); resolve(); };
            img.onerror = () => { loadedImages.push(img); resolve(); };
            img.src = compositedImages[i];
          });
        }

        const delayMs = Math.round(1000 / exportFps);
        const gifWidth = resW;
        const gifHeight = resH;

        setExportStatusText("Quantizing colors...");
        setExportProgress(55);

        const frameDataArrays: Uint8ClampedArray[] = [];
        for (let i = 0; i < loadedImages.length; i++) {
          renderCtx.clearRect(0, 0, gifWidth, gifHeight);
          renderCtx.fillStyle = '#ffffff';
          renderCtx.fillRect(0, 0, gifWidth, gifHeight);
          if (loadedImages[i].src) {
            renderCtx.drawImage(loadedImages[i], 0, 0, gifWidth, gifHeight);
          }
          frameDataArrays.push(renderCtx.getImageData(0, 0, gifWidth, gifHeight).data);
        }

        setExportStatusText("Encoding GIF frames (in background)...");
        setExportProgress(65);

        const gifBytes = await encodeGIFInWorker(frameDataArrays, gifWidth, gifHeight, delayMs, (p: number) => {
          setExportProgress(65 + Math.round(p * 30));
        });

        setExportProgress(95);
        setExportStatusText("Saving file...");

        const blob = new Blob([gifBytes], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.gif`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExportProgress(100);
      setExportStatusText("Done!");
      toast.success(`Exported as ${exportFormat.toUpperCase()} successfully!`);
      setTimeout(() => {
        setShowExportDialog(false);
        setIsExporting(false);
        setExportProgress(0);
        setExportStatusText("");
      }, 1000);
    } catch (err) {
      console.error("Export error:", err);
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsExporting(false);
      setExportProgress(0);
      setExportStatusText("");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const context = ctxRef.current;
        if (!canvas || !context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        context.drawImage(img, x, y, img.width * scale, img.height * scale);
        saveToHistory();
        saveCurrentFrame();
        toast.success("Image imported");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Get coordinates from pointer event
  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Raster drawing handlers
  const handleRasterPointerDown = (e: React.PointerEvent) => {
    const { x, y } = getCoordinates(e);

    if (rasterTool === "select") return;

    if (rasterTool === "eyedropper") {
      pickColor(x, y);
      return;
    }

    if (rasterTool === "fill") {
      floodFill(x, y, brushColor);
      setTimeout(() => saveCurrentFrame(), 0);
      return;
    }

    if (rasterTool === "rect-select" || rasterTool === "ellipse-select") {
      clearSelection();
      setIsDrawing(true);
      setShapeStart({ x, y });
      return;
    }

    if (rasterTool === "lasso-select") {
      clearSelection();
      setIsDrawing(true);
      setSelectionPath([{ x, y }]);
      return;
    }

    if (rasterTool.startsWith("shape-")) {
      setIsDrawing(true);
      setShapeStart({ x, y });
      return;
    }
    
    setIsDrawing(true);
    lastPointRef.current = { x, y };
    
    const ctx = ctxRef.current;
    if (ctx && rasterTool === "pen") {
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawMoveRafRef = useRef<number | null>(null);
  const pendingDrawRef = useRef<{ x: number; y: number; pressure: number } | null>(null);

  const handleRasterPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    if (rasterTool === "rect-select" || rasterTool === "ellipse-select") {
      if (shapeStart) {
        const rect = {
          x: Math.min(shapeStart.x, x),
          y: Math.min(shapeStart.y, y),
          w: Math.abs(x - shapeStart.x),
          h: Math.abs(y - shapeStart.y)
        };
        setSelectionRect(rect);
      }
      return;
    }

    if (rasterTool === "lasso-select") {
      setSelectionPath(prev => [...prev, { x, y }]);
      return;
    }

    if (rasterTool.startsWith("shape-") && shapeStart) {
      setShapePreview({ tool: rasterTool, start: shapeStart, end: { x, y } });
      drawShapeOnCanvas(rasterTool, shapeStart, { x, y }, true);
      return;
    }

    if (!lastPointRef.current || rasterTool === "select") return;

    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    pendingDrawRef.current = { x, y, pressure };

    if (drawMoveRafRef.current === null) {
      drawMoveRafRef.current = requestAnimationFrame(() => {
        drawMoveRafRef.current = null;
        const pending = pendingDrawRef.current;
        if (!pending || !lastPointRef.current) return;

        const ctx = ctxRef.current;
        if (!ctx) return;

        const currentLineWidth = rasterTool === "eraser"
          ? brushSize * 5 * pending.pressure
          : brushSize * (0.5 + pending.pressure);

        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(pending.x, pending.y);

        if (rasterTool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = brushColor;
        }

        ctx.lineWidth = Math.max(1, currentLineWidth);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";

        lastPointRef.current = { x: pending.x, y: pending.y };
      });
    }
  };

  const handleRasterPointerUp = () => {
    if (drawMoveRafRef.current !== null) {
      cancelAnimationFrame(drawMoveRafRef.current);
      drawMoveRafRef.current = null;
    }
    const pending = pendingDrawRef.current;
    if (pending && lastPointRef.current && isDrawing && !rasterTool.startsWith("shape-") && rasterTool !== "rect-select" && rasterTool !== "ellipse-select" && rasterTool !== "lasso-select" && rasterTool !== "select") {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(pending.x, pending.y);
        if (rasterTool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = brushColor;
        }
        ctx.lineWidth = Math.max(1, brushSize * (0.5 + pending.pressure));
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        lastPointRef.current = { x: pending.x, y: pending.y };
      }
    }
    pendingDrawRef.current = null;

    if (rasterTool === "rect-select" || rasterTool === "ellipse-select") {
      setIsDrawing(false);
      setShapeStart(null);
      return;
    }

    if (rasterTool === "lasso-select") {
      setIsDrawing(false);
      return;
    }

    if (rasterTool.startsWith("shape-") && shapeStart && shapePreview) {
      const selCanvas = selectionCanvasRef.current;
      if (selCanvas) {
        const sCtx = selCanvas.getContext('2d');
        if (sCtx) sCtx.clearRect(0, 0, selCanvas.width, selCanvas.height);
      }
      drawShapeOnCanvas(rasterTool, shapePreview.start, shapePreview.end, false);
      setShapeStart(null);
      setShapePreview(null);
      setIsDrawing(false);
      setTimeout(() => saveCurrentFrame(), 0);
      return;
    }

    if (isDrawing) {
      saveToHistory();
      saveCurrentFrame();
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Vector drawing handlers
  const handleVectorPointerDown = (e: React.PointerEvent) => {
    const { x, y } = getCoordinates(e);
    
    if (vectorTool === "select") return;
    
    if (vectorTool === "pen") {
      if (!isPenCreating) {
        const newPath: VectorPath = {
          id: `path_${Date.now()}`,
          type: "path",
          points: [{ x, y }],
          stroke: brushColor,
          strokeWidth: brushSize,
          fill: fillColor,
          closed: false,
        };
        setCurrentPath(newPath);
        setIsPenCreating(true);
      } else if (currentPath) {
        setCurrentPath({
          ...currentPath,
          points: [...currentPath.points, { x, y }],
        });
      }
      return;
    }
    
    if (vectorTool === "pencil") {
      const newPath: VectorPath = {
        id: `path_${Date.now()}`,
        type: "path",
        points: [{ x, y }],
        stroke: brushColor,
        strokeWidth: brushSize,
        fill: "transparent",
        closed: false,
      };
      setCurrentPath(newPath);
      setIsDrawing(true);
      return;
    }
    
    if (["line", "rectangle", "ellipse", "arrow"].includes(vectorTool)) {
      const newPath: VectorPath = {
        id: `path_${Date.now()}`,
        type: vectorTool as VectorPath["type"],
        points: [{ x, y }, { x, y }],
        stroke: brushColor,
        strokeWidth: brushSize,
        fill: fillColor,
        closed: vectorTool === "rectangle" || vectorTool === "ellipse",
      };
      setCurrentPath(newPath);
      setIsDrawing(true);
    }
  };

  const handleVectorPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentPath) return;
    
    const { x, y } = getCoordinates(e);
    
    if (vectorTool === "pencil") {
      setCurrentPath({
        ...currentPath,
        points: [...currentPath.points, { x, y }],
      });
    } else if (["line", "rectangle", "ellipse", "arrow"].includes(vectorTool)) {
      const updatedPoints = [...currentPath.points];
      updatedPoints[1] = { x, y };
      setCurrentPath({
        ...currentPath,
        points: updatedPoints,
      });
    }
  };

  const handleVectorPointerUp = () => {
    if ((vectorTool === "pencil" || ["line", "rectangle", "ellipse", "arrow"].includes(vectorTool)) && currentPath) {
      setVectorPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
      saveCurrentFrame();
    }
    setIsDrawing(false);
  };

  const finishPenPath = useCallback(() => {
    if (currentPath && isPenCreating) {
      setVectorPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
      setIsPenCreating(false);
      saveCurrentFrame();
    }
  }, [currentPath, isPenCreating, saveCurrentFrame]);

  const deleteSelectedPath = useCallback(() => {
    if (selectedPathId) {
      setVectorPaths(prev => prev.filter(p => p.id !== selectedPathId));
      setSelectedPathId(null);
      saveCurrentFrame();
    }
  }, [selectedPathId, saveCurrentFrame]);

  // Combined pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (drawingMode === "raster") {
      handleRasterPointerDown(e);
    } else {
      handleVectorPointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (drawingMode === "raster") {
      handleRasterPointerMove(e);
    } else {
      handleVectorPointerMove(e);
    }
  };

  const handlePointerUp = () => {
    if (drawingMode === "raster") {
      handleRasterPointerUp();
    } else {
      handleVectorPointerUp();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectionRect) {
        e.preventDefault();
        copySelection();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x" && selectionRect) {
        e.preventDefault();
        cutSelection();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardImageData) {
        e.preventDefault();
        pasteSelection();
      }
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectionRect && drawingMode === "raster") {
          e.preventDefault();
          deleteSelection();
        } else if (drawingMode === "vector" && selectedPathId) {
          e.preventDefault();
          deleteSelectedPath();
        }
      }
      
      if (e.key === "Enter" && drawingMode === "vector" && isPenCreating) {
        e.preventDefault();
        finishPenPath();
      }
      
      if (e.key === "Escape") {
        if (isPenCreating) {
          setCurrentPath(null);
          setIsPenCreating(false);
        }
        setSelectedPathId(null);
        clearSelection();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingMode, selectedPathId, isPenCreating, undo, redo, deleteSelectedPath, finishPenPath, selectionRect, clipboardImageData, copySelection, cutSelection, pasteSelection, deleteSelection, clearSelection]);

  // Render vector path
  const renderVectorPath = (path: VectorPath, isPreview = false) => {
    const isSelected = selectedPathId === path.id && !isPreview;
    const strokeStyle = {
      stroke: path.stroke,
      strokeWidth: path.strokeWidth,
      fill: path.fill === "transparent" ? "none" : path.fill,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      cursor: "pointer",
    };
    
    if (path.type === "line" || path.type === "arrow") {
      const [start, end] = path.points;
      if (!start || !end) return null;
      return (
        <g key={path.id} onClick={() => !isPreview && setSelectedPathId(path.id)}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} {...strokeStyle}
            className={isSelected ? "stroke-violet-400" : ""} />
          {path.type === "arrow" && (
            <polygon
              points={`${end.x},${end.y} ${end.x - 15},${end.y - 8} ${end.x - 15},${end.y + 8}`}
              fill={path.stroke}
              transform={`rotate(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI}, ${end.x}, ${end.y})`}
            />
          )}
        </g>
      );
    }
    
    if (path.type === "rectangle") {
      const [start, end] = path.points;
      if (!start || !end) return null;
      return (
        <rect key={path.id}
          x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)}
          width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)}
          {...strokeStyle} onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-violet-400" : ""} />
      );
    }
    
    if (path.type === "ellipse") {
      const [start, end] = path.points;
      if (!start || !end) return null;
      return (
        <ellipse key={path.id}
          cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2}
          rx={Math.abs(end.x - start.x) / 2} ry={Math.abs(end.y - start.y) / 2}
          {...strokeStyle} onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-violet-400" : ""} />
      );
    }
    
    if (path.type === "path") {
      const d = path.points.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        return `${acc} L ${point.x} ${point.y}`;
      }, "") + (path.closed ? " Z" : "");
      
      return (
        <path key={path.id} d={d} {...strokeStyle}
          onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-violet-400" : ""} />
      );
    }
    
    return null;
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const frames = Math.floor((ms % 1000) / (1000 / 24));
    return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const currentTool = drawingMode === "raster" ? rasterTool : vectorTool;

  // Comic Preview playback - using timeout for accurate per-frame duration
  useEffect(() => {
    if (showComicPreview && isPlaying && frames.length > 1) {
      const currentDuration = frames[previewFrameIndex]?.duration || 1000;
      
      previewIntervalRef.current = setTimeout(() => {
        setPreviewFrameIndex(prev => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (loopEnabled) {
              return 0; // Loop back to start
            } else {
              setIsPlaying(false);
              return prev; // Stay on last frame
            }
          }
          return next;
        });
      }, currentDuration);
      
      return () => {
        if (previewIntervalRef.current) {
          clearTimeout(previewIntervalRef.current);
        }
      };
    }
  }, [showComicPreview, isPlaying, frames.length, previewFrameIndex, loopEnabled]);
  
  // Also handle main timeline playback
  useEffect(() => {
    if (isPlaying && !showComicPreview && frames.length > 1) {
      const currentDuration = frames[currentFrameIndex]?.duration || 1000;
      
      const timeout = setTimeout(() => {
        saveCurrentFrame();
        setCurrentFrameIndex(prev => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (loopEnabled) {
              return 0; // Loop back to start
            } else {
              setIsPlaying(false);
              return prev; // Stay on last frame
            }
          }
          return next;
        });
      }, currentDuration);
      
      return () => clearTimeout(timeout);
    }
  }, [isPlaying, showComicPreview, currentFrameIndex, frames.length, loopEnabled]);

  useEffect(() => {
    if (!audioClips.length) return;
    
    if (isPlaying && !audioMuted) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      
      audioClips.forEach(clip => {
        if (clip.muted) return;
        if (currentFrameIndex >= clip.startFrame && currentFrameIndex < clip.startFrame + clip.durationFrames) {
          if (!audioSourcesRef.current.has(clip.id)) {
            fetch(clip.src)
              .then(r => r.arrayBuffer())
              .then(buf => ctx.decodeAudioData(buf))
              .then(audioBuffer => {
                const source = ctx.createBufferSource();
                const gainNode = ctx.createGain();
                source.buffer = audioBuffer;
                gainNode.gain.value = clip.volume * audioVolume;
                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                const framesIntoClip = currentFrameIndex - clip.startFrame;
                const msPerFrame = frames[currentFrameIndex]?.duration || 1000;
                const offsetSec = (framesIntoClip * msPerFrame) / 1000;
                
                source.start(0, Math.min(offsetSec, audioBuffer.duration));
                audioSourcesRef.current.set(clip.id, { source, gainNode, buffer: audioBuffer });
              })
              .catch(() => {});
          }
        }
      });
    } else {
      audioSourcesRef.current.forEach(({ source }) => {
        try { source.stop(); } catch {}
      });
      audioSourcesRef.current.clear();
    }
    
    return () => {
      if (!isPlaying) {
        audioSourcesRef.current.forEach(({ source }) => {
          try { source.stop(); } catch {}
        });
        audioSourcesRef.current.clear();
      }
    };
  }, [isPlaying, audioMuted, currentFrameIndex, audioClips, audioVolume]);

  // Apply drawing to comic panel
  const applyToPanel = async () => {
    if (!selectedComicId || !selectedPanelId) {
      toast.error("Please select a comic and panel");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const currentFrame = frames[currentFrameIndex];
    const rasterData = canvas.toDataURL('image/png');
    const frameForComposite = { ...currentFrame, imageData: rasterData };
    const imageData = await compositeFrameWithEffects(frameForComposite);
    
    try {
      const comicData = selectedComic?.data as any;
      if (!comicData?.spreads) {
        toast.error("Invalid comic data");
        return;
      }
      
      // Find and update the panel
      const updatedSpreads = comicData.spreads.map((spread: any) => ({
        ...spread,
        leftPage: spread.leftPage.map((panel: any) => {
          if (panel.id === selectedPanelId) {
            return {
              ...panel,
              contents: [
                ...panel.contents,
                {
                  id: `content_${Date.now()}`,
                  type: "drawing",
                  transform: { x: 0, y: 0, width: panel.width, height: panel.height, rotation: 0, scaleX: 1, scaleY: 1 },
                  data: { 
                    drawingData: imageData,
                    vectorData: vectorPaths,
                    motionFrames: frames,
                    isMotion: true
                  },
                  zIndex: panel.contents.length,
                  locked: false
                }
              ]
            };
          }
          return panel;
        }),
        rightPage: spread.rightPage.map((panel: any) => {
          if (panel.id === selectedPanelId) {
            return {
              ...panel,
              contents: [
                ...panel.contents,
                {
                  id: `content_${Date.now()}`,
                  type: "drawing",
                  transform: { x: 0, y: 0, width: panel.width, height: panel.height, rotation: 0, scaleX: 1, scaleY: 1 },
                  data: { 
                    drawingData: imageData,
                    vectorData: vectorPaths,
                    motionFrames: frames,
                    isMotion: true
                  },
                  zIndex: panel.contents.length,
                  locked: false
                }
              ]
            };
          }
          return panel;
        })
      }));
      
      await updateProject.mutateAsync({
        id: selectedComicId,
        data: { data: { ...comicData, spreads: updatedSpreads } }
      });
      
      toast.success("Applied to panel!");
      setShowApplyPanel(false);
      setSelectedComicId(null);
      setSelectedPanelId(null);
    } catch (err) {
      toast.error("Failed to apply to panel");
    }
  };

  // Get panels from selected comic
  const getComicPanels = () => {
    if (!selectedComic?.data) return [];
    const data = selectedComic.data as any;
    if (!data.spreads) return [];
    
    const panels: { id: string; label: string }[] = [];
    data.spreads.forEach((spread: any, sIdx: number) => {
      spread.leftPage?.forEach((panel: any, pIdx: number) => {
        panels.push({ id: panel.id, label: `Spread ${sIdx + 1} Left - Panel ${pIdx + 1}` });
      });
      spread.rightPage?.forEach((panel: any, pIdx: number) => {
        panels.push({ id: panel.id, label: `Spread ${sIdx + 1} Right - Panel ${pIdx + 1}` });
      });
    });
    return panels;
  };

  // Apply FX preset to current frame
  const applyFXPreset = (fxId: string) => {
    if (activeEffects.includes(fxId)) {
      setActiveEffects(prev => prev.filter(id => id !== fxId));
      toast.success(`${FX_PRESETS.find(fx => fx.id === fxId)?.name} removed`);
    } else {
      setActiveEffects(prev => [...prev, fxId]);
      toast.success(`${FX_PRESETS.find(fx => fx.id === fxId)?.name} applied!`);
    }
  };

  // Handle asset selection from browser
  const handleAssetSelect = (asset: { id: string; name: string; url: string }) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(200 / img.width, 200 / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      saveToHistory();
      saveCurrentFrame();
      toast.success(`${asset.name} added to canvas`);
    };
    img.src = asset.url;
  };

  // Toggle keyframe for current frame
  const toggleKeyframe = () => {
    const frameId = frames[currentFrameIndex]?.id;
    if (!frameId) return;
    
    if (keyframes[frameId]) {
      const newKeyframes = { ...keyframes };
      delete newKeyframes[frameId];
      setKeyframes(newKeyframes);
      toast.success("Keyframe removed");
    } else {
      setKeyframes(prev => ({
        ...prev,
        [frameId]: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }
      }));
      toast.success("Keyframe added");
    }
  };

  // Check if current frame has a keyframe
  const hasKeyframe = frames[currentFrameIndex] ? !!keyframes[frames[currentFrameIndex].id] : false;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden select-none">
      {/* Top Command Bar */}
      <header className="h-12 bg-black border-b border-white/20 flex items-center justify-between px-3 shrink-0 relative">
        {/* Subtle top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 hover:bg-[#252525] rounded-lg transition-colors" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </button>
          </Link>
          <div className="h-6 w-px bg-[#252525]" />
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none hover:bg-[#1a1a1a] px-2 py-1 rounded transition-colors min-w-[200px]"
            data-testid="input-project-title"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
            className="p-2 hover:bg-[#252525] rounded-lg transition-colors">
            <SkipBack className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              isPlaying 
                ? 'bg-white text-black' 
                : 'bg-zinc-800 hover:bg-zinc-700'
            }`}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => setCurrentFrameIndex(Math.min(frames.length - 1, currentFrameIndex + 1))}
            className="p-2 hover:bg-[#252525] rounded-lg transition-colors">
            <SkipForward className="w-4 h-4 text-zinc-400" />
          </button>
          <button 
            onClick={() => setLoopEnabled(!loopEnabled)}
            className={`p-2 rounded-lg transition-colors ${loopEnabled ? 'bg-white text-black' : 'hover:bg-[#252525]'}`}
            title={loopEnabled ? "Loop enabled" : "Loop disabled"}
            data-testid="button-loop">
            <Repeat className={`w-4 h-4 ${loopEnabled ? '' : 'text-zinc-400'}`} />
          </button>
          <div className="ml-2 px-3 py-1 bg-[#1a1a1a] rounded text-xs font-mono text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioUpload}
          />
          <button
            onClick={() => audioFileInputRef.current?.click()}
            className="p-2 bg-zinc-800 border border-white/10 rounded-lg hover:border-emerald-500/50 transition"
            title="Add Audio Track"
          >
            <Music className="w-4 h-4 text-emerald-400" />
          </button>
          {audioClips.length > 0 && (
            <>
              <button
                onClick={() => setAudioMuted(!audioMuted)}
                className={`p-2 rounded-lg border transition ${audioMuted ? 'bg-red-900/30 border-red-500/50' : 'bg-zinc-800 border-white/10'}`}
                title={audioMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={audioVolume * 100}
                onChange={(e) => setAudioVolume(Number(e.target.value) / 100)}
                className="w-16 h-1 accent-emerald-500"
                title={`Volume: ${Math.round(audioVolume * 100)}%`}
              />
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* FX Button */}
          <button onClick={() => setShowFXPanel(!showFXPanel)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              showFXPanel 
                ? 'bg-white text-black' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            data-testid="button-fx">
            <Zap className="w-3.5 h-3.5" />
            FX
            {activeEffects.length > 0 && (
              <span className="px-1.5 py-0.5 bg-black/20 rounded-full text-[10px]">{activeEffects.length}</span>
            )}
          </button>
          
          {/* Asset Library Button */}
          <button onClick={() => setShowAssetBrowser(true)}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-assets">
            <Grid3X3 className="w-3.5 h-3.5" />
            Assets
          </button>
          
          {/* FX Studio Browser Button (pressplays.site sync) */}
          <button onClick={() => { setShowFxBrowser(!showFxBrowser); if (!showFxBrowser && fxEffects.length === 0) loadFxEffects(); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              showFxBrowser 
                ? 'bg-purple-600 text-white' 
                : 'bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300'
            }`}
            data-testid="button-fx-studio">
            <Sparkles className="w-3.5 h-3.5" />
            FX Studio
          </button>
          
          {/* Onion Skin Toggle */}
          <button onClick={() => setShowOnionSkin(!showOnionSkin)}
            className={`p-2 rounded-lg transition-all ${
              showOnionSkin 
                ? 'bg-white text-black' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
            }`}
            title="Onion Skinning"
            data-testid="button-onion-skin">
            <Layers className="w-4 h-4" />
          </button>
          
          <div className="h-6 w-px bg-[#303030] mx-1" />
          
          <button onClick={() => setShowComicPreview(true)}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-preview">
            <MonitorPlay className="w-3.5 h-3.5" />
            Preview
          </button>
          <button onClick={() => setShowApplyPanel(true)}
            className="px-3 py-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-apply-panel">
            <Layers className="w-3.5 h-3.5" />
            Apply
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="button-save">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "..." : "Save"}
          </button>
          <button onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-export">
            <Download className="w-3.5 h-3.5" />
            PSDCF
          </button>
          <button onClick={() => setShowExportDialog(true)}
            className="px-3 py-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-export-video">
            <FileVideo className="w-3.5 h-3.5" />
            Export Video
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tools Panel */}
        {showAssets && (
          <aside className="w-64 bg-black border-r border-white/20 flex flex-col shrink-0">
            <div className="p-3 border-b border-white/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Tools</span>
              <button onClick={() => setShowAssets(false)} className="p-1 hover:bg-[#252525] rounded">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Drawing Mode Toggle */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Mode</div>
                <div className="flex gap-1">
                  <button onClick={() => setDrawingMode("raster")}
                    className={`flex-1 p-2 text-xs rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      drawingMode === "raster" ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}>
                    <Pencil className="w-4 h-4" /> Raster
                  </button>
                  <button onClick={() => setDrawingMode("vector")}
                    className={`flex-1 p-2 text-xs rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      drawingMode === "vector" ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}>
                    <PenTool className="w-4 h-4" /> Vector
                  </button>
                </div>
              </div>
              
              {/* Tools Grid */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">
                  {drawingMode === "raster" ? "Raster Tools" : "Vector Tools"}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {drawingMode === "raster" ? (
                    <>
                      <button onClick={() => setRasterTool("select")} title="Select"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-select">
                        <MousePointer className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("pen")} title="Brush"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "pen" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-pen">
                        <Pen className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("eraser")} title="Eraser"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "eraser" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-eraser">
                        <Eraser className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("fill")} title="Paint Bucket (Fill)"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "fill" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-fill">
                        <PaintBucket className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("eyedropper")} title="Eyedropper (Color Picker)"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "eyedropper" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-eyedropper">
                        <Pipette className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("rect-select")} title="Rectangular Selection"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "rect-select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-rect-select">
                        <SquareDashed className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("ellipse-select")} title="Elliptical Selection"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "ellipse-select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-ellipse-select">
                        <CircleDashed className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("lasso-select")} title="Lasso Selection"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "lasso-select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-lasso-select">
                        <Lasso className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-rect")} title="Rectangle Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-rect" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-rect">
                        <Square className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-ellipse")} title="Ellipse Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-ellipse" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-ellipse">
                        <Circle className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-line")} title="Line Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-line" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-line">
                        <Minus className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-arrow")} title="Arrow Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-arrow" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-arrow">
                        <ArrowRight className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-polygon")} title="Polygon Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-polygon" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-polygon">
                        <Pentagon className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("shape-star")} title="Star Shape"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "shape-star" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                        data-testid="tool-shape-star">
                        <Star className="w-4 h-4 mx-auto" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setVectorTool("select")} title="Select"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <MousePointer className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("pen")} title="Pen Tool"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "pen" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <PenTool className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("pencil")} title="Pencil"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "pencil" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Pencil className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("line")} title="Line"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "line" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Minus className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("rectangle")} title="Rectangle"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "rectangle" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Square className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("ellipse")} title="Ellipse"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "ellipse" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Circle className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("arrow")} title="Arrow"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "arrow" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <ArrowRight className="w-4 h-4 mx-auto" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Brush Settings */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Brush</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Size: {brushSize}px</label>
                    <input type="range" min="1" max="50" value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full accent-white" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Stroke Color</label>
                    <div className="flex flex-wrap gap-1">
                      {COLORS.map(color => (
                        <button key={color} onClick={() => setBrushColor(color)}
                          className={`w-6 h-6 rounded border-2 transition-all ${brushColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }} />
                      ))}
                      <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)}
                        className="w-6 h-6 cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>
                  {(drawingMode === "vector" || (drawingMode === "raster" && rasterTool.startsWith("shape-"))) && (
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Fill Color</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFillColor("transparent")}
                          className={`px-2 py-1 text-[10px] rounded ${fillColor === "transparent" ? 'bg-white text-black' : 'bg-zinc-900'}`}>
                          None
                        </button>
                        <input type="color" value={fillColor === "transparent" ? "#ffffff" : fillColor}
                          onChange={(e) => setFillColor(e.target.value)}
                          className="w-6 h-6 cursor-pointer border-0 bg-transparent" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Actions</div>
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={undo} title="Undo (Ctrl+Z)"
                    className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors">
                    <Undo2 className="w-4 h-4 mx-auto text-zinc-400" />
                  </button>
                  <button onClick={redo} title="Redo (Ctrl+Shift+Z)"
                    className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors">
                    <Redo2 className="w-4 h-4 mx-auto text-zinc-400" />
                  </button>
                  <button onClick={clearCanvas} title="Clear Canvas"
                    className="p-2 bg-[#1a1a1a] hover:bg-red-900/50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 mx-auto text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Selection Actions */}
              {selectionRect && drawingMode === "raster" && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Selection</div>
                  <div className="grid grid-cols-4 gap-1">
                    <button onClick={copySelection} title="Copy (Ctrl+C)"
                      className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                      data-testid="button-copy-selection">
                      <Copy className="w-4 h-4 mx-auto text-zinc-400" />
                    </button>
                    <button onClick={cutSelection} title="Cut (Ctrl+X)"
                      className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                      data-testid="button-cut-selection">
                      <Scissors className="w-4 h-4 mx-auto text-zinc-400" />
                    </button>
                    <button onClick={pasteSelection} title="Paste (Ctrl+V)"
                      className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                      disabled={!clipboardImageData}
                      data-testid="button-paste-selection">
                      <ClipboardPaste className="w-4 h-4 mx-auto text-zinc-400" />
                    </button>
                    <button onClick={deleteSelection} title="Delete (Del)"
                      className="p-2 bg-[#1a1a1a] hover:bg-red-900/50 rounded-lg transition-colors"
                      data-testid="button-delete-selection">
                      <Trash2 className="w-4 h-4 mx-auto text-zinc-400" />
                    </button>
                  </div>
                  <button onClick={clearSelection}
                    className="w-full mt-1 p-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1a] rounded transition-colors"
                    data-testid="button-deselect">
                    Deselect (Esc)
                  </button>
                </div>
              )}
              
              {/* Import */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Import</div>
                <label className="flex items-center gap-2 p-2.5 bg-[#1a1a1a] hover:bg-[#202020] rounded-lg cursor-pointer transition-colors border border-dashed border-[#303030]">
                  <Upload className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400">Add Image</span>
                  <input type="file" accept="image/*" onChange={handleFileImport} className="hidden" />
                </label>
              </div>
              
              {/* Frames */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Frames ({frames.length})</span>
                  <button onClick={addFrame} className="p-1 hover:bg-[#252525] rounded" data-testid="button-add-frame">
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
                <VirtualizedFrameList
                  frames={frames}
                  currentFrameIndex={currentFrameIndex}
                  onSelectFrame={(idx) => { saveCurrentFrame(); setCurrentFrameIndex(idx); }}
                  maxHeight={160}
                />
              </div>
              
              {/* Quick Effects */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Quick Effects</div>
                <div className="grid grid-cols-2 gap-1">
                  {["Fade In", "Fade Out", "Zoom", "Pan", "Shake", "Blur"].map(effect => (
                    <button key={effect}
                      onClick={() => toast.success(`${effect} applied`)}
                      className="p-2 text-xs bg-[#1a1a1a] hover:bg-[#202020] rounded-lg transition-colors text-zinc-400 hover:text-zinc-200">
                      {effect}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Center Stage */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Viewport */}
          <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center p-4 relative">
            {!showAssets && (
              <button onClick={() => setShowAssets(true)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-[#303030]">
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            )}
            
            <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl border-2 border-black"
              style={{ 
                width: `${(960 * zoom) / 100}px`, 
                height: `${(540 * zoom) / 100}px`,
                maxWidth: '100%',
                maxHeight: '100%',
                willChange: 'transform',
                contain: 'strict'
              }}>
              {/* Onion Skin - Previous Frames (red tint) */}
              {showOnionSkin && Array.from({ length: onionSkinFrames }).map((_, i) => {
                const prevIdx = currentFrameIndex - (i + 1);
                if (prevIdx < 0 || !frames[prevIdx]?.imageData) return null;
                const opacity = (onionSkinOpacity / 100) * (1 - i * 0.3);
                return (
                  <img key={`onion-prev-${i}`}
                    src={frames[prevIdx].imageData}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ 
                      opacity: opacity,
                      filter: 'sepia(100%) saturate(300%) hue-rotate(-50deg)',
                      mixBlendMode: 'multiply',
                      zIndex: 1
                    }}
                    alt="" />
                );
              })}
              
              {/* Onion Skin - Next Frames (green tint) */}
              {showOnionSkin && Array.from({ length: onionSkinFrames }).map((_, i) => {
                const nextIdx = currentFrameIndex + (i + 1);
                if (nextIdx >= frames.length || !frames[nextIdx]?.imageData) return null;
                const opacity = (onionSkinOpacity / 100) * (1 - i * 0.3);
                return (
                  <img key={`onion-next-${i}`}
                    src={frames[nextIdx].imageData}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ 
                      opacity: opacity,
                      filter: 'sepia(100%) saturate(300%) hue-rotate(80deg)',
                      mixBlendMode: 'multiply',
                      zIndex: 1
                    }}
                    alt="" />
                );
              })}
              
              {/* Drawing Layers Below Active Layer */}
              {currentDrawingLayers.map((dl, dlIdx) => {
                if (dl.id === activeDrawingLayerId || !dl.visible || !dl.imageData || !dl.imageData.startsWith('data:')) return null;
                const activeIdx = currentDrawingLayers.findIndex(l => l.id === activeDrawingLayerId);
                if (dlIdx >= activeIdx) return null;
                return (
                  <img key={`dl-below-${dl.id}`}
                    src={dl.imageData}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      opacity: dl.opacity / 100,
                      mixBlendMode: dl.blendMode as any,
                      zIndex: 3 + dlIdx
                    }}
                    alt="" />
                );
              })}
              
              {/* Raster Canvas */}
              <canvas ref={canvasRef} width={1920} height={1080}
                className={`absolute inset-0 w-full h-full ${drawingMode === "raster" ? "z-10" : "z-0"}`}
                style={{ 
                  cursor: currentTool === "select" ? "default" 
                    : rasterTool === "eyedropper" ? "crosshair" 
                    : rasterTool === "fill" ? "cell"
                    : "crosshair",
                  opacity: (activeDrawingLayer?.opacity ?? 100) / 100,
                  mixBlendMode: (activeDrawingLayer?.blendMode || blendMode) as any,
                  willChange: 'transform',
                  contain: 'layout style paint'
                }}
                onPointerDown={drawingMode === "raster" ? handlePointerDown : undefined}
                onPointerMove={drawingMode === "raster" ? handlePointerMove : undefined}
                onPointerUp={drawingMode === "raster" ? handlePointerUp : undefined}
                onPointerLeave={drawingMode === "raster" ? handlePointerUp : undefined} />
              
              {/* Drawing Layers Above Active Layer */}
              {currentDrawingLayers.map((dl, dlIdx) => {
                if (dl.id === activeDrawingLayerId || !dl.visible || !dl.imageData || !dl.imageData.startsWith('data:')) return null;
                const activeIdx = currentDrawingLayers.findIndex(l => l.id === activeDrawingLayerId);
                if (dlIdx < activeIdx) return null;
                return (
                  <img key={`dl-above-${dl.id}`}
                    src={dl.imageData}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      opacity: dl.opacity / 100,
                      mixBlendMode: dl.blendMode as any,
                      zIndex: 11 + dlIdx
                    }}
                    alt="" />
                );
              })}
              
              {/* Vector SVG Overlay */}
              <svg ref={svgRef} viewBox="0 0 1920 1080"
                className={`absolute inset-0 w-full h-full ${drawingMode === "vector" ? "z-10" : "z-0 pointer-events-none"}`}
                style={{ cursor: currentTool === "select" ? "default" : "crosshair" }}
                onPointerDown={drawingMode === "vector" ? handlePointerDown : undefined}
                onPointerMove={drawingMode === "vector" ? handlePointerMove : undefined}
                onPointerUp={drawingMode === "vector" ? handlePointerUp : undefined}
                onPointerLeave={drawingMode === "vector" ? handlePointerUp : undefined}>
                {vectorPaths.map(path => renderVectorPath(path))}
                {currentPath && renderVectorPath(currentPath, true)}
              </svg>
              
              {/* Selection / Shape Preview Overlay Canvas */}
              <canvas
                ref={selectionCanvasRef}
                width={1920}
                height={1080}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 15 }}
              />
              
              {/* Image Layers Overlay */}
              <div 
                className="absolute inset-0"
                data-layer-container="true"
                style={{ pointerEvents: 'none', zIndex: (rasterTool === 'select' && drawingMode === 'raster') || (vectorTool === 'select' && drawingMode === 'vector') ? 20 : 2 }}
              >
                {currentImageLayers.filter(l => l.visible).map(layer => {
                  const isSelected = selectedLayerId === layer.id;
                  const scaleX = 100 / zoom;
                  return (
                    <div
                      key={layer.id}
                      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-white' : ''}`}
                      style={{
                        left: `${(layer.x / 1920) * 100}%`,
                        top: `${(layer.y / 1080) * 100}%`,
                        width: `${(layer.width / 1920) * 100}%`,
                        height: `${(layer.height / 1080) * 100}%`,
                        opacity: layer.opacity / 100,
                        transform: `rotate(${layer.rotation}deg)`,
                        transformOrigin: 'center center',
                        pointerEvents: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        if (drawingMode === 'raster') setRasterTool('select');
                        if (drawingMode === 'vector') setVectorTool('select');
                      }}
                      onMouseDown={(e) => {
                        if (layer.locked) return;
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedLayerId(layer.id);
                        if (drawingMode === 'raster') setRasterTool('select');
                        if (drawingMode === 'vector') setVectorTool('select');
                        const container = document.querySelector('[data-layer-container]') as HTMLElement;
                        if (!container) return;
                        const containerRect = container.getBoundingClientRect();
                        const scaleX = 1920 / containerRect.width;
                        const scaleY = 1080 / containerRect.height;
                        const startX = (e.clientX - containerRect.left) * scaleX;
                        const startY = (e.clientY - containerRect.top) * scaleY;
                        const startLayerX = layer.x;
                        const startLayerY = layer.y;
                        const MOTION_GRID = 20;
                        const handleMove = (moveE: MouseEvent) => {
                          const rect = container.getBoundingClientRect();
                          const sx = 1920 / rect.width;
                          const sy = 1080 / rect.height;
                          const cx = (moveE.clientX - rect.left) * sx;
                          const cy = (moveE.clientY - rect.top) * sy;
                          let newX = startLayerX + (cx - startX);
                          let newY = startLayerY + (cy - startY);
                          if (moveE.shiftKey) {
                            newX = Math.round(newX / MOTION_GRID) * MOTION_GRID;
                            newY = Math.round(newY / MOTION_GRID) * MOTION_GRID;
                          }
                          updateImageLayer(layer.id, { x: newX, y: newY });
                        };
                        const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove);
                          document.removeEventListener('mouseup', handleUp);
                        };
                        document.addEventListener('mousemove', handleMove);
                        document.addEventListener('mouseup', handleUp);
                      }}
                    >
                      <img 
                        src={layer.src} 
                        alt={layer.name}
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                      {/* Resize Handles (when selected) */}
                      {isSelected && !layer.locked && (
                        <>
                          {/* Corner handles */}
                          <div 
                            className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border border-black cursor-se-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsResizingLayer('se');
                              const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                              if (rect) {
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                setDragStart({
                                  x: (e.clientX - rect.left) * scaleX,
                                  y: (e.clientY - rect.top) * scaleY,
                                  layerX: layer.width,
                                  layerY: layer.height
                                });
                              }
                              const RESIZE_GRID = 20;
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                let newWidth = currentX - layer.x;
                                let newHeight = currentY - layer.y;
                                if (moveE.shiftKey) {
                                  newWidth = Math.round(newWidth / RESIZE_GRID) * RESIZE_GRID;
                                  newHeight = Math.round(newHeight / RESIZE_GRID) * RESIZE_GRID;
                                }
                                newWidth = Math.max(50, newWidth);
                                newHeight = Math.max(50, newHeight);
                                updateImageLayer(layer.id, { width: newWidth, height: newHeight });
                              };
                              const handleUp = () => {
                                setIsResizingLayer(null);
                                document.removeEventListener('mousemove', handleMove);
                                document.removeEventListener('mouseup', handleUp);
                              };
                              document.addEventListener('mousemove', handleMove);
                              document.addEventListener('mouseup', handleUp);
                            }}
                          />
                          <div 
                            className="absolute -left-1 -top-1 w-3 h-3 bg-white border border-black cursor-nw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsResizingLayer('nw');
                              const origX = layer.x;
                              const origY = layer.y;
                              const origWidth = layer.width;
                              const origHeight = layer.height;
                              const NW_GRID = 20;
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                const dx = currentX - origX;
                                const dy = currentY - origY;
                                let newWidth = origWidth - dx;
                                let newHeight = origHeight - dy;
                                if (moveE.shiftKey) {
                                  newWidth = Math.round(newWidth / NW_GRID) * NW_GRID;
                                  newHeight = Math.round(newHeight / NW_GRID) * NW_GRID;
                                }
                                newWidth = Math.max(50, newWidth);
                                newHeight = Math.max(50, newHeight);
                                let newX = origX + (origWidth - newWidth);
                                let newY = origY + (origHeight - newHeight);
                                if (moveE.shiftKey) {
                                  newX = Math.round(newX / NW_GRID) * NW_GRID;
                                  newY = Math.round(newY / NW_GRID) * NW_GRID;
                                }
                                updateImageLayer(layer.id, { x: newX, y: newY, width: newWidth, height: newHeight });
                              };
                              const handleUp = () => {
                                setIsResizingLayer(null);
                                document.removeEventListener('mousemove', handleMove);
                                document.removeEventListener('mouseup', handleUp);
                              };
                              document.addEventListener('mousemove', handleMove);
                              document.addEventListener('mouseup', handleUp);
                            }}
                          />
                          <div 
                            className="absolute -right-1 -top-1 w-3 h-3 bg-white border border-black cursor-ne-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsResizingLayer('ne');
                              const origY = layer.y;
                              const origWidth = layer.width;
                              const origHeight = layer.height;
                              const NE_GRID = 20;
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                let newWidth = currentX - layer.x;
                                const dy = currentY - origY;
                                let newHeight = origHeight - dy;
                                if (moveE.shiftKey) {
                                  newWidth = Math.round(newWidth / NE_GRID) * NE_GRID;
                                  newHeight = Math.round(newHeight / NE_GRID) * NE_GRID;
                                }
                                newWidth = Math.max(50, newWidth);
                                newHeight = Math.max(50, newHeight);
                                let newY = origY + (origHeight - newHeight);
                                if (moveE.shiftKey) {
                                  newY = Math.round(newY / NE_GRID) * NE_GRID;
                                }
                                updateImageLayer(layer.id, { y: newY, width: newWidth, height: newHeight });
                              };
                              const handleUp = () => {
                                setIsResizingLayer(null);
                                document.removeEventListener('mousemove', handleMove);
                                document.removeEventListener('mouseup', handleUp);
                              };
                              document.addEventListener('mousemove', handleMove);
                              document.addEventListener('mouseup', handleUp);
                            }}
                          />
                          <div 
                            className="absolute -left-1 -bottom-1 w-3 h-3 bg-white border border-black cursor-sw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsResizingLayer('sw');
                              const origX = layer.x;
                              const origWidth = layer.width;
                              const SW_GRID = 20;
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                const dx = currentX - origX;
                                let newWidth = origWidth - dx;
                                let newHeight = currentY - layer.y;
                                if (moveE.shiftKey) {
                                  newWidth = Math.round(newWidth / SW_GRID) * SW_GRID;
                                  newHeight = Math.round(newHeight / SW_GRID) * SW_GRID;
                                }
                                newWidth = Math.max(50, newWidth);
                                newHeight = Math.max(50, newHeight);
                                let newX = origX + (origWidth - newWidth);
                                if (moveE.shiftKey) {
                                  newX = Math.round(newX / SW_GRID) * SW_GRID;
                                }
                                updateImageLayer(layer.id, { x: newX, width: newWidth, height: newHeight });
                              };
                              const handleUp = () => {
                                setIsResizingLayer(null);
                                document.removeEventListener('mousemove', handleMove);
                                document.removeEventListener('mouseup', handleUp);
                              };
                              document.addEventListener('mousemove', handleMove);
                              document.addEventListener('mouseup', handleUp);
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {!showInspector && (
              <button onClick={() => setShowInspector(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-[#303030]">
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>
          
          {/* Viewport Controls */}
          <div className="h-10 bg-[#111111] border-t border-[#252525] flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 hover:bg-[#252525] rounded">
                <ZoomOut className="w-4 h-4 text-zinc-400" />
              </button>
              <span className="text-xs text-zinc-400 w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1.5 hover:bg-[#252525] rounded">
                <ZoomIn className="w-4 h-4 text-zinc-400" />
              </button>
              <div className="h-4 w-px bg-[#303030] mx-2" />
              <button onClick={() => setZoom(100)} className="p-1.5 hover:bg-[#252525] rounded">
                <Maximize2 className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={addFrame} className="p-1.5 hover:bg-[#252525] rounded" title="Add Frame">
                <Plus className="w-4 h-4 text-zinc-400" />
              </button>
              <button onClick={duplicateFrame} className="p-1.5 hover:bg-[#252525] rounded" title="Duplicate">
                <Copy className="w-4 h-4 text-zinc-400" />
              </button>
              <button onClick={deleteFrame} className="p-1.5 hover:bg-[#252525] rounded" title="Delete">
                <Trash2 className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-48 bg-[#111111] border-t border-[#252525] flex flex-col shrink-0">
            <div className="h-8 bg-[#141414] border-b border-[#252525] flex items-center px-3">
              <div className="w-40 shrink-0 text-xs text-zinc-500 font-medium">Tracks</div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex items-end">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="flex-1 border-l border-[#303030] h-3 relative">
                      <span className="absolute -left-2 -top-4 text-[10px] text-zinc-600">{i}s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {tracks.map(track => (
                <div key={track.id} className="h-12 flex border-b border-[#1a1a1a] group">
                  <div className="w-40 shrink-0 bg-[#141414] border-r border-[#252525] flex items-center px-2 gap-2">
                    <button className="p-1 hover:bg-[#252525] rounded">
                      {track.visible ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>
                    <button className="p-1 hover:bg-[#252525] rounded">
                      {track.locked ? <Lock className="w-3.5 h-3.5 text-zinc-600" /> : <Unlock className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                    <span className="text-xs text-zinc-300 flex-1">{track.name}</span>
                    {track.type === "video" && <Film className="w-3.5 h-3.5 text-white" />}
                    {track.type === "effects" && <Sparkles className="w-3.5 h-3.5 text-white" />}
                    {track.type === "audio" && <Music className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div 
                    className="flex-1 bg-[#0d0d0d] relative cursor-pointer" 
                    ref={timelineRef}
                    onMouseDown={(e) => {
                      if (track.type !== "video") return;
                      setIsDraggingScrubber(true);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const newIndex = Math.min(Math.max(0, Math.floor(percentage * frames.length)), frames.length - 1);
                      saveCurrentFrame();
                      setCurrentFrameIndex(newIndex);
                    }}
                    onMouseMove={(e) => {
                      if (!isDraggingScrubber || track.type !== "video") return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const newIndex = Math.min(Math.max(0, Math.floor(percentage * frames.length)), frames.length - 1);
                      if (newIndex !== currentFrameIndex) {
                        saveCurrentFrame();
                        setCurrentFrameIndex(newIndex);
                      }
                    }}
                    onMouseUp={() => setIsDraggingScrubber(false)}
                    onMouseLeave={() => setIsDraggingScrubber(false)}
                  >
                    {track.type === "video" && frames.map((frame, idx) => (
                      <div key={frame.id}
                        className={`absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all group ${
                          idx === currentFrameIndex 
                            ? 'bg-white text-black' 
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        style={{ left: `${(idx * 10)}%`, width: `${Math.max(8, 100 / Math.max(frames.length, 1) - 1)}%` }}
                        onClick={(e) => { e.stopPropagation(); saveCurrentFrame(); setCurrentFrameIndex(idx); }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/80 font-medium truncate px-1">
                          {idx + 1}
                        </span>
                        {/* Keyframe Diamond Indicator */}
                        {keyframes[frame.id] && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                        )}
                        {/* Frame duration indicator */}
                        <div className="absolute bottom-0.5 right-1 text-[8px] text-white/40 font-mono">
                          {(frame.duration / 1000).toFixed(1)}s
                        </div>
                      </div>
                    ))}
                    {track.type === "audio" && (
                      <div className="absolute inset-0 flex items-center px-1">
                        {audioClips.map(clip => {
                          const left = (clip.startFrame / Math.max(frames.length, 1)) * 100;
                          const width = (clip.durationFrames / Math.max(frames.length, 1)) * 100;
                          return (
                            <div
                              key={clip.id}
                              className={`absolute top-1 bottom-1 rounded-lg ${clip.muted ? 'bg-zinc-700' : 'bg-emerald-900/80 border border-emerald-500/50'} flex items-center px-2 gap-1 cursor-pointer group`}
                              style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                              title={clip.name}
                            >
                              <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-[9px] text-emerald-300 truncate z-10">{clip.name}</span>
                              <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
                                {Array.from({ length: 50 }).map((_, i) => {
                                  const h = Math.abs(Math.sin(i * 0.7 + clip.id.charCodeAt(clip.id.length - 1)) * 8) + 2;
                                  return <rect key={i} x={i * 2} y={10 - h / 2} width="1.2" height={h} fill="#10b981" />;
                                })}
                              </svg>
                              <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAudioClips(prev => prev.map(c => c.id === clip.id ? { ...c, muted: !c.muted } : c)); }}
                                  className="p-0.5 hover:bg-black/50 rounded"
                                >
                                  {clip.muted ? <VolumeX className="w-3 h-3 text-zinc-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAudioClips(prev => prev.filter(c => c.id !== clip.id)); }}
                                  className="p-0.5 hover:bg-red-900/50 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {audioClips.length === 0 && (
                          <button
                            onClick={() => audioFileInputRef.current?.click()}
                            className="w-full h-full flex items-center justify-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 transition"
                          >
                            <Plus className="w-3 h-3" /> Add Audio
                          </button>
                        )}
                      </div>
                    )}
                    {/* Enhanced Playhead - draggable */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-10 cursor-ew-resize"
                      style={{ left: `${(currentFrameIndex / Math.max(frames.length, 1)) * 100}%` }}>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Inspector Panel */}
        {showInspector && (
          <aside className="w-64 bg-black border-l border-white/20 flex flex-col shrink-0">
            <div className="p-3 border-b border-white/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Inspector</span>
              <button onClick={() => setShowInspector(false)} className="p-1 hover:bg-[#252525] rounded">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Frame Properties */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">Frame {currentFrameIndex + 1}</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Duration (seconds)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={((frames[currentFrameIndex]?.duration || 1000) / 1000).toFixed(1)}
                      onChange={(e) => {
                        const seconds = parseFloat(e.target.value) || 1;
                        const ms = Math.max(100, Math.round(seconds * 1000));
                        setFrames(prev => prev.map((f, i) => i === currentFrameIndex ? { ...f, duration: ms } : f));
                      }}
                      className="w-full bg-zinc-900 border border-white/20 rounded-lg px-3 py-2 text-xs outline-none focus:border-white" />
                  </div>
                </div>
              </div>
              
              {/* Vector Paths List */}
              {drawingMode === "vector" && vectorPaths.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Paths ({vectorPaths.length})</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vectorPaths.map((path, idx) => (
                      <div key={path.id}
                        onClick={() => setSelectedPathId(path.id)}
                        className={`p-2 rounded text-xs cursor-pointer flex items-center justify-between ${
                          selectedPathId === path.id ? 'bg-white/20 border border-white/50' : 'bg-zinc-900 hover:bg-zinc-800'
                        }`}>
                        <span className="text-zinc-300 capitalize">{path.type} {idx + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); setVectorPaths(prev => prev.filter(p => p.id !== path.id)); }}
                          className="p-1 hover:bg-red-900/50 rounded">
                          <Trash2 className="w-3 h-3 text-zinc-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pen Tool Help */}
              {drawingMode === "vector" && vectorTool === "pen" && (
                <div className="p-2 bg-white/10 border border-white/30 rounded-lg">
                  <div className="text-[10px] font-semibold text-white mb-1">Pen Tool</div>
                  <div className="text-[10px] text-zinc-400">
                    Click to add points. Press Enter to finish path.
                  </div>
                </div>
              )}
              
              {/* Drawing Layers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Drawing Layers ({currentDrawingLayers.length})</span>
                  <button
                    onClick={addDrawingLayer}
                    className="p-1 hover:bg-[#252525] rounded"
                    title="Add Drawing Layer"
                    data-testid="btn-add-drawing-layer">
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto" data-testid="drawing-layers-list">
                  {[...currentDrawingLayers].reverse().map((dl, idx) => {
                    const isActive = dl.id === activeDrawingLayerId || (dl.id === currentDrawingLayers[0]?.id && !currentDrawingLayers.find(l => l.id === activeDrawingLayerId));
                    return (
                      <div
                        key={dl.id}
                        onClick={() => { if (!dl.locked) switchDrawingLayer(dl.id); }}
                        className={`p-2 rounded text-xs cursor-pointer flex items-center gap-1.5 ${
                          isActive ? 'bg-violet-900/40 border border-violet-500/50' : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent'
                        }`}
                        data-testid={`drawing-layer-${dl.id}`}
                      >
                        <div className="w-6 h-4 bg-[#252525] rounded overflow-hidden flex-shrink-0 border border-white/10">
                          {dl.imageData && dl.imageData.startsWith('data:') && (
                            <img src={dl.imageData} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-zinc-300 flex-1 truncate text-[11px]">{dl.name}</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{dl.opacity}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateDrawingLayer(dl.id, { visible: !dl.visible }); }}
                          className="p-0.5 hover:bg-zinc-700 rounded"
                          data-testid={`drawing-layer-visibility-${dl.id}`}>
                          {dl.visible ? <Eye className="w-3 h-3 text-zinc-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateDrawingLayer(dl.id, { locked: !dl.locked }); }}
                          className="p-0.5 hover:bg-zinc-700 rounded"
                          data-testid={`drawing-layer-lock-${dl.id}`}>
                          {dl.locked ? <Lock className="w-3 h-3 text-zinc-600" /> : <Unlock className="w-3 h-3 text-zinc-400" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {currentDrawingLayers.find(l => l.id === activeDrawingLayerId) && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Layer Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={activeDrawingLayer?.opacity ?? 100}
                        onChange={(e) => updateDrawingLayer(activeDrawingLayerId, { opacity: parseInt(e.target.value) })}
                        className="w-full h-1 accent-violet-500"
                        data-testid="drawing-layer-opacity-slider"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Blend Mode</label>
                      <select
                        value={activeDrawingLayer?.blendMode || "normal"}
                        onChange={(e) => updateDrawingLayer(activeDrawingLayerId, { blendMode: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1 text-[10px] outline-none focus:border-violet-500"
                        data-testid="drawing-layer-blend-mode"
                      >
                        {BLEND_MODES.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => reorderDrawingLayer(activeDrawingLayerId, "up")}
                        className="flex-1 p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[10px] flex items-center justify-center gap-1"
                        title="Move Up"
                        data-testid="drawing-layer-move-up">
                        <ChevronUp className="w-3 h-3 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => reorderDrawingLayer(activeDrawingLayerId, "down")}
                        className="flex-1 p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[10px] flex items-center justify-center gap-1"
                        title="Move Down"
                        data-testid="drawing-layer-move-down">
                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => duplicateDrawingLayer(activeDrawingLayerId)}
                        className="flex-1 p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[10px] flex items-center justify-center gap-1"
                        title="Duplicate"
                        data-testid="drawing-layer-duplicate">
                        <Copy className="w-3 h-3 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => mergeDownDrawingLayer(activeDrawingLayerId)}
                        className="flex-1 p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-[10px] flex items-center justify-center gap-1"
                        title="Merge Down"
                        data-testid="drawing-layer-merge-down">
                        <GitBranch className="w-3 h-3 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => deleteDrawingLayer(activeDrawingLayerId)}
                        className="flex-1 p-1.5 bg-zinc-900 hover:bg-red-900/50 rounded text-[10px] flex items-center justify-center gap-1"
                        title="Delete"
                        data-testid="drawing-layer-delete">
                        <Trash2 className="w-3 h-3 text-zinc-400" />
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Layer Name</label>
                      <input
                        type="text"
                        value={activeDrawingLayer?.name || ""}
                        onChange={(e) => updateDrawingLayer(activeDrawingLayerId, { name: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1 text-[10px] outline-none focus:border-violet-500"
                        data-testid="drawing-layer-name-input"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Image Layers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Image Layers ({currentImageLayers.length})</span>
                  <button 
                    onClick={() => imageLayerInputRef.current?.click()}
                    className="p-1 hover:bg-[#252525] rounded" 
                    title="Add Image Layer"
                    data-testid="btn-add-image-layer">
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
                <input 
                  ref={imageLayerInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageLayerUpload}
                  className="hidden" 
                />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentImageLayers.map((layer, idx) => (
                    <div 
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-2 rounded text-xs cursor-pointer flex items-center gap-2 ${
                        selectedLayerId === layer.id ? 'bg-white/20 border border-white/50' : 'bg-zinc-900 hover:bg-zinc-800'
                      }`}
                    >
                      <img src={layer.src} alt="" className="w-8 h-6 object-cover rounded" />
                      <span className="text-zinc-300 flex-1 truncate">{layer.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateImageLayer(layer.id, { visible: !layer.visible }); }}
                        className="p-1 hover:bg-zinc-700 rounded">
                        {layer.visible ? <Eye className="w-3 h-3 text-zinc-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteImageLayer(layer.id); }}
                        className="p-1 hover:bg-red-900/50 rounded">
                        <Trash2 className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                  ))}
                  {currentImageLayers.length === 0 && (
                    <div className="text-xs text-zinc-600 text-center py-2">
                      Click + to add image layers
                    </div>
                  )}
                </div>
              </div>
              
              {/* Transform - for selected image layer */}
              {selectedLayer && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">Transform: {selectedLayer.name}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">X</label>
                      <input 
                        type="number" 
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { x: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Y</label>
                      <input 
                        type="number" 
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { y: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Width</label>
                      <input 
                        type="number" 
                        value={Math.round(selectedLayer.width)}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { width: parseInt(e.target.value) || 50 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Height</label>
                      <input 
                        type="number" 
                        value={Math.round(selectedLayer.height)}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { height: parseInt(e.target.value) || 50 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Rotation</label>
                      <input 
                        type="number" 
                        value={selectedLayer.rotation}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { rotation: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">Opacity</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={selectedLayer.opacity}
                        onChange={(e) => updateImageLayer(selectedLayer.id, { opacity: parseInt(e.target.value) || 100 })}
                        className="w-full bg-zinc-900 border border-white/20 rounded px-2 py-1.5 text-xs outline-none focus:border-white" 
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-zinc-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedLayer.locked}
                      onChange={(e) => updateImageLayer(selectedLayer.id, { locked: e.target.checked })}
                      className="w-3 h-3"
                    />
                    Lock Layer
                  </label>
                </div>
              )}
              
              {/* AI Generate */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">AI Generate</div>
                <button onClick={() => toast.success("AI generation coming soon")}
                  className="w-full p-3 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all">
                  <Wand2 className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Comic Preview Modal */}
      {showComicPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="h-14 bg-[#111] border-b border-[#252525] flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold">Comic Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewFrameIndex(Math.max(0, previewFrameIndex - 1))}
                className="p-2 hover:bg-[#252525] rounded-lg">
                <SkipBack className="w-4 h-4 text-zinc-400" />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-lg ${isPlaying ? 'bg-white text-black' : 'bg-zinc-800'}`}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setPreviewFrameIndex(Math.min(frames.length - 1, previewFrameIndex + 1))}
                className="p-2 hover:bg-[#252525] rounded-lg">
                <SkipForward className="w-4 h-4 text-zinc-400" />
              </button>
              <button 
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`p-2 rounded-lg transition-colors ${loopEnabled ? 'bg-white text-black' : 'hover:bg-[#252525]'}`}
                title={loopEnabled ? "Loop enabled" : "Loop disabled"}>
                <Repeat className={`w-4 h-4 ${loopEnabled ? '' : 'text-zinc-400'}`} />
              </button>
              <span className="text-xs text-zinc-400 ml-2">
                Frame {previewFrameIndex + 1} of {frames.length}
              </span>
            </div>
            <button onClick={() => { setShowComicPreview(false); setIsPlaying(false); }}
              className="p-2 hover:bg-[#252525] rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden" style={{ maxWidth: '80vw', maxHeight: '80vh' }}>
              {frames[previewFrameIndex]?.imageData ? (
                <img 
                  src={frames[previewFrameIndex].imageData} 
                  alt={`Frame ${previewFrameIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : (
                <div className="w-[640px] h-[360px] bg-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-500">No content in this frame</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Frame Thumbnails */}
          <div className="h-24 bg-[#111] border-t border-[#252525] flex items-center gap-2 px-4 overflow-x-auto">
            {frames.map((frame, idx) => (
              <button key={frame.id}
                onClick={() => setPreviewFrameIndex(idx)}
                data-testid={`button-preview-frame-${idx}`}
                className={`w-20 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                  idx === previewFrameIndex ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}>
                {frame.imageData ? (
                  <img src={frame.imageData} loading="lazy" className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-500">{idx + 1}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Apply to Panel Modal */}
      {showApplyPanel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-xl border border-[#252525] w-full max-w-lg">
            <div className="p-4 border-b border-[#252525] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold">Apply to Comic Panel</span>
              </div>
              <button onClick={() => setShowApplyPanel(false)} className="p-1 hover:bg-[#252525] rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Select Comic */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2">Select Comic Project</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {comicProjects?.filter(p => p.type === 'comic').map(comic => (
                    <button key={comic.id}
                      onClick={() => { setSelectedComicId(comic.id); setSelectedPanelId(null); }}
                      className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                        selectedComicId === comic.id 
                          ? 'bg-white/20 border border-white/50' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent'
                      }`}>
                      <BookOpen className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm">{comic.title}</span>
                      {selectedComicId === comic.id && <Check className="w-4 h-4 text-white ml-auto" />}
                    </button>
                  ))}
                  {(!comicProjects || comicProjects.filter(p => p.type === 'comic').length === 0) && (
                    <div className="p-4 text-center text-zinc-500 text-xs">
                      No comic projects found. Create a comic first.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Select Panel */}
              {selectedComicId && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-2">Select Panel</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {getComicPanels().map(panel => (
                      <button key={panel.id}
                        onClick={() => setSelectedPanelId(panel.id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                          selectedPanelId === panel.id 
                            ? 'bg-white/20 border border-white/50' 
                            : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent'
                        }`}>
                        <Square className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm">{panel.label}</span>
                        {selectedPanelId === panel.id && <Check className="w-4 h-4 text-white ml-auto" />}
                      </button>
                    ))}
                    {getComicPanels().length === 0 && (
                      <div className="p-4 text-center text-zinc-500 text-xs">
                        No panels found. Make sure you've added panels and saved your comic project.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-[#252525] flex justify-end gap-2">
              <button onClick={() => setShowApplyPanel(false)}
                className="px-4 py-2 text-sm bg-[#1a1a1a] hover:bg-[#252525] rounded-lg">
                Cancel
              </button>
              <button onClick={applyToPanel}
                disabled={!selectedComicId || !selectedPanelId}
                className="px-4 py-2 text-sm bg-white text-black hover:bg-zinc-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <Check className="w-4 h-4" />
                Apply to Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FX Panel - Floating Panel */}
      {showFXPanel && (
        <div className="fixed top-16 right-4 w-80 bg-black border border-white/20 rounded-xl shadow-2xl z-40 overflow-hidden">
          <div className="p-3 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold">Effects Studio</span>
            </div>
            <button onClick={() => setShowFXPanel(false)} className="p-1 hover:bg-[#252525] rounded">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* FX Presets Grid */}
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">Quick Effects</div>
              <div className="grid grid-cols-5 gap-2">
                {FX_PRESETS.map(fx => (
                  <button key={fx.id}
                    onClick={() => applyFXPreset(fx.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                      activeEffects.includes(fx.id)
                        ? 'bg-white/20 border border-white/50 scale-105'
                        : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent hover:border-white/20'
                    }`}
                    title={fx.name}>
                    <fx.icon className={`w-4 h-4 ${fx.color}`} />
                    <span className="text-[9px] text-zinc-400">{fx.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Opacity Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase">Opacity</div>
                <span className="text-xs text-white font-mono">{frameOpacity}%</span>
              </div>
              <input type="range" min="0" max="100" value={frameOpacity}
                onChange={(e) => setFrameOpacity(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white" />
            </div>
            
            {/* Blend Mode */}
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Blend Mode</div>
              <select value={blendMode} onChange={(e) => setBlendMode(e.target.value)}
                className="w-full bg-zinc-900 border border-white/20 rounded-lg px-3 py-2 text-xs outline-none focus:border-white capitalize">
                {BLEND_MODES.map(mode => (
                  <option key={mode} value={mode} className="capitalize">{mode.replace('-', ' ')}</option>
                ))}
              </select>
            </div>
            
            {/* Easing Presets */}
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Easing Curve</div>
              <div className="grid grid-cols-3 gap-1">
                {EASING_PRESETS.map(easing => (
                  <button key={easing.id}
                    onClick={() => setSelectedEasing(easing.id)}
                    className={`p-2 text-[10px] rounded-lg transition-all ${
                      selectedEasing === easing.id
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}>
                    {easing.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Keyframe Button */}
            <div>
              <button onClick={toggleKeyframe}
                className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  hasKeyframe
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-dashed border-white/30'
                }`}>
                <Diamond className={`w-4 h-4 ${hasKeyframe ? 'fill-current' : ''}`} />
                {hasKeyframe ? 'Remove Keyframe' : 'Add Keyframe'}
              </button>
            </div>
            
            {/* Active Effects List */}
            {activeEffects.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Active Effects</div>
                <div className="space-y-1">
                  {activeEffects.map(fxId => {
                    const fx = FX_PRESETS.find(f => f.id === fxId);
                    if (!fx) return null;
                    return (
                      <div key={fxId}
                        className="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-lg">
                        <div className="flex items-center gap-2">
                          <fx.icon className={`w-3.5 h-3.5 ${fx.color}`} />
                          <span className="text-xs">{fx.name}</span>
                        </div>
                        <button onClick={() => applyFXPreset(fxId)}
                          className="p-1 hover:bg-red-900/50 rounded">
                          <X className="w-3 h-3 text-zinc-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FX Studio Browser Panel (pressplays.site sync) */}
      {showFxBrowser && (
        <div className="fixed top-16 right-72 w-96 bg-black border border-purple-500/30 rounded-xl shadow-2xl z-40 overflow-hidden">
          <div className="p-3 border-b border-purple-500/30 flex items-center justify-between bg-purple-950/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">FX Studio</span>
              <span className="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded-full">pressplays.site</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={loadFxEffects} className="p-1 hover:bg-purple-900/50 rounded" title="Refresh">
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
              </button>
              <button onClick={() => setShowFxBrowser(false)} className="p-1 hover:bg-[#252525] rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
          
          <div className="p-3 border-b border-purple-500/20">
            <div className="relative">
              <input
                type="text"
                placeholder="Search effects..."
                value={fxSearchQuery}
                onChange={(e) => setFxSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-purple-500/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/50"
                data-testid="input-fx-search"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
            {fxLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <span className="text-xs text-zinc-500">Loading effects from FX Studio...</span>
              </div>
            ) : fxEffects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Sparkles className="w-10 h-10 text-purple-500/30" />
                <p className="text-xs text-zinc-500">No effects found. Create effects at pressplays.site to see them here.</p>
              </div>
            ) : (
              fxEffects
                .filter(fx => !fxSearchQuery || fx.name.toLowerCase().includes(fxSearchQuery.toLowerCase()) || fx.type?.toLowerCase().includes(fxSearchQuery.toLowerCase()))
                .map(effect => (
                  <div key={effect.id} className="bg-zinc-900 border border-purple-500/10 rounded-lg overflow-hidden hover:border-purple-500/40 transition group">
                    <div className="flex gap-3 p-2">
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {effect.preview_data_url ? (
                          <img src={effect.preview_data_url} alt={effect.name} className="w-full h-full object-contain" />
                        ) : (
                          <Sparkles className="w-6 h-6 text-purple-500/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{effect.name}</h4>
                        {effect.description && (
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{effect.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {effect.type && effect.type.split(",").map((t, i) => (
                            <span key={i} className="text-[9px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">{t.trim()}</span>
                          ))}
                          {effect.layer_count > 0 && (
                            <span className="text-[9px] text-zinc-500">{effect.layer_count} layers</span>
                          )}
                          {effect.total_frames > 0 && (
                            <span className="text-[9px] text-zinc-500">{effect.total_frames}f @ {effect.fps}fps</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex border-t border-purple-500/10 divide-x divide-purple-500/10">
                      <button
                        onClick={() => importFxToLibrary(effect)}
                        disabled={importingFxId === effect.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-purple-300 hover:bg-purple-900/30 transition disabled:opacity-50"
                        data-testid={`button-fx-save-${effect.id}`}
                      >
                        {importingFxId === effect.id ? (
                          <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Save to Library
                      </button>
                      <button
                        onClick={() => importFxAsLayer(effect)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-cyan-300 hover:bg-cyan-900/30 transition"
                        data-testid={`button-fx-add-layer-${effect.id}`}
                      >
                        <Plus className="w-3 h-3" />
                        Add to Frame
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Onion Skin Controls - Floating when active */}
      {showOnionSkin && (
        <div className="fixed bottom-52 left-4 w-56 bg-black border border-white/20 rounded-xl shadow-2xl z-40 overflow-hidden">
          <div className="p-3 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-white" />
              <span className="text-xs font-semibold">Onion Skin</span>
            </div>
            <button onClick={() => setShowOnionSkin(false)} className="p-1 hover:bg-[#252525] rounded">
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
          
          <div className="p-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500">Opacity</span>
                <span className="text-[10px] text-white font-mono">{onionSkinOpacity}%</span>
              </div>
              <input type="range" min="10" max="80" value={onionSkinOpacity}
                onChange={(e) => setOnionSkinOpacity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500">Frames</span>
                <span className="text-[10px] text-white font-mono">{onionSkinFrames}</span>
              </div>
              <input type="range" min="1" max="5" value={onionSkinFrames}
                onChange={(e) => setOnionSkinFrames(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500/50" />
                <span className="text-[10px] text-zinc-500">Previous</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500/50" />
                <span className="text-[10px] text-zinc-500">Next</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Browser Modal */}
      <AssetBrowser
        isOpen={showAssetBrowser}
        onClose={() => setShowAssetBrowser(false)}
        onSelectAsset={handleAssetSelect}
        mode="insert"
      />

      {showExportDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="dialog-export-video">
          <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-2xl w-[420px] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold">Export Animation</span>
              </div>
              <button onClick={() => { if (!isExporting) setShowExportDialog(false); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                disabled={isExporting}
                data-testid="button-close-export">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-2 block">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportFormat("gif")}
                    disabled={isExporting}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                      exportFormat === "gif"
                        ? "bg-white text-black border-white"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                    }`}
                    data-testid="button-format-gif">
                    GIF
                  </button>
                  <button
                    onClick={() => setExportFormat("webm")}
                    disabled={isExporting}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                      exportFormat === "webm"
                        ? "bg-white text-black border-white"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                    }`}
                    data-testid="button-format-webm">
                    WebM Video
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium mb-2 block">Resolution</label>
                <select
                  value={exportResolution}
                  onChange={(e) => setExportResolution(e.target.value as any)}
                  disabled={isExporting}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                  data-testid="select-resolution">
                  <option value="1920x1080">1920 × 1080 (Full HD)</option>
                  <option value="1280x720">1280 × 720 (HD)</option>
                  <option value="960x540">960 × 540 (qHD)</option>
                  <option value="640x360">640 × 360 (SD)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400 font-medium">Frame Rate</label>
                  <span className="text-xs text-white font-mono">{exportFps} fps</span>
                </div>
                <input
                  type="range" min="4" max="30" value={exportFps}
                  onChange={(e) => setExportFps(Number(e.target.value))}
                  disabled={isExporting}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
                  data-testid="slider-fps" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400 font-medium">Quality</label>
                  <span className="text-xs text-white font-mono">{exportQuality}%</span>
                </div>
                <input
                  type="range" min="20" max="100" value={exportQuality}
                  onChange={(e) => setExportQuality(Number(e.target.value))}
                  disabled={isExporting}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
                  data-testid="slider-quality" />
              </div>

              <div className="bg-zinc-900 rounded-lg p-3 text-[11px] text-zinc-500">
                <div className="flex justify-between mb-1">
                  <span>Frames</span>
                  <span className="text-white">{frames.length}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Est. Duration</span>
                  <span className="text-white">{(frames.length / exportFps).toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="text-white">{exportFormat.toUpperCase()}</span>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2" data-testid="export-progress">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span className="text-xs text-zinc-300">{exportStatusText}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 text-right block">{exportProgress}%</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowExportDialog(false)}
                disabled={isExporting}
                className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                data-testid="button-cancel-export">
                Cancel
              </button>
              <button
                onClick={handleVideoExport}
                disabled={isExporting || frames.length === 0}
                className="px-4 py-2 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                data-testid="button-start-export">
                {isExporting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> Export {exportFormat.toUpperCase()}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeatureName}
        requiredTier="creator"
      />
    </div>
  );
}
