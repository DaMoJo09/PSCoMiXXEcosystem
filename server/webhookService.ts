import { randomUUID, createHmac } from "crypto";
import { db } from "./db";
import { webhookDeliveryLog } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000];

interface WebhookEvent {
  id: string;
  event: string;
  version: string;
  timestamp: string;
  source: string;
  data: Record<string, any>;
  signature?: string;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function buildEvent(
  eventType: string,
  data: Record<string, any>
): WebhookEvent {
  return {
    id: randomUUID(),
    event: eventType,
    version: "1.0",
    timestamp: new Date().toISOString(),
    source: "comixx",
    data,
  };
}

export async function dispatchWebhook(
  eventType: string,
  targetUrl: string,
  data: Record<string, any>,
  secret?: string
): Promise<string> {
  const event = buildEvent(eventType, data);
  const payloadStr = JSON.stringify(event);
  if (secret) {
    event.signature = signPayload(payloadStr, secret);
  }

  const [log] = await db
    .insert(webhookDeliveryLog)
    .values({
      eventType,
      targetUrl,
      payload: event,
      status: "pending",
    })
    .returning();

  deliverWebhook(log.id, targetUrl, event, secret).catch(() => {});

  return log.id;
}

async function deliverWebhook(
  logId: string,
  targetUrl: string,
  event: WebhookEvent,
  secret?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event.event,
      "X-Webhook-Id": event.id,
    };
    if (secret) {
      headers["X-Webhook-Signature"] = signPayload(JSON.stringify(event), secret);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    await db
      .update(webhookDeliveryLog)
      .set({
        status: response.ok ? "sent" : "failed",
        responseCode: response.status,
        deliveredAt: response.ok ? new Date() : undefined,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      })
      .where(eq(webhookDeliveryLog.id, logId));
  } catch (error: any) {
    await db
      .update(webhookDeliveryLog)
      .set({
        status: "failed",
        error: error.message || "Delivery failed",
      })
      .where(eq(webhookDeliveryLog.id, logId));
  }
}

export async function retryFailedWebhooks(): Promise<number> {
  const failedLogs = await db
    .select()
    .from(webhookDeliveryLog)
    .where(
      and(
        eq(webhookDeliveryLog.status, "failed"),
        lt(webhookDeliveryLog.retryCount, MAX_RETRIES)
      )
    )
    .limit(50);

  let retried = 0;
  for (const log of failedLogs) {
    const retryCount = (log.retryCount || 0) + 1;
    await db
      .update(webhookDeliveryLog)
      .set({ retryCount, status: "retrying" })
      .where(eq(webhookDeliveryLog.id, log.id));

    const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)];
    setTimeout(() => {
      deliverWebhook(log.id, log.targetUrl, log.payload as any).catch(() => {});
    }, delay);
    retried++;
  }
  return retried;
}

export async function getWebhookLogs(limit = 50, offset = 0) {
  return db
    .select()
    .from(webhookDeliveryLog)
    .orderBy(sql`${webhookDeliveryLog.createdAt} DESC`)
    .limit(limit)
    .offset(offset);
}

let retryInterval: ReturnType<typeof setInterval> | null = null;

export function startWebhookRetryWorker() {
  if (retryInterval) return;
  retryInterval = setInterval(async () => {
    try {
      await retryFailedWebhooks();
    } catch (e) {
      console.error("[webhook-retry] Error:", e);
    }
  }, 5 * 60 * 1000);
}
