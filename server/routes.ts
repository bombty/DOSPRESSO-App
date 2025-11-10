import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./jwtAuth";
import { sanitizeUser, sanitizeUsers } from "./security";
import { 
  insertTaskSchema, 
  insertChecklistSchema, 
  insertEquipmentFaultSchema, 
  insertKnowledgeBaseArticleSchema, 
  insertBranchSchema,
  insertTrainingModuleSchema,
  insertModuleVideoSchema,
  insertModuleQuizSchema,
  insertQuizQuestionSchema,
  insertUserQuizAttemptSchema,
  insertUserTrainingProgressSchema,
  updateUserSchema,
  insertUserSchema,
  insertEmployeeWarningSchema,
  hasPermission,
  isHQRole,
  isBranchRole,
  type UpdateUser,
  type UserRoleType
} from "@shared/schema";
import { analyzeTaskPhoto, analyzeFaultPhoto, generateArticleEmbeddings, generateEmbedding, answerQuestionWithRAG } from "./ai";
import { startReminderSystem } from "./reminders";

// Helper function to assert branch scope for branch users
function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Authorization: Branch users can only see their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        const branch = await storage.getBranch(user.branchId);
        return res.json(branch ? [branch] : []);
      }
      
      // HQ users can see all branches
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.get('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (user.branchId !== id) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }
      
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

  app.post('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Authorization: Only HQ users can create branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const validatedData = insertBranchSchema.parse(req.body);
      const branchData = {
        ...validatedData,
        address: validatedData.address ?? null,
        city: validatedData.city ?? null,
        phoneNumber: validatedData.phoneNumber ?? null,
        managerName: validatedData.managerName ?? null,
      };
      const branch = await storage.createBranch(branchData);
      res.json(branch);
    } catch (error: any) {
      console.error("Error creating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  app.patch('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Only HQ users can update branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const validatedData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(id, validatedData);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error: any) {
      console.error("Error updating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  app.delete('/api/branches/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Only HQ users can delete branches
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await storage.deleteBranch(id);
      res.json({ message: "Branch deleted successfully" });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const tasks = await storage.getTasks(user.branchId);
        return res.json(tasks);
      }
      
      // Admin/Coach can access all or filter by branch
      const tasks = await storage.getTasks(requestedBranchId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Authorization: Branch users can only create tasks for their own branch
      // FORCE branchId to user's branch for branch users (ignore payload)
      let taskBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        taskBranchId = branchId; // Override payload branchId
      }
      
      const task = await storage.createTask({
        ...validatedData,
        branchId: taskBranchId,
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

  app.post('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
      // Authorization: Branch users can only complete tasks from their own branch
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingTask.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu görevi tamamlama yetkiniz yok" });
        }
      }
      
      const task = await storage.completeTask(id, photoUrl);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (photoUrl) {
        try {
          const analysis = await analyzeTaskPhoto(photoUrl, task.description, userId);
          const updatedTask = await storage.updateTask(id, {
            aiAnalysis: analysis.analysis,
            aiScore: analysis.score,
          });
          res.json(updatedTask || task);
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          res.json(task);
        }
      } else {
        res.json(task);
      }
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
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Authorization: Branch users can only access their own branch faults
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const faults = await storage.getFaults(branchId);
        return res.json(faults);
      }
      
      // HQ users can access all or filter by branch
      const faults = await storage.getFaults(requestedBranchId);
      res.json(faults);
    } catch (error) {
      console.error("Error fetching faults:", error);
      res.status(500).json({ message: "Failed to fetch faults" });
    }
  });

  app.post('/api/faults', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertEquipmentFaultSchema.parse(req.body);
      
      // Authorization: Branch users can only create faults for their own branch
      let faultBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Force branch users to create faults only for their branch
        faultBranchId = branchId;
      }
      
      const fault = await storage.createFault({
        ...validatedData,
        branchId: faultBranchId,
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

  app.post('/api/faults/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
      // Authorization: Branch users can only update faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı düzenleme yetkiniz yok" });
        }
      }
      
      // Update photo URL after authorization check
      if (photoUrl) {
        const fault = await storage.updateFault(id, { photoUrl });
        if (!fault) {
          return res.status(404).json({ message: "Fault not found" });
        }

        try {
          const analysis = await analyzeFaultPhoto(
            photoUrl,
            fault.equipmentName,
            fault.description,
            userId
          );
          const updatedFault = await storage.updateFault(id, {
            aiAnalysis: analysis.analysis,
            aiSeverity: analysis.severity,
            aiRecommendations: analysis.recommendations,
          });
          res.json(updatedFault || fault);
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
          res.json(fault);
        }
      } else {
        // If no photo URL provided, just return existing fault
        res.json(existingFault);
      }
    } catch (error) {
      console.error("Error updating fault photo:", error);
      res.status(500).json({ message: "Failed to update fault photo" });
    }
  });

  app.post('/api/faults/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Branch users can only resolve faults from their own branch
      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (existingFault.branchId !== branchId) {
          return res.status(403).json({ message: "Bu arızayı çözme yetkiniz yok" });
        }
      }
      
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

  app.put('/api/faults/:id/stage', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stage, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!stage) {
        return res.status(400).json({ message: "Stage is required" });
      }
      
      // Validate stage value
      const { FAULT_STAGES } = await import('@shared/schema');
      const validStages = Object.values(FAULT_STAGES);
      if (!validStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid stage value" });
      }
      
      // Check permissions: branch vs hq_teknik
      const faultToUpdate = await storage.getFault(id);
      if (!faultToUpdate) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      // Permission logic:
      // - HQ teknik role can change any fault stage
      // - Branch roles (supervisor, barista, stajyer) can only change their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || faultToUpdate.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın aşamasını değiştirme yetkiniz yok" });
        }
      }
      
      const fault = await storage.changeFaultStage(id, stage, userId, notes);
      res.json(fault);
    } catch (error) {
      console.error("Error changing fault stage:", error);
      res.status(500).json({ message: "Failed to change fault stage" });
    }
  });

  app.get('/api/faults/:id/history', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user.role;
      
      // Check permissions for viewing history
      const fault = await storage.getFault(id);
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }
      
      // Permission logic: same as stage change
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;
      
      if (!isTeknik) {
        // Branch users MUST have a branchId assigned
        if (!isBranchUser || !userBranchId || fault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızanın geçmişini görüntüleme yetkiniz yok" });
        }
      }
      
      const history = await storage.getFaultStageHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching fault history:", error);
      res.status(500).json({ message: "Failed to fetch fault history" });
    }
  });

  // Equipment routes
  app.get('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const equipment = await storage.getEquipment(user.branchId);
        return res.json(equipment);
      }
      
      // HQ users can access all or filter by branch
      const equipment = await storage.getEquipment(requestedBranchId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.get('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipmentItem);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.post('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      // Authorization: Branch users can only create equipment for their own branch
      // FORCE branchId to user's branch for branch users (ignore payload)
      let equipmentBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        equipmentBranchId = branchId; // Override payload branchId
      }
      
      // Generate QR code URL (simple ID-based URL for now)
      const qrCodeUrl = `/equipment/${Date.now()}`;
      
      const equipment = await storage.createEquipment({
        ...validatedData,
        branchId: equipmentBranchId,
        qrCodeUrl,
      });
      res.json(equipment);
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.put('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.partial().parse(req.body);
      
      // Authorization: Branch users can only update equipment from their own branch
      const existingEquipment = await storage.getEquipmentById(id);
      if (!existingEquipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingEquipment.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmanı düzenleme yetkiniz yok" });
        }
        // Prevent changing branchId
        if (validatedData.branchId && validatedData.branchId !== user.branchId) {
          return res.status(403).json({ message: "Ekipmanın şubesini değiştiremezsiniz" });
        }
      }
      
      const equipment = await storage.updateEquipment(id, validatedData);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  app.post('/api/equipment/:id/maintenance', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only log maintenance for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için bakım kaydı oluşturma yetkiniz yok" });
        }
      }
      
      const intervalDays = equipmentItem.maintenanceIntervalDays || 30;
      const updated = await storage.logMaintenance(id, intervalDays);
      res.json(updated);
    } catch (error) {
      console.error("Error logging maintenance:", error);
      res.status(500).json({ message: "Failed to log maintenance" });
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
      
      if (article.isPublished) {
        try {
          await storage.deleteEmbeddingsByArticle(article.id);
          const embeddings = await generateArticleEmbeddings(article.id, article.title, article.content);
          await storage.createEmbeddings(embeddings.map(e => ({
            articleId: article.id,
            chunkText: e.chunkText,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding,
          })));
        } catch (embeddingError) {
          console.error("Error generating embeddings:", embeddingError);
        }
      }
      
      res.json(article);
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid article data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.post('/api/knowledge-base/:id/reindex', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);
      
      if (!article) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      await storage.deleteEmbeddingsByArticle(id);
      
      if (article.isPublished) {
        const embeddings = await generateArticleEmbeddings(id, article.title, article.content);
        await storage.createEmbeddings(embeddings.map(e => ({
          articleId: id,
          chunkText: e.chunkText,
          chunkIndex: e.chunkIndex,
          embedding: e.embedding,
        })));
      }

      res.json({ message: "Makale yeniden indekslendi", articleId: id });
    } catch (error) {
      console.error("Error reindexing article:", error);
      res.status(500).json({ message: "Makale yeniden indekslenemedi" });
    }
  });

  app.post('/api/knowledge-base/ask', isAuthenticated, async (req: any, res) => {
    try {
      const { question } = req.body;
      const userId = req.user.id; // For rate limiting
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Soru gereklidir" });
      }

      const queryEmbedding = await generateEmbedding(question);
      const relevantChunks = await storage.semanticSearch(queryEmbedding, 5);

      if (relevantChunks.length === 0) {
        return res.json({
          answer: "Bu konuda bilgi bankasında bilgi bulamadım. Lütfen daha fazla içerik ekleyin veya sorunuzu farklı şekilde sorun.",
          sources: [],
          noKnowledgeFound: true,
        });
      }

      const response = await answerQuestionWithRAG(question, relevantChunks, userId);
      res.json({ ...response, noKnowledgeFound: false });
    } catch (error) {
      console.error("Error answering question:", error);
      res.status(500).json({ message: "Soru cevaplanamadı" });
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

  // ========================================
  // EMPLOYEE/HR ROUTES
  // ========================================

  // Get employees list (with permissions and branch filtering)
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan listesine erişim yetkiniz yok" });
      }

      // Authorization: Supervisor must have a valid branchId
      if (role === 'supervisor' && !userBranchId) {
        return res.status(403).json({ message: "Şube ataması yapılmamış" });
      }

      // Branch filtering for supervisor/coach
      let branchFilter: number | undefined;
      if (role === 'supervisor') {
        // Supervisor can only see their own branch
        branchFilter = userBranchId!;
      } else if (role === 'coach' || role === 'admin') {
        // Coach/Admin can optionally filter by branchId query param
        branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      }

      const employees = await storage.getAllEmployees(branchFilter);
      
      // Sanitize: Remove sensitive fields using security helper
      res.json(sanitizeUsers(employees));
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Çalışanlar yüklenirken hata oluştu" });
    }
  });

  // Get single employee (with permissions and branch filtering)
  app.get('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan bilgilerine erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Sanitize: Remove sensitive fields using security helper
      res.json(sanitizeUser(employee));
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Çalışan bilgileri yüklenirken hata oluştu" });
    }
  });

  // Update employee (with field-level restrictions)
  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'edit')) {
        return res.status(403).json({ message: "Çalışan düzenleme yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Validate base schema
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      // Field-level restrictions based on role
      let allowedFields: (keyof UpdateUser)[] = [];
      
      if (role === 'admin') {
        // Admin can update all fields
        allowedFields = Object.keys(parsed.data) as (keyof UpdateUser)[];
      } else if (role === 'coach') {
        // Coach can only update notes (training-related)
        allowedFields = ['notes'];
      } else if (role === 'supervisor') {
        // Supervisor can update contact info and notes
        allowedFields = ['phoneNumber', 'emergencyContactName', 'emergencyContactPhone', 'notes'];
      }

      // Filter updates to only allowed fields
      const filteredUpdates: Partial<UpdateUser> = {};
      for (const field of allowedFields) {
        if (parsed.data[field] !== undefined) {
          filteredUpdates[field] = parsed.data[field] as any;
        }
      }

      // Check if there are any valid updates
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ message: "Güncellenecek geçerli alan bulunamadı" });
      }

      // Update employee
      const updated = await storage.updateUser(employeeId, filteredUpdates);
      if (!updated) {
        return res.status(404).json({ message: "Çalışan güncellenemedi" });
      }
      
      // Sanitize: Remove sensitive fields using security helper
      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Çalışan güncellenirken hata oluştu" });
    }
  });

  // Get employee warnings (with permissions and branch filtering)
  app.get('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Uyarı kayıtlarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      const warnings = await storage.getEmployeeWarnings(employeeId);
      res.json(warnings);
    } catch (error) {
      console.error("Error fetching employee warnings:", error);
      res.status(500).json({ message: "Uyarı kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee training progress (with permissions and branch filtering)
  app.get('/api/employees/:id/training', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'training', 'view')) {
        return res.status(403).json({ message: "Eğitim bilgilerine erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      const trainingProgress = await storage.getUserTrainingProgress(employeeId);
      res.json(trainingProgress);
    } catch (error) {
      console.error("Error fetching employee training:", error);
      res.status(500).json({ message: "Eğitim bilgileri yüklenirken hata oluştu" });
    }
  });

  // Get employee tasks (with permissions and branch filtering)
  app.get('/api/employees/:id/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'tasks', 'view')) {
        return res.status(403).json({ message: "Görev kayıtlarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Get tasks assigned to this employee (with branch scoping)
      const status = req.query.status as string | undefined;
      const tasks = await storage.getTasks(employee.branchId!, employeeId, status);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching employee tasks:", error);
      res.status(500).json({ message: "Görev kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee detail (orchestrated endpoint with all metrics)
  app.get('/api/employees/:id/detail', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Çalışan detaylarına erişim yetkiniz yok" });
      }

      // Get employee with branch authorization (prevents unauthorized data fetch)
      const allowedBranchId = role === 'supervisor' ? userBranchId : null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        // For supervisor, could be not found OR unauthorized - return generic 403
        if (role === 'supervisor') {
          return res.status(403).json({ message: "Çalışan bulunamadı veya erişim yetkiniz yok" });
        }
        // For admin/coach, definitely not found
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Fetch all related data in parallel
      const [warnings, trainingProgress, allTasks] = await Promise.all([
        storage.getEmployeeWarnings(employeeId),
        storage.getUserTrainingProgress(employeeId),
        storage.getTasks(undefined, employeeId),
      ]);

      // Calculate KPIs from task data
      const now = new Date();
      const completedTasks = allTasks.filter(t => t.status === 'tamamlandi');
      const overdueTasks = allTasks.filter(t => 
        t.status === 'beklemede' && t.dueDate && new Date(t.dueDate) < now
      );
      
      const tasksWithAiScore = completedTasks.filter(t => t.aiScore !== null && t.aiScore !== undefined);
      const averageAiScore = tasksWithAiScore.length > 0
        ? Math.round(tasksWithAiScore.reduce((sum, t) => sum + (t.aiScore || 0), 0) / tasksWithAiScore.length)
        : 0;
      
      const completionRate = allTasks.length > 0
        ? Math.round((completedTasks.length / allTasks.length) * 100)
        : 0;

      // Training progress summary
      const totalModules = trainingProgress.length;
      const completedModules = trainingProgress.filter(p => p.completedAt !== null).length;
      const trainingCompletionRate = totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

      // Sanitize employee data using security helper
      res.json({
        employee: sanitizeUser(employee),
        kpis: {
          tasksTotal: allTasks.length,
          tasksCompleted: completedTasks.length,
          tasksOverdue: overdueTasks.length,
          completionRate,
          averageAiScore,
          trainingModulesTotal: totalModules,
          trainingModulesCompleted: completedModules,
          trainingCompletionRate,
          warningsTotal: warnings.length,
          activeWarnings: warnings.filter(w => 
            w.warningType === 'written' || w.warningType === 'final'
          ).length,
        },
        warnings,
        trainingProgress,
        recentTasks: allTasks.slice(0, 10), // Last 10 tasks
      });
    } catch (error) {
      console.error("Error fetching employee detail:", error);
      res.status(500).json({ message: "Çalışan detayları yüklenirken hata oluştu" });
    }
  });

  // Create new employee (admin/coach/supervisor with branch scoping)
  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'employees', 'create')) {
        return res.status(403).json({ message: "Çalışan ekleme yetkiniz yok" });
      }

      // Validate employee data
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz çalışan verisi", errors: parsed.error.errors });
      }

      // Authorization: Branch users can only create employees for their own branch
      // FORCE branchId to user's branch for ALL branch roles (ignore payload)
      let employeeData = parsed.data;
      if (role && isBranchRole(role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Override branchId to user's branch (prevent creating employee in other branches)
        employeeData = { ...parsed.data, branchId };
      }

      // Create employee (storage layer handles password hashing if provided)
      const newEmployee = await storage.createUser(employeeData);
      
      // Sanitize: Remove sensitive fields using security helper
      res.status(201).json(sanitizeUser(newEmployee));
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Çalışan eklenirken hata oluştu" });
    }
  });

  // Delete employee (admin/coach only - no branch restriction for coach)
  app.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role } = user;
      const employeeId = req.params.id;

      // Permission check (admin/coach only)
      if (!hasPermission(role as UserRoleType, 'employees', 'delete')) {
        return res.status(403).json({ message: "Çalışan silme yetkiniz yok" });
      }

      // Check if employee exists
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Coach can delete employees from any branch (no branch restriction)
      // Admin can delete anyone

      // Delete employee (cascades to warnings via foreign key)
      await storage.deleteUser(employeeId);
      res.json({ message: "Çalışan silindi", deletedId: employeeId });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Çalışan silinirken hata oluştu" });
    }
  });

  // Create employee warning (with permissions and branch filtering)
  app.post('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId, id: issuerId } = user;
      const employeeId = req.params.id;

      // Permission check (approve = can issue warnings)
      if (!hasPermission(role as UserRoleType, 'employees', 'approve')) {
        return res.status(403).json({ message: "Uyarı verme yetkiniz yok" });
      }

      // Get employee
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Authorization: Branch users can only issue warnings to employees in their own branch
      if (role && isBranchRole(role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (employee.branchId !== branchId) {
          return res.status(403).json({ message: "Bu çalışana uyarı verme yetkiniz yok" });
        }
      }

      // Validate warning data
      const parsed = insertEmployeeWarningSchema.safeParse({
        ...req.body,
        userId: employeeId,
        issuedBy: issuerId, // Force issuer to authenticated user
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz uyarı verisi", errors: parsed.error.errors });
      }

      const warning = await storage.createEmployeeWarning(parsed.data);
      res.status(201).json(warning);
    } catch (error) {
      console.error("Error creating employee warning:", error);
      res.status(500).json({ message: "Uyarı kaydedilirken hata oluştu" });
    }
  });

  // ========================================
  // TRAINING SYSTEM ROUTES
  // ========================================

  // Get training progress summary for all users (for İK filters and dashboards)
  app.get('/api/training/progress/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role;

      // Permission check: employees view permission required
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Eğitim durumu görüntüleme yetkiniz yok" });
      }

      const summary = await storage.getAllTrainingProgressSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching training progress summary:", error);
      res.status(500).json({ message: "Eğitim durumu getirilemedi" });
    }
  });

  // Get training modules (published only for users, all for admin/coach)
  app.get('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      
      const modules = await storage.getTrainingModules(isAdminOrCoach ? undefined : true);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Failed to fetch training modules" });
    }
  });

  // Get single training module with all content
  app.get('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      const module = await storage.getTrainingModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Authorization: Only admin/coach can see unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module" });
      }

      const [videos, quizzes, flashcards] = await Promise.all([
        storage.getModuleVideos(moduleId),
        storage.getModuleQuizzes(moduleId),
        storage.getFlashcards(moduleId),
      ]);

      res.json({ ...module, videos, quizzes, flashcards });
    } catch (error) {
      console.error("Error fetching training module:", error);
      res.status(500).json({ message: "Failed to fetch training module" });
    }
  });

  // Create training module (admin/coach only)
  app.post('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can create modules" });
      }

      const validated = insertTrainingModuleSchema.parse(req.body);
      const module = await storage.createTrainingModule({
        ...validated,
        createdBy: user.id,
      });
      
      res.status(201).json(module);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating training module:", error);
      res.status(500).json({ message: "Failed to create training module" });
    }
  });

  // Update training module (admin/coach only)
  app.put('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can update modules" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertTrainingModuleSchema.partial().parse(req.body);
      const updated = await storage.updateTrainingModule(moduleId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating training module:", error);
      res.status(500).json({ message: "Failed to update training module" });
    }
  });

  // Delete training module (admin/coach only)
  app.delete('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can delete modules" });
      }

      const moduleId = parseInt(req.params.id);
      await storage.deleteTrainingModule(moduleId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ message: "Failed to delete training module" });
    }
  });

  // Add video to module (admin/coach only)
  app.post('/api/training/modules/:id/videos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can add videos" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleVideoSchema.parse(req.body);
      const video = await storage.createModuleVideo({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(video);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module video:", error);
      res.status(500).json({ message: "Failed to create module video" });
    }
  });

  // Add quiz to module (admin/coach only)
  app.post('/api/training/modules/:id/quizzes', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can add quizzes" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleQuizSchema.parse(req.body);
      const quiz = await storage.createModuleQuiz({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(quiz);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module quiz:", error);
      res.status(500).json({ message: "Failed to create module quiz" });
    }
  });

  // Get user's training progress
  app.get('/api/training/progress', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserTrainingProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ message: "Failed to fetch training progress" });
    }
  });

  // Update user's training progress
  app.put('/api/training/progress/:moduleId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const moduleId = parseInt(req.params.moduleId);
      
      const validated = insertUserTrainingProgressSchema.partial().parse(req.body);
      const updated = await storage.updateUserProgress(userId, moduleId, validated);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating training progress:", error);
      res.status(500).json({ message: "Failed to update training progress" });
    }
  });

  // Submit quiz attempt
  app.post('/api/training/quiz-attempts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertUserQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt({
        ...validated,
        userId,
      });
      
      res.status(201).json(attempt);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating quiz attempt:", error);
      res.status(500).json({ message: "Failed to create quiz attempt" });
    }
  });

  // Approve/reject quiz attempt (supervisor/coach only)
  app.put('/api/training/quiz-attempts/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'supervisor' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only supervisors and coaches can approve quizzes" });
      }

      const attemptId = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const updated = await storage.approveQuizAttempt(attemptId, user.id, status, feedback);
      
      if (!updated) {
        return res.status(404).json({ message: "Quiz attempt not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error approving quiz attempt:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to approve quiz attempt" });
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

  // ========================================
  // ADMIN: Seed Equipment & Training (admin-only, idempotent)
  // ========================================
  app.post('/api/admin/seed-equipment-training', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin can seed data
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Sadece admin veri ekleyebilir" });
      }

      console.log("🌱 Ekipman, eğitim modülleri ve personel ekleniyor...");

      const { seedEquipmentForBranches, seedTrainingModules, seedBranchPersonnel } = await import('./seed-utils');
      
      // Import bcrypt for password hashing
      const { default: bcrypt } = await import('bcrypt');
      const hashedPassword = await bcrypt.hash("0000", 10);
      
      // Seed equipment for all existing branches
      const equipmentResult = await seedEquipmentForBranches();
      console.log(`✅ Ekipman: ${equipmentResult.created} eklendi, ${equipmentResult.skipped} atlandı`);
      
      // Seed baseline training modules
      const trainingResult = await seedTrainingModules(user.id);
      console.log(`✅ Eğitim: ${trainingResult.created} eklendi, ${trainingResult.skipped} atlandı`);
      
      // Seed branch personnel
      const personnelResult = await seedBranchPersonnel(hashedPassword);
      console.log(`✅ Personel: ${personnelResult.created} eklendi, ${personnelResult.skipped} atlandı`);

      res.json({
        success: true,
        message: "Ekipman, eğitim ve personel başarıyla eklendi",
        data: {
          equipment: equipmentResult,
          training: trainingResult,
          personnel: personnelResult,
        }
      });

      console.log("✅ Ekipman ve eğitim ekleme tamamlandı!");
    } catch (error) {
      console.error("❌ Ekleme başarısız:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ekleme başarısız" });
    }
  });

  // ========================================
  // ADMIN: Seed Demo Data (admin-only)
  // ========================================
  app.post('/api/admin/seed-demo', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin can seed demo data
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can seed demo data" });
      }

      console.log("🌱 Starting demo data seed...");

      // Import bcrypt dynamically (CommonJS module requires .default)
      const { default: bcrypt } = await import('bcrypt');
      const hashedPassword = await bcrypt.hash("0000", 10);

      // Create 18 real DOSPRESSO branches
      const branchData = [
        // ANTALYA (5 branches)
        { name: "Antalya Işıklar", address: "Işıklar Caddesi, 07100 Muratpaşa", city: "Antalya", phoneNumber: "0242 xxx 10 01", managerName: "Ahmet Yılmaz" },
        { name: "Antalya Mallof", address: "Mall of Antalya AVM, Lara", city: "Antalya", phoneNumber: "0242 xxx 10 02", managerName: "Elif Kaya" },
        { name: "Antalya Markantalya", address: "MarkAntalya AVM, Kepez", city: "Antalya", phoneNumber: "0242 xxx 10 03", managerName: "Mehmet Demir" },
        { name: "Antalya Lara", address: "Lara Bulvarı, Muratpaşa", city: "Antalya", phoneNumber: "0242 xxx 10 04", managerName: "Zeynep Şahin" },
        { name: "Antalya Beachpark", address: "Beach Park AVM, Konyaaltı", city: "Antalya", phoneNumber: "0242 xxx 10 05", managerName: "Can Arslan" },
        // GAZIANTEP (3 branches)
        { name: "Gaziantep İbrahimli", address: "İbrahimli Mahallesi, Şehitkamil", city: "Gaziantep", phoneNumber: "0342 xxx 20 01", managerName: "Fatma Yıldız" },
        { name: "Gaziantep İbnisina", address: "İbnisina Hastanesi Yanı, Şahinbey", city: "Gaziantep", phoneNumber: "0342 xxx 20 02", managerName: "Burak Öztürk" },
        { name: "Gaziantep Üniversite", address: "Üniversite Caddesi, Şehitkamil", city: "Gaziantep", phoneNumber: "0342 xxx 20 03", managerName: "Selin Aydın" },
        // KONYA (2 branches)
        { name: "Konya Meram", address: "Meram Yeni Yol Caddesi", city: "Konya", phoneNumber: "0332 xxx 30 01", managerName: "Emre Çelik" },
        { name: "Konya Bosna", address: "Bosna Hersek Mahallesi, Selçuklu", city: "Konya", phoneNumber: "0332 xxx 30 02", managerName: "Ayşe Kurt" },
        // SAMSUN (2 branches)
        { name: "Samsun Marina", address: "Piazza AVM, İlkadım", city: "Samsun", phoneNumber: "0362 xxx 40 01", managerName: "Deniz Koç" },
        { name: "Samsun Atakum", address: "Atakum Bulvarı, Atakum", city: "Samsun", phoneNumber: "0362 xxx 40 02", managerName: "Ali Erdoğan" },
        // OTHER
        { name: "Batman", address: "Cumhuriyet Caddesi, Merkez", city: "Batman", phoneNumber: "0488 xxx 50 01", managerName: "Mustafa Yaman" },
        { name: "Düzce", address: "Kadir Has Caddesi, Merkez", city: "Düzce", phoneNumber: "0380 xxx 60 01", managerName: "Sevgi Polat" },
        { name: "Siirt", address: "Atatürk Caddesi, Merkez", city: "Siirt", phoneNumber: "0484 xxx 70 01", managerName: "Hakan Acar" },
        { name: "Kilis", address: "Meydan Caddesi, Merkez", city: "Kilis", phoneNumber: "0348 xxx 80 01", managerName: "Gül Yavuz" },
        { name: "Şanlıurfa", address: "Balıklıgöl Yanı, Haliliye", city: "Şanlıurfa", phoneNumber: "0414 xxx 90 01", managerName: "Murat Kaplan" },
        { name: "Nizip", address: "Cumhuriyet Meydanı, Nizip", city: "Gaziantep", phoneNumber: "0342 xxx 91 01", managerName: "Esra Taş" },
      ];

      const branches = await Promise.all(branchData.map(b => storage.createBranch(b)));

      // Create HQ users
      const hqUserData = [
        { username: "muhasebe", email: "muhasebe@dospresso.com", firstName: "Zeynep", lastName: "Çelik", role: "muhasebe" },
        { username: "satinalma", email: "satinalma@dospresso.com", firstName: "Can", lastName: "Arslan", role: "satinalma" },
        { username: "coach", email: "coach@dospresso.com", firstName: "Elif", lastName: "Yıldız", role: "coach" },
        { username: "teknik", email: "teknik@dospresso.com", firstName: "Burak", lastName: "Şahin", role: "teknik" },
        { username: "destek", email: "destek@dospresso.com", firstName: "Selin", lastName: "Öztürk", role: "destek" },
        { username: "fabrika", email: "fabrika@dospresso.com", firstName: "Emre", lastName: "Aydın", role: "fabrika" },
        { username: "yatirimci-hq", email: "yatirimci@dospresso.com", firstName: "Deniz", lastName: "Koç", role: "yatirimci_hq" },
      ];

      const hqUsers = await Promise.all(
        hqUserData.map(u => storage.createUser({ ...u, hashedPassword, branchId: null }))
      );

      // Create branch users (1 supervisor, 2-3 baristas, 1-2 stajyer per branch)
      const supervisorNames = ["Ahmet", "Mehmet", "Ali", "Mustafa", "Hasan", "Ayşe", "Fatma", "Elif", "Zeynep", "Selin", "Can", "Emre", "Burak", "Murat", "Deniz", "Esra", "Gül", "Sevgi", "Hakan"];
      const baristaNames = ["Furkan", "Cem", "Ömer", "Yusuf", "İbrahim", "Merve", "Simge", "Dilara", "Beyza", "Ecrin", "Berkay", "Kaan", "Enes", "Oğuz", "Serkan", "Gizem", "Damla", "Ebru", "Tuba", "İrem", "Bora", "Barış", "Taner", "Koray"];
      const stajyerNames = ["Kerem", "Arda", "Doruk", "Emir", "Berat", "Defne", "Ela", "Mira", "Zehra", "Nehir", "Kuzey", "Atlas", "Çınar", "Alp", "Ege", "Azra", "Lara", "Derin", "Aslı", "Pelin"];
      const lastNames = ["Yılmaz", "Demir", "Şahin", "Kaya", "Arslan", "Yıldız", "Öztürk", "Aydın", "Çelik", "Kurt", "Koç", "Erdoğan", "Yaman", "Polat", "Acar", "Yavuz", "Kaplan", "Taş"];

      const branchUserPromises: Promise<any>[] = [];
      branches.forEach((branch, branchIndex) => {
        const branchPrefix = branch.name.toLowerCase().replace(/\s+/g, '-');
        
        // 1 Supervisor
        branchUserPromises.push(
          storage.createUser({
            username: `${branchPrefix}-supervisor`,
            hashedPassword,
            email: `${branchPrefix}.supervisor@dospresso.com`,
            firstName: supervisorNames[branchIndex % supervisorNames.length],
            lastName: lastNames[branchIndex % lastNames.length],
            role: "supervisor",
            branchId: branch.id,
            hireDate: new Date(2024, 0, 1 + branchIndex).toISOString().split('T')[0],
            probationEndDate: null,
          })
        );

        // 2-3 Baristas (alternating between 2 and 3)
        const baristaCount = branchIndex % 2 === 0 ? 3 : 2;
        for (let i = 0; i < baristaCount; i++) {
          branchUserPromises.push(
            storage.createUser({
              username: `${branchPrefix}-barista${i + 1}`,
              hashedPassword,
              email: `${branchPrefix}.barista${i + 1}@dospresso.com`,
              firstName: baristaNames[(branchIndex + i) % baristaNames.length],
              lastName: lastNames[branchIndex % lastNames.length],
              role: "barista",
              branchId: branch.id,
              hireDate: new Date(2024, 2, 1 + branchIndex + i * 5).toISOString().split('T')[0],
              probationEndDate: null,
            })
          );
        }

        // 1-2 Stajyer (alternating between 1 and 2)
        const stajyerCount = branchIndex % 3 === 0 ? 2 : 1;
        for (let i = 0; i < stajyerCount; i++) {
          branchUserPromises.push(
            storage.createUser({
              username: `${branchPrefix}-stajyer${i + 1}`,
              hashedPassword,
              email: `${branchPrefix}.stajyer${i + 1}@dospresso.com`,
              firstName: stajyerNames[(branchIndex + i) % stajyerNames.length],
              lastName: lastNames[branchIndex % lastNames.length],
              role: "stajyer",
              branchId: branch.id,
              hireDate: new Date(2024, 10, 1 + branchIndex + i * 3).toISOString().split('T')[0],
              probationEndDate: new Date(2025, 4, 1).toISOString().split('T')[0], // May 2025
            })
          );
        }
      });

      const branchUsers = await Promise.all(branchUserPromises);

      // Create checklists
      const checklists = await Promise.all([
        storage.createChecklist({
          title: "Açılış Prosedürü",
          description: "Sabah açılış rutini",
          frequency: "daily",
          category: "opening",
        }),
        storage.createChecklist({
          title: "Kapanış Prosedürü",
          description: "Gün sonu kapanış rutini",
          frequency: "daily",
          category: "closing",
        }),
        storage.createChecklist({
          title: "Haftalık Temizlik",
          description: "Ekipman derin temizliği",
          frequency: "weekly",
          category: "cleaning",
        }),
      ]);

      // Create knowledge base articles
      await storage.createArticle({
        title: "Espresso Makine Kalibrasyonu",
        category: "maintenance",
        content: "# Espresso Makine Kalibrasyonu\n\nDetaylı kalibrasyon rehberi...",
        tags: ["espresso", "kalibrasyon", "bakım"],
        isPublished: true,
      });

      await storage.createArticle({
        title: "Cappuccino Tarifi",
        category: "recipe",
        content: "# Cappuccino Tarifi\n\nDOSPRESSO standardı cappuccino hazırlama...",
        tags: ["cappuccino", "tarif"],
        isPublished: true,
      });

      // Create equipment for each branch (8 types × 3 branches = 24 equipment)
      const { EQUIPMENT_TYPES, EQUIPMENT_METADATA } = await import('@shared/schema');
      const equipmentTypes = Object.values(EQUIPMENT_TYPES);
      const equipmentPromises: Promise<any>[] = [];

      // Purchase date: 1 year ago
      const purchaseDateMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const purchaseDate = new Date(purchaseDateMs).toISOString().split('T')[0];
      // Warranty: 2 years from purchase
      const warrantyEndDate = new Date(purchaseDateMs + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      branches.forEach((branch, branchIndex) => {
        equipmentTypes.forEach((type, typeIndex) => {
          const metadata = EQUIPMENT_METADATA[type];
          
          // Calculate next maintenance date based on purchase date + interval
          const nextMaintenanceDate = new Date(purchaseDateMs + metadata.maintenanceInterval * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          equipmentPromises.push(
            storage.createEquipment({
              branchId: branch.id,
              equipmentType: type,
              serialNumber: `${type.toUpperCase()}-${branchIndex + 1}-${typeIndex + 1}-${Date.now()}`,
              purchaseDate,
              warrantyEndDate,
              maintenanceResponsible: metadata.maintenanceResponsible,
              faultProtocol: metadata.faultProtocol,
              maintenanceIntervalDays: metadata.maintenanceInterval,
              nextMaintenanceDate,
              notes: `${metadata.nameTr} - ${branch.name}`,
              isActive: true,
            })
          );
        });
      });

      const equipmentItems = await Promise.all(equipmentPromises);

      res.json({
        success: true,
        message: "Demo data seeded successfully",
        data: {
          branches: branches.length,
          hqUsers: hqUsers.length,
          branchUsers: branchUsers.length,
          checklists: checklists.length,
          equipment: equipmentItems.length,
        }
      });

      console.log("✅ Demo data seed completed!");
    } catch (error) {
      console.error("❌ Seed failed:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Seed failed" });
    }
  });

  // Message Routes
  // Get user's inbox messages
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: userId, role, branchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'messages', 'view')) {
        return res.status(403).json({ message: "Mesajlara erişim yetkiniz yok" });
      }

      const inbox = await storage.getMessages(userId, role, branchId);
      res.json(inbox);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Mesajlar yüklenirken hata oluştu" });
    }
  });

  // Get unread message count
  app.get('/api/messages/unread-count', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: userId, role } = user;

      const count = await storage.getUnreadCount(userId, role);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Okunmamış mesaj sayısı alınamadı" });
    }
  });

  // Send a message
  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id: senderId, role, branchId } = user;

      // Permission check
      if (!hasPermission(role as UserRoleType, 'messages', 'create')) {
        return res.status(403).json({ message: "Mesaj gönderme yetkiniz yok" });
      }

      const { recipientId, recipientRole, subject, body, type } = req.body;

      // Validation
      if (!subject || !body || !type) {
        return res.status(400).json({ message: "Konu, içerik ve tip gerekli" });
      }

      if (!recipientId && !recipientRole) {
        return res.status(400).json({ message: "Alıcı ID veya rol belirtilmeli" });
      }

      // Enforce XOR: exactly one of recipientId or recipientRole must be set
      if (recipientId && recipientRole) {
        return res.status(400).json({ message: "recipientId ve recipientRole birlikte kullanılamaz" });
      }

      // Authorization check for Supervisor
      if (role === 'supervisor') {
        // Supervisor can only message their own branch staff + HQ roles
        if (recipientId) {
          const recipient = await storage.getUserById(recipientId);
          if (!recipient) {
            return res.status(404).json({ message: "Alıcı bulunamadı" });
          }

          // Check if recipient is in same branch OR is HQ role
          const isHQRole = !recipient.branchId;
          const isSameBranch = recipient.branchId === branchId;

          if (!isHQRole && !isSameBranch) {
            return res.status(403).json({ message: "Bu kullanıcıya mesaj gönderme yetkiniz yok" });
          }
        }

        if (recipientRole) {
          // Supervisor can only broadcast to HQ roles
          const hqRoles = ['admin', 'coach', 'muhasebe', 'satinalma', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
          if (!hqRoles.includes(recipientRole)) {
            return res.status(403).json({ message: "Bu role mesaj gönderme yetkiniz yok" });
          }
        }
      }

      const newMessage = await storage.createMessage({
        senderId,
        recipientId: recipientId || null,
        recipientRole: recipientRole || null,
        subject,
        body,
        type,
        isRead: false,
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Mesaj gönderilirken hata oluştu" });
    }
  });

  // Mark message as read
  app.patch('/api/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const messageId = parseInt(req.params.id);

      // Verify message exists and user is recipient
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Mesaj bulunamadı" });
      }

      if (message.recipientId !== user.id) {
        return res.status(403).json({ message: "Bu mesajı okuma yetkiniz yok" });
      }

      await storage.markMessageAsRead(messageId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Mesaj güncellenirken hata oluştu" });
    }
  });

  startReminderSystem();

  const httpServer = createServer(app);
  return httpServer;
}
