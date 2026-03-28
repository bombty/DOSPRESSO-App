import { Router, Request, Response } from 'express';
import { db } from '../db';
import { pdksRecords, scheduledOffs, users, branchKioskSettings, branches, shiftAttendance, shifts } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { getMonthClassification } from '../lib/pdks-engine';

const router = Router();

const PDKS_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe', 'coach', 'mudur', 'supervisor'];

function canManagePdks(role: string): boolean {
  return ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(role);
}

// Şube yöneticileri kendi şubelerinin kiosk ayarlarını görebilir/düzenleyebilir
function canManageKiosk(role: string): boolean {
  return canManagePdks(role) || ['mudur', 'supervisor'].includes(role);
}

router.post('/api/pdks/punch', isAuthenticated, async (req: any, res: Response) => {
  try {
    const reqUser = req.user;
    const { userId, branchId, type, source, deviceInfo } = req.body;
    if (!userId || !branchId || !type) {
      return res.status(400).json({ error: 'userId, branchId ve type gerekli' });
    }
    if (!['giris', 'cikis'].includes(type)) {
      return res.status(400).json({ error: 'type giris veya cikis olmalı' });
    }

    const isAdmin = canManagePdks(reqUser.role);
    const isSelf = reqUser.id === userId;
    const isSameBranch = reqUser.branchId === Number(branchId);
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Sadece kendi kaydınızı oluşturabilirsiniz' });
    }
    if (!isAdmin && !isSameBranch) {
      return res.status(403).json({ error: 'Sadece kendi şubeniz için kayıt oluşturabilirsiniz' });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const [record] = await db.insert(pdksRecords).values({
      userId,
      branchId: Number(branchId),
      recordDate: dateStr,
      recordTime: timeStr,
      recordType: type,
      source: source || 'kiosk',
      deviceInfo: deviceInfo || null,
      createdBy: reqUser.id,
    }).returning();

    res.json(record);
  } catch (error) {
    console.error("PDKS punch error:", error);
    res.status(500).json({ error: 'Kayıt oluşturulamadı' });
  }
});

router.post('/api/pdks/manual', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManagePdks(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const { userId, branchId, date, time, type, reason } = req.body;
    if (!userId || !branchId || !date || !time || !type) {
      return res.status(400).json({ error: 'Eksik alanlar' });
    }

    const [record] = await db.insert(pdksRecords).values({
      userId,
      branchId: Number(branchId),
      recordDate: date,
      recordTime: time,
      recordType: type,
      source: 'manuel',
      deviceInfo: reason || null,
      createdBy: user.id,
    }).returning();

    res.json(record);
  } catch (error) {
    console.error("PDKS manual entry error:", error);
    res.status(500).json({ error: 'Manuel kayıt oluşturulamadı' });
  }
});

router.get('/api/pdks/records', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { branchId, startDate, endDate } = req.query;

    if (!branchId || !startDate || !endDate) {
      return res.status(400).json({ error: 'branchId, startDate ve endDate gerekli' });
    }

    const bId = Number(branchId);
    if (!canManagePdks(user.role) && !['mudur', 'supervisor', 'coach'].includes(user.role)) {
      if (user.branchId !== bId) {
        return res.status(403).json({ error: 'Yetkisiz' });
      }
    }
    if (['mudur', 'supervisor', 'yatirimci_branch'].includes(user.role) && user.branchId !== bId) {
      return res.status(403).json({ error: 'Sadece kendi şubenizi görebilirsiniz' });
    }

    const records = await db.select({
      id: pdksRecords.id,
      userId: pdksRecords.userId,
      recordDate: pdksRecords.recordDate,
      recordTime: pdksRecords.recordTime,
      recordType: pdksRecords.recordType,
      source: pdksRecords.source,
      deviceInfo: pdksRecords.deviceInfo,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(pdksRecords)
    .innerJoin(users, eq(pdksRecords.userId, users.id))
    .where(and(
      eq(pdksRecords.branchId, bId),
      gte(pdksRecords.recordDate, startDate as string),
      lte(pdksRecords.recordDate, endDate as string)
    ))
    .orderBy(pdksRecords.recordDate, pdksRecords.recordTime);

    const result = records.map(r => ({
      ...r,
      userName: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Bilinmiyor',
    }));
    res.json(result);
  } catch (error) {
    console.error("PDKS records error:", error);
    res.status(500).json({ error: 'Kayıtlar getirilemedi' });
  }
});

