import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("creator"), // creator | admin
  ipDisclosureAccepted: timestamp("ip_disclosure_accepted"),
  userAgreementAccepted: timestamp("user_agreement_accepted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects table - stores all creative works (comics, cards, VNs, etc.)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // comic | card | vn | cyoa | cover | motion
  status: text("status").notNull().default("draft"), // draft | published
  data: jsonb("data").notNull(), // Flexible JSON for each project type's specific data
  thumbnail: text("thumbnail"), // URL to preview image
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Assets table - stores uploaded media (images, videos, audio)
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  type: text("type").notNull(), // image | video | audio
  filename: text("filename").notNull(),
  metadata: jsonb("metadata"), // size, dimensions, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Project type-specific data schemas
export const comicDataSchema = z.object({
  pages: z.array(z.object({
    id: z.string(),
    panels: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      content: z.object({
        type: z.enum(["image", "video", "drawing", "text"]),
        data: z.any(),
      }),
    })),
  })),
});

export const cardDataSchema = z.object({
  name: z.string(),
  type: z.string(),
  rarity: z.string(),
  stats: z.object({
    attack: z.number().optional(),
    defense: z.number().optional(),
    cost: z.number().optional(),
  }),
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
  lore: z.string().optional(),
  evolution: z.object({
    stage: z.number(),
    nextCardId: z.string().optional(),
  }).optional(),
});

export const vnDataSchema = z.object({
  scenes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    background: z.string().optional(),
    dialogue: z.array(z.object({
      speaker: z.string().optional(),
      text: z.string(),
      characterSprite: z.string().optional(),
    })),
    choices: z.array(z.object({
      text: z.string(),
      nextSceneId: z.string(),
    })).optional(),
  })),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    sprites: z.record(z.string()),
  })),
});

export const cyoaDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    x: z.number(),
    y: z.number(),
    isEnding: z.boolean().optional(),
    choices: z.array(z.object({
      text: z.string(),
      targetNodeId: z.string(),
    })).optional(),
  })),
});

export const coverDataSchema = z.object({
  front: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    author: z.string().optional(),
    heroImage: z.string().optional(),
  }),
  back: z.object({
    synopsis: z.string().optional(),
    isbn: z.string().optional(),
    barcode: z.string().optional(),
    qrLink: z.string().optional(),
  }).optional(),
  spine: z.object({
    text: z.string(),
  }).optional(),
});

export const motionDataSchema = z.object({
  timeline: z.object({
    duration: z.number(),
    tracks: z.array(z.object({
      id: z.string(),
      type: z.enum(["video", "audio"]),
      clips: z.array(z.object({
        id: z.string(),
        assetUrl: z.string(),
        startTime: z.number(),
        duration: z.number(),
      })),
    })),
  }),
  effects: z.array(z.object({
    type: z.string(),
    params: z.record(z.any()),
  })),
});

