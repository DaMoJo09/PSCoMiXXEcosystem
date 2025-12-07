import { 
  users, projects, assets,
  creatorXp, xpTransactions, badges, userBadges,
  learningPathways, lessons, lessonProgress,
  schools, schoolMemberships, schoolChallenges,
  creatorHubs, hubEquipment, equipmentReservations, studioBookings,
  teams, teamMembers, teamProjects, projectCredits,
  publishChannels, publishedContent,
  revenueEvents, payouts, tipJars,
  festivals, festivalWorkshops, workshopRegistrations, festivalSubmissions, festivalVotes, festivalAwards,
  type User, type InsertUser,
  type Project, type InsertProject,
  type Asset, type InsertAsset,
  type CreatorXp, type InsertCreatorXp,
  type XpTransaction, type InsertXpTransaction,
  type Badge, type InsertBadge,
  type UserBadge, type InsertUserBadge,
  type LearningPathway, type InsertLearningPathway,
  type Lesson, type InsertLesson,
  type LessonProgress, type InsertLessonProgress,
  type School, type InsertSchool,
  type CreatorHub, type InsertCreatorHub,
  type Team, type InsertTeam,
  type TeamMember, type InsertTeamMember,
  type PublishChannel, type InsertPublishChannel,
  type PublishedContent, type InsertPublishedContent,
  type Festival, type InsertFestival,
  type FestivalSubmission, type InsertFestivalSubmission,
  type FestivalVote, type InsertFestivalVote,
  type RevenueEvent, type InsertRevenueEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  acceptIpDisclosure(id: string): Promise<User | undefined>;
  acceptUserAgreement(id: string): Promise<User | undefined>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getUserProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Asset operations
  getAsset(id: string): Promise<Asset | undefined>;
  getUserAssets(userId: string): Promise<Asset[]>;
  getProjectAssets(projectId: string): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  deleteAsset(id: string): Promise<boolean>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllProjects(): Promise<Project[]>;
  getProjectStats(): Promise<{ type: string; count: number }[]>;
  
  // Ecosystem operations
  getUserProgression(userId: string): Promise<any>;
  earnXp(userId: string, amount: number, action: string, description?: string, referenceId?: string, referenceType?: string): Promise<any>;
  getLearningPathways(): Promise<LearningPathway[]>;
  getLessonsForPathway(pathwayId: string): Promise<Lesson[]>;
  getUserLessonProgress(userId: string): Promise<LessonProgress[]>;
  updateLessonProgress(userId: string, lessonId: string, pathwayId: string, status: string, progressPercent: number, challengeSubmission?: string): Promise<LessonProgress>;
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  getPublicTeams(): Promise<Team[]>;
  getUserTeams(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  getFestivals(): Promise<Festival[]>;
  getFestival(id: string): Promise<Festival | undefined>;
  getFestivalSubmissions(festivalId: string): Promise<FestivalSubmission[]>;
  createFestivalSubmission(submission: InsertFestivalSubmission): Promise<FestivalSubmission>;
  voteForSubmission(submissionId: string, userId: string): Promise<FestivalVote>;
  getSchools(): Promise<School[]>;
  getCreatorHubs(): Promise<CreatorHub[]>;
  getPublishChannels(): Promise<PublishChannel[]>;
  getUserChannels(userId: string): Promise<PublishChannel[]>;
  createPublishChannel(channel: InsertPublishChannel): Promise<PublishChannel>;
  publishContent(content: InsertPublishedContent): Promise<PublishedContent>;
  getUserRevenue(userId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  async acceptIpDisclosure(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ipDisclosureAccepted: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  async acceptUserAgreement(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ userAgreementAccepted: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }
  
  async getUserProjects(userId: string): Promise<Project[]> {
    return db.select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }
  
  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }
  
  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Asset operations
  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }
  
  async getUserAssets(userId: string): Promise<Asset[]> {
    return db.select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt));
  }
  
  async getProjectAssets(projectId: string): Promise<Asset[]> {
    return db.select()
      .from(assets)
      .where(eq(assets.projectId, projectId))
      .orderBy(desc(assets.createdAt));
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(insertAsset).returning();
    return asset;
  }
  
  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }
  
  async getProjectStats(): Promise<{ type: string; count: number }[]> {
    const stats = await db.select({
      type: projects.type,
      count: count(projects.id)
    })
    .from(projects)
    .groupBy(projects.type);
    
    return stats.map(s => ({ type: s.type, count: Number(s.count) }));
  }

  // ============================================
  // ECOSYSTEM OPERATIONS
  // ============================================

  async getUserProgression(userId: string): Promise<any> {
    let [xp] = await db.select().from(creatorXp).where(eq(creatorXp.userId, userId));
    
    if (!xp) {
      [xp] = await db.insert(creatorXp).values({
        userId,
        totalXp: 0,
        level: 1,
        currentTier: "learner",
        projectsCompleted: 0,
        lessonsCompleted: 0,
        collaborations: 0,
        mentoringSessions: 0,
        festivalParticipations: 0,
      }).returning();
    }

    const earnedBadges = await db.select()
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));

    const userTeamsList = await db.select()
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    const userSchoolsList = await db.select()
      .from(schoolMemberships)
      .innerJoin(schools, eq(schoolMemberships.schoolId, schools.id))
      .where(eq(schoolMemberships.userId, userId));

    return {
      xp,
      badges: earnedBadges.map(eb => ({ ...eb.user_badges, badge: eb.badges })),
      teams: userTeamsList.map(ut => ut.teams),
      schools: userSchoolsList.map(us => us.schools),
      hubs: [],
    };
  }

  async earnXp(userId: string, amount: number, action: string, description?: string, referenceId?: string, referenceType?: string): Promise<any> {
    const [transaction] = await db.insert(xpTransactions).values({
      userId,
      amount,
      action,
      description,
      referenceId,
      referenceType,
    }).returning();

    let [xp] = await db.select().from(creatorXp).where(eq(creatorXp.userId, userId));
    
    if (!xp) {
      [xp] = await db.insert(creatorXp).values({
        userId,
        totalXp: amount,
        level: 1,
        currentTier: "learner",
        projectsCompleted: 0,
        lessonsCompleted: action === "lesson_complete" ? 1 : 0,
        collaborations: 0,
        mentoringSessions: 0,
        festivalParticipations: 0,
      }).returning();
    } else {
      const newTotalXp = xp.totalXp + amount;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      
      let newTier = "learner";
      if (newTotalXp >= 50000) newTier = "community_builder";
      else if (newTotalXp >= 15000) newTier = "founder";
      else if (newTotalXp >= 5000) newTier = "professional";
      else if (newTotalXp >= 2000) newTier = "mentor";
      else if (newTotalXp >= 500) newTier = "creator";

      const updates: any = {
        totalXp: newTotalXp,
        level: newLevel,
        currentTier: newTier,
        updatedAt: new Date(),
      };

      if (action === "lesson_complete") {
        updates.lessonsCompleted = xp.lessonsCompleted + 1;
      } else if (action === "project_publish") {
        updates.projectsCompleted = xp.projectsCompleted + 1;
      } else if (action === "collaboration") {
        updates.collaborations = xp.collaborations + 1;
      } else if (action === "festival_participation") {
        updates.festivalParticipations = xp.festivalParticipations + 1;
      }

      [xp] = await db.update(creatorXp)
        .set(updates)
        .where(eq(creatorXp.userId, userId))
        .returning();
    }

    return { xp, transaction };
  }

  async getLearningPathways(): Promise<LearningPathway[]> {
    return db.select()
      .from(learningPathways)
      .where(eq(learningPathways.published, true))
      .orderBy(learningPathways.sortOrder);
  }

  async getLessonsForPathway(pathwayId: string): Promise<Lesson[]> {
    return db.select()
      .from(lessons)
      .where(eq(lessons.pathwayId, pathwayId))
      .orderBy(lessons.sortOrder);
  }

  async getUserLessonProgress(userId: string): Promise<LessonProgress[]> {
    return db.select()
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId));
  }

  async updateLessonProgress(
    userId: string, 
    lessonId: string, 
    pathwayId: string, 
    status: string, 
    progressPercent: number, 
    challengeSubmission?: string
  ): Promise<LessonProgress> {
    const [existing] = await db.select()
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      ));

    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({
          status,
          progressPercent,
          challengeSubmission,
          completedAt: status === "completed" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(lessonProgress).values({
      userId,
      lessonId,
      pathwayId,
      status,
      progressPercent,
      challengeSubmission,
      completedAt: status === "completed" ? new Date() : undefined,
    }).returning();
    return created;
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(badges.category);
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return db.select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }

  async getPublicTeams(): Promise<Team[]> {
    return db.select()
      .from(teams)
      .where(eq(teams.isPublic, true))
      .orderBy(desc(teams.createdAt));
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const result = await db.select()
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    return result.map(r => r.teams);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    
    await db.insert(teamMembers).values({
      teamId: created.id,
      userId: team.leaderId,
      role: "leader",
    });
    
    return created;
  }

  async getFestivals(): Promise<Festival[]> {
    return db.select()
      .from(festivals)
      .orderBy(desc(festivals.year));
  }

  async getFestival(id: string): Promise<Festival | undefined> {
    const [festival] = await db.select()
      .from(festivals)
      .where(eq(festivals.id, id));
    return festival;
  }

  async getFestivalSubmissions(festivalId: string): Promise<FestivalSubmission[]> {
    return db.select()
      .from(festivalSubmissions)
      .where(eq(festivalSubmissions.festivalId, festivalId))
      .orderBy(desc(festivalSubmissions.voteCount));
  }

  async createFestivalSubmission(submission: InsertFestivalSubmission): Promise<FestivalSubmission> {
    const [created] = await db.insert(festivalSubmissions)
      .values(submission)
      .returning();
    return created;
  }

  async voteForSubmission(submissionId: string, usrId: string): Promise<FestivalVote> {
    const [existing] = await db.select()
      .from(festivalVotes)
      .where(and(
        eq(festivalVotes.submissionId, submissionId),
        eq(festivalVotes.userId, usrId)
      ));

    if (existing) {
      throw new Error("Already voted for this submission");
    }

    const [vote] = await db.insert(festivalVotes)
      .values({ submissionId, userId: usrId })
      .returning();

    await db.update(festivalSubmissions)
      .set({ voteCount: sql`${festivalSubmissions.voteCount} + 1` })
      .where(eq(festivalSubmissions.id, submissionId));

    return vote;
  }

  async getSchools(): Promise<School[]> {
    return db.select()
      .from(schools)
      .orderBy(schools.name);
  }

  async getCreatorHubs(): Promise<CreatorHub[]> {
    return db.select()
      .from(creatorHubs)
      .orderBy(creatorHubs.name);
  }

  async getPublishChannels(): Promise<PublishChannel[]> {
    return db.select()
      .from(publishChannels)
      .orderBy(desc(publishChannels.subscriberCount));
  }

  async getUserChannels(userId: string): Promise<PublishChannel[]> {
    return db.select()
      .from(publishChannels)
      .where(eq(publishChannels.ownerId, userId));
  }

  async createPublishChannel(channel: InsertPublishChannel): Promise<PublishChannel> {
    const [created] = await db.insert(publishChannels)
      .values(channel)
      .returning();
    return created;
  }

  async publishContent(content: InsertPublishedContent): Promise<PublishedContent> {
    const [created] = await db.insert(publishedContent)
      .values({ ...content, publishedAt: new Date() })
      .returning();
    return created;
  }

  async getUserRevenue(userId: string): Promise<any> {
    const events = await db.select()
      .from(revenueEvents)
      .where(eq(revenueEvents.userId, userId))
      .orderBy(desc(revenueEvents.createdAt));

    const totalRevenue = events.reduce((sum, e) => sum + e.amount, 0);
    const pendingRevenue = events
      .filter(e => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);

    const payoutHistory = await db.select()
      .from(payouts)
      .where(eq(payouts.userId, userId))
      .orderBy(desc(payouts.requestedAt));

    return {
      totalRevenue,
      pendingRevenue,
      recentEvents: events.slice(0, 20),
      payouts: payoutHistory,
    };
  }
}

export const storage = new DatabaseStorage();
