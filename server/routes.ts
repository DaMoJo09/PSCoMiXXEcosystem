import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertProjectSchema, insertAssetSchema, insertAssetImportSchema } from "@shared/schema";
import { z } from "zod";

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

  return server;
}
