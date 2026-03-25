import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import {
  BookOpen, Layers, Search, Clock, ChevronRight,
  FileText, Film, Gamepad2, BookMarked, Pencil, Plus,
  Image as ImageIcon, CreditCard, PenTool, GitBranch, Sparkles,
  X, Trash2, GripVertical, Check, Camera, Eye, Users, BarChart3,
  CheckSquare, Square, AlertTriangle
} from "lucide-react";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

function SeriesStatsRow({ seriesId }: { seriesId: string }) {
  const { data: stats } = useQuery<{ totalReads: number; subscriberCount: number; chapterCount: number; completionRate: number }>({
    queryKey: ["series-stats", seriesId],
    queryFn: async () => {
      const res = await fetch(`/api/series/${seriesId}/stats`, { credentials: "include" });
      if (!res.ok) return { totalReads: 0, subscriberCount: 0, chapterCount: 0, completionRate: 0 };
      return res.json();
    },
  });

  if (!stats || (stats.totalReads === 0 && stats.subscriberCount === 0)) return null;

  return (
    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-zinc-500" data-testid={`series-stats-${seriesId}`}>
      {stats.totalReads > 0 && (
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {stats.totalReads} reads</span>
      )}
      {stats.subscriberCount > 0 && (
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {stats.subscriberCount} subs</span>
      )}
      {stats.chapterCount > 1 && stats.completionRate > 0 && (
        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {stats.completionRate}% finish</span>
      )}
    </div>
  );
}

