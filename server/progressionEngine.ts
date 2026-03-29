import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
import {
  users, achievements, userAchievements, rewards, userRewards,
  contentPacks, userEntitlements, progressionNotifications,
  levelThresholds, xpTransactions, certifications
} from '@shared/schema';

const LEVEL_THRESHOLDS: { level: number; xp: number; title: string }[] = [
  { level: 1, xp: 0, title: "Novice" },
  { level: 2, xp: 100, title: "Novice" },
  { level: 3, xp: 250, title: "Novice" },
  { level: 4, xp: 450, title: "Novice" },
  { level: 5, xp: 700, title: "Apprentice" },
  { level: 6, xp: 1000, title: "Apprentice" },
  { level: 7, xp: 1400, title: "Apprentice" },
  { level: 8, xp: 1900, title: "Apprentice" },
  { level: 9, xp: 2500, title: "Developing" },
  { level: 10, xp: 3200, title: "Developing" },
  { level: 11, xp: 4000, title: "Developing" },
  { level: 12, xp: 5000, title: "Developing" },
  { level: 13, xp: 6200, title: "Skilled" },
  { level: 14, xp: 7600, title: "Skilled" },
  { level: 15, xp: 9200, title: "Skilled" },
  { level: 16, xp: 11000, title: "Skilled" },
  { level: 17, xp: 13000, title: "Expert" },
  { level: 18, xp: 15500, title: "Expert" },
  { level: 19, xp: 18500, title: "Expert" },
  { level: 20, xp: 22000, title: "Expert" },
  { level: 21, xp: 26000, title: "Master" },
  { level: 22, xp: 31000, title: "Master" },
  { level: 23, xp: 37000, title: "Master" },
  { level: 24, xp: 44000, title: "Master" },
  { level: 25, xp: 52000, title: "Epic" },
  { level: 26, xp: 62000, title: "Epic" },
  { level: 27, xp: 74000, title: "Epic" },
  { level: 28, xp: 88000, title: "Legendary" },
  { level: 29, xp: 105000, title: "Legendary" },
  { level: 30, xp: 125000, title: "Legendary" },
];

export function getLevelFromXp(xp: number): { level: number; title: string } {
  let result = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xp) {
      result = threshold;
    } else {
      break;
    }
  }
  return { level: result.level, title: result.title };
}

export function getXpForNextLevel(currentLevel: number): { needed: number; current: number } {
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
  return {
    current: currentThreshold?.xp || 0,
    needed: nextThreshold?.xp || (currentThreshold?.xp || 0) + 15000,
  };
}

export function getLevelThresholds() {
  return LEVEL_THRESHOLDS;
}

const XP_VALUES: Record<string, number> = {
  first_login: 50,
  daily_login: 10,
  profile_complete: 75,
  project_created: 25,
  project_completed: 50,
  export_completed: 50,
  ai_generation: 15,
  publish: 100,
  save: 25,
  challenge_participation: 75,
  streak_3day: 50,
  streak_7day: 150,
  streak_30day: 500,
  lesson_complete: 40,
  assignment_complete: 60,
  subscription_started: 100,
  first_share: 50,
  hop_created: 25,
  hop_saved: 25,
  hop_published: 100,
  hop_series_created: 150,
};

export function getXpForAction(action: string): number {
  return XP_VALUES[action] || 0;
}

interface ProgressionResult {
  xpAwarded: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  previousLevel: number;
  achievementsUnlocked: { id: string; key: string; title: string; xpReward: number }[];
  rewardsUnlocked: { id: string; key: string; title: string }[];
  levelTitle: string;
}

