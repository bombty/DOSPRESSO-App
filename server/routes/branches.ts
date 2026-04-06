import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated, isKioskAuthenticated, createKioskSession, validateKioskSession } from "../localAuth";
import { requireManifestAccess } from "../services/manifest-auth";
import { isHQRole, isBranchRole, hasPermission, type UserRoleType } from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, isNotNull, ne, not, count, sum, avg, max, min } from "drizzle-orm";
import { sanitizeUsersForRole } from "../security";
import { auditLog, createAuditEntry, getAuditContext } from "../audit";
import { handleApiError } from "./helpers";
import bcrypt from "bcrypt";
import { z } from "zod";
import QRCode from "qrcode";
import {
  branches,
  users,
  projects,
  projectMembers,
  projectTasks,
  projectComments,
  projectMilestones,
  projectTaskDependencies,
  projectPhases,
  projectBudgetLines,
  projectVendors,
  projectRisks,
  externalUsers,
  externalUserProjects,
  phaseAssignments,
  phaseSubTasks,
  procurementItems,
  procurementProposals,
  insertBranchSchema,
  insertProjectSchema,
  insertProjectMemberSchema,
  insertProjectTaskSchema,
  insertProjectCommentSchema,
  insertProjectMilestoneSchema,
  insertProjectTaskDependencySchema,
  insertProjectPhaseSchema,
  insertProjectBudgetLineSchema,
  insertProjectVendorSchema,
  insertProjectRiskSchema,
  insertPhaseAssignmentSchema,
  insertPhaseSubTaskSchema,
  insertProcurementItemSchema,
  insertProcurementProposalSchema,
  NEW_SHOP_PHASE_TEMPLATE,
  branchKioskSettings,
  branchStaffPins,
  branchShiftSessions,
  branchShiftEvents,
  branchBreakLogs,
  branchShiftDailySummary,
  branchWeeklyAttendanceSummary,
  branchMonthlyPayrollSummary,
  shifts,
  tasks,
  checklists,
  checklistCompletions,
  dashboardAlerts,
  customerFeedback,
  hqShiftSessions,
  hqShiftEvents,
  notifications,
  announcements,
  announcementReadStatus,
  scheduledOffs,
  qrCheckinNonces,
  pdksRecords,
  shiftAttendance,
  attendancePenalties,
  overtimeRequests,
} from "@shared/schema";
import crypto from "crypto";

const router = Router();

// Kiosk endpoints için genişletilmiş auth — token veya web session kabul eder
const isKioskOrAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Önce kiosk token dene
  const token = req.headers['x-kiosk-token'] as string;
  if (token) {
    try {
      const session = await validateKioskSession(token);
      if (session) {
        req.kioskUserId = session.userId;
        req.authMethod = 'kiosk_token';
        return next();
      }
    } catch {}
  }
  // Web session kabul et (tüm roller)
  if (req.isAuthenticated() && req.user) {
    req.kioskUserId = req.user.id;
    req.authMethod = 'web_session';
    return next();
  }
  return res.status(401).json({ message: 'Yetkilendirme gerekli' });
};

const responseCache = new Map<string, { data: unknown; expiresAt: number }>();
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

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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

// ========================================
// BRANCH CRUD ENDPOINTS
// ========================================

router.get('/api/branches', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    if (user.role && isHQRole(user.role as UserRoleType)) {
      const branches = await storage.getBranches();
      return res.json(branches);
    }
    
    if (user.role && isBranchRole(user.role as UserRoleType)) {
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube ataması yapılmamış" });
      }
      const branch = await storage.getBranch(user.branchId);
      return res.json(branch ? [branch] : []);
    }
    
    const branches = await storage.getBranches();
    res.json(branches);
  } catch (error: unknown) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ message: "Şubeler alınırken hata oluştu" });
  }
});

router.get('/api/branches/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    if (user.role && isBranchRole(user.role as UserRoleType)) {
      if (user.branchId !== id) {
        return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
      }
    }
    
    const branch = await storage.getBranch(id);
    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }
    res.json(branch);
  } catch (error: unknown) {
    console.error("Error fetching branch:", error);
    res.status(500).json({ message: "Şube bilgisi alınırken hata oluştu" });
  }
});

router.get('/api/branches/:branchId/recipients', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (user.role && isBranchRole(user.role as UserRoleType)) {
      if (!user.branchId || Number(user.branchId) !== branchId) {
        return res.status(403).json({ message: "Bu şubenin alıcılarını görme yetkiniz yok" });
      }
    }

    const ROLE_LABELS: Record<string, string> = {
      supervisor: "Supervisor",
      supervisor_buddy: "Yardımcı Supervisor",
      mudur: "Şube Müdürü",
      yatirimci_branch: "Yatırımcı (Şube)",
      yatirimci_hq: "Yatırımcı (Merkez)",
    };

    const targetRoles = ["supervisor", "supervisor_buddy", "mudur", "yatirimci_branch", "yatirimci_hq"];
    const recipients = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          inArray(users.role, targetRoles)
        )
      );

    res.json(recipients.map(r => ({
      name: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Bilinmiyor",
      role: ROLE_LABELS[r.role || ""] || r.role || "Bilinmiyor",
    })));
  } catch (error: any) {
    console.error("Branch recipients error:", error);
    res.status(500).json({ message: "Alıcılar alınırken hata oluştu" });
  }
});

router.get('/api/branches/:branchId/detail', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (user.role && isBranchRole(user.role as UserRoleType)) {
      if (user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
      }
    }

    const cacheKey = `branch-detail-${branchId}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const branchDetails = await storage.getBranchDetails(branchId);
    if (!branchDetails) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    const sanitizedStaff = sanitizeUsersForRole(branchDetails.staff, user.role as UserRoleType);

    const response = {
      ...branchDetails,
      staff: sanitizedStaff,
    };
    
    setCachedResponse(cacheKey, response, 60);
    res.json(response);
  } catch (error: unknown) {
    console.error("Error fetching branch details:", error);
    res.status(500).json({ message: "Şube detayları alınırken hata oluştu" });
  }
});

router.get('/api/branches/:id/staff-scores', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const branchId = parseInt(req.params.id);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }
    if (user.role && isHQRole(user.role as UserRoleType)) {
    } else if (user.role && isBranchRole(user.role as UserRoleType)) {
      if (user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
      }
    } else {
      return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
    }
    const days = parseInt(req.query.days as string) || 30;
    const validDays = Math.min(Math.max(days, 7), 365);
    const scores = await storage.getTeamPerformanceAggregates(branchId, validDays);
    res.json(scores);
  } catch (error: unknown) {
    console.error("Error fetching staff scores:", error);
    res.status(500).json({ message: "Personel skorları yüklenirken hata oluştu" });
  }
});

router.post('/api/branches', isAuthenticated, requireManifestAccess('admin', 'create'), async (req, res) => {
  try {
    const user = req.user!;
    
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
      qrCodeToken: undefined,
    };
    const branch = await storage.createBranch(branchData);
    auditLog(req, { eventType: "branch.created", action: "created", resource: "branches", resourceId: String(branch.id), after: { name: branchData.name, city: branchData.city } });
    res.json(branch);
  } catch (error: unknown) {
    console.error("Error creating branch:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz şube verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Şube oluşturulurken hata oluştu" });
  }
});

router.patch('/api/branches/:id', isAuthenticated, requireManifestAccess('admin', 'edit'), async (req, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    if (!user.role || !isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const validatedData = insertBranchSchema.partial().parse(req.body);
    const existingBranch = await storage.getBranch(id);
    const branch = await storage.updateBranch(id, validatedData);
    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }
    auditLog(req, { eventType: "branch.updated", action: "updated", resource: "branches", resourceId: String(id), before: existingBranch ? { name: existingBranch.name } : undefined, after: validatedData });
    res.json(branch);
  } catch (error: unknown) {
    console.error("Error updating branch:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz şube verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Şube güncellenirken hata oluştu" });
  }
});

router.patch('/api/branches/:id/settings', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);

    if (!isHQRole(role) && role !== 'supervisor') {
      return res.status(403).json({ message: "Şube ayarlarını düzenleme yetkiniz yok" });
    }

    if (role === 'supervisor' && user.branchId !== id) {
      return res.status(403).json({ message: "Sadece kendi şubenizin ayarlarını değiştirebilirsiniz" });
    }

    const { openingHours, closingHours } = req.body;

    if (!openingHours && !closingHours) {
      return res.status(400).json({ message: "En az bir ayar değeri gerekli" });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (openingHours && !timeRegex.test(openingHours)) {
      return res.status(400).json({ message: "Açılış saati geçersiz format (HH:MM)" });
    }
    if (closingHours && !timeRegex.test(closingHours)) {
      return res.status(400).json({ message: "Kapanış saati geçersiz format (HH:MM)" });
    }

    const currentBranch = await storage.getBranch(id);
    if (!currentBranch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    const branch = await storage.updateBranchSettings(id, {
      openingHours: openingHours || currentBranch.openingHours || '08:00',
      closingHours: closingHours || currentBranch.closingHours || '22:00',
    });

    res.json(branch);
  } catch (error: unknown) {
    console.error("Error updating branch settings:", error);
    res.status(500).json({ message: "Şube ayarları güncellenemedi" });
  }
});

router.delete('/api/branches/:id', isAuthenticated, requireManifestAccess('admin', 'delete'), async (req, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    if (!user.role || !isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const deletedBranch = await storage.getBranch(id);
    await db.update(branches).set({ deletedAt: new Date() }).where(eq(branches.id, id));
    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.soft_delete",
      action: "soft_delete",
      resource: "branches",
      resourceId: String(id),
      details: { softDelete: true },
    });
    res.json({ message: "Şube başarıyla silindi" });
  } catch (error: unknown) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Şube silinirken hata oluştu" });
  }
});

router.post('/api/branches/:id/generate-qr', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    if (!user.role || !isHQRole(user.role as UserRoleType)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const crypto = await import('crypto');
    const qrCodeToken = crypto.randomBytes(32).toString('hex');
    
    const branch = await storage.updateBranch(id, { qrCodeToken });
    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }
    
    res.json({ success: true, qrCodeToken });
  } catch (error: unknown) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ message: "QR kod oluşturulamadı" });
  }
});

router.get('/api/branches/:branchId/top-performers', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const branchId = parseInt(req.params.branchId);
    const limit = parseInt(req.query.limit as string) || 10;
    
    const isHQ = !isBranchRole(user.role as UserRoleType);
    if (!isHQ) {
      const isSupervisor = user.role === 'supervisor' || user.role === 'supervisor_buddy';
      if (!isSupervisor || user.branchId !== branchId) {
        return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
      }
    }
    
    const topPerformers = await storage.getTopPerformingEmployees(branchId, limit);
    
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
  } catch (error: unknown) {
    console.error("Error fetching top performers:", error);
    res.status(500).json({ message: "En iyi performanslar alınamadı" });
  }
});

router.get('/api/branches/:id/task-stats', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (!user || !isHQRole(user.role)) {
      return res.status(403).json({ message: 'Bu işlem için HQ yetkisi gerekli' });
    }

    const stats = await storage.getBranchTaskStats(branchId);
    res.json(stats);
  } catch (error: unknown) {
    console.error('Error fetching branch task stats:', error);
    res.status(500).json({ message: 'Görev istatistikleri alınamadı' });
  }
});

router.get('/api/branches/:id/feedback-qr', isAuthenticated, async (req, res) => {
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

    let token = branch[0].feedbackQrToken;
    if (!token) {
      const crypto = await import('crypto');
      token = crypto.randomBytes(16).toString('hex');
      await db.update(branches).set({ feedbackQrToken: token }).where(eq(branches.id, parseInt(id)));
    }

    const feedbackUrl = `${req.protocol}://${req.get('host')}/misafir-geri-bildirim/${token}`;
    const qrDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300 });

    res.json({ 
      token, 
      url: feedbackUrl, 
      qrCode: qrDataUrl,
      branchName: branch[0].name 
    });
  } catch (error: unknown) {
    console.error("Error generating feedback QR:", error);
    res.status(500).json({ message: "QR kod oluşturulamadı" });
  }
});

// ==========================================
// HQ PROJECT MANAGEMENT API
// ==========================================

router.get('/api/projects', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu modüle erişim yetkiniz yok" });
    }
    
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
  } catch (error: unknown) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Projeler alınamadı" });
  }
});

router.post('/api/projects', isAuthenticated, async (req, res) => {
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
    
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: user.id,
      role: 'owner',
      canManageTeam: true,
      canDeleteTasks: true,
    });
    
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
  } catch (error: unknown) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Proje oluşturulamadı" });
  }
});

router.get('/api/projects/:id', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get project detail error:", error);
    res.status(500).json({ message: "Proje detayları alınamadı" });
  }
});

router.patch('/api/projects/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)));
    
    if (!project) {
      return res.status(404).json({ message: "Proje bulunamadı" });
    }
    
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
  } catch (error: unknown) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Proje güncellenemedi" });
  }
});

router.post('/api/projects/:id/members', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    
    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)));
    
    if (!project || project.ownerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: "Üye ekleme yetkiniz yok" });
    }
    
    const existing = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, parseInt(id)),
        eq(projectMembers.userId, userId)
      ));
    
    if (existing.length > 0 && !existing[0].removedAt) {
      return res.status(400).json({ message: "Bu kullanıcı zaten üye" });
    }
    
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
    
    await db.insert(projectComments).values({
      projectId: parseInt(id),
      userId: user.id,
      content: `Yeni üye eklendi`,
      isSystemMessage: true,
    });
    
    res.status(201).json(member);
  } catch (error: unknown) {
    console.error("Add project member error:", error);
    res.status(500).json({ message: "Üye eklenemedi" });
  }
});

router.delete('/api/projects/:id/members/:memberId', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Remove project member error:", error);
    res.status(500).json({ message: "Üye çıkarılamadı" });
  }
});

router.post('/api/projects/:id/tasks', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
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
    
    await db.insert(projectComments).values({
      projectId: parseInt(id),
      userId: user.id,
      content: `Yeni görev oluşturuldu: ${task.title}`,
      isSystemMessage: true,
    });
    
    res.status(201).json(task);
  } catch (error: unknown) {
    console.error("Create project task error:", error);
    res.status(500).json({ message: "Görev oluşturulamadı" });
  }
});

router.patch('/api/project-tasks/:id', isAuthenticated, async (req, res) => {
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
    
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update project task error:", error);
    res.status(500).json({ message: "Görev güncellenemedi" });
  }
});

router.delete('/api/project-tasks/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.delete(projectTasks).where(eq(projectTasks.id, parseInt(id)));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete project task error:", error);
    res.status(500).json({ message: "Görev silinemedi" });
  }
});

router.post('/api/projects/:id/comments', isAuthenticated, async (req, res) => {
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
    
    const [commentUser] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    }).from(users).where(eq(users.id, user.id));
    
    res.status(201).json({ ...comment, user: commentUser });
  } catch (error: unknown) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Yorum eklenemedi" });
  }
});

router.get('/api/projects/:id/milestones', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const milestones = await db.select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, parseInt(id)))
      .orderBy(projectMilestones.dueDate);
    
    res.json(milestones);
  } catch (error: unknown) {
    console.error("Get milestones error:", error);
    res.status(500).json({ message: "Kilometre taşları alınamadı" });
  }
});

router.post('/api/projects/:id/milestones', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    const data = insertProjectMilestoneSchema.parse({
      ...req.body,
      projectId: parseInt(id),
    });
    
    const [milestone] = await db.insert(projectMilestones).values(data).returning();
    
    await db.insert(projectComments).values({
      projectId: parseInt(id),
      userId: user.id,
      content: `Yeni kilometre taşı eklendi: ${milestone.title}`,
      isSystemMessage: true,
    });
    
    res.status(201).json(milestone);
  } catch (error: unknown) {
    console.error("Add milestone error:", error);
    res.status(500).json({ message: "Kilometre taşı eklenemedi" });
  }
});

