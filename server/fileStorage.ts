import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { db } from "./db";
import { exportedFiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const STORAGE_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "application/json",
  "video/mp4", "video/webm",
  "text/html", "text/plain",
  "application/zip",
];

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function generateFilename(originalName: string): string {
  const ext = path.extname(originalName) || ".bin";
  const hash = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${hash}${ext}`;
}

export async function saveFile(
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  projectId?: string
): Promise<{ id: string; filename: string; url: string }> {
  ensureStorageDir();

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }

  const filename = generateFilename(originalName);
  const storagePath = path.join(STORAGE_DIR, filename);

  fs.writeFileSync(storagePath, fileBuffer);

  const [record] = await db.insert(exportedFiles).values({
    userId,
    projectId: projectId || null,
    filename,
    originalName,
    mimeType,
    sizeBytes: fileBuffer.length,
    storagePath,
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

export async function getFile(fileId: string, userId?: string) {
  const conditions = [eq(exportedFiles.id, fileId)];
  if (userId) {
    conditions.push(eq(exportedFiles.userId, userId));
  }

  const [record] = await db.select().from(exportedFiles).where(and(...conditions));
  if (!record) return null;

  if (!fs.existsSync(record.storagePath)) {
    return null;
  }

  return {
    ...record,
    buffer: fs.readFileSync(record.storagePath),
  };
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

  if (fs.existsSync(record.storagePath)) {
    fs.unlinkSync(record.storagePath);
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
