import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon, RotateCcw, Scissors, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export interface StitchSegment {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  scale: number;
  offsetY: number;
  label: string;
}

interface Props {
  segments: StitchSegment[];
  onSegmentsChange: (segments: StitchSegment[]) => void;
  canvasHeight: number;
  onExportPanorama: (dataUrl: string, totalWidth: number) => void;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function HopStitchMode({ segments, onSegmentsChange, canvasHeight, onExportPanorama }: Props) {
  const [zoom, setZoom] = useState(0.5);
  const [scrollX, setScrollX] = useState(0);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalWidth = segments.reduce((sum, s) => sum + (s.cropW || s.width) * s.scale, 0);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const newSegs: StitchSegment[] = [];
    let loaded = 0;
    Array.from(files).forEach((file, i) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          newSegs.push({
            id: genId(),
            dataUrl: e.target!.result as string,
            width: img.width,
            height: img.height,
            cropX: 0,
            cropY: 0,
            cropW: img.width,
            cropH: img.height,
            scale: canvasHeight / img.height,
            offsetY: 0,
            label: file.name.replace(/\.[^.]+$/, ""),
          });
          loaded++;
          if (loaded === files.length) {
            onSegmentsChange([...segments, ...newSegs]);
            toast.success(`Added ${newSegs.length} segment${newSegs.length > 1 ? "s" : ""}`);
          }
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [segments, onSegmentsChange, canvasHeight]);

  const removeSegment = useCallback((idx: number) => {
    const next = segments.filter((_, i) => i !== idx);
    onSegmentsChange(next);
    if (selectedIdx === idx) setSelectedIdx(null);
  }, [segments, onSegmentsChange, selectedIdx]);

  const moveSegment = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = [...segments];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onSegmentsChange(next);
    setSelectedIdx(to);
  }, [segments, onSegmentsChange]);

  const updateSegment = useCallback((idx: number, patch: Partial<StitchSegment>) => {
    const next = segments.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onSegmentsChange(next);
  }, [segments, onSegmentsChange]);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      moveSegment(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const exportPanorama = useCallback(async () => {
    if (segments.length === 0) return;
    const canvas = document.createElement("canvas");
    const h = canvasHeight;
    canvas.width = Math.round(totalWidth);
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const positions: number[] = [];
    let cx = 0;
    for (const seg of segments) {
      positions.push(cx);
      cx += Math.round((seg.cropW || seg.width) * seg.scale);
    }

    await Promise.all(segments.map((seg, i) => new Promise<void>((resolve, reject) => {
      const img = new Image();
      const drawX = positions[i];
      const drawW = Math.round((seg.cropW || seg.width) * seg.scale);
      img.onload = () => {
        ctx.drawImage(
          img,
          seg.cropX, seg.cropY,
          seg.cropW || seg.width, seg.cropH || seg.height,
          drawX, seg.offsetY,
          drawW, h
        );
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load segment ${i}`));
      img.src = seg.dataUrl;
    })));

    onExportPanorama(canvas.toDataURL("image/png"), canvas.width);
  }, [segments, canvasHeight, totalWidth, onExportPanorama]);

  const sel = selectedIdx !== null ? segments[selectedIdx] : null;

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-bold text-zinc-400 tracking-wider">STITCH MODE</span>
        <div className="flex-1" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition" data-testid="button-stitch-import">
          <Upload className="w-3 h-3" /> Import
        </button>
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="px-1.5 py-0.5 text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition">
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[9px] text-zinc-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-1.5 py-0.5 text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition">
          <ZoomIn className="w-3 h-3" />
        </button>
        <button onClick={() => setZoom(containerRef.current ? (containerRef.current.clientWidth - 40) / Math.max(totalWidth, 1) : 0.5)} className="px-1.5 py-0.5 text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition">
          <Maximize2 className="w-3 h-3" />
        </button>
        <div className="w-px h-4 bg-zinc-700 mx-1" />
        <span className="text-[9px] text-zinc-500">{segments.length} segments · {Math.round(totalWidth)}px wide</span>
        <button onClick={exportPanorama} disabled={segments.length === 0} className="px-2 py-0.5 text-[9px] font-bold bg-white text-black hover:bg-zinc-200 transition disabled:opacity-30" data-testid="button-stitch-export">
          Build Panorama
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />

      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative" style={{ cursor: "grab" }}>
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <ImageIcon className="w-12 h-12" />
            <p className="text-sm">Drop images or click Import to start building your panorama</p>
            <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:text-white transition" data-testid="button-stitch-add-first">
              Add Images
            </button>
          </div>
        ) : (
          <div
            className="flex items-end p-4 min-h-full"
            style={{ height: canvasHeight * zoom + 40 }}
          >
            {segments.map((seg, i) => {
              const w = Math.round((seg.cropW || seg.width) * seg.scale * zoom);
              const h = Math.round(canvasHeight * zoom);
              return (
                <div
                  key={seg.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedIdx(i)}
                  className={`relative shrink-0 cursor-pointer group transition-all ${dragOverIdx === i ? "border-l-2 border-white" : ""} ${selectedIdx === i ? "ring-1 ring-white" : ""}`}
                  style={{ width: w, height: h }}
                  data-testid={`stitch-segment-${i}`}
                >
                  <img
                    src={seg.dataUrl}
                    alt={seg.label}
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${-seg.cropX * seg.scale * zoom}px ${(seg.offsetY) * zoom}px`,
                    }}
                    draggable={false}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-zinc-500 cursor-grab" />
                    <span className="text-[8px] text-zinc-400 truncate flex-1">{seg.label || `Seg ${i + 1}`}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeSegment(i); }} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {i < segments.length - 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-zinc-600 z-10" />
                  )}
                </div>
              );
            })}
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 flex items-center justify-center border border-dashed border-zinc-700 text-zinc-600 hover:text-zinc-400 hover:border-zinc-500 transition ml-1"
              style={{ width: 60 * zoom, height: canvasHeight * zoom }}
              data-testid="button-stitch-add-more"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {sel && selectedIdx !== null && (
        <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 flex items-center gap-3 text-[10px]">
          <span className="text-zinc-500">Segment {selectedIdx + 1}</span>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Scale</span>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.05}
              value={sel.scale}
              onChange={e => updateSegment(selectedIdx, { scale: parseFloat(e.target.value) })}
              className="w-20 accent-white"
              data-testid="slider-segment-scale"
            />
            <span className="text-zinc-400 w-8">{Math.round(sel.scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Y Offset</span>
            <input
              type="range"
              min={-200}
              max={200}
              step={1}
              value={sel.offsetY}
              onChange={e => updateSegment(selectedIdx, { offsetY: parseInt(e.target.value) })}
              className="w-16 accent-white"
              data-testid="slider-segment-offset"
            />
            <span className="text-zinc-400 w-8">{sel.offsetY}px</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => moveSegment(selectedIdx, Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0} className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 transition">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button onClick={() => moveSegment(selectedIdx, Math.min(segments.length - 1, selectedIdx + 1))} disabled={selectedIdx === segments.length - 1} className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 transition">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => removeSegment(selectedIdx)} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-red-400 hover:text-red-300 transition">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
