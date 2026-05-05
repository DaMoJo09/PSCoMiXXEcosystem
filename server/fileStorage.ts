import * as crypto from "crypto";
import * as path from "path";
import { db } from "./db";
import { exportedFiles, subscriptions, tierEntitlements, type TierName } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "application/json",
  "video/mp4", "video/webm",
  "text/html", "text/plain",
  "application/zip", "application/octet-stream",
];

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR not set. Object Storage bucket is not configured."
    );
  }
  return dir;
}

function parseBucketAndPrefix(fullPath: string): { bucketName: string; prefix: string } {
  const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 1) {
    throw new Error(`Invalid PRIVATE_OBJECT_DIR: ${fullPath}`);
  }
  const bucketName = parts[0];
  const prefix = parts.slice(1).join("/");
  return { bucketName, prefix };
}

function buildObjectKey(prefix: string, userId: string, filename: string): string {
  const segments = [prefix, "exports", userId, filename].filter((s) => s && s.length > 0);
  return segments.join("/");
}

function generateFilename(originalName: string): string {
  const ext = path.extname(originalName) || ".bin";
  const hash = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${hash}${ext}`;
}

export interface QuotaInfo {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  tier: string;
  unlimited: boolean;
}

async function getUserTier(userId: string): Promise<TierName> {
  // Canonical source of tier is the subscriptions table; only honor active /
  // trialing subscriptions. Anything else (canceled, past_due, missing) falls
  // back to free.
  try {
    const [sub] = await db
      .select({ tier: subscriptions.tier, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      const tier = sub.tier as TierName;
      if (tier && tier in tierEntitlements) return tier;
    }
  } catch (err) {
    console.error("getUserTier subscription lookup failed:", err);
  }
  return "free";
}

export async function getUserQuota(userId: string): Promise<QuotaInfo> {
  const tier = await getUserTier(userId);
  const entitlements = tierEntitlements[tier];
  const limitMb = entitlements.maxStorage;
  const limitBytes = limitMb < 0 ? Number.MAX_SAFE_INTEGER : limitMb * 1024 * 1024;
  const usedBytes = await getUserStorageUsage(userId);
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const percentUsed = limitBytes > 0 && limitMb > 0
    ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
    : 0;
  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    percentUsed,
    tier,
    unlimited: limitMb < 0,
  };
}

async function assertQuota(userId: string, incomingBytes: number): Promise<void> {
  const quota = await getUserQuota(userId);
  if (quota.unlimited) return;
  if (quota.usedBytes + incomingBytes > quota.limitBytes) {
    const limitMb = Math.round(quota.limitBytes / 1024 / 1024);
    const usedMb = (quota.usedBytes / 1024 / 1024).toFixed(1);
    const incomingMb = (incomingBytes / 1024 / 1024).toFixed(1);
    const err: any = new Error(
      `Storage quota exceeded. Your ${quota.tier} plan allows ${limitMb}MB ` +
      `(currently using ${usedMb}MB). This file is ${incomingMb}MB. ` +
      `Upgrade your plan or delete files to free space.`
    );
    err.statusCode = 413;
    err.code = "QUOTA_EXCEEDED";
    err.quota = quota;
    throw err;
  }
}

export async function saveFile(
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  projectId?: string
): Promise<{ id: string; filename: string; url: string }> {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }

  await assertQuota(userId, fileBuffer.length);

  const filename = generateFilename(originalName);
  const { bucketName, prefix } = parseBucketAndPrefix(getPrivateDir());
  const objectKey = buildObjectKey(prefix, userId, filename);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectKey);

  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        userId,
        projectId: projectId || "",
        originalName,
      },
    },
    resumable: false,
  });

  const [record] = await db.insert(exportedFiles).values({
    userId,
    projectId: projectId || null,
    filename,
    originalName,
    mimeType,
    sizeBytes: fileBuffer.length,
    storagePath: objectKey,
  }).returning();

  return {
    id: record.id,
    filename: record.filename,
    url: `/api/files/${record.id}`,
  };
}

export async function saveBase64File(
  userId: string,
  base64Data: string,
  originalName: string,
  mimeType: string,
  projectId?: string
): Promise<{ id: string; filename: string; url: string }> {
  const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
  const raw = match ? match[1] : base64Data;
  const buffer = Buffer.from(raw, "base64");
  return saveFile(userId, buffer, originalName, mimeType, projectId);
}

export async function getFileRecord(fileId: string, userId?: string) {
  const conditions = [eq(exportedFiles.id, fileId)];
  if (userId) {
    conditions.push(eq(exportedFiles.userId, userId));
  }
  const [record] = await db.select().from(exportedFiles).where(and(...conditions));
  return record || null;
}

export async function getFile(fileId: string, userId?: string) {
  const record = await getFileRecord(fileId, userId);
  if (!record) return null;

  try {
    const { bucketName } = parseBucketAndPrefix(getPrivateDir());
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(record.storagePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return { ...record, buffer };
  } catch (err) {
    console.error("getFile error:", err);
    return null;
  }
}

export function getFileStream(storagePath: string) {
  const { bucketName } = parseBucketAndPrefix(getPrivateDir());
  const bucket = objectStorageClient.bucket(bucketName);
  return bucket.file(storagePath).createReadStream();
}

export async function getUserFiles(userId: string) {
  return db.select({
    id: exportedFiles.id,
    filename: exportedFiles.filename,
    originalName: exportedFiles.originalName,
    mimeType: exportedFiles.mimeType,
    sizeBytes: exportedFiles.sizeBytes,
    projectId: exportedFiles.projectId,
    createdAt: exportedFiles.createdAt,
  }).from(exportedFiles).where(eq(exportedFiles.userId, userId));
}

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const [record] = await db.select().from(exportedFiles)
    .where(and(eq(exportedFiles.id, fileId), eq(exportedFiles.userId, userId)));

  if (!record) return false;

  try {
    const { bucketName } = parseBucketAndPrefix(getPrivateDir());
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(record.storagePath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete({ ignoreNotFound: true });
    }
  } catch (err) {
    console.error("deleteFile bucket error (continuing to delete DB row):", err);
  }

  await db.delete(exportedFiles)
    .where(and(eq(exportedFiles.id, fileId), eq(exportedFiles.userId, userId)));

  return true;
}

export async function getUserStorageUsage(userId: string): Promise<number> {
  const files = await db.select({ sizeBytes: exportedFiles.sizeBytes })
    .from(exportedFiles)
    .where(eq(exportedFiles.userId, userId));
  return files.reduce((sum, f) => sum + f.sizeBytes, 0);
}
