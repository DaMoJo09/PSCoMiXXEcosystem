import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, randomBytes, createHash, createHmac } from "crypto";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertProjectSchema, insertAssetSchema, insertAssetImportSchema, tierEntitlements, TierName, insertContentReportSchema, insertAssetPackSchema, insertEngagementEventSchema, insertMarketplaceListingSchema, insertMarketplaceOrderSchema, users, projects, subscriptions, revenueEvents, marketplaceListings, engagementEvents, usageTracking } from "@shared/schema";
import { db } from "./db";
import { buildPSContentBundle, validateBundle, runPublishPipeline, syncToEmergent, syncCreatorProfile, checkEmergentHealth } from "./publishPipeline";
import { z } from "zod";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { filterContent, isStudentSafe } from "./contentFilter";
import { logAuditEvent, auditAuth, auditAdmin, auditStudent } from "./auditLogger";

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

  // Auth middleware
  function isAuthenticated(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated()) {
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

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(storedKey.id);

    // Get the user associated with this key
    const user = await storage.getUser(storedKey.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Attach user and permissions to request
    (req as any).apiUser = user;
    (req as any).apiKey = storedKey;
    (req as any).apiPermissions = storedKey.permissions || ['read'];

    next();
  }

  // Check permission helper
  function hasPermission(req: Request, permission: string): boolean {
    const permissions = (req as any).apiPermissions || [];
    return permissions.includes(permission) || permissions.includes('*');
  }

  // Auth routes
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
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

  app.post("/api/auth/login", (req, res, next) => {
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
        userAgreementAccepted: user.userAgreementAccepted 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // XP Heartbeat - tracks time spent in app and awards XP
  // Each heartbeat = 1 minute of activity = 10 XP
  const XP_PER_MINUTE = 10;

  function xpThresholdForLevel(level: number): number {
    return (level * (level - 1)) / 2 * 1000;
  }

  function getLevelFromXp(xp: number): number {
    let level = 1;
    while (xpThresholdForLevel(level + 1) <= xp) {
      level++;
    }
    return level;
  }

  function xpNeededForNextLevel(level: number): number {
    return level * 1000;
  }

  const ACTION_XP: Record<string, number> = {
    save: 25,
    export: 50,
    generate: 15,
    publish: 100,
  };
  const actionCooldowns = new Map<string, number>();

  const PSSTREAMING_WEBHOOK_URL = "https://psstreaming.com/api/webhooks/time-spent";
  const PSSTREAMING_API_KEY = process.env.PSLMS_API_KEY || "";

  async function forwardXpToStreaming(userEmail: string, minutes: number, xp: number) {
    if (!PSSTREAMING_API_KEY) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(PSSTREAMING_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PSSTREAMING_API_KEY,
        },
        body: JSON.stringify({
          event: "time.spent",
          user_email: userEmail,
          minutes,
          xp,
          source: "comixx",
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`[PSStreaming sync] HTTP ${res.status} forwarding XP for ${userEmail}`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("[PSStreaming sync] Request timed out");
      } else {
        console.error("[PSStreaming sync] Failed to forward XP:", err.message);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  app.post("/api/xp/heartbeat", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const now = new Date();
      const lastBeat = user.lastXpHeartbeat ? new Date(user.lastXpHeartbeat) : null;
      const minSinceLastBeat = lastBeat ? (now.getTime() - lastBeat.getTime()) / 60000 : 2;

      if (minSinceLastBeat < 0.5) {
        return res.json({ xp: user.xp, level: user.level, totalMinutes: user.totalMinutes });
      }

      const minutesToCredit = Math.min(Math.floor(minSinceLastBeat), 5);
      const xpGained = minutesToCredit * XP_PER_MINUTE;
      const newXp = (user.xp || 0) + xpGained;
      const newTotalMinutes = (user.totalMinutes || 0) + minutesToCredit;
      const newLevel = getLevelFromXp(newXp);

      await storage.updateUserProfile(userId, {
        xp: newXp,
        level: newLevel,
        totalMinutes: newTotalMinutes,
        lastXpHeartbeat: now,
      } as any);

      forwardXpToStreaming(user.email, minutesToCredit, xpGained);

      res.json({ xp: newXp, level: newLevel, totalMinutes: newTotalMinutes, xpGained });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/xp/action", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { action } = req.body;
      if (!action || !ACTION_XP[action]) {
        return res.status(400).json({ message: "Invalid action type" });
      }

      const cooldownKey = `${userId}:${action}`;
      const lastAction = actionCooldowns.get(cooldownKey) || 0;
      const now = Date.now();
      if (now - lastAction < 10000) {
        return res.json({ xpGained: 0, message: "Action cooldown active" });
      }
      actionCooldowns.set(cooldownKey, now);

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const xpGained = ACTION_XP[action];
      const newXp = (user.xp || 0) + xpGained;
      const newLevel = getLevelFromXp(newXp);

      await storage.updateUserProfile(userId, {
        xp: newXp,
        level: newLevel,
      } as any);

      forwardXpToStreaming(user.email, 0, xpGained);

      res.json({ xp: newXp, level: newLevel, xpGained, action });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/xp/status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const xp = user.xp || 0;
      const level = getLevelFromXp(xp);
      const currentLevelThreshold = xpThresholdForLevel(level);
      const needed = xpNeededForNextLevel(level);
      const xpInCurrentLevel = xp - currentLevelThreshold;
      res.json({
        xp,
        level,
        totalMinutes: user.totalMinutes || 0,
        accountType: user.accountType,
        xpForNextLevel: needed,
        xpInCurrentLevel,
      });
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
          ? "https://pressstart.space" 
          : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
        
        try {
          await sendPasswordResetEmail(email, token, baseUrl);
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
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
      const allProjects = await storage.getUserProjects(req.user!.id);
      if (req.query.fields === "meta") {
        const lightweight = allProjects.map(({ data, ...rest }) => rest);
        return res.json(lightweight);
      }
      res.json(allProjects);
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
          const userProjects = await storage.getUserProjects(req.user!.id);
          if (userProjects.length >= maxProjects) {
            return res.status(403).json({ 
              message: `Project limit reached. Your ${tier} plan allows ${maxProjects} projects. Upgrade for more.`,
              code: "PROJECT_LIMIT_REACHED"
            });
          }
        }
      }

      if (req.body.type && req.body.forceNew !== true) {
        const userProjects = await storage.getUserProjects(req.user!.id);
        const existing = userProjects
          .filter((p: any) => p.type === req.body.type)
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
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateProject(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
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
      res.json({ saved: true, id: updated?.id });
    } catch (error: any) {
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

  // Asset routes
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const assets = await storage.getProjectAssets(projectId);
        return res.json(assets);
      }
      
      const assets = await storage.getUserAssets(req.user!.id);
      res.json(assets);
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
      const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

      const allUsers = await db.select().from(users);
      const allProjects = await db.select().from(projects);

      const totalUsers = allUsers.length;
      const studentUsers = allUsers.filter(u => u.accountType === "student").length;
      const creatorUsers = allUsers.filter(u => u.accountType === "creator").length;
      const adminUsers = allUsers.filter(u => u.role === "admin").length;

      const usersLast7d = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
      const usersLast30d = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
      const usersPrev30d = allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      }).length;
      const userGrowthRate = usersPrev30d > 0 ? ((usersLast30d - usersPrev30d) / usersPrev30d * 100).toFixed(1) : "N/A";

      const activeToday = allUsers.filter(u => u.lastXpHeartbeat && new Date(u.lastXpHeartbeat).toISOString().slice(0, 10) === today).length;
      const activeLast7d = allUsers.filter(u => u.lastXpHeartbeat && new Date(u.lastXpHeartbeat) >= sevenDaysAgo).length;
      const activeLast30d = allUsers.filter(u => u.lastXpHeartbeat && new Date(u.lastXpHeartbeat) >= thirtyDaysAgo).length;
      const dauMauRatio = activeLast30d > 0 ? (activeToday / activeLast30d * 100).toFixed(1) : "0";

      const avgTimeSpent = totalUsers > 0 ? Math.round(allUsers.reduce((sum, u) => sum + (u.totalMinutes || 0), 0) / totalUsers) : 0;
      const totalPlatformMinutes = allUsers.reduce((sum, u) => sum + (u.totalMinutes || 0), 0);
      const avgXpPerUser = totalUsers > 0 ? Math.round(allUsers.reduce((sum, u) => sum + (u.xp || 0), 0) / totalUsers) : 0;

      const usersSignedUp30d = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo);
      const retainedUsers = usersSignedUp30d.filter(u => u.lastXpHeartbeat && new Date(u.lastXpHeartbeat) > new Date(u.createdAt));
      const day30Retention = usersSignedUp30d.length > 0 ? (retainedUsers.length / usersSignedUp30d.length * 100).toFixed(1) : "0";

      const usersWithProjects = new Set(allProjects.map(p => p.userId)).size;
      const activationRate = totalUsers > 0 ? (usersWithProjects / totalUsers * 100).toFixed(1) : "0";

      const totalProjects = allProjects.length;
      const projectsByType: Record<string, number> = {};
      const projectsByStatus: Record<string, number> = {};
      allProjects.forEach(p => {
        projectsByType[p.type] = (projectsByType[p.type] || 0) + 1;
        projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
      });
      const projectsLast7d = allProjects.filter(p => new Date(p.createdAt) >= sevenDaysAgo).length;
      const projectsLast30d = allProjects.filter(p => new Date(p.createdAt) >= thirtyDaysAgo).length;
      const avgProjectsPerUser = totalUsers > 0 ? (totalProjects / totalUsers).toFixed(1) : "0";
      const publishedProjects = allProjects.filter(p => p.status === "published").length;
      const publishRate = totalProjects > 0 ? (publishedProjects / totalProjects * 100).toFixed(1) : "0";

      const projectsWithViews = allProjects.filter(p => (p.viewCount || 0) > 0);
      const totalContentViews = allProjects.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      const avgViewsPerProject = publishedProjects > 0 ? Math.round(totalContentViews / publishedProjects) : 0;

      let subscriptionData: any[] = [];
      let revenueData: any[] = [];
      let marketplaceData: any[] = [];
      let engagementData: any[] = [];
      let usageData: any[] = [];

      try { subscriptionData = await db.select().from(subscriptions); } catch {}
      try { revenueData = await db.select().from(revenueEvents); } catch {}
      try { marketplaceData = await db.select().from(marketplaceListings); } catch {}
      try { engagementData = await db.select().from(engagementEvents); } catch {}
      try { usageData = await db.select().from(usageTracking); } catch {}

      const paidSubscriptions = subscriptionData.filter((s: any) => s.status === "active" && s.tier !== "free");
      const subscriptionsByTier: Record<string, number> = {};
      subscriptionData.forEach((s: any) => {
        const tier = s.tier || "free";
        subscriptionsByTier[tier] = (subscriptionsByTier[tier] || 0) + 1;
      });
      const conversionRate = totalUsers > 0 ? (paidSubscriptions.length / totalUsers * 100).toFixed(1) : "0";

      const totalRevenue = revenueData.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const revenueByType: Record<string, number> = {};
      revenueData.forEach((r: any) => {
        revenueByType[r.type] = (revenueByType[r.type] || 0) + (r.amount || 0);
      });
      const revenueLast30d = revenueData.filter((r: any) => new Date(r.createdAt) >= thirtyDaysAgo).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const arpu = paidSubscriptions.length > 0 ? (totalRevenue / paidSubscriptions.length / 100).toFixed(2) : "0";

      const totalListings = marketplaceData.length;
      const activeListings = marketplaceData.filter((l: any) => l.status === "active").length;
      const totalSales = marketplaceData.reduce((sum: number, l: any) => sum + (l.salesCount || 0), 0);
      const totalMarketplaceRevenue = marketplaceData.reduce((sum: number, l: any) => sum + (l.totalEarnings || 0), 0);
      const avgPricePoint = activeListings > 0 ? Math.round(marketplaceData.filter((l: any) => l.priceInCents > 0).reduce((sum: number, l: any) => sum + l.priceInCents, 0) / Math.max(1, marketplaceData.filter((l: any) => l.priceInCents > 0).length)) : 0;

      const engagementByType: Record<string, number> = {};
      engagementData.forEach((e: any) => {
        engagementByType[e.eventType] = (engagementByType[e.eventType] || 0) + 1;
      });
      const engagementLast30d = engagementData.filter((e: any) => new Date(e.createdAt) >= thirtyDaysAgo).length;
      const engagementLast7d = engagementData.filter((e: any) => new Date(e.createdAt) >= sevenDaysAgo).length;

      const aiUsageToday = usageData.filter((u: any) => u.actionType === "ai_generation" && u.periodKey === today).reduce((sum: number, u: any) => sum + (u.count || 0), 0);
      const aiUsageMonth = usageData.filter((u: any) => u.actionType === "ai_generation" && u.periodKey === thisMonth).reduce((sum: number, u: any) => sum + (u.count || 0), 0);
      const exportUsageMonth = usageData.filter((u: any) => u.actionType === "export" && u.periodKey === thisMonth).reduce((sum: number, u: any) => sum + (u.count || 0), 0);
      const uniqueAIUsers = new Set(usageData.filter((u: any) => u.actionType === "ai_generation").map((u: any) => u.userId)).size;
      const aiAdoptionRate = totalUsers > 0 ? (uniqueAIUsers / totalUsers * 100).toFixed(1) : "0";

      const levelDistribution: Record<string, number> = {};
      allUsers.forEach(u => {
        const bucket = u.level! <= 5 ? "1-5" : u.level! <= 10 ? "6-10" : u.level! <= 20 ? "11-20" : u.level! <= 50 ? "21-50" : "50+";
        levelDistribution[bucket] = (levelDistribution[bucket] || 0) + 1;
      });

      const creatorClassDistribution: Record<string, number> = {};
      allUsers.forEach(u => {
        const cls = u.creatorClass || "Rookie";
        creatorClassDistribution[cls] = (creatorClassDistribution[cls] || 0) + 1;
      });

      const userSignupTimeline: Record<string, number> = {};
      allUsers.forEach(u => {
        const month = new Date(u.createdAt).toISOString().slice(0, 7);
        userSignupTimeline[month] = (userSignupTimeline[month] || 0) + 1;
      });

      const projectCreationTimeline: Record<string, number> = {};
      allProjects.forEach(p => {
        const month = new Date(p.createdAt).toISOString().slice(0, 7);
        projectCreationTimeline[month] = (projectCreationTimeline[month] || 0) + 1;
      });

      const multiToolCreators = Object.entries(
        allProjects.reduce((acc: Record<string, Set<string>>, p) => {
          if (!acc[p.userId]) acc[p.userId] = new Set();
          acc[p.userId].add(p.type);
          return acc;
        }, {})
      ).filter(([_, types]) => (types as Set<string>).size >= 2).length;
      const crossToolAdoption = totalUsers > 0 ? (multiToolCreators / totalUsers * 100).toFixed(1) : "0";

      const powerCreators = allUsers.filter(u => (u.totalMinutes || 0) > 300 && (u.xp || 0) > 1000).length;
      const atRiskUsers = allUsers.filter(u => {
        if (!u.lastXpHeartbeat) return true;
        return new Date(u.lastXpHeartbeat) < thirtyDaysAgo && (u.totalMinutes || 0) > 30;
      }).length;

      const topCreators = [...allUsers]
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 10)
        .map(u => ({ name: u.name, xp: u.xp, level: u.level, minutes: u.totalMinutes, projects: allProjects.filter(p => p.userId === u.id).length }));

      const contentVelocity = activeLast30d > 0 ? (projectsLast30d / activeLast30d).toFixed(2) : "0";

      const consentCompletionRate = totalUsers > 0 ? (allUsers.filter(u => u.ipDisclosureAccepted || u.userAgreementAccepted).length / totalUsers * 100).toFixed(1) : "0";
      const parentalConsentRate = studentUsers > 0 ? (allUsers.filter(u => u.accountType === "student" && u.parentalConsentAt).length / studentUsers * 100).toFixed(1) : "0";

      res.json({
        generatedAt: now.toISOString(),
        growth: {
          totalUsers,
          studentUsers,
          creatorUsers,
          adminUsers,
          usersLast7d,
          usersLast30d,
          userGrowthRate,
          userSignupTimeline,
        },
        engagement: {
          dau: activeToday,
          wau: activeLast7d,
          mau: activeLast30d,
          dauMauRatio,
          avgTimeSpentMinutes: avgTimeSpent,
          totalPlatformMinutes,
          avgXpPerUser,
          day30Retention,
          activationRate,
          engagementByType,
          engagementLast7d,
          engagementLast30d,
        },
        content: {
          totalProjects,
          projectsByType,
          projectsByStatus,
          projectsLast7d,
          projectsLast30d,
          avgProjectsPerUser,
          publishRate,
          totalContentViews,
          avgViewsPerProject,
          contentVelocity,
          projectCreationTimeline,
        },
        revenue: {
          totalRevenueCents: totalRevenue,
          revenueLast30dCents: revenueLast30d,
          revenueByType,
          arpu,
          subscriptionsByTier,
          paidSubscriptions: paidSubscriptions.length,
          conversionRate,
          totalListings,
          activeListings,
          totalMarketplaceSales: totalSales,
          totalMarketplaceRevenueCents: totalMarketplaceRevenue,
          avgPricePointCents: avgPricePoint,
        },
        aiPlatform: {
          aiUsageToday,
          aiUsageMonth,
          exportUsageMonth,
          uniqueAIUsers,
          aiAdoptionRate,
        },
        userHealth: {
          levelDistribution,
          creatorClassDistribution,
          crossToolAdoption,
          powerCreators,
          atRiskUsers,
          topCreators,
        },
        compliance: {
          consentCompletionRate,
          parentalConsentRate,
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

  // Earn XP
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
      res.status(500).json({ message: error.message });
    }
  });

  // Get comments for a post
  app.get("/api/social/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
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

      const allProjects = await storage.getUserProjects(req.params.userId);
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
        collabClients.set(clientInfo.sessionId, updated);
        
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
      res.status(500).json({ message: error.message });
    }
  });

  // Get comments
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.postId);
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
      const { email, name, source, referredBy } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
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
      const [users, waitlistEntries, featureFlagsData, settingsData, logs] = await Promise.all([
        storage.getAllUsers(),
        storage.getWaitlist(),
        storage.getFeatureFlags(),
        storage.getAllPlatformSettings(),
        storage.getAdminLogs(10),
      ]);

      const stats = {
        totalUsers: users.length,
        adminCount: users.filter(u => u.role === "admin").length,
        creatorCount: users.filter(u => u.role === "creator").length,
        waitlistPending: waitlistEntries.filter(e => e.status === "pending").length,
        waitlistApproved: waitlistEntries.filter(e => e.status === "approved").length,
        waitlistRejected: waitlistEntries.filter(e => e.status === "rejected").length,
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

      res.json({ url: session.url });
    } catch (error: any) {
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
            // Sync tier from Stripe if different
            if (subscription.tier !== stripeSubscription.tier || 
                subscription.stripeSubscriptionId !== stripeSubscription.subscriptionId) {
              subscription = await storage.updateSubscription(req.user!.id, {
                tier: stripeSubscription.tier as any,
                status: stripeSubscription.status,
                stripeSubscriptionId: stripeSubscription.subscriptionId,
                currentPeriodEnd: stripeSubscription.currentPeriodEnd,
                cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
              }) || subscription;
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

      // Auto-trigger publish pipeline on approval to sync to Emergent streaming
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
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
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
      res.json({ jobId: result.jobId, message: "Publishing pipeline started" });
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

  // Emergent engagement webhook (inbound events) - requires shared secret
  app.post("/api/webhooks/engagement", async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.EMERGENT_WEBHOOK_SECRET;
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
      const health = await checkEmergentHealth();
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
      const emergentSecret = process.env.EMERGENT_WEBHOOK_SECRET;
      const emergentUrl = process.env.EMERGENT_API_URL;

      const connections: { name: string; configured: boolean; url: string | null; status: string }[] = [];

      connections.push({
        name: "Press Start LMS",
        configured: !!(pslmsUrl && pslmsKey),
        url: pslmsUrl ? pslmsUrl.replace(/\/api.*$/, "") : null,
        status: pslmsUrl && pslmsKey ? "connected" : "not_configured",
      });

      connections.push({
        name: "Mad Mixed Media",
        configured: !!emergentSecret,
        url: emergentUrl || null,
        status: emergentSecret ? "connected" : "not_configured",
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

      const projects = await storage.getUserProjects(user.id);
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
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoMiXX-Signature": signature,
        },
        body: bodyStr,
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

          await fetch(`${pslmsUrl.replace(/\/$/, "")}/api/webhooks/streaming`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-API-Key": pslmsKey || "",
            },
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

      const response = await fetch(`${pslmsUrl.replace(/\/$/, "")}/api/webhooks/streaming/portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-API-Key": pslmsKey || "",
        },
        body: bodyStr,
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
        ? "https://pressstart.space"
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

  // ==================== FX STUDIO API ROUTES (pressplays.site sync) ====================

  app.get("/api/usage/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const subscription = await storage.getUserSubscription(userId);
      const tier = (subscription?.tier || "free") as TierName;
      const entitlements = tierEntitlements[tier] || tierEntitlements.free;

      const aiCount = await storage.getUsageCount(userId, "ai_generation", "daily", getTodayKey());
      const exportCount = await storage.getUsageCount(userId, "export", "monthly", getMonthKey());

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
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  app.get("/api/fx-studio/effects", isAuthenticated, async (req, res) => {
    try {
      const params = new URLSearchParams();
      if (req.query.asset_tag) params.set("asset_tag", req.query.asset_tag as string);
      if (req.query.project_id) params.set("project_id", req.query.project_id as string);
      if (req.query.type) params.set("type", req.query.type as string);
      if (req.query.search) params.set("search", req.query.search as string);
      if (req.query.limit) params.set("limit", req.query.limit as string);
      if (req.query.offset) params.set("offset", req.query.offset as string);
      const qs = params.toString();
      const url = qs ? `${FX_API_URL}?${qs}` : FX_API_URL;
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json", apikey: FX_API_KEY },
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(`${FX_API_URL}?id=${req.params.id}`, {
        headers: { "Content-Type": "application/json", apikey: FX_API_KEY },
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/fx-studio/effects", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(FX_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: FX_API_KEY },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(`${FX_API_URL}?id=${req.params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: FX_API_KEY },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/fx-studio/effects/:id", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(`${FX_API_URL}?id=${req.params.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", apikey: FX_API_KEY },
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // COMMUNITY LIBRARY
  // ==========================================

  app.get("/api/community/library", async (req, res) => {
    try {
      const { search, sort, page, limit } = req.query;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      const result = await storage.getCommunityComics({
        search: search as string,
        sort: (sort as string) || "newest",
        limit: limitNum,
        offset,
      });

      res.json({
        comics: result.comics.map(c => ({
          ...c,
          data: undefined,
          pageCount: (c.data as any)?.spreads?.length || 0,
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
      await storage.addProjectToSeries(projectId, req.params.id, order || 0);
      res.json({ success: true });
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
      res.json({ ...series, comics });
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
Sitemap: https://pressstart.space/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = "https://pressstart.space";
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
        image: comic.thumbnail || "https://pressstart.space/og-image.png",
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
        image: user.avatar || "https://pressstart.space/og-image.png",
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
      const price = Number(listing.price) === 0 ? "Free" : `$${listing.price}`;
      res.json({
        title: `${listing.title} (${price}) | Press Start CoMixx Marketplace`,
        description: listing.description || `Get "${listing.title}" on Press Start CoMixx Marketplace`,
        image: listing.coverImage || "https://pressstart.space/og-image.png",
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
      res.json(submission);
    } catch (err) {
      res.status(500).json({ message: "Error grading submission" });
    }
  });

  // =========== T007: Legal/Privacy/Terms Endpoints ===========

  app.get("/api/legal/privacy-policy", (_req, res) => {
    res.json({
      title: "Privacy Policy",
      version: "2.0",
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-03-19",
      content: {
        introduction: "Press Start CoMiXX, operated by MADMixedMedia (\"we\", \"us\", \"our\"), is committed to protecting the privacy of all users, with special attention to users under 18 (\"Students\"). This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our platform at pressstart.space and any related services. By using the platform, you consent to the practices described in this policy.",
        dataCollection: {
          title: "Information We Collect",
          items: [
            "Account information: name or username, email address, account type (Student/Creator), age range for age-gating purposes",
            "Content created: comics, trading cards, motion graphics, visual novels, choose-your-own-adventure stories, and other creative works you produce using our tools",
            "Usage data: features accessed, projects created, AI generation requests, XP earned, login timestamps, and session duration for improving the platform experience",
            "Device information: browser type, operating system, screen resolution, and IP address (collected for security and abuse prevention only)",
            "Communications: social posts, comments, and community interactions within the platform",
            "Payment information: processed securely through Stripe; we do not store credit card numbers on our servers"
          ]
        },
        studentData: {
          title: "Student Data Protection (COPPA/FERPA Compliance)",
          items: [
            "We comply with the Children's Online Privacy Protection Act (COPPA) and the Family Educational Rights and Privacy Act (FERPA)",
            "We collect only the minimum data necessary to provide educational and creative services",
            "Verifiable parental consent is required before creating accounts for users under 13 years of age",
            "Student data is NEVER sold, rented, leased, or shared with third parties for advertising, marketing, or any non-educational purpose",
            "Teachers and authorized school administrators may review student activity and progress within the platform",
            "AI-generated content for student accounts includes mandatory safety filters and content moderation",
            "Student accounts have restricted access to marketplace features, monetization, direct messaging, and social features",
            "Schools and parents/guardians can request complete data export or deletion at any time by contacting districts@pressstart.space",
            "We do not use student data for behavioral targeting, profiling, or building advertising profiles",
            "We do not permit students under 13 to make purchases or engage in financial transactions on the platform"
          ]
        },
        dataRetention: {
          title: "Data Retention",
          items: [
            "Active accounts: data is retained while the account is active and in good standing",
            "School-administered accounts: data is retained per the Data Processing Agreement, with a default of 2 years post-enrollment unless otherwise specified",
            "Deleted accounts: all personally identifiable data is purged within 30 days of a deletion request",
            "Audit logs: retained for up to 7 years per regulatory compliance requirements",
            "AI generation logs: retained for up to 1 year for safety review and content moderation purposes, then permanently deleted"
          ]
        },
        dataRights: {
          title: "Your Rights",
          items: [
            "Access: You may request a copy of all data we hold about you via Settings or by emailing privacy@pressstart.space",
            "Deletion: You may delete your account and request removal of all associated data via Settings > Delete Account",
            "Correction: You may update or correct your profile information at any time",
            "Portability: You may export your projects, assets, and data in standard formats (JSON, PNG, PDF)",
            "Opt-out: You may disable optional analytics and tracking in Settings",
            "Parental access: Parents/guardians of users under 18 may request access to or deletion of their child's account and data at any time"
          ]
        },
        security: {
          title: "Security Measures",
          items: [
            "Passwords hashed using scrypt with unique per-user salts; we never store plaintext passwords",
            "HTTPS/TLS encryption for all data transmitted between your browser and our servers",
            "Content Security Policy (CSP), X-Frame-Options, and other security headers enforced via Helmet.js",
            "Rate limiting on all API endpoints to prevent abuse and denial-of-service attacks",
            "Session-based authentication with secure, httpOnly, SameSite cookies",
            "Regular security assessments and code reviews",
            "Input sanitization and prompt safety filtering on all AI generation requests"
          ]
        },
        noSell: {
          title: "We Do NOT Sell Your Data",
          items: [
            "MADMixedMedia does not sell, rent, lease, or trade personal information of any user to any third party, for any purpose, under any circumstances",
            "We do not share user data with advertisers or data brokers",
            "We do not use personal information for targeted advertising",
            "We do not build or contribute to advertising profiles about our users",
            "Any third-party services we use (database hosting, payment processing, AI generation) are bound by data processing agreements and are prohibited from using your data beyond what is necessary to provide their service"
          ]
        },
        thirdParty: {
          title: "Third-Party Services",
          items: [
            "Neon Database (PostgreSQL hosting) - United States - Stores user accounts, projects, and platform data",
            "Stripe (Payment processing) - United States - Processes Creator account payments; no student data is shared with Stripe",
            "Pollinations.ai (AI generation) - European Union - Processes image and text generation requests; no personally identifiable user data is sent",
            "Resend (Email delivery) - United States - Sends transactional emails such as password resets",
            "Google Fonts (Typography) - Serves web fonts; subject to Google's Privacy Policy"
          ]
        },
        cookies: {
          title: "Cookies & Local Storage",
          items: [
            "We use essential session cookies for authentication; these are required for the platform to function",
            "We use localStorage and IndexedDB for offline project saving and PWA functionality",
            "We do not use third-party tracking cookies, advertising cookies, or cross-site tracking pixels",
            "You may clear cookies and local storage through your browser settings; doing so may require you to log in again"
          ]
        },
        contact: "For privacy inquiries: privacy@pressstart.space | For school/district data requests: districts@pressstart.space | For COPPA-related requests: coppa@pressstart.space | MADMixedMedia, pressstart.space"
      }
    });
  });

  app.get("/api/legal/terms", (_req, res) => {
    res.json({
      title: "Terms of Service",
      version: "2.0",
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-03-19",
      content: {
        acceptance: "By creating an account, accessing, or using Press Start CoMiXX (the \"Platform\"), operated by MADMixedMedia, you agree to be bound by these Terms of Service (\"Terms\"). If you are under 18, you represent that your parent, legal guardian, or authorized school administrator has reviewed, understood, and agreed to these Terms on your behalf. If you do not agree to these Terms, you must not access or use the Platform.",
        eligibility: "Student accounts are available for users ages 6-17 and require verifiable parental consent or school administrator authorization. Creator accounts require users to be 18 years of age or older. School-administered accounts are governed by a separate Data Processing Agreement (DPA) between MADMixedMedia and the institution. Users must provide accurate information during registration. Accounts created with false information may be terminated without notice.",
        content: "You retain full ownership of all original content you create using the Platform, including but not limited to comics, visual novels, trading cards, CYOA stories, motion graphics, and other creative works (\"User Content\"). By publishing or sharing User Content on the Platform, you grant MADMixedMedia a limited, non-exclusive, royalty-free, worldwide license to display, distribute, and promote your User Content within the Platform and its associated marketing channels. This license exists solely to operate and promote the Platform and does not transfer ownership. You may revoke this license at any time by removing your User Content or deleting your account. AI-generated content created through Platform tools is subject to our Acceptable Use Policy. You are responsible for ensuring your User Content does not infringe on the intellectual property rights of others.",
        platformIP: "All platform tools, systems, user interface designs, code, mechanics, templates, asset packs, FX libraries, XP systems, AI integration pipelines, and branding (including but not limited to the names \"Press Start,\" \"CoMiXX,\" \"MADMixedMedia,\" and \"Press Play Festival\") remain the exclusive intellectual property of MADMixedMedia. Users are granted a limited, non-exclusive, non-transferable, revocable license to use these tools and assets solely within the Platform for personal or educational use. This license does not grant any rights to sublicense, redistribute, reverse-engineer, decompile, disassemble, or create derivative works based on Platform tools, assets, or code. Pre-made asset packs, templates, and effects provided by the Platform may not be extracted, resold, or redistributed outside the Platform without written permission from MADMixedMedia.",
        prohibited: "Users may not: (a) upload, publish, or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable; (b) upload content that infringes any patent, trademark, copyright, trade secret, or other intellectual property right of any party; (c) harass, bully, stalk, or intimidate other users; (d) attempt to circumvent, disable, or interfere with any safety filters, content moderation, or security features of the Platform; (e) share, solicit, or expose personal information of minors; (f) use the Platform for unauthorized commercial purposes, spam, or unsolicited advertising; (g) reverse-engineer, decompile, disassemble, or attempt to derive the source code of any Platform software; (h) scrape, crawl, or use automated means to access or collect data from the Platform; (i) impersonate any person or entity or misrepresent your affiliation with any person or entity; (j) introduce viruses, malware, or other harmful code; or (k) violate any applicable local, state, national, or international law or regulation.",
        dmca: "MADMixedMedia respects the intellectual property rights of others and expects our users to do the same. If you believe that your copyrighted work has been copied or used in a way that constitutes copyright infringement, please submit a DMCA takedown notice to dmca@pressstart.space with: (1) a description of the copyrighted work you claim has been infringed; (2) identification of the material that is claimed to be infringing and its location on the Platform; (3) your contact information (name, address, email, phone); (4) a statement that you have a good faith belief that the use is not authorized by the copyright owner; (5) a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf; and (6) your physical or electronic signature. We will respond to valid DMCA notices within 72 hours and may remove or disable access to the allegedly infringing material. Repeat infringers will have their accounts terminated.",
        termination: "We reserve the right to suspend or terminate any account that violates these Terms, engages in prohibited conduct, or poses a risk to the safety of other users, at our sole discretion and without prior notice. Upon termination for cause, your license to use the Platform is immediately revoked. Users may voluntarily delete their account at any time through Settings > Delete Account. Upon voluntary deletion, we will remove your data within 30 days in accordance with our Privacy Policy. Provisions of these Terms that by their nature should survive termination (including but not limited to intellectual property, limitation of liability, and indemnification) shall survive.",
        liability: "THE PLATFORM IS PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. MADMIXEDMEDIA DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. MADMIXEDMEDIA IS NOT RESPONSIBLE FOR: (A) USER-GENERATED CONTENT POSTED BY USERS; (B) ANY LOSS, DAMAGE, OR HARM ARISING FROM THE USE OF OR INABILITY TO USE THE PLATFORM; (C) CONTENT OR CONDUCT OF ANY THIRD PARTY ON THE PLATFORM; (D) ANY UNAUTHORIZED ACCESS TO YOUR ACCOUNT; (E) INTERRUPTIONS, DELAYS, OR DEFECTS IN THE PLATFORM. IN NO EVENT SHALL MADMIXEDMEDIA'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO MADMIXEDMEDIA IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES OR LIMITATION OF LIABILITY, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.",
        indemnification: "You agree to indemnify, defend, and hold harmless MADMixedMedia, its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use of the Platform; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any rights of any third party.",
        dispute: "These Terms are governed by the laws of the United States. Any dispute arising from these Terms or the use of the Platform shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except that either party may seek injunctive relief in any court of competent jurisdiction for intellectual property disputes. You agree to waive any right to a jury trial or to participate in a class action.",
        modifications: "MADMixedMedia reserves the right to modify these Terms at any time. Material changes will be communicated through the Platform with at least 30 days' notice. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms. If you do not agree with the revised Terms, you must stop using the Platform and delete your account.",
        minorSafety: "For users under 18: The Platform implements age-appropriate content filtering, restricted social features, and educator oversight capabilities. Users under 13 require verifiable parental consent. Schools and teachers act as supervising authorities for school-administered accounts. Direct messaging between minor users is subject to moderation. Student accounts cannot access monetization features, make purchases, or sell content on the Marketplace. Parents/guardians may review, restrict, or delete their child's account at any time.",
        schoolAgreement: "Schools and educational institutions using the Platform agree that: (a) they are responsible for obtaining necessary parental consents for student use; (b) they act as the supervising authority for student activity during school-sponsored use; (c) they will comply with applicable student privacy laws; (d) MADMixedMedia is not liable for classroom misuse or unauthorized student access outside of school hours; (e) the institution's Data Processing Agreement governs the handling of student education records."
      }
    });
  });

  app.get("/api/legal/dpa", (_req, res) => {
    res.json({
      title: "Data Processing Agreement",
      version: "1.0",
      effectiveDate: "2025-01-01",
      content: {
        purpose: "This Data Processing Agreement (\"DPA\") supplements the Terms of Service and applies when Press Start CoMiXX processes Student Education Records on behalf of a School or School District (\"Institution\").",
        definitions: {
          "Student Education Records": "Any information directly related to a student that is maintained by the Institution, as defined under FERPA (20 U.S.C. § 1232g).",
          "School Official": "A person with a legitimate educational interest, designated by the Institution, who uses Press Start CoMiXX to support educational activities.",
          "De-identified Data": "Data from which all personally identifiable information has been removed or obscured."
        },
        obligations: [
          "We process Student Education Records solely for the purpose of providing educational services as directed by the Institution",
          "We do not sell student data or use it for advertising or marketing purposes",
          "We implement reasonable security measures to protect student data",
          "We provide the Institution with access to, and the ability to delete, student data upon request",
          "We notify the Institution within 72 hours of any data breach affecting student data",
          "We return or delete student data within 30 days upon termination of the agreement",
          "We comply with FERPA, COPPA, and applicable state student privacy laws"
        ],
        dataRetention: "Student data is retained for the duration of the agreement plus 60 days. Institutions may specify shorter retention periods. Annual certification of data destruction is provided upon request.",
        subprocessors: [
          { name: "Neon Database", purpose: "PostgreSQL database hosting", location: "United States" },
          { name: "Pollinations.ai", purpose: "AI image and text generation (no student data stored)", location: "European Union" },
          { name: "Stripe", purpose: "Payment processing (Creator accounts only, not used for student accounts)", location: "United States" }
        ],
        contact: "For DPA execution or questions: districts@pressstart.space"
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
        contact: "security@pressstart.space",
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
      contact: "accessibility@pressstart.space",
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

  return server;
}
