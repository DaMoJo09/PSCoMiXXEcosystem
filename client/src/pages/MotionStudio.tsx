import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, 
  Plus, Trash2, Copy, Save, Download, Upload,
  Layers, Wand2, Settings2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize2, Grid3X3,
  Sparkles, Film, ImageIcon, Type, Music,
  Move, RotateCcw, Scissors, Volume2, VolumeX,
  Eye, EyeOff, Lock, Unlock, MoreHorizontal,
  Folder, X, Check
} from "lucide-react";
import { toast } from "sonner";
import { useProject, useUpdateProject, useCreateProject } from "@/hooks/useProjects";

interface Frame {
  id: string;
  imageData: string;
  duration: number;
}

interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  visible: boolean;
  locked: boolean;
  clips: Clip[];
}

interface Clip {
  id: string;
  frameId: string;
  startTime: number;
  duration: number;
  label: string;
}

export default function MotionStudio() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = searchParams.get('id');
  
  const { data: project } = useProject(projectId || '');
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [title, setTitle] = useState("Untitled Project");
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(10000); // 10 seconds in ms
  const [zoom, setZoom] = useState(100);
  
  const [frames, setFrames] = useState<Frame[]>([
    { id: "frame_1", imageData: "", duration: 1000 }
  ]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  
  const [tracks, setTracks] = useState<Track[]>([
    { id: "track_video", name: "Video", type: "video", visible: true, locked: false, clips: [] },
    { id: "track_effects", name: "Effects", type: "effects", visible: true, locked: false, clips: [] },
    { id: "track_audio", name: "Audio", type: "audio", visible: true, locked: false, clips: [] },
  ]);
  
  const [showAssets, setShowAssets] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#ffffff");

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
    
    context.fillStyle = '#0a0a0a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    contextRef.current = context;
  }, []);

  // Load frame image
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
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
  }, [currentFrameIndex, frames]);

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    setFrames(prev => prev.map((f, i) => 
      i === currentFrameIndex ? { ...f, imageData } : f
    ));
  }, [currentFrameIndex]);

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
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
    const newFrame: Frame = {
      id: `frame_${Date.now()}`,
      imageData: "",
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
      duration: 1000
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    toast.success("Frame duplicated");
  };

  const handleExport = () => {
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
        const context = contextRef.current;
        if (!canvas || !context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        context.drawImage(img, x, y, img.width * scale, img.height * scale);
        saveCurrentFrame();
        toast.success("Image imported");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, visible: !t.visible } : t
    ));
  };

  const toggleTrackLock = (trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const frames = Math.floor((ms % 1000) / (1000 / 24));
    return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

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
          <button
            onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
            className="p-2 hover:bg-[#252525] rounded-lg transition-colors"
          >
            <SkipBack className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-lg transition-colors ${isPlaying ? 'bg-violet-600 hover:bg-violet-500' : 'bg-[#252525] hover:bg-[#303030]'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setCurrentFrameIndex(Math.min(frames.length - 1, currentFrameIndex + 1))}
            className="p-2 hover:bg-[#252525] rounded-lg transition-colors"
          >
            <SkipForward className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="ml-2 px-3 py-1 bg-[#1a1a1a] rounded text-xs font-mono text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="button-save"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors flex items-center gap-2"
            data-testid="button-export"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Assets Panel */}
        {showAssets && (
          <aside className="w-56 bg-[#111111] border-r border-[#252525] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#252525] flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assets</span>
              <button onClick={() => setShowAssets(false)} className="p-1 hover:bg-[#252525] rounded">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Import Section */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Import</div>
                <label className="flex items-center gap-2 p-2.5 bg-[#1a1a1a] hover:bg-[#202020] rounded-lg cursor-pointer transition-colors border border-dashed border-[#303030]">
                  <Upload className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400">Add Media</span>
                  <input type="file" accept="image/*,video/*" onChange={handleFileImport} className="hidden" />
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
                <div className="space-y-1">
                  {frames.map((frame, idx) => (
                    <button
                      key={frame.id}
                      onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(idx); }}
                      className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                        idx === currentFrameIndex 
                          ? 'bg-violet-600/20 border border-violet-500/50' 
                          : 'bg-[#1a1a1a] hover:bg-[#202020] border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-6 bg-[#252525] rounded overflow-hidden">
                        {frame.imageData && <img src={frame.imageData} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-xs text-zinc-300">Frame {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Effects */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Quick Effects</div>
                <div className="grid grid-cols-2 gap-1">
                  {["Fade In", "Fade Out", "Zoom", "Pan", "Shake", "Blur"].map(effect => (
                    <button 
                      key={effect}
                      onClick={() => toast.success(`${effect} applied`)}
                      className="p-2 text-xs bg-[#1a1a1a] hover:bg-[#202020] rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                    >
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
              <button 
                onClick={() => setShowAssets(true)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-[#303030]"
              >
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            )}
            
            <div 
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
              style={{ 
                width: `${(960 * zoom) / 100}px`, 
                height: `${(540 * zoom) / 100}px`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="w-full h-full"
                onPointerDown={(e) => {
                  const canvas = canvasRef.current;
                  const context = contextRef.current;
                  if (!canvas || !context) return;
                  
                  const rect = canvas.getBoundingClientRect();
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  const x = (e.clientX - rect.left) * scaleX;
                  const y = (e.clientY - rect.top) * scaleY;
                  
                  setIsDrawing(true);
                  lastPointRef.current = { x, y };
                  
                  context.fillStyle = brushColor;
                  context.beginPath();
                  context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
                  context.fill();
                }}
                onPointerMove={(e) => {
                  if (!isDrawing || !lastPointRef.current) return;
                  
                  const canvas = canvasRef.current;
                  const context = contextRef.current;
                  if (!canvas || !context) return;
                  
                  const rect = canvas.getBoundingClientRect();
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  const x = (e.clientX - rect.left) * scaleX;
                  const y = (e.clientY - rect.top) * scaleY;
                  
                  context.strokeStyle = brushColor;
                  context.lineWidth = brushSize;
                  context.lineCap = 'round';
                  context.beginPath();
                  context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                  context.lineTo(x, y);
                  context.stroke();
                  
                  lastPointRef.current = { x, y };
                }}
                onPointerUp={() => {
                  if (isDrawing) {
                    setIsDrawing(false);
                    lastPointRef.current = null;
                    saveCurrentFrame();
                  }
                }}
                onPointerLeave={() => {
                  if (isDrawing) {
                    setIsDrawing(false);
                    lastPointRef.current = null;
                    saveCurrentFrame();
                  }
                }}
              />
            </div>
            
            {!showInspector && (
              <button 
                onClick={() => setShowInspector(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-[#303030]"
              >
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
            {/* Timeline Header */}
            <div className="h-8 bg-[#141414] border-b border-[#252525] flex items-center px-3">
              <div className="w-40 shrink-0 text-xs text-zinc-500 font-medium">Tracks</div>
              <div className="flex-1 relative">
                {/* Time ruler */}
                <div className="absolute inset-0 flex items-end">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="flex-1 border-l border-[#303030] h-3 relative">
                      <span className="absolute -left-2 -top-4 text-[10px] text-zinc-600">{i}s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Tracks */}
            <div className="flex-1 overflow-y-auto">
              {tracks.map(track => (
                <div key={track.id} className="h-12 flex border-b border-[#1a1a1a] group">
                  <div className="w-40 shrink-0 bg-[#141414] border-r border-[#252525] flex items-center px-2 gap-2">
                    <button onClick={() => toggleTrackVisibility(track.id)} className="p-1 hover:bg-[#252525] rounded">
                      {track.visible ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>
                    <button onClick={() => toggleTrackLock(track.id)} className="p-1 hover:bg-[#252525] rounded">
                      {track.locked ? <Lock className="w-3.5 h-3.5 text-zinc-600" /> : <Unlock className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                    <span className="text-xs text-zinc-300 flex-1">{track.name}</span>
                    {track.type === "video" && <Film className="w-3.5 h-3.5 text-violet-400" />}
                    {track.type === "effects" && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    {track.type === "audio" && <Music className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex-1 bg-[#0d0d0d] relative">
                    {/* Clips would render here */}
                    {track.type === "video" && frames.map((frame, idx) => (
                      <div
                        key={frame.id}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
                          idx === currentFrameIndex ? 'bg-violet-600' : 'bg-violet-900/50 hover:bg-violet-800/50'
                        }`}
                        style={{ 
                          left: `${(idx * 10)}%`, 
                          width: `${Math.max(8, 100 / Math.max(frames.length, 1) - 1)}%` 
                        }}
                        onClick={() => { saveCurrentFrame(); setCurrentFrameIndex(idx); }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 truncate px-1">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                    
                    {/* Playhead */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${(currentFrameIndex / Math.max(frames.length, 1)) * 100}%` }}
                    >
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
                    <input 
                      type="number" 
                      value={frames[currentFrameIndex]?.duration || 1000}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1000;
                        setFrames(prev => prev.map((f, i) => i === currentFrameIndex ? { ...f, duration: val } : f));
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#303030] rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Brush Settings */}
              <div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-3">Brush</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Size: {brushSize}px</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Color</label>
                    <div className="flex gap-1">
                      {["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00"].map(color => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={`w-6 h-6 rounded border-2 transition-all ${brushColor === color ? 'border-violet-500 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
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
                <button 
                  onClick={() => toast.success("AI generation coming soon")}
                  className="w-full p-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
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
