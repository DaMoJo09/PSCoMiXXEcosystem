import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus, Trash2, GripVertical, Lightbulb, Users, Film, Palette, Target,
  ImageIcon, StickyNote, Pencil, Type, Link2, X, Lock, Unlock,
  ZoomIn, ZoomOut, Maximize2, Move, Eye, EyeOff, Upload
} from "lucide-react";

type NodeType = "idea" | "character" | "scene" | "theme" | "beat" | "reference";

export interface CanvasNode {
  id: string;
  nodeType: NodeType;
  title: string;
  content?: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  color?: string;
  imageUrl?: string;
  linkedSceneId?: string;
  traits?: string[];
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  lineStyle?: "solid" | "dashed";
  color?: string;
}

export interface CanvasStickyNote {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
  color: string;
  attachedToNodeId?: string;
}

export interface CanvasReferenceImage {
  id: string;
  dataUrl: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  opacity: number;
  locked: boolean;
}

interface DrawStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

function genId(prefix = "node") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const NODE_COLORS: Record<NodeType, string> = {
  idea: "#f59e0b",
  character: "#8b5cf6",
  scene: "#f97316",
  theme: "#06b6d4",
  beat: "#ef4444",
  reference: "#6b7280",
};

const NODE_ICONS: Record<NodeType, typeof Lightbulb> = {
  idea: Lightbulb,
  character: Users,
  scene: Film,
  theme: Palette,
  beat: Target,
  reference: ImageIcon,
};

const STICKY_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecdd3", "#e9d5ff", "#fed7aa"];

interface HopStudioCanvasProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  stickyNotes: CanvasStickyNote[];
  referenceImages: CanvasReferenceImage[];
  annotations: DrawStroke[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  onConnectionsChange: (connections: CanvasConnection[]) => void;
  onStickyNotesChange: (notes: CanvasStickyNote[]) => void;
  onReferenceImagesChange: (images: CanvasReferenceImage[]) => void;
  onAnnotationsChange: (strokes: DrawStroke[]) => void;
  sceneIds: string[];
}

