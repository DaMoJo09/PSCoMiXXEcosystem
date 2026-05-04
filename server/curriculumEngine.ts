import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
import { curriculumProgress, users, xpTransactions } from '@shared/schema';
import { findObjectivesByAction, getObjectiveById, getAllObjectivesForCurriculum, getCurriculum } from '@shared/curriculumData';
import { getLevelFromXp } from './progressionEngine';

export interface CurriculumCompletionResult {
  completed: { curriculumId: string; objectiveId: string; title: string; xpAwarded: number; weekNumber: number }[];
  challengesCompleted: { curriculumId: string; weekNumber: number; title: string; xpAwarded: number }[];
}

async function awardCurriculumXp(userId: string, xpAmount: number, description: string, referenceId: string, referenceType: string): Promise<void> {
  if (xpAmount <= 0) return;

  await db.insert(xpTransactions).values({
    userId,
    amount: xpAmount,
    action: 'curriculum_objective',
    description,
    referenceId,
    referenceType,
  });

  const [user] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId));
  const newXp = (user?.xp || 0) + xpAmount;
  const { level, title } = getLevelFromXp(newXp);

  await db.update(users).set({
    xp: newXp,
    level,
    lastActiveAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function checkAndCompleteObjectives(
  userId: string,
  action: string,
): Promise<CurriculumCompletionResult> {
  const result: CurriculumCompletionResult = { completed: [], challengesCompleted: [] };

  const matchingObjectives = findObjectivesByAction(action);
  if (matchingObjectives.length === 0) return result;

  const existing = await db.select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.userId, userId));

  const completedSet = new Set(existing.map(e => `${e.curriculumId}:${e.objectiveId}`));

  for (const match of matchingObjectives) {
    const key = `${match.curriculumId}:${match.objective.id}`;
    if (completedSet.has(key)) continue;

    const xp = match.objective.xpReward;

    try {
      await db.insert(curriculumProgress).values({
        userId,
        curriculumId: match.curriculumId,
        objectiveId: match.objective.id,
        weekNumber: match.weekNumber,
        xpAwarded: xp,
        autoCompleted: true,
      }).onConflictDoNothing();
    } catch {
      continue;
    }

    await awardCurriculumXp(
      userId, xp,
      `Curriculum: ${match.objective.title}`,
      match.objective.id,
      'curriculum_objective',
    );

    result.completed.push({
      curriculumId: match.curriculumId,
      objectiveId: match.objective.id,
      title: match.objective.title,
      xpAwarded: xp,
      weekNumber: match.weekNumber,
    });

    completedSet.add(key);

    const challengeResult = await checkWeeklyChallenge(userId, match.curriculumId, match.weekNumber, completedSet);
    if (challengeResult) {
      result.challengesCompleted.push(challengeResult);
    }
  }

  return result;
}

async function checkWeeklyChallenge(
  userId: string,
  curriculumId: string,
  weekNumber: number,
  completedSet: Set<string>,
): Promise<{ curriculumId: string; weekNumber: number; title: string; xpAwarded: number } | null> {
  const challengeKey = `${curriculumId}:challenge-w${weekNumber}`;
  if (completedSet.has(challengeKey)) return null;

  const curr = getCurriculum(curriculumId);
  if (!curr) return null;

  const week = curr.weeks.find(w => w.number === weekNumber);
  if (!week) return null;

  const weekObjectiveIds = week.sessions.flatMap(s => s.objectives.map(o => o.id));
  const allDone = weekObjectiveIds.every(id => completedSet.has(`${curriculumId}:${id}`));

  if (!allDone) return null;

  try {
    await db.insert(curriculumProgress).values({
      userId,
      curriculumId,
      objectiveId: `challenge-w${weekNumber}`,
      weekNumber,
      xpAwarded: week.challengeXp,
      autoCompleted: true,
    }).onConflictDoNothing();
  } catch {
    return null;
  }

  await awardCurriculumXp(
    userId, week.challengeXp,
    `Weekly Challenge: ${week.challengeTitle}`,
    `${curriculumId}-week-${weekNumber}`,
    'curriculum_challenge',
  );

  completedSet.add(challengeKey);

  return {
    curriculumId,
    weekNumber,
    title: week.challengeTitle,
    xpAwarded: week.challengeXp,
  };
}