// Milestone PATCH — güncelleme
router.patch('/api/milestones/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status, isCompleted } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (status !== undefined) updateData.status = status;
    if (isCompleted !== undefined) {
      updateData.status = isCompleted ? 'completed' : 'pending';
      updateData.completedAt = isCompleted ? new Date() : null;
    }
    const [updated] = await db.update(projectMilestones).set(updateData).where(eq(projectMilestones.id, parseInt(id))).returning();
    if (!updated) return res.status(404).json({ message: "Milestone bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update milestone error:", error);
    res.status(500).json({ message: "Milestone güncellenemedi" });
  }
});

// Milestone DELETE — silme
router.delete('/api/milestones/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(projectMilestones).where(eq(projectMilestones.id, parseInt(id))).returning();
    if (!deleted) return res.status(404).json({ message: "Milestone bulunamadı" });
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete milestone error:", error);
    res.status(500).json({ message: "Milestone silinemedi" });
  }
});

router.get('/api/project-tasks/:id/subtasks', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const subtasks = await db.select({
      task: projectTasks,
      assignee: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }
    })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assignedToId, users.id))
      .where(eq(projectTasks.parentTaskId, parseInt(id)))
      .orderBy(projectTasks.orderIndex);
    
    res.json(subtasks.map(s => ({ ...s.task, assignee: s.assignee })));
  } catch (error: unknown) {
    console.error("Get subtasks error:", error);
    res.status(500).json({ message: "Alt görevler alınamadı" });
  }
});

router.post('/api/project-tasks/:id/subtasks', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    const [parentTask] = await db.select().from(projectTasks)
      .where(eq(projectTasks.id, parseInt(id)));
    
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
  } catch (error: unknown) {
    console.error("Create subtask error:", error);
    res.status(500).json({ message: "Alt görev oluşturulamadı" });
  }
});

router.get('/api/project-tasks/:id/dependencies', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dependencies = await db.select({
      dependency: projectTaskDependencies,
      dependsOnTask: {
        id: projectTasks.id,
        title: projectTasks.title,
        status: projectTasks.status,
      }
    })
      .from(projectTaskDependencies)
      .innerJoin(projectTasks, eq(projectTaskDependencies.dependsOnTaskId, projectTasks.id))
      .where(eq(projectTaskDependencies.taskId, parseInt(id)));
    
    res.json(dependencies.map(d => ({ ...d.dependency, dependsOnTask: d.dependsOnTask })));
  } catch (error: unknown) {
    console.error("Get dependencies error:", error);
    res.status(500).json({ message: "Bağımlılıklar alınamadı" });
  }
});

router.post('/api/project-tasks/:id/dependencies', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = insertProjectTaskDependencySchema.parse({
      ...req.body,
      taskId: parseInt(id),
    });
    
    const [dep] = await db.insert(projectTaskDependencies).values(data).returning();
    res.status(201).json(dep);
  } catch (error: unknown) {
    console.error("Add dependency error:", error);
    res.status(500).json({ message: "Bağımlılık eklenemedi" });
  }
});

router.delete('/api/task-dependencies/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.delete(projectTaskDependencies).where(eq(projectTaskDependencies.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete dependency error:", error);
    res.status(500).json({ message: "Bağımlılık silinemedi" });
  }
});

router.get('/api/project-tasks/:id', isAuthenticated, async (req, res) => {
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
    
    const subtasks = await db.select()
      .from(projectTasks)
      .where(eq(projectTasks.parentTaskId, parseInt(id)));
    
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
  } catch (error: unknown) {
    console.error("Get task details error:", error);
    res.status(500).json({ message: "Görev detayları alınamadı" });
  }
});

router.post('/api/project-tasks/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
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
    
    const [commentUser] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    }).from(users).where(eq(users.id, user.id));
    
    res.status(201).json({ ...comment, user: commentUser });
  } catch (error: unknown) {
    console.error("Add task comment error:", error);
    res.status(500).json({ message: "Yorum eklenemedi" });
  }
});

router.get('/api/hq-users', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
    }
    
    const hqRoles = ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik', 'satinalma', 'coach', 'trainer', 'marketing', 'kalite_kontrol', 'gida_muhendisi', 'teknik', 'destek', 'yatirimci_hq'];
    
    const hqUserList = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
      branchId: users.branchId,
    })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          inArray(users.role, hqRoles)
        )
      )
      .orderBy(users.firstName);
    
    res.json(hqUserList);
  } catch (error: unknown) {
    console.error("Get HQ users error:", error);
    res.status(500).json({ message: "HQ kullanıcıları alınamadı" });
  }
});

// Project-eligible users: all active users grouped by department/branch
router.get('/api/project-eligible-users', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
    }

    const search = (req.query.search as string || '').toLowerCase().trim();
    const branchFilter = req.query.branchId ? parseInt(req.query.branchId as string) : null;

    // Get all active users (don't require accountStatus=approved, some old users may not have it)
    const allUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
      branchId: users.branchId,
    })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.firstName);

    // Get branches for grouping
    const branchList = await db.select({
      id: branches.id,
      name: branches.name,
      city: branches.city,
    })
      .from(branches)
      .where(eq(branches.isActive, true))
      .orderBy(branches.name);

    // Filter by search if provided
    let filtered = allUsers;
    if (search) {
      filtered = allUsers.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return fullName.includes(search) || (u.role || '').toLowerCase().includes(search);
      });
    }

    // Filter by branch if provided
    if (branchFilter) {
      filtered = filtered.filter(u => u.branchId === branchFilter || !u.branchId);
    }

    // Define HQ roles and Factory roles
    const hqRoles = ['admin', 'ceo', 'cgo', 'muhasebe', 'muhasebe_ik', 'satinalma', 'coach', 'trainer', 'marketing', 'kalite_kontrol', 'gida_muhendisi', 'teknik', 'destek', 'yatirimci_hq'];
    const factoryRoles = ['fabrika_mudur', 'fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel', 'fabrika'];

    // Group users
    const hqUsers = filtered.filter(u => hqRoles.includes(u.role));
    const factoryUsers = filtered.filter(u => factoryRoles.includes(u.role));
    const branchUsers = filtered.filter(u => !hqRoles.includes(u.role) && !factoryRoles.includes(u.role) && u.branchId);

    // Group branch users by branch
    const branchGroups: Record<number, { branch: typeof branchList[0]; users: typeof filtered }> = {};
    branchUsers.forEach(u => {
      if (!u.branchId) return;
      if (!branchGroups[u.branchId]) {
        const branch = branchList.find(b => b.id === u.branchId);
        if (branch) branchGroups[u.branchId] = { branch, users: [] };
      }
      if (branchGroups[u.branchId]) branchGroups[u.branchId].users.push(u);
    });

    res.json({
      groups: [
        { id: 'hq', label: 'Genel Merkez (HQ)', users: hqUsers },
        { id: 'factory', label: 'Fabrika', users: factoryUsers },
        ...Object.values(branchGroups).map(bg => ({
          id: `branch-${bg.branch.id}`,
          label: `${bg.branch.name}${bg.branch.city ? ' — ' + bg.branch.city : ''}`,
          users: bg.users,
        })),
      ],
      branches: branchList,
      total: filtered.length,
    });
  } catch (error: unknown) {
    console.error("Get project-eligible users error:", error);
    res.status(500).json({ message: "Kullanıcılar alınamadı" });
  }
});

// =============================================
// NEW SHOP OPENING MANAGEMENT ROUTES
// =============================================

router.get('/api/new-shop-projects', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get new shop projects error:", error);
    res.status(500).json({ message: "Projeler alınamadı" });
  }
});

router.post('/api/new-shop-projects', isAuthenticated, async (req, res) => {
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
    
    const [newProject] = await db.insert(projects).values(projectData).returning();
    
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
  } catch (error: unknown) {
    console.error("Create new shop project error:", error);
    res.status(500).json({ message: "Proje oluşturulamadı" });
  }
});

router.get('/api/new-shop-projects/:id', isAuthenticated, async (req, res) => {
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
    
    const phases = await db.select().from(projectPhases)
      .where(eq(projectPhases.projectId, projectId))
      .orderBy(projectPhases.orderIndex);
    
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

    const phasesWithAssignments = phases.map(phase => ({
      ...phase,
      assignments: fetchedAssignments.filter(a => a.assignment.phaseId === phase.id).map(a => ({
        ...a.assignment,
        user: a.user,
      })),
    }));
    
    const budgetLines = await db.select().from(projectBudgetLines)
      .where(eq(projectBudgetLines.projectId, projectId));
    
    const totalPlanned = budgetLines.reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
    const totalActual = budgetLines.reduce((sum, b) => sum + (b.actualAmount || 0), 0);
    const totalPaid = budgetLines.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    
    const vendors = await db.select().from(projectVendors)
      .where(eq(projectVendors.projectId, projectId));
    
    const risks = await db.select().from(projectRisks)
      .where(eq(projectRisks.projectId, projectId));
    
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
  } catch (error: unknown) {
    console.error("Get new shop project error:", error);
    res.status(500).json({ message: "Proje detayı alınamadı" });
  }
});

router.patch('/api/project-phases/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const phaseId = parseInt(req.params.id);
    
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
  } catch (error: unknown) {
    console.error("Update phase error:", error);
    res.status(500).json({ message: "Faz güncellenemedi" });
  }
});

router.post('/api/new-shop-projects/:projectId/phases', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
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
  } catch (error: unknown) {
    console.error("Create phase error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Faz oluşturulamadı" });
  }
});

// ---- Budget Lines ----

router.get('/api/projects/:id/budget', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get budget lines error:", error);
    res.status(500).json({ message: "Bütçe kalemleri alınamadı" });
  }
});

router.post('/api/projects/:id/budget', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Add budget line error:", error);
    res.status(500).json({ message: "Bütçe kalemi eklenemedi" });
  }
});

router.patch('/api/budget-lines/:id', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Update budget line error:", error);
    res.status(500).json({ message: "Bütçe kalemi güncellenemedi" });
  }
});

router.delete('/api/budget-lines/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const lineId = parseInt(req.params.id);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    await db.delete(projectBudgetLines).where(eq(projectBudgetLines.id, lineId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete budget line error:", error);
    res.status(500).json({ message: "Bütçe kalemi silinemedi" });
  }
});

// ---- Vendors ----

router.get('/api/projects/:id/vendors', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get vendors error:", error);
    res.status(500).json({ message: "Tedarikçiler alınamadı" });
  }
});

router.post('/api/projects/:id/vendors', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Add vendor error:", error);
    res.status(500).json({ message: "Tedarikçi eklenemedi" });
  }
});

router.patch('/api/vendors/:id', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Update vendor error:", error);
    res.status(500).json({ message: "Tedarikçi güncellenemedi" });
  }
});

router.delete('/api/vendors/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const vendorId = parseInt(req.params.id);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    await db.delete(projectVendors).where(eq(projectVendors.id, vendorId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ message: "Tedarikçi silinemedi" });
  }
});

// ---- Risks ----

router.get('/api/projects/:id/risks', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get risks error:", error);
    res.status(500).json({ message: "Riskler alınamadı" });
  }
});

router.post('/api/projects/:id/risks', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.id);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
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
  } catch (error: unknown) {
    console.error("Add risk error:", error);
    res.status(500).json({ message: "Risk eklenemedi" });
  }
});

router.patch('/api/risks/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const riskId = parseInt(req.params.id);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    const updateData: any = { ...req.body, updatedAt: new Date() };
    
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
  } catch (error: unknown) {
    console.error("Update risk error:", error);
    res.status(500).json({ message: "Risk güncellenemedi" });
  }
});

router.delete('/api/risks/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const riskId = parseInt(req.params.id);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    await db.delete(projectRisks).where(eq(projectRisks.id, riskId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete risk error:", error);
    res.status(500).json({ message: "Risk silinemedi" });
  }
});

// ========================================
// PHASE MANAGEMENT SYSTEM ROUTES
// ========================================

router.get('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const phaseId = parseInt(req.params.phaseId);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
    }
    
    const subtasks = await db.select().from(phaseSubTasks)
      .where(eq(phaseSubTasks.phaseId, phaseId))
      .orderBy(phaseSubTasks.sortOrder, phaseSubTasks.id);
    
    const categories = subtasks.filter(s => s.isCategory);
    const taskItems = subtasks.filter(s => !s.isCategory);
    
    const nestedResult = categories.map(cat => ({
      ...cat,
      children: taskItems.filter(t => t.parentId === cat.id).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }));
    
    res.json(subtasks);
  } catch (error: unknown) {
    console.error("Get phase subtasks error:", error);
    res.status(500).json({ message: "Alt görevler alınamadı" });
  }
});

router.post('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const phaseId = parseInt(req.params.phaseId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const cleanData = {
      ...req.body,
      dueDate: req.body.dueDate === '' ? null : req.body.dueDate,
      phaseId,
      createdById: user.id,
    };
    
    const data = insertPhaseSubTaskSchema.parse(cleanData);
    
    const [subtask] = await db.insert(phaseSubTasks).values(data).returning();
    res.status(201).json(subtask);
  } catch (error: unknown) {
    console.error("Create phase subtask error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Alt görev oluşturulamadı" });
  }
});

router.patch('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const subtaskId = parseInt(req.params.subtaskId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const updateData: any = { ...req.body, updatedAt: new Date() };
    
    if ('dueDate' in updateData && updateData.dueDate === '') {
      updateData.dueDate = null;
    }
    
    if (req.body.status === 'done') {
      updateData.completedAt = new Date();
    }
    
    const [updated] = await db.update(phaseSubTasks)
      .set(updateData)
      .where(eq(phaseSubTasks.id, subtaskId))
      .returning();
    
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update phase subtask error:", error);
    res.status(500).json({ message: "Alt görev güncellenemedi" });
  }
});

router.patch('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId/reorder', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const subtaskId = parseInt(req.params.subtaskId);
    
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
  } catch (error: unknown) {
    console.error("Reorder phase subtask error:", error);
    res.status(500).json({ message: "Sıralama güncellenemedi" });
  }
});

router.delete('/api/new-shop-projects/:projectId/phases/:phaseId/subtasks/:subtaskId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const subtaskId = parseInt(req.params.subtaskId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    await db.delete(phaseSubTasks).where(eq(phaseSubTasks.id, subtaskId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete phase subtask error:", error);
    res.status(500).json({ message: "Alt görev silinemedi" });
  }
});

// ---- Phase Assignments ----

router.get('/api/new-shop-projects/:projectId/phases/:phaseId/assignments', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get phase assignments error:", error);
    res.status(500).json({ message: "Atamalar alınamadı" });
  }
});

router.post('/api/new-shop-projects/:projectId/phases/:phaseId/assignments', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const phaseId = parseInt(req.params.phaseId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const data = insertPhaseAssignmentSchema.parse({
      ...req.body,
      phaseId,
      assignedById: user.id,
    });
    
    if (!data.userId && !data.externalUserId) {
      return res.status(400).json({ message: "Kullanıcı veya dış kullanıcı seçilmeli" });
    }
    
    const [assignment] = await db.insert(phaseAssignments).values(data).returning();
    res.status(201).json(assignment);
  } catch (error: unknown) {
    console.error("Create phase assignment error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Atama oluşturulamadı" });
  }
});

router.patch('/api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const assignmentId = parseInt(req.params.assignmentId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const [updated] = await db.update(phaseAssignments)
      .set(req.body)
      .where(eq(phaseAssignments.id, assignmentId))
      .returning();
    
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update phase assignment error:", error);
    res.status(500).json({ message: "Atama güncellenemedi" });
  }
});

router.delete('/api/new-shop-projects/:projectId/phases/:phaseId/assignments/:assignmentId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const assignmentId = parseInt(req.params.assignmentId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    await db.delete(phaseAssignments).where(eq(phaseAssignments.id, assignmentId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete phase assignment error:", error);
    res.status(500).json({ message: "Atama silinemedi" });
  }
});

// ---- Procurement Items and Proposals ----

