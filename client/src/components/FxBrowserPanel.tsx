import { useState, useCallback, useEffect } from "react";
import { Sparkles, X, RotateCcw, Download, Search, FolderOpen, ArrowUpRight, Layers, ImageIcon, Target, CornerDownLeft } from "lucide-react";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";
import { type AssetTag, ASSET_TAG_LABELS } from "@/types/asset-tags";

interface FxBrowserPanelProps {
  onClose: () => void;
  onSelectEffect?: (effect: FxEffect) => void;
  onApplyToPanel?: (effect: FxEffect) => void;
  onReturnToPanel?: (effect: FxEffect, panelId: string, pageSide: string) => void;
  useLabel?: string;
  projectId?: string;
  activeTag?: AssetTag | null;
}

const TAG_FOLDERS: { tag: AssetTag | "all" | "project"; label: string; icon: string }[] = [
  { tag: "all", label: "All Effects", icon: "grid" },
  { tag: "project", label: "My Project", icon: "target" },
  { tag: "fx-overlay", label: "FX Overlays", icon: "sparkles" },
  { tag: "background", label: "Backgrounds", icon: "image" },
  { tag: "character-art", label: "Characters", icon: "user" },
  { tag: "cover", label: "Covers", icon: "book" },
  { tag: "interior-page", label: "Pages", icon: "file" },
  { tag: "splash-page", label: "Splash Pages", icon: "maximize" },
  { tag: "filter-output", label: "Filters", icon: "sliders" },
  { tag: "sfx-text", label: "SFX Text", icon: "type" },
  { tag: "graffiti", label: "Graffiti", icon: "pen" },
  { tag: "panel-strip", label: "Panel Strips", icon: "columns" },
];

export function FxBrowserPanel({ onClose, onSelectEffect, onApplyToPanel, onReturnToPanel, useLabel = "Use Effect", projectId, activeTag }: FxBrowserPanelProps) {
  const [fxEffects, setFxEffects] = useState<FxEffect[]>([]);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSearchQuery, setFxSearchQuery] = useState("");
  const [importingFxId, setImportingFxId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<AssetTag | "all" | "project">(activeTag || "all");
  const { addAsset } = useAssetLibrary();

  const loadFxEffects = useCallback(async () => {
    setFxLoading(true);
    try {
      let effects: FxEffect[];
      if (selectedFolder === "all") {
        effects = await fxStudioApi.listEffects();
      } else if (selectedFolder === "project" && projectId) {
        effects = await fxStudioApi.listByTag(undefined, projectId);
      } else if (selectedFolder !== "project") {
        effects = await fxStudioApi.listByTag(selectedFolder as AssetTag);
      } else {
        effects = await fxStudioApi.listEffects();
      }
      setFxEffects(Array.isArray(effects) ? effects : []);
      setLoaded(true);
    } catch {
      toast.error("Failed to load FX Studio effects");
    } finally {
      setFxLoading(false);
    }
  }, [selectedFolder, projectId]);

  useEffect(() => {
    setLoaded(false);
  }, [selectedFolder]);

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

  const folderIcon = (icon: string) => {
    switch (icon) {
      case "target": return <Target className="w-3 h-3" />;
      case "sparkles": return <Sparkles className="w-3 h-3" />;
      case "image": return <ImageIcon className="w-3 h-3" />;
      case "layers": return <Layers className="w-3 h-3" />;
      default: return <FolderOpen className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">FX Studio</span>
          <span className="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 border border-purple-700">pressplays.site</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadFxEffects} className="p-1 hover:bg-zinc-800" title="Refresh">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-36 border-r border-zinc-700 overflow-y-auto bg-zinc-950 shrink-0">
          {TAG_FOLDERS.map((folder) => {
            if (folder.tag === "project" && !projectId) return null;
            return (
              <button
                key={folder.tag}
                onClick={() => setSelectedFolder(folder.tag)}
                className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition-colors ${
                  selectedFolder === folder.tag
                    ? "bg-zinc-800 text-white border-l-2 border-cyan-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                }`}
                data-testid={`button-fx-folder-${folder.tag}`}
              >
                {folderIcon(folder.icon)}
                <span className="truncate">{folder.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search effects..."
                value={fxSearchQuery}
                onChange={(e) => setFxSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500"
                data-testid="input-fx-search"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {fxLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-xs text-zinc-500">Loading effects...</span>
              </div>
            ) : filteredEffects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Sparkles className="w-10 h-10 text-zinc-700" />
                <p className="text-xs text-zinc-500">
                  {fxEffects.length === 0
                    ? selectedFolder === "project"
                      ? "No FX linked to this project yet. Send panels to FX Studio to get started."
                      : "No effects in this category. Create effects at pressplays.site."
                    : "No effects match your search."}
                </p>
              </div>
            ) : (
              filteredEffects.map(effect => (
                <div key={effect.id} className="bg-zinc-900 border border-zinc-700 overflow-hidden hover:border-cyan-600 transition group">
                  <div className="flex gap-2 p-2">
                    <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {effect.preview_data_url ? (
                        <img src={effect.preview_data_url} alt={effect.name} className="w-full h-full object-contain" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-white truncate">{effect.name}</h4>
                      {effect.description && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{effect.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {effect.asset_tag && (
                          <span className="text-[9px] bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 border border-cyan-800">
                            {ASSET_TAG_LABELS[effect.asset_tag] || effect.asset_tag}
                          </span>
                        )}
                        {effect.type && !effect.asset_tag && effect.type.split(",").slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 border border-zinc-700">{t.trim()}</span>
                        ))}
                        {effect.layer_count > 0 && (
                          <span className="text-[9px] text-zinc-500">{effect.layer_count}L</span>
                        )}
                        {effect.total_frames > 0 && (
                          <span className="text-[9px] text-zinc-500">{effect.total_frames}f</span>
                        )}
                        {effect.metadata?.panel_id && (
                          <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1 border border-amber-800">Panel</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t border-zinc-700">
                    <button
                      onClick={() => importFxToLibrary(effect)}
                      disabled={importingFxId === effect.id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
                      data-testid={`button-fx-save-${effect.id}`}
                    >
                      {importingFxId === effect.id ? (
                        <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Library
                    </button>
                    {onReturnToPanel && effect.metadata?.panel_id && effect.metadata?.page_side && (
                      <button
                        onClick={() => onReturnToPanel(effect, effect.metadata!.panel_id, effect.metadata!.page_side)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-amber-400 hover:bg-amber-900/20 transition border-l border-zinc-700"
                        data-testid={`button-fx-return-${effect.id}`}
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        Return to Panel
                      </button>
                    )}
                    {onApplyToPanel && !(effect.metadata?.panel_id && onReturnToPanel) && (
                      <button
                        onClick={() => onApplyToPanel(effect)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-cyan-400 hover:bg-cyan-900/20 transition border-l border-zinc-700"
                        data-testid={`button-fx-apply-${effect.id}`}
                      >
                        <Target className="w-3 h-3" />
                        Apply to Panel
                      </button>
                    )}
                    {onSelectEffect && !onApplyToPanel && !(effect.metadata?.panel_id && onReturnToPanel) && (
                      <button
                        onClick={() => onSelectEffect(effect)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-cyan-400 hover:bg-cyan-900/20 transition border-l border-zinc-700"
                        data-testid={`button-fx-use-${effect.id}`}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        {useLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
