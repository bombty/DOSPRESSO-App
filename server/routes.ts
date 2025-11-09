import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./jwtAuth";
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
  insertEmployeeWarningSchema,
  hasPermission,
  type UpdateUser,
  type UserRoleType
} from "@shared/schema";
import { analyzeTaskPhoto, analyzeFaultPhoto, generateArticleEmbeddings, generateEmbedding, answerQuestionWithRAG } from "./ai";
import { startReminderSystem } from "./reminders";

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

  app.post('/api/branches', isAuthenticated, async (req, res) => {
    try {
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      await storage.deleteBranch(id);
      res.json({ message: "Branch deleted successfully" });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
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
      const userId = req.user.id;
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

  app.post('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
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
      const userId = req.user.id;
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

  app.post('/api/faults/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      const userId = req.user.id; // For rate limiting
      
      const fault = await storage.updateFault(id, { photoUrl });
      if (!fault) {
        return res.status(404).json({ message: "Fault not found" });
      }

      if (photoUrl) {
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
        res.json(fault);
      }
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

      // Branch filtering for supervisor/coach
      let branchFilter: number | undefined;
      if (role === 'supervisor' && userBranchId) {
        // Supervisor can only see their own branch
        branchFilter = userBranchId;
      } else if (role === 'coach' || role === 'admin') {
        // Coach/Admin can optionally filter by branchId query param
        branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      }

      const employees = await storage.getAllEmployees(branchFilter);
      
      // Sanitize: Remove hashedPassword from response
      const sanitized = employees.map(({ hashedPassword, ...employee }) => employee);
      res.json(sanitized);
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

      // Get employee
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Branch access check for supervisor
      if (role === 'supervisor' && employee.branchId !== userBranchId) {
        return res.status(403).json({ message: "Bu çalışana erişim yetkiniz yok" });
      }

      // Sanitize: Remove hashedPassword from response
      const { hashedPassword, ...sanitizedEmployee } = employee;
      res.json(sanitizedEmployee);
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

      // Get employee
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Branch access check for supervisor (coach has access to all branches)
      if (role === 'supervisor' && employee.branchId !== userBranchId) {
        return res.status(403).json({ message: "Bu çalışanı düzenleme yetkiniz yok" });
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
          filteredUpdates[field] = parsed.data[field];
        }
      }

      // Check if there are any valid updates
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ message: "Güncellenecek geçerli alan bulunamadı" });
      }

      // Update employee
      const updated = await storage.updateUser(employeeId, filteredUpdates);
      
      // Sanitize: Remove hashedPassword from response
      const { hashedPassword, ...sanitizedUpdated } = updated;
      res.json(sanitizedUpdated);
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

      // Get employee
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Branch access check for supervisor
      if (role === 'supervisor' && employee.branchId !== userBranchId) {
        return res.status(403).json({ message: "Bu çalışanın uyarılarına erişim yetkiniz yok" });
      }

      const warnings = await storage.getEmployeeWarnings(employeeId);
      res.json(warnings);
    } catch (error) {
      console.error("Error fetching employee warnings:", error);
      res.status(500).json({ message: "Uyarı kayıtları yüklenirken hata oluştu" });
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

      // Branch scoping for supervisor: force branchId to their own branch
      let employeeData = parsed.data;
      if (role === 'supervisor') {
        if (!userBranchId) {
          return res.status(400).json({ message: "Supervisor branchId eksik" });
        }
        // Override branchId to supervisor's branch (prevent creating employee in other branches)
        employeeData = { ...parsed.data, branchId: userBranchId };
      }

      // Create employee (storage layer handles password hashing if provided)
      const newEmployee = await storage.createUser(employeeData);
      
      // Sanitize: Remove hashedPassword from response
      const { hashedPassword, ...sanitizedEmployee } = newEmployee;
      res.status(201).json(sanitizedEmployee);
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

      // Branch access check for supervisor
      if (role === 'supervisor' && employee.branchId !== userBranchId) {
        return res.status(403).json({ message: "Bu çalışana uyarı verme yetkiniz yok" });
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

      // Create branches
      const branches = await Promise.all([
        storage.createBranch({
          name: "Kadıköy Şubesi",
          address: "Kadıköy Moda Caddesi No:45",
          city: "İstanbul",
          phoneNumber: "0216 xxx xx 01",
          managerName: "Ahmet Yılmaz",
        }),
        storage.createBranch({
          name: "Beşiktaş Şubesi",
          address: "Beşiktaş Barbaros Bulvarı No:102",
          city: "İstanbul",
          phoneNumber: "0212 xxx xx 02",
          managerName: "Mehmet Kaya",
        }),
        storage.createBranch({
          name: "Üsküdar Şubesi",
          address: "Üsküdar Çarşı Caddesi No:23",
          city: "İstanbul",
          phoneNumber: "0216 xxx xx 03",
          managerName: "Ayşe Demir",
        }),
      ]);

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

      // Create branch users
      const branchRoles = ["supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer"];
      const firstNames = ["Ali", "Fatma", "Mehmet", "Ayşe", "Mustafa"];
      const branchLastNames = ["Yılmaz", "Demir", "Şahin"];

      const branchUserPromises: Promise<any>[] = [];
      branches.forEach((branch, branchIndex) => {
        const branchPrefix = branch.name.split(" ")[0].toLowerCase();
        branchRoles.forEach((role, roleIndex) => {
          branchUserPromises.push(
            storage.createUser({
              username: `${branchPrefix}-${role}`,
              hashedPassword,
              email: `${branchPrefix}.${role}@dospresso.com`,
              firstName: firstNames[roleIndex],
              lastName: branchLastNames[branchIndex],
              role,
              branchId: branch.id,
              hireDate: new Date(2024, 0, 1 + branchIndex * 10 + roleIndex).toISOString().split('T')[0],
              probationEndDate: (role === "stajyer" || role === "bar_buddy")
                ? new Date(2025, 2, 1).toISOString().split('T')[0]
                : null,
            })
          );
        });
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
      await storage.createKnowledgeBaseArticle({
        title: "Espresso Makine Kalibrasyonu",
        category: "maintenance",
        content: "# Espresso Makine Kalibrasyonu\n\nDetaylı kalibrasyon rehberi...",
        tags: ["espresso", "kalibrasyon", "bakım"],
        isPublished: true,
      });

      await storage.createKnowledgeBaseArticle({
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

  startReminderSystem();

  const httpServer = createServer(app);
  return httpServer;
}
