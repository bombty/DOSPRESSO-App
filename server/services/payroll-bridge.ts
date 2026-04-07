/**
 * Payroll Bridge — PDKS Otomatik Sınıflandırma → Detaylı SGK/Vergi Hesaplama
 * 
 * Motor 1 (pdks-engine + payroll-engine): PDKS bağlı, basit hesap, SGK yok
 * Motor 2 (payroll-calculation-service): SGK/vergi/AGI, PDKS bağlı değil
 * 
 * Bu bridge ikisini birleştirir:
 *   PDKS Engine → classifyDay → PdksMonthSummary
 *       ↓
 *   Bridge → mapToPayrollInput
 *       ↓
 *   PayrollCalculationService → SGK + vergi + net
 */

import { db } from "../db";
import { eq, and, lt, sql } from "drizzle-orm";
import { getMonthClassification, type PdksMonthSummary } from "../lib/pdks-engine";
import { getPositionSalary, type PayrollMonthConfig, type PayrollResult as SimplePayrollResult } from "../lib/payroll-engine";
import { calculatePayroll as calculateDetailed, type PayrollInput, type PayrollResult as DetailedResult } from "./payroll-calculation-service";
import { users, monthlyPayroll, positionSalaries } from "@shared/schema";

// ─── Birleşik Sonuç Tipi ─────────────────────────────────────────

export interface UnifiedPayrollResult {
  // Kimlik
  userId: string;
  userName: string;
  branchId: number;
  year: number;
  month: number;
  positionCode: string;
  positionName: string;

  // PDKS Verileri (Motor 1)
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

  // Maaş Bileşenleri
  baseSalaryGross: number;
  cashBonus: number;
  performanceBonus: number;
  mealAllowance: number;

  // Detaylı Hesaplama (Motor 2)
  dailyRate: number;
  hourlyRate: number;
  overtimePay: number;
  holidayPay: number;
  offDayPay: number;
  grossTotal: number;
  absenceDeduction: number;
  bonusDeduction: number;

  // SGK & Vergi (Motor 2)
  sgkEmployee: number;
  unemploymentEmployee: number;
  incomeTax: number;
  stampTax: number;
  agi: number;
  totalDeductions: number;
  netSalary: number;

  // İşveren Maliyeti
  sgkEmployer: number;
  unemploymentEmployer: number;
  totalEmployerCost: number;

  // Meta
  isTerminated: boolean;
  calculationMode: "unified" | "simple";
}

// ─── Rol → Pozisyon Kodu ──────────────────────────────────────────

const ROLE_TO_POSITION: Record<string, string> = {
  stajyer: "stajyer",
  bar_buddy: "bar_buddy",
  barista: "barista",
  supervisor_buddy: "supervisor_buddy",
  supervisor: "supervisor",
  mudur: "supervisor",
};

// ─── Kümülatif Vergi Matrahı ──────────────────────────────────────

async function getCumulativeTaxBase(userId: string, year: number, month: number): Promise<number> {
  // Önceki ayların brüt toplamından SGK düşülerek hesaplanmış vergi matrahı
  // Basit yaklaşım: önceki ayların net pay toplamı × 1.3 (yaklaşık brüt/net oranı)
  // İdeal: Detaylı hesaplama yapılmış aylardan cumulativeTaxBase okumak
  // Şimdilik 0 — ilk hesaplamada Ocak'tan başlıyor varsayıyoruz
  // TODO: monthly_payrolls tablosundan (Motor 2) newCumulativeTaxBase okuma
  
  const prevMonths = await db.select({
    totalSalary: monthlyPayroll.totalSalary,
  })
  .from(monthlyPayroll)
  .where(and(
    eq(monthlyPayroll.userId, userId),
    eq(monthlyPayroll.year, year),
    sql`${monthlyPayroll.month} < ${month}`
  ));

  // Yaklaşık kümülatif matrah: brüt maaş toplamı × 0.85 (SGK sonrası)
  const totalBrut = prevMonths.reduce((sum, p) => sum + (p.totalSalary || 0), 0);
  return Math.round(totalBrut * 0.85);
}

// ─── PDKS → PayrollInput Dönüşümü ────────────────────────────────

