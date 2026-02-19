import { onTaskAssigned, onTaskCompleted, onFeedbackReceived, onFaultReported, onFaultAssigned, onChecklistAssigned, resolveEventTask } from "./event-task-generator";
import { registerDailyTaskRoutes } from "./daily-tasks-routes";
import { registerFactoryShiftRoutes } from "./factory-shift-routes";
import { registerHQDashboardRoutes } from "./hq-dashboard-routes";
import { registerFinancialRoutes } from "./financial-routes";
import { registerCRMRoutes } from "./crm-routes";
import { registerSatinalmaRoutes } from "./satinalma-routes";
import type { Express } from "express";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { registerMaliyetRoutes } from "./maliyet-routes";
import { registerInspectionRoutes } from "./inspection-routes";
import { registerExportRoutes } from "./export-routes";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, createKioskSession, isKioskAuthenticated, deleteKioskSession, updateKioskStation } from "./localAuth";
import { auditMiddleware } from "./audit";
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
  insertManagerEvaluationSchema,
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
  messages,
  notifications,
  announcements,
  announcementReadStatus,
  hasPermission,
  PATH_TO_PERMISSION_MAP,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  FACTORY_FLOOR_ROLES,
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
  checklists,
  recipeCategories,
  recipes,
  recipeVersions,
  recipeNotifications,
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
  // Fabrika Kiosk Sistemi
  factoryStations,
  factoryStaffPins,
  factoryShiftSessions,
  factoryProductionRuns,
  factoryDailyTargets,
  factoryWasteReasons,
  factorySessionEvents,
  factoryBreakLogs,
  factoryProductionOutputs,
  factoryQualitySpecs,
  factoryProductionPlans,
  factoryTeams,
  factoryTeamMembers,
  insertFactoryStationSchema,
  insertFactoryStaffPinSchema,
  insertFactoryShiftSessionSchema,
  insertFactoryProductionRunSchema,
  insertFactoryDailyTargetSchema,
  insertFactoryQualitySpecSchema,
  insertFactoryProductionPlanSchema,
  insertFactoryTeamSchema,
  insertFactoryTeamMemberSchema,
  factoryShiftCompliance,
  factoryWeeklyAttendanceSummary,
  insertFactoryShiftComplianceSchema,
  // Şube Kiosk Sistemi
  branchStaffPins,
  branchShiftSessions,
  branchShiftEvents,
  branchBreakLogs,
  branchShiftDailySummary,
  branchWeeklyAttendanceSummary,
  branchMonthlyPayrollSummary,
  branchKioskSettings,
  insertBranchStaffPinSchema,
  insertBranchShiftSessionSchema,
  insertBranchShiftEventSchema,
  insertBranchBreakLogSchema,
  insertBranchShiftDailySummarySchema,
  insertBranchWeeklyAttendanceSummarySchema,
  insertBranchMonthlyPayrollSummarySchema,
  insertBranchKioskSettingsSchema,
  hqShiftSessions,
  hqShiftEvents,
  dashboardAlerts,
  checklistAssignments,
  checklistCompletions,
  megaModuleConfig,
  megaModuleItems,
  staffQrRatings,
  staffQrTokens,
  employeeOfMonthWeights,
  monthlyEmployeePerformance,
  employeeOfMonthAwards,
  managerMonthlyRatings,
  employeeOnboarding,
  employeeOnboardingTasks,
  onboardingTemplates,
  insertOnboardingTemplateSchema,
  onboardingTemplateSteps,
  insertOnboardingTemplateStepSchema,
  employeeOnboardingAssignments,
  insertEmployeeOnboardingAssignmentSchema,
  employeeOnboardingProgress,
  insertEmployeeOnboardingProgressSchema,
  shiftChecklists,
  shiftCorrections,
  factoryProducts,
  factoryProductionBatches,
  factoryBatchVerifications,
  quizResults,
  userCareerProgress,
  careerLevels,
  staffEvaluations,
  insertStaffEvaluationSchema,
  managerEvaluations,
  employeePerformanceScores,
  disciplinaryReports,
  guestComplaints,
  leaveRequests,
  productComplaints,
  productionBatches,
  purchaseOrders,
  dashboardWidgets,
  insertDashboardWidgetSchema,
  dashboardModuleVisibility,
  insertDashboardModuleVisibilitySchema,
  faultComments,
  managementReports,
  franchiseProjects,
  insertFranchiseProjectSchema,
  franchiseProjectPhases,
  insertFranchiseProjectPhaseSchema,
  franchiseProjectTasks,
  insertFranchiseProjectTaskSchema,
  franchiseCollaborators,
  insertFranchiseCollaboratorSchema,
  franchiseProjectComments,
  insertFranchiseProjectCommentSchema,
  equipmentCatalog,
  insertEquipmentCatalogSchema,
  faultServiceTracking,
  insertFaultServiceTrackingSchema,
  faultServiceStatusUpdates,
  insertFaultServiceStatusUpdateSchema,
  FAULT_SERVICE_STATUS,
  learningStreaks,
  inventoryCounts,
  insertInventoryCountSchema,
  inventoryCountAssignments,
  insertInventoryCountAssignmentSchema,
  inventoryCountEntries,
  insertInventoryCountEntrySchema,
  inventory,
  inventoryMovements,
  equipmentMaintenanceLogs,
  factoryManagementScores,
  insertFactoryManagementScoreSchema,
  dashboardWidgetItems,
  insertDashboardWidgetItemSchema,
  certificateDesignSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, or, isNull, isNotNull, inArray, lte, gte, ne, not, count, sum, avg, max } from "drizzle-orm";
