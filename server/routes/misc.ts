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
  certificateSettings,
  issuedCertificates,
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

import { ensurePermission, AuthorizationError, assertBranchScope, normalizeTimeGlobal, generateBranchSummary, getCachedResponse, setCachedResponse, invalidateCache } from "./helpers";

const updatePageContentSchema = insertPageContentSchema.partial().omit({
  createdById: true,
});

  // ========================================
  // QR Code Lookup Endpoints
  // ========================================

  // GET /api/qr/equipment/:id - Comprehensive equipment data for QR scan
  router.get("/api/qr/equipment/:id", isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("QR equipment lookup error:", error);
      res.status(500).json({ error: "Ekipman bilgisi alınamadı" });
    }
  });

  // GET /api/qr/inventory/:id - Comprehensive inventory data for QR scan
  router.get("/api/qr/inventory/:id", isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("QR inventory lookup error:", error);
      res.status(500).json({ error: "Ürün bilgisi alınamadı" });
    }
  });

  // GET /api/global-search - Global search across entities
  router.get('/api/global-search', isAuthenticated, async (req, res) => {
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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

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
      } catch (error: unknown) { console.error(error); }

      res.json({ results: results.slice(0, 20) });
    } catch (error: unknown) {
      console.error("Global search error:", error);
      res.status(500).json({ message: "Arama sırasında hata oluştu" });
    }
  });

  // GET /api/users - Get all users (sanitized, for dropdowns/selection)
  router.get('/api/users', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Kullanıcılar alınırken hata oluştu" });
    }
  });

  // POST /api/upload/photo - Upload base64 photo to Object Storage
  router.post('/api/upload/photo', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error uploading photo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yükleme verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yükleme başarısız oldu" });
    }
  });

  // POST /api/upload - General file upload endpoint using multipart/form-data
  router.post('/api/upload', isAuthenticated, generalFileUpload.single('file'), async (req, res) => {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Dosya sunulurken hata oluştu" });
    }
  });

  // GET /api/files/:path - Serve files from Object Storage (authenticated)
  router.get('/api/files/*', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error fetching public branches:", error);
      res.status(500).json({ message: "Şubeler alınırken hata oluştu" });
    }
  });

  // GET /api/public/settings - Get public settings (no auth required)
  router.get('/api/public/settings', async (req, res) => {
    try {
      const allSettings = await storage.getSiteSettings();
      // Only return public settings
      const publicSettings = allSettings.filter((s) => 
        s.isPublic || 
        ['banner_carousel_enabled', 'site_title', 'logo_url', 'favicon_url'].includes(s.key)
      );
      res.json(publicSettings);
    } catch (error: unknown) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Ayarlar yuklenirken hata olustu" });
    }
  });

  router.get('/api/branch-dashboard-allowed-roles', async (req, res) => {
    try {
      const setting = await storage.getSiteSetting('branch_dashboard_allowed_roles');
      if (setting && setting.value) {
        try {
          const roles = JSON.parse(setting.value);
          return res.json({ roles: Array.isArray(roles) ? roles : [] });
        } catch {
          return res.json({ roles: [] });
        }
      }
      return res.json({ roles: [] });
    } catch (error: unknown) {
      console.error("Error fetching branch dashboard roles:", error);
      res.json({ roles: [] });
    }
  });

  // GET /api/mega-module-mapping - Dashboard için mega-modül mapping (DB'den dinamik)
  // GET /api/dashboard-modules - Dashboard için kullanıcının erişebildiği modüller (mega-modüle göre gruplu)
  // Bu endpoint yetkilendirme ile tam senkronize - DOĞRUDAN mega_module_items tablosundan sayılar alınır
  router.get('/api/dashboard-modules', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error fetching personnel profile:", error);
      res.status(500).json({ message: "Personel profili alınırken hata oluştu" });
    }
  });



  // ========================================
  // HR MONTHLY ATTENDANCE SUMMARY - Aggregated View
  // ========================================


  // ========================================
  // OVERTIME REQUESTS - Mesai Talepleri
  // ========================================

  router.get('/api/overtime-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      
      ensurePermission(user, 'attendance', 'view', 'Mesai taleplerini görüntülemek için yetkiniz yok');
      
      const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role );
      
      let requests = await storage.getOvertimeRequests(user.id, canApprove);
      
      if (status && status !== 'all') {
        requests = requests.filter((r) => r.status === status);
      }
      
      res.json(requests);
    } catch (error: unknown) {
      console.error("Error fetching overtime requests:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talepleri yüklenirken hata oluştu" });
    }
  });

  router.post('/api/overtime-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      ensurePermission(user, 'attendance', 'create', 'Mesai talebi oluşturmak için yetkiniz yok');
      
      const validated = insertOvertimeRequestSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const request = await storage.createOvertimeRequest(validated);
      res.status(201).json(request);
    } catch (error: unknown) {
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

  router.patch('/api/overtime-requests/:id/approve', isAuthenticated, async (req, res) => {
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
      
      // P1.5: Fazla mesai onayı → çalışana bildirim
      if (updated?.userId) {
        try {
          await storage.createNotification({
            userId: updated.userId,
            type: 'overtime_approved',
            title: 'Fazla Mesai Onaylandı',
            message: `${updated.overtimeDate} tarihli ${approvedMinutes || updated.requestedMinutes} dk fazla mesai talebiniz onaylandı.`,
            link: '/vardiyalarim',
          });
        } catch (notifErr) {
          console.error("Overtime approval notification error:", notifErr);
        }
      }
      
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
          const relevantAttendance = attendanceRecords.find((att) => {
            if (att.status !== 'checked_out' || !att.shift) return false;
            const shiftDate = new Date(att.shift.date);
            const overtimeDate = new Date(updated.overtimeDate!);
            return shiftDate.toDateString() === overtimeDate.toDateString();
          });
          
          if (relevantAttendance && relevantAttendance.effectiveWorkMinutes !== null) {
            // Get all approved overtime for this shift now
            const allOvertimeForUser = await storage.getOvertimeRequests({ userId: updated.userId });
            const approvedOvertimeForDate = allOvertimeForUser
              .filter((ot) => 
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
            
          }
        } catch (error: unknown) {
          console.error("Error updating attendance for retroactive overtime approval:", error);
          // Don't fail the overall request, just log the error
        }
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error approving overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi onaylanırken hata oluştu" });
    }
  });

  router.patch('/api/overtime-requests/:id/reject', isAuthenticated, async (req, res) => {
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
      
      // P1.5: Fazla mesai reddi → çalışana bildirim
      if (updated?.userId) {
        try {
          await storage.createNotification({
            userId: updated.userId,
            type: 'overtime_rejected',
            title: 'Fazla Mesai Reddedildi',
            message: `${updated.overtimeDate} tarihli fazla mesai talebiniz reddedildi.${rejectionReason ? ' Sebep: ' + rejectionReason : ''}`,
            link: '/vardiyalarim',
          });
        } catch (notifErr) {
          console.error("Overtime rejection notification error:", notifErr);
        }
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error rejecting overtime request:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Mesai talebi reddedilirken hata oluştu" });
    }
  });


  router.post('/api/sla/check-breaches', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!['admin', 'hq_admin', 'hq_staff'].includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      
      await storage.checkSLABreaches();
      res.json({ message: "SLA kontrolleri tamamlandı" });
    } catch (error: unknown) {
      console.error("Error checking SLA breaches:", error);
      res.status(500).json({ message: "SLA kontrolleri yapılırken hata oluştu" });
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
  router.get('/api/user/permissions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const permissions = await getUserPermissions(user?.role);
      
      // Map to array format for frontend
      const permissionArray = Array.from(permissions.entries()).map(([key, scope]) => {
        const [moduleKey, actionKey] = key.split(':');
        return { moduleKey, actionKey, scope };
      });
      
      res.json(permissionArray);
    } catch (error: unknown) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ message: "İzinler alınamadı" });
    }
  });

  // ========================================
  // NOTIFICATION PREFERENCES
  // ========================================

  router.get('/api/notification-preferences', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const [row] = await db.select({ notificationPreferences: users.notificationPreferences })
        .from(users).where(eq(users.id, user.id));
      res.json(row?.notificationPreferences || {});
    } catch (error: unknown) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Tercihler alinamadi" });
    }
  });

  router.patch('/api/notification-preferences', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Tercihler guncellenemedi" });
    }
  });

export default router;
