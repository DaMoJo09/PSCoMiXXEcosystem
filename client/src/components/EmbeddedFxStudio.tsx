import { Zap, ExternalLink, X, Wifi, WifiOff, RefreshCw, Target } from "lucide-react";
import type { FxTarget } from "@/hooks/useFxStudio";

function getTargetLabel(target: FxTarget): string | null {
  if (!target) return null;
  switch (target.type) {
    case "cover": return "Cover";
    case "backCover": return "Back Cover";
    case "priceTag": return "Price Tag";
    case "panel": return "Panel";
    default: return null;
  }
}

interface FxStudioStatusBarProps {
  isOpen: boolean;
  connected: boolean;
  activeTarget?: FxTarget;
  onFocus: () => void;
  onClose: () => void;
}

export function FxStudioStatusBar({ isOpen, connected, activeTarget, onFocus, onClose }: FxStudioStatusBarProps) {
  if (!isOpen) return null;

  const targetLabel = getTargetLabel(activeTarget || null);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-zinc-950 border border-purple-500/50 px-4 py-2 shadow-lg shadow-purple-500/10"
      data-testid="fx-studio-status-bar"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-white tracking-wide">FX STUDIO</span>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
      </div>
      {targetLabel && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5" data-testid="text-fx-target">
          <Target className="w-3 h-3" />
          {targetLabel}
        </span>
      )}
      <span className="text-[11px] text-zinc-400">
        {connected
          ? targetLabel
            ? `Connected — FX will apply to ${targetLabel}`
            : "Connected — edits sync back automatically"
          : "Tab open — waiting for handshake..."}
      </span>
      <div className="flex items-center gap-1 ml-2">
        {connected ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-400" />
        )}
        <button
          onClick={onFocus}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-900/30 border border-purple-500/30 transition"
          data-testid="button-fx-focus-tab"
        >
          <ExternalLink className="w-3 h-3" />
          Focus
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition"
          title="Close FX Studio tab"
          data-testid="button-fx-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
