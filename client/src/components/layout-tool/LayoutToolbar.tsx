import { Plus, Download, Settings, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useRef } from "react";
import type { ComicPage } from "@/types/layout-types";

interface LayoutToolbarProps {
  pageName: string;
  onNameChange: (name: string) => void;
  onAddPanel: () => void;
  canvasZoom: number;
  onZoomChange: (zoom: number) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onToggleSettings: () => void;
  page: ComicPage;
}

export function LayoutToolbar({
  pageName, onNameChange, onAddPanel,
  canvasZoom, onZoomChange, canvasRef, onToggleSettings,
}: LayoutToolbarProps) {
  const exportPng = async () => {
    if (!canvasRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const el = canvasRef.current;
      const dataUrl = await toPng(el, { pixelRatio: 3, backgroundColor: "#fff" });
      const link = document.createElement("a");
      link.download = `${pageName || "comic-page"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-3 gap-2 shrink-0" data-testid="layout-toolbar">
      <input
        value={pageName}
        onChange={(e) => onNameChange(e.target.value)}
        className="bg-transparent border border-zinc-700 text-white text-xs px-2 py-1 w-40 focus:border-cyan-500 outline-none"
        data-testid="input-page-name"
      />
      <div className="h-4 w-px bg-zinc-700" />
      <button onClick={onAddPanel} className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-white px-2 py-1 border border-zinc-700 hover:border-cyan-500" data-testid="button-add-panel">
        <Plus className="w-3 h-3" /> ADD PANEL
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <button onClick={() => onZoomChange(Math.max(25, canvasZoom - 25))} className="p-1 text-zinc-400 hover:text-white" data-testid="button-zoom-out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-zinc-400 w-8 text-center">{canvasZoom}%</span>
        <button onClick={() => onZoomChange(Math.min(200, canvasZoom + 25))} className="p-1 text-zinc-400 hover:text-white" data-testid="button-zoom-in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onZoomChange(100)} className="p-1 text-zinc-400 hover:text-white" data-testid="button-zoom-reset">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-4 w-px bg-zinc-700" />
      <button onClick={onToggleSettings} className="p-1 text-zinc-400 hover:text-white" data-testid="button-page-settings">
        <Settings className="w-3.5 h-3.5" />
      </button>
      <button onClick={exportPng} className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-white px-2 py-1 border border-zinc-700 hover:border-emerald-500" data-testid="button-export-png">
        <Download className="w-3 h-3" /> EXPORT PNG
      </button>
    </div>
  );
}
