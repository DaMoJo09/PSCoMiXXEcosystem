import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import { Database, HardDrive, Image, History, AlertTriangle, TrendingDown, Play, Trash2, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TableSize {
  table: string;
  totalBytes: number;
  heapBytes: number;
  toastBytes: number;
  indexBytes: number;
}
interface Base64Group {
  key: string;
  label: string;
  totalRows: number;
  base64Rows: number;
  avgBase64Bytes: number;
  estBase64Bytes: number;
}
interface StorageAudit {
  generatedAt: string;
  dbSizeBytes: number;
  billedNote: string;
  tables: TableSize[];
  base64Groups: Base64Group[];
  snapshots: {
    totalRows: number;
    avgBytes: number;
    estBytes: number;
    perWeek: { week: string; count: number }[];
  };
  estimatedSavings: {
    migrateBase64Bytes: number;
    trimSnapshotsBytes: number;
    totalBytes: number;
  };
  destructiveActions: string[];
}

function fmtBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const StatCard = ({ title, value, icon: Icon, subtitle }: any) => (
  <div className="p-6 border border-border bg-card shadow-sm" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold font-display mt-2">{value}</h3>
      </div>
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    {subtitle && <div className="mt-3 text-xs text-muted-foreground">{subtitle}</div>}
  </div>
);

const MIGRATE_TARGETS: { key: string; label: string }[] = [
  { key: "assets", label: "Asset images" },
  { key: "fx_effects", label: "FX previews" },
  { key: "thumbnails", label: "Project thumbnails" },
  { key: "project_data", label: "Embedded project images" },
];

const ALERT_THRESHOLD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB reclaimable

export default function AdminStorage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<Record<string, string>>({});

  const { data, isLoading, error, refetch, isFetching } = useQuery<StorageAudit>({
    queryKey: ["admin", "storage", "audit"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/storage/audit");
      return res.json();
    },
  });

  const migrate = useMutation({
    mutationFn: async ({ target, dryRun }: { target: string; dryRun: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/storage/migrate", { target, dryRun, limit: 200 });
      return { target, dryRun, body: await res.json() };
    },
    onSuccess: ({ target, dryRun, body }) => {
      const msg = dryRun
        ? `${body.remaining} item(s) need migrating`
        : `Migrated ${body.migrated}; ${body.remaining} remaining` + (body.errors?.length ? ` (${body.errors.length} errors)` : "");
      setResults((r) => ({ ...r, [target]: msg }));
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ["admin", "storage", "audit"] });
        toast({ title: "Migration batch done", description: msg });
      }
    },
    onError: (e: any) => toast({ title: "Migration failed", description: e.message, variant: "destructive" }),
  });

  const cleanup = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/storage/cleanup-snapshots", { dryRun, keepPerProject: 5 });
      return { dryRun, body: await res.json() };
    },
    onSuccess: ({ dryRun, body }) => {
      const msg = dryRun ? `${body.wouldDelete} snapshot(s) would be removed` : `Removed ${body.deleted} snapshot(s)`;
      setResults((r) => ({ ...r, snapshots: msg }));
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ["admin", "storage", "audit"] });
        toast({ title: "Snapshot cleanup done", description: msg });
      }
    },
    onError: (e: any) => toast({ title: "Cleanup failed", description: e.message, variant: "destructive" }),
  });

  const runReal = (label: string, fn: () => void) => {
    if (window.confirm(`Run "${label}" for real? This writes to the production database. Make sure you have a recent database checkpoint first.`)) {
      fn();
    }
  };

  const maxTable = data?.tables?.[0]?.totalBytes || 1;
  const overThreshold = (data?.estimatedSavings.totalBytes || 0) >= ALERT_THRESHOLD_BYTES;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              <HardDrive className="w-7 h-7" /> Storage & Cost Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live database footprint, base64 media, and snapshot history that drive PostgreSQL storage cost.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 border border-border bg-card text-sm font-mono hover:bg-accent transition-colors disabled:opacity-50"
            data-testid="button-refresh-audit"
          >
            {isFetching ? "Scanning…" : "Re-scan"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : error ? (
          <div className="p-6 border border-destructive text-destructive" data-testid="text-audit-error">
            Failed to load audit: {(error as Error).message}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Live DB Size" value={fmtBytes(data.dbSizeBytes)} icon={Database} subtitle="Current logical data" />
              <StatCard title="Base64 In DB" value={fmtBytes(data.estimatedSavings.migrateBase64Bytes)} icon={Image} subtitle="Movable to Object Storage" />
              <StatCard title="Snapshots" value={data.snapshots.totalRows.toLocaleString()} icon={History} subtitle={`~${fmtBytes(data.snapshots.estBytes)} live`} />
              <StatCard title="Est. Reclaimable" value={fmtBytes(data.estimatedSavings.totalBytes)} icon={TrendingDown} subtitle="From migration + trim" />
            </div>

            {overThreshold && (
              <div className="p-4 border border-destructive bg-destructive/10 text-sm flex gap-3" data-testid="alert-storage-threshold">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold">Storage alert:</span> about {fmtBytes(data.estimatedSavings.totalBytes)} is
                  reclaimable — over the {fmtBytes(ALERT_THRESHOLD_BYTES)} threshold. Run the migration and snapshot
                  cleanup below to bring cost down.
                </p>
              </div>
            )}

            <div className="p-4 border border-amber-500/40 bg-amber-500/5 text-sm flex gap-3" data-testid="text-billed-note">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{data.billedNote}</p>
            </div>

            {/* Migration + cleanup actions */}
            <section>
              <h2 className="text-lg font-bold font-display mb-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Move Media Out of the Database
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Each action defaults to a safe <span className="font-mono">Preview</span> (dry-run) that only counts
                what would change. Migration runs in batches of 200 — repeat until "remaining" hits 0. Always take a
                database checkpoint before running for real.
              </p>
              <div className="border border-border bg-card divide-y divide-border">
                {MIGRATE_TARGETS.map((t) => (
                  <div key={t.key} className="p-3 flex items-center gap-3 flex-wrap" data-testid={`row-migrate-${t.key}`}>
                    <div className="w-48 text-sm font-mono">{t.label}</div>
                    <button
                      onClick={() => migrate.mutate({ target: t.key, dryRun: true })}
                      disabled={migrate.isPending}
                      className="px-3 py-1.5 border border-border text-xs font-mono hover:bg-accent disabled:opacity-50"
                      data-testid={`button-preview-${t.key}`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => runReal(t.label, () => migrate.mutate({ target: t.key, dryRun: false }))}
                      disabled={migrate.isPending}
                      className="px-3 py-1.5 border border-foreground bg-foreground text-background text-xs font-mono hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                      data-testid={`button-migrate-${t.key}`}
                    >
                      <Play className="w-3 h-3" /> Migrate batch
                    </button>
                    {results[t.key] && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-result-${t.key}`}>{results[t.key]}</span>
                    )}
                  </div>
                ))}
                <div className="p-3 flex items-center gap-3 flex-wrap" data-testid="row-cleanup-snapshots">
                  <div className="w-48 text-sm font-mono">Old snapshots (keep 5)</div>
                  <button
                    onClick={() => cleanup.mutate({ dryRun: true })}
                    disabled={cleanup.isPending}
                    className="px-3 py-1.5 border border-border text-xs font-mono hover:bg-accent disabled:opacity-50"
                    data-testid="button-preview-snapshots"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => runReal("Trim old snapshots", () => cleanup.mutate({ dryRun: false }))}
                    disabled={cleanup.isPending}
                    className="px-3 py-1.5 border border-destructive bg-destructive text-destructive-foreground text-xs font-mono hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                    data-testid="button-cleanup-snapshots"
                  >
                    <Trash2 className="w-3 h-3" /> Delete old
                  </button>
                  {results.snapshots && (
                    <span className="text-xs text-muted-foreground" data-testid="text-result-snapshots">{results.snapshots}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: deleting rows does not instantly shrink the Neon bill — billed storage reflects history/PITR
                retention and decays over the retention window after the data stops changing.
              </p>
            </section>

            {/* Largest tables */}
            <section>
              <h2 className="text-lg font-bold font-display mb-3">Largest Tables</h2>
              <div className="border border-border bg-card divide-y divide-border" data-testid="list-tables">
                {data.tables.map((t) => (
                  <div key={t.table} className="p-3 flex items-center gap-3 text-sm" data-testid={`row-table-${t.table}`}>
                    <div className="w-40 font-mono truncate">{t.table}</div>
                    <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-foreground/70" style={{ width: `${Math.max(2, (t.totalBytes / maxTable) * 100)}%` }} />
                    </div>
                    <div className="w-24 text-right font-mono" data-testid={`text-tablesize-${t.table}`}>{fmtBytes(t.totalBytes)}</div>
                    <div className="w-28 text-right text-xs text-muted-foreground hidden sm:block">media: {fmtBytes(t.toastBytes)}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Base64 media */}
            <section>
              <h2 className="text-lg font-bold font-display mb-3">Images Stored In Database (base64)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.base64Groups.map((g) => (
                  <div key={g.key} className="p-4 border border-border bg-card" data-testid={`card-base64-${g.key}`}>
                    <p className="text-xs font-mono uppercase text-muted-foreground">{g.label}</p>
                    <p className="text-2xl font-bold font-display mt-1" data-testid={`text-base64count-${g.key}`}>
                      {g.base64Rows.toLocaleString()}
                      <span className="text-sm text-muted-foreground font-normal"> / {g.totalRows.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{fmtBytes(g.estBase64Bytes)} ({fmtBytes(g.avgBase64Bytes)} avg)
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Snapshot history */}
            <section>
              <h2 className="text-lg font-bold font-display mb-3">Snapshot History (write churn)</h2>
              <div className="border border-border bg-card p-4">
                {data.snapshots.perWeek.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[...data.snapshots.perWeek].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--foreground))" name="Snapshots created" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No snapshots recorded.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Average snapshot payload: <span className="font-mono">{fmtBytes(data.snapshots.avgBytes)}</span>. Automatic
                  snapshots are now throttled to once per 15 minutes per project to limit history growth.
                </p>
              </div>
            </section>

            {/* Destructive action warnings */}
            <section>
              <h2 className="text-lg font-bold font-display mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Before You Delete
              </h2>
              <ul className="space-y-2" data-testid="list-destructive">
                {data.destructiveActions.map((a, i) => (
                  <li key={i} className="p-3 border border-border bg-card text-sm text-muted-foreground" data-testid={`text-destructive-${i}`}>
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-xs text-muted-foreground text-center">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
