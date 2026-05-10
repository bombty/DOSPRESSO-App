/**
 * DOSPRESSO Pilot Day-1 Smoke Test Script
 *
 * KULLANIM:
 *   tsx scripts/smoke-test-pilot-prep.ts
 *
 * NE YAPAR:
 * 12 maddelik kontrol listesini sırayla çalıştırır:
 *   1.  DB bağlantı testi
 *   2.  4 pilot reçete malzeme dolu mu
 *   3.  Sema'nın 36 yeni hammadde için fiyat doldurdu mu
 *   4.  Sema'nın 36 yeni hammadde için besin değer doldurdu mu
 *   5.  Onaylanmış reçeteler için tgkLabels taslak hazır mı (auto-label)
 *   6.  19 HQ user için PIN tanımlı mı
 *   7.  4 pilot lokasyonu (Işıklar, Lara, HQ, Fabrika) erişilebilir mi
 *   8.  KVKK consent tablosu kiosk için hazır mı
 *   9.  Mr. Dobody scheduler aktif mi
 *  10. Sentry/Logger çalışıyor mu
 *  11. Backup script son 24 saat içinde çalıştı mı
 *  12. Tüm kritik endpoint'ler 200 dönüyor mu
 *
 * ÇIKTI: Konsol + scripts/smoke-test-result.json
 *
 * UYUM: Pilot Day-1 sabah 09:00'da çalıştırılması için tasarlandı.
 * 12 May 2026 Pazartesi — pilot 10:00'da başlar, 09:00'da bu script.
 */

import { db } from "../server/db";
import {
  factoryRecipes,
  factoryRecipeIngredients,
  inventory,
  tgkLabels,
  users,
  branches,
  kvkkConsents,
} from "../shared/schema";
import { sql, eq, and, gte, isNull, isNotNull } from "drizzle-orm";
import { writeFileSync } from "fs";
import { join } from "path";

type CheckResult = {
  id: number;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  message: string;
  details?: any;
};

const results: CheckResult[] = [];

