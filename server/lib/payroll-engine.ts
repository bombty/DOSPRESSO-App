import { db } from "../db";
import { positionSalaries, monthlyPayroll, users, branches } from "@shared/schema";
import { eq, and, lte, isNull, or, sql } from "drizzle-orm";
import { getMonthClassification } from "./pdks-engine";

export interface PayrollResult {
  userId: string;
  userName: string;
  branchId: number;
  year: number;
  month: number;
  positionCode: string;
  positionName: string;
  totalCalendarDays: number;
  workedDays: number;
  offDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  overtimeMinutes: number;
  holidayWorkedDays: number;
  totalSalary: number;
  baseSalary: number;
  bonus: number;
  dailyRate: number;
  absenceDeduction: number;
  bonusDeduction: number;
  overtimePay: number;
  holidayPay: number;
  mealAllowance: number;
  netPay: number;
  isTerminated: boolean;
}

/** Aylık bordro konfigürasyonu — ileride payroll_month_config tablosundan okunacak */
export interface PayrollMonthConfig {
  absencePenaltyPlusOne: boolean;   // "+1 ceza" kuralı
  mealAllowancePerDay: number;      // yemek bedeli TL/gün (kuruş cinsinden)
  mealAllowanceRoles: string[];     // hangi roller alır
  holidayMultiplier: number;        // tatil çarpanı (1.0 veya 2.0)
}

const DEFAULT_CONFIG: PayrollMonthConfig = {
  absencePenaltyPlusOne: false,
  mealAllowancePerDay: 33000,       // 330 TL = 33000 kuruş
  mealAllowanceRoles: ['stajyer'],
  holidayMultiplier: 1.0,           // Excel'de ×1 uygulanıyordu
};

const ROLE_TO_POSITION: Record<string, string> = {
  stajyer: 'stajyer',
  bar_buddy: 'bar_buddy',
  barista: 'barista',
  supervisor_buddy: 'supervisor_buddy',
  supervisor: 'supervisor',
  mudur: 'supervisor',
};

export async function getPositionSalary(positionCode: string, year: number, month: number) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;

  const result = await db.select()
    .from(positionSalaries)
    .where(and(
      eq(positionSalaries.positionCode, positionCode),
      lte(positionSalaries.effectiveFrom, dateStr),
      or(
        isNull(positionSalaries.effectiveTo),
        sql`${positionSalaries.effectiveTo} >= ${dateStr}`
      )
    ))
    .limit(1);

  return result[0] || null;
}