export async function manualCompleteObjective(
  userId: string,
  curriculumId: string,
  objectiveId: string,
): Promise<{ success: boolean; xpAwarded: number; challengeCompleted?: { weekNumber: number; title: string; xpAwarded: number } }> {
  const curr = getCurriculum(curriculumId);
  if (!curr) return { success: false, xpAwarded: 0 };

  let weekNumber = 0;
  let objective = null;
  for (const week of curr.weeks) {
    for (const session of week.sessions) {
      const found = session.objectives.find(o => o.id === objectiveId);
      if (found) {
        objective = found;
        weekNumber = week.number;
        break;
      }
    }
    if (objective) break;
  }

  if (!objective) return { success: false, xpAwarded: 0 };

  const existing = await db.select()
    .from(curriculumProgress)
    .where(and(
      eq(curriculumProgress.userId, userId),
      eq(curriculumProgress.curriculumId, curriculumId),
      eq(curriculumProgress.objectiveId, objectiveId),
    ));

  if (existing.length > 0) return { success: false, xpAwarded: 0 };

  const xp = objective.xpReward;

  try {
    await db.insert(curriculumProgress).values({
      userId,
      curriculumId,
      objectiveId,
      weekNumber,
      xpAwarded: xp,
      autoCompleted: false,
    }).onConflictDoNothing();
  } catch {
    return { success: false, xpAwarded: 0 };
  }

  await awardCurriculumXp(
    userId, xp,
    `Curriculum: ${objective.title}`,
    objectiveId,
    'curriculum_objective',
  );

  const allExisting = await db.select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.userId, userId));
  const completedSet = new Set(allExisting.map(e => `${e.curriculumId}:${e.objectiveId}`));
  completedSet.add(`${curriculumId}:${objectiveId}`);

  const challengeResult = await checkWeeklyChallenge(userId, curriculumId, weekNumber, completedSet);

  return {
    success: true,
    xpAwarded: xp,
    challengeCompleted: challengeResult ? {
      weekNumber: challengeResult.weekNumber,
      title: challengeResult.title,
      xpAwarded: challengeResult.xpAwarded,
    } : undefined,
  };
}

export async function getUserCurriculumProgress(
  userId: string,
  curriculumId: string,
): Promise<{
  completedObjectives: string[];
  totalObjectives: number;
  totalXpEarned: number;
  weekProgress: { weekNumber: number; completed: number; total: number; challengeDone: boolean }[];
}> {
  const curr = getCurriculum(curriculumId);
  if (!curr) return { completedObjectives: [], totalObjectives: 0, totalXpEarned: 0, weekProgress: [] };

  const rows = await db.select()
    .from(curriculumProgress)
    .where(and(
      eq(curriculumProgress.userId, userId),
      eq(curriculumProgress.curriculumId, curriculumId),
    ));

  const completedSet = new Set(rows.map(r => r.objectiveId));
  const totalXpEarned = rows.reduce((sum, r) => sum + r.xpAwarded, 0);

  const allObjectiveIds = curr.weeks.flatMap(w => w.sessions.flatMap(s => s.objectives.map(o => o.id)));
  const completedObjectiveIds = allObjectiveIds.filter(id => completedSet.has(id));

  const weekProgress = curr.weeks.map(week => {
    const weekObjectiveIds = week.sessions.flatMap(s => s.objectives.map(o => o.id));
    const completed = weekObjectiveIds.filter(id => completedSet.has(id)).length;
    return {
      weekNumber: week.number,
      completed,
      total: weekObjectiveIds.length,
      challengeDone: completedSet.has(`challenge-w${week.number}`),
    };
  });

  return {
    completedObjectives: completedObjectiveIds,
    totalObjectives: allObjectiveIds.length,
    totalXpEarned,
    weekProgress,
  };
}
