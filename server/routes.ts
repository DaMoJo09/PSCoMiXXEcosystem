import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, randomBytes, createHash, createHmac } from "crypto";
import rateLimit from "express-rate-limit";

function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<globalThis.Response> {
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() => clearTimeout(timer));
}
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertProjectSchema, insertAssetSchema, insertAssetImportSchema, tierEntitlements, TierName, insertContentReportSchema, insertAssetPackSchema, insertEngagementEventSchema, insertMarketplaceListingSchema, insertMarketplaceOrderSchema, users, projects, subscriptions, revenueEvents, marketplaceListings, engagementEvents, usageTracking, schoolMemberships, schools, platformEvents, insertPlatformEventSchema, fxEffects, platformAssets, insertPlatformAssetSchema, xpTransactions, xpEvents as xpEventsTable, xpBalances as xpBalancesTable, passportEntries as passportEntriesTable, competencies as competenciesTable, skillTags as skillTagsTable, externalTools as externalToolsTable, externalSubmissions as externalSubmissionsTable, roleEligibilityRules as roleEligibilityRulesTable, apprenticeshipTracks as apprenticeshipTracksTable, apprenticeshipApplications as apprenticeshipAppsTable, productionRoles as productionRolesTable, mentorReviews as mentorReviewsTable, bugReports as bugReportsTable, creatorChannels as creatorChannelsTable, schoolStations as schoolStationsTable, pathways as pathwaysTable, userPathwayProgress as userPathwayProgressTable, XP_ACTIONS as XP_ACTIONS_IMPORT } from "@shared/schema";
import { db } from "./db";
import { sql, eq, and, or, desc, ilike, isNull, gte } from "drizzle-orm";
import { buildPSContentBundle, validateBundle, runPublishPipeline, syncToPSStreaming, syncCreatorProfile, checkPSStreamingHealth } from "./publishPipeline";
import { z } from "zod";
import { stripeService } from "./stripeService";
import { getStripeSync, getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { filterContent, isStudentSafe } from "./contentFilter";
import { logAuditEvent, auditAuth, auditAdmin, auditStudent } from "./auditLogger";
import { issueEcosystemToken, verifyEcosystemToken, verifyEcosystemTokenDetailed, getRedirectUrl, findOrCreateUserFromToken, makeSSOError, generateRequestId } from "./sso";
import { enqueueSyncEvent, getSyncStatus, getSyncHistory, getSyncLogs, getSyncHealthMetrics, retrySyncEvent, logSSOAudit, getSSOAuditHistory, getSSOHealthMetrics, startSyncWorker } from "./syncEngine";
import { dispatchWebhook, retryFailedWebhooks, getWebhookLogs, startWebhookRetryWorker } from "./webhookService";
import { createExportJob, getExportJob, getProjectExports } from "./publishService";
import { seedDemoContent } from "./seed-content";
import { logPaymentEvent } from "./paymentAudit";
import { validateApiKey, isAllowedWebhookUrl } from "./integrationAuth";
import { getProjectExportData } from "./exportService";
import { saveBase64File, getFile, getUserFiles, deleteFile, getUserStorageUsage } from "./fileStorage";
import { scanImage, addBlockedHash, removeBlockedHash, getBlockedHashes, getFlaggedImages, reviewImage, isImageData } from "./contentModeration";
import { sendWelcomeEmail, sendAssignmentNotification, sendSubmissionConfirmation, sendGradeNotification, sendPurchaseConfirmation, sendSubscriptionConfirmation, sendNewChapterNotification, sendBugReportNotification } from "./email";
import { processProgressionEvent, getLevelFromXp, getXpForNextLevel, getLevelThresholds, getXpForAction, claimReward } from "./progressionEngine";
import { achievements, userAchievements, rewards, userRewards, contentPacks, userEntitlements, progressionNotifications, levelThresholds as levelThresholdsTable, certifications, userCertifications, badges, userBadges } from "@shared/schema";
import type { InsertPromoTemplate } from "@shared/schema";

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

// API Key utilities
function generateApiKey(): string {
  return `psc_${randomBytes(32).toString('hex')}`;
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

interface CollabClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  sessionId: string;
  color: string;
  cursor?: { x: number; y: number; pageId: string };
  activeTool?: string;
}

const collabClients = new Map<string, CollabClient[]>();

function broadcastToSession(sessionId: string, message: any, excludeUserId?: string) {
  const clients = collabClients.get(sessionId) || [];
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

export async function registerRoutes(server: ReturnType<typeof createServer>, app: Express) {
  setupAuth(app);

  const SERVER_IDLE_THRESHOLD_MS = 120_000;
  const serverLastActivity = new Map<string, number>();

  function recordServerActivity(userId: string) {
    serverLastActivity.set(userId, Date.now());
  }

  setInterval(() => {
    const cutoff = Date.now() - 600_000;
    for (const [k, v] of serverLastActivity) {
      if (v < cutoff) serverLastActivity.delete(k);
    }
  }, 300_000);

  // Auth middleware
  function isAuthenticated(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated()) {
      if (req.user?.id && req.path !== "/api/xp/heartbeat") {
        recordServerActivity(req.user.id);
      }
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  }

  function isAdmin(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated() && req.user?.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  }

  function blockStudents(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated() && req.user?.accountType === "student") {
      return res.status(403).json({ message: "This feature is not available for student accounts" });
    }
    return next();
  }

  function isTeacherOrAdmin(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "teacher")) {
      return next();
    }
    res.status(403).json({ message: "Teacher or admin access required" });
  }

  // API Key authentication middleware for external apps
  async function isApiAuthenticated(req: Request, res: Response, next: Function) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' });
      }

      const apiKey = authHeader.substring(7);
      if (!apiKey.startsWith('psc_')) {
        return res.status(401).json({ error: 'Invalid API key format', code: 'INVALID_KEY' });
      }

      const keyHash = hashApiKey(apiKey);
      const storedKey = await storage.getApiKeyByHash(keyHash);

      if (!storedKey) {
        return res.status(401).json({ error: 'Invalid API key', code: 'INVALID_KEY' });
      }

      if (!storedKey.isActive) {
        return res.status(401).json({ error: 'API key is deactivated', code: 'KEY_DEACTIVATED' });
      }

      if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'API key has expired', code: 'KEY_EXPIRED' });
      }

      storage.updateApiKeyLastUsed(storedKey.id).catch(() => {});

      const user = await storage.getUser(storedKey.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      (req as any).apiUser = user;
      (req as any).apiKey = storedKey;
      (req as any).apiPermissions = storedKey.permissions || ['read'];

      next();
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    }
  }

  // Check permission helper
  function hasPermission(req: Request, permission: string): boolean {
    const permissions = (req as any).apiPermissions || [];
    return permissions.includes(permission) || permissions.includes('*');
  }

  const authRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: false, legacyHeaders: false, message: { message: "Too many attempts, please try again later" } });
  app.post("/api/auth/signup", authRateLimiter, async (req, res, next) => {
    try {
      const earlyAdopterFlag = await storage.getFeatureFlag("early_adopter_gate");
      if (earlyAdopterFlag?.enabled) {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const waitlistEntry = await storage.getWaitlistEntry(normalizedEmail);
        if (!waitlistEntry || waitlistEntry.status !== "approved") {
          return res.status(403).json({ message: "Signups are currently limited to approved early adopters. Join the waitlist to get access." });
        }
      }

      const { dateOfBirth, parentalConsent, ...rest } = req.body;

      if (!dateOfBirth) {
        return res.status(400).json({ message: "Date of birth is required" });
      }

      const password = rest.password || "";
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one letter and one number" });
      }

      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 6) {
        return res.status(400).json({ message: "You must be at least 6 years old to sign up" });
      }

      const accountType = age >= 18 ? "creator" : "student";

      if (accountType === "student" && !parentalConsent) {
        return res.status(400).json({ message: "Parental or guardian consent is required for students under 18" });
      }

      const result = insertUserSchema.safeParse({
        ...rest,
        dateOfBirth,
        accountType,
        parentalConsentAt: accountType === "student" && parentalConsent ? new Date() : undefined,
      });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }

      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(result.data.password);
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        logAuditEvent("account_created", { req, userId: user.id, metadata: { accountType: user.accountType } });
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        sendWelcomeEmail(user.email, user.name, baseUrl);
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          xp: user.xp,
          level: user.level,
          totalMinutes: user.totalMinutes,
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", authRateLimiter, (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) {
        console.error("[auth] Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("[auth] Login failed for:", email, "Reason:", info?.message);
        logAuditEvent("login_failed", { req, metadata: { email, reason: info?.message } });
        return res.status(400).json({ message: info?.message || "Invalid email or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("[auth] Session error:", err);
          return next(err);
        }
        console.log("[auth] Login success for:", email);
        logAuditEvent("login_success", { req, userId: user.id });
        db.execute(sql`UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_login_at = NOW() WHERE id = ${user.id}`).catch(() => {});
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
          xp: user.xp,
          level: user.level,
          totalMinutes: user.totalMinutes,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      return res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        accountType: req.user.accountType,
        xp: req.user.xp,
        level: req.user.level,
        totalMinutes: req.user.totalMinutes,
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // Admin login - requires specific admin credentials stored in environment variables
  app.post("/api/auth/admin-login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminEmail || !adminPassword) {
        return res.status(500).json({ message: "Admin login not configured. Contact system administrator." });
      }
      
      if (email !== adminEmail) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      if (password !== adminPassword) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      let adminUser = await storage.getUserByEmail(adminEmail);
      const hashedPassword = await hashPassword(adminPassword);
      
      if (!adminUser) {
        adminUser = await storage.createUser({
          email: adminEmail,
          password: hashedPassword,
          name: "Administrator",
          role: "admin",
        });
      } else {
        if (adminUser.role !== "admin") {
          await storage.updateUserRole(adminUser.id, "admin");
        }
        await storage.updateUserPassword(adminUser.id, hashedPassword);
        adminUser = { ...adminUser, role: "admin", password: hashedPassword };
      }
      
      req.login(adminUser, (err) => {
        if (err) return next(err);
        return res.json({
          id: adminUser!.id,
          email: adminUser!.email,
          name: adminUser!.name,
          role: adminUser!.role,
          accountType: adminUser!.accountType || "creator",
          xp: adminUser!.xp || 0,
          level: adminUser!.level || 1,
          totalMinutes: adminUser!.totalMinutes || 0,
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Legal agreement routes
  app.post("/api/auth/accept-ip-disclosure", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.acceptIpDisclosure(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        ipDisclosureAccepted: user.ipDisclosureAccepted,
        userAgreementAccepted: user.userAgreementAccepted 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/accept-user-agreement", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.acceptUserAgreement(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        ipDisclosureAccepted: user.ipDisclosureAccepted,
        userAgreementAccepted: user.userAgreementAccepted 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/legal-status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        ipDisclosureAccepted: user.ipDisclosureAccepted,
        userAgreementAccepted: user.userAgreementAccepted,
        aiConsentAcceptedAt: user.aiConsentAcceptedAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI consent — required by Apple Guideline 5.1.2(i) before any AI use.
  // Recorded server-side for audit. Client also caches in localStorage so
  // the modal doesn't re-prompt on every AI tool open.
  app.post("/api/auth/accept-ai-consent", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.acceptAiConsent(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        ipDisclosureAccepted: user.ipDisclosureAccepted,
        userAgreementAccepted: user.userAgreementAccepted,
        aiConsentAcceptedAt: user.aiConsentAcceptedAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // XP Heartbeat - awards XP only for verified active usage
  // Server tracks last authenticated API call per user as independent proof of activity.
  // Client sends { active: bool, idleSeconds: number } but server cross-checks against
  // its own activity record. XP only awarded when BOTH client AND server agree user is active.
  const XP_PER_MINUTE = 1;

  const ACTION_KEY_MAP: Record<string, string> = {
    save: "save",
    export: "export_completed",
    generate: "ai_generation",
    publish: "publish",
  };
  const actionCooldowns = new Map<string, number>();
  setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [k, v] of actionCooldowns) {
      if (v < cutoff) actionCooldowns.delete(k);
    }
  }, 60000);

  const ECOSYSTEM_API_KEY = process.env.PSLMS_API_KEY || "";
  const FX_STUDIO_ANON_KEY = process.env.FX_STUDIO_API_KEY || "";
  const PSSTREAMING_SECRET = process.env.PSSTREAMING_WEBHOOK_SECRET || "";

  const ECOSYSTEM_XP_ENDPOINTS = [
    { name: "PSStreaming", url: "https://psstreaming.com/api/xp/sync/incoming" },
    { name: "PSLMS", url: "https://pressstart.tech/api/webhooks/xp-sync" },
    { name: "FXStudio", url: "https://upivslgwjtvqymonliib.supabase.co/functions/v1/xp-sync" },
  ];

  async function broadcastXpToEcosystem(
    userEmail: string,
    xpAwarded: number,
    action: string,
    fullState: { totalXp: number; level: number; levelTitle: string; totalMinutes: number },
    sourceApp: string = "comixx",
    userId?: string
  ) {
    if (!ECOSYSTEM_API_KEY && !PSSTREAMING_SECRET && !FX_STUDIO_ANON_KEY) return;
    const timestamp = new Date().toISOString();

    for (const endpoint of ECOSYSTEM_XP_ENDPOINTS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: string;

      if (endpoint.name === "PSStreaming") {
        headers["x-webhook-secret"] = PSSTREAMING_SECRET;
        body = JSON.stringify({
          user_id: userId || userEmail,
          user_email: userEmail,
          action,
          xp_amount: xpAwarded,
          total_xp: fullState.totalXp,
          level: fullState.level,
          level_title: fullState.levelTitle,
          total_minutes: fullState.totalMinutes,
          source_platform: sourceApp === "comixx" ? "pscomixx" : sourceApp,
          timestamp,
        });
      } else if (endpoint.name === "FXStudio") {
        headers["apikey"] = FX_STUDIO_ANON_KEY;
        headers["Authorization"] = `Bearer ${FX_STUDIO_ANON_KEY}`;
        body = JSON.stringify({
          event: "xp.sync",
          user_email: userEmail,
          xp_awarded: xpAwarded,
          action,
          total_xp: fullState.totalXp,
          level: fullState.level,
          level_title: fullState.levelTitle,
          total_minutes: fullState.totalMinutes,
          source: sourceApp,
          timestamp,
        });
      } else {
        headers["X-API-Key"] = ECOSYSTEM_API_KEY;
        body = JSON.stringify({
          event: "xp.sync",
          user_email: userEmail,
          xp_awarded: xpAwarded,
          action,
          total_xp: fullState.totalXp,
          level: fullState.level,
          level_title: fullState.levelTitle,
          total_minutes: fullState.totalMinutes,
          source: sourceApp,
          timestamp,
        });
      }

      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error(`[XP Sync → ${endpoint.name}] HTTP ${res.status} for ${userEmail}`);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`[XP Sync → ${endpoint.name}] Failed:`, err.message);
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async function forwardXpToStreaming(userEmail: string, minutes: number, xp: number, fullState?: { totalXp: number; level: number; levelTitle: string; totalMinutes: number }, userId?: string) {
    if (!fullState) return;
    broadcastXpToEcosystem(userEmail, xp, "heartbeat", fullState, "comixx", userId);
  }

  app.post("/api/xp/heartbeat", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const clientActive = req.body?.active === true;
      const idleSeconds = typeof req.body?.idleSeconds === "number" ? Math.max(0, req.body.idleSeconds) : 9999;

      const now = new Date();
      const lastBeat = user.lastXpHeartbeat ? new Date(user.lastXpHeartbeat) : null;
      const minSinceLastBeat = lastBeat ? (now.getTime() - lastBeat.getTime()) / 60000 : 2;

      if (minSinceLastBeat < 0.5) {
        const { title: earlyTitle } = getLevelFromXp(user.xp || 0);
        return res.json({ xp: user.xp, level: user.level, levelTitle: earlyTitle, totalMinutes: user.totalMinutes, xpGained: 0, idle: !clientActive });
      }

      const serverLastSeen = serverLastActivity.get(userId) || 0;
      const serverIdleMs = Date.now() - serverLastSeen;
      const serverConfirmsActive = serverLastSeen > 0 && serverIdleMs < SERVER_IDLE_THRESHOLD_MS;

      const isIdle = !clientActive || idleSeconds >= 90 || !serverConfirmsActive;

      if (isIdle) {
        const { title: idleTitle } = getLevelFromXp(user.xp || 0);
        await storage.updateUserProfile(userId, {
          lastXpHeartbeat: now,
        } as any);
        return res.json({ xp: user.xp, level: user.level, levelTitle: idleTitle, totalMinutes: user.totalMinutes, xpGained: 0, idle: true });
      }

      const minutesToCredit = Math.min(Math.floor(minSinceLastBeat), 5);
      const xpGained = minutesToCredit * XP_PER_MINUTE;
      const newXp = (user.xp || 0) + xpGained;
      const newTotalMinutes = (user.totalMinutes || 0) + minutesToCredit;
      const { level: newLevel, title: levelTitle } = getLevelFromXp(newXp);

      await storage.updateUserProfile(userId, {
        xp: newXp,
        level: newLevel,
        totalMinutes: newTotalMinutes,
        lastXpHeartbeat: now,
        lastActiveAt: now,
      } as any);

      forwardXpToStreaming(user.email, minutesToCredit, xpGained, {
        totalXp: newXp,
        level: newLevel,
        levelTitle,
        totalMinutes: newTotalMinutes,
      }, userId);

      res.json({ xp: newXp, level: newLevel, levelTitle, totalMinutes: newTotalMinutes, xpGained, idle: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/xp/action", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { action, referenceId, referenceType } = req.body;
      
      const validActions = ['save', 'export', 'generate', 'publish', 'project_created', 'export_completed', 
        'ai_generation', 'profile_complete', 'first_login', 'daily_login', 'lesson_complete', 
        'assignment_complete', 'challenge_participation', 'first_share', 'subscription_started',
        'hop_created', 'hop_saved', 'hop_published', 'hop_series_created',
        'hop_asset_sent', 'hop_comic_converted'];
      if (!action || !validActions.includes(action)) {
        return res.status(400).json({ message: "Invalid action type" });
      }

      const normalizedAction = ACTION_KEY_MAP[action] || action;

      const cooldownKey = `${userId}:${normalizedAction}`;
      const lastAction = actionCooldowns.get(cooldownKey) || 0;
      const now = Date.now();
      if (now - lastAction < 10000) {
        return res.json({ xpGained: 0, message: "Action cooldown active" });
      }
      actionCooldowns.set(cooldownKey, now);

      const result = await processProgressionEvent(userId, normalizedAction, referenceId, referenceType);
      
      const user = await storage.getUser(userId);
      if (user) broadcastXpToEcosystem(user.email, result.xpAwarded, normalizedAction, {
        totalXp: result.newXp,
        level: result.newLevel,
        levelTitle: result.levelTitle,
        totalMinutes: user.totalMinutes || 0,
      });

      res.json({
        xp: result.newXp,
        level: result.newLevel,
        xpGained: result.xpAwarded,
        action,
        leveledUp: result.leveledUp,
        levelTitle: result.levelTitle,
        achievementsUnlocked: result.achievementsUnlocked,
        rewardsUnlocked: result.rewardsUnlocked,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/xp/status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const xp = user.xp || 0;
      const { level, title: levelTitle } = getLevelFromXp(xp);
      const { current: currentThreshold, needed: nextThreshold } = getXpForNextLevel(level);
      const xpInCurrentLevel = xp - currentThreshold;
      const xpForNextLevel = nextThreshold - currentThreshold;
      res.json({
        xp,
        level,
        levelTitle,
        totalMinutes: user.totalMinutes || 0,
        accountType: user.accountType,
        xpForNextLevel,
        xpInCurrentLevel,
        xpProgress: xpForNextLevel > 0 ? Math.min(xpInCurrentLevel / xpForNextLevel, 1) : 1,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/xp/force-sync", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const xp = user.xp || 0;
      const { level, title: levelTitle } = getLevelFromXp(xp);
      const totalMinutes = user.totalMinutes || 0;
      const timestamp = new Date().toISOString();
      const results: { name: string; status: string; code?: number }[] = [];
      for (const endpoint of ECOSYSTEM_XP_ENDPOINTS) {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 5000);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        let body: string;
        if (endpoint.name === "PSStreaming") {
          headers["x-webhook-secret"] = PSSTREAMING_SECRET;
          body = JSON.stringify({ user_id: user.id, user_email: user.email, action: "force-sync", xp_amount: 0, total_xp: xp, level, level_title: levelTitle, total_minutes: totalMinutes, source_platform: "pscomixx", timestamp });
        } else if (endpoint.name === "FXStudio") {
          headers["apikey"] = FX_STUDIO_ANON_KEY;
          headers["Authorization"] = `Bearer ${FX_STUDIO_ANON_KEY}`;
          body = JSON.stringify({ event: "xp.sync", user_email: user.email, xp_awarded: 0, action: "force-sync", total_xp: xp, level, level_title: levelTitle, total_minutes: totalMinutes, source: "comixx", timestamp });
        } else {
          headers["X-API-Key"] = ECOSYSTEM_API_KEY;
          body = JSON.stringify({ event: "xp.sync", user_email: user.email, xp_awarded: 0, action: "force-sync", total_xp: xp, level, level_title: levelTitle, total_minutes: totalMinutes, source: "comixx", timestamp });
        }
        try {
          const r = await fetch(endpoint.url, { method: "POST", headers, body, signal: controller.signal });
          results.push({ name: endpoint.name, status: r.ok ? "ok" : "error", code: r.status });
        } catch (err: any) {
          results.push({ name: endpoint.name, status: err.name === "AbortError" ? "timeout" : "failed" });
        } finally { clearTimeout(to); }
      }
      res.json({ synced: true, xp, level, levelTitle, totalMinutes, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/xp/levels", async (_req, res) => {
    try {
      res.json(getLevelThresholds());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/progression/achievements", isAuthenticated, async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      const allAchievements = await db.select().from(achievements).where(eq(achievements.isActive, true));
      const userEarned = await db.select().from(userAchievements).where(eq(userAchievements.userId, req.user!.id));
      const earnedMap = new Map(userEarned.map(e => [e.achievementId, e]));

      const result = [];
      for (const a of allAchievements) {
        let progressCurrent = 0;
        let progressTarget = 1;
        const config = a.ruleConfig as Record<string, string | number>;

        if (!earnedMap.has(a.id)) {
          switch (a.ruleType) {
            case 'count': {
              progressTarget = Number(config.count) || 1;
              const countRes = await db.execute(
                sql`SELECT COUNT(*) as cnt FROM xp_transactions WHERE user_id = ${req.user!.id} AND action = ${String(config.action)}`
              );
              progressCurrent = Math.min(Number((countRes.rows[0] as Record<string, unknown>)?.cnt || 0), progressTarget);
              break;
            }
            case 'threshold': {
              progressTarget = Number(config.value) || 1;
              const user = await storage.getUser(req.user!.id);
              if (config.field === 'xp') progressCurrent = Math.min(user?.xp || 0, progressTarget);
              if (config.field === 'level') progressCurrent = Math.min(user?.level || 1, progressTarget);
              break;
            }
            case 'streak': {
              const streakDays = Math.max(1, Math.min(Number(config.days) || 3, 365));
              progressTarget = streakDays;
              const streakRes = await db.execute(
                sql`SELECT COUNT(DISTINCT DATE(created_at)) as streak_days
                    FROM xp_transactions WHERE user_id = ${req.user!.id}
                    AND created_at >= CURRENT_DATE - make_interval(days => ${streakDays})`
              );
              progressCurrent = Math.min(Number((streakRes.rows[0] as Record<string, unknown>)?.streak_days || 0), progressTarget);
              break;
            }
            case 'flag': {
              const flagRes = await db.execute(
                sql`SELECT COUNT(*) as cnt FROM xp_transactions WHERE user_id = ${req.user!.id} AND action = ${String(config.action)} LIMIT 1`
              );
              progressCurrent = Number((flagRes.rows[0] as Record<string, unknown>)?.cnt || 0) > 0 ? 1 : 0;
              break;
            }
          }
        } else {
          progressCurrent = 1;
          progressTarget = 1;
        }

        result.push({
          ...a,
          earned: earnedMap.has(a.id),
          earnedAt: earnedMap.get(a.id)?.earnedAt || null,
          claimedAt: earnedMap.get(a.id)?.claimedAt || null,
          progressCurrent,
          progressTarget,
        });
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/progression/xp-history", isAuthenticated, async (req, res) => {
    try {
      const { eq, desc } = await import('drizzle-orm');
      const history = await db.select().from(xpTransactions)
        .where(eq(xpTransactions.userId, req.user!.id))
        .orderBy(desc(xpTransactions.createdAt))
        .limit(20);
      res.json(history);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message });
    }
  });

  app.get("/api/progression/rewards", isAuthenticated, async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      const allRewards = await db.select().from(rewards).where(eq(rewards.isActive, true));
      const userRewardsList = await db.select().from(userRewards).where(eq(userRewards.userId, req.user!.id));
      const rewardMap = new Map(userRewardsList.map(r => [r.rewardId, r]));

      const user = await storage.getUser(req.user!.id);
      const xp = user?.xp || 0;
      const { level } = getLevelFromXp(xp);

      const result = allRewards.map(r => {
        const userReward = rewardMap.get(r.id);
        const config = r.unlockConfig as any;
        let progress = 0;
        let requirement = '';
        
        if (r.unlockType === 'level') {
          progress = Math.min(level / (config.level || 1), 1);
          requirement = `Reach Level ${config.level}`;
        } else if (r.unlockType === 'xp_total') {
          progress = Math.min(xp / (config.xp || 1), 1);
          requirement = `Earn ${config.xp} XP`;
        } else if (r.unlockType === 'achievement') {
          requirement = `Earn achievement: ${config.achievementKey}`;
          progress = userReward ? 1 : 0;
        }

        return {
          ...r,
          unlocked: !!userReward,
          status: userReward?.status || 'locked',
          unlockedAt: userReward?.unlockedAt || null,
          claimedAt: userReward?.claimedAt || null,
          progress,
          requirement,
        };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/progression/rewards/:rewardId/claim", isAuthenticated, async (req, res) => {
    try {
      const success = await claimReward(req.user!.id, req.params.rewardId);
      if (!success) {
        return res.status(400).json({ message: "Reward not available for claiming" });
      }
      res.json({ success: true, message: "Reward claimed!" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/progression/content-packs", isAuthenticated, async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      const packs = await db.select().from(contentPacks).where(eq(contentPacks.isActive, true));
      const entitlements = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, req.user!.id));
      const entitledKeys = new Set(entitlements.filter(e => e.entitlementType === 'content_pack').map(e => e.entitlementKey));

      const result = packs.map(p => ({
        ...p,
        owned: entitledKeys.has(p.key),
      }));

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/progression/notifications", isAuthenticated, async (req, res) => {
    try {
      const { eq, desc } = await import('drizzle-orm');
      const notifications = await db.select().from(progressionNotifications)
        .where(eq(progressionNotifications.userId, req.user!.id))
        .orderBy(desc(progressionNotifications.createdAt))
        .limit(50);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/progression/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      await db.update(progressionNotifications)
        .set({ isRead: true })
        .where(eq(progressionNotifications.userId, req.user!.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/progression/summary", isAuthenticated, async (req, res) => {
    try {
      const { eq, and } = await import('drizzle-orm');
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const xp = user.xp || 0;
      const { level, title: levelTitle } = getLevelFromXp(xp);
      const { current: currentThreshold, needed: nextThreshold } = getXpForNextLevel(level);

      const earnedAchievements = await db.select().from(userAchievements)
        .where(eq(userAchievements.userId, req.user!.id));
      const totalAchievements = await db.select().from(achievements)
        .where(eq(achievements.isActive, true));
      const unlockedRewards = await db.select().from(userRewards)
        .where(eq(userRewards.userId, req.user!.id));
      const claimable = unlockedRewards.filter(r => r.status === 'unlocked').length;
      const unreadNotifs = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM progression_notifications WHERE user_id = ${req.user!.id} AND is_read = false`
      );

      const streakResult = await db.execute(
        sql`SELECT COUNT(DISTINCT DATE(created_at)) as streak_days
            FROM xp_transactions
            WHERE user_id = ${req.user!.id}
            AND created_at >= (
              SELECT COALESCE(
                (SELECT d FROM generate_series(CURRENT_DATE, CURRENT_DATE - INTERVAL '365 days', '-1 day'::interval) d
                 WHERE NOT EXISTS (
                   SELECT 1 FROM xp_transactions WHERE user_id = ${req.user!.id} AND DATE(created_at) = d::date
                 )
                 ORDER BY d DESC LIMIT 1),
                CURRENT_DATE - INTERVAL '365 days'
              ) + INTERVAL '1 day'
            )`
      );
      const currentStreak = Number((streakResult.rows[0] as Record<string, unknown>)?.streak_days || 0);

      const allRewards = await db.select().from(rewards).where(eq(rewards.isActive, true));
      const earnedRewardIds = new Set(unlockedRewards.map(r => r.rewardId));
      let nextUnlock: { title: string; description: string; type: string; level?: number } | null = null;
      for (const reward of allRewards) {
        if (earnedRewardIds.has(reward.id)) continue;
        const config = reward.unlockConfig as Record<string, number>;
        if (reward.unlockType === 'level' && config.level && config.level > level) {
          if (!nextUnlock || config.level < (nextUnlock.level || 999)) {
            nextUnlock = { title: reward.title, description: reward.description || '', type: reward.rewardType, level: config.level };
          }
        }
      }

      const allCerts = await db.select().from(certifications).where(eq(certifications.isActive, true));
      const earnedCerts = await db.select().from(userCertifications).where(eq(userCertifications.userId, req.user!.id));
      const earnedCertIds = new Set(earnedCerts.map(c => c.certificationId));
      for (const cert of allCerts) {
        if (earnedCertIds.has(cert.id)) continue;
        const certLevel = cert.requiredLevel || 1;
        if (certLevel > level) {
          if (!nextUnlock || certLevel < (nextUnlock.level || 999)) {
            nextUnlock = { title: cert.title, description: cert.description || '', type: 'certification', level: certLevel };
          }
        }
      }

      if (!nextUnlock) {
        nextUnlock = { title: "All rewards unlocked!", description: "You've earned everything available", type: "complete" };
      }

      res.json({
        xp,
        level,
        levelTitle,
        xpInCurrentLevel: xp - currentThreshold,
        xpForNextLevel: nextThreshold - currentThreshold,
        xpProgress: (nextThreshold - currentThreshold) > 0 ? Math.min((xp - currentThreshold) / (nextThreshold - currentThreshold), 1) : 1,
        achievementsEarned: earnedAchievements.length,
        achievementsTotal: totalAchievements.length,
        rewardsUnlocked: unlockedRewards.length,
        rewardsClaimable: claimable,
        unreadNotifications: Number((unreadNotifs.rows[0] as Record<string, unknown>)?.cnt || 0),
        totalMinutes: user.totalMinutes || 0,
        accountType: user.accountType,
        currentStreak,
        nextUnlock,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/certifications", isAuthenticated, async (req, res) => {
    try {
      const { eq, and } = await import('drizzle-orm');
      const allCerts = await db.select().from(certifications).where(eq(certifications.isActive, true)).orderBy(certifications.sortOrder);
      const earned = await db.select().from(userCertifications).where(eq(userCertifications.userId, req.user!.id));
      const earnedMap = new Map(earned.map(e => [e.certificationId, e]));
      const user = await storage.getUser(req.user!.id);
      const userProjects = await storage.getUserProjectsMeta(req.user!.id);

      const result = allCerts.map(cert => {
        const uc = earnedMap.get(cert.id);
        const publishedProjects = userProjects.filter(p => p.status === "published");
        const matchingProjects = userProjects.filter(p => cert.requiredProjectTypes.length === 0 || cert.requiredProjectTypes.includes(p.type));
        const matchingPublished = publishedProjects.filter(p => cert.requiredProjectTypes.length === 0 || cert.requiredProjectTypes.includes(p.type));

        const progress = {
          xp: { current: user?.xp || 0, required: cert.requiredXp, met: (user?.xp || 0) >= cert.requiredXp },
          level: { current: user?.level || 1, required: cert.requiredLevel, met: (user?.level || 1) >= cert.requiredLevel },
          projects: { current: matchingProjects.length, required: cert.requiredProjectCount, met: matchingProjects.length >= cert.requiredProjectCount },
          published: { current: matchingPublished.length, required: cert.requiredPublished, met: matchingPublished.length >= cert.requiredPublished },
        };
        const eligible = progress.xp.met && progress.level.met && progress.projects.met && progress.published.met;

        return {
          ...cert,
          earned: !!uc,
          earnedAt: uc?.earnedAt || null,
          verificationCode: uc?.verificationCode || null,
          progress,
          eligible,
        };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/certifications/:slug/claim", isAuthenticated, async (req, res) => {
    try {
      const { eq, and } = await import('drizzle-orm');
      const crypto = await import("crypto");
      const [cert] = await db.select().from(certifications).where(and(eq(certifications.slug, req.params.slug), eq(certifications.isActive, true)));
      if (!cert) return res.status(404).json({ message: "Certification not found" });

      const existing = await db.select().from(userCertifications)
        .where(and(eq(userCertifications.userId, req.user!.id), eq(userCertifications.certificationId, cert.id)));
      if (existing.length > 0) return res.status(400).json({ message: "Already earned", verificationCode: existing[0].verificationCode });

      const user = await storage.getUser(req.user!.id);
      const userProjects = await storage.getUserProjectsMeta(req.user!.id);
      const publishedProjects = userProjects.filter(p => p.status === "published");
      const matchingProjects = userProjects.filter(p => cert.requiredProjectTypes.length === 0 || cert.requiredProjectTypes.includes(p.type));
      const matchingPublished = publishedProjects.filter(p => cert.requiredProjectTypes.length === 0 || cert.requiredProjectTypes.includes(p.type));

      if ((user?.xp || 0) < cert.requiredXp) return res.status(403).json({ message: "XP requirement not met" });
      if ((user?.level || 1) < cert.requiredLevel) return res.status(403).json({ message: "Level requirement not met" });
      if (matchingProjects.length < cert.requiredProjectCount) return res.status(403).json({ message: "Project count requirement not met" });
      if (matchingPublished.length < cert.requiredPublished) return res.status(403).json({ message: "Published project requirement not met" });

      const verificationCode = `PS-${cert.slug.toUpperCase().replace(/-/g, '')}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const portfolioSnapshot = {
        userName: user?.name || user?.username || "Creator",
        level: user?.level || 1,
        xp: user?.xp || 0,
        levelTitle: getLevelFromXp(user?.xp || 0).title,
        projectCount: matchingProjects.length,
        publishedCount: matchingPublished.length,
        projectTypes: [...new Set(matchingProjects.map(p => p.type))],
      };

      const [uc] = await db.insert(userCertifications).values({
        userId: req.user!.id,
        certificationId: cert.id,
        verificationCode,
        portfolioSnapshot,
      }).returning();

      await processProgressionEvent(req.user!.id, "certification_earned", cert.id, "certification");

      if (PSSTREAMING_SECRET) {
        const certType = cert.slug.replace(/-/g, '_');
        const syncPayload = {
          cert_id: verificationCode,
          cert_type: certType,
          user_email: user?.email || "",
          user_name: user?.name || user?.username || "Creator",
          issued_at: new Date().toISOString(),
          issued_by: "PSCoMiXX",
          requirements_met: {
            projects_completed: matchingProjects.length,
            content_published: matchingPublished.length,
            xp_threshold: cert.requiredXp,
          },
          linked_content_ids: matchingPublished.map(p => p.id),
          xp_at_issue: user?.xp || 0,
          level_at_issue: user?.level || 1,
        };
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 5000);
        fetch("https://psstreaming.com/api/certifications/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": PSSTREAMING_SECRET,
          },
          body: JSON.stringify(syncPayload),
          signal: ctrl.signal,
        }).catch(e => console.log("[cert-sync] Streaming sync failed:", e.message))
          .finally(() => clearTimeout(to));
      }

      res.json({
        ...uc,
        certification: cert,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/certifications/validate/:email", async (req, res) => {
    try {
      const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
      const xApiKey = req.headers["x-api-key"] as string | undefined;
      const validStreaming = PSSTREAMING_SECRET && webhookSecret === PSSTREAMING_SECRET;
      const validLms = xApiKey && xApiKey === process.env.PSLMS_API_KEY;
      if (!validStreaming && !validLms) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserByEmail(req.params.email);
      if (!user) return res.json({ user_found: false, user_email: req.params.email });

      const { eq, and } = await import('drizzle-orm');
      const userProjects = await storage.getUserProjectsMeta(user.id);
      const publishedProjects = userProjects.filter(p => p.status === "published");

      const statsByType: Record<string, { count: number; published: number; content_ids: string[] }> = {};
      for (const p of userProjects) {
        if (!statsByType[p.type]) statsByType[p.type] = { count: 0, published: 0, content_ids: [] };
        statsByType[p.type].count++;
        if (p.status === "published") {
          statsByType[p.type].published++;
          statsByType[p.type].content_ids.push(p.id);
        }
      }

      const earnedCerts = await db.select().from(userCertifications)
        .where(eq(userCertifications.userId, user.id));
      const certDetails = [];
      for (const uc of earnedCerts) {
        const [cert] = await db.select().from(certifications).where(eq(certifications.id, uc.certificationId));
        if (cert) certDetails.push({
          cert_type: cert.slug.replace(/-/g, '_'),
          title: cert.title,
          verification_code: uc.verificationCode,
          earned_at: uc.earnedAt,
        });
      }

      res.json({
        user_found: true,
        user_email: user.email,
        xp: user.xp || 0,
        level: user.level || 1,
        level_title: getLevelFromXp(user.xp || 0).title,
        total_published: publishedProjects.length,
        total_projects: userProjects.length,
        stats_by_type: statsByType,
        certifications_earned: certDetails,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ecosystem/certifications/sync", async (req, res) => {
    try {
      const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
      const xApiKey = req.headers["x-api-key"] as string | undefined;
      const validStreaming = PSSTREAMING_SECRET && webhookSecret === PSSTREAMING_SECRET;
      const validLms = xApiKey && xApiKey === process.env.PSLMS_API_KEY;
      if (!validStreaming && !validLms) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { cert_id, cert_type, user_email, user_name, issued_at, issued_by, requirements_met, linked_content_ids, xp_at_issue, level_at_issue, school_name } = req.body;
      if (!cert_type || !user_email) return res.status(400).json({ message: "cert_type and user_email required" });

      const user = await storage.getUserByEmail(user_email);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { eq, and } = await import('drizzle-orm');
      const certSlug = cert_type.replace(/_/g, '-');
      const [cert] = await db.select().from(certifications).where(eq(certifications.slug, certSlug));
      if (!cert) return res.status(404).json({ message: `Certification type '${cert_type}' not found` });

      const existing = await db.select().from(userCertifications)
        .where(and(eq(userCertifications.userId, user.id), eq(userCertifications.certificationId, cert.id)));
      if (existing.length > 0) {
        return res.json({ synced: true, already_earned: true, verification_code: existing[0].verificationCode });
      }

      const verificationCode = cert_id || `PS-${certSlug.toUpperCase().replace(/-/g, '')}-${(await import("crypto")).randomBytes(4).toString("hex").toUpperCase()}`;
      const portfolioSnapshot = {
        userName: user_name || user.name || user.username || "Creator",
        level: level_at_issue || user.level || 1,
        xp: xp_at_issue || user.xp || 0,
        issuedBy: issued_by || "Ecosystem",
        schoolName: school_name || undefined,
        requirementsMet: requirements_met,
        linkedContentIds: linked_content_ids,
      };

      const [uc] = await db.insert(userCertifications).values({
        userId: user.id,
        certificationId: cert.id,
        verificationCode,
        portfolioSnapshot,
      }).returning();

      await processProgressionEvent(user.id, "certification_earned", cert.id, "certification");
      console.log(`[ecosystem/cert-sync] Cert ${cert.slug} synced for ${user_email} from ${issued_by || "external"}`);

      res.json({
        synced: true,
        verification_code: uc.verificationCode,
        certification: cert.title,
      });
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        return res.json({ synced: true, already_earned: true });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/certifications/verify/:code", async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      const [uc] = await db.select().from(userCertifications).where(eq(userCertifications.verificationCode, req.params.code));
      if (!uc) return res.status(404).json({ message: "Invalid verification code" });

      const [cert] = await db.select().from(certifications).where(eq(certifications.id, uc.certificationId));
      const user = await storage.getUser(uc.userId);

      res.json({
        valid: true,
        certification: cert?.title || "Unknown",
        certificationSlug: cert?.slug,
        earnedAt: uc.earnedAt,
        holder: {
          name: user?.name || user?.username || "Creator",
          id: uc.userId,
        },
        portfolio: uc.portfolioSnapshot,
        verificationCode: uc.verificationCode,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/certifications", async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      const earned = await db.select().from(userCertifications).where(eq(userCertifications.userId, req.params.userId));
      const certIds = earned.map(e => e.certificationId);
      if (certIds.length === 0) return res.json([]);
      const allCerts = await db.select().from(certifications);
      const certMap = new Map(allCerts.map(c => [c.id, c]));
      const result = earned.map(e => ({
        ...e,
        certification: certMap.get(e.certificationId),
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (user) {
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await storage.createPasswordResetToken(user.id, token, expiresAt);

        const { sendPasswordResetEmail } = await import("./email");
        const baseUrl = req.headers.origin || (process.env.REPLIT_DEPLOYMENT 
          ? "https://pscomixx.com" 
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : `https://${req.headers.host}`);
        
        try {
          await sendPasswordResetEmail(email, token, baseUrl);
          console.log("[auth] Password reset email sent to:", email);
        } catch (emailError: any) {
          console.error("[auth] Failed to send password reset email:", emailError?.message || emailError);
        }
      }
      
      res.json({ message: "If an account exists with this email, a reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (resetToken.used) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.markPasswordResetTokenUsed(token);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  // Profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get counts for the profile
      const [postCount, projectCount, followers, following] = await Promise.all([
        storage.getUserPostCount(req.user!.id),
        storage.getUserProjectCount(req.user!.id),
        storage.getFollowerCount(req.user!.id),
        storage.getFollowingCount(req.user!.id),
      ]);
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: (user as any).username || null,
        avatar: (user as any).avatar || null,
        coverImage: (user as any).coverImage || null,
        tagline: (user as any).tagline || null,
        bio: (user as any).bio || null,
        creatorClass: (user as any).creatorClass || "Rookie",
        xp: (user as any).xp || 0,
        level: (user as any).level || 1,
        statCreativity: (user as any).statCreativity || 10,
        statStorytelling: (user as any).statStorytelling || 10,
        statArtistry: (user as any).statArtistry || 10,
        statCollaboration: (user as any).statCollaboration || 10,
        socialLinks: (user as any).socialLinks || null,
        createdAt: user.createdAt,
        postCount,
        projectCount,
        followers,
        following,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const allowedFields = [
        'name', 'avatar', 'coverImage', 'tagline', 'bio', 
        'creatorClass', 'socialLinks'
      ];
      
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const user = await storage.updateUserProfile(req.user!.id, updates);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      if (req.query.fields === "meta") {
        const meta = await storage.getUserProjectsMeta(req.user!.id);
        return res.json(meta);
      }
      const allProjects = await storage.getUserProjects(req.user!.id);
      res.json(allProjects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id/thumbnail", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      let thumb = project.thumbnail || "";
      if (!thumb) {
        const data = project.data as any;
        thumb = data?.pages?.[0]?.panels?.[0]?.content || data?.coverImage || data?.thumbnail || "";
      }
      res.json({ thumbnail: thumb });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      // Check project limits (admins bypass)
      if (req.user!.role !== "admin") {
        const subscription = await storage.getUserSubscription(req.user!.id);
        const tier = (subscription?.tier || "free") as TierName;
        const entitlements = tierEntitlements[tier] || tierEntitlements.free;
        const maxProjects = entitlements.maxProjects;
        
        if (maxProjects !== -1) {
          const userProjects = await storage.getUserProjectsMeta(req.user!.id);
          if (userProjects.length >= maxProjects) {
            return res.status(403).json({ 
              message: `Project limit reached. Your ${tier} plan allows ${maxProjects} projects. Upgrade for more.`,
              code: "PROJECT_LIMIT_REACHED"
            });
          }
        }
      }

      if (req.body.type && req.body.forceNew !== true) {
        const userProjects = await storage.getUserProjectsMeta(req.user!.id, req.body.type);
        const existing = userProjects
          .sort((a: any, b: any) => {
            const aUpdated = new Date(a.updatedAt).getTime() !== new Date(a.createdAt).getTime();
            const bUpdated = new Date(b.updatedAt).getTime() !== new Date(b.createdAt).getTime();
            if (aUpdated && !bUpdated) return -1;
            if (!aUpdated && bUpdated) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        if (existing.length > 0) {
          return res.status(200).json(existing[0]);
        }
      }

      const { forceNew, ...projectBody } = req.body;
      const result = insertProjectSchema.safeParse({
        ...projectBody,
        userId: req.user!.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }

      const project = await storage.createProject(result.data);
      processProgressionEvent(req.user!.id, "project_created", project.id, "project").catch(() => {});
      if (result.data.type === "hop") {
        processProgressionEvent(req.user!.id, "hop_created", project.id, "project").catch(() => {});
        const hopData = result.data.data as any;
        if (hopData?.type === "series") {
          processProgressionEvent(req.user!.id, "hop_series_created", project.id, "project").catch(() => {});
        }
      }
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Silent backup: snapshot the project state after a meaningful save.
  // Keeps the most recent SNAPSHOT_KEEP per project so a buggy client or
  // accidental overwrite can be recovered without losing student work.
  const SNAPSHOT_KEEP = 10;
  async function snapshotProject(p: { id: string; userId: string; title: string; data: any }, reason: string) {
    try {
      const data = p.data || {};
      const spreads = Array.isArray(data.spreads) ? data.spreads : [];
      let contentScore = 0;
      for (const s of spreads) {
        for (const side of [s?.leftPage, s?.rightPage]) {
          if (Array.isArray(side)) for (const panel of side) contentScore += (panel?.contents?.length || 0);
        }
      }
      // Skip empty snapshots — never pollute history with a blank state.
      if (spreads.length === 0 && contentScore === 0 && reason !== "manual") return;
      await storage.createProjectSnapshot({
        projectId: p.id,
        userId: p.userId,
        title: p.title,
        data,
        spreadCount: spreads.length,
        contentScore,
        reason,
      });
      await storage.pruneProjectSnapshots(p.id, SNAPSHOT_KEEP);
    } catch (err) {
      console.error(`[snapshot] failed for project ${p.id}:`, err);
    }
  }

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // CRITICAL DATA-LOSS PROTECTION: mirror the autosave route's safety checks
      // so a buggy client cannot wipe out a student's pages by sending an empty
      // or partial spreads array. Without this, all pages except the first one
      // can be deleted on save.
      const updateBody: any = { ...req.body };
      if (updateBody.data) {
        const existingData = (project.data as any) || {};
        const incomingData = { ...updateBody.data };

        const existingSpreads = existingData.spreads || [];
        const incomingSpreads = incomingData.spreads || [];
        const hasContent = (sps: any[]) => sps.some((s: any) =>
          (s.leftPage || []).some((p: any) => (p.contents || []).length > 0) ||
          (s.rightPage || []).some((p: any) => (p.contents || []).length > 0)
        );
        const existingHasContent = hasContent(existingSpreads);
        const incomingHasContent = hasContent(incomingSpreads);

        // Block: incoming spreads is empty OR has fewer spreads than existing AND no content
        if (existingHasContent && !incomingHasContent && incomingSpreads.length < existingSpreads.length) {
          console.warn(`[put-project] BLOCKED data-loss overwrite for project ${req.params.id} — existing has ${existingSpreads.length} spreads with content, incoming has ${incomingSpreads.length} empty spreads`);
          incomingData.spreads = existingSpreads;
        }

        // Preserve cover/comicMeta fields if missing from incoming
        if (existingData.comicMeta) {
          const merged = { ...existingData.comicMeta, ...(incomingData.comicMeta || {}) };
          const coverFields = ['frontCover', 'backCover', 'coverProjectId'] as const;
          for (const f of coverFields) {
            if (!(incomingData.comicMeta || {})[f] && existingData.comicMeta[f]) {
              merged[f] = existingData.comicMeta[f];
            }
          }
          incomingData.comicMeta = merged;
        }
        if (!incomingData.coverDesign && existingData.coverDesign) {
          incomingData.coverDesign = existingData.coverDesign;
        }

        updateBody.data = incomingData;
      }

      const updated = await storage.updateProject(req.params.id, updateBody);
      if (updated) {
        snapshotProject({ id: updated.id, userId: updated.userId, title: updated.title, data: updated.data }, "save");
      }
      if (project.type === "hop") {
        processProgressionEvent(req.user!.id, "hop_saved", req.params.id, "project").catch(() => {});
      }
      res.json(updated);
    } catch (error: any) {
      console.error(`[put-project] error saving project ${req.params.id}:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST endpoint for beacon-based auto-save (sendBeacon only supports POST)
  // Merges data fields instead of overwriting to prevent data loss
  app.post("/api/projects/:id/autosave", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const existingData = (project.data as any) || {};
      const incomingData = req.body.data || {};

      const existingSpreads = existingData.spreads || [];
      const incomingSpreads = incomingData.spreads || [];
      const existingHasContent = existingSpreads.some((s: any) => 
        (s.leftPage || []).some((p: any) => (p.contents || []).length > 0) || 
        (s.rightPage || []).some((p: any) => (p.contents || []).length > 0)
      );
      const incomingHasContent = incomingSpreads.some((s: any) => 
        (s.leftPage || []).some((p: any) => (p.contents || []).length > 0) || 
        (s.rightPage || []).some((p: any) => (p.contents || []).length > 0)
      );
      // Block any incoming save where the existing project has real content
      // but the incoming payload doesn't — regardless of whether the incoming
      // spreads array is empty (`[]`) or non-empty-but-blank. This is the
      // exact wipe-out scenario this route exists to prevent.
      if (existingHasContent && !incomingHasContent) {
        console.warn(`[autosave] BLOCKED empty spread overwrite for project ${req.params.id} — existing has ${existingSpreads.length} spreads with content, incoming has ${incomingSpreads.length} blank`);
        delete incomingData.spreads;
      }

      const mergedData = { ...existingData, ...incomingData };
      if (incomingData.comicMeta && existingData.comicMeta) {
        const merged = { ...existingData.comicMeta, ...incomingData.comicMeta };
        const coverFields = ['frontCover', 'backCover', 'coverProjectId'] as const;
        for (const f of coverFields) {
          if (!incomingData.comicMeta[f] && existingData.comicMeta[f]) {
            merged[f] = existingData.comicMeta[f];
          }
        }
        mergedData.comicMeta = merged;
      }
      if (!incomingData.coverDesign && existingData.coverDesign) {
        mergedData.coverDesign = existingData.coverDesign;
      }
      const updatePayload: any = { data: mergedData };
      if (req.body.title) updatePayload.title = req.body.title;
      if (req.body.thumbnail) updatePayload.thumbnail = req.body.thumbnail;
      const updated = await storage.updateProject(req.params.id, updatePayload);
      if (updated) {
        snapshotProject({ id: updated.id, userId: updated.userId, title: updated.title, data: updated.data }, "autosave");
      }
      if (project.type === "hop") {
        processProgressionEvent(req.user!.id, "hop_saved", req.params.id, "project").catch(() => {});
      }
      res.json({ saved: true, id: updated?.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List recent silent backups for a project (most recent first).
  app.get("/api/projects/:id/snapshots", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const snapshots = await storage.getProjectSnapshots(req.params.id, 20);
      // Strip heavy `data` from list view — only return summary metadata.
      const summary = snapshots.map(s => ({
        id: s.id,
        title: s.title,
        spreadCount: s.spreadCount,
        contentScore: s.contentScore,
        reason: s.reason,
        createdAt: s.createdAt,
      }));
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Restore a project to a previous snapshot. Takes a snapshot of the
  // CURRENT state first (reason: "pre-restore") so the restore itself
  // is also reversible. Never destructive.
  app.post("/api/projects/:id/snapshots/:snapId/restore", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const snap = await storage.getProjectSnapshot(req.params.snapId);
      if (!snap || snap.projectId !== req.params.id) {
        return res.status(404).json({ message: "Snapshot not found" });
      }
      // Snapshot the current state first so restore is reversible.
      await snapshotProject({ id: project.id, userId: project.userId, title: project.title, data: project.data }, "pre-restore");
      const updated = await storage.updateProject(req.params.id, { data: snap.data as any, title: snap.title });
      res.json({ restored: true, project: updated });
    } catch (error: any) {
      console.error(`[snapshot-restore] error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects/delete-all-mine", isAuthenticated, async (req, res) => {
    try {
      const allProjects = await storage.getUserProjectsMeta(req.user!.id);
      let deleted = 0;
      for (const p of allProjects) {
        try { await storage.deleteProject(p.id); deleted++; } catch {}
      }
      res.json({ deleted, total: allProjects.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects/bulk-delete", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids must be a non-empty array" });
      }
      if (ids.length > 500) {
        return res.status(400).json({ message: "Cannot delete more than 500 projects at once" });
      }
      const userId = req.user!.id;
      const isAdmin = req.user!.role === "admin";
      let deleted = 0;
      let skipped = 0;
      for (const id of ids) {
        try {
          const project = await storage.getProject(id);
          if (!project) { skipped++; continue; }
          if (project.userId !== userId && !isAdmin) { skipped++; continue; }
          await storage.deleteProject(id);
          deleted++;
        } catch { skipped++; }
      }
      res.json({ deleted, skipped, total: ids.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Asset routes
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      
      const prepareForListing = (assetList: any[]) =>
        assetList.map((asset) => ({
          ...asset,
          url: asset.url || "",
        }));

      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const assets = await storage.getProjectAssets(projectId);
        return res.json(prepareForListing(assets));
      }
      
      const assets = await storage.getUserAssets(req.user!.id);
      res.json(prepareForListing(assets));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const result = insertAssetSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }

      const asset = await storage.createAsset(result.data);
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteAsset(req.params.id);
      res.json({ message: "Asset deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update asset (folder, sort order)
  app.patch("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { folderId, sortOrder, filename } = req.body;
      const updatedAsset = await storage.updateAsset(req.params.id, { 
        folderId, 
        sortOrder,
        filename 
      });
      res.json(updatedAsset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk create assets
  app.post("/api/assets/bulk", isAuthenticated, async (req, res) => {
    try {
      const { assets: assetList } = req.body;
      if (!Array.isArray(assetList) || assetList.length === 0) {
        return res.status(400).json({ message: "Assets array is required" });
      }

      const createdAssets = [];
      for (const assetData of assetList) {
        const result = insertAssetSchema.safeParse({
          ...assetData,
          userId: req.user!.id,
        });
        if (result.success) {
          const asset = await storage.createAsset(result.data);
          createdAssets.push(asset);
        }
      }

      res.status(201).json(createdAssets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reorder assets in folder
  app.post("/api/assets/reorder", isAuthenticated, async (req, res) => {
    try {
      const { assetIds } = req.body;
      if (!Array.isArray(assetIds)) {
        return res.status(400).json({ message: "Asset IDs array is required" });
      }

      for (let i = 0; i < assetIds.length; i++) {
        const asset = await storage.getAsset(assetIds[i]);
        if (!asset) continue;
        if (asset.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ message: "Forbidden: Cannot reorder assets you don't own" });
        }
        await storage.updateAsset(assetIds[i], { sortOrder: i });
      }

      res.json({ message: "Assets reordered" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users/bulk-add", isAdmin, async (req, res) => {
    try {
      const { users: userList, tier, accountType, schoolId } = req.body;
      if (!Array.isArray(userList) || userList.length === 0) {
        return res.status(400).json({ message: "users array is required" });
      }
      if (userList.length > 200) {
        return res.status(400).json({ message: "Maximum 200 users per batch" });
      }

      const results: { email: string; status: "created" | "exists" | "error"; password?: string; error?: string }[] = [];

      for (const entry of userList) {
        const email = (entry.email || "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
          results.push({ email: email || "(empty)", status: "error", error: "Invalid email" });
          continue;
        }
        try {
          const existing = await storage.getUserByEmail(email);
          if (existing) {
            if (tier) {
              const existingSub = await storage.getUserSubscription(existing.id);
              if (existingSub) {
                await storage.updateSubscription(existing.id, { tier, status: "active" });
              } else {
                await storage.createSubscription({ userId: existing.id, tier, status: "active" });
              }
            }
            results.push({ email, status: "exists" });
            continue;
          }

          const chars = "abcdefghijkmnpqrstuvwxyz23456789";
          let tempPassword = "";
          for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

          const hashed = await hashPassword(tempPassword);
          const name = entry.name || email.split("@")[0];

          const newUser = await storage.createUser({
            email,
            password: hashed,
            name,
            role: "creator",
            accountType: accountType || "student",
          });

          if (tier) {
            await storage.createSubscription({
              userId: newUser.id,
              tier,
              status: "active",
            });
          }

          if (schoolId) {
            try {
              await db.insert(schoolMemberships).values({ userId: newUser.id, schoolId, role: "student" });
            } catch {}
          }

          results.push({ email, status: "created", password: tempPassword });
        } catch (err: any) {
          results.push({ email, status: "error", error: err.message });
        }
      }

      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "bulk_add_users",
        targetType: "user",
        targetId: "bulk",
        details: { count: userList.length, created: results.filter(r => r.status === "created").length, existing: results.filter(r => r.status === "exists").length },
      });

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users/bulk-remove", isAdmin, async (req, res) => {
    try {
      const { userIds, action } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds array is required" });
      }
      if (userIds.length > 200) {
        return res.status(400).json({ message: "Maximum 200 users per batch" });
      }

      const results: { id: string; email?: string; status: "done" | "error"; error?: string }[] = [];

      for (const userId of userIds) {
        try {
          if (action === "downgrade") {
            const existingSub = await storage.getUserSubscription(userId);
            if (existingSub) {
              await storage.updateSubscription(userId, { tier: "free", status: "active" });
            }
            results.push({ id: userId, status: "done" });
          } else if (action === "delete") {
            await storage.deleteUserAccount(userId);
            results.push({ id: userId, status: "done" });
          } else {
            const existingSub = await storage.getUserSubscription(userId);
            if (existingSub) {
              await storage.updateSubscription(userId, { tier: "free", status: "inactive" });
            }
            results.push({ id: userId, status: "done" });
          }
        } catch (err: any) {
          results.push({ id: userId, status: "error", error: err.message });
        }
      }

      await storage.createAdminLog({
        adminId: req.user!.id,
        action: `bulk_${action || "downgrade"}_users`,
        targetType: "user",
        targetId: "bulk",
        details: { count: userIds.length, done: results.filter(r => r.status === "done").length },
      });

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/projects", isAdmin, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const projectStats = await storage.getProjectStats();
      const users = await storage.getAllUsers();
      const projects = await storage.getAllProjects();
      
      res.json({
        totalUsers: users.length,
        totalProjects: projects.length,
        projectsByType: projectStats,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PLATFORM ANALYTICS & KPI ROUTES
  // ============================================

  app.get("/api/analytics/platform", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const thisMonth = now.toISOString().slice(0, 7);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        userCountsResult,
        userSignupTrendsResult,
        userActivityResult,
        userAggregatesResult,
        retentionResult,
        usersWithProjectsResult,
        projectCountsResult,
        projectTrendsResult,
        projectViewsResult,
        levelDistResult,
        creatorClassDistResult,
        signupTimelineResult,
        projectTimelineResult,
        crossToolResult,
        powerCreatorsResult,
        atRiskResult,
        consentResult,
        parentalConsentResult,
        topCreatorsResult,
        subscriptionTierResult,
        paidSubsResult,
        revenueResult,
        revenue30dResult,
        marketplaceResult,
        engagementByTypeResult,
        engagement30dResult,
        engagement7dResult,
        aiTodayResult,
        aiMonthResult,
        exportMonthResult,
        uniqueAIResult,
        schoolStatsResult,
        newsletterResult,
        loginStatsResult,
      ] = await Promise.all([
        db.execute(sql`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE account_type = 'student') as students,
          COUNT(*) FILTER (WHERE account_type = 'creator') as creators,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE role = 'teacher') as teachers
          FROM users`),
        db.execute(sql`SELECT
          COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as last_7d,
          COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo}) as last_30d,
          COUNT(*) FILTER (WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}) as prev_30d
          FROM users`),
        db.execute(sql`SELECT
          COUNT(*) FILTER (WHERE last_xp_heartbeat >= ${todayStart}) as dau,
          COUNT(*) FILTER (WHERE last_xp_heartbeat >= ${sevenDaysAgo}) as wau,
          COUNT(*) FILTER (WHERE last_xp_heartbeat >= ${thirtyDaysAgo}) as mau
          FROM users`),
        db.execute(sql`SELECT
          COALESCE(AVG(total_minutes), 0)::int as avg_minutes,
          COALESCE(SUM(total_minutes), 0)::bigint as total_minutes,
          COALESCE(AVG(xp), 0)::int as avg_xp
          FROM users`),
        db.execute(sql`SELECT
          COUNT(*) FILTER (WHERE last_xp_heartbeat > created_at) as retained,
          COUNT(*) as total
          FROM users WHERE created_at >= ${thirtyDaysAgo}`),
        db.execute(sql`SELECT COUNT(DISTINCT user_id) as count FROM projects`),
        db.execute(sql`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COALESCE(SUM(view_count), 0)::bigint as total_views
          FROM projects`),
        db.execute(sql`SELECT
          COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as last_7d,
          COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo}) as last_30d
          FROM projects`),
        db.execute(sql`SELECT COALESCE(SUM(view_count), 0)::bigint as total FROM projects WHERE status = 'published'`),
        db.execute(sql`SELECT
          CASE
            WHEN COALESCE(level, 1) <= 5 THEN '1-5'
            WHEN level <= 10 THEN '6-10'
            WHEN level <= 20 THEN '11-20'
            WHEN level <= 50 THEN '21-50'
            ELSE '50+'
          END as bucket,
          COUNT(*) as count
          FROM users GROUP BY bucket`),
        db.execute(sql`SELECT COALESCE(creator_class, 'Rookie') as cls, COUNT(*) as count
          FROM users GROUP BY cls`),
        db.execute(sql`SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
          FROM users GROUP BY month ORDER BY month`),
        db.execute(sql`SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
          FROM projects GROUP BY month ORDER BY month`),
        db.execute(sql`SELECT COUNT(*) as count FROM (
          SELECT user_id FROM projects GROUP BY user_id HAVING COUNT(DISTINCT type) >= 2
        ) sub`),
        db.execute(sql`SELECT COUNT(*) as count FROM users
          WHERE total_minutes > 300 AND xp > 1000`),
        db.execute(sql`SELECT COUNT(*) as count FROM users
          WHERE (last_xp_heartbeat IS NULL OR last_xp_heartbeat < ${thirtyDaysAgo})
          AND total_minutes > 30`),
        db.execute(sql`SELECT COUNT(*) as count FROM users
          WHERE ip_disclosure_accepted IS NOT NULL OR user_agreement_accepted IS NOT NULL`),
        db.execute(sql`SELECT COUNT(*) as count FROM users
          WHERE account_type = 'student' AND parental_consent_at IS NOT NULL`),
        db.execute(sql`SELECT u.name, u.xp, u.level, u.total_minutes as minutes,
          COALESCE(p.project_count, 0) as projects
          FROM users u
          LEFT JOIN (SELECT user_id, COUNT(*) as project_count FROM projects GROUP BY user_id) p
          ON u.id = p.user_id
          ORDER BY u.xp DESC NULLS LAST LIMIT 10`),
        db.execute(sql`SELECT COALESCE(tier, 'free') as tier, COUNT(*) as count
          FROM subscriptions GROUP BY tier`).catch(() => ({ rows: [] })),
        db.execute(sql`SELECT COUNT(*) as count FROM subscriptions
          WHERE status = 'active' AND tier != 'free'`).catch(() => ({ rows: [{ count: 0 }] })),
        db.execute(sql`SELECT
          COALESCE(SUM(amount), 0)::bigint as total,
          type, COUNT(*) as event_count
          FROM revenue_events GROUP BY type`).catch(() => ({ rows: [] })),
        db.execute(sql`SELECT COALESCE(SUM(amount), 0)::bigint as total
          FROM revenue_events WHERE created_at >= ${thirtyDaysAgo}`).catch(() => ({ rows: [{ total: 0 }] })),
        db.execute(sql`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COALESCE(SUM(sales_count), 0)::bigint as total_sales,
          COALESCE(SUM(total_earnings), 0)::bigint as total_earnings,
          COALESCE(AVG(price_in_cents) FILTER (WHERE price_in_cents > 0), 0)::int as avg_price
          FROM marketplace_listings`).catch(() => ({ rows: [{ total: 0, active: 0, total_sales: 0, total_earnings: 0, avg_price: 0 }] })),
        db.execute(sql`SELECT event_type, COUNT(*) as count
          FROM engagement_events GROUP BY event_type`).catch(() => ({ rows: [] })),
        db.execute(sql`SELECT COUNT(*) as count FROM engagement_events
          WHERE created_at >= ${thirtyDaysAgo}`).catch(() => ({ rows: [{ count: 0 }] })),
        db.execute(sql`SELECT COUNT(*) as count FROM engagement_events
          WHERE created_at >= ${sevenDaysAgo}`).catch(() => ({ rows: [{ count: 0 }] })),
        db.execute(sql`SELECT COALESCE(SUM(count), 0)::bigint as total FROM usage_tracking
          WHERE action_type = 'ai_generation' AND period_key = ${today}`).catch(() => ({ rows: [{ total: 0 }] })),
        db.execute(sql`SELECT COALESCE(SUM(count), 0)::bigint as total FROM usage_tracking
          WHERE action_type = 'ai_generation' AND period_key = ${thisMonth}`).catch(() => ({ rows: [{ total: 0 }] })),
        db.execute(sql`SELECT COALESCE(SUM(count), 0)::bigint as total FROM usage_tracking
          WHERE action_type = 'export' AND period_key = ${thisMonth}`).catch(() => ({ rows: [{ total: 0 }] })),
        db.execute(sql`SELECT COUNT(DISTINCT user_id) as count FROM usage_tracking
          WHERE action_type = 'ai_generation'`).catch(() => ({ rows: [{ count: 0 }] })),
        db.execute(sql`SELECT s.id, s.name, s.verified,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'student') as student_count,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'teacher') as teacher_count,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'admin') as admin_count,
          COALESCE(SUM(u.xp), 0)::bigint as total_xp,
          COALESCE(SUM(u.total_minutes), 0)::bigint as total_minutes
          FROM schools s LEFT JOIN school_memberships sm ON s.id = sm.school_id
          LEFT JOIN users u ON sm.user_id = u.id
          GROUP BY s.id, s.name, s.verified
          ORDER BY student_count DESC`).catch(() => ({ rows: [] })),
        db.execute(sql`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active
          FROM newsletter_subscribers`).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
        db.execute(sql`SELECT
          COUNT(*) FILTER (WHERE login_count > 0) as users_with_logins,
          COALESCE(AVG(login_count) FILTER (WHERE login_count > 0), 0)::int as avg_logins,
          COUNT(*) FILTER (WHERE last_login_at >= ${sevenDaysAgo}) as logins_7d
          FROM users`).catch(() => ({ rows: [{ users_with_logins: 0, avg_logins: 0, logins_7d: 0 }] })),
      ]);

      const uc = userCountsResult.rows[0] as any;
      const totalUsers = Number(uc.total);
      const studentUsers = Number(uc.students);
      const creatorUsers = Number(uc.creators);
      const adminUsers = Number(uc.admins);
      const teacherUsers = Number(uc.teachers);

      const ut = userSignupTrendsResult.rows[0] as any;
      const usersLast7d = Number(ut.last_7d);
      const usersLast30d = Number(ut.last_30d);
      const usersPrev30d = Number(ut.prev_30d);
      const userGrowthRate = usersPrev30d > 0 ? ((usersLast30d - usersPrev30d) / usersPrev30d * 100).toFixed(1) : "N/A";

      const ua = userActivityResult.rows[0] as any;
      const activeToday = Number(ua.dau);
      const activeLast7d = Number(ua.wau);
      const activeLast30d = Number(ua.mau);
      const dauMauRatio = activeLast30d > 0 ? (activeToday / activeLast30d * 100).toFixed(1) : "0";

      const uag = userAggregatesResult.rows[0] as any;
      const avgTimeSpent = Number(uag.avg_minutes);
      const totalPlatformMinutes = Number(uag.total_minutes);
      const avgXpPerUser = Number(uag.avg_xp);

      const ret = retentionResult.rows[0] as any;
      const day30Retention = Number(ret.total) > 0 ? (Number(ret.retained) / Number(ret.total) * 100).toFixed(1) : "0";

      const usersWithProjects = Number((usersWithProjectsResult.rows[0] as any).count);
      const activationRate = totalUsers > 0 ? (usersWithProjects / totalUsers * 100).toFixed(1) : "0";

      const pc = projectCountsResult.rows[0] as any;
      const totalProjects = Number(pc.total);
      const publishedProjects = Number(pc.published);
      const totalContentViews = Number(pc.total_views);

      const pt = projectTrendsResult.rows[0] as any;
      const projectsLast7d = Number(pt.last_7d);
      const projectsLast30d = Number(pt.last_30d);
      const avgProjectsPerUser = totalUsers > 0 ? (totalProjects / totalUsers).toFixed(1) : "0";
      const publishRate = totalProjects > 0 ? (publishedProjects / totalProjects * 100).toFixed(1) : "0";
      const avgViewsPerProject = publishedProjects > 0 ? Math.round(totalContentViews / publishedProjects) : 0;
      const contentVelocity = activeLast30d > 0 ? (projectsLast30d / activeLast30d).toFixed(2) : "0";

      const projectsByType: Record<string, number> = {};
      const projectsByStatus: Record<string, number> = {};
      try {
        const typeRows = await db.execute(sql`SELECT type, COUNT(*) as count FROM projects GROUP BY type`);
        typeRows.rows.forEach((r: any) => { projectsByType[r.type] = Number(r.count); });
        const statusRows = await db.execute(sql`SELECT status, COUNT(*) as count FROM projects GROUP BY status`);
        statusRows.rows.forEach((r: any) => { projectsByStatus[r.status] = Number(r.count); });
      } catch {}

      const levelDistribution: Record<string, number> = {};
      levelDistResult.rows.forEach((r: any) => { levelDistribution[r.bucket] = Number(r.count); });

      const creatorClassDistribution: Record<string, number> = {};
      creatorClassDistResult.rows.forEach((r: any) => { creatorClassDistribution[r.cls] = Number(r.count); });

      const userSignupTimeline: Record<string, number> = {};
      signupTimelineResult.rows.forEach((r: any) => { userSignupTimeline[r.month] = Number(r.count); });

      const projectCreationTimeline: Record<string, number> = {};
      projectTimelineResult.rows.forEach((r: any) => { projectCreationTimeline[r.month] = Number(r.count); });

      const multiToolCreators = Number((crossToolResult.rows[0] as any).count);
      const crossToolAdoption = totalUsers > 0 ? (multiToolCreators / totalUsers * 100).toFixed(1) : "0";

      const powerCreators = Number((powerCreatorsResult.rows[0] as any).count);
      const atRiskUsers = Number((atRiskResult.rows[0] as any).count);

      const consentCount = Number((consentResult.rows[0] as any).count);
      const consentCompletionRate = totalUsers > 0 ? (consentCount / totalUsers * 100).toFixed(1) : "0";
      const parentalConsentCount = Number((parentalConsentResult.rows[0] as any).count);
      const parentalConsentRate = studentUsers > 0 ? (parentalConsentCount / studentUsers * 100).toFixed(1) : "0";

      const topCreators = topCreatorsResult.rows.map((r: any) => ({
        name: r.name, xp: r.xp, level: r.level, minutes: r.minutes, projects: Number(r.projects),
      }));

      const subscriptionsByTier: Record<string, number> = {};
      subscriptionTierResult.rows.forEach((r: any) => { subscriptionsByTier[r.tier] = Number(r.count); });
      const paidSubscriptionsCount = Number((paidSubsResult.rows[0] as any).count);
      const conversionRate = totalUsers > 0 ? (paidSubscriptionsCount / totalUsers * 100).toFixed(1) : "0";

      let totalRevenue = 0;
      const revenueByType: Record<string, number> = {};
      revenueResult.rows.forEach((r: any) => {
        totalRevenue += Number(r.total);
        revenueByType[r.type] = Number(r.total);
      });
      const revenueLast30d = Number((revenue30dResult.rows[0] as any).total);
      const arpu = paidSubscriptionsCount > 0 ? (totalRevenue / paidSubscriptionsCount / 100).toFixed(2) : "0";

      const mp = marketplaceResult.rows[0] as any;
      const totalListings = Number(mp.total);
      const activeListings = Number(mp.active);
      const totalSales = Number(mp.total_sales);
      const totalMarketplaceRevenue = Number(mp.total_earnings);
      const avgPricePoint = Number(mp.avg_price);

      const engagementByType: Record<string, number> = {};
      engagementByTypeResult.rows.forEach((r: any) => { engagementByType[r.event_type] = Number(r.count); });
      const engagementLast30d = Number((engagement30dResult.rows[0] as any).count);
      const engagementLast7d = Number((engagement7dResult.rows[0] as any).count);

      const aiUsageToday = Number((aiTodayResult.rows[0] as any).total);
      const aiUsageMonth = Number((aiMonthResult.rows[0] as any).total);
      const exportUsageMonth = Number((exportMonthResult.rows[0] as any).total);
      const uniqueAIUsers = Number((uniqueAIResult.rows[0] as any).count);
      const aiAdoptionRate = totalUsers > 0 ? (uniqueAIUsers / totalUsers * 100).toFixed(1) : "0";

      const schoolStats = schoolStatsResult.rows.map((r: any) => ({
        id: r.id, name: r.name, verified: r.verified,
        students: Number(r.student_count), teachers: Number(r.teacher_count), admins: Number(r.admin_count),
        totalXp: Number(r.total_xp || 0), totalMinutes: Number(r.total_minutes || 0),
      }));
      const totalSchools = schoolStats.length;
      const totalSchoolStudents = schoolStats.reduce((s: number, sc: any) => s + sc.students, 0);
      const totalSchoolTeachers = schoolStats.reduce((s: number, sc: any) => s + sc.teachers, 0);

      const nl = newsletterResult.rows[0] as any;
      const ls = loginStatsResult.rows[0] as any;

      res.json({
        generatedAt: now.toISOString(),
        growth: {
          totalUsers, studentUsers, creatorUsers, adminUsers, teacherUsers,
          usersLast7d, usersLast30d, userGrowthRate, userSignupTimeline,
        },
        engagement: {
          dau: activeToday, wau: activeLast7d, mau: activeLast30d, dauMauRatio,
          avgTimeSpentMinutes: avgTimeSpent, totalPlatformMinutes, avgXpPerUser,
          day30Retention, activationRate,
          engagementByType, engagementLast7d, engagementLast30d,
          usersLoggedIn7d: Number(ls.logins_7d),
          avgLoginsPerUser: Number(ls.avg_logins),
        },
        content: {
          totalProjects, projectsByType, projectsByStatus,
          projectsLast7d, projectsLast30d, avgProjectsPerUser,
          publishRate, totalContentViews, avgViewsPerProject,
          contentVelocity, projectCreationTimeline,
        },
        revenue: {
          totalRevenueCents: totalRevenue, revenueLast30dCents: revenueLast30d,
          revenueByType, arpu, subscriptionsByTier,
          paidSubscriptions: paidSubscriptionsCount, conversionRate,
          totalListings, activeListings,
          totalMarketplaceSales: totalSales,
          totalMarketplaceRevenueCents: totalMarketplaceRevenue,
          avgPricePointCents: avgPricePoint,
        },
        aiPlatform: {
          aiUsageToday, aiUsageMonth, exportUsageMonth, uniqueAIUsers, aiAdoptionRate,
        },
        userHealth: {
          levelDistribution, creatorClassDistribution, crossToolAdoption,
          powerCreators, atRiskUsers, topCreators,
        },
        compliance: {
          consentCompletionRate, parentalConsentRate,
        },
        schools: {
          totalSchools, totalSchoolStudents, totalSchoolTeachers, schoolStats,
        },
        newsletter: {
          totalSubscribers: Number(nl.total),
          activeSubscribers: Number(nl.active),
        },
      });
    } catch (error: any) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // ECOSYSTEM API ROUTES
  // ============================================

  // Get user progression (XP, badges, teams, schools, hubs)
  app.get("/api/ecosystem/progression", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const progression = await storage.getUserProgression(userId);
      res.json(progression);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ecosystem/xp-sync", async (req, res) => {
    try {
      const xApiKey = req.headers["x-api-key"] as string | undefined;
      const supabaseApiKey = req.headers["apikey"] as string | undefined;
      const authBearer = (req.headers["authorization"] || "").toString().replace(/^Bearer\s+/i, "");
      const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
      const validPslms = xApiKey && xApiKey === process.env.PSLMS_API_KEY;
      const fxKey = process.env.FX_STUDIO_API_KEY || "";
      const validFx = fxKey && (supabaseApiKey === fxKey || authBearer === fxKey || xApiKey === fxKey);
      const validStreaming = PSSTREAMING_SECRET && webhookSecret === PSSTREAMING_SECRET;
      if (!validPslms && !validFx && !validStreaming) {
        console.error(`[ecosystem/xp-sync] Auth failed. Headers present: x-api-key=${!!xApiKey}, apikey=${!!supabaseApiKey}, bearer=${!!authBearer}, x-webhook-secret=${!!webhookSecret}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { user_email, total_xp, level, level_title, total_minutes, source, action, xp_awarded } = req.body;
      if (!user_email) return res.status(400).json({ message: "user_email required" });
      const user = await storage.getUserByEmail(user_email);
      if (!user) return res.status(404).json({ message: "User not found" });

      const incomingXp = total_xp ?? 0;
      const currentXp = user.xp || 0;
      const mergedXp = Math.max(currentXp, incomingXp);
      const mergedMinutes = Math.max(user.totalMinutes || 0, total_minutes || 0);
      const { level: newLevel, title: newTitle } = getLevelFromXp(mergedXp);

      await storage.updateUserProfile(user.id, {
        xp: mergedXp,
        level: newLevel,
        totalMinutes: mergedMinutes,
      } as any);

      const SOURCE_TO_ENDPOINT: Record<string, string> = {
        psstreaming: "PSStreaming",
        pslms: "PSLMS",
        lms: "PSLMS",
        fxstudio: "FXStudio",
        fx: "FXStudio",
        pressplays: "FXStudio",
      };
      const isRelay = (source || "").includes("relay");
      const srcLower = (source || "").toLowerCase().replace(/[-_\s]/g, "");
      const originEndpointName = SOURCE_TO_ENDPOINT[srcLower] || "";

      if (mergedXp > currentXp && !isRelay) {
        const rebroadcastEndpoints = ECOSYSTEM_XP_ENDPOINTS.filter(ep => ep.name !== originEndpointName);
        const rebroadcastTimestamp = new Date().toISOString();
        for (const ep of rebroadcastEndpoints) {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 5000);
          const hdrs: Record<string, string> = { "Content-Type": "application/json" };
          let rbBody: string;
          if (ep.name === "PSStreaming") {
            hdrs["x-webhook-secret"] = PSSTREAMING_SECRET;
            rbBody = JSON.stringify({ user_id: user.id, user_email, action: action || "sync", xp_amount: xp_awarded || 0, total_xp: mergedXp, level: newLevel, level_title: newTitle, total_minutes: mergedMinutes, source_platform: "pscomixx", timestamp: rebroadcastTimestamp });
          } else if (ep.name === "FXStudio") {
            hdrs["apikey"] = FX_STUDIO_ANON_KEY;
            hdrs["Authorization"] = `Bearer ${FX_STUDIO_ANON_KEY}`;
            rbBody = JSON.stringify({ event: "xp.sync", user_email, xp_awarded: xp_awarded || 0, action: action || "sync", total_xp: mergedXp, level: newLevel, level_title: newTitle, total_minutes: mergedMinutes, source: "comixx-relay", timestamp: rebroadcastTimestamp });
          } else {
            hdrs["X-API-Key"] = ECOSYSTEM_API_KEY;
            rbBody = JSON.stringify({ event: "xp.sync", user_email, xp_awarded: xp_awarded || 0, action: action || "sync", total_xp: mergedXp, level: newLevel, level_title: newTitle, total_minutes: mergedMinutes, source: "comixx-relay", timestamp: rebroadcastTimestamp });
          }
          fetch(ep.url, {
            method: "POST",
            headers: hdrs,
            body: rbBody,
            signal: ctrl.signal,
          }).catch(() => {}).finally(() => clearTimeout(to));
        }
      }

      res.json({
        synced: true,
        xp: mergedXp,
        total_xp: mergedXp,
        level: newLevel,
        levelTitle: newTitle,
        level_title: newTitle,
        totalMinutes: mergedMinutes,
        total_minutes: mergedMinutes,
        source: source || "ecosystem",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ecosystem/subscription-check", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== process.env.PSLMS_API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const email = (req.query.email as string || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ message: "email required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found", hasSubscription: false });

      const subscription = await storage.getUserSubscription(user.id);
      const tier = subscription?.tier || "free";
      const hasActiveSubscription = tier !== "free" && subscription?.status === "active";

      const { level, title: levelTitle } = getLevelFromXp(user.xp || 0);

      res.json({
        hasSubscription: hasActiveSubscription,
        tier,
        status: subscription?.status || "none",
        xp: user.xp || 0,
        level,
        levelTitle,
        totalMinutes: user.totalMinutes || 0,
        pressplaysAccess: hasActiveSubscription,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ecosystem/xp", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { amount, action, description, referenceId, referenceType } = req.body;
      
      if (!amount || !action) {
        return res.status(400).json({ message: "Amount and action are required" });
      }

      const result = await storage.earnXp(userId, amount, action, description, referenceId, referenceType);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get learning pathways
  app.get("/api/ecosystem/pathways", async (req, res) => {
    try {
      const pathways = await storage.getLearningPathways();
      res.json(pathways);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get lessons for a pathway
  app.get("/api/ecosystem/pathways/:id/lessons", async (req, res) => {
    try {
      const lessons = await storage.getLessonsForPathway(req.params.id);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's lesson progress
  app.get("/api/ecosystem/progress", isAuthenticated, async (req, res) => {
    try {
      const progress = await storage.getUserLessonProgress(req.user!.id);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update lesson progress
  app.post("/api/ecosystem/progress", isAuthenticated, async (req, res) => {
    try {
      const { lessonId, pathwayId, status, progressPercent, challengeSubmission } = req.body;
      const progress = await storage.updateLessonProgress(
        req.user!.id, 
        lessonId, 
        pathwayId, 
        status, 
        progressPercent, 
        challengeSubmission
      );
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all badges
  app.get("/api/ecosystem/badges", async (req, res) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's earned badges
  app.get("/api/ecosystem/my-badges", isAuthenticated, async (req, res) => {
    try {
      const badges = await storage.getUserBadges(req.user!.id);
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hop/check-badges", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sceneCount = typeof req.body.sceneCount === "number" ? req.body.sceneCount : 0;
      const hasMusicSync = !!req.body.hasMusicSync;
      const awarded: string[] = [];

      const allBadges = await storage.getAllBadges();
      const userBadgesList = await storage.getUserBadges(userId);
      const earnedIds = new Set(userBadgesList.map(ub => ub.badgeId));

      let directorBadge = allBadges.find(b => b.name === "HOP Director");
      if (!directorBadge) {
        const [created] = await db.insert(badges).values({
          name: "HOP Director",
          description: "Created a HOP with 5+ scenes",
          icon: "🎬",
          category: "achievement",
          xpReward: 50,
          rarity: "uncommon",
          requirements: { minScenes: 5 },
        }).returning();
        directorBadge = created;
      }

      let producerBadge = allBadges.find(b => b.name === "HOP Producer");
      if (!producerBadge) {
        const [created] = await db.insert(badges).values({
          name: "HOP Producer",
          description: "Created a music-synced HOP with beat markers",
          icon: "🎵",
          category: "achievement",
          xpReward: 75,
          rarity: "rare",
          requirements: { musicSync: true },
        }).returning();
        producerBadge = created;
      }

      if (sceneCount >= 5 && directorBadge && !earnedIds.has(directorBadge.id)) {
        await db.insert(userBadges).values({ userId, badgeId: directorBadge.id });
        awarded.push("HOP Director");
      }

      if (hasMusicSync && producerBadge && !earnedIds.has(producerBadge.id)) {
        await db.insert(userBadges).values({ userId, badgeId: producerBadge.id });
        awarded.push("HOP Producer");
      }

      res.json({ awarded, message: awarded.length > 0 ? `Earned: ${awarded.join(", ")}` : "No new badges" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get teams
  app.get("/api/ecosystem/teams", async (req, res) => {
    try {
      const teams = await storage.getPublicTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's teams
  app.get("/api/ecosystem/my-teams", isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.getUserTeams(req.user!.id);
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create team
  app.post("/api/ecosystem/teams", isAuthenticated, async (req, res) => {
    try {
      const { name, description, isPublic, tags } = req.body;
      const team = await storage.createTeam({
        name,
        description,
        leaderId: req.user!.id,
        isPublic: isPublic ?? true,
        tags,
      });
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get team by ID with members
  app.get("/api/ecosystem/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      const members = await storage.getTeamMembers(team.id);
      const isMember = await storage.isTeamMember(team.id, req.user!.id);
      res.json({ ...team, members, isMember });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Join team by invite code
  app.post("/api/ecosystem/teams/join/:inviteCode", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeamByInviteCode(req.params.inviteCode);
      if (!team) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      const members = await storage.getTeamMembers(team.id);
      if (team.maxMembers && members.length >= team.maxMembers) {
        return res.status(400).json({ message: "Team is full" });
      }
      
      const member = await storage.joinTeam(team.id, req.user!.id, "member");
      res.json({ team, member });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leave team
  app.delete("/api/ecosystem/teams/:id/leave", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.leaderId === req.user!.id) {
        return res.status(400).json({ message: "Leader cannot leave the team. Transfer leadership first." });
      }
      
      const success = await storage.leaveTeam(req.params.id, req.user!.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Regenerate team invite code (leader only)
  app.post("/api/ecosystem/teams/:id/regenerate-invite", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.leaderId !== req.user!.id) {
        return res.status(403).json({ message: "Only the team leader can regenerate the invite code" });
      }
      
      const updated = await storage.regenerateTeamInviteCode(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update team member role (leader only)
  app.patch("/api/ecosystem/teams/:id/members/:userId/role", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.leaderId !== req.user!.id) {
        return res.status(403).json({ message: "Only the team leader can change member roles" });
      }
      
      const { role } = req.body;
      if (!["member", "co-leader"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const success = await storage.updateTeamMemberRole(req.params.id, req.params.userId, role);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove team member (leader only)
  app.delete("/api/ecosystem/teams/:id/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.leaderId !== req.user!.id) {
        return res.status(403).json({ message: "Only the team leader can remove members" });
      }
      
      if (req.params.userId === team.leaderId) {
        return res.status(400).json({ message: "Cannot remove the team leader" });
      }
      
      const success = await storage.leaveTeam(req.params.id, req.params.userId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get festivals
  app.get("/api/ecosystem/festivals", async (req, res) => {
    try {
      const festivals = await storage.getFestivals();
      res.json(festivals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get festival by ID
  app.get("/api/ecosystem/festivals/:id", async (req, res) => {
    try {
      const festival = await storage.getFestival(req.params.id);
      if (!festival) {
        return res.status(404).json({ message: "Festival not found" });
      }
      res.json(festival);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get festival submissions
  app.get("/api/ecosystem/festivals/:id/submissions", async (req, res) => {
    try {
      const submissions = await storage.getFestivalSubmissions(req.params.id);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Submit to festival
  app.post("/api/ecosystem/festivals/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const { projectId, category, title, description, thumbnail, schoolId } = req.body;
      const submission = await storage.createFestivalSubmission({
        festivalId: req.params.id,
        projectId,
        userId: req.user!.id,
        category,
        title,
        description,
        thumbnail,
        schoolId,
      });
      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vote for submission
  app.post("/api/ecosystem/submissions/:id/vote", isAuthenticated, async (req, res) => {
    try {
      const vote = await storage.voteForSubmission(req.params.id, req.user!.id);
      res.json(vote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get schools
  app.get("/api/ecosystem/schools", async (req, res) => {
    try {
      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get creator hubs
  app.get("/api/ecosystem/hubs", async (req, res) => {
    try {
      const hubs = await storage.getCreatorHubs();
      res.json(hubs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get publishing channels
  app.get("/api/ecosystem/channels", async (req, res) => {
    try {
      const channels = await storage.getPublishChannels();
      res.json(channels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's channels
  app.get("/api/ecosystem/my-channels", isAuthenticated, async (req, res) => {
    try {
      const channels = await storage.getUserChannels(req.user!.id);
      res.json(channels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create channel
  app.post("/api/ecosystem/channels", isAuthenticated, async (req, res) => {
    try {
      const { name, slug, description, avatar, banner } = req.body;
      const channel = await storage.createPublishChannel({
        ownerId: req.user!.id,
        ownerType: "user",
        name,
        slug,
        description,
        avatar,
        banner,
      });
      res.json(channel);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publish content
  app.post("/api/ecosystem/publish", isAuthenticated, async (req, res) => {
    try {
      const { projectId, channelId, title, description, thumbnail, contentType, tags, monetized } = req.body;
      const content = await storage.publishContent({
        projectId,
        channelId,
        title,
        description,
        thumbnail,
        contentType,
        tags,
        monetized,
      });
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's revenue
  app.get("/api/ecosystem/revenue", isAuthenticated, async (req, res) => {
    try {
      const revenue = await storage.getUserRevenue(req.user!.id);
      res.json(revenue);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // SOCIAL MEDIA ROUTES
  // ============================================

  // Create a social post
  app.post("/api/social/posts", isAuthenticated, async (req, res) => {
    try {
      const { projectId, type, caption, mediaUrls, visibility } = req.body;
      const user = req.user as any;

      if (caption) {
        const result = filterContent(caption);
        if (!result.clean && user.accountType === "student") {
          await logAuditEvent("content_blocked", { req, userId: user.id, resourceType: "social_post", metadata: { flags: result.flagged } });
          return res.status(400).json({ message: "Your post contains content that isn't allowed. Please revise and try again." });
        }
      }

      const post = await storage.createSocialPost({
        authorId: req.user!.id,
        projectId,
        type: type || "post",
        caption,
        mediaUrls,
        visibility: visibility || "public",
      });
      await auditStudent("social_post_create", req, "social_post", post.id);
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get feed (posts from followed users)
  app.get("/api/social/feed", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getFeedPosts(req.user!.id, limit, offset);
      
      const postsWithLikeStatus = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          isLiked: await storage.isPostLiked(post.id, req.user!.id),
        }))
      );
      
      res.json(postsWithLikeStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get explore feed (all public posts)
  app.get("/api/social/explore", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const viewerId = req.isAuthenticated() ? req.user!.id : undefined;
      const posts = await storage.getExplorePosts(limit, offset, viewerId);
      
      if (req.isAuthenticated()) {
        const postsWithLikeStatus = await Promise.all(
          posts.map(async (post) => ({
            ...post,
            isLiked: await storage.isPostLiked(post.id, req.user!.id),
          }))
        );
        return res.json(postsWithLikeStatus);
      }
      
      res.json(posts.map(p => ({ ...p, isLiked: false })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // USER BLOCKING (Apple Guideline 1.2 compliance)
  // ============================================

  app.post("/api/users/:id/block", isAuthenticated, async (req, res) => {
    try {
      const blockerId = req.user!.id;
      const blockedId = req.params.id;
      if (blockerId === blockedId) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }
      const target = await storage.getUser(blockedId);
      if (!target) return res.status(404).json({ message: "User not found" });
      const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 280) : undefined;
      const block = await storage.blockUser(blockerId, blockedId, reason);
      // Auto-unfollow in both directions so the block is immediately effective
      // across follow-based surfaces (feed, suggestions).
      try { await storage.unfollowUser(blockerId, blockedId); } catch {}
      try { await storage.unfollowUser(blockedId, blockerId); } catch {}
      res.json({ success: true, block });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id/block", isAuthenticated, async (req, res) => {
    try {
      const ok = await storage.unblockUser(req.user!.id, req.params.id);
      res.json({ success: ok });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/me/blocks", isAuthenticated, async (req, res) => {
    try {
      const rows = await storage.getBlockedUsers(req.user!.id);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/block-status", isAuthenticated, async (req, res) => {
    try {
      const blocked = await storage.isBlocked(req.user!.id, req.params.id);
      res.json({ blocked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single post
  app.get("/api/social/posts/:id", async (req, res) => {
    try {
      const post = await storage.getSocialPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.visibility === "private") {
        if (!req.isAuthenticated() || req.user!.id !== post.authorId) {
          return res.status(403).json({ message: "This post is private" });
        }
      }
      
      if (post.visibility === "followers") {
        if (!req.isAuthenticated()) {
          return res.status(403).json({ message: "Please sign in to view this post" });
        }
        if (req.user!.id !== post.authorId) {
          const isFollowing = await storage.isFollowing(req.user!.id, post.authorId);
          if (!isFollowing) {
            return res.status(403).json({ message: "You must follow this user to view their post" });
          }
        }
      }
      
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Like a post
  app.post("/api/social/posts/:id/like", isAuthenticated, async (req, res) => {
    try {
      const isAlreadyLiked = await storage.isPostLiked(req.params.id, req.user!.id);
      if (isAlreadyLiked) {
        return res.status(400).json({ message: "Already liked" });
      }
      
      const like = await storage.likePost(req.params.id, req.user!.id);
      
      const post = await storage.getSocialPost(req.params.id);
      if (post && post.authorId !== req.user!.id) {
        await storage.createNotification({
          userId: post.authorId,
          actorId: req.user!.id,
          type: "like",
          metadata: { postId: req.params.id },
        });
      }
      
      res.json(like);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unlike a post
  app.delete("/api/social/posts/:id/like", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.unlikePost(req.params.id, req.user!.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add comment to post
  app.post("/api/social/posts/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { body, parentId } = req.body;
      const comment = await storage.addComment({
        postId: req.params.id,
        authorId: req.user!.id,
        body,
        parentId,
      });
      
      const post = await storage.getSocialPost(req.params.id);
      if (post && post.authorId !== req.user!.id) {
        await storage.createNotification({
          userId: post.authorId,
          actorId: req.user!.id,
          type: "comment",
          metadata: { postId: req.params.id, commentId: comment.id },
        });
      }
      
      res.json(comment);
    } catch (error: any) {
      if (error?.message?.includes("cannot comment")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get comments for a post
  app.get("/api/social/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id, req.user?.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Follow a user
  app.post("/api/social/follow/:userId", isAuthenticated, async (req, res) => {
    try {
      if (req.params.userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      
      const isAlreadyFollowing = await storage.isFollowing(req.user!.id, req.params.userId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following" });
      }
      
      const follow = await storage.followUser(req.user!.id, req.params.userId);
      
      await storage.createNotification({
        userId: req.params.userId,
        actorId: req.user!.id,
        type: "follow",
        metadata: {},
      });
      
      res.json(follow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unfollow a user
  app.delete("/api/social/follow/:userId", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.unfollowUser(req.user!.id, req.params.userId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public portfolio - get user's published projects (no auth required)
  app.get("/api/portfolio/:userId/public", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }

      const allProjects = await storage.getUserProjectsMeta(req.params.userId);
      const publishedProjects = allProjects.filter(
        (p: any) => p.status === "published" || p.status === "approved"
      );

      const safeProjects = publishedProjects.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        status: p.status,
        thumbnail: p.thumbnail,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      res.json({
        profile: {
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          coverImage: profile.coverImage,
          tagline: profile.tagline,
          bio: profile.bio,
          creatorClass: profile.creatorClass,
          xp: profile.xp,
          level: profile.level,
          socialLinks: (profile as any).socialLinks || null,
          totalMinutes: (profile as any).totalMinutes || 0,
        },
        projects: safeProjects,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user profile
  app.get("/api/social/profile/:userId", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let isFollowing = false;
      if (req.isAuthenticated()) {
        isFollowing = await storage.isFollowing(req.user!.id, req.params.userId);
      }
      
      res.json({ ...profile, isFollowing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user's followers
  app.get("/api/social/followers", isAuthenticated, async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.user!.id);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user's following
  app.get("/api/social/following", isAuthenticated, async (req, res) => {
    try {
      const following = await storage.getFollowing(req.user!.id);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search users
  app.get("/api/social/search-users", isAuthenticated, async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      if (query.length < 2) {
        return res.json([]);
      }
      
      const allUsers = await storage.getAllUsers();
      const filtered = allUsers
        .filter(u => u.id !== req.user!.id && u.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20);
      
      const usersWithFollowStatus = await Promise.all(
        filtered.map(async (u) => {
          const isFollowing = await storage.isFollowing(req.user!.id, u.id);
          const counts = await storage.getFollowCounts(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            creatorClass: u.creatorClass,
            level: u.level,
            createdAt: u.createdAt,
            followerCount: counts.followers,
            followingCount: counts.following,
            isFollowing,
          };
        })
      );
      
      res.json(usersWithFollowStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get suggested users to follow
  app.get("/api/social/suggested-users", isAuthenticated, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const following = await storage.getFollowing(req.user!.id);
      const followingIds = new Set(following.map(f => f.id));
      
      const suggestions = allUsers
        .filter(u => u.id !== req.user!.id && !followingIds.has(u.id))
        .slice(0, 10);
      
      const usersWithStats = await Promise.all(
        suggestions.map(async (u) => {
          const counts = await storage.getFollowCounts(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            creatorClass: u.creatorClass,
            level: u.level,
            createdAt: u.createdAt,
            followerCount: counts.followers,
            followingCount: counts.following,
            isFollowing: false,
          };
        })
      );
      
      res.json(usersWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get newest members (most recent signups)
  app.get("/api/social/newest-members", isAuthenticated, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const newest = allUsers
        .filter(u => u.id !== req.user!.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
      
      const usersWithStats = await Promise.all(
        newest.map(async (u) => {
          const isFollowing = await storage.isFollowing(req.user!.id, u.id);
          const counts = await storage.getFollowCounts(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            creatorClass: u.creatorClass,
            level: u.level,
            createdAt: u.createdAt,
            followerCount: counts.followers,
            followingCount: counts.following,
            isFollowing,
          };
        })
      );
      
      res.json(usersWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // DM ROUTES
  // ============================================

  // Get user's DM threads
  app.get("/api/dm/threads", isAuthenticated, async (req, res) => {
    try {
      const threads = await storage.getUserDmThreads(req.user!.id);
      res.json(threads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start or get existing DM with a user
  app.post("/api/dm/threads", isAuthenticated, async (req, res) => {
    try {
      const { userId, isGroup, name } = req.body;
      
      if (!isGroup && userId) {
        const existing = await storage.findExistingDmThread(req.user!.id, userId);
        if (existing) {
          return res.json(existing);
        }
        
        const thread = await storage.createDmThread(false);
        await storage.addDmParticipant(thread.id, req.user!.id, "owner");
        await storage.addDmParticipant(thread.id, userId, "member");
        return res.json(thread);
      }
      
      const thread = await storage.createDmThread(true, name);
      await storage.addDmParticipant(thread.id, req.user!.id, "owner");
      res.json(thread);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages in a thread
  app.get("/api/dm/threads/:threadId/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getDmMessages(req.params.threadId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send message in a thread
  app.post("/api/dm/threads/:threadId/messages", isAuthenticated, async (req, res) => {
    try {
      const { body, attachments } = req.body;
      const user = req.user as any;

      if (body && user.accountType === "student") {
        const result = filterContent(body);
        if (!result.clean) {
          await logAuditEvent("dm_content_blocked", { req, userId: user.id, resourceType: "dm_message", metadata: { threadId: req.params.threadId, flags: result.flagged } });
          return res.status(400).json({ message: "Your message contains content that isn't allowed." });
        }
        await logAuditEvent("student_dm_sent", { req, userId: user.id, resourceType: "dm_message", metadata: { threadId: req.params.threadId } });
      }

      const message = await storage.sendDmMessage({
        threadId: req.params.threadId,
        senderId: req.user!.id,
        body,
        attachments,
      });
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // NOTIFICATION ROUTES
  // ============================================

  // Get user's notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get unread count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // COLLAB ROUTES
  // ============================================

  // Create a collab session
  app.post("/api/collab/sessions", isAuthenticated, async (req, res) => {
    try {
      const { title, description, pageCount, maxEditors, projectId, settings } = req.body;
      
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const session = await storage.createCollabSession({
        ownerId: req.user!.id,
        projectId,
        title,
        description,
        inviteCode,
        pageCount: pageCount || 1,
        maxEditors: maxEditors || 4,
        status: "active",
        settings,
      });
      
      await storage.joinCollabSession(session.id, req.user!.id, "owner");
      
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get collab session by ID
  app.get("/api/collab/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getCollabSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const members = await storage.getCollabMembers(session.id);
      res.json({ ...session, members });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Join collab session by invite code
  app.post("/api/collab/join/:inviteCode", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getCollabSessionByCode(req.params.inviteCode);
      if (!session) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      if (session.status !== "active") {
        return res.status(400).json({ message: "Session is not active" });
      }
      
      const members = await storage.getCollabMembers(session.id);
      if (members.length >= session.maxEditors) {
        return res.status(400).json({ message: "Session is full" });
      }
      
      const member = await storage.joinCollabSession(session.id, req.user!.id, "editor");
      res.json({ session, member });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's collab sessions
  app.get("/api/collab/my-sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getUserCollabSessions(req.user!.id);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update collab session status
  app.patch("/api/collab/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getCollabSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can update the session" });
      }
      
      const { status, title, description, settings } = req.body;
      const updated = await storage.updateCollabSession(req.params.id, {
        status,
        title,
        description,
        settings,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // COMMUNITY CHAINS ROUTES
  // ============================================

  const chainThemes = [
    "A mysterious traveler arrives at midnight...",
    "The last robot on Earth wakes up...",
    "Two rivals must work together to...",
    "A secret door appears in the city...",
    "The hero discovers their power is fading...",
    "An unlikely friendship between enemies...",
    "The final message from another dimension...",
    "A curse that can only be broken by...",
    "When magic and technology collide...",
    "The adventure begins with a stolen artifact...",
    "In a world where dreams become real...",
    "The forgotten kingdom rises again...",
    "A detective uncovers an impossible crime...",
    "The last stand against the darkness...",
    "Two timelines begin to merge...",
    "An ancient prophecy comes true...",
    "The city that exists between worlds...",
    "A villain's redemption story...",
    "When the monsters become heroes...",
    "The day everything changed forever...",
  ];

  // Get random theme
  app.get("/api/chains/random-theme", (req, res) => {
    const theme = chainThemes[Math.floor(Math.random() * chainThemes.length)];
    res.json({ theme });
  });

  // Create a new chain
  app.post("/api/chains", isAuthenticated, async (req, res) => {
    try {
      const { title, description, visibility, maxContributions, tags, mediaUrl, contentType } = req.body;
      
      const chain = await storage.createCommunityChain({
        creatorId: req.user!.id,
        title,
        description,
        visibility: visibility || "public",
        maxContributions,
        tags,
        thumbnail: mediaUrl,
      });

      // Add the first contribution (the starter)
      await storage.addChainContribution({
        chainId: chain.id,
        userId: req.user!.id,
        position: 1,
        contentType: contentType || "image",
        mediaUrl,
        caption: description,
      });

      res.json(chain);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get public chains (open community)
  app.get("/api/chains/public", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const chains = await storage.getPublicChains(limit, offset);
      res.json(chains);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get mutuals chains (friends only)
  app.get("/api/chains/mutuals", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const chains = await storage.getMutualsChains(req.user!.id, limit, offset);
      res.json(chains);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's chains
  app.get("/api/chains/mine", isAuthenticated, async (req, res) => {
    try {
      const chains = await storage.getUserChains(req.user!.id);
      res.json(chains);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single chain with contributions
  app.get("/api/chains/:id", async (req, res) => {
    try {
      const chain = await storage.getCommunityChain(req.params.id);
      if (!chain) {
        return res.status(404).json({ message: "Chain not found" });
      }
      const contributions = await storage.getChainContributions(chain.id);
      res.json({ ...chain, contributions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add contribution to chain
  app.post("/api/chains/:id/contribute", isAuthenticated, async (req, res) => {
    try {
      const chain = await storage.getCommunityChain(req.params.id);
      if (!chain) {
        return res.status(404).json({ message: "Chain not found" });
      }

      const canContribute = await storage.canContributeToChain(chain.id, req.user!.id);
      if (!canContribute) {
        return res.status(403).json({ message: "You cannot contribute to this chain" });
      }

      const { mediaUrl, contentType, caption, parentId } = req.body;
      
      const contribution = await storage.addChainContribution({
        chainId: chain.id,
        userId: req.user!.id,
        parentId,
        position: chain.contributionCount + 1,
        contentType: contentType || "image",
        mediaUrl,
        caption,
      });

      res.json(contribution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Like a contribution
  app.post("/api/chains/contributions/:id/like", isAuthenticated, async (req, res) => {
    try {
      const like = await storage.likeContribution(req.params.id, req.user!.id);
      res.json(like);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unlike a contribution
  app.delete("/api/chains/contributions/:id/like", isAuthenticated, async (req, res) => {
    try {
      await storage.unlikeContribution(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publish collab to timeline (for all members)
  app.post("/api/collab/sessions/:id/publish", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getCollabSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const { caption, mediaUrls } = req.body;
      
      const post = await storage.createSocialPost({
        authorId: req.user!.id,
        projectId: session.projectId,
        type: "comic",
        caption: caption || `Check out our collab: ${session.title}`,
        mediaUrls,
        visibility: "public",
      });
      
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // EXTERNAL API ROUTES (for third-party integrations)
  // ============================================

  // API Key Management (requires session auth)
  app.get("/api/v1/keys", isAuthenticated, async (req, res) => {
    try {
      const keys = await storage.getUserApiKeys(req.user!.id);
      res.json(keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: k.permissions,
        lastUsed: k.lastUsed,
        expiresAt: k.expiresAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/v1/keys", isAuthenticated, async (req, res) => {
    try {
      const { name, permissions, expiresIn } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Key name is required" });
      }

      // Generate secure key
      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = getKeyPrefix(rawKey);

      // Calculate expiration
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date(Date.now() + expiresIn * 1000);
      }

      const apiKey = await storage.createApiKey({
        userId: req.user!.id,
        name,
        keyHash,
        keyPrefix,
        permissions: permissions || ['upload', 'read'],
        expiresAt,
        isActive: true,
      });

      // Return the raw key ONLY ONCE - it cannot be retrieved again
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned on creation!
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        warning: "Save this key now. It cannot be retrieved again.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/v1/keys/:id", isAuthenticated, async (req, res) => {
    try {
      const keys = await storage.getUserApiKeys(req.user!.id);
      const key = keys.find(k => k.id === req.params.id);
      
      if (!key) {
        return res.status(404).json({ error: "API key not found" });
      }

      await storage.deleteApiKey(req.params.id);
      res.json({ message: "API key deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/v1/keys/:id/deactivate", isAuthenticated, async (req, res) => {
    try {
      const keys = await storage.getUserApiKeys(req.user!.id);
      const key = keys.find(k => k.id === req.params.id);
      
      if (!key) {
        return res.status(404).json({ error: "API key not found" });
      }

      await storage.deactivateApiKey(req.params.id);
      res.json({ message: "API key deactivated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ASSET PACK API ROUTES (external API auth)
  // ============================================

  // Create asset pack (external API)
  app.post("/api/v1/asset-packs", isApiAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req, 'upload')) {
        return res.status(403).json({ error: "Permission denied: upload required", code: "FORBIDDEN" });
      }

      const user = (req as any).apiUser;
      const { name, description, category, tags, thumbnail, assets, isPublic, version, metadata } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Pack name is required", code: "INVALID_INPUT" });
      }

      const pack = await storage.createAssetPack({
        userId: user.id,
        name,
        description,
        category: category || 'general',
        tags: tags || [],
        thumbnail,
        assets: assets || [],
        isPublic: isPublic || false,
        version: version || '1.0.0',
        metadata,
      });

      res.status(201).json({
        success: true,
        pack: {
          id: pack.id,
          name: pack.name,
          category: pack.category,
          version: pack.version,
          createdAt: pack.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // List user's asset packs (external API)
  app.get("/api/v1/asset-packs", isApiAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req, 'read')) {
        return res.status(403).json({ error: "Permission denied: read required", code: "FORBIDDEN" });
      }

      const user = (req as any).apiUser;
      const packs = await storage.getUserAssetPacks(user.id);
      
      res.json({
        success: true,
        packs: packs.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          tags: p.tags,
          thumbnail: p.thumbnail,
          assetCount: Array.isArray(p.assets) ? p.assets.length : 0,
          isPublic: p.isPublic,
          downloadCount: p.downloadCount,
          version: p.version,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // Get specific asset pack (external API)
  app.get("/api/v1/asset-packs/:id", isApiAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req, 'read')) {
        return res.status(403).json({ error: "Permission denied: read required", code: "FORBIDDEN" });
      }

      const user = (req as any).apiUser;
      const pack = await storage.getAssetPack(req.params.id);

      if (!pack) {
        return res.status(404).json({ error: "Asset pack not found", code: "NOT_FOUND" });
      }

      // Only allow access to own packs or public packs
      if (pack.userId !== user.id && !pack.isPublic) {
        return res.status(403).json({ error: "Access denied", code: "FORBIDDEN" });
      }

      res.json({
        success: true,
        pack,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // Update asset pack (external API)
  app.patch("/api/v1/asset-packs/:id", isApiAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req, 'upload')) {
        return res.status(403).json({ error: "Permission denied: upload required", code: "FORBIDDEN" });
      }

      const user = (req as any).apiUser;
      const pack = await storage.getAssetPack(req.params.id);

      if (!pack) {
        return res.status(404).json({ error: "Asset pack not found", code: "NOT_FOUND" });
      }

      if (pack.userId !== user.id) {
        return res.status(403).json({ error: "Access denied", code: "FORBIDDEN" });
      }

      const { name, description, category, tags, thumbnail, assets, isPublic, version, metadata } = req.body;
      
      const updated = await storage.updateAssetPack(req.params.id, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(assets && { assets }),
        ...(isPublic !== undefined && { isPublic }),
        ...(version && { version }),
        ...(metadata !== undefined && { metadata }),
      });

      res.json({
        success: true,
        pack: updated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // Delete asset pack (external API)
  app.delete("/api/v1/asset-packs/:id", isApiAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req, 'upload')) {
        return res.status(403).json({ error: "Permission denied: upload required", code: "FORBIDDEN" });
      }

      const user = (req as any).apiUser;
      const pack = await storage.getAssetPack(req.params.id);

      if (!pack) {
        return res.status(404).json({ error: "Asset pack not found", code: "NOT_FOUND" });
      }

      if (pack.userId !== user.id) {
        return res.status(403).json({ error: "Access denied", code: "FORBIDDEN" });
      }

      await storage.deleteAssetPack(req.params.id);
      res.json({ success: true, message: "Asset pack deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // Public asset packs discovery (no auth required)
  app.get("/api/v1/public/asset-packs", async (req, res) => {
    try {
      const { category, limit, offset } = req.query;
      const packs = await storage.getPublicAssetPacks(
        category as string | undefined,
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );

      res.json({
        success: true,
        packs: packs.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          tags: p.tags,
          thumbnail: p.thumbnail,
          assetCount: Array.isArray(p.assets) ? p.assets.length : 0,
          downloadCount: p.downloadCount,
          version: p.version,
          createdAt: p.createdAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // Download asset pack (increment counter)
  app.post("/api/v1/asset-packs/:id/download", async (req, res) => {
    try {
      const pack = await storage.getAssetPack(req.params.id);

      if (!pack || !pack.isPublic) {
        return res.status(404).json({ error: "Asset pack not found", code: "NOT_FOUND" });
      }

      await storage.incrementPackDownloads(req.params.id);

      res.json({
        success: true,
        pack,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: "SERVER_ERROR" });
    }
  });

  // API Health check
  app.get("/api/v1/health", (req, res) => {
    res.json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server, path: "/ws/collab" });
  
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
  
  wss.on("connection", (ws: WebSocket) => {
    let clientInfo: CollabClient | null = null;
    
    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join": {
            const { sessionId, userId, userName } = message;
            
            const session = await storage.getCollabSession(sessionId);
            if (!session || session.status !== "active") {
              ws.send(JSON.stringify({ type: "error", message: "Invalid session" }));
              return;
            }
            
            const existingClients = collabClients.get(sessionId) || [];
            const colorIndex = existingClients.length % colors.length;
            
            clientInfo = {
              ws,
              userId,
              userName,
              sessionId,
              color: colors[colorIndex],
            };
            
            existingClients.push(clientInfo);
            collabClients.set(sessionId, existingClients);
            
            ws.send(JSON.stringify({
              type: "joined",
              color: clientInfo.color,
              participants: existingClients.map(c => ({
                userId: c.userId,
                userName: c.userName,
                color: c.color,
                cursor: c.cursor,
                activeTool: c.activeTool,
              })),
            }));
            
            broadcastToSession(sessionId, {
              type: "user_joined",
              userId,
              userName,
              color: clientInfo.color,
            }, userId);
            break;
          }
          
          case "cursor_move": {
            if (!clientInfo) return;
            clientInfo.cursor = message.cursor;
            broadcastToSession(clientInfo.sessionId, {
              type: "cursor_update",
              userId: clientInfo.userId,
              userName: clientInfo.userName,
              color: clientInfo.color,
              cursor: message.cursor,
            }, clientInfo.userId);
            break;
          }
          
          case "tool_change": {
            if (!clientInfo) return;
            clientInfo.activeTool = message.tool;
            broadcastToSession(clientInfo.sessionId, {
              type: "tool_update",
              userId: clientInfo.userId,
              tool: message.tool,
            }, clientInfo.userId);
            break;
          }
          
          case "layer_update": {
            if (!clientInfo) return;
            broadcastToSession(clientInfo.sessionId, {
              type: "layer_update",
              userId: clientInfo.userId,
              userName: clientInfo.userName,
              layerId: message.layerId,
              changes: message.changes,
            }, clientInfo.userId);
            break;
          }
          
          case "chat": {
            if (!clientInfo) return;
            broadcastToSession(clientInfo.sessionId, {
              type: "chat",
              userId: clientInfo.userId,
              userName: clientInfo.userName,
              message: message.text,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });
    
    ws.on("close", () => {
      if (clientInfo) {
        const clients = collabClients.get(clientInfo.sessionId) || [];
        const updated = clients.filter(c => c.userId !== clientInfo!.userId);
        if (updated.length === 0) {
          collabClients.delete(clientInfo.sessionId);
        } else {
          collabClients.set(clientInfo.sessionId, updated);
        }
        
        broadcastToSession(clientInfo.sessionId, {
          type: "user_left",
          userId: clientInfo.userId,
          userName: clientInfo.userName,
        });
      }
    });
  });

  // ============================================
  // MOBILE APP COMPATIBILITY ROUTES
  // Aliases that match mobile app's expected endpoints with full validation
  // ============================================
  
  // Create post (mobile uses /api/posts, web uses /api/social/posts)
  app.post("/api/posts", isAuthenticated, async (req, res) => {
    try {
      const { contentType, contentId, caption, mediaUrls, visibility } = req.body;
      const post = await storage.createSocialPost({
        authorId: req.user!.id,
        projectId: contentId || null,
        type: contentType || "post",
        caption,
        mediaUrls,
        visibility: visibility || "public",
      });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get public feed (explore)
  app.get("/api/posts/feed", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getExplorePosts(limit, offset);
      
      if (req.isAuthenticated()) {
        const postsWithLikeStatus = await Promise.all(
          posts.map(async (post) => ({
            ...post,
            isLiked: await storage.isPostLiked(post.id, req.user!.id),
          }))
        );
        return res.json(postsWithLikeStatus);
      }
      
      res.json(posts.map(p => ({ ...p, isLiked: false })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get posts from followed users (uses authenticated user's ID for security)
  app.get("/api/posts/following/:userId", isAuthenticated, async (req, res) => {
    try {
      // Security: Only allow users to view their own following feed
      if (req.params.userId !== req.user!.id) {
        return res.status(403).json({ message: "Cannot view another user's feed" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getFeedPosts(req.user!.id, limit, offset);
      
      const postsWithLikeStatus = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          isLiked: await storage.isPostLiked(post.id, req.user!.id),
        }))
      );
      
      res.json(postsWithLikeStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single post with visibility checks
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getSocialPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.visibility === "private") {
        if (!req.isAuthenticated() || req.user!.id !== post.authorId) {
          return res.status(403).json({ message: "This post is private" });
        }
      }
      
      if (post.visibility === "followers") {
        if (!req.isAuthenticated()) {
          return res.status(403).json({ message: "Please sign in to view this post" });
        }
        if (req.user!.id !== post.authorId) {
          const isFollowing = await storage.isFollowing(req.user!.id, post.authorId);
          if (!isFollowing) {
            return res.status(403).json({ message: "You must follow this user to view their post" });
          }
        }
      }
      
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Like post with duplicate check and notification
  app.post("/api/posts/:postId/like", isAuthenticated, async (req, res) => {
    try {
      const isAlreadyLiked = await storage.isPostLiked(req.params.postId, req.user!.id);
      if (isAlreadyLiked) {
        return res.status(400).json({ message: "Already liked" });
      }
      
      const like = await storage.likePost(req.params.postId, req.user!.id);
      
      const post = await storage.getSocialPost(req.params.postId);
      if (post && post.authorId !== req.user!.id) {
        await storage.createNotification({
          userId: post.authorId,
          actorId: req.user!.id,
          type: "like",
          metadata: { postId: req.params.postId },
        });
      }
      
      res.json(like);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unlike post
  app.delete("/api/posts/:postId/like", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.unlikePost(req.params.postId, req.user!.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add comment with notification
  app.post("/api/posts/:postId/comments", isAuthenticated, async (req, res) => {
    try {
      const { content, body, parentId } = req.body;
      const comment = await storage.addComment({
        postId: req.params.postId,
        authorId: req.user!.id,
        body: body || content,
        parentId,
      });
      
      const post = await storage.getSocialPost(req.params.postId);
      if (post && post.authorId !== req.user!.id) {
        await storage.createNotification({
          userId: post.authorId,
          actorId: req.user!.id,
          type: "comment",
          metadata: { postId: req.params.postId, commentId: comment.id },
        });
      }
      
      res.json(comment);
    } catch (error: any) {
      if (error?.message?.includes("cannot comment")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get comments
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.postId, req.user?.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Follow user with duplicate check and notification
  app.post("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.id === req.params.userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      
      const isAlreadyFollowing = await storage.isFollowing(req.user!.id, req.params.userId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following" });
      }
      
      const follow = await storage.followUser(req.user!.id, req.params.userId);
      
      await storage.createNotification({
        userId: req.params.userId,
        actorId: req.user!.id,
        type: "follow",
        metadata: {},
      });
      
      res.json(follow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unfollow user
  app.delete("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.unfollowUser(req.user!.id, req.params.userId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's followers
  app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's following
  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user by ID with follow counts
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const counts = await storage.getFollowCounts(user.id);
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        followerCount: counts.followers,
        followingCount: counts.following,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // IMPORT PIPELINE ROUTES
  // ============================================

  // Get all user imports
  app.get("/api/imports", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const imports = await storage.getUserAssetImports(req.user!.id, status);
      res.json(imports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new import - with Zod validation
  const createImportSchema = z.object({
    bundleName: z.string().min(1, "Bundle name required"),
    sourceApp: z.enum(["iClone", "CharacterCreator", "CartoonAnimator", "ComfyUI", "Unknown"]),
    exportType: z.enum(["render", "image", "image_sequence", "video", "asset_pack"]),
    targetMode: z.enum(["library_card", "cover", "comic", "cyoa", "visual_novel"]),
    assetName: z.string().min(1, "Asset name required"),
    assetRole: z.enum(["character", "background", "panel", "overlay", "cutscene", "prop"]).optional(),
    projectId: z.string().optional(),
  });

  app.post("/api/imports", isAuthenticated, async (req, res) => {
    try {
      const result = createImportSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }
      const importData = {
        userId: req.user!.id,
        bundleName: result.data.bundleName,
        sourceApp: result.data.sourceApp,
        exportType: result.data.exportType,
        targetMode: result.data.targetMode,
        assetName: result.data.assetName,
        assetRole: result.data.assetRole || null,
        projectId: result.data.projectId || null,
        status: "pending",
      };
      const newImport = await storage.createAssetImport(importData);
      res.json(newImport);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single import
  app.get("/api/imports/:id", isAuthenticated, async (req, res) => {
    try {
      const importData = await storage.getAssetImport(req.params.id);
      if (!importData) {
        return res.status(404).json({ message: "Import not found" });
      }
      res.json(importData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update import status - with validation
  const updateImportSchema = z.object({
    status: z.enum(["pending", "imported", "failed"]).optional(),
    projectId: z.string().optional(),
    assetRole: z.enum(["character", "background", "panel", "overlay", "cutscene", "prop"]).optional(),
    errorMessage: z.string().optional(),
  });

  app.patch("/api/imports/:id", isAuthenticated, async (req, res) => {
    try {
      const result = updateImportSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }
      
      const existingImport = await storage.getAssetImport(req.params.id);
      if (!existingImport) {
        return res.status(404).json({ message: "Import not found" });
      }
      if (existingImport.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this import" });
      }
      
      const updates: any = {};
      if (result.data.status) {
        updates.status = result.data.status;
        if (result.data.status === "imported") {
          updates.importedAt = new Date();
        }
      }
      if (result.data.projectId) updates.projectId = result.data.projectId;
      if (result.data.assetRole) updates.assetRole = result.data.assetRole;
      if (result.data.errorMessage) updates.errorMessage = result.data.errorMessage;
      
      const updated = await storage.updateAssetImport(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete import - with ownership check
  app.delete("/api/imports/:id", isAuthenticated, async (req, res) => {
    try {
      const existingImport = await storage.getAssetImport(req.params.id);
      if (!existingImport) {
        return res.status(404).json({ message: "Import not found" });
      }
      if (existingImport.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this import" });
      }
      const success = await storage.deleteAssetImport(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/imports/file", isAuthenticated, async (req, res) => {
    try {
      const { format, images, projectData, title } = req.body;
      if (!format) {
        return res.status(400).json({ message: "Format is required" });
      }

      if (format === "json") {
        if (!projectData) {
          return res.status(400).json({ message: "Project data is required for JSON import" });
        }
        const project = await storage.createProject({
          userId: req.user!.id,
          title: projectData.title || title || "Imported Project",
          type: projectData.type || "comic",
          status: "draft",
          data: projectData.data || projectData,
          thumbnail: projectData.thumbnail || null,
        });
        return res.json({ project, importedCount: 1 });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      const pages = images.map((img: string, index: number) => ({
        id: `page-${index + 1}`,
        panels: [{
          id: `panel-${index + 1}-1`,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          content: [{ type: "image", url: img }],
        }],
      }));

      const project = await storage.createProject({
        userId: req.user!.id,
        title: title || "Imported Comic",
        type: "comic",
        status: "draft",
        data: { pages, format: "imported", sourceFormat: format },
        thumbnail: images[0] || null,
      });

      res.json({ project, importedCount: images.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PORTFOLIO ROUTES
  // ============================================

  app.get("/api/portfolio", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const artworks = await storage.getPortfolioArtworks(userId);
      res.json(artworks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portfolio/:id", async (req, res) => {
    try {
      const artwork = await storage.getPortfolioArtwork(req.params.id);
      if (!artwork) {
        return res.status(404).json({ message: "Artwork not found" });
      }
      res.json(artwork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const artwork = await storage.createPortfolioArtwork({
        ...req.body,
        userId: req.user!.id,
      });
      res.json(artwork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getPortfolioArtwork(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Artwork not found" });
      }
      if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const artwork = await storage.updatePortfolioArtwork(req.params.id, req.body);
      res.json(artwork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getPortfolioArtwork(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Artwork not found" });
      }
      if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const success = await storage.deletePortfolioArtwork(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // NEWSLETTER ROUTES
  // ============================================

  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const subscriber = await storage.subscribeNewsletter(email, name);
      res.json({ success: true, subscriber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const success = await storage.unsubscribeNewsletter(email);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/newsletter/subscribers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/client-error", rateLimit({ windowMs: 60000, max: 30 }), (req, res) => {
    // Reply fast and don't block on disk I/O. Client-side errors arrive in
    // bursts and are best-effort — the workflow log capture covers them
    // without contending for the synchronous file appender used by API errors.
    res.json({ ok: true });
    try {
      const body = req.body || {};
      const truncate = (v: any, max: number) =>
        typeof v === "string" ? v.slice(0, max) : undefined;
      const message = truncate(body.message, 500) || "(no message)";
      const stack = truncate(body.stack, 4000);
      const componentStack = truncate(body.componentStack, 2000);
      const url = truncate(body.url, 500);
      const userAgent = truncate(body.userAgent, 300);
      const source = truncate(body.source, 50) || "react-boundary";
      const userId = (req.user as any)?.id || null;
      console.error(
        `[CLIENT ERROR] source=${source} user=${userId || "anon"} msg=${message}\n  url=${url}\n  ua=${userAgent}\n  stack=${stack || "(none)"}\n  componentStack=${componentStack || "(none)"}`
      );
    } catch (e: any) {
      console.error("[client-error] Failed to log:", e?.message);
    }
  });

  const ALLOWED_EVENT_CATEGORIES = ["navigation", "engagement", "creator_tools", "ai", "social", "marketplace"];
  const eventTrackLimiter = rateLimit({ windowMs: 60000, max: 60, standardHeaders: false, legacyHeaders: false });
  app.post("/api/events/track", eventTrackLimiter, async (req, res) => {
    try {
      const { eventType, eventCategory, metadata, sessionId } = req.body;
      if (!eventType || typeof eventType !== "string" || eventType.length > 100) {
        return res.status(400).json({ message: "Invalid eventType" });
      }
      if (!eventCategory || !ALLOWED_EVENT_CATEGORIES.includes(eventCategory)) {
        return res.status(400).json({ message: "Invalid eventCategory" });
      }
      const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};
      const metaStr = JSON.stringify(safeMetadata);
      if (metaStr.length > 2048) {
        return res.status(400).json({ message: "Metadata too large" });
      }
      const userId = (req.user as any)?.id || null;
      const userAgent = (req.headers["user-agent"] || "").slice(0, 500);
      const safeSessionId = typeof sessionId === "string" ? sessionId.slice(0, 64) : null;
      await db.execute(sql`INSERT INTO platform_events (user_id, event_type, event_category, metadata, session_id, user_agent)
        VALUES (${userId}, ${eventType.slice(0, 100)}, ${eventCategory}, ${metaStr}::jsonb, ${safeSessionId}, ${userAgent})`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[events/track] Error:", error.message);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  app.get("/api/admin/events/summary", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 86400000);
      const [byCategory, byType, dailyCounts] = await Promise.all([
        db.execute(sql`SELECT event_category, COUNT(*) as count FROM platform_events
          WHERE created_at >= ${since} GROUP BY event_category ORDER BY count DESC`),
        db.execute(sql`SELECT event_type, COUNT(*) as count FROM platform_events
          WHERE created_at >= ${since} GROUP BY event_type ORDER BY count DESC LIMIT 50`),
        db.execute(sql`SELECT to_char(created_at, 'YYYY-MM-DD') as day, COUNT(*) as count
          FROM platform_events WHERE created_at >= ${since}
          GROUP BY day ORDER BY day`),
      ]);
      res.json({
        byCategory: byCategory.rows,
        byType: byType.rows,
        dailyCounts: dailyCounts.rows,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/schools/overview", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const [schoolsData, membershipStats] = await Promise.all([
        db.execute(sql`SELECT s.*,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'student') as student_count,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'teacher') as teacher_count,
          COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.role = 'admin') as admin_count,
          COALESCE(SUM(u.xp), 0)::bigint as total_xp,
          COALESCE(SUM(u.total_minutes), 0)::bigint as total_minutes
          FROM schools s
          LEFT JOIN school_memberships sm ON s.id = sm.school_id
          LEFT JOIN users u ON sm.user_id = u.id
          GROUP BY s.id ORDER BY student_count DESC`),
        db.execute(sql`SELECT
          COUNT(DISTINCT school_id) as total_schools,
          COUNT(DISTINCT user_id) FILTER (WHERE role = 'student') as total_students,
          COUNT(DISTINCT user_id) FILTER (WHERE role = 'teacher') as total_teachers
          FROM school_memberships`),
      ]);
      const stats = membershipStats.rows[0] as any;
      res.json({
        totalSchools: Number(stats.total_schools),
        totalStudents: Number(stats.total_students),
        totalTeachers: Number(stats.total_teachers),
        schools: schoolsData.rows.map((s: any) => ({
          id: s.id, name: s.name, slug: s.slug, verified: s.verified,
          contactEmail: s.contact_email, location: s.location,
          students: Number(s.student_count), teachers: Number(s.teacher_count),
          admins: Number(s.admin_count),
          totalXp: Number(s.total_xp), totalMinutes: Number(s.total_minutes),
          createdAt: s.created_at,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // LESSONS & PATHWAYS ROUTES
  // ============================================

  app.get("/api/pathways", async (req, res) => {
    try {
      const pathways = await storage.getLearningPathways();
      res.json(pathways);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pathways/:id", async (req, res) => {
    try {
      const pathway = await storage.getLearningPathway(req.params.id);
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      res.json(pathway);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pathways", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathway = await storage.createLearningPathway(req.body);
      res.json(pathway);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/pathways/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathway = await storage.updateLearningPathway(req.params.id, req.body);
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      res.json(pathway);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/pathways/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteLearningPathway(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pathways/:id/lessons", async (req, res) => {
    try {
      const lessons = await storage.getLessonsForPathway(req.params.id);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/lessons", async (req, res) => {
    try {
      const lessons = await storage.getAllLessons();
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lessons", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const lesson = await storage.createLesson(req.body);
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/lessons/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const lesson = await storage.updateLesson(req.params.id, req.body);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lessons/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteLesson(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // ANNOUNCEMENTS / EVENTS API ROUTES
  // ============================================

  // Get active announcements (public - for carousel banners)
  app.get("/api/announcements/active", async (req, res) => {
    try {
      const featuredOnly = req.query.featured === "true";
      const announcements = await storage.getActiveAnnouncements(featuredOnly);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all announcements (admin only)
  app.get("/api/announcements", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const featuredOnly = req.query.featured === "true";
      const announcements = await storage.getAnnouncements(featuredOnly);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's own announcements
  app.get("/api/announcements/mine", isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getUserAnnouncements(req.user!.id);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single announcement
  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create announcement (authenticated users can create their own, admin can create featured)
  app.post("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const isAdmin = req.user!.role === "admin";
      const announcement = await storage.createAnnouncement({
        ...req.body,
        userId: req.user!.id,
        isFeatured: isAdmin ? req.body.isFeatured : false, // Only admin can create featured
      });
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update announcement (owner or admin only)
  app.patch("/api/announcements/:id", isAuthenticated, async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (announcement.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only admin can set featured status
      const updates = { ...req.body };
      if (!isAdmin) {
        delete updates.isFeatured;
      }
      
      const updated = await storage.updateAnnouncement(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete announcement (owner or admin only)
  app.delete("/api/announcements/:id", isAuthenticated, async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (announcement.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteAnnouncement(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // EXHIBITIONS (PORTFOLIO EVENTS) API ROUTES
  // ============================================

  app.get("/api/exhibitions", async (req, res) => {
    try {
      const exhibitions = await storage.getPortfolioEvents();
      res.json(exhibitions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exhibitions/:id", async (req, res) => {
    try {
      const exhibition = await storage.getPortfolioEvent(req.params.id);
      if (!exhibition) {
        return res.status(404).json({ message: "Exhibition not found" });
      }
      res.json(exhibition);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/exhibitions", isAuthenticated, async (req, res) => {
    try {
      const exhibition = await storage.createPortfolioEvent({
        ...req.body,
        userId: req.user!.id,
      });
      res.json(exhibition);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/exhibitions/:id", isAuthenticated, async (req, res) => {
    try {
      const exhibition = await storage.getPortfolioEvent(req.params.id);
      if (!exhibition) {
        return res.status(404).json({ message: "Exhibition not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (exhibition.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updated = await storage.updatePortfolioEvent(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/exhibitions/:id", isAuthenticated, async (req, res) => {
    try {
      const exhibition = await storage.getPortfolioEvent(req.params.id);
      if (!exhibition) {
        return res.status(404).json({ message: "Exhibition not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (exhibition.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deletePortfolioEvent(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // BLOG POSTS API ROUTES
  // ============================================

  app.get("/api/blogs", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const blogs = await storage.getBlogPosts(status);
      res.json(blogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blogs/mine", isAuthenticated, async (req, res) => {
    try {
      const blogs = await storage.getUserBlogPosts(req.user!.id);
      res.json(blogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blogs/:id", async (req, res) => {
    try {
      const blog = await storage.getBlogPost(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(blog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/blogs", isAuthenticated, async (req, res) => {
    try {
      const slug = req.body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Date.now();
      
      const blog = await storage.createBlogPost({
        ...req.body,
        userId: req.user!.id,
        slug,
      });
      res.json(blog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/blogs/:id", isAuthenticated, async (req, res) => {
    try {
      const blog = await storage.getBlogPost(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (blog.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updated = await storage.updateBlogPost(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/blogs/:id", isAuthenticated, async (req, res) => {
    try {
      const blog = await storage.getBlogPost(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      const isAdmin = req.user!.role === "admin";
      if (blog.userId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteBlogPost(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PLATFORM MONETIZATION API ROUTES
  // ============================================

  // Feature Flags
  app.get("/api/admin/feature-flags", isAdmin, async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/feature-flags/:key", isAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      const flag = await storage.setFeatureFlag(req.params.key, enabled, req.user!.id);
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "toggle_feature_flag",
        targetType: "feature_flag",
        targetId: req.params.key,
        details: { enabled },
      });
      res.json(flag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public feature flag check
  app.get("/api/feature-flags/:key", async (req, res) => {
    try {
      const flag = await storage.getFeatureFlag(req.params.key);
      res.json({ enabled: flag?.enabled ?? false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Waitlist
  app.get("/api/admin/waitlist", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const entries = await storage.getWaitlist(status);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email: rawEmail, name, source, referredBy } = req.body;
      if (!rawEmail) {
        return res.status(400).json({ message: "Email is required" });
      }
      const email = rawEmail.trim().toLowerCase();
      
      const existing = await storage.getWaitlistEntry(email);
      if (existing) {
        return res.status(400).json({ message: "Already on waitlist" });
      }
      
      const entry = await storage.addToWaitlist({ email, name, source, referredBy });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/waitlist/:id/approve", isAdmin, async (req, res) => {
    try {
      const entry = await storage.approveWaitlistEntry(req.params.id, req.user!.id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "approve_waitlist",
        targetType: "waitlist",
        targetId: req.params.id,
      });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/waitlist/:id/reject", isAdmin, async (req, res) => {
    try {
      const entry = await storage.updateWaitlistStatus(req.params.id, "rejected");
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "reject_waitlist",
        targetType: "waitlist",
        targetId: req.params.id,
      });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invite Codes
  app.get("/api/admin/invite-codes", isAdmin, async (req, res) => {
    try {
      const codes = await storage.getInviteCodes();
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/invite-codes", isAdmin, async (req, res) => {
    try {
      const { code, type, maxUses, expiresAt, metadata } = req.body;
      const inviteCode = await storage.createInviteCode({
        code: code || randomUUID().substring(0, 8).toUpperCase(),
        createdBy: req.user!.id,
        type: type || "standard",
        maxUses,
        expiresAt,
        metadata,
      });
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "create_invite_code",
        targetType: "invite_code",
        targetId: inviteCode.id,
        details: { code: inviteCode.code, type, maxUses },
      });
      res.json(inviteCode);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invite-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;
      const inviteCode = await storage.getInviteCode(code);
      
      if (!inviteCode || !inviteCode.isActive) {
        return res.json({ valid: false, message: "Invalid invite code" });
      }
      if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
        return res.json({ valid: false, message: "Code has reached maximum uses" });
      }
      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.json({ valid: false, message: "Code has expired" });
      }
      
      res.json({ valid: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invite-codes/redeem", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      const success = await storage.redeemInviteCode(code, req.user!.id);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to redeem invite code" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/invite-codes/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deactivateInviteCode(req.params.id);
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "deactivate_invite_code",
        targetType: "invite_code",
        targetId: req.params.id,
      });
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AppSumo Codes
  app.get("/api/admin/appsumo-codes", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const codes = await storage.getAppSumoCodes(status);
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/appsumo-codes", isAdmin, async (req, res) => {
    try {
      const { code, tier, purchaseEmail, orderId } = req.body;
      const appSumoCode = await storage.createAppSumoCode({
        code: code || `APPSUMO-${randomUUID().substring(0, 8).toUpperCase()}`,
        tier: tier || "lifetime",
        purchaseEmail,
        orderId,
      });
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "create_appsumo_code",
        targetType: "appsumo_code",
        targetId: appSumoCode.id,
        details: { code: appSumoCode.code, tier },
      });
      res.json(appSumoCode);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appsumo/redeem", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      const result = await storage.redeemAppSumoCode(code, req.user!.id);
      
      if (!result) {
        return res.status(400).json({ message: "Invalid or already used AppSumo code" });
      }
      res.json({ success: true, tier: result.tier });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Content Moderation - Reports
  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const result = insertContentReportSchema.safeParse({
        ...req.body,
        reporterId: req.user!.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }
      const report = await storage.createContentReport(result.data);
      res.status(201).json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/reports", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const reports = await storage.getContentReports(status);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/reports/:id", isAdmin, async (req, res) => {
    try {
      const report = await storage.getContentReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/reports/:id/resolve", isAdmin, async (req, res) => {
    try {
      const { resolution } = req.body;
      if (!resolution) {
        return res.status(400).json({ message: "Resolution is required" });
      }
      const report = await storage.resolveContentReport(req.params.id, req.user!.id, resolution);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "resolve_report",
        targetType: "content_report",
        targetId: req.params.id,
        details: { resolution },
      });
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/reports/:id/dismiss", isAdmin, async (req, res) => {
    try {
      const report = await storage.resolveContentReport(req.params.id, req.user!.id, "no_action", "dismissed");
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "dismiss_report",
        targetType: "content_report",
        targetId: req.params.id,
        details: {},
      });
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Subscriptions
  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.user!.id);
      res.json(subscription || { tier: "free", status: "active" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/subscriptions", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const subscriptionsData = await Promise.all(
        users.map(async (user) => {
          const sub = await storage.getUserSubscription(user.id);
          return {
            userId: user.id,
            email: user.email,
            name: user.name,
            subscription: sub,
          };
        })
      );
      res.json(subscriptionsData.filter(s => s.subscription));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:id/subscription", isAdmin, async (req, res) => {
    try {
      const { tier, status, entitlements } = req.body;
      const existingSub = await storage.getUserSubscription(req.params.id);
      
      let subscription;
      if (existingSub) {
        subscription = await storage.updateSubscription(req.params.id, { tier, status, entitlements });
      } else {
        subscription = await storage.createSubscription({
          userId: req.params.id,
          tier: tier || "free",
          status: status || "active",
          entitlements,
        });
      }
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "update_subscription",
        targetType: "user",
        targetId: req.params.id,
        details: { tier, status },
      });
      res.json(subscription);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Platform Settings
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const { value, description } = req.body;
      const setting = await storage.setPlatformSetting(req.params.key, value, req.user!.id);
      
      await storage.createAdminLog({
        adminId: req.user!.id,
        action: "update_setting",
        targetType: "setting",
        targetId: req.params.key,
        details: { value },
      });
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Logs
  app.get("/api/admin/logs", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAdminLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Jobs (for async operations)
  app.get("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const jobs = await storage.getUserJobs(req.user!.id, status);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin dashboard stats
  app.get("/api/admin/dashboard", isAdmin, async (req, res) => {
    try {
      const [userCounts, waitlistCounts, featureFlagsData, settingsData, logs] = await Promise.all([
        storage.getUserCounts(),
        storage.getWaitlistCounts(),
        storage.getFeatureFlags(),
        storage.getAllPlatformSettings(),
        storage.getAdminLogs(10),
      ]);

      const stats = {
        totalUsers: userCounts.totalUsers,
        adminCount: userCounts.adminCount,
        creatorCount: userCounts.creatorCount,
        waitlistPending: waitlistCounts.pending,
        waitlistApproved: waitlistCounts.approved,
        waitlistRejected: waitlistCounts.rejected,
        featureFlags: featureFlagsData,
        settings: settingsData,
        recentLogs: logs,
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // STRIPE PAYMENT API ROUTES
  // ============================================

  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      
      const productsMap = new Map<string, any>();
      for (const row of products as any[]) {
        const productId = row.product_id as string;
        const priceId = row.price_id as string | null;
        
        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            id: productId,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (priceId) {
          productsMap.get(productId).prices.push({
            id: priceId,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const prices = await stripeService.listPrices();
      res.json({ data: prices });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req, res) => {
    try {
      const paymentsFlag = await storage.getFeatureFlag("payments_enabled");
      if (!paymentsFlag?.enabled) {
        return res.status(403).json({ message: "Payments are not currently enabled" });
      }

      const { priceId } = req.body;
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.accountType === "student") {
        return res.status(403).json({ message: "Student accounts cannot access monetization features" });
      }

      // Get or create subscription record with Stripe customer
      let subscription = await storage.getUserSubscription(req.user!.id);
      let customerId = subscription?.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id, user.name || undefined);
        customerId = customer.id;
        
        if (subscription) {
          await storage.updateSubscription(req.user!.id, { stripeCustomerId: customer.id });
        } else {
          await storage.createSubscription({
            userId: req.user!.id,
            tier: "free",
            status: "active",
            stripeCustomerId: customer.id,
          });
        }
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/settings?checkout=success`,
        `${baseUrl}/settings?checkout=cancel`
      );

      await logPaymentEvent("checkout.initiated", req.user!.id, {
        sessionId: session.id,
        customerId,
        priceId,
        flow: "subscription",
      }, req);

      res.json({ url: session.url });
    } catch (error: any) {
      await logPaymentEvent("checkout.failed", req.user?.id || null, {
        error: error.message,
        flow: "subscription",
      }, req);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.user!.id);
      
      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        subscription.stripeCustomerId,
        `${baseUrl}/settings`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/subscription", isAuthenticated, async (req, res) => {
    try {
      let subscription = await storage.getUserSubscription(req.user!.id);
      
      // If user has a Stripe customer, check for active subscription and sync tier
      if (subscription?.stripeCustomerId) {
        try {
          const stripeSubscription = await stripeService.getCustomerActiveSubscription(
            subscription.stripeCustomerId
          );
          
          if (stripeSubscription) {
            const previousTier = subscription.tier;
            if (subscription.tier !== stripeSubscription.tier || 
                subscription.stripeSubscriptionId !== stripeSubscription.subscriptionId) {
              subscription = await storage.updateSubscription(req.user!.id, {
                tier: stripeSubscription.tier as any,
                status: stripeSubscription.status,
                stripeSubscriptionId: stripeSubscription.subscriptionId,
                currentPeriodEnd: stripeSubscription.currentPeriodEnd,
                cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
              }) || subscription;

              if (previousTier === 'free' && stripeSubscription.tier !== 'free') {
                const user = await storage.getUser(req.user!.id);
                if (user) {
                  const tierLabel = stripeSubscription.tier.charAt(0).toUpperCase() + stripeSubscription.tier.slice(1);
                  const baseUrl = `${req.protocol}://${req.get('host')}`;
                  sendSubscriptionConfirmation(user.email, user.name || 'Creator', tierLabel, baseUrl);
                }
              }
            }
          } else if (subscription.tier !== 'free' && subscription.tier !== 'lifetime' && !subscription.appSumoCodeId) {
            // No active Stripe subscription and not lifetime/appsumo - downgrade to free
            subscription = await storage.updateSubscription(req.user!.id, {
              tier: 'free',
              status: 'canceled',
              stripeSubscriptionId: null,
            }) || subscription;
          }
        } catch (syncError) {
          // If Stripe sync fails, just return current subscription
          console.error('Stripe sync error:', syncError);
        }
      }
      
      res.json(subscription || { tier: "free", status: "active" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PUBLISHING PIPELINE ROUTES
  // ============================================

  // Submit project for review
  app.post("/api/projects/:id/submit-review", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id) return res.status(403).json({ message: "Not authorized" });
      if (project.status !== "draft" && project.status !== "rejected") {
        return res.status(400).json({ message: `Cannot submit for review from "${project.status}" status` });
      }
      if (!project.thumbnail) {
        const data = project.data as any;
        let thumbnailUrl: string | null = null;
        const spreadPages = [
          ...(data?.spreads?.[0]?.leftPage || []),
          ...(data?.spreads?.[0]?.rightPage || []),
        ];
        for (const panel of spreadPages) {
          const imageItem = (panel.contents || []).find((c: any) => c.type === "image" && c.data?.url);
          if (imageItem) {
            thumbnailUrl = imageItem.data.url;
            break;
          }
        }
        if (!thumbnailUrl && data?.comicMeta?.frontCover) {
          thumbnailUrl = data.comicMeta.frontCover;
        }
        if (thumbnailUrl) {
          await storage.updateProject(project.id, { thumbnail: thumbnailUrl } as any);
        }
      }
      const updated = await storage.updateProject(project.id, { status: "review" } as any);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get review queue
  app.get("/api/admin/review-queue", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    if (req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const queue = await storage.getReviewQueue();
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Approve project
  app.post("/api/admin/projects/:id/approve", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    if (req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status !== "review") {
        return res.status(400).json({ message: "Project is not in review status" });
      }
      const updated = await storage.updateProject(project.id, { status: "approved" } as any);

      // Auto-trigger publish pipeline on approval to sync to PSStreaming
      try {
        const result = await runPublishPipeline(project.id, project.userId, { visibility: "public" });
        console.log(`[Auto-Publish] Triggered for approved project ${project.id}: jobId=${result.jobId}`);
      } catch (pubErr: any) {
        console.error(`[Auto-Publish] Failed for project ${project.id}:`, pubErr.message);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Reject project
  app.post("/api/admin/projects/:id/reject", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    if (req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status !== "review") {
        return res.status(400).json({ message: "Project is not in review status" });
      }
      const { reason } = req.body;
      const updated = await storage.updateProject(project.id, { status: "rejected" } as any);
      res.json({ ...updated, rejectionReason: reason });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publish a project (runs the pipeline)
  app.post("/api/projects/:id/publish", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      // Reject obviously invalid IDs early so we return a clear error instead of
      // a misleading 404 from storage. This is the source of the "Project not
      // found" message students saw when they tried to publish before saving.
      if (!req.params.id || req.params.id === "null" || req.params.id === "undefined") {
        console.warn(`[publish] called with missing/invalid project id by ${req.user!.email}`);
        return res.status(400).json({ message: "Save your project first, then publish." });
      }
      const project = await storage.getProject(req.params.id);
      if (!project) {
        console.warn(`[publish] project not found id="${req.params.id}" user=${req.user!.email}`);
        return res.status(404).json({ message: "Project not found — try saving again, then publish." });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (!project.thumbnail) {
        const data = project.data as any;
        let thumbnailUrl: string | null = null;
        const spreadPages = [
          ...(data?.spreads?.[0]?.leftPage || []),
          ...(data?.spreads?.[0]?.rightPage || []),
        ];
        for (const panel of spreadPages) {
          const imageItem = (panel.contents || []).find((c: any) => c.type === "image" && c.data?.url);
          if (imageItem) {
            thumbnailUrl = imageItem.data.url;
            break;
          }
        }
        if (!thumbnailUrl && data?.comicMeta?.frontCover) {
          thumbnailUrl = data.comicMeta.frontCover;
        }
        if (thumbnailUrl) {
          await storage.updateProject(project.id, { thumbnail: thumbnailUrl } as any);
        }
      }
      const { visibility, tags, ageRating } = req.body;
      const result = await runPublishPipeline(project.id, req.user!.id, { visibility, tags, ageRating });
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      processProgressionEvent(req.user!.id, "publish", project.id, "project").catch(() => {});
      if (project.type === "hop") {
        processProgressionEvent(req.user!.id, "hop_published", project.id, "project").catch(() => {});
      }
      res.json({ 
        jobId: result.jobId, 
        message: "Publishing pipeline started",
        streamingUrl: `https://psstreaming.com/watch/${project.id}`,
        communityUrl: `/community/read/${project.id}`,
        projectTitle: project.title,
        projectType: project.type,
        thumbnail: project.thumbnail,
        creatorName: req.user!.name,
        viewCount: project.viewCount ?? 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get publish job status
  app.get("/api/publish-jobs/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const job = await storage.getPublishJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get project publish history
  app.get("/api/projects/:id/publish-jobs", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const jobs = await storage.getProjectPublishJobs(req.params.id);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get project versions
  app.get("/api/projects/:id/versions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.email !== "mojocreative1@gmail.com") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const versions = await storage.getProjectVersions(req.params.id);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Preview bundle (build without publishing)
  app.get("/api/projects/:id/bundle-preview", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const projectAssets = await storage.getProjectAssets(project.id);
      const bundle = buildPSContentBundle(project, user, projectAssets);
      const validation = validateBundle(bundle);
      res.json({ bundle, validation });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PSStreaming engagement webhook (inbound events) - requires shared secret.
  // Accepts the new PSSTREAMING_WEBHOOK_SECRET, falling back to the legacy
  // EMERGENT_WEBHOOK_SECRET so existing deploys keep working during cutover.
  app.post("/api/webhooks/engagement", async (req: Request, res: Response) => {
    try {
      const webhookSecret =
        process.env.PSSTREAMING_WEBHOOK_SECRET || process.env.EMERGENT_WEBHOOK_SECRET;
      if (webhookSecret) {
        const provided = req.headers["x-webhook-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
        if (provided !== webhookSecret) {
          return res.status(401).json({ message: "Invalid webhook secret" });
        }
      }
      const parsed = insertEngagementEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid engagement event", errors: parsed.error.issues });
      }
      const event = await storage.createEngagementEvent(parsed.data);
      res.json({ received: true, id: event.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get engagement summary for content
  app.get("/api/content/:contentId/engagement", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const summary = await storage.getEngagementSummary(req.params.contentId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/streaming/health", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    try {
      const health = await checkPSStreamingHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Ecosystem connection status (for all authenticated users)
  app.get("/api/ecosystem/status", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const pslmsUrl = process.env.PSLMS_API_URL;
      const pslmsKey = process.env.PSLMS_API_KEY;
      // Prefer the new PSStreaming env names, fall back to the legacy
      // EMERGENT_* names so existing prod deploys keep reporting "connected"
      // until the new env vars are rolled out everywhere.
      const streamingSecret =
        process.env.PSSTREAMING_WEBHOOK_SECRET || process.env.EMERGENT_WEBHOOK_SECRET;
      const streamingUrl =
        process.env.PSSTREAMING_API_URL || process.env.EMERGENT_API_URL || "https://psstreaming.com";

      const connections: { name: string; configured: boolean; url: string | null; status: string }[] = [];

      connections.push({
        name: "Press Start LMS",
        configured: !!(pslmsUrl && pslmsKey),
        url: pslmsUrl ? pslmsUrl.replace(/\/api.*$/, "") : null,
        status: pslmsUrl && pslmsKey ? "connected" : "not_configured",
      });

      connections.push({
        name: "PSStreaming",
        configured: !!streamingSecret,
        url: streamingUrl,
        status: streamingSecret ? "connected" : "not_configured",
      });

      res.json({
        ecosystem: "PSCoMiXX",
        connections,
        allConnected: connections.every(c => c.configured),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================
  // PSLMS Integration Endpoints
  // ============================================================

  // PSLMS auth middleware - uses shared secret from env var
  function isPslmsAuthenticated(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization;
    const pslmsKey = process.env.PSLMS_API_KEY;
    if (!pslmsKey) {
      return res.status(503).json({ error: "PSLMS integration not configured", code: "NOT_CONFIGURED" });
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header", code: "UNAUTHORIZED" });
    }
    const token = authHeader.substring(7);
    if (token !== pslmsKey) {
      return res.status(401).json({ error: "Invalid API key", code: "INVALID_KEY" });
    }
    return next();
  }

  // GET /api/pslms/comics?email=student@example.com
  // Lists a student's published/approved comics and cards
  app.get("/api/pslms/comics", isPslmsAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "email query parameter is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found with that email" });
      }

      const projects = await storage.getUserProjectsMeta(user.id);
      const comics = projects
        .filter(p => ["comic", "card", "cover", "motion", "vn", "cyoa"].includes(p.type))
        .map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          thumbnail: p.thumbnail,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));

      res.json({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        account_type: user.accountType,
        comics,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/pslms/comics/:id
  // Returns full comic data including project JSON and thumbnail
  app.get("/api/pslms/comics/:id", isPslmsAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Comic not found" });
      }

      const user = await storage.getUser(project.userId);

      res.json({
        id: project.id,
        title: project.title,
        type: project.type,
        status: project.status,
        thumbnail: project.thumbnail,
        data: project.data,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        creator: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          account_type: user.accountType,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/pslms/send-to-portfolio
  // Called by CoMiXX frontend to send a comic to PSLMS (student accounts only)
  app.post("/api/pslms/send-to-portfolio", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (user.accountType !== "student") {
        return res.status(403).json({ error: "Only student accounts can send to PSLMS portfolio" });
      }

      const { projectId, title, imageUrl } = req.body;

      if (!projectId || !title) {
        return res.status(400).json({ error: "projectId and title are required" });
      }

      const pslmsUrl = process.env.PSLMS_API_URL;
      if (!pslmsUrl) {
        return res.status(503).json({ error: "PSLMS integration not configured" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "You can only send your own projects" });
      }

      const payload = {
        event: "comic.submitted",
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        title: title,
        project_type: project.type,
        image_url: imageUrl || project.thumbnail || "",
        xp: 50,
        project_id: project.id,
        submitted_at: new Date().toISOString(),
      };

      const bodyStr = JSON.stringify(payload);
      const webhookSecret = process.env.PSLMS_WEBHOOK_SECRET || "";
      const signature = createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");

      const webhookUrl = `${pslmsUrl.replace(/\/$/, "")}/api/webhooks/comixx`;
      const response = await fetchWithTimeout(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoMiXX-Signature": signature,
        },
        body: bodyStr,
        timeout: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: `PSLMS responded with ${response.status}`, details: errorText });
      }

      const result = await response.json();
      res.json({ success: true, message: "Comic sent to PSLMS portfolio", pslms_response: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/pslms/health
  // Health check for PSLMS integration
  app.get("/api/pslms/health", async (_req: Request, res: Response) => {
    const pslmsUrl = process.env.PSLMS_API_URL;
    const pslmsKey = process.env.PSLMS_API_KEY;
    res.json({
      configured: !!(pslmsUrl && pslmsKey),
      pslms_url: pslmsUrl ? pslmsUrl.replace(/\/api.*$/, "") : null,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================
  // Mad Mixed Media (Streaming) → PSLMS Integration
  // ============================================================

  // POST /api/webhooks/streaming - receives events from Mad Mixed Media streaming platform
  app.post("/api/webhooks/streaming", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      const webhookSecret = req.headers["x-webhook-secret"] as string;
      const pslmsKey = process.env.PSLMS_API_KEY;
      const pslmsWh = process.env.PSLMS_WEBHOOK_SECRET;

      if ((!apiKey || apiKey !== pslmsKey) && (!webhookSecret || webhookSecret !== pslmsWh)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { event, email, title, description, video_url, thumbnail_url, project_id, xp } = req.body;
      if (!event || !email) {
        return res.status(400).json({ error: "event and email are required" });
      }

      const user = await storage.getUserByEmail(email);

      console.log(`[Streaming Webhook] Received ${event} for ${email}: "${title}" (project: ${project_id})`);

      // Forward to PSLMS if configured
      const pslmsUrl = process.env.PSLMS_API_URL;
      if (pslmsUrl) {
        try {
          const payload = { event, email, title, description, video_url, thumbnail_url, project_id, xp: xp || 75 };
          const bodyStr = JSON.stringify(payload);
          const signature = createHmac("sha256", pslmsWh || "").update(bodyStr).digest("hex");

          await fetchWithTimeout(`${pslmsUrl.replace(/\/$/, "")}/api/webhooks/streaming`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-API-Key": pslmsKey || "",
            },
            timeout: 10000,
            body: bodyStr,
          });
          console.log(`[Streaming Webhook] Forwarded to PSLMS for ${email}`);
        } catch (fwdErr: any) {
          console.error(`[Streaming Webhook] Forward to PSLMS failed:`, fwdErr.message);
        }
      }

      res.json({
        received: true,
        event,
        user_found: !!user,
        user_id: user?.id || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/webhooks/streaming/portfolio - 1-button send to PSLMS portfolio from streaming
  app.post("/api/webhooks/streaming/portfolio", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      const webhookSecret = req.headers["x-webhook-secret"] as string;
      const pslmsKey = process.env.PSLMS_API_KEY;
      const pslmsWh = process.env.PSLMS_WEBHOOK_SECRET;

      if ((!apiKey || apiKey !== pslmsKey) && (!webhookSecret || webhookSecret !== pslmsWh)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { email, title, description, video_url, thumbnail_url, project_id } = req.body;
      if (!email || !title) {
        return res.status(400).json({ error: "email and title are required" });
      }

      const pslmsUrl = process.env.PSLMS_API_URL;
      if (!pslmsUrl) {
        return res.status(503).json({ error: "PSLMS not configured" });
      }

      const payload = {
        event: "video.portfolio_submit",
        email,
        title,
        description: description || "",
        video_url: video_url || "",
        thumbnail_url: thumbnail_url || "",
        project_id: project_id || "",
        xp: 75,
        submitted_at: new Date().toISOString(),
      };

      const bodyStr = JSON.stringify(payload);
      const signature = createHmac("sha256", pslmsWh || "").update(bodyStr).digest("hex");

      const response = await fetchWithTimeout(`${pslmsUrl.replace(/\/$/, "")}/api/webhooks/streaming/portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-API-Key": pslmsKey || "",
        },
        body: bodyStr,
        timeout: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: `PSLMS responded with ${response.status}`, details: errorText });
      }

      const result = await response.json();
      res.json({
        status: "success",
        item_id: result.item_id || null,
        xp_awarded: 75,
        pslms_response: result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== MARKETPLACE API ROUTES ====================

  app.get("/api/marketplace/listings", async (req, res) => {
    try {
      const { type, search, limit, offset, pricing } = req.query;
      const listings = await storage.getMarketplaceListings({
        type: type as string | undefined,
        status: "active",
        search: search as string | undefined,
        pricing: pricing as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      const isStudent = req.isAuthenticated() && req.user?.accountType === "student";
      const filtered = isStudent
        ? listings.filter((l: any) => l.contentRating !== "mature")
        : listings;
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/my-listings", isAuthenticated, async (req, res) => {
    try {
      const listings = await storage.getSellerListings(req.user!.id);
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/purchases", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getBuyerOrders(req.user!.id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/earnings", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getSellerOrders(req.user!.id);
      const totalEarnings = orders
        .filter(o => o.status === "completed")
        .reduce((sum, o) => sum + o.amountInCents, 0);
      res.json({ orders, totalEarnings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/listings/:id/download", isAuthenticated, async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      const hasPurchased = await storage.hasUserPurchasedListing(req.user!.id, listing.id);
      if (!hasPurchased && listing.sellerId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You have not purchased this listing" });
      }
      res.json({ downloadData: listing.downloadData });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      const isStudent = req.isAuthenticated() && req.user?.accountType === "student";
      if (isStudent && (listing as any).contentRating === "mature") {
        return res.status(403).json({ message: "This content is not available for student accounts" });
      }
      res.json(listing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/listings", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.accountType === "student") {
        return res.status(403).json({ message: "Students cannot create marketplace listings" });
      }

      const userSub = await storage.getUserSubscription(req.user!.id);
      const userTier = (userSub?.tier || "free") as TierName;
      const entitlements = tierEntitlements[userTier];
      if (!entitlements?.commercial) {
        return res.status(403).json({
          message: "Commercial license required to create marketplace listings",
          upgradeRequired: true,
          feature: "Commercial License",
          currentTier: userTier,
        });
      }

      const { projectId, title, description, type, priceInCents, previewImages, thumbnail, tags, downloadData } = req.body;

      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.userId !== req.user!.id) {
          return res.status(403).json({ message: "You do not own this project" });
        }
        if (project.status !== "published" && project.status !== "approved") {
          return res.status(400).json({ message: "Project must be published or approved to list on marketplace" });
        }
      }

      const result = insertMarketplaceListingSchema.safeParse({
        sellerId: req.user!.id,
        projectId: projectId || undefined,
        title,
        description,
        type,
        priceInCents,
        previewImages,
        thumbnail,
        tags,
        downloadData: downloadData || undefined,
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.issues });
      }

      const listing = await storage.createMarketplaceListing(result.data);
      res.status(201).json(listing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/marketplace/listings/:id", isAuthenticated, async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ message: "You do not own this listing" });
      }
      const updated = await storage.updateMarketplaceListing(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/marketplace/listings/:id", isAuthenticated, async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.sellerId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You do not own this listing" });
      }
      await storage.deleteMarketplaceListing(req.params.id);
      res.json({ message: "Listing removed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/claim-free", isAuthenticated, async (req, res) => {
    try {
      const { listingId } = req.body;
      if (!listingId) {
        return res.status(400).json({ message: "listingId is required" });
      }

      const listing = await storage.getMarketplaceListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ message: "Listing is not available" });
      }
      if (listing.priceInCents !== 0) {
        return res.status(400).json({ message: "This listing is not free" });
      }
      if (listing.sellerId === req.user!.id) {
        return res.status(400).json({ message: "You cannot claim your own listing" });
      }

      const alreadyClaimed = await storage.hasUserPurchasedListing(req.user!.id, listingId);
      if (alreadyClaimed) {
        return res.status(400).json({ message: "You have already claimed this listing" });
      }

      const order = await storage.createMarketplaceOrder({
        buyerId: req.user!.id,
        listingId: listing.id,
        sellerId: listing.sellerId,
        amountInCents: 0,
        currency: listing.currency || 'usd',
        status: 'completed',
        stripeSessionId: null,
      });

      await storage.updateMarketplaceListing(listing.id, {
        salesCount: (listing as any).salesCount ? (listing as any).salesCount + 1 : 1,
      } as any);

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendPurchaseConfirmation((req.user as any).email, (req.user as any).name, listing.title, 0, baseUrl);

      res.json({ success: true, orderId: order.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/checkout", isAuthenticated, async (req, res) => {
    try {
      const { listingId } = req.body;
      if (!listingId) {
        return res.status(400).json({ message: "listingId is required" });
      }

      const listing = await storage.getMarketplaceListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ message: "Listing is not available for purchase" });
      }

      if (listing.priceInCents === 0) {
        return res.status(400).json({ message: "This listing is free. Use /api/marketplace/claim-free instead." });
      }

      const alreadyPurchased = await storage.hasUserPurchasedListing(req.user!.id, listingId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "You have already purchased this listing" });
      }

      const baseUrl = req.headers.origin || (process.env.REPLIT_DEPLOYMENT
        ? "https://pscomixx.com"
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: listing.currency || 'usd',
            product_data: { name: listing.title, description: listing.description || undefined },
            unit_amount: listing.priceInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/marketplace/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/marketplace`,
        metadata: { listingId: listing.id, buyerId: req.user!.id, sellerId: listing.sellerId },
      });

      await storage.createMarketplaceOrder({
        buyerId: req.user!.id,
        listingId: listing.id,
        sellerId: listing.sellerId,
        amountInCents: listing.priceInCents,
        currency: listing.currency || 'usd',
        status: 'pending',
        stripeSessionId: session.id,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/verify-purchase", isAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const buyerOrders = await storage.getBuyerOrders(req.user!.id);
        const order = buyerOrders.find(o => o.stripeSessionId === sessionId);

        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        if (order.status !== 'completed') {
          await storage.updateMarketplaceOrder(order.id, {
            status: 'completed',
            completedAt: new Date(),
          });

          const listing = await storage.getMarketplaceListing(order.listingId);
          if (listing) {
            await storage.updateMarketplaceListing(listing.id, {
              salesCount: (listing.salesCount || 0) + 1,
              totalEarnings: (listing.totalEarnings || 0) + order.amountInCents,
            } as any);
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            sendPurchaseConfirmation((req.user as any).email, (req.user as any).name, listing.title, order.amountInCents, baseUrl);
          }
        }

        return res.json({ success: true, orderId: order.id });
      }

      res.json({ success: false, message: "Payment not completed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== MARKETPLACE REVIEWS ====================

  app.get("/api/marketplace/listings/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getListingReviews(req.params.id);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/listings/:id/reviews", isAuthenticated, async (req, res) => {
    try {
      const { rating, reviewText } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const orders = await storage.getBuyerOrders(req.user!.id);
      const hasPurchased = orders.some(
        o => o.listingId === req.params.id && o.status === "completed"
      );

      const existingReviews = await storage.getListingReviews(req.params.id);
      const alreadyReviewed = existingReviews.some(r => r.userId === req.user!.id);
      if (alreadyReviewed) {
        return res.status(400).json({ message: "You have already reviewed this listing" });
      }

      const review = await storage.createReview({
        listingId: req.params.id,
        userId: req.user!.id,
        rating,
        reviewText: reviewText?.slice(0, 1000) || null,
        verifiedPurchase: hasPurchased,
      });

      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/analytics", isAuthenticated, async (req, res) => {
    try {
      const listings = await storage.getMarketplaceListings({ status: "active" });
      const userListings = listings.filter(l => l.sellerId === req.user!.id);

      const analytics = {
        totalListings: userListings.length,
        totalSales: userListings.reduce((sum, l) => sum + (l.salesCount || 0), 0),
        totalRevenue: userListings.reduce((sum, l) => sum + (l.totalEarnings || 0), 0),
        listings: userListings.map(l => ({
          id: l.id,
          title: l.title,
          sales: l.salesCount || 0,
          revenue: l.totalEarnings || 0,
        })),
      };

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/listings/:id/track", async (req, res) => {
    try {
      const { eventType } = req.body;
      if (!["view", "click"].includes(eventType)) {
        return res.status(400).json({ message: "Invalid event type" });
      }
      await storage.trackListingEvent(req.params.id, eventType, (req.user as any)?.id || null);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== FX STUDIO API ROUTES (www.pscomixx.online sync) ====================

  app.get("/api/usage/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      let tier: TierName = "free";
      let entitlements: (typeof tierEntitlements)[TierName] = tierEntitlements.free;
      try {
        const subscription = await storage.getUserSubscription(userId);
        tier = (subscription?.tier || "free") as TierName;
        entitlements = tierEntitlements[tier] || tierEntitlements.free;
      } catch (subErr: any) {
        console.error(`[usage/status] subscription lookup failed for ${userId}: ${subErr.message}`);
      }

      let aiCount = 0;
      let exportCount = 0;
      let projectCount = 0;
      try {
        [aiCount, exportCount] = await Promise.all([
          storage.getUsageCount(userId, "ai_generation", "daily", getTodayKey()),
          storage.getUsageCount(userId, "export", "monthly", getMonthKey()),
        ]);
      } catch (usageErr: any) {
        console.error(`[usage/status] usage count failed for ${userId}: ${usageErr.message}`);
      }
      try {
        const userProjects = await storage.getUserProjects(userId);
        projectCount = userProjects.length;
      } catch (projErr: any) {
        console.error(`[usage/status] project count failed for ${userId}: ${projErr.message}`);
      }

      res.json({
        tier,
        ai: {
          used: aiCount,
          limit: entitlements.aiGenerationsPerDay,
          remaining: entitlements.aiGenerationsPerDay === -1 ? -1 : Math.max(0, entitlements.aiGenerationsPerDay - aiCount),
        },
        export: {
          used: exportCount,
          limit: entitlements.exportsPerMonth,
          remaining: entitlements.exportsPerMonth === -1 ? -1 : Math.max(0, entitlements.exportsPerMonth - exportCount),
        },
        projects: {
          used: projectCount,
          limit: entitlements.maxProjects,
          remaining: entitlements.maxProjects === -1 ? -1 : Math.max(0, entitlements.maxProjects - projectCount),
        },
      });
    } catch (error: any) {
      console.error(`[usage/status] unexpected error: ${error.message}`);
      const ent = tierEntitlements.free;
      res.json({
        tier: "free",
        ai: { used: 0, limit: ent.aiGenerationsPerDay, remaining: ent.aiGenerationsPerDay },
        export: { used: 0, limit: ent.exportsPerMonth, remaining: ent.exportsPerMonth },
        projects: { used: 0, limit: ent.maxProjects, remaining: ent.maxProjects },
      });
    }
  });

  app.post("/api/usage/track-export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      if (req.user!.role === "admin") {
        return res.json({ allowed: true, remaining: -1 });
      }

      const exportFlag = await storage.getFeatureFlag("export_restrictions");
      if (exportFlag && !exportFlag.enabled) {
        return res.json({ allowed: true, remaining: -1 });
      }

      const subscription = await storage.getUserSubscription(userId);
      const tier = (subscription?.tier || "free") as TierName;
      const entitlements = tierEntitlements[tier] || tierEntitlements.free;

      const monthKey = getMonthKey();
      const currentCount = await storage.getUsageCount(userId, "export", "monthly", monthKey);

      if (entitlements.exportsPerMonth !== -1 && currentCount >= entitlements.exportsPerMonth) {
        return res.status(403).json({
          message: `Export limit reached. Your ${tier} plan allows ${entitlements.exportsPerMonth} exports per month. Upgrade for more.`,
          code: "EXPORT_LIMIT_REACHED",
          used: currentCount,
          limit: entitlements.exportsPerMonth,
        });
      }

      const newCount = await storage.incrementUsage(userId, "export", "monthly", monthKey);
      res.json({
        allowed: true,
        used: newCount,
        limit: entitlements.exportsPerMonth,
        remaining: entitlements.exportsPerMonth === -1 ? -1 : Math.max(0, entitlements.exportsPerMonth - newCount),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/generate-text", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      if (req.user!.role !== "admin") {
        const subscription = await storage.getUserSubscription(userId);
        const tier = (subscription?.tier || "free") as TierName;
        const entitlements = tierEntitlements[tier] || tierEntitlements.free;

        const todayKey = getTodayKey();
        const aiCount = await storage.getUsageCount(userId, "ai_generation", "daily", todayKey);

        if (entitlements.aiGenerationsPerDay !== -1 && aiCount >= entitlements.aiGenerationsPerDay) {
          return res.status(403).json({
            error: `AI generation limit reached. Your ${tier} plan allows ${entitlements.aiGenerationsPerDay} generations per day. Upgrade for more.`,
            code: "AI_LIMIT_REACHED",
            used: aiCount,
            limit: entitlements.aiGenerationsPerDay,
          });
        }
      }

      const { prompt, systemPrompt, maxTokens } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }

      const sanitizedPrompt = prompt
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .slice(0, 2000);

      const isStudent = req.user?.accountType === "student";
      const safetyPrefix = isStudent
        ? "You are creating content for a young audience (ages 6-17). All content must be family-friendly, age-appropriate, and safe for children. Never include violence, mature themes, profanity, or inappropriate content. "
        : "";

      const messages = [];
      const finalSystemPrompt = safetyPrefix + (systemPrompt || "");
      if (finalSystemPrompt) {
        messages.push({ role: "system", content: finalSystemPrompt });
      }
      messages.push({ role: "user", content: sanitizedPrompt });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              model: "openai",
              seed: Math.floor(Math.random() * 100000),
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Pollinations API error: ${response.status}`);
          }

          const text = await response.text();
          await storage.incrementUsage(userId, "ai_generation", "daily", getTodayKey());
          processProgressionEvent(userId, "ai_generation", undefined, "ai").catch(() => {});
          logAuditEvent("ai_generation", { req, userId, resourceType: "ai_text", metadata: { promptLength: sanitizedPrompt.length, accountType: req.user?.accountType, status: "success" } });
          return res.json({ text });
        } catch (err: any) {
          lastError = err;
          if (err.name === "AbortError") break;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      clearTimeout(timeout);
      throw lastError || new Error("AI generation failed after retries");
    } catch (error: any) {
      console.error("AI text generation error:", error);
      const msg = error.name === "AbortError"
        ? "AI generation timed out. Please try again."
        : error.message || "AI generation failed";
      res.status(500).json({ error: msg });
    }
  });

  const FX_API_URL = process.env.FX_STUDIO_API_URL || "https://upivslgwjtvqymonliib.supabase.co/functions/v1/get-effects";
  const FX_API_KEY = process.env.FX_STUDIO_API_KEY || "";
  const FX_STORAGE_BASE = "https://upivslgwjtvqymonliib.supabase.co/storage/v1/object/public/asset-library";
  const fxHeaders = () => ({
    "Content-Type": "application/json",
    apikey: FX_API_KEY,
    Authorization: `Bearer ${FX_API_KEY}`,
  });

  async function tryUpstreamSync(method: string, url: string, body?: string): Promise<any | null> {
    if (!FX_API_KEY) return null;

    async function attemptRequest(requestBody?: string): Promise<{ ok: boolean; status: number; parsed: any | null }> {
      try {
        const response = await fetchWithTimeout(url, {
          method,
          headers: fxHeaders(),
          ...(requestBody ? { body: requestBody } : {}),
          timeout: 30000,
        });
        if (response.ok) {
          const text = await response.text();
          try {
            return { ok: true, status: response.status, parsed: JSON.parse(text) };
          } catch {
            console.error(`[upstream-sync] ${method} ${url} — response OK but not JSON:`, text.slice(0, 200));
            return { ok: false, status: response.status, parsed: null };
          }
        }
        const errText = await response.text().catch(() => "");
        console.error(`[upstream-sync] ${method} ${url} — HTTP ${response.status}:`, errText.slice(0, 500));
        return { ok: false, status: response.status, parsed: null };
      } catch (err: any) {
        console.error(`[upstream-sync] ${method} ${url} — network error:`, err.message);
        return { ok: false, status: 0, parsed: null };
      }
    }

    try {
      const first = await attemptRequest(body);
      if (first.ok && first.parsed) return first.parsed;

      if (body && (first.status >= 500 || (first.ok === false && first.status > 0))) {
        try {
          const parsed = JSON.parse(body);
          if (parsed.preview_data_url) {
            const { preview_data_url, ...rest } = parsed;
            const retry = await attemptRequest(JSON.stringify(rest));
            if (retry.ok && retry.parsed) return retry.parsed;
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  app.get("/api/fx-studio/effects", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const userEmail = user?.email;

      const ownershipConditions: any[] = [];
      if (userId) ownershipConditions.push(eq(fxEffects.userId, userId));
      if (userEmail) ownershipConditions.push(eq(fxEffects.userEmail, userEmail));
      ownershipConditions.push(and(isNull(fxEffects.userId), isNull(fxEffects.userEmail)));
      const ownershipFilter = ownershipConditions.length === 1 ? ownershipConditions[0] : or(...ownershipConditions);

      const filters: any[] = [ownershipFilter];
      if (req.query.asset_tag) filters.push(eq(fxEffects.assetTag, req.query.asset_tag as string));
      if (req.query.project_id) filters.push(eq(fxEffects.projectId, req.query.project_id as string));
      if (req.query.type) filters.push(eq(fxEffects.type, req.query.type as string));
      if (req.query.search) filters.push(ilike(fxEffects.name, `%${req.query.search}%`));

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const localData = await db.select().from(fxEffects)
        .where(filters.length === 1 ? filters[0] : and(...filters))
        .orderBy(desc(fxEffects.createdAt))
        .limit(limit)
        .offset(offset);

      const localMapped = localData.map(mapEffectRow);

      if (FX_API_KEY && offset === 0) {
        try {
          const upstreamParams = new URLSearchParams();
          upstreamParams.set("limit", String(limit));
          upstreamParams.set("offset", "0");
          if (req.query.asset_tag) upstreamParams.set("asset_tag", req.query.asset_tag as string);
          if (req.query.project_id) upstreamParams.set("project_id", req.query.project_id as string);
          if (req.query.search) upstreamParams.set("search", req.query.search as string);
          if (userEmail) upstreamParams.set("user_email", userEmail);

          const upstreamRes = await fetchWithTimeout(
            `${FX_API_URL}?${upstreamParams.toString()}`,
            { method: "GET", headers: fxHeaders(), timeout: 4000 }
          );

          if (upstreamRes.ok) {
            const upstreamJson = await upstreamRes.json();
            const upstreamEffects: any[] = Array.isArray(upstreamJson) ? upstreamJson : upstreamJson?.data || [];

            const seenIds = new Set(localMapped.map((e: any) => e.id));
            const seenNames = new Set(localMapped.map((e: any) => e.name?.toLowerCase()));
            const merged: any[] = [];
            const maxCloudItems = Math.max(0, limit - localMapped.length);

            for (const ue of upstreamEffects) {
              if (merged.length >= maxCloudItems) break;
              const nameLower = ue.name?.toLowerCase();
              if (!seenIds.has(ue.id) && !seenNames.has(nameLower)) {
                seenIds.add(ue.id);
                if (nameLower) seenNames.add(nameLower);
                merged.push({
                  ...ue,
                  _source: "cloud",
                });
              }
            }

            if (merged.length > 0) {
              res.json([...localMapped, ...merged]);
              return;
            }
          }
        } catch (err: any) {
          console.error("[fx-list] upstream fetch failed (non-blocking):", err.message);
        }
      }

      res.json(localMapped);
    } catch (error: any) {
      console.error("FX effects GET error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  const mapEffectRow = (row: any) => {
    const layers = Array.isArray(row.layers) ? row.layers : [];
    const meta = row.metadata || {};
    return {
      id: row.id,
      user_email: row.userEmail,
      user_name: row.userName,
      name: row.name,
      description: meta.description || "",
      type: row.type,
      asset_tag: row.assetTag,
      preview_data_url: row.previewDataUrl,
      layers,
      layer_count: meta.layer_count || layers.length,
      total_frames: meta.total_frames || 0,
      fps: meta.fps || 0,
      canvas_background: row.canvasBackground,
      metadata: meta,
      project_id: row.projectId,
      source_mode: row.sourceMode,
      source_panel_id: row.sourcePanelId,
      target_page: row.targetPage,
      mode_hints: meta.mode_hints || null,
      script_data: meta.script_data || null,
      synced_to_cloud: !!meta.synced_to_cloud,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  };

  app.get("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const [row] = await db.select().from(fxEffects).where(eq(fxEffects.id, req.params.id)).limit(1);
      if (!row) {
        const upstream = await tryUpstreamSync("GET", `${FX_API_URL}?id=${req.params.id}`);
        if (upstream) {
          const effect = Array.isArray(upstream) ? upstream[0] : upstream?.data?.[0] || upstream;
          if (effect) return res.json(effect);
        }
        return res.status(404).json({ message: "Effect not found" });
      }
      if (row.userId && row.userId !== user?.id && row.userEmail !== user?.email && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(mapEffectRow(row));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/fx-studio/effects", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const body = req.body;

      const effectMetadata = {
        ...(body.metadata || {}),
        description: body.description || body.metadata?.description || "",
        total_frames: body.total_frames || body.metadata?.total_frames || 0,
        fps: body.fps || body.metadata?.fps || 0,
        layer_count: body.layer_count || body.metadata?.layer_count || 0,
        ...(body.mode_hints ? { mode_hints: body.mode_hints } : {}),
        ...(body.script_data ? { script_data: body.script_data } : {}),
      };

      const [inserted] = await db.insert(fxEffects).values({
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || user?.username || null,
        name: body.name || "Untitled",
        type: body.type || "static-asset",
        assetTag: body.asset_tag || null,
        previewDataUrl: body.preview_data_url || null,
        layers: body.layers || [],
        canvasBackground: body.canvas_background || null,
        metadata: effectMetadata,
        projectId: body.project_id || null,
        sourceMode: body.source_mode || null,
        sourcePanelId: body.source_panel_id || null,
        targetPage: body.target_page ?? null,
      }).returning();

      tryUpstreamSync("POST", FX_API_URL, JSON.stringify({
        name: body.name || "Untitled",
        description: body.description || "",
        type: body.type || "static-asset",
        asset_tag: body.asset_tag || null,
        preview_data_url: body.preview_data_url || null,
        layers: body.layers || [],
        canvas_background: body.canvas_background || null,
        total_frames: body.total_frames || 0,
        fps: body.fps || 0,
        layer_count: body.layer_count || 0,
        project_id: body.project_id || null,
        target_page: body.target_page ?? null,
        source_panel_id: body.source_panel_id || null,
        mode_hints: body.mode_hints || { comic: {}, vn: {}, cyoa: {} },
        script_data: body.script_data || null,
        user_email: user?.email,
        user_name: user?.name || user?.username,
      })).catch(() => {});

      res.json(mapEffectRow(inserted));
    } catch (error: any) {
      console.error("FX Studio POST error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const [existing] = await db.select().from(fxEffects).where(eq(fxEffects.id, req.params.id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Effect not found" });
      if (existing.userId && existing.userId !== user?.id && existing.userEmail !== user?.email && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.layers !== undefined) updates.layers = req.body.layers;
      if (req.body.preview_data_url !== undefined) updates.previewDataUrl = req.body.preview_data_url;
      if (req.body.canvas_background !== undefined) updates.canvasBackground = req.body.canvas_background;
      if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;
      if (req.body.asset_tag !== undefined) updates.assetTag = req.body.asset_tag;

      const [updated] = await db.update(fxEffects).set(updates).where(eq(fxEffects.id, req.params.id)).returning();

      tryUpstreamSync("PATCH", `${FX_API_URL}?id=${req.params.id}`, JSON.stringify(req.body)).catch(() => {});

      res.json({ id: updated.id, name: updated.name, updated_at: updated.updatedAt });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const [existing] = await db.select().from(fxEffects).where(eq(fxEffects.id, req.params.id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Effect not found" });
      if (existing.userId && existing.userId !== user?.id && existing.userEmail !== user?.email && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      await db.delete(fxEffects).where(eq(fxEffects.id, req.params.id));

      tryUpstreamSync("DELETE", `${FX_API_URL}?id=${req.params.id}`).catch(() => {});

      res.json({ success: true, id: existing.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/fx-studio/effects/:id/sync-to-cloud", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const [row] = await db.select().from(fxEffects).where(eq(fxEffects.id, req.params.id)).limit(1);
      if (!row) return res.status(404).json({ message: "Effect not found" });
      if (row.userId && row.userId !== user?.id && row.userEmail !== user?.email && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const mapped = mapEffectRow(row);
      const syncPayload = {
        name: mapped.name,
        description: mapped.description,
        type: mapped.type || "library-asset",
        asset_tag: mapped.asset_tag,
        preview_data_url: mapped.preview_data_url,
        layers: mapped.layers,
        canvas_background: mapped.canvas_background,
        total_frames: mapped.total_frames,
        fps: mapped.fps,
        layer_count: mapped.layer_count,
        project_id: mapped.project_id,
        target_page: mapped.target_page,
        source_panel_id: mapped.source_panel_id,
        mode_hints: mapped.mode_hints || { comic: {}, vn: {}, cyoa: {} },
        script_data: mapped.script_data,
        user_email: user?.email,
        user_name: user?.name || user?.username,
      };

      const result = await tryUpstreamSync("POST", FX_API_URL, JSON.stringify(syncPayload));

      if (result) {
        const updatedMeta = { ...(row.metadata as any || {}), synced_to_cloud: true, synced_at: new Date().toISOString() };
        await db.update(fxEffects).set({ metadata: updatedMeta, updatedAt: new Date() }).where(eq(fxEffects.id, req.params.id));

        res.json({ success: true, synced: true, id: row.id, message: "Synced to FX Studio cloud" });
      } else {
        res.json({ success: false, synced: false, id: row.id, message: "Upstream sync failed — try again later" });
      }
    } catch (error: any) {
      console.error("Cloud sync error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/fx-studio/health", async (_req, res) => {
    try {
      let upstreamStatus = "unknown";
      if (FX_API_KEY) {
        try {
          const response = await fetchWithTimeout(`${FX_API_URL}?limit=1`, {
            method: "GET",
            headers: fxHeaders(),
            timeout: 10000,
          });
          if (response.ok) {
            const text = await response.text();
            try {
              const parsed = JSON.parse(text);
              const hasData = Array.isArray(parsed) || (parsed?.data && Array.isArray(parsed.data));
              upstreamStatus = hasData ? "connected" : "connected_unknown_format";
            } catch {
              upstreamStatus = "connected_not_json";
            }
          } else {
            upstreamStatus = `error_${response.status}`;
          }
        } catch (err: any) {
          console.error("[fx-health] upstream check failed:", err.message);
          upstreamStatus = "unreachable";
        }
      } else {
        upstreamStatus = "no_api_key";
      }

      let localCount = 0;
      try {
        const [countResult] = await db.select({ count: sql`count(*)::int` }).from(fxEffects);
        localCount = (countResult?.count as number) || 0;
      } catch (dbErr: any) {
        console.error("[fx-health] local DB count failed:", dbErr.message);
      }
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        upstream: upstreamStatus,
        local_effects_count: localCount,
        fx_api_url: FX_API_URL,
        storage_base: FX_STORAGE_BASE,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // ==========================================
  // FX STUDIO LAYOUT SYNC (public endpoint for SEND TO button)
  // ==========================================

  app.options("/api/fx-studio/layout-sync", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, apikey, Authorization, x-webhook-secret");
    res.sendStatus(204);
  });

  app.post("/api/fx-studio/layout-sync", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const incomingApiKey = req.headers["apikey"] as string || "";
      const incomingAuth = (req.headers["authorization"] as string || "").replace("Bearer ", "");
      const incomingWebhook = req.headers["x-webhook-secret"] as string || "";
      const fxKey = process.env.FX_STUDIO_API_KEY || "";
      const streamingSecret = process.env.PSSTREAMING_WEBHOOK_SECRET || "";

      const isAuthValid = !fxKey ||
        incomingApiKey === fxKey ||
        incomingAuth === fxKey ||
        (streamingSecret && incomingWebhook === streamingSecret);

      if (fxKey && !isAuthValid) {
        console.warn("Layout-sync: invalid or missing API key");
      }

      const body = req.body;
      const {
        pages, template, title, metadata, script_data, asset_tag, target_page,
        preview_data_url, name: bodyName, type: bodyType, layers, canvas_background,
        description, total_frames, fps, layer_count, mode_hints, source_panel_id,
        project_id, source_mode,
      } = body;

      if (pages && !Array.isArray(pages)) {
        return res.status(400).json({ message: "pages must be an array" });
      }
      if (!pages && !script_data && !preview_data_url && !bodyName) {
        return res.status(400).json({ message: "Missing pages, script_data, preview_data_url, or name" });
      }
      if (pages) {
        for (const page of pages) {
          if (!page.panels || !Array.isArray(page.panels)) {
            return res.status(400).json({ message: "Each page must have a panels array" });
          }
        }
      }

      const type = bodyType || (script_data ? "comic-script" : pages ? "layout-spread" : "static-asset");
      const name = bodyName || title || `Asset ${new Date().toISOString().slice(0, 16)}`;

      const TAG_DEFAULTS: Record<string, string> = {
        "comic-script": "comic-script", "script-package": "script",
        "character": "character-art", "graffiti": "fx-overlay",
        "background-fx": "background", "filtered-image": "fx-overlay",
        "cover": "cover-front", "layout-spread": "page-layout",
        "overlay": "fx-overlay", "price-tag": "prop",
        "title": "title-card", "bubble": "speech-bubble",
        "library-asset": "prop", "panel-layout": "page-layout",
        "static-asset": "fx-overlay",
      };

      const resolvedTag = asset_tag || TAG_DEFAULTS[type] || "fx-overlay";

      const effectMetadata = {
        ...(metadata || {}),
        ...(pages ? { layout_data: { pages, template, title } } : {}),
        ...(script_data ? { script_data } : {}),
        description: description || "",
        total_frames: total_frames || 0,
        fps: fps || 0,
        layer_count: layer_count || 0,
        ...(mode_hints ? { mode_hints } : {}),
      };

      const [inserted] = await db.insert(fxEffects).values({
        name,
        type,
        assetTag: resolvedTag,
        previewDataUrl: preview_data_url || null,
        layers: layers || [],
        canvasBackground: canvas_background || null,
        metadata: effectMetadata,
        targetPage: target_page ?? null,
        projectId: project_id || null,
        sourceMode: source_mode || null,
        sourcePanelId: source_panel_id || null,
      }).returning();

      tryUpstreamSync("POST", FX_API_URL, JSON.stringify({
        name,
        description: description || "",
        type,
        asset_tag: resolvedTag,
        preview_data_url: preview_data_url || null,
        layers: layers || [],
        canvas_background: canvas_background || null,
        total_frames: total_frames || 0,
        fps: fps || 0,
        layer_count: layer_count || 0,
        project_id: project_id || null,
        target_page: target_page ?? null,
        source_panel_id: source_panel_id || null,
        mode_hints: mode_hints || { comic: {}, vn: {}, cyoa: {} },
        script_data: script_data || null,
      })).catch(() => {});

      const paramKey = type === "comic-script" || type === "script-package" ? "fromScript" : "fromLayout";

      res.json({
        success: true,
        effectId: inserted.id,
        type,
        asset_tag: resolvedTag,
        redirectUrl: `/comic?${paramKey}=${inserted.id}`,
        message: `${name} synced — open redirectUrl to apply`,
      });
    } catch (error: any) {
      console.error("Layout sync error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // COMMUNITY LIBRARY
  // ==========================================

  const communityRateLimiter = rateLimit({ windowMs: 60000, max: 60, standardHeaders: false, legacyHeaders: false });
  app.get("/api/community/library", communityRateLimiter, async (req, res) => {
    try {
      const { search, sort, page, limit, type } = req.query;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      const result = await storage.getCommunityComics({
        search: search as string,
        sort: (sort as string) || "newest",
        limit: limitNum,
        offset,
        type: type as string | undefined,
      });

      const getItemCount = (c: any) => {
        const d = c.data as any;
        if (!d) return 0;
        switch (c.type) {
          case "comic": return d.spreads?.length || 0;
          case "vn": return d.scenes?.length || 0;
          case "cyoa": return d.nodes?.length || 0;
          case "hop": return d.scenes?.length || 0;
          case "card": return Array.isArray(d) ? d.length : (d.cards?.length || 1);
          default: return 0;
        }
      };

      res.json({
        comics: result.comics.map(c => ({
          ...c,
          data: undefined,
          pageCount: getItemCount(c),
          projectType: c.type,
        })),
        total: result.total,
        page: pageNum,
        totalPages: Math.ceil(result.total / limitNum),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/comic/:id", async (req, res) => {
    try {
      const comic = await storage.getCommunityComic(req.params.id);
      if (!comic) {
        return res.status(404).json({ message: "Comic not found" });
      }
      res.json(comic);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/community/comic/:id/like", isAuthenticated, async (req, res) => {
    try {
      const comic = await storage.getCommunityComic(req.params.id);
      if (!comic) {
        return res.status(404).json({ message: "Comic not found" });
      }
      res.json({ success: true, message: "Liked" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== COMIC COMMENTS ====================
  app.get("/api/community/comic/:id/comments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.getComicComments(req.params.id, limit, offset);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/community/comic/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { text, parentId } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ message: "Comment text is required" });
      }
      if (text.length > 2000) {
        return res.status(400).json({ message: "Comment must be under 2000 characters" });
      }
      const comment = await storage.addComicComment({
        comicId: req.params.id,
        authorId: (req.user as any).id,
        text: text.trim(),
        parentId: parentId || undefined,
      });
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/community/comic/:id/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteComicComment(req.params.commentId, (req.user as any).id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== VIEW TRACKING ====================
  app.post("/api/community/comic/:id/view", async (req, res) => {
    try {
      await storage.incrementViewCount(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== BOOKMARKS ====================
  app.get("/api/bookmarks", isAuthenticated, async (req, res) => {
    try {
      const bookmarks = await storage.getUserBookmarks((req.user as any).id);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookmarks/:projectId", isAuthenticated, async (req, res) => {
    try {
      const bookmark = await storage.getBookmark((req.user as any).id, req.params.projectId);
      res.json(bookmark || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookmarks", isAuthenticated, async (req, res) => {
    try {
      const { projectId, lastSpreadIndex } = req.body;
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      const bookmark = await storage.upsertBookmark((req.user as any).id, projectId, lastSpreadIndex || 0);
      res.json(bookmark);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bookmarks/:projectId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBookmark((req.user as any).id, req.params.projectId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== COMIC SERIES ====================
  app.get("/api/series", isAuthenticated, async (req, res) => {
    try {
      const series = await storage.getUserSeries((req.user as any).id);
      res.json(series);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/series", isAuthenticated, async (req, res) => {
    try {
      const { title, description, coverImage } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      const series = await storage.createSeries({
        userId: (req.user as any).id,
        title: title.trim(),
        description: description || undefined,
        coverImage: coverImage || undefined,
      });
      res.json(series);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/series/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getSeries(req.params.id);
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Series not found" });
      }
      const { title, description, coverImage } = req.body;
      const result = await storage.updateSeries(req.params.id, {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        coverImage: coverImage !== undefined ? coverImage : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/series/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getSeries(req.params.id);
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Series not found" });
      }
      await storage.deleteSeries(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/series/:id/comics", async (req, res) => {
    try {
      const comics = await storage.getSeriesComics(req.params.id);
      res.json(comics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/series/:id/comics", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getSeries(req.params.id);
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Series not found" });
      }
      const { projectId, order } = req.body;
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "You can only add your own projects to a series" });
      }
      let assignedOrder = order;
      if (!assignedOrder || assignedOrder <= 0) {
        assignedOrder = await storage.getNextSeriesOrder(req.params.id);
      }
      await storage.addProjectToSeries(projectId, req.params.id, assignedOrder);

      if (project.status === "published" || project.status === "approved") {
        const subscribers = await storage.getSeriesSubscribers(req.params.id);
        const chapterTitle = project.title || `Chapter ${assignedOrder}`;
        for (const sub of subscribers) {
          if (sub.id !== (req.user as any).id && sub.email) {
            sendNewChapterNotification(sub.email, sub.name || "Reader", existing.title, chapterTitle, req.params.id).catch(() => {});
          }
        }
      }

      res.json({ success: true, order: assignedOrder });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/series/:id/comics/:projectId", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getSeries(req.params.id);
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Series not found" });
      }
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.userId !== (req.user as any).id || project.seriesId !== req.params.id) {
        return res.status(403).json({ message: "Cannot remove this project from the series" });
      }
      await storage.removeProjectFromSeries(req.params.projectId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/series", async (req, res) => {
    try {
      const seriesList = await storage.getPublicSeriesList();
      res.json(seriesList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/series/:id", async (req, res) => {
    try {
      const series = await storage.getSeries(req.params.id);
      if (!series) {
        return res.status(404).json({ message: "Series not found" });
      }
      const comics = await storage.getSeriesComics(req.params.id, true);
      const subscriberCount = await storage.getSeriesSubscriberCount(req.params.id);
      let isSubscribed = false;
      if (req.isAuthenticated?.() && req.user) {
        isSubscribed = await storage.isSubscribedToSeries((req.user as any).id, req.params.id);
      }
      res.json({ ...series, comics, subscriberCount, isSubscribed });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/featured-on-stage", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT p.id, p.title, p.type, p.thumbnail, p.status,
               u.name as creator_name, u.id as creator_id,
               COALESCE(p.view_count, 0) as views,
               COALESCE(likes_agg.like_count, 0) as likes,
               p.updated_at
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN (
          SELECT content_id, COUNT(*) as like_count
          FROM engagement_events
          WHERE event_type = 'like'
          GROUP BY content_id
        ) likes_agg ON likes_agg.content_id = p.id
        WHERE p.status IN ('published', 'approved')
          AND p.thumbnail IS NOT NULL
        ORDER BY p.updated_at DESC
        LIMIT 6
      `);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/my-stage-stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('published', 'approved')) as published_count,
          COALESCE(SUM(view_count) FILTER (WHERE status IN ('published', 'approved')), 0) as total_views
        FROM projects
        WHERE user_id = ${userId}
      `);
      const row = result.rows?.[0] || { published_count: 0, total_views: 0 };
      res.json({
        publishedCount: Number(row.published_count) || 0,
        totalViews: Number(row.total_views) || 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/community/series-featured", async (_req, res) => {
    try {
      const featured = await storage.getFeaturedSeriesList();
      res.json(featured);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/series/:id/subscribe", isAuthenticated, async (req, res) => {
    try {
      const series = await storage.getSeries(req.params.id);
      if (!series) {
        return res.status(404).json({ message: "Series not found" });
      }
      const sub = await storage.subscribeToSeries((req.user as any).id, req.params.id);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/series/:id/subscribe", isAuthenticated, async (req, res) => {
    try {
      await storage.unsubscribeFromSeries((req.user as any).id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/series/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const subs = await storage.getUserSeriesSubscriptions((req.user as any).id);
      res.json(subs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/series/:id/stats", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getSeries(req.params.id);
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Series not found" });
      }
      const stats = await storage.getSeriesStats(req.params.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/series/:id/featured", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { featured } = req.body;
      const result = await storage.setSeriesFeatured(req.params.id, !!featured);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== FOLLOW SYSTEM ====================
  app.post("/api/users/:id/follow", isAuthenticated, async (req, res) => {
    try {
      const followerId = (req.user as any).id;
      const followingId = req.params.id;
      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      const result = await storage.followUser(followerId, followingId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id/follow", isAuthenticated, async (req, res) => {
    try {
      await storage.unfollowUser((req.user as any).id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const followers = await storage.getUserFollowers(req.params.id);
      const count = await storage.getFollowerCount(req.params.id);
      res.json({ followers, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const following = await storage.getUserFollowing(req.params.id);
      const count = await storage.getFollowingCount(req.params.id);
      res.json({ following, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/is-following", isAuthenticated, async (req, res) => {
    try {
      const isFollowing = await storage.isFollowing((req.user as any).id, req.params.id);
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== THUMBNAIL + PREVIEW ====================
  app.post("/api/projects/:id/generate-thumbnail", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (req.body.thumbnail) {
        const thumb = req.body.thumbnail;
        if (typeof thumb !== "string") {
          return res.status(400).json({ message: "Thumbnail must be a string" });
        }
        if (!thumb.startsWith("data:image/") && !thumb.startsWith("http://") && !thumb.startsWith("https://")) {
          return res.status(400).json({ message: "Thumbnail must be a data URI or URL" });
        }
        if (thumb.length > 10 * 1024 * 1024) {
          return res.status(400).json({ message: "Thumbnail data too large (max 10MB)" });
        }
        await storage.updateProject(req.params.id, { thumbnail: thumb } as any);
        return res.json({ success: true, thumbnail: thumb });
      }

      const data = project.data as any;
      let thumbnailUrl: string | null = null;

      if (data?.comicMeta?.frontCover) {
        thumbnailUrl = data.comicMeta.frontCover;
      }
      if (!thumbnailUrl && data?.spreads?.[0]) {
        const spreadPages = [
          ...(data.spreads[0].leftPage || []),
          ...(data.spreads[0].rightPage || []),
          ...(data.spreads[0].panels || []),
        ];
        for (const panel of spreadPages) {
          const imageItem = (panel.contents || []).find((c: any) => c.type === "image" && c.data?.url);
          if (imageItem) {
            thumbnailUrl = imageItem.data.url;
            break;
          }
        }
      }
      if (!thumbnailUrl && data?.frontImage) {
        thumbnailUrl = data.frontImage;
      }
      if (!thumbnailUrl && data?.coverImage) {
        thumbnailUrl = data.coverImage;
      }
      if (!thumbnailUrl && data?.cards?.[0]?.frontImage) {
        thumbnailUrl = data.cards[0].frontImage;
      }
      if (!thumbnailUrl && data?.frontImage) {
        thumbnailUrl = data.frontImage;
      }
      if (!thumbnailUrl && data?.frames?.[0]) {
        const frame = data.frames[0];
        if (frame.imageData) {
          thumbnailUrl = frame.imageData;
        } else if (frame.drawingLayers) {
          for (const dl of frame.drawingLayers) {
            if (dl.imageData && dl.visible !== false) {
              thumbnailUrl = dl.imageData;
              break;
            }
          }
        }
        if (!thumbnailUrl && frame.imageLayers) {
          for (const il of frame.imageLayers) {
            if (il.url && il.visible !== false) {
              thumbnailUrl = il.url;
              break;
            }
          }
        }
      }
      if (!thumbnailUrl && data?.scenes?.[0]) {
        const scene = data.scenes[0];
        if (scene.backgroundUrl) {
          thumbnailUrl = scene.backgroundUrl;
        } else if (scene.background && data.backgrounds) {
          const bg = data.backgrounds.find((b: any) => b.id === scene.background);
          if (bg?.url) thumbnailUrl = bg.url;
        }
      }

      if (thumbnailUrl) {
        await storage.updateProject(req.params.id, { thumbnail: thumbnailUrl } as any);
        res.json({ success: true, thumbnail: thumbnailUrl });
      } else {
        res.status(400).json({ message: "No suitable image found for thumbnail" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id/preview", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Project not found" });
      }
      const user = await storage.getUser(project.userId);
      res.json({
        ...project,
        creator: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
`User-agent: *
Allow: /
Allow: /community
Allow: /community/read/
Allow: /portfolio/
Allow: /marketplace
Allow: /marketplace/listing/
Disallow: /api/
Disallow: /creator/
Disallow: /tools/
Disallow: /social/
Disallow: /admin/
Disallow: /library
Sitemap: https://pscomixx.com/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = "https://pscomixx.com";
      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/community", priority: "0.9", changefreq: "daily" },
        { loc: "/marketplace", priority: "0.8", changefreq: "daily" },
        { loc: "/pricing", priority: "0.7", changefreq: "weekly" },
        { loc: "/auth", priority: "0.6", changefreq: "monthly" },
        { loc: "/terms", priority: "0.5", changefreq: "monthly" },
        { loc: "/privacy", priority: "0.5", changefreq: "monthly" },
        { loc: "/disclaimer", priority: "0.4", changefreq: "monthly" },
        { loc: "/dmca", priority: "0.4", changefreq: "monthly" },
        { loc: "/compliance", priority: "0.4", changefreq: "monthly" },
        { loc: "/security", priority: "0.4", changefreq: "monthly" },
        { loc: "/accessibility-statement", priority: "0.4", changefreq: "monthly" },
      ];

      const communityComics = await storage.getCommunityComics({ sort: "newest", limit: 200 });
      const listings = await storage.getMarketplaceListings({ status: "active", limit: 200 });

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      for (const page of staticPages) {
        xml += `
  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      }

      for (const comic of communityComics.comics) {
        xml += `
  <url>
    <loc>${baseUrl}/community/read/${comic.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }

      for (const listing of listings) {
        xml += `
  <url>
    <loc>${baseUrl}/marketplace/listing/${listing.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }

      xml += `
</urlset>`;

      res.type("application/xml").send(xml);
    } catch (error) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/og/community/:id", async (req, res) => {
    try {
      const comic = await storage.getCommunityComic(req.params.id);
      if (!comic) return res.status(404).json({ message: "Not found" });
      res.json({
        title: `${comic.title} | Press Start CoMixx`,
        description: `Read "${comic.title}" by ${(comic as any).creator?.name || "a creator"} on Press Start CoMixx`,
        image: comic.thumbnail || "https://pscomixx.com/og-image.png",
        type: "article",
      });
    } catch {
      res.status(500).json({ message: "Error" });
    }
  });

  app.get("/og/portfolio/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "Not found" });
      res.json({
        title: `${user.name}'s Portfolio | Press Start CoMixx`,
        description: `Check out ${user.name}'s creative portfolio on Press Start CoMixx`,
        image: user.avatar || "https://pscomixx.com/og-image.png",
        type: "profile",
      });
    } catch {
      res.status(500).json({ message: "Error" });
    }
  });

  app.get("/og/marketplace/:id", async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Not found" });
      const price = listing.priceInCents === 0 ? "Free" : `$${(listing.priceInCents / 100).toFixed(2)}`;
      res.json({
        title: `${listing.title} (${price}) | Press Start CoMixx Marketplace`,
        description: listing.description || `Get "${listing.title}" on Press Start CoMixx Marketplace`,
        image: listing.thumbnail || "https://pscomixx.com/og-image.png",
        type: "product",
      });
    } catch {
      res.status(500).json({ message: "Error" });
    }
  });

  // =========== T002: Account Deletion & Data Export ===========

  app.delete("/api/auth/account", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await logAuditEvent("account_deletion", { req, userId, resourceType: "user", resourceId: userId });
      const success = await storage.deleteUserAccount(userId);
      if (success) {
        req.logout(() => {});
        res.json({ message: "Account deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (err) {
      res.status(500).json({ message: "Error deleting account" });
    }
  });

  app.get("/api/auth/export-data", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await logAuditEvent("data_export", { req, userId, resourceType: "user", resourceId: userId });
      const data = await storage.exportUserData(userId);
      res.setHeader("Content-Disposition", `attachment; filename="pscomixx-data-export-${Date.now()}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Error exporting data" });
    }
  });

  // =========== T005: SSO Configuration Endpoints ===========

  app.get("/api/auth/sso/config/:domain", async (req, res) => {
    try {
      const config = await storage.getSsoConfigByDomain(req.params.domain);
      if (!config || !config.enabled) {
        return res.status(404).json({ message: "SSO not configured for this domain" });
      }
      res.json({
        provider: config.provider,
        organizationName: config.organizationName,
        loginUrl: `/api/auth/sso/login?domain=${encodeURIComponent(req.params.domain)}`,
      });
    } catch {
      res.status(500).json({ message: "Error checking SSO configuration" });
    }
  });

  app.post("/api/auth/sso/configure", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { organizationName, domain, provider, idpEntityId, idpSsoUrl, idpCertificate, defaultRole } = req.body;
      if (!organizationName || !domain) return res.status(400).json({ message: "Organization name and domain required" });

      const existing = await storage.getSsoConfigByDomain(domain);
      if (existing) {
        const updated = await storage.updateSsoConfig(existing.id, { organizationName, provider, idpEntityId, idpSsoUrl, idpCertificate, defaultRole });
        await auditAdmin("sso_config_updated", req, "sso_config", existing.id);
        return res.json(updated);
      }

      const config = await storage.createSsoConfig({ organizationName, domain, provider: provider || "saml", idpEntityId, idpSsoUrl, idpCertificate, defaultRole: defaultRole || "student" });
      await auditAdmin("sso_config_created", req, "sso_config", config.id);
      res.json(config);
    } catch (err) {
      res.status(500).json({ message: "Error configuring SSO" });
    }
  });

  app.get("/api/auth/sso/login", async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain) return res.status(400).json({ message: "Domain required" });

      const config = await storage.getSsoConfigByDomain(domain);
      if (!config || !config.enabled) return res.status(404).json({ message: "SSO not configured" });

      if (config.idpSsoUrl) {
        return res.redirect(config.idpSsoUrl);
      }
      res.status(400).json({ message: "SSO IdP URL not configured" });
    } catch {
      res.status(500).json({ message: "Error initiating SSO login" });
    }
  });

  app.post("/api/auth/sso/callback", async (req, res) => {
    try {
      const { domain, email, name, externalId, token } = req.body;
      if (!domain || !email) return res.status(400).json({ message: "Domain and email required" });

      const config = await storage.getSsoConfigByDomain(domain);
      if (!config || !config.enabled) return res.status(404).json({ message: "SSO not configured" });

      if (!email.endsWith(`@${config.domain}`)) {
        await logAuditEvent("sso_domain_mismatch", { req, metadata: { email, expectedDomain: config.domain } });
        return res.status(403).json({ message: "Email domain does not match SSO configuration" });
      }

      if (config.idpCertificate && !token) {
        return res.status(400).json({ message: "SSO assertion token required for validated SSO" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user && config.autoProvision) {
        const hashedPw = await hashPassword(randomBytes(32).toString("hex"));
        user = await storage.createUser({
          name: name || email.split("@")[0],
          email,
          password: hashedPw,
          accountType: config.defaultRole === "student" ? "student" : "creator",
          role: config.defaultRole || "student",
        });
        await logAuditEvent("sso_account_provisioned", { userId: user.id, metadata: { domain, provider: config.provider } });
      }

      if (!user) return res.status(403).json({ message: "Account not found and auto-provisioning disabled" });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        logAuditEvent("sso_login", { req, userId: user!.id, metadata: { domain } });
        res.json({ user: { id: user!.id, name: user!.name, email: user!.email, role: (user as any).role } });
      });
    } catch (err) {
      res.status(500).json({ message: "SSO callback error" });
    }
  });

  app.get("/api/admin/sso-configs", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const configs = await storage.getAllSsoConfigs();
      res.json(configs);
    } catch {
      res.status(500).json({ message: "Error fetching SSO configs" });
    }
  });

  // =========== T006: Audit Log Endpoints ===========

  app.get("/api/admin/audit-log", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.action) filters.action = req.query.action;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);
      if (req.query.offset) filters.offset = parseInt(req.query.offset as string, 10);

      const [logs, total] = await Promise.all([
        storage.getAuditLogs(filters),
        storage.getAuditLogCount(filters),
      ]);
      res.json({ logs, total });
    } catch (err) {
      res.status(500).json({ message: "Error fetching audit logs" });
    }
  });

  // =========== T004: Teacher Dashboard API ===========

  app.get("/api/teacher/students", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const schoolId = req.query.schoolId as string;
      if (!schoolId) return res.status(400).json({ message: "School ID required" });
      const students = await storage.getTeacherStudents(user.id, schoolId);
      res.json(students);
    } catch (err) {
      res.status(500).json({ message: "Error fetching students" });
    }
  });

  app.get("/api/teacher/assignments", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const schoolId = req.query.schoolId as string;
      if (!schoolId) return res.status(400).json({ message: "School ID required" });
      const assignments = await storage.getTeacherAssignments(user.id, schoolId);
      res.json(assignments);
    } catch (err) {
      res.status(500).json({ message: "Error fetching assignments" });
    }
  });

  app.post("/api/teacher/assignments", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { schoolId, title, description, projectType, dueDate, settings } = req.body;
      if (!schoolId || !title || !projectType) return res.status(400).json({ message: "School ID, title, and project type required" });

      if (user.role !== "admin") {
        const membership = await storage.getSchoolMembership(user.id, schoolId);
        if (!membership || (membership.role !== "teacher" && membership.role !== "admin")) {
          return res.status(403).json({ message: "You are not authorized for this school" });
        }
      }

      const assignment = await storage.createAssignment({
        schoolId,
        teacherId: user.id,
        title,
        description,
        projectType,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        settings,
      });
      await auditAdmin("assignment_created", req, "assignment", assignment.id);
      try {
        const students = await storage.getSchoolStudents(schoolId);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        for (const student of students) {
          sendAssignmentNotification(student.email, student.name, title, dueDate || null, user.name, baseUrl);
        }
      } catch (_e) {}
      res.json(assignment);
    } catch (err) {
      res.status(500).json({ message: "Error creating assignment" });
    }
  });

  app.put("/api/teacher/assignments/:id", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(req.params.id, req.body);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      res.json(assignment);
    } catch (err) {
      res.status(500).json({ message: "Error updating assignment" });
    }
  });

  app.delete("/api/teacher/assignments/:id", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteAssignment(req.params.id);
      res.json({ message: "Assignment deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting assignment" });
    }
  });

  app.get("/api/teacher/assignments/:id/submissions", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const submissions = await storage.getAssignmentSubmissions(req.params.id);
      res.json(submissions);
    } catch (err) {
      res.status(500).json({ message: "Error fetching submissions" });
    }
  });

  app.post("/api/assignments/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const submission = await storage.submitAssignment({
        assignmentId: req.params.id,
        studentId: user.id,
        projectId: req.body.projectId,
      });
      await auditStudent("assignment_submitted", req, "assignment_submission", submission.id);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const assignment = await storage.getAssignment(req.params.id);
      if (assignment) {
        sendSubmissionConfirmation(user.email, user.name, assignment.title, baseUrl);
      }
      res.json(submission);
    } catch (err) {
      res.status(500).json({ message: "Error submitting assignment" });
    }
  });

  app.post("/api/teacher/submissions/:id/grade", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { grade, feedback } = req.body;
      if (!grade) return res.status(400).json({ message: "Grade required" });
      const submission = await storage.gradeSubmission(req.params.id, grade, feedback);
      if (!submission) return res.status(404).json({ message: "Submission not found" });
      await auditAdmin("submission_graded", req, "assignment_submission", req.params.id);
      try {
        const student = await storage.getUser(submission.studentId);
        const assignment = await storage.getAssignment(submission.assignmentId);
        if (student && assignment) {
          const baseUrl = `${req.protocol}://${req.get("host")}`;
          sendGradeNotification(student.email, student.name, assignment.title, grade, feedback || "", baseUrl);
        }
      } catch (_e) {}
      res.json(submission);
    } catch (err) {
      res.status(500).json({ message: "Error grading submission" });
    }
  });

  // =========== T007: Legal/Privacy/Terms Endpoints ===========

  app.get("/api/legal/privacy-policy", (_req, res) => {
    res.json({
      title: "Privacy Policy",
      version: "3.0",
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-03-21",
      content: {
        introduction: "MADMixedMedia LLC (\"MADMixedMedia,\" \"we,\" \"us,\" \"our\") operates an integrated ecosystem of creative, educational, streaming, and technology platforms (collectively, the \"Ecosystem\"). This Privacy Policy applies to all users of the Ecosystem, including but not limited to the following platforms and any successor, affiliated, or white-labeled versions thereof: Press Start CoMiXX (pscomixx.com, pscomixx.com, comixx.website, www.pscomixx.online) — AI-powered creative studio; PressPlays / FX Studio (www.pscomixx.online) — visual effects and media production; PS Streaming / Mad Mixed Media (psstreaming.com, psstreaming.online) — content streaming and distribution; Press Start LMS (pressstart.tech) — learning management system; and any mobile applications, APIs, widgets, browser extensions, or embedded experiences that link to this Privacy Policy. By creating an account on, accessing, or using any Ecosystem platform, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. If you do not agree, you must not access or use any Ecosystem platform.",
        dataCollection: {
          title: "Information We Collect",
          items: [
            "Account information: name or username, email address, account type (Student/Creator/Teacher/Admin), age range for age-gating purposes, and profile details you choose to provide",
            "Single Sign-On (SSO) data: when you use one Ecosystem account to access another platform, we share your user ID, email, display name, role, subscription tier, and originating platform to authenticate you seamlessly",
            "Content created: comics, trading cards, motion graphics, visual novels, choose-your-own-adventure stories, FX assets, scripts, video projects, and other creative works you produce using our tools across any Ecosystem platform",
            "Usage data: features accessed, projects created, AI generation requests, XP earned, login timestamps, session duration, tool interactions, and cross-platform navigation patterns for improving the Ecosystem experience",
            "Device information: browser type, operating system, screen resolution, and IP address (collected for security and abuse prevention only)",
            "Communications: social posts, comments, direct messages, collaboration requests, and community interactions within any Ecosystem platform",
            "Payment information: processed securely through Stripe; we do not store credit card numbers on our servers",
            "Streaming and viewing data: content you watch, listen to, or interact with on PS Streaming / Mad Mixed Media, including view counts, watch time, and bookmarks",
            "Educational data: assignment submissions, grades, portfolio items, teacher feedback, and class participation data processed through Press Start LMS",
            "Webhook and integration data: event data (e.g., project published, export completed, XP milestones) transmitted between Ecosystem platforms and to authorized third-party integrations"
          ]
        },
        crossPlatform: {
          title: "Cross-Platform Data Sharing Within the Ecosystem",
          items: [
            "Your Ecosystem account enables single sign-on (SSO) access across all MADMixedMedia platforms. When you sign in to one platform, your identity (user ID, email, display name, role, tier, and originating platform) may be shared with other Ecosystem platforms to authenticate your session",
            "Content you create on one platform (e.g., comics on CoMiXX, FX assets on PressPlays) may be referenced, displayed, or streamed on other Ecosystem platforms (e.g., published to PS Streaming) when you choose to publish or share it",
            "XP, leveling progress, and activity data earned on any Ecosystem platform may be synchronized across platforms to maintain a unified creator profile and leaderboard",
            "Subscription tier and entitlements are shared across the Ecosystem so that a subscription purchased on one platform grants the appropriate access on all platforms",
            "You may control cross-platform sharing preferences in your account Settings on any Ecosystem platform. Opting out of cross-platform sharing may limit functionality on some platforms",
            "We do not share your data with platforms or services outside the MADMixedMedia Ecosystem except as described in the Third-Party Services section below"
          ]
        },
        studentData: {
          title: "Student Data Protection (COPPA/FERPA Compliance)",
          items: [
            "We comply with the Children's Online Privacy Protection Act (COPPA) and the Family Educational Rights and Privacy Act (FERPA) across all Ecosystem platforms",
            "We collect only the minimum data necessary to provide educational and creative services",
            "Verifiable parental consent is required before creating accounts for users under 13 years of age on any Ecosystem platform",
            "Student data is NEVER sold, rented, leased, or shared with third parties for advertising, marketing, or any non-educational purpose — this applies across all Ecosystem platforms without exception",
            "Teachers and authorized school administrators may review student activity and progress within any Ecosystem platform used by their institution",
            "AI-generated content for student accounts includes mandatory safety filters and content moderation on all Ecosystem platforms",
            "Student accounts have restricted access to marketplace features, monetization, direct messaging, and social features across all Ecosystem platforms",
            "Schools and parents/guardians can request complete data export or deletion across all Ecosystem platforms at any time by contacting districts@pscomixx.com",
            "We do not use student data for behavioral targeting, profiling, or building advertising profiles on any Ecosystem platform",
            "We do not permit students under 13 to make purchases or engage in financial transactions on any Ecosystem platform",
            "Cross-platform SSO for student accounts is limited to platforms authorized by the student's institution or parent/guardian"
          ]
        },
        dataRetention: {
          title: "Data Retention",
          items: [
            "Active accounts: data is retained across all Ecosystem platforms while the account is active and in good standing",
            "School-administered accounts: data is retained per the Data Processing Agreement, with a default of 2 years post-enrollment unless otherwise specified",
            "Deleted accounts: all personally identifiable data is purged from all Ecosystem platforms within 30 days of a deletion request",
            "Audit logs: retained for up to 7 years per regulatory compliance requirements",
            "AI generation logs: retained for up to 1 year for safety review and content moderation purposes, then permanently deleted",
            "Streaming and viewing history: retained while your account is active; deleted within 30 days of account deletion",
            "Webhook delivery logs: retained for up to 90 days for debugging and audit purposes"
          ]
        },
        dataRights: {
          title: "Your Rights",
          items: [
            "Access: You may request a copy of all data we hold about you across all Ecosystem platforms via Settings or by emailing privacy@pscomixx.com",
            "Deletion: You may delete your account and request removal of all associated data from all Ecosystem platforms via Settings > Delete Account on any platform",
            "Correction: You may update or correct your profile information at any time; changes propagate across the Ecosystem",
            "Portability: You may export your projects, assets, and data in standard formats (JSON, PNG, PDF, .rpy)",
            "Opt-out: You may disable optional analytics, cross-platform data sharing, and tracking in Settings",
            "Parental access: Parents/guardians of users under 18 may request access to or deletion of their child's account and data across all Ecosystem platforms at any time",
            "California residents: Under the CCPA, you have the right to know what personal information we collect, request deletion, and opt out of any sale of personal information (we do not sell personal information)"
          ]
        },
        security: {
          title: "Security Measures",
          items: [
            "Passwords hashed using scrypt with unique per-user salts; we never store plaintext passwords",
            "HTTPS/TLS encryption for all data transmitted between your browser and our servers across all Ecosystem platforms",
            "Content Security Policy (CSP), X-Frame-Options, and other security headers enforced on all Ecosystem platforms",
            "Rate limiting on all API endpoints across all platforms to prevent abuse and denial-of-service attacks",
            "Session-based authentication with secure, httpOnly, SameSite cookies",
            "JWT-based single sign-on tokens with expiration, audience validation, and origin verification for cross-platform authentication",
            "Content moderation including perceptual hash matching and SHA-256 exact hash matching to detect and block prohibited content",
            "Regular security assessments and code reviews",
            "Input sanitization and prompt safety filtering on all AI generation requests"
          ]
        },
        noSell: {
          title: "We Do NOT Sell Your Data",
          items: [
            "MADMixedMedia does not sell, rent, lease, or trade personal information of any user to any third party, for any purpose, under any circumstances — this applies across all Ecosystem platforms",
            "We do not share user data with advertisers or data brokers",
            "We do not use personal information for targeted advertising on any Ecosystem platform",
            "We do not build or contribute to advertising profiles about our users",
            "Any third-party services we use (database hosting, payment processing, AI generation, email delivery) are bound by data processing agreements and are prohibited from using your data beyond what is necessary to provide their service",
            "Data shared between Ecosystem platforms is used solely for providing Ecosystem services and is never shared externally for non-service purposes"
          ]
        },
        thirdParty: {
          title: "Third-Party Services",
          items: [
            "Neon Database (PostgreSQL hosting) - United States - Stores user accounts, projects, and platform data for Ecosystem platforms",
            "Stripe (Payment processing) - United States - Processes Creator account payments and subscriptions; no student data is shared with Stripe",
            "Pollinations.ai (AI generation) - European Union - Processes image and text generation requests; no personally identifiable user data is sent",
            "Resend (Email delivery) - United States - Sends transactional emails including welcome messages, purchase confirmations, and assignment notifications",
            "Google Fonts (Typography) - Serves web fonts across Ecosystem platforms; subject to Google's Privacy Policy",
            "PSStreaming / Mad Mixed Media (Content delivery) - United States - Streams and distributes published content within the Ecosystem"
          ]
        },
        cookies: {
          title: "Cookies & Local Storage",
          items: [
            "We use essential session cookies for authentication on each Ecosystem platform; these are required for the platforms to function",
            "We use localStorage and IndexedDB for offline project saving and PWA functionality",
            "Cross-platform SSO uses secure JWT tokens stored in memory or httpOnly cookies; these tokens are not used for tracking",
            "We do not use third-party tracking cookies, advertising cookies, or cross-site tracking pixels on any Ecosystem platform",
            "You may clear cookies and local storage through your browser settings; doing so may require you to log in again and may affect offline project data"
          ]
        },
        contact: "For privacy inquiries: privacy@pscomixx.com | For school/district data requests: districts@pscomixx.com | For COPPA-related requests: coppa@pscomixx.com | MADMixedMedia LLC | Ecosystem platforms: pscomixx.com, www.pscomixx.online, psstreaming.com, pressstart.tech"
      }
    });
  });

  app.get("/api/legal/terms", (_req, res) => {
    res.json({
      title: "Terms of Service",
      version: "3.0",
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-03-21",
      content: {
        acceptance: "By creating an account, accessing, or using any platform within the MADMixedMedia Ecosystem (collectively, the \"Ecosystem\"), you agree to be bound by these Terms of Service (\"Terms\"). The Ecosystem includes, but is not limited to: Press Start CoMiXX (pscomixx.com, pscomixx.com, comixx.website, www.pscomixx.online) — AI-powered creative studio; PressPlays / FX Studio (www.pscomixx.online) — visual effects and media production; PS Streaming / Mad Mixed Media (psstreaming.com, psstreaming.online) — content streaming and distribution; Press Start LMS (pressstart.tech) — learning management system; and any mobile applications, APIs, widgets, browser extensions, embedded experiences, or successor platforms operated by MADMixedMedia LLC. These Terms apply equally to all Ecosystem platforms. An account created on any Ecosystem platform may grant you access to other Ecosystem platforms via single sign-on (SSO). By using SSO to access additional platforms, you agree that these Terms govern your use of those platforms as well. If you are under 18, you represent that your parent, legal guardian, or authorized school administrator has reviewed, understood, and agreed to these Terms on your behalf. If you do not agree to these Terms, you must not access or use any Ecosystem platform.",
        eligibility: "Student accounts are available for users ages 6-17 and require verifiable parental consent or school administrator authorization. Creator accounts require users to be 18 years of age or older. School-administered accounts are governed by a separate Data Processing Agreement (DPA) between MADMixedMedia and the institution. These eligibility requirements apply uniformly across all Ecosystem platforms. Users must provide accurate information during registration. Accounts created with false information may be terminated without notice. An account created on one Ecosystem platform is valid across all platforms, and suspension or termination on one platform may result in suspension or termination across the entire Ecosystem.",
        content: "You retain full ownership of all original content you create using any Ecosystem platform, including but not limited to comics, visual novels, trading cards, CYOA stories, motion graphics, FX assets, scripts, video projects, and other creative works (\"User Content\"). By publishing or sharing User Content on any Ecosystem platform, you grant MADMixedMedia a limited, non-exclusive, royalty-free, worldwide license to display, distribute, stream, and promote your User Content within the Ecosystem and its associated marketing channels. This includes the right to display your content on other Ecosystem platforms (e.g., content created on CoMiXX may be streamed on PS Streaming, or FX assets created on PressPlays may be referenced in CoMiXX). This license exists solely to operate and promote the Ecosystem and does not transfer ownership. You may revoke this license at any time by removing your User Content or deleting your account; removal from one platform will be propagated across the Ecosystem within a reasonable timeframe. AI-generated content created through Ecosystem tools is subject to our Acceptable Use Policy. You are responsible for ensuring your User Content does not infringe on the intellectual property rights of others.",
        platformIP: "All Ecosystem platform tools, systems, user interface designs, code, mechanics, templates, asset packs, FX libraries, XP systems, AI integration pipelines, streaming infrastructure, LMS frameworks, and branding (including but not limited to the names \"Press Start,\" \"CoMiXX,\" \"PressPlays,\" \"FX Studio,\" \"Mad Mixed Media,\" \"PS Streaming,\" \"MADMixedMedia,\" and \"Press Play Festival\") remain the exclusive intellectual property of MADMixedMedia LLC. Users are granted a limited, non-exclusive, non-transferable, revocable license to use these tools and assets solely within the Ecosystem for personal or educational use. This license does not grant any rights to sublicense, redistribute, reverse-engineer, decompile, disassemble, or create derivative works based on Ecosystem tools, assets, or code. Pre-made asset packs, templates, effects, and FX libraries provided by any Ecosystem platform may not be extracted, resold, or redistributed outside the Ecosystem without written permission from MADMixedMedia.",
        prohibited: "The following conduct is prohibited across all Ecosystem platforms. Users may not: (a) upload, publish, or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable; (b) upload content that infringes any patent, trademark, copyright, trade secret, or other intellectual property right of any party; (c) harass, bully, stalk, or intimidate other users on any Ecosystem platform; (d) attempt to circumvent, disable, or interfere with any safety filters, content moderation, SSO authentication, or security features of any Ecosystem platform; (e) share, solicit, or expose personal information of minors; (f) use any Ecosystem platform for unauthorized commercial purposes, spam, or unsolicited advertising; (g) reverse-engineer, decompile, disassemble, or attempt to derive the source code of any Ecosystem software; (h) scrape, crawl, or use automated means to access or collect data from any Ecosystem platform; (i) impersonate any person or entity or misrepresent your affiliation with any person or entity; (j) introduce viruses, malware, or other harmful code to any Ecosystem platform; (k) exploit SSO or cross-platform integrations to access platforms or features you are not authorized to use; (l) circumvent subscription tier restrictions, usage limits, or payment requirements; or (m) violate any applicable local, state, national, or international law or regulation. Violations on any single Ecosystem platform may result in enforcement action across the entire Ecosystem.",
        dmca: "MADMixedMedia respects the intellectual property rights of others and expects our users to do the same across all Ecosystem platforms. If you believe that your copyrighted work has been copied or used in a way that constitutes copyright infringement on any Ecosystem platform, please submit a DMCA takedown notice to dmca@pscomixx.com with: (1) a description of the copyrighted work you claim has been infringed; (2) identification of the material that is claimed to be infringing, including which Ecosystem platform it appears on and its location; (3) your contact information (name, address, email, phone); (4) a statement that you have a good faith belief that the use is not authorized by the copyright owner; (5) a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf; and (6) your physical or electronic signature. We will respond to valid DMCA notices within 72 hours and may remove or disable access to the allegedly infringing material across all relevant Ecosystem platforms. Repeat infringers will have their accounts terminated across the entire Ecosystem.",
        termination: "We reserve the right to suspend or terminate any account that violates these Terms, engages in prohibited conduct, or poses a risk to the safety of other users, at our sole discretion and without prior notice. Termination or suspension may apply to a single Ecosystem platform or to all Ecosystem platforms simultaneously, at MADMixedMedia's discretion. Upon termination for cause, your license to use all Ecosystem platforms is immediately revoked. Users may voluntarily delete their account at any time through Settings > Delete Account on any Ecosystem platform. Voluntary account deletion will remove your account and data from all Ecosystem platforms within 30 days in accordance with our Privacy Policy. Provisions of these Terms that by their nature should survive termination (including but not limited to intellectual property, limitation of liability, and indemnification) shall survive.",
        liability: "THE ECOSYSTEM PLATFORMS ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. MADMIXEDMEDIA DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, WITH RESPECT TO ALL ECOSYSTEM PLATFORMS. MADMIXEDMEDIA IS NOT RESPONSIBLE FOR: (A) USER-GENERATED CONTENT POSTED BY USERS ON ANY ECOSYSTEM PLATFORM; (B) ANY LOSS, DAMAGE, OR HARM ARISING FROM THE USE OF OR INABILITY TO USE ANY ECOSYSTEM PLATFORM; (C) CONTENT OR CONDUCT OF ANY THIRD PARTY ON ANY ECOSYSTEM PLATFORM; (D) ANY UNAUTHORIZED ACCESS TO YOUR ACCOUNT ON ANY ECOSYSTEM PLATFORM; (E) INTERRUPTIONS, DELAYS, OR DEFECTS IN ANY ECOSYSTEM PLATFORM; (F) LOSS OF DATA DURING CROSS-PLATFORM SYNCHRONIZATION OR SSO AUTHENTICATION; (G) THIRD-PARTY CONTENT STREAMED OR DISTRIBUTED THROUGH PS STREAMING. IN NO EVENT SHALL MADMIXEDMEDIA'S TOTAL LIABILITY FOR CLAIMS ARISING FROM THE USE OF ALL ECOSYSTEM PLATFORMS COMBINED EXCEED THE AMOUNT YOU PAID TO MADMIXEDMEDIA IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES OR LIMITATION OF LIABILITY, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.",
        indemnification: "You agree to indemnify, defend, and hold harmless MADMixedMedia LLC, its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use of any Ecosystem platform; (b) your User Content on any Ecosystem platform; (c) your violation of these Terms on any Ecosystem platform; (d) your violation of any rights of any third party; or (e) your use of cross-platform features, SSO, or integrations between Ecosystem platforms.",
        dispute: "These Terms are governed by the laws of the United States. Any dispute arising from these Terms or the use of any Ecosystem platform shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except that either party may seek injunctive relief in any court of competent jurisdiction for intellectual property disputes. You agree to waive any right to a jury trial or to participate in a class action. These dispute resolution provisions apply to disputes arising from the use of any and all Ecosystem platforms.",
        modifications: "MADMixedMedia reserves the right to modify these Terms at any time. Material changes will be communicated through all Ecosystem platforms with at least 30 days' notice. Continued use of any Ecosystem platform after changes take effect constitutes acceptance of the revised Terms for all Ecosystem platforms. If you do not agree with the revised Terms, you must stop using all Ecosystem platforms and delete your account.",
        minorSafety: "For users under 18 across all Ecosystem platforms: The Ecosystem implements age-appropriate content filtering, restricted social features, and educator oversight capabilities. Users under 13 require verifiable parental consent. Schools and teachers act as supervising authorities for school-administered accounts. Direct messaging between minor users is subject to moderation on all Ecosystem platforms. Student accounts cannot access monetization features, make purchases, or sell content on any Ecosystem marketplace. Parents/guardians may review, restrict, or delete their child's account across all Ecosystem platforms at any time. Student SSO access between Ecosystem platforms is limited to platforms authorized by the student's institution or parent/guardian.",
        schoolAgreement: "Schools and educational institutions using any Ecosystem platform agree that: (a) they are responsible for obtaining necessary parental consents for student use across all Ecosystem platforms the institution authorizes; (b) they act as the supervising authority for student activity during school-sponsored use on any Ecosystem platform; (c) they will comply with applicable student privacy laws; (d) MADMixedMedia is not liable for classroom misuse or unauthorized student access outside of school hours on any Ecosystem platform; (e) the institution's Data Processing Agreement governs the handling of student education records across all Ecosystem platforms; (f) they will designate which Ecosystem platforms are authorized for student use, and student SSO access will be limited accordingly."
      }
    });
  });

  app.get("/api/legal/dpa", (_req, res) => {
    res.json({
      title: "Data Processing Agreement",
      version: "2.0",
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-03-21",
      content: {
        purpose: "This Data Processing Agreement (\"DPA\") supplements the Terms of Service and applies when any platform within the MADMixedMedia Ecosystem processes Student Education Records on behalf of a School or School District (\"Institution\"). The Ecosystem includes Press Start CoMiXX (pscomixx.com, pscomixx.com, comixx.website, www.pscomixx.online), PressPlays / FX Studio (www.pscomixx.online), PS Streaming / Mad Mixed Media (psstreaming.com, psstreaming.online), Press Start LMS (pressstart.tech), and any successor or affiliated platforms. This DPA governs the processing of Student Education Records across all Ecosystem platforms authorized by the Institution for student use.",
        definitions: {
          "Student Education Records": "Any information directly related to a student that is maintained by the Institution, as defined under FERPA (20 U.S.C. § 1232g).",
          "School Official": "A person with a legitimate educational interest, designated by the Institution, who uses any Ecosystem platform to support educational activities.",
          "De-identified Data": "Data from which all personally identifiable information has been removed or obscured.",
          "Ecosystem": "All platforms operated by MADMixedMedia LLC, including but not limited to Press Start CoMiXX, PressPlays / FX Studio, PS Streaming / Mad Mixed Media, and Press Start LMS.",
          "Authorized Platforms": "The specific Ecosystem platforms designated by the Institution for student use under this DPA."
        },
        obligations: [
          "We process Student Education Records solely for the purpose of providing educational services as directed by the Institution across all Authorized Platforms",
          "Student data is never sold, rented, leased, or shared with third parties for advertising, marketing, or any non-educational purpose on any Ecosystem platform",
          "We implement reasonable security measures to protect student data across all Ecosystem platforms, including encryption in transit and at rest, access controls, and content moderation",
          "We provide the Institution with access to, and the ability to delete, student data across all Authorized Platforms upon request",
          "We notify the Institution within 72 hours of any data breach affecting student data on any Ecosystem platform",
          "We return or delete student data from all Ecosystem platforms within 30 days upon termination of the agreement",
          "We comply with FERPA, COPPA, and applicable state student privacy laws across all Ecosystem platforms",
          "Cross-platform SSO for student accounts is restricted to Authorized Platforms only; students cannot access non-authorized Ecosystem platforms via SSO",
          "Student data shared between Authorized Platforms via SSO or integrations is limited to the minimum necessary for authentication and educational service delivery",
          "We maintain audit logs of all cross-platform student data access for institutional review"
        ],
        dataRetention: "Student data is retained across all Authorized Platforms for the duration of the agreement plus 60 days. Institutions may specify shorter retention periods. Upon termination, student data is purged from all Ecosystem platforms, including backups, within the specified timeframe. Annual certification of data destruction across all Ecosystem platforms is provided upon request.",
        subprocessors: [
          { name: "Neon Database", purpose: "PostgreSQL database hosting for all Ecosystem platforms", location: "United States" },
          { name: "Pollinations.ai", purpose: "AI image and text generation (no student PII is transmitted)", location: "European Union" },
          { name: "Stripe", purpose: "Payment processing (Creator accounts only; never used for student accounts)", location: "United States" },
          { name: "Resend", purpose: "Transactional email delivery (assignment notifications, grade notifications)", location: "United States" }
        ],
        contact: "For DPA execution or questions: districts@pscomixx.com | For data breach notifications: security@pscomixx.com | MADMixedMedia LLC"
      }
    });
  });

  app.post("/api/legal/accept-tos", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { version } = req.body;
      if (!version) return res.status(400).json({ message: "Version required" });
      const acceptance = await storage.recordTosAcceptance(userId, version, req.ip);
      await logAuditEvent("tos_accepted", { req, userId, metadata: { version } });
      res.json(acceptance);
    } catch (err) {
      res.status(500).json({ message: "Error recording TOS acceptance" });
    }
  });

  app.get("/api/legal/tos-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const latest = await storage.getLatestTosAcceptance(userId);
      res.json({ accepted: !!latest, version: latest?.version || null, acceptedAt: latest?.acceptedAt || null });
    } catch {
      res.status(500).json({ message: "Error checking TOS status" });
    }
  });

  // =========== T008: AI Governance ===========

  app.get("/api/admin/ai-audit", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs({
        action: "ai_generation",
        limit: parseInt(req.query.limit as string || "50", 10),
        offset: parseInt(req.query.offset as string || "0", 10),
      });
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Error fetching AI audit logs" });
    }
  });

  // =========== T010: Compliance Documentation Endpoints ===========

  app.get("/api/compliance/overview", (_req, res) => {
    res.json({
      certifications: [
        { name: "FERPA", status: "compliant", description: "Family Educational Rights and Privacy Act - Student education records protected" },
        { name: "COPPA", status: "compliant", description: "Children's Online Privacy Protection Act - Parental consent for users under 13" },
        { name: "CIPA", status: "compliant", description: "Children's Internet Protection Act - Content filtering for school networks" },
        { name: "SOC 2 Type II", status: "in_progress", description: "Service Organization Control - Security, availability, and confidentiality" },
        { name: "WCAG 2.1 AA", status: "compliant", description: "Web Content Accessibility Guidelines - Accessible to users with disabilities" },
      ],
      securityMeasures: [
        "End-to-end HTTPS/TLS encryption",
        "Scrypt password hashing with per-user salts",
        "Content Security Policy (CSP) headers via Helmet.js",
        "API rate limiting (200 req/min global, 10 req/15min auth, 10 req/min AI)",
        "Session-based authentication with secure HttpOnly cookies",
        "Input sanitization and XSS prevention",
        "SQL injection prevention via parameterized queries (Drizzle ORM)",
        "Comprehensive audit logging for all security events",
        "Automated content filtering for student safety",
        "AI prompt sanitization (2000 char limit, HTML strip, safety modifiers)",
      ],
      dataProtection: [
        "Data encryption at rest and in transit",
        "Automated data retention policies",
        "Right to deletion (FERPA/GDPR)",
        "Data portability (JSON export)",
        "Breach notification within 72 hours",
        "Annual security review and penetration testing",
      ],
      incidentResponse: {
        steps: [
          "1. Detection & Classification - Security team identifies and classifies the incident",
          "2. Containment - Immediate steps to prevent further damage",
          "3. Notification - Affected users and institutions notified within 72 hours",
          "4. Investigation - Root cause analysis conducted",
          "5. Remediation - Vulnerabilities patched and systems hardened",
          "6. Post-Incident Review - Lessons learned documented and shared",
        ],
        contact: "security@pscomixx.com",
        emergencyPhone: "Available upon DPA execution",
      },
      lastAuditDate: "2025-02-15",
      nextAuditDate: "2025-08-15",
    });
  });

  app.get("/api/compliance/accessibility", (_req, res) => {
    res.json({
      standard: "WCAG 2.1 Level AA",
      conformanceLevel: "Partial",
      evaluationDate: "2025-02-01",
      features: [
        { criterion: "1.1.1 Non-text Content", level: "A", status: "supports", notes: "All images have alt text, icons have aria-labels" },
        { criterion: "1.3.1 Info and Relationships", level: "A", status: "supports", notes: "Semantic HTML structure throughout" },
        { criterion: "1.4.1 Use of Color", level: "A", status: "supports", notes: "Color is not sole means of conveying information" },
        { criterion: "1.4.3 Contrast", level: "AA", status: "supports", notes: "High contrast mode available, minimum 4.5:1 ratio" },
        { criterion: "1.4.4 Resize Text", level: "AA", status: "supports", notes: "Text resizable up to 200% without loss" },
        { criterion: "2.1.1 Keyboard", level: "A", status: "supports", notes: "All functionality keyboard accessible, shortcuts documented" },
        { criterion: "2.4.1 Bypass Blocks", level: "A", status: "supports", notes: "Skip-to-content link provided" },
        { criterion: "2.4.7 Focus Visible", level: "AA", status: "supports", notes: "Focus indicators visible on all interactive elements" },
        { criterion: "2.5.1 Pointer Gestures", level: "A", status: "partially_supports", notes: "Drawing tools require pointer; keyboard alternatives in development" },
        { criterion: "3.1.1 Language of Page", level: "A", status: "supports", notes: "HTML lang attribute set" },
        { criterion: "4.1.2 Name, Role, Value", level: "A", status: "supports", notes: "ARIA labels on all interactive elements" },
      ],
      accommodations: [
        "High contrast mode toggle in Settings",
        "Reduced motion mode (respects OS setting + manual override)",
        "Keyboard shortcuts for all major functions (press ? for help)",
        "Screen reader compatible navigation",
        "Skip-to-content link for keyboard users",
      ],
      contact: "accessibility@pscomixx.com",
    });
  });

  // =========== Print Studio / Quote Requests ===========

  app.post("/api/print-quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, organization, accountType, productType, quantity, size, deadline, notes, artworkUrl } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Name is required" });
      }
      const validAccountTypes = ["school", "program", "creator"];
      if (!accountType || !validAccountTypes.includes(accountType)) {
        return res.status(400).json({ message: "Account type must be school, program, or creator" });
      }
      if (!productType || typeof productType !== "string" || productType.trim().length === 0) {
        return res.status(400).json({ message: "Product type is required" });
      }
      const parsedQuantity = quantity ? parseInt(quantity, 10) : null;
      if (parsedQuantity !== null && (isNaN(parsedQuantity) || parsedQuantity < 1)) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      const quote = await storage.createPrintQuoteRequest({
        userId,
        name: name.trim(),
        organization: organization?.trim() || null,
        accountType,
        productType: productType.trim(),
        quantity: parsedQuantity,
        size: size?.trim() || null,
        deadline: deadline?.trim() || null,
        notes: notes?.trim() || null,
        artworkUrl: artworkUrl?.trim() || null,
        status: "pending",
      });
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating print quote request:", error);
      res.status(500).json({ message: "Error creating print quote request" });
    }
  });

  app.get("/api/print-quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const quotes = await storage.getUserPrintQuoteRequests(userId);
      res.json(quotes);
    } catch {
      res.status(500).json({ message: "Error fetching print quote requests" });
    }
  });

  app.get("/api/admin/print-quotes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const quotes = await storage.getAllPrintQuoteRequests();
      res.json(quotes);
    } catch {
      res.status(500).json({ message: "Error fetching print quote requests" });
    }
  });

  app.patch("/api/admin/print-quotes/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "reviewed", "quoted", "completed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status must be one of: pending, reviewed, quoted, completed" });
      }
      const updated = await storage.updatePrintQuoteStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Quote request not found" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Error updating quote request status" });
    }
  });

  // =========== Print Product Reviews ===========

  app.get("/api/print-reviews", async (req, res) => {
    try {
      const productType = req.query.productType as string | undefined;
      const reviews = await storage.getPrintProductReviews(productType);
      res.json(reviews);
    } catch {
      res.status(500).json({ message: "Error fetching print reviews" });
    }
  });

  app.get("/api/print-reviews/stats", async (req, res) => {
    try {
      const productType = req.query.productType as string | undefined;
      const stats = await storage.getPrintProductReviewStats(productType);
      res.json(stats);
    } catch {
      res.status(500).json({ message: "Error fetching review stats" });
    }
  });

  app.get("/api/print-reviews/my", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const reviews = await storage.getUserPrintProductReviews(user.id);
      res.json(reviews);
    } catch {
      res.status(500).json({ message: "Error fetching your reviews" });
    }
  });

  app.post("/api/print-reviews", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { productType, rating, title, reviewText, quoteRequestId } = req.body;

      if (!productType || rating === undefined || rating === null) {
        return res.status(400).json({ message: "Product type and rating are required" });
      }

      const validProductTypes = ["comic-books", "books-novels", "trading-cards", "posters", "stickers", "t-shirts", "promo-materials"];
      if (!validProductTypes.includes(productType)) {
        return res.status(400).json({ message: "Invalid product type" });
      }

      const existingReviews = await storage.getUserPrintProductReviews(user.id);
      const alreadyReviewed = existingReviews.find(r => r.productType === productType && (!quoteRequestId || r.quoteRequestId === quoteRequestId));
      if (alreadyReviewed) {
        return res.status(409).json({ message: "You have already reviewed this product type" });
      }

      const parsedRating = Math.floor(Number(rating));
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }
      if (title && typeof title !== "string") return res.status(400).json({ message: "Invalid title" });
      if (reviewText && typeof reviewText !== "string") return res.status(400).json({ message: "Invalid review text" });
      if (title && title.length > 120) return res.status(400).json({ message: "Title must be 120 characters or less" });
      if (reviewText && reviewText.length > 2000) return res.status(400).json({ message: "Review must be 2000 characters or less" });

      let verifiedOrder = false;
      const userQuotes = await storage.getUserPrintQuoteRequests(user.id);
      if (quoteRequestId) {
        const matchingQuote = userQuotes.find(q => q.id === quoteRequestId && q.status === "completed" && q.productType === productType);
        if (matchingQuote) verifiedOrder = true;
      } else {
        const completedQuote = userQuotes.find(q => q.status === "completed" && q.productType === productType);
        if (completedQuote) verifiedOrder = true;
      }

      const review = await storage.createPrintProductReview({
        userId: user.id,
        productType,
        rating: parsedRating,
        title: title || null,
        reviewText: reviewText || null,
        quoteRequestId: quoteRequestId || null,
        verifiedOrder,
      });

      res.status(201).json(review);
    } catch {
      res.status(500).json({ message: "Error creating review" });
    }
  });

  app.delete("/api/print-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const review = await storage.getPrintProductReview(req.params.id);
      if (!review) return res.status(404).json({ message: "Review not found" });
      if (review.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this review" });
      }
      await storage.deletePrintProductReview(req.params.id);
      res.json({ message: "Review deleted" });
    } catch {
      res.status(500).json({ message: "Error deleting review" });
    }
  });

  // =========== SSO / JWT Ecosystem Auth ===========

  async function getUserSSOData(user: any) {
    const sub = await storage.getUserSubscription(user.id);
    const tier = sub?.tier || "free";
    const { title: levelTitle } = getLevelFromXp(user.xp || 0);
    return { tier, levelTitle };
  }

  app.post("/api/auth/sso/token", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { tier, levelTitle } = await getUserSSOData(user);
      const token = issueEcosystemToken(user, tier, levelTitle);
      res.json({ token, expiresIn: 3600 });
    } catch (err) {
      res.status(500).json({ message: "Error issuing SSO token" });
    }
  });

  app.post("/api/auth/sso/verify", async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    try {
      const { token } = req.body;
      if (!token) {
        await logSSOAudit({ action: "verify", success: false, errorCode: "TOKEN_MISSING", errorMessage: "No token provided", ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(400).json(makeSSOError("TOKEN_MISSING", "Token is required in request body", requestId, startTime));
      }

      const result = verifyEcosystemTokenDetailed(token);
      if (!result.valid) {
        await logSSOAudit({ action: "verify", success: false, errorCode: result.errorCode, errorMessage: result.errorDetail, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        const statusCode = result.errorCode === "TOKEN_EXPIRED" ? 401 : result.errorCode === "TOKEN_SIGNATURE_INVALID" ? 401 : 400;
        return res.status(statusCode).json(makeSSOError(result.errorCode!, result.errorDetail!, requestId, startTime));
      }

      const payload = result.payload!;
      const user = await findOrCreateUserFromToken(payload);

      const { eq } = await import("drizzle-orm");
      const earnedCerts = user ? await db.select().from(userCertifications).where(eq(userCertifications.userId, user.id)) : [];
      const certSlugs: string[] = [];
      for (const uc of earnedCerts) {
        const [cert] = await db.select().from(certifications).where(eq(certifications.id, uc.certificationId));
        if (cert) certSlugs.push(cert.slug);
      }

      await logSSOAudit({ action: "verify", userId: user?.id || payload.sub, email: payload.email, success: true, tokenId: payload.jti, ipAddress: req.ip, userAgent: req.headers["user-agent"] });

      res.json({
        valid: true,
        request_id: requestId,
        elapsed_ms: Date.now() - startTime,
        token_claims: {
          iss: payload.iss,
          aud: payload.aud,
          alg: "HS256",
          exp: payload.exp,
          iat: payload.iat,
          nbf: payload.nbf,
          jti: payload.jti,
          sub: payload.sub,
        },
        user: {
          id: user?.id || payload.sub,
          email: payload.email,
          name: payload.name,
          username: payload.username || (user as any)?.username || "",
          role: payload.role,
          accountType: payload.accountType,
          avatar: payload.avatar || (user as any)?.avatar || null,
          xp: payload.xp ?? (user as any)?.xp ?? 0,
          level: payload.level ?? (user as any)?.level ?? 1,
          levelTitle: payload.levelTitle || "Novice",
          totalMinutes: payload.totalMinutes ?? (user as any)?.totalMinutes ?? 0,
          subscriptionTier: payload.subscriptionTier || "free",
          certifications: certSlugs,
        },
      });
    } catch (err: any) {
      await logSSOAudit({ action: "verify", success: false, errorCode: "INTERNAL_ERROR", errorMessage: err.message, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
      res.status(500).json(makeSSOError("INTERNAL_ERROR", "Internal error verifying SSO token", requestId, startTime));
    }
  });

  const SSO_TARGET_RULES: Record<string, { allowStudent: boolean; allowCreator: boolean }> = {
    comixx: { allowStudent: true, allowCreator: true },
    fxstudio: { allowStudent: true, allowCreator: true },
    streaming: { allowStudent: false, allowCreator: true },
    lms: { allowStudent: true, allowCreator: true },
  };

  app.get("/api/auth/sso/redirect", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const target = req.query.target as string;
      if (!target) return res.status(400).json({ message: "Target app required" });

      const rules = SSO_TARGET_RULES[target];
      if (rules) {
        const isStudent = user.accountType === "student";
        if (isStudent && !rules.allowStudent) return res.status(403).json({ message: "This platform is not available for student accounts" });
        if (!isStudent && !rules.allowCreator) return res.status(403).json({ message: "This platform is not available for your account type" });
      }

      const { tier, levelTitle } = await getUserSSOData(user);
      const token = issueEcosystemToken(user, tier, levelTitle);
      const redirectUrl = getRedirectUrl(target, token);
      if (!redirectUrl) return res.status(400).json({ message: "Invalid target app" });
      res.json({ redirectUrl });
    } catch (err) {
      res.status(500).json({ message: "Error generating SSO redirect" });
    }
  });

  app.get("/api/auth/sso/authorize", (req, res) => {
    const redirect_uri = req.query.redirect_uri as string;
    const app = req.query.app as string;
    if (!redirect_uri) return res.status(400).json({ message: "redirect_uri required" });

    const { isAllowedOrigin } = require("./sso");
    try {
      const url = new URL(redirect_uri);
      if (!isAllowedOrigin(url.origin)) {
        return res.status(400).json({ message: "redirect_uri not in allowed origins" });
      }
    } catch {
      return res.status(400).json({ message: "Invalid redirect_uri" });
    }

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect(`/auth?sso_redirect=${encodeURIComponent(redirect_uri)}&sso_app=${encodeURIComponent(app || "")}`);
    }

    (async () => {
      try {
        const user = req.user as any;

        if (app && SSO_TARGET_RULES[app]) {
          const isStudent = user.accountType === "student";
          const rules = SSO_TARGET_RULES[app];
          if (isStudent && !rules.allowStudent) {
            return res.status(403).send("This platform is not available for student accounts.");
          }
          if (!isStudent && !rules.allowCreator) {
            return res.status(403).send("This platform is not available for your account type.");
          }
        }

        const { tier, levelTitle } = await getUserSSOData(user);
        const token = issueEcosystemToken(user, tier, levelTitle);
        const separator = redirect_uri.includes("?") ? "&" : "?";
        res.redirect(`${redirect_uri}${separator}token=${encodeURIComponent(token)}&source=pscomixx`);
      } catch {
        res.status(500).json({ message: "Error during SSO authorize" });
      }
    })();
  });

  app.get("/api/auth/sso/platforms", (req, res) => {
    const { getEcosystemDomains } = require("./sso");
    const domains = getEcosystemDomains();
    res.json({
      platforms: [
        { key: "comixx", name: "PSCoMiXX", domain: domains.comixx, description: "Create comics, cards, visual novels & more", forStudents: true, forCreators: true },
        { key: "fxstudio", name: "FX Studio", domain: domains.fxstudio, description: "Write scripts, plan stories & visual effects", forStudents: true, forCreators: true },
        { key: "streaming", name: "PS Streaming", domain: domains.streaming, description: "Publish & stream your content to the world", forStudents: false, forCreators: true },
        { key: "lms", name: "Press Start LMS", domain: domains.lms, description: "Courses, assignments & certification tracking", forStudents: true, forCreators: false },
      ],
    });
  });

  app.post("/api/auth/sso/ecosystem-login", async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    try {
      const { token, source } = req.body;
      if (!token) {
        await logSSOAudit({ action: "ecosystem_login", success: false, sourceApp: source, errorCode: "TOKEN_MISSING", errorMessage: "No token provided", ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(400).json(makeSSOError("TOKEN_MISSING", "Token is required", requestId, startTime));
      }

      const result = verifyEcosystemTokenDetailed(token);
      if (!result.valid) {
        await logSSOAudit({ action: "ecosystem_login", success: false, sourceApp: source, errorCode: result.errorCode, errorMessage: result.errorDetail, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(401).json(makeSSOError(result.errorCode!, result.errorDetail!, requestId, startTime));
      }

      const payload = result.payload!;
      let user = await storage.getUserByEmail(payload.email);
      if (!user) {
        await logSSOAudit({ action: "ecosystem_login", email: payload.email, success: false, sourceApp: source, errorCode: "USER_NOT_FOUND", errorMessage: "No account found for this email", ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(404).json(makeSSOError("USER_NOT_FOUND", "No account found. Please sign up on PSCoMiXX first.", requestId, startTime));
      }

      req.login(user, (err: any) => {
        if (err) {
          logSSOAudit({ action: "ecosystem_login", userId: user!.id, email: user!.email, success: false, sourceApp: source, errorCode: "SESSION_ERROR", errorMessage: err.message, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
          return res.status(500).json(makeSSOError("SESSION_ERROR", "Failed to establish session", requestId, startTime));
        }
        logSSOAudit({ action: "ecosystem_login", userId: user!.id, email: user!.email, success: true, sourceApp: source, tokenId: payload.jti, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        console.log(`[sso] Ecosystem login for ${user!.email} from ${source || "unknown"}`);
        res.json({
          success: true,
          request_id: requestId,
          elapsed_ms: Date.now() - startTime,
          user: {
            id: user!.id,
            email: user!.email,
            name: user!.name,
            username: (user as any)?.username,
            role: user!.role,
            accountType: user!.accountType,
          },
        });
      });
    } catch (err: any) {
      await logSSOAudit({ action: "ecosystem_login", success: false, errorCode: "INTERNAL_ERROR", errorMessage: err.message, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
      res.status(500).json(makeSSOError("INTERNAL_ERROR", "Error during ecosystem SSO login", requestId, startTime));
    }
  });

  // =========== Health Check ===========

  app.get("/api/health", async (_req, res) => {
    try {
      const dbCheck = await db.execute(sql`SELECT 1`);
      res.json({
        status: "healthy",
        db: "connected",
        uptime: process.uptime(),
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
      });
    } catch (err) {
      res.status(503).json({
        status: "unhealthy",
        db: "disconnected",
        error: (err as Error).message,
      });
    }
  });

  // =========== CROSS-PLATFORM SYNC INFRASTRUCTURE ===========

  startSyncWorker().catch(() => {});

  app.post("/api/ecosystem/sync", async (req, res) => {
    const requestId = `sync_${Date.now().toString(36)}`;
    const startTime = Date.now();
    try {
      const authHeader = req.headers.authorization;
      const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
      const apiKey = req.headers["x-api-key"] as string | undefined;

      let authenticated = false;
      if (process.env.ECOSYSTEM_JWT_SECRET && authHeader === `Bearer ${process.env.ECOSYSTEM_JWT_SECRET}`) authenticated = true;
      // Accept either the new PSStreaming secret or the legacy Emergent name.
      const streamingSharedSecret =
        process.env.PSSTREAMING_WEBHOOK_SECRET || process.env.EMERGENT_WEBHOOK_SECRET;
      if (streamingSharedSecret && webhookSecret && webhookSecret === streamingSharedSecret) authenticated = true;
      if (process.env.FX_STUDIO_API_KEY && apiKey && apiKey === process.env.FX_STUDIO_API_KEY) authenticated = true;

      if (!authenticated) {
        return res.status(401).json({ error: "UNAUTHORIZED", detail: "Invalid or missing authentication", request_id: requestId, elapsed_ms: Date.now() - startTime });
      }

      const { syncId, eventType, sourceApp, userId, projectId, payload, timestamp } = req.body;
      if (!eventType) {
        return res.status(400).json({ error: "MISSING_FIELD", detail: "eventType is required", request_id: requestId, elapsed_ms: Date.now() - startTime });
      }

      let localUserId = userId;
      if (payload?.user_email && !localUserId) {
        const user = await storage.getUserByEmail(payload.user_email);
        if (user) localUserId = user.id;
      }

      const queueId = await enqueueSyncEvent({
        sourceApp: sourceApp || "external",
        targetApp: "comixx",
        eventType,
        userId: localUserId,
        projectId,
        payload: { ...payload, externalSyncId: syncId, receivedAt: new Date().toISOString() },
      });

      if (eventType === "xp_broadcast" || eventType === "xp.sync") {
        try {
          const { recordXpEvent } = await import('./xpEngine');
          if (localUserId && payload?.xp_awarded) {
            await recordXpEvent({
              userId: localUserId,
              action: payload.action || "external_sync",
              category: payload.category || "sync",
              xpAmount: payload.xp_awarded || payload.xpAmount || 0,
              source: sourceApp || "external",
              sourceApp: sourceApp || "external",
              toolUsed: payload.toolUsed || payload.tool_used || null,
              eventKey: `sync-${syncId || queueId}`,
              metadata: payload,
            });
          }
        } catch {}
      }

      res.json({
        success: true,
        request_id: requestId,
        sync_queue_id: queueId,
        elapsed_ms: Date.now() - startTime,
        status: "accepted",
      });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message, request_id: requestId, elapsed_ms: Date.now() - startTime });
    }
  });

  app.get("/api/sync/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const status = await getSyncStatus(userId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.get("/api/sync/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await getSyncHistory(userId, limit);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.get("/api/sync/logs/:syncId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const history = await getSyncHistory(undefined, 1000);
      const event = history.find((e: any) => e.id === req.params.syncId);
      if (!event) return res.status(404).json({ error: "NOT_FOUND", detail: "Sync event not found" });
      if (event.userId && event.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "ACCESS_DENIED", detail: "Not authorized to view this sync event" });
      }
      const logs = await getSyncLogs(req.params.syncId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.post("/api/sync/retry/:syncId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const history = await getSyncHistory(undefined, 1000);
      const event = history.find((e: any) => e.id === req.params.syncId);
      if (!event) return res.status(404).json({ error: "NOT_FOUND", detail: "Sync event not found" });
      if (event.userId && event.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "ACCESS_DENIED", detail: "Not authorized to retry this sync event" });
      }
      const success = await retrySyncEvent(req.params.syncId);
      if (!success) return res.status(404).json({ error: "NOT_FOUND", detail: "Sync event not found" });
      res.json({ success: true, message: "Retry initiated" });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.get("/api/admin/sync/dashboard", isAdmin, async (req, res) => {
    try {
      const [syncHealth, ssoHealth] = await Promise.all([
        getSyncHealthMetrics(),
        getSSOHealthMetrics(),
      ]);
      const recentFailed = await getSyncHistory(undefined, 20);
      const ssoRecent = await getSSOAuditHistory({ limit: 20 });
      res.json({ sync: syncHealth, sso: ssoHealth, recentSyncEvents: recentFailed, recentSSOEvents: ssoRecent });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.get("/api/admin/sync/health", isAdmin, async (req, res) => {
    try {
      const [syncHealth, ssoHealth] = await Promise.all([
        getSyncHealthMetrics(),
        getSSOHealthMetrics(),
      ]);
      const hasAlerts = syncHealth.alerts.highFailureRate || syncHealth.alerts.deadLetterBacklog || syncHealth.alerts.retryBacklog || ssoHealth.alerts.ssoFailureSpike;
      res.json({
        status: hasAlerts ? "degraded" : "healthy",
        sync: syncHealth,
        sso: ssoHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  app.get("/api/admin/sso/audit", isAdmin, async (req, res) => {
    try {
      const failuresOnly = req.query.failures === "true";
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await getSSOAuditHistory({ failuresOnly, limit });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
    }
  });

  // =========== Export Pipeline ===========

  app.post("/api/export", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { projectId, format, publishToStreaming, sendToLms, metadata } = req.body;
      if (!projectId || !format) return res.status(400).json({ message: "projectId and format required" });
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== user.id) return res.status(404).json({ message: "Project not found" });
      const job = await createExportJob(projectId, user.id, {
        format,
        publishToStreaming,
        sendToLms,
        metadata,
      });
      res.json(job);
    } catch (err) {
      res.status(500).json({ message: "Error creating export job" });
    }
  });

  app.get("/api/export/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await getExportJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Export job not found" });
      const user = req.user as any;
      if (job.userId !== user.id && user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
      res.json(job);
    } catch (err) {
      res.status(500).json({ message: "Error fetching export job" });
    }
  });

  app.get("/api/projects/:id/exports", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const user = req.user as any;
      if (project.userId !== user.id && user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
      const exports = await getProjectExports(req.params.id);
      res.json(exports);
    } catch (err) {
      res.status(500).json({ message: "Error fetching export history" });
    }
  });

  // =========== Webhook Admin ===========

  app.get("/api/admin/webhook-logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const logs = await getWebhookLogs(limit, offset);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Error fetching webhook logs" });
    }
  });

  app.post("/api/admin/retry-failed-jobs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const retried = await retryFailedWebhooks();
      res.json({ message: `Retried ${retried} failed webhooks` });
    } catch (err) {
      res.status(500).json({ message: "Error retrying failed webhooks" });
    }
  });

  // =========== Creator Profile (Username) ===========

  app.patch("/api/profile/username", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { username } = req.body;
      if (!username || typeof username !== "string") return res.status(400).json({ message: "Username required" });
      const clean = username.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
      if (clean.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
      const existing = await storage.getUserByUsername(clean);
      if (existing && existing.id !== user.id) return res.status(409).json({ message: "Username already taken" });
      const updated = await storage.updateUserProfile(user.id, { username: clean } as any);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Error updating username" });
    }
  });

  app.get("/api/creator/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "Creator not found" });
      const publishedProjects = await storage.getUserProjectsMeta(user.id);
      const published = publishedProjects.filter((p: any) => p.status === "published");
      const followerCount = await storage.getFollowerCount(user.id);
      const followingCount = await storage.getFollowingCount(user.id);
      res.json({
        id: user.id,
        name: user.name,
        username: (user as any).username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        tagline: user.tagline,
        creatorClass: user.creatorClass,
        xp: user.xp,
        level: user.level,
        socialLinks: user.socialLinks,
        followerCount,
        followingCount,
        publishedWorks: published.map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          thumbnail: p.thumbnail,
          createdAt: p.createdAt,
        })),
        joinedAt: user.createdAt,
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching creator profile" });
    }
  });

  // ==========================================
  // PUBLIC SKILL PASSPORT (recruiter / partner facing, no auth)
  // ==========================================
  const publicPassportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: false,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again shortly" },
  });
  app.get("/api/public/passport/:username", publicPassportLimiter, async (req, res) => {
    try {
      const { aggregateBySkill } = await import("@shared/skillTaxonomy");
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "Passport not found" });

      const userId = user.id;

      const [
        balances,
        toolAgg,
        categoryAgg,
        sourceAgg,
        recentEvents,
        allEventsForSkillMap,
        publishedProjects,
        certs,
        productionCredits,
        followerCount,
        followingCount,
      ] = await Promise.all([
        db.select().from(xpBalancesTable).where(eq(xpBalancesTable.userId, userId)),
        db.execute(sql`
          SELECT tool_used AS "toolUsed",
                 SUM(xp_amount)::int AS "totalXp",
                 COUNT(*)::int AS "eventCount",
                 MAX(created_at) AS "lastUsed"
          FROM xp_events
          WHERE user_id = ${userId} AND tool_used IS NOT NULL
          GROUP BY tool_used
          ORDER BY SUM(xp_amount) DESC
          LIMIT 20
        `),
        db.execute(sql`
          SELECT category,
                 SUM(xp_amount)::int AS "totalXp",
                 COUNT(*)::int AS "eventCount"
          FROM xp_events
          WHERE user_id = ${userId} AND category IS NOT NULL
          GROUP BY category
          ORDER BY SUM(xp_amount) DESC
        `),
        db.execute(sql`
          SELECT source_app AS "sourceApp",
                 SUM(xp_amount)::int AS "totalXp",
                 COUNT(*)::int AS "eventCount"
          FROM xp_events
          WHERE user_id = ${userId} AND source_app IS NOT NULL
          GROUP BY source_app
          ORDER BY SUM(xp_amount) DESC
        `),
        db.select().from(xpEventsTable)
          .where(eq(xpEventsTable.userId, userId))
          .orderBy(desc(xpEventsTable.createdAt))
          .limit(10),
        db.execute(sql`
          SELECT action, tool_used AS "toolUsed", source_app AS "sourceApp", category,
                 SUM(xp_amount)::int AS "xpAmount", COUNT(*)::int AS "eventCount"
          FROM xp_events
          WHERE user_id = ${userId}
          GROUP BY action, tool_used, source_app, category
        `),
        storage.getUserProjectsMeta(userId),
        (async () => {
          const earned = await db.select().from(userCertifications).where(eq(userCertifications.userId, userId));
          if (earned.length === 0) return [] as any[];
          const allCerts = await db.select().from(certifications);
          const certMap = new Map(allCerts.map(c => [c.id, c]));
          // Recruiter-safe DTO: do not expose verificationCode, portfolioSnapshot, internal ids.
          return earned.map(e => {
            const c: any = certMap.get(e.certificationId) || {};
            return {
              id: e.id,
              earnedAt: e.earnedAt,
              certification: { name: c.name, issuer: c.issuer, description: c.description },
            };
          });
        })(),
        db.select().from(productionRolesTable).where(eq(productionRolesTable.userId, userId)),
        storage.getFollowerCount(userId),
        storage.getFollowingCount(userId),
      ]);

      const published = (publishedProjects as any[]).filter(p => p.status === "published");
      const totalMinutes = (user as any).totalMinutes || 0;

      const ecosystemVerified =
        ((user as any).ecosystemRole && (user as any).ecosystemRole !== "learner") ||
        (certs as any[]).length > 0;

      res.json({
        identity: {
          id: user.id,
          name: user.name,
          username: (user as any).username,
          avatar: user.avatar,
          coverImage: (user as any).coverImage,
          tagline: (user as any).tagline,
          bio: user.bio,
          joinedAt: user.createdAt,
          socialLinks: (user as any).socialLinks,
        },
        progression: {
          xp: user.xp || 0,
          level: user.level || 1,
          creatorClass: user.creatorClass || "Novice",
          ecosystemRole: (user as any).ecosystemRole || "learner",
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
          ecosystemVerified,
        },
        stats: {
          creativity: (user as any).statCreativity || 10,
          storytelling: (user as any).statStorytelling || 10,
          artistry: (user as any).statArtistry || 10,
          collaboration: (user as any).statCollaboration || 10,
        },
        skillsByCategory: (categoryAgg as any).rows || [],
        skillsByTaxonomy: aggregateBySkill(((allEventsForSkillMap as any).rows || []) as any),
        toolsUsed: (toolAgg as any).rows || [],
        sources: (sourceAgg as any).rows || [],
        balancesBySource: balances.map((b: any) => ({
          source: b.source,
          toolUsed: b.toolUsed,
          totalXp: b.totalXp,
          eventCount: b.eventCount,
        })),
        recentActivity: (recentEvents as any[]).map((e) => ({
          id: e.id,
          action: e.action,
          category: e.category,
          xpAmount: e.xpAmount,
          source: e.source,
          sourceApp: e.sourceApp,
          toolUsed: e.toolUsed,
          createdAt: e.createdAt,
        })),
        publishedWorks: published.slice(0, 12).map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          thumbnail: p.thumbnail,
          createdAt: p.createdAt,
        })),
        publishedCount: published.length,
        certifications: certs,
        productionCredits: (productionCredits as any[]).map((c) => ({
          id: c.id,
          roleName: c.roleName,
          projectName: c.projectName,
          department: c.department,
          status: c.status,
        })),
        social: {
          followers: followerCount,
          following: followingCount,
          publishedCount: published.length,
        },
      });
    } catch (err: any) {
      console.error("Public passport error:", err);
      res.status(500).json({ message: "Error fetching passport" });
    }
  });

  // =========== School/District Payment ===========

  app.post("/api/stripe/school-checkout", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { priceId, seats } = req.body;
      if (!priceId) return res.status(400).json({ message: "Price ID required" });

      let subscription = await storage.getUserSubscription(user.id);
      let customerId = subscription?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id, user.name || undefined);
        customerId = customer.id;
        if (subscription) {
          await storage.updateSubscription(user.id, { stripeCustomerId: customer.id });
        } else {
          await storage.createSubscription({
            userId: user.id,
            tier: "free",
            status: "active",
            stripeCustomerId: customer.id,
          });
        }
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${req.protocol}://${req.get("host")}/teacher?session_id={CHECKOUT_SESSION_ID}`,
        `${req.protocol}://${req.get("host")}/pricing`
      );

      await logPaymentEvent("checkout.initiated", user.id, {
        sessionId: session.id,
        customerId,
        priceId,
        seats,
        flow: "school",
      }, req);

      res.json({ url: session.url });
    } catch (err: any) {
      await logPaymentEvent("checkout.failed", (req.user as any)?.id || null, {
        error: err.message,
        flow: "school",
      }, req);
      res.status(500).json({ message: "Error creating school checkout" });
    }
  });

  app.post("/api/stripe/district-inquiry", async (req, res) => {
    try {
      const { name, email, district, studentCount, notes } = req.body;
      if (!name || !email || !district) return res.status(400).json({ message: "Name, email, and district required" });
      await auditAdmin("district_inquiry", req as any, "district", district);
      res.json({ message: "District inquiry submitted. Our team will contact you within 2 business days." });
    } catch (err) {
      res.status(500).json({ message: "Error submitting district inquiry" });
    }
  });

  // =========== Teacher Dashboard Enhanced ===========

  app.get("/api/teacher/student-projects", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const schoolId = req.query.schoolId as string;
      if (!schoolId) return res.status(400).json({ message: "School ID required" });
      const studentsList = await storage.getTeacherStudents((req.user as any).id, schoolId);
      const allProjects: any[] = [];
      for (const student of studentsList) {
        const studentProjects = await storage.getUserProjectsMeta(student.id);
        studentProjects.forEach((p: any) => {
          allProjects.push({
            ...p,
            studentName: student.name,
            studentAvatar: student.avatar,
          });
        });
      }
      res.json(allProjects);
    } catch (err) {
      res.status(500).json({ message: "Error fetching student projects" });
    }
  });

  app.get("/api/teacher/analytics", isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const schoolId = req.query.schoolId as string;
      if (!schoolId) return res.status(400).json({ message: "School ID required" });
      const studentsList = await storage.getTeacherStudents((req.user as any).id, schoolId);
      let totalXp = 0;
      let totalMinutes = 0;
      let activeToday = 0;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const toolUsage: Record<string, number> = {};

      const studentIds = studentsList.map((s: any) => s.id);
      for (const student of studentsList) {
        totalXp += student.xp || 0;
        totalMinutes += student.totalMinutes || 0;
        if (student.lastActiveAt && new Date(student.lastActiveAt) >= today) {
          activeToday++;
        }
      }

      if (studentIds.length > 0) {
        try {
          const projectTypeRows = await db.execute(
            sql`SELECT type, COUNT(*) as count FROM projects WHERE user_id = ANY(${studentIds}::text[]) GROUP BY type`
          );
          projectTypeRows.rows.forEach((r: any) => {
            toolUsage[r.type] = Number(r.count);
          });
        } catch {}
      }

      const topStudents = [...studentsList]
        .sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 10)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          xp: s.xp || 0,
          level: s.level || 1,
        }));

      res.json({
        totalStudents: studentsList.length,
        totalXp,
        totalMinutes,
        activeToday,
        topStudents,
        toolUsage,
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching teacher analytics" });
    }
  });

  app.get("/api/student/active-assignments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const assignments = await storage.getStudentActiveAssignments(user.id);
      res.json(assignments);
    } catch (err) {
      res.status(500).json({ message: "Error fetching active assignments" });
    }
  });

  // =========== API v1: External Export Endpoints ===========

  app.get("/api/v1/projects", isApiAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).apiUser?.id;
      if (!userId) return res.status(401).json({ error: "User not found" });
      const userProjects = await storage.getUserProjectsMeta(userId);
      res.json({
        projects: userProjects.map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          thumbnail: p.thumbnail,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Error fetching projects" });
    }
  });

  app.get("/api/v1/projects/:id", isApiAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const userId = (req as any).apiUser?.id;
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      res.json({ project });
    } catch (err) {
      res.status(500).json({ error: "Error fetching project" });
    }
  });

  app.get("/api/v1/projects/:id/export", isApiAuthenticated, async (req, res) => {
    try {
      const format = (req.query.format as string) || "scene-json";
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const userId = (req as any).apiUser?.id;
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      const exportData = await getProjectExportData(req.params.id, format);
      if (!exportData) return res.status(404).json({ error: "Export data not found" });
      res.json(exportData);
    } catch (err) {
      res.status(500).json({ error: "Error generating export" });
    }
  });

  app.get("/api/v1/assets/:id", isApiAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      res.json({ asset });
    } catch (err) {
      res.status(500).json({ error: "Error fetching asset" });
    }
  });

  app.post("/api/v1/projects/:id/publish", isApiAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const userId = (req as any).apiUser?.id;
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const job = await createExportJob(project.id, userId, {
        format: "bundle",
        publishToStreaming: true,
        sendToLms: user.accountType === "student",
      });
      res.json({ exportJob: job });
    } catch (err) {
      res.status(500).json({ error: "Error publishing project" });
    }
  });

  // ==================== FILE STORAGE ENDPOINTS ====================

  app.post("/api/files/upload", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { data, filename, mimeType, projectId } = req.body;
      if (!data || !filename || !mimeType) {
        return res.status(400).json({ message: "data, filename, and mimeType are required" });
      }

      if (mimeType.startsWith("image/") || isImageData(data)) {
        const scanResult = await scanImage(data, user.id);
        if (!scanResult.allowed) {
          return res.status(403).json({ message: "Image blocked by content moderation", reason: scanResult.reason });
        }
      }

      const result = await saveBase64File(user.id, data, filename, mimeType, projectId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/files", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const files = await getUserFiles(user.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/files/usage", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const usage = await getUserStorageUsage(user.id);
      res.json({ usedBytes: usage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const file = await getFile(req.params.id, user.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const deleted = await deleteFile(req.params.id, user.id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== CONTENT MODERATION ENDPOINTS (Admin) ====================

  app.get("/api/admin/moderation/flagged", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const flagged = await getFlaggedImages();
      res.json(flagged);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/moderation/blocked", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const blocked = await getBlockedHashes();
      res.json(blocked);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/moderation/block", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { hash, reason } = req.body;
      if (!hash || !reason) {
        return res.status(400).json({ message: "hash and reason are required" });
      }
      const user = req.user as any;
      await addBlockedHash(hash, reason, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/moderation/block/:hash", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const removed = await removeBlockedHash(req.params.hash);
      if (!removed) {
        return res.status(404).json({ message: "Hash not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/moderation/review/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["allowed", "blocked"].includes(status)) {
        return res.status(400).json({ message: "status must be 'allowed' or 'blocked'" });
      }
      const user = req.user as any;
      await reviewImage(req.params.id, status, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/platform-assets", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { category, search, active } = req.query;
      const conditions: any[] = [];
      if (category && category !== "all") conditions.push(eq(platformAssets.category, category as string));
      if (active === "true") conditions.push(eq(platformAssets.isActive, true));
      if (active === "false") conditions.push(eq(platformAssets.isActive, false));
      if (search) {
        const s = `%${(search as string).toLowerCase()}%`;
        conditions.push(or(ilike(platformAssets.name, s), ilike(platformAssets.description, s)));
      }
      const results = await db.select().from(platformAssets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(platformAssets.createdAt));
      res.json(results);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/admin/platform-assets/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const [asset] = await db.select().from(platformAssets).where(eq(platformAssets.id, req.params.id));
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      res.json(asset);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/admin/platform-assets", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertPlatformAssetSchema.parse(req.body);
      const [asset] = await db.insert(platformAssets).values(data).returning();
      res.json(asset);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/admin/platform-assets/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { assets: items } = req.body;
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Assets array required" });
      const parsed = items.map((item: any) => insertPlatformAssetSchema.parse(item));
      const created = await db.insert(platformAssets).values(parsed).returning();
      res.json({ created: created.length, assets: created });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.put("/api/admin/platform-assets/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const [existing] = await db.select().from(platformAssets).where(eq(platformAssets.id, req.params.id));
      if (!existing) return res.status(404).json({ message: "Asset not found" });
      const updateSchema = insertPlatformAssetSchema.partial();
      const validated = updateSchema.parse(req.body);
      if (validated.isFree === true) validated.priceInCents = 0;
      const [updated] = await db.update(platformAssets).set({
        ...validated,
        updatedAt: new Date(),
      }).where(eq(platformAssets.id, req.params.id)).returning();
      res.json(updated);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.delete("/api/admin/platform-assets/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const [deleted] = await db.delete(platformAssets).where(eq(platformAssets.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ message: "Asset not found" });
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/admin/platform-assets/bulk/delete", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "IDs array required" });
      let deletedCount = 0;
      for (const id of ids) {
        const [d] = await db.delete(platformAssets).where(eq(platformAssets.id, id)).returning();
        if (d) deletedCount++;
      }
      res.json({ deleted: deletedCount });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  const storeRateLimiter = rateLimit({ windowMs: 60000, max: 60, standardHeaders: false, legacyHeaders: false });
  app.get("/api/platform-assets/store", storeRateLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const isStudent = user?.accountType === "student";
      const isAuthenticated = !!user;
      const conditions = [eq(platformAssets.isActive, true)];
      if (isStudent || !isAuthenticated) conditions.push(eq(platformAssets.schoolSafe, true));
      let results = await db.select().from(platformAssets).where(and(...conditions)).orderBy(desc(platformAssets.createdAt));
      const safe = results.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        type: a.type,
        thumbnailUrl: a.thumbnailUrl,
        tags: a.tags,
        priceInCents: a.priceInCents,
        isFree: a.isFree,
        downloadCount: a.downloadCount,
        sourceType: a.sourceType,
        rightsClass: a.rightsClass,
        usageMode: a.usageMode,
        downloadAllowed: a.downloadAllowed,
        publishAllowed: a.publishAllowed,
        unlockType: a.unlockType,
        xpRequired: a.xpRequired,
        allowedOutputs: a.allowedOutputs,
        schoolSafe: a.schoolSafe,
        createdAt: a.createdAt,
        ...(a.downloadAllowed && a.usageMode === "downloadable" ? { fileUrl: a.fileUrl } : a.isFree && a.usageMode !== "preview-only" && a.usageMode !== "admin-only" ? { fileUrl: a.fileUrl } : {}),
      }));
      res.json(safe);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/export/validate", isAuthenticated, async (req, res) => {
    try {
      const { assetIds, exportMode = "flattened-image" } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return res.json({ valid: true, issues: [], assets: [] });
      }
      const user = req.user as any;
      const isStudent = user?.accountType === "student";
      const userXp = user?.xp || 0;
      const issues: { assetId: string; assetName: string; reason: string; severity: "block" | "warn" }[] = [];
      const checkedAssets: any[] = [];

      for (const id of assetIds) {
        const [asset] = await db.select().from(platformAssets).where(eq(platformAssets.id, id));
        if (!asset) { issues.push({ assetId: id, assetName: "Unknown", reason: "Asset not found", severity: "block" }); continue; }
        checkedAssets.push({ id: asset.id, name: asset.name, rightsClass: asset.rightsClass, usageMode: asset.usageMode });

        if (!asset.isActive) {
          issues.push({ assetId: id, assetName: asset.name, reason: "Asset is no longer active", severity: "block" });
          continue;
        }
        if (isStudent && !asset.schoolSafe) {
          issues.push({ assetId: id, assetName: asset.name, reason: "Not approved for student accounts", severity: "block" });
        }
        if (asset.usageMode === "preview-only") {
          issues.push({ assetId: id, assetName: asset.name, reason: "Preview-only assets cannot appear in exports", severity: "block" });
        }
        if (asset.usageMode === "admin-only") {
          issues.push({ assetId: id, assetName: asset.name, reason: "Admin-only asset", severity: "block" });
        }
        if (exportMode === "downloadable" && !asset.downloadAllowed) {
          issues.push({ assetId: id, assetName: asset.name, reason: "Asset not allowed for download — will be flattened", severity: "warn" });
        }
        if ((exportMode === "publish-to-streaming" || exportMode === "interactive-html") && !asset.publishAllowed) {
          issues.push({ assetId: id, assetName: asset.name, reason: "Asset not allowed for publishing", severity: "block" });
        }
        if (asset.usageMode === "publish-only" && exportMode !== "publish-to-streaming") {
          issues.push({ assetId: id, assetName: asset.name, reason: "Asset can only be used in streaming publishes", severity: "block" });
        }
        if (asset.unlockType === "xp" && asset.xpRequired > 0 && userXp < asset.xpRequired) {
          issues.push({ assetId: id, assetName: asset.name, reason: `Requires ${asset.xpRequired} XP to use (you have ${userXp})`, severity: "block" });
        }
        if (asset.unlockType === "premium" && !asset.isFree) {
          const userTier = user?.subscriptionTier || "free";
          const paidTiers = ["creator", "pro", "studio", "lifetime"];
          if (!paidTiers.includes(userTier)) {
            issues.push({ assetId: id, assetName: asset.name, reason: "Premium asset — upgrade or purchase required", severity: "block" });
          }
        }
        if (asset.unlockType === "founders-pass") {
          const userTier = user?.subscriptionTier || "free";
          if (userTier !== "lifetime" && userTier !== "studio") {
            issues.push({ assetId: id, assetName: asset.name, reason: "Founders Pass required", severity: "block" });
          }
        }
        if (asset.unlockType === "hybrid" && !asset.isFree) {
          const userTier = user?.subscriptionTier || "free";
          const paidTiers = ["creator", "pro", "studio", "lifetime"];
          const hasTier = paidTiers.includes(userTier);
          const hasXp = asset.xpRequired > 0 && userXp >= asset.xpRequired;
          if (!hasTier && !hasXp) {
            issues.push({ assetId: id, assetName: asset.name, reason: `Requires paid tier or ${asset.xpRequired} XP`, severity: "block" });
          }
        }
        if (asset.allowedOutputs && asset.allowedOutputs.length > 0) {
          const outputType = req.body.outputType;
          if (outputType && !asset.allowedOutputs.includes(outputType)) {
            issues.push({ assetId: id, assetName: asset.name, reason: `Not compatible with ${outputType} output`, severity: "block" });
          }
        }
      }

      const blockers = issues.filter(i => i.severity === "block");
      res.json({
        valid: blockers.length === 0,
        issues,
        assets: checkedAssets,
        exportMode,
      });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/admin/seed-stripe-products", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const results = await stripeService.seedSubscriptionProducts();
      const sync = await getStripeSync();
      await sync.syncBackfill();
      res.json({ success: true, products: results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/seed-demo-content", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const results = await seedDemoContent(req.user!.id);
      res.json({ success: true, seeded: results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =========== Partner Integration API ===========

  app.get("/api/v1/integration/health", validateApiKey, (_req, res) => {
    res.json({ status: "operational", version: "1.0.0", timestamp: new Date().toISOString() });
  });

  app.get("/api/v1/integration/projects/:id", validateApiKey, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.status !== "published" && project.status !== "review") {
        return res.status(403).json({ error: "Project not available for external access. Only published/review projects are accessible via integration API." });
      }
      res.json({
        id: project.id,
        title: project.title,
        type: project.type,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        data: project.data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/v1/integration/projects/:id/export", validateApiKey, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.status !== "published" && project.status !== "review") {
        return res.status(403).json({ error: "Project not available for export. Only published/review projects are accessible." });
      }
      const format = (req.query.format as string) || "scene-json";
      const exportData = await getProjectExportData(req.params.id, format);
      res.json({
        project: { id: project.id, title: project.title, type: project.type },
        bundle: exportData,
        exportedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/v1/integration/assets/import", validateApiKey, async (req, res) => {
    try {
      const { filename, type, url, metadata, userId } = req.body;
      if (!filename || !type || !url) {
        return res.status(400).json({ error: "filename, type, and url are required" });
      }
      const asset = await storage.createAsset({
        userId: userId || "system",
        filename,
        type,
        url,
        metadata: metadata || {},
      });
      res.status(201).json(asset);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/v1/integration/webhook/test", validateApiKey, async (req, res) => {
    try {
      const { targetUrl, event, payload } = req.body;
      if (!targetUrl || !event) {
        return res.status(400).json({ error: "targetUrl and event are required" });
      }
      if (!isAllowedWebhookUrl(targetUrl)) {
        return res.status(400).json({ error: "targetUrl domain is not in the allowed webhook destinations list." });
      }
      await dispatchWebhook(event, targetUrl, { ...payload, test: true });
      res.json({ success: true, message: `Webhook dispatched for event: ${event}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/v1/integration/render-handoff", validateApiKey, async (req, res) => {
    try {
      const { projectId, renderEngine, outputFormat, callbackUrl } = req.body;
      if (!projectId || !renderEngine || !callbackUrl) {
        return res.status(400).json({ error: "projectId, renderEngine, and callbackUrl are required" });
      }
      if (!isAllowedWebhookUrl(callbackUrl)) {
        return res.status(400).json({ error: "callbackUrl domain is not in the allowed destinations list." });
      }
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const handoffId = randomUUID();
      await dispatchWebhook("render.handoff", callbackUrl, {
        handoffId,
        projectId,
        renderEngine,
        outputFormat: outputFormat || "png",
        projectData: project.data,
      });
      res.json({ handoffId, status: "queued", projectId, renderEngine });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start webhook retry worker
  startWebhookRetryWorker();

  // ==========================================
  // ECOSYSTEM: XP EVENT ENGINE
  // ==========================================

  app.post("/api/ecosystem/xp/event", isAuthenticated, async (req, res) => {
    try {
      const { recordXpAction } = await import('./xpEngine');
      const { action, source, sourceApp, toolUsed, projectId, eventKey, metadata } = req.body;
      if (!action) return res.status(400).json({ error: "action is required" });

      const actionConfig = Object.values(XP_ACTIONS_IMPORT).find((a: any) => a.action === action);
      if (!actionConfig) return res.status(400).json({ error: "Invalid action" });

      const result = await (await import('./xpEngine')).recordXpEvent({
        userId: req.user!.id,
        action: actionConfig.action,
        category: actionConfig.category,
        xpAmount: actionConfig.xp,
        source: source || 'comixx',
        sourceApp: sourceApp || 'comixx',
        toolUsed,
        projectId,
        eventKey,
        metadata,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/xp/breakdown", isAuthenticated, async (req, res) => {
    try {
      const { getUserXpBreakdown } = await import('./xpEngine');
      const breakdown = await getUserXpBreakdown(req.user!.id);
      res.json(breakdown);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/xp/events", isAuthenticated, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const events = await db.select()
        .from(xpEventsTable)
        .where(eq(xpEventsTable.userId, req.user!.id))
        .orderBy(desc(xpEventsTable.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: SKILL PASSPORT
  // ==========================================

  app.get("/api/ecosystem/passport/:userId?", isAuthenticated, async (req, res) => {
    try {
      const targetUserId = req.params.userId || req.user!.id;
      const entries = await db.select()
        .from(passportEntriesTable)
        .where(eq(passportEntriesTable.userId, targetUserId))
        .orderBy(desc(passportEntriesTable.createdAt));

      const competencyData = await db.select()
        .from(competenciesTable)
        .where(eq(competenciesTable.userId, targetUserId));

      const balances = await db.select()
        .from(xpBalancesTable)
        .where(eq(xpBalancesTable.userId, targetUserId));

      const [user] = await db.select({
        xp: users.xp,
        level: users.level,
        ecosystemRole: users.ecosystemRole,
        creatorClass: users.creatorClass,
      }).from(users).where(eq(users.id, targetUserId));

      const productionCredits = await db.select()
        .from(productionRolesTable)
        .where(eq(productionRolesTable.userId, targetUserId));

      res.json({
        user: user || {},
        entries,
        competencies: competencyData,
        balancesBySource: balances,
        productionCredits,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/passport/entry", isAuthenticated, async (req, res) => {
    try {
      const [entry] = await db.insert(passportEntriesTable).values({
        userId: req.user!.id,
        ...req.body,
      }).returning();
      res.json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: ROLE ELIGIBILITY
  // ==========================================

  app.get("/api/ecosystem/roles/eligibility", isAuthenticated, async (req, res) => {
    try {
      const { checkRoleEligibility } = await import('./xpEngine');
      const result = await checkRoleEligibility(req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/roles/rules", isAuthenticated, async (req, res) => {
    try {
      const rules = await db.select()
        .from(roleEligibilityRulesTable)
        .where(eq(roleEligibilityRulesTable.active, true))
        .orderBy(roleEligibilityRulesTable.sortOrder);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ecosystem/roles/rules/:id", isAdmin, async (req, res) => {
    try {
      const [updated] = await db.update(roleEligibilityRulesTable)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(roleEligibilityRulesTable.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: APPRENTICESHIP TRACKS
  // ==========================================

  app.get("/api/ecosystem/apprenticeships/tracks", isAuthenticated, async (req, res) => {
    try {
      const tracks = await db.select().from(apprenticeshipTracksTable);
      res.json(tracks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/apprenticeships/tracks", isAdmin, async (req, res) => {
    try {
      const [track] = await db.insert(apprenticeshipTracksTable).values(req.body).returning();
      res.json(track);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/apprenticeships/applications", isAuthenticated, async (req, res) => {
    try {
      const isAdminUser = req.user!.role === 'admin';
      const apps = isAdminUser
        ? await db.select().from(apprenticeshipAppsTable).orderBy(desc(apprenticeshipAppsTable.createdAt))
        : await db.select().from(apprenticeshipAppsTable).where(eq(apprenticeshipAppsTable.userId, req.user!.id)).orderBy(desc(apprenticeshipAppsTable.createdAt));
      res.json(apps);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/apprenticeships/apply", isAuthenticated, async (req, res) => {
    try {
      const { trackId, applicationNote, portfolioLinks } = req.body;
      if (!trackId) return res.status(400).json({ error: "trackId is required" });

      const [user] = await db.select({ xp: users.xp, level: users.level }).from(users).where(eq(users.id, req.user!.id));

      const [existing] = await db.select({ id: apprenticeshipAppsTable.id })
        .from(apprenticeshipAppsTable)
        .where(and(
          eq(apprenticeshipAppsTable.userId, req.user!.id),
          eq(apprenticeshipAppsTable.trackId, trackId),
          sql`${apprenticeshipAppsTable.status} NOT IN ('rejected', 'completed')`
        ))
        .limit(1);

      if (existing) return res.status(400).json({ error: "You already have an active application for this track" });

      const [app] = await db.insert(apprenticeshipAppsTable).values({
        userId: req.user!.id,
        trackId,
        applicationNote,
        portfolioLinks,
        xpAtApplication: user?.xp || 0,
        levelAtApplication: user?.level || 1,
      }).returning();
      res.json(app);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ecosystem/apprenticeships/applications/:id/review", isAdmin, async (req, res) => {
    try {
      const { status, reviewNotes } = req.body;
      const [updated] = await db.update(apprenticeshipAppsTable)
        .set({
          status,
          reviewNotes,
          reviewerId: req.user!.id,
          reviewedAt: new Date(),
          ...(status === 'accepted' ? { startDate: new Date() } : {}),
        })
        .where(eq(apprenticeshipAppsTable.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: EXTERNAL TOOL SUBMISSIONS
  // ==========================================

  app.get("/api/ecosystem/external-tools", isAuthenticated, async (req, res) => {
    try {
      const tools = await db.select().from(externalToolsTable).where(eq(externalToolsTable.active, true));
      res.json(tools);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/external-tools", isAdmin, async (req, res) => {
    try {
      const [tool] = await db.insert(externalToolsTable).values(req.body).returning();
      res.json(tool);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/external-submissions", isAuthenticated, async (req, res) => {
    try {
      const isAdminUser = req.user!.role === 'admin';
      const subs = isAdminUser
        ? await db.select().from(externalSubmissionsTable).orderBy(desc(externalSubmissionsTable.createdAt))
        : await db.select().from(externalSubmissionsTable).where(eq(externalSubmissionsTable.userId, req.user!.id)).orderBy(desc(externalSubmissionsTable.createdAt));
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/external-submissions", isAuthenticated, async (req, res) => {
    try {
      const [sub] = await db.insert(externalSubmissionsTable).values({
        userId: req.user!.id,
        ...req.body,
      }).returning();

      const { recordXpAction } = await import('./xpEngine');
      await recordXpAction(req.user!.id, 'EXTERNAL_TOOL_SUBMISSION', {
        toolUsed: req.body.toolName,
        projectId: sub.id,
        eventKey: `ext-sub-${sub.id}`,
      });

      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ecosystem/external-submissions/:id/review", isAdmin, async (req, res) => {
    try {
      const { status, reviewNotes, xpAwarded } = req.body;
      const [updated] = await db.update(externalSubmissionsTable)
        .set({
          status,
          reviewNotes,
          reviewerId: req.user!.id,
          reviewedAt: new Date(),
          xpAwarded: xpAwarded || 0,
        })
        .where(eq(externalSubmissionsTable.id, req.params.id))
        .returning();

      if (status === 'approved' && updated && xpAwarded > 0) {
        const { recordXpEvent } = await import('./xpEngine');
        await recordXpEvent({
          userId: updated.userId,
          action: 'external_tool_approved',
          category: 'validation',
          xpAmount: xpAwarded,
          source: updated.toolName || 'external',
          eventKey: `ext-approved-${updated.id}`,
        });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: MENTOR REVIEWS
  // ==========================================

  app.get("/api/ecosystem/mentor-reviews", isAuthenticated, async (req, res) => {
    try {
      const isMentor = ['mentor', 'mentor_eligible'].includes(req.user!.ecosystemRole || '') || req.user!.role === 'admin';
      const reviews = isMentor
        ? await db.select().from(mentorReviewsTable).where(eq(mentorReviewsTable.mentorId, req.user!.id)).orderBy(desc(mentorReviewsTable.createdAt))
        : await db.select().from(mentorReviewsTable).where(eq(mentorReviewsTable.userId, req.user!.id)).orderBy(desc(mentorReviewsTable.createdAt));
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/mentor-reviews", isAuthenticated, async (req, res) => {
    try {
      const [review] = await db.insert(mentorReviewsTable).values({
        mentorId: req.user!.id,
        ...req.body,
      }).returning();
      res.json(review);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ecosystem/mentor-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, rating, feedback, approved, xpAwarded } = req.body;
      const [updated] = await db.update(mentorReviewsTable)
        .set({ status, rating, feedback, approved, xpAwarded: xpAwarded || 0 })
        .where(and(
          eq(mentorReviewsTable.id, req.params.id),
          eq(mentorReviewsTable.mentorId, req.user!.id)
        ))
        .returning();

      if (approved && updated && xpAwarded > 0) {
        const { recordXpEvent } = await import('./xpEngine');
        await recordXpEvent({
          userId: updated.userId,
          action: 'mentor_validation',
          category: 'validation',
          xpAmount: xpAwarded,
          eventKey: `mentor-review-${updated.id}`,
        });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: BUG REPORTS (Universal)
  // ==========================================

  app.get("/api/ecosystem/bug-reports", isAuthenticated, async (req, res) => {
    try {
      const isAdminUser = req.user!.role === 'admin';
      const reports = isAdminUser
        ? await db.select().from(bugReportsTable).orderBy(desc(bugReportsTable.createdAt)).limit(100)
        : await db.select().from(bugReportsTable).where(eq(bugReportsTable.userId, req.user!.id)).orderBy(desc(bugReportsTable.createdAt));
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/bug-reports", isAuthenticated, async (req, res) => {
    try {
      const [report] = await db.insert(bugReportsTable).values({
        userId: req.user!.id,
        userRole: req.user!.role,
        ...req.body,
      }).returning();

      // Fire-and-forget: notify ops mailbox. Never block the API response on email.
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendBugReportNotification(
        {
          id: report.id,
          title: report.title,
          description: report.description,
          category: report.category || undefined,
          severity: report.severity || undefined,
          app: report.app || undefined,
          stepsToReproduce: report.stepsToReproduce,
          screenshotUrls: (report.screenshotUrls as string[] | null) || null,
          contextData: report.contextData,
          reporterEmail: req.user?.email || null,
          reporterName: req.user?.name || null,
        },
        baseUrl,
      ).catch((e) => console.error("[bug-report-email]", e?.message || e));

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ecosystem/bug-reports/:id", isAdmin, async (req, res) => {
    try {
      const { status, assignedTo, resolution } = req.body;
      const [updated] = await db.update(bugReportsTable)
        .set({
          status,
          assignedTo,
          resolution,
          ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
        })
        .where(eq(bugReportsTable.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: PATHWAYS
  // ==========================================

  app.get("/api/ecosystem/pathways", isAuthenticated, async (req, res) => {
    try {
      const allPathways = await db.select().from(pathwaysTable).where(eq(pathwaysTable.published, true)).orderBy(pathwaysTable.sortOrder);
      
      const progress = await db.select()
        .from(userPathwayProgressTable)
        .where(eq(userPathwayProgressTable.userId, req.user!.id));

      const progressMap = new Map(progress.map(p => [p.pathwayId, p]));
      const result = allPathways.map(p => ({
        ...p,
        userProgress: progressMap.get(p.id) || null,
      }));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/pathways/:id/enroll", isAuthenticated, async (req, res) => {
    try {
      const [existing] = await db.select()
        .from(userPathwayProgressTable)
        .where(and(
          eq(userPathwayProgressTable.userId, req.user!.id),
          eq(userPathwayProgressTable.pathwayId, req.params.id)
        )).limit(1);

      if (existing) return res.json(existing);

      const [enrollment] = await db.insert(userPathwayProgressTable).values({
        userId: req.user!.id,
        pathwayId: req.params.id,
        status: 'enrolled',
        completedLessons: [],
        xpEarned: 0,
        percentComplete: 0,
      }).returning();
      res.json(enrollment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: SKILL TAGS
  // ==========================================

  app.get("/api/ecosystem/skill-tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await db.select().from(skillTagsTable);
      res.json(tags);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: CREATOR CHANNELS + SCHOOL STATIONS
  // ==========================================

  app.get("/api/ecosystem/creator-channels", async (req, res) => {
    try {
      const channels = await db.select().from(creatorChannelsTable).orderBy(desc(creatorChannelsTable.followerCount)).limit(50);
      res.json(channels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/school-stations", async (req, res) => {
    try {
      const stations = await db.select().from(schoolStationsTable).where(eq(schoolStationsTable.active, true));
      res.json(stations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: PRODUCTION ROLES (MMM)
  // ==========================================

  app.get("/api/ecosystem/production-roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await db.select()
        .from(productionRolesTable)
        .where(eq(productionRolesTable.userId, req.user!.id));
      res.json(roles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ECOSYSTEM: CROSS-PLATFORM INGESTION (for LMS/Streaming)
  // Consolidated into XP Ingestion Engine routes below
  // ==========================================

  app.post("/api/ecosystem/ingest/passport-entry", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${process.env.ECOSYSTEM_JWT_SECRET}`) {
        return res.status(401).json({ error: "Invalid ecosystem token" });
      }
      const [entry] = await db.insert(passportEntriesTable).values(req.body).returning();
      res.json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // SCHOOL-SAFE POLICY ENGINE ROUTES
  // ============================================

  app.get("/api/school-safe/effective-policy", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { resolveEffectivePolicy } = await import("./schoolSafeEngine");
      const policy = await resolveEffectivePolicy(req.user!.id);
      res.json(policy);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/school-safe/policies/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "teacher") return res.status(403).json({ error: "Forbidden" });
    try {
      const { getPoliciesForSchool } = await import("./schoolSafeEngine");
      const policies = await getPoliciesForSchool(req.params.schoolId);
      res.json(policies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/school-safe/policies", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "teacher") return res.status(403).json({ error: "Forbidden" });
    try {
      const { createPolicy } = await import("./schoolSafeEngine");
      const policy = await createPolicy({ ...req.body, createdBy: user.id });
      res.json(policy);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/school-safe/policies/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "teacher") return res.status(403).json({ error: "Forbidden" });
    try {
      const { updatePolicy } = await import("./schoolSafeEngine");
      const policy = await updatePolicy(req.params.id, req.body);
      if (!policy) return res.status(404).json({ error: "Policy not found" });
      res.json(policy);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/school-safe/policies/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const { deletePolicy } = await import("./schoolSafeEngine");
      const deleted = await deletePolicy(req.params.id);
      res.json({ deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // WORKFORCE PIPELINE + SKILL PASSPORT ROUTES
  // ============================================

  app.get("/api/workforce/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { getWorkforceProfile, recomputeProfile } = await import("./workforceEngine");
      let profile = await getWorkforceProfile(req.user!.id);
      if (!profile) profile = await recomputeProfile(req.user!.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workforce/passport", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { getSkillPassport } = await import("./workforceEngine");
      const passport = await getSkillPassport(req.user!.id);
      res.json(passport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workforce/passport/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "teacher") return res.status(403).json({ error: "Forbidden" });
    try {
      const { getSkillPassport } = await import("./workforceEngine");
      const passport = await getSkillPassport(req.params.userId);
      res.json(passport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workforce/signal", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { recordWorkforceSignal } = await import("./workforceEngine");
      const signal = await recordWorkforceSignal({ ...req.body, userId: req.user!.id });
      res.json(signal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workforce/endorse", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "teacher") return res.status(403).json({ error: "Only teachers and admins can endorse" });
    try {
      const { addEndorsement } = await import("./workforceEngine");
      const endorsement = await addEndorsement({
        ...req.body,
        endorserId: user.id,
        endorserRole: user.role,
      });
      res.json(endorsement);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workforce/recompute", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { recomputeProfile } = await import("./workforceEngine");
      const profile = await recomputeProfile(req.user!.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // XP INGESTION ENGINE ROUTES
  // ============================================

  app.post("/api/ecosystem/ingest/xp", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] || req.headers["apikey"];
      const webhookSecret = req.headers["x-webhook-secret"];
      const authHeader = req.headers.authorization;

      const validKeys = [
        process.env.FX_STUDIO_API_KEY,
        process.env.PSLMS_API_KEY,
        process.env.PSSTREAMING_SECRET,
        process.env.ECOSYSTEM_JWT_SECRET,
      ].filter(Boolean);

      const providedKey = apiKey || webhookSecret || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
      if (!providedKey || !validKeys.includes(providedKey as string)) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const { ingestExternalXp } = await import("./xpIngestionEngine");
      const result = await ingestExternalXp(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/ingest/xp/review", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const { reviewHeldEvent } = await import("./xpIngestionEngine");
      const result = await reviewHeldEvent(req.body.logId, req.body.action, req.user!.id, req.body.note);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/ingest/log", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const { getIngestionLog } = await import("./xpIngestionEngine");
      const log = await getIngestionLog({
        sourceApp: req.query.sourceApp as string,
        status: req.query.status as string,
        userId: req.query.userId as string,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ecosystem/ingest/rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM xp_ingestion_rules ORDER BY source_app, event_type`));
      res.json((result as any).rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ecosystem/ingest/rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const { sourceApp, eventType, action, xpMultiplier, maxXpPerEvent, cooldownMinutes, requiresVerification, generateWorkforceSignal, workforceSignalType } = req.body;
      const result = await db.execute(sql.raw(`
        INSERT INTO xp_ingestion_rules (source_app, event_type, action, xp_multiplier, max_xp_per_event, cooldown_minutes, requires_verification, generate_workforce_signal, workforce_signal_type)
        VALUES ('${sourceApp}', '${eventType}', '${action || "auto_award"}', ${xpMultiplier || 1}, ${maxXpPerEvent || 100}, ${cooldownMinutes || 0}, ${requiresVerification || false}, ${generateWorkforceSignal || false}, ${workforceSignalType ? `'${workforceSignalType}'` : "NULL"})
        RETURNING *
      `));
      res.json((result as any).rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // APP HANDOFF / LAUNCH TICKET ROUTES
  // ============================================

  app.post("/api/handoff/prepare", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { targetApp, context } = req.body;
      if (!targetApp) return res.status(400).json({ error: "targetApp required" });

      const { resolveEffectivePolicy } = await import("./schoolSafeEngine");
      const policy = await resolveEffectivePolicy(req.user!.id);

      const crypto = await import("crypto");
      const ticketToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await db.execute(sql.raw(`
        INSERT INTO launch_tickets (user_id, source_app, target_app, ticket_token, context, school_safe_policy, expires_at)
        VALUES ('${req.user!.id}', 'comixx', '${targetApp}', '${ticketToken}', '${JSON.stringify(context || {}).replace(/'/g, "''")}'::jsonb, '${JSON.stringify(policy).replace(/'/g, "''")}'::jsonb, '${expiresAt.toISOString()}')
      `));

      const { getEcosystemDomains } = await import("./sso");
      const domains = getEcosystemDomains();
      const targetDomain = (domains as any)[targetApp];

      res.json({
        ticketToken,
        targetApp,
        targetUrl: targetDomain ? `${targetDomain}/handoff?ticket=${ticketToken}` : null,
        expiresAt: expiresAt.toISOString(),
        schoolSafeActive: policy.schoolSafeActive,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/handoff/consume", async (req, res) => {
    try {
      const { ticketToken } = req.body;
      if (!ticketToken) return res.status(400).json({ error: "ticketToken required" });

      const result = await db.execute(sql.raw(`
        UPDATE launch_tickets SET consumed = true
        WHERE ticket_token = '${ticketToken}' AND consumed = false AND expires_at > NOW()
        RETURNING *
      `));

      const ticket = (result as any).rows?.[0];
      if (!ticket) return res.status(404).json({ error: "Invalid or expired ticket" });

      const userResult = await db.execute(sql.raw(`SELECT id, email, name, role, account_type, xp, level FROM users WHERE id = '${ticket.user_id}'`));
      const user = (userResult as any).rows?.[0];

      res.json({
        user,
        context: ticket.context,
        schoolSafePolicy: ticket.school_safe_policy,
        sourceApp: ticket.source_app,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // CLASSROOM MANAGEMENT ROUTES
  // ============================================

  app.get("/api/classrooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const result = await db.execute(sql.raw(`
        SELECT c.*, cm.role AS member_role FROM classrooms c
        JOIN classroom_memberships cm ON cm.classroom_id = c.id
        WHERE cm.user_id = '${req.user!.id}'
        ORDER BY c.created_at DESC
      `));
      res.json((result as any).rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/classrooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "teacher" && req.user!.role !== "admin") return res.status(403).json({ error: "Teachers/admins only" });
    try {
      const { schoolId, name, gradeLevel, subject } = req.body;
      const crypto = await import("crypto");
      const joinCode = crypto.randomBytes(4).toString("hex").toUpperCase();

      const result = await db.execute(sql.raw(`
        INSERT INTO classrooms (school_id, teacher_id, name, grade_level, subject, join_code)
        VALUES ('${schoolId}', '${req.user!.id}', '${name.replace(/'/g, "''")}', ${gradeLevel ? `'${gradeLevel}'` : "NULL"}, ${subject ? `'${subject}'` : "NULL"}, '${joinCode}')
        RETURNING *
      `));

      const classroom = (result as any).rows[0];

      await db.execute(sql.raw(`
        INSERT INTO classroom_memberships (classroom_id, user_id, role)
        VALUES ('${classroom.id}', '${req.user!.id}', 'teacher')
      `));

      res.json(classroom);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/classrooms/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { joinCode } = req.body;
      const classResult = await db.execute(sql.raw(`SELECT * FROM classrooms WHERE join_code = '${joinCode}'`));
      const classroom = (classResult as any).rows?.[0];
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      await db.execute(sql.raw(`
        INSERT INTO classroom_memberships (classroom_id, user_id, role)
        VALUES ('${classroom.id}', '${req.user!.id}', 'student')
        ON CONFLICT DO NOTHING
      `));

      res.json(classroom);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/classrooms/:id/students", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "teacher" && req.user!.role !== "admin") return res.status(403).json({ error: "Teachers/admins only" });
    try {
      const result = await db.execute(sql.raw(`
        SELECT u.id, u.name, u.email, u.xp, u.level, u.creator_class, cm.role, cm.joined_at
        FROM classroom_memberships cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.classroom_id = '${req.params.id}'
        ORDER BY u.name ASC
      `));
      res.json((result as any).rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // DISTRICT MANAGEMENT ROUTES
  // ============================================

  app.get("/api/districts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM districts ORDER BY name ASC`));
      res.json((result as any).rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/districts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    if (req.user!.role !== "admin") return res.status(403).json({ error: "Admin only" });
    try {
      const { name, contactEmail, state, country } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const result = await db.execute(sql.raw(`
        INSERT INTO districts (name, slug, contact_email, state, country)
        VALUES ('${name.replace(/'/g, "''")}', '${slug}', ${contactEmail ? `'${contactEmail}'` : "NULL"}, ${state ? `'${state}'` : "NULL"}, ${country ? `'${country}'` : "NULL"})
        RETURNING *
      `));
      res.json((result as any).rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PROMO PAGE STUDIO
  // School-safe in-comic promo/ad pages.
  // ==========================================
  // Strict fail-closed: missing flag, unknown error, or explicitly disabled all
  // evaluate to FALSE. Only an explicit `enabled === true` row turns the
  // feature on. This is required for school-safety guarantees.
  async function isPromoPagesEnabled(): Promise<boolean> {
    try {
      const flag = await storage.getFeatureFlag("promo_pages_enabled");
      return flag?.enabled === true;
    } catch { return false; }
  }
  async function isPromoSponsorsEnabled(): Promise<boolean> {
    try {
      const flag = await storage.getFeatureFlag("promo_sponsors_enabled");
      return flag?.enabled === true;
    } catch { return false; }
  }

  // Centralized: can this user use this template right now?
  // Enforces (in order): flag, sponsors-flag for sponsor type, active row,
  // and the student safety contract (status=approved + isSchoolSafe + non-sponsor).
  // Returns null if allowed, or an HTTP {status, message} to send back.
  async function checkPromoTemplateAccess(req: any, t: any | null | undefined): Promise<{ status: number; message: string } | null> {
    if (!(await isPromoPagesEnabled())) return { status: 403, message: "Promo Pages are disabled" };
    if (!t || !t.isActive) return { status: 404, message: "Not found" };
    const isStudent = req.user?.accountType === "student";
    if (t.type === "sponsor") {
      // Sponsor templates require BOTH the master flag AND sponsors flag,
      // and may NEVER be used by students under any circumstance.
      if (!(await isPromoSponsorsEnabled())) return { status: 403, message: "Sponsor templates are disabled" };
      if (isStudent) return { status: 403, message: "Sponsor templates are not available to student accounts" };
    }
    if (isStudent) {
      if (!t.isSchoolSafe || t.status !== "approved") {
        return { status: 403, message: "This template is not approved for student use" };
      }
    }
    return null;
  }

  // List templates available to the current user (audience + role + school-safe filtered).
  app.get("/api/promo/templates", isAuthenticated, async (req, res) => {
    try {
      if (!(await isPromoPagesEnabled())) {
        return res.status(403).json({ message: "Promo Pages are disabled" });
      }
      const sponsorsEnabled = await isPromoSponsorsEnabled();
      const accountType = req.user!.accountType;
      const role = req.user!.role;
      let effectiveRole: "student" | "creator" | "teacher" | "admin" = "creator";
      if (role === "admin") effectiveRole = "admin";
      else if (role === "teacher") effectiveRole = "teacher";
      else if (accountType === "student") effectiveRole = "student";
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const templates = await storage.listPromoTemplatesForUser({ role: effectiveRole, sponsorsEnabled, type });
      res.json(templates);
    } catch (err: any) {
      console.error("[promo] list templates error:", err);
      res.status(500).json({ message: "Failed to load promo templates" });
    }
  });

  // Single template fetch (used by editor and renderer).
  app.get("/api/promo/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const t = await storage.getPromoTemplate(req.params.id);
      const denied = await checkPromoTemplateAccess(req, t);
      if (denied) return res.status(denied.status).json({ message: denied.message });
      res.json(t);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load template" });
    }
  });

  // Create a template. Creators submit as pending_review; admins can publish directly.
  app.post("/api/promo/templates", isAuthenticated, blockStudents, async (req, res) => {
    try {
      if (!(await isPromoPagesEnabled())) {
        return res.status(403).json({ message: "Promo Pages are disabled" });
      }
      const isAdminUser = req.user!.role === "admin";
      const body = req.body || {};
      const allowedTypes = ["platform", "sponsor", "student", "creator"];
      const type = allowedTypes.includes(body.type) ? body.type : "creator";
      // Non-admins cannot create platform or sponsor templates.
      if (!isAdminUser && (type === "platform" || type === "sponsor")) {
        return res.status(403).json({ message: "Only admins can create platform or sponsor templates" });
      }
      const created = await storage.createPromoTemplate({
        title: String(body.title || "Untitled Promo").slice(0, 200),
        type,
        status: isAdminUser ? (body.status || "approved") : "pending_review",
        audience: ["all", "creator", "student", "teacher", "school"].includes(body.audience) ? body.audience : "all",
        layoutStyle: String(body.layoutStyle || "classic-comic"),
        thumbnailUrl: body.thumbnailUrl || null,
        templateJson: body.templateJson || {},
        isSchoolSafe: isAdminUser ? !!body.isSchoolSafe : false,
        isActive: true,
        createdBy: req.user!.id,
      });
      res.status(201).json(created);
    } catch (err: any) {
      console.error("[promo] create template error:", err);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Update template — owner can edit own draft/rejected; admin can edit anything.
  app.patch("/api/promo/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const t = await storage.getPromoTemplate(req.params.id);
      if (!t) return res.status(404).json({ message: "Not found" });
      const isAdminUser = req.user!.role === "admin";
      const isOwner = t.createdBy === req.user!.id;
      if (!isAdminUser && !isOwner) return res.status(403).json({ message: "Forbidden" });
      if (!isAdminUser && t.status === "approved") {
        return res.status(403).json({ message: "Approved templates cannot be edited; submit a new version" });
      }
      const updates: any = {};
      if (req.body.title !== undefined) updates.title = String(req.body.title).slice(0, 200);
      if (req.body.layoutStyle !== undefined) updates.layoutStyle = String(req.body.layoutStyle);
      if (req.body.templateJson !== undefined) updates.templateJson = req.body.templateJson;
      if (req.body.thumbnailUrl !== undefined) updates.thumbnailUrl = req.body.thumbnailUrl;
      if (isAdminUser) {
        if (req.body.audience !== undefined) updates.audience = req.body.audience;
        if (req.body.status !== undefined) updates.status = req.body.status;
        if (req.body.isSchoolSafe !== undefined) updates.isSchoolSafe = !!req.body.isSchoolSafe;
        if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
        if (req.body.type !== undefined) updates.type = req.body.type;
      } else if (isOwner && t.status === "rejected") {
        // Owner re-submitting after rejection.
        updates.status = "pending_review";
      }
      const updated = await storage.updatePromoTemplate(req.params.id, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("[promo] update template error:", err);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Delete template — owner soft via isActive, admin hard delete.
  app.delete("/api/promo/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const t = await storage.getPromoTemplate(req.params.id);
      if (!t) return res.status(404).json({ message: "Not found" });
      const isAdminUser = req.user!.role === "admin";
      const isOwner = t.createdBy === req.user!.id;
      if (!isAdminUser && !isOwner) return res.status(403).json({ message: "Forbidden" });
      if (isAdminUser) {
        await storage.deletePromoTemplate(req.params.id);
      } else {
        await storage.updatePromoTemplate(req.params.id, { isActive: false });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Admin moderation: approve/reject with notes.
  app.post("/api/promo/templates/:id/review", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.body?.status === "rejected" ? "rejected" : "approved";
      const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 1000) : null;
      const t = await storage.getPromoTemplate(req.params.id);
      if (!t) return res.status(404).json({ message: "Not found" });
      await storage.createPromoReview({
        templateId: req.params.id,
        reviewerId: req.user!.id,
        status,
        notes,
      });
      const updated = await storage.updatePromoTemplate(req.params.id, {
        status,
        // Admin chooses to mark school-safe in the same action if approved.
        ...(status === "approved" && req.body?.isSchoolSafe !== undefined ? { isSchoolSafe: !!req.body.isSchoolSafe } : {}),
      });
      res.json(updated);
    } catch (err: any) {
      console.error("[promo] review error:", err);
      res.status(500).json({ message: "Failed to record review" });
    }
  });

  // Admin: list all (no audience filter) for moderation.
  app.get("/api/promo/admin/templates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const filter: any = {};
      if (typeof req.query.status === "string") filter.status = req.query.status;
      if (typeof req.query.type === "string") filter.type = req.query.type;
      const list = await storage.listAllPromoTemplates(filter);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load templates" });
    }
  });

  // Promo Instances (per-project usage records — analytics + sponsor reporting).
  app.get("/api/promo/projects/:projectId/instances", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const list = await storage.listPromoInstancesForProject(req.params.projectId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load instances" });
    }
  });

  app.post("/api/promo/projects/:projectId/instances", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const templateId = String(req.body?.templateId || "");
      if (!templateId) return res.status(400).json({ message: "templateId required" });
      const t = await storage.getPromoTemplate(templateId);
      // Centralized policy: flag, sponsors-flag, sponsor-vs-student, school-safe.
      const denied = await checkPromoTemplateAccess(req, t);
      if (denied) return res.status(denied.status).json({ message: denied.message });
      const created = await storage.createPromoInstance({
        projectId: req.params.projectId,
        templateId,
        pageIndex: typeof req.body?.pageIndex === "number" ? req.body.pageIndex : 0,
        customDataJson: req.body?.customDataJson || {},
        createdBy: req.user!.id,
      });
      res.status(201).json(created);
    } catch (err: any) {
      console.error("[promo] create instance error:", err);
      res.status(500).json({ message: "Failed to create instance" });
    }
  });

  // Helper: load instance + verify the caller owns the parent project (or is admin).
  async function loadInstanceForOwner(req: any) {
    const inst = await storage.getPromoInstance(req.params.id);
    if (!inst) return { error: { status: 404, message: "Not found" } as const };
    const project = await storage.getProject(inst.projectId);
    if (!project) return { error: { status: 404, message: "Parent project missing" } as const };
    if (project.userId !== req.user!.id && req.user!.role !== "admin") {
      return { error: { status: 403, message: "Forbidden" } as const };
    }
    return { inst, project };
  }

  app.patch("/api/promo/instances/:id", isAuthenticated, async (req, res) => {
    try {
      if (!(await isPromoPagesEnabled())) return res.status(403).json({ message: "Promo Pages are disabled" });
      const found = await loadInstanceForOwner(req);
      if (found.error) return res.status(found.error.status).json({ message: found.error.message });
      const updates: any = {};
      if (typeof req.body?.pageIndex === "number") updates.pageIndex = req.body.pageIndex;
      if (req.body?.customDataJson !== undefined) updates.customDataJson = req.body.customDataJson;
      const updated = await storage.updatePromoInstance(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update instance" });
    }
  });

  app.delete("/api/promo/instances/:id", isAuthenticated, async (req, res) => {
    try {
      const found = await loadInstanceForOwner(req);
      if (found.error) return res.status(found.error.status).json({ message: found.error.message });
      const ok = await storage.deletePromoInstance(req.params.id);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete instance" });
    }
  });

  // Seed a small starter pack of platform templates (idempotent — checks per
  // layoutStyle so newly added templates get inserted on next boot without
  // disturbing existing rows).
  try {
    const existing = await storage.listAllPromoTemplates({ type: "platform" });
    const existingStyles = new Set(existing.map(t => String(t.layoutStyle || "")));
    {
      const seeds: InsertPromoTemplate[] = [
        {
          title: "Create your next comic in CoMiXX",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "classic-comic",
          thumbnailUrl: null,
          templateJson: {
            headline: "CREATE YOUR NEXT COMIC IN COMIXX",
            subheadline: "Pick up where the story leaves off — make your own comic now.",
            bodyCopy: "Stylus-powered drawing, panels, FX, and instant publishing. Free to start.",
            ctaText: "Start your comic",
            ctaUrl: "https://pscomixx.com",
            backgroundColor: "#1a1a1a",
            accentColor: "#fbbf24",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        {
          title: "Publish to PSStreaming",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "magazine",
          thumbnailUrl: null,
          templateJson: {
            headline: "STREAM YOUR COMIC",
            subheadline: "Publish to PSStreaming and reach readers worldwide.",
            bodyCopy: "Approved comics ship to PSStreaming with one click.",
            ctaText: "Publish now",
            ctaUrl: "https://psstreaming.com",
            backgroundColor: "#0c1226",
            accentColor: "#06b6d4",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        {
          title: "Earn XP by finishing your project",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "trading-card",
          thumbnailUrl: null,
          templateJson: {
            headline: "FINISH STRONG. EARN XP.",
            subheadline: "Complete your comic to unlock badges and level up.",
            bodyCopy: "Every save, export, and publish counts toward your XP.",
            ctaText: "See your progress",
            ctaUrl: "https://pscomixx.com/dashboard",
            backgroundColor: "#1a0c26",
            accentColor: "#a855f7",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        {
          title: "Join the Press Play Showcase",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "event-flyer",
          thumbnailUrl: null,
          templateJson: {
            headline: "JOIN THE PRESS PLAY SHOWCASE",
            subheadline: "Get your work in front of editors, teachers, and fans.",
            bodyCopy: "Submit a finished comic to qualify for the next showcase.",
            ctaText: "Submit your work",
            ctaUrl: "https://pscomixx.com/showcase",
            backgroundColor: "#26120c",
            accentColor: "#f97316",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        // ---- Vintage comic-ad styles (modeled on classic mid-century back-of-book ads) ----
        {
          title: "Vintage Mail-Order — How To...",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "vintage-mail-order",
          thumbnailUrl: null,
          templateJson: {
            headline: "HOW TO DRAW COMICS",
            subheadline: "It's easy to start your own comic… when you know how!",
            bodyCopy:
              "Want the thrill of bringing your own characters to life? PSCoMiXX gives you everything you need: stylus-powered drawing, smart panels, FX, and instant publishing. Perfect for schools, creators, and stay-up-late dreamers.\n\nStart for FREE today — no credit card required.",
            ctaText: "Mail Coupon Today",
            qrUrl: "pscomixx.com/start",
            imageUrl: "",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        {
          title: "Vintage Novelty — Amazing Offer",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "vintage-novelty",
          thumbnailUrl: null,
          templateJson: {
            headline: "AMAZING X-RAY STORYTELLING!",
            subheadline: "See your story come alive INSTANTLY!",
            bodyCopy:
              "WHAT WE PROMISED: A creator studio that turns your wild ideas into a finished comic in minutes.\n\nWHAT YOU GET: Stylus-powered drawing tools, AI-assisted panels, instant export to PDF/PNG/JSON, and one-click publishing to PSStreaming.\n\nBEHIND THE MAGIC: Built on years of comic-making craft, PSCoMiXX combines the joy of paper-and-pen with the power of modern devices.\n\nGUARANTEED to make a creator out of you — or your money back. (Just kidding, the free tier is actually free.)",
            ctaText: "Send No Money!",
            qrUrl: "pscomixx.com",
            imageUrl: "",
            logoUrl: "",
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
        {
          title: "Vintage Triple Feature — On Sale Now!",
          type: "platform",
          status: "approved",
          audience: "all",
          layoutStyle: "vintage-triple-feature",
          thumbnailUrl: null,
          templateJson: {
            headline: "",
            strips: [
              { title: "INKBLADE STYLUS",   subtitle: "The all-new pressure-sensitive pen!", badge: "NEW!",          imageUrl: "" },
              { title: "PSSTREAMING",       subtitle: "Watch and publish comics worldwide.", badge: "ON AIR",        imageUrl: "" },
              { title: "FX STUDIO",         subtitle: "Effects that bring your panels alive.", badge: "FREE TRIAL",  imageUrl: "" },
            ],
          },
          isSchoolSafe: true,
          isActive: true,
          createdBy: null as any,
        },
      ];
      const toInsert = seeds.filter(s => !existingStyles.has(String(s.layoutStyle || "")));
      for (const s of toInsert) {
        await storage.createPromoTemplate(s);
      }
      if (toInsert.length > 0) {
        console.log(`[promo] Seeded ${toInsert.length} new platform promo template(s): ${toInsert.map(t => t.layoutStyle).join(", ")}`);
      }
    }
  } catch (err: any) {
    console.error("[promo] Seed error:", err.message);
  }

  try {
    const { seedDefaultRules } = await import("./xpIngestionEngine");
    await seedDefaultRules();
    console.log("[xp-ingestion] Default rules seeded");
  } catch (err: any) {
    console.error("[xp-ingestion] Seed error:", err.message);
  }

  return server;
}
