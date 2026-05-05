/**
 * Payroll Bridge — Birleşik Bordro Motoru
 *
 * Motor 1 (pdks-engine): PDKS → gün sınıflandırma → PdksMonthSummary
 * Motor 2 (payroll-calculation-service): SGK/vergi/AGI hesaplama
 * Excel Adapter: pdks_daily_summary → PdksMonthSummary formatı
 *
 * Akış:
 *   Kaynak (kiosk | excel) → PdksMonthSummary
 *       ↓
 *   Bridge → mapToPayrollInput → Motor 2
 *       ↓
 *   UnifiedPayrollResult → monthly_payroll (DB kayıt)
 */

import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { getMonthClassification, type PdksMonthSummary, type DayClassification } from "../lib/pdks-engine";
import { getPositionSalary, loadPayrollConfig, getMinimumWageGross, type PayrollMonthConfig } from "../lib/payroll-engine";
import { calculatePayroll as calculateDetailed, type PayrollInput, type PayrollResult as DetailedResult } from "./payroll-calculation-service";
import { users, monthlyPayroll, pdksDailySummary, pdksExcelImports, publicHolidays, leaveRequests } from "@shared/schema";

// ─── Veri Kaynağı ─────────────────────────────────────────────────

export type DataSource = "kiosk" | "excel" | "manual";

// ─── S-Bordro (21 Nis 2026): Pilot Güvenlik Katmanı ─────────────
//
// Env değişkenleri:
//   PAYROLL_LOCKED_DATASOURCE  → 'kiosk' | 'excel' | 'manual' | '' (boş = kilitsiz)
//   PAYROLL_DRY_RUN            → 'true' | 'false' (default: false)
//
// Pilot süresince:
//   PAYROLL_LOCKED_DATASOURCE=kiosk → Mahmut excel seçse bile kiosk kullanılır
//   PAYROLL_DRY_RUN=true           → Bordro kaydedilir AMA SGK bildirimi YAPILMAZ
//
// Production'da her ikisi de false/empty olur.

export function getLockedDataSource(): DataSource | null {
  const v = (process.env.PAYROLL_LOCKED_DATASOURCE || "").trim().toLowerCase();
  if (v === "kiosk" || v === "excel" || v === "manual") {
    return v as DataSource;
  }
  return null; // kilitsiz
}

export function isPayrollDryRun(): boolean {
  return (process.env.PAYROLL_DRY_RUN || "").trim().toLowerCase() === "true";
}

/**
 * Etkin dataSource'u döndür — eğer lock varsa istek yoksayılır.
 * Usage: const effectiveSource = resolveDataSource(requestedSource);
 */
export function resolveDataSource(requested: DataSource = "kiosk"): DataSource {
  const locked = getLockedDataSource();
  if (locked && locked !== requested) {
    console.warn(
      `[payroll-bridge] DataSource LOCK: requested='${requested}' but locked to '${locked}'. Using '${locked}'.`
    );
    return locked;
  }
  return requested;
}

// ─── Birleşik Sonuç Tipi ─────────────────────────────────────────

export interface UnifiedPayrollResult {
  userId: string;
  userName: string;
  branchId: number;
  year: number;
  month: number;
  positionCode: string;
  positionName: string;
  // PDKS
  totalCalendarDays: number;
  workedDays: number;
  offDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  annualLeaveDays: number;
  totalWorkedMinutes: number;
  overtimeMinutes: number;
  holidayWorkedDays: number;
  // Maaş
  baseSalaryGross: number;
  cashBonus: number;
  performanceBonus: number;
  mealAllowance: number;
  // Hesaplama
  dailyRate: number;
  hourlyRate: number;
  overtimePay: number;
  holidayPay: number;
  offDayPay: number;
  grossTotal: number;
  absenceDeduction: number;
  bonusDeduction: number;
  // SGK & Vergi
  sgkEmployee: number;
  unemploymentEmployee: number;
  incomeTax: number;
  stampTax: number;
  agi: number;
  totalDeductions: number;
  netSalary: number;
  // İşveren
  sgkEmployer: number;
  unemploymentEmployer: number;
  totalEmployerCost: number;
  // Meta
  isTerminated: boolean;
  calculationMode: "unified" | "simple";
  dataSource: DataSource;
  sourceImportId: number | null;
  cumulativeTaxBase: number;
  // ─── İK Redesign 6 May 2026 — Dual-Model Tracking ───
  salarySource: 'position_matrix' | 'individual_net_salary' | 'minimum_wage_fallback';
  originalSalary?: number;  // asgari ücret fallback öncesi orjinal değer (audit)
  legalNote?: string;       // compliance açıklaması (UI rozet için)
}

