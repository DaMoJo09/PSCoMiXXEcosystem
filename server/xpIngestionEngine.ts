import { db } from "./db";
import { sql } from "drizzle-orm";
import { recordWorkforceSignal } from "./workforceEngine";
import type { XpIngestionRule, XpIngestionLog } from "@shared/schema";

export interface IngestPayload {
  sourceApp: string;
  sourceUserId?: string;
  ecosystemUserEmail?: string;
  ecosystemUserId?: string;
  eventType: string;
  eventTimestamp?: string;
  duration?: number;
  assetId?: string;
  projectId?: string;
  actionCategory?: string;
  skillCategory?: string;
  rawScore?: number;
  verificationLevel?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  status: "awarded" | "held" | "denied" | "translated" | "duplicate" | "error";
  xpAwarded: number;
  logId: string;
  ruleApplied: string | null;
  message: string;
}

async function findRule(sourceApp: string, eventType: string): Promise<any | null> {
  const result = await db.execute(sql.raw(`
    SELECT * FROM xp_ingestion_rules
    WHERE source_app = '${sourceApp.replace(/'/g, "''")}' AND event_type = '${eventType.replace(/'/g, "''")}'
    AND active = true
    LIMIT 1
  `));
  return (result as any).rows?.[0] || null;
}

async function findDefaultRule(sourceApp: string): Promise<any | null> {
  const result = await db.execute(sql.raw(`
    SELECT * FROM xp_ingestion_rules
    WHERE source_app = '${sourceApp.replace(/'/g, "''")}' AND event_type = '*'
    AND active = true
    LIMIT 1
  `));
  return (result as any).rows?.[0] || null;
}

async function checkDuplicate(deduplicationKey: string): Promise<boolean> {
  const result = await db.execute(sql.raw(`
    SELECT id FROM xp_ingestion_log WHERE deduplication_key = '${deduplicationKey.replace(/'/g, "''")}' LIMIT 1
  `));
  return ((result as any).rows || []).length > 0;
}

async function checkCooldown(userId: string, sourceApp: string, eventType: string, cooldownMinutes: number): Promise<boolean> {
  if (cooldownMinutes <= 0) return false;
  const result = await db.execute(sql.raw(`
    SELECT id FROM xp_ingestion_log
    WHERE ecosystem_user_id = '${userId}' AND source_app = '${sourceApp}' AND event_type = '${eventType}'
    AND status = 'awarded' AND created_at > NOW() - INTERVAL '${cooldownMinutes} minutes'
    LIMIT 1
  `));
  return ((result as any).rows || []).length > 0;
}

async function resolveUser(payload: IngestPayload): Promise<string | null> {
  if (payload.ecosystemUserId) return payload.ecosystemUserId;
  if (payload.ecosystemUserEmail) {
    const result = await db.execute(sql.raw(`
      SELECT id FROM users WHERE email = '${payload.ecosystemUserEmail.replace(/'/g, "''")}' LIMIT 1
    `));
    return (result as any).rows?.[0]?.id || null;
  }
  return null;
}

