import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorHandler, logInfo } from "./errorMonitor";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import crypto from "crypto";
import path from "path";
import { db } from "./db";
import { featureFlags, platformAssets } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { validateEnv } from "./envValidation";

async function seedFeatureFlags() {
  const defaults = [
    { key: 'ai_tools_enabled', enabled: true, description: 'Show/hide AI Tools (Prompt Factory, Story Forge, Import Center, FX Studio link)' },
    { key: 'appsumo_redemption', enabled: true, description: 'Allow AppSumo code redemption' },
    { key: 'community_enabled', enabled: true, description: 'Show/hide Community Library and Ecosystem sections' },
    { key: 'early_adopter_gate', enabled: false, description: 'Gate new signups behind waitlist/invite system' },
    { key: 'export_restrictions', enabled: false, description: 'Require subscription for exports' },
    { key: 'invite_system', enabled: true, description: 'Allow invite code usage' },
    { key: 'marketplace_enabled', enabled: true, description: 'Show/hide the Marketplace section in sidebar and across the app' },
    { key: 'motion_studio_enabled', enabled: true, description: 'Show/hide Motion Studio in Creator Tools' },
    { key: 'payments_enabled', enabled: true, description: 'Enable Stripe payment processing' },
    { key: 'print_studio_enabled', enabled: true, description: 'Show/hide the Print Studio section in sidebar' },
    { key: 'social_enabled', enabled: true, description: 'Show/hide Social features (feed, messaging, collabs, chains)' },
    { key: 'promo_pages_enabled', enabled: true, description: 'Show/hide Promo Page Studio in Comic Creator (school-safe in-comic ad/promo pages)' },
    { key: 'promo_sponsors_enabled', enabled: true, description: 'Allow sponsor-type promo templates (independent of promo_pages_enabled)' },
  ];

  try {
    for (const flag of defaults) {
      await db.insert(featureFlags).values(flag).onConflictDoNothing({ target: featureFlags.key });
    }
    await db.update(featureFlags).set({ enabled: false }).where(eq(featureFlags.key, 'early_adopter_gate'));
    console.log("[feature-flags] Seeded default feature flags");
  } catch (err) {
    console.error("[feature-flags] Failed to seed:", err);
  }
}

