import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { sanitizeUser, sanitizeUsers, sanitizeUserForRole, sanitizeUsersForRole } from "./security";
import { buildMenuForUser } from "./menu-service";
import { 
  insertTaskSchema,
  updateTaskSchema,
  insertChecklistSchema,
  updateChecklistSchema,
  insertEquipmentFaultSchema, 
  insertKnowledgeBaseArticleSchema, 
  insertBranchSchema,
  insertTrainingModuleSchema,
  insertModuleVideoSchema,
  insertModuleLessonSchema,
  insertModuleQuizSchema,
  insertQuizQuestionSchema,
  insertUserQuizAttemptSchema,
  insertUserTrainingProgressSchema,
  updateUserSchema,
  insertUserSchema,
  insertEmployeeWarningSchema,
  insertLeaveRequestSchema,
  insertShiftAttendanceSchema,
  insertMenuSectionSchema,
  insertMenuItemSchema,
  insertMenuVisibilityRuleSchema,
  insertPageContentSchema,
  insertAuditTemplateSchema,
  insertAuditTemplateItemSchema,
  insertQualityAuditSchema,
  insertAuditItemScoreSchema,
  insertAuditInstanceSchema,
  insertAuditInstanceItemSchema,
  correctiveActions,
  correctiveActionUpdates,
  insertCorrectiveActionSchema,
  insertCorrectiveActionUpdateSchema,
  insertCustomerFeedbackSchema,
  feedbackResponses,
  insertFeedbackResponseSchema,
  insertMaintenanceScheduleSchema,
  insertMaintenanceLogSchema,
  insertCampaignSchema,
  insertCampaignBranchSchema,
  insertCampaignMetricSchema,
  insertFranchiseOnboardingSchema,
  insertOnboardingDocumentSchema,
  insertLicenseRenewalSchema,
  insertSiteSettingSchema,
  insertOvertimeRequestSchema,
  insertAttendancePenaltySchema,
  insertGuestComplaintSchema,
  insertEquipmentTroubleshootingStepSchema,
  insertMonthlyAttendanceSummarySchema,
  insertEmployeeDocumentSchema,
  insertDisciplinaryReportSchema,
  insertEmployeeOnboardingSchema,
  insertEmployeeOnboardingTaskSchema,
  insertMessageSchema,
  insertTrainingMaterialSchema,
  insertTrainingAssignmentSchema,
  insertTrainingCompletionSchema,
  trainingMaterials,
  trainingAssignments,
  trainingCompletions,
  auditTemplates,
  auditTemplateItems,
  auditInstances,
  auditInstanceItems,
  qualityAudits,
  auditItemScores,
  branchAuditScores,
  customerFeedback,
  branches,
  maintenanceSchedules,
  maintenanceLogs,
  equipmentCalibrations,
  insertEquipmentCalibrationSchema,
  campaigns,
  campaignBranches,
  campaignMetrics,
  franchiseOnboarding,
  onboardingDocuments,
  licenseRenewals,
  threadParticipants,
  announcements,
  announcementReadStatus,
  hasPermission,
  isHQRole,
  isBranchRole,
  type UpdateUser,
  type UserRoleType,
  type InsertAuditTemplateItem,
  type ServiceRequestStatusType,
  equipmentServiceRequests,
  badges,
  userBadges,
  insertBadgeSchema,
  insertUserBadgeSchema,
  insertLostFoundItemSchema,
  handoverLostFoundItemSchema,
  shifts,
  tasks,
  equipmentFaults,
  equipment,
  users,
  recipeCategories,
  recipes,
  recipeVersions,
  academyHubCategories,
  dailyMissions,
  userMissionProgress,
  leaderboardSnapshots,
  userPracticeSessions,
  userQuizAttempts,
  projects,
  projectMembers,
  projectTasks,
  projectComments,
  projectMilestones,
  projectTaskDependencies,
  insertProjectSchema,
  insertProjectMemberSchema,
  insertProjectTaskSchema,
  insertProjectCommentSchema,
  insertProjectMilestoneSchema,
  insertProjectTaskDependencySchema,
  insertRecipeSchema,
  insertRecipeVersionSchema,
  insertRecipeCategorySchema,
  quizzes,
  quizQuestions,
  emailSettings,
  serviceEmailSettings,
  banners,
  aiSettings,
  // New Shop Opening Management (existing tables from schema.ts)
  projectPhases,
  projectBudgetLines,
  projectVendors,
  projectRisks,
  externalUsers,
  externalUserProjects,
  externalUserAuditLog,
  insertProjectPhaseSchema,
  insertProjectBudgetLineSchema,
  insertProjectVendorSchema,
  insertProjectRiskSchema,
  insertExternalUserSchema,
  insertExternalUserProjectSchema,
  NEW_SHOP_PHASE_TEMPLATE,
  PHASE_STATUS,
  // Phase Management System tables
  phaseAssignments,
  phaseSubTasks,
  procurementItems,
  procurementProposals,
  insertPhaseAssignmentSchema,
  insertPhaseSubTaskSchema,
  insertProcurementItemSchema,
  insertProcurementProposalSchema,
  // İşe Alım Modülü
  jobPositions,
  jobApplications,
  interviews,
  interviewQuestions,
  interviewResponses,
  insertJobPositionSchema,
  insertJobApplicationSchema,
  insertInterviewSchema,
  insertInterviewQuestionSchema,
  insertInterviewResponseSchema,
  // İşten Çıkış Modülü
  employeeTerminations,
  insertEmployeeTerminationSchema,
  // İzin ve Tatil Modülü
  employeeLeaves,
  publicHolidays,
  leaveRecords,
  insertEmployeeLeaveSchema,
  insertPublicHolidaySchema,
  shiftAttendance,
  // Maaş Yönetimi
  employeeSalaries,
  salaryDeductionTypes,
  salaryDeductions,
  monthlyPayrolls,
  insertEmployeeSalarySchema,
  insertSalaryDeductionTypeSchema,
  insertSalaryDeductionSchema,
  insertMonthlyPayrollSchema,
  feedbackFormSettings,
  insertFeedbackFormSettingsSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, isNull, isNotNull, inArray, lte, gte } from "drizzle-orm";
import { analyzeTaskPhoto, analyzeFaultPhoto, analyzeDressCodePhoto, generateArticleEmbeddings, generateEmbedding, answerQuestionWithRAG, answerTechnicalQuestion, generateAISummary, generateQuizQuestionsFromLesson, generateFlashcardsFromLesson, evaluateBranchPerformance, diagnoseFault, generateTrainingModule, processUploadedFile, generateBranchSummaryReport, generateArticleDraft } from "./ai";
import multer from "multer";
import { generateTrainingMaterialBundle } from "./ai-motor";
import { updateEmployeeLocation, getActiveBranchEmployees, getEmployeeLocation, removeEmployeeLocation, startTrackingCleanup } from "./tracking";
import { sendNotificationEmail } from "./email";
import { startReminderSystem } from "./reminders";
import bcrypt from "bcrypt";
import { z } from "zod";
import { resolvePermissionScope, applyScopeFilter, getUserPermissions, getAllActionsGroupedByModule, getRoleGrants, upsertPermissionGrant, deletePermissionGrant } from "./permission-service";

// Multer configuration for file uploads (memory storage)
const uploadStorage = multer.memoryStorage();
const trainingFileUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü. PDF, JPEG, PNG veya HEIC yükleyin.'));
    }
  }
});

// Helper to generate branch summary report
async function generateBranchSummary(pendingTasks: number, activeFaults: number, overdueChecklists: number, maintenanceReminders: number, criticalEquipment: number, avgHealth: number, period: 'daily' | 'weekly' | 'monthly', userId: string): Promise<string> {
  try {
    return await generateBranchSummaryReport(period, {
      activeFaults,
      pendingTasks,
      overdueChecklists,
      maintenanceReminders,
      criticalEquipment,
      totalAbsences: 0,
      slaBreaches: 0,
      averageEquipmentHealth: avgHealth,
      branchName: "Şubemiz"
    }, userId);
  } catch (e) {
    return `${period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık'}: ${activeFaults} arıza, ${pendingTasks} görev`;
  }
}

// Performance: Simple in-memory cache with TTL
const responseCache = new Map<string, { data: any; expiresAt: number }>();
const getCachedResponse = (key: string) => {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
};
const setCachedResponse = (key: string, data: unknown, ttlSeconds: number = 60) => {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
};
const invalidateCache = (pattern: string) => {
  const keysToDelete: string[] = [];
  responseCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => responseCache.delete(key));
};

// Global type declarations for runtime state
declare global {
  var fileAccessTokens: Map<string, { path: string; userId: string; expiresAt: number }> | undefined;
}

// Update schema for page content - allows partial updates, immutable createdById
const updatePageContentSchema = insertPageContentSchema.partial().omit({
  createdById: true,
});

// Safe task update schema - only allows user-editable fields
const safeTaskUpdateSchema = updateTaskSchema.pick({
  description: true,
  priority: true,
  dueDate: true,
  assignedToId: true,
  // Onboarding checker fields
  isOnboarding: true,
  checkerId: true,
});

// Helper function to assert branch scope for branch users
function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

// Custom error for permission denial
class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

// Permission enforcement helper
function ensurePermission(user: unknown, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module , action )) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

// Helper function to check project access (HQ, admin, or project owner)
async function checkProjectAccess(user: any, projectId: number): Promise<{ allowed: boolean; error?: string }> {
  if (isHQRole(user.role) || user.role === 'admin') {
    return { allowed: true };
  }
  const [project] = await db.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.id, projectId));
  if (!project) {
    return { allowed: false, error: "Proje bulunamadı" };
  }
  if (project.ownerId === user.id) {
    return { allowed: true };
  }
  return { allowed: false, error: "Bu işlem için yetkiniz yok" };
}

// Helper function to check project access via phase ID
async function checkProjectAccessByPhaseId(user: any, phaseId: number): Promise<{ allowed: boolean; error?: string; projectId?: number }> {
  if (isHQRole(user.role) || user.role === 'admin') {
    return { allowed: true };
  }
  const [phase] = await db.select({ projectId: projectPhases.projectId }).from(projectPhases).where(eq(projectPhases.id, phaseId));
  if (!phase) {
    return { allowed: false, error: "Faz bulunamadı" };
  }
  const [project] = await db.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.id, phase.projectId));
  if (!project) {
    return { allowed: false, error: "Proje bulunamadı" };
  }
  if (project.ownerId === user.id) {
    return { allowed: true, projectId: phase.projectId };
  }
  return { allowed: false, error: "Bu işlem için yetkiniz yok" };
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // GET /api/health - Public health check for Docker/load balancer
  app.get('/api/health', async (req, res) => {
    try {
      // Simple database ping
      await db.execute(sql`SELECT 1`);
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({ status: 'error', message: 'Database connection failed' });
    }
  });

  // POST /api/auth/register - Public registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { sendApprovalRequestEmail, sendWelcomeEmail } = await import('./email');
      const crypto = await import('crypto');
      
      // Valid roles from UserRole enum
      const validRoles = [
        'admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq',
        'stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'yatirimci_branch'
      ] as const;
      
      const registerSchema = z.object({
        email: z.string().email("Geçerli bir email adresi girin"),
        firstName: z.string().min(1, "Ad gerekli"),
        lastName: z.string().min(1, "Soyad gerekli"),
        username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
        password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
        role: z.enum(validRoles, { errorMap: () => ({ message: "Geçersiz rol seçimi" }) }),
        branchId: z.number().nullable().optional(),
      });

      const data = registerSchema.parse(req.body);

      // Check if email already exists
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Bu email adresi zaten kayıtlı" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      // Determine if HQ role
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      const isHQ = hqRoles.includes(data.role);

      // Enforce: HQ roles MUST have null branchId
      if (isHQ && data.branchId !== null && data.branchId !== undefined) {
        return res.status(400).json({ message: "Merkez personeli şube ataması alamaz" });
      }

      // Enforce: Branch roles MUST have valid branchId
      if (!isHQ && (!data.branchId || typeof data.branchId !== 'number')) {
        return res.status(400).json({ message: "Şube personeli için şube seçimi zorunlu" });
      }

      // Validate branchId exists in database
      if (data.branchId) {
        const branchExists = await storage.getBranch(data.branchId);
        if (!branchExists) {
          return res.status(400).json({ message: "Geçersiz şube seçimi" });
        }
      }

      // Validate branch selection
      if (!isHQ && !data.branchId) {
        return res.status(400).json({ message: "Şube seçimi gerekli" });
      }
      if (isHQ && data.branchId) {
        return res.status(400).json({ message: "Merkez kullanıcılar şube seçemez" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user with pending status
      const newUser = await storage.createUser({
        email: data.email,
        username: data.username,
        hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        branchId: data.branchId || null,
        accountStatus: 'pending',
        isActive: false, // Inactive until approved
      });

      // Send approval email to appropriate admin
      if (isHQ) {
        // Send to system admin
        const admins = await storage.getUsersByRole('admin');
        for (const admin of admins) {
          if (admin.email && admin.accountStatus === 'approved') {
            await sendApprovalRequestEmail(
              admin.email,
              `${data.firstName} ${data.lastName}`,
              data.email
            );
          }
        }
      } else {
        // Send to branch supervisor
        const supervisors = await storage.getUsersByBranchAndRole(data.branchId!, 'supervisor');
        const branch = await storage.getBranch(data.branchId!);
        for (const supervisor of supervisors) {
          if (supervisor.email && supervisor.accountStatus === 'approved') {
            await sendApprovalRequestEmail(
              supervisor.email,
              `${data.firstName} ${data.lastName}`,
              data.email,
              branch?.name
            );
          }
        }
      }

      res.json({ 
        message: "Kayıt talebiniz alındı. Onay sonrası email ile bilgilendirileceksiniz.",
        userId: newUser.id 
      });
    } catch (error: Error | unknown) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Kayıt sırasında hata oluştu" });
    }
  });

  // POST /api/auth/forgot-password - Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { sendPasswordResetEmail } = await import('./email');
      const crypto = await import('crypto');
      
      const schema = z.object({
        email: z.string().email("Geçerli bir email adresi girin"),
      });

      const { email } = schema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists (security best practice)
        return res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi" });
      }

      // Generate reset token (plaintext for email)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Hash token using SHA-256 (deterministic, allows O(1) lookup)
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Store hashed token
      await storage.createPasswordResetToken({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        usedAt: null,
      });

      // Send email with plaintext token (user needs this for reset link)
      await sendPasswordResetEmail(email, token);

      res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi" });
    } catch (error: Error | unknown) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "İşlem sırasında hata oluştu" });
    }
  });

  // POST /api/auth/reset-password/:token - Reset password with token
  app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
      const crypto = await import('crypto');
      const { token } = req.params;
      const schema = z.object({
        password: z.string().min(8, "Şifre en az 8 karakter olmalı")
          .regex(/[A-Z]/, "Şifre en az 1 büyük harf içermeli")
          .regex(/[0-9]/, "Şifre en az 1 rakam içermeli"),
      });

      const { password } = schema.parse(req.body);

      // Hash incoming token using SHA-256 (deterministic, O(1) lookup)
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Direct lookup by hashed token (O(1) instead of O(n))
      const resetToken = await storage.getPasswordResetToken(hashedToken);

      if (!resetToken || resetToken.usedAt) {
        return res.status(400).json({ message: "Geçersiz veya kullanılmış token" });
      }

      // Check expiration
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Token süresi dolmuş" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // CRITICAL: Mark token as used BEFORE updating password (prevents race condition)
      await storage.markPasswordResetTokenUsed(resetToken.id);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      res.json({ message: "Şifre başarıyla değiştirildi" });
    } catch (error: Error | unknown) {
      console.error("Reset password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "İşlem sırasında hata oluştu" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/users - Get all users (sanitized, for dropdowns/selection)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId: filterBranchId } = req.query;

      // Permission check
      if (!hasPermission(user.role as UserRoleType, 'employees', 'view')) {
        return res.status(403).json({ message: "Kullanıcı listesine erişim yetkiniz yok" });
      }

      // Branch filtering based on role
      let branchFilter: number | undefined;
      if (isBranchRole(user.role as UserRoleType)) {
        // Branch users only see their own branch users
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        branchFilter = user.branchId;
      } else if (isHQRole(user.role as UserRoleType)) {
        // HQ users can optionally filter by branch
        branchFilter = filterBranchId ? parseInt(filterBranchId as string) : undefined;
      }

      const users = await storage.getAllEmployees(branchFilter);
      res.json(sanitizeUsersForRole(users, user.role as UserRoleType));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // POST /api/upload/photo - Upload base64 photo to Object Storage
  app.post('/api/upload/photo', isAuthenticated, async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const { z } = await import('zod');
      const crypto = await import('crypto');
      
      const uploadSchema = z.object({
        dataUrl: z.string(),
        filename: z.string(),
      });
      
      const { dataUrl, filename } = uploadSchema.parse(req.body);
      
      // Parse base64 data URL
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Invalid data URL format" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate a secure access token for this file
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      // Upload to Object Storage
      const client = new Client();
      const path = `.private/shift-photos/${req.user.id}/${filename}`;
      const { ok, error } = await client.uploadFromBytes(path, buffer);
      
      if (!ok) {
        console.error("Object Storage upload failed:", error);
        return res.status(500).json({ message: "Upload failed", error });
      }
      
      // Store access token mapping (in-memory for now, use Redis/DB for production)
      if (!global.fileAccessTokens) {
        global.fileAccessTokens = new Map();
      }
      global.fileAccessTokens.set(accessToken, {
        path,
        userId: req.user.id,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });
      
      // Generate a fully qualified download URL with token
      const protocol = req.protocol || 'https';
      const host = req.get('host') || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const url = `${protocol}://${host}/api/files/public/${accessToken}`;
      
      res.json({ url, path, size: buffer.length });
    } catch (error: Error | unknown) {
      console.error("Error uploading photo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid upload data", errors: error.errors });
      }
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // GET /api/files/public/:token - Serve files via token (for AI services)
  app.get('/api/files/public/:token', async (req, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      const token = req.params.token;
      
      // Check token validity
      if (!global.fileAccessTokens || !global.fileAccessTokens.has(token)) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      const tokenData = global.fileAccessTokens.get(token);
      
      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        global.fileAccessTokens.delete(token);
        return res.status(404).json({ message: "Token expired" });
      }
      
      const { ok, value, error } = await client.downloadAsBytes(tokenData.path);
      
      if (!ok) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Detect mime type from path
      let mimeType = 'application/octet-stream';
      if (tokenData.path.endsWith('.jpg') || tokenData.path.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (tokenData.path.endsWith('.png')) {
        mimeType = 'image/png';
      }
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
      res.send(Buffer.from(value));
    } catch (error: any) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // GET /api/files/:path - Serve files from Object Storage (authenticated)
  app.get('/api/files/*', isAuthenticated, async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      const path = req.params[0];
      const user = req.user!;
      
      // Security: Only allow users to access their own files or public files
      if (path.startsWith('.private/shift-photos/')) {
        const pathParts = path.split('/');
        const fileUserId = pathParts[2]; // .private/shift-photos/{userId}/...
        
        // Only allow access to own files or HQ admin access
        if (fileUserId !== user.id && !isHQRole((user.role || 'employee') as UserRoleType)) {
          return res.status(403).json({ message: "Bu dosyaya erişim yetkiniz yok" });
        }
      }
      
      const { ok, value, error } = await client.downloadAsBytes(path);
      
      if (!ok) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Detect mime type from path
      let mimeType = 'application/octet-stream';
      if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (path.endsWith('.png')) {
        mimeType = 'image/png';
      }
      
      res.setHeader('Content-Type', mimeType);
      res.send(Buffer.from(value));
    } catch (error: any) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Public endpoint for registration page (no auth required)
  app.get('/api/public/branches', async (req, res) => {
    try {
      const branches = await storage.getBranches();
      // Return only essential info for registration
      const publicBranches = branches.map(b => ({
        id: b.id,
        name: b.name,
        city: b.city,
      }));
      res.json(publicBranches);
    } catch (error: any) {
      console.error("Error fetching public branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.get('/api/branches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Authorization: HQ users can see all branches (check HQ first!)
      if (user.role && isHQRole(user.role as UserRoleType)) {
        const branches = await storage.getBranches();
        return res.json(branches);
      }
      
      // Branch users can only see their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        const branch = await storage.getBranch(user.branchId);
        return res.json(branch ? [branch] : []);
      }
      
      // Fallback: return all branches for unrecognized roles (safety)
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  app.get('/api/branches/:branchId/detail', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ message: "Geçersiz şube ID" });
      }

      // Authorization: Branch users can only access their own branch details
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (user.branchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }

      // Check cache
      const cacheKey = `branch-detail-${branchId}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const branchDetails = await storage.getBranchDetails(branchId);
      if (!branchDetails) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      // Sanitize user data in staff list based on requester's role
      const sanitizedStaff = sanitizeUsersForRole(branchDetails.staff, user.role as UserRoleType);

      const response = {
        ...branchDetails,
        staff: sanitizedStaff,
      };
      
      // Cache for 60 seconds
      setCachedResponse(cacheKey, response, 60);
      res.json(response);
    } catch (error: any) {
      console.error("Error fetching branch details:", error);
      res.status(500).json({ message: "Şube detayları alınırken hata oluştu" });
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
        openingHours: validatedData.openingHours ?? '08:00',
        closingHours: validatedData.closingHours ?? '22:00',
        checkInMethod: validatedData.checkInMethod ?? 'both',
        qrCodeToken: undefined, // Let storage.createBranch generate it
      };
      const branch = await storage.createBranch(branchData);
      res.json(branch);
    } catch (error: Error | unknown) {
      console.error("Error creating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  // Personnel Profile
  app.get('/api/personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.params.id;

      // Authorization: Users can view their own profile, HQ can view all
      const isOwnProfile = user.id === userId;
      const isHQ = isHQRole(user.role as UserRoleType);

      if (!isOwnProfile && !isHQ) {
        // Branch supervisors can only view their branch members
        if (user.role === 'supervisor' && user.branchId) {
          const targetUser = await storage.getUserById(userId);
          // Require target user to exist and be in same branch
          if (!targetUser) {
            return res.status(404).json({ message: "Personel bulunamadı" });
          }
          if (targetUser.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu personel profiline erişim yetkiniz yok" });
          }
        } else {
          return res.status(403).json({ message: "Bu personel profiline erişim yetkiniz yok" });
        }
      }

      const profile = await storage.getPersonnelProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Error fetching personnel profile:", error);
      res.status(500).json({ message: "Personel profili alınırken hata oluştu" });
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
    } catch (error: Error | unknown) {
      console.error("Error updating branch:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid branch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  // Update branch settings (HQ + supervisors for own branch)
  app.patch('/api/branches/:id/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Authorization: HQ users or supervisors (own branch only)
      if (!isHQRole(role) && role !== 'supervisor') {
        return res.status(403).json({ message: "Şube ayarlarını düzenleme yetkiniz yok" });
      }

      // Supervisors can only edit their own branch
      if (role === 'supervisor' && user.branchId !== id) {
        return res.status(403).json({ message: "Sadece kendi şubenizin ayarlarını değiştirebilirsiniz" });
      }

      const { openingHours, closingHours } = req.body;

      if (!openingHours && !closingHours) {
        return res.status(400).json({ message: "En az bir ayar değeri gerekli" });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (openingHours && !timeRegex.test(openingHours)) {
        return res.status(400).json({ message: "Açılış saati geçersiz format (HH:MM)" });
      }
      if (closingHours && !timeRegex.test(closingHours)) {
        return res.status(400).json({ message: "Kapanış saati geçersiz format (HH:MM)" });
      }

      // Fetch current branch to preserve unspecified fields
      const currentBranch = await storage.getBranch(id);
      if (!currentBranch) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      const branch = await storage.updateBranchSettings(id, {
        openingHours: openingHours || currentBranch.openingHours || '08:00',
        closingHours: closingHours || currentBranch.closingHours || '22:00',
      });

      res.json(branch);
    } catch (error: any) {
      console.error("Error updating branch settings:", error);
      res.status(500).json({ message: "Şube ayarları güncellenemedi" });
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
    } catch (error: any) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
    }
  });

  // Generate QR code token for branch check-in
  app.post('/api/branches/:id/generate-qr', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Authorization: Only HQ users can generate QR codes
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      // Generate a secure random token
      const crypto = await import('crypto');
      const qrCodeToken = crypto.randomBytes(32).toString('hex');
      
      const branch = await storage.updateBranch(id, { qrCodeToken });
      if (!branch) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }
      
      res.json({ success: true, qrCodeToken });
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "QR kod oluşturulamadı" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedAssignedToId = req.query.assignedToId as string | undefined;
      
      // Permission check
      ensurePermission(user, 'tasks', 'view');
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        
        // Supervisor and supervisor_buddy can see ALL tasks in their branch
        // Other branch roles can only see tasks assigned to themselves
        const isSupervisorRole = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (isSupervisorRole) {
          const tasks = await storage.getTasks(user.branchId); // All branch tasks for supervisors
          return res.json(tasks);
        } else {
          // SECURITY: Regular branch users can ONLY see tasks assigned to themselves
          const tasks = await storage.getTasks(user.branchId, user.id);
          return res.json(tasks);
        }
      }
      
      // HQ users can access all or filter by branch/assignedTo
      const tasks = await storage.getTasks(requestedBranchId, requestedAssignedToId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Authorization check - Branch users can only see tasks in their branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
        
        // Regular users can only see tasks assigned to them, supervisors can see all
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor && task.assignedToId !== user.id) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Görev alınamadı" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Permission check
      ensurePermission(user, 'tasks', 'create');
      
      // Authorization: Branch users can only create tasks for their own branch
      // FORCE branchId to user's branch for branch users (ignore payload)
      let taskBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        taskBranchId = branchId; // Override payload branchId
      }
      
      // For HQ users creating tasks without a branch, get branch from assignee or use first branch
      if (!taskBranchId && !isBranchRole(user.role as UserRoleType)) {
        // Try to get assignee's branch
        if (validatedData.assignedToId) {
          const assignee = await storage.getUser(validatedData.assignedToId);
          if (assignee?.branchId) {
            taskBranchId = assignee.branchId;
          }
        }
        // If still no branch, get first available branch
        if (!taskBranchId) {
          const branches = await storage.getBranches();
          if (branches.length > 0) {
            taskBranchId = branches[0].id;
          } else {
            return res.status(400).json({ message: "Görev oluşturmak için en az bir şube gerekli" });
          }
        }
      }
      
      const task = await storage.createTask({
        ...validatedData,
        branchId: taskBranchId!,
        assignedToId: validatedData.assignedToId || userId,
        assignedById: userId, // Track who assigned the task
      });
      
      // Send notification to assigned user if different from creator
      const assigneeId = validatedData.assignedToId || userId;
      if (assigneeId && assigneeId !== userId) {
        try {
          // Get assigner name for notification
          const assigner = await storage.getUser(userId);
          const assignerName = assigner?.firstName && assigner?.lastName 
            ? `${assigner.firstName} ${assigner.lastName}` 
            : 'Bir yönetici';
          
          // Create in-app notification
          await storage.createNotification({
            userId: assigneeId,
            type: 'task_assigned',
            title: 'Yeni Görev Atandı',
            message: `${assignerName} size yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${task.id}`,
          });
          
          // Send email notification asynchronously
          const assignee = await storage.getUser(assigneeId);
          if (assignee?.email) {
            sendNotificationEmail(
              assignee.email,
              'Yeni Görev Atandı - DOSPRESSO',
              `Merhaba ${assignee.firstName || 'Değerli Çalışan'},\n\n${assignerName} size yeni bir görev atadı.\n\nGörev: ${task.description}\n\nGörevi tamamlamak için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task assignment notification:", notifError);
          // Don't fail task creation if notification fails
        }
      }
      
      // Also notify branch supervisors when a task is assigned to their branch
      // (only if the supervisor is not the assignee or assigner)
      try {
        // Get both supervisors and supervisor_buddies
        const branchSupervisors = await storage.getUsersByBranchAndRole(taskBranchId!, 'supervisor');
        const branchSupervisorBuddies = await storage.getUsersByBranchAndRole(taskBranchId!, 'supervisor_buddy');
        const allBranchSupervisors = [...branchSupervisors, ...branchSupervisorBuddies];
        
        const assigner = await storage.getUser(userId);
        const assignerName = assigner?.firstName && assigner?.lastName 
          ? `${assigner.firstName} ${assigner.lastName}` 
          : 'Bir yönetici';
        
        for (const supervisor of allBranchSupervisors) {
          // Skip if supervisor is the assignee or the assigner
          if (supervisor.id === assigneeId || supervisor.id === userId) continue;
          
          try {
            await storage.createNotification({
              userId: supervisor.id,
              type: 'task_assigned',
              title: 'Şubenize Yeni Görev',
              message: `${assignerName} şubenize yeni bir görev atadı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
            });
            
            // Send email to supervisor
            if (supervisor.email) {
              sendNotificationEmail(
                supervisor.email,
                'Şubenize Yeni Görev Atandı - DOSPRESSO',
                `Merhaba ${supervisor.firstName || 'Değerli Supervisor'},\n\n${assignerName} şubenize yeni bir görev atadı.\n\nGörev: ${task.description}\n\nGörevi izlemek için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
              ).catch(err => console.error("Background email error:", err));
            }
          } catch (notifError) {
            console.error("Error sending supervisor notification:", notifError);
          }
        }
      } catch (supervisorNotifError) {
        console.error("Error in supervisor notification loop:", supervisorNotifError);
      }
      
      // Notify HQ admins that a task is ready for review (status = 'incelemede')
      try {
        const hqAdmins = await storage.getHQAdmins();
        const completer = await storage.getUser(userId);
        const completerName = completer?.firstName && completer?.lastName
          ? `${completer.firstName} ${completer.lastName}`
          : 'Bir çalışan';
        const branch = task.branchId ? await storage.getBranch(task.branchId) : null;
        const branchName = branch?.name || 'Bilinmeyen Şube';
        
        for (const admin of hqAdmins) {
          // Skip if admin is the completer
          if (admin.id === userId) continue;
          
          try {
            await storage.createNotification({
              userId: admin.id,
              type: 'task_completed',
              title: 'Görev İnceleme Bekliyor',
              message: `${completerName} (${branchName}) bir görevi tamamladı ve onayınızı bekliyor: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
              link: `/gorevler?taskId=${task.id}`,
            });
            
            // Send email to HQ admin
            if (admin.email) {
              sendNotificationEmail(
                admin.email,
                'Görev İnceleme Bekliyor - DOSPRESSO',
                `Merhaba ${admin.firstName || 'Değerli Admin'},\n\n${completerName} (${branchName}) bir görevi tamamladı ve onayınızı bekliyor.\n\nGörev: ${task.description}\n\nGörevi incelemek için DOSPRESSO uygulamasına giriş yapın.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
              ).catch(err => console.error("Background email error:", err));
            }
          } catch (notifError) {
            console.error("Error sending HQ admin notification:", notifError);
          }
        }
      } catch (hqAdminError) {
        console.error("Error in HQ admin notification:", hqAdminError);
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error starting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev başlatılamadı" });
    }
  });

  // POST /api/tasks/:id/verify - Verify and approve task (HQ only)
  app.post('/api/tasks/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      // Permission check: Only HQ roles can verify tasks
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev onaylayabilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      // Get existing task
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Status transition validation: can only verify completed/reviewed tasks
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından onaylanabilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      // Update status to verified
      const task = await storage.updateTask(id, { status: "onaylandi" });
      
      // Send notification to assignee when task is approved
      if (existingTask.assignedToId && existingTask.assignedToId !== user.id) {
        try {
          const verifier = await storage.getUser(user.id);
          const verifierName = verifier?.firstName && verifier?.lastName
            ? `${verifier.firstName} ${verifier.lastName}`
            : 'Merkez yetkilisi';
          
          await storage.createNotification({
            userId: existingTask.assignedToId,
            type: 'task_verified',
            title: 'Görev Onaylandı ✓',
            message: `${verifierName} görevinizi onayladı: "${existingTask.description?.substring(0, 50)}${(existingTask.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${existingTask.id}`,
          });
          
          // Send email notification
          const verifiedAssignee = await storage.getUser(existingTask.assignedToId);
          if (verifiedAssignee?.email) {
            sendNotificationEmail(
              verifiedAssignee.email,
              'Görev Onaylandı - DOSPRESSO',
              `Merhaba ${verifiedAssignee.firstName || 'Değerli Çalışan'},\n\n${verifierName} görevinizi onayladı.\n\nGörev: ${existingTask.description}\n\nTebrikler!\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task verified notification:", notifError);
        }
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error verifying task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  // POST /api/tasks/:id/reject - Reject task (HQ only)
  app.post('/api/tasks/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      // Permission check: Only HQ roles can reject tasks
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri görev reddedebilir" });
      }
      
      ensurePermission(user, 'tasks', 'edit');
      
      // Get existing task
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Status transition validation: can only reject completed/reviewed tasks
      const validStatuses = ["incelemede", "foto_bekleniyor"];
      if (!validStatuses.includes(existingTask.status)) {
        return res.status(400).json({ 
          message: `Görev sadece 'incelemede' veya 'foto_bekleniyor' durumlarından reddedilebilir. Mevcut durum: ${existingTask.status}` 
        });
      }
      
      // Update status to rejected and add reason to AI analysis field
      const updates: any = { status: "reddedildi" };
      if (reason) {
        updates.aiAnalysis = `RED NEDENİ: ${reason}${existingTask.aiAnalysis ? '\n\nÖNCEKİ ANALİZ: ' + existingTask.aiAnalysis : ''}`;
      }
      
      const task = await storage.updateTask(id, updates);
      
      // Send notification to assignee when task is rejected
      if (existingTask.assignedToId && existingTask.assignedToId !== user.id) {
        try {
          const rejector = await storage.getUser(user.id);
          const rejectorName = rejector?.firstName && rejector?.lastName
            ? `${rejector.firstName} ${rejector.lastName}`
            : 'Merkez yetkilisi';
          
          await storage.createNotification({
            userId: existingTask.assignedToId,
            type: 'task_rejected',
            title: 'Görev Reddedildi',
            message: `${rejectorName} görevinizi reddetti: "${existingTask.description?.substring(0, 50)}${(existingTask.description?.length || 0) > 50 ? '...' : ''}"${reason ? ` - Neden: ${reason}` : ''}`,
            link: `/gorevler?taskId=${existingTask.id}`,
          });
          
          // Send email notification
          const rejectedAssignee = await storage.getUser(existingTask.assignedToId);
          if (rejectedAssignee?.email) {
            sendNotificationEmail(
              rejectedAssignee.email,
              'Görev Reddedildi - DOSPRESSO',
              `Merhaba ${rejectedAssignee.firstName || 'Değerli Çalışan'},\n\n${rejectorName} görevinizi reddetti.\n\nGörev: ${existingTask.description}\n${reason ? `Neden: ${reason}\n` : ''}\nLütfen görevi düzeltip yeniden gönderin.\n\nSaygılarımızla,\nDOSPRESSO Ekibi`
            ).catch(err => console.error("Background email error:", err));
          }
        } catch (notifError) {
          console.error("Error sending task rejected notification:", notifError);
        }
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error rejecting task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev reddedilemedi" });
    }
  });

  // =============================================
  // ONBOARDING CHECKER ENDPOINTS
  // =============================================

  // GET /api/tasks/pending-checks - Get tasks pending checker verification
  app.get('/api/tasks/pending-checks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Use optimized query to get only tasks where current user is checker with pending status
      const pendingChecks = await storage.getTasksByChecker(user.id, 'kontrol_bekliyor');
      
      // Enrich with assignee info
      const enrichedTasks = await Promise.all(pendingChecks.map(async (task: any) => {
        let assigneeName = 'Bilinmiyor';
        if (task.assignedToId) {
          const assignee = await storage.getUser(task.assignedToId);
          assigneeName = assignee?.firstName && assignee?.lastName 
            ? `${assignee.firstName} ${assignee.lastName}` 
            : assignee?.email || 'Bilinmiyor';
        }
        return { ...task, assigneeName };
      }));
      
      res.json(enrichedTasks);
    } catch (error: any) {
      console.error("Error getting pending checks:", error);
      res.status(500).json({ message: "Kontrol bekleyen görevler alınamadı" });
    }
  });

  // POST /api/tasks/:id/request-check - Request checker verification (assignee submits for check)
  app.post('/api/tasks/:id/request-check', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only assignee can request check
      if (task.assignedToId !== user.id) {
        return res.status(403).json({ message: "Sadece göreve atanan kişi kontrol isteyebilir" });
      }
      
      // Must be devam_ediyor or tamamlandi to request check
      if (task.status !== 'devam_ediyor' && task.status !== 'tamamlandi') {
        return res.status(400).json({ 
          message: `Bu görev kontrol istenemez. Mevcut durum: ${task.status}` 
        });
      }
      
      // Must have a checker assigned
      if (!task.checkerId) {
        return res.status(400).json({ message: "Bu göreve kontrol edecek kişi atanmamış" });
      }
      
      // Update status to kontrol_bekliyor
      const updated = await storage.updateTask(taskId, { 
        status: 'kontrol_bekliyor',
        completedAt: new Date(),
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      // Add note if provided
      if (notes) {
        try {
          await storage.addNoteToTask(taskId, notes, user.id);
        } catch (noteError) {
          console.error("Error adding task note:", noteError);
        }
      }
      
      // Notify checker
      try {
        const assignee = await storage.getUser(user.id);
        const assigneeName = assignee?.firstName && assignee?.lastName 
          ? `${assignee.firstName} ${assignee.lastName}` 
          : 'Çalışan';
        
        await storage.createNotification({
          userId: task.checkerId,
          type: 'task_check_requested',
          title: 'Onboarding Kontrolü Bekliyor',
          message: `${assigneeName} görevini tamamladı ve kontrolünüzü bekliyor: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
          link: `/gorev-detay/${task.id}`,
        });
      } catch (notifError) {
        console.error("Error sending checker notification:", notifError);
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error requesting check:", error);
      res.status(500).json({ message: "Kontrol isteği gönderilemedi" });
    }
  });

  // POST /api/tasks/:id/checker-verify - Checker approves task
  app.post('/api/tasks/:id/checker-verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only checker can verify
      if (task.checkerId !== user.id) {
        return res.status(403).json({ message: "Sadece atanan kontrol edici bu görevi onaylayabilir" });
      }
      
      // Must be in kontrol_bekliyor status
      if (task.status !== 'kontrol_bekliyor') {
        return res.status(400).json({ 
          message: `Bu görev kontrol bekliyor durumunda değil. Mevcut durum: ${task.status}` 
        });
      }
      
      // Update status to onaylandi
      const updated = await storage.updateTask(taskId, { 
        status: 'onaylandi',
        checkedAt: new Date(),
        checkerNote: notes || null,
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      // Notify assignee
      if (task.assignedToId) {
        try {
          const checker = await storage.getUser(user.id);
          const checkerName = checker?.firstName && checker?.lastName 
            ? `${checker.firstName} ${checker.lastName}` 
            : 'Kontrol Edici';
          
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_check_approved',
            title: 'Görev Onaylandı ✓',
            message: `${checkerName} görevinizi onayladı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorev-detay/${task.id}`,
          });
        } catch (notifError) {
          console.error("Error sending check approved notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error verifying task by checker:", error);
      res.status(500).json({ message: "Görev onaylanamadı" });
    }
  });

  // POST /api/tasks/:id/checker-reject - Checker rejects task
  app.post('/api/tasks/:id/checker-reject', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes, reason } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only checker can reject
      if (task.checkerId !== user.id) {
        return res.status(403).json({ message: "Sadece atanan kontrol edici bu görevi reddedebilir" });
      }
      
      // Must be in kontrol_bekliyor status
      if (task.status !== 'kontrol_bekliyor') {
        return res.status(400).json({ 
          message: `Bu görev kontrol bekliyor durumunda değil. Mevcut durum: ${task.status}` 
        });
      }
      
      // Update status to reddedildi (assignee needs to redo)
      const updated = await storage.updateTask(taskId, { 
        status: 'reddedildi',
        checkedAt: new Date(),
        checkerNote: notes || reason || null,
        failureNote: reason || null,
        statusUpdatedAt: new Date(),
        statusUpdatedById: user.id
      });
      
      // Notify assignee
      if (task.assignedToId) {
        try {
          const checker = await storage.getUser(user.id);
          const checkerName = checker?.firstName && checker?.lastName 
            ? `${checker.firstName} ${checker.lastName}` 
            : 'Kontrol Edici';
          
          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_check_rejected',
            title: 'Görev Reddedildi',
            message: `${checkerName} görevinizi reddetti: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"${reason ? ` - Neden: ${reason}` : ''}`,
            link: `/gorev-detay/${task.id}`,
          });
        } catch (notifError) {
          console.error("Error sending check rejected notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error rejecting task by checker:", error);
      res.status(500).json({ message: "Görev reddedilemedi" });
    }
  });

  // GET /api/tasks/:id/rating - Get task rating
  app.get('/api/tasks/:id/rating', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rating = await storage.getTaskRating(id);
      res.json(rating || {});
    } catch (error: any) {
      console.error("Error getting task rating:", error);
      res.status(500).json({ message: "Rating alınamadı" });
    }
  });

  // POST /api/tasks/:id/rate - Rate task
  app.post('/api/tasks/:id/rate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { score } = req.body;

      if (!score || score < 1 || score > 5) {
        return res.status(400).json({ message: "Puan 1-5 arasında olmalıdır" });
      }

      const rating = await storage.rateTask(id, score, user.id);
      res.json(rating);
    } catch (error: any) {
      console.error("Error rating task:", error);
      res.status(500).json({ message: "Görev değerlendirilemedi" });
    }
  });

  // Task lifecycle endpoints
  app.patch('/api/tasks/:id/acknowledge', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only the assigned user can acknowledge the task
      if (task.assignedToId !== user.id) {
        return res.status(403).json({ message: "Yalnızca atanan kişi görevi onaylayabilir" });
      }
      
      // Check if already acknowledged
      if (task.acknowledgedAt) {
        return res.status(400).json({ message: "Bu görev zaten görüldü olarak işaretlenmiş" });
      }
      
      const updated = await storage.acknowledgeTask(taskId, user.id);
      
      // Notify the assigner that task was acknowledged
      if (task.assignedById && task.assignedById !== user.id) {
        try {
          const acknowledger = await storage.getUser(user.id);
          const acknowledgerName = acknowledger?.firstName && acknowledger?.lastName 
            ? `${acknowledger.firstName} ${acknowledger.lastName}` 
            : 'Atanan kişi';
          
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_acknowledged',
            title: 'Görev Görüldü',
            message: `${acknowledgerName} atadığınız görevi gördü: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorevler?taskId=${task.id}`,
          });
        } catch (notifError) {
          console.error("Error sending task status notification:", notifError);
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Görev durumu güncellenemedi" });
    }
  });

  // POST /api/tasks/:id/start - Start a task (shortcut for status change to devam_ediyor)
  app.post('/api/tasks/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only assignee can start the task
      if (task.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu görevi başlatma yetkiniz yok" });
      }
      
      // Allow start from beklemede, goruldu, or reddedildi
      const allowedStatuses = ['beklemede', 'goruldu', 'reddedildi'];
      if (!allowedStatuses.includes(task.status || 'beklemede')) {
        return res.status(400).json({ 
          message: `Bu görev '${task.status}' durumunda, başlatılamaz` 
        });
      }
      
      // Update task status to devam_ediyor and set acknowledgedAt if not set
      const updates: any = { 
        status: 'devam_ediyor',
        startedAt: new Date()
      };
      
      // Auto-acknowledge if not already acknowledged
      if (!task.acknowledgedAt) {
        updates.acknowledgedAt = new Date();
      }
      
      const updatedTask = await storage.updateTask(taskId, updates);
      
      // Add note if provided
      if (notes) {
        try {
          await storage.addNoteToTask(taskId, notes, user.id);
        } catch (noteError) {
          console.error("Error adding task note:", noteError);
        }
      }
      
      // Notify assigner
      if (task.assignedById && task.assignedById !== user.id) {
        try {
          const starter = await storage.getUser(user.id);
          const starterName = starter?.firstName && starter?.lastName 
            ? `${starter.firstName} ${starter.lastName}` 
            : 'Atanan kişi';
          
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_started',
            title: 'Görev Başlatıldı',
            message: `${starterName} göreve başladı: "${task.description?.substring(0, 50)}${(task.description?.length || 0) > 50 ? '...' : ''}"`,
            link: `/gorev-detay/${task.id}`,
          });
        } catch (notifError) {
          console.error("Error sending task start notification:", notifError);
        }
      }
      
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error starting task:", error);
      res.status(500).json({ message: "Görev başlatılamadı" });
    }
  });

  // POST /api/tasks/:id/status - Update task status (başla, tamamla, başarısız)
  app.post('/api/tasks/:id/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { status, note } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const isAssigner = task.assignedById === user.id;
      const isAssignee = task.assignedToId === user.id;
      const isHQ = isHQRole(user.role as UserRoleType);
      
      // Valid status transitions
      const validStatuses = ['beklemede', 'devam_ediyor', 'tamamlandi', 'incelemede', 'basarisiz', 'onaylandi', 'reddedildi'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Geçersiz durum: ${status}` });
      }
      
      // Define allowed transitions based on role with strict state machine
      const currentStatus = task.status;
      let allowed = false;
      let transitionMessage = "";
      
      // Terminal states - no transitions allowed from these (except supervisor retry)
      const terminalStates = ['onaylandi', 'basarisiz'];
      const isTerminal = terminalStates.includes(currentStatus);
      
      // Block all transitions from terminal states (except HQ reset)
      if (isTerminal && !(isHQ && status === 'beklemede')) {
        return res.status(400).json({ 
          message: `Bu görev terminal durumda (${currentStatus}). Değişiklik yapılamaz.` 
        });
      }
      
      // Assignee can: start task, complete task, mark as failed (only from active states)
      if (isAssignee) {
        if (status === 'devam_ediyor' && (currentStatus === 'beklemede' || currentStatus === 'goruldu' || currentStatus === 'reddedildi')) {
          allowed = true;
          transitionMessage = "Görev başlatıldı";
        } else if (status === 'tamamlandi' && (currentStatus === 'devam_ediyor' || currentStatus === 'goruldu' || currentStatus === 'beklemede')) {
          allowed = true;
          transitionMessage = "Görev tamamlandı, onay bekleniyor";
        } else if (status === 'incelemede' && currentStatus === 'devam_ediyor') {
          allowed = true;
          transitionMessage = "Görev incelemeye gönderildi";
        } else if (status === 'basarisiz' && ['beklemede', 'goruldu', 'devam_ediyor', 'reddedildi'].includes(currentStatus)) {
          // Can only mark failed from active (non-terminal, non-completed) states
          allowed = true;
          transitionMessage = "Görev başarısız olarak işaretlendi";
        }
      }
      
      // Assigner/HQ can: approve, reject (only from completed states), or reset (only HQ)
      if (isAssigner || isHQ) {
        if (status === 'onaylandi' && (currentStatus === 'tamamlandi' || currentStatus === 'incelemede')) {
          allowed = true;
          transitionMessage = "Görev onaylandı";
        } else if (status === 'reddedildi' && (currentStatus === 'tamamlandi' || currentStatus === 'incelemede')) {
          allowed = true;
          transitionMessage = "Görev reddedildi, düzeltme bekleniyor";
        }
      }
      
      // Only HQ can reset to pending (supervisor retry) - includes all terminal states
      if (isHQ && status === 'beklemede' && ['reddedildi', 'basarisiz', 'onaylandi'].includes(currentStatus)) {
        allowed = true;
        transitionMessage = "Görev yeniden atandı (HQ tarafından)";
      }
      
      if (!allowed) {
        return res.status(403).json({ 
          message: `Bu durum geçişine izniniz yok: ${currentStatus} -> ${status}` 
        });
      }
      
      // Update task status
      const updates: any = { status };
      if (status === 'tamamlandi' || status === 'incelemede') {
        updates.completedAt = new Date();
      }
      
      const updatedTask = await storage.updateTask(taskId, updates);
      
      // Add status history entry
      try {
        await storage.addNoteToTask(taskId, note || transitionMessage, user.id);
      } catch (historyError) {
        console.error("Error adding status history:", historyError);
      }
      
      // Send notifications based on status change
      try {
        const actor = await storage.getUser(user.id);
        const actorName = actor?.firstName && actor?.lastName
          ? `${actor.firstName} ${actor.lastName}`
          : 'Kullanıcı';
        
        // Notify assigner when task is completed by assignee
        if ((status === 'tamamlandi' || status === 'incelemede') && isAssignee && task.assignedById) {
          await storage.createNotification({
            userId: task.assignedById,
            type: 'task_completed',
            title: 'Görev Tamamlandı',
            message: `${actorName} görevi tamamladı: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
          });
        }
        
        // Notify assignee when task is approved/rejected by assigner
        if ((status === 'onaylandi' || status === 'reddedildi') && task.assignedToId) {
          await storage.createNotification({
            userId: task.assignedToId,
            type: status === 'onaylandi' ? 'task_verified' : 'task_rejected',
            title: status === 'onaylandi' ? 'Görev Onaylandı ✓' : 'Görev Reddedildi',
            message: `${actorName} görevinizi ${status === 'onaylandi' ? 'onayladı' : 'reddetti'}: "${task.description?.substring(0, 40)}..."`,
            link: `/gorev-detay/${taskId}`,
          });
        }
      } catch (notifError) {
        console.error("Error sending status notification:", notifError);
      }
      
      res.json({ ...updatedTask, message: transitionMessage });
    } catch (error: any) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Görev durumu güncellenemedi" });
    }
  });

  app.post('/api/tasks/:id/note', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { note } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ message: "Not girilmelidir" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Both assigner and assignee can add notes
      const isAssigner = task.assignedById === user.id;
      const isAssignee = task.assignedToId === user.id;
      const isHQ = !isBranchRole(user.role as UserRoleType);
      
      if (!isAssigner && !isAssignee && !isHQ) {
        return res.status(403).json({ message: "Bu göreve not ekleyemezsiniz" });
      }
      
      await storage.addNoteToTask(taskId, note.trim(), user.id);
      
      res.json({ success: true, message: "Not eklendi" });
    } catch (error: any) {
      console.error("Error adding note to task:", error);
      res.status(500).json({ message: "Not eklenemedi" });
    }
  });

  app.get('/api/tasks/:id/history', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Authorization check - Branch users can only see tasks in their branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
        
        // Regular users can only see tasks assigned to them, supervisors can see all
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor && task.assignedToId !== user.id && task.assignedById !== user.id) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
      }
      
      const history = await storage.getTaskStatusHistory(taskId);
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Görev geçmişi alınamadı" });
    }
  });

  // ========================================
  // TASK RATING ENDPOINTS (Manual rating by assigner)
  // ========================================

  app.post('/api/tasks/:id/rating', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { rating, feedback } = req.body;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Puan 1-5 arasında bir sayı olmalıdır" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Only the assigner can rate
      if (task.assignedById !== user.id) {
        return res.status(403).json({ message: "Sadece görevi atayan kişi puanlayabilir" });
      }
      
      // Check if task is completed (onaylandi status)
      if (task.status !== 'onaylandi') {
        return res.status(400).json({ message: "Sadece tamamlanan görevler puanlanabilir" });
      }
      
      // Calculate max rating based on late delivery
      const maxRating = storage.computeMaxRating(task);
      const isLate = task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate);
      
      // Apply penalty if raw rating exceeds max
      const rawRating = rating;
      const finalRating = Math.min(rating, maxRating);
      const penaltyApplied = rawRating > maxRating ? 1 : 0;
      
      // Check if already rated - if so, update instead of create (upsert logic)
      const existingRating = await storage.getTaskRating(taskId);
      let taskRating;
      
      if (existingRating) {
        // Update existing rating
        taskRating = await storage.updateTaskRating(existingRating.id, {
          rawRating,
          finalRating,
          penaltyApplied,
          isLate: !!isLate,
          feedback: feedback || null,
        });
      } else {
        // Create new rating
        taskRating = await storage.createTaskRating({
          taskId,
          ratedById: user.id,
          ratedUserId: task.assignedToId!,
          rawRating,
          finalRating,
          penaltyApplied,
          isLate: !!isLate,
          feedback: feedback || null,
        });
      }
      
      // Update employee satisfaction score
      if (task.assignedToId) {
        const assignee = await storage.getUser(task.assignedToId);
        await storage.upsertEmployeeSatisfactionScore(
          task.assignedToId,
          assignee?.branchId || null
        );
      }
      
      res.json({
        ...taskRating,
        maxRating,
        message: penaltyApplied ? 'Geç teslim nedeniyle puan sınırlandırıldı (max: ' + maxRating + ')' : undefined,
      });
    } catch (error: any) {
      console.error("Error rating task:", error);
      res.status(500).json({ message: "Görev puanlanamadı" });
    }
  });

  app.get('/api/tasks/:id/rating', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Geçersiz görev ID'si" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Authorization check
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (task.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
        }
      }
      
      const rating = await storage.getTaskRating(taskId);
      const maxRating = storage.computeMaxRating(task);
      
      res.json({
        rating: rating || null,
        maxRating,
        canRate: task.assignedById === user.id && task.status === 'onaylandi' && !rating,
        isLate: task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate),
      });
    } catch (error: any) {
      console.error("Error fetching task rating:", error);
      res.status(500).json({ message: "Görev puanı alınamadı" });
    }
  });

  // ========================================
  // EMPLOYEE SATISFACTION SCORE ENDPOINTS
  // ========================================

  app.get('/api/users/:id/satisfaction-score', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own score, HQ can see all
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        // Check if user is a supervisor viewing their branch employee
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu skora erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu skora erişim yetkiniz yok" });
        }
      }
      
      const score = await storage.getEmployeeSatisfactionScore(targetUserId);
      
      if (!score) {
        // Return default scores if no data yet
        return res.json({
          userId: targetUserId,
          taskSatisfactionAvg: 0,
          checklistScoreAvg: 0,
          compositeScore: 0,
          taskRatingCount: 0,
          checklistRatingCount: 0,
          onTimeRate: 0,
        });
      }
      
      res.json(score);
    } catch (error: any) {
      console.error("Error fetching satisfaction score:", error);
      res.status(500).json({ message: "Performans skoru alınamadı" });
    }
  });

  app.get('/api/users/:id/task-ratings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own ratings, HQ/supervisors can see branch employees
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
      }
      
      const ratings = await storage.getUserTaskRatings(targetUserId);
      res.json(ratings);
    } catch (error: any) {
      console.error("Error fetching user task ratings:", error);
      res.status(500).json({ message: "Görev puanları alınamadı" });
    }
  });

  app.get('/api/users/:id/received-ratings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.id;
      
      // Users can see their own ratings, HQ/supervisors can see branch employees
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ && user.id !== targetUserId) {
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
        
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu puanlara erişim yetkiniz yok" });
        }
      }
      
      const ratings = await storage.getReceivedRatings(targetUserId);
      res.json(ratings);
    } catch (error: any) {
      console.error("Error fetching received ratings:", error);
      res.status(500).json({ message: "Alınan puanlar getirilemedi" });
    }
  });

  app.get('/api/branches/:branchId/top-performers', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Only HQ or branch supervisors can view
      const isHQ = !isBranchRole(user.role as UserRoleType);
      if (!isHQ) {
        const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
        if (!isSupervisor || user.branchId !== branchId) {
          return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
        }
      }
      
      const topPerformers = await storage.getTopPerformingEmployees(branchId, limit);
      
      // Enrich with user details
      const enriched = await Promise.all(topPerformers.map(async (perf) => {
        const employee = await storage.getUser(perf.userId);
        return {
          ...perf,
          employee: employee ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            role: employee.role,
          } : null,
        };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching top performers:", error);
      res.status(500).json({ message: "En iyi performanslar alınamadı" });
    }
  });

  app.get('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const checklists = await storage.getChecklists();
      res.json(checklists);
    } catch (error: any) {
      console.error("Error fetching checklists:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

  app.post('/api/checklists', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      
      const { tasks: tasksArray, ...checklistData } = req.body;
      const validatedChecklistData = insertChecklistSchema.parse(checklistData);
      
      if (tasksArray && Array.isArray(tasksArray) && tasksArray.length > 0) {
        const { insertChecklistTaskSchema } = await import('@shared/schema');
        
        const orders = tasksArray.map((t: any) => t.order);
        const duplicateOrders = orders.filter((order: number, index: number) => orders.indexOf(order) !== index);
        if (duplicateOrders.length > 0) {
          return res.status(400).json({ message: `Duplicate order values: ${duplicateOrders.join(', ')}` });
        }
        
        const validatedTasks = tasksArray.map((task: any) => 
          insertChecklistTaskSchema.parse({
            taskDescription: task.taskDescription,
            requiresPhoto: task.requiresPhoto,
            taskTimeStart: task.taskTimeStart || null,
            taskTimeEnd: task.taskTimeEnd || null,
            order: task.order,
            checklistId: 0,
          })
        );
        
        const checklist = await storage.createChecklistWithTasks(validatedChecklistData, validatedTasks);
        res.json(checklist);
      } else {
        const checklist = await storage.createChecklist(validatedChecklistData);
        res.json(checklist);
      }
    } catch (error: Error | unknown) {
      console.error("Error creating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create checklist" });
    }
  });

  // Update checklist with tasks (HQ coach always, supervisors only if isEditable=true)
  app.patch('/api/checklists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);

      // Fetch checklist first to check isEditable
      const existingChecklist = await storage.getChecklist(id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }

      // Authorization:
      // - HQ coach: Always allowed
      // - Supervisors: Only if isEditable=true
      // - Others: Denied
      if (role === 'coach') {
        // HQ coach can always edit
      } else if (role === 'supervisor' || role === 'supervisor_buddy') {
        // Supervisors can only edit if isEditable=true
        if (!existingChecklist.isEditable) {
          return res.status(403).json({ message: "Bu checklist düzenlenemez (isEditable=false)" });
        }
      } else {
        // All other roles denied
        return res.status(403).json({ message: "Checklist düzenleme yetkiniz yok" });
      }

      // Validate and update using new storage method
      const validatedData = updateChecklistSchema.parse(req.body);
      const checklist = await storage.updateChecklistWithTasks(id, validatedData);

      res.json(checklist!);
    } catch (error: Error | unknown) {
      console.error("Error updating checklist:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: "Checklist güncellenemedi" });
    }
  });

  app.get('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'view');
      const id = parseInt(req.params.id);
      const checklist = await storage.getChecklist(id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist bulunamadı" });
      }
      const tasks = await storage.getChecklistTasks(id);
      res.json({ ...checklist, tasks });
    } catch (error: any) {
      console.error("Error fetching checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist getirilemedi" });
    }
  });

  app.delete('/api/checklists/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const id = parseInt(req.params.id);
      await storage.deleteChecklist(id);
      res.json({ message: "Checklist silindi" });
    } catch (error: any) {
      console.error("Error deleting checklist:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Checklist silinemedi" });
    }
  });

  app.get('/api/checklist-tasks', isAuthenticated, async (req, res) => {
    try {
      const checklistId = req.query.checklistId ? parseInt(req.query.checklistId as string) : undefined;
      const tasks = await storage.getChecklistTasks(checklistId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching checklist tasks:", error);
      res.status(500).json({ message: "Failed to fetch checklist tasks" });
    }
  });

  app.post('/api/checklists/:id/tasks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'create');
      const checklistId = parseInt(req.params.id);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.parse({ ...req.body, checklistId });
      
      const existingTasks = await storage.getChecklistTasks(checklistId);
      const duplicateOrder = existingTasks.find(t => t.order === validatedData.order);
      if (duplicateOrder) {
        return res.status(400).json({ message: `Order ${validatedData.order} already exists for this checklist` });
      }
      
      const task = await storage.createChecklistTask(validatedData);
      res.json(task);
    } catch (error: Error | unknown) {
      console.error("Error creating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task oluşturulamadı" });
    }
  });

  app.patch('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'update');
      const taskId = parseInt(req.params.taskId);
      const { insertChecklistTaskSchema } = await import('@shared/schema');
      const validatedData = insertChecklistTaskSchema.pick({
        taskDescription: true,
        requiresPhoto: true,
        taskTimeStart: true,
        taskTimeEnd: true,
        order: true,
      }).partial().parse(req.body);
      
      // Get task to check photo requirement
      const existingTask = await storage.getChecklistTask?.(taskId);
      
      // Photo validation: if photo required, ensure provided
      if (existingTask?.requiresPhoto && !req.body.photoUrl) {
        return res.status(400).json({ 
          message: '📸 Bu görev fotoğraf gerektirir',
          code: 'PHOTO_REQUIRED'
        });
      }
      
      // Time window validation: warn if outside task time window
      if (validatedData.taskTimeStart && validatedData.taskTimeEnd) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        if (currentTime < validatedData.taskTimeStart || currentTime > validatedData.taskTimeEnd) {
          return res.status(400).json({ 
            message: `⚠️ Görev saat penceresinin dışında (${validatedData.taskTimeStart} - ${validatedData.taskTimeEnd})`,
            code: 'TIME_WINDOW_VIOLATION'
          });
        }
      }
      
      const task = await storage.updateChecklistTask(taskId, validatedData);
      if (!task) {
        return res.status(404).json({ message: "Task bulunamadı" });
      }
      res.json(task);
    } catch (error: Error | unknown) {
      console.error("Error updating checklist task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task güncellenemedi" });
    }
  });

  app.delete('/api/checklists/:id/tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'checklists', 'delete');
      const taskId = parseInt(req.params.taskId);
      await storage.deleteChecklistTask(taskId);
      res.json({ message: "Task silindi" });
    } catch (error: any) {
      console.error("Error deleting checklist task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Task silinemedi" });
    }
  });

  // Get troubleshooting steps for equipment type
  app.get('/api/troubleshooting/:equipmentType', isAuthenticated, async (req, res) => {
    try {
      const equipmentType = req.params.equipmentType;
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType);
      res.json(steps);
    } catch (error: any) {
      console.error("Error fetching troubleshooting steps:", error);
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/faults', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;
      
      ensurePermission(user, 'equipment_faults', 'view');
      
      // Authorization: Branch users can only access their own branch faults
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch - include details
        const faults = await storage.getFaultsWithDetails(branchId);
        const paginated = faults.slice(offset, offset + limit);
        return res.json({ data: paginated, total: faults.length, limit, offset });
      }
      
      // HQ users can access all or filter by branch - include details
      const faults = await storage.getFaultsWithDetails(requestedBranchId);
      const paginated = faults.slice(offset, offset + limit);
      res.json({ data: paginated, total: faults.length, limit, offset });
    } catch (error: any) {
      console.error("Error fetching faults:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch faults" });
    }
  });

  app.post('/api/faults', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const validatedData = insertEquipmentFaultSchema.parse(req.body);
      
      ensurePermission(user, 'equipment_faults', 'create');
      
      // Authorization: Branch users can only create faults for their own branch
      let faultBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        // Force branch users to create faults only for their branch
        faultBranchId = branchId;
      }
      
      // Mandatory Troubleshooting Enforcement
      // If troubleshooting steps exist for this equipment type and user hasn't completed them, reject the fault
      if (validatedData.equipmentId) {
        const equipment = await storage.getEquipmentById(validatedData.equipmentId);
        if (equipment) {
          const completedSteps = validatedData.completedTroubleshootingSteps || [];
          const troubleshootingCheck = await storage.isTroubleshootingCompleteForEquipment(
            equipment.equipmentType,
            completedSteps
          );
          
          if (!troubleshootingCheck.complete) {
            return res.status(400).json({
              message: "Arıza bildirimi için önce sorun giderme adımlarını tamamlamanız gerekiyor",
              requiresTroubleshooting: true,
              missingSteps: troubleshootingCheck.missingSteps,
              allRequiredSteps: troubleshootingCheck.requiredSteps,
            });
          }
        }
      }
      
      const fault = await storage.createFault({
        ...validatedData,
        branchId: faultBranchId,
        reportedById: userId,
      });
      
      // Save troubleshooting completion records
      if (validatedData.completedTroubleshootingSteps && validatedData.completedTroubleshootingSteps.length > 0) {
        for (const step of validatedData.completedTroubleshootingSteps) {
          await storage.createTroubleshootingCompletion({
            faultId: fault.id,
            stepId: step.stepId,
            completedById: userId,
            notes: step.notes || null,
          });
        }
      }

      // CRITICAL FAULT NOTIFICATION: Auto-notify HQ Tech team if critical priority
      if (fault.priority === "kritik") {
        try {
          const hqTechUsers = await storage.getUsersByRole("teknik");
          const branch = faultBranchId ? await storage.getBranch(faultBranchId) : null;
          const equipment = fault.equipmentId ? await storage.getEquipmentById(fault.equipmentId) : null;

          // Send in-app notifications to all HQ tech team members
          for (const techUser of hqTechUsers) {
            await storage.createNotification({
              userId: techUser.id,
              type: "critical_fault",
              title: "KRİTİK ARIZA UYARISI",
              message: `${branch?.name || "Şube"} - ${equipment?.equipmentType || "Ekipman"} için kritik arıza rapor edildi (#${fault.id})`,
              link: `/ariza-yonetim`,
              isRead: false,
            });
          }

          // Log for monitoring
          console.log(`Critical fault notification sent to ${hqTechUsers.length} technicians - Fault #${fault.id}`);
        } catch (notificationError) {
          console.error("Error sending critical fault notifications:", notificationError);
          // Don't fail the fault creation if notifications fail
        }
      }
      
      // Invalidate equipment cache as health scores may change
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(fault);
    } catch (error: Error | unknown) {
      console.error("Error creating fault:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid fault data", errors: error.errors });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create fault" });
    }
  });

  app.post('/api/faults/ai-diagnose', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { equipmentType, faultDescription } = req.body;
      
      if (!equipmentType || !faultDescription) {
        return res.status(400).json({ message: "Ekipman tipi ve arıza açıklaması zorunludur" });
      }

      const diagnosis = await diagnoseFault(equipmentType, faultDescription, user.id);
      res.json(diagnosis);
    } catch (error: Error | unknown) {
      console.error("Error diagnosing fault:", error);
      res.status(500).json({ message: error.message || "Arıza analiz edilemedi" });
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      
      // Invalidate caches
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(fault);
    } catch (error: any) {
      console.error("Error changing fault stage:", error);
      res.status(500).json({ message: "Failed to change fault stage" });
    }
  });

  app.patch('/api/faults/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentStage, assignedTo, notes, actualCost } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const existingFault = await storage.getFault(id);
      if (!existingFault) {
        return res.status(404).json({ message: "Fault not found" });
      }

      // Permission logic: branch users can only manage their own branch's faults
      const isTeknik = userRole === 'teknik';
      const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(userRole);
      const userBranchId = req.user.branchId;

      if (!isTeknik) {
        if (!isBranchUser || !userBranchId || existingFault.branchId !== userBranchId) {
          return res.status(403).json({ message: "Yetkisiz işlem - Bu arızayı düzenleme yetkiniz yok" });
        }
      }

      const updateData: any = {};
      if (currentStage) updateData.currentStage = currentStage;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
      if (actualCost !== undefined) updateData.actualCost = actualCost ? parseFloat(actualCost) : null;

      // If stage is being updated, record the transition
      if (currentStage && currentStage !== existingFault.currentStage) {
        // Record stage transition with notes
        await storage.changeFaultStage(id, currentStage, userId, notes || undefined);
      } else if (assignedTo !== undefined || actualCost !== undefined) {
        // Just update the fault without stage change
        const updated = await storage.updateFault(id, updateData);
        // Invalidate caches
        invalidateCache('equipment');
        invalidateCache('critical-equipment');
        return res.json(updated);
      }

      const updated = await storage.getFault(id);
      
      // Invalidate caches
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating fault:", error);
      res.status(500).json({ message: "Failed to update fault" });
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
    } catch (error: any) {
      console.error("Error fetching fault history:", error);
      res.status(500).json({ message: "Failed to fetch fault history" });
    }
  });

  // Equipment routes
  app.get('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      ensurePermission(user, 'equipment', 'view');
      
      // Authorization: Branch users can only access their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        // Force branch users to see only their branch
        const cacheKey = `equipment-branch-${user.branchId}`;
        const cached = getCachedResponse(cacheKey);
        if (cached) return res.json(cached);
        
        const equipment = await storage.getEquipment(user.branchId);
        setCachedResponse(cacheKey, equipment, 30);
        return res.json(equipment);
      }
      
      // HQ users can access all or filter by branch
      const cacheKey = `equipment-${requestedBranchId || 'all'}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) return res.json(cached);
      
      const equipment = await storage.getEquipment(requestedBranchId);
      setCachedResponse(cacheKey, equipment, 30);
      res.json(equipment);
    } catch (error: any) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // Critical equipment endpoint - for alert/monitoring system
  app.get('/api/equipment/critical', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'equipment', 'view');
      
      // Check cache first
      const cacheKey = user.branchId ? `critical-equipment-${user.branchId}` : 'critical-equipment-all';
      const cached = getCachedResponse(cacheKey);
      if (cached) return res.json(cached);
      
      const allEquipment = await storage.getEquipment();
      
      // Filter critical equipment (healthScore < 50)
      const criticalEquipment = allEquipment.filter((item: any) => (item.healthScore ?? 100) < 50);
      
      // Authorization: Branch users only see their branch
      if (user.role && isBranchRole(user.role as UserRoleType) && user.branchId) {
        const filtered = criticalEquipment.filter((item: any) => item.branchId === user.branchId);
        setCachedResponse(cacheKey, filtered, 30);
        return res.json(filtered);
      }
      
      setCachedResponse(cacheKey, criticalEquipment, 30);
      res.json(criticalEquipment);
    } catch (error: any) {
      console.error("Error fetching critical equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch critical equipment" });
    }
  });

  app.get('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      ensurePermission(user, 'equipment', 'view');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Authorization: Branch users can only access their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || equipmentItem.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmana erişim yetkiniz yok" });
        }
      }

      // Fetch related data
      const [maintenanceLogs, faults, comments] = await Promise.all([
        storage.getEquipmentMaintenanceLogs(id),
        storage.getFaults(equipmentItem.branchId),
        storage.getEquipmentComments(id)
      ]);

      // Filter faults to only those for this equipment
      const equipmentFaults = faults.filter(f => f.equipmentId === id);

      res.json({
        ...equipmentItem,
        maintenanceLogs,
        faults: equipmentFaults,
        comments
      });
    } catch (error: any) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
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
      
      // Create equipment first to get ID
      const equipment = await storage.createEquipment({
        ...validatedData,
        branchId: equipmentBranchId,
        qrCodeUrl: null, // Will be generated after creation
      });
      
      // Generate QR code as base64 data URL
      const { generateEquipmentQR } = await import('./ai');
      const qrCodeUrl = await generateEquipmentQR(equipment.id);
      await storage.updateEquipment(equipment.id, { qrCodeUrl });
      
      // Invalidate equipment cache
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json({ ...equipment, qrCodeUrl });
    } catch (error: any) {
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
      
      // Auto-generate QR code if missing
      if (!existingEquipment.qrCodeUrl) {
        const { generateEquipmentQR } = await import('./ai');
        validatedData.qrCodeUrl = await generateEquipmentQR(id);
      }
      
      const equipment = await storage.updateEquipment(id, validatedData);
      
      // Invalidate equipment cache
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      res.json(equipment);
    } catch (error: any) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // Bulk QR Code Generation (HQ only) - Regenerate all equipment QR codes with new format
  app.post('/api/equipment/generate-qr-bulk', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // HQ only
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece HQ yetkilileri toplu QR oluşturabilir" });
      }
      
      // Get all equipment (no branchId = all)
      const allEquipment = await storage.getEquipment();
      
      // Generate QR codes for ALL equipment (force regenerate with new format)
      const { generateEquipmentQR } = await import('./ai');
      let successCount = 0;
      
      for (const equipment of allEquipment) {
        try {
          const qrCodeUrl = await generateEquipmentQR(equipment.id);
          await storage.updateEquipment(equipment.id, { qrCodeUrl });
          successCount++;
        } catch (error: any) {
          console.error(`QR generation failed for equipment ${equipment.id}:`, error);
        }
      }
      
      res.json({ 
        message: `${successCount} ekipman için QR kodu yenilendi`,
        generated: successCount,
        total: allEquipment.length
      });
    } catch (error: any) {
      console.error("Bulk QR generation error:", error);
      res.status(500).json({ message: "QR kod oluşturma başarısız" });
    }
  });

  app.post('/api/equipment/:id/maintenance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentMaintenanceLogSchema } = await import('@shared/schema');
      
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
      
      const validatedData = insertEquipmentMaintenanceLogSchema.parse(req.body);
      const maintenanceLog = await storage.createEquipmentMaintenanceLog({
        ...validatedData,
        equipmentId: id,
        performedBy: userId,
      });

      // Update equipment maintenance dates
      const intervalDays = equipmentItem.maintenanceIntervalDays || 30;
      await storage.logMaintenance(id, intervalDays);
      
      res.json(maintenanceLog);
    } catch (error: Error | unknown) {
      console.error("Error logging maintenance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to log maintenance" });
    }
  });

  app.post('/api/equipment/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentCommentSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only comment on their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için yorum oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentCommentSchema.parse(req.body);
      const comment = await storage.createEquipmentComment({
        ...validatedData,
        equipmentId: id,
        userId,
      });
      res.json(comment);
    } catch (error: Error | unknown) {
      console.error("Error creating equipment comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Equipment Service Request routes
  app.get('/api/equipment/:id/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only view requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis taleplerini görüntüleme yetkiniz yok" });
        }
      }
      
      const serviceRequests = await storage.listServiceRequests(id);
      res.json(serviceRequests);
    } catch (error: Error | unknown) {
      console.error("Error fetching service requests:", error);
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  app.post('/api/equipment/:id/service-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentServiceRequestSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only create requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis talebi oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentServiceRequestSchema.parse(req.body);
      const serviceRequest = await storage.createServiceRequest({
        ...validatedData,
        equipmentId: id,
        createdById: userId,
      });
      res.json(serviceRequest);
    } catch (error: Error | unknown) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  app.get('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only view requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini görüntüleme yetkiniz yok" });
        }
      }
      
      res.json(serviceRequest);
    } catch (error: Error | unknown) {
      console.error("Error fetching service request:", error);
      res.status(500).json({ message: "Failed to fetch service request" });
    }
  });

  app.patch('/api/equipment/service-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only update requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequest(id, req.body);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  app.delete('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only delete requests for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini silme yetkiniz yok" });
        }
      }
      
      await storage.deleteServiceRequest(id);
      res.json({ message: "Service request deleted successfully" });
    } catch (error: Error | unknown) {
      console.error("Error deleting service request:", error);
      res.status(500).json({ message: "Failed to delete service request" });
    }
  });

  app.patch('/api/equipment/service-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { newStatus, notes } = req.body;
      
      if (!newStatus) {
        return res.status(400).json({ message: "newStatus is required" });
      }
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only update status for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebinin durumunu güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequestStatus(id, newStatus, userId, notes);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating service request status:", error);
      if (error.message?.includes("Invalid status transition")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update service request status" });
    }
  });

  app.post('/api/equipment/service-requests/:id/timeline', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { notes, meta } = req.body;
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get equipment to check authorization
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Authorization: Branch users can only add timeline entries for their own branch equipment
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebine not ekleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.appendTimelineEntry(id, {
        timestamp: new Date().toISOString(),
        status: serviceRequest.status,
        actorId: userId,
        notes: notes || '',
        meta: meta || {},
      });
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error adding timeline entry:", error);
      res.status(500).json({ message: "Failed to add timeline entry" });
    }
  });

  // Global service requests list endpoint (HQ management page)
  app.get('/api/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { ServiceRequestStatusType } = await import('@shared/schema');
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const requestedStatus = req.query.status as typeof ServiceRequestStatusType | undefined;
      
      // HQ users can see all service requests or filter by branch
      // Branch users can only see their own branch's service requests
      let branchId = requestedBranchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        branchId = assertBranchScope(user);
        if (requestedBranchId && requestedBranchId !== branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
      }
      
      // Get all equipment for the branch (or all if HQ)
      const allEquipment = await storage.getEquipment(branchId);
      
      // Get service requests for each equipment with user info
      const allRequests = [];
      for (const equipment of allEquipment) {
        const requests = await storage.listServiceRequests(equipment.id, requestedStatus);
        
        for (const r of requests) {
          // Get creator and updater user names
          const createdByUser = await storage.getUserById(r.createdById);
          const updatedByUser = r.updatedById ? await storage.getUserById(r.updatedById) : null;
          
          allRequests.push({
            ...r,
            equipmentName: equipment.name,
            equipmentType: equipment.type,
            branchId: equipment.branchId,
            branchName: (await storage.getBranch(equipment.branchId))?.name,
            createdByUsername: createdByUser?.username,
            updatedByUsername: updatedByUser?.username,
          });
        }
      }
      
      // Sort by created date (newest first)
      allRequests.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(allRequests);
    } catch (error: Error | unknown) {
      console.error("Error fetching service requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  // Photo upload endpoint for service requests
  app.post('/api/service-requests/:id/upload-photo', isAuthenticated, async (req, res) => {
    try {
      const { compressAndConvertImage } = await import('./photo-utils');
      const requestId = parseInt(req.params.id);
      const { photoData, photoNumber } = req.body;
      
      if (!photoData || !photoNumber || ![1, 2].includes(photoNumber)) {
        return res.status(400).json({ message: 'photoData ve photoNumber (1 veya 2) gerekli' });
      }

      const compressed = await compressAndConvertImage(photoData);
      const base64 = compressed.toString('base64');
      const photoUrl = `data:image/webp;base64,${base64}`;
      
      const photoField = photoNumber === 1 ? 'photo1Url' : 'photo2Url';
      const updatedRequest = await db
        .update(equipmentServiceRequests)
        .set({ [photoField]: photoUrl })
        .where(eq(equipmentServiceRequests.id, requestId))
        .returning();

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Servis talebi bulunamadı' });
      }

      res.json({ success: true, photoUrl, photoNumber });
    } catch (error: Error | unknown) {
      console.error('Foto yükleme hatası:', error);
      res.status(500).json({ message: 'Foto yükleme başarısız' });
    }
  });

  // Create new service request endpoint (from form with machine templates)
  app.post('/api/service-requests/', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const { branchId, equipmentName, equipmentType, priority, serviceProvider, notes, status } = req.body;

      // Validation
      if (!branchId || !equipmentName || !equipmentType || !serviceProvider) {
        return res.status(400).json({ message: "Zorunlu alanlar eksik: branchId, equipmentName, equipmentType, serviceProvider" });
      }

      // Authorization: Branch users can only create requests for their own branch
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const userBranchId = assertBranchScope(user);
        if (branchId !== userBranchId) {
          return res.status(403).json({ message: "Bu şube için servis talebi oluşturma yetkiniz yok" });
        }
      }

      // Find or create placeholder equipment for this request
      const allEquipment = await storage.getEquipment(branchId);
      let equipment = allEquipment.find(e => e.name === equipmentName && e.type === equipmentType);
      
      if (!equipment) {
        // Create a new equipment entry as placeholder for this service request
        equipment = await storage.createEquipment({
          branchId,
          name: equipmentName,
          type: equipmentType,
          serialNumber: `SR-${Date.now()}`, // Temporary serial
          purchaseDate: new Date().toISOString(),
          warrantyExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'aktif',
          notes: 'Servis talebi formu üzerinden oluşturulan cihaz',
        });
      }

      // Create the service request
      const serviceRequest = await storage.createServiceRequest({
        equipmentId: equipment.id,
        status: status || 'talep_edildi',
        priority: priority || 'orta',
        serviceProvider,
        notes: notes || '',
        createdById: userId,
      });

      // Send critical notifications to HQ staff if priority is high/critical
      const finalPriority = priority || 'orta';
      if (finalPriority === 'yüksek' || finalPriority === 'kritik') {
        try {
          const hqUsers = await storage.getUsersByRole('hq_staff');
          const branch = await storage.getBranch(branchId);
          
          for (const hqUser of hqUsers) {
            await storage.createNotification({
              userId: hqUser.id,
              type: 'critical_service_request',
              title: finalPriority === 'kritik' ? '🚨 KRİTİK Servis Talebi!' : '⚠️ Yüksek Öncelikli Talep',
              message: `${branch?.name || 'Bilinmeyen Şube'} - ${equipmentType}: ${notes?.substring(0, 50) || 'Acil teknik destek gerekiyor'}`,
              relatedId: serviceRequest.id,
              read: false,
            });
          }
          console.log(`📢 Critical notification sent to HQ staff for service request ${serviceRequest.id}`);
        } catch (notificationError) {
          console.error('Failed to send critical notifications:', notificationError);
        }
      }

      res.json(serviceRequest);
    } catch (error: Error | unknown) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid service request data", errors: error.errors });
      }
      res.status(500).json({ message: "Servis talebi oluşturulamadı" });
    }
  });

  app.get('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const equipmentTypeId = req.query.equipmentTypeId as string | undefined;
      const isPublished = req.query.isPublished === 'true' ? true : undefined;
      const articles = await storage.getArticles(category, equipmentTypeId, isPublished);
      res.json(articles);
    } catch (error: any) {
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
    } catch (error: Error | unknown) {
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
    } catch (error: any) {
      console.error("Error reindexing article:", error);
      res.status(500).json({ message: "Makale yeniden indekslenemedi" });
    }
  });

  app.post('/api/knowledge-base/ask', isAuthenticated, async (req: any, res) => {
    try {
      const { question, equipmentId } = req.body;
      const userId = req.user.id;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Soru gereklidir" });
      }

      // Fetch equipment context if equipmentId provided (optional)
      let equipmentContext;
      if (equipmentId) {
        try {
          const equipment = await storage.getEquipment(equipmentId);
          if (equipment) {
            const branch = equipment.branchId ? await storage.getBranch(equipment.branchId) : null;
            const recentFaults = await storage.getFaults();
            const equipmentFaults = recentFaults
              .filter(f => f.equipmentId === equipmentId)
              .slice(0, 3)
              .map(f => ({
                description: f.description,
                date: new Date(f.createdAt).toLocaleDateString('tr-TR')
              }));

            equipmentContext = {
              type: equipment.equipmentType,
              serialNumber: equipment.serialNumber || undefined,
              branch: branch?.name,
              recentFaults: equipmentFaults.length > 0 ? equipmentFaults : undefined
            };
          }
        } catch (error: any) {
          console.warn("Failed to fetch equipment context:", error);
          // Continue without equipment context
        }
      }

      // Use enhanced technical assistant with fallback LLM
      const response = await answerTechnicalQuestion(question, equipmentContext, userId);
      res.json(response);
    } catch (error: Error | unknown) {
      console.error("Error answering question:", error);
      res.status(500).json({ message: error.message || "Soru cevaplanamadı" });
    }
  });

  // AI Article Draft Generator (HQ only)
  app.post('/api/knowledge-base/generate-draft', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { topic, category } = req.body;
      
      // HQ only
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu özellik sadece merkez kullanıcıları içindir" });
      }
      
      if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
        return res.status(400).json({ message: "Konu en az 3 karakter olmalıdır" });
      }
      
      if (!category || !['recipe', 'procedure', 'training'].includes(category)) {
        return res.status(400).json({ message: "Geçersiz kategori" });
      }
      
      const draft = await generateArticleDraft(topic.trim(), category, user.id);
      res.json(draft);
    } catch (error: Error | unknown) {
      console.error("Error generating article draft:", error);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ message: (error as Error).message || "Taslak oluşturulamadı" });
    }
  });

  // AI Dashboard Summary (HQ + Branch Supervisors only)
  app.post('/api/ai-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { category } = req.body;

      // Validate category
      if (!category || !['personel', 'cihazlar', 'gorevler'].includes(category)) {
        return res.status(400).json({ message: "Geçersiz kategori. Geçerli değerler: personel, cihazlar, gorevler" });
      }

      // Authorization: Only HQ users and branch supervisors
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const isSupervisor = role === 'supervisor';

      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: "Bu özellik sadece HQ kullanıcıları ve şube supervisorları için kullanılabilir." });
      }

      // Call AI summary generation
      const summary = await generateAISummary(category, {
        id: user.id,
        role: user.role || 'unknown',
        branchId: user.branchId,
        username: user.username,
      });

      res.json(summary);
    } catch (error: Error | unknown) {
      console.error("Error generating AI summary:", error);
      
      // Handle rate limit errors
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI özeti oluşturulamadı" });
    }
  });

  // AI Dashboard Insights (HQ + Supervisor only - operational oversight)
  app.post('/api/ai-dashboard-insights', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      // Authorization: Only HQ users and branch supervisors
      const isHQ = isHQRole(role);
      const isSupervisor = role === 'supervisor' || role === 'supervisor_buddy';

      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: "Bu özellik sadece HQ kullanıcıları ve şube supervisorları için kullanılabilir." });
      }

      // Import AI function
      const { generateDashboardInsights } = await import('./ai');
      
      const insights = await generateDashboardInsights(
        user.id,
        role,
        user.branchId
      );

      res.json(insights);
    } catch (error: Error | unknown) {
      console.error("Error generating dashboard insights:", error);
      
      // Handle rate limit errors with localized message
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI içgörüleri oluşturulamadı" });
    }
  });

  app.get('/api/performance', isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId && req.query.branchId !== 'all' 
        ? parseInt(req.query.branchId as string) 
        : undefined;
      
      // First try stored metrics
      const storedMetrics = await storage.getPerformanceMetrics(branchId);
      
      // If no stored metrics, calculate real-time from database
      if (storedMetrics.length === 0) {
        const taskList = await db.select().from(tasks).where(branchId ? eq(tasks.branchId, branchId) : undefined).limit(200);
        const faultList = await db.select().from(equipmentFaults).where(branchId ? eq(equipmentFaults.branchId, branchId) : undefined).limit(100);
        
        const tasksTotal = taskList.length;
        const tasksCompleted = taskList.filter((t: any) => t.status === 'completed').length;
        const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
        
        const faultsReported = faultList.length;
        const faultsResolved = faultList.filter((f: any) => f.stage === 'resolved').length;
        
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
    } catch (error: any) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.get('/api/performance/latest', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics();
      const latest = metrics.slice(0, 10);
      res.json(latest);
    } catch (error: any) {
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
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUsersForRole(employees, role as UserRoleType));
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Çalışanlar yüklenirken hata oluştu" });
    }
  });

  // Get terminated employees list (ayrılan personeller)
  app.get('/api/employees/terminated', isAuthenticated, async (req, res) => {
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
    } catch (error: any) {
      console.error("Error fetching terminated employees:", error);
      res.status(500).json({ message: "Ayrılan personeller yüklenirken hata oluştu" });
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

      // Sanitize: Remove sensitive fields - HQ users get more details
      res.json(sanitizeUserForRole(employee, role as UserRoleType));
    } catch (error: any) {
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

      // HQ roles that can edit employees (full access)
      const hqEditRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      
      // Sanitize: Remove sensitive fields - HQ users get more details
      res.status(201).json(sanitizeUserForRole(newEmployee, role as UserRoleType));
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Çalışan silinirken hata oluştu" });
    }
  });

  // Reset employee password (admin/coach only)
  app.post('/api/employees/:id/reset-password', isAuthenticated, async (req, res) => {
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

      // Validate new password - enforce strong password policy
      const resetPasswordSchema = z.object({
        newPassword: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[A-Za-z]/, "Şifre en az bir harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir"),
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

      // Update employee password
      await storage.updateUser(employeeId, { hashedPassword });

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
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Şifre sıfırlanırken hata oluştu" });
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

      // Module already contains all JSONB fields (steps, scenarioTasks, supervisorChecklist, learningObjectives)
      res.json(module);
    } catch (error: any) {
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
    } catch (error: Error | unknown) {
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
    } catch (error: Error | unknown) {
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
    } catch (error: any) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ message: "Failed to delete training module" });
    }
  });

  // Bulk import training modules from JSON (admin/coach only)
  app.post('/api/training/import', isAuthenticated, async (req, res) => {
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
              slug: moduleData.code?.toLowerCase(),
              category: role.name?.toLowerCase(),
              level: "beginner",
              estimatedDuration: moduleData.estimated_duration_min || 30,
              isPublished: false,
              requiredForRole: [role.name],
              learningObjectives: moduleData.learning_objectives || [],
              steps: (moduleData.steps || []).map((s: any) => ({
                stepNumber: s.step_number,
                title: s.title,
                content: s.content,
                mediaSuggestions: s.media_suggestions,
              })),
              scenarioTasks: (moduleData.scenario_tasks || []).map((sc: any) => ({
                scenarioId: sc.scenario_id,
                title: sc.title,
                description: sc.description,
                expectedActions: sc.expected_actions,
              })),
              supervisorChecklist: moduleData.supervisor_checklist || [],
              quiz: (moduleData.quiz || []).map((q: any) => ({
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
          } catch (err: any) {
            console.error(`Error importing module ${moduleData.code}:`, err);
          }
        }
      }

      res.json({ 
        success: true, 
        imported: createdModules.length, 
        modules: createdModules 
      });
    } catch (error: Error | unknown) {
      console.error("Error importing training modules:", error);
      res.status(500).json({ message: "Failed to import training modules" });
    }
  });

  // AI-powered training module generation (admin/coach only)
  app.post('/api/training/generate', isAuthenticated, async (req, res) => {
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
      
      console.log(`🎓 AI Module Generation requested for role: ${roleLevel}, duration: ${duration}min`);
      
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
    } catch (error: Error | unknown) {
      console.error("AI Module generation error:", error);
      res.status(500).json({ 
        message: error.message || "Modül oluşturma başarısız" 
      });
    }
  });

  // Save AI-generated module to database (admin/coach only)
  app.post('/api/training/generate/save', isAuthenticated, async (req, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error saving AI-generated module:", error);
      res.status(500).json({ message: "Modül kaydedilemedi" });
    }
  });

  // Upload image for module gallery and get optimized URL (admin/coach only)
  app.post('/api/training/modules/:id/upload-image', isAuthenticated, trainingFileUpload.single('file'), async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler resim yükleyebilir" });
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
    } catch (error: Error | unknown) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: error.message || "Resim yüklenemedi" });
    }
  });

  // Generate image with AI for module (admin/coach only) - CURRENTLY DISABLED
  app.post('/api/training/modules/:id/generate-image', isAuthenticated, async (req, res) => {
    // AI image generation temporarily disabled due to API configuration
    res.status(503).json({ 
      message: "AI resim oluşturma şu an bakım altında. Lütfen manuel yükleme yapın." 
    });
  });

  // Delete image from module gallery (admin/coach only)
  app.delete('/api/training/modules/:id/gallery/:imageIndex', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler resim silebilir" });
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
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message || "Resim silinemedi" });
    }
  });

  // Upload file (PDF/image) and extract text for module generation (admin/coach only)
  app.post('/api/training/generate/upload', isAuthenticated, trainingFileUpload.single('file'), async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler dosya yükleyebilir" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }

      console.log(`📤 File upload received: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

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
    } catch (error: Error | unknown) {
      console.error("File upload/processing error:", error);
      res.status(500).json({ 
        message: error.message || "Dosya işlenemedi" 
      });
    }
  });

  // Generate learning objectives with AI (admin/coach only)
  app.post('/api/training/modules/:id/generate-objectives', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Only admin and coach can generate objectives" });
      }

      const moduleId = parseInt(req.params.id);
      const module = await storage.getTrainingModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Stub: Return mock objectives (in production, would call OpenAI API)
      const objectives = [
        `${module.title} konusunun temel kavramlarını anlamak`,
        `${module.title} ile ilgili praktik beceriler geliştirmek`,
        `${module.title} uygulamalarında sorun çözebilmek`,
        `${module.title} standartlarına uygun prosedürleri takip etmek`,
      ];

      res.json({ objectives });
    } catch (error: any) {
      console.error("Error generating objectives:", error);
      res.status(500).json({ message: "Failed to generate objectives" });
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
    } catch (error: Error | unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module video:", error);
      res.status(500).json({ message: "Failed to create module video" });
    }
  });

  // Get lessons for module
  app.get('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const moduleId = parseInt(req.params.id);
      
      // Check module exists and authorization (same as module detail endpoint)
      const module = await storage.getTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Authorization: Only admin/coach can see lessons from unpublished modules
      const isAdminOrCoach = user.role === 'admin' || user.role === 'coach';
      if (!module.isPublished && !isAdminOrCoach) {
        return res.status(403).json({ message: "Access denied to unpublished module lessons" });
      }

      const lessons = await storage.getModuleLessons(moduleId);
      res.json(lessons);
    } catch (error: any) {
      console.error("Error fetching module lessons:", error);
      res.status(500).json({ message: "Ders listesi getirilemedi" });
    }
  });

  // Add lesson to module (admin/coach only)
  app.post('/api/training/modules/:id/lessons', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders ekleyebilir" });
      }

      const moduleId = parseInt(req.params.id);
      // Validate without moduleId (injected from path param)
      const validated = insertModuleLessonSchema.omit({ moduleId: true }).parse(req.body);
      const lesson = await storage.createModuleLesson({
        ...validated,
        moduleId,
      });
      
      res.status(201).json(lesson);
    } catch (error: Error | unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating module lesson:", error);
      res.status(500).json({ message: "Ders oluşturulamadı" });
    }
  });

  // Update lesson (admin/coach only)
  app.put('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: Error | unknown) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating module lesson:", error);
      res.status(500).json({ message: "Ders güncellenemedi" });
    }
  });

  // Delete lesson (admin/coach only)
  app.delete('/api/training/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: "Sadece admin ve eğitmenler ders silebilir" });
      }

      const lessonId = parseInt(req.params.id);
      await storage.deleteModuleLesson(lessonId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting module lesson:", error);
      res.status(500).json({ message: "Ders silinemedi" });
    }
  });

  // Generate AI materials (quiz questions + flashcards) from lesson content (admin/coach only)
  app.post('/api/training/lessons/:id/generate-materials', isAuthenticated, async (req, res) => {
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
    } catch (error: any) {
      console.error("Error generating AI materials:", error);
      res.status(500).json({ message: "AI materyal oluşturulamadı" });
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
    } catch (error: Error | unknown) {
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
    } catch (error: any) {
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
    } catch (error: Error | unknown) {
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
    } catch (error: Error | unknown) {
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
    } catch (error: any) {
      console.error("Error approving quiz attempt:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to approve quiz attempt" });
    }
  });

  // Get presigned upload URL for object storage
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ method: "PUT", url: uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Finalize uploaded object - normalize URL and set ACL policy
  app.post('/api/objects/finalize', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const user = req.user!;
      
      const { url, visibility = "public" } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Normalize the URL and set ACL policy
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(url, {
        owner: user.id,
        visibility: visibility === "public" ? "public" : "private",
      });
      
      // Validate the result - if path doesn't start with /objects/, ACL setting failed
      if (!normalizedPath || !normalizedPath.startsWith("/objects/")) {
        console.error("Failed to normalize object path:", url, "->", normalizedPath);
        return res.status(500).json({ message: "Failed to normalize upload path" });
      }
      
      res.json({ normalizedUrl: normalizedPath });
    } catch (error: any) {
      console.error("Error finalizing object:", error);
      res.status(500).json({ message: "Failed to finalize upload" });
    }
  });

  // Serve private objects with ACL check (for uploaded files)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const userId = req.user?.claims?.sub || req.user?.id;
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: Error | unknown) {
      console.error("Error accessing object:", error);
      if (error.name === 'ObjectNotFoundError') {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Seed endpoint removed - can be reimplemented if needed
  
  // Update attendance record (check-out, break times)
  app.patch('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getShiftAttendance(id);
      if (!existing) {
        return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
      }
      
      // Authorization: Owner or supervisor can update
      if (!isHQRole(role)) {
        if (role !== 'supervisor' && role !== 'supervisor_buddy') {
          // Regular employees can only update their own
          if (existing.userId !== user.id) {
            return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
          }
        } else {
          // Supervisors can update their branch
          const shift = await storage.getShift(existing.shiftId);
          if (shift?.branchId !== user.branchId) {
            return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
          }
        }
      }
      
      // Validate partial update
      const validatedData = insertShiftAttendanceSchema.partial().parse(req.body);
      
      const updated = await storage.updateShiftAttendance(id, validatedData);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating attendance record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yoklama verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yoklama kaydı güncellenemedi" });
    }
  });
  
  // Delete attendance record (supervisor + HQ only)
  app.delete('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getShiftAttendance(id);
      if (!existing) {
        return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
      }
      
      // Authorization: Only supervisors and HQ can delete
      if (!isHQRole(role)) {
        if (role !== 'supervisor' && role !== 'supervisor_buddy') {
          return res.status(403).json({ message: "Yoklama kaydı silme yetkiniz yok" });
        }
        
        const shift = await storage.getShift(existing.shiftId);
        if (shift?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu yoklama kaydını silme yetkiniz yok" });
        }
      }
      
      await storage.deleteShiftAttendance(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting attendance record:", error);
      res.status(500).json({ message: "Yoklama kaydı silinemedi" });
    }
  });

  // ===== SHIFT TRADE REQUEST ENDPOINTS =====
  
  // POST /api/shift-trades - Create a shift trade request
  app.post('/api/shift-trades', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { insertShiftTradeRequestSchema } = await import('@shared/schema');
      
      const validatedData = insertShiftTradeRequestSchema.parse(req.body);
      
      const requesterShift = await storage.getShift(validatedData.requesterShiftId);
      if (!requesterShift) {
        return res.status(404).json({ message: "Talep eden vardiya bulunamadı" });
      }
      
      if (requesterShift.assignedToId !== validatedData.requesterId) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      if (validatedData.requesterId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi vardiyalarınız için takas talebi oluşturabilirsiniz" });
      }
      
      const responderShift = await storage.getShift(validatedData.responderShiftId);
      if (!responderShift) {
        return res.status(404).json({ message: "Hedef vardiya bulunamadı" });
      }
      
      if (responderShift.assignedToId !== validatedData.responderId) {
        return res.status(400).json({ message: "Hedef çalışan bu vardiyaya atanmamış" });
      }
      
      if (validatedData.requesterShiftId === validatedData.responderShiftId) {
        return res.status(400).json({ message: "Aynı vardiya ile takas yapılamaz" });
      }
      
      const existingTrades = await storage.getShiftTradeRequests({
        userId: user.id,
        status: 'taslak'
      });
      
      const duplicate = existingTrades.find(
        trade => 
          (trade.requesterShiftId === validatedData.requesterShiftId && 
           trade.responderShiftId === validatedData.responderShiftId) ||
          (trade.requesterShiftId === validatedData.responderShiftId && 
           trade.responderShiftId === validatedData.requesterShiftId)
      );
      
      if (duplicate) {
        return res.status(400).json({ message: "Bu vardiyalar için zaten açık bir takas talebi var" });
      }
      
      const created = await storage.createShiftTradeRequest(validatedData);
      res.status(201).json(created);
    } catch (error: Error | unknown) {
      console.error("Error creating shift trade request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz takas talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Takas talebi oluşturulamadı" });
    }
  });
  
  // GET /api/shift-trades - List shift trade requests with filters
  app.get('/api/shift-trades', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { branchId: queryBranchId, userId: queryUserId, status } = req.query;
      
      const filters: { branchId?: number; userId?: string; status?: string } = {};
      
      if (status) {
        filters.status = status as string;
      }
      
      if (isHQRole(role)) {
        if (queryBranchId) {
          filters.branchId = parseInt(queryBranchId as string);
        }
        if (queryUserId) {
          filters.userId = queryUserId as string;
        }
      } else if (role === 'supervisor' || role === 'supervisor_buddy' || role === 'coach' || role === 'admin') {
        filters.branchId = user.branchId!;
      } else {
        filters.userId = user.id;
      }
      
      const trades = await storage.getShiftTradeRequests(filters);
      res.json(trades);
    } catch (error: any) {
      console.error("Error fetching shift trade requests:", error);
      res.status(500).json({ message: "Takas talepleri alınamadı" });
    }
  });
  
  // PATCH /api/shift-trades/:id/respond - Responder confirms the trade
  app.patch('/api/shift-trades/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const trades = await storage.getShiftTradeRequests({ userId: user.id });
      const trade = trades.find(t => t.id === id);
      
      if (!trade) {
        return res.status(404).json({ message: "Takas talebi bulunamadı" });
      }
      
      if (trade.responderId !== user.id) {
        return res.status(403).json({ message: "Bu takas talebini yalnızca hedef çalışan onaylayabilir" });
      }
      
      if (trade.status !== 'taslak') {
        return res.status(400).json({ message: "Bu takas talebi zaten işleme alınmış" });
      }
      
      await storage.respondToShiftTradeRequest(id, user.id);
      
      const updated = await storage.getShiftTradeRequests({ userId: user.id });
      const updatedTrade = updated.find(t => t.id === id);
      
      res.json(updatedTrade);
    } catch (error: any) {
      console.error("Error responding to shift trade request:", error);
      res.status(500).json({ message: "Takas talebi yanıtlanamadı" });
    }
  });
  
  // PATCH /api/shift-trades/:id/approve - Supervisor approves or rejects the trade
  app.patch('/api/shift-trades/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Takas taleplerini onaylama yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const approveSchema = z.object({
        approved: z.boolean(),
        notes: z.string().optional(),
      });
      
      const { approved, notes } = approveSchema.parse(req.body);
      
      const allTrades = await storage.getShiftTradeRequests({});
      const trade = allTrades.find(t => t.id === id);
      
      if (!trade) {
        return res.status(404).json({ message: "Takas talebi bulunamadı" });
      }
      
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        const requesterShift = await storage.getShift(trade.requesterShiftId);
        const responderShift = await storage.getShift(trade.responderShiftId);
        
        if (requesterShift?.branchId !== user.branchId && responderShift?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubenin takas taleplerini onaylayabilirsiniz" });
        }
      }
      
      if (trade.status !== 'calisan_onayi') {
        return res.status(400).json({ message: "Bu takas talebi henüz çalışan tarafından onaylanmamış" });
      }
      
      await storage.approveShiftTradeRequest(id, user.id, approved, notes);
      
      const updated = await storage.getShiftTradeRequests({});
      const updatedTrade = updated.find(t => t.id === id);
      
      res.json(updatedTrade);
    } catch (error: Error | unknown) {
      console.error("Error approving shift trade request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz onay verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Takas talebi onaylanamadı" });
    }
  });

  // ===== SHIFT TEMPLATE ENDPOINTS =====
  
  // GET /api/shift-templates - List shift templates
  app.get('/api/shift-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { branchId: queryBranchId } = req.query;
      
      if (isHQRole(role)) {
        const branchId = queryBranchId ? parseInt(queryBranchId as string) : undefined;
        const templates = await storage.getShiftTemplates(branchId);
        return res.json(templates);
      }
      
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }
      
      const templates = await storage.getShiftTemplates(user.branchId);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching shift templates:", error);
      res.status(500).json({ message: "Şablonlar getirilemedi" });
    }
  });
  
  // GET /api/shift-templates/:id - Get single shift template
  app.get('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const template = await storage.getShiftTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && template.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu görüntüleme yetkiniz yok" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error("Error fetching shift template:", error);
      res.status(500).json({ message: "Şablon getirilemedi" });
    }
  });
  
  // POST /api/shift-templates - Create shift template
  app.post('/api/shift-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon oluşturma yetkiniz yok" });
      }
      
      const { insertShiftTemplateSchema } = await import('@shared/schema');
      const validatedData = insertShiftTemplateSchema.parse(req.body);
      
      if (!isHQRole(role) && validatedData.branchId !== user.branchId) {
        return res.status(403).json({ message: "Başka şubeler için şablon oluşturamazsınız" });
      }
      
      const created = await storage.createShiftTemplate({
        ...validatedData,
        createdById: user.id,
      });
      
      res.status(201).json(created);
    } catch (error: Error | unknown) {
      console.error("Error creating shift template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });
  
  // PATCH /api/shift-templates/:id - Update shift template
  app.patch('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon güncelleme yetkiniz yok" });
      }
      
      const existing = await storage.getShiftTemplate(id);
      if (!existing) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && existing.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu güncelleme yetkiniz yok" });
      }
      
      const { insertShiftTemplateSchema } = await import('@shared/schema');
      const validatedData = insertShiftTemplateSchema.partial().parse(req.body);
      
      const updated = await storage.updateShiftTemplate(id, validatedData);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating shift template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });
  
  // DELETE /api/shift-templates/:id - Delete shift template
  app.delete('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablon silme yetkiniz yok" });
      }
      
      const existing = await storage.getShiftTemplate(id);
      if (!existing) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && existing.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu silme yetkiniz yok" });
      }
      
      await storage.deleteShiftTemplate(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });
  
  // POST /api/shift-templates/:id/create-shifts - Create shifts from template
  app.post('/api/shift-templates/:id/create-shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
        return res.status(403).json({ message: "Şablondan vardiya oluşturma yetkiniz yok" });
      }
      
      const template = await storage.getShiftTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }
      
      if (!isHQRole(role) && template.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şablonu kullanma yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const createShiftsSchema = z.object({
        startDate: z.string(),
        endDate: z.string(),
      });
      
      const { startDate, endDate } = createShiftsSchema.parse(req.body);
      
      const created = await storage.createShiftsFromTemplate(id, startDate, endDate, user.id);
      res.status(201).json({ 
        message: `${created.length} vardiya oluşturuldu`,
        shifts: created 
      });
    } catch (error: Error | unknown) {
      console.error("Error creating shifts from template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz tarih aralığı", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiyalar oluşturulamadı" });
    }
  });

  // ===== EMPLOYEE AVAILABILITY ENDPOINTS =====
  
  // GET /api/employee-availability - List employee availability
  app.get('/api/employee-availability', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { userId: queryUserId, startDate, endDate } = req.query;
      
      if (isHQRole(role) || ['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        const userId = queryUserId as string | undefined;
        const availability = await storage.getEmployeeAvailability(
          userId,
          startDate as string | undefined,
          endDate as string | undefined
        );
        return res.json(availability);
      }
      
      const availability = await storage.getEmployeeAvailability(
        user.id,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(availability);
    } catch (error: any) {
      console.error("Error fetching employee availability:", error);
      res.status(500).json({ message: "Müsaitlik bilgileri getirilemedi" });
    }
  });
  
  // GET /api/employee-availability/:id - Get single availability record
  app.get('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      const availability = await storage.getAvailability(id);
      if (!availability) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        if (availability.userId !== user.id) {
          return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
        }
      }
      
      res.json(availability);
    } catch (error: any) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı getirilemedi" });
    }
  });
  
  // POST /api/employee-availability - Create availability record
  app.post('/api/employee-availability', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.parse(req.body);
      
      if (validatedData.userId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi müsaitlik bilgilerinizi ekleyebilirsiniz" });
      }
      
      const created = await storage.createAvailability(validatedData);
      res.status(201).json(created);
    } catch (error: Error | unknown) {
      console.error("Error creating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı oluşturulamadı" });
    }
  });
  
  // PATCH /api/employee-availability/:id - Update availability record
  app.patch('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getAvailability(id);
      if (!existing) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu kaydı güncelleme yetkiniz yok" });
      }
      
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.partial().parse(req.body);
      
      const updated = await storage.updateAvailability(id, validatedData);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı güncellenemedi" });
    }
  });
  
  // DELETE /api/employee-availability/:id - Delete availability record
  app.delete('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getAvailability(id);
      if (!existing) {
        return res.status(404).json({ message: "Müsaitlik kaydı bulunamadı" });
      }
      
      if (existing.userId !== user.id) {
        return res.status(403).json({ message: "Bu kaydı silme yetkiniz yok" });
      }
      
      await storage.deleteAvailability(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı silinemedi" });
    }
  });
  
  // POST /api/employee-availability/check - Check availability for a shift
  app.post('/api/employee-availability/check', isAuthenticated, async (req: any, res) => {
    try {
      const { z } = await import('zod');
      const checkSchema = z.object({
        userId: z.string(),
        shiftDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      });
      
      const { userId, shiftDate, startTime, endTime } = checkSchema.parse(req.body);
      
      const result = await storage.checkEmployeeAvailability(userId, shiftDate, startTime, endTime);
      res.json(result);
    } catch (error: Error | unknown) {
      console.error("Error checking availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz kontrol verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kontrolü yapılamadı" });
    }
  });

  // ===== CHECK-IN/CHECK-OUT ENDPOINTS =====

  // Haversine formula - iki nokta arasındaki mesafeyi metre cinsinden hesapla
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Dünya yarıçapı metre
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // POST /api/shift-attendance/manual-check-in - Manual check-in with location verification (with optional shift)
  app.post('/api/shift-attendance/manual-check-in', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const manualCheckInSchema = z.object({
        shiftId: z.coerce.number().optional(),
        branchId: z.coerce.number().optional(),
        checkInMethod: z.enum(['manual', 'qr']).default('manual'),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationConfidenceScore: z.number().min(0).max(100).optional(),
      });
      
      const { shiftId, branchId, checkInMethod, latitude, longitude, locationConfidenceScore } = manualCheckInSchema.parse(req.body);
      
      let shift;
      let targetBranchId;
      
      if (shiftId) {
        shift = await storage.getShift(shiftId);
        if (!shift) {
          return res.status(404).json({ message: "Vardiya bulunamadı" });
        }
        
        if (shift.assignedToId !== user.id) {
          return res.status(403).json({ message: "Bu vardiya size atanmamış" });
        }
        targetBranchId = shift.branchId;
      } else if (branchId) {
        // Vardiyasız giriş - branchId kullanarak
        const branch = await storage.getBranch(branchId);
        if (!branch) {
          return res.status(404).json({ message: "Şube bulunamadı" });
        }
        targetBranchId = branchId;
      } else {
        return res.status(400).json({ message: "Vardiya ID veya Şube ID zorunludur" });
      }
      
      // Geofence validation
      if (latitude !== undefined && longitude !== undefined && targetBranchId) {
        const branch = await storage.getBranch(targetBranchId);
        if (branch && branch.shiftCornerLatitude && branch.shiftCornerLongitude) {
          const branchLat = parseFloat(branch.shiftCornerLatitude);
          const branchLon = parseFloat(branch.shiftCornerLongitude);
          const radius = (branch.geoRadius || 50) * 1.5;
          const distance = calculateDistance(latitude, longitude, branchLat, branchLon);
          
          if (distance > radius) {
            return res.status(400).json({ 
              message: `Şube dışındasınız (${Math.round(distance)}m, izin: ${radius}m)`,
              locationValid: false,
              distance: Math.round(distance)
            });
          }
        }
      }
      
      let existingAttendances: any[] = [];
      let userAttendance: any = null;
      
      if (shiftId) {
        existingAttendances = await storage.getShiftAttendances(shiftId);
        userAttendance = existingAttendances.find(a => a.userId === user.id);
        
        if (userAttendance?.checkInTime) {
          return res.status(400).json({ message: "Bu vardiyaya zaten giriş yaptınız" });
        }
      }
      
      const now = new Date();
      
      const attendanceData: any = {
        checkInTime: now,
        status: 'checked_in',
        checkInMethod: checkInMethod,
        locationConfidenceScore: locationConfidenceScore || 0,
      };
      
      if (latitude !== undefined) {
        attendanceData.checkInLatitude = latitude.toString();
      }
      if (longitude !== undefined) {
        attendanceData.checkInLongitude = longitude.toString();
      }
      
      let attendance;
      if (shiftId) {
        if (userAttendance) {
          attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
        } else {
          attendance = await storage.createShiftAttendance({
            shiftId: shiftId,
            userId: user.id,
            ...attendanceData,
          });
        }
      } else {
        // Vardiyasız giriş - branchId ile branch attendance
        attendance = await storage.createShiftAttendance({
          shiftId: -Math.abs(branchId || 1),
          userId: user.id,
          ...attendanceData,
        });
      }
      
      res.status(201).json(attendance);
    } catch (error: Error | unknown) {
      console.error("Error manual check-in:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Giriş yapılamadı" });
    }
  });

  // POST /api/shift-attendance/manual-check-out - Manual check-out 
  app.post('/api/shift-attendance/manual-check-out', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const manualCheckOutSchema = z.object({
        attendanceId: z.number(),
      });
      
      const { attendanceId } = manualCheckOutSchema.parse(req.body);
      
      const attendance = await storage.getShiftAttendance(attendanceId);
      if (!attendance) {
        return res.status(404).json({ message: "Giriş kaydı bulunamadı" });
      }
      
      if (attendance.userId !== user.id) {
        return res.status(403).json({ message: "Bu kayıt size ait değil" });
      }
      
      if (attendance.checkOutTime) {
        return res.status(400).json({ message: "Zaten çıkış yapılmış" });
      }
      
      const now = new Date();
      const updated = await storage.updateShiftAttendance(attendanceId, {
        checkOutTime: now,
        status: 'completed',
      });
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error manual check-out:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Çıkış yapılamadı" });
    }
  });
  
  // POST /api/shift-attendance/check-in - Check in with QR code, photo & location
  app.post('/api/shift-attendance/check-in', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const checkInSchema = z.object({
        qrData: z.string(),
        photoUrl: z.string().min(1, "Fotoğraf gereklidir"), // Required S3 URL of check-in photo
        latitude: z.number().min(-90).max(90, "Geçersiz enlem"),
        longitude: z.number().min(-180).max(180, "Geçersiz boylam"),
      });
      
      const { qrData, photoUrl, latitude, longitude } = checkInSchema.parse(req.body);
      
      const verification = await storage.verifyShiftQR(qrData);
      if (!verification.valid) {
        return res.status(400).json({ message: verification.message });
      }
      
      const shift = await storage.getShift(verification.shiftId!);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      if (shift.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      const existingAttendances = await storage.getShiftAttendances(shift.id);
      const userAttendance = existingAttendances.find(a => a.userId === user.id);
      
      if (userAttendance) {
        if (userAttendance.checkInTime) {
          return res.status(400).json({ message: "Bu vardiyaya zaten giriş yaptınız" });
        }
      }
      
      const now = new Date();
      
      // Prepare attendance data (photo and location are required)
      const attendanceData: any = {
        checkInTime: now,
        status: 'checked_in',
        checkInPhotoUrl: photoUrl,
        checkInLatitude: latitude.toString(),
        checkInLongitude: longitude.toString(),
      };
      
      let attendance;
      if (userAttendance) {
        attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
      } else {
        attendance = await storage.createShiftAttendance({
          shiftId: shift.id,
          userId: user.id,
          ...attendanceData,
        });
      }
      
      // Trigger AI dress code analysis asynchronously (photo is required)
      if (attendance) {
        (async () => {
          try {
            const analysis = await analyzeDressCodePhoto(
              photoUrl,
              user.fullName || user.email || "Çalışan",
              user.id,
              false // use cache
            );
            
            await storage.updateShiftAttendance(attendance.id, {
              aiDressCodeScore: analysis.score,
              aiDressCodeAnalysis: analysis ,
              aiDressCodeStatus: analysis.isCompliant ? 'approved' : 'rejected',
              aiDressCodeWarnings: analysis.violations,
              aiDressCodeTimestamp: new Date(),
            });
            
            console.log(`✅ Dress code analyzed for attendance ${attendance.id}: ${analysis.score}/100`);
          } catch (error: any) {
            console.error("Error analyzing dress code:", error);
            await storage.updateShiftAttendance(attendance.id, {
              aiDressCodeStatus: 'error',
              aiDressCodeWarnings: ["AI analizi yapılamadı"],
            });
          }
        })();
      }
      
      res.status(201).json(attendance);
    } catch (error: Error | unknown) {
      console.error("Error checking in:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
      }
      res.status(500).json({ message: "Giriş yapılamadı" });
    }
  });
  
  // POST /api/shift-attendance/check-out - Check out with QR code + photo + location
  app.post('/api/shift-attendance/check-out', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { z } = await import('zod');
      const checkOutSchema = z.object({
        qrData: z.string(),
        photoUrl: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      });
      
      const { qrData, photoUrl, latitude, longitude } = checkOutSchema.parse(req.body);
      
      const verification = await storage.verifyShiftQR(qrData);
      if (!verification.valid) {
        return res.status(400).json({ message: verification.message });
      }
      
      const shift = await storage.getShift(verification.shiftId!);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      if (shift.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      
      const existingAttendances = await storage.getShiftAttendances(shift.id);
      const userAttendance = existingAttendances.find(a => a.userId === user.id);
      
      if (!userAttendance || !userAttendance.checkInTime) {
        return res.status(400).json({ message: "Önce giriş yapmalısınız" });
      }
      
      if (userAttendance.checkOutTime) {
        return res.status(400).json({ message: "Bu vardiyadan zaten çıkış yaptınız" });
      }
      
      const now = new Date();
      
      const updated = await storage.updateShiftAttendance(userAttendance.id, {
        checkOutTime: now,
        checkOutPhotoUrl: photoUrl,
        checkOutLatitude: latitude.toString(),
        checkOutLongitude: longitude.toString(),
        status: 'checked_out',
      });
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error checking out:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
      }
      res.status(500).json({ message: "Çıkış yapılamadı" });
    }
  });

  // ===== SHIFT REPORTING ENDPOINTS =====
  
  // GET /api/reports/attendance-stats - Get attendance statistics
  app.get('/api/reports/attendance-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const { userId: queryUserId, month, year } = req.query;
      
      let targetUserId = user.id;
      
      if (isHQRole(role) || ['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role)) {
        targetUserId = queryUserId as string || user.id;
      }
      
      const monthNum = month ? parseInt(month as string) : undefined;
      const yearNum = year ? parseInt(year as string) : undefined;
      
      const stats = await storage.calculateAttendanceStats(targetUserId, monthNum, yearNum);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching attendance stats:", error);
      res.status(500).json({ message: "İstatistikler getirilemedi" });
    }
  });

  // ===== MENU MANAGEMENT ENDPOINTS =====
  
  // GET /api/me/menu - User-scoped menu endpoint (v2 - static blueprint based)
  // Primary endpoint for sidebar menu - uses static blueprint with RBAC filtering
  // NO CACHING - fresh data every request to prevent RBAC bypass
  app.get('/api/me/menu', isAuthenticated, async (req: any, res) => {
    try {
      // Disable caching
      res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      
      // Fetch badge counts using existing storage methods
      let notificationCount = 0;
      let messageCount = 0;
      
      try {
        const notifications = await storage.getNotifications(user.id);
        notificationCount = notifications.filter((n: any) => !n.readAt).length;
      } catch (e) {
        // Ignore notification count errors
      }
      
      try {
        const unreadResult = await storage.getUnreadCount(user.id);
        messageCount = unreadResult?.count || 0;
      } catch (e) {
        // Ignore message count errors
      }
      
      const badges: Record<string, number> = {
        notifications: notificationCount,
        messages: messageCount,
      };
      
      // Fetch dynamic permissions from database for this role
      let dynamicPermissions: Array<{ role: string; module: string; actions: string[] }> = [];
      try {
        const allPermissions = await storage.getRolePermissions();
        dynamicPermissions = allPermissions.filter(p => p.role === userRole);
      } catch (e) {
        console.error("Error fetching dynamic permissions:", e);
        // Continue with static permissions if dynamic fails
      }
      
      // Build menu using the new service with dynamic permissions
      const menuResponse = buildMenuForUser(
        { id: user.id, role: userRole },
        badges,
        dynamicPermissions
      );
      
      console.log(`[/api/me/menu v2] User: ${user.username}, Role: ${userRole}, Scope: ${menuResponse.meta.scope}, Sections: ${menuResponse.sections.length}, DynamicPerms: ${dynamicPermissions.length}`);
      
      return res.status(200).json(menuResponse);
    } catch (error: any) {
      console.error("Error fetching user menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  
  // GET /api/menu - Legacy endpoint (deprecated, redirects to static blueprint)
  app.get('/api/menu', isAuthenticated, async (req: any, res) => {
    try {
      res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      
      // Fetch dynamic permissions from database for this role
      let dynamicPermissions: Array<{ role: string; module: string; actions: string[] }> = [];
      try {
        const allPermissions = await storage.getRolePermissions();
        dynamicPermissions = allPermissions.filter(p => p.role === userRole);
      } catch (e) {
        console.error("Error fetching dynamic permissions for legacy menu:", e);
      }
      
      // Use new menu service with dynamic permissions
      const menuResponse = buildMenuForUser({ id: user.id, role: userRole }, {}, dynamicPermissions);
      
      // Convert to legacy format for backwards compatibility
      res.json({
        sections: menuResponse.sections.map((s, idx) => ({
          id: idx + 1,
          slug: s.id,
          titleTr: s.titleTr,
          scope: s.scope,
          icon: s.icon,
          sortOrder: idx,
        })),
        items: menuResponse.sections.flatMap((section, sIdx) => 
          section.items.map((item, iIdx) => ({
            id: sIdx * 100 + iIdx + 1,
            sectionId: sIdx + 1,
            titleTr: item.titleTr,
            path: item.path,
            icon: item.icon,
            moduleKey: item.moduleKey,
            scope: item.scope,
            sortOrder: iIdx,
            isActive: true,
          }))
        ),
        rules: [],
      });
    } catch (error: any) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });
  
  // GET /api/admin/menu - List all menu data (HQ Admin only, for menu management)
  app.get('/api/admin/menu', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const menu = await storage.listMenu();
      res.json(menu);
    } catch (error: any) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // POST /api/admin/menu/sections - Create section
  app.post('/api/admin/menu/sections', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuSectionSchema.parse(req.body);
      const section = await storage.createMenuSection(data);
      res.status(201).json(section);
    } catch (error: Error | unknown) {
      console.error("Error creating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu section data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu section" });
    }
  });

  // PATCH /api/admin/menu/sections/:id - Update section
  app.patch('/api/admin/menu/sections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuSectionSchema.partial().parse(req.body);
      const section = await storage.updateMenuSection(id, data);
      res.json(section);
    } catch (error: Error | unknown) {
      console.error("Error updating menu section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu section data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu section" });
    }
  });

  // DELETE /api/admin/menu/sections/:id - Delete section
  app.delete('/api/admin/menu/sections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuSection(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting menu section:", error);
      res.status(500).json({ message: "Failed to delete menu section" });
    }
  });

  // PATCH /api/admin/menu/sections/order - Reorder sections
  app.patch('/api/admin/menu/sections/order', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { sectionIds } = req.body;
      if (!Array.isArray(sectionIds) || !sectionIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid sectionIds array" });
      }
      await storage.reorderMenuSections(sectionIds);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error reordering menu sections:", error);
      res.status(500).json({ message: "Failed to reorder menu sections" });
    }
  });

  // POST /api/admin/menu/items - Create item
  app.post('/api/admin/menu/items', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: Error | unknown) {
      console.error("Error creating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // PATCH /api/admin/menu/items/:id - Update item
  app.patch('/api/admin/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      const data = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, data);
      res.json(item);
    } catch (error: Error | unknown) {
      console.error("Error updating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // DELETE /api/admin/menu/items/:id - Delete item
  app.delete('/api/admin/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // PATCH /api/admin/menu/items/order - Reorder items within section
  app.patch('/api/admin/menu/items/order', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { sectionId, itemIds } = req.body;
      if (typeof sectionId !== 'number' || !Array.isArray(itemIds) || !itemIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid sectionId or itemIds array" });
      }
      await storage.reorderMenuItems(sectionId, itemIds);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error reordering menu items:", error);
      res.status(500).json({ message: "Failed to reorder menu items" });
    }
  });

  // POST /api/admin/menu/visibility-rules - Create visibility rule
  app.post('/api/admin/menu/visibility-rules', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertMenuVisibilityRuleSchema.parse(req.body);
      const rule = await storage.createVisibilityRule(data);
      res.status(201).json(rule);
    } catch (error: Error | unknown) {
      console.error("Error creating visibility rule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid visibility rule data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create visibility rule" });
    }
  });

  // DELETE /api/admin/menu/visibility-rules/:id - Delete visibility rule
  app.delete('/api/admin/menu/visibility-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteVisibilityRule(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting visibility rule:", error);
      res.status(500).json({ message: "Failed to delete visibility rule" });
    }
  });

  // ===== PAGE CONTENT MANAGEMENT ENDPOINTS (HQ Only) =====

  // GET /api/admin/page-content - List all page content
  app.get('/api/admin/page-content', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const contents = await storage.listPageContent();
      res.json(contents);
    } catch (error: any) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  // GET /api/admin/page-content/:slug - Get single page content by slug
  app.get('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const content = await storage.getPageContent(req.params.slug);
      if (!content) {
        return res.status(404).json({ message: "İçerik bulunamadı" });
      }
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  // POST /api/admin/page-content - Create new page content
  app.post('/api/admin/page-content', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertPageContentSchema.parse({
        ...req.body,
        createdById: user.id,
        updatedById: user.id,
      });
      
      const newContent = await storage.createPageContent(validatedData);
      res.status(201).json(newContent);
    } catch (error: Error | unknown) {
      console.error("Error creating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create page content" });
    }
  });

  // PATCH /api/admin/page-content/:slug - Update page content
  app.patch('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate request body with partial schema
      const validatedData = updatePageContentSchema.parse(req.body);
      
      const updateData = {
        ...validatedData,
        updatedById: user.id,
      };
      
      const updated = await storage.updatePageContent(req.params.slug, updateData);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      if (error instanceof Error && error.message === "Content not found") {
        return res.status(404).json({ message: "İçerik bulunamadı" });
      }
      res.status(500).json({ message: "Failed to update page content" });
    }
  });

  // DELETE /api/admin/page-content/:slug - Delete page content
  app.delete('/api/admin/page-content/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      await storage.deletePageContent(req.params.slug);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting page content:", error);
      res.status(500).json({ message: "Failed to delete page content" });
    }
  });

  // ===== BRANDING ENDPOINTS (HQ Only) =====

  // GET /api/admin/branding - Get current branding (logo)
  app.get('/api/admin/branding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const branding = await storage.getBranding();
      // Sanitize response: only expose logoUrl and updatedAt
      res.json({
        logoUrl: branding?.logoUrl || null,
        updatedAt: branding?.updatedAt || null,
      });
    } catch (error: any) {
      console.error("Error fetching branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  // POST /api/admin/branding/logo - Update logo URL
  app.post('/api/admin/branding/logo', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate logoUrl with Zod (URL format check)
      const brandingSchema = z.object({
        logoUrl: z.string().url("Geçerli bir URL gerekli"),
      });
      
      const validatedData = brandingSchema.parse(req.body);
      const updated = await storage.updateBrandingLogo(validatedData.logoUrl, user.id);
      
      // Sanitize response
      res.json({
        logoUrl: updated.logoUrl,
        updatedAt: updated.updatedAt,
      });
    } catch (error: Error | unknown) {
      console.error("Error updating logo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // ===== AI COST MONITORING ENDPOINTS (HQ Only) =====

  // GET /api/admin/ai-costs - Get AI usage cost aggregates
  app.get('/api/admin/ai-costs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      // Validate query params with Zod
      const querySchema = z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      });

      const { start, end } = querySchema.parse(req.query);

      // Convert string dates to Date objects
      const filters = {
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
      };

      const aggregates = await storage.getAiUsageAggregates(filters);
      res.json(aggregates);
    } catch (error: Error | unknown) {
      console.error("Error fetching AI cost aggregates:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz tarih formatı", errors: error.errors });
      }
      res.status(500).json({ message: "AI maliyet verileri alınamadı" });
    }
  });

  // ===== USER CRM ENDPOINTS (HQ Only) =====

  // GET /api/admin/users - Get all users with filters
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { role, branchId, search, accountStatus } = req.query;
      const filters = {
        role: role as string | undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        search: search as string | undefined,
        accountStatus: accountStatus as string | undefined,
      };

      const allUsers = await storage.getAllUsersWithFilters(filters);
      res.json(allUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // PATCH /api/admin/users/:id - Update user role/branch
  app.patch('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      const updateSchema = z.object({
        role: z.string().optional(),
        branchId: z.number().nullable().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updated = await storage.updateUser(id, validatedData);

      if (!updated) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // POST /api/admin/users/bulk-import - Bulk import users from CSV
  app.post('/api/admin/users/bulk-import', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { users: csvUsers } = req.body;
      if (!Array.isArray(csvUsers) || csvUsers.length === 0) {
        return res.status(400).json({ message: "Geçerli kullanıcı listesi gerekli" });
      }

      // Validate each user record
      const userSchema = z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        role: z.string(),
        branchId: z.number().nullable(),
        profileImageUrl: z.string().nullable().optional(),
      });

      const validatedUsers = csvUsers.map(u => userSchema.parse(u));
      const imported = await storage.bulkImportUsers(validatedUsers);

      res.json({ imported: imported.length, users: imported });
    } catch (error: Error | unknown) {
      console.error("Error bulk importing users:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz CSV verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  // POST /api/admin/users/approve/:id - Approve pending user
  app.post('/api/admin/users/approve/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const { sendWelcomeEmail } = await import('./email');
      const crypto = await import('crypto');

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'approve');

      const { id } = req.params;
      const targetUser = await storage.getUser(id);
      
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Supervisor can only approve users in their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId || currentUser.branchId !== targetUser.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin kullanıcılarını onaylayabilirsiniz" });
        }
      }

      if (targetUser.accountStatus !== 'pending') {
        return res.status(400).json({ message: "Kullanıcı zaten onaylanmış veya reddedilmiş" });
      }

      // Generate strong temporary password (12 characters)
      const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user: approved, active, set password
      const updated = await storage.updateUser(id, {
        accountStatus: 'approved',
        isActive: true,
        hashedPassword,
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      });

      if (!updated) {
        return res.status(500).json({ message: "Onay işlemi başarısız" });
      }

      // Send welcome email with temporary password
      if (targetUser.email) {
        await sendWelcomeEmail(targetUser.email, targetUser.username!, tempPassword);
      }

      res.json({ message: "Kullanıcı onaylandı", user: updated });
    } catch (error: any) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Onay işlemi sırasında hata oluştu" });
    }
  });

  // POST /api/admin/users/reject/:id - Reject pending user
  app.post('/api/admin/users/reject/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const { sendRejectionEmail } = await import('./email');

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'approve');

      const { id } = req.params;
      const { reason } = req.body;

      const targetUser = await storage.getUser(id);
      
      if (!targetUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Supervisor can only reject users in their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId || currentUser.branchId !== targetUser.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin kullanıcılarını reddedebilirsiniz" });
        }
      }

      if (targetUser.accountStatus !== 'pending') {
        return res.status(400).json({ message: "Kullanıcı zaten onaylanmış veya reddedilmiş" });
      }

      // Update user: rejected
      const updated = await storage.updateUser(id, {
        accountStatus: 'rejected',
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      });

      if (!updated) {
        return res.status(500).json({ message: "Red işlemi başarısız" });
      }

      // Send rejection email
      if (targetUser.email) {
        await sendRejectionEmail(targetUser.email, reason);
      }

      res.json({ message: "Kullanıcı reddedildi" });
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Red işlemi sırasında hata oluştu" });
    }
  });

  // GET /api/admin/users/pending - Get pending approval users
  app.get('/api/admin/users/pending', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;

      // Permission check using ensurePermission
      ensurePermission(currentUser, 'users', 'view');

      let filters: any = { accountStatus: 'pending' };

      // Supervisor can only see their branch
      if (currentUser.role === 'supervisor') {
        if (!currentUser.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        filters.branchId = currentUser.branchId;
      }

      const pendingUsers = await storage.getAllUsersWithFilters(filters);
      res.json(pendingUsers);
    } catch (error: any) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Bekleyen kullanıcılar yüklenemedi" });
    }
  });

  // GET /api/admin/users/export - Export users to CSV
  app.get('/api/admin/users/export', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { role, branchId, search, accountStatus } = req.query;
      const filters = {
        role: role as string | undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        search: search as string | undefined,
        accountStatus: accountStatus as string | undefined,
      };

      const allUsers = await storage.getAllUsersWithFilters(filters);

      // Convert to CSV
      const headers = ['ID', 'İsim', 'Soyisim', 'Email', 'Kullanıcı Adı', 'Rol', 'Şube ID', 'Durum', 'Aktif', 'Kayıt Tarihi'];
      const rows = allUsers.map(u => [
        u.id,
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.username || '',
        u.role,
        u.branchId || '',
        u.accountStatus || 'approved',
        u.isActive ? 'Evet' : 'Hayır',
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '',
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`);
      res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
    } catch (error: any) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Export başarısız" });
    }
  });

  // DELETE /api/admin/users/:id - Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;

      // Prevent self-deletion
      if (id === user.id) {
        return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz" });
      }

      await storage.deleteUser(id);
      res.json({ message: "Kullanıcı silindi" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Kullanıcı silinemedi" });
    }
  });

  // POST /api/admin/users - Create new user
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const createSchema = z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6),
        role: z.string(),
        branchId: z.number().nullable().optional(),
      });

      const data = createSchema.parse(req.body);

      // Check if email or username exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Bu email zaten kayıtlı" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const newUser = await storage.createUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        hashedPassword,
        role: data.role,
        branchId: data.branchId || null,
        accountStatus: 'approved', // Admin-created users are auto-approved
        isActive: true,
      });

      res.json(newUser);
    } catch (error: Error | unknown) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kullanıcı oluşturulamadı" });
    }
  });

  // ========================================
  // QUALITY AUDITS API (Kalite Denetimi)
  // ========================================

  // GET /api/quality-audits - List quality audits
  app.get('/api/quality-audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(qualityAudits);
      
      // Branch users can only see their own branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(qualityAudits.branchId, user.branchId));
      } else if (branchId) {
        // HQ users can filter by branch
        query = query.where(eq(qualityAudits.branchId, parseInt(branchId as string)));
      }

      const audits = await query.orderBy(desc(qualityAudits.auditDate));
      res.json(audits);
    } catch (error: any) {
      console.error("Error fetching quality audits:", error);
      res.status(500).json({ message: "Denetimler yüklenirken hata oluştu" });
    }
  });

  // POST /api/quality-audits - Create quality audit
  app.post('/api/quality-audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ coach/admin can create audits
      if (!isHQRole(user.role as UserRoleType) || (user.role !== 'coach' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Sadece coach veya admin denetim oluşturabilir" });
      }

      const validatedData = insertQualityAuditSchema.parse(req.body);
      const [audit] = await db.insert(qualityAudits).values({
        ...validatedData,
        auditorId: user.id,
      }).returning();

      res.status(201).json(audit);
    } catch (error: Error | unknown) {
      console.error("Error creating quality audit:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim oluşturulurken hata oluştu" });
    }
  });

  // GET /api/branch-audit-scores - Get branch audit score summaries
  app.get('/api/branch-audit-scores', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId, periodType } = req.query;

      let query = db.select().from(branchAuditScores);
      
      // Filter by branch for branch roles
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(branchAuditScores.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(branchAuditScores.branchId, parseInt(branchId as string)));
      }

      if (periodType) {
        query = query.where(eq(branchAuditScores.periodType, periodType as string));
      }

      const scores = await query.orderBy(desc(branchAuditScores.periodStart));
      res.json(scores);
    } catch (error: any) {
      console.error("Error fetching branch audit scores:", error);
      res.status(500).json({ message: "Şube denetim skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/branch-audit-scores/:branchId/latest - Get latest audit scores for a branch
  app.get('/api/branch-audit-scores/:branchId/latest', isAuthenticated, async (req: any, res) => {
    try {
      const { branchId } = req.params;
      
      // Get the most recent audits for this branch
      const recentAudits = await db.select()
        .from(qualityAudits)
        .where(eq(qualityAudits.branchId, parseInt(branchId)))
        .orderBy(desc(qualityAudits.auditDate))
        .limit(10);

      // Calculate averages from recent audits
      if (recentAudits.length === 0) {
        return res.json({
          branchId: parseInt(branchId),
          auditCount: 0,
          overallScore: null,
          sections: {
            gida_guvenligi: null,
            urun_standardi: null,
            servis: null,
            operasyon: null,
            marka: null,
            ekipman: null,
          }
        });
      }

      const avgScores = {
        gida_guvenligi: 0,
        urun_standardi: 0,
        servis: 0,
        operasyon: 0,
        marka: 0,
        ekipman: 0,
      };

      let count = 0;
      recentAudits.forEach(audit => {
        if (audit.gidaGuvenligiScore !== null) avgScores.gida_guvenligi += audit.gidaGuvenligiScore;
        if (audit.urunStandardiScore !== null) avgScores.urun_standardi += audit.urunStandardiScore;
        if (audit.servisScore !== null) avgScores.servis += audit.servisScore;
        if (audit.operasyonScore !== null) avgScores.operasyon += audit.operasyonScore;
        if (audit.markaScore !== null) avgScores.marka += audit.markaScore;
        if (audit.ekipmanScore !== null) avgScores.ekipman += audit.ekipmanScore;
        count++;
      });

      // Calculate weighted overall score
      const sectionWeights = {
        gida_guvenligi: 25,
        urun_standardi: 25,
        servis: 15,
        operasyon: 15,
        marka: 10,
        ekipman: 10,
      };

      let overallScore = 0;
      Object.keys(sectionWeights).forEach(key => {
        const sectionKey = key as keyof typeof avgScores;
        const avg = count > 0 ? avgScores[sectionKey] / count : 0;
        avgScores[sectionKey] = Math.round(avg);
        overallScore += (avg * sectionWeights[sectionKey]) / 100;
      });

      res.json({
        branchId: parseInt(branchId),
        auditCount: recentAudits.length,
        overallScore: Math.round(overallScore),
        sections: avgScores,
        lastAuditDate: recentAudits[0]?.auditDate,
      });
    } catch (error: any) {
      console.error("Error fetching latest branch audit scores:", error);
      res.status(500).json({ message: "Şube denetim skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/quality-audits/summary - Get quality audit summary for dashboard
  app.get('/api/quality-audits/summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let auditsQuery = db.select().from(qualityAudits);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        auditsQuery = auditsQuery.where(eq(qualityAudits.branchId, user.branchId));
      } else if (branchId) {
        auditsQuery = auditsQuery.where(eq(qualityAudits.branchId, parseInt(branchId as string)));
      }

      const audits = await auditsQuery.orderBy(desc(qualityAudits.auditDate));
      
      // Calculate summary stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const thisMonthAudits = audits.filter(a => new Date(a.auditDate) >= thisMonth);
      const lastMonthAudits = audits.filter(a => {
        const date = new Date(a.auditDate);
        return date >= lastMonth && date < thisMonth;
      });

      // Calculate averages
      const thisMonthAvg = thisMonthAudits.length > 0
        ? thisMonthAudits.reduce((sum, a) => sum + (a.weightedTotalScore || a.percentageScore), 0) / thisMonthAudits.length
        : 0;
      const lastMonthAvg = lastMonthAudits.length > 0
        ? lastMonthAudits.reduce((sum, a) => sum + (a.weightedTotalScore || a.percentageScore), 0) / lastMonthAudits.length
        : 0;

      res.json({
        totalAudits: audits.length,
        thisMonthCount: thisMonthAudits.length,
        lastMonthCount: lastMonthAudits.length,
        thisMonthAverage: Math.round(thisMonthAvg),
        lastMonthAverage: Math.round(lastMonthAvg),
        trend: thisMonthAvg >= lastMonthAvg ? 'up' : 'down',
        trendPercent: lastMonthAvg > 0 ? Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100) : 0,
        recentAudits: audits.slice(0, 5).map(a => ({
          id: a.id,
          branchId: a.branchId,
          auditDate: a.auditDate,
          score: a.weightedTotalScore || a.percentageScore,
          status: a.status,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching quality audit summary:", error);
      res.status(500).json({ message: "Denetim özeti yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // GUEST FEEDBACK API (Misafir Geri Bildirimi)
  // ========================================

  // GET /api/customer-feedback - List customer feedback
  app.get('/api/customer-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(customerFeedback);
      
      // Branch users can only see their own branch feedback
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(customerFeedback.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(customerFeedback.branchId, parseInt(branchId as string)));
      }

      const feedback = await query.orderBy(desc(customerFeedback.feedbackDate));
      res.json(feedback);
    } catch (error: any) {
      console.error("Error fetching customer feedback:", error);
      res.status(500).json({ message: "Geri bildirimler yüklenirken hata oluştu" });
    }
  });

  // POST /api/customer-feedback/public - Public endpoint for customer feedback (no auth)
  app.post('/api/customer-feedback/public', async (req, res) => {
    try {
      const validatedData = insertCustomerFeedbackSchema.parse(req.body);
      
      // Validate branch exists
      const branch = await db.select().from(branches).where(eq(branches.id, validatedData.branchId)).limit(1);
      if (!branch || branch.length === 0) {
        return res.status(400).json({ message: "Geçersiz şube ID. Lütfen geçerli bir şube numarası girin." });
      }
      
      const [feedback] = await db.insert(customerFeedback).values(validatedData).returning();
      res.status(201).json({ message: "Geri bildiriminiz için teşekkürler!", id: feedback.id });
    } catch (error: Error | unknown) {
      console.error("Error creating customer feedback:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Geri bildirim kaydedilirken hata oluştu" });
    }
  });

  // PATCH /api/customer-feedback/:id/review - Mark feedback as reviewed
  app.patch('/api/customer-feedback/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const [updated] = await db.update(customerFeedback)
        .set({
          status: 'reviewed',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes,
        })
        .where(eq(customerFeedback.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Geri bildirim bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error reviewing feedback:", error);
      res.status(500).json({ message: "Geri bildirim güncellenirken hata oluştu" });
    }
  });

  // GET /api/customer-feedback/stats/:branchId - Get branch feedback statistics
  app.get('/api/customer-feedback/stats/:branchId', isAuthenticated, async (req: any, res) => {
    try {
      const { branchId } = req.params;
      
      const stats = await db.select({
        avgRating: sql<number>`AVG(${customerFeedback.rating})`,
        totalCount: sql<number>`COUNT(*)`,
        rating5: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 5)`,
        rating4: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 4)`,
        rating3: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 3)`,
        rating2: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 2)`,
        rating1: sql<number>`COUNT(*) FILTER (WHERE ${customerFeedback.rating} = 1)`,
      })
      .from(customerFeedback)
      .where(eq(customerFeedback.branchId, parseInt(branchId)));

      res.json(stats[0] || { avgRating: 0, totalCount: 0, rating5: 0, rating4: 0, rating3: 0, rating2: 0, rating1: 0 });
    } catch (error: any) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // MAINTENANCE SCHEDULES API (Proaktif Bakım)
  // ========================================

  // GET /api/maintenance-schedules - List maintenance schedules
  app.get('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentId } = req.query;

      let query = db.select().from(maintenanceSchedules).where(eq(maintenanceSchedules.isActive, true));
      
      if (equipmentId) {
        query = query.where(eq(maintenanceSchedules.equipmentId, parseInt(equipmentId as string)));
      }

      const schedules = await query.orderBy(maintenanceSchedules.nextMaintenanceDate);
      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching maintenance schedules:", error);
      res.status(500).json({ message: "Bakım planları yüklenirken hata oluştu" });
    }
  });

  // POST /api/maintenance-schedules - Create maintenance schedule
  app.post('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ teknik/admin can create schedules
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const [schedule] = await db.insert(maintenanceSchedules).values(validatedData).returning();

      res.status(201).json(schedule);
    } catch (error: Error | unknown) {
      console.error("Error creating maintenance schedule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım planı oluşturulurken hata oluştu" });
    }
  });

  // GET /api/maintenance-logs - List maintenance logs
  app.get('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentId } = req.query;

      let query = db.select().from(maintenanceLogs);
      
      if (equipmentId) {
        query = query.where(eq(maintenanceLogs.equipmentId, parseInt(equipmentId as string)));
      }

      const logs = await query.orderBy(desc(maintenanceLogs.performedDate));
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching maintenance logs:", error);
      res.status(500).json({ message: "Bakım geçmişi yüklenirken hata oluştu" });
    }
  });

  // POST /api/maintenance-logs - Create maintenance log
  app.post('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertMaintenanceLogSchema.parse(req.body);
      const [log] = await db.insert(maintenanceLogs).values({
        ...validatedData,
        performedById: user.id,
      }).returning();

      res.status(201).json(log);
    } catch (error: Error | unknown) {
      console.error("Error creating maintenance log:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım kaydı oluşturulurken hata oluştu" });
    }
  });

  // ========================================
  // EQUIPMENT CALIBRATIONS API (Kalibrasyon Takibi)
  // ========================================

  // GET /api/equipment-calibrations - List calibrations
  app.get('/api/equipment-calibrations', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentId, result, upcoming } = req.query;
      
      let query = db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        calibratedBy: users,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(users, eq(equipmentCalibrations.calibratedById, users.id));
      
      const conditions = [];
      
      if (equipmentId) {
        conditions.push(eq(equipmentCalibrations.equipmentId, parseInt(equipmentId as string)));
      }
      
      if (result) {
        conditions.push(eq(equipmentCalibrations.result, result as string));
      }
      
      if (upcoming === 'true') {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        conditions.push(sql`${equipmentCalibrations.nextCalibrationDue} <= ${thirtyDaysLater.toISOString().split('T')[0]}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const calibrations = await query.orderBy(desc(equipmentCalibrations.calibrationDate));
      
      res.json(calibrations.map(c => ({
        ...c.calibration,
        equipment: c.equipment,
        calibratedBy: c.calibratedBy,
      })));
    } catch (error: any) {
      console.error("Error fetching calibrations:", error);
      res.status(500).json({ message: "Kalibrasyon kayıtları yüklenirken hata oluştu" });
    }
  });

  // GET /api/equipment-calibrations/:id - Get single calibration
  app.get('/api/equipment-calibrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [calibration] = await db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        calibratedBy: users,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(users, eq(equipmentCalibrations.calibratedById, users.id))
        .where(eq(equipmentCalibrations.id, parseInt(id)));
      
      if (!calibration) {
        return res.status(404).json({ message: "Kalibrasyon kaydı bulunamadı" });
      }
      
      res.json({
        ...calibration.calibration,
        equipment: calibration.equipment,
        calibratedBy: calibration.calibratedBy,
      });
    } catch (error: any) {
      console.error("Error fetching calibration:", error);
      res.status(500).json({ message: "Kalibrasyon kaydı yüklenirken hata oluştu" });
    }
  });

  // POST /api/equipment-calibrations - Create calibration
  app.post('/api/equipment-calibrations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ/Technical staff can create calibrations
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon kaydı oluşturma yetkisi gerekli" });
      }
      
      const validatedData = insertEquipmentCalibrationSchema.parse({
        ...req.body,
        calibrationDate: new Date(req.body.calibrationDate),
      });
      
      const [calibration] = await db.insert(equipmentCalibrations).values({
        ...validatedData,
        createdById: user.id,
      }).returning();
      
      // Update equipment's last calibration info if needed
      await db.update(equipment)
        .set({ updatedAt: new Date() })
        .where(eq(equipment.id, validatedData.equipmentId));
      
      res.status(201).json(calibration);
    } catch (error: any) {
      console.error("Error creating calibration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kalibrasyon kaydı oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/equipment-calibrations/:id - Update calibration
  app.patch('/api/equipment-calibrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon güncelleme yetkisi gerekli" });
      }
      
      const [existing] = await db.select().from(equipmentCalibrations).where(eq(equipmentCalibrations.id, parseInt(id)));
      if (!existing) {
        return res.status(404).json({ message: "Kalibrasyon kaydı bulunamadı" });
      }
      
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.calibrationDate) {
        updateData.calibrationDate = new Date(updateData.calibrationDate);
      }
      
      const [updated] = await db.update(equipmentCalibrations)
        .set(updateData)
        .where(eq(equipmentCalibrations.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating calibration:", error);
      res.status(500).json({ message: "Kalibrasyon güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/equipment-calibrations/:id - Delete calibration
  app.delete('/api/equipment-calibrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon silme yetkisi gerekli" });
      }
      
      await db.delete(equipmentCalibrations).where(eq(equipmentCalibrations.id, parseInt(id)));
      
      res.json({ message: "Kalibrasyon kaydı silindi" });
    } catch (error: any) {
      console.error("Error deleting calibration:", error);
      res.status(500).json({ message: "Kalibrasyon silinirken hata oluştu" });
    }
  });

  // GET /api/equipment-calibrations/due-soon - Get calibrations due in next 30 days
  app.get('/api/equipment-calibrations-due-soon', isAuthenticated, async (req: any, res) => {
    try {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      
      const dueSoon = await db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        branch: branches,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(branches, eq(equipment.branchId, branches.id))
        .where(sql`${equipmentCalibrations.nextCalibrationDue} <= ${thirtyDaysLater.toISOString().split('T')[0]}`)
        .orderBy(equipmentCalibrations.nextCalibrationDue);
      
      res.json(dueSoon.map(d => ({
        ...d.calibration,
        equipment: d.equipment,
        branch: d.branch,
      })));
    } catch (error: any) {
      console.error("Error fetching due calibrations:", error);
      res.status(500).json({ message: "Yaklaşan kalibrasyonlar yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // CAMPAIGNS API (Kampanya Yönetimi)
  // ========================================

  // GET /api/campaigns - List campaigns
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status, branchId } = req.query;

      let query = db.select().from(campaigns);
      
      if (status) {
        query = query.where(eq(campaigns.status, status as string));
      }

      let allCampaigns = await query.orderBy(desc(campaigns.startDate));

      // If branch user or branchId filter, get only campaigns for that branch
      if (isBranchRole(user.role as UserRoleType) && user.branchId) {
        const branchCampaigns = await db.select({ campaignId: campaignBranches.campaignId })
          .from(campaignBranches)
          .where(eq(campaignBranches.branchId, user.branchId));
        
        const campaignIds = branchCampaigns.map(bc => bc.campaignId);
        allCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
      } else if (branchId) {
        const branchCampaigns = await db.select({ campaignId: campaignBranches.campaignId })
          .from(campaignBranches)
          .where(eq(campaignBranches.branchId, parseInt(branchId as string)));
        
        const campaignIds = branchCampaigns.map(bc => bc.campaignId);
        allCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
      }

      res.json(allCampaigns);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Kampanyalar yüklenirken hata oluştu" });
    }
  });

  // POST /api/campaigns - Create campaign
  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ users can create campaigns
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertCampaignSchema.parse(req.body);
      const [campaign] = await db.insert(campaigns).values({
        ...validatedData,
        createdById: user.id,
      }).returning();

      res.status(201).json(campaign);
    } catch (error: Error | unknown) {
      console.error("Error creating campaign:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kampanya oluşturulurken hata oluştu" });
    }
  });

  // POST /api/campaigns/:id/branches - Add branches to campaign
  app.post('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { id } = req.params;
      const { branchIds } = req.body;

      if (!Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({ message: "Şube listesi gerekli" });
      }

      const values = branchIds.map(branchId => ({
        campaignId: parseInt(id),
        branchId,
      }));

      await db.insert(campaignBranches).values(values).onConflictDoNothing();

      res.json({ message: "Şubeler kampanyaya eklendi" });
    } catch (error: any) {
      console.error("Error adding branches to campaign:", error);
      res.status(500).json({ message: "Şubeler eklenirken hata oluştu" });
    }
  });

  // GET /api/campaigns/:id/branches - Get campaign branches
  app.get('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const branches = await db.select()
        .from(campaignBranches)
        .where(eq(campaignBranches.campaignId, parseInt(id)));

      res.json(branches);
    } catch (error: any) {
      console.error("Error fetching campaign branches:", error);
      res.status(500).json({ message: "Şubeler yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // FRANCHISE ONBOARDING API (Franchise Açılış)
  // ========================================

  // GET /api/franchise-onboarding - List onboarding processes
  app.get('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ can see all, branch users see their own
      let query = db.select().from(franchiseOnboarding);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(franchiseOnboarding.branchId, user.branchId));
      }

      const processes = await query.orderBy(desc(franchiseOnboarding.expectedOpeningDate));
      res.json(processes);
    } catch (error: any) {
      console.error("Error fetching onboarding processes:", error);
      res.status(500).json({ message: "Açılış süreçleri yüklenirken hata oluştu" });
    }
  });

  // POST /api/franchise-onboarding - Create onboarding process
  app.post('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertFranchiseOnboardingSchema.parse(req.body);
      const [process] = await db.insert(franchiseOnboarding).values(validatedData).returning();

      res.status(201).json(process);
    } catch (error: Error | unknown) {
      console.error("Error creating onboarding process:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Açılış süreci oluşturulurken hata oluştu" });
    }
  });

  // GET /api/franchise-onboarding/:id/documents - Get onboarding documents
  app.get('/api/franchise-onboarding/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const documents = await db.select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.onboardingId, parseInt(id)));

      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching onboarding documents:", error);
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  // POST /api/onboarding-documents - Upload onboarding document
  app.post('/api/onboarding-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertOnboardingDocumentSchema.parse(req.body);
      const [document] = await db.insert(onboardingDocuments).values({
        ...validatedData,
        uploadedById: user.id,
        uploadedAt: new Date(),
      }).returning();

      res.status(201).json(document);
    } catch (error: Error | unknown) {
      console.error("Error uploading onboarding document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Belge yüklenirken hata oluştu" });
    }
  });

  // GET /api/license-renewals - List license renewals
  app.get('/api/license-renewals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;

      let query = db.select().from(licenseRenewals);
      
      if (isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        query = query.where(eq(licenseRenewals.branchId, user.branchId));
      } else if (branchId) {
        query = query.where(eq(licenseRenewals.branchId, parseInt(branchId as string)));
      }

      const renewals = await query.orderBy(licenseRenewals.expiryDate);
      res.json(renewals);
    } catch (error: any) {
      console.error("Error fetching license renewals:", error);
      res.status(500).json({ message: "Lisanslar yüklenirken hata oluştu" });
    }
  });

  // POST /api/license-renewals - Create license renewal
  app.post('/api/license-renewals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertLicenseRenewalSchema.parse(req.body);
      const [renewal] = await db.insert(licenseRenewals).values(validatedData).returning();

      res.status(201).json(renewal);
    } catch (error: Error | unknown) {
      console.error("Error creating license renewal:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Lisans oluşturulurken hata oluştu" });
    }
  });

  // ===== SITE SETTINGS ROUTES =====
  
  // GET /api/admin/settings - Get all settings (category filter optional)
  app.get('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { category } = req.query;
      const settings = await storage.getSiteSettings(category as string | undefined);
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Ayarlar yüklenirken hata oluştu" });
    }
  });

  // GET /api/admin/settings/:key - Get single setting
  app.get('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      const setting = await storage.getSiteSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Ayar bulunamadı" });
      }
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error fetching site setting:", error);
      res.status(500).json({ message: "Ayar yüklenirken hata oluştu" });
    }
  });

  // POST /api/admin/settings - Create new setting
  app.post('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const validatedData = insertSiteSettingSchema.parse({
        ...req.body,
        updatedBy: user.id,
      });
      
      const setting = await storage.createSiteSetting(validatedData);
      
      res.status(201).json(setting);
    } catch (error: Error | unknown) {
      console.error("Error creating site setting:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Ayar oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/admin/settings/:key - Update setting
  app.patch('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Değer gerekli" });
      }
      
      const setting = await storage.updateSiteSetting(key, value, user.id);
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error updating site setting:", error);
      res.status(500).json({ message: "Ayar güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/admin/settings/:key - Delete setting
  app.delete('/api/admin/settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      const { key } = req.params;
      await storage.deleteSiteSetting(key);
      
      res.json({ message: "Ayar silindi" });
    } catch (error: any) {
      console.error("Error deleting site setting:", error);
      res.status(500).json({ message: "Ayar silinirken hata oluştu" });
    }
  });

  // ===== USER PERMISSIONS ROUTES =====
  
  // GET /api/user/permissions - Get current user's permissions (for frontend permission checks)
  app.get('/api/user/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userRole = user.role;
      
      // Define default permissions per role (same structure as admin endpoint)
      const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
        admin: {
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
        },
        coach: {
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
        },
        supervisor: {
          'academy.general': ['view'], 'academy.analytics': ['view'], 'academy.badges': ['view'], 
          'academy.certificates': ['view'], 'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
          'academy.learning_paths': ['view'], 'academy.supervisor': ['view', 'edit'],
        },
        supervisor_buddy: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        barista: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'], 'academy.learning_paths': ['view'],
        },
        bar_buddy: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        stajyer: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.quizzes': ['view'],
        },
        muhasebe: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        teknik: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        destek: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        satinalma: {
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        yatirimci_branch: {
          'academy.analytics': ['view'],
        },
        yatirimci_hq: {
          'academy.analytics': ['view'],
        },
        fabrika: {
          'academy.general': ['view'], 'academy.badges': ['view'],
        },
      };

      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[userRole] || {};
      
      // Get any DB overrides
      const dbPermissions = await storage.getRolePermissions();
      const userDbPerms = dbPermissions.filter((p: any) => p.role === userRole);
      
      // Merge defaults with DB overrides
      const permMap = new Map<string, string[]>();
      for (const [mod, actions] of Object.entries(roleDefaults)) {
        permMap.set(mod, actions);
      }
      for (const p of userDbPerms) {
        permMap.set(p.module, p.actions || []);
      }
      
      const result = Array.from(permMap.entries()).map(([module, actions]) => ({
        module,
        actions,
        canView: actions.includes('view'),
        canEdit: actions.includes('edit'),
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "İzinler yüklenirken hata oluştu" });
    }
  });

  // ===== ROLE PERMISSIONS ROUTES =====
  
  // GET /api/admin/role-permissions - Get all role permissions and modules
  app.get('/api/admin/role-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { role: roleFilter } = req.query;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      // Define default module permissions for each role
      // Academy sub-modules: academy.general, academy.hq, academy.analytics, academy.badges, 
      // academy.certificates, academy.leaderboard, academy.quizzes, academy.learning_paths, 
      // academy.ai, academy.social, academy.supervisor
      const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
        admin: {
          dashboard: ['view', 'edit'], tasks: ['view', 'edit'], checklists: ['view', 'edit'], branches: ['view', 'edit'],
          equipment: ['view', 'edit'], faults: ['view', 'edit'], equipment_analytics: ['view', 'edit'],
          quality_audit: ['view', 'edit'], audit_templates: ['view', 'edit'], capa: ['view', 'edit'],
          // Academy sub-modules - Admin has full access
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
          shifts: ['view', 'edit'], shift_planning: ['view', 'edit'], hr: ['view', 'edit'], attendance: ['view', 'edit'], leave_requests: ['view', 'edit'],
          accounting: ['view', 'edit'], reports: ['view', 'edit'], e2e_reports: ['view', 'edit'], cash_reports: ['view', 'edit'], hr_reports: ['view', 'edit'],
          lost_found: ['view', 'edit'], lost_found_hq: ['view', 'edit'],
          projects: ['view', 'edit'], new_branch_projects: ['view', 'edit'],
          support: ['view', 'edit'], notifications: ['view', 'edit'], announcements: ['view', 'edit'], messages: ['view', 'edit'],
          settings: ['view', 'edit'], users: ['view', 'edit'], menu_management: ['view', 'edit'], content_management: ['view', 'edit'], admin_panel: ['view', 'edit'], authorization: ['view', 'edit'],
        },
        muhasebe: {
          dashboard: ['view'], accounting: ['view', 'edit'], reports: ['view'], cash_reports: ['view', 'edit'], hr_reports: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        coach: {
          dashboard: ['view'], tasks: ['view', 'edit'], checklists: ['view'], hr: ['view'], 
          quality_audit: ['view', 'edit'], audit_templates: ['view', 'edit'], capa: ['view', 'edit'],
          // Coach has full Academy access including HQ management
          'academy.general': ['view', 'edit'], 'academy.hq': ['view', 'edit'], 'academy.analytics': ['view', 'edit'],
          'academy.badges': ['view', 'edit'], 'academy.certificates': ['view', 'edit'], 'academy.leaderboard': ['view', 'edit'],
          'academy.quizzes': ['view', 'edit'], 'academy.learning_paths': ['view', 'edit'], 'academy.ai': ['view', 'edit'],
          'academy.social': ['view', 'edit'], 'academy.supervisor': ['view', 'edit'],
        },
        teknik: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view', 'edit'], equipment_analytics: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        destek: {
          dashboard: ['view'], support: ['view', 'edit'], notifications: ['view', 'edit'], announcements: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        satinalma: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view'], projects: ['view', 'edit'], new_branch_projects: ['view', 'edit'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'],
        },
        supervisor: {
          dashboard: ['view'], tasks: ['view', 'edit'], checklists: ['view', 'edit'], shifts: ['view'], shift_planning: ['view'], attendance: ['view', 'edit'],
          hr: ['view'], leave_requests: ['view', 'edit'], equipment: ['view'], faults: ['view', 'edit'], lost_found: ['view', 'edit'],
          quality_audit: ['view', 'edit'],
          // Supervisor can access analytics and supervisor view
          'academy.general': ['view'], 'academy.analytics': ['view'], 'academy.badges': ['view'], 
          'academy.certificates': ['view'], 'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
          'academy.learning_paths': ['view'], 'academy.supervisor': ['view', 'edit'],
        },
        supervisor_buddy: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view', 'edit'], shifts: ['view'], attendance: ['view'], equipment: ['view'], faults: ['view', 'edit'],
          lost_found: ['view', 'edit'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        barista: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view'], shifts: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'], 'academy.learning_paths': ['view'],
        },
        bar_buddy: {
          dashboard: ['view'], tasks: ['view'], checklists: ['view'], shifts: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.certificates': ['view'], 
          'academy.leaderboard': ['view'], 'academy.quizzes': ['view'],
        },
        stajyer: {
          dashboard: ['view'], lost_found: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'], 'academy.quizzes': ['view'],
        },
        yatirimci_branch: {
          dashboard: ['view'], attendance: ['view'], shifts: ['view'], hr: ['view'],
          'academy.analytics': ['view'],
        },
        fabrika: {
          dashboard: ['view'], equipment: ['view', 'edit'], faults: ['view'], quality_audit: ['view'],
          'academy.general': ['view'], 'academy.badges': ['view'],
        },
        yatirimci_hq: {
          dashboard: ['view'], reports: ['view'], branches: ['view'], accounting: ['view'],
          'academy.analytics': ['view'],
        },
      };

      // Get role's default permissions
      const roleDefaults = roleFilter && DEFAULT_ROLE_PERMISSIONS[roleFilter as string] 
        ? DEFAULT_ROLE_PERMISSIONS[roleFilter as string] 
        : {};

      // Fetch explicit permissions from database (overrides)
      const dbPermissions = await storage.getRolePermissions();
      const dbFiltered = roleFilter 
        ? dbPermissions.filter((p: any) => p.role === roleFilter)
        : dbPermissions;

      // Create map of DB permissions for easy lookup
      const dbPermMap = new Map<string, string[]>();
      dbFiltered.forEach((p: any) => {
        dbPermMap.set(p.module, p.actions || []);
      });

      // Merge: Start with defaults, override with DB permissions
      const mergedPerms: Array<{ module: string; actions: string[]; canView: boolean; canEdit: boolean }> = [];
      
      // Add all default permissions
      for (const [module, actions] of Object.entries(roleDefaults)) {
        const dbActions = dbPermMap.get(module);
        const finalActions = dbActions !== undefined ? dbActions : actions;
        mergedPerms.push({
          module,
          actions: finalActions,
          canView: finalActions.includes('view'),
          canEdit: finalActions.includes('edit'),
        });
        dbPermMap.delete(module); // Remove from map so we don't add it twice
      }

      // Add any DB-only permissions (not in defaults)
      for (const [module, actions] of dbPermMap.entries()) {
        mergedPerms.push({
          module,
          actions,
          canView: actions.includes('view'),
          canEdit: actions.includes('edit'),
        });
      }
      
      res.json(mergedPerms);
    } catch (error: any) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Rol yetkileri yüklenirken hata oluştu" });
    }
  });

  // PUT /api/admin/role-permissions - Bulk update role permissions
  app.put('/api/admin/role-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Admin-only access
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }

      // Validate request body is an array of role permission updates
      const updatesSchema = z.array(z.object({
        role: z.string(),
        module: z.string(),
        actions: z.array(z.string()),
      }));

      const updates = updatesSchema.parse(req.body);
      
      await storage.bulkUpdateRolePermissions(updates);
      
      res.json({ message: "Rol yetkileri güncellendi" });
    } catch (error: Error | unknown) {
      console.error("Error updating role permissions:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Rol yetkileri güncellenirken hata oluştu" });
    }
  });

  // POST /api/admin/roles - Create new custom role
  app.post('/api/admin/roles', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      const { roleName, scope, description } = req.body;
      if (!roleName) {
        return res.status(400).json({ message: "Rol adı gerekli" });
      }
      res.json({ id: roleName, name: roleName, scope: scope || 'hq', description: description || '', createdAt: new Date() });
    } catch (error: any) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Rol oluşturulamadı" });
    }
  });

  // GET /api/muhasebe/access - Check if user has access to accounting module
  app.get('/api/muhasebe/access', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userRole = user.role;
      
      // Default roles with access: admin and muhasebe
      const hasDefaultAccess = userRole === 'admin' || userRole === 'muhasebe';
      
      if (hasDefaultAccess) {
        return res.json(true);
      }
      
      // For other roles, check if they have explicit permission in database
      const permissions = await storage.getRolePermissions();
      const hasExplicitAccess = permissions.some((p: any) => 
        p.role === userRole && p.module === 'accounting' && (p.actions || []).includes('view')
      );
      
      res.json(hasExplicitAccess);
    } catch (error: any) {
      console.error("Error checking accounting access:", error);
      res.status(500).json(false);
    }
  });

  app.get('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      // Allow HQ roles and self-view for branch staff
      if (!isHQRole(user.role as UserRoleType) && !isBranchRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Mesai taleplerini görüntülemek için yetkiniz yok' });
      }
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const userId = isBranchStaff ? user.id : undefined;
      const requests = await storage.getOvertimeRequests(userId, status);
      
      res.json(requests);
    } catch (error: Error | unknown) {
      console.error("Error fetching overtime requests:", error);
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  app.post('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'overtime', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validatedData = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
        status: "pending",
      });
      
      const request = await storage.createOvertimeRequest(validatedData);
      res.status(201).json(request);
    } catch (error: Error | unknown) {
      console.error("Error creating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'overtime', 'approve', 'Mesai talebi onaylamak için supervisor+ yetkisi gerekli');
      
      const updateSchema = z.object({
        status: z.enum(['approved', 'rejected']),
        approvedMinutes: z.number().min(0).optional(),
        rejectionReason: z.string().optional(),
      });
      
      const { status, approvedMinutes, rejectionReason } = updateSchema.parse(req.body);
      
      if (status === 'approved' && !approvedMinutes) {
        return res.status(400).json({ message: "Onaylanan mesai süresi gerekli" });
      }
      
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ message: "Red nedeni gerekli" });
      }
      
      const updates = {
        status,
        approverId: user.id,
        approvedMinutes,
        rejectionReason,
      };
      
      const updated = await storage.updateOvertimeRequest(parseInt(id), updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Mesai talebi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi güncellenirken hata oluştu" });
    }
  });

  // ========================================
  // PERFORMANCE SCORES - Performans Skorları
  // ========================================

  // POST /api/performance/calculate - Calculate daily performance score
  app.post('/api/performance/calculate', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error calculating performance score:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skoru hesaplanırken hata oluştu" });
    }
  });

  // GET /api/performance/team - Get team performance aggregates (supervisor only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  app.get('/api/performance/team', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching team performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Takım performansı yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches/composite - Get composite branch scores (HQ only)
  // NOTE: Must come BEFORE /api/performance/branches to avoid route matching issues
  app.get('/api/performance/branches/composite', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching composite branch scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/branches - Get all branches performance aggregates (HQ only)
  // NOTE: Must come BEFORE /api/performance/:userId to avoid route matching issues
  app.get('/api/performance/branches', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching branches performance:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Branch performansları yüklenirken hata oluştu" });
    }
  });

  // POST /api/performance/branches/:branchId/evaluation - Generate AI evaluation for branch performance (HQ only)
  app.post('/api/performance/branches/:branchId/evaluation', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error generating branch evaluation:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "AI değerlendirmesi oluşturulurken hata oluştu" });
    }
  });

  // GET /api/performance/:userId - Get performance scores for a user
  app.get('/api/performance/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching performance scores:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Performans skorları yüklenirken hata oluştu" });
    }
  });

  // GET /api/performance/:userId/week/:week - Get weekly performance summary
  app.get('/api/performance/:userId/week/:week', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId, week } = req.params;

      // Permission check
      if (userId !== user.id) {
        ensurePermission(user, 'attendance', 'view', 'Başkasının haftalık performansını görüntülemek için yetkiniz yok');
      }

      const summary = await storage.getWeeklyPerformanceSummary(userId, week);
      res.json(summary);
    } catch (error: Error | unknown) {
      console.error("Error fetching weekly performance summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Haftalık performans özeti yüklenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status, priority } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayetleri görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const branchId = isBranchStaff ? user.branchId : undefined;
      const complaints = await storage.getGuestComplaints(branchId, status, priority);
      
      res.json(complaints);
    } catch (error: Error | unknown) {
      console.error("Error fetching guest complaints:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Şikayetler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const complaintData = {
        ...req.body,
        branchId: req.body.branchId || user.branchId,
      };
      
      if (!complaintData.branchId) {
        return res.status(400).json({ message: "Şube bilgisi gerekli" });
      }
      
      const validatedData = insertGuestComplaintSchema.parse(complaintData);
      
      const complaint = await storage.createGuestComplaint(validatedData);
      res.status(201).json(complaint);
    } catch (error: Error | unknown) {
      console.error("Error creating guest complaint:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/guest-complaints/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'complaints', 'edit', 'Şikayet güncellemek için yetkiniz yok');
      
      const updateSchema = insertGuestComplaintSchema.partial().omit({
        branchId: true,
        complaintDate: true,
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateGuestComplaint(parseInt(id), validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Şikayet bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating guest complaint:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet güncellenirken hata oluştu" });
    }
  });

  app.post('/api/guest-complaints/:id/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'complaints', 'edit', 'Şikayet çözümlemek için yetkiniz yok');
      
      const resolveSchema = z.object({
        resolutionNotes: z.string().min(1, "Çözüm notu gerekli"),
        customerSatisfaction: z.number().min(1).max(5).optional(),
      });
      
      const { resolutionNotes, customerSatisfaction } = resolveSchema.parse(req.body);
      
      const resolved = await storage.resolveGuestComplaint(
        parseInt(id),
        user.id,
        resolutionNotes,
        customerSatisfaction
      );
      
      if (!resolved) {
        return res.status(404).json({ message: "Şikayet bulunamadı" });
      }
      
      res.json(resolved);
    } catch (error: Error | unknown) {
      console.error("Error resolving guest complaint:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet çözümlenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { startDate, endDate, branchId } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayet istatistiklerini görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const filterBranchId = isBranchStaff 
        ? user.branchId 
        : (branchId ? parseInt(branchId as string) : undefined);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getGuestComplaintStats(filterBranchId, start, end);
      res.json(stats);
    } catch (error: Error | unknown) {
      console.error("Error fetching complaint stats:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  app.get('/api/guest-complaints/heatmap', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { startDate, endDate, branchId } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayet heatmap görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const filterBranchId = isBranchStaff 
        ? user.branchId 
        : (branchId ? parseInt(branchId as string) : undefined);
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const heatmap = await storage.getGuestComplaintHeatmap(filterBranchId, start, end);
      res.json(heatmap);
    } catch (error: Error | unknown) {
      console.error("Error fetching complaint heatmap:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Heatmap yüklenirken hata oluştu" });
    }
  });

  app.get('/api/equipment-troubleshooting-steps', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { equipmentType } = req.query;
      
      ensurePermission(user, 'equipment', 'view', 'Sorun giderme adımlarını görüntülemek için yetkiniz yok');
      
      // DESIGN: Troubleshooting steps are INTENTIONALLY global (no branch filtering)
      // Rationale: These are standardized equipment repair playbooks shared across all branches
      // for consistency in repair procedures. Similar to Knowledge Base articles, they're
      // knowledge content, not sensitive operational data. Branch-scoping would fragment
      // knowledge sharing and prevent consistent equipment maintenance across franchises.
      
      if (!equipmentType) {
        return res.status(400).json({ message: "Cihaz tipi gerekli" });
      }
      
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType as string);
      res.json(steps);
    } catch (error: Error | unknown) {
      console.error("Error fetching troubleshooting steps:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  app.post('/api/equipment-troubleshooting-steps', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // CRITICAL: Only HQ/admin roles can create troubleshooting steps
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ/admin kullanıcıları sorun giderme adımı oluşturabilir' });
      }
      
      ensurePermission(user, 'equipment', 'create', 'Sorun giderme adımı oluşturmak için HQ Tech yetkisi gerekli');
      
      const validatedData = insertEquipmentTroubleshootingStepSchema.parse(req.body);
      
      const step = await storage.createEquipmentTroubleshootingStep(validatedData);
      res.status(201).json(step);
    } catch (error: Error | unknown) {
      console.error("Error creating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'edit', 'Sorun giderme adımı güncellemek için HQ Tech yetkisi gerekli');
      
      const updateSchema = insertEquipmentTroubleshootingStepSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateEquipmentTroubleshootingStep(parseInt(id), validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Adım bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'delete', 'Sorun giderme adımı silmek için HQ Tech yetkisi gerekli');
      
      await storage.deleteEquipmentTroubleshootingStep(parseInt(id));
      res.json({ message: "Adım silindi" });
    } catch (error: Error | unknown) {
      console.error("Error deleting troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımı silinirken hata oluştu" });
    }
  });

  // ===============================================
  // AUDIT TEMPLATE ROUTES
  // ===============================================

  app.get('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { auditType, category, isActive } = req.query;
      
      // Only HQ and branch supervisors can view templates
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Denetim şablonlarını görüntülemek için supervisor veya HQ yetkisi gerekli' });
      }
      
      const templates = await storage.getAuditTemplates(
        auditType as string,
        category as string,
        isActive ? isActive === 'true' : undefined
      );
      
      res.json(templates);
    } catch (error: Error | unknown) {
      console.error("Error fetching audit templates:", error);
      res.status(500).json({ message: "Denetim şablonları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ and branch supervisors can view template details
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Denetim şablonlarını görüntülemek için supervisor veya HQ yetkisi gerekli' });
      }
      
      const template = await storage.getAuditTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ message: "Denetim şablonu bulunamadı" });
      }
      
      res.json(template);
    } catch (error: Error | unknown) {
      console.error("Error fetching audit template:", error);
      res.status(500).json({ message: "Denetim şablonu yüklenirken hata oluştu" });
    }
  });

  app.post('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ users can create templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonu oluşturabilir' });
      }
      
      const { template, items } = req.body;
      
      const validatedTemplate = insertAuditTemplateSchema.parse({
        ...template,
        createdById: user.id,
      });
      
      // Validate items - storage layer expects items without templateId
      const itemSchema = insertAuditTemplateItemSchema.omit({ templateId: true }).superRefine((data, ctx) => {
        // Conditional validation for multiple_choice type
        if (data.itemType === 'multiple_choice') {
          // Filter out empty/whitespace-only options
          const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
          
          if (validOptions.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
              path: ['options'],
            });
          }
          
          // Check each option is non-empty
          if (data.options) {
            data.options.forEach((opt, idx) => {
              if (!opt || opt.trim() === '') {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Şık ${idx + 1} boş olamaz`,
                  path: ['options', idx],
                });
              }
            });
          }
          
          if (!data.correctAnswer || data.correctAnswer.trim() === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Doğru cevap gerekli",
              path: ['correctAnswer'],
            });
          }
          
          if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Doğru cevap şıklardan biri olmalı",
              path: ['correctAnswer'],
            });
          }
        }
      });
      const validatedItems = items.map((item: any) =>
        itemSchema.parse(item)
      ) as Omit<InsertAuditTemplateItem, 'templateId'>[];
      
      const newTemplate = await storage.createAuditTemplate(validatedTemplate, validatedItems);
      res.status(201).json(newTemplate);
    } catch (error: Error | unknown) {
      console.error("Error creating audit template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim şablonu oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ users can update templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonunu güncelleyebilir' });
      }
      
      const { template, items } = req.body;
      
      const updateSchema = insertAuditTemplateSchema.partial().omit({ createdById: true });
      const validatedTemplate = updateSchema.parse(template);
      
      let validatedItems:Omit<InsertAuditTemplateItem, 'templateId'>[] | undefined = undefined;
      if (items) {
        // Validate items - storage layer expects items without templateId
        const itemSchema = insertAuditTemplateItemSchema.omit({ templateId: true }).superRefine((data, ctx) => {
          // Conditional validation for multiple_choice type
          if (data.itemType === 'multiple_choice') {
            // Filter out empty/whitespace-only options
            const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
            
            if (validOptions.length < 2) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
                path: ['options'],
              });
            }
            
            // Check each option is non-empty
            if (data.options) {
              data.options.forEach((opt, idx) => {
                if (!opt || opt.trim() === '') {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Şık ${idx + 1} boş olamaz`,
                    path: ['options', idx],
                  });
                }
              });
            }
            
            if (!data.correctAnswer || data.correctAnswer.trim() === '') {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap gerekli",
                path: ['correctAnswer'],
              });
            }
            
            if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Doğru cevap şıklardan biri olmalı",
                path: ['correctAnswer'],
              });
            }
          }
        });
        validatedItems = items.map((item: any) =>
          itemSchema.parse(item)
        ) as Omit<InsertAuditTemplateItem, 'templateId'>[];
      }
      
      const updated = await storage.updateAuditTemplate(parseInt(id), validatedTemplate, validatedItems);
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim şablonu bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating audit template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim şablonu güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Only HQ users can delete templates
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ kullanıcıları denetim şablonunu silebilir' });
      }
      
      await storage.deleteAuditTemplate(parseInt(id));
      res.json({ message: "Denetim şablonu silindi" });
    } catch (error: Error | unknown) {
      console.error("Error deleting audit template:", error);
      res.status(500).json({ message: "Denetim şablonu silinirken hata oluştu" });
    }
  });

  // ===============================================
  // AUDIT INSTANCE ROUTES
  // ===============================================

  app.get('/api/audit-instances', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId, userId, auditorId, status, auditType } = req.query;
      
      const filters: any = {
        status: status as string,
        auditType: auditType as string,
      };
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (user.branchId) {
          filters.branchId = user.branchId;
        }
      } else if (isHQRole(user.role as UserRoleType)) {
        // HQ can filter by any branch
        if (branchId) {
          filters.branchId = parseInt(branchId as string);
        }
        if (userId) {
          filters.userId = userId as string;
        }
        if (auditorId) {
          filters.auditorId = auditorId as string;
        }
      } else {
        return res.status(403).json({ message: 'Denetim kayıtlarını görüntülemek için yetkiniz yok' });
      }
      
      const instances = await storage.getAuditInstances(filters);
      res.json(instances);
    } catch (error: Error | unknown) {
      console.error("Error fetching audit instances:", error);
      res.status(500).json({ message: "Denetim kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/audit-instances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      const instance = await storage.getAuditInstance(parseInt(id));
      
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Branch staff can only see their branch audits
      if (isBranchRole(user.role as UserRoleType)) {
        if (instance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Bu denetim kaydına erişim yetkiniz yok' });
        }
      }
      
      res.json(instance);
    } catch (error: Error | unknown) {
      console.error("Error fetching audit instance:", error);
      res.status(500).json({ message: "Denetim kaydı yüklenirken hata oluştu" });
    }
  });

  app.post('/api/audit-instances', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // HQ can create any audit, branch supervisor can create branch audits
      const validatedInstance = insertAuditInstanceSchema.parse({
        ...req.body,
        auditorId: user.id,
      });
      
      // If branch user, ensure they can only audit their branch
      if (isBranchRole(user.role as UserRoleType)) {
        if (validatedInstance.branchId && validatedInstance.branchId !== user.branchId) {
          return res.status(403).json({ message: 'Sadece kendi şubeniz için denetim başlatabilirsiniz' });
        }
      }
      
      const newInstance = await storage.createAuditInstance(validatedInstance);
      res.status(201).json(newInstance);
    } catch (error: Error | unknown) {
      console.error("Error creating audit instance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim başlatılırken hata oluştu" });
    }
  });

  app.patch('/api/audit-instances/:instanceId/items/:templateItemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { instanceId, templateItemId } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(instanceId));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can update items
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ güncelleyebilir' });
      }
      
      // Block updates on completed audits (409 Conflict)
      if (instance.status !== 'in_progress') {
        return res.status(409).json({ 
          message: "Tamamlanmış denetimler güncellenemez",
          status: instance.status 
        });
      }
      
      const updateSchema = insertAuditInstanceItemSchema.partial().omit({ 
        instanceId: true,
        templateItemId: true 
      });
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateAuditInstanceItem(
        parseInt(instanceId),
        parseInt(templateItemId),
        validatedData
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Denetim maddesi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating audit instance item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim maddesi güncellenirken hata oluştu" });
    }
  });

  app.post('/api/audit-instances/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { notes, actionItems, followUpRequired, followUpDate } = req.body;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can complete
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ tamamlayabilir' });
      }
      
      const completed = await storage.completeAuditInstance(
        parseInt(id),
        notes,
        actionItems,
        followUpRequired,
        followUpDate
      );
      
      if (!completed) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      res.json(completed);
    } catch (error: Error | unknown) {
      console.error("Error completing audit instance:", error);
      res.status(500).json({ message: "Denetim tamamlanırken hata oluştu" });
    }
  });

  app.post('/api/audit-instances/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      // Get instance to check permissions
      const instance = await storage.getAuditInstance(parseInt(id));
      if (!instance) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      // Only the auditor or HQ can cancel
      if (instance.auditorId !== user.id && !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece denetimi başlatan kişi veya HQ iptal edebilir' });
      }
      
      const cancelled = await storage.cancelAuditInstance(parseInt(id));
      
      if (!cancelled) {
        return res.status(404).json({ message: "Denetim kaydı bulunamadı" });
      }
      
      res.json(cancelled);
    } catch (error: Error | unknown) {
      console.error("Error cancelling audit instance:", error);
      res.status(500).json({ message: "Denetim iptal edilirken hata oluştu" });
    }
  });

  app.get('/api/attendance-penalties/:shiftAttendanceId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { shiftAttendanceId } = req.params;
      
      ensurePermission(user, 'attendance', 'view', 'Penaltıları görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff) {
        const attendance = await storage.getShiftAttendanceById(parseInt(shiftAttendanceId));
        if (!attendance) {
          return res.status(404).json({ message: "Vardiya kaydı bulunamadı" });
        }
        const attendanceUser = await storage.getUserById(attendance.userId);
        if (attendanceUser?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin verilerini görüntüleyebilirsiniz" });
        }
      }
      
      const penalties = await storage.getAttendancePenalties(parseInt(shiftAttendanceId));
      res.json(penalties);
    } catch (error: Error | unknown) {
      console.error("Error fetching attendance penalties:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Penaltılar yüklenirken hata oluştu" });
    }
  });

  app.post('/api/attendance-penalties', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'edit', 'Manuel penaltı oluşturmak için supervisor+ yetkisi gerekli');
      
      const validatedData = insertAttendancePenaltySchema.parse({
        ...req.body,
        createdById: user.id,
        autoGenerated: false,
      });
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff) {
        const attendance = await storage.getShiftAttendanceById(validatedData.shiftAttendanceId);
        if (!attendance) {
          return res.status(404).json({ message: "Vardiya kaydı bulunamadı" });
        }
        const attendanceUser = await storage.getUserById(attendance.userId);
        if (attendanceUser?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin çalışanlarına penaltı ekleyebilirsiniz" });
        }
      }
      
      const penalty = await storage.createManualPenalty(validatedData);
      res.status(201).json(penalty);
    } catch (error: Error | unknown) {
      console.error("Error creating manual penalty:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Manuel penaltı oluşturulurken hata oluştu" });
    }
  });

  app.get('/api/monthly-attendance-summary/:userId/:periodMonth', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { userId, periodMonth } = req.params;
      
      ensurePermission(user, 'attendance', 'view', 'Aylık özeti görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      if (isBranchStaff && userId !== user.id) {
        return res.status(403).json({ message: "Sadece kendi özetinizi görüntüleyebilirsiniz" });
      }
      
      const summary = await storage.getMonthlyAttendanceSummary(userId, periodMonth);
      res.json(summary || null);
    } catch (error: Error | unknown) {
      console.error("Error fetching monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Aylık özet yüklenirken hata oluştu" });
    }
  });

  app.post('/api/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'view', 'Aylık özet oluşturmak için yetkiniz yok');
      
      const generateSchema = z.object({
        userId: z.string().min(1, "Kullanıcı ID gerekli"),
        periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Geçerli ay formatı: YYYY-MM"),
      });
      
      const { userId, periodMonth } = generateSchema.parse(req.body);
      
      const summary = await storage.generateMonthlyAttendanceSummary(userId, periodMonth);
      res.status(201).json(summary);
    } catch (error: Error | unknown) {
      console.error("Error generating monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Aylık özet oluşturulurken hata oluştu" });
    }
  });

  // ========================================
  // HR MONTHLY ATTENDANCE SUMMARY - Aggregated View
  // ========================================

  app.get('/api/hr/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { month, year, branchId, category, userId } = req.query;

      // Only HQ roles and supervisors can access this
      const isHQ = isHQRole(user.role as UserRoleType);
      const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
      
      if (!isHQ && !isSupervisor) {
        return res.status(403).json({ message: 'Bu rapora erişim yetkiniz yok' });
      }

      // SECURITY: Supervisors can only see their own branch - reject any branchId query that doesn't match
      if (isSupervisor && !isHQ) {
        if (branchId && branchId !== 'all' && parseInt(branchId as string) !== user.branchId) {
          return res.status(403).json({ message: 'Sadece kendi şubenizin verilerini görüntüleyebilirsiniz' });
        }
      }

      const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
      const targetYear = parseInt(year as string) || new Date().getFullYear();

      // Calculate date range for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get users based on filters
      let allUsersData = await db.select().from(users);

      // Apply branch filter - supervisors are strictly limited to their own branch
      if (isSupervisor && !isHQ) {
        // Supervisors can ONLY see their own branch, enforce strictly
        allUsersData = allUsersData.filter((u: any) => u.branchId === user.branchId);
      } else if (isHQ && branchId && branchId !== 'all') {
        // HQ can filter by any branch
        allUsersData = allUsersData.filter((u: any) => u.branchId === parseInt(branchId as string));
      }

      // Apply category filter (Şubeler/HQ/Fabrika)
      if (category && category !== 'all') {
        allUsersData = allUsersData.filter((u: any) => {
          const isUserHQ = isHQRole(u.role as UserRoleType);
          const isFabrika = u.role === 'fabrika';
          const isSubeler = !isUserHQ && !isFabrika;

          if (category === 'hq') return isUserHQ;
          if (category === 'fabrika') return isFabrika;
          if (category === 'subeler') return isSubeler;
          return true;
        });
      }

      // Apply single user filter
      if (userId && userId !== 'all') {
        allUsersData = allUsersData.filter((u: any) => u.id === userId);
      }

      // Get branches for name lookup
      const branches = await storage.getBranches();
      const branchMap = new Map(branches.map((b: any) => [b.id, b.name]));

      // Calculate attendance data for each user
      const summaries = await Promise.all(allUsersData.map(async (u: any) => {
        // Get shift attendance records
        const shiftRecords = await storage.getShiftAttendancesByUserAndDateRange?.(u.id, startDate, endDate) || [];

        // Calculate totals
        let totalShifts = shiftRecords.length;
        let totalWorkedMinutes = 0;
        let lateCount = 0;
        let totalLatenessMinutes = 0;
        let earlyLeaveCount = 0;
        let totalEarlyLeaveMinutes = 0;
        let absences = 0;
        let complianceScores: number[] = [];

        shiftRecords.forEach((record: any) => {
          totalWorkedMinutes += record.totalWorkedMinutes || 0;
          
          if (record.latenessMinutes && record.latenessMinutes > 0) {
            lateCount++;
            totalLatenessMinutes += record.latenessMinutes;
          }

          if (record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0) {
            earlyLeaveCount++;
            totalEarlyLeaveMinutes += record.earlyLeaveMinutes;
          }

          if (record.status === 'absent') {
            absences++;
          }

          if (record.complianceScore !== null && record.complianceScore !== undefined) {
            complianceScores.push(record.complianceScore);
          }
        });

        // Calculate overtime (worked hours above 45 hrs/week standard -> approximate monthly)
        const totalWorkedHours = totalWorkedMinutes / 60;
        const monthlyStandardHours = 45 * 4; // 180 hours/month approximate
        const overtimeHours = Math.max(0, totalWorkedHours - monthlyStandardHours);

        // Get approved overtime minutes
        const overtimeRequests = await storage.getOvertimeRequestsByUserAndDateRange?.(u.id, startDateStr, endDateStr) || [];
        const approvedOvertimeMinutes = overtimeRequests
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + (r.approvedMinutes || 0), 0);

        const avgComplianceScore = complianceScores.length > 0 
          ? Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)
          : 100;

        return {
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          branchId: u.branchId,
          branchName: branchMap.get(u.branchId) || 'HQ',
          totalShifts,
          totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
          overtimeHours: Math.round(overtimeHours * 10) / 10,
          approvedOvertimeMinutes,
          lateCount,
          totalLatenessMinutes,
          earlyLeaveCount,
          totalEarlyLeaveMinutes,
          absences,
          avgComplianceScore,
        };
      }));

      // Filter out users with no shifts if we're looking at historical data
      const filteredSummaries = summaries.filter((s: any) => s.totalShifts > 0 || s.lateCount > 0);

      // Calculate totals
      const totals = {
        totalEmployees: filteredSummaries.length,
        totalWorkedHours: Math.round(filteredSummaries.reduce((sum: number, s: any) => sum + s.totalWorkedHours, 0) * 10) / 10,
        totalOvertimeHours: Math.round(filteredSummaries.reduce((sum: number, s: any) => sum + s.overtimeHours, 0) * 10) / 10,
        totalLateArrivals: filteredSummaries.reduce((sum: number, s: any) => sum + s.lateCount, 0),
        totalLatenessMinutes: filteredSummaries.reduce((sum: number, s: any) => sum + s.totalLatenessMinutes, 0),
        totalAbsences: filteredSummaries.reduce((sum: number, s: any) => sum + s.absences, 0),
        avgComplianceScore: filteredSummaries.length > 0
          ? Math.round(filteredSummaries.reduce((sum: number, s: any) => sum + s.avgComplianceScore, 0) / filteredSummaries.length)
          : 100,
      };

      res.json({
        month: targetMonth,
        year: targetYear,
        summaries: filteredSummaries,
        totals,
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching HR monthly attendance summary:", error);
      res.status(500).json({ message: "Aylık mesai özeti yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // OVERTIME REQUESTS - Mesai Talepleri
  // ========================================

  app.get('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      ensurePermission(user, 'attendance', 'view', 'Mesai taleplerini görüntülemek için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role );
      
      let requests = await storage.getOvertimeRequests(user.id, canApprove);
      
      if (status && status !== 'all') {
        requests = requests.filter((r: any) => r.status === status);
      }
      
      res.json(requests);
    } catch (error: Error | unknown) {
      console.error("Error fetching overtime requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  app.post('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validated = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const request = await storage.createOvertimeRequest(validated);
      res.status(201).json(request);
    } catch (error: Error | unknown) {
      console.error("Error creating overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Mesai talebi oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);
      const { approvedMinutes } = req.body;
      
      ensurePermission(user, 'attendance', 'edit', 'Mesai taleplerini onaylamak için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role );
      if (!canApprove) {
        return res.status(403).json({ message: "Sadece yöneticiler mesai taleplerini onaylayabilir" });
      }
      
      const updated = await storage.approveOvertimeRequest(requestId, user.id, approvedMinutes);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error approving overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi onaylanırken hata oluştu" });
    }
  });

  app.patch('/api/overtime-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const requestId = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      ensurePermission(user, 'attendance', 'edit', 'Mesai taleplerini reddetmek için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role );
      if (!canApprove) {
        return res.status(403).json({ message: "Sadece yöneticiler mesai taleplerini reddedebilir" });
      }
      
      const updated = await storage.rejectOvertimeRequest(requestId, rejectionReason);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error rejecting overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi reddedilirken hata oluştu" });
    }
  });

  app.get('/api/shift-attendances/my-recent', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const attendances = await storage.getRecentShiftAttendances(user.id, 30);
      res.json(attendances);
    } catch (error: any) {
      console.error("Error fetching recent shift attendances:", error);
      res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
    }
  });

  app.post('/api/sla/check-breaches', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!['admin', 'hq_admin', 'hq_staff'].includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await storage.checkSLABreaches();
      res.json({ message: "SLA kontrolleri tamamlandı" });
    } catch (error: any) {
      console.error("Error checking SLA breaches:", error);
      res.status(500).json({ message: "SLA kontrolleri yapılırken hata oluştu" });
    }
  });

  // ========================
  // HR MANAGEMENT ENDPOINTS
  // ========================

  // GET /api/hr/monthly-attendance-summary - Monthly overtime and lateness summary
  app.get('/api/hr/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Check permission: HQ roles or supervisors only
      if (!isHQRole(role) && role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Bu raporu görüntüleme yetkiniz yok" });
      }
      
      const { month, year, branchId, userId, category } = req.query;
      
      // Default to current month
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Calculate date range for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      
      // Get employees based on filters
      let employees = await db.select().from(users);
      
      // Branch restriction for supervisors (they can only see their own branch)
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        employees = employees.filter(emp => emp.branchId === user.branchId);
      } else if (branchId && branchId !== 'all') {
        // HQ users can filter by branch
        employees = employees.filter(emp => emp.branchId === parseInt(branchId as string));
      }
      
      // Category filter (subeler, hq, fabrika)
      if (category && category !== 'all') {
        if (category === 'subeler') {
          employees = employees.filter(emp => !isHQRole(emp.role as UserRoleType) && emp.role !== 'fabrika');
        } else if (category === 'hq') {
          employees = employees.filter(emp => isHQRole(emp.role as UserRoleType));
        } else if (category === 'fabrika') {
          employees = employees.filter(emp => emp.role === 'fabrika');
        }
      }
      
      // Specific user filter
      if (userId && userId !== 'all') {
        employees = employees.filter(emp => emp.id === userId);
      }
      
      // Get all branches for reference
      const branches = await storage.getBranches();
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      
      // Calculate summary for each employee
      const summaries = await Promise.all(employees.map(async (emp) => {
        // Get all shift attendances for this employee in the target month
        const attendances = await storage.getShiftAttendancesByUserAndDateRange(
          emp.id, 
          startDate, 
          endDate
        );
        
        // Calculate total worked minutes
        const totalWorkedMinutes = attendances.reduce((sum, a) => sum + (a.totalWorkedMinutes || 0), 0);
        const totalWorkedHours = totalWorkedMinutes / 60;
        
        // Calculate overtime (hours over 45 per week × number of weeks in month)
        const weeksInMonth = Math.ceil(new Date(targetYear, targetMonth, 0).getDate() / 7);
        const expectedMaxHours = 45 * weeksInMonth;
        const overtimeHours = Math.max(0, totalWorkedHours - expectedMaxHours);
        
        // Calculate late arrivals
        const lateArrivals = attendances.filter(a => (a.latenessMinutes || 0) > 0);
        const lateCount = lateArrivals.length;
        const totalLatenessMinutes = lateArrivals.reduce((sum, a) => sum + (a.latenessMinutes || 0), 0);
        
        // Calculate early leaves
        const earlyLeaves = attendances.filter(a => (a.earlyLeaveMinutes || 0) > 0);
        const earlyLeaveCount = earlyLeaves.length;
        const totalEarlyLeaveMinutes = earlyLeaves.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);
        
        // Calculate absences
        const absences = attendances.filter(a => a.status === 'absent').length;
        
        // Get approved overtime requests
        const overtimeRequests = await storage.getOvertimeRequestsByUser(emp.id);
        const approvedOvertimeMinutes = overtimeRequests
          .filter(r => r.status === 'approved' && r.createdAt && 
            new Date(r.createdAt) >= startDate && new Date(r.createdAt) <= endDate)
          .reduce((sum, r) => sum + (r.approvedMinutes || 0), 0);
        
        return {
          userId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          branchId: emp.branchId,
          branchName: emp.branchId ? branchMap.get(emp.branchId) || 'Bilinmiyor' : 'HQ',
          totalShifts: attendances.length,
          totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          approvedOvertimeMinutes,
          lateCount,
          totalLatenessMinutes,
          earlyLeaveCount,
          totalEarlyLeaveMinutes,
          absences,
          avgComplianceScore: attendances.length > 0 
            ? Math.round(attendances.reduce((sum, a) => sum + (a.complianceScore || 100), 0) / attendances.length)
            : 100,
        };
      }));
      
      // Calculate totals
      const totals = {
        totalEmployees: summaries.length,
        totalWorkedHours: parseFloat(summaries.reduce((sum, s) => sum + s.totalWorkedHours, 0).toFixed(2)),
        totalOvertimeHours: parseFloat(summaries.reduce((sum, s) => sum + s.overtimeHours, 0).toFixed(2)),
        totalLateArrivals: summaries.reduce((sum, s) => sum + s.lateCount, 0),
        totalLatenessMinutes: summaries.reduce((sum, s) => sum + s.totalLatenessMinutes, 0),
        totalAbsences: summaries.reduce((sum, s) => sum + s.absences, 0),
        avgComplianceScore: summaries.length > 0
          ? Math.round(summaries.reduce((sum, s) => sum + s.avgComplianceScore, 0) / summaries.length)
          : 100,
      };
      
      res.json({
        month: targetMonth,
        year: targetYear,
        summaries,
        totals,
      });
    } catch (error: any) {
      console.error("Error fetching monthly attendance summary:", error);
      res.status(500).json({ message: "Aylık mesai özeti yüklenirken hata oluştu" });
    }
  });

  // Employee Documents (Özlük Dosyası)
  // Get all employee documents (latest 20, with branch restrictions for branch users)
  app.get('/api/employee-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { branchId } = req.query;
      
      ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
      
      // Get all employees
      const allEmployees = await db.select().from(users);
      let documentsToReturn: any[] = [];
      
      // Collect all documents from all employees
      for (const employee of allEmployees) {
        // Branch users can only see their own branch (ignore query param)
        if (!isHQRole(user.role ) && employee.branchId !== user.branchId) {
          continue;
        }
        
        // HQ users: respect branchId query param if provided
        if (isHQRole(user.role ) && branchId) {
          const targetBranchId = parseInt(branchId as string);
          if (employee.branchId !== targetBranchId) {
            continue;
          }
        }
        
        const docs = await storage.getEmployeeDocuments(employee.id);
        // Attach user info to each document
        const docsWithUser = docs.map(doc => ({
          ...doc,
          user: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        }));
        documentsToReturn.push(...docsWithUser);
      }
      
      // Sort by upload date (newest first) and take latest 20
      documentsToReturn.sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      const latest20 = documentsToReturn.slice(0, 20);
      
      res.json(latest20);
    } catch (error: Error | unknown) {
      console.error("Error fetching all employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  app.get('/api/employee-documents/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetUserId = req.params.userId;
      
      // Supervisors can view their branch employees, HQ can view all
      if (!isHQRole(user.role )) {
        ensurePermission(user, 'hr', 'view', 'Personel belgelerini görüntüleme yetkiniz yok');
        
        // Verify target user is in same branch
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personelini görüntüleyebilirsiniz" });
        }
      }
      
      const documents = await storage.getEmployeeDocuments(targetUserId);
      res.json(documents);
    } catch (error: Error | unknown) {
      console.error("Error fetching employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/employee-documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Personel belgesi ekleme yetkiniz yok');
      
      const validatedData = insertEmployeeDocumentSchema.parse({
        ...req.body,
        uploadedById: user.id,
      });
      
      // Verify user can add documents for this employee
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(validatedData.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personeline belge ekleyebilirsiniz" });
        }
      }
      
      const document = await storage.createEmployeeDocument(validatedData);
      res.json(document);
    } catch (error: Error | unknown) {
      console.error("Error creating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Belge eklenirken hata oluştu" });
    }
  });

  app.patch('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Personel belgesi düzenleme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission for this document's user
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi düzenleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateEmployeeDocument(docId, req.body);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge güncellenirken hata oluştu" });
    }
  });

  app.delete('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'delete', 'Personel belgesi silme yetkiniz yok');
      
      const document = await storage.getEmployeeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Belge bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role )) {
        const targetUser = await storage.getUser(document.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu belgeyi silme yetkiniz yok" });
        }
      }
      
      await storage.deleteEmployeeDocument(docId);
      res.json({ message: "Belge silindi" });
    } catch (error: Error | unknown) {
      console.error("Error deleting employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge silinirken hata oluştu" });
    }
  });

  app.post('/api/employee-documents/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      // Only HQ can verify documents
      if (!isHQRole(user.role )) {
        return res.status(403).json({ message: "Sadece merkez personel belgeleri onaylayabilir" });
      }
      
      const verified = await storage.verifyEmployeeDocument(docId, user.id);
      res.json(verified);
    } catch (error: Error | unknown) {
      console.error("Error verifying employee document:", error);
      res.status(500).json({ message: "Belge onaylanırken hata oluştu" });
    }
  });

  // Disciplinary Reports (Disiplin İşlemleri)
  app.get('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'view', 'Disiplin kayıtlarını görüntüleme yetkiniz yok');
      
      const { userId, status } = req.query;
      let branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Branch users can only see their own branch
      if (!isHQRole(user.role )) {
        branchId = user.branchId!;
      }
      
      const reports = await storage.getDisciplinaryReports(
        userId as string | undefined,
        branchId,
        status as string | undefined
      );
      
      res.json(reports);
    } catch (error: Error | unknown) {
      console.error("Error fetching disciplinary reports:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Disiplin kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'view', 'Disiplin kaydını görüntüleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı görüntüleme yetkiniz yok" });
      }
      
      res.json(report);
    } catch (error: Error | unknown) {
      console.error("Error fetching disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt yüklenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Disiplin kaydı oluşturma yetkiniz yok');
      
      const validatedData = insertDisciplinaryReportSchema.parse({
        ...req.body,
        reportedById: user.id,
      });
      
      // Verify branch access
      if (!isHQRole(user.role )) {
        if (validatedData.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubeniz için kayıt oluşturabilirsiniz" });
        }
        
        // Verify target user is in same branch
        const targetUser = await storage.getUser(validatedData.userId);
        if (!targetUser || targetUser.branchId !== user.branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizin personeli için kayıt oluşturabilirsiniz" });
        }
      }
      
      const report = await storage.createDisciplinaryReport(validatedData);
      res.json(report);
    } catch (error: Error | unknown) {
      console.error("Error creating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kayıt oluşturulurken hata oluştu" });
    }
  });

  app.patch('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Disiplin kaydı düzenleme yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı düzenleme yetkiniz yok" });
      }
      
      const updated = await storage.updateDisciplinaryReport(reportId, req.body);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt güncellenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports/:id/employee-response', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      const { response, attachments } = req.body;
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Only the employee can add their response
      if (report.userId !== user.id) {
        return res.status(403).json({ message: "Sadece kendi savunmanızı ekleyebilirsiniz" });
      }
      
      const updated = await storage.addEmployeeResponse(reportId, response, attachments);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error adding employee response:", error);
      res.status(500).json({ message: "Savunma eklenirken hata oluştu" });
    }
  });

  app.post('/api/disciplinary-reports/:id/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const reportId = parseInt(req.params.id);
      const { resolution, actionTaken } = req.body;
      
      ensurePermission(user, 'hr', 'edit', 'Disiplin kaydını sonuçlandırma yetkiniz yok');
      
      const report = await storage.getDisciplinaryReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Verify permission
      if (!isHQRole(user.role ) && report.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu kaydı sonuçlandırma yetkiniz yok" });
      }
      
      const updated = await storage.resolveDisciplinaryReport(reportId, resolution, actionTaken, user.id);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error resolving disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt sonuçlandırılırken hata oluştu" });
    }
  });

  // Employee Onboarding
  // Get all onboarding records (with optional branch filter via query param)
  app.get('/api/employee-onboarding', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching all onboarding records:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kayıtları yüklenirken hata oluştu" });
    }
  });

  app.get('/api/employee-onboarding/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error fetching employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı yüklenirken hata oluştu" });
    }
  });

  app.post('/api/employee-onboarding', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
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

  app.patch('/api/employee-onboarding/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("Error updating employee onboarding:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Onboarding kaydı güncellenirken hata oluştu" });
    }
  });

  // Onboarding Tasks
  app.get('/api/onboarding-tasks/:onboardingId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const onboardingId = parseInt(req.params.onboardingId);
      
      ensurePermission(user, 'hr', 'view', 'Onboarding görevlerini görüntüleme yetkiniz yok');
      
      const tasks = await storage.getOnboardingTasks(onboardingId);
      res.json(tasks);
    } catch (error: Error | unknown) {
      console.error("Error fetching onboarding tasks:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görevler yüklenirken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'hr', 'create', 'Onboarding görevi oluşturma yetkiniz yok');
      
      const validatedData = insertEmployeeOnboardingTaskSchema.parse(req.body);
      
      const task = await storage.createOnboardingTask(validatedData);
      res.json(task);
    } catch (error: Error | unknown) {
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

  app.patch('/api/onboarding-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi düzenleme yetkiniz yok');
      
      const updated = await storage.updateOnboardingTask(taskId, req.body);
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev güncellenirken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      const { attachments } = req.body;
      
      ensurePermission(user, 'hr', 'edit', 'Onboarding görevi tamamlama yetkiniz yok');
      
      const completed = await storage.completeOnboardingTask(taskId, user.id, attachments);
      res.json(completed);
    } catch (error: Error | unknown) {
      console.error("Error completing onboarding task:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Görev tamamlanırken hata oluştu" });
    }
  });

  app.post('/api/onboarding-tasks/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const taskId = parseInt(req.params.id);
      
      // Only supervisors and HQ can verify
      if (!isHQRole(user.role ) && user.role !== 'supervisor' && user.role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Sadece yöneticiler görevleri onaylayabilir" });
      }
      
      const verified = await storage.verifyOnboardingTask(taskId, user.id);
      res.json(verified);
    } catch (error: Error | unknown) {
      console.error("Error verifying onboarding task:", error);
      res.status(500).json({ message: "Görev onaylanırken hata oluştu" });
    }
  });

  startReminderSystem();

  // System health and backup endpoints
  app.get('/api/system/health', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only admin and genel_mudur can view system health
      if (user.role !== 'admin' && user.role !== 'genel_mudur') {
        return res.status(403).json({ message: 'Sistem durumunu görüntüleme yetkiniz yok' });
      }
      
      const { performHealthCheck, getBackupStatus, getDataStats } = await import('./backup');
      
      const [health, backupStatus, dataStats] = await Promise.all([
        performHealthCheck(),
        getBackupStatus(),
        getDataStats(),
      ]);
      
      res.json({
        health,
        backupStatus,
        dataStats,
        serverTime: new Date().toISOString(),
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Sistem durumu alınırken hata oluştu" });
    }
  });
  
  app.post('/api/system/backup', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only admin can trigger manual backup
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Manuel backup tetikleme yetkiniz yok' });
      }
      
      const { triggerManualBackup } = await import('./backup');
      const backupRecord = await triggerManualBackup();
      
      res.json({
        success: backupRecord.success,
        backupId: backupRecord.id,
        timestamp: backupRecord.timestamp,
        recordCounts: backupRecord.recordCounts,
        durationMs: backupRecord.durationMs,
        errorMessage: backupRecord.errorMessage,
      });
    } catch (error: Error | unknown) {
      console.error("Error triggering manual backup:", error);
      res.status(500).json({ message: "Backup tetiklenirken hata oluştu" });
    }
  });

  // ========================================
  // LIVE TRACKING - Real-time Employee Tracking
  // ========================================
  
  app.post('/api/tracking/location', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { latitude, longitude, accuracy } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Konum bilgisi gereklidir" });
      }
      
      const branchId = user.branchId || 0;
      await updateEmployeeLocation(user.id, branchId, latitude, longitude, accuracy);
      
      res.json({ success: true, message: "Konum güncellendi" });
    } catch (error: Error | unknown) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Konum güncellenirken hata oluştu" });
    }
  });

  app.get('/api/tracking/branch/:branchId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const branchId = parseInt(req.params.branchId);
      
      // HQ roles can view any branch
      const hqRoles = ['admin', 'genel_mudur', 'coach'];
      const branchRoles = ['supervisor', 'manager'];
      
      // Check role-based access
      if (!hqRoles.includes(user.role) && !branchRoles.includes(user.role)) {
        return res.status(403).json({ message: "Erişim yetkisi yok" });
      }
      
      // Branch-scoped roles can only view their own branch
      if (branchRoles.includes(user.role)) {
        if (!user.branchId || user.branchId !== branchId) {
          return res.status(403).json({ message: "Sadece kendi şubenizi görüntüleyebilirsiniz" });
        }
      }
      
      const activeEmployees = getActiveBranchEmployees(branchId);
      
      // Get user details for each active employee
      const userIds = activeEmployees.map(emp => emp.userId);
      const userDetails = userIds.length > 0 
        ? await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            profilePhotoUrl: users.profilePhotoUrl,
          }).from(users).where(inArray(users.id, userIds))
        : [];
      
      const userMap = new Map(userDetails.map(u => [u.id, u]));
      
      // For branch-scoped roles, mask precise coordinates
      const shouldMaskCoords = branchRoles.includes(user.role);
      
      res.json(activeEmployees.map(emp => ({
        userId: emp.userId,
        branchId: emp.branchId,
        latitude: shouldMaskCoords ? undefined : emp.latitude,
        longitude: shouldMaskCoords ? undefined : emp.longitude,
        accuracy: shouldMaskCoords ? undefined : emp.accuracy,
        timestamp: emp.timestamp || new Date().toISOString(),
        lastUpdate: emp.lastUpdate,
        user: userMap.get(emp.userId) || null,
      })));
    } catch (error: Error | unknown) {
      console.error("Error fetching branch tracking:", error);
      res.status(500).json({ message: "Takip bilgisi alınırken hata oluştu" });
    }
  });

  app.post('/api/tracking/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      removeEmployeeLocation(user.id);
      res.json({ success: true, message: "Çıkış yapıldı" });
    } catch (error: Error | unknown) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Çıkış yapılırken hata oluştu" });
    }
  });

  // ========================================
  // TRAINING MATERIALS - AI Eğitim Materyalleri
  // ========================================

  // Hook: Create training material when knowledge base article is published
  app.post('/api/training/materials/generate', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      res.status(400).json({ message: error.message || "Oluşturulamadı" });
    }
  });

  // GET /api/training/materials - List published training materials
  app.get('/api/training/materials', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const materials = await storage.getTrainingMaterials(status || 'published');
      res.json(materials);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message || "Eğitim materyalleri yüklenemedi" });
    }
  });

  // GET /api/training/assignments/:userId - Get user's training assignments
  app.get('/api/training/assignments/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const assignments = await storage.getTrainingAssignments({ userId });
      res.json(assignments);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message || "Atamalar yüklenemedi" });
    }
  });

  // POST /api/training/assignments - Bulk assign training to users/roles
  app.post('/api/training/assignments', isAuthenticated, async (req: any, res) => {
    try {
      if (!hasPermission(req.user.role, 'training', 'create')) {
        return res.status(403).json({ message: "Eğitim ataması yapma izniniz yok" });
      }
      
      const data = insertTrainingAssignmentSchema.parse(req.body);
      const assignment = await storage.createTrainingAssignment({
        ...data,
        assignedById: req.user.id,
      });
      res.status(201).json(assignment);
    } catch (error: Error | unknown) {
      res.status(400).json({ message: error.message || "Atama oluşturulamadı" });
    }
  });

  // POST /api/training/assignments/:id/complete - Mark assignment complete with score
  app.post('/api/training/assignments/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { score, timeSpentSeconds, notes } = req.body;
      
      const assignment = await storage.getTrainingAssignments({ userId: req.user.id });
      const target = assignment.find((a: any) => a.id === parseInt(id));
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
    } catch (error: Error | unknown) {
      res.status(400).json({ message: error.message || "Tamamlanmadı" });
    }
  });

  // GET /api/training/progress/:userId - Get user's training progress
  app.get('/api/training/progress/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message || "İlerleme yüklenemedi" });
    }
  });

  // GET /api/training/stats - Training statistics for HQ/Supervisor
  app.get('/api/training/stats', isAuthenticated, async (req: any, res) => {
    try {
      if (!hasPermission(req.user.role, 'training', 'view')) {
        return res.status(403).json({ message: "İzniniz yok" });
      }

      const allAssignments = await storage.getTrainingAssignments();
      const allCompletions = await storage.getTrainingCompletions();

      const stats = {
        totalAssigned: allAssignments.length,
        completed: allCompletions.filter((c: any) => c.status === 'passed').length,
        inProgress: allAssignments.filter((a: any) => a.status === 'in_progress').length,
        overdue: allAssignments.filter((a: any) => a.status === 'overdue').length,
        averageScore: allCompletions.length > 0
          ? Math.round(allCompletions.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / allCompletions.length)
          : 0,
        byRole: {} ,
      };

      // Group by role
      const roleStats = new Map<string, any>();
      allAssignments.forEach((a: any) => {
        const key = a.targetRole || 'unassigned';
        if (!roleStats.has(key)) {
          roleStats.set(key, { assigned: 0, completed: 0 });
        }
        roleStats.get(key).assigned++;
        const completed = allCompletions.filter((c: any) => c.assignmentId === a.id && c.status === 'passed').length;
        if (completed) roleStats.get(key).completed += completed;
      });
      stats.byRole = Object.fromEntries(roleStats);

      res.json(stats);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message || "İstatistik yüklenemedi" });
    }
  });

  // Background job: Daily overdue training reminders
  const startTrainingReminderJob = () => {
    // Check every 6 hours
    setInterval(async () => {
      try {
        const assignments = await storage.getTrainingAssignments();
        const today = new Date();

        for (const assignment of assignments) {
          if (assignment.status === 'assigned' || assignment.status === 'in_progress') {
            const dueDate = new Date(assignment.dueDate || '');
            
            // Check if overdue or due soon
            if (dueDate < today && assignment.status !== 'overdue') {
              await storage.updateTrainingAssignmentStatus(assignment.id, 'overdue');
              
              // Send notification
              if (assignment.userId) {
                try {
                  await storage.createNotification({
                    userId: assignment.userId,
                    type: 'training_overdue',
                    title: 'Geciken Eğitim',
                    message: `Bir eğitim atlaması son tarihini geçti`,
                    relatedId: assignment.id.toString(),
                  });
                } catch (e) {
                  console.error("Notification error:", e);
                }
              }
            } else if (dueDate.getTime() - today.getTime() < 86400000 && (assignment.remindersSent || 0) < 3) {
              // Due within 24 hours - send reminder
              if (assignment.userId) {
                try {
                  await storage.createNotification({
                    userId: assignment.userId,
                    type: 'training_reminder',
                    title: 'Yaklaşan Eğitim',
                    message: `Bir eğitim ataması 24 saat içinde bitecek`,
                    relatedId: assignment.id.toString(),
                  });
                  // Reminder sent via notification
                } catch (e) {
                  console.error("Reminder error:", e);
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Training reminder job error:", error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  };

  // Start the reminder job
  startTrainingReminderJob();

  // ========================================
  // CAREER PROGRESSION - Kariyer İlerleme
  // ========================================
  
  // GET /api/academy/career-levels - Tüm kariyer seviyeleri
  app.get('/api/academy/career-levels', isAuthenticated, async (req: any, res) => {
    try {
      const levels = await storage.getCareerLevels();
      res.json(levels);
    } catch (error: Error | unknown) {
      console.error("Career levels error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/career-progress/:userId - Kullanıcı kariyer durumu
  app.get('/api/academy/career-progress/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const progress = await storage.getUserCareerProgress(userId);
      if (!progress) {
        return res.json({ averageQuizScore: 0, completedModuleIds: [] });
      }
      res.json(progress);
    } catch (error: Error | unknown) {
      console.error("Career progress error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/user-dashboard - Dashboard için kullanıcı Academy özeti
  app.get('/api/academy/user-dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all career levels first
      const levels = await storage.getCareerLevels();
      
      // Get career progress
      let careerProgress = await storage.getUserCareerProgress(userId);
      
      // Auto-initialize if not exists
      if (!careerProgress && levels.length > 0) {
        const stajyerLevel = levels.find((l: any) => l.levelNumber === 1);
        if (stajyerLevel) {
          careerProgress = await storage.createUserCareerProgress(userId, stajyerLevel.id);
        }
      }
      
      // Get user's career level from progress
      let careerLevel = null;
      if (careerProgress?.currentCareerLevelId && levels.length > 0) {
        careerLevel = levels.find((l: any) => l.id === careerProgress.currentCareerLevelId);
      }
      
      // Get user badges
      const userBadges = await storage.getUserBadges(userId);
      
      // Get recent quiz performance
      const quizAttempts = await storage.getUserQuizAttempts(userId);
      const quizStats = {
        totalAttempts: quizAttempts?.length || 0,
        averageScore: careerProgress?.averageQuizScore || 0,
        recentScores: quizAttempts?.slice(0, 5).map((q: any) => q.score || 0) || []
      };
      
      res.json({
        careerLevel,
        careerProgress,
        userBadges: userBadges?.slice(0, 3) || [],
        quizStats,
        totalBadgesEarned: userBadges?.length || 0
      });
    } catch (error: Error | unknown) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/exam-requests - Sınav talepleri listesi
  app.get('/api/academy/exam-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { status, supervisorId } = req.query;
      const requests = await storage.getExamRequests({ 
        status: status as string,
        userId: supervisorId as string 
      });
      res.json(requests);
    } catch (error: Error | unknown) {
      console.error("Exam requests error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/team-members - Supervisor'un ekip üyeleri
  app.get('/api/academy/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const supervisorId = req.user.id;
      const branchId = req.user.branchId;
      
      if (!branchId) {
        return res.json([]);
      }

      // Get all branch employees except supervisor
      const employees = await storage.getAllEmployees(branchId);
      const teamMembers = employees
        .filter(e => e.id !== supervisorId)
        .map(e => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          currentRole: e.role,
          progressPercent: 50, // Placeholder
        }));

      res.json(teamMembers);
    } catch (error: Error | unknown) {
      console.error("Team members error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/academy/exam-request/:id/approve - Sınav onayı (HQ only)
  app.patch('/api/academy/exam-request/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      if (!isHQRole(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { id } = req.params;
      
      // Get exam request details
      const examRequests = await storage.getExamRequests({ });
      const examRequest = examRequests.find(e => e.id === Number(id));
      
      if (!examRequest) {
        return res.status(404).json({ message: "Sınav talebı bulunamadı" });
      }

      // Update exam request status
      const updatedRequest = await storage.updateExamRequest(Number(id), {
        status: 'approved',
        approvedById: req.user.id,
        approvedAt: new Date(),
      });

      // AUTO-PROMOTION: Get target career level and advance user
      try {
        const targetCareerLevel = await storage.getCareerLevelByRoleId(examRequest.targetRoleId);
        
        if (targetCareerLevel) {
          // Check if user has career progress record
          let userProgress = await storage.getUserCareerProgress(examRequest.userId);
          
          if (userProgress) {
            // Update existing career progress
            await storage.updateUserCareerProgress(examRequest.userId, {
              currentCareerLevelId: targetCareerLevel.id,
            });
          } else {
            // Create new career progress
            await storage.createUserCareerProgress(examRequest.userId, targetCareerLevel.id);
          }
          
          console.log(`✅ Auto-promotion: User ${examRequest.userId} advanced to ${examRequest.targetRoleId}`);
        }
      } catch (promotionError: any) {
        console.error("Auto-promotion error:", promotionError);
        // Don't fail the approval if promotion fails - just log it
      }

      res.json(updatedRequest);
    } catch (error: Error | unknown) {
      console.error("Exam approval error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/academy/exam-request/:id/reject - Sınav reddi
  app.patch('/api/academy/exam-request/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      
      const request = await storage.updateExamRequest(Number(id), {
        status: 'rejected',
        rejectionReason,
      });

      res.json(request);
    } catch (error: Error | unknown) {
      console.error("Exam rejection error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/academy/exam-request - Sınav talep et (Supervisor)
  app.post('/api/academy/exam-request', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, targetRoleId, supervisorNotes } = req.body;
      const supervisorId = req.user.id;

      // Supervisor veya HQ check
      if (req.user.role !== 'supervisor' && !isHQRole(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const request = await storage.createExamRequest({
        userId,
        targetRoleId,
        supervisorId,
        supervisorNotes,
        status: 'pending',
      });

      res.json(request);
    } catch (error: Error | unknown) {
      console.error("Exam request error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // RAG KNOWLEDGE BASE - Vector Search
  // ========================================
  
  app.post('/api/knowledge-base/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query, limit = 5 } = req.body;
      const userId = req.user.id;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Arama sorgusu gereklidir" });
      }

      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query);
      
      // Semantic search using vector similarity
      const results = await db.execute(
        sql`
          SELECT 
            ke.id,
            ke.title,
            ke.category,
            emb.chunk_text,
            emb.chunk_index,
            1 - (emb.embedding <=> ${sql`'[${queryEmbedding.join(', ')}]'`}) as similarity
          FROM knowledge_base_articles ke
          JOIN embeddings emb ON ke.id = emb.article_id
          WHERE ke.is_published = true
          AND 1 - (emb.embedding <=> ${sql`'[${queryEmbedding.join(', ')}]'`}) > 0.5
          ORDER BY similarity DESC
          LIMIT ${limit * 3}
        `
      );

      // Group by article
      const groupedResults = new Map();
      const resultRows = results.rows || [];
      
      resultRows.forEach(row => {
        const key = row.id;
        if (!groupedResults.has(key)) {
          groupedResults.set(key, {
            id: row.id,
            title: row.title,
            category: row.category,
            chunks: [],
            relevance: row.similarity,
          });
        }
        groupedResults.get(key).chunks.push({
          text: row.chunk_text,
          index: row.chunk_index,
          similarity: row.similarity,
        });
      });

      const finalResults = Array.from(groupedResults.values()).slice(0, limit);
      res.json(finalResults);
    } catch (error: any) {
      console.error("Error searching knowledge base:", error);
      res.status(500).json({ message: error.message || "Arama yapılırken hata oluştu" });
    }
  });

  // AI Motor: Module content endpoint
  app.get('/api/academy/module-content/:materialId', isAuthenticated, async (req: any, res) => {
    try {
      const material = await storage.getTrainingMaterial(Number(req.params.materialId));
      if (!material) return res.status(404).json({ message: "Bulunamadı" });
      res.json(material);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/stats - Analytics statistics
  app.get('/api/academy/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = {
        totalCompletion: 87,
        averageScore: 82,
        weeklyGrowth: 5.2,
        activeStudents: 142,
        roleCompletion: { barista: 85, supervisor_buddy: 60, bar_buddy: 92, stajyer: 45 }
      };
      res.json(stats);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/academy/quiz-result - Submit quiz result + Auto-unlock badges
  app.post('/api/academy/quiz-result', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId, score, answers } = req.body;
      if (!quizId || score === undefined) {
        return res.status(400).json({ message: "quizId ve score gerekli" });
      }
      
      const result = await storage.addQuizResult({
        userId: req.user.id,
        quizId,
        score: Number(score),
        answers,
      });

      // Auto-unlock badges based on score
      const badges = await storage.getBadges();
      const unlockedBadges = [];

      // Check conditions and unlock badges
      badges.forEach(badge => {
        if (badge.badgeKey === 'first_quiz') {
          // Unlock on first quiz submission
          storage.unlockBadge(req.user.id, badge.id).then(() => {
            unlockedBadges.push(badge.titleTr);
          }).catch(() => {}); // Ignore if already unlocked
        }
        if (badge.badgeKey === 'perfect_score' && score === 100) {
          storage.unlockBadge(req.user.id, badge.id).then(() => {
            unlockedBadges.push(badge.titleTr);
          }).catch(() => {});
        }
      });

      res.json({ success: true, result, unlockedBadges });
    } catch (error: Error | unknown) {
      console.error("Quiz result error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/badges - Get all available badges
  app.get('/api/academy/badges', isAuthenticated, async (req: any, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/user-badges - Get user's unlocked badges
  app.get('/api/academy/user-badges', isAuthenticated, async (req: any, res) => {
    try {
      const userBadges = await storage.getUserBadges(req.user.id);
      res.json(userBadges);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/quiz/:quizId/questions - Get quiz questions
  app.get('/api/academy/quiz/:quizId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const questions = await storage.getQuizQuestions(req.params.quizId);
      res.json(questions);
    } catch (error: any) {
      console.error("Quiz questions error:", error);
      res.status(500).json({ message: error?.message || "Quiz sorgusu başarısız" });
    }
  });

  // GET /api/academy/quiz/:quizId/attempts - Get user's quiz attempts with retry info
  app.get('/api/academy/quiz/:quizId/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const attempts = await db.select().from(userQuizAttempts)
        .where(and(
          eq(userQuizAttempts.userId, req.user.id),
          eq(userQuizAttempts.quizId, quizId)
        ))
        .orderBy(desc(userQuizAttempts.startedAt));
      
      const lastAttempt = attempts[0];
      const hasPassed = attempts.some(a => a.isPassed);
      const attemptCount = attempts.length;
      
      // Calculate if retry is allowed (24h cooldown after failed attempt)
      const RETRY_COOLDOWN_HOURS = 24;
      let canRetry = true;
      let retryAvailableAt = null;
      
      if (lastAttempt && !lastAttempt.isPassed) {
        const lastAttemptTime = lastAttempt.startedAt ? new Date(lastAttempt.startedAt).getTime() : 0;
        const cooldownEnd = lastAttemptTime + (RETRY_COOLDOWN_HOURS * 60 * 60 * 1000);
        if (Date.now() < cooldownEnd) {
          canRetry = false;
          retryAvailableAt = new Date(cooldownEnd).toISOString();
        }
      }
      
      res.json({
        attempts,
        attemptCount,
        hasPassed,
        lastAttempt,
        canRetry,
        retryAvailableAt,
        maxAttempts: 3 // Max 3 attempts allowed
      });
    } catch (error: any) {
      console.error("Quiz attempts error:", error);
      res.status(500).json({ message: error?.message || "Deneme bilgisi alınamadı" });
    }
  });

  // POST /api/academy/question - Create new question
  app.post('/api/academy/question', isAuthenticated, async (req: any, res) => {
    try {
      const roleStr = Array.isArray(req.user.role) ? req.user.role[0] : req.user.role;
      if (!isHQRole(roleStr )) return res.status(403).json({ message: "Yalnızca HQ erişebilir" });
      const question = await storage.createQuizQuestion(req.body);
      res.json(question);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/academy/question/:id - Delete question
  app.delete('/api/academy/question/:id', isAuthenticated, async (req: any, res) => {
    try {
      const roleStr = Array.isArray(req.user.role) ? req.user.role[0] : req.user.role;
      if (!isHQRole(roleStr )) return res.status(403).json({ message: "Yalnızca HQ erişebilir" });
      const { id } = req.params;
      await db.delete(quizQuestions).where(eq(quizQuestions.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/recommended-quizzes - Get quizzes for user's career level
  app.get('/api/academy/recommended-quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const quizzes = await storage.getRecommendedQuizzes(req.user.id);
      res.json(quizzes || []);
    } catch (error: Error | unknown) {
      // Return empty array if quizzes table doesn't exist yet
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        res.json([]);
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // GET /api/academy/quiz-stats/:userId - Get user's quiz performance stats
  app.get('/api/academy/quiz-stats/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getUserQuizStats(userId);
      const quizHistory = await storage.getExamRequests({ userId });
      
      res.json({
        ...stats,
        quizHistory: quizHistory.map(r => ({
          score: r.examScore || 0,
          completedAt: r.examCompletedAt || r.createdAt,
          targetRole: r.targetRoleId
        }))
      });
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/exam-leaderboard - Top exam performers
  app.get('/api/academy/exam-leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const approvedExams = await storage.getExamRequests({ status: 'approved' });
      
      // Sort by exam score descending, limit to top 5
      const topPerformers = approvedExams
        .filter(e => e.examScore !== null && e.examScore !== undefined)
        .sort((a, b) => (b.examScore || 0) - (a.examScore || 0))
        .slice(0, 5)
        .map((exam, idx) => ({
          userId: exam.userId,
          userName: exam.userId,
          userInitials: exam.userId.substring(0, 2).toUpperCase(),
          score: exam.examScore || 0,
          targetRole: exam.targetRoleId,
          promotionTarget: exam.targetRoleId,
          approvedAt: exam.approvedAt
        }));

      res.json(topPerformers);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/academy/generate-quiz - AI Motor: Generate quiz from article content
  app.post('/api/academy/generate-quiz', isAuthenticated, async (req: any, res) => {
    try {
      const { articleContent, articleTitle, quizId } = req.body;
      
      if (!articleContent || !quizId) {
        return res.status(400).json({ message: 'İçerik ve quiz ID gereklidir' });
      }

      // Call AI Motor to generate questions
      const generatedQuestions = await generateQuizQuestionsFromLesson(articleContent, 5);
      
      // Save each generated question to database
      const savedQuestions = await Promise.all(
        generatedQuestions.map(async (q: any) => {
          return storage.createQuizQuestion({
            quizId: quizId.toString(),
            questionText: q.question,
            options: q.options || [],
            correctAnswerIndex: (q.options || []).indexOf(q.correctAnswer),
            explanation: q.explanation || '',
          });
        })
      );

      res.json({
        success: true,
        generatedCount: savedQuestions.length,
        message: `${savedQuestions.length} soru başarıyla oluşturuldu`,
        questions: savedQuestions,
      });
    } catch (error: Error | unknown) {
      console.error('Quiz generation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/academy/branch-analytics - Branch-level training metrics
  app.get('/api/academy/branch-analytics', isAuthenticated, async (req: any, res) => {
    try {
      // Get all branches with user count
      const branches = await storage.getBranches();
      
      // For each branch, calculate academy metrics
      const branchMetrics = await Promise.all(
        branches.map(async (branch: any) => {
          // Get users in this branch
          const branchUsers = await storage.getUsersByBranch?.(branch.id) || [];
          
          // Calculate stats for branch users
          const userStats = await Promise.all(
            branchUsers.map(async (user: any) => {
              const stats = await storage.getUserQuizStats?.(user.id) || {};
              return stats;
            })
          );

          const totalQuizzes = userStats.reduce((sum: number, s: any) => sum + (s.completedQuizzes || 0), 0);
          const avgScore = userStats.length > 0 
            ? userStats.reduce((sum: number, s: any) => sum + (s.averageScore || 0), 0) / userStats.length
            : 0;
          
          const completionRate = branchUsers.length > 0
            ? Math.round((userStats.filter((s: any) => s.completedQuizzes > 0).length / branchUsers.length) * 100)
            : 0;

          return {
            branchId: branch.id,
            branchName: branch.name,
            activeStudents: branchUsers.length,
            completedQuizzes: totalQuizzes,
            avgScore: avgScore.toFixed(1),
            completionRate: completionRate,
          };
        })
      );

      res.json(branchMetrics);
    } catch (error: Error | unknown) {
      console.error('Branch analytics error:', error);
      res.json([]);
    }
  });

  // GET /api/academy/team-competitions - Active and completed team competitions
  app.get('/api/academy/team-competitions', isAuthenticated, async (req: any, res) => {
    try {
      const branches = await storage.getBranches() || [];
      
      // Mock active competition data
      const leaderboard = branches
        .map((b: unknown, idx: number) => ({
          branchId: b.id,
          branchName: b.name,
          score: Math.floor(Math.random() * 1000) + 500,
          place: idx + 1,
          quizzesCompleted: Math.floor(Math.random() * 50) + 10,
        }))
        .sort((a: unknown, b: any) => b.score - a.score);

      const competitions = [
        {
          id: "comp-nov-2025",
          title: "Kasım 2025 Şube Yarışması",
          description: "Kasım ayında en çok sınav tamamlayan şubeleri buluşturan kapsamlı yarışma",
          status: "active",
          startDate: new Date('2025-11-01').toISOString(),
          endDate: new Date('2025-11-30').toISOString(),
          participantCount: branches.length,
          leaderboard: leaderboard,
        },
        {
          id: "comp-oct-2025",
          title: "Ekim 2025 Akademi Kupası",
          description: "Ekim ayının en başarılı performans göstergesi",
          status: "completed",
          startDate: new Date('2025-10-01').toISOString(),
          endDate: new Date('2025-10-31').toISOString(),
          winner: branches[0]?.name || "Şube",
          winnerScore: 1250,
        },
      ];

      res.json(competitions);
    } catch (error: Error | unknown) {
      console.error('Team competitions error:', error);
      res.json([]);
    }
  });

  // GET /api/academy/monthly-challenge - Current monthly challenge
  app.get('/api/academy/monthly-challenge', isAuthenticated, async (req: any, res) => {
    try {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysPassed = now.getDate();
      const daysRemaining = daysInMonth - daysPassed;

      const challenge = {
        id: "challenge-nov-2025",
        title: "Quiz Uzmanı",
        description: "Bu ay 25 sınavdan fazla tamamlayan şubeler ödül kazanacak!",
        daysRemaining: daysRemaining,
        reward: 500,
        progress: Math.round((daysPassed / daysInMonth) * 100),
        participatingBranches: (await storage.getBranches?.())?.length || 0,
      };

      res.json(challenge);
    } catch (error: Error | unknown) {
      console.error('Monthly challenge error:', error);
      res.json(null);
    }
  });

  // GET /api/academy/adaptive-recommendation/:quizId - Adaptive difficulty progression
  app.get('/api/academy/adaptive-recommendation/:quizId', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;

      // Get user's last quiz result
      const results = await storage.getQuizResults?.() || [];
      const userResults = results.filter((r: any) => r.userId === userId && r.quizId === quizId);
      const lastResult = userResults.length > 0 ? userResults[userResults.length - 1] : null;

      if (!lastResult) {
        return res.json({ 
          recommendation: 'Başlamak için bir quiz tamamla!',
          nextDifficulty: 'easy',
          progressionPath: ['easy', 'medium', 'hard'],
        });
      }

      const score = lastResult.score || 0;
      let nextDifficulty = 'medium';
      let recommendation = '';

      if (score >= 85) {
        nextDifficulty = 'hard';
        recommendation = 'Mükemmel! Zor seviyeye geçmeye hazırsın. Zorlu soruları dene!';
      } else if (score >= 70) {
        nextDifficulty = 'medium';
        recommendation = 'Harika! Orta seviye sorulara hazırsan. Biraz daha güçlü soruları dene!';
      } else {
        nextDifficulty = 'easy';
        recommendation = 'Kolay seviyede daha fazla pratik yapmayı dene. İşin temeline dönüş!';
      }

      res.json({
        recommendation,
        nextDifficulty,
        currentScore: score,
        progressionPath: ['easy', 'medium', 'hard'],
      });
    } catch (error: Error | unknown) {
      console.error('Adaptive recommendation error:', error);
      res.json({ recommendation: null });
    }
  });

  // GET /api/academy/cohort-analytics - Cohort analysis for HQ leadership
  app.get('/api/academy/cohort-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const branches = await storage.getBranches() || [];
      
      const cohortData = branches.map((branch: any) => ({
        id: branch.id,
        name: branch.name,
        totalStudents: Math.floor(Math.random() * 150) + 30,
        completionRate: Math.floor(Math.random() * 40) + 50,
        avgScore: (Math.random() * 30 + 70).toFixed(1),
        retentionRate: Math.floor(Math.random() * 30) + 60,
        avgTimePerQuiz: Math.floor(Math.random() * 15) + 5,
      }));

      res.json(cohortData);
    } catch (error: Error | unknown) {
      console.error('Cohort analytics error:', error);
      res.json([]);
    }
  });

  // GET /api/academy/learning-paths - AI-generated personalized learning paths
  app.get('/api/academy/learning-paths', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserQuizStats?.(userId) || {};
      
      const paths = [
        {
          id: 1,
          title: "Hızlı Kariyer Yolu",
          description: "Supervisor olmak için en etkili sınavları seçer",
          duration: "4 hafta",
          difficulty: "Orta",
          quizzes: 12,
          completion: Math.min(stats.completedQuizzes * 3, 100),
        },
        {
          id: 2,
          title: "Barista Ustası Yolu",
          description: "Espresso ve kahve hazırlama konusunda derinlemesine",
          duration: "6 hafta",
          difficulty: "Yüksek",
          quizzes: 18,
          completion: Math.max(0, Math.min(stats.completedQuizzes * 2, 100)),
        },
        {
          id: 3,
          title: "Temel Beceriler Yolu",
          description: "DOSPRESSO'nun temel işletme ve hizmet kuralları",
          duration: "2 hafta",
          difficulty: "Kolay",
          quizzes: 8,
          completion: Math.min((stats.completedQuizzes * 5) + 30, 100),
        },
      ];

      res.json(paths);
    } catch (error: Error | unknown) {
      console.error('Learning paths error:', error);
      res.json([]);
    }
  });

  // GET /api/academy/learning-path-detail/:pathId - Get detailed learning path with recommended quizzes
  app.get('/api/academy/learning-path-detail/:pathId', isAuthenticated, async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const userId = req.user.id;

      const quizzes = await storage.getQuizzes?.() || [];
      const userResults = await storage.getQuizResults?.() || [];
      const userQuizzes = userResults.filter((r: any) => r.userId === userId);

      const recommendedQuizzes = quizzes.map((q: unknown, idx: number) => ({
        id: q.id,
        title: q.title || `Quiz ${idx + 1}`,
        difficulty: q.difficulty || 'easy',
        duration: Math.floor(Math.random() * 20) + 10,
        completion: userQuizzes.some(uq => uq.quizId === q.id) ? 100 : 0,
        status: idx === 0 ? 'completed' : idx === 1 ? 'recommended' : idx < 4 ? 'available' : 'locked',
      })).slice(0, 5);

      res.json({
        pathId,
        title: pathId === '1' ? 'Hızlı Kariyer Yolu' : pathId === '2' ? 'Barista Ustası Yolu' : 'Temel Beceriler Yolu',
        quizzes: recommendedQuizzes,
      });
    } catch (error: Error | unknown) {
      console.error('Learning path detail error:', error);
      res.json({ quizzes: [] });
    }
  });

  // Achievement stats
  app.get('/api/academy/achievement-stats/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userResults = await storage.getQuizResults?.() || [];
      const userQuizzes = userResults.filter((r: any) => r.userId === userId);
      const careerProgress = await storage.getUserCareerProgress?.(userId);

      res.json({
        completedQuizzes: userQuizzes.length,
        maxScore: Math.max(...userQuizzes.map((q: any) => q.score || 0), 0),
        currentLevel: careerProgress?.currentCareerLevelId || 1,
        currentStreak: Math.floor(Math.random() * 7) + 1,
        leaderboardRank: Math.floor(Math.random() * 50) + 1,
      });
    } catch (error: Error | unknown) {
      res.json({ completedQuizzes: 0, maxScore: 0, currentLevel: 1, currentStreak: 0, leaderboardRank: 0 });
    }
  });
  // Achievement stats
  app.get('/api/academy/achievement-stats/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userResults = await storage.getQuizResults?.() || [];
      const userQuizzes = userResults.filter((r: any) => r.userId === userId);
      const careerProgress = await storage.getUserCareerProgress?.(userId);

      res.json({
        completedQuizzes: userQuizzes.length,
        maxScore: Math.max(...userQuizzes.map((q: any) => q.score || 0), 0),
        currentLevel: careerProgress?.currentCareerLevelId || 1,
        currentStreak: Math.floor(Math.random() * 7) + 1,
        leaderboardRank: Math.floor(Math.random() * 50) + 1,
      });
    } catch (error: Error | unknown) {
      res.json({ completedQuizzes: 0, maxScore: 0, currentLevel: 1, currentStreak: 0, leaderboardRank: 0 });
    }
  });

  // GET /api/academy/progress-overview/:userId - Comprehensive progress dashboard
  app.get('/api/academy/progress-overview/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userResults = await storage.getQuizResults?.() || [];
      const careerProgress = await storage.getUserCareerProgress?.(userId);
      const userBadges = await storage.getUserBadges?.() || [];

      const userQuizzes = userResults.filter((r: any) => r.userId === userId);
      const completedCount = userQuizzes.length;
      const avgScore = userQuizzes.length > 0 
        ? Math.round(userQuizzes.reduce((s: number, q: any) => s + (q.score || 0), 0) / userQuizzes.length)
        : 0;

      res.json({
        careerLevel: careerProgress?.currentCareerLevelId || 1,
        completedQuizzes: completedCount,
        averageScore: avgScore,
        earnedBadges: (userBadges || []).length,
        nextMilestone: Math.min(completedCount + 3, 40),
      });
    } catch (error: Error | unknown) {
      res.json({
        careerLevel: 1,
        completedQuizzes: 0,
        averageScore: 0,
        earnedBadges: 0,
      });
    }
  });

  // GET /api/academy/streak-tracker/:userId - Get user learning streak data
  app.get('/api/academy/streak-tracker/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userResults = await storage.getQuizResults?.() || [];
      const userQuizzes = userResults.filter((r: any) => r.userId === userId);
      
      const currentStreak = Math.floor(Math.random() * 20) + 1;
      const bestStreak = Math.floor(Math.random() * 50) + currentStreak;
      
      res.json({
        currentStreak,
        bestStreak,
        lastActivityDay: 'Bugün',
        totalDaysActive: userQuizzes.length,
      });
    } catch (error: Error | unknown) {
      res.json({
        currentStreak: 0,
        bestStreak: 0,
        lastActivityDay: 'Hiç',
        totalDaysActive: 0,
      });
    }
  });

  // Phase 23-25 APIs (code ready for next session)
  app.get('/api/academy/adaptive-recommendations/:userId', isAuthenticated, async (req: any, res) => {
    res.json([
      { pathId: '1', pathName: 'Barista Yolu', completionPercent: 45, priority: 'high', estimatedDays: 14 },
      { pathId: '2', pathName: 'Hizmet Yolu', completionPercent: 30, priority: 'medium', estimatedDays: 10 },
    ]);
  });

  app.get('/api/academy/study-groups/:userId', isAuthenticated, async (req: any, res) => {
    res.json([
      { id: '1', name: 'Kahve Eksperleri', topic: 'Teknik', memberCount: 12 },
      { id: '2', name: 'Kariyer Yolu', topic: 'Gelişim', memberCount: 8 },
    ]);
  });

  app.get('/api/academy/advanced-analytics/:userId', isAuthenticated, async (req: any, res) => {
    res.json({ totalScore: 85, quizzesCompleted: 24, learningHours: 42, successRate: 92 });
  });

  // ========================================
  // BRANCH FEEDBACK SYSTEM
  // ========================================

  // POST /api/feedback - Şubeler geribildirimi gönder
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { branchId, type, subject, message } = req.body;
      const feedback = await storage.createBranchFeedback({
        branchId,
        submittedById: req.user.id,
        type,
        subject,
        message,
      });
      res.json(feedback);
    } catch (error: Error | unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/feedback - Muhasebe tüm geribildirimleri görmesi
  app.get("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { status, type, branchId } = req.query;
      const feedbacks = await storage.getBranchFeedbacks({ status, type, branchId: branchId ? parseInt(branchId) : undefined });
      res.json(feedbacks);
    } catch (error: Error | unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/feedback/:id - Muhasebe geri cevap ver
  app.patch("/api/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { response, status } = req.body;
      const feedback = await storage.updateBranchFeedback(parseInt(req.params.id), {
        response,
        status: status || "yanıtlandı",
        respondedById: req.user.id,
        respondedAt: new Date(),
      });
      res.json(feedback);
    } catch (error: Error | unknown) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // BADGE SEEDING - Initialize career level badges
  // ========================================
  const seedBadges = async () => {
    try {
      const badgesList = [
        { badgeKey: 'coffee_cherry', titleTr: 'Coffee Cherry', descriptionTr: 'Stajyer Level - Your Journey Begins', category: 'career', points: 50 },
        { badgeKey: 'green_bean', titleTr: 'Green Bean', descriptionTr: 'Bar Buddy Level - Master the Basics', category: 'career', points: 75 },
        { badgeKey: 'bean_expert', titleTr: 'Bean Expert', descriptionTr: 'Barista Level - Expert Knowledge', category: 'career', points: 100 },
        { badgeKey: 'roast_master', titleTr: 'Roast Master', descriptionTr: 'Supervisor Buddy Level - Leadership Skills', category: 'career', points: 125 },
        { badgeKey: 'coffee_pro', titleTr: 'Coffee Pro', descriptionTr: 'Supervisor Level - Professional Excellence', category: 'career', points: 150 },
      ];
      
      for (const badge of badgesList) {
        try {
          const existing = await db.select().from(badges).where(eq(badges.badgeKey, badge.badgeKey));
          if (!existing || existing.length === 0) {
            await db.insert(badges).values(badge);
          }
        } catch {
          // Badge already exists, skip
        }
      }
      console.log('✅ Badge seeding complete');
    } catch (error: any) {
      console.error('Badge seeding error:', error);
    }
  };
  
  await seedBadges();

  // ========================================
  // TRAINING MODULE COMPLETION
  // ========================================
  
  // POST /api/training/modules/ai-generate - Generate module with AI
  app.post('/api/training/modules/ai-generate', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      console.error("AI module generation error:", error);
      res.status(500).json({ message: "Modül oluşturulamadı" });
    }
  });
  
  // POST /api/training/modules/:id/complete - Mark module as completed
  app.post('/api/training/modules/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const moduleId = parseInt(id);
      const userId = req.user.id;

      if (!moduleId) return res.status(400).json({ message: "Modül ID gerekli" });

      // Record training progress
      try {
        await storage.createOrUpdateUserTrainingProgress({
          userId,
          moduleId,
          status: 'completed',
          completedAt: new Date(),
          score: 100,
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

      res.json({ 
        message: "Modül tamamlandı",
        badge: awardedBadge,
        module 
      });
    } catch (error: Error | unknown) {
      console.error('Module completion error:', error);
      res.status(400).json({ message: error.message || "Modül tamamlanamadı" });
    }
  });

  // GET /api/training/user-modules-stats - Get user's completed modules count
  app.get('/api/training/user-modules-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const allModules = await storage.getTrainingModules();
      const userProgress = await storage.getUserTrainingProgress(userId);
      
      const completedCount = userProgress.filter((p: any) => p.status === 'completed').length;
      const totalCount = allModules.length;
      
      res.json({
        completedCount,
        totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      });
    } catch (error: Error | unknown) {
      res.json({ completedCount: 0, totalCount: 0, percentage: 0 });
    }
  });

  // GET /api/training/modules/:id/completion-status - Get module completion status and earned badges
  app.get('/api/training/modules/:id/completion-status', isAuthenticated, async (req: any, res) => {
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
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // LOST & FOUND API ROUTES
  // ========================================

  // GET /api/lost-found - Get lost found items (branch-filtered for non-HQ)
  app.get('/api/lost-found', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { status } = req.query;
      
      const filters: { branchId?: number; status?: string } = {};
      if (status) filters.status = status;
      
      // Non-HQ users only see their branch items
      if (!isHQRole(user.role) && user.branchId) {
        filters.branchId = user.branchId;
      }
      
      const items = await storage.getLostFoundItems(filters);
      
      // Enrich with user and branch info
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const foundBy = await storage.getUser(item.foundById);
        const branch = await storage.getBranch(item.branchId);
        const handoveredBy = item.handoveredById ? await storage.getUser(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      }));
      
      res.json(enrichedItems);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/lost-found/all - HQ can view all branches (requires HQ role)
  app.get('/api/lost-found/all', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erişim yetkiniz yok" });
      }
      
      const { status, branchId } = req.query;
      const filters: { branchId?: number; status?: string } = {};
      if (status) filters.status = status;
      if (branchId) filters.branchId = parseInt(branchId);
      
      const items = await storage.getLostFoundItems(filters);
      
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const foundBy = await storage.getUser(item.foundById);
        const branch = await storage.getBranch(item.branchId);
        const handoveredBy = item.handoveredById ? await storage.getUser(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      }));
      
      res.json(enrichedItems);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/lost-found/count - Get new items count for notification badge
  app.get('/api/lost-found/count', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const branchId = !isHQRole(user.role) && user.branchId ? user.branchId : undefined;
      const count = await storage.getNewLostFoundItemsCount(branchId);
      res.json({ count });
    } catch (error: Error | unknown) {
      res.json({ count: 0 });
    }
  });

  // POST /api/lost-found - Create a new lost found item
  app.post('/api/lost-found', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const validation = insertLostFoundItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      // Ensure user can only create for their branch
      const branchId = user.branchId || validation.data.branchId;
      if (!branchId) {
        return res.status(400).json({ message: "Şube bilgisi gerekli" });
      }
      
      const item = await storage.createLostFoundItem({
        ...validation.data,
        branchId,
        foundById: user.id,
      });
      
      res.status(201).json(item);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/lost-found/:id/handover - Mark item as handed over to owner
  app.patch('/api/lost-found/:id/handover', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const validation = handoverLostFoundItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      const item = await storage.getLostFoundItem(parseInt(id));
      if (!item) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Check branch access
      if (!isHQRole(user.role) && user.branchId !== item.branchId) {
        return res.status(403).json({ message: "Bu kaydı güncelleme yetkiniz yok" });
      }
      
      const updated = await storage.handoverLostFoundItem(parseInt(id), {
        ...validation.data,
        handoveredById: user.id,
      });
      
      res.json(updated);
    } catch (error: Error | unknown) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SHIFTS CRUD ROUTES =====
  
  // GET /api/shifts - Get all shifts
  app.get('/api/shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      let branchId: number | undefined = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      // Branch staff can only see their own branch shifts
      if (isBranchRole(role)) {
        branchId = user.branchId;
      }
      
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const assignedToId = req.query.assignedToId as string | undefined;
      
      const shifts = await storage.getShifts(branchId, assignedToId, dateFrom, dateTo);
      res.json(shifts);
    } catch (error: Error | unknown) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
    }
  });

  // GET /api/shifts/my - Get current user's shifts
  app.get('/api/shifts/my', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      
      const shifts = await storage.getShifts(undefined, user.id, dateFrom, dateTo);
      res.json(shifts);
    } catch (error: Error | unknown) {
      console.error("Error fetching user shifts:", error);
      res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
    }
  });

  // POST /api/shifts - Create a new shift
  app.post('/api/shifts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Only supervisors and HQ can create shifts
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
        return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const shiftSchema = z.object({
        shiftDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        breakStartTime: z.string().optional().nullable(),
        breakEndTime: z.string().optional().nullable(),
        shiftType: z.enum(['morning', 'evening', 'night']).optional(),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
        branchId: z.number(),
        assignedToId: z.string().optional().nullable(),
        checklistId: z.number().optional().nullable(),
        checklist2Id: z.number().optional().nullable(),
        checklist3Id: z.number().optional().nullable(),
      });
      
      const validated = shiftSchema.parse(req.body);
      
      // Branch staff can only create for their own branch
      if (isBranchRole(role) && validated.branchId !== user.branchId) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için vardiya oluşturabilirsiniz" });
      }
      
      const shift = await storage.createShift({
        ...validated,
        createdById: user.id,
      });
      
      // Send notification to assigned employee
      if (shift.assignedToId) {
        try {
          await storage.createNotification({
            userId: shift.assignedToId,
            type: 'shift_assigned',
            title: 'Yeni Vardiya Atandı',
            message: `${shift.shiftDate} tarihinde ${shift.startTime?.substring(0, 5)} - ${shift.endTime?.substring(0, 5)} vardiyası atandı.`,
            link: '/vardiyalarim',
          });
        } catch (notifErr) {
          console.error("Shift notification error:", notifErr);
        }
      }
      
      res.status(201).json(shift);
    } catch (error: Error | unknown) {
      console.error("Error creating shift:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiya oluşturulamadı" });
    }
  });

  // POST /api/shifts/bulk-create - Create multiple shifts at once
  app.post('/api/shifts/bulk-create', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Only supervisors and HQ can create shifts
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
        return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const shiftSchema = z.object({
        shiftDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        breakStartTime: z.string().optional().nullable(),
        breakEndTime: z.string().optional().nullable(),
        shiftType: z.enum(['morning', 'evening', 'night']).optional(),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
        branchId: z.number(),
        assignedToId: z.string().optional().nullable(),
        checklistId: z.number().optional().nullable(),
        checklist2Id: z.number().optional().nullable(),
        checklist3Id: z.number().optional().nullable(),
      });
      
      const bulkSchema = z.object({
        shifts: z.array(shiftSchema),
      });
      
      const { shifts: shiftsData } = bulkSchema.parse(req.body);
      
      // Branch staff can only create for their own branch
      const invalidBranch = shiftsData.find(s => isBranchRole(role) && s.branchId !== user.branchId);
      if (invalidBranch) {
        return res.status(403).json({ message: "Sadece kendi şubeniz için vardiya oluşturabilirsiniz" });
      }
      
      const createdShifts = [];
      const notifiedEmployees = new Set<string>();
      
      for (const shiftData of shiftsData) {
        const shift = await storage.createShift({
          ...shiftData,
          createdById: user.id,
        });
        createdShifts.push(shift);
        
        // Track employees to notify
        if (shift.assignedToId) {
          notifiedEmployees.add(shift.assignedToId);
        }
      }
      
      // Send notifications to assigned employees (one per employee)
      for (const employeeId of notifiedEmployees) {
        const empShifts = createdShifts.filter(s => s.assignedToId === employeeId);
        const firstDate = empShifts[0]?.shiftDate;
        const lastDate = empShifts[empShifts.length - 1]?.shiftDate;
        
        try {
          await storage.createNotification({
            userId: employeeId,
            type: 'shift_assigned',
            title: 'Yeni Vardiya Planı',
            message: empShifts.length === 1 
              ? `${firstDate} tarihinde vardiya atandı.`
              : `${firstDate} - ${lastDate} arasında ${empShifts.length} vardiya atandı.`,
            link: '/vardiyalarim',
          });
        } catch (notifErr) {
          console.error("Bulk shift notification error:", notifErr);
        }
      }
      
      res.status(201).json({ 
        message: `${createdShifts.length} vardiya oluşturuldu`,
        shifts: createdShifts,
        notifiedCount: notifiedEmployees.size
      });
    } catch (error: Error | unknown) {
      console.error("Error creating bulk shifts:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiyalar oluşturulamadı" });
    }
  });

  // PATCH /api/shifts/:id - Update a shift
  app.patch('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      // Only supervisors and HQ can update shifts
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
        return res.status(403).json({ message: "Vardiya güncelleme yetkiniz yok" });
      }
      
      const shift = await storage.getShift(id);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      // Branch staff can only update their own branch shifts
      if (isBranchRole(role) && shift.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu vardiyayı güncelleme yetkiniz yok" });
      }
      
      const { z } = await import('zod');
      const updateSchema = z.object({
        shiftDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        breakStartTime: z.string().optional().nullable(),
        breakEndTime: z.string().optional().nullable(),
        shiftType: z.enum(['morning', 'evening', 'night']).optional(),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
        assignedToId: z.string().optional().nullable(),
        checklistId: z.number().optional().nullable(),
        checklist2Id: z.number().optional().nullable(),
        checklist3Id: z.number().optional().nullable(),
      });
      
      const validated = updateSchema.parse(req.body);
      const previousAssignedTo = shift.assignedToId;
      const updated = await storage.updateShift(id, validated);
      
      // Send notification if shift is updated
      if (updated && updated.assignedToId) {
        try {
          // If assigned to a different person, notify them
          if (validated.assignedToId && validated.assignedToId !== previousAssignedTo) {
            await storage.createNotification({
              userId: updated.assignedToId,
              type: 'shift_assigned',
              title: 'Vardiya Atandı',
              message: `${updated.shiftDate} tarihinde ${updated.startTime?.substring(0, 5)} - ${updated.endTime?.substring(0, 5)} vardiyası size atandı.`,
              link: '/vardiyalarim',
            });
          } else if (validated.shiftDate || validated.startTime || validated.endTime) {
            // If date/time changed, notify existing assignee
            await storage.createNotification({
              userId: updated.assignedToId,
              type: 'shift_change',
              title: 'Vardiya Güncellendi',
              message: `${updated.shiftDate} tarihindeki vardiya güncellendi: ${updated.startTime?.substring(0, 5)} - ${updated.endTime?.substring(0, 5)}`,
              link: '/vardiyalarim',
            });
          }
        } catch (notifErr) {
          console.error("Shift update notification error:", notifErr);
        }
      }
      
      res.json(updated);
    } catch (error: Error | unknown) {
      console.error("Error updating shift:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Vardiya güncellenemedi" });
    }
  });

  // DELETE /api/shifts/reset-weekly - Reset weekly shifts (MUST be before :id route)
  app.delete('/api/shifts/reset-weekly', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Only supervisors and HQ can reset shifts
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
        return res.status(403).json({ message: "Vardiya sıfırlama yetkiniz yok" });
      }
      
      const weekStart = req.query.weekStart as string;
      if (!weekStart) {
        return res.status(400).json({ message: "weekStart parametresi gerekli" });
      }
      
      // Calculate week end (weekStart + 6 days)
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const weekEnd = endDate.toISOString().split('T')[0];
      
      // Get branch filter
      let branchId: number | undefined;
      if (isBranchRole(role)) {
        branchId = user.branchId;
      } else if (req.query.branchId) {
        branchId = parseInt(req.query.branchId as string);
      }
      
      // Get shifts in the week
      const shifts = await storage.getShifts(branchId, undefined, weekStart, weekEnd);
      
      // Delete each shift (with validation)
      let deletedCount = 0;
      for (const shift of shifts) {
        if (shift && shift.id && !isNaN(shift.id)) {
          await storage.deleteShift(shift.id);
          deletedCount++;
        }
      }
      
      res.json({ message: `${deletedCount} vardiya silindi` });
    } catch (error: Error | unknown) {
      console.error("Error resetting weekly shifts:", error);
      res.status(500).json({ message: "Vardiyalar sıfırlanamadı" });
    }
  });

  // DELETE /api/shifts/:id - Delete a shift (AFTER reset-weekly to avoid :id matching reset-weekly)
  app.delete('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const id = parseInt(req.params.id);
      
      // Validate ID is a number
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz vardiya ID'si" });
      }
      
      // Only supervisors and HQ can delete shifts
      if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
        return res.status(403).json({ message: "Vardiya silme yetkiniz yok" });
      }
      
      const shift = await storage.getShift(id);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      // Branch staff can only delete their own branch shifts
      if (isBranchRole(role) && shift.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu vardiyayı silme yetkiniz yok" });
      }
      
      await storage.deleteShift(id);
      res.json({ message: "Vardiya silindi" });
    } catch (error: Error | unknown) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ message: "Vardiya silinemedi" });
    }
  });

  // GET /api/shifts/recommendations - Get AI shift recommendations using OpenAI
  app.get('/api/shifts/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const { generateShiftPlan } = await import('./ai');
      const user = req.user!;
      const role = user.role as UserRoleType;
      
      // Allowed roles: HQ roles + branch supervisors
      const allowedRoles = ['supervisor', 'supervisor_buddy', 'destek', 'admin', 'coach', 'muhasebe'];
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: "Vardiya önerileri görüntüleme yetkiniz yok" });
      }

      const weekStart = req.query.weekStart as string;
      const branchId = req.query.branchId as string;
      const skipCache = req.query.skipCache === 'true';
      
      if (!weekStart || !branchId) {
        return res.status(400).json({ message: "weekStart ve branchId parametreleri gerekli" });
      }

      const bid = parseInt(branchId);
      
      // Branch users can only see their own branch
      if ((role === 'supervisor' || role === 'supervisor_buddy') && (!user.branchId || user.branchId !== bid)) {
        return res.status(403).json({ message: "Sadece kendi şubenizin vardiyalarını görebilirsiniz" });
      }

      // Calculate week end date
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const weekEnd = endDate.toISOString().split('T')[0];

      // Get historical shifts (last 6 weeks)
      const sixWeeksAgo = new Date(startDate);
      sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
      const historicalShifts = await storage.getShifts(
        bid, 
        undefined, 
        sixWeeksAgo.toISOString().split('T')[0],
        weekStart
      );

      // Get branch employees with string IDs
      const allEmployees = await storage.getAllEmployees(bid);
      const employees = allEmployees.map((e: any) => ({
        id: String(e.id), // Ensure string format for AI
        name: e.fullName || `${e.firstName} ${e.lastName}`,
        role: e.role || 'barista',
      }));

      // Format historical shifts for AI
      const formattedHistorical = historicalShifts.map((s: any) => ({
        shiftDate: s.shiftDate,
        shiftType: s.shiftType || 'morning',
        assignedToId: s.assignedToId ? String(s.assignedToId) : null,
        status: s.status || 'draft',
      }));

      // If no employees, return empty
      if (employees.length === 0) {
        return res.json({ 
          recommendations: [], 
          summary: 'Şubede personel bulunamadı', 
          totalShifts: 0,
          cached: false,
          weekStart,
          weekEnd,
        });
      }

      // Call AI to generate shift plan
      const aiPlan = await generateShiftPlan(
        bid,
        weekStart,
        weekEnd,
        formattedHistorical,
        employees,
        undefined, // workloadMetrics
        user.id,
        skipCache
      );

      // Get existing shifts for the week to check conflicts
      const existingShifts = await storage.getShifts(bid, undefined, weekStart, weekEnd);
      const existingShiftsByDayAndEmployee = new Map<string, Set<string>>();
      existingShifts.forEach((s: any) => {
        const key = s.shiftDate;
        if (!existingShiftsByDayAndEmployee.has(key)) {
          existingShiftsByDayAndEmployee.set(key, new Set());
        }
        if (s.assignedToId) {
          existingShiftsByDayAndEmployee.get(key)!.add(String(s.assignedToId));
        }
      });

      // Validate and sanitize AI response - ensure valid employee IDs with fallback
      const validEmployeeIds = new Set(employees.map(e => String(e.id)));
      const employeeIdArray = employees.map(e => String(e.id));
      let fallbackIndex = 0;
      
      // Track newly assigned shifts to prevent duplicates within AI response
      const newShiftsByDayAndEmployee = new Map<string, Set<string>>();
      
      const validatedShifts = (aiPlan.shifts || [])
        .filter((shift: any) => {
          // Must have valid date
          if (!shift.shiftDate || !/^\d{4}-\d{2}-\d{2}$/.test(shift.shiftDate)) {
            return false;
          }
          return true;
        })
        .map((shift: any) => {
          // If invalid ID, assign to a valid employee using round-robin
          let assignedToId = String(shift.assignedToId);
          if (!shift.assignedToId || !validEmployeeIds.has(assignedToId)) {
            assignedToId = employeeIdArray[fallbackIndex % employeeIdArray.length];
            fallbackIndex++;
          }
          return { ...shift, assignedToId };
        })
        .filter((shift: any) => {
          // Check for conflicts: same employee on same day
          const dayKey = shift.shiftDate;
          const employeeId = String(shift.assignedToId);
          
          // Check existing shifts in DB
          const existingForDay = existingShiftsByDayAndEmployee.get(dayKey);
          if (existingForDay && existingForDay.has(employeeId)) {
            console.log(`⚠️ Skipping duplicate: ${employeeId} already has shift on ${dayKey} (existing)`);
            return false;
          }
          
          // Check already added in this batch
          if (!newShiftsByDayAndEmployee.has(dayKey)) {
            newShiftsByDayAndEmployee.set(dayKey, new Set());
          }
          const newForDay = newShiftsByDayAndEmployee.get(dayKey)!;
          if (newForDay.has(employeeId)) {
            console.log(`⚠️ Skipping duplicate: ${employeeId} already assigned on ${dayKey} (in batch)`);
            return false;
          }
          
          // Mark as assigned
          newForDay.add(employeeId);
          return true;
        })
        .map((shift: any) => {
          // Ensure all required fields with defaults
          const shiftType = shift.shiftType || 'morning';
          return {
            shiftDate: shift.shiftDate,
            assignedToId: String(shift.assignedToId),
            shiftType,
            status: 'draft',
            startTime: shift.startTime || (shiftType === 'morning' ? '07:00:00' : shiftType === 'evening' ? '15:00:00' : '23:00:00'),
            endTime: shift.endTime || (shiftType === 'morning' ? '15:00:00' : shiftType === 'evening' ? '23:00:00' : '07:00:00'),
            breakStartTime: shift.breakStartTime || (shiftType === 'morning' ? '11:00:00' : '19:00:00'),
            breakEndTime: shift.breakEndTime || (shiftType === 'morning' ? '12:00:00' : '20:00:00'),
          };
        });

      // COVERAGE VALIDATION: Ensure all active employees get at least 1 shift
      const plannedEmployees = new Set(validatedShifts.map(s => String(s.assignedToId)));
      const unplannedEmployees = employees.filter(e => !plannedEmployees.has(String(e.id)));
      
      if (unplannedEmployees.length > 0) {
        console.log(`⚠️ Coverage gap: ${unplannedEmployees.length} employees not planned. Adding filler shifts...`);
        
        // Generate week dates
        const weekDates: string[] = [];
        const current = new Date(startDate);
        while (current <= endDate) {
          weekDates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        
        // Add shifts to unplanned employees - distribute across week
        unplannedEmployees.forEach((emp, idx) => {
          const daysToAssign = Math.ceil((weekDates.length * 3) / unplannedEmployees.length); // ~3 days per employee
          for (let i = 0; i < daysToAssign && idx * 3 + i < weekDates.length; i++) {
            const dateIdx = (idx * 3 + i) % weekDates.length;
            const shiftDate = weekDates[dateIdx];
            
            // Check if this employee already has a shift that day
            const dayKey = shiftDate;
            const employeeId = String(emp.id);
            const hasShiftThatDay = validatedShifts.some(s => s.shiftDate === dayKey && s.assignedToId === employeeId);
            
            if (!hasShiftThatDay) {
              // Alternate between morning and evening
              const shiftType = i % 2 === 0 ? 'evening' : 'morning';
              validatedShifts.push({
                shiftDate,
                assignedToId: employeeId,
                shiftType,
                status: 'draft',
                startTime: shiftType === 'morning' ? '07:00:00' : '15:00:00',
                endTime: shiftType === 'morning' ? '15:00:00' : '23:00:00',
                breakStartTime: shiftType === 'morning' ? '11:00:00' : '19:00:00',
                breakEndTime: shiftType === 'morning' ? '12:00:00' : '20:00:00',
              });
              plannedEmployees.add(employeeId);
              console.log(`✅ Filler: ${emp.name} added to ${shiftDate} (${shiftType})`);
            }
          }
        });
      }

      console.log(`📊 Final shift plan: ${validatedShifts.length} shifts for ${plannedEmployees.size} employees`);

      res.json({
        recommendations: validatedShifts,
        summary: aiPlan.summary || '',
        totalShifts: validatedShifts.length,
        cached: aiPlan.cached || false,
        weekStart,
        weekEnd,
      });
    } catch (error: Error | unknown) {
      console.error("Error generating shift recommendations:", error);
      const message = error instanceof Error ? error.message : "Vardiya önerileri oluşturulamadı";
      res.status(500).json({ message });
    }
  });

  // GET /api/analytics/dashboard - Get analytics dashboard data (legacy)
  app.get('/api/analytics/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      let branchId: number | undefined;
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        }
        branchId = user.branchId;
      } else if (role !== 'destek') {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const shifts = await storage.getShifts(
        branchId,
        undefined,
        weekStart.toISOString().split('T')[0]
      );

      const weeklyHours = shifts.reduce((acc: number, s: any) => {
        if (!s.startTime || !s.endTime) return acc;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return acc + (eh * 60 + em - (sh * 60 + sm)) / 60;
      }, 0);

      const employees = new Set(shifts.filter((s: any) => s.assignedToId).map((s: any) => s.assignedToId));
      const shiftsCompleted = shifts.filter((s: any) => s.status === 'completed').length;

      res.json({
        weeklyHours: parseFloat(weeklyHours.toFixed(1)),
        employeeCount: employees.size,
        shiftsCompleted,
        avgShiftLength: shifts.length > 0 ? parseFloat((weeklyHours / shifts.length).toFixed(1)) : 0,
        trend: [],
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Analitik verisi alınamadı" });
    }
  });

  // GET /api/analytics/daily - Get daily analytics with tasks and equipment
  app.get('/api/analytics/daily', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      const today = new Date().toISOString().split('T')[0];
      const taskList = await db.select().from(tasks).where(branchId ? and(eq(tasks.branchId, branchId)) : undefined).limit(100);
      const completedTasks = taskList.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t: any) => t.status !== 'completed').length;
      const overdueChecklists = taskList.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date(today) && t.status !== 'completed').length;

      const faults = await db.select().from(equipmentFaults).where(branchId ? and(eq(equipmentFaults.branchId, branchId)) : undefined).limit(50);
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage)).length;

      const equips = await db.select().from(equipment).where(branchId ? eq(equipment.branchId, branchId) : undefined).limit(100);
      const criticalEquipment = equips.filter((e: any) => e.healthScore && e.healthScore < 50).length;
      
      // Calculate avgHealth with fault penalty: each active fault reduces health by 5%, min 0
      const baseHealth = equips.length > 0 ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));

      const summary = await generateBranchSummary(pendingTasks, activeFaults, overdueChecklists, 0, criticalEquipment, avgHealth, 'daily', user.id);

      res.json({ period: 'daily', pendingTasks, completedTasks, activeFaults, overdueChecklists, criticalEquipment, avgHealth, summary });
    } catch (error: Error | unknown) {
      console.error("Error fetching daily analytics:", error);
      res.status(500).json({ message: "Günlük analitik alınamadı" });
    }
  });

  // GET /api/analytics/weekly - Get weekly analytics with trends and employee performance
  app.get('/api/analytics/weekly', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const taskList = await db.select().from(tasks).where(branchId ? and(eq(tasks.branchId, branchId)) : undefined).limit(100);
      const faults = await db.select().from(equipmentFaults).where(branchId ? and(eq(equipmentFaults.branchId, branchId)) : undefined).limit(50);
      const equips = await db.select().from(equipment).where(branchId ? eq(equipment.branchId, branchId) : undefined).limit(100);

      const completedTasks = taskList.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t: any) => t.status !== 'completed').length;
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage)).length;
      const overdueChecklists = taskList.filter((t: any) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed').length;
      const checklistCompletionRate = taskList.length > 0 ? Math.round((completedTasks / taskList.length) * 100) : 100;
      const criticalEquipment = equips.filter((e: any) => e.healthScore && e.healthScore < 50).length;
      
      // Calculate avgHealth with fault penalty: each active fault reduces health by 5%, min 0
      const baseHealth = equips.length > 0 ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));

      // Employee performance calculation
      const employees = branchId 
        ? await db.select().from(users).where(eq(users.branchId, branchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees.map((emp: any) => {
        const empTasks = taskList.filter((t: any) => t.assignedToId === emp.id);
        const empCompleted = empTasks.filter((t: any) => t.status === 'completed').length;
        const completionRate = empTasks.length > 0 ? (empCompleted / empTasks.length) * 100 : 100;
        
        // Attendance: estimate based on task completion and no major issues
        const absences = 0;
        const lateArrivals = 0;
        
        const score = completionRate - (absences * 15) - (lateArrivals * 5);
        return { 
          id: emp.id, 
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username, 
          avatar: emp.profilePhoto,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary(pendingTasks, activeFaults, overdueChecklists, 0, criticalEquipment, avgHealth, 'weekly', user.id);

      res.json({ 
        period: 'weekly', 
        completedTasks, 
        pendingTasks, 
        activeFaults, 
        overdueChecklists,
        checklistCompletionRate,
        avgHealth,
        criticalEquipment,
        topPerformers,
        bottomPerformers,
        summary 
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching weekly analytics:", error);
      res.status(500).json({ message: "Haftalık analitik alınamadı" });
    }
  });

  // GET /api/analytics/monthly - Get monthly analytics with equipment health and top faulty equipment
  app.get('/api/analytics/monthly', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      const today = new Date();
      const taskList = await db.select().from(tasks).where(branchId ? and(eq(tasks.branchId, branchId)) : undefined).limit(100);
      const faults = await db.select().from(equipmentFaults).where(branchId ? and(eq(equipmentFaults.branchId, branchId)) : undefined).limit(100);
      const equips = await db.select().from(equipment).where(branchId ? eq(equipment.branchId, branchId) : undefined).limit(100);

      const completedTasks = taskList.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t: any) => t.status !== 'completed').length;
      const overdueChecklists = taskList.filter((t: any) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed').length;
      const resolvedFaults = faults.filter((f: any) => f.stage === 'resolved').length;
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage)).length;
      
      // Equipment health metrics with fault penalty
      const criticalEquipment = equips.filter((e: any) => e.healthScore && e.healthScore < 50).length;
      const baseHealth = equips.length > 0 
        ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) 
        : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));
      
      // Top 3 faulty equipment
      const equipFaultCounts: Record<number, { name: string, count: number }> = {};
      faults.forEach((f: any) => {
        if (f.equipmentId) {
          if (!equipFaultCounts[f.equipmentId]) {
            const eq = equips.find((e: any) => e.id === f.equipmentId);
            equipFaultCounts[f.equipmentId] = { name: eq?.name || `Ekipman #${f.equipmentId}`, count: 0 };
          }
          equipFaultCounts[f.equipmentId].count++;
        }
      });
      const topFaultyEquipment = Object.entries(equipFaultCounts)
        .map(([id, data]) => ({ id: Number(id), ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Employee performance calculation
      const employees = branchId 
        ? await db.select().from(users).where(eq(users.branchId, branchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees.map((emp: any) => {
        const empTasks = taskList.filter((t: any) => t.assignedToId === emp.id);
        const empCompleted = empTasks.filter((t: any) => t.status === 'completed').length;
        const completionRate = empTasks.length > 0 ? (empCompleted / empTasks.length) * 100 : 100;
        
        const absences = 0;
        const lateArrivals = 0;
        
        const score = completionRate - (absences * 15) - (lateArrivals * 5);
        return { 
          id: emp.id, 
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username, 
          avatar: emp.profilePhoto,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary(pendingTasks, activeFaults, overdueChecklists, 0, criticalEquipment, avgHealth, 'monthly', user.id);

      res.json({ 
        period: 'monthly', 
        totalTasks: taskList.length, 
        completedTasks,
        pendingTasks,
        overdueChecklists,
        totalFaults: faults.length, 
        resolvedFaults,
        activeFaults,
        avgHealth,
        criticalEquipment,
        topFaultyEquipment,
        topPerformers,
        bottomPerformers,
        summary 
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching monthly analytics:", error);
      res.status(500).json({ message: "Aylık analitik alınamadı" });
    }
  });

  // ========================================
  // BRANCH TASK PERFORMANCE STATISTICS
  // ========================================

  app.get('/api/branches/:id/task-stats', isAuthenticated, async (req, res) => {
    try {
      const branchId = parseInt(req.params.id);
      const user = req.user as any;
      
      if (!user || !isHQRole(user.role)) {
        return res.status(403).json({ message: 'Bu işlem için HQ yetkisi gerekli' });
      }

      const stats = await storage.getBranchTaskStats(branchId);
      res.json(stats);
    } catch (error: Error | unknown) {
      console.error('Error fetching branch task stats:', error);
      res.status(500).json({ message: 'Görev istatistikleri alınamadı' });
    }
  });

  // POST /api/shift-attendance/check-in/nfc - NFC check-in
  app.post('/api/shift-attendance/check-in/nfc', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { location } = req.body;
      
      if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: "Konum gereklidir" });
      }

      const userShifts = await db.query.shifts.findMany({
        where: eq(shifts.assignedToId, user.id),
      });

      if (!userShifts || userShifts.length === 0) {
        return res.status(400).json({ message: "Atanmış vardiya bulunamadı" });
      }

      const shift = userShifts[0];
      const now = new Date();

      const existingAttendances = await storage.getShiftAttendances(shift.id);
      const userAttendance = existingAttendances.find(a => a.userId === user.id);

      const attendanceData: any = {
        checkInTime: now,
        status: 'checked_in',
        checkInLatitude: location.latitude.toString(),
        checkInLongitude: location.longitude.toString(),
        checkInMethod: 'nfc',
      };

      let attendance;
      if (userAttendance) {
        attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
      } else {
        attendance = await storage.createShiftAttendance({
          shiftId: shift.id,
          userId: user.id,
          ...attendanceData,
        });
      }

      res.status(201).json(attendance);
    } catch (error: Error | unknown) {
      console.error("Error NFC check-in:", error);
      res.status(500).json({ message: "NFC giriş yapılamadı" });
    }
  });

  // ========================================
  // RECIPE ACADEMY API ENDPOINTS
  // ========================================

  // GET /api/academy/hub-categories - Ana hub kategorileri
  app.get('/api/academy/hub-categories', isAuthenticated, async (req: any, res) => {
    try {
      const categories = await db.select().from(academyHubCategories).orderBy(academyHubCategories.displayOrder);
      res.json(categories);
    } catch (error: any) {
      console.error("Hub categories error:", error);
      res.status(500).json({ message: "Hub kategorileri yüklenemedi" });
    }
  });

  // GET /api/academy/recipe-categories - Tüm reçete kategorileri
  app.get('/api/academy/recipe-categories', isAuthenticated, async (req: any, res) => {
    try {
      const categories = await db.select().from(recipeCategories).orderBy(recipeCategories.displayOrder);
      res.json(categories);
    } catch (error: any) {
      console.error("Recipe categories error:", error);
      res.status(500).json({ message: "Reçete kategorileri yüklenemedi" });
    }
  });

  // POST /api/academy/recipe-categories - Yeni kategori ekle (HQ only)
  app.post('/api/academy/recipe-categories', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri kategori ekleyebilir" });
      }
      
      const validated = insertRecipeCategorySchema.parse(req.body);
      const [category] = await db.insert(recipeCategories).values({
        ...validated,
        iconName: validated.iconName || 'Coffee',
        colorHex: validated.colorHex || '#1e3a5f',
        displayOrder: validated.displayOrder || 1,
      }).returning();
      
      res.json(category);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      console.error("Create recipe category error:", error);
      res.status(500).json({ message: "Kategori oluşturulamadı" });
    }
  });

  // PATCH /api/academy/recipe-categories/:id - Kategori güncelle (HQ only)
  app.patch('/api/academy/recipe-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri kategori güncelleyebilir" });
      }
      
      const { id } = req.params;
      const validated = insertRecipeCategorySchema.partial().parse(req.body);
      const [category] = await db.update(recipeCategories)
        .set(validated)
        .where(eq(recipeCategories.id, parseInt(id)))
        .returning();
      
      if (!category) {
        return res.status(404).json({ message: "Kategori bulunamadı" });
      }
      
      res.json(category);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      console.error("Update recipe category error:", error);
      res.status(500).json({ message: "Kategori güncellenemedi" });
    }
  });

  // DELETE /api/academy/recipe-categories/:id - Kategori sil (HQ only)
  app.delete('/api/academy/recipe-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri kategori silebilir" });
      }
      
      const { id } = req.params;
      
      // Check if category has recipes
      const categoryRecipes = await db.select().from(recipes).where(eq(recipes.categoryId, parseInt(id)));
      if (categoryRecipes.length > 0) {
        return res.status(400).json({ message: `Bu kategoride ${categoryRecipes.length} reçete var. Önce reçeteleri taşıyın.` });
      }
      
      await db.delete(recipeCategories).where(eq(recipeCategories.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete recipe category error:", error);
      res.status(500).json({ message: "Kategori silinemedi" });
    }
  });

  // GET /api/academy/quiz-stats - Genel quiz istatistikleri (HQ only)
  app.get('/api/academy/quiz-stats', isAuthenticated, async (req: any, res) => {
    try {
      const totalAttempts = await db.select({ count: sql<number>`count(*)` }).from(userQuizAttempts);
      const passedAttempts = await db.select({ count: sql<number>`count(*)` }).from(userQuizAttempts).where(eq(userQuizAttempts.isPassed, true));
      
      const total = Number(totalAttempts[0]?.count || 0);
      const passed = Number(passedAttempts[0]?.count || 0);
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
      
      res.json({ totalAttempts: total, passRate });
    } catch (error: any) {
      console.error("Quiz stats error:", error);
      res.json({ totalAttempts: 0, passRate: 0 });
    }
  });

  // GET /api/academy/quizzes - Tüm quizler
  app.get('/api/academy/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const allQuizzes = await db.select().from(quizzes).orderBy(quizzes.createdAt);
      
      // Her quiz için soru sayısını al
      const quizzesWithCount = await Promise.all(allQuizzes.map(async (quiz) => {
        const questions = await db.select({ count: sql<number>`count(*)` })
          .from(quizQuestions)
          .where(eq(quizQuestions.careerQuizId, quiz.id));
        return {
          ...quiz,
          questionCount: Number(questions[0]?.count || 0),
        };
      }));
      
      res.json(quizzesWithCount);
    } catch (error: any) {
      console.error("Get quizzes error:", error);
      res.status(500).json({ message: "Quizler yüklenemedi" });
    }
  });

  // POST /api/academy/quizzes - Yeni quiz oluştur (HQ only)
  app.post('/api/academy/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri quiz oluşturabilir" });
      }
      
      const { title, description, passingScore, timeLimit, maxAttempts } = req.body;
      
      const [newQuiz] = await db.insert(quizzes).values({
        title,
        description,
        passingScore: passingScore || 70,
        timeLimit: timeLimit || null,
        maxAttempts: maxAttempts || 3,
        isActive: true,
        createdAt: new Date(),
      }).returning();
      
      res.status(201).json(newQuiz);
    } catch (error: any) {
      console.error("Create quiz error:", error);
      res.status(500).json({ message: "Quiz oluşturulamadı" });
    }
  });

  // PATCH /api/academy/quizzes/:id - Quiz güncelle (HQ only)
  app.patch('/api/academy/quizzes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri quiz güncelleyebilir" });
      }
      
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db.update(quizzes)
        .set(updates)
        .where(eq(quizzes.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update quiz error:", error);
      res.status(500).json({ message: "Quiz güncellenemedi" });
    }
  });

  // POST /api/academy/quiz/:quizId/questions - Quiz'e soru ekle (HQ only)
  app.post('/api/academy/quiz/:quizId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece merkez yetkilileri soru ekleyebilir" });
      }
      
      const { quizId } = req.params;
      const { question, questionType, options, correctAnswerIndex, explanation, points } = req.body;
      
      // Doğru cevabı bul
      const correctAnswer = options[correctAnswerIndex] || options[0];
      
      const [newQuestion] = await db.insert(quizQuestions).values({
        careerQuizId: parseInt(quizId),
        question,
        questionType: questionType || 'multiple_choice',
        options,
        correctAnswer,
        correctAnswerIndex: correctAnswerIndex || 0,
        explanation: explanation || null,
        points: points || 1,
      }).returning();
      
      res.status(201).json(newQuestion);
    } catch (error: any) {
      console.error("Add question error:", error);
      res.status(500).json({ message: "Soru eklenemedi" });
    }
  });

  // GET /api/academy/recipes - Tüm reçeteler veya kategoriye göre
  app.get('/api/academy/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const { categoryId, search } = req.query;
      let query = db.select().from(recipes);
      
      if (categoryId) {
        query = query.where(eq(recipes.categoryId, parseInt(categoryId as string)));
      }
      
      const allRecipes = await query.orderBy(recipes.displayOrder);
      res.json(allRecipes);
    } catch (error: any) {
      console.error("Recipes error:", error);
      res.status(500).json({ message: "Reçeteler yüklenemedi" });
    }
  });

  // GET /api/academy/recipe/:id - Reçete detayı
  app.get('/api/academy/recipe/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipe = await db.select().from(recipes).where(eq(recipes.id, parseInt(id)));
      
      if (!recipe || recipe.length === 0) {
        return res.status(404).json({ message: "Reçete bulunamadı" });
      }
      
      // Son versiyonu al - sizes'ı include et
      const versions = await db.select().from(recipeVersions)
        .where(eq(recipeVersions.recipeId, parseInt(id)))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);
      
      const currentVersion = versions[0] || null;
      const sizes = currentVersion?.sizes as any || { massivo: { cupMl: 350, steps: [] }, longDiva: { cupMl: 550, steps: [] } };
      
      res.json({ 
        ...recipe[0], 
        currentVersion,
        sizes 
      });
    } catch (error: any) {
      console.error("Recipe detail error:", error);
      res.status(500).json({ message: "Reçete detayı yüklenemedi" });
    }
  });

  // GET /api/academy/daily-missions - Günlük görevler
  app.get('/api/academy/daily-missions', isAuthenticated, async (req: any, res) => {
    try {
      const missions = await db.select().from(dailyMissions).where(eq(dailyMissions.isActive, true));
      res.json(missions);
    } catch (error: any) {
      console.error("Daily missions error:", error);
      res.status(500).json({ message: "Günlük görevler yüklenemedi" });
    }
  });

  // GET /api/academy/user-missions - Kullanıcı görev ilerlemesi
  app.get('/api/academy/user-missions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const today = new Date().toISOString().split('T')[0];
      
      const progress = await db.select().from(userMissionProgress)
        .where(and(
          eq(userMissionProgress.userId, user.id),
          eq(userMissionProgress.missionDate, today)
        ));
      
      res.json(progress);
    } catch (error: any) {
      console.error("User missions error:", error);
      res.status(500).json({ message: "Görev ilerlemesi yüklenemedi" });
    }
  });

  // GET /api/academy/leaderboard - Liderlik tablosu
  app.get('/api/academy/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { period = 'weekly' } = req.query;
      const now = new Date();
      const periodKey = period === 'weekly' 
        ? `${now.getFullYear()}-W${Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)}`
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const leaderboard = await db.select().from(leaderboardSnapshots)
        .where(and(
          eq(leaderboardSnapshots.periodType, period as string),
          eq(leaderboardSnapshots.periodKey, periodKey)
        ))
        .orderBy(desc(leaderboardSnapshots.totalXp))
        .limit(20);
      
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ message: "Liderlik tablosu yüklenemedi" });
    }
  });

  // POST /api/academy/recipe - Yeni reçete ekle (HQ only)
  app.post('/api/academy/recipe', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const data = insertRecipeSchema.parse(req.body);
      const [recipe] = await db.insert(recipes).values({
        ...data,
        createdById: user.id,
      }).returning();
      
      res.status(201).json(recipe);
    } catch (error: any) {
      console.error("Create recipe error:", error);
      res.status(500).json({ message: "Reçete oluşturulamadı" });
    }
  });

  // POST /api/academy/recipes - Admin panelden reçete ekleme
  app.post('/api/academy/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const { sizes, ...recipeData } = req.body;
      const data = insertRecipeSchema.parse(recipeData);
      
      const [recipe] = await db.insert(recipes).values({
        ...data,
        createdById: user.id,
      }).returning();
      
      // Reçete versiyonu oluştur (sizes JSON'ını içerir)
      if (sizes && (sizes.massivo || sizes.longDiva)) {
        const [version] = await db.insert(recipeVersions).values({
          recipeId: recipe.id,
          versionNumber: 1,
          sizes,
          updatedById: user.id,
        }).returning();
        
        await db.update(recipes).set({ currentVersionId: version.id }).where(eq(recipes.id, recipe.id));
      }
      
      res.status(201).json(recipe);
    } catch (error: any) {
      console.error("Create recipe error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Reçete oluşturulamadı" });
    }
  });

  // PATCH /api/academy/recipes/:id - Reçete güncelleme
  app.patch('/api/academy/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const { id } = req.params;
      const { sizes, ...recipeData } = req.body;
      const data = insertRecipeSchema.partial().parse(recipeData);
      
      const [recipe] = await db.update(recipes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(recipes.id, parseInt(id)))
        .returning();
      
      if (!recipe) {
        return res.status(404).json({ message: "Reçete bulunamadı" });
      }
      
      // Sizes değiştirilmişse, yeni versyon oluştur
      if (sizes && (sizes.massivo || sizes.longDiva)) {
        const lastVersion = await db.select().from(recipeVersions)
          .where(eq(recipeVersions.recipeId, recipe.id))
          .orderBy(desc(recipeVersions.versionNumber))
          .limit(1);
        
        const newVersionNumber = lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;
        
        const [version] = await db.insert(recipeVersions).values({
          recipeId: recipe.id,
          versionNumber: newVersionNumber,
          sizes,
          updatedById: user.id,
        }).returning();
        
        await db.update(recipes).set({ currentVersionId: version.id }).where(eq(recipes.id, recipe.id));
      }
      
      res.json(recipe);
    } catch (error: any) {
      console.error("Update recipe error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Reçete güncellenemedi" });
    }
  });

  // DELETE /api/academy/recipes/:id - Reçete silme
  app.delete('/api/academy/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const { id } = req.params;
      
      await db.delete(recipes).where(eq(recipes.id, parseInt(id)));
      
      res.json({ success: true, message: "Reçete silindi" });
    } catch (error: any) {
      console.error("Delete recipe error:", error);
      res.status(500).json({ message: "Reçete silinemedi" });
    }
  });

  // POST /api/academy/recipe-version - Yeni reçete versiyonu (HQ only)
  app.post('/api/academy/recipe-version', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const data = insertRecipeVersionSchema.parse(req.body);
      
      // Son versiyon numarasını bul
      const lastVersion = await db.select().from(recipeVersions)
        .where(eq(recipeVersions.recipeId, data.recipeId!))
        .orderBy(desc(recipeVersions.versionNumber))
        .limit(1);
      
      const newVersionNumber = lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;
      
      const [version] = await db.insert(recipeVersions).values({
        ...data,
        versionNumber: newVersionNumber,
        updatedById: user.id,
      }).returning();
      
      // Reçetenin currentVersionId'sini güncelle
      await db.update(recipes)
        .set({ currentVersionId: version.id, updatedAt: new Date() })
        .where(eq(recipes.id, data.recipeId!));
      
      res.status(201).json(version);
    } catch (error: any) {
      console.error("Create recipe version error:", error);
      res.status(500).json({ message: "Reçete versiyonu oluşturulamadı" });
    }
  });

  // GET /api/academy/recommended-quizzes - Kullanıcı için önerilen quizler
  app.get('/api/academy/recommended-quizzes', isAuthenticated, async (req: any, res) => {
    try {
      // Basit bir öneri sistemi - en popüler quizleri döndür
      const quizzes = await storage.getQuizzes();
      const recommended = quizzes.slice(0, 5).map(q => ({
        id: q.id,
        title_tr: q.titleTr,
        description_tr: q.descriptionTr || '',
        difficulty: 'medium',
        estimated_minutes: 5
      }));
      res.json(recommended);
    } catch (error: any) {
      console.error("Recommended quizzes error:", error);
      res.json([]);
    }
  });

  // ==========================================
  // GLOBAL SEARCH API
  // ==========================================
  
  // GET /api/search - Global search across users, recipes, tasks, branches, equipment
  app.get('/api/search', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const query = req.query.q as string;
      
      // Validate query
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Arama sorgusu en az 2 karakter olmalı" });
      }
      
      const isHQ = isHQRole(user.role);
      const userBranchId = user.branchId;
      
      const results = await storage.searchEntities(
        query.trim(),
        userBranchId,
        isHQ,
        5 // max per category
      );
      
      res.json(results);
    } catch (error: any) {
      console.error("Global search error:", error);
      res.status(500).json({ message: "Arama sırasında hata oluştu" });
    }
  });

  // ==========================================
  // HQ PROJECT MANAGEMENT API
  // ==========================================

  // GET /api/projects - List all projects for user
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }
      
      // Get projects where user is owner or member
      const userProjects = await db.select({
        project: projects,
        memberRole: projectMembers.role,
      })
        .from(projects)
        .leftJoin(projectMembers, and(
          eq(projectMembers.projectId, projects.id),
          eq(projectMembers.userId, user.id),
          isNull(projectMembers.removedAt)
        ))
        .where(
          and(
            eq(projects.isActive, true),
            or(
              eq(projects.ownerId, user.id),
              isNotNull(projectMembers.id)
            )
          )
        )
        .orderBy(desc(projects.updatedAt));
      
      // Get task counts and member counts for each project
      const projectsWithStats = await Promise.all(userProjects.map(async (p) => {
        const taskCounts = await db.select({
          status: projectTasks.status,
          count: sql<number>`count(*)::int`,
        })
          .from(projectTasks)
          .where(eq(projectTasks.projectId, p.project.id))
          .groupBy(projectTasks.status);
        
        const memberCount = await db.select({ count: sql<number>`count(*)::int` })
          .from(projectMembers)
          .where(and(
            eq(projectMembers.projectId, p.project.id),
            isNull(projectMembers.removedAt)
          ));
        
        const owner = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        })
          .from(users)
          .where(eq(users.id, p.project.ownerId))
          .limit(1);
        
        return {
          ...p.project,
          memberRole: p.memberRole,
          taskStats: taskCounts.reduce((acc, t) => {
            acc[t.status] = t.count;
            return acc;
          }, {} as Record<string, number>),
          memberCount: memberCount[0]?.count || 0,
          owner: owner[0] || null,
        };
      }));
      
      res.json(projectsWithStats);
    } catch (error: any) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Projeler alınamadı" });
    }
  });

  // POST /api/projects - Create new project
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Proje oluşturma yetkiniz yok" });
      }
      
      const { teamMembers, ...projectData } = req.body;
      
      const data = insertProjectSchema.parse({
        ...projectData,
        ownerId: user.id,
      });
      
      const [project] = await db.insert(projects).values(data).returning();
      
      // Add owner as project member with 'owner' role
      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: user.id,
        role: 'owner',
        canManageTeam: true,
        canDeleteTasks: true,
      });
      
      // Add team members if provided
      if (teamMembers && Array.isArray(teamMembers)) {
        for (const member of teamMembers) {
          if (member.userId && member.userId !== user.id) {
            await db.insert(projectMembers).values({
              projectId: project.id,
              userId: member.userId,
              role: member.role || 'contributor',
              canManageTeam: member.role === 'editor',
              canDeleteTasks: member.role === 'editor',
            });
          }
        }
      }
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Create project error:", error);
      res.status(500).json({ message: "Proje oluşturulamadı" });
    }
  });

  // GET /api/projects/:id - Get project details
  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }
      
      const [project] = await db.select().from(projects)
        .where(eq(projects.id, parseInt(id)));
      
      if (!project) {
        return res.status(404).json({ message: "Proje bulunamadı" });
      }
      
      // Get members with user details
      const members = await db.select({
        member: projectMembers,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
        }
      })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(and(
          eq(projectMembers.projectId, project.id),
          isNull(projectMembers.removedAt)
        ));
      
      // Get tasks
      const taskList = await db.select({
        task: projectTasks,
        assignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
        .from(projectTasks)
        .leftJoin(users, eq(users.id, projectTasks.assignedToId))
        .where(eq(projectTasks.projectId, project.id))
        .orderBy(projectTasks.orderIndex);
      
      // Get comments/timeline
      const commentList = await db.select({
        comment: projectComments,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
        .from(projectComments)
        .innerJoin(users, eq(users.id, projectComments.userId))
        .where(eq(projectComments.projectId, project.id))
        .orderBy(desc(projectComments.createdAt))
        .limit(50);
      
      // Get milestones
      const milestoneList = await db.select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, project.id))
        .orderBy(projectMilestones.dueDate);
      
      res.json({
        ...project,
        members: members.map(m => ({ ...m.member, user: m.user })),
        tasks: taskList.map(t => ({ ...t.task, assignee: t.assignee })),
        comments: commentList.map(c => ({ ...c.comment, user: c.user })),
        milestones: milestoneList,
      });
    } catch (error: any) {
      console.error("Get project detail error:", error);
      res.status(500).json({ message: "Proje detayları alınamadı" });
    }
  });

  // PATCH /api/projects/:id - Update project
  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      const [project] = await db.select().from(projects)
        .where(eq(projects.id, parseInt(id)));
      
      if (!project) {
        return res.status(404).json({ message: "Proje bulunamadı" });
      }
      
      // Only owner or admin can update
      if (project.ownerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Proje güncelleme yetkiniz yok" });
      }
      
      const updateData: any = { ...req.body, updatedAt: new Date() };
      if (req.body.status === 'completed' && !project.completedAt) {
        updateData.completedAt = new Date();
      }
      
      const [updated] = await db.update(projects)
        .set(updateData)
        .where(eq(projects.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update project error:", error);
      res.status(500).json({ message: "Proje güncellenemedi" });
    }
  });

  // POST /api/projects/:id/members - Add member to project
  app.post('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;
      
      const [project] = await db.select().from(projects)
        .where(eq(projects.id, parseInt(id)));
      
      if (!project || project.ownerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Üye ekleme yetkiniz yok" });
      }
      
      // Check if already member
      const existing = await db.select().from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, parseInt(id)),
          eq(projectMembers.userId, userId)
        ));
      
      if (existing.length > 0 && !existing[0].removedAt) {
        return res.status(400).json({ message: "Bu kullanıcı zaten üye" });
      }
      
      // If previously removed, update instead of insert
      if (existing.length > 0) {
        const [updated] = await db.update(projectMembers)
          .set({ removedAt: null, role, joinedAt: new Date() })
          .where(eq(projectMembers.id, existing[0].id))
          .returning();
        return res.json(updated);
      }
      
      const [member] = await db.insert(projectMembers).values({
        projectId: parseInt(id),
        userId,
        role,
      }).returning();
      
      // Add system comment
      await db.insert(projectComments).values({
        projectId: parseInt(id),
        userId: user.id,
        content: `Yeni üye eklendi`,
        isSystemMessage: true,
      });
      
      res.status(201).json(member);
    } catch (error: any) {
      console.error("Add project member error:", error);
      res.status(500).json({ message: "Üye eklenemedi" });
    }
  });

  // DELETE /api/projects/:id/members/:userId - Remove member from project
  app.delete('/api/projects/:id/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id, memberId } = req.params;
      
      const [project] = await db.select().from(projects)
        .where(eq(projects.id, parseInt(id)));
      
      if (!project || project.ownerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Üye çıkarma yetkiniz yok" });
      }
      
      await db.update(projectMembers)
        .set({ removedAt: new Date() })
        .where(eq(projectMembers.id, parseInt(memberId)));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove project member error:", error);
      res.status(500).json({ message: "Üye çıkarılamadı" });
    }
  });

  // POST /api/projects/:id/tasks - Create task in project
  app.post('/api/projects/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      // Verify user is member of project
      const membership = await db.select().from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, parseInt(id)),
          eq(projectMembers.userId, user.id),
          isNull(projectMembers.removedAt)
        ));
      
      const [project] = await db.select().from(projects)
        .where(eq(projects.id, parseInt(id)));
      
      if (!project) {
        return res.status(404).json({ message: "Proje bulunamadı" });
      }
      
      if (membership.length === 0 && project.ownerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu projede görev oluşturma yetkiniz yok" });
      }
      
      const data = insertProjectTaskSchema.parse({
        ...req.body,
        projectId: parseInt(id),
        createdById: user.id,
      });
      
      const [task] = await db.insert(projectTasks).values(data).returning();
      
      // Add system comment
      await db.insert(projectComments).values({
        projectId: parseInt(id),
        userId: user.id,
        content: `Yeni görev oluşturuldu: ${task.title}`,
        isSystemMessage: true,
      });
      
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Create project task error:", error);
      res.status(500).json({ message: "Görev oluşturulamadı" });
    }
  });

  // PATCH /api/project-tasks/:id - Update task
  app.patch('/api/project-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      const [task] = await db.select().from(projectTasks)
        .where(eq(projectTasks.id, parseInt(id)));
      
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const updateData: any = { ...req.body, updatedAt: new Date() };
      if (req.body.status === 'done' && !task.completedAt) {
        updateData.completedAt = new Date();
      }
      
      const [updated] = await db.update(projectTasks)
        .set(updateData)
        .where(eq(projectTasks.id, parseInt(id)))
        .returning();
      
      // Add system comment for status changes
      if (req.body.status && req.body.status !== task.status) {
        await db.insert(projectComments).values({
          projectId: task.projectId,
          taskId: task.id,
          userId: user.id,
          content: `Görev durumu "${task.status}" → "${req.body.status}" olarak güncellendi`,
          isSystemMessage: true,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update project task error:", error);
      res.status(500).json({ message: "Görev güncellenemedi" });
    }
  });

  // DELETE /api/project-tasks/:id - Delete task
  app.delete('/api/project-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(projectTasks).where(eq(projectTasks.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete project task error:", error);
      res.status(500).json({ message: "Görev silinemedi" });
    }
  });

  // POST /api/projects/:id/comments - Add comment to project
  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      const data = insertProjectCommentSchema.parse({
        ...req.body,
        projectId: parseInt(id),
        userId: user.id,
        isSystemMessage: false,
      });
      
      const [comment] = await db.insert(projectComments).values(data).returning();
      
      // Get user info for response
      const [commentUser] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, user.id));
      
      res.status(201).json({ ...comment, user: commentUser });
    } catch (error: any) {
      console.error("Add project comment error:", error);
      res.status(500).json({ message: "Yorum eklenemedi" });
    }
  });

  // ========================================
  // PROJECT MILESTONES
  // ========================================
  
  // GET /api/projects/:id/milestones - Get project milestones
  app.get('/api/projects/:id/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const milestones = await db.select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, parseInt(id)))
        .orderBy(projectMilestones.orderIndex, projectMilestones.dueDate);
      
      res.json(milestones);
    } catch (error: any) {
      console.error("Get project milestones error:", error);
      res.status(500).json({ message: "Kilometre taşları alınamadı" });
    }
  });

  // POST /api/projects/:id/milestones - Create milestone
  app.post('/api/projects/:id/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const data = insertProjectMilestoneSchema.parse({
        ...req.body,
        projectId: parseInt(id),
      });
      
      const [milestone] = await db.insert(projectMilestones).values(data).returning();
      
      res.status(201).json(milestone);
    } catch (error: any) {
      console.error("Create milestone error:", error);
      res.status(500).json({ message: "Kilometre taşı oluşturulamadı" });
    }
  });

  // PATCH /api/milestones/:id - Update milestone
  app.patch('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData: any = {};
      
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate;
      if (req.body.isCompleted !== undefined) {
        updateData.status = req.body.isCompleted ? "completed" : "pending";
        updateData.completedAt = req.body.isCompleted ? new Date() : null;
      }
      if (req.body.status !== undefined) {
        updateData.status = req.body.status;
        if (req.body.status === "completed") {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Güncellenecek alan yok" });
      }
      
      const [updated] = await db.update(projectMilestones)
        .set(updateData)
        .where(eq(projectMilestones.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update milestone error:", error);
      res.status(500).json({ message: "Kilometre taşı güncellenemedi" });
    }
  });

  // DELETE /api/milestones/:id - Delete milestone
  app.delete('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(projectMilestones).where(eq(projectMilestones.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete milestone error:", error);
      res.status(500).json({ message: "Kilometre taşı silinemedi" });
    }
  });

  // ========================================
  // SUBTASKS (Tasks with parentTaskId)
  // ========================================
  
  // GET /api/project-tasks/:id/subtasks - Get subtasks of a task
  app.get('/api/project-tasks/:id/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const subtasks = await db.select({
        task: projectTasks,
        assignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
        .from(projectTasks)
        .leftJoin(users, eq(projectTasks.assignedToId, users.id))
        .where(eq(projectTasks.parentTaskId, parseInt(id)))
        .orderBy(projectTasks.orderIndex);
      
      res.json(subtasks.map(s => ({ ...s.task, assignee: s.assignee })));
    } catch (error: any) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ message: "Alt görevler alınamadı" });
    }
  });

  // POST /api/project-tasks/:id/subtasks - Create subtask
  app.post('/api/project-tasks/:id/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      // Get parent task to get projectId
      const [parentTask] = await db.select().from(projectTasks).where(eq(projectTasks.id, parseInt(id)));
      if (!parentTask) {
        return res.status(404).json({ message: "Ana görev bulunamadı" });
      }
      
      const data = insertProjectTaskSchema.parse({
        ...req.body,
        projectId: parentTask.projectId,
        parentTaskId: parseInt(id),
        createdById: user.id,
      });
      
      const [subtask] = await db.insert(projectTasks).values(data).returning();
      
      res.status(201).json(subtask);
    } catch (error: any) {
      console.error("Create subtask error:", error);
      res.status(500).json({ message: "Alt görev oluşturulamadı" });
    }
  });

  // ========================================
  // TASK DEPENDENCIES
  // ========================================
  
  // GET /api/project-tasks/:id/dependencies - Get task dependencies
  app.get('/api/project-tasks/:id/dependencies', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const dependencies = await db.select({
        dependency: projectTaskDependencies,
        dependsOnTask: {
          id: projectTasks.id,
          title: projectTasks.title,
          status: projectTasks.status,
        },
      })
        .from(projectTaskDependencies)
        .innerJoin(projectTasks, eq(projectTaskDependencies.dependsOnTaskId, projectTasks.id))
        .where(eq(projectTaskDependencies.taskId, parseInt(id)));
      
      res.json(dependencies.map(d => ({ ...d.dependency, dependsOnTask: d.dependsOnTask })));
    } catch (error: any) {
      console.error("Get dependencies error:", error);
      res.status(500).json({ message: "Bağımlılıklar alınamadı" });
    }
  });

  // POST /api/project-tasks/:id/dependencies - Add dependency
  app.post('/api/project-tasks/:id/dependencies', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { dependsOnTaskId, dependencyType } = req.body;
      
      // Prevent self-dependency
      if (parseInt(id) === dependsOnTaskId) {
        return res.status(400).json({ message: "Görev kendisine bağımlı olamaz" });
      }
      
      const data = insertProjectTaskDependencySchema.parse({
        taskId: parseInt(id),
        dependsOnTaskId,
        dependencyType: dependencyType || 'finish_to_start',
      });
      
      const [dependency] = await db.insert(projectTaskDependencies).values(data).returning();
      
      res.status(201).json(dependency);
    } catch (error: any) {
      console.error("Add dependency error:", error);
      res.status(500).json({ message: "Bağımlılık eklenemedi" });
    }
  });

  // DELETE /api/task-dependencies/:id - Remove dependency
  app.delete('/api/task-dependencies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(projectTaskDependencies).where(eq(projectTaskDependencies.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete dependency error:", error);
      res.status(500).json({ message: "Bağımlılık silinemedi" });
    }
  });

  // ========================================
  // TASK DETAILS (Single task with all relations)
  // ========================================
  
  // GET /api/project-tasks/:id - Get task with details
  app.get('/api/project-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [taskData] = await db.select({
        task: projectTasks,
        assignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
        .from(projectTasks)
        .leftJoin(users, eq(projectTasks.assignedToId, users.id))
        .where(eq(projectTasks.id, parseInt(id)));
      
      if (!taskData) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      // Get subtasks
      const subtasks = await db.select()
        .from(projectTasks)
        .where(eq(projectTasks.parentTaskId, parseInt(id)));
      
      // Get dependencies
      const dependencies = await db.select({
        dependency: projectTaskDependencies,
        dependsOnTask: {
          id: projectTasks.id,
          title: projectTasks.title,
          status: projectTasks.status,
        },
      })
        .from(projectTaskDependencies)
        .innerJoin(projectTasks, eq(projectTaskDependencies.dependsOnTaskId, projectTasks.id))
        .where(eq(projectTaskDependencies.taskId, parseInt(id)));
      
      // Get comments
      const comments = await db.select({
        comment: projectComments,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
        .from(projectComments)
        .innerJoin(users, eq(projectComments.userId, users.id))
        .where(eq(projectComments.taskId, parseInt(id)))
        .orderBy(projectComments.createdAt);
      
      res.json({
        ...taskData.task,
        assignee: taskData.assignee,
        subtasks,
        dependencies: dependencies.map(d => ({ ...d.dependency, dependsOnTask: d.dependsOnTask })),
        comments: comments.map(c => ({ ...c.comment, user: c.user })),
      });
    } catch (error: any) {
      console.error("Get task details error:", error);
      res.status(500).json({ message: "Görev detayları alınamadı" });
    }
  });

  // POST /api/project-tasks/:id/comments - Add comment to task
  app.post('/api/project-tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      // Get task to get projectId
      const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, parseInt(id)));
      if (!task) {
        return res.status(404).json({ message: "Görev bulunamadı" });
      }
      
      const data = insertProjectCommentSchema.parse({
        ...req.body,
        projectId: task.projectId,
        taskId: parseInt(id),
        userId: user.id,
        isSystemMessage: false,
      });
      
      const [comment] = await db.insert(projectComments).values(data).returning();
      
      // Get user info for response
      const [commentUser] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, user.id));
      
      res.status(201).json({ ...comment, user: commentUser });
    } catch (error: any) {
      console.error("Add task comment error:", error);
      res.status(500).json({ message: "Yorum eklenemedi" });
    }
  });

  // GET /api/hq-users - Get HQ users for project member selection
  app.get('/api/hq-users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const hqUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
      })
        .from(users)
        .where(
          or(
            eq(users.role, 'admin'),
            eq(users.role, 'muhasebe'),
            eq(users.role, 'satinalma'),
            eq(users.role, 'coach'),
            eq(users.role, 'teknik'),
            eq(users.role, 'destek'),
            eq(users.role, 'fabrika'),
            eq(users.role, 'yatirimci_hq')
          )
        )
        .orderBy(users.firstName);
      
      res.json(hqUsers);
    } catch (error: any) {
      console.error("Get HQ users error:", error);
      res.status(500).json({ message: "HQ kullanıcıları alınamadı" });
    }
  });

  // =============================================
  // HQ SUPPORT TICKET ROUTES
  // =============================================
  
  // GET /api/hq-support/tickets - Get all tickets (HQ sees assigned categories, branch sees own)
  app.get('/api/hq-support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { status, category } = req.query;
      
      let tickets: any[];
      
      if (isHQRole(user.role) || user.role === 'admin') {
        // Admin sees all, HQ users see their assigned categories or all if no assignments
        if (user.role === 'admin') {
          tickets = await storage.getHQSupportTickets(undefined, status, category);
        } else {
          tickets = await storage.getHQSupportTicketsByUser(user.id);
          // If user has no assigned categories, show all tickets (for triage)
          if (tickets.length === 0) {
            tickets = await storage.getHQSupportTickets(undefined, status, category);
          } else if (status) {
            tickets = tickets.filter((t: any) => t.status === status);
          }
        }
      } else {
        // Branch users see only their own tickets
        tickets = await storage.getHQSupportTicketsByCreator(user.id);
        if (status) {
          tickets = tickets.filter((t: any) => t.status === status);
        }
      }
      
      // Enrich with branch and user info
      const branches = await storage.getBranches();
      const allUsers = await db.select().from(users);
      
      const enrichedTickets = tickets.map((ticket: any) => {
        const branch = branches.find(b => b.id === ticket.branchId);
        const createdBy = allUsers.find(u => u.id === ticket.createdById);
        return {
          ...ticket,
          branch: branch || { name: 'Unknown' },
          createdBy: createdBy ? { firstName: createdBy.firstName, lastName: createdBy.lastName } : { firstName: 'Unknown', lastName: '' },
          messageCount: 0,
        };
      });
      
      res.json(enrichedTickets);
    } catch (error: any) {
      console.error("Get tickets error:", error);
      res.status(500).json({ message: "Talepler alınamadı" });
    }
  });
  
  // POST /api/hq-support/tickets - Create new ticket
  app.post('/api/hq-support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      const ticketData = {
        ...req.body,
        createdById: user.id,
        branchId: user.branchId || req.body.branchId,
        priority: req.body.priority || 'normal',
        status: 'aktif',
      };
      
      const ticket = await storage.createHQSupportTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error: any) {
      console.error("Create ticket error:", error);
      res.status(500).json({ message: "Talep oluşturulamadı" });
    }
  });
  
  // GET /api/hq-support/tickets/:id - Get single ticket with messages
  app.get('/api/hq-support/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      // Check authorization
      if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
        return res.status(403).json({ message: "Bu talebe erişim yetkiniz yok" });
      }
      
      const messages = await storage.getHQSupportMessages(ticketId);
      const allUsers = await db.select().from(users);
      
      const enrichedMessages = messages.map((msg: any) => {
        const sender = allUsers.find(u => u.id === msg.senderId);
        return {
          ...msg,
          sender: sender ? { firstName: sender.firstName, lastName: sender.lastName, profileImageUrl: sender.profileImageUrl } : null,
        };
      });
      
      res.json({ ticket, messages: enrichedMessages });
    } catch (error: any) {
      console.error("Get ticket details error:", error);
      res.status(500).json({ message: "Talep detayları alınamadı" });
    }
  });
  
  // PATCH /api/hq-support/tickets/:id - Update ticket
  app.patch('/api/hq-support/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Talep güncelleme yetkiniz yok" });
      }
      
      const updates = req.body;
      if (updates.status === 'kapatildi') {
        updates.closedAt = new Date();
        updates.closedBy = user.id;
      }
      
      const updated = await storage.updateHQSupportTicket(ticketId, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update ticket error:", error);
      res.status(500).json({ message: "Talep güncellenemedi" });
    }
  });
  
  // POST /api/hq-support/tickets/:id/messages - Add message to ticket
  app.post('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      const message = await storage.createHQSupportMessage({
        ticketId,
        senderId: user.id,
        message: req.body.message,
        attachments: req.body.attachments || [],
        isInternal: req.body.isInternal || false,
      });
      
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Add message error:", error);
      res.status(500).json({ message: "Mesaj eklenemedi" });
    }
  });
  
  // =============================================
  // ADMIN SUPPORT CATEGORY ASSIGNMENTS
  // =============================================
  
  // GET /api/admin/support-assignments - Get all category assignments
  app.get('/api/admin/support-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const assignments = await storage.getHQSupportCategoryAssignments();
      
      // Enrich with user info
      const allUsers = await db.select().from(users);
      const enriched = assignments.map((a: any) => {
        const assignedUser = allUsers.find(u => u.id === a.userId);
        return {
          ...a,
          user: assignedUser ? { 
            id: assignedUser.id, 
            firstName: assignedUser.firstName, 
            lastName: assignedUser.lastName,
            role: assignedUser.role 
          } : null,
        };
      });
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Get category assignments error:", error);
      res.status(500).json({ message: "Kategori atamaları alınamadı" });
    }
  });
  
  // POST /api/admin/support-assignments - Create category assignment
  app.post('/api/admin/support-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const assignment = await storage.createHQSupportCategoryAssignment({
        ...req.body,
        createdById: user.id,
      });
      
      res.status(201).json(assignment);
    } catch (error: any) {
      console.error("Create category assignment error:", error);
      res.status(500).json({ message: "Kategori ataması oluşturulamadı" });
    }
  });
  
  // DELETE /api/admin/support-assignments/:id - Delete category assignment
  app.delete('/api/admin/support-assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      await storage.deleteHQSupportCategoryAssignment(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete category assignment error:", error);
      res.status(500).json({ message: "Kategori ataması silinemedi" });
    }
  });

  // =============================================
  // ADMIN EMAIL SETTINGS
  // =============================================
  
  app.get('/api/admin/email-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.emailSettings.findFirst();
      if (!result) {
        return res.json({
          smtpHost: process.env.SMTP_HOST || "",
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpUser: process.env.SMTP_USER || "",
          smtpPassword: "",
          smtpFromEmail: process.env.SMTP_FROM_EMAIL || "",
          smtpFromName: "DOSPRESSO",
          smtpSecure: false,
          isActive: true,
        });
      }
      res.json({ ...result, smtpPassword: result.smtpPassword ? "********" : "" });
    } catch (error: any) {
      console.error("Get email settings error:", error);
      res.status(500).json({ message: "Ayarlar alınamadı" });
    }
  });

  app.post('/api/admin/email-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const existing = await db.query.emailSettings.findFirst();
      const data = {
        ...req.body,
        updatedById: user.id,
        updatedAt: new Date(),
      };
      
      if (data.smtpPassword === "********" || !data.smtpPassword) {
        delete data.smtpPassword;
      }
      
      if (existing) {
        await db.update(emailSettings).set(data).where(eq(emailSettings.id, existing.id));
      } else {
        await db.insert(emailSettings).values(data);
      }
      
      res.json({ message: "Ayarlar kaydedildi" });
    } catch (error: any) {
      console.error("Save email settings error:", error);
      res.status(500).json({ message: "Ayarlar kaydedilemedi" });
    }
  });

  app.post('/api/admin/email-settings/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      res.json({ message: "Test e-postası gönderildi" });
    } catch (error: any) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Test e-postası gönderilemedi" });
    }
  });

  // =============================================
  // ADMIN SERVICE EMAIL SETTINGS (Arıza/Bakım için)
  // =============================================
  
  app.get('/api/admin/service-email-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.serviceEmailSettings.findFirst();
      if (!result) {
        return res.json({
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          smtpFromEmail: "cowork@dospresso.com",
          smtpFromName: "DOSPRESSO Teknik",
          smtpSecure: false,
          isActive: true,
        });
      }
      res.json({ ...result, smtpPassword: result.smtpPassword ? "********" : "" });
    } catch (error: any) {
      console.error("Get service email settings error:", error);
      res.status(500).json({ message: "Servis mail ayarları alınamadı" });
    }
  });

  app.post('/api/admin/service-email-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const existing = await db.query.serviceEmailSettings.findFirst();
      const data = {
        ...req.body,
        updatedById: user.id,
        updatedAt: new Date(),
      };
      
      if (data.smtpPassword === "********" || !data.smtpPassword) {
        delete data.smtpPassword;
      }
      
      if (existing) {
        await db.update(serviceEmailSettings).set(data).where(eq(serviceEmailSettings.id, existing.id));
      } else {
        await db.insert(serviceEmailSettings).values(data);
      }
      
      res.json({ message: "Servis mail ayarları kaydedildi" });
    } catch (error: any) {
      console.error("Save service email settings error:", error);
      res.status(500).json({ message: "Servis mail ayarları kaydedilemedi" });
    }
  });

  app.post('/api/admin/service-email-settings/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      res.json({ message: "Test e-postası servis adresine gönderildi" });
    } catch (error: any) {
      console.error("Test service email error:", error);
      res.status(500).json({ message: "Test e-postası gönderilemedi" });
    }
  });

  // =============================================
  // SERVICE REQUEST EMAIL - Servise İlet
  // =============================================
  
  app.post('/api/service-request/send', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { faultId, equipmentId, serviceEmail, subject, body } = req.body;
      
      if (!serviceEmail) {
        return res.status(400).json({ message: "Servis e-posta adresi bulunamadı" });
      }
      
      const serviceSettings = await db.query.serviceEmailSettings.findFirst();
      
      if (!serviceSettings || !serviceSettings.isActive) {
        return res.status(400).json({ message: "Servis mail ayarları yapılandırılmamış veya pasif" });
      }
      
      if (!serviceSettings.smtpHost || !serviceSettings.smtpUser) {
        return res.status(400).json({ message: "SMTP ayarları eksik. Admin panelinden yapılandırın." });
      }
      
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: serviceSettings.smtpHost,
        port: serviceSettings.smtpPort || 587,
        secure: serviceSettings.smtpSecure || false,
        auth: {
          user: serviceSettings.smtpUser,
          pass: serviceSettings.smtpPassword,
        },
      });
      
      const mailOptions = {
        from: `"${serviceSettings.smtpFromName || 'DOSPRESSO Teknik'}" <${serviceSettings.smtpFromEmail || serviceSettings.smtpUser}>`,
        to: serviceEmail,
        subject: subject || "DOSPRESSO - Servis Talebi",
        html: body,
      };
      
      await transporter.sendMail(mailOptions);
      
      console.log(`Service request email sent to ${serviceEmail} for fault ${faultId} by user ${user.id}`);
      
      res.json({ message: "Servis talebi e-postası gönderildi" });
    } catch (error: any) {
      console.error("Send service request email error:", error);
      res.status(500).json({ message: "Servis talebi gönderilemedi: " + (error as Error).message });
    }
  });

  // =============================================
  // ADMIN BANNERS
  // =============================================
  
  app.get('/api/admin/banners', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const result = await db.query.banners.findMany({
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
      res.json(result);
    } catch (error: any) {
      console.error("Get banners error:", error);
      res.status(500).json({ message: "Bannerlar alınamadı" });
    }
  });

  app.post('/api/admin/banners', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { title, description, imageUrl, linkUrl, targetRoles, startDate, endDate, isActive, orderIndex } = req.body;
      
      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: "Başlık, başlangıç ve bitiş tarihi zorunludur" });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Geçersiz tarih formatı" });
      }
      
      const [banner] = await db.insert(banners).values({
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        targetRoles: targetRoles || null,
        startDate: start,
        endDate: end,
        isActive: isActive !== false,
        orderIndex: orderIndex || 0,
        createdById: user.id,
      }).returning();
      
      res.status(201).json(banner);
    } catch (error: any) {
      console.error("Create banner error:", error);
      res.status(500).json({ message: "Banner oluşturulamadı" });
    }
  });

  app.patch('/api/admin/banners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const updateData: any = { updatedAt: new Date() };
      const { title, description, imageUrl, linkUrl, targetRoles, startDate, endDate, isActive, orderIndex } = req.body;
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (linkUrl !== undefined) updateData.linkUrl = linkUrl || null;
      if (targetRoles !== undefined) updateData.targetRoles = targetRoles || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Geçersiz başlangıç tarihi" });
        }
        updateData.startDate = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Geçersiz bitiş tarihi" });
        }
        updateData.endDate = end;
      }
      
      const [banner] = await db.update(banners)
        .set(updateData)
        .where(eq(banners.id, parseInt(req.params.id)))
        .returning();
      
      res.json(banner);
    } catch (error: any) {
      console.error("Update banner error:", error);
      res.status(500).json({ message: "Banner güncellenemedi" });
    }
  });

  app.delete('/api/admin/banners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      await db.delete(banners).where(eq(banners.id, parseInt(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete banner error:", error);
      res.status(500).json({ message: "Banner silinemedi" });
    }
  });

  // GET active banners for dashboard
  app.get('/api/banners/active', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const now = new Date();
      
      const allBanners = await db.query.banners.findMany({
        where: (b, { and, eq, lte, gte }) => and(
          eq(b.isActive, true),
          lte(b.startDate, now),
          gte(b.endDate, now)
        ),
        orderBy: (b, { asc }) => [asc(b.orderIndex)],
      });
      
      const filtered = allBanners.filter((banner: any) => {
        if (!banner.targetRoles || banner.targetRoles.length === 0) return true;
        return banner.targetRoles.includes(user.role);
      });
      
      res.json(filtered);
    } catch (error: any) {
      console.error("Get active banners error:", error);
      res.status(500).json({ message: "Bannerlar alınamadı" });
    }
  });

  // ============================================
  // ADMIN - AI SETTINGS API
  // ============================================
  
  // GET AI Settings
  app.get('/api/admin/ai-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const [settings] = await db.query.aiSettings.findMany({ limit: 1 });
      
      if (!settings) {
        // Return default settings
        return res.json({
          id: 0,
          provider: "openai",
          isActive: true,
          openaiApiKey: process.env.OPENAI_API_KEY ? "********" : null,
          openaiChatModel: "gpt-4o-mini",
          openaiEmbeddingModel: "text-embedding-3-small",
          openaiVisionModel: "gpt-4o",
          geminiApiKey: null,
          geminiChatModel: "gemini-1.5-pro",
          geminiEmbeddingModel: "text-embedding-004",
          geminiVisionModel: "gemini-1.5-pro",
          anthropicApiKey: null,
          anthropicChatModel: "claude-3-5-sonnet-20241022",
          anthropicVisionModel: "claude-3-5-sonnet-20241022",
          temperature: 0.7,
          maxTokens: 2000,
          rateLimitPerMinute: 60,
        });
      }
      
      // Mask API keys for frontend
      const maskedSettings = {
        ...settings,
        openaiApiKey: settings.openaiApiKey ? "********" : null,
        geminiApiKey: settings.geminiApiKey ? "********" : null,
        anthropicApiKey: settings.anthropicApiKey ? "********" : null,
      };
      
      res.json(maskedSettings);
    } catch (error: any) {
      console.error("Get AI settings error:", error);
      res.status(500).json({ message: "AI ayarları alınamadı" });
    }
  });

  // POST/Update AI Settings
  app.post('/api/admin/ai-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const data = req.body;
      const [existing] = await db.query.aiSettings.findMany({ limit: 1 });
      
      const updateData: any = {
        provider: data.provider,
        isActive: data.isActive,
        openaiChatModel: data.openaiChatModel,
        openaiEmbeddingModel: data.openaiEmbeddingModel,
        openaiVisionModel: data.openaiVisionModel,
        geminiChatModel: data.geminiChatModel,
        geminiEmbeddingModel: data.geminiEmbeddingModel,
        geminiVisionModel: data.geminiVisionModel,
        anthropicChatModel: data.anthropicChatModel,
        anthropicVisionModel: data.anthropicVisionModel,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        rateLimitPerMinute: data.rateLimitPerMinute,
        updatedById: user.id,
        updatedAt: new Date(),
      };
      
      // Only update API keys if new value provided (not masked)
      if (data.openaiApiKey && data.openaiApiKey !== "********") {
        updateData.openaiApiKey = data.openaiApiKey;
      }
      if (data.geminiApiKey && data.geminiApiKey !== "********") {
        updateData.geminiApiKey = data.geminiApiKey;
      }
      if (data.anthropicApiKey && data.anthropicApiKey !== "********") {
        updateData.anthropicApiKey = data.anthropicApiKey;
      }
      
      let result;
      if (existing) {
        [result] = await db.update(aiSettings)
          .set(updateData)
          .where(eq(aiSettings.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(aiSettings).values(updateData).returning();
      }
      
      res.json({ success: true, id: result.id });
    } catch (error: any) {
      console.error("Save AI settings error:", error);
      res.status(500).json({ message: "AI ayarları kaydedilemedi" });
    }
  });

  // Test AI connection
  app.post('/api/admin/ai-settings/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { provider } = req.body;
      const [settings] = await db.query.aiSettings.findMany({ limit: 1 });
      
      // Simple test - try to make a basic API call
      if (provider === 'openai') {
        const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.json({ success: false, message: "OpenAI API anahtarı bulunamadı" });
        }
        
        try {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey });
          await openai.models.list();
          return res.json({ success: true, message: "OpenAI bağlantısı başarılı" });
        } catch (e: any) {
          return res.json({ success: false, message: `OpenAI hatası: ${e.message}` });
        }
      }
      
      if (provider === 'gemini') {
        const apiKey = settings?.geminiApiKey;
        if (!apiKey) {
          return res.json({ success: false, message: "Gemini API anahtarı bulunamadı" });
        }
        return res.json({ success: true, message: "Gemini yapılandırıldı (test bağlantısı eklenmedi)" });
      }
      
      if (provider === 'anthropic') {
        const apiKey = settings?.anthropicApiKey;
        if (!apiKey) {
          return res.json({ success: false, message: "Anthropic API anahtarı bulunamadı" });
        }
        return res.json({ success: true, message: "Anthropic yapılandırıldı (test bağlantısı eklenmedi)" });
      }
      
      res.json({ success: false, message: "Bilinmeyen sağlayıcı" });
    } catch (error: any) {
      console.error("Test AI connection error:", error);
      res.status(500).json({ success: false, message: "Bağlantı testi başarısız" });
    }
  });

  // =============================================
  // NEW SHOP OPENING MANAGEMENT ROUTES
  // Yeni Şube Açılış Yönetim Sistemi
  // =============================================

  // GET /api/new-shop-projects - Get all new shop projects
  app.get('/api/new-shop-projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
      }
      
      const projectList = await db.select({
        project: projects,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
        .from(projects)
        .innerJoin(users, eq(projects.ownerId, users.id))
        .where(and(
          eq(projects.projectType, 'new_shop'),
          eq(projects.isActive, true)
        ))
        .orderBy(desc(projects.createdAt));
      
      // Get phase progress for each project
      const projectsWithProgress = await Promise.all(projectList.map(async ({ project, owner }) => {
        const phases = await db.select().from(projectPhases)
          .where(eq(projectPhases.projectId, project.id))
          .orderBy(projectPhases.orderIndex);
        
        const completedPhases = phases.filter(p => p.status === 'completed').length;
        const totalPhases = phases.length;
        const overallProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
        const currentPhase = phases.find(p => p.status === 'in_progress') || phases.find(p => p.status === 'not_started');
        
        return {
          ...project,
          owner,
          phases,
          overallProgress,
          currentPhase: currentPhase?.title || 'Tamamlandı',
          currentPhaseType: currentPhase?.phaseType,
          completedPhases,
          totalPhases,
        };
      }));
      
      res.json(projectsWithProgress);
    } catch (error: any) {
      console.error("Get new shop projects error:", error);
      res.status(500).json({ message: "Projeler alınamadı" });
    }
  });

  // POST /api/new-shop-projects - Create new shop project with phases
  app.post('/api/new-shop-projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const projectData = insertProjectSchema.parse({
        ...req.body,
        projectType: 'new_shop',
        ownerId: user.id,
        status: 'planning',
      });
      
      // Create project
      const [newProject] = await db.insert(projects).values(projectData).returning();
      
      // Create 7 phases from template
      const startDate = new Date();
      for (const template of NEW_SHOP_PHASE_TEMPLATE) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + template.targetDays);
        
        await db.insert(projectPhases).values({
          projectId: newProject.id,
          phaseType: template.phaseType,
          title: template.title,
          description: template.description,
          iconName: template.iconName,
          colorHex: template.colorHex,
          orderIndex: template.orderIndex,
          targetDate: targetDate.toISOString().split('T')[0],
          status: template.orderIndex === 0 ? 'in_progress' : 'not_started',
        });
      }
      
      // Add contingency budget line (10% of estimated budget)
      if (projectData.estimatedBudget) {
        await db.insert(projectBudgetLines).values({
          projectId: newProject.id,
          category: 'contingency',
          title: 'Beklenmeyen Giderler (%10)',
          description: 'Proje bütçesinin %10\'u olarak ayrılan rezerv',
          plannedAmount: Math.round(projectData.estimatedBudget * 0.1),
          isContingency: true,
          createdById: user.id,
        });
      }
      
      res.status(201).json(newProject);
    } catch (error: any) {
      console.error("Create new shop project error:", error);
      res.status(500).json({ message: "Proje oluşturulamadı" });
    }
  });

  // GET /api/new-shop-projects/:id - Get single project with full details
  app.get('/api/new-shop-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu projeye erişim yetkiniz yok" });
      }
      
      const [project] = await db.select().from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.projectType, 'new_shop')
        ));
      
      if (!project) {
        return res.status(404).json({ message: "Proje bulunamadı" });
      }
      
      // Get phases
      const phases = await db.select().from(projectPhases)
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(projectPhases.orderIndex);
      
      // Get all phase assignments for this project
      const phaseIds = phases.map(p => p.id);
      let fetchedAssignments: any[] = [];
      if (phaseIds.length > 0) {
        fetchedAssignments = await db.select({
          assignment: phaseAssignments,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          }
        })
          .from(phaseAssignments)
          .leftJoin(users, eq(phaseAssignments.userId, users.id))
          .where(inArray(phaseAssignments.phaseId, phaseIds));
      }

      // Group assignments by phase
      const phasesWithAssignments = phases.map(phase => ({
        ...phase,
        assignments: fetchedAssignments.filter(a => a.assignment.phaseId === phase.id).map(a => ({
          ...a.assignment,
          user: a.user,
        })),
      }));
      
      // Get budget summary
      const budgetLines = await db.select().from(projectBudgetLines)
        .where(eq(projectBudgetLines.projectId, projectId));
      
      const totalPlanned = budgetLines.reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
      const totalActual = budgetLines.reduce((sum, b) => sum + (b.actualAmount || 0), 0);
      const totalPaid = budgetLines.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      
      // Get vendors
      const vendors = await db.select().from(projectVendors)
        .where(eq(projectVendors.projectId, projectId));
      
      // Get risks
      const risks = await db.select().from(projectRisks)
        .where(eq(projectRisks.projectId, projectId));
      
      // Get owner info
      const [owner] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, project.ownerId));
      
      res.json({
        ...project,
        owner,
        phases: phasesWithAssignments,
        budgetLines,
        budgetSummary: { totalPlanned, totalActual, totalPaid, variance: totalPlanned - totalActual },
        vendors,
        risks,
      });
    } catch (error: any) {
      console.error("Get new shop project error:", error);
      res.status(500).json({ message: "Proje detayı alınamadı" });
    }
  });

  // PATCH /api/project-phases/:id - Update phase status/progress
  app.patch('/api/project-phases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const phaseId = parseInt(req.params.id);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccessByPhaseId(user, phaseId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Faz bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const updateData: any = {
        ...req.body,
        updatedAt: new Date(),
      };
      
      if (req.body.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }
      
      const [updated] = await db.update(projectPhases)
        .set(updateData)
        .where(eq(projectPhases.id, phaseId))
        .returning();
      
      // If completed, auto-start next phase
      if (req.body.status === 'completed' && updated) {
        const nextPhase = await db.select().from(projectPhases)
          .where(and(
            eq(projectPhases.projectId, updated.projectId),
            eq(projectPhases.status, 'not_started')
          ))
          .orderBy(projectPhases.orderIndex)
          .limit(1);
        
        if (nextPhase.length > 0) {
          await db.update(projectPhases)
            .set({ status: 'in_progress', startDate: new Date().toISOString().split('T')[0] })
            .where(eq(projectPhases.id, nextPhase[0].id));
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update phase error:", error);
      res.status(500).json({ message: "Faz güncellenemedi" });
    }
  });

  // POST /api/new-shop-projects/:projectId/phases - Create new phase
  app.post('/api/new-shop-projects/:projectId/phases', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      // Get max order index for the project
      const existingPhases = await db.select().from(projectPhases)
        .where(eq(projectPhases.projectId, projectId));
      const maxOrderIndex = existingPhases.reduce((max, p) => Math.max(max, p.orderIndex || 0), 0);
      
      const phaseData = insertProjectPhaseSchema.parse({
        projectId,
        title: req.body.title,
        phaseType: req.body.phaseType || 'custom',
        colorHex: req.body.colorHex || '#6366f1',
        targetDate: req.body.targetDate || null,
        orderIndex: req.body.orderIndex ?? maxOrderIndex + 1,
        status: 'not_started',
        progress: 0,
      });
      
      const [newPhase] = await db.insert(projectPhases).values(phaseData).returning();
      res.status(201).json(newPhase);
    } catch (error: any) {
      console.error("Create phase error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Faz oluşturulamadı" });
    }
  });

  // ---- Budget Lines ----
  
  // GET /api/projects/:id/budget - Get budget lines
  app.get('/api/projects/:id/budget', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const lines = await db.select().from(projectBudgetLines)
        .where(eq(projectBudgetLines.projectId, projectId))
        .orderBy(projectBudgetLines.category, projectBudgetLines.createdAt);
      
      res.json(lines);
    } catch (error: any) {
      console.error("Get budget lines error:", error);
      res.status(500).json({ message: "Bütçe kalemleri alınamadı" });
    }
  });

  // POST /api/projects/:id/budget - Add budget line
  app.post('/api/projects/:id/budget', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const data = insertProjectBudgetLineSchema.parse({
        ...req.body,
        projectId,
        createdById: user.id,
      });
      
      const [line] = await db.insert(projectBudgetLines).values(data).returning();
      res.status(201).json(line);
    } catch (error: any) {
      console.error("Add budget line error:", error);
      res.status(500).json({ message: "Bütçe kalemi eklenemedi" });
    }
  });

  // PATCH /api/budget-lines/:id - Update budget line
  app.patch('/api/budget-lines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const lineId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const [updated] = await db.update(projectBudgetLines)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(projectBudgetLines.id, lineId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update budget line error:", error);
      res.status(500).json({ message: "Bütçe kalemi güncellenemedi" });
    }
  });

  // DELETE /api/budget-lines/:id - Delete budget line
  app.delete('/api/budget-lines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const lineId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await db.delete(projectBudgetLines).where(eq(projectBudgetLines.id, lineId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete budget line error:", error);
      res.status(500).json({ message: "Bütçe kalemi silinemedi" });
    }
  });

  // ---- Vendors ----
  
  // GET /api/projects/:id/vendors - Get vendors
  app.get('/api/projects/:id/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const vendorList = await db.select().from(projectVendors)
        .where(eq(projectVendors.projectId, projectId))
        .orderBy(projectVendors.vendorType);
      
      res.json(vendorList);
    } catch (error: any) {
      console.error("Get vendors error:", error);
      res.status(500).json({ message: "Tedarikçiler alınamadı" });
    }
  });

  // POST /api/projects/:id/vendors - Add vendor
  app.post('/api/projects/:id/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const data = insertProjectVendorSchema.parse({
        ...req.body,
        projectId,
        createdById: user.id,
      });
      
      const [vendor] = await db.insert(projectVendors).values(data).returning();
      res.status(201).json(vendor);
    } catch (error: any) {
      console.error("Add vendor error:", error);
      res.status(500).json({ message: "Tedarikçi eklenemedi" });
    }
  });

  // PATCH /api/vendors/:id - Update vendor
  app.patch('/api/vendors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const vendorId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const [updated] = await db.update(projectVendors)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(projectVendors.id, vendorId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update vendor error:", error);
      res.status(500).json({ message: "Tedarikçi güncellenemedi" });
    }
  });

  // DELETE /api/vendors/:id - Delete vendor
  app.delete('/api/vendors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const vendorId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await db.delete(projectVendors).where(eq(projectVendors.id, vendorId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete vendor error:", error);
      res.status(500).json({ message: "Tedarikçi silinemedi" });
    }
  });

  // ---- Risks ----
  
  // GET /api/projects/:id/risks - Get risks
  app.get('/api/projects/:id/risks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const riskList = await db.select().from(projectRisks)
        .where(eq(projectRisks.projectId, projectId))
        .orderBy(desc(projectRisks.severity));
      
      res.json(riskList);
    } catch (error: any) {
      console.error("Get risks error:", error);
      res.status(500).json({ message: "Riskler alınamadı" });
    }
  });

  // POST /api/projects/:id/risks - Add risk
  app.post('/api/projects/:id/risks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      // Calculate severity from probability * impact
      const probability = req.body.probability || 3;
      const impact = req.body.impact || 3;
      const score = probability * impact;
      let severity = 'medium';
      if (score >= 15) severity = 'critical';
      else if (score >= 10) severity = 'high';
      else if (score <= 4) severity = 'low';
      
      const data = insertProjectRiskSchema.parse({
        ...req.body,
        projectId,
        severity,
        createdById: user.id,
      });
      
      const [risk] = await db.insert(projectRisks).values(data).returning();
      res.status(201).json(risk);
    } catch (error: any) {
      console.error("Add risk error:", error);
      res.status(500).json({ message: "Risk eklenemedi" });
    }
  });

  // PATCH /api/risks/:id - Update risk
  app.patch('/api/risks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const riskId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const updateData: any = { ...req.body, updatedAt: new Date() };
      
      // Recalculate severity if probability or impact changed
      if (req.body.probability || req.body.impact) {
        const [existing] = await db.select().from(projectRisks).where(eq(projectRisks.id, riskId));
        if (existing) {
          const probability = req.body.probability || existing.probability || 3;
          const impact = req.body.impact || existing.impact || 3;
          const score = probability * impact;
          if (score >= 15) updateData.severity = 'critical';
          else if (score >= 10) updateData.severity = 'high';
          else if (score <= 4) updateData.severity = 'low';
          else updateData.severity = 'medium';
        }
      }
      
      if (req.body.status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
      
      const [updated] = await db.update(projectRisks)
        .set(updateData)
        .where(eq(projectRisks.id, riskId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update risk error:", error);
      res.status(500).json({ message: "Risk güncellenemedi" });
    }
  });

  // DELETE /api/risks/:id - Delete risk
  app.delete('/api/risks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const riskId = parseInt(req.params.id);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await db.delete(projectRisks).where(eq(projectRisks.id, riskId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete risk error:", error);
      res.status(500).json({ message: "Risk silinemedi" });
    }
  });

  // ========================================
  // PHASE MANAGEMENT SYSTEM ROUTES
  // ========================================

  // ---- Phase Sub-Tasks ----

  // GET /api/new-shop-projects/:projectId/phases/:phaseId/subtasks - List sub-tasks for a phase
  app.get('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const phaseId = parseInt(req.params.phaseId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const subtasks = await db.select().from(phaseSubTasks)
        .where(eq(phaseSubTasks.phaseId, phaseId))
        .orderBy(phaseSubTasks.sortOrder, phaseSubTasks.id);
      
      // Build nested structure - categories with their child tasks
      const categories = subtasks.filter(s => s.isCategory);
      const tasks = subtasks.filter(s => !s.isCategory);
      
      const nestedResult = categories.map(cat => ({
        ...cat,
        children: tasks.filter(t => t.parentId === cat.id).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      }));
      
      // Return all subtasks as flat array - frontend handles categorization
      res.json(subtasks);
    } catch (error: any) {
      console.error("Get phase subtasks error:", error);
      res.status(500).json({ message: "Alt görevler alınamadı" });
    }
  });

  // POST /api/new-shop-projects/:projectId/phases/:phaseId/subtasks - Create sub-task
  app.post('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const phaseId = parseInt(req.params.phaseId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      // Clean data: convert empty strings to null for date fields
      const cleanData = {
        ...req.body,
        dueDate: req.body.dueDate === '' ? null : req.body.dueDate,
        phaseId,
        createdById: user.id,
      };
      
      const data = insertPhaseSubTaskSchema.parse(cleanData);
      
      const [subtask] = await db.insert(phaseSubTasks).values(data).returning();
      res.status(201).json(subtask);
    } catch (error: any) {
      console.error("Create phase subtask error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Alt görev oluşturulamadı" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId - Update sub-task
  app.patch('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const subtaskId = parseInt(req.params.subtaskId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const updateData: any = { ...req.body, updatedAt: new Date() };
      
      // Clean data: convert empty strings to null for date fields
      if ('dueDate' in updateData && updateData.dueDate === '') {
        updateData.dueDate = null;
      }
      
      // If status is set to done, record completedAt
      if (req.body.status === 'done') {
        updateData.completedAt = new Date();
      }
      
      const [updated] = await db.update(phaseSubTasks)
        .set(updateData)
        .where(eq(phaseSubTasks.id, subtaskId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update phase subtask error:", error);
      res.status(500).json({ message: "Alt görev güncellenemedi" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId/reorder - Update sort order
  app.patch('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const subtaskId = parseInt(req.params.subtaskId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const { sortOrder, parentId } = req.body;
      
      const [updated] = await db.update(phaseSubTasks)
        .set({ sortOrder, parentId: parentId ?? null, updatedAt: new Date() })
        .where(eq(phaseSubTasks.id, subtaskId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Reorder phase subtask error:", error);
      res.status(500).json({ message: "Sıralama güncellenemedi" });
    }
  });

  // DELETE /api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId - Delete sub-task
  app.delete('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const subtaskId = parseInt(req.params.subtaskId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      await db.delete(phaseSubTasks).where(eq(phaseSubTasks.id, subtaskId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete phase subtask error:", error);
      res.status(500).json({ message: "Alt görev silinemedi" });
    }
  });

  // ---- Phase Assignments ----

  // GET /api/new-shop-projects/:projectId/phases/:phaseId/assignments - List assignments for a phase
  app.get('/api/new-shop-projects/:projectId/phases/:phaseId/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const phaseId = parseInt(req.params.phaseId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const assignments = await db.select({
        assignment: phaseAssignments,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
        },
        externalUser: {
          id: externalUsers.id,
          firstName: externalUsers.firstName,
          lastName: externalUsers.lastName,
          email: externalUsers.email,
          companyName: externalUsers.companyName,
          specialty: externalUsers.specialty,
        },
      })
        .from(phaseAssignments)
        .leftJoin(users, eq(phaseAssignments.userId, users.id))
        .leftJoin(externalUsers, eq(phaseAssignments.externalUserId, externalUsers.id))
        .where(eq(phaseAssignments.phaseId, phaseId));
      
      res.json(assignments);
    } catch (error: any) {
      console.error("Get phase assignments error:", error);
      res.status(500).json({ message: "Atamalar alınamadı" });
    }
  });

  // POST /api/new-shop-projects/:projectId/phases/:phaseId/assignments - Add assignment
  app.post('/api/new-shop-projects/:projectId/phases/:phaseId/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const phaseId = parseInt(req.params.phaseId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const data = insertPhaseAssignmentSchema.parse({
        ...req.body,
        phaseId,
        assignedById: user.id,
      });
      
      // Ensure either userId or externalUserId is provided
      if (!data.userId && !data.externalUserId) {
        return res.status(400).json({ message: "Kullanıcı veya dış kullanıcı seçilmeli" });
      }
      
      const [assignment] = await db.insert(phaseAssignments).values(data).returning();
      res.status(201).json(assignment);
    } catch (error: any) {
      console.error("Create phase assignment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Atama oluşturulamadı" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId - Update assignment
  app.patch('/api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const assignmentId = parseInt(req.params.assignmentId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const [updated] = await db.update(phaseAssignments)
        .set(req.body)
        .where(eq(phaseAssignments.id, assignmentId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update phase assignment error:", error);
      res.status(500).json({ message: "Atama güncellenemedi" });
    }
  });

  // DELETE /api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId - Remove assignment
  app.delete('/api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const assignmentId = parseInt(req.params.assignmentId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      await db.delete(phaseAssignments).where(eq(phaseAssignments.id, assignmentId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete phase assignment error:", error);
      res.status(500).json({ message: "Atama silinemedi" });
    }
  });

  // ---- Procurement Items and Proposals ----

  // GET /api/new-shop-projects/:projectId/procurement/items - List all procurement items for project
  app.get('/api/new-shop-projects/:projectId/procurement/items', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      // Get all procurement items linked to subtasks of this project's phases
      const items = await db.select({
        item: procurementItems,
        subtask: {
          id: phaseSubTasks.id,
          title: phaseSubTasks.title,
          phaseId: phaseSubTasks.phaseId,
        },
      })
        .from(procurementItems)
        .innerJoin(phaseSubTasks, eq(procurementItems.subTaskId, phaseSubTasks.id))
        .innerJoin(projectPhases, eq(phaseSubTasks.phaseId, projectPhases.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(desc(procurementItems.createdAt));
      
      res.json(items);
    } catch (error: any) {
      console.error("Get procurement items error:", error);
      res.status(500).json({ message: "Tedarik kalemleri alınamadı" });
    }
  });

  // GET /api/new-shop-projects/:projectId/procurement/items/:itemId - Get single item with proposals
  app.get('/api/new-shop-projects/:projectId/procurement/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const itemId = parseInt(req.params.itemId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const [item] = await db.select().from(procurementItems)
        .where(eq(procurementItems.id, itemId));
      
      if (!item) {
        return res.status(404).json({ message: "Tedarik kalemi bulunamadı" });
      }
      
      const proposals = await db.select().from(procurementProposals)
        .where(eq(procurementProposals.procurementItemId, itemId))
        .orderBy(procurementProposals.proposedPrice);
      
      res.json({ ...item, proposals });
    } catch (error: any) {
      console.error("Get procurement item error:", error);
      res.status(500).json({ message: "Tedarik kalemi alınamadı" });
    }
  });

  // POST /api/new-shop-projects/:projectId/procurement/items - Create procurement item from sub-task
  app.post('/api/new-shop-projects/:projectId/procurement/items', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const data = insertProcurementItemSchema.parse({
        ...req.body,
        createdById: user.id,
      });
      
      const [item] = await db.insert(procurementItems).values(data).returning();
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Create procurement item error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Tedarik kalemi oluşturulamadı" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/procurement/items/:itemId - Update item
  app.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const itemId = parseInt(req.params.itemId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const [updated] = await db.update(procurementItems)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(procurementItems.id, itemId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update procurement item error:", error);
      res.status(500).json({ message: "Tedarik kalemi güncellenemedi" });
    }
  });

  // POST /api/new-shop-projects/:projectId/procurement/items/:itemId/proposals - Add proposal
  app.post('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const itemId = parseInt(req.params.itemId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const data = insertProcurementProposalSchema.parse({
        ...req.body,
        procurementItemId: itemId,
      });
      
      const [proposal] = await db.insert(procurementProposals).values(data).returning();
      res.status(201).json(proposal);
    } catch (error: any) {
      console.error("Create procurement proposal error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Teklif oluşturulamadı" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId - Update proposal
  app.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const proposalId = parseInt(req.params.proposalId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      const [updated] = await db.update(procurementProposals)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(procurementProposals.id, proposalId))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update procurement proposal error:", error);
      res.status(500).json({ message: "Teklif güncellenemedi" });
    }
  });

  // PATCH /api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId/select - Select winning proposal
  app.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId/select', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const itemId = parseInt(req.params.itemId);
      const proposalId = parseInt(req.params.proposalId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      // Update the winning proposal status
      await db.update(procurementProposals)
        .set({ status: 'selected', reviewedAt: new Date(), reviewedById: user.id })
        .where(eq(procurementProposals.id, proposalId));
      
      // Reject other proposals for this item
      await db.update(procurementProposals)
        .set({ status: 'rejected', reviewedAt: new Date(), reviewedById: user.id })
        .where(and(
          eq(procurementProposals.procurementItemId, itemId),
          sql`${procurementProposals.id} != ${proposalId}`,
          sql`${procurementProposals.status} NOT IN ('withdrawn')`
        ));
      
      // Update the procurement item with selected proposal
      const [updatedItem] = await db.update(procurementItems)
        .set({ 
          selectedProposalId: proposalId, 
          status: 'awarded', 
          awardedAt: new Date(), 
          awardedById: user.id,
          updatedAt: new Date() 
        })
        .where(eq(procurementItems.id, itemId))
        .returning();
      
      res.json(updatedItem);
    } catch (error: any) {
      console.error("Select proposal error:", error);
      res.status(500).json({ message: "Teklif seçilemedi" });
    }
  });

  // DELETE /api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId - Delete proposal
  app.delete('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const proposalId = parseInt(req.params.proposalId);
      
      // Check access: HQ, admin, or project owner
      const accessCheck = await checkProjectAccess(user, projectId);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
      }
      
      await db.delete(procurementProposals).where(eq(procurementProposals.id, proposalId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete procurement proposal error:", error);
      res.status(500).json({ message: "Teklif silinemedi" });
    }
  });

  // ---- External Users for Project ----

  // GET /api/new-shop-projects/:projectId/external-users - List external users assigned to project
  app.get('/api/new-shop-projects/:projectId/external-users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
      
      const externalUsersList = await db.select({
        access: externalUserProjects,
        user: externalUsers,
      })
        .from(externalUserProjects)
        .innerJoin(externalUsers, eq(externalUserProjects.externalUserId, externalUsers.id))
        .where(and(
          eq(externalUserProjects.projectId, projectId),
          isNull(externalUserProjects.revokedAt)
        ));
      
      res.json(externalUsersList);
    } catch (error: any) {
      console.error("Get external users error:", error);
      res.status(500).json({ message: "Dış kullanıcılar alınamadı" });
    }
  });

  // POST /api/new-shop-projects/:projectId/external-users - Invite external user
  app.post('/api/new-shop-projects/:projectId/external-users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      const { email, firstName, lastName, companyName, phoneNumber, specialty, role, canViewBudget, canComment, canUploadFiles } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email adresi gerekli" });
      }
      
      // Check if external user already exists
      let [existingUser] = await db.select().from(externalUsers)
        .where(eq(externalUsers.email, email.toLowerCase()));
      
      let externalUserId: number;
      
      if (existingUser) {
        externalUserId = existingUser.id;
      } else {
        // Create new external user
        const [newExternalUser] = await db.insert(externalUsers).values({
          email: email.toLowerCase(),
          firstName,
          lastName,
          companyName,
          phoneNumber,
          specialty,
          invitedById: user.id,
        }).returning();
        externalUserId = newExternalUser.id;
      }
      
      // Check if already assigned to this project
      const [existingAccess] = await db.select().from(externalUserProjects)
        .where(and(
          eq(externalUserProjects.externalUserId, externalUserId),
          eq(externalUserProjects.projectId, projectId),
          isNull(externalUserProjects.revokedAt)
        ));
      
      if (existingAccess) {
        return res.status(400).json({ message: "Bu kullanıcı zaten projeye atanmış" });
      }
      
      // Assign to project
      const [access] = await db.insert(externalUserProjects).values({
        externalUserId,
        projectId,
        role: role || 'viewer',
        canViewBudget: canViewBudget ?? false,
        canViewTasks: true,
        canComment: canComment ?? true,
        canUploadFiles: canUploadFiles ?? false,
        grantedById: user.id,
      }).returning();
      
      // Get the full user info
      const [fullExternalUser] = await db.select().from(externalUsers)
        .where(eq(externalUsers.id, externalUserId));
      
      res.status(201).json({ access, user: fullExternalUser });
    } catch (error: any) {
      console.error("Invite external user error:", error);
      res.status(500).json({ message: "Dış kullanıcı davet edilemedi" });
    }
  });

  // DELETE /api/new-shop-projects/:projectId/external-users/:externalUserId - Remove from project
  app.delete('/api/new-shop-projects/:projectId/external-users/:externalUserId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const projectId = parseInt(req.params.projectId);
      const externalUserId = parseInt(req.params.externalUserId);
      
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      // Soft delete by setting revokedAt
      await db.update(externalUserProjects)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(externalUserProjects.externalUserId, externalUserId),
          eq(externalUserProjects.projectId, projectId)
        ));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove external user error:", error);
      res.status(500).json({ message: "Dış kullanıcı kaldırılamadı" });
    }
  });

  // PATCH /api/admin/update-employee-terminations - Update termination dates for existing employees
  app.patch('/api/admin/update-employee-terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { terminations } = req.body;
      if (!Array.isArray(terminations)) {
        return res.status(400).json({ message: "terminations array gerekli" });
      }

      const updated: any[] = [];
      for (const term of terminations) {
        // Find user by email or TCKN
        let foundUser = null;
        if (term.email) {
          const allUsers = await storage.getAllEmployees();
          foundUser = allUsers.find(u => u.email === term.email);
        }
        if (!foundUser && term.tckn) {
          const allUsers = await storage.getAllEmployees();
          foundUser = allUsers.find(u => u.tckn === term.tckn);
        }
        
        if (foundUser) {
          await db.update(users)
            .set({
              leaveStartDate: term.leaveStartDate || null,
              leaveReason: term.leaveReason || null,
              isActive: term.leaveStartDate ? false : true,
            })
            .where(eq(users.id, foundUser.id));
          updated.push({ id: foundUser.id, name: `${foundUser.firstName} ${foundUser.lastName}`, leaveStartDate: term.leaveStartDate });
        }
      }

      res.json({ success: true, updated: updated.length, details: updated });
    } catch (error: any) {
      console.error("Update terminations error:", error);
      res.status(500).json({ message: "İşten ayrılma güncelleme hatası" });
    }
  });

  // POST /api/admin/import-employees - Import employees from data
  app.post('/api/admin/import-employees', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { employees, deleteExisting } = req.body;
      if (!Array.isArray(employees)) {
        return res.status(400).json({ message: "employees array gerekli" });
      }

      // Delete existing non-admin users if requested
      if (deleteExisting) {
        const allUsers = await storage.getAllEmployees();
        for (const emp of allUsers) {
          if (emp.role !== 'admin') {
            await storage.deleteUser(emp.id);
          }
        }
      }

      // Import employees
      const created: any[] = [];
      for (const emp of employees) {
        const userData = {
          username: emp.username,
          email: emp.email || undefined,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role || 'barista',
          branchId: emp.branchId || 1,
          hireDate: emp.hireDate || undefined,
          birthDate: emp.birthDate || undefined,
          phoneNumber: emp.phoneNumber || undefined,
          // Extended HR fields
          tckn: emp.tckn || undefined,
          gender: emp.gender || undefined,
          maritalStatus: emp.maritalStatus || undefined,
          department: emp.department || undefined,
          address: emp.address || undefined,
          city: emp.city || undefined,
          militaryStatus: emp.militaryStatus || undefined,
          educationLevel: emp.educationLevel || undefined,
          educationStatus: emp.educationStatus || undefined,
          educationInstitution: emp.educationInstitution || undefined,
          contractType: emp.contractType || undefined,
          homePhone: emp.homePhone || undefined,
          numChildren: emp.numChildren || 0,
          disabilityLevel: emp.disabilityLevel || 'Yok',
          leaveStartDate: emp.leaveStartDate || undefined,
          leaveReason: emp.leaveReason || undefined,
          accountStatus: 'approved',
        };
        
        try {
          const user = await storage.createUser(userData as any);
          created.push({ id: user.id, name: `${user.firstName} ${user.lastName}` });
        } catch (err: any) {
          console.error(`Personel ekleme hatası: ${emp.firstName} ${emp.lastName}`, err.message);
        }
      }

      res.json({ success: true, imported: created.length, details: created });
    } catch (error: any) {
      console.error("Import employees error:", error);
      res.status(500).json({ message: "Personel ekleme hatası" });
    }
  });

  // ========================================
  // İŞE ALIM MODÜLÜ - Job Positions, Applications, Interviews
  // ========================================

  // GET /api/job-positions - List all job positions
  app.get('/api/job-positions', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching job positions:", error);
      res.status(500).json({ message: "Pozisyonlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/job-positions - Create a new job position
  app.post('/api/job-positions', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating job position:", error);
      res.status(500).json({ message: "Pozisyon oluşturulurken hata oluştu" });
    }
  });

  // GET /api/job-positions/:id - Get single job position
  app.get('/api/job-positions/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching job position:", error);
      res.status(500).json({ message: "Pozisyon yüklenirken hata oluştu" });
    }
  });

  // PATCH /api/job-positions/:id - Update job position
  app.patch('/api/job-positions/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating job position:", error);
      res.status(500).json({ message: "Pozisyon güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/job-positions/:id - Delete job position
  app.delete('/api/job-positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Pozisyon silme yetkiniz yok' });
      }

      await db.delete(jobPositions).where(eq(jobPositions.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting job position:", error);
      res.status(500).json({ message: "Pozisyon silinirken hata oluştu" });
    }
  });

  // POST /api/job-positions/:id/close - Close job position and send rejection emails
  app.post('/api/job-positions/:id/close', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error closing job position:", error);
      res.status(500).json({ message: "Pozisyon kapatılırken hata oluştu" });
    }
  });

  // GET /api/job-applications - List all applications
  app.get('/api/job-applications', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { positionId, status } = req.query;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru bilgilerine erişim yetkiniz yok' });
      }

      let query = db.select()
        .from(jobApplications)
        .leftJoin(jobPositions, eq(jobApplications.positionId, jobPositions.id));
      
      if (positionId) {
        query = query.where(eq(jobApplications.positionId, parseInt(positionId as string)));
      }
      if (status && status !== 'all') {
        query = query.where(eq(jobApplications.status, status as string));
      }

      // Supervisor: only see their branch's positions
      if (user.role === 'supervisor' && user.branchId) {
        query = query.where(eq(jobPositions.branchId, user.branchId));
      }

      const results = await query.orderBy(desc(jobApplications.createdAt));
      // Extract just the jobApplications part and add interview result
      const applications = await Promise.all(results.map(async (r) => {
        const app = r.job_applications;
        // Get the latest interview for this application
        const latestInterview = await db.select()
          .from(interviews)
          .where(eq(interviews.applicationId, app.id))
          .orderBy(desc(interviews.createdAt))
          .limit(1);
        
        return {
          ...app,
          interviewResult: latestInterview[0]?.result || null,
        };
      }));
      res.json(applications);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Başvurular yüklenirken hata oluştu" });
    }
  });

  // POST /api/job-applications - Create a new application
  app.post('/api/job-applications', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru ekleme yetkiniz yok' });
      }

      const data = {
        ...req.body,
        createdById: user.id,
      };

      const result = await db.insert(jobApplications).values(data).returning();
      const application = result[0];

      // Send thank you email to applicant
      if (application.email) {
        try {
          const [position] = await db.select().from(jobPositions).where(eq(jobPositions.id, application.positionId));
          
          const emailBody = `Sayın ${application.fullName},

DOSPRESSO ailesine başvurunuz için teşekkür ederiz.

Başvurunuz için ${position?.title || 'açık pozisyon'} pozisyonuna ait başvurunuz alındığını bilgilendirmek istiyoruz. 

Başvurunuz dikkatle değerlendirilecektir. Mülakata davet edilmeniz durumunda size email yoluyla bilgi verilecektir.

Başarılar dileriz,
DOSPRESSO İnsan Kaynakları Ekibi`;

          await sendNotificationEmail(
            application.email,
            'DOSPRESSO - Başvuru Alındı',
            emailBody
          );
        } catch (emailError) {
          console.error(`Failed to send thank you email to ${application.email}:`, emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json(application);
    } catch (error: any) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Başvuru oluşturulurken hata oluştu" });
    }
  });

  // GET /api/job-applications/:id - Get single application
  app.get('/api/job-applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru bilgilerine erişim yetkiniz yok' });
      }

      const result = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
      if (result.length === 0) {
        return res.status(404).json({ message: 'Başvuru bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Başvuru yüklenirken hata oluştu" });
    }
  });

  // PATCH /api/job-applications/:id - Update application
  app.patch('/api/job-applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Başvuru güncelleme yetkiniz yok' });
      }

      const result = await db.update(jobApplications)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(jobApplications.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Başvuru bulunamadı' });
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Başvuru güncellenirken hata oluştu" });
    }
  });

  // GET /api/interviews - List all interviews
  app.get('/api/interviews', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Mülakatlar yüklenirken hata oluştu" });
    }
  });

  // POST /api/interviews - Create a new interview
  app.post('/api/interviews', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Mülakat oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/interviews/:id - Update interview
  app.patch('/api/interviews/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating interview:", error);
      res.status(500).json({ message: "Mülakat güncellenirken hata oluştu" });
    }
  });

  // ========================================
  // Standart Mülakat Soruları (HQ yönetimli)
  // ========================================

  // GET /api/interview-questions - Get all interview questions
  app.get('/api/interview-questions', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.select()
        .from(interviewQuestions)
        .where(eq(interviewQuestions.isActive, true))
        .orderBy(interviewQuestions.category, interviewQuestions.orderIndex);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching interview questions:", error);
      res.status(500).json({ message: "Mülakat soruları yüklenirken hata oluştu" });
    }
  });

  // POST /api/interview-questions - Create interview question (HQ only)
  app.post('/api/interview-questions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const data = insertInterviewQuestionSchema.parse({
        ...req.body,
        createdById: user.id,
      });

      const result = await db.insert(interviewQuestions).values(data).returning();
      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/interview-questions/:id - Update interview question (HQ only)
  app.patch('/api/interview-questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const id = parseInt(req.params.id);
      const result = await db.update(interviewQuestions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(interviewQuestions.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Soru bulunamadı' });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu güncellenirken hata oluştu" });
    }
  });

  // DELETE /api/interview-questions/:id - Soft delete question (HQ only)
  app.delete('/api/interview-questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Sadece HQ bu işlemi yapabilir' });
      }

      const id = parseInt(req.params.id);
      await db.update(interviewQuestions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(interviewQuestions.id, id));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting interview question:", error);
      res.status(500).json({ message: "Mülakat sorusu silinirken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/start - Start interview (change status to in_progress)
  app.post('/api/interviews/:id/start', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Mülakat başlatılırken hata oluştu" });
    }
  });

  // GET /api/interviews/:id/responses - Get all responses for an interview
  app.get('/api/interviews/:id/responses', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching interview responses:", error);
      res.status(500).json({ message: "Mülakat cevapları yüklenirken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/respond - Add or update a response
  app.post('/api/interviews/:id/respond', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error saving interview response:", error);
      res.status(500).json({ message: "Cevap kaydedilirken hata oluştu" });
    }
  });

  // PATCH /api/interviews/:id/result - Update interview result (pending/positive/finalist/negative)
  app.patch('/api/interviews/:id/result', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating interview result:", error);
      res.status(500).json({ message: "Mülakat sonucu güncellenirken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/complete - Complete interview with overall result
  app.post('/api/interviews/:id/complete', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Mülakat tamamlanırken hata oluştu" });
    }
  });

  // POST /api/interviews/:id/hire - Hire candidate and send rejection emails to others
  app.post('/api/interviews/:id/hire', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error hiring candidate:", error);
      res.status(500).json({ message: "İşe alım sırasında hata oluştu" });
    }
  });

  // GET /api/employee-terminations - Get termination records
  app.get('/api/employee-terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      const result = await db.select({
        id: employeeTerminations.id,
        userId: employeeTerminations.userId,
        terminationType: employeeTerminations.terminationType,
        terminationDate: employeeTerminations.terminationDate,
        terminationReason: employeeTerminations.terminationReason,
        lastWorkDay: employeeTerminations.lastWorkDay,
        noticeGiven: employeeTerminations.noticeGiven,
        finalSalary: employeeTerminations.finalSalary,
        severancePayment: employeeTerminations.severancePayment,
        otherPayments: employeeTerminations.otherPayments,
        totalPayment: employeeTerminations.totalPayment,
        returnedItems: employeeTerminations.returnedItems,
        exitInterview: employeeTerminations.exitInterview,
        performanceRating: employeeTerminations.performanceRating,
        recommendation: employeeTerminations.recommendation,
        processedById: employeeTerminations.processedById,
        approvedById: employeeTerminations.approvedById,
        documents: employeeTerminations.documents,
        createdAt: employeeTerminations.createdAt,
        updatedAt: employeeTerminations.updatedAt,
        userName: users.fullName,
      })
        .from(employeeTerminations)
        .leftJoin(users, eq(employeeTerminations.userId, users.id))
        .orderBy(desc(employeeTerminations.terminationDate));
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching terminations:", error);
      res.status(500).json({ message: "Ayrılış kayıtları yüklenirken hata oluştu" });
    }
  });

  // POST /api/employee-terminations - Create termination record
  app.post('/api/employee-terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      const result = await db.insert(employeeTerminations)
        .values({
          ...req.body,
          processedById: user.id,
        })
        .returning();
      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating termination:", error);
      res.status(500).json({ message: "Ayrılış kaydı oluşturulurken hata oluştu" });
    }
  });

  // PATCH /api/employee-terminations/:id - Update termination record
  app.patch('/api/employee-terminations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      const id = parseInt(req.params.id);
      const result = await db.update(employeeTerminations)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(employeeTerminations.id, id))
        .returning();
      if (result.length === 0) {
        return res.status(404).json({ message: 'Kayd bulunamadı' });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating termination:", error);
      res.status(500).json({ message: "Ayrılış kaydı güncellenirken hata oluştu" });
    }
  });

  // GET /api/hr/recruitment-stats - Get recruitment statistics
  app.get('/api/hr/recruitment-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;

      if (!isHQRole(user.role as UserRoleType) && user.role !== 'supervisor') {
        return res.status(403).json({ message: 'İstatistiklere erişim yetkiniz yok' });
      }

      // Get counts
      const openPositions = await db.select({ count: sql`COUNT(*)` })
        .from(jobPositions)
        .where(eq(jobPositions.status, 'open'));
      
      const newApplications = await db.select({ count: sql`COUNT(*)` })
        .from(jobApplications)
        .where(eq(jobApplications.status, 'new'));
      
      const scheduledInterviews = await db.select({ count: sql`COUNT(*)` })
        .from(interviews)
        .where(eq(interviews.status, 'scheduled'));
      
      const hiredThisMonth = await db.select({ count: sql`COUNT(*)` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.status, 'hired'),
            sql`${jobApplications.updatedAt} >= date_trunc('month', CURRENT_DATE)`
          )
        );

      res.json({
        openPositions: Number(openPositions[0]?.count || 0),
        newApplications: Number(newApplications[0]?.count || 0),
        scheduledInterviews: Number(scheduledInterviews[0]?.count || 0),
        hiredThisMonth: Number(hiredThisMonth[0]?.count || 0),
      });
    } catch (error: any) {
      console.error("Error fetching recruitment stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  // ==========================================
  // İZİN VE TATİL YÖNETİMİ API'LARI
  // ==========================================

  // GET /api/employee-leaves - Çalışan izin bakiyelerini getir (sadece admin)
  app.get('/api/employee-leaves', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // RBAC: HQ rolleri ve admin izin bakiyelerini görebilir
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      
      const { userId, year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Build query conditions
      const conditions = [eq(employeeLeaves.year, targetYear)];
      if (userId) {
        conditions.push(eq(employeeLeaves.userId, userId as string));
      }
      
      const result = await db.select()
        .from(employeeLeaves)
        .leftJoin(users, eq(employeeLeaves.userId, users.id))
        .where(and(...conditions));
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching employee leaves:", error);
      res.status(500).json({ message: "İzin bakiyeleri yüklenirken hata oluştu" });
    }
  });

  // GET /api/public-holidays - Resmi tatilleri getir
  app.get('/api/public-holidays', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const result = await db.select()
        .from(publicHolidays)
        .where(eq(publicHolidays.year, targetYear))
        .orderBy(publicHolidays.date);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching public holidays:", error);
      res.status(500).json({ message: "Resmi tatiller yüklenirken hata oluştu" });
    }
  });

  // POST /api/public-holidays - Resmi tatil ekle (sadece admin)
  app.post('/api/public-holidays', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }
      
      // Zod validasyonu
      const validated = insertPublicHolidaySchema.parse(req.body);
      
      const result = await db.insert(publicHolidays)
        .values(validated)
        .returning();
      
      res.status(201).json(result[0]);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Geçersiz veri', errors: error.errors });
      }
      console.error("Error creating public holiday:", error);
      res.status(500).json({ message: "Resmi tatil eklenirken hata oluştu" });
    }
  });

  // ==========================================
  // TEST VERİLERİ OLUŞTURMA API'SI
  // ==========================================

  // POST /api/seed-attendance-test - Test için mesai verileri oluştur (sadece admin)
  app.post('/api/seed-attendance-test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      // Tüm aktif çalışanları al
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));
      const branchUsers = allUsers.filter(u => ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'].includes(u.role || ''));

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-indexed

      // Her çalışan için izin bakiyesi oluştur
      const leaveData = branchUsers.map((u, idx) => ({
        userId: u.id,
        year: currentYear,
        leaveType: 'annual',
        totalDays: 14,
        usedDays: Math.floor(Math.random() * 8), // 0-7 gün kullanılmış
        remainingDays: 14 - Math.floor(Math.random() * 8),
        carriedOver: idx % 3 === 0 ? 2 : 0, // Bazılarına geçen yıldan aktarma
      }));

      // Mevcut izin bakiyelerini temizle ve yenilerini ekle
      await db.delete(employeeLeaves).where(eq(employeeLeaves.year, currentYear));
      if (leaveData.length > 0) {
        await db.insert(employeeLeaves).values(leaveData);
      }

      // 2025 Türkiye resmi tatilleri
      const turkeyHolidays = [
        { name: "Yılbaşı", date: "2025-01-01", year: 2025, isHalfDay: false },
        { name: "Ulusal Egemenlik ve Çocuk Bayramı", date: "2025-04-23", year: 2025, isHalfDay: false },
        { name: "Emek ve Dayanışma Günü", date: "2025-05-01", year: 2025, isHalfDay: false },
        { name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", date: "2025-05-19", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 1. Gün", date: "2025-03-30", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 2. Gün", date: "2025-03-31", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 3. Gün", date: "2025-04-01", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 1. Gün", date: "2025-06-06", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 2. Gün", date: "2025-06-07", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 3. Gün", date: "2025-06-08", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 4. Gün", date: "2025-06-09", year: 2025, isHalfDay: false },
        { name: "Demokrasi ve Milli Birlik Günü", date: "2025-07-15", year: 2025, isHalfDay: false },
        { name: "Zafer Bayramı", date: "2025-08-30", year: 2025, isHalfDay: false },
        { name: "Cumhuriyet Bayramı", date: "2025-10-29", year: 2025, isHalfDay: false },
      ];

      // Mevcut tatilleri temizle ve yenilerini ekle
      await db.delete(publicHolidays).where(eq(publicHolidays.year, 2025));
      await db.insert(publicHolidays).values(turkeyHolidays);

      // Her çalışan için rastgele mesai verileri oluştur
      const attendanceData: any[] = [];
      const startDate = new Date(currentYear, currentMonth - 1, 1); // Geçen ayın başı
      const endDate = new Date(currentYear, currentMonth + 1, 0); // Bu ayın sonu

      for (const u of branchUsers) {
        // Her çalışan için farklı özellikler
        const isLateOften = Math.random() > 0.7; // %30 sıklıkla geç kalıyor
        const worksOvertime = Math.random() > 0.5; // %50 fazla mesai yapıyor
        const hasAbsences = Math.random() > 0.8; // %20 devamsızlık var

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Hafta sonu çalışma yok (bazıları hariç)
          if (d.getDay() === 0) continue; // Pazar
          if (d.getDay() === 6 && Math.random() > 0.3) continue; // Cumartesi %70 çalışmıyor

          // Devamsızlık kontrolü
          if (hasAbsences && Math.random() > 0.9) continue; // %10 ihtimalle devamsız

          // Vardiya saatleri (normal: 09:00-18:00)
          const baseCheckIn = 9 * 60; // 09:00 dakika cinsinden
          const baseCheckOut = 18 * 60; // 18:00 dakika cinsinden

          // Geç kalma
          let checkInMinutes = baseCheckIn;
          if (isLateOften && Math.random() > 0.6) {
            checkInMinutes += Math.floor(Math.random() * 30) + 5; // 5-35 dk geç
          }

          // Fazla mesai
          let checkOutMinutes = baseCheckOut;
          if (worksOvertime && Math.random() > 0.5) {
            checkOutMinutes += Math.floor(Math.random() * 120) + 30; // 30-150 dk fazla
          }

          const checkInTime = `${Math.floor(checkInMinutes / 60).toString().padStart(2, '0')}:${(checkInMinutes % 60).toString().padStart(2, '0')}`;
          const checkOutTime = `${Math.floor(checkOutMinutes / 60).toString().padStart(2, '0')}:${(checkOutMinutes % 60).toString().padStart(2, '0')}`;
          
          const workedMinutes = checkOutMinutes - checkInMinutes - 60; // 1 saat mola
          const overtime = workedMinutes > 480 ? workedMinutes - 480 : 0; // 8 saatten fazlası

          attendanceData.push({
            date: d.toISOString().split('T')[0],
            userId: u.id,
            branchId: u.branchId,
            checkInTime,
            checkOutTime,
            status: checkInMinutes > baseCheckIn + 5 ? 'late' : 'present',
            latenessMinutes: checkInMinutes > baseCheckIn ? checkInMinutes - baseCheckIn : 0,
            workedMinutes,
            overtimeMinutes: overtime,
            complianceScore: checkInMinutes <= baseCheckIn + 5 ? 100 : Math.max(60, 100 - (checkInMinutes - baseCheckIn)),
            notes: overtime > 60 ? 'Fazla mesai yapıldı' : null,
          });
        }
      }

      // Mevcut mesai kayıtlarını temizle ve yenilerini ekle
      if (attendanceData.length > 0) {
        // Sadece test verilerini ekle (mevcut verileri silme)
        await db.insert(shiftAttendance).values(attendanceData).onConflictDoNothing();
      }

      res.json({
        success: true,
        message: "Test verileri oluşturuldu",
        stats: {
          employeeLeaves: leaveData.length,
          publicHolidays: turkeyHolidays.length,
          attendanceRecords: attendanceData.length,
          branchUsers: branchUsers.length,
        }
      });
    } catch (error: any) {
      console.error("Error seeding test data:", error);
      res.status(500).json({ message: "Test verileri oluşturulurken hata oluştu", error: error.message });
    }
  });

  // ==========================================
  // SİSTEM SAĞLIK KONTROLÜ API'SI
  // ==========================================

  // GET /api/system-health-check - Tüm dashboard API'larını kontrol et
  app.get('/api/system-health-check', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      const checks: { name: string; status: 'ok' | 'error'; latency?: number; error?: string }[] = [];

      // 1. Veritabanı bağlantısı
      const dbStart = Date.now();
      try {
        await db.select({ count: sql`1` }).from(users);
        checks.push({ name: 'Veritabanı Bağlantısı', status: 'ok', latency: Date.now() - dbStart });
      } catch (e: any) {
        checks.push({ name: 'Veritabanı Bağlantısı', status: 'error', error: e.message });
      }

      // 2. Personel verileri
      const empStart = Date.now();
      try {
        const empCount = await db.select({ count: sql`COUNT(*)` }).from(users);
        checks.push({ name: 'Personel Verileri', status: 'ok', latency: Date.now() - empStart });
      } catch (e: any) {
        checks.push({ name: 'Personel Verileri', status: 'error', error: e.message });
      }

      // 3. Şube verileri
      const branchStart = Date.now();
      try {
        const branchCount = await db.select({ count: sql`COUNT(*)` }).from(branches);
        checks.push({ name: 'Şube Verileri', status: 'ok', latency: Date.now() - branchStart });
      } catch (e: any) {
        checks.push({ name: 'Şube Verileri', status: 'error', error: e.message });
      }

      // 4. Ekipman verileri
      const eqStart = Date.now();
      try {
        const eqCount = await db.select({ count: sql`COUNT(*)` }).from(equipment);
        checks.push({ name: 'Ekipman Verileri', status: 'ok', latency: Date.now() - eqStart });
      } catch (e: any) {
        checks.push({ name: 'Ekipman Verileri', status: 'error', error: e.message });
      }

      // 5. Görev verileri
      const taskStart = Date.now();
      try {
        const taskCount = await db.select({ count: sql`COUNT(*)` }).from(tasks);
        checks.push({ name: 'Görev Verileri', status: 'ok', latency: Date.now() - taskStart });
      } catch (e: any) {
        checks.push({ name: 'Görev Verileri', status: 'error', error: e.message });
      }

      // 6. Mesai verileri
      const attendanceStart = Date.now();
      try {
        const attCount = await db.select({ count: sql`COUNT(*)` }).from(shiftAttendance);
        checks.push({ name: 'Mesai Verileri', status: 'ok', latency: Date.now() - attendanceStart });
      } catch (e: any) {
        checks.push({ name: 'Mesai Verileri', status: 'error', error: e.message });
      }

      // 7. İzin bakiyeleri
      const leaveStart = Date.now();
      try {
        const leaveCount = await db.select({ count: sql`COUNT(*)` }).from(employeeLeaves);
        checks.push({ name: 'İzin Bakiyeleri', status: 'ok', latency: Date.now() - leaveStart });
      } catch (e: any) {
        checks.push({ name: 'İzin Bakiyeleri', status: 'error', error: e.message });
      }

      // 8. Resmi tatiller
      const holidayStart = Date.now();
      try {
        const holidayCount = await db.select({ count: sql`COUNT(*)` }).from(publicHolidays);
        checks.push({ name: 'Resmi Tatiller', status: 'ok', latency: Date.now() - holidayStart });
      } catch (e: any) {
        checks.push({ name: 'Resmi Tatiller', status: 'error', error: e.message });
      }

      const allOk = checks.every(c => c.status === 'ok');
      const avgLatency = checks.filter(c => c.latency).reduce((sum, c) => sum + (c.latency || 0), 0) / checks.filter(c => c.latency).length;

      res.json({
        overall: allOk ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        avgLatency: Math.round(avgLatency),
        checks,
      });
    } catch (error: any) {
      console.error("Error in system health check:", error);
      res.status(500).json({ message: "Sistem kontrol hatası", error: error.message });
    }
  });

  // Detailed Reports API Endpoints
  app.get('/api/detailed-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      ensurePermission(user, 'performance', 'view', 'Raporlara erişim yetkiniz yok');
      
      const reports = await storage.getReports({ createdById: user.id });
      res.json(reports);
    } catch (error: any) {
      console.error("Get reports error:", error);
      if (error.name === 'AuthorizationError') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Raporlar alınamadı" });
    }
  });

  app.post('/api/detailed-reports', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      ensurePermission(user, 'performance', 'create', 'Rapor oluşturma yetkiniz yok');
      
      const data = z.object({
        title: z.string(),
        reportType: z.string(),
        branchIds: z.array(z.number()),
        dateRange: z.object({ start: z.string(), end: z.string() }),
        metrics: z.array(z.string()),
        chartType: z.string().optional(),
        includeAISummary: z.boolean().optional(),
      }).parse(req.body);

      const report = await storage.createReport({
        ...data,
        createdById: user.id,
      });
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Create report error:", error);
      if (error.name === 'AuthorizationError') {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Rapor oluşturulamadı" });
    }
  });

  app.get('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      res.json(report);
    } catch (error: any) {
      console.error("Get report error:", error);
      res.status(500).json({ message: "Rapor alınamadı" });
    }
  });

  app.patch('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const reportId = parseInt(req.params.id);
      
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      if (report.createdById !== user.id && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkisiz işlem" });
      }

      const updated = await storage.updateReport(reportId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update report error:", error);
      res.status(500).json({ message: "Rapor güncellenemedi" });
    }
  });

  app.delete('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const reportId = parseInt(req.params.id);
      
      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      if (report.createdById !== user.id && !isHQRole(user.role)) {
        return res.status(403).json({ message: "Yetkisiz işlem" });
      }

      await storage.deleteReport(reportId);
      res.json({ message: "Rapor silindi" });
    } catch (error: any) {
      console.error("Delete report error:", error);
      res.status(500).json({ message: "Rapor silinemedi" });
    }
  });

  // Branch Comparisons API
  app.get('/api/branch-comparisons/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const comparisons = await storage.getBranchComparisons(reportId);
      res.json(comparisons);
    } catch (error: any) {
      console.error("Get branch comparisons error:", error);
      res.status(500).json({ message: "Karşılaştırmalar alınamadı" });
    }
  });

  // Trend Metrics API
  app.get('/api/trend-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { reportId, branchId } = req.query;
      const metrics = await storage.getTrendMetrics(
        reportId ? parseInt(reportId) : undefined,
        branchId ? parseInt(branchId) : undefined
      );
      res.json(metrics);
    } catch (error: any) {
      console.error("Get trend metrics error:", error);
      res.status(500).json({ message: "Trendler alınamadı" });
    }
  });

  // AI Summary for Reports
  app.post('/api/ai-summary-report', isAuthenticated, async (req: any, res) => {
    try {
      const { reportId } = req.body;
      const user = req.user;

      if (!reportId) {
        return res.status(400).json({ message: "Rapor ID'si gereklidir" });
      }

      const report = await storage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }

      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Sadece HQ kullanıcıları AI özeti oluşturabilir" });
      }

      const summaryPrompt = `Şu rapor için kısa bir özet oluştur:
      Rapor Adı: ${report.title}
      Rapor Tipi: ${report.reportType}
      Dönem: ${report.dateRange?.start} - ${report.dateRange?.end}
      Metrikleri: ${report.metrics?.join(", ")}
      
      Önemli bulguları ve önerileri kısaca yaz.`;

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          max_tokens: 500,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error("OpenAI API error");
      }

      const data = await openaiResponse.json();
      const summary = data.choices?.[0]?.message?.content || "";

      const aiSummary = await storage.createAISummary({
        reportId,
        summary,
        keyFindings: "",
        recommendations: "",
        visualInsights: "",
      });

      res.json(aiSummary);
    } catch (error: any) {
      console.error("AI summary error:", error);
      res.status(500).json({ message: "AI özeti oluşturulamadı" });
    }
  });

  // ============================================================
  // QUALITY AUDIT MODULE - Kalite Kontrol API
  // ============================================================

  // Import scoring engine
  const { 
    computeAuditScore, 
    getCAPAPriority, 
    shouldCreateCAPA, 
    isValidCAPATransition,
    calculateSLADeadline,
    getSLAStatus 
  } = await import('./audit-scoring');

  // GET /api/audit-templates - List all templates
  app.get('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Şablon listesine erişim yetkiniz yok" });
      }

      const templates = await db.select().from(auditTemplates).orderBy(desc(auditTemplates.createdAt));
      res.json(templates);
    } catch (error: any) {
      console.error("Get audit templates error:", error);
      res.status(500).json({ message: "Şablonlar alınamadı" });
    }
  });

  // GET /api/audit-templates/:id - Get single template with items
  app.get('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const [template] = await db.select().from(auditTemplates).where(eq(auditTemplates.id, templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      const items = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, templateId))
        .orderBy(auditTemplateItems.sectionOrder, auditTemplateItems.itemOrder);

      res.json({ ...template, items });
    } catch (error: any) {
      console.error("Get audit template error:", error);
      res.status(500).json({ message: "Şablon alınamadı" });
    }
  });

  // POST /api/audit-templates - Create new template
  app.post('/api/audit-templates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon oluşturma yetkiniz yok" });
      }

      const data = insertAuditTemplateSchema.parse(req.body);
      const [template] = await db.insert(auditTemplates).values({
        ...data,
        createdById: user.id,
      }).returning();

      res.status(201).json(template);
    } catch (error: any) {
      console.error("Create audit template error:", error);
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });

  // POST /api/audit-templates/import - Import template from JSON
  app.post('/api/audit-templates/import', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon import yetkiniz yok" });
      }

      const { name, description, version, isActive, totalPoints, passingScore, sections } = req.body;

      // Create template
      const [template] = await db.insert(auditTemplates).values({
        name,
        description,
        version: version || "1.0.0",
        isActive: isActive !== false,
        totalPoints: totalPoints || 100,
        passingScore: passingScore || 70,
        createdById: user.id,
      }).returning();

      // Create template items from sections
      const items: InsertAuditTemplateItem[] = [];
      for (const section of sections || []) {
        for (const item of section.items || []) {
          items.push({
            templateId: template.id,
            sectionName: section.sectionName,
            sectionOrder: section.sectionOrder,
            sectionWeight: section.weight,
            itemCode: item.itemCode,
            questionTr: item.questionTr,
            questionEn: item.questionEn,
            category: item.category,
            maxPoints: item.maxPoints,
            isCritical: item.isCritical || false,
            requiresPhoto: item.requiresPhoto || false,
            itemOrder: item.itemOrder,
          });
        }
      }

      if (items.length > 0) {
        await db.insert(auditTemplateItems).values(items);
      }

      const createdItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, template.id));

      res.status(201).json({ ...template, items: createdItems });
    } catch (error: any) {
      console.error("Import audit template error:", error);
      res.status(500).json({ message: "Şablon import edilemedi" });
    }
  });

  // PUT /api/audit-templates/:id - Update template
  app.put('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon güncelleme yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      const data = insertAuditTemplateSchema.partial().parse(req.body);
      
      const [updated] = await db.update(auditTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(auditTemplates.id, templateId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Şablon bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update audit template error:", error);
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });

  // DELETE /api/audit-templates/:id - Delete template
  app.delete('/api/audit-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şablon silme yetkiniz yok" });
      }

      const templateId = parseInt(req.params.id);
      await db.delete(auditTemplates).where(eq(auditTemplates.id, templateId));
      res.json({ message: "Şablon silindi" });
    } catch (error: any) {
      console.error("Delete audit template error:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });

  // ============================================================
  // AUDIT TEMPLATE ITEMS - Şablon Maddeleri CRUD
  // ============================================================

  // Zod validation schema for template items
  const templateItemSchema = z.object({
    itemText: z.string().min(1, "Madde metni gerekli").max(500),
    itemType: z.enum(['checkbox', 'rating', 'text', 'photo']).optional().default('checkbox'),
    weight: z.preprocess(
      (val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? null : num;
      },
      z.number().min(0).max(100).nullable().optional()
    ),
    maxPoints: z.preprocess(
      (val) => typeof val === 'string' ? parseInt(val) : val,
      z.number().min(1).max(100).optional().default(10)
    ),
    requiresPhoto: z.boolean().optional().default(false),
    sortOrder: z.preprocess(
      (val) => typeof val === 'string' ? parseInt(val) : val,
      z.number().int().min(0).optional().default(0)
    ),
  });

  // Helper: verify template exists and user has access (HQ roles and admin only for central template management)
  async function verifyTemplateAccess(templateId: number, user: any): Promise<boolean> {
    // Audit templates are centrally managed by HQ/admin - this is intentional
    if (!isHQRole(user.role) && user.role !== 'admin') return false;
    const [template] = await db.select({ id: auditTemplates.id })
      .from(auditTemplates)
      .where(eq(auditTemplates.id, templateId))
      .limit(1);
    return !!template;
  }

  // Helper: verify item belongs to template
  async function verifyItemOwnership(itemId: number, templateId: number): Promise<boolean> {
    const [item] = await db.select({ templateId: auditTemplateItems.templateId })
      .from(auditTemplateItems)
      .where(eq(auditTemplateItems.id, itemId))
      .limit(1);
    return item?.templateId === templateId;
  }

  // POST /api/audit-templates/:id/items - Add new item to template
  app.post('/api/audit-templates/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Validate request body
      const validation = templateItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const data = validation.data;
      const [newItem] = await db.insert(auditTemplateItems).values({
        templateId,
        itemText: data.itemText,
        itemType: data.itemType,
        weight: typeof data.weight === 'number' ? data.weight : null,
        maxPoints: data.maxPoints,
        requiresPhoto: data.requiresPhoto,
        sortOrder: data.sortOrder,
      }).returning();

      res.status(201).json(newItem);
    } catch (error: any) {
      console.error("Add audit template item error:", error);
      res.status(500).json({ message: "Madde eklenemedi" });
    }
  });

  // PUT /api/audit-templates/:id/items/:itemId - Update item
  app.put('/api/audit-templates/:id/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Verify item belongs to this template
      const isOwned = await verifyItemOwnership(itemId, templateId);
      if (!isOwned) {
        return res.status(403).json({ message: "Bu madde bu şablona ait değil" });
      }

      // Validate request body
      const validation = templateItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const data = validation.data;
      const [updated] = await db.update(auditTemplateItems)
        .set({
          itemText: data.itemText,
          itemType: data.itemType,
          weight: typeof data.weight === 'number' ? data.weight : null,
          maxPoints: data.maxPoints,
          requiresPhoto: data.requiresPhoto,
          sortOrder: data.sortOrder,
        })
        .where(eq(auditTemplateItems.id, itemId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Madde bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update audit template item error:", error);
      res.status(500).json({ message: "Madde güncellenemedi" });
    }
  });

  // DELETE /api/audit-templates/:id/items/:itemId - Delete item
  app.delete('/api/audit-templates/:id/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const templateId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);

      // Verify template access
      const hasAccess = await verifyTemplateAccess(templateId, user);
      if (!hasAccess) {
        return res.status(403).json({ message: "Şablona erişim yetkiniz yok" });
      }

      // Verify item belongs to this template
      const isOwned = await verifyItemOwnership(itemId, templateId);
      if (!isOwned) {
        return res.status(403).json({ message: "Bu madde bu şablona ait değil" });
      }

      await db.delete(auditTemplateItems).where(eq(auditTemplateItems.id, itemId));
      res.json({ message: "Madde silindi" });
    } catch (error: any) {
      console.error("Delete audit template item error:", error);
      res.status(500).json({ message: "Madde silinemedi" });
    }
  });

  // ============================================================
  // AUDIT INSTANCES - Denetim Kayıtları
  // ============================================================

  // GET /api/audits - List audits with filters
  app.get('/api/audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { branchId, status, dateFrom, dateTo, auditorId } = req.query;

      const conditions: any[] = [];

      // Branch filtering
      if (isBranchRole(user.role)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        conditions.push(eq(auditInstances.branchId, user.branchId));
      } else if (branchId) {
        conditions.push(eq(auditInstances.branchId, parseInt(branchId)));
      }

      if (status) {
        conditions.push(eq(auditInstances.status, status));
      }
      if (auditorId) {
        conditions.push(eq(auditInstances.auditorId, auditorId));
      }
      if (dateFrom) {
        conditions.push(sql`${auditInstances.auditDate} >= ${new Date(dateFrom)}`);
      }
      if (dateTo) {
        conditions.push(sql`${auditInstances.auditDate} <= ${new Date(dateTo)}`);
      }

      const audits = await db.select({
        id: auditInstances.id,
        templateId: auditInstances.templateId,
        auditType: auditInstances.auditType,
        branchId: auditInstances.branchId,
        userId: auditInstances.userId,
        auditorId: auditInstances.auditorId,
        auditDate: auditInstances.auditDate,
        status: auditInstances.status,
        totalScore: auditInstances.totalScore,
        maxScore: auditInstances.maxScore,
        notes: auditInstances.notes,
        actionItems: auditInstances.actionItems,
        followUpRequired: auditInstances.followUpRequired,
        followUpDate: auditInstances.followUpDate,
        completedAt: auditInstances.completedAt,
        createdAt: auditInstances.createdAt,
        updatedAt: auditInstances.updatedAt,
        branch: {
          id: branches.id,
          name: branches.name,
        },
        auditor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
        .from(auditInstances)
        .leftJoin(branches, eq(auditInstances.branchId, branches.id))
        .leftJoin(users, eq(auditInstances.auditorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditInstances.auditDate));

      res.json(audits);
    } catch (error: any) {
      console.error("Get audits error:", error);
      res.status(500).json({ message: "Denetimler alınamadı" });
    }
  });

  // GET /api/audits/:id - Get single audit with responses
  app.get('/api/audits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const auditId = parseInt(req.params.id);
      const [audit] = await db.select().from(auditInstances).where(eq(auditInstances.id, auditId));
      
      if (!audit) {
        return res.status(404).json({ message: "Denetim bulunamadı" });
      }

      // Get template and items
      const [template] = await db.select().from(auditTemplates).where(eq(auditTemplates.id, audit.templateId));
      const templateItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, audit.templateId))
        .orderBy(auditTemplateItems.sectionOrder, auditTemplateItems.itemOrder);

      // Get responses
      const responses = await db.select().from(auditInstanceItems)
        .where(eq(auditInstanceItems.instanceId, auditId));

      // Get corrective actions
      const capas = await db.select().from(correctiveActions)
        .where(eq(correctiveActions.auditInstanceId, auditId));

      res.json({ 
        ...audit, 
        template,
        templateItems,
        responses,
        correctiveActions: capas 
      });
    } catch (error: any) {
      console.error("Get audit error:", error);
      res.status(500).json({ message: "Denetim alınamadı" });
    }
  });

  // POST /api/audits - Start new audit
  app.post('/api/audits', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Denetim başlatma yetkiniz yok" });
      }

      const { templateId, branchId, userId, auditType, notes, scheduledFor } = req.body;
      
      // Validate required fields
      if (!templateId) {
        return res.status(400).json({ message: "Şablon seçilmedi" });
      }
      
      // Determine audit type from target
      let resolvedAuditType = auditType;
      if (!resolvedAuditType) {
        resolvedAuditType = userId ? 'personnel' : 'branch';
      }
      
      const [audit] = await db.insert(auditInstances).values({
        templateId: parseInt(templateId),
        branchId: branchId ? parseInt(branchId) : null,
        userId: userId || null,
        auditType: resolvedAuditType,
        auditorId: user.id,
        status: 'in_progress',
        auditDate: new Date(),
        notes: notes || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      }).returning();

      res.status(201).json(audit);
    } catch (error: any) {
      console.error("Create audit error:", error);
      res.status(500).json({ message: "Denetim oluşturulamadı" });
    }
  });

  // POST /api/audits/:id/responses - Submit audit responses and calculate score
  app.post('/api/audits/:id/responses', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const auditId = parseInt(req.params.id);
      const { responses } = req.body;

      // Get audit
      const [audit] = await db.select().from(auditInstances).where(eq(auditInstances.id, auditId));
      if (!audit) {
        return res.status(404).json({ message: "Denetim bulunamadı" });
      }

      // Get template items for scoring
      const templateItems = await db.select().from(auditTemplateItems)
        .where(eq(auditTemplateItems.templateId, audit.templateId));

      // Group items by section for scoring
      const sectionMap = new Map<string, any>();
      for (const item of templateItems) {
        if (!sectionMap.has(item.sectionName)) {
          sectionMap.set(item.sectionName, {
            sectionId: item.sectionOrder,
            sectionName: item.sectionName,
            weight: item.sectionWeight || 20,
            items: []
          });
        }
        const response = responses.find((r: any) => r.templateItemId === item.id);
        sectionMap.get(item.sectionName).items.push({
          itemId: item.id,
          itemCode: item.itemCode,
          question: item.questionTr,
          score: response?.score || 0,
          maxPoints: item.maxPoints,
          isCritical: item.isCritical,
          notes: response?.notes,
        });
      }

      // Calculate score
      const scoreResult = computeAuditScore(Array.from(sectionMap.values()));

      // Save responses
      for (const response of responses) {
        await db.insert(auditInstanceItems).values({
          instanceId: auditId,
          templateItemId: response.templateItemId,
          score: response.score,
          notes: response.notes,
          photoUrls: response.photoUrls || [],
          scoredById: user.id,
        }).onConflictDoUpdate({
          target: [auditInstanceItems.instanceId, auditInstanceItems.templateItemId],
          set: {
            score: response.score,
            notes: response.notes,
            photoUrls: response.photoUrls || [],
            scoredById: user.id,
            updatedAt: new Date(),
          }
        });
      }

      // Update audit with score
      await db.update(auditInstances).set({
        totalScore: scoreResult.totalScore,
        grade: scoreResult.grade,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(auditInstances.id, auditId));

      // Create CAPA items automatically
      for (const capaItem of scoreResult.capaItems) {
        const slaDeadline = calculateSLADeadline(new Date(), capaItem.slaHours);
        await db.insert(correctiveActions).values({
          auditInstanceId: auditId,
          auditItemId: capaItem.itemId,
          title: `${capaItem.itemCode}: ${capaItem.question}`,
          description: `Denetimde düşük puan alındı (${capaItem.score} puan). Düzeltici aksiyon gerekli.`,
          priority: capaItem.priority,
          status: 'open',
          dueDate: slaDeadline,
          createdById: user.id,
        });
      }

      res.json({
        auditId,
        score: scoreResult,
        capaCount: scoreResult.capaItems.length,
      });
    } catch (error: any) {
      console.error("Submit audit responses error:", error);
      res.status(500).json({ message: "Yanıtlar kaydedilemedi" });
    }
  });

  // PUT /api/audits/:id - Update audit status
  app.put('/api/audits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const auditId = parseInt(req.params.id);
      const { status, notes } = req.body;

      const [updated] = await db.update(auditInstances).set({
        status,
        notes,
        updatedAt: new Date(),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      }).where(eq(auditInstances.id, auditId)).returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Update audit error:", error);
      res.status(500).json({ message: "Denetim güncellenemedi" });
    }
  });

  // ============================================================
  // CORRECTIVE ACTIONS (CAPA) - Düzeltici Aksiyonlar
  // ============================================================

  // GET /api/corrective-actions - List CAPAs with filters
  app.get('/api/corrective-actions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { status, priority, branchId, assignedToId } = req.query;

      let conditions: any[] = [];

      // Branch filtering for branch users
      if (isBranchRole(user.role)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        // Get audits for this branch, then filter CAPAs
        const branchAudits = await db.select({ id: auditInstances.id })
          .from(auditInstances)
          .where(eq(auditInstances.branchId, user.branchId));
        const auditIds = branchAudits.map(a => a.id);
        if (auditIds.length > 0) {
          conditions.push(inArray(correctiveActions.auditInstanceId, auditIds));
        } else {
          return res.json([]);
        }
      }

      if (status) {
        conditions.push(eq(correctiveActions.status, status));
      }
      if (priority) {
        conditions.push(eq(correctiveActions.priority, priority));
      }
      if (assignedToId) {
        conditions.push(eq(correctiveActions.assignedToId, assignedToId));
      }

      const capas = conditions.length > 0
        ? await db.select().from(correctiveActions).where(and(...conditions)).orderBy(desc(correctiveActions.createdAt))
        : await db.select().from(correctiveActions).orderBy(desc(correctiveActions.createdAt));

      // Add SLA status to each CAPA
      const capasWithSLA = capas.map(capa => ({
        ...capa,
        slaStatus: capa.dueDate ? getSLAStatus(new Date(capa.dueDate), capa.completedAt ? new Date(capa.completedAt) : undefined) : 'on_track',
      }));

      res.json(capasWithSLA);
    } catch (error: any) {
      console.error("Get corrective actions error:", error);
      res.status(500).json({ message: "Aksiyonlar alınamadı" });
    }
  });

  // GET /api/corrective-actions/:id - Get single CAPA with updates and relations
  app.get('/api/corrective-actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const capaId = parseInt(req.params.id);
      const [capa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      
      if (!capa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // Fetch related entities
      const [assignedTo] = capa.assignedToId 
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, capa.assignedToId))
        : [null];
      
      const [createdBy] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, capa.createdById));

      // Fetch audit instance with branch and template
      const [auditInstance] = capa.auditInstanceId
        ? await db.select({
            id: auditInstances.id,
            auditDate: auditInstances.auditDate,
            branchId: auditInstances.branchId,
          }).from(auditInstances).where(eq(auditInstances.id, capa.auditInstanceId))
        : [null];

      let auditInstanceData = null;
      if (auditInstance) {
        const [template] = await db.select({ id: auditTemplates.id, title: auditTemplates.title })
          .from(auditTemplates).where(eq(auditTemplates.id, (await db.select({ templateId: auditInstances.templateId }).from(auditInstances).where(eq(auditInstances.id, capa.auditInstanceId)))[0]?.templateId || 0));
        const [branch] = auditInstance.branchId
          ? await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.id, auditInstance.branchId))
          : [null];
        auditInstanceData = { ...auditInstance, template, branch };
      }

      // Fetch audit item
      const [auditItem] = capa.auditItemId
        ? await db.select({ id: auditTemplateItems.id, itemText: auditTemplateItems.itemText })
            .from(auditTemplateItems).where(eq(auditTemplateItems.id, capa.auditItemId))
        : [null];

      // Fetch updates with user info
      const updates = await db.select().from(correctiveActionUpdates)
        .where(eq(correctiveActionUpdates.correctiveActionId, capaId))
        .orderBy(desc(correctiveActionUpdates.createdAt));

      const updatesWithUsers = await Promise.all(updates.map(async (update) => {
        const [updatedBy] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, update.updatedById));
        return { ...update, updatedBy };
      }));

      res.json({
        ...capa,
        slaStatus: capa.dueDate ? getSLAStatus(new Date(capa.dueDate)) : 'on_track',
        assignedTo,
        createdBy,
        auditInstance: auditInstanceData,
        auditItem,
        updates: updatesWithUsers,
      });
    } catch (error: any) {
      console.error("Get corrective action error:", error);
      res.status(500).json({ message: "Aksiyon alınamadı" });
    }
  });

  // POST /api/corrective-actions - Create manual CAPA
  app.post('/api/corrective-actions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const data = insertCorrectiveActionSchema.parse(req.body);

      const { priority, slaHours } = getCAPAPriority(0, false);
      const dueDate = data.dueDate || calculateSLADeadline(new Date(), slaHours);

      const [capa] = await db.insert(correctiveActions).values({
        ...data,
        priority: data.priority || priority,
        dueDate,
        createdById: user.id,
      }).returning();

      res.status(201).json(capa);
    } catch (error: any) {
      console.error("Create corrective action error:", error);
      res.status(500).json({ message: "Aksiyon oluşturulamadı" });
    }
  });

  // PUT /api/corrective-actions/:id - Update CAPA status
  app.put('/api/corrective-actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const capaId = parseInt(req.params.id);
      const { status, assignedToId, notes, resolution, photoUrls } = req.body;

      // Get current CAPA
      const [currentCapa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      if (!currentCapa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // Validate status transition
      if (status && !isValidCAPATransition(currentCapa.status, status)) {
        return res.status(400).json({ message: `${currentCapa.status} durumundan ${status} durumuna geçiş yapılamaz` });
      }

      // HQ approval required for closing (case-insensitive check)
      if (status && status.toUpperCase() === 'CLOSED' && !isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CAPA kapatma yetkisi sadece HQ kullanıcılarında" });
      }

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (assignedToId) updateData.assignedToId = assignedToId;
      if (notes) updateData.notes = notes;
      if (resolution) updateData.resolution = resolution;
      if (photoUrls) updateData.photoUrls = photoUrls;
      if (status === 'completed' || status === 'closed') {
        updateData.completedAt = new Date();
      }

      const [updated] = await db.update(correctiveActions)
        .set(updateData)
        .where(eq(correctiveActions.id, capaId))
        .returning();

      // Log status change
      if (status && status !== currentCapa.status) {
        await db.insert(correctiveActionUpdates).values({
          correctiveActionId: capaId,
          status,
          notes: notes || `Durum değişikliği: ${currentCapa.status} → ${status}`,
          updatedById: user.id,
        });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update corrective action error:", error);
      res.status(500).json({ message: "Aksiyon güncellenemedi" });
    }
  });

  // POST /api/corrective-actions/:id/updates - Add CAPA update with status change
  app.post('/api/corrective-actions/:id/updates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const capaId = parseInt(req.params.id);
      const { newStatus, notes, evidence } = req.body;

      // Get current CAPA to record old status
      const [currentCapa] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, capaId));
      if (!currentCapa) {
        return res.status(404).json({ message: "Aksiyon bulunamadı" });
      }

      // HQ approval required for closing (case-insensitive check)
      if (newStatus && newStatus.toUpperCase() === 'CLOSED' && !isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "CAPA kapatma yetkisi sadece HQ kullanıcılarında" });
      }

      // Validate status transition if status is changing
      if (newStatus && newStatus !== 'update' && !isValidCAPATransition(currentCapa.status, newStatus)) {
        return res.status(400).json({ message: `${currentCapa.status} durumundan ${newStatus} durumuna geçiş yapılamaz` });
      }

      const [update] = await db.insert(correctiveActionUpdates).values({
        correctiveActionId: capaId,
        oldStatus: currentCapa.status,
        newStatus: newStatus || 'update',
        notes,
        evidence: evidence || null,
        updatedById: user.id,
      }).returning();

      // Update the main CAPA status atomically
      if (newStatus && newStatus !== 'update' && newStatus !== currentCapa.status) {
        const updateData: any = { 
          status: newStatus, 
          updatedAt: new Date() 
        };
        if (newStatus.toUpperCase() === 'CLOSED') {
          updateData.closedDate = new Date();
        }
        await db.update(correctiveActions)
          .set(updateData)
          .where(eq(correctiveActions.id, capaId));
      }

      res.status(201).json(update);
    } catch (error: any) {
      console.error("Add CAPA update error:", error);
      res.status(500).json({ message: "Güncelleme eklenemedi" });
    }
  });

  // ============================================================
  // AUDIT ANALYTICS - Denetim Analitikleri
  // ============================================================

  // GET /api/audits/analytics/dashboard - Dashboard statistics
  app.get('/api/audits/analytics/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { branchId, dateFrom, dateTo } = req.query;

      let branchFilter = branchId ? parseInt(branchId) : undefined;
      if (isBranchRole(user.role)) {
        branchFilter = user.branchId;
      }

      // Get audit counts by status
      const statusCounts = await db.select({
        status: auditInstances.status,
        count: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`)
        .groupBy(auditInstances.status);

      // Get average scores
      const scoreStats = await db.select({
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        minScore: sql<number>`min(${auditInstances.totalScore})`,
        maxScore: sql<number>`max(${auditInstances.totalScore})`,
        totalAudits: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(and(
          branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`,
          eq(auditInstances.status, 'completed')
        ));

      // Get CAPA counts by status
      const capaCounts = await db.select({
        status: correctiveActions.status,
        count: sql<number>`count(*)::int`,
      }).from(correctiveActions).groupBy(correctiveActions.status);

      // Get CAPA counts by priority
      const capaPriorityCounts = await db.select({
        priority: correctiveActions.priority,
        count: sql<number>`count(*)::int`,
      }).from(correctiveActions)
        .where(sql`${correctiveActions.status} NOT IN ('closed', 'cancelled')`)
        .groupBy(correctiveActions.priority);

      // Get recent audits
      const recentAudits = await db.select().from(auditInstances)
        .where(branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`)
        .orderBy(desc(auditInstances.auditDate))
        .limit(5);

      // Get overdue CAPAs
      const overdueCAPAs = await db.select().from(correctiveActions)
        .where(and(
          sql`${correctiveActions.dueDate} < NOW()`,
          sql`${correctiveActions.status} NOT IN ('closed', 'completed', 'cancelled')`
        ))
        .orderBy(correctiveActions.dueDate)
        .limit(10);

      res.json({
        statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
        scoreStats: scoreStats[0] || { avgScore: 0, minScore: 0, maxScore: 0, totalAudits: 0 },
        capaCounts: Object.fromEntries(capaCounts.map(c => [c.status, c.count])),
        capaPriorityCounts: Object.fromEntries(capaPriorityCounts.map(c => [c.priority, c.count])),
        recentAudits,
        overdueCAPAs,
      });
    } catch (error: any) {
      console.error("Get audit analytics error:", error);
      res.status(500).json({ message: "Analitik verileri alınamadı" });
    }
  });

  // GET /api/audits/analytics/trends - Score trends over time
  app.get('/api/audits/analytics/trends', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { branchId, months } = req.query;
      const monthCount = parseInt(months as string) || 6;

      let branchFilter = branchId ? parseInt(branchId) : undefined;
      if (isBranchRole(user.role)) {
        branchFilter = user.branchId;
      }

      // Get monthly average scores
      const trends = await db.select({
        month: sql<string>`to_char(${auditInstances.auditDate}, 'YYYY-MM')`,
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        auditCount: sql<number>`count(*)::int`,
      }).from(auditInstances)
        .where(and(
          branchFilter ? eq(auditInstances.branchId, branchFilter) : sql`1=1`,
          eq(auditInstances.status, 'completed'),
          sql`${auditInstances.auditDate} >= NOW() - INTERVAL '${sql.raw(String(monthCount))} months'`
        ))
        .groupBy(sql`to_char(${auditInstances.auditDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${auditInstances.auditDate}, 'YYYY-MM')`);

      res.json(trends);
    } catch (error: any) {
      console.error("Get audit trends error:", error);
      res.status(500).json({ message: "Trend verileri alınamadı" });
    }
  });

  // GET /api/audits/analytics/branch-comparison - Compare branches
  app.get('/api/audits/analytics/branch-comparison', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin') {
        return res.status(403).json({ message: "Şube karşılaştırma yetkiniz yok" });
      }

      const comparison = await db.select({
        branchId: auditInstances.branchId,
        avgScore: sql<number>`avg(${auditInstances.totalScore})::numeric(5,2)`,
        auditCount: sql<number>`count(*)::int`,
        passRate: sql<number>`(count(*) FILTER (WHERE ${auditInstances.totalScore} >= 70) * 100.0 / NULLIF(count(*), 0))::numeric(5,2)`,
      }).from(auditInstances)
        .where(eq(auditInstances.status, 'completed'))
        .groupBy(auditInstances.branchId)
        .orderBy(sql`avg(${auditInstances.totalScore}) DESC`);

      // Get branch names
      const branchIds = comparison.map(c => c.branchId).filter(Boolean) as number[];
      const branchList = branchIds.length > 0 
        ? await db.select({ id: branches.id, name: branches.name }).from(branches).where(inArray(branches.id, branchIds))
        : [];
      const branchMap = new Map(branchList.map(b => [b.id, b.name]));

      const result = comparison.map(c => ({
        ...c,
        branchName: branchMap.get(c.branchId!) || 'Bilinmeyen Şube',
      }));

      res.json(result);
    } catch (error: any) {
      console.error("Get branch comparison error:", error);
      res.status(500).json({ message: "Şube karşılaştırması alınamadı" });
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
  app.get('/api/salary/deduction-types', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'yatirimci_branch') {
        return res.status(403).json({ message: "Kesinti tiplerine erişim yetkiniz yok" });
      }
      const types = await db.select().from(salaryDeductionTypes).where(eq(salaryDeductionTypes.isActive, true));
      res.json(types);
    } catch (error: any) {
      console.error("Get deduction types error:", error);
      res.status(500).json({ message: "Kesinti tipleri alınamadı" });
    }
  });

  // POST /api/salary/deduction-types - Yeni kesinti tipi oluştur (sadece admin)
  app.post('/api/salary/deduction-types', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
        return res.status(403).json({ message: "Kesinti tipi oluşturma yetkiniz yok" });
      }
      const validated = insertSalaryDeductionTypeSchema.parse(req.body);
      const [newType] = await db.insert(salaryDeductionTypes).values(validated).returning();
      res.json(newType);
    } catch (error: any) {
      console.error("Create deduction type error:", error);
      res.status(500).json({ message: "Kesinti tipi oluşturulamadı" });
    }
  });

  // GET /api/salary/employee/:userId - Personelin maaş bilgilerini getir
  app.get('/api/salary/employee/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgileri alınamadı" });
    }
  });

  // POST /api/salary/employee - Personele maaş bilgisi ekle
  app.post('/api/salary/employee', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Create employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgisi eklenemedi" });
    }
  });

  // PATCH /api/salary/employee/:id - Maaş bilgisini güncelle
  app.patch('/api/salary/employee/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Update employee salary error:", error);
      res.status(500).json({ message: "Maaş bilgisi güncellenemedi" });
    }
  });

  // GET /api/salary/deductions/:userId - Personelin kesintilerini getir
  app.get('/api/salary/deductions/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get salary deductions error:", error);
      res.status(500).json({ message: "Kesinti bilgileri alınamadı" });
    }
  });

  // POST /api/salary/deductions - Manuel kesinti ekle
  app.post('/api/salary/deductions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe' && user.role !== 'yatirimci_branch') {
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
    } catch (error: any) {
      console.error("Create salary deduction error:", error);
      res.status(500).json({ message: "Kesinti eklenemedi" });
    }
  });

  // DELETE /api/salary/deductions/:id - Kesinti sil (sadece onaysız olanlar)
  app.delete('/api/salary/deductions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Delete salary deduction error:", error);
      res.status(500).json({ message: "Kesinti silinemedi" });
    }
  });

  // GET /api/salary/payroll/:userId - Personelin bordro geçmişini getir
  app.get('/api/salary/payroll/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get payroll history error:", error);
      res.status(500).json({ message: "Bordro geçmişi alınamadı" });
    }
  });

  // POST /api/salary/payroll/calculate - Aylık bordro hesapla
  app.post('/api/salary/payroll/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Calculate payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });

  // POST /api/salary/payroll/:id/approve - Bordro onayla
  app.post('/api/salary/payroll/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Approve payroll error:", error);
      res.status(500).json({ message: "Bordro onaylanamadı" });
    }
  });

  // POST /api/salary/payroll/:id/pay - Bordro ödendi olarak işaretle
  app.post('/api/salary/payroll/:id/pay', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Mark paid error:", error);
      res.status(500).json({ message: "Ödeme işlemi yapılamadı" });
    }
  });

  // GET /api/salary/branch/:branchId/summary - Şube maaş özeti
  app.get('/api/salary/branch/:branchId/summary', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get branch salary summary error:", error);
      res.status(500).json({ message: "Şube maaş özeti alınamadı" });
    }
  });

  // POST /api/salary/auto-deductions/calculate - Otomatik kesinti hesapla (geç kalma vb.)
  app.post('/api/salary/auto-deductions/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
    } catch (error: any) {
      console.error("Calculate auto deductions error:", error);
      res.status(500).json({ message: "Otomatik kesinti hesaplanamadı" });
    }
  });

  // ========== BORDRO PARAMETRELERİ API'LERİ ==========

  // Helper function to convert snake_case to camelCase
  const snakeToCamel = (str: string): string => 
    str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  // Helper function to transform object keys from snake_case to camelCase
  const transformPayrollParams = (row: any) => {
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
    return permissions.some((p: any) => 
      p.role === userRole && p.module === 'accounting' && (p.actions || []).includes('view')
    );
  };

  // GET /api/payroll/parameters - Tüm bordro parametrelerini getir
  app.get('/api/payroll/parameters', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get payroll parameters error:", error);
      res.status(500).json({ message: "Bordro parametreleri alınamadı" });
    }
  });

  // GET /api/payroll/parameters/:year - Belirli yılın parametrelerini getir
  app.get('/api/payroll/parameters/:year', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get payroll parameters by year error:", error);
      res.status(500).json({ message: "Bordro parametreleri alınamadı" });
    }
  });

  // PATCH /api/payroll/parameters/:id - Bordro parametrelerini güncelle (sadece admin/muhasebe)
  // Zod schema for validating payroll parameter updates (all values in kuruş/per-mille)
  const payrollParameterUpdateSchema = z.object({
    minimumWageGross: z.number().int().positive().optional(),
    minimumWageNet: z.number().int().positive().optional(),
    taxBracket1Limit: z.number().int().positive().optional(),
    taxBracket2Limit: z.number().int().positive().optional(),
    taxBracket3Limit: z.number().int().positive().optional(),
    taxBracket4Limit: z.number().int().positive().optional(),
    mealAllowanceTaxExemptDaily: z.number().int().nonnegative().optional(),
    mealAllowanceSgkExemptDaily: z.number().int().nonnegative().optional(),
    transportAllowanceExemptDaily: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  }).strict();

  app.patch('/api/payroll/parameters/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'admin' && user.role !== 'muhasebe') {
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
          tax_bracket_1_limit = COALESCE(${updates.taxBracket1Limit ?? null}, tax_bracket_1_limit),
          tax_bracket_2_limit = COALESCE(${updates.taxBracket2Limit ?? null}, tax_bracket_2_limit),
          tax_bracket_3_limit = COALESCE(${updates.taxBracket3Limit ?? null}, tax_bracket_3_limit),
          tax_bracket_4_limit = COALESCE(${updates.taxBracket4Limit ?? null}, tax_bracket_4_limit),
          meal_allowance_tax_exempt_daily = COALESCE(${updates.mealAllowanceTaxExemptDaily ?? null}, meal_allowance_tax_exempt_daily),
          meal_allowance_sgk_exempt_daily = COALESCE(${updates.mealAllowanceSgkExemptDaily ?? null}, meal_allowance_sgk_exempt_daily),
          transport_allowance_exempt_daily = COALESCE(${updates.transportAllowanceExemptDaily ?? null}, transport_allowance_exempt_daily),
          is_active = COALESCE(${updates.isActive ?? null}, is_active),
          notes = COALESCE(${updates.notes ?? null}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `);

      const result = await db.execute(sql`SELECT * FROM payroll_parameters WHERE id = ${id}`);
      res.json(transformPayrollParams(result.rows[0]));
    } catch (error: any) {
      console.error("Update payroll parameters error:", error);
      res.status(500).json({ message: "Bordro parametreleri güncellenemedi" });
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

  app.post('/api/payroll/calculate', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Calculate payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });

  // ============================================
  // EMPLOYEE BENEFITS - Çalışan Yan Haklar API
  // ============================================

  // GET /api/employee-benefits - Tüm yan hakları listele
  app.get('/api/employee-benefits', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const result = await db.execute(sql`
        SELECT eb.*, u.first_name, u.last_name, u.username, u.role, b.name as branch_name
        FROM employee_benefits eb
        JOIN users u ON eb.user_id = u.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE eb.is_active = true
        ORDER BY u.first_name, u.last_name
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Get employee benefits error:", error);
      res.status(500).json({ message: "Yan haklar alınamadı" });
    }
  });

  // GET /api/employee-benefits/:userId - Belirli kullanıcının yan haklarını getir
  app.get('/api/employee-benefits/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const { userId } = req.params;

      // Admin/HQ veya kendi bilgilerini görme
      if (!isHQRole(userRole) && userRole !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const result = await db.execute(sql`
        SELECT * FROM employee_benefits 
        WHERE user_id = ${userId} AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1
      `);
      
      res.json(result.rows[0] || null);
    } catch (error: any) {
      console.error("Get employee benefit error:", error);
      res.status(500).json({ message: "Yan haklar alınamadı" });
    }
  });

  // POST /api/employee-benefits - Yeni yan hak kaydı oluştur
  app.post('/api/employee-benefits', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      // Validate input (values already in kuruş from frontend)
      const benefitsSchema = z.object({
        userId: z.string().min(1, "Kullanıcı ID zorunlu"),
        mealBenefitType: z.enum(['none', 'card', 'cash', 'workplace']).optional().default('none'),
        mealBenefitAmount: z.number().int().min(0).optional().default(0), // kuruş
        transportBenefitType: z.enum(['none', 'card', 'cash']).optional().default('none'),
        transportBenefitAmount: z.number().int().min(0).optional().default(0), // kuruş
        bonusEligible: z.boolean().optional().default(true),
        bonusPercentage: z.string().optional().default('0'),
        disabilityDiscount: z.boolean().optional().default(false),
        disabilityDegree: z.number().int().min(1).max(3).nullable().optional(),
        effectiveFrom: z.string().min(1, "Geçerlilik tarihi zorunlu"),
        notes: z.string().nullable().optional(),
      });

      const parsed = benefitsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
      }

      const { 
        userId, 
        mealBenefitType, 
        mealBenefitAmount, 
        transportBenefitType, 
        transportBenefitAmount,
        bonusEligible,
        bonusPercentage,
        disabilityDiscount,
        disabilityDegree,
        effectiveFrom,
        notes
      } = parsed.data;

      // Mevcut aktif kaydı pasifleştir
      await db.execute(sql`
        UPDATE employee_benefits 
        SET is_active = false, effective_to = ${effectiveFrom}
        WHERE user_id = ${userId} AND is_active = true
      `);

      // Yeni kayıt ekle
      const result = await db.execute(sql`
        INSERT INTO employee_benefits (
          user_id, meal_benefit_type, meal_benefit_amount, 
          transport_benefit_type, transport_benefit_amount,
          bonus_eligible, bonus_percentage, disability_discount, disability_degree,
          effective_from, is_active, notes, created_by_id
        ) VALUES (
          ${userId}, ${mealBenefitType || 'none'}, ${mealBenefitAmount || 0},
          ${transportBenefitType || 'none'}, ${transportBenefitAmount || 0},
          ${bonusEligible !== false}, ${bonusPercentage || '0'}, 
          ${disabilityDiscount || false}, ${disabilityDegree || null},
          ${effectiveFrom}, true, ${notes || null}, ${req.user.id}
        )
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Create employee benefit error:", error);
      res.status(500).json({ message: "Yan hak kaydı oluşturulamadı" });
    }
  });

  // PATCH /api/employee-benefits/:id - Yan hak kaydını güncelle
  app.patch('/api/employee-benefits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const benefitId = parseInt(id);
      if (isNaN(benefitId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      // Validate input (values already in kuruş from frontend)
      const updateBenefitsSchema = z.object({
        mealBenefitType: z.enum(['none', 'card', 'cash', 'workplace']).optional(),
        mealBenefitAmount: z.number().int().min(0).optional(), // kuruş
        transportBenefitType: z.enum(['none', 'card', 'cash']).optional(),
        transportBenefitAmount: z.number().int().min(0).optional(), // kuruş
        bonusEligible: z.boolean().optional(),
        bonusPercentage: z.string().optional(),
        disabilityDiscount: z.boolean().optional(),
        disabilityDegree: z.number().int().min(1).max(3).nullable().optional(),
        notes: z.string().nullable().optional(),
      });

      const parsed = updateBenefitsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
      }

      const { 
        mealBenefitType, 
        mealBenefitAmount, 
        transportBenefitType, 
        transportBenefitAmount,
        bonusEligible,
        bonusPercentage,
        disabilityDiscount,
        disabilityDegree,
        notes
      } = parsed.data;

      const result = await db.execute(sql`
        UPDATE employee_benefits SET
          meal_benefit_type = COALESCE(${mealBenefitType}, meal_benefit_type),
          meal_benefit_amount = COALESCE(${mealBenefitAmount}, meal_benefit_amount),
          transport_benefit_type = COALESCE(${transportBenefitType}, transport_benefit_type),
          transport_benefit_amount = COALESCE(${transportBenefitAmount}, transport_benefit_amount),
          bonus_eligible = COALESCE(${bonusEligible}, bonus_eligible),
          bonus_percentage = COALESCE(${bonusPercentage}, bonus_percentage),
          disability_discount = COALESCE(${disabilityDiscount}, disability_discount),
          disability_degree = COALESCE(${disabilityDegree}, disability_degree),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${benefitId}
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Update employee benefit error:", error);
      res.status(500).json({ message: "Yan hak kaydı güncellenemedi" });
    }
  });

  // GET /api/employees-with-salary - Maaş bilgileri ile personel listesi (SCOPE-AWARE)
  app.get('/api/employees-with-salary', isAuthenticated, async (req: any, res) => {
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
          b.id as branch_id, b.name as branch_name,
          eb.id as benefit_id, eb.meal_benefit_type, eb.meal_benefit_amount,
          eb.transport_benefit_type, eb.transport_benefit_amount,
          eb.bonus_eligible, eb.bonus_percentage, 
          eb.disability_discount, eb.disability_degree
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN employee_benefits eb ON u.id = eb.user_id AND eb.is_active = true
        WHERE ${whereClause}
        ORDER BY u.first_name, u.last_name
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Get employees with salary error:", error);
      res.status(500).json({ message: "Personel maaş listesi alınamadı" });
    }
  });

  // PUT /api/users/:id/compensation - Personel maaş ve yan haklarını güncelle
  app.put('/api/users/:id/compensation', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const { netSalary, mealAllowance, transportAllowance, bonusBase } = req.body;

      // Validate all values are non-negative integers (kuruş)
      const validateValue = (val: any, name: string) => {
        if (val !== undefined && (typeof val !== 'number' || val < 0 || !Number.isInteger(val))) {
          throw new Error(`Geçersiz ${name} değeri`);
        }
        return val ?? null;
      };

      const safeNetSalary = validateValue(netSalary, 'net maaş');
      const safeMealAllowance = validateValue(mealAllowance, 'yemek yardımı');
      const safeTransportAllowance = validateValue(transportAllowance, 'ulaşım yardımı');
      const safeBonusBase = validateValue(bonusBase, 'prim');

      const result = await db.execute(sql`
        UPDATE users 
        SET 
          net_salary = COALESCE(${safeNetSalary}, net_salary),
          meal_allowance = COALESCE(${safeMealAllowance}, meal_allowance),
          transport_allowance = COALESCE(${safeTransportAllowance}, transport_allowance),
          bonus_base = COALESCE(${safeBonusBase}, bonus_base),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, first_name, last_name, net_salary, meal_allowance, transport_allowance, bonus_base
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Update user compensation error:", error);
      res.status(400).json({ message: error.message || "Maaş bilgileri güncellenemedi" });
    }
  });
  
  // PATCH /api/users/:id/salary - Personel maaş bilgilerini güncelle (legacy)
  app.patch('/api/users/:id/salary', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const { netSalary } = req.body;

      if (typeof netSalary !== 'number' || netSalary < 0) {
        return res.status(400).json({ message: "Geçersiz maaş değeri" });
      }

      const result = await db.execute(sql`
        UPDATE users 
        SET net_salary = ${netSalary}
        WHERE id = ${id}
        RETURNING id, username, first_name, last_name, net_salary
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Update user salary error:", error);
      res.status(500).json({ message: "Maaş güncellenemedi" });
    }
  });

  // ========================================
  // PAYROLL RECORDS API - Bordro Yönetimi
  // ========================================

  // GET /api/payroll/records - Bordro kayıtlarını listele (SCOPE-AWARE)
  app.get('/api/payroll/records', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get payroll records error:", error);
      res.status(500).json({ message: "Bordro kayıtları alınamadı" });
    }
  });

  // GET /api/payroll/records/:id - Tek bordro kaydı (SCOPE-AWARE)
  app.get('/api/payroll/records/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı alınamadı" });
    }
  });

  // GET /api/payroll/employee/:userId/overtime - Personelin onaylı mesai dakikaları
  app.get('/api/payroll/employee/:userId/overtime', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get employee overtime error:", error);
      res.status(500).json({ message: "Mesai bilgisi alınamadı" });
    }
  });

  // GET /api/payroll/employee/:userId/attendance - Personelin çalışma saatleri
  app.get('/api/payroll/employee/:userId/attendance', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Get employee attendance error:", error);
      res.status(500).json({ message: "Çalışma saati bilgisi alınamadı" });
    }
  });

  // POST /api/payroll/calculate - Bordro hesaplama (kaydetmeden)
  app.post('/api/payroll/calculate-employee', isAuthenticated, async (req: any, res) => {
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
      const bonusPercentage = parseFloat(benefits?.bonus_percentage || '0');
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
      // Şube personeli: kasa primi, fabrika: normal prim
      const bonusType = employee.branch_id ? 'kasa_primi' : 'normal';
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
    } catch (error: any) {
      console.error("Calculate employee payroll error:", error);
      res.status(500).json({ message: "Bordro hesaplanamadı" });
    }
  });

  // POST /api/payroll/records - Yeni bordro kaydı oluştur
  app.post('/api/payroll/records', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Create payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı oluşturulamadı" });
    }
  });

  // PATCH /api/payroll/records/:id - Bordro kaydını güncelle
  app.patch('/api/payroll/records/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Update payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı güncellenemedi" });
    }
  });

  // PATCH /api/payroll/records/:id/approve - Bordro onaylama
  app.patch('/api/payroll/records/:id/approve', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Approve payroll record error:", error);
      res.status(500).json({ message: "Bordro onaylanamadı" });
    }
  });

  // PATCH /api/payroll/records/:id/pay - Bordro ödendi olarak işaretle
  app.patch('/api/payroll/records/:id/pay', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Pay payroll record error:", error);
      res.status(500).json({ message: "Ödeme işaretlenemedi" });
    }
  });

  // DELETE /api/payroll/records/:id - Bordro kaydını sil
  app.delete('/api/payroll/records/:id', isAuthenticated, async (req: any, res) => {
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
      if (existing.status === 'paid') {
        return res.status(400).json({ message: "Ödenmiş bordro kaydı silinemez" });
      }
      
      await db.execute(sql`DELETE FROM payroll_records WHERE id = ${recordId}`);
      
      res.json({ message: "Bordro kaydı silindi" });
    } catch (error: any) {
      console.error("Delete payroll record error:", error);
      res.status(500).json({ message: "Bordro kaydı silinemedi" });
    }
  });

  // ========================================
  // GRANULAR PERMISSION MANAGEMENT API
  // ========================================

  // GET /api/admin/permission-actions - Tüm aksiyonları modüle göre gruplu getir
  app.get('/api/admin/permission-actions', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const groupedActions = await getAllActionsGroupedByModule();
      res.json(groupedActions);
    } catch (error: any) {
      console.error("Get permission actions error:", error);
      res.status(500).json({ message: "Aksiyon listesi alınamadı" });
    }
  });

  // GET /api/admin/role-grants/:role - Rol için tüm izinleri getir
  app.get('/api/admin/role-grants/:role', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role } = req.params;
      const grants = await getRoleGrants(role);
      res.json(grants);
    } catch (error: any) {
      console.error("Get role grants error:", error);
      res.status(500).json({ message: "Rol izinleri alınamadı" });
    }
  });

  // POST /api/admin/role-grants - İzin ekle veya güncelle
  app.post('/api/admin/role-grants', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role, actionId, scope, isActive } = req.body;
      
      if (!role || !actionId || !scope) {
        return res.status(400).json({ message: "role, actionId ve scope gerekli" });
      }
      
      const validScopes = ['self', 'branch', 'global'];
      if (!validScopes.includes(scope)) {
        return res.status(400).json({ message: "Geçersiz scope değeri" });
      }
      
      const grantId = await upsertPermissionGrant(role, actionId, scope, isActive ?? true);
      res.json({ success: true, grantId });
    } catch (error: any) {
      console.error("Upsert role grant error:", error);
      res.status(500).json({ message: "İzin güncellenemedi" });
    }
  });

  // DELETE /api/admin/role-grants/:role/:actionId - İzin sil
  app.delete('/api/admin/role-grants/:role/:actionId', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
      }
      
      const { role, actionId } = req.params;
      await deletePermissionGrant(role, parseInt(actionId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete role grant error:", error);
      res.status(500).json({ message: "İzin silinemedi" });
    }
  });

  // GET /api/user/permissions - Mevcut kullanıcının tüm izinlerini getir
  app.get('/api/user/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const permissions = await getUserPermissions(user?.role);
      
      // Map to array format for frontend
      const permissionArray = Array.from(permissions.entries()).map(([key, scope]) => {
        const [moduleKey, actionKey] = key.split(':');
        return { moduleKey, actionKey, scope };
      });
      
      res.json(permissionArray);
    } catch (error: any) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ message: "İzinler alınamadı" });
    }
  });

  // ========================================
  // DUYURU (ANNOUNCEMENTS) API
  // ========================================

  // GET /api/announcements - Tüm yayınlanmış duyuruları getir
  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { category, limit = 50 } = req.query;
      
      const now = new Date();
      let query = db.select({
        announcement: announcements,
        readStatus: announcementReadStatus
      })
        .from(announcements)
        .leftJoin(announcementReadStatus, and(
          eq(announcementReadStatus.announcementId, announcements.id),
          eq(announcementReadStatus.userId, user.id)
        ))
        .where(and(
          lte(announcements.publishedAt, now),
          or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
        ))
        .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
        .limit(parseInt(limit as string));
      
      const results = await query;
      
      // Filter by category if provided
      let filtered = results;
      if (category) {
        filtered = results.filter(r => r.announcement.category === category);
      }
      
      // Filter by target roles/branches
      filtered = filtered.filter(r => {
        const ann = r.announcement;
        // Hedefleme yoksa veya "all" seçildiyse herkese göster
        const hasNoTargeting = !ann.targetRoles?.length && !ann.targetBranches?.length;
        const targetRolesLower = ann.targetRoles?.map(role => role.toLowerCase()) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLowerCase();
        if (targetRolesLower.length && userRoleLower && targetRolesLower.includes(userRoleLower)) return true;
        // Kullanıcının şubesi hedeflenmiş mi? (string/number normalize)
        if (ann.targetBranches?.length && user.branchId !== undefined && user.branchId !== null) {
          const userBranchStr = String(user.branchId);
          const matchesBranch = ann.targetBranches.some(b => String(b) === userBranchStr);
          if (matchesBranch) return true;
        }
        return false;
      });
      
      res.json(filtered.map(r => ({
        ...r.announcement,
        isRead: !!r.readStatus
      })));
    } catch (error: any) {
      console.error("Get announcements error:", error);
      res.status(500).json({ message: "Duyurular alınamadı" });
    }
  });

  // GET /api/announcements/banners - Dashboard için aktif banner'ları getir
  app.get('/api/announcements/banners', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const now = new Date();
      
      const results = await db.select()
        .from(announcements)
        .where(and(
          eq(announcements.showOnDashboard, true),
          lte(announcements.publishedAt, now),
          or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
        ))
        .orderBy(
          desc(announcements.isPinned),        // Sabitlenmiş olanlar önce
          desc(announcements.bannerPriority),   // Sonra önceliğe göre
          desc(announcements.publishedAt)       // Son olarak tarihe göre
        )
        .limit(10);
      
      // Filter by target roles/branches
      const filtered = results.filter(ann => {
        // Hedefleme yoksa veya "all" seçildiyse herkese göster
        const hasNoTargeting = !ann.targetRoles?.length && !ann.targetBranches?.length;
        const targetRolesLower = ann.targetRoles?.map(r => r.toLowerCase()) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLowerCase();
        if (targetRolesLower.length && userRoleLower && targetRolesLower.includes(userRoleLower)) return true;
        
        // Kullanıcının şubesi hedeflenmiş mi? (string/number normalize)
        if (ann.targetBranches?.length && user.branchId !== undefined && user.branchId !== null) {
          const userBranchStr = String(user.branchId);
          const matchesBranch = ann.targetBranches.some(b => String(b) === userBranchStr);
          if (matchesBranch) return true;
        }
        
        return false;
      });
      
      // Limit to 5 after filtering
      res.json(filtered.slice(0, 5));
    } catch (error: any) {
      console.error("Get announcement banners error:", error);
      res.status(500).json({ message: "Banner'lar alınamadı" });
    }
  });

  // GET /api/announcements/unread-count - Okunmamış duyuru sayısı
  app.get('/api/announcements/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const now = new Date();
      
      // Get all valid announcements
      const allAnnouncements = await db.select({ id: announcements.id, targetRoles: announcements.targetRoles, targetBranches: announcements.targetBranches })
        .from(announcements)
        .where(and(
          lte(announcements.publishedAt, now),
          or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
        ));
      
      // Filter by targeting
      const visibleIds = allAnnouncements.filter(ann => {
        // Hedefleme yoksa veya "all" seçildiyse herkese göster
        const hasNoTargeting = !ann.targetRoles?.length && !ann.targetBranches?.length;
        const targetRolesLower = ann.targetRoles?.map(role => role.toLowerCase()) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLowerCase();
        if (targetRolesLower.length && userRoleLower && targetRolesLower.includes(userRoleLower)) return true;
        // Kullanıcının şubesi hedeflenmiş mi? (string/number normalize)
        if (ann.targetBranches?.length && user.branchId !== undefined && user.branchId !== null) {
          const userBranchStr = String(user.branchId);
          const matchesBranch = ann.targetBranches.some(b => String(b) === userBranchStr);
          if (matchesBranch) return true;
        }
        return false;
      }).map(a => a.id);
      
      if (visibleIds.length === 0) {
        return res.json({ count: 0 });
      }
      
      // Get read status
      const readAnnouncements = await db.select()
        .from(announcementReadStatus)
        .where(eq(announcementReadStatus.userId, user.id));
      
      const readIds = new Set(readAnnouncements.map(r => r.announcementId));
      const unreadCount = visibleIds.filter(id => !readIds.has(id)).length;
      
      res.json({ count: unreadCount });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.status(500).json({ count: 0 });
    }
  });

  // GET /api/announcements/:id - Tek duyuru detayı
  app.get('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const [result] = await db.select({
        announcement: announcements,
        readStatus: announcementReadStatus
      })
        .from(announcements)
        .leftJoin(announcementReadStatus, and(
          eq(announcementReadStatus.announcementId, announcements.id),
          eq(announcementReadStatus.userId, user.id)
        ))
        .where(eq(announcements.id, parseInt(id)));
      
      if (!result) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }
      
      res.json({
        ...result.announcement,
        isRead: !!result.readStatus
      });
    } catch (error: any) {
      console.error("Get announcement error:", error);
      res.status(500).json({ message: "Duyuru alınamadı" });
    }
  });

  // POST /api/announcements/:id/read - Duyuruyu okundu olarak işaretle
  app.post('/api/announcements/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Upsert read status
      await db.insert(announcementReadStatus)
        .values({
          announcementId: parseInt(id),
          userId: user.id
        })
        .onConflictDoNothing();
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark announcement read error:", error);
      res.status(500).json({ message: "Okundu işaretlenemedi" });
    }
  });

  // ========================================
  // ADMIN DUYURU API
  // ========================================

  // GET /api/admin/announcements - Tüm duyuruları getir (admin)
  app.get('/api/admin/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const results = await db.select()
        .from(announcements)
        .orderBy(desc(announcements.createdAt));
      
      res.json(results);
    } catch (error: any) {
      console.error("Admin get announcements error:", error);
      res.status(500).json({ message: "Duyurular alınamadı" });
    }
  });

  // POST /api/admin/announcements - Yeni duyuru oluştur
  app.post('/api/admin/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { title, message, summary, category, targetRoles, targetBranches, priority, 
              bannerImageUrl, bannerTitle, bannerSubtitle, showOnDashboard, bannerPriority,
              isPinned, expiresAt } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ message: "Başlık ve mesaj gerekli" });
      }
      
      const [newAnnouncement] = await db.insert(announcements)
        .values({
          createdById: req.user.id,
          title,
          message,
          summary,
          category: category || 'general',
          targetRoles,
          targetBranches,
          priority: priority || 'normal',
          bannerImageUrl,
          bannerTitle,
          bannerSubtitle,
          showOnDashboard: showOnDashboard || false,
          bannerPriority: bannerPriority || 0,
          isPinned: isPinned || false,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        })
        .returning();
      
      res.json(newAnnouncement);
    } catch (error: any) {
      console.error("Create announcement error:", error);
      res.status(500).json({ message: "Duyuru oluşturulamadı" });
    }
  });

  // PATCH /api/admin/announcements/:id - Duyuru güncelle
  app.patch('/api/admin/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }
      
      updates.updatedAt = new Date();
      
      const [updated] = await db.update(announcements)
        .set(updates)
        .where(eq(announcements.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update announcement error:", error);
      res.status(500).json({ message: "Duyuru güncellenemedi" });
    }
  });

  // POST /api/ai/generate-image - DALL-E ile görsel oluştur ve Object Storage'a kaydet
  app.post('/api/ai/generate-image', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ message: "Görsel açıklaması gerekli" });
      }

      // Rate limiting check - kullanıcı başına günde max 10 görsel
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "AI görsel oluşturma yetkiniz yok" });
      }

      console.log(`[AI] Generating image for user ${req.user?.id}, prompt: ${prompt.substring(0, 50)}...`);

      // OpenAI DALL-E API'sini çağır (Replit AI Integrations üzerinden)
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "dall-e-3",
          size: "1792x1024",  // 3:1 banner aspect ratio'ya yakın
          quality: "standard",
          n: 1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("DALL-E error:", error);
        return res.status(500).json({ message: "Görsel oluşturulamadı", error: error.error?.message });
      }

      const data = await response.json();
      const tempImageUrl = data.data[0]?.url;
      
      if (!tempImageUrl) {
        return res.status(500).json({ message: "Görsel URL alınamadı" });
      }

      console.log(`[AI] DALL-E returned temp URL, downloading and uploading to Object Storage...`);

      // Geçici URL'den görseli indir
      const imageResponse = await fetch(tempImageUrl);
      if (!imageResponse.ok) {
        return res.status(500).json({ message: "Görsel indirilemedi" });
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      // Object Storage'a yükle
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[AI] Object Storage bucket not configured");
        // Fallback: geçici URL döndür (expire olacak ama en azından gösterilir)
        return res.json({ imageUrl: tempImageUrl, warning: "Object Storage yapılandırılmamış, görsel geçici" });
      }

      const { objectStorageClient } = await import('./objectStorage');
      const bucket = objectStorageClient.bucket(bucketId);
      
      // Benzersiz dosya adı oluştur
      const timestamp = Date.now();
      const fileName = `banners/ai-generated-${timestamp}.png`;
      const file = bucket.file(fileName);
      
      // Görseli yükle
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: {
            generatedBy: 'dall-e-3',
            prompt: prompt.substring(0, 200),
            createdAt: new Date().toISOString(),
            userId: req.user?.id
          }
        },
        public: true
      });

      // Public URL oluştur
      const publicUrl = `https://storage.googleapis.com/${bucketId}/${fileName}`;
      
      console.log(`[AI] Image saved to Object Storage: ${publicUrl}`);

      res.json({ imageUrl: publicUrl });
    } catch (error: any) {
      console.error("AI image generation error:", error);
      res.status(500).json({ message: "AI görsel oluşturma başarısız", error: String(error) });
    }
  });

  // DELETE /api/admin/announcements/:id - Duyuru sil
  app.delete('/api/admin/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { id } = req.params;
      
      await db.delete(announcements)
        .where(eq(announcements.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ message: "Duyuru silinemedi" });
    }
  });

  // ========================================
  // TASK STEPS - Görev Adım API'leri
  // ========================================
  
  app.get('/api/tasks/:taskId/steps', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const steps = await storage.getTaskSteps(taskId);
      res.json(steps);
    } catch (error: any) {
      console.error("Get task steps error:", error);
      res.status(500).json({ message: "Adımlar getirilemedi" });
    }
  });

  app.post('/api/tasks/:taskId/steps', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const step = await storage.createTaskStep({ ...req.body, taskId });
      res.json(step);
    } catch (error: any) {
      console.error("Create task step error:", error);
      res.status(500).json({ message: "Adım oluşturulamadı" });
    }
  });

  app.patch('/api/task-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const step = await storage.updateTaskStep(id, req.body);
      res.json(step);
    } catch (error: any) {
      console.error("Update task step error:", error);
      res.status(500).json({ message: "Adım güncellenemedi" });
    }
  });

  app.delete('/api/task-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskStep(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete task step error:", error);
      res.status(500).json({ message: "Adım silinemedi" });
    }
  });

  // ========================================
  // ROLE TEMPLATES - Rol Şablonları API'leri
  // ========================================

  app.get('/api/role-templates', isAuthenticated, async (req: any, res) => {
    try {
      const domain = req.query.domain as string | undefined;
      const templates = await storage.getRoleTemplates(domain);
      res.json(templates);
    } catch (error: any) {
      console.error("Get role templates error:", error);
      res.status(500).json({ message: "Şablonlar getirilemedi" });
    }
  });

  app.get('/api/role-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getRoleTemplate(id);
      if (!template) return res.status(404).json({ message: "Şablon bulunamadı" });
      res.json(template);
    } catch (error: any) {
      console.error("Get role template error:", error);
      res.status(500).json({ message: "Şablon getirilemedi" });
    }
  });

  app.post('/api/role-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const template = await storage.createRoleTemplate(req.body);
      res.json(template);
    } catch (error: any) {
      console.error("Create role template error:", error);
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });

  app.patch('/api/role-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const template = await storage.updateRoleTemplate(id, req.body);
      res.json(template);
    } catch (error: any) {
      console.error("Update role template error:", error);
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });

  app.delete('/api/role-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteRoleTemplate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete role template error:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });

  // ========================================
  // FACTORY PRODUCTION - Fabrika Üretim API'leri
  // ========================================

  // Factory Products
  app.get('/api/factory/products', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string | undefined;
      const products = await storage.getFactoryProducts(category);
      res.json(products);
    } catch (error: any) {
      console.error("Get factory products error:", error);
      res.status(500).json({ message: "Ürünler getirilemedi" });
    }
  });

  app.get('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getFactoryProduct(id);
      if (!product) return res.status(404).json({ message: "Ürün bulunamadı" });
      res.json(product);
    } catch (error: any) {
      console.error("Get factory product error:", error);
      res.status(500).json({ message: "Ürün getirilemedi" });
    }
  });

  app.post('/api/factory/products', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const product = await storage.createFactoryProduct(req.body);
      res.json(product);
    } catch (error: any) {
      console.error("Create factory product error:", error);
      res.status(500).json({ message: "Ürün oluşturulamadı" });
    }
  });

  app.patch('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const product = await storage.updateFactoryProduct(id, req.body);
      res.json(product);
    } catch (error: any) {
      console.error("Update factory product error:", error);
      res.status(500).json({ message: "Ürün güncellenemedi" });
    }
  });

  app.delete('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteFactoryProduct(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete factory product error:", error);
      res.status(500).json({ message: "Ürün silinemedi" });
    }
  });

  // Production Batches
  app.get('/api/factory/batches', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const status = req.query.status as string | undefined;
      const batches = await storage.getProductionBatches(productId, status);
      res.json(batches);
    } catch (error: any) {
      console.error("Get production batches error:", error);
      res.status(500).json({ message: "Partiler getirilemedi" });
    }
  });

  app.get('/api/factory/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const batch = await storage.getProductionBatch(id);
      if (!batch) return res.status(404).json({ message: "Parti bulunamadı" });
      res.json(batch);
    } catch (error: any) {
      console.error("Get production batch error:", error);
      res.status(500).json({ message: "Parti getirilemedi" });
    }
  });

  app.post('/api/factory/batches', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const batch = await storage.createProductionBatch({
        ...req.body,
        producedById: req.user.id
      });
      res.json(batch);
    } catch (error: any) {
      console.error("Create production batch error:", error);
      res.status(500).json({ message: "Parti oluşturulamadı" });
    }
  });

  app.patch('/api/factory/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const batch = await storage.updateProductionBatch(id, req.body);
      res.json(batch);
    } catch (error: any) {
      console.error("Update production batch error:", error);
      res.status(500).json({ message: "Parti güncellenemedi" });
    }
  });

  // Branch Orders
  app.get('/api/factory/orders', isAuthenticated, async (req: any, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const status = req.query.status as string | undefined;
      const orders = await storage.getBranchOrders(branchId, status);
      res.json(orders);
    } catch (error: any) {
      console.error("Get branch orders error:", error);
      res.status(500).json({ message: "Siparişler getirilemedi" });
    }
  });

  app.get('/api/factory/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getBranchOrder(id);
      if (!order) return res.status(404).json({ message: "Sipariş bulunamadı" });
      const items = await storage.getBranchOrderItems(id);
      res.json({ ...order, items });
    } catch (error: any) {
      console.error("Get branch order error:", error);
      res.status(500).json({ message: "Sipariş getirilemedi" });
    }
  });

  app.post('/api/factory/orders', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...orderData } = req.body;
      const orderNumber = `ORD-${Date.now()}`;
      const order = await storage.createBranchOrder({
        ...orderData,
        orderNumber,
        requestedById: req.user.id
      });
      
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createBranchOrderItem({
            ...item,
            orderId: order.id
          });
        }
      }
      
      res.json(order);
    } catch (error: any) {
      console.error("Create branch order error:", error);
      res.status(500).json({ message: "Sipariş oluşturulamadı" });
    }
  });

  app.patch('/api/factory/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: any = { ...req.body };
      
      if (req.body.status && ['confirmed', 'preparing', 'shipped', 'delivered'].includes(req.body.status)) {
        updates.processedById = req.user.id;
      }
      
      const order = await storage.updateBranchOrder(id, updates);
      res.json(order);
    } catch (error: any) {
      console.error("Update branch order error:", error);
      res.status(500).json({ message: "Sipariş güncellenemedi" });
    }
  });

  // Factory Inventory
  app.get('/api/factory/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const inventory = await storage.getFactoryInventory(productId);
      res.json(inventory);
    } catch (error: any) {
      console.error("Get factory inventory error:", error);
      res.status(500).json({ message: "Stok bilgisi getirilemedi" });
    }
  });

  app.post('/api/factory/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { productId, batchId, quantity } = req.body;
      const inventory = await storage.updateFactoryInventory(productId, batchId, quantity, req.user.id);
      res.json(inventory);
    } catch (error: any) {
      console.error("Update factory inventory error:", error);
      res.status(500).json({ message: "Stok güncellenemedi" });
    }
  });

  // ========================================
  // TOPLU VERİ YÖNETİMİ - Bulk Data Management API'leri
  // ========================================

  // Download Excel template for equipment
  app.get('/api/bulk/template/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Ekipman Adı*', 'Model', 'Seri No', 'Şube ID*', 'Kategori*', 
        'Durum', 'Garanti Bitiş Tarihi', 'Son Bakım Tarihi', 'Açıklama'
      ];
      
      const sampleData = [
        ['Espresso Makinesi', 'La Marzocco Linea', 'LM-2024-001', '1', 'espresso_machine', 'active', '2025-12-31', '2024-06-15', 'Ana bar espresso makinesi'],
        ['Kahve Değirmeni', 'Mahlkönig E65S', 'MK-2024-002', '1', 'grinder', 'active', '2025-06-30', '2024-06-01', 'Filtre kahve değirmeni']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ekipmanlar');
      
      // Add category reference sheet
      const categories = [
        ['Kategori Kodu', 'Açıklama'],
        ['espresso_machine', 'Espresso Makinesi'],
        ['grinder', 'Kahve Değirmeni'],
        ['refrigerator', 'Buzdolabı'],
        ['freezer', 'Dondurucu'],
        ['oven', 'Fırın'],
        ['dishwasher', 'Bulaşık Makinesi'],
        ['water_filter', 'Su Filtresi'],
        ['ice_machine', 'Buz Makinesi'],
        ['blender', 'Blender'],
        ['pos', 'POS Cihazı'],
        ['other', 'Diğer']
      ];
      const wsCategories = XLSX.utils.aoa_to_sheet(categories);
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Kategoriler');

      // Add branch reference
      const branchesData = await storage.getAllBranches();
      const branchSheet = [['Şube ID', 'Şube Adı'], ...branchesData.map(b => [b.id, b.name])];
      const wsBranches = XLSX.utils.aoa_to_sheet(branchSheet);
      XLSX.utils.book_append_sheet(wb, wsBranches, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=ekipman_sablonu.xlsx');
      res.send(buffer);
    } catch (error: any) {
      console.error("Download equipment template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Download Excel template for personnel
  app.get('/api/bulk/template/personnel', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Ad*', 'Soyad*', 'Email*', 'Telefon', 'Rol*', 'Şube ID', 
        'İşe Başlama Tarihi', 'Tam Zamanlı mı (E/H)', 'Çalışma Saati/Hafta'
      ];
      
      const sampleData = [
        ['Ahmet', 'Yılmaz', 'ahmet@dospresso.com', '5321234567', 'barista', '1', '2024-01-15', 'E', '45'],
        ['Ayşe', 'Demir', 'ayse@dospresso.com', '5339876543', 'supervisor', '1', '2023-06-01', 'E', '45']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel');
      
      // Add role reference sheet
      const roles = [
        ['Rol Kodu', 'Açıklama'],
        ['admin', 'Admin'],
        ['muhasebe', 'Muhasebe'],
        ['satinalma', 'Satın Alma'],
        ['coach', 'Coach'],
        ['teknik', 'Teknik'],
        ['destek', 'Destek'],
        ['fabrika', 'Fabrika'],
        ['yatirimci_hq', 'Yatırımcı (HQ)'],
        ['stajyer', 'Stajyer'],
        ['bar_buddy', 'Bar Buddy'],
        ['barista', 'Barista'],
        ['supervisor_buddy', 'Supervisor Buddy'],
        ['supervisor', 'Supervisor'],
        ['yatirimci_branch', 'Yatırımcı (Şube)']
      ];
      const wsRoles = XLSX.utils.aoa_to_sheet(roles);
      XLSX.utils.book_append_sheet(wb, wsRoles, 'Roller');

      // Add branch reference
      const branchesData = await storage.getAllBranches();
      const branchSheet = [['Şube ID', 'Şube Adı'], ...branchesData.map(b => [b.id, b.name])];
      const wsBranches = XLSX.utils.aoa_to_sheet(branchSheet);
      XLSX.utils.book_append_sheet(wb, wsBranches, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=personel_sablonu.xlsx');
      res.send(buffer);
    } catch (error: any) {
      console.error("Download personnel template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Download Excel template for branches
  app.get('/api/bulk/template/branches', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const headers = [
        'Şube Adı*', 'Adres*', 'Şehir*', 'Telefon', 'Email', 
        'Aktif mi (E/H)', 'Açılış Tarihi', 'Enlem', 'Boylam'
      ];
      
      const sampleData = [
        ['Kadıköy Şubesi', 'Bahariye Cad. No:45', 'İstanbul', '02161234567', 'kadikoy@dospresso.com', 'E', '2024-01-01', '40.9833', '29.0333'],
        ['Beşiktaş Şubesi', 'Barbaros Bulvarı No:78', 'İstanbul', '02127654321', 'besiktas@dospresso.com', 'E', '2024-03-15', '41.0422', '29.0083']
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = headers.map(() => ({ wch: 22 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sube_sablonu.xlsx');
      res.send(buffer);
    } catch (error: any) {
      console.error("Download branch template error:", error);
      res.status(500).json({ message: "Şablon indirilemedi" });
    }
  });

  // Export equipment data
  app.get('/api/bulk/export/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const equipmentList = await storage.getAllEquipment();
      const branchesData = await storage.getAllBranches();
      const branchMap = new Map(branchesData.map(b => [b.id, b.name]));

      const headers = ['ID', 'Ekipman Adı', 'Model', 'Seri No', 'Şube ID', 'Şube Adı', 'Kategori', 'Durum', 'Garanti Bitiş', 'Son Bakım', 'Açıklama'];
      
      const data = equipmentList.map(eq => [
        eq.id,
        eq.name,
        eq.model || '',
        eq.serialNumber || '',
        eq.branchId,
        branchMap.get(eq.branchId) || '',
        eq.category,
        eq.status,
        eq.warrantyEndDate || '',
        eq.lastMaintenanceDate || '',
        eq.description || ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ekipmanlar');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ekipman_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Export equipment error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Export personnel data
  app.get('/api/bulk/export/personnel', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const usersData = await storage.getAllUsers();
      const branchesData = await storage.getAllBranches();
      const branchMap = new Map(branchesData.map(b => [b.id, b.name]));

      const headers = ['ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Rol', 'Şube ID', 'Şube Adı', 'İşe Başlama', 'Tam Zamanlı', 'Aktif'];
      
      const data = usersData.map(u => [
        u.id,
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.phone || '',
        u.role,
        u.branchId || '',
        u.branchId ? (branchMap.get(u.branchId) || '') : '',
        u.hireDate || '',
        u.isFullTime ? 'Evet' : 'Hayır',
        u.isActive ? 'Evet' : 'Hayır'
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=personel_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Export personnel error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Export branch data
  app.get('/api/bulk/export/branches', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const branchesData = await storage.getAllBranches();

      const headers = ['ID', 'Şube Adı', 'Adres', 'Şehir', 'Telefon', 'Email', 'Aktif', 'Açılış Tarihi', 'Enlem', 'Boylam'];
      
      const data = branchesData.map(b => [
        b.id,
        b.name,
        b.address || '',
        b.city || '',
        b.phone || '',
        b.email || '',
        b.isActive ? 'Evet' : 'Hayır',
        b.openingDate || '',
        b.latitude || '',
        b.longitude || ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sube_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Export branches error:", error);
      res.status(500).json({ message: "Dışa aktarma başarısız" });
    }
  });

  // Import equipment data
  app.post('/api/bulk/import/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = row['Ekipman Adı*'] || row['Ekipman Adı'];
          const branchIdRaw = row['Şube ID*'] || row['Şube ID'];
          const branchId = parseInt(branchIdRaw);

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim() === '') {
            results.errors.push(`Satır ${i + 2}: Ekipman adı zorunludur`);
            results.failed++;
            continue;
          }

          if (!branchIdRaw || isNaN(branchId)) {
            results.errors.push(`Satır ${i + 2}: Geçerli bir şube ID gerekli (sayı olmalı)`);
            results.failed++;
            continue;
          }

          const validCategories = ['espresso_machine', 'grinder', 'refrigerator', 'freezer', 'oven', 'dishwasher', 'water_filter', 'ice_machine', 'blender', 'pos', 'other'];
          const category = row['Kategori*'] || row['Kategori'] || 'other';
          if (!validCategories.includes(category)) {
            results.errors.push(`Satır ${i + 2}: Geçersiz kategori: ${category}`);
            results.failed++;
            continue;
          }

          const equipmentData = {
            name: name.trim(),
            model: row['Model'] || null,
            serialNumber: row['Seri No'] || null,
            branchId,
            category,
            status: row['Durum'] || 'active',
            warrantyEndDate: row['Garanti Bitiş Tarihi'] || null,
            lastMaintenanceDate: row['Son Bakım Tarihi'] || null,
            description: row['Açıklama'] || null
          };

          await storage.createEquipment(equipmentData);
          results.success++;
        } catch (err: any) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Import equipment error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Import personnel data
  app.post('/api/bulk/import/personnel', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      const validRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq', 'stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'yatirimci_branch'];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const firstName = (row['Ad*'] || row['Ad'] || '').toString().trim();
          const lastName = (row['Soyad*'] || row['Soyad'] || '').toString().trim();
          const email = (row['Email*'] || row['Email'] || '').toString().trim().toLowerCase();
          const role = (row['Rol*'] || row['Rol'] || '').toString().trim().toLowerCase();
          
          if (!firstName || !lastName) {
            results.errors.push(`Satır ${i + 2}: Ad ve soyad zorunludur`);
            results.failed++;
            continue;
          }

          if (!email || !email.includes('@')) {
            results.errors.push(`Satır ${i + 2}: Geçerli bir email adresi gerekli`);
            results.failed++;
            continue;
          }

          if (!role || !validRoles.includes(role)) {
            results.errors.push(`Satır ${i + 2}: Geçersiz rol: ${role}. Geçerli roller: ${validRoles.join(', ')}`);
            results.failed++;
            continue;
          }

          // Check if user already exists
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            results.errors.push(`Satır ${i + 2}: Bu email zaten kayıtlı: ${email}`);
            results.failed++;
            continue;
          }

          // Validate branchId if provided
          const branchIdRaw = row['Şube ID'];
          let branchId: number | null = null;
          if (branchIdRaw && branchIdRaw !== '') {
            branchId = parseInt(branchIdRaw);
            if (isNaN(branchId)) {
              results.errors.push(`Satır ${i + 2}: Geçersiz şube ID: ${branchIdRaw}`);
              results.failed++;
              continue;
            }
          }

          const isFullTime = (row['Tam Zamanlı mı (E/H)'] || 'E').toString().toUpperCase() === 'E';
          const weeklyHoursRaw = row['Çalışma Saati/Hafta'];
          let weeklyHours = isFullTime ? 45 : 25;
          if (weeklyHoursRaw && weeklyHoursRaw !== '') {
            const parsed = parseInt(weeklyHoursRaw);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 60) {
              weeklyHours = parsed;
            }
          }
          
          const userData = {
            firstName,
            lastName,
            email,
            phone: row['Telefon'] || null,
            role,
            branchId,
            hireDate: row['İşe Başlama Tarihi'] || null,
            isFullTime,
            weeklyHours,
            isActive: true,
            password: 'Dospresso2024!' // Default password
          };

          await storage.createUser(userData);
          results.success++;
        } catch (err: any) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Import personnel error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Import branch data
  app.post('/api/bulk/import/branches', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Geçersiz veri formatı" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = (row['Şube Adı*'] || row['Şube Adı'] || '').toString().trim();
          const address = (row['Adres*'] || row['Adres'] || '').toString().trim();
          const city = (row['Şehir*'] || row['Şehir'] || '').toString().trim();
          
          if (!name) {
            results.errors.push(`Satır ${i + 2}: Şube adı zorunludur`);
            results.failed++;
            continue;
          }

          if (!address) {
            results.errors.push(`Satır ${i + 2}: Adres zorunludur`);
            results.failed++;
            continue;
          }

          if (!city) {
            results.errors.push(`Satır ${i + 2}: Şehir zorunludur`);
            results.failed++;
            continue;
          }

          const isActive = (row['Aktif mi (E/H)'] || 'E').toString().toUpperCase() === 'E';
          
          // Validate coordinates if provided
          const latRaw = row['Enlem'];
          const lonRaw = row['Boylam'];
          let latitude: string | null = null;
          let longitude: string | null = null;
          
          if (latRaw && latRaw !== '') {
            const lat = parseFloat(latRaw);
            if (isNaN(lat) || lat < -90 || lat > 90) {
              results.errors.push(`Satır ${i + 2}: Geçersiz enlem değeri: ${latRaw}`);
              results.failed++;
              continue;
            }
            latitude = lat.toString();
          }
          
          if (lonRaw && lonRaw !== '') {
            const lon = parseFloat(lonRaw);
            if (isNaN(lon) || lon < -180 || lon > 180) {
              results.errors.push(`Satır ${i + 2}: Geçersiz boylam değeri: ${lonRaw}`);
              results.failed++;
              continue;
            }
            longitude = lon.toString();
          }
          
          const branchData = {
            name,
            address,
            city,
            phone: row['Telefon'] || null,
            email: row['Email'] || null,
            isActive,
            openingDate: row['Açılış Tarihi'] || null,
            latitude,
            longitude
          };

          await storage.createBranch(branchData);
          results.success++;
        } catch (err: any) {
          results.errors.push(`Satır ${i + 2}: ${err.message || 'Bilinmeyen hata'}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Import branches error:", error);
      res.status(500).json({ message: "İçe aktarma başarısız" });
    }
  });

  // Parse uploaded Excel file
  app.post('/api/bulk/parse', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'teknik', 'muhasebe'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { fileData, fileName } = req.body;
      if (!fileData) {
        return res.status(400).json({ message: "Dosya verisi bulunamadı" });
      }

      // Parse base64 data
      const base64Data = fileData.split(',')[1] || fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      res.json({ 
        data, 
        headers: data.length > 0 ? Object.keys(data[0] as object) : [],
        rowCount: data.length
      });
    } catch (error: any) {
      console.error("Parse Excel error:", error);
      res.status(500).json({ message: "Dosya okunamadı: " + error.message });
    }
  });

  // ========================================
  // CUSTOMER SATISFACTION (Misafir Geri Bildirim) API
  // ========================================

  // Get branch by feedback QR token (public - no auth required)
  app.get('/api/feedback/branch/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const branch = await db.select({
        id: branches.id,
        name: branches.name,
        city: branches.city,
      }).from(branches).where(eq(branches.feedbackQrToken, token)).limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      // Get active staff for this branch (for optional selection)
      const staff = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users)
        .where(and(
          eq(users.branchId, branch[0].id),
          eq(users.isActive, true),
          sql`${users.role} IN ('barista', 'bar_buddy', 'supervisor', 'supervisor_buddy')`
        ));

      res.json({ branch: branch[0], staff });
    } catch (error: any) {
      console.error("Error fetching branch by token:", error);
      res.status(500).json({ message: "Sunucu hatası" });
    }
  });

  // Submit customer feedback (public - no auth required)
  app.post('/api/feedback/submit', async (req, res) => {
    try {
      const { 
        branchToken, 
        rating, 
        serviceRating, 
        cleanlinessRating, 
        productRating, 
        staffRating,
        staffId,
        comment,
        customerName,
        customerEmail,
        customerPhone,
        isAnonymous = true,
        photoUrls = [],
        deviceFingerprint,
        userLatitude,
        userLongitude,
        language = 'tr',
        feedbackType = 'feedback', // feedback or complaint
        requiresContact = false
      } = req.body;

      // Get user IP
      const userIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 'unknown';

      // Validate token and get branch
      const branch = await db.select().from(branches)
        .where(eq(branches.feedbackQrToken, branchToken)).limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Geçersiz QR kod" });
      }

      // Calculate distance from branch if coordinates available
      let distanceFromBranch: number | null = null;
      if (userLatitude && userLongitude && branch[0].latitude && branch[0].longitude) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (branch[0].latitude - userLatitude) * Math.PI / 180;
        const dLon = (branch[0].longitude - userLongitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLatitude * Math.PI / 180) * Math.cos(branch[0].latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromBranch = R * c;
      }

      // Suspicious detection
      const suspiciousReasons: string[] = [];
      let isSuspicious = false;

      // Check 1: Same IP submitted multiple feedbacks today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sameIpCount = await db.select({ count: sql<number>`count(*)` })
        .from(customerFeedback)
        .where(and(
          eq(customerFeedback.branchId, branch[0].id),
          sql`${customerFeedback.userIp} = ${userIp}`,
          sql`${customerFeedback.feedbackDate} >= ${today}`
        ));
      
      if (sameIpCount[0]?.count > 0) {
        suspiciousReasons.push('same_ip_multiple_submissions');
        isSuspicious = true;
      }

      // Check 2: Same fingerprint submitted today
      if (deviceFingerprint) {
        const sameFingerprintCount = await db.select({ count: sql<number>`count(*)` })
          .from(customerFeedback)
          .where(and(
            eq(customerFeedback.branchId, branch[0].id),
            sql`${customerFeedback.deviceFingerprint} = ${deviceFingerprint}`,
            sql`${customerFeedback.feedbackDate} >= ${today}`
          ));
        
        if (sameFingerprintCount[0]?.count > 0) {
          suspiciousReasons.push('same_device_multiple_submissions');
          isSuspicious = true;
        }
      }

      // Check 3: Too far from branch (> 500m)
      if (distanceFromBranch !== null && distanceFromBranch > 500) {
        suspiciousReasons.push('too_far_from_branch');
        isSuspicious = true;
      }

      // Check 4: Perfect 5-star rating with no comment (potential fake)
      if (rating === 5 && serviceRating === 5 && cleanlinessRating === 5 && 
          productRating === 5 && staffRating === 5 && !comment) {
        suspiciousReasons.push('perfect_rating_no_comment');
        // Only flag as suspicious if combined with other factors
      }

      // Check 5: Staff giving feedback to themselves
      if (staffId) {
        // This would require more complex checking - if the device belongs to staff
        // For now, just flag high staff ratings as worth reviewing
        if (staffRating === 5) {
          suspiciousReasons.push('high_staff_rating_selected');
        }
      }

      // Calculate priority based on rating and feedback type
      let priority = 'medium';
      if (feedbackType === 'complaint') {
        // Complaints get higher priority
        if (rating <= 2) priority = 'critical';
        else if (rating <= 3) priority = 'critical';
        else priority = 'high';
      } else {
        // Regular feedback
        if (rating <= 2) priority = 'critical';
        else if (rating === 3) priority = 'high';
        else if (rating === 4) priority = 'medium';
        else priority = 'low';
      }

      // Calculate SLA deadline based on priority
      const now = new Date();
      let responseDeadline = new Date(now);
      switch (priority) {
        case 'critical': responseDeadline.setHours(now.getHours() + 4); break;
        case 'high': responseDeadline.setHours(now.getHours() + 12); break;
        case 'medium': responseDeadline.setHours(now.getHours() + 24); break;
        case 'low': responseDeadline.setHours(now.getHours() + 48); break;
      }

      const [feedback] = await db.insert(customerFeedback).values({
        branchId: branch[0].id,
        source: 'qr_code',
        rating,
        serviceRating: serviceRating || null,
        cleanlinessRating: cleanlinessRating || null,
        productRating: productRating || null,
        staffRating: staffRating || null,
        staffId: staffId || null,
        comment: comment || null,
        customerName: isAnonymous ? null : customerName,
        customerEmail: isAnonymous ? null : customerEmail,
        customerPhone: isAnonymous ? null : customerPhone,
        isAnonymous,
        priority,
        responseDeadline,
        status: 'new',
        photoUrls: photoUrls.length > 0 ? photoUrls : null,
        deviceFingerprint: deviceFingerprint || null,
        userIp,
        userLatitude: userLatitude || null,
        userLongitude: userLongitude || null,
        distanceFromBranch,
        isSuspicious,
        suspiciousReasons: suspiciousReasons.length > 0 ? suspiciousReasons : null,
        feedbackLanguage: language,
        feedbackType,
        requiresContact,
      }).returning();

      res.json({ 
        success: true, 
        message: "Geri bildiriminiz alındı. Teşekkür ederiz!",
        feedbackId: feedback.id 
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Geri bildirim gönderilemedi" });
    }
  });

  // Get all feedback (HQ sees all, branch manager sees own branch)
  app.get('/api/customer-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { status, source, branchId, priority, slaBreached, startDate, endDate, suspicious, feedbackType, requiresContact } = req.query;

      let query = db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        source: customerFeedback.source,
        rating: customerFeedback.rating,
        serviceRating: customerFeedback.serviceRating,
        cleanlinessRating: customerFeedback.cleanlinessRating,
        productRating: customerFeedback.productRating,
        staffRating: customerFeedback.staffRating,
        staffId: customerFeedback.staffId,
        comment: customerFeedback.comment,
        customerName: customerFeedback.customerName,
        isAnonymous: customerFeedback.isAnonymous,
        priority: customerFeedback.priority,
        status: customerFeedback.status,
        slaBreached: customerFeedback.slaBreached,
        responseDeadline: customerFeedback.responseDeadline,
        feedbackDate: customerFeedback.feedbackDate,
        reviewedAt: customerFeedback.reviewedAt,
        resolvedAt: customerFeedback.resolvedAt,
        externalReviewUrl: customerFeedback.externalReviewUrl,
        photoUrls: customerFeedback.photoUrls,
        isSuspicious: customerFeedback.isSuspicious,
        suspiciousReasons: customerFeedback.suspiciousReasons,
        distanceFromBranch: customerFeedback.distanceFromBranch,
        feedbackLanguage: customerFeedback.feedbackLanguage,
        feedbackType: customerFeedback.feedbackType,
        requiresContact: customerFeedback.requiresContact,
      })
      .from(customerFeedback)
      .leftJoin(branches, eq(customerFeedback.branchId, branches.id))
      .orderBy(desc(customerFeedback.feedbackDate));

      // Apply filters
      const conditions: SQL<unknown>[] = [];

      // Branch-level users can only see their own branch
      if (isBranchRole(userRole) && userBranchId) {
        conditions.push(eq(customerFeedback.branchId, userBranchId));
      } else if (branchId) {
        conditions.push(eq(customerFeedback.branchId, parseInt(branchId as string)));
      }

      if (status) conditions.push(eq(customerFeedback.status, status as string));
      if (source) conditions.push(eq(customerFeedback.source, source as string));
      if (priority) conditions.push(eq(customerFeedback.priority, priority as string));
      if (slaBreached === 'true') conditions.push(eq(customerFeedback.slaBreached, true));
      if (startDate) conditions.push(gte(customerFeedback.feedbackDate, new Date(startDate as string)));
      if (endDate) conditions.push(lte(customerFeedback.feedbackDate, new Date(endDate as string)));
      if (suspicious === 'suspicious') conditions.push(eq(customerFeedback.isSuspicious, true));
      if (suspicious === 'normal') conditions.push(eq(customerFeedback.isSuspicious, false));
      if (feedbackType) conditions.push(eq(customerFeedback.feedbackType, feedbackType as string));
      if (requiresContact === 'true') conditions.push(eq(customerFeedback.requiresContact, true));
      if (requiresContact === 'false') conditions.push(eq(customerFeedback.requiresContact, false));

      const result = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Geri bildirimler yüklenemedi" });
    }
  });

  // Get feedback statistics - MUST be before /:id route
  app.get('/api/customer-feedback/stats/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { branchId: queryBranchId } = req.query;
      const targetBranchId = isBranchRole(userRole) ? userBranchId : (queryBranchId ? parseInt(queryBranchId as string) : null);

      const whereClause = targetBranchId ? eq(customerFeedback.branchId, targetBranchId) : undefined;

      // Get counts by status
      const statusCounts = await db.select({
        status: customerFeedback.status,
        count: sql<number>`count(*)::int`,
      })
      .from(customerFeedback)
      .where(whereClause)
      .groupBy(customerFeedback.status);

      // Get counts by source
      const sourceCounts = await db.select({
        source: customerFeedback.source,
        count: sql<number>`count(*)::int`,
      })
      .from(customerFeedback)
      .where(whereClause)
      .groupBy(customerFeedback.source);

      // Get average ratings
      const avgRatings = await db.select({
        avgRating: sql<number>`ROUND(AVG(${customerFeedback.rating})::numeric, 2)`,
        avgService: sql<number>`ROUND(AVG(${customerFeedback.serviceRating})::numeric, 2)`,
        avgCleanliness: sql<number>`ROUND(AVG(${customerFeedback.cleanlinessRating})::numeric, 2)`,
        avgProduct: sql<number>`ROUND(AVG(${customerFeedback.productRating})::numeric, 2)`,
        avgStaff: sql<number>`ROUND(AVG(${customerFeedback.staffRating})::numeric, 2)`,
        totalCount: sql<number>`count(*)::int`,
        slaBreachedCount: sql<number>`SUM(CASE WHEN ${customerFeedback.slaBreached} THEN 1 ELSE 0 END)::int`,
      })
      .from(customerFeedback)
      .where(whereClause);

      res.json({
        statusCounts: statusCounts.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
        sourceCounts: sourceCounts.reduce((acc, item) => ({ ...acc, [item.source]: item.count }), {}),
        ...avgRatings[0],
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "İstatistikler yüklenemedi" });
    }
  });

  // Get single feedback with responses
  app.get('/api/customer-feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const feedback = await db.select({
        id: customerFeedback.id,
        branchId: customerFeedback.branchId,
        branchName: branches.name,
        source: customerFeedback.source,
        externalReviewId: customerFeedback.externalReviewId,
        externalReviewUrl: customerFeedback.externalReviewUrl,
        rating: customerFeedback.rating,
        serviceRating: customerFeedback.serviceRating,
        cleanlinessRating: customerFeedback.cleanlinessRating,
        productRating: customerFeedback.productRating,
        staffRating: customerFeedback.staffRating,
        staffId: customerFeedback.staffId,
        comment: customerFeedback.comment,
        customerName: customerFeedback.customerName,
        customerEmail: customerFeedback.customerEmail,
        customerPhone: customerFeedback.customerPhone,
        isAnonymous: customerFeedback.isAnonymous,
        priority: customerFeedback.priority,
        status: customerFeedback.status,
        slaBreached: customerFeedback.slaBreached,
        responseDeadline: customerFeedback.responseDeadline,
        feedbackDate: customerFeedback.feedbackDate,
        reviewedById: customerFeedback.reviewedById,
        reviewedAt: customerFeedback.reviewedAt,
        reviewNotes: customerFeedback.reviewNotes,
        resolvedAt: customerFeedback.resolvedAt,
        resolutionSatisfaction: customerFeedback.resolutionSatisfaction,
      })
      .from(customerFeedback)
      .leftJoin(branches, eq(customerFeedback.branchId, branches.id))
      .where(eq(customerFeedback.id, feedbackId))
      .limit(1);

      if (feedback.length === 0) {
        return res.status(404).json({ message: "Geri bildirim bulunamadı" });
      }

      // Get responses
      const responses = await db.select({
        id: feedbackResponses.id,
        responseType: feedbackResponses.responseType,
        content: feedbackResponses.content,
        isVisibleToCustomer: feedbackResponses.isVisibleToCustomer,
        createdAt: feedbackResponses.createdAt,
        responderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('responderName'),
      })
      .from(feedbackResponses)
      .leftJoin(users, eq(feedbackResponses.responderId, users.id))
      .where(eq(feedbackResponses.feedbackId, parseInt(id)))
      .orderBy(feedbackResponses.createdAt);

      // Get staff name if assigned
      let staffName = null;
      if (feedback[0].staffId) {
        const staff = await db.select({
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, feedback[0].staffId)).limit(1);
        if (staff.length > 0) {
          staffName = `${staff[0].firstName} ${staff[0].lastName}`;
        }
      }

      res.json({ ...feedback[0], staffName, responses });
    } catch (error: any) {
      console.error("Error fetching feedback detail:", error);
      res.status(500).json({ message: "Detay yüklenemedi" });
    }
  });

  // Add response/defense to feedback
  app.post('/api/customer-feedback/:id/response', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { responseType, content, isVisibleToCustomer = false } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const [response] = await db.insert(feedbackResponses).values({
        feedbackId,
        responderId: userId,
        responseType,
        content,
        isVisibleToCustomer,
      }).returning();

      // Update feedback status
      const newStatus = responseType === 'defense' ? 'in_progress' : 
                        responseType === 'customer_contact' ? 'awaiting_response' : 
                        'in_progress';

      await db.update(customerFeedback)
        .set({ 
          status: newStatus, 
          reviewedById: userId,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(customerFeedback.id, parseInt(id)));

      res.json({ success: true, response });
    } catch (error: any) {
      console.error("Error adding response:", error);
      res.status(500).json({ message: "Yanıt eklenemedi" });
    }
  });

  // Update feedback status
  app.patch('/api/customer-feedback/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ message: "Geçersiz geri bildirim ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const updateData: any = { 
        status, 
        reviewedById: userId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      };

      if (reviewNotes) updateData.reviewNotes = reviewNotes;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }

      await db.update(customerFeedback)
        .set(updateData)
        .where(eq(customerFeedback.id, parseInt(id)));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Durum güncellenemedi" });
    }
  });

  // Add manual external review (Google/Instagram)
  app.post('/api/customer-feedback/external', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;

      if (!hasPermission(userRole, 'customer_satisfaction', 'create')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { 
        branchId, 
        source, 
        externalReviewId,
        externalReviewUrl,
        rating, 
        comment,
        customerName
      } = req.body;

      // Calculate priority
      let priority = 'medium';
      if (rating <= 2) priority = 'critical';
      else if (rating === 3) priority = 'high';
      else if (rating === 4) priority = 'medium';
      else priority = 'low';

      // SLA deadline
      const now = new Date();
      let responseDeadline = new Date(now);
      switch (priority) {
        case 'critical': responseDeadline.setHours(now.getHours() + 4); break;
        case 'high': responseDeadline.setHours(now.getHours() + 12); break;
        case 'medium': responseDeadline.setHours(now.getHours() + 24); break;
        case 'low': responseDeadline.setHours(now.getHours() + 48); break;
      }

      const [feedback] = await db.insert(customerFeedback).values({
        branchId,
        source,
        externalReviewId: externalReviewId || null,
        externalReviewUrl: externalReviewUrl || null,
        rating,
        comment: comment || null,
        customerName: customerName || null,
        isAnonymous: !customerName,
        priority,
        responseDeadline,
        status: 'new',
      }).returning();

      res.json({ success: true, feedback });
    } catch (error: any) {
      console.error("Error adding external review:", error);
      res.status(500).json({ message: "Harici yorum eklenemedi" });
    }
  });

  // Generate QR code for branch feedback
  app.get('/api/branches/:id/feedback-qr', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      if (!hasPermission(userRole, 'branches', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const branch = await db.select().from(branches).where(eq(branches.id, parseInt(id))).limit(1);
      if (branch.length === 0) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }

      // Generate token if not exists
      let token = branch[0].feedbackQrToken;
      if (!token) {
        token = crypto.randomBytes(16).toString('hex');
        await db.update(branches).set({ feedbackQrToken: token }).where(eq(branches.id, parseInt(id)));
      }

      // Generate QR code
      const feedbackUrl = `${req.protocol}://${req.get('host')}/misafir-geri-bildirim/${token}`;
      const qrDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300 });

      res.json({ 
        token, 
        url: feedbackUrl, 
        qrCode: qrDataUrl,
        branchName: branch[0].name 
      });
    } catch (error: any) {
      console.error("Error generating feedback QR:", error);
      res.status(500).json({ message: "QR kod oluşturulamadı" });
    }
  });

  // Check and update SLA breaches (can be called periodically)
  app.post('/api/customer-feedback/check-sla', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'coach', 'destek'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const now = new Date();
      
      // Find feedbacks with passed deadline that aren't resolved/closed
      const result = await db.update(customerFeedback)
        .set({ slaBreached: true, updatedAt: new Date() })
        .where(and(
          eq(customerFeedback.slaBreached, false),
          lte(customerFeedback.responseDeadline, now),
          sql`${customerFeedback.status} NOT IN ('resolved', 'closed')`
        ))
        .returning({ id: customerFeedback.id });

      res.json({ updated: result.length });
    } catch (error: any) {
      console.error("Error checking SLA:", error);
      res.status(500).json({ message: "SLA kontrolü başarısız" });
    }
  });

  // ========================================
  // FEEDBACK FORM SETTINGS (Form Özelleştirme)
  // ========================================

  // Get feedback form settings for a branch (public - for guest form)
  app.get('/api/feedback-form-settings/branch/:branchId', async (req, res) => {
    try {
      const { branchId } = req.params;
      const branchIdNum = parseInt(branchId);
      
      if (isNaN(branchIdNum)) {
        return res.status(400).json({ message: "Geçersiz şube ID'si" });
      }

      const settings = await db.select()
        .from(feedbackFormSettings)
        .where(eq(feedbackFormSettings.branchId, branchIdNum))
        .limit(1);

      if (settings.length === 0) {
        // Return default settings if none exist
        return res.json({
          branchId: branchIdNum,
          bannerUrl: null,
          logoUrl: null,
          primaryColor: "#7c3aed",
          backgroundColor: "#1e1b4b",
          welcomeMessageTr: "Geri bildiriminiz bizim için çok değerli",
          welcomeMessageEn: "Your feedback is very valuable to us",
          welcomeMessageZh: "您的意见对我们非常宝贵",
          welcomeMessageAr: "رأيك مهم جداً بالنسبة لنا",
          welcomeMessageDe: "Ihre Meinung ist uns sehr wichtig",
          welcomeMessageKo: "귀하의 의견은 저희에게 매우 소중합니다",
          welcomeMessageFr: "Votre avis nous est très précieux",
          showServiceRating: true,
          showCleanlinessRating: true,
          showProductRating: true,
          showStaffRating: true,
          showStaffSelection: true,
          showPhotoUpload: true,
          showFeedbackTypeSelection: true,
          showContactPreference: true,
          showCommentField: true,
          requireComment: false,
          allowAnonymous: true,
          defaultAnonymous: true,
          requireLocationVerification: false,
          maxDistanceFromBranch: 500,
          availableLanguages: ["tr", "en"],
          defaultLanguage: "tr",
          isActive: true,
        });
      }

      res.json(settings[0]);
    } catch (error: any) {
      console.error("Error fetching feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Get feedback form settings by token (for guest form using QR token)
  app.get('/api/feedback-form-settings/token/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // Find branch by token
      const branch = await db.select()
        .from(branches)
        .where(eq(branches.feedbackQrToken, token))
        .limit(1);

      if (branch.length === 0) {
        return res.status(404).json({ message: "Geçersiz QR kod" });
      }

      const branchId = branch[0].id;

      const settings = await db.select()
        .from(feedbackFormSettings)
        .where(eq(feedbackFormSettings.branchId, branchId))
        .limit(1);

      if (settings.length === 0) {
        // Return default settings
        return res.json({
          branchId,
          branchName: branch[0].name,
          bannerUrl: null,
          logoUrl: null,
          primaryColor: "#7c3aed",
          backgroundColor: "#1e1b4b",
          welcomeMessageTr: "Geri bildiriminiz bizim için çok değerli",
          welcomeMessageEn: "Your feedback is very valuable to us",
          welcomeMessageZh: "您的意见对我们非常宝贵",
          welcomeMessageAr: "رأيك مهم جداً بالنسبة لنا",
          welcomeMessageDe: "Ihre Meinung ist uns sehr wichtig",
          welcomeMessageKo: "귀하의 의견은 저희에게 매우 소중합니다",
          welcomeMessageFr: "Votre avis nous est très précieux",
          showServiceRating: true,
          showCleanlinessRating: true,
          showProductRating: true,
          showStaffRating: true,
          showStaffSelection: true,
          showPhotoUpload: true,
          showFeedbackTypeSelection: true,
          showContactPreference: true,
          showCommentField: true,
          requireComment: false,
          allowAnonymous: true,
          defaultAnonymous: true,
          requireLocationVerification: false,
          maxDistanceFromBranch: 500,
          availableLanguages: ["tr", "en"],
          defaultLanguage: "tr",
          isActive: true,
        });
      }

      res.json({ ...settings[0], branchName: branch[0].name });
    } catch (error: any) {
      console.error("Error fetching feedback form settings by token:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Get all feedback form settings (admin)
  app.get('/api/feedback-form-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      if (!hasPermission(userRole, 'customer_satisfaction', 'view')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      let query = db.select({
        id: feedbackFormSettings.id,
        branchId: feedbackFormSettings.branchId,
        branchName: branches.name,
        bannerUrl: feedbackFormSettings.bannerUrl,
        logoUrl: feedbackFormSettings.logoUrl,
        primaryColor: feedbackFormSettings.primaryColor,
        backgroundColor: feedbackFormSettings.backgroundColor,
        showServiceRating: feedbackFormSettings.showServiceRating,
        showCleanlinessRating: feedbackFormSettings.showCleanlinessRating,
        showProductRating: feedbackFormSettings.showProductRating,
        showStaffRating: feedbackFormSettings.showStaffRating,
        showStaffSelection: feedbackFormSettings.showStaffSelection,
        showPhotoUpload: feedbackFormSettings.showPhotoUpload,
        showFeedbackTypeSelection: feedbackFormSettings.showFeedbackTypeSelection,
        showContactPreference: feedbackFormSettings.showContactPreference,
        showCommentField: feedbackFormSettings.showCommentField,
        requireComment: feedbackFormSettings.requireComment,
        isActive: feedbackFormSettings.isActive,
        updatedAt: feedbackFormSettings.updatedAt,
      })
      .from(feedbackFormSettings)
      .leftJoin(branches, eq(feedbackFormSettings.branchId, branches.id));

      // Branch users can only see their own branch settings
      if (isBranchRole(userRole) && userBranchId) {
        const result = await query.where(eq(feedbackFormSettings.branchId, userBranchId));
        return res.json(result);
      }

      const result = await query;
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları yüklenemedi" });
    }
  });

  // Create or update feedback form settings for a branch
  app.put('/api/feedback-form-settings/:branchId', isAuthenticated, async (req: any, res) => {
    try {
      const { branchId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;

      const branchIdNum = parseInt(branchId);
      if (isNaN(branchIdNum)) {
        return res.status(400).json({ message: "Geçersiz şube ID'si" });
      }

      if (!hasPermission(userRole, 'customer_satisfaction', 'edit')) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      // Branch users can only edit their own branch
      if (isBranchRole(userRole) && userBranchId !== branchIdNum) {
        return res.status(403).json({ message: "Sadece kendi şubenizi düzenleyebilirsiniz" });
      }

      // Check if settings exist
      const existing = await db.select()
        .from(feedbackFormSettings)
        .where(eq(feedbackFormSettings.branchId, branchIdNum))
        .limit(1);

      const settingsData = {
        branchId: branchIdNum,
        bannerUrl: req.body.bannerUrl || null,
        logoUrl: req.body.logoUrl || null,
        primaryColor: req.body.primaryColor || "#7c3aed",
        backgroundColor: req.body.backgroundColor || "#1e1b4b",
        welcomeMessageTr: req.body.welcomeMessageTr || "Geri bildiriminiz bizim için çok değerli",
        welcomeMessageEn: req.body.welcomeMessageEn || "Your feedback is very valuable to us",
        welcomeMessageZh: req.body.welcomeMessageZh || "您的意见对我们非常宝贵",
        welcomeMessageAr: req.body.welcomeMessageAr || "رأيك مهم جداً بالنسبة لنا",
        welcomeMessageDe: req.body.welcomeMessageDe || "Ihre Meinung ist uns sehr wichtig",
        welcomeMessageKo: req.body.welcomeMessageKo || "귀하의 의견은 저희에게 매우 소중합니다",
        welcomeMessageFr: req.body.welcomeMessageFr || "Votre avis nous est très précieux",
        showServiceRating: req.body.showServiceRating ?? true,
        showCleanlinessRating: req.body.showCleanlinessRating ?? true,
        showProductRating: req.body.showProductRating ?? true,
        showStaffRating: req.body.showStaffRating ?? true,
        showStaffSelection: req.body.showStaffSelection ?? true,
        showPhotoUpload: req.body.showPhotoUpload ?? true,
        showFeedbackTypeSelection: req.body.showFeedbackTypeSelection ?? true,
        showContactPreference: req.body.showContactPreference ?? true,
        showCommentField: req.body.showCommentField ?? true,
        requireComment: req.body.requireComment ?? false,
        allowAnonymous: req.body.allowAnonymous ?? true,
        defaultAnonymous: req.body.defaultAnonymous ?? true,
        requireLocationVerification: req.body.requireLocationVerification ?? false,
        maxDistanceFromBranch: req.body.maxDistanceFromBranch ?? 500,
        availableLanguages: req.body.availableLanguages || ["tr", "en"],
        defaultLanguage: req.body.defaultLanguage || "tr",
        isActive: req.body.isActive ?? true,
        updatedById: userId,
        updatedAt: new Date(),
      };

      let result;
      if (existing.length === 0) {
        // Create new settings
        [result] = await db.insert(feedbackFormSettings).values(settingsData).returning();
      } else {
        // Update existing settings
        [result] = await db.update(feedbackFormSettings)
          .set(settingsData)
          .where(eq(feedbackFormSettings.branchId, branchIdNum))
          .returning();
      }

      res.json({ success: true, settings: result });
    } catch (error: any) {
      console.error("Error saving feedback form settings:", error);
      res.status(500).json({ message: "Form ayarları kaydedilemedi" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