router.get('/api/pdks/records/:userId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const targetUserId = req.params.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'month ve year gerekli' });
    }

    if (!canManagePdks(user.role) && !['mudur', 'supervisor', 'coach'].includes(user.role)) {
      if (user.id !== targetUserId) {
        return res.status(403).json({ error: 'Sadece kendi kayıtlarınızı görebilirsiniz' });
      }
    }

    if (['mudur', 'supervisor', 'coach'].includes(user.role) && user.id !== targetUserId) {
      const [targetUser] = await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, targetUserId)).limit(1);
      if (!targetUser || targetUser.branchId !== user.branchId) {
        return res.status(403).json({ error: 'Sadece kendi şubenizdeki personeli görebilirsiniz' });
      }
    }

    const classification = await getMonthClassification(targetUserId, Number(year), Number(month));
    res.json(classification);
  } catch (error) {
    console.error("PDKS user records error:", error);
    res.status(500).json({ error: 'Kullanıcı kayıtları getirilemedi' });
  }
});

router.get('/api/pdks/daily-summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { branchId, date } = req.query;
    if (!branchId || !date) {
      return res.status(400).json({ error: 'branchId ve date gerekli' });
    }

    if (!canManagePdks(user.role) && !['mudur', 'supervisor', 'coach'].includes(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }
    if (['mudur', 'supervisor', 'coach'].includes(user.role) && user.branchId !== Number(branchId)) {
      return res.status(403).json({ error: 'Sadece kendi şubenizi görebilirsiniz' });
    }

    const records = await db.select({
      userId: pdksRecords.userId,
      recordTime: pdksRecords.recordTime,
      recordType: pdksRecords.recordType,
      source: pdksRecords.source,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(pdksRecords)
    .innerJoin(users, eq(pdksRecords.userId, users.id))
    .where(and(
      eq(pdksRecords.branchId, Number(branchId)),
      eq(pdksRecords.recordDate, date as string)
    ))
    .orderBy(pdksRecords.recordTime);

    const grouped: Record<string, { name: string; records: { time: string; type: string }[] }> = {};
    for (const r of records) {
      const userName = [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Bilinmiyor';
      if (!grouped[r.userId]) {
        grouped[r.userId] = { name: userName, records: [] };
      }
      grouped[r.userId].records.push({ time: r.recordTime, type: r.recordType });
    }

    res.json(grouped);
  } catch (error) {
    console.error("PDKS daily summary error:", error);
    res.status(500).json({ error: 'Günlük özet getirilemedi' });
  }
});

router.post('/api/pdks/scheduled-offs', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManagePdks(user.role) && !['mudur', 'supervisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const { offs } = req.body;
    if (!Array.isArray(offs) || offs.length === 0) {
      return res.status(400).json({ error: 'offs dizisi gerekli' });
    }

    const inserted = [];
    for (const off of offs) {
      try {
        const [record] = await db.insert(scheduledOffs).values({
          userId: off.userId,
          branchId: off.branchId ? Number(off.branchId) : null,
          offDate: off.offDate,
          offType: off.offType || 'program_off',
        }).returning();
        inserted.push(record);
      } catch (e) {
        if (e.code === '23505') continue;
        throw e;
      }
    }

    res.json({ inserted: inserted.length });
  } catch (error) {
    console.error("Scheduled offs error:", error);
    res.status(500).json({ error: 'Off günleri oluşturulamadı' });
  }
});

router.get('/api/pdks/scheduled-offs', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { userId, month, year } = req.query;
    if (!userId || !month || !year) {
      return res.status(400).json({ error: 'userId, month ve year gerekli' });
    }

    if (!canManagePdks(user.role) && !['mudur', 'supervisor', 'coach'].includes(user.role)) {
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Sadece kendi off günlerinizi görebilirsiniz' });
      }
    }
    if (['mudur', 'supervisor', 'coach'].includes(user.role) && user.id !== userId) {
      const [targetUser] = await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, userId as string)).limit(1);
      if (!targetUser || targetUser.branchId !== user.branchId) {
        return res.status(403).json({ error: 'Sadece kendi şubenizdeki personeli görebilirsiniz' });
      }
    }

    const m = Number(month);
    const y = Number(year);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const offs = await db.select()
      .from(scheduledOffs)
      .where(and(
        eq(scheduledOffs.userId, userId as string),
        gte(scheduledOffs.offDate, startDate),
        lte(scheduledOffs.offDate, endDate)
      ));

    res.json(offs);
  } catch (error) {
    console.error("Scheduled offs get error:", error);
    res.status(500).json({ error: 'Off günleri getirilemedi' });
  }
});

