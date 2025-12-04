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
