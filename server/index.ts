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
import { featureFlags } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedFeatureFlags() {
  const defaults = [
    { key: 'ai_tools_enabled', enabled: true, description: 'Show/hide AI Tools (Prompt Factory, Story Forge, Import Center, FX Studio link)' },
    { key: 'appsumo_redemption', enabled: true, description: 'Allow AppSumo code redemption' },
    { key: 'community_enabled', enabled: true, description: 'Show/hide Community Library and Ecosystem sections' },
    { key: 'early_adopter_gate', enabled: true, description: 'Gate new signups behind waitlist/invite system' },
    { key: 'export_restrictions', enabled: false, description: 'Require subscription for exports' },
    { key: 'invite_system', enabled: true, description: 'Allow invite code usage' },
    { key: 'marketplace_enabled', enabled: true, description: 'Show/hide the Marketplace section in sidebar and across the app' },
    { key: 'motion_studio_enabled', enabled: true, description: 'Show/hide Motion Studio in Creator Tools' },
    { key: 'payments_enabled', enabled: true, description: 'Enable Stripe payment processing' },
    { key: 'print_studio_enabled', enabled: true, description: 'Show/hide the Print Studio section in sidebar' },
    { key: 'social_enabled', enabled: true, description: 'Show/hide Social features (feed, messaging, collabs, chains)' },
  ];

  try {
    for (const flag of defaults) {
      await db.insert(featureFlags).values(flag).onConflictDoNothing({ target: featureFlags.key });
    }
    console.log("[feature-flags] Seeded default feature flags");
  } catch (err) {
    console.error("[feature-flags] Failed to seed:", err);
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
      connectSrc: ["'self'", "https://text.pollinations.ai", "https://image.pollinations.ai", "https://*.supabase.co", "https://*.stripe.com", ...(isDev ? ["ws:", "wss:"] : [])],
      frameSrc: ["'self'", "https://*.stripe.com"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co", "https://replit.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false,
}));

app.use((req, res, next) => {
  res.setHeader("X-Request-ID", crypto.randomUUID());
  next();
});

app.use('/assets', express.static(path.join(process.cwd(), 'client/public/assets')));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
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
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await initStripe();
  await seedFeatureFlags();
  
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
