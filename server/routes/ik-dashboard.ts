// ═══════════════════════════════════════════════════════════════════
// Sprint 3 / TASK-#346 (5 May 2026): Mahmut Bey — Muhasebe/İK Kontrol Merkezi
// ═══════════════════════════════════════════════════════════════════
// pdksRecords schema: recordDate (DATE), recordTime (TIME), recordType ('giris'|'cikis')
// checkInTime / checkOutTime / totalMinutes kolonları YOK.
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

const IK_DASHBOARD_ROLES = ['admin', 'ceo', 'muhasebe', 'muhasebe_ik', 'ik'];
const MAHMUT_BRANCH_IDS = [5, 23, 24]; // Işıklar, HQ, Fabrika

function checkIkAccess(userRole: string | undefined): boolean {
  return !!userRole && IK_DASHBOARD_ROLES.includes(userRole);
}

// ═══════════════════════════════════════════════════════════════════
// 1) GET /api/ik/gunluk-ozet
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/gunluk-ozet', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // '2026-05-05'

    const [branchData, factoryData, hqData, totalUsers] = await Promise.all([
      // Işıklar #5 — bugünkü kayıtlar (giris + cikis ayrı satır)
      db.select({
        userId: pdksRecords.userId,
        recordType: pdksRecords.recordType,
      })
        .from(pdksRecords)
        .where(and(
          eq(pdksRecords.recordDate, todayStr),
          inArray(pdksRecords.branchId, [5])
        )),

      // Fabrika #24 — aktif vardıyalar
      db.select({
        userId: factoryShiftSessions.userId,
        checkInTime: factoryShiftSessions.checkInTime,
        checkOutTime: factoryShiftSessions.checkOutTime,
        status: factoryShiftSessions.status,
      })
        .from(factoryShiftSessions)
        .where(and(
          gte(factoryShiftSessions.checkInTime, today),
        )),

      // HQ #23 — bugünkü kayıtlar
      db.select({
        userId: pdksRecords.userId,
        recordType: pdksRecords.recordType,
      })
        .from(pdksRecords)
        .where(and(
          eq(pdksRecords.recordDate, todayStr),
          eq(pdksRecords.branchId, 23)
        )),

      // Toplam aktif personel sayısı
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

    // Işıklar: giris yapanlar, hâlâ içeride olanlar (giris var ama cikis yok)
    const isikGirisSet = new Set(branchData.filter(r => r.recordType === 'giris').map(r => r.userId));
    const isikCikisSet = new Set(branchData.filter(r => r.recordType === 'cikis').map(r => r.userId));
    const isikCurrently = [...isikGirisSet].filter(u => !isikCikisSet.has(u)).length;

    // HQ: aynı mantık
    const hqGirisSet = new Set(hqData.filter(r => r.recordType === 'giris').map(r => r.userId));
    const hqCikisSet = new Set(hqData.filter(r => r.recordType === 'cikis').map(r => r.userId));
    const hqCurrently = [...hqGirisSet].filter(u => !hqCikisSet.has(u)).length;

    const locations = [
      {
        id: 5,
        name: 'Işıklar (HQ-Owned)',
        type: 'branch',
        totalEmployees: totalUsers.find(u => u.branchId === 5)?.total ?? 0,
        checkedInToday: isikGirisSet.size,
        currentlyWorking: isikCurrently,
        notCheckedIn: 0,
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
        checkedInToday: hqGirisSet.size,
        currentlyWorking: hqCurrently,
        notCheckedIn: 0,
      },
    ].map(loc => ({
      ...loc,
      notCheckedIn: (loc.totalEmployees as number) - loc.checkedInToday,
      attendanceRate: (loc.totalEmployees as number) > 0
        ? Math.round((loc.checkedInToday / (loc.totalEmployees as number)) * 100)
        : 0,
    }));

    res.json({
      date: todayStr,
      locations,
      summary: {
        totalEmployees: locations.reduce((sum, l) => sum + (l.totalEmployees as number), 0),
        totalCheckedIn: locations.reduce((sum, l) => sum + l.checkedInToday, 0),
        totalCurrentlyWorking: locations.reduce((sum, l) => sum + l.currentlyWorking, 0),
        totalNotCheckedIn: locations.reduce((sum, l) => sum + (l.notCheckedIn as number), 0),
      },
    });
  } catch (error: unknown) {
    console.error('IK Günlük özet hatası:', error);
    res.status(500).json({ message: 'Günlük özet alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) GET /api/ik/bekleyen-islemler
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/bekleyen-islemler', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const [pendingOvertimes, pendingLeaves, draftPayrolls] = await Promise.all([
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
// ═══════════════════════════════════════════════════════════════════
router.get('/api/ik/anormallikler', isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!checkIkAccess(req.user?.role)) {
      return res.status(403).json({ message: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const ABSENCE_THRESHOLD_DAYS = 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - ABSENCE_THRESHOLD_DAYS);

    // Açık fabrika vardıyaları (24+ saat)
    const openShiftsFactory = await db.select({
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
      .limit(50);

    // Bu ay puantajı hesaplanmamış personeller
    const missingPayrolls = await db.select({
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
        isNull(monthlyPayroll.id),
        inArray(users.branchId, MAHMUT_BRANCH_IDS),
      ))
      .limit(50);

    // Açık şube kayıtları: giris var ama cikis yok, 3+ gün önce (raw SQL — no Drizzle interpolation)
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    const openShiftsBranchRaw = await db.execute(sql.raw(`
      SELECT DISTINCT ON (p.user_id)
        p.user_id AS "userId",
        u.first_name || ' ' || u.last_name AS "userName",
        p.branch_id AS "branchId",
        b.name AS "branchName",
        p.record_date AS "recordDate",
        EXTRACT(DAY FROM NOW() - p.record_date::timestamp)::INTEGER AS "daysOpen"
      FROM pdks_records p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN branches b ON b.id = p.branch_id
      WHERE p.record_type = 'giris'
        AND p.branch_id IN (5, 23)
        AND p.record_date <= '${threeDaysAgoStr}'
        AND NOT EXISTS (
          SELECT 1 FROM pdks_records p2
          WHERE p2.user_id = p.user_id
            AND p2.record_date = p.record_date
            AND p2.record_type = 'cikis'
        )
      ORDER BY p.user_id, p.record_date DESC
      LIMIT 50
    `));

    // 3+ gün devamsız personeller (raw SQL — no Drizzle interpolation)
    const absentUsersQuery = await db.execute(sql.raw(`
      WITH user_last_attendance AS (
        SELECT
          u.id AS user_id,
          u.first_name || ' ' || u.last_name AS user_name,
          u.branch_id,
          GREATEST(
            COALESCE(MAX(p.record_date::timestamp), '1970-01-01'::timestamp),
            COALESCE(MAX(f.check_in_time), '1970-01-01'::timestamp)
          ) AS last_check_in
        FROM users u
        LEFT JOIN pdks_records p ON p.user_id = u.id
        LEFT JOIN factory_shift_sessions f ON f.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND u.branch_id IN (5, 23, 24)
        GROUP BY u.id, u.first_name, u.last_name, u.branch_id
      )
      SELECT
        user_id,
        user_name,
        branch_id,
        last_check_in,
        EXTRACT(DAY FROM NOW() - last_check_in)::INTEGER AS days_absent
      FROM user_last_attendance
      WHERE last_check_in < NOW() - INTERVAL '3 days'
        AND last_check_in > '1970-01-01'::timestamp
      ORDER BY days_absent DESC
      LIMIT 50
    `));

    res.json({
      openShifts: {
        branch: openShiftsBranchRaw.rows,
        factory: openShiftsFactory,
        total: openShiftsBranchRaw.rows.length + openShiftsFactory.length,
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
          openShiftsBranchRaw.rows.length +
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
