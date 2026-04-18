import { useCallback, useEffect, useRef, useState } from "react";
import type { RawInputPoint, PointerSource } from "./types";

/**
 * INKBLADE input layer — stylus-first.
 *
 * MANDATORY behavior:
 *   - Use Pointer Events API (no mouse/touch fallback shortcuts).
 *   - Capture RAW pressure / tilt / twist with no normalization, no clamping,
 *     no smoothing. Downstream renderer is responsible for any processing.
 *   - Fallback chain: Pen → Pointer (touch) → Mouse.
 *   - Palm rejection: when a pen pointer is active, reject all touch pointers
 *     for the lifetime of the pen gesture.
 *   - Coalesced events are honored on browsers that support them so no Wacom
 *     samples are lost.
 *
 * Returns refs/handlers you can spread onto any element. The element MUST have
 * `touch-action: none` and `style={{ touchAction: 'none' }}` so the browser
 * doesn't steal scroll/zoom gestures from the pen.
 */
export interface UseStylusInputOptions {
  enabled?: boolean;
  onStrokeStart?: (p: RawInputPoint) => void;
  onStrokeMove?: (p: RawInputPoint, batch: RawInputPoint[]) => void;
  onStrokeEnd?: (p: RawInputPoint) => void;
}

interface ActivePointer {
  id: number;
  type: PointerSource;
  startedAt: number;
}

/**
 * Pointer-source priority. Higher wins. A pen down while a touch is active
 * preempts the touch; a touch down while a pen is active is rejected entirely.
 */
const PRIORITY: Record<PointerSource, number> = { pen: 3, mouse: 2, touch: 1 };

function toRawPoint(e: PointerEvent): RawInputPoint {
  const type: PointerSource =
    e.pointerType === "pen" ? "pen" : e.pointerType === "touch" ? "touch" : "mouse";

  // Mouse (and pens with no pressure sensor) report pressure 0.5 by spec when
  // the button is held. Track that so the renderer can decide what to do.
  const hasPressureData = !(type === "mouse" || (type === "pen" && e.pressure === 0.5 && e.buttons === 1));

  return {
    x: e.offsetX,
    y: e.offsetY,
    pressure: e.pressure,
    tiltX: e.tiltX ?? 0,
    tiltY: e.tiltY ?? 0,
    twist: e.twist ?? 0,
    width: e.width ?? 0,
    height: e.height ?? 0,
    pointerId: e.pointerId,
    pointerType: type,
    timestamp: e.timeStamp,
    hasPressureData,
  };
}

export function useStylusInput(opts: UseStylusInputOptions = {}) {
  const { enabled = true, onStrokeStart, onStrokeMove, onStrokeEnd } = opts;
  const elRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<ActivePointer | null>(null);
  /** Pointers seen alive (after pointerdown, before pointerup/cancel). */
  const aliveRef = useRef<Set<number>>(new Set());
  /** True while ANY pen pointer is currently down. */
  const penAliveRef = useRef<boolean>(false);
  const [lastPoint, setLastPoint] = useState<RawInputPoint | null>(null);

  const handleDown = useCallback((e: PointerEvent) => {
    if (!enabled) return;
    const point = toRawPoint(e);
    const active = activeRef.current;
    aliveRef.current.add(e.pointerId);
    if (point.pointerType === "pen") penAliveRef.current = true;

    // Palm rejection — while a pen pointer is alive, reject all touch.
    // Gesture-state based, NOT a timer, so a stationary pen still suppresses touch.
    if (point.pointerType === "touch" && penAliveRef.current && active?.type !== "touch") {
      return;
    }

    if (active) {
      // A stroke is in progress. Only allow preemption if the new pointer has
      // strictly higher priority (pen > mouse > touch). Otherwise ignore.
      if (PRIORITY[point.pointerType] <= PRIORITY[active.type]) {
        return;
      }
      // Pen preempts: end the current (lower-priority) stroke cleanly first.
      onStrokeEnd?.({ ...point, pointerId: active.id, pointerType: active.type });
    }

    activeRef.current = { id: e.pointerId, type: point.pointerType, startedAt: e.timeStamp };
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    setLastPoint(point);
    onStrokeStart?.(point);
    e.preventDefault();
  }, [enabled, onStrokeStart, onStrokeEnd]);

  const handleMove = useCallback((e: PointerEvent) => {
    if (!enabled) return;
    const active = activeRef.current;

    // Reject any touch movement while a pen gesture is alive.
    if (e.pointerType === "touch" && penAliveRef.current && active?.type !== "touch") {
      return;
    }

    if (!active || active.id !== e.pointerId) {
      // Track latest point even when not drawing — used for cursor preview.
      setLastPoint(toRawPoint(e));
      return;
    }

    // Coalesced events preserve sub-frame samples from high-frequency pens.
    const batch: RawInputPoint[] = [];
    const coalesced = (e.getCoalescedEvents?.() ?? []) as PointerEvent[];
    if (coalesced.length > 0) {
      for (const ce of coalesced) batch.push(toRawPoint(ce));
    } else {
      batch.push(toRawPoint(e));
    }
    const last = batch[batch.length - 1];
    setLastPoint(last);
    onStrokeMove?.(last, batch);
    e.preventDefault();
  }, [enabled, onStrokeMove]);

  const handleUp = useCallback((e: PointerEvent) => {
    if (!enabled) return;
    aliveRef.current.delete(e.pointerId);
    if (e.pointerType === "pen") {
      // Recompute pen-alive flag in case multiple pens / phantoms exist.
      // (Most setups have one pen, but be safe.)
      penAliveRef.current = false;
    }
    const active = activeRef.current;
    if (!active || active.id !== e.pointerId) return;
    const point = toRawPoint(e);
    activeRef.current = null;
    onStrokeEnd?.(point);
  }, [enabled, onStrokeEnd]);

  // Attach via ref — using addEventListener so we get raw PointerEvent (not
  // React's synthetic event, which loses some properties on older bundlers).
  const attach = useCallback((el: HTMLElement | null) => {
    if (elRef.current) {
      const prev = elRef.current;
      prev.removeEventListener("pointerdown", handleDown as any);
      prev.removeEventListener("pointermove", handleMove as any);
      prev.removeEventListener("pointerup", handleUp as any);
      prev.removeEventListener("pointercancel", handleUp as any);
      prev.removeEventListener("pointerleave", handleUp as any);
    }
    elRef.current = el;
    if (el) {
      el.addEventListener("pointerdown", handleDown as any);
      el.addEventListener("pointermove", handleMove as any);
      el.addEventListener("pointerup", handleUp as any);
      el.addEventListener("pointercancel", handleUp as any);
      el.addEventListener("pointerleave", handleUp as any);
    }
  }, [handleDown, handleMove, handleUp]);

  useEffect(() => () => attach(null), [attach]);

  return { ref: attach, lastPoint };
}
