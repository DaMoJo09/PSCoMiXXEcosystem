import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertProjectSchema, insertAssetSchema } from "@shared/schema";

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

  // Admin login - creates/uses predefined admin account
  app.post("/api/auth/admin-login", async (req, res, next) => {
    try {
      const { password } = req.body;
      const adminEmail = "admin@pressstart.space";
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        return res.status(500).json({ message: "Admin login not configured. Set ADMIN_PASSWORD environment variable." });
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

  return server;
}
