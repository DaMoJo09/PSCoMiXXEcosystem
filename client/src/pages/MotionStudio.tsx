import { Layout } from "@/components/layout/Layout";
import { 
  Play, 
  Pause, 
  Undo,
  Redo,
  Trash2,
  Plus,
  Copy,
  X,
  Check,
  ArrowLeft,
  Save,
  Download,
  Eye,
  EyeOff,
  Layers,
  Move,
  MousePointer,
  Pencil,
  PenTool,
  Eraser,
  Pipette,
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  Upload,
  Film,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Settings,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wand2,
  Sparkles,
  FileUp,
  Scissors,
  Video,
  Camera,
  Zap,
  Wind,
  Droplets,
  Flame,
  CloudRain,
  Sun,
  Moon,
  Stars,
  Vibrate,
  Focus,
  SplitSquareHorizontal,
  Smartphone,
  Monitor,
  Sliders,
  BookOpen,
  Share2,
  Grid3X3,
  Box,
  LayoutGrid,
  Palette,
  Contrast,
  Blend,
  Timer,
  GalleryHorizontal,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { AIGenerator } from "@/components/tools/AIGenerator";

type StudioMode = "import" | "timeline" | "effects" | "preview";

interface Frame {
  id: string;
  imageData: string;
  duration: number;
  layers: Layer[];
  keyframes?: Keyframe[];
  panelId?: string;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  imageData: string;
  depth?: number;
  type?: "background" | "character" | "foreground" | "effect" | "text";
}

interface Keyframe {
  time: number;
  property: string;
  value: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic";
}

interface ComicPanel {
  id: string;
  imageData: string;
  bounds: { x: number; y: number; width: number; height: number };
  layers: Layer[];
  animations: PanelAnimation[];
}

interface PanelAnimation {
  type: "shake" | "zoom" | "pan" | "parallax" | "bounce" | "fly-in" | "burst" | "glow";
  params: Record<string, number | string>;
  startTime: number;
  duration: number;
}

interface EffectPreset {
  id: string;
  name: string;
  icon: any;
  category: "filter" | "vfx" | "transition" | "camera";
  params: Record<string, number | string>;
}

interface AnimationData {
  frames: Frame[];
  fps: number;
  width: number;
  height: number;
  panels?: ComicPanel[];
  effects?: EffectPreset[];
}

const brushTypes = [
  { id: "brush", name: "Brush", icon: PenTool, width: 8, opacity: 100, hardness: 100 },
  { id: "pencil", name: "Pencil", icon: Pencil, width: 2, opacity: 100, hardness: 100 },
  { id: "ink", name: "Ink", icon: PenTool, width: 4, opacity: 100, hardness: 100 },
  { id: "marker", name: "Marker", icon: PenTool, width: 12, opacity: 80, hardness: 50 },
  { id: "airbrush", name: "Airbrush", icon: PenTool, width: 30, opacity: 20, hardness: 10 },
  { id: "calligraphy", name: "Calli", icon: PenTool, width: 6, opacity: 100, hardness: 100 },
];

const tools = [
  { id: "select", name: "Select", icon: MousePointer, shortcut: "V" },
  { id: "move", name: "Move", icon: Move, shortcut: "M" },
  { id: "brush", name: "Brush", icon: PenTool, shortcut: "B" },
  { id: "eraser", name: "Eraser", icon: Eraser, shortcut: "E" },
  { id: "eyedropper", name: "Eyedropper", icon: Pipette, shortcut: "I" },
  { id: "shape", name: "Shape", icon: Square, shortcut: "U" },
  { id: "text", name: "Text", icon: Type, shortcut: "T" },
];

const filterPresets: EffectPreset[] = [
  { id: "ink-boost", name: "Comic Ink", icon: Contrast, category: "filter", params: { contrast: 1.3, saturation: 0 } },
  { id: "anime-tone", name: "Anime Tone", icon: Palette, category: "filter", params: { saturation: 1.4, brightness: 1.1 } },
  { id: "halftone", name: "Halftone", icon: Grid3X3, category: "filter", params: { dotSize: 4, contrast: 1.2 } },
  { id: "neon-pop", name: "Neon Pop", icon: Zap, category: "filter", params: { glow: 0.8, saturation: 1.8 } },
  { id: "grunge", name: "CRT Grunge", icon: Monitor, category: "filter", params: { noise: 0.3, scanlines: 0.5 } },
  { id: "noir", name: "Noir", icon: Moon, category: "filter", params: { contrast: 1.5, saturation: 0, vignette: 0.4 } },
];

const vfxPresets: EffectPreset[] = [
  { id: "shake-micro", name: "Micro Shake", icon: Vibrate, category: "vfx", params: { intensity: 2, frequency: 30 } },
  { id: "shake-impact", name: "Impact", icon: Vibrate, category: "vfx", params: { intensity: 15, frequency: 60, decay: 0.9 } },
  { id: "shake-quake", name: "Earthquake", icon: Vibrate, category: "vfx", params: { intensity: 25, frequency: 20 } },
  { id: "speedlines", name: "Speed Lines", icon: Wind, category: "vfx", params: { count: 20, speed: 100 } },
  { id: "particles-dust", name: "Dust Cloud", icon: Droplets, category: "vfx", params: { count: 50, size: 3 } },
  { id: "particles-embers", name: "Embers", icon: Flame, category: "vfx", params: { count: 30, size: 2, color: "#ff6600" } },
  { id: "rain", name: "Rain", icon: CloudRain, category: "vfx", params: { intensity: 0.8, angle: -15 } },
  { id: "glow-aura", name: "Aura Glow", icon: Sun, category: "vfx", params: { radius: 20, color: "#ffffff", intensity: 0.6 } },
  { id: "light-rays", name: "Light Rays", icon: Sun, category: "vfx", params: { count: 8, intensity: 0.5 } },
];

const cameraPresets: EffectPreset[] = [
  { id: "zoom-in", name: "Zoom In", icon: ZoomIn, category: "camera", params: { scale: 1.3, duration: 500 } },
  { id: "zoom-out", name: "Zoom Out", icon: ZoomOut, category: "camera", params: { scale: 0.8, duration: 500 } },
  { id: "ken-burns", name: "Ken Burns", icon: Camera, category: "camera", params: { startScale: 1, endScale: 1.2, panX: 50 } },
  { id: "pan-left", name: "Pan Left", icon: ChevronLeft, category: "camera", params: { x: -100, duration: 800 } },
  { id: "pan-right", name: "Pan Right", icon: ChevronRight, category: "camera", params: { x: 100, duration: 800 } },
  { id: "parallax-2d", name: "2.5D Parallax", icon: Box, category: "camera", params: { depthScale: 1.5, tiltResponse: 1 } },
  { id: "dolly", name: "Dolly", icon: Video, category: "camera", params: { distance: 50, duration: 1000 } },
];

const transitionPresets: EffectPreset[] = [
  { id: "page-flip", name: "Page Flip", icon: BookOpen, category: "transition", params: { direction: "right", duration: 600 } },
  { id: "whip-pan", name: "Whip Pan", icon: Wind, category: "transition", params: { blur: 0.8, duration: 300 } },
  { id: "zoom-warp", name: "Zoom Warp", icon: Focus, category: "transition", params: { intensity: 1.5, duration: 400 } },
  { id: "glitch", name: "Glitch Break", icon: Zap, category: "transition", params: { slices: 10, duration: 200 } },
  { id: "ink-splash", name: "Ink Splash", icon: Droplets, category: "transition", params: { color: "#000000", duration: 500 } },
  { id: "white-flash", name: "White Flash", icon: Sun, category: "transition", params: { intensity: 1, duration: 150 } },
];

const panelAnimations = [
  { id: "fly-in", name: "Fly In", icon: Wind, description: "Character enters frame" },
  { id: "pop-in", name: "Pop In", icon: Zap, description: "Bounce into view" },
  { id: "burst-out", name: "Burst Out", icon: Stars, description: "Break panel borders" },
  { id: "jiggle", name: "Jiggle", icon: Vibrate, description: "Squash & stretch loop" },
  { id: "float", name: "Float", icon: Droplets, description: "Gentle hover animation" },
  { id: "impact-bounce", name: "Impact", icon: Flame, description: "Dramatic hit effect" },
];

export default function MotionStudio() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  const panelId = searchParams.get('panel');
  const returnTo = searchParams.get('return');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{x: number, y: number} | null>(null);
  
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  
  const [studioMode, setStudioMode] = useState<StudioMode>("timeline");
  const [frames, setFrames] = useState<Frame[]>([
    { id: "frame_1", imageData: "", duration: 100, layers: [] }
  ]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [onionSkin, setOnionSkin] = useState(true);
  const [onionSkinFrames, setOnionSkinFrames] = useState(2);
  
  const [activeTool, setActiveTool] = useState("brush");
  const [activeBrush, setActiveBrush] = useState("pencil");
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [pressureEnabled, setPressureEnabled] = useState(true);
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [title, setTitle] = useState("Untitled Dynamic Comic");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const [textLayers, setTextLayers] = useState<{id: string; text: string; x: number; y: number; fontSize: number; color: string; editing: boolean}[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [comicPanels, setComicPanels] = useState<ComicPanel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [activeEffects, setActiveEffects] = useState<EffectPreset[]>([]);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  
  const [cameraSettings, setCameraSettings] = useState({
    x: 0, y: 0, zoom: 1, rotation: 0, shake: 0
  });
  
  const [isReaderPreview, setIsReaderPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("desktop");

  const currentFrame = frames[currentFrameIndex];

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('motion_creating');
    if (!projectId && !creatingFlag && !createProject.isPending && !panelId) {
      sessionStorage.setItem('motion_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Dynamic Comic",
        type: "motion",
        status: "draft",
        data: { frames: [], fps: 12, width: 1920, height: 1080, panels: [], effects: [] },
      }).then((newProject) => {
        sessionStorage.removeItem('motion_creating');
        setIsCreating(false);
        navigate(`/creator/motion?id=${newProject.id}`, { replace: true });
      }).catch(() => {
        toast.error("Failed to create project");
        sessionStorage.removeItem('motion_creating');
        setIsCreating(false);
      });
    } else if (projectId) {
      sessionStorage.removeItem('motion_creating');
      setIsCreating(false);
    }
  }, [projectId]);

  const [panelDataLoaded, setPanelDataLoaded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      const data = project.data as AnimationData;
      if (data?.frames?.length > 0) {
        setFrames(data.frames);
        setFps(data.fps || 12);
      }
      if (data?.panels) {
        setComicPanels(data.panels);
      }
      if (data?.effects) {
        setActiveEffects(data.effects);
      }
    }
  }, [project]);

  useEffect(() => {
    if (studioMode !== "timeline") return;
    
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
    contextRef.current = context;
    setCanvasReady(true);
    
    if (currentFrame.imageData) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      img.src = currentFrame.imageData;
    }
  }, [studioMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    if (currentFrame.imageData) {
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
  }, [currentFrameIndex, currentFrame.imageData]);

  useEffect(() => {
    if (panelId && canvasReady && !panelDataLoaded) {
      const panelData = sessionStorage.getItem('panel_edit_data');
      if (panelData) {
        try {
          const data = JSON.parse(panelData);
          const panelNumber = data.panelId?.split('_')[1] || data.panelId?.split('-').pop() || '';
          setTitle(`Panel ${panelNumber} - DynaComic Edit`);
          
          if (data.contents && data.contents.length > 0) {
            const imageContent = data.contents.find((c: any) => c.type === 'image' || c.type === 'drawing' || c.type === 'ai');
            if (imageContent?.data?.url || imageContent?.data?.drawingData) {
              const canvas = canvasRef.current;
              const context = contextRef.current;
              if (canvas && context) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  context.clearRect(0, 0, canvas.width, canvas.height);
                  context.fillStyle = '#ffffff';
                  context.fillRect(0, 0, canvas.width, canvas.height);
                  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                  const x = (canvas.width - img.width * scale) / 2;
                  const y = (canvas.height - img.height * scale) / 2;
                  context.drawImage(img, x, y, img.width * scale, img.height * scale);
                  saveCurrentFrame();
                  setPanelDataLoaded(true);
                  toast.success("Panel loaded - add effects and export!");
                };
                img.onerror = () => {
                  setPanelDataLoaded(true);
                  toast.info("Ready to create dynamic comic content");
                };
                img.src = imageContent.data.url || imageContent.data.drawingData;
              }
            } else {
              setPanelDataLoaded(true);
            }
          } else {
            setPanelDataLoaded(true);
          }
        } catch (e) {
          console.error("Failed to parse panel data:", e);
          setPanelDataLoaded(true);
        }
      } else {
        setPanelDataLoaded(true);
      }
    }
  }, [panelId, canvasReady, panelDataLoaded]);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frames.length);
    }, 1000 / fps);
    
    return () => clearInterval(interval);
  }, [isPlaying, fps, frames.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'm': setActiveTool('move'); break;
        case 'b': setActiveTool('brush'); break;
        case 'e': setActiveTool('eraser'); break;
        case 'i': setActiveTool('eyedropper'); break;
        case 'u': setActiveTool('shape'); break;
        case 't': setActiveTool('text'); break;
        case 'z': if (e.ctrlKey || e.metaKey) { e.shiftKey ? redo() : undo(); e.preventDefault(); } break;
        case ' ': setIsPlaying(p => !p); e.preventDefault(); break;
        case '[': setBrushSize(s => Math.max(1, s - 2)); break;
        case ']': setBrushSize(s => Math.min(100, s + 2)); break;
        case ',': goToPrevFrame(); break;
        case '.': goToNextFrame(); break;
        case '1': setStudioMode('import'); break;
        case '2': setStudioMode('timeline'); break;
        case '3': setStudioMode('effects'); break;
        case '4': setStudioMode('preview'); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, currentFrameIndex, frames.length]);

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    setFrames(prev => prev.map((f, i) => 
      i === currentFrameIndex ? { ...f, imageData } : f
    ));
  }, [currentFrameIndex]);

  const undo = () => {
    if (historyIndex < 0) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    if (historyIndex > 0) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
        saveCurrentFrame();
      };
      img.src = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
    } else {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      saveCurrentFrame();
      setHistoryIndex(-1);
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
      saveCurrentFrame();
    };
    img.src = history[historyIndex + 1];
    setHistoryIndex(prev => prev + 1);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    setHistory(prev => [...prev.slice(0, historyIndex + 1), canvas.toDataURL()]);
    setHistoryIndex(prev => prev + 1);
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    saveCurrentFrame();
  };

  const addFrame = () => {
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: "",
      duration: 100,
      layers: []
    };
    setFrames(prev => [...prev, newFrame]);
    setCurrentFrameIndex(frames.length);
    
    setTimeout(() => {
      const context = contextRef.current;
      const canvas = canvasRef.current;
      if (context && canvas) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, 0);
  };

  const duplicateFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: canvas.toDataURL('image/png'),
      duration: 100,
      layers: []
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) {
      clearCanvas();
      return;
    }
    
    const newFrames = frames.filter((_, i) => i !== currentFrameIndex);
    setFrames(newFrames);
    setCurrentFrameIndex(Math.min(currentFrameIndex, newFrames.length - 1));
  };

  const goToPrevFrame = () => {
    saveCurrentFrame();
    setCurrentFrameIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextFrame = () => {
    saveCurrentFrame();
    setCurrentFrameIndex(prev => Math.min(frames.length - 1, prev + 1));
  };

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { 
          title, 
          data: { 
            frames, 
            fps, 
            width: 1920, 
            height: 1080,
            panels: comicPanels,
            effects: activeEffects,
          } 
        },
      });
      toast.success("Dynamic comic saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const applyToPanel = () => {
    if (!returnTo || !panelId) {
      toast.error("No panel to apply to");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const animationData = {
      frames: frames.map(f => f.imageData),
      fps,
      currentFrame: canvas.toDataURL('image/png'),
      effects: activeEffects,
      camera: cameraSettings,
    };
    
    sessionStorage.setItem(`panel_animation_${panelId}`, JSON.stringify(animationData));
    toast.success("Dynamic effects applied to panel!");
    navigate(returnTo);
  };

  const handleAIGenerated = (url: string) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveCurrentFrame();
      setShowAIGen(false);
      toast.success("AI image added to canvas");
    };
    img.src = url;
  };

  const handleComicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const context = contextRef.current;
          if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            context.drawImage(img, x, y, img.width * scale, img.height * scale);
            saveCurrentFrame();
            
            toast.success("Comic page imported! Use AI to auto-detect panels.");
            setStudioMode("timeline");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image file (PNG, JPG, or WEBP)");
    }
  };

  const autoPanelDetect = () => {
    toast.success("AI Panel Detection: Analyzing comic layout...");
    setTimeout(() => {
      const mockPanels: ComicPanel[] = [
        { id: "panel_1", imageData: "", bounds: { x: 0, y: 0, width: 960, height: 540 }, layers: [], animations: [] },
        { id: "panel_2", imageData: "", bounds: { x: 960, y: 0, width: 960, height: 540 }, layers: [], animations: [] },
        { id: "panel_3", imageData: "", bounds: { x: 0, y: 540, width: 1920, height: 540 }, layers: [], animations: [] },
      ];
      setComicPanels(mockPanels);
      toast.success(`Detected ${mockPanels.length} panels! Click to edit each.`);
    }, 1500);
  };

  const applyEffect = (effect: EffectPreset) => {
    setActiveEffects(prev => {
      if (prev.find(e => e.id === effect.id)) {
        return prev.filter(e => e.id !== effect.id);
      }
      return [...prev, effect];
    });
    toast.success(`${effect.name} ${activeEffects.find(e => e.id === effect.id) ? 'removed' : 'applied'}`);
  };

  const computeCSSFilters = () => {
    let filters: string[] = [];
    let contrast = 1;
    let saturation = 1;
    let brightness = 1;
    let blur = 0;
    let sepia = 0;
    let grayscale = 0;
    let hueRotate = 0;
    
    activeEffects.forEach(effect => {
      switch (effect.id) {
        case "ink-boost":
          contrast *= (effect.params.contrast as number) || 1.3;
          grayscale = 1;
          break;
        case "anime-tone":
          saturation *= (effect.params.saturation as number) || 1.4;
          brightness *= (effect.params.brightness as number) || 1.1;
          break;
        case "halftone":
          contrast *= (effect.params.contrast as number) || 1.2;
          break;
        case "neon-pop":
          saturation *= (effect.params.saturation as number) || 1.8;
          break;
        case "grunge":
          contrast *= 0.9;
          sepia = 0.3;
          break;
        case "noir":
          grayscale = 1;
          contrast *= (effect.params.contrast as number) || 1.5;
          break;
        case "whip-pan":
          blur = (effect.params.blur as number) * 5 || 4;
          break;
      }
    });
    
    if (contrast !== 1) filters.push(`contrast(${contrast})`);
    if (saturation !== 1) filters.push(`saturate(${saturation})`);
    if (brightness !== 1) filters.push(`brightness(${brightness})`);
    if (blur > 0) filters.push(`blur(${blur}px)`);
    if (sepia > 0) filters.push(`sepia(${sepia})`);
    if (grayscale > 0) filters.push(`grayscale(${grayscale})`);
    if (hueRotate !== 0) filters.push(`hue-rotate(${hueRotate}deg)`);
    
    return filters.length > 0 ? filters.join(' ') : 'none';
  };

  const computeAnimationStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    let transform = '';
    
    activeEffects.forEach(effect => {
      switch (effect.category) {
        case "camera":
          if (effect.id === "zoom-in") {
            transform += ` scale(${effect.params.scale || 1.3})`;
          } else if (effect.id === "zoom-out") {
            transform += ` scale(${effect.params.scale || 0.8})`;
          } else if (effect.id === "pan-left") {
            transform += ` translateX(${effect.params.x || -50}px)`;
          } else if (effect.id === "pan-right") {
            transform += ` translateX(${effect.params.x || 50}px)`;
          }
          break;
        case "vfx":
          if (effect.id.startsWith("shake")) {
            styles.animation = `shake ${1 / ((effect.params.frequency as number) || 30)}s infinite`;
          }
          break;
      }
    });
    
    if (transform) {
      styles.transform = transform.trim();
    }
    
    return styles;
  };

  const applyPanelAnimation = (animId: string) => {
    if (!selectedPanelId) {
      toast.error("Select a panel first");
      return;
    }
    
    const animation: PanelAnimation = {
      type: animId as PanelAnimation["type"],
      params: { intensity: 1, duration: 500 },
      startTime: 0,
      duration: 500,
    };
    
    setComicPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanelId) {
        const exists = panel.animations.find(a => a.type === animId);
        if (exists) {
          return { ...panel, animations: panel.animations.filter(a => a.type !== animId) };
        }
        return { ...panel, animations: [...panel.animations, animation] };
      }
      return panel;
    }));
    
    toast.success(`Animation ${animId} applied to panel`);
  };

  const exportPSDCF = () => {
    const exportData = {
      version: "1.0",
      format: "PSDCF",
      metadata: {
        title,
        creator: "PSCoMiXX Creator",
        timestamp: new Date().toISOString(),
      },
      timeline: {
        frames: frames.map(f => ({
          id: f.id,
          duration: f.duration,
          imageData: f.imageData,
          keyframes: f.keyframes || [],
        })),
        fps,
        totalDuration: (frames.length / fps) * 1000,
      },
      panels: comicPanels,
      effects: activeEffects,
      camera: cameraSettings,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.psdcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to PS Dynamic Comic Format!");
  };

  const bakeTextToCanvas = (textId: string) => {
    const layer = textLayers.find(t => t.id === textId);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!layer || !canvas || !context) return;

    context.font = `${layer.fontSize}px Inter, sans-serif`;
    context.fillStyle = layer.color;
    context.textBaseline = 'top';
    context.fillText(layer.text, layer.x, layer.y);
    
    setTextLayers(prev => prev.filter(t => t.id !== textId));
    setEditingTextId(null);
    saveCurrentFrame();
    toast.success("Text added to canvas");
  };

  const updateTextLayer = (id: string, updates: Partial<{text: string; x: number; y: number; fontSize: number; color: string}>) => {
    setTextLayers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(t => t.id !== id));
    setEditingTextId(null);
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Creating DynaComic project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const renderModeContent = () => {
    switch (studioMode) {
      case "import":
        return (
          <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold mb-2">Import Your Comic</h2>
                <p className="text-zinc-400">Upload completed comic pages, webtoons, or import from other tools</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="border-2 border-dashed border-zinc-700 hover:border-white p-8 text-center cursor-pointer transition-all group">
                  <input type="file" accept="image/*" onChange={handleComicImport} className="hidden" />
                  <FileUp className="w-12 h-12 mx-auto mb-4 text-zinc-500 group-hover:text-white" />
                  <p className="font-bold mb-1">Upload Image</p>
                  <p className="text-xs text-zinc-500">PNG, JPG, WEBP</p>
                </label>
                
                <label className="border-2 border-dashed border-zinc-700 hover:border-white p-8 text-center cursor-pointer transition-all group">
                  <input type="file" accept=".pdf" className="hidden" onChange={() => toast.info("PDF import coming soon!")} />
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-zinc-500 group-hover:text-white" />
                  <p className="font-bold mb-1">Upload PDF</p>
                  <p className="text-xs text-zinc-500">Multi-page comics</p>
                </label>
              </div>
              
              <div className="border border-zinc-800 p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5" /> AI Auto-Detection
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  After importing, AI will automatically detect and slice your comic into:
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-zinc-800 p-3 text-center">
                    <LayoutGrid className="w-5 h-5 mx-auto mb-1" />
                    <span>Panels</span>
                  </div>
                  <div className="bg-zinc-800 p-3 text-center">
                    <Box className="w-5 h-5 mx-auto mb-1" />
                    <span>Characters</span>
                  </div>
                  <div className="bg-zinc-800 p-3 text-center">
                    <Type className="w-5 h-5 mx-auto mb-1" />
                    <span>Bubbles</span>
                  </div>
                </div>
                <button
                  onClick={autoPanelDetect}
                  className="w-full mt-4 py-3 bg-white text-black font-bold hover:bg-zinc-200"
                >
                  <Sparkles className="w-4 h-4 inline mr-2" /> Run AI Panel Detection
                </button>
              </div>
              
              {comicPanels.length > 0 && (
                <div className="border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-green-400 font-bold">
                    <Check className="w-4 h-4 inline mr-2" />
                    {comicPanels.length} panels detected! Switch to Timeline mode to animate.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case "effects":
        return (
          <div className="flex-1 flex bg-zinc-950">
            <div className="w-80 border-r border-zinc-800 overflow-y-auto">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Effects & Filters
                </h3>
              </div>
              
              <div className="p-4 space-y-6">
                <div>
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Filters</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {filterPresets.map(effect => (
                      <button
                        key={effect.id}
                        onClick={() => applyEffect(effect)}
                        className={`p-3 text-left border transition-all ${
                          activeEffects.find(e => e.id === effect.id)
                            ? 'border-white bg-white/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <effect.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">VFX</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {vfxPresets.map(effect => (
                      <button
                        key={effect.id}
                        onClick={() => applyEffect(effect)}
                        className={`p-3 text-left border transition-all ${
                          activeEffects.find(e => e.id === effect.id)
                            ? 'border-white bg-white/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <effect.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Camera</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {cameraPresets.map(effect => (
                      <button
                        key={effect.id}
                        onClick={() => applyEffect(effect)}
                        className={`p-3 text-left border transition-all ${
                          activeEffects.find(e => e.id === effect.id)
                            ? 'border-white bg-white/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <effect.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Transitions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {transitionPresets.map(effect => (
                      <button
                        key={effect.id}
                        onClick={() => applyEffect(effect)}
                        className={`p-3 text-left border transition-all ${
                          activeEffects.find(e => e.id === effect.id)
                            ? 'border-white bg-white/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <effect.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Panel Animations</h4>
                  {comicPanels.length > 0 && (
                    <div className="mb-3 p-2 bg-zinc-800 text-xs">
                      <span className="text-zinc-400">Selected: </span>
                      <select 
                        value={selectedPanelId || ""}
                        onChange={(e) => setSelectedPanelId(e.target.value || null)}
                        className="bg-zinc-700 border border-zinc-600 px-2 py-1 ml-2"
                      >
                        <option value="">None</option>
                        {comicPanels.map(p => (
                          <option key={p.id} value={p.id}>{p.id}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    {panelAnimations.map(anim => (
                      <button
                        key={anim.id}
                        onClick={() => applyPanelAnimation(anim.id)}
                        className={`w-full p-3 text-left border flex items-center gap-3 ${
                          selectedPanelId && comicPanels.find(p => p.id === selectedPanelId)?.animations.find(a => a.type === anim.id)
                            ? 'border-white bg-white/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <anim.icon className="w-5 h-5" />
                        <div>
                          <span className="text-sm font-medium">{anim.name}</span>
                          <p className="text-xs text-zinc-500">{anim.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                  20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
                @keyframes pulse-glow {
                  0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.5); }
                  50% { box-shadow: 0 0 40px rgba(255,255,255,0.8); }
                }
              `}</style>
              <div className="flex-1 flex items-center justify-center p-8">
                <div 
                  className="relative overflow-hidden transition-all duration-300" 
                  style={{ 
                    width: '800px', 
                    height: '450px',
                    filter: computeCSSFilters(),
                    ...computeAnimationStyles(),
                  }}
                >
                  {frames[currentFrameIndex]?.imageData ? (
                    <img 
                      src={frames[currentFrameIndex].imageData}
                      className="w-full h-full object-contain bg-white border-2 border-zinc-700"
                      alt="Effects preview"
                    />
                  ) : (
                    <canvas
                      ref={canvasRef}
                      width={1920}
                      height={1080}
                      className="w-full h-full bg-white border-2 border-zinc-700 pointer-events-none"
                    />
                  )}
                  {activeEffects.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {activeEffects.map(e => (
                        <span key={e.id} className="px-2 py-0.5 bg-white text-black text-xs font-bold">
                          {e.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {activeEffects.find(e => e.id === "glow-aura") && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(255,255,255,0.4)' }} />
                  )}
                  {activeEffects.find(e => e.id === "speedlines") && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute bg-white/30" 
                          style={{ 
                            height: '2px', 
                            width: '100%', 
                            top: `${5 + i * 6}%`,
                            transform: 'translateX(-100%)',
                            animation: `slideIn 0.3s ${i * 0.05}s forwards`,
                          }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-16 border-t border-zinc-800 flex items-center justify-center gap-4 px-4">
                <span className="text-sm text-zinc-500">Active Effects: {activeEffects.length}</span>
                <button
                  onClick={() => setActiveEffects([])}
                  className="px-4 py-2 text-sm border border-zinc-700 hover:border-white"
                >
                  Clear All
                </button>
                <button
                  onClick={() => toast.success("Effects preview playing...")}
                  className="px-4 py-2 text-sm bg-white text-black font-bold flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Preview Effects
                </button>
              </div>
            </div>
          </div>
        );
        
      case "preview":
        return (
          <div className="flex-1 flex flex-col bg-zinc-950">
            <div className="h-12 border-b border-zinc-800 flex items-center justify-center gap-4 px-4">
              <span className="text-sm text-zinc-500">Preview Device:</span>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`px-3 py-1 text-sm flex items-center gap-2 ${previewDevice === "mobile" ? "bg-white text-black" : "border border-zinc-700"}`}
              >
                <Smartphone className="w-4 h-4" /> Mobile
              </button>
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3 py-1 text-sm flex items-center gap-2 ${previewDevice === "desktop" ? "bg-white text-black" : "border border-zinc-700"}`}
              >
                <Monitor className="w-4 h-4" /> Desktop
              </button>
              <div className="w-px h-6 bg-zinc-700" />
              <button
                onClick={() => setIsReaderPreview(!isReaderPreview)}
                className={`px-3 py-1 text-sm flex items-center gap-2 ${isReaderPreview ? "bg-green-500 text-black" : "border border-zinc-700"}`}
              >
                <BookOpen className="w-4 h-4" /> Reader Mode
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-8 bg-zinc-900">
              <div 
                className={`bg-black shadow-2xl overflow-hidden relative ${
                  previewDevice === "mobile" 
                    ? "w-80 h-[640px] rounded-3xl border-8 border-zinc-600" 
                    : "w-full max-w-4xl aspect-video border-4 border-zinc-700"
                }`}
              >
                {previewDevice === "mobile" && (
                  <>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-b-2xl z-10" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-600 rounded-full z-10" />
                  </>
                )}
                <div 
                  className="w-full h-full transition-all duration-300"
                  style={{ 
                    filter: computeCSSFilters(),
                    ...computeAnimationStyles(),
                  }}
                >
                  {frames[currentFrameIndex]?.imageData ? (
                    <img 
                      src={frames[currentFrameIndex].imageData} 
                      className={`w-full h-full bg-white ${
                        previewDevice === "mobile" && isReaderPreview 
                          ? "object-cover" 
                          : "object-contain"
                      }`}
                      alt="Preview"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
                      <div className="text-center">
                        <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No content to preview</p>
                        <p className="text-xs text-zinc-700 mt-1">Import or create content first</p>
                      </div>
                    </div>
                  )}
                </div>
                {isReaderPreview && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <button className="p-2 hover:bg-white/10 rounded">
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <span className="text-xs text-zinc-400">Tap to advance</span>
                      <button className="p-2 hover:bg-white/10 rounded">
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-20 border-t border-zinc-800 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-3 ${isPlaying ? 'bg-white text-black' : 'border border-zinc-700 hover:border-white'}`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all"
                      style={{ width: `${((currentFrameIndex + 1) / frames.length) * 100}%` }}
                    />
                  </div>
                  
                  <span className="text-sm text-zinc-500 w-20 text-right">
                    {currentFrameIndex + 1} / {frames.length}
                  </span>
                </div>
                
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={exportPSDCF}
                    className="px-6 py-2 bg-white text-black font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export PSDCF
                  </button>
                  <button
                    onClick={() => toast.success("Sending to PS Reader...")}
                    className="px-6 py-2 border border-white text-white font-bold flex items-center gap-2 hover:bg-white hover:text-black"
                  >
                    <Share2 className="w-4 h-4" /> Send to Reader
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-950 text-white">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-zinc-800 border border-transparent hover:border-zinc-700" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-display font-bold text-lg bg-transparent border-none outline-none hover:bg-zinc-800 px-2 py-1"
                data-testid="input-motion-title"
              />
            </div>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-1">DynaComic Pro</span>
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-800 p-1">
            {[
              { id: "import" as StudioMode, label: "Import", icon: FileUp, key: "1" },
              { id: "timeline" as StudioMode, label: "Timeline", icon: Film, key: "2" },
              { id: "effects" as StudioMode, label: "Effects", icon: Sparkles, key: "3" },
              { id: "preview" as StudioMode, label: "Preview", icon: Eye, key: "4" },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setStudioMode(mode.id)}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition-all ${
                  studioMode === mode.id
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={`${mode.label} (${mode.key})`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={undo} className="p-2 hover:bg-zinc-800" title="Undo (Ctrl+Z)">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} className="p-2 hover:bg-zinc-800" title="Redo (Ctrl+Shift+Z)">
              <Redo className="w-4 h-4" />
            </button>
            
            <div className="w-px h-6 bg-zinc-700 mx-2" />
            
            {panelId && (
              <button
                onClick={applyToPanel}
                className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200"
              >
                <Check className="w-4 h-4" /> Apply to Panel
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            
            <button 
              onClick={exportPSDCF}
              className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200" 
              data-testid="button-export"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </header>

        {studioMode === "timeline" ? (
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-16 border-r border-zinc-800 flex flex-col items-center py-4 gap-1 bg-zinc-900">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`p-3 w-12 h-12 flex items-center justify-center transition-all ${
                    activeTool === tool.id 
                      ? 'bg-white text-black' 
                      : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title={`${tool.name} (${tool.shortcut})`}
                >
                  <tool.icon className="w-5 h-5" />
                </button>
              ))}
              
              <div className="w-10 h-px bg-zinc-700 my-2" />
              
              <button
                onClick={() => setShowAIGen(true)}
                className="p-3 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="AI Generate"
              >
                <Wand2 className="w-5 h-5" />
              </button>
              
              <label className="p-3 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Upload Image">
                <input type="file" accept="image/*" onChange={handleComicImport} className="hidden" />
                <Upload className="w-5 h-5" />
              </label>
              
              <div className="flex-1" />
              
              <div className="space-y-2 pb-2">
                <div className="grid grid-cols-2 gap-1">
                  {["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ff6600", "#9900ff"].map(color => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-5 h-5 border ${brushColor === color ? 'border-white ring-1 ring-white' : 'border-zinc-600'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div 
                  className="w-10 h-10 border-2 border-zinc-600 cursor-pointer relative mx-auto"
                  style={{ backgroundColor: brushColor }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = brushColor;
                    input.onchange = (e) => setBrushColor((e.target as HTMLInputElement).value);
                    input.click();
                  }}
                  title="Pick custom color"
                >
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-zinc-600" />
                </div>
              </div>
            </aside>

            <div className="flex-1 flex flex-col">
              <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-900/50">
                {(activeTool === 'brush' || activeTool === 'eraser') && (
                  <>
                    {activeTool === 'brush' && (
                      <>
                        <span className="text-xs text-zinc-500">Brush:</span>
                        <div className="flex gap-1">
                          {brushTypes.map(brush => (
                            <button
                              key={brush.id}
                              onClick={() => {
                                setActiveBrush(brush.id);
                                setBrushSize(brush.width);
                                setBrushOpacity(brush.opacity);
                              }}
                              className={`px-2 py-1 text-xs ${
                                activeBrush === brush.id 
                                  ? 'bg-white text-black' 
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {brush.name}
                            </button>
                          ))}
                        </div>
                        <div className="w-px h-5 bg-zinc-700" />
                      </>
                    )}
                    
                    <span className="text-xs text-zinc-500">Size:</span>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-24 accent-white"
                    />
                    <span className="text-xs w-8 text-zinc-400">{brushSize}px</span>
                    
                    {activeTool === 'brush' && (
                      <>
                        <div className="w-px h-5 bg-zinc-700" />
                        <span className="text-xs text-zinc-500">Opacity:</span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={brushOpacity}
                          onChange={(e) => setBrushOpacity(Number(e.target.value))}
                          className="w-20 accent-white"
                        />
                        <span className="text-xs w-8 text-zinc-400">{brushOpacity}%</span>
                      </>
                    )}
                  </>
                )}
                
                <div className="flex-1" />
                
                <button
                  onClick={() => setShowEffectsPanel(!showEffectsPanel)}
                  className={`px-2 py-1 text-xs flex items-center gap-1 ${showEffectsPanel ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  <Sparkles className="w-3 h-3" /> Quick FX
                </button>
                
                <button
                  onClick={() => setPressureEnabled(!pressureEnabled)}
                  className={`px-2 py-1 text-xs ${pressureEnabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  Pressure
                </button>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-1 hover:bg-zinc-800">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1 hover:bg-zinc-800">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <main className="flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center relative">
                <div 
                  className="absolute inset-0 pointer-events-none opacity-5"
                  style={{ 
                    backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", 
                    backgroundSize: "50px 50px"
                  }} 
                />
                
                {showEffectsPanel && (
                  <div className="absolute top-2 right-2 z-30 w-64 bg-zinc-900 border border-zinc-700 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">Quick Effects</span>
                      <button onClick={() => setShowEffectsPanel(false)} className="p-1 hover:bg-zinc-800">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[...vfxPresets.slice(0, 6)].map(effect => (
                        <button
                          key={effect.id}
                          onClick={() => applyEffect(effect)}
                          className={`p-2 text-center border text-xs ${
                            activeEffects.find(e => e.id === effect.id)
                              ? 'border-white bg-white/10'
                              : 'border-zinc-700 hover:border-zinc-500'
                          }`}
                        >
                          <effect.icon className="w-4 h-4 mx-auto mb-1" />
                          {effect.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom / 100})` }}>
                  {onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1].imageData && (
                    <img 
                      src={frames[currentFrameIndex - 1].imageData}
                      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none object-contain"
                      alt="Previous frame"
                    />
                  )}
                  {onionSkin && currentFrameIndex > 1 && frames[currentFrameIndex - 2].imageData && (
                    <img 
                      src={frames[currentFrameIndex - 2].imageData}
                      className="absolute inset-0 w-full h-full opacity-10 pointer-events-none object-contain"
                      alt="Frame -2"
                    />
                  )}
                  <div 
                    className="relative" 
                    style={{ width: '960px', height: '540px', cursor: activeTool === 'brush' || activeTool === 'eraser' ? 'crosshair' : activeTool === 'text' ? 'text' : 'default', touchAction: 'none' }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      
                      if (e.button !== 0) return;
                      
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      
                      const rect = canvas.getBoundingClientRect();
                      const scaleX = canvas.width / rect.width;
                      const scaleY = canvas.height / rect.height;
                      const x = (e.clientX - rect.left) * scaleX;
                      const y = (e.clientY - rect.top) * scaleY;
                      
                      if (activeTool === 'text') {
                        const newTextLayer = {
                          id: `text_${Date.now()}`,
                          text: "Enter text",
                          x, y,
                          fontSize: brushSize * 4,
                          color: brushColor,
                          editing: true
                        };
                        setTextLayers(prev => [...prev, newTextLayer]);
                        setEditingTextId(newTextLayer.id);
                        return;
                      }
                      
                      if (activeTool !== 'brush' && activeTool !== 'eraser') return;
                      
                      let ctx = contextRef.current;
                      if (!ctx) {
                        ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.lineCap = 'round';
                          ctx.lineJoin = 'round';
                          contextRef.current = ctx;
                        }
                      }
                      if (!ctx) return;
                      
                      isDrawingRef.current = true;
                      lastPointRef.current = { x, y };
                      setIsDrawing(true);
                      setLastPoint({ x, y });
                      
                      ctx.fillStyle = activeTool === 'eraser' ? '#ffffff' : brushColor;
                      ctx.beginPath();
                      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
                      ctx.fill();
                      
                      setHistory(prev => [...prev.slice(0, historyIndex + 1), canvas.toDataURL()]);
                      setHistoryIndex(prev => prev + 1);
                    }}
                    onPointerMove={(e) => {
                      if (!isDrawingRef.current || !lastPointRef.current) return;
                      if (activeTool !== 'brush' && activeTool !== 'eraser') return;
                      
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      
                      const rect = canvas.getBoundingClientRect();
                      const scaleX = canvas.width / rect.width;
                      const scaleY = canvas.height / rect.height;
                      const x = (e.clientX - rect.left) * scaleX;
                      const y = (e.clientY - rect.top) * scaleY;
                      
                      let ctx = contextRef.current;
                      if (!ctx) {
                        ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.lineCap = 'round';
                          ctx.lineJoin = 'round';
                          contextRef.current = ctx;
                        }
                      }
                      if (!ctx) return;
                      
                      const isErasing = activeTool === 'eraser';
                      const lp = lastPointRef.current;
                      
                      ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
                      ctx.globalAlpha = isErasing ? 1 : brushOpacity / 100;
                      ctx.strokeStyle = brushColor;
                      ctx.lineWidth = isErasing ? brushSize * 3 : brushSize;
                      
                      ctx.beginPath();
                      ctx.moveTo(lp.x, lp.y);
                      ctx.lineTo(x, y);
                      ctx.stroke();
                      
                      ctx.globalCompositeOperation = 'source-over';
                      ctx.globalAlpha = 1;
                      
                      lastPointRef.current = { x, y };
                      setLastPoint({ x, y });
                    }}
                    onPointerUp={(e) => {
                      try {
                        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                      } catch (_) {}
                      if (isDrawingRef.current) {
                        isDrawingRef.current = false;
                        lastPointRef.current = null;
                        setIsDrawing(false);
                        setLastPoint(null);
                        saveCurrentFrame();
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (isDrawingRef.current) {
                        isDrawingRef.current = false;
                        lastPointRef.current = null;
                        setIsDrawing(false);
                        setLastPoint(null);
                        saveCurrentFrame();
                      }
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={1920}
                      height={1080}
                      className="bg-white shadow-2xl border-2 border-zinc-700 block absolute inset-0 pointer-events-none"
                      style={{ 
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    {textLayers.map(layer => {
                      const canvas = canvasRef.current;
                      if (!canvas) return null;
                      const rect = canvas.getBoundingClientRect();
                      const scaleX = rect.width / 1920;
                      const scaleY = rect.height / 1080;
                      return (
                        <div
                          key={layer.id}
                          className={`absolute group ${editingTextId === layer.id ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/50'}`}
                          style={{
                            left: layer.x * scaleX,
                            top: layer.y * scaleY,
                            fontSize: layer.fontSize * scaleX,
                            color: layer.color,
                            fontFamily: 'Inter, sans-serif',
                            cursor: 'move',
                            padding: '4px',
                            minWidth: '100px',
                            zIndex: 20,
                          }}
                          onClick={(e) => { e.stopPropagation(); setEditingTextId(layer.id); }}
                        >
                          {editingTextId === layer.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={layer.text}
                                onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') bakeTextToCanvas(layer.id);
                                  if (e.key === 'Escape') deleteTextLayer(layer.id);
                                }}
                                className="bg-black/80 text-white px-2 py-1 text-sm border border-white outline-none"
                                autoFocus
                                style={{ fontSize: Math.max(12, layer.fontSize * scaleX * 0.6) }}
                              />
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => bakeTextToCanvas(layer.id)}
                                  className="px-2 py-0.5 bg-white text-black text-xs"
                                >
                                  Apply
                                </button>
                                <button 
                                  onClick={() => deleteTextLayer(layer.id)}
                                  className="px-2 py-0.5 bg-red-500 text-white text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="pointer-events-none">{layer.text}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </main>

              <div className="h-14 border-t border-zinc-800 bg-zinc-900 flex items-center px-3 gap-2 overflow-x-auto">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={goToPrevFrame} className="p-1.5 hover:bg-zinc-800" title="Previous Frame (,)">
                    <SkipBack className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-1.5 ${isPlaying ? 'bg-white text-black' : 'hover:bg-zinc-800'}`}
                    title="Play/Pause (Space)"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button onClick={goToNextFrame} className="p-1.5 hover:bg-zinc-800" title="Next Frame (.)">
                    <SkipForward className="w-3 h-3" />
                  </button>
                  <button onClick={duplicateFrame} className="p-1.5 hover:bg-zinc-800" title="Duplicate Frame">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={deleteFrame} className="p-1.5 hover:bg-zinc-800 hover:text-red-400" title="Delete Frame">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] text-zinc-500">FPS:</span>
                  <input
                    type="number"
                    value={fps}
                    onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value))))}
                    className="w-10 bg-zinc-800 border border-zinc-700 px-1 py-0.5 text-[10px] text-center"
                    min={1}
                    max={60}
                  />
                  <button
                    onClick={() => setOnionSkin(!onionSkin)}
                    className={`p-1 text-[10px] ${onionSkin ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                    title="Toggle Onion Skin"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="w-px h-8 bg-zinc-700 flex-shrink-0" />
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(index); }}
                    className={`flex-shrink-0 w-20 h-12 border-2 relative group transition-all cursor-pointer ${
                      index === currentFrameIndex 
                        ? 'border-white shadow-lg shadow-white/20' 
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {frame.imageData ? (
                      <img src={frame.imageData} className="w-full h-full object-cover bg-white" alt={`Frame ${index + 1}`} />
                    ) : (
                      <div className="w-full h-full bg-white" />
                    )}
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/80 text-white">
                      {index + 1}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentFrameIndex(index); deleteFrame(); }}
                      className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addFrame}
                  className="flex-shrink-0 w-20 h-12 border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
            </div>

            <aside className="w-48 border-l border-zinc-800 bg-zinc-900 flex flex-col">
              <div className="p-3 border-b border-zinc-800 font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> Layers
              </div>
              <div className="flex-1 p-2 space-y-1 overflow-auto">
                <div className="p-2 bg-zinc-800 flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-zinc-400" />
                  <span className="flex-1">Layer 1</span>
                </div>
              </div>
              
              <div className="p-3 border-t border-zinc-800 font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" /> Properties
              </div>
              <div className="p-3 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Canvas Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value="1920" className="w-full bg-zinc-800 border border-zinc-700 p-2 text-xs" readOnly />
                    <input type="number" value="1080" className="w-full bg-zinc-800 border border-zinc-700 p-2 text-xs" readOnly />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Duration</label>
                  <p className="text-sm font-mono">{(frames.length / fps).toFixed(2)}s @ {fps}fps</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Active FX</label>
                  <p className="text-sm font-mono">{activeEffects.length} effects</p>
                </div>
                
                <button onClick={clearCanvas} className="w-full py-2 bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 flex items-center justify-center gap-2">
                  <RotateCcw className="w-3 h-3" /> Clear Frame
                </button>
              </div>
            </aside>
          </div>
        ) : (
          renderModeContent()
        )}
      </div>

      {showAIGen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 w-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Generate
              </h3>
              <button onClick={() => setShowAIGen(false)} className="p-2 hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AIGenerator type="motion" onImageGenerated={handleAIGenerated} />
          </div>
        </div>
      )}
    </Layout>
  );
}