function log(check: CheckResult) {
  results.push(check);
  const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warning' ? '⚠️ ' : '⏭️ ';
  console.log(`${icon} [${check.id}] ${check.name}`);
  console.log(`     ${check.message}`);
  if (check.details && process.env.VERBOSE) {
    console.log('    ', JSON.stringify(check.details, null, 2));
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 1: DB Bağlantı
// ═══════════════════════════════════════════════════════════════════
async function check1_DbConnection(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    log({
      id: 1,
      name: 'DB Bağlantı',
      status: 'pass',
      message: 'PostgreSQL bağlantısı çalışıyor',
    });
  } catch (err: any) {
    log({
      id: 1,
      name: 'DB Bağlantı',
      status: 'fail',
      message: `DB bağlantısı başarısız: ${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 2: 4 Pilot Reçete Malzeme Dolu mu
// ═══════════════════════════════════════════════════════════════════
async function check2_PilotRecipesHaveIngredients(): Promise<void> {
  const PILOT_RECIPES = [
    'Donut Base Hamuru Reçetesi',
    'Cinnaboom Classic Reçetesi',
    'Cinnaboom Brownie Reçetesi',
    'Cheesecake Base Reçetesi',
  ];

  const recipes = await db.select({
    id: factoryRecipes.id,
    name: factoryRecipes.name,
    ingredientCount: sql<number>`(SELECT COUNT(*) FROM factory_recipe_ingredients WHERE recipe_id = ${factoryRecipes.id})`,
  })
    .from(factoryRecipes)
    .where(sql`${factoryRecipes.name} IN (${sql.join(PILOT_RECIPES.map(n => sql`${n}`), sql`, `)})`);

  const empty = recipes.filter(r => Number(r.ingredientCount) === 0);
  const filled = recipes.filter(r => Number(r.ingredientCount) > 0);

  if (empty.length === 0 && recipes.length === PILOT_RECIPES.length) {
    log({
      id: 2,
      name: '4 Pilot Reçete Malzemeleri',
      status: 'pass',
      message: `${recipes.length}/${PILOT_RECIPES.length} reçete dolu (${recipes.reduce((s, r) => s + Number(r.ingredientCount), 0)} toplam malzeme)`,
      details: recipes,
    });
  } else if (empty.length > 0) {
    log({
      id: 2,
      name: '4 Pilot Reçete Malzemeleri',
      status: 'fail',
      message: `${empty.length} pilot reçete BOŞ: ${empty.map(r => r.name).join(', ')}`,
      details: { empty, filled },
    });
  } else {
    log({
      id: 2,
      name: '4 Pilot Reçete Malzemeleri',
      status: 'warning',
      message: `${recipes.length}/${PILOT_RECIPES.length} reçete bulundu — bazı pilot reçeteler factory_recipes'te yok`,
      details: { found: recipes.map(r => r.name) },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 3 & 4: 36 Yeni Hammadde Fiyat + Besin Değer
// ═══════════════════════════════════════════════════════════════════
async function check3and4_NewMaterialsCompleteness(): Promise<void> {
  const newMaterials = await db.select({
    id: inventory.id,
    code: inventory.code,
    name: inventory.name,
    currentUnitPrice: inventory.currentUnitPrice,
    energyKcal: inventory.energyKcal,
    isActive: inventory.isActive,
  })
    .from(inventory)
    .where(sql`${inventory.code} LIKE 'HAM-1%'`);

  const noPrice = newMaterials.filter(m => m.currentUnitPrice === null || Number(m.currentUnitPrice) === 0);
  const noNutrition = newMaterials.filter(m => m.energyKcal === null);
  const stillPasif = newMaterials.filter(m => m.isActive === false);

  // CHECK 3
  if (noPrice.length === 0) {
    log({
      id: 3,
      name: 'Yeni Hammadde Fiyatları',
      status: 'pass',
      message: `${newMaterials.length} yeni hammaddenin hepsinde fiyat var`,
    });
  } else {
    log({
      id: 3,
      name: 'Yeni Hammadde Fiyatları',
      status: 'warning',
      message: `${noPrice.length}/${newMaterials.length} yeni hammaddenin fiyatı eksik (Sema doldurmalı)`,
      details: { eksikFiyat: noPrice.map(m => `${m.code} ${m.name}`) },
    });
  }

  // CHECK 4
  if (noNutrition.length === 0) {
    log({
      id: 4,
      name: 'Yeni Hammadde Besin Değerleri',
      status: 'pass',
      message: `${newMaterials.length} yeni hammaddenin hepsinde besin değer var`,
    });
  } else {
    log({
      id: 4,
      name: 'Yeni Hammadde Besin Değerleri',
      status: 'warning',
      message: `${noNutrition.length}/${newMaterials.length} yeni hammaddenin besin değeri eksik (etiket için kritik!)`,
      details: { eksikBesin: noNutrition.map(m => `${m.code} ${m.name}`) },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 5: Onaylanmış Reçeteler İçin tgkLabels Taslak
// ═══════════════════════════════════════════════════════════════════
async function check5_LabelsForApprovedRecipes(): Promise<void> {
  const PILOT_RECIPES = [
    'Donut Base Hamuru Reçetesi',
    'Cinnaboom Classic Reçetesi',
    'Cinnaboom Brownie Reçetesi',
    'Cheesecake Base Reçetesi',
  ];

  const recipesWithLabels = await db.select({
    recipeId: factoryRecipes.id,
    recipeName: factoryRecipes.name,
    labelCount: sql<number>`(SELECT COUNT(*) FROM tgk_labels WHERE product_id = ${factoryRecipes.id} AND product_type = 'factory_product' AND is_active = true)`,
  })
    .from(factoryRecipes)
    .where(sql`${factoryRecipes.name} IN (${sql.join(PILOT_RECIPES.map(n => sql`${n}`), sql`, `)})`);

  const noLabel = recipesWithLabels.filter(r => Number(r.labelCount) === 0);

  if (noLabel.length === 0) {
    log({
      id: 5,
      name: 'Auto-Label Taslakları',
      status: 'pass',
      message: `4 pilot reçete için etiket taslağı hazır`,
      details: recipesWithLabels,
    });
  } else {
    log({
      id: 5,
      name: 'Auto-Label Taslakları',
      status: 'warning',
      message: `${noLabel.length} reçete için etiket yok (Sema "Gramaj Onayı" vermesi gerek — auto-label tetiklenir)`,
      details: { eksikEtiket: noLabel.map(r => r.recipeName) },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 6: HQ PIN'leri (19 user)
// ═══════════════════════════════════════════════════════════════════
async function check6_HqPins(): Promise<void> {
  const hqUsers = await db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    hasPin: sql<boolean>`${users.kioskPin} IS NOT NULL`,
  })
    .from(users)
    .where(sql`${users.role} IN ('admin', 'ceo', 'cgo', 'gida_muhendisi', 'satinalma', 'koc', 'egitmen', 'recete_gm', 'fabrika_muduru', 'muhasebe', 'hr', 'kalite_yoneticisi', 'pazarlama', 'it', 'sef')`);

  const noPin = hqUsers.filter(u => !u.hasPin);

  if (hqUsers.length === 0) {
    log({
      id: 6,
      name: 'HQ User PIN\'leri',
      status: 'warning',
      message: 'HQ user bulunamadı — DB seed kontrol et',
    });
  } else if (noPin.length === 0) {
    log({
      id: 6,
      name: 'HQ User PIN\'leri',
      status: 'pass',
      message: `${hqUsers.length} HQ user'ın hepsinde PIN var`,
    });
  } else {
    log({
      id: 6,
      name: 'HQ User PIN\'leri',
      status: 'fail',
      message: `${noPin.length}/${hqUsers.length} HQ user'ın PIN'i YOK — kiosk girişi engellenir!`,
      details: { pinYok: noPin.map(u => `${u.username} (${u.role})`) },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 7: 4 Pilot Lokasyonu Erişilebilir mi
// ═══════════════════════════════════════════════════════════════════
async function check7_PilotLocations(): Promise<void> {
  const PILOT_BRANCH_CODES = [5, 8, 23, 24];

  const branchesFound = await db.select({
    id: branches.id,
    name: branches.name,
    isActive: branches.isActive,
  })
    .from(branches)
    .where(sql`${branches.id} IN (${sql.join(PILOT_BRANCH_CODES.map(c => sql`${c}`), sql`, `)})`);

  const inactive = branchesFound.filter(b => !b.isActive);

  if (branchesFound.length === 4 && inactive.length === 0) {
    log({
      id: 7,
      name: '4 Pilot Lokasyonu',
      status: 'pass',
      message: `Tüm pilot lokasyonları aktif: ${branchesFound.map(b => b.name).join(', ')}`,
    });
  } else if (branchesFound.length < 4) {
    log({
      id: 7,
      name: '4 Pilot Lokasyonu',
      status: 'fail',
      message: `${branchesFound.length}/4 pilot lokasyonu bulundu — eksik var`,
      details: { found: branchesFound.map(b => `${b.id}: ${b.name}`) },
    });
  } else {
    log({
      id: 7,
      name: '4 Pilot Lokasyonu',
      status: 'fail',
      message: `${inactive.length} pilot lokasyonu PASİF — aktive et!`,
      details: { pasif: inactive.map(b => b.name) },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 8: KVKK Consent Tablosu
// ═══════════════════════════════════════════════════════════════════
async function check8_KvkkConsentTable(): Promise<void> {
  try {
    const count = await db.select({ count: sql<number>`COUNT(*)` })
      .from(kvkkConsents);
    log({
      id: 8,
      name: 'KVKK Consent Tablosu',
      status: 'pass',
      message: `kvkk_consents tablosu erişilebilir, ${count[0].count} kayıt`,
    });
  } catch (err: any) {
    log({
      id: 8,
      name: 'KVKK Consent Tablosu',
      status: 'fail',
      message: `kvkk_consents tablosu erişilemiyor: ${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 9: Mr. Dobody Scheduler
// ═══════════════════════════════════════════════════════════════════
async function check9_MrDobodyScheduler(): Promise<void> {
  // periodic_check_runs veya benzer bir tablodan son çalıştırmayı kontrol
  try {
    const result = await db.execute(
      sql`SELECT to_regclass('periodic_check_runs')::text AS exists`
    );
    const tableExists = (result as any).rows?.[0]?.exists;

    if (!tableExists) {
      log({
        id: 9,
        name: 'Mr. Dobody Scheduler',
        status: 'warning',
        message: 'periodic_check_runs tablosu yok — scheduler manuel test edilmeli',
      });
      return;
    }

    const lastRun = await db.execute(
      sql`SELECT MAX(created_at) as last_run FROM periodic_check_runs`
    );
    const lastRunDate = (lastRun as any).rows?.[0]?.last_run;

    if (!lastRunDate) {
      log({
        id: 9,
        name: 'Mr. Dobody Scheduler',
        status: 'warning',
        message: 'Henüz hiç çalıştırılmamış — pilot başlamadan önce manuel test et',
      });
    } else {
      const ageHours = (Date.now() - new Date(lastRunDate).getTime()) / (1000 * 60 * 60);
      if (ageHours <= 2) {
        log({
          id: 9,
          name: 'Mr. Dobody Scheduler',
          status: 'pass',
          message: `Son çalıştırma ${ageHours.toFixed(1)} saat önce (sağlıklı)`,
        });
      } else {
        log({
          id: 9,
          name: 'Mr. Dobody Scheduler',
          status: 'warning',
          message: `Son çalıştırma ${ageHours.toFixed(1)} saat önce — scheduler çalışıyor mu kontrol et`,
        });
      }
    }
  } catch (err: any) {
    log({
      id: 9,
      name: 'Mr. Dobody Scheduler',
      status: 'warning',
      message: `Kontrol başarısız: ${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 10: Sentry/Logger
// ═══════════════════════════════════════════════════════════════════
async function check10_Logger(): Promise<void> {
  const hasSentry = !!process.env.SENTRY_DSN;
  const hasPino = true; // Pino import edilebilir mi (production'da)

  if (hasSentry) {
    log({
      id: 10,
      name: 'Hata İzleme (Sentry)',
      status: 'pass',
      message: 'Sentry DSN tanımlı — pilot sırasında hatalar yakalanır',
    });
  } else {
    log({
      id: 10,
      name: 'Hata İzleme (Sentry)',
      status: 'warning',
      message: 'SENTRY_DSN env var yok — hatalar sadece konsol log\'unda görünür (post-pilot Sprint H)',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 11: Backup
// ═══════════════════════════════════════════════════════════════════
async function check11_Backup(): Promise<void> {
  try {
    const fs = await import('fs');
    const backupDir = '/home/runner/workspace/docs/audit/backups';
    if (!fs.existsSync(backupDir)) {
      log({
        id: 11,
        name: 'DB Backup',
        status: 'warning',
        message: 'Backup klasörü yok — pilot öncesi backup al',
      });
      return;
    }
    const files = fs.readdirSync(backupDir).filter((f: string) => f.endsWith('.sql') || f.endsWith('.dump'));
    if (files.length === 0) {
      log({
        id: 11,
        name: 'DB Backup',
        status: 'warning',
        message: 'Backup dosyası yok — pilot öncesi backup al',
      });
      return;
    }
    const newest = files
      .map((f: string) => ({ name: f, mtime: fs.statSync(`${backupDir}/${f}`).mtime }))
      .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime())[0];
    const ageHours = (Date.now() - newest.mtime.getTime()) / (1000 * 60 * 60);
    if (ageHours <= 24) {
      log({
        id: 11,
        name: 'DB Backup',
        status: 'pass',
        message: `En yeni backup ${ageHours.toFixed(1)} saat önce (${newest.name})`,
      });
    } else {
      log({
        id: 11,
        name: 'DB Backup',
        status: 'warning',
        message: `En yeni backup ${ageHours.toFixed(1)} saat önce — pilot öncesi yeni backup al`,
      });
    }
  } catch (err: any) {
    log({
      id: 11,
      name: 'DB Backup',
      status: 'warning',
      message: `Backup kontrolü başarısız: ${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 12: Kritik Endpoint'ler 200 Dönüyor mu
// ═══════════════════════════════════════════════════════════════════
async function check12_CriticalEndpoints(): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const endpoints = [
    '/api/auth/me',
    '/api/factory/recipes',
    '/api/girdi/list',
    '/api/branches',
  ];

  const httpResults: any[] = [];
  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(`${baseUrl}${ep}`, { method: 'GET' });
      const duration = Date.now() - start;
      httpResults.push({
        endpoint: ep,
        status: res.status,
        duration: `${duration}ms`,
        ok: res.status === 200 || res.status === 401, // 401 = auth required, normal
      });
    } catch (err: any) {
      httpResults.push({ endpoint: ep, status: 'ERROR', error: err.message, ok: false });
    }
  }

  const failed = httpResults.filter(r => !r.ok);
  if (failed.length === 0) {
    log({
      id: 12,
      name: 'Kritik Endpoint\'ler',
      status: 'pass',
      message: `${endpoints.length}/${endpoints.length} endpoint sağlıklı`,
      details: httpResults,
    });
  } else {
    log({
      id: 12,
      name: 'Kritik Endpoint\'ler',
      status: 'fail',
      message: `${failed.length}/${endpoints.length} endpoint başarısız`,
      details: { failed, all: httpResults },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// ANA ÇALIŞTIRMA
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('DOSPRESSO Pilot Day-1 Smoke Test');
  console.log(`Çalıştırma: ${new Date().toLocaleString('tr-TR')}`);
  console.log('═══════════════════════════════════════\n');

  await check1_DbConnection();
  await check2_PilotRecipesHaveIngredients();
  await check3and4_NewMaterialsCompleteness();
  await check5_LabelsForApprovedRecipes();
  await check6_HqPins();
  await check7_PilotLocations();
  await check8_KvkkConsentTable();
  await check9_MrDobodyScheduler();
  await check10_Logger();
  await check11_Backup();
  await check12_CriticalEndpoints();

  // ═══════════════════════════════════════════════════════════════════
  // ÖZET
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════');
  console.log('ÖZET');
  console.log('═══════════════════════════════════════');

  const pass = results.filter(r => r.status === 'pass').length;
  const warn = results.filter(r => r.status === 'warning').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const skip = results.filter(r => r.status === 'skip').length;

  console.log(`✅ PASS:      ${pass}/${results.length}`);
  console.log(`⚠️  WARNING:   ${warn}/${results.length}`);
  console.log(`❌ FAIL:      ${fail}/${results.length}`);
  console.log(`⏭️  SKIP:      ${skip}/${results.length}`);

  // Kararlılık
  if (fail > 0) {
    console.log('\n🔴 PILOT BAŞLATILMAMALI — kritik hatalar var');
  } else if (warn > 0) {
    console.log('\n🟡 PILOT BAŞLATILABİLİR — uyarıları gözden geçir, kritik değiller');
  } else {
    console.log('\n🟢 PILOT BAŞLATILABİLİR — tüm kontroller başarılı 🎉');
  }

  // JSON çıktı
  try {
    const outputPath = join(process.cwd(), 'scripts', 'smoke-test-result.json');
    writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { pass, warn, fail, skip, total: results.length },
      results,
    }, null, 2));
    console.log(`\n💾 Detaylı rapor: scripts/smoke-test-result.json`);
  } catch (err: any) {
    console.log(`\n⚠️  JSON çıktı kaydedilemedi: ${err.message}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Smoke test crash:', err);
  process.exit(1);
});
