import { db } from "../db";
import { positionSalaries, monthlyPayroll, users, branches, payrollParameters } from "@shared/schema";
import { eq, and, lte, isNull, or, sql, desc } from "drizzle-orm";
import { getMonthClassification } from "./pdks-engine";
import { 
  netToGross, 
  grossToNet,
  getMinimumWageNet as getMinNet2026Hardcoded,
  type PayrollBreakdown 
} from "./tax-calculator";

// ═══════════════════════════════════════════════════════════════════
// İK REDESIGN — DUAL-MODEL PAYROLL ENGINE (6 Mayıs 2026)
// ═══════════════════════════════════════════════════════════════════
// 
// Önceki tek-model: position_salaries lookup (sadece şube rolleri)
// Yeni dual-model: 
//   1. Lara modeli: position_salaries (Stajyer/BarBuddy/Barista/SupBuddy/Sup)
//   2. Custom modeli: users.netSalary (HQ + Fabrika + Ofis kişiye özel)
// 
// Asgari ücret koruması (4857 SK m.39):
//   final_salary = MAX(resolved_salary, payroll_parameters.minimum_wage_gross)
// 
// PayrollResult.salarySource:
//   'position_matrix'        → Lara matrisinden geldi
//   'individual_net_salary'  → users.netSalary'den geldi
//   'minimum_wage_fallback'  → asgari ücret altıydı, kanuni minimum uygulandı
// 
// ═══════════════════════════════════════════════════════════════════

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
  // ─── İK Redesign 6 May 2026 — yeni alanlar ───
  salarySource: 'position_matrix' | 'individual_net_salary' | 'minimum_wage_fallback';
  originalSalary?: number;  // asgari ücret fallback öncesi orjinal değer (audit için)
  legalNote?: string;       // compliance açıklaması (UI'da gösterilebilir)
  // ─── Sprint 9 Net/Brüt Refactor (6 May 2026, D-40 v2) ───
  /** Brüt maaş (kuruş) — net→brüt TR 2026 vergi sistemi iteratif hesabı */
  grossSalary?: number;
  /** SGK primi işçi payı (kuruş) — brüt × %14 */
  sgkPrimi?: number;
  /** İşsizlik sigortası işçi payı (kuruş) — brüt × %1 */
  unemploymentPrimi?: number;
  /** Toplam SGK kesintisi (kuruş) — SGK + işsizlik */
  totalSgkDeduction?: number;
  /** Gelir vergisi (kuruş) — asgari ücret istisnası sonrası */
  incomeTax?: number;
  /** Damga vergisi (kuruş) — asgari ücret istisnası sonrası */
  stampDuty?: number;
  /** Toplam yasal kesinti (kuruş) — SGK + gelir vergisi + damga */
  totalLegalDeductions?: number;
}

/** Aylık bordro konfigürasyonu — payroll_deduction_config tablosundan okunur */
export interface PayrollMonthConfig {
  absencePenaltyPlusOne: boolean;
  mealAllowancePerDay: number;       // kuruş cinsinden
  mealAllowanceRoles: string[];
  holidayMultiplier: number;         // 1.0 veya 2.0
  overtimeThresholdMinutes: number;  // FM eşiği (dk)
  overtimeMultiplier: number;        // 150 = ×1.5
  lateToleranceMinutes: number;      // geç kalma toleransı
  deficitToleranceMinutes: number;   // eksik saat toleransı
  maxOffDays: number;
  dailyRateDivisor: number;          // İş Kanunu: 30
  unpaidLeaveBonusDeduction: boolean;
}

const DEFAULT_CONFIG: PayrollMonthConfig = {
  absencePenaltyPlusOne: false,
  mealAllowancePerDay: 33000,
  mealAllowanceRoles: ['stajyer'],
  holidayMultiplier: 1.0,
  overtimeThresholdMinutes: 30,
  overtimeMultiplier: 150,
  lateToleranceMinutes: 15,
  deficitToleranceMinutes: 15,
  maxOffDays: 4,
  dailyRateDivisor: 30,
  unpaidLeaveBonusDeduction: true,
};