export default function HopStudioCanvas({
  nodes, connections, stickyNotes, referenceImages, annotations,
  onNodesChange, onConnectionsChange, onStickyNotesChange,
  onReferenceImagesChange, onAnnotationsChange, sceneIds,
}: HopStudioCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragSticky, setDragSticky] = useState<string | null>(null);
  const [dragRef, setDragRef] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedStickyId, setSelectedStickyId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawWidth, setDrawWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [showMinimap, setShowMinimap] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "connect" | "draw" | "sticky" | "reference">("select");

  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const refInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setPan(prev => ({
      x: mx - (mx - prev.x) * (newZoom / zoom),
      y: my - (my - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom]);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (tool !== "select" && tool !== "connect") return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan, tool]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (tool === "sticky") {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const note: CanvasStickyNote = {
        id: genId("sticky"),
        text: "Note",
        positionX: pos.x,
        positionY: pos.y,
        color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      };
      onStickyNotesChange([...stickyNotes, note]);
      setEditingStickyId(note.id);
      setTool("select");
    } else if (tool === "select") {
      setSelectedNodeId(null);
      setSelectedStickyId(null);
      setEditingNodeId(null);
      setEditingStickyId(null);
    }
  }, [tool, screenToCanvas, stickyNotes, onStickyNotesChange]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
          y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
        });
      }
      if (dragNode) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const dx = pos.x - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).x;
        const dy = pos.y - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).y;
        onNodesChange(nodes.map(n => n.id === dragNode ? { ...n, positionX: dragStartRef.current.nodeX + dx, positionY: dragStartRef.current.nodeY + dy } : n));
      }
      if (dragSticky) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const dx = pos.x - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).x;
        const dy = pos.y - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).y;
        onStickyNotesChange(stickyNotes.map(n => n.id === dragSticky ? { ...n, positionX: dragStartRef.current.nodeX + dx, positionY: dragStartRef.current.nodeY + dy } : n));
      }
      if (dragRef) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const dx = pos.x - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).x;
        const dy = pos.y - screenToCanvas(dragStartRef.current.x, dragStartRef.current.y).y;
        onReferenceImagesChange(referenceImages.map(r => r.id === dragRef ? { ...r, positionX: dragStartRef.current.nodeX + dx, positionY: dragStartRef.current.nodeY + dy } : r));
      }
      if (isDrawing && drawingMode) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setCurrentStroke(prev => [...prev, pos]);
      }
    };
    const handleUp = () => {
      setIsPanning(false);
      setDragNode(null);
      setDragSticky(null);
      setDragRef(null);
      if (isDrawing && currentStroke.length > 1) {
        onAnnotationsChange([...annotations, { points: currentStroke, color: drawColor, width: drawWidth }]);
        setCurrentStroke([]);
        setIsDrawing(false);
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [isPanning, dragNode, dragSticky, dragRef, isDrawing, drawingMode, currentStroke, nodes, stickyNotes, referenceImages, annotations, zoom, pan, drawColor, drawWidth, screenToCanvas, onNodesChange, onStickyNotesChange, onReferenceImagesChange, onAnnotationsChange]);

  const addNode = useCallback((type: NodeType) => {
    const node: CanvasNode = {
      id: genId("node"),
      nodeType: type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      positionX: (-pan.x + 400) / zoom,
      positionY: (-pan.y + 300) / zoom,
      color: NODE_COLORS[type],
    };
    onNodesChange([...nodes, node]);
    setSelectedNodeId(node.id);
    setEditingNodeId(node.id);
  }, [nodes, onNodesChange, pan, zoom]);

  const removeNode = useCallback((id: string) => {
    onNodesChange(nodes.filter(n => n.id !== id));
    onConnectionsChange(connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [nodes, connections, selectedNodeId, onNodesChange, onConnectionsChange]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (tool === "connect") {
      if (!connectFrom) {
        setConnectFrom(nodeId);
      } else if (connectFrom !== nodeId) {
        const conn: CanvasConnection = {
          id: genId("conn"),
          fromNodeId: connectFrom,
          toNodeId: nodeId,
          lineStyle: "solid",
          color: "#666",
        };
        onConnectionsChange([...connections, conn]);
        setConnectFrom(null);
      }
      return;
    }
    setSelectedNodeId(nodeId);
    setDragNode(nodeId);
    dragStartRef.current = {
      x: e.clientX, y: e.clientY,
      nodeX: nodes.find(n => n.id === nodeId)!.positionX,
      nodeY: nodes.find(n => n.id === nodeId)!.positionY,
    };
  }, [tool, connectFrom, nodes, connections, onConnectionsChange]);

  const handleRefUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img: CanvasReferenceImage = {
        id: genId("ref"),
        dataUrl: reader.result as string,
        positionX: (-pan.x + 300) / zoom,
        positionY: (-pan.y + 200) / zoom,
        width: 200,
        height: 150,
        opacity: 1,
        locked: false,
      };
      onReferenceImagesChange([...referenceImages, img]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setTool("select");
  }, [referenceImages, onReferenceImagesChange, pan, zoom]);

  const renderConnections = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      {connections.map(conn => {
        const from = nodes.find(n => n.id === conn.fromNodeId);
        const to = nodes.find(n => n.id === conn.toNodeId);
        if (!from || !to) return null;
        const x1 = from.positionX + 80;
        const y1 = from.positionY + 30;
        const x2 = to.positionX + 80;
        const y2 = to.positionY + 30;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={conn.id}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={conn.color || "#666"}
              strokeWidth={2 / zoom}
              strokeDasharray={conn.lineStyle === "dashed" ? `${6 / zoom}` : undefined}
            />
            {conn.label && (
              <text x={mx} y={my - 8 / zoom} fill="#999" fontSize={10 / zoom} textAnchor="middle">{conn.label}</text>
            )}
            <circle
              cx={mx} cy={my} r={4 / zoom} fill="#333" stroke={conn.color || "#666"} strokeWidth={1 / zoom}
              className="cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const label = prompt("Connection label:", conn.label || "");
                if (label !== null) onConnectionsChange(connections.map(c => c.id === conn.id ? { ...c, label } : c));
              }}
            />
          </g>
        );
      })}
    </svg>
  );

  const renderAnnotations = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      {annotations.map((stroke, i) => {
        if (stroke.points.length < 2) return null;
        const d = stroke.points.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return <path key={i} d={d} stroke={stroke.color} strokeWidth={stroke.width / zoom} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      })}
      {isDrawing && currentStroke.length > 1 && (
        <path d={currentStroke.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")} stroke={drawColor} strokeWidth={drawWidth / zoom} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedSticky = stickyNotes.find(n => n.id === selectedStickyId);

  return (
    <div className="flex flex-col h-full bg-zinc-950" data-testid="hop-studio-canvas">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border-b border-white/10 shrink-0">
        <span className="text-[9px] text-zinc-500 font-bold mr-2">TOOLS</span>
        {([
          { id: "select" as const, icon: Move, label: "Select" },
          { id: "connect" as const, icon: Link2, label: "Connect" },
          { id: "sticky" as const, icon: StickyNote, label: "Sticky Note" },
          { id: "draw" as const, icon: Pencil, label: "Draw" },
          { id: "reference" as const, icon: ImageIcon, label: "Reference" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "reference") { refInputRef.current?.click(); return; }
              if (t.id === "draw") { setDrawingMode(!drawingMode); setTool(drawingMode ? "select" : "draw"); return; }
              setTool(t.id);
              setDrawingMode(false);
              setConnectFrom(null);
            }}
            className={`p-1.5 transition text-[9px] ${(tool === t.id || (t.id === "draw" && drawingMode)) ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}
            title={t.label}
            data-testid={`canvas-tool-${t.id}`}
          >
            <t.icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="border-l border-white/10 mx-1 h-4" />
        <span className="text-[9px] text-zinc-500 font-bold mr-1">ADD</span>
        {(["idea", "character", "scene", "theme", "beat", "reference"] as NodeType[]).map(type => {
          const Icon = NODE_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white transition"
              title={`Add ${type} node`}
              data-testid={`canvas-add-${type}`}
            >
              <Icon className="w-3 h-3" style={{ color: NODE_COLORS[type] }} />
            </button>
          );
        })}
        <div className="flex-1" />
        {drawingMode && (
          <div className="flex items-center gap-1">
            <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="w-5 h-5 cursor-pointer bg-transparent" />
            <input type="range" min="1" max="8" value={drawWidth} onChange={e => setDrawWidth(Number(e.target.value))} className="w-12 h-1 accent-orange-500" />
            <button onClick={() => onAnnotationsChange([])} className="px-1.5 py-0.5 text-[8px] bg-red-900/30 text-red-400 hover:bg-red-900/50 transition">Clear</button>
          </div>
        )}
        {connectFrom && <span className="text-[9px] text-cyan-400 ml-2">Click target node to connect...</span>}
        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 transition"><ZoomOut className="w-3 h-3" /></button>
          <span className="text-[9px] text-zinc-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 transition"><ZoomIn className="w-3 h-3" /></button>
          <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 transition" title="Reset view"><Maximize2 className="w-3 h-3" /></button>
        </div>
      </div>
      <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning ? "grabbing" : drawingMode ? "crosshair" : tool === "connect" ? "cell" : tool === "sticky" ? "copy" : "default" }}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          if (drawingMode && e.button === 0) {
            const pos = screenToCanvas(e.clientX, e.clientY);
            setIsDrawing(true);
            setCurrentStroke([pos]);
            return;
          }
          handlePanStart(e);
          if (e.button === 0 && !e.altKey && tool === "select") handleCanvasClick(e);
        }}
        data-testid="canvas-viewport"
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {renderAnnotations()}
          {renderConnections()}
          {referenceImages.map(img => (
            <div
              key={img.id}
              className={`absolute border ${img.locked ? "border-zinc-700" : "border-white/20 hover:border-orange-500/50"} cursor-move`}
              style={{
                left: img.positionX, top: img.positionY,
                width: img.width, height: img.height,
                opacity: img.opacity,
              }}
              onMouseDown={(e) => {
                if (img.locked) return;
                e.stopPropagation();
                setDragRef(img.id);
                dragStartRef.current = { x: e.clientX, y: e.clientY, nodeX: img.positionX, nodeY: img.positionY };
              }}
            >
              <img src={img.dataUrl} alt="" className="w-full h-full object-cover" draggable={false} />
              <div className="absolute top-0 right-0 flex gap-0.5 p-0.5 bg-black/60">
                <button onClick={() => onReferenceImagesChange(referenceImages.map(r => r.id === img.id ? { ...r, locked: !r.locked } : r))} className="p-0.5">
                  {img.locked ? <Lock className="w-2.5 h-2.5 text-red-400" /> : <Unlock className="w-2.5 h-2.5 text-zinc-400" />}
                </button>
                <button onClick={() => onReferenceImagesChange(referenceImages.filter(r => r.id !== img.id))} className="p-0.5 hover:text-red-400">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <input type="range" min="10" max="100" value={Math.round(img.opacity * 100)} onChange={e => onReferenceImagesChange(referenceImages.map(r => r.id === img.id ? { ...r, opacity: Number(e.target.value) / 100 } : r))} className="w-full h-0.5 accent-orange-500" />
              </div>
            </div>
          ))}
          {stickyNotes.map(note => (
            <div
              key={note.id}
              className={`absolute w-32 min-h-[80px] p-2 shadow-lg cursor-move select-none ${selectedStickyId === note.id ? "ring-2 ring-orange-500" : ""}`}
              style={{ left: note.positionX, top: note.positionY, backgroundColor: note.color }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelectedStickyId(note.id);
                setDragSticky(note.id);
                dragStartRef.current = { x: e.clientX, y: e.clientY, nodeX: note.positionX, nodeY: note.positionY };
              }}
              onDoubleClick={() => setEditingStickyId(note.id)}
            >
              {editingStickyId === note.id ? (
                <textarea
                  autoFocus
                  value={note.text}
                  onChange={e => onStickyNotesChange(stickyNotes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n))}
                  onBlur={() => setEditingStickyId(null)}
                  className="w-full h-full bg-transparent text-black text-[10px] resize-none outline-none"
                />
              ) : (
                <p className="text-[10px] text-black whitespace-pre-wrap">{note.text}</p>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onStickyNotesChange(stickyNotes.filter(n => n.id !== note.id)); }}
                className="absolute top-0.5 right-0.5 p-0.5 text-black/40 hover:text-red-600"
              >
                <X className="w-2.5 h-2.5" />
              </button>
              <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                {STICKY_COLORS.map(c => (
                  <button key={c} onClick={e => { e.stopPropagation(); onStickyNotesChange(stickyNotes.map(n => n.id === note.id ? { ...n, color: c } : n)); }} className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          ))}
          {nodes.map(node => {
            const Icon = NODE_ICONS[node.nodeType];
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                className={`absolute w-40 bg-zinc-900 border-2 cursor-move select-none ${isSelected ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-zinc-700 hover:border-zinc-500"}`}
                style={{ left: node.positionX, top: node.positionY }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={() => setEditingNodeId(node.id)}
                data-testid={`canvas-node-${node.id}`}
              >
                <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10" style={{ backgroundColor: `${node.color || NODE_COLORS[node.nodeType]}20` }}>
                  <Icon className="w-3 h-3 shrink-0" style={{ color: node.color || NODE_COLORS[node.nodeType] }} />
                  {editingNodeId === node.id ? (
                    <input
                      autoFocus
                      value={node.title}
                      onChange={e => onNodesChange(nodes.map(n => n.id === node.id ? { ...n, title: e.target.value } : n))}
                      onBlur={() => setEditingNodeId(null)}
                      onKeyDown={e => e.key === "Enter" && setEditingNodeId(null)}
                      className="flex-1 bg-transparent text-white text-[10px] font-bold outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 text-[10px] font-bold text-white truncate">{node.title}</span>
                  )}
                  <span className="text-[7px] uppercase text-zinc-500">{node.nodeType}</span>
                </div>
                <div className="p-2 min-h-[30px]">
                  {node.imageUrl && <img src={node.imageUrl} alt="" className="w-full h-16 object-cover mb-1" />}
                  {node.content ? (
                    <p className="text-[9px] text-zinc-400 whitespace-pre-wrap line-clamp-3">{node.content}</p>
                  ) : (
                    <p className="text-[9px] text-zinc-600 italic">Double-click to edit</p>
                  )}
                  {node.traits && node.traits.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {node.traits.map(t => (
                        <span key={t} className="px-1 py-0.5 text-[7px] bg-zinc-800 border border-white/10 text-zinc-400">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute -top-6 right-0 flex gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="p-0.5 bg-red-900/50 text-red-400 hover:bg-red-900"><Trash2 className="w-2.5 h-2.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showMinimap && (
          <div className="absolute bottom-2 right-2 w-32 h-24 bg-zinc-900/90 border border-white/10">
            <div className="relative w-full h-full">
              {nodes.map(n => (
                <div key={n.id} className="absolute w-1.5 h-1.5 rounded-full" style={{ left: `${((n.positionX + 500) / 2000) * 100}%`, top: `${((n.positionY + 500) / 1500) * 100}%`, backgroundColor: n.color || NODE_COLORS[n.nodeType] }} />
              ))}
            </div>
          </div>
        )}
      </div>
      {selectedNode && !editingNodeId && (
        <div className="bg-zinc-900 border-t border-white/10 p-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">Node</span>
            <input value={selectedNode.title} onChange={e => onNodesChange(nodes.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n))} className="flex-1 bg-zinc-800 border border-white/10 text-[10px] text-white px-1.5 py-0.5 outline-none" />
            <input type="color" value={selectedNode.color || NODE_COLORS[selectedNode.nodeType]} onChange={e => onNodesChange(nodes.map(n => n.id === selectedNode.id ? { ...n, color: e.target.value } : n))} className="w-5 h-5 bg-transparent cursor-pointer" />
          </div>
          <textarea
            value={selectedNode.content || ""}
            onChange={e => onNodesChange(nodes.map(n => n.id === selectedNode.id ? { ...n, content: e.target.value } : n))}
            placeholder="Content / description..."
            className="w-full mt-1 bg-zinc-800 border border-white/10 text-[10px] text-white px-1.5 py-1 outline-none resize-none h-12"
          />
          {selectedNode.nodeType === "scene" && (
            <select
              value={selectedNode.linkedSceneId || ""}
              onChange={e => onNodesChange(nodes.map(n => n.id === selectedNode.id ? { ...n, linkedSceneId: e.target.value || undefined } : n))}
              className="w-full mt-1 bg-zinc-800 border border-white/10 text-[9px] text-white p-1"
            >
              <option value="">Link to scene...</option>
              {sceneIds.map((sid, i) => <option key={sid} value={sid}>Scene {i + 1}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
