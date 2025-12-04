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
  { id: "brush", name: "Brush", icon: PenTool, width: 8, opacity: 100 },
  { id: "pencil", name: "Pencil", icon: Pencil, width: 2, opacity: 100 },
  { id: "ink", name: "Ink", icon: PenTool, width: 4, opacity: 100 },
  { id: "marker", name: "Marker", icon: PenTool, width: 12, opacity: 80 },
  { id: "airbrush", name: "Airbrush", icon: PenTool, width: 20, opacity: 40 },
  { id: "calligraphy", name: "Calli", icon: PenTool, width: 6, opacity: 100 },
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = 1920;
    canvas.height = 1080;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    
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
  }, [currentFrameIndex]);

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

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    
    const coords = getCoordinates(e);
    if (!coords || !contextRef.current) return;
    
    setIsDrawing(true);
    setLastPoint(coords);
    
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), canvas.toDataURL()]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint || !contextRef.current) return;
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const context = contextRef.current;
    const isErasing = activeTool === 'eraser';
    
    context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    context.globalAlpha = isErasing ? 1 : brushOpacity / 100;
    context.strokeStyle = brushColor;
    context.lineWidth = isErasing ? brushSize * 3 : brushSize;
    
    if (activeBrush === 'calligraphy' && !isErasing) {
      const angle = Math.atan2(coords.y - lastPoint.y, coords.x - lastPoint.x);
      context.lineWidth = brushSize * (1 + Math.abs(Math.sin(angle)));
    }
    
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(coords.x, coords.y);
    context.stroke();
    
    context.globalCompositeOperation = 'source-over';
    
    setLastPoint(coords);
  };

  const stopDrawing = () => {
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
            
            <div 
              className="w-10 h-10 border-2 border-zinc-600 cursor-pointer relative"
              style={{ backgroundColor: brushColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = brushColor;
                input.onchange = (e) => setBrushColor((e.target as HTMLInputElement).value);
                input.click();
              }}
            >
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-zinc-600" />
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
                            onClick={() => setActiveBrush(brush.id)}
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

            <main className="flex-1 bg-zinc-950 overflow-auto flex items-center justify-center p-8 relative">
              <div 
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{ 
                  backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", 
                  backgroundSize: "50px 50px"
                }} 
              />
              
              <div className="relative" style={{ transform: `scale(${zoom / 100})` }}>
                {onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1].imageData && (
                  <img 
                    src={frames[currentFrameIndex - 1].imageData}
                    className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                    alt="Previous frame"
                  />
                )}
                {onionSkin && currentFrameIndex > 1 && frames[currentFrameIndex - 2].imageData && (
                  <img 
                    src={frames[currentFrameIndex - 2].imageData}
                    className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
                    alt="Frame -2"
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="bg-white shadow-2xl"
                  style={{ 
                    cursor: activeTool === 'brush' || activeTool === 'eraser' ? 'crosshair' : 'default',
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 300px)'
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </main>

            <div className="h-12 border-t border-zinc-800 flex items-center px-4 gap-4 bg-zinc-900">
              <div className="flex items-center gap-2">
                <button onClick={goToPrevFrame} className="p-2 hover:bg-zinc-800" title="Previous Frame (,)">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 ${isPlaying ? 'bg-white text-black' : 'hover:bg-zinc-800'}`}
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={goToNextFrame} className="p-2 hover:bg-zinc-800" title="Next Frame (.)">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-px h-6 bg-zinc-700" />
              
              <button onClick={addFrame} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2">
                <Plus className="w-3 h-3" /> Add Frame
              </button>
              <button onClick={duplicateFrame} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2">
                <Copy className="w-3 h-3" /> Duplicate
              </button>
              <button onClick={deleteFrame} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              
              <div className="flex-1" />
              
              <button
                onClick={() => setOnionSkin(!onionSkin)}
                className={`px-3 py-1.5 text-xs flex items-center gap-2 ${onionSkin ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              >
                {onionSkin ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Onion Skin
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">FPS:</span>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-20 accent-white"
                />
                <span className="text-xs w-6">{fps}</span>
              </div>
              
              <span className="text-xs font-mono text-zinc-500">
                Frame {currentFrameIndex + 1} / {frames.length}
              </span>
            </div>

            <div className="h-24 border-t border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2 overflow-x-auto">
              {frames.map((frame, index) => (
                <div
                  key={frame.id}
                  onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(index); }}
                  className={`flex-shrink-0 w-28 h-16 border-2 relative group transition-all cursor-pointer ${
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
                  <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-black/80 text-white py-0.5">
                    {index + 1}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentFrameIndex(index); deleteFrame(); }}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={addFrame}
                className="flex-shrink-0 w-28 h-16 border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center"
              >
                <Plus className="w-6 h-6 text-zinc-600" />
              </button>
            </div>
          </div>

          <aside className="w-64 border-l border-zinc-800 bg-zinc-900 flex flex-col">
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
