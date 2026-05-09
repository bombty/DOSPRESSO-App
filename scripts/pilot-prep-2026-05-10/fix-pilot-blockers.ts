/**
 * DOSPRESSO Pilot Bloker Düzeltme Script (10 May 2026)
 *
 * KULLANIM (Replit Shell):
 *   tsx scripts/pilot-prep-2026-05-10/fix-pilot-blockers.ts
 *
 * 4 PILOT BLOKER:
 *   1. Fabrika kiosk PIN: 3/13 → 13/13 aktif
 *   2. HQ user PIN: eren + hqkiosk PIN tanımla
 *   3. 12 May vardiya planları (4 lokasyon × ortalama 8 kişi)
 *   4. Mahmut bordro fix (PAYROLL_DRY_RUN durumu kontrol)
 *
 * GÜVENLİK:
 *   - --dry-run: SQL çalıştırmaz, sadece raporlar
 *   - Her UPDATE öncesi etkilenen kayıt sayısı gösterilir
 *   - Audit log her aksiyona kayıt
 */

import { db } from "../../server/db";
import { users, branches, shifts } from "../../shared/schema";
import { sql, eq, and, isNull, isNotNull } from "drizzle-orm";
import { writeFileSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes('--dry-run');

const log: any[] = [];

function action(name: string, status: 'success' | 'skipped' | 'failed', details: any) {
  log.push({ name, status, details, timestamp: new Date().toISOString() });
  const icon = status === 'success' ? '✅' : status === 'skipped' ? '⏭️ ' : '❌';
  console.log(`${icon} ${name}`);
  console.log(`   ${typeof details === 'object' ? JSON.stringify(details) : details}`);
}

// ═══════════════════════════════════════════════════════════════════
// AKSIYON 1: Fabrika kiosk PIN aktivasyonu (3/13 → 13/13)
// ═══════════════════════════════════════════════════════════════════
async function fix1_FactoryKioskPins() {
  // Önce mevcut durumu kontrol et
  const before = await db.execute(sql`
    SELECT COUNT(*)::int AS total, 
           SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active
    FROM branch_staff_pins WHERE branch_id = 24
  `);
  const beforeRow = (before as any).rows?.[0];

  console.log(`\n📊 Fabrika branch_staff_pins ÖNCESİ: aktif=${beforeRow?.active}, toplam=${beforeRow?.total}`);

  if (DRY_RUN) {
    action('1. Fabrika PIN aktivasyon (DRY RUN)', 'skipped', {
      before: beforeRow,
      sql: `UPDATE branch_staff_pins SET is_active = true WHERE branch_id = 24 AND is_active = false`,
    });
    return;
  }

  // Sadece kullanıcısı aktif olanları aktive et (deleted_at NULL)
  const result = await db.execute(sql`
    UPDATE branch_staff_pins bsp
    SET is_active = true,
        updated_at = NOW()
    FROM users u
    WHERE bsp.branch_id = 24 
      AND bsp.is_active = false
      AND bsp.user_id = u.id
      AND u.deleted_at IS NULL
    RETURNING bsp.user_id
  `);

  const after = await db.execute(sql`
    SELECT COUNT(*)::int AS total,
           SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active
    FROM branch_staff_pins WHERE branch_id = 24
  `);
  const afterRow = (after as any).rows?.[0];

  action('1. Fabrika kiosk PIN aktivasyonu', 'success', {
    before: beforeRow,
    after: afterRow,
    activated: ((result as any).rowCount || 0),
  });
}

// ═══════════════════════════════════════════════════════════════════
// AKSIYON 2: HQ user PIN (eren + hqkiosk)
// ═══════════════════════════════════════════════════════════════════
async function fix2_HqMissingPins() {
  // Bu script otomatik PIN üretemez (güvenlik). Sadece tespit eder + uyarır.
  const missing = await db.execute(sql`
    SELECT id, username, role
    FROM users 
    WHERE branch_id = 23 
      AND deleted_at IS NULL
      AND (kiosk_pin IS NULL OR kiosk_pin = '')
      AND username IN ('eren', 'hqkiosk')
  `);
  const rows = (missing as any).rows || [];

  if (rows.length === 0) {
    action('2. HQ user PIN tespiti', 'success', { message: 'Eksik PIN yok ✅' });
    return;
  }

  console.log(`\n⚠️  ${rows.length} HQ user'ın PIN'i eksik:`);
  for (const u of rows) {
    console.log(`   - ${u.username} (${u.role})`);
  }
  console.log('\n   ⚠️  PIN'ler manuel set edilmeli (güvenlik). Aslan WhatsApp'tan dağıtmalı.');
  console.log('   SQL örneği (manuel):');
  console.log(`   UPDATE users SET kiosk_pin = bcrypt_hash('PIN1234'), pin_set_at = NOW() WHERE username = 'eren';`);

  action('2. HQ user PIN eksiklik tespiti', 'success', {
    eksikUsers: rows.map((r: any) => r.username),
    aksiyon: 'Aslan manuel PIN set edip WhatsApp ile dağıtmalı',
  });
}

// ═══════════════════════════════════════════════════════════════════
// AKSIYON 3: 12 May vardiya planları (4 pilot lokasyon)
// ═══════════════════════════════════════════════════════════════════
async function fix3_PilotShifts() {
  const PILOT_BRANCHES = [5, 8, 23, 24];
  const PILOT_DATE = '2026-05-12';

  // Mevcut vardiya kontrolü
  const existing = await db.execute(sql`
    SELECT branch_id, COUNT(*)::int AS count
    FROM shifts
    WHERE shift_date = ${PILOT_DATE}::date
      AND branch_id = ANY(${PILOT_BRANCHES}::int[])
    GROUP BY branch_id
  `);
  const existingRows = (existing as any).rows || [];

  console.log(`\n📊 12 May vardiya ÖNCESİ:`);
  for (const branchId of PILOT_BRANCHES) {
    const found = existingRows.find((r: any) => r.branch_id === branchId);
    console.log(`   Branch ${branchId}: ${found?.count || 0} vardiya`);
  }

  if (DRY_RUN) {
    action('3. Vardiya planlama (DRY RUN)', 'skipped', {
      message: 'Aktif çalışanlar için vardiya oluşturulacak',
      branches: PILOT_BRANCHES,
      date: PILOT_DATE,
    });
    return;
  }

  // Her şube için aktif çalışanlara default vardiya (08:00-17:00) oluştur
  let totalCreated = 0;
  for (const branchId of PILOT_BRANCHES) {
    // Skip if already has shifts
    const hasShifts = existingRows.find((r: any) => r.branch_id === branchId);
    if (hasShifts && hasShifts.count > 0) {
      console.log(`   ⏭️  Branch ${branchId} zaten ${hasShifts.count} vardiya var, atlandı`);
      continue;
    }

    // Aktif çalışanları bul (account_status normalize edilmiş şekilde)
    const employees = await db.execute(sql`
      SELECT id, username, role
      FROM users
      WHERE branch_id = ${branchId}
        AND deleted_at IS NULL
        AND is_active = true
        AND account_status IN ('active', 'approved')
    `);
    const empRows = (employees as any).rows || [];

    // Her çalışana default vardiya
    for (const emp of empRows) {
      try {
        await db.execute(sql`
          INSERT INTO shifts (
            user_id, branch_id, shift_date, start_time, end_time, 
            shift_type, is_planned, created_at, updated_at
          )
          VALUES (
            ${emp.id}, ${branchId}, ${PILOT_DATE}::date, 
            '08:00'::time, '17:00'::time,
            'normal', true, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `);
        totalCreated++;
      } catch (err: any) {
        console.log(`   ❌ ${emp.username} için vardiya oluşturulamadı: ${err.message}`);
      }
    }
    console.log(`   ✅ Branch ${branchId}: ${empRows.length} kişi için vardiya oluşturuldu`);
  }

  action('3. 12 May vardiya planları', 'success', {
    branchesProcessed: PILOT_BRANCHES,
    totalShiftsCreated: totalCreated,
    note: 'Default vardiya 08:00-17:00 — şube müdürü gerekirse düzenlesin',
  });
}

// ═══════════════════════════════════════════════════════════════════
// AKSIYON 4: Mahmut bordro durumu (P-1)
// ═══════════════════════════════════════════════════════════════════
async function fix4_MahmutPayroll() {
  // PAYROLL_DRY_RUN durumu
  const dryRun = process.env.PAYROLL_DRY_RUN === 'true';
  
  // Mahmut user kontrolü
  const mahmut = await db.execute(sql`
    SELECT id, username, first_name, last_name, role
    FROM users
    WHERE LOWER(username) LIKE '%mahmut%'
       OR LOWER(first_name) LIKE '%mahmut%'
    LIMIT 5
  `);
  const mahmutRows = (mahmut as any).rows || [];

  console.log(`\n📊 Mahmut user'ları:`);
  for (const m of mahmutRows) {
    console.log(`   - ${m.username} (${m.first_name} ${m.last_name}, role: ${m.role})`);
  }

  // Mahmutaltunay'ın bordro kaydı
  const mahmutPayroll = await db.execute(sql`
    SELECT * FROM monthly_payroll
    WHERE user_id IN (SELECT id FROM users WHERE username = 'mahmutaltunay')
    ORDER BY year DESC, month DESC LIMIT 5
  `);

  action('4. Mahmut bordro durum kontrolü', 'success', {
    PAYROLL_DRY_RUN: dryRun,
    mahmutUsers: mahmutRows.map((m: any) => `${m.username} (${m.first_name})`),
    mahmutPayrollRecords: ((mahmutPayroll as any).rows || []).length,
    aksiyon: dryRun
      ? 'PAYROLL_DRY_RUN=true — gerçek bordro hesaplanmıyor. Aslan 5 BRÜT verince DRY_RUN kapatılıp hesaplanmalı.'
      : 'DRY_RUN kapalı — bordro hesaplanabilir.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// ANA ÇALIŞTIRMA
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('DOSPRESSO Pilot Bloker Düzeltme (10 May 2026)');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (DB değişmez)' : 'CANLI (DB güncellenir)'}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  await fix1_FactoryKioskPins();
  await fix2_HqMissingPins();
  await fix3_PilotShifts();
  await fix4_MahmutPayroll();

  // Özet
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('ÖZET');
  console.log('═══════════════════════════════════════════════════════════════════');
  const success = log.filter(l => l.status === 'success').length;
  const skipped = log.filter(l => l.status === 'skipped').length;
  const failed = log.filter(l => l.status === 'failed').length;
  console.log(`✅ SUCCESS: ${success}/${log.length}`);
  console.log(`⏭️  SKIPPED: ${skipped}/${log.length}`);
  console.log(`❌ FAILED:  ${failed}/${log.length}`);

  // JSON
  try {
    const outputPath = join(process.cwd(), 'scripts', 'pilot-prep-2026-05-10', 'fix-result.json');
    writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: DRY_RUN ? 'dry-run' : 'live',
      log,
    }, null, 2));
    console.log(`\n💾 Detay: ${outputPath}`);
  } catch (err: any) {
    console.log(`\n⚠️  JSON kaydedilemedi: ${err.message}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Crash:', err);
  process.exit(1);
});
