---
name: Base64 storage cost (PSCoMiXX)
description: Why Postgres storage cost ballooned and the permanent metadata-only media architecture that fixes it.
---

# Base64 media is the storage-cost driver

PSCoMiXX Postgres was billed ~1361 GiB vs ~28 GB live data. The gap is Neon
history/PITR retention: huge base64-laden rows churn constantly, so every edit
rewrites multi-MB rows and history accumulates.

**Rule:** media (images, FX previews, thumbnails) must live in Object Storage;
Postgres stores only a small URL reference (e.g. `/objects/<prefix>/<id>`).

**Why:** inline `data:` URLs make rows huge; combined with snapshot/autosave
churn they multiply Neon's retained history far beyond live size.

**How to apply:**
- Any new write path that accepts user image input must call
  `persistDataUrl()` (single field) or `migrateDataUrlsInJson()` (jsonb blob)
  from `server/mediaStorage.ts` BEFORE writing to the DB. Easy to miss new
  endpoints — audit every `createAsset`, `previewDataUrl:`, `thumbnail:`, and
  project `data` writer.
- Migrated objects get a PUBLIC-read ACL and are served by the authless
  `GET /^\/objects\/(.+)/` route in `server/routes.ts`. They MUST be public
  because assets render on community pages with no logged-in user; the ACL
  check still rejects anything not marked public.
- Migration/cleanup admin endpoints (`/api/admin/storage/migrate`,
  `/cleanup-snapshots`) are dry-run by default — callers pass `{dryRun:false}`
  to write. Migration is batched + idempotent (already-migrated rows skipped);
  run repeatedly until `remaining` is 0.

# Neon billing lag (important to communicate)

Deleting rows or shrinking data does NOT instantly lower the bill. Billed
storage reflects history/PITR retention and only decays after the retention
window passes once the data stops changing. Stopping the churn (snapshot
throttle + no new base64) is what actually bends the cost curve.

# Cheap auditing of base64

Never `sum(pg_column_size(col))` over full large columns — it detoasts
everything and times out. Detect base64 cheaply with `left(col,5)='data:'`
and estimate sizes from a small `LIMIT` sample (see `server/storageAudit.ts`).
