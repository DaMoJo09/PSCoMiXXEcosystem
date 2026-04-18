import { getStroke } from "perfect-freehand";
import type { BrushProfile, PressureCurve, RawInputPoint, StabilizationLevel } from "./types";

/**
 * INKBLADE renderer.
 *
 * Pipeline (matches the spec):
 *   Raw Input → Pressure remap → Stabilization → Interpolation → Stroke geometry
 *
 * Stabilization is applied to position only, NEVER to pressure. Flattening
 * pressure variation is what makes Wacom users uninstall.
 */

function bezierY(t: number, c: PressureCurve): number {
  // Cubic Bezier from (0,0) → (cp1) → (cp2) → (1,1), evaluated at parameter t.
  const u = 1 - t;
  return 3 * u * u * t * c.cp1y + 3 * u * t * t * c.cp2y + t * t * t;
}

export function remapPressure(raw: number, brush: BrushProfile, hasPressureData: boolean): number {
  if (!hasPressureData) return 0.5; // mouse / pressure-less devices
  const lo = brush.minPressure;
  const hi = brush.maxPressure;
  if (raw <= lo) return 0;
  if (raw >= hi) return 1;
  const t = (raw - lo) / (hi - lo);
  return bezierY(t, brush.pressureCurve);
}

const STABILIZATION_WINDOW: Record<StabilizationLevel, number> = {
  none: 1,
  light: 3,
  standard: 6,
  heavy: 12,
};

/** Position-only weighted average. Pressure & tilt pass through untouched. */
export function stabilizePoints(points: RawInputPoint[], level: StabilizationLevel): RawInputPoint[] {
  const window = STABILIZATION_WINDOW[level] ?? 1;
  if (window <= 1 || points.length < 2) return points;
  const out: RawInputPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - window + 1);
    let sx = 0, sy = 0, w = 0;
    for (let j = start; j <= i; j++) {
      const weight = j - start + 1; // newer points weigh more
      sx += points[j].x * weight;
      sy += points[j].y * weight;
      w += weight;
    }
    out.push({ ...points[i], x: sx / w, y: sy / w });
  }
  return out;
}

/** Build the stroke outline polygon for a stroke using perfect-freehand. */
export function buildStrokeOutline(
  rawPoints: RawInputPoint[],
  brush: BrushProfile,
): number[][] {
  if (rawPoints.length === 0) return [];

  const stabilized = stabilizePoints(rawPoints, brush.stabilization);

  const inputs = stabilized.map(p => [
    p.x,
    p.y,
    remapPressure(p.pressure, brush, p.hasPressureData),
  ] as [number, number, number]);

  const stroke = getStroke(inputs, {
    size: brush.size,
    thinning: brush.thinning,
    smoothing: brush.smoothing,
    streamline: brush.streamline,
    easing: t => t,
    simulatePressure: false, // we ALWAYS pass real pressure when we have it
    last: true,
    start: { taper: brush.size * brush.taperStart, easing: t => t },
    end:   { taper: brush.size * brush.taperEnd,   easing: t => t },
  });

  return stroke;
}

export function strokeOutlineToSvgPath(outline: number[][]): string {
  if (outline.length === 0) return "";
  const d = outline.reduce(
    (acc, [x, y], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : "");
      acc.push(`Q ${x.toFixed(2)} ${y.toFixed(2)} ${((x + x1) / 2).toFixed(2)} ${((y + y1) / 2).toFixed(2)}`);
      return acc;
    },
    [] as string[],
  );
  d.push("Z");
  return d.filter(Boolean).join(" ");
}
