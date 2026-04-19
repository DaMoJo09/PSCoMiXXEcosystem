import type { CSSProperties } from "react";

interface Props {
  /** Cursor center, in container coordinates. */
  x: number;
  y: number;
  /** Effective brush radius in CSS pixels — already scaled by live pressure. */
  size: number;
  /** Pen tilt in degrees, used to squash the cursor into an ellipse. */
  tiltX?: number;
  tiltY?: number;
  /** Brush stroke color — drives the cursor outline tint so it's visible on every background. */
  color?: string;
  /** Optional fill — usually omitted so the cursor is a thin ring. */
  filled?: boolean;
}

/**
 * Brush cursor preview that tracks the pen and reflects pressure + tilt live.
 *
 * Why a separate component:
 *   - Reused by both InkbladeCanvas and any future tool that wants a brush
 *     preview (lasso, eraser, smudge).
 *   - Keeps render cost trivial — pure DOM, no SVG, GPU-accelerated transform.
 *   - Tilt → elliptical squash matches Photoshop / Procreate behavior so
 *     Wacom users immediately recognize the feedback.
 */
export function BrushCursor({ x, y, size, tiltX = 0, tiltY = 0, color = "#000", filled = false }: Props) {
  // Tilt magnitude (0..1) — flattens the cursor in the tilt direction.
  const tiltMag = Math.min(1, Math.hypot(tiltX, tiltY) / 60);
  const tiltAngle = Math.atan2(tiltY, tiltX) * (180 / Math.PI);
  const sx = 1;
  const sy = 1 - tiltMag * 0.5;

  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: size,
    height: size,
    borderRadius: "50%",
    border: `1px solid ${color}`,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.6)",
    background: filled ? color : "transparent",
    pointerEvents: "none",
    transform: `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${tiltAngle.toFixed(1)}deg) scale(${sx}, ${sy.toFixed(3)})`,
    transformOrigin: "center",
    willChange: "transform",
  };
  return <div aria-hidden data-testid="brush-cursor" style={style} />;
}
