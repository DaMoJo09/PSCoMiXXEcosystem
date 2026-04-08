import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Plus, Zap } from "lucide-react";
import type { HopScene } from "@shared/schema";

interface BeatMarker {
  id: string;
  timePosition: number;
  label?: string;
  autoDetected: boolean;
}

interface HopWaveformTimelineProps {
  scenes: HopScene[];
  audioSrc?: string;
  audioBpm: number | null;
  beatMarkers: BeatMarker[];
  isPlaying: boolean;
  selectedSceneIdx: number;
  totalDuration: number;
  onSceneSelect: (idx: number) => void;
  onSceneUpdate: (id: string, updates: Partial<HopScene>) => void;
  onBeatMarkersChange: (markers: BeatMarker[]) => void;
  onPlayToggle: () => void;
  onAddScene: () => void;
}

function genId(prefix = "beat") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function detectBeats(audioBuffer: AudioBuffer): BeatMarker[] {
  const channel = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05);
  const markers: BeatMarker[] = [];
  const energies: number[] = [];

  for (let i = 0; i < channel.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, channel.length);
    for (let j = i; j < end; j++) {
      sum += channel[j] * channel[j];
    }
    energies.push(sum / (end - i));
  }

  const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
  const threshold = avgEnergy * 1.8;

  let lastBeatTime = -0.3;
  for (let i = 1; i < energies.length; i++) {
    const time = (i * windowSize) / sampleRate;
    if (energies[i] > threshold && energies[i] > energies[i - 1] && (time - lastBeatTime) > 0.2) {
      markers.push({
        id: genId("beat"),
        timePosition: Math.round(time * 100) / 100,
        autoDetected: true,
      });
      lastBeatTime = time;
    }
  }
  return markers;
}