interface Project {
  id: string;
  userId: string;
  title: string;
  type: string;
  status: string;
  data: any;
  thumbnail: string | null;
  seriesId: string | null;
  seriesOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Series {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; editorPath: string }> = {
  comic: { label: "Comic", icon: BookOpen, color: "text-cyan-400 border-cyan-400", editorPath: "/creator/comic" },
  card: { label: "Trading Card", icon: CreditCard, color: "text-yellow-400 border-yellow-400", editorPath: "/creator/card" },
  vn: { label: "Visual Novel", icon: BookMarked, color: "text-purple-400 border-purple-400", editorPath: "/creator/vn" },
  cyoa: { label: "CYOA", icon: Gamepad2, color: "text-green-400 border-green-400", editorPath: "/creator/cyoa" },
  cover: { label: "Cover Art", icon: ImageIcon, color: "text-pink-400 border-pink-400", editorPath: "/creator/comic" },
  motion: { label: "Motion Comic", icon: Film, color: "text-orange-400 border-orange-400", editorPath: "/creator/motion" },
};

type FilterType = "all" | "wip" | "completed" | "comic" | "card" | "vn" | "cyoa" | "cover" | "motion";

export default function LibraryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSeriesPanel, setShowSeriesPanel] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesForm, setSeriesForm] = useState({ title: "", description: "" });
  const [managingSeries, setManagingSeries] = useState<Series | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects?fields=meta", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: seriesList = [] } = useQuery<Series[]>({
    queryKey: ["/api/series"],
    queryFn: async () => {
      const res = await fetch("/api/series", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const createSeriesMutation = useMutation({
    mutationFn: async (body: { title: string; description?: string }) => {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create series");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setSeriesForm({ title: "", description: "" });
      toast({ title: "Series created" });
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string }) => {
      const res = await fetch(`/api/series/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update series");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setEditingSeries(null);
      setSeriesForm({ title: "", description: "" });
      toast({ title: "Series updated" });
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/series/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete series");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Series deleted" });
    },
  });

  const addToSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, projectId, order }: { seriesId: string; projectId: string; order: number }) => {
      const res = await fetch(`/api/series/${seriesId}/comics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, order }),
      });
      if (!res.ok) throw new Error("Failed to add comic to series");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Comic added to series" });
    },
  });

  const removeFromSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, projectId }: { seriesId: string; projectId: string }) => {
      const res = await fetch(`/api/series/${seriesId}/comics/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove comic from series");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Comic removed from series" });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/projects/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      return res.json();
    },
    onSuccess: (data: { deleted: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedIds(new Set());
      setSelectMode(false);
      setConfirmBulkDelete(false);
      toast({ title: `${data.deleted} project${data.deleted !== 1 ? "s" : ""} deleted` });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredProjects.map(p => p.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (filter === "wip") {
      result = result.filter(p => p.status === "draft" || p.status === "review" || p.status === "rejected");
    } else if (filter === "completed") {
      result = result.filter(p => p.status === "published" || p.status === "approved");
    } else if (filter !== "all") {
      result = result.filter(p => p.type === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }

    return result;
  }, [projects, filter, searchQuery]);

  const wipCount = projects.filter(p => p.status === "draft" || p.status === "review" || p.status === "rejected").length;
  const completedCount = projects.filter(p => p.status === "published" || p.status === "approved").length;

  const getComicsInSeries = (seriesId: string) =>
    projects.filter(p => p.seriesId === seriesId).sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));

  const getUnassignedComics = () =>
    projects.filter(p => p.type === "comic" && !p.seriesId);

  const getTypeConfig = (type: string) =>
    PROJECT_TYPE_CONFIG[type] || { label: type, icon: FileText, color: "text-zinc-400 border-zinc-400", editorPath: "/" };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; style: string }> = {
      draft: { label: "DRAFT", style: "bg-zinc-700/50 text-zinc-400 border-zinc-600" },
      review: { label: "IN REVIEW", style: "bg-yellow-500/20 text-yellow-400 border-yellow-500" },
      rejected: { label: "NEEDS WORK", style: "bg-red-500/20 text-red-400 border-red-500" },
      approved: { label: "APPROVED", style: "bg-cyan-500/20 text-cyan-400 border-cyan-500" },
      published: { label: "PUBLISHED", style: "bg-green-500/20 text-green-400 border-green-500" },
    };
    return map[status] || { label: status.toUpperCase(), style: "bg-zinc-700/50 text-zinc-400 border-zinc-600" };
  };

  const getThumbnail = (project: Project) => {
    if (project.thumbnail) return project.thumbnail;
    const data = project.data as any;
    if (data?.pages?.[0]?.panels?.[0]?.content) return data.pages[0].panels[0].content;
    if (data?.coverImage) return data.coverImage;
    if (data?.thumbnail) return data.thumbnail;
    return null;
  };

  const openProject = (project: Project) => {
    const config = getTypeConfig(project.type);
    navigate(`${config.editorPath}?id=${project.id}`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const handleCreateSeries = () => {
    if (!seriesForm.title.trim()) return;
    createSeriesMutation.mutate({
      title: seriesForm.title.trim(),
      description: seriesForm.description.trim() || undefined,
    });
  };

  const handleUpdateSeries = () => {
    if (!editingSeries || !seriesForm.title.trim()) return;
    updateSeriesMutation.mutate({
      id: editingSeries.id,
      title: seriesForm.title.trim(),
      description: seriesForm.description.trim() || undefined,
    });
  };

  const startEditSeries = (s: Series) => {
    setEditingSeries(s);
    setSeriesForm({ title: s.title, description: s.description || "" });
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <Layers className="w-16 h-16 mx-auto text-cyan-400" />
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>MY LIBRARY</h1>
            <p className="text-muted-foreground">Sign in to access your projects</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-library-title">
                MY LIBRARY
              </h1>
              <p className="text-muted-foreground mt-1">
                {projects.length} project{projects.length !== 1 ? "s" : ""} — {wipCount} in progress, {completedCount} completed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={selectMode ? "default" : "outline"}
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={selectMode ? "bg-red-500 hover:bg-red-600 text-white font-bold" : "font-bold"}
                data-testid="btn-toggle-select"
              >
                {selectMode ? (
                  <><X className="w-4 h-4 mr-2" /> CANCEL</>
                ) : (
                  <><CheckSquare className="w-4 h-4 mr-2" /> SELECT</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSeriesPanel(!showSeriesPanel)}
                className="font-bold"
                data-testid="btn-manage-series"
              >
                <GitBranch className="w-4 h-4 mr-2" /> SERIES ({seriesList.length})
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                data-testid="btn-new-project"
              >
                <Plus className="w-4 h-4 mr-2" /> NEW PROJECT
              </Button>
            </div>
          </div>

          {showSeriesPanel && (
            <div className="mb-8 border-2 border-border bg-card p-6" data-testid="series-management-panel">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  COMIC SERIES
                </h2>
                <button onClick={() => setShowSeriesPanel(false)} className="text-muted-foreground hover:text-foreground" data-testid="btn-close-series-panel">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Series title..."
                  value={seriesForm.title}
                  onChange={e => setSeriesForm(f => ({ ...f, title: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-background border border-border text-sm text-foreground focus:border-cyan-500 outline-none"
                  data-testid="input-series-title"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={seriesForm.description}
                  onChange={e => setSeriesForm(f => ({ ...f, description: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-background border border-border text-sm text-foreground focus:border-cyan-500 outline-none"
                  data-testid="input-series-description"
                />
                {editingSeries ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateSeries}
                      disabled={!seriesForm.title.trim() || updateSeriesMutation.isPending}
                      className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                      data-testid="btn-update-series"
                    >
                      <Check className="w-4 h-4 mr-1" /> SAVE
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setEditingSeries(null); setSeriesForm({ title: "", description: "" }); }}
                      data-testid="btn-cancel-edit-series"
                    >
                      CANCEL
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateSeries}
                    disabled={!seriesForm.title.trim() || createSeriesMutation.isPending}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                    data-testid="btn-create-series"
                  >
                    <Plus className="w-4 h-4 mr-1" /> CREATE
                  </Button>
                )}
              </div>

              {seriesList.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">
                  No series yet. Create one to organize your comics into chapters.
                </p>
              ) : (
                <div className="space-y-3">
                  {seriesList.map(s => {
                    const comicsInSeries = getComicsInSeries(s.id);
                    const isManaging = managingSeries?.id === s.id;

                    return (
                      <div key={s.id} className="border border-border bg-background" data-testid={`series-card-${s.id}`}>
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                            <GitBranch className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate" data-testid={`text-series-title-${s.id}`}>{s.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {comicsInSeries.length} comic{comicsInSeries.length !== 1 ? "s" : ""}
                              {s.description && ` · ${s.description}`}
                            </p>
                            <SeriesStatsRow seriesId={s.id} />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setManagingSeries(isManaging ? null : s)}
                              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                                isManaging ? "bg-cyan-500 text-black border-cyan-500" : "border-border text-muted-foreground hover:border-cyan-500/50"
                              }`}
                              data-testid={`btn-manage-comics-${s.id}`}
                            >
                              {isManaging ? "DONE" : "MANAGE"}
                            </button>
                            <button
                              onClick={() => startEditSeries(s)}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              data-testid={`btn-edit-series-${s.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete series "${s.title}"? Comics will not be deleted.`)) {
                                  deleteSeriesMutation.mutate(s.id);
                                  if (managingSeries?.id === s.id) setManagingSeries(null);
                                }
                              }}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                              data-testid={`btn-delete-series-${s.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isManaging && (
                          <div className="border-t border-border p-4 bg-muted/30">
                            {comicsInSeries.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-bold text-muted-foreground mb-2">COMICS IN SERIES</p>
                                <div className="space-y-1">
                                  {comicsInSeries.map((comic, idx) => (
                                    <div
                                      key={comic.id}
                                      className="flex items-center gap-3 px-3 py-2 bg-background border border-border"
                                      data-testid={`series-comic-item-${comic.id}`}
                                    >
                                      <span className="text-xs text-muted-foreground w-6 text-center font-bold">{idx + 1}</span>
                                      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                      <span className="text-sm flex-1 truncate">{comic.title}</span>
                                      <button
                                        onClick={() => removeFromSeriesMutation.mutate({ seriesId: s.id, projectId: comic.id })}
                                        className="text-xs text-muted-foreground hover:text-red-400 font-bold"
                                        data-testid={`btn-remove-from-series-${comic.id}`}
                                      >
                                        REMOVE
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2">ADD COMICS</p>
                              {getUnassignedComics().length === 0 ? (
                                <p className="text-xs text-muted-foreground/60 py-2">All comics are assigned to series</p>
                              ) : (
                                <div className="space-y-1">
                                  {getUnassignedComics().map(comic => (
                                    <div
                                      key={comic.id}
                                      className="flex items-center gap-3 px-3 py-2 bg-background border border-dashed border-border hover:border-cyan-500/50 cursor-pointer transition-colors"
                                      onClick={() => addToSeriesMutation.mutate({
                                        seriesId: s.id,
                                        projectId: comic.id,
                                        order: comicsInSeries.length,
                                      })}
                                      data-testid={`btn-add-to-series-${comic.id}`}
                                    >
                                      <Plus className="w-4 h-4 text-cyan-400" />
                                      <span className="text-sm flex-1 truncate">{comic.title}</span>
                                      <span className={`text-xs px-1.5 py-0.5 border ${getStatusInfo(comic.status).style}`}>
                                        {getStatusInfo(comic.status).label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectMode && (
            <div className="mb-4 border-2 border-red-500/50 bg-red-500/5 p-4 flex items-center justify-between flex-wrap gap-3" data-testid="bulk-action-bar">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">
                  {selectedIds.size} of {filteredProjects.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedIds.size === filteredProjects.length ? deselectAll : selectAllFiltered}
                  className="font-bold text-xs"
                  data-testid="btn-select-all"
                >
                  {selectedIds.size === filteredProjects.length ? "DESELECT ALL" : `SELECT ALL ${filteredProjects.length}`}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {!confirmBulkDelete ? (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={selectedIds.size === 0}
                    className="font-bold text-xs border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    data-testid="btn-bulk-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> DELETE SELECTED ({selectedIds.size})
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500 px-4 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-red-400">
                      Permanently delete {selectedIds.size} project{selectedIds.size !== 1 ? "s" : ""}?
                    </span>
                    <Button
                      size="sm"
                      onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                      disabled={bulkDeleteMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
                      data-testid="btn-confirm-bulk-delete"
                    >
                      {bulkDeleteMutation.isPending ? "DELETING..." : "YES, DELETE"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmBulkDelete(false)}
                      className="font-bold text-xs"
                      data-testid="btn-cancel-bulk-delete"
                    >
                      CANCEL
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { id: "all" as FilterType, label: "ALL", count: projects.length },
                { id: "wip" as FilterType, label: "IN PROGRESS", count: wipCount },
                { id: "completed" as FilterType, label: "COMPLETED", count: completedCount },
              ]).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                    filter === f.id
                      ? "bg-cyan-500 text-black border-cyan-500"
                      : "border-border text-muted-foreground hover:border-cyan-500/50"
                  }`}
                  data-testid={`filter-${f.id}`}
                >
                  {f.label} ({f.count})
                </button>
              ))}

              <div className="w-px h-6 bg-border mx-1" />

              {Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => {
                const TypeIcon = config.icon;
                const count = projects.filter(p => p.type === type).length;
                if (count === 0) return null;
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type as FilterType)}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      filter === type
                        ? `${config.color} bg-black`
                        : "border-border text-muted-foreground hover:border-cyan-500/50"
                    }`}
                    data-testid={`filter-type-${type}`}
                  >
                    <TypeIcon className="w-3 h-3" />
                    {config.label.toUpperCase()} ({count})
                  </button>
                );
              })}
            </div>

            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 bg-background border border-border text-sm text-foreground focus:border-cyan-500 outline-none w-56"
                data-testid="library-search"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-testid="skeleton-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-2 border-border bg-card animate-pulse">
                  <div className="aspect-[4/3] bg-zinc-800" />
                  <div className="p-4 border-t border-border space-y-3">
                    <div className="h-5 bg-zinc-800 w-3/4 rounded" />
                    <div className="h-3 bg-zinc-800 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border">
              <Layers className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                {searchQuery ? "No projects match your search" : filter !== "all" ? "No projects in this category" : "Your library is empty"}
              </p>
              <p className="text-muted-foreground/60 text-sm mb-6">
                {searchQuery ? "Try a different search term" : "Start creating to build your library"}
              </p>
              {!searchQuery && filter === "all" && (
                <Button onClick={() => navigate("/")} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold" data-testid="btn-start-creating">
                  START CREATING
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProjects.map((project) => {
                const typeConfig = getTypeConfig(project.type);
                const TypeIcon = typeConfig.icon;
                const thumb = getThumbnail(project);
                const statusInfo = getStatusInfo(project.status);
                const isWip = project.status === "draft" || project.status === "review" || project.status === "rejected";
                const projectSeries = project.seriesId ? seriesList.find(s => s.id === project.seriesId) : null;

                const isSelected = selectedIds.has(project.id);

                return (
                  <div
                    key={project.id}
                    className={`group border-2 bg-card cursor-pointer transition-all hover:shadow-lg relative ${
                      isSelected
                        ? "border-red-500 shadow-red-500/10"
                        : isWip
                        ? "border-border hover:border-yellow-500 hover:shadow-yellow-500/10"
                        : "border-border hover:border-cyan-500 hover:shadow-cyan-500/10"
                    }`}
                    onClick={() => selectMode ? toggleSelect(project.id) : openProject(project)}
                    data-testid={`library-card-${project.id}`}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={project.title}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isWip ? "opacity-80 group-hover:opacity-100" : ""}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TypeIcon className={`w-16 h-16 ${typeConfig.color.split(' ')[0]} opacity-20`} />
                        </div>
                      )}

                      {selectMode && (
                        <div className={`absolute inset-0 z-20 ${isSelected ? "bg-red-500/20" : ""}`}>
                          <div className="absolute top-2 left-2" data-testid={`checkbox-${project.id}`}>
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-red-400" />
                            ) : (
                              <Square className="w-6 h-6 text-white/60" />
                            )}
                          </div>
                        </div>
                      )}

                      {!selectMode && (
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold border ${typeConfig.color} bg-black/80`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label.toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold border ${statusInfo.style}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="absolute bottom-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ThumbnailPicker
                          projectId={project.id}
                          currentThumbnail={project.thumbnail}
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold ${
                          isWip ? "bg-yellow-500 text-black" : "bg-cyan-500 text-black"
                        }`}>
                          {isWip ? (
                            <>CONTINUE EDITING <ChevronRight className="w-3 h-3" /></>
                          ) : (
                            <>OPEN PROJECT <ChevronRight className="w-3 h-3" /></>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 border-t border-border">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-black text-lg truncate flex-1" data-testid={`text-title-${project.id}`}>
                          {project.title}
                        </h3>
                        {!selectMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${project.title}"?`)) {
                                deleteSingleMutation.mutate(project.id);
                              }
                            }}
                            className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                            data-testid={`btn-delete-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(project.updatedAt)}</span>
                        {projectSeries && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <GitBranch className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-400 truncate max-w-[100px]" data-testid={`text-series-badge-${project.id}`}>
                              {projectSeries.title}
                            </span>
                          </>
                        )}
                        {!selectMode && (
                          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border ${typeConfig.color} bg-black/80`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
