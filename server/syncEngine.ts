import { db } from "./db";
import { syncQueue, syncLogs, ssoAuditLog } from "@shared/schema";
import { eq, and, lt, or, sql, desc, count } from "drizzle-orm";
import { createHmac } from "crypto";

const RETRY_BACKOFF_BASE = 2000;
const MAX_BACKOFF = 300000;
const WORKER_INTERVAL = 10000;
const STALE_PROCESSING_TIMEOUT = 120000;

let workerRunning = false;

function calculateBackoff(retryCount: number): number {
  const delay = RETRY_BACKOFF_BASE * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, MAX_BACKOFF);
}

export async function enqueueSyncEvent(params: {
  sourceApp?: string;
  targetApp: string;
  eventType: string;
  userId?: string | null;
  projectId?: string | null;
  payload: any;
  targetUrl?: string;
  maxRetries?: number;
}): Promise<string> {
  const [item] = await db.insert(syncQueue).values({
    sourceApp: params.sourceApp || "comixx",
    targetApp: params.targetApp,
    eventType: params.eventType,
    userId: params.userId || undefined,
    projectId: params.projectId || undefined,
    payload: params.payload,
    targetUrl: params.targetUrl,
    maxRetries: params.maxRetries || 5,
    status: "pending",
  }).returning();

  await logSyncEvent(item.id, "info", `Sync event queued: ${params.eventType} → ${params.targetApp}`);

  processNextInQueue().catch(() => {});

  return item.id;
}

async function logSyncEvent(syncQueueId: string, level: string, message: string, metadata?: any) {
  try {
    await db.insert(syncLogs).values({
      syncQueueId,
      level,
      message,
      metadata: metadata || undefined,
    });
  } catch {}
}