router.delete('/api/pdks/scheduled-offs/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManagePdks(user.role) && !['mudur', 'supervisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const id = Number(req.params.id);
    await db.delete(scheduledOffs).where(eq(scheduledOffs.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Scheduled off delete error:", error);
    res.status(500).json({ error: 'Off günü silinemedi' });
  }
});

router.get('/api/pdks/kiosk-settings', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManageKiosk(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const conditions = [];
    // Branch-scoped: supervisor/mudur only see their branch
    if (!canManagePdks(user.role) && user.branchId) {
      conditions.push(eq(branchKioskSettings.branchId, user.branchId));
    }

    let query = db.select({
      id: branchKioskSettings.id,
      branchId: branchKioskSettings.branchId,
      branchName: branches.name,
      defaultShiftStartTime: branchKioskSettings.defaultShiftStartTime,
      defaultShiftEndTime: branchKioskSettings.defaultShiftEndTime,
      lateToleranceMinutes: branchKioskSettings.lateToleranceMinutes,
      earlyLeaveToleranceMinutes: branchKioskSettings.earlyLeaveToleranceMinutes,
      defaultBreakMinutes: branchKioskSettings.defaultBreakMinutes,
      autoCloseTime: branchKioskSettings.autoCloseTime,
      isKioskEnabled: branchKioskSettings.isKioskEnabled,
    })
    .from(branchKioskSettings)
    .innerJoin(branches, eq(branchKioskSettings.branchId, branches.id));

    // Branch-scoped for supervisor/mudur
    if (!canManagePdks(user.role) && user.branchId) {
      query = query.where(eq(branchKioskSettings.branchId, user.branchId)) as any;
    }

    const settings = await query.orderBy(branches.name);

    res.json(settings);
  } catch (error) {
    console.error("Kiosk settings get error:", error);
    res.status(500).json({ error: 'Ayarlar getirilemedi' });
  }
});

