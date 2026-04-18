/**
 * Nisan 2026 Bordro Backfill
 * Pazartesi 28 Nis 2026, 17:00-17:30 (30 dk)
 *
 * AMAÇ: 31 active user için Nisan bordro hesaplaması (Sprint B.5 catch-up)
 * Veri: pdks_monthly_stats (2026-04) + employees.salary_*
 *
 * KULLANIM:
 *   tsx scripts/pilot/04-nisan-bordro-backfill.ts --dry-run
 *   tsx scripts/pilot/04-nisan-bordro-backfill.ts --commit
 */

import { db } from '../../server/db';
import { users, employees, payroll, pdksMonthlyStats } from '../../shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

const YEAR_MONTH = '2026-04';
const DRY_RUN = !process.argv.includes('--commit');

interface PayrollRow {
  userId: number;
  employeeId: number;
  baseSalary: number;
  workedDays: number;
  overtimeHours: number;
  grossSalary: number;
  netSalary: number;
  taxDeduction: number;
}

async function backfillNisanBordro() {
  console.log(`\n=== NİSAN BORDRO BACKFILL — ${DRY_RUN ? 'DRY-RUN' : 'COMMIT'} ===`);

  // 1. Aktif user + employee join
  const activeUsers = await db
    .select({
      userId: users.id,
      employeeId: employees.id,
      role: users.role,
      branchId: users.branchId,
      baseSalary: employees.baseSalary,
    })
    .from(users)
    .innerJoin(employees, eq(employees.userId, users.id))
    .where(and(
      eq(users.status, 'active'),
      isNull(users.deletedAt),
      isNull(employees.deletedAt),
    ));

  console.log(`✓ ${activeUsers.length} aktif user bulundu`);

  // 2. Mevcut Nisan bordrosu olanları çıkar
  const existingPayroll = await db
    .select({ userId: payroll.userId })
    .from(payroll)
    .where(and(
      eq(payroll.yearMonth, YEAR_MONTH),
      isNull(payroll.deletedAt),
    ));
  const existingUserIds = new Set(existingPayroll.map(p => p.userId));
  const toBackfill = activeUsers.filter(u => !existingUserIds.has(u.userId));

  console.log(`✓ ${existingPayroll.length} bordro zaten var, ${toBackfill.length} backfill gerekli`);

  if (toBackfill.length === 0) {
    console.log('✅ Tüm Nisan bordroları mevcut, backfill gereksiz');
    return;
  }

  // 3. Her user için PDKS verilerinden bordro hesapla
  const rows: PayrollRow[] = [];
  for (const u of toBackfill) {
    const stats = await db
      .select()
      .from(pdksMonthlyStats)
      .where(and(
        eq(pdksMonthlyStats.userId, u.userId),
        eq(pdksMonthlyStats.yearMonth, YEAR_MONTH),
      ))
      .limit(1);

    const workedDays = stats[0]?.workedDays ?? 22; // varsayılan 22 gün
    const overtimeHours = stats[0]?.overtimeHours ?? 0;
    const baseSalary = Number(u.baseSalary) || 0;

    if (baseSalary === 0) {
      console.warn(`⚠️ User ${u.userId} (${u.role}) baseSalary=0, atlanıyor`);
      continue;
    }

    // Basit hesap (gerçek hesaplama payroll service'inde olmalı)
    const dailyRate = baseSalary / 30;
    const grossSalary = dailyRate * workedDays + (overtimeHours * dailyRate / 8 * 1.5);
    const taxDeduction = grossSalary * 0.20; // %20 SGK+vergi varsayımı
    const netSalary = grossSalary - taxDeduction;

    rows.push({
      userId: u.userId,
      employeeId: u.employeeId,
      baseSalary,
      workedDays,
      overtimeHours,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      taxDeduction: Math.round(taxDeduction * 100) / 100,
    });
  }

  console.log(`\n=== HESAPLAMA SONUÇLARI (${rows.length} satır) ===`);
  console.log(`Toplam brüt: ₺${rows.reduce((s, r) => s + r.grossSalary, 0).toFixed(2)}`);
  console.log(`Toplam net: ₺${rows.reduce((s, r) => s + r.netSalary, 0).toFixed(2)}`);
  console.log(`Toplam kesinti: ₺${rows.reduce((s, r) => s + r.taxDeduction, 0).toFixed(2)}`);

  // 4. Insert (commit modunda)
  if (DRY_RUN) {
    console.log('\n🔬 DRY-RUN: DB değişikliği yapılmadı. --commit ile çalıştır.');
    console.log('İlk 3 satır örneği:', rows.slice(0, 3));
    return;
  }

  await db.insert(payroll).values(
    rows.map(r => ({
      userId: r.userId,
      employeeId: r.employeeId,
      yearMonth: YEAR_MONTH,
      baseSalary: r.baseSalary.toString(),
      workedDays: r.workedDays,
      overtimeHours: r.overtimeHours,
      grossSalary: r.grossSalary.toString(),
      netSalary: r.netSalary.toString(),
      taxDeduction: r.taxDeduction.toString(),
      status: 'pending_approval',
      createdBy: 1, // adminhq
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  console.log(`\n✅ ${rows.length} bordro başarıyla insert edildi`);
  console.log('Sonraki adım: muhasebe_ik onaylar (status → approved)');
}

backfillNisanBordro()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ HATA:', err);
    process.exit(1);
  });