export async function processProgressionEvent(
  userId: string,
  action: string,
  referenceId?: string,
  referenceType?: string
): Promise<ProgressionResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");

  const xpAmount = getXpForAction(action);
  const previousXp = user.xp || 0;
  const previousLevel = user.level || 1;
  const newXp = previousXp + xpAmount;
  const { level: newLevel, title: levelTitle } = getLevelFromXp(newXp);
  const leveledUp = newLevel > previousLevel;

  if (xpAmount > 0) {
    await db.insert(xpTransactions).values({
      userId,
      amount: xpAmount,
      action,
      description: `Earned ${xpAmount} XP for ${action.replace(/_/g, ' ')}`,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
    });
  }

  await db.update(users).set({
    xp: newXp,
    level: newLevel,
    lastActiveAt: new Date(),
  }).where(eq(users.id, userId));

  if (leveledUp) {
    await db.insert(progressionNotifications).values({
      userId,
      type: 'level_up',
      title: `Level Up! You're now Level ${newLevel}`,
      body: `You've reached "${levelTitle}" status. Keep creating!`,
      referenceType: 'level',
      referenceId: String(newLevel),
    });
  }

  const achievementsUnlocked = await checkAchievements(userId, action, newXp, newLevel, user);
  const rewardsUnlocked = await checkRewards(userId, newXp, newLevel, achievementsUnlocked);

  return {
    xpAwarded: xpAmount,
    newXp,
    newLevel,
    leveledUp,
    previousLevel,
    achievementsUnlocked,
    rewardsUnlocked,
    levelTitle,
  };
}

async function checkAchievements(
  userId: string,
  action: string,
  totalXp: number,
  level: number,
  user: any
): Promise<{ id: string; key: string; title: string; xpReward: number }[]> {
  const allAchievements = await db.select().from(achievements).where(eq(achievements.isActive, true));
  const earned = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  const earnedIds = new Set(earned.map(e => e.achievementId));

  const unlocked: { id: string; key: string; title: string; xpReward: number }[] = [];

  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue;

    const config = achievement.ruleConfig as any;
    let shouldUnlock = false;

    switch (achievement.ruleType) {
      case 'flag': {
        if (config.action === action) shouldUnlock = true;
        break;
      }
      case 'count': {
        const countResult = await db.execute(
          sql`SELECT COUNT(*) as cnt FROM xp_transactions WHERE user_id = ${userId} AND action = ${config.action}`
        );
        const count = Number((countResult.rows[0] as any)?.cnt || 0);
        if (count >= (config.count || 1)) shouldUnlock = true;
        break;
      }
      case 'threshold': {
        if (config.field === 'xp' && totalXp >= (config.value || 0)) shouldUnlock = true;
        if (config.field === 'level' && level >= (config.value || 0)) shouldUnlock = true;
        break;
      }
      case 'tier': {
        break;
      }
      case 'streak': {
        const streakResult = await db.execute(
          sql`SELECT COUNT(DISTINCT DATE(created_at)) as streak_days
              FROM xp_transactions
              WHERE user_id = ${userId}
              AND created_at >= NOW() - INTERVAL '${sql.raw(String(config.days || 3))} days'`
        );
        const streakDays = Number((streakResult.rows[0] as any)?.streak_days || 0);
        if (streakDays >= (config.days || 3)) shouldUnlock = true;
        break;
      }
    }

    if (shouldUnlock) {
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        progressValue: 1,
      });

      if (achievement.xpReward && achievement.xpReward > 0) {
        const currentXp = (await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId)))[0]?.xp || 0;
        await db.update(users).set({ xp: currentXp + achievement.xpReward }).where(eq(users.id, userId));
        await db.insert(xpTransactions).values({
          userId,
          amount: achievement.xpReward,
          action: 'achievement_reward',
          description: `Achievement: ${achievement.title}`,
          referenceId: achievement.id,
          referenceType: 'achievement',
        });
      }

      await db.insert(progressionNotifications).values({
        userId,
        type: 'achievement',
        title: `Achievement Unlocked: ${achievement.title}`,
        body: achievement.description || `You earned the "${achievement.title}" achievement!`,
        referenceType: 'achievement',
        referenceId: achievement.id,
      });

      unlocked.push({
        id: achievement.id,
        key: achievement.key,
        title: achievement.title,
        xpReward: achievement.xpReward || 0,
      });
    }
  }

  return unlocked;
}

