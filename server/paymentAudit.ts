import { db } from "./db";
import { auditLogs } from "@shared/schema";
import { logError } from "./errorMonitor";

export type PaymentAction =
  | "checkout.initiated"
  | "checkout.completed"
  | "checkout.failed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "payment.received"
  | "payment.failed"
  | "refund.processed"
  | "portal.opened";

export async function logPaymentEvent(
  action: PaymentAction,
  userId: string | null,
  metadata: Record<string, any>,
  req?: { ip?: string; headers?: Record<string, any> }
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action: `payment.${action}`,
      resourceType: "payment",
      resourceId: metadata.sessionId || metadata.subscriptionId || metadata.customerId || null,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
      metadata,
    });
  } catch (err) {
    logError("Failed to write payment audit log", err as Error, { action, userId, metadata });
  }
}
