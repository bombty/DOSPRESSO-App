import { db } from "../db";
import { sql } from "drizzle-orm";

export interface PayrollInput {
  baseSalaryGross: number;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  deficitMinutes: number;
  unauthorizedAbsentDays: number;
  offDayWorkedMinutes: number;
  holidayWorkedMinutes: number;
  salesBonus: number;
  cashBonus: number;
  performanceBonus: number;
  cumulativeTaxBase: number;
}

export interface PayrollResult {
  baseSalary: number;
  dailyRate: number;
  hourlyRate: number;
  overtimePay: number;
  offDayPay: number;
  holidayPay: number;
  totalBonuses: number;
  grossTotal: number;
  deficitDeduction: number;
  sgkEmployee: number;
  unemploymentEmployee: number;
  incomeTax: number;
  stampTax: number;
  totalDeductions: number;
  /**
   * 2026 mevzuatı: AGI kaldırıldı, yerine "asgari ücrete kadar gelir vergisi
   * + damga vergisi muafiyeti" geldi. `agi` alanı geriye uyumluluk için
   * incomeTaxExemption + stampTaxExemption toplamı olarak korunur.
   */
  agi: number;
  incomeTaxExemption: number;
  stampTaxExemption: number;
  netSalary: number;
  sgkEmployer: number;
  unemploymentEmployer: number;
  totalEmployerCost: number;
  newCumulativeTaxBase: number;
}

interface PayrollParams {
  minimumWageGross: number;
  sgkEmployeeRate: number;
  sgkEmployerRate: number;
  unemploymentEmployeeRate: number;
  unemploymentEmployerRate: number;
  stampTaxRate: number;
  taxBrackets: Array<{ limit: number; rate: number }>;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  overtimeMultiplier: number;
  mealAllowanceTaxExemptDaily: number;
  sgkCeiling?: number;
}

async function getPayrollParams(): Promise<PayrollParams> {
  const result = await db.execute(sql`
    SELECT * FROM payroll_parameters 
    WHERE is_active = true 
    ORDER BY year DESC 
    LIMIT 1
  `);

  const row = result.rows[0];
  if (!row) throw new Error("Aktif bordro parametresi bulunamadı");

  const toRate = (val: number) => val / 1000;
  const toPerMilleRate = (val: number) => val / 100000;
  const toAmount = (val: number) => val / 100;

  const brackets: Array<{ limit: number; rate: number }> = [];
  for (let i = 1; i <= 5; i++) {
    const limitKey = `tax_bracket_${i}_limit`;
    const rateKey = `tax_bracket_${i}_rate`;
    if (row[rateKey]) {
      brackets.push({
        limit: row[limitKey] ? toAmount(Number(row[limitKey])) : Infinity,
        rate: toRate(Number(row[rateKey])),
      });
    }
  }

  return {
    minimumWageGross: toAmount(Number(row.minimum_wage_gross)),
    sgkEmployeeRate: toRate(Number(row.sgk_employee_rate)),
    sgkEmployerRate: toRate(Number(row.sgk_employer_rate)),
    unemploymentEmployeeRate: toRate(Number(row.unemployment_employee_rate)),
    unemploymentEmployerRate: toRate(Number(row.unemployment_employer_rate)),
    stampTaxRate: toPerMilleRate(Number(row.stamp_tax_rate)),
    taxBrackets: brackets,
    workingDaysPerMonth: Number(row.working_days_per_month) || 30,
    workingHoursPerDay: Number(row.working_hours_per_day) || 7.5,
    overtimeMultiplier: Number(row.overtime_multiplier) || 150,
    mealAllowanceTaxExemptDaily: toAmount(Number(row.meal_allowance_tax_exempt_daily || 0)),
  };
}

function calculateIncomeTax(
  taxableIncome: number,
  cumulativeBase: number,
  brackets: Array<{ limit: number; rate: number }>
): { tax: number; newCumulativeBase: number } {
  let remaining = taxableIncome;
  let tax = 0;
  let currentBase = cumulativeBase;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketSpace = Math.max(0, bracket.limit - currentBase);
    if (bracketSpace <= 0) continue;
    const taxable = Math.min(remaining, bracketSpace);
    tax += taxable * bracket.rate;
    currentBase += taxable;
    remaining -= taxable;
  }

  if (remaining > 0 && brackets.length > 0) {
    const lastRate = brackets[brackets.length - 1].rate;
    tax += remaining * lastRate;
    currentBase += remaining;
  }

  return {
    tax: Math.round(tax),
    newCumulativeBase: currentBase,
  };
}