/** DB'den şube+dönem bazlı konfigürasyon yükle (cascade: şube→genel→varsayılan) */
export async function loadPayrollConfig(branchId: number, year: number, month: number): Promise<PayrollMonthConfig> {
  try {
    const { getEffectiveConfig } = await import("../routes/payroll-config");
    const dbConfig = await getEffectiveConfig(branchId, year, month);
    return {
      absencePenaltyPlusOne: dbConfig.absencePenaltyPlusOne ?? DEFAULT_CONFIG.absencePenaltyPlusOne,
      mealAllowancePerDay: dbConfig.mealAllowancePerDay ?? DEFAULT_CONFIG.mealAllowancePerDay,
      mealAllowanceRoles: dbConfig.mealAllowanceRoles ?? DEFAULT_CONFIG.mealAllowanceRoles,
      holidayMultiplier: (dbConfig.holidayMultiplier ?? 100) / 100,
      overtimeThresholdMinutes: dbConfig.overtimeThresholdMinutes ?? DEFAULT_CONFIG.overtimeThresholdMinutes,
      overtimeMultiplier: dbConfig.overtimeMultiplier ?? DEFAULT_CONFIG.overtimeMultiplier,
      lateToleranceMinutes: dbConfig.lateToleranceMinutes ?? DEFAULT_CONFIG.lateToleranceMinutes,
      deficitToleranceMinutes: dbConfig.deficitToleranceMinutes ?? DEFAULT_CONFIG.deficitToleranceMinutes,
      maxOffDays: dbConfig.maxOffDays ?? DEFAULT_CONFIG.maxOffDays,
      dailyRateDivisor: dbConfig.dailyRateDivisor ?? DEFAULT_CONFIG.dailyRateDivisor,
      unpaidLeaveBonusDeduction: dbConfig.unpaidLeaveBonusDeduction ?? DEFAULT_CONFIG.unpaidLeaveBonusDeduction,
    };
  } catch {
    // DB'de tablo yoksa veya hata olursa varsayılan kullan
    return DEFAULT_CONFIG;
  }
}

/**
 * Kullanıcı rolünü Lara position_salaries position_code'una map eder.
 * `intern` (DB'de seed edilen kod) eski 'stajyer' role enum'u ile alias.
 */
const ROLE_TO_POSITION: Record<string, string> = {
  stajyer: 'intern',
  bar_buddy: 'bar_buddy',
  barista: 'barista',
  supervisor_buddy: 'supervisor_buddy',
  supervisor: 'supervisor',
  mudur: 'supervisor',  // Müdür = Supervisor seviyesi (Lara modeli için)
};

/**
 * position_salaries tablosundan dönem bazlı pozisyon ücretini getirir.
 * Lara modeli (matrix-based) için kullanılır.
 */
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

// ─────────────────────────────────────────────────────────────────────
// İK REDESIGN — Yeni helper'lar (6 May 2026)
// ─────────────────────────────────────────────────────────────────────

/**
 * Aktif yıl/ay için payroll_parameters'dan asgari ücret değerini döner.
 * 4857 SK m.39: hiçbir bordro asgari ücretten düşük olamaz.
 */
export async function getMinimumWageGross(year: number, month: number): Promise<number> {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const result = await db.select({
    minimumWageGross: payrollParameters.minimumWageGross,
  })
    .from(payrollParameters)
    .where(and(
      eq(payrollParameters.year, year),
      lte(payrollParameters.effectiveFrom, dateStr),
      or(
        isNull(payrollParameters.effectiveTo),
        sql`${payrollParameters.effectiveTo} >= ${dateStr}`
      ),
      eq(payrollParameters.isActive, true)
    ))
    .orderBy(desc(payrollParameters.effectiveFrom))
    .limit(1);

  if (!result[0]?.minimumWageGross) {
    // Fallback: 2026 brüt asgari ücret hardcoded son emniyet
    console.warn('[payroll-engine] payroll_parameters.minimum_wage_gross bulunamadı', { year, month });
    return 3303000; // 33.030,00 TL kuruş cinsinden
  }
  return result[0].minimumWageGross;
}