router.patch('/api/pdks/kiosk-settings/:branchId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManageKiosk(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const branchId = Number(req.params.branchId);
    
    // Branch-scoped: supervisor/mudur can only change their own branch
    if (!canManagePdks(user.role) && user.branchId !== branchId) {
      return res.status(403).json({ error: 'Sadece kendi şubenizin ayarlarını değiştirebilirsiniz' });
    }
    const { defaultShiftStartTime, defaultShiftEndTime, lateToleranceMinutes, earlyLeaveToleranceMinutes, defaultBreakMinutes, autoCloseTime } = req.body;

    type SettingsUpdate = Partial<Pick<typeof branchKioskSettings.$inferSelect,
      'defaultShiftStartTime' | 'defaultShiftEndTime' | 'lateToleranceMinutes' |
      'earlyLeaveToleranceMinutes' | 'defaultBreakMinutes' | 'autoCloseTime' | 'updatedAt'
    >>;

    const updateData: SettingsUpdate = { updatedAt: new Date() };
    if (defaultShiftStartTime !== undefined) updateData.defaultShiftStartTime = String(defaultShiftStartTime);
    if (defaultShiftEndTime !== undefined) updateData.defaultShiftEndTime = String(defaultShiftEndTime);
    if (lateToleranceMinutes !== undefined) updateData.lateToleranceMinutes = Number(lateToleranceMinutes);
    if (earlyLeaveToleranceMinutes !== undefined) updateData.earlyLeaveToleranceMinutes = Number(earlyLeaveToleranceMinutes);
    if (defaultBreakMinutes !== undefined) updateData.defaultBreakMinutes = Number(defaultBreakMinutes);
    if (autoCloseTime !== undefined) updateData.autoCloseTime = String(autoCloseTime);

    await db.update(branchKioskSettings)
      .set(updateData)
      .where(eq(branchKioskSettings.branchId, branchId));

    const [updated] = await db.select().from(branchKioskSettings).where(eq(branchKioskSettings.branchId, branchId));
    res.json(updated);
  } catch (error) {
    console.error("Kiosk settings update error:", error);
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

router.get('/api/pdks/branch-summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { branchId, month, year } = req.query;
    if (!branchId || !month || !year) {
      return res.status(400).json({ error: 'branchId, month ve year gerekli' });
    }

    const allowedRoles = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe', 'coach', 'mudur', 'supervisor', 'yatirimci_branch', 'yatirimci_hq'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const bId = Number(branchId);
    if (['mudur', 'supervisor', 'yatirimci_branch'].includes(user.role) && user.branchId !== bId) {
      return res.status(403).json({ error: 'Sadece kendi şubenizi görebilirsiniz' });
    }

    const branchUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
      .from(users)
      .where(and(
        eq(users.branchId, bId),
        sql`${users.role} IN ('stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'mudur')`
      ));

    const summaries = [];
    for (const u of branchUsers) {
      const classification = await getMonthClassification(u.id, Number(year), Number(month));
      summaries.push({
        userId: u.id,
        userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Bilinmiyor',
        role: u.role,
        workedDays: classification.workedDays,
        offDays: classification.offDays,
        absentDays: classification.absentDays,
        unpaidLeaveDays: classification.unpaidLeaveDays,
        sickLeaveDays: classification.sickLeaveDays,
        overtimeMinutes: classification.totalOvertimeMinutes,
      });
    }

    res.json(summaries);
  } catch (error) {
    console.error("Branch summary error:", error);
    res.status(500).json({ error: 'Şube özeti getirilemedi' });
  }
});

