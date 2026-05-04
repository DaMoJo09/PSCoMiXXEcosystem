import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Plus, Zap, Volume2, VolumeX, Trash2, Upload, GripHorizontal } from "lucide-react";
import type { HopScene } from "@shared/schema";

interface BeatMarker {
  id: string;
  timePosition: number;
  label?: string;
  autoDetected: boolean;
}

interface AudioClip {
  id: string;
  name: string;
  dataUrl: string;
  startTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  color: string;
  trimStart?: number;
  trimEnd?: number;
}

interface HopWaveformTimelineProps {
  scenes: HopScene[];
  audioSrc?: string;
  audioBpm: number | null;
  beatMarkers: BeatMarker[];
  isPlaying: boolean;
  selectedSceneIdx: number;
  totalDuration: number;
  audioClips: AudioClip[];
  onAudioClipsChange: (clips: AudioClip[]) => void;
  onSceneSelect: (idx: number) => void;
  onSceneUpdate: (id: string, updates: Partial<HopScene>) => void;
  onBeatMarkersChange: (markers: BeatMarker[]) => void;
  onPlayToggle: () => void;
  onAddScene: () => void;
  onScrub?: (time: number) => void;
}

const CLIP_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16"];

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export default function HopWaveformTimeline({
  scenes, audioSrc, audioBpm, beatMarkers, isPlaying, selectedSceneIdx,
  totalDuration, audioClips, onAudioClipsChange, onSceneSelect, onSceneUpdate,
  onBeatMarkersChange, onPlayToggle, onAddScene, onScrub,
}: HopWaveformTimelineProps) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [clipWaveforms, setClipWaveforms] = useState<Record<string, number[]>>({});
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playheadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartRef = useRef({ x: 0, originalStartTime: 0 });
  const audioFileRef = useRef<HTMLInputElement>(null);

  const pixelsPerSecond = useMemo(() => 40 * zoom, [zoom]);
  const timelineWidth = useMemo(() => Math.max(totalDuration * pixelsPerSecond, 600), [totalDuration, pixelsPerSecond]);

  const SCENE_TRACK_Y = 0.55;
  const AUDIO_TRACK_Y = 0.72;
  const AUDIO_TRACK_H = 0.25;

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
    audioClips.forEach(clip => {
      if (clipWaveforms[clip.id]) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      fetch(clip.dataUrl)
        .then(r => r.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf))
        .then(ab => {
          const raw = ab.getChannelData(0);
          const samples = 200;
          const blockSize = Math.floor(raw.length / samples);
          const wf: number[] = [];
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) sum += Math.abs(raw[i * blockSize + j] || 0);
            wf.push(sum / blockSize);
          }
          const mx = Math.max(...wf, 0.001);
          setClipWaveforms(prev => ({ ...prev, [clip.id]: wf.map(v => v / mx) }));
          ctx.close();
        })
        .catch(() => ctx.close());
    });
  }, [audioClips]);

  useEffect(() => {
    if (isPlaying && !isScrubbing) {
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
  }, [isPlaying, totalDuration, isScrubbing]);

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

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, displayW, displayH);

    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    const step = zoom >= 1.5 ? 1 : zoom >= 0.5 ? 2 : 5;
    ctx.font = "8px monospace";
    ctx.fillStyle = "#3f3f46";
    for (let t = 0; t <= totalDuration; t += step) {
      const x = t * pixelsPerSecond - scrollX;
      if (x < 0 || x > displayW) continue;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayH);
      ctx.stroke();
      ctx.fillText(`${t}s`, x + 2, 10);
    }
    for (let t = 0; t <= totalDuration; t += step / 4) {
      const x = t * pixelsPerSecond - scrollX;
      if (x < 0 || x > displayW) continue;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 4);
      ctx.stroke();
    }

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, displayH * SCENE_TRACK_Y, displayW, displayH * 0.15);

    if (waveformData.length > 0 && audioSrc) {
      const barW = timelineWidth / waveformData.length;
      const midY = displayH * 0.3;
      const ampH = displayH * 0.2;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#3b82f6";
      for (let i = 0; i < waveformData.length; i++) {
        const x = i * barW - scrollX;
        if (x < -barW || x > displayW) continue;
        const h = waveformData[i] * ampH;
        ctx.fillRect(x, midY - h, Math.max(barW - 1, 1), h * 2);
      }
      ctx.globalAlpha = 1;
    }

    beatMarkers.forEach(marker => {
      const x = marker.timePosition * pixelsPerSecond - scrollX;
      if (x < 0 || x > displayW) return;
      ctx.strokeStyle = marker.autoDetected ? "#f59e0b33" : "#f59e0b";
      ctx.lineWidth = 1;
      ctx.setLineDash(marker.autoDetected ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, displayH * SCENE_TRACK_Y);
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
      ctx.fillStyle = isSelected ? "#f9731618" : "#1a1a1e";
      ctx.strokeStyle = isSelected ? "#f97316" : "#3f3f46";
      ctx.lineWidth = isSelected ? 2 : 1;

      const sy = displayH * SCENE_TRACK_Y;
      const sh = displayH * 0.15;
      ctx.fillRect(x, sy, w, sh);
      ctx.strokeRect(x, sy, w, sh);

      if (scene.assetUrl) {
        ctx.fillStyle = "#52525b";
        ctx.fillRect(x + 2, sy + 2, 14, sh - 4);
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "7px monospace";
        ctx.fillText("🖼", x + 4, sy + sh / 2 + 2);
      }

      ctx.fillStyle = isSelected ? "#f97316" : "#a1a1aa";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`S${idx + 1}`, x + (scene.assetUrl ? 20 : 4), sy + 12);
      ctx.fillStyle = "#52525b";
      ctx.font = "8px monospace";
      ctx.fillText(`${scene.duration}s`, x + (scene.assetUrl ? 20 : 4), sy + sh - 4);
      ctx.textAlign = "left";

      ctx.fillStyle = "#3f3f4680";
      ctx.fillRect(x + w - 4, sy, 4, sh);
    });

    const audioY = displayH * AUDIO_TRACK_Y;
    const audioH = displayH * AUDIO_TRACK_H;

    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, audioY, displayW, audioH);
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, audioY, displayW, audioH);

    ctx.fillStyle = "#3f3f46";
    ctx.font = "7px monospace";
    ctx.fillText("♫ AUDIO", 4, audioY + 9);

    if (audioClips.length === 0 && !audioSrc) {
      ctx.fillStyle = "#3f3f46";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Drop audio clips here or click + to add", displayW / 2, audioY + audioH / 2 + 3);
      ctx.textAlign = "left";
    }

    audioClips.forEach(clip => {
      const cx = clip.startTime * pixelsPerSecond - scrollX;
      const cw = clip.duration * pixelsPerSecond;
      if (cx + cw < 0 || cx > displayW) return;

      const isSelected = selectedClipId === clip.id;
      const isDragging = isDraggingClip === clip.id;
      const clipY = audioY + 12;
      const clipH = audioH - 16;

      ctx.globalAlpha = clip.muted ? 0.3 : isDragging ? 0.7 : 1;

      ctx.fillStyle = clip.color + "30";
      ctx.fillRect(cx, clipY, cw, clipH);
      ctx.strokeStyle = isSelected ? "#fff" : clip.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(cx, clipY, cw, clipH);

      const wf = clipWaveforms[clip.id];
      if (wf && wf.length > 0) {
        const barW = cw / wf.length;
        const midCY = clipY + clipH / 2;
        const ampCH = clipH * 0.35;
        ctx.fillStyle = clip.color + "80";
        for (let i = 0; i < wf.length; i++) {
          const bx = cx + i * barW;
          if (bx < -barW || bx > displayW) continue;
          const h = wf[i] * ampCH;
          ctx.fillRect(bx, midCY - h, Math.max(barW - 0.5, 0.5), h * 2);
        }
      }

      ctx.fillStyle = isSelected ? "#fff" : clip.color;
      ctx.font = "bold 8px monospace";
      ctx.fillText(clip.name.slice(0, 20), cx + 4, clipY + 10);
      ctx.fillStyle = "#71717a";
      ctx.font = "7px monospace";
      ctx.fillText(formatTime(clip.duration), cx + 4, clipY + clipH - 3);

      if (clip.muted) {
        ctx.strokeStyle = "#ef444480";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, clipY);
        ctx.lineTo(cx + cw, clipY + clipH);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      ctx.fillStyle = clip.color + "60";
      ctx.fillRect(cx, clipY, 6, clipH);
      ctx.fillRect(cx + cw - 6, clipY, 6, clipH);

      ctx.fillStyle = "#fff";
      ctx.font = "8px monospace";
      ctx.fillText("⋮", cx + 1, clipY + clipH / 2 + 3);
      ctx.fillText("⋮", cx + cw - 5, clipY + clipH / 2 + 3);
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
      ctx.moveTo(phX - 6, 0);
      ctx.lineTo(phX + 6, 0);
      ctx.lineTo(phX + 3, 10);
      ctx.lineTo(phX - 3, 10);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText(formatTime(playheadTime), phX, 20);
      ctx.textAlign = "left";
    }
  }, [waveformData, clipWaveforms, beatMarkers, scenes, selectedSceneIdx, playheadTime, pixelsPerSecond, scrollX, timelineWidth, zoom, totalDuration, audioClips, selectedClipId, isDraggingClip, audioSrc]);

  const getTimeFromX = useCallback((clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left + scrollX;
    return Math.max(0, Math.min(totalDuration, x / pixelsPerSecond));
  }, [scrollX, pixelsPerSecond, totalDuration]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;
    const displayH = rect.height;

    const audioY = displayH * AUDIO_TRACK_Y;
    const audioH = displayH * AUDIO_TRACK_H;

    if (y >= audioY + 12 && y <= audioY + audioH) {
      for (const clip of audioClips) {
        const cx = clip.startTime * pixelsPerSecond - scrollX;
        const cw = clip.duration * pixelsPerSecond;
        const localX = e.clientX - rect.left;
        if (localX >= cx && localX <= cx + cw) {
          setSelectedClipId(clip.id);
          setIsDraggingClip(clip.id);
          dragStartRef.current = { x: e.clientX, originalStartTime: clip.startTime };
          e.preventDefault();
          return;
        }
      }
    }

    if (y < displayH * SCENE_TRACK_Y) {
      setIsScrubbing(true);
      const time = getTimeFromX(e.clientX);
      setPlayheadTime(time);
      onScrub?.(time);
      e.preventDefault();
      return;
    }

    if (y >= displayH * SCENE_TRACK_Y && y < audioY) {
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
    }
  }, [scrollX, pixelsPerSecond, scenes, audioClips, onSceneSelect, getTimeFromX, onScrub]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        const time = getTimeFromX(e.clientX);
        setPlayheadTime(time);
        onScrub?.(time);
      }
      if (isDraggingClip) {
        const dx = e.clientX - dragStartRef.current.x;
        const dt = dx / pixelsPerSecond;
        const newStart = Math.max(0, dragStartRef.current.originalStartTime + dt);
        onAudioClipsChange(audioClips.map(c => c.id === isDraggingClip ? { ...c, startTime: Math.round(newStart * 10) / 10 } : c));
      }
    };
    const handleMouseUp = () => {
      setIsScrubbing(false);
      setIsDraggingClip(null);
    };
    if (isScrubbing || isDraggingClip) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isScrubbing, isDraggingClip, getTimeFromX, pixelsPerSecond, audioClips, onAudioClipsChange, onScrub]);

  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey) {
      setZoom(z => Math.max(0.25, Math.min(4, z + (e.deltaY > 0 ? -0.1 : 0.1))));
    } else {
      setScrollX(x => Math.max(0, x + e.deltaY));
    }
  }, []);

  const handleAddAudioClip = useCallback(() => {
    audioFileRef.current?.click();
  }, []);

  const handleAudioFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const audio = new Audio(dataUrl);
      audio.onloadedmetadata = () => {
        const newClip: AudioClip = {
          id: genId("aclip"),
          name: file.name.replace(/\.[^.]+$/, ""),
          dataUrl,
          startTime: audioClips.length > 0 ? Math.max(...audioClips.map(c => c.startTime + c.duration)) : 0,
          duration: audio.duration,
          volume: 1,
          muted: false,
          color: CLIP_COLORS[audioClips.length % CLIP_COLORS.length],
        };
        onAudioClipsChange([...audioClips, newClip]);
      };
      audio.onerror = () => {
        const newClip: AudioClip = {
          id: genId("aclip"),
          name: file.name.replace(/\.[^.]+$/, ""),
          dataUrl,
          startTime: audioClips.length > 0 ? Math.max(...audioClips.map(c => c.startTime + c.duration)) : 0,
          duration: 10,
          volume: 1,
          muted: false,
          color: CLIP_COLORS[audioClips.length % CLIP_COLORS.length],
        };
        onAudioClipsChange([...audioClips, newClip]);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [audioClips, onAudioClipsChange]);

  const removeClip = useCallback((clipId: string) => {
    onAudioClipsChange(audioClips.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [audioClips, onAudioClipsChange, selectedClipId]);

  const updateClip = useCallback((clipId: string, updates: Partial<AudioClip>) => {
    onAudioClipsChange(audioClips.map(c => c.id === clipId ? { ...c, ...updates } : c));
  }, [audioClips, onAudioClipsChange]);

  const selectedClip = audioClips.find(c => c.id === selectedClipId);

  return (
    <div className="flex flex-col h-full bg-black" data-testid="hop-waveform-timeline">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/80 border-b border-white/10 shrink-0">
        <button onClick={onPlayToggle} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 transition" data-testid="waveform-play">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => { setPlayheadTime(0); onScrub?.(0); }} className="p-1 bg-zinc-800 hover:bg-zinc-700 transition"><SkipBack className="w-3 h-3" /></button>
        <span className="text-[9px] text-zinc-400 font-mono mx-1 tabular-nums w-24">{formatTime(playheadTime)} / {formatTime(totalDuration)}</span>
        <div className="w-px h-4 bg-white/10 mx-1" />

        <button onClick={handleAddAudioClip} className="px-2 py-0.5 text-[8px] font-bold tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1" data-testid="add-audio-clip-btn">
          <Plus className="w-2.5 h-2.5" /> AUDIO CLIP
        </button>
        <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />

        {audioClips.length > 0 && (
          <span className="text-[8px] text-zinc-600 font-mono">{audioClips.length} clip{audioClips.length !== 1 ? "s" : ""}</span>
        )}

        <div className="flex-1" />

        {audioSrc && (
          <button
            onClick={() => {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              fetch(audioSrc).then(r => r.arrayBuffer()).then(buf => ctx.decodeAudioData(buf)).then(ab => {
                const detected = detectBeats(ab);
                onBeatMarkersChange(detected);
                ctx.close();
              }).catch(() => ctx.close());
            }}
            className="px-2 py-0.5 text-[8px] font-bold tracking-wider bg-orange-900/30 text-orange-400 border border-orange-500/30 hover:bg-orange-900/50 transition flex items-center gap-1"
            data-testid="detect-beats-btn"
          >
            <Zap className="w-2.5 h-2.5" /> Beats
          </button>
        )}

        <div className="flex items-center gap-1 ml-1">
          <span className="text-[7px] text-zinc-600">Zoom</span>
          <input type="range" min="25" max="400" value={zoom * 100} onChange={e => setZoom(Number(e.target.value) / 100)} className="w-14 h-1 accent-white" />
          <span className="text-[7px] text-zinc-500 font-mono">{Math.round(zoom * 100)}%</span>
        </div>
        <button onClick={onAddScene} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white transition ml-1" title="Add Scene"><Plus className="w-3 h-3" /></button>
      </div>

      <div className="flex-1 relative overflow-hidden" onWheel={handleScroll}>
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${isScrubbing ? "cursor-col-resize" : "cursor-crosshair"}`}
          onMouseDown={handleMouseDown}
          data-testid="waveform-canvas"
        />
      </div>

      <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/80 border-t border-white/10 shrink-0 min-h-[24px]">
        {selectedClip ? (
          <>
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: selectedClip.color }} />
            <span className="text-[8px] text-white font-bold truncate max-w-24">{selectedClip.name}</span>
            <div className="flex items-center gap-0.5">
              <span className="text-[7px] text-zinc-500">Start:</span>
              <input type="number" step="0.1" min="0" value={selectedClip.startTime} onChange={e => updateClip(selectedClip.id, { startTime: Math.max(0, Number(e.target.value)) })} className="w-12 bg-zinc-800 border border-white/10 text-[8px] text-white p-0.5 font-mono" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[7px] text-zinc-500">Vol:</span>
              <input type="range" min="0" max="100" value={selectedClip.volume * 100} onChange={e => updateClip(selectedClip.id, { volume: Number(e.target.value) / 100 })} className="w-12 h-1 accent-white" />
              <span className="text-[7px] text-zinc-500 font-mono w-6">{Math.round(selectedClip.volume * 100)}%</span>
            </div>
            <button onClick={() => updateClip(selectedClip.id, { muted: !selectedClip.muted })} className="p-0.5">
              {selectedClip.muted ? <VolumeX className="w-2.5 h-2.5 text-red-400" /> : <Volume2 className="w-2.5 h-2.5 text-zinc-400" />}
            </button>
            <button onClick={() => removeClip(selectedClip.id)} className="p-0.5 hover:text-red-400 text-zinc-600"><Trash2 className="w-2.5 h-2.5" /></button>
            <div className="flex-1" />
          </>
        ) : (
          <>
            <span className="text-[8px] text-zinc-600">{beatMarkers.length} beats</span>
            <span className="text-[8px] text-zinc-600">·</span>
            <span className="text-[8px] text-zinc-600">{scenes.length} scenes</span>
            <span className="text-[8px] text-zinc-600">·</span>
            <span className="text-[8px] text-zinc-600">{audioClips.length} audio clips</span>
            {audioBpm && <><span className="text-[8px] text-zinc-600">·</span><span className="text-[8px] text-orange-400">{audioBpm} BPM</span></>}
            <div className="flex-1" />
          </>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-zinc-600">Sync:</span>
          {scenes[selectedSceneIdx] && (
            <select
              value={scenes[selectedSceneIdx].syncMode || "manual"}
              onChange={e => onSceneUpdate(scenes[selectedSceneIdx].id, { syncMode: e.target.value as any })}
              className="bg-zinc-800 border border-white/10 text-[8px] text-white p-0.5"
            >
              <option value="manual">Manual</option>
              <option value="snap-to-beat">Snap Beat</option>
              <option value="fill">Fill</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
