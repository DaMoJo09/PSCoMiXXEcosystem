import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { assets, fxEffects, projects, projectSnapshots } from "@shared/schema";
import { persistDataUrl, isDataUrl, migrateDataUrlsInJson } from "./mediaStorage";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

// ---------------------------------------------------------------------------
// Storage migration + cleanup engine.
//
// Moves base64 media out of PostgreSQL into Object Storage and trims snapshot
// history. Every mutating op is:
//   - dry-run by default (callers must pass dryRun:false to write)
//   - idempotent (already-migrated rows are skipped)
//   - batched (process a bounded number per call so requests never time out;
//     run repeatedly until `remaining` is 0)
//   - audited (real runs append a small manifest to Object Storage backups/)
// ---------------------------------------------------------------------------

export type MigrateTarget = "assets" | "fx_effects" | "thumbnails" | "project_data";

export interface MigrateResult {
  target: MigrateTarget;
  dryRun: boolean;
  scanned: number;
  migrated: number;
  remaining: number;
  errors: { id: string; error: string }[];
  manifestPath?: string;
}

export interface CleanupResult {
  dryRun: boolean;
  keepPerProject: number;
  wouldDelete: number;
  deleted: number;
}

function num(v: any): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function rows<T = any>(query: any): Promise<T[]> {
  const res: any = await db.execute(query);
  return (res?.rows ?? res ?? []) as T[];
}

async function writeManifest(target: string, entries: any[]): Promise<string | undefined> {
  if (entries.length === 0) return undefined;
  try {
    const dir = (process.env.PRIVATE_OBJECT_DIR || "").replace(/\/$/, "");
    if (!dir) return undefined;
    const parts = dir.split("/").filter(Boolean);
    const bucketName = parts[0];
    const prefix = parts.slice(1).join("/");
    const key = `${prefix}/backups/migration-${target}-${Date.now()}.json`;
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(key);
    await file.save(JSON.stringify({ target, at: new Date().toISOString(), entries }, null, 2), {
      metadata: { contentType: "application/json" },
      resumable: false,
    });
    // Private by default (no public ACL) — backups are not world-readable.
    return `/objects/backups/${key.split("/backups/")[1]}`;
  } catch (err) {
    console.error("[migration] manifest write failed:", err);
    return undefined;
  }
}

async function countDataUrl(table: any, colExpr: any): Promise<number> {
  const r = await rows(sql`SELECT count(*) AS n FROM ${table} WHERE left(${colExpr}, 5) = 'data:'`);
  return num(r[0]?.n);
}

async function migrateColumn(
  target: MigrateTarget,
  opts: { dryRun: boolean; limit: number },
  cfg: {
    table: any;
    colExpr: any;
    prefix: string;
    selectIds: () => Promise<{ id: string; userId: string | null; value: string }[]>;
    update: (id: string, url: string) => Promise<void>;
  },
): Promise<MigrateResult> {
  const totalBefore = await countDataUrl(cfg.table, cfg.colExpr);
  const errors: { id: string; error: string }[] = [];
  const manifest: any[] = [];
  let migrated = 0;

  if (totalBefore === 0) {
    return { target, dryRun: opts.dryRun, scanned: 0, migrated: 0, remaining: 0, errors };
  }

  const candidates = await cfg.selectIds();
  const scanned = candidates.length;

  if (opts.dryRun) {
    return { target, dryRun: true, scanned, migrated: 0, remaining: totalBefore, errors };
  }

  for (const row of candidates) {
    if (!isDataUrl(row.value)) continue;
    try {
      const url = await persistDataUrl(row.value, { ownerId: row.userId || "system", prefix: cfg.prefix });
      if (url !== row.value) {
        await cfg.update(row.id, url);
        migrated++;
        manifest.push({ id: row.id, newUrl: url });
      }
    } catch (err: any) {
      errors.push({ id: row.id, error: err?.message || String(err) });
    }
  }

  const manifestPath = await writeManifest(target, manifest);
  const remaining = Math.max(0, totalBefore - migrated);
  return { target, dryRun: false, scanned, migrated, remaining, errors, manifestPath };
}

export async function migrateAssets(opts: { dryRun: boolean; limit: number }): Promise<MigrateResult> {
  return migrateColumn("assets", opts, {
    table: assets,
    colExpr: assets.url,
    prefix: "assets",
    selectIds: async () => {
      const r = await rows(sql`
        SELECT id, user_id AS "userId", url AS value FROM assets
        WHERE left(url, 5) = 'data:' LIMIT ${opts.limit}
      `);
      return r as any;
    },
    update: async (id, url) => { await db.update(assets).set({ url }).where(eq(assets.id, id)); },
  });
}