router.get('/api/pdks/dashboard-summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!PDKS_ROLES.includes(user.role) && !['yatirimci_branch', 'yatirimci_hq'].includes(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const globalRoles = ['admin', 'ceo', 'cgo', 'coach', 'muhasebe_ik', 'muhasebe'];
    const branchLimitedRoles = ['supervisor', 'mudur', 'yatirimci_branch'];

    let effectiveScope: string;
    let effectiveBranchId: number;

    if (globalRoles.includes(user.role) || user.role === 'yatirimci_hq') {
      effectiveScope = (req.query.scope as string) || 'all';
    } else if (branchLimitedRoles.includes(user.role)) {
      effectiveScope = 'branch';
      effectiveBranchId = user.branchId;
    } else {
      effectiveScope = 'branch';
      effectiveBranchId = user.branchId;
    }

    if (effectiveScope === 'branch') {
      effectiveBranchId = effectiveBranchId! || (req.query.branchId ? parseInt(req.query.branchId as string) : user.branchId);
      if (!globalRoles.includes(user.role) && effectiveBranchId !== user.branchId) {
        return res.status(403).json({ error: 'Sadece kendi şubenizin verilerine erişebilirsiniz' });
      }
    }

    // Parameterized branch filter (sql injection koruması)
    const branchIds: number[] = [];
    let branchMode: 'hq' | 'all' | 'single' = 'all';
    if (effectiveScope === 'hq') {
      branchIds.push(5, 23, 24);
      branchMode = 'hq';
    } else if (effectiveScope === 'all') {
      branchMode = 'all'; // excludes 23, 24
    } else {
      branchIds.push(parseInt(String(effectiveBranchId!)) || 0);
      branchMode = 'single';
    }

    const branchCondition = branchMode === 'hq'
      ? sql`AND b.id IN (5, 23, 24)`
      : branchMode === 'single'
        ? sql`AND b.id = ${branchIds[0]}`
        : sql`AND b.id NOT IN (23, 24)`;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const staffRes = await db.execute(sql`
      SELECT count(DISTINCT u.id) as total_staff
      FROM users u JOIN branches b ON b.id = u.branch_id
      WHERE u.is_active = true AND b.is_active = true ${branchCondition}
    `);
    const totalStaff = Number((staffRes.rows as any[])?.[0]?.total_staff || 0);

    const presentRes = await db.execute(sql`
      SELECT count(DISTINCT pr.user_id) as present
      FROM pdks_records pr JOIN branches b ON b.id = pr.branch_id
      WHERE pr.record_date = ${today} AND pr.record_type = 'giris'
      AND b.is_active = true ${branchCondition}
    `);
    const todayPresent = Number((presentRes.rows as any[])?.[0]?.present || 0);

    const monthRes = await db.execute(sql`
      SELECT pr.record_type, count(*) as cnt
      FROM pdks_records pr JOIN branches b ON b.id = pr.branch_id
      WHERE pr.record_date >= ${monthStart} AND b.is_active = true ${branchCondition}
      GROUP BY pr.record_type
    `);
    const monthRows = monthRes.rows as any[];
    const monthEntries = monthRows.find((r: any) => r.record_type === 'giris');
    const monthExits = monthRows.find((r: any) => r.record_type === 'cikis');

    const lateRes = await db.execute(sql`
      SELECT count(*) as cnt, coalesce(sum(sa.lateness_minutes), 0) as total_min
      FROM shift_attendance sa
      JOIN shifts s ON s.id = sa.shift_id
      JOIN branches b ON b.id = s.branch_id
      WHERE sa.lateness_minutes > 0
      AND s.shift_date >= ${monthStart}
      AND b.is_active = true ${branchCondition}
    `);
    const lateCount = Number((lateRes.rows as any[])?.[0]?.cnt || 0);
    const totalLateMinutes = Number((lateRes.rows as any[])?.[0]?.total_min || 0);

    const offRes = await db.execute(sql`
      SELECT count(*) as cnt
      FROM scheduled_offs so
      JOIN users u ON u.id = so.user_id
      JOIN branches b ON b.id = u.branch_id
      WHERE so.off_date >= ${monthStart} AND so.off_date <= ${today}
      AND b.is_active = true ${branchCondition}
    `);
    const scheduledOffCount = Number((offRes.rows as any[])?.[0]?.cnt || 0);

    const weeklyRes = await db.execute(sql`
      SELECT bwa.branch_id,
        coalesce(sum(bwa.planned_total_minutes), 0) as planned,
        coalesce(sum(bwa.actual_total_minutes), 0) as actual,
        coalesce(avg(bwa.weekly_compliance_score), 0) as avg_score
      FROM branch_weekly_attendance_summary bwa
      JOIN branches b ON b.id = bwa.branch_id
      WHERE b.is_active = true ${branchCondition}
      GROUP BY bwa.branch_id
      ORDER BY bwa.branch_id
    `);
    const weeklyRows = weeklyRes.rows as any[];

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthNum = lastMonth.getMonth() + 1;
    const lastMonthYear = lastMonth.getFullYear();
    const payrollRes = await db.execute(sql`
      SELECT count(*) as cnt
      FROM monthly_payroll mp
      JOIN branches b ON b.id = mp.branch_id
      WHERE mp.month = ${lastMonthNum} AND mp.year = ${lastMonthYear}
      AND b.is_active = true ${branchCondition}
    `);
    const payrollCount = Number((payrollRes.rows as any[])?.[0]?.cnt || 0);

    let branchBreakdown: any[] = [];
    if (effectiveScope === 'all' || effectiveScope === 'hq') {
      const branchRes = await db.execute(sql`
        SELECT b.id as branch_id, b.name,
          (SELECT count(DISTINCT u.id) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff,
          (SELECT count(DISTINCT pr.user_id) FROM pdks_records pr WHERE pr.branch_id = b.id AND pr.record_date = ${today} AND pr.record_type = 'giris') as present,
          (SELECT count(*) FROM shift_attendance sa JOIN shifts s ON s.id = sa.shift_id WHERE s.branch_id = b.id AND s.shift_date >= ${monthStart} AND sa.lateness_minutes > 0) as late_count
        FROM branches b WHERE b.is_active = true ${branchCondition}
        ORDER BY b.name
      `);
      branchBreakdown = (branchRes.rows as any[]).map((r: any) => ({
        branchId: r.branch_id,
        name: r.name,
        staffCount: Number(r.staff || 0),
        todayPresent: Number(r.present || 0),
        monthLateCount: Number(r.late_count || 0),
      }));
    }

    res.json({
      scope: effectiveScope,
      today: { present: todayPresent, totalStaff },
      thisMonth: {
        totalEntries: Number(monthEntries?.cnt || 0),
        totalExits: Number(monthExits?.cnt || 0),
        lateArrivals: lateCount,
        totalLateMinutes,
        scheduledOffs: scheduledOffCount,
      },
      weeklyCompliance: weeklyRows.map((w: any) => ({
        branchId: w.branch_id,
        plannedMinutes: Number(w.planned || 0),
        actualMinutes: Number(w.actual || 0),
        complianceScore: Math.round(Number(w.avg_score || 0)),
      })),
      payroll: { lastMonthCalculated: payrollCount },
      branchBreakdown,
    });
  } catch (error) {
    console.error("PDKS dashboard-summary error:", error);
    res.status(500).json({ error: 'PDKS özet verisi alınamadı' });
  }
});

