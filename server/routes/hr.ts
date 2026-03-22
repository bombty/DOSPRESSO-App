import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { hasPermission, resolvePermissionScope, applyScopeFilter, type UserRoleType } from "../permission-service";
import { createAuditEntry, getAuditContext } from "../audit";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, isNotNull, ne, max, min } from "drizzle-orm";
import { sendNotificationEmail, sendEmployeeOfMonthEmail } from "../email";
import { sanitizeUser, sanitizeUsers, sanitizeUserForRole, sanitizeUsersForRole } from "../security";
import { handleApiError } from "./helpers";
import { checkDataLock } from "../services/data-lock";
import bcrypt from "bcrypt";
import multer from "multer";
import { z } from "zod";
import { generateTrainingModule, processUploadedFile, evaluateBranchPerformance } from "../ai";
import {
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  FACTORY_FLOOR_ROLES,
  users,
  branches,
  tasks,
  shifts,
  badges,
  userBadges,
  equipmentFaults,
  shiftAttendance,
  trainingModules,
  leaveRequests,
  overtimeRequests,
  employeeSalaries,
  salaryDeductionTypes,
  salaryDeductions,
  monthlyPayrolls,
  interviews,
  interviewResponses,
  interviewQuestions,
  jobApplications,
  jobPositions,
  onboardingDocuments,
  onboardingTemplates,
  onboardingTemplateSteps,
  employeeOnboarding,
  employeeOnboardingAssignments,
  employeeOnboardingProgress,
  monthlyEmployeePerformance,
  employeeOfMonthWeights,
  employeeOfMonthAwards,
  insertTrainingModuleSchema,
  insertModuleVideoSchema,
  insertModuleQuizSchema,
  insertUserQuizAttemptSchema,
  insertTrainingAssignmentSchema,
  insertOnboardingDocumentSchema,
  insertOnboardingTemplateSchema,
  insertOnboardingTemplateStepSchema,
  insertEmployeeOnboardingTaskSchema,
  insertEmployeeOnboardingAssignmentSchema,
  insertEmployeeSalarySchema,
  insertSalaryDeductionTypeSchema,
  insertSalaryDeductionSchema,
  insertEmployeeWarningSchema,
  insertUserSchema,
  updateUserSchema,
  type UpdateUser,
  employeeDocuments,
  disciplinaryReports,
  notifications,
} from "../../shared/schema";

class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

function ensurePermission(user: any, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

const uploadStorage = multer.memoryStorage();
const trainingFileUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü. PDF, JPEG, PNG veya HEIC yükleyin.'));
    }
  }
});

const router = Router();


  router.get('/api/performance', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const isHQ = isHQRole(user.role as UserRoleType);
      
      // Branch users can only see their own branch performance
      let branchId: number | undefined;
      if (isHQ) {
        // HQ can see all branches or filter by specific branch
        branchId = req.query.branchId && req.query.branchId !== 'all' 
          ? parseInt(req.query.branchId as string) 
          : undefined;
      } else {
        // Branch users: force to their own branch only
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        branchId = user.branchId;
      }
      
      // First try stored metrics
      const storedMetrics = await storage.getPerformanceMetrics(branchId);
      
      // If no stored metrics, calculate real-time from database
      if (storedMetrics.length === 0) {
        const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(200) : await db.select().from(tasks).limit(200));
        const faultList = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(100) : await db.select().from(equipmentFaults).limit(100));
        
        const tasksTotal = taskList.length;
        const tasksCompleted = taskList.filter((t) => t.status === 'completed').length;
        const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
        
        const faultsReported = faultList.length;
        const faultsResolved = faultList.filter((f) => f.stage === 'resolved').length;
        
        // Create a synthetic performance metric from real data
        const now = new Date();
        const realTimeMetric = {
          id: 1,
          branchId: branchId || null,
          date: now.toISOString().split('T')[0],
          completionRate,
          tasksCompleted,
          tasksTotal,
          averageAiScore: 0,
          taskScore: Math.round(completionRate * 0.4),
          photoScore: 0,
          timeScore: 0,
          supervisorScore: 0,
          faultsReported,
          faultsResolved,
          notes: 'Gerçek zamanlı hesaplanmış'
        };
        
        return res.json([realTimeMetric]);
      }
      
      res.json(storedMetrics);
    } catch (error: unknown) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Performans metrikleri alınırken hata oluştu" });
    }
  });

  router.get('/api/performance/latest', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics();
      const latest = metrics.slice(0, 10);
      res.json(latest);
    } catch (error: unknown) {
      console.error("Error fetching latest performance metrics:", error);
      res.status(500).json({ message: "Son performans metrikleri alınırken hata oluştu" });
    }
  });

  // ========================================
  // EMPLOYEE/HR ROUTES
  // ========================================

  // Get employees list (with permissions and branch filtering)
  router.get('/api/employees', isAuthenticated, async (req, res) => {
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
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUsersForRole(employees, role as UserRoleType));
    } catch (error: unknown) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Çalışanlar yüklenirken hata oluştu" });
    }
  });

  // Get terminated employees list (ayrılan personeller)
  router.get('/api/employees/terminated', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;

      // Permission check - only HQ and admin can see terminated employees
      if (!isHQRole(role as UserRoleType) && role !== 'admin') {
        return res.status(403).json({ message: "Ayrılan personel listesine erişim yetkiniz yok" });
      }

      // Optional branch filter
      const branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;

      const terminatedEmployees = await storage.getTerminatedEmployees(branchFilter);
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUsersForRole(terminatedEmployees, role as UserRoleType));
    } catch (error: unknown) {
      console.error("Error fetching terminated employees:", error);
      res.status(500).json({ message: "Ayrılan personeller yüklenirken hata oluştu" });
    }
  });

  // Get single employee (with permissions and branch filtering)
  router.get('/api/employees/:id', isAuthenticated, async (req, res) => {
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

      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUserForRole(employee, role as UserRoleType));
    } catch (error: unknown) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Çalışan bilgileri yüklenirken hata oluştu" });
    }
  });

  // Update employee (with field-level restrictions)
  router.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role, branchId: userBranchId } = user;
      const employeeId = req.params.id;

      // HQ roles that can edit employees (full access)
      const hqEditRoles = ['admin', 'muhasebe', 'muhasebe_ik', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      
      // Only HQ roles can edit employee records
      if (!hqEditRoles.includes(role)) {
        return res.status(403).json({ message: "Çalışan düzenleme yetkiniz yok. Bu işlem sadece HQ personeli tarafından yapılabilir." });
      }

      // Get employee (HQ roles can access all employees)
      const allowedBranchId = null;
      const employee = await storage.getEmployeeForBranch(employeeId, allowedBranchId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      // Validate base schema
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      // HQ roles can update all fields (supervisors already blocked above)
      const allowedFields = Object.keys(parsed.data) as (keyof UpdateUser)[];

      // Filter updates to only allowed fields
      const filteredUpdates: Partial<UpdateUser> = {};
      for (const field of allowedFields) {
        if (parsed.data[field] !== undefined) {
          filteredUpdates[field] = parsed.data[field] ;
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
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUserForRole(updated, role as UserRoleType));
    } catch (error: unknown) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Çalışan güncellenirken hata oluştu" });
    }
  });

  // Get employee warnings (with permissions and branch filtering)
  router.get('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching employee warnings:", error);
      res.status(500).json({ message: "Uyarı kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee training progress (with permissions and branch filtering)
  router.get('/api/employees/:id/training', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching employee training:", error);
      res.status(500).json({ message: "Eğitim bilgileri yüklenirken hata oluştu" });
    }
  });

  // Get employee tasks (with permissions and branch filtering)
  router.get('/api/employees/:id/tasks', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching employee tasks:", error);
      res.status(500).json({ message: "Görev kayıtları yüklenirken hata oluştu" });
    }
  });

  // Get employee detail (orchestrated endpoint with all metrics)
  router.get('/api/employees/:id/detail', isAuthenticated, async (req, res) => {
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
      const completedTasks = allTasks.filter(t => t.status === 'onaylandi');
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

      // Sanitize employee data - HQ users get more details
      res.json({
        employee: sanitizeUserForRole(employee, role as UserRoleType),
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
    } catch (error: unknown) {
      console.error("Error fetching employee detail:", error);
      res.status(500).json({ message: "Çalışan detayları yüklenirken hata oluştu" });
    }
  });

  // Create new employee (admin/coach/supervisor with branch scoping)
  router.post('/api/employees', isAuthenticated, async (req, res) => {
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
        employeeData = { ...parsed.data, branchId };
      }

      // Validate role-branch compatibility
      const HQ_BRANCH_ID = 23;
      const FACTORY_BRANCH_ID = 24;
      const newEmployeeRole = employeeData.role as string;
      const targetBranchId = employeeData.branchId;

      if (targetBranchId === HQ_BRANCH_ID && isBranchRole(newEmployeeRole as UserRoleType)) {
        return res.status(400).json({ message: "Merkez Ofis (HQ) için şube rolü atanamaz. Lütfen HQ uyumlu bir rol seçin (Coach, Trainer, Muhasebe vb.)" });
      }
      if (targetBranchId === FACTORY_BRANCH_ID && !isFactoryFloorRole(newEmployeeRole as UserRoleType) && !isHQRole(newEmployeeRole as UserRoleType)) {
        return res.status(400).json({ message: "Fabrika için uygun bir rol seçin (Fabrika Operatör, Fabrika Sorumlu, Fabrika Personel)" });
      }
      if (targetBranchId && targetBranchId !== HQ_BRANCH_ID && targetBranchId !== FACTORY_BRANCH_ID && !isBranchRole(newEmployeeRole as UserRoleType)) {
        return res.status(400).json({ message: "Şube personeli için şube rolü seçilmelidir (Barista, Supervisor vb.)" });
      }

      // HQ roles don't need branchId, set to null if creating HQ personnel
      if (isHQRole(newEmployeeRole as UserRoleType) && targetBranchId === HQ_BRANCH_ID) {
        employeeData = { ...employeeData, branchId: null as any };
      }

      // Create employee (storage layer handles password hashing if provided)
      const newEmployee = await storage.createUser(employeeData);
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.status(201).json(sanitizeUserForRole(newEmployee, role as UserRoleType));
    } catch (error: unknown) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Çalışan eklenirken hata oluştu" });
    }
  });

  // Delete employee (admin/coach only - no branch restriction for coach)
  router.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
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

      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, employeeId));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "users",
        resourceId: String(employeeId),
        details: { softDelete: true },
      });
      res.json({ message: "Çalışan silindi", deletedId: employeeId });
    } catch (error: unknown) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Çalışan silinirken hata oluştu" });
    }
  });

  // Reset employee password (admin/coach only)
  router.post('/api/employees/:id/reset-password', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { role } = user;
      const employeeId = req.params.id;

      // Permission check (admin/coach only can reset passwords)
      if (role !== 'admin' && role !== 'coach') {
        return res.status(403).json({ message: "Şifre sıfırlama yetkiniz yok" });
      }

      // Check if employee exists
      const employee = await storage.getUserById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Çalışan bulunamadı" });
      }

      const resetPasswordSchema = z.object({
        newPassword: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
          .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
          .regex(/[!@#$%^&*._-]/, "Şifre en az bir özel karakter içermelidir (!@#$%^&*._-)"),
      });

      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Geçersiz şifre", 
          errors: parsed.error.errors 
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

      await storage.updateUser(employeeId, { hashedPassword, mustChangePassword: true });

      // Audit log: Record password reset event
      await storage.createAuditLog({
        userId: user.id, // Who performed the action
        action: 'password_reset',
        resource: 'users',
        resourceId: employeeId, // Target user
        details: {
          performedByRole: role,
          targetUserId: employeeId,
          timestamp: new Date().toISOString(),
        },
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ message: "Şifre başarıyla sıfırlandı" });
    } catch (error: unknown) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Şifre sıfırlanırken hata oluştu" });
    }
  });

  router.post('/api/me/change-password', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Mevcut şifre ve yeni şifre gereklidir" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalıdır" });
      }

      const [dbUser] = await db.select().from(users)
        .where(eq(users.id, reqUser.id));

      if (!dbUser) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      if (!dbUser.hashedPassword) {
        return res.status(400).json({ error: "Bu hesap için şifre değiştirme desteklenmiyor" });
      }

      const isValid = await bcrypt.compare(currentPassword, dbUser.hashedPassword);
      if (!isValid) {
        return res.status(401).json({ error: "Mevcut şifre yanlış" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users)
        .set({ hashedPassword, mustChangePassword: false, updatedAt: new Date() })
        .where(eq(users.id, reqUser.id));

      await storage.createAuditLog({
        userId: reqUser.id,
        action: 'password_self_change',
        resource: 'users',
        resourceId: reqUser.id,
        details: { timestamp: new Date().toISOString() },
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ success: true, message: "Şifreniz başarıyla değiştirildi" });
    } catch (error) {
      console.error("[Password Change] Error:", error);
      res.status(500).json({ error: "Şifre değiştirme başarısız" });
    }
  });

  router.post('/api/admin/bulk-reset-passwords', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      if (!['admin', 'muhasebe_ik'].includes(reqUser.role)) {
        return res.status(403).json({ error: "Yetkiniz yok" });
      }

      const { branchId, defaultPassword } = req.body;
      if (!defaultPassword || defaultPassword.length < 6) {
        return res.status(400).json({ error: "Varsayılan şifre en az 6 karakter olmalı" });
      }

      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const conditions = [eq(users.isActive, true)];
      if (branchId) {
        conditions.push(eq(users.branchId, Number(branchId)));
      }

      const result = await db.update(users)
        .set({ hashedPassword, mustChangePassword: true, updatedAt: new Date() })
        .where(and(...conditions))
        .returning({ id: users.id });

      await storage.createAuditLog({
        userId: reqUser.id,
        action: 'bulk_password_reset',
        resource: 'users',
        resourceId: branchId ? String(branchId) : 'all',
        details: { count: result.length, branchId, timestamp: new Date().toISOString() },
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({
        success: true,
        message: `${result.length} kullanıcının şifresi sıfırlandı`,
        count: result.length,
      });
    } catch (error) {
      console.error("[Bulk Reset] Error:", error);
      res.status(500).json({ error: "Toplu şifre sıfırlama başarısız" });
    }
  });

  router.get('/api/notification-preferences', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const [dbUser] = await db.select({ notificationPreferences: users.notificationPreferences })
        .from(users).where(eq(users.id, reqUser.id));

      const defaults: Record<string, boolean> = {
        task_overdue: true,
        agent_guidance: true,
        sla_breach: true,
        shift_reminder: true,
        checklist_reminder: true,
        system_announcements: true,
      };

      res.json({ preferences: { ...defaults, ...(dbUser?.notificationPreferences || {}) } });
    } catch (error) {
      console.error("[NotifPrefs] Error:", error);
      res.status(500).json({ error: "Bildirim tercihleri alınamadı" });
    }
  });

  router.patch('/api/notification-preferences', isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user as any;
      const { category, enabled } = req.body;

      if (!category || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Kategori ve durum gerekli" });
      }

      const [dbUser] = await db.select({ notificationPreferences: users.notificationPreferences })
        .from(users).where(eq(users.id, reqUser.id));

      const current = dbUser?.notificationPreferences || {};
      const updated = { ...current, [category]: enabled };

      await db.update(users)
        .set({ notificationPreferences: updated, updatedAt: new Date() })
        .where(eq(users.id, reqUser.id));

      res.json({ success: true, preferences: updated });
    } catch (error) {
      console.error("[NotifPrefs] Error:", error);
      res.status(500).json({ error: "Bildirim tercihi güncellenemedi" });
    }
  });

  // Create employee warning (with permissions and branch filtering)
  router.post('/api/employees/:id/warnings', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error creating employee warning:", error);
      res.status(500).json({ message: "Uyarı kaydedilirken hata oluştu" });
    }
  });

  // ========================================
  // TRAINING SYSTEM ROUTES
  // ========================================

  // Get training progress summary for all users (for İK filters and dashboards)
  router.get('/api/training/progress/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role;

      // Permission check: employees view permission required
      if (!hasPermission(role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Eğitim durumu görüntüleme yetkiniz yok" });
      }

      const summary = await storage.getAllTrainingProgressSummary();
      res.json(summary);
    } catch (error: unknown) {
      console.error("Error fetching training progress summary:", error);
      res.status(500).json({ message: "Eğitim durumu getirilemedi" });
    }
  });

  // Get training modules (published only for users, all for admin/coach/trainer)
  router.get('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const canEditTraining = hasPermission(user.role as any, 'training', 'edit');
      
      let scope: string | undefined;
      if (!canEditTraining) {
        const { isFactoryFloorRole } = await import('@shared/schema');
        const factoryManagerRoles = ['fabrika_mudur', 'fabrika_sorumlu'];
        const isFactory = isFactoryFloorRole(user.role as any) || factoryManagerRoles.includes(user.role as string);
        scope = isFactory ? 'factory' : 'branch';
      }
      
      const modules = await storage.getTrainingModules(canEditTraining ? undefined : true, scope);
      
      if (canEditTraining) {
        res.json(modules);
        return;
      }
      
      const userRole = (user.role as string).toLocaleLowerCase('tr-TR');
      const filtered = modules.filter((m) => {
        if (!m.targetRoles || m.targetRoles.length === 0) return true;
        return m.targetRoles.includes(userRole);
      });
      
      res.json(filtered);
    } catch (error: unknown) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Eğitim modülleri alınırken hata oluştu" });
    }
  });

  // Get single training module with all content
  router.get('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      const module = await storage.getTrainingModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      // Authorization: Only admin/coach can see unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module" });
      }

      // Module already contains all JSONB fields (steps, scenarioTasks, supervisorChecklist, learningObjectives)
      res.json(module);
    } catch (error: unknown) {
      console.error("Error fetching training module:", error);
      res.status(500).json({ message: "Eğitim modülü alınırken hata oluştu" });
    }
  });

  // Create training module (admin/coach/trainer only)
  router.post('/api/training/modules', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'create')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const validated = insertTrainingModuleSchema.parse(req.body);
      const module = await storage.createTrainingModule({
        ...validated,
        createdBy: user.id,
      });
      
      res.status(201).json(module);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error creating training module:", error);
      res.status(500).json({ message: "Eğitim modülü oluşturulurken hata oluştu" });
    }
  });

  // Update training module (admin/coach/trainer only)
  router.put('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertTrainingModuleSchema.partial().parse(req.body);
      const updated = await storage.updateTrainingModule(moduleId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error updating training module:", error);
      res.status(500).json({ message: "Eğitim modülü güncellenirken hata oluştu" });
    }
  });

  // Delete training module (admin/coach/trainer only)
  router.delete('/api/training/modules/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'delete')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      await db.update(trainingModules).set({ deletedAt: new Date() }).where(eq(trainingModules.id, moduleId));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "training_modules",
        resourceId: String(moduleId),
        details: { softDelete: true },
      });
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ message: "Eğitim modülü silinirken hata oluştu" });
    }
  });

  // Bulk import training modules from JSON (admin/coach only)
  router.post('/api/training/import', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can import modules" });
      }

      const { roles } = req.body; // Array of role objects from JSON
      if (!roles || !Array.isArray(roles)) {
        const exampleFormat = {
          "roles": [
            {
              "name": "Stajyer",
              "modules": [
                {
                  "title": "Modül Başlığı",
                  "code": "MOD-001",
                  "description": "Modül açıklaması",
                  "estimated_duration_min": 30,
                  "learning_objectives": ["Hedef 1", "Hedef 2"],
                  "steps": [{ "step_number": 1, "title": "Adım", "content": "İçerik", "media_suggestions": [] }],
                  "quiz": [{ "question_id": "q1", "question_type": "mcq", "question_text": "Soru?", "options": ["A", "B"], "correct_option_index": 0 }],
                  "scenario_tasks": [{ "title": "Senaryo", "description": "Açıklama" }],
                  "supervisor_checklist": [{ "title": "Kontrol", "description": "Açıklama" }]
                }
              ]
            }
          ]
        };
        return res.status(400).json({ 
          message: "Geçersiz JSON format - 'roles' array'ı eksik. Lütfen şu formatı kullanın:",
          exampleFormat 
        });
      }

      const createdModules = [];
      
      for (const role of roles) {
        if (!role.modules || !Array.isArray(role.modules)) continue;
        
        for (const moduleData of role.modules) {
          try {
            const module = await storage.createTrainingModule({
              title: moduleData.title,
              description: moduleData.description,
              code: moduleData.code,
              slug: moduleData.code?.toLocaleLowerCase('tr-TR'),
              category: role.name?.toLocaleLowerCase('tr-TR'),
              level: "beginner",
              estimatedDuration: moduleData.estimated_duration_min || 30,
              isPublished: false,
              requiredForRole: [role.name],
              learningObjectives: moduleData.learning_objectives || [],
              steps: (moduleData.steps || []).map((s) => ({
                stepNumber: s.step_number,
                title: s.title,
                content: s.content,
                mediaSuggestions: s.media_suggestions,
              })),
              scenarioTasks: (moduleData.scenario_tasks || []).map((sc) => ({
                scenarioId: sc.scenario_id,
                title: sc.title,
                description: sc.description,
                expectedActions: sc.expected_actions,
              })),
              supervisorChecklist: moduleData.supervisor_checklist || [],
              quiz: (moduleData.quiz || []).map((q) => ({
                questionId: q.question_id,
                questionType: q.question_type,
                questionText: q.question_text,
                options: q.options,
                correctOptionIndex: q.correct_option_index,
              })),
              tags: moduleData.tags || [],
              createdBy: user.id,
            });
            createdModules.push(module);
          } catch (err) {
            console.error(`Error importing module ${moduleData.code}:`, err);
          }
        }
      }

      res.json({ 
        success: true, 
        imported: createdModules.length, 
        modules: createdModules 
      });
    } catch (error: unknown) {
      console.error("Error importing training modules:", error);
      res.status(500).json({ message: "Eğitim modülleri içe aktarılırken hata oluştu" });
    }
  });

  // AI-powered training module generation (admin/coach only)
  router.post('/api/training/generate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler modül oluşturabilir" });
      }

      const { inputText, roleLevel, estimatedMinutes } = req.body;
      
      if (!inputText || typeof inputText !== 'string' || inputText.trim().length < 50) {
        return res.status(400).json({ 
          message: "Lütfen en az 50 karakter içeren bir metin girin" 
        });
      }

      if (!roleLevel) {
        return res.status(400).json({ message: "Rol seviyesi seçilmedi" });
      }

      const duration = estimatedMinutes || 15;
      
      
      const generatedModule = await generateTrainingModule(
        inputText.trim(),
        roleLevel,
        duration,
        user.id
      );

      res.json({
        success: true,
        module: generatedModule
      });
    } catch (error: unknown) {
      console.error("AI Module generation error:", error);
      res.status(500).json({ 
        message: error.message || "Modül oluşturma başarısız" 
      });
    }
  });

  // Save AI-generated module to database (admin/coach only)
  router.post('/api/training/generate/save', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler modül kaydedebilir" });
      }

      const { module, roleLevel } = req.body;
      
      if (!module || !module.title) {
        return res.status(400).json({ message: "Geçersiz modül verisi" });
      }

      const savedModule = await storage.createTrainingModule({
        title: module.title,
        description: module.description,
        level: "beginner",
        estimatedDuration: module.estimatedDuration || 15,
        isPublished: false,
        requiredForRole: roleLevel ? [roleLevel] : [],
        learningObjectives: module.learningObjectives || [],
        steps: module.steps || [],
        quiz: module.quiz || [],
        scenarioTasks: module.scenarioTasks || [],
        supervisorChecklist: module.supervisorChecklist || [],
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        module: savedModule
      });
    } catch (error: unknown) {
      console.error("Error saving AI-generated module:", error);
      res.status(500).json({ message: "Modül kaydedilemedi" });
    }
  });

  // General academy image upload - returns optimized URL without needing module ID
  router.post('/api/training/upload-image', isAuthenticated, trainingFileUpload.single('file'), async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }

      const { optimizeImageForGallery } = await import('./ai');
      const optimized = await optimizeImageForGallery(file.buffer, file.mimetype);

      const timestamp = Date.now();
      const purpose = req.body.purpose || 'general';
      const objectKey = `academy/${purpose}/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}.webp`;

      const url = await storage.uploadFile(objectKey, optimized, 'image/webp');

      res.json({
        success: true,
        url,
        fileName: file.originalname,
        originalSize: file.size,
        optimizedSize: optimized.length,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "UploadAcademyImage");
    }
  });

  // Upload image for module gallery and get optimized URL (admin/coach/trainer only)
  router.post('/api/training/modules/:id/upload-image', isAuthenticated, trainingFileUpload.single('file'), async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }

      const { optimizeImageForGallery } = await import('./ai');
      const optimized = await optimizeImageForGallery(file.buffer, file.mimetype);
      
      // Generate object key for storage
      const timestamp = Date.now();
      const objectKey = `modules/${moduleId}/gallery/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to object storage
      const url = await storage.uploadFile(objectKey, optimized, 'image/webp');
      
      // Add to module gallery
      const module = await storage.getTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const updatedGallery = [
        ...(module.galleryImages || []),
        { url, alt: file.originalname, uploadedAt: timestamp }
      ];

      await storage.updateTrainingModule(moduleId, { galleryImages: updatedGallery });

      res.json({
        success: true,
        url,
        fileName: file.originalname,
        size: optimized.length
      });
    } catch (error: unknown) {
      handleApiError(res, error, "UploadModuleImage");
    }
  });

  // Generate image with AI for module (admin/coach only) - CURRENTLY DISABLED
  router.post('/api/training/modules/:id/generate-image', isAuthenticated, async (req, res) => {
    // AI image generation temporarily disabled due to API configuration
    res.status(503).json({ 
      message: "AI resim oluşturma şu an bakım altında. Lütfen manuel yükleme yapın." 
    });
  });

  // Delete image from module gallery (admin/coach/trainer only)
  router.delete('/api/training/modules/:id/gallery/:imageIndex', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const imageIndex = parseInt(req.params.imageIndex);

      const module = await storage.getTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const updatedGallery = (module.galleryImages || []).filter((_, idx) => idx !== imageIndex);
      await storage.updateTrainingModule(moduleId, { galleryImages: updatedGallery });

      res.json({ success: true });
    } catch (error: unknown) {
      handleApiError(res, error, "DeleteModuleImage");
    }
  });

  // Upload file (PDF/image) and extract text for module generation (admin/coach only)
  router.post('/api/training/generate/upload', isAuthenticated, trainingFileUpload.single('file'), async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler dosya yükleyebilir" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }


      const extractedText = await processUploadedFile(
        file.buffer,
        file.mimetype,
        user.id
      );

      // Validate extracted text has minimum content
      if (!extractedText || extractedText.length < 50) {
        return res.status(400).json({ 
          message: "Dosyadan yeterli metin çıkarılamadı. Lütfen daha fazla içerik içeren bir dosya yükleyin." 
        });
      }

      res.json({
        success: true,
        extractedText,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size
      });
    } catch (error: unknown) {
      console.error("File upload/processing error:", error);
      res.status(500).json({ 
        message: error.message || "Dosya işlenemedi" 
      });
    }
  });

  // Generate learning objectives with AI (admin/coach/trainer only)
  router.post('/api/training/modules/:id/generate-objectives', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const module = await storage.getTrainingModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      // Stub: Return mock objectives (in production, would call OpenAI API)
      const objectives = [
        `${module.title} konusunun temel kavramlarını anlamak`,
        `${module.title} ile ilgili praktik beceriler geliştirmek`,
        `${module.title} uygulamalarında sorun çözebilmek`,
        `${module.title} standartlarına uygun prosedürleri takip etmek`,
      ];

      res.json({ objectives });
    } catch (error: unknown) {
      console.error("Error generating objectives:", error);
      res.status(500).json({ message: "Hedefler oluşturulurken hata oluştu" });
    }
  });


  // Generate sales tips with AI
  router.post('/api/training/modules/:id/generate-sales-tips', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, moduleId));
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const prompt = `Sen bir kahve dükkanı satış eğitmenisin. "${module.title}" konulu eğitim modülü için satış cümleleri ve müşteri soruları/cevapları oluştur.

