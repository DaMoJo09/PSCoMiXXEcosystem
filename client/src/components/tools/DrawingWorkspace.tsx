import { useRef, useEffect, useState, useCallback } from "react";
import { 
  Pen, Eraser, MousePointer, Undo2, Redo2, Trash2, Save, X,
  Circle, Square, Triangle, Minus, ArrowRight, Move, Type,
  Layers, Eye, EyeOff, Lock, Unlock, ChevronDown, Palette, PenTool, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type DrawingMode = "raster" | "vector";
export type RasterTool = "pen" | "eraser" | "select";
export type VectorTool = "pen" | "pencil" | "select" | "line" | "rectangle" | "ellipse" | "arrow";

interface VectorPath {
  id: string;
  type: "path" | "line" | "rectangle" | "ellipse" | "arrow" | "text";
  points: { x: number; y: number; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  closed: boolean;
  visible: boolean;
  locked: boolean;
}

interface DrawingLayer {
  id: string;
  name: string;
  type: "raster" | "vector";
  visible: boolean;
  locked: boolean;
  rasterData?: string;
  vectorPaths?: VectorPath[];
  zIndex: number;
}

interface DrawingWorkspaceProps {
  width?: number;
  height?: number;
  initialData?: string;
  initialVectorData?: VectorPath[];
  onSave?: (rasterData: string, vectorData: VectorPath[]) => void;
  onCancel?: () => void;
  className?: string;
}

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#FF8800", "#8800FF",
  "#888888", "#444444", "#CC0000", "#00CC00", "#0000CC",
];

export function DrawingWorkspace({
  width = 800,
  height = 600,
  initialData,
  initialVectorData,
  onSave,
  onCancel,
  className = "",
}: DrawingWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [mode, setMode] = useState<DrawingMode>("raster");
  const [rasterTool, setRasterTool] = useState<RasterTool>("pen");
  const [vectorTool, setVectorTool] = useState<VectorTool>("pen");
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [vectorPaths, setVectorPaths] = useState<VectorPath[]>(initialVectorData || []);
  const [currentPath, setCurrentPath] = useState<VectorPath | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isPenCreating, setIsPenCreating] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    
    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = initialData;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      saveToHistory();
    }
  }, [initialData, width, height]);
  
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL("image/png");
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), dataUrl];
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);
  
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const prevIndex = historyIndex - 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[prevIndex];
    setHistoryIndex(prevIndex);
  }, [historyIndex, history, width, height]);
  
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const nextIndex = historyIndex + 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[nextIndex];
    setHistoryIndex(nextIndex);
  }, [historyIndex, history, width, height]);
  
  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    saveToHistory();
  }, [width, height, saveToHistory]);
  
  const getCoordinates = (e: React.PointerEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    const element = mode === "raster" ? canvas : svg;
    if (!element) return { x: 0, y: 0 };
    
    const rect = element.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === "raster") {
      handleRasterPointerDown(e);
    } else {
      handleVectorPointerDown(e);
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === "raster") {
      handleRasterPointerMove(e);
    } else {
      handleVectorPointerMove(e);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode === "raster") {
      handleRasterPointerUp(e);
    } else {
      handleVectorPointerUp(e);
    }
  };
  
  const handleRasterPointerDown = (e: React.PointerEvent) => {
    if (rasterTool === "select") return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPos.current = { x, y };
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };
  
  const handleRasterPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !lastPos.current || rasterTool === "select") return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const currentLineWidth = rasterTool === "eraser" 
      ? brushSize * 5 * pressure 
      : brushSize * (0.5 + pressure);
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    
    if (rasterTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    
    ctx.lineWidth = Math.max(1, currentLineWidth);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    
    lastPos.current = { x, y };
  };
  
  const handleRasterPointerUp = (e: React.PointerEvent) => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
    lastPos.current = null;
    
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
  };
  
  const handleVectorPointerDown = (e: React.PointerEvent) => {
    const { x, y } = getCoordinates(e);
    
    if (vectorTool === "select") {
      return;
    }
    
    if (vectorTool === "pen") {
      if (!isPenCreating) {
        const newPath: VectorPath = {
          id: `path_${Date.now()}`,
          type: "path",
          points: [{ x, y }],
          stroke: color,
          strokeWidth: brushSize,
          fill: fillColor,
          closed: false,
          visible: true,
          locked: false,
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
        stroke: color,
        strokeWidth: brushSize,
        fill: "transparent",
        closed: false,
        visible: true,
        locked: false,
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
        stroke: color,
        strokeWidth: brushSize,
        fill: fillColor,
        closed: vectorTool === "rectangle" || vectorTool === "ellipse",
        visible: true,
        locked: false,
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
  
  const handleVectorPointerUp = (e: React.PointerEvent) => {
    if (vectorTool === "pencil" && currentPath) {
      setVectorPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    } else if (["line", "rectangle", "ellipse", "arrow"].includes(vectorTool) && currentPath) {
      setVectorPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };
  
  const finishPenPath = useCallback(() => {
    if (currentPath && isPenCreating) {
      setVectorPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
      setIsPenCreating(false);
    }
  }, [currentPath, isPenCreating]);
  
  const closePenPath = useCallback(() => {
    if (currentPath && isPenCreating) {
      setVectorPaths(prev => [...prev, { ...currentPath, closed: true }]);
      setCurrentPath(null);
      setIsPenCreating(false);
    }
  }, [currentPath, isPenCreating]);
  
  const deleteSelectedPath = useCallback(() => {
    if (selectedPathId) {
      setVectorPaths(prev => prev.filter(p => p.id !== selectedPathId));
      setSelectedPathId(null);
    }
  }, [selectedPathId]);
  
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rasterData = canvas.toDataURL("image/png");
    onSave?.(rasterData, vectorPaths);
  }, [onSave, vectorPaths]);
  
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
      return (
        <g key={path.id} onClick={() => !isPreview && setSelectedPathId(path.id)}>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            {...strokeStyle}
            className={isSelected ? "stroke-blue-500" : ""}
          />
          {path.type === "arrow" && (
            <polygon
              points={`${end.x},${end.y} ${end.x - 10},${end.y - 5} ${end.x - 10},${end.y + 5}`}
              fill={path.stroke}
              transform={`rotate(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI}, ${end.x}, ${end.y})`}
            />
          )}
        </g>
      );
    }
    
    if (path.type === "rectangle") {
      const [start, end] = path.points;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      return (
        <rect
          key={path.id}
          x={x}
          y={y}
          width={w}
          height={h}
          {...strokeStyle}
          onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-blue-500" : ""}
        />
      );
    }
    
    if (path.type === "ellipse") {
      const [start, end] = path.points;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      return (
        <ellipse
          key={path.id}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          {...strokeStyle}
          onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-blue-500" : ""}
        />
      );
    }
    
    if (path.type === "path") {
      const d = path.points.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        return `${acc} L ${point.x} ${point.y}`;
      }, "") + (path.closed ? " Z" : "");
      
      return (
        <path
          key={path.id}
          d={d}
          {...strokeStyle}
          onClick={() => !isPreview && setSelectedPathId(path.id)}
          className={isSelected ? "stroke-blue-500" : ""}
        />
      );
    }
    
    return null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (mode === "vector" && selectedPathId) {
          e.preventDefault();
          deleteSelectedPath();
        }
      }
      
      if (e.key === "Enter" && mode === "vector" && isPenCreating) {
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
  }, [mode, selectedPathId, isPenCreating, undo, redo, deleteSelectedPath, finishPenPath]);
  
  return (
    <div className={`flex flex-col bg-zinc-950 border border-white/20 ${className}`}>
      <div className="flex items-center justify-between p-2 border-b border-white/10 bg-zinc-900">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-zinc-800 border-zinc-700 text-white">
                {mode === "raster" ? <Pencil className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
                {mode === "raster" ? "Raster" : "Vector"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
              <DropdownMenuItem onClick={() => setMode("raster")} className="hover:bg-zinc-800">
                <Pencil className="w-4 h-4 mr-2" /> Raster (Bitmap)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("vector")} className="hover:bg-zinc-800">
                <PenTool className="w-4 h-4 mr-2" /> Vector (Paths)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-6 w-px bg-zinc-700" />
          
          {mode === "raster" ? (
            <>
              <Button
                variant={rasterTool === "select" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setRasterTool("select")}
                className="w-8 h-8"
                title="Select (V)"
              >
                <MousePointer className="w-4 h-4" />
              </Button>
              <Button
                variant={rasterTool === "pen" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setRasterTool("pen")}
                className="w-8 h-8"
                title="Brush (B)"
              >
                <Pen className="w-4 h-4" />
              </Button>
              <Button
                variant={rasterTool === "eraser" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setRasterTool("eraser")}
                className="w-8 h-8"
                title="Eraser (E)"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={vectorTool === "select" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("select")}
                className="w-8 h-8"
                title="Select"
              >
                <MousePointer className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "pen" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("pen")}
                className="w-8 h-8"
                title="Pen Tool (Click to add points, Enter to finish)"
              >
                <PenTool className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "pencil" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("pencil")}
                className="w-8 h-8"
                title="Pencil (Freehand)"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "line" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("line")}
                className="w-8 h-8"
                title="Line"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "rectangle" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("rectangle")}
                className="w-8 h-8"
                title="Rectangle"
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "ellipse" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("ellipse")}
                className="w-8 h-8"
                title="Ellipse"
              >
                <Circle className="w-4 h-4" />
              </Button>
              <Button
                variant={vectorTool === "arrow" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setVectorTool("arrow")}
                className="w-8 h-8"
                title="Arrow"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          
          <div className="h-6 w-px bg-zinc-700" />
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={1}
              max={50}
              step={1}
              className="w-24"
            />
            <span className="text-xs text-zinc-400 w-6">{brushSize}</span>
          </div>
          
          <div className="h-6 w-px bg-zinc-700" />
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400">Stroke:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 cursor-pointer border-0 bg-transparent"
            />
            {mode === "vector" && (
              <>
                <span className="text-xs text-zinc-400 ml-2">Fill:</span>
                <input
                  type="color"
                  value={fillColor === "transparent" ? "#ffffff" : fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-6 h-6 cursor-pointer border-0 bg-transparent"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFillColor("transparent")}
                  className={`text-xs h-6 px-2 ${fillColor === "transparent" ? "bg-zinc-700" : ""}`}
                >
                  No Fill
                </Button>
              </>
            )}
          </div>
          
          <div className="flex gap-1 ml-2">
            {COLORS.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 border ${color === c ? "border-white" : "border-zinc-600"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {mode === "raster" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="w-8 h-8"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="w-8 h-8"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearCanvas}
                className="w-8 h-8 text-red-400 hover:text-red-300"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {mode === "vector" && isPenCreating && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={finishPenPath}
                className="bg-green-900/50 border-green-700 text-green-400"
              >
                Finish Path
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={closePenPath}
                className="bg-blue-900/50 border-blue-700 text-blue-400"
              >
                Close Path
              </Button>
            </>
          )}
          
          <div className="h-6 w-px bg-zinc-700" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="bg-white text-black hover:bg-zinc-200"
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 bg-zinc-800 overflow-auto">
        <div className="relative bg-white shadow-2xl" style={{ width, height }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={`absolute inset-0 touch-none ${mode === "raster" && rasterTool !== "select" ? "cursor-crosshair" : "cursor-default"}`}
            style={{ 
              width: "100%", 
              height: "100%",
              display: mode === "raster" ? "block" : "block",
              opacity: mode === "raster" ? 1 : 0.3,
            }}
            onPointerDown={mode === "raster" ? handlePointerDown : undefined}
            onPointerMove={mode === "raster" ? handlePointerMove : undefined}
            onPointerUp={mode === "raster" ? handlePointerUp : undefined}
            onPointerCancel={mode === "raster" ? handlePointerUp : undefined}
          />
          
          {mode === "vector" && (
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className={`absolute inset-0 touch-none ${vectorTool !== "select" ? "cursor-crosshair" : "cursor-default"}`}
              style={{ width: "100%", height: "100%" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {vectorPaths.filter(p => p.visible).map(path => renderVectorPath(path))}
              {currentPath && renderVectorPath(currentPath, true)}
              
              {selectedPathId && (
                <g className="pointer-events-none">
                  {vectorPaths.find(p => p.id === selectedPathId)?.points.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}
            </svg>
          )}
        </div>
      </div>
      
      {mode === "vector" && (
        <div className="p-2 border-t border-white/10 bg-zinc-900 text-xs text-zinc-400">
          <span className="mr-4">Paths: {vectorPaths.length}</span>
          {isPenCreating && <span className="text-yellow-400">Creating path... Press Enter to finish, Esc to cancel</span>}
          {selectedPathId && <span className="text-blue-400">Path selected - Press Delete to remove</span>}
        </div>
      )}
    </div>
  );
}
