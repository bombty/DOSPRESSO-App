import { Router, Request, Response } from 'express';
import { db } from '../db';
import { monthlyPayroll, users, branches, positionSalaries } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from '../localAuth';
import { requireManifestAccess } from '../services/manifest-auth';
import { checkDataLock } from '../services/data-lock';
import { calculateBranchPayroll, savePayrollResults, calculatePayroll } from '../lib/payroll-engine';
import { getMonthClassification } from '../lib/pdks-engine';
import { calculatePayroll as calculateDetailedPayroll, type PayrollInput } from '../services/payroll-calculation-service';
import { z } from 'zod';

const router = Router();

const PAYROLL_ADMIN_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'];
const PAYROLL_VIEW_ROLES = [...PAYROLL_ADMIN_ROLES, 'mudur', 'supervisor', 'yatirimci_branch', 'yatirimci_hq'];

function canAdminPayroll(role: string): boolean {
  return PAYROLL_ADMIN_ROLES.includes(role);
}

function canViewPayroll(role: string): boolean {
  return PAYROLL_VIEW_ROLES.includes(role);
}

router.post('/api/pdks-payroll/calculate', isAuthenticated, requireManifestAccess('bordro', 'create'), async (req: any, res: Response) => {
  try {
    const user = req.user;

    const { branchId, year, month } = req.body;
    if (!branchId || !year || !month) {
      return res.status(400).json({ error: 'branchId, year ve month gerekli' });
    }

    const result = await db.transaction(async (tx) => {
      const results = await calculateBranchPayroll(Number(branchId), Number(year), Number(month));
      const saved = await savePayrollResults(results, tx);
      return { results, saved };
    });

    res.json({
      calculated: result.results.length,
      saved: result.saved,
      results: result.results.map(r => ({
        userId: r.userId,
        userName: r.userName,
        positionName: r.positionName,
        workedDays: r.workedDays,
        offDays: r.offDays,
        absentDays: r.absentDays,
        totalSalary: r.totalSalary,
        absenceDeduction: r.absenceDeduction,
        bonusDeduction: r.bonusDeduction,
        overtimePay: r.overtimePay,
        holidayWorkedDays: r.holidayWorkedDays,
        holidayPay: r.holidayPay,
        mealAllowance: r.mealAllowance,
        netPay: r.netPay,
      }))
    });
  } catch (error: unknown) {
    console.error("Payroll calculate error:", error);
    res.status(500).json({ error: 'Maaş hesaplanamadı' });
  }
});

router.get('/api/pdks-payroll/summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { branchId, year, month } = req.query;

    if (!branchId || !year || !month) {
      return res.status(400).json({ error: 'branchId, year ve month gerekli' });
    }

    const bId = Number(branchId);

    if (!canViewPayroll(user.role) && user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    if (['mudur', 'yatirimci_branch', 'supervisor'].includes(user.role) && user.branchId !== bId) {
      return res.status(403).json({ error: 'Sadece kendi şubenizi görebilirsiniz' });
    }

    const payrolls = await db.select({
      id: monthlyPayroll.id,
      userId: monthlyPayroll.userId,
      positionCode: monthlyPayroll.positionCode,
      workedDays: monthlyPayroll.workedDays,
      offDays: monthlyPayroll.offDays,
      absentDays: monthlyPayroll.absentDays,
      unpaidLeaveDays: monthlyPayroll.unpaidLeaveDays,
      sickLeaveDays: monthlyPayroll.sickLeaveDays,
      overtimeMinutes: monthlyPayroll.overtimeMinutes,
      totalSalary: monthlyPayroll.totalSalary,
      baseSalary: monthlyPayroll.baseSalary,
      bonus: monthlyPayroll.bonus,
      dailyRate: monthlyPayroll.dailyRate,
      absenceDeduction: monthlyPayroll.absenceDeduction,
      bonusDeduction: monthlyPayroll.bonusDeduction,
      overtimePay: monthlyPayroll.overtimePay,
      netPay: monthlyPayroll.netPay,
      status: monthlyPayroll.status,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.userId, users.id))
    .where(and(
      eq(monthlyPayroll.branchId, bId),
      eq(monthlyPayroll.year, Number(year)),
      eq(monthlyPayroll.month, Number(month))
    ));

    const isSupervisor = user.role === 'supervisor';
    const isInvestor = ['yatirimci_branch', 'yatirimci_hq'].includes(user.role);

    const result = payrolls.map(p => {
      const userName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Bilinmiyor';
      if (isSupervisor) {
        return {
          userId: p.userId,
          userName,
          positionCode: p.positionCode,
          workedDays: p.workedDays,
          offDays: p.offDays,
          absentDays: p.absentDays,
          overtimeMinutes: p.overtimeMinutes,
          status: p.status,
        };
      }
      if (isInvestor) {
        return {
          userId: p.userId,
          userName,
          positionCode: p.positionCode,
          netPay: p.netPay,
          status: p.status,
        };
      }
      const { firstName, lastName, ...rest } = p;
      return { ...rest, userName };
    });

    res.json(result);
  } catch (error) {
    console.error("Payroll summary error:", error);
    res.status(500).json({ error: 'Maaş özeti getirilemedi' });
  }
});

