import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  username: varchar("username").unique(),
  role: text("role").notNull().default("creator"), // creator | admin | teacher
  accountType: text("account_type").notNull().default("creator"), // student (6-17) | creator (18+)
  dateOfBirth: text("date_of_birth"), // YYYY-MM-DD format
  avatar: text("avatar"),
  coverImage: text("cover_image"),
  tagline: text("tagline"),
  bio: text("bio"),
  creatorClass: text("creator_class").default("Rookie"),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  totalMinutes: integer("total_minutes").default(0),
  lastXpHeartbeat: timestamp("last_xp_heartbeat"),
  lastActiveAt: timestamp("last_active_at"),
  statCreativity: integer("stat_creativity").default(10),
  statStorytelling: integer("stat_storytelling").default(10),
  statArtistry: integer("stat_artistry").default(10),
  statCollaboration: integer("stat_collaboration").default(10),
  socialLinks: jsonb("social_links"),
  parentalConsentAt: timestamp("parental_consent_at"),
  ipDisclosureAccepted: timestamp("ip_disclosure_accepted"),
  userAgreementAccepted: timestamp("user_agreement_accepted"),
  aiConsentAcceptedAt: timestamp("ai_consent_accepted_at"),
  loginCount: integer("login_count").default(0),
  lastLoginAt: timestamp("last_login_at"),
  signupSource: text("signup_source"),
  ecosystemRole: text("ecosystem_role").default("learner"),
  conductScore: integer("conduct_score").default(100),
  reliabilityScore: integer("reliability_score").default(100),
  mentorId: varchar("mentor_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Projects table - stores all creative works (comics, cards, VNs, etc.)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // comic | card | vn | cyoa | cover | motion
  status: text("status").notNull().default("draft"), // draft | review | approved | rejected | published
  data: jsonb("data").notNull(), // Flexible JSON for each project type's specific data
  thumbnail: text("thumbnail"), // URL to preview image
  viewCount: integer("view_count").notNull().default(0),
  seriesId: varchar("series_id"),
  seriesOrder: integer("series_order"),
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

// Project snapshots — silent backups taken on every meaningful save.
// Acts as a safety net so a buggy client or accidental overwrite can be
// recovered. Keep the most recent N per project (rotated server-side).
export const projectSnapshots = pgTable("project_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  data: jsonb("data").notNull(),
  spreadCount: integer("spread_count").notNull().default(0),
  contentScore: integer("content_score").notNull().default(0),
  reason: text("reason").notNull().default("autosave"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSnapshotSchema = createInsertSchema(projectSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectSnapshot = z.infer<typeof insertProjectSnapshotSchema>;
export type ProjectSnapshot = typeof projectSnapshots.$inferSelect;

// Assets table - stores uploaded media (images, videos, audio)
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  folderId: varchar("folder_id"), // sprites, backgrounds, characters, effects, bubbles
  sortOrder: integer("sort_order").default(0),
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

// FX Effects table - local storage for FX Studio asset sync
export const fxEffects = pgTable("fx_effects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  userEmail: text("user_email"),
  userName: text("user_name"),
  name: text("name").notNull(),
  type: text("type").default("static-asset"),
  assetTag: text("asset_tag"),
  previewDataUrl: text("preview_data_url"),
  layers: jsonb("layers").default([]),
  canvasBackground: text("canvas_background"),
  metadata: jsonb("metadata").default({}),
  projectId: varchar("project_id"),
  sourceMode: text("source_mode"),
  sourcePanelId: text("source_panel_id"),
  targetPage: integer("target_page"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFxEffectSchema = createInsertSchema(fxEffects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFxEffect = z.infer<typeof insertFxEffectSchema>;
export type FxEffect = typeof fxEffects.$inferSelect;

// API Keys table - for external app integrations
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Friendly name for the key
  keyHash: text("key_hash").notNull(), // Hashed API key (never store raw)
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  permissions: jsonb("permissions").default(['upload', 'read']), // Array of permissions
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Asset Packs table - bundles of assets uploaded together
export const assetPacks = pgTable("asset_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"), // characters, backgrounds, effects, ui, audio
  tags: text("tags").array(),
  thumbnail: text("thumbnail"),
  assets: jsonb("assets").notNull().default([]), // Array of asset references
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  version: text("version").default("1.0.0"),
  metadata: jsonb("metadata"), // Additional pack info
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssetPackSchema = createInsertSchema(assetPacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetPack = z.infer<typeof insertAssetPackSchema>;
export type AssetPack = typeof assetPacks.$inferSelect;

export const platformAssets = pgTable("platform_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  type: text("type").notNull().default("image"),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags").array(),
  priceInCents: integer("price_in_cents").notNull().default(0),
  isFree: boolean("is_free").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  sourceType: text("source_type").notNull().default("original"),
  rightsClass: text("rights_class").notNull().default("safe-redistributable"),
  usageMode: text("usage_mode").notNull().default("system-use-and-export"),
  downloadAllowed: boolean("download_allowed").notNull().default(false),
  publishAllowed: boolean("publish_allowed").notNull().default(true),
  editableByUser: boolean("editable_by_user").notNull().default(false),
  unlockType: text("unlock_type").notNull().default("free"),
  xpRequired: integer("xp_required").notNull().default(0),
  allowedOutputs: text("allowed_outputs").array(),
  schoolSafe: boolean("school_safe").notNull().default(true),
  licenseNotes: text("license_notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformAssetSchema = createInsertSchema(platformAssets).omit({
  id: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatformAsset = z.infer<typeof insertPlatformAssetSchema>;
export type PlatformAsset = typeof platformAssets.$inferSelect;

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
    themeMusic: z.object({
      src: z.string(),
      name: z.string(),
      volume: z.number().default(0.5),
      loop: z.boolean().default(true),
      autoplay: z.boolean().default(true),
    }).optional(),
    sfxTracks: z.array(z.object({
      id: z.string(),
      src: z.string(),
      name: z.string(),
      trigger: z.enum(["on_enter", "on_click", "manual"]).default("on_enter"),
      volume: z.number().default(0.8),
    })).optional(),
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

export const hopSceneSchema = z.object({
  id: z.string(),
  order: z.number(),
  assetType: z.enum(["image", "gif", "video", "text_card", "motion_scene"]),
  assetUrl: z.string().optional(),
  textOverlay: z.string().optional(),
  caption: z.string().optional(),
  duration: z.number(),
  transition: z.enum(["cut", "fade", "zoom", "glitch", "slide-right", "slide-left", "slide-up", "dissolve", "wipe-left", "wipe-right", "wipe-up", "wipe-down", "iris", "blur-through", "spin", "flash"]).default("cut"),
  loopInScene: z.boolean().default(false),
  effects: z.array(z.string()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mood: z.string().optional(),
  cameraAngle: z.string().optional(),
  lighting: z.string().optional(),
  location: z.string().optional(),
  characters: z.array(z.string()).optional(),
  lyricsSegment: z.string().optional(),
  soundPack: z.string().optional(),
  cameraStart: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
  cameraEnd: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
  cameraEasing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  syncMode: z.enum(["manual", "snap-to-beat", "fill"]).optional(),
  beatMarkerRef: z.string().optional(),
  transitionTrigger: z.enum(["on-beat", "manual"]).optional(),
  referenceImages: z.array(z.string()).optional(),
  fxLayers: z.array(z.string()).optional(),
  templateId: z.string().optional(),
});

export const hopDataSchema = z.object({
  type: z.enum(["single", "series"]),
  clipLengthMode: z.enum(["30s", "90s", "custom"]).default("30s"),
  loopMode: z.enum(["single_loop", "full_series_loop", "manual_advance"]).default("single_loop"),
  audioTrack: z.object({
    src: z.string(),
    name: z.string(),
    volume: z.number().default(0.8),
    loop: z.boolean().default(true),
    bpm: z.number().optional(),
    fadeIn: z.number().optional(),
    fadeOut: z.number().optional(),
  }).optional(),
  scenes: z.array(hopSceneSchema),
  coverImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  totalDuration: z.number().optional(),
  previewSettings: z.object({
    autoplay: z.boolean().default(true),
    mutedByDefault: z.boolean().default(false),
    showCaptions: z.boolean().default(true),
  }).optional(),
  streamingSyncStatus: z.enum(["draft", "queued", "published", "failed"]).default("draft"),
  canvasNodes: z.array(z.object({
    id: z.string(),
    nodeType: z.enum(["idea", "character", "scene", "theme", "beat", "reference"]),
    title: z.string(),
    content: z.string().optional(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    color: z.string().optional(),
    imageUrl: z.string().optional(),
    linkedSceneId: z.string().optional(),
    traits: z.array(z.string()).optional(),
  })).optional(),
  canvasConnections: z.array(z.object({
    id: z.string(),
    fromNodeId: z.string(),
    toNodeId: z.string(),
    label: z.string().optional(),
    lineStyle: z.enum(["solid", "dashed"]).optional(),
    color: z.string().optional(),
  })).optional(),
  canvasStickyNotes: z.array(z.object({
    id: z.string(),
    text: z.string(),
    positionX: z.number(),
    positionY: z.number(),
    color: z.string(),
    attachedToNodeId: z.string().optional(),
  })).optional(),
  canvasAnnotations: z.array(z.object({
    points: z.array(z.object({ x: z.number(), y: z.number() })),
    color: z.string(),
    width: z.number(),
  })).optional(),
  canvasReferenceImages: z.array(z.object({
    id: z.string(),
    dataUrl: z.string(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number(),
    height: z.number(),
    opacity: z.number().default(1),
    locked: z.boolean().default(false),
  })).optional(),
  beatMarkers: z.array(z.object({
    id: z.string(),
    timePosition: z.number(),
    label: z.string().optional(),
    autoDetected: z.boolean().default(false),
  })).optional(),
  seriesId: z.string().optional(),
  seriesTitle: z.string().optional(),
  episodeNumber: z.number().optional(),
  partLabel: z.string().optional(),
});

export type HopScene = z.infer<typeof hopSceneSchema>;
export type HopData = z.infer<typeof hopDataSchema>;

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
// PS CONTENT BUNDLE + PUBLISHING PIPELINE
// ============================================

// Project Versions - tracks snapshots of project data for versioning
export const projectVersions = pgTable("project_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull().default(1),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  dataSnapshot: jsonb("data_snapshot").notNull(),
  bundleJson: jsonb("bundle_json"),
  changelog: text("changelog"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectVersionSchema = createInsertSchema(projectVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectVersion = z.infer<typeof insertProjectVersionSchema>;
export type ProjectVersion = typeof projectVersions.$inferSelect;

// Publish Jobs - tracks the publish pipeline status
export const publishJobs = pgTable("publish_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionId: varchar("version_id").references(() => projectVersions.id),
  status: text("status").notNull().default("queued"), // queued | building | syncing | complete | failed
  step: text("step"), // validate | bundle | save | sync
  error: text("error"),
  bundleJson: jsonb("bundle_json"),
  // JS field renamed Emergent → streaming for clarity (we now publish to PSStreaming).
  // The DB column name is intentionally preserved as "emergent_sync_id" so this is
  // a non-destructive rename and existing rows keep working.
  streamingSyncId: text("emergent_sync_id"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertPublishJobSchema = createInsertSchema(publishJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPublishJob = z.infer<typeof insertPublishJobSchema>;
export type PublishJob = typeof publishJobs.$inferSelect;

// Engagement Events - inbound from PSStreaming
export const engagementEvents = pgTable("engagement_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  eventType: text("event_type").notNull(), // view | like | vote | share | comment | watch_time
  userId: varchar("user_id"),
  payload: jsonb("payload"),
  source: text("source").default("psstreaming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEngagementEventSchema = createInsertSchema(engagementEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertEngagementEvent = z.infer<typeof insertEngagementEventSchema>;
export type EngagementEvent = typeof engagementEvents.$inferSelect;

// PS Content Bundle v1 Schema - the standard format for all published content
export const psContentBundleSchema = z.object({
  contract_version: z.literal("v1"),
  content_id: z.string().uuid(),
  content_type: z.enum(["comic", "comic_issue", "visual_novel", "cyoa", "trading_card", "cover", "motion", "hop"]),
  title: z.string(),
  description: z.string().optional(),
  cover_asset_url: z.string().optional(),
  creator: z.object({
    ps_user_id: z.string().uuid(),
    display_name: z.string(),
    avatar_url: z.string().optional(),
  }),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  age_rating: z.string().optional(),
  tags: z.array(z.string()).default([]),
  payload: z.any(),
  assets: z.array(z.object({
    asset_id: z.string(),
    url: z.string(),
    type: z.string(),
    thumbnail_url: z.string().optional(),
  })).default([]),
  published_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PSContentBundle = z.infer<typeof psContentBundleSchema>;

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

// ============================================
// IMPORT PIPELINE (Reallusion/ComfyUI)
// ============================================

export const assetImports = pgTable("asset_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  bundleName: text("bundle_name").notNull(),
  sourceApp: text("source_app").notNull(), // iClone | CharacterCreator | CartoonAnimator | ComfyUI | Unknown
  exportType: text("export_type").notNull(), // render | image | image_sequence | video | asset_pack
  targetMode: text("target_mode").notNull(), // library_card | cover | comic | cyoa | visual_novel
  assetName: text("asset_name").notNull(),
  assetRole: text("asset_role"), // character | background | panel | overlay | cutscene | prop
  status: text("status").notNull().default("pending"), // pending | imported | failed
  manifest: jsonb("manifest"), // Full manifest JSON
  files: jsonb("files"), // Array of file objects
  errorMessage: text("error_message"),
  tags: text("tags").array(),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  importedAt: timestamp("imported_at"),
});

export const insertAssetImportSchema = createInsertSchema(assetImports).omit({
  id: true,
  createdAt: true,
  importedAt: true,
});

export type InsertAssetImport = z.infer<typeof insertAssetImportSchema>;
export type AssetImport = typeof assetImports.$inferSelect;

// Import manifest schema for validation
export const importManifestSchema = z.object({
  schema_version: z.string().default("1.0"),
  source_app: z.enum(["iClone", "CharacterCreator", "CartoonAnimator", "ComfyUI", "Unknown"]),
  source_app_version: z.string().optional(),
  export_type: z.enum(["render", "image", "image_sequence", "video", "asset_pack"]),
  target_mode: z.enum(["library_card", "cover", "comic", "cyoa", "visual_novel"]),
  project_slug: z.string().optional(),
  asset_name: z.string(),
  style: z.string().optional(),
  created_at: z.string().optional(),
  files: z.array(z.object({
    role: z.enum(["beauty", "alpha", "depth", "normal", "mask", "frames", "video", "thumb", "project"]),
    path: z.string(),
  })),
  tags: z.array(z.string()).optional(),
  fps: z.number().optional(),
  prompt: z.string().optional(),
  workflow_path: z.string().optional(),
});

export type ImportManifest = z.infer<typeof importManifestSchema>;

// ============================================
// ANNOUNCEMENTS / EVENTS (Carousel Banners)
// ============================================

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkText: text("link_text"),
  eventType: text("event_type").notNull().default("announcement"), // announcement | event | contest | release | featured
  isFeatured: boolean("is_featured").default(false), // Admin-created Press Start events
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// ============================================
// PLATFORM MONETIZATION & GATING SYSTEM
// ============================================

// Feature Flags - Kill switches and feature toggles
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // e.g., "early_adopter_gate", "payments_enabled"
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  metadata: jsonb("metadata"), // Additional config data
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// User Subscriptions & Tiers
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  tier: text("tier").notNull().default("free"), // free | creator | pro | studio | lifetime
  status: text("status").notNull().default("active"), // active | canceled | past_due | trialing
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  appSumoCodeId: varchar("appsumo_code_id"), // If redeemed via AppSumo
  entitlements: jsonb("entitlements"), // { export: true, commercial: true, ai: true, batch: true }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Early Adopter Waitlist
export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Linked if registered
  status: text("status").notNull().default("pending"), // pending | approved | active | blocked
  source: text("source"), // organic | referral | appsumo | partner
  referredBy: varchar("referred_by").references(() => users.id),
  inviteCode: text("invite_code"), // Code used to join
  notes: text("notes"), // Admin notes
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// Invite Codes
export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("standard"), // standard | vip | partner | appsumo
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"), // Additional code config
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;

// Invite Code Redemptions
export const inviteRedemptions = pgTable("invite_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codeId: varchar("code_id").notNull().references(() => inviteCodes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});

export const insertInviteRedemptionSchema = createInsertSchema(inviteRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export type InsertInviteRedemption = z.infer<typeof insertInviteRedemptionSchema>;
export type InviteRedemption = typeof inviteRedemptions.$inferSelect;

// AppSumo Codes
export const appSumoCodes = pgTable("appsumo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  tier: text("tier").notNull().default("lifetime"), // lifetime | pro_lifetime | studio_lifetime
  status: text("status").notNull().default("unused"), // unused | redeemed | expired | revoked
  redeemedBy: varchar("redeemed_by").references(() => users.id),
  redeemedAt: timestamp("redeemed_at"),
  purchaseEmail: text("purchase_email"), // AppSumo buyer email
  orderId: text("order_id"), // AppSumo order reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppSumoCodeSchema = createInsertSchema(appSumoCodes).omit({
  id: true,
  createdAt: true,
  redeemedAt: true,
});

export type InsertAppSumoCode = z.infer<typeof insertAppSumoCodeSchema>;
export type AppSumoCode = typeof appSumoCodes.$inferSelect;

// Job Queue - Async operations
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // export | render | ai_generate | batch_process
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  priority: integer("priority").notNull().default(0), // Higher = more urgent
  payload: jsonb("payload").notNull(), // Job-specific data
  result: jsonb("result"), // Output data / download URL
  errorMessage: text("error_message"),
  progress: integer("progress").default(0), // 0-100
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  status: true,
  progress: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Platform Settings - Global config
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// Admin Activity Log
export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // approve_user | toggle_flag | generate_code | etc
  targetType: text("target_type"), // user | feature_flag | invite_code | etc
  targetId: varchar("target_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;

// Content Reports - For moderation of inappropriate content
export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // post | comment | project | user
  contentId: varchar("content_id").notNull(),
  reason: text("reason").notNull(), // spam | harassment | inappropriate | copyright | other
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending | reviewed | resolved | dismissed
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolution: text("resolution"), // removed | warned | banned | no_action
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentReportSchema = createInsertSchema(contentReports).omit({
  id: true,
  status: true,
  resolvedBy: true,
  resolution: true,
  resolvedAt: true,
  createdAt: true,
});

export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ContentReport = typeof contentReports.$inferSelect;

// Marketplace Listings - creators list published content for sale
export const marketplaceListings = pgTable("marketplace_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // comic | card | vn | cyoa | cover | motion | asset_pack
  priceInCents: integer("price_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  previewImages: jsonb("preview_images").default([]), // string[] of image URLs
  thumbnail: text("thumbnail"),
  tags: jsonb("tags").default([]), // string[]
  contentRating: text("content_rating").notNull().default("everyone"), // everyone | teen | mature
  status: text("status").notNull().default("active"), // active | paused | sold_out | removed
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  downloadData: jsonb("download_data"), // { type, projectData, assets } - the purchasable content
  salesCount: integer("sales_count").default(0),
  totalEarnings: integer("total_earnings").default(0), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({
  id: true,
  salesCount: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;

// Marketplace Orders - tracks purchases
export const marketplaceOrders = pgTable("marketplace_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: varchar("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountInCents: integer("amount_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"), // pending | completed | refunded | failed
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertMarketplaceOrderSchema = createInsertSchema(marketplaceOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertMarketplaceOrder = z.infer<typeof insertMarketplaceOrderSchema>;
export type MarketplaceOrder = typeof marketplaceOrders.$inferSelect;

// Usage Tracking table - daily/monthly counters for tier-based limits
export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // ai_generation | export
  periodType: text("period_type").notNull(), // daily | monthly
  periodKey: text("period_key").notNull(), // YYYY-MM-DD or YYYY-MM
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
  updatedAt: true,
});

export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;

// Tier Entitlements Definition
export const tierEntitlements = {
  free: {
    export: true,
    commercial: false,
    ai: true,
    batch: false,
    maxProjects: 3,
    maxStorage: 100, // MB
    aiGenerationsPerDay: 3,
    exportsPerMonth: 2,
  },
  creator: {
    export: true,
    commercial: false,
    ai: true,
    batch: false,
    maxProjects: 20,
    maxStorage: 1000,
    aiGenerationsPerDay: 50,
    exportsPerMonth: 30,
  },
  pro: {
    export: true,
    commercial: true,
    ai: true,
    batch: true,
    maxProjects: 100,
    maxStorage: 5000,
    aiGenerationsPerDay: 200,
    exportsPerMonth: -1,
  },
  studio: {
    export: true,
    commercial: true,
    ai: true,
    batch: true,
    maxProjects: -1, // Unlimited
    maxStorage: 20000,
    aiGenerationsPerDay: -1,
    exportsPerMonth: -1,
  },
  lifetime: {
    export: true,
    commercial: true,
    ai: true,
    batch: true,
    maxProjects: -1,
    maxStorage: 50000,
    aiGenerationsPerDay: -1,
    exportsPerMonth: -1,
  },
} as const;

export type TierName = keyof typeof tierEntitlements;

export const marketplaceReviews = pgTable("marketplace_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarketplaceReviewSchema = createInsertSchema(marketplaceReviews).omit({
  id: true,
  createdAt: true,
  verifiedPurchase: true,
});

export type InsertMarketplaceReview = z.infer<typeof insertMarketplaceReviewSchema>;
export type MarketplaceReview = typeof marketplaceReviews.$inferSelect;

export const creatorAnalytics = pgTable("creator_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

export const ssoConfigs = pgTable("sso_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: text("organization_name").notNull(),
  domain: text("domain").notNull().unique(),
  provider: text("provider").notNull().default("saml"),
  idpEntityId: text("idp_entity_id"),
  idpSsoUrl: text("idp_sso_url"),
  idpCertificate: text("idp_certificate"),
  spEntityId: text("sp_entity_id"),
  enabled: boolean("enabled").notNull().default(false),
  autoProvision: boolean("auto_provision").notNull().default(true),
  defaultRole: text("default_role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SsoConfig = typeof ssoConfigs.$inferSelect;

export const classroomAssignments = pgTable("classroom_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  projectType: text("project_type").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("active"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ClassroomAssignment = typeof classroomAssignments.$inferSelect;

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => classroomAssignments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").notNull().default("pending"),
  feedback: text("feedback"),
  grade: text("grade"),
  submittedAt: timestamp("submitted_at"),
  gradedAt: timestamp("graded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;

// Comic Comments - comments on community comics
export const comicComments = pgTable("comic_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  comicId: varchar("comic_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComicCommentSchema = createInsertSchema(comicComments).omit({
  id: true,
  createdAt: true,
});

export type InsertComicComment = z.infer<typeof insertComicCommentSchema>;
export type ComicComment = typeof comicComments.$inferSelect;

// Comic Bookmarks - reader progress tracking
export const comicBookmarks = pgTable("comic_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  lastSpreadIndex: integer("last_spread_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertComicBookmarkSchema = createInsertSchema(comicBookmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComicBookmark = z.infer<typeof insertComicBookmarkSchema>;
export type ComicBookmark = typeof comicBookmarks.$inferSelect;

// Comic Series - group comics into series
export const comicSeries = pgTable("comic_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertComicSeriesSchema = createInsertSchema(comicSeries).omit({
  id: true,
  featured: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComicSeries = z.infer<typeof insertComicSeriesSchema>;
export type ComicSeriesType = typeof comicSeries.$inferSelect;

export const seriesSubscriptions = pgTable("series_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesId: varchar("series_id").notNull().references(() => comicSeries.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SeriesSubscription = typeof seriesSubscriptions.$inferSelect;

export const printQuoteRequests = pgTable("print_quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  organization: text("organization"),
  accountType: text("account_type").notNull(),
  productType: text("product_type").notNull(),
  quantity: integer("quantity"),
  size: text("size"),
  deadline: text("deadline"),
  notes: text("notes"),
  artworkUrl: text("artwork_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrintQuoteRequestSchema = createInsertSchema(printQuoteRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertPrintQuoteRequest = z.infer<typeof insertPrintQuoteRequestSchema>;
export type PrintQuoteRequest = typeof printQuoteRequests.$inferSelect;

export const tosAcceptances = pgTable("tos_acceptances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  format: text("format").notNull(),
  status: text("status").notNull().default("queued"),
  fileUrl: text("file_url"),
  metadata: jsonb("metadata"),
  destinations: jsonb("destinations"),
  retryCount: integer("retry_count").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type ExportJob = typeof exportJobs.$inferSelect;

export const webhookDeliveryLog = pgTable("webhook_delivery_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  targetUrl: text("target_url").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  responseCode: integer("response_code"),
  retryCount: integer("retry_count").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
});

export type WebhookDeliveryLog = typeof webhookDeliveryLog.$inferSelect;

export const exportedFiles = pgTable("exported_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export type ExportedFile = typeof exportedFiles.$inferSelect;

export const imageHashes = pgTable("image_hashes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hash: text("hash").notNull(),
  source: text("source").notNull().default("upload"),
  status: text("status").notNull().default("allowed"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  assetId: varchar("asset_id"),
  flaggedReason: text("flagged_reason"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ImageHash = typeof imageHashes.$inferSelect;

export const blockedHashes = pgTable("blocked_hashes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hash: text("hash").notNull().unique(),
  reason: text("reason").notNull(),
  addedBy: varchar("added_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BlockedHash = typeof blockedHashes.$inferSelect;

// User-to-user blocking (Apple App Store Guideline 1.2 — ability to block
// abusive users in UGC apps). Separate from `blockedHashes` which is admin
// hash-blocking for prohibited imagery.
export const userBlocks = pgTable("user_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: varchar("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqPair: uniqueIndex("user_blocks_blocker_blocked_uniq").on(t.blockerId, t.blockedId),
}));

export type UserBlock = typeof userBlocks.$inferSelect;
export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({ id: true, createdAt: true });
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;

// ============================================
// PROGRESSION SYSTEM
// ============================================

export const levelThresholds = pgTable("level_thresholds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: integer("level").notNull().unique(),
  xpRequired: integer("xp_required").notNull(),
  title: text("title"),
  rewardId: varchar("reward_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LevelThreshold = typeof levelThresholds.$inferSelect;

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  category: text("category").notNull(), // onboarding, creation, streak, membership, collection, community
  rarity: text("rarity").notNull().default("common"), // common, uncommon, rare, epic, legendary
  ruleType: text("rule_type").notNull(), // count, threshold, flag, tier
  ruleConfig: jsonb("rule_config").notNull(), // { action: "project_created", count: 5 }
  xpReward: integer("xp_reward").default(0),
  rewardId: varchar("reward_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  progressValue: integer("progress_value").default(0),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
});

export type UserAchievement = typeof userAchievements.$inferSelect;

export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  rewardType: text("reward_type").notNull(), // content_pack, ai_credits, badge, title, template
  rewardValue: jsonb("reward_value").notNull(), // { packKey: "starter_fx", credits: 25 }
  unlockType: text("unlock_type").notNull(), // level, achievement, tier, xp_total
  unlockConfig: jsonb("unlock_config").notNull(), // { level: 5 } or { achievementKey: "pack_hunter" }
  isClaimable: boolean("is_claimable").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;

export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardId: varchar("reward_id").notNull().references(() => rewards.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
  status: text("status").notNull().default("unlocked"), // unlocked, claimed, expired
});

export type UserReward = typeof userRewards.$inferSelect;

export const contentPacks = pgTable("content_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  packType: text("pack_type").notNull(), // fx, frames, characters, backgrounds, overlays, templates
  tierRequired: text("tier_required"), // null = free, or creator/pro/studio
  isXpUnlockable: boolean("is_xp_unlockable").default(false),
  thumbnail: text("thumbnail"),
  assets: jsonb("assets"), // array of asset URLs/data
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentPackSchema = createInsertSchema(contentPacks).omit({ id: true, createdAt: true });
export type InsertContentPack = z.infer<typeof insertContentPackSchema>;
export type ContentPack = typeof contentPacks.$inferSelect;

export const userEntitlements = pgTable("user_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entitlementType: text("entitlement_type").notNull(), // content_pack, ai_credits, feature
  entitlementKey: text("entitlement_key").notNull(),
  sourceType: text("source_type").notNull(), // subscription, reward, achievement, admin, founder
  sourceReferenceId: varchar("source_reference_id"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export type UserEntitlement = typeof userEntitlements.$inferSelect;

export const progressionNotifications = pgTable("progression_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // level_up, achievement, reward, streak
  title: text("title").notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false),
  referenceType: text("reference_type"),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProgressionNotification = typeof progressionNotifications.$inferSelect;

export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  requiredXp: integer("required_xp").notNull().default(0),
  requiredLevel: integer("required_level").notNull().default(0),
  requiredPublished: integer("required_published").notNull().default(0),
  requiredProjectTypes: text("required_project_types").array().notNull().default(sql`'{}'`),
  requiredProjectCount: integer("required_project_count").notNull().default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Certification = typeof certifications.$inferSelect;

export const userCertifications = pgTable("user_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  certificationId: varchar("certification_id").notNull().references(() => certifications.id, { onDelete: "cascade" }),
  verificationCode: varchar("verification_code").notNull().unique(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  portfolioSnapshot: jsonb("portfolio_snapshot"),
});

export type UserCertification = typeof userCertifications.$inferSelect;

export const tierEntitlementsSchool = {
  school: {
    export: true,
    commercial: false,
    ai: true,
    batch: true,
    maxProjects: -1,
    maxStorage: 50000,
    aiGenerationsPerDay: 500,
    exportsPerMonth: -1,
  },
} as const;

export const platformEvents = pgTable("platform_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category").notNull(),
  metadata: jsonb("metadata"),
  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlatformEventSchema = createInsertSchema(platformEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertPlatformEvent = z.infer<typeof insertPlatformEventSchema>;
export type PlatformEvent = typeof platformEvents.$inferSelect;

export const printProductReviews = pgTable("print_product_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  reviewText: text("review_text"),
  verifiedOrder: boolean("verified_order").notNull().default(false),
  quoteRequestId: varchar("quote_request_id").references(() => printQuoteRequests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrintProductReviewSchema = createInsertSchema(printProductReviews).omit({
  id: true,
  createdAt: true,
  verifiedOrder: true,
});

export type InsertPrintProductReview = z.infer<typeof insertPrintProductReviewSchema>;
export type PrintProductReview = typeof printProductReviews.$inferSelect;

// ==========================================
// ECOSYSTEM: XP Event Ledger
// ==========================================
export const xpEvents = pgTable("xp_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  category: text("category").notNull(),
  xpAmount: integer("xp_amount").notNull(),
  source: text("source").notNull().default("comixx"),
  sourceApp: text("source_app").notNull().default("comixx"),
  toolUsed: text("tool_used"),
  projectId: varchar("project_id"),
  eventKey: text("event_key"),
  metadata: jsonb("metadata"),
  deduplicationHash: text("deduplication_hash"),
  cooldownGroup: text("cooldown_group"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertXpEventSchema = createInsertSchema(xpEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertXpEvent = z.infer<typeof insertXpEventSchema>;
export type XpEvent = typeof xpEvents.$inferSelect;

// ==========================================
// ECOSYSTEM: XP Balances (per source/tool rollups)
// ==========================================
export const xpBalances = pgTable("xp_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  toolUsed: text("tool_used"),
  totalXp: integer("total_xp").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertXpBalanceSchema = createInsertSchema(xpBalances).omit({
  id: true,
});
export type InsertXpBalance = z.infer<typeof insertXpBalanceSchema>;
export type XpBalance = typeof xpBalances.$inferSelect;

// ==========================================
// ECOSYSTEM: Skill Tags / Taxonomy
// ==========================================
export const skillTags = pgTable("skill_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  partnerDefined: boolean("partner_defined").default(false),
  partnerId: varchar("partner_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSkillTagSchema = createInsertSchema(skillTags).omit({
  id: true,
  createdAt: true,
});
export type InsertSkillTag = z.infer<typeof insertSkillTagSchema>;
export type SkillTag = typeof skillTags.$inferSelect;

// ==========================================
// ECOSYSTEM: Competencies
// ==========================================
export const competencies = pgTable("competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillTagId: varchar("skill_tag_id").notNull().references(() => skillTags.id, { onDelete: "cascade" }),
  level: integer("level").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at"),
  evidence: jsonb("evidence"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompetencySchema = createInsertSchema(competencies).omit({
  id: true,
  updatedAt: true,
});
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type Competency = typeof competencies.$inferSelect;

// ==========================================
// ECOSYSTEM: Skill Passport Entries
// ==========================================
export const passportEntries = pgTable("passport_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryType: text("entry_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source").notNull(),
  sourceApp: text("source_app"),
  skillTags: jsonb("skill_tags"),
  evidence: jsonb("evidence"),
  mentorApproved: boolean("mentor_approved").default(false),
  mentorId: varchar("mentor_id"),
  mentorApprovedAt: timestamp("mentor_approved_at"),
  xpAwarded: integer("xp_awarded").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPassportEntrySchema = createInsertSchema(passportEntries).omit({
  id: true,
  createdAt: true,
});
export type InsertPassportEntry = z.infer<typeof insertPassportEntrySchema>;
export type PassportEntry = typeof passportEntries.$inferSelect;

// ==========================================
// ECOSYSTEM: External Tools Registry
// ==========================================
export const externalTools = pgTable("external_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  description: text("description"),
  skillCategories: jsonb("skill_categories"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExternalToolSchema = createInsertSchema(externalTools).omit({
  id: true,
  createdAt: true,
});
export type InsertExternalTool = z.infer<typeof insertExternalToolSchema>;
export type ExternalTool = typeof externalTools.$inferSelect;

// ==========================================
// ECOSYSTEM: External Submissions
// ==========================================
export const externalSubmissions = pgTable("external_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toolId: varchar("tool_id").references(() => externalTools.id, { onDelete: "set null" }),
  toolName: text("tool_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  sourceToolVersion: text("source_tool_version"),
  skillTags: jsonb("skill_tags"),
  projectId: varchar("project_id"),
  status: text("status").notNull().default("submitted"),
  reviewerId: varchar("reviewer_id"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  xpAwarded: integer("xp_awarded").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExternalSubmissionSchema = createInsertSchema(externalSubmissions).omit({
  id: true,
  createdAt: true,
});
export type InsertExternalSubmission = z.infer<typeof insertExternalSubmissionSchema>;
export type ExternalSubmission = typeof externalSubmissions.$inferSelect;

// ==========================================
// ECOSYSTEM: Role Eligibility Rules
// ==========================================
export const roleEligibilityRules = pgTable("role_eligibility_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleName: text("role_name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  minXp: integer("min_xp").notNull().default(0),
  minLevel: integer("min_level").notNull().default(0),
  requiredPathways: jsonb("required_pathways"),
  requiredApprovedProjects: integer("required_approved_projects").default(0),
  requiredMentorApproval: boolean("required_mentor_approval").default(false),
  requiredConductScore: integer("required_conduct_score").default(70),
  requiredReliabilityScore: integer("required_reliability_score").default(70),
  additionalRules: jsonb("additional_rules"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRoleEligibilityRuleSchema = createInsertSchema(roleEligibilityRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRoleEligibilityRule = z.infer<typeof insertRoleEligibilityRuleSchema>;
export type RoleEligibilityRule = typeof roleEligibilityRules.$inferSelect;

// ==========================================
// ECOSYSTEM: Apprenticeship Tracks
// ==========================================
export const apprenticeshipTracks = pgTable("apprenticeship_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  department: text("department"),
  skillRequirements: jsonb("skill_requirements"),
  minXp: integer("min_xp").default(0),
  minLevel: integer("min_level").default(0),
  maxSlots: integer("max_slots").default(5),
  currentSlots: integer("current_slots").default(0),
  status: text("status").notNull().default("active"),
  mentorIds: jsonb("mentor_ids"),
  duration: text("duration"),
  isPaid: boolean("is_paid").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApprenticeshipTrackSchema = createInsertSchema(apprenticeshipTracks).omit({
  id: true,
  createdAt: true,
});
export type InsertApprenticeshipTrack = z.infer<typeof insertApprenticeshipTrackSchema>;
export type ApprenticeshipTrack = typeof apprenticeshipTracks.$inferSelect;

// ==========================================
// ECOSYSTEM: Apprenticeship Applications
// ==========================================
export const apprenticeshipApplications = pgTable("apprenticeship_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trackId: varchar("track_id").notNull().references(() => apprenticeshipTracks.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("submitted"),
  applicationNote: text("application_note"),
  portfolioLinks: jsonb("portfolio_links"),
  reviewerId: varchar("reviewer_id"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  xpAtApplication: integer("xp_at_application").default(0),
  levelAtApplication: integer("level_at_application").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApprenticeshipApplicationSchema = createInsertSchema(apprenticeshipApplications).omit({
  id: true,
  createdAt: true,
});
export type InsertApprenticeshipApplication = z.infer<typeof insertApprenticeshipApplicationSchema>;
export type ApprenticeshipApplication = typeof apprenticeshipApplications.$inferSelect;

// ==========================================
// ECOSYSTEM: Production Roles (MMM)
// ==========================================
export const productionRoles = pgTable("production_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleName: text("role_name").notNull(),
  department: text("department"),
  projectName: text("project_name"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  creditType: text("credit_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductionRoleSchema = createInsertSchema(productionRoles).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionRole = z.infer<typeof insertProductionRoleSchema>;
export type ProductionRole = typeof productionRoles.$inferSelect;

// ==========================================
// ECOSYSTEM: Mentor Reviews
// ==========================================
export const mentorReviews = pgTable("mentor_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: varchar("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewType: text("review_type").notNull(),
  targetId: varchar("target_id"),
  targetType: text("target_type"),
  status: text("status").notNull().default("pending"),
  rating: integer("rating"),
  feedback: text("feedback"),
  approved: boolean("approved"),
  xpAwarded: integer("xp_awarded").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMentorReviewSchema = createInsertSchema(mentorReviews).omit({
  id: true,
  createdAt: true,
});
export type InsertMentorReview = z.infer<typeof insertMentorReviewSchema>;
export type MentorReview = typeof mentorReviews.$inferSelect;

// ==========================================
// ECOSYSTEM: Bug Reports (Universal)
// ==========================================
export const bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  app: text("app").notNull().default("comixx"),
  category: text("category").notNull().default("bug"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  screenshotUrls: jsonb("screenshot_urls"),
  contextData: jsonb("context_data"),
  projectId: varchar("project_id"),
  userRole: text("user_role"),
  severity: text("severity").default("medium"),
  status: text("status").notNull().default("submitted"),
  assignedTo: varchar("assigned_to"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  createdAt: true,
});
export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

// ==========================================
// ECOSYSTEM: Creator Channels
// ==========================================
export const creatorChannels = pgTable("creator_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  avatarUrl: text("avatar_url"),
  followerCount: integer("follower_count").default(0),
  totalViews: integer("total_views").default(0),
  featured: boolean("featured").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreatorChannelSchema = createInsertSchema(creatorChannels).omit({
  id: true,
  createdAt: true,
});
export type InsertCreatorChannel = z.infer<typeof insertCreatorChannelSchema>;
export type CreatorChannel = typeof creatorChannels.$inferSelect;

// ==========================================
// ECOSYSTEM: School Stations
// ==========================================
export const schoolStations = pgTable("school_stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  contentPolicy: text("content_policy"),
  moderatorIds: jsonb("moderator_ids"),
  active: boolean("active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchoolStationSchema = createInsertSchema(schoolStations).omit({
  id: true,
  createdAt: true,
});
export type InsertSchoolStation = z.infer<typeof insertSchoolStationSchema>;
export type SchoolStation = typeof schoolStations.$inferSelect;

// ==========================================
// ECOSYSTEM: Pathways (Curriculum Tracks)
// ==========================================
export const pathways = pgTable("pathways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  difficulty: text("difficulty").default("beginner"),
  estimatedHours: integer("estimated_hours"),
  toolsRequired: jsonb("tools_required"),
  skillTags: jsonb("skill_tags"),
  xpReward: integer("xp_reward").default(0),
  badgeId: varchar("badge_id"),
  lessonCount: integer("lesson_count").default(0),
  sortOrder: integer("sort_order").default(0),
  published: boolean("published").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPathwaySchema = createInsertSchema(pathways).omit({
  id: true,
  createdAt: true,
});
export type InsertPathway = z.infer<typeof insertPathwaySchema>;
export type Pathway = typeof pathways.$inferSelect;

// ==========================================
// ECOSYSTEM: User Pathway Progress
// ==========================================
export const userPathwayProgress = pgTable("user_pathway_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pathwayId: varchar("pathway_id").notNull().references(() => pathways.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("enrolled"),
  completedLessons: jsonb("completed_lessons"),
  currentLessonId: varchar("current_lesson_id"),
  xpEarned: integer("xp_earned").default(0),
  percentComplete: integer("percent_complete").default(0),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserPathwayProgressSchema = createInsertSchema(userPathwayProgress).omit({
  id: true,
  enrolledAt: true,
});
export type InsertUserPathwayProgress = z.infer<typeof insertUserPathwayProgressSchema>;
export type UserPathwayProgress = typeof userPathwayProgress.$inferSelect;

// ==========================================
// ECOSYSTEM: Workforce Ladder Constants
// ==========================================
export const ECOSYSTEM_ROLES = [
  "learner",
  "creator",
  "mentor_eligible",
  "mentor",
  "apprentice_eligible",
  "apprentice",
  "paid_apprentice_eligible",
  "paid_apprentice",
  "contributor",
  "specialist",
  "lead",
] as const;

export type EcosystemRole = typeof ECOSYSTEM_ROLES[number];

export const XP_ACTIONS = {
  PROJECT_CREATE: { action: "project_create", category: "creation", xp: 25, cooldownSeconds: 60 },
  PROJECT_SAVE: { action: "project_save", category: "creation", xp: 5, cooldownSeconds: 300 },
  PROJECT_EXPORT: { action: "project_export", category: "creation", xp: 15, cooldownSeconds: 120 },
  PROJECT_PUBLISH: { action: "project_publish", category: "publishing", xp: 100, cooldownSeconds: 600 },
  LESSON_COMPLETE: { action: "lesson_complete", category: "learning", xp: 50, cooldownSeconds: 0 },
  PATHWAY_COMPLETE: { action: "pathway_complete", category: "learning", xp: 500, cooldownSeconds: 0 },
  CHALLENGE_COMPLETE: { action: "challenge_complete", category: "achievement", xp: 75, cooldownSeconds: 0 },
  MENTOR_VALIDATION: { action: "mentor_validation", category: "validation", xp: 200, cooldownSeconds: 0 },
  EDIT_SESSION: { action: "edit_session", category: "creation", xp: 2, cooldownSeconds: 60 },
  DAILY_LOGIN: { action: "daily_login", category: "engagement", xp: 10, cooldownSeconds: 86400 },
  FEATURED_PUBLICATION: { action: "featured_publication", category: "publishing", xp: 250, cooldownSeconds: 0 },
  EXTERNAL_TOOL_SUBMISSION: { action: "external_tool_submission", category: "creation", xp: 30, cooldownSeconds: 120 },
  STREAMING_MILESTONE: { action: "streaming_milestone", category: "engagement", xp: 50, cooldownSeconds: 0 },
  PRODUCTION_CREDIT: { action: "production_credit", category: "workforce", xp: 300, cooldownSeconds: 0 },
} as const;

export const DEFAULT_ROLE_ELIGIBILITY = [
  { roleName: "creator", minXp: 100, minLevel: 2, requiredApprovedProjects: 0, description: "Active creator status" },
  { roleName: "mentor_eligible", minXp: 2000, minLevel: 10, requiredApprovedProjects: 5, description: "Eligible to become a mentor" },
  { roleName: "apprentice_eligible", minXp: 5000, minLevel: 15, requiredApprovedProjects: 10, description: "Eligible for apprenticeship" },
  { roleName: "paid_apprentice_eligible", minXp: 10000, minLevel: 20, requiredApprovedProjects: 15, description: "Eligible for paid apprenticeship" },
  { roleName: "contributor", minXp: 20000, minLevel: 25, requiredApprovedProjects: 20, description: "Full contributor/specialist status" },
] as const;

// ==========================================
// CROSS-PLATFORM SYNC QUEUE
// ==========================================
export const syncQueue = pgTable("sync_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceApp: text("source_app").notNull().default("comixx"),
  targetApp: text("target_app").notNull(),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  projectId: varchar("project_id"),
  payload: jsonb("payload"),
  status: text("status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  nextRetryAt: timestamp("next_retry_at"),
  lastError: text("last_error"),
  targetUrl: text("target_url"),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSyncQueueSchema = createInsertSchema(syncQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSyncQueue = z.infer<typeof insertSyncQueueSchema>;
export type SyncQueueItem = typeof syncQueue.$inferSelect;

// ==========================================
// SYNC LOGS (detailed event log)
// ==========================================
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncQueueId: varchar("sync_queue_id").references(() => syncQueue.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;

// ==========================================
// SSO AUDIT LOG
// ==========================================
export const ssoAuditLog = pgTable("sso_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  userId: varchar("user_id"),
  email: text("email"),
  sourceApp: text("source_app"),
  targetApp: text("target_app"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  errorCode: text("error_code"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  tokenId: text("token_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SSOAuditLog = typeof ssoAuditLog.$inferSelect;

export const SYNC_STATUSES = ["pending", "processing", "completed", "failed", "retrying", "dead_letter"] as const;
export type SyncStatus = typeof SYNC_STATUSES[number];

export const ECOSYSTEM_APPS = ["comixx", "fxstudio", "streaming", "lms", "unreal", "reallusion", "maxon", "ai_tools"] as const;
export type EcosystemApp = typeof ECOSYSTEM_APPS[number];

export const SYNC_EVENT_TYPES = [
  "project_publish",
  "project_update",
  "profile_sync",
  "asset_sync",
  "xp_broadcast",
  "fx_asset_return",
  "content_bundle",
  "user_metadata_sync",
  "external_tool_sync",
] as const;
export type SyncEventType = typeof SYNC_EVENT_TYPES[number];

// ==========================================
// SCHOOL-SAFE POLICY ENGINE
// ==========================================

export const POLICY_SCOPES = ["district", "school", "classroom", "user"] as const;
export type PolicyScope = typeof POLICY_SCOPES[number];

export const schoolSafePolicies = pgTable("school_safe_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scope: text("scope").notNull(),
  scopeId: varchar("scope_id").notNull(),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }),
  parentPolicyId: varchar("parent_policy_id"),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  messagingAllowed: boolean("messaging_allowed").default(false),
  matureContentAllowed: boolean("mature_content_allowed").default(false),
  marketplaceAllowed: boolean("marketplace_allowed").default(false),
  externalPublishingAllowed: boolean("external_publishing_allowed").default(false),
  publicProfileAllowed: boolean("public_profile_allowed").default(false),
  remixCollabAllowed: boolean("remix_collab_allowed").default(true),
  moderatedPublishing: boolean("moderated_publishing").default(true),
  externalContactAllowed: boolean("external_contact_allowed").default(false),
  allowedContentCategories: jsonb("allowed_content_categories"),
  allowedAssetPacks: jsonb("allowed_asset_packs"),
  allowedTemplates: jsonb("allowed_templates"),
  customRules: jsonb("custom_rules"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSchoolSafePolicySchema = createInsertSchema(schoolSafePolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSchoolSafePolicy = z.infer<typeof insertSchoolSafePolicySchema>;
export type SchoolSafePolicy = typeof schoolSafePolicies.$inferSelect;

export const districts = pgTable("districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  contactEmail: text("contact_email"),
  state: text("state"),
  country: text("country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDistrictSchema = createInsertSchema(districts).omit({
  id: true,
  createdAt: true,
});
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districts.$inferSelect;

export const classrooms = pgTable("classrooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  gradeLevel: text("grade_level"),
  subject: text("subject"),
  joinCode: varchar("join_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClassroomSchema = createInsertSchema(classrooms).omit({
  id: true,
  createdAt: true,
});
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type Classroom = typeof classrooms.$inferSelect;

export const classroomMemberships = pgTable("classroom_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classroomId: varchar("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("student"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const policyAuditLog = pgTable("policy_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id"),
  action: text("action").notNull(),
  actorId: varchar("actor_id").references(() => users.id),
  targetUserId: varchar("target_user_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// WORKFORCE PIPELINE + SKILL PASSPORT
// ==========================================

export const WORKFORCE_SIGNAL_TYPES = [
  "project_completed", "project_published", "assignment_completed",
  "challenge_completed", "certification_earned", "teacher_validation",
  "team_participation", "deadline_met", "revision_completed",
  "client_project", "internship_milestone", "apprenticeship_milestone",
  "paid_work", "mentorship_given", "portfolio_addition",
] as const;
export type WorkforceSignalType = typeof WORKFORCE_SIGNAL_TYPES[number];

export const READINESS_TIERS = [
  "exploring", "developing", "proficient", "advanced", "professional",
] as const;
export type ReadinessTier = typeof READINESS_TIERS[number];

export const workforceSignals = pgTable("workforce_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  signalType: text("signal_type").notNull(),
  projectId: varchar("project_id"),
  projectType: text("project_type"),
  toolsUsed: jsonb("tools_used"),
  independenceLevel: text("independence_level"),
  revisionCycles: integer("revision_cycles").default(0),
  deadlineMet: boolean("deadline_met"),
  teacherReviewed: boolean("teacher_reviewed").default(false),
  teacherReviewerId: varchar("teacher_reviewer_id"),
  paidWork: boolean("paid_work").default(false),
  teamSize: integer("team_size").default(1),
  skillCategories: jsonb("skill_categories"),
  sourceApp: text("source_app").default("comixx"),
  verificationLevel: text("verification_level").default("self_reported"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkforceSignalSchema = createInsertSchema(workforceSignals).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkforceSignal = z.infer<typeof insertWorkforceSignalSchema>;
export type WorkforceSignal = typeof workforceSignals.$inferSelect;

export const workforceProfiles = pgTable("workforce_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  readinessTier: text("readiness_tier").notNull().default("exploring"),
  contractReady: boolean("contract_ready").default(false),
  mmmCreatorEligible: boolean("mmm_creator_eligible").default(false),
  partnerReady: boolean("partner_ready").default(false),
  internshipReady: boolean("internship_ready").default(false),
  apprenticeshipReady: boolean("apprenticeship_ready").default(false),
  totalProjects: integer("total_projects").default(0),
  publishedProjects: integer("published_projects").default(0),
  teacherEndorsements: integer("teacher_endorsements").default(0),
  adminEndorsements: integer("admin_endorsements").default(0),
  deadlinesMet: integer("deadlines_met").default(0),
  deadlinesMissed: integer("deadlines_missed").default(0),
  revisionCyclesTotal: integer("revision_cycles_total").default(0),
  paidProjectsCompleted: integer("paid_projects_completed").default(0),
  teamProjectsCompleted: integer("team_projects_completed").default(0),
  topSkills: jsonb("top_skills"),
  toolProficiency: jsonb("tool_proficiency"),
  lastComputedAt: timestamp("last_computed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WorkforceProfile = typeof workforceProfiles.$inferSelect;

export const workforceEndorsements = pgTable("workforce_endorsements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endorserId: varchar("endorser_id").notNull().references(() => users.id),
  endorserRole: text("endorser_role").notNull(),
  skillCategory: text("skill_category").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkforceEndorsementSchema = createInsertSchema(workforceEndorsements).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkforceEndorsement = z.infer<typeof insertWorkforceEndorsementSchema>;
export type WorkforceEndorsement = typeof workforceEndorsements.$inferSelect;

// ==========================================
// XP INGESTION RULES ENGINE
// ==========================================

export const XP_INGESTION_ACTIONS = ["auto_award", "hold_for_review", "deny", "translate_to_workforce"] as const;
export type XpIngestionAction = typeof XP_INGESTION_ACTIONS[number];

export const xpIngestionRules = pgTable("xp_ingestion_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceApp: text("source_app").notNull(),
  eventType: text("event_type").notNull(),
  action: text("action").notNull().default("auto_award"),
  xpMultiplier: integer("xp_multiplier").default(1),
  skillCategoryMapping: text("skill_category_mapping"),
  maxXpPerEvent: integer("max_xp_per_event").default(100),
  cooldownMinutes: integer("cooldown_minutes").default(0),
  requiresVerification: boolean("requires_verification").default(false),
  generateWorkforceSignal: boolean("generate_workforce_signal").default(false),
  workforceSignalType: text("workforce_signal_type"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertXpIngestionRuleSchema = createInsertSchema(xpIngestionRules).omit({
  id: true,
  createdAt: true,
});
export type InsertXpIngestionRule = z.infer<typeof insertXpIngestionRuleSchema>;
export type XpIngestionRule = typeof xpIngestionRules.$inferSelect;

export const XP_INGESTION_STATUSES = ["awarded", "held", "denied", "translated", "duplicate", "error"] as const;
export type XpIngestionStatus = typeof XP_INGESTION_STATUSES[number];

export const xpIngestionLog = pgTable("xp_ingestion_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceApp: text("source_app").notNull(),
  sourceUserId: text("source_user_id"),
  ecosystemUserId: varchar("ecosystem_user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  eventTimestamp: timestamp("event_timestamp"),
  ruleId: varchar("rule_id").references(() => xpIngestionRules.id),
  status: text("status").notNull(),
  xpAwarded: integer("xp_awarded").default(0),
  rawPayload: jsonb("raw_payload"),
  deduplicationKey: text("deduplication_key"),
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type XpIngestionLog = typeof xpIngestionLog.$inferSelect;

// ==========================================
// APP HANDOFF / LAUNCH TICKETS
// ==========================================

export const launchTickets = pgTable("launch_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceApp: text("source_app").notNull(),
  targetApp: text("target_app").notNull(),
  ticketToken: text("ticket_token").notNull().unique(),
  context: jsonb("context").notNull(),
  schoolSafePolicy: jsonb("school_safe_policy"),
  consumed: boolean("consumed").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
