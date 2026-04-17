import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw, FileText, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SnapshotSummary {
  id: string;
  title: string;
  spreadCount: number;
  contentScore: number;
  reason: string;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string | undefined;
  onRestored?: () => void;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function VersionHistory({ projectId, onRestored }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery<SnapshotSummary[]>({
    queryKey: ["project-snapshots", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/snapshots`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    enabled: !!projectId && open,
    staleTime: 10_000,
  });

  const restore = useMutation({
    mutationFn: async (snapId: string) => {
      const res = await fetch(`/api/projects/${projectId}/snapshots/${snapId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Restore failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Restored", description: "Project rolled back to snapshot. Your previous state was also saved." });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project-snapshots", projectId] });
      setConfirmId(null);
      setOpen(false);
      onRestored?.();
    },
    onError: (e: any) => {
      toast({ title: "Restore failed", description: e?.message || "Try again", variant: "destructive" });
    },
  });

  if (!projectId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase flex items-center gap-2"
        data-testid="button-version-history"
        title="Version history (silent backups)"
      >
        <History className="w-4 h-4" /> History
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)} data-testid="modal-version-history">
          <div className="bg-black border border-white max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white p-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                <h2 className="font-mono uppercase tracking-wider">Version History</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-zinc-900" data-testid="button-close-history">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading && <div className="p-6 text-zinc-500 text-sm font-mono">Loading…</div>}
              {!isLoading && snapshots.length === 0 && (
                <div className="p-6 text-zinc-500 text-sm font-mono">No snapshots yet — they're created automatically as you save.</div>
              )}
              {snapshots.map((s) => (
                <div key={s.id} className="border-b border-zinc-800 p-4 flex items-center justify-between gap-4 hover:bg-zinc-950" data-testid={`row-snapshot-${s.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate" data-testid={`text-snapshot-title-${s.id}`}>{s.title}</span>
                      <span className="text-zinc-600 text-xs px-1.5 py-0.5 border border-zinc-800 uppercase">{s.reason}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex gap-3" data-testid={`text-snapshot-meta-${s.id}`}>
                      <span>{formatRelative(s.createdAt)}</span>
                      <span>{s.spreadCount} spread{s.spreadCount === 1 ? "" : "s"}</span>
                      <span>{s.contentScore} item{s.contentScore === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  {confirmId === s.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restore.mutate(s.id)}
                        disabled={restore.isPending}
                        className="px-3 py-2 bg-white text-black text-xs font-mono uppercase disabled:opacity-50"
                        data-testid={`button-confirm-restore-${s.id}`}
                      >
                        {restore.isPending ? "Restoring…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-2 border border-zinc-700 text-xs font-mono uppercase"
                        data-testid={`button-cancel-restore-${s.id}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(s.id)}
                      className="px-3 py-2 border border-zinc-700 hover:border-white text-xs font-mono uppercase flex items-center gap-1"
                      data-testid={`button-restore-${s.id}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500 font-mono flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>Restoring saves your current state first, so it's always reversible. We keep the 10 most recent versions.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
