// ═══════════════════════════════════════════════════════════════════
// Sprint 12 (5 May 2026) - Yönetici Değerlendirme API
// 
// Aslan'ın talebi:
//   "Yönetici Değerlendirmesi 20 puan" hep 0 görünüyor.
//   Yöneticinin alt-elemanlarını manuel puanlaması için UI gerekli.
// 
// monthlyEmployeePerformance.managerRatingScore (0-100) DB'de var,
// ama yazma için endpoint yok. Bu dosya onu ekler.
// 
// Endpoints:
//   GET    /api/manager-rating/team               — Yönetici takımının liste
//   GET    /api/manager-rating/:userId/:year/:month — Belirli ay puanı
//   PUT    /api/manager-rating/:userId            — Puan ver/güncelle
//   GET    /api/manager-rating/history/:userId    — Geçmiş puanlar
// 
// Yetki: manager, supervisor, fabrika_mudur, admin, ceo, cgo
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import { 
  monthlyEmployeePerformance, 
  users, 
  branches 
} from '@shared/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

const router = Router();

const MANAGER_ROLES = ['manager', 'supervisor', 'fabrika_mudur', 'admin', 'ceo', 'cgo'];

function isManager(role: string): boolean { 
  return MANAGER_ROLES.includes(role); 
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/manager-rating/team — Puanlanabilir personel listesi
// ═══════════════════════════════════════════════════════════════════
router.get('/api/manager-rating/team', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isManager(user.role)) {
      return res.status(403).json({ message: 'Manager rating yetkisi yok' });
    }

    // Şube filtresi
    let branchId: number | null = user.branchId;
    if (req.query.branchId) {
      // HQ rolleri başka şubeyi seçebilir
      if (['admin', 'ceo', 'cgo'].includes(user.role)) {
        branchId = Number(req.query.branchId);
      }
    }

    if (!branchId) {
      return res.status(400).json({ message: 'Branch ID belirtilmeli' });
    }

    // Bu şubedeki personel (kendisi hariç)
    const team = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchId: users.branchId,
    })
      .from(users)
      .where(and(
        eq(users.branchId, branchId),
        eq(users.isActive, true),
        sql`${users.id} != ${user.id}`,
      ));

    // Bu ay için mevcut rating'leri al
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const teamWithRating = await Promise.all(team.map(async (m) => {
      const [perf] = await db.select()
        .from(monthlyEmployeePerformance)
        .where(and(
          eq(monthlyEmployeePerformance.userId, m.id),
          eq(monthlyEmployeePerformance.year, year),
          eq(monthlyEmployeePerformance.month, month),
        ))
        .limit(1);

      return {
        userId: m.id,
        fullName: [m.firstName, m.lastName].filter(Boolean).join(' '),
        role: m.role,
        currentRating: perf?.managerRatingScore ?? null, // 0-100
        ratingDate: perf?.updatedAt ?? null,
      };
    }));

    res.json({
      team: teamWithRating,
      period: { year, month },
      branchId,
    });
  } catch (error: unknown) {
    console.error('/api/manager-rating/team error:', error);
    res.status(500).json({ message: 'Takım listesi alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/manager-rating/:userId/:year/:month
// ═══════════════════════════════════════════════════════════════════
router.get('/api/manager-rating/:userId/:year/:month', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isManager(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const { userId, year, month } = req.params;
    
    const [perf] = await db.select()
      .from(monthlyEmployeePerformance)
      .where(and(
        eq(monthlyEmployeePerformance.userId, userId),
        eq(monthlyEmployeePerformance.year, Number(year)),
        eq(monthlyEmployeePerformance.month, Number(month)),
      ))
      .limit(1);

    res.json(perf || { userId, year: Number(year), month: Number(month), managerRatingScore: null });
  } catch (error: unknown) {
    res.status(500).json({ message: 'Rating alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /api/manager-rating/:userId — Puan ver/güncelle
// Body: { score: 0-100, year?, month?, notes? }
// ═══════════════════════════════════════════════════════════════════
router.put('/api/manager-rating/:userId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!isManager(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const { userId } = req.params;
    const { score, year, month, notes } = req.body || {};

    if (score == null || typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ message: 'Skor 0-100 arası olmalı' });
    }

    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? (now.getMonth() + 1);

    // Hedef personel mevcut mu, yetki var mı?
    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) return res.status(404).json({ message: 'Personel bulunamadı' });

    // Şube role'ler sadece kendi şubelerini puanlayabilir
    if (!['admin', 'ceo', 'cgo'].includes(user.role)) {
      if (target.branchId !== user.branchId) {
        return res.status(403).json({ message: 'Bu personel başka şubede, puanlayamazsınız' });
      }
    }

    // Mevcut kayıt var mı?
    const [existing] = await db.select()
      .from(monthlyEmployeePerformance)
      .where(and(
        eq(monthlyEmployeePerformance.userId, userId),
        eq(monthlyEmployeePerformance.year, targetYear),
        eq(monthlyEmployeePerformance.month, targetMonth),
      ))
      .limit(1);

    let result;
    if (existing) {
      // UPDATE
      [result] = await db.update(monthlyEmployeePerformance)
        .set({
          managerRatingScore: Math.round(score),
        })
        .where(eq(monthlyEmployeePerformance.id, existing.id))
        .returning();
    } else {
      // INSERT
      [result] = await db.insert(monthlyEmployeePerformance)
        .values({
          userId,
          branchId: target.branchId!,
          year: targetYear,
          month: targetMonth,
          managerRatingScore: Math.round(score),
        })
        .returning();
    }

    res.json(result);
  } catch (error: unknown) {
    console.error('/api/manager-rating PUT error:', error);
    res.status(500).json({ message: 'Rating kaydedilemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/manager-rating/history/:userId — Tüm aylık puanlar
// ═══════════════════════════════════════════════════════════════════
router.get('/api/manager-rating/history/:userId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    // Kendi puanlarını veya manager rolü görebilir
    if (user.id !== userId && !isManager(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const history = await db.select()
      .from(monthlyEmployeePerformance)
      .where(eq(monthlyEmployeePerformance.userId, userId))
      .orderBy(desc(monthlyEmployeePerformance.year), desc(monthlyEmployeePerformance.month));

    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ message: 'Geçmiş alınamadı' });
  }
});

export default router;