// Portfolio Artworks table - for showcasing finished work
export const portfolioArtworks = pgTable("portfolio_artworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // mixed-media | digital | paintings | sculptures | prints
  medium: text("medium"), // specific materials used
  dimensions: jsonb("dimensions"), // { width, height, depth, unit }
  year: integer("year"),
  price: integer("price"), // in cents
  available: boolean("available").default(true),
  featured: boolean("featured").default(false),
  images: jsonb("images").notNull(), // array of image URLs
  tags: jsonb("tags"), // array of tags for filtering
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortfolioArtworkSchema = createInsertSchema(portfolioArtworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolioArtwork = z.infer<typeof insertPortfolioArtworkSchema>;
export type PortfolioArtwork = typeof portfolioArtworks.$inferSelect;

// Artwork Categories for filtering
export const artworkCategories = pgTable("artwork_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertArtworkCategorySchema = createInsertSchema(artworkCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertArtworkCategory = z.infer<typeof insertArtworkCategorySchema>;
export type ArtworkCategory = typeof artworkCategories.$inferSelect;

// Exhibitions/Events table
export const portfolioEvents = pgTable("portfolio_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  venue: text("venue"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  eventType: text("event_type").notNull(), // exhibition | workshop | talk | opening
  status: text("status").notNull().default("upcoming"), // upcoming | ongoing | past
  images: jsonb("images"), // array of image URLs
  externalLink: text("external_link"),
  rsvpEnabled: boolean("rsvp_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortfolioEventSchema = createInsertSchema(portfolioEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolioEvent = z.infer<typeof insertPortfolioEventSchema>;
export type PortfolioEvent = typeof portfolioEvents.$inferSelect;

// Blog Posts table
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  images: jsonb("images"), // array of image URLs for galleries
  tags: jsonb("tags"), // array of tags
  status: text("status").notNull().default("draft"), // draft | published
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Contact Messages table
export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("general"), // general | inquiry | commission | studio-visit
  status: text("status").notNull().default("unread"), // unread | read | replied | archived
  preferredDate: timestamp("preferred_date"), // for studio visit scheduling
  newsletter: boolean("newsletter").default(false), // opt-in for newsletter
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Newsletter Subscribers table
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: text("status").notNull().default("active"), // active | unsubscribed
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// Artist Profile table
export const artistProfiles = pgTable("artist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  artistStatement: text("artist_statement"),
  cvContent: text("cv_content"),
  processDescription: text("process_description"),
  studioPhotos: jsonb("studio_photos"), // array of image URLs
  socialLinks: jsonb("social_links"), // { instagram, twitter, website, etc }
  location: text("location"),
  availableForCommissions: boolean("available_for_commissions").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertArtistProfileSchema = createInsertSchema(artistProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArtistProfile = z.infer<typeof insertArtistProfileSchema>;
export type ArtistProfile = typeof artistProfiles.$inferSelect;

// Favorites/Wishlist table
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: varchar("artwork_id").notNull().references(() => portfolioArtworks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Shopping Cart table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: varchar("artwork_id").notNull().references(() => portfolioArtworks.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | paid | shipped | delivered | cancelled
  totalAmount: integer("total_amount").notNull(), // in cents
  shippingAddress: jsonb("shipping_address"),
  paymentIntentId: text("payment_intent_id"),
  items: jsonb("items").notNull(), // snapshot of ordered items
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============================================
// ECOSYSTEM TABLES - Press Start | MMM
// ============================================

// Creator Roles - supports multiple user types
export const creatorRoles = pgTable("creator_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // student, creator, mentor, school_admin, hub_staff, pro_creator, admin
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions"), // array of permission strings
  tier: integer("tier").notNull().default(1), // progression tier
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreatorRoleSchema = createInsertSchema(creatorRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertCreatorRole = z.infer<typeof insertCreatorRoleSchema>;
export type CreatorRole = typeof creatorRoles.$inferSelect;

// User Role Assignments (many-to-many)
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => creatorRoles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Creator XP & Progression
export const creatorXp = pgTable("creator_xp", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentTier: text("current_tier").notNull().default("learner"), // learner, creator, mentor, professional, founder, community_builder
  projectsCompleted: integer("projects_completed").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  collaborations: integer("collaborations").notNull().default(0),
  mentoringSessions: integer("mentoring_sessions").notNull().default(0),
  festivalParticipations: integer("festival_participations").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreatorXpSchema = createInsertSchema(creatorXp).omit({
  id: true,
  updatedAt: true,
});

export type InsertCreatorXp = z.infer<typeof insertCreatorXpSchema>;
export type CreatorXp = typeof creatorXp.$inferSelect;

// XP Transactions (history of XP gains)
export const xpTransactions = pgTable("xp_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  action: text("action").notNull(), // lesson_complete, project_publish, badge_earned, collaboration, etc.
  description: text("description"),
  referenceId: varchar("reference_id"), // ID of related entity
  referenceType: text("reference_type"), // lesson, project, badge, team, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertXpTransactionSchema = createInsertSchema(xpTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertXpTransaction = z.infer<typeof insertXpTransactionSchema>;
export type XpTransaction = typeof xpTransactions.$inferSelect;

// Skill Badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // emoji or icon name
  category: text("category").notNull(), // skill, achievement, milestone, special
  xpReward: integer("xp_reward").notNull().default(0),
  requirements: jsonb("requirements"), // conditions to earn
  rarity: text("rarity").notNull().default("common"), // common, uncommon, rare, epic, legendary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badges (earned)
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ============================================
// LEARN MODULE
// ============================================

// Learning Pathways
export const learningPathways = pgTable("learning_pathways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // comics, animation, 3d, worldbuilding, writing, tools
  difficulty: text("difficulty").notNull().default("beginner"), // beginner, intermediate, advanced
  estimatedHours: integer("estimated_hours"),
  thumbnail: text("thumbnail"),
  xpReward: integer("xp_reward").notNull().default(100),
  badgeId: varchar("badge_id").references(() => badges.id),
  sortOrder: integer("sort_order").default(0),
  published: boolean("published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLearningPathwaySchema = createInsertSchema(learningPathways).omit({
  id: true,
  createdAt: true,
});

export type InsertLearningPathway = z.infer<typeof insertLearningPathwaySchema>;
export type LearningPathway = typeof learningPathways.$inferSelect;

// Lessons
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pathwayId: varchar("pathway_id").notNull().references(() => learningPathways.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // markdown or rich text
  videoUrl: text("video_url"),
  duration: integer("duration"), // in minutes
  xpReward: integer("xp_reward").notNull().default(25),
  sortOrder: integer("sort_order").default(0),
  hasChallenge: boolean("has_challenge").default(false),
  challengePrompt: text("challenge_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

// Lesson Progress
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  pathwayId: varchar("pathway_id").notNull().references(() => learningPathways.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed
  progressPercent: integer("progress_percent").notNull().default(0),
  challengeSubmission: text("challenge_submission"), // URL or content
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  updatedAt: true,
});

export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;

// ============================================
// SCHOOLS MODULE
// ============================================

// Schools / School Stations
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  bannerImage: text("banner_image"),
  location: text("location"),
  contactEmail: text("contact_email"),
  websiteUrl: text("website_url"),
  monetizationEnabled: boolean("monetization_enabled").default(false),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// School Memberships
export const schoolMemberships = pgTable("school_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("student"), // student, teacher, admin
  department: text("department"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertSchoolMembershipSchema = createInsertSchema(schoolMemberships).omit({
  id: true,
  joinedAt: true,
});

export type InsertSchoolMembership = z.infer<typeof insertSchoolMembershipSchema>;
export type SchoolMembership = typeof schoolMemberships.$inferSelect;

// School Challenges
export const schoolChallenges = pgTable("school_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // comic, animation, art, writing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  xpReward: integer("xp_reward").notNull().default(100),
  status: text("status").notNull().default("upcoming"), // upcoming, active, ended
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchoolChallengeSchema = createInsertSchema(schoolChallenges).omit({
  id: true,
  createdAt: true,
});

export type InsertSchoolChallenge = z.infer<typeof insertSchoolChallengeSchema>;
export type SchoolChallenge = typeof schoolChallenges.$inferSelect;

// ============================================
// CREATOR HUBS MODULE
// ============================================

// Creator Hubs (Community Centers)
export const creatorHubs = pgTable("creator_hubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  logo: text("logo"),
  bannerImage: text("banner_image"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  operatingHours: jsonb("operating_hours"), // { monday: { open, close }, ... }
  amenities: jsonb("amenities"), // array of amenity strings
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreatorHubSchema = createInsertSchema(creatorHubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCreatorHub = z.infer<typeof insertCreatorHubSchema>;
export type CreatorHub = typeof creatorHubs.$inferSelect;

// Hub Equipment
export const hubEquipment = pgTable("hub_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hubId: varchar("hub_id").notNull().references(() => creatorHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // camera, audio, lighting, computer, motion_capture, green_screen
  available: boolean("available").default(true),
  imageUrl: text("image_url"),
  specifications: jsonb("specifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHubEquipmentSchema = createInsertSchema(hubEquipment).omit({
  id: true,
  createdAt: true,
});

export type InsertHubEquipment = z.infer<typeof insertHubEquipmentSchema>;
export type HubEquipment = typeof hubEquipment.$inferSelect;

// Equipment Reservations
export const equipmentReservations = pgTable("equipment_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").notNull().references(() => hubEquipment.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, active, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEquipmentReservationSchema = createInsertSchema(equipmentReservations).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentReservation = z.infer<typeof insertEquipmentReservationSchema>;
export type EquipmentReservation = typeof equipmentReservations.$inferSelect;

// Studio Bookings
export const studioBookings = pgTable("studio_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hubId: varchar("hub_id").notNull().references(() => creatorHubs.id, { onDelete: "cascade" }),
  studioType: text("studio_type").notNull(), // audio_booth, green_screen, motion_capture, vo_booth
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "11:00"
  status: text("status").notNull().default("pending"), // pending, approved, active, completed, cancelled
  projectDescription: text("project_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudioBookingSchema = createInsertSchema(studioBookings).omit({
  id: true,
  createdAt: true,
});

export type InsertStudioBooking = z.infer<typeof insertStudioBookingSchema>;
export type StudioBooking = typeof studioBookings.$inferSelect;

// ============================================
// COLLABORATION MODULE
// ============================================

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  leaderId: varchar("leader_id").notNull().references(() => users.id),
  isPublic: boolean("is_public").default(true),
  maxMembers: integer("max_members").default(10),
  inviteCode: text("invite_code").unique(), // Shareable join code
  tags: jsonb("tags"), // skills, interests
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Team Members
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // leader, co-leader, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Team Projects (collaborative works)
export const teamProjects = pgTable("team_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, completed, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamProjectSchema = createInsertSchema(teamProjects).omit({
  id: true,
  createdAt: true,
});

export type InsertTeamProject = z.infer<typeof insertTeamProjectSchema>;
export type TeamProject = typeof teamProjects.$inferSelect;

// Project Credits
export const projectCredits = pgTable("project_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // writer, artist, colorist, letterer, editor, etc.
  contribution: text("contribution"),
  revenueShare: integer("revenue_share").default(0), // percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectCreditSchema = createInsertSchema(projectCredits).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectCredit = z.infer<typeof insertProjectCreditSchema>;
export type ProjectCredit = typeof projectCredits.$inferSelect;

// ============================================
// PUBLISH MODULE
// ============================================

// Publishing Channels
export const publishChannels = pgTable("publish_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerType: text("owner_type").notNull(), // user, school, hub
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatar: text("avatar"),
  banner: text("banner"),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  verified: boolean("verified").default(false),
  monetizationEnabled: boolean("monetization_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPublishChannelSchema = createInsertSchema(publishChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPublishChannel = z.infer<typeof insertPublishChannelSchema>;
export type PublishChannel = typeof publishChannels.$inferSelect;

// Published Content
export const publishedContent = pgTable("published_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").notNull().references(() => publishChannels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  contentType: text("content_type").notNull(), // comic, episode, film, short, animation, vn, cyoa
  tags: jsonb("tags"),
  monetized: boolean("monetized").default(false),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, approved, live, rejected
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPublishedContentSchema = createInsertSchema(publishedContent).omit({
  id: true,
  createdAt: true,
});

export type InsertPublishedContent = z.infer<typeof insertPublishedContentSchema>;
export type PublishedContent = typeof publishedContent.$inferSelect;

// ============================================
// EARN MODULE
// ============================================

// Revenue Events
export const revenueEvents = pgTable("revenue_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").references(() => publishedContent.id),
  type: text("type").notNull(), // view, tip, ad_share, merch_sale, subscription
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("USD"),
  sourceType: text("source_type"), // personal, school, hub, global
  status: text("status").notNull().default("pending"), // pending, processed, paid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevenueEventSchema = createInsertSchema(revenueEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertRevenueEvent = z.infer<typeof insertRevenueEventSchema>;
export type RevenueEvent = typeof revenueEvents.$inferSelect;

// Payouts
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("USD"),
  method: text("method").notNull(), // paypal, stripe, bank_transfer
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  transactionId: text("transaction_id"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  requestedAt: true,
});

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

// Tip Jars
export const tipJars = pgTable("tip_jars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  enabled: boolean("enabled").default(true),
  minimumAmount: integer("minimum_amount").default(100), // in cents
  customMessage: text("custom_message"),
  totalReceived: integer("total_received").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTipJarSchema = createInsertSchema(tipJars).omit({
  id: true,
  createdAt: true,
});

export type InsertTipJar = z.infer<typeof insertTipJarSchema>;
export type TipJar = typeof tipJars.$inferSelect;

// ============================================
// EVENTS MODULE - Press Play Festival
// ============================================

// Festivals
export const festivals = pgTable("festivals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  year: integer("year").notNull(),
  theme: text("theme"),
  bannerImage: text("banner_image"),
  summitStartDate: timestamp("summit_start_date"),
  summitEndDate: timestamp("summit_end_date"),
  screeningStartDate: timestamp("screening_start_date"),
  screeningEndDate: timestamp("screening_end_date"),
  submissionDeadline: timestamp("submission_deadline"),
  status: text("status").notNull().default("upcoming"), // upcoming, summit_active, screening_active, completed
  votingEnabled: boolean("voting_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFestivalSchema = createInsertSchema(festivals).omit({
  id: true,
  createdAt: true,
});

export type InsertFestival = z.infer<typeof insertFestivalSchema>;
export type Festival = typeof festivals.$inferSelect;

// Festival Workshops (Creator Connect Summit)
export const festivalWorkshops = pgTable("festival_workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  festivalId: varchar("festival_id").notNull().references(() => festivals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  instructor: text("instructor"),
  instructorBio: text("instructor_bio"),
  date: timestamp("date").notNull(),
  duration: integer("duration"), // in minutes
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").notNull().default(0),
  category: text("category"), // animation, comics, writing, tools, business
  skillLevel: text("skill_level").default("all"), // beginner, intermediate, advanced, all
  streamUrl: text("stream_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFestivalWorkshopSchema = createInsertSchema(festivalWorkshops).omit({
  id: true,
  createdAt: true,
});

export type InsertFestivalWorkshop = z.infer<typeof insertFestivalWorkshopSchema>;
export type FestivalWorkshop = typeof festivalWorkshops.$inferSelect;

// Workshop Registrations
export const workshopRegistrations = pgTable("workshop_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => festivalWorkshops.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("registered"), // registered, attended, no_show
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const insertWorkshopRegistrationSchema = createInsertSchema(workshopRegistrations).omit({
  id: true,
  registeredAt: true,
});

export type InsertWorkshopRegistration = z.infer<typeof insertWorkshopRegistrationSchema>;
export type WorkshopRegistration = typeof workshopRegistrations.$inferSelect;

// Festival Submissions
export const festivalSubmissions = pgTable("festival_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  festivalId: varchar("festival_id").notNull().references(() => festivals.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: varchar("school_id").references(() => schools.id),
  category: text("category").notNull(), // best_comic, best_animation, best_vn, best_cyoa, peoples_choice
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, finalist, winner
  voteCount: integer("vote_count").notNull().default(0),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertFestivalSubmissionSchema = createInsertSchema(festivalSubmissions).omit({
  id: true,
  submittedAt: true,
});

export type InsertFestivalSubmission = z.infer<typeof insertFestivalSubmissionSchema>;
export type FestivalSubmission = typeof festivalSubmissions.$inferSelect;

// Festival Votes
export const festivalVotes = pgTable("festival_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => festivalSubmissions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFestivalVoteSchema = createInsertSchema(festivalVotes).omit({
  id: true,
  createdAt: true,
});

export type InsertFestivalVote = z.infer<typeof insertFestivalVoteSchema>;
export type FestivalVote = typeof festivalVotes.$inferSelect;

// Festival Awards
export const festivalAwards = pgTable("festival_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  festivalId: varchar("festival_id").notNull().references(() => festivals.id, { onDelete: "cascade" }),
  submissionId: varchar("submission_id").notNull().references(() => festivalSubmissions.id, { onDelete: "cascade" }),
  awardName: text("award_name").notNull(),
  category: text("category").notNull(),
  xpReward: integer("xp_reward").notNull().default(500),
  badgeId: varchar("badge_id").references(() => badges.id),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
});

export const insertFestivalAwardSchema = createInsertSchema(festivalAwards).omit({
  id: true,
  awardedAt: true,
});

export type InsertFestivalAward = z.infer<typeof insertFestivalAwardSchema>;
export type FestivalAward = typeof festivalAwards.$inferSelect;

// ============================================
// SOCIAL MEDIA MODULE
// ============================================

// Social Posts - Instagram/TikTok style posts
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: text("type").notNull().default("post"), // post, comic, card, repost
  caption: text("caption"),
  mediaUrls: jsonb("media_urls"), // array of image/video URLs
  visibility: text("visibility").notNull().default("public"), // public, followers, private
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({
  id: true,
  likeCount: true,
  commentCount: true,
  shareCount: true,
  createdAt: true,
});

export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

// Social Post Likes
export const socialPostLikes = pgTable("social_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocialPostLikeSchema = createInsertSchema(socialPostLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertSocialPostLike = z.infer<typeof insertSocialPostLikeSchema>;
export type SocialPostLike = typeof socialPostLikes.$inferSelect;

// Social Post Comments
export const socialPostComments = pgTable("social_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"), // for nested replies
  body: text("body").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocialPostCommentSchema = createInsertSchema(socialPostComments).omit({
  id: true,
  likeCount: true,
  createdAt: true,
});

export type InsertSocialPostComment = z.infer<typeof insertSocialPostCommentSchema>;
export type SocialPostComment = typeof socialPostComments.$inferSelect;

// User Follows (social graph)
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type UserFollow = typeof userFollows.$inferSelect;

// Direct Messages - Threads
export const dmThreads = pgTable("dm_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isGroup: boolean("is_group").notNull().default(false),
  name: text("name"), // for group chats
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDmThreadSchema = createInsertSchema(dmThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDmThread = z.infer<typeof insertDmThreadSchema>;
export type DmThread = typeof dmThreads.$inferSelect;

// DM Thread Participants
export const dmParticipants = pgTable("dm_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => dmThreads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member
  lastReadAt: timestamp("last_read_at"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertDmParticipantSchema = createInsertSchema(dmParticipants).omit({
  id: true,
  joinedAt: true,
});

export type InsertDmParticipant = z.infer<typeof insertDmParticipantSchema>;
export type DmParticipant = typeof dmParticipants.$inferSelect;

// DM Messages
export const dmMessages = pgTable("dm_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => dmThreads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  attachments: jsonb("attachments"), // array of { type, url }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDmMessageSchema = createInsertSchema(dmMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type DmMessage = typeof dmMessages.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // like, comment, follow, mention, collab_invite, dm
  metadata: jsonb("metadata"), // { postId, commentId, etc }
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================
// LIVE COLLABORATION MODULE
// ============================================

// Collab Sessions
export const collabSessions = pgTable("collab_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code").notNull().unique(),
  maxEditors: integer("max_editors").notNull().default(4),
  pageCount: integer("page_count").notNull().default(1),
  status: text("status").notNull().default("active"), // active, paused, completed
  settings: jsonb("settings"), // { allowChat, allowVoice, etc }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCollabSessionSchema = createInsertSchema(collabSessions).omit({
  id: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCollabSession = z.infer<typeof insertCollabSessionSchema>;
export type CollabSession = typeof collabSessions.$inferSelect;

// Collab Session Members
export const collabMembers = pgTable("collab_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => collabSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("editor"), // owner, editor, viewer
  color: text("color"), // cursor/highlight color
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertCollabMemberSchema = createInsertSchema(collabMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertCollabMember = z.infer<typeof insertCollabMemberSchema>;
export type CollabMember = typeof collabMembers.$inferSelect;

// Collab Presence (real-time state, may be in memory/redis in production)
export const collabPresence = pgTable("collab_presence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => collabSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cursor: jsonb("cursor"), // { x, y, pageId }
  activeTool: text("active_tool"),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const insertCollabPresenceSchema = createInsertSchema(collabPresence).omit({
  id: true,
});

export type InsertCollabPresence = z.infer<typeof insertCollabPresenceSchema>;
export type CollabPresence = typeof collabPresence.$inferSelect;

// ============================================
// COMMUNITY CHAINS (Collaborative Comic Game)
// ============================================

// Community Chains - A collaborative comic thread
export const communityChains = pgTable("community_chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  visibility: text("visibility").notNull().default("public"), // public (open community) | mutuals (mutual followers only)
  status: text("status").notNull().default("active"), // active | completed | archived
  maxContributions: integer("max_contributions"), // null = unlimited
  contributionCount: integer("contribution_count").notNull().default(1),
  thumbnail: text("thumbnail"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommunityChainSchema = createInsertSchema(communityChains).omit({
  id: true,
  contributionCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunityChain = z.infer<typeof insertCommunityChainSchema>;
export type CommunityChain = typeof communityChains.$inferSelect;

// Chain Contributions - Individual entries in a chain
export const chainContributions = pgTable("chain_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chainId: varchar("chain_id").notNull().references(() => communityChains.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references((): any => chainContributions.id, { onDelete: "set null" }),
  position: integer("position").notNull(), // Order in chain (1, 2, 3...)
  contentType: text("content_type").notNull(), // image | video | drawing | animation
  mediaUrl: text("media_url").notNull(),
  caption: text("caption"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChainContributionSchema = createInsertSchema(chainContributions).omit({
  id: true,
  likesCount: true,
  createdAt: true,
});

export type InsertChainContribution = z.infer<typeof insertChainContributionSchema>;
export type ChainContribution = typeof chainContributions.$inferSelect;

// Chain Likes
export const chainLikes = pgTable("chain_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contributionId: varchar("contribution_id").notNull().references(() => chainContributions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChainLikeSchema = createInsertSchema(chainLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertChainLike = z.infer<typeof insertChainLikeSchema>;
export type ChainLike = typeof chainLikes.$inferSelect;