router.get('/api/new-shop-projects/:projectId/procurement/items', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu veriye erişim yetkiniz yok" });
    }
    
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
  } catch (error: unknown) {
    console.error("Get procurement items error:", error);
    res.status(500).json({ message: "Tedarik kalemleri alınamadı" });
  }
});

router.get('/api/new-shop-projects/:projectId/procurement/items/:itemId', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get procurement item error:", error);
    res.status(500).json({ message: "Tedarik kalemi alınamadı" });
  }
});

router.post('/api/new-shop-projects/:projectId/procurement/items', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    
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
  } catch (error: unknown) {
    console.error("Create procurement item error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Tedarik kalemi oluşturulamadı" });
  }
});

router.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const itemId = parseInt(req.params.itemId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const [updated] = await db.update(procurementItems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(procurementItems.id, itemId))
      .returning();
    
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update procurement item error:", error);
    res.status(500).json({ message: "Tedarik kalemi güncellenemedi" });
  }
});

router.post('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const itemId = parseInt(req.params.itemId);
    
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
  } catch (error: unknown) {
    console.error("Create procurement proposal error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Teklif oluşturulamadı" });
  }
});

router.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const proposalId = parseInt(req.params.proposalId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    const [updated] = await db.update(procurementProposals)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(procurementProposals.id, proposalId))
      .returning();
    
    res.json(updated);
  } catch (error: unknown) {
    console.error("Update procurement proposal error:", error);
    res.status(500).json({ message: "Teklif güncellenemedi" });
  }
});

router.patch('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId/select', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const itemId = parseInt(req.params.itemId);
    const proposalId = parseInt(req.params.proposalId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    await db.update(procurementProposals)
      .set({ status: 'selected', reviewedAt: new Date(), reviewedById: user.id })
      .where(eq(procurementProposals.id, proposalId));
    
    await db.update(procurementProposals)
      .set({ status: 'rejected', reviewedAt: new Date(), reviewedById: user.id })
      .where(and(
        eq(procurementProposals.procurementItemId, itemId),
        sql`${procurementProposals.id} != ${proposalId}`,
        sql`${procurementProposals.status} NOT IN ('withdrawn')`
      ));
    
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
  } catch (error: unknown) {
    console.error("Select proposal error:", error);
    res.status(500).json({ message: "Teklif seçilemedi" });
  }
});

router.delete('/api/new-shop-projects/:projectId/procurement/items/:itemId/proposals/:proposalId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const proposalId = parseInt(req.params.proposalId);
    
    const accessCheck = await checkProjectAccess(user, projectId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.error === "Proje bulunamadı" ? 404 : 403).json({ message: accessCheck.error });
    }
    
    await db.delete(procurementProposals).where(eq(procurementProposals.id, proposalId));
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete procurement proposal error:", error);
    res.status(500).json({ message: "Teklif silinemedi" });
  }
});

// ---- External Users for Project ----

router.get('/api/new-shop-projects/:projectId/external-users', isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Get external users error:", error);
    res.status(500).json({ message: "Dış kullanıcılar alınamadı" });
  }
});

router.post('/api/new-shop-projects/:projectId/external-users', isAuthenticated, async (req, res) => {
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
    
    let [existingUser] = await db.select().from(externalUsers)
      .where(eq(externalUsers.email, email.toLowerCase()));
    
    let externalUserId: number;
    
    if (existingUser) {
      externalUserId = existingUser.id;
    } else {
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
    
    const [existingAccess] = await db.select().from(externalUserProjects)
      .where(and(
        eq(externalUserProjects.externalUserId, externalUserId),
        eq(externalUserProjects.projectId, projectId),
        isNull(externalUserProjects.revokedAt)
      ));
    
    if (existingAccess) {
      return res.status(400).json({ message: "Bu kullanıcı zaten projeye atanmış" });
    }
    
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
    
    const [fullExternalUser] = await db.select().from(externalUsers)
      .where(eq(externalUsers.id, externalUserId));
    
    res.status(201).json({ access, user: fullExternalUser });
  } catch (error: unknown) {
    console.error("Invite external user error:", error);
    res.status(500).json({ message: "Dış kullanıcı davet edilemedi" });
  }
});

router.delete('/api/new-shop-projects/:projectId/external-users/:externalUserId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.projectId);
    const externalUserId = parseInt(req.params.externalUserId);
    
    if (!isHQRole(user.role) && user.role !== 'admin') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    await db.update(externalUserProjects)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(externalUserProjects.externalUserId, externalUserId),
        eq(externalUserProjects.projectId, projectId)
      ));
    
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Remove external user error:", error);
    res.status(500).json({ message: "Dış kullanıcı kaldırılamadı" });
  }
});

// ========================================
// ŞUBE KIOSK SİSTEMİ API'LERİ
// ========================================

router.get('/api/branches/:branchId/kiosk/settings', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    
    let [settings] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, branchId))
      .limit(1);
    
    if (!settings) {
      const hashedDefault = await bcrypt.hash('0000', 10);
      [settings] = await db.insert(branchKioskSettings).values({
        branchId,
        kioskPassword: hashedDefault,
      }).returning();
    }
    
    res.json(settings);
  } catch (error: unknown) {
    console.error("Error getting kiosk settings:", error);
    res.status(500).json({ message: "Kiosk ayarları alınamadı" });
  }
});

router.post('/api/branches/:branchId/kiosk/verify-password', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { username, password } = req.body;

    const [branch] = await db.select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    if (username && branch.name.toLowerCase() !== username.toLowerCase()) {
      return res.status(401).json({ message: "Kullanıcı adı veya parola hatalı" });
    }
    
    let [settings] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, branchId))
      .limit(1);
    
    if (!settings) {
      const hashedDefault = await bcrypt.hash('0000', 10);
      [settings] = await db.insert(branchKioskSettings).values({
        branchId,
        kioskPassword: hashedDefault,
      }).returning();
    }
    
    const storedPassword = settings.kioskPassword;
    
    if (!storedPassword) {
      console.warn(`[KioskAuth] Branch ${branchId} has no kiosk password configured`);
      return res.status(401).json({ message: "Kullanıcı adı veya parola hatalı" });
    }
    
    const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
    
    if (!isBcryptHash) {
      console.warn(`[KioskAuth] Branch ${branchId} has unhashed kiosk password — login rejected for security`);
      return res.status(401).json({ message: "Kullanıcı adı veya parola hatalı" });
    }
    
    const isValid = await bcrypt.compare(password, storedPassword);
    if (!isValid) {
      return res.status(401).json({ message: "Kullanıcı adı veya parola hatalı" });
    }
    
    res.json({ success: true, branchName: branch.name });
  } catch (error: unknown) {
    console.error("Error verifying kiosk password:", error);
    res.status(500).json({ message: "Parola doğrulanamadı" });
  }
});

router.get('/api/branches/:branchId/kiosk/staff', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    
    const staff = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
    }).from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.branchId, branchId)
      ))
      .orderBy(users.firstName);
    
    const staffWithPinStatus = await Promise.all(staff.map(async (s) => {
      const [pin] = await db.select({ id: branchStaffPins.id })
        .from(branchStaffPins)
        .where(and(
          eq(branchStaffPins.userId, s.id),
          eq(branchStaffPins.branchId, branchId),
          eq(branchStaffPins.isActive, true)
        ))
        .limit(1);
      
      return {
        ...s,
        hasPin: !!pin
      };
    }));
    
    res.json(staffWithPinStatus);
  } catch (error: unknown) {
    console.error("Error fetching branch staff:", error);
    res.status(500).json({ message: "Şube personeli alınamadı" });
  }
});

router.post('/api/branches/:branchId/kiosk/login', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { userId, pin } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitId = `branch_${branchId}_${clientIp}_${userId || 'unknown'}`;
    const rateCheck = checkKioskRateLimit(rateLimitId);
    if (!rateCheck.allowed) { return res.status(429).json({ message: `Çok fazla deneme. ${Math.ceil((rateCheck.retryAfter || 1800) / 60)} dakika sonra tekrar deneyin.`, retryAfter: rateCheck.retryAfter }); }
    
    if (!userId || !pin) {
      return res.status(400).json({ message: "Kullanıcı ve PIN gerekli" });
    }

    const [pinRecord] = await db.select().from(branchStaffPins)
      .where(and(
        eq(branchStaffPins.userId, userId),
        eq(branchStaffPins.branchId, branchId),
        eq(branchStaffPins.isActive, true)
      ))
      .limit(1);

    if (!pinRecord) {
      return res.status(404).json({ message: "PIN kaydı bulunamadı. Yöneticinizle iletişime geçin." });
    }

    if (pinRecord.pinLockedUntil && new Date(pinRecord.pinLockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(pinRecord.pinLockedUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({ message: `Hesabınız ${remainingMinutes} dakika kilitli` });
    }

    const isValid = await bcrypt.compare(pin, pinRecord.hashedPin);
    
    if (!isValid) {
      const newAttempts = (pinRecord.pinFailedAttempts || 0) + 1;
      const lockUntil = newAttempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      
      await db.update(branchStaffPins)
        .set({ 
          pinFailedAttempts: newAttempts,
          pinLockedUntil: lockUntil
        })
        .where(eq(branchStaffPins.id, pinRecord.id));

      if (newAttempts >= 3) {
        try {
          const [lockedUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, userId)).limit(1);
          const lockedName = lockedUser ? `${lockedUser.firstName} ${lockedUser.lastName}` : `Kullanıcı #${userId}`;
          const [branchInfo] = await db.select({ name: branches.name })
            .from(branches).where(eq(branches.id, branchId)).limit(1);
          const branchLabel = branchInfo?.name || `Şube #${branchId}`;
          const admins = await db.select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, 'admin'), eq(users.role, 'bolge_muduru')));
          if (admins.length > 0) {
            await db.insert(notifications).values(admins.map(a => ({
              userId: a.id,
              type: 'pin_lockout',
              title: 'PIN Kilitlendi',
              message: `${lockedName} (${branchLabel}) hesabı 3 başarısız PIN denemesi sonrası kilitlendi`,
              link: '/admin/fabrika-pin-yonetimi',
              isRead: false,
            })));
          }
        } catch (notifErr) {
          console.error("Branch PIN lockout notification error:", notifErr);
        }
      }
      
      return res.status(401).json({ 
        message: "Hatalı PIN",
        attemptsRemaining: Math.max(0, 3 - newAttempts)
      });
    }

    await db.update(branchStaffPins)
      .set({ pinFailedAttempts: 0, pinLockedUntil: null })
      .where(eq(branchStaffPins.id, pinRecord.id));

    const [user] = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [activeSession] = await db.select().from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.userId, userId),
        eq(branchShiftSessions.branchId, branchId),
        or(
          eq(branchShiftSessions.status, 'active'),
          eq(branchShiftSessions.status, 'on_break')
        )
      ))
      .limit(1);

    const kioskToken = await createKioskSession(userId);

    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      },
      activeSession: activeSession || null,
      kioskToken,
    });
  } catch (error: unknown) {
    console.error("Error in branch kiosk login:", error);
    res.status(500).json({ message: "Giriş yapılamadı" });
  }
});

router.post("/api/branches/:branchId/kiosk/shift-start", isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "Kullanıcı gerekli" });
    }

    const [existingSession] = await db.select().from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.userId, userId),
        eq(branchShiftSessions.branchId, branchId),
        or(
          eq(branchShiftSessions.status, 'active'),
          eq(branchShiftSessions.status, 'on_break')
        )
      ))
      .limit(1);

    if (existingSession) {
      return res.status(400).json({ message: "Zaten aktif bir vardiyası var", session: existingSession });
    }

    const now = new Date();
    const { latitude, longitude } = req.body;

    let checkInLatitude: string | null = null;
    let checkInLongitude: string | null = null;
    let isLocationVerified = false;
    let locationDistance: number | null = null;

    if (latitude && longitude) {
      checkInLatitude = String(latitude);
      checkInLongitude = String(longitude);

      const [branch] = await db.select({
        shiftCornerLatitude: branches.shiftCornerLatitude,
        shiftCornerLongitude: branches.shiftCornerLongitude,
        geoRadius: branches.geoRadius,
      }).from(branches).where(eq(branches.id, branchId));

      if (branch && branch.shiftCornerLatitude && branch.shiftCornerLongitude) {
        const dist = calculateDistance(
          Number(latitude), Number(longitude),
          Number(branch.shiftCornerLatitude), Number(branch.shiftCornerLongitude)
        );
        locationDistance = dist;
        isLocationVerified = dist <= (branch.geoRadius || 50);
      }
    }

    const todayStr = now.toISOString().split('T')[0];
    let plannedShiftId: number | null = null;
    let lateMinutes = 0;
    let isLateArrival = false;

    const [plannedShift] = await db.select().from(shifts)
      .where(and(
        eq(shifts.branchId, branchId),
        eq(shifts.assignedToId, userId),
        eq(shifts.shiftDate, todayStr)
      ))
      .limit(1);

    const [kioskSettings] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, branchId))
      .limit(1);
    const lateToleranceMinutes = kioskSettings?.lateToleranceMinutes ?? 15;

    if (plannedShift) {
      plannedShiftId = plannedShift.id;
      const [hours, minutes] = plannedShift.startTime.split(':').map(Number);
      const plannedStart = new Date(now);
      plannedStart.setHours(hours, minutes, 0, 0);
      if (now.getTime() > plannedStart.getTime()) {
        lateMinutes = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
        if (lateMinutes > lateToleranceMinutes) {
          isLateArrival = true;
        }
      }
    } else if (kioskSettings?.defaultShiftStartTime) {
      const [hours, minutes] = kioskSettings.defaultShiftStartTime.split(':').map(Number);
      const plannedStart = new Date(now);
      plannedStart.setHours(hours, minutes, 0, 0);
      if (now.getTime() > plannedStart.getTime()) {
        lateMinutes = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
        if (lateMinutes > lateToleranceMinutes) {
          isLateArrival = true;
        }
      }
    }

    const [session] = await db.insert(branchShiftSessions).values({
      userId,
      branchId,
      checkInTime: now,
      status: 'active',
      checkInLatitude,
      checkInLongitude,
      isLocationVerified,
      locationDistance,
      plannedShiftId,
      lateMinutes,
    }).returning();

    await db.insert(branchShiftEvents).values({
      sessionId: session.id,
      userId,
      branchId,
      eventType: 'check_in',
      eventTime: now,
    });

    try {
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      await db.insert(pdksRecords).values({
        userId,
        branchId,
        recordDate: dateStr,
        recordTime: timeStr,
        recordType: 'giris',
        source: 'kiosk',
      });
    } catch (pdksErr) {
      console.error("PDKS giris hook error (non-blocking):", pdksErr);
    }

    // ═══ HER CHECK-IN'DE shift_attendance OLUŞTUR (geç kalma fark etmez) ═══
    {
      let shiftIdForAttendance: number | null = plannedShiftId;

      if (!shiftIdForAttendance) {
        const [fallbackShift] = await db.select({ id: shifts.id })
          .from(shifts)
          .where(and(
            eq(shifts.assignedToId, userId),
            eq(shifts.shiftDate, todayStr)
          ))
          .limit(1);
        if (fallbackShift) shiftIdForAttendance = fallbackShift.id;
      }

      // Vardiya yoksa adhoc oluştur
      if (!shiftIdForAttendance) {
        try {
          const [adHocShift] = await db.insert(shifts).values({
            branchId,
            assignedToId: userId,
            createdById: userId,
            shiftDate: todayStr,
            startTime: "08:00:00",
            endTime: "17:00:00",
            shiftType: "morning",
            status: "confirmed",
          }).returning();
          if (adHocShift) {
            shiftIdForAttendance = adHocShift.id;
            console.log(`[BRANCH-KIOSK] Ad-hoc shift created: id=${adHocShift.id} for user=${userId} branch=${branchId} date=${todayStr}`);
          }
        } catch (adHocErr: any) {
          console.error(`[BRANCH-KIOSK] Ad-hoc shift creation FAILED user=${userId} branch=${branchId}: ${adHocErr?.message || adHocErr}`);
        }
      }

      if (shiftIdForAttendance) {
        try {
          const [existingSA] = await db.select({ id: shiftAttendance.id })
            .from(shiftAttendance)
            .where(and(
              eq(shiftAttendance.shiftId, shiftIdForAttendance),
              eq(shiftAttendance.userId, userId)
            ))
            .limit(1);

          let saId: number;
          if (existingSA) {
            saId = existingSA.id;
            console.log(`[BRANCH-KIOSK] Existing shift_attendance reused: id=${saId}`);
          } else {
            const [newSA] = await db.insert(shiftAttendance).values({
              shiftId: shiftIdForAttendance,
              userId,
              checkInTime: now,
              status: 'checked_in',
              latenessMinutes: isLateArrival ? lateMinutes : 0,
            }).returning();
            saId = newSA.id;
            console.log(`[BRANCH-KIOSK] shift_attendance created: id=${saId} shift=${shiftIdForAttendance} user=${userId}`);
          }

          // session'a shift_attendance_id linkle
          await db.update(branchShiftSessions)
            .set({ shiftAttendanceId: saId } as any)
            .where(and(
              eq(branchShiftSessions.userId, userId),
              eq(branchShiftSessions.branchId, branchId),
              eq(branchShiftSessions.status, 'active')
            ));

          // Geç kalma cezası SADECE geç kalanlara
          if (isLateArrival && lateMinutes > 0) {
            await db.insert(attendancePenalties).values({
              shiftAttendanceId: saId,
              type: 'late_arrival',
              minutes: lateMinutes,
              reason: `Kiosk giriş: ${lateMinutes} dk geç (tolerans: ${lateToleranceMinutes} dk)`,
              autoGenerated: true,
            });
          }
        } catch (saErr: any) {
          console.error(`[BRANCH-KIOSK] shift_attendance write FAILED shift=${shiftIdForAttendance} user=${userId}: ${saErr?.message || saErr}`);
        }
      }
    }

    // P1.1: Geç kalma → supervisor bildirim
    if (isLateArrival && lateMinutes > 0) {
      try {
        const [lateUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, userId)).limit(1);
        const lateName = [lateUser?.firstName, lateUser?.lastName].filter(Boolean).join(' ') || 'Çalışan';
        
        const supervisors = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            sql`${users.role} IN ('supervisor', 'supervisor_buddy', 'mudur')`
          ));
        
        if (supervisors.length > 0) {
          await db.insert(notifications).values(supervisors.map(s => ({
            userId: s.id,
            type: 'late_arrival',
            title: 'Geç Kalma Bildirimi',
            message: `${lateName} vardiyasına ${lateMinutes} dk geç kaldı (tolerans: ${lateToleranceMinutes} dk)`,
            link: '/vardiya-planlama',
            isRead: false,
            branchId,
          })));
        }
      } catch (notifErr) {
        console.error("[BRANCH-KIOSK] Late arrival notification error:", notifErr);
      }
    }

    res.json({
      success: true,
      session,
      isLateArrival,
      lateMinutes,
      lateToleranceMinutes,
    });
  } catch (error: unknown) {
    console.error("Error starting branch shift:", error);
    res.status(500).json({ message: "Vardiya başlatılamadı" });
  }
});