/**
 * Aktif yıl/ay için payroll_parameters'dan NET asgari ücret değerini döner.
 * Sprint 9 yeni helper (D-40 v2): Asgari ücret kontrolü NET cinsinden yapılır.
 * 
 * 4857 SK m.39: hiçbir net hakediş net asgari ücretten düşük olamaz.
 * 2026: Brüt 33.030 TL → Net 28.075,50 TL (RG 26.12.2025/33119, TÜRMOB)
 */
export async function getMinimumWageNet(year: number, month: number): Promise<number> {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const result = await db.select({
    minimumWageNet: payrollParameters.minimumWageNet,
  })
    .from(payrollParameters)
    .where(and(
      eq(payrollParameters.year, year),
      lte(payrollParameters.effectiveFrom, dateStr),
      or(
        isNull(payrollParameters.effectiveTo),
        sql`${payrollParameters.effectiveTo} >= ${dateStr}`
      ),
      eq(payrollParameters.isActive, true)
    ))
    .orderBy(desc(payrollParameters.effectiveFrom))
    .limit(1);

  if (!result[0]?.minimumWageNet) {
    // Fallback: tax-calculator hardcoded 2026 değeri (28.075,50 TL = 2.807.550 kuruş)
    console.warn('[payroll-engine] payroll_parameters.minimum_wage_net bulunamadı, hardcoded 2026 kullanılıyor', { year, month });
    return getMinNet2026Hardcoded(year);
  }
  return result[0].minimumWageNet;
}

/**
 * Custom-individual modeli için users.netSalary tabanlı bir
 * "salary objesi" üretir (positionSalaries result yapısıyla aynı şekilde).
 * 
 * netSalary = aylık standart hakediş (Mahmut'un Çizerge "HAKEDİŞ" kolonu)
 * mealAllowance + transportAllowance bilgi amaçlı, hesaba doğrudan girmez
 * (engine zaten yemek allowance'ı config'den hesaplıyor).
 */
function buildIndividualSalary(user: {
  netSalary: number | null;
  bonusBase: number | null;
}): { totalSalary: number; baseSalary: number; bonus: number; positionName: string } | null {
  if (!user.netSalary || user.netSalary <= 0) return null;
  const totalSalary = user.netSalary;
  const bonus = user.bonusBase ?? 0;
  const baseSalary = Math.max(totalSalary - bonus, 0);
  return {
    totalSalary,
    baseSalary,
    bonus,
    positionName: 'Kişiye Özel Hakediş',
  };
}

// ─────────────────────────────────────────────────────────────────────

