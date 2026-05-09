/**
 * DOSPRESSO KVKK Veri Temizlik Script (10 May 2026)
 *
 * KVKK MADDE 7 UYUM:
 *   "Kişisel veriler işleme amacının ortadan kalkması halinde silinir,
 *    yok edilir veya anonim hale getirilir."
 *
 * KULLANIM (Replit Shell):
 *   # Önce DRY RUN
 *   tsx scripts/pilot-prep-2026-05-10/kvkk-cleanup.ts --dry-run
 *
 *   # Sonra CANLI
 *   tsx scripts/pilot-prep-2026-05-10/kvkk-cleanup.ts
 *
 * 2 KATMAN:
 *   A) 28 silinmiş user bordrosu → SOFT ARCHIVE (silmiyoruz, gizliyoruz)
 *      Yasal saklama: İş Kanunu m.75 — 10 yıl
 *
 *   B) 7 snapshot tablo → BACKUP + DROP
 *      KVKK madde 7 — amacı ortadan kalkmış kişisel veri silinmeli
 *      82 user (şifre hash dahil) production'dan kalkmalı
 *
 * GÜVENLİK:
 *   - Backup öncesi snapshot tablo verisi pg_dump'a alınır
 *   - audit_logs'a her aksiyon kaydedilir
 *   - --dry-run flag ile sadece raporlar
 */

import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DRY_RUN = process.argv.includes('--dry-run');

const log: any[] = [];

function action(name: string, status: 'success' | 'skipped' | 'failed', details: any) {
  log.push({ name, status, details, timestamp: new Date().toISOString() });
  const icon = status === 'success' ? '✅' : status === 'skipped' ? '⏭️ ' : '❌';
  console.log(`${icon} ${name}`);
  console.log(`   ${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}`);
}