router.post('/api/branches/:branchId/kiosk/break-start', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { sessionId, breakType } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: "Oturum gerekli" });
    }

    const [session] = await db.select().from(branchShiftSessions)
      .where(eq(branchShiftSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "Oturum bulunamadı" });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: "Vardiya aktif değil" });
    }

    const now = new Date();

    await db.update(branchShiftSessions)
      .set({ status: 'on_break' })
      .where(eq(branchShiftSessions.id, sessionId));

    const [breakLog] = await db.insert(branchBreakLogs).values({
      sessionId,
      userId: session.userId,
      branchId,
      breakStartTime: now,
      breakType: breakType || 'regular',
    }).returning();

    await db.insert(branchShiftEvents).values({
      sessionId,
      userId: session.userId,
      branchId,
      eventType: 'break_start',
      eventTime: now,
    });

    res.json({
      success: true,
      breakLog,
    });
  } catch (error: unknown) {
    console.error("Error starting break:", error);
    res.status(500).json({ message: "Mola başlatılamadı" });
  }
});

router.post('/api/branches/:branchId/kiosk/break-end', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    let { sessionId, userId } = req.body;

    // sessionId yoksa userId ile bul
    if (!sessionId && userId) {
      const [found] = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, userId),
          eq(branchShiftSessions.branchId, branchId),
          eq(branchShiftSessions.status, 'on_break')
        ))
        .limit(1);
      if (found) sessionId = found.id;
    }
    
    if (!sessionId) {
      return res.status(400).json({ message: "Oturum gerekli" });
    }

    const [session] = await db.select().from(branchShiftSessions)
      .where(eq(branchShiftSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "Oturum bulunamadı" });
    }

    if (session.status !== 'on_break') {
      return res.status(400).json({ message: "Şu anda molada değil" });
    }

    const now = new Date();

    const [activeBreak] = await db.select().from(branchBreakLogs)
      .where(and(
        eq(branchBreakLogs.sessionId, sessionId),
        isNull(branchBreakLogs.breakEndTime)
      ))
      .orderBy(desc(branchBreakLogs.breakStartTime))
      .limit(1);

    if (activeBreak) {
      const breakDuration = Math.floor((now.getTime() - new Date(activeBreak.breakStartTime).getTime()) / 60000);
      
      await db.update(branchBreakLogs)
        .set({ 
          breakEndTime: now,
          breakDurationMinutes: breakDuration
        })
        .where(eq(branchBreakLogs.id, activeBreak.id));

      await db.update(branchShiftSessions)
        .set({ 
          status: 'active',
          breakMinutes: (session.breakMinutes || 0) + breakDuration
        })
        .where(eq(branchShiftSessions.id, sessionId));
    } else {
      await db.update(branchShiftSessions)
        .set({ status: 'active' })
        .where(eq(branchShiftSessions.id, sessionId));
    }

    await db.insert(branchShiftEvents).values({
      sessionId,
      userId: session.userId,
      branchId,
      eventType: 'break_end',
      eventTime: now,
    });

    // P3.1: Uzun mola uyarısı → supervisor bildirim
    if (activeBreak) {
      const breakDuration = Math.floor((now.getTime() - new Date(activeBreak.breakStartTime).getTime()) / 60000);
      const [kioskCfg] = await db.select({ maxBreak: branchKioskSettings.maxBreakMinutes })
        .from(branchKioskSettings).where(eq(branchKioskSettings.branchId, branchId)).limit(1);
      const maxBreak = kioskCfg?.maxBreak || 90;

      if (breakDuration > maxBreak) {
        try {
          const [breakUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, session.userId)).limit(1);
          const bName = [breakUser?.firstName, breakUser?.lastName].filter(Boolean).join(' ') || 'Çalışan';

          const supervisors = await db.select({ id: users.id }).from(users)
            .where(and(
              eq(users.branchId, branchId),
              eq(users.isActive, true),
              sql`${users.role} IN ('supervisor', 'supervisor_buddy', 'mudur')`
            ));

          if (supervisors.length > 0) {
            await db.insert(notifications).values(supervisors.map(s => ({
              userId: s.id,
              type: 'long_break_warning',
              title: 'Uzun Mola Uyarısı',
              message: `${bName} ${breakDuration} dk mola yaptı (limit: ${maxBreak} dk)`,
              link: '/vardiya-planlama',
              isRead: false,
              branchId,
            })));
          }
        } catch (notifErr) {
          console.error("[BRANCH-KIOSK] Long break notification error:", notifErr);
        }
      }
    }

    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Error ending break:", error);
    res.status(500).json({ message: "Mola bitirilemedi" });
  }
});

router.post('/api/branches/:branchId/kiosk/shift-end', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { sessionId, notes, latitude, longitude } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: "Oturum gerekli" });
    }

    const [session] = await db.select().from(branchShiftSessions)
      .where(eq(branchShiftSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "Oturum bulunamadı" });
    }

    const now = new Date();
    const checkInTime = new Date(session.checkInTime);
    const totalWorkMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
    const netWorkMinutes = totalWorkMinutes - (session.breakMinutes || 0);

    if (session.status === 'on_break') {
      const [activeBreak] = await db.select().from(branchBreakLogs)
        .where(and(
          eq(branchBreakLogs.sessionId, sessionId),
          isNull(branchBreakLogs.breakEndTime)
        ))
        .limit(1);

      if (activeBreak) {
        const breakDuration = Math.floor((now.getTime() - new Date(activeBreak.breakStartTime).getTime()) / 60000);
        await db.update(branchBreakLogs)
          .set({ breakEndTime: now, breakDurationMinutes: breakDuration })
          .where(eq(branchBreakLogs.id, activeBreak.id));
      }
    }

    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let approvedOvertimeMinutes = 0;
    let effectiveOvertimeMinutes = 0;

    if (session.plannedShiftId) {
      const [plannedShift] = await db.select().from(shifts)
        .where(eq(shifts.id, session.plannedShiftId))
        .limit(1);

      if (plannedShift) {
        const [endH, endM] = plannedShift.endTime.split(':').map(Number);
        const plannedEnd = new Date(now);
        plannedEnd.setHours(endH, endM, 0, 0);
        const diff = now.getTime() - plannedEnd.getTime();
        if (diff < 0) {
          earlyLeaveMinutes = Math.floor(Math.abs(diff) / 60000);
        } else if (diff > 0) {
          overtimeMinutes = Math.floor(diff / 60000);
        }
      }
    }

    // P2.2: Onaylı fazla mesai kontrolü
    if (overtimeMinutes > 0) {
      try {
        const todayStr = now.toISOString().split('T')[0];
        const approvedReqs = await db.select({ approvedMinutes: overtimeRequests.approvedMinutes })
          .from(overtimeRequests)
          .where(and(
            eq(overtimeRequests.userId, session.userId),
            eq(overtimeRequests.overtimeDate, todayStr),
            eq(overtimeRequests.status, 'approved'),
          ));
        approvedOvertimeMinutes = approvedReqs.reduce((sum, r) => sum + (r.approvedMinutes || 0), 0);
        effectiveOvertimeMinutes = Math.min(overtimeMinutes, approvedOvertimeMinutes);
      } catch (otErr) {
        console.error("[BRANCH-KIOSK] Overtime check error (non-blocking):", otErr);
        effectiveOvertimeMinutes = overtimeMinutes; // Fallback: count all overtime
      }
    }

    const [updatedSession] = await db.update(branchShiftSessions)
      .set({
        checkOutTime: now,
        workMinutes: totalWorkMinutes,
        netWorkMinutes: netWorkMinutes,
        status: 'completed',
        notes: notes || null,
        checkOutLatitude: latitude ? String(latitude) : null,
        checkOutLongitude: longitude ? String(longitude) : null,
        earlyLeaveMinutes,
        overtimeMinutes,
      })
      .where(eq(branchShiftSessions.id, sessionId))
      .returning();

    await db.insert(branchShiftEvents).values({
      sessionId,
      userId: session.userId,
      branchId,
      eventType: 'check_out',
      eventTime: now,
    });

    const workDate = checkInTime.toISOString().split('T')[0];
    const [existingSummary] = await db.select().from(branchShiftDailySummary)
      .where(and(
        eq(branchShiftDailySummary.userId, session.userId),
        eq(branchShiftDailySummary.workDate, workDate)
      ))
      .limit(1);

    if (existingSummary) {
      await db.update(branchShiftDailySummary)
        .set({
          sessionCount: (existingSummary.sessionCount || 0) + 1,
          lastCheckOut: now,
          totalWorkMinutes: (existingSummary.totalWorkMinutes || 0) + totalWorkMinutes,
          totalBreakMinutes: (existingSummary.totalBreakMinutes || 0) + (session.breakMinutes || 0),
          netWorkMinutes: (existingSummary.netWorkMinutes || 0) + netWorkMinutes,
          updatedAt: now,
        })
        .where(eq(branchShiftDailySummary.id, existingSummary.id));
    } else {
      await db.insert(branchShiftDailySummary).values({
        userId: session.userId,
        branchId,
        workDate,
        sessionCount: 1,
        firstCheckIn: checkInTime,
        lastCheckOut: now,
        totalWorkMinutes: totalWorkMinutes,
        totalBreakMinutes: session.breakMinutes || 0,
        netWorkMinutes: netWorkMinutes,
      });
    }

    try {
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      await db.insert(pdksRecords).values({
        userId: session.userId,
        branchId,
        recordDate: dateStr,
        recordTime: timeStr,
        recordType: 'cikis',
        source: 'kiosk',
      });
    } catch (pdksErr) {
      console.error("PDKS cikis hook error (non-blocking):", pdksErr);
    }

    // P1.2+P1.3: Fazla mesai / erken çıkış → supervisor bildirim
    if (overtimeMinutes > 15 || earlyLeaveMinutes > 15) {
      try {
        const [shiftUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, session.userId)).limit(1);
        const uName = [shiftUser?.firstName, shiftUser?.lastName].filter(Boolean).join(' ') || 'Çalışan';
        
        const supervisors = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            sql`${users.role} IN ('supervisor', 'supervisor_buddy', 'mudur')`
          ));
        
        if (supervisors.length > 0) {
          const notifType = overtimeMinutes > 15 ? 'overtime_alert' : 'early_leave_alert';
          const notifTitle = overtimeMinutes > 15 ? 'Fazla Mesai Bildirimi' : 'Erken Çıkış Bildirimi';
          const notifMessage = overtimeMinutes > 15
            ? `${uName} vardiyasını ${overtimeMinutes} dk fazla mesai ile tamamladı`
            : `${uName} vardiyasından ${earlyLeaveMinutes} dk erken ayrıldı`;
          
          await db.insert(notifications).values(supervisors.map(s => ({
            userId: s.id,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            link: '/vardiya-planlama',
            isRead: false,
            branchId,
          })));
        }
      } catch (notifErr) {
        console.error("[BRANCH-KIOSK] Shift-end notification error:", notifErr);
      }
    }

    res.json({
      success: true,
      session: updatedSession,
      summary: {
        totalWorkMinutes,
        breakMinutes: session.breakMinutes || 0,
        netWorkMinutes,
      }
    });
  } catch (error: unknown) {
    console.error("Error ending branch shift:", error);
    res.status(500).json({ message: "Vardiya bitirilemedi" });
  }
});

router.get('/api/branches/:branchId/kiosk/session/:userId', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const userId = req.params.userId;
    
    const [session] = await db.select().from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.userId, userId),
        eq(branchShiftSessions.branchId, branchId),
        or(
          eq(branchShiftSessions.status, 'active'),
          eq(branchShiftSessions.status, 'on_break')
        )
      ))
      .limit(1);

    if (!session) {
      return res.json({ activeSession: null });
    }

    const userTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.assignedTo, userId),
        or(
          eq(tasks.status, 'pending'),
          eq(tasks.status, 'in_progress')
        )
      ))
      .orderBy(tasks.dueDate);

    const userProfile = await storage.getUser(userId);
    const myAssignments = await storage.getMyChecklistAssignments(
      userId,
      userProfile?.branchId || undefined,
      userProfile?.role || undefined
    );
    
    const today = new Date().toISOString().split('T')[0];
    const todayCompletions = await storage.getUserChecklistCompletions(userId, today);
    
    const userChecklists = myAssignments.map(item => {
      const todayCompletion = todayCompletions.find(c => c.checklistId === item.id);
      const completedTasks = todayCompletion?.completedTasks || 0;
      const totalTasks = item.tasks.length;
      return {
        id: item.id,
        name: item.title,
        assignmentId: item.assignment.id,
        pendingTasks: totalTasks - completedTasks,
        completedTasks,
        totalTasks,
      };
    })

    // Şube açık görevleri
    const branchOpenTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      category: tasks.category,
      status: tasks.status,
      assignedTo: tasks.assignedTo,
    }).from(tasks)
      .where(and(
        eq(tasks.branchId, branchId),
        or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress'))
      ))
      .limit(5);

    res.json({
      activeSession: session,
      tasks: userTasks,
      checklists: userChecklists,
      branchTasks: branchOpenTasks,
    });
  } catch (error: unknown) {
    console.error("Error getting session:", error);
    res.status(500).json({ message: "Oturum bilgisi alınamadı" });
  }
});

