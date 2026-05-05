// ═══════════════════════════════════════════════════════════════════
// Sprint 6 / Bölüm 3 (5 May 2026): Personnel Attendance Detail
// ═══════════════════════════════════════════════════════════════════
// Mahmut Bey'in talebi: 'Personele tıklayınca tarih aralığı seçtiğinde
// o tarih aralığındaki uygunsuzluklar, mesailer vs görebilmeli'
// 
// Yetki: muhasebe_ik tüm şubelerin personelini GÖRÜR (viewOnly)
//        Yazma: managed_branches kontrolü ile
// 
// Kullanım: GET /api/personnel/:userId/attendance-detail?startDate=&endDate=
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import {
  users,
  branches,
  pdksRecords,
  factoryShiftSessions,
  leaveRequests,
  overtimeRequests,
  shifts as shiftsTable,
} from '@shared/schema';
import { and, eq, gte, lte, isNull, sql, desc, or } from 'drizzle-orm';

const router = Router();

// HQ rolleri başkasının PDKS detayını görebilir
const HQ_VIEW_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'muhasebe', 'muhasebe_ik', 'satinalma'];
// Yöneticiler kendi şubelerinin personelini görebilir
const SUPERVISOR_ROLES = ['supervisor', 'supervisor_buddy', 'mudur'];

router.get('/api/personnel/:userId/attendance-detail', isAuthenticated, async (req: any, res: Response) => {
  try {
    const requestingUser = req.user;
    const targetUserId = req.params.userId;
    const startDate = (req.query.startDate as string) || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];

    // Yetki kontrolü
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ message: 'Personel bulunamadı' });
    }

    const isOwnData = requestingUser.id === targetUserId;
    const isHQRole = HQ_VIEW_ROLES.includes(requestingUser.role);
    const isSupervisor = SUPERVISOR_ROLES.includes(requestingUser.role) && 
                         targetUser.branchId === requestingUser.branchId;

    if (!isOwnData && !isHQRole && !isSupervisor) {
      return res.status(403).json({ message: 'Bu personelin verisini görme yetkiniz yok' });
    }

    // ═════════════════════════════════════════════════
    // 1) PDKS Kayıtları (şube giriş-çıkış)
    // ═════════════════════════════════════════════════
    const branchRecords = await db.select({
      id: pdksRecords.id,
      recordDate: pdksRecords.recordDate,
      recordTime: pdksRecords.recordTime,
      recordType: pdksRecords.recordType,
      branchId: pdksRecords.branchId,
    })
      .from(pdksRecords)
      .where(and(
        eq(pdksRecords.userId, targetUserId),
        gte(pdksRecords.recordDate, startDate),
        lte(pdksRecords.recordDate, endDate),
      ))
      .orderBy(desc(pdksRecords.recordDate));

    // ═════════════════════════════════════════════════
    // 2) Fabrika Vardıyaları (eğer fabrika personeli ise)
    // ═════════════════════════════════════════════════
    const factorySessions = await db.select({
      id: factoryShiftSessions.id,
      checkInTime: factoryShiftSessions.checkInTime,
      checkOutTime: factoryShiftSessions.checkOutTime,
      workMinutes: factoryShiftSessions.workMinutes,
      status: factoryShiftSessions.status,
    })
      .from(factoryShiftSessions)
      .where(and(
        eq(factoryShiftSessions.userId, targetUserId),
        gte(factoryShiftSessions.checkInTime, new Date(startDate)),
        lte(factoryShiftSessions.checkInTime, new Date(endDate + 'T23:59:59')),
      ))
      .orderBy(desc(factoryShiftSessions.checkInTime));

    // ═════════════════════════════════════════════════
    // 3) Vardiya Atamaları (planlanmış vardıyalar)
    // ═════════════════════════════════════════════════
    const shifts = await db.select({
      id: shiftsTable.id,
      shiftDate: shiftsTable.shiftDate,
      shiftStart: shiftsTable.startTime,
      shiftEnd: shiftsTable.endTime,
      shiftType: shiftsTable.shiftType,
      status: shiftsTable.status,
    })
      .from(shiftsTable)
      .where(and(
        eq(shiftsTable.assignedToId, targetUserId),
        gte(shiftsTable.shiftDate, startDate),
        lte(shiftsTable.shiftDate, endDate),
        isNull(shiftsTable.deletedAt),
      ))
      .orderBy(desc(shiftsTable.shiftDate))
<<<<<<< HEAD
      .catch(() => []);