async function processNextInQueue() {
  const now = new Date();

  const claimed = await db.execute(sql`
    UPDATE sync_queue SET status = 'processing', processing_started_at = ${now}, updated_at = ${now}
    WHERE id = (
      SELECT id FROM sync_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  if (claimed.rows && claimed.rows.length > 0) {
    const row = claimed.rows[0] as any;
    const item = await db.select().from(syncQueue).where(eq(syncQueue.id, row.id));
    if (item[0]) {
      await deliverSyncEvent(item[0]);
      return;
    }
  }

  const retryClaimed = await db.execute(sql`
    UPDATE sync_queue SET status = 'processing', processing_started_at = ${now}, updated_at = ${now}
    WHERE id = (
      SELECT id FROM sync_queue
      WHERE status = 'retrying' AND next_retry_at < ${now}
      ORDER BY next_retry_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  if (retryClaimed.rows && retryClaimed.rows.length > 0) {
    const row = retryClaimed.rows[0] as any;
    const item = await db.select().from(syncQueue).where(eq(syncQueue.id, row.id));
    if (item[0]) {
      await deliverSyncEvent(item[0]);
    }
  }
}

async function deliverSyncEvent(item: typeof syncQueue.$inferSelect) {
  const targetUrl = item.targetUrl;
  if (!targetUrl) {
    await markCompleted(item.id, "completed");
    await logSyncEvent(item.id, "info", "No target URL — marked completed (local-only event)");
    return;
  }

  try {
    await logSyncEvent(item.id, "info", `Delivering to ${targetUrl} (attempt ${item.retryCount + 1})`);

    const payloadStr = JSON.stringify({
      syncId: item.id,
      eventType: item.eventType,
      sourceApp: item.sourceApp,
      userId: item.userId,
      projectId: item.projectId,
      payload: item.payload,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Sync-Event": item.eventType,
      "X-Sync-Id": item.id,
      "X-Source-App": item.sourceApp,
    };

    const webhookSecret =
      process.env.PSSTREAMING_WEBHOOK_SECRET || process.env.EMERGENT_WEBHOOK_SECRET;
    if (webhookSecret) {
      headers["X-Webhook-Signature"] = createHmac("sha256", webhookSecret)
        .update(payloadStr)
        .digest("hex");
    }

    const ecosystemToken = process.env.ECOSYSTEM_JWT_SECRET;
    if (ecosystemToken) {
      headers["Authorization"] = `Bearer ${ecosystemToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      await db.update(syncQueue).set({
        status: "completed",
        responseCode: response.status,
        responseBody: responseBody.slice(0, 2000),
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(syncQueue.id, item.id));

      await logSyncEvent(item.id, "info", `Delivered successfully (${response.status})`, {
        responseCode: response.status,
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 500)}`);
    }
  } catch (err: any) {
    const errorMessage = err.message || "Unknown delivery error";
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      await db.update(syncQueue).set({
        status: "dead_letter",
        lastError: errorMessage,
        retryCount: newRetryCount,
        updatedAt: new Date(),
      }).where(eq(syncQueue.id, item.id));

      await logSyncEvent(item.id, "error", `Max retries exceeded (${item.maxRetries}). Moved to dead letter.`, {
        error: errorMessage,
        retryCount: newRetryCount,
      });
    } else {
      const backoff = calculateBackoff(newRetryCount);
      const nextRetry = new Date(Date.now() + backoff);

      await db.update(syncQueue).set({
        status: "retrying",
        lastError: errorMessage,
        retryCount: newRetryCount,
        nextRetryAt: nextRetry,
        updatedAt: new Date(),
      }).where(eq(syncQueue.id, item.id));

      await logSyncEvent(item.id, "warn", `Delivery failed. Retry ${newRetryCount}/${item.maxRetries} in ${Math.round(backoff / 1000)}s`, {
        error: errorMessage,
        nextRetryAt: nextRetry.toISOString(),
      });
    }
  }
}

async function markCompleted(id: string, status: string) {
  await db.update(syncQueue).set({
    status,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(syncQueue.id, id));
}

async function recoverStaleProcessing() {
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_TIMEOUT);
  const stale = await db.update(syncQueue)
    .set({ status: "retrying", updatedAt: new Date(), lastError: "Processing timeout — recovered" })
    .where(
      and(
        eq(syncQueue.status, "processing"),
        lt(syncQueue.processingStartedAt, staleThreshold),
      )
    )
    .returning();

  if (stale.length > 0) {
    console.log(`[sync-engine] Recovered ${stale.length} stale processing items`);
  }
}

export async function startSyncWorker() {
  if (workerRunning) return;
  workerRunning = true;
  console.log("[sync-engine] Worker started");

  setInterval(async () => {
    try {
      await recoverStaleProcessing();

      const pending = await db.select({ count: count() })
        .from(syncQueue)
        .where(
          or(
            eq(syncQueue.status, "pending"),
            and(
              eq(syncQueue.status, "retrying"),
              lt(syncQueue.nextRetryAt, new Date()),
            ),
          )
        );

      const pendingCount = pending[0]?.count || 0;
      if (pendingCount > 0) {
        const batchSize = Math.min(Number(pendingCount), 5);
        for (let i = 0; i < batchSize; i++) {
          await processNextInQueue();
        }
      }
    } catch (err) {
      console.error("[sync-engine] Worker error:", err);
    }
  }, WORKER_INTERVAL);
}

export async function retrySyncEvent(syncId: string): Promise<boolean> {
  const [item] = await db.select().from(syncQueue).where(eq(syncQueue.id, syncId));
  if (!item) return false;

  await db.update(syncQueue).set({
    status: "pending",
    retryCount: 0,
    lastError: null,
    nextRetryAt: null,
    updatedAt: new Date(),
  }).where(eq(syncQueue.id, syncId));

  await logSyncEvent(syncId, "info", "Manual retry requested — reset to pending");
  processNextInQueue().catch(() => {});
  return true;
}

export async function getSyncStatus(userId?: string) {
  const conditions = userId ? [eq(syncQueue.userId, userId)] : [];

  const stats = await db.select({
    status: syncQueue.status,
    count: count(),
  })
    .from(syncQueue)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(syncQueue.status);

  const statusMap: Record<string, number> = {};
  stats.forEach(s => { statusMap[s.status] = Number(s.count); });

  const recentEvents = await db.select()
    .from(syncQueue)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(syncQueue.createdAt))
    .limit(10);

  return {
    pending: statusMap.pending || 0,
    processing: statusMap.processing || 0,
    completed: statusMap.completed || 0,
    failed: (statusMap.failed || 0) + (statusMap.dead_letter || 0),
    retrying: statusMap.retrying || 0,
    dead_letter: statusMap.dead_letter || 0,
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    recentEvents,
  };
}

export async function getSyncHistory(userId?: string, limit = 50) {
  const conditions = userId ? [eq(syncQueue.userId, userId)] : [];

  return db.select()
    .from(syncQueue)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(syncQueue.createdAt))
    .limit(limit);
}

export async function getSyncLogs(syncQueueId: string) {
  return db.select()
    .from(syncLogs)
    .where(eq(syncLogs.syncQueueId, syncQueueId))
    .orderBy(desc(syncLogs.createdAt));
}

