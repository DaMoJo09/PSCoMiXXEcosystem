import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2, Layers, GitBranch, MousePointer2, Link as LinkIcon } from "lucide-react";

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasConnection {
  fromId: string;
  toId: string;
  fromSide?: "right" | "bottom" | "left" | "top";
  toSide?: "left" | "top" | "right" | "bottom";
  label?: string;
  dashed?: boolean;
  color?: string;
}

type Side = "left" | "right" | "top" | "bottom";

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  onNodeMove?: (id: string, x: number, y: number) => void;
  onNodeClick?: (id: string) => void;
  onNodeDoubleClick?: (id: string) => void;
  renderNode: (node: CanvasNode) => ReactNode;
  selectedNodeId?: string | null;
  className?: string;
  gridSize?: number;
  showGrid?: boolean;
  showMinimap?: boolean;
  minZoom?: number;
  maxZoom?: number;
  connectionColor?: string;
  accentColor?: string;
  prototypeMode?: boolean;
  onCreateConnection?: (fromId: string, toId: string, fromSide: Side, toSide: Side) => void;
  onDeleteConnection?: (fromId: string, toId: string) => void;
  onLabelConnection?: (fromId: string, toId: string) => void;
}

const ZOOM_STEP = 0.1;
const PAN_BUTTON = 1;
const HANDLE_RADIUS = 7;

function getAnchorPoint(node: CanvasNode, side: Side) {
  switch (side) {
    case "left": return { x: node.x, y: node.y + node.height / 2 };
    case "right": return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "top": return { x: node.x + node.width / 2, y: node.y };
    case "bottom": return { x: node.x + node.width / 2, y: node.y + node.height };
  }
}

function getHandlePositions(node: CanvasNode): { side: Side; x: number; y: number }[] {
  return [
    { side: "right", x: node.x + node.width, y: node.y + node.height / 2 },
    { side: "bottom", x: node.x + node.width / 2, y: node.y + node.height },
    { side: "left", x: node.x, y: node.y + node.height / 2 },
    { side: "top", x: node.x + node.width / 2, y: node.y },
  ];
}

function buildBezierPath(from: { x: number; y: number }, to: { x: number; y: number }, fromSide: string, toSide: string) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const dist = Math.max(dx, dy);
  const offset = Math.max(40, Math.min(dist * 0.4, 120));

  let c1 = { ...from };
  let c2 = { ...to };

  if (fromSide === "right") { c1.x += offset; }
  else if (fromSide === "left") { c1.x -= offset; }
  else if (fromSide === "bottom") { c1.y += offset; }
  else if (fromSide === "top") { c1.y -= offset; }

  if (toSide === "left") { c2.x -= offset; }
  else if (toSide === "right") { c2.x += offset; }
  else if (toSide === "top") { c2.y -= offset; }
  else if (toSide === "bottom") { c2.y += offset; }

  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

