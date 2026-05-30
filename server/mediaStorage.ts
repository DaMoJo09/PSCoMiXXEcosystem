import { randomUUID } from "crypto";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { setObjectAclPolicy } from "./replit_integrations/object_storage/objectAcl";

// ---------------------------------------------------------------------------
// Public media storage. Moves image/media bytes OUT of PostgreSQL (where they
// were stored as base64 text and billed as expensive DB storage + history)
// and INTO Object Storage, returning a small same-origin URL that renders
// everywhere (including unauthenticated public pages) via the `/objects/*`
// route. Objects are written with a public-read ACL.
// ---------------------------------------------------------------------------

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:");
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set; Object Storage is not configured.");
  return dir.endsWith("/") ? dir.slice(0, -1) : dir;
}

function parseObjectPath(fullPath: string): { bucketName: string; objectName: string } {
  const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid object path: ${fullPath}`);
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

interface ParsedDataUrl {
  buffer: Buffer;
  mimeType: string;
  ext: string;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const mimeType = (match[1] || "application/octet-stream").toLowerCase();
  const isBase64 = !!match[2];
  const raw = match[3] || "";
  const buffer = isBase64
    ? Buffer.from(raw, "base64")
    : Buffer.from(decodeURIComponent(raw), "utf-8");
  const ext = MIME_EXT[mimeType] || "bin";
  return { buffer, mimeType, ext };
}

/**
 * Uploads a data: URL to Object Storage with a public-read ACL and returns a
 * same-origin `/objects/media/...` URL. If the input is not a data URL it is
 * returned unchanged (idempotent — safe to call on already-migrated URLs).
 */
export async function persistDataUrl(
  value: string,
  opts: { ownerId?: string; prefix?: string } = {},
): Promise<string> {
  if (!isDataUrl(value)) return value;

  const parsed = parseDataUrl(value);
  if (!parsed) return value;
  if (parsed.buffer.length === 0) return value;
  if (parsed.buffer.length > MAX_MEDIA_BYTES) {
    throw new Error(`Media too large (${Math.round(parsed.buffer.length / 1024 / 1024)}MB); max 50MB`);
  }

  const prefix = opts.prefix || "media";
  const objectId = `${Date.now()}-${randomUUID()}.${parsed.ext}`;
  const fullPath = `${getPrivateDir()}/${prefix}/${objectId}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(parsed.buffer, {
    metadata: { contentType: parsed.mimeType },
    resumable: false,
  });
  await setObjectAclPolicy(file, { owner: opts.ownerId || "system", visibility: "public" });

  return `/objects/${prefix}/${objectId}`;
}

/**
 * Best-effort: replace every data: URL embedded anywhere inside an arbitrary
 * JSON value (used for project `data` blobs) with a public Object Storage URL.
 * Returns the rewritten value plus how many URLs were migrated. Non-data
 * strings are left untouched.
 */
export async function migrateDataUrlsInJson(
  value: any,
  opts: { ownerId?: string } = {},
): Promise<{ value: any; migrated: number }> {
  let migrated = 0;

  async function walk(node: any): Promise<any> {
    if (typeof node === "string") {
      if (isDataUrl(node)) {
        try {
          const url = await persistDataUrl(node, { ...opts, prefix: "project-media" });
          if (url !== node) migrated++;
          return url;
        } catch {
          return node;
        }
      }
      return node;
    }
    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) out.push(await walk(item));
      return out;
    }
    if (node && typeof node === "object") {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(node)) out[k] = await walk(v);
      return out;
    }
    return node;
  }

  const result = await walk(value);
  return { value: result, migrated };
}