import { analyzeTaskPhoto, analyzeFaultPhoto, analyzeDressCodePhoto, generateArticleEmbeddings, generateEmbedding, answerQuestionWithRAG, answerTechnicalQuestion, generateAISummary, generateQuizQuestionsFromLesson, generateFlashcardsFromLesson, evaluateBranchPerformance, diagnoseFault, generateTrainingModule, processUploadedFile, generateBranchSummaryReport, generateArticleDraft, generatePersonalSummaryReport, verifyChecklistPhoto, generateEquipmentKnowledgeFromManual, researchEquipmentTroubleshooting } from "./ai";
import multer from "multer";
import { generateTrainingMaterialBundle } from "./ai-motor";
import { updateEmployeeLocation, getActiveBranchEmployees, getEmployeeLocation, removeEmployeeLocation, startTrackingCleanup } from "./tracking";
import { compressChecklistPhotoBase64 } from "./photo-utils";
import { gatherAIAssistantContext } from "./ai-assistant-context";
import { sendNotificationEmail, sendEmployeeOfMonthEmail } from "./email";
import { startReminderSystem, startStockAlertSystem, startOnboardingCompletionSystem, startStaleQuoteReminderSystem, notifyTeknikNewFault, notifySatinalmaLowStock } from "./reminders";
import bcrypt from "bcrypt";
import { z } from "zod";
import { resolvePermissionScope, applyScopeFilter, getUserPermissions, getAllActionsGroupedByModule, getRoleGrants, upsertPermissionGrant, deletePermissionGrant, getRoleAccessibleModules } from "./permission-service";
import adminRouter from "./routes/admin";
import factoryRouter from "./routes/factory";
import academyRouter from "./routes/academy";
import equipmentRouter from "./routes/equipment";
import tasksRouter from "./routes/tasks";
import hrRouter from "./routes/hr";
import branchesRouter from "./routes/branches";
import shiftsRouter from "./routes/shifts";
import operationsRouter from "./routes/operations";
import miscRouter from "./routes/misc";

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

// General file upload multer for checklist photos etc.
const generalFileUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP, HEIC).'));
    }
  }
});

// Helper to generate branch summary report with role-based context
interface SummaryContext {
  pendingTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  maintenanceReminders: number;
  criticalEquipment: number;
  avgHealth: number;
  period: 'daily' | 'weekly' | 'monthly';
  userId: string;
  role: string;
  branchId?: number;
  branchName?: string;
  totalBranches?: number;
  factoryStats?: { pendingOrders: number; qualityIssues: number };
}

