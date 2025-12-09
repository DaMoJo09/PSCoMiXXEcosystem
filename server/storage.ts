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
  socialPosts, socialPostLikes, socialPostComments, userFollows,
  dmThreads, dmParticipants, dmMessages, notifications,
  collabSessions, collabMembers, collabPresence,
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
  type SocialPost, type InsertSocialPost,
  type SocialPostLike, type InsertSocialPostLike,
  type SocialPostComment, type InsertSocialPostComment,
  type UserFollow, type InsertUserFollow,
  type DmThread, type InsertDmThread,
  type DmParticipant, type InsertDmParticipant,
  type DmMessage, type InsertDmMessage,
  type Notification, type InsertNotification,
  type CollabSession, type InsertCollabSession,
  type CollabMember, type InsertCollabMember,
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
  
  // Social Media operations
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  getFeedPosts(userId: string, limit?: number, offset?: number): Promise<any[]>;
  getExplorePosts(limit?: number, offset?: number): Promise<any[]>;
  getUserPosts(userId: string): Promise<SocialPost[]>;
  likePost(postId: string, userId: string): Promise<SocialPostLike>;
  unlikePost(postId: string, userId: string): Promise<boolean>;
  isPostLiked(postId: string, userId: string): Promise<boolean>;
  addComment(comment: InsertSocialPostComment): Promise<SocialPostComment>;
  getPostComments(postId: string): Promise<any[]>;
  followUser(followerId: string, followingId: string): Promise<UserFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<any[]>;
  getFollowing(userId: string): Promise<any[]>;
  getFollowCounts(userId: string): Promise<{ followers: number; following: number }>;
  getUserProfile(userId: string): Promise<any>;
  
  // DM operations
  createDmThread(isGroup: boolean, name?: string): Promise<DmThread>;
  addDmParticipant(threadId: string, userId: string, role?: string): Promise<DmParticipant>;
  getUserDmThreads(userId: string): Promise<any[]>;
  getDmThread(threadId: string): Promise<DmThread | undefined>;
  sendDmMessage(message: InsertDmMessage): Promise<DmMessage>;
  getDmMessages(threadId: string, limit?: number): Promise<DmMessage[]>;
  findExistingDmThread(userId1: string, userId2: string): Promise<DmThread | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Collab operations
  createCollabSession(session: InsertCollabSession & { inviteCode: string }): Promise<CollabSession>;
  getCollabSession(id: string): Promise<CollabSession | undefined>;
  getCollabSessionByCode(inviteCode: string): Promise<CollabSession | undefined>;
  joinCollabSession(sessionId: string, userId: string, role?: string): Promise<CollabMember>;
  getCollabMembers(sessionId: string): Promise<any[]>;
  getUserCollabSessions(userId: string): Promise<CollabSession[]>;
  updateCollabSession(id: string, updates: Partial<InsertCollabSession>): Promise<CollabSession | undefined>;
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

  // ============================================
  // SOCIAL MEDIA OPERATIONS
  // ============================================

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [created] = await db.insert(socialPosts).values(post).returning();
    return created;
  }

  async getSocialPost(id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post;
  }

  async getFeedPosts(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const following = await db.select({ followingId: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    
    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId);

    const posts = await db.select({
      post: socialPosts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      project: projects,
    })
    .from(socialPosts)
    .leftJoin(users, eq(socialPosts.authorId, users.id))
    .leftJoin(projects, eq(socialPosts.projectId, projects.id))
    .where(sql`${socialPosts.authorId} = ANY(${followingIds})`)
    .orderBy(desc(socialPosts.createdAt))
    .limit(limit)
    .offset(offset);

    return posts.map(p => ({
      ...p.post,
      author: p.author,
      project: p.project,
    }));
  }

  async getExplorePosts(limit = 20, offset = 0): Promise<any[]> {
    const posts = await db.select({
      post: socialPosts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      project: projects,
    })
    .from(socialPosts)
    .leftJoin(users, eq(socialPosts.authorId, users.id))
    .leftJoin(projects, eq(socialPosts.projectId, projects.id))
    .where(eq(socialPosts.visibility, "public"))
    .orderBy(desc(socialPosts.createdAt))
    .limit(limit)
    .offset(offset);

    return posts.map(p => ({
      ...p.post,
      author: p.author,
      project: p.project,
    }));
  }

  async getUserPosts(userId: string): Promise<SocialPost[]> {
    return db.select()
      .from(socialPosts)
      .where(eq(socialPosts.authorId, userId))
      .orderBy(desc(socialPosts.createdAt));
  }

  async likePost(postId: string, userId: string): Promise<SocialPostLike> {
    const [like] = await db.insert(socialPostLikes)
      .values({ postId, userId })
      .returning();

    await db.update(socialPosts)
      .set({ likeCount: sql`${socialPosts.likeCount} + 1` })
      .where(eq(socialPosts.id, postId));

    return like;
  }

  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const result = await db.delete(socialPostLikes)
      .where(and(
        eq(socialPostLikes.postId, postId),
        eq(socialPostLikes.userId, userId)
      ));

    if (result.rowCount && result.rowCount > 0) {
      await db.update(socialPosts)
        .set({ likeCount: sql`GREATEST(${socialPosts.likeCount} - 1, 0)` })
        .where(eq(socialPosts.id, postId));
      return true;
    }
    return false;
  }

  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select()
      .from(socialPostLikes)
      .where(and(
        eq(socialPostLikes.postId, postId),
        eq(socialPostLikes.userId, userId)
      ));
    return !!like;
  }

  async addComment(comment: InsertSocialPostComment): Promise<SocialPostComment> {
    const [created] = await db.insert(socialPostComments)
      .values(comment)
      .returning();

    await db.update(socialPosts)
      .set({ commentCount: sql`${socialPosts.commentCount} + 1` })
      .where(eq(socialPosts.id, comment.postId));

    return created;
  }

  async getPostComments(postId: string): Promise<any[]> {
    const comments = await db.select({
      comment: socialPostComments,
      author: {
        id: users.id,
        name: users.name,
      },
    })
    .from(socialPostComments)
    .leftJoin(users, eq(socialPostComments.authorId, users.id))
    .where(eq(socialPostComments.postId, postId))
    .orderBy(socialPostComments.createdAt);

    return comments.map(c => ({
      ...c.comment,
      author: c.author,
    }));
  }

  async followUser(followerId: string, followingId: string): Promise<UserFollow> {
    const [follow] = await db.insert(userFollows)
      .values({ followerId, followingId })
      .returning();
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.delete(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db.select()
      .from(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      ));
    return !!follow;
  }

  async getFollowers(userId: string): Promise<any[]> {
    const followers = await db.select({
      follow: userFollows,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(userFollows)
    .leftJoin(users, eq(userFollows.followerId, users.id))
    .where(eq(userFollows.followingId, userId));

    return followers.map(f => ({
      ...f.follow,
      user: f.user,
    }));
  }

  async getFollowing(userId: string): Promise<any[]> {
    const following = await db.select({
      follow: userFollows,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(userFollows)
    .leftJoin(users, eq(userFollows.followingId, users.id))
    .where(eq(userFollows.followerId, userId));

    return following.map(f => ({
      ...f.follow,
      user: f.user,
    }));
  }

  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followersCount] = await db.select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));

    const [followingCount] = await db.select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    return {
      followers: Number(followersCount?.count || 0),
      following: Number(followingCount?.count || 0),
    };
  }

  async getUserProfile(userId: string): Promise<any> {
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId));

    if (!user) return undefined;

    const counts = await this.getFollowCounts(userId);
    const posts = await this.getUserPosts(userId);

    return {
      ...user,
      ...counts,
      postCount: posts.length,
      posts,
    };
  }

  // ============================================
  // DM OPERATIONS
  // ============================================

  async createDmThread(isGroup: boolean, name?: string): Promise<DmThread> {
    const [thread] = await db.insert(dmThreads)
      .values({ isGroup, name })
      .returning();
    return thread;
  }

  async addDmParticipant(threadId: string, userId: string, role = "member"): Promise<DmParticipant> {
    const [participant] = await db.insert(dmParticipants)
      .values({ threadId, userId, role })
      .returning();
    return participant;
  }

  async getUserDmThreads(userId: string): Promise<any[]> {
    const threads = await db.select({
      participant: dmParticipants,
      thread: dmThreads,
    })
    .from(dmParticipants)
    .leftJoin(dmThreads, eq(dmParticipants.threadId, dmThreads.id))
    .where(eq(dmParticipants.userId, userId))
    .orderBy(desc(dmThreads.updatedAt));

    const threadIds = threads.map(t => t.thread?.id).filter(Boolean) as string[];
    
    const participantsByThread: Record<string, any[]> = {};
    for (const threadId of threadIds) {
      const participants = await db.select({
        participant: dmParticipants,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(dmParticipants)
      .leftJoin(users, eq(dmParticipants.userId, users.id))
      .where(eq(dmParticipants.threadId, threadId));
      
      participantsByThread[threadId] = participants.map(p => ({
        ...p.participant,
        user: p.user,
      }));
    }

    return threads.map(t => ({
      ...t.thread,
      participants: participantsByThread[t.thread?.id || ''] || [],
    }));
  }

  async getDmThread(threadId: string): Promise<DmThread | undefined> {
    const [thread] = await db.select()
      .from(dmThreads)
      .where(eq(dmThreads.id, threadId));
    return thread;
  }

  async sendDmMessage(message: InsertDmMessage): Promise<DmMessage> {
    const [created] = await db.insert(dmMessages)
      .values(message)
      .returning();

    await db.update(dmThreads)
      .set({ updatedAt: new Date() })
      .where(eq(dmThreads.id, message.threadId));

    return created;
  }

  async getDmMessages(threadId: string, limit = 50): Promise<DmMessage[]> {
    return db.select()
      .from(dmMessages)
      .where(eq(dmMessages.threadId, threadId))
      .orderBy(dmMessages.createdAt)
      .limit(limit);
  }

  async findExistingDmThread(userId1: string, userId2: string): Promise<DmThread | undefined> {
    const user1Threads = await db.select({ threadId: dmParticipants.threadId })
      .from(dmParticipants)
      .where(eq(dmParticipants.userId, userId1));

    for (const t of user1Threads) {
      const [thread] = await db.select()
        .from(dmThreads)
        .where(and(
          eq(dmThreads.id, t.threadId),
          eq(dmThreads.isGroup, false)
        ));
      
      if (thread) {
        const [otherParticipant] = await db.select()
          .from(dmParticipants)
          .where(and(
            eq(dmParticipants.threadId, thread.id),
            eq(dmParticipants.userId, userId2)
          ));
        
        if (otherParticipant) {
          return thread;
        }
      }
    }

    return undefined;
  }

  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return Number(result?.count || 0);
  }

  // ============================================
  // COLLAB OPERATIONS
  // ============================================

  async createCollabSession(session: InsertCollabSession & { inviteCode: string }): Promise<CollabSession> {
    const [created] = await db.insert(collabSessions)
      .values(session)
      .returning();
    return created;
  }

  async getCollabSession(id: string): Promise<CollabSession | undefined> {
    const [session] = await db.select()
      .from(collabSessions)
      .where(eq(collabSessions.id, id));
    return session;
  }

  async getCollabSessionByCode(inviteCode: string): Promise<CollabSession | undefined> {
    const [session] = await db.select()
      .from(collabSessions)
      .where(eq(collabSessions.inviteCode, inviteCode));
    return session;
  }

  async joinCollabSession(sessionId: string, userId: string, role = "editor"): Promise<CollabMember> {
    const [existing] = await db.select()
      .from(collabMembers)
      .where(and(
        eq(collabMembers.sessionId, sessionId),
        eq(collabMembers.userId, userId)
      ));

    if (existing) return existing;

    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const [member] = await db.insert(collabMembers)
      .values({ sessionId, userId, role, color: randomColor })
      .returning();
    return member;
  }

  async getCollabMembers(sessionId: string): Promise<any[]> {
    const members = await db.select({
      member: collabMembers,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(collabMembers)
    .leftJoin(users, eq(collabMembers.userId, users.id))
    .where(eq(collabMembers.sessionId, sessionId));

    return members.map(m => ({
      ...m.member,
      user: m.user,
    }));
  }

  async getUserCollabSessions(userId: string): Promise<CollabSession[]> {
    const memberships = await db.select()
      .from(collabMembers)
      .where(eq(collabMembers.userId, userId));

    const sessionIds = memberships.map(m => m.sessionId);
    if (sessionIds.length === 0) return [];

    return db.select()
      .from(collabSessions)
      .where(sql`${collabSessions.id} = ANY(${sessionIds})`)
      .orderBy(desc(collabSessions.updatedAt));
  }

  async updateCollabSession(id: string, updates: Partial<InsertCollabSession>): Promise<CollabSession | undefined> {
    const [updated] = await db.update(collabSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(collabSessions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