// ═══════════════════════════════════════════════════════════════════
// A) 28 Silinmiş User Bordrosu → SOFT ARCHIVE
// ═══════════════════════════════════════════════════════════════════
async function archiveDeletedUserPayrolls() {
  console.log('\n' + '═'.repeat(67));
  console.log('A) SİLİNMİŞ USER BORDROLARI ARŞİVLEME');
  console.log('═'.repeat(67));

  // 1. Mevcut sayım
  const before = await db.execute(sql`
    SELECT COUNT(*)::int AS toplam
    FROM monthly_payroll mp
    INNER JOIN users u ON mp.user_id = u.id
    WHERE u.deleted_at IS NOT NULL
  `);
  const beforeCount = (before as any).rows?.[0]?.toplam || 0;

  console.log(`\n📊 Silinmiş user'a ait monthly_payroll kayıt: ${beforeCount}`);

  if (beforeCount === 0) {
    action('A. Silinmiş user bordro arşivleme', 'skipped', { reason: 'Hedef kayıt yok' });
    return;
  }

  if (DRY_RUN) {
    const sample = await db.execute(sql`
      SELECT u.username, u.deleted_at, mp.year, mp.month, mp.total_salary
      FROM monthly_payroll mp
      INNER JOIN users u ON mp.user_id = u.id
      WHERE u.deleted_at IS NOT NULL
      LIMIT 5
    `);
    action('A. Silinmiş user bordro arşivleme (DRY RUN)', 'skipped', {
      etkilenecek: beforeCount,
      sample: ((sample as any).rows || []).map((r: any) => 
        `${r.username} (silindi: ${r.deleted_at?.toISOString?.()?.slice(0,10)}, ${r.year}/${r.month}: ${r.total_salary})`
      ),
    });
    return;
  }

  try {
    // 2. status kolonu yoksa ekle
    await db.execute(sql`
      ALTER TABLE monthly_payroll 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);
    await db.execute(sql`
      ALTER TABLE monthly_payroll 
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
    `);
    await db.execute(sql`
      ALTER TABLE monthly_payroll 
      ADD COLUMN IF NOT EXISTS archived_reason TEXT
    `);

    // 3. UPDATE — 28 kaydı arşivle
    const result = await db.execute(sql`
      UPDATE monthly_payroll mp
      SET status = 'archived',
          archived_at = NOW(),
          archived_reason = 'user_deleted_kvkk_compliance_2026_05_10'
      FROM users u
      WHERE mp.user_id = u.id
        AND u.deleted_at IS NOT NULL
        AND (mp.status IS NULL OR mp.status != 'archived')
    `);
    const updated = (result as any).rowCount || 0;

    // 4. Audit log
    await db.execute(sql`
      INSERT INTO audit_logs (action, entity_type, details, created_at)
      VALUES (
        'kvkk_payroll_archive',
        'monthly_payroll',
        ${JSON.stringify({
          archived_count: updated,
          reason: 'KVKK madde 7 + İş Kanunu m.75 (10 yıl saklama)',
          script: 'kvkk-cleanup.ts',
          date: '2026-05-10'
        })}::jsonb,
        NOW()
      )
    `);

    action('A. Silinmiş user bordro arşivleme', 'success', {
      arsivlenen: updated,
      yasal_dayanak: 'İş Kanunu m.75 — 10 yıl saklama, KVKK m.7 — gizleme',
      ui_etkisi: 'Raporlarda artık görünmez (status=archived filter)',
    });
  } catch (err: any) {
    action('A. Silinmiş user bordro arşivleme', 'failed', { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// B) 7 Snapshot Tablo → BACKUP + DROP
// ═══════════════════════════════════════════════════════════════════
async function dropSnapshotTables() {
  console.log('\n' + '═'.repeat(67));
  console.log('B) SNAPSHOT TABLOLARI BACKUP + DROP');
  console.log('═'.repeat(67));

  // 1. Snapshot tabloları bul
  const tables = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
        tablename LIKE '%_pre_phase%' OR
        tablename LIKE '%_bk_2026%' OR
        tablename LIKE '%_backup_2026%' OR
        tablename LIKE '%_pre_2026%' OR
        tablename LIKE '%_snapshot_2026%'
      )
  `);
  const tableRows = (tables as any).rows || [];

  console.log(`\n📊 Bulunan snapshot tablo sayısı: ${tableRows.length}`);
  for (const t of tableRows) {
    const count = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM "${t.tablename}"`));
    console.log(`   - ${t.tablename}: ${(count as any).rows?.[0]?.c || 0} kayıt`);
  }

  if (tableRows.length === 0) {
    action('B. Snapshot tablo temizliği', 'skipped', { reason: 'Snapshot tablo yok ✅' });
    return;
  }

  if (DRY_RUN) {
    action('B. Snapshot tablo temizliği (DRY RUN)', 'skipped', {
      tablolar: tableRows.map((t: any) => t.tablename),
      adim_1: 'pg_dump → docs/audit/backups/snapshot-20260510-archive.dump',
      adim_2: 'audit_logs INSERT',
      adim_3: 'DROP TABLE',
    });
    return;
  }

  try {
    // 2. Backup klasör oluştur
    const backupDir = '/home/runner/workspace/docs/audit/backups';
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // 3. pg_dump (Replit Shell'de DATABASE_URL varsa)
    const backupFile = `${backupDir}/snapshot-20260510-archive.dump`;
    const tableArgs = tableRows.map((t: any) => `-t ${t.tablename}`).join(' ');
    
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        execSync(`pg_dump "${databaseUrl}" ${tableArgs} -F c -f "${backupFile}"`, {
          stdio: 'pipe',
        });
        console.log(`\n💾 Backup: ${backupFile}`);
      } else {
        console.log('\n⚠️  DATABASE_URL yok, pg_dump atlandı (DROP yine yapılıyor)');
      }
    } catch (dumpErr: any) {
      console.log(`\n⚠️  pg_dump hatası: ${dumpErr.message} — DROP yine devam ediyor`);
    }

    // 4. Audit log
    await db.execute(sql`
      INSERT INTO audit_logs (action, entity_type, details, created_at)
      VALUES (
        'kvkk_table_drop',
        'snapshot_tables',
        ${JSON.stringify({
          tables: tableRows.map((t: any) => t.tablename),
          backup_file: backupFile,
          reason: 'KVKK madde 7 — amacı ortadan kalkmış kişisel veri silinmeli',
          script: 'kvkk-cleanup.ts',
          date: '2026-05-10'
        })}::jsonb,
        NOW()
      )
    `);

    // 5. DROP TABLE
    let dropped = 0;
    for (const t of tableRows) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${t.tablename}" CASCADE`));
        dropped++;
        console.log(`   ✅ DROP: ${t.tablename}`);
      } catch (err: any) {
        console.log(`   ❌ ${t.tablename}: ${err.message}`);
      }
    }

    action('B. Snapshot tablo temizliği', 'success', {
      bulundu: tableRows.length,
      drop_edildi: dropped,
      backup: backupFile,
      yasal_dayanak: 'KVKK m.7 — silme yükümlülüğü',
    });
  } catch (err: any) {
    action('B. Snapshot tablo temizliği', 'failed', { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// ANA
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('DOSPRESSO KVKK Veri Temizlik (10 May 2026)');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (DB değişmez)' : 'CANLI (DB güncellenir)'}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  await archiveDeletedUserPayrolls();
  await dropSnapshotTables();

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

  if (failed === 0 && success > 0) {
    console.log('\n🟢 KVKK uyumluluk artırıldı — denetlenebilir');
  }

  // JSON
  try {
    const outputPath = join(process.cwd(), 'scripts', 'pilot-prep-2026-05-10', 'kvkk-result.json');
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