async function generateBranchSummary(ctx: SummaryContext): Promise<string> {
  try {
    const isHQ = !ctx.branchId || ['admin', 'owner', 'hq_manager', 'finance', 'coach'].includes(ctx.role);
    
    // Determine scope name based on role
    let scopeName: string;
    if (isHQ) {
      scopeName = "DOSPRESSO Genel Merkez (Tüm Şubeler)";
    } else {
      scopeName = ctx.branchName || `Şube #${ctx.branchId}`;
    }
    
    return await generateBranchSummaryReport(ctx.period, {
      activeFaults: ctx.activeFaults,
      pendingTasks: ctx.pendingTasks,
      overdueChecklists: ctx.overdueChecklists,
      maintenanceReminders: ctx.maintenanceReminders,
      criticalEquipment: ctx.criticalEquipment,
      totalAbsences: 0,
      slaBreaches: 0,
      averageEquipmentHealth: ctx.avgHealth,
      branchName: scopeName,
      isHQ,
      role: ctx.role,
      totalBranches: ctx.totalBranches,
      factoryStats: ctx.factoryStats
    }, ctx.userId);
  } catch (e) {
    const periodLabel = ctx.period === 'daily' ? 'Günlük' : ctx.period === 'weekly' ? 'Haftalık' : 'Aylık';
    return `${periodLabel}: ${ctx.activeFaults} arıza, ${ctx.pendingTasks} görev`;
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

const normalizeTimeGlobal = (timeStr: string): string => {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  const hh = String(parts[0] || '0').padStart(2, '0');
  const mm = String(parts[1] || '0').padStart(2, '0');
  return `${hh}:${mm}`;
};

export async function registerRoutes(app: Express): Promise<Server> {

// Rate limiting for kiosk login attempts
const kioskLoginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 30 * 60 * 1000;

function checkKioskRateLimit(identifier: string): { allowed: boolean; retryAfter?: number; remainingAttempts?: number } {
  const now = Date.now();
  const record = kioskLoginAttempts.get(identifier);
  if (!record) { kioskLoginAttempts.set(identifier, { count: 1, lastAttempt: now }); return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }; }
  if (record.blockedUntil && now < record.blockedUntil) { return { allowed: false, retryAfter: Math.ceil((record.blockedUntil - now) / 1000) }; }
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) { kioskLoginAttempts.set(identifier, { count: 1, lastAttempt: now }); return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }; }
  record.count++; record.lastAttempt = now;
  if (record.count > MAX_ATTEMPTS) { record.blockedUntil = now + BLOCK_DURATION; kioskLoginAttempts.set(identifier, record); return { allowed: false, retryAfter: BLOCK_DURATION / 1000 }; }
  kioskLoginAttempts.set(identifier, record);
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

function resetKioskRateLimit(identifier: string): void { kioskLoginAttempts.delete(identifier); }

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // General API rate limit: 200 requests per minute per IP
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek gönderdiniz, lütfen bir süre bekleyin' },
  });

  // Strict rate limit for auth routes: 20 requests per minute
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi, lütfen bekleyin' },
  });

  // Apply general rate limit to all API routes
  app.use('/api/', generalLimiter);

  app.use(auditMiddleware());

  await setupAuth(app, authLimiter);

  app.use(adminRouter);
  app.use(factoryRouter);
  app.use(academyRouter);
  app.use(equipmentRouter);
  app.use(tasksRouter);
  app.use(hrRouter);
  app.use(branchesRouter);
  app.use(shiftsRouter);
  app.use(operationsRouter);
  app.use(miscRouter);

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


  startReminderSystem();

  setInterval(async () => {
    try {
      const now = new Date();
      const scheduledTasks = await db.select().from(tasks)
        .where(and(
          eq(tasks.isDelivered, false),
          lte(tasks.scheduledDeliveryAt, now),
          eq(tasks.status, 'zamanlanmis')
        ));

      for (const task of scheduledTasks) {
        await storage.updateTask(task.id, {
          isDelivered: true,
          status: 'beklemede',
        });

        if (task.assignedToId && task.assignedById) {
          const assigner = await storage.getUser(task.assignedById);
          const assignerName = assigner?.firstName && assigner?.lastName
            ? `${assigner.firstName} ${assigner.lastName}`
            : 'Bir yönetici';

          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_assigned',
            title: 'Yeni Görev Atandı',
            message: `${assignerName} size yeni bir görev atadı: "${task.description?.substring(0, 50)}..."`,
            link: `/gorevler?taskId=${task.id}`,
            branchId: task.branchId,
          });
        }
      }

      if (scheduledTasks.length > 0) {
        console.log(`${scheduledTasks.length} zamanlanmis gorev iletildi`);
      }
    } catch (error: any) {
      console.error("Scheduled task delivery error:", error);
    }
  }, 60000);
  console.log("Zamanlanmis gorev iletim sistemi baslatildi - Her dakika kontrol edilecek");

  startStockAlertSystem();
  startOnboardingCompletionSystem();
  startStaleQuoteReminderSystem();
  registerDailyTaskRoutes(app);

  registerSatinalmaRoutes(app, isAuthenticated);

  registerMaliyetRoutes(app, isAuthenticated);
  registerFinancialRoutes(app, isAuthenticated);
  registerFactoryShiftRoutes(app);
  registerExportRoutes(app);
  registerInspectionRoutes(app);
  registerHQDashboardRoutes(app, isAuthenticated);
  registerCRMRoutes(app, isAuthenticated);
  async function seedDashboardWidgetItems() {
    try {
      const existingWidgets = await db.select().from(dashboardWidgetItems);
      if (existingWidgets.length === 0) {
        await db.insert(dashboardWidgetItems).values([
          { title: "Günlük Görevler", subtitle: "Bugünkü görevlerini kontrol et", type: "link", icon: "Target", url: "/gorevler", targetRoles: [], displayOrder: 1, isActive: true },
          { title: "Checklistler", subtitle: "Günlük checklist durumun", type: "link", icon: "ClipboardList", url: "/checklistler", targetRoles: [], displayOrder: 2, isActive: true },
          { title: "Eğitim", subtitle: "Akademi ve eğitim programları", type: "link", icon: "GraduationCap", url: "/akademi", targetRoles: ["barista", "bar_buddy", "stajyer", "supervisor", "mudur"], displayOrder: 3, isActive: true },
          { title: "Arıza Bildir", subtitle: "Yeni arıza kaydı oluştur", type: "link", icon: "Wrench", url: "/ariza", targetRoles: ["supervisor", "mudur", "teknik", "ekipman_teknik"], displayOrder: 4, isActive: true },
          { title: "Raporlar", subtitle: "Performans ve analitik", type: "link", icon: "BarChart3", url: "/raporlar", targetRoles: ["ceo", "cgo", "admin", "coach", "mudur"], displayOrder: 5, isActive: true },
        ]);
        console.log("Dashboard widget items seeded successfully");
      }
    } catch (error) {
      console.error("Failed to seed dashboard widget items:", error);
    }
  }
  seedDashboardWidgetItems();


  const httpServer = createServer(app);
  return httpServer;
}

// Note: Global AI Chat endpoint added via append - will be inserted at end
