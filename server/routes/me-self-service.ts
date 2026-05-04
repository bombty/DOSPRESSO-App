// ═══════════════════════════════════════════════════════════════════
// Sprint 4 / TASK-#345 (5 May 2026): Personel Self-Service Endpoint'ler
// ═══════════════════════════════════════════════════════════════════
// Personel kendi puantaj + izin + mesai bilgilerini görmek için.
// "/api/me/" pattern'i: oturum açmış kullanıcının KENDİ verisi.
// 
// GÜVENLIK: Tüm endpoint'ler sadece req.user.id verisini döndürür.
// Başkasının verisini almak isterse 403 — admin/muhasebe için
// /api/personnel/:id/* mevcut endpoint'leri kullanılır.
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import {
  pdksRecords,
  factoryShiftSessions,
  leaveBalances,
  leaveRequests,
  overtimeRequests,
  monthlyPayroll,
} from '@shared/schema';
import { and, eq, gte, lte, isNull, isNotNull, sql, count, desc } from 'drizzle-orm';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// 1) GET /api/me/puantaj?year=&month=
// Kullanıcının kendi aylık puantajı (günlük detay + özet)
// ═══════════════════════════════════════════════════════════════════
router.get('/api/me/puantaj', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);

    // Ay başı ve ay sonu hesapla
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Şube giriş-çıkışlar (PDKS)
    const branchRecords = await db.select({
      id: pdksRecords.id,
      checkInTime: pdksRecords.checkInTime,
      checkOutTime: pdksRecords.checkOutTime,
      branchId: pdksRecords.branchId,
      totalMinutes: pdksRecords.totalMinutes,
    })
      .from(pdksRecords)
      .where(and(
        eq(pdksRecords.userId, userId),
        gte(pdksRecords.checkInTime, monthStart),
        lte(pdksRecords.checkInTime, monthEnd),
      ))
      .orderBy(desc(pdksRecords.checkInTime));

    // Fabrika vardıyaları
    const factorySessions = await db.select({
      id: factoryShiftSessions.id,
      checkInTime: factoryShiftSessions.checkInTime,
      checkOutTime: factoryShiftSessions.checkOutTime,
      workMinutes: factoryShiftSessions.workMinutes,
      status: factoryShiftSessions.status,
    })
      .from(factoryShiftSessions)
      .where(and(
        eq(factoryShiftSessions.userId, userId),
        gte(factoryShiftSessions.checkInTime, monthStart),
        lte(factoryShiftSessions.checkInTime, monthEnd),
      ))
      .orderBy(desc(factoryShiftSessions.checkInTime));

    // Bugün aktif mi? (check-in var ama check-out yok)
    const todayActiveBranch = branchRecords.find(r => 
      r.checkInTime && r.checkInTime >= today && r.checkInTime < tomorrow && !r.checkOutTime
    );
    const todayActiveFactory = factorySessions.find(f =>
      f.status === 'active' && f.checkInTime && f.checkInTime >= today
    );
    const isActiveToday = !!(todayActiveBranch || todayActiveFactory);

    // Günlük tablo: tarih → giriş/çıkış/dakika
    const dailyMap = new Map<string, any>();

    for (const r of branchRecords) {
      if (!r.checkInTime) continue;
      const dateKey = new Date(r.checkInTime).toISOString().split('T')[0];
      dailyMap.set(dateKey, {
        date: dateKey,
        checkIn: r.checkInTime,
        checkOut: r.checkOutTime,
        minutes: r.totalMinutes || 0,
        source: 'branch',
        branchId: r.branchId,
      });
    }

    for (const f of factorySessions) {
      if (!f.checkInTime) continue;
      const dateKey = new Date(f.checkInTime).toISOString().split('T')[0];
      // Fabrika kaydı varsa şube kaydının üzerine yazılmaz, eklenir
      const existing = dailyMap.get(dateKey);
      if (!existing) {
        dailyMap.set(dateKey, {
          date: dateKey,
          checkIn: f.checkInTime,
          checkOut: f.checkOutTime,
          minutes: f.workMinutes || 0,
          source: 'factory',
        });
      }
    }

    const dailyRecords = Array.from(dailyMap.values()).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    // Aylık özet hesapla
    const totalMinutes = dailyRecords.reduce((sum, r) => sum + (r.minutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const workedDays = dailyRecords.length;

    // Bu ay onaylanmış mesai dakikaları
    const [overtimeAgg] = await db.select({
      totalApproved: sql<number>`COALESCE(SUM(${overtimeRequests.approvedMinutes}), 0)`,
    })
      .from(overtimeRequests)
      .where(and(
        eq(overtimeRequests.userId, userId),
        eq(overtimeRequests.status, 'approved'),
        gte(overtimeRequests.overtimeDate, monthStart.toISOString().split('T')[0]),
        lte(overtimeRequests.overtimeDate, monthEnd.toISOString().split('T')[0]),
      ));

    res.json({
      period: { year, month },
      isActiveToday,
      summary: {
        workedDays,
        totalMinutes,
        totalHours,
        formattedTotal: `${totalHours}s ${remainingMinutes}dk`,
        overtimeMinutesApproved: overtimeAgg?.totalApproved ?? 0,
      },
      dailyRecords,
      activeSession: isActiveToday ? {
        type: todayActiveBranch ? 'branch' : 'factory',
        checkInTime: todayActiveBranch?.checkInTime || todayActiveFactory?.checkInTime,
      } : null,
    });
  } catch (error: unknown) {
    console.error('/api/me/puantaj error:', error);
    res.status(500).json({ message: 'Puantaj alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) GET /api/me/leave-balance
// Kullanıcının kendi izin bakiyesi (gerçek tablodan)
// ═══════════════════════════════════════════════════════════════════
router.get('/api/me/leave-balance', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // leave_balances tablosundan kayıt al (Sprint 1'de oluşturuldu)
    const [balance] = await db.select()
      .from(leaveBalances)
      .where(and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.periodYear, year),
      ));

    if (!balance) {
      // Tablo yoksa veya bu yıl için kayıt yoksa varsayılan döndür
      // (Sprint 1 leave_balances henüz seed edilmemiş olabilir)
      return res.json({
        userId,
        periodYear: year,
        annualEntitlementDays: 14,
        usedDays: 0,
        carriedOverDays: 0,
        remainingDays: 14,
        notes: 'Bakiye kaydı henüz oluşturulmadı (Sprint 1 migration bekliyor)',
        warning: true,
      });
    }

    // Bu yıl bekleyen izin talepleri
    const pendingLeaves = await db.select({
      id: leaveRequests.id,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      totalDays: leaveRequests.totalDays,
      status: leaveRequests.status,
      reason: leaveRequests.reason,
    })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.status, 'pending'),
        sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`,
      ));

    // Geçmiş onaylanmış izinler
    const approvedLeaves = await db.select({
      id: leaveRequests.id,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      totalDays: leaveRequests.totalDays,
      status: leaveRequests.status,
    })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.status, 'approved'),
        sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`,
      ))
      .orderBy(desc(leaveRequests.startDate));

    res.json({
      ...balance,
      pendingLeaves,
      approvedLeaves,
      counts: {
        pending: pendingLeaves.length,
        approved: approvedLeaves.length,
      },
    });
  } catch (error: unknown) {
    console.error('/api/me/leave-balance error:', error);
    res.status(500).json({ message: 'İzin bakiyesi alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3) GET /api/me/overtime
// Kullanıcının kendi mesai talepleri (geçmiş + bekleyen)
// ═══════════════════════════════════════════════════════════════════
router.get('/api/me/overtime', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const overtimes = await db.select()
      .from(overtimeRequests)
      .where(eq(overtimeRequests.userId, userId))
      .orderBy(desc(overtimeRequests.createdAt))
      .limit(limit);

    const counts = {
      pending: overtimes.filter(o => o.status === 'pending').length,
      approved: overtimes.filter(o => o.status === 'approved').length,
      rejected: overtimes.filter(o => o.status === 'rejected').length,
    };

    const totalApprovedMinutes = overtimes
      .filter(o => o.status === 'approved')
      .reduce((sum, o) => sum + (o.approvedMinutes || 0), 0);

    res.json({
      list: overtimes,
      counts,
      summary: {
        total: overtimes.length,
        totalApprovedMinutes,
        totalApprovedHours: Math.floor(totalApprovedMinutes / 60),
      },
    });
  } catch (error: unknown) {
    console.error('/api/me/overtime error:', error);
    res.status(500).json({ message: 'Mesai talepleri alınamadı' });
  }
});

export default router;
