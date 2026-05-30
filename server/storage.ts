import { 
  users, projects, assets, apiKeys, assetPacks,
  creatorXp, xpTransactions, badges, userBadges,
  learningPathways, lessons, lessonProgress,
  schools, schoolMemberships, schoolChallenges,
  creatorHubs, hubEquipment, equipmentReservations, studioBookings,
  teams, teamMembers, teamProjects, projectCredits,
  publishChannels, publishedContent,
  revenueEvents, payouts, tipJars,
  festivals, festivalWorkshops, workshopRegistrations, festivalSubmissions, festivalVotes, festivalAwards,
  socialPosts, socialPostLikes, socialPostComments, userFollows, userBlocks,
  dmThreads, dmParticipants, dmMessages, notifications,
  collabSessions, collabMembers, collabPresence,
  communityChains, chainContributions, chainLikes,
  passwordResetTokens,
  assetImports,
  portfolioArtworks,
  portfolioEvents,
  blogPosts,
  newsletterSubscribers,
  announcements,
  featureFlags,
  subscriptions,
  waitlist,
  inviteCodes,
  inviteRedemptions,
  appSumoCodes,
  jobs,
  platformSettings,
  adminLogs,
  contentReports,
  auditLogs,
  ssoConfigs,
  classroomAssignments,
  assignmentSubmissions,
  tosAcceptances,
  comicComments,
  comicBookmarks,
  comicSeries,
  seriesSubscriptions,
  printQuoteRequests,
  engagementEvents,
  promoTemplates,
  promoInstances,
  promoReviews,
  type User, type InsertUser,
  type PasswordResetToken, type InsertPasswordResetToken,
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
  type UserBlock, type InsertUserBlock,
  type DmThread, type InsertDmThread,
  type DmParticipant, type InsertDmParticipant,
  type DmMessage, type InsertDmMessage,
  type Notification, type InsertNotification,
  type CollabSession, type InsertCollabSession,
  type CollabMember, type InsertCollabMember,
  type CommunityChain, type InsertCommunityChain,
  type ChainContribution, type InsertChainContribution,
  type ChainLike, type InsertChainLike,
  type AssetImport, type InsertAssetImport,
  type PortfolioArtwork, type InsertPortfolioArtwork,
  type PortfolioEvent, type InsertPortfolioEvent,
  type BlogPost, type InsertBlogPost,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type Announcement, type InsertAnnouncement,
  type FeatureFlag, type InsertFeatureFlag,
  type Subscription, type InsertSubscription,
  type Waitlist, type InsertWaitlist,
  type InviteCode, type InsertInviteCode,
  type InviteRedemption, type InsertInviteRedemption,
  type AppSumoCode, type InsertAppSumoCode,
  type Job, type InsertJob,
  type PlatformSetting, type InsertPlatformSetting,
  type AdminLog, type InsertAdminLog,
  type ContentReport, type InsertContentReport,
  type ApiKey, type InsertApiKey,
  type AssetPack, type InsertAssetPack,
  marketplaceListings, marketplaceOrders, marketplaceReviews, creatorAnalytics,
  type MarketplaceListing, type InsertMarketplaceListing,
  type MarketplaceOrder, type InsertMarketplaceOrder,
  type MarketplaceReview,
  usageTracking, type UsageTracking,
  projectVersions, publishJobs,
  type ProjectVersion, type InsertProjectVersion,
  type PublishJob, type InsertPublishJob,
  type EngagementEvent, type InsertEngagementEvent,
  type PrintQuoteRequest, type InsertPrintQuoteRequest,
  type PromoTemplate, type InsertPromoTemplate,
  type PromoInstance, type InsertPromoInstance,
  type PromoReview, type InsertPromoReview,
  printProductReviews, type PrintProductReview,
  projectSnapshots, type ProjectSnapshot, type InsertProjectSnapshot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql, ilike, gt, gte, lte, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  acceptIpDisclosure(id: string): Promise<User | undefined>;
  acceptUserAgreement(id: string): Promise<User | undefined>;
  acceptAiConsent(id: string): Promise<User | undefined>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getUserProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  createProjectSnapshot(snap: InsertProjectSnapshot): Promise<ProjectSnapshot>;
  getProjectSnapshots(projectId: string, limit?: number): Promise<ProjectSnapshot[]>;
  getProjectSnapshot(id: string): Promise<ProjectSnapshot | undefined>;
  pruneProjectSnapshots(projectId: string, keep: number): Promise<number>;
  getLatestSnapshotTime(projectId: string): Promise<Date | null>;
  getCommunityComics(options: { search?: string; sort?: string; limit?: number; offset?: number; type?: string }): Promise<{ comics: any[]; total: number }>;
  getCommunityComic(id: string): Promise<any | undefined>;
  incrementViewCount(projectId: string): Promise<void>;

  // Comic comments
  getComicComments(comicId: string, limit?: number, offset?: number): Promise<{ comments: any[]; total: number }>;
  addComicComment(comment: { comicId: string; authorId: string; text: string; parentId?: string }): Promise<any>;
  deleteComicComment(id: string, authorId: string): Promise<boolean>;

  // Comic bookmarks
  getBookmark(userId: string, projectId: string): Promise<any | undefined>;
  getUserBookmarks(userId: string): Promise<any[]>;
  upsertBookmark(userId: string, projectId: string, lastSpreadIndex: number): Promise<any>;
  deleteBookmark(userId: string, projectId: string): Promise<boolean>;

  // Comic series
  getUserSeries(userId: string): Promise<any[]>;
  getSeries(id: string): Promise<any | undefined>;
  createSeries(series: { userId: string; title: string; description?: string; coverImage?: string }): Promise<any>;
  updateSeries(id: string, updates: { title?: string; description?: string; coverImage?: string }): Promise<any | undefined>;
  deleteSeries(id: string): Promise<boolean>;
  getSeriesComics(seriesId: string, publicOnly?: boolean): Promise<any[]>;
  getPublicSeriesList(): Promise<any[]>;
  getFeaturedSeriesList(): Promise<any[]>;
  addProjectToSeries(projectId: string, seriesId: string, order: number): Promise<void>;
  removeProjectFromSeries(projectId: string): Promise<void>;
  getNextSeriesOrder(seriesId: string): Promise<number>;
  subscribeToSeries(userId: string, seriesId: string): Promise<any>;
  unsubscribeFromSeries(userId: string, seriesId: string): Promise<boolean>;
  isSubscribedToSeries(userId: string, seriesId: string): Promise<boolean>;
  getSeriesSubscriberCount(seriesId: string): Promise<number>;
  getSeriesSubscribers(seriesId: string): Promise<any[]>;
  getUserSeriesSubscriptions(userId: string): Promise<any[]>;
  getSeriesStats(seriesId: string): Promise<{ totalReads: number; subscriberCount: number; chapterCount: number; completionRate: number }>;
  setSeriesFeatured(seriesId: string, featured: boolean): Promise<any | undefined>;

  // Follow helpers
  followUser(followerId: string, followingId: string): Promise<any>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getUserFollowers(userId: string, limit?: number): Promise<any[]>;
  getUserFollowing(userId: string, limit?: number): Promise<any[]>;

  // Asset operations
  getAsset(id: string): Promise<Asset | undefined>;
  getUserAssets(userId: string, opts?: { limit?: number; offset?: number }): Promise<Asset[]>;
  getProjectAssets(projectId: string, opts?: { limit?: number; offset?: number }): Promise<Asset[]>;
  countUserAssets(userId: string): Promise<number>;
  countProjectAssets(projectId: string): Promise<number>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
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
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByInviteCode(inviteCode: string): Promise<Team | undefined>;
  getTeamMembers(teamId: string): Promise<any[]>;
  joinTeam(teamId: string, userId: string, role?: string): Promise<TeamMember>;
  leaveTeam(teamId: string, userId: string): Promise<boolean>;
  regenerateTeamInviteCode(teamId: string): Promise<Team | undefined>;
  updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<boolean>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
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
  getPostComments(postId: string, viewerId?: string): Promise<any[]>;
  followUser(followerId: string, followingId: string): Promise<UserFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<any[]>;
  getFollowing(userId: string): Promise<any[]>;
  getFollowCounts(userId: string): Promise<{ followers: number; following: number }>;
  getUserProfile(userId: string): Promise<any>;

  // User-to-user blocking (required for UGC compliance)
  blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock>;
  unblockUser(blockerId: string, blockedId: string): Promise<boolean>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
  getBlockedUserIds(blockerId: string): Promise<string[]>;
  getBlockedUsers(blockerId: string): Promise<any[]>;

  
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
  
  // Community Chain operations
  createCommunityChain(chain: InsertCommunityChain): Promise<CommunityChain>;
  getCommunityChain(id: string): Promise<CommunityChain | undefined>;
  getPublicChains(limit?: number, offset?: number): Promise<any[]>;
  getMutualsChains(userId: string, limit?: number, offset?: number): Promise<any[]>;
  getUserChains(userId: string): Promise<CommunityChain[]>;
  addChainContribution(contribution: InsertChainContribution): Promise<ChainContribution>;
  getChainContributions(chainId: string): Promise<any[]>;
  likeContribution(contributionId: string, userId: string): Promise<ChainLike>;
  unlikeContribution(contributionId: string, userId: string): Promise<boolean>;
  canContributeToChain(chainId: string, userId: string): Promise<boolean>;
  
  // Password reset operations
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<boolean>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  
  // Profile operations
  getUserPostCount(userId: string): Promise<number>;
  getUserProjectCount(userId: string): Promise<number>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Import operations
  createAssetImport(importData: InsertAssetImport): Promise<AssetImport>;
  getUserAssetImports(userId: string, status?: string): Promise<AssetImport[]>;
  getAssetImport(id: string): Promise<AssetImport | undefined>;
  updateAssetImport(id: string, updates: Partial<InsertAssetImport>): Promise<AssetImport | undefined>;
  deleteAssetImport(id: string): Promise<boolean>;
  
  // Portfolio operations
  getPortfolioArtworks(userId?: string): Promise<PortfolioArtwork[]>;
  getPortfolioArtwork(id: string): Promise<PortfolioArtwork | undefined>;
  createPortfolioArtwork(artwork: InsertPortfolioArtwork): Promise<PortfolioArtwork>;
  updatePortfolioArtwork(id: string, updates: Partial<InsertPortfolioArtwork>): Promise<PortfolioArtwork | undefined>;
  deletePortfolioArtwork(id: string): Promise<boolean>;
  
  // Newsletter operations
  subscribeNewsletter(email: string, name?: string): Promise<NewsletterSubscriber>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  
  // Lessons CRUD operations
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<boolean>;
  getLesson(id: string): Promise<Lesson | undefined>;
  getAllLessons(): Promise<Lesson[]>;
  
  // Learning Pathway CRUD operations
  createLearningPathway(pathway: InsertLearningPathway): Promise<LearningPathway>;
  updateLearningPathway(id: string, updates: Partial<InsertLearningPathway>): Promise<LearningPathway | undefined>;
  deleteLearningPathway(id: string): Promise<boolean>;
  getLearningPathway(id: string): Promise<LearningPathway | undefined>;
  
  // Portfolio Events (Exhibitions) operations
  getPortfolioEvents(): Promise<PortfolioEvent[]>;
  getPortfolioEvent(id: string): Promise<PortfolioEvent | undefined>;
  getUserPortfolioEvents(userId: string): Promise<PortfolioEvent[]>;
  createPortfolioEvent(event: InsertPortfolioEvent): Promise<PortfolioEvent>;
  updatePortfolioEvent(id: string, updates: Partial<InsertPortfolioEvent>): Promise<PortfolioEvent | undefined>;
  deletePortfolioEvent(id: string): Promise<boolean>;
  
  // Blog Posts operations
  getBlogPosts(status?: string): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getUserBlogPosts(userId: string): Promise<BlogPost[]>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  
  // Announcements operations
  getAnnouncements(featuredOnly?: boolean): Promise<Announcement[]>;
  getActiveAnnouncements(featuredOnly?: boolean): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getUserAnnouncements(userId: string): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;
  
  // Platform monetization operations
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  setFeatureFlag(key: string, enabled: boolean, updatedBy?: string): Promise<FeatureFlag>;
  
  // Subscription operations
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  
  // Waitlist operations
  getWaitlist(status?: string): Promise<Waitlist[]>;
  getWaitlistEntry(email: string): Promise<Waitlist | undefined>;
  addToWaitlist(entry: InsertWaitlist): Promise<Waitlist>;
  approveWaitlistEntry(id: string, approvedBy: string): Promise<Waitlist | undefined>;
  updateWaitlistStatus(id: string, status: string): Promise<Waitlist | undefined>;
  
  // Invite code operations
  getInviteCodes(createdBy?: string): Promise<InviteCode[]>;
  getInviteCode(code: string): Promise<InviteCode | undefined>;
  createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode>;
  redeemInviteCode(code: string, userId: string): Promise<boolean>;
  deactivateInviteCode(id: string): Promise<boolean>;
  
  // AppSumo operations
  getAppSumoCodes(status?: string): Promise<AppSumoCode[]>;
  getAppSumoCode(code: string): Promise<AppSumoCode | undefined>;
  createAppSumoCode(appSumoCode: InsertAppSumoCode): Promise<AppSumoCode>;
  redeemAppSumoCode(code: string, userId: string): Promise<AppSumoCode | undefined>;
  
  // Job queue operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getUserJobs(userId: string, status?: string): Promise<Job[]>;
  updateJobStatus(id: string, status: string, result?: any, errorMessage?: string): Promise<Job | undefined>;
  getNextPendingJob(): Promise<Job | undefined>;
  
  // Platform settings operations
  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  setPlatformSetting(key: string, value: any, updatedBy?: string): Promise<PlatformSetting>;
  getAllPlatformSettings(): Promise<PlatformSetting[]>;
  
  // Admin log operations
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(limit?: number): Promise<AdminLog[]>;
  
  // Content moderation operations
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(status?: string): Promise<ContentReport[]>;
  getContentReport(id: string): Promise<ContentReport | undefined>;
  resolveContentReport(id: string, resolvedBy: string, resolution: string, status?: string): Promise<ContentReport | undefined>;
  
  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getApiKeysByPrefix(prefix: string): Promise<ApiKey[]>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deactivateApiKey(id: string): Promise<boolean>;
  deleteApiKey(id: string): Promise<boolean>;
  
  // Asset Pack operations
  createAssetPack(pack: InsertAssetPack): Promise<AssetPack>;
  getAssetPack(id: string): Promise<AssetPack | undefined>;
  getUserAssetPacks(userId: string): Promise<AssetPack[]>;
  getPublicAssetPacks(category?: string, limit?: number, offset?: number): Promise<AssetPack[]>;
  updateAssetPack(id: string, updates: Partial<InsertAssetPack>): Promise<AssetPack | undefined>;
  deleteAssetPack(id: string): Promise<boolean>;
  incrementPackDownloads(id: string): Promise<void>;
  
  // Publishing Pipeline operations
  createProjectVersion(version: InsertProjectVersion): Promise<ProjectVersion>;
  getProjectVersions(projectId: string): Promise<ProjectVersion[]>;
  getProjectVersion(id: string): Promise<ProjectVersion | undefined>;
  getLatestProjectVersion(projectId: string): Promise<ProjectVersion | undefined>;
  
  createPublishJob(job: InsertPublishJob): Promise<PublishJob>;
  getPublishJob(id: string): Promise<PublishJob | undefined>;
  getProjectPublishJobs(projectId: string): Promise<PublishJob[]>;
  updatePublishJob(id: string, updates: Partial<PublishJob>): Promise<PublishJob | undefined>;
  getReviewQueue(): Promise<Project[]>;
  
  createEngagementEvent(event: InsertEngagementEvent): Promise<EngagementEvent>;
  getContentEngagement(contentId: string): Promise<EngagementEvent[]>;
  getEngagementSummary(contentId: string): Promise<Record<string, number>>;

  // Marketplace operations
  getMarketplaceListings(filters?: { type?: string; status?: string; search?: string; pricing?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]>;
  getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined>;
  getSellerListings(sellerId: string): Promise<MarketplaceListing[]>;
  createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing>;
  updateMarketplaceListing(id: string, updates: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing | undefined>;
  deleteMarketplaceListing(id: string): Promise<boolean>;
  createMarketplaceOrder(order: InsertMarketplaceOrder): Promise<MarketplaceOrder>;
  getMarketplaceOrder(id: string): Promise<MarketplaceOrder | undefined>;
  getBuyerOrders(buyerId: string): Promise<MarketplaceOrder[]>;
  getSellerOrders(sellerId: string): Promise<MarketplaceOrder[]>;
  updateMarketplaceOrder(id: string, updates: Partial<MarketplaceOrder>): Promise<MarketplaceOrder | undefined>;
  hasUserPurchasedListing(buyerId: string, listingId: string): Promise<boolean>;
  
  getListingReviews(listingId: string): Promise<any[]>;
  createReview(data: { listingId: string; userId: string; rating: number; reviewText: string | null; verifiedPurchase: boolean }): Promise<any>;
  trackListingEvent(listingId: string, eventType: string, userId: string | null): Promise<void>;

  getUsageCount(userId: string, actionType: string, periodType: string, periodKey: string): Promise<number>;
  incrementUsage(userId: string, actionType: string, periodType: string, periodKey: string): Promise<number>;

  // Audit log operations
  getAuditLogs(filters?: { userId?: string; action?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<any[]>;
  getAuditLogCount(filters?: { userId?: string; action?: string; startDate?: Date; endDate?: Date }): Promise<number>;

  // Account deletion
  deleteUserAccount(userId: string): Promise<boolean>;
  exportUserData(userId: string): Promise<Record<string, any>>;

  // Teacher/classroom operations
  getAssignment(id: string): Promise<any | undefined>;
  getTeacherAssignments(teacherId: string, schoolId: string): Promise<any[]>;
  createAssignment(data: { schoolId: string; teacherId: string; title: string; description?: string; projectType: string; dueDate?: Date; settings?: any }): Promise<any>;
  updateAssignment(id: string, updates: Record<string, any>): Promise<any>;
  deleteAssignment(id: string): Promise<boolean>;
  getAssignmentSubmissions(assignmentId: string): Promise<any[]>;
  submitAssignment(data: { assignmentId: string; studentId: string; projectId?: string }): Promise<any>;
  gradeSubmission(id: string, grade: string, feedback?: string): Promise<any>;
  getSchoolMembership(userId: string, schoolId: string): Promise<any | undefined>;
  getSchoolStudents(schoolId: string): Promise<any[]>;
  getTeacherStudents(teacherId: string, schoolId: string): Promise<any[]>;

  // Username lookup
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Student assignment lookup
  getStudentActiveAssignments(studentId: string): Promise<any[]>;

  // SSO operations
  getSsoConfigByDomain(domain: string): Promise<any | undefined>;
  createSsoConfig(config: any): Promise<any>;
  updateSsoConfig(id: string, updates: any): Promise<any>;
  getAllSsoConfigs(): Promise<any[]>;

  // TOS operations
  recordTosAcceptance(userId: string, version: string, ipAddress?: string): Promise<any>;
  getLatestTosAcceptance(userId: string): Promise<any | undefined>;

  // Print Quote operations
  createPrintQuoteRequest(request: InsertPrintQuoteRequest): Promise<PrintQuoteRequest>;
  getUserPrintQuoteRequests(userId: string): Promise<PrintQuoteRequest[]>;
  getAllPrintQuoteRequests(): Promise<PrintQuoteRequest[]>;
  updatePrintQuoteStatus(id: string, status: string): Promise<PrintQuoteRequest | undefined>;

  // Print Product Review operations
  getPrintProductReviews(productType?: string): Promise<any[]>;
  getPrintProductReview(id: string): Promise<PrintProductReview | undefined>;
  createPrintProductReview(review: { userId: string; productType: string; rating: number; title?: string; reviewText?: string; quoteRequestId?: string; verifiedOrder: boolean }): Promise<PrintProductReview>;
  getUserPrintProductReviews(userId: string): Promise<PrintProductReview[]>;
  deletePrintProductReview(id: string): Promise<boolean>;
  getPrintProductReviewStats(productType?: string): Promise<{ averageRating: number; totalReviews: number; distribution: Record<number, number> }>;

  // Promo Page Studio
  listPromoTemplatesForUser(opts: { role: "student" | "creator" | "teacher" | "admin"; sponsorsEnabled: boolean; type?: string }): Promise<PromoTemplate[]>;
  listAllPromoTemplates(filter?: { type?: string; status?: string }): Promise<PromoTemplate[]>;
  getPromoTemplate(id: string): Promise<PromoTemplate | undefined>;
  createPromoTemplate(input: InsertPromoTemplate): Promise<PromoTemplate>;
  updatePromoTemplate(id: string, updates: Partial<InsertPromoTemplate>): Promise<PromoTemplate | undefined>;
  deletePromoTemplate(id: string): Promise<boolean>;
  listPromoInstancesForProject(projectId: string): Promise<PromoInstance[]>;
  createPromoInstance(input: InsertPromoInstance): Promise<PromoInstance>;
  updatePromoInstance(id: string, updates: Partial<InsertPromoInstance>): Promise<PromoInstance | undefined>;
  deletePromoInstance(id: string): Promise<boolean>;
  createPromoReview(input: InsertPromoReview): Promise<PromoReview>;
  listPromoReviews(templateId: string): Promise<PromoReview[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async acceptAiConsent(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ aiConsentAcceptedAt: new Date() })
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
      .orderBy(desc(projects.updatedAt))
      .limit(200);
  }

  async getUserProjectsMeta(userId: string, filterType?: string) {
    const conditions = [eq(projects.userId, userId)];
    if (filterType) conditions.push(eq(projects.type, filterType));
    return db.select({
      id: projects.id,
      userId: projects.userId,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      viewCount: projects.viewCount,
      seriesId: projects.seriesId,
      seriesOrder: projects.seriesOrder,
      thumbnail: projects.thumbnail,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt))
      .limit(200);
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

  async createProjectSnapshot(snap: InsertProjectSnapshot): Promise<ProjectSnapshot> {
    const [row] = await db.insert(projectSnapshots).values(snap).returning();
    return row;
  }

  async getProjectSnapshots(projectId: string, limit: number = 20): Promise<ProjectSnapshot[]> {
    return await db.select().from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, projectId))
      .orderBy(desc(projectSnapshots.createdAt))
      .limit(limit);
  }

  async getProjectSnapshot(id: string): Promise<ProjectSnapshot | undefined> {
    const [row] = await db.select().from(projectSnapshots).where(eq(projectSnapshots.id, id));
    return row || undefined;
  }

  async getLatestSnapshotTime(projectId: string): Promise<Date | null> {
    // Cheap: selects only the timestamp column so it never detoasts the
    // large `data` payload. Used to throttle snapshot churn.
    const [row] = await db
      .select({ createdAt: projectSnapshots.createdAt })
      .from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, projectId))
      .orderBy(desc(projectSnapshots.createdAt))
      .limit(1);
    return row?.createdAt ?? null;
  }

  async pruneProjectSnapshots(projectId: string, keep: number): Promise<number> {
    const result = await db.execute(sql`
      DELETE FROM project_snapshots
      WHERE project_id = ${projectId}
        AND id NOT IN (
          SELECT id FROM project_snapshots
          WHERE project_id = ${projectId}
          ORDER BY created_at DESC
          LIMIT ${keep}
        )
    `);
    return result.rowCount ?? 0;
  }

  async getCommunityComics(options: { search?: string; sort?: string; limit?: number; offset?: number; type?: string }): Promise<{ comics: any[]; total: number }> {
    const { search, sort = "newest", limit = 20, offset = 0, type } = options;
    const validTypes = ["comic", "vn", "cyoa", "card", "hop", "motion"];
    const conditions = [
      type && validTypes.includes(type) ? sql`${projects.type} = ${type}` : sql`${projects.type} IN ('comic','vn','cyoa','card','hop','motion')`,
      sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`,
    ];
    if (search) {
      conditions.push(sql`LOWER(${projects.title}) LIKE ${`%${search.toLowerCase()}%`}`);
    }
    const whereClause = sql.join(conditions, sql` AND `);
    const orderBy = sort === "popular" ? desc(projects.viewCount) : desc(projects.createdAt);
    const comicRows = await db.select({
      id: projects.id,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      thumbnail: projects.thumbnail,
      data: projects.data,
      viewCount: projects.viewCount,
      seriesId: projects.seriesId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      userId: projects.userId,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    }).from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ count: count() })
      .from(projects)
      .where(whereClause);

    return { comics: comicRows, total: countResult?.count || 0 };
  }

  async getCommunityComic(id: string): Promise<any | undefined> {
    const [comic] = await db.select({
      id: projects.id,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      thumbnail: projects.thumbnail,
      data: projects.data,
      viewCount: projects.viewCount,
      seriesId: projects.seriesId,
      seriesOrder: projects.seriesOrder,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      userId: projects.userId,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    }).from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(and(
        eq(projects.id, id),
        sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`
      ));
    return comic || undefined;
  }
  
  // Asset operations
  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }
  
  async getUserAssets(userId: string, opts: { limit?: number; offset?: number } = {}): Promise<Asset[]> {
    const limit = Math.min(Math.max(opts.limit ?? 500, 1), 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    return db.select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getProjectAssets(projectId: string, opts: { limit?: number; offset?: number } = {}): Promise<Asset[]> {
    const limit = Math.min(Math.max(opts.limit ?? 500, 1), 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    return db.select()
      .from(assets)
      .where(eq(assets.projectId, projectId))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countUserAssets(userId: string): Promise<number> {
    const [row] = await db.select({ c: count() }).from(assets).where(eq(assets.userId, userId));
    return Number(row?.c ?? 0);
  }

  async countProjectAssets(projectId: string): Promise<number> {
    const [row] = await db.select({ c: count() }).from(assets).where(eq(assets.projectId, projectId));
    return Number(row?.c ?? 0);
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(insertAsset).returning();
    return asset;
  }

  async updateAsset(id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db.update(assets)
      .set(updates as any)
      .where(eq(assets.id, id))
      .returning();
    return asset || undefined;
  }
  
  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(1000);
  }

  async getUserCounts(): Promise<{ totalUsers: number; adminCount: number; creatorCount: number }> {
    const result = await db.select({
      totalUsers: count(),
      adminCount: sql<number>`count(*) filter (where ${users.role} = 'admin')`,
      creatorCount: sql<number>`count(*) filter (where ${users.role} = 'creator')`,
    }).from(users);
    return result[0] || { totalUsers: 0, adminCount: 0, creatorCount: 0 };
  }

  async getWaitlistCounts(): Promise<{ pending: number; approved: number; rejected: number }> {
    const result = await db.select({
      pending: sql<number>`count(*) filter (where ${waitlist.status} = 'pending')`,
      approved: sql<number>`count(*) filter (where ${waitlist.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${waitlist.status} = 'rejected')`,
    }).from(waitlist);
    return result[0] || { pending: 0, approved: 0, rejected: 0 };
  }
  
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(1000);
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
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [created] = await db.insert(teams).values({ ...team, inviteCode }).returning();
    
    await db.insert(teamMembers).values({
      teamId: created.id,
      userId: team.leaderId,
      role: "leader",
    });
    
    return created;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    const [team] = await db.select()
      .from(teams)
      .where(eq(teams.inviteCode, inviteCode));
    return team;
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    const members = await db.select({
      member: teamMembers,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

    return members.map(m => ({
      ...m.member,
      user: m.user,
    }));
  }

  async joinTeam(teamId: string, userId: string, role = "member"): Promise<TeamMember> {
    const [existing] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));

    if (existing) return existing;

    const [member] = await db.insert(teamMembers)
      .values({ teamId, userId, role })
      .returning();
    return member;
  }

  async leaveTeam(teamId: string, userId: string): Promise<boolean> {
    await db.delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
    return true;
  }

  async regenerateTeamInviteCode(teamId: string): Promise<Team | undefined> {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [updated] = await db.update(teams)
      .set({ inviteCode: newCode, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    return updated;
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<boolean> {
    await db.update(teamMembers)
      .set({ role })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
    return true;
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
    return !!member;
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

    // Exclude posts authored by users this viewer has blocked, OR users who
    // have blocked this viewer (bi-directional invisibility).
    const blockedIds = await this.getBlockedUserIds(userId);
    const blockedByRows = await db.select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, userId));
    const excludeIds = Array.from(new Set([...blockedIds, ...blockedByRows.map(r => r.blockerId)]));
    const visibleIds = followingIds.filter(id => !excludeIds.includes(id));
    if (visibleIds.length === 0) return [];

    const posts = await db.select({
      post: socialPosts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
      project: projects,
    })
    .from(socialPosts)
    .leftJoin(users, eq(socialPosts.authorId, users.id))
    .leftJoin(projects, eq(socialPosts.projectId, projects.id))
    .where(sql`${socialPosts.authorId} = ANY(${visibleIds})`)
    .orderBy(desc(socialPosts.createdAt))
    .limit(limit)
    .offset(offset);

    return posts.map(p => ({
      ...p.post,
      author: p.author,
      project: p.project,
    }));
  }

  async getExplorePosts(limit = 20, offset = 0, viewerId?: string): Promise<any[]> {
    // When a viewer is authenticated, hide posts from users they've blocked
    // or who've blocked them.
    const excludeIds = viewerId
      ? await (async () => {
          const blocked = await this.getBlockedUserIds(viewerId);
          const blockedBy = await db.select({ blockerId: userBlocks.blockerId })
            .from(userBlocks)
            .where(eq(userBlocks.blockedId, viewerId));
          return Array.from(new Set([...blocked, ...blockedBy.map(r => r.blockerId)]));
        })()
      : [];

    const whereClause = excludeIds.length > 0
      ? and(eq(socialPosts.visibility, "public"), sql`${socialPosts.authorId} <> ALL(${excludeIds})`)
      : eq(socialPosts.visibility, "public");

    const posts = await db.select({
      post: socialPosts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
      project: projects,
    })
    .from(socialPosts)
    .leftJoin(users, eq(socialPosts.authorId, users.id))
    .leftJoin(projects, eq(socialPosts.projectId, projects.id))
    .where(whereClause)
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
      .orderBy(desc(socialPosts.createdAt))
      .limit(100);
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
    // Block-aware: prevent comment creation if either party has blocked the other
    const post = await db.select({ authorId: socialPosts.authorId })
      .from(socialPosts)
      .where(eq(socialPosts.id, comment.postId))
      .limit(1);
    if (post[0] && post[0].authorId && post[0].authorId !== comment.authorId) {
      const blocked = await this.isBlockedEitherWay(comment.authorId, post[0].authorId);
      if (blocked) {
        throw new Error("You cannot comment on this post.");
      }
    }

    const [created] = await db.insert(socialPostComments)
      .values(comment)
      .returning();

    await db.update(socialPosts)
      .set({ commentCount: sql`${socialPosts.commentCount} + 1` })
      .where(eq(socialPosts.id, comment.postId));

    return created;
  }

  async getPostComments(postId: string, viewerId?: string): Promise<any[]> {
    const comments = await db.select({
      comment: socialPostComments,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(socialPostComments)
    .leftJoin(users, eq(socialPostComments.authorId, users.id))
    .where(eq(socialPostComments.postId, postId))
    .orderBy(socialPostComments.createdAt);

    // If viewer is signed in, filter out comments authored by blocked users
    // (in either direction) so the feed stays clean post-block.
    let hiddenIds = new Set<string>();
    if (viewerId) {
      const blocks = await db.select({
        blockerId: userBlocks.blockerId,
        blockedId: userBlocks.blockedId,
      })
      .from(userBlocks)
      .where(or(
        eq(userBlocks.blockerId, viewerId),
        eq(userBlocks.blockedId, viewerId),
      ));
      hiddenIds = new Set(
        blocks.map(b => (b.blockerId === viewerId ? b.blockedId : b.blockerId))
      );
    }

    return comments
      .filter(c => !c.comment.authorId || !hiddenIds.has(c.comment.authorId))
      .map(c => ({
        ...c.comment,
        author: c.author,
      }));
  }

  async followUser(followerId: string, followingId: string): Promise<any> {
    const existing = await db.select().from(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    if (existing.length > 0) return existing[0];
    const [result] = await db.insert(userFollows).values({ followerId, followingId }).returning();
    return result;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    await db.delete(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return true;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.select().from(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return result.length > 0;
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

  // ============================================
  // USER BLOCKING (UGC compliance — Apple Guideline 1.2)
  // ============================================

  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock> {
    if (blockerId === blockedId) {
      throw new Error("Cannot block yourself");
    }
    const [row] = await db.insert(userBlocks)
      .values({ blockerId, blockedId, reason: reason ?? null })
      .onConflictDoNothing({ target: [userBlocks.blockerId, userBlocks.blockedId] })
      .returning();
    if (row) return row;
    // Already blocked — return the existing record for idempotent API behavior.
    const [existing] = await db.select().from(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
    return existing;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await db.delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
    return (result.rowCount ?? 0) > 0;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const [row] = await db.select({ id: userBlocks.id }).from(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
      .limit(1);
    return !!row;
  }

  async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    const [row] = await db.select({ id: userBlocks.id }).from(userBlocks)
      .where(or(
        and(eq(userBlocks.blockerId, userA), eq(userBlocks.blockedId, userB)),
        and(eq(userBlocks.blockerId, userB), eq(userBlocks.blockedId, userA)),
      ))
      .limit(1);
    return !!row;
  }

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const rows = await db.select({ blockedId: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, blockerId));
    return rows.map(r => r.blockedId);
  }

  async getBlockedUsers(blockerId: string): Promise<any[]> {
    const rows = await db.select({
      id: userBlocks.id,
      blockedId: userBlocks.blockedId,
      reason: userBlocks.reason,
      createdAt: userBlocks.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
      .from(userBlocks)
      .leftJoin(users, eq(userBlocks.blockedId, users.id))
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt));
    return rows;
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
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) return undefined;

    const counts = await this.getFollowCounts(userId);
    const posts = await this.getUserPosts(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: (user as any).avatar || null,
      coverImage: (user as any).coverImage || null,
      tagline: (user as any).tagline || null,
      bio: (user as any).bio || null,
      creatorClass: (user as any).creatorClass || "Rookie",
      xp: (user as any).xp || 0,
      level: (user as any).level || 1,
      socialLinks: (user as any).socialLinks || null,
      portfolioTheme: (user as any).portfolioTheme || null,
      totalMinutes: (user as any).totalMinutes || 0,
      createdAt: user.createdAt,
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
    if (threadIds.length > 0) {
      const allParticipants = await db.select({
        participant: dmParticipants,
        user: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(dmParticipants)
      .leftJoin(users, eq(dmParticipants.userId, users.id))
      .where(inArray(dmParticipants.threadId, threadIds));
      
      for (const p of allParticipants) {
        const tid = p.participant.threadId;
        if (!participantsByThread[tid]) participantsByThread[tid] = [];
        participantsByThread[tid].push({ ...p.participant, user: p.user });
      }
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
    const result = await db.select({ threadId: dmParticipants.threadId })
      .from(dmParticipants)
      .where(eq(dmParticipants.userId, userId1));

    const user1ThreadIds = result.map(r => r.threadId);
    if (user1ThreadIds.length === 0) return undefined;

    const user2InThreads = await db.select({ threadId: dmParticipants.threadId })
      .from(dmParticipants)
      .where(and(
        inArray(dmParticipants.threadId, user1ThreadIds),
        eq(dmParticipants.userId, userId2)
      ));

    const sharedThreadIds = user2InThreads.map(r => r.threadId);
    if (sharedThreadIds.length === 0) return undefined;

    const [thread] = await db.select()
      .from(dmThreads)
      .where(and(
        inArray(dmThreads.id, sharedThreadIds),
        eq(dmThreads.isGroup, false)
      ))
      .limit(1);

    return thread || undefined;
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

  // ============================================
  // COMMUNITY CHAIN OPERATIONS
  // ============================================

  async createCommunityChain(chain: InsertCommunityChain): Promise<CommunityChain> {
    const [created] = await db.insert(communityChains)
      .values(chain)
      .returning();
    return created;
  }

  async getCommunityChain(id: string): Promise<CommunityChain | undefined> {
    const [chain] = await db.select()
      .from(communityChains)
      .where(eq(communityChains.id, id));
    return chain;
  }

  async getPublicChains(limit = 20, offset = 0): Promise<any[]> {
    const chains = await db.select({
      chain: communityChains,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(communityChains)
    .leftJoin(users, eq(communityChains.creatorId, users.id))
    .where(and(
      eq(communityChains.visibility, "public"),
      eq(communityChains.status, "active")
    ))
    .orderBy(desc(communityChains.updatedAt))
    .limit(limit)
    .offset(offset);

    return chains.map(c => ({
      ...c.chain,
      creator: c.creator,
    }));
  }

  async getMutualsChains(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const mutuals = await db.select({ id: users.id })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId));

    const mutualIds = mutuals.map(m => m.id);
    
    const myFollowing = await db.select({ id: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    
    const followingIds = new Set(myFollowing.map(f => f.id));
    const mutualFollowers = mutualIds.filter(id => followingIds.has(id));
    mutualFollowers.push(userId);

    if (mutualFollowers.length === 0) return [];

    const chains = await db.select({
      chain: communityChains,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(communityChains)
    .leftJoin(users, eq(communityChains.creatorId, users.id))
    .where(and(
      eq(communityChains.visibility, "mutuals"),
      eq(communityChains.status, "active"),
      sql`${communityChains.creatorId} = ANY(${mutualFollowers})`
    ))
    .orderBy(desc(communityChains.updatedAt))
    .limit(limit)
    .offset(offset);

    return chains.map(c => ({
      ...c.chain,
      creator: c.creator,
    }));
  }

  async getUserChains(userId: string): Promise<CommunityChain[]> {
    return db.select()
      .from(communityChains)
      .where(eq(communityChains.creatorId, userId))
      .orderBy(desc(communityChains.updatedAt));
  }

  async addChainContribution(contribution: InsertChainContribution): Promise<ChainContribution> {
    const [created] = await db.insert(chainContributions)
      .values(contribution)
      .returning();

    await db.update(communityChains)
      .set({ 
        contributionCount: sql`${communityChains.contributionCount} + 1`,
        updatedAt: new Date(),
        thumbnail: contribution.mediaUrl,
      })
      .where(eq(communityChains.id, contribution.chainId));

    return created;
  }

  async getChainContributions(chainId: string): Promise<any[]> {
    const contributions = await db.select({
      contribution: chainContributions,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(chainContributions)
    .leftJoin(users, eq(chainContributions.userId, users.id))
    .where(eq(chainContributions.chainId, chainId))
    .orderBy(chainContributions.position);

    return contributions.map(c => ({
      ...c.contribution,
      user: c.user,
    }));
  }

  async likeContribution(contributionId: string, userId: string): Promise<ChainLike> {
    const [existing] = await db.select()
      .from(chainLikes)
      .where(and(
        eq(chainLikes.contributionId, contributionId),
        eq(chainLikes.userId, userId)
      ));

    if (existing) return existing;

    const [like] = await db.insert(chainLikes)
      .values({ contributionId, userId })
      .returning();

    await db.update(chainContributions)
      .set({ likesCount: sql`${chainContributions.likesCount} + 1` })
      .where(eq(chainContributions.id, contributionId));

    return like;
  }

  async unlikeContribution(contributionId: string, userId: string): Promise<boolean> {
    const result = await db.delete(chainLikes)
      .where(and(
        eq(chainLikes.contributionId, contributionId),
        eq(chainLikes.userId, userId)
      ));

    if (result.rowCount && result.rowCount > 0) {
      await db.update(chainContributions)
        .set({ likesCount: sql`${chainContributions.likesCount} - 1` })
        .where(eq(chainContributions.id, contributionId));
      return true;
    }
    return false;
  }

  async canContributeToChain(chainId: string, userId: string): Promise<boolean> {
    const chain = await this.getCommunityChain(chainId);
    if (!chain || chain.status !== "active") return false;

    if (chain.maxContributions && chain.contributionCount >= chain.maxContributions) {
      return false;
    }

    if (chain.visibility === "public") return true;

    if (chain.visibility === "mutuals") {
      const isFollowing = await this.isFollowing(userId, chain.creatorId);
      const isFollowedBy = await this.isFollowing(chain.creatorId, userId);
      return isFollowing && isFollowedBy;
    }

    return false;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<boolean> {
    const result = await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUserPostCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(socialPosts)
      .where(eq(socialPosts.authorId, userId));
    return result?.count || 0;
  }

  async getUserProjectCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(projects)
      .where(eq(projects.userId, userId));
    return result?.count || 0;
  }

  async getFollowerCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));
    return result?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    return result?.count || 0;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates as any)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Import operations
  async createAssetImport(importData: InsertAssetImport): Promise<AssetImport> {
    const [assetImport] = await db.insert(assetImports).values(importData).returning();
    return assetImport;
  }

  async getUserAssetImports(userId: string, status?: string): Promise<AssetImport[]> {
    if (status) {
      return db.select().from(assetImports)
        .where(and(eq(assetImports.userId, userId), eq(assetImports.status, status)))
        .orderBy(desc(assetImports.createdAt));
    }
    return db.select().from(assetImports)
      .where(eq(assetImports.userId, userId))
      .orderBy(desc(assetImports.createdAt));
  }

  async getAssetImport(id: string): Promise<AssetImport | undefined> {
    const [assetImport] = await db.select().from(assetImports).where(eq(assetImports.id, id));
    return assetImport || undefined;
  }

  async updateAssetImport(id: string, updates: Partial<InsertAssetImport>): Promise<AssetImport | undefined> {
    const [assetImport] = await db.update(assetImports)
      .set(updates as any)
      .where(eq(assetImports.id, id))
      .returning();
    return assetImport || undefined;
  }

  async deleteAssetImport(id: string): Promise<boolean> {
    const result = await db.delete(assetImports).where(eq(assetImports.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Portfolio operations
  async getPortfolioArtworks(userId?: string): Promise<PortfolioArtwork[]> {
    if (userId) {
      return db.select().from(portfolioArtworks)
        .where(eq(portfolioArtworks.userId, userId))
        .orderBy(desc(portfolioArtworks.createdAt));
    }
    return db.select().from(portfolioArtworks).orderBy(desc(portfolioArtworks.createdAt));
  }

  async getPortfolioArtwork(id: string): Promise<PortfolioArtwork | undefined> {
    const [artwork] = await db.select().from(portfolioArtworks).where(eq(portfolioArtworks.id, id));
    return artwork || undefined;
  }

  async createPortfolioArtwork(artwork: InsertPortfolioArtwork): Promise<PortfolioArtwork> {
    const [created] = await db.insert(portfolioArtworks).values(artwork).returning();
    return created;
  }

  async updatePortfolioArtwork(id: string, updates: Partial<InsertPortfolioArtwork>): Promise<PortfolioArtwork | undefined> {
    const [artwork] = await db.update(portfolioArtworks)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(portfolioArtworks.id, id))
      .returning();
    return artwork || undefined;
  }

  async deletePortfolioArtwork(id: string): Promise<boolean> {
    const result = await db.delete(portfolioArtworks).where(eq(portfolioArtworks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Newsletter operations
  async subscribeNewsletter(email: string, name?: string): Promise<NewsletterSubscriber> {
    const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    if (existing.length > 0) {
      const [updated] = await db.update(newsletterSubscribers)
        .set({ status: "active", name, unsubscribedAt: null })
        .where(eq(newsletterSubscribers.email, email))
        .returning();
      return updated;
    }
    const [subscriber] = await db.insert(newsletterSubscribers).values({ email, name, status: "active" }).returning();
    return subscriber;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const result = await db.update(newsletterSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "active"));
  }

  // Lessons CRUD operations
  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [created] = await db.insert(lessons).values(lesson).returning();
    return created;
  }

  async updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [lesson] = await db.update(lessons)
      .set(updates as any)
      .where(eq(lessons.id, id))
      .returning();
    return lesson || undefined;
  }

  async deleteLesson(id: string): Promise<boolean> {
    const result = await db.delete(lessons).where(eq(lessons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async getAllLessons(): Promise<Lesson[]> {
    return db.select().from(lessons).orderBy(lessons.sortOrder);
  }

  // Learning Pathway CRUD operations
  async createLearningPathway(pathway: InsertLearningPathway): Promise<LearningPathway> {
    const [created] = await db.insert(learningPathways).values(pathway).returning();
    return created;
  }

  async updateLearningPathway(id: string, updates: Partial<InsertLearningPathway>): Promise<LearningPathway | undefined> {
    const [pathway] = await db.update(learningPathways)
      .set(updates as any)
      .where(eq(learningPathways.id, id))
      .returning();
    return pathway || undefined;
  }

  async deleteLearningPathway(id: string): Promise<boolean> {
    const result = await db.delete(learningPathways).where(eq(learningPathways.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLearningPathway(id: string): Promise<LearningPathway | undefined> {
    const [pathway] = await db.select().from(learningPathways).where(eq(learningPathways.id, id));
    return pathway || undefined;
  }

  // Announcements operations
  async getAnnouncements(featuredOnly?: boolean): Promise<Announcement[]> {
    if (featuredOnly) {
      return db.select()
        .from(announcements)
        .where(eq(announcements.isFeatured, true))
        .orderBy(desc(announcements.sortOrder), desc(announcements.createdAt));
    }
    return db.select()
      .from(announcements)
      .orderBy(desc(announcements.sortOrder), desc(announcements.createdAt));
  }

  async getActiveAnnouncements(featuredOnly?: boolean): Promise<Announcement[]> {
    const now = new Date();
    const conditions: any[] = [eq(announcements.isActive, true)];
    if (featuredOnly) conditions.push(eq(announcements.isFeatured, true));
    conditions.push(or(isNull(announcements.startDate), lte(announcements.startDate, now)));
    conditions.push(or(isNull(announcements.endDate), gte(announcements.endDate, now)));
    return db.select()
      .from(announcements)
      .where(and(...conditions))
      .orderBy(desc(announcements.sortOrder), desc(announcements.createdAt));
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement || undefined;
  }

  async getUserAnnouncements(userId: string): Promise<Announcement[]> {
    return db.select()
      .from(announcements)
      .where(eq(announcements.userId, userId))
      .orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [announcement] = await db.update(announcements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return announcement || undefined;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Portfolio Events (Exhibitions) operations
  async getPortfolioEvents(): Promise<PortfolioEvent[]> {
    return db.select()
      .from(portfolioEvents)
      .orderBy(desc(portfolioEvents.startDate));
  }

  async getPortfolioEvent(id: string): Promise<PortfolioEvent | undefined> {
    const [event] = await db.select().from(portfolioEvents).where(eq(portfolioEvents.id, id));
    return event || undefined;
  }

  async getUserPortfolioEvents(userId: string): Promise<PortfolioEvent[]> {
    return db.select()
      .from(portfolioEvents)
      .where(eq(portfolioEvents.userId, userId))
      .orderBy(desc(portfolioEvents.startDate));
  }

  async createPortfolioEvent(event: InsertPortfolioEvent): Promise<PortfolioEvent> {
    const [created] = await db.insert(portfolioEvents).values(event).returning();
    return created;
  }

  async updatePortfolioEvent(id: string, updates: Partial<InsertPortfolioEvent>): Promise<PortfolioEvent | undefined> {
    const [event] = await db.update(portfolioEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(portfolioEvents.id, id))
      .returning();
    return event || undefined;
  }

  async deletePortfolioEvent(id: string): Promise<boolean> {
    const result = await db.delete(portfolioEvents).where(eq(portfolioEvents.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Blog Posts operations
  async getBlogPosts(status?: string): Promise<BlogPost[]> {
    if (status) {
      return db.select()
        .from(blogPosts)
        .where(eq(blogPosts.status, status))
        .orderBy(desc(blogPosts.createdAt));
    }
    return db.select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post || undefined;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post || undefined;
  }

  async getUserBlogPosts(userId: string): Promise<BlogPost[]> {
    return db.select()
      .from(blogPosts)
      .where(eq(blogPosts.userId, userId))
      .orderBy(desc(blogPosts.createdAt));
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db.insert(blogPosts).values(post).returning();
    return created;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db.update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post || undefined;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Platform monetization operations
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(featureFlags.key);
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return flag || undefined;
  }

  async setFeatureFlag(key: string, enabled: boolean, updatedBy?: string): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(key);
    if (existing) {
      const [updated] = await db.update(featureFlags)
        .set({ enabled, updatedBy: updatedBy || null, updatedAt: new Date() })
        .where(eq(featureFlags.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(featureFlags)
      .values({ key, enabled, updatedBy })
      .returning();
    return created;
  }

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub || undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [sub] = await db.update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return sub || undefined;
  }

  // Waitlist operations
  async getWaitlist(status?: string): Promise<Waitlist[]> {
    if (status) {
      return db.select().from(waitlist).where(eq(waitlist.status, status)).orderBy(desc(waitlist.createdAt));
    }
    return db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
  }

  async getWaitlistEntry(email: string): Promise<Waitlist | undefined> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return entry || undefined;
  }

  async addToWaitlist(entry: InsertWaitlist): Promise<Waitlist> {
    const [created] = await db.insert(waitlist).values(entry).returning();
    return created;
  }

  async approveWaitlistEntry(id: string, approvedBy: string): Promise<Waitlist | undefined> {
    const [entry] = await db.update(waitlist)
      .set({ status: "approved", approvedBy, approvedAt: new Date() })
      .where(eq(waitlist.id, id))
      .returning();
    return entry || undefined;
  }

  async updateWaitlistStatus(id: string, status: string): Promise<Waitlist | undefined> {
    const [entry] = await db.update(waitlist)
      .set({ status })
      .where(eq(waitlist.id, id))
      .returning();
    return entry || undefined;
  }

  // Invite code operations
  async getInviteCodes(createdBy?: string): Promise<InviteCode[]> {
    if (createdBy) {
      return db.select().from(inviteCodes).where(eq(inviteCodes.createdBy, createdBy)).orderBy(desc(inviteCodes.createdAt));
    }
    return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return inviteCode || undefined;
  }

  async createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode> {
    const [created] = await db.insert(inviteCodes).values(inviteCode).returning();
    return created;
  }

  async redeemInviteCode(code: string, userId: string): Promise<boolean> {
    const inviteCode = await this.getInviteCode(code);
    if (!inviteCode || !inviteCode.isActive) return false;
    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) return false;
    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) return false;

    await db.insert(inviteRedemptions).values({ codeId: inviteCode.id, userId });
    await db.update(inviteCodes)
      .set({ usedCount: inviteCode.usedCount + 1 })
      .where(eq(inviteCodes.id, inviteCode.id));
    return true;
  }

  async deactivateInviteCode(id: string): Promise<boolean> {
    const result = await db.update(inviteCodes)
      .set({ isActive: false })
      .where(eq(inviteCodes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // AppSumo operations
  async getAppSumoCodes(status?: string): Promise<AppSumoCode[]> {
    if (status) {
      return db.select().from(appSumoCodes).where(eq(appSumoCodes.status, status)).orderBy(desc(appSumoCodes.createdAt));
    }
    return db.select().from(appSumoCodes).orderBy(desc(appSumoCodes.createdAt));
  }

  async getAppSumoCode(code: string): Promise<AppSumoCode | undefined> {
    const [appSumoCode] = await db.select().from(appSumoCodes).where(eq(appSumoCodes.code, code));
    return appSumoCode || undefined;
  }

  async createAppSumoCode(appSumoCode: InsertAppSumoCode): Promise<AppSumoCode> {
    const [created] = await db.insert(appSumoCodes).values(appSumoCode).returning();
    return created;
  }

  async redeemAppSumoCode(code: string, userId: string): Promise<AppSumoCode | undefined> {
    const appSumoCode = await this.getAppSumoCode(code);
    if (!appSumoCode || appSumoCode.status !== "unused") return undefined;

    const [updated] = await db.update(appSumoCodes)
      .set({ status: "redeemed", redeemedBy: userId, redeemedAt: new Date() })
      .where(eq(appSumoCodes.code, code))
      .returning();

    // Create lifetime subscription for user
    const existingSub = await this.getUserSubscription(userId);
    if (existingSub) {
      await this.updateSubscription(userId, {
        tier: "lifetime",
        appSumoCodeId: appSumoCode.id,
        entitlements: { export: true, commercial: true, ai: true, batch: true },
      });
    } else {
      await this.createSubscription({
        userId,
        tier: "lifetime",
        status: "active",
        appSumoCodeId: appSumoCode.id,
        entitlements: { export: true, commercial: true, ai: true, batch: true },
      });
    }

    return updated;
  }

  // Job queue operations
  async createJob(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobs).values(job).returning();
    return created;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getUserJobs(userId: string, status?: string): Promise<Job[]> {
    if (status) {
      return db.select().from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.status, status)))
        .orderBy(desc(jobs.createdAt));
    }
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
  }

  async updateJobStatus(id: string, status: string, result?: any, errorMessage?: string): Promise<Job | undefined> {
    const updates: any = { status };
    if (status === "processing") updates.startedAt = new Date();
    if (status === "completed" || status === "failed") updates.completedAt = new Date();
    if (result) updates.result = result;
    if (errorMessage) updates.errorMessage = errorMessage;

    const [job] = await db.update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  async getNextPendingJob(): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs)
      .where(eq(jobs.status, "pending"))
      .orderBy(desc(jobs.priority), jobs.createdAt)
      .limit(1);
    return job || undefined;
  }

  // Platform settings operations
  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting || undefined;
  }

  async setPlatformSetting(key: string, value: any, updatedBy?: string): Promise<PlatformSetting> {
    const existing = await this.getPlatformSetting(key);
    if (existing) {
      const [updated] = await db.update(platformSettings)
        .set({ value, updatedBy: updatedBy || null, updatedAt: new Date() })
        .where(eq(platformSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(platformSettings)
      .values({ key, value, updatedBy })
      .returning();
    return created;
  }

  async getAllPlatformSettings(): Promise<PlatformSetting[]> {
    return db.select().from(platformSettings).orderBy(platformSettings.key);
  }

  // Admin log operations
  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    const [created] = await db.insert(adminLogs).values(log).returning();
    return created;
  }

  async getAdminLogs(limit: number = 100): Promise<AdminLog[]> {
    return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
  }

  // Content moderation operations
  async createContentReport(report: InsertContentReport): Promise<ContentReport> {
    const [created] = await db.insert(contentReports).values(report).returning();
    return created;
  }

  async getContentReports(status?: string): Promise<ContentReport[]> {
    if (status) {
      return db.select().from(contentReports)
        .where(eq(contentReports.status, status))
        .orderBy(desc(contentReports.createdAt));
    }
    return db.select().from(contentReports).orderBy(desc(contentReports.createdAt));
  }

  async getContentReport(id: string): Promise<ContentReport | undefined> {
    const [report] = await db.select().from(contentReports).where(eq(contentReports.id, id));
    return report || undefined;
  }

  async resolveContentReport(id: string, resolvedBy: string, resolution: string, status: string = "resolved"): Promise<ContentReport | undefined> {
    const [updated] = await db.update(contentReports)
      .set({ 
        status, 
        resolvedBy, 
        resolution, 
        resolvedAt: new Date() 
      })
      .where(eq(contentReports.id, id))
      .returning();
    return updated || undefined;
  }

  // API Key operations
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
    return key || undefined;
  }

  async getApiKeysByPrefix(prefix: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.isActive, true)));
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deactivateApiKey(id: string): Promise<boolean> {
    const [updated] = await db.update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, id))
      .returning();
    return !!updated;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return true;
  }

  // Asset Pack operations
  async createAssetPack(pack: InsertAssetPack): Promise<AssetPack> {
    const [created] = await db.insert(assetPacks).values(pack).returning();
    return created;
  }

  async getAssetPack(id: string): Promise<AssetPack | undefined> {
    const [pack] = await db.select().from(assetPacks).where(eq(assetPacks.id, id));
    return pack || undefined;
  }

  async getUserAssetPacks(userId: string): Promise<AssetPack[]> {
    return db.select().from(assetPacks)
      .where(eq(assetPacks.userId, userId))
      .orderBy(desc(assetPacks.createdAt));
  }

  async getPublicAssetPacks(category?: string, limit: number = 50, offset: number = 0): Promise<AssetPack[]> {
    if (category) {
      return db.select().from(assetPacks)
        .where(and(eq(assetPacks.isPublic, true), eq(assetPacks.category, category)))
        .orderBy(desc(assetPacks.downloadCount))
        .limit(limit)
        .offset(offset);
    }
    return db.select().from(assetPacks)
      .where(eq(assetPacks.isPublic, true))
      .orderBy(desc(assetPacks.downloadCount))
      .limit(limit)
      .offset(offset);
  }

  async updateAssetPack(id: string, updates: Partial<InsertAssetPack>): Promise<AssetPack | undefined> {
    const [updated] = await db.update(assetPacks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assetPacks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAssetPack(id: string): Promise<boolean> {
    await db.delete(assetPacks).where(eq(assetPacks.id, id));
    return true;
  }

  async incrementPackDownloads(id: string): Promise<void> {
    await db.update(assetPacks)
      .set({ downloadCount: sql`${assetPacks.downloadCount} + 1` })
      .where(eq(assetPacks.id, id));
  }

  // Publishing Pipeline operations
  async createProjectVersion(version: InsertProjectVersion): Promise<ProjectVersion> {
    const [created] = await db.insert(projectVersions).values(version).returning();
    return created;
  }

  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    return db.select().from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber));
  }

  async getProjectVersion(id: string): Promise<ProjectVersion | undefined> {
    const [version] = await db.select().from(projectVersions).where(eq(projectVersions.id, id));
    return version || undefined;
  }

  async getLatestProjectVersion(projectId: string): Promise<ProjectVersion | undefined> {
    const [version] = await db.select().from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);
    return version || undefined;
  }

  async createPublishJob(job: InsertPublishJob): Promise<PublishJob> {
    const [created] = await db.insert(publishJobs).values(job).returning();
    return created;
  }

  async getPublishJob(id: string): Promise<PublishJob | undefined> {
    const [job] = await db.select().from(publishJobs).where(eq(publishJobs.id, id));
    return job || undefined;
  }

  async getProjectPublishJobs(projectId: string): Promise<PublishJob[]> {
    return db.select().from(publishJobs)
      .where(eq(publishJobs.projectId, projectId))
      .orderBy(desc(publishJobs.createdAt));
  }

  async updatePublishJob(id: string, updates: Partial<PublishJob>): Promise<PublishJob | undefined> {
    const [updated] = await db.update(publishJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(publishJobs.id, id))
      .returning();
    return updated || undefined;
  }

  async getReviewQueue(): Promise<Project[]> {
    return db.select().from(projects)
      .where(eq(projects.status, "review"))
      .orderBy(desc(projects.updatedAt));
  }

  async createEngagementEvent(event: InsertEngagementEvent): Promise<EngagementEvent> {
    const [created] = await db.insert(engagementEvents).values(event).returning();
    return created;
  }

  async getContentEngagement(contentId: string): Promise<EngagementEvent[]> {
    return db.select().from(engagementEvents)
      .where(eq(engagementEvents.contentId, contentId))
      .orderBy(desc(engagementEvents.createdAt));
  }

  async getEngagementSummary(contentId: string): Promise<Record<string, number>> {
    const results = await db.select({
      eventType: engagementEvents.eventType,
      total: count(),
    }).from(engagementEvents)
      .where(eq(engagementEvents.contentId, contentId))
      .groupBy(engagementEvents.eventType);
    
    const summary: Record<string, number> = {};
    for (const row of results) {
      summary[row.eventType] = row.total;
    }
    return summary;
  }
  // ============================================
  // MARKETPLACE OPERATIONS
  // ============================================

  async getMarketplaceListings(filters?: { type?: string; status?: string; search?: string; pricing?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]> {
    const conditions = [];
    const status = filters?.status || "active";
    conditions.push(eq(marketplaceListings.status, status));

    if (filters?.type) {
      conditions.push(eq(marketplaceListings.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(ilike(marketplaceListings.title, `%${filters.search}%`));
    }
    if (filters?.pricing === "free") {
      conditions.push(eq(marketplaceListings.priceInCents, 0));
    } else if (filters?.pricing === "paid") {
      conditions.push(gt(marketplaceListings.priceInCents, 0));
    }

    const query = db.select().from(marketplaceListings)
      .where(and(...conditions))
      .orderBy(desc(marketplaceListings.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return query;
  }

  async getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined> {
    const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
    return listing || undefined;
  }

  async getSellerListings(sellerId: string): Promise<MarketplaceListing[]> {
    return db.select().from(marketplaceListings)
      .where(eq(marketplaceListings.sellerId, sellerId))
      .orderBy(desc(marketplaceListings.createdAt));
  }

  async createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing> {
    const [created] = await db.insert(marketplaceListings).values(listing).returning();
    return created;
  }

  async updateMarketplaceListing(id: string, updates: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing | undefined> {
    const [updated] = await db.update(marketplaceListings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceListings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMarketplaceListing(id: string): Promise<boolean> {
    const result = await db.delete(marketplaceListings).where(eq(marketplaceListings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createMarketplaceOrder(order: InsertMarketplaceOrder): Promise<MarketplaceOrder> {
    const [created] = await db.insert(marketplaceOrders).values(order).returning();
    return created;
  }

  async getMarketplaceOrder(id: string): Promise<MarketplaceOrder | undefined> {
    const [order] = await db.select().from(marketplaceOrders).where(eq(marketplaceOrders.id, id));
    return order || undefined;
  }

  async getBuyerOrders(buyerId: string): Promise<MarketplaceOrder[]> {
    return db.select().from(marketplaceOrders)
      .where(eq(marketplaceOrders.buyerId, buyerId))
      .orderBy(desc(marketplaceOrders.createdAt));
  }

  async getSellerOrders(sellerId: string): Promise<MarketplaceOrder[]> {
    return db.select().from(marketplaceOrders)
      .where(eq(marketplaceOrders.sellerId, sellerId))
      .orderBy(desc(marketplaceOrders.createdAt));
  }

  async updateMarketplaceOrder(id: string, updates: Partial<MarketplaceOrder>): Promise<MarketplaceOrder | undefined> {
    const [updated] = await db.update(marketplaceOrders)
      .set(updates as any)
      .where(eq(marketplaceOrders.id, id))
      .returning();
    return updated || undefined;
  }

  async hasUserPurchasedListing(buyerId: string, listingId: string): Promise<boolean> {
    const [order] = await db.select().from(marketplaceOrders)
      .where(and(
        eq(marketplaceOrders.buyerId, buyerId),
        eq(marketplaceOrders.listingId, listingId),
        eq(marketplaceOrders.status, "completed")
      ))
      .limit(1);
    return !!order;
  }

  async getListingReviews(listingId: string): Promise<any[]> {
    const reviews = await db
      .select({
        id: marketplaceReviews.id,
        listingId: marketplaceReviews.listingId,
        userId: marketplaceReviews.userId,
        rating: marketplaceReviews.rating,
        reviewText: marketplaceReviews.reviewText,
        verifiedPurchase: marketplaceReviews.verifiedPurchase,
        createdAt: marketplaceReviews.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(marketplaceReviews)
      .leftJoin(users, eq(marketplaceReviews.userId, users.id))
      .where(eq(marketplaceReviews.listingId, listingId))
      .orderBy(desc(marketplaceReviews.createdAt));
    return reviews;
  }

  async createReview(data: { listingId: string; userId: string; rating: number; reviewText: string | null; verifiedPurchase: boolean }): Promise<any> {
    const [review] = await db.insert(marketplaceReviews).values({
      listingId: data.listingId,
      userId: data.userId,
      rating: data.rating,
      reviewText: data.reviewText,
      verifiedPurchase: data.verifiedPurchase,
    }).returning();
    return review;
  }

  async trackListingEvent(listingId: string, eventType: string, userId: string | null): Promise<void> {
    await db.insert(creatorAnalytics).values({
      listingId,
      eventType,
      userId,
    });
  }

  async getUsageCount(userId: string, actionType: string, periodType: string, periodKey: string): Promise<number> {
    const [row] = await db.select().from(usageTracking).where(
      and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.actionType, actionType),
        eq(usageTracking.periodType, periodType),
        eq(usageTracking.periodKey, periodKey),
      )
    );
    return row?.count || 0;
  }

  async incrementUsage(userId: string, actionType: string, periodType: string, periodKey: string): Promise<number> {
    const [existing] = await db.select().from(usageTracking).where(
      and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.actionType, actionType),
        eq(usageTracking.periodType, periodType),
        eq(usageTracking.periodKey, periodKey),
      )
    );
    if (existing) {
      const newCount = existing.count + 1;
      await db.update(usageTracking)
        .set({ count: newCount, updatedAt: new Date() })
        .where(eq(usageTracking.id, existing.id));
      return newCount;
    }
    const [created] = await db.insert(usageTracking).values({
      userId,
      actionType,
      periodType,
      periodKey,
      count: 1,
    }).returning();
    return created.count;
  }

  async getAuditLogs(filters?: { userId?: string; action?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<any[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gt(auditLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(sql`${auditLogs.createdAt} < ${filters.endDate}`);

    const query = db.select().from(auditLogs);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100).offset(filters?.offset || 0);
    }
    return query.orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100).offset(filters?.offset || 0);
  }

  async getAuditLogCount(filters?: { userId?: string; action?: string; startDate?: Date; endDate?: Date }): Promise<number> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gt(auditLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(sql`${auditLogs.createdAt} < ${filters.endDate}`);

    const query = db.select({ count: count() }).from(auditLogs);
    if (conditions.length > 0) {
      const [result] = await query.where(and(...conditions));
      return result?.count || 0;
    }
    const [result] = await query;
    return result?.count || 0;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    try {
      await db.delete(dmMessages).where(eq(dmMessages.senderId, userId));
      await db.delete(dmParticipants).where(eq(dmParticipants.userId, userId));
      await db.delete(socialPostComments).where(eq(socialPostComments.authorId, userId));
      await db.delete(socialPostLikes).where(eq(socialPostLikes.userId, userId));
      await db.delete(socialPosts).where(eq(socialPosts.authorId, userId));
      await db.delete(userFollows).where(eq(userFollows.followerId, userId));
      await db.delete(userFollows).where(eq(userFollows.followingId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(assets).where(eq(assets.userId, userId));
      await db.delete(projects).where(eq(projects.userId, userId));
      await db.delete(schoolMemberships).where(eq(schoolMemberships.userId, userId));
      await db.delete(portfolioArtworks).where(eq(portfolioArtworks.userId, userId));
      await db.delete(tosAcceptances).where(eq(tosAcceptances.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (err) {
      console.error("[storage] deleteUserAccount error:", err);
      return false;
    }
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.getUser(userId);
    if (!user) return {};

    const userProjects = await this.getUserProjects(userId);
    const userAssets = await this.getUserAssets(userId);
    const userPosts = await this.getUserPosts(userId);
    const followers = await this.getFollowers(userId);
    const following = await this.getFollowing(userId);

    const { password, ...safeUser } = user as any;

    return {
      user: safeUser,
      projects: userProjects,
      assets: userAssets,
      socialPosts: userPosts,
      followers,
      following,
      exportedAt: new Date().toISOString(),
      format: "PSCoMiXX Data Export v1.0",
    };
  }

  async getAssignment(id: string): Promise<any | undefined> {
    const [assignment] = await db.select().from(classroomAssignments).where(eq(classroomAssignments.id, id));
    return assignment || undefined;
  }

  async getTeacherAssignments(teacherId: string, schoolId: string): Promise<any[]> {
    return db.select().from(classroomAssignments)
      .where(and(eq(classroomAssignments.teacherId, teacherId), eq(classroomAssignments.schoolId, schoolId)))
      .orderBy(desc(classroomAssignments.createdAt));
  }

  async createAssignment(data: { schoolId: string; teacherId: string; title: string; description?: string; projectType: string; dueDate?: Date; settings?: any }): Promise<any> {
    const [assignment] = await db.insert(classroomAssignments).values({
      schoolId: data.schoolId,
      teacherId: data.teacherId,
      title: data.title,
      description: data.description || null,
      projectType: data.projectType,
      dueDate: data.dueDate || null,
      settings: data.settings || null,
    }).returning();
    return assignment;
  }

  async updateAssignment(id: string, updates: Record<string, any>): Promise<any> {
    const [assignment] = await db.update(classroomAssignments)
      .set(updates)
      .where(eq(classroomAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await db.delete(classroomAssignments).where(eq(classroomAssignments.id, id));
    return true;
  }

  async getAssignmentSubmissions(assignmentId: string): Promise<any[]> {
    return db.select({
      submission: assignmentSubmissions,
      student: { id: users.id, name: users.name, email: users.email, avatar: users.avatar },
    })
    .from(assignmentSubmissions)
    .leftJoin(users, eq(assignmentSubmissions.studentId, users.id))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId))
    .orderBy(desc(assignmentSubmissions.createdAt));
  }

  async submitAssignment(data: { assignmentId: string; studentId: string; projectId?: string }): Promise<any> {
    const [submission] = await db.insert(assignmentSubmissions).values({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      projectId: data.projectId || null,
      status: "submitted",
      submittedAt: new Date(),
    }).returning();
    return submission;
  }

  async gradeSubmission(id: string, grade: string, feedback?: string): Promise<any> {
    const [submission] = await db.update(assignmentSubmissions)
      .set({ grade, feedback: feedback || null, status: "graded", gradedAt: new Date() })
      .where(eq(assignmentSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async getSchoolMembership(userId: string, schoolId: string): Promise<any | undefined> {
    const [membership] = await db.select().from(schoolMemberships)
      .where(and(eq(schoolMemberships.userId, userId), eq(schoolMemberships.schoolId, schoolId)));
    return membership || undefined;
  }

  async getSchoolStudents(schoolId: string): Promise<any[]> {
    const memberships = await db.select({
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(schoolMemberships)
    .leftJoin(users, eq(schoolMemberships.userId, users.id))
    .where(and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.role, "student")));
    return memberships.map(m => m.user).filter(Boolean) as any[];
  }

  async getTeacherStudents(teacherId: string, schoolId: string): Promise<any[]> {
    const memberships = await db.select({
      membership: schoolMemberships,
      user: { id: users.id, name: users.name, email: users.email, avatar: users.avatar, accountType: users.accountType, xp: users.xp, level: users.level, totalMinutes: users.totalMinutes, lastActiveAt: users.lastActiveAt },
    })
    .from(schoolMemberships)
    .leftJoin(users, eq(schoolMemberships.userId, users.id))
    .where(and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.role, "student")));
    return memberships.map(m => ({ ...m.user, schoolRole: m.membership.role }));
  }

  async getStudentActiveAssignments(studentId: string): Promise<any[]> {
    const memberSchools = await db.select({ schoolId: schoolMemberships.schoolId })
      .from(schoolMemberships)
      .where(eq(schoolMemberships.userId, studentId));
    if (memberSchools.length === 0) return [];
    const schoolIds = memberSchools.map(m => m.schoolId);
    const allAssignments = await db.select()
      .from(classroomAssignments)
      .where(eq(classroomAssignments.status, "active"));
    return allAssignments.filter(a => schoolIds.includes(a.schoolId));
  }

  async getSsoConfigByDomain(domain: string): Promise<any | undefined> {
    const [config] = await db.select().from(ssoConfigs).where(eq(ssoConfigs.domain, domain));
    return config || undefined;
  }

  async createSsoConfig(config: any): Promise<any> {
    const [result] = await db.insert(ssoConfigs).values(config).returning();
    return result;
  }

  async updateSsoConfig(id: string, updates: any): Promise<any> {
    const [result] = await db.update(ssoConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(ssoConfigs.id, id)).returning();
    return result || undefined;
  }

  async getAllSsoConfigs(): Promise<any[]> {
    return db.select().from(ssoConfigs).orderBy(desc(ssoConfigs.createdAt));
  }

  async recordTosAcceptance(userId: string, version: string, ipAddress?: string): Promise<any> {
    const [result] = await db.insert(tosAcceptances).values({
      userId,
      version,
      ipAddress: ipAddress || null,
    }).returning();
    return result;
  }

  async getLatestTosAcceptance(userId: string): Promise<any | undefined> {
    const [result] = await db.select().from(tosAcceptances)
      .where(eq(tosAcceptances.userId, userId))
      .orderBy(desc(tosAcceptances.acceptedAt))
      .limit(1);
    return result || undefined;
  }

  async incrementViewCount(projectId: string): Promise<void> {
    await db.update(projects)
      .set({ viewCount: sql`COALESCE(${projects.viewCount}, 0) + 1` })
      .where(eq(projects.id, projectId));
  }

  async getComicComments(comicId: string, limit = 50, offset = 0): Promise<{ comments: any[]; total: number }> {
    const rows = await db.select({
      id: comicComments.id,
      comicId: comicComments.comicId,
      authorId: comicComments.authorId,
      text: comicComments.text,
      parentId: comicComments.parentId,
      createdAt: comicComments.createdAt,
      authorName: users.name,
      authorAvatar: users.avatar,
    }).from(comicComments)
      .innerJoin(users, eq(comicComments.authorId, users.id))
      .where(eq(comicComments.comicId, comicId))
      .orderBy(desc(comicComments.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ count: count() })
      .from(comicComments)
      .where(eq(comicComments.comicId, comicId));

    return { comments: rows, total: countResult?.count || 0 };
  }

  async addComicComment(comment: { comicId: string; authorId: string; text: string; parentId?: string }): Promise<any> {
    const [result] = await db.insert(comicComments).values({
      comicId: comment.comicId,
      authorId: comment.authorId,
      text: comment.text,
      parentId: comment.parentId || null,
    }).returning();
    return result;
  }

  async deleteComicComment(id: string, authorId: string): Promise<boolean> {
    const result = await db.delete(comicComments)
      .where(and(eq(comicComments.id, id), eq(comicComments.authorId, authorId)));
    return true;
  }

  async getBookmark(userId: string, projectId: string): Promise<any | undefined> {
    const [result] = await db.select().from(comicBookmarks)
      .where(and(eq(comicBookmarks.userId, userId), eq(comicBookmarks.projectId, projectId)));
    return result || undefined;
  }

  async getUserBookmarks(userId: string): Promise<any[]> {
    return db.select({
      id: comicBookmarks.id,
      userId: comicBookmarks.userId,
      projectId: comicBookmarks.projectId,
      lastSpreadIndex: comicBookmarks.lastSpreadIndex,
      createdAt: comicBookmarks.createdAt,
      updatedAt: comicBookmarks.updatedAt,
      comicTitle: projects.title,
      comicThumbnail: projects.thumbnail,
      comicStatus: projects.status,
    }).from(comicBookmarks)
      .innerJoin(projects, eq(comicBookmarks.projectId, projects.id))
      .where(eq(comicBookmarks.userId, userId))
      .orderBy(desc(comicBookmarks.updatedAt));
  }

  async upsertBookmark(userId: string, projectId: string, lastSpreadIndex: number): Promise<any> {
    const existing = await this.getBookmark(userId, projectId);
    if (existing) {
      const [result] = await db.update(comicBookmarks)
        .set({ lastSpreadIndex, updatedAt: new Date() })
        .where(eq(comicBookmarks.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(comicBookmarks).values({
      userId, projectId, lastSpreadIndex,
    }).returning();
    return result;
  }

  async deleteBookmark(userId: string, projectId: string): Promise<boolean> {
    await db.delete(comicBookmarks)
      .where(and(eq(comicBookmarks.userId, userId), eq(comicBookmarks.projectId, projectId)));
    return true;
  }

  async getUserSeries(userId: string): Promise<any[]> {
    const seriesList = await db.select().from(comicSeries)
      .where(eq(comicSeries.userId, userId))
      .orderBy(desc(comicSeries.updatedAt));
    const result = [];
    for (const s of seriesList) {
      const comics = await db.select({ id: projects.id }).from(projects)
        .where(eq(projects.seriesId, s.id));
      result.push({ ...s, comicCount: comics.length });
    }
    return result;
  }

  async getSeries(id: string): Promise<any | undefined> {
    const [result] = await db.select({
      id: comicSeries.id,
      userId: comicSeries.userId,
      title: comicSeries.title,
      description: comicSeries.description,
      coverImage: comicSeries.coverImage,
      createdAt: comicSeries.createdAt,
      updatedAt: comicSeries.updatedAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    }).from(comicSeries)
      .innerJoin(users, eq(comicSeries.userId, users.id))
      .where(eq(comicSeries.id, id));
    return result || undefined;
  }

  async createSeries(series: { userId: string; title: string; description?: string; coverImage?: string }): Promise<any> {
    const [result] = await db.insert(comicSeries).values({
      userId: series.userId,
      title: series.title,
      description: series.description || null,
      coverImage: series.coverImage || null,
    }).returning();
    return result;
  }

  async updateSeries(id: string, updates: { title?: string; description?: string; coverImage?: string }): Promise<any | undefined> {
    const [result] = await db.update(comicSeries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(comicSeries.id, id))
      .returning();
    return result || undefined;
  }

  async deleteSeries(id: string): Promise<boolean> {
    await db.update(projects).set({ seriesId: null, seriesOrder: null }).where(eq(projects.seriesId, id));
    await db.delete(comicSeries).where(eq(comicSeries.id, id));
    return true;
  }

  async getSeriesComics(seriesId: string, publicOnly = false): Promise<any[]> {
    const conditions: any[] = [eq(projects.seriesId, seriesId)];
    if (publicOnly) {
      conditions.push(sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`);
    }
    return db.select({
      id: projects.id,
      title: projects.title,
      thumbnail: projects.thumbnail,
      status: projects.status,
      viewCount: projects.viewCount,
      seriesOrder: projects.seriesOrder,
      data: projects.data,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    }).from(projects)
      .where(and(...conditions))
      .orderBy(projects.seriesOrder);
  }

  async getPublicSeriesList(): Promise<any[]> {
    const seriesRows = await db.select({
      id: comicSeries.id,
      title: comicSeries.title,
      description: comicSeries.description,
      coverImage: comicSeries.coverImage,
      userId: comicSeries.userId,
      createdAt: comicSeries.createdAt,
      updatedAt: comicSeries.updatedAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    }).from(comicSeries)
      .innerJoin(users, eq(comicSeries.userId, users.id))
      .orderBy(desc(comicSeries.updatedAt))
      .limit(20);

    const result = [];
    for (const s of seriesRows) {
      const comicCount = await db.select({ count: count() })
        .from(projects)
        .where(and(
          eq(projects.seriesId, s.id),
          sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`,
        ));
      const ct = comicCount[0]?.count ?? 0;
      if (ct > 0) {
        const subCount = await db.select({ count: count() })
          .from(seriesSubscriptions)
          .where(eq(seriesSubscriptions.seriesId, s.id));
        result.push({ ...s, comicCount: ct, subscriberCount: subCount[0]?.count ?? 0 });
      }
    }
    return result;
  }

  async addProjectToSeries(projectId: string, seriesId: string, order: number): Promise<void> {
    await db.update(projects)
      .set({ seriesId, seriesOrder: order, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  async removeProjectFromSeries(projectId: string): Promise<void> {
    await db.update(projects)
      .set({ seriesId: null, seriesOrder: null, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  async getNextSeriesOrder(seriesId: string): Promise<number> {
    const result = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${projects.seriesOrder}), 0)` })
      .from(projects)
      .where(eq(projects.seriesId, seriesId));
    return (result[0]?.maxOrder ?? 0) + 1;
  }

  async getFeaturedSeriesList(): Promise<any[]> {
    const seriesRows = await db.select({
      id: comicSeries.id,
      title: comicSeries.title,
      description: comicSeries.description,
      coverImage: comicSeries.coverImage,
      featured: comicSeries.featured,
      userId: comicSeries.userId,
      createdAt: comicSeries.createdAt,
      updatedAt: comicSeries.updatedAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    }).from(comicSeries)
      .innerJoin(users, eq(comicSeries.userId, users.id))
      .where(eq(comicSeries.featured, true))
      .orderBy(desc(comicSeries.updatedAt))
      .limit(10);

    const result = [];
    for (const s of seriesRows) {
      const comicCount = await db.select({ count: count() })
        .from(projects)
        .where(and(
          eq(projects.seriesId, s.id),
          sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`,
        ));
      const ct = comicCount[0]?.count ?? 0;
      const subCount = await db.select({ count: count() })
        .from(seriesSubscriptions)
        .where(eq(seriesSubscriptions.seriesId, s.id));
      result.push({ ...s, comicCount: ct, subscriberCount: subCount[0]?.count ?? 0 });
    }
    return result;
  }

  async subscribeToSeries(userId: string, seriesId: string): Promise<any> {
    const [result] = await db.insert(seriesSubscriptions)
      .values({ userId, seriesId })
      .onConflictDoNothing()
      .returning();
    if (!result) {
      const [existing] = await db.select().from(seriesSubscriptions)
        .where(and(eq(seriesSubscriptions.userId, userId), eq(seriesSubscriptions.seriesId, seriesId)));
      return existing;
    }
    return result;
  }

  async unsubscribeFromSeries(userId: string, seriesId: string): Promise<boolean> {
    await db.delete(seriesSubscriptions)
      .where(and(eq(seriesSubscriptions.userId, userId), eq(seriesSubscriptions.seriesId, seriesId)));
    return true;
  }

  async isSubscribedToSeries(userId: string, seriesId: string): Promise<boolean> {
    const result = await db.select().from(seriesSubscriptions)
      .where(and(eq(seriesSubscriptions.userId, userId), eq(seriesSubscriptions.seriesId, seriesId)));
    return result.length > 0;
  }

  async getSeriesSubscriberCount(seriesId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(seriesSubscriptions)
      .where(eq(seriesSubscriptions.seriesId, seriesId));
    return result[0]?.count ?? 0;
  }

  async getSeriesSubscribers(seriesId: string): Promise<any[]> {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(seriesSubscriptions)
      .innerJoin(users, eq(seriesSubscriptions.userId, users.id))
      .where(eq(seriesSubscriptions.seriesId, seriesId));
  }

  async getUserSeriesSubscriptions(userId: string): Promise<any[]> {
    return db.select({
      id: comicSeries.id,
      title: comicSeries.title,
      coverImage: comicSeries.coverImage,
      creatorName: users.name,
    }).from(seriesSubscriptions)
      .innerJoin(comicSeries, eq(seriesSubscriptions.seriesId, comicSeries.id))
      .innerJoin(users, eq(comicSeries.userId, users.id))
      .where(eq(seriesSubscriptions.userId, userId));
  }

  async getSeriesStats(seriesId: string): Promise<{ totalReads: number; subscriberCount: number; chapterCount: number; completionRate: number }> {
    const comics = await db.select({
      viewCount: projects.viewCount,
      seriesOrder: projects.seriesOrder,
    }).from(projects)
      .where(and(
        eq(projects.seriesId, seriesId),
        sql`(${projects.status} = 'published' OR ${projects.status} = 'approved')`,
      ))
      .orderBy(projects.seriesOrder, projects.createdAt);
    const chapterCount = comics.length;
    const totalReads = comics.reduce((sum, c) => sum + (c.viewCount || 0), 0);

    const subCount = await db.select({ count: count() }).from(seriesSubscriptions)
      .where(eq(seriesSubscriptions.seriesId, seriesId));
    const subscriberCount = subCount[0]?.count ?? 0;

    let completionRate = 0;
    if (chapterCount > 1 && totalReads > 0) {
      const firstChapterReads = comics[0]?.viewCount || 1;
      const lastChapterReads = comics[comics.length - 1]?.viewCount || 0;
      completionRate = Math.min(100, Math.round((lastChapterReads / firstChapterReads) * 100));
    }

    return { totalReads, subscriberCount, chapterCount, completionRate };
  }

  async setSeriesFeatured(seriesId: string, featured: boolean): Promise<any | undefined> {
    const [result] = await db.update(comicSeries)
      .set({ featured, updatedAt: new Date() })
      .where(eq(comicSeries.id, seriesId))
      .returning();
    return result || undefined;
  }

  async getUserFollowers(userId: string, limit = 50): Promise<any[]> {
    return db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      followedAt: userFollows.createdAt,
    }).from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .orderBy(desc(userFollows.createdAt))
      .limit(limit);
  }

  async getUserFollowing(userId: string, limit = 50): Promise<any[]> {
    return db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      followedAt: userFollows.createdAt,
    }).from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .orderBy(desc(userFollows.createdAt))
      .limit(limit);
  }

  async createPrintQuoteRequest(request: InsertPrintQuoteRequest): Promise<PrintQuoteRequest> {
    const [result] = await db.insert(printQuoteRequests).values(request).returning();
    return result;
  }

  async getUserPrintQuoteRequests(userId: string): Promise<PrintQuoteRequest[]> {
    return db.select().from(printQuoteRequests).where(eq(printQuoteRequests.userId, userId)).orderBy(desc(printQuoteRequests.createdAt));
  }

  async getAllPrintQuoteRequests(): Promise<PrintQuoteRequest[]> {
    return db.select().from(printQuoteRequests).orderBy(desc(printQuoteRequests.createdAt));
  }

  async updatePrintQuoteStatus(id: string, status: string): Promise<PrintQuoteRequest | undefined> {
    const [result] = await db.update(printQuoteRequests).set({ status }).where(eq(printQuoteRequests.id, id)).returning();
    return result || undefined;
  }

  async getPrintProductReviews(productType?: string): Promise<any[]> {
    const conditions = productType ? [eq(printProductReviews.productType, productType)] : [];
    return db.select({
      id: printProductReviews.id,
      userId: printProductReviews.userId,
      productType: printProductReviews.productType,
      rating: printProductReviews.rating,
      title: printProductReviews.title,
      reviewText: printProductReviews.reviewText,
      verifiedOrder: printProductReviews.verifiedOrder,
      quoteRequestId: printProductReviews.quoteRequestId,
      createdAt: printProductReviews.createdAt,
      authorName: users.name,
      authorAvatar: users.avatar,
    })
      .from(printProductReviews)
      .innerJoin(users, eq(printProductReviews.userId, users.id))
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(printProductReviews.createdAt));
  }

  async getPrintProductReview(id: string): Promise<PrintProductReview | undefined> {
    const [result] = await db.select().from(printProductReviews).where(eq(printProductReviews.id, id));
    return result || undefined;
  }

  async createPrintProductReview(review: { userId: string; productType: string; rating: number; title?: string; reviewText?: string; quoteRequestId?: string; verifiedOrder: boolean }): Promise<PrintProductReview> {
    const [result] = await db.insert(printProductReviews).values(review).returning();
    return result;
  }

  async getUserPrintProductReviews(userId: string): Promise<PrintProductReview[]> {
    return db.select().from(printProductReviews).where(eq(printProductReviews.userId, userId)).orderBy(desc(printProductReviews.createdAt));
  }

  async deletePrintProductReview(id: string): Promise<boolean> {
    const result = await db.delete(printProductReviews).where(eq(printProductReviews.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async getPrintProductReviewStats(productType?: string): Promise<{ averageRating: number; totalReviews: number; distribution: Record<number, number> }> {
    const conditions = productType ? [eq(printProductReviews.productType, productType)] : [];
    const reviews = await db.select({ rating: printProductReviews.rating })
      .from(printProductReviews)
      .where(conditions.length > 0 ? conditions[0] : undefined);
    
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; total += r.rating; });
    
    return {
      averageRating: reviews.length > 0 ? total / reviews.length : 0,
      totalReviews: reviews.length,
      distribution,
    };
  }

  // ==========================================
  // Promo Page Studio
  // ==========================================
  async listPromoTemplatesForUser(opts: { role: "student" | "creator" | "teacher" | "admin"; sponsorsEnabled: boolean; type?: string }): Promise<PromoTemplate[]> {
    const { role, sponsorsEnabled, type } = opts;
    const conditions = [eq(promoTemplates.isActive, true)];
    if (type) conditions.push(eq(promoTemplates.type, type));

    if (role === "student") {
      // Students see ONLY school-safe + approved + audience all/student.
      // No sponsor templates for students regardless of sponsorsEnabled.
      conditions.push(eq(promoTemplates.isSchoolSafe, true));
      conditions.push(eq(promoTemplates.status, "approved"));
      conditions.push(inArray(promoTemplates.audience, ["all", "student"]));
      conditions.push(inArray(promoTemplates.type, ["platform", "creator", "student"]));
    } else if (role === "teacher") {
      conditions.push(eq(promoTemplates.status, "approved"));
      conditions.push(inArray(promoTemplates.audience, ["all", "teacher", "school"]));
      if (!sponsorsEnabled) conditions.push(inArray(promoTemplates.type, ["platform", "creator", "student"]));
    } else if (role === "creator") {
      conditions.push(eq(promoTemplates.status, "approved"));
      conditions.push(inArray(promoTemplates.audience, ["all", "creator"]));
      if (!sponsorsEnabled) conditions.push(inArray(promoTemplates.type, ["platform", "creator", "student"]));
    }
    // admin sees everything (no extra status/audience filter)

    return db.select().from(promoTemplates).where(and(...conditions)).orderBy(desc(promoTemplates.updatedAt));
  }

  async listAllPromoTemplates(filter?: { type?: string; status?: string }): Promise<PromoTemplate[]> {
    const conditions = [];
    if (filter?.type) conditions.push(eq(promoTemplates.type, filter.type));
    if (filter?.status) conditions.push(eq(promoTemplates.status, filter.status));
    const q = conditions.length > 0
      ? db.select().from(promoTemplates).where(and(...conditions))
      : db.select().from(promoTemplates);
    return q.orderBy(desc(promoTemplates.updatedAt));
  }

  async getPromoTemplate(id: string): Promise<PromoTemplate | undefined> {
    const [t] = await db.select().from(promoTemplates).where(eq(promoTemplates.id, id));
    return t || undefined;
  }

  async createPromoTemplate(input: InsertPromoTemplate): Promise<PromoTemplate> {
    const [created] = await db.insert(promoTemplates).values(input).returning();
    return created;
  }

  async updatePromoTemplate(id: string, updates: Partial<InsertPromoTemplate>): Promise<PromoTemplate | undefined> {
    const [updated] = await db.update(promoTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(promoTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePromoTemplate(id: string): Promise<boolean> {
    const result = await db.delete(promoTemplates).where(eq(promoTemplates.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async listPromoInstancesForProject(projectId: string): Promise<PromoInstance[]> {
    return db.select().from(promoInstances).where(eq(promoInstances.projectId, projectId));
  }

  async getPromoInstance(id: string): Promise<PromoInstance | undefined> {
    const [row] = await db.select().from(promoInstances).where(eq(promoInstances.id, id));
    return row || undefined;
  }

  async createPromoInstance(input: InsertPromoInstance): Promise<PromoInstance> {
    const [created] = await db.insert(promoInstances).values(input).returning();
    return created;
  }

  async updatePromoInstance(id: string, updates: Partial<InsertPromoInstance>): Promise<PromoInstance | undefined> {
    const [updated] = await db.update(promoInstances).set(updates).where(eq(promoInstances.id, id)).returning();
    return updated || undefined;
  }

  async deletePromoInstance(id: string): Promise<boolean> {
    const result = await db.delete(promoInstances).where(eq(promoInstances.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async createPromoReview(input: InsertPromoReview): Promise<PromoReview> {
    const [created] = await db.insert(promoReviews).values(input).returning();
    return created;
  }

  async listPromoReviews(templateId: string): Promise<PromoReview[]> {
    return db.select().from(promoReviews).where(eq(promoReviews.templateId, templateId)).orderBy(desc(promoReviews.reviewedAt));
  }
}

export const storage = new DatabaseStorage();
