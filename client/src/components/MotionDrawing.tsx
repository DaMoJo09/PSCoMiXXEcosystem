import { useEffect, useRef, useState } from "react";

export interface MotionFrame {
  imageData?: string;
  duration?: number;
}

interface MotionDrawingProps {
  drawingData?: string;
  motionFrames?: MotionFrame[];
  isMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  draggable?: boolean;
  loop?: boolean;
  paused?: boolean;
  testId?: string;
}

export function MotionDrawing({
  drawingData,
  motionFrames,
  isMotion,
  className,
  style,
  alt = "",
  draggable = false,
  loop = true,
  paused = false,
  testId,
}: MotionDrawingProps) {
  const validFrames = (motionFrames || []).filter(f => typeof f?.imageData === "string" && f.imageData!.length > 0);
  const playable = !!isMotion && validFrames.length > 1 && !paused;

  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playable) return;
    let cancelled = false;
    const tick = (i: number) => {
      if (cancelled) return;
      setIdx(i);
      const dur = Math.max(33, validFrames[i]?.duration || 100);
      timerRef.current = window.setTimeout(() => {
        const next = i + 1;
        if (next >= validFrames.length) {
          if (loop) tick(0);
        } else {
          tick(next);
        }
      }, dur);
    };
    tick(0);
    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playable, validFrames.length, loop]);

  const src = playable
    ? (validFrames[Math.min(idx, validFrames.length - 1)]?.imageData || drawingData || "")
    : (validFrames[0]?.imageData || drawingData || "");

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      draggable={draggable}
      data-testid={testId}
    />
  );
}
