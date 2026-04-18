/**
 * INKBLADE — Stylus-first brush engine types.
 *
 * Core principle: stylus input is the source of truth. Capture RAW.
 * Never normalize, clamp, or smooth at the input layer — only at render time.
 */

export type PointerSource = "pen" | "touch" | "mouse";

/** Single raw input sample — exactly what the device gave us, untouched. */
export interface RawInputPoint {
  x: number;
  y: number;
  pressure: number;     // 0..1, raw from device. 0.5 used only when device truly has none.
  tiltX: number;        // -90..90, 0 if unsupported
  tiltY: number;        // -90..90, 0 if unsupported
  twist: number;        // 0..359, 0 if unsupported
  width: number;        // contact width fallback
  height: number;       // contact height fallback
  pointerId: number;
  pointerType: PointerSource;
  timestamp: number;    // performance.now()
  hasPressureData: boolean; // false for mouse / pen with no pressure sensor
}

export type StabilizationLevel = "none" | "light" | "standard" | "heavy";

/** Bezier-style pressure curve. Two control points between (0,0) and (1,1). */
export interface PressureCurve {
  cp1x: number; cp1y: number;
  cp2x: number; cp2y: number;
}

export const PRESSURE_PRESETS: Record<string, PressureCurve> = {
  // Light hand — amplifies low pressure so soft strokes still register
  light:   { cp1x: 0.20, cp1y: 0.50, cp2x: 0.50, cp2y: 0.85 },
  // Medium hand — gentle S-curve, the default
  medium:  { cp1x: 0.30, cp1y: 0.20, cp2x: 0.70, cp2y: 0.80 },
  // Heavy hand — requires more pressure for max width
  heavy:   { cp1x: 0.50, cp1y: 0.15, cp2x: 0.80, cp2y: 0.50 },
  // Match Wacom driver — straight line, trust the driver's curve entirely
  wacom:   { cp1x: 0.33, cp1y: 0.33, cp2x: 0.67, cp2y: 0.67 },
};

export interface BrushProfile {
  id: string;
  name: string;
  size: number;              // base size in px
  minPressure: number;       // 0..1 — pressures below this register as 0
  maxPressure: number;       // 0..1 — pressures above this clamp to 1
  pressureCurve: PressureCurve;
  pressureToSize: number;    // 0..1 — how much pressure modulates size
  pressureToOpacity: number; // 0..1 — how much pressure modulates opacity
  stabilization: StabilizationLevel;
  taperStart: number;        // 0..1
  taperEnd: number;          // 0..1
  thinning: number;          // -1..1 — perfect-freehand thinning param
  smoothing: number;         // 0..1 — perfect-freehand smoothing
  streamline: number;        // 0..1 — perfect-freehand streamline
  tiltToEllipse: boolean;    // tilt rotates / squashes the brush
  textureGrain: number;      // 0..1
  color: string;
  opacity: number;           // 0..1 base opacity
}

export type ModeId = "layout" | "ink" | "color" | "motion" | "fx" | "text";