router.post('/api/branches/:branchId/kiosk/set-pin', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const BRANCH_PIN_ADMIN_ROLES = ['admin', 'ceo', 'mudur'];
    if (!BRANCH_PIN_ADMIN_ROLES.includes(user?.role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    const branchId = parseInt(req.params.branchId);
    const { userId, pin } = req.body;
    
    if (!userId || !pin || pin.length !== 4) {
      return res.status(400).json({ message: "4 haneli PIN gerekli" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const [existing] = await db.select().from(branchStaffPins)
      .where(and(
        eq(branchStaffPins.userId, userId),
        eq(branchStaffPins.branchId, branchId)
      ))
      .limit(1);

    if (existing) {
      await db.update(branchStaffPins)
        .set({ 
          hashedPin,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(branchStaffPins.id, existing.id));
    } else {
      await db.insert(branchStaffPins).values({
        userId,
        branchId,
        hashedPin,
        isActive: true,
      });
    }

    res.json({ success: true, message: "PIN ayarlandı" });
  } catch (error: unknown) {
    console.error("Error setting PIN:", error);
    res.status(500).json({ message: "PIN ayarlanamadı" });
  }
});

router.get('/api/branches/:branchId/kiosk/active-shifts', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    
    const activeSessions = await db.select({
      session: branchShiftSessions,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
      }
    }).from(branchShiftSessions)
      .leftJoin(users, eq(branchShiftSessions.userId, users.id))
      .where(and(
        eq(branchShiftSessions.branchId, branchId),
        or(
          eq(branchShiftSessions.status, 'active'),
          eq(branchShiftSessions.status, 'on_break')
        )
      ))
      .orderBy(branchShiftSessions.checkInTime);

    res.json(activeSessions);
  } catch (error: unknown) {
    console.error("Error fetching active shifts:", error);
    res.status(500).json({ message: "Aktif vardiyalar alınamadı" });
  }
});

// =================== KIOSK LOBBY (bekleme ekranı verisi) ===================

router.get('/api/branches/:branchId/kiosk/lobby', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Şube personeli + PIN durumu
    const staff = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
    }).from(users)
      .where(and(eq(users.isActive, true), eq(users.branchId, branchId)))
      .orderBy(users.firstName);

    // PIN durumu toplu sorgula
    const staffIds = staff.map(s => s.id);
    const pins = staffIds.length > 0
      ? await db.select({ userId: branchStaffPins.userId })
          .from(branchStaffPins)
          .where(and(
            inArray(branchStaffPins.userId, staffIds),
            eq(branchStaffPins.branchId, branchId),
            eq(branchStaffPins.isActive, true)
          ))
      : [];
    const pinSet = new Set(pins.map(p => p.userId));

    // 2. Aktif session'lar (bugün vardiyada olanlar)
    const activeSessions = await db.select({
      userId: branchShiftSessions.userId,
      status: branchShiftSessions.status,
      checkInTime: branchShiftSessions.checkInTime,
    }).from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.branchId, branchId),
        or(eq(branchShiftSessions.status, 'active'), eq(branchShiftSessions.status, 'on_break'))
      ));

    const sessionMap = new Map(activeSessions.map(s => [s.userId, s]));

    // 3. Bugünkü vardiya planı
    const todayShifts = await db.select({
      userId: shifts.assignedToId,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    }).from(shifts)
      .where(and(
        eq(shifts.branchId, branchId),
        eq(shifts.shiftDate, todayStr),
        eq(shifts.status, 'published')
      ));

    const shiftMap = new Map(todayShifts.filter(s => s.userId).map(s => [s.userId!, s]));

    // 4. Bugün izinli olanlar
    const todayOffs = await db.select({ userId: scheduledOffs.userId })
      .from(scheduledOffs)
      .where(and(
        eq(scheduledOffs.branchId, branchId),
        eq(scheduledOffs.offDate, todayStr)
      ));

    const offSet = new Set(todayOffs.map(o => o.userId));

    // 5. Personel + durum birleştir
    const staffWithStatus = staff.map(s => {
      const session = sessionMap.get(s.id);
      const shift = shiftMap.get(s.id);
      const isOff = offSet.has(s.id);

      let shiftStatus: string;
      if (session?.status === 'active') shiftStatus = 'active';
      else if (session?.status === 'on_break') shiftStatus = 'on_break';
      else if (isOff) shiftStatus = 'off';
      else if (shift) shiftStatus = 'scheduled';
      else shiftStatus = 'not_scheduled';

      // Geç tespit: vardiyası planlandı, giriş yok, başlangıç saati geçmiş
      let lateMinutes = 0;
      let isMissing = false;
      if (!session && shift && shiftStatus === 'scheduled') {
        const [h, m] = (shift.startTime as string).split(':').map(Number);
        const plannedStart = new Date(now);
        plannedStart.setHours(h, m, 0, 0);
        const diffMin = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
        if (diffMin > 15) {
          lateMinutes = diffMin;
          shiftStatus = diffMin > 60 ? 'missing' : 'late';
          isMissing = diffMin > 60;
        }
      }

      return {
        ...s,
        hasPin: pinSet.has(s.id),
        shiftStatus,
        shiftStartTime: shift?.startTime || null,
        shiftEndTime: shift?.endTime || null,
        checkInTime: session?.checkInTime || null,
        lateMinutes,
        isMissing,
      };
    });

    // Timeline için tüm bugünkü vardiyalar (tüm personel, sadece yayınlanmış)
    const timelineShifts = await db.select({
      userId: shifts.assignedToId,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    }).from(shifts)
      .leftJoin(users, eq(shifts.assignedToId, users.id))
      .where(and(
        eq(shifts.branchId, branchId),
        eq(shifts.shiftDate, todayStr)
      ))
      .orderBy(shifts.startTime);

    // Timeline için aktif break süreleri
    const timelineBreaks = await db.select({
      userId: branchBreakLogs.userId,
      breakStartTime: branchBreakLogs.breakStartTime,
      breakEndTime: branchBreakLogs.breakEndTime,
    }).from(branchBreakLogs)
      .where(and(
        eq(branchBreakLogs.branchId, branchId),
        gte(branchBreakLogs.breakStartTime, new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      ));

    // 6. Aktif duyurular (son 5)
    const activeAnnouncements = await db.select({
      id: announcements.id,
      title: announcements.title,
      summary: announcements.summary,
      category: announcements.category,
      priority: announcements.priority,
      isPinned: announcements.isPinned,
    }).from(announcements)
      .where(and(
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now)),
        isNull(announcements.deletedAt)
      ))
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
      .limit(5);

    const filteredAnn = activeAnnouncements.filter(ann => {
      // @ts-ignore - targetBranches is array
      return true; // lobby herkese açık, tüm duyuruları göster
    });

    // 7. Şube bildirimleri (son 3 okunmamış, şube geneli)
    const branchNotifs = await db.select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      type: notifications.type,
      createdAt: notifications.createdAt,
    }).from(notifications)
      .where(and(
        eq(notifications.branchId, branchId),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(3);

    // 8. Display QR payload
    const qrTimestamp = Date.now();
    const qrNonce = crypto.randomBytes(12).toString('hex');
    const qrData = JSON.stringify({ branchId, timestamp: qrTimestamp, nonce: qrNonce });
    const qrToken = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dospresso-qr-fallback-key')
      .update(qrData).digest('hex');
    const displayQrPayload = { branchId, timestamp: qrTimestamp, nonce: qrNonce, token: qrToken, expiresIn: 45 };

    res.json({
      staff: staffWithStatus,
      announcements: filteredAnn,
      notifications: branchNotifs,
      timeline: timelineShifts,
      timelineBreaks,
      displayQr: displayQrPayload,
      generatedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error fetching kiosk lobby:", error);
    res.status(500).json({ message: "Lobi verisi alınamadı" });
  }
});

// =================== KIOSK TEAM STATUS ===================

router.get('/api/branches/:branchId/kiosk/team-status', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const now = new Date();

    const [kioskCfg] = await db.select({ maxBreak: branchKioskSettings.maxBreakMinutes })
      .from(branchKioskSettings).where(eq(branchKioskSettings.branchId, branchId)).limit(1);
    const maxBreakMinutes = kioskCfg?.maxBreak || 90;

    const activeSessions = await db.select({
      sessionId: branchShiftSessions.id,
      status: branchShiftSessions.status,
      checkInTime: branchShiftSessions.checkInTime,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
    }).from(branchShiftSessions)
      .leftJoin(users, eq(branchShiftSessions.userId, users.id))
      .where(and(
        eq(branchShiftSessions.branchId, branchId),
        or(eq(branchShiftSessions.status, 'active'), eq(branchShiftSessions.status, 'on_break'))
      ))
      .orderBy(asc(users.firstName));

    const breakSessionIds = activeSessions
      .filter(s => s.status === 'on_break')
      .map(s => s.sessionId);

    const activeBreaks = breakSessionIds.length > 0
      ? await db.select({
          sessionId: branchBreakLogs.sessionId,
          breakStartTime: branchBreakLogs.breakStartTime,
        }).from(branchBreakLogs)
          .where(and(inArray(branchBreakLogs.sessionId, breakSessionIds), isNull(branchBreakLogs.breakEndTime)))
      : [];

    const breakMap = new Map(activeBreaks.map(b => [b.sessionId, b.breakStartTime]));

    const team = activeSessions.map(s => {
      const breakStart = s.status === 'on_break' ? breakMap.get(s.sessionId) : null;
      const breakMinutes = breakStart
        ? Math.floor((now.getTime() - new Date(breakStart).getTime()) / 60000)
        : 0;
      return {
        userId: s.userId,
        firstName: s.firstName,
        lastName: s.lastName,
        profileImageUrl: s.profileImageUrl,
        role: s.role,
        status: s.status,
        checkInTime: s.checkInTime,
        breakMinutes,
        isBreakAnomaly: s.status === 'on_break' && breakMinutes > maxBreakMinutes,
        maxBreakMinutes,
      };
    });

    res.json({ team, maxBreakMinutes });
  } catch (error: unknown) {
    console.error("Error fetching kiosk team status:", error);
    res.status(500).json({ message: "Ekip durumu alınamadı" });
  }
});

// =================== KIOSK ANNOUNCEMENTS ===================

router.get('/api/branches/:branchId/kiosk/announcements', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const now = new Date();

    const results = await db.select().from(announcements)
      .where(and(
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now)),
        isNull(announcements.deletedAt)
      ))
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
      .limit(20);

    const filtered = results.filter(ann => {
      const hasNoTarget = !ann.targetRoles?.length && !ann.targetBranches?.length;
      if (hasNoTarget) return true;
      if (ann.targetBranches?.some(b => b === branchId)) return true;
      return false;
    });

    res.json(filtered);
  } catch (error: unknown) {
    console.error("Error fetching kiosk announcements:", error);
    res.status(500).json({ message: "Duyurular alınamadı" });
  }
});

// GET /api/branches/:branchId/kiosk/pending-announcements/:userId — Vardiya başı zorunlu duyurular
router.get('/api/branches/:branchId/kiosk/pending-announcements/:userId', isKioskOrAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const userId = req.params.userId;
    const now = new Date();

    // Aktif, onay gerektiren duyuruları al
    const activeAnnouncements = await db.select()
      .from(announcements)
      .where(and(
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now)),
        isNull(announcements.deletedAt),
        eq(announcements.requiresAcknowledgment, true),
        or(eq(announcements.status, 'published'), isNull(announcements.status))
      ))
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
      .limit(10);

    // Şube filtresi
    const branchFiltered = activeAnnouncements.filter(ann => {
      const hasNoTarget = !ann.targetRoles?.length && !ann.targetBranches?.length;
      if (hasNoTarget) return true;
      if (ann.targetBranches?.some(b => String(b) === String(branchId))) return true;
      return false;
    });

    if (branchFiltered.length === 0) {
      return res.json([]);
    }

    // Kullanıcının zaten onayladıklarını kontrol et
    const readStatuses = await db.select()
      .from(announcementReadStatus)
      .where(and(
        eq(announcementReadStatus.userId, userId),
        inArray(announcementReadStatus.announcementId, branchFiltered.map(a => a.id))
      ));

    const acknowledgedIds = new Set(
      readStatuses
        .filter(rs => rs.acknowledgedAt != null)
        .map(rs => rs.announcementId)
    );

    // Onaylanmamış duyuruları döndür
    // Quiz geçmiş mi kontrol et
    const quizPassedIds = new Set<number>();
    const quizAnnIds = branchFiltered.filter(a => a.quizRequired).map(a => a.id);
    if (quizAnnIds.length > 0) {
      // ANY(array) yerine kullanıcının tüm passed quiz'lerini çekip JS'de filtrele
      const quizResults = await db.execute(sql`
        SELECT announcement_id FROM announcement_quiz_results 
        WHERE user_id = ${userId} AND passed = true
      `);
      for (const r of (quizResults.rows as any[])) {
        if (quizAnnIds.includes(r.announcement_id)) {
          quizPassedIds.add(r.announcement_id);
        }
      }
    }

    const pending = branchFiltered
      .filter(ann => !acknowledgedIds.has(ann.id) || (ann.quizRequired && !quizPassedIds.has(ann.id)))
      .map(ann => ({
        id: ann.id,
        title: ann.title,
        message: ann.message,
        category: ann.category,
        bannerImageUrl: ann.bannerImageUrl,
        priority: ann.priority,
        publishedAt: ann.publishedAt,
        quizRequired: ann.quizRequired || false,
        acknowledged: acknowledgedIds.has(ann.id),
        quizPassed: quizPassedIds.has(ann.id),
      }));

    res.json(pending);
  } catch (error: unknown) {
    console.error("Error fetching pending announcements:", error);
    res.status(500).json({ message: "Bekleyen duyurular alınamadı" });
  }
});

// =================== KIOSK NOTIFICATIONS ===================

router.get('/api/branches/:branchId/kiosk/notifications/:userId', isKioskOrAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    res.json(results);
  } catch (error: unknown) {
    console.error("Error fetching kiosk notifications:", error);
    res.status(500).json({ message: "Bildirimler alınamadı" });
  }
});

// =================== HQ KIOSK ENDPOINTS ===================

router.get('/api/hq/kiosk/staff', async (req, res) => {
  try {
    const hqStaff = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
    }).from(users)
      .where(and(
        isNull(users.branchId),
        eq(users.isActive, true),
        sql`${users.role} NOT IN ('barista', 'stajyer')`
      ));
    
    res.json(hqStaff.map((s) => ({
      ...s,
      hasPin: true,
    })));
  } catch (error: unknown) {
    console.error("HQ kiosk staff error:", error);
    res.status(500).json({ message: "HQ personel listesi alinamadi" });
  }
});

router.post('/api/hq/kiosk/login', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ message: "Kullanici ve PIN gerekli" });
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }
    
    const userPin = user.phoneNumber ? user.phoneNumber.slice(-4) : '0000';
    if (pin !== userPin) {
      return res.status(401).json({ message: "Hatali PIN" });
    }
    
    const [activeSession] = await db.select().from(hqShiftSessions)
      .where(and(
        eq(hqShiftSessions.userId, userId),
        eq(hqShiftSessions.status, 'active')
      ))
      .orderBy(desc(hqShiftSessions.checkInTime))
      .limit(1);
    
    const [breakSession] = await db.select().from(hqShiftSessions)
      .where(and(
        eq(hqShiftSessions.userId, userId),
        inArray(hqShiftSessions.status, ['on_break', 'outside'])
      ))
      .orderBy(desc(hqShiftSessions.checkInTime))
      .limit(1);
    
    const kioskToken = await createKioskSession(userId);

    res.json({
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
      activeSession: activeSession || breakSession || null,
      kioskToken,
    });
  } catch (error: unknown) {
    console.error("HQ kiosk login error:", error);
    res.status(500).json({ message: "HQ giris hatasi" });
  }
});