router.get('/api/pdks-payroll/my', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { year, month } = req.query;

    const conditions = [eq(monthlyPayroll.userId, user.id)];
    if (year) conditions.push(eq(monthlyPayroll.year, Number(year)));
    if (month) conditions.push(eq(monthlyPayroll.month, Number(month)));

    const payrolls = await db.select()
      .from(monthlyPayroll)
      .where(and(...conditions))
      .orderBy(desc(monthlyPayroll.year), desc(monthlyPayroll.month));

    res.json(payrolls);
  } catch (error) {
    console.error("My payroll error:", error);
    res.status(500).json({ error: 'Bordro getirilemedi' });
  }
});

router.get('/api/pdks-payroll/positions', isAuthenticated, async (req: any, res: Response) => {
  try {
    const salaries = await db.select().from(positionSalaries).orderBy(positionSalaries.totalSalary);
    res.json(salaries);
  } catch (error) {
    console.error("Position salaries error:", error);
    res.status(500).json({ error: 'Pozisyon maaşları getirilemedi' });
  }
});

router.get('/api/pdks-payroll/branches', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (['mudur', 'supervisor', 'yatirimci_branch'].includes(user.role)) {
      if (user.branchId) {
        const branchList = await db.select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.id, user.branchId));
        return res.json(branchList);
      }
      return res.json([]);
    }

    const branchList = await db.select({ id: branches.id, name: branches.name })
      .from(branches)
      .orderBy(branches.name);
    res.json(branchList);
  } catch (error) {
    console.error("Branches list error:", error);
    res.status(500).json({ error: 'Şube listesi getirilemedi' });
  }
});

router.get('/api/pdks-payroll/:userId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const targetUserId = req.params.userId;
    const { year, month } = req.query;

    if (!canViewPayroll(user.role) && user.role !== 'supervisor' && user.id !== targetUserId) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    if (!year || !month) {
      return res.status(400).json({ error: 'year ve month gerekli' });
    }

    const [payroll] = await db.select()
      .from(monthlyPayroll)
      .where(and(
        eq(monthlyPayroll.userId, targetUserId),
        eq(monthlyPayroll.year, Number(year)),
        eq(monthlyPayroll.month, Number(month))
      ))
      .limit(1);

    if (!payroll) {
      return res.status(404).json({ error: 'Bordro bulunamadı' });
    }

    if (['mudur', 'supervisor', 'yatirimci_branch'].includes(user.role) && user.branchId !== payroll.branchId) {
      return res.status(403).json({ error: 'Sadece kendi şubenizi görebilirsiniz' });
    }

    const isSupervisor = user.role === 'supervisor';
    const isInvestor = ['yatirimci_branch', 'yatirimci_hq'].includes(user.role);

    if (isSupervisor && user.id !== targetUserId) {
      return res.json({
        payroll: {
          userId: payroll.userId,
          workedDays: payroll.workedDays,
          offDays: payroll.offDays,
          absentDays: payroll.absentDays,
          overtimeMinutes: payroll.overtimeMinutes,
          status: payroll.status,
        },
        days: [],
      });
    }

    if (isInvestor) {
      return res.json({
        payroll: {
          userId: payroll.userId,
          netPay: payroll.netPay,
          status: payroll.status,
          workedDays: payroll.workedDays,
        },
        days: [],
      });
    }

    const classification = await getMonthClassification(targetUserId, Number(year), Number(month));

    res.json({
      payroll,
      days: classification.days,
    });
  } catch (error) {
    console.error("Payroll detail error:", error);
    res.status(500).json({ error: 'Bordro detayı getirilemedi' });
  }
});

