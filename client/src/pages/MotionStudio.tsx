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
  Layers
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface Frame {
  id: string;
  imageData: string;
  duration: number;
}

interface AnimationData {
  frames: Frame[];
  fps: number;
  width: number;
  height: number;
}

const brushTypes = [
  { id: "brush", name: "Brush", width: 8 },
  { id: "pencil", name: "Pencil", width: 2 },
  { id: "ink", name: "Ink", width: 4 },
  { id: "marker", name: "Marker", width: 12 },
  { id: "airbrush", name: "Airbrush", width: 20 },
  { id: "calligraphy", name: "Calligraphy", width: 6 },
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
    { id: "frame_1", imageData: "", duration: 100 }
  ]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [onionSkin, setOnionSkin] = useState(true);
  
  const [activeBrush, setActiveBrush] = useState("pencil");
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [isEraser, setIsEraser] = useState(false);
  const [pressureEnabled, setPressureEnabled] = useState(true);
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [title, setTitle] = useState("Untitled Animation");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
        data: { frames: [], fps: 12, width: 800, height: 600 },
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
    
    canvas.width = 800;
    canvas.height = 600;
    
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
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const context = contextRef.current;
    const brush = brushTypes.find(b => b.id === activeBrush) || brushTypes[0];
    
    context.globalAlpha = brushOpacity / 100;
    context.strokeStyle = isEraser ? '#ffffff' : brushColor;
    context.lineWidth = isEraser ? brushSize * 3 : brushSize;
    
    if (activeBrush === 'calligraphy') {
      context.lineWidth = brushSize;
      const angle = Math.atan2(coords.y - lastPoint.y, coords.x - lastPoint.x);
      context.lineWidth = brushSize * (1 + Math.abs(Math.sin(angle)));
    }
    
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(coords.x, coords.y);
    context.stroke();
    
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
      duration: 100
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
      duration: 100
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

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { 
          title, 
          data: { frames, fps, width: 800, height: 600 } 
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

  const closeAndReturn = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('/');
    }
  };

  if (isCreating) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Creating animation project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-zinc-900 text-white">
        <header className="h-12 border-b border-zinc-700 flex items-center justify-between px-4 bg-zinc-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white text-black font-mono font-bold text-sm">
              ANIMATION MODE
            </div>
            <button
              onClick={() => setPressureEnabled(!pressureEnabled)}
              className={`px-3 py-1 text-xs font-mono border ${pressureEnabled ? 'border-white bg-white/10' : 'border-zinc-600'}`}
            >
              Pressure {pressureEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <span className="text-xs font-mono text-zinc-400">
              Frame {currentFrameIndex + 1} / {frames.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={undo} className="p-2 hover:bg-zinc-700 text-zinc-300 hover:text-white" title="Undo">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} className="p-2 hover:bg-zinc-700 text-zinc-300 hover:text-white" title="Redo">
              <Redo className="w-4 h-4" />
            </button>
            <button onClick={clearCanvas} className="p-2 hover:bg-zinc-700 text-zinc-300 hover:text-white" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="w-px h-6 bg-zinc-600 mx-2" />
            
            {panelId && (
              <button
                onClick={applyToPanel}
                className="px-4 py-1.5 bg-white text-black text-sm font-bold flex items-center gap-2 hover:bg-gray-200"
              >
                <Check className="w-4 h-4" /> Apply to Panel
              </button>
            )}
            
            <button
              onClick={closeAndReturn}
              className="p-2 hover:bg-zinc-700"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="h-10 border-b border-zinc-700 flex items-center px-4 gap-2 bg-zinc-800">
          <span className="text-xs text-zinc-400 mr-2">Brush:</span>
          {brushTypes.map(brush => (
            <button
              key={brush.id}
              onClick={() => { setActiveBrush(brush.id); setIsEraser(false); }}
              className={`px-3 py-1 text-xs border ${activeBrush === brush.id && !isEraser ? 'border-white bg-white/20' : 'border-zinc-600 hover:border-zinc-500'}`}
            >
              {brush.name}
            </button>
          ))}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`px-3 py-1 text-xs border ${isEraser ? 'border-white bg-white/20' : 'border-zinc-600 hover:border-zinc-500'}`}
          >
            Eraser
          </button>
          
          <div className="w-px h-6 bg-zinc-600 mx-2" />
          
          <span className="text-xs text-zinc-400">Size:</span>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 accent-white"
          />
          <span className="text-xs w-8">{brushSize}px</span>
          
          <div className="w-px h-6 bg-zinc-600 mx-2" />
          
          <span className="text-xs text-zinc-400">Color:</span>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="w-8 h-6 border border-zinc-600 bg-transparent cursor-pointer"
          />
          
          <div className="w-px h-6 bg-zinc-600 mx-2" />
          
          <span className="text-xs text-zinc-400">Opacity:</span>
          <input
            type="range"
            min="10"
            max="100"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(Number(e.target.value))}
            className="w-20 accent-white"
          />
          <span className="text-xs w-10">{brushOpacity}%</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-zinc-900">
          <div className="relative">
            {onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1].imageData && (
              <img 
                src={frames[currentFrameIndex - 1].imageData}
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                alt="Previous frame"
              />
            )}
            <canvas
              ref={canvasRef}
              className="bg-white shadow-2xl cursor-crosshair"
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 280px)' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="h-10 border-t border-zinc-700 flex items-center px-4 gap-4 bg-zinc-800">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-700"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          
          <button onClick={addFrame} className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-700">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Frame</span>
          </button>
          
          <button onClick={duplicateFrame} className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-700">
            <Copy className="w-4 h-4" />
            <span className="text-sm">Duplicate</span>
          </button>
          
          <button onClick={deleteFrame} className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-700">
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Delete</span>
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnionSkin(!onionSkin)}
              className={`flex items-center gap-2 px-3 py-1 ${onionSkin ? 'bg-white/10' : ''} hover:bg-zinc-700`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">Onion Skin</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">FPS:</span>
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-20 accent-white"
            />
            <span className="text-xs w-6">{fps}</span>
          </div>
        </div>

        <div className="h-24 border-t border-zinc-700 bg-zinc-800 flex items-center px-4 gap-2 overflow-x-auto">
          {frames.map((frame, index) => (
            <button
              key={frame.id}
              onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(index); }}
              className={`flex-shrink-0 w-20 h-16 border-2 relative ${
                index === currentFrameIndex ? 'border-white' : 'border-zinc-600 hover:border-zinc-500'
              }`}
            >
              {frame.imageData ? (
                <img src={frame.imageData} className="w-full h-full object-cover" alt={`Frame ${index + 1}`} />
              ) : (
                <div className="w-full h-full bg-white" />
              )}
              <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-black/50 text-white">
                {index + 1}
              </span>
            </button>
          ))}
          <button
            onClick={addFrame}
            className="flex-shrink-0 w-20 h-16 border-2 border-dashed border-zinc-600 hover:border-zinc-500 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-zinc-500" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
