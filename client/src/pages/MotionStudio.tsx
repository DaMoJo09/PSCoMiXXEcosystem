import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Repeat,
  Plus, Trash2, Copy, Save, Download, Upload,
  Wand2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize2,
  Sparkles, Film, Music,
  Eye, EyeOff, Lock, Unlock,
  X, Pen, Eraser, MousePointer, Undo2, Redo2,
  Circle, Square, Minus, ArrowRight, PenTool, Pencil,
  Palette, Type, Image as ImageIcon,
  BookOpen, Layers, MonitorPlay, Check,
  Blend, Droplets, Zap, Move, RotateCcw, FlipHorizontal,
  Diamond, Clock, TrendingUp, Sliders, GitBranch, Aperture,
  Volume2, Grid3X3, Focus, Lightbulb, Wind, Flame
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useUpdateProject, useCreateProject, useProjects } from "@/hooks/useProjects";
import { AssetBrowser } from "@/components/tools/AssetBrowser";

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
type RasterTool = "pen" | "eraser" | "select";
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

interface Frame {
  id: string;
  imageData: string;
  vectorPaths: VectorPath[];
  imageLayers: ImageLayer[];
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

// Composite frame with effects applied
const compositeFrameWithEffects = (frame: Frame): Promise<string> => {
  return new Promise((resolve) => {
    if (!frame.imageData) {
      resolve("");
      return;
    }
    
    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      resolve(frame.imageData);
      return;
    }
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    
    // Load the frame image
    const img = new Image();
    img.onload = () => {
      // Apply blend mode and opacity from frame metadata
      ctx.globalAlpha = (frame.opacity ?? 100) / 100;
      ctx.globalCompositeOperation = mapBlendMode(frame.blendMode || 'normal');
      
      // Draw the frame
      ctx.drawImage(img, 0, 0);
      
      // Reset for any additional effects
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      
      // Apply quick FX overlays if any (visual indicators)
      if (frame.effects?.length) {
        // Add subtle effect indicators to exported frame
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
    img.onerror = () => resolve(frame.imageData);
    img.src = frame.imageData;
  });
};

export default function MotionStudio() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

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
    { id: "frame_1", imageData: "", vectorPaths: [], imageLayers: [], duration: 1000 }
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
  
  // Timeline zoom and scrubbing
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Keyframes (per-frame animation properties)
  const [keyframes, setKeyframes] = useState<Record<string, { x: number; y: number; scale: number; rotation: number; opacity: number }>>({});

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

  // Load project data
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as any;
      if (data?.frames?.length > 0) {
        setFrames(data.frames);
      }
    }
  }, [project]);

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
            if ((content.type === "image" || content.type === "gif") && content.data?.url) {
              imageLayers.push({
                id: `imported_${Date.now()}_${idx}`,
                src: content.data.url,
                x: content.transform?.x || 0,
                y: content.transform?.y || 0,
                width: content.transform?.width || 400,
                height: content.transform?.height || 400,
                rotation: content.transform?.rotation || 0,
                opacity: 100,
                locked: false,
                visible: true,
                name: `Imported ${idx + 1}`,
              });
            } else if (content.type === "drawing" && content.data?.drawingData) {
              imageLayers.push({
                id: `imported_${Date.now()}_${idx}`,
                src: content.data.drawingData,
                x: content.transform?.x || 0,
                y: content.transform?.y || 0,
                width: content.transform?.width || 400,
                height: content.transform?.height || 400,
                rotation: content.transform?.rotation || 0,
                opacity: 100,
                locked: false,
                visible: true,
                name: `Drawing ${idx + 1}`,
              });
            }
          });
          if (imageLayers.length > 0) {
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
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = ctxRef.current;
    if (!canvas || !context) return;
    
    const currentFrame = frames[currentFrameIndex];
    if (currentFrame?.imageData) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      img.src = currentFrame.imageData;
    } else {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
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

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    const frameId = frames[currentFrameIndex]?.id;
    const currentKeyframe = frameId ? keyframes[frameId] : undefined;
    
    setFrames(prev => prev.map((f, i) => 
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
    ));
  }, [currentFrameIndex, vectorPaths, activeEffects, frameOpacity, blendMode, selectedEasing, keyframes, frames]);

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    
    // Compute updated frames inline to avoid stale state
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
    
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { title, data: { frames: updatedFrames, tracks } },
      });
      toast.success("Project saved");
    } catch {
      toast.error("Failed to save");
    }
    setIsSaving(false);
  };

  const addFrame = () => {
    saveCurrentFrame();
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: "",
      vectorPaths: [],
      imageLayers: [],
      duration: 1000
    };
    setFrames(prev => [...prev, newFrame]);
    setCurrentFrameIndex(frames.length);
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
    
    const currentFrame = frames[currentFrameIndex];
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: canvas.toDataURL('image/png'),
      vectorPaths: [...vectorPaths],
      imageLayers: currentFrame?.imageLayers?.map(l => ({ ...l, id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })) || [],
      duration: 1000
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
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

  const handleExport = async () => {
    toast.info("Compositing frames with effects...");
    
    // Compute updated frames inline to include current state
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
    
    // Composite all frames with their effects applied
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
    if (rasterTool === "select") return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };
    
    const ctx = ctxRef.current;
    if (ctx && rasterTool === "pen") {
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handleRasterPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !lastPointRef.current || rasterTool === "select") return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const currentLineWidth = rasterTool === "eraser" 
      ? brushSize * 5 * pressure 
      : brushSize * (0.5 + pressure);
    
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    
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
    
    lastPointRef.current = { x, y };
  };

  const handleRasterPointerUp = () => {
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
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (drawingMode === "vector" && selectedPathId) {
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
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingMode, selectedPathId, isPenCreating, undo, redo, deleteSelectedPath, finishPenPath]);

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

  // Apply drawing to comic panel
  const applyToPanel = async () => {
    if (!selectedComicId || !selectedPanelId) {
      toast.error("Please select a comic and panel");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    
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
            className="px-3 py-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-export">
            <Download className="w-3.5 h-3.5" />
            Export
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
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "select" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <MousePointer className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("pen")} title="Brush"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "pen" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Pen className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("eraser")} title="Eraser"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "eraser" ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                        <Eraser className="w-4 h-4 mx-auto" />
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
                  {drawingMode === "vector" && (
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
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Frames</span>
                  <button onClick={addFrame} className="p-1 hover:bg-[#252525] rounded">
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {frames.map((frame, idx) => (
                    <button key={frame.id}
                      onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(idx); }}
                      className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                        idx === currentFrameIndex 
                          ? 'bg-white/20 border border-white/50' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border border-transparent'
                      }`}>
                      <div className="w-10 h-6 bg-[#252525] rounded overflow-hidden flex-shrink-0">
                        {frame.imageData && <img src={frame.imageData} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <span className="text-xs text-zinc-300">Frame {idx + 1}</span>
                    </button>
                  ))}
                </div>
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
                maxHeight: '100%'
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
              
              {/* Raster Canvas */}
              <canvas ref={canvasRef} width={1920} height={1080}
                className={`absolute inset-0 w-full h-full ${drawingMode === "raster" ? "z-10" : "z-0"}`}
                style={{ 
                  cursor: currentTool === "select" ? "default" : "crosshair",
                  opacity: frameOpacity / 100,
                  mixBlendMode: blendMode as any
                }}
                onPointerDown={drawingMode === "raster" ? handlePointerDown : undefined}
                onPointerMove={drawingMode === "raster" ? handlePointerMove : undefined}
                onPointerUp={drawingMode === "raster" ? handlePointerUp : undefined}
                onPointerLeave={drawingMode === "raster" ? handlePointerUp : undefined} />
              
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
                        const handleMove = (moveE: MouseEvent) => {
                          const rect = container.getBoundingClientRect();
                          const sx = 1920 / rect.width;
                          const sy = 1080 / rect.height;
                          const cx = (moveE.clientX - rect.left) * sx;
                          const cy = (moveE.clientY - rect.top) * sy;
                          updateImageLayer(layer.id, {
                            x: startLayerX + (cx - startX),
                            y: startLayerY + (cy - startY)
                          });
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
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                const newWidth = Math.max(50, currentX - layer.x);
                                const newHeight = Math.max(50, currentY - layer.y);
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
                                const newWidth = Math.max(50, origWidth - dx);
                                const newHeight = Math.max(50, origHeight - dy);
                                const newX = origX + (origWidth - newWidth);
                                const newY = origY + (origHeight - newHeight);
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
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                const newWidth = Math.max(50, currentX - layer.x);
                                const dy = currentY - origY;
                                const newHeight = Math.max(50, origHeight - dy);
                                const newY = origY + (origHeight - newHeight);
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
                              const handleMove = (moveE: MouseEvent) => {
                                const container = document.querySelector('[data-layer-container]') as HTMLElement;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const scaleX = 1920 / rect.width;
                                const scaleY = 1080 / rect.height;
                                const currentX = (moveE.clientX - rect.left) * scaleX;
                                const currentY = (moveE.clientY - rect.top) * scaleY;
                                const dx = currentX - origX;
                                const newWidth = Math.max(50, origWidth - dx);
                                const newX = origX + (origWidth - newWidth);
                                const newHeight = Math.max(50, currentY - layer.y);
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
              
              {/* Image Layers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Layers ({currentImageLayers.length})</span>
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
                className={`w-20 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                  idx === previewFrameIndex ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}>
                {frame.imageData ? (
                  <img src={frame.imageData} className="w-full h-full object-cover" alt="" />
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
    </div>
  );
}