async function writeLog(data: {
  sourceApp: string;
  sourceUserId?: string;
  ecosystemUserId?: string;
  eventType: string;
  eventTimestamp?: string;
  ruleId?: string;
  status: string;
  xpAwarded: number;
  rawPayload: unknown;
  deduplicationKey?: string;
  errorMessage?: string;
}): Promise<string> {
  const result = await db.execute(sql.raw(`
    INSERT INTO xp_ingestion_log (
      source_app, source_user_id, ecosystem_user_id, event_type, event_timestamp,
      rule_id, status, xp_awarded, raw_payload, deduplication_key, error_message
    ) VALUES (
      '${data.sourceApp.replace(/'/g, "''")}',
      ${data.sourceUserId ? `'${data.sourceUserId.replace(/'/g, "''")}'` : "NULL"},
      ${data.ecosystemUserId ? `'${data.ecosystemUserId}'` : "NULL"},
      '${data.eventType.replace(/'/g, "''")}',
      ${data.eventTimestamp ? `'${data.eventTimestamp}'` : "NULL"},
      ${data.ruleId ? `'${data.ruleId}'` : "NULL"},
      '${data.status}',
      ${data.xpAwarded},
      '${JSON.stringify(data.rawPayload).replace(/'/g, "''")}'::jsonb,
      ${data.deduplicationKey ? `'${data.deduplicationKey.replace(/'/g, "''")}'` : "NULL"},
      ${data.errorMessage ? `'${data.errorMessage.replace(/'/g, "''")}'` : "NULL"}
    ) RETURNING id
  `));
  return (result as any).rows[0].id;
}

export async function ingestExternalXp(payload: IngestPayload): Promise<IngestResult> {
  const userId = await resolveUser(payload);
  if (!userId) {
    const logId = await writeLog({
      ...payload,
      status: "error",
      xpAwarded: 0,
      rawPayload: payload,
      errorMessage: "User not found",
    });
    return { status: "error", xpAwarded: 0, logId, ruleApplied: null, message: "User not found in ecosystem" };
  }

  const deduplicationKey = `${payload.sourceApp}:${userId}:${payload.eventType}:${payload.projectId || ""}:${payload.eventTimestamp || ""}`;
  if (await checkDuplicate(deduplicationKey)) {
    const logId = await writeLog({
      ...payload,
      ecosystemUserId: userId,
      status: "duplicate",
      xpAwarded: 0,
      rawPayload: payload,
      deduplicationKey,
    });
    return { status: "duplicate", xpAwarded: 0, logId, ruleApplied: null, message: "Duplicate event" };
  }

  let rule = await findRule(payload.sourceApp, payload.eventType);
  if (!rule) rule = await findDefaultRule(payload.sourceApp);

  const action = rule?.action || "auto_award";

  if (action === "deny") {
    const logId = await writeLog({
      ...payload,
      ecosystemUserId: userId,
      ruleId: rule?.id,
      status: "denied",
      xpAwarded: 0,
      rawPayload: payload,
      deduplicationKey,
    });
    return { status: "denied", xpAwarded: 0, logId, ruleApplied: rule?.id || null, message: "Event denied by rule" };
  }

  if (action === "hold_for_review") {
    const logId = await writeLog({
      ...payload,
      ecosystemUserId: userId,
      ruleId: rule?.id,
      status: "held",
      xpAwarded: 0,
      rawPayload: payload,
      deduplicationKey,
    });
    return { status: "held", xpAwarded: 0, logId, ruleApplied: rule?.id || null, message: "Event held for review" };
  }

  const cooldownMinutes = rule?.cooldown_minutes || 0;
  if (await checkCooldown(userId, payload.sourceApp, payload.eventType, cooldownMinutes)) {
    const logId = await writeLog({
      ...payload,
      ecosystemUserId: userId,
      ruleId: rule?.id,
      status: "denied",
      xpAwarded: 0,
      rawPayload: payload,
      deduplicationKey,
      errorMessage: "Cooldown active",
    });
    return { status: "denied", xpAwarded: 0, logId, ruleApplied: rule?.id || null, message: "Cooldown period active" };
  }

  if (action === "translate_to_workforce") {
    try {
      await recordWorkforceSignal({
        userId,
        signalType: rule?.workforce_signal_type || payload.eventType,
        projectId: payload.projectId,
        toolsUsed: payload.metadata?.toolsUsed as string[] | undefined,
        sourceApp: payload.sourceApp,
        verificationLevel: payload.verificationLevel || "external",
        skillCategories: payload.skillCategory ? [payload.skillCategory] : undefined,
        metadata: payload.metadata,
      });
    } catch {}

    const logId = await writeLog({
      ...payload,
      ecosystemUserId: userId,
      ruleId: rule?.id,
      status: "translated",
      xpAwarded: 0,
      rawPayload: payload,
      deduplicationKey,
    });
    return { status: "translated", xpAwarded: 0, logId, ruleApplied: rule?.id || null, message: "Event translated to workforce signal" };
  }

  const baseXp = payload.rawScore || 10;
  const multiplier = rule?.xp_multiplier || 1;
  const maxXp = rule?.max_xp_per_event || 100;
  const xpToAward = Math.min(baseXp * multiplier, maxXp);

  await db.execute(sql.raw(`
    UPDATE users SET xp = xp + ${xpToAward} WHERE id = '${userId}'
  `));

  if (rule?.generate_workforce_signal) {
    try {
      await recordWorkforceSignal({
        userId,
        signalType: rule.workforce_signal_type || payload.eventType,
        projectId: payload.projectId,
        sourceApp: payload.sourceApp,
        verificationLevel: payload.verificationLevel || "external",
        skillCategories: payload.skillCategory ? [payload.skillCategory] : undefined,
        metadata: payload.metadata,
      });
    } catch {}
  }

  const logId = await writeLog({
    ...payload,
    ecosystemUserId: userId,
    ruleId: rule?.id,
    status: "awarded",
    xpAwarded: xpToAward,
    rawPayload: payload,
    deduplicationKey,
  });

  return { status: "awarded", xpAwarded: xpToAward, logId, ruleApplied: rule?.id || null, message: `Awarded ${xpToAward} XP` };
}

export async function reviewHeldEvent(logId: string, action: "approve" | "deny", reviewerId: string, note?: string): Promise<IngestResult> {
  const logResult = await db.execute(sql.raw(`
    SELECT * FROM xp_ingestion_log WHERE id = '${logId}' AND status = 'held'
  `));
  const log = (logResult as any).rows?.[0];
  if (!log) {
    return { status: "error", xpAwarded: 0, logId, ruleApplied: null, message: "Held event not found" };
  }

  if (action === "deny") {
    await db.execute(sql.raw(`
      UPDATE xp_ingestion_log SET status = 'denied', reviewed_by = '${reviewerId}', reviewed_at = NOW(),
      review_note = ${note ? `'${note.replace(/'/g, "''")}'` : "NULL"}
      WHERE id = '${logId}'
    `));
    return { status: "denied", xpAwarded: 0, logId, ruleApplied: log.rule_id, message: "Event denied by reviewer" };
  }

  const rule = log.rule_id ? (await db.execute(sql.raw(`SELECT * FROM xp_ingestion_rules WHERE id = '${log.rule_id}'`))).rows?.[0] as any : null;
  const payload = log.raw_payload || {};
  const baseXp = payload.rawScore || 10;
  const multiplier = rule?.xp_multiplier || 1;
  const maxXp = rule?.max_xp_per_event || 100;
  const xpToAward = Math.min(baseXp * multiplier, maxXp);

  await db.execute(sql.raw(`
    UPDATE users SET xp = xp + ${xpToAward} WHERE id = '${log.ecosystem_user_id}'
  `));

  await db.execute(sql.raw(`
    UPDATE xp_ingestion_log SET status = 'awarded', xp_awarded = ${xpToAward},
    reviewed_by = '${reviewerId}', reviewed_at = NOW(),
    review_note = ${note ? `'${note.replace(/'/g, "''")}'` : "NULL"}
    WHERE id = '${logId}'
  `));

  return { status: "awarded", xpAwarded: xpToAward, logId, ruleApplied: log.rule_id, message: `Approved and awarded ${xpToAward} XP` };
}

export async function getIngestionLog(filters: {
  sourceApp?: string;
  status?: string;
  userId?: string;
  limit?: number;
}): Promise<XpIngestionLog[]> {
  const conditions: string[] = [];
  if (filters.sourceApp) conditions.push(`source_app = '${filters.sourceApp}'`);
  if (filters.status) conditions.push(`status = '${filters.status}'`);
  if (filters.userId) conditions.push(`ecosystem_user_id = '${filters.userId}'`);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;

  const result = await db.execute(sql.raw(`
    SELECT * FROM xp_ingestion_log ${where} ORDER BY created_at DESC LIMIT ${limit}
  `));
  return (result as any).rows || [];
}

export async function seedDefaultRules(): Promise<void> {
  const existing = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM xp_ingestion_rules`));
  if (Number((existing as any).rows?.[0]?.cnt) > 0) return;

  const defaults = [
    { source: "fxstudio", event: "asset_completed", action: "auto_award", xp: 1, max: 50, workforce: true, wfType: "project_completed" },
    { source: "fxstudio", event: "animation_completed", action: "auto_award", xp: 2, max: 100, workforce: true, wfType: "project_completed" },
    { source: "fxstudio", event: "time_active", action: "auto_award", xp: 1, max: 10, cooldown: 5, workforce: false, wfType: null },
    { source: "fxstudio", event: "project_saved", action: "auto_award", xp: 1, max: 25, cooldown: 1, workforce: false, wfType: null },
    { source: "fxstudio", event: "*", action: "auto_award", xp: 1, max: 25, workforce: false, wfType: null },
    { source: "streaming", event: "publish_approved", action: "auto_award", xp: 3, max: 150, workforce: true, wfType: "project_published" },
    { source: "streaming", event: "challenge_complete", action: "auto_award", xp: 2, max: 100, workforce: true, wfType: "challenge_completed" },
    { source: "streaming", event: "*", action: "auto_award", xp: 1, max: 50, workforce: false, wfType: null },
    { source: "lms", event: "lesson_completed", action: "auto_award", xp: 2, max: 100, workforce: true, wfType: "assignment_completed" },
    { source: "lms", event: "assignment_completed", action: "auto_award", xp: 3, max: 150, workforce: true, wfType: "assignment_completed" },
    { source: "lms", event: "certification_earned", action: "auto_award", xp: 5, max: 500, workforce: true, wfType: "certification_earned" },
    { source: "lms", event: "*", action: "auto_award", xp: 1, max: 50, workforce: false, wfType: null },
  ];

  for (const r of defaults) {
    await db.execute(sql.raw(`
      INSERT INTO xp_ingestion_rules (source_app, event_type, action, xp_multiplier, max_xp_per_event, cooldown_minutes, generate_workforce_signal, workforce_signal_type)
      VALUES ('${r.source}', '${r.event}', '${r.action}', ${r.xp}, ${r.max}, ${(r as any).cooldown || 0}, ${r.workforce}, ${r.wfType ? `'${r.wfType}'` : "NULL"})
    `));
  }
}
