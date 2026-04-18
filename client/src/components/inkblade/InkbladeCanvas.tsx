import { useCallback, useRef, useState } from "react";
import { useStylusInput } from "@/lib/inkblade/useStylusInput";
import { buildStrokeOutline, strokeOutlineToSvgPath } from "@/lib/inkblade/renderer";
import type { BrushProfile, RawInputPoint } from "@/lib/inkblade/types";
import { getBrush } from "@/lib/inkblade/brushes";

interface InkStroke {
  id: string;
  brushId: string;
  color: string;
  opacity: number;
  path: string;
}

interface Props {
  width: number;
  height: number;
  brushId?: string;
  color?: string;
  className?: string;
  onStrokeComplete?: (stroke: InkStroke, raw: RawInputPoint[]) => void;
}

/**
 * INKBLADE canvas — stylus-first drawing surface.
 * Same component used in Comic Builder, Motion Studio, and FX. Identical behavior.
 */
export function InkbladeCanvas({
  width,
  height,
  brushId = "core",
  color,
  className,
  onStrokeComplete,
}: Props) {
  const brush: BrushProfile = { ...getBrush(brushId), color: color ?? getBrush(brushId).color };
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const activeRawRef = useRef<RawInputPoint[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const [cursor, setCursor] = useState<{ x: number; y: number; size: number } | null>(null);

  const handleStart = useCallback((p: RawInputPoint) => {
    activeRawRef.current = [p];
    setActivePath("");
  }, []);

  const handleMove = useCallback((p: RawInputPoint, batch: RawInputPoint[]) => {
    setCursor({ x: p.x, y: p.y, size: brush.size * (0.5 + p.pressure) });
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

  const { ref } = useStylusInput({
    onStrokeStart: handleStart,
    onStrokeMove: handleMove,
    onStrokeEnd: handleEnd,
  });

  return (
    <div
      ref={ref as any}
      data-testid="inkblade-canvas"
      className={className}
      style={{ width, height, touchAction: "none", cursor: "none", position: "relative" }}
    >
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {strokes.map(s => (
          <path key={s.id} d={s.path} fill={s.color} opacity={s.opacity} />
        ))}
        {activePath && <path d={activePath} fill={brush.color} opacity={brush.opacity} />}
      </svg>
      {cursor && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: cursor.x - cursor.size / 2,
            top: cursor.y - cursor.size / 2,
            width: cursor.size,
            height: cursor.size,
            borderRadius: "50%",
            border: "1px solid #000",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.6)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
