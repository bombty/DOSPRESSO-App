// ═══════════════════════════════════════════════════════════════════
// Sprint 4 / TASK-#345 (5 May 2026): Personel Self-Service Endpoint'ler
// ═══════════════════════════════════════════════════════════════════
// pdksRecords schema: recordDate (DATE), recordTime (TIME), recordType ('giris'|'cikis')
// checkInTime / checkOutTime / totalMinutes kolonları YOK.
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
// ═══════════════════════════════════════════════════════════════════
router.get('/api/me/puantaj', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // ay sonu
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Şube PDKS kayıtları — recordDate + recordType + recordTime
    const branchRecords = await db.select({
      id: pdksRecords.id,
      recordDate: pdksRecords.recordDate,
      recordTime: pdksRecords.recordTime,
      recordType: pdksRecords.recordType,
      branchId: pdksRecords.branchId,
    })
      .from(pdksRecords)
      .where(and(
        eq(pdksRecords.userId, userId),
        gte(pdksRecords.recordDate, monthStartStr),
        lte(pdksRecords.recordDate, monthEndStr),
      ))
      .orderBy(desc(pdksRecords.recordDate));

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
        lte(factoryShiftSessions.checkInTime, new Date(year, month, 1)),
      ))
      .orderBy(desc(factoryShiftSessions.checkInTime));

    // Günlük PDKS haritası — giris/cikis çifti → dakika hesabı
    // Her tarih için: { giris: '08:30', cikis: '17:45', minutes: 555, branchId }
    const dailyPdksMap = new Map<string, {
      date: string;
      giris?: string;
      cikis?: string;
      minutes: number;
      source: string;
      branchId?: number;
    }>();

    for (const r of branchRecords) {
      const dateKey = r.recordDate as string;
      if (!dailyPdksMap.has(dateKey)) {
        dailyPdksMap.set(dateKey, { date: dateKey, minutes: 0, source: 'branch', branchId: r.branchId ?? undefined });
      }
      const entry = dailyPdksMap.get(dateKey)!;
      if (r.recordType === 'giris' && !entry.giris) {
        entry.giris = r.recordTime as string | undefined;
      } else if (r.recordType === 'cikis' && !entry.cikis) {
        entry.cikis = r.recordTime as string | undefined;
      }
    }

    // Giriş + Çıkış varsa dakikayı hesapla
    for (const [, entry] of dailyPdksMap) {
      if (entry.giris && entry.cikis) {
        const [gh, gm] = entry.giris.split(':').map(Number);
        const [ch, cm] = entry.cikis.split(':').map(Number);
        entry.minutes = Math.max(0, (ch * 60 + cm) - (gh * 60 + gm));
      }
    }

    // Fabrika kayıtlarını ekle (şube kaydı yoksa)
    for (const f of factorySessions) {
      if (!f.checkInTime) continue;
      const dateKey = new Date(f.checkInTime).toISOString().split('T')[0];
      if (!dailyPdksMap.has(dateKey)) {
        dailyPdksMap.set(dateKey, {
          date: dateKey,
          giris: f.checkInTime ? new Date(f.checkInTime).toTimeString().slice(0, 5) : undefined,
          cikis: f.checkOutTime ? new Date(f.checkOutTime).toTimeString().slice(0, 5) : undefined,
          minutes: f.workMinutes || 0,
          source: 'factory',
        });
      }
    }

    const dailyRecords = Array.from(dailyPdksMap.values()).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    // Bugün aktif mi?
    const todayBranch = dailyPdksMap.get(todayStr);
    const todayFactory = factorySessions.find(f =>
      f.status === 'active' &&
      f.checkInTime &&
      new Date(f.checkInTime).toISOString().split('T')[0] === todayStr
    );
    const isActiveToday = !!(
      (todayBranch?.giris && !todayBranch?.cikis) ||
      todayFactory
    );

    // Aylık özet
    const totalMinutes = dailyRecords.reduce((sum, r) => sum + (r.minutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const workedDays = dailyRecords.filter(r => r.giris).length;

    // Bu ay onaylanmış mesai dakikaları
    const [overtimeAgg] = await db.select({
      totalApproved: sql<number>`COALESCE(SUM(${overtimeRequests.approvedMinutes}), 0)`,
    })
      .from(overtimeRequests)
      .where(and(
        eq(overtimeRequests.userId, userId),
        eq(overtimeRequests.status, 'approved'),
        gte(overtimeRequests.overtimeDate, monthStartStr),
        lte(overtimeRequests.overtimeDate, monthEndStr),
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
        type: todayFactory ? 'factory' : 'branch',
        checkInTime: todayFactory?.checkInTime || (todayBranch?.giris
          ? `${todayStr}T${todayBranch.giris}:00`
          : null),
      } : null,
    });
  } catch (error: unknown) {
    console.error('/api/me/puantaj error:', error);
    res.status(500).json({ message: 'Puantaj alınamadı' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) GET /api/me/leave-balance
// ═══════════════════════════════════════════════════════════════════
router.get('/api/me/leave-balance', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [balance] = await db.select()
      .from(leaveBalances)
      .where(and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.periodYear, year),
      ));

    if (!balance) {
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

// ═══════════════════════════════════════════════════════════════════
// İK Redesign Faz 3 (6 May 2026): Bireysel Bordro Self-Service
// ═══════════════════════════════════════════════════════════════════
// 3 yeni endpoint:
//   GET /api/me/payroll/:year/:month       → bireysel bordro detay JSON
//   GET /api/me/payroll/:year/:month/pdf   → bireysel bordro PDF (Lara format)
//   GET /api/me/payroll-history?limit=12   → son 12 ay kişisel bordro özeti
//
// 5 PERSPEKTİF REVIEW (D-07):
//   - Principal Eng:   Auth + scope + kendi userId zorunlu, başkasının veri YOK
//   - Franchise F&B:   Personel kendi bordrosuna 1 tıkla erişir, Mahmut'a soru sormaz
//   - Senior QA:       4 senaryo: 401 (auth yok), 404 (ay yok), 200 (başarı), PDF download
//   - Product Manager: Geçmiş 12 ay grafiği için history endpoint, scroll-friendly
//   - Compliance:      KVKK — sadece kendi userId, başka kullanıcıya ait veri filtre dışı
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/me/payroll/:year/:month
 * Authenticated kullanıcının belirli ay bordrosu.
 * 200: bordro JSON | 404: o ay bordro yok | 401: auth yok
 */
router.get('/api/me/payroll/:year/:month', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = Number.parseInt(String(req.params.year), 10);
    const month = Number.parseInt(String(req.params.month), 10);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Geçersiz yıl veya ay' });
    }

    const result = await db.select()
      .from(monthlyPayroll)
      .where(and(
        eq(monthlyPayroll.userId, userId),
        eq(monthlyPayroll.year, year),
        eq(monthlyPayroll.month, month),
      ))
      .limit(1);

    if (!result[0]) {
      return res.status(404).json({
        message: `${year}/${month} ayı için bordro henüz hesaplanmadı`,
        year,
        month,
        userId,
      });
    }

    res.json(result[0]);
  } catch (error: unknown) {
    console.error('/api/me/payroll/:year/:month error:', error);
    res.status(500).json({ message: 'Bordro alınamadı' });
  }
});

