import { db } from "./db";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Storage audit — read-only diagnostics for the PostgreSQL storage cost
// problem. All queries here are deliberately CHEAP: they either read catalog
// size metadata or do prefix checks / small samples. They MUST NOT sum
// pg_column_size() across whole large columns, because that forces Postgres to
// decompress (detoast) gigabytes of TOAST data and times out.
// ---------------------------------------------------------------------------

const SAMPLE = 25; // rows sampled to estimate average payload size

export interface TableSize {
  table: string;
  totalBytes: number;
  heapBytes: number;
  toastBytes: number;
  indexBytes: number;
}

export interface Base64Group {
  key: string;
  label: string;
  totalRows: number;
  base64Rows: number;
  avgBase64Bytes: number;
  estBase64Bytes: number;
}

export interface StorageAudit {
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

async function rows<T = any>(query: any): Promise<T[]> {
  const res: any = await db.execute(query);
  return (res?.rows ?? res ?? []) as T[];
}

function num(v: any): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getDbSize(): Promise<number> {
  const r = await rows(sql`SELECT pg_database_size(current_database()) AS bytes`);
  return num(r[0]?.bytes);
}

async function getTableSizes(): Promise<TableSize[]> {
  const r = await rows(sql`
    SELECT c.relname AS table,
           pg_total_relation_size(c.oid) AS total_bytes,
           pg_relation_size(c.oid) AS heap_bytes,
           COALESCE(pg_total_relation_size(c.reltoastrelid), 0) AS toast_bytes,
           pg_indexes_size(c.oid) AS index_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY total_bytes DESC
    LIMIT 15
  `);
  return r.map((t) => ({
    table: String(t.table),
    totalBytes: num(t.total_bytes),
    heapBytes: num(t.heap_bytes),
    toastBytes: num(t.toast_bytes),
    indexBytes: num(t.index_bytes),
  }));
}

// Average payload size of a base64 column, estimated from a small recent
// sample so we never detoast the whole table.
async function avgBase64Bytes(table: string, column: string): Promise<number> {
  const q = sql.raw(`
    SELECT COALESCE(AVG(pg_column_size(${column})), 0) AS avg_bytes
    FROM (
      SELECT ${column} FROM ${table}
      WHERE left(${column}, 5) = 'data:'
      LIMIT ${SAMPLE}
    ) s
  `);
  const r = await rows(q);
  return num(r[0]?.avg_bytes);
}

async function getBase64Groups(): Promise<Base64Group[]> {
  const counts = await rows(sql`
    SELECT
      (SELECT count(*) FROM assets) AS assets_total,
      (SELECT count(*) FROM assets WHERE left(url, 5) = 'data:') AS assets_b64,
      (SELECT count(*) FROM fx_effects) AS fx_total,
      (SELECT count(*) FROM fx_effects WHERE left(preview_data_url, 5) = 'data:') AS fx_b64,
      (SELECT count(*) FROM projects) AS projects_total,
      (SELECT count(*) FROM projects WHERE left(thumbnail, 5) = 'data:') AS project_thumb_b64
  `);
  const c = counts[0] || {};

  const groups: Array<{ key: string; label: string; total: number; b64: number; table: string; col: string }> = [
    { key: "assets", label: "Asset library images", total: num(c.assets_total), b64: num(c.assets_b64), table: "assets", col: "url" },
    { key: "fx_effects", label: "FX Studio previews", total: num(c.fx_total), b64: num(c.fx_b64), table: "fx_effects", col: "preview_data_url" },
    { key: "project_thumbnails", label: "Project thumbnails", total: num(c.projects_total), b64: num(c.project_thumb_b64), table: "projects", col: "thumbnail" },
  ];

  const out: Base64Group[] = [];
  for (const g of groups) {
    const avg = g.b64 > 0 ? await avgBase64Bytes(g.table, g.col) : 0;
    out.push({
      key: g.key,
      label: g.label,
      totalRows: g.total,
      base64Rows: g.b64,
      avgBase64Bytes: Math.round(avg),
      estBase64Bytes: Math.round(avg * g.b64),
    });
  }
  return out;
}

async function getSnapshotStats() {
  const totalR = await rows(sql`SELECT count(*) AS n FROM project_snapshots`);
  const totalRows = num(totalR[0]?.n);

  const avgR = await rows(sql`
    SELECT COALESCE(AVG(pg_column_size(data)), 0) AS avg_bytes
    FROM (SELECT data FROM project_snapshots ORDER BY created_at DESC LIMIT ${SAMPLE}) s
  `);
  const avgBytes = num(avgR[0]?.avg_bytes);

  const weeksR = await rows(sql`
    SELECT date_trunc('week', created_at)::date AS week, count(*) AS n
    FROM project_snapshots
    GROUP BY 1 ORDER BY 1 DESC LIMIT 8
  `);

  return {
    totalRows,
    avgBytes: Math.round(avgBytes),
    estBytes: Math.round(avgBytes * totalRows),
    perWeek: weeksR.map((w) => ({ week: String(w.week), count: num(w.n) })),
  };
}

export async function getStorageAudit(): Promise<StorageAudit> {
  const [dbSizeBytes, tables, base64Groups, snapshots] = await Promise.all([
    getDbSize(),
    getTableSizes(),
    getBase64Groups(),
    getSnapshotStats(),
  ]);

  const migrateBase64Bytes = base64Groups.reduce((s, g) => s + g.estBase64Bytes, 0);
  // Trimming snapshots: keep the most recent few per project. Estimate the
  // reclaimable portion as everything beyond a single retained snapshot of
  // average size per project is hard to know cheaply, so we report the live
  // snapshot footprint as the upper bound of what trimming could remove.
  const trimSnapshotsBytes = snapshots.estBytes;

  return {
    generatedAt: new Date().toISOString(),
    dbSizeBytes,
    billedNote:
      "Replit bills PostgreSQL (Neon) storage including retained history for " +
      "point-in-time recovery, which can be many times larger than the live " +
      "database size shown here. Reducing live size and write churn shrinks " +
      "future history; existing history decays over the retention window or " +
      "can be reset via Replit support.",
    tables,
    base64Groups,
    snapshots,
    estimatedSavings: {
      migrateBase64Bytes,
      trimSnapshotsBytes,
      totalBytes: migrateBase64Bytes + trimSnapshotsBytes,
    },
    destructiveActions: [
      "Migrating base64 → Object Storage rewrites asset/fx/thumbnail rows (reversible; originals backed up first).",
      "Trimming old snapshots permanently deletes backup history beyond the kept window (irreversible).",
      "Mass deletes temporarily INCREASE retained DB history before it decays — the bill drops gradually, not instantly.",
    ],
  };
}