export async function migrateFxEffects(opts: { dryRun: boolean; limit: number }): Promise<MigrateResult> {
  return migrateColumn("fx_effects", opts, {
    table: fxEffects,
    colExpr: fxEffects.previewDataUrl,
    prefix: "fx",
    selectIds: async () => {
      const r = await rows(sql`
        SELECT id, user_id AS "userId", preview_data_url AS value FROM fx_effects
        WHERE left(preview_data_url, 5) = 'data:' LIMIT ${opts.limit}
      `);
      return r as any;
    },
    update: async (id, url) => { await db.update(fxEffects).set({ previewDataUrl: url }).where(eq(fxEffects.id, id)); },
  });
}

export async function migrateThumbnails(opts: { dryRun: boolean; limit: number }): Promise<MigrateResult> {
  return migrateColumn("thumbnails", opts, {
    table: projects,
    colExpr: projects.thumbnail,
    prefix: "thumbnails",
    selectIds: async () => {
      const r = await rows(sql`
        SELECT id, user_id AS "userId", thumbnail AS value FROM projects
        WHERE left(thumbnail, 5) = 'data:' LIMIT ${opts.limit}
      `);
      return r as any;
    },
    update: async (id, url) => { await db.update(projects).set({ thumbnail: url }).where(eq(projects.id, id)); },
  });
}

// Embedded base64 inside the project `data` jsonb. Riskiest target (rewrites
// the core blob), so it is processed in small batches and is fully idempotent.
export async function migrateProjectData(opts: { dryRun: boolean; limit: number }): Promise<MigrateResult> {
  const totalR = await rows(sql`
    SELECT count(*) AS n FROM projects WHERE position('data:image' in data::text) > 0
  `);
  const totalBefore = num(totalR[0]?.n);
  if (totalBefore === 0) {
    return { target: "project_data", dryRun: opts.dryRun, scanned: 0, migrated: 0, remaining: 0, errors: [] };
  }

  const candidates = await rows(sql`
    SELECT id, user_id AS "userId" FROM projects
    WHERE position('data:image' in data::text) > 0
    LIMIT ${opts.limit}
  `);
  const scanned = candidates.length;

  if (opts.dryRun) {
    return { target: "project_data", dryRun: true, scanned, migrated: 0, remaining: totalBefore, errors: [] };
  }

  const errors: { id: string; error: string }[] = [];
  const manifest: any[] = [];
  let migrated = 0;

  for (const c of candidates as any[]) {
    try {
      const [proj] = await db.select({ id: projects.id, data: projects.data }).from(projects).where(eq(projects.id, c.id));
      if (!proj) continue;
      const { value, migrated: n } = await migrateDataUrlsInJson(proj.data, { ownerId: c.userId || "system" });
      if (n > 0) {
        await db.update(projects).set({ data: value }).where(eq(projects.id, c.id));
        migrated++;
        manifest.push({ id: c.id, urlsMigrated: n });
      }
    } catch (err: any) {
      errors.push({ id: c.id, error: err?.message || String(err) });
    }
  }

  const manifestPath = await writeManifest("project_data", manifest);
  const remaining = Math.max(0, totalBefore - migrated);
  return { target: "project_data", dryRun: false, scanned, migrated, remaining, errors, manifestPath };
}

export async function runMigration(
  target: MigrateTarget,
  opts: { dryRun: boolean; limit: number },
): Promise<MigrateResult> {
  switch (target) {
    case "assets": return migrateAssets(opts);
    case "fx_effects": return migrateFxEffects(opts);
    case "thumbnails": return migrateThumbnails(opts);
    case "project_data": return migrateProjectData(opts);
    default: throw new Error(`Unknown migration target: ${target}`);
  }
}

// Trim snapshot history to the most recent N per project across the whole DB.
export async function trimSnapshots(opts: { dryRun: boolean; keepPerProject: number }): Promise<CleanupResult> {
  const keep = Math.max(1, opts.keepPerProject);
  const countR = await rows(sql`
    SELECT count(*) AS n FROM (
      SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
      FROM project_snapshots
    ) t WHERE rn > ${keep}
  `);
  const wouldDelete = num(countR[0]?.n);

  if (opts.dryRun || wouldDelete === 0) {
    return { dryRun: opts.dryRun, keepPerProject: keep, wouldDelete, deleted: 0 };
  }

  const res: any = await db.execute(sql`
    DELETE FROM project_snapshots
    WHERE id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
        FROM project_snapshots
      ) t WHERE rn > ${keep}
    )
  `);
  const deleted = res?.rowCount ?? wouldDelete;
  return { dryRun: false, keepPerProject: keep, wouldDelete, deleted };
}
