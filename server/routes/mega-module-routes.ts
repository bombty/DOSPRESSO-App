import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  branches,
  users,
  managerMonthlyRatings,
  staffQrRatings,
  staffQrTokens,
} from "@shared/schema";

const router = Router();

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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error saving staff rating:", error);
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });

  // GET /api/staff-qr-tokens - Personel QR tokenlerini listele

  // POST /api/staff-qr-tokens - Yeni QR token oluştur

  // GET /api/staff-qr-ratings - Personel değerlendirmelerini listele
  router.get('/api/staff-qr-ratings', isAuthenticated, async (req, res) => {
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
    } catch (error: unknown) {
      console.error("Error fetching staff ratings:", error);
      res.status(500).json({ message: "Değerlendirmeler alınamadı" });
    }
  });


  // ========================================
  // YÖNETİCİ AYLIK PERSONEL DEĞERLENDİRME API
  // ========================================

  // GET /api/manager-ratings - Yönetici değerlendirmelerini listele
  router.get("/api/manager-ratings", isAuthenticated, async (req, res) => {
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

      const allUserIds = [...new Set([...ratings.map(r => r.employeeId), ...ratings.map(r => r.managerId)])];
      const ratingUsers = allUserIds.length > 0
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(inArray(users.id, allUserIds))
        : [];
      const ratingUserMap = new Map(ratingUsers.map(u => [u.id, { firstName: u.firstName, lastName: u.lastName }]));
      const enriched = ratings.map(r => ({
        ...r,
        employee: ratingUserMap.get(r.employeeId) || null,
        manager: ratingUserMap.get(r.managerId) || null,
      }));

      res.json(enriched);
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error saving staff rating:", error);
      res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
    }
  });


export default router;