router.patch('/api/pdks-payroll/:id/approve', isAuthenticated, requireManifestAccess('bordro', 'approve'), async (req: any, res: Response) => {
  try {
    const user = req.user;

    const id = Number(req.params.id);

    const [existingPayroll] = await db.select({ createdAt: monthlyPayroll.createdAt, status: monthlyPayroll.status }).from(monthlyPayroll).where(eq(monthlyPayroll.id, id)).limit(1);
    if (existingPayroll) {
      const lockResult = await checkDataLock('monthly_payroll', existingPayroll.createdAt || new Date(), existingPayroll.status || undefined);
      if (lockResult.locked) {
        return res.status(423).json({ error: 'Bu kayıt kilitli', reason: lockResult.reason, canRequestChange: lockResult.canRequestChange });
      }
    }

    const [updated] = await db.transaction(async (tx) => {
      return tx.update(monthlyPayroll)
        .set({
          status: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(monthlyPayroll.id, id))
        .returning();
    });

    if (!updated) {
      return res.status(404).json({ error: 'Bordro bulunamadı' });
    }

    res.json(updated);
  } catch (error: unknown) {
    console.error("Payroll approve error:", error);
    res.status(500).json({ error: 'Onay işlemi başarısız' });
  }
});

const detailedPayrollSchema = z.object({
  baseSalaryGross: z.number().positive('baseSalaryGross 0\'dan büyük olmalı'),
  workedMinutes: z.number().min(0).default(0),
  expectedMinutes: z.number().min(0).default(0),
  overtimeMinutes: z.number().min(0).default(0),
  deficitMinutes: z.number().min(0).default(0),
  unauthorizedAbsentDays: z.number().min(0).default(0),
  offDayWorkedMinutes: z.number().min(0).default(0),
  holidayWorkedMinutes: z.number().min(0).default(0),
  salesBonus: z.number().min(0).default(0),
  cashBonus: z.number().min(0).default(0),
  performanceBonus: z.number().min(0).default(0),
  cumulativeTaxBase: z.number().min(0).default(0),
});

router.post('/api/payroll/calculate-detailed', isAuthenticated, requireManifestAccess('bordro', 'create'), async (req: any, res: Response) => {
  try {
    const user = req.user;

    const parsed = detailedPayrollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Geçersiz girdi', details: parsed.error.errors });
    }

    const result = await db.transaction(async (tx) => {
      return calculateDetailedPayroll(parsed.data);
    });
    res.json(result);
  } catch (error: unknown) {
    console.error("Detailed payroll calculation error:", error);
    const errMsg = error instanceof Error ? error.message : 'Detaylı maaş hesaplanamadı';
    res.status(500).json({ error: errMsg });
  }
});

