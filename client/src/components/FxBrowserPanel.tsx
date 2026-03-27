import { useState, useCallback, useEffect, useRef } from "react";
import { Sparkles, X, RotateCcw, Download, Search, FolderOpen, ArrowUpRight, Target, CornerDownLeft, ChevronDown, ChevronRight, FileText, Trash2, Pencil, CheckSquare, Square, XCircle } from "lucide-react";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { useLocation } from "wouter";
import { useAssetLibrary } from "@/contexts/AssetLibraryContext";
import { toast } from "sonner";
import { type AssetTag, ASSET_TAG_LABELS, ASSET_FOLDER_GROUPS } from "@/types/asset-tags";

interface FxBrowserPanelProps {
  onClose: () => void;
  onSelectEffect?: (effect: FxEffect) => void;
  onApplyToPanel?: (effect: FxEffect) => void;
  onReturnToPanel?: (effect: FxEffect, panelId: string, pageSide: string) => void;
  useLabel?: string;
  projectId?: string;
  activeTag?: AssetTag | null;
}

type FolderSelection = AssetTag | "all" | "project" | "returns";

const POLL_INTERVAL_MS = 15000;

export function FxBrowserPanel({ onClose, onSelectEffect, onApplyToPanel, onReturnToPanel, useLabel = "Use Effect", projectId, activeTag }: FxBrowserPanelProps) {
  const [, navigate] = useLocation();
  const [fxEffects, setFxEffects] = useState<FxEffect[]>([]);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSearchQuery, setFxSearchQuery] = useState("");
  const [importingFxId, setImportingFxId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>(activeTag || "all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Overlays", "Art Assets"]));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addAsset } = useAssetLibrary();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadFxEffects = useCallback(async (silent = false) => {
    if (!silent) setFxLoading(true);
    try {
      let effects: FxEffect[];
      if (selectedFolder === "all") {
        effects = await fxStudioApi.listEffects();
      } else if (selectedFolder === "project" && projectId) {
        effects = await fxStudioApi.listByTag(undefined, projectId);
      } else if (selectedFolder === "returns" && projectId) {
        const params = new URLSearchParams();
        params.set("project_id", projectId);
        params.set("type", "panel-fx-return");
        const response = await fetch(`/api/fx-studio/effects?${params.toString()}`, { credentials: "include" });
        const data = await response.json();
        effects = Array.isArray(data) ? data : data?.effects || [];
      } else if (selectedFolder !== "project" && selectedFolder !== "returns") {
        effects = await fxStudioApi.listByTag(selectedFolder as AssetTag);
      } else {
        effects = await fxStudioApi.listEffects();
      }
      setFxEffects(Array.isArray(effects) ? effects : []);
      setLoaded(true);
    } catch {
      if (!silent) toast.error("Failed to load FX Studio effects");
    } finally {
      if (!silent) setFxLoading(false);
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

  useEffect(() => {
    if (projectId && (selectedFolder === "project" || selectedFolder === "returns")) {
      pollRef.current = setInterval(() => loadFxEffects(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [projectId, selectedFolder, loadFxEffects]);

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

  const handleDeleteEffect = useCallback(async (effectId: string) => {
    setDeletingId(effectId);
    try {
      await fxStudioApi.deleteEffect(effectId);
      setFxEffects(prev => prev.filter(e => e.id !== effectId));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(effectId); return next; });
      toast.success("Effect deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete effect");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    let deleted = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await fxStudioApi.deleteEffect(id);
        deleted++;
      } catch {
        failed++;
      }
    }
    setFxEffects(prev => prev.filter(e => !selectedIds.has(e.id) || failed > 0));
    if (deleted > 0) {
      setLoaded(false);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    if (failed > 0) {
      toast.error(`Deleted ${deleted}, failed ${failed}`);
    } else {
      toast.success(`Deleted ${deleted} effect${deleted > 1 ? "s" : ""}`);
    }
  }, [selectedIds]);

  const handleRenameEffect = useCallback(async (effectId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await fxStudioApi.updateEffect(effectId, { name: newName.trim() });
      setFxEffects(prev => prev.map(e => e.id === effectId ? { ...e, name: newName.trim() } : e));
      toast.success("Renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    } finally {
      setRenamingId(null);
      setRenameValue("");
    }
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredEffects = fxEffects.filter(fx =>
    !fxSearchQuery ||
    fx.name.toLowerCase().includes(fxSearchQuery.toLowerCase()) ||
    fx.type?.toLowerCase().includes(fxSearchQuery.toLowerCase()) ||
    fx.description?.toLowerCase().includes(fxSearchQuery.toLowerCase())
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredEffects.map(e => e.id)));
  }, [filteredEffects]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const hasReturnableEffect = (effect: FxEffect) =>
    effect.source_panel_id || effect.metadata?.panel_id;

  const getReturnPanelId = (effect: FxEffect) =>
    effect.source_panel_id || effect.metadata?.panel_id;

  const getReturnPageSide = (effect: FxEffect) =>
    effect.metadata?.page_side || "left";

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">FX Studio</span>
          <span className="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 border border-purple-700">www.pscomixx.online</span>
        </div>
        <div className="flex items-center gap-1">
          {!selectMode ? (
            <button
              onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition"
              title="Manage effects"
              data-testid="button-fx-manage"
            >
              Manage
            </button>
          ) : (
            <>
              <button
                onClick={selectAll}
                className="px-2 py-1 text-[10px] text-cyan-400 hover:bg-zinc-800 border border-zinc-700 transition"
                data-testid="button-fx-select-all"
              >
                All
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-900/30 border border-red-800/50 transition disabled:opacity-30"
                data-testid="button-fx-bulk-delete"
              >
                {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="p-1 hover:bg-zinc-800"
                data-testid="button-fx-cancel-manage"
              >
                <XCircle className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </>
          )}
          <button onClick={() => loadFxEffects()} className="p-1 hover:bg-zinc-800" title="Refresh">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-36 border-r border-zinc-700 overflow-y-auto bg-zinc-950 shrink-0 relative z-10">
          <button
            onClick={() => setSelectedFolder("all")}
            className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition-colors ${
              selectedFolder === "all"
                ? "bg-zinc-800 text-white border-l-2 border-cyan-400"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
            }`}
            data-testid="button-fx-folder-all"
          >
            <FolderOpen className="w-3 h-3 shrink-0" />
            <span className="truncate">All</span>
            <span className="ml-auto text-[9px] text-zinc-600">{fxEffects.length}</span>
          </button>

          {projectId && (
            <>
              <button
                onClick={() => setSelectedFolder("project")}
                className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition-colors ${
                  selectedFolder === "project"
                    ? "bg-zinc-800 text-white border-l-2 border-cyan-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                }`}
                data-testid="button-fx-folder-project"
              >
                <Target className="w-3 h-3 shrink-0" />
                <span className="truncate">My Project</span>
              </button>
              <button
                onClick={() => setSelectedFolder("returns")}
                className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition-colors ${
                  selectedFolder === "returns"
                    ? "bg-zinc-800 text-amber-300 border-l-2 border-amber-400"
                    : "text-amber-500/60 hover:text-amber-400 hover:bg-zinc-900 border-l-2 border-transparent"
                }`}
                data-testid="button-fx-folder-returns"
              >
                <CornerDownLeft className="w-3 h-3 shrink-0" />
                <span className="truncate">FX Returns</span>
              </button>
            </>
          )}

          <div className="border-t border-zinc-800 my-1" />

          {ASSET_FOLDER_GROUPS.map((group) => (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1 hover:text-zinc-300"
              >
                {expandedGroups.has(group.label) ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{group.label}</span>
              </button>
              {expandedGroups.has(group.label) && group.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedFolder(tag)}
                  className={`w-full text-left pl-6 pr-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors ${
                    selectedFolder === tag
                      ? "bg-zinc-800 text-white border-l-2 border-cyan-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                  }`}
                  data-testid={`button-fx-folder-${tag}`}
                >
                  <span className="truncate">{ASSET_TAG_LABELS[tag]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="p-2 border-b border-zinc-700 shrink-0">
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
                      : selectedFolder === "returns"
                        ? "No FX returns yet. Process panels in FX Studio and send them back."
                        : "No effects in this category. Create effects at www.pscomixx.online."
                    : "No effects match your search."}
                </p>
              </div>
            ) : (
              filteredEffects.map(effect => (
                <div key={effect.id} className={`bg-zinc-900 border overflow-hidden transition group ${
                  selectMode && selectedIds.has(effect.id) ? "border-cyan-500 bg-cyan-950/20" : "border-zinc-700 hover:border-cyan-600"
                }`}>
                  <div className="flex gap-2 p-2">
                    {selectMode && (
                      <button
                        onClick={() => toggleSelectId(effect.id)}
                        className="shrink-0 mt-1"
                        data-testid={`button-fx-select-${effect.id}`}
                      >
                        {selectedIds.has(effect.id) ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600" />
                        )}
                      </button>
                    )}
                    <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {effect.preview_data_url ? (
                        <img src={effect.preview_data_url} alt={effect.name} className="w-full h-full object-contain" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {renamingId === effect.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleRenameEffect(effect.id, renameValue); }}
                          className="flex gap-1"
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="flex-1 bg-zinc-800 border border-cyan-600 px-1.5 py-0.5 text-[11px] text-white outline-none min-w-0"
                            onBlur={() => { setRenamingId(null); setRenameValue(""); }}
                            onKeyDown={(e) => { if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); } }}
                            data-testid={`input-fx-rename-${effect.id}`}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center gap-1">
                          <h4 className="text-[11px] font-bold text-white truncate">{effect.name}</h4>
                          {!selectMode && (
                            <button
                              onClick={() => { setRenamingId(effect.id); setRenameValue(effect.name); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 transition shrink-0"
                              title="Rename"
                              data-testid={`button-fx-rename-${effect.id}`}
                            >
                              <Pencil className="w-2.5 h-2.5 text-zinc-500" />
                            </button>
                          )}
                        </div>
                      )}
                      {effect.description && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{effect.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {effect.asset_tag && (
                          <span className="text-[9px] bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 border border-cyan-800">
                            {ASSET_TAG_LABELS[effect.asset_tag] || effect.asset_tag}
                          </span>
                        )}
                        {effect.type === "panel-fx-return" && (
                          <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1 border border-amber-800">FX Return</span>
                        )}
                        {effect.type === "comixx-panel-export" && (
                          <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1 border border-purple-800">Exported</span>
                        )}
                        {!effect.asset_tag && effect.type && effect.type !== "panel-fx-return" && effect.type !== "comixx-panel-export" && effect.type.split(",").slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 border border-zinc-700">{t.trim()}</span>
                        ))}
                        {effect.layer_count > 0 && (
                          <span className="text-[9px] text-zinc-500">{effect.layer_count}L</span>
                        )}
                        {effect.total_frames > 0 && (
                          <span className="text-[9px] text-zinc-500">{effect.total_frames}f</span>
                        )}
                        {hasReturnableEffect(effect) && effect.type !== "panel-fx-return" && (
                          <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1 border border-amber-800">Panel</span>
                        )}
                      </div>
                    </div>
                    {!selectMode && (
                      <button
                        onClick={() => handleDeleteEffect(effect.id)}
                        disabled={deletingId === effect.id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/40 transition shrink-0 self-start"
                        title="Delete effect"
                        data-testid={`button-fx-delete-${effect.id}`}
                      >
                        {deletingId === effect.id ? (
                          <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400/70" />
                        )}
                      </button>
                    )}
                  </div>
                  {!selectMode && (
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
                      {effect.type === "comic-script" && (
                        <button
                          onClick={() => navigate(`/import/script?id=${effect.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-green-400 hover:bg-green-900/20 transition border-l border-zinc-700"
                          data-testid={`button-fx-import-script-${effect.id}`}
                        >
                          <FileText className="w-3 h-3" />
                          Import Script
                        </button>
                      )}
                      {onReturnToPanel && hasReturnableEffect(effect) && (
                        <button
                          onClick={() => onReturnToPanel(effect, getReturnPanelId(effect)!, getReturnPageSide(effect))}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-amber-400 hover:bg-amber-900/20 transition border-l border-zinc-700"
                          data-testid={`button-fx-return-${effect.id}`}
                        >
                          <CornerDownLeft className="w-3 h-3" />
                          Return to Panel
                        </button>
                      )}
                      {onApplyToPanel && !hasReturnableEffect(effect) && (
                        <button
                          onClick={() => onApplyToPanel(effect)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-cyan-400 hover:bg-cyan-900/20 transition border-l border-zinc-700"
                          data-testid={`button-fx-apply-${effect.id}`}
                        >
                          <Target className="w-3 h-3" />
                          Apply to Panel
                        </button>
                      )}
                      {onSelectEffect && !onApplyToPanel && !hasReturnableEffect(effect) && (
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
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-zinc-700 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
            <span>{filteredEffects.length} effect{filteredEffects.length !== 1 ? "s" : ""}</span>
            {selectMode && selectedIds.size > 0 && (
              <span className="text-cyan-400">{selectedIds.size} selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
