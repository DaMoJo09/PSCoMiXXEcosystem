import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, 
  Plus, Trash2, Copy, Save, Download, Upload,
  Wand2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize2,
  Sparkles, Film, Music,
  Eye, EyeOff, Lock, Unlock,
  X, Pen, Eraser, MousePointer, Undo2, Redo2,
  Circle, Square, Minus, ArrowRight, PenTool, Pencil,
  Palette, Type, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";

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

interface Frame {
  id: string;
  imageData: string;
  vectorPaths: VectorPath[];
  duration: number;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(10000);
  const [zoom, setZoom] = useState(100);
  
  // Frame state
  const [frames, setFrames] = useState<Frame[]>([
    { id: "frame_1", imageData: "", vectorPaths: [], duration: 1000 }
  ]);
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
  const [brushColor, setBrushColor] = useState("#ffffff");
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
    context.fillStyle = '#0a0a0a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = context;
    
    saveToHistory();
  }, []);

  // Load frame image when switching frames
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
      context.fillStyle = '#0a0a0a';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Load vector paths for this frame
    setVectorPaths(currentFrame?.vectorPaths || []);
  }, [currentFrameIndex, frames]);

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
    
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setVectorPaths([]);
    saveToHistory();
    toast.success("Canvas cleared");
  }, [saveToHistory]);

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    setFrames(prev => prev.map((f, i) => 
      i === currentFrameIndex ? { ...f, imageData, vectorPaths } : f
    ));
  }, [currentFrameIndex, vectorPaths]);

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    saveCurrentFrame();
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { title, data: { frames, tracks } },
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
    
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: canvas.toDataURL('image/png'),
      vectorPaths: [...vectorPaths],
      duration: 1000
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    toast.success("Frame duplicated");
  };

  const handleExport = () => {
    saveCurrentFrame();
    const exportData = {
      version: "1.0",
      format: "PSDCF",
      project: { title, createdAt: new Date().toISOString() },
      frames,
      tracks,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.psdcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
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

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden select-none">
      {/* Top Command Bar */}
      <header className="h-12 bg-[#141414] border-b border-[#252525] flex items-center justify-between px-3 shrink-0">
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
            className={`p-2.5 rounded-lg transition-colors ${isPlaying ? 'bg-violet-600 hover:bg-violet-500' : 'bg-[#252525] hover:bg-[#303030]'}`}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => setCurrentFrameIndex(Math.min(frames.length - 1, currentFrameIndex + 1))}
            className="p-2 hover:bg-[#252525] rounded-lg transition-colors">
            <SkipForward className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="ml-2 px-3 py-1 bg-[#1a1a1a] rounded text-xs font-mono text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="button-save">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors flex items-center gap-2"
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
          <aside className="w-64 bg-[#111111] border-r border-[#252525] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#252525] flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tools</span>
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
                      drawingMode === "raster" ? 'bg-violet-600 text-white' : 'bg-[#1a1a1a] text-zinc-400 hover:bg-[#202020]'
                    }`}>
                    <Pencil className="w-4 h-4" /> Raster
                  </button>
                  <button onClick={() => setDrawingMode("vector")}
                    className={`flex-1 p-2 text-xs rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      drawingMode === "vector" ? 'bg-violet-600 text-white' : 'bg-[#1a1a1a] text-zinc-400 hover:bg-[#202020]'
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
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "select" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <MousePointer className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("pen")} title="Brush"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "pen" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Pen className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setRasterTool("eraser")} title="Eraser"
                        className={`p-2.5 rounded-lg transition-colors ${rasterTool === "eraser" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Eraser className="w-4 h-4 mx-auto" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setVectorTool("select")} title="Select"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "select" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <MousePointer className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("pen")} title="Pen Tool"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "pen" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <PenTool className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("pencil")} title="Pencil"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "pencil" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Pencil className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("line")} title="Line"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "line" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Minus className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("rectangle")} title="Rectangle"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "rectangle" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Square className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("ellipse")} title="Ellipse"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "ellipse" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
                        <Circle className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => setVectorTool("arrow")} title="Arrow"
                        className={`p-2.5 rounded-lg transition-colors ${vectorTool === "arrow" ? 'bg-violet-600' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}>
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
                      className="w-full accent-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Stroke Color</label>
                    <div className="flex flex-wrap gap-1">
                      {COLORS.map(color => (
                        <button key={color} onClick={() => setBrushColor(color)}
                          className={`w-6 h-6 rounded border-2 transition-all ${brushColor === color ? 'border-violet-500 scale-110' : 'border-transparent'}`}
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
                          className={`px-2 py-1 text-[10px] rounded ${fillColor === "transparent" ? 'bg-violet-600' : 'bg-[#1a1a1a]'}`}>
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
                          ? 'bg-violet-600/20 border border-violet-500/50' 
                          : 'bg-[#1a1a1a] hover:bg-[#202020] border border-transparent'
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
            
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
              style={{ 
                width: `${(960 * zoom) / 100}px`, 
                height: `${(540 * zoom) / 100}px`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}>
              {/* Raster Canvas */}
              <canvas ref={canvasRef} width={1920} height={1080}
                className={`absolute inset-0 w-full h-full ${drawingMode === "raster" ? "z-10" : "z-0"}`}
                style={{ cursor: currentTool === "select" ? "default" : "crosshair" }}
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
                    {track.type === "video" && <Film className="w-3.5 h-3.5 text-violet-400" />}
                    {track.type === "effects" && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    {track.type === "audio" && <Music className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex-1 bg-[#0d0d0d] relative">
                    {track.type === "video" && frames.map((frame, idx) => (
                      <div key={frame.id}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
                          idx === currentFrameIndex ? 'bg-violet-600' : 'bg-violet-900/50 hover:bg-violet-800/50'
                        }`}
                        style={{ left: `${(idx * 10)}%`, width: `${Math.max(8, 100 / Math.max(frames.length, 1) - 1)}%` }}
                        onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(idx); }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 truncate px-1">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${(currentFrameIndex / Math.max(frames.length, 1)) * 100}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rotate-45" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Inspector Panel */}
        {showInspector && (
          <aside className="w-64 bg-[#111111] border-l border-[#252525] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#252525] flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inspector</span>
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
                    <label className="text-xs text-zinc-400 block mb-1">Duration (ms)</label>
                    <input type="number" value={frames[currentFrameIndex]?.duration || 1000}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1000;
                        setFrames(prev => prev.map((f, i) => i === currentFrameIndex ? { ...f, duration: val } : f));
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#303030] rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500" />
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
                          selectedPathId === path.id ? 'bg-violet-600/30 border border-violet-500/50' : 'bg-[#1a1a1a] hover:bg-[#202020]'
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
                <div className="p-2 bg-violet-900/20 border border-violet-500/30 rounded-lg">
                  <div className="text-[10px] font-semibold text-violet-400 mb-1">Pen Tool</div>
                  <div className="text-[10px] text-zinc-400">
                    Click to add points. Press Enter to finish path.
                  </div>
                </div>
              )}
              
              {/* Transform */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">Transform</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">X</label>
                    <input type="number" defaultValue={0} className="w-full bg-[#1a1a1a] border border-[#303030] rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Y</label>
                    <input type="number" defaultValue={0} className="w-full bg-[#1a1a1a] border border-[#303030] rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Scale</label>
                    <input type="number" defaultValue={100} className="w-full bg-[#1a1a1a] border border-[#303030] rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Rotation</label>
                    <input type="number" defaultValue={0} className="w-full bg-[#1a1a1a] border border-[#303030] rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
                  </div>
                </div>
              </div>
              
              {/* AI Generate */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">AI Generate</div>
                <button onClick={() => toast.success("AI generation coming soon")}
                  className="w-full p-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all">
                  <Wand2 className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