export async function calculatePayroll(
  userId: string,
  year: number,
  month: number,
  config: Partial<PayrollMonthConfig> = {}
): Promise<PayrollResult | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // İK redesign: users select'ine netSalary + bonusBase eklendi
  const user = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    branchId: users.branchId,
    isActive: users.isActive,
    netSalary: users.netSalary,
    bonusBase: users.bonusBase,
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (!user[0] || !user[0].branchId) return null;

  const u = user[0];
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Bilinmiyor';

  // ─── Dual-model salary resolution ───
  const positionCode = ROLE_TO_POSITION[u.role] || u.role; // fallback: role'ün kendisi
  let salarySource: PayrollResult['salarySource'] = 'position_matrix';
  let positionName: string;
  let resolvedTotal: number;
  let resolvedBase: number;
  let resolvedBonus: number;

  // 1. Position matrix lookup (Lara modeli)
  const matrixSalary = await getPositionSalary(positionCode, year, month);

  if (matrixSalary) {
    // ✓ Lara modeli aktif
    salarySource = 'position_matrix';
    positionName = matrixSalary.positionName;
    resolvedTotal = matrixSalary.totalSalary;
    resolvedBase = matrixSalary.baseSalary;
    resolvedBonus = matrixSalary.bonus;
  } else {
    // 2. Custom individual fallback (users.netSalary)
    const individualSalary = buildIndividualSalary({
      netSalary: u.netSalary ?? null,
      bonusBase: u.bonusBase ?? null,
    });

    if (individualSalary) {
      // ✓ Kişiye özel hakediş aktif
      salarySource = 'individual_net_salary';
      positionName = individualSalary.positionName;
      resolvedTotal = individualSalary.totalSalary;
      resolvedBase = individualSalary.baseSalary;
      resolvedBonus = individualSalary.bonus;
    } else {
      // ✗ Hem position lookup hem netSalary boş
      // F27 fix korunuyor: structured warn log + null return
      console.warn('[payroll-engine] Bordro üretilmedi: ne position_salaries ne users.netSalary var', {
        userId,
        year,
        month,
        role: u.role,
        positionCode,
        fullName,
        branchId: u.branchId,
        netSalary: u.netSalary,
        reason: 'NO_SALARY_RESOLUTION',
        hint: 'Ya position_salaries\'a kayıt ekle ya da users.netSalary güncelle',
      });
      return null;
    }
  }

  // 3. Asgari ücret koruması (4857 SK m.39) — NET cinsinden (Sprint 9, D-40 v2)
  // 
  // ÖNCEKI BUG: minWageGross (33.030 BRÜT) ile resolvedTotal (NET) karşılaştırılıyordu
  //              → Stajyer 33.000 NET < 33.030 BRÜT TRUE çıkıyordu (matematik yanlış)
  // 
  // DÜZELTME: minWageNet (28.075,50 NET) ile resolvedTotal (NET) karşılaştırılıyor
  //           → Stajyer 33.000 NET > 28.075,50 NET FALSE → fallback uygulanmaz ✓
  const minWageNet = await getMinimumWageNet(year, month);
  let originalSalary: number | undefined;
  let legalNote: string | undefined;
  if (resolvedTotal < minWageNet) {
    originalSalary = resolvedTotal;
    legalNote = `Net hakediş ${(resolvedTotal/100).toFixed(2)} TL net asgari ücretin (${(minWageNet/100).toFixed(2)} TL) altındaydı; ` +
                `4857 SK m.39 uyarınca net asgari ücrete yükseltildi.`;
    console.warn('[payroll-engine] Asgari ücret fallback uygulandı (NET)', {
      userId, year, month, role: u.role, positionCode, fullName, branchId: u.branchId,
      originalNetSalary: resolvedTotal,
      adjustedNetSalary: minWageNet,
      legalBasis: '4857 SK m.39 (NET cinsinden, D-40 v2)',
    });
    // Bonus'u koru, base = total - bonus
    resolvedTotal = minWageNet;
    resolvedBase = Math.max(minWageNet - resolvedBonus, 0);
    salarySource = 'minimum_wage_fallback';
  }

  // ─── PDKS sınıflandırması (eksik gün/FM/tatil çalışması) ───
  const classification = await getMonthClassification(userId, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const effectiveOffDays = Math.min(classification.offDays, cfg.maxOffDays);
  const isTerminated = u.isActive === false;

  // İş Kanunu Md.49: Günlük ücret = Aylık maaş ÷ bölen (varsayılan 30)
  const divisor = cfg.dailyRateDivisor;
  const dailyRate = Math.round(resolvedTotal / divisor);
  // Saatlik ücret = Aylık maaş ÷ (bölen × 8)
  const hourlyRate = Math.round(resolvedTotal / (divisor * 8));

  // ── Devamsızlık Kesintisi ──
  let absenceDeduction = 0;
  if (classification.absentDays > 0) {
    if (cfg.absencePenaltyPlusOne) {
      // "+1 ceza" kuralı: eksik gün + 1 günlük kesinti (Lara Şubat duyurusu)
      absenceDeduction = (classification.absentDays + 1) * dailyRate;
    } else {
      absenceDeduction = classification.absentDays * dailyRate;
    }
  }

  // ── Prim Kesintisi (Ücretsiz İzin) ──
  let bonusDeduction = 0;
  if (cfg.unpaidLeaveBonusDeduction && classification.unpaidLeaveDays > 0) {
    bonusDeduction = Math.round((classification.unpaidLeaveDays / divisor) * resolvedBonus);
  }

  // ── Fazla Mesai (FM eşik pdks-engine'de uygulanıyor: 30 dk altı 0) ──
  const overtimePay = Math.round((classification.totalOvertimeMinutes / 60) * hourlyRate * (cfg.overtimeMultiplier / 100));

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
    netPay = resolvedTotal
      - absenceDeduction
      - bonusDeduction
      + overtimePay
      + holidayPay
      + mealAllowance;
  }
  if (netPay < 0) netPay = 0;

  // ─── Sprint 9 (D-40 v2): Net→Brüt dönüşümü ve yasal kesintiler ───
  // resolvedTotal NET cinsinden, tax-calculator iteratif algoritma ile brüt'ü bulur.
  // Hata durumunda (örn. negatif net) try/catch ile graceful degradation.
  let taxBreakdown: PayrollBreakdown | null = null;
  try {
    if (resolvedTotal > 0) {
      taxBreakdown = netToGross(resolvedTotal);
    }
  } catch (err) {
    console.warn('[payroll-engine] Brüt hesabı başarısız (netToGross)', { 
      error: String(err), 
      netSalary: resolvedTotal,
      userId, year, month,
    });
  }

  return {
    userId,
    userName: fullName,
    branchId: u.branchId,
    year,
    month,
    positionCode,
    positionName,
    totalCalendarDays: daysInMonth,
    workedDays: classification.workedDays,
    offDays: effectiveOffDays,
    absentDays: classification.absentDays,
    unpaidLeaveDays: classification.unpaidLeaveDays,
    sickLeaveDays: classification.sickLeaveDays,
    overtimeMinutes: classification.totalOvertimeMinutes,
    holidayWorkedDays: classification.holidayWorkedDays,
    totalSalary: resolvedTotal,
    baseSalary: resolvedBase,
    bonus: resolvedBonus,
    dailyRate,
    absenceDeduction,
    bonusDeduction,
    overtimePay,
    holidayPay,
    mealAllowance,
    netPay,
    isTerminated,
    salarySource,
    originalSalary,
    legalNote,
    // Sprint 9 yeni alanlar — brüt + tüm yasal kesintiler
    grossSalary: taxBreakdown?.grossSalary,
    sgkPrimi: taxBreakdown?.sgkPrimi,
    unemploymentPrimi: taxBreakdown?.unemploymentPrimi,
    totalSgkDeduction: taxBreakdown?.totalSgk,
    incomeTax: taxBreakdown?.incomeTax,
    stampDuty: taxBreakdown?.stampDuty,
    totalLegalDeductions: taxBreakdown?.totalDeductions,
  };
}

export async function calculateBranchPayroll(
  branchId: number,
  year: number,
  month: number
): Promise<PayrollResult[]> {
  // Şube+dönem bazlı konfigürasyonu DB'den yükle
  const config = await loadPayrollConfig(branchId, year, month);

  // İK redesign: tüm aktif personel (sadece şube rolleri değil)
  // Eskiden: WHERE role IN ('stajyer','bar_buddy','barista','supervisor_buddy','supervisor','mudur')
  // Şimdi: aktif + soft-delete olmayan tüm kullanıcılar
  // Custom-individual fallback bordrosu kapsamlı tutacak (HQ + Fabrika + Ofis dahil)
  const branchUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.branchId, branchId),
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ));

  const results: PayrollResult[] = [];
  for (const u of branchUsers) {
    const result = await calculatePayroll(u.id, year, month, config);
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
