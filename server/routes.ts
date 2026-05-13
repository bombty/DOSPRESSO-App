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
import { registerNotificationPreferenceRoutes } from "./routes/notification-preferences";
import myDayRoutes from "./routes/my-day";
import branchSummaryRoutes from "./routes/branch-summary";
import hqSummaryRoutes from "./routes/hq-summary";
import coachSummaryRoutes from "./routes/coach-summary";
import franchiseSummaryRoutes from "./routes/franchise-summary";
import franchiseInvestorRoutes from "./routes/franchise-investors";
import centrumEndpoints from "./routes/centrum-endpoints";
import dobodyFlowRoutes from "./routes/dobody-flow";
import dobodyAvatarRoutes from "./routes/dobody-avatars";
import dobodyTaskManagerRoutes from "./routes/dobody-task-manager";
import insightReportRoutes from "./routes/insight-reports";
import homeSummaryRoutes from "./routes/home-summary";
import controlWidgetRoutes from "./routes/control-widgets";
import { csrfProtection } from "./middleware/csrf";
import dashboardDataRoutes from "./routes/dashboard-data-routes";
import unifiedDashboardRoutes from "./routes/unified-dashboard-routes";
import productionPlanningRoutes from "./routes/production-planning-routes";
import dobodyGenerateMessageRoutes from "./routes/dobody-generate-message";
import cgoBranchDataRoutes from "./routes/cgo-branch-data";  // Aslan 10 May 2026: Şube Veri Toplama
import kvkkApprovalsRoutes from "./routes/kvkk-approvals";  // Aslan 10 May 2026: KVKK per-user
import breakManagementRoutes from "./routes/break-management";  // Aslan 10 May 2026: Mola sayaç + tutanak
import hqLivePdksRoutes from "./routes/hq-live-pdks";  // Aslan 10 May 2026: HQ canlı vardiya + geçmiş PDKS
import kvkkDataRequestsRoutes from "./routes/kvkk-data-requests";  // Aslan 10 May 2026: KVKK m.11 talepleri
import onboardingRoutes from "./routes/onboarding";  // Sprint 47 (Aslan 13 May 2026): AI-Native Conversational Onboarding
import dailyBriefsRoutes from "./routes/daily-briefs";  // Sprint 48 (Aslan 13 May 2026): Daily AI Brief
import aiAlertsRoutes from "./routes/ai-alerts";  // Sprint 49 (Aslan 13 May 2026): AI Alert System
import supplierAiHelperRoutes from "./routes/supplier-ai-helper";  // Sprint 50 (Aslan 13 May 2026): Tedarikçi AI Asistanı
import pinResetRoutes from "./routes/pin-reset";  // Aslan 11 May 2026: PIN sıfırlama (mail ile)
import hqKioskBreakRoutes from "./routes/hq-kiosk-break";  // Sprint 14a 11 May 2026: HQ kiosk mola yönetimi
import employeeSummaryRoutes from "./routes/employee-summary";
import auditV2Routes from "./routes/audit-v2";
import dobodyProposalRoutes from "./routes/dobody-proposals";
import systemHealthRoutes from "./routes/system-health";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
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
import rawMaterialsRouter from "./routes/raw-materials";
import pushRouter from "./routes/push";
import dataManagementRouter from "./routes/data-management";
import setupRouter from "./routes/setup";
import pdksRouter from "./routes/pdks";
import pilotDashboardRouter from "./routes/pilot-dashboard";
import criticalLogsRouter from "./routes/critical-logs";
import adminPasswordRouter from "./routes/admin-password";
import payrollRouter from "./routes/payroll";
import payrollConfigRouter from "./routes/payroll-config";
import ikDashboardRouter from "./routes/ik-dashboard";  // Sprint 3 (5 May 2026): Mahmut Bey IK Dashboard
import meSelfServiceRouter from "./routes/me-self-service";  // Sprint 4 (5 May 2026): Personel Self-Service
import personnelAttendanceDetailRouter from "./routes/personnel-attendance-detail";  // Sprint 6 Bölüm 3 (5 May 2026): Mahmut Bey personnel detail
import girdiYonetimiRouter from "./routes/girdi-yonetimi";  // Sprint 7 (5 May 2026): Girdi Yönetimi / TGK 2017/2284
import turkompIntegrationRouter from "./routes/turkomp-integration";  // Sprint 7 v2 (5 May 2026): TÜRKOMP veri tabanı entegrasyonu
import recipeLabelEngineRouter from "./routes/recipe-label-engine";  // Sprint 7 v3 (5 May 2026): Reçete → TGK Etiket otomatik hesaplama
import adminHqPinManagementRouter from "./routes/admin-hq-pin-management";  // Sprint 10 P-7 (6 May 2026): HQ Kiosk PIN Yönetimi (admin only)
import specPdfRouter from "./routes/spec-pdf";  // Aslan 7 May 2026: Ürün Spesifikasyon PDF üretici (SD-XX format, 5 sayfa, TGK uyumlu)
import supplierAllergenFormsRouter from "./routes/supplier-allergen-forms";  // Aslan 7 May 2026: Tedarikçi Alerjen Kontrol Formu (0011.A.FR.GG.36/Rev.1)
import fabrikaPersonelPerformansRouter from "./routes/fabrika-personel-performans";  // Sprint 14 Phase 7: Fabrika personel performans
import fiyatListesiRouter from "./routes/fiyat-listesi";  // Sprint 14 Phase 8: Hammadde fiyat listesi + price history
import gidaMuhendisiDashboardRouter from "./routes/gida-muhendisi-dashboard";  // Sprint 14: Mr. Dobody akıllı gıda mühendisi dashboard
import mrDobodyHammaddeEksiklikRouter from "./routes/mr-dobody-hammadde-eksiklik";  // Aslan 7 May 2026: AI eksikleri uyarmıyor talebi
import scoreParametersRouter from "./routes/score-parameters";  // Sprint 8 (5 May 2026): Skor kriterleri admin panel
import managerRatingRouter from "./routes/manager-rating";  // Sprint 12 (5 May 2026): Yönetici değerlendirme
import factoryRecipesRouter from "./routes/factory-recipes";
import factoryRecipeNutritionRouter from "./routes/factory-recipe-nutrition";
import factoryAllergensRouter from "./routes/factory-allergens";
import branchRecipesRouter from "./routes/branch-recipes";
import pdksExcelImportRouter from "./routes/pdks-excel-import";
import factoryF2Router from "./routes/factory-f2";
import changeRequestsRouter from "./routes/change-requests";
import stubEndpointsRouter from "./routes/stub-endpoints";
import { crmIletisimRouter } from "./routes/crm-iletisim";
import delegationRouter from "./routes/delegation-routes";
import moduleContentRouter from "./routes/module-content-routes";
import moduleFlagsRouter from "./routes/module-flags";
import branchTasksRouter from "./routes/branch-tasks";
import { ajandaRouter } from "./routes/ajanda-routes";
import lostFoundRouter from "./routes/lost-found-routes";
import employeeSatisfactionRouter from "./routes/employee-satisfaction-routes";
import staffEvaluationsRouter from "./routes/staff-evaluations-routes";
import certificateRouter from "./routes/certificate-routes";
import hrManagementRouter from "./routes/hr-management-routes";
import franchiseOnboardingRouter from "./routes/franchise-onboarding-routes";
import ceoCommandCenterRouter from "./routes/ceo-command-center-routes";
import personalPerformanceRouter from "./routes/personal-performance-routes";
import interviewQuestionsRouter from "./routes/interview-questions-routes";
import employeeBenefitsRouter from "./routes/employee-benefits-routes";
import announcementsRouter from "./routes/announcements-routes";
import trainingProgramRouter from "./routes/training-program-routes";
import cgoRouter from "./routes/cgo-routes";
import coworkRouter from "./routes/cowork-routes";
import qualityAuditsRouter from "./routes/quality-audits-routes";
import systemHealthRouter from "./routes/system-health-routes";
import hqSupportRouter from "./routes/hq-support-routes";
import adminAnnouncementsRouter from "./routes/admin-announcements-routes";
import franchiseProjectsRouter from "./routes/franchise-projects-routes";
import bannersRouter from "./routes/banners-routes";
import inventoryCountRouter from "./routes/inventory-count-routes";
import supplierPerformanceRouter from "./routes/supplier-performance-routes";
import dashboardWidgetsRouter from "./routes/dashboard-widgets-routes";
import messagingRouter from "./routes/messaging-routes";
import dashboardsRouter from "./routes/dashboards-routes";
import managerPerformanceRouter from "./routes/manager-performance-routes";
import trackingCareerRouter from "./routes/tracking-career-routes";
import maintenanceRouter from "./routes/maintenance-routes";
import campaignsRouter from "./routes/campaigns-routes";
import guestComplaintsRouter from "./routes/guest-complaints-routes";
import knowledgeBaseSearchRouter from "./routes/knowledge-base-search-routes";
import globalSearchRouter from "./routes/global-search-routes";
import megaModuleRouter from "./routes/mega-module-routes";
import staffQrRouter from "./routes/staff-qr-routes";
import employeeOfMonthRouter from "./routes/employee-of-month-routes";
import inventoryReportsRouter from "./routes/inventory-reports-routes";
import inventoryImportRouter from "./routes/inventory-import-routes";
import mrpRouter from "./routes/mrp-routes";
import costAnalysisRouter from "./routes/cost-analysis-routes";
import usageGuideRouter from "./routes/usage-guide-routes";
import guideDocsRouter from "./routes/guide-docs-routes";
import onboardingV2Router from "./routes/onboarding-v2-routes";
import dashboardItemsRouter from "./routes/dashboard-items-routes";
import miscSmallRouter from "./routes/misc-small-routes";
import sistemAtolyesiRouter from "./routes/sistem-atolyesi";
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
    frameAncestors: isDev
      ? ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co"]
      : ["'self'"],
  };
  app.use(helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'sameorigin' },
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
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api/auth/register', authLimiter);

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

  // CSRF protection — validates Origin/Referer on mutating requests
  app.use(csrfProtection);

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
  app.use(rawMaterialsRouter);
  app.use(branchInventoryRouter);
  app.use(pushRouter);
  app.use(dataManagementRouter);
  app.use(setupRouter);
  app.use(pdksRouter);
  app.use(pilotDashboardRouter);
  app.use(criticalLogsRouter);
  app.use(adminPasswordRouter);
  app.use(payrollRouter);
  app.use(payrollConfigRouter);
  app.use(ikDashboardRouter);  // Sprint 3 (5 May 2026): /api/ik/* endpoint'leri (Mahmut Bey Dashboard)
  app.use(meSelfServiceRouter);  // Sprint 4 (5 May 2026): /api/me/* endpoint'leri (Personel Self-Service)
  app.use(personnelAttendanceDetailRouter);  // Sprint 6 Bölüm 3 (5 May 2026): /api/personnel/:userId/attendance-detail
  app.use(girdiYonetimiRouter);  // Sprint 7 (5 May 2026): /api/girdi/*, /api/tedarikci-kalite/*, /api/tgk-label/* (TGK 2017/2284)
  app.use(turkompIntegrationRouter);  // Sprint 7 v2 (5 May 2026): /api/turkomp/* (Türkiye Tarım Bakanlığı veri tabanı)
  app.use(recipeLabelEngineRouter);  // Sprint 7 v3 (5 May 2026): /api/recipe-label/* (otomatik etiket hesaplama)
  app.use(adminHqPinManagementRouter);  // Sprint 10 P-7 (6 May 2026): /api/admin/hq-users/* (HQ Kiosk PIN Yönetimi, admin only)
  app.use(specPdfRouter);  // Aslan 7 May 2026: /api/factory/recipes/:id/specification.pdf (Ürün spesifikasyon PDF üretici)
  app.use(supplierAllergenFormsRouter);  // Aslan 7 May 2026: /api/supplier-allergen-forms/* (Tedarikçi Alerjen Kontrol Formu)
  app.use(fabrikaPersonelPerformansRouter);  // Sprint 14 Phase 7: /api/fabrika/personel-performans (üretim personel KPI)
  app.use(fiyatListesiRouter);  // Sprint 14 Phase 8: /api/fiyat-listesi + /api/girdi/:id/price-history
  app.use(gidaMuhendisiDashboardRouter);  // Sprint 14: /api/gida-muhendisi/dashboard (Mr. Dobody akıllı dashboard)
  app.use(mrDobodyHammaddeEksiklikRouter);  // Aslan 7 May 2026: /api/mr-dobody/hammadde-eksiklik-raporu
  app.use(scoreParametersRouter);  // Sprint 8 (5 May 2026): /api/score-parameters/* (admin skor kriterleri)
  app.use(managerRatingRouter);  // Sprint 12 (5 May 2026): /api/manager-rating/* (yönetici değerlendirme)
  app.use(factoryRecipesRouter);
  app.use(factoryRecipeNutritionRouter);
  app.use(factoryAllergensRouter);
  app.use(branchRecipesRouter);
  app.use(pdksExcelImportRouter);
  app.use(factoryF2Router);
  app.use(changeRequestsRouter);
  app.use(stubEndpointsRouter);
  app.use(lostFoundRouter);
  app.use(employeeSatisfactionRouter);
  app.use(staffEvaluationsRouter);
  app.use(certificateRouter);
  app.use(hrManagementRouter);
  app.use(franchiseOnboardingRouter);
  app.use(ceoCommandCenterRouter);
  app.use(personalPerformanceRouter);
  app.use(interviewQuestionsRouter);
  app.use(employeeBenefitsRouter);
  app.use(announcementsRouter);
  app.use(trainingProgramRouter);
  app.use(cgoRouter);
  app.use(coworkRouter);
  app.use(coworkRouter);
  app.use(qualityAuditsRouter);
  app.use(systemHealthRouter);
  app.use(hqSupportRouter);
  app.use(adminAnnouncementsRouter);
  app.use(franchiseProjectsRouter);
  app.use(bannersRouter);
  app.use(inventoryCountRouter);
  app.use(supplierPerformanceRouter);
  app.use(dashboardWidgetsRouter);
  app.use(messagingRouter);
  app.use(dashboardsRouter);
  app.use(managerPerformanceRouter);
  app.use(trackingCareerRouter);
  app.use(maintenanceRouter);
  app.use(campaignsRouter);
  app.use(guestComplaintsRouter);
  app.use(knowledgeBaseSearchRouter);
  app.use(globalSearchRouter);
  app.use(megaModuleRouter);
  app.use(staffQrRouter);
  app.use(employeeOfMonthRouter);
  app.use(inventoryReportsRouter);
  app.use(inventoryImportRouter);
  app.use(mrpRouter);
  app.use(costAnalysisRouter);
  app.use(usageGuideRouter);
  app.use(guideDocsRouter);
  app.use(onboardingV2Router);
  app.use(dashboardItemsRouter);
  app.use(miscSmallRouter);
  app.use(sistemAtolyesiRouter);

  app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    let dbConnected = false;
    let dbLatencyMs = 0;
    let activeUserCount = 0;

    try {
      const dbStart = Date.now();
      const dbResult = await db.execute(sql`SELECT count(*) as cnt FROM sessions`);
      dbLatencyMs = Date.now() - dbStart;
      dbConnected = true;
      activeUserCount = Number((dbResult as any).rows?.[0]?.cnt ?? 0);
    } catch {}

    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const status = dbConnected ? 'healthy' : 'degraded';
    const statusCode = dbConnected ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      db: dbConnected ? 'connected' : 'disconnected',
      dbLatencyMs,
      uptime: uptimeStr,
      memory: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      activeUsers: activeUserCount,
      nodeVersion: process.version,
    });
  });


  // POST /api/auth/register - Restricted to authenticated admin/HQ-HR roles (Pilot Day-5 sertleştirme)
  const REGISTER_ALLOWED_ROLES = new Set(['admin', 'ceo', 'muhasebe_ik']);
  const requireRegisterRole = (req: any, res: any, next: any) => {
    const role = req.user?.role;
    if (!role || !REGISTER_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    next();
  };
  app.post('/api/auth/register', isAuthenticated, requireRegisterRole, async (req, res) => {
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
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      const { hashedPassword, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: unknown) {
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
  registerNotificationPreferenceRoutes(app);
  app.use(myDayRoutes);
  app.use(cgoBranchDataRoutes);  // Aslan 10 May 2026: Şube Veri Toplama API
  app.use(kvkkApprovalsRoutes);  // Aslan 10 May 2026: KVKK per-user onay
  app.use(breakManagementRoutes);  // Aslan 10 May 2026: Mola sayaç + tutanak
  app.use(hqLivePdksRoutes);  // Aslan 10 May 2026: HQ canlı vardiya + PDKS geçmiş
  app.use(kvkkDataRequestsRoutes);  // Aslan 10 May 2026: KVKK m.11 talepleri
  app.use(onboardingRoutes);  // Sprint 47 (Aslan 13 May 2026): Mr. Dobody Onboarding
  app.use(dailyBriefsRoutes);  // Sprint 48 (Aslan 13 May 2026): Daily AI Brief
  app.use(aiAlertsRoutes);  // Sprint 49 (Aslan 13 May 2026): AI Alert System
  app.use(supplierAiHelperRoutes);  // Sprint 50 (Aslan 13 May 2026): Tedarikçi AI Asistanı
  app.use(pinResetRoutes);  // Aslan 11 May 2026: PIN sıfırlama (mail ile)
  app.use(hqKioskBreakRoutes);  // Sprint 14a 11 May 2026: HQ kiosk mola yönetimi
  app.use(branchSummaryRoutes);
  app.use(hqSummaryRoutes);
  app.use(coachSummaryRoutes);
  app.use(franchiseSummaryRoutes);
  app.use(franchiseInvestorRoutes);
  app.use(centrumEndpoints);
  app.use(dobodyFlowRoutes);
  app.use(dobodyAvatarRoutes);
  app.use(dobodyTaskManagerRoutes);
  app.use(employeeSummaryRoutes);
  app.use(insightReportRoutes);
  app.use(homeSummaryRoutes);
  app.use(controlWidgetRoutes);
  app.use(dashboardDataRoutes);
  app.use(unifiedDashboardRoutes);
  app.use(productionPlanningRoutes);
  app.use(dobodyGenerateMessageRoutes);
  app.use(auditV2Routes);
  app.use(dobodyProposalRoutes);
  app.use(systemHealthRoutes);
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
  app.use(ajandaRouter);

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
    }
  } catch (err) {
    console.error("[CRM-SPRINT-1] Migration error:", err);
  }
}

// Note: Global AI Chat endpoint added via append - will be inserted at end
