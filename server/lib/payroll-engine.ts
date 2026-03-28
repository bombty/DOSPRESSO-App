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
  totalSalary: number;
  baseSalary: number;
  bonus: number;
  dailyRate: number;
  absenceDeduction: number;
  bonusDeduction: number;
  overtimePay: number;
  netPay: number;
  isTerminated: boolean;
}

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
  month: number
): Promise<PayrollResult | null> {
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

  const dailyRate = Math.round(salary.totalSalary / 30);
  const hourlyRate = Math.round(salary.totalSalary / 240);

  let absenceDeduction = 0;
  if (classification.absentDays > 0) {
    // Devamsızlık kesintisi: devamsız gün × günlük ücret
    // Not: Önceki formül (absentDays + 1) fazla kesinti yapıyordu
    absenceDeduction = classification.absentDays * dailyRate;
  }

  let bonusDeduction = 0;
  if (classification.unpaidLeaveDays > 0) {
    bonusDeduction = Math.round((classification.unpaidLeaveDays / 30) * salary.bonus);
  }

  const overtimePay = Math.round((classification.totalOvertimeMinutes / 60) * hourlyRate * 1.5);

  let netPay: number;
  if (isTerminated) {
    netPay = classification.workedDays * dailyRate + overtimePay;
  } else {
    netPay = salary.totalSalary - absenceDeduction - bonusDeduction + overtimePay;
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
    totalSalary: salary.totalSalary,
    baseSalary: salary.baseSalary,
    bonus: salary.bonus,
    dailyRate,
    absenceDeduction,
    bonusDeduction,
    overtimePay,
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