/**
 * GET /api/me/payroll/:year/:month/pdf
 * Authenticated kullanıcının belirli ay bordro PDF'i.
 * Lara şubesi için Excel formatına yakın layout (mevcut generateIndividualPayslipPDF).
 */
router.get('/api/me/payroll/:year/:month/pdf', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const year = Number.parseInt(String(req.params.year), 10);
    const month = Number.parseInt(String(req.params.month), 10);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Geçersiz yıl veya ay' });
    }

    // Bordro veriyi çek
    const payroll = await db.select()
      .from(monthlyPayroll)
      .where(and(
        eq(monthlyPayroll.userId, userId),
        eq(monthlyPayroll.year, year),
        eq(monthlyPayroll.month, month),
      ))
      .limit(1);

    if (!payroll[0]) {
      return res.status(404).json({
        message: `${year}/${month} ayı için bordro yok — PDF üretilemiyor`,
      });
    }

    // Kullanıcı + şube bilgisi (PDF üzerinde gösterilecek)
    const { users, branches } = await import('@shared/schema');
    const userInfo = await db.select({
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchName: branches.name,
    })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userInfo[0]) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const p = payroll[0];
    const u = userInfo[0];

    // generateIndividualPayslipPDF formatına dönüştür
    const pdfGen = await import('../utils/pdf-generator');
    const payslipData: pdfGen.PayslipData = {
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      position: p.positionCode || u.role || '',
      branch: u.branchName || '',
      month: p.month,
      year: p.year,
      baseSalary: p.baseSalary,
      overtimePay: p.overtimePay,
      offDayPay: 0, // legacy alan
      holidayPay: p.holidayPay,
      totalBonuses: p.bonus + p.mealAllowance,
      grossTotal: p.grossTotal || p.totalSalary,
      deficitDeduction: p.absenceDeduction + p.bonusDeduction,
      sgkEmployee: p.sgkEmployee || 0,
      unemploymentEmployee: p.unemploymentEmployee || 0,
      incomeTax: p.incomeTax || 0,
      stampTax: p.stampTax || 0,
      agi: p.agi || 0,
      totalDeductions: p.totalDeductions || 0,
      netSalary: p.netPay,
      sgkEmployer: p.sgkEmployer || 0,
      unemploymentEmployer: p.unemploymentEmployer || 0,
      totalEmployerCost: p.totalEmployerCost || p.netPay,
    };

    const pdfBuffer = await pdfGen.generateIndividualPayslipPDF(payslipData, p.month, p.year);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bordro-${u.firstName}-${u.lastName}-${year}-${String(month).padStart(2, '0')}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error: unknown) {
    console.error('/api/me/payroll/:year/:month/pdf error:', error);
    res.status(500).json({ message: 'Bordro PDF üretilemedi' });
  }
});

