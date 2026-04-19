import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { useStylusInput } from "@/lib/inkblade/useStylusInput";
import { buildStrokeOutline, strokeOutlineToSvgPath } from "@/lib/inkblade/renderer";
import type { BrushProfile, RawInputPoint } from "@/lib/inkblade/types";
import { getBrush } from "@/lib/inkblade/brushes";
import { BrushCursor } from "./BrushCursor";

interface InkStroke {
  id: string;
  brushId: string;
  color: string;
  opacity: number;
  path: string;
}

export interface InkbladeCanvasHandle {
  /** Rasterize current strokes to a PNG data URL at the live pixel size. */
  toDataURL: () => string | null;
  /** Drop all strokes. */
  clear: () => void;
  /** True if anything has been drawn. */
  hasContent: () => boolean;
  /** Live pixel dimensions of the host element. */
  getSize: () => { width: number; height: number };
}

interface Props {
  /** Explicit pixel width. Ignored when `fill` is true. */
  width?: number;
  /** Explicit pixel height. Ignored when `fill` is true. */
  height?: number;
  /** Stretch to fill parent and resize via ResizeObserver. */
  fill?: boolean;
  /** Full brush profile — wins over brushId/color when provided. */
  brush?: BrushProfile;
  brushId?: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  onStrokeComplete?: (stroke: InkStroke, raw: RawInputPoint[]) => void;
  /** Show a live readout of raw pressure / tilt / pointer type — used to verify Wacom hookup. */
  showDebugOverlay?: boolean;
}

/**
 * INKBLADE canvas — stylus-first drawing surface.
 * Same component used in Comic Builder, Motion Studio, and FX. Identical behavior.
 */
export const InkbladeCanvas = forwardRef<InkbladeCanvasHandle, Props>(function InkbladeCanvas(
  { width: widthProp, height: heightProp, fill = false, brush: brushProp, brushId = "core", color, className, style, onStrokeComplete, showDebugOverlay = false },
  apiRef
) {
  const brush: BrushProfile = brushProp
    ? brushProp
    : { ...getBrush(brushId), color: color ?? getBrush(brushId).color };
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const activeRawRef = useRef<RawInputPoint[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const [cursor, setCursor] = useState<{ x: number; y: number; size: number; tiltX: number; tiltY: number } | null>(null);
  const [lastRaw, setLastRaw] = useState<RawInputPoint | null>(null);

  // Live pixel dimensions — measured from the host element when `fill` is set.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: widthProp ?? 0, h: heightProp ?? 0 });
  const hostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!fill || !hostRef.current) return;
    const el = hostRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const w = fill ? size.w : (widthProp ?? 0);
  const h = fill ? size.h : (heightProp ?? 0);

  const handleStart = useCallback((p: RawInputPoint) => {
    activeRawRef.current = [p];
    setActivePath("");
  }, []);

  const handleMove = useCallback((p: RawInputPoint, batch: RawInputPoint[]) => {
    setCursor({ x: p.x, y: p.y, size: brush.size * (0.5 + p.pressure), tiltX: p.tiltX, tiltY: p.tiltY });
    setLastRaw(p);
    if (activeRawRef.current.length === 0) return;
    activeRawRef.current.push(...batch);
    const outline = buildStrokeOutline(activeRawRef.current, brush);
    setActivePath(strokeOutlineToSvgPath(outline));
  }, [brush]);

  const handleEnd = useCallback((p: RawInputPoint) => {
    const points = [...activeRawRef.current, p];
    activeRawRef.current = [];
    if (points.length < 2) {
      setActivePath("");
      return;
    }
    const outline = buildStrokeOutline(points, brush);
    const path = strokeOutlineToSvgPath(outline);
    const stroke: InkStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      brushId: brush.id,
      color: brush.color,
      opacity: brush.opacity,
      path,
    };
    setStrokes(prev => [...prev, stroke]);
    setActivePath("");
    onStrokeComplete?.(stroke, points);
  }, [brush, onStrokeComplete]);

  const { ref: inputRef } = useStylusInput({
    onStrokeStart: handleStart,
    onStrokeMove: handleMove,
    onStrokeEnd: handleEnd,
  });

  // Merge the input ref (callback ref from useStylusInput) with our host ref.
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    hostRef.current = node;
    if (typeof inputRef === "function") {
      (inputRef as (n: HTMLElement | null) => void)(node);
    } else if (inputRef) {
      (inputRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  }, [inputRef]);

  const strokesRef = useRef(strokes);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  useImperativeHandle(apiRef, () => ({
    hasContent: () => strokesRef.current.length > 0,
    getSize: () => ({ width: w, height: h }),
    clear: () => { setStrokes([]); setActivePath(""); activeRawRef.current = []; },
    toDataURL: () => {
      const list = strokesRef.current;
      if (list.length === 0 || w <= 0 || h <= 0) return null;
      const cnv = document.createElement("canvas");
      cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext("2d");
      if (!ctx) return null;
      // Draw strokes directly via Path2D — synchronous, no SVG decode required.
      ctx.clearRect(0, 0, w, h);
      for (const s of list) {
        const p2d = new Path2D(s.path);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.opacity;
        ctx.fill(p2d);
      }
      ctx.globalAlpha = 1;
      return cnv.toDataURL("image/png");
    },
  }), [w, h]);

  return (
    <div
      ref={setRefs}
      data-testid="inkblade-canvas"
      className={className}
      style={{
        width: fill ? "100%" : w || undefined,
        height: fill ? "100%" : h || undefined,
        touchAction: "none",
        cursor: "none",
        position: "relative",
        ...style,
      }}
    >
      {w > 0 && h > 0 && (
        <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {strokes.map(s => (
            <path key={s.id} d={s.path} fill={s.color} opacity={s.opacity} />
          ))}
          {activePath && <path d={activePath} fill={brush.color} opacity={brush.opacity} />}
        </svg>
      )}
      {cursor && (
        <BrushCursor
          x={cursor.x}
          y={cursor.y}
          size={Math.max(4, cursor.size)}
          tiltX={brush.tiltToEllipse ? cursor.tiltX : 0}
          tiltY={brush.tiltToEllipse ? cursor.tiltY : 0}
          color={brush.color}
        />
      )}
      {showDebugOverlay && (
        <div
          data-testid="inkblade-debug"
          className="absolute top-1 right-1 px-2 py-1 text-[10px] font-mono bg-black/80 text-emerald-300 border border-emerald-700/40 pointer-events-none select-none"
          style={{ lineHeight: 1.35 }}
        >
          <div>type: {lastRaw?.pointerType ?? "—"}</div>
          <div>pressure: {(lastRaw?.pressure ?? 0).toFixed(3)} {lastRaw?.hasPressureData === false ? "(no sensor)" : ""}</div>
          <div>tilt: {(lastRaw?.tiltX ?? 0).toFixed(0)}°, {(lastRaw?.tiltY ?? 0).toFixed(0)}°</div>
          <div>twist: {(lastRaw?.twist ?? 0).toFixed(0)}°</div>
          <div>strokes: {strokes.length}</div>
        </div>
      )}
    </div>
  );
});