router.post('/api/hq/kiosk/shift-start', isKioskAuthenticated, async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId gerekli" });
    }
    
    const [existing] = await db.select().from(hqShiftSessions)
      .where(and(
        eq(hqShiftSessions.userId, userId),
        inArray(hqShiftSessions.status, ['active', 'on_break', 'outside'])
      ));
    
    if (existing) {
      return res.status(400).json({ message: "Zaten aktif bir oturumunuz var" });
    }
    
    const now = new Date();
    const HQ_BRANCH_ID = 23;

    const [hqKioskSettings] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, HQ_BRANCH_ID))
      .limit(1);
    const hqLateToleranceMinutes = hqKioskSettings?.lateToleranceMinutes ?? 15;
    let hqLateMinutes = 0;
    let hqIsLateArrival = false;

    const hqTodayStr = now.toISOString().split('T')[0];
    const [hqPlannedShift] = await db.select().from(shifts)
      .where(and(
        eq(shifts.branchId, HQ_BRANCH_ID),
        eq(shifts.assignedToId, userId),
        eq(shifts.shiftDate, hqTodayStr)
      ))
      .limit(1);

    const hqShiftStartTimeStr = hqPlannedShift?.startTime || hqKioskSettings?.defaultShiftStartTime;
    if (hqShiftStartTimeStr) {
      const [h, m] = hqShiftStartTimeStr.split(':').map(Number);
      const plannedStart = new Date(now);
      plannedStart.setHours(h, m, 0, 0);
      if (now.getTime() > plannedStart.getTime()) {
        hqLateMinutes = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
        if (hqLateMinutes > hqLateToleranceMinutes) hqIsLateArrival = true;
      }
    }

    const [session] = await db.insert(hqShiftSessions).values({
      userId,
      checkInLatitude: latitude ? String(latitude) : null,
      checkInLongitude: longitude ? String(longitude) : null,
      status: 'active',
    }).returning();
    
    await db.insert(hqShiftEvents).values({
      sessionId: session.id,
      userId,
      eventType: 'check_in',
      eventTime: now,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
    });

    // PDKS giris kaydı yaz (non-blocking)
    try {
      await db.insert(pdksRecords).values({
        userId,
        branchId: HQ_BRANCH_ID,
        recordDate: now.toISOString().split('T')[0],
        recordTime: now.toTimeString().split(' ')[0],
        recordType: 'giris',
        source: 'kiosk',
        deviceInfo: 'hq-kiosk',
      });
    } catch (pdksErr: unknown) {
      console.warn("[HQ-KIOSK] PDKS clock-in write failed (non-blocking):", pdksErr instanceof Error ? pdksErr.message : String(pdksErr));
    }

    // ═══ HER HQ CHECK-IN'DE shift_attendance OLUŞTUR ═══
    {
      let hqShiftIdForAttendance: number | null = hqPlannedShift?.id ?? null;

      if (!hqShiftIdForAttendance) {
        const [fallbackShift] = await db.select({ id: shifts.id })
          .from(shifts)
          .where(and(eq(shifts.assignedToId, userId), eq(shifts.shiftDate, hqTodayStr)))
          .limit(1);
        if (fallbackShift) hqShiftIdForAttendance = fallbackShift.id;
      }

      if (!hqShiftIdForAttendance) {
        try {
          const userBranch = (await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, userId)).limit(1))[0];
          const bId = userBranch?.branchId || 1;
          const [adHocShift] = await db.insert(shifts).values({
            branchId: bId, assignedToId: userId, createdById: userId,
            shiftDate: hqTodayStr, startTime: "08:00", endTime: "17:00",
            shiftType: "adhoc", status: "active",
          }).returning();
          if (adHocShift) hqShiftIdForAttendance = adHocShift.id;
        } catch (e) { console.warn("[HQ-KIOSK] Ad-hoc shift failed:", e); }
      }

      if (hqShiftIdForAttendance) {
        try {
          const [existingSA] = await db.select({ id: shiftAttendance.id }).from(shiftAttendance)
            .where(and(eq(shiftAttendance.shiftId, hqShiftIdForAttendance), eq(shiftAttendance.userId, userId)))
            .limit(1);

          let saId: number;
          if (existingSA) { saId = existingSA.id; }
          else {
            const [newSA] = await db.insert(shiftAttendance).values({
              shiftId: hqShiftIdForAttendance, userId, checkInTime: now,
              status: 'present', latenessMinutes: hqIsLateArrival ? hqLateMinutes : 0,
            }).returning();
            saId = newSA.id;
          }

          if (hqIsLateArrival && hqLateMinutes > 0) {
            await db.insert(attendancePenalties).values({
              shiftAttendanceId: saId, type: 'late_arrival', minutes: hqLateMinutes,
              reason: `HQ Kiosk: ${hqLateMinutes} dk geç (tolerans: ${hqLateToleranceMinutes} dk)`, autoGenerated: true,
            });
          }
        } catch (saErr) { console.warn("[HQ-KIOSK] shift_attendance write failed:", saErr); }
      }
    }
    
    res.json({ session, isLateArrival: hqIsLateArrival, lateMinutes: hqLateMinutes, lateToleranceMinutes: hqLateToleranceMinutes });
  } catch (error: unknown) {
    console.error("HQ shift start error:", error);
    res.status(500).json({ message: "Vardiya baslatilamadi" });
  }
});

router.post('/api/hq/kiosk/exit', isKioskAuthenticated, async (req, res) => {
  try {
    const { sessionId, exitReason, exitDescription, estimatedReturnTime, latitude, longitude } = req.body;
    if (!sessionId || !exitReason) {
      return res.status(400).json({ message: "sessionId ve exitReason gerekli" });
    }
    
    const [session] = await db.select().from(hqShiftSessions)
      .where(eq(hqShiftSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ message: "Oturum bulunamadi" });
    }
    
    let newStatus = 'on_break';
    let eventType = 'break_start';
    if (exitReason === 'external_task') {
      newStatus = 'outside';
      eventType = 'outside_start';
    } else if (exitReason === 'personal') {
      newStatus = 'outside';
      eventType = 'outside_start';
    } else if (exitReason === 'end_of_day') {
      const checkInTime = new Date(session.checkInTime).getTime();
      const now = Date.now();
      const totalMinutes = Math.round((now - checkInTime) / 60000);
      const breakMins = session.breakMinutes || 0;
      const outsideMins = session.outsideMinutes || 0;
      const netMins = totalMinutes - breakMins - outsideMins;
      
      const checkOutNow = new Date();
      await db.update(hqShiftSessions)
        .set({
          status: 'completed',
          checkOutTime: checkOutNow,
          workMinutes: totalMinutes,
          netWorkMinutes: Math.max(0, netMins),
        })
        .where(eq(hqShiftSessions.id, sessionId));
      
      await db.insert(hqShiftEvents).values({
        sessionId,
        userId: session.userId,
        eventType: 'check_out',
        exitReason: 'end_of_day',
        exitDescription,
        eventTime: checkOutNow,
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
      });

      // PDKS cikis kaydı yaz (non-blocking)
      try {
        const HQ_BRANCH_ID = 23;
        await db.insert(pdksRecords).values({
          userId: session.userId,
          branchId: HQ_BRANCH_ID,
          recordDate: checkOutNow.toISOString().split('T')[0],
          recordTime: checkOutNow.toTimeString().split(' ')[0],
          recordType: 'cikis',
          source: 'kiosk',
          deviceInfo: 'hq-kiosk',
        });
      } catch (pdksErr: unknown) {
        console.warn("[HQ-KIOSK] PDKS clock-out write failed (non-blocking):", pdksErr instanceof Error ? pdksErr.message : String(pdksErr));
      }
      
      const [updated] = await db.select().from(hqShiftSessions)
        .where(eq(hqShiftSessions.id, sessionId));
      
      return res.json({
        session: updated,
        summary: {
          totalMinutes,
          breakMinutes: breakMins,
          outsideMinutes: outsideMins,
          netWorkMinutes: Math.max(0, netMins),
        },
      });
    }
    
    await db.update(hqShiftSessions)
      .set({ status: newStatus })
      .where(eq(hqShiftSessions.id, sessionId));
    
    await db.insert(hqShiftEvents).values({
      sessionId,
      userId: session.userId,
      eventType,
      exitReason,
      exitDescription,
      estimatedReturnTime: estimatedReturnTime ? new Date(estimatedReturnTime) : null,
      eventTime: new Date(),
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
    });
    
    const [updated] = await db.select().from(hqShiftSessions)
      .where(eq(hqShiftSessions.id, sessionId));
    
    res.json({ session: updated });
  } catch (error: unknown) {
    console.error("HQ exit error:", error);
    res.status(500).json({ message: "Cikis islemi basarisiz" });
  }
});

router.post('/api/hq/kiosk/return', isKioskAuthenticated, async (req, res) => {
  try {
    const { sessionId, latitude, longitude } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId gerekli" });
    }
    
    const [session] = await db.select().from(hqShiftSessions)
      .where(eq(hqShiftSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ message: "Oturum bulunamadi" });
    }
    
    const [lastExitEvent] = await db.select().from(hqShiftEvents)
      .where(and(
        eq(hqShiftEvents.sessionId, sessionId),
        inArray(hqShiftEvents.eventType, ['break_start', 'outside_start'])
      ))
      .orderBy(desc(hqShiftEvents.eventTime))
      .limit(1);
    
    let exitDuration = 0;
    if (lastExitEvent) {
      exitDuration = Math.round((Date.now() - new Date(lastExitEvent.eventTime).getTime()) / 60000);
    }
    
    const wasOnBreak = session.status === 'on_break';
    const updateData: any = { status: 'active' };
    
    if (wasOnBreak) {
      updateData.breakMinutes = (session.breakMinutes || 0) + exitDuration;
    } else {
      updateData.outsideMinutes = (session.outsideMinutes || 0) + exitDuration;
    }
    
    await db.update(hqShiftSessions)
      .set(updateData)
      .where(eq(hqShiftSessions.id, sessionId));
    
    const eventType = wasOnBreak ? 'break_end' : 'outside_end';
    await db.insert(hqShiftEvents).values({
      sessionId,
      userId: session.userId,
      eventType,
      eventTime: new Date(),
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
    });
    
    const [updated] = await db.select().from(hqShiftSessions)
      .where(eq(hqShiftSessions.id, sessionId));
    
    res.json({ session: updated, exitDuration });
  } catch (error: unknown) {
    console.error("HQ return error:", error);
    res.status(500).json({ message: "Donus islemi basarisiz" });
  }
});

router.get('/api/hq/kiosk/session/:userId', isKioskAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [activeSession] = await db.select().from(hqShiftSessions)
      .where(and(
        eq(hqShiftSessions.userId, userId),
        inArray(hqShiftSessions.status, ['active', 'on_break', 'outside'])
      ))
      .orderBy(desc(hqShiftSessions.checkInTime))
      .limit(1);
    
    const events = activeSession ? await db.select().from(hqShiftEvents)
      .where(eq(hqShiftEvents.sessionId, activeSession.id))
      .orderBy(desc(hqShiftEvents.eventTime)) : [];
    
    res.json({ activeSession, events });
  } catch (error: unknown) {
    console.error("HQ session error:", error);
    res.status(500).json({ message: "Oturum bilgisi alinamadi" });
  }
});

router.get('/api/hq/kiosk/active-sessions', isAuthenticated, async (req, res) => {
  try {
    const hqSessions = await db.select({
      session: hqShiftSessions,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
      },
    }).from(hqShiftSessions)
      .innerJoin(users, eq(hqShiftSessions.userId, users.id))
      .where(inArray(hqShiftSessions.status, ['active', 'on_break', 'outside']));
    
    res.json(hqSessions);
  } catch (error: unknown) {
    console.error("HQ active sessions error:", error);
    res.status(500).json({ message: "Aktif oturumlar alinamadi" });
  }
});

// Şube günlük puantaj özeti
router.get('/api/branches/:branchId/attendance/daily', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    
    const summaries = await db.select({
      summary: branchShiftDailySummary,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }
    }).from(branchShiftDailySummary)
      .leftJoin(users, eq(branchShiftDailySummary.userId, users.id))
      .where(and(
        eq(branchShiftDailySummary.branchId, branchId),
        eq(branchShiftDailySummary.workDate, targetDate)
      ))
      .orderBy(users.firstName);

    res.json(summaries);
  } catch (error: unknown) {
    console.error("Error fetching daily attendance:", error);
    res.status(500).json({ message: "Günlük puantaj alınamadı" });
  }
});

router.get('/api/branches/:branchId/attendance/weekly', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { weekStart } = req.query;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const defaultWeekStart = new Date(now);
    defaultWeekStart.setDate(now.getDate() + mondayOffset);
    
    const targetWeekStart = weekStart ? String(weekStart) : defaultWeekStart.toISOString().split('T')[0];
    
    const summaries = await db.select({
      summary: branchWeeklyAttendanceSummary,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }
    }).from(branchWeeklyAttendanceSummary)
      .leftJoin(users, eq(branchWeeklyAttendanceSummary.userId, users.id))
      .where(and(
        eq(branchWeeklyAttendanceSummary.branchId, branchId),
        eq(branchWeeklyAttendanceSummary.weekStartDate, targetWeekStart)
      ))
      .orderBy(users.firstName);

    res.json(summaries);
  } catch (error: unknown) {
    console.error("Error fetching weekly attendance:", error);
    res.status(500).json({ message: "Haftalık puantaj alınamadı" });
  }
});

router.get('/api/branches/:branchId/attendance/monthly', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(String(month)) : now.getMonth() + 1;
    const targetYear = year ? parseInt(String(year)) : now.getFullYear();
    
    const summaries = await db.select({
      summary: branchMonthlyPayrollSummary,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }
    }).from(branchMonthlyPayrollSummary)
      .leftJoin(users, eq(branchMonthlyPayrollSummary.userId, users.id))
      .where(and(
        eq(branchMonthlyPayrollSummary.branchId, branchId),
        eq(branchMonthlyPayrollSummary.month, targetMonth),
        eq(branchMonthlyPayrollSummary.year, targetYear)
      ))
      .orderBy(users.firstName);

    res.json(summaries);
  } catch (error: unknown) {
    console.error("Error fetching monthly payroll:", error);
    res.status(500).json({ message: "Aylık puantaj alınamadı" });
  }
});