function mapPdksToPayrollInput(
  pdks: PdksMonthSummary,
  salary: { totalSalary: number; baseSalary: number; bonus: number },
  config: Partial<PayrollMonthConfig>,
  cumulativeTaxBase: number
): PayrollInput {
  const daysInMonth = new Date(pdks.year, pdks.month, 0).getDate();
  
  // Toplam çalışılan dakika
  const workedMinutes = pdks.days.reduce((sum, d) => sum + d.workedMinutes, 0);
  
  // Beklenen dakika: planlı vardiya günleri × 8 saat
  const workingDays = daysInMonth - pdks.offDays;
  const expectedMinutes = workingDays * 480; // 8 saat × 60 dk
  
  // Eksik dakika
  const deficitMinutes = Math.max(0, expectedMinutes - workedMinutes - (pdks.totalOvertimeMinutes));
  
  // Off günlerde çalışma (program_off veya kapanish_off ama PDKS'te kayıt var)
  const offDayWorkedMinutes = pdks.days
    .filter(d => (d.status === 'program_off' || d.status === 'kapanish_off') && d.workedMinutes > 0)
    .reduce((sum, d) => sum + d.workedMinutes, 0);
  
  // Tatil günlerde çalışma
  const holidayWorkedMinutes = pdks.days
    .filter(d => d.isHoliday && d.workedMinutes > 0)
    .reduce((sum, d) => sum + d.workedMinutes, 0);
  
  // Prim ayrımı — şimdilik position_salaries'te tek "bonus" var
  // Kasa primi sabit 3500 TL (350000 kuruş) — DOSPRESSO standardı
  const KASA_PRIMI = 350000; // 3500 TL kuruş cinsinden
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

// ─── Birleşik Hesaplama ───────────────────────────────────────────

export async function calculateUnifiedPayroll(
  userId: string,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {}
): Promise<UnifiedPayrollResult | null> {
  // 1. Kullanıcı bilgisi
  const userResult = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    branchId: users.branchId,
    isActive: users.isActive,
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!userResult[0] || !userResult[0].branchId) return null;

  const u = userResult[0];
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "Bilinmiyor";
  const positionCode = ROLE_TO_POSITION[u.role] || "barista";

  // 2. Pozisyon maaşı
  const salary = await getPositionSalary(positionCode, year, month);
  if (!salary) return null;

  // 3. PDKS sınıflandırması
  const pdks = await getMonthClassification(userId, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const isTerminated = u.isActive === false;

  // 4. Kümülatif vergi matrahı
  const cumulativeTaxBase = await getCumulativeTaxBase(userId, year, month);

  // 5. PDKS → PayrollInput dönüşümü
  const payrollInput = mapPdksToPayrollInput(pdks, salary, config, cumulativeTaxBase);

  // 6. Detaylı hesaplama (SGK + Vergi + AGI)
  let detailed: DetailedResult;
  try {
    detailed = await calculateDetailed(payrollInput);
  } catch (err) {
    // Payroll parametreleri yoksa basit moda düş
    console.warn(`[PayrollBridge] Detaylı hesaplama başarısız (${userId}), basit mod kullanılıyor:`, err);
    return null; // Caller basit motoru kullanır
  }

  // 7. Yemek bedeli (Motor 1'den)
  const MEAL_ROLES = config.mealAllowanceRoles ?? ["stajyer"];
  const MEAL_PER_DAY = config.mealAllowancePerDay ?? 33000;
  const mealAllowance = MEAL_ROLES.includes(positionCode)
    ? pdks.workedDays * MEAL_PER_DAY
    : 0;

  // Net'e yemek bedeli ekle (vergisiz yan haklar)
  const adjustedNet = detailed.netSalary + mealAllowance;

  return {
    userId,
    userName: fullName,
    branchId: u.branchId,
    year,
    month,
    positionCode,
    positionName: salary.positionName,

    // PDKS
    totalCalendarDays: daysInMonth,
    workedDays: pdks.workedDays,
    offDays: Math.min(pdks.offDays, 4),
    absentDays: pdks.absentDays,
    unpaidLeaveDays: pdks.unpaidLeaveDays,
    sickLeaveDays: pdks.sickLeaveDays,
    annualLeaveDays: pdks.annualLeaveDays,
    totalWorkedMinutes: pdks.days.reduce((s, d) => s + d.workedMinutes, 0),
    overtimeMinutes: pdks.totalOvertimeMinutes,
    holidayWorkedDays: pdks.holidayWorkedDays,

    // Maaş
    baseSalaryGross: salary.totalSalary,
    cashBonus: payrollInput.cashBonus,
    performanceBonus: payrollInput.performanceBonus,
    mealAllowance,

    // Hesaplama
    dailyRate: detailed.dailyRate,
    hourlyRate: detailed.hourlyRate,
    overtimePay: detailed.overtimePay,
    holidayPay: detailed.holidayPay,
    offDayPay: detailed.offDayPay,
    grossTotal: detailed.grossTotal,
    absenceDeduction: detailed.deficitDeduction,
    bonusDeduction: 0, // detaylı motorda ayrı hesaplanmıyor

    // SGK & Vergi
    sgkEmployee: detailed.sgkEmployee,
    unemploymentEmployee: detailed.unemploymentEmployee,
    incomeTax: detailed.incomeTax,
    stampTax: detailed.stampTax,
    agi: detailed.agi,
    totalDeductions: detailed.totalDeductions,
    netSalary: adjustedNet,

    // İşveren
    sgkEmployer: detailed.sgkEmployer,
    unemploymentEmployer: detailed.unemploymentEmployer,
    totalEmployerCost: detailed.totalEmployerCost,

    // Meta
    isTerminated,
    calculationMode: "unified",
  };
}

// ─── Şube Bazlı Birleşik Hesaplama ───────────────────────────────

export async function calculateBranchUnifiedPayroll(
  branchId: number,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {}
): Promise<UnifiedPayrollResult[]> {
  const branchUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.branchId, branchId),
      sql`${users.role} IN ('stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'mudur')`
    ));

  const results: UnifiedPayrollResult[] = [];
  for (const u of branchUsers) {
    const result = await calculateUnifiedPayroll(u.id, year, month, config);
    if (result) results.push(result);
  }

  return results;
}
