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
