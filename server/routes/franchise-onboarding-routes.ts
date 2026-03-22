import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { AuthorizationError, ensurePermission } from "./helpers";
import { eq, desc, and, max } from "drizzle-orm";
import { z } from "zod";
import {
  insertFranchiseOnboardingSchema,
  insertLicenseRenewalSchema,
  insertAttendancePenaltySchema,
  insertGuestComplaintSchema,
  users,
  shiftAttendance,
  franchiseOnboarding,
  onboardingDocuments,
  licenseRenewals,
  isHQRole,
  isBranchRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // FRANCHISE ONBOARDING API (Franchise Açılış)
  // ========================================

  // GET /api/franchise-onboarding - List onboarding processes
  router.get('/api/franchise-onboarding', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching onboarding processes:", error);
      res.status(500).json({ message: "Açılış süreçleri yüklenirken hata oluştu" });
    }
  });

  // POST /api/franchise-onboarding - Create onboarding process
  router.post('/api/franchise-onboarding', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertFranchiseOnboardingSchema.parse(req.body);
      const [process] = await db.insert(franchiseOnboarding).values(validatedData).returning();

      res.status(201).json(process);
    } catch (error: unknown) {
      console.error("Error creating onboarding process:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Açılış süreci oluşturulurken hata oluştu" });
    }
  });

  // GET /api/franchise-onboarding/:id/documents - Get onboarding documents
  router.get('/api/franchise-onboarding/:id/documents', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const documents = await db.select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.onboardingId, parseInt(id)));

      res.json(documents);
    } catch (error: unknown) {
      console.error("Error fetching onboarding documents:", error);
      res.status(500).json({ message: "Belgeler yüklenirken hata oluştu" });
    }
  });

  // GET /api/license-renewals - List license renewals
  router.get('/api/license-renewals', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching license renewals:", error);
      res.status(500).json({ message: "Lisanslar yüklenirken hata oluştu" });
    }
  });

  // POST /api/license-renewals - Create license renewal
  router.post('/api/license-renewals', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "HQ yetkisi gerekli" });
      }

      const validatedData = insertLicenseRenewalSchema.parse(req.body);
      const [renewal] = await db.insert(licenseRenewals).values(validatedData).returning();

      res.status(201).json(renewal);
    } catch (error: unknown) {
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
  router.get('/api/muhasebe/access', isAuthenticated, async (req, res) => {
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
      const hasExplicitAccess = permissions.some((p) => 
        p.role === userRole && p.module === 'accounting' && (p.actions || []).includes('view')
      );
      
      res.json(hasExplicitAccess);
    } catch (error: unknown) {
      console.error("Error checking accounting access:", error);
      res.status(500).json(false);
    }
  });



  router.patch('/api/overtime-requests/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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

  router.get('/api/guest-complaints', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { status, priority } = req.query;
      
      ensurePermission(user, 'complaints', 'view', 'Şikayetleri görüntülemek için yetkiniz yok');
      
      const isBranchStaff = isBranchRole(user.role as UserRoleType);
      const branchId = isBranchStaff ? user.branchId : undefined;
      const complaints = await storage.getGuestComplaints(branchId, status, priority);
      
      res.json(complaints);
    } catch (error: unknown) {
      console.error("Error fetching guest complaints:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Şikayetler yüklenirken hata oluştu" });
    }
  });

  router.post('/api/guest-complaints', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error creating guest complaint:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Şikayet oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/guest-complaints/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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

  router.post('/api/guest-complaints/:id/resolve', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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

  router.get('/api/guest-complaints/stats', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching complaint stats:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "İstatistikler yüklenirken hata oluştu" });
    }
  });

  router.get('/api/guest-complaints/heatmap', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching complaint heatmap:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Heatmap yüklenirken hata oluştu" });
    }
  });



  router.get('/api/attendance-penalties/:shiftAttendanceId', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching attendance penalties:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Penaltılar yüklenirken hata oluştu" });
    }
  });

  router.post('/api/attendance-penalties', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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

  router.get('/api/monthly-attendance-summary/:userId/:periodMonth', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching monthly summary:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Aylık özet yüklenirken hata oluştu" });
    }
  });

  router.post('/api/monthly-attendance-summary', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
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


export default router;