export default function HopWaveformTimeline({
  scenes, audioSrc, audioBpm, beatMarkers, isPlaying, selectedSceneIdx,
  totalDuration, onSceneSelect, onSceneUpdate, onBeatMarkersChange,
  onPlayToggle, onAddScene,
}: HopWaveformTimelineProps) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isDraggingScene, setIsDraggingScene] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playheadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0 });

  const pixelsPerSecond = useMemo(() => 40 * zoom, [zoom]);
  const timelineWidth = useMemo(() => Math.max(totalDuration * pixelsPerSecond, 600), [totalDuration, pixelsPerSecond]);

  useEffect(() => {
    if (!audioSrc) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const loadAudio = async () => {
      try {
        const response = await fetch(audioSrc);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 800;
        const blockSize = Math.floor(rawData.length / samples);
        const waveform: number[] = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j] || 0);
          }
          waveform.push(sum / blockSize);
        }
        const max = Math.max(...waveform);
        setWaveformData(waveform.map(v => v / max));

        if (beatMarkers.length === 0) {
          const detected = detectBeats(audioBuffer);
          if (detected.length > 0) onBeatMarkersChange(detected);
        }
      } catch (err) {
        console.error("Waveform load error:", err);
      }
    };
    loadAudio();
    return () => { ctx.close().catch(() => {}); };
  }, [audioSrc]);

  useEffect(() => {
    if (isPlaying) {
      const start = Date.now() - playheadTime * 1000;
      playheadIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= totalDuration) {
          setPlayheadTime(0);
        } else {
          setPlayheadTime(elapsed);
        }
      }, 50);
    } else {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    }
    return () => { if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current); };
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayW, displayH);

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, displayW, displayH);

    if (waveformData.length > 0) {
      const barW = (timelineWidth / waveformData.length);
      const midY = displayH * 0.35;
      const ampH = displayH * 0.3;
      ctx.fillStyle = "#3b82f6";
      for (let i = 0; i < waveformData.length; i++) {
        const x = i * barW - scrollX;
        if (x < -barW || x > displayW) continue;
        const h = waveformData[i] * ampH;
        ctx.fillRect(x, midY - h, Math.max(barW - 1, 1), h * 2);
      }
    }

    beatMarkers.forEach(marker => {
      const x = marker.timePosition * pixelsPerSecond - scrollX;
      if (x < 0 || x > displayW) return;
      ctx.strokeStyle = marker.autoDetected ? "#f59e0b44" : "#f59e0b";
      ctx.lineWidth = 1;
      ctx.setLineDash(marker.autoDetected ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayH * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    let accTime = 0;
    scenes.forEach((scene, idx) => {
      const x = accTime * pixelsPerSecond - scrollX;
      const w = scene.duration * pixelsPerSecond;
      accTime += scene.duration;

      if (x + w < 0 || x > displayW) return;

      const isSelected = idx === selectedSceneIdx;
      ctx.fillStyle = isSelected ? "#f9731620" : "#27272a";
      ctx.strokeStyle = isSelected ? "#f97316" : "#3f3f46";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(x, displayH * 0.7, w, displayH * 0.28);
      ctx.strokeRect(x, displayH * 0.7, w, displayH * 0.28);

      ctx.fillStyle = isSelected ? "#f97316" : "#a1a1aa";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`S${idx + 1}`, x + w / 2, displayH * 0.7 + 14);
      ctx.fillStyle = "#71717a";
      ctx.font = "8px monospace";
      ctx.fillText(`${scene.duration}s`, x + w / 2, displayH * 0.7 + 24);
    });

    const phX = playheadTime * pixelsPerSecond - scrollX;
    if (phX >= 0 && phX <= displayW) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, displayH);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(phX - 5, 0);
      ctx.lineTo(phX + 5, 0);
      ctx.lineTo(phX, 8);
      ctx.fill();
    }

    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.font = "8px monospace";
    ctx.fillStyle = "#52525b";
    const step = zoom >= 1.5 ? 1 : zoom >= 0.5 ? 2 : 5;
    for (let t = 0; t <= totalDuration; t += step) {
      const x = t * pixelsPerSecond - scrollX;
      if (x < 0 || x > displayW) continue;
      ctx.beginPath();
      ctx.moveTo(x, displayH - 10);
      ctx.lineTo(x, displayH);
      ctx.stroke();
      ctx.fillText(`${t}s`, x + 2, displayH - 2);
    }
  }, [waveformData, beatMarkers, scenes, selectedSceneIdx, playheadTime, pixelsPerSecond, scrollX, timelineWidth, zoom, totalDuration]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    if (y > rect.height * 0.7) {
      let accTime = 0;
      for (let i = 0; i < scenes.length; i++) {
        const sceneX = accTime * pixelsPerSecond;
        const sceneW = scenes[i].duration * pixelsPerSecond;
        if (x >= sceneX && x < sceneX + sceneW) {
          onSceneSelect(i);
          return;
        }
        accTime += scenes[i].duration;
      }
    } else {
      const time = x / pixelsPerSecond;
      setPlayheadTime(Math.max(0, Math.min(totalDuration, time)));
    }
  }, [scrollX, pixelsPerSecond, scenes, totalDuration, onSceneSelect]);

  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey) {
      setZoom(z => Math.max(0.25, Math.min(4, z + (e.deltaY > 0 ? -0.1 : 0.1))));
    } else {
      setScrollX(x => Math.max(0, x + e.deltaY));
    }
  }, []);

  const sceneTimings = useMemo(() => {
    let acc = 0;
    return scenes.map(s => {
      const start = acc;
      acc += s.duration;
      return { start, end: acc };
    });
  }, [scenes]);

  return (
    <div className="flex flex-col h-full bg-zinc-950" data-testid="hop-waveform-timeline">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border-b border-white/10 shrink-0">
        <button onClick={onPlayToggle} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 transition" data-testid="waveform-play">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setPlayheadTime(0)} className="p-1 bg-zinc-800 hover:bg-zinc-700 transition"><SkipBack className="w-3 h-3" /></button>
        <span className="text-[9px] text-zinc-500 font-mono mx-1">{playheadTime.toFixed(1)}s / {totalDuration}s</span>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (!audioSrc) return;
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            fetch(audioSrc).then(r => r.arrayBuffer()).then(buf => ctx.decodeAudioData(buf)).then(ab => {
              const detected = detectBeats(ab);
              onBeatMarkersChange(detected);
              ctx.close();
            }).catch(() => ctx.close());
          }}
          className="px-2 py-1 text-[9px] bg-orange-900/30 text-orange-400 border border-orange-500/30 hover:bg-orange-900/50 transition flex items-center gap-1"
          data-testid="detect-beats-btn"
        >
          <Zap className="w-3 h-3" /> Detect Beats
        </button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-[8px] text-zinc-600">Zoom</span>
          <input type="range" min="25" max="400" value={zoom * 100} onChange={e => setZoom(Number(e.target.value) / 100)} className="w-16 h-1 accent-orange-500" />
          <span className="text-[8px] text-zinc-500">{Math.round(zoom * 100)}%</span>
        </div>
        <button onClick={onAddScene} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-orange-400 transition ml-1"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 relative overflow-hidden" onWheel={handleScroll}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          data-testid="waveform-canvas"
        />
      </div>
      {!audioSrc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-zinc-600">Upload audio to see waveform</p>
        </div>
      )}
      <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 border-t border-white/10 shrink-0">
        <span className="text-[8px] text-zinc-600">{beatMarkers.length} beat markers</span>
        <span className="text-[8px] text-zinc-600">{scenes.length} scenes</span>
        {audioBpm && <span className="text-[8px] text-orange-400">{audioBpm} BPM</span>}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-zinc-600">Sync:</span>
          {scenes[selectedSceneIdx] && (
            <select
              value={scenes[selectedSceneIdx].syncMode || "manual"}
              onChange={e => onSceneUpdate(scenes[selectedSceneIdx].id, { syncMode: e.target.value as any })}
              className="bg-zinc-800 border border-white/10 text-[9px] text-white p-0.5"
            >
              <option value="manual">Manual</option>
              <option value="snap-to-beat">Snap to Beat</option>
              <option value="fill">Fill Gap</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