async function seedPlatformAssets() {
  const seeds: Array<{
    name: string;
    description: string;
    category: string;
    type: string;
    fileUrl: string;
    thumbnailUrl: string;
    tags: string[];
    priceInCents: number;
    isFree: boolean;
    sourceType: string;
    rightsClass: string;
    usageMode: string;
    downloadAllowed: boolean;
    publishAllowed: boolean;
    unlockType: string;
    schoolSafe: boolean;
    licenseNotes: string;
  }> = [
    // CHARACTERS — all free starter set
    { name: "Caped Hero", description: "Classic vintage superhero with flowing cape — drop-in character sprite for any comic.", category: "characters", type: "image", fileUrl: "/marketplace/char_caped_hero.png", thumbnailUrl: "/marketplace/char_caped_hero.png", tags: ["hero", "vintage", "comic", "cape"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Schoolgirl with Backpack", description: "Modern manga-style schoolgirl, perfect for slice-of-life and visual novels.", category: "characters", type: "image", fileUrl: "/marketplace/char_schoolgirl.png", thumbnailUrl: "/marketplace/char_schoolgirl.png", tags: ["schoolgirl", "manga", "modern", "vn"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Robot Mascot", description: "Friendly cyberpunk robot mascot with glowing cyan eyes — great as a sidekick or interface guide.", category: "characters", type: "image", fileUrl: "/marketplace/char_robot_mascot.png", thumbnailUrl: "/marketplace/char_robot_mascot.png", tags: ["robot", "mascot", "cyberpunk", "scifi"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Wizard Mentor", description: "Mystical wizard with glowing orb — the wise guide your story needs.", category: "characters", type: "image", fileUrl: "/marketplace/char_wizard.png", thumbnailUrl: "/marketplace/char_wizard.png", tags: ["wizard", "fantasy", "mentor", "magic"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    // BACKGROUNDS — all free
    { name: "Sunset City Skyline", description: "Dramatic art-deco skyline at sunset. 16:9 — perfect for comic establishing shots.", category: "backgrounds", type: "image", fileUrl: "/marketplace/bg_city_skyline.png", thumbnailUrl: "/marketplace/bg_city_skyline.png", tags: ["city", "skyline", "noir", "establishing"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Empty Classroom", description: "Vintage classroom interior with chalkboard and sunlit windows.", category: "backgrounds", type: "image", fileUrl: "/marketplace/bg_classroom.png", thumbnailUrl: "/marketplace/bg_classroom.png", tags: ["classroom", "school", "interior", "vn"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Mystic Forest", description: "Glowing mushrooms and twisting trees — a magical fantasy backdrop.", category: "backgrounds", type: "image", fileUrl: "/marketplace/bg_mystic_forest.png", thumbnailUrl: "/marketplace/bg_mystic_forest.png", tags: ["forest", "fantasy", "magic", "mystical"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Space Nebula", description: "Swirling nebula and distant planets — drop into any sci-fi scene.", category: "backgrounds", type: "image", fileUrl: "/marketplace/bg_space_nebula.png", thumbnailUrl: "/marketplace/bg_space_nebula.png", tags: ["space", "nebula", "scifi", "stars"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    // ITEMS — 2 free, 2 paid
    { name: "Magic Sword", description: "Ornate hero's sword with glowing blue gem.", category: "items", type: "image", fileUrl: "/marketplace/item_magic_sword.png", thumbnailUrl: "/marketplace/item_magic_sword.png", tags: ["sword", "weapon", "fantasy", "magic"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Health Potion", description: "Bubbling red health potion in a corked bottle.", category: "items", type: "image", fileUrl: "/marketplace/item_health_potion.png", thumbnailUrl: "/marketplace/item_health_potion.png", tags: ["potion", "fantasy", "rpg", "item"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Treasure Chest (Premium)", description: "Overflowing treasure chest with gold coins and gems — high-detail.", category: "items", type: "image", fileUrl: "private_assets/marketplace/item_treasure_chest.png", thumbnailUrl: "/marketplace/previews/item_treasure_chest_preview.png", tags: ["treasure", "chest", "gold", "fantasy"], priceInCents: 99, isFree: false, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "premium", schoolSafe: true, licenseNotes: "Press Start CoMiXX premium asset — included with paid tiers, or unlocked via single purchase." },
    { name: "Retro Ray Gun (Premium)", description: "Chrome-and-brass ray gun with glowing energy core.", category: "items", type: "image", fileUrl: "private_assets/marketplace/item_ray_gun.png", thumbnailUrl: "/marketplace/previews/item_ray_gun_preview.png", tags: ["raygun", "scifi", "weapon", "retro"], priceInCents: 99, isFree: false, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "premium", schoolSafe: true, licenseNotes: "Press Start CoMiXX premium asset — included with paid tiers, or unlocked via single purchase." },
    // ACCESSORIES — 2 free, 2 paid
    { name: "Hero Mask", description: "Classic eye mask in red with yellow trim.", category: "accessories", type: "image", fileUrl: "/marketplace/acc_hero_mask.png", thumbnailUrl: "/marketplace/acc_hero_mask.png", tags: ["mask", "hero", "costume"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Aviator Sunglasses", description: "Cool aviator sunglasses with reflective lenses.", category: "accessories", type: "image", fileUrl: "/marketplace/acc_sunglasses.png", thumbnailUrl: "/marketplace/acc_sunglasses.png", tags: ["sunglasses", "accessory", "cool"], priceInCents: 0, isFree: true, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "free", schoolSafe: true, licenseNotes: "Press Start CoMiXX original — free for personal & commercial use within published projects." },
    { name: "Wizard Hat (Premium)", description: "Pointed wizard hat with gold star pattern.", category: "accessories", type: "image", fileUrl: "private_assets/marketplace/acc_wizard_hat.png", thumbnailUrl: "/marketplace/previews/acc_wizard_hat_preview.png", tags: ["hat", "wizard", "fantasy"], priceInCents: 99, isFree: false, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "premium", schoolSafe: true, licenseNotes: "Press Start CoMiXX premium asset — included with paid tiers, or unlocked via single purchase." },
    { name: "Hero Cape (Premium)", description: "Flowing red cape with gold clasp — high-detail with motion lines.", category: "accessories", type: "image", fileUrl: "private_assets/marketplace/acc_hero_cape.png", thumbnailUrl: "/marketplace/previews/acc_hero_cape_preview.png", tags: ["cape", "hero", "costume"], priceInCents: 99, isFree: false, sourceType: "original", rightsClass: "safe-redistributable", usageMode: "system-use-and-export", downloadAllowed: true, publishAllowed: true, unlockType: "premium", schoolSafe: true, licenseNotes: "Press Start CoMiXX premium asset — included with paid tiers, or unlocked via single purchase." },
  ];

  try {
    let inserted = 0;
    let migrated = 0;
    for (const seed of seeds) {
      const existing = await db
        .select({ id: platformAssets.id, fileUrl: platformAssets.fileUrl, thumbnailUrl: platformAssets.thumbnailUrl })
        .from(platformAssets)
        .where(eq(platformAssets.name, seed.name));
      if (existing.length === 0) {
        await db.insert(platformAssets).values({ ...seed, isActive: true });
        inserted++;
        continue;
      }
      // One-way legacy → private migration: only rewrite rows whose URLs still match the
      // initial public-path seed pattern. Any admin-edited row (URL not starting with
      // /marketplace/) is left untouched. Skip when multiple rows share the same name.
      if (existing.length !== 1) continue;
      const row = existing[0];
      const seedTargetsPrivate = seed.fileUrl.startsWith("private_assets/");
      const rowOnLegacyPublic = (row.fileUrl ?? "").startsWith("/marketplace/") && !(row.fileUrl ?? "").startsWith("/marketplace/previews/");
      const isPaidLegacyToPrivate = seedTargetsPrivate && rowOnLegacyPublic;
      if (isPaidLegacyToPrivate) {
        await db
          .update(platformAssets)
          .set({ fileUrl: seed.fileUrl, thumbnailUrl: seed.thumbnailUrl })
          .where(eq(platformAssets.id, row.id));
        migrated++;
      }
    }
    if (inserted > 0 || migrated > 0) console.log(`[platform-assets] Seed: inserted=${inserted} migrated=${migrated}`);
  } catch (err) {
    console.error("[platform-assets] Seed failed:", err);
  }
}

const app = express();

const isDev = process.env.NODE_ENV !== "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://image.pollinations.ai", "https://*.supabase.co"],
      mediaSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://text.pollinations.ai", "https://image.pollinations.ai", "https://*.supabase.co", "https://*.stripe.com", "https://pscomixx.online", "https://www.pscomixx.online", "https://psstreaming.online", "https://pressstart.tech", "https://madmixedmedia.com", ...(isDev ? ["ws:", "wss:"] : [])],
      frameSrc: ["'self'", "https://*.stripe.com"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co", "https://replit.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false,
}));

if (!isDev) {
  app.use((req, res, next) => {
    const host = req.hostname;
    if (host === "www.pscomixx.com") {
      return res.redirect(301, `https://pscomixx.com${req.originalUrl}`);
    }
    next();
  });
}

app.use((req, res, next) => {
  res.setHeader("X-Request-ID", crypto.randomUUID());
  next();
});

app.use('/assets', express.static(path.join(process.cwd(), 'client/public/assets'), {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=3600'); },
}));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=3600'); },
}));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl } as any);
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      const webhookBaseUrl = `https://${replitDomains.split(',')[0]}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`Webhook configured: ${result.webhook.url}`);
        } else {
          console.log('Webhook configuration pending');
        }
      } catch (webhookError) {
        console.log('Webhook setup skipped (may already exist)');
      }
    } else {
      console.log('REPLIT_DOMAINS not set, skipping webhook setup');
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api/", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again in 15 minutes" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/admin-login", authLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI generation rate limit reached, please wait a moment" },
});
app.use("/api/ai/", aiLimiter);

const startTime = Date.now();

app.get("/health", async (_req, res) => {
  try {
    const { pool } = await import("./db");
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/status", async (_req, res) => {
  const services: Record<string, string> = {};
  try {
    const { pool } = await import("./db");
    await pool.query("SELECT 1");
    services.database = "operational";
  } catch { services.database = "down"; }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    await fetch("https://text.pollinations.ai/", { method: "HEAD", signal: ctrl.signal }).catch(() => null);
    clearTimeout(t);
    services.ai = "operational";
  } catch { services.ai = "degraded"; }
  services.stripe = process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured";
  const allOperational = Object.values(services).every(s => s === "operational" || s === "configured");
  res.json({ status: allOperational ? "operational" : "degraded", services, timestamp: new Date().toISOString() });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

async function ensureIndexes() {
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_type ON projects (type)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_user_type ON projects (user_id, type)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_series_id ON projects (series_id)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_events_content_id ON engagement_events (content_id)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events (event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_events_content_type ON engagement_events (content_id, event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id ON engagement_events (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_platform_events_user_id ON platform_events (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events (event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_platform_events_created ON platform_events (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (user_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comic_comments_comic ON comic_comments (comic_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comic_bookmarks_user ON comic_bookmarks (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages (thread_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fx_effects_user ON fx_effects (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_progression_notifications_user ON progression_notifications (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC)`,
  ];
  let created = 0;
  for (const idx of indexes) {
    try {
      await db.execute(sql.raw(idx));
      created++;
    } catch {
    }
  }
  console.log(`[database] ${created}/${indexes.length} indexes ensured`);
}

(async () => {
  const envResult = validateEnv();
  if (!envResult.valid) {
    console.error("[startup] Missing required environment variables. Server may not function correctly.");
  }

  await initStripe();
  await seedFeatureFlags();
  await seedPlatformAssets();
  await ensureIndexes();

  const { seedProgressionData } = await import('./progressionEngine');
  await seedProgressionData();
  
  await registerRoutes(httpServer, app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      logInfo("Server started", { port, env: process.env.NODE_ENV || "development" });
    },
  );

  process.on("unhandledRejection", (reason) => {
    console.error("[CRITICAL] Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[CRITICAL] Uncaught exception:", err);
  });

  const gracefulShutdown = (signal: string) => {
    log(`${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      log("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => {
      log("Forceful shutdown after timeout");
      process.exit(1);
    }, 10000);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
})();