=======
      .catch(() => []); // shifts tablosu sorunu olursa boş dön
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58

    // ═════════════════════════════════════════════════
    // 4) İzin Talepleri (bu tarih aralığında)
    // ═════════════════════════════════════════════════
    const leaves = await db.select({
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
        eq(leaveRequests.userId, targetUserId),
        or(
          and(gte(leaveRequests.startDate, startDate), lte(leaveRequests.startDate, endDate)),
          and(gte(leaveRequests.endDate, startDate), lte(leaveRequests.endDate, endDate)),
        ),
      ))
      .orderBy(desc(leaveRequests.startDate));

    // ═════════════════════════════════════════════════
    // 5) Mesai Talepleri (onaylı + bekleyen)
    // ═════════════════════════════════════════════════
    const overtimes = await db.select()
      .from(overtimeRequests)
      .where(and(
        eq(overtimeRequests.userId, targetUserId),
        gte(overtimeRequests.overtimeDate, startDate),
        lte(overtimeRequests.overtimeDate, endDate),
      ))
      .orderBy(desc(overtimeRequests.overtimeDate));

    // ═════════════════════════════════════════════════
    // GÜNLÜK MAP — tarih bazlı birleştirme
    // ═════════════════════════════════════════════════
    const dailyMap = new Map<string, {
      date: string;
      giris?: string;
      cikis?: string;
      minutes: number;
      source: string;
      branchId?: number;
      // Plan vs Gerçek
      plannedShift?: { start: string; end: string; type: string };
      // Olaylar
      onLeave?: { type: string; status: string };
      overtimeApproved?: number; // dakika
      overtimePending?: number;
      // Anomali tespit
      anomaly?: string; // 'no_check_in' | 'no_check_out' | 'late_arrival' | 'early_leave' | 'no_show' | null
    }>();

    // PDKS şube kayıtları
    for (const r of branchRecords) {
      const dateKey = r.recordDate as string;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, minutes: 0, source: 'branch', branchId: r.branchId ?? undefined });
      }
      const entry = dailyMap.get(dateKey)!;
      if (r.recordType === 'giris' && !entry.giris) {
        entry.giris = r.recordTime as string | undefined;
      } else if (r.recordType === 'cikis' && !entry.cikis) {
        entry.cikis = r.recordTime as string | undefined;
      }
    }

    // Dakika hesapla
    for (const [, entry] of dailyMap) {
      if (entry.giris && entry.cikis) {
        const [gh, gm] = entry.giris.split(':').map(Number);
        const [ch, cm] = entry.cikis.split(':').map(Number);
        entry.minutes = Math.max(0, (ch * 60 + cm) - (gh * 60 + gm));
      }
    }

    // Fabrika kayıtları ekle
    for (const f of factorySessions) {
      if (!f.checkInTime) continue;
      const dateKey = new Date(f.checkInTime).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          giris: f.checkInTime ? new Date(f.checkInTime).toTimeString().slice(0, 5) : undefined,
          cikis: f.checkOutTime ? new Date(f.checkOutTime).toTimeString().slice(0, 5) : undefined,
          minutes: f.workMinutes || 0,
          source: 'factory',
        });
      }
    }

    // Planlanmış vardıyaları ekle
    for (const s of shifts) {
      const dateKey = s.shiftDate as string;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, minutes: 0, source: 'planned' });
      }
      const entry = dailyMap.get(dateKey)!;
      entry.plannedShift = {
        start: s.shiftStart as string,
        end: s.shiftEnd as string,
        type: s.shiftType as string,
      };
    }

    // İzin günlerini işaretle
    for (const l of leaves) {
      const start = new Date(l.startDate as string);
      const end = new Date(l.endDate as string);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { date: dateKey, minutes: 0, source: 'leave' });
        }
        dailyMap.get(dateKey)!.onLeave = { type: l.leaveType as string, status: l.status as string };
      }
    }

    // Mesai dakikalarını günlere ekle
    for (const o of overtimes) {
      const dateKey = o.overtimeDate as string;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, minutes: 0, source: 'overtime_only' });
      }
      const entry = dailyMap.get(dateKey)!;
      if (o.status === 'approved') {
        entry.overtimeApproved = (entry.overtimeApproved || 0) + (o.approvedMinutes || 0);
      } else if (o.status === 'pending') {
        entry.overtimePending = (entry.overtimePending || 0) + (o.requestedMinutes || 0);
      }
    }

    // ANOMALI TESPİT
    for (const [, entry] of dailyMap) {
      // Tatil gününde çalışmış (Pazar) — düşük öncelik için skip
      if (entry.onLeave && entry.onLeave.status === 'approved') {
        // İzinli — anormal değil
        continue;
      }
      
      if (entry.plannedShift && !entry.giris && !entry.onLeave) {
        entry.anomaly = 'no_show'; // Plan var ama gelmemiş, izin yok
      } else if (entry.giris && !entry.cikis) {
        entry.anomaly = 'no_check_out'; // Çıkış unutulmuş
      } else if (!entry.giris && entry.cikis) {
        entry.anomaly = 'no_check_in'; // Giriş yapılmamış
      } else if (entry.plannedShift && entry.giris) {
        // Geç kalma kontrolü (15 dk threshold)
        const [ph, pm] = entry.plannedShift.start.split(':').map(Number);
        const [gh, gm] = entry.giris.split(':').map(Number);
        const lateMinutes = (gh * 60 + gm) - (ph * 60 + pm);
        if (lateMinutes > 15) {
          entry.anomaly = `late_${lateMinutes}min`;
        }
      }
    }

    const dailyArray = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // ═════════════════════════════════════════════════
    // ÖZET HESAPLA
    // ═════════════════════════════════════════════════
    const totalMinutes = dailyArray.reduce((sum, d) => sum + (d.minutes || 0), 0);
    const totalOvertimeApproved = dailyArray.reduce((sum, d) => sum + (d.overtimeApproved || 0), 0);
    const totalAnomalies = dailyArray.filter(d => d.anomaly).length;
    const totalLeaves = leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.totalDays || 0), 0);

    res.json({
      personnel: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        branchId: targetUser.branchId,
        hireDate: targetUser.hireDate,
      },
      period: { startDate, endDate },
      summary: {
        totalDays: dailyArray.length,
        totalMinutesWorked: totalMinutes,
        totalHoursWorked: Math.floor(totalMinutes / 60),
        totalOvertimeApprovedMinutes: totalOvertimeApproved,
        totalLeaveDays: totalLeaves,
        totalAnomalies,
      },
      dailyRecords: dailyArray,
      events: {
        leaves,
        overtimes,
        shifts,
      },
    });
  } catch (error: unknown) {
    console.error('/api/personnel/:userId/attendance-detail error:', error);
    res.status(500).json({ message: 'Personel detayı alınamadı', error: String(error) });
  }
});

export default router;