// ─── Rol → Pozisyon Kodu ──────────────────────────────────────────

// İK Redesign 6 May 2026: 'stajyer' role → 'intern' position_code (DB seed ile uyum)
const ROLE_TO_POSITION: Record<string, string> = {
  stajyer: "intern",
  bar_buddy: "bar_buddy",
  barista: "barista",
  supervisor_buddy: "supervisor_buddy",
  supervisor: "supervisor",
  mudur: "supervisor",
};

const KASA_PRIMI = 350000; // 3500 TL kuruş cinsinden

// ═══════════════════════════════════════════════════════════════════
// EXCEL → PdksMonthSummary ADAPTER
// ═══════════════════════════════════════════════════════════════════

async function getExcelMonthSummary(
  userId: string,
  branchId: number,
  year: number,
  month: number,
  importId?: number
): Promise<{ summary: PdksMonthSummary; importId: number | null }> {
  let effectiveImportId = importId ?? null;

  if (!effectiveImportId) {
    // Prefer real Excel imports; fall back to kiosk_sync (shift_attendance-derived)
    // when no operator-uploaded Excel exists for the period.
    const realImports = await db.select({ id: pdksExcelImports.id })
      .from(pdksExcelImports)
      .where(and(
        eq(pdksExcelImports.branchId, branchId),
        eq(pdksExcelImports.month, month),
        eq(pdksExcelImports.year, year),
        sql`${pdksExcelImports.importType} <> 'kiosk_sync'`,
      ))
      .orderBy(sql`${pdksExcelImports.id} DESC`)
      .limit(1);
    if (realImports[0]) {
      effectiveImportId = realImports[0].id;
    } else {
      const syncImports = await db.select({ id: pdksExcelImports.id })
        .from(pdksExcelImports)
        .where(and(
          eq(pdksExcelImports.branchId, branchId),
          eq(pdksExcelImports.month, month),
          eq(pdksExcelImports.year, year),
          eq(pdksExcelImports.importType, 'kiosk_sync'),
        ))
        .orderBy(sql`${pdksExcelImports.id} DESC`)
        .limit(1);
      if (syncImports[0]) effectiveImportId = syncImports[0].id;
    }
  }

  if (!effectiveImportId) {
    throw new Error(`Excel import bulunamadı: şube=${branchId}, ${year}/${month}`);
  }

  const dailies = await db.select()
    .from(pdksDailySummary)
    .where(and(
      eq(pdksDailySummary.importId, effectiveImportId),
      eq(pdksDailySummary.userId, userId),
    ));

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const [leaves, holidays] = await Promise.all([
    db.select({
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      leaveType: leaveRequests.leaveType,
    })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "approved"),
      sql`${leaveRequests.startDate} <= ${endDate}`,
      sql`${leaveRequests.endDate} >= ${startDate}`,
    )),
    db.select({ date: publicHolidays.date, name: publicHolidays.name })
      .from(publicHolidays)
      .where(and(eq(publicHolidays.year, year), eq(publicHolidays.isActive, true))),
  ]);

  const holidaySet = new Set(holidays.map(h => h.date));
  const dailyMap = new Map<string, typeof dailies[0]>();
  for (const d of dailies) {
    const dateStr = new Date(d.workDate).toISOString().slice(0, 10);
    dailyMap.set(dateStr, d);
  }

  const leaveStatusMap: Record<string, DayClassification["status"]> = {
    unpaid: "unpaid_leave",
    sick: "sick_leave",
    annual: "annual_leave",
    personal: "annual_leave",
  };

  const days: DayClassification[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const excel = dailyMap.get(dateStr);
    const isHoliday = holidaySet.has(dateStr);
    const holidayName = holidays.find(h => h.date === dateStr)?.name;
    const base = { date: dateStr, records: [] as any[], workedMinutes: 0, overtimeMinutes: 0, isHoliday, holidayName };

    // İzin kontrolü
    let leaveType: string | null = null;
    for (const leave of leaves) {
      if (dateStr >= leave.startDate && dateStr <= leave.endDate) {
        leaveType = leave.leaveType;
        break;
      }
    }

    if (leaveType) {
      days.push({ ...base, status: leaveStatusMap[leaveType] || "annual_leave" });
      continue;
    }

    if (!excel) {
      const isWeekend = new Date(dateStr).getDay() === 0;
      days.push({ ...base, status: isWeekend ? "program_off" : "no_shift" });
      continue;
    }

    if (excel.isOffDay) {
      days.push({
        ...base,
        status: "program_off",
        workedMinutes: excel.netMinutes && excel.netMinutes > 0 ? excel.netMinutes : 0,
      });
      continue;
    }

    const netMinutes = excel.netMinutes ?? 0;
    const otMinutes = excel.overtimeMinutes ?? 0;
    days.push({
      ...base,
      status: netMinutes > 0 ? "worked" : "absent",
      workedMinutes: netMinutes,
      overtimeMinutes: otMinutes >= 30 ? otMinutes : 0,
    });
  }

  return {
    summary: {
      userId, year, month, days,
      workedDays: days.filter(d => d.status === "worked").length,
      offDays: days.filter(d => ["program_off", "kapanish_off", "no_shift"].includes(d.status)).length,
      absentDays: days.filter(d => d.status === "absent").length,
      unpaidLeaveDays: days.filter(d => d.status === "unpaid_leave").length,
      sickLeaveDays: days.filter(d => d.status === "sick_leave").length,
      annualLeaveDays: days.filter(d => d.status === "annual_leave").length,
      totalOvertimeMinutes: days.reduce((sum, d) => sum + d.overtimeMinutes, 0),
      holidayWorkedDays: days.filter(d => d.status === "worked" && d.isHoliday).length,
    },
    importId: effectiveImportId,
  };
}

