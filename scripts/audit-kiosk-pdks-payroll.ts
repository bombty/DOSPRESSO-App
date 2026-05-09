/**
 * DOSPRESSO Kiosk + PDKS + Puantaj Sistem Audit
 *
 * KULLANIM (Replit Shell):
 *   tsx scripts/audit-kiosk-pdks-payroll.ts
 *
 * ARANAN SORUNLAR:
 *   - Kiosk auth çakışmaları (3 ayrı login endpoint)
 *   - Çift payroll tablosu (monthlyPayrolls vs monthlyPayroll)
 *   - Boş shift_attendance (PDKS scheduler sorunu)
 *   - HQ user PIN eksiklikleri (P-NEW)
 *   - Mahmut bordro durumu (P-1)
 *   - 4 pilot lokasyonu vardiya planı
 *   - Mola dönüş kontrolleri
 *   - Mr. Dobody scheduler
 *
 * RAPOR: scripts/audit-result.json + konsol
 */

import { db } from "../server/db";
import {
  users,
  branches,
  shiftAttendance,
  monthlyPayroll,
  payrollRecords,
  pdksRecords,
  shifts,
  payrollDeductionConfig,
  payrollParameters,
  kioskSessions,
} from "../shared/schema";
import { sql, eq, and, gte, isNull, isNotNull, desc, count } from "drizzle-orm";
import { writeFileSync } from "fs";
import { join } from "path";

type Section = {
  title: string;
  status: 'pass' | 'fail' | 'warning';
  findings: Array<{ key: string; value: any; comment?: string }>;
};

const sections: Section[] = [];

