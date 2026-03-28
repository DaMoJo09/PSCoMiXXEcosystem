import { useState, useCallback, useEffect, useRef } from "react";
import { X, Sparkles, Zap, RefreshCw, Maximize2, Minimize2, ChevronDown, Wifi, WifiOff, Palette, Type, User, Image, Layers, Wand2, Frame, Tag, MessageSquare, FileText, CloudUpload } from "lucide-react";
import { fxStudioApi } from "@/lib/api";
import { toast } from "sonner";

interface EmbeddedFxStudioProps {
  onClose: () => void;
  onAssetsUpdated?: () => void;
  initialMode?: string | null;
  projectId?: string;
}

const FX_STUDIO_BASE = "https://www.pscomixx.online";

const FX_MODES = [
  { id: "fx", label: "FX Studio", icon: Sparkles, path: "" },
  { id: "character", label: "Characters", icon: User, path: "/character" },
  { id: "portrait", label: "Portrait", icon: Image, path: "/portrait" },
  { id: "graffiti", label: "Drawing", icon: Palette, path: "/graffiti" },
  { id: "bgfx", label: "BG FX", icon: Layers, path: "/bgfx" },
  { id: "filter", label: "Filters", icon: Wand2, path: "/filter" },
  { id: "cover", label: "Covers", icon: Frame, path: "/cover" },
  { id: "layout", label: "Layouts", icon: Frame, path: "/layout" },
  { id: "overlay", label: "Overlays", icon: Layers, path: "/overlay" },
  { id: "price-tag", label: "Price Tags", icon: Tag, path: "/price-tag" },
  { id: "title", label: "Titles", icon: Type, path: "/title" },
  { id: "bubble", label: "Bubbles", icon: MessageSquare, path: "/bubble" },
  { id: "script", label: "Script", icon: FileText, path: "/script" },
];

export function EmbeddedFxStudio({ onClose, onAssetsUpdated, initialMode, projectId }: EmbeddedFxStudioProps) {
  const [currentMode, setCurrentMode] = useState(initialMode || "fx");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState<"checking" | "connected" | "offline">("checking");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mode = FX_MODES.find(m => m.id === currentMode) || FX_MODES[0];
    setIframeSrc(`${FX_STUDIO_BASE}${mode.path}`);
  }, [currentMode]);

  const checkConnection = useCallback(() => {
    setConnected("checking");
    fxStudioApi.healthCheck()
      .then(r => setConnected(r.status === "ok" ? "connected" : "offline"))
      .catch(() => setConnected("offline"));
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleClose = useCallback(() => {
    if (onAssetsUpdated) {
      onAssetsUpdated();
    }
    onClose();
  }, [onClose, onAssetsUpdated]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  }, [iframeSrc]);

  const syncNewAssets = useCallback(async () => {
    try {
      const effects = await fxStudioApi.listEffects();
      const unsyncedCount = effects.filter(e => !e.synced_to_cloud).length;
      if (unsyncedCount > 0) {
        toast.success(`${effects.length} effects available, ${unsyncedCount} not yet synced`);
      } else {
        toast.success(`${effects.length} effects available — all synced`);
      }
      if (onAssetsUpdated) onAssetsUpdated();
    } catch {
      toast.error("Could not check for new assets");
    }
  }, [onAssetsUpdated]);

  const currentModeInfo = FX_MODES.find(m => m.id === currentMode) || FX_MODES[0];
  const CurrentIcon = currentModeInfo.icon;

  return (
    <div
      className={`fixed bg-black/90 z-[70] flex flex-col ${
        isFullscreen ? "inset-0" : "inset-2 md:inset-4 lg:inset-6"
      }`}
      data-testid="embedded-fx-studio"
    >
      <div className="flex items-center justify-between bg-zinc-950 border-b border-purple-500/50 px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-700">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-white tracking-wide">FX STUDIO</span>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connected === "connected" ? "bg-green-400" :
              connected === "offline" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
            }`} />
          </div>

          <div className="relative" ref={modeMenuRef}>
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition"
              data-testid="button-fx-mode-select"
            >
              <CurrentIcon className="w-3 h-3" />
              <span>{currentModeInfo.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showModeMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 shadow-xl z-10 max-h-[320px] overflow-y-auto">
                {FX_MODES.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setCurrentMode(mode.id);
                        setShowModeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition ${
                        currentMode === mode.id
                          ? "bg-purple-900/40 text-purple-300 border-l-2 border-purple-400"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800 border-l-2 border-transparent"
                      }`}
                      data-testid={`button-fx-mode-${mode.id}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={syncNewAssets}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-cyan-400 hover:bg-cyan-900/20 border border-zinc-700 transition"
            title="Check for new assets"
            data-testid="button-fx-sync-assets"
          >
            <CloudUpload className="w-3 h-3" />
            Sync
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh FX Studio"
            data-testid="button-fx-refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            data-testid="button-fx-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition"
            title="Close FX Studio"
            data-testid="button-fx-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        {iframeSrc && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            allow="clipboard-write; clipboard-read"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
            title="FX Studio"
            data-testid="iframe-fx-studio"
          />
        )}

        {connected === "offline" && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-zinc-900/95 border border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-400">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>Asset sync unavailable — FX Studio still works, but cloud sync is paused</span>
            <button onClick={checkConnection} className="ml-1 px-2 py-0.5 text-[9px] text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors uppercase font-bold" data-testid="button-fx-retry-connection">Retry</button>
          </div>
        )}

        {connected === "connected" && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-700 px-2 py-1 text-[9px] text-zinc-500">
            <Wifi className="w-2.5 h-2.5 text-green-500" />
            <span>Synced</span>
          </div>
        )}
      </div>
    </div>
  );
}
