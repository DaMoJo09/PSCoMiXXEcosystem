import { db } from './db';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { users, xpEvents, xpBalances, XP_ACTIONS } from '@shared/schema';
import { getLevelFromXp } from './progressionEngine';
import crypto from 'crypto';

type XpActionKey = keyof typeof XP_ACTIONS;

interface XpEventInput {
  userId: string;
  action: string;
  category: string;
  xpAmount: number;
  source?: string;
  sourceApp?: string;
  toolUsed?: string;
  projectId?: string;
  eventKey?: string;
  metadata?: Record<string, any>;
}

function generateDeduplicationHash(userId: string, action: string, projectId?: string, eventKey?: string): string {
  const raw = `${userId}:${action}:${projectId || ''}:${eventKey || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function recordXpEvent(input: XpEventInput): Promise<{ success: boolean; xpAwarded: number; reason?: string }> {
  const actionConfig = Object.values(XP_ACTIONS).find(a => a.action === input.action);
  const cooldownSeconds = actionConfig?.cooldownSeconds || 0;

  const dedupHash = generateDeduplicationHash(input.userId, input.action, input.projectId, input.eventKey);

  if (cooldownSeconds > 0) {
    const cooldownThreshold = new Date(Date.now() - cooldownSeconds * 1000);
    const [recent] = await db.select({ id: xpEvents.id })
      .from(xpEvents)
      .where(and(
        eq(xpEvents.userId, input.userId),
        eq(xpEvents.action, input.action),
        gte(xpEvents.createdAt, cooldownThreshold)
      ))
      .limit(1);

    if (recent) {
      return { success: false, xpAwarded: 0, reason: 'cooldown_active' };
    }
  }

  if (input.eventKey) {
    const [existing] = await db.select({ id: xpEvents.id })
      .from(xpEvents)
      .where(and(
        eq(xpEvents.userId, input.userId),
        eq(xpEvents.deduplicationHash, dedupHash)
      ))
      .limit(1);

    if (existing) {
      return { success: false, xpAwarded: 0, reason: 'duplicate_event' };
    }
  }

  const [event] = await db.insert(xpEvents).values({
    userId: input.userId,
    action: input.action,
    category: input.category,
    xpAmount: input.xpAmount,
    source: input.source || 'comixx',
    sourceApp: input.sourceApp || 'comixx',
    toolUsed: input.toolUsed,
    projectId: input.projectId,
    eventKey: input.eventKey,
    metadata: input.metadata,
    deduplicationHash: dedupHash,
    cooldownGroup: input.action,
  }).returning();

  await db.execute(sql`
    INSERT INTO xp_balances (id, user_id, source, tool_used, total_xp, event_count, last_updated)
    VALUES (gen_random_uuid(), ${input.userId}, ${input.source || 'comixx'}, ${input.toolUsed || null}, ${input.xpAmount}, 1, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  const existingBalance = await db.select()
    .from(xpBalances)
    .where(and(
      eq(xpBalances.userId, input.userId),
      eq(xpBalances.source, input.source || 'comixx')
    ))
    .limit(1);

  if (existingBalance.length > 0) {
    await db.update(xpBalances)
      .set({
        totalXp: sql`${xpBalances.totalXp} + ${input.xpAmount}`,
        eventCount: sql`${xpBalances.eventCount} + 1`,
        lastUpdated: new Date(),
      })
      .where(eq(xpBalances.id, existingBalance[0].id));
  } else {
    await db.insert(xpBalances).values({
      userId: input.userId,
      source: input.source || 'comixx',
      toolUsed: input.toolUsed,
      totalXp: input.xpAmount,
      eventCount: 1,
      lastUpdated: new Date(),
    });
  }

  const [user] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, input.userId));
  const newXp = (user?.xp || 0) + input.xpAmount;
  const { level, title } = getLevelFromXp(newXp);

  await db.update(users)
    .set({
      xp: newXp,
      level,
      creatorClass: title,
    })
    .where(eq(users.id, input.userId));

  return { success: true, xpAwarded: input.xpAmount };
}

export async function recordXpAction(userId: string, actionKey: XpActionKey, opts?: {
  source?: string;
  sourceApp?: string;
  toolUsed?: string;
  projectId?: string;
  eventKey?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; xpAwarded: number; reason?: string }> {
  const config = XP_ACTIONS[actionKey];
  return recordXpEvent({
    userId,
    action: config.action,
    category: config.category,
    xpAmount: config.xp,
    source: opts?.source,
    sourceApp: opts?.sourceApp,
    toolUsed: opts?.toolUsed,
    projectId: opts?.projectId,
    eventKey: opts?.eventKey,
    metadata: opts?.metadata,
  });
}

export async function getUserXpBreakdown(userId: string) {
  const balances = await db.select()
    .from(xpBalances)
    .where(eq(xpBalances.userId, userId));

  const recentEvents = await db.select()
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId))
    .orderBy(desc(xpEvents.createdAt))
    .limit(50);

  const [user] = await db.select({
    xp: users.xp,
    level: users.level,
    creatorClass: users.creatorClass,
    ecosystemRole: users.ecosystemRole,
  }).from(users).where(eq(users.id, userId));

  return {
    totalXp: user?.xp || 0,
    level: user?.level || 1,
    title: user?.creatorClass || 'Novice',
    ecosystemRole: user?.ecosystemRole || 'learner',
    balancesBySource: balances,
    recentEvents,
  };
}

export async function checkRoleEligibility(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { eligible: [], current: 'learner' };

  const { roleEligibilityRules } = await import('@shared/schema');
  const rules = await db.select().from(roleEligibilityRules).where(eq(roleEligibilityRules.active, true));

  const eligible: { roleName: string; displayName: string; meetsRequirements: boolean; gaps: string[] }[] = [];

  for (const rule of rules) {
    const gaps: string[] = [];
    if ((user.xp || 0) < rule.minXp) gaps.push(`Need ${rule.minXp - (user.xp || 0)} more XP`);
    if ((user.level || 1) < rule.minLevel) gaps.push(`Need level ${rule.minLevel}`);
    if ((user.conductScore || 100) < (rule.requiredConductScore || 0)) gaps.push(`Conduct score too low`);
    if ((user.reliabilityScore || 100) < (rule.requiredReliabilityScore || 0)) gaps.push(`Reliability score too low`);

    eligible.push({
      roleName: rule.roleName,
      displayName: rule.displayName,
      meetsRequirements: gaps.length === 0,
      gaps,
    });
  }

  return { eligible, current: user.ecosystemRole || 'learner' };
}
