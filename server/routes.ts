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
import { registerBranchHealthRoutes } from "./routes/branch-health";
import { registerAiOpsCopilotRoutes } from "./routes/ai-ops-copilot";
import { registerAgentRoutes } from "./routes/agent";
import { registerQuickActionRoutes } from "./routes/quick-action";
import myDayRoutes from "./routes/my-day";
import branchSummaryRoutes from "./routes/branch-summary";
import hqSummaryRoutes from "./routes/hq-summary";
import coachSummaryRoutes from "./routes/coach-summary";
import franchiseSummaryRoutes from "./routes/franchise-summary";
import franchiseInvestorRoutes from "./routes/franchise-investors";
import dobodyFlowRoutes from "./routes/dobody-flow";
import dobodyAvatarRoutes from "./routes/dobody-avatars";
import dobodyTaskManagerRoutes from "./routes/dobody-task-manager";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, createKioskSession, isKioskAuthenticated, deleteKioskSession, updateKioskStation } from "./localAuth";
import { auditMiddleware, auditLogSystem } from "./audit";
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
import { updateEmployeeLocation, getActiveBranchEmployees, getEmployeeLocation, removeEmployeeLocation } from "./tracking";
import { compressChecklistPhotoBase64 } from "./photo-utils";
import { gatherAIAssistantContext } from "./ai-assistant-context";
import { sendNotificationEmail, sendEmployeeOfMonthEmail } from "./email";
import { notifyTeknikNewFault, notifySatinalmaLowStock } from "./reminders";
import bcrypt from "bcrypt";
import { z } from "zod";
import { resolvePermissionScope, applyScopeFilter, getUserPermissions, getAllActionsGroupedByModule, getRoleGrants, upsertPermissionGrant, deletePermissionGrant, getRoleAccessibleModules } from "./permission-service";
import adminRouter from "./routes/admin";
import seedRouter from "./routes/seed";
import factoryRouter, { seedFactoryData, initFactoryKioskMigrations } from "./routes/factory";
import academyRouter from "./routes/academy";
import academyV2Router from "./routes/academy-v2";
import academyV3Router from "./routes/academy-v3";
import equipmentRouter from "./routes/equipment";
import tasksRouter from "./routes/tasks";
import hrRouter, { initOnboardingMigrations } from "./routes/hr";
import branchesRouter from "./routes/branches";
import shiftsRouter from "./routes/shifts";
import operationsRouter from "./routes/operations";
import miscRouter from "./routes/misc";
import trashRouter from "./routes/trash";
import hrImportExportRouter from "./routes/hr-import-export";
import actionCardsRouter from "./routes/action-cards";
import opsRulesRouter from "./routes/ops-rules";
import { wasteRouter } from "./routes/waste";
import aiNbaRouter from "./routes/ai-nba";
import employeeTypesRouter from "./routes/employee-types";
import aiPolicyAdminRouter from "./routes/ai-policy-admin";
import branchInventoryRouter from "./routes/branch-inventory";
import branchOrdersRouter from "./routes/branch-orders";
import pushRouter from "./routes/push";
import dataManagementRouter from "./routes/data-management";
import setupRouter from "./routes/setup";
import pdksRouter from "./routes/pdks";
import payrollRouter from "./routes/payroll";
import changeRequestsRouter from "./routes/change-requests";
import { crmIletisimRouter } from "./routes/crm-iletisim";
import delegationRouter from "./routes/delegation-routes";
import moduleContentRouter from "./routes/module-content-routes";
import moduleFlagsRouter from "./routes/module-flags";
import branchTasksRouter from "./routes/branch-tasks";
import { checkSlaBreaches } from "./services/ticket-routing-engine";
import { schedulerManager } from "./scheduler-manager";


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
function ensurePermission(user: Express.User, module: string, action: string, errorMessage?: string): void {
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

  const isDev = process.env.NODE_ENV !== 'production';
  const cspDirectives: Record<string, string[]> = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), "https://cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    connectSrc: ["'self'", "https://api.openai.com", "https://*.replit.dev", "https://*.replit.app", ...(isDev ? ["wss://*"] : ["wss://*.replit.dev", "wss://*.replit.app"])],
    objectSrc: ["'none'"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co"],
  };
  app.use(helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: false,
  }));

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  const corsOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '',
        process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : '',
        'https://dospresso.com',
      ].filter(Boolean)
    : true;

  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers.origin) {
      const allowed = Array.isArray(corsOrigins) ? corsOrigins.includes(req.headers.origin) : true;
      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie');
      }
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
    }
    next();
  });

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek gönderdiniz, lütfen bir süre bekleyin' },
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi, lütfen bekleyin' },
  });

  const sensitiveApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.id?.toString() || 'anon',
    message: { error: 'Bu işlem için istek limitine ulaştınız, lütfen bekleyin' },
    validate: false,
  });

  const agentRunLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.id?.toString() || 'anon',
    message: { error: 'Agent çalıştırma limitine ulaştınız' },
    validate: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
    validate: false,
  });

  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Şifre sıfırlama limiti aşıldı. 1 saat sonra tekrar deneyin.' },
  });

  app.use('/api/', generalLimiter);

  app.use(auditMiddleware());

  app.use('/api/login', loginLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);

  await setupAuth(app, authLimiter);

  if (process.env.NODE_ENV !== 'production') {
    const TEST_HQ_USER_ID = 'test-hq-superuser-001';
    
    (async () => {
      try {
        const [existing] = await db.select().from(users).where(eq(users.id, TEST_HQ_USER_ID)).limit(1);
        if (!existing) {
          const bcrypt = await import('bcrypt');
          const hash = await bcrypt.default.hashSync('test-no-login', 10);
          await db.insert(users).values({
            id: TEST_HQ_USER_ID,
            username: 'test_hq_all',
            firstName: 'Test',
            lastName: 'HQ Superuser',
            email: 'test-hq@dospresso.local',
            hashedPassword: hash,
            role: 'admin',
            isActive: true,
            accountStatus: 'approved',
          });
          console.log('[TEST] Test HQ superuser created (id: test-hq-superuser-001)');
        }
      } catch (e: any) {
        console.warn('[TEST] Could not create test HQ user:', e.message);
      }
    })();

    app.get('/api/test-hq-login', (req: any, res) => {
      (async () => {
        try {
          const [testUser] = await db.select().from(users).where(eq(users.id, TEST_HQ_USER_ID)).limit(1);
          if (!testUser) return res.status(404).json({ error: 'Test kullanıcı bulunamadı' });

          req.session.regenerate((regenErr: any) => {
            if (regenErr) console.error('[TEST] Session regen error:', regenErr);
            req.login(testUser, (loginErr: any) => {
              if (loginErr) return res.status(500).json({ error: 'Login failed' });
              req.session.save((saveErr: any) => {
                if (saveErr) return res.status(500).json({ error: 'Session save failed' });
                res.redirect('/');
              });
            });
          });
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      })();
    });
  }

  app.use('/api/ai/', sensitiveApiLimiter);
  app.use('/api/agent/run-now', agentRunLimiter);

  app.use(adminRouter);
  app.use(seedRouter);
  app.use(factoryRouter);
  app.use(academyRouter);
  app.use(academyV2Router);
  app.use("/api/v3/academy", academyV3Router);
  app.use(equipmentRouter);
  app.use(tasksRouter);
  app.use(hrRouter);
  app.use(hrImportExportRouter);
  app.use(actionCardsRouter);
  app.use(opsRulesRouter);
  app.use(branchesRouter);
  app.use(shiftsRouter);
  app.use(operationsRouter);
  app.use(miscRouter);
  app.use(trashRouter);
  app.use(wasteRouter);
  app.use(aiNbaRouter);
  app.use(employeeTypesRouter);
  app.use(aiPolicyAdminRouter);
  app.use(branchOrdersRouter);
  app.use(branchInventoryRouter);
  app.use(pushRouter);
  app.use(dataManagementRouter);
  app.use(setupRouter);
  app.use(pdksRouter);
  app.use(payrollRouter);
  app.use(changeRequestsRouter);

  app.get('/api/health', async (req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbConnected: true,
      });
    } catch (error: any) {
      res.status(503).json({ status: 'error', dbConnected: false });
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
        password: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
          .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
          .regex(/[!@#$%^&*._-]/, "Şifre en az bir özel karakter içermelidir (!@#$%^&*._-)"),
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
        password: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
          .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
          .regex(/[!@#$%^&*._-]/, "Şifre en az bir özel karakter içermelidir (!@#$%^&*._-)"),
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

      auditLogSystem({ eventType: "auth.password_reset", action: "password_reset", resource: "users", resourceId: resetToken.userId, userId: resetToken.userId, details: { method: "token" } });

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


  // Schedulers are started lazily from server/index.ts onServerReady() with 30s delay
  registerDailyTaskRoutes(app);

  registerSatinalmaRoutes(app, isAuthenticated);

  registerMaliyetRoutes(app, isAuthenticated);
  registerFinancialRoutes(app, isAuthenticated);
  registerFactoryShiftRoutes(app);
  registerExportRoutes(app);
  registerInspectionRoutes(app);
  registerHQDashboardRoutes(app, isAuthenticated);
  registerCRMRoutes(app, isAuthenticated);
  registerBranchHealthRoutes(app);
  registerAiOpsCopilotRoutes(app);
  registerAgentRoutes(app);
  registerQuickActionRoutes(app);
  app.use(myDayRoutes);
  app.use(branchSummaryRoutes);
  app.use(hqSummaryRoutes);
  app.use(coachSummaryRoutes);
  app.use(franchiseSummaryRoutes);
  app.use(franchiseInvestorRoutes);
  app.use(dobodyFlowRoutes);
  app.use(dobodyAvatarRoutes);
  app.use(dobodyTaskManagerRoutes);
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
  seedFactoryData();
  initFactoryKioskMigrations();
  initOnboardingMigrations();

  await runCrmSprint1Migration();

  app.use("/api/iletisim", isAuthenticated, crmIletisimRouter);
  app.use("/api/delegations", delegationRouter);
  app.use("/api/module-content", moduleContentRouter);
  app.use(moduleFlagsRouter);
  app.use(branchTasksRouter);

  schedulerManager.registerInterval('sla-breach-checker', async () => {
    try {
      await checkSlaBreaches();
    } catch (err) {
      console.error("[SLA-CHECKER] Error:", err);
    }
  }, 15 * 60 * 1000);

  const httpServer = createServer(app);
  return httpServer;
}

async function runCrmSprint1Migration() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(20) NOT NULL UNIQUE,
        branch_id INTEGER,
        created_by_user_id VARCHAR,
        department VARCHAR(50) NOT NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        status VARCHAR(30) NOT NULL DEFAULT 'acik',
        assigned_to_user_id VARCHAR,
        assigned_at TIMESTAMP,
        sla_deadline TIMESTAMP,
        sla_breached BOOLEAN NOT NULL DEFAULT false,
        sla_breached_at TIMESTAMP,
        related_equipment_id INTEGER,
        recurrence_count INTEGER NOT NULL DEFAULT 1,
        resolved_at TIMESTAMP,
        resolved_by_user_id VARCHAR,
        resolution_note TEXT,
        satisfaction_score INTEGER,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS st_branch_idx ON support_tickets(branch_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS st_dept_idx ON support_tickets(department)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS st_status_idx ON support_tickets(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS st_assigned_idx ON support_tickets(assigned_to_user_id)`);

    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'st_branch_fk') THEN
        ALTER TABLE support_tickets ADD CONSTRAINT st_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'st_created_by_fk') THEN
        ALTER TABLE support_tickets ADD CONSTRAINT st_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'st_assigned_to_fk') THEN
        ALTER TABLE support_tickets ADD CONSTRAINT st_assigned_to_fk FOREIGN KEY (assigned_to_user_id) REFERENCES users(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'st_resolved_by_fk') THEN
        ALTER TABLE support_tickets ADD CONSTRAINT st_resolved_by_fk FOREIGN KEY (resolved_by_user_id) REFERENCES users(id);
      END IF;
    END $$`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        author_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        is_internal BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stc_ticket_fk') THEN
        ALTER TABLE support_ticket_comments ADD CONSTRAINT stc_ticket_fk FOREIGN KEY (ticket_id) REFERENCES support_tickets(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stc_author_fk') THEN
        ALTER TABLE support_ticket_comments ADD CONSTRAINT stc_author_fk FOREIGN KEY (author_id) REFERENCES users(id);
      END IF;
    END $$`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hq_tasks (
        id SERIAL PRIMARY KEY,
        task_number VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        assigned_by_user_id VARCHAR NOT NULL,
        assigned_to_user_id VARCHAR NOT NULL,
        department VARCHAR(50),
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        status VARCHAR(30) NOT NULL DEFAULT 'beklemede',
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        completion_note TEXT,
        progress_percent INTEGER NOT NULL DEFAULT 0,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hqt_assigned_to_idx ON hq_tasks(assigned_to_user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hqt_assigned_by_idx ON hq_tasks(assigned_by_user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hqt_status_idx ON hq_tasks(status)`);

    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hqt_assigned_by_fk') THEN
        ALTER TABLE hq_tasks ADD CONSTRAINT hqt_assigned_by_fk FOREIGN KEY (assigned_by_user_id) REFERENCES users(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hqt_assigned_to_fk') THEN
        ALTER TABLE hq_tasks ADD CONSTRAINT hqt_assigned_to_fk FOREIGN KEY (assigned_to_user_id) REFERENCES users(id);
      END IF;
    END $$`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS broadcast_receipts (
        id SERIAL PRIMARY KEY,
        announcement_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        branch_id INTEGER,
        seen_at TIMESTAMP,
        confirmed_at TIMESTAMP,
        CONSTRAINT br_ann_user_uniq UNIQUE(announcement_id, user_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS br_ann_idx ON broadcast_receipts(announcement_id)`);

    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'br_announcement_fk') THEN
        ALTER TABLE broadcast_receipts ADD CONSTRAINT br_announcement_fk FOREIGN KEY (announcement_id) REFERENCES announcements(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'br_user_fk') THEN
        ALTER TABLE broadcast_receipts ADD CONSTRAINT br_user_fk FOREIGN KEY (user_id) REFERENCES users(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'br_branch_fk') THEN
        ALTER TABLE broadcast_receipts ADD CONSTRAINT br_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id);
      END IF;
    END $$`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sla_business_hours (
        id SERIAL PRIMARY KEY,
        start_hour INTEGER NOT NULL DEFAULT 8,
        end_hour INTEGER NOT NULL DEFAULT 18,
        work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
        timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
        updated_by VARCHAR REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      INSERT INTO sla_business_hours (start_hour, end_hour, work_days, timezone)
      SELECT 8, 18, '{1,2,3,4,5}', 'Europe/Istanbul'
      WHERE NOT EXISTS (SELECT 1 FROM sla_business_hours)
    `);

    await db.execute(sql`ALTER TABLE support_ticket_comments ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) NOT NULL DEFAULT 'reply'`);
    await db.execute(sql`UPDATE support_ticket_comments SET comment_type = 'internal' WHERE is_internal = true AND comment_type = 'reply'`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_cowork_members (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        invited_by_user_id VARCHAR NOT NULL REFERENCES users(id),
        invited_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tcm_ticket_idx ON ticket_cowork_members(ticket_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tcm_user_idx ON ticket_cowork_members(user_id)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS tcm_ticket_user_unique ON ticket_cowork_members(ticket_id, user_id)`);

    console.log("[CRM-SPRINT-1] Migration complete");

    const ticketCount = await db.execute(sql`SELECT COUNT(*) as count FROM support_tickets`);
    if (parseInt(ticketCount.rows[0]?.count as string) === 0) {
      const sampleTickets = [
        { ticketNumber: "TKT-B001", department: "teknik", title: "Soğutucu dolap arızalandı — ürünler tehlikede", description: "Sabah 07:30'dan beri çalışmıyor. İçindeki cheesecake ve tiramisu risk altında.", priority: "kritik" },
        { ticketNumber: "TKT-B002", department: "lojistik", title: "Sevkiyatta 24 adet Cinnaboom eksik", description: "Bu haftaki sevkiyatta Cinnaboom 6'lı paketten 24 adet eksik geldi.", priority: "yuksek" },
        { ticketNumber: "TKT-B003", department: "muhasebe", title: "Kasım ayı faturasında 340₺ fark var", description: "Kasım ayı faturasında sipariş etmediğimiz 2 kalem ürün yer alıyor.", priority: "normal" },
        { ticketNumber: "TKT-B004", department: "trainer", title: "Yeni barista için Bombty Latte reçete eğitimi", description: "Yeni başlayan personelimiz Bombty Latte reçetesinde sorun yaşıyor, eğitim talep ediyoruz.", priority: "normal" },
        { ticketNumber: "TKT-B005", department: "marketing", title: "Bahar menüsü için masa üstü materyal talebi", description: "14 Mart lansmanı için 50 adet stand üstü menü kartı ve 20 adet pencere afişi talep ediyoruz.", priority: "dusuk" },
      ];

      for (const t of sampleTickets) {
        await db.execute(sql`
          INSERT INTO support_tickets (ticket_number, department, title, description, priority, branch_id, status)
          VALUES (${t.ticketNumber}, ${t.department}, ${t.title}, ${t.description}, ${t.priority}, 1, 'acik')
          ON CONFLICT DO NOTHING
        `);
      }
      console.log("[CRM-SPRINT-1] Sample tickets seeded");
    }
  } catch (err) {
    console.error("[CRM-SPRINT-1] Migration error:", err);
  }
}

// Note: Global AI Chat endpoint added via append - will be inserted at end
