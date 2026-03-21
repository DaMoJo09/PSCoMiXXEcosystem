import * as crypto from "crypto";
import { db } from "./db";
import { imageHashes, blockedHashes } from "@shared/schema";
import { eq } from "drizzle-orm";

function computeImageHash(imageBuffer: Buffer): string {
  const sha256 = crypto.createHash("sha256").update(imageBuffer).digest("hex");
  return sha256;
}

function computePerceptualHash(base64Data: string): string {
  const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
  const raw = match ? match[1] : base64Data;
  const buffer = Buffer.from(raw, "base64");

  const blockSize = Math.max(1, Math.floor(buffer.length / 64));
  const values: number[] = [];
  for (let i = 0; i < 64 && i * blockSize < buffer.length; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize && (i * blockSize + j) < buffer.length; j++) {
      sum += buffer[i * blockSize + j];
    }
    values.push(sum / blockSize);
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  let hash = "";
  for (const v of values) {
    hash += v >= avg ? "1" : "0";
  }

  return crypto.createHash("md5").update(hash).digest("hex");
}

function hammingDistance(hash1: string, hash2: string): number {
  let dist = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

export async function scanImage(
  imageData: string | Buffer,
  userId?: string,
  assetId?: string
): Promise<{ allowed: boolean; hash: string; reason?: string }> {
  let buffer: Buffer;
  let pHash: string;

  if (typeof imageData === "string") {
    pHash = computePerceptualHash(imageData);
    const match = imageData.match(/^data:[^;]+;base64,(.+)$/);
    buffer = Buffer.from(match ? match[1] : imageData, "base64");
  } else {
    buffer = imageData;
    pHash = computePerceptualHash(buffer.toString("base64"));
  }

  const exactHash = computeImageHash(buffer);

  const blocked = await db.select().from(blockedHashes);
  for (const entry of blocked) {
    if (entry.hash === exactHash || entry.hash === pHash) {
      await db.insert(imageHashes).values({
        hash: exactHash,
        source: "upload",
        status: "blocked",
        userId: userId || null,
        assetId: assetId || null,
        flaggedReason: entry.reason,
      });

      return {
        allowed: false,
        hash: exactHash,
        reason: `Content blocked: ${entry.reason}`,
      };
    }

    if (hammingDistance(pHash, entry.hash) <= 4) {
      await db.insert(imageHashes).values({
        hash: pHash,
        source: "upload",
        status: "flagged",
        userId: userId || null,
        assetId: assetId || null,
        flaggedReason: `Similar to blocked content: ${entry.reason}`,
      });

      return {
        allowed: false,
        hash: pHash,
        reason: `Content flagged as similar to blocked material`,
      };
    }
  }

  await db.insert(imageHashes).values({
    hash: exactHash,
    source: "upload",
    status: "allowed",
    userId: userId || null,
    assetId: assetId || null,
  });

  return { allowed: true, hash: exactHash };
}

export async function addBlockedHash(
  hash: string,
  reason: string,
  addedBy: string
): Promise<void> {
  await db.insert(blockedHashes).values({
    hash,
    reason,
    addedBy,
  }).onConflictDoNothing();
}

export async function removeBlockedHash(hash: string): Promise<boolean> {
  const result = await db.delete(blockedHashes).where(eq(blockedHashes.hash, hash)).returning();
  return result.length > 0;
}

export async function getBlockedHashes(): Promise<Array<{ id: string; hash: string; reason: string; createdAt: Date }>> {
  return db.select().from(blockedHashes);
}

export async function getFlaggedImages(limit = 50): Promise<any[]> {
  return db.select().from(imageHashes)
    .where(eq(imageHashes.status, "flagged"))
    .limit(limit);
}

export async function reviewImage(
  imageHashId: string,
  status: "allowed" | "blocked",
  reviewedBy: string
): Promise<void> {
  await db.update(imageHashes)
    .set({ status, reviewedBy })
    .where(eq(imageHashes.id, imageHashId));
}

export function isImageData(data: string): boolean {
  return /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(data);
}