// ═══════════════════════════════════════════════════════════════════
// KÜMÜLATİF VERGİ MATRAHI — Önceki aylardan oku
// ═══════════════════════════════════════════════════════════════════

async function getCumulativeTaxBase(userId: string, year: number, month: number): Promise<number> {
  if (month <= 1) return 0;

  // En son unified hesaplamadan oku
  const prev = await db.select({
    cumulativeTaxBase: monthlyPayroll.cumulativeTaxBase,
    grossTotal: monthlyPayroll.grossTotal,
    sgkEmployee: monthlyPayroll.sgkEmployee,
    unemploymentEmployee: monthlyPayroll.unemploymentEmployee,
    calculationMode: monthlyPayroll.calculationMode,
  })
  .from(monthlyPayroll)
  .where(and(
    eq(monthlyPayroll.userId, userId),
    eq(monthlyPayroll.year, year),
    sql`${monthlyPayroll.month} < ${month}`,
  ))
  .orderBy(sql`${monthlyPayroll.month} DESC`)
  .limit(1);

  if (prev[0] && prev[0].calculationMode === "unified" && prev[0].cumulativeTaxBase) {
    const gross = prev[0].grossTotal ?? 0;
    const sgk = prev[0].sgkEmployee ?? 0;
    const unemp = prev[0].unemploymentEmployee ?? 0;
    return (prev[0].cumulativeTaxBase ?? 0) + Math.max(0, gross - sgk - unemp);
  }

  // Fallback: tüm önceki ayların brüt toplamından yaklaşık
  const allPrev = await db.select({ totalSalary: monthlyPayroll.totalSalary })
    .from(monthlyPayroll)
    .where(and(
      eq(monthlyPayroll.userId, userId),
      eq(monthlyPayroll.year, year),
      sql`${monthlyPayroll.month} < ${month}`,
    ));

  if (allPrev.length === 0) return 0;
  const totalBrut = allPrev.reduce((sum, p) => sum + (p.totalSalary || 0), 0);
  return Math.round(totalBrut * 0.85);
}

