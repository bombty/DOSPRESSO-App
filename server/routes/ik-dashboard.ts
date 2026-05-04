// ═══════════════════════════════════════════════════════════════════
// Sprint 3 / TASK-#346 (5 May 2026): Mahmut Bey — Muhasebe/İK Kontrol Merkezi
// ═══════════════════════════════════════════════════════════════════
// Mahmut Bey'in tek ekranda görmesi gereken bilgiler:
//   1. Günlük özet — 3 lokasyon (Işıklar+Fabrika+HQ) giriş durumu
//   2. Bekleyen işlemler — mesai, izin, bordro hesaplama
//   3. Anormallikler — devamsız personel, açık vardıyalar
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import {
  users,
  branches,
  pdksRecords,
  factoryShiftSessions,
  overtimeRequests,
  leaveRequests,
  monthlyPayroll,
  leaveBalances,
} from '@shared/schema';
import { and, eq, gte, lte, isNull, isNotNull, sql, count, desc, inArray } from 'drizzle-orm';

const router = Router();

// Mahmut Bey'in sorumluluk alanı: HQ + Fabrika + Işıklar (admin ve ceo da görür)
const IK_DASHBOARD_ROLES = ['admin', 'ceo', 'muhasebe', 'muhasebe_ik', 'ik'];
const MAHMUT_BRANCH_IDS = [5, 23, 24]; // Işıklar, HQ, Fabrika

function checkIkAccess(userRole: string | undefined): boolean {
  return !!userRole && IK_DASHBOARD_ROLES.includes(userRole);
}