async function checkRewards(
  userId: string,
  totalXp: number,
  level: number,
  newAchievements: { key: string }[]
): Promise<{ id: string; key: string; title: string }[]> {
  const allRewards = await db.select().from(rewards).where(eq(rewards.isActive, true));
  const existingRewards = await db.select().from(userRewards).where(eq(userRewards.userId, userId));
  const existingRewardIds = new Set(existingRewards.map(r => r.rewardId));

  const unlocked: { id: string; key: string; title: string }[] = [];

  for (const reward of allRewards) {
    if (existingRewardIds.has(reward.id)) continue;

    const config = reward.unlockConfig as any;
    let shouldUnlock = false;

    switch (reward.unlockType) {
      case 'level':
        if (level >= (config.level || 1)) shouldUnlock = true;
        break;
      case 'xp_total':
        if (totalXp >= (config.xp || 0)) shouldUnlock = true;
        break;
      case 'achievement':
        const earnedKeys = newAchievements.map(a => a.key);
        const allEarned = await db.select().from(userAchievements)
          .where(eq(userAchievements.userId, userId));
        const allEarnedAchievementIds = allEarned.map(a => a.achievementId);
        const allAchievementRecords = await db.select().from(achievements)
          .where(sql`id = ANY(${allEarnedAchievementIds})`);
        const allEarnedKeys = allAchievementRecords.map(a => a.key);
        if (config.achievementKey && allEarnedKeys.includes(config.achievementKey)) {
          shouldUnlock = true;
        }
        break;
      case 'tier':
        break;
    }

    if (shouldUnlock) {
      await db.insert(userRewards).values({
        userId,
        rewardId: reward.id,
        status: 'unlocked',
      });

      const rewardValue = reward.rewardValue as any;
      if (reward.rewardType === 'content_pack' && rewardValue?.packKey) {
        const existing = await db.select().from(userEntitlements)
          .where(and(
            eq(userEntitlements.userId, userId),
            eq(userEntitlements.entitlementKey, rewardValue.packKey)
          ));
        if (existing.length === 0) {
          await db.insert(userEntitlements).values({
            userId,
            entitlementType: 'content_pack',
            entitlementKey: rewardValue.packKey,
            sourceType: 'reward',
            sourceReferenceId: reward.id,
          });
        }
      }

      await db.insert(progressionNotifications).values({
        userId,
        type: 'reward',
        title: `Reward Unlocked: ${reward.title}`,
        body: reward.description || `You unlocked "${reward.title}"!`,
        referenceType: 'reward',
        referenceId: reward.id,
      });

      unlocked.push({ id: reward.id, key: reward.key, title: reward.title });
    }
  }

  return unlocked;
}

export async function claimReward(userId: string, rewardId: string): Promise<boolean> {
  const [userReward] = await db.select().from(userRewards)
    .where(and(eq(userRewards.userId, userId), eq(userRewards.rewardId, rewardId)));
  
  if (!userReward || userReward.status !== 'unlocked') return false;

  await db.update(userRewards).set({
    status: 'claimed',
    claimedAt: new Date(),
  }).where(eq(userRewards.id, userReward.id));

  return true;
}

