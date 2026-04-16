import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight, Settings2 } from "lucide-react";

export interface ParallaxLayer {
  id: string;
  dataUrl: string;
  depth: number;
  speedMultiplier: number;
  offsetY: number;
  opacity: number;
  label: string;
}

interface Props {
  panoramaUrl: string;
  panoramaWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  parallaxLayers?: ParallaxLayer[];
  scrollSpeed?: number;
  direction?: "forward" | "backward";
  loop?: boolean;
  autoPlay?: boolean;
}

export default function HopPanPlayer({
  panoramaUrl,
  panoramaWidth,
  viewportWidth,
  viewportHeight,
  parallaxLayers = [],
  scrollSpeed: initialSpeed = 60,
  direction: initialDir = "forward",
  loop: initialLoop = true,
  autoPlay = false,
}: Props) {
  const [playing, setPlaying] = useState(autoPlay);
  const [offset, setOffset] = useState(0);
  const [speed, setSpeed] = useState(initialSpeed);
  const [direction, setDirection] = useState(initialDir);
  const [loop, setLoop] = useState(initialLoop);
  const [showControls, setShowControls] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const maxOffset = Math.max(0, panoramaWidth - viewportWidth);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setOffset(prev => {
      const delta = speed * dt * (direction === "forward" ? 1 : -1);
      let next = prev + delta;
      if (loop) {
        if (next > maxOffset) next = 0;
        if (next < 0) next = maxOffset;
      } else {
        next = Math.max(0, Math.min(maxOffset, next));
        if (next === 0 || next === maxOffset) {
          setPlaying(false);
          return next;
        }
      }
      return next;
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [speed, direction, loop, maxOffset]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, animate]);

  const progress = maxOffset > 0 ? (offset / maxOffset) * 100 : 0;

  return (
    <div className="relative overflow-hidden bg-black" style={{ width: viewportWidth, height: viewportHeight }} data-testid="pan-player">
      {parallaxLayers.sort((a, b) => a.depth - b.depth).map(layer => (
        <div
          key={layer.id}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${layer.dataUrl})`,
            backgroundSize: `auto ${viewportHeight}px`,
            backgroundPosition: `${-(offset * layer.speedMultiplier)}px ${layer.offsetY}px`,
            backgroundRepeat: "repeat-x",
            opacity: layer.opacity,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${panoramaUrl})`,
          backgroundSize: `${panoramaWidth}px ${viewportHeight}px`,
          backgroundPosition: `${-offset}px 0`,
          backgroundRepeat: loop ? "repeat-x" : "no-repeat",
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <button onClick={() => setPlaying(!playing)} className="text-white hover:text-zinc-300 transition" data-testid="button-pan-play">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={() => { setOffset(0); setPlaying(false); }} className="text-zinc-400 hover:text-white transition">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDirection(d => d === "forward" ? "backward" : "forward")} className="text-zinc-400 hover:text-white transition" data-testid="button-pan-direction">
          {direction === "forward" ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 h-1 bg-zinc-800 rounded-full relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setOffset(pct * maxOffset);
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-none" style={{ width: `${progress}%` }} />
        </div>

        <button onClick={() => setShowControls(!showControls)} className="text-zinc-400 hover:text-white transition">
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        <span className="text-[9px] text-zinc-500">{Math.round(offset)}px / {Math.round(maxOffset)}px</span>
      </div>

      {showControls && (
        <div className="absolute top-2 right-2 bg-zinc-900/95 border border-zinc-800 p-2 space-y-2 text-[10px] min-w-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Speed</span>
            <input type="range" min={10} max={300} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-16 accent-white" data-testid="slider-pan-speed" />
            <span className="text-zinc-300 w-8 text-right">{speed}px/s</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Loop</span>
            <button onClick={() => setLoop(!loop)} className={`px-2 py-0.5 text-[9px] font-bold ${loop ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`} data-testid="button-pan-loop">
              {loop ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