// ═══════════════════════════════════════════════════════════════════
// 1) GET /api/ik/gunluk-ozet
// Bugünkü 3 lokasyon (Işıklar+Fabrika+HQ) giriş özeti
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/gunluk-ozet', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 3 lokasyon için paralel sorgular
    const [branchData, factoryData, hqData, totalUsers] = await Promise.all([
      // Şube giriş-çıkışlar (Işıklar #5)
      db.select({
        branchId: pdksRecords.branchId,
        userId: pdksRecords.userId,
        checkInTime: pdksRecords.checkInTime,
        checkOutTime: pdksRecords.checkOutTime,
      })
        .from(pdksRecords)
        .where(and(
          gte(pdksRecords.checkInTime, today),
          lte(pdksRecords.checkInTime, tomorrow),
          inArray(pdksRecords.branchId, [5]) // Işıklar
        )),

      // Fabrika vardıyaları (#24)
      db.select({
        userId: factoryShiftSessions.userId,
        checkInTime: factoryShiftSessions.checkInTime,
        checkOutTime: factoryShiftSessions.checkOutTime,
        status: factoryShiftSessions.status,
      })
        .from(factoryShiftSessions)
        .where(and(
          gte(factoryShiftSessions.checkInTime, today),
          lte(factoryShiftSessions.checkInTime, tomorrow),
        )),

      // HQ giriş-çıkışlar (#23)
      db.select({
        userId: pdksRecords.userId,
        checkInTime: pdksRecords.checkInTime,
        checkOutTime: pdksRecords.checkOutTime,
      })
        .from(pdksRecords)
        .where(and(
          gte(pdksRecords.checkInTime, today),
          lte(pdksRecords.checkInTime, tomorrow),
          eq(pdksRecords.branchId, 23) // HQ
        )),

      // Toplam aktif personel sayısı (her lokasyon için)
      db.select({
        branchId: users.branchId,
        total: count(),
      })
        .from(users)
        .where(and(
          isNull(users.deletedAt),
          inArray(users.branchId, MAHMUT_BRANCH_IDS),
        ))
        .groupBy(users.branchId),
    ]);

    // Lokasyon kartları için özet hesapla
    const locations = [
      {
        id: 5,
        name: 'Işıklar (HQ-Owned)',
        type: 'branch',
        totalEmployees: totalUsers.find(u => u.branchId === 5)?.total ?? 0,
        checkedInToday: new Set(branchData.map(b => b.userId)).size,
        currentlyWorking: branchData.filter(b => !b.checkOutTime).length,
        notCheckedIn: 0, // hesaplanacak
      },
      {
        id: 24,
        name: 'Fabrika',
        type: 'factory',
        totalEmployees: totalUsers.find(u => u.branchId === 24)?.total ?? 0,
        checkedInToday: new Set(factoryData.map(f => f.userId)).size,
        currentlyWorking: factoryData.filter(f => f.status === 'active').length,
        notCheckedIn: 0,
      },
      {
        id: 23,
        name: 'Ofis (HQ)',
        type: 'office',
        totalEmployees: totalUsers.find(u => u.branchId === 23)?.total ?? 0,
        checkedInToday: new Set(hqData.map(h => h.userId)).size,
        currentlyWorking: hqData.filter(h => !h.checkOutTime).length,
        notCheckedIn: 0,
      },
    ].map(loc => ({
      ...loc,
      notCheckedIn: loc.totalEmployees - loc.checkedInToday,
      attendanceRate: loc.totalEmployees > 0
        ? Math.round((loc.checkedInToday / loc.totalEmployees) * 100)
        : 0,
    }));

    res.json({
      date: today.toISOString().split('T')[0],
      locations,
      summary: {
        totalEmployees: locations.reduce((sum, l) => sum + l.totalEmployees, 0),
        totalCheckedIn: locations.reduce((sum, l) => sum + l.checkedInToday, 0),
        totalCurrentlyWorking: locations.reduce((sum, l) => sum + l.currentlyWorking, 0),
        totalNotCheckedIn: locations.reduce((sum, l) => sum + l.notCheckedIn, 0),
      },
    });
  } catch (error: unknown) {
    console.error('IK Günlük özet hatası:', error);
    res.status(500).json({ message: 'Günlük özet alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) GET /api/ik/bekleyen-islemler
// Onay bekleyen mesai + izin + bordro hesaplaması
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/bekleyen-islemler', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const [pendingOvertimes, pendingLeaves, draftPayrolls] = await Promise.all([
      // Bekleyen mesai talepleri
      db.select({
        id: overtimeRequests.id,
        userId: overtimeRequests.userId,
        branchId: overtimeRequests.branchId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        branchName: branches.name,
        overtimeDate: overtimeRequests.overtimeDate,
        startTime: overtimeRequests.startTime,
        endTime: overtimeRequests.endTime,
        requestedMinutes: overtimeRequests.requestedMinutes,
        reason: overtimeRequests.reason,
        createdAt: overtimeRequests.createdAt,
      })
        .from(overtimeRequests)
        .leftJoin(users, eq(overtimeRequests.userId, users.id))
        .leftJoin(branches, eq(overtimeRequests.branchId, branches.id))
        .where(eq(overtimeRequests.status, 'pending'))
        .orderBy(desc(overtimeRequests.createdAt))
        .limit(50),

      // Bekleyen izin talepleri
      db.select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        branchId: users.branchId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        createdAt: leaveRequests.createdAt,
      })
        .from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.userId, users.id))
        .where(eq(leaveRequests.status, 'pending'))
        .orderBy(desc(leaveRequests.createdAt))
        .limit(50),

      // Hesaplanmamış / draft puantajlar (bu ay)
      db.select({
        id: monthlyPayroll.id,
        userId: monthlyPayroll.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        branchId: monthlyPayroll.branchId,
        year: monthlyPayroll.year,
        month: monthlyPayroll.month,
        status: monthlyPayroll.status,
        totalSalary: monthlyPayroll.totalSalary,
      })
        .from(monthlyPayroll)
        .leftJoin(users, eq(monthlyPayroll.userId, users.id))
        .where(and(
          eq(monthlyPayroll.status, 'draft'),
          inArray(monthlyPayroll.branchId, MAHMUT_BRANCH_IDS),
        ))
        .orderBy(desc(monthlyPayroll.calculatedAt))
        .limit(50),
    ]);

    res.json({
      pendingOvertimes,
      pendingLeaves,
      draftPayrolls,
      counts: {
        overtimes: pendingOvertimes.length,
        leaves: pendingLeaves.length,
        payrolls: draftPayrolls.length,
        total: pendingOvertimes.length + pendingLeaves.length + draftPayrolls.length,
      },
    });
  } catch (error: unknown) {
    console.error('IK Bekleyen işlemler hatası:', error);
    res.status(500).json({ message: 'Bekleyen işlemler alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3) GET /api/ik/anormallikler
// 3+ gün üst üste devamsız, açık vardıyalar, eksik puantajlar
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/anormallikler', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const ABSENCE_THRESHOLD_DAYS = 3; // 3+ gün devamsız uyarı
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - ABSENCE_THRESHOLD_DAYS);

    const [openShiftsBranch, openShiftsFactory, missingPayrolls] = await Promise.all([
      // Açık (check-out yok) şube vardıyaları (24+ saatten eski)
      db.select({
        id: pdksRecords.id,
        userId: pdksRecords.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        branchId: pdksRecords.branchId,
        branchName: branches.name,
        checkInTime: pdksRecords.checkInTime,
        hoursOpen: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${pdksRecords.checkInTime})) / 3600`,
      })
        .from(pdksRecords)
        .leftJoin(users, eq(pdksRecords.userId, users.id))
        .leftJoin(branches, eq(pdksRecords.branchId, branches.id))
        .where(and(
          isNull(pdksRecords.checkOutTime),
          inArray(pdksRecords.branchId, [5, 23]), // Işıklar + HQ
          lte(pdksRecords.checkInTime, threeDaysAgo), // 3+ gün açık
        ))
        .limit(50),

      // Açık fabrika vardıyaları
      db.select({
        id: factoryShiftSessions.id,
        userId: factoryShiftSessions.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        checkInTime: factoryShiftSessions.checkInTime,
        status: factoryShiftSessions.status,
        hoursOpen: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${factoryShiftSessions.checkInTime})) / 3600`,
      })
        .from(factoryShiftSessions)
        .leftJoin(users, eq(factoryShiftSessions.userId, users.id))
        .where(and(
          eq(factoryShiftSessions.status, 'active'),
          lte(factoryShiftSessions.checkInTime, threeDaysAgo),
        ))
        .limit(50),

      // Bu ay puantajı hesaplanmamış personeller
      db.select({
        userId: users.id,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        branchId: users.branchId,
        role: users.role,
      })
        .from(users)
        .leftJoin(monthlyPayroll, and(
          eq(monthlyPayroll.userId, users.id),
          eq(monthlyPayroll.year, today.getFullYear()),
          eq(monthlyPayroll.month, today.getMonth() + 1),
        ))
        .where(and(
          isNull(users.deletedAt),
          isNull(monthlyPayroll.id), // payroll kaydı yok
          inArray(users.branchId, MAHMUT_BRANCH_IDS),
        ))
        .limit(50),
    ]);

    // 3+ gün üst üste devamsız hesaplaması (PDKS verilerinden)
    const absentUsersQuery = await db.execute(sql`
      WITH user_last_attendance AS (
        SELECT DISTINCT ON (u.id)
          u.id AS user_id,
          u.first_name || ' ' || u.last_name AS user_name,
          u.branch_id,
          GREATEST(
            COALESCE(MAX(p.check_in_time), '1970-01-01'::timestamp),
            COALESCE(MAX(f.check_in_time), '1970-01-01'::timestamp)
          ) AS last_check_in
        FROM users u
        LEFT JOIN pdks_records p ON p.user_id = u.id
        LEFT JOIN factory_shift_sessions f ON f.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND u.branch_id = ANY(${MAHMUT_BRANCH_IDS})
        GROUP BY u.id, u.first_name, u.last_name, u.branch_id
      )
      SELECT 
        user_id,
        user_name,
        branch_id,
        last_check_in,
        EXTRACT(DAY FROM NOW() - last_check_in)::INTEGER AS days_absent
      FROM user_last_attendance
      WHERE last_check_in < NOW() - INTERVAL '${sql.raw(String(ABSENCE_THRESHOLD_DAYS))} days'
        AND last_check_in > '1970-01-01'::timestamp
      ORDER BY days_absent DESC
      LIMIT 50;
    `);

    res.json({
      openShifts: {
        branch: openShiftsBranch,
        factory: openShiftsFactory,
        total: openShiftsBranch.length + openShiftsFactory.length,
      },
      absentUsers: {
        threshold: ABSENCE_THRESHOLD_DAYS,
        list: absentUsersQuery.rows,
        total: absentUsersQuery.rows.length,
      },
      missingPayrolls: {
        period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        list: missingPayrolls,
        total: missingPayrolls.length,
      },
      summary: {
        totalAnomalies:
          openShiftsBranch.length +
          openShiftsFactory.length +
          (absentUsersQuery.rows.length || 0) +
          missingPayrolls.length,
      },
    });
  } catch (error: unknown) {
    console.error('IK Anormallikler hatası:', error);
    res.status(500).json({ message: 'Anormallikler alınamadı', error: String(error) });
  }
});

export default router;
