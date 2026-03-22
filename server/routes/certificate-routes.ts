import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { eq, desc, and, or, count } from "drizzle-orm";
import { generatePersonalSummaryReport } from "../ai";
import { buildMenuForUser } from "../menu-service";
import { z } from "zod";
import {
  users,
  tasks,
  checklists,
  shifts,
  notifications,
  messages,
  badges,
  certificateDesignSettings,
  certificateSettings,
  issuedCertificates,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error deleting certificate design:", error);
      res.status(500).json({ message: "Sertifika tasarımı silinirken hata oluştu" });
    }
  });

  router.get('/api/certificate-settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await db.select().from(certificateSettings);
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.settingKey] = s.settingValue;
      }
      res.json(result);
    } catch (error: unknown) {
      console.error("Error fetching certificate settings:", error);
      res.status(500).json({ message: "Sertifika ayarları alınırken hata oluştu" });
    }
  });

  router.patch('/api/certificate-settings/:key', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['admin', 'ceo', 'coach', 'trainer'].includes(role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const key = req.params.key;
      const { value } = req.body;
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ message: "Geçerli bir değer giriniz" });
      }
      const existing = await db.select().from(certificateSettings).where(eq(certificateSettings.settingKey, key));
      if (existing.length > 0) {
        const [updated] = await db.update(certificateSettings)
          .set({ settingValue: value, updatedBy: user.id, updatedAt: new Date() })
          .where(eq(certificateSettings.settingKey, key))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(certificateSettings)
          .values({ settingKey: key, settingValue: value, updatedBy: user.id })
          .returning();
        res.json(created);
      }
    } catch (error: unknown) {
      console.error("Error updating certificate setting:", error);
      res.status(500).json({ message: "Sertifika ayarı güncellenirken hata oluştu" });
    }
  });

  router.get('/api/certificates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const certs = await db.select().from(issuedCertificates)
        .where(eq(issuedCertificates.isActive, true))
        .orderBy(desc(issuedCertificates.issuedAt));
      res.json(certs);
    } catch (error: unknown) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Sertifikalar alınırken hata oluştu" });
    }
  });

  router.get('/api/certificates/my', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const certs = await db.select().from(issuedCertificates)
        .where(and(
          eq(issuedCertificates.recipientUserId, user.id),
          eq(issuedCertificates.isActive, true)
        ))
        .orderBy(desc(issuedCertificates.issuedAt));
      res.json(certs);
    } catch (error: unknown) {
      console.error("Error fetching my certificates:", error);
      res.status(500).json({ message: "Sertifikalarınız alınırken hata oluştu" });
    }
  });

  router.get('/api/certificates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Geçersiz sertifika ID" });
      }
      const [cert] = await db.select().from(issuedCertificates)
        .where(and(eq(issuedCertificates.id, id), eq(issuedCertificates.isActive, true)));
      if (!cert) {
        return res.status(404).json({ message: "Sertifika bulunamadı" });
      }
      res.json(cert);
    } catch (error: unknown) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "Sertifika alınırken hata oluştu" });
    }
  });

  router.post('/api/certificates', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const [cert] = await db.insert(issuedCertificates).values(req.body).returning();
      res.json(cert);
    } catch (error: unknown) {
      console.error("Error creating certificate:", error);
      res.status(500).json({ message: "Sertifika oluşturulurken hata oluştu" });
    }
  });

  router.delete('/api/certificates/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const [updated] = await db.update(issuedCertificates)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(issuedCertificates.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: "Sertifika bulunamadı" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting certificate:", error);
      res.status(500).json({ message: "Sertifika silinirken hata oluştu" });
    }
  });

  // Get presigned upload URL for object storage
  router.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('../objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ method: "PUT", url: uploadURL });
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
      
      const isPublicAsset = req.path.startsWith('/objects/public/');
      
      if (!isPublicAsset) {
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
        });
        
        if (!canAccess) {
          return res.sendStatus(403);
        }
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: unknown) {
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
  router.get('/api/employee-availability', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching employee availability:", error);
      res.status(500).json({ message: "Müsaitlik bilgileri getirilemedi" });
    }
  });
  
  // GET /api/employee-availability/:id - Get single availability record
  router.get('/api/employee-availability/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı getirilemedi" });
    }
  });
  
  // POST /api/employee-availability - Create availability record
  router.post('/api/employee-availability', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { insertEmployeeAvailabilitySchema } = await import('@shared/schema');
      const validatedData = insertEmployeeAvailabilitySchema.parse(req.body);
      
      if (validatedData.userId !== user.id) {
        return res.status(403).json({ message: "Yalnızca kendi müsaitlik bilgilerinizi ekleyebilirsiniz" });
      }
      
      const created = await storage.createAvailability(validatedData);
      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error creating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı oluşturulamadı" });
    }
  });
  
  // PATCH /api/employee-availability/:id - Update availability record
  router.patch('/api/employee-availability/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error updating availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz müsaitlik verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kaydı güncellenemedi" });
    }
  });
  
  // DELETE /api/employee-availability/:id - Delete availability record
  router.delete('/api/employee-availability/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Müsaitlik kaydı silinemedi" });
    }
  });
  
  // POST /api/employee-availability/check - Check availability for a shift
  router.post('/api/employee-availability/check', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error checking availability:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz kontrol verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Müsaitlik kontrolü yapılamadı" });
    }
  });


  // ===== SHIFT REPORTING ENDPOINTS =====
  
  // GET /api/reports/attendance-stats - Get attendance statistics
  router.get('/api/reports/attendance-stats', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching attendance stats:", error);
      res.status(500).json({ message: "İstatistikler getirilemedi" });
    }
  });


  // ===== USER SETTINGS ENDPOINTS =====

  router.get('/api/me/settings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const [dbUser] = await db.select({ language: users.language }).from(users).where(eq(users.id, user.id));
      res.json({ language: dbUser?.language || "tr" });
    } catch (error: unknown) {
      console.error("[Settings] GET error:", error);
      res.status(500).json({ error: "Ayarlar yüklenemedi" });
    }
  });

  router.patch('/api/me/settings', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("[Settings] PATCH error:", error);
      res.status(500).json({ error: "Ayarlar kaydedilemedi" });
    }
  });

  // ===== USER PERSONAL DASHBOARD ENDPOINT =====
  
  // GET /api/me/dashboard-summary - Personal dashboard summary for the authenticated user
  router.get('/api/me/dashboard-summary', isAuthenticated, async (req, res) => {
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
          tasks.filter((t) => t.assignedToId === userId)
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
      const completedTasks = myTasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
      const pendingTasks = myTasks.filter((t) => t.status !== 'completed' && t.status !== 'done').length;
      
      // Calculate checklist stats
      const totalChecklists = myChecklists.length;
      const completedChecklists = myChecklists.filter((c) => 
        c.tasks?.every((t) => t.completed)
      ).length;
      
      // Get today's shift
      const todayShift = myShifts.find((s) => 
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
      } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Error getting personal dashboard summary:', error);
      res.status(500).json({ message: 'Dashboard özeti alınamadı' });
    }
  });

  // ===== MENU MANAGEMENT ENDPOINTS =====
  
  // GET /api/me/menu - User-scoped menu endpoint (v2 - static blueprint based)
  // Primary endpoint for sidebar menu - uses static blueprint with RBAC filtering
  // NO CACHING - fresh data every request to prevent RBAC bypass
  router.get('/api/me/menu', isAuthenticated, async (req, res) => {
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
        notificationCount = notifications.filter((n) => !n.readAt).length;
      } catch (error: unknown) {
        // Ignore notification count errors
      }
      
      try {
        const unreadResult = await storage.getUnreadCount(user.id);
        messageCount = unreadResult?.count || 0;
      } catch (error: unknown) {
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
      } catch (error: unknown) {
        console.error("Error fetching dynamic permissions:", e);
        // Continue with static permissions if dynamic fails
      }
      
      // Build menu using the new service with dynamic permissions
      const menuResponse = await buildMenuForUser(
        { id: user.id, role: userRole, branchId: user.branchId ?? null },
        badges,
        dynamicPermissions
      );
      
      
      return res.status(200).json(menuResponse);
    } catch (error: unknown) {
      console.error("Error fetching user menu:", error);
      res.status(500).json({ message: "Menü alınırken hata oluştu" });
    }
  });

  
  // GET /api/me/permissions - Returns dynamic permissions for current user's role
  // Used by frontend mega-modules to check permissions against admin panel settings
  router.get('/api/me/permissions', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Yetkiler alınırken hata oluştu" });
    }
  });

  // GET /api/menu - Legacy endpoint (deprecated, redirects to static blueprint)
  router.get('/api/menu', isAuthenticated, async (req, res) => {
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
      } catch (error: unknown) {
        console.error("Error fetching dynamic permissions for legacy menu:", e);
      }
      
      // Use new menu service with dynamic permissions
      const menuResponse = await buildMenuForUser({ id: user.id, role: userRole, branchId: user.branchId ?? null }, {}, dynamicPermissions);
      
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
    } catch (error: unknown) {
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

export default router;