function addSection(s: Section) {
  sections.push(s);
  const icon = s.status === 'pass' ? '✅' : s.status === 'fail' ? '❌' : '⚠️ ';
  console.log(`\n${icon} ${s.title}`);
  console.log('─'.repeat(60));
  for (const f of s.findings) {
    console.log(`   ${f.key}: ${typeof f.value === 'object' ? JSON.stringify(f.value) : f.value}`);
    if (f.comment) console.log(`      ↳ ${f.comment}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 1) KIOSK AUTH SAĞLIĞI
// ═══════════════════════════════════════════════════════════════════
async function auditKioskAuth() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 1.1 Toplam aktif kiosk session
  const activeSessions = await db.select({ count: count() })
    .from(kioskSessions)
    .where(eq(kioskSessions.isActive as any, true));
  findings.push({ key: 'Aktif kiosk session', value: activeSessions[0].count });

  // 1.2 Kiosk hesapları (memory: 19 dedicated kiosk accounts)
  const kioskUsers = await db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    branchId: users.branchId,
  })
    .from(users)
    .where(sql`${users.username} LIKE 'kiosk%' OR ${users.role} = 'kiosk'`);
  findings.push({
    key: 'Kiosk user hesapları',
    value: kioskUsers.length,
    comment: kioskUsers.length === 19 ? 'OK (memory: 19 hesap olmalı)' : `BEKLENEN: 19 — Eksik: ${19 - kioskUsers.length}`,
  });
  if (kioskUsers.length < 19) status = 'warning';

  // 1.3 4 pilot lokasyonu için kiosk hesabı var mı
  const PILOT_BRANCH_IDS = [5, 8, 23, 24];
  for (const branchId of PILOT_BRANCH_IDS) {
    const kiosk = kioskUsers.find(k => k.branchId === branchId);
    findings.push({
      key: `Pilot lokasyon ${branchId} kiosk`,
      value: kiosk ? kiosk.username : 'YOK',
      comment: kiosk ? '✅' : '❌ Bu lokasyonda kiosk girişi yapılamaz!',
    });
    if (!kiosk) status = 'fail';
  }

  // 1.4 HQ user PIN durumu (P-NEW deadline 12 May)
  const hqRoles = ['admin', 'ceo', 'cgo', 'gida_muhendisi', 'satinalma', 'koc', 'egitmen', 'recete_gm', 'fabrika_muduru', 'muhasebe', 'hr', 'kalite_yoneticisi', 'pazarlama', 'it', 'sef'];
  const hqUsers = await db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    hasPin: sql<boolean>`${users.kioskPin} IS NOT NULL`,
  })
    .from(users)
    .where(sql`${users.role} IN (${sql.join(hqRoles.map(r => sql`${r}`), sql`, `)})`);

  const hqWithoutPin = hqUsers.filter(u => !u.hasPin);
  findings.push({
    key: 'HQ user toplam',
    value: hqUsers.length,
  });
  findings.push({
    key: 'HQ user PIN eksik',
    value: hqWithoutPin.length,
    comment: hqWithoutPin.length === 0 ? '✅ Tümünde PIN var' : `❌ P-NEW görevi: ${hqWithoutPin.length} kullanıcının PIN'i eksik. Liste: ${hqWithoutPin.map(u => u.username).join(', ')}`,
  });
  if (hqWithoutPin.length > 0) status = 'fail';

  addSection({ title: '1) KIOSK AUTH SAĞLIĞI', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// 2) PDKS / SHIFT_ATTENDANCE VERİ SAĞLIĞI
// ═══════════════════════════════════════════════════════════════════
async function auditPdksHealth() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 2.1 shift_attendance toplam kayıt
  const totalAttendance = await db.select({ count: count() }).from(shiftAttendance);
  findings.push({
    key: 'shift_attendance toplam kayıt',
    value: totalAttendance[0].count,
    comment: totalAttendance[0].count === 0 ? '❌ KRITIK: PDKS scheduler çalışmıyor!' : 'OK',
  });
  if (totalAttendance[0].count === 0) status = 'fail';

  // 2.2 Son 7 günde check-in
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentAttendance = await db.select({ count: count() })
    .from(shiftAttendance)
    .where(gte(shiftAttendance.createdAt as any, sevenDaysAgo));
  findings.push({
    key: 'Son 7 gün shift_attendance',
    value: recentAttendance[0].count,
    comment: recentAttendance[0].count > 0 ? 'Sistem aktif kullanılıyor' : '⚠️ Son 7 gün hiç giriş yok',
  });
  if (recentAttendance[0].count === 0) status = 'warning';

  // 2.3 Anomali — giriş ama çıkış yok (24+ saat)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const orphanCheckIns = await db.select({ count: count() })
    .from(shiftAttendance)
    .where(and(
      isNull(shiftAttendance.checkOutAt),
      sql`${shiftAttendance.checkInAt} < ${yesterday}`,
    ));
  findings.push({
    key: '24+ saat çıkışsız giriş',
    value: orphanCheckIns[0].count,
    comment: orphanCheckIns[0].count > 0 ? `⚠️ ${orphanCheckIns[0].count} kayıt çıkış almamış (anomali)` : '✅',
  });
  if (Number(orphanCheckIns[0].count) > 5) status = 'warning';

  // 2.4 4 pilot lokasyonu PDKS aktif mi
  const PILOT_BRANCH_IDS = [5, 8, 23, 24];
  for (const branchId of PILOT_BRANCH_IDS) {
    const branchAttendance = await db.select({ count: count() })
      .from(shiftAttendance)
      .where(eq(shiftAttendance.branchId as any, branchId));
    findings.push({
      key: `Pilot lokasyon ${branchId} PDKS kayıt`,
      value: branchAttendance[0].count,
      comment: branchAttendance[0].count > 0 ? '✅' : '⚠️ Bu lokasyonda hiç PDKS kaydı yok',
    });
  }

  addSection({ title: '2) PDKS / shift_attendance SAĞLIĞI', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// 3) PUANTAJ / PAYROLL SİSTEMİ ÇAKIŞMASI
// ═══════════════════════════════════════════════════════════════════
async function auditPayrollDuplication() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 3.1 monthlyPayroll (schema-12) kayıt sayısı
  let mp1Count = 0;
  try {
    const r = await db.execute(sql`SELECT COUNT(*)::int as c FROM monthly_payroll`);
    mp1Count = (r as any).rows?.[0]?.c || 0;
  } catch (err: any) {
    findings.push({ key: 'monthly_payroll tablosu', value: 'YOK', comment: err.message });
  }
  findings.push({ key: 'monthly_payroll (schema-12) kayıt', value: mp1Count });

  // 3.2 monthly_payrolls (schema-07) kayıt sayısı
  let mp2Count = 0;
  try {
    const r = await db.execute(sql`SELECT COUNT(*)::int as c FROM monthly_payrolls`);
    mp2Count = (r as any).rows?.[0]?.c || 0;
  } catch (err: any) {
    findings.push({ key: 'monthly_payrolls tablosu', value: 'YOK' });
  }
  findings.push({ key: 'monthly_payrolls (schema-07) kayıt', value: mp2Count });

  // 3.3 Çakışma analizi
  if (mp1Count > 0 && mp2Count > 0) {
    findings.push({
      key: '⚠️ ÇAKIŞMA',
      value: 'BOTH ACTIVE',
      comment: 'Hem monthly_payroll hem monthly_payrolls'a yazılıyor — hangisi gerçek belirsiz!',
    });
    status = 'fail';
  } else if (mp1Count > 0) {
    findings.push({ key: 'Aktif tablo', value: 'monthly_payroll (TEKİL)', comment: 'OK, schema-12 kullanılıyor' });
  } else if (mp2Count > 0) {
    findings.push({ key: 'Aktif tablo', value: 'monthly_payrolls (ÇOĞUL)', comment: 'OK, schema-07 kullanılıyor' });
  } else {
    findings.push({
      key: 'Aktif tablo',
      value: 'NONE',
      comment: '⚠️ Hiç payroll kaydı yok — Sema/Mahmut henüz puantaj girmemiş',
    });
    status = 'warning';
  }

  // 3.4 payrollRecords vs pdksRecords
  let prCount = 0, pdksCount = 0;
  try {
    const r1 = await db.execute(sql`SELECT COUNT(*)::int as c FROM payroll_records`);
    prCount = (r1 as any).rows?.[0]?.c || 0;
  } catch (err: any) {}
  try {
    const r2 = await db.execute(sql`SELECT COUNT(*)::int as c FROM pdks_records`);
    pdksCount = (r2 as any).rows?.[0]?.c || 0;
  } catch (err: any) {}

  findings.push({ key: 'payroll_records (schema-07)', value: prCount });
  findings.push({ key: 'pdks_records (schema-12)', value: pdksCount });

  addSection({ title: '3) PAYROLL SİSTEMİ ÇAKIŞMA AUDİT', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// 4) PUANTAJ HESAPLAMA PARAMETRELERİ (Mahmut için P-1)
// ═══════════════════════════════════════════════════════════════════
async function auditPayrollParameters() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 4.1 payroll_parameters tablosunda 2026 verileri var mı
  try {
    const params = await db.execute(sql`
      SELECT * FROM payroll_parameters WHERE year = 2026 ORDER BY effective_date DESC LIMIT 1
    `);
    const row = (params as any).rows?.[0];
    if (!row) {
      findings.push({
        key: '2026 payroll parametreleri',
        value: 'YOK',
        comment: '❌ KRITIK: Asgari ücret, SGK oranı, gelir vergisi yoktan hesaplanamaz!',
      });
      status = 'fail';
    } else {
      findings.push({
        key: '2026 parametreler',
        value: 'VAR',
        comment: `Asgari ücret: ${row.minimum_wage}, SGK işçi: ${row.sgk_employee_rate}, Gelir vergisi: ${row.income_tax_rate || '?'}`,
      });
    }
  } catch (err: any) {
    findings.push({ key: 'payroll_parameters tablosu', value: 'HATA', comment: err.message });
    status = 'fail';
  }

  // 4.2 payroll_deduction_config (geç gelme, devamsızlık kuralları)
  try {
    const configs = await db.select({ count: count() }).from(payrollDeductionConfig);
    findings.push({
      key: 'Kesinti kuralları (lateness, absence)',
      value: configs[0].count,
      comment: configs[0].count >= 5 ? '✅' : '⚠️ Kural sayısı az, geç gelme/devamsızlık kuralları eksik olabilir',
    });
    if (Number(configs[0].count) < 5) status = 'warning';
  } catch (err: any) {
    findings.push({ key: 'payroll_deduction_config', value: 'HATA', comment: err.message });
  }

  // 4.3 Mahmut bordro durumu (P-1)
  try {
    const mahmut = await db.execute(sql`
      SELECT u.id, u.username, u.first_name, u.last_name, u.salary
      FROM users u
      WHERE LOWER(u.first_name) LIKE '%mahmut%' OR LOWER(u.username) LIKE '%mahmut%'
      LIMIT 5
    `);
    const rows = (mahmut as any).rows || [];
    findings.push({
      key: 'Mahmut user bulundu',
      value: rows.length,
      comment: rows.map((r: any) => `${r.username} (salary: ${r.salary})`).join(', ') || 'YOK',
    });
    if (rows.length === 0) status = 'warning';
  } catch (err: any) {
    findings.push({ key: 'Mahmut sorgusu', value: 'HATA', comment: err.message });
  }

  addSection({ title: '4) PUANTAJ PARAMETRELERİ + Mahmut (P-1)', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// 5) VARDİYA PLANLAMA (4 pilot lokasyonu)
// ═══════════════════════════════════════════════════════════════════
async function auditShiftPlanning() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 5.1 shifts tablosu — toplam vardiya tanımı
  const totalShifts = await db.select({ count: count() }).from(shifts);
  findings.push({
    key: 'Tanımlı vardiya',
    value: totalShifts[0].count,
    comment: totalShifts[0].count >= 4 ? '✅ Yeterli' : `⚠️ Sadece ${totalShifts[0].count} vardiya — 4+ olmalı (3-4 vardiya sistemi)`,
  });
  if (Number(totalShifts[0].count) < 4) status = 'warning';

  // 5.2 4 pilot lokasyonu vardiya tanımı
  const PILOT_BRANCH_IDS = [5, 8, 23, 24];
  for (const branchId of PILOT_BRANCH_IDS) {
    const branchShifts = await db.select({ count: count() })
      .from(shifts)
      .where(eq(shifts.branchId as any, branchId));
    findings.push({
      key: `Pilot ${branchId} vardiya planı`,
      value: branchShifts[0].count,
      comment: branchShifts[0].count > 0 ? '✅' : '⚠️ Bu lokasyon için vardiya yok!',
    });
    if (Number(branchShifts[0].count) === 0) status = 'warning';
  }

  addSection({ title: '5) VARDİYA PLANLAMA (4 pilot)', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// 6) MR. DOBODY SCHEDULER (PDKS scheduler önceden zero record sorunu)
// ═══════════════════════════════════════════════════════════════════
async function auditScheduler() {
  const findings: any[] = [];
  let status: 'pass' | 'fail' | 'warning' = 'pass';

  // 6.1 periodic_check_runs son çalıştırma
  try {
    const r = await db.execute(sql`
      SELECT MAX(created_at) as last_run, COUNT(*)::int as total
      FROM periodic_check_runs
    `);
    const row = (r as any).rows?.[0];
    if (row?.last_run) {
      const ageHours = (Date.now() - new Date(row.last_run).getTime()) / (1000 * 60 * 60);
      findings.push({
        key: 'Mr. Dobody son çalıştırma',
        value: `${ageHours.toFixed(1)} saat önce`,
        comment: ageHours <= 2 ? '✅ Sağlıklı' : ageHours <= 24 ? '⚠️ 2 saatten eski' : '❌ 24 saatten eski — scheduler ölmüş!',
      });
      findings.push({ key: 'Toplam çalıştırma', value: row.total });
      if (ageHours > 24) status = 'fail';
      else if (ageHours > 2) status = 'warning';
    } else {
      findings.push({
        key: 'Mr. Dobody scheduler',
        value: 'HİÇ ÇALIŞMAMIŞ',
        comment: '❌ KRITIK: PDKS scheduler kayıt oluşturamaz, anomali tespit edilmez',
      });
      status = 'fail';
    }
  } catch (err: any) {
    findings.push({ key: 'Scheduler audit', value: 'HATA', comment: err.message });
  }

  addSection({ title: '6) Mr. DOBODY SCHEDULER', status, findings });
}

// ═══════════════════════════════════════════════════════════════════
// ANA ÇALIŞTIRMA
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('DOSPRESSO Kiosk + PDKS + Puantaj Sistem Audit');
  console.log(`Çalıştırma: ${new Date().toLocaleString('tr-TR')}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  await auditKioskAuth();
  await auditPdksHealth();
  await auditPayrollDuplication();
  await auditPayrollParameters();
  await auditShiftPlanning();
  await auditScheduler();

  // ÖZET
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('GENEL ÖZET');
  console.log('═══════════════════════════════════════════════════════════════════');

  const pass = sections.filter(s => s.status === 'pass').length;
  const warn = sections.filter(s => s.status === 'warning').length;
  const fail = sections.filter(s => s.status === 'fail').length;

  console.log(`✅ PASS: ${pass}/${sections.length}`);
  console.log(`⚠️  WARN: ${warn}/${sections.length}`);
  console.log(`❌ FAIL: ${fail}/${sections.length}`);

  if (fail > 0) {
    console.log('\n🔴 PILOT İÇİN KRİTİK HATALAR VAR — düzeltmeden başlatma');
    sections.filter(s => s.status === 'fail').forEach(s => {
      console.log(`   ❌ ${s.title}`);
    });
  } else if (warn > 0) {
    console.log('\n🟡 PILOT BAŞLATILABILIR ama uyarıları gözden geç');
  } else {
    console.log('\n🟢 TÜM SİSTEMLER YEŞİL — pilot için hazır 🎉');
  }

  // JSON çıktı
  try {
    const outputPath = join(process.cwd(), 'scripts', 'audit-result.json');
    writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { pass, warn, fail, total: sections.length },
      sections,
    }, null, 2));
    console.log(`\n💾 Detaylı rapor: scripts/audit-result.json`);
  } catch (err: any) {
    console.log(`\n⚠️  JSON kaydedilemedi: ${err.message}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Audit crash:', err);
  process.exit(1);
});
