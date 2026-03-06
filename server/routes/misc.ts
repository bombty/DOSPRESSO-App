import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { hasPermission, type UserRoleType, getUserPermissions, getRoleAccessibleModules } from "../permission-service";
import { parsePagination, wrapPaginatedResponse, handleApiError } from "./helpers";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, not, ne, count, sum, avg, max } from "drizzle-orm";
import { sanitizeUser, sanitizeUsers, sanitizeUserForRole, sanitizeUsersForRole } from "../security";
import { buildMenuForUser } from "../menu-service";
import { generateArticleEmbeddings, generateEmbedding, answerTechnicalQuestion, generateAISummary, generateArticleDraft, generatePersonalSummaryReport, generateBranchSummaryReport } from "../ai";
import { gatherAIAssistantContext } from "../ai-assistant-context";
import { computeBranchHealthScores } from "../services/branch-health-scoring";
import { checkAndEnforcePolicy } from "../services/ai-policy-engine";
import { sendNotificationEmail, sendEmployeeOfMonthEmail } from "../email";
import { updateEmployeeLocation, getActiveBranchEmployees, removeEmployeeLocation } from "../tracking";
import { onFeedbackReceived } from "../event-task-generator";
import { z } from "zod";
import multer from "multer";
import {
  insertKnowledgeBaseArticleSchema,
  insertQualityAuditSchema,
  insertMaintenanceScheduleSchema,
  insertMaintenanceLogSchema,
  insertCampaignSchema,
  insertFranchiseOnboardingSchema,
  insertLicenseRenewalSchema,
  insertOvertimeRequestSchema,
  insertAttendancePenaltySchema,
  insertGuestComplaintSchema,
  insertEmployeeDocumentSchema,
  insertDisciplinaryReportSchema,
  insertManagerEvaluationSchema,
  insertLostFoundItemSchema,
  handoverLostFoundItemSchema,
  insertPublicHolidaySchema,
  insertInterviewQuestionSchema,
  insertStaffEvaluationSchema,
  insertPageContentSchema,
  insertFranchiseProjectSchema,
  insertFranchiseProjectPhaseSchema,
  insertFranchiseProjectTaskSchema,
  insertFranchiseCollaboratorSchema,
  insertFranchiseProjectCommentSchema,
  insertInventoryCountSchema,
  insertInventoryCountAssignmentSchema,
  insertInventoryCountEntrySchema,
  insertDashboardWidgetSchema,
  insertDashboardModuleVisibilitySchema,
  PATH_TO_PERMISSION_MAP,
  announcements,
  announcementReadStatus,
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  equipmentServiceRequests,
  equipmentMaintenanceLogs,
  checklists,
  checklistAssignments,
  checklistCompletions,
  shifts,
  shiftAttendance,
  notifications,
  messages,
  threadParticipants,
  qualityAudits,
  auditItemScores,
  branchAuditScores,
  auditInstances,
  auditInstanceItems,
  maintenanceSchedules,
  maintenanceLogs,
  campaigns,
  campaignBranches,
  campaignMetrics,
  franchiseOnboarding,
  onboardingDocuments,
  licenseRenewals,
  customerFeedback,
  feedbackResponses,
  guestComplaints,
  disciplinaryReports,
  leaveRequests,
  employeeLeaves,
  publicHolidays,
  employeeSalaries,
  employeeTerminations,
  employeePerformanceScores,
  employeeOfMonthWeights,
  employeeOfMonthAwards,
  monthlyEmployeePerformance,
  managerEvaluations,
  managerMonthlyRatings,
  staffEvaluations,
  staffQrRatings,
  staffQrTokens,
  badges,
  userBadges,
  recipes,
  recipeCategories,
  managementReports,
  dashboardAlerts,
  dashboardWidgets,
  dashboardWidgetItems,
  dashboardModuleVisibility,
  megaModuleConfig,
  megaModuleItems,
  jobPositions,
  jobApplications,
  interviews,
  interviewQuestions,
  interviewResponses,
  insertJobApplicationSchema,
  insertEmployeeTerminationSchema,
  inventory,
  inventoryMovements,
  inventoryCounts,
  inventoryCountAssignments,
  inventoryCountEntries,
  productComplaints,
  productionBatches,
  purchaseOrders,
  banners,
  certificateDesignSettings,
  franchiseProjects,
  franchiseProjectPhases,
  franchiseProjectTasks,
  franchiseCollaborators,
  franchiseProjectComments,
  trainingCompletions,
  trainingModules,
  recipeVersions,
  checklistTasks,
  factoryQualitySpecs,
  knowledgeBaseArticles,
  guideDocs,
  insertGuideDocSchema,
  onboardingPrograms,
  onboardingWeeks,
  onboardingInstances,
  onboardingCheckins,
  insertOnboardingProgramSchema,
  insertOnboardingWeekSchema,
  insertOnboardingInstanceSchema,
  insertOnboardingCheckinSchema,
  hasPermission as schemaHasPermission,
  isHQRole,
  isBranchRole,
  type UserRoleType as SchemaUserRoleType,
  type UpdateUser,
} from "@shared/schema";

const router = Router();

const uploadStorage = multer.memoryStorage();
const generalFileUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP, HEIC).'));
    }
  }
});

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
  } catch (error: any) {
    const periodLabel = ctx.period === 'daily' ? 'Günlük' : ctx.period === 'weekly' ? 'Haftalık' : 'Aylık';
    return `${periodLabel}: ${ctx.activeFaults} arıza, ${ctx.pendingTasks} görev`;
  }
}

const CACHE_MAX_SIZE = 1000;
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
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (v.expiresAt <= now) responseCache.delete(k);
    }
    if (responseCache.size >= CACHE_MAX_SIZE) {
      const oldest = responseCache.keys().next().value;
      if (oldest) responseCache.delete(oldest);
    }
  }
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

const updatePageContentSchema = insertPageContentSchema.partial().omit({
  createdById: true,
});

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

function assertBranchScope(user: any): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

