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
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { AIGenerator } from "@/components/tools/AIGenerator";

interface Frame {
  id: string;
  imageData: string;
  duration: number;
  layers: Layer[];
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  imageData: string;
}

interface AnimationData {
  frames: Frame[];
  fps: number;
  width: number;
  height: number;
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
  
  const [title, setTitle] = useState("Untitled Animation");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const [textLayers, setTextLayers] = useState<{id: string; text: string; x: number; y: number; fontSize: number; color: string; editing: boolean}[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const currentFrame = frames[currentFrameIndex];

  useEffect(() => {
    const creatingFlag = sessionStorage.getItem('motion_creating');
    if (!projectId && !creatingFlag && !createProject.isPending && !panelId) {
      sessionStorage.setItem('motion_creating', 'true');
      setIsCreating(true);
      createProject.mutateAsync({
        title: "Untitled Animation",
        type: "motion",
        status: "draft",
        data: { frames: [], fps: 12, width: 1920, height: 1080 },
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
    }
  }, [project]);

  // Initialize canvas context once on mount
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
    contextRef.current = context;
    setCanvasReady(true);
  }, []);

  // Load frame content when frame changes
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
          setTitle(`Panel ${panelNumber} - Motion Edit`);
          
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
                  toast.success("Panel loaded - draw and animate, then Apply to Panel");
                };
                img.onerror = () => {
                  setPanelDataLoaded(true);
                  toast.info("Ready to draw - create your animation then Apply to Panel");
                };
                img.src = imageContent.data.url || imageContent.data.drawingData;
              }
            } else {
              setPanelDataLoaded(true);
              toast.info("Ready to draw - create your animation then Apply to Panel");
            }
          } else {
            setPanelDataLoaded(true);
            toast.info("Ready to draw - create your animation then Apply to Panel");
          }
        } catch (e) {
          console.error("Failed to parse panel data:", e);
          setPanelDataLoaded(true);
        }
      } else {
        setPanelDataLoaded(true);
        toast.info("Ready to create animation for panel");
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

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLCanvasElement;
    target.setPointerCapture(e.pointerId);
    
    const coords = getCoordinates(e);
    if (!coords) {
      console.log("No coords");
      return;
    }

    if (activeTool === 'text') {
      const newTextLayer = {
        id: `text_${Date.now()}`,
        text: "Enter text",
        x: coords.x,
        y: coords.y,
        fontSize: brushSize * 4,
        color: brushColor,
        editing: true
      };
      setTextLayers(prev => [...prev, newTextLayer]);
      setEditingTextId(newTextLayer.id);
      toast.success("Click on text to edit, press Enter to confirm");
      return;
    }
    
    if (activeTool !== 'brush' && activeTool !== 'eraser') {
      console.log("Tool not brush/eraser:", activeTool);
      return;
    }
    
    // Re-initialize context if null
    if (!contextRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          contextRef.current = ctx;
        }
      }
    }
    
    if (!contextRef.current) {
      console.log("No context ref");
      return;
    }
    
    setIsDrawing(true);
    setLastPoint({ x: coords.x, y: coords.y });
    
    // Draw a single point for immediate feedback
    const context = contextRef.current;
    context.fillStyle = brushColor;
    context.beginPath();
    context.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
    
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), canvas.toDataURL()]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint) return;
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    // Ensure context is available
    let context = contextRef.current;
    if (!context) {
      const canvas = canvasRef.current;
      if (canvas) {
        context = canvas.getContext('2d');
        if (context) {
          context.lineCap = 'round';
          context.lineJoin = 'round';
          contextRef.current = context;
        }
      }
    }
    if (!context) return;
    const isErasing = activeTool === 'eraser';
    const pressure = coords.pressure;
    
    context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    context.globalAlpha = isErasing ? 1 : brushOpacity / 100;
    context.strokeStyle = brushColor;
    
    const pressureAdjustedSize = isErasing 
      ? brushSize * 3 * pressure 
      : brushSize * (0.5 + pressure * 0.8);
    context.lineWidth = Math.max(1, pressureAdjustedSize);
    
    if (activeBrush === 'airbrush' && !isErasing) {
      context.fillStyle = brushColor;
      const density = Math.floor(25 * pressure);
      const radius = brushSize * 1.5 * pressure;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = coords.x + Math.cos(angle) * distance;
        const y = coords.y + Math.sin(angle) * distance;
        context.beginPath();
        context.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
        context.fill();
      }
    } else if (activeBrush === 'calligraphy' && !isErasing) {
      const angle = Math.atan2(coords.y - lastPoint.y, coords.x - lastPoint.x);
      context.lineWidth = pressureAdjustedSize * (1 + Math.abs(Math.sin(angle)));
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(coords.x, coords.y);
      context.stroke();
    } else if (activeBrush === 'marker' && !isErasing) {
      context.globalAlpha = (brushOpacity / 100) * 0.6 * pressure;
      context.lineWidth = pressureAdjustedSize * 1.5;
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(coords.x, coords.y);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(coords.x, coords.y);
      context.stroke();
    }
    
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    
    setLastPoint({ x: coords.x, y: coords.y });
  };

  const stopDrawing = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      saveCurrentFrame();
    }
  };

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
          data: { frames, fps, width: 1920, height: 1080 } 
        },
      });
      toast.success("Animation saved");
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
      currentFrame: canvas.toDataURL('image/png')
    };
    
    sessionStorage.setItem(`panel_animation_${panelId}`, JSON.stringify(animationData));
    toast.success("Animation applied to panel!");
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
            <p className="text-zinc-400">Creating animation project...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
            <span className="text-xs font-mono text-zinc-500">Motion Studio</span>
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
            
            <button className="px-4 py-2 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-zinc-200" data-testid="button-export">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </header>

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
            
            <button
              className="p-3 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              title="Upload Image"
            >
              <Upload className="w-5 h-5" />
            </button>
            
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
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="relative" style={{ width: '960px', height: '540px' }}>
                      <canvas
                        ref={canvasRef}
                        width={1920}
                        height={1080}
                        className="bg-white shadow-2xl border-2 border-zinc-700 block absolute inset-0"
                        style={{ 
                          cursor: activeTool === 'brush' || activeTool === 'eraser' ? 'crosshair' : activeTool === 'text' ? 'text' : 'default',
                          width: '100%',
                          height: '100%',
                          touchAction: 'none',
                          zIndex: 10,
                        }}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        onPointerCancel={stopDrawing}
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
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                  <ContextMenuItem onClick={() => setActiveTool("brush")} className="hover:bg-zinc-800 cursor-pointer">
                    <Pencil className="w-4 h-4 mr-2" /> Brush <ContextMenuShortcut>B</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("eraser")} className="hover:bg-zinc-800 cursor-pointer">
                    <Eraser className="w-4 h-4 mr-2" /> Eraser <ContextMenuShortcut>E</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setActiveTool("text")} className="hover:bg-zinc-800 cursor-pointer">
                    <Type className="w-4 h-4 mr-2" /> Add Text <ContextMenuShortcut>T</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setShowAIGen(true)} className="hover:bg-zinc-800 cursor-pointer">
                    <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={addFrame} className="hover:bg-zinc-800 cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" /> Add Frame
                  </ContextMenuItem>
                  <ContextMenuItem onClick={duplicateFrame} className="hover:bg-zinc-800 cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" /> Duplicate Frame
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-zinc-700" />
                  <ContextMenuItem onClick={() => setOnionSkin(!onionSkin)} className="hover:bg-zinc-800 cursor-pointer">
                    <Layers className="w-4 h-4 mr-2" /> {onionSkin ? "Hide" : "Show"} Onion Skin
                  </ContextMenuItem>
                  <ContextMenuItem onClick={undo} className="hover:bg-zinc-800 cursor-pointer">
                    <Undo className="w-4 h-4 mr-2" /> Undo <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={redo} className="hover:bg-zinc-800 cursor-pointer">
                    <Redo className="w-4 h-4 mr-2" /> Redo <ContextMenuShortcut>Ctrl+Shift+Z</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
                </ContextMenu>
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
              
              <button onClick={clearCanvas} className="w-full py-2 bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 flex items-center justify-center gap-2">
                <RotateCcw className="w-3 h-3" /> Clear Frame
              </button>
            </div>
          </aside>
        </div>
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
