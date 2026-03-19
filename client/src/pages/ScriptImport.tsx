import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { fxStudioApi, type FxEffect } from "@/lib/api";
import { getScriptStats, scriptToCYOA, scriptToVN, scriptToComic, normalizeScriptData, type ScriptData } from "@/lib/scriptImport";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { FileText, BookOpen, GitBranch, Layers, Users, MessageSquare, Sparkles, Zap, ImageIcon, ArrowRight, RotateCcw } from "lucide-react";

export default function ScriptImport() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const effectId = params.get("id");

  const [scripts, setScripts] = useState<FxEffect[]>([]);
  const [selectedScript, setSelectedScript] = useState<FxEffect | null>(null);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const createProject = useCreateProject();

  const loadScripts = useCallback(async () => {
    setLoading(true);
    try {
      if (effectId) {
        const effect = await fxStudioApi.getEffect(effectId);
        const eff = Array.isArray(effect) ? effect[0] : effect;
        if (eff) {
          setSelectedScript(eff);
          parseScriptFromEffect(eff);
        }
      }

      const params = new URLSearchParams();
      params.set("type", "comic-script");
      const response = await fetch(`/api/fx-studio/effects?${params.toString()}`, { credentials: "include" });
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.effects || [];
      setScripts(list);
    } catch {
      toast.error("Failed to load scripts from FX Studio");
    } finally {
      setLoading(false);
    }
  }, [effectId]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  const parseScriptFromEffect = (effect: FxEffect) => {
    try {
      const metadata = effect.metadata || {};
      const raw = metadata.script_data || { title: effect.name || "Untitled Script", pages: metadata.pages || [], assets: metadata.assets || [] };
      const sd = normalizeScriptData(raw);
      if (!sd.title || sd.title === "Untitled") sd.title = effect.name || "Untitled Script";
      setScriptData(sd);
    } catch {
      toast.error("Could not parse script data");
    }
  };

  const selectScript = (effect: FxEffect) => {
    setSelectedScript(effect);
    parseScriptFromEffect(effect);
  };

  const importToTool = async (tool: "cyoa" | "vn" | "comic") => {
    if (!scriptData || !selectedScript) return;
    setImporting(true);

    try {
      let projectData: any;
      let projectType: string;
      let navigateTo: string;

      if (tool === "cyoa") {
        const { nodes, variables } = scriptToCYOA(scriptData);
        projectData = { nodes, storyVariables: variables };
        projectType = "cyoa";
        navigateTo = "/creator/cyoa";
      } else if (tool === "vn") {
        const { scenes, characters, backgrounds } = scriptToVN(scriptData);
        projectData = { scenes, characters, backgrounds };
        projectType = "vn";
        navigateTo = "/creator/vn";
      } else {
        const spreads = scriptToComic(scriptData);
        projectData = { spreads };
        projectType = "comic";
        navigateTo = "/creator/comic";
      }

      const result = await createProject.mutateAsync({
        title: scriptData.title,
        type: projectType,
        status: "draft",
        data: projectData,
      });

      toast.success(`Script imported to ${tool === "cyoa" ? "CYOA Builder" : tool === "vn" ? "Visual Novel" : "Comic Creator"}`);
      navigate(`${navigateTo}?id=${result.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to import script");
    } finally {
      setImporting(false);
    }
  };

  const stats = scriptData ? getScriptStats(scriptData) : null;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold">Script Import</h1>
            <span className="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 border border-purple-700">from PressPlays</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Loading scripts...</span>
            </div>
          ) : !selectedScript ? (
            <div>
              <p className="text-sm text-zinc-400 mb-4">Select a script from PressPlays to import into your creator tool.</p>
              {scripts.length === 0 ? (
                <div className="bg-zinc-900 border-2 border-zinc-700 p-12 text-center">
                  <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 text-sm mb-2">No scripts found</p>
                  <p className="text-zinc-600 text-xs">Create a script at pressplays.site/script and export it to CoMiXX.</p>
                  <button
                    onClick={loadScripts}
                    className="mt-4 px-4 py-2 bg-zinc-800 border border-zinc-600 text-sm hover:bg-zinc-700 transition flex items-center gap-2 mx-auto"
                    data-testid="button-refresh-scripts"
                  >
                    <RotateCcw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scripts.map(script => (
                    <button
                      key={script.id}
                      onClick={() => selectScript(script)}
                      className="bg-zinc-900 border-2 border-zinc-700 p-4 text-left hover:border-cyan-500 transition group"
                      data-testid={`button-script-${script.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-8 h-8 text-cyan-400 shrink-0 mt-1" />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate">{script.name}</h3>
                          {script.description && (
                            <p className="text-xs text-zinc-500 truncate mt-1">{script.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
                            <span>{new Date(script.created_at).toLocaleDateString()}</span>
                            {script.source_mode && <span>{script.source_mode}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => { setSelectedScript(null); setScriptData(null); }}
                className="text-xs text-zinc-500 hover:text-white mb-4 flex items-center gap-1"
                data-testid="button-back-to-scripts"
              >
                &larr; Back to scripts
              </button>

              <div className="bg-zinc-900 border-2 border-white p-6 mb-6">
                <h2 className="text-lg font-bold mb-1">{stats?.title || selectedScript.name}</h2>
                <p className="text-xs text-zinc-500 mb-4">{selectedScript.description || "Script from PressPlays Script Mode"}</p>

                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-zinc-800 border border-zinc-700 p-3">
                      <div className="flex items-center gap-2 text-cyan-400 mb-1">
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-semibold">Pages</span>
                      </div>
                      <span className="text-2xl font-bold" data-testid="text-page-count">{stats.pageCount}</span>
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 p-3">
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs font-semibold">Panels</span>
                      </div>
                      <span className="text-2xl font-bold" data-testid="text-panel-count">{stats.panelCount}</span>
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 p-3">
                      <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold">Characters</span>
                      </div>
                      <span className="text-2xl font-bold" data-testid="text-char-count">{stats.characters.length}</span>
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 p-3">
                      <div className="flex items-center gap-2 text-green-400 mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-semibold">Dialogue</span>
                      </div>
                      <span className="text-2xl font-bold" data-testid="text-dialogue-count">{stats.dialogueCount}</span>
                    </div>
                  </div>
                )}

                {stats && stats.characters.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs text-zinc-500 block mb-1">Characters found:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.characters.map(char => (
                        <span key={char} className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-1 border border-zinc-700">{char}</span>
                      ))}
                    </div>
                  </div>
                )}

                {stats && (stats.sfxCount > 0 || stats.imageCount > 0 || stats.assetCount > 0) && (
                  <div className="flex gap-3 text-[10px] text-zinc-500">
                    {stats.sfxCount > 0 && <span>{stats.sfxCount} SFX</span>}
                    {stats.imageCount > 0 && <span>{stats.imageCount} images</span>}
                    {stats.assetCount > 0 && <span>{stats.assetCount} assets</span>}
                  </div>
                )}
              </div>

              <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">Choose destination</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => importToTool("cyoa")}
                  disabled={importing}
                  className="bg-zinc-900 border-2 border-zinc-700 p-5 text-left hover:border-green-500 transition disabled:opacity-50 group"
                  data-testid="button-import-cyoa"
                >
                  <GitBranch className="w-8 h-8 text-green-400 mb-3" />
                  <h4 className="font-bold text-sm mb-1">CYOA Builder</h4>
                  <p className="text-[11px] text-zinc-500 mb-3">Each panel becomes a story node. Dialogue and narration flow as text. Linear "Continue" choices link the story.</p>
                  <div className="flex items-center gap-1 text-xs text-green-400 opacity-0 group-hover:opacity-100 transition">
                    <ArrowRight className="w-3 h-3" /> Import as interactive story
                  </div>
                </button>

                <button
                  onClick={() => importToTool("vn")}
                  disabled={importing}
                  className="bg-zinc-900 border-2 border-zinc-700 p-5 text-left hover:border-purple-500 transition disabled:opacity-50 group"
                  data-testid="button-import-vn"
                >
                  <BookOpen className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Visual Novel</h4>
                  <p className="text-[11px] text-zinc-500 mb-3">Panels become scenes with dialogue lines. Characters auto-placed on stage. Backgrounds from script assets.</p>
                  <div className="flex items-center gap-1 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition">
                    <ArrowRight className="w-3 h-3" /> Import as visual novel
                  </div>
                </button>

                <button
                  onClick={() => importToTool("comic")}
                  disabled={importing}
                  className="bg-zinc-900 border-2 border-zinc-700 p-5 text-left hover:border-cyan-500 transition disabled:opacity-50 group"
                  data-testid="button-import-comic"
                >
                  <Layers className="w-8 h-8 text-cyan-400 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Comic Creator</h4>
                  <p className="text-[11px] text-zinc-500 mb-3">Pages generate spreads with auto-laid panels. Dialogue becomes speech bubbles, SFX becomes text overlays.</p>
                  <div className="flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition">
                    <ArrowRight className="w-3 h-3" /> Import as comic pages
                  </div>
                </button>
              </div>

              {importing && (
                <div className="flex items-center justify-center gap-3 mt-6 text-sm text-zinc-400">
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
                  Creating project...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