Modül açıklaması: ${module.description || 'Belirtilmemiş'}

JSON formatında yanıt ver:
{
  "salesTips": [
    {"phrase": "satış cümlesi", "context": "ne zaman kullanılmalı", "emotion": "samimi/heyecanlı/profesyonel"}
  ],
  "customerQA": [
    {"question": "müşteri sorusu", "answer": "ideal cevap"}
  ]
}

En az 5 satış cümlesi ve 5 soru-cevap oluştur. Türkçe olmalı.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content || '{}');

      await db.update(trainingModules)
        .set({ 
          salesTips: parsed.salesTips || [],
          marketingContent: {
            ...(module.marketingContent as object || {}),
            customerQA: parsed.customerQA || [],
          },
          updatedAt: new Date()
        })
        .where(eq(trainingModules.id, moduleId));

      res.json({ success: true, salesTips: parsed.salesTips, customerQA: parsed.customerQA });
    } catch (error: unknown) {
      console.error("Generate sales tips error:", error);
      res.status(500).json({ message: "Satış ipuçları oluşturulamadı" });
    }
  });

  // Generate presentation guide with AI
  router.post('/api/training/modules/:id/generate-presentation', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, moduleId));
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const prompt = `Sen bir kahve dükkanı ürün sunumu uzmanısın. "${module.title}" ürünü için profesyonel sunum rehberi oluştur.

Modül açıklaması: ${module.description || 'Belirtilmemiş'}

DİKKAT: Ürünler genelde donuk veya kuru olarak şubeye gelir. Şubede sıfırdan hazırlanmaz.

JSON formatında yanıt ver:
{
  "servingInstructions": "sunum talimatları (nasıl servis edilmeli)",
  "thawingInstructions": "çözündürme talimatları (varsa, donuk ürün için)",
  "heatingInstructions": "ısıtma talimatları (varsa)",
  "platingTips": "tabak düzenleme ve prezentasyon ipuçları",
  "storageNotes": "saklama koşulları ve raf ömrü",
  "allergenInfo": "olası alerjenler (süt, gluten, yumurta vb.)"
}

Türkçe ve profesyonel olmalı.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content || '{}');

      await db.update(trainingModules)
        .set({ 
          presentationGuide: parsed,
          updatedAt: new Date()
        })
        .where(eq(trainingModules.id, moduleId));

      res.json({ success: true, presentationGuide: parsed });
    } catch (error: unknown) {
      console.error("Generate presentation error:", error);
      res.status(500).json({ message: "Sunum rehberi oluşturulamadı" });
    }
  });

  // Generate marketing content with AI
  router.post('/api/training/modules/:id/generate-marketing', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, moduleId));
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const prompt = `Sen bir kahve dükkanı pazarlama ve satış uzmanısın. "${module.title}" için pazarlama içerikleri oluştur.

Modül açıklaması: ${module.description || 'Belirtilmemiş'}

JSON formatında yanıt ver:
{
  "productStory": "ürünün ilgi çekici hikayesi (2-3 cümle)",
  "socialMediaCaptions": ["instagram/sosyal medya açıklaması 1", "açıklama 2", "açıklama 3"],
  "upsellingPhrases": ["upselling cümlesi 1", "cümle 2", "cümle 3"],
  "targetAudience": "hedef kitle tanımı"
}

