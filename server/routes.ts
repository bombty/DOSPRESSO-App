import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTaskSchema, insertChecklistSchema, insertEquipmentFaultSchema, insertKnowledgeBaseArticleSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.get('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const branch = await storage.getBranch(id);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const tasks = await storage.getTasks(branchId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...validatedData,
        assignedToId: validatedData.assignedToId || userId,
      });
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.post('/api/tasks/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const task = await storage.completeTask(id, photoUrl);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const checklists = await storage.getChecklists();
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

  app.post('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertChecklistSchema.parse(req.body);
      const checklist = await storage.createChecklist(validatedData);
      res.json(checklist);
    } catch (error: any) {
      console.error("Error creating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create checklist" });
    }
  });

  app.get('/api/checklist-tasks', isAuthenticated, async (req, res) => {
    try {
      const checklistId = req.query.checklistId ? parseInt(req.query.checklistId as string) : undefined;
      const tasks = await storage.getChecklistTasks(checklistId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching checklist tasks:", error);
      res.status(500).json({ message: "Failed to fetch checklist tasks" });
    }
  });

  app.get('/api/faults', isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const faults = await storage.getFaults(branchId);
      res.json(faults);
    } catch (error) {
      console.error("Error fetching faults:", error);
      res.status(500).json({ message: "Failed to fetch faults" });
    }
  });

  app.post('/api/faults', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEquipmentFaultSchema.parse(req.body);
      const fault = await storage.createFault({
        ...validatedData,
        reportedById: userId,
      });
      res.json(fault);
    } catch (error: any) {
      console.error("Error creating fault:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid fault data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fault" });
    }
  });

  app.post('/api/faults/:id/photo', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const fault = await storage.updateFault(id, { photoUrl });
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      res.json(fault);
    } catch (error) {
      console.error("Error updating fault photo:", error);
      res.status(500).json({ message: "Failed to update fault photo" });
    }
  });

  app.post('/api/faults/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fault = await storage.resolveFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      res.json(fault);
    } catch (error) {
      console.error("Error resolving fault:", error);
      res.status(500).json({ message: "Failed to resolve fault" });
    }
  });

  app.get('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.post('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertKnowledgeBaseArticleSchema.parse(req.body);
      const article = await storage.createArticle(validatedData);
      res.json(article);
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid article data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.get('/api/performance', isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId && req.query.branchId !== 'all' 
        ? parseInt(req.query.branchId as string) 
        : undefined;
      const metrics = await storage.getPerformanceMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.get('/api/performance/latest', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics();
      const latest = metrics.slice(0, 10);
      res.json(latest);
    } catch (error) {
      console.error("Error fetching latest performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch latest performance metrics" });
    }
  });

  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(
        `${process.env.PUBLIC_OBJECT_SEARCH_PATHS}/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
