import { useState, useCallback, useEffect } from "react";
import { Sparkles, X, RotateCcw, Download, Search } from "lucide-react";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";

interface FxBrowserPanelProps {
  onClose: () => void;
  onSelectEffect?: (effect: FxEffect) => void;
  useLabel?: string;
}

export function FxBrowserPanel({ onClose, onSelectEffect, useLabel = "Use Effect" }: FxBrowserPanelProps) {
  const [fxEffects, setFxEffects] = useState<FxEffect[]>([]);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSearchQuery, setFxSearchQuery] = useState("");
  const [importingFxId, setImportingFxId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { addAsset } = useAssetLibrary();

  const loadFxEffects = useCallback(async () => {
    setFxLoading(true);
    try {
      const effects = await fxStudioApi.listEffects();
      setFxEffects(Array.isArray(effects) ? effects : []);
      setLoaded(true);
    } catch (err: any) {
      toast.error("Failed to load FX Studio effects");
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded && !fxLoading) {
      loadFxEffects();
    }
  }, [loaded, fxLoading, loadFxEffects]);

  const importFxToLibrary = useCallback(async (effect: FxEffect) => {
    setImportingFxId(effect.id);
    try {
      await fxStudioApi.getEffect(effect.id);

      const saved = await addAsset({
        name: effect.name,
        type: "effect",
        url: effect.preview_data_url || "",
        folderId: "effects",
        tags: effect.type ? effect.type.split(",").map((t: string) => t.trim()) : [],
      });

      if (saved) {
        toast.success(`"${effect.name}" saved to your Asset Library`);
      } else {
        toast.error("Failed to save to Asset Library");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import effect");
    } finally {
      setImportingFxId(null);
    }
  }, [addAsset]);

  const filteredEffects = fxEffects.filter(fx =>
    !fxSearchQuery ||
    fx.name.toLowerCase().includes(fxSearchQuery.toLowerCase()) ||
    fx.type?.toLowerCase().includes(fxSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-purple-500/30 flex items-center justify-between bg-purple-950/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">FX Studio</span>
          <span className="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded-full">pressplays.site</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadFxEffects} className="p-1 hover:bg-purple-900/50 rounded" title="Refresh">
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-[#252525] rounded">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-purple-500/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search effects..."
            value={fxSearchQuery}
            onChange={(e) => setFxSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-purple-500/20 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/50"
            data-testid="input-fx-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {fxLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Loading effects from FX Studio...</span>
          </div>
        ) : filteredEffects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Sparkles className="w-10 h-10 text-purple-500/30" />
            <p className="text-xs text-zinc-500">
              {fxEffects.length === 0
                ? "No effects found. Create effects at pressplays.site to see them here."
                : "No effects match your search."}
            </p>
          </div>
        ) : (
          filteredEffects.map(effect => (
            <div key={effect.id} className="bg-zinc-900 border border-purple-500/10 rounded-lg overflow-hidden hover:border-purple-500/40 transition group">
              <div className="flex gap-3 p-2">
                <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {effect.preview_data_url ? (
                    <img src={effect.preview_data_url} alt={effect.name} className="w-full h-full object-contain" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-purple-500/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{effect.name}</h4>
                  {effect.description && (
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{effect.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {effect.type && effect.type.split(",").map((t, i) => (
                      <span key={i} className="text-[9px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">{t.trim()}</span>
                    ))}
                    {effect.layer_count > 0 && (
                      <span className="text-[9px] text-zinc-500">{effect.layer_count} layers</span>
                    )}
                    {effect.total_frames > 0 && (
                      <span className="text-[9px] text-zinc-500">{effect.total_frames}f @ {effect.fps}fps</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex border-t border-purple-500/10">
                <button
                  onClick={() => importFxToLibrary(effect)}
                  disabled={importingFxId === effect.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-purple-300 hover:bg-purple-900/30 transition disabled:opacity-50"
                  data-testid={`button-fx-save-${effect.id}`}
                >
                  {importingFxId === effect.id ? (
                    <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Save to Library
                </button>
                {onSelectEffect && (
                  <button
                    onClick={() => onSelectEffect(effect)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-cyan-300 hover:bg-cyan-900/30 transition border-l border-purple-500/10"
                    data-testid={`button-fx-use-${effect.id}`}
                  >
                    {useLabel}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