Türkçe, samimi ve çağdaş bir dil kullan.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content || '{}');

      const existingMarketing = module.marketingContent as object || {};
      await db.update(trainingModules)
        .set({ 
          marketingContent: {
            ...existingMarketing,
            productStory: parsed.productStory,
            socialMediaCaptions: parsed.socialMediaCaptions,
            upsellingPhrases: parsed.upsellingPhrases,
            targetAudience: parsed.targetAudience,
          },
          updatedAt: new Date()
        })
        .where(eq(trainingModules.id, moduleId));

      res.json({ success: true, marketingContent: parsed });
    } catch (error: unknown) {
      console.error("Generate marketing error:", error);
      res.status(500).json({ message: "Pazarlama içerikleri oluşturulamadı" });
    }
  });

  // Generate roleplay scenarios with AI
  router.post('/api/training/modules/:id/generate-roleplay', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const [module] = await db.select().from(trainingModules).where(eq(trainingModules.id, moduleId));
      
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      const prompt = `Sen bir kahve dükkanı satış eğitmenisin. "${module.title}" için interaktif rol yapma senaryoları oluştur.

Her senaryo farklı bir müşteri tipi olsun: meraklı, kararsız, aceleci, şikayetçi

JSON formatında yanıt ver:
{
  "scenarios": [
    {
      "scenarioId": "benzersiz_id",
      "title": "senaryo başlığı",
      "customerType": "meraklı/kararsız/aceleci/şikayetçi",
      "initialMessage": "müşterinin ilk sorusu veya yorumu",
      "expectedResponses": ["ideal yanıt 1", "alternatif yanıt 2"],
      "tips": ["ipucu 1", "ipucu 2"]
    }
  ]
}

4 farklı senaryo oluştur. Türkçe ve gerçekçi olmalı.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content || '{}');

      await db.update(trainingModules)
        .set({ 
          aiRoleplayScenarios: parsed.scenarios || [],
          updatedAt: new Date()
        })
        .where(eq(trainingModules.id, moduleId));

      res.json({ success: true, scenarios: parsed.scenarios });
    } catch (error: unknown) {
      console.error("Generate roleplay error:", error);
      res.status(500).json({ message: "Senaryolar oluşturulamadı" });
    }
  });

  // Add video to module (admin/coach/trainer only)
  router.post('/api/training/modules/:id/videos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'edit')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleVideoSchema.parse(req.body);
      const video = await storage.createModuleVideo({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(video);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error creating module video:", error);
      res.status(500).json({ message: "Modül videosu oluşturulurken hata oluştu" });
    }
  });

  // Get lessons for module
  router.get('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      
      // Check module exists and authorization (same as module detail endpoint)
      const module = await storage.getTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Modül bulunamadı" });
      }

      // Authorization: Only admin/coach can see lessons from unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module lessons" });
      }

      const lessons = await storage.getModuleLessons(moduleId);
      res.json(lessons);
    } catch (error: unknown) {
      console.error("Error fetching module lessons:", error);
      res.status(500).json({ message: "Ders listesi getirilemedi" });
    }
  });

  // Add lesson to module (admin/coach/trainer only)
  router.post('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'create')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      // Validate without moduleId (injected from path param)
      const validated = insertModuleLessonSchema.omit({ moduleId: true }).parse(req.body);
      const lesson = await storage.createModuleLesson({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(lesson);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error creating module lesson:", error);
      res.status(500).json({ message: "Ders oluşturulamadı" });
    }
  });

  // Update lesson (admin/coach only)
  router.put('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders düzenleyebilir" });
      }

      const lessonId = parseInt(req.params.id);
      const validated = insertModuleLessonSchema.partial().parse(req.body);
      const updated = await storage.updateModuleLesson(lessonId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error updating module lesson:", error);
      res.status(500).json({ message: "Ders güncellenemedi" });
    }
  });

  // Delete lesson (admin/coach only)
  router.delete('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders silebilir" });
      }

      const lessonId = parseInt(req.params.id);
      await storage.deleteModuleLesson(lessonId);
      
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting module lesson:", error);
      res.status(500).json({ message: "Ders silinemedi" });
    }
  });

  // Generate AI materials (quiz questions + flashcards) from lesson content (admin/coach only)
  router.post('/api/training/lessons/:id/generate-materials', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler AI materyal oluşturabilir" });
      }

      const lessonId = parseInt(req.params.id);
      const { quizCount = 5, flashcardCount = 10 } = req.body;

      // Get lesson content
      const lesson = await storage.getModuleLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }

      if (!lesson.content) {
        return res.status(400).json({ message: "Ders içeriği boş, AI materyal oluşturulamıyor" });
      }

      // Generate AI materials in parallel
      const [quizQuestions, flashcards] = await Promise.all([
        generateQuizQuestionsFromLesson(lesson.content, quizCount, lessonId),
        generateFlashcardsFromLesson(lesson.content, flashcardCount, lessonId),
      ]);

      // Create quiz in database with questions
      const quiz = await storage.createModuleQuiz({
        moduleId: lesson.moduleId,
        title: `${lesson.title} - Quiz`,
        description: `AI-generated quiz for ${lesson.title}`,
        passingScore: 70,
        timeLimit: 15,
      });

      // Save each quiz question
      for (const q of quizQuestions) {
        await storage.createQuizQuestion({
          quizId: quiz.id,
          question: q.question || q.questionText || '',
          questionType: q.questionType || 'multiple_choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation,
          points: q.points || 10,
        });
      }

      // Save each flashcard
      for (const card of flashcards) {
        await storage.createFlashcard({
          moduleId: lesson.moduleId,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty || 'medium',
        });
      }

      res.json({
        quizId: quiz.id,
        questionCount: quizQuestions.length,
        flashcardCount: flashcards.length,
        message: `${quizQuestions.length} quiz sorusu ve ${flashcards.length} flashcard oluşturuldu`,
      });
    } catch (error: unknown) {
      console.error("Error generating AI materials:", error);
      res.status(500).json({ message: "AI materyal oluşturulamadı" });
    }
  });

  // Add quiz to module (admin/coach/trainer only)
  router.post('/api/training/modules/:id/quizzes', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!hasPermission(user.role as any, 'training', 'create')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const moduleId = parseInt(req.params.id);
      const validated = insertModuleQuizSchema.parse(req.body);
      const quiz = await storage.createModuleQuiz({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(quiz);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error creating module quiz:", error);
      res.status(500).json({ message: "Modül sınavı oluşturulurken hata oluştu" });
    }
  });


  // Get user's training progress
  router.get('/api/training/progress', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserTrainingProgress(userId);
      res.json(progress);
    } catch (error: unknown) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ message: "Eğitim ilerlemesi alınırken hata oluştu" });
    }
  });

  // Update user's training progress
  router.put('/api/training/progress/:moduleId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const moduleId = parseInt(req.params.moduleId);
      
      const validated = insertUserTrainingProgressSchema.partial().parse(req.body);
      const updated = await storage.updateUserProgress(userId, moduleId, validated);
      res.json(updated);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error updating training progress:", error);
      res.status(500).json({ message: "Eğitim ilerlemesi güncellenirken hata oluştu" });
    }
  });

  // Submit quiz attempt
  router.post('/api/training/quiz-attempts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validated = insertUserQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt({
        ...validated,
        userId,
      });
      
      res.status(201).json(attempt);
    } catch (error: unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Doğrulama hatası", errors: error.errors });
      }
      console.error("Error creating quiz attempt:", error);
      res.status(500).json({ message: "Sınav denemesi oluşturulurken hata oluştu" });
    }
  });

  // Approve/reject quiz attempt (supervisor/coach only)
  router.put('/api/training/quiz-attempts/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'supervisor' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only supervisors and coaches can approve quizzes" });
      }

      const attemptId = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      const updated = await storage.approveQuizAttempt(attemptId, user.id, status, feedback);
      
      if (!updated) {
        return res.status(404).json({ message: "Sınav denemesi bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      handleApiError(res, error, "ApproveQuizAttempt");
    }
  });


  // POST /api/onboarding-documents - Upload onboarding document
  router.post('/api/onboarding-documents', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertOnboardingDocumentSchema.parse(req.body);
      const [document] = await db.insert(onboardingDocuments).values({
        ...validatedData,
        uploadedById: user.id,
        uploadedAt: new Date(),
      }).returning();

      res.status(201).json(document);
    } catch (error: unknown) {
      console.error("Error uploading onboarding document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Belge yüklenirken hata oluştu" });
    }
  });


  // ========================================
  // PERFORMANCE SCORES - Performans Skorları
  // ========================================

  // POST /api/performance/calculate - Calculate daily performance score
  router.post('/api/performance/calculate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, branchId, date } = req.body;

      // Validate input
      if (!userId || !branchId || !date) {
        return res.status(400).json({ message: "userId, branchId ve date alanları gerekli" });
      }

      // Permission check: users can calculate their own scores, supervisors/HQ can calculate for others
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'edit', 'Başkasının performans skorunu hesaplamak için yetkiniz yok');
      }

      const score = await storage.calculateAndSaveDailyPerformanceScore(userId, branchId, date);
      res.json(score);
    } catch (error: unknown) {
      console.error("Error calculating performance score:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skoru hesaplanırken hata oluştu" });
    }
  });

  // GET /api/performance/team - Get team performance aggregates (supervisor only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  router.get('/api/performance/team', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only branch roles (supervisor, branch_manager) can view team performance
      if (!isBranchRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Takım performansını görüntülemek için branch yetkiniz yok' });
      }
      
      if (!user.branchId) {
        return res.status(400).json({ message: 'Branch ID bulunamadı' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Takım performansını görüntülemek için yetkiniz yok');
      
      res.setHeader('Cache-Control', 'no-store');
      const teamPerformance = await storage.getTeamPerformanceAggregates(user.branchId);
      res.json(teamPerformance);
    } catch (error: unknown) {
      console.error("Error fetching team performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Takım performansı yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches/composite - Get composite branch scores (HQ only)
  // NOTE: Must come BEFORE /api/performance/branches to avoid route matching issues
  router.get('/api/performance/branches/composite', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only HQ roles can view all branches composite scores
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Tüm branch skorlarını görüntülemek için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch skorlarını görüntülemek için yetkiniz yok');
      
      const timeRange = (req.query.timeRange as '7d' | '30d' | '180d' | '365d') || '30d';
      
      // Check cache
      const cacheKey = `composite-scores-${timeRange}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const compositeScores = await storage.getCompositeBranchScores(timeRange);
      
      // Cache for 60 seconds
      setCachedResponse(cacheKey, compositeScores, 60);
      res.json(compositeScores);
    } catch (error: unknown) {
      console.error("Error fetching composite branch scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches - Get all branches performance aggregates (HQ only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  router.get('/api/performance/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only HQ roles can view all branches performance
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Tüm branch performanslarını görüntülemek için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch performanslarını görüntülemek için yetkiniz yok');
      
      res.setHeader('Cache-Control', 'no-store');
      const branchesPerformance = await storage.getAllBranchesPerformanceAggregates();
      res.json(branchesPerformance);
    } catch (error: unknown) {
      console.error("Error fetching branches performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch performansları yüklenirken hata oluştu" });
    }
  });

  // POST /api/performance/branches/:branchId/evaluation - Generate AI evaluation for branch performance (HQ only)
  router.post('/api/performance/branches/:branchId/evaluation', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.params;
      
      // Only HQ roles can generate evaluations
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Branch değerlendirmesi oluşturmak için HQ yetkiniz yok' });
      }
      
      ensurePermission(user, 'attendance', 'view', 'Branch performansını değerlendirmek için yetkiniz yok');
      
      // Get branch performance data
      const branchPerformance = await storage.getAllBranchesPerformanceAggregates();
      const targetBranch = branchPerformance.find(b => b.branchId === parseInt(branchId));
      
      if (!targetBranch) {
        return res.status(404).json({ message: 'Branch performans verisi bulunamadı' });
      }
      
      // Generate AI evaluation
      const evaluation = await evaluateBranchPerformance(
        targetBranch.branchName,
        {
          avgAttendanceScore: targetBranch.avgAttendanceScore,
          avgLatenessScore: targetBranch.avgLatenessScore,
          avgEarlyLeaveScore: targetBranch.avgEarlyLeaveScore,
          avgBreakComplianceScore: targetBranch.avgBreakComplianceScore,
          avgShiftComplianceScore: targetBranch.avgShiftComplianceScore,
          avgOvertimeComplianceScore: targetBranch.avgOvertimeComplianceScore,
          avgDailyTotalScore: targetBranch.avgDailyTotalScore,
          totalPenaltyMinutes: targetBranch.totalPenaltyMinutes,
          totalEmployees: targetBranch.totalEmployees,
          dateRange: `${targetBranch.startDate} - ${targetBranch.endDate}`,
        },
        user.id
      );
      
      res.json(evaluation);
    } catch (error: unknown) {
      console.error("Error generating branch evaluation:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      handleApiError(res, error, "GenerateBranchEvaluation");
    }
  });

  // GET /api/performance/:userId - Get performance scores for a user
  router.get('/api/performance/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // Permission check: users can view their own scores, supervisors/HQ can view others'
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'view', 'Başkasının performans skorunu görüntülemek için yetkiniz yok');
      }

      res.setHeader('Cache-Control', 'no-store');
      const scores = await storage.getPerformanceScores(userId, startDate as string, endDate as string);
      res.json(scores);
    } catch (error: unknown) {
      console.error("Error fetching performance scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/:userId/week/:week - Get weekly performance summary
  router.get('/api/performance/:userId/week/:week', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, week } = req.params;

      // Permission check
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'view', 'Başkasının haftalık performansını görüntülemek için yetkiniz yok');
      }

      const summary = await storage.getWeeklyPerformanceSummary(userId, week);
      res.json(summary);
    } catch (error: unknown) {
      console.error("Error fetching weekly performance summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Haftalık performans özeti yüklenirken hata oluştu" });
    }
  });


  // ========================
  // LEAVE REQUESTS - İzin Talepleri
  // ========================

  // GET /api/leave-requests - Get leave requests (filtered by role)
  router.get('/api/leave-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, status, leaveType, startDate, endDate } = req.query;

      let query = db.select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        approvedBy: leaveRequests.approvedBy,
        approvedAt: leaveRequests.approvedAt,
        rejectionReason: leaveRequests.rejectionReason,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userRole: users.role,
      }).from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.userId, users.id));

      const conditions: any[] = [];

      const isSupervisorOrAbove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || user.role === 'mudur' || isHQRole(user.role);
      if (!isSupervisorOrAbove) {
        conditions.push(eq(leaveRequests.userId, user.id));
      } else if (user.role === 'muhasebe' || user.role === 'muhasebe_ik') {
        // Muhasebe can see factory floor + Işıklar branch leave requests, plus their own
        const isiklarBranches = await db.select({ id: branches.id }).from(branches).where(
          or(
            sql`${branches.name} ILIKE '%Işıklar%'`,
            sql`${branches.name} ILIKE '%Isiklar%'`
          )
        );
        const isiklarBranchIds = isiklarBranches.map(b => b.id);

        const factoryRoles = Array.from(FACTORY_FLOOR_ROLES);
        const factoryCondition = inArray(users.role, factoryRoles);
        const isiklarCondition = isiklarBranchIds.length > 0 ? inArray(users.branchId, isiklarBranchIds) : sql`false`;
        const ownCondition = eq(leaveRequests.userId, user.id);

        conditions.push(or(factoryCondition, isiklarCondition, ownCondition));
      } else if (user.role === 'ceo' || user.role === 'admin') {
        // CEO and admin see all
      } else if (isHQRole(user.role)) {
        // Other HQ roles see only their own
        conditions.push(eq(leaveRequests.userId, user.id));
      } else if (user.branchId) {
        // Branch supervisors/managers see their own branch
        conditions.push(eq(users.branchId, user.branchId));
      }

      if (userId) conditions.push(eq(leaveRequests.userId, userId as string));
      if (status) conditions.push(eq(leaveRequests.status, status as string));
      if (leaveType) conditions.push(eq(leaveRequests.leaveType, leaveType as string));
      if (startDate) conditions.push(gte(leaveRequests.startDate, startDate as string));
      if (endDate) conditions.push(lte(leaveRequests.endDate, endDate as string));

      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(leaveRequests.createdAt))
        : await query.orderBy(desc(leaveRequests.createdAt));

      const enriched = results.map((r) => ({
        ...r,
        userName: ((r.userFirstName || '') + ' ' + (r.userLastName || '')).trim() || null,
      }));
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "İzin talepleri yüklenirken hata oluştu" });
    }
  });

  // GET /api/leave-requests/my - Get current user's leave requests
  router.get('/api/leave-requests/my', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      const results = await db.select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        approvedBy: leaveRequests.approvedBy,
        approvedAt: leaveRequests.approvedAt,
        rejectionReason: leaveRequests.rejectionReason,
        createdAt: leaveRequests.createdAt,
        updatedAt: leaveRequests.updatedAt,
      }).from(leaveRequests)
        .where(eq(leaveRequests.userId, user.id))
        .orderBy(desc(leaveRequests.createdAt));

      res.json(results);
    } catch (error: unknown) {
      console.error("Error fetching my leave requests:", error);
      res.status(500).json({ message: "İzin talepleriniz yüklenirken hata oluştu" });
    }
  });

  // POST /api/leave-requests - Create a new leave request
  router.post('/api/leave-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, leaveType, startDate, endDate, totalDays, reason } = req.body;

      if (!leaveType || !startDate || !endDate || !totalDays) {
        return res.status(400).json({ message: "Eksik alanlar: leaveType, startDate, endDate, totalDays zorunludur" });
      }

      const targetUserId = userId || user.id;

      const isSupervisorOrAbove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || user.role === 'mudur' || isHQRole(user.role);
      if (targetUserId !== user.id && !isSupervisorOrAbove) {
        return res.status(403).json({ message: "Başka kullanıcı adına izin talebi oluşturma yetkiniz yok" });
      }

      if (leaveType === 'annual') {
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;

        const [usedDays] = await db.select({
          total: sql<number>`COALESCE(SUM(${leaveRequests.totalDays}), 0)`,
        }).from(leaveRequests)
          .where(and(
            eq(leaveRequests.userId, targetUserId),
            eq(leaveRequests.leaveType, 'annual'),
            eq(leaveRequests.status, 'approved'),
            gte(leaveRequests.startDate, yearStart),
            lte(leaveRequests.endDate, yearEnd),
          ));

        const usedAnnualDays = Number(usedDays?.total || 0);
        const maxAnnualDays = 14;
        if (usedAnnualDays + totalDays > maxAnnualDays) {
          return res.status(400).json({
            message: `Yıllık izin limiti aşılıyor. Bu yıl kullanılan: ${usedAnnualDays} gün, kalan: ${maxAnnualDays - usedAnnualDays} gün`,
            usedDays: usedAnnualDays,
            remainingDays: maxAnnualDays - usedAnnualDays,
          });
        }
      }

      const [created] = await db.insert(leaveRequests).values({
        userId: targetUserId,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: reason || null,
        status: 'pending',
      }).returning();

      // --- Leave Request Routing & Notification Logic ---
      try {
        const [targetUser] = await db.select({
          id: users.id,
          role: users.role,
          branchId: users.branchId,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        }).from(users).where(eq(users.id, targetUserId));

        if (targetUser) {
          const targetRole = targetUser.role as UserRoleType;
          const targetBranchId = targetUser.branchId;

          let branchName: string | null = null;
          if (targetBranchId) {
            const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, targetBranchId));
            branchName = branch?.name || null;
          }

          const isIsiklarBranch = branchName ? (branchName.includes('Işıklar') || branchName.includes('Isiklar') || branchName.includes('ışıklar') || branchName.includes('isiklar')) : false;
          const isFactory = isFactoryFloorRole(targetRole);
          const isHQ = isHQRole(targetRole);
          const displayName = ((targetUser.firstName || '') + ' ' + (targetUser.lastName || '')).trim() || targetUser.username || 'Personel';

          if (isHQ) {
            // HQ staff → notify CEO
            const ceoUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ceo'));
            for (const ceo of ceoUsers) {
              await storage.createNotification({
                userId: ceo.id,
                title: 'Yeni İzin Talebi (Genel Merkez)',
                message: `${displayName} (${targetRole}) ${startDate} - ${endDate} tarihleri için izin talep etti. Onayınız bekleniyor.`,
                type: 'leave_request',
                relatedId: created.id,
                relatedType: 'leave_request',
              });
            }
          } else if (isFactory || isIsiklarBranch) {
            // Factory + Işıklar → notify muhasebe (Mahmut) + CEO
            const muhasebeUsers = await db.select({ id: users.id }).from(users).where(
              or(eq(users.role, 'muhasebe'), eq(users.role, 'muhasebe_ik'))
            );
            for (const muh of muhasebeUsers) {
              await storage.createNotification({
                userId: muh.id,
                title: `Yeni İzin Talebi (${isFactory ? 'Fabrika' : 'Işıklar'})`,
                message: `${displayName} ${startDate} - ${endDate} tarihleri için izin talep etti. CEO onayı bekleniyor.`,
                type: 'leave_request',
                relatedId: created.id,
                relatedType: 'leave_request',
              });
            }
            const ceoUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ceo'));
            for (const ceo of ceoUsers) {
              await storage.createNotification({
                userId: ceo.id,
                title: `Yeni İzin Talebi (${isFactory ? 'Fabrika' : 'Işıklar'})`,
                message: `${displayName} ${startDate} - ${endDate} tarihleri için izin talep etti. Onayınız bekleniyor.`,
                type: 'leave_request',
                relatedId: created.id,
                relatedType: 'leave_request',
              });
            }
          } else {
            // Other branches → notify branch supervisor/manager
            if (targetBranchId) {
              const branchManagers = await db.select({ id: users.id }).from(users).where(
                and(
                  eq(users.branchId, targetBranchId),
                  or(eq(users.role, 'mudur'), eq(users.role, 'supervisor')),
                  ne(users.id, targetUserId)
                )
              );
              for (const mgr of branchManagers) {
                await storage.createNotification({
                  userId: mgr.id,
                  title: 'Yeni İzin Talebi',
                  message: `${displayName} ${startDate} - ${endDate} tarihleri için izin talep etti. Onayınız bekleniyor.`,
                  type: 'leave_request',
                  relatedId: created.id,
                  relatedType: 'leave_request',
                  branchId: targetBranchId,
                });
              }
            }
          }
        }
      } catch (notifError) {
        console.error("Error sending leave request notifications:", notifError);
      }

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error creating leave request:", error);
      res.status(500).json({ message: "İzin talebi oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/leave-requests/:id/approve - Approve a leave request (CEO-only for HQ/factory/Işıklar)
  router.patch('/api/leave-requests/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);

      const canApproveGeneral = user.role === 'supervisor' || user.role === 'supervisor_buddy' || user.role === 'mudur' || isHQRole(user.role);
      if (!canApproveGeneral) {
        return res.status(403).json({ message: "İzin taleplerini onaylama yetkiniz yok" });
      }

      const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, requestId));
      if (!existing) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }

      if (existing.status !== 'pending') {
        return res.status(400).json({ message: "Bu talep zaten işlenmiş" });
      }

      // Check if this leave request requires CEO-only approval
      const [requestOwner] = await db.select({
        role: users.role,
        branchId: users.branchId,
      }).from(users).where(eq(users.id, existing.userId));

      if (requestOwner) {
        const ownerRole = requestOwner.role as UserRoleType;
        const ownerBranchId = requestOwner.branchId;

        let ownerBranchName: string | null = null;
        if (ownerBranchId) {
          const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, ownerBranchId));
          ownerBranchName = branch?.name || null;
        }

        const isOwnerIsiklarBranch = ownerBranchName ? (ownerBranchName.includes('Işıklar') || ownerBranchName.includes('Isiklar') || ownerBranchName.includes('ışıklar') || ownerBranchName.includes('isiklar')) : false;
        const isOwnerFactory = isFactoryFloorRole(ownerRole);
        const isOwnerHQ = isHQRole(ownerRole);

        // HQ, factory, and Işıklar requests can only be approved by CEO or admin
        if ((isOwnerHQ || isOwnerFactory || isOwnerIsiklarBranch) && user.role !== 'ceo' && user.role !== 'admin') {
          return res.status(403).json({ message: "Bu izin talebi sadece CEO tarafından onaylanabilir" });
        }
      }

      const [updated] = await db.update(leaveRequests)
        .set({
          status: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      await storage.createNotification({
        userId: existing.userId,
        title: 'İzin Talebi Onaylandı',
        message: `${existing.startDate} - ${existing.endDate} tarihleri arasındaki izin talebiniz onaylandı.`,
        type: 'leave_approved',
        relatedId: requestId,
        relatedType: 'leave_request',
        branchId: user.branchId || undefined,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error approving leave request:", error);
      res.status(500).json({ message: "İzin talebi onaylanırken hata oluştu" });
    }
  });

  // PATCH /api/leave-requests/:id/reject - Reject a leave request (CEO-only for HQ/factory/Işıklar)
  router.patch('/api/leave-requests/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);
      const { rejectionReason } = req.body;

      const canRejectGeneral = user.role === 'supervisor' || user.role === 'supervisor_buddy' || user.role === 'mudur' || isHQRole(user.role);
      if (!canRejectGeneral) {
        return res.status(403).json({ message: "İzin taleplerini reddetme yetkiniz yok" });
      }

      const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, requestId));
      if (!existing) {
        return res.status(404).json({ message: "İzin talebi bulunamadı" });
      }

      if (existing.status !== 'pending') {
        return res.status(400).json({ message: "Bu talep zaten işlenmiş" });
      }

      // Check if this leave request requires CEO-only rejection
      const [requestOwner] = await db.select({
        role: users.role,
        branchId: users.branchId,
      }).from(users).where(eq(users.id, existing.userId));

      if (requestOwner) {
        const ownerRole = requestOwner.role as UserRoleType;
        const ownerBranchId = requestOwner.branchId;

        let ownerBranchName: string | null = null;
        if (ownerBranchId) {
          const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, ownerBranchId));
          ownerBranchName = branch?.name || null;
        }

        const isOwnerIsiklarBranch = ownerBranchName ? (ownerBranchName.includes('Işıklar') || ownerBranchName.includes('Isiklar') || ownerBranchName.includes('ışıklar') || ownerBranchName.includes('isiklar')) : false;
        const isOwnerFactory = isFactoryFloorRole(ownerRole);
        const isOwnerHQ = isHQRole(ownerRole);

        if ((isOwnerHQ || isOwnerFactory || isOwnerIsiklarBranch) && user.role !== 'ceo' && user.role !== 'admin') {
          return res.status(403).json({ message: "Bu izin talebi sadece CEO tarafından reddedilebilir" });
        }
      }

      const [updated] = await db.update(leaveRequests)
        .set({
          status: 'rejected',
          approvedBy: user.id,
          rejectionReason: rejectionReason || null,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      await storage.createNotification({
        userId: existing.userId,
        title: 'İzin Talebi Reddedildi',
        message: `${existing.startDate} - ${existing.endDate} tarihleri arasındaki izin talebiniz reddedildi.${rejectionReason ? ' Sebep: ' + rejectionReason : ''}`,
        type: 'leave_rejected',
        relatedId: requestId,
        relatedType: 'leave_request',
        branchId: user.branchId || undefined,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error rejecting leave request:", error);
      res.status(500).json({ message: "İzin talebi reddedilirken hata oluştu" });
    }
  });


  // Employee Onboarding
  // Get all onboarding records (with optional branch filter via query param)
  router.get('/api/employee-onboarding', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;
      
      ensurePermission(user, 'hr', 'view', 'Onboarding kayıtlarını görüntüleme yetkiniz yok');
      
      // Get all employees first
      const allEmployees = await db.select().from(users);
      let onboardingRecords: any[] = [];
      
      // Branch users can only see their own branch (ignore query param)
      if (!isHQRole(user.role ) && user.branchId) {
        onboardingRecords = await storage.getOnboardingsByBranch(user.branchId);
      } else if (isHQRole(user.role )) {
        // HQ users: respect branchId query param or get all
        if (branchId) {
          const targetBranchId = parseInt(branchId as string);
          onboardingRecords = await storage.getOnboardingsByBranch(targetBranchId);
        } else {
          // Get all - fetch from all branches
          const branches = await storage.getBranches();
          for (const branch of branches) {
            const branchOnboardings = await storage.getOnboardingsByBranch(branch.id);
            onboardingRecords.push(...branchOnboardings);
          }
        }
      }
      
      // Attach user info to each record
      const recordsWithUsers = onboardingRecords.map(record => {
        const employee = allEmployees.find(e => e.id === record.userId);
        return {
          ...record,
          user: employee ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
          } : undefined,
        };
      });
      
      res.json(recordsWithUsers);
    } catch (error: unknown) {
      console.error("Error fetching all onboarding records:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/employee-onboarding/mentor/my-mentees', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'view', 'Mentee kayıtlarını görüntüleme yetkiniz yok');

      const menteeOnboardings = await db.select().from(employeeOnboarding)
        .where(eq(employeeOnboarding.assignedMentorId, user.id));

      const results = [];
      for (const onb of menteeOnboardings) {
        const menteeUser = await storage.getUser(onb.userId);
        const tasks = await storage.getOnboardingTasks(onb.id);

        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const totalTasks = tasks.length;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        let daysRemaining = 0;
        if (onb.expectedCompletionDate) {
          const expDate = new Date(onb.expectedCompletionDate);
          const now = new Date();
          daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        results.push({
          onboarding: onb,
          user: menteeUser ? {
            id: menteeUser.id,
            firstName: menteeUser.firstName,
            lastName: menteeUser.lastName,
            email: menteeUser.email,
            role: menteeUser.role,
            branchId: menteeUser.branchId,
          } : undefined,
          tasks,
          daysRemaining,
          completionPercentage,
        });
      }

      res.json(results);
    } catch (error: unknown) {
      console.error("Error fetching mentee records:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mentee kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/employee-onboarding/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;
      
      ensurePermission(user, 'hr', 'view', 'Onboarding kayıtlarını görüntüleme yetkiniz yok');
      
      // Verify access
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
        }
      }
      
      const onboarding = await storage.getEmployeeOnboarding(targetUserId);
      res.json(onboarding);
    } catch (error: unknown) {
      console.error("Error fetching employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı yüklenirken hata oluştu" });
    }
  });

  router.post('/api/employee-onboarding', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Onboarding kaydı oluşturma yetkiniz yok');
      
      // Validate required fields
      const validatedData = z.object({
        userId: z.string().min(1, "userId gereklidir"),
        branchId: z.number().int().positive("Geçerli bir branchId gereklidir"),
      }).parse(req.body);
      
      const { userId, branchId } = validatedData;
      
      // Verify branch access
      if (!isHQRole(user.role ) && branchId !== user.branchId) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için kayıt oluşturabilirsiniz" });
      }
      
      // Use getOrCreate for idempotent operation - it handles all defaults internally
      const onboarding = await storage.getOrCreateEmployeeOnboarding(userId, branchId, user.id);
      res.json(onboarding);
    } catch (error: unknown) {
      console.error("Error creating employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Onboarding kaydı oluşturulurken hata oluştu" });
    }
  });

  router.post('/api/employee-onboarding/start-from-template', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Şablondan onboarding başlatma yetkiniz yok');

      const validatedData = z.object({
        userId: z.string().min(1, "userId gereklidir"),
        branchId: z.number().int().positive("Geçerli bir branchId gereklidir"),
        templateId: z.number().int().positive("Geçerli bir templateId gereklidir"),
        mentorId: z.string().optional(),
        startDate: z.string().optional(),
      }).parse(req.body);

      const { userId, branchId, templateId, mentorId } = validatedData;
      const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
      const startDateStr = startDate.toISOString().split('T')[0];

      if (!isHQRole(user.role) && branchId !== user.branchId) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için onboarding başlatabilirsiniz" });
      }

      const [template] = await db.select().from(onboardingTemplates).where(eq(onboardingTemplates.id, templateId));
      if (!template) {
        return res.status(404).json({ message: "Onboarding şablonu bulunamadı" });
      }
      if (!template.isActive) {
        return res.status(400).json({ message: "Bu şablon aktif değil" });
      }

      const steps = await db.select().from(onboardingTemplateSteps)
        .where(and(
          eq(onboardingTemplateSteps.templateId, templateId),
          or(eq(onboardingTemplateSteps.isDeleted, false), isNull(onboardingTemplateSteps.isDeleted))
        ))
        .orderBy(asc(onboardingTemplateSteps.stepOrder));

      const onboarding = await storage.getOrCreateEmployeeOnboarding(userId, branchId, user.id);

      await storage.updateEmployeeOnboarding(onboarding.id, {
        startDate: startDateStr,
      });

      const createdTasks = [];
      for (const step of steps) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + step.endDay);

        const titleLower = step.title.toLocaleLowerCase('tr-TR');
        let taskType = 'training';
        if (titleLower.includes('oryantasyon') || titleLower.includes('orientation')) taskType = 'orientation';
        else if (titleLower.includes('eğitim') || titleLower.includes('training')) taskType = 'training';
        else if (titleLower.includes('belge') || titleLower.includes('document') || titleLower.includes('evrak')) taskType = 'document_upload';
        else if (titleLower.includes('sistem') || titleLower.includes('system') || titleLower.includes('erişim')) taskType = 'system_access';
        else if (titleLower.includes('tanışma') || titleLower.includes('meet') || titleLower.includes('ekip')) taskType = 'meet_team';

        const task = await storage.createOnboardingTask({
          onboardingId: onboarding.id,
          taskType,
          taskName: step.title,
          description: step.description || undefined,
          dueDate: dueDate.toISOString().split('T')[0],
          priority: step.requiredCompletion ? 'high' : 'medium',
          status: 'pending',
        });
        createdTasks.push(task);
      }

      const expectedCompletionDate = new Date(startDate);
      expectedCompletionDate.setDate(expectedCompletionDate.getDate() + 60);

      const updated = await storage.updateEmployeeOnboarding(onboarding.id, {
        assignedMentorId: mentorId || undefined,
        status: 'in_progress',
        startDate: startDateStr,
        expectedCompletionDate: expectedCompletionDate.toISOString().split('T')[0],
      });

      res.json({ onboarding: updated, tasks: createdTasks });
    } catch (error: unknown) {
      console.error("Error starting onboarding from template:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şablondan onboarding başlatılırken hata oluştu" });
    }
  });

  router.post('/api/employee-onboarding/:id/mentor-note', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.id);

      ensurePermission(user, 'hr', 'edit', 'Mentor notu ekleme yetkiniz yok');

      const validatedData = z.object({
        note: z.string().min(1, "Not içeriği gereklidir"),
        rating: z.number().int().min(1).max(5).optional(),
      }).parse(req.body);

      const [existing] = await db.select().from(employeeOnboarding)
        .where(eq(employeeOnboarding.id, onboardingId));

      if (!existing) {
        return res.status(404).json({ message: "Onboarding kaydı bulunamadı" });
      }

      if (!isHQRole(user.role) && existing.assignedMentorId !== user.id) {
        return res.status(403).json({ message: "Bu kayda mentor notu ekleme yetkiniz yok" });
      }

      const noteEntry = {
        date: new Date().toISOString(),
        mentorId: user.id,
        mentorName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        note: validatedData.note,
        rating: validatedData.rating || undefined,
      };

      const existingNotes = existing.supervisorNotes ? existing.supervisorNotes : '';
      const newNoteStr = `[${noteEntry.date}] (${noteEntry.mentorName}${noteEntry.rating ? ` - Puan: ${noteEntry.rating}/5` : ''}): ${noteEntry.note}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n${newNoteStr}` : newNoteStr;

      const updated = await storage.updateEmployeeOnboarding(onboardingId, {
        supervisorNotes: updatedNotes,
      });

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error adding mentor note:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mentor notu eklenirken hata oluştu" });
    }
  });

  router.patch('/api/employee-onboarding/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding kaydı düzenleme yetkiniz yok');
      
      const onboarding = await storage.getEmployeeOnboarding(req.body.userId);
      if (!onboarding || onboarding.id !== onboardingId) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && onboarding.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı düzenleme yetkiniz yok" });
      }
      
      const updated = await storage.updateEmployeeOnboarding(onboardingId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı güncellenirken hata oluştu" });
    }
  });

  // Onboarding Tasks
  router.get('/api/onboarding-tasks/:onboardingId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.onboardingId);
      
      ensurePermission(user, 'hr', 'view', 'Onboarding görevlerini görüntüleme yetkiniz yok');
      
      const tasks = await storage.getOnboardingTasks(onboardingId);
      res.json(tasks);
    } catch (error: unknown) {
      console.error("Error fetching onboarding tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görevler yüklenirken hata oluştu" });
    }
  });

  router.post('/api/onboarding-tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Onboarding görevi oluşturma yetkiniz yok');
      
      const validatedData = insertEmployeeOnboardingTaskSchema.parse(req.body);
      
      const task = await storage.createOnboardingTask(validatedData);
      res.json(task);
    } catch (error: unknown) {
      console.error("Error creating onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Görev oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/onboarding-tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi düzenleme yetkiniz yok');
      
      const updated = await storage.updateOnboardingTask(taskId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev güncellenirken hata oluştu" });
    }
  });

  router.post('/api/onboarding-tasks/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { attachments } = req.body;
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi tamamlama yetkiniz yok');
      
      const completed = await storage.completeOnboardingTask(taskId, user.id, attachments);
      res.json(completed);
    } catch (error: unknown) {
      console.error("Error completing onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev tamamlanırken hata oluştu" });
    }
  });

  router.post('/api/onboarding-tasks/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      // Only supervisors and HQ can verify
      if (!isHQRole(user.role ) && user.role !== 'supervisor' && user.role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Sadece yöneticiler görevleri onaylayabilir" });
      }
      
      const verified = await storage.verifyOnboardingTask(taskId, user.id);
      res.json(verified);
    } catch (error: unknown) {
      console.error("Error verifying onboarding task:", error);
      res.status(500).json({ message: "Görev onaylanırken hata oluştu" });
    }
  });

  // ========================================
  // ONBOARDING TEMPLATES API
  // ========================================

  // GET /api/onboarding-templates - Get all active templates (coach/HQ only)
  router.get('/api/onboarding-templates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const templates = await db.select()
        .from(onboardingTemplates)
        .where(eq(onboardingTemplates.isActive, true))
        .orderBy(desc(onboardingTemplates.createdAt));
      
      res.json(templates);
    } catch (error: unknown) {
      console.error("Error fetching onboarding templates:", error);
      res.status(500).json({ message: "Şablonlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/onboarding-templates - Create a new template (coach/HQ only)
  router.post('/api/onboarding-templates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece HQ kullanıcıları şablon oluşturabilir" });
      }

      const parsed = insertOnboardingTemplateSchema.safeParse({
        ...req.body,
        createdById: user.id,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      const [template] = await db.insert(onboardingTemplates).values(parsed.data).returning();
      res.status(201).json(template);
    } catch (error: unknown) {
      console.error("Error creating onboarding template:", error);
      res.status(500).json({ message: "Şablon oluşturulurken hata oluştu" });
    }
  });

  // GET /api/onboarding-templates/:id - Get template with steps
  router.get('/api/onboarding-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const templateId = parseInt(req.params.id);

      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Geçersiz şablon ID" });
      }

      const [template] = await db.select()
        .from(onboardingTemplates)
        .where(eq(onboardingTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      const steps = await db.select()
        .from(onboardingTemplateSteps)
        .where(and(
          eq(onboardingTemplateSteps.templateId, templateId),
          or(eq(onboardingTemplateSteps.isDeleted, false), isNull(onboardingTemplateSteps.isDeleted))
        ))
        .orderBy(onboardingTemplateSteps.stepOrder);

      res.json({ ...template, steps });
    } catch (error: unknown) {
      console.error("Error fetching onboarding template:", error);
      res.status(500).json({ message: "Şablon yüklenirken hata oluştu" });
    }
  });

  // PUT /api/onboarding-templates/:id - Update template
  router.put('/api/onboarding-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Geçersiz şablon ID" });
      }

      const { name, description, targetRole, durationDays, isActive } = req.body;
      
      const [updated] = await db.update(onboardingTemplates)
        .set({
          name,
          description,
          targetRole,
          durationDays,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(onboardingTemplates.id, templateId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating onboarding template:", error);
      res.status(500).json({ message: "Şablon güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/onboarding-templates/:id - Soft delete (set isActive=false)
  router.delete('/api/onboarding-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Geçersiz şablon ID" });
      }

      const [updated] = await db.update(onboardingTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(onboardingTemplates.id, templateId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      res.json({ message: "Şablon silindi", template: updated });
    } catch (error: unknown) {
      console.error("Error deleting onboarding template:", error);
      res.status(500).json({ message: "Şablon silinirken hata oluştu" });
    }
  });

  // ========================================
  // ONBOARDING TEMPLATE STEPS API
  // ========================================

  // GET /api/onboarding-templates/:id/steps - Get template steps
  router.get('/api/onboarding-templates/:id/steps', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Geçersiz şablon ID" });
      }

      const steps = await db.select()
        .from(onboardingTemplateSteps)
        .where(and(
          eq(onboardingTemplateSteps.templateId, templateId),
          or(eq(onboardingTemplateSteps.isDeleted, false), isNull(onboardingTemplateSteps.isDeleted))
        ))
        .orderBy(onboardingTemplateSteps.stepOrder);

      res.json(steps);
    } catch (error: unknown) {
      console.error("Error fetching template steps:", error);
      res.status(500).json({ message: "Adımlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/onboarding-templates/:id/steps - Add step to template
  router.post('/api/onboarding-templates/:id/steps', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Geçersiz şablon ID" });
      }

      const parsed = insertOnboardingTemplateStepSchema.safeParse({
        ...req.body,
        templateId,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      const [step] = await db.insert(onboardingTemplateSteps).values(parsed.data).returning();
      res.status(201).json(step);
    } catch (error: unknown) {
      console.error("Error creating template step:", error);
      res.status(500).json({ message: "Adım oluşturulurken hata oluştu" });
    }
  });

  // PUT /api/onboarding-template-steps/:id - Update step
  router.put('/api/onboarding-template-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const stepId = parseInt(req.params.id);
      if (isNaN(stepId)) {
        return res.status(400).json({ message: "Geçersiz adım ID" });
      }

      const { stepOrder, title, description, startDay, endDay, mentorRoleType, trainingModuleId, requiredCompletion } = req.body;
      
      const [updated] = await db.update(onboardingTemplateSteps)
        .set({
          stepOrder,
          title,
          description,
          startDay,
          endDay,
          mentorRoleType,
          trainingModuleId,
          requiredCompletion,
          updatedAt: new Date(),
        })
        .where(eq(onboardingTemplateSteps.id, stepId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Adım bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating template step:", error);
      res.status(500).json({ message: "Adım güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/onboarding-template-steps/:id - Delete step
  router.delete('/api/onboarding-template-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const stepId = parseInt(req.params.id);
      if (isNaN(stepId)) {
        return res.status(400).json({ message: "Geçersiz adım ID" });
      }

      const [deleted] = await db.update(onboardingTemplateSteps)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(onboardingTemplateSteps.id, stepId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Adım bulunamadı" });
      }

      res.json({ message: "Adım silindi" });
    } catch (error: unknown) {
      console.error("Error deleting template step:", error);
      res.status(500).json({ message: "Adım silinirken hata oluştu" });
    }
  });

  // ========================================
  // EMPLOYEE ONBOARDING ASSIGNMENTS API
  // ========================================

  // POST /api/employee-onboarding-assignments - Start onboarding for employee
  router.post('/api/employee-onboarding-assignments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { userId, branchId, templateId } = req.body;

      // Get template to calculate expected end date
      const [template] = await db.select()
        .from(onboardingTemplates)
        .where(eq(onboardingTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      const startDate = new Date();
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + template.durationDays);

      const parsed = insertEmployeeOnboardingAssignmentSchema.safeParse({
        userId,
        branchId: branchId || user.branchId,
        templateId,
        startDate,
        expectedEndDate,
        status: 'in_progress',
        overallProgress: 0,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }

      // Create assignment
      const [assignment] = await db.insert(employeeOnboardingAssignments).values(parsed.data).returning();

      // Get template steps and create progress records
      const steps = await db.select()
        .from(onboardingTemplateSteps)
        .where(and(
          eq(onboardingTemplateSteps.templateId, templateId),
          or(eq(onboardingTemplateSteps.isDeleted, false), isNull(onboardingTemplateSteps.isDeleted))
        ));

      if (steps.length > 0) {
        const progressRecords = steps.map(step => ({
          assignmentId: assignment.id,
          stepId: step.id,
          status: 'pending' as const,
        }));

        await db.insert(employeeOnboardingProgress).values(progressRecords);
      }

      res.status(201).json(assignment);
    } catch (error: unknown) {
      console.error("Error creating onboarding assignment:", error);
      res.status(500).json({ message: "Atama oluşturulurken hata oluştu" });
    }
  });

  // GET /api/employee-onboarding-assignments/user/:userId - Get employee's onboarding assignment
  router.get('/api/employee-onboarding-assignments/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;

      // Users can view their own, HQ/supervisors can view any
      if (user.id !== targetUserId && !isHQRole(user.role) && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const assignments = await db.select()
        .from(employeeOnboardingAssignments)
        .where(eq(employeeOnboardingAssignments.userId, targetUserId))
        .orderBy(desc(employeeOnboardingAssignments.createdAt));

      res.json(assignments);
    } catch (error: unknown) {
      console.error("Error fetching user onboarding assignments:", error);
      res.status(500).json({ message: "Atamalar yüklenirken hata oluştu" });
    }
  });

  // GET /api/employee-onboarding-assignments/branch/:branchId - Get all onboarding assignments for branch
  router.get('/api/employee-onboarding-assignments/branch/:branchId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Geçersiz şube ID" });
      }

      // Only HQ or branch supervisors can view
      if (!isHQRole(user.role) && (user.branchId !== branchId || (user.role !== 'supervisor' && user.role !== 'supervisor_buddy'))) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      // Get assignments with user and template data
      const assignments = await db.select({
        id: employeeOnboardingAssignments.id,
        userId: employeeOnboardingAssignments.userId,
        branchId: employeeOnboardingAssignments.branchId,
        templateId: employeeOnboardingAssignments.templateId,
        startDate: employeeOnboardingAssignments.startDate,
        expectedEndDate: employeeOnboardingAssignments.expectedEndDate,
        actualEndDate: employeeOnboardingAssignments.actualEndDate,
        status: employeeOnboardingAssignments.status,
        overallProgress: employeeOnboardingAssignments.overallProgress,
        managerNotified: employeeOnboardingAssignments.managerNotified,
        evaluationStatus: employeeOnboardingAssignments.evaluationStatus,
        createdAt: employeeOnboardingAssignments.createdAt,
        employeeName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`.as('employeeName'),
        templateName: onboardingTemplates.name,
        templateDurationDays: onboardingTemplates.durationDays,
      })
        .from(employeeOnboardingAssignments)
        .leftJoin(users, eq(employeeOnboardingAssignments.userId, users.id))
        .leftJoin(onboardingTemplates, eq(employeeOnboardingAssignments.templateId, onboardingTemplates.id))
        .where(eq(employeeOnboardingAssignments.branchId, branchId))
        .orderBy(desc(employeeOnboardingAssignments.createdAt));

      res.json(assignments);
    } catch (error: unknown) {
      console.error("Error fetching branch onboarding assignments:", error);
      res.status(500).json({ message: "Atamalar yüklenirken hata oluştu" });
    }
  });

  // PUT /api/employee-onboarding-assignments/:id - Update assignment status
  router.put('/api/employee-onboarding-assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const assignmentId = parseInt(req.params.id);
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: "Geçersiz atama ID" });
      }

      const { status, overallProgress, evaluationStatus, evaluationNotes, actualEndDate, managerNotified } = req.body;
      
      const [updated] = await db.update(employeeOnboardingAssignments)
        .set({
          status,
          overallProgress,
          evaluationStatus,
          evaluationNotes,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
          managerNotified,
          updatedAt: new Date(),
        })
        .where(eq(employeeOnboardingAssignments.id, assignmentId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Atama bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating onboarding assignment:", error);
      res.status(500).json({ message: "Atama güncellenirken hata oluştu" });
    }
  });

  // ========================================
  // EMPLOYEE ONBOARDING PROGRESS API
  // ========================================

  // GET /api/employee-onboarding-progress/:assignmentId - Get progress for assignment
  router.get('/api/employee-onboarding-progress/:assignmentId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const assignmentId = parseInt(req.params.assignmentId);

      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: "Geçersiz atama ID" });
      }

      // Verify access to the assignment
      const [assignment] = await db.select()
        .from(employeeOnboardingAssignments)
        .where(eq(employeeOnboardingAssignments.id, assignmentId));

      if (!assignment) {
        return res.status(404).json({ message: "Atama bulunamadı" });
      }

      // Users can view their own progress, HQ/supervisors can view any
      if (user.id !== assignment.userId && !isHQRole(user.role) && user.role !== 'supervisor' && user.role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const progress = await db.select()
        .from(employeeOnboardingProgress)
        .where(eq(employeeOnboardingProgress.assignmentId, assignmentId));

      // Get step details for each progress record
      const stepIds = progress.map(p => p.stepId);
      let stepsMap: Record<number, any> = {};
      
      if (stepIds.length > 0) {
        const steps = await db.select()
          .from(onboardingTemplateSteps)
          .where(and(
            inArray(onboardingTemplateSteps.id, stepIds),
            or(eq(onboardingTemplateSteps.isDeleted, false), isNull(onboardingTemplateSteps.isDeleted))
          ));
        
        stepsMap = steps.reduce((acc, step) => {
          acc[step.id] = step;
          return acc;
        }, {} as Record<number, any>);
      }

      const progressWithSteps = progress.map(p => ({
        ...p,
        step: stepsMap[p.stepId] || null,
      }));

      res.json(progressWithSteps);
    } catch (error: unknown) {
      console.error("Error fetching onboarding progress:", error);
      res.status(500).json({ message: "İlerleme yüklenirken hata oluştu" });
    }
  });

  // PUT /api/employee-onboarding-progress/:id - Update step progress (mentor marks complete)
  router.put('/api/employee-onboarding-progress/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const progressId = parseInt(req.params.id);

      if (isNaN(progressId)) {
        return res.status(400).json({ message: "Geçersiz ilerleme ID" });
      }

      const { status, mentorNotes, rating } = req.body;

      // Get progress record to verify access
      const [progressRecord] = await db.select()
        .from(employeeOnboardingProgress)
        .where(eq(employeeOnboardingProgress.id, progressId));

      if (!progressRecord) {
        return res.status(404).json({ message: "İlerleme kaydı bulunamadı" });
      }

      // Only HQ, supervisors, or assigned mentor can update
      const isMentor = progressRecord.mentorId === user.id;
      if (!isHQRole(user.role) && user.role !== 'supervisor' && user.role !== 'supervisor_buddy' && !isMentor) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const updateData: any = {
        status,
        mentorNotes,
        rating,
        updatedAt: new Date(),
      };

      // Set timestamps based on status change
      if (status === 'in_progress' && progressRecord.status === 'pending') {
        updateData.startedAt = new Date();
      }
      if (status === 'completed' && progressRecord.status !== 'completed') {
        updateData.completedAt = new Date();
      }

      // Set mentor if not already set
      if (!progressRecord.mentorId && (status === 'in_progress' || status === 'completed')) {
        updateData.mentorId = user.id;
      }

      const [updated] = await db.update(employeeOnboardingProgress)
        .set(updateData)
        .where(eq(employeeOnboardingProgress.id, progressId))
        .returning();

      // Update overall progress on the assignment
      const allProgress = await db.select()
        .from(employeeOnboardingProgress)
        .where(eq(employeeOnboardingProgress.assignmentId, progressRecord.assignmentId));

      const completedCount = allProgress.filter(p => p.status === 'completed').length;
      const totalCount = allProgress.length;
      const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      await db.update(employeeOnboardingAssignments)
        .set({ 
          overallProgress, 
          updatedAt: new Date(),
          status: overallProgress === 100 ? 'completed' : 'in_progress',
          actualEndDate: overallProgress === 100 ? new Date() : undefined,
        })
        .where(eq(employeeOnboardingAssignments.id, progressRecord.assignmentId));

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating onboarding progress:", error);
      res.status(500).json({ message: "İlerleme güncellenirken hata oluştu" });
    }
  });


  // ========================================
  // TRAINING MATERIALS - AI Eğitim Materyalleri
  // ========================================

  // Hook: Create training material when knowledge base article is published
  router.post('/api/training/materials/generate', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user.role, 'training', 'create')) {
        return res.status(403).json({ message: "İzniniz yok" });
      }
      
      const { articleId, targetRoles } = req.body;
      const article = await storage.getArticle(articleId);
      if (!article) return res.status(404).json({ message: "Makale bulunamadı" });

      // Generate training materials with AI
      const flashcardContent = await generateFlashcardsFromLesson(article.content);
      const quizContent = await generateQuizQuestionsFromLesson(article.content);
      
      const material = await storage.createTrainingMaterial({
        articleId,
        materialType: 'flashcard_set',
        title: `${article.title} - Flashcard Seti`,
        description: `${article.title} makalesinden otomatik oluşturulan flashcard seti`,
        content: { flashcards: flashcardContent },
        status: 'published',
        targetRoles: targetRoles || [],
        createdById: req.user.id,
      });

      res.status(201).json({ material, message: "Eğitim materyali oluşturuldu" });
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Oluşturulamadı" });
    }
  });

  // GET /api/training/materials - List published training materials
  router.get('/api/training/materials', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const materials = await storage.getTrainingMaterials(status || 'published');
      res.json(materials);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchTrainingMaterials");
    }
  });

  // GET /api/training/assignments/:userId - Get user's training assignments
  router.get('/api/training/assignments/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const assignments = await storage.getTrainingAssignments({ userId });
      res.json(assignments);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchTrainingAssignments");
    }
  });

  // POST /api/training/assignments - Bulk assign training to users/roles
  router.post('/api/training/assignments', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user.role, 'training', 'create')) {
        return res.status(403).json({ message: "Eğitim ataması yapma izniniz yok" });
      }
      
      const data = insertTrainingAssignmentSchema.parse(req.body);
      const assignment = await storage.createTrainingAssignment({
        ...data,
        assignedById: req.user.id,
      });

      try {
        if (data.userId) {
          const assignerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Yonetici';
          await storage.createNotification({
            userId: data.userId,
            type: 'training_assigned',
            title: 'Yeni Egitim Atandi',
            message: `${assignerName} tarafindan yeni bir egitim atandi.`,
            link: '/akademi',
          });
        }
      } catch (notifErr) {
        console.error("Training assignment notification error:", notifErr);
      }

      res.status(201).json(assignment);
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Atama oluşturulamadı" });
    }
  });

  // POST /api/training/assignments/:id/complete - Mark assignment complete with score
  router.post('/api/training/assignments/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { score, timeSpentSeconds, notes } = req.body;
      
      const assignment = await storage.getTrainingAssignments({ userId: req.user.id });
      const target = assignment.find((a) => a.id === parseInt(id));
      if (!target) return res.status(404).json({ message: "Atama bulunamadı" });

      // Create completion record
      const completion = await storage.createTrainingCompletion({
        assignmentId: parseInt(id),
        userId: req.user.id,
        materialId: target.materialId,
        status: score >= 70 ? 'passed' : 'failed',
        score,
        timeSpentSeconds,
        notes,
        completedAt: new Date(),
      });

      // Update assignment status
      await storage.updateTrainingAssignmentStatus(parseInt(id), 'completed');

      // SCORE INTEGRATION: Increase performance score on training completion
      if (score >= 70) {
        try {
          const user = await storage.getUser(req.user.id);
          if (user?.branchId) {
            await storage.recordPerformanceScore({
              branchId: user.branchId,
              userId: req.user.id,
              date: new Date(),
              taskScore: score / 100 * 20, // Eğitim puanı
              photoScore: 0,
              timeScore: 0,
              supervisorScore: 0,
            });
          }
        } catch (e) {
          console.error("Score recording failed:", e);
        }
      }
      
      res.json({ completion, assignment: target });
    } catch (error: unknown) {
      res.status(400).json({ message: error.message || "Tamamlanmadı" });
    }
  });

  // GET /api/training/progress/:userId - Get user's training progress
  router.get('/api/training/progress/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const progress = await storage.getUserTrainingProgress(userId);
      const assignments = await storage.getTrainingAssignments({ userId });
      const completions = await storage.getTrainingCompletions({ userId });
      
      res.json({
        summary: progress,
        assignments,
        completions,
        averageScore: completions.length > 0 
          ? Math.round(completions.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / completions.length)
          : 0,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchTrainingProgress");
    }
  });

  // GET /api/training/stats - Training statistics for HQ/Supervisor
  router.get('/api/training/stats', isAuthenticated, async (req, res) => {
    try {
      if (!hasPermission(req.user.role, 'training', 'view')) {
        return res.status(403).json({ message: "İzniniz yok" });
      }

      const allAssignments = await storage.getTrainingAssignments();
      const allCompletions = await storage.getTrainingCompletions();

      const stats = {
        totalAssigned: allAssignments.length,
        completed: allCompletions.filter((c) => c.status === 'passed').length,
        inProgress: allAssignments.filter((a) => a.status === 'in_progress').length,
        overdue: allAssignments.filter((a) => a.status === 'overdue').length,
        averageScore: allCompletions.length > 0
          ? Math.round(allCompletions.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / allCompletions.length)
          : 0,
        byRole: {} ,
      };

      // Group by role
      const roleStats = new Map<string, any>();
      allAssignments.forEach((a) => {
        const key = a.targetRole || 'unassigned';
        if (!roleStats.has(key)) {
          roleStats.set(key, { assigned: 0, completed: 0 });
        }
        roleStats.get(key).assigned++;
        const completed = allCompletions.filter((c) => c.assignmentId === a.id && c.status === 'passed').length;
        if (completed) roleStats.get(key).completed += completed;
      });
      stats.byRole = Object.fromEntries(roleStats);

      res.json(stats);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchTrainingStats");
    }
  });


  // ========================================
  // TRAINING MODULE COMPLETION
  // ========================================
  
  // POST /api/training/modules/ai-generate - Generate module with AI
  router.post('/api/training/modules/ai-generate', isAuthenticated, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ message: "Prompt gerekli" });

      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          title: z.string(),
          description: z.string(),
          level: z.enum(['beginner', 'intermediate', 'advanced']),
          estimatedDuration: z.number(),
          learningObjectives: z.array(z.string()),
          steps: z.array(z.object({
            stepNumber: z.number(),
            title: z.string(),
            content: z.string(),
          })),
        }),
        prompt: `Bir eğitim modülü oluştur: ${prompt}. JSON olarak dön.`,
      });

      const created = await storage.createTrainingModule({
        title: object.title,
        description: object.description,
        level: object.level,
        estimatedDuration: object.estimatedDuration,
        isActive: true,
        isPublished: false,
        learningObjectives: object.learningObjectives,
        steps: object.steps,
      });

      res.json(created);
    } catch (error: unknown) {
      console.error("AI module generation error:", error);
      res.status(500).json({ message: "Modül oluşturulamadı" });
    }
  });
  
  // POST /api/training/modules/:id/complete - Mark module as completed
  router.post('/api/training/modules/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const moduleId = parseInt(id);
      const userId = req.user.id;
      const { quizScore, quizPercentage } = req.body || {};

      if (!moduleId) return res.status(400).json({ message: "Mod\u00fcl ID gerekli" });

      // Record training progress with quiz score
      try {
        await storage.createOrUpdateUserTrainingProgress({
          userId,
          moduleId,
          status: 'completed',
          completedAt: new Date(),
          score: quizPercentage || quizScore || 100,
        });
      } catch {
        // Continue even if progress recording fails
      }

      // Get module details for badge assignment
      const modules = await storage.getTrainingModules();
      const module = modules.find(m => m.id === moduleId);
      
      let awardedBadge = null;
      if (module) {
        // Award career badge based on module level
        const badgeMap: Record<string, string> = {
          'beginner': 'coffee_cherry',
          'intermediate': 'green_bean',
          'advanced': 'bean_expert',
        };
        
        const badgeKey = badgeMap[module.level] || 'coffee_cherry';
        const allBadges = await db.select().from(badges).where(eq(badges.badgeKey, badgeKey));
        
        if (allBadges.length > 0) {
          const badge = allBadges[0];
          const existingUserBadgeList = await db.select().from(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)));
          
          if (!existingUserBadgeList || existingUserBadgeList.length === 0) {
            const newUserBadge = await db.insert(userBadges).values({
              userId,
              badgeId: badge.id,
              progress: 100,
            }).returning();
            awardedBadge = newUserBadge[0];
          }
        }
      }

      try {
        await storage.addCompletedModuleToCareerProgress(userId, moduleId);
      } catch (chainError) {
        console.error("Career progress update error:", chainError);
      }

      res.json({ 
        message: "Modül tamamlandı",
        badge: awardedBadge,
        module 
      });
    } catch (error: unknown) {
      console.error('Module completion error:', error);
      res.status(400).json({ message: error.message || "Modül tamamlanamadı" });
    }
  });

  // GET /api/training/user-modules-stats - Get user's completed modules count
  router.get('/api/training/user-modules-stats', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const allModules = await storage.getTrainingModules();
      const userProgress = await storage.getUserTrainingProgress(userId);
      
      const completedCount = userProgress.filter((p) => p.status === 'completed').length;
      const totalCount = allModules.length;
      
      res.json({
        completedCount,
        totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      });
    } catch (error: unknown) {
      res.json({ completedCount: 0, totalCount: 0, percentage: 0 });
    }
  });

  // GET /api/training/modules/:id/completion-status - Get module completion status and earned badges
  router.get('/api/training/modules/:id/completion-status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const moduleId = parseInt(id);
      const userId = req.user.id;

      const progress = await storage.getUserTrainingProgress(userId, moduleId);
      const userBadgeList = await storage.getUserBadges(userId);

      res.json({
        completed: progress && progress.status === 'completed',
        completedAt: progress?.completedAt,
        badges: userBadgeList,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchModuleProgress");
    }
  });


  // PATCH /api/admin/update-employee-terminations - Update termination dates for existing employees
  // POST /api/admin/import-employees - Import employees from data
  // ========================================
  // İŞE ALIM MODÜLÜ - Job Positions, Applications, Interviews
  // ========================================

  // GET /api/job-positions - List all job positions
  router.get('/api/job-positions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { status, branchId } = req.query;

      // Only HQ/admin and supervisors can view job positions
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'İşe alım bilgilerine erişim yetkiniz yok' });
      }

      // Build query with drizzle
      let positions = await db.select().from(jobPositions).orderBy(desc(jobPositions.createdAt));

      // Filter by status
      if (status && status !== 'all') {
        positions = positions.filter(p => p.status === status);
      }

      // Supervisors can only see their branch positions
      if (user.role === 'supervisor' && user.branchId) {
        positions = positions.filter(p => p.branchId === user.branchId);
      } else if (branchId && branchId !== 'all') {
        positions = positions.filter(p => p.branchId === parseInt(branchId as string));
      }

      // Get branches and users for name lookup
      const branchList = await db.select().from(branches);
      const userList = await db.select().from(users);
      const applications = await db.select().from(jobApplications);

      // Enrich positions with branch name and counts
      const enrichedPositions = positions.map(p => ({
        ...p,
        branchName: branchList.find(b => b.id === p.branchId)?.name || null,
        createdByName: userList.find(u => u.id === p.createdById)?.firstName + ' ' + userList.find(u => u.id === p.createdById)?.lastName,
        assignedToName: p.assignedToId ? userList.find(u => u.id === p.assignedToId)?.firstName + ' ' + userList.find(u => u.id === p.assignedToId)?.lastName : null,
        applicationCount: applications.filter(a => a.positionId === p.id).length,
      }));
      
      res.json(enrichedPositions);
    } catch (error: unknown) {
      console.error("Error fetching job positions:", error);
      res.status(500).json({ message: "Pozisyonlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/job-positions - Create a new job position
  router.post('/api/job-positions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      // Only HQ/admin can create positions
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Pozisyon oluşturma yetkiniz yok' });
      }

      const data = {
        ...req.body,
        createdById: user.id,
      };

      const result = await db.insert(jobPositions).values(data).returning();
      res.status(201).json(result[0]);
    } catch (error: unknown) {
      console.error("Error creating job position:", error);
      res.status(500).json({ message: "Pozisyon oluşturulurken hata oluştu" });
    }
  });

  // GET /api/job-positions/:id - Get single job position
  router.get('/api/job-positions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'İşe alım bilgilerine erişim yetkiniz yok' });
      }

      const result = await db.select().from(jobPositions).where(eq(jobPositions.id, id));
      if (result.length === 0) {
        return res.status(404).json({ message: 'Pozisyon bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error fetching job position:", error);
      res.status(500).json({ message: "Pozisyon yüklenirken hata oluştu" });
    }
  });

  // PATCH /api/job-positions/:id - Update job position
  router.patch('/api/job-positions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Pozisyon güncelleme yetkiniz yok' });
      }

      const result = await db.update(jobPositions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(jobPositions.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Pozisyon bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error updating job position:", error);
      res.status(500).json({ message: "Pozisyon güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/job-positions/:id - Delete job position
  router.delete('/api/job-positions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Pozisyon silme yetkiniz yok' });
      }

      await db.update(jobPositions).set({ deletedAt: new Date() }).where(eq(jobPositions.id, id));
      const ctx = getAuditContext(req);
      await createAuditEntry(ctx, {
        eventType: "data.soft_delete",
        action: "soft_delete",
        resource: "job_positions",
        resourceId: String(id),
        details: { softDelete: true },
      });
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting job position:", error);
      res.status(500).json({ message: "Pozisyon silinirken hata oluştu" });
    }
  });

  // POST /api/job-positions/:id/close - Close job position and send rejection emails
  router.post('/api/job-positions/:id/close', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { selectedApplicationId, closedReason } = req.body;

      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Pozisyon kapatma yetkiniz yok' });
      }

      // Close position
      await db.update(jobPositions)
        .set({ 
          status: 'closed', 
          selectedApplicationId: selectedApplicationId || null,
          closedAt: new Date(),
          closedReason: closedReason || 'cancelled',
          updatedAt: new Date() 
        })
        .where(eq(jobPositions.id, id));

      // Send rejection emails to all non-hired candidates
      const rejectionCandidates = await db.select()
        .from(jobApplications)
        .where(and(
          eq(jobApplications.positionId, id),
          ...(selectedApplicationId ? [sql`${jobApplications.id} != ${selectedApplicationId}`] : [])
        ));

      const [position] = await db.select().from(jobPositions).where(eq(jobPositions.id, id));

      for (const candidate of rejectionCandidates) {
        if (candidate.email && candidate.status !== 'hired') {
          try {
            let emailBody = `Sayın ${candidate.fullName},\n\n`;
            
            if (closedReason === 'hired') {
              emailBody += `DOSPRESSO ailesine olan ilginiz ve ${position?.title || 'açık pozisyon'} için başvurunuz için teşekkür ederiz.\n\nMaalesef bu pozisyon için başka bir adayla ilerlemekten karar verdik.\n\n`;
            } else if (closedReason === 'no_candidates') {
              emailBody += `DOSPRESSO ailesine olan ilginiz için teşekkür ederiz.\n\n${position?.title || 'Açık pozisyon'} pozisyonu iptal edilmiştir.\n\n`;
            } else {
              emailBody += `DOSPRESSO ailesine olan ilginiz için teşekkür ederiz.\n\n${position?.title || 'Açık pozisyon'} pozisyonu kapatılmıştır.\n\n`;
            }

            emailBody += `Gösterdiğiniz ilgi ve ayırdığınız zaman için teşekkür ederiz.\n\nBaşarılar dileriz,\nDOSPRESSO İnsan Kaynakları Ekibi`;

            await sendNotificationEmail(
              candidate.email,
              'DOSPRESSO - Başvuru Sonucu',
              emailBody
            );
          } catch (emailError) {
            console.error(`Failed to send rejection email to ${candidate.email}:`, emailError);
          }
        }
      }

      res.json({ success: true, message: 'Pozisyon kapatıldı ve ret mailleri gönderildi' });
    } catch (error: unknown) {
      console.error("Error closing job position:", error);
      res.status(500).json({ message: "Pozisyon kapatılırken hata oluştu" });
    }
  });


  // GET /api/interviews - List all interviews
  router.get('/api/interviews', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { applicationId, status } = req.query;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Mülakat bilgilerine erişim yetkiniz yok' });
      }

      let query = db.select()
        .from(interviews)
        .leftJoin(jobApplications, eq(interviews.applicationId, jobApplications.id))
        .leftJoin(jobPositions, eq(jobApplications.positionId, jobPositions.id));
      
      if (applicationId) {
        query = query.where(eq(interviews.applicationId, parseInt(applicationId as string)));
      }
      if (status && status !== 'all') {
        query = query.where(eq(interviews.status, status as string));
      }

      // Supervisor: only see their branch's interviews
      if (user.role === 'supervisor' && user.branchId) {
        query = query.where(eq(jobPositions.branchId, user.branchId));
      }

      const results = await query.orderBy(desc(interviews.scheduledDate));
      // Extract just the interviews part
      const interviewList = results.map(r => r.interviews);
      res.json(interviewList);
    } catch (error: unknown) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Mülakatlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/interviews - Create a new interview
  router.post('/api/interviews', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Mülakat oluşturma yetkiniz yok' });
      }

      // Convert scheduledDate string to Date object
      const data = {
        ...req.body,
        createdById: user.id,
        scheduledDate: typeof req.body.scheduledDate === 'string' 
          ? new Date(req.body.scheduledDate)
          : req.body.scheduledDate,
      };

      const result = await db.insert(interviews).values(data).returning();
      
      // Update application status to interview_scheduled
      await db.update(jobApplications)
        .set({ status: 'interview_scheduled', updatedAt: new Date() })
        .where(eq(jobApplications.id, data.applicationId));

      res.status(201).json(result[0]);
    } catch (error: unknown) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Mülakat oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/interviews/:id - Update interview
  router.patch('/api/interviews/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Mülakat güncelleme yetkiniz yok' });
      }

      const result = await db.update(interviews)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(interviews.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Mülakat bulunamadı' });
      }

      // If interview completed, update application status
      if (req.body.status === 'completed') {
        const interview = result[0];
        await db.update(jobApplications)
          .set({ status: 'interview_completed', updatedAt: new Date() })
          .where(eq(jobApplications.id, interview.applicationId));
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error updating interview:", error);
      res.status(500).json({ message: "Mülakat güncellenirken hata oluştu" });
    }
  });


  // POST /api/interviews/:id/start - Start interview (change status to in_progress)
  router.post('/api/interviews/:id/start', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }

      const id = parseInt(req.params.id);
      const result = await db.update(interviews)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(interviews.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Mülakat bulunamadı' });
      }
      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Mülakat başlatılırken hata oluştu" });
    }
  });

  // GET /api/interviews/:id/responses - Get all responses for an interview
  router.get('/api/interviews/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }

      const interviewId = parseInt(req.params.id);
      const rawResponses = await db.select()
        .from(interviewResponses)
        .leftJoin(interviewQuestions, eq(interviewResponses.questionId, interviewQuestions.id))
        .where(eq(interviewResponses.interviewId, interviewId))
        .orderBy(interviewQuestions.orderIndex);

      // Flatten the join result for frontend consumption
      const flatResponses = rawResponses.map(row => ({
        id: row.interviewResponses.id,
        interviewId: row.interviewResponses.interviewId,
        questionId: row.interviewResponses.questionId,
        answer: row.interviewResponses.answer,
        score: row.interviewResponses.score,
        notes: row.interviewResponses.notes,
        createdAt: row.interviewResponses.createdAt,
        questionText: row.interviewQuestions?.question,
        questionCategory: row.interviewQuestions?.category,
      }));

      res.json(flatResponses);
    } catch (error: unknown) {
      console.error("Error fetching interview responses:", error);
      res.status(500).json({ message: "Mülakat cevapları yüklenirken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/respond - Add or update a response
  router.post('/api/interviews/:id/respond', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }

      const interviewId = parseInt(req.params.id);
      const { questionId, answer, score, notes } = req.body;

      // Check if response exists for this question
      const existing = await db.select()
        .from(interviewResponses)
        .where(and(
          eq(interviewResponses.interviewId, interviewId),
          eq(interviewResponses.questionId, questionId)
        ));

      let result;
      if (existing.length > 0) {
        // Update existing
        result = await db.update(interviewResponses)
          .set({ answer, score, notes })
          .where(eq(interviewResponses.id, existing[0].id))
          .returning();
      } else {
        // Create new
        result = await db.insert(interviewResponses)
          .values({ interviewId, questionId, answer, score, notes })
          .returning();
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error saving interview response:", error);
      res.status(500).json({ message: "Cevap kaydedilirken hata oluştu" });
    }
  });

  // PATCH /api/interviews/:id/result - Update interview result (pending/positive/finalist/negative)
  router.patch('/api/interviews/:id/result', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { result } = req.body;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Mülakat sonucu güncelleme yetkiniz yok' });
      }

      if (!['pending', 'positive', 'finalist', 'negative'].includes(result)) {
        return res.status(400).json({ message: 'Geçersiz sonuç tipi' });
      }

      const updateData: any = {
        result,
        status: 'completed',
        updatedAt: new Date(),
      };

      const resultData = await db.update(interviews)
        .set(updateData)
        .where(eq(interviews.id, id))
        .returning();

      if (resultData.length === 0) {
        return res.status(404).json({ message: 'Mülakat bulunamadı' });
      }

      // Update application status based on result
      const interview = resultData[0];
      if (interview.applicationId) {
        let appStatus = 'interview_completed';
        if (result === 'positive') appStatus = 'offered';
        else if (result === 'finalist') appStatus = 'finalist';
        else if (result === 'negative') appStatus = 'rejected';

        await db.update(jobApplications)
          .set({ status: appStatus, updatedAt: new Date() })
          .where(eq(jobApplications.id, interview.applicationId));
      }

      res.json(resultData[0]);
    } catch (error: unknown) {
      console.error("Error updating interview result:", error);
      res.status(500).json({ message: "Mülakat sonucu güncellenirken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/complete - Complete interview with overall result
  router.post('/api/interviews/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }

      const id = parseInt(req.params.id);
      const { result: interviewResult, overallNotes, overallScore } = req.body;

      const updateData: any = {
        status: 'completed',
        result: interviewResult || 'pending',
        updatedAt: new Date(),
      };
      if (overallNotes) updateData.notes = overallNotes;
      if (overallScore) updateData.score = overallScore;

      const result = await db.update(interviews)
        .set(updateData)
        .where(eq(interviews.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Mülakat bulunamadı' });
      }

      // Update application status based on result
      const interview = result[0];
      if (interview.applicationId) {
        let appStatus = 'interviewed';
        if (interviewResult === 'passed') appStatus = 'offered';
        else if (interviewResult === 'failed') appStatus = 'rejected';

        await db.update(jobApplications)
          .set({ status: appStatus, updatedAt: new Date() })
          .where(eq(jobApplications.id, interview.applicationId));
      }

      res.json(result[0]);
    } catch (error: unknown) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Mülakat tamamlanırken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/hire - Hire candidate and send rejection emails to others
  router.post('/api/interviews/:id/hire', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ işe alım yapabilir' });
      }

      const id = parseInt(req.params.id);

      // Get the interview with application info
      const [interview] = await db.select()
        .from(interviews)
        .where(eq(interviews.id, id));

      if (!interview) {
        return res.status(404).json({ message: 'Mülakat bulunamadı' });
      }

      // Get the application
      const [application] = await db.select()
        .from(jobApplications)
        .where(eq(jobApplications.id, interview.applicationId!));

      if (!application) {
        return res.status(404).json({ message: 'Başvuru bulunamadı' });
      }

      // Update the hired application status
      await db.update(jobApplications)
        .set({ status: 'hired', updatedAt: new Date() })
        .where(eq(jobApplications.id, application.id));

      // Update interview result
      await db.update(interviews)
        .set({ result: 'passed', status: 'completed', updatedAt: new Date() })
        .where(eq(interviews.id, id));

      // Get other applications for the same position
      const otherApplications = await db.select()
        .from(jobApplications)
        .where(and(
          eq(jobApplications.positionId, application.positionId),
          sql`${jobApplications.id} != ${application.id}`,
          sql`${jobApplications.status} NOT IN ('hired', 'rejected', 'withdrawn')`
        ));

      // Send rejection emails to other candidates
      for (const otherApp of otherApplications) {
        // Update status to rejected
        await db.update(jobApplications)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(eq(jobApplications.id, otherApp.id));

        // Get position info for email
        const [position] = await db.select()
          .from(jobPositions)
          .where(eq(jobPositions.id, otherApp.positionId));

        // Send rejection email
        if (otherApp.email) {
          try {
            await sendNotificationEmail(
              otherApp.email,
              `DOSPRESSO - Başvuru Sonucu`,
              `Sayın ${otherApp.fullName},

DOSPRESSO ailesine olan ilginiz ve ${position?.title || 'açık pozisyon'} için başvurunuz için teşekkür ederiz.

Başvurunuzu dikkatle değerlendirdik. Maalesef bu pozisyon için başka bir adayla ilerlemekten karar verdik.

Gösterdiğiniz ilgi ve ayırdığınız zaman için teşekkür ederiz. Gelecekteki fırsatlar için sizi değerlendirmekten memnuniyet duyarız.

Başarılar dileriz,
DOSPRESSO İnsan Kaynakları Ekibi`
            );
          } catch (emailError) {
            console.error(`Failed to send rejection email to ${otherApp.email}:`, emailError);
          }
        }
      }

      // Close the position
      await db.update(jobPositions)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(jobPositions.id, application.positionId));

      res.json({
        success: true,
        hiredCandidate: application.fullName,
        rejectedCount: otherApplications.length,
        message: `${application.fullName} işe alındı. ${otherApplications.length} diğer adaya ret maili gönderildi.`
      });
    } catch (error: unknown) {
      console.error("Error hiring candidate:", error);
      res.status(500).json({ message: "İşe alım sırasında hata oluştu" });
    }
  });

  // ========== MAAŞ YÖNETİMİ API'LERİ ==========

  // Maaş görüntüleme yetki kontrol fonksiyonu
  const canViewSalary = (viewerRole: string, targetUserId: string, viewerUserId: string, viewerBranchId: number | null, targetBranchId: number | null): boolean => {
    // Admin ve muhasebe her maaşı görebilir
    if (viewerRole === 'admin' || viewerRole === 'muhasebe') return true;
    // Yatırımcı sadece kendi şubesindeki personelin maaşını görebilir
    if (viewerRole === 'yatirimci_branch') {
      return viewerBranchId === targetBranchId;
    }
    // Diğer roller maaş göremez
    return false;
  };

  // GET /api/salary/deduction-types - Kesinti tiplerini getir
  router.get('/api/salary/deduction-types', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'yatirimci_branch') {
        return res.status(403).json({ message: "Kesinti tiplerine erişim yetkiniz yok" });
      }
      const types = await db.select().from(salaryDeductionTypes).where(eq(salaryDeductionTypes.isActive, true));
      res.json(types);
    } catch (error: unknown) {
      console.error("Get deduction types error:", error);
      res.status(500).json({ message: "Kesinti tipleri alınamadı" });
    }
  });

  // POST /api/salary/deduction-types - Yeni kesinti tipi oluştur (sadece admin)
  router.post('/api/salary/deduction-types', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Kesinti tipi oluşturma yetkiniz yok" });
      }
      const validated = insertSalaryDeductionTypeSchema.parse(req.body);
      const [newType] = await db.insert(salaryDeductionTypes).values(validated).returning();
      res.json(newType);
    } catch (error: unknown) {
      console.error("Create deduction type error:", error);
      res.status(500).json({ message: "Kesinti tipi oluşturulamadı" });
    }
  });

  // GET /api/salary/employee/:userId - Personelin maaş bilgilerini getir
  router.get('/api/salary/employee/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;

      // Hedef kullanıcıyı al
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Yetki kontrolü
      if (!canViewSalary(user.role, targetUserId, user.id, user.branchId, targetUser.branchId)) {
        return res.status(403).json({ message: "Maaş bilgilerine erişim yetkiniz yok" });
      }

      // Aktif maaş kaydını getir
      const [salary] = await db.select().from(employeeSalaries)
        .where(and(
          eq(employeeSalaries.userId, targetUserId),
          eq(employeeSalaries.isActive, true)
        ))
        .orderBy(desc(employeeSalaries.effectiveFrom))
        .limit(1);

      res.json(salary || null);
    } catch (error: unknown) {
      console.error("Get employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgileri alınamadı" });
    }
  });

  // POST /api/salary/employee - Personele maaş bilgisi ekle
  router.post('/api/salary/employee', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Maaş bilgisi ekleme yetkiniz yok" });
      }

      const validated = insertEmployeeSalarySchema.parse({
        ...req.body,
        createdById: user.id,
      });

      // Mevcut aktif kaydı pasif yap
      await db.update(employeeSalaries)
        .set({ isActive: false, effectiveTo: new Date().toISOString().split('T')[0] })
        .where(and(
          eq(employeeSalaries.userId, validated.userId),
          eq(employeeSalaries.isActive, true)
        ));

      const [newSalary] = await db.insert(employeeSalaries).values(validated).returning();
      res.json(newSalary);
    } catch (error: unknown) {
      console.error("Create employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgisi eklenemedi" });
    }
  });

  // PATCH /api/salary/employee/:id - Maaş bilgisini güncelle
  router.patch('/api/salary/employee/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Maaş bilgisi güncelleme yetkiniz yok" });
      }

      const salaryId = parseInt(req.params.id);
      const updates = req.body;

      const [updated] = await db.update(employeeSalaries)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(employeeSalaries.id, salaryId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Maaş kaydı bulunamadı" });
      }
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgisi güncellenemedi" });
    }
  });

  // GET /api/salary/deductions/:userId - Personelin kesintilerini getir
  router.get('/api/salary/deductions/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      const { month, year } = req.query;

      // Hedef kullanıcıyı al
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Yetki kontrolü
      if (!canViewSalary(user.role, targetUserId, user.id, user.branchId, targetUser.branchId)) {
        return res.status(403).json({ message: "Kesinti bilgilerine erişim yetkiniz yok" });
      }

      // Kesintileri getir
      let whereConditions = [eq(salaryDeductions.userId, targetUserId)];
      if (month && year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(parseInt(month as string) + 1).padStart(2, '0')}-01`;
        whereConditions.push(sql`${salaryDeductions.referenceDate} >= ${startDate}`);
        whereConditions.push(sql`${salaryDeductions.referenceDate} < ${endDate}`);
      }

      const deductions = await db.select({
        deduction: salaryDeductions,
        typeName: salaryDeductionTypes.name,
        typeCode: salaryDeductionTypes.code,
      }).from(salaryDeductions)
        .leftJoin(salaryDeductionTypes, eq(salaryDeductions.deductionTypeId, salaryDeductionTypes.id))
        .where(and(...whereConditions))
        .orderBy(desc(salaryDeductions.referenceDate));

      res.json(deductions);
    } catch (error: unknown) {
      console.error("Get salary deductions error:", error);
      res.status(500).json({ message: "Kesinti bilgileri alınamadı" });
    }
  });

  // POST /api/salary/deductions - Manuel kesinti ekle
  router.post('/api/salary/deductions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik' && user.role !== 'yatirimci_branch') {
        return res.status(403).json({ message: "Kesinti ekleme yetkiniz yok" });
      }

      // Yatırımcı sadece kendi şubesine kesinti ekleyebilir
      if (user.role === 'yatirimci_branch') {
        const [targetUser] = await db.select().from(users).where(eq(users.id, req.body.userId));
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu personele kesinti ekleme yetkiniz yok" });
        }
      }

      const validated = insertSalaryDeductionSchema.parse({
        ...req.body,
        createdById: user.id,
        isAutomatic: false,
      });

      const [newDeduction] = await db.insert(salaryDeductions).values(validated).returning();
      res.json(newDeduction);
    } catch (error: unknown) {
      console.error("Create salary deduction error:", error);
      res.status(500).json({ message: "Kesinti eklenemedi" });
    }
  });

  // DELETE /api/salary/deductions/:id - Kesinti sil (sadece onaysız olanlar)
  router.delete('/api/salary/deductions/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Kesinti silme yetkiniz yok" });
      }

      const deductionId = parseInt(req.params.id);
      const [deduction] = await db.select().from(salaryDeductions).where(eq(salaryDeductions.id, deductionId));
      
      if (!deduction) {
        return res.status(404).json({ message: "Kesinti bulunamadı" });
      }
      if (deduction.status === 'approved') {
        return res.status(400).json({ message: "Onaylanmış kesinti silinemez" });
      }

      await db.delete(salaryDeductions).where(eq(salaryDeductions.id, deductionId));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete salary deduction error:", error);
      res.status(500).json({ message: "Kesinti silinemedi" });
    }
  });

  // GET /api/salary/payroll/:userId - Personelin bordro geçmişini getir
  router.get('/api/salary/payroll/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      const { year } = req.query;

      // Hedef kullanıcıyı al
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Yetki kontrolü
      if (!canViewSalary(user.role, targetUserId, user.id, user.branchId, targetUser.branchId)) {
        return res.status(403).json({ message: "Bordro bilgilerine erişim yetkiniz yok" });
      }

      let whereConditions = [eq(monthlyPayrolls.userId, targetUserId)];
      if (year) {
        whereConditions.push(eq(monthlyPayrolls.year, parseInt(year as string)));
      }

      const payrolls = await db.select().from(monthlyPayrolls)
        .where(and(...whereConditions))
        .orderBy(desc(monthlyPayrolls.year), desc(monthlyPayrolls.month));

      res.json(payrolls);
    } catch (error: unknown) {
      console.error("Get payroll history error:", error);
      res.status(500).json({ message: "Bordro geçmişi alınamadı" });
    }
  });

  // POST /api/salary/payroll/calculate - Aylık bordro hesapla
  router.post('/api/salary/payroll/calculate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Bordro hesaplama yetkiniz yok" });
      }

      const { userId, month, year } = req.body;

      // Maaş bilgisini al
      const [salary] = await db.select().from(employeeSalaries)
        .where(and(
          eq(employeeSalaries.userId, userId),
          eq(employeeSalaries.isActive, true)
        ));

      if (!salary) {
        return res.status(400).json({ message: "Personelin aktif maaş kaydı bulunamadı" });
      }

      const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Ay içindeki kesintileri al
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const deductions = await db.select().from(salaryDeductions)
        .leftJoin(salaryDeductionTypes, eq(salaryDeductions.deductionTypeId, salaryDeductionTypes.id))
        .where(and(
          eq(salaryDeductions.userId, userId),
          sql`${salaryDeductions.referenceDate} >= ${startDate}`,
          sql`${salaryDeductions.referenceDate} < ${endDate}`
        ));

      // Kesintileri kategorilere ayır
      let lateDeductions = 0;
      let absenceDeductions = 0;
      let unpaidLeaveDeductions = 0;
      let sickLeaveDeductions = 0;
      let otherDeductions = 0;

      for (const d of deductions) {
        const typeCode = d.salary_deduction_types?.code || '';
        const amount = d.salary_deductions.amount || 0;

        if (typeCode === 'late_arrival' || typeCode === 'early_leave') {
          lateDeductions += amount;
        } else if (typeCode === 'absence') {
          absenceDeductions += amount;
        } else if (typeCode === 'unpaid_leave') {
          unpaidLeaveDeductions += amount;
        } else if (typeCode === 'sick_leave_no_report') {
          sickLeaveDeductions += amount;
        } else {
          otherDeductions += amount;
        }
      }

      const totalDeductions = lateDeductions + absenceDeductions + unpaidLeaveDeductions + sickLeaveDeductions + otherDeductions;

      // Çalışılan günleri hesapla (shiftAttendance kayıtlarından)
      const attendanceRecords = await db.select()
        .from(shiftAttendance)
        .leftJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
        .where(and(
          eq(shiftAttendance.userId, userId),
          sql`${shifts.shiftDate} >= ${startDate}`,
          sql`${shifts.shiftDate} < ${endDate}`,
          or(
            eq(shiftAttendance.status, 'checked_out'),
            eq(shiftAttendance.status, 'checked_in')
          )
        ));
      
      // Benzersiz çalışılan günleri say
      const workedDaysSet = new Set(attendanceRecords.map(r => r.shifts?.shiftDate));
      const calculatedWorkedDays = workedDaysSet.size;
      
      // Toplam çalışılan dakikayı hesapla
      const totalWorkedMinutes = attendanceRecords.reduce((sum, r) => {
        return sum + (r.shift_attendance.totalWorkedMinutes || 0);
      }, 0);

      // Fazla mesai hesapla (onaylanmış overtimeRequests'lerden)
      const periodStr = `${year}-${String(month).padStart(2, '0')}`;
      const overtimeRecords = await db.select()
        .from(overtimeRequests)
        .where(and(
          eq(overtimeRequests.userId, userId),
          eq(overtimeRequests.status, 'approved'),
          eq(overtimeRequests.appliedToPeriod, periodStr)
        ));
      
      const totalOvertimeMinutes = overtimeRecords.reduce((sum, r) => {
        return sum + (r.approvedMinutes || 0);
      }, 0);
      const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 10) / 10; // 1 ondalık basamak
      
      // Fazla mesai ücreti hesapla (1.5x saatlik ücret)
      const hourlyRate = Math.round(salary.baseSalary / (salary.weeklyHours * 4.33));
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);

      // Vergi ve sigorta hesapla
      const grossSalary = salary.baseSalary + overtimePay;
      const taxRate = parseFloat(salary.taxRate || '0') / 100;
      const insuranceRate = parseFloat(salary.insuranceRate || '0') / 100;
      const taxAmount = Math.round(grossSalary * taxRate);
      const insuranceEmployee = Math.round(grossSalary * insuranceRate);
      const netSalary = grossSalary - totalDeductions - taxAmount - insuranceEmployee;

      // Bordro oluştur veya güncelle
      const payrollData = {
        userId,
        branchId: targetUser.branchId,
        month,
        year,
        baseSalary: salary.baseSalary,
        workedDays: calculatedWorkedDays,
        workedHours: Math.round(totalWorkedMinutes / 60),
        overtimeHours,
        overtimePay,
        totalDeductions,
        lateDeductions,
        absenceDeductions,
        unpaidLeaveDeductions,
        sickLeaveDeductions,
        otherDeductions,
        taxAmount,
        insuranceEmployee,
        insuranceEmployer: 0,
        unemploymentInsurance: 0,
        grossSalary,
        netSalary,
        status: 'calculated' as const,
        calculatedAt: new Date(),
        createdById: user.id,
      };

      // Mevcut kayıt var mı kontrol et
      const [existing] = await db.select().from(monthlyPayrolls)
        .where(and(
          eq(monthlyPayrolls.userId, userId),
          eq(monthlyPayrolls.month, month),
          eq(monthlyPayrolls.year, year)
        ));

      let payroll;
      if (existing) {
        [payroll] = await db.update(monthlyPayrolls)
          .set({ ...payrollData, updatedAt: new Date() })
          .where(eq(monthlyPayrolls.id, existing.id))
          .returning();
      } else {
        [payroll] = await db.insert(monthlyPayrolls).values(payrollData).returning();
      }

      res.json(payroll);
    } catch (error: unknown) {
      console.error("Calculate payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });

  // POST /api/salary/payroll/:id/approve - Bordro onayla
  router.post('/api/salary/payroll/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Bordro onaylama yetkiniz yok" });
      }

      const payrollId = parseInt(req.params.id);
      const [updated] = await db.update(monthlyPayrolls)
        .set({
          status: 'approved',
          approvedById: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(monthlyPayrolls.id, payrollId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Bordro bulunamadı" });
      }
      res.json(updated);
    } catch (error: unknown) {
      console.error("Approve payroll error:", error);
      res.status(500).json({ message: "Bordro onaylanamadı" });
    }
  });

  // POST /api/salary/payroll/:id/pay - Bordro ödendi olarak işaretle
  router.post('/api/salary/payroll/:id/pay', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Ödeme işlemi yetkiniz yok" });
      }

      const payrollId = parseInt(req.params.id);
      const { paymentReference } = req.body;

      const [updated] = await db.update(monthlyPayrolls)
        .set({
          status: 'paid',
          paidAt: new Date(),
          paymentReference,
          updatedAt: new Date(),
        })
        .where(eq(monthlyPayrolls.id, payrollId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Bordro bulunamadı" });
      }
      res.json(updated);
    } catch (error: unknown) {
      console.error("Mark paid error:", error);
      res.status(500).json({ message: "Ödeme işlemi yapılamadı" });
    }
  });

  // GET /api/salary/branch/:branchId/summary - Şube maaş özeti
  router.get('/api/salary/branch/:branchId/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const branchId = parseInt(req.params.branchId);
      const { month, year } = req.query;

      // Yetki kontrolü
      if (user.role === 'yatirimci_branch' && user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu şubenin maaş özetine erişim yetkiniz yok" });
      }
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'yatirimci_branch') {
        return res.status(403).json({ message: "Maaş özetine erişim yetkiniz yok" });
      }

      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      // Şube personellerinin bordro özetini al
      const payrolls = await db.select({
        payroll: monthlyPayrolls,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      }).from(monthlyPayrolls)
        .leftJoin(users, eq(monthlyPayrolls.userId, users.id))
        .where(and(
          eq(monthlyPayrolls.branchId, branchId),
          eq(monthlyPayrolls.month, currentMonth),
          eq(monthlyPayrolls.year, currentYear)
        ));

      // Özet istatistikler
      const summary = {
        branchId,
        month: currentMonth,
        year: currentYear,
        totalEmployees: payrolls.length,
        totalGrossSalary: payrolls.reduce((sum, p) => sum + (p.payroll.grossSalary || 0), 0),
        totalNetSalary: payrolls.reduce((sum, p) => sum + (p.payroll.netSalary || 0), 0),
        totalDeductions: payrolls.reduce((sum, p) => sum + (p.payroll.totalDeductions || 0), 0),
        totalTax: payrolls.reduce((sum, p) => sum + (p.payroll.taxAmount || 0), 0),
        statusBreakdown: {
          draft: payrolls.filter(p => p.payroll.status === 'draft').length,
          calculated: payrolls.filter(p => p.payroll.status === 'calculated').length,
          approved: payrolls.filter(p => p.payroll.status === 'approved').length,
          paid: payrolls.filter(p => p.payroll.status === 'paid').length,
        },
        employees: payrolls.map(p => ({
          ...p.payroll,
          userName: p.userName,
        })),
      };

      res.json(summary);
    } catch (error: unknown) {
      console.error("Get branch salary summary error:", error);
      res.status(500).json({ message: "Şube maaş özeti alınamadı" });
    }
  });

  // POST /api/salary/auto-deductions/calculate - Otomatik kesinti hesapla (geç kalma vb.)
  router.post('/api/salary/auto-deductions/calculate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Otomatik kesinti hesaplama yetkiniz yok" });
      }

      const { branchId, month, year } = req.body;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      // Geç kalma kesinti tipini al
      const [lateType] = await db.select().from(salaryDeductionTypes).where(eq(salaryDeductionTypes.code, 'late_arrival'));
      if (!lateType) {
        return res.status(400).json({ message: "Geç kalma kesinti tipi tanımlı değil" });
      }

      // Devam kayıtlarından geç kalmaları bul
      let attendanceQuery = db.select({
        attendance: shiftAttendance,
        userBranchId: users.branchId,
      }).from(shiftAttendance)
        .leftJoin(users, eq(shiftAttendance.userId, users.id))
        .where(and(
          sql`${shiftAttendance.checkInTime}::date >= ${startDate}::date`,
          sql`${shiftAttendance.checkInTime}::date < ${endDate}::date`,
          isNotNull(shiftAttendance.lateMinutes),
          sql`${shiftAttendance.lateMinutes} > 0`
        ));

      if (branchId) {
        attendanceQuery = attendanceQuery.where(eq(users.branchId, branchId)) as typeof attendanceQuery;
      }

      const lateAttendances = await attendanceQuery;
      let createdDeductions = 0;

      for (const record of lateAttendances) {
        const lateMinutes = record.attendance.lateMinutes || 0;
        if (lateMinutes <= 0) continue;

        // Bu kayıt için kesinti zaten var mı?
        const [existing] = await db.select().from(salaryDeductions)
          .where(and(
            eq(salaryDeductions.userId, record.attendance.userId),
            eq(salaryDeductions.referenceId, record.attendance.id),
            eq(salaryDeductions.referenceType, 'attendance')
          ));

        if (existing) continue;

        // Kesinti hesapla
        const perMinuteDeduction = lateType.perMinuteDeduction || 50; // 50 kuruş default
        const amount = lateMinutes * perMinuteDeduction;

        await db.insert(salaryDeductions).values({
          userId: record.attendance.userId,
          deductionTypeId: lateType.id,
          amount,
          reason: `${lateMinutes} dakika geç kalma`,
          referenceDate: new Date(record.attendance.checkInTime!).toISOString().split('T')[0],
          referenceType: 'attendance',
          referenceId: record.attendance.id,
          lateMinutes,
          isAutomatic: true,
          status: 'pending',
          createdById: user.id,
        });

        createdDeductions++;
      }

      res.json({ 
        success: true, 
        createdDeductions,
        message: `${createdDeductions} otomatik kesinti oluşturuldu` 
      });
    } catch (error: unknown) {
      console.error("Calculate auto deductions error:", error);
      res.status(500).json({ message: "Otomatik kesinti hesaplanamadı" });
    }
  });

  // ========== BORDRO PARAMETRELERİ API'LERİ ==========

  // Helper function to convert snake_case to camelCase
  const snakeToCamel = (str: string): string => 
    str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

  // Helper function to transform object keys from snake_case to camelCase
  const transformPayrollParams = (row) => {
    const result: any = {};
    for (const key in row) {
      result[snakeToCamel(key)] = row[key];
    }
    return result;
  };

  // Helper function to check if user has accounting access (dynamic permissions)
  const hasAccountingAccess = async (userRole: string): Promise<boolean> => {
    // Legacy default access roles
    if (userRole === 'admin' || userRole === 'muhasebe' || userRole === 'yatirimci_branch' || isHQRole(userRole as UserRoleType)) {
      return true;
    }
    // Check dynamic permissions for other roles
    const permissions = await storage.getRolePermissions();
    return permissions.some((p) => 
      p.role === userRole && p.module === 'accounting' && (p.actions || []).includes('view')
    );
  };

  // GET /api/payroll/parameters - Tüm bordro parametrelerini getir
  router.get('/api/payroll/parameters', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const canAccess = await hasAccountingAccess(user.role);
      if (!canAccess) {
        return res.status(403).json({ message: "Bordro parametrelerine erişim yetkiniz yok" });
      }

      const params = await db.execute(sql`
        SELECT * FROM payroll_parameters ORDER BY year DESC, effective_from DESC
      `);
      res.json(params.rows.map(transformPayrollParams));
    } catch (error: unknown) {
      console.error("Get payroll parameters error:", error);
      res.status(500).json({ message: "Bordro parametreleri alınamadı" });
    }
  });

  // GET /api/payroll/parameters/:year - Belirli yılın parametrelerini getir
  router.get('/api/payroll/parameters/:year', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const canAccess = await hasAccountingAccess(user.role);
      if (!canAccess) {
        return res.status(403).json({ message: "Bordro parametrelerine erişim yetkiniz yok" });
      }

      const year = parseInt(req.params.year);
      const params = await db.execute(sql`
        SELECT * FROM payroll_parameters WHERE year = ${year} ORDER BY effective_from DESC LIMIT 1
      `);
      
      if (params.rows.length === 0) {
        return res.status(404).json({ message: "Belirtilen yıl için parametre bulunamadı" });
      }
      res.json(transformPayrollParams(params.rows[0]));
    } catch (error: unknown) {
      console.error("Get payroll parameters by year error:", error);
      res.status(500).json({ message: "Bordro parametreleri alınamadı" });
    }
  });

  // PATCH /api/payroll/parameters/:id - Bordro parametrelerini güncelle (sadece admin/muhasebe)
  // Zod schema for validating payroll parameter updates (all values in kuruş/per-mille)
  const payrollParameterUpdateSchema = z.object({
    minimumWageGross: z.number().int().positive().optional(),
    minimumWageNet: z.number().int().positive().optional(),
    sgkEmployeeRate: z.number().int().nonnegative().optional(),
    sgkEmployerRate: z.number().int().nonnegative().optional(),
    unemploymentEmployeeRate: z.number().int().nonnegative().optional(),
    unemploymentEmployerRate: z.number().int().nonnegative().optional(),
    stampTaxRate: z.number().int().nonnegative().optional(),
    taxBracket1Limit: z.number().int().positive().optional(),
    taxBracket1Rate: z.number().int().positive().optional(),
    taxBracket2Limit: z.number().int().positive().optional(),
    taxBracket2Rate: z.number().int().positive().optional(),
    taxBracket3Limit: z.number().int().positive().optional(),
    taxBracket3Rate: z.number().int().positive().optional(),
    taxBracket4Limit: z.number().int().positive().optional(),
    taxBracket4Rate: z.number().int().positive().optional(),
    taxBracket5Rate: z.number().int().positive().optional(),
    mealAllowanceTaxExemptDaily: z.number().int().nonnegative().optional(),
    mealAllowanceSgkExemptDaily: z.number().int().nonnegative().optional(),
    transportAllowanceExemptDaily: z.number().int().nonnegative().optional(),
    workingDaysPerMonth: z.number().int().positive().optional(),
    workingHoursPerDay: z.number().int().positive().optional(),
    overtimeMultiplier: z.string().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  });

  router.patch('/api/payroll/parameters/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Bordro parametrelerini düzenleme yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      // Validate and parse the request body
      const parseResult = payrollParameterUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Geçersiz parametre verisi", 
          errors: parseResult.error.flatten() 
        });
      }

      const updates = parseResult.data;

      // Only update fields that were provided
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Güncellenecek alan belirtilmedi" });
      }

      // Update the parameters
      await db.execute(sql`
        UPDATE payroll_parameters SET
          minimum_wage_gross = COALESCE(${updates.minimumWageGross ?? null}, minimum_wage_gross),
          minimum_wage_net = COALESCE(${updates.minimumWageNet ?? null}, minimum_wage_net),
          sgk_employee_rate = COALESCE(${updates.sgkEmployeeRate ?? null}, sgk_employee_rate),
          sgk_employer_rate = COALESCE(${updates.sgkEmployerRate ?? null}, sgk_employer_rate),
          unemployment_employee_rate = COALESCE(${updates.unemploymentEmployeeRate ?? null}, unemployment_employee_rate),
          unemployment_employer_rate = COALESCE(${updates.unemploymentEmployerRate ?? null}, unemployment_employer_rate),
          stamp_tax_rate = COALESCE(${updates.stampTaxRate ?? null}, stamp_tax_rate),
          tax_bracket_1_limit = COALESCE(${updates.taxBracket1Limit ?? null}, tax_bracket_1_limit),
          tax_bracket_1_rate = COALESCE(${updates.taxBracket1Rate ?? null}, tax_bracket_1_rate),
          tax_bracket_2_limit = COALESCE(${updates.taxBracket2Limit ?? null}, tax_bracket_2_limit),
          tax_bracket_2_rate = COALESCE(${updates.taxBracket2Rate ?? null}, tax_bracket_2_rate),
          tax_bracket_3_limit = COALESCE(${updates.taxBracket3Limit ?? null}, tax_bracket_3_limit),
          tax_bracket_3_rate = COALESCE(${updates.taxBracket3Rate ?? null}, tax_bracket_3_rate),
          tax_bracket_4_limit = COALESCE(${updates.taxBracket4Limit ?? null}, tax_bracket_4_limit),
          tax_bracket_4_rate = COALESCE(${updates.taxBracket4Rate ?? null}, tax_bracket_4_rate),
          tax_bracket_5_rate = COALESCE(${updates.taxBracket5Rate ?? null}, tax_bracket_5_rate),
          meal_allowance_tax_exempt_daily = COALESCE(${updates.mealAllowanceTaxExemptDaily ?? null}, meal_allowance_tax_exempt_daily),
          meal_allowance_sgk_exempt_daily = COALESCE(${updates.mealAllowanceSgkExemptDaily ?? null}, meal_allowance_sgk_exempt_daily),
          transport_allowance_exempt_daily = COALESCE(${updates.transportAllowanceExemptDaily ?? null}, transport_allowance_exempt_daily),
          working_days_per_month = COALESCE(${updates.workingDaysPerMonth ?? null}, working_days_per_month),
          working_hours_per_day = COALESCE(${updates.workingHoursPerDay ?? null}, working_hours_per_day),
          overtime_multiplier = COALESCE(${updates.overtimeMultiplier ?? null}, overtime_multiplier),
          is_active = COALESCE(${updates.isActive ?? null}, is_active),
          notes = COALESCE(${updates.notes ?? null}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `);

      const result = await db.execute(sql`SELECT * FROM payroll_parameters WHERE id = ${id}`);
      res.json(transformPayrollParams(result.rows[0]));
    } catch (error: unknown) {
      console.error("Update payroll parameters error:", error);
      res.status(500).json({ message: "Bordro parametreleri güncellenemedi" });
    }
  });

  // POST /api/payroll/ai-regulation-check - AI ile güncel mevzuat kontrolü
  router.post('/api/payroll/ai-regulation-check', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { parameterId } = req.body;
      if (!parameterId) {
        return res.status(400).json({ message: "Parametre ID gerekli" });
      }

      const paramResult = await db.execute(sql`SELECT * FROM payroll_parameters WHERE id = ${parameterId}`);
      if (paramResult.rows.length === 0) {
        return res.status(404).json({ message: "Parametre bulunamadı" });
      }

      const currentParams = paramResult.rows[0] as any;
      const year = currentParams.year;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();

      const currentParamsText = `
Mevcut Bordro Parametreleri (${year} Yılı):
- Brüt Asgari Ücret: ${(currentParams.minimum_wage_gross / 100).toFixed(2)} TL
- Net Asgari Ücret: ${(currentParams.minimum_wage_net / 100).toFixed(2)} TL
- SGK İşçi Payı: %${(currentParams.sgk_employee_rate / 100).toFixed(2)}
- SGK İşveren Payı: %${(currentParams.sgk_employer_rate / 100).toFixed(2)}
- İşsizlik Sigortası İşçi: %${(currentParams.unemployment_employee_rate / 100).toFixed(2)}
- İşsizlik Sigortası İşveren: %${(currentParams.unemployment_employer_rate / 100).toFixed(2)}
- Damga Vergisi: %${(currentParams.stamp_tax_rate / 10000).toFixed(4)}
- 1. Dilim Limit: ${(currentParams.tax_bracket_1_limit / 100).toFixed(2)} TL, Oran: %${(currentParams.tax_bracket_1_rate / 100).toFixed(0)}
- 2. Dilim Limit: ${(currentParams.tax_bracket_2_limit / 100).toFixed(2)} TL, Oran: %${(currentParams.tax_bracket_2_rate / 100).toFixed(0)}
- 3. Dilim Limit: ${(currentParams.tax_bracket_3_limit / 100).toFixed(2)} TL, Oran: %${(currentParams.tax_bracket_3_rate / 100).toFixed(0)}
- 4. Dilim Limit: ${(currentParams.tax_bracket_4_limit / 100).toFixed(2)} TL, Oran: %${(currentParams.tax_bracket_4_rate / 100).toFixed(0)}
- 5. Dilim Oran: %${(currentParams.tax_bracket_5_rate / 100).toFixed(0)}
- Yemek Muafiyeti (Günlük Vergi): ${(currentParams.meal_allowance_tax_exempt_daily / 100).toFixed(2)} TL
- Yemek Muafiyeti (Günlük SGK): ${(currentParams.meal_allowance_sgk_exempt_daily / 100).toFixed(2)} TL
- Yol Muafiyeti (Günlük): ${(currentParams.transport_allowance_exempt_daily / 100).toFixed(2)} TL
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Sen Türkiye bordro ve iş hukuku uzmanısın. ${year} yılı için geçerli olan Türk bordro mevzuatını biliyorsun.

Görevin: Verilen bordro parametrelerini ${year} yılı Türkiye mevzuatıyla karşılaştırmak ve değişiklik önerileri sunmaktır.

MUTLAKA aşağıdaki JSON formatında yanıt ver:
{
  "status": "up_to_date" | "needs_update",
  "summary": "Genel durum özeti (Türkçe, 2-3 cümle)",
  "changes": [
    {
      "field": "minimumWageGross",
      "fieldLabel": "Brüt Asgari Ücret",
      "currentValue": 3303000,
      "suggestedValue": 3500000,
      "reason": "Değişiklik nedeni (Türkçe)"
    }
  ],
  "source": "Referans kaynak (ör: Resmi Gazete, SGK Genelgesi vb.)",
  "confidence": "high" | "medium" | "low",
  "notes": "Ek notlar veya uyarılar (Türkçe)"
}

Önemli kurallar:
- Tüm parasal değerler kuruş cinsindendir (1 TL = 100 kuruş)
- SGK/İşsizlik oranları yüzde olarak ifade edilir ve 100 ile çarpılmış haldedir (ör: %14 = 1400)
- Damga vergisi oranı 10000 ile çarpılmış haldedir (ör: %0.759 = 759)
- Vergi dilimi limitleri kuruş cinsindendir
- Sadece gerçekten değişmesi gereken parametreleri "changes" dizisine ekle
- Emin olmadığın değerler için confidence "low" olarak belirt
- field değerleri camelCase olmalı (ör: minimumWageGross, taxBracket1Rate)`
          },
          {
            role: "user",
            content: `Lütfen aşağıdaki ${year} yılı bordro parametrelerini güncel Türkiye mevzuatıyla karşılaştır ve gerekli güncelleme önerilerini JSON formatında sun:\n\n${currentParamsText}`
          }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        return res.status(500).json({ message: "AI yanıt üretemedi" });
      }

      const parsed = JSON.parse(aiResponse);
      res.json({
        ...parsed,
        parameterId,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      handleApiError(res, error, "AIRegulationCheck");
    }
  });

  // POST /api/payroll/apply-ai-suggestions - AI önerilerini uygula
  router.post('/api/payroll/apply-ai-suggestions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'muhasebe_ik') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const aiApplySchema = z.object({
        parameterId: z.number().int().positive(),
        changes: z.array(z.object({
          field: z.string(),
          suggestedValue: z.union([z.number(), z.string()]),
          fieldLabel: z.string().optional(),
          currentValue: z.union([z.number(), z.string()]).optional(),
          reason: z.string().optional(),
        })).min(1),
      });

      const parseResult = aiApplySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parseResult.error.flatten() });
      }

      const { parameterId, changes } = parseResult.data;

      const allowedFields = new Set([
        'minimumWageGross', 'minimumWageNet', 'sgkEmployeeRate', 'sgkEmployerRate',
        'unemploymentEmployeeRate', 'unemploymentEmployerRate', 'stampTaxRate',
        'taxBracket1Limit', 'taxBracket1Rate', 'taxBracket2Limit', 'taxBracket2Rate',
        'taxBracket3Limit', 'taxBracket3Rate', 'taxBracket4Limit', 'taxBracket4Rate',
        'taxBracket5Rate', 'mealAllowanceTaxExemptDaily', 'mealAllowanceSgkExemptDaily',
        'transportAllowanceExemptDaily', 'workingDaysPerMonth', 'workingHoursPerDay',
        'overtimeMultiplier',
      ]);

      const updateData: Record<string, any> = {};
      for (const change of changes) {
        if (change.field && allowedFields.has(change.field) && change.suggestedValue !== undefined) {
          updateData[change.field] = change.suggestedValue;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Uygulanacak geçerli değişiklik bulunamadı" });
      }

      await db.execute(sql`
        UPDATE payroll_parameters SET
          minimum_wage_gross = COALESCE(${updateData.minimumWageGross ?? null}, minimum_wage_gross),
          minimum_wage_net = COALESCE(${updateData.minimumWageNet ?? null}, minimum_wage_net),
          sgk_employee_rate = COALESCE(${updateData.sgkEmployeeRate ?? null}, sgk_employee_rate),
          sgk_employer_rate = COALESCE(${updateData.sgkEmployerRate ?? null}, sgk_employer_rate),
          unemployment_employee_rate = COALESCE(${updateData.unemploymentEmployeeRate ?? null}, unemployment_employee_rate),
          unemployment_employer_rate = COALESCE(${updateData.unemploymentEmployerRate ?? null}, unemployment_employer_rate),
          stamp_tax_rate = COALESCE(${updateData.stampTaxRate ?? null}, stamp_tax_rate),
          tax_bracket_1_limit = COALESCE(${updateData.taxBracket1Limit ?? null}, tax_bracket_1_limit),
          tax_bracket_1_rate = COALESCE(${updateData.taxBracket1Rate ?? null}, tax_bracket_1_rate),
          tax_bracket_2_limit = COALESCE(${updateData.taxBracket2Limit ?? null}, tax_bracket_2_limit),
          tax_bracket_2_rate = COALESCE(${updateData.taxBracket2Rate ?? null}, tax_bracket_2_rate),
          tax_bracket_3_limit = COALESCE(${updateData.taxBracket3Limit ?? null}, tax_bracket_3_limit),
          tax_bracket_3_rate = COALESCE(${updateData.taxBracket3Rate ?? null}, tax_bracket_3_rate),
          tax_bracket_4_limit = COALESCE(${updateData.taxBracket4Limit ?? null}, tax_bracket_4_limit),
          tax_bracket_4_rate = COALESCE(${updateData.taxBracket4Rate ?? null}, tax_bracket_4_rate),
          tax_bracket_5_rate = COALESCE(${updateData.taxBracket5Rate ?? null}, tax_bracket_5_rate),
          meal_allowance_tax_exempt_daily = COALESCE(${updateData.mealAllowanceTaxExemptDaily ?? null}, meal_allowance_tax_exempt_daily),
          meal_allowance_sgk_exempt_daily = COALESCE(${updateData.mealAllowanceSgkExemptDaily ?? null}, meal_allowance_sgk_exempt_daily),
          transport_allowance_exempt_daily = COALESCE(${updateData.transportAllowanceExemptDaily ?? null}, transport_allowance_exempt_daily),
          working_days_per_month = COALESCE(${updateData.workingDaysPerMonth ?? null}, working_days_per_month),
          working_hours_per_day = COALESCE(${updateData.workingHoursPerDay ?? null}, working_hours_per_day),
          overtime_multiplier = COALESCE(${updateData.overtimeMultiplier ?? null}, overtime_multiplier),
          updated_at = NOW()
        WHERE id = ${parameterId}
      `);

      const result = await db.execute(sql`SELECT * FROM payroll_parameters WHERE id = ${parameterId}`);
      res.json({
        success: true,
        message: `${changes.length} parametre başarıyla güncellendi`,
        updatedParams: transformPayrollParams(result.rows[0]),
      });
    } catch (error: unknown) {
      handleApiError(res, error, "ApplyAISuggestions");
    }
  });

  // POST /api/payroll/calculate - Brüt/Net maaş hesaplama
  // Zod schema for validating payroll calculation requests (all values in kuruş)
  const payrollCalculateSchema = z.object({
    grossSalary: z.number().int().positive().optional(),
    netSalary: z.number().int().positive().optional(),
    year: z.number().int().min(2020).max(2030).optional().default(new Date().getFullYear()),
    cumulativeTaxBase: z.number().int().nonnegative().optional().default(0),
  }).refine(data => data.grossSalary || data.netSalary, {
    message: "Brüt veya net maaş belirtilmeli",
  });

  router.post('/api/payroll/calculate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'yatirimci_branch') {
        return res.status(403).json({ message: "Bordro hesaplama yetkiniz yok" });
      }

      // Validate and parse the request body
      const parseResult = payrollCalculateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Geçersiz hesaplama verisi", 
          errors: parseResult.error.flatten() 
        });
      }

      const { grossSalary, netSalary, year, cumulativeTaxBase } = parseResult.data;

      // Get parameters for the year
      const paramsResult = await db.execute(sql`
        SELECT * FROM payroll_parameters WHERE year = ${year} AND is_active = true ORDER BY effective_from DESC LIMIT 1
      `);

      if (paramsResult.rows.length === 0) {
        return res.status(404).json({ message: `${year} yılı için aktif bordro parametresi bulunamadı` });
      }

      const params = paramsResult.rows[0] as any;

      // Helper function for tax calculation with brackets
      const calculateIncomeTax = (taxBase: number, cumulative: number): { tax: number; bracket: number } => {
        const total = cumulative + taxBase;
        let tax = 0;
        let bracket = 1;
        let remaining = taxBase;
        let processedCumulative = cumulative;

        const brackets = [
          { limit: params.tax_bracket_1_limit, rate: params.tax_bracket_1_rate / 1000 },
          { limit: params.tax_bracket_2_limit, rate: params.tax_bracket_2_rate / 1000 },
          { limit: params.tax_bracket_3_limit, rate: params.tax_bracket_3_rate / 1000 },
          { limit: params.tax_bracket_4_limit, rate: params.tax_bracket_4_rate / 1000 },
          { limit: Infinity, rate: params.tax_bracket_5_rate / 1000 },
        ];

        for (let i = 0; i < brackets.length && remaining > 0; i++) {
          const bracketLimit = brackets[i].limit;
          const rate = brackets[i].rate;

          if (processedCumulative >= bracketLimit) {
            continue; // Already past this bracket
          }

          const availableInBracket = bracketLimit - processedCumulative;
          const amountInBracket = Math.min(remaining, availableInBracket);

          tax += amountInBracket * rate;
          remaining -= amountInBracket;
          processedCumulative += amountInBracket;
          bracket = i + 1;
        }

        return { tax: Math.round(tax), bracket };
      };

      // Calculate from gross to net
      if (grossSalary) {
        const gross = grossSalary;
        const sgkEmployee = Math.round(gross * params.sgk_employee_rate / 1000);
        const unemploymentEmployee = Math.round(gross * params.unemployment_employee_rate / 1000);
        const taxBase = gross - sgkEmployee - unemploymentEmployee;
        
        const { tax: incomeTax, bracket: taxBracket } = calculateIncomeTax(taxBase, cumulativeTaxBase);
        
        // Stamp tax calculation (with minimum wage exemption)
        let stampTax = Math.round(gross * params.stamp_tax_rate / 10000);
        let stampTaxExemption = 0;
        if (gross <= params.minimum_wage_gross) {
          stampTaxExemption = stampTax;
          stampTax = 0;
        }

        // Minimum wage income tax exemption
        let minimumWageExemption = 0;
        const minWageTaxBase = params.minimum_wage_gross - Math.round(params.minimum_wage_gross * (params.sgk_employee_rate + params.unemployment_employee_rate) / 1000);
        if (gross <= params.minimum_wage_gross) {
          minimumWageExemption = incomeTax;
        }

        const totalDeductions = sgkEmployee + unemploymentEmployee + incomeTax + stampTax - minimumWageExemption - stampTaxExemption;
        const net = gross - totalDeductions;

        // Employer costs
        const sgkEmployer = Math.round(gross * params.sgk_employer_rate / 1000);
        const unemploymentEmployer = Math.round(gross * params.unemployment_employer_rate / 1000);
        const employerCost = gross + sgkEmployer + unemploymentEmployer;

        res.json({
          grossSalary: gross,
          netSalary: net,
          sgkEmployee,
          unemploymentEmployee,
          taxBase,
          incomeTax,
          taxBracket,
          stampTax,
          minimumWageExemption,
          stampTaxExemption,
          totalDeductions,
          sgkEmployer,
          unemploymentEmployer,
          employerCost,
          parameters: {
            year: params.year,
            minimumWageGross: params.minimum_wage_gross,
            minimumWageNet: params.minimum_wage_net,
          }
        });
      }
      // Calculate from net to gross (Newton-Raphson approximation)
      else if (netSalary) {
        const targetNet = netSalary;
        let gross = targetNet * 1.4; // Initial estimate

        for (let i = 0; i < 20; i++) {
          const sgkEmployee = Math.round(gross * params.sgk_employee_rate / 1000);
          const unemploymentEmployee = Math.round(gross * params.unemployment_employee_rate / 1000);
          const taxBase = gross - sgkEmployee - unemploymentEmployee;
          const { tax: incomeTax } = calculateIncomeTax(taxBase, cumulativeTaxBase);
          let stampTax = Math.round(gross * params.stamp_tax_rate / 10000);

          let minimumWageExemption = 0;
          let stampTaxExemption = 0;
          if (gross <= params.minimum_wage_gross) {
            minimumWageExemption = incomeTax;
            stampTaxExemption = stampTax;
            stampTax = 0;
          }

          const calculatedNet = gross - sgkEmployee - unemploymentEmployee - incomeTax - stampTax + minimumWageExemption + stampTaxExemption;
          const diff = targetNet - calculatedNet;

          if (Math.abs(diff) < 100) break; // Close enough (1 TL)
          gross += diff * 0.7; // Adjust
        }

        // Final calculation with found gross
        const sgkEmployee = Math.round(gross * params.sgk_employee_rate / 1000);
        const unemploymentEmployee = Math.round(gross * params.unemployment_employee_rate / 1000);
        const taxBase = gross - sgkEmployee - unemploymentEmployee;
        const { tax: incomeTax, bracket: taxBracket } = calculateIncomeTax(taxBase, cumulativeTaxBase);
        let stampTax = Math.round(gross * params.stamp_tax_rate / 10000);

        let minimumWageExemption = 0;
        let stampTaxExemption = 0;
        if (gross <= params.minimum_wage_gross) {
          minimumWageExemption = incomeTax;
          stampTaxExemption = stampTax;
          stampTax = 0;
        }

        const totalDeductions = sgkEmployee + unemploymentEmployee + incomeTax + stampTax - minimumWageExemption - stampTaxExemption;
        const net = gross - totalDeductions;

        // Employer costs
        const sgkEmployer = Math.round(gross * params.sgk_employer_rate / 1000);
        const unemploymentEmployer = Math.round(gross * params.unemployment_employer_rate / 1000);
        const employerCost = gross + sgkEmployer + unemploymentEmployer;

        res.json({
          grossSalary: Math.round(gross),
          netSalary: net,
          sgkEmployee,
          unemploymentEmployee,
          taxBase,
          incomeTax,
          taxBracket,
          stampTax,
          minimumWageExemption,
          stampTaxExemption,
          totalDeductions,
          sgkEmployer,
          unemploymentEmployer,
          employerCost,
          parameters: {
            year: params.year,
            minimumWageGross: params.minimum_wage_gross,
            minimumWageNet: params.minimum_wage_net,
          }
        });
      } else {
        res.status(400).json({ message: "Brüt veya net maaş belirtilmeli" });
      }
    } catch (error: unknown) {
      console.error("Calculate payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });


  // GET /api/employees-with-salary - Maaş bilgileri ile personel listesi (SCOPE-AWARE)
  router.get('/api/employees-with-salary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userRole = user?.role;
      const userId = user?.id;
      const userBranchId = user?.branchId;
      
      // Check permission for viewing salary info
      const permission = await resolvePermissionScope(
        { id: userId, role: userRole, branchId: userBranchId },
        'accounting',
        'view_salary'
      );
      
      if (!permission.hasPermission) {
        return res.status(403).json({ message: "Maaş bilgilerini görüntüleme yetkiniz yok" });
      }
      
      const scopeFilter = applyScopeFilter(permission.scope, { id: userId, role: userRole, branchId: userBranchId });
      
      if (!scopeFilter.canAccess) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      // Build query based on scope
      let whereClause = sql`u.is_active = true`;
      
      if (!scopeFilter.isGlobal) {
        if (scopeFilter.userId) {
          // SELF scope - only own data
          whereClause = sql`u.is_active = true AND u.id = ${scopeFilter.userId}`;
        } else if (scopeFilter.branchId) {
          // BRANCH scope - only branch data
          whereClause = sql`u.is_active = true AND u.branch_id = ${scopeFilter.branchId}`;
        }
      }

      const result = await db.execute(sql`
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.role, u.email,
          u.hire_date, u.employment_type, u.is_active, 
          COALESCE(u.net_salary, 0) as net_salary,
          COALESCE(u.meal_allowance, 0) as meal_allowance,
          COALESCE(u.transport_allowance, 0) as transport_allowance,
          COALESCE(u.bonus_base, 0) as bonus_base,
          COALESCE(u.bonus_type, 'normal') as bonus_type,
          COALESCE(u.bonus_percentage, 0) as bonus_percentage,
          b.id as branch_id, b.name as branch_name,
          eb.id as benefit_id, eb.meal_benefit_type, eb.meal_benefit_amount,
          eb.transport_benefit_type, eb.transport_benefit_amount,
          eb.bonus_eligible, eb.bonus_percentage as eb_bonus_percentage, 
          eb.disability_discount, eb.disability_degree
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN employee_benefits eb ON u.id = eb.user_id AND eb.is_active = true
        WHERE ${whereClause}
        ORDER BY u.first_name, u.last_name
      `);
      
      res.json(result.rows);
    } catch (error: unknown) {
      console.error("Get employees with salary error:", error);
      res.status(500).json({ message: "Personel maaş listesi alınamadı" });
    }
  });


  // ========================================
  // PAYROLL RECORDS API - Bordro Yönetimi
  // ========================================

  // GET /api/payroll/records - Bordro kayıtlarını listele (SCOPE-AWARE)
  router.get('/api/payroll/records', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userRole = user?.role;
      const userId = user?.id;
      const userBranchId = user?.branchId;
      
      // Check permission for viewing payroll
      const permission = await resolvePermissionScope(
        { id: userId, role: userRole, branchId: userBranchId },
        'accounting',
        'view_payroll'
      );
      
      if (!permission.hasPermission) {
        return res.status(403).json({ message: "Bordro görüntüleme yetkiniz yok" });
      }
      
      const scopeFilter = applyScopeFilter(permission.scope, { id: userId, role: userRole, branchId: userBranchId });
      
      const { year, month, employeeId, status } = req.query;
      
      // Build conditions array for dynamic filtering
      const conditions: any[] = [];
      
      // Apply scope-based filtering
      if (!scopeFilter.isGlobal) {
        if (scopeFilter.userId) {
          // SELF scope - only own records
          conditions.push(sql`pr.user_id = ${scopeFilter.userId}`);
        } else if (scopeFilter.branchId) {
          // BRANCH scope - only branch records
          conditions.push(sql`pr.branch_id = ${scopeFilter.branchId}`);
        }
      }
      
      // Additional filters from query params (only if user has broader scope)
      if (scopeFilter.isGlobal && employeeId) {
        conditions.push(sql`pr.user_id = ${employeeId}`);
      }
      
      if (year) {
        conditions.push(sql`pr.period_year = ${parseInt(year as string)}`);
      }
      
      if (month) {
        conditions.push(sql`pr.period_month = ${parseInt(month as string)}`);
      }
      
      if (status) {
        conditions.push(sql`pr.status = ${status}`);
      }
      
      // Build WHERE clause
      const whereClause = conditions.length > 0 
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;
      
      const result = await db.execute(sql`
        SELECT pr.*, 
               u.first_name, u.last_name, u.username, u.role as employee_role,
               b.name as branch_name
        FROM payroll_records pr
        LEFT JOIN users u ON pr.user_id = u.id
        LEFT JOIN branches b ON pr.branch_id = b.id
        ${whereClause}
        ORDER BY pr.period_year DESC, pr.period_month DESC, u.first_name
      `);
      res.json(result.rows);
    } catch (error: unknown) {
      console.error("Get payroll records error:", error);
      res.status(500).json({ message: "Bordro kayıtları alınamadı" });
    }
  });

  // GET /api/payroll/records/:id - Tek bordro kaydı (SCOPE-AWARE)
  router.get('/api/payroll/records/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userRole = user?.role;
      const userId = user?.id;
      const userBranchId = user?.branchId;
      const { id } = req.params;
      const recordId = parseInt(id);
      
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }
      
      // Check permission for viewing payroll
      const permission = await resolvePermissionScope(
        { id: userId, role: userRole, branchId: userBranchId },
        'accounting',
        'view_payroll'
      );
      
      if (!permission.hasPermission) {
        return res.status(403).json({ message: "Bordro görüntüleme yetkiniz yok" });
      }
      
      const result = await db.execute(sql`
        SELECT pr.*, 
               u.first_name, u.last_name, u.username, u.role as employee_role,
               b.name as branch_name
        FROM payroll_records pr
        LEFT JOIN users u ON pr.user_id = u.id
        LEFT JOIN branches b ON pr.branch_id = b.id
        WHERE pr.id = ${recordId}
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Bordro kaydı bulunamadı" });
      }
      
      const record = result.rows[0] as any;
      
      // Apply scope-based access control
      const scopeFilter = applyScopeFilter(permission.scope, { id: userId, role: userRole, branchId: userBranchId });
      
      if (!scopeFilter.isGlobal) {
        if (scopeFilter.userId && record.user_id !== scopeFilter.userId) {
          return res.status(403).json({ message: "Bu bordro kaydına erişim yetkiniz yok" });
        }
        if (scopeFilter.branchId && record.branch_id !== scopeFilter.branchId) {
          return res.status(403).json({ message: "Bu şubenin bordro kayıtlarına erişim yetkiniz yok" });
        }
      }
      
      res.json(record);
    } catch (error: unknown) {
      console.error("Get payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı alınamadı" });
    }
  });

  // GET /api/payroll/employee/:userId/overtime - Personelin onaylı mesai dakikaları
  router.get('/api/payroll/employee/:userId/overtime', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      const { userId } = req.params;
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "Yıl ve ay zorunlu" });
      }
      
      const periodStr = `${year}-${String(month).padStart(2, '0')}`;
      
      const result = await db.execute(sql`
        SELECT 
          COALESCE(SUM(approved_minutes), 0) as total_overtime_minutes,
          COUNT(*) as request_count
        FROM overtime_requests
        WHERE user_id = ${userId}
          AND status = 'approved'
          AND applied_to_period = ${periodStr}
      `);
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Get employee overtime error:", error);
      res.status(500).json({ message: "Mesai bilgisi alınamadı" });
    }
  });

  // GET /api/payroll/employee/:userId/attendance - Personelin çalışma saatleri
  router.get('/api/payroll/employee/:userId/attendance', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      const { userId } = req.params;
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "Yıl ve ay zorunlu" });
      }
      
      // Ayın ilk ve son günü
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      
      const result = await db.execute(sql`
        SELECT 
          COALESCE(SUM(total_worked_minutes), 0) as total_worked_minutes,
          COALESCE(SUM(penalty_minutes), 0) as total_penalty_minutes,
          COUNT(*) as shift_count
        FROM shift_attendance
        WHERE user_id = ${userId}
          AND status = 'checked_out'
          AND check_in_time >= ${startDate}
          AND check_in_time <= ${endDate}
      `);
      
      const row = result.rows[0] as any;
      const totalWorkedMinutes = parseInt(row.total_worked_minutes) || 0;
      const shiftCount = parseInt(row.shift_count) || 0;
      
      // Haftalık 45 saat = 2700 dakika, aylık yaklaşık 4 hafta = 10800 dakika
      const expectedMonthlyMinutes = 45 * 60 * 4; // 10800 dakika
      const undertimeMinutes = Math.max(0, expectedMonthlyMinutes - totalWorkedMinutes);
      
      res.json({
        totalWorkedMinutes,
        totalPenaltyMinutes: parseInt(row.total_penalty_minutes) || 0,
        shiftCount,
        expectedMonthlyMinutes,
        undertimeMinutes,
        undertimePercentage: undertimeMinutes > 0 ? Math.round((undertimeMinutes / expectedMonthlyMinutes) * 100) : 0
      });
    } catch (error: unknown) {
      console.error("Get employee attendance error:", error);
      res.status(500).json({ message: "Çalışma saati bilgisi alınamadı" });
    }
  });

  // POST /api/payroll/calculate - Bordro hesaplama (kaydetmeden)
  router.post('/api/payroll/calculate-employee', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      const { userId, year, month } = req.body;
      
      if (!userId || !year || !month) {
        return res.status(400).json({ message: "Personel, yıl ve ay zorunlu" });
      }
      
      // 1. Personel bilgisi al
      const userResult = await db.execute(sql`
        SELECT u.*, b.name as branch_name, b.id as branch_id
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = ${userId}
      `);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }
      
      const employee = userResult.rows[0] as any;
      const baseSalary = employee.net_salary || 0; // kuruş cinsinden
      
      // 2. Yan hakları al - Önce users tablosundan varsayılan değerleri, sonra employee_benefits'ten özel değerleri
      const userMealAllowance = employee.meal_allowance || 0; // users tablosundan (kuruş/ay)
      const userTransportAllowance = employee.transport_allowance || 0; // users tablosundan (kuruş/ay)
      const userBonusBase = employee.bonus_base || 0; // users tablosundan (kuruş)
      
      const benefitsResult = await db.execute(sql`
        SELECT * FROM employee_benefits
        WHERE user_id = ${userId} AND is_active = true
        LIMIT 1
      `);
      
      const benefits = benefitsResult.rows[0] as any;
      // employee_benefits kaydı varsa (0 dahil geçerli) onu kullan, yoksa users tablosundan varsayılanları
      const hasBenefitsRecord = benefitsResult.rows.length > 0;
      const mealAllowance = hasBenefitsRecord && benefits.meal_benefit_amount !== null && benefits.meal_benefit_amount !== undefined
        ? benefits.meal_benefit_amount * 22 // 22 iş günü (günlük değerden aylığa)
        : userMealAllowance; // users tablosundan aylık değer
      const transportAllowance = hasBenefitsRecord && benefits.transport_benefit_amount !== null && benefits.transport_benefit_amount !== undefined
        ? benefits.transport_benefit_amount * 22
        : userTransportAllowance; // users tablosundan aylık değer
      const userBonusPercentage = parseFloat(employee.bonus_percentage || '0');
      const benefitsBonusPercentage = parseFloat(benefits?.bonus_percentage || '0');
      const bonusPercentage = userBonusPercentage > 0 ? userBonusPercentage : benefitsBonusPercentage;
      const bonusEligible = benefits?.bonus_eligible !== false;
      
      // 3. Onaylı mesai al
      const periodStr = `${year}-${String(month).padStart(2, '0')}`;
      const overtimeResult = await db.execute(sql`
        SELECT COALESCE(SUM(approved_minutes), 0) as total_minutes
        FROM overtime_requests
        WHERE user_id = ${userId}
          AND status = 'approved'
          AND applied_to_period = ${periodStr}
      `);
      const overtimeMinutes = parseInt((overtimeResult.rows[0] as any).total_minutes) || 0;
      
      // Mesai ücreti hesaplama (saatlik ücret x 1.5)
      const hourlyRate = baseSalary / (45 * 4); // Aylık ücret / (haftalık saat x 4 hafta)
      const overtimeAmount = Math.round((overtimeMinutes / 60) * hourlyRate * 1.5);
      
      // 4. Çalışma saati kontrolü
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      
      const attendanceResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_worked_minutes), 0) as total_minutes
        FROM shift_attendance
        WHERE user_id = ${userId}
          AND status = 'checked_out'
          AND check_in_time >= ${startDate}
          AND check_in_time <= ${endDate}
      `);
      const workedMinutes = parseInt((attendanceResult.rows[0] as any).total_minutes) || 0;
      
      // Eksik çalışma hesaplama
      const expectedMonthlyMinutes = 45 * 60 * 4; // 10800 dakika
      const undertimeMinutes = Math.max(0, expectedMonthlyMinutes - workedMinutes);
      
      // 5. Prim hesaplama
      // Prim türü: personel bazlı ayar (users tablosundan)
      const bonusType = employee.bonus_type || (employee.branch_id ? 'kasa_primi' : 'normal');
      // Prim matrahı: users tablosundan varsa onu kullan, yoksa base salary
      const bonusBase = userBonusBase > 0 ? userBonusBase : baseSalary;
      let bonusAmount = 0;
      
      if (bonusEligible && bonusPercentage > 0) {
        bonusAmount = Math.round(bonusBase * (bonusPercentage / 100));
      }
      
      // Eksik çalışma kesintisi (primden kesilir)
      let undertimeDeduction = 0;
      if (undertimeMinutes > 0 && bonusAmount > 0) {
        const undertimePercentage = undertimeMinutes / expectedMonthlyMinutes;
        undertimeDeduction = Math.round(bonusAmount * undertimePercentage);
        undertimeDeduction = Math.min(undertimeDeduction, bonusAmount); // Primden fazla kesilemez
      }
      
      // 6. Toplam net ödenecek
      const totalNetPayable = baseSalary + overtimeAmount + bonusAmount - undertimeDeduction + mealAllowance + transportAllowance;
      
      // 7. Brüt hesaplama (net'ten brüt'e Newton-Raphson)
      // Parametreleri al
      const paramsResult = await db.execute(sql`
        SELECT * FROM payroll_parameters WHERE is_active = true ORDER BY effective_year DESC LIMIT 1
      `);
      const params = paramsResult.rows[0] as any || {
        sgk_employee_rate: '14',
        unemployment_employee_rate: '1',
        stamp_tax_rate: '0.759',
        income_tax_brackets: JSON.stringify([
          { limit: 11000000, rate: 15 },
          { limit: 23000000, rate: 20 },
          { limit: 53000000, rate: 27 },
          { limit: 100000000, rate: 35 },
          { limit: null, rate: 40 }
        ])
      };
      
      const sgkEmployeeRate = parseFloat(params.sgk_employee_rate || '14') / 100;
      const unemploymentEmployeeRate = parseFloat(params.unemployment_employee_rate || '1') / 100;
      const stampTaxRate = parseFloat(params.stamp_tax_rate || '0.759') / 100;
      const incomeTaxBrackets = typeof params.income_tax_brackets === 'string' 
        ? JSON.parse(params.income_tax_brackets) 
        : params.income_tax_brackets;
      
      // Basit brüt tahmin (net * 1.35)
      let grossSalary = Math.round(totalNetPayable * 1.35);
      
      // SGK ve vergi hesaplama
      const sgkEmployee = Math.round(grossSalary * sgkEmployeeRate);
      const unemploymentEmployee = Math.round(grossSalary * unemploymentEmployeeRate);
      const sgkEmployer = Math.round(grossSalary * 0.205); // %20.5
      const unemploymentEmployer = Math.round(grossSalary * 0.02); // %2
      
      // Gelir vergisi matrahı
      const taxableBase = grossSalary - sgkEmployee - unemploymentEmployee;
      
      // Gelir vergisi hesaplama (kümülatif)
      let incomeTax = 0;
      let remaining = taxableBase;
      for (const bracket of incomeTaxBrackets) {
        const bracketLimit = bracket.limit ? bracket.limit * 100 : Infinity; // TL'yi kuruşa çevir
        const rate = bracket.rate / 100;
        
        if (remaining <= 0) break;
        
        const taxableInBracket = bracket.limit ? Math.min(remaining, bracketLimit) : remaining;
        incomeTax += Math.round(taxableInBracket * rate);
        remaining -= taxableInBracket;
      }
      
      // Damga vergisi
      const stampTax = Math.round(grossSalary * stampTaxRate);
      
      res.json({
        employee: {
          id: employee.id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          branchName: employee.branch_name,
          branchId: employee.branch_id
        },
        period: { year, month },
        baseSalary,
        overtimeMinutes,
        overtimeAmount,
        bonusType,
        bonusBase,
        bonusPercentage,
        bonusAmount,
        undertimeMinutes,
        undertimeDeduction,
        mealAllowance,
        transportAllowance,
        totalNetPayable,
        grossSalary,
        sgkEmployee,
        sgkEmployer,
        unemploymentEmployee,
        unemploymentEmployer,
        incomeTax,
        stampTax
      });
    } catch (error: unknown) {
      console.error("Calculate employee payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });

  // POST /api/payroll/records - Yeni bordro kaydı oluştur
  router.post('/api/payroll/records', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const createdById = req.user?.id;
      
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      const payrollSchema = z.object({
        userId: z.string().min(1),
        branchId: z.number().nullable().optional(),
        periodYear: z.number().int().min(2020).max(2030),
        periodMonth: z.number().int().min(1).max(12),
        baseSalary: z.number().int().min(0),
        overtimeMinutes: z.number().int().min(0).optional().default(0),
        overtimeRate: z.string().optional().default("1.5"),
        overtimeAmount: z.number().int().min(0).optional().default(0),
        bonusType: z.enum(['kasa_primi', 'normal']).optional().default('normal'),
        bonusBase: z.number().int().min(0).optional().default(0),
        bonusPercentage: z.string().optional().default("0"),
        bonusAmount: z.number().int().min(0).optional().default(0),
        undertimeMinutes: z.number().int().min(0).optional().default(0),
        undertimeDeduction: z.number().int().min(0).optional().default(0),
        mealAllowance: z.number().int().min(0).optional().default(0),
        transportAllowance: z.number().int().min(0).optional().default(0),
        totalNetPayable: z.number().int().min(0),
        grossSalary: z.number().int().min(0).optional().default(0),
        sgkEmployee: z.number().int().min(0).optional().default(0),
        sgkEmployer: z.number().int().min(0).optional().default(0),
        unemploymentEmployee: z.number().int().min(0).optional().default(0),
        unemploymentEmployer: z.number().int().min(0).optional().default(0),
        incomeTax: z.number().int().min(0).optional().default(0),
        stampTax: z.number().int().min(0).optional().default(0),
        cumulativeTaxBase: z.number().int().min(0).optional().default(0),
        status: z.enum(['draft', 'pending_approval', 'approved', 'paid']).optional().default('draft'),
        notes: z.string().nullable().optional(),
      });
      
      const parsed = payrollSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
      }
      
      const data = parsed.data;
      
      // Aynı dönem için kayıt var mı kontrol et
      const existingResult = await db.execute(sql`
        SELECT id FROM payroll_records 
        WHERE user_id = ${data.userId} 
          AND period_year = ${data.periodYear} 
          AND period_month = ${data.periodMonth}
      `);
      
      if (existingResult.rows.length > 0) {
        return res.status(409).json({ message: "Bu dönem için bordro kaydı zaten mevcut" });
      }
      
      const result = await db.execute(sql`
        INSERT INTO payroll_records (
          user_id, branch_id, period_year, period_month,
          base_salary, overtime_minutes, overtime_rate, overtime_amount,
          bonus_type, bonus_base, bonus_percentage, bonus_amount,
          undertime_minutes, undertime_deduction,
          meal_allowance, transport_allowance,
          total_net_payable, gross_salary,
          sgk_employee, sgk_employer, unemployment_employee, unemployment_employer,
          income_tax, stamp_tax, cumulative_tax_base,
          status, created_by_id, notes
        ) VALUES (
          ${data.userId}, ${data.branchId}, ${data.periodYear}, ${data.periodMonth},
          ${data.baseSalary}, ${data.overtimeMinutes}, ${data.overtimeRate}, ${data.overtimeAmount},
          ${data.bonusType}, ${data.bonusBase}, ${data.bonusPercentage}, ${data.bonusAmount},
          ${data.undertimeMinutes}, ${data.undertimeDeduction},
          ${data.mealAllowance}, ${data.transportAllowance},
          ${data.totalNetPayable}, ${data.grossSalary},
          ${data.sgkEmployee}, ${data.sgkEmployer}, ${data.unemploymentEmployee}, ${data.unemploymentEmployer},
          ${data.incomeTax}, ${data.stampTax}, ${data.cumulativeTaxBase},
          ${data.status}, ${createdById}, ${data.notes}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Create payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı oluşturulamadı" });
    }
  });

  // PATCH /api/payroll/records/:id - Bordro kaydını güncelle
  router.patch('/api/payroll/records/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      
      const { id } = req.params;
      const recordId = parseInt(id);
      
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }
      
      // Mevcut kaydı kontrol et
      const existingResult = await db.execute(sql`
        SELECT * FROM payroll_records WHERE id = ${recordId}
      `);
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ message: "Bordro kaydı bulunamadı" });
      }
      
      const existing = existingResult.rows[0] as any;

      const lockResult = await checkDataLock('payroll_records', existing.created_at ? new Date(existing.created_at) : new Date(), existing.status || undefined);
      if (lockResult.locked) {
        return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
      }
      
      // Ödenmiş kayıt güncellenemez
      if (existing.status === 'paid') {
        return res.status(400).json({ message: "Ödenmiş bordro kaydı güncellenemez" });
      }
      
      const { 
        baseSalary, overtimeMinutes, overtimeAmount, bonusAmount,
        undertimeDeduction, mealAllowance, transportAllowance,
        totalNetPayable, grossSalary, sgkEmployee, sgkEmployer,
        unemploymentEmployee, unemploymentEmployer, incomeTax, stampTax,
        status, notes
      } = req.body;
      
      const result = await db.execute(sql`
        UPDATE payroll_records SET
          base_salary = COALESCE(${baseSalary}, base_salary),
          overtime_minutes = COALESCE(${overtimeMinutes}, overtime_minutes),
          overtime_amount = COALESCE(${overtimeAmount}, overtime_amount),
          bonus_amount = COALESCE(${bonusAmount}, bonus_amount),
          undertime_deduction = COALESCE(${undertimeDeduction}, undertime_deduction),
          meal_allowance = COALESCE(${mealAllowance}, meal_allowance),
          transport_allowance = COALESCE(${transportAllowance}, transport_allowance),
          total_net_payable = COALESCE(${totalNetPayable}, total_net_payable),
          gross_salary = COALESCE(${grossSalary}, gross_salary),
          sgk_employee = COALESCE(${sgkEmployee}, sgk_employee),
          sgk_employer = COALESCE(${sgkEmployer}, sgk_employer),
          unemployment_employee = COALESCE(${unemploymentEmployee}, unemployment_employee),
          unemployment_employer = COALESCE(${unemploymentEmployer}, unemployment_employer),
          income_tax = COALESCE(${incomeTax}, income_tax),
          stamp_tax = COALESCE(${stampTax}, stamp_tax),
          status = COALESCE(${status}, status),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${recordId}
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Update payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı güncellenemedi" });
    }
  });

  // PATCH /api/payroll/records/:id/approve - Bordro onaylama
  router.patch('/api/payroll/records/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const approverId = req.user?.id;
      
      // Sadece admin ve yöneticiler onaylayabilir
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Bordro onaylama yetkisi yok" });
      }
      
      const { id } = req.params;
      const recordId = parseInt(id);
      
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      const existingPayrollApprove = await db.execute(sql`SELECT created_at, status FROM payroll_records WHERE id = ${recordId}`);
      if (existingPayrollApprove.rows.length > 0) {
        const rec = existingPayrollApprove.rows[0] as any;
        const lockResult = await checkDataLock('payroll_records', rec.created_at ? new Date(rec.created_at) : new Date(), rec.status || undefined);
        if (lockResult.locked) {
          return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
        }
      }
      
      const result = await db.execute(sql`
        UPDATE payroll_records SET
          status = 'approved',
          approved_by_id = ${approverId},
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${recordId} AND status IN ('draft', 'pending_approval')
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(400).json({ message: "Bordro onaylanamadı (zaten onaylı veya bulunamadı)" });
      }
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Approve payroll record error:", error);
      res.status(500).json({ message: "Bordro onaylanamadı" });
    }
  });

  // PATCH /api/payroll/records/:id/pay - Bordro ödendi olarak işaretle
  router.patch('/api/payroll/records/:id/pay', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Ödeme işaretleme yetkisi yok" });
      }
      
      const { id } = req.params;
      const recordId = parseInt(id);
      
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      const existingPayrollPay = await db.execute(sql`SELECT created_at, status FROM payroll_records WHERE id = ${recordId}`);
      if (existingPayrollPay.rows.length > 0) {
        const rec = existingPayrollPay.rows[0] as any;
        const lockResult = await checkDataLock('payroll_records', rec.created_at ? new Date(rec.created_at) : new Date(), rec.status || undefined);
        if (lockResult.locked) {
          return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
        }
      }
      
      const result = await db.execute(sql`
        UPDATE payroll_records SET
          status = 'paid',
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = ${recordId} AND status = 'approved'
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(400).json({ message: "Ödeme işaretlenemedi (onaylı değil veya bulunamadı)" });
      }
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Pay payroll record error:", error);
      res.status(500).json({ message: "Ödeme işaretlenemedi" });
    }
  });

  // DELETE /api/payroll/records/:id - Bordro kaydını sil
  router.delete('/api/payroll/records/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Silme yetkisi yok" });
      }
      
      const { id } = req.params;
      const recordId = parseInt(id);
      
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }
      
      // Ödenmiş kayıt silinemez
      const existingResult = await db.execute(sql`
        SELECT status FROM payroll_records WHERE id = ${recordId}
      `);
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ message: "Bordro kaydı bulunamadı" });
      }
      
      const existing = existingResult.rows[0] as any;

      const lockResult = await checkDataLock('payroll_records', existing.created_at ? new Date(existing.created_at) : new Date(), existing.status || undefined);
      if (lockResult.locked) {
        return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
      }

      if (existing.status === 'paid') {
        return res.status(400).json({ message: "Ödenmiş bordro kaydı silinemez" });
      }
      
      await db.execute(sql`DELETE FROM payroll_records WHERE id = ${recordId}`);
      
      res.json({ message: "Bordro kaydı silindi" });
    } catch (error: unknown) {
      console.error("Delete payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı silinemedi" });
    }
  });


  // GET /api/employee-of-month/weights - Ayın Elemanı ağırlıklarını getir
  router.get('/api/employee-of-month/weights', isAuthenticated, async (req, res) => {
    try {
      const { branchId } = req.query;
      
      let weights;
      if (branchId) {
        weights = await db.select().from(employeeOfMonthWeights)
          .where(eq(employeeOfMonthWeights.branchId, parseInt(branchId as string)))
          .limit(1);
      }
      
      if (!weights || weights.length === 0) {
        weights = await db.select().from(employeeOfMonthWeights)
          .where(isNull(employeeOfMonthWeights.branchId))
          .limit(1);
      }

      if (weights.length === 0) {
        return res.json({
          attendanceWeight: 25,
          checklistWeight: 25,
          taskWeight: 20,
          customerRatingWeight: 20,
          leaveDeductionWeight: 10,
          bonusMaxPoints: 10,
        });
      }

      res.json(weights[0]);
    } catch (error: unknown) {
      console.error("Error fetching EoM weights:", error);
      res.status(500).json({ message: "Ağırlıklar alınamadı" });
    }
  });

  // PUT /api/employee-of-month/weights - Ayın Elemanı ağırlıklarını güncelle
  router.put('/api/employee-of-month/weights', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { branchId, attendanceWeight, checklistWeight, taskWeight, customerRatingWeight, leaveDeductionWeight, bonusMaxPoints } = req.body;

      const total = (attendanceWeight || 20) + (checklistWeight || 20) + (taskWeight || 15) + (customerRatingWeight || 15) + (managerRatingWeight || 20) + (leaveDeductionWeight || 10);
      if (total !== 100) {
        return res.status(400).json({ message: `Ağırlıklar toplamı 100 olmalı (şu an: ${total})` });
      }

      const existingCondition = branchId 
        ? eq(employeeOfMonthWeights.branchId, branchId)
        : sql`${employeeOfMonthWeights.branchId} IS NULL`;

      const existing = await db.select().from(employeeOfMonthWeights).where(existingCondition).limit(1);

      if (existing.length > 0) {
        await db.update(employeeOfMonthWeights).set({
          attendanceWeight,
          checklistWeight,
          taskWeight,
          customerRatingWeight,
          leaveDeductionWeight,
          bonusMaxPoints,
          updatedAt: new Date(),
        }).where(existingCondition);
      } else {
        await db.insert(employeeOfMonthWeights).values({
          branchId: branchId || null,
          attendanceWeight,
          checklistWeight,
          taskWeight,
          customerRatingWeight,
          leaveDeductionWeight,
          bonusMaxPoints,
          isActive: true,
        });
      }

      res.json({ success: true, message: "Ağırlıklar güncellendi" });
    } catch (error: unknown) {
      console.error("Error updating EoM weights:", error);
      res.status(500).json({ message: "Ağırlıklar güncellenemedi" });
    }
  });

  // POST /api/employee-of-month/calculate - Ayın Elemanı hesaplama

  // GET /api/employee-of-month/performance - Aylık performans listesi
  router.get('/api/employee-of-month/performance', isAuthenticated, async (req, res) => {
    try {
      const { branchId, month, year } = req.query;
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      const conditions = [];
      if (month) conditions.push(eq(monthlyEmployeePerformance.month, parseInt(month as string)));
      if (year) conditions.push(eq(monthlyEmployeePerformance.year, parseInt(year as string)));
      
      if (branchId) {
        conditions.push(eq(monthlyEmployeePerformance.branchId, parseInt(branchId as string)));
      } else if (userRole !== 'admin' && userBranchId) {
        conditions.push(eq(monthlyEmployeePerformance.branchId, userBranchId));
      }

      const performances = await db.select().from(monthlyEmployeePerformance)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(monthlyEmployeePerformance.finalScore));

      const enriched = await Promise.all(performances.map(async (p) => {
        const user = await db.select({ firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl })
          .from(users).where(eq(users.id, p.userId)).limit(1);
        return { ...p, user: user[0] || null };
      }));

      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching performances:", error);
      res.status(500).json({ message: "Performans listesi alınamadı" });
    }
  });

  // POST /api/employee-of-month/award - Ayın Elemanı ödülü ver
  router.post('/api/employee-of-month/award', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { userId, branchId, month, year, awardType, awardTitle, awardDescription } = req.body;

      const perf = await db.select().from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.userId, userId),
          eq(monthlyEmployeePerformance.month, month),
          eq(monthlyEmployeePerformance.year, year)
        )).limit(1);

      if (perf.length === 0) {
        return res.status(400).json({ message: "Performans kaydı bulunamadı" });
      }

      const [award] = await db.insert(employeeOfMonthAwards).values({
        userId,
        branchId,
        month,
        year,
        finalScore: perf[0].finalScore || 0,
        performanceId: perf[0].id,
        awardType: awardType || 'employee_of_month',
        awardTitle: awardTitle || 'Ayın Elemanı',
        awardDescription,
        status: 'pending',
      }).returning();

      await db.update(monthlyEmployeePerformance)
        .set({ status: 'awarded', updatedAt: new Date() })
        .where(eq(monthlyEmployeePerformance.id, perf[0].id));

      res.json({ success: true, award });
    } catch (error: unknown) {
      console.error("Error creating award:", error);
      if (error.code === '23505') {
        return res.status(400).json({ message: "Bu dönem için zaten ödül mevcut" });
      }
      res.status(500).json({ message: "Ödül oluşturulamadı" });
    }
  });
  // GET /api/employee-of-month/current-winner - Dashboard widget icin guncel kazanan
  router.get("/api/employee-of-month/current-winner", isAuthenticated, async (req, res) => {
    try {
      const userBranchId = req.user?.branchId;
      const userRole = req.user?.role;
      const isHQRole = ["admin", "coach", "support", "finance", "trainer"].includes(userRole);
      
      // Simple query without nested select
      let query = db.select().from(employeeOfMonthAwards)
        .where(eq(employeeOfMonthAwards.status, "approved"))
        .orderBy(desc(employeeOfMonthAwards.year), desc(employeeOfMonthAwards.month))
        .limit(5);
      
      const allAwards = await query;
      
      // Filter by branch if not HQ
      const filteredAwards = isHQRole ? allAwards : allAwards.filter(a => a.branchId === userBranchId);
      
      if (filteredAwards.length === 0) {
        return res.json(null);
      }
      
      const award = filteredAwards[0];
      
      // Get winner details separately
      const winnerUser = award.winnerId ? await db.select().from(users).where(eq(users.id, award.winnerId)).limit(1) : [];
      const winnerBranch = award.branchId ? await db.select().from(branches).where(eq(branches.id, award.branchId)).limit(1) : [];
      
      const user = winnerUser[0];
      const branch = winnerBranch[0];
      
      res.json({
        id: award.id,
        month: award.month,
        year: award.year,
        score: award.winnerScore || 0,
        winnerId: award.winnerId,
        winnerName: user ? ((user.firstName || "") + " " + (user.lastName || "")).trim() : "Bilinmiyor",
        winnerPhoto: user?.profilePhotoUrl || null,
        branchId: award.branchId,
        branchName: branch?.name || "Bilinmiyor",
      });
    } catch (error: unknown) {
      console.error("Error fetching current winner:", error);
      res.status(500).json({ message: "Kazanan alinamadi" });
    }
  });


  // GET /api/employee-of-month/awards - Ayın Elemanı ödüllerini listele

  // PUT /api/employee-of-month/awards/:id/approve - Ödülü onayla
  router.put('/api/employee-of-month/awards/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { id } = req.params;
      
      // Get the award details first
      const [awardData] = await db.select().from(employeeOfMonthAwards)
        .where(eq(employeeOfMonthAwards.id, parseInt(id)));
      
      if (!awardData) {
        return res.status(404).json({ message: "Ödül bulunamadı" });
      }

      await db.update(employeeOfMonthAwards).set({
        status: 'approved',
        approvedById: req.user?.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(employeeOfMonthAwards.id, parseInt(id)));

      // Send congratulation email and award badge to the winner
      try {
        const [winner] = await db.select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, awardData.userId));

        const [branchData] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, awardData.branchId));

        // Award the "Ayin Elemani" badge
        const [eomBadge] = await db.select().from(badges)
          .where(eq(badges.badgeKey, 'employee_of_month'));
        
        if (eomBadge) {
          await db.insert(userBadges).values({
            userId: awardData.userId,
            badgeId: eomBadge.id,
            earnedAt: new Date(),
          }).onConflictDoNothing();
        }

        if (winner?.email) {
          const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 
                              'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
          const monthYear = `${monthNames[awardData.month - 1]} ${awardData.year}`;
          
          await sendEmployeeOfMonthEmail(
            winner.email,
            `${winner.firstName} ${winner.lastName}`,
            branchData?.name || 'DOSPRESSO',
            monthYear,
            awardData.finalScore || 0
          );
        }
      } catch (emailError) {
        console.error("Email/badge error (non-critical):", emailError);
      }

      res.json({ success: true, message: "Ödül onaylandı ve tebrik emaili gönderildi" });
    } catch (error: unknown) {
      console.error("Error approving award:", error);
      res.status(500).json({ message: "Ödül onaylanamadı" });
    }
  });


  // GET /api/admin/dashboard-widgets - Get ALL widgets for admin editor
  // POST /api/admin/dashboard-widgets - Create a new widget item
  // PATCH /api/admin/dashboard-widgets/:id - Update a widget item
  // DELETE /api/admin/dashboard-widgets/:id - Delete a widget item
  // ============================================
  // SALARY SCALES (Maaş Tablosu) ENDPOINTS
  // ============================================

  // GET /api/salary-scales - Get all active salary scales
  router.get('/api/salary-scales', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['admin', 'muhasebe', 'muhasebe_ik', 'yatirimci_hq', 'yatirimci_branch', 'supervisor'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu verilere erişim yetkiniz yok" });
      }

      const result = await db.execute(sql`SELECT * FROM salary_scales WHERE is_active = true ORDER BY location_type, level`);

      const scales = result.rows.map((row) => ({
        id: row.id,
        locationType: row.location_type,
        positionName: row.position_name,
        level: row.level,
        baseSalary: row.base_salary,
        cashRegisterBonus: row.cash_register_bonus,
        performanceBonus: row.performance_bonus,
        bonusCalculationType: row.bonus_calculation_type,
        totalSalary: row.total_salary,
        isActive: row.is_active,
      }));

      res.json(scales);
    } catch (error: unknown) {
      console.error("Error fetching salary scales:", error);
      res.status(500).json({ message: "Maaş tablosu alınamadı" });
    }
  });

  // PUT /api/salary-scales/:id - Update a salary scale
  router.put('/api/salary-scales/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['admin', 'muhasebe', 'muhasebe_ik'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      const { baseSalary, cashRegisterBonus, performanceBonus, bonusCalculationType, totalSalary } = req.body;

      const result = await db.execute(sql`
        UPDATE salary_scales 
        SET base_salary = ${baseSalary},
            cash_register_bonus = ${cashRegisterBonus},
            performance_bonus = ${performanceBonus},
            bonus_calculation_type = ${bonusCalculationType},
            total_salary = ${totalSalary},
            updated_by = ${user.id},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Maaş skalası bulunamadı" });
      }

      const row = result.rows[0] as any;
      res.json({
        id: row.id,
        locationType: row.location_type,
        positionName: row.position_name,
        level: row.level,
        baseSalary: row.base_salary,
        cashRegisterBonus: row.cash_register_bonus,
        performanceBonus: row.performance_bonus,
        bonusCalculationType: row.bonus_calculation_type,
        totalSalary: row.total_salary,
        isActive: row.is_active,
      });
    } catch (error: unknown) {
      console.error("Error updating salary scale:", error);
      res.status(500).json({ message: "Maaş skalası güncellenemedi" });
    }
  });

  router.get('/api/hr/employees/:userId/documents', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo'];
      const branchRoles = ['mudur', 'supervisor', 'coach'];
      if (!allowedRoles.includes(user.role) && user.id !== targetUserId) {
        if (branchRoles.includes(user.role)) {
          const [targetUser] = await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, targetUserId));
          if (!targetUser || targetUser.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu belgelere erişim yetkiniz yok" });
          }
        } else {
          return res.status(403).json({ message: "Bu belgelere erişim yetkiniz yok" });
        }
      }
      const docs = await db.select().from(employeeDocuments)
        .where(eq(employeeDocuments.userId, targetUserId))
        .orderBy(desc(employeeDocuments.createdAt));
      res.json(docs);
    } catch (error: unknown) {
      console.error("Error fetching employee documents:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Belgeler getirilemedi" });
    }
  });

  router.post('/api/hr/employees/:userId/documents', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo', 'mudur', 'supervisor'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Belge ekleme yetkiniz yok" });
      }
      const { documentType, documentName, fileUrl, description, expiryDate, notes } = req.body;
      if (!documentType || !documentName) {
        return res.status(400).json({ message: "Belge türü ve adı zorunlu" });
      }
      const [doc] = await db.insert(employeeDocuments).values({
        userId: targetUserId,
        documentType,
        documentName,
        fileUrl: fileUrl || null,
        description: description || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedById: user.id,
        uploadedAt: new Date(),
        notes: notes || null,
      }).returning();
      res.status(201).json(doc);
    } catch (error: unknown) {
      console.error("Error creating employee document:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Belge eklenemedi" });
    }
  });

  router.patch('/api/hr/documents/:docId/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Belge doğrulama yetkiniz yok" });
      }
      const docId = parseInt(req.params.docId);
      const [doc] = await db.update(employeeDocuments)
        .set({ isVerified: true, verifiedById: user.id, verifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(employeeDocuments.id, docId))
        .returning();
      if (!doc) return res.status(404).json({ message: "Belge bulunamadı" });
      res.json(doc);
    } catch (error: unknown) {
      console.error("Error verifying document:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Belge doğrulanamadı" });
    }
  });

  router.delete('/api/hr/documents/:docId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Belge silme yetkiniz yok" });
      }
      const docId = parseInt(req.params.docId);
      await db.delete(employeeDocuments).where(eq(employeeDocuments.id, docId));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting document:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Belge silinemedi" });
    }
  });

  router.get('/api/hr/documents/expiring', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const docs = await db.select({
        doc: employeeDocuments,
        user: { id: users.id, firstName: users.firstName, lastName: users.lastName },
      }).from(employeeDocuments)
        .leftJoin(users, eq(employeeDocuments.userId, users.id))
        .where(
          and(
            isNotNull(employeeDocuments.expiryDate),
            lte(employeeDocuments.expiryDate, thirtyDaysLater),
            gte(employeeDocuments.expiryDate, new Date())
          )
        )
        .orderBy(asc(employeeDocuments.expiryDate));
      res.json(docs);
    } catch (error: unknown) {
      console.error("Error fetching expiring documents:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Süresi dolan belgeler getirilemedi" });
    }
  });

  router.get('/api/hr/disciplinary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo'];
      const branchRoles = ['mudur', 'supervisor', 'coach'];
      let query = db.select({
        report: disciplinaryReports,
        employee: { id: users.id, firstName: users.firstName, lastName: users.lastName },
      }).from(disciplinaryReports)
        .leftJoin(users, eq(disciplinaryReports.userId, users.id));

      if (branchRoles.includes(user.role) && user.branchId) {
        query = query.where(eq(disciplinaryReports.branchId, user.branchId)) as any;
      } else if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const reports = await query.orderBy(desc(disciplinaryReports.createdAt));
      res.json(reports);
    } catch (error: unknown) {
      console.error("Error fetching disciplinary reports:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Tutanaklar getirilemedi" });
    }
  });

  router.get('/api/hr/disciplinary/employee/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo'];
      const branchRoles = ['mudur', 'supervisor', 'coach'];
      if (!allowedRoles.includes(user.role) && user.id !== targetUserId) {
        if (branchRoles.includes(user.role)) {
          const [targetUser] = await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, targetUserId));
          if (!targetUser || targetUser.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu tutanaklara erişim yetkiniz yok" });
          }
        } else {
          return res.status(403).json({ message: "Bu tutanaklara erişim yetkiniz yok" });
        }
      }
      const reports = await db.select().from(disciplinaryReports)
        .where(eq(disciplinaryReports.userId, targetUserId))
        .orderBy(desc(disciplinaryReports.createdAt));
      res.json(reports);
    } catch (error: unknown) {
      console.error("Error fetching employee disciplinary:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Tutanaklar getirilemedi" });
    }
  });

  router.post('/api/hr/disciplinary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'mudur', 'supervisor', 'coach'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Tutanak oluşturma yetkiniz yok" });
      }
      const { userId, branchId, reportType, severity, subject, description, incidentDate, incidentTime, location, witnessIds, attachmentUrls, notes } = req.body;
      if (!userId || !reportType || !subject) {
        return res.status(400).json({ message: "Personel, tutanak türü ve konu zorunlu" });
      }
      const [report] = await db.insert(disciplinaryReports).values({
        userId,
        branchId: branchId || user.branchId || null,
        reportType,
        severity: severity || 'warning',
        subject,
        description: description || null,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        incidentTime: incidentTime || null,
        location: location || null,
        witnessIds: witnessIds || [],
        attachmentUrls: attachmentUrls || [],
        createdById: user.id,
        status: 'open',
        notes: notes || null,
      }).returning();

      try {
        await db.insert(notifications).values({
          userId,
          title: 'Yeni Tutanak',
          message: `Hakkınızda "${subject}" konulu tutanak oluşturuldu.`,
          type: 'disciplinary',
        });
      } catch (notifErr) {
        console.error("[HR] Notification error:", notifErr);
      }

      res.status(201).json(report);
    } catch (error: unknown) {
      console.error("Error creating disciplinary report:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Tutanak oluşturulamadı" });
    }
  });

  router.patch('/api/hr/disciplinary/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'mudur', 'supervisor'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Tutanak güncelleme yetkiniz yok" });
      }
      const reportId = parseInt(req.params.id);
      const { status, resolution, actionTaken, followUpRequired, followUpDate, notes } = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (resolution) updates.resolution = resolution;
      if (actionTaken) updates.actionTaken = actionTaken;
      if (followUpRequired !== undefined) updates.followUpRequired = followUpRequired;
      if (followUpDate) updates.followUpDate = new Date(followUpDate);
      if (notes) updates.notes = notes;
      if (status === 'resolved') {
        updates.resolvedById = user.id;
        updates.resolvedAt = new Date();
      }
      const [report] = await db.update(disciplinaryReports)
        .set(updates)
        .where(eq(disciplinaryReports.id, reportId))
        .returning();
      if (!report) return res.status(404).json({ message: "Tutanak bulunamadı" });
      res.json(report);
    } catch (error: unknown) {
      console.error("Error updating disciplinary report:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Tutanak güncellenemedi" });
    }
  });

  router.post('/api/hr/disciplinary/:id/respond', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const reportId = parseInt(req.params.id);
      const [existing] = await db.select().from(disciplinaryReports)
        .where(eq(disciplinaryReports.id, reportId)).limit(1);
      if (!existing) return res.status(404).json({ message: "Tutanak bulunamadı" });
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Sadece ilgili personel yanıt verebilir" });
      }
      const { employeeResponse, attachmentUrls } = req.body;
      if (!employeeResponse) {
        return res.status(400).json({ message: "Yanıt metni zorunlu" });
      }
      const [report] = await db.update(disciplinaryReports)
        .set({
          employeeResponse,
          employeeResponseDate: new Date(),
          employeeResponseAttachments: attachmentUrls || [],
          updatedAt: new Date(),
        })
        .where(eq(disciplinaryReports.id, reportId))
        .returning();
      res.json(report);
    } catch (error: unknown) {
      console.error("Error responding to disciplinary:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Yanıt gönderilemedi" });
    }
  });

  router.get('/api/hr/ik-dashboard', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const allowedRoles = ['admin', 'muhasebe_ik', 'genel_mudur', 'ceo', 'coo'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const allDocs = await db.select({ cnt: sql<number>`count(*)` }).from(employeeDocuments);
      const verifiedDocs = await db.select({ cnt: sql<number>`count(*)` }).from(employeeDocuments)
        .where(eq(employeeDocuments.isVerified, true));
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const expiringDocs = await db.select({ cnt: sql<number>`count(*)` }).from(employeeDocuments)
        .where(
          and(
            isNotNull(employeeDocuments.expiryDate),
            lte(employeeDocuments.expiryDate, thirtyDaysLater),
            gte(employeeDocuments.expiryDate, new Date())
          )
        );
      const openReports = await db.select({ cnt: sql<number>`count(*)` }).from(disciplinaryReports)
        .where(eq(disciplinaryReports.status, 'open'));
      const totalReports = await db.select({ cnt: sql<number>`count(*)` }).from(disciplinaryReports);

      const totalDocCount = Number(allDocs[0]?.cnt || 0);
      const verifiedCount = Number(verifiedDocs[0]?.cnt || 0);

      res.json({
        documents: {
          total: totalDocCount,
          verified: verifiedCount,
          completionRate: totalDocCount > 0 ? Math.round((verifiedCount / totalDocCount) * 100) : 0,
          expiringSoon: Number(expiringDocs[0]?.cnt || 0),
        },
        disciplinary: {
          total: Number(totalReports[0]?.cnt || 0),
          open: Number(openReports[0]?.cnt || 0),
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching IK dashboard:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "İK dashboard verileri getirilemedi" });
    }
  });

export default router;

export async function initOnboardingMigrations() {
  try {
    await db.execute(sql`ALTER TABLE onboarding_template_steps ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE onboarding_template_steps ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
  } catch (error) {
    console.error("[ONBOARDING] Migration error:", error);
  }
}