router.post('/api/branches/:branchId/attendance/calculate-weekly', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const branchId = parseInt(req.params.branchId);
    
    if (!isHQRole(role) && role !== 'supervisor') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    if (role === 'supervisor' && user.branchId !== branchId) {
      return res.status(403).json({ message: "Sadece kendi şubeniz için hesaplama yapabilirsiniz" });
    }

    const { weekStartDate } = req.body;
    if (!weekStartDate) {
      return res.status(400).json({ message: "Hafta başlangıç tarihi gerekli" });
    }

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((weekStart.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);

    const branchStaff = await db.select().from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true)
      ));

    const results: any[] = [];
    const WEEKLY_TARGET_MINUTES = 2700;

    for (const staff of branchStaff) {
      const sessions = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, staff.id),
          eq(branchShiftSessions.branchId, branchId),
          eq(branchShiftSessions.status, 'completed'),
          gte(branchShiftSessions.shiftDate, weekStartDate),
          lte(branchShiftSessions.shiftDate, weekEnd.toISOString().split('T')[0])
        ));

      let actualTotalMinutes = 0;
      let workDays = 0;

      for (const session of sessions) {
        actualTotalMinutes += session.netWorkMinutes || 0;
        workDays++;
      }

      const overtimeMinutes = actualTotalMinutes > WEEKLY_TARGET_MINUTES 
        ? actualTotalMinutes - WEEKLY_TARGET_MINUTES 
        : 0;
      const missingMinutes = actualTotalMinutes < WEEKLY_TARGET_MINUTES 
        ? WEEKLY_TARGET_MINUTES - actualTotalMinutes 
        : 0;

      const [existing] = await db.select().from(branchWeeklyAttendanceSummary)
        .where(and(
          eq(branchWeeklyAttendanceSummary.userId, staff.id),
          eq(branchWeeklyAttendanceSummary.branchId, branchId),
          eq(branchWeeklyAttendanceSummary.weekStartDate, weekStartDate)
        ));

      const summaryData = {
        userId: staff.id,
        branchId,
        weekStartDate: weekStartDate,
        weekEndDate: weekEnd.toISOString().split('T')[0],
        weekNumber,
        year: weekStart.getFullYear(),
        plannedTotalMinutes: WEEKLY_TARGET_MINUTES,
        actualTotalMinutes,
        overtimeMinutes,
        missingMinutes,
        workDays,
        complianceStatus: missingMinutes === 0 ? 'compliant' : overtimeMinutes > 0 ? 'overtime' : 'missing_hours',
        approvalStatus: 'pending',
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(branchWeeklyAttendanceSummary)
          .set(summaryData)
          .where(eq(branchWeeklyAttendanceSummary.id, existing.id));
        results.push({ ...summaryData, id: existing.id, updated: true });
      } else {
        const [inserted] = await db.insert(branchWeeklyAttendanceSummary)
          .values(summaryData)
          .returning();
        results.push({ ...inserted, updated: false });
      }
    }

    res.json({ 
      success: true, 
      message: `${results.length} personel için haftalık özet hesaplandı`,
      summaries: results,
      weekInfo: { weekNumber, year: weekStart.getFullYear(), start: weekStartDate, end: weekEnd.toISOString().split('T')[0] }
    });
  } catch (error: unknown) {
    console.error("Error calculating weekly attendance:", error);
    res.status(500).json({ message: "Haftalık özet hesaplanamadı" });
  }
});

router.post('/api/branches/:branchId/attendance/calculate-monthly', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const branchId = parseInt(req.params.branchId);
    
    if (!isHQRole(role) && role !== 'supervisor') {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }
    
    if (role === 'supervisor' && user.branchId !== branchId) {
      return res.status(403).json({ message: "Sadece kendi şubeniz için hesaplama yapabilirsiniz" });
    }

    const { month, year } = req.body;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    const branchStaff = await db.select().from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true)
      ));

    const results: any[] = [];
    const DAILY_TARGET_MINUTES = 540;

    for (const staff of branchStaff) {
      const sessions = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, staff.id),
          eq(branchShiftSessions.branchId, branchId),
          eq(branchShiftSessions.status, 'completed'),
          gte(branchShiftSessions.shiftDate, monthStartStr),
          lte(branchShiftSessions.shiftDate, monthEndStr)
        ));

      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
      let totalNetWorkMinutes = 0;
      let totalWorkDays = 0;
      let lateDays = 0;
      let earlyLeaveDays = 0;

      for (const session of sessions) {
        totalWorkMinutes += session.workMinutes || 0;
        totalBreakMinutes += session.breakMinutes || 0;
        totalNetWorkMinutes += session.netWorkMinutes || 0;
        totalWorkDays++;
        if (session.isLate) lateDays++;
        if (session.isEarlyLeave) earlyLeaveDays++;
      }

      let businessDays = 0;
      const tempDate = new Date(monthStart);
      while (tempDate <= monthEnd) {
        const dayOfWeek = tempDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const plannedTotalMinutes = businessDays * DAILY_TARGET_MINUTES;

      const totalOvertimeMinutes = totalNetWorkMinutes > plannedTotalMinutes 
        ? totalNetWorkMinutes - plannedTotalMinutes 
        : 0;
      const totalMissingMinutes = totalNetWorkMinutes < plannedTotalMinutes 
        ? plannedTotalMinutes - totalNetWorkMinutes 
        : 0;

      const absentDays = businessDays - totalWorkDays;

      const [existing] = await db.select().from(branchMonthlyPayrollSummary)
        .where(and(
          eq(branchMonthlyPayrollSummary.userId, staff.id),
          eq(branchMonthlyPayrollSummary.branchId, branchId),
          eq(branchMonthlyPayrollSummary.month, targetMonth),
          eq(branchMonthlyPayrollSummary.year, targetYear)
        ));

      const summaryData = {
        userId: staff.id,
        branchId,
        month: targetMonth,
        year: targetYear,
        totalWorkDays,
        totalWorkMinutes,
        totalBreakMinutes,
        totalNetWorkMinutes,
        totalOvertimeMinutes,
        totalMissingMinutes,
        absentDays: absentDays > 0 ? absentDays : 0,
        lateDays,
        earlyLeaveDays,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        sickLeaveDays: 0,
        publicHolidayDays: 0,
        calculationStatus: 'calculated',
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(branchMonthlyPayrollSummary)
          .set(summaryData)
          .where(eq(branchMonthlyPayrollSummary.id, existing.id));
        results.push({ ...summaryData, id: existing.id, userName: `${staff.firstName} ${staff.lastName}`, updated: true });
      } else {
        const [inserted] = await db.insert(branchMonthlyPayrollSummary)
          .values(summaryData)
          .returning();
        results.push({ ...inserted, userName: `${staff.firstName} ${staff.lastName}`, updated: false });
      }
    }

    res.json({ 
      success: true, 
      message: `${results.length} personel için aylık puantaj hesaplandı`,
      summaries: results,
      monthInfo: { month: targetMonth, year: targetYear }
    });
  } catch (error: unknown) {
    console.error("Error calculating monthly payroll:", error);
    res.status(500).json({ message: "Aylık puantaj hesaplanamadı" });
  }
});

router.post('/api/branches/:branchId/attendance/approve-overtime', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const branchId = parseInt(req.params.branchId);
    
    if (!isHQRole(role)) {
      return res.status(403).json({ message: "Fazla mesai onayı için HQ yetkisi gerekli" });
    }

    const { summaryId, approved, approvalNotes } = req.body;

    const [updated] = await db.update(branchWeeklyAttendanceSummary)
      .set({
        approvalStatus: approved ? 'approved' : 'rejected',
        approvedById: user.id,
        approvedAt: new Date(),
        approvalNotes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(branchWeeklyAttendanceSummary.id, summaryId),
        eq(branchWeeklyAttendanceSummary.branchId, branchId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Özet bulunamadı" });
    }

    res.json({ success: true, summary: updated });
  } catch (error: unknown) {
    console.error("Error approving overtime:", error);
    res.status(500).json({ message: "Fazla mesai onaylanamadı" });
  }
});

router.post('/api/branches/:branchId/attendance/approve-monthly', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const branchId = parseInt(req.params.branchId);
    
    if (!isHQRole(role)) {
      return res.status(403).json({ message: "Puantaj onayı için HQ yetkisi gerekli" });
    }

    const { summaryId, approved, notes } = req.body;

    const [updated] = await db.update(branchMonthlyPayrollSummary)
      .set({
        calculationStatus: approved ? 'approved' : 'rejected',
        approvedById: user.id,
        approvedAt: new Date(),
        notes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(branchMonthlyPayrollSummary.id, summaryId),
        eq(branchMonthlyPayrollSummary.branchId, branchId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Puantaj özeti bulunamadı" });
    }

    res.json({ success: true, summary: updated });
  } catch (error: unknown) {
    console.error("Error approving monthly payroll:", error);
    res.status(500).json({ message: "Puantaj onaylanamadı" });
  }
});

// Branch Dashboard
router.get('/api/branch-dashboard/:branchId', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }
    const [branch] = await db.select({ id: branches.id, name: branches.name, city: branches.city, address: branches.address }).from(branches).where(eq(branches.id, branchId));
    if (!branch) { return res.status(404).json({ message: "Şube bulunamadı" }); }
    const today = new Date().toISOString().split('T')[0];
    const activeSessionsResult = await db.select({ count: sql<number>`count(*)::int` }).from(branchShiftSessions).where(and(eq(branchShiftSessions.branchId, branchId), or(eq(branchShiftSessions.status, 'active'), eq(branchShiftSessions.status, 'on_break'))));
    const activeStaff = activeSessionsResult[0]?.count || 0;
    const shiftsResult = await db.select({ count: sql<number>`count(*)::int` }).from(shifts).where(and(eq(shifts.branchId, branchId), sql`DATE(${shifts.startTime}) = ${today}`));
    const totalShifts = shiftsResult[0]?.count || 0;
    const tasksResult = await db.select({ status: tasks.status, count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.branchId, branchId), sql`DATE(${tasks.dueDate}) = ${today}`)).groupBy(tasks.status);
    let completedTasks = 0, pendingTasks = 0;
    for (const t of tasksResult) { if (t.status === 'completed' || t.status === 'verified') { completedTasks += t.count; } else if (t.status !== 'cancelled') { pendingTasks += t.count; } }
    const checklistsResult = await db.select({ status: checklistCompletions.status, count: sql<number>`count(*)::int` }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, branchId), eq(checklistCompletions.scheduledDate, today))).groupBy(checklistCompletions.status);
    let completedChecklists = 0, pendingChecklists = 0;
    for (const c of checklistsResult) { if (c.status === 'completed' || c.status === 'submitted' || c.status === 'reviewed') { completedChecklists += c.count; } else { pendingChecklists += c.count; } }
    const alertsResult = await db.select().from(dashboardAlerts).where(and(eq(dashboardAlerts.context, 'branch'), eq(dashboardAlerts.contextId, branchId), eq(dashboardAlerts.status, 'active'))).orderBy(desc(dashboardAlerts.occurredAt)).limit(20);
    const activeAlerts = alertsResult.length;
    const criticalAlerts = alertsResult.filter(a => a.severity === 'critical').length;
    const todayShifts = await db.select({ id: shifts.id, userId: shifts.userId, startTime: shifts.startTime, endTime: shifts.endTime, status: shifts.status }).from(shifts).where(and(eq(shifts.branchId, branchId), sql`DATE(${shifts.startTime}) = ${today}`)).limit(50);
    const todayTasks = await db.select({ id: tasks.id, title: tasks.description, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate, assignedToId: tasks.assignedToId }).from(tasks).where(and(eq(tasks.branchId, branchId), sql`DATE(${tasks.dueDate}) = ${today}`)).orderBy(desc(tasks.priority)).limit(50);
    const todayChecklistItems = await db.select({ id: checklistCompletions.id, checklistId: checklistCompletions.checklistId, userId: checklistCompletions.userId, status: checklistCompletions.status, scheduledDate: checklistCompletions.scheduledDate, score: checklistCompletions.score }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, branchId), eq(checklistCompletions.scheduledDate, today))).limit(50);
    res.json({ branch, stats: { activeStaff, totalShifts, completedTasks, pendingTasks, completedChecklists, pendingChecklists, activeAlerts, criticalAlerts }, alerts: alertsResult, todayShifts, todayTasks, todayChecklists: todayChecklistItems });
  } catch (error: unknown) {
    handleApiError(res, error, "FetchBranchDashboard");
  }
});

router.get('/api/branch-dashboard-v2/:branchId', isAuthenticated, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }
    
    const [branch] = await db.select({ id: branches.id, name: branches.name, city: branches.city, address: branches.address }).from(branches).where(eq(branches.id, branchId));
    if (!branch) { return res.status(404).json({ message: "Şube bulunamadı" }); }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    
    const weeklyShifts = await db.select({
      id: shifts.id,
      assignedToId: shifts.assignedToId,
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      shiftType: shifts.shiftType,
      status: shifts.status,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.assignedToId, users.id))
    .where(and(
      eq(shifts.branchId, branchId),
      gte(shifts.shiftDate, mondayStr),
      lte(shifts.shiftDate, sundayStr)
    ))
    .orderBy(shifts.shiftDate, shifts.startTime);
    
    const todayChecklists = await db.select({
      id: checklistCompletions.id,
      checklistId: checklistCompletions.checklistId,
      userId: checklistCompletions.userId,
      status: checklistCompletions.status,
      completedTasks: checklistCompletions.completedTasks,
      totalTasks: checklistCompletions.totalTasks,
      completedAt: checklistCompletions.completedAt,
      isLate: checklistCompletions.isLate,
      score: checklistCompletions.score,
      timeWindowStart: checklistCompletions.timeWindowStart,
      timeWindowEnd: checklistCompletions.timeWindowEnd,
      firstName: users.firstName,
      lastName: users.lastName,
      checklistTitle: checklists.title,
      checklistCategory: checklists.category,
    })
    .from(checklistCompletions)
    .leftJoin(users, eq(checklistCompletions.userId, users.id))
    .leftJoin(checklists, eq(checklistCompletions.checklistId, checklists.id))
    .where(and(
      eq(checklistCompletions.branchId, branchId),
      eq(checklistCompletions.scheduledDate, todayStr)
    ))
    .orderBy(checklistCompletions.status);
    
    const activeSessionsResult = await db.select({ count: sql<number>`count(*)::int` }).from(branchShiftSessions).where(and(eq(branchShiftSessions.branchId, branchId), or(eq(branchShiftSessions.status, 'active'), eq(branchShiftSessions.status, 'on_break'))));
    const activeStaff = activeSessionsResult[0]?.count || 0;
    
    const tasksResult = await db.select({ status: tasks.status, count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.branchId, branchId), sql`DATE(${tasks.dueDate}) = ${todayStr}`)).groupBy(tasks.status);
    let completedTasks = 0, pendingTasks = 0;
    for (const t of tasksResult) { if (t.status === 'completed' || t.status === 'verified') { completedTasks += t.count; } else if (t.status !== 'cancelled') { pendingTasks += t.count; } }
    
    const completedChecklistCount = todayChecklists.filter(c => c.status === 'completed' || c.status === 'submitted' || c.status === 'reviewed').length;
    const pendingChecklistCount = todayChecklists.filter(c => c.status !== 'completed' && c.status !== 'submitted' && c.status !== 'reviewed').length;
    
    const alertsResult = await db.select().from(dashboardAlerts).where(and(eq(dashboardAlerts.context, 'branch'), eq(dashboardAlerts.contextId, branchId), eq(dashboardAlerts.status, 'active'))).orderBy(desc(dashboardAlerts.occurredAt)).limit(10);
    
    res.json({
      branch,
      weekDates: { monday: mondayStr, sunday: sundayStr },
      weeklyShifts,
      todayChecklists,
      stats: {
        activeStaff,
        completedTasks,
        pendingTasks,
        completedChecklists: completedChecklistCount,
        pendingChecklists: pendingChecklistCount,
        activeAlerts: alertsResult.length,
      },
      alerts: alertsResult,
    });
  } catch (error: unknown) {
    handleApiError(res, error, "FetchBranchDashboardV2");
  }
});

const QR_HMAC_SECRET = process.env.SESSION_SECRET || 'dospresso-qr-fallback-key';
const QR_EXPIRY_MS = 45_000; // 45 saniye
const NONCE_CLEANUP_INTERVAL = 60 * 60 * 1000;

function generateQrPayload(userId: string) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const data = JSON.stringify({ userId, timestamp, nonce });
  const hmac = crypto.createHmac('sha256', QR_HMAC_SECRET).update(data).digest('hex');
  return { userId, timestamp, nonce, hmac };
}

function verifyQrPayload(payload: { userId: string; timestamp: number; nonce: string; hmac: string }) {
  const { userId, timestamp, nonce, hmac } = payload;
  const data = JSON.stringify({ userId, timestamp, nonce });
  const expectedHmac = crypto.createHmac('sha256', QR_HMAC_SECRET).update(data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
    return { valid: false, error: 'Geçersiz QR kodu (imza hatası)' };
  }
  const age = Date.now() - timestamp;
  if (age > QR_EXPIRY_MS) {
    return { valid: false, error: 'QR kodunun süresi dolmuş' };
  }
  if (age < -5000) {
    return { valid: false, error: 'Geçersiz QR zaman damgası' };
  }
  return { valid: true };
}