function closestSide(node: CanvasNode, px: number, py: number): Side {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const ax = Math.abs(dx) / (node.width / 2);
  const ay = Math.abs(dy) / (node.height / 2);
  if (ax > ay) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

export function InfiniteCanvas({
  nodes,
  connections = [],
  onNodeMove,
  onNodeClick,
  onNodeDoubleClick,
  renderNode,
  selectedNodeId,
  className,
  gridSize = 20,
  showGrid = true,
  showMinimap = true,
  minZoom = 0.1,
  maxZoom = 3,
  connectionColor = "rgba(255,255,255,0.25)",
  accentColor = "#06b6d4",
  prototypeMode = false,
  onCreateConnection,
  onDeleteConnection,
  onLabelConnection,
}: InfiniteCanvasProps) {
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.6 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragNode, setDragNode] = useState<{ id: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [wireStart, setWireStart] = useState<{ nodeId: string; side: Side; x: number; y: number } | null>(null);
  const [wireEnd, setWireEnd] = useState<{ x: number; y: number } | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const clampZoom = useCallback((z: number) => Math.max(minZoom, Math.min(maxZoom, z)), [minZoom, maxZoom]);

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.ctrlKey || e.metaKey) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

      setViewport(prev => {
        const newZoom = clampZoom(prev.zoom + delta);
        const ratio = newZoom / prev.zoom;
        const newX = mouseX - (mouseX - prev.x) * ratio;
        const newY = mouseY - (mouseY - prev.y) * ratio;
        return { x: newX, y: newY, zoom: newZoom };
      });
    } else {
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [clampZoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (wireStart) {
      setWireStart(null);
      setWireEnd(null);
      return;
    }
    if (e.button === PAN_BUTTON || spaceDown) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  }, [spaceDown, viewport.x, viewport.y, wireStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setViewport(prev => ({ ...prev, x: panStart.current.vx + dx, y: panStart.current.vy + dy }));
      return;
    }
    if (wireStart) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setWireEnd(canvasPos);
      let foundHover: string | null = null;
      for (const n of nodes) {
        if (n.id === wireStart.nodeId) continue;
        if (canvasPos.x >= n.x && canvasPos.x <= n.x + n.width &&
            canvasPos.y >= n.y && canvasPos.y <= n.y + n.height) {
          foundHover = n.id;
          break;
        }
      }
      setHoverNodeId(foundHover);
      return;
    }
    if (dragNode) {
      const dx = (e.clientX - dragNode.startX) / viewport.zoom;
      const dy = (e.clientY - dragNode.startY) / viewport.zoom;
      const newX = Math.round((dragNode.nodeStartX + dx) / gridSize) * gridSize;
      const newY = Math.round((dragNode.nodeStartY + dy) / gridSize) * gridSize;
      onNodeMove?.(dragNode.id, newX, newY);
    }
  }, [isPanning, dragNode, viewport.zoom, gridSize, onNodeMove, wireStart, screenToCanvas, nodes]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (wireStart && wireEnd) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      for (const n of nodes) {
        if (n.id === wireStart.nodeId) continue;
        if (canvasPos.x >= n.x && canvasPos.x <= n.x + n.width &&
            canvasPos.y >= n.y && canvasPos.y <= n.y + n.height) {
          const toSide = closestSide(n, canvasPos.x, canvasPos.y);
          onCreateConnection?.(wireStart.nodeId, n.id, wireStart.side, toSide);
          break;
        }
      }
      setWireStart(null);
      setWireEnd(null);
      setHoverNodeId(null);
      return;
    }
    setIsPanning(false);
    setDragNode(null);
  }, [wireStart, wireEnd, nodes, screenToCanvas, onCreateConnection]);

  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: CanvasNode) => {
    if (spaceDown || e.button === PAN_BUTTON || wireStart) return;
    e.stopPropagation();
    setDragNode({
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [spaceDown, wireStart]);

  const handleHandlePointerDown = useCallback((e: React.PointerEvent, nodeId: string, side: Side, hx: number, hy: number) => {
    e.stopPropagation();
    e.preventDefault();
    setWireStart({ nodeId, side, x: hx, y: hy });
    setWireEnd({ x: hx, y: hy });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) { setSpaceDown(true); e.preventDefault(); }
      if (e.code === "Escape" && wireStart) { setWireStart(null); setWireEnd(null); setHoverNodeId(null); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [wireStart]);

  const fitToView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 80;
    const scaleX = (rect.width - padding * 2) / contentW;
    const scaleY = (rect.height - padding * 2) / contentH;
    const zoom = clampZoom(Math.min(scaleX, scaleY));
    const cx = minX + contentW / 2;
    const cy = minY + contentH / 2;
    setViewport({
      zoom,
      x: rect.width / 2 - cx * zoom,
      y: rect.height / 2 - cy * zoom,
    });
  }, [nodes, clampZoom]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(fitToView, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const zoomIn = () => setViewport(prev => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return prev;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = clampZoom(prev.zoom + ZOOM_STEP);
    const ratio = newZoom / prev.zoom;
    return { zoom: newZoom, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
  });

  const zoomOut = () => setViewport(prev => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return prev;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = clampZoom(prev.zoom - ZOOM_STEP);
    const ratio = newZoom / prev.zoom;
    return { zoom: newZoom, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const resolvedConnections = connections.map(conn => {
    const fromNode = nodeMap.get(conn.fromId);
    const toNode = nodeMap.get(conn.toId);
    if (!fromNode || !toNode) return null;
    const fromSide = conn.fromSide || "right";
    const toSide = conn.toSide || "left";
    const from = getAnchorPoint(fromNode, fromSide);
    const to = getAnchorPoint(toNode, toSide);
    return { ...conn, from, to, fromSide, toSide };
  }).filter(Boolean);

  const connCount = resolvedConnections.length;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none",
        spaceDown || isPanning ? "cursor-grab" : wireStart ? "cursor-crosshair" : "cursor-default",
        isPanning && "cursor-grabbing",
        className
      )}
      style={{ background: '#000000' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={e => e.preventDefault()}
      data-testid="infinite-canvas"
    >
      <style>{`
        @keyframes canvas-flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes canvas-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes canvas-glow-ring {
          0%, 100% { box-shadow: 0 0 8px 2px ${accentColor}40, 0 0 16px 4px ${accentColor}20; }
          50% { box-shadow: 0 0 12px 4px ${accentColor}60, 0 0 24px 8px ${accentColor}30; }
        }
        .canvas-node-selected {
          animation: canvas-glow-ring 2s ease-in-out infinite;
        }
        .canvas-flow-line {
          animation: canvas-flow 1s linear infinite;
        }
        .canvas-dot-pulse {
          animation: canvas-pulse 2s ease-in-out infinite;
        }
        .proto-handle {
          transition: r 0.15s ease, fill 0.15s ease;
        }
        .proto-handle:hover {
          r: ${HANDLE_RADIUS + 2};
          fill: ${accentColor};
          cursor: crosshair;
        }
        .canvas-node-hover-target {
          outline: 2px dashed ${accentColor} !important;
          outline-offset: 6px !important;
        }
      `}</style>

      {showGrid && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`,
              backgroundSize: `${gridSize * viewport.zoom}px ${gridSize * viewport.zoom}px`,
              backgroundPosition: `${viewport.x % (gridSize * viewport.zoom)}px ${viewport.y % (gridSize * viewport.zoom)}px`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(6,182,212,0.15) 1.5px, transparent 1.5px)`,
              backgroundSize: `${gridSize * 5 * viewport.zoom}px ${gridSize * 5 * viewport.zoom}px`,
              backgroundPosition: `${viewport.x % (gridSize * 5 * viewport.zoom)}px ${viewport.y % (gridSize * 5 * viewport.zoom)}px`,
            }}
          />
        </div>
      )}

      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <marker id="canvas-arrow" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3.5 L 0 7 Z" fill={connectionColor} />
          </marker>
          <marker id="canvas-arrow-accent" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3.5 L 0 7 Z" fill={accentColor} />
          </marker>
          <marker id="canvas-arrow-blue" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3.5 L 0 7 Z" fill="#3b82f6" />
          </marker>
          <filter id="canvas-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="proto-wire-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="canvas-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {resolvedConnections.map((conn, i) => {
            if (!conn) return null;
            const isSelected = conn.fromId === selectedNodeId || conn.toId === selectedNodeId;
            const isProtoConn = prototypeMode;
            const pathColor = isProtoConn ? "#3b82f6" : conn.color || (isSelected ? accentColor : connectionColor);
            const pathD = buildBezierPath(conn.from, conn.to, conn.fromSide, conn.toSide);
            return (
              <g key={`${conn.fromId}-${conn.toId}-${i}`}>
                {(isSelected || isProtoConn) && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isProtoConn ? "#3b82f6" : accentColor}
                    strokeWidth={8}
                    opacity={0.1}
                    filter={isProtoConn ? "url(#proto-wire-glow)" : "url(#canvas-glow)"}
                  />
                )}
                <path
                  d={pathD}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth={isSelected || isProtoConn ? 2.5 : 1.5}
                  strokeDasharray={conn.dashed ? "6 4" : undefined}
                  markerEnd={isProtoConn ? "url(#canvas-arrow-blue)" : isSelected ? "url(#canvas-arrow-accent)" : "url(#canvas-arrow)"}
                  style={prototypeMode && (onDeleteConnection || onLabelConnection) ? { cursor: "pointer", pointerEvents: "stroke" } : undefined}
                  onClick={prototypeMode && (onDeleteConnection || onLabelConnection) ? (e) => {
                    e.stopPropagation();
                    // Shift-click = label this connection (so it can show
                    // up as a custom branch button in the published reader).
                    // Plain click stays as the existing delete shortcut.
                    if (e.shiftKey && onLabelConnection) {
                      onLabelConnection(conn.fromId, conn.toId);
                    } else if (onDeleteConnection) {
                      onDeleteConnection(conn.fromId, conn.toId);
                    }
                  } : undefined}
                />
                {(isSelected || isProtoConn) && !conn.dashed && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isProtoConn ? "#3b82f6" : accentColor}
                    strokeWidth={2}
                    strokeDasharray="4 20"
                    className="canvas-flow-line"
                    opacity={0.6}
                  />
                )}
                {conn.label && (
                  <>
                    <rect
                      x={(conn.from.x + conn.to.x) / 2 - conn.label.length * 3.2 - 6}
                      y={(conn.from.y + conn.to.y) / 2 - 18}
                      width={conn.label.length * 6.4 + 12}
                      height={16}
                      rx={4}
                      fill="rgba(0,0,0,0.7)"
                      stroke={isSelected ? accentColor : "rgba(255,255,255,0.1)"}
                      strokeWidth={0.5}
                    />
                    <text
                      x={(conn.from.x + conn.to.x) / 2}
                      y={(conn.from.y + conn.to.y) / 2 - 7}
                      fill={isSelected ? accentColor : "rgba(255,255,255,0.6)"}
                      fontSize="10"
                      fontFamily="'Space Grotesk', ui-monospace, monospace"
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  </>
                )}
                <circle
                  cx={conn.from.x}
                  cy={conn.from.y}
                  r={isSelected || isProtoConn ? 4 : 3}
                  fill={isProtoConn ? "#3b82f6" : isSelected ? accentColor : pathColor}
                  className={isSelected ? "canvas-dot-pulse" : ""}
                />
                <circle
                  cx={conn.to.x}
                  cy={conn.to.y}
                  r={isSelected || isProtoConn ? 4 : 3}
                  fill={isProtoConn ? "#3b82f6" : isSelected ? accentColor : pathColor}
                />
              </g>
            );
          })}

          {wireStart && wireEnd && (
            <path
              d={buildBezierPath(wireStart, wireEnd, wireStart.side, hoverNodeId ? closestSide(nodeMap.get(hoverNodeId)!, wireEnd.x, wireEnd.y) : "left")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="8 4"
              markerEnd="url(#canvas-arrow-blue)"
              opacity={0.8}
            />
          )}

          {prototypeMode && nodes.map(node => {
            const handles = getHandlePositions(node);
            return handles.map(h => (
              <circle
                key={`${node.id}-${h.side}`}
                cx={h.x}
                cy={h.y}
                r={HANDLE_RADIUS}
                fill="rgba(59,130,246,0.3)"
                stroke="#3b82f6"
                strokeWidth={2}
                className="proto-handle"
                style={{ cursor: "crosshair", pointerEvents: "all" }}
                onPointerDown={(e) => handleHandlePointerDown(e, node.id, h.side, h.x, h.y)}
                data-testid={`handle-${node.id}-${h.side}`}
              />
            ));
          })}
        </g>
      </svg>

      <div
        className="absolute"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id;
          const isHoverTarget = hoverNodeId === node.id;
          return (
            <div
              key={node.id}
              className={cn(
                "absolute transition-shadow duration-200",
                isSelected && "canvas-node-selected rounded-lg",
                isHoverTarget && "canvas-node-hover-target rounded-lg",
                dragNode?.id === node.id && "z-50"
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                cursor: "grab",
                ...(isSelected ? {
                  outline: `2px solid ${accentColor}`,
                  outlineOffset: "3px",
                  borderRadius: "6px",
                } : {}),
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onClick={(e) => { e.stopPropagation(); if (!dragNode && !wireStart) onNodeClick?.(node.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); onNodeDoubleClick?.(node.id); }}
              data-testid={`canvas-node-${node.id}`}
            >
              {renderNode(node)}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/70 border border-zinc-800 rounded-xl p-1 backdrop-blur-xl z-20 shadow-lg shadow-black/40" data-testid="canvas-zoom-controls">
        <button onClick={zoomOut} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all" data-testid="button-zoom-out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-zinc-500 min-w-[3rem] text-center tabular-nums" data-testid="text-zoom-level">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button onClick={zoomIn} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all" data-testid="button-zoom-in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-zinc-800 mx-0.5" />
        <button onClick={fitToView} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all" data-testid="button-fit-view" title="Fit to view">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-3 z-20" data-testid="canvas-hud">
        <div className="flex items-center gap-2 bg-black/70 border border-zinc-800 rounded-xl px-3 py-1.5 backdrop-blur-xl shadow-lg shadow-black/40">
          <Layers className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{nodes.length}</span>
          <div className="w-px h-3 bg-zinc-800" />
          <GitBranch className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{connCount}</span>
        </div>
      </div>

      {showMinimap && nodes.length > 1 && (
        <Minimap nodes={nodes} viewport={viewport} containerRef={containerRef} selectedNodeId={selectedNodeId} connections={resolvedConnections} accentColor={prototypeMode ? "#3b82f6" : accentColor} />
      )}

      {prototypeMode && !wireStart && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-900/70 text-blue-300 text-[11px] font-mono px-4 py-2 rounded-xl border border-blue-700/50 z-20 pointer-events-none backdrop-blur-xl flex items-center gap-2 shadow-lg shadow-black/40">
          <LinkIcon className="w-3 h-3" />
          Prototype Mode — Drag handles to connect screens
        </div>
      )}

      {wireStart && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-900/70 text-blue-200 text-[11px] font-mono px-4 py-2 rounded-xl border border-blue-500/50 z-20 pointer-events-none backdrop-blur-xl flex items-center gap-2 shadow-lg shadow-black/40">
          <LinkIcon className="w-3 h-3 text-blue-400" />
          Release on a target screen to connect — ESC to cancel
        </div>
      )}

      {(spaceDown || isPanning) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-zinc-400 text-[11px] font-mono px-4 py-2 rounded-xl border border-zinc-800 z-20 pointer-events-none backdrop-blur-xl flex items-center gap-2 shadow-lg shadow-black/40">
          <MousePointer2 className="w-3 h-3" style={{ color: accentColor }} />
          Pan Mode
        </div>
      )}
    </div>
  );
}