router.get('/api/payroll/export/pdf/:year/:month', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canViewPayroll(user.role)) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    const conditions = [
      eq(monthlyPayroll.year, year),
      eq(monthlyPayroll.month, month),
    ];

    if (['mudur', 'yatirimci_branch', 'supervisor'].includes(user.role)) {
      if (!user.branchId) {
        return res.status(403).json({ error: 'Şube atamanız yapılmamış, bordro dışa aktarılamaz' });
      }
      conditions.push(eq(monthlyPayroll.branchId, user.branchId));
    }

    const branchIdFilter = req.query.branchId ? Number(req.query.branchId) : null;
    if (branchIdFilter) {
      if (['mudur', 'yatirimci_branch', 'supervisor'].includes(user.role) && user.branchId !== branchIdFilter) {
        return res.status(403).json({ error: 'Sadece kendi şubenizin bordrosunu dışa aktarabilirsiniz' });
      }
      conditions.push(eq(monthlyPayroll.branchId, branchIdFilter));
    }

    const payrolls = await db.select({
      payroll: monthlyPayroll,
      user: { id: users.id, firstName: users.firstName, lastName: users.lastName },
      branch: { id: branches.id, name: branches.name },
    }).from(monthlyPayroll)
      .leftJoin(users, eq(monthlyPayroll.userId, users.id))
      .leftJoin(branches, eq(monthlyPayroll.branchId, branches.id))
      .where(and(...conditions))
      .orderBy(desc(monthlyPayroll.netPay));

    if (payrolls.length === 0) {
      return res.status(404).json({ error: 'Bu dönem için bordro bulunamadı' });
    }

    const pdfGen = await import('../utils/pdf-generator');

    const employees: pdfGen.PayslipData[] = [];
    for (const p of payrolls) {
      const pr = p.payroll;
      const base = Number(pr.baseSalary || 0);
      const bonus = Number(pr.bonus || 0);
      const overtime = Number(pr.overtimePay || 0);
      const absenceDed = Number(pr.absenceDeduction || 0);
      const bonusDed = Number(pr.bonusDeduction || 0);
      const net = Number(pr.netPay || 0);
      const total = Number(pr.totalSalary || 0);

      let sgkEmp = 0, unemploymentEmp = 0, incomeTaxVal = 0, stampTaxVal = 0, agiVal = 0;
      let sgkEr = 0, unemploymentEr = 0, employerCost = total;
      let grossTotal = base + bonus + overtime;
      let totalDed = absenceDed + bonusDed;

      if (base > 0) {
        try {
          const detailed = await calculateDetailedPayroll({
            baseSalaryGross: base,
            workedMinutes: 0,
            expectedMinutes: 0,
            overtimeMinutes: Number(pr.overtimeMinutes || 0),
            deficitMinutes: 0,
            unauthorizedAbsentDays: Number(pr.absentDays || 0),
            offDayWorkedMinutes: 0,
            holidayWorkedMinutes: 0,
            salesBonus: bonus,
            cashBonus: 0,
            performanceBonus: 0,
            cumulativeTaxBase: 0,
          });
          sgkEmp = detailed.sgkEmployee;
          unemploymentEmp = detailed.unemploymentEmployee;
          incomeTaxVal = detailed.incomeTax;
          stampTaxVal = detailed.stampTax;
          agiVal = detailed.agi;
          sgkEr = detailed.sgkEmployer;
          unemploymentEr = detailed.unemploymentEmployer;
          grossTotal = detailed.grossTotal;
          totalDed = detailed.totalDeductions;
          employerCost = detailed.totalEmployerCost;
        } catch (calcErr) {
          console.warn(`PDF: SGK/vergi hesaplama atlandı (${p.user?.firstName}):`, (calcErr as Error).message);
        }
      }

      employees.push({
        firstName: p.user?.firstName || '',
        lastName: p.user?.lastName || '',
        position: pr.positionCode || '',
        branch: p.branch?.name || '',
        month,
        year,
        baseSalary: base,
        overtimePay: overtime,
        offDayPay: 0,
        holidayPay: 0,
        totalBonuses: bonus,
        grossTotal,
        deficitDeduction: absenceDed,
        sgkEmployee: sgkEmp,
        unemploymentEmployee: unemploymentEmp,
        incomeTax: incomeTaxVal,
        stampTax: stampTaxVal,
        totalDeductions: totalDed,
        agi: agiVal,
        netSalary: net,
        sgkEmployer: sgkEr,
        unemploymentEmployer: unemploymentEr,
        totalEmployerCost: employerCost,
      });
    }

    const totalGross = employees.reduce((sum, e) => sum + e.grossTotal, 0);
    const totalNet = employees.reduce((sum, e) => sum + e.netSalary, 0);
    const totalCost = employees.reduce((sum, e) => sum + e.totalEmployerCost, 0);

    const pdfBuffer = await pdfGen.generatePayrollPDF({
      month,
      year,
      employees,
      totalGross,
      totalNet,
      totalEmployerCost: totalCost,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bordro-${year}-${month}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Payroll PDF export error:", error);
    res.status(500).json({ error: 'PDF oluşturulamadı' });
  }
});

// ── Birleşik Bordro Hesaplama (PDKS + SGK/Vergi) ──────────────────

router.post('/api/payroll/calculate-unified', isAuthenticated, requireManifestAccess('bordro', 'create'), async (req: any, res: Response) => {
  try {
    const { branchId, year, month, config } = req.body;
    if (!branchId || !year || !month) {
      return res.status(400).json({ error: 'branchId, year ve month gerekli' });
    }

    const { calculateBranchUnifiedPayroll } = await import('../services/payroll-bridge');
    const results = await calculateBranchUnifiedPayroll(
      Number(branchId),
      Number(year),
      Number(month),
      config || {}
    );

    res.json({
      calculated: results.length,
      mode: "unified",
      results: results.map(r => ({
        userId: r.userId,
        userName: r.userName,
        positionCode: r.positionCode,
        positionName: r.positionName,
        // PDKS
        workedDays: r.workedDays,
        offDays: r.offDays,
        absentDays: r.absentDays,
        overtimeMinutes: r.overtimeMinutes,
        holidayWorkedDays: r.holidayWorkedDays,
        // Maaş
        baseSalaryGross: r.baseSalaryGross,
        cashBonus: r.cashBonus,
        performanceBonus: r.performanceBonus,
        mealAllowance: r.mealAllowance,
        // Hesaplama
        overtimePay: r.overtimePay,
        holidayPay: r.holidayPay,
        grossTotal: r.grossTotal,
        absenceDeduction: r.absenceDeduction,
        // SGK & Vergi
        sgkEmployee: r.sgkEmployee,
        incomeTax: r.incomeTax,
        stampTax: r.stampTax,
        agi: r.agi,
        totalDeductions: r.totalDeductions,
        netSalary: r.netSalary,
        // İşveren
        totalEmployerCost: r.totalEmployerCost,
      })),
    });
  } catch (error: unknown) {
    console.error("Unified payroll calculate error:", error);
    const msg = error instanceof Error ? error.message : 'Birleşik bordro hesaplanamadı';
    res.status(500).json({ error: msg });
  }
});

export default router;