const normalizeTimeGlobal = (timeStr: string): string => {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  const hh = String(parts[0] || '0').padStart(2, '0');
  const mm = String(parts[1] || '0').padStart(2, '0');
  return `${hh}:${mm}`;
};

  // ========================================
  // QR Code Lookup Endpoints
  // ========================================

  // GET /api/qr/equipment/:id - Comprehensive equipment data for QR scan
  router.get("/api/qr/equipment/:id", isAuthenticated, async (req: any, res) => {
    try {
      const idParam = req.params.id;
      const numericId = parseInt(idParam);

      let equipmentData: any = null;

      // If numeric, try to find by ID first
      if (!isNaN(numericId)) {
        const [item] = await db.select({
          id: equipment.id,
          branchId: equipment.branchId,
          equipmentType: equipment.equipmentType,
          serialNumber: equipment.serialNumber,
          purchaseDate: equipment.purchaseDate,
          warrantyEndDate: equipment.warrantyEndDate,
          maintenanceResponsible: equipment.maintenanceResponsible,
          faultProtocol: equipment.faultProtocol,
          lastMaintenanceDate: equipment.lastMaintenanceDate,
          nextMaintenanceDate: equipment.nextMaintenanceDate,
          maintenanceIntervalDays: equipment.maintenanceIntervalDays,
          qrCodeUrl: equipment.qrCodeUrl,
          notes: equipment.notes,
          isActive: equipment.isActive,
          createdAt: equipment.createdAt,
          updatedAt: equipment.updatedAt,
          servicingScope: equipment.servicingScope,
          maxServiceTimeHours: equipment.maxServiceTimeHours,
          alertThresholdHours: equipment.alertThresholdHours,
          modelNo: equipment.modelNo,
          imageUrl: equipment.imageUrl,
          serviceCompany: equipment.serviceCompany,
          servicePhone: equipment.servicePhone,
          serviceEmail: equipment.serviceEmail,
          serviceAddress: equipment.serviceAddress,
          serviceContactName: equipment.serviceContactName,
          serviceContactPhone: equipment.serviceContactPhone,
          serviceContactEmail: equipment.serviceContactEmail,
          serviceHandledBy: equipment.serviceHandledBy,
          catalogId: equipment.catalogId,
          branchName: branches.name,
        }).from(equipment)
          .leftJoin(branches, eq(equipment.branchId, branches.id))
          .where(eq(equipment.id, numericId));
        equipmentData = item;
      }

      // If not found by ID (or ID was not numeric), try by serial number
      if (!equipmentData) {
        const [item] = await db.select({
          id: equipment.id,
          branchId: equipment.branchId,
          equipmentType: equipment.equipmentType,
          serialNumber: equipment.serialNumber,
          purchaseDate: equipment.purchaseDate,
          warrantyEndDate: equipment.warrantyEndDate,
          maintenanceResponsible: equipment.maintenanceResponsible,
          faultProtocol: equipment.faultProtocol,
          lastMaintenanceDate: equipment.lastMaintenanceDate,
          nextMaintenanceDate: equipment.nextMaintenanceDate,
          maintenanceIntervalDays: equipment.maintenanceIntervalDays,
          qrCodeUrl: equipment.qrCodeUrl,
          notes: equipment.notes,
          isActive: equipment.isActive,
          createdAt: equipment.createdAt,
          updatedAt: equipment.updatedAt,
          servicingScope: equipment.servicingScope,
          maxServiceTimeHours: equipment.maxServiceTimeHours,
          alertThresholdHours: equipment.alertThresholdHours,
          modelNo: equipment.modelNo,
          imageUrl: equipment.imageUrl,
          serviceCompany: equipment.serviceCompany,
          servicePhone: equipment.servicePhone,
          serviceEmail: equipment.serviceEmail,
          serviceAddress: equipment.serviceAddress,
          serviceContactName: equipment.serviceContactName,
          serviceContactPhone: equipment.serviceContactPhone,
          serviceContactEmail: equipment.serviceContactEmail,
          serviceHandledBy: equipment.serviceHandledBy,
          catalogId: equipment.catalogId,
          branchName: branches.name,
        }).from(equipment)
          .leftJoin(branches, eq(equipment.branchId, branches.id))
          .where(eq(equipment.serialNumber, idParam));
        equipmentData = item;
      }

      if (!equipmentData) {
        return res.status(404).json({ error: "Ekipman bulunamadı" });
      }

      const faults = await db.select({
        id: equipmentFaults.id,
        description: equipmentFaults.description,
        status: equipmentFaults.status,
        priority: equipmentFaults.priority,
        priorityLevel: equipmentFaults.priorityLevel,
        createdAt: equipmentFaults.createdAt,
        resolvedAt: equipmentFaults.resolvedAt,
        equipmentName: equipmentFaults.equipmentName,
        currentStage: equipmentFaults.currentStage,
      }).from(equipmentFaults)
        .where(eq(equipmentFaults.equipmentId, equipmentData.id))
        .orderBy(desc(equipmentFaults.createdAt))
        .limit(10);

      const maintenanceLogs = await db.select({
        id: equipmentMaintenanceLogs.id,
        performedBy: equipmentMaintenanceLogs.performedBy,
        maintenanceType: equipmentMaintenanceLogs.maintenanceType,
        description: equipmentMaintenanceLogs.description,
        cost: equipmentMaintenanceLogs.cost,
        performedAt: equipmentMaintenanceLogs.performedAt,
        nextScheduledDate: equipmentMaintenanceLogs.nextScheduledDate,
        createdAt: equipmentMaintenanceLogs.createdAt,
      }).from(equipmentMaintenanceLogs)
        .where(eq(equipmentMaintenanceLogs.equipmentId, equipmentData.id))
        .orderBy(desc(equipmentMaintenanceLogs.performedAt))
        .limit(10);

      let healthScore = 100;
      const openFaults = faults.filter(f => f.status !== 'resolved' && f.status !== 'closed');
      healthScore -= openFaults.length * 10;

      const now = new Date();
      if (equipmentData.nextMaintenanceDate) {
        const nextMaint = new Date(equipmentData.nextMaintenanceDate);
        if (nextMaint < now) {
          healthScore -= 5;
        }
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      res.json({
        equipment: equipmentData,
        faults,
        maintenanceLogs,
        healthScore,
      });
    } catch (error: any) {
      console.error("QR equipment lookup error:", error);
      res.status(500).json({ error: "Ekipman bilgisi alınamadı" });
    }
  });

  // GET /api/qr/inventory/:id - Comprehensive inventory data for QR scan
  router.get("/api/qr/inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const idParam = req.params.id;
      const numericId = parseInt(idParam);

      let inventoryData: any = null;

      if (!isNaN(numericId)) {
        const [item] = await db.select().from(inventory).where(eq(inventory.id, numericId));
        inventoryData = item;
      }

      if (!inventoryData) {
        const [item] = await db.select().from(inventory).where(eq(inventory.qrCode, idParam));
        inventoryData = item;
      }

      if (!inventoryData) {
        const [item] = await db.select().from(inventory).where(eq(inventory.code, idParam));
        inventoryData = item;
      }

      if (!inventoryData) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const movements = await db.select({
        id: inventoryMovements.id,
        movementType: inventoryMovements.movementType,
        quantity: inventoryMovements.quantity,
        previousStock: inventoryMovements.previousStock,
        newStock: inventoryMovements.newStock,
        referenceType: inventoryMovements.referenceType,
        fromLocation: inventoryMovements.fromLocation,
        toLocation: inventoryMovements.toLocation,
        batchNumber: inventoryMovements.batchNumber,
        notes: inventoryMovements.notes,
        createdAt: inventoryMovements.createdAt,
      }).from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryId, inventoryData.id))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(20);

      res.json({
        inventory: inventoryData,
        movements,
      });
    } catch (error: any) {
      console.error("QR inventory lookup error:", error);
      res.status(500).json({ error: "Ürün bilgisi alınamadı" });
    }
  });

  // GET /api/global-search - Global search across entities
  router.get('/api/global-search', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const query = (req.query.q as string || '').trim().toLocaleLowerCase('tr-TR');
      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      const searchPattern = `%${query}%`;
      const results: Array<{ type: string; id: string | number; title: string; subtitle?: string; path: string; icon?: string }> = [];

      const isBranch = isBranchRole(user.role as UserRoleType);
      const userBranchId = user.branchId;

      // 1. Search branches
      try {
        const branchResults = await db.select({
          id: branches.id,
          name: branches.name,
          address: branches.address,
        }).from(branches)
          .where(or(
            sql`LOWER(${branches.name}) LIKE ${searchPattern}`,
            sql`LOWER(${branches.address}) LIKE ${searchPattern}`
          ))
          .limit(5);
        
        for (const b of branchResults) {
          if (isBranch && userBranchId && b.id !== userBranchId) continue;
          results.push({
            type: 'branch',
            id: b.id,
            title: b.name,
            subtitle: b.address || undefined,
            path: `/sube-detay/${b.id}`,
            icon: 'building',
          });
        }
      } catch (error: any) {}

      // 2. Search users/employees
      try {
        if (hasPermission(user.role as UserRoleType, 'employees', 'view')) {
          const userResults = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            branchId: users.branchId,
          }).from(users)
            .where(and(
              or(
                sql`LOWER(${users.firstName}) LIKE ${searchPattern}`,
                sql`LOWER(${users.lastName}) LIKE ${searchPattern}`,
                sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchPattern}`
              ),
              sql`${users.accountStatus} != 'inactive'`
            ))
            .limit(8);
          
          for (const u of userResults) {
            if (isBranch && userBranchId && u.branchId !== userBranchId) continue;
            results.push({
              type: 'employee',
              id: u.id,
              title: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'İsimsiz',
              subtitle: u.role || undefined,
              path: `/personel-profil/${u.id}`,
              icon: 'user',
            });
          }
        }
      } catch (error: any) {}

      // 3. Search equipment
      try {
        if (hasPermission(user.role as UserRoleType, 'equipment', 'view')) {
          const equipResults = await db.select({
            id: equipment.id,
            name: equipment.name,
            branchId: equipment.branchId,
            type: equipment.type,
          }).from(equipment)
            .where(or(
              sql`LOWER(${equipment.name}) LIKE ${searchPattern}`,
              sql`LOWER(${equipment.type}) LIKE ${searchPattern}`
            ))
            .limit(5);
          
          for (const e2 of equipResults) {
            if (isBranch && userBranchId && e2.branchId !== userBranchId) continue;
            results.push({
              type: 'equipment',
              id: e2.id,
              title: e2.name,
              subtitle: e2.type || undefined,
              path: `/ekipman-detay/${e2.id}`,
              icon: 'wrench',
            });
          }
        }
      } catch (error: any) {}

      // 4. Search tasks
      try {
        if (hasPermission(user.role as UserRoleType, 'tasks', 'view')) {
          const taskResults = await db.select({
            id: tasks.id,
            description: tasks.description,
            status: tasks.status,
            branchId: tasks.branchId,
          }).from(tasks)
            .where(sql`LOWER(${tasks.description}) LIKE ${searchPattern}`)
            .limit(5);
          
          for (const t of taskResults) {
            if (isBranch && userBranchId && t.branchId !== userBranchId) continue;
            results.push({
              type: 'task',
              id: t.id,
              title: (t.description || '').substring(0, 80),
              subtitle: t.status || undefined,
              path: `/gorev-detay/${t.id}`,
              icon: 'clipboard',
            });
          }
        }
      } catch (error: any) {}

      // 5. Search faults
      try {
        if (hasPermission(user.role as UserRoleType, 'equipment_faults', 'view')) {
          const faultResults = await db.select({
            id: equipmentFaults.id,
            description: equipmentFaults.description,
            status: equipmentFaults.status,
            branchId: equipmentFaults.branchId,
          }).from(equipmentFaults)
            .where(sql`LOWER(${equipmentFaults.description}) LIKE ${searchPattern}`)
            .limit(5);
          
          for (const f of faultResults) {
            if (isBranch && userBranchId && f.branchId !== userBranchId) continue;
            results.push({
              type: 'fault',
              id: f.id,
              title: (f.description || '').substring(0, 80),
              subtitle: f.status || undefined,
              path: `/ariza-detay/${f.id}`,
              icon: 'alert-triangle',
            });
          }
        }
      } catch (error: any) {}

      // 6. Search checklists
      try {
        const checklistResults = await db.select({
          id: checklists.id,
          title: checklists.title,
        }).from(checklists)
          .where(sql`LOWER(${checklists.title}) LIKE ${searchPattern}`)
          .limit(5);
        
        for (const c of checklistResults) {
          results.push({
            type: 'checklist',
            id: c.id,
            title: c.title,
            path: `/checklistler`,
            icon: 'check-square',
          });
        }
      } catch (error: any) {}

      // 7. Search recipes
      try {
        const recipeResults = await db.select({
          id: recipes.id,
          name: recipes.name,
          category: recipes.category,
        }).from(recipes)
          .where(sql`LOWER(${recipes.name}) LIKE ${searchPattern}`)
          .limit(5);
        
        for (const r of recipeResults) {
          results.push({
            type: 'recipe',
            id: r.id,
            title: r.name,
            subtitle: r.category || undefined,
            path: `/recete-detay/${r.id}`,
            icon: 'chef-hat',
          });
        }
      } catch (error: any) {}

      res.json({ results: results.slice(0, 20) });
    } catch (error: any) {
      console.error("Global search error:", error);
      res.status(500).json({ message: "Arama sırasında hata oluştu" });
    }
  });

  // GET /api/users - Get all users (sanitized, for dropdowns/selection)
  router.get('/api/users', isAuthenticated, async (req: any, res) => {
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
      res.status(500).json({ message: "Kullanıcılar alınırken hata oluştu" });
    }
  });

  // POST /api/upload/photo - Upload base64 photo to Object Storage
  router.post('/api/upload/photo', isAuthenticated, async (req: any, res) => {
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
        return res.status(400).json({ message: "Geçersiz veri URL formatı" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate a secure access token for this file
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      // Upload to Object Storage
      const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
      const path = `.private/shift-photos/${req.user.id}/${filename}`;
      const { ok, error } = await client.uploadFromBytes(path, buffer);
      
      if (!ok) {
        console.error("Object Storage upload failed:", error);
        return res.status(500).json({ message: "Sunucu hatası oluştu" });
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
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yükleme verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yükleme başarısız oldu" });
    }
  });

  // POST /api/upload - General file upload endpoint using multipart/form-data
  router.post('/api/upload', isAuthenticated, generalFileUpload.single('file'), async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const crypto = await import('crypto');
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Dosya gerekli" });
      }
      
      // Optional folder parameter
      const folder = req.body.folder || 'general';
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = crypto.randomBytes(8).toString('hex');
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${timestamp}_${randomStr}.${ext}`;
      
      // Generate a secure access token for this file
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      // Upload to Object Storage
      const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
      const path = `.private/${folder}/${req.user.id}/${filename}`;
      const { ok, error } = await client.uploadFromBytes(path, file.buffer);
      
      if (!ok) {
        console.error("Object Storage upload failed:", error);
        return res.status(500).json({ message: "Sunucu hatası oluştu" });
      }
      
      // Store access token mapping
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
      
      res.json({ url, path, size: file.buffer.length, filename });
    } catch (error: any) {
      handleApiError(res, error, "UploadFile");
    }
  });

  // GET /api/files/public/:token - Serve files via token (for AI services)
  router.get('/api/files/public/:token', async (req, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
      const token = req.params.token;
      
      // Check token validity
      if (!global.fileAccessTokens || !global.fileAccessTokens.has(token)) {
        return res.status(404).json({ message: "Geçersiz veya süresi dolmuş token" });
      }
      
      const tokenData = global.fileAccessTokens.get(token);
      
      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        global.fileAccessTokens.delete(token);
        return res.status(404).json({ message: "Token expired" });
      }
      
      const { ok, value, error } = await client.downloadAsBytes(tokenData.path);
      
      if (!ok) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
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
      res.status(500).json({ message: "Dosya sunulurken hata oluştu" });
    }
  });

  // GET /api/files/:path - Serve files from Object Storage (authenticated)
  router.get('/api/files/*', isAuthenticated, async (req: any, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
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
        return res.status(404).json({ message: "Dosya bulunamadı" });
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
      res.status(500).json({ message: "Dosya sunulurken hata oluştu" });
    }
  });

  // Public endpoint for registration page (no auth required)
  router.get('/api/public/branches', async (req, res) => {
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
      res.status(500).json({ message: "Şubeler alınırken hata oluştu" });
    }
  });

  // GET /api/public/settings - Get public settings (no auth required)
  router.get('/api/public/settings', async (req, res) => {
    try {
      const allSettings = await storage.getSiteSettings();
      // Only return public settings
      const publicSettings = allSettings.filter((s: any) => 
        s.isPublic || 
        ['banner_carousel_enabled', 'site_title', 'logo_url', 'favicon_url'].includes(s.key)
      );
      res.json(publicSettings);
    } catch (error: any) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Ayarlar yuklenirken hata olustu" });
    }
  });

  // GET /api/mega-module-mapping - Dashboard için mega-modül mapping (DB'den dinamik)
  // GET /api/dashboard-modules - Dashboard için kullanıcının erişebildiği modüller (mega-modüle göre gruplu)
  // Bu endpoint yetkilendirme ile tam senkronize - DOĞRUDAN mega_module_items tablosundan sayılar alınır
  router.get('/api/dashboard-modules', isAuthenticated, async (req: any, res) => {
    try {
      res.set('Cache-Control', 'no-store'); res.removeHeader('ETag'); res.removeHeader('Last-Modified');
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      
      // ROL BAZLI MEGA MODÜL ERİŞİM KURALLARI
      // Her rol sadece kendini ilgilendiren modülleri görmeli
      const getRoleAllowedMegaModules = (role: UserRoleType): Set<string> => {
        // ÖNEMLİ: HQ departman rolleri için ÖNCE özel kontroller yapılmalı
        // Bu roller sadece kendi departmanlarıyla ilgili modülleri görmeli
        
        // SATINALMA ROLÜ: Sadece satınalma ile ilgili modüller
        if (role === 'satinalma') {
          return new Set(['dashboard', 'satinalma', 'reports']);
        }
        
        // MUHASEBE ROLÜ: Finans ve personel modülleri
        if (role === 'muhasebe') {
          return new Set(['dashboard', 'hr', 'reports', 'satinalma']);
        }
        
        // MUHASEBE_IK ROLÜ: Finans, IK ve personel modülleri
        if (role === 'muhasebe_ik') {
          return new Set(['dashboard', 'hr', 'reports', 'satinalma']);
        }
        
        // TEKNİK ROLÜ: Ekipman ve arıza modülleri
        if (role === 'teknik') {
          return new Set(['dashboard', 'equipment', 'reports']);
        }
        
        // FABRİKA ROLÜ: Fabrika ve üretim modülleri
        if (role === 'fabrika') {
          return new Set(['dashboard', 'factory', 'reports', 'training', 'satinalma']);
        }
        
        // COACH ROLÜ: Eğitim ve akademi modülleri
        if (role === 'coach') {
          return new Set(['dashboard', 'training', 'reports']);
        }
        
        // DESTEK ROLÜ: Operasyon ve destek modülleri
        if (role === 'destek') {
          return new Set(['dashboard', 'operations', 'equipment', 'reports', 'admin']);
        }
        
        // TRAINER ROLÜ: Eğitim, akademi ve mutfak modülleri
        if (role === 'trainer') {
          return new Set(['dashboard', 'training', 'kitchen', 'reports']);
        }
        
        // MARKETING / PAZARLAMA ROLÜ: İçerik, raporlar
        if (role === 'marketing' || role === 'pazarlama') {
          return new Set(['dashboard', 'reports', 'operations']);
        }
        
        // İK ROLÜ: İnsan kaynakları ve raporlar
        if (role === 'ik') {
          return new Set(['dashboard', 'hr', 'reports']);
        }
        
        // EKİPMAN TEKNİK ROLÜ: Ekipman ve arıza
        if (role === 'ekipman_teknik') {
          return new Set(['dashboard', 'equipment', 'reports']);
        }
        
        // KALİTE KONTROL ROLÜ: Kalite, fabrika ve raporlar
        if (role === 'kalite_kontrol') {
          return new Set(['dashboard', 'factory', 'reports']);
        }
        
        // FABRİKA MÜDÜRÜ: Fabrika, satınalma, raporlar, İK, operasyon, eğitim, ekipman
        if (role === 'fabrika_mudur') {
          return new Set(['dashboard', 'factory', 'satinalma', 'hr', 'reports', 'operations', 'training', 'equipment']);
        }
        
        // FABRİKA OPERATÖR/SORUMLU: Fabrika ve satınalma (sayım)
        if (role === 'fabrika_operator' || role === 'fabrika_sorumlu' || role === 'fabrika_personel') {
          return new Set(['dashboard', 'factory', 'satinalma']);
        }
        
        // YATIRIMCI HQ ROLÜ: Raporlar ve dashboard
        if (role === 'yatirimci_hq') {
          return new Set(['dashboard', 'reports', 'newshop']);
        }
        
        // CEO ROLÜ: TÜM modüllere erişim
        if (role === 'ceo') {
          return new Set(['dashboard', 'operations', 'equipment', 'hr', 'training', 'kitchen', 'factory', 'reports', 'newshop', 'satinalma', 'admin']);
        }
        
        // CGO ROLÜ: TÜM modüllere erişim
        if (role === 'cgo') {
          return new Set(['dashboard', 'operations', 'equipment', 'hr', 'training', 'kitchen', 'factory', 'reports', 'newshop', 'satinalma', 'admin']);
        }
        
        // ADMIN ROLÜ: TÜM modüllere tam erişim
        if (role === 'admin') {
          return new Set(['dashboard', 'operations', 'equipment', 'hr', 'training', 'kitchen', 'factory', 'reports', 'newshop', 'satinalma', 'admin']);
        }
        
        // Kalan HQ rolleri: Temel modüller
        if (isHQRole(role)) {
          return new Set(['dashboard', 'operations', 'reports']);
        }
        
        // Şube rolleri (supervisor, barista, stajyer vs): şube odaklı modüller
        // Factory, newshop, admin, satinalma modüllerini GÖRMEMELİ
        if (isBranchRole(role)) {
          // Supervisor ve supervisor_buddy ek modüller görebilir
          if (role === 'supervisor' || role === 'supervisor_buddy') {
            return new Set(['dashboard', 'operations', 'equipment', 'hr', 'training', 'kitchen', 'reports']);
          }
          // Barista, stajyer, bar_buddy: temel şube modülleri
          return new Set(['dashboard', 'operations', 'equipment', 'training', 'kitchen']);
        }
        
        // Varsayılan: temel modüller
        return new Set(['dashboard', 'operations', 'training']);
      };
      
      const allowedMegaModules = getRoleAllowedMegaModules(userRole);
      
      // 1. Get all mega-module items from DB - BU TEK KAYNAK OLACAK
      const allMegaModuleItems = await db.select().from(megaModuleItems).where(eq(megaModuleItems.isActive, true)).orderBy(megaModuleItems.megaModuleId, megaModuleItems.sortOrder);
      
      // 2. Modül sayılarını DOĞRUDAN mega_module_items tablosundan hesapla (Modül Düzenleme ile senkron)
      // Sadece izin verilen mega modülleri say
      const dbModuleCounts: Record<string, number> = {};
      const dbModuleItemsList: Record<string, Array<{path: string, title: string}>> = {};
      const pathToMegaModule: Record<string, string> = {};
      
      for (const item of allMegaModuleItems) {
        const megaId = item.megaModuleId;
        
        // ROL FİLTRESİ: Bu mega modül bu role izin veriyor mu?
        if (!allowedMegaModules.has(megaId)) {
          continue; // Bu mega modülü atla
        }
        
        // ALT MODÜL YETKİ KONTROLÜ: Her alt modül için hasPermission kontrolü
        const subModulePath = item.subModulePath || '';
        
        // Path'in karşılık gelen permission modülünü bul
        // Önce tam path eşleşmesi, sonra prefix ile eşleşme dene
        let permissionModule = PATH_TO_PERMISSION_MAP[subModulePath];
        
        if (!permissionModule) {
          // Prefix ile eşleşme dene (örn: /akademi/badges için /akademi kontrol et)
          const pathParts = subModulePath.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            permissionModule = PATH_TO_PERMISSION_MAP['/' + pathParts[0]];
          }
        }
        
        // ADMIN BYPASS: Admin her şeye erişebilir, kontrol atla
        if (userRole === 'admin') {
          // Admin için hiçbir izin kontrolü yapma, direkt ekle
        } else if (permissionModule) {
          const canView = hasPermission(userRole, permissionModule, 'view');
          if (!canView) {
            console.log(`[Dashboard] Skipping ${subModulePath} - no permission for ${permissionModule}`);
            continue; // Yetkisi olmayan modülü atla
          }
        }
        
        dbModuleCounts[megaId] = (dbModuleCounts[megaId] || 0) + 1;
        
        if (!dbModuleItemsList[megaId]) {
          dbModuleItemsList[megaId] = [];
        }
        dbModuleItemsList[megaId].push({ 
          path: subModulePath, 
          title: item.subModuleName || subModulePath || ''
        });
        
        if (subModulePath) {
          pathToMegaModule[subModulePath] = item.megaModuleId;
        }
      }
      
      // 3. Get mega-module configs for display
      const configs = await db.select().from(megaModuleConfig).orderBy(megaModuleConfig.sortOrder);
      
      // 4. Sadece izin verilen mega modülleri filtrele ve döndür
      const filteredConfigs = configs.filter(c => allowedMegaModules.has(c.megaModuleId));
      
      res.json({
        megaModules: filteredConfigs.map(c => ({
          id: c.megaModuleId,
          title: c.megaModuleNameTr || c.megaModuleName,
          icon: c.icon,
          color: c.color,
          itemCount: dbModuleCounts[c.megaModuleId] || 0,
          items: dbModuleItemsList[c.megaModuleId] || []
        })),
        totalAccessibleModules: Object.values(dbModuleCounts).reduce((sum, count) => sum + count, 0),
        pathMapping: pathToMegaModule,
        userRole: userRole,
        allowedModules: Array.from(allowedMegaModules)
      });
    } catch (error: any) {
      console.error("Error fetching dashboard modules:", error);
      res.status(500).json({ message: "Dashboard modülleri alınamadı" });
    }
  });


  // Personnel Profile
  router.get('/api/personnel/:id', isAuthenticated, async (req, res) => {
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



  // ========================================
  // EMPLOYEE SATISFACTION SCORE ENDPOINTS
  // ========================================

  router.get('/api/users/:id/satisfaction-score', isAuthenticated, async (req, res) => {
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

  router.get('/api/users/:id/task-ratings', isAuthenticated, async (req, res) => {
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

  router.get('/api/users/:id/received-ratings', isAuthenticated, async (req, res) => {
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




  router.get('/api/knowledge-base', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const equipmentTypeId = req.query.equipmentTypeId as string | undefined;
      const isPublished = req.query.isPublished === 'true' ? true : undefined;
      const articles = await storage.getArticles(category, equipmentTypeId, isPublished);
      res.json(articles);
    } catch (error: any) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Makaleler alınırken hata oluştu" });
    }
  });

  router.post('/api/knowledge-base', isAuthenticated, async (req, res) => {
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
        } catch (error: any) {
          console.error("Error generating embeddings:", error);
        }
      }
      
      res.json(article);
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz makale verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Makale oluşturulurken hata oluştu" });
    }
  });

  const updateArticleSchema = insertKnowledgeBaseArticleSchema.partial();

  router.put('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getArticle(id);
      if (!existing) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      const validatedData = updateArticleSchema.parse(req.body);
      const updated = await storage.updateArticle(id, validatedData);
      if (!updated) {
        return res.status(500).json({ message: "Güncelleme başarısız" });
      }

      let embeddingStatus = 'unchanged';
      await storage.deleteEmbeddingsByArticle(id);
      if (updated.isPublished) {
        try {
          const embeddings = await generateArticleEmbeddings(id, updated.title, updated.content);
          await storage.createEmbeddings(embeddings.map(e => ({
            articleId: id,
            chunkText: e.chunkText,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding,
          })));
          embeddingStatus = 'updated';
        } catch (embError: any) {
          console.error("Vektör güncelleme hatası:", embError.message);
          embeddingStatus = 'failed';
        }
      } else {
        embeddingStatus = 'removed';
      }

      res.json({ ...updated, embeddingStatus });
    } catch (error: any) {
      console.error("Error updating article:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Makale güncellenemedi" });
    }
  });

  router.delete('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getArticle(id);
      if (!existing) {
        return res.status(404).json({ message: "Makale bulunamadı" });
      }

      await storage.deleteArticle(id);
      res.json({ message: "Makale silindi", articleId: id });
    } catch (error: any) {
      console.error("Error deleting article:", error);
      res.status(500).json({ message: "Makale silinemedi" });
    }
  });

  router.post('/api/knowledge-base/:id/reindex', isAuthenticated, async (req, res) => {
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

  async function createArticleWithEmbedding(data: { title: string; content: string; category: string; tags?: string[]; isPublished?: boolean }) {
    const existing = await storage.getArticleByTitle(data.title);
    if (existing) return { skipped: true, article: existing };

    const article = await storage.createArticle({
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      isPublished: data.isPublished !== false,
      viewCount: 0,
    });

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
      } catch (err: any) {
        console.error(`Vektör oluşturma hatası (${article.title}):`, err.message);
      }
    }

    return { skipped: false, article };
  }

  router.post('/api/knowledge-base/seed-from-academy', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const modules = await db.select().from(trainingModules).where(isNull(trainingModules.deletedAt));

      const categoryMap: Record<string, string> = {
        'barista': 'training',
        'barista_basics': 'training',
        'Barista Basics': 'training',
        'stajyer': 'training',
        'bar buddy': 'training',
        'supervisor': 'training',
        'supervisor buddy': 'training',
        'onboarding': 'training',
        'hygiene': 'hygiene',
        'customer_service': 'training',
        'management': 'training',
        'depo': 'training',
      };

      let created = 0;
      let skipped = 0;

      for (const mod of modules) {
        const objectives = Array.isArray(mod.learningObjectives) ? mod.learningObjectives : [];
        const steps = Array.isArray(mod.steps) ? mod.steps : [];

        let content = `# ${mod.title}\n\n`;
        if (mod.description) content += `${mod.description}\n\n`;

        if (objectives.length > 0) {
          content += `## Öğrenme Hedefleri\n`;
          objectives.forEach((obj: any) => {
            const text = typeof obj === 'string' ? obj : obj?.text || obj?.title || JSON.stringify(obj);
            content += `- ${text}\n`;
          });
          content += '\n';
        }

        if (steps.length > 0) {
          content += `## Eğitim Adımları\n`;
          steps.forEach((step: any, i: number) => {
            const title = typeof step === 'string' ? step : step?.title || step?.name || `Adım ${i + 1}`;
            const desc = typeof step === 'object' ? (step?.description || step?.content || '') : '';
            content += `${i + 1}. **${title}**`;
            if (desc) content += `: ${desc}`;
            content += '\n';
          });
          content += '\n';
        }

        if (mod.aiSummary) {
          content += `## Özet\n${mod.aiSummary}\n\n`;
        }

        const category = categoryMap[mod.category || ''] || 'training';
        const tags = [
          ...(Array.isArray(mod.tags) ? mod.tags : []),
          mod.category || 'genel',
          'akademi',
          mod.level || 'beginner',
        ].filter(Boolean) as string[];

        const result = await createArticleWithEmbedding({
          title: mod.title,
          content,
          category,
          tags,
        });

        if (result.skipped) skipped++;
        else created++;
      }

      res.json({
        message: `Akademi aktarımı tamamlandı`,
        created,
        skipped,
        total: modules.length,
      });
    } catch (error: any) {
      console.error("Academy seed error:", error);
      res.status(500).json({ message: "Akademi aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-from-recipes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const categories = await db.select().from(recipeCategories);
      const allRecipes = await db.select().from(recipes);
      const allVersions = await db.select().from(recipeVersions);

      let created = 0;
      let skipped = 0;

      for (const cat of categories) {
        const catRecipes = allRecipes.filter(r => r.categoryId === cat.id);
        if (catRecipes.length === 0) continue;

        let content = `# ${cat.titleTr} Reçeteleri\n\n`;
        content += `Bu kategoride ${catRecipes.length} ürün bulunmaktadır.\n\n`;

        for (const recipe of catRecipes) {
          content += `## ${recipe.nameTr}\n`;
          if (recipe.code) content += `Kod: ${recipe.code}\n`;
          if (recipe.coffeeType) content += `Kahve Tipi: ${recipe.coffeeType}\n`;
          if (recipe.difficulty) content += `Zorluk: ${recipe.difficulty}\n`;
          if (recipe.estimatedMinutes) content += `Tahmini Süre: ${recipe.estimatedMinutes} dakika\n`;

          const version = allVersions.find(v => v.recipeId === recipe.id && v.isActive);
          if (version) {
            if (version.ingredients && Array.isArray(version.ingredients)) {
              content += `\n### Malzemeler\n`;
              (version.ingredients as any[]).forEach((ing: any) => {
                if (typeof ing === 'string') {
                  content += `- ${ing}\n`;
                } else {
                  content += `- ${ing.name || ing.ingredient || ''}: ${ing.amount || ''} ${ing.unit || ''}\n`;
                }
              });
            }

            if (version.cookingSteps && Array.isArray(version.cookingSteps)) {
              content += `\n### Hazırlama Adımları\n`;
              (version.cookingSteps as any[]).forEach((step: any, i: number) => {
                const text = typeof step === 'string' ? step : step?.text || step?.description || '';
                content += `${i + 1}. ${text}\n`;
              });
            }

            if (version.sizes && typeof version.sizes === 'object') {
              content += `\n### Boyutlar\n`;
              const sizes = version.sizes as Record<string, any>;
              for (const [sizeName, sizeData] of Object.entries(sizes)) {
                content += `- **${sizeName}**`;
                if (sizeData && typeof sizeData === 'object') {
                  if (sizeData.cup_ml) content += ` (${sizeData.cup_ml}ml)`;
                  if (sizeData.espresso) content += `, Espresso: ${JSON.stringify(sizeData.espresso)}`;
                  if (sizeData.milk) content += `, Süt: ${JSON.stringify(sizeData.milk)}`;
                }
                content += '\n';
              }
            }
          }
          content += '\n---\n\n';
        }

        const result = await createArticleWithEmbedding({
          title: `${cat.titleTr} Reçeteleri`,
          content,
          category: 'recipe',
          tags: ['reçete', cat.titleTr.toLocaleLowerCase('tr-TR'), cat.slug || ''],
        });

        if (result.skipped) skipped++;
        else created++;
      }

      res.json({
        message: `Reçete aktarımı tamamlandı`,
        created,
        skipped,
        total: categories.length,
      });
    } catch (error: any) {
      console.error("Recipe seed error:", error);
      res.status(500).json({ message: "Reçete aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-procedures', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const allChecklists = await db.select().from(checklists);
      const allTasks = await db.select().from(checklistTasks);

      let created = 0;
      let skipped = 0;

      const openingChecklist = allChecklists.find(c => c.category === 'açılış');
      if (openingChecklist) {
        const tasks = allTasks.filter(t => t.checklistId === openingChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        let content = `# DOSPRESSO Şube Açılış Prosedürü\n\n`;
        content += `Şube açılışında aşağıdaki adımlar sırasıyla takip edilmelidir:\n\n`;
        tasks.forEach((t, i) => {
          content += `${i + 1}. ${t.taskDescription}`;
          if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
          if (t.taskTimeStart && t.taskTimeEnd) content += ` [${t.taskTimeStart} - ${t.taskTimeEnd}]`;
          content += '\n';
        });
        content += `\n## Önemli Notlar\n`;
        content += `- Açılış saati öncesinde tüm adımlar tamamlanmalıdır\n`;
        content += `- Espresso kalibrasyonu günlük olarak yapılmalıdır\n`;
        content += `- Stok eksiklikleri hemen raporlanmalıdır\n`;

        const result = await createArticleWithEmbedding({
          title: 'DOSPRESSO Şube Açılış Prosedürü',
          content,
          category: 'procedure',
          tags: ['açılış', 'prosedür', 'checklist', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      const closingChecklist = allChecklists.find(c => c.category === 'kapanış');
      if (closingChecklist) {
        const tasks = allTasks.filter(t => t.checklistId === closingChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        let content = `# DOSPRESSO Şube Kapanış Prosedürü\n\n`;
        content += `Şube kapanışında aşağıdaki adımlar sırasıyla takip edilmelidir:\n\n`;
        tasks.forEach((t, i) => {
          content += `${i + 1}. ${t.taskDescription}`;
          if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
          if (t.taskTimeStart && t.taskTimeEnd) content += ` [${t.taskTimeStart} - ${t.taskTimeEnd}]`;
          content += '\n';
        });
        content += `\n## Önemli Notlar\n`;
        content += `- Kasa kapanışı ve günlük rapor zorunludur\n`;
        content += `- Tüm ekipmanlar kapatılmalıdır\n`;
        content += `- Kapı kilitleme ve alarm kontrolü yapılmalıdır\n`;
        content += `- Buzdolabı sıcaklığı kontrol edilmelidir\n`;

        const result = await createArticleWithEmbedding({
          title: 'DOSPRESSO Şube Kapanış Prosedürü',
          content,
          category: 'procedure',
          tags: ['kapanış', 'prosedür', 'checklist', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const content = `# Müşteri Şikayet Yönetimi Prosedürü\n\n` +
          `## SLA Süreleri\n` +
          `DOSPRESSO müşteri şikayetleri öncelik seviyesine göre farklı SLA süreleri ile yönetilir:\n\n` +
          `| Öncelik | Yanıt Süresi | Çözüm Süresi |\n` +
          `|---------|-------------|-------------|\n` +
          `| Kritik | 30 dakika | 2 saat |\n` +
          `| Yüksek | 1 saat | 4 saat |\n` +
          `| Orta | 4 saat | 24 saat |\n` +
          `| Düşük | 8 saat | 72 saat |\n\n` +
          `## Şikayet Yönetim Adımları\n` +
          `1. **Kayıt**: Müşteri şikayeti sisteme kaydedilir (şube personeli veya müdür)\n` +
          `2. **Önceliklendirme**: Şikayet türüne göre öncelik belirlenir\n` +
          `3. **Atama**: İlgili birime veya kişiye atanır\n` +
          `4. **Bildirim**: İlgili yöneticilere otomatik bildirim gönderilir\n` +
          `5. **Takip**: SLA süresi içinde çözüm sağlanır\n` +
          `6. **Escalation**: SLA ihlalinde otomatik üst kademeye yükseltilir\n` +
          `7. **Kapanış**: Çözüm sonrası müşteriye bilgilendirme yapılır\n\n` +
          `## Escalation Kuralları\n` +
          `- SLA %75'e ulaştığında uyarı bildirimi\n` +
          `- SLA aşıldığında bölge müdürüne otomatik escalation\n` +
          `- 2x SLA aşımında genel müdürlüğe bildirim\n` +
          `- Kritik şikayetler anında müdür ve bölge müdürüne bildirilir\n\n` +
          `## İletişim Kuralları\n` +
          `- Müşteriyle saygılı ve profesyonel iletişim\n` +
          `- Çözüm süreci hakkında düzenli bilgilendirme\n` +
          `- Tazminat/iade kararları şube müdürü onayı ile\n`;

        const result = await createArticleWithEmbedding({
          title: 'Müşteri Şikayet Yönetimi Prosedürü',
          content,
          category: 'procedure',
          tags: ['şikayet', 'müşteri', 'SLA', 'escalation', 'prosedür'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const content = `# Kayıp Eşya Yönetimi Prosedürü\n\n` +
          `## Bulma Aşaması\n` +
          `1. Bulunan eşya derhal kayıt altına alınır\n` +
          `2. Eşyanın fotoğrafı çekilir\n` +
          `3. Bulunma yeri, tarih ve saati not edilir\n` +
          `4. Bulan personelin bilgileri kaydedilir\n\n` +
          `## Saklama Aşaması\n` +
          `1. Eşya güvenli bir yerde (kasa veya kilitli dolap) saklanır\n` +
          `2. Değerli eşyalar (cüzdan, telefon, mücevher) ayrı kaydedilir\n` +
          `3. Bozulabilir gıda/içecek ürünleri 24 saat sonra imha edilir\n\n` +
          `## Teslim Aşaması\n` +
          `1. Sahip kimliğini doğrular (eşya tanımı, kimlik belgesi)\n` +
          `2. Teslim tutanağı imzalatılır\n` +
          `3. Teslim tarih ve saati sisteme kaydedilir\n\n` +
          `## Bekleme Süreleri\n` +
          `- Değerli eşyalar: 90 gün\n` +
          `- Kıyafet ve aksesuar: 30 gün\n` +
          `- Diğer: 15 gün\n` +
          `- Süre sonunda eşya bağışlanır veya imha edilir\n\n` +
          `## Bildirimler\n` +
          `- Her kayıp eşya kaydında şube müdürüne bildirim\n` +
          `- Değerli eşyalarda bölge müdürüne bildirim\n` +
          `- Sahipsiz eşya süresi dolduğunda hatırlatma bildirimi\n`;

        const result = await createArticleWithEmbedding({
          title: 'Kayıp Eşya Yönetimi Prosedürü',
          content,
          category: 'procedure',
          tags: ['kayıp eşya', 'prosedür', 'güvenlik', 'operasyon'],
        });
        if (result.skipped) skipped++; else created++;
      }

      {
        const dailyChecklist = allChecklists.find(c => c.category === 'günlük kontrol');
        const dailyTasks = dailyChecklist
          ? allTasks.filter(t => t.checklistId === dailyChecklist.id).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          : [];

        let content = `# Hijyen ve Temizlik Standartları\n\n`;
        content += `## HACCP Temel İlkeleri\n`;
        content += `DOSPRESSO tüm şubelerinde HACCP (Tehlike Analizi ve Kritik Kontrol Noktaları) standartlarına uyulmalıdır.\n\n`;
        content += `## Günlük Kontrol Listesi\n`;
        if (dailyTasks.length > 0) {
          dailyTasks.forEach((t, i) => {
            content += `${i + 1}. ${t.taskDescription}`;
            if (t.requiresPhoto) content += ` (Fotoğraf gerekli)`;
            content += '\n';
          });
        }
        content += `\n## Temizlik Programı\n`;
        content += `### Her Vardiya\n`;
        content += `- Tezgah ve çalışma yüzeyleri silinir\n`;
        content += `- Kullanılan ekipmanlar temizlenir\n`;
        content += `- Çöp kutuları boşaltılır\n`;
        content += `- Müşteri alanı temizlenir\n\n`;
        content += `### Günlük\n`;
        content += `- Zemin yıkanır\n`;
        content += `- Buzdolabı sıcaklığı kontrol edilir (2-8°C)\n`;
        content += `- Espresso makinesi geri yıkama yapılır\n`;
        content += `- Tüm yüzeyler dezenfekte edilir\n\n`;
        content += `### Haftalık\n`;
        content += `- Derin temizlik yapılır\n`;
        content += `- Ekipman bakımları kontrol edilir\n`;
        content += `- Havalandırma filtreleri temizlenir\n`;
        content += `- Depo düzeni kontrol edilir (FIFO)\n\n`;
        content += `## Kişisel Hijyen\n`;
        content += `- Temiz üniforma giyilir\n`;
        content += `- Saçlar toplanır, bone takılır\n`;
        content += `- Tırnaklar kısa ve temiz tutulur\n`;
        content += `- El yıkama prosedürü uygulanır (en az 20 saniye)\n`;
        content += `- Eldiven kullanımı gerekli alanlarda eldiven giyilir\n`;

        const result = await createArticleWithEmbedding({
          title: 'Hijyen ve Temizlik Standartları',
          content,
          category: 'procedure',
          tags: ['hijyen', 'temizlik', 'HACCP', 'prosedür', 'standart'],
        });
        if (result.skipped) skipped++; else created++;
      }

      res.json({
        message: `Prosedür makaleleri oluşturuldu`,
        created,
        skipped,
        total: 5,
      });
    } catch (error: any) {
      console.error("Procedure seed error:", error);
      res.status(500).json({ message: "Prosedür oluşturma başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/seed-quality-specs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const specs = await db.select().from(factoryQualitySpecs);

      let content = `# DOSPRESSO Ürün Kalite Standartları\n\n`;
      content += `Bu belge, DOSPRESSO fabrikasında üretilen ürünlerin kalite kontrol standartlarını tanımlar.\n\n`;

      const numericSpecs = specs.filter(s => s.measurementType === 'numeric');
      const booleanSpecs = specs.filter(s => s.measurementType === 'boolean');

      if (numericSpecs.length > 0) {
        content += `## Sayısal Ölçüm Standartları\n\n`;
        content += `| Kriter | Minimum | Maksimum | Hedef | Birim |\n`;
        content += `|--------|---------|----------|-------|-------|\n`;
        numericSpecs.forEach(s => {
          content += `| ${s.name} | ${s.minValue || '-'} | ${s.maxValue || '-'} | ${s.targetValue || '-'} | ${s.unit || '-'} |\n`;
        });
        content += '\n';

        numericSpecs.forEach(s => {
          content += `### ${s.name}\n`;
          if (s.minValue && s.maxValue) {
            content += `- Kabul aralığı: ${s.minValue} - ${s.maxValue} ${s.unit || ''}\n`;
          }
          if (s.targetValue) {
            content += `- Hedef değer: ${s.targetValue} ${s.unit || ''}\n`;
          }
          content += '\n';
        });
      }

      if (booleanSpecs.length > 0) {
        content += `## Görsel / Duyusal Kontroller\n\n`;
        content += `Aşağıdaki kontroller evet/hayır (geçti/kaldı) olarak değerlendirilir:\n\n`;
        booleanSpecs.forEach(s => {
          content += `- **${s.name}**: Kontrol edilmeli${s.isRequired ? ' (Zorunlu)' : ''}\n`;
        });
        content += '\n';
      }

      content += `## Sıkça Sorulan Sorular\n\n`;
      content += `**Donut hamuru kaç gram olmalı?**\n`;
      const gramSpec = numericSpecs.find(s => s.name.toLocaleLowerCase('tr-TR').includes('gramaj'));
      if (gramSpec) {
        content += `Donut hamuru ${gramSpec.minValue}-${gramSpec.maxValue} ${gramSpec.unit} arasında olmalıdır. Hedef ağırlık ${gramSpec.targetValue} ${gramSpec.unit}'dır.\n\n`;
      }

      const heightSpec = numericSpecs.find(s => s.name.toLocaleLowerCase('tr-TR').includes('yükseklik'));
      if (heightSpec) {
        content += `**Donut yüksekliği ne olmalı?**\n`;
        content += `Donut yüksekliği ${heightSpec.minValue}-${heightSpec.maxValue} ${heightSpec.unit} arasında olmalıdır. Hedef yükseklik ${heightSpec.targetValue} ${heightSpec.unit}'dir.\n\n`;
      }

      let created = 0;
      let skipped = 0;

      const result = await createArticleWithEmbedding({
        title: 'DOSPRESSO Ürün Kalite Standartları',
        content,
        category: 'quality',
        tags: ['kalite', 'standart', 'gramaj', 'donut', 'üretim', 'fabrika'],
      });
      if (result.skipped) skipped++; else created++;

      res.json({
        message: `Kalite kriterleri aktarıldı`,
        created,
        skipped,
        total: 1,
      });
    } catch (error: any) {
      console.error("Quality specs seed error:", error);
      res.status(500).json({ message: "Kalite kriterleri aktarımı başarısız", error: error.message });
    }
  });

  router.post('/api/knowledge-base/ask', isAuthenticated, async (req: any, res) => {
    try {
      const { question, equipmentId } = req.body;
      const userId = req.user.id;
      const userBranchId = req.user.branchId;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Soru gereklidir" });
      }

      // Build equipment context with branch equipment list
      let equipmentContext: {
        type: string;
        serialNumber?: string;
        branch?: string;
        recentFaults?: Array<{ description: string; date: string }>;
        branchEquipment?: Array<{ name: string; type: string; brand?: string; model?: string }>;
      } | undefined;

      try {
        // Always fetch branch equipment list for context if user has a branch
        if (userBranchId) {
          const branchEquipment = await storage.getEquipment(userBranchId);
          const branch = await storage.getBranch(userBranchId);
          
          const branchEquipmentList = branchEquipment.map((e: any) => ({
            name: e.name,
            type: e.equipmentType,
            brand: e.brand || undefined,
            model: e.model || undefined
          }));

          equipmentContext = {
            type: 'genel',
            branch: branch?.name,
            branchEquipment: branchEquipmentList.length > 0 ? branchEquipmentList : undefined
          };
        }

        // If specific equipment selected, add detailed context
        if (equipmentId) {
          const equipment = await storage.getEquipmentById(equipmentId);
          if (equipment) {
            const branch = equipment.branchId ? await storage.getBranch(equipment.branchId) : null;
            const recentFaults = await storage.getFaults();
            const equipmentFaults = recentFaults
              .filter((f: any) => f.equipmentId === equipmentId)
              .slice(0, 3)
              .map((f: any) => ({
                description: f.description,
                date: new Date(f.createdAt).toLocaleDateString('tr-TR')
              }));

            equipmentContext = {
              ...equipmentContext,
              type: equipment.equipmentType,
              serialNumber: equipment.serialNumber || undefined,
              branch: branch?.name || equipmentContext?.branch,
              recentFaults: equipmentFaults.length > 0 ? equipmentFaults : undefined
            };
          }
        }

        // Search equipment knowledge base for relevant info
        const knowledgeResults = await storage.searchEquipmentKnowledge(
          question, 
          equipmentContext?.type !== 'genel' ? equipmentContext?.type : undefined
        );
        
        if (knowledgeResults.length > 0) {
          console.log(`📚 Found ${knowledgeResults.length} equipment knowledge entries for context`);
          // Add knowledge to context
          const knowledgeContext = knowledgeResults
            .slice(0, 3)
            .map(k => `[${k.title}]: ${k.content.substring(0, 800)}`)
            .join('\n\n');
          
          if (!equipmentContext) {
            equipmentContext = { type: 'genel' };
          }
          (equipmentContext as any).knowledgeContext = knowledgeContext;
        }

        // Search for matching recipes if question is about menu/drinks
        const recipeKeywords = ['reçete', 'tarif', 'nasıl yapılır', 'hazırla', 'latte', 'americano', 'cappuccino', 'flat white', 'espresso', 'frappe', 'iced', 'içecek', 'kahve', 'menü'];
        const isRecipeQuestion = recipeKeywords.some(kw => question.toLocaleLowerCase('tr-TR').includes(kw));
        
        if (isRecipeQuestion) {
          const recipeResults = await storage.searchRecipesForAI(question);
          if (recipeResults.length > 0) {
            console.log(`🍵 Found ${recipeResults.length} recipes for context`);
            const recipeContext = recipeResults.map(r => {
              const massivoInfo = r.size?.massivo ? 
                `Massivo (${r.size.massivo.cupMl}ml): ${r.size.massivo.espresso || ''} ${r.size.massivo.milk?.ml ? r.size.massivo.milk.ml + 'ml ' + r.size.massivo.milk.type : ''}` : '';
              const longDivaInfo = r.size?.longDiva ? 
                `Long Diva (${r.size.longDiva.cupMl}ml): ${r.size.longDiva.espresso || ''} ${r.size.longDiva.milk?.ml ? r.size.longDiva.milk.ml + 'ml ' + r.size.longDiva.milk.type : ''}` : '';
              const steps = r.steps?.length > 0 ? '\nAdımlar: ' + r.steps.join(' → ') : '';
              return `[[${r.name} - ${r.category}]]\n${massivoInfo}\n${longDivaInfo}${steps}`;
            }).join('\n\n');
            
            if (!equipmentContext) {
              equipmentContext = { type: 'genel' };
            }
            (equipmentContext as any).recipeContext = recipeContext;
          }
        }

      } catch (error: any) {
        console.warn("Failed to fetch equipment context:", error);
      }

      // Use enhanced technical assistant with fallback LLM
      const response = await answerTechnicalQuestion(question, equipmentContext, userId);
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw)) && response.answer) {
        response.answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }
      
      res.json(response);
    } catch (error: any) {
      handleApiError(res, error, "AnswerQuestion");
    }
  });


  // AI Article Draft Generator (HQ only)
  router.post('/api/knowledge-base/generate-draft', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error generating article draft:", error);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({ message: (error as Error).message || "Taslak oluşturulamadı" });
    }
  });

  // AI Dashboard Summary (HQ + Branch Supervisors only)
  router.post('/api/ai-summary', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error generating AI summary:", error);
      
      // Handle rate limit errors
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI özeti oluşturulamadı" });
    }
  });

  // AI Dashboard Insights (HQ + Supervisor only - operational oversight)
  router.post('/api/ai-dashboard-insights', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error generating dashboard insights:", error);
      
      // Handle rate limit errors with localized message
      if (error.message?.includes('limit')) {
        return res.status(429).json({ message: error.message });
      }
      
      res.status(500).json({ message: "AI içgörüleri oluşturulamadı" });
    }
  });

  // ========================================
  // CERTIFICATE DESIGN SETTINGS ROUTES
  // ========================================

  router.get('/api/certificate-designs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const designs = await db.select().from(certificateDesignSettings).orderBy(certificateDesignSettings.transitionFrom);
      res.json(designs);
    } catch (error: any) {
      console.error("Error fetching certificate designs:", error);
      res.status(500).json({ message: "Sertifika tasarımları alınırken hata oluştu" });
    }
  });

  router.post('/api/certificate-designs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const data = {
        ...req.body,
        createdBy: user.id,
      };
      const [design] = await db.insert(certificateDesignSettings).values(data).returning();
      res.json(design);
    } catch (error: any) {
      console.error("Error creating certificate design:", error);
      res.status(500).json({ message: "Sertifika tasarımı oluşturulurken hata oluştu" });
    }
  });

  router.put('/api/certificate-designs/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const [updated] = await db.update(certificateDesignSettings)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(certificateDesignSettings.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: "Tasarım bulunamadı" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating certificate design:", error);
      res.status(500).json({ message: "Sertifika tasarımı güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/certificate-designs/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      await db.delete(certificateDesignSettings).where(eq(certificateDesignSettings.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting certificate design:", error);
      res.status(500).json({ message: "Sertifika tasarımı silinirken hata oluştu" });
    }
  });

  // Get presigned upload URL for object storage
  router.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('../objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ method: "PUT", url: uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Yükleme URL'si alınırken hata oluştu" });
    }
  });

  // Finalize uploaded object - normalize URL and set ACL policy
  router.post('/api/objects/finalize', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('../objectStorage');
      const objectStorageService = new ObjectStorageService();
      const user = req.user!;
      
      const { url, visibility = "public" } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL gereklidir" });
      }
      
      // Normalize the URL and set ACL policy
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(url, {
        owner: user.id,
        visibility: visibility === "public" ? "public" : "private",
      });
      
      // Validate the result - if path doesn't start with /objects/, ACL setting failed
      if (!normalizedPath || !normalizedPath.startsWith("/objects/")) {
        console.error("Failed to normalize object path:", url, "->", normalizedPath);
        return res.status(500).json({ message: "Yükleme yolu düzenlenirken hata oluştu" });
      }
      
      res.json({ normalizedUrl: normalizedPath });
    } catch (error: any) {
      console.error("Error finalizing object:", error);
      res.status(500).json({ message: "Yükleme tamamlanırken hata oluştu" });
    }
  });

  // Serve private objects with ACL check (for uploaded files)
  router.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('../objectStorage');
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
    } catch (error: any) {
      console.error("Error accessing object:", error);
      if (error.name === 'ObjectNotFoundError') {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Seed endpoint removed - can be reimplemented if needed
  

  // ===== EMPLOYEE AVAILABILITY ENDPOINTS =====
  
  // GET /api/employee-availability - List employee availability
  router.get('/api/employee-availability', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/employee-availability', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.parse(req.body);
      
      if (validatedData.userId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi müsaitlik bilgilerinizi ekleyebilirsiniz" });
      }
      
      const created = await storage.createAvailability(validatedData);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı oluşturulamadı" });
    }
  });
  
  // PATCH /api/employee-availability/:id - Update availability record
  router.patch('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı güncellenemedi" });
    }
  });
  
  // DELETE /api/employee-availability/:id - Delete availability record
  router.delete('/api/employee-availability/:id', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/employee-availability/check', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error checking availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz kontrol verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kontrolü yapılamadı" });
    }
  });


  // ===== SHIFT REPORTING ENDPOINTS =====
  
  // GET /api/reports/attendance-stats - Get attendance statistics
  router.get('/api/reports/attendance-stats', isAuthenticated, async (req: any, res) => {
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


  // ===== USER SETTINGS ENDPOINTS =====

  router.get('/api/me/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const [dbUser] = await db.select({ language: users.language }).from(users).where(eq(users.id, user.id));
      res.json({ language: dbUser?.language || "tr" });
    } catch (error: any) {
      console.error("[Settings] GET error:", error);
      res.status(500).json({ error: "Ayarlar yüklenemedi" });
    }
  });

  router.patch('/api/me/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { language } = req.body;
      const validLanguages = ["tr", "en", "ar", "de"];
      if (language && !validLanguages.includes(language)) {
        return res.status(400).json({ error: "Geçersiz dil seçimi" });
      }
      if (language) {
        await db.update(users).set({ language, updatedAt: new Date() }).where(eq(users.id, user.id));
      }
      res.json({ success: true, language });
    } catch (error: any) {
      console.error("[Settings] PATCH error:", error);
      res.status(500).json({ error: "Ayarlar kaydedilemedi" });
    }
  });

  // ===== USER PERSONAL DASHBOARD ENDPOINT =====
  
  // GET /api/me/dashboard-summary - Personal dashboard summary for the authenticated user
  router.get('/api/me/dashboard-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = user.id;
      const branchId = user.branchId;
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch user's personal data in parallel
      const [
        myTasks,
        myChecklists,
        myShifts,
        unreadNotifications,
        performanceScore
      ] = await Promise.all([
        // Get user's tasks
        storage.getTasks(branchId).then(tasks => 
          tasks.filter((t: any) => t.assignedToId === userId)
        ),
        // Get user's assigned checklists
        storage.getMyChecklistAssignments(userId, branchId, user.role),
        // Get user's shifts
        storage.getShiftsByUser(userId),
        // Get unread notifications count
        storage.getUnreadNotificationCount(userId),
        // Get performance score (if exists)
        Promise.resolve(null) // TODO: implement getDailyPerformanceScore
      ]);
      
      // Calculate task stats
      const completedTasks = myTasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
      const pendingTasks = myTasks.filter((t: any) => t.status !== 'completed' && t.status !== 'done').length;
      
      // Calculate checklist stats
      const totalChecklists = myChecklists.length;
      const completedChecklists = myChecklists.filter((c: any) => 
        c.tasks?.every((t: any) => t.completed)
      ).length;
      
      // Get today's shift
      const todayShift = myShifts.find((s: any) => 
        s.shiftDate === today
      );
      
      // Generate AI personal summary (non-blocking, with fallback)
      let aiSummary = '';
      try {
        aiSummary = await generatePersonalSummaryReport({
          firstName: user.firstName || 'Çalışan',
          completedTasks,
          pendingTasks,
          completedChecklists,
          pendingChecklists: totalChecklists - completedChecklists,
          performanceScore: performanceScore?.compositeScore || null,
          hasShiftToday: !!todayShift,
          shiftTime: todayShift ? `${todayShift.startTime}-${todayShift.endTime}` : undefined
        }, userId);
      } catch (error: any) {
        console.error('AI summary generation failed:', error);
        aiSummary = `${user.firstName || 'Merhaba'}, bugün ${pendingTasks} görev ve ${totalChecklists - completedChecklists} checklist bekliyor.`;
      }
      
      const summary = {
        user: {
          id: userId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branchId: branchId
        },
        stats: {
          completedTasks,
          pendingTasks,
          totalTasks: completedTasks + pendingTasks,
          completedChecklists,
          pendingChecklists: totalChecklists - completedChecklists,
          totalChecklists,
          unreadNotifications
        },
        todayShift: todayShift ? {
          startTime: todayShift.startTime,
          endTime: todayShift.endTime,
          shiftType: todayShift.shiftType,
          breakStartTime: todayShift.breakStartTime,
          breakEndTime: todayShift.breakEndTime
        } : null,
        performanceScore: performanceScore?.compositeScore || null,
        aiSummary,
        date: today
      };
      
      res.json(summary);
    } catch (error: any) {
      console.error('Error getting personal dashboard summary:', error);
      res.status(500).json({ message: 'Dashboard özeti alınamadı' });
    }
  });

  // ===== MENU MANAGEMENT ENDPOINTS =====
  
  // GET /api/me/menu - User-scoped menu endpoint (v2 - static blueprint based)
  // Primary endpoint for sidebar menu - uses static blueprint with RBAC filtering
  // NO CACHING - fresh data every request to prevent RBAC bypass
  router.get('/api/me/menu', isAuthenticated, async (req: any, res) => {
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
      } catch (error: any) {
        // Ignore notification count errors
      }
      
      try {
        const unreadResult = await storage.getUnreadCount(user.id);
        messageCount = unreadResult?.count || 0;
      } catch (error: any) {
        // Ignore message count errors
      }
      
      let agentPendingCount = 0;
      try {
        const { agentPendingActions } = await import("@shared/schema");
        const { eq, and, or, count: countFn } = await import("drizzle-orm");
        const { db } = await import("../db");
        const conditions: any[] = [eq(agentPendingActions.status, "pending")];
        const adminRoles = ["admin", "ceo", "cgo"];
        if (!adminRoles.includes(userRole)) {
          conditions.push(
            or(
              eq(agentPendingActions.targetUserId, String(user.id)),
              eq(agentPendingActions.targetRoleScope, userRole)
            )
          );
        }
        const [result] = await db.select({ count: countFn() }).from(agentPendingActions)
          .where(and(...conditions));
        agentPendingCount = Number(result?.count ?? 0);
      } catch {}

      const badges: Record<string, number> = {
        notifications: notificationCount,
        messages: messageCount,
        agent: agentPendingCount,
      };
      
      // Fetch dynamic permissions from database for this role
      let dynamicPermissions: Array<{ role: string; module: string; actions: string[] }> = [];
      try {
        const allPermissions = await storage.getRolePermissions();
        dynamicPermissions = allPermissions.filter(p => p.role === userRole);
      } catch (error: any) {
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
      res.status(500).json({ message: "Menü alınırken hata oluştu" });
    }
  });

  
  // GET /api/me/permissions - Returns dynamic permissions for current user's role
  // Used by frontend mega-modules to check permissions against admin panel settings
  router.get('/api/me/permissions', isAuthenticated, async (req: any, res) => {
    try {
      res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      const user = req.user!;
      const userRole = user.role as string;
      
      const allPermissions = await storage.getRolePermissions();
      const rolePerms = allPermissions.filter(p => p.role === userRole);
      
      // Build a map: module -> actions[]
      const permissionMap: Record<string, string[]> = {};
      for (const p of rolePerms) {
        const actions = Array.isArray(p.actions) ? p.actions : [];
        permissionMap[p.module] = actions;
      }
      
      return res.status(200).json({
        role: userRole,
        permissions: permissionMap,
        hasDynamicPermissions: rolePerms.length > 0,
      });
    } catch (error: any) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Yetkiler alınırken hata oluştu" });
    }
  });

  // GET /api/menu - Legacy endpoint (deprecated, redirects to static blueprint)
  router.get('/api/menu', isAuthenticated, async (req: any, res) => {
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
      } catch (error: any) {
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
      res.status(500).json({ message: "Menü alınırken hata oluştu" });
    }
  });
  
  // GET /api/admin/menu - List all menu data (HQ Admin only, for menu management)
  // POST /api/admin/menu/sections - Create section
  // PATCH /api/admin/menu/sections/:id - Update section
  // DELETE /api/admin/menu/sections/:id - Delete section
  // PATCH /api/admin/menu/sections/order - Reorder sections
  // POST /api/admin/menu/items - Create item
  // PATCH /api/admin/menu/items/:id - Update item
  // DELETE /api/admin/menu/items/:id - Delete item
  // PATCH /api/admin/menu/items/order - Reorder items within section
  // POST /api/admin/menu/visibility-rules - Create visibility rule
  // DELETE /api/admin/menu/visibility-rules/:id - Delete visibility rule
  // ===== PAGE CONTENT MANAGEMENT ENDPOINTS (HQ Only) =====

  // GET /api/admin/page-content - List all page content
  // GET /api/admin/page-content/:slug - Get single page content by slug
  // POST /api/admin/page-content - Create new page content
  // PATCH /api/admin/page-content/:slug - Update page content
  // DELETE /api/admin/page-content/:slug - Delete page content
  // ===== BRANDING ENDPOINTS (HQ Only) =====

  // GET /api/admin/branding - Get current branding (logo)
  // POST /api/admin/branding/logo - Update logo URL
  // ===== AI COST MONITORING ENDPOINTS (HQ Only) =====

  // GET /api/admin/ai-costs - Get AI usage cost aggregates
  // ===== USER CRM ENDPOINTS (HQ Only) =====

  // GET /api/admin/users - Get all users with filters
  // Supervisor can only see their own branch personnel
  // PATCH /api/admin/users/:id - Update user role/branch

  // PATCH /api/admin/users/:id/status - Toggle user active status
  // POST /api/admin/users/approve/:id - Approve pending user
  // POST /api/admin/users/reject/:id - Reject pending user
  // GET /api/admin/users/pending - Get pending approval users
  // GET /api/admin/users/export - Export users to CSV
  // DELETE /api/admin/users/:id - Delete user
  // POST /api/admin/users - Create new user
  // ========================================
  // QUALITY AUDITS API (Kalite Denetimi)
  // ========================================

  // GET /api/quality-audits - List quality audits
  router.get('/api/quality-audits', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/quality-audits', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating quality audit:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Denetim oluşturulurken hata oluştu" });
    }
  });

  // GET /api/branch-audit-scores - Get branch audit score summaries
  router.get('/api/branch-audit-scores', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/branch-audit-scores/:branchId/latest', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/quality-audits/summary', isAuthenticated, async (req: any, res) => {
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
  // MAINTENANCE SCHEDULES API (Proaktif Bakım)
  // ========================================

  // GET /api/maintenance-schedules - List maintenance schedules
  router.get('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/maintenance-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ teknik/admin can create schedules
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const [schedule] = await db.insert(maintenanceSchedules).values(validatedData).returning();

      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("Error creating maintenance schedule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım planı oluşturulurken hata oluştu" });
    }
  });

  // GET /api/maintenance-logs - List maintenance logs
  router.get('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/maintenance-logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const validatedData = insertMaintenanceLogSchema.parse(req.body);
      const [log] = await db.insert(maintenanceLogs).values({
        ...validatedData,
        performedById: user.id,
      }).returning();

      res.status(201).json(log);
    } catch (error: any) {
      console.error("Error creating maintenance log:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım kaydı oluşturulurken hata oluştu" });
    }
  });


  // ========================================
  // CAMPAIGNS API (Kampanya Yönetimi)
  // ========================================

  // GET /api/campaigns - List campaigns
  router.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kampanya oluşturulurken hata oluştu" });
    }
  });

  // POST /api/campaigns/:id/branches - Add branches to campaign
  router.post('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/campaigns/:id/branches', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/franchise-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertFranchiseOnboardingSchema.parse(req.body);
      const [process] = await db.insert(franchiseOnboarding).values(validatedData).returning();

      res.status(201).json(process);
    } catch (error: any) {
      console.error("Error creating onboarding process:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Açılış süreci oluşturulurken hata oluştu" });
    }
  });

  // GET /api/franchise-onboarding/:id/documents - Get onboarding documents
  router.get('/api/franchise-onboarding/:id/documents', isAuthenticated, async (req: any, res) => {
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

  // GET /api/license-renewals - List license renewals
  router.get('/api/license-renewals', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/license-renewals', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertLicenseRenewalSchema.parse(req.body);
      const [renewal] = await db.insert(licenseRenewals).values(validatedData).returning();

      res.status(201).json(renewal);
    } catch (error: any) {
      console.error("Error creating license renewal:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Lisans oluşturulurken hata oluştu" });
    }
  });

  // ===== SITE SETTINGS ROUTES =====
  
  // GET /api/admin/settings - Get all settings (category filter optional)
  // GET /api/admin/settings/:key - Get single setting
  // POST /api/admin/settings - Create new setting
  // PATCH /api/admin/settings/:key - Update setting
  // DELETE /api/admin/settings/:key - Delete setting
  // ===== USER PERMISSIONS ROUTES =====
  
  // GET /api/user/permissions - Get current user's permissions (for frontend permission checks)

  // ===== ROLE PERMISSIONS ROUTES =====
  
  // GET /api/admin/role-permissions - Get all role permissions and modules
  // PUT /api/admin/role-permissions - Bulk update role permissions
  // POST /api/admin/roles - Create new custom role
  // GET /api/muhasebe/access - Check if user has access to accounting module
  router.get('/api/muhasebe/access', isAuthenticated, async (req: any, res) => {
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



  router.patch('/api/overtime-requests/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.get('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { status, priority } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayetleri görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const branchId = isBranchStaff ? user.branchId : undefined;
      const complaints = await storage.getGuestComplaints(branchId, status, priority);
      
      res.json(complaints);
    } catch (error: any) {
      console.error("Error fetching guest complaints:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Şikayetler yüklenirken hata oluştu" });
    }
  });

  router.post('/api/guest-complaints', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating guest complaint:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/guest-complaints/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.post('/api/guest-complaints/:id/resolve', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.get('/api/guest-complaints/stats', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching complaint stats:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  router.get('/api/guest-complaints/heatmap', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching complaint heatmap:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Heatmap yüklenirken hata oluştu" });
    }
  });



  router.get('/api/attendance-penalties/:shiftAttendanceId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching attendance penalties:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Penaltılar yüklenirken hata oluştu" });
    }
  });

  router.post('/api/attendance-penalties', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.get('/api/monthly-attendance-summary/:userId/:periodMonth', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Aylık özet yüklenirken hata oluştu" });
    }
  });

  router.post('/api/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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


  // ========================================
  // OVERTIME REQUESTS - Mesai Talepleri
  // ========================================

  router.get('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching overtime requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  router.post('/api/overtime-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validated = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const request = await storage.createOvertimeRequest(validated);
      res.status(201).json(request);
    } catch (error: any) {
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

  router.patch('/api/overtime-requests/:id/approve', isAuthenticated, async (req: any, res) => {
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
      
      // CRITICAL: Recalculate effectiveWorkMinutes for linked attendance record (retroactive approval)
      // If this overtime request was for a shift that has already been checked out,
      // we need to add the approved overtime to effectiveWorkMinutes
      if (updated && updated.userId && updated.overtimeDate) {
        try {
          // Find the shift attendance record for this user on this date
          const attendanceRecords = await storage.getShiftAttendances({
            userId: updated.userId,
          });
          
          // Filter to find the attendance for the overtime date that is already checked out
          const relevantAttendance = attendanceRecords.find((att: any) => {
            if (att.status !== 'checked_out' || !att.shift) return false;
            const shiftDate = new Date(att.shift.date);
            const overtimeDate = new Date(updated.overtimeDate!);
            return shiftDate.toDateString() === overtimeDate.toDateString();
          });
          
          if (relevantAttendance && relevantAttendance.effectiveWorkMinutes !== null) {
            // Get all approved overtime for this shift now
            const allOvertimeForUser = await storage.getOvertimeRequests({ userId: updated.userId });
            const approvedOvertimeForDate = allOvertimeForUser
              .filter((ot: any) => 
                ot.status === 'approved' && 
                ot.overtimeDate && 
                new Date(ot.overtimeDate).toDateString() === new Date(updated.overtimeDate!).toDateString()
              )
              .reduce((sum: number, ot: any) => sum + (ot.approvedMinutes || 0), 0);
            
            // Calculate planned shift duration
            const shift = relevantAttendance.shift;
            const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
            const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
            const plannedMinutes = Math.max(0, Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000));
            
            // Calculate actual worked minutes from attendance record
            const actualWorkedMinutes = relevantAttendance.totalWorkedMinutes || 0;
            const actualOvertimeMinutes = Math.max(0, actualWorkedMinutes - plannedMinutes);
            
            // Effective overtime is the minimum of actual overtime and approved overtime
            const effectiveOvertimeMinutes = Math.min(actualOvertimeMinutes, approvedOvertimeForDate);
            const newEffectiveWorkMinutes = plannedMinutes + effectiveOvertimeMinutes;
            
            // Update the attendance record
            await storage.updateShiftAttendance(relevantAttendance.id, {
              effectiveWorkMinutes: newEffectiveWorkMinutes,
            });
            
            console.log(`✅ Retroactive overtime approval: Updated attendance ${relevantAttendance.id} effectiveWorkMinutes from ${relevantAttendance.effectiveWorkMinutes} to ${newEffectiveWorkMinutes}`);
          }
        } catch (error: any) {
          console.error("Error updating attendance for retroactive overtime approval:", error);
          // Don't fail the overall request, just log the error
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error approving overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi onaylanırken hata oluştu" });
    }
  });

  router.patch('/api/overtime-requests/:id/reject', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error rejecting overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi reddedilirken hata oluştu" });
    }
  });


  router.post('/api/sla/check-breaches', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/hr/monthly-attendance-summary', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/employee-documents', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching all employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  router.get('/api/employee-documents/:userId', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching employee documents:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  router.post('/api/employee-documents', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.patch('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/employee-documents/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error deleting employee document:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Belge silinirken hata oluştu" });
    }
  });

  router.post('/api/employee-documents/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const docId = parseInt(req.params.id);
      
      // Only HQ can verify documents
      if (!isHQRole(user.role )) {
        return res.status(403).json({ message: "Sadece merkez personel belgeleri onaylayabilir" });
      }
      
      const verified = await storage.verifyEmployeeDocument(docId, user.id);
      res.json(verified);
    } catch (error: any) {
      console.error("Error verifying employee document:", error);
      res.status(500).json({ message: "Belge onaylanırken hata oluştu" });
    }
  });

  // Disciplinary Reports (Disiplin İşlemleri)
  router.get('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching disciplinary reports:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Disiplin kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error fetching disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt yüklenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
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

  router.patch('/api/disciplinary-reports/:id', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error updating disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt güncellenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports/:id/employee-response', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error adding employee response:", error);
      res.status(500).json({ message: "Savunma eklenirken hata oluştu" });
    }
  });

  router.post('/api/disciplinary-reports/:id/resolve', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error resolving disciplinary report:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kayıt sonuçlandırılırken hata oluştu" });
    }
  });


  // System health and backup endpoints
  // ========================================
  // LIVE TRACKING - Real-time Employee Tracking
  // ========================================
  
  router.post('/api/tracking/location', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { latitude, longitude, accuracy } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Konum bilgisi gereklidir" });
      }
      
      const branchId = user.branchId || 0;
      await updateEmployeeLocation(user.id, branchId, latitude, longitude, accuracy);
      
      res.json({ success: true, message: "Konum güncellendi" });
    } catch (error: any) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Konum güncellenirken hata oluştu" });
    }
  });

  router.get('/api/tracking/branch/:branchId', isAuthenticated, async (req: any, res) => {
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
            profileImageUrl: users.profileImageUrl,
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
    } catch (error: any) {
      console.error("Error fetching branch tracking:", error);
      res.status(500).json({ message: "Takip bilgisi alınırken hata oluştu" });
    }
  });

  router.post('/api/tracking/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      removeEmployeeLocation(user.id);
      res.json({ success: true, message: "Çıkış yapıldı" });
    } catch (error: any) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Çıkış yapılırken hata oluştu" });
    }
  });

  // Background job: Daily overdue training reminders
  const startTrainingReminderJob = () => {
    // Check every 6 hours
    setInterval(async () => {
      try {
        const assignments = await storage.getTrainingAssignments();
        // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

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
                } catch (error: any) {
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
                } catch (error: any) {
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
  
  // ========== COMPOSITE CAREER SCORE ENDPOINTS ==========
  
  // GET /api/career/composite-score/:userId - Kompozit kariyer skoru hesapla
  router.get("/api/career/composite-score/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const scores = await storage.calculateCompositeCareerScore(userId);
      res.json(scores);
    } catch (error: any) {
      handleApiError(res, error, "FetchCompositeScore");
    }
  });

  // POST /api/career/update-scores/:userId - Kariyer skorlarını güncelle
  router.post("/api/career/update-scores/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const scores = await storage.calculateCompositeCareerScore(userId);
      const updated = await storage.updateUserCareerScores(userId, scores);
      res.json(updated);
    } catch (error: any) {
      handleApiError(res, error, "UpdateCareerScores");
    }
  });

  // POST /api/career/check-danger-zone/:userId - Tehlike bölgesi kontrolü
  router.post("/api/career/check-danger-zone/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.checkAndProcessDangerZone(userId);
      res.json(result);
    } catch (error: any) {
      handleApiError(res, error, "CheckDangerZone");
    }
  });

  // ========== MANAGER EVALUATION ENDPOINTS ==========

  // GET /api/manager-evaluations - Yönetici değerlendirmelerini listele
  router.get("/api/manager-evaluations", isAuthenticated, async (req: any, res) => {
    try {
      const { employeeId, branchId, month } = req.query;
      const filters: any = {};
      if (employeeId) filters.employeeId = employeeId;
      if (branchId) filters.branchId = Number(branchId);
      if (month) filters.month = month;
      const user = req.user;
      if (user.role === "supervisor" && user.branchId) {
        filters.branchId = user.branchId;
      }
      const evaluations = await storage.getManagerEvaluations(filters);
      res.json(evaluations);
    } catch (error: any) {
      handleApiError(res, error, "FetchManagerEvaluations");
    }
  });

  // POST /api/manager-evaluations - Yeni değerlendirme oluştur
  router.post("/api/manager-evaluations", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertManagerEvaluationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.errors });
      }
      // Suistimal korumasi: 24 saat kurali
      const twentyFourHoursAgo24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentMgrEval] = await db.select({ cnt: count() })
        .from(managerEvaluations)
        .where(and(
          eq(managerEvaluations.evaluatorId, req.user.id),
          eq(managerEvaluations.employeeId, parsed.data.employeeId),
          gte(managerEvaluations.createdAt, twentyFourHoursAgo24)
        ));
      if (recentMgrEval && recentMgrEval.cnt > 0) {
        return res.status(429).json({ message: "Bu personeli son 24 saat içinde zaten değerlendirdiniz. Lütfen yarın tekrar deneyin." });
      }

      // Suistimal korumasi: Ayda max 2 degerlendirme
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [monthlyMgrCount] = await db.select({ cnt: count() })
        .from(managerEvaluations)
        .where(and(
          eq(managerEvaluations.evaluatorId, req.user.id),
          eq(managerEvaluations.employeeId, parsed.data.employeeId),
          eq(managerEvaluations.evaluationMonth, currentMonth)
        ));
      if (monthlyMgrCount && monthlyMgrCount.cnt >= 2) {
        return res.status(429).json({ message: "Bu personel için bu ay maksimum 2 değerlendirme yapabilirsiniz." });
      }

      const data = {
        ...parsed.data,
        evaluatorId: req.user.id,
        branchId: req.body.branchId || req.user.branchId
      };
      const evaluation = await storage.createManagerEvaluation(data);
      const scores = await storage.calculateCompositeCareerScore(data.employeeId);
      await storage.updateUserCareerScores(data.employeeId, scores);
      res.json(evaluation);
    } catch (error: any) {
      handleApiError(res, error, "CreateManagerEvaluation");
    }
  });

  // GET /api/career/score-history/:userId - Skor geçmişi
  router.get("/api/career/score-history/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit) || 12;
      const history = await storage.getCareerScoreHistory(userId, limit);
      res.json(history);
    } catch (error: any) {
      handleApiError(res, error, "FetchScoreHistory");
    }
  });
  // ========================================
  // RAG KNOWLEDGE BASE - Vector Search
  // ========================================
  
  router.post('/api/knowledge-base/search', isAuthenticated, async (req: any, res) => {
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
      handleApiError(res, error, "SearchKnowledgeBase");
    }
  });

  // ========================================
  // BRANCH FEEDBACK SYSTEM
  // ========================================

  // POST /api/feedback - Şubeler geribildirimi gönder
  router.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { branchId, type, subject, message } = req.body;
      const feedback = await storage.createBranchFeedback({
        branchId,
        submittedById: req.user.id,
        type,
        subject,
        message,
      });
      // Event task: notify muhasebe about new feedback
      try {
        const muhasebeUsers = await storage.getUsersByRole('muhasebe');
        const muhasebeIkUsers = await storage.getUsersByRole('muhasebe_ik');
        const targetIds = [...muhasebeUsers, ...muhasebeIkUsers].map(u => u.id);
        if (targetIds.length > 0) {
          const branchInfo = req.body.branchId ? await storage.getBranch(req.body.branchId) : null;
          onFeedbackReceived(
            feedback.id || 0,
            req.body.message || req.body.content || 'Yeni geri bildirim',
            targetIds,
            branchInfo?.name
          );
        }
      } catch (error: any) { console.error("Event task error:", error); }
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/feedback - Muhasebe tüm geribildirimleri görmesi
  router.get("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { status, type, branchId } = req.query;
      const feedbacks = await storage.getBranchFeedbacks({ status, type, branchId: branchId ? parseInt(branchId) : undefined });
      res.json(feedbacks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/feedback/:id - Muhasebe geri cevap ver
  router.patch("/api/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { response, status } = req.body;
      const feedback = await storage.updateBranchFeedback(parseInt(req.params.id), {
        response,
        status: status || "yanıtlandı",
        respondedById: req.user.id,
        respondedAt: new Date(),
      });
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // BADGE SEEDING - Initialize career level badges
  // ========================================
  const seedBadges = async () => {
    try {
      const badgesList = [
        { badgeKey: 'coffee_cherry', titleTr: 'Kahve Kirazı', descriptionTr: 'Stajyer seviyesi - Başlangıcın', category: 'career', points: 50 },
        { badgeKey: 'green_bean', titleTr: 'Yeşil Çekirdek', descriptionTr: 'Bar Buddy seviyesi - Temel beceriler', category: 'career', points: 75 },
        { badgeKey: 'bean_expert', titleTr: 'Çekirdek Uzmanı', descriptionTr: 'Barista seviyesi - Uzman bilgi', category: 'career', points: 100 },
        { badgeKey: 'roast_master', titleTr: 'Kavurma Ustası', descriptionTr: 'Supervisor Buddy seviyesi - Liderlik', category: 'career', points: 125 },
        { badgeKey: 'coffee_pro', titleTr: 'Kahve Profesyoneli', descriptionTr: 'Supervisor seviyesi - Profesyonel', category: 'career', points: 150 },
      ];
      
      for (const badge of badgesList) {
        try {
          const existing = await db.select().from(badges).where(eq(badges.badgeKey, badge.badgeKey));
          if (!existing || existing.length === 0) {
            await db.insert(badges).values(badge);
          }
        } catch (error: any) {
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
  // LOST & FOUND API ROUTES
  // ========================================

  // GET /api/lost-found - Get lost found items (branch-filtered for non-HQ)
  router.get('/api/lost-found', isAuthenticated, async (req: any, res) => {
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
      
      // Batch fetch users and branches to avoid N+1
      const userIds = [...new Set(items.flatMap(i => [i.foundById, i.handoveredById].filter(Boolean) as string[]))];
      const branchIds = [...new Set(items.map(i => i.branchId))];
      const [usersMap, branchesMap] = await Promise.all([
        storage.getUsersByIds(userIds),
        storage.getBranchesByIds(branchIds)
      ]);
      
      const enrichedItems = items.map(item => {
        const foundBy = usersMap.get(item.foundById);
        const branch = branchesMap.get(item.branchId);
        const handoveredBy = item.handoveredById ? usersMap.get(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      });
      
      res.json(enrichedItems);
    } catch (error: any) {
      handleApiError(res, error, "FetchLostFoundItems");
    }
  });

  // GET /api/lost-found/all - HQ can view all branches (requires HQ role)
  router.get('/api/lost-found/all', isAuthenticated, async (req: any, res) => {
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
      
      // Batch fetch users and branches to avoid N+1
      const userIds = [...new Set(items.flatMap(i => [i.foundById, i.handoveredById].filter(Boolean) as string[]))];
      const branchIds = [...new Set(items.map(i => i.branchId))];
      const [usersMap, branchesMap] = await Promise.all([
        storage.getUsersByIds(userIds),
        storage.getBranchesByIds(branchIds)
      ]);
      
      const enrichedItems = items.map(item => {
        const foundBy = usersMap.get(item.foundById);
        const branch = branchesMap.get(item.branchId);
        const handoveredBy = item.handoveredById ? usersMap.get(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      });
      
      res.json(enrichedItems);
    } catch (error: any) {
      handleApiError(res, error, "FetchAllLostFoundItems");
    }
  });

  // GET /api/lost-found/count - Get new items count for notification badge
  router.get('/api/lost-found/count', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const branchId = !isHQRole(user.role) && user.branchId ? user.branchId : undefined;
      const count = await storage.getNewLostFoundItemsCount(branchId);
      res.json({ count });
    } catch (error: any) {
      res.json({ count: 0 });
    }
  });

  // POST /api/lost-found - Create a new lost found item
  router.post('/api/lost-found', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const validation = insertLostFoundItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      let branchId = user.branchId;
      
      if (isHQRole(user.role as UserRoleType)) {
        branchId = req.body.branchId || user.branchId;
        if (!branchId) {
          const allBranches = await storage.getBranches();
          if (allBranches.length > 0) {
            branchId = allBranches[0].id;
          }
        }
      }
      
      if (!branchId) {
        return res.status(400).json({ message: "Şube bilgisi gerekli" });
      }
      
      const item = await storage.createLostFoundItem({
        ...validation.data,
        branchId,
        foundById: user.id,
      });
      
      res.status(201).json(item);
    } catch (error: any) {
      handleApiError(res, error, "CreateLostFoundItem");
    }
  });

  // PATCH /api/lost-found/:id/handover - Mark item as handed over to owner
  router.patch('/api/lost-found/:id/handover', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      handleApiError(res, error, "HandoverLostFoundItem");
    }
  });


  // GET /api/analytics/dashboard - Get analytics dashboard data (legacy)
  router.get('/api/analytics/dashboard', isAuthenticated, async (req: any, res) => {
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

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

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
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Analitik verisi alınamadı" });
    }
  });

  // GET /api/analytics/daily - Get daily analytics with tasks and equipment
  router.get('/api/analytics/daily', isAuthenticated, async (req: any, res) => {
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
      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const completedTasks = taskList.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t: any) => t.status !== 'completed').length;
      const overdueChecklists = taskList.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date(today) && t.status !== 'completed').length;

      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50) : await db.select().from(equipmentFaults).limit(50));
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage)).length;

      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));
      const criticalEquipment = equips.filter((e: any) => e.healthScore && e.healthScore < 50).length;
      
      // Calculate avgHealth with fault penalty: each active fault reduces health by 5%, min 0
      const baseHealth = equips.length > 0 ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'daily', userId: user.id, role: role, branchId });

      res.json({ period: 'daily', pendingTasks, completedTasks, activeFaults, overdueChecklists, criticalEquipment, avgHealth, summary });
    } catch (error: any) {
      console.error("Error fetching daily analytics:", error);
      res.status(500).json({ message: "Günlük analitik alınamadı" });
    }
  });

  // GET /api/analytics/weekly - Get weekly analytics with trends and employee performance
  router.get('/api/analytics/weekly', isAuthenticated, async (req: any, res) => {
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

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50) : await db.select().from(equipmentFaults).limit(50));
      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));

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
          avatar: emp.profileImageUrl,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'weekly', userId: user.id, role: role, branchId });

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
    } catch (error: any) {
      console.error("Error fetching weekly analytics:", error);
      res.status(500).json({ message: "Haftalık analitik alınamadı" });
    }
  });

  // GET /api/analytics/monthly - Get monthly analytics with equipment health and top faulty equipment
  router.get('/api/analytics/monthly', isAuthenticated, async (req: any, res) => {
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

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(100) : await db.select().from(equipmentFaults).limit(100));
      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));

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
          avatar: emp.profileImageUrl,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'monthly', userId: user.id, role: role, branchId });

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
    } catch (error: any) {
      console.error("Error fetching monthly analytics:", error);
      res.status(500).json({ message: "Aylık analitik alınamadı" });
    }
  });

  // GET /api/analytics/comprehensive - Comprehensive dashboard analytics for Özet Rapor
  router.get('/api/analytics/comprehensive', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      let userBranchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        userBranchId = user.branchId;
      } else if (!isHQ) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(today);
      monthStart.setDate(1);

      // Get all branches for HQ
      const allBranches = isHQ ? await db.select().from(branches).where(eq(branches.isActive, true)).limit(50) : [];
      
      // Get all tasks - conditional query based on user role
      const taskList = userBranchId 
        ? await db.select().from(tasks).where(eq(tasks.branchId, userBranchId)).limit(500)
        : await db.select().from(tasks).limit(500);
      
      // Get all faults - conditional query based on user role
      const faults = userBranchId
        ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, userBranchId)).limit(200)
        : await db.select().from(equipmentFaults).limit(200);
      
      // Get all checklists - conditional query based on user role
      const checklistList = userBranchId
        ? await db.select().from(checklists).limit(500)
        : await db.select().from(checklists).limit(500);

      // Daily metrics
      const dailyCompleted = taskList.filter((t: any) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === todayStr
      ).length;
      const dailyPending = taskList.filter((t: any) => t.status !== 'completed').length;
      
      // Weekly metrics
      const weeklyCompleted = taskList.filter((t: any) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekStart
      ).length;
      
      // Monthly metrics
      const monthlyCompleted = taskList.filter((t: any) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= monthStart
      ).length;

      // Checklist metrics
      const checklistTotal = checklistList.length;
      const checklistCompleted = checklistList.filter((c: any) => c.status === 'completed').length;
      const checklistOverdue = checklistList.filter((c: any) => 
        c.status !== 'completed' && c.dueTime && new Date(todayStr + 'T' + c.dueTime) < today
      ).length;
      const checklistRate = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 100;


      // Create lookups for branch and equipment names
      const branchLookup: Record<number, string> = {};
      allBranches.forEach((b: any) => { branchLookup[b.id] = b.name; });
      
      // Get equipment list for device names
      const equipmentList = await db.select({ id: equipment.id, name: equipment.name }).from(equipment).limit(200);
      const equipmentLookup: Record<number, string> = {};
      equipmentList.forEach((e: any) => { equipmentLookup[e.id] = e.name; });
      // Critical issues
      const urgentFaults = faults.filter((f: any) => 
        f.priority === 'urgent' && !['resolved', 'cancelled'].includes(f.stage)
      );
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage));
      const slaBreaches = faults.filter((f: any) => {
        if (['resolved', 'cancelled'].includes(f.stage)) return false;
        const createdAt = new Date(f.createdAt);
        const hoursElapsed = (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
        return hoursElapsed > slaHours;
      });

      // Branch status for HQ (problemli şubeler)
      let branchStatus: any[] = [];
      if (isHQ && allBranches.length > 0) {
        const branchTaskMap: Record<number, { total: number, completed: number, faults: number, name: string }> = {};
        
        allBranches.forEach((b: any) => {
          branchTaskMap[b.id] = { total: 0, completed: 0, pending: 0, faults: 0, name: b.name };
        });

        taskList.forEach((t: any) => {
          if (t.branchId && branchTaskMap[t.branchId]) {
            branchTaskMap[t.branchId].total++;
            if (t.status === 'completed') branchTaskMap[t.branchId].completed++;
            else branchTaskMap[t.branchId].pending++;
          }
        });

        faults.forEach((f: any) => {
          if (f.branchId && branchTaskMap[f.branchId] && !['resolved', 'cancelled'].includes(f.stage)) {
            branchTaskMap[f.branchId].faults++;
          }
        });

        branchStatus = Object.entries(branchTaskMap)
          .map(([id, data]) => ({
            id: Number(id),
            name: data.name,
            completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 100,
            activeFaults: data.faults,
            pendingTasks: data.pending,
            status: data.faults > 2 ? 'critical' : data.faults > 0 ? 'warning' : 'ok'
          }))
          .sort((a, b) => b.activeFaults - a.activeFaults);
      }

      // Employee productivity (top/bottom performers)
      const employees = userBranchId 
        ? await db.select().from(users).where(eq(users.branchId, userBranchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees
        .filter((emp: any) => !['admin', 'owner', 'coach', 'field_coordinator'].includes(emp.role))
        .map((emp: any) => {
          const empTasks = taskList.filter((t: any) => t.assignedToId === emp.id);
          const empCompleted = empTasks.filter((t: any) => t.status === 'completed').length;
          const completionRate = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;
          const lastActivity = emp.updatedAt || emp.createdAt;
          const daysSinceActivity = lastActivity ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          
          return { 
            id: emp.id, 
            name: ((emp.firstName || '') + ' ' + (emp.lastName || '')).trim() || emp.username,
            branchId: emp.branchId,
            completionRate,
            tasksCompleted: empCompleted,
            totalTasks: empTasks.length,
            daysSinceActivity,
            isInactive: daysSinceActivity > 3
          };
        });

      const sortedPerf = performanceData.sort((a, b) => b.completionRate - a.completionRate);
      const topPerformers = sortedPerf.filter(p => p.totalTasks > 0).slice(0, 5);
      const inactiveUsers = performanceData.filter(p => p.isInactive).slice(0, 5);

      res.json({
        taskMetrics: {
          daily: { completed: dailyCompleted, pending: dailyPending },
          weekly: { completed: weeklyCompleted },
          monthly: { completed: monthlyCompleted }
        },
        checklistMetrics: {
          total: checklistTotal,
          completed: checklistCompleted,
          overdue: checklistOverdue,
          completionRate: checklistRate
        },
        criticalIssues: {
          urgentFaults: urgentFaults.map((f: any) => ({ id: f.id, title: f.description, branchId: f.branchId, branchName: branchLookup[f.branchId] || "Bilinmiyor", equipmentName: equipmentLookup[f.equipmentId] || "", priority: f.priority })),
          slaBreaches: slaBreaches.map((f: any) => {
            const createdAt = new Date(f.createdAt);
            const hoursElapsed = (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
            return { 
              id: f.id, 
              title: f.description, 
              branchId: f.branchId, 
              branchName: branchLookup[f.branchId] || "Bilinmiyor", 
              equipmentName: equipmentLookup[f.equipmentId] || "", 
              hoursOverdue: Math.round(hoursElapsed - slaHours)
            };
          }),
          totalActiveFaults: activeFaults.length
        },
        branchStatus: branchStatus.slice(0, 10),
        personnel: {
          topPerformers,
          inactiveUsers
        },
        aiSummary: await (async () => {
          try {
            // Generate role-based AI summary
            const summaryParts: string[] = [];
            if (isHQ) {
              const criticalBranches = branchStatus.filter(b => b.status === 'critical').length;
              const warningBranches = branchStatus.filter(b => b.status === 'warning').length;
              if (criticalBranches > 0) {
                summaryParts.push(`${criticalBranches} şube kritik durumda.`);
              }
              if (urgentFaults.length > 0) {
                summaryParts.push(`${urgentFaults.length} acil arıza müdahale bekliyor.`);
              }
              if (slaBreaches.length > 0) {
                summaryParts.push(`${slaBreaches.length} SLA ihlali mevcut.`);
              }
              if (dailyPending > 10) {
                summaryParts.push(`Bugün ${dailyPending} bekleyen görev var.`);
              }
              if (checklistOverdue > 0) {
                summaryParts.push(`${checklistOverdue} checklist gecikmiş.`);
              }
              if (summaryParts.length === 0) {
                summaryParts.push("Genel durum iyi görünüyor. Kritik sorun bulunmuyor.");
              }
            } else {
              summaryParts.push(`Bugün ${dailyCompleted} görev tamamlandı, ${dailyPending} bekliyor.`);
              if (checklistOverdue > 0) {
                summaryParts.push(`${checklistOverdue} checklist gecikmiş.`);
              }
            }
            return summaryParts.join(" ");
          } catch (error: any) {
            return null;
          }
        })(),
        dateRange: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] }
      });
    } catch (error: any) {
      console.error("Error fetching comprehensive analytics:", error);
      res.status(500).json({ message: "Kapsamlı analitik alınamadı" });
    }
  });

  // GET /api/activities/recent - Get recent activities for dashboard
  router.get('/api/activities/recent', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const userBranchId = user.branchId;

      const activities: any[] = [];

      // Get recent tasks - simple query
      const recentTasks = await db.select().from(tasks)
        .orderBy(desc(tasks.updatedAt))
        .limit(30);

      const filteredTasks = (userBranchId && !isHQ)
        ? recentTasks.filter((t: any) => t.branchId === userBranchId)
        : recentTasks;

      for (const task of filteredTasks.slice(0, 15)) {
        if (task.status === 'completed' && task.completedAt) {
          activities.push({
            id: task.id,
            type: 'task_completed',
            title: task.description?.slice(0, 50) || 'Görev tamamlandı',
            timestamp: task.completedAt,
            entityId: task.id,
            entityType: 'task'
          });
        }
      }

      // Get recent faults - simple query
      const recentFaults = await db.select().from(equipmentFaults)
        .orderBy(desc(equipmentFaults.updatedAt))
        .limit(30);

      const filteredFaults = (userBranchId && !isHQ)
        ? recentFaults.filter((f: any) => f.branchId === userBranchId)
        : recentFaults;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const fault of filteredFaults.slice(0, 15)) {
        if (fault.stage === 'resolved') {
          activities.push({
            id: fault.id + 10000,
            type: 'fault_resolved',
            title: fault.description?.slice(0, 50) || 'Arıza çözüldü',
            timestamp: fault.updatedAt || fault.createdAt,
            entityId: fault.id,
            entityType: 'fault'
          });
        } else if (new Date(fault.createdAt) > oneDayAgo) {
          activities.push({
            id: fault.id + 20000,
            type: 'fault_reported',
            title: fault.description?.slice(0, 50) || 'Yeni arıza bildirimi',
            timestamp: fault.createdAt,
            entityId: fault.id,
            entityType: 'fault'
          });
        }
      }

      // Sort by timestamp and return
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

      res.json(sortedActivities);
    } catch (error: any) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Son aktiviteler alınamadı" });
    }
  });
  // GET /api/branch/score - Branch daily scorecard
  router.get('/api/branch/score', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }

      const branchId = user.branchId;
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get tasks
      const taskList = await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100);
      const tasksCompleted = taskList.filter((t: any) => t.status === 'completed').length;
      const tasksPending = taskList.filter((t: any) => t.status !== 'completed').length;

      // Get checklists
      const checklistList = await db.select().from(checklists).limit(100);
      const checklistCompleted = checklistList.filter((c: any) => c.status === 'completed').length;
      const checklistRate = checklistList.length > 0 ? Math.round((checklistCompleted / checklistList.length) * 100) : 100;

      // Get faults
      const faults = await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50);
      const activeFaults = faults.filter((f: any) => !['resolved', 'cancelled'].includes(f.stage)).length;

      // Calculate on-time rate
      const onTimeCompleted = taskList.filter((t: any) => 
        t.status === 'completed' && t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)
      ).length;
      const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeCompleted / tasksCompleted) * 100) : 100;

      // Calculate score: 40% task completion + 30% checklist + 20% no faults + 10% on-time
      const taskScore = (tasksCompleted / Math.max(taskList.length, 1)) * 40;
      const checklistScore = (checklistRate / 100) * 30;
      const faultScore = Math.max(0, (1 - (activeFaults * 0.1))) * 20;
      const onTimeScore = (onTimeRate / 100) * 10;
      
      const score = Math.round(taskScore + checklistScore + faultScore + onTimeScore);
      const previousScore = Math.max(0, Math.min(100, score + (Math.random() > 0.5 ? -5 : 5))); // Mock previous

      res.json({
        score,
        previousScore,
        tasksCompleted,
        tasksPending,
        checklistRate,
        activeFaults,
        onTimeRate
      });
    } catch (error: any) {
      console.error("Error fetching branch score:", error);
      res.status(500).json({ message: "Şube skoru alınamadı" });
    }
  });

  // GET /api/branch/personnel-status - Personnel status for branch or all branches for HQ
  router.get('/api/branch/personnel-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      const isHQ = isHQRole(userRole);

      let employees;
      let branchIdMap: Map<number, string> = new Map(); // For HQ: map branchId to branchName

      if (user.branchId) {
        // Branch user: get personnel from their branch
        const branchId = user.branchId;
        employees = await db.select().from(users)
          .where(and(
            eq(users.branchId, branchId),
            sql`${users.role} NOT IN ('admin', 'owner')`
          ))
          .limit(50);
      } else if (isHQ) {
        // HQ/admin user: get personnel from all branches (limited to 50 total)
        employees = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          role: users.role,
          branchId: users.branchId,
          profileImageUrl: users.profileImageUrl,
        }).from(users)
          .where(sql`${users.role} NOT IN ('admin', 'owner')`)
          .limit(50);

        // Build branch name map for HQ users
        const branchList = await db.select({
          id: branches.id,
          name: branches.name,
        }).from(branches);
        
        branchList.forEach(b => branchIdMap.set(b.id, b.name));
      } else {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const personnelStatus = employees.map((emp: any) => {
        // Mock status based on some logic
        const statuses: Array<'active' | 'on_shift' | 'late' | 'absent' | 'on_leave'> = ['active', 'on_shift', 'late', 'absent', 'on_leave'];
        const randomStatus = statuses[Math.floor(Math.random() * 5)];
        
        const result: any = {
          id: emp.id,
          name: ((emp.firstName || '') + ' ' + (emp.lastName || '')).trim() || emp.username,
          avatar: emp.profileImageUrl,
          role: emp.role,
          status: randomStatus,
          checkInTime: randomStatus === 'active' || randomStatus === 'on_shift' ? '08:' + Math.floor(Math.random() * 60).toString().padStart(2, '0') : undefined
        };

        // Include branch name for HQ users
        if (isHQ && emp.branchId && branchIdMap.has(emp.branchId)) {
          result.branchName = branchIdMap.get(emp.branchId);
        }

        return result;
      });

      res.json(personnelStatus);
    } catch (error: any) {
      console.error("Error fetching personnel status:", error);
      res.status(500).json({ message: "Personel durumu alınamadı" });
    }
  });

  // GET /api/alerts/critical - Critical alerts for dashboard (simplified)
  router.get('/api/alerts/critical', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const userBranchId = user.branchId;

      const alerts: any[] = [];

      // Get all active faults - simple query without complex conditions
      const allFaults = await db.select().from(equipmentFaults).limit(100);

      // Filter in JS
      const activeFaults = allFaults.filter((f: any) => 
        ['open', 'assigned', 'in_progress', 'pending_parts', 'escalated'].includes(f.stage)
      );

      const branchFiltered = (userBranchId && !isHQ)
        ? activeFaults.filter((f: any) => f.branchId === userBranchId)
        : activeFaults;

      // Get urgent faults
      const urgentFaults = branchFiltered.filter((f: any) => f.priority === 'urgent');
      
      urgentFaults.slice(0, 10).forEach((f: any) => {
        alerts.push({
          id: f.id,
          type: 'urgent_fault',
          severity: 'critical',
          title: f.description?.slice(0, 60) || 'Acil arıza bildirimi',
          entityId: f.id,
          entityType: 'fault',
          createdAt: f.createdAt
        });
      });

      // Check SLA breaches
      const now = new Date();
      branchFiltered.slice(0, 20).forEach((f: any) => {
        const createdAt = new Date(f.createdAt);
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
        
        if (hoursElapsed > slaHours) {
          alerts.push({
            id: f.id + 10000,
            type: 'sla_breach',
            severity: 'high',
            title: 'SLA süresi aşıldı: ' + (f.description?.slice(0, 40) || 'Arıza'),
            entityId: f.id,
            entityType: 'fault',
            createdAt: f.createdAt
          });
        }
      });

      // Sort and return
      const sortedAlerts = alerts
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, warning: 2 };
          return (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
                 (severityOrder[b.severity as keyof typeof severityOrder] || 2);
        })
        .slice(0, 10);

      res.json(sortedAlerts);
    } catch (error: any) {
      console.error("Error fetching critical alerts:", error);
      res.status(500).json({ message: "Kritik uyarılar alınamadı" });
    }
  });

  // ==========================================
  // GLOBAL SEARCH API
  // ==========================================
  
  // GET /api/search - Global search across users, recipes, tasks, branches, equipment, modules
  router.get('/api/search', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const query = req.query.q as string;
      
      // Validate query
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Arama sorgusu en az 2 karakter olmalı" });
      }
      
      const isHQ = isHQRole(user.role);
      const userBranchId = user.branchId;
      const userRole = user.role;
      
      // Get user's accessible modules based on role permissions
      const accessibleModules = await getRoleAccessibleModules(userRole);
      const hasAllAccess = accessibleModules.has('all');
      
      // Search modules (mega-modules and sub-modules) with permission filtering
      const searchPattern = query.trim().toLocaleLowerCase('tr-TR');
      
      // Get mega-module configs
      const megaConfigs = await db.select().from(megaModuleConfig).where(eq(megaModuleConfig.isActive, true));
      
      // Get sub-module items
      const subModules = await db.select().from(megaModuleItems).where(eq(megaModuleItems.isActive, true));
      
      // Filter and search modules
      const moduleResults: Array<{
        id: string;
        type: 'mega' | 'sub';
        name: string;
        nameTr: string;
        icon: string;
        path: string;
        megaModuleId?: string;
        megaModuleName?: string;
      }> = [];
      
      // Search mega-modules
      for (const mega of megaConfigs) {
        if (mega.megaModuleName.toLocaleLowerCase('tr-TR').includes(searchPattern) ||
            mega.megaModuleNameTr.toLocaleLowerCase('tr-TR').includes(searchPattern)) {
          // Check if user has access to at least one sub-module in this mega-module
          const megaSubModules = subModules.filter(s => s.megaModuleId === mega.megaModuleId);
          const hasAccessToMega = hasAllAccess || megaSubModules.some(sub => accessibleModules.has(sub.subModuleId));
          
          if (hasAccessToMega) {
            moduleResults.push({
              id: mega.megaModuleId,
              type: 'mega',
              name: mega.megaModuleName,
              nameTr: mega.megaModuleNameTr,
              icon: mega.icon,
              path: `/modul/${mega.megaModuleId}`,
            });
          }
        }
      }
      
      // Search sub-modules with permission check
      for (const sub of subModules) {
        if (sub.subModuleName.toLocaleLowerCase('tr-TR').includes(searchPattern) ||
            sub.subModuleNameTr.toLocaleLowerCase('tr-TR').includes(searchPattern)) {
          // Check if user has access to this module
          if (hasAllAccess || accessibleModules.has(sub.subModuleId)) {
            const parentMega = megaConfigs.find(m => m.megaModuleId === sub.megaModuleId);
            moduleResults.push({
              id: sub.subModuleId,
              type: 'sub',
              name: sub.subModuleName,
              nameTr: sub.subModuleNameTr,
              icon: sub.icon || parentMega?.icon || 'FileText',
              path: sub.subModulePath,
              megaModuleId: sub.megaModuleId,
              megaModuleName: parentMega?.megaModuleNameTr || sub.megaModuleId,
            });
          }
        }
      }
      
      // Check if user can see each entity type
      const canSeeUsers = hasAllAccess || accessibleModules.has('ik') || accessibleModules.has('personel');
      const canSeeRecipes = hasAllAccess || accessibleModules.has('tarifler') || accessibleModules.has('akademi');
      const canSeeTasks = hasAllAccess || accessibleModules.has('gorevler');
      const canSeeBranches = hasAllAccess || accessibleModules.has('subeler');
      const canSeeEquipment = hasAllAccess || accessibleModules.has('ekipman');
      
      // Get permission-filtered search results
      const results = await storage.searchEntitiesWithPermissions(
        query.trim(),
        userBranchId,
        isHQ,
        {
          canSeeUsers,
          canSeeRecipes,
          canSeeTasks,
          canSeeBranches,
          canSeeEquipment,
        },
        5 // max per category
      );
      
      // Add modules to results
      res.json({
        ...results,
        modules: moduleResults.slice(0, 10), // limit to 10 modules
      });
    } catch (error: any) {
      console.error("Global search error:", error);
      res.status(500).json({ message: "Arama sırasında hata oluştu" });
    }
  });



  // =============================================
  // HQ SUPPORT TICKET ROUTES
  // =============================================
  
  // GET /api/hq-support/tickets - Get all tickets (HQ sees assigned categories, branch sees own)
  router.get('/api/hq-support/tickets', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/hq-support/tickets', isAuthenticated, async (req: any, res) => {
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
  
  // GET /api/hq-support/tickets/:id - Get single ticket with branch/user info
  router.get('/api/hq-support/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
        return res.status(403).json({ message: "Bu talebe erişim yetkiniz yok" });
      }
      
      const allBranches = await storage.getBranches();
      const branch = allBranches.find(b => b.id === ticket.branchId);
      const allUsers = await db.select().from(users);
      const createdBy = allUsers.find(u => u.id === ticket.createdById);
      
      res.json({
        ...ticket,
        branch: branch || { name: 'Unknown' },
        createdBy: createdBy ? { firstName: createdBy.firstName, lastName: createdBy.lastName } : { firstName: 'Unknown', lastName: '' },
        messageCount: 0,
      });
    } catch (error: any) {
      console.error("Get ticket details error:", error);
      res.status(500).json({ message: "Talep detayları alınamadı" });
    }
  });

  // GET /api/hq-support/tickets/:id/messages - Get messages for a ticket
  router.get('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
        return res.status(403).json({ message: "Bu talebe erişim yetkiniz yok" });
      }
      
      const messagesList = await storage.getHQSupportMessages(ticketId);
      const allUsers = await db.select().from(users);
      
      const enrichedMessages = messagesList.map((msg: any) => {
        const sender = allUsers.find((u: any) => u.id === msg.senderId);
        return {
          ...msg,
          sender: sender ? { firstName: sender.firstName, lastName: sender.lastName, profileImageUrl: sender.profileImageUrl } : null,
        };
      });
      
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Mesajlar alınamadı" });
    }
  });
  
  // PATCH /api/hq-support/tickets/:id - Update ticket (close with rating by creator)
  router.patch('/api/hq-support/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const ticketId = parseInt(req.params.id);
      
      const ticket = await storage.getHQSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Talep bulunamadı" });
      }
      
      const updates = req.body;
      
      if (updates.status === 'kapatildi') {
        if (ticket.createdById !== user.id && user.role !== 'admin') {
          return res.status(403).json({ message: "Sadece talebi olusturan kisi kapatabilir" });
        }
        updates.closedAt = new Date();
        updates.closedBy = user.id;
      } else {
        if (!isHQRole(user.role) && user.role !== 'admin' && ticket.createdById !== user.id) {
          return res.status(403).json({ message: "Talep güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateHQSupportTicket(ticketId, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update ticket error:", error);
      res.status(500).json({ message: "Talep güncellenemedi" });
    }
  });
  
  // POST /api/hq-support/tickets/:id/messages - Add message to ticket
  router.post('/api/hq-support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
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
  // POST /api/admin/support-assignments - Create category assignment
  // DELETE /api/admin/support-assignments/:id - Delete category assignment
  // =============================================
  // ADMIN EMAIL SETTINGS
  // =============================================
  
  // =============================================
  // ADMIN SERVICE EMAIL SETTINGS (Arıza/Bakım için)
  // =============================================
  
  // =============================================
  // SERVICE REQUEST EMAIL - Servise İlet
  // =============================================
  
  router.post('/api/service-request/send', isAuthenticated, async (req: any, res) => {
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
      handleApiError(res, error, "SendServiceRequestEmail");
    }
  });

  // =============================================
  // ADMIN BANNERS
  // =============================================
  
  // GET active banners for dashboard
  router.get('/api/banners/active', isAuthenticated, async (req: any, res) => {
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


  // GET /api/job-applications - List all applications
  router.get('/api/job-applications', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/job-applications', isAuthenticated, async (req: any, res) => {
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
        } catch (error: any) {
          console.error(`Failed to send thank you email to ${application.email}:`, error);
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
  router.get('/api/job-applications/:id', isAuthenticated, async (req: any, res) => {
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
  router.patch('/api/job-applications/:id', isAuthenticated, async (req: any, res) => {
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

  // ========================================
  // Standart Mülakat Soruları (HQ yönetimli)
  // ========================================

  // GET /api/interview-questions - Get all interview questions
  router.get('/api/interview-questions', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/interview-questions', isAuthenticated, async (req: any, res) => {
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
  router.patch('/api/interview-questions/:id', isAuthenticated, async (req: any, res) => {
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
  router.delete('/api/interview-questions/:id', isAuthenticated, async (req: any, res) => {
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

  // GET /api/employee-terminations - Get termination records
  router.get('/api/employee-terminations', isAuthenticated, async (req: any, res) => {
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
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
        .from(employeeTerminations)
        .leftJoin(users, eq(employeeTerminations.userId, users.id))
        .orderBy(desc(employeeTerminations.terminationDate));
      const enriched = result.map(r => ({
        ...r,
        userName: ((r.userFirstName || '') + ' ' + (r.userLastName || '')).trim() || null,
      }));
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching terminations:", error);
      res.status(500).json({ message: "Ayrılış kayıtları yüklenirken hata oluştu" });
    }
  });

  // POST /api/employee-terminations - Create termination record (enhanced with notifications)
  router.post('/api/employee-terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType) && !['supervisor'].includes(user.role)) {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      const { userId, terminationType, terminationDate, terminationReason, terminationSubReason,
              lastWorkDay, severancePayment, otherPayments, totalPayment, returnedItems,
              exitInterview, performanceRating, recommendation, documents, notes,
              noticeGiven, finalSalary } = req.body;

      if (!userId || !terminationType || !terminationDate) {
        return res.status(400).json({ message: "userId, terminationType ve terminationDate zorunludur" });
      }

      const employee = await storage.getUser(userId);
      if (!employee) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      const hireDate = employee.startDate ? new Date(employee.startDate) : new Date(employee.createdAt || new Date());
      const termDate = new Date(terminationDate);
      const yearsOfService = (termDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      let noticePeriodDays = 14;
      if (yearsOfService >= 3) noticePeriodDays = 56;
      else if (yearsOfService >= 1.5) noticePeriodDays = 42;
      else if (yearsOfService >= 0.5) noticePeriodDays = 28;

      const noticeEndDate = new Date(termDate);
      noticeEndDate.setDate(noticeEndDate.getDate() + noticePeriodDays);

      const severanceEligible = ['termination', 'retirement', 'mutual_agreement'].includes(terminationType) && yearsOfService >= 1;

      const result = await db.insert(employeeTerminations)
        .values({
          userId,
          terminationType,
          terminationDate,
          terminationReason,
          terminationSubReason: terminationSubReason || null,
          lastWorkDay: lastWorkDay || null,
          noticeGiven: noticeGiven || noticePeriodDays,
          finalSalary: finalSalary || null,
          severancePayment: severancePayment || null,
          otherPayments: otherPayments || null,
          totalPayment: totalPayment || null,
          returnedItems: returnedItems || null,
          exitInterview: exitInterview || null,
          performanceRating: performanceRating || null,
          recommendation: recommendation || null,
          documents: documents || null,
          notes: notes || null,
          processedById: user.id,
          noticePeriodDays,
          noticeEndDate: noticeEndDate.toISOString().split('T')[0],
          severanceEligible,
        })
        .returning();

      const empName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
      const typeLabels: Record<string, string> = {
        resignation: 'İstifa', termination: 'Fesih/İşten Çıkarma',
        retirement: 'Emeklilik', mutual_agreement: 'Karşılıklı Anlaşma', contract_end: 'Sözleşme Sonu'
      };
      const typeLabel = typeLabels[terminationType] || terminationType;

      const notifTitle = `Personel Ayrılışı: ${empName}`;
      let notifMessage = `${empName} - ${typeLabel} (${terminationDate})`;
      if (severanceEligible) {
        notifMessage += ` | Kıdem tazminatı hakkı var (${Math.floor(yearsOfService)} yıl)`;
      }
      notifMessage += ` | İhbar süresi: ${noticePeriodDays} gün (${noticeEndDate.toISOString().split('T')[0]})`;

      const hqUsers = await db.select({ id: users.id, role: users.role })
        .from(users)
        .where(sql`${users.role} IN ('admin', 'muhasebe', 'muhasebe_ik') AND ${users.isActive} = true`);
      
      for (const hqUser of hqUsers) {
        try {
          await storage.createNotification({
            userId: hqUser.id,
            type: 'employee_departure',
            title: notifTitle,
            message: notifMessage,
            link: `/personel-detay/${userId}`,
            branchId: employee.branchId,
          });
        } catch (error: any) { console.error("Termination notification error:", error); }
      }

      if (employee.branchId) {
        const branchSupervisors = await db.select({ id: users.id })
          .from(users)
          .where(sql`${users.branchId} = ${employee.branchId} AND ${users.role} IN ('supervisor', 'supervisor_buddy') AND ${users.isActive} = true`);
        
        for (const sup of branchSupervisors) {
          try {
            await storage.createNotification({
              userId: sup.id,
              type: 'employee_departure',
              title: notifTitle,
              message: notifMessage,
              link: `/personel-detay/${userId}`,
              branchId: employee.branchId,
            });
          } catch (error: any) { console.error("Supervisor termination notification error:", error); }
        }
      }

      try {
        const { sendNotificationEmail } = await import('./email');
        for (const hqUser of hqUsers) {
          const hqUserData = await storage.getUser(hqUser.id);
          if (hqUserData?.email) {
            sendNotificationEmail(
              hqUserData.email,
              `Personel Ayrılışı - ${empName}`,
              `${notifMessage}\n\nİşlem yapan: ${user.fullName || user.firstName}\n\nDetaylar için sisteme giriş yapın.`,
              'warning'
            ).catch(err => console.error("Termination email error:", err));
          }
        }
      } catch (error: any) { console.error("Email notification error:", error); }

      res.status(201).json(result[0]);
    } catch (error: any) {
      handleApiError(res, error, "CreateTermination");
    }
  });

  // PATCH /api/employee-terminations/:id - Update termination record
  router.patch('/api/employee-terminations/:id', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/hr/recruitment-stats', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/employee-leaves', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/public-holidays', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/public-holidays', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/seed-attendance-test', isAuthenticated, async (req: any, res) => {
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
      handleApiError(res, error, "SeedTestData");
    }
  });

  // ==========================================
  // SİSTEM SAĞLIK KONTROLÜ API'SI
  // ==========================================

  // GET /api/system-health-check - Tüm dashboard API'larını kontrol et
  // Detailed Reports API Endpoints
  router.get('/api/detailed-reports', isAuthenticated, async (req: any, res) => {
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

  router.post('/api/detailed-reports', isAuthenticated, async (req: any, res) => {
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

  router.get('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
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

  router.patch('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
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

  router.delete('/api/detailed-reports/:id', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/branch-comparisons/:reportId', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/trend-metrics', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/ai-summary-report', isAuthenticated, async (req: any, res) => {
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



  // ============================================
  // EMPLOYEE BENEFITS - Çalışan Yan Haklar API
  // ============================================

  // GET /api/employee-benefits - Tüm yan hakları listele
  router.get('/api/employee-benefits', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/employee-benefits/:userId', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/employee-benefits', isAuthenticated, async (req: any, res) => {
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
  router.patch('/api/employee-benefits/:id', isAuthenticated, async (req: any, res) => {
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

  // PUT /api/users/:id/compensation - Personel maaş ve yan haklarını güncelle
  router.put('/api/users/:id/compensation', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const { netSalary, mealAllowance, transportAllowance, bonusBase, bonusType, bonusPercentage } = req.body;

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
      const safeBonusType = bonusType || null;
      const safeBonusPercentage = bonusPercentage !== undefined ? bonusPercentage : null;

      const result = await db.execute(sql`
        UPDATE users 
        SET 
          net_salary = COALESCE(${safeNetSalary}, net_salary),
          meal_allowance = COALESCE(${safeMealAllowance}, meal_allowance),
          transport_allowance = COALESCE(${safeTransportAllowance}, transport_allowance),
          bonus_base = COALESCE(${safeBonusBase}, bonus_base),
          bonus_type = COALESCE(${safeBonusType}, bonus_type),
          bonus_percentage = COALESCE(${safeBonusPercentage}, bonus_percentage),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, first_name, last_name, net_salary, meal_allowance, transport_allowance, bonus_base, bonus_type, bonus_percentage
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
  router.patch('/api/users/:id/salary', isAuthenticated, async (req: any, res) => {
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
  // GRANULAR PERMISSION MANAGEMENT API
  // ========================================

  // GET /api/admin/permission-actions - Tüm aksiyonları modüle göre gruplu getir
  // GET /api/admin/role-grants/:role - Rol için tüm izinleri getir
  // POST /api/admin/role-grants - İzin ekle veya güncelle
  // DELETE /api/admin/role-grants/:role/:actionId - İzin sil
  // GET /api/user/permissions - Mevcut kullanıcının tüm izinlerini getir
  router.get('/api/user/permissions', isAuthenticated, async (req: any, res) => {
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
  router.get('/api/announcements', isAuthenticated, async (req: any, res) => {
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
        const targetRolesLower = ann.targetRoles?.map(role => role.toLocaleLowerCase('tr-TR')) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLocaleLowerCase('tr-TR');
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
  router.get('/api/announcements/banners', isAuthenticated, async (req: any, res) => {
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
        const targetRolesLower = ann.targetRoles?.map(r => r.toLocaleLowerCase('tr-TR')) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLocaleLowerCase('tr-TR');
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
  router.get('/api/announcements/unread-count', isAuthenticated, async (req: any, res) => {
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
        const targetRolesLower = ann.targetRoles?.map(role => role.toLocaleLowerCase('tr-TR')) || [];
        const isTargetAll = targetRolesLower.includes("all");
        if (hasNoTargeting || isTargetAll) return true;
        // Kullanıcının rolü hedeflenmiş mi? (case-insensitive)
        const userRoleLower = user.role?.toLocaleLowerCase('tr-TR');
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
  router.get('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
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
  router.post('/api/announcements/:id/read', isAuthenticated, async (req: any, res) => {
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

  // GET /api/announcements/:id/read-status - Duyuru okuma durumu
  router.get('/api/announcements/:id/read-status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'coach', 'destek'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const announcement = await db.select()
        .from(announcements)
        .where(eq(announcements.id, parseInt(id)))
        .limit(1);

      if (announcement.length === 0) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }

      const readers = await db.select({
        userId: announcementReadStatus.userId,
        username: users.username,
        readAt: announcementReadStatus.readAt
      })
        .from(announcementReadStatus)
        .innerJoin(users, eq(announcementReadStatus.userId, users.id))
        .where(eq(announcementReadStatus.announcementId, parseInt(id)));

      const totalUsers = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));

      res.json({
        readCount: readers.length,
        totalTargetUsers: totalUsers[0]?.count || 0,
        readers: readers.map(r => ({
          userId: r.userId,
          username: r.username,
          readAt: r.readAt
        }))
      });
    } catch (error: any) {
      console.error("Get read status error:", error);
      res.status(500).json({ message: "Okuma durumu alınamadı" });
    }
  });

  // ========================================
  // ADMIN DUYURU API
  // ========================================

  // GET /api/admin/announcements - Tüm duyuruları getir (admin)
  // POST /api/admin/announcements - Yeni duyuru oluştur
  // POST /api/announcements/from-banner - Banner editörden direkt duyuru oluştur
  router.post('/api/announcements/from-banner', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'supervisor', 'coach'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const { imageData, title, message, category, priority, showOnDashboard, targetRoles, targetBranches, validFrom, expiresAt } = req.body;
      
      if (!title || !imageData) {
        return res.status(400).json({ message: "Başlık ve banner görseli gerekli" });
      }

      // Save banner image to object storage or use base64 as fallback
      let bannerImageUrl = null;
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (bucketId) {
        try {
          const { Client } = await import('@replit/object-storage');
          const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });
          
          // Convert base64 to buffer
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const timestamp = Date.now();
          const filename = `public/banners/banner_${timestamp}.png`;
          
          // Upload to object storage
          const uploadResult = await client.uploadFromBytes(filename, buffer);
          if (!uploadResult.ok) {
            console.error("Banner upload failed:", uploadResult.error);
            bannerImageUrl = imageData;
          } else {
            console.log("Banner uploaded successfully to:", filename);
            bannerImageUrl = `https://objectstorage.us-west-2.replit.dev/${bucketId}/${filename}`;
          }
        } catch (error: any) {
          console.error("Banner upload error:", error);
          bannerImageUrl = imageData;
        }
      } else {
        console.log("Object Storage not configured, using base64 for banner image");
        bannerImageUrl = imageData;
      }
      
      const [newAnnouncement] = await db.insert(announcements)
        .values({
          createdById: req.user.id,
          title,
          message: message || title,
          category: category || 'general',
          targetRoles: targetRoles?.length ? targetRoles : null,
          targetBranches: targetBranches?.length ? targetBranches : null,
          priority: priority || 'normal',
          bannerImageUrl,
          bannerTitle: title,
          showOnDashboard: showOnDashboard || false,
          bannerPriority: priority === 'urgent' ? 10 : priority === 'high' ? 5 : 0,
          isPinned: priority === 'urgent',
          validFrom: validFrom ? new Date(validFrom) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();
      
      res.json(newAnnouncement);
    } catch (error: any) {
      handleApiError(res, error, "CreateAnnouncement");
    }
  });

  // PATCH /api/admin/announcements/:id - Duyuru güncelle
  // POST /api/ai/generate-image - DALL-E ile görsel oluştur ve Object Storage'a kaydet
  router.post('/api/ai/generate-image', isAuthenticated, async (req: any, res) => {
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
        return res.status(500).json({ message: "Sunucu hatası oluştu" });
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

      const { objectStorageClient } = await import('../objectStorage');
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
      handleApiError(res, error, "AIImageGeneration");
    }
  });

  // DELETE /api/admin/announcements/:id - Duyuru sil

  router.patch('/api/task-steps/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const step = await storage.updateTaskStep(id, req.body);
      res.json(step);
    } catch (error: any) {
      console.error("Update task step error:", error);
      res.status(500).json({ message: "Adım güncellenemedi" });
    }
  });

  router.delete('/api/task-steps/:id', isAuthenticated, async (req: any, res) => {
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

  // ========================================
  // FACTORY PRODUCTION - Fabrika Üretim API'leri
  // ========================================







  // ===== EMPLOYEE DASHBOARD =====
  router.get('/api/employee-dashboard/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const currentUser = req.user;
      const isOwnDashboard = currentUser.id === userId;
      if (!isOwnDashboard && !isHQRole(currentUser.role as SchemaUserRoleType)) {
        return res.status(403).json({ message: "Bu panele erişim yetkiniz yok" });
      }
      const todayStr = new Date().toISOString().split('T')[0];
      
      const [userData] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      }).from(users).where(eq(users.id, userId));
      
      if (!userData) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      const myShifts = await db.select({
        id: shifts.id,
        shiftDate: shifts.shiftDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        shiftType: shifts.shiftType,
        status: shifts.status,
      }).from(shifts).where(and(
        eq(shifts.assignedToId, userId),
        eq(shifts.shiftDate, todayStr)
      ));
      
      const myChecklists = await db.select({
        id: checklistCompletions.id,
        checklistId: checklistCompletions.checklistId,
        status: checklistCompletions.status,
        completedTasks: checklistCompletions.completedTasks,
        totalTasks: checklistCompletions.totalTasks,
        timeWindowStart: checklistCompletions.timeWindowStart,
        timeWindowEnd: checklistCompletions.timeWindowEnd,
        isLate: checklistCompletions.isLate,
        checklistTitle: checklists.title,
        checklistCategory: checklists.category,
      })
      .from(checklistCompletions)
      .leftJoin(checklists, eq(checklistCompletions.checklistId, checklists.id))
      .where(and(
        eq(checklistCompletions.userId, userId),
        eq(checklistCompletions.scheduledDate, todayStr)
      ));
      
      const myTasks = await db.select({
        id: tasks.id,
        title: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      }).from(tasks).where(and(
        eq(tasks.assignedToId, userId),
        sql`DATE(${tasks.dueDate}) = ${todayStr}`
      ));
      
      res.json({
        user: userData,
        myShifts,
        myChecklists,
        myTasks,
      });
    } catch (error: any) {
      handleApiError(res, error, "FetchEmployeeDashboard");
    }
  });

  // ===== HQ DASHBOARD SUMMARY =====
  router.get('/api/hq-dashboard-summary', isAuthenticated, async (req: any, res) => {
    const currentUser = req.user;
    if (!isHQRole(currentUser.role as SchemaUserRoleType)) {
      return res.status(403).json({ message: "Bu panele erişim yetkiniz yok" });
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const branchResult = await db.select({ count: sql<number>`count(*)::int` }).from(branches);
      const totalBranches = branchResult[0]?.count || 0;
      
      const employeeResult = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(
        eq(users.isActive, true),
        sql`${users.role} NOT IN ('admin', 'ceo', 'cgo')`,
        sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`
      ));
      const activeEmployees = employeeResult[0]?.count || 0;
      
      const checklistStats = await db.select({ 
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${checklistCompletions.status} IN ('completed', 'submitted', 'reviewed'))::int`
      }).from(checklistCompletions).where(eq(checklistCompletions.scheduledDate, todayStr));
      
      const openTasksResult = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(
        sql`${tasks.status} NOT IN ('completed', 'verified', 'cancelled')`,
        sql`DATE(${tasks.dueDate}) >= ${todayStr}`
      ));
      const openTasks = openTasksResult[0]?.count || 0;
      
      const alertsResult = await db.select({ 
        total: sql<number>`count(*)::int`,
        critical: sql<number>`count(*) FILTER (WHERE ${dashboardAlerts.severity} = 'critical')::int`
      }).from(dashboardAlerts).where(eq(dashboardAlerts.status, 'active'));
      
      const branchPerformance = await db.select({
        branchId: branches.id,
        branchName: branches.name,
        openTasks: sql<number>`count(${tasks.id}) FILTER (WHERE ${tasks.status} NOT IN ('completed', 'verified', 'cancelled'))::int`,
      }).from(branches)
      .leftJoin(tasks, eq(tasks.branchId, branches.id))
      .groupBy(branches.id, branches.name)
      .orderBy(sql`count(${tasks.id}) FILTER (WHERE ${tasks.status} NOT IN ('completed', 'verified', 'cancelled')) DESC`)
      .limit(10);

      const hqBranch = await db.select({ id: branches.id }).from(branches).where(sql`${branches.name} LIKE '%Merkez%' OR ${branches.name} LIKE '%HQ%'`).limit(1);
      const hqBranchId = hqBranch[0]?.id;

      let merkezStaff: any[] = [];
      if (hqBranchId) {
        const staffList = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        }).from(users).where(and(
          eq(users.branchId, hqBranchId),
          eq(users.isActive, true),
          sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`
        )).orderBy(users.role, users.lastName);

        const todayShifts = await db.select({
          assignedToId: shifts.assignedToId,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          shiftType: shifts.shiftType,
        }).from(shifts).where(and(
          eq(shifts.branchId, hqBranchId),
          eq(shifts.shiftDate, todayStr)
        ));

        const shiftMap = new Map<string, any>();
        for (const s of todayShifts) {
          if (s.assignedToId) shiftMap.set(s.assignedToId, s);
        }

        merkezStaff = staffList.map(staff => ({
          ...staff,
          todayShift: shiftMap.get(staff.id) || null,
        }));
      }
      
      let branchInfoGraphics: any[] = [];
      let criticalIssues: any[] = [];
      try {
      const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches)
        .where(sql`${branches.name} NOT LIKE '%Merkez%' AND ${branches.name} NOT LIKE '%HQ%' AND ${branches.name} NOT LIKE '%Fabrika%'`);
      
      for (const br of allBranches) {
        const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.branchId, br.id), eq(users.isActive, true), sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`));
        const [shiftCount] = await db.select({ count: sql<number>`count(*)::int` }).from(shifts).where(and(eq(shifts.branchId, br.id), eq(shifts.shiftDate, todayStr)));
        const [clTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, br.id), eq(checklistCompletions.scheduledDate, todayStr)));
        const [clDone] = await db.select({ count: sql<number>`count(*)::int` }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, br.id), eq(checklistCompletions.scheduledDate, todayStr), sql`${checklistCompletions.status} IN ('completed', 'submitted', 'reviewed')`));
        const [faultCount] = await db.select({ count: sql<number>`count(*)::int` }).from(equipmentFaults).where(and(eq(equipmentFaults.branchId, br.id), sql`${equipmentFaults.status} NOT IN ('cozuldu', 'kapali')`));
        
        branchInfoGraphics.push({
        branchId: br.id,
          branchName: br.name,
          employeeCount: empCount?.count || 0,
          todayShiftCount: shiftCount?.count || 0,
          checklistTotal: clTotal?.count || 0,
          checklistDone: clDone?.count || 0,
          openFaultCount: faultCount?.count || 0,
        });
      }



      const openFaults = await db.select({
        id: equipmentFaults.id,
        equipmentName: equipmentFaults.equipmentName,
        priorityLevel: equipmentFaults.priorityLevel,
        currentStage: equipmentFaults.currentStage,
        branchId: equipmentFaults.branchId,
        createdAt: equipmentFaults.createdAt,
      }).from(equipmentFaults).where(and(
        sql`${equipmentFaults.status} NOT IN ('cozuldu', 'kapali')`,
        sql`${equipmentFaults.priorityLevel} = 'red' OR ${equipmentFaults.currentStage} IN ('bekliyor', 'servis_bekleniyor')`
      )).orderBy(desc(equipmentFaults.createdAt)).limit(10);

      for (const f of openFaults) {
        const branchInfo = branchInfoGraphics.find(b => b.branchId === f.branchId);
        criticalIssues.push({
          type: 'fault',
          title: f.equipmentName + ' Arizasi',
          detail: branchInfo ? branchInfo.branchName : 'Sube #' + f.branchId,
          severity: f.priorityLevel === 'red' ? 'critical' : 'warning',
          area: 'sube',
        });
      }

      const overdueTasks = await db.select({
        id: tasks.id,
        title: tasks.title,
        branchId: tasks.branchId,
        dueDate: tasks.dueDate,
      }).from(tasks).where(and(
        sql`${tasks.status} NOT IN ('completed', 'verified', 'cancelled')`,
        sql`DATE(${tasks.dueDate}) < ${todayStr}`
      )).orderBy(tasks.dueDate).limit(10);

      for (const t of overdueTasks) {
        const branchInfo = branchInfoGraphics.find(b => b.branchId === t.branchId);
        criticalIssues.push({
          type: 'overdue_task',
          title: t.title || 'Geciken Gorev',
          detail: branchInfo ? branchInfo.branchName : (t.branchId ? 'Sube #' + t.branchId : 'Merkez'),
          severity: 'warning',
          area: t.branchId ? 'sube' : 'merkez',
        });
      }

      const overdueMaintenances = await db.select({
        id: maintenanceSchedules.id,
        equipmentId: maintenanceSchedules.equipmentId,
        nextMaintenanceDate: maintenanceSchedules.nextMaintenanceDate,
      }).from(maintenanceSchedules).where(and(
        eq(maintenanceSchedules.isActive, true),
        sql`${maintenanceSchedules.nextMaintenanceDate} < ${todayStr}`
      )).limit(5);

      for (const m of overdueMaintenances) {
        criticalIssues.push({
          type: 'maintenance',
          title: 'Bakim Gecikmis (Ekipman #' + m.equipmentId + ')',
          detail: 'Son tarih: ' + m.nextMaintenanceDate,
          severity: 'warning',
          area: 'fabrika',
        });
      }

      } catch (error: any) {
        console.error('Error fetching branch infographics:', error.message);
      }

      res.json({
        totalBranches,
        activeEmployees,
        checklistCompletion: {
          total: checklistStats[0]?.total || 0,
          completed: checklistStats[0]?.completed || 0,
          rate: checklistStats[0]?.total ? Math.round((checklistStats[0].completed / checklistStats[0].total) * 100) : 0,
        },
        openTasks,
        alerts: {
          total: alertsResult[0]?.total || 0,
          critical: alertsResult[0]?.critical || 0,
        },
        branchPerformance,
        merkezStaff,
        branchInfoGraphics,
        criticalIssues,
      });
    } catch (error: any) {
      handleApiError(res, error, "FetchHQDashboard");
    }
  });

  // ===== MESSAGING SYSTEM =====

  // GET /api/messages/recipients - Get list of users available for messaging (no employees permission needed)
  router.get('/api/messages/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      if (!hasPermission(currentUser.role as UserRoleType, 'messages', 'view')) {
        return res.status(403).json({ message: "Mesaj erişim yetkiniz yok" });
      }
      const allUsersList = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(and(ne(users.id, currentUser.id), eq(users.isActive, true)));
      res.json(allUsersList);
    } catch (error: any) {
      console.error("Error fetching message recipients:", error);
      res.status(500).json({ message: "Alici listesi alinamadi" });
    }
  });

  router.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const userThreads = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(eq(threadParticipants.userId, userId));
      if (userThreads.length === 0) { return res.json([]); }

      const threadIds = userThreads.map(ut => ut.threadId);

      const [allLastMessages, allFirstMessages, allParticipants, allUnread] = await Promise.all([
        db.select({
          threadId: messages.threadId,
          body: messages.body,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
          rn: sql<number>`(ROW_NUMBER() OVER (PARTITION BY ${messages.threadId} ORDER BY ${messages.createdAt} DESC))::int`,
        }).from(messages).where(inArray(messages.threadId, threadIds)),

        db.select({
          threadId: messages.threadId,
          subject: messages.subject,
          rn: sql<number>`(ROW_NUMBER() OVER (PARTITION BY ${messages.threadId} ORDER BY ${messages.createdAt} ASC))::int`,
        }).from(messages).where(inArray(messages.threadId, threadIds)),

        db.select({
          threadId: threadParticipants.threadId,
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }).from(threadParticipants).innerJoin(users, eq(users.id, threadParticipants.userId)).where(inArray(threadParticipants.threadId, threadIds)),

        db.select({
          threadId: messages.threadId,
          count: sql<number>`count(*)::int`,
        }).from(messages)
          .innerJoin(threadParticipants, and(
            eq(threadParticipants.threadId, messages.threadId),
            eq(threadParticipants.userId, sql`${userId}`)
          ))
          .where(and(
            inArray(messages.threadId, threadIds),
            sql`${messages.senderId} != ${userId}`,
            sql`(${threadParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${threadParticipants.lastReadAt})`
          ))
          .groupBy(messages.threadId),
      ]);

      const lastMsgMap = new Map<string, { body: string; createdAt: Date; senderId: string }>();
      for (const m of allLastMessages) {
        if (Number(m.rn) === 1) lastMsgMap.set(m.threadId, { body: m.body, createdAt: m.createdAt, senderId: m.senderId });
      }
      const firstSubjectMap = new Map<string, string>();
      for (const m of allFirstMessages) {
        if (Number(m.rn) === 1) firstSubjectMap.set(m.threadId, m.subject || 'Mesaj');
      }
      const participantMap = new Map<string, { id: string; firstName: string; lastName: string; profileImageUrl: string | null }[]>();
      for (const p of allParticipants) {
        if (!participantMap.has(p.threadId)) participantMap.set(p.threadId, []);
        participantMap.get(p.threadId)!.push({ id: p.id, firstName: p.firstName, lastName: p.lastName, profileImageUrl: p.profileImageUrl });
      }
      const unreadMap = new Map<string, number>();
      for (const u of allUnread) {
        unreadMap.set(u.threadId, u.count);
      }

      const sentByMeSet = new Set<string>();
      for (const m of allLastMessages) {
        if (m.senderId === userId) sentByMeSet.add(m.threadId);
      }

      const threadSummaries = [];
      for (const tid of threadIds) {
        const last = lastMsgMap.get(tid);
        if (!last) continue;
        threadSummaries.push({
          threadId: tid,
          subject: firstSubjectMap.get(tid) || 'Mesaj',
          participants: participantMap.get(tid) || [],
          lastMessageBody: last.body,
          lastMessageAt: last.createdAt,
          unreadCount: unreadMap.get(tid) || 0,
          sentByMe: sentByMeSet.has(tid),
        });
      }
      threadSummaries.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      res.json(threadSummaries);
    } catch (error: any) {
      handleApiError(res, error, "FetchMessageThreads");
    }
  });
  router.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const userThreads = await db.select({ threadId: threadParticipants.threadId }).from(threadParticipants).where(eq(threadParticipants.userId, userId));
      if (userThreads.length === 0) { return res.json({ unreadCount: 0 }); }

      const threadIds = userThreads.map(ut => ut.threadId);
      const [result] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(messages)
        .innerJoin(threadParticipants, and(
          eq(threadParticipants.threadId, messages.threadId),
          eq(threadParticipants.userId, sql`${userId}`)
        ))
        .where(and(
          inArray(messages.threadId, threadIds),
          sql`${messages.senderId} != ${userId}`,
          sql`(${threadParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${threadParticipants.lastReadAt})`
        ));
      res.json({ unreadCount: result?.count || 0 });
    } catch (error: any) {
      handleApiError(res, error, "FetchUnreadCount");
    }
  });
  router.get('/api/messages/:threadId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      const [participant] = await db.select().from(threadParticipants).where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
      if (!participant) { return res.status(403).json({ message: "Bu mesaj dizisine erişim yetkiniz yok" }); }
      const threadMessages = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.createdAt);
      const participants = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl, role: users.role }).from(threadParticipants).innerJoin(users, eq(users.id, threadParticipants.userId)).where(eq(threadParticipants.threadId, threadId));
      res.json({ messages: threadMessages, participants });
    } catch (error: any) {
      handleApiError(res, error, "FetchThreadMessages");
    }
  });
  router.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { threadId, recipientId, recipientRole, subject, body, type, attachments } = req.body;
      if (!body || body.trim() === '') { return res.status(400).json({ message: "Mesaj içeriği gerekli" }); }
      let targetThreadId = threadId;
      if (!targetThreadId) {
        targetThreadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: userId });
        if (recipientId) { await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: recipientId }).onConflictDoNothing(); }
        else if (recipientRole) {
          const roleUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, recipientRole));
          for (const u of roleUsers) { if (u.id !== userId) { await db.insert(threadParticipants).values({ threadId: targetThreadId, userId: u.id }).onConflictDoNothing(); } }
        }
      }
      const [newMessage] = await db.insert(messages).values({ threadId: targetThreadId, senderId: userId, recipientId: recipientId || null, recipientRole: recipientRole || null, subject: subject || 'Mesaj', body: body.trim(), type: type || 'direct', attachments: attachments && attachments.length > 0 ? attachments : null }).returning();
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(and(eq(threadParticipants.threadId, targetThreadId), eq(threadParticipants.userId, userId)));
      res.json(newMessage);
    } catch (error: any) {
      handleApiError(res, error, "CreateMessage");
    }
  });
  router.post('/api/messages/:threadId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking thread as read:", error);
      res.status(500).json({ message: "Mesaj okundu olarak işaretlenemedi" });
    }
  });

  // POST /api/messages/:threadId/replies - Add a reply to an existing thread
  router.post('/api/messages/:threadId/replies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.threadId;
      const { body, attachments } = req.body;

      if (!body || typeof body !== 'string' || body.trim() === '') {
        return res.status(400).json({ message: "Mesaj içeriği gerekli" });
      }

      // Verify user is a participant of the thread
      const [participant] = await db.select().from(threadParticipants).where(
        and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId))
      );

      if (!participant) {
        return res.status(403).json({ message: "Bu thread'e erişim yetkiniz yok" });
      }

      const [firstMsg] = await db.select({ subject: messages.subject }).from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt)).limit(1);
      const [newMessage] = await db.insert(messages).values({
        threadId,
        senderId: userId,
        recipientId: null,
        recipientRole: null,
        subject: firstMsg?.subject || 'Mesaj',
        body: body.trim(),
        type: 'direct',
        attachments: attachments && attachments.length > 0 ? attachments : null,
      }).returning();

      // Update sender's lastReadAt
      await db.update(threadParticipants).set({ lastReadAt: new Date() }).where(
        and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId))
      );

      res.json(newMessage);
    } catch (error: any) {
      console.error("Error creating message reply:", error);
      res.status(500).json({ message: "Yanıt gönderilemedi" });
    }
  });

  // ===== MEGA MODULE MANAGEMENT =====
  // GET /api/admin/mega-modules - Tüm mega modül konfigürasyonlarını getir
  // POST /api/admin/mega-modules/config - Mega modül konfigürasyonu kaydet
  // POST /api/admin/mega-modules/items - Modül atamalarını kaydet (transaction ile)
  // POST /api/admin/mega-modules/add-module - Yeni tek modül ekle

  // PUT /api/admin/mega-modules/items/:subModuleId - Tek bir modül atamasını güncelle

  // ========================================
  // AYIN ELEMANI (Employee of the Month) VE QR DEĞERLENDİRME API
  // ========================================

  // GET /api/staff-qr/:token - Personel bilgisini QR token ile getir (public endpoint)
  router.get('/api/staff-qr/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const qrToken = await db.select()
        .from(staffQrTokens)
        .where(and(eq(staffQrTokens.token, token), eq(staffQrTokens.isActive, true)))
        .limit(1);
      
      if (qrToken.length === 0) {
        return res.status(404).json({ message: "Geçersiz veya süresi dolmuş QR kod" });
      }

      const staff = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        branchId: users.branchId,
      }).from(users).where(eq(users.id, qrToken[0].staffId)).limit(1);

      if (staff.length === 0) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      const branch = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, qrToken[0].branchId)).limit(1);

      res.json({
        staff: staff[0],
        branchName: branch[0]?.name || 'Bilinmiyor',
        token: token,
      });
    } catch (error: any) {
      console.error("Error fetching staff by QR:", error);
      res.status(500).json({ message: "Personel bilgisi alınamadı" });
    }
  });

  // POST /api/staff-qr/:token/rate - QR ile personel değerlendir (public endpoint)
  router.post('/api/staff-qr/:token/rate', async (req, res) => {
    try {
      const { token } = req.params;
      const { serviceRating, friendlinessRating, speedRating, overallRating, comment, customerName, customerPhone, isAnonymous } = req.body;

      const ratings = [serviceRating, friendlinessRating, speedRating, overallRating];
      if (ratings.some(r => !r || r < 1 || r > 5)) {
        return res.status(400).json({ message: "Tüm puanlar 1-5 arası olmalı" });
      }

      const qrToken = await db.select()
        .from(staffQrTokens)
        .where(and(eq(staffQrTokens.token, token), eq(staffQrTokens.isActive, true)))
        .limit(1);
      
      if (qrToken.length === 0) {
        return res.status(404).json({ message: "Geçersiz veya süresi dolmuş QR kod" });
      }

      const [rating] = await db.insert(staffQrRatings).values({
        staffId: qrToken[0].staffId,
        branchId: qrToken[0].branchId,
        serviceRating,
        friendlinessRating,
        speedRating,
        overallRating,
        comment: comment || null,
        customerName: isAnonymous ? null : customerName,
        customerPhone: isAnonymous ? null : customerPhone,
        isAnonymous: isAnonymous ?? true,
        qrToken: token,
        status: 'active',
      }).returning();

      await db.update(staffQrTokens)
        .set({ 
          usageCount: (qrToken[0].usageCount || 0) + 1,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(staffQrTokens.id, qrToken[0].id));

      res.json({ success: true, message: "Değerlendirmeniz için teşekkürler!" });
    } catch (error: any) {
      console.error("Error saving staff rating:", error);
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });

  // GET /api/staff-qr-tokens - Personel QR tokenlerini listele

  // POST /api/staff-qr-tokens - Yeni QR token oluştur

  // GET /api/staff-qr-ratings - Personel değerlendirmelerini listele
  router.get('/api/staff-qr-ratings', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;
      const { staffId, branchId } = req.query;

      let query = db.select().from(staffQrRatings);
      const conditions = [];

      if (staffId) conditions.push(eq(staffQrRatings.staffId, staffId as string));
      if (branchId) conditions.push(eq(staffQrRatings.branchId, parseInt(branchId as string)));
      
      if (userRole !== 'admin' && userBranchId) {
        conditions.push(eq(staffQrRatings.branchId, userBranchId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const ratings = await query.orderBy(desc(staffQrRatings.createdAt)).limit(100);
      res.json(ratings);
    } catch (error: any) {
      console.error("Error fetching staff ratings:", error);
      res.status(500).json({ message: "Değerlendirmeler alınamadı" });
    }
  });


  // ========================================
  // YÖNETİCİ AYLIK PERSONEL DEĞERLENDİRME API
  // ========================================

  // GET /api/manager-ratings - Yönetici değerlendirmelerini listele
  router.get("/api/manager-ratings", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const userBranchId = req.user?.branchId;
      const { branchId, month, year, employeeId } = req.query;

      const conditions = [];
      
      if (month) conditions.push(eq(managerMonthlyRatings.month, parseInt(month as string)));
      if (year) conditions.push(eq(managerMonthlyRatings.year, parseInt(year as string)));
      if (employeeId) conditions.push(eq(managerMonthlyRatings.employeeId, employeeId as string));

      // Role-based filtering
      if (userRole === "admin" || userRole === "coach") {
        if (branchId) conditions.push(eq(managerMonthlyRatings.branchId, parseInt(branchId as string)));
      } else if (userRole === "supervisor") {
        conditions.push(eq(managerMonthlyRatings.branchId, userBranchId));
      } else {
        conditions.push(eq(managerMonthlyRatings.employeeId, userId));
      }

      const ratings = await db.select().from(managerMonthlyRatings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(managerMonthlyRatings.createdAt));

      const enriched = await Promise.all(ratings.map(async (r) => {
        const employee = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, r.employeeId)).limit(1);
        const manager = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, r.managerId)).limit(1);
        return { ...r, employee: employee[0] || null, manager: manager[0] || null };
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching manager ratings:", error);
      res.status(500).json({ message: "Değerlendirmeler alınamadı" });
    }
  });

  // POST /api/manager-ratings - Yeni değerlendirme ekle

  // ========================================
  // PUBLIC PERSONEL DEGERLENDIRME API
  // ========================================

  // GET /api/public/staff-rating/validate/:token - Token dogrula
  router.get("/api/public/staff-rating/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const [tokenRecord] = await db.select().from(staffQrTokens)
        .where(and(
          eq(staffQrTokens.token, token),
          eq(staffQrTokens.isActive, true)
        )).limit(1);
      
      if (!tokenRecord) {
        return res.status(404).json({ message: "Gecersiz veya suresi dolmus QR kodu" });
      }
      
      // Check if expired
      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(400).json({ message: "QR kodunun suresi dolmus" });
      }
      
      // Get staff and branch info
      const [staff] = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, tokenRecord.staffId)).limit(1);
      const [branch] = await db.select({ name: branches.name })
        .from(branches).where(eq(branches.id, tokenRecord.branchId)).limit(1);
      
      res.json({
        valid: true,
        staffName: staff ? staff.firstName + " " + staff.lastName : "Personel",
        branchName: branch?.name || "Sube",
        staffId: tokenRecord.staffId,
        branchId: tokenRecord.branchId,
      });
    } catch (error: any) {
      console.error("Error validating staff rating token:", error);
      res.status(500).json({ message: "Token dogrulanamadi" });
    }
  });

  // POST /api/public/staff-rating - Değerlendirme kaydet
  router.post("/api/public/staff-rating", async (req, res) => {
    try {
      const { token, overallRating, serviceRating, friendlinessRating, speedRating, comment } = req.body;
      
      if (!token || !overallRating) {
        return res.status(400).json({ message: "Token ve genel puan zorunludur" });
      }
      
      // Validate token
      const [tokenRecord] = await db.select().from(staffQrTokens)
        .where(and(
          eq(staffQrTokens.token, token),
          eq(staffQrTokens.isActive, true)
        )).limit(1);
      
      if (!tokenRecord) {
        return res.status(404).json({ message: "Gecersiz QR kodu" });
      }
      
      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(400).json({ message: "QR kodunun suresi dolmus" });
      }
      
      // Save rating
      const [rating] = await db.insert(staffQrRatings).values({
        staffId: tokenRecord.staffId,
        branchId: tokenRecord.branchId,
        tokenId: tokenRecord.id,
        overallRating,
        serviceRating: serviceRating || null,
        friendlinessRating: friendlinessRating || null,
        speedRating: speedRating || null,
        comment: comment || null,
        status: "active",
      }).returning();
      
      // Update token usage
      await db.update(staffQrTokens).set({
        usageCount: (tokenRecord.usageCount || 0) + 1,
        lastUsedAt: new Date(),
      }).where(eq(staffQrTokens.id, tokenRecord.id));
      
      res.json({ success: true, message: "Değerlendirme kaydedildi" });
    } catch (error: any) {
      console.error("Error saving staff rating:", error);
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });

  // ========================================
  // STAFF QR TOKEN YONETIM API
  // ========================================

  // GET /api/staff-qr-tokens - Token listesi
  router.get("/api/staff-qr-tokens", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userBranchId = req.user?.branchId;
      
      let conditions = [];
      if (userRole === "supervisor" && userBranchId) {
        conditions.push(eq(staffQrTokens.branchId, userBranchId));
      }
      
      const tokens = await db.select().from(staffQrTokens)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(staffQrTokens.createdAt));
      
      const enriched = await Promise.all(tokens.map(async (t) => {
        const [staff] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, t.staffId)).limit(1);
        const [branch] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, t.branchId)).limit(1);
        return { ...t, staff, branch };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching staff tokens:", error);
      res.status(500).json({ message: "Tokenlar alinamadi" });
    }
  });

  // POST /api/staff-qr-tokens - Yeni token olustur
  router.post("/api/staff-qr-tokens", isAuthenticated, async (req: any, res) => {
    try {
      const { branchId, staffId, expiresAt } = req.body;
      
      if (!branchId || !staffId) {
        return res.status(400).json({ message: "Sube ve personel zorunlu" });
      }
      
      // Generate unique token
      const token = require("crypto").randomBytes(16).toString("hex");
      
      const [newToken] = await db.insert(staffQrTokens).values({
        staffId,
        branchId,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        usageCount: 0,
      }).returning();
      
      res.json({ success: true, token: newToken });
    } catch (error: any) {
      console.error("Error creating staff token:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Bu personel icin zaten token var" });
      }
      res.status(500).json({ message: "Token olusturulamadi" });
    }
  });

  // DELETE /api/staff-qr-tokens/:id - Token sil
  router.delete("/api/staff-qr-tokens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(staffQrTokens).where(eq(staffQrTokens.id, parseInt(id)));
      res.json({ success: true, message: "Token silindi" });
    } catch (error: any) {
      console.error("Error deleting staff token:", error);
      res.status(500).json({ message: "Token silinemedi" });
    }
  });

  // ========================================
  // AYIN ELEMANI (EMPLOYEE OF MONTH) API
  // ========================================

  // GET /api/employee-of-month/rankings - Siralama listesi
  router.get("/api/employee-of-month/rankings", isAuthenticated, async (req: any, res) => {
    try {
      const { month, year, branchId } = req.query;
      const m = parseInt(month as string) || new Date().getMonth() + 1;
      const y = parseInt(year as string) || new Date().getFullYear();
      
      let conditions = [
        eq(monthlyEmployeePerformance.month, m),
        eq(monthlyEmployeePerformance.year, y)
      ];
      
      if (branchId && branchId !== "all") {
        conditions.push(eq(monthlyEmployeePerformance.branchId, parseInt(branchId as string)));
      }
      
      const rankings = await db.select().from(monthlyEmployeePerformance)
        .where(and(...conditions))
        .orderBy(desc(monthlyEmployeePerformance.totalScore));
      
      const enriched = await Promise.all(rankings.map(async (r) => {
        const [employee] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, r.employeeId)).limit(1);
        const [branch] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, r.branchId)).limit(1);
        return { ...r, employee, branch };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching rankings:", error);
      res.status(500).json({ message: "Siralama alinamadi" });
    }
  });

  // POST /api/employee-of-month/calculate - Hesaplama yap
  router.post("/api/employee-of-month/calculate", isAuthenticated, async (req: any, res) => {
    try {
      const { month, year, branchId } = req.body;
      const m = month || new Date().getMonth() + 1;
      const y = year || new Date().getFullYear();
      
      // Get weights
      const [weights] = await db.select().from(employeeOfMonthWeights).limit(1);
      const w = weights || {
        attendanceWeight: 20, checklistWeight: 20, taskWeight: 15,
        customerRatingWeight: 15, managerRatingWeight: 20, leaveDeductionWeight: 10
      };
      
      // Get employees
      let userConditions: any[] = [eq(users.isActive, true)];
      if (branchId) {
        userConditions.push(eq(users.branchId, branchId));
      }
      const employees = await db.select().from(users).where(and(...userConditions));
      
      const results = [];
      for (const emp of employees) {
        if (!emp.branchId) continue;
        
        // Calculate scores (simplified - real implementation would query actual data)
        const attendanceScore = Math.random() * w.attendanceWeight;
        const checklistScore = Math.random() * w.checklistWeight;
        const taskScore = Math.random() * w.taskWeight;
        
        // Get customer ratings
        const customerRatings = await db.select().from(staffQrRatings)
          .where(and(
            eq(staffQrRatings.staffId, emp.id),
            sql`EXTRACT(MONTH FROM ${staffQrRatings.createdAt}) = ${m}`,
            sql`EXTRACT(YEAR FROM ${staffQrRatings.createdAt}) = ${y}`
          ));
        const avgCustomer = customerRatings.length > 0
          ? customerRatings.reduce((sum, r) => sum + r.overallRating, 0) / customerRatings.length
          : 0;
        const customerRatingScore = (avgCustomer / 5) * w.customerRatingWeight;
        
        // Get manager ratings
        const [managerRating] = await db.select().from(managerMonthlyRatings)
          .where(and(
            eq(managerMonthlyRatings.employeeId, emp.id),
            eq(managerMonthlyRatings.month, m),
            eq(managerMonthlyRatings.year, y)
          )).limit(1);
        const managerRatingScore = managerRating
          ? ((managerRating.averageRating || 0) / 5) * w.managerRatingWeight
          : 0;
        
        // Leave deduction (simplified)
        const leaveDeduction = 0;
        
        const totalScore = attendanceScore + checklistScore + taskScore +
          customerRatingScore + managerRatingScore - leaveDeduction;
        
        // Upsert performance record
        await db.insert(monthlyEmployeePerformance).values({
          employeeId: emp.id,
          branchId: emp.branchId,
          month: m,
          year: y,
          attendanceScore,
          checklistScore,
          taskScore,
          customerRatingScore,
          managerRatingScore,
          leaveDeduction,
          totalScore
        }).onConflictDoUpdate({
          target: [monthlyEmployeePerformance.employeeId, monthlyEmployeePerformance.month, monthlyEmployeePerformance.year],
          set: { attendanceScore, checklistScore, taskScore, customerRatingScore, managerRatingScore, leaveDeduction, totalScore, calculatedAt: new Date() }
        });
        
        results.push({ employeeId: emp.id, totalScore });
      }
      
      res.json({ success: true, count: results.length });
    } catch (error: any) {
      console.error("Error calculating employee of month:", error);
      res.status(500).json({ message: "Hesaplama yapilamadi" });
    }
  });

  // GET /api/employee-of-month/awards - Gecmis oduller
  router.get("/api/employee-of-month/awards", isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.query;
      const y = parseInt(year as string) || new Date().getFullYear();
      
      const awards = await db.select().from(employeeOfMonthAwards)
        .where(eq(employeeOfMonthAwards.year, y))
        .orderBy(employeeOfMonthAwards.month);
      
      const enriched = await Promise.all(awards.map(async (a) => {
        const [employee] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, a.employeeId)).limit(1);
        const [branch] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, a.branchId)).limit(1);
        return { ...a, employee, branch };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching awards:", error);
      res.status(500).json({ message: "Oduller alinamadi" });

  // ========================================
  // KISISEL PERFORMANS API
  // ========================================

  // GET /api/my-performance - Kullanicinin kendi performansi
  router.get("/api/my-performance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      if (!userId) {
        return res.status(401).json({ message: "Yetkisiz" });
      }
      
      // Get current month performance
      const [performance] = await db.select().from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.employeeId, userId),
          eq(monthlyEmployeePerformance.month, currentMonth),
          eq(monthlyEmployeePerformance.year, currentYear)
        )).limit(1);
      
      if (!performance) {
        return res.json({
          attendanceScore: 0,
          checklistScore: 0,
          taskScore: 0,
          customerRatingScore: 0,
          managerRatingScore: 0,
          leaveDeduction: 0,
          totalScore: 0,
          rank: null
        });
      }
      
      // Get ranking
      const allPerformances = await db.select().from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.month, currentMonth),
          eq(monthlyEmployeePerformance.year, currentYear)
        ))
        .orderBy(desc(monthlyEmployeePerformance.totalScore));
      
      const rank = allPerformances.findIndex(p => p.employeeId === userId) + 1;
      
      // Get customer rating average
      const customerRatings = await db.select().from(staffQrRatings)
        .where(eq(staffQrRatings.staffId, userId));
      const customerRatingAvg = customerRatings.length > 0
        ? customerRatings.reduce((sum, r) => sum + r.overallRating, 0) / customerRatings.length
        : 0;
      
      res.json({
        ...performance,
        rank,
        totalEmployees: allPerformances.length,
        customerRatingAvg,
        checklistCompletion: (performance.checklistScore / 20) * 100
      });
    } catch (error: any) {
      console.error("Error fetching my performance:", error);
      res.status(500).json({ message: "Performans alinamadi" });
    }
  });

  // GET /api/my-performance/history - Gecmis performans
  router.get("/api/my-performance/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Yetkisiz" });
      }
      
      const history = await db.select().from(monthlyEmployeePerformance)
        .where(eq(monthlyEmployeePerformance.employeeId, userId))
        .orderBy(desc(monthlyEmployeePerformance.year), desc(monthlyEmployeePerformance.month))
        .limit(12);
      
      res.json(history.reverse());
    } catch (error: any) {
      console.error("Error fetching performance history:", error);
      res.status(500).json({ message: "Gecmis alinamadi" });
    }
  });


  // GET /api/my-performance/periods - Periyod bazli performans (aylik/3aylik/yillik/tum)
  router.get("/api/my-performance/periods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Yetkisiz" });
      
      const period = (req.query.period as string) || "monthly";
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const allHistory = await db.select().from(monthlyEmployeePerformance)
        .where(eq(monthlyEmployeePerformance.employeeId, userId))
        .orderBy(desc(monthlyEmployeePerformance.year), desc(monthlyEmployeePerformance.month));
      
      if (allHistory.length === 0) {
        return res.json({
          period,
          current: null,
          previous: null,
          trend: null,
          chartData: [],
          summary: { avgScore: 0, bestMonth: null, worstMonth: null, totalMonths: 0 }
        });
      }
      
      const getScore = (p: any) => p.finalScore || p.totalScore || 0;
      const monthNames = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
      
      const normalizeChartItem = (h: any) => ({
        label: `${monthNames[h.month - 1]} ${h.year}`,
        score: getScore(h),
        attendance: h.attendanceScore || 0,
        checklist: h.checklistScore || 0,
        task: h.taskScore || 0,
        customer: h.customerRatingScore || 0,
        manager: h.managerRatingScore || 0
      });
      
      const avgSubScores = (data: any[]) => {
        const len = data.length || 1;
        return {
          attendance: data.reduce((s: number, h: any) => s + (h.attendanceScore || 0), 0) / len,
          checklist: data.reduce((s: number, h: any) => s + (h.checklistScore || 0), 0) / len,
          task: data.reduce((s: number, h: any) => s + (h.taskScore || 0), 0) / len,
          customer: data.reduce((s: number, h: any) => s + (h.customerRatingScore || 0), 0) / len,
          manager: data.reduce((s: number, h: any) => s + (h.managerRatingScore || 0), 0) / len,
        };
      };
      
      if (period === "monthly") {
        const current = allHistory.find(h => h.month === currentMonth && h.year === currentYear) || null;
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const previous = allHistory.find(h => h.month === prevMonth && h.year === prevYear) || null;
        
        const trend = (current && previous) ? getScore(current) - getScore(previous) : null;
        
        let rank = null;
        if (current) {
          const allCurrent = await db.select().from(monthlyEmployeePerformance)
            .where(and(eq(monthlyEmployeePerformance.month, currentMonth), eq(monthlyEmployeePerformance.year, currentYear)))
            .orderBy(desc(monthlyEmployeePerformance.finalScore));
          rank = allCurrent.findIndex(p => p.employeeId === userId) + 1;
        }
        
        const chartData = allHistory.slice(0, 12).reverse().map(normalizeChartItem);
        
        return res.json({
          period: "monthly",
          current: current ? { ...current, rank } : null,
          previous,
          trend,
          chartData,
          summary: {
            avgScore: allHistory.reduce((s: number, h: any) => s + getScore(h), 0) / allHistory.length,
            totalMonths: allHistory.length
          }
        });
      }
      
      if (period === "quarterly") {
        const currentQ = Math.ceil(currentMonth / 3);
        const qMonths = [(currentQ - 1) * 3 + 1, (currentQ - 1) * 3 + 2, (currentQ - 1) * 3 + 3];
        const currentQData = allHistory.filter(h => h.year === currentYear && qMonths.includes(h.month));
        
        const prevQ = currentQ === 1 ? 4 : currentQ - 1;
        const prevQYear = currentQ === 1 ? currentYear - 1 : currentYear;
        const prevQMonths = [(prevQ - 1) * 3 + 1, (prevQ - 1) * 3 + 2, (prevQ - 1) * 3 + 3];
        const prevQData = allHistory.filter(h => h.year === prevQYear && prevQMonths.includes(h.month));
        
        const avgCurrent = currentQData.length > 0 ? currentQData.reduce((s: number, h: any) => s + getScore(h), 0) / currentQData.length : 0;
        const avgPrev = prevQData.length > 0 ? prevQData.reduce((s: number, h: any) => s + getScore(h), 0) / prevQData.length : 0;
        
        const trend = (currentQData.length > 0 && prevQData.length > 0) ? avgCurrent - avgPrev : null;
        
        const chartData: any[] = [];
        for (let yr = currentYear - 1; yr <= currentYear; yr++) {
          for (let q = 1; q <= 4; q++) {
            const ms = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
            const qd = allHistory.filter(h => h.year === yr && ms.includes(h.month));
            if (qd.length > 0) {
              const avgScore = qd.reduce((s: number, h: any) => s + getScore(h), 0) / qd.length;
              chartData.push({
                label: `Q${q} ${yr}`,
                score: avgScore,
                ...avgSubScores(qd)
              });
            }
          }
        }
        
        return res.json({
          period: "quarterly",
          current: currentQData.length > 0 ? { totalScore: avgCurrent, ...avgSubScores(currentQData), quarter: currentQ, year: currentYear, monthCount: currentQData.length } : null,
          previous: prevQData.length > 0 ? { totalScore: avgPrev, ...avgSubScores(prevQData), quarter: prevQ, year: prevQYear, monthCount: prevQData.length } : null,
          trend,
          chartData,
          summary: { avgScore: allHistory.reduce((s: number, h: any) => s + getScore(h), 0) / allHistory.length, totalMonths: allHistory.length }
        });
      }
      
      if (period === "yearly") {
        const currentYearData = allHistory.filter(h => h.year === currentYear);
        const prevYearData = allHistory.filter(h => h.year === currentYear - 1);
        
        const avgCurrent = currentYearData.length > 0 ? currentYearData.reduce((s: number, h: any) => s + getScore(h), 0) / currentYearData.length : 0;
        const avgPrev = prevYearData.length > 0 ? prevYearData.reduce((s: number, h: any) => s + getScore(h), 0) / prevYearData.length : 0;
        
        const trend = (currentYearData.length > 0 && prevYearData.length > 0) ? avgCurrent - avgPrev : null;
        
        const chartData = allHistory.slice(0, 24).reverse().map(normalizeChartItem);
        
        return res.json({
          period: "yearly",
          current: currentYearData.length > 0 ? { totalScore: avgCurrent, year: currentYear, monthCount: currentYearData.length } : null,
          previous: prevYearData.length > 0 ? { totalScore: avgPrev, year: currentYear - 1, monthCount: prevYearData.length } : null,
          trend,
          chartData,
          summary: { avgScore: allHistory.reduce((s: number, h: any) => s + getScore(h), 0) / allHistory.length, totalMonths: allHistory.length }
        });
      }
      
      // all-time
      const allScores = allHistory.map(h => getScore(h));
      const chartData = allHistory.slice().reverse().map(normalizeChartItem);
      
      return res.json({
        period: "all",
        current: { totalScore: allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length, monthCount: allScores.length },
        previous: null,
        trend: null,
        chartData,
        summary: { avgScore: allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length, bestScore: Math.max(...allScores), worstScore: Math.min(...allScores), totalMonths: allScores.length }
      });
    } catch (error: any) {
      console.error("Error fetching period performance:", error);
      res.status(500).json({ message: "Performans periyod verisi alinamadi" });
    }
  });


  // POST /api/my-performance/ai-tips - AI motivasyon onerileri
  router.post("/api/my-performance/ai-tips", isAuthenticated, async (req: any, res) => {
    try {
      const { performance } = req.body;
      
      // Use OpenAI to generate personalized tips
      const prompt = `Sen bir performans kocusun. Asagidaki puanlara gore Turkce olarak 5 kisa motivasyon onerisi yaz (her biri 1-2 cumle).

Puanlar (100 uzerinden):
- Devam: ${performance?.attendanceScore || 0}/20
- Checklist: ${performance?.checklistScore || 0}/20
- Gorevler: ${performance?.taskScore || 0}/15
- Müşteri: ${performance?.customerRatingScore || 0}/15
- Yonetici: ${performance?.managerRatingScore || 0}/20

Dusuk puanli alanlara odaklan ve pozitif, motive edici ol. JSON dizisi olarak yanit ver: ["oneri1", "oneri2", ...]`;
      
      try {
        const OpenAI = require("openai");
        const openai = new OpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        });
        
        const content = completion.choices[0]?.message?.content || "[]";
        const tips = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        res.json({ tips });
      } catch (error: any) {
        console.error("OpenAI error:", error);
        res.json({
          tips: [
            "Devam puaninizi artirmak icin mesai saatlerine dikkat edin.",
            "Gunluk checklistleri zamaninda tamamlayin.",
            "Müşterilere güler yüzlü ve hızlı hizmet verin.",
            "Ekip arkadaslarinizla iyi iletisim kurun.",
            "Egitim programlarini takip edin ve tamamlayin."
          ]
        });
      }
    } catch (error: any) {
      console.error("Error generating AI tips:", error);
      res.status(500).json({ message: "Oneriler olusturulamadi" });
    }
  });

    }
  });



  router.post("/api/manager-ratings", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const managerId = req.user?.id;

      if (!["admin", "supervisor", "coach"].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const {
        employeeId, branchId, month, year,
        workPerformanceRating, teamworkRating, initiativeRating,
        customerRelationsRating, punctualityRating,
        strengths, areasToImprove, generalComment
      } = req.body;

      const ratings = [workPerformanceRating, teamworkRating, initiativeRating, customerRelationsRating, punctualityRating];
      if (ratings.some(r => !r || r < 1 || r > 5)) {
        return res.status(400).json({ message: "Tum puanlar 1-5 arasi olmali" });
      }

      const averageRating = (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2);

      const [rating] = await db.insert(managerMonthlyRatings).values({
        managerId,
        employeeId,
        branchId,
        month,
        year,
        workPerformanceRating,
        teamworkRating,
        initiativeRating,
        customerRelationsRating,
        punctualityRating,
        averageRating,
        strengths,
        areasToImprove,
        generalComment,
        status: "submitted",
      }).returning();

      res.json({ success: true, rating });
    } catch (error: any) {
      console.error("Error creating manager rating:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Bu personeli bu ay zaten degerlendirdiniz" });
      }
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });
  // Branch audit comparison endpoint
  router.get("/api/branch-audit-comparison", isAuthenticated, async (req: any, res) => {
    try {
      // Get all completed audits with branch info
      const allAudits = await db.select({
        id: auditInstances.id,
        branchId: auditInstances.branchId,
        totalScore: auditInstances.totalScore,
        maxScore: auditInstances.maxScore,
        auditDate: auditInstances.auditDate,
        status: auditInstances.status,
      })
      .from(auditInstances)
      .where(eq(auditInstances.status, "completed"));

      const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));
      const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

      // Calculate average scores per branch
      const branchStats = new Map<number, { scores: number[], audits: number }>();
      
      for (const audit of allAudits) {
        if (audit.branchId && audit.totalScore && audit.maxScore) {
          const percentage = Math.round((Number(audit.totalScore) / Number(audit.maxScore)) * 100);
          const current = branchStats.get(audit.branchId) || { scores: [], audits: 0 };
          current.scores.push(percentage);
          current.audits++;
          branchStats.set(audit.branchId, current);
        }
      }

      // Build comparison data
      const comparisonData = [];
      for (const [branchId, stats] of branchStats) {
        const avgScore = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
        const maxScore = Math.max(...stats.scores);
        const minScore = Math.min(...stats.scores);
        comparisonData.push({
          branchId,
          branchName: branchMap.get(branchId) || `Şube ${branchId}`,
          averageScore: avgScore,
          maxScore,
          minScore,
          auditCount: stats.audits
        });
      }

      // Sort by average score descending
      comparisonData.sort((a, b) => b.averageScore - a.averageScore);

      res.json(comparisonData);
    } catch (error: any) {
      console.error("Error fetching branch comparison:", error);
      res.status(500).json({ message: "Veri alinamadi" });
    }
  });

  // ============================================
  // CEO COMMAND CENTER ENDPOINTS
  // ============================================
  
  // CEO Command Center - streamlined dashboard with real data
  router.get("/api/ceo/command-center", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'cgo', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erisim yetkiniz yok" });
      }

      const [
        allBranches,
        allUsers,
        allFaults,
        allAudits,
        allEquipment,
        allChecklistCompletions,
        allProductComplaints,
        allLeaveRequests,
        allProjects
      ] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(auditInstances),
        db.select().from(equipment),
        db.select().from(checklistCompletions),
        db.select().from(productComplaints),
        db.select().from(leaveRequests),
        db.select().from(franchiseProjects)
      ]);

      // ======= ACIL UYARILAR =======
      const urgentAlerts: Array<{ type: string; severity: 'critical' | 'warning'; message: string; count?: number }> = [];

      const openFaults = allFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
      const criticalFaults = openFaults.filter((f: any) => f.priority === 'critical');
      if (criticalFaults.length > 0) {
        urgentAlerts.push({ type: 'fault', severity: 'critical', message: `${criticalFaults.length} kritik ariza cozum bekliyor`, count: criticalFaults.length });
      }

      const brokenEquipment = allEquipment.filter((e: any) => e.status === 'broken' || e.status === 'maintenance');
      if (brokenEquipment.length > 0) {
        urgentAlerts.push({ type: 'equipment', severity: brokenEquipment.filter((e: any) => e.status === 'broken').length > 0 ? 'critical' : 'warning', message: `${brokenEquipment.length} ekipman calismıyor veya bakimda`, count: brokenEquipment.length });
      }

      const pendingLeaves = allLeaveRequests.filter((l: any) => l.status === 'pending');
      if (pendingLeaves.length >= 3) {
        urgentAlerts.push({ type: 'leave', severity: 'warning', message: `${pendingLeaves.length} izin talebi onay bekliyor`, count: pendingLeaves.length });
      }

      const openComplaints = allProductComplaints.filter((c: any) => c.status === 'open' || c.status === 'investigating');
      if (openComplaints.length > 0) {
        urgentAlerts.push({ type: 'complaint', severity: openComplaints.some((c: any) => c.severity === 'critical') ? 'critical' : 'warning', message: `${openComplaints.length} urun sikayeti acik`, count: openComplaints.length });
      }

      // ======= CGO / SUBE SAGLIK =======
      const branchScores = allBranches.map(b => {
        const branchFaults = allFaults.filter(f => f.branchId === b.id);
        const openBranchFaults = branchFaults.filter((f: any) => f.status === 'open' || f.status === 'in_progress');
        const completedAudits = allAudits.filter((a: any) => a.branchId === b.id && a.status === 'completed');
        const faultPenalty = Math.min(openBranchFaults.length * 8, 40);
        const auditBonus = completedAudits.length > 0 ? 10 : 0;
        return { id: b.id, name: b.name, score: Math.max(30, 100 - faultPenalty + auditBonus), openFaults: openBranchFaults.length };
      });
      const avgBranchScore = branchScores.length > 0 ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length) : 0;
      const healthyCount = branchScores.filter(b => b.score >= 80).length;
      const warningCount = branchScores.filter(b => b.score >= 60 && b.score < 80).length;
      const criticalCount = branchScores.filter(b => b.score < 60).length;
      const worstBranches = branchScores.sort((a, b) => a.score - b.score).slice(0, 2);

      const activeProjectsCount = allProjects.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length;

      const cgoSummary = {
        label: 'Sube Sagligi',
        source: 'CGO',
        status: criticalCount > 0 ? 'critical' as const : warningCount > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: `${healthyCount}/${allBranches.length} saglikli`,
        details: [
          { key: 'Ortalama Skor', value: `${avgBranchScore}/100` },
          { key: 'Uyari', value: `${warningCount} sube` },
          { key: 'Kritik', value: `${criticalCount} sube` },
          { key: 'Acilis Projesi', value: `${activeProjectsCount} aktif` }
        ],
        alert: criticalCount > 0 ? `${worstBranches.map(b => b.name).join(', ')} acil dikkat gerektiriyor` : null
      };

      // ======= MUHASEBE/IK =======
      const activeEmployees = allUsers.filter(u => u.isActive);
      const branchStaff = activeEmployees.filter(u => ['staff', 'supervisor', 'branch_manager'].includes(u.role));
      const hqStaff = activeEmployees.filter(u => !['staff', 'supervisor', 'branch_manager', 'ceo'].includes(u.role));
      const approvedLeaves = allLeaveRequests.filter((l: any) => l.status === 'approved');

      const muhasebeIkSummary = {
        label: 'Personel Durumu',
        source: 'Muhasebe & IK',
        status: pendingLeaves.length >= 5 ? 'warning' as const : 'healthy' as const,
        mainMetric: `${activeEmployees.length} aktif personel`,
        details: [
          { key: 'HQ Kadro', value: `${hqStaff.length} kisi` },
          { key: 'Sube Personeli', value: `${branchStaff.length} kisi` },
          { key: 'Bekleyen Izin', value: `${pendingLeaves.length} talep` },
          { key: 'Onayli Izin', value: `${approvedLeaves.length} kisi` }
        ],
        alert: pendingLeaves.length >= 5 ? `${pendingLeaves.length} izin talebi onay bekliyor` : null
      };

      // ======= FABRIKA =======
      const activeEquipment = allEquipment.filter((e: any) => e.isActive === true);
      const uptimePercent = allEquipment.length > 0 ? Math.round((activeEquipment.length / allEquipment.length) * 100) : 100;

      const fabrikaSummary = {
        label: 'Fabrika & Ekipman',
        source: 'Fabrika Muduru',
        status: brokenEquipment.filter((e: any) => e.status === 'broken').length > 0 ? 'critical' as const : brokenEquipment.length > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: `Ekipman uptime %${uptimePercent}`,
        details: [
          { key: 'Toplam Ekipman', value: `${allEquipment.length} adet` },
          { key: 'Aktif', value: `${activeEquipment.length} adet` },
          { key: 'Bakimda/Arızali', value: `${brokenEquipment.length} adet` },
          { key: 'Ürün Şikayeti', value: `${openComplaints.length} açık` }
        ],
        alert: brokenEquipment.filter((e: any) => e.status === 'broken').length > 0 ? `${brokenEquipment.filter((e: any) => e.status === 'broken').length} ekipman arizali` : null
      };

      // ======= COACH / DENETIM =======
      const completedAuditsAll = allAudits.filter((a: any) => a.status === 'completed');
      const recentAudits = completedAuditsAll.filter((a: any) => {
        const d = new Date(a.completedAt || a.createdAt);
        return d > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      });
      const avgAuditScore = recentAudits.length > 0 ? Math.round(recentAudits.reduce((s: number, a: any) => s + (a.totalScore || 0), 0) / recentAudits.length) : 0;

      const coachSummary = {
        label: 'Denetim Sonuclari',
        source: 'Coach',
        status: avgAuditScore >= 80 ? 'healthy' as const : avgAuditScore >= 60 ? 'warning' as const : recentAudits.length === 0 ? 'warning' as const : 'critical' as const,
        mainMetric: recentAudits.length > 0 ? `Ort. skor: ${avgAuditScore}/100` : 'Son 30 gun denetim yok',
        details: [
          { key: 'Toplam Denetim', value: `${completedAuditsAll.length}` },
          { key: 'Son 30 Gun', value: `${recentAudits.length} denetim` },
          { key: 'Ort. Puan', value: recentAudits.length > 0 ? `${avgAuditScore}/100` : '-' }
        ],
        alert: recentAudits.length === 0 ? 'Son 30 gunde hicbir sube denetlenmemis' : avgAuditScore < 70 ? 'Denetim skorlari dusuk, iyilestirme gerekli' : null
      };

      // ======= KALITE KONTROL =======
      const resolvedComplaints = allProductComplaints.filter((c: any) => c.status === 'resolved' || c.status === 'closed');
      const resolutionRate = allProductComplaints.length > 0 ? Math.round((resolvedComplaints.length / allProductComplaints.length) * 100) : 100;

      const kaliteSummary = {
        label: 'Kalite & Sikayetler',
        source: 'Kalite Kontrol',
        status: openComplaints.some((c: any) => c.severity === 'critical') ? 'critical' as const : openComplaints.length > 0 ? 'warning' as const : 'healthy' as const,
        mainMetric: openComplaints.length === 0 ? 'Acik sikayet yok' : `${openComplaints.length} acik sikayet`,
        details: [
          { key: 'Toplam Sikayet', value: `${allProductComplaints.length}` },
          { key: 'Acik', value: `${openComplaints.length}` },
          { key: 'Cozum Orani', value: `%${resolutionRate}` }
        ],
        alert: openComplaints.some((c: any) => c.severity === 'critical') ? 'Kritik oncelikli sikayet var!' : null
      };

      // ======= EGITIM / TRAINER =======
      const totalCompletions = allChecklistCompletions.length;
      const completedCompletions = allChecklistCompletions.filter((c: any) => c.status === 'completed');
      const checklistRate = totalCompletions > 0 ? Math.round((completedCompletions.length / totalCompletions) * 100) : 0;

      const egitimSummary = {
        label: 'Egitim & Checklist',
        source: 'Trainer',
        status: checklistRate >= 80 ? 'healthy' as const : checklistRate >= 60 ? 'warning' as const : 'critical' as const,
        mainMetric: `Checklist tamamlama: %${checklistRate}`,
        details: [
          { key: 'Toplam Gorev', value: `${totalCompletions}` },
          { key: 'Tamamlanan', value: `${completedCompletions.length}` },
          { key: 'Tamamlama Orani', value: `%${checklistRate}` }
        ],
        alert: checklistRate < 60 ? 'Checklist tamamlama orani cok dusuk!' : null
      };

      // ======= EN DUSUK 3 YONETICI =======
      const hqRoleSet = new Set(['muhasebe_ik', 'muhasebe', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'fabrika_mudur', 'teknik', 'ik']);
      const roleDeptMap: Record<string, string> = {
        'muhasebe_ik': 'Muhasebe & IK', 'muhasebe': 'Muhasebe', 'satinalma': 'Satınalma',
        'coach': 'Coach', 'marketing': 'Pazarlama', 'trainer': 'Egitim',
        'kalite_kontrol': 'Kalite Kontrol', 'fabrika_mudur': 'Fabrika', 'teknik': 'Teknik', 'ik': 'IK'
      };

      const seenNames = new Set<string>();
      const hqManagers = allUsers.filter(u => {
        if (!hqRoleSet.has(u.role) || !u.isActive) return false;
        const name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
        if (!name || seenNames.has(name.toLocaleLowerCase('tr-TR'))) return false;
        seenNames.add(name.toLocaleLowerCase('tr-TR'));
        if (u.username && /^(test|e2e|api[-_])/i.test(u.username)) return false;
        if (/^(Test |E2E |API |Admin )/i.test(name)) return false;
        return true;
      });

      const allTasks = await db.select().from(tasks);
      const managersWithScores = hqManagers.map(m => {
        const userFaults = allFaults.filter((f: any) => f.assignedToId === m.id);
        const resolvedFaults = userFaults.filter((f: any) => f.status === 'resolved' || f.status === 'closed');
        const faultRate = userFaults.length > 0 ? Math.round((resolvedFaults.length / userFaults.length) * 100) : 80;
        const userTasks = allTasks.filter((t: any) => t.assignedToId === m.id);
        const completedUserTasks = userTasks.filter((t: any) => t.status === 'onaylandi' || t.status === 'completed');
        const taskRate = userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 80;
        const score = Math.round((faultRate * 0.5 + taskRate * 0.5));
        return {
          id: m.id,
          name: ((m.firstName || '') + ' ' + (m.lastName || '')).trim(),
          department: roleDeptMap[m.role] || m.role,
          score
        };
      }).sort((a, b) => a.score - b.score);

      const bottomManagers = managersWithScores.slice(0, 3);

      const runningEquipment = allEquipment.filter((e: any) => e.isActive);
      const uptimeRate = allEquipment.length > 0 ? Math.round((runningEquipment.length / allEquipment.length) * 100) : 100;

      res.json({
        urgentAlerts,
        departments: [cgoSummary, muhasebeIkSummary, fabrikaSummary, coachSummary, kaliteSummary, egitimSummary],
        bottomManagers,
        kpiSummary: {
          totalBranches: allBranches.length,
          totalEmployees: activeEmployees.length,
          activeFaults: openFaults.length,
          equipmentUptime: uptimeRate,
          branchAvgScore: avgBranchScore,
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching command center data:", error);
      res.status(500).json({ message: "Veriler alinamadi" });
    }
  });


    // CEO AI Assistant
  router.post("/api/ceo/ai-assistant", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only allow CEO and Admin roles
      if (!['ceo', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Bu ozellige erisim yetkiniz yok" });
      }

      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Soru gerekli" });
      }

      // Gather context data for AI
      const [branchesData, usersData, faultsData, feedbackData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(customerFeedback)
      ]);

      const contextSummary = 'DOSPRESSO Sirket Durumu:\n' +
        '- Toplam Sube: ' + branchesData.length + '\n' +
        '- Toplam Personel: ' + usersData.filter(u => u.isActive).length + '\n' +
        '- Aktif Arizalar: ' + faultsData.filter((f: any) => f.status === 'open' || f.status === 'in_progress').length + '\n' +
        '- Son 30 Gün Müşteri Geri Bildirimi: ' + feedbackData.length + '\n' +
        '- Ortalama Müşteri Puanı: ' + (feedbackData.length > 0 ? (feedbackData.reduce((sum, f) => sum + (f.overallRating || 0), 0) / feedbackData.length).toFixed(1) : 'Veri yok');

      const systemPrompt = 'Sen DOSPRESSO kahve zincirinin CEO\'su icin ozel bir AI danismanisin. CEO\'nun sorularina sirket verileri ve ic gorulere dayanarak cevap veriyorsun.\n\nGuncel Sirket Durumu:\n' + contextSummary + '\n\nYanitlarini su sekilde ver:\n1. Net ve ozlu ol\n2. Somut sayilar ve oneriler sun\n3. Riskleri ve firsatlari acikca belirt\n4. Aksiyon onerileri sun\n5. Turkce yaz';

      const ceoApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!ceoApiKey) {
        return res.status(500).json({ message: "OpenAI API key yapilandirilmamis" });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ceoApiKey
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const aiResponse = await response.json();
      let answer = aiResponse.choices[0]?.message?.content || 'Yanit alinamadi';
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
        answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }

      res.json({ answer });
    } catch (error: any) {
      handleApiError(res, error, "CEOAIAssistant");
    }
  });

  // Global AI Chat endpoint for all roles with role-based context + policy enforcement
  router.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: "Soru gerekli" });
      }

      const policyResult = await checkAndEnforcePolicy(
        question,
        String(user.id),
        user.role || "barista",
        user.employeeType || null,
        user.branchId || null
      );

      if (policyResult.shouldBlock) {
        return res.json({ answer: policyResult.blockMessage });
      }

      const { systemPrompt } = await gatherAIAssistantContext(user);

      let policyAwarePrompt = systemPrompt;
      if (policyResult.deniedDomains.length > 0) {
        const deniedLabels = policyResult.deniedDomains.map(d => policyResult.policyResults.find(p => p.domainKey === d)?.domainLabel || d).join(", ");
        policyAwarePrompt += `\n\n=== VERI ERISIM KISITLAMALARI ===\nKESINLIKLE UYULMASI GEREKEN KURAL: Kullanicinin su veri alanlarina erisimi YOKTUR: ${deniedLabels}.\nBu konularda kesinlikle bilgi paylasma. Kibarca yetki olmadığını belirt ve erisebilecegi konulari oner.`;
      }
      if (policyResult.aggregationPrompt) {
        policyAwarePrompt += `\n\n=== AGREGASYON KURALLARI ===\nAsagidaki alanlarda YALNIZCA ozet/anonim/istatistiksel bilgi paylasabilirsin. KESINLIKLE bireysel isim, kimlik, mutlak tutar verme:\n${policyResult.aggregationPrompt}`;
      }
      if (policyResult.scopePrompt) {
        policyAwarePrompt += `\n\n=== KAPSAM KISITLAMALARI ===\n${policyResult.scopePrompt}`;
      }

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "OpenAI API key yapilandirilmamis" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: policyAwarePrompt },
            { role: "user", content: question }
          ],
          temperature: 0.7,
          max_tokens: 1200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error("OpenAI API error");
      }

      const aiResponse = await response.json();
      let answer = aiResponse.choices[0]?.message?.content || "Yanit alinamadi";
      
      const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
      const questionLower = question.toLocaleLowerCase('tr-TR');
      if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
        answer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
      }

      res.json({ answer });
    } catch (error: any) {
      handleApiError(res, error, "AIChat");
    }
  });
    // ============ NOTIFICATION ENDPOINTS ============
  
  // GET /api/notifications - Get user's notifications with optional filters
  // All users see their own notifications by default
  // Admin/owner can pass viewAll=true to see all system notifications
  router.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { type, branchId, viewAll } = req.query;
      const pag = parsePagination(req.query);
      
      const userRole = user.role as any;
      const isAdmin = userRole === 'admin' || userRole === 'ceo';
      const wantsAll = (viewAll === 'true' || viewAll === '1') && isAdmin;
      
      const conditions: any[] = [];
      
      if (wantsAll) {
        if (branchId && branchId !== 'all') {
          conditions.push(eq(notifications.branchId, parseInt(branchId as string)));
        }
      } else {
        conditions.push(eq(notifications.userId, user.id));
      }
      
      if (type) {
        conditions.push(eq(notifications.type, type as string));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const results = await db.select().from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(pag.limit)
        .offset(pag.offset);

      if (pag.wantsPagination) {
        const [totalResult] = await db.select({ count: count() }).from(notifications).where(whereClause);
        const total = totalResult?.count ?? 0;
        res.json(wrapPaginatedResponse(results, total, pag));
      } else {
        res.json(results);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Bildirimler alınamadı" });
    }
  });

  // GET /api/notifications/unread-count - Get unread notification count
  router.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Okunmamış bildirim sayısı alınamadı" });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  router.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id, user.id);
      if (!success) {
        return res.status(404).json({ message: "Bildirim bulunamadı" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Bildirim güncellenemedi" });
    }
  });

  // PATCH /api/notifications/mark-all-read - Mark all notifications as read
  router.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Bildirimler güncellenemedi" });
    }
  });


  // ========================================
  // NOTIFICATION PREFERENCES
  // ========================================

  router.get('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const [row] = await db.select({ notificationPreferences: users.notificationPreferences })
        .from(users).where(eq(users.id, user.id));
      res.json(row?.notificationPreferences || {});
    } catch (error: any) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Tercihler alinamadi" });
    }
  });

  router.patch('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const prefs = req.body;

      const NEVER_MUTABLE = ['sla_breach', 'pin_lockout', 'critical_fault', 'security_alert', 'fault_alert'];
      for (const key of NEVER_MUTABLE) {
        if (prefs[key] === false) {
          delete prefs[key];
        }
      }

      await db.update(users)
        .set({ notificationPreferences: prefs, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      res.json({ success: true, preferences: prefs });
    } catch (error: any) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Tercihler guncellenemedi" });
    }
  });

  // ========================================
  // STAFF EVALUATIONS & PERFORMANCE SUMMARY
  // ========================================

  // GET /api/personnel/:id/performance-summary
  router.get('/api/personnel/:id/performance-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;

      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      // 1. Attendance from performance scores
      const perfScores = await db.select({
        avgAttendance: avg(employeePerformanceScores.attendanceScore),
        avgChecklist: avg(employeePerformanceScores.checklistScore),
        avgDaily: avg(employeePerformanceScores.dailyTotalScore),
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      // 2. Task completion rate
      const taskStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
      }).from(tasks)
        .where(eq(tasks.assignedToId, targetId));

      // 3. Checklist completion
      const checklistStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${checklistCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(checklistCompletions)
        .where(eq(checklistCompletions.userId, targetId));

      // 4. Training progress
      const trainingStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(trainingCompletions)
        .where(eq(trainingCompletions.userId, targetId));

      // 5. Role-specific KPI calculation
      const targetUser = await storage.getUserById(targetId);
      const targetRole = (targetUser?.role || 'barista') as UserRoleType;
      const targetIsHQ = isHQRole(targetRole);

      let roleKpi = 0;
      let roleKpiLabel = "Denetim Puanı";

      if (targetRole === 'fabrika' || targetRole === 'fabrika_mudur') {
        roleKpiLabel = "Zayi/Fire Oranı";
        try {
          const batchStats = await db.select({
            total: count(),
            rejected: sql`COUNT(CASE WHEN ${productionBatches.status} = 'rejected' THEN 1 END)`,
          }).from(productionBatches);
          const bTotal = Number(batchStats[0]?.total || 0);
          const bRejected = Number(batchStats[0]?.rejected || 0);
          roleKpi = bTotal > 0 ? Math.max(0, 100 - (bRejected / bTotal) * 100) : 80;
        } catch (error: any) { roleKpi = 80; }

      } else if (targetRole === 'satinalma') {
        roleKpiLabel = "Tedarik Performansı";
        try {
          const poStats = await db.select({
            total: count(),
            onTime: sql`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate} THEN 1 END)`,
            delivered: sql`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL THEN 1 END)`,
          }).from(purchaseOrders);
          const poTotal = Number(poStats[0]?.delivered || 0);
          const poOnTime = Number(poStats[0]?.onTime || 0);
          roleKpi = poTotal > 0 ? (poOnTime / poTotal) * 100 : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'trainer') {
        roleKpiLabel = "Eğitim Etkinliği";
        try {
          const trAllStats = await db.select({
            total: count(),
            completed: sql`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
          }).from(trainingCompletions);
          const trAllTotal = Number(trAllStats[0]?.total || 0);
          const trAllCompleted = Number(trAllStats[0]?.completed || 0);
          const completionRate = trAllTotal > 0 ? (trAllCompleted / trAllTotal) * 100 : 75;
          const complaintStats = await db.select({ total: count() }).from(productComplaints)
            .where(eq(productComplaints.complaintType, 'taste'));
          const recipeErrors = Number(complaintStats[0]?.total || 0);
          const errorPenalty = Math.min(recipeErrors * 2, 30);
          roleKpi = Math.max(0, completionRate - errorPenalty);
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'coach') {
        roleKpiLabel = "Şube Gelişim Skoru";
        try {
          const auditAvg = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits);
          roleKpi = auditAvg[0]?.avgScore ? Number(auditAvg[0].avgScore) : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'kalite_kontrol') {
        roleKpiLabel = "Kalite Uyum Oranı";
        try {
          const compStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${productComplaints.status} = 'resolved' THEN 1 END)`,
          }).from(productComplaints);
          const cTotal = Number(compStats[0]?.total || 0);
          const cResolved = Number(compStats[0]?.resolved || 0);
          roleKpi = cTotal > 0 ? (cResolved / cTotal) * 100 : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'muhasebe' || targetRole === 'muhasebe_ik') {
        roleKpiLabel = "Raporlama Performansı";
        try {
          const muhasebeTaskStats = await db.select({
            total: count(),
            completed: sql`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
          }).from(tasks).where(eq(tasks.assignedToId, targetId));
          const mTotal = Number(muhasebeTaskStats[0]?.total || 0);
          const mCompleted = Number(muhasebeTaskStats[0]?.completed || 0);
          roleKpi = mTotal > 0 ? (mCompleted / mTotal) * 100 : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'teknik') {
        roleKpiLabel = "Arıza Çözüm Performansı";
        try {
          const faultStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${equipmentFaults.status} = 'cozuldu' THEN 1 END)`,
          }).from(equipmentFaults);
          const fTotal = Number(faultStats[0]?.total || 0);
          const fResolved = Number(faultStats[0]?.resolved || 0);
          roleKpi = fTotal > 0 ? (fResolved / fTotal) * 100 : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'destek') {
        roleKpiLabel = "Destek Çözüm Oranı";
        try {
          const supportStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${equipmentServiceRequests.status} = 'completed' OR ${equipmentServiceRequests.status} = 'resolved' THEN 1 END)`,
          }).from(equipmentServiceRequests);
          const sTotal = Number(supportStats[0]?.total || 0);
          const sResolved = Number(supportStats[0]?.resolved || 0);
          roleKpi = sTotal > 0 ? (sResolved / sTotal) * 100 : 75;
        } catch (error: any) { roleKpi = 75; }

      } else if (targetRole === 'admin' || targetRole === 'ceo' || targetRole === 'cgo' || targetRole === 'yatirimci_hq' || targetRole === 'marketing') {
        roleKpiLabel = "Operasyonel Skor";
        try {
          const branchAvg = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits);
          roleKpi = branchAvg[0]?.avgScore ? Number(branchAvg[0].avgScore) : 75;
        } catch (error: any) { roleKpi = 75; }

      } else {
        roleKpiLabel = "Denetim Puanı";
        if (targetUser?.branchId) {
          try {
            const auditScores = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits)
              .where(eq(qualityAudits.branchId, targetUser.branchId));
            roleKpi = auditScores[0]?.avgScore ? Number(auditScores[0].avgScore) : 0;
          } catch (error: any) { roleKpi = 0; }
        }
      }

      // 6. Staff evaluation scores
      const evalScores = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, targetId));

      const attendanceRate = perfScores[0]?.avgAttendance ? Number(perfScores[0].avgAttendance) : 0;
      const taskTotal = Number(taskStats[0]?.total || 0);
      const taskCompleted = Number(taskStats[0]?.completed || 0);
      const taskCompletionRate = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

      const clTotal = Number(checklistStats[0]?.total || 0);
      const clCompleted = Number(checklistStats[0]?.completed || 0);
      const checklistScore = clTotal > 0 ? (clCompleted / clTotal) * 100 : 0;

      const trTotal = Number(trainingStats[0]?.total || 0);
      const trCompleted = Number(trainingStats[0]?.completed || 0);
      const trainingProgress = trTotal > 0 ? (trCompleted / trTotal) * 100 : 0;

      const evaluationScore = evalScores[0]?.avgScore ? Number(evalScores[0].avgScore) : 0;

      const genelSkor = targetIsHQ
        ? (trainingProgress * 0.30 + roleKpi * 0.35 + evaluationScore * 0.35)
        : (attendanceRate * 0.15 + taskCompletionRate * 0.20 + checklistScore * 0.20 + trainingProgress * 0.10 + roleKpi * 0.15 + evaluationScore * 0.20);

      const hiddenMetrics = targetIsHQ
        ? ['attendanceRate', 'taskCompletion', 'checklistScore']
        : [];

      res.json({
        overallScore: Math.round(genelSkor * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        taskCompletion: Math.round(taskCompletionRate * 10) / 10,
        checklistScore: Math.round(checklistScore * 10) / 10,
        trainingProgress: Math.round(trainingProgress * 10) / 10,
        inspectionScore: Math.round(roleKpi * 10) / 10,
        roleKpi: Math.round(roleKpi * 10) / 10,
        roleKpiLabel,
        evaluationScore: Math.round(evaluationScore * 10) / 10,
        isHQ: targetIsHQ,
        hiddenMetrics,
      });
    } catch (error: any) {
      console.error("Error fetching performance summary:", error);
      res.status(500).json({ message: "Performans özeti alınırken hata oluştu" });
    }
  });

  // POST /api/staff-evaluations
  router.post('/api/staff-evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['coach', 'admin', 'supervisor', 'yatirimci_hq'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Değerlendirme oluşturma yetkiniz yok" });
      }

      const body = req.body;
      const criteria = ['customerBehavior', 'friendliness', 'knowledgeExperience', 'dressCode', 'cleanliness', 'teamwork', 'punctuality', 'initiative'];
      for (const c of criteria) {
        const val = Number(body[c]);
        if (!Number.isInteger(val) || val < 1 || val > 5) {
          return res.status(400).json({ message: `${c} 1-5 arasında olmalıdır` });
        }
      }

      // Suistimal korumasi: 24 saat kurali
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentEval] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, body.employeeId),
          gte(staffEvaluations.createdAt, twentyFourHoursAgo)
        ));
      if (recentEval && recentEval.cnt > 0) {
        return res.status(429).json({ message: "Bu personeli son 24 saat içinde zaten değerlendirdiniz. Lütfen yarın tekrar deneyin." });
      }

      // Suistimal korumasi: Ayda max 2 degerlendirme
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const [monthlyCount] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, body.employeeId),
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd)
        ));
      if (monthlyCount && monthlyCount.cnt >= 2) {
        return res.status(429).json({ message: "Bu personel için bu ay maksimum 2 değerlendirme yapabilirsiniz." });
      }

      const avgCriteria = criteria.reduce((sum, c) => sum + Number(body[c]), 0) / criteria.length;
      const overallScore = (avgCriteria / 5) * 100;

      const evalData = {
        employeeId: body.employeeId,
        evaluatorId: user.id,
        evaluatorRole: user.role,
        branchId: body.branchId || user.branchId || null,
        inspectionId: body.inspectionId || null,
        customerBehavior: Number(body.customerBehavior),
        friendliness: Number(body.friendliness),
        knowledgeExperience: Number(body.knowledgeExperience),
        dressCode: Number(body.dressCode),
        cleanliness: Number(body.cleanliness),
        teamwork: Number(body.teamwork),
        punctuality: Number(body.punctuality),
        initiative: Number(body.initiative),
        overallScore,
        notes: body.notes || null,
        evaluationType: body.evaluationType || 'standard',
      };

      const [result] = await db.insert(staffEvaluations).values(evalData).returning();
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating staff evaluation:", error);
      res.status(500).json({ message: "Değerlendirme oluşturulamadı" });
    }
  });

  // GET /api/evaluation-coverage - Sube bazli degerlendirme kapsam istatistigi (HQ/CEO)
  router.get('/api/evaluation-coverage', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const allBranches = await db.select({
        id: branches.id,
        name: branches.name,
      }).from(branches).where(eq(branches.isActive, true));

      const branchStats = [];
      let totalEmployees = 0;
      let totalEvaluated = 0;

      for (const branch of allBranches) {
        const branchEmps = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.branchId, branch.id),
            eq(users.isActive, true)
          ));

        if (branchEmps.length === 0) continue;

        const empIds = branchEmps.map(e => e.id);
        const evaluatedEmps = await db.selectDistinct({ employeeId: staffEvaluations.employeeId })
          .from(staffEvaluations)
          .where(and(
            gte(staffEvaluations.createdAt, monthStart),
            lte(staffEvaluations.createdAt, monthEnd),
            inArray(staffEvaluations.employeeId, empIds)
          ));

        const evaluatedCount = evaluatedEmps.length;
        const empCount = branchEmps.length;
        totalEmployees += empCount;
        totalEvaluated += evaluatedCount;

        branchStats.push({
          branchId: branch.id,
          branchName: branch.name,
          totalEmployees: empCount,
          evaluatedCount,
          notEvaluatedCount: empCount - evaluatedCount,
          percentage: Math.round((evaluatedCount / empCount) * 100),
        });
      }

      branchStats.sort((a, b) => a.percentage - b.percentage);

      res.json({
        branches: branchStats,
        summary: {
          totalBranches: branchStats.length,
          totalEmployees,
          totalEvaluated,
          totalNotEvaluated: totalEmployees - totalEvaluated,
          overallPercentage: totalEmployees > 0 ? Math.round((totalEvaluated / totalEmployees) * 100) : 0,
          daysLeft,
          month: now.toISOString().slice(0, 7),
        },
      });
    } catch (error: any) {
      console.error("Evaluation coverage error:", error);
      res.status(500).json({ message: "Değerlendirme kapsam bilgisi alınamadı" });
    }
  });

  // GET /api/evaluation-status - Bu aydaki degerlendirme durumu (supervisor icin)
  router.get('/api/evaluation-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!['supervisor', 'admin', 'yatirimci_hq', 'operasyon_muduru', 'bolgeMuduru', 'coach'].includes(user.role)) {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const branchId = user.role === 'supervisor' ? user.branchId : (req.query.branchId ? parseInt(req.query.branchId as string) : null);
      if (!branchId) {
        return res.json({ evaluated: [], notEvaluated: [], summary: { total: 0, evaluated: 0, notEvaluated: 0, percentage: 0 } });
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const branchEmployees = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
      }).from(users)
        .where(and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          not(eq(users.id, user.id))
        ));

      const thisMonthEvals = await db.select({
        employeeId: staffEvaluations.employeeId,
        evalCount: count(),
        lastEvalDate: max(staffEvaluations.createdAt),
      }).from(staffEvaluations)
        .where(and(
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd),
          eq(staffEvaluations.evaluatorId, user.id)
        ))
        .groupBy(staffEvaluations.employeeId);

      const evalMap = new Map(thisMonthEvals.map(e => [e.employeeId, { count: Number(e.evalCount), lastDate: e.lastEvalDate }]));

      const evaluated: any[] = [];
      const notEvaluated: any[] = [];

      for (const emp of branchEmployees) {
        const evalInfo = evalMap.get(emp.id);
        if (evalInfo && evalInfo.count > 0) {
          evaluated.push({ ...emp, evalCount: evalInfo.count, lastEvalDate: evalInfo.lastDate });
        } else {
          notEvaluated.push(emp);
        }
      }

      res.json({
        evaluated,
        notEvaluated,
        summary: {
          total: branchEmployees.length,
          evaluated: evaluated.length,
          notEvaluated: notEvaluated.length,
          percentage: branchEmployees.length > 0 ? Math.round((evaluated.length / branchEmployees.length) * 100) : 0,
          daysLeft,
        },
      });
    } catch (error: any) {
      console.error("Evaluation status error:", error);
      res.status(500).json({ message: "Değerlendirme durumu alınamadı" });
    }
  });

  // GET /api/staff-evaluations/:employeeId/limit-status - Değerlendirme limit durumu
  router.get('/api/staff-evaluations/:employeeId/limit-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const employeeId = req.params.employeeId;
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const [monthlyResult] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId),
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd)
        ));
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentResult] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId),
          gte(staffEvaluations.createdAt, twentyFourHoursAgo)
        ));
      
      const [lastEval] = await db.select({ createdAt: staffEvaluations.createdAt })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId)
        ))
        .orderBy(desc(staffEvaluations.createdAt))
        .limit(1);
      
      res.json({
        thisMonthCount: monthlyResult?.cnt || 0,
        lastEvalDate: lastEval?.createdAt?.toISOString() || null,
        canEvaluateToday: !(recentResult && recentResult.cnt > 0),
      });
    } catch (error: any) {
      console.error("Eval limit status error:", error);
      res.status(500).json({ message: "Limit durumu alınamadı" });
    }
  });

  // GET /api/staff-evaluations/:employeeId
  router.get('/api/staff-evaluations/:employeeId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const employeeId = req.params.employeeId;

      const isOwnProfile = user.id === employeeId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const evaluations = await db.select({
        id: staffEvaluations.id,
        employeeId: staffEvaluations.employeeId,
        evaluatorId: staffEvaluations.evaluatorId,
        evaluatorRole: staffEvaluations.evaluatorRole,
        branchId: staffEvaluations.branchId,
        customerBehavior: staffEvaluations.customerBehavior,
        friendliness: staffEvaluations.friendliness,
        knowledgeExperience: staffEvaluations.knowledgeExperience,
        dressCode: staffEvaluations.dressCode,
        cleanliness: staffEvaluations.cleanliness,
        teamwork: staffEvaluations.teamwork,
        punctuality: staffEvaluations.punctuality,
        initiative: staffEvaluations.initiative,
        overallScore: staffEvaluations.overallScore,
        notes: staffEvaluations.notes,
        evaluationType: staffEvaluations.evaluationType,
        createdAt: staffEvaluations.createdAt,
        evaluatorFirstName: users.firstName,
        evaluatorLastName: users.lastName,
      })
        .from(staffEvaluations)
        .leftJoin(users, eq(staffEvaluations.evaluatorId, users.id))
        .where(eq(staffEvaluations.employeeId, employeeId))
        .orderBy(desc(staffEvaluations.createdAt));

      const avgResult = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
        totalCount: count(),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, employeeId));

      const enrichedEvals = evaluations.map(e => ({
        ...e,
        evaluatorName: ((e.evaluatorFirstName || '') + ' ' + (e.evaluatorLastName || '')).trim() || null,
      }));
      res.json({
        evaluations: enrichedEvals,
        averageScore: avgResult[0]?.avgScore ? Number(avgResult[0].avgScore) : 0,
        totalCount: Number(avgResult[0]?.totalCount || 0),
      });
    } catch (error: any) {
      console.error("Error fetching staff evaluations:", error);
      res.status(500).json({ message: "Değerlendirmeler alınırken hata oluştu" });
    }
  });


  // GET /api/personnel/:id/ai-recommendations - AI Performance Coach recommendations
  router.get('/api/personnel/:id/ai-recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;
      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const perfScores = await db.select({
        avgAttendance: avg(employeePerformanceScores.attendanceScore),
        avgChecklist: avg(employeePerformanceScores.checklistScore),
        avgDaily: avg(employeePerformanceScores.dailyTotalScore),
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      const taskStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
      }).from(tasks)
        .where(eq(tasks.assignedToId, targetId));

      const checklistStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${checklistCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(checklistCompletions)
        .where(eq(checklistCompletions.userId, targetId));

      const trainingStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(trainingCompletions)
        .where(eq(trainingCompletions.userId, targetId));

      const evalScores = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, targetId));

      const disciplinaryRecords = await db.select({
        id: disciplinaryReports.id,
        reportType: disciplinaryReports.reportType,
        severity: disciplinaryReports.severity,
        subject: disciplinaryReports.subject,
        actionTaken: disciplinaryReports.actionTaken,
        status: disciplinaryReports.status,
      }).from(disciplinaryReports)
        .where(eq(disciplinaryReports.userId, targetId))
        .orderBy(desc(disciplinaryReports.createdAt))
        .limit(5);

      const targetUser = await storage.getUserById(targetId);
      let inspectionScoreVal = 0;
      if (targetUser?.branchId) {
        const auditScores = await db.select({
          avgScore: avg(qualityAudits.percentageScore),
        }).from(qualityAudits)
          .where(eq(qualityAudits.branchId, targetUser.branchId));
        inspectionScoreVal = auditScores[0]?.avgScore ? Number(auditScores[0].avgScore) : 0;
      }

      const attendanceRate = perfScores[0]?.avgAttendance ? Number(perfScores[0].avgAttendance) : 0;
      const taskTotal = Number(taskStats[0]?.total || 0);
      const taskCompleted = Number(taskStats[0]?.completed || 0);
      const taskCompletionRate = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;
      const clTotal = Number(checklistStats[0]?.total || 0);
      const clCompleted = Number(checklistStats[0]?.completed || 0);
      const checklistScore = clTotal > 0 ? (clCompleted / clTotal) * 100 : 0;
      const trTotal = Number(trainingStats[0]?.total || 0);
      const trCompleted = Number(trainingStats[0]?.completed || 0);
      const trainingProgress = trTotal > 0 ? (trCompleted / trTotal) * 100 : 0;
      const evaluationScore = evalScores[0]?.avgScore ? Number(evalScores[0].avgScore) : 0;

      const overallScore = (attendanceRate * 0.15) + (taskCompletionRate * 0.20) + (checklistScore * 0.20) + (trainingProgress * 0.10) + (inspectionScoreVal * 0.15) + (evaluationScore * 0.20);

      const performanceData = {
        attendanceRate: Math.round(attendanceRate),
        taskCompletionRate: Math.round(taskCompletionRate),
        checklistScore: Math.round(checklistScore),
        trainingProgress: Math.round(trainingProgress),
        inspectionScore: Math.round(inspectionScoreVal),
        evaluationScore: Math.round(evaluationScore),
        overallScore: Math.round(overallScore),
        disciplinaryCount: disciplinaryRecords.length,
        disciplinarySummary: disciplinaryRecords.map(d => `${d.reportType} - ${d.subject} (${d.severity})`).join('; '),
        role: targetUser?.role || 'barista',
        fullName: targetUser?.fullName || '',
      };

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Sen bir franchise kahve zincirinde (DOSPRESSO) çalışan personel için performans koçusun. Türkçe yanıt ver. Personelin performans verilerini analiz edip yapıcı öneriler sun. JSON formatında yanıt ver:
{
  "weakAreas": ["string - zayıf alanlar listesi"],
  "recommendations": ["string - iyileştirme önerileri, numaralı"],
  "targetPlan": ["string - hedef plan maddeleri"],
  "overallAdvice": "string - genel tavsiye",
  "levelRisk": boolean
}
Kurallar:
- 75 altı skorlar zayıf alan olarak belirle
- 65 altı genel skor levelRisk=true
- Önerileri somut ve uygulanabilir yap
- Türk iş hukuku ve franchise standartlarına uygun öneriler ver`
          },
          {
            role: "user",
            content: `Personel: ${performanceData.fullName} (${performanceData.role})
Genel Skor: ${performanceData.overallScore}%
Devam Oranı: ${performanceData.attendanceRate}%
Görev Tamamlama: ${performanceData.taskCompletionRate}%
Checklist Skoru: ${performanceData.checklistScore}%
Eğitim İlerlemesi: ${performanceData.trainingProgress}%
Denetim Puanı: ${performanceData.inspectionScore}%
Değerlendirme Puanı: ${performanceData.evaluationScore}%
Disiplin Kayıtları: ${performanceData.disciplinaryCount > 0 ? performanceData.disciplinarySummary : 'Yok'}

Bu verilere dayanarak performans analizi ve iyileştirme önerileri oluştur.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI yanıt üretemedi" });
      }

      const parsed = JSON.parse(content);
      res.json({
        weakAreas: parsed.weakAreas || [],
        recommendations: parsed.recommendations || [],
        targetPlan: parsed.targetPlan || [],
        overallAdvice: parsed.overallAdvice || '',
        levelRisk: parsed.levelRisk || overallScore < 65,
      });
    } catch (error: any) {
      console.error("Error generating AI recommendations:", error);
      res.status(500).json({ message: "AI önerileri oluşturulurken hata oluştu" });
    }
  });

  // GET /api/personnel/:id/leave-salary-summary - Leave and salary summary
  router.get('/api/personnel/:id/leave-salary-summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;
      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const targetUser = await storage.getUserById(targetId);
      if (!targetUser) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      const hireDate = targetUser.hireDate ? new Date(targetUser.hireDate) : null;
      const now = new Date();
      let annualLeaveTotal = 14;
      let renewalDate = '';

      if (hireDate) {
        const yearsWorked = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (yearsWorked >= 15) {
          annualLeaveTotal = 26;
        } else if (yearsWorked >= 5) {
          annualLeaveTotal = 20;
        } else {
          annualLeaveTotal = 14;
        }
        const nextAnniversary = new Date(hireDate);
        nextAnniversary.setFullYear(now.getFullYear());
        if (nextAnniversary < now) {
          nextAnniversary.setFullYear(now.getFullYear() + 1);
        }
        renewalDate = `${String(nextAnniversary.getDate()).padStart(2, '0')}/${String(nextAnniversary.getMonth() + 1).padStart(2, '0')}/${nextAnniversary.getFullYear()}`;
      }

      const currentYear = now.getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const approvedLeaves = await db.select({
        totalDays: sql<number>`COALESCE(SUM(${leaveRequests.totalDays}), 0)`,
        leaveType: leaveRequests.leaveType,
      }).from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, targetId),
          eq(leaveRequests.status, 'approved'),
          gte(leaveRequests.startDate, yearStart),
          lte(leaveRequests.endDate, yearEnd),
        ))
        .groupBy(leaveRequests.leaveType);

      let usedLeave = 0;
      let unpaidLeaveDays = 0;
      for (const leave of approvedLeaves) {
        const days = Number(leave.totalDays);
        if (leave.leaveType === 'unpaid') {
          unpaidLeaveDays += days;
        } else {
          usedLeave += days;
        }
      }

      const remainingLeave = Math.max(0, annualLeaveTotal - usedLeave);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const perfScores = await db.select({
        latenessCount: sql<number>`COUNT(CASE WHEN ${employeePerformanceScores.attendanceScore} < 50 THEN 1 END)`,
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      const latenessCount = Number(perfScores[0]?.latenessCount || targetUser.latenessCount || 0);

      const salaryRecord = await db.select().from(employeeSalaries)
        .where(eq(employeeSalaries.userId, targetId))
        .limit(1);

      const baseSalary = salaryRecord[0]?.baseSalary ? Number(salaryRecord[0].baseSalary) : 0;

      // Salary scales mapping - map user role to salary_scales position
      const roleToPositionMap: Record<string, { positionName: string; locationType: string }> = {
        'stajyer': { positionName: 'Stajyer', locationType: 'sube' },
        'bar_buddy': { positionName: 'Bar Buddy', locationType: 'sube' },
        'barista': { positionName: 'Barista', locationType: 'sube' },
        'senior_barista': { positionName: 'Barista', locationType: 'sube' },
        'supervisor_buddy': { positionName: 'Supervisor Buddy', locationType: 'sube' },
        'supervisor': { positionName: 'Süpervizör', locationType: 'sube' },
      };

      let salaryScaleData: any = null;
      const roleMapping = roleToPositionMap[targetUser.role || ''];
      if (roleMapping) {
        const scaleResult = await db.execute(sql`
          SELECT * FROM salary_scales 
          WHERE position_name = ${roleMapping.positionName} 
          AND location_type = ${roleMapping.locationType} 
          AND is_active = true 
          LIMIT 1
        `);
        if (scaleResult.rows.length > 0) {
          const scale = scaleResult.rows[0] as any;
          salaryScaleData = {
            positionName: scale.position_name,
            level: scale.level,
            baseSalary: Number(scale.base_salary),
            cashRegisterBonus: Number(scale.cash_register_bonus),
            performanceBonus: Number(scale.performance_bonus),
            bonusCalculationType: scale.bonus_calculation_type,
            totalSalary: Number(scale.total_salary),
          };
        }
      }

      // Calculate daily meal allowance from worked days this month
      const currentMonth = now.getMonth() + 1;
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = now.toISOString().split('T')[0];

      const workedShifts = await db.execute(sql`
        SELECT COUNT(DISTINCT shift_date) as worked_days
        FROM shifts 
        WHERE assigned_to_id = ${targetId}
        AND shift_date >= ${monthStart}
        AND shift_date <= ${monthEnd}
        AND status = 'confirmed'
      `);
      const workedDaysThisMonth = Number((workedShifts.rows[0] as any)?.worked_days || 0);
      const dailyMealAllowance = targetUser.mealAllowance ? Number(targetUser.mealAllowance) : 0;
      const monthlyMealAllowance = Math.round((dailyMealAllowance / 26) * workedDaysThisMonth);

      const canViewSalary = isOwnProfile || user.role === 'admin' || user.role === 'muhasebe' || user.role === 'muhasebe_ik';

      const overtimeResult = await db.execute(sql`
        SELECT COALESCE(SUM(approved_minutes), 0) as total_minutes
        FROM overtime_requests
        WHERE user_id = ${targetId}
        AND status = 'approved'
        AND overtime_date >= ${monthStart}
        AND overtime_date <= ${monthEnd}
      `);
      const totalOvertimeMinutes = Number((overtimeResult.rows[0] as any)?.total_minutes || 0);
      const overtimeHoursThisMonth = Math.round((totalOvertimeMinutes / 60) * 100) / 100;

      const effectiveBaseSalary = salaryScaleData ? salaryScaleData.baseSalary : baseSalary;
      const hourlyRate = effectiveBaseSalary > 0 ? effectiveBaseSalary / (26 * 7.5) : 0;
      const overtimeAmountThisMonth = Math.round(hourlyRate * 1.5 * overtimeHoursThisMonth);

      const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const todayDate = Math.min(now.getDate(), totalDaysInMonth);
      // Count business days (Mon-Sat, excluding Sunday) from 1st to today
      let expectedWorkDays = 0;
      for (let d = 1; d <= todayDate; d++) {
        const date = new Date(currentYear, currentMonth - 1, d);
        if (date.getDay() !== 0) { // 0 = Sunday
          expectedWorkDays++;
        }
      }
      const missingDaysThisMonth = Math.max(0, expectedWorkDays - workedDaysThisMonth);
      const missingDayDeduction = effectiveBaseSalary > 0 ? Math.round((effectiveBaseSalary / 30) * missingDaysThisMonth) : 0;

      const performanceBonus = salaryScaleData ? salaryScaleData.performanceBonus : 0;
      const cashRegisterBonus = salaryScaleData ? salaryScaleData.cashRegisterBonus : 0;
      const netEstimatedSalary = effectiveBaseSalary + overtimeAmountThisMonth + performanceBonus + cashRegisterBonus + monthlyMealAllowance - missingDayDeduction;

      res.json({
        annualLeaveTotal,
        usedLeave,
        remainingLeave,
        renewalDate,
        unpaidLeaveDays,
        latenessCount,
        baseSalary: canViewSalary ? baseSalary : null,
        canViewSalary,
        salaryScale: canViewSalary ? salaryScaleData : null,
        workedDaysThisMonth: canViewSalary ? workedDaysThisMonth : null,
        monthlyMealAllowance: canViewSalary ? monthlyMealAllowance : null,
        overtimeHoursThisMonth: canViewSalary ? overtimeHoursThisMonth : 0,
        overtimeAmountThisMonth: canViewSalary ? overtimeAmountThisMonth : 0,
        missingDaysThisMonth: canViewSalary ? missingDaysThisMonth : 0,
        missingDayDeduction: canViewSalary ? missingDayDeduction : 0,
        expectedWorkDays,
        netEstimatedSalary: canViewSalary ? netEstimatedSalary : 0,
      });
    } catch (error: any) {
      console.error("Error fetching leave-salary summary:", error);
      res.status(500).json({ message: "İzin ve maaş bilgileri alınırken hata oluştu" });
    }
  });

  // ========================================
  // PROFESSIONAL TRAINING SYSTEM ROUTES
  // ========================================

  const TRAINING_TOPICS: Record<string, string> = {
    'franchise-yonetimi': 'Franchise Yönetimi',
    'performans-analizi': 'Performans Analizi',
    'kriz-yonetimi': 'Kriz Yönetimi',
    'tedarik-zinciri': 'Tedarik Zinciri',
    'maliyet-analizi': 'Maliyet Analizi',
    'tedarikci-iliskileri': 'Tedarikçi İlişkileri',
    'finansal-raporlama': 'Finansal Raporlama',
    'vergi-mevzuat': 'Vergi & Mevzuat',
    'butce-planlama': 'Bütçe Planlama',
    'ekipman-bakim': 'Ekipman Bakım',
    'yeni-teknolojiler': 'Yeni Teknolojiler',
    'problem-cozme': 'Problem Çözme',
    'uretim-planlama': 'Üretim Planlama',
    'kalite-kontrol': 'Kalite Kontrol',
  };

  router.get("/api/training-program/:topicId/lessons", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      if (!TRAINING_TOPICS[topicId]) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingLessons } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const lessons = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId))
        .orderBy(asc(professionalTrainingLessons.lessonIndex));
      res.json({ lessons, topicTitle: TRAINING_TOPICS[topicId] });
    } catch (error: any) {
      console.error("Error fetching training lessons:", error);
      res.status(500).json({ message: "Dersler alınırken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/generate-lessons", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const topicTitle = TRAINING_TOPICS[topicId];
      if (!topicTitle) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingLessons } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const existing = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId));
      if (existing.length > 0) {
        return res.json({ message: "Dersler zaten mevcut", lessons: existing });
      }
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen DOSPRESSO kahve franchise zinciri için profesyonel eğitim içeriği üreten bir eğitim uzmanısın. Türkçe olarak, profesyonel ama anlaşılır bir dilde yaz. Her ders 800-1200 kelime uzunluğunda olmalı. İçerik formatı: Markdown kullan - başlıklar (##), madde işaretleri (-), numaralı listeler (1.), kalın metin (**) kullan. DOSPRESSO franchise bağlamında pratik örnekler, teknikler ve en iyi uygulamalar ekle. Kahve sektörü ve franchise yönetimine özgü gerçekçi senaryolar kullan."
          },
          {
            role: "user",
            content: '"' + topicTitle + '" konusu için 4 ders oluştur. Her ders için JSON formatında döndür: [{ "title": "Ders Başlığı", "content": "Markdown formatında ders içeriği", "duration": dakika_cinsinden_süre }] Sadece JSON array döndür, başka bir şey ekleme.'
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });
      const responseText = completion.choices[0]?.message?.content || "[]";
      let lessonsData: Array<{ title: string; content: string; duration: number }>;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        lessonsData = JSON.parse(cleaned);
      } catch (error: any) {
        return res.status(500).json({ message: "AI yanıtı ayrıştırılamadı" });
      }
      const insertedLessons: any[] = [];
      for (let i = 0; i < lessonsData.length; i++) {
        const lesson = lessonsData[i];
        const [inserted] = await db.insert(professionalTrainingLessons).values({
          topicId,
          lessonIndex: i,
          title: lesson.title,
          content: lesson.content,
          duration: lesson.duration || 15,
        }).returning();
        insertedLessons.push(inserted);
      }
      res.json({ lessons: insertedLessons });
    } catch (error: any) {
      console.error("Error generating training lessons:", error);
      res.status(500).json({ message: "Ders içerikleri oluşturulurken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/lesson/:lessonIndex/complete", isAuthenticated, async (req, res) => {
    try {
      const { topicId, lessonIndex } = req.params;
      const user = req.user!;
      const { professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const existing = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId),
          eq(professionalTrainingProgress.lessonIndex, parseInt(lessonIndex))
        ));
      if (existing.length > 0) {
        await db.update(professionalTrainingProgress)
          .set({ completed: true, completedAt: new Date() })
          .where(eq(professionalTrainingProgress.id, existing[0].id));
      } else {
        await db.insert(professionalTrainingProgress).values({
          userId: user.id,
          topicId,
          lessonIndex: parseInt(lessonIndex),
          completed: true,
          completedAt: new Date(),
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing lesson:", error);
      res.status(500).json({ message: "Ders tamamlanırken hata oluştu" });
    }
  });

  router.get("/api/training-program/:topicId/progress", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const user = req.user!;
      const { professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const progress = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId)
        ));
      const completedLessons = progress.filter(p => p.completed && p.quizScore === null);
      const quizResult = progress.find(p => p.quizScore !== null);
      res.json({
        completedLessons: completedLessons.map(p => p.lessonIndex),
        quizScore: quizResult?.quizScore ?? null,
        quizPassed: quizResult?.quizPassed ?? null,
      });
    } catch (error: any) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "İlerleme bilgisi alınırken hata oluştu" });
    }
  });

  router.get("/api/training-program/:topicId/quiz", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      if (!TRAINING_TOPICS[topicId]) {
        return res.status(404).json({ message: "Eğitim konusu bulunamadı" });
      }
      const { professionalTrainingQuizCache, professionalTrainingLessons } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const cached = await db.select().from(professionalTrainingQuizCache)
        .where(eq(professionalTrainingQuizCache.topicId, topicId));
      if (cached.length > 0) {
        return res.json({ questions: cached[0].questions });
      }
      const lessons = await db.select().from(professionalTrainingLessons)
        .where(eq(professionalTrainingLessons.topicId, topicId))
        .orderBy(asc(professionalTrainingLessons.lessonIndex));
      if (lessons.length === 0) {
        return res.status(400).json({ message: "Önce dersleri oluşturmalısınız" });
      }
      const lessonSummaries = lessons.map(l => l.title + ': ' + l.content.substring(0, 300)).join('\n');
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen DOSPRESSO kahve franchise zinciri eğitim sistemi için sınav soruları oluşturan bir uzmanısın. Türkçe olarak 5 çoktan seçmeli soru oluştur. Her sorunun 4 seçeneği olmalı (A, B, C, D). Doğru cevabı belirt. JSON formatında döndür."
          },
          {
            role: "user",
            content: 'Aşağıdaki ders içeriklerine dayalı 5 sınav sorusu oluştur:\n\n' + lessonSummaries + '\n\nJSON formatı: [{ "question": "Soru metni", "options": ["A) Seçenek", "B) Seçenek", "C) Seçenek", "D) Seçenek"], "correctAnswer": 0 }] Sadece JSON array döndür.'
          }
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });
      const responseText = completion.choices[0]?.message?.content || "[]";
      let questions: any;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        questions = JSON.parse(cleaned);
      } catch (error: any) {
        return res.status(500).json({ message: "Sınav soruları ayrıştırılamadı" });
      }
      await db.insert(professionalTrainingQuizCache).values({
        topicId,
        questions,
      });
      res.json({ questions });
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Sınav soruları oluşturulurken hata oluştu" });
    }
  });

  router.post("/api/training-program/:topicId/quiz/submit", isAuthenticated, async (req, res) => {
    try {
      const { topicId } = req.params;
      const user = req.user!;
      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Cevaplar gerekli" });
      }
      const { professionalTrainingQuizCache, professionalTrainingProgress } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const cached = await db.select().from(professionalTrainingQuizCache)
        .where(eq(professionalTrainingQuizCache.topicId, topicId));
      if (cached.length === 0) {
        return res.status(400).json({ message: "Sınav bulunamadı" });
      }
      const questions = cached[0].questions as Array<{ question: string; options: string[]; correctAnswer: number }>;
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correctAnswer) {
          correct++;
        }
      }
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= 70;
      const existingQuizProgress = await db.select().from(professionalTrainingProgress)
        .where(and(
          eq(professionalTrainingProgress.userId, user.id),
          eq(professionalTrainingProgress.topicId, topicId),
          eq(professionalTrainingProgress.lessonIndex, -1)
        ));
      if (existingQuizProgress.length > 0) {
        await db.update(professionalTrainingProgress)
          .set({ quizScore: score, quizPassed: passed, completedAt: new Date() })
          .where(eq(professionalTrainingProgress.id, existingQuizProgress[0].id));
      } else {
        await db.insert(professionalTrainingProgress).values({
          userId: user.id,
          topicId,
          lessonIndex: -1,
          completed: true,
          completedAt: new Date(),
          quizScore: score,
          quizPassed: passed,
        });
      }
      res.json({ score, passed, correct, total: questions.length });
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Sınav gönderilirken hata oluştu" });
    }
  });


  // ========================================
  // DASHBOARD WIDGET CONFIGURATION ROUTES
  // ========================================

  // GET /api/admin/widgets - List all widgets (admin only)
  // POST /api/admin/widgets - Create widget (admin only)
  // PATCH /api/admin/widgets/:id - Update widget (admin only)
  // DELETE /api/admin/widgets/:id - Delete widget (admin only)
  // GET /api/dashboard/widgets - Get widgets for current user's role
  router.get('/api/dashboard/widgets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const allWidgets = await db.select().from(dashboardWidgets)
        .where(eq(dashboardWidgets.isActive, true))
        .orderBy(asc(dashboardWidgets.sortOrder));
      const userWidgets = allWidgets.filter(w => {
        if (!w.roles || w.roles.length === 0) return true;
        return w.roles.includes(user.role);
      });
      res.json(userWidgets);
    } catch (error: any) {
      console.error('Error fetching user widgets:', error);
      res.status(500).json({ message: 'Widget listesi alınamadı' });
    }
  });

  // GET /api/admin/module-visibility - Get all module visibility settings
  // PATCH /api/admin/module-visibility/:moduleId - Update where a module appears
  // GET /api/dashboard/widget-data/:widgetId - Get data for a specific widget
  router.get('/api/dashboard/widget-data/:widgetId', isAuthenticated, async (req: any, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      const [widget] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, widgetId));
      if (!widget) {
        return res.status(404).json({ message: 'Widget bulunamadı' });
      }
      let data: any = { value: 0, label: widget.title };
      switch (widget.dataSource) {
        case 'faults_count': {
          const [result] = await db.select({ count: count() }).from(equipmentFaults)
            .where(and(ne(equipmentFaults.status, 'cozuldu')));
          data = { value: result?.count || 0, label: 'Açık Arızalar' };
          break;
        }
        case 'tasks_pending': {
          const [result] = await db.select({ count: count() }).from(tasks)
            .where(eq(tasks.status, 'pending'));
          data = { value: result?.count || 0, label: 'Bekleyen Görevler' };
          break;
        }
        case 'checklists_today': {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const [total] = await db.select({ count: count() }).from(checklists);
          data = { value: total?.count || 0, label: 'Checklist Sayısı', subtitle: 'Toplam' };
          break;
        }
        case 'branch_health': {
          const [result] = await db.select({ count: count() }).from(branches);
          data = { value: result?.count || 0, label: 'Şube Sayısı' };
          break;
        }
        case 'training_progress': {
          const [result] = await db.select({ count: count() }).from(trainingModules)
            .where(eq(trainingModules.isActive, true));
          data = { value: result?.count || 0, label: 'Aktif Eğitim Modülü' };
          break;
        }
        case 'staff_count': {
          const [result] = await db.select({ count: count() }).from(users)
            .where(eq(users.isActive, true));
          data = { value: result?.count || 0, label: 'Aktif Personel' };
          break;
        }
        case 'equipment_alerts': {
          const [result] = await db.select({ count: count() }).from(equipment)
            .where(eq(equipment.status, 'needs_repair'));
          data = { value: result?.count || 0, label: 'Bakım Gerektiren Ekipman' };
          break;
        }
        case 'complaints_open': {
          const [result] = await db.select({ count: count() }).from(guestComplaints)
            .where(and(ne(guestComplaints.status, 'resolved'), ne(guestComplaints.status, 'closed')));
          data = { value: result?.count || 0, label: 'Açık Şikayetler' };
          break;
        }
        default:
          data = { value: 0, label: 'Bilinmeyen veri kaynağı' };
      }
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching widget data:', error);
      res.status(500).json({ message: 'Widget verisi alınamadı' });
    }
  });

  // HQ Personnel Statistics API
  router.get('/api/hq-personnel-stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }

      const allBranches = await db.select().from(branches);
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));

      const hqRolesList = ['admin', 'ceo', 'cgo', 'marketing', 'muhasebe_ik', 'satinalma', 'coach', 'trainer', 'kalite_kontrol'];
      const factoryRoles = ['fabrika_mudur', 'fabrika_operator', 'fabrika_depocu', 'fabrika_kalite'];

      const branchStats = allBranches
        .filter(b => b.name !== 'Merkez Ofis (HQ)' && b.name !== 'Fabrika')
        .map(branch => {
          const branchUsers = allUsers.filter(u => u.branchId === branch.id);
          const roleBreakdown: Record<string, number> = {};
          branchUsers.forEach(u => {
            if (u.role) { roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1; }
          });
          return {
            branchId: branch.id,
            branchName: branch.name,
            totalEmployees: branchUsers.length,
            roleBreakdown,
            fullTime: branchUsers.filter(u => u.employmentType === 'full_time').length,
            partTime: branchUsers.filter(u => u.employmentType === 'part_time').length,
          };
        });

      const hqUsers = allUsers.filter(u => hqRolesList.includes(u.role || '')); 
      const factoryUsers = allUsers.filter(u => factoryRoles.includes(u.role || '')); 

      const totalRoleBreakdown: Record<string, number> = {};
      allUsers.forEach(u => { if (u.role) { totalRoleBreakdown[u.role] = (totalRoleBreakdown[u.role] || 0) + 1; } });

      res.json({
        totalEmployees: allUsers.length,
        hqEmployees: hqUsers.length,
        factoryEmployees: factoryUsers.length,
        branchEmployees: allUsers.length - hqUsers.length - factoryUsers.length,
        totalRoleBreakdown,
        employmentTypeBreakdown: {
          fullTime: allUsers.filter(u => u.employmentType === 'full_time').length,
          partTime: allUsers.filter(u => u.employmentType === 'part_time').length,
          other: allUsers.filter(u => !u.employmentType || (u.employmentType !== 'full_time' && u.employmentType !== 'part_time')).length,
        },
        branchStats,
      });
    } catch (error: any) {
      console.error('Error fetching HQ personnel stats:', error);
      res.status(500).json({ message: 'Personel istatistikleri alınamadı' });
    }
  });


  // Management Reports API
  router.get('/api/management-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const { reportType, year, branchId } = req.query;
      let query = db.select().from(managementReports);
      const conditions: any[] = [];
      if (reportType) conditions.push(eq(managementReports.reportType, reportType as string));
      if (year) conditions.push(sql`${managementReports.period} LIKE ${year + '%'}`);
      if (branchId && branchId !== 'all') conditions.push(eq(managementReports.branchId, parseInt(branchId as string)));
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      const reports = await (query as any).orderBy(desc(managementReports.createdAt));
      res.json(reports);
    } catch (error: any) {
      console.error('Error fetching management reports:', error);
      res.status(500).json({ message: 'Raporlar alınamadı' });
    }
  });

  router.post('/api/management-reports', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const reportData = { ...req.body, createdBy: user.id };
      if (reportData.revenue && reportData.expenses) {
        reportData.netProfit = (parseFloat(reportData.revenue) - parseFloat(reportData.expenses)).toString();
      }
      const [report] = await db.insert(managementReports).values(reportData).returning();
      res.json(report);
    } catch (error: any) {
      console.error('Error creating management report:', error);
      res.status(500).json({ message: 'Rapor oluşturulamadı' });
    }
  });


  router.patch("/api/management-reports/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== "admin" && user.role !== "ceo" && user.role !== "muhasebe_ik")) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      const reportId = parseInt(req.params.id);
      const { status } = req.body;
      if (!["draft", "pending", "approved"].includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum" });
      }
      const updateData: any = { status, updatedAt: new Date() };
      if (status === "approved") {
        updateData.approvedBy = user.id;
        updateData.approvedAt = new Date();
      }
      const [updated] = await db.update(managementReports).set(updateData).where(eq(managementReports.id, reportId)).returning();
      if (!updated) {
        return res.status(404).json({ message: "Rapor bulunamadı" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating report status:", error);
      res.status(500).json({ message: "Rapor durumu güncellenemedi" });
    }
  });
  router.get('/api/management-reports/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'ceo')) {
        return res.status(403).json({ message: 'Yetkisiz erişim' });
      }
      const { year } = req.query;
      const targetYear = year || new Date().getFullYear().toString();
      const reports = await db.select().from(managementReports).where(sql`${managementReports.period} LIKE ${targetYear + '%'}`);
      
      const totalRevenue = reports.reduce((sum, r) => sum + (parseFloat(r.revenue as string) || 0), 0);
      const totalExpenses = reports.reduce((sum, r) => sum + (parseFloat(r.expenses as string) || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const avgTicket = reports.filter(r => r.averageTicket).reduce((sum, r) => sum + (parseFloat(r.averageTicket as string) || 0), 0) / (reports.filter(r => r.averageTicket).length || 1);
      
      const branchRevenue: Record<string, number> = {};
      reports.forEach(r => {
        if (r.branchId) {
          branchRevenue[r.branchId.toString()] = (branchRevenue[r.branchId.toString()] || 0) + (parseFloat(r.revenue as string) || 0);
        }
      });
      
      const monthlyData = [];
      for (let m = 1; m <= 12; m++) {
        const monthStr = `${targetYear}-${String(m).padStart(2, '0')}`;
        const monthReports = reports.filter(r => r.period === monthStr);
        monthlyData.push({
          month: m,
          revenue: monthReports.reduce((s, r) => s + (parseFloat(r.revenue as string) || 0), 0),
          expenses: monthReports.reduce((s, r) => s + (parseFloat(r.expenses as string) || 0), 0),
          profit: monthReports.reduce((s, r) => s + (parseFloat(r.revenue as string) || 0) - (parseFloat(r.expenses as string) || 0), 0),
        });
      }
      
      res.json({ totalRevenue, totalExpenses, totalProfit, avgTicket, branchRevenue, monthlyData, reportCount: reports.length });
    } catch (error: any) {
      console.error('Error fetching report summary:', error);
      res.status(500).json({ message: 'Rapor özeti alınamadı' });
    }
  });

  // AI-Powered Management Report Analysis
  router.post('/api/management-reports/ai-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (!user?.role || (user.role !== 'admin' && user.role !== 'muhasebe_ik' && user.role !== 'ceo' && !isHQRole(user.role))) {
        return res.status(403).json({ message: 'Yetkisiz erisim' });
      }
      const { year } = req.body;
      const targetYear = year || new Date().getFullYear().toString();
      const reports = await db.select().from(managementReports).where(sql`${managementReports.period} LIKE ${targetYear + '%'}`);
      
      if (reports.length === 0) {
        return res.json({ analysis: 'Henuz analiz edilecek veri yok.' });
      }

      const totalRevenue = reports.reduce((s: number, r: any) => s + (parseFloat(r.revenue) || 0), 0);
      const totalExpenses = reports.reduce((s: number, r: any) => s + (parseFloat(r.expenses) || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

      const allBranches = await db.select().from(branches);
      const branchNames: Record<string, string> = {};
      allBranches.forEach((b: any) => { branchNames[b.id.toString()] = b.name; });

      const branchData: Record<string, { revenue: number; expenses: number }> = {};
      reports.forEach((r: any) => {
        const bid = r.branchId?.toString() || 'genel';
        if (!branchData[bid]) branchData[bid] = { revenue: 0, expenses: 0 };
        branchData[bid].revenue += parseFloat(r.revenue) || 0;
        branchData[bid].expenses += parseFloat(r.expenses) || 0;
      });

      const branchSummary = Object.entries(branchData).map(([bid, data]) => ({
        name: branchNames[bid] || 'Genel',
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        margin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue * 100).toFixed(1) : '0',
      })).sort((a, b) => b.profit - a.profit);

      const dataLines = branchSummary.map(b => '- ' + b.name + ': Gelir ' + b.revenue.toLocaleString('tr-TR') + ' TL, Gider ' + b.expenses.toLocaleString('tr-TR') + ' TL, Kar ' + b.profit.toLocaleString('tr-TR') + ' TL (%' + b.margin + ')').join('\n');
      const dataContext = 'DOSPRESSO ' + targetYear + ' Mali Verileri:\n- Toplam Gelir: ' + totalRevenue.toLocaleString('tr-TR') + ' TL\n- Toplam Gider: ' + totalExpenses.toLocaleString('tr-TR') + ' TL\n- Net Kar: ' + totalProfit.toLocaleString('tr-TR') + ' TL\n- Kar Marji: %' + margin + '\n- Rapor Sayisi: ' + reports.length + '\n\nSube Bazli Performans:\n' + dataLines;

      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI();
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen DOSPRESSO kahve zinciri icin mali analiz uzmanisin. Turkce yanit ver.' },
            { role: 'user', content: 'Asagidaki mali verileri analiz et:\n' + dataContext }
          ],
          max_tokens: 1000,
        });
        res.json({ analysis: completion.choices[0]?.message?.content || 'Analiz yapilamadi.' });
      } catch (error: any) {
        console.error('AI analysis error:', error);
        const fallback = 'Mali Özet (' + targetYear + '):\n\nToplam Gelir: ' + totalRevenue.toLocaleString('tr-TR') + ' TL\nToplam Gider: ' + totalExpenses.toLocaleString('tr-TR') + ' TL\nNet Kar: ' + totalProfit.toLocaleString('tr-TR') + ' TL\nKar Marjı: %' + margin + '\nRapor Sayısı: ' + reports.length + '\n\n(AI analizi şu an kullanılamıyor.)';
        res.json({ analysis: fallback });
      }
    } catch (error: any) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({ message: 'AI analizi yapilamadi' });
    }
  });


  // =============================================
  // CGO COMMAND CENTER API
  // =============================================
  router.get('/api/cgo/command-center', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'admin', 'cgo'].includes(user.role)) {
        return res.status(403).json({ message: 'Bu sayfaya erisim yetkiniz yok' });
      }

      const [
        allBranches,
        allUsers,
        allFaults,
        allAudits,
        allFeedback,
        allEquipment,
        allChecklistCompletions
      ] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(auditInstances).where(eq(auditInstances.status, 'completed')),
        db.select().from(customerFeedback),
        db.select().from(equipment),
        db.select().from(checklistCompletions)
      ]);

      const activeUsers = allUsers.filter(u => u.isActive);
      const totalBranches = allBranches.length;

      let branchScores: Array<{ id: number; name: string; score: number; staffCount: number; openFaults: number; totalFaults: number; auditCount: number; status: string }>;
      try {
        const healthReport = await computeBranchHealthScores({ rangeDays: 30 });
        branchScores = healthReport.branches.map(hb => {
          const branchFaults = allFaults.filter(f => f.branchId === hb.branchId);
          const openFaults = branchFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
          const branchAudits = allAudits.filter((a: any) => a.branchId === hb.branchId);
          const branchStaff = activeUsers.filter(u => u.branchId === hb.branchId);
          return {
            id: hb.branchId,
            name: hb.branchName,
            score: hb.totalScore,
            staffCount: branchStaff.length,
            openFaults: openFaults.length,
            totalFaults: branchFaults.length,
            auditCount: branchAudits.length,
            status: hb.level === 'green' ? 'healthy' : hb.level === 'yellow' ? 'warning' : 'critical'
          };
        });
      } catch {
        branchScores = allBranches.map(b => {
          const branchFaults = allFaults.filter(f => f.branchId === b.id);
          const openFaults = branchFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
          const branchAudits = allAudits.filter((a: any) => a.branchId === b.id);
          const branchStaff = activeUsers.filter(u => u.branchId === b.id);
          const faultPenalty = Math.min(openFaults.length * 5, 30);
          const auditBonus = branchAudits.length > 0 ? 10 : 0;
          const score = Math.max(30, Math.min(100, 75 - faultPenalty + auditBonus));
          return {
            id: b.id,
            name: b.name || 'Sube ' + b.id,
            score,
            staffCount: branchStaff.length,
            openFaults: openFaults.length,
            totalFaults: branchFaults.length,
            auditCount: branchAudits.length,
            status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
          };
        });
      }

      const avgScore = branchScores.length > 0
        ? Math.round(branchScores.reduce((s, b) => s + b.score, 0) / branchScores.length)
        : 0;

      const hqUsers = activeUsers.filter(u => !u.branchId);
      const branchUsers = activeUsers.filter(u => u.branchId);
      const activeFaults = allFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
      const criticalFaults = activeFaults.filter(f => f.priority === 'critical');
      const highFaults = activeFaults.filter(f => f.priority === 'high');
      const equipmentActive = allEquipment.filter((e: any) => e.isActive === true).length;
      const equipmentTotal = allEquipment.length;
      const uptimeRate = equipmentTotal > 0 ? Math.round((equipmentActive / equipmentTotal) * 100) : 100;

      const roleDistribution: Record<string, number> = {};
      activeUsers.forEach(u => {
        const role = u.role || 'unknown';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });

      const satinalmaStaff = activeUsers.filter(u => u.role === 'satinalma').length;
      const fabrikaStaff = activeUsers.filter(u => ['fabrika', 'fabrika_mudur', 'fabrika_sorumlu', 'fabrika_personel'].includes(u.role || '')).length;
      const ikStaff = activeUsers.filter(u => ['muhasebe_ik', 'ik'].includes(u.role || '')).length;
      const coachStaff = activeUsers.filter(u => u.role === 'coach').length;
      const marketingStaff = activeUsers.filter(u => ['marketing', 'pazarlama'].includes(u.role || '')).length;
      const trainerStaff = activeUsers.filter(u => u.role === 'trainer').length;
      const kaliteStaff = activeUsers.filter(u => u.role === 'kalite_kontrol').length;
      const faultResRate = allFaults.length > 0 ? Math.round((allFaults.filter(f => f.status === 'resolved' || f.status === 'closed').length / allFaults.length) * 100) : 100;
      const calcDeptScore = (staffCount: number, baseFactor: number) => {
        const staffScore = Math.min(staffCount * 10, 30);
        return Math.max(40, Math.min(100, baseFactor + staffScore));
      };
      const departmentHealth = [
        { name: 'Satin Alma', icon: 'ShoppingCart', route: '/satinalma', score: calcDeptScore(satinalmaStaff, 65) },
        { name: 'Fabrika', icon: 'Factory', route: '/fabrika/dashboard', score: Math.min(100, 60 + Math.round(uptimeRate * 0.3) + fabrikaStaff * 2) },
        { name: 'IK & Bordro', icon: 'Users', route: '/hq-dashboard/ik', score: calcDeptScore(ikStaff, 70) },
        { name: 'Coach', icon: 'ClipboardCheck', route: '/hq-dashboard/coach', score: Math.min(100, 55 + coachStaff * 8 + Math.round(avgScore * 0.2)) },
        { name: 'Marketing', icon: 'Megaphone', route: '/admin/icerik-studyosu', score: calcDeptScore(marketingStaff, 75) },
        { name: 'Egitim', icon: 'GraduationCap', route: '/akademi', score: calcDeptScore(trainerStaff, 68) },
        { name: 'Kalite Kontrol', icon: 'Shield', route: '/kalite-kontrol-dashboard', score: Math.min(100, 60 + kaliteStaff * 10 + Math.round(faultResRate * 0.2)) }
      ].map(d => ({ ...d, status: d.score >= 80 ? 'healthy' : d.score >= 60 ? 'warning' : 'critical' }));

      const alerts: any[] = [];
      if (criticalFaults.length > 0) {
        alerts.push({ message: criticalFaults.length + ' kritik/yüksek öncelikli arıza açık', severity: 'critical', type: 'fault' });
      }
      const understaffedBranches = branchScores.filter(b => b.staffCount < 3);
      if (understaffedBranches.length > 0) {
        alerts.push({ message: understaffedBranches.length + ' şubede yetersiz personel', severity: 'warning', type: 'hr' });
      }
      const lowScoreBranches = branchScores.filter(b => b.score < 60);
      if (lowScoreBranches.length > 0) {
        alerts.push({ message: lowScoreBranches.length + ' şube kritik performans seviyesinde', severity: 'critical', type: 'performance' });
      }
      if (uptimeRate < 90) {
        alerts.push({ message: 'Ekipman uptime %' + uptimeRate + ' - hedefin altında', severity: 'warning', type: 'equipment' });
      }

      res.json({
        growth: {
          totalBranches,
          averageBranchScore: avgScore,
          totalEmployees: activeUsers.length,
          hqEmployees: hqUsers.length,
          branchEmployees: branchUsers.length,
          activeFaults: activeFaults.length,
          criticalFaults: criticalFaults.length,
          equipmentUptime: uptimeRate,
          checklistCompletions: allChecklistCompletions.length,
          customerFeedbackCount: allFeedback.length,
          auditCount: allAudits.length
        },
        branchPerformance: branchScores.sort((a, b) => b.score - a.score),
        departmentHealth,
        alerts,
        operational: {
          totalFaults: allFaults.length,
          activeFaults: activeFaults.length,
          criticalFaults: criticalFaults.length,
          highFaults: highFaults.length,
          resolvedFaults: allFaults.filter(f => f.status === 'resolved' || f.status === 'closed').length,
          equipmentTotal,
          equipmentActive,
          uptimeRate,
          totalChecklists: allChecklistCompletions.length
        },
        workforce: {
          total: activeUsers.length,
          hq: hqUsers.length,
          branch: branchUsers.length,
          roleDistribution
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      handleApiError(res, error, "CGOCommandCenter");
    }
  });

  router.post('/api/cgo/ai-assistant', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['ceo', 'admin', 'cgo'].includes(user.role)) {
        return res.status(403).json({ message: 'Erisim yetkiniz yok' });
      }

      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: 'Soru gerekli' });
      }

      const [allBranches, allUsers, allFaults, allEquipment] = await Promise.all([
        db.select().from(branches),
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(equipmentFaults),
        db.select().from(equipment)
      ]);

      const activeFaults = allFaults.filter(f => f.status === 'open' || f.status === 'in_progress');
      const branchNames = allBranches.map(b => b.name).join(', ');
      const roleGroups: Record<string, number> = {};
      allUsers.forEach(u => { roleGroups[u.role || 'diger'] = (roleGroups[u.role || 'diger'] || 0) + 1; });

      const systemContext = `Sen DOSPRESSO franchise zincirinin CGO (Chief Growth Officer) AI danismanisin. Buyume stratejileri, departman koordinasyonu ve operasyonel verimlilik konularinda uzmansin.
Guncel veriler:
- Toplam sube: ${allBranches.length} (${branchNames})
- Aktif personel: ${allUsers.length}
- Rol dagilimi: ${Object.entries(roleGroups).map(([r, c]) => r + ": " + c).join(", ")}
- Acik ariza: ${activeFaults.length} (toplam ${allFaults.length})
- Ekipman: ${allEquipment.length} adet
Buyume odakli, stratejik ve aksiyona yonelik cevaplar ver. Turkce yanit ver.`;

      try {
        const openai = (await import('./openai-client')).default;
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: question }
          ],
          max_tokens: 800,
          temperature: 0.7
        });
        let cgoAnswer = completion.choices[0]?.message?.content || 'Yanit alinamadi.';
        
        const usageKeywords = ['nasıl kullanılır', 'nasıl yapılır', 'nerede bulabilirim', 'nereden ulaşabilirim', 'sistem', 'menü', 'sayfa', 'modül', 'yetki', 'erişim', 'kullanım', 'özellik'];
        const questionLower = question.toLocaleLowerCase('tr-TR');
        if (usageKeywords.some((kw: string) => questionLower.includes(kw))) {
          cgoAnswer += '\n\n---\n-- **Detaylı bilgi için [Kullanım Kılavuzu](/kullanim-kilavuzu) sayfasını ziyaret edebilirsiniz.**';
        }
        
        res.json({ answer: cgoAnswer });
      } catch (error: any) {
        console.error('CGO AI Error:', error);
        res.json({ answer: `DOSPRESSO Ozet:
- ${allBranches.length} sube aktif
- ${allUsers.length} personel
- ${activeFaults.length} acik ariza
AI analizi su an kullanilamiyor. Detayli bilgi icin ilgili modulleri kontrol edin.` });
      }
    } catch (error: any) {
      console.error('Error in CGO AI assistant:', error);
      res.status(500).json({ message: 'AI yanit veremedi' });
    }
  });




  // ========================================
  // MANAGER PERFORMANCE - Yonetici Performans API
  // ========================================

  router.get('/api/manager-performance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['ceo', 'admin', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const allUsers = await db.select().from(users).where(eq(users.isActive, true));
      const allBranches = await db.select().from(branches);
      const allFaults = await db.select().from(faults);
      const allChecklists = await db.select().from(checklistCompletions);

      const hqRoles = ['muhasebe_ik', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'fabrika_mudur', 'teknik', 'destek', 'muhasebe', 'fabrika'];
      const hqStaff = allUsers.filter(u => hqRoles.includes(u.role || '') && !u.branchId);
      const branchSupervisors = allUsers.filter(u => u.role === 'supervisor');

      const getPerformanceMetrics = (userId: string) => {
        const assignedFaults = allFaults.filter(f => f.assignedToId === userId);
        const resolvedFaults = assignedFaults.filter(f => f.status === 'resolved' || f.status === 'closed');
        const userChecklists = allChecklists.filter((c: any) => c.completedBy === userId);
        const faultResolutionRate = assignedFaults.length > 0 ? Math.round((resolvedFaults.length / assignedFaults.length) * 100) : 100;

        const slaCompliant = resolvedFaults.filter((f: any) => {
          if (!f.slaDeadline || !f.resolvedAt) return true;
          return new Date(f.resolvedAt) <= new Date(f.slaDeadline);
        });
        const slaComplianceRate = resolvedFaults.length > 0 ? Math.round((slaCompliant.length / resolvedFaults.length) * 100) : 100;

        const responseTimes = assignedFaults
          .filter((f: any) => f.firstResponseAt && f.createdAt)
          .map((f: any) => (new Date(f.firstResponseAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60));
        const avgResponseHours = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        const avgResponseTime = avgResponseHours < 1 ? `${Math.round(avgResponseHours * 60)}dk` : `${avgResponseHours.toFixed(1)}sa`;

        return {
          assignedFaults: assignedFaults.length,
          resolvedFaults: resolvedFaults.length,
          faultResolutionRate,
          checklistsCompleted: userChecklists.length,
          overallScore: Math.min(100, Math.round(faultResolutionRate * 0.6 + Math.min(userChecklists.length * 2, 40))),
          slaComplianceRate,
          avgResponseTime: responseTimes.length > 0 ? avgResponseTime : undefined,
        };
      };

      const departmentMap: Record<string, string> = {
        'muhasebe_ik': 'Muhasebe & IK',
        'satinalma': 'Satin Alma',
        'coach': 'Coach & Performans',
        'marketing': 'Pazarlama',
        'trainer': 'Egitim',
        'kalite_kontrol': 'Kalite Kontrol',
        'fabrika_mudur': 'Fabrika Yonetim',
        'teknik': 'Teknik Destek',
        'destek': 'Destek',
        'muhasebe': 'Muhasebe',
        'fabrika': 'Fabrika',
      };

      const hqManagers = hqStaff.map(u => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Bilinmiyor',
        role: u.role,
        department: departmentMap[u.role || ''] || u.department || u.role || 'Bilinmiyor',
        email: u.email,
        phone: u.phoneNumber,
        profileImage: u.profileImageUrl,
        hireDate: u.hireDate,
        type: 'hq' as const,
        branchName: null as string | null,
        metrics: getPerformanceMetrics(u.id),
      }));

      const supervisorManagers = branchSupervisors.map(u => {
        const branch = allBranches.find(b => b.id === u.branchId);
        return {
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Bilinmiyor',
          role: u.role,
          department: 'Sube Yonetimi',
          email: u.email,
          phone: u.phoneNumber,
          profileImage: u.profileImageUrl,
          hireDate: u.hireDate,
          type: 'branch' as const,
          branchName: branch?.name || 'Bilinmiyor',
          branchId: u.branchId,
          metrics: getPerformanceMetrics(u.id),
        };
      });

      const hqAvgScore = hqManagers.length > 0 ? Math.round(hqManagers.reduce((sum, m) => sum + m.metrics.overallScore, 0) / hqManagers.length) : 0;
      const branchAvgScore = supervisorManagers.length > 0 ? Math.round(supervisorManagers.reduce((sum, m) => sum + m.metrics.overallScore, 0) / supervisorManagers.length) : 0;

      res.json({
        hqManagers,
        branchManagers: supervisorManagers,
        summary: {
          totalHQ: hqManagers.length,
          totalBranch: supervisorManagers.length,
          hqAverageScore: hqAvgScore,
          branchAverageScore: branchAvgScore,
          overallAverageScore: Math.round((hqAvgScore + branchAvgScore) / 2),
        }
      });
    } catch (error: any) {
      console.error("Manager performance error:", error);
      res.status(500).json({ message: "Yonetici performans verileri yuklenemedi" });
    }
  });

  // ========================================
  // FRANCHISE PROJECTS - Franchise Proje Yonetimi API
  // ========================================

  router.get('/api/franchise-projects', isAuthenticated, async (req: any, res) => {
    try {
      const projects = await db.select().from(franchiseProjects).orderBy(desc(franchiseProjects.createdAt));
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching franchise projects:", error);
      res.status(500).json({ message: "Projeler yuklenemedi" });
    }
  });

  router.get('/api/franchise-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const [project] = await db.select().from(franchiseProjects).where(eq(franchiseProjects.id, projectId));
      if (!project) return res.status(404).json({ message: "Proje bulunamadi" });

      const phases = await db.select().from(franchiseProjectPhases).where(eq(franchiseProjectPhases.projectId, projectId)).orderBy(franchiseProjectPhases.phaseNumber);
      const tasks = await db.select().from(franchiseProjectTasks).where(eq(franchiseProjectTasks.projectId, projectId));
      const collaborators = await db.select().from(franchiseCollaborators).where(eq(franchiseCollaborators.projectId, projectId));
      const comments = await db.select().from(franchiseProjectComments).where(eq(franchiseProjectComments.projectId, projectId)).orderBy(desc(franchiseProjectComments.createdAt));

      const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, role: users.role, profileImageUrl: users.profileImageUrl }).from(users);

      res.json({ ...project, phases, tasks, collaborators, comments, users: allUsers });
    } catch (error: any) {
      console.error("Error fetching franchise project:", error);
      res.status(500).json({ message: "Proje detaylari yuklenemedi" });
    }
  });

  router.post('/api/franchise-projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const { name, franchiseeName, contactPerson, contactPhone, contactEmail, location, city, estimatedBudget, startDate, expectedEndDate, notes, managerId } = req.body;

      const [project] = await db.insert(franchiseProjects).values({
        name,
        franchiseeName,
        contactPerson,
        contactPhone,
        contactEmail,
        location,
        city,
        estimatedBudget,
        startDate,
        expectedEndDate,
        notes,
        managerId,
        createdBy: user.id,
        status: 'sozlesme',
        currentPhase: 1,
        totalPhases: 7,
        completionPercentage: 0,
      }).returning();

      const defaultPhases = [
        { phaseNumber: 1, name: "Sozlesme ve Planlama", description: "Franchise sozlesmesi imzalanmasi, is plani hazirligi, fizibilite calismasi" },
        { phaseNumber: 2, name: "Mekan Secimi ve Kiralama", description: "Uygun lokasyon arastirmasi, kira sozlesmesi, imar durumu kontrolu" },
        { phaseNumber: 3, name: "Mimari Proje ve Tasarim", description: "Ic mekan tasarimi, dekorasyon projesi, DOSPRESSO marka standartlari uyumu" },
        { phaseNumber: 4, name: "Tadilat ve Insaat", description: "Mekan renovasyonu, altyapi islemleri, elektrik-tesisat, mobilya uretim" },
        { phaseNumber: 5, name: "Ekipman Kurulum", description: "Kahve makineleri, sogutma uniteleri, kasa sistemi, POS entegrasyonu" },
        { phaseNumber: 6, name: "Personel Alim ve Egitim", description: "Kadro olusturma, DOSPRESSO Akademi egitimi, staj donemi" },
        { phaseNumber: 7, name: "Acilis Oncesi ve Acilis", description: "Son kontroller, test servisleri, resmi acilis, marketing kampanyasi" },
      ];

      for (const phase of defaultPhases) {
        await db.insert(franchiseProjectPhases).values({
          projectId: project.id,
          ...phase,
          status: phase.phaseNumber === 1 ? 'in_progress' : 'pending',
          dependsOnPhaseId: phase.phaseNumber > 1 ? phase.phaseNumber - 1 : null,
        });
      }

      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating franchise project:", error);
      res.status(500).json({ message: "Proje olusturulamadi" });
    }
  });

  router.patch('/api/franchise-projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updates = req.body;
      const [updated] = await db.update(franchiseProjects).set({ ...updates, updatedAt: new Date() }).where(eq(franchiseProjects.id, projectId)).returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating franchise project:", error);
      res.status(500).json({ message: "Proje guncellenemedi" });
    }
  });

  router.patch('/api/franchise-project-phases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const phaseId = parseInt(req.params.id);
      const updates = req.body;
      const [updated] = await db.update(franchiseProjectPhases).set(updates).where(eq(franchiseProjectPhases.id, phaseId)).returning();

      if (updated && updated.projectId) {
        const allPhases = await db.select().from(franchiseProjectPhases).where(eq(franchiseProjectPhases.projectId, updated.projectId));
        const totalCompletion = Math.round(allPhases.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / allPhases.length);
        const currentPhase = allPhases.find(p => p.status === 'in_progress')?.phaseNumber || 1;
        await db.update(franchiseProjects).set({ completionPercentage: totalCompletion, currentPhase, updatedAt: new Date() }).where(eq(franchiseProjects.id, updated.projectId));
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating phase:", error);
      res.status(500).json({ message: "Faz guncellenemedi" });
    }
  });

  router.post('/api/franchise-project-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, phaseId, title, description, priority, assignedToUserId, assignedToCollaboratorId, dueDate, raciResponsible, raciAccountable, raciConsulted, raciInformed, dependsOnTaskId, notes } = req.body;
      const [task] = await db.insert(franchiseProjectTasks).values({
        projectId, phaseId, title, description, status: 'pending', priority, assignedToUserId, assignedToCollaboratorId, dueDate, raciResponsible, raciAccountable, raciConsulted, raciInformed, dependsOnTaskId, notes,
      }).returning();
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Gorev olusturulamadi" });
    }
  });

  router.patch('/api/franchise-project-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      if (updates.status === 'completed') {
        updates.completedAt = new Date();
      }
      const [updated] = await db.update(franchiseProjectTasks).set({ ...updates, updatedAt: new Date() }).where(eq(franchiseProjectTasks.id, taskId)).returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Gorev guncellenemedi" });
    }
  });

  router.post('/api/franchise-collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, name, role, company, email, phone, specialty, notes } = req.body;
      const crypto = await import('crypto');
      const accessToken = crypto.randomBytes(32).toString('hex');
      const [collaborator] = await db.insert(franchiseCollaborators).values({
        projectId, name, role, company, email, phone, specialty, accessToken, notes, isActive: true,
      }).returning();
      res.status(201).json(collaborator);
    } catch (error: any) {
      console.error("Error creating collaborator:", error);
      res.status(500).json({ message: "Paydas eklenemedi" });
    }
  });

  router.delete('/api/franchise-collaborators/:id', isAuthenticated, async (req: any, res) => {
    try {
      const collabId = parseInt(req.params.id);
      await db.update(franchiseCollaborators).set({ isActive: false }).where(eq(franchiseCollaborators.id, collabId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deactivating collaborator:", error);
      res.status(500).json({ message: "Paydas devre disi birakilamadi" });
    }
  });

  router.post('/api/franchise-project-comments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { projectId, taskId, content, attachmentUrl } = req.body;
      const [comment] = await db.insert(franchiseProjectComments).values({
        projectId, taskId, authorUserId: user.id, content, attachmentUrl,
      }).returning();
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Yorum eklenemedi" });
    }
  });

  // ========================================
  // STOK SAYIM (INVENTORY COUNT) ROUTES
  // ========================================

  // Get all inventory counts
  router.get('/api/inventory-counts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['admin', 'ceo', 'cgo', 'fabrika_mudur', 'fabrika', 'satinalma', 'muhasebe'].includes(role)) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      const { year, month } = req.query;
      let conditions = [];
      if (year) conditions.push(sql`ic.year = ${parseInt(year as string)}`);
      if (month) conditions.push(sql`ic.month = ${parseInt(month as string)}`);
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      
      const result = await db.execute(sql`
        SELECT ic.*, 
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id)::int as total_items,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id AND status = 'completed')::int as completed_items,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id AND status = 'discrepancy')::int as discrepancy_items
        FROM inventory_counts ic
        LEFT JOIN users u ON u.id = ic.created_by_id
        ${whereClause}
        ORDER BY ic.year DESC, ic.month DESC, ic.id DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching inventory counts:", error);
      res.status(500).json({ message: "Sayım listesi alınamadı" });
    }
  });

  // Create new inventory count session
  router.post('/api/inventory-counts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin') {
        return res.status(403).json({ message: "Sadece fabrika yoneticisi sayim olusturabilir" });
      }
      const { month, year, scheduledDate, notes, countType } = req.body;
      const cType = countType || 'tam_sayim';
      
      const scheduled = scheduledDate ? new Date(scheduledDate) : new Date();

      const [newCount] = await db.insert(inventoryCounts).values({
        month, year, countType: cType, scheduledDate: scheduled, notes, createdById: user.id, status: 'in_progress'
      }).returning();

      const categoryMap: Record<string, string[]> = {
        bitimis_urun: ['bitimis_urun', 'donut', 'tatli', 'tuzlu'],
        hammadde: ['hammadde', 'kahve', 'konsantre', 'cay_grubu', 'toz_topping'],
        ambalaj: ['ambalaj'],
        ekipman: ['ekipman', 'sube_ekipman'],
        tam_sayim: [],
      };

      let activeItems: any[];
      if (cType === 'tam_sayim') {
        const result = await db.execute(sql`SELECT id FROM inventory WHERE is_active = true ORDER BY category, name`);
        activeItems = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      } else {
        const cats = categoryMap[cType] || [cType];
        const catConditions = cats.map(c => `category = '${c}'`).join(' OR ');
        const result = await db.execute(sql.raw(`SELECT id FROM inventory WHERE is_active = true AND (${catConditions}) ORDER BY category, name`));
        activeItems = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      }
      
      for (const item of activeItems) {
        await db.insert(inventoryCountAssignments).values({
          countId: newCount.id, inventoryId: (item as any).id, status: 'pending'
        });
      }

      res.status(201).json({ ...newCount, itemCount: activeItems.length });
    } catch (error: any) {
      console.error("Error creating inventory count:", error);
      res.status(500).json({ message: "Sayim olusturulamadi" });
    }
  });
  router.get('/api/inventory-counts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const countId = parseInt(req.params.id);
      const result = await db.execute(sql`
        SELECT ic.*, u.first_name || ' ' || u.last_name as created_by_name
        FROM inventory_counts ic
        LEFT JOIN users u ON u.id = ic.created_by_id
        WHERE ic.id = ${countId}
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      if (rows.length === 0) return res.status(404).json({ message: "Sayım bulunamadı" });

      const assignments = await db.execute(sql`
        SELECT ica.*, 
          inv.name as inventory_name, inv.code as inventory_code, inv.unit as inventory_unit, 
          inv.current_stock as system_quantity, inv.category as inventory_category,
          inv.sub_category as inventory_sub_category, inv.qr_code,
          c1.first_name || ' ' || c1.last_name as counter1_name,
          c2.first_name || ' ' || c2.last_name as counter2_name,
          (SELECT count(*) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false)::int as entry_count,
          (SELECT AVG(counted_quantity::numeric) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false) as counted_avg,
          CASE WHEN (SELECT count(*) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false) >= 2
            THEN (SELECT AVG(counted_quantity::numeric) - inv.current_stock::numeric FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false)
            ELSE NULL END as difference_display
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        LEFT JOIN users c1 ON c1.id = ica.counter_1_id
        LEFT JOIN users c2 ON c2.id = ica.counter_2_id
        WHERE ica.count_id = ${countId}
        ORDER BY inv.category, inv.name
      `);
      const assignRows = Array.isArray(assignments) ? assignments : ((assignments as any)?.rows ?? []);

      res.json({ ...rows[0], assignments: assignRows });
    } catch (error: any) {
      console.error("Error fetching inventory count:", error);
      res.status(500).json({ message: "Sayım detayı alınamadı" });
    }
  });

  // Assign counters to inventory items
  router.put('/api/inventory-counts/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin') {
        return res.status(403).json({ message: "Sadece fabrika yöneticisi sayımcı atayabilir" });
      }
      const countId = parseInt(req.params.id);
      const { assignments } = req.body; // [{assignmentId, counter1Id, counter2Id}]

      for (const a of assignments) {
        if (a.counter1Id === a.counter2Id) {
          return res.status(400).json({ message: "İki sayımcı aynı kişi olamaz" });
        }
        await db.update(inventoryCountAssignments)
          .set({ counter1Id: a.counter1Id, counter2Id: a.counter2Id })
          .where(eq(inventoryCountAssignments.id, a.assignmentId));
      }

      // Update count status
      await db.update(inventoryCounts)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(inventoryCounts.id, countId));

      res.json({ message: "Sayımcılar atandı" });
    } catch (error: any) {
      console.error("Error assigning counters:", error);
      res.status(500).json({ message: "Sayımcı atanamadı" });
    }
  });


  // Submit count entry (by counter)
  router.post('/api/inventory-count-entries', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { assignmentId, countedQuantity, notes, photoUrl } = req.body;

      // Get assignment
      const assignResult = await db.execute(sql`
        SELECT ica.*, inv.current_stock 
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        WHERE ica.id = ${assignmentId}
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      if (assignRows.length === 0) return res.status(404).json({ message: "Sayım ataması bulunamadı" });
      
      const assignment = assignRows[0] as any;
      
      // Verify this user is assigned as counter1 or counter2
      if (assignment.counter_1_id !== user.id && assignment.counter_2_id !== user.id) {
        return res.status(403).json({ message: "Bu sayıma atanmadınız" });
      }

      // Check if already counted by this user (non-recount)
      const existingResult = await db.execute(sql`
        SELECT id FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND counter_id = ${user.id} AND is_recount = false
      `);
      const existingRows = Array.isArray(existingResult) ? existingResult : ((existingResult as any)?.rows ?? []);
      if (existingRows.length > 0) {
        return res.status(400).json({ message: "Bu kalem için zaten sayım girdiniz" });
      }

      const systemQty = parseFloat(assignment.current_stock || '0');
      const counted = parseFloat(countedQuantity);
      const difference = counted - systemQty;

      const [entry] = await db.insert(inventoryCountEntries).values({
        assignmentId, counterId: user.id, countedQuantity: countedQuantity.toString(),
        systemQuantity: systemQty.toString(), difference: difference.toString(),
        isRecount: false, notes, photoUrl
      }).returning();

      // Check if BOTH assigned counters have submitted
      const allEntriesResult = await db.execute(sql`
        SELECT counter_id, counted_quantity FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND is_recount = false
        AND counter_id IN (${assignment.counter_1_id}, ${assignment.counter_2_id})
      `);
      const allEntries = Array.isArray(allEntriesResult) ? allEntriesResult : ((allEntriesResult as any)?.rows ?? []);
      
      const entryCounterIds = new Set(allEntries.map((e) => e.counter_id));
      if (entryCounterIds.has(assignment.counter_1_id) && entryCounterIds.has(assignment.counter_2_id)) {
        const e1 = allEntries.find((e) => e.counter_id === assignment.counter_1_id);
        const e2 = allEntries.find((e) => e.counter_id === assignment.counter_2_id);
        const qty1 = parseFloat(e1.counted_quantity);
        const qty2 = parseFloat(e2.counted_quantity);
        const discrepancyThreshold = Math.max(systemQty * 0.02, 0.5); // 2% or 0.5 min
        
        if (Math.abs(qty1 - qty2) > discrepancyThreshold) {
          await db.update(inventoryCountAssignments)
            .set({ status: 'discrepancy' })
            .where(eq(inventoryCountAssignments.id, assignmentId));
        } else {
          await db.update(inventoryCountAssignments)
            .set({ status: 'completed' })
            .where(eq(inventoryCountAssignments.id, assignmentId));
          
          // Update inventory stock with average of both counts
          const avgQty = ((qty1 + qty2) / 2).toFixed(3);
          const invId = assignment.inventory_id;
          await db.update(inventory)
            .set({ currentStock: avgQty, updatedAt: new Date() })
            .where(eq(inventory.id, invId));
        }
      } else {
        await db.update(inventoryCountAssignments)
          .set({ status: 'counting' })
          .where(eq(inventoryCountAssignments.id, assignmentId));
      }

      // Check if all assignments are done for this count
      const countId = assignment.count_id;
      const pendingResult = await db.execute(sql`
        SELECT count(*) as cnt FROM inventory_count_assignments 
        WHERE count_id = ${countId} AND status NOT IN ('completed')
      `);
      const pendingRows = Array.isArray(pendingResult) ? pendingResult : ((pendingResult as any)?.rows ?? []);
      const pendingCount = parseInt((pendingRows[0] as any)?.cnt || '0');
      
      if (pendingCount === 0) {
        await db.update(inventoryCounts)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(inventoryCounts.id, countId));
      }

      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error submitting count entry:", error);
      res.status(500).json({ message: "Sayım girişi kaydedilemedi" });
    }
  });

  // Submit recount entry
  router.post('/api/inventory-count-entries/recount', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const { assignmentId, countedQuantity, notes, photoUrl } = req.body;

      const assignResult = await db.execute(sql`
        SELECT ica.*, inv.current_stock
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        WHERE ica.id = ${assignmentId} AND ica.status = 'discrepancy'
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      if (assignRows.length === 0) return res.status(404).json({ message: "Tutarsızlık olan sayım bulunamadı" });
      
      const assignment = assignRows[0] as any;
      if (assignment.counter_1_id !== user.id && assignment.counter_2_id !== user.id) {
        return res.status(403).json({ message: "Bu sayıma atanmadınız" });
      }

      // Prevent duplicate recount by same user
      const existingRecountResult = await db.execute(sql`
        SELECT id FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND counter_id = ${user.id} AND is_recount = true
      `);
      const existingRecountRows = Array.isArray(existingRecountResult) ? existingRecountResult : ((existingRecountResult as any)?.rows ?? []);
      if (existingRecountRows.length > 0) {
        return res.status(400).json({ message: "Bu kalem için zaten tekrar sayım girdiniz" });
      }

      const systemQty = parseFloat(assignment.current_stock || '0');
      const counted = parseFloat(countedQuantity);
      const difference = counted - systemQty;

      const [entry] = await db.insert(inventoryCountEntries).values({
        assignmentId, counterId: user.id, countedQuantity: countedQuantity.toString(),
        systemQuantity: systemQty.toString(), difference: difference.toString(),
        isRecount: true, notes, photoUrl
      }).returning();

      // Check recount entries - both assigned counters must submit
      const recountResult = await db.execute(sql`
        SELECT counter_id, counted_quantity FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND is_recount = true
        AND counter_id IN (${assignment.counter_1_id}, ${assignment.counter_2_id})
      `);
      const recountEntries = Array.isArray(recountResult) ? recountResult : ((recountResult as any)?.rows ?? []);
      
      const recountCounterIds = new Set(recountEntries.map((e) => e.counter_id));
      if (recountCounterIds.has(assignment.counter_1_id) && recountCounterIds.has(assignment.counter_2_id)) {
        const e1 = recountEntries.find((e) => e.counter_id === assignment.counter_1_id);
        const e2 = recountEntries.find((e) => e.counter_id === assignment.counter_2_id);
        const qty1 = parseFloat(e1.counted_quantity);
        const qty2 = parseFloat(e2.counted_quantity);
        // After recount, accept the average regardless
        await db.update(inventoryCountAssignments)
          .set({ status: 'completed' })
          .where(eq(inventoryCountAssignments.id, assignmentId));
        
        const avgQty = ((qty1 + qty2) / 2).toFixed(3);
        const invId = assignment.inventory_id;
        await db.update(inventory)
          .set({ currentStock: avgQty, updatedAt: new Date() })
          .where(eq(inventory.id, invId));
      }

      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error submitting recount:", error);
      res.status(500).json({ message: "Tekrar sayım kaydedilemedi" });
    }
  });

  // Get count entries for an assignment
  router.get('/api/inventory-count-entries/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const result = await db.execute(sql`
        SELECT ice.*, u.first_name || ' ' || u.last_name as counter_name
        FROM inventory_count_entries ice
        LEFT JOIN users u ON u.id = ice.counter_id
        WHERE ice.assignment_id = ${assignmentId}
        ORDER BY ice.counted_at
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching count entries:", error);
      res.status(500).json({ message: "Sayım girişleri alınamadı" });
    }
  });

  // ========================================
  // FACTORY MANAGEMENT SCORE ROUTES
  // ========================================



  // ========================================
  // INVENTORY COUNT REPORTS API
  // ========================================
  
  router.get('/api/inventory-count-reports', isAuthenticated, async (req: any, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const result = await db.execute(sql`
        SELECT icr.*, inv.name as inventory_name, inv.code as inventory_code, inv.category as inventory_category
        FROM inventory_count_reports icr
        JOIN inventory inv ON inv.id = icr.inventory_id
        JOIN inventory_counts ic ON ic.id = icr.count_id
        WHERE ic.year = ${year}
        ORDER BY icr.severity DESC, icr.created_at DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching inventory count reports:", error);
      res.status(500).json({ message: "Raporlar alınamadı" });
    }
  });

  // Generate discrepancy reports when count is completed
  router.post('/api/inventory-counts/:id/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin' && role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const countId = parseInt(req.params.id);
      
      // Get all completed assignments with their averages
      const assignResult = await db.execute(sql`
        SELECT ica.id, ica.inventory_id, inv.current_stock,
          AVG(ice.counted_quantity::numeric) as avg_counted,
          inv.current_stock::numeric as sys_qty,
          inv.name as inventory_name
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        JOIN inventory_count_entries ice ON ice.assignment_id = ica.id AND ice.is_recount = false
        WHERE ica.count_id = ${countId}
        GROUP BY ica.id, ica.inventory_id, inv.current_stock, inv.name
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      
      let reportCount = 0;
      const notificationTargets: string[] = [];
      
      for (const row of assignRows) {
        const sysQty = parseFloat(row.sys_qty || 0);
        const counted = parseFloat(row.avg_counted || 0);
        const diff = counted - sysQty;
        const diffPercent = sysQty > 0 ? Math.abs(diff / sysQty) * 100 : (diff !== 0 ? 100 : 0);
        
        let severity = 'low';
        if (diffPercent >= 20) severity = 'critical';
        else if (diffPercent >= 10) severity = 'high';
        else if (diffPercent >= 5) severity = 'medium';
        
        if (Math.abs(diff) > 0.01) {
          const notifiedRoles = [];
          if (severity === 'critical' || severity === 'high') {
            notifiedRoles.push('fabrika_mudur', 'ceo', 'cgo', 'muhasebe', 'satinalma');
          } else if (severity === 'medium') {
            notifiedRoles.push('fabrika_mudur', 'muhasebe');
          } else {
            notifiedRoles.push('fabrika_mudur');
          }
          
          await db.execute(sql`
            INSERT INTO inventory_count_reports (count_id, inventory_id, system_quantity, counted_quantity, difference, difference_percent, severity, notified_roles)
            VALUES (${countId}, ${row.inventory_id}, ${sysQty.toString()}, ${counted.toString()}, ${diff.toString()}, ${diffPercent.toFixed(2)}, ${severity}, ${notifiedRoles})
          `);
          reportCount++;
          
          // Create notifications for high/critical discrepancies
          if (severity === 'critical' || severity === 'high') {
            notificationTargets.push(row.inventory_name);
          }
        }
      }
      
      // Update count status to completed
      await db.update(inventoryCounts)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(inventoryCounts.id, countId));
      
      // Send notifications if there are critical discrepancies
      if (notificationTargets.length > 0) {
        const targetRoles = ['fabrika_mudur', 'ceo', 'cgo', 'muhasebe', 'satinalma'];
        const notifUsers = await db.execute(sql`
          SELECT id FROM users WHERE role = ANY(${targetRoles}) AND is_active = true
        `);
        const notifRows = Array.isArray(notifUsers) ? notifUsers : ((notifUsers as any)?.rows ?? []);
        
        for (const nu of notifRows) {
          await db.execute(sql`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (${nu.id}, 'Sayim Tutarsizlik Uyarisi', 
              ${'Kritik stok tutarsizligi tespit edildi: ' + notificationTargets.slice(0, 3).join(', ')}, 
              'warning', NOW())
          `);
        }
      }
      
      res.json({ message: `${reportCount} tutarsızlık raporu oluşturuldu`, reportCount });
    } catch (error: any) {
      console.error("Error finalizing count:", error);
      res.status(500).json({ message: "Sayım sonlandırılamadı" });
    }
  });

  // ========================================
  // SUPPLIER PERFORMANCE SCORES API
  // ========================================
  
  router.get('/api/supplier-performance-scores', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT sps.*, s.name as supplier_name, s.code as supplier_code
        FROM supplier_performance_scores sps
        JOIN suppliers s ON s.id = sps.supplier_id
        ORDER BY sps.year DESC, sps.month DESC, sps.overall_score DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching supplier performance:", error);
      res.status(500).json({ message: "Tedarikçi puanları alınamadı" });
    }
  });

  // Calculate supplier performance (triggered manually or via cron)
  router.post('/api/supplier-performance-scores/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['fabrika_mudur', 'admin', 'ceo', 'satinalma'].includes(role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const month = req.body.month || new Date().getMonth() + 1;
      const year = req.body.year || new Date().getFullYear();
      
      // Get all active suppliers
      const suppResult = await db.execute(sql`SELECT id, name FROM suppliers WHERE status = 'aktif'`);
      const suppRows = Array.isArray(suppResult) ? suppResult : ((suppResult as any)?.rows ?? []);
      
      const scores = [];
      for (const supp of suppRows) {
        // Calculate delivery score from goods receipts
        const deliveryResult = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN receipt_date <= expected_delivery_date OR expected_delivery_date IS NULL THEN 1 ELSE 0 END) as on_time
          FROM goods_receipts
          WHERE supplier_id = ${supp.id}
          AND EXTRACT(MONTH FROM receipt_date) = ${month}
          AND EXTRACT(YEAR FROM receipt_date) = ${year}
        `);
        const delRows = Array.isArray(deliveryResult) ? deliveryResult : ((deliveryResult as any)?.rows ?? []);
        const totalDel = parseInt(delRows[0]?.total || 0);
        const onTimeDel = parseInt(delRows[0]?.on_time || 0);
        const deliveryScore = totalDel > 0 ? (onTimeDel / totalDel) * 100 : 100;
        
        // Quality score based on returns/complaints
        const qualityResult = await db.execute(sql`
          SELECT COUNT(*) as complaint_count
          FROM product_complaints
          WHERE supplier_id = ${supp.id}
          AND EXTRACT(MONTH FROM created_at) = ${month}
          AND EXTRACT(YEAR FROM created_at) = ${year}
        `);
        const qualRows = Array.isArray(qualityResult) ? qualityResult : ((qualityResult as any)?.rows ?? []);
        const complaints = parseInt(qualRows[0]?.complaint_count || 0);
        const qualityScore = Math.max(0, 100 - (complaints * 15));
        
        // Price performance - stable pricing gets higher score
        const priceScore = 80; // Default baseline
        
        const overallScore = (deliveryScore * 0.4 + qualityScore * 0.35 + priceScore * 0.25);
        
        // Upsert score
        await db.execute(sql`
          INSERT INTO supplier_performance_scores (supplier_id, month, year, delivery_score, price_performance_score, quality_score, overall_score, total_deliveries, on_time_deliveries, complaint_count)
          VALUES (${supp.id}, ${month}, ${year}, ${deliveryScore.toFixed(2)}, ${priceScore.toFixed(2)}, ${qualityScore.toFixed(2)}, ${overallScore.toFixed(2)}, ${totalDel}, ${onTimeDel}, ${complaints})
          ON CONFLICT DO NOTHING
        `);
        
        // Update supplier main record
        await db.execute(sql`
          UPDATE suppliers SET performance_score = ${overallScore.toFixed(1)}, on_time_delivery_rate = ${deliveryScore.toFixed(2)} WHERE id = ${supp.id}
        `);
        
        scores.push({ supplierId: supp.id, name: supp.name, overallScore });
      }
      
      res.json({ message: `${scores.length} tedarikçi puanı hesaplandı`, scores });
    } catch (error: any) {
      console.error("Error calculating supplier scores:", error);
      res.status(500).json({ message: "Puanlar hesaplanamadı" });
    }
  });

  // QR Code lookup for inventory items
  router.get('/api/inventory/qr/:qrCode', isAuthenticated, async (req: any, res) => {
    try {
      const qrCode = req.params.qrCode;
      const result = await db.execute(sql`
        SELECT id, code, name, category, sub_category, unit, current_stock, qr_code
        FROM inventory
        WHERE qr_code = ${qrCode} OR code = ${qrCode.replace('INV-', '')}
        AND is_active = true
        LIMIT 1
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      if (rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı" });
      res.json(rows[0]);
    } catch (error: any) {
      console.error("Error QR lookup:", error);
      res.status(500).json({ message: "QR arama başarısız" });
    }
  });

  // Generate QR codes for all inventory items
  router.post('/api/inventory/generate-qr-codes', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE inventory SET qr_code = 'INV-' || code WHERE qr_code IS NULL AND is_active = true
        RETURNING id, code, qr_code
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json({ message: `${rows.length} ürün için QR kod oluşturuldu`, updated: rows.length });
    } catch (error: any) {
      console.error("Error generating QR codes:", error);
      res.status(500).json({ message: "QR kodlar oluşturulamadı" });
    }
  });

  // Get inventory items by category (for counting UI)
  router.get('/api/inventory/by-category', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, code, name, category, sub_category, unit, current_stock, qr_code
        FROM inventory
        WHERE is_active = true
        ORDER BY category, name
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      
      // Group by category
      const grouped: Record<string, any[]> = {};
      for (const row of rows) {
        const cat = row.category || 'diger';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row);
      }
      
      res.json({ items: rows, grouped, totalCount: rows.length });
    } catch (error: any) {
      console.error("Error fetching inventory by category:", error);
      res.status(500).json({ message: "Stok listesi alınamadı" });
    }
  });

  // Count discrepancy summary for dashboard
  router.get('/api/inventory-count-summary', isAuthenticated, async (req: any, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      
      const result = await db.execute(sql`
        SELECT 
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity IN ('critical', 'high'))::int as critical_count,
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity = 'medium')::int as medium_count,
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity = 'low')::int as low_count,
          (SELECT count(*) FROM inventory_counts WHERE year = ${year} AND status = 'completed')::int as completed_counts,
          (SELECT count(*) FROM inventory WHERE is_active = true AND current_stock::numeric < minimum_stock::numeric)::int as below_minimum_count
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows[0] || {});
    } catch (error: any) {
      console.error("Error fetching count summary:", error);
      res.status(500).json({ message: "Özet alınamadı" });
    }
  });


  // ========================================
  // USAGE GUIDE ENDPOINTS
  // ========================================

  router.get('/api/me/usage-guide', isAuthenticated, async (req: any, res) => {
    try {
      const { getRoleGuideContent } = await import('../usage-guide-content');
      const role = req.user?.role || 'stajyer';
      const content = getRoleGuideContent(role);
      res.json(content);
    } catch (error: any) {
      console.error("Usage guide error:", error);
      res.status(500).json({ message: "Kullanım kılavuzu yüklenemedi" });
    }
  });

  const usageGuideRateLimit = new Map<string, number>();

  router.post('/api/me/usage-guide/ask', isAuthenticated, async (req: any, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ message: "Lütfen bir soru girin" });
      }
      if (question.length > 500) {
        return res.status(400).json({ message: "Soru çok uzun, lütfen kısaltın" });
      }

      const userId = req.user?.id;
      const now = Date.now();
      const lastRequest = usageGuideRateLimit.get(userId);
      if (lastRequest && now - lastRequest < 5000) {
        return res.status(429).json({ message: "Lütfen birkaç saniye bekleyin" });
      }
      usageGuideRateLimit.set(userId, now);

      const { getRoleGuideContent } = await import('../usage-guide-content');
      const role = req.user?.role || 'stajyer';
      const guideContent = getRoleGuideContent(role);

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const moduleList = guideContent.availableModules.map(m => `- ${m.name}: ${m.description} (${m.path})`).join('\n');
      const restrictionList = guideContent.restrictions.length > 0 ? guideContent.restrictions.join(', ') : 'Yok';

      const systemPrompt = `Sen DOSPRESSO franchise yönetim sisteminin Türkçe yardım asistanısın.
Kullanıcının rolü: ${guideContent.roleTitle} (${guideContent.roleKey})
Rol açıklaması: ${guideContent.roleDescription}

Erişebildiği modüller:
${moduleList}

Kısıtlamalar: ${restrictionList}

Kurallar:
- Sadece Türkçe yanıt ver
- Kısa ve net yanıtlar ver
- Kullanıcının rolüne uygun bilgi ver
- Erişemediği modüller hakkında yönlendirme yapma
- Sistemi nasıl kullanacağını adım adım anlat`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question.trim() },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const answer = (completion.choices[0]?.message?.content || "Üzgünüm, sorunuza yanıt veremedim. Lütfen tekrar deneyin.") + '\n\n-- Kullanım Kılavuzu sayfasında rolünüze özel tüm modül bilgilerini ve ipuçlarını bulabilirsiniz.';
      res.json({ answer });
    } catch (error: any) {
      console.error("Usage guide AI error:", error);
      res.status(500).json({ message: "AI yanıt üretemedi, lütfen tekrar deneyin" });
    }
  });

  // ========================================
  // GUIDE DOCS (Kılavuz Dokümanları) CRUD
  // ========================================

  router.get('/api/guide-docs', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { search, category } = req.query;
      let conditions: any[] = [eq(guideDocs.isPublished, true)];
      if (category) {
        conditions.push(eq(guideDocs.category, category as string));
      }
      const docs = await db.select().from(guideDocs).where(and(...conditions)).orderBy(asc(guideDocs.sortOrder), desc(guideDocs.createdAt));
      const filtered = docs.filter((d: any) => {
        if (!d.targetRoles || d.targetRoles.length === 0) return true;
        return d.targetRoles.includes(user.role);
      }).filter((d: any) => {
        if (!search) return true;
        const q = (search as string).toLocaleLowerCase('tr-TR');
        return d.title.toLocaleLowerCase('tr-TR').includes(q) || d.content.toLocaleLowerCase('tr-TR').includes(q);
      });
      res.json(filtered);
    } catch (error: any) {
      console.error("Guide docs list error:", error);
      res.status(500).json({ message: "Kılavuz dokümanları yüklenemedi" });
    }
  });

  router.get('/api/guide-docs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [doc] = await db.select().from(guideDocs).where(eq(guideDocs.id, parseInt(req.params.id)));
      if (!doc) return res.status(404).json({ message: "Doküman bulunamadı" });
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: "Doküman yüklenemedi" });
    }
  });

  router.post('/api/admin/guide-docs', isAuthenticated, async (req: any, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertGuideDocSchema.parse({ ...req.body, createdBy: req.user.id });
      const [doc] = await db.insert(guideDocs).values(body).returning();
      res.status(201).json(doc);
    } catch (error: any) {
      console.error("Guide doc create error:", error);
      res.status(400).json({ message: error.message || "Doküman oluşturulamadı" });
    }
  });

  router.put('/api/admin/guide-docs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [doc] = await db.update(guideDocs)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(guideDocs.id, parseInt(req.params.id)))
        .returning();
      if (!doc) return res.status(404).json({ message: "Doküman bulunamadı" });
      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Güncelleme başarısız" });
    }
  });

  router.delete('/api/admin/guide-docs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!['admin', 'ceo', 'cgo'].includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      await db.delete(guideDocs).where(eq(guideDocs.id, parseInt(req.params.id)));
      res.json({ message: "Doküman silindi" });
    } catch (error: any) {
      res.status(500).json({ message: "Silme başarısız" });
    }
  });

  // ========================================
  // ONBOARDING V2: Programs + Instances + Checkins
  // ========================================

  router.get('/api/onboarding-programs', isAuthenticated, async (req: any, res) => {
    try {
      const programs = await db.select().from(onboardingPrograms).orderBy(desc(onboardingPrograms.createdAt));
      res.json(programs);
    } catch (error: any) {
      res.status(500).json({ message: "Programlar yüklenemedi" });
    }
  });

  router.get('/api/onboarding-programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, parseInt(req.params.id)));
      if (!program) return res.status(404).json({ message: "Program bulunamadı" });
      const weeks = await db.select().from(onboardingWeeks)
        .where(eq(onboardingWeeks.programId, program.id))
        .orderBy(asc(onboardingWeeks.weekNumber));
      res.json({ ...program, weeks });
    } catch (error: any) {
      res.status(500).json({ message: "Program detayı yüklenemedi" });
    }
  });

  router.post('/api/onboarding-programs', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingProgramSchema.parse({ ...req.body, createdBy: req.user.id });
      const [program] = await db.insert(onboardingPrograms).values(body).returning();
      res.status(201).json(program);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Program oluşturulamadı" });
    }
  });

  router.put('/api/onboarding-programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [program] = await db.update(onboardingPrograms)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(onboardingPrograms.id, parseInt(req.params.id)))
        .returning();
      if (!program) return res.status(404).json({ message: "Program bulunamadı" });
      res.json(program);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Güncelleme başarısız" });
    }
  });

  router.post('/api/onboarding-programs/:id/weeks', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingWeekSchema.parse({
        ...req.body,
        programId: parseInt(req.params.id),
      });
      const [week] = await db.insert(onboardingWeeks).values(body).returning();
      res.status(201).json(week);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Hafta oluşturulamadı" });
    }
  });

  router.get('/api/onboarding-instances', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      let conditions: any[] = [];
      if (['stajyer', 'bar_buddy', 'barista', 'fabrika_personel', 'fabrika_operator'].includes(user.role)) {
        conditions.push(eq(onboardingInstances.traineeId, user.id));
      } else if (['supervisor', 'supervisor_buddy', 'mudur'].includes(user.role)) {
        conditions.push(eq(onboardingInstances.mentorId, user.id));
      }
      const instances = conditions.length > 0
        ? await db.select().from(onboardingInstances).where(and(...conditions)).orderBy(desc(onboardingInstances.createdAt))
        : await db.select().from(onboardingInstances).orderBy(desc(onboardingInstances.createdAt));
      
      const enriched = await Promise.all(instances.map(async (inst: any) => {
        const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, inst.programId));
        const [trainee] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, inst.traineeId));
        const checkins = await db.select().from(onboardingCheckins).where(eq(onboardingCheckins.instanceId, inst.id));
        return { ...inst, program, trainee, checkinsCount: checkins.length };
      }));
      res.json(enriched);
    } catch (error: any) {
      console.error("Onboarding instances error:", error);
      res.status(500).json({ message: "Onboarding listesi yüklenemedi" });
    }
  });

  router.post('/api/onboarding-instances', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingInstanceSchema.parse(req.body);
      const [instance] = await db.insert(onboardingInstances).values(body).returning();
      res.status(201).json(instance);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Atama oluşturulamadı" });
    }
  });

  router.get('/api/onboarding-instances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [instance] = await db.select().from(onboardingInstances).where(eq(onboardingInstances.id, parseInt(req.params.id)));
      if (!instance) return res.status(404).json({ message: "Onboarding bulunamadı" });
      const [program] = await db.select().from(onboardingPrograms).where(eq(onboardingPrograms.id, instance.programId));
      const weeks = await db.select().from(onboardingWeeks)
        .where(eq(onboardingWeeks.programId, instance.programId))
        .orderBy(asc(onboardingWeeks.weekNumber));
      const checkins = await db.select().from(onboardingCheckins)
        .where(eq(onboardingCheckins.instanceId, instance.id))
        .orderBy(asc(onboardingCheckins.weekNumber));
      const [trainee] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role }).from(users).where(eq(users.id, instance.traineeId));
      let mentor = null;
      if (instance.mentorId) {
        const [m] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, instance.mentorId));
        mentor = m || null;
      }
      res.json({ ...instance, program, weeks, checkins, trainee, mentor });
    } catch (error: any) {
      res.status(500).json({ message: "Onboarding detayı yüklenemedi" });
    }
  });

  router.post('/api/onboarding-instances/:id/checkins', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'supervisor', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const body = insertOnboardingCheckinSchema.parse({
        ...req.body,
        instanceId: parseInt(req.params.id),
        mentorId: req.user.id,
      });
      const [checkin] = await db.insert(onboardingCheckins).values(body).returning();
      res.status(201).json(checkin);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Check-in oluşturulamadı" });
    }
  });

  router.patch('/api/onboarding-instances/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'fabrika_mudur'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [instance] = await db.update(onboardingInstances)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(onboardingInstances.id, parseInt(req.params.id)))
        .returning();
      if (!instance) return res.status(404).json({ message: "Onboarding bulunamadı" });
      res.json(instance);
    } catch (error: any) {
      res.status(500).json({ message: "Tamamlama başarısız" });
    }
  });

  // ========================================
  // DASHBOARD WIDGET ITEMS API
  // ========================================

  // Seed default dashboard widget items if table is empty

  // GET /api/dashboard-widgets/counts - Get widget badge counts for current user
  router.get('/api/dashboard-widgets/counts', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = user.id as string;
      const userRole = user.role as string;
      const branchId = user.branchId ? Number(user.branchId) : null;

      const counts: Record<string, number> = {};

      try {
        const taskResult = await db.select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              inArray(tasks.status, ['pending', 'in_progress', 'onay_bekliyor', 'cevap_bekliyor']),
              or(
                eq(tasks.assignedToId, userId),
                ...(branchId ? [eq(tasks.branchId, branchId)] : [])
              )
            )
          );
        counts['tasks'] = Number(taskResult[0]?.count || 0);
      } catch (error: any) { counts['tasks'] = 0; }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checklistResult = await db.select({ count: sql<number>`count(*)` })
          .from(checklistAssignments)
          .where(
            and(
              eq(checklistAssignments.userId, userId),
              eq(checklistAssignments.status, 'pending')
            )
          );
        counts['checklists'] = Number(checklistResult[0]?.count || 0);
      } catch (error: any) { counts['checklists'] = 0; }

      try {
        const faultConditions = [
          inArray(equipmentFaults.status, ['open', 'in_progress', 'waiting_parts', 'escalated'])
        ];
        if (branchId) {
          faultConditions.push(eq(equipmentFaults.branchId, branchId));
        }
        const faultResult = await db.select({ count: sql<number>`count(*)` })
          .from(equipmentFaults)
          .where(and(...faultConditions));
        counts['faults'] = Number(faultResult[0]?.count || 0);
      } catch (error: any) { counts['faults'] = 0; }

      try {
        const trainingResult = await db.select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false),
              eq(notifications.type, 'training')
            )
          );
        counts['training'] = Number(trainingResult[0]?.count || 0);
      } catch (error: any) { counts['training'] = 0; }

      try {
        const reportResult = await db.select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false)
            )
          );
        counts['reports'] = Number(reportResult[0]?.count || 0);
      } catch (error: any) { counts['reports'] = 0; }

      res.json(counts);
    } catch (error: any) {
      console.error("Error fetching widget counts:", error);
      res.status(500).json({ message: "Widget sayıları yüklenemedi" });
    }
  });

  // GET /api/dashboard-widgets - Get active widgets filtered by user role
  router.get('/api/dashboard-widgets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as string;

      const allWidgets = await db.select().from(dashboardWidgetItems)
        .where(eq(dashboardWidgetItems.isActive, true))
        .orderBy(asc(dashboardWidgetItems.displayOrder));

      const filtered = allWidgets.filter(w => {
        if (!w.targetRoles || w.targetRoles.length === 0) return true;
        return w.targetRoles.includes(userRole);
      });

      res.json(filtered);
    } catch (error: any) {
      console.error("Error fetching dashboard widgets:", error);
      res.status(500).json({ message: "Dashboard widget'ları yüklenemedi" });
    }
  });

export default router;