export async function seedProgressionData() {
  const existingAchievements = await db.select().from(achievements);
  
  await seedCertifications();

  if (existingAchievements.length > 0) return;

  console.log('[progression] Seeding achievements, rewards, and content packs...');

  const achievementData = [
    { key: 'first_login', title: 'Welcome!', description: 'Logged in for the first time', icon: '👋', category: 'onboarding', rarity: 'common', ruleType: 'flag', ruleConfig: { action: 'first_login' }, xpReward: 50 },
    { key: 'profile_complete', title: 'Identity Established', description: 'Completed your profile', icon: '🎭', category: 'onboarding', rarity: 'common', ruleType: 'flag', ruleConfig: { action: 'profile_complete' }, xpReward: 75 },
    { key: 'first_project', title: 'First Creation', description: 'Created your first project', icon: '🎨', category: 'onboarding', rarity: 'common', ruleType: 'flag', ruleConfig: { action: 'project_created' }, xpReward: 50 },
    { key: 'first_export', title: 'Out the Door', description: 'Exported your first project', icon: '📤', category: 'onboarding', rarity: 'common', ruleType: 'flag', ruleConfig: { action: 'export_completed' }, xpReward: 50 },
    { key: 'first_ai_gen', title: 'AI Awakened', description: 'Used AI generation for the first time', icon: '🤖', category: 'onboarding', rarity: 'common', ruleType: 'flag', ruleConfig: { action: 'ai_generation' }, xpReward: 25 },
    { key: 'projects_5', title: 'Getting Started', description: 'Created 5 projects', icon: '📁', category: 'creation', rarity: 'uncommon', ruleType: 'count', ruleConfig: { action: 'project_created', count: 5 }, xpReward: 100 },
    { key: 'projects_10', title: 'Prolific Creator', description: 'Created 10 projects', icon: '🗂️', category: 'creation', rarity: 'rare', ruleType: 'count', ruleConfig: { action: 'project_created', count: 10 }, xpReward: 200 },
    { key: 'projects_25', title: 'World Builder', description: 'Created 25 projects', icon: '🌍', category: 'creation', rarity: 'epic', ruleType: 'count', ruleConfig: { action: 'project_created', count: 25 }, xpReward: 500 },
    { key: 'streak_3', title: '3-Day Streak', description: 'Active for 3 days in a row', icon: '🔥', category: 'streak', rarity: 'common', ruleType: 'streak', ruleConfig: { days: 3 }, xpReward: 50 },
    { key: 'streak_7', title: 'Week Warrior', description: 'Active for 7 days in a row', icon: '💪', category: 'streak', rarity: 'uncommon', ruleType: 'streak', ruleConfig: { days: 7 }, xpReward: 150 },
    { key: 'streak_30', title: 'Monthly Master', description: 'Active for 30 days in a row', icon: '🏆', category: 'streak', rarity: 'epic', ruleType: 'streak', ruleConfig: { days: 30 }, xpReward: 500 },
    { key: 'first_publish', title: 'Published!', description: 'Published your first project', icon: '📰', category: 'community', rarity: 'uncommon', ruleType: 'flag', ruleConfig: { action: 'publish' }, xpReward: 100 },
    { key: 'ai_50', title: 'AI Artist', description: 'Used AI generation 50 times', icon: '🎆', category: 'creation', rarity: 'rare', ruleType: 'count', ruleConfig: { action: 'ai_generation', count: 50 }, xpReward: 200 },
    { key: 'level_10', title: 'Double Digits', description: 'Reached Level 10', icon: '⭐', category: 'creation', rarity: 'rare', ruleType: 'threshold', ruleConfig: { field: 'level', value: 10 }, xpReward: 250 },
    { key: 'level_20', title: 'Elite Creator', description: 'Reached Level 20', icon: '💎', category: 'creation', rarity: 'epic', ruleType: 'threshold', ruleConfig: { field: 'level', value: 20 }, xpReward: 500 },
  ];

  for (const a of achievementData) {
    await db.insert(achievements).values(a).onConflictDoNothing();
  }

  const packData = [
    { key: 'starter_fx_pack', title: 'Starter FX Pack', description: 'Basic visual effects for your comics', packType: 'fx', isXpUnlockable: true, isActive: true },
    { key: 'comic_frames_pack', title: 'Comic Frames Pack', description: 'Classic comic panel frames and borders', packType: 'frames', isXpUnlockable: true, isActive: true },
    { key: 'world_builder_pack', title: 'World Builder Pack', description: 'Backgrounds and environments for world building', packType: 'backgrounds', isXpUnlockable: true, isActive: true },
    { key: 'character_starter_pack', title: 'Character Starter Pack', description: 'Basic character templates and poses', packType: 'characters', isXpUnlockable: true, isActive: true },
    { key: 'overlay_essentials', title: 'Overlay Essentials', description: 'Speech bubbles, effects overlays, and stickers', packType: 'overlays', isXpUnlockable: true, isActive: true },
  ];

  for (const p of packData) {
    await db.insert(contentPacks).values(p).onConflictDoNothing();
  }

  const rewardData = [
    { key: 'starter_fx_reward', title: 'Starter FX Pack', description: 'Unlock the Starter FX Pack at Level 3', rewardType: 'content_pack', rewardValue: { packKey: 'starter_fx_pack' }, unlockType: 'level', unlockConfig: { level: 3 }, isClaimable: true, isActive: true },
    { key: 'comic_frames_reward', title: 'Comic Frames Pack', description: 'Unlock Comic Frames at Level 5', rewardType: 'content_pack', rewardValue: { packKey: 'comic_frames_pack' }, unlockType: 'level', unlockConfig: { level: 5 }, isClaimable: true, isActive: true },
    { key: 'ai_credits_25', title: 'Bonus 25 AI Credits', description: 'Earn 25 bonus AI credits at Level 7', rewardType: 'ai_credits', rewardValue: { credits: 25 }, unlockType: 'level', unlockConfig: { level: 7 }, isClaimable: true, isActive: true },
    { key: 'world_builder_reward', title: 'World Builder Pack', description: 'Unlock World Builder pack for creating 25 projects', rewardType: 'content_pack', rewardValue: { packKey: 'world_builder_pack' }, unlockType: 'achievement', unlockConfig: { achievementKey: 'projects_25' }, isClaimable: true, isActive: true },
    { key: 'character_starter_reward', title: 'Character Starter Pack', description: 'Unlock at Level 10', rewardType: 'content_pack', rewardValue: { packKey: 'character_starter_pack' }, unlockType: 'level', unlockConfig: { level: 10 }, isClaimable: true, isActive: true },
    { key: 'overlay_essentials_reward', title: 'Overlay Essentials', description: 'Unlock overlays at Level 15', rewardType: 'content_pack', rewardValue: { packKey: 'overlay_essentials' }, unlockType: 'level', unlockConfig: { level: 15 }, isClaimable: true, isActive: true },
  ];

  for (const r of rewardData) {
    await db.insert(rewards).values(r).onConflictDoNothing();
  }

  for (const t of LEVEL_THRESHOLDS) {
    await db.insert(levelThresholds).values({
      level: t.level,
      xpRequired: t.xp,
      title: t.title,
    }).onConflictDoNothing();
  }

  console.log('[progression] Seeded 15 achievements, 5 content packs, 6 rewards, 30 level thresholds');
}

