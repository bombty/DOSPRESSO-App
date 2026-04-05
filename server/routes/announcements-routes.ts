import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, or, gte, lte, sql, isNull, count } from "drizzle-orm";
import {
  announcements,
  announcementReadStatus,
  branches,
  users,
  banners,
} from "@shared/schema";

const router = Router();

  // ========================================
  // DUYURU (ANNOUNCEMENTS) API
  // ========================================

  // GET /api/announcements - Tüm yayınlanmış duyuruları getir
  router.get('/api/announcements', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Get announcements error:", error);
      res.status(500).json({ message: "Duyurular alınamadı" });
    }
  });

  // GET /api/announcements/banners - Dashboard için aktif banner'ları getir
  router.get('/api/announcements/banners', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Get announcement banners error:", error);
      res.status(500).json({ message: "Banner'lar alınamadı" });
    }
  });

  // GET /api/announcements/unread-count - Okunmamış duyuru sayısı
  router.get('/api/announcements/unread-count', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Get unread count error:", error);
      res.status(500).json({ count: 0 });
    }
  });

  // GET /api/announcements/:id - Tek duyuru detayı
  router.get('/api/announcements/:id', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Get announcement error:", error);
      res.status(500).json({ message: "Duyuru alınamadı" });
    }
  });

  // POST /api/announcements/:id/read - Duyuruyu okundu olarak işaretle
  router.post('/api/announcements/:id/read', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Mark announcement read error:", error);
      res.status(500).json({ message: "Okundu işaretlenemedi" });
    }
  });

  // GET /api/announcements/:id/read-status - Duyuru okuma durumu
  router.get('/api/announcements/:id/read-status', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Get read status error:", error);
      res.status(500).json({ message: "Okuma durumu alınamadı" });
    }
  });

  // ========================================
  // DUYURU ONAY AKIŞI (APPROVAL WORKFLOW)
  // ========================================

  // PATCH /api/announcements/:id/status - Duyuru durumunu değiştir
  // Akış: draft → review → approved → published
  // Geri: published → archived, any → draft
  router.patch('/api/announcements/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      
      const validStatuses = ['draft', 'review', 'approved', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum" });
      }

      // Yetki kontrolü
      const approverRoles = ['admin', 'ceo', 'cgo', 'coach'];
      const editorRoles = ['admin', 'coach', 'destek', 'supervisor', 'marketing'];
      
      // Sadece admin/ceo/cgo/coach onaylayabilir
      if (status === 'approved' && !approverRoles.includes(user.role)) {
        return res.status(403).json({ message: "Duyuru onaylama yetkiniz yok" });
      }
      
      // Yayınlama yetkisi
      if (status === 'published' && !approverRoles.includes(user.role)) {
        return res.status(403).json({ message: "Duyuru yayınlama yetkiniz yok" });
      }

      const updates: Record<string, any> = { 
        status, 
        updatedAt: new Date() 
      };

      if (status === 'approved') {
        updates.approvedById = user.id;
        updates.approvedAt = new Date();
      }

      if (status === 'published') {
        updates.publishedAt = new Date();
        // Eğer henüz onaylanmadıysa, yayınlayan aynı zamanda onaylayan
        const [current] = await db.select()
          .from(announcements)
          .where(eq(announcements.id, parseInt(id)));
        if (current && !current.approvedById) {
          updates.approvedById = user.id;
          updates.approvedAt = new Date();
        }
      }

      const [updated] = await db.update(announcements)
        .set(updates)
        .where(eq(announcements.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Duyuru bulunamadı" });
      }

      res.json(updated);
    } catch (error: unknown) {
      console.error("Update announcement status error:", error);
      res.status(500).json({ message: "Durum güncellenemedi" });
    }
  });

  // ========================================
  // DUYURU ACKNOWLEDGMENT (ONAYLAMA)
  // ========================================

  // POST /api/announcements/:id/acknowledge - Duyuruyu onayladım
  router.post('/api/announcements/:id/acknowledge', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Upsert — okundu + acknowledge olarak işaretle
      await db.insert(announcementReadStatus)
        .values({
          announcementId: parseInt(id),
          userId: user.id,
        })
        .onConflictDoNothing();
      
      res.json({ success: true, acknowledgedAt: new Date() });
    } catch (error: unknown) {
      console.error("Acknowledge announcement error:", error);
      res.status(500).json({ message: "Onay kaydedilemedi" });
    }
  });


export default router;