function Minimap({ nodes, viewport, containerRef, selectedNodeId, connections, accentColor }: {
  nodes: CanvasNode[];
  viewport: { x: number; y: number; zoom: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedNodeId?: string | null;
  connections: any[];
  accentColor: string;
}) {
  if (nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const mmW = 160;
  const mmH = Math.max(60, Math.min(120, (contentH / contentW) * mmW));
  const scale = mmW / contentW;

  const rect = containerRef.current?.getBoundingClientRect();
  const vw = rect ? rect.width / viewport.zoom : 0;
  const vh = rect ? rect.height / viewport.zoom : 0;
  const vx = (-viewport.x / viewport.zoom - minX) * scale;
  const vy = (-viewport.y / viewport.zoom - minY) * scale;

  return (
    <div
      className="absolute bottom-4 right-4 bg-black/80 border border-zinc-800 rounded-xl overflow-hidden z-20 backdrop-blur-xl shadow-lg shadow-black/40"
      style={{ width: mmW, height: mmH }}
      data-testid="canvas-minimap"
    >
      <svg width={mmW} height={mmH}>
        {connections.map((conn: any, i: number) => conn && (
          <line
            key={i}
            x1={(conn.from.x - minX) * scale}
            y1={(conn.from.y - minY) * scale}
            x2={(conn.to.x - minX) * scale}
            y2={(conn.to.y - minY) * scale}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.5}
          />
        ))}
        {nodes.map(n => (
          <rect
            key={n.id}
            x={(n.x - minX) * scale}
            y={(n.y - minY) * scale}
            width={n.width * scale}
            height={n.height * scale}
            fill={n.id === selectedNodeId ? accentColor : "rgba(255,255,255,0.2)"}
            rx={1}
          />
        ))}
        <rect
          x={vx}
          y={vy}
          width={vw * scale}
          height={vh * scale}
          fill="none"
          stroke={accentColor}
          strokeWidth={1}
          rx={2}
          opacity={0.8}
        />
      </svg>
    </div>
  );
}
