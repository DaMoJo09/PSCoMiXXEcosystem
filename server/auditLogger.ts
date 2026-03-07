import type { Request } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

export async function logAuditEvent(
  action: string,
  options: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    req?: Request;
  } = {}
): Promise<void> {
  try {
    const ip = options.ipAddress || options.req?.ip || options.req?.headers["x-forwarded-for"]?.toString() || "unknown";
    const ua = options.userAgent || options.req?.headers["user-agent"] || "unknown";
    const userId = options.userId || (options.req as any)?.user?.id;

    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      resourceType: options.resourceType || null,
      resourceId: options.resourceId || null,
      ipAddress: ip,
      userAgent: ua,
      metadata: options.metadata || null,
    });
  } catch (err) {
    console.error("[audit] Failed to log event:", action, err);
  }
}

export function auditAuth(action: string, req: Request, metadata?: Record<string, any>) {
  return logAuditEvent(action, { req, metadata });
}

export function auditAdmin(action: string, req: Request, resourceType: string, resourceId?: string, metadata?: Record<string, any>) {
  return logAuditEvent(action, { req, resourceType, resourceId, metadata });
}

export function auditStudent(action: string, req: Request, resourceType: string, resourceId?: string, metadata?: Record<string, any>) {
  return logAuditEvent(action, { req, resourceType, resourceId, metadata });
}