router.get('/api/pdks/branch-attendance', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const branchId = parseInt(req.query.branchId as string);
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!branchId || !month || !year) {
      return res.status(400).json({ error: 'branchId, month, year gerekli' });
    }

    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Geçersiz ay/yıl değeri' });
    }

    const globalRoles = ['admin', 'ceo', 'cgo', 'coach', 'muhasebe_ik', 'muhasebe'];
    if (!globalRoles.includes(user.role) && user.branchId !== branchId) {
      return res.status(403).json({ error: 'Bu şubenin verilerine erişim yetkiniz yok' });
    }

    const branchUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(and(
      eq(users.branchId, branchId),
      eq(users.isActive, true),
    ));

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxDay = (year === currentYear && month === currentMonth) ? currentDay : daysInMonth;

    const staffResults = [];
    for (const person of branchUsers) {
      const classification = await getMonthClassification(person.id, year, month);

      const relevantDays = classification.days.filter(d => {
        const dayNum = parseInt(d.date.split('-')[2]);
        return dayNum <= maxDay;
      });

      const workedDays = relevantDays.filter(d => d.status === 'worked').length;
      const offDays = relevantDays.filter(d => ['program_off', 'kapanish_off'].includes(d.status)).length;
      const absentDays = relevantDays.filter(d => d.status === 'absent').length;
      const overtimeMinutes = relevantDays.reduce((sum, d) => sum + d.overtimeMinutes, 0);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const lateRes2 = await db.select({
        cnt: sql<number>`count(*)`,
        totalMin: sql<number>`coalesce(sum(${shiftAttendance.latenessMinutes}), 0)`,
      })
      .from(shiftAttendance)
      .innerJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
      .where(and(
        eq(shiftAttendance.userId, person.id),
        sql`${shiftAttendance.latenessMinutes} > 0`,
        sql`${shifts.shiftDate} >= ${startDate}`,
        sql`${shifts.shiftDate} <= ${endDate}`,
      ));
      const lateRow = lateRes2[0];

      staffResults.push({
        userId: person.id,
        name: [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Bilinmiyor',
        role: person.role,
        workedDays,
        offDays,
        absentDays,
        lateArrivals: Number(lateRow?.cnt || 0),
        totalLateMinutes: Number(lateRow?.total_min || 0),
        overtimeMinutes,
      });
    }

    res.json({
      branchId,
      month,
      year,
      staffCount: branchUsers.length,
      summary: {
        totalWorkedDays: staffResults.reduce((s, r) => s + r.workedDays, 0),
        totalAbsentDays: staffResults.reduce((s, r) => s + r.absentDays, 0),
        totalLateArrivals: staffResults.reduce((s, r) => s + r.lateArrivals, 0),
        totalOvertimeMinutes: staffResults.reduce((s, r) => s + r.overtimeMinutes, 0),
      },
      staff: staffResults,
    });
  } catch (error) {
    console.error("PDKS branch-attendance error:", error);
    res.status(500).json({ error: 'Şube puantaj verisi alınamadı' });
  }
});

export default router;
