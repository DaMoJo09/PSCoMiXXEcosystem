import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, randomBytes, createHash } from "crypto";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertProjectSchema, insertAssetSchema, insertAssetImportSchema, tierEntitlements, TierName, insertContentReportSchema, insertAssetPackSchema } from "@shared/schema";
import { z } from "zod";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";

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
      const result = insertUserSchema.safeParse(req.body);
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
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(400).json({ message: info?.message || "Login failed" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
      
      if (!adminUser) {
        const hashedPassword = await hashPassword(adminPassword);
        adminUser = await storage.createUser({
          email: adminEmail,
          password: hashedPassword,
          name: "Administrator",
          role: "admin",
        });
      } else if (adminUser.role !== "admin") {
        await storage.updateUserRole(adminUser.id, "admin");
        adminUser = { ...adminUser, role: "admin" };
      }
      
      req.login(adminUser, (err) => {
        if (err) return next(err);
        return res.json({
          id: adminUser!.id,
          email: adminUser!.email,
          name: adminUser!.name,
          role: adminUser!.role,
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
      const projects = await storage.getUserProjects(req.user!.id);
      res.json(projects);
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

      const result = insertProjectSchema.safeParse({
        ...req.body,
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
      const assets = projectId
        ? await storage.getProjectAssets(projectId)
        : await storage.getUserAssets(req.user!.id);
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
      const post = await storage.createSocialPost({
        authorId: req.user!.id,
        projectId,
        type: type || "post",
        caption,
        mediaUrls,
        visibility: visibility || "public",
      });
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
      const { priceId } = req.body;
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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

  return server;
}