async function seedCertifications() {
  const existing = await db.select().from(certifications);
  if (existing.length >= 6) return;

  console.log('[progression] Seeding certifications...');
  const certData = [
    { slug: 'ps-creator-comics', title: 'PS Creator (Comics)', description: 'Demonstrates mastery in digital comic creation. Requires completing and publishing original comic projects with consistent quality.', category: 'creation', icon: 'BookOpen', requiredXp: 5000, requiredLevel: 10, requiredPublished: 3, requiredProjectTypes: ['comic'], requiredProjectCount: 5, sortOrder: 1 },
    { slug: 'ps-interactive-story-designer', title: 'PS Interactive Story Designer', description: 'Demonstrates skill in interactive narrative design. Requires completing and publishing visual novels or choose-your-own-adventure projects.', category: 'creation', icon: 'Gamepad2', requiredXp: 5000, requiredLevel: 10, requiredPublished: 2, requiredProjectTypes: ['vn', 'cyoa'], requiredProjectCount: 4, sortOrder: 2 },
    { slug: 'ps-digital-publisher', title: 'PS Digital Publisher', description: 'Recognizes creators who consistently publish quality content across multiple formats to the ecosystem.', category: 'publishing', icon: 'Globe', requiredXp: 8000, requiredLevel: 13, requiredPublished: 5, requiredProjectTypes: ['comic', 'vn', 'cyoa', 'card', 'motion'], requiredProjectCount: 8, sortOrder: 3 },
    { slug: 'ps-motion-creator', title: 'PS Motion Creator', description: 'Demonstrates ability to create animated and motion-based content including motion comics and animations.', category: 'creation', icon: 'Film', requiredXp: 6000, requiredLevel: 12, requiredPublished: 2, requiredProjectTypes: ['motion'], requiredProjectCount: 3, sortOrder: 4 },
    { slug: 'ps-card-designer', title: 'PS Card Designer', description: 'Demonstrates skill in trading card and collectible design with published card sets.', category: 'creation', icon: 'CreditCard', requiredXp: 4000, requiredLevel: 8, requiredPublished: 2, requiredProjectTypes: ['card'], requiredProjectCount: 5, sortOrder: 5 },
    { slug: 'ps-storyteller', title: 'PS Storyteller', description: 'Master of narrative across all formats. Requires published work spanning comics, interactive stories, and visual novels.', category: 'mastery', icon: 'Award', requiredXp: 15000, requiredLevel: 17, requiredPublished: 8, requiredProjectTypes: ['comic', 'vn', 'cyoa'], requiredProjectCount: 12, sortOrder: 6 },
  ];
  for (const c of certData) {
    await db.insert(certifications).values(c).onConflictDoNothing();
  }
  console.log('[progression] Seeded 6 certifications');
}