/**
 * GET /api/me/payroll-history?limit=12
 * Authenticated kullanıcının son N ay kişisel bordro özetleri (grafik için).
 */
router.get('/api/me/payroll-history', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '12'), 10) || 12, 24);

    const history = await db.select({
      year: monthlyPayroll.year,
      month: monthlyPayroll.month,
      totalSalary: monthlyPayroll.totalSalary,
      grossTotal: monthlyPayroll.grossTotal,
      netPay: monthlyPayroll.netPay,
      workedDays: monthlyPayroll.workedDays,
      absentDays: monthlyPayroll.absentDays,
      overtimeMinutes: monthlyPayroll.overtimeMinutes,
      status: monthlyPayroll.status,
      calculatedAt: monthlyPayroll.calculatedAt,
    })
      .from(monthlyPayroll)
      .where(eq(monthlyPayroll.userId, userId))
      .orderBy(desc(monthlyPayroll.year), desc(monthlyPayroll.month))
      .limit(limit);

    // Özet metrikleri
    const totalNetSum = history.reduce((sum, h) => sum + (h.netPay || 0), 0);
    const avgNet = history.length > 0 ? Math.round(totalNetSum / history.length) : 0;
    const lastMonth = history[0] || null;

    res.json({
      list: history,
      summary: {
        count: history.length,
        avgNet,
        lastMonth,
      },
    });
  } catch (error: unknown) {
    console.error('/api/me/payroll-history error:', error);
    res.status(500).json({ message: 'Bordro geçmişi alınamadı' });
  }
});

export default router;