// ═══════════════════════════════════════════════════════════════════
// PDKS → PayrollInput DÖNÜŞÜMÜ
// ═══════════════════════════════════════════════════════════════════

function mapPdksToPayrollInput(
  pdks: PdksMonthSummary,
  salary: { totalSalary: number; baseSalary: number; bonus: number },
  cumulativeTaxBase: number
): PayrollInput {
  const daysInMonth = new Date(pdks.year, pdks.month, 0).getDate();
  const workedMinutes = pdks.days.reduce((sum, d) => sum + d.workedMinutes, 0);
  const workingDays = daysInMonth - pdks.offDays;
  const expectedMinutes = workingDays * 480;
  const deficitMinutes = Math.max(0, expectedMinutes - workedMinutes - pdks.totalOvertimeMinutes);

  const offDayWorkedMinutes = pdks.days
    .filter(d => (d.status === "program_off" || d.status === "kapanish_off") && d.workedMinutes > 0)
    .reduce((sum, d) => sum + d.workedMinutes, 0);

  const holidayWorkedMinutes = pdks.days
    .filter(d => d.isHoliday && d.workedMinutes > 0)
    .reduce((sum, d) => sum + d.workedMinutes, 0);

  const cashBonus = Math.min(KASA_PRIMI, salary.bonus);
  const performanceBonus = salary.bonus - cashBonus;

  return {
    baseSalaryGross: salary.totalSalary,
    workedMinutes,
    expectedMinutes,
    overtimeMinutes: pdks.totalOvertimeMinutes,
    deficitMinutes,
    unauthorizedAbsentDays: pdks.absentDays,
    offDayWorkedMinutes,
    holidayWorkedMinutes,
    salesBonus: 0,
    cashBonus,
    performanceBonus,
    cumulativeTaxBase,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BİRLEŞİK HESAPLAMA (TEK KİŞİ)
// ═══════════════════════════════════════════════════════════════════

export async function calculateUnifiedPayroll(
  userId: string,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {},
  dataSource: DataSource = "kiosk",
  importId?: number
): Promise<UnifiedPayrollResult | null> {
  // S-Bordro: DataSource kilidi - pilot süresince istenen kaynağı override eder
  const effectiveSource = resolveDataSource(dataSource);
  const userResult = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    branchId: users.branchId,
    isActive: users.isActive,
    netSalary: users.netSalary,    // İK Redesign — custom-individual fallback için
    bonusBase: users.bonusBase,    // İK Redesign — bonus split için
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!userResult[0] || !userResult[0].branchId) return null;

  const u = userResult[0];
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "Bilinmiyor";
  const positionCode = ROLE_TO_POSITION[u.role] || u.role;

  // ─── İK Redesign — Dual-Model Salary Resolution ───
  // 1. Position lookup (Lara matrisi)
  let salary = await getPositionSalary(positionCode, year, month);
  let salarySource: UnifiedPayrollResult['salarySource'] = 'position_matrix';

  // 2. Custom-individual fallback (HQ/Fabrika/Ofis için users.netSalary)
  if (!salary && u.netSalary && u.netSalary > 0) {
    salary = {
      id: 0,
      positionCode: 'custom',
      positionName: 'Kişiye Özel Hakediş',
      totalSalary: u.netSalary,
      bonus: u.bonusBase ?? 0,
      baseSalary: Math.max(u.netSalary - (u.bonusBase ?? 0), 0),
      effectiveFrom: '',
      effectiveTo: null,
      createdAt: new Date(),
    } as any;
    salarySource = 'individual_net_salary';
  }

  // 3. Hala bulunamadı — F27 null guard (eski davranış korunuyor)
  if (!salary) {
    console.warn('[payroll-bridge] Bordro üretilmedi: ne position_salaries ne users.netSalary var', {
      userId,
      year,
      month,
      role: u.role,
      positionCode,
      fullName,
      branchId: u.branchId,
      netSalary: u.netSalary,
      source: effectiveSource,
      reason: 'NO_SALARY_RESOLUTION',
      hint: 'Ya position_salaries\'a kayıt ekle ya da users.netSalary güncelle',
    });
    return null;
  }

  // 4. Asgari ücret koruması (4857 SK m.39)
  const minWageGross = await getMinimumWageGross(year, month);
  let originalSalary: number | undefined;
  let legalNote: string | undefined;
  if (salary.totalSalary < minWageGross) {
    originalSalary = salary.totalSalary;
    legalNote = `Hakediş ${(salary.totalSalary/100).toFixed(2)} TL asgari ücretin altındaydı; ` +
                `4857 SK m.39 uyarınca asgari ücrete (${(minWageGross/100).toFixed(2)} TL) yükseltildi.`;
    console.warn('[payroll-bridge] Asgari ücret fallback uygulandı', {
      userId, year, month, role: u.role, positionCode, fullName, branchId: u.branchId,
      originalSalary: salary.totalSalary,
      adjustedSalary: minWageGross,
      legalBasis: '4857 SK m.39',
    });
    salary = {
      ...salary,
      totalSalary: minWageGross,
      baseSalary: Math.max(minWageGross - salary.bonus, 0),
    };
    salarySource = 'minimum_wage_fallback';
  }

  // Kaynağa göre PDKS verisi
  let pdks: PdksMonthSummary;
  let resolvedImportId: number | null = null;

  if (effectiveSource === "excel") {
    const excelResult = await getExcelMonthSummary(userId, u.branchId, year, month, importId);
    pdks = excelResult.summary;
    resolvedImportId = excelResult.importId;
  } else {
    pdks = await getMonthClassification(userId, year, month);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const isTerminated = u.isActive === false;
  const cumulativeTaxBase = await getCumulativeTaxBase(userId, year, month);
  const payrollInput = mapPdksToPayrollInput(pdks, salary, cumulativeTaxBase);

  let detailed: DetailedResult;
  try {
    detailed = await calculateDetailed(payrollInput);
  } catch (err) {
    console.warn(`[PayrollBridge] Detaylı hesaplama başarısız (${userId}):`, err);
    return null;
  }

  const MEAL_ROLES = config.mealAllowanceRoles ?? ["stajyer"];
  const MEAL_PER_DAY = config.mealAllowancePerDay ?? 33000;
  const mealAllowance = MEAL_ROLES.includes(positionCode) ? pdks.workedDays * MEAL_PER_DAY : 0;
  const adjustedNet = detailed.netSalary + mealAllowance;
  const totalWorkedMinutes = pdks.days.reduce((s, d) => s + d.workedMinutes, 0);

  return {
    userId, userName: fullName, branchId: u.branchId, year, month, positionCode,
    positionName: salary.positionName,
    totalCalendarDays: daysInMonth,
    workedDays: pdks.workedDays,
    offDays: Math.min(pdks.offDays, config.maxOffDays ?? 4),
    absentDays: pdks.absentDays,
    unpaidLeaveDays: pdks.unpaidLeaveDays,
    sickLeaveDays: pdks.sickLeaveDays,
    annualLeaveDays: pdks.annualLeaveDays,
    totalWorkedMinutes, overtimeMinutes: pdks.totalOvertimeMinutes,
    holidayWorkedDays: pdks.holidayWorkedDays,
    baseSalaryGross: salary.totalSalary,
    cashBonus: Math.min(KASA_PRIMI, salary.bonus),
    performanceBonus: salary.bonus - Math.min(KASA_PRIMI, salary.bonus),
    mealAllowance,
    dailyRate: detailed.dailyRate, hourlyRate: detailed.hourlyRate,
    overtimePay: detailed.overtimePay, holidayPay: detailed.holidayPay,
    offDayPay: detailed.offDayPay, grossTotal: detailed.grossTotal,
    absenceDeduction: detailed.deficitDeduction, bonusDeduction: 0,
    sgkEmployee: detailed.sgkEmployee, unemploymentEmployee: detailed.unemploymentEmployee,
    incomeTax: detailed.incomeTax, stampTax: detailed.stampTax,
    agi: detailed.agi, totalDeductions: detailed.totalDeductions,
    netSalary: adjustedNet,
    sgkEmployer: detailed.sgkEmployer, unemploymentEmployer: detailed.unemploymentEmployer,
    totalEmployerCost: detailed.totalEmployerCost,
    isTerminated, calculationMode: "unified", dataSource: effectiveSource,
    sourceImportId: resolvedImportId, cumulativeTaxBase,
    // İK Redesign — Dual-Model tracking
    salarySource,
    originalSalary,
    legalNote,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ŞUBE BAZLI BİRLEŞİK HESAPLAMA
// ═══════════════════════════════════════════════════════════════════

export async function calculateBranchUnifiedPayroll(
  branchId: number,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {},
  dataSource: DataSource = "kiosk",
  importId?: number
): Promise<UnifiedPayrollResult[]> {
  const effectiveConfig = { ...(await loadPayrollConfig(branchId, year, month)), ...config };

  // İK Redesign 6 May 2026: tüm aktif personel (eskiden sadece 6 şube rolü)
  // HQ + Fabrika + Ofis personeli artık dual-model bordro alabilir
  const branchUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.branchId, branchId),
      eq(users.isActive, true),
      sql`${users.deletedAt} IS NULL`
    ));

  const results: UnifiedPayrollResult[] = [];
  for (const u of branchUsers) {
    const result = await calculateUnifiedPayroll(u.id, year, month, effectiveConfig, dataSource, importId);
    if (result) results.push(result);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// DB KAYIT — monthly_payroll'a unified sonuçları yaz
// ═══════════════════════════════════════════════════════════════════

export async function saveUnifiedResults(
  results: UnifiedPayrollResult[],
  dbClient: typeof db = db
): Promise<number> {
  // S-Bordro: DRY_RUN flag env'den alınır, her kayda yazılır
  const dryRun = isPayrollDryRun();
  if (dryRun) {
    console.warn(
      `[payroll-bridge] 🧪 DRY_RUN MODE ACTIVE — ${results.length} bordro kaydı yazılacak ama SGK bildirimi YAPILMAYACAK`
    );
  }

  let saved = 0;
  for (const r of results) {
    const values = {
      userId: r.userId,
      branchId: r.branchId,
      year: r.year,
      month: r.month,
      positionCode: r.positionCode,
      totalCalendarDays: r.totalCalendarDays,
      workedDays: r.workedDays,
      offDays: r.offDays,
      absentDays: r.absentDays,
      unpaidLeaveDays: r.unpaidLeaveDays,
      sickLeaveDays: r.sickLeaveDays,
      annualLeaveDays: r.annualLeaveDays,
      overtimeMinutes: r.overtimeMinutes,
      totalWorkedMinutes: r.totalWorkedMinutes,
      totalSalary: r.baseSalaryGross,
      baseSalary: r.baseSalaryGross - (r.cashBonus + r.performanceBonus),
      bonus: r.cashBonus + r.performanceBonus,
      dailyRate: r.dailyRate,
      absenceDeduction: r.absenceDeduction,
      bonusDeduction: r.bonusDeduction,
      overtimePay: r.overtimePay,
      holidayWorkedDays: r.holidayWorkedDays,
      holidayPay: r.holidayPay,
      mealAllowance: r.mealAllowance,
      netPay: r.netSalary,
      grossTotal: r.grossTotal,
      sgkEmployee: r.sgkEmployee,
      unemploymentEmployee: r.unemploymentEmployee,
      incomeTax: r.incomeTax,
      stampTax: r.stampTax,
      agi: r.agi,
      totalDeductions: r.totalDeductions,
      sgkEmployer: r.sgkEmployer,
      unemploymentEmployer: r.unemploymentEmployer,
      totalEmployerCost: r.totalEmployerCost,
      cumulativeTaxBase: r.cumulativeTaxBase,
      calculationMode: r.calculationMode,
      dataSource: r.dataSource,
      sourceImportId: r.sourceImportId,
      isDryRun: dryRun, // S-Bordro: Pilot güvenlik flag
      status: "calculated" as const,
      calculatedAt: new Date(),
    };

    await dbClient.insert(monthlyPayroll)
      .values(values)
      .onConflictDoUpdate({
        target: [monthlyPayroll.userId, monthlyPayroll.year, monthlyPayroll.month],
        set: { ...values, updatedAt: new Date() },
      });
    saved++;
  }
  return saved;
}