export async function calculatePayroll(
  userId: string,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {}
): Promise<PayrollResult | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const user = await db.select({
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

  if (!user[0] || !user[0].branchId) return null;

  const u = user[0];
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Bilinmiyor';
  const positionCode = ROLE_TO_POSITION[u.role] || 'barista';
  const salary = await getPositionSalary(positionCode, year, month);
  if (!salary) return null;

  const classification = await getMonthClassification(userId, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const effectiveOffDays = Math.min(classification.offDays, 4);
  const isTerminated = u.isActive === false;

  // İş Kanunu Md.49: Günlük ücret = Aylık maaş ÷ 30
  const dailyRate = Math.round(salary.totalSalary / 30);
  // Saatlik ücret = Aylık maaş ÷ 240 (30 gün × 8 saat)
  const hourlyRate = Math.round(salary.totalSalary / 240);

  // ── Devamsızlık Kesintisi ──
  let absenceDeduction = 0;
  if (classification.absentDays > 0) {
    if (cfg.absencePenaltyPlusOne) {
      // "+1 ceza" kuralı: eksik gün + 1 günlük kesinti
      absenceDeduction = (classification.absentDays + 1) * dailyRate;
    } else {
      absenceDeduction = classification.absentDays * dailyRate;
    }
  }

  // ── Prim Kesintisi (Ücretsiz İzin) ──
  let bonusDeduction = 0;
  if (classification.unpaidLeaveDays > 0) {
    bonusDeduction = Math.round((classification.unpaidLeaveDays / 30) * salary.bonus);
  }

  // ── Fazla Mesai (FM eşik pdks-engine'de uygulanıyor: 30 dk altı 0) ──
  const overtimePay = Math.round((classification.totalOvertimeMinutes / 60) * hourlyRate * 1.5);

  // ── Tatil/Bayram Mesai ──
  const holidayPay = Math.round(classification.holidayWorkedDays * dailyRate * cfg.holidayMultiplier);

  // ── Yemek Bedeli (pozisyon bazlı) ──
  const mealAllowance = cfg.mealAllowanceRoles.includes(positionCode)
    ? classification.workedDays * cfg.mealAllowancePerDay
    : 0;

  // ── Net Hesap ──
  let netPay: number;
  if (isTerminated) {
    // İşten ayrılan: çalışılan gün × günlük ücret + yemek
    netPay = classification.workedDays * dailyRate + mealAllowance;
  } else {
    netPay = salary.totalSalary
      - absenceDeduction
      - bonusDeduction
      + overtimePay
      + holidayPay
      + mealAllowance;
  }
  if (netPay < 0) netPay = 0;

  return {
    userId,
    userName: fullName,
    branchId: u.branchId,
    year,
    month,
    positionCode,
    positionName: salary.positionName,
    totalCalendarDays: daysInMonth,
    workedDays: classification.workedDays,
    offDays: effectiveOffDays,
    absentDays: classification.absentDays,
    unpaidLeaveDays: classification.unpaidLeaveDays,
    sickLeaveDays: classification.sickLeaveDays,
    overtimeMinutes: classification.totalOvertimeMinutes,
    holidayWorkedDays: classification.holidayWorkedDays,
    totalSalary: salary.totalSalary,
    baseSalary: salary.baseSalary,
    bonus: salary.bonus,
    dailyRate,
    absenceDeduction,
    bonusDeduction,
    overtimePay,
    holidayPay,
    mealAllowance,
    netPay,
    isTerminated
  };
}

export async function calculateBranchPayroll(
  branchId: number,
  year: number,
  month: number
): Promise<PayrollResult[]> {
  const branchUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.branchId, branchId),
      sql`${users.role} IN ('stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'supervisor', 'mudur')`
    ));

  const results: PayrollResult[] = [];
  for (const u of branchUsers) {
    const result = await calculatePayroll(u.id, year, month);
    if (result) results.push(result);
  }

  return results;
}

export async function savePayrollResults(results: PayrollResult[], dbClient: typeof db = db): Promise<number> {
  let saved = 0;
  for (const r of results) {
    await dbClient.insert(monthlyPayroll)
      .values({
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
        overtimeMinutes: r.overtimeMinutes,
        totalSalary: r.totalSalary,
        baseSalary: r.baseSalary,
        bonus: r.bonus,
        dailyRate: r.dailyRate,
        absenceDeduction: r.absenceDeduction,
        bonusDeduction: r.bonusDeduction,
        overtimePay: r.overtimePay,
        holidayWorkedDays: r.holidayWorkedDays,
        holidayPay: r.holidayPay,
        mealAllowance: r.mealAllowance,
        netPay: r.netPay,
        status: 'calculated',
        calculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [monthlyPayroll.userId, monthlyPayroll.year, monthlyPayroll.month],
        set: {
          branchId: r.branchId,
          positionCode: r.positionCode,
          totalCalendarDays: r.totalCalendarDays,
          workedDays: r.workedDays,
          offDays: r.offDays,
          absentDays: r.absentDays,
          unpaidLeaveDays: r.unpaidLeaveDays,
          sickLeaveDays: r.sickLeaveDays,
          overtimeMinutes: r.overtimeMinutes,
          totalSalary: r.totalSalary,
          baseSalary: r.baseSalary,
          bonus: r.bonus,
          dailyRate: r.dailyRate,
          absenceDeduction: r.absenceDeduction,
          bonusDeduction: r.bonusDeduction,
          overtimePay: r.overtimePay,
          holidayWorkedDays: r.holidayWorkedDays,
          holidayPay: r.holidayPay,
          mealAllowance: r.mealAllowance,
          netPay: r.netPay,
          status: 'calculated',
          calculatedAt: new Date(),
          updatedAt: new Date(),
        }
      });
    saved++;
  }
  return saved;
}