export async function getSyncHealthMetrics() {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const [recentStats] = await db.select({
    total: count(),
    completed: sql<number>`count(*) filter (where ${syncQueue.status} = 'completed')`,
    failed: sql<number>`count(*) filter (where ${syncQueue.status} = 'dead_letter')`,
    retrying: sql<number>`count(*) filter (where ${syncQueue.status} = 'retrying')`,
    pending: sql<number>`count(*) filter (where ${syncQueue.status} = 'pending')`,
  })
    .from(syncQueue)
    .where(sql`${syncQueue.createdAt} > ${last24h}`);

  const [hourlyStats] = await db.select({
    total: count(),
    failed: sql<number>`count(*) filter (where ${syncQueue.status} = 'dead_letter' or ${syncQueue.status} = 'failed')`,
  })
    .from(syncQueue)
    .where(sql`${syncQueue.createdAt} > ${lastHour}`);

  const hourlyFailureRate = hourlyStats.total > 0
    ? (Number(hourlyStats.failed) / Number(hourlyStats.total)) * 100
    : 0;

  const allStats = await db.select({
    status: syncQueue.status,
    count: count(),
  }).from(syncQueue).groupBy(syncQueue.status);

  const allMap: Record<string, number> = {};
  allStats.forEach(s => { allMap[s.status] = Number(s.count); });

  return {
    statusCounts: {
      pending: allMap.pending || 0,
      processing: allMap.processing || 0,
      completed: allMap.completed || 0,
      failed: (allMap.failed || 0) + (allMap.dead_letter || 0),
      retrying: allMap.retrying || 0,
    },
    last24h: {
      total: Number(recentStats.total),
      completed: Number(recentStats.completed),
      failed: Number(recentStats.failed),
      retrying: Number(recentStats.retrying),
      pending: Number(recentStats.pending),
      successRate: recentStats.total > 0
        ? ((Number(recentStats.completed) / Number(recentStats.total)) * 100).toFixed(1)
        : "100.0",
    },
    lastHour: {
      total: Number(hourlyStats.total),
      failed: Number(hourlyStats.failed),
      failureRate: hourlyFailureRate.toFixed(1),
    },
    alerts: {
      highFailureRate: hourlyFailureRate > 20,
      deadLetterBacklog: Number(recentStats.failed) > 10,
      retryBacklog: Number(recentStats.retrying) > 20,
    },
  };
}

export async function logSSOAudit(params: {
  action: string;
  userId?: string | null;
  email?: string | null;
  sourceApp?: string;
  targetApp?: string;
  success: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  tokenId?: string | null;
  metadata?: any;
}) {
  try {
    await db.insert(ssoAuditLog).values({
      action: params.action,
      userId: params.userId || undefined,
      email: params.email || undefined,
      sourceApp: params.sourceApp || "comixx",
      targetApp: params.targetApp,
      success: params.success,
      errorMessage: params.errorMessage || undefined,
      errorCode: params.errorCode || undefined,
      ipAddress: params.ipAddress || undefined,
      userAgent: params.userAgent || undefined,
      tokenId: params.tokenId || undefined,
      metadata: params.metadata || undefined,
    });
  } catch (err) {
    console.error("[sso-audit] Failed to log:", err);
  }
}

export async function getSSOAuditHistory(options: {
  userId?: string;
  limit?: number;
  successOnly?: boolean;
  failuresOnly?: boolean;
} = {}) {
  const conditions = [];
  if (options.userId) conditions.push(eq(ssoAuditLog.userId, options.userId));
  if (options.successOnly) conditions.push(eq(ssoAuditLog.success, true));
  if (options.failuresOnly) conditions.push(eq(ssoAuditLog.success, false));

  return db.select()
    .from(ssoAuditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ssoAuditLog.createdAt))
    .limit(options.limit || 100);
}

export async function getSSOHealthMetrics() {
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [hourly] = await db.select({
    total: count(),
    failures: sql<number>`count(*) filter (where ${ssoAuditLog.success} = false)`,
  })
    .from(ssoAuditLog)
    .where(sql`${ssoAuditLog.createdAt} > ${lastHour}`);

  const [daily] = await db.select({
    total: count(),
    failures: sql<number>`count(*) filter (where ${ssoAuditLog.success} = false)`,
  })
    .from(ssoAuditLog)
    .where(sql`${ssoAuditLog.createdAt} > ${last24h}`);

  const hourlyFailureRate = hourly.total > 0
    ? (Number(hourly.failures) / Number(hourly.total)) * 100
    : 0;

  return {
    lastHour: {
      total: Number(hourly.total),
      failures: Number(hourly.failures),
      failureRate: hourlyFailureRate.toFixed(1),
    },
    last24h: {
      total: Number(daily.total),
      failures: Number(daily.failures),
    },
    alerts: {
      ssoFailureSpike: hourlyFailureRate > 30,
      highVolume: Number(hourly.total) > 100,
    },
  };
}