setInterval(async () => {
  try {
    const oneHourAgo = new Date(Date.now() - NONCE_CLEANUP_INTERVAL);
    await db.delete(qrCheckinNonces).where(lte(qrCheckinNonces.createdAt, oneHourAgo));
  } catch (e) {
    console.error('QR nonce cleanup error:', e);
  }
}, NONCE_CLEANUP_INTERVAL);

// =================== KİOSK EKRAN QR (tablet gösterir, personel telefonu okur) ===================

router.get('/api/branches/:branchId/kiosk/display-qr', async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(12).toString('hex');
    const data = JSON.stringify({ branchId, timestamp, nonce });
    const token = crypto.createHmac('sha256', QR_HMAC_SECRET).update(data).digest('hex');
    res.json({ branchId, timestamp, nonce, token, expiresIn: 45 });
  } catch (error: unknown) {
    console.error('Display QR error:', error);
    res.status(500).json({ message: 'QR oluşturulamadı' });
  }
});

// Telefon bu endpoint'i çağırır — kiosk QR okutunca vardiya işlemi
router.post('/api/kiosk/phone-checkin', isAuthenticated, async (req, res) => {
  try {
    const { branchId, timestamp, nonce, token, action } = req.body;
    const userId = req.user!.id;

    if (!branchId || !timestamp || !nonce || !token || !action) {
      return res.status(400).json({ message: 'Eksik parametreler' });
    }

    // Token doğrula
    const data = JSON.stringify({ branchId, timestamp, nonce });
    const expected = crypto.createHmac('sha256', QR_HMAC_SECRET).update(data).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(400).json({ message: 'Geçersiz QR kodu' });
    }

    // 10sn geçerlilik
    if (Date.now() - timestamp > 45_000) {
      return res.status(400).json({ message: 'QR kodunun süresi dolmuş. Yeni QR okutun.' });
    }

    // Personel bu şubede mi?
    const [userRecord] = await db.select({ branchId: users.branchId }).from(users)
      .where(eq(users.id, userId)).limit(1);
    if (userRecord?.branchId !== parseInt(branchId)) {
      return res.status(403).json({ message: 'Bu kiosk sizin şubenize ait değil' });
    }

    // Aktif session kontrol
    const [activeSession] = await db.select().from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.userId, userId),
        eq(branchShiftSessions.branchId, parseInt(branchId)),
        or(eq(branchShiftSessions.status, 'active'), eq(branchShiftSessions.status, 'on_break'))
      )).limit(1);

    const now = new Date();

    if (action === 'shift_start') {
      if (activeSession) return res.status(400).json({ message: 'Zaten aktif vardiyeniz var' });
      const [session] = await db.insert(branchShiftSessions).values({
        userId, branchId: parseInt(branchId),
        checkInTime: now, status: 'active', checkinMethod: 'qr',
      }).returning();
      await db.insert(branchShiftEvents).values({
        sessionId: session.id, userId, branchId: parseInt(branchId),
        eventType: 'check_in', eventTime: now,
      });
      return res.json({ success: true, action: 'shift_start', session });
    }

    if (!activeSession) return res.status(400).json({ message: 'Aktif vardiya bulunamadı' });

    if (action === 'break_start') {
      if (activeSession.status === 'on_break') return res.status(400).json({ message: 'Zaten moladasınız' });
      await db.update(branchShiftSessions).set({ status: 'on_break' })
        .where(eq(branchShiftSessions.id, activeSession.id));
      await db.insert(branchBreakLogs).values({
        sessionId: activeSession.id, userId, branchId: parseInt(branchId), breakStartTime: now,
      });
      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id, userId, branchId: parseInt(branchId),
        eventType: 'break_start', eventTime: now,
      });
      return res.json({ success: true, action: 'break_start' });
    }

    if (action === 'break_end') {
      if (activeSession.status !== 'on_break') return res.status(400).json({ message: 'Molada değilsiniz' });
      const [activeBreak] = await db.select().from(branchBreakLogs)
        .where(and(eq(branchBreakLogs.sessionId, activeSession.id), isNull(branchBreakLogs.breakEndTime)))
        .limit(1);
      const breakDuration = activeBreak
        ? Math.floor((now.getTime() - new Date(activeBreak.breakStartTime).getTime()) / 60000) : 0;
      if (activeBreak) {
        await db.update(branchBreakLogs).set({ breakEndTime: now, breakDurationMinutes: breakDuration })
          .where(eq(branchBreakLogs.id, activeBreak.id));
      }
      await db.update(branchShiftSessions)
        .set({ status: 'active', breakMinutes: (activeSession.breakMinutes || 0) + breakDuration })
        .where(eq(branchShiftSessions.id, activeSession.id));
      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id, userId, branchId: parseInt(branchId),
        eventType: 'break_end', eventTime: now,
      });
      return res.json({ success: true, action: 'break_end' });
    }

    if (action === 'shift_end') {
      const totalMinutes = Math.floor((now.getTime() - new Date(activeSession.checkInTime).getTime()) / 60000);
      const netWork = totalMinutes - (activeSession.breakMinutes || 0);
      await db.update(branchShiftSessions).set({
        status: 'completed', checkOutTime: now, workMinutes: totalMinutes, netWorkMinutes: netWork,
      }).where(eq(branchShiftSessions.id, activeSession.id));
      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id, userId, branchId: parseInt(branchId),
        eventType: 'check_out', eventTime: now,
      });
      return res.json({ success: true, action: 'shift_end', workMinutes: totalMinutes, netWorkMinutes: netWork });
    }

    return res.status(400).json({ message: 'Geçersiz işlem' });
  } catch (error: unknown) {
    console.error('Phone checkin error:', error);
    res.status(500).json({ message: 'İşlem gerçekleştirilemedi' });
  }
});

router.get('/api/qr-checkin/generate', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = generateQrPayload(userId);
    await db.insert(qrCheckinNonces).values({
      nonce: payload.nonce,
      userId,
    });
    res.json(payload);
  } catch (error: unknown) {
    console.error('QR generate error:', error);
    res.status(500).json({ message: 'QR kodu oluşturulamadı' });
  }
});

router.post('/api/kiosk/qr-checkin', async (req, res) => {
  try {
    const { qrData, branchId, action } = req.body;

    if (!qrData || !branchId || !action) {
      return res.status(400).json({ message: 'qrData, branchId ve action gerekli' });
    }

    let parsed: { userId: string; timestamp: number; nonce: string; hmac: string };
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ message: 'Geçersiz QR verisi' });
    }

    if (!parsed.userId || !parsed.timestamp || !parsed.nonce || !parsed.hmac) {
      return res.status(400).json({ message: 'Eksik QR alanları' });
    }

    const verification = verifyQrPayload(parsed);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.error });
    }

    const [nonceRecord] = await db.select().from(qrCheckinNonces)
      .where(and(
        eq(qrCheckinNonces.nonce, parsed.nonce),
        eq(qrCheckinNonces.userId, parsed.userId)
      )).limit(1);

    if (!nonceRecord) {
      return res.status(400).json({ message: 'Geçersiz QR nonce' });
    }
    if (nonceRecord.used) {
      return res.status(400).json({ message: 'Bu QR kodu zaten kullanılmış' });
    }

    await db.update(qrCheckinNonces)
      .set({ used: true })
      .where(eq(qrCheckinNonces.id, nonceRecord.id));

    const [user] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchId: users.branchId,
      profileImageUrl: users.profileImageUrl,
    }).from(users).where(eq(users.id, parsed.userId)).limit(1);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const numBranchId = parseInt(branchId);
    if (user.branchId !== numBranchId) {
      return res.status(403).json({ message: 'Bu şubeye ait değilsiniz' });
    }

    const validActions = ['shift_start', 'break_start', 'break_end', 'shift_end'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'Geçersiz işlem türü' });
    }

    const now = new Date();

    if (action === 'shift_start') {
      const [existingSession] = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, user.id),
          eq(branchShiftSessions.branchId, numBranchId),
          or(
            eq(branchShiftSessions.status, 'active'),
            eq(branchShiftSessions.status, 'on_break')
          )
        )).limit(1);

      if (existingSession) {
        return res.json({
          success: true,
          action: 'already_active',
          session: existingSession,
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
          message: 'Zaten aktif bir vardiyanız var',
        });
      }

      const todayStr = now.toISOString().split('T')[0];
      let plannedShiftId: number | null = null;
      let lateMinutes = 0;

      const [plannedShift] = await db.select().from(shifts)
        .where(and(
          eq(shifts.branchId, numBranchId),
          eq(shifts.assignedToId, user.id),
          eq(shifts.shiftDate, todayStr)
        )).limit(1);

      if (plannedShift) {
        plannedShiftId = plannedShift.id;
        const [hours, minutes] = plannedShift.startTime.split(':').map(Number);
        const plannedStart = new Date(now);
        plannedStart.setHours(hours, minutes, 0, 0);
        if (now.getTime() > plannedStart.getTime()) {
          lateMinutes = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
        }
      }

      const [session] = await db.insert(branchShiftSessions).values({
        userId: user.id,
        branchId: numBranchId,
        checkInTime: now,
        status: 'active',
        plannedShiftId,
        lateMinutes,
        checkinMethod: 'qr',
      }).returning();

      await db.insert(branchShiftEvents).values({
        sessionId: session.id,
        userId: user.id,
        branchId: numBranchId,
        eventType: 'check_in',
        eventTime: now,
      });

      return res.json({
        success: true,
        action: 'shift_started',
        session,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
      });
    }

    if (action === 'shift_end') {
      const [activeSession] = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, user.id),
          eq(branchShiftSessions.branchId, numBranchId),
          or(
            eq(branchShiftSessions.status, 'active'),
            eq(branchShiftSessions.status, 'on_break')
          )
        )).limit(1);

      if (!activeSession) {
        return res.status(400).json({ message: 'Aktif vardiya bulunamadı' });
      }

      if (activeSession.status === 'on_break') {
        await db.update(branchBreakLogs)
          .set({ endTime: now })
          .where(and(
            eq(branchBreakLogs.sessionId, activeSession.id),
            isNull(branchBreakLogs.endTime)
          ));
      }

      const checkInTime = new Date(activeSession.checkInTime);
      const totalMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
      const breakMins = activeSession.breakMinutes || 0;
      const netWorkMinutes = Math.max(0, totalMinutes - breakMins);

      const [updatedSession] = await db.update(branchShiftSessions)
        .set({
          checkOutTime: now,
          status: 'completed',
          workMinutes: totalMinutes,
          netWorkMinutes,
        })
        .where(eq(branchShiftSessions.id, activeSession.id))
        .returning();

      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id,
        userId: user.id,
        branchId: numBranchId,
        eventType: 'check_out',
        eventTime: now,
      });

      return res.json({
        success: true,
        action: 'shift_ended',
        session: updatedSession,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
        summary: {
          totalMinutes,
          breakMinutes: breakMins,
          netWorkMinutes,
        },
      });
    }

    if (action === 'break_start') {
      const [activeSession] = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, user.id),
          eq(branchShiftSessions.branchId, numBranchId),
          eq(branchShiftSessions.status, 'active')
        )).limit(1);

      if (!activeSession) {
        return res.status(400).json({ message: 'Aktif vardiya bulunamadı veya zaten molada' });
      }

      await db.update(branchShiftSessions)
        .set({ status: 'on_break' })
        .where(eq(branchShiftSessions.id, activeSession.id));

      await db.insert(branchBreakLogs).values({
        sessionId: activeSession.id,
        userId: user.id,
        branchId: numBranchId,
        startTime: now,
        breakType: 'regular',
      });

      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id,
        userId: user.id,
        branchId: numBranchId,
        eventType: 'break_start',
        eventTime: now,
      });

      return res.json({ success: true, action: 'break_started', user: { id: user.id, firstName: user.firstName, lastName: user.lastName } });
    }

    if (action === 'break_end') {
      const [activeSession] = await db.select().from(branchShiftSessions)
        .where(and(
          eq(branchShiftSessions.userId, user.id),
          eq(branchShiftSessions.branchId, numBranchId),
          eq(branchShiftSessions.status, 'on_break')
        )).limit(1);

      if (!activeSession) {
        return res.status(400).json({ message: 'Mola kaydı bulunamadı' });
      }

      const [activeBreak] = await db.select().from(branchBreakLogs)
        .where(and(
          eq(branchBreakLogs.sessionId, activeSession.id),
          isNull(branchBreakLogs.endTime)
        )).limit(1);

      if (activeBreak) {
        const breakStart = new Date(activeBreak.startTime);
        const breakDuration = Math.floor((now.getTime() - breakStart.getTime()) / 60000);
        await db.update(branchBreakLogs)
          .set({ endTime: now, durationMinutes: breakDuration })
          .where(eq(branchBreakLogs.id, activeBreak.id));

        const newBreakTotal = (activeSession.breakMinutes || 0) + breakDuration;
        await db.update(branchShiftSessions)
          .set({ status: 'active', breakMinutes: newBreakTotal })
          .where(eq(branchShiftSessions.id, activeSession.id));
      } else {
        await db.update(branchShiftSessions)
          .set({ status: 'active' })
          .where(eq(branchShiftSessions.id, activeSession.id));
      }

      await db.insert(branchShiftEvents).values({
        sessionId: activeSession.id,
        userId: user.id,
        branchId: numBranchId,
        eventType: 'break_end',
        eventTime: now,
      });

      return res.json({ success: true, action: 'break_ended', user: { id: user.id, firstName: user.firstName, lastName: user.lastName } });
    }

    res.status(400).json({ message: 'Geçersiz işlem' });
  } catch (error: unknown) {
    console.error('QR checkin error:', error);
    res.status(500).json({ message: 'QR giriş işlemi başarısız' });
  }
});

router.get('/api/kiosk/qr-status/:userId/:branchId', async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    const numBranchId = parseInt(branchId);

    const [activeSession] = await db.select().from(branchShiftSessions)
      .where(and(
        eq(branchShiftSessions.userId, userId),
        eq(branchShiftSessions.branchId, numBranchId),
        or(
          eq(branchShiftSessions.status, 'active'),
          eq(branchShiftSessions.status, 'on_break')
        )
      )).limit(1);

    const [user] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
    }).from(users).where(eq(users.id, userId)).limit(1);

    res.json({
      user: user || null,
      activeSession: activeSession || null,
      hasActiveShift: !!activeSession,
      currentStatus: activeSession?.status || 'none',
    });
  } catch (error: unknown) {
    console.error('QR status error:', error);
    res.status(500).json({ message: 'Durum sorgulanamadı' });
  }
});

router.patch('/api/branches/:branchId/kiosk/mode', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    if (!['admin', 'ceo', 'cgo'].includes(user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    const branchId = parseInt(req.params.branchId);
    const { kioskMode, allowPin, allowQr } = req.body;

    // En az bir giriş yöntemi aktif olmalı
    if (allowPin === false && allowQr === false) {
      return res.status(400).json({ message: 'En az bir giriş yöntemi aktif olmalı (PIN veya QR)' });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (kioskMode !== undefined && ['pin', 'qr', 'both'].includes(kioskMode)) updateData.kioskMode = kioskMode;
    if (allowPin !== undefined) updateData.allowPin = allowPin;
    if (allowQr !== undefined) updateData.allowQr = allowQr;

    const [existing] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, branchId)).limit(1);

    if (existing) {
      await db.update(branchKioskSettings)
        .set(updateData)
        .where(eq(branchKioskSettings.branchId, branchId));
    } else {
      const hashedDefault = await bcrypt.hash('0000', 10);
      await db.insert(branchKioskSettings).values({
        branchId,
        kioskPassword: hashedDefault,
        ...updateData,
      });
    }

    const [updated] = await db.select().from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, branchId)).limit(1);

    res.json({ success: true, settings: updated });
  } catch (error: unknown) {
    console.error('Kiosk mode update error:', error);
    res.status(500).json({ message: 'Kiosk modu güncellenemedi' });
  }
});

export default router;
