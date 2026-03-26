import { Router, Request, Response } from 'express';
import { db } from '../db';
import { pdksRecords, scheduledOffs, users, branchKioskSettings, branches } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { getMonthClassification } from '../lib/pdks-engine';

const router = Router();

const PDKS_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe', 'coach', 'mudur', 'supervisor'];

function canManagePdks(role: string): boolean {
  return ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(role);
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
    if (!canManagePdks(user.role) && user.role !== 'mudur' && user.role !== 'supervisor' && user.role !== 'coach') {
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

    if (!canManagePdks(user.role) && user.role !== 'mudur' && user.role !== 'supervisor' && user.role !== 'coach') {
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
    if (!canManagePdks(user.role) && user.role !== 'mudur') {
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
    if (!canManagePdks(user.role) && user.role !== 'mudur') {
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
    if (!canManagePdks(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const settings = await db.select({
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
    .innerJoin(branches, eq(branchKioskSettings.branchId, branches.id))
    .orderBy(branches.name);

    res.json(settings);
  } catch (error) {
    console.error("Kiosk settings get error:", error);
    res.status(500).json({ error: 'Ayarlar getirilemedi' });
  }
});

router.patch('/api/pdks/kiosk-settings/:branchId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canManagePdks(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const branchId = Number(req.params.branchId);
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

export default router;