export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const params = await getPayrollParams();

  const dailyRate = Math.round(input.baseSalaryGross / params.workingDaysPerMonth);
  const hourlyRate = Math.round(dailyRate / params.workingHoursPerDay);

  const overtimeRate = params.overtimeMultiplier / 100;
  const overtimePay = Math.round((input.overtimeMinutes / 60) * hourlyRate * overtimeRate);
  const offDayPay = Math.round((input.offDayWorkedMinutes / 60) * hourlyRate * 1.5);
  const holidayPay = Math.round((input.holidayWorkedMinutes / 60) * hourlyRate * 2.0);

  const deficitDeduction = Math.round(input.unauthorizedAbsentDays * dailyRate);

  const totalBonuses = input.salesBonus + input.cashBonus + input.performanceBonus;

  const grossTotal = input.baseSalaryGross + overtimePay + offDayPay + holidayPay + totalBonuses - deficitDeduction;

  const sgkEmployee = Math.round(grossTotal * params.sgkEmployeeRate);
  const unemploymentEmployee = Math.round(grossTotal * params.unemploymentEmployeeRate);

  const taxableIncome = grossTotal - sgkEmployee - unemploymentEmployee;

  const { tax: incomeTax, newCumulativeBase } = calculateIncomeTax(
    taxableIncome,
    input.cumulativeTaxBase,
    params.taxBrackets
  );

  const stampTax = Math.round(grossTotal * params.stampTaxRate);

  // 2026 mevzuatı: AGI kaldırıldı; asgari ücret kadar gelir vergisi + damga
  // vergisi muafiyeti uygulanır. Cumulative bracket'leri doğru kullanarak
  // asgari ücret üzerinden hesaplanan gelir vergisi kadar muafiyet, ve
  // asgari ücretin damga vergisi kadar damga muafiyeti net maaşa eklenir.
  // Muafiyet, çalışanın hesaplanan vergisinden büyük olamaz (max 0 sınırı).
  const minWageSgk = Math.round(params.minimumWageGross * params.sgkEmployeeRate);
  const minWageUnemployment = Math.round(params.minimumWageGross * params.unemploymentEmployeeRate);
  const minWageTaxable = Math.max(0, params.minimumWageGross - minWageSgk - minWageUnemployment);
  const { tax: minWageIncomeTax } = calculateIncomeTax(
    minWageTaxable,
    input.cumulativeTaxBase,
    params.taxBrackets
  );
  const incomeTaxExemption = Math.min(incomeTax, minWageIncomeTax);
  const minWageStampTax = Math.round(params.minimumWageGross * params.stampTaxRate);
  const stampTaxExemption = Math.min(stampTax, minWageStampTax);
  const agi = incomeTaxExemption + stampTaxExemption;

  const totalDeductions = sgkEmployee + unemploymentEmployee + incomeTax + stampTax;
  const netSalary = grossTotal - totalDeductions + agi;

  const sgkEmployer = Math.round(grossTotal * params.sgkEmployerRate);
  const unemploymentEmployer = Math.round(grossTotal * params.unemploymentEmployerRate);
  const totalEmployerCost = grossTotal + sgkEmployer + unemploymentEmployer;

  return {
    baseSalary: input.baseSalaryGross,
    dailyRate,
    hourlyRate,
    overtimePay,
    offDayPay,
    holidayPay,
    totalBonuses,
    grossTotal,
    deficitDeduction,
    sgkEmployee,
    unemploymentEmployee,
    incomeTax,
    stampTax,
    totalDeductions,
    agi,
    incomeTaxExemption,
    stampTaxExemption,
    netSalary,
    sgkEmployer,
    unemploymentEmployer,
    totalEmployerCost,
    newCumulativeTaxBase: newCumulativeBase,
  };
}

export { getPayrollParams };
