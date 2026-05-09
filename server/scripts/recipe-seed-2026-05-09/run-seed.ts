/**
 * DOSPRESSO Reçete Seed Script — Aslan'dan gelen 9 reçeteyi DB'ye yükle
 *
 * KULLANIM (Replit Shell):
 *   tsx server/scripts/recipe-seed-2026-05-09/run-seed.ts
 *
 * NE YAPAR:
 * 1. Her reçete için factoryRecipes kaydını bulur (R-4'teki 13 boş reçete)
 * 2. Her ingredient için inventory'de smart match yapar (LOWER + benzerlik)
 * 3. Eşleşmeyen hammaddeyi inventory'ye otomatik ekler (status: 'pasif', kontrolde)
 * 4. factoryRecipeIngredients'e kayıt ekler (rawMaterialId ile bağlı)
 * 5. Reçete onay mutation tetikler (auto-label çalışsın)
 *
 * ÇIKTI:
 * - Konsola detaylı rapor (her reçete için kaç malzeme eşleşti, eklendi)
 * - JSON dosyası: server/scripts/recipe-seed-2026-05-09/seed-result.json
 *   (Sema'nın inceleyebilmesi için)
 *
 * GÜVENLİK:
 * - DRY RUN modu: --dry-run flag ile sadece raporla, DB'ye dokunma
 * - Idempotency: Reçete zaten malzemeli ise SKIP (üzerine yazmaz)
 */

import { db } from "../../db";
import {
  factoryRecipes,
  factoryRecipeIngredients,
  inventory,
} from "@shared/schema";
import { eq, sql, ilike, and } from "drizzle-orm";
import { RECIPES_PILOT_5, RECIPES_BONUS, type RecipeData, type RecipeIngredient } from "./recipes-data";
import { writeFileSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ═══════════════════════════════════════════════════════════════════
// HAMMADDE EŞLEŞTİRME — Smart match v2 (Aslan 9 May 2026 düzeltmeleri)
// ═══════════════════════════════════════════════════════════════════
//
// V1 (önceki) sorunları:
//   - "Tuz" → "TDS Metre Tuz Ölçer" (cihaz!)
//   - "Sıvı Yağ" → "Sıvı Şanti" (krem!)
//   - "İnvert Şeker Şurubu" → "Su" (su!)
//   - "Kakao Aroması" → "Kakao Tozu" (toz!)
//
// V2 çözümü:
//   1) Word boundary check (tam kelime, başka kelimenin parçası değil)
//   2) DENIED keywords (eşleşme reddet: "ölçer", "cihaz", "metre")
//   3) MANUAL OVERRIDE (force-create listesi — kesinlikle yeni oluştur)
//   4) Confidence threshold (eşleşme oranı %70+ olmazsa reject)
// ═══════════════════════════════════════════════════════════════════

/**
 * Bu hammaddeler için inventory'de partial match BULSA BİLE
 * yeni kayıt oluşturulur. Çünkü V1'de yanlış eşleşmişlerdi.
 *
 * Bu listede olan ingredient'lar:
 * - Sadece exact match kabul edilir (tam isim eşitliği)
 * - Partial/keyword match yapılmaz
 * - Yoksa direkt "create" olur
 */
const FORCE_EXACT_MATCH: string[] = [
  'invert şeker şurubu',
  'tuz',                          // "TDS Metre Tuz Ölçer" gibi cihazlardan kaçın
  'sıvı yağ',                     // "Sıvı Şanti" gibi krem/şuruplardan kaçın
  'soya unu',                     // "Un (E.M)" buğday unundan kaçın
  'kahve kreması tozu',           // "Espresso Çekirdek" gibi farklı üründen kaçın
  'kakao aroması',                // "Kakao Tozu" ham maddesinden kaçın
  'şeker kamışı aroması',         // "Beyaz Şeker" şekerinden kaçın
  'acı badem aroması',
  'bitter çikolata aroması',
  'cha tea aroması',
];

/**
 * Bu kelimeler bir inventory item adında geçiyorsa, o item ASLA eşleşme
 * adayı olmaz. Cihaz/araç/etiket/temizlik ürünlerini filtreler.
 */
const DENIED_KEYWORDS: string[] = [
  'ölçer', 'olcer',
  'cihaz',
  'metre',                        // "TDS Metre"
  'sensör', 'sensor',
  'temizlik',
  'deterjan',
  'ambalaj',
  'kasa',                         // "Kasa Etiketi"
  'kutu',
  'şişe', 'sise',                 // boş şişe
  'fileto',                       // et ürünü
  'parfüm', 'parfum',
];

/**
 * Levenshtein distance — 2 string arası benzerlik
 * 0 = identical, daha büyük = daha farklı
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,        // delete
        matrix[j - 1][i] + 1,        // insert
        matrix[j - 1][i - 1] + cost  // substitute
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Benzerlik skoru — 0.0 (farklı) ↔ 1.0 (identical)
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Word boundary kontrolü — "tuz" kelimesi tam olarak geçiyor mu?
 * "tuzlu" veya "tuzöğütücü" değil, "tuz" sözcüğü olarak.
 */
function hasWordBoundary(haystack: string, needle: string): boolean {
  const regex = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(haystack);
}

/**
 * Türkçe karakterleri normalize et + lowercase
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MIN_CONFIDENCE = 0.70;  // %70+ olmayanlar reddedilir → create

/**
 * inventory tablosunda hammadde ara — V2 SMART MATCH
 */
async function findOrCreateInventoryItem(
  ingredientName: string,
  unit: string,
): Promise<{ id: number; matchType: 'exact' | 'partial' | 'created'; matchedName: string; confidence?: number }> {
  const normalized = normalize(ingredientName);

  // inventory tablosundan tüm aktif kayıtları al
  const allInventory = await db.select({
    id: inventory.id,
    name: inventory.name,
  }).from(inventory);

  // ═══════════════════════════════════════════════════════════════════
  // 1) TAM EŞLEŞME (her zaman ÖNCE — en güvenilir)
  // ═══════════════════════════════════════════════════════════════════
  const exactMatch = allInventory.find(inv => normalize(inv.name) === normalized);
  if (exactMatch) {
    return { id: exactMatch.id, matchType: 'exact', matchedName: exactMatch.name, confidence: 1.0 };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2) FORCE_EXACT_MATCH listesindeki ingredient'lar partial/keyword
  //    yapmadan direkt CREATE olur (V1'deki yanlış eşleşmeleri önler)
  // ═══════════════════════════════════════════════════════════════════
  const forceCreateThisOne = FORCE_EXACT_MATCH.includes(normalized);
  if (forceCreateThisOne) {
    return await createNewInventoryItem(ingredientName, unit, 'force-exact-only');
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3) PARTIAL MATCH (denied keywords filter + word boundary + confidence)
  // ═══════════════════════════════════════════════════════════════════
  const candidates: Array<{ inv: { id: number; name: string }; score: number }> = [];

  for (const inv of allInventory) {
    const invNorm = normalize(inv.name);

    // DENIED keyword check — "ölçer", "cihaz" geçiyorsa atla
    const hasDeniedKeyword = DENIED_KEYWORDS.some(denied => invNorm.includes(denied));
    if (hasDeniedKeyword) continue;

    // Tam içerme kontrolü (haystack invNorm'da needle normalized geçiyor mu?)
    let score = 0;

    if (invNorm === normalized) {
      score = 1.0;  // Tam eşleşme
    } else if (hasWordBoundary(invNorm, normalized)) {
      // "Buğday Unu" içinde "buğday" tam kelime olarak var
      score = similarity(invNorm, normalized) + 0.2; // word boundary bonus
    } else if (invNorm.includes(normalized) || normalized.includes(invNorm)) {
      // Partial içerme (kötü eşleşme riski)
      score = similarity(invNorm, normalized);
    }

    if (score >= MIN_CONFIDENCE) {
      candidates.push({ inv, score });
    }
  }

  // En yüksek skorlu adayı seç
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (best && best.score >= MIN_CONFIDENCE) {
    return {
      id: best.inv.id,
      matchType: 'partial',
      matchedName: best.inv.name,
      confidence: Math.min(best.score, 1.0),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4) HİÇBİR ŞEY EŞLEŞMEDİ → YENİ INVENTORY ITEM OLUŞTUR
  // ═══════════════════════════════════════════════════════════════════
  return await createNewInventoryItem(ingredientName, unit, 'no-match');
}

async function createNewInventoryItem(
  ingredientName: string,
  unit: string,
  reason: string,
): Promise<{ id: number; matchType: 'created'; matchedName: string }> {
  if (DRY_RUN) {
    return { id: -1, matchType: 'created', matchedName: `${ingredientName} (CREATE — ${reason})` };
  }

  const lastCode = await db.select({ code: inventory.code })
    .from(inventory)
    .where(ilike(inventory.code, 'HAM-%'))
    .orderBy(sql`${inventory.code} DESC`)
    .limit(1);
  const nextNum = lastCode[0] ? parseInt(lastCode[0].code.replace('HAM-', '')) + 1 : 1000;
  const newCode = `HAM-${String(nextNum).padStart(4, '0')}`;

  const [created] = await db.insert(inventory).values({
    code: newCode,
    name: ingredientName,
    unit: unit as any,
    isActive: false,  // PASİF — Sema kontrol etmeli
    description: `Otomatik oluşturuldu (9 May 2026 reçete seed v2, sebep: ${reason}). Sema kontrol etmeli, fiyat + besin değer doldurulmalı.`,
  } as any).returning({ id: inventory.id });

  return { id: created.id, matchType: 'created', matchedName: ingredientName };
}

// ═══════════════════════════════════════════════════════════════════
// REÇETE İŞLEME
// ═══════════════════════════════════════════════════════════════════

type IngestionResult = {
  recipeName: string;
  recipeId: number | null;
  status: 'success' | 'skipped' | 'recipe_not_found' | 'has_ingredients';
  totalIngredients: number;
  matched: { exact: number; partial: number; created: number };
  ingredientLog: Array<{
    name: string;
    amount: number;
    unit: string;
    rawMaterialId: number;
    matchType: string;
    matchedName: string;
    confidence?: number;
  }>;
  notes?: string;
};

async function ingestRecipe(recipe: RecipeData): Promise<IngestionResult> {
  const result: IngestionResult = {
    recipeName: recipe.recipeName,
    recipeId: null,
    status: 'success',
    totalIngredients: recipe.ingredients.length,
    matched: { exact: 0, partial: 0, created: 0 },
    ingredientLog: [],
  };

  // 1) Reçete factory_recipes'te var mı?
  const recipeRows = await db.select({ id: factoryRecipes.id, name: factoryRecipes.name })
    .from(factoryRecipes)
    .where(sql`LOWER(TRIM(${factoryRecipes.name})) = LOWER(TRIM(${recipe.recipeName}))`)
    .limit(1);

  let recipeId: number;

  if (recipeRows.length === 0) {
    // YENİ REÇETE — factory_recipes'e otomatik oluştur (DOREO ve Golden Latte gibi)
    if (DRY_RUN) {
      result.status = 'recipe_not_found';
      result.notes = `Reçete "${recipe.recipeName}" factory_recipes'te yok — DRY RUN'da CREATE atlandı, canlıda oluşturulacak`;
      return result;
    }

    const [created] = await db.insert(factoryRecipes).values({
      name: recipe.recipeName,
      code: recipe.recipeCode || `AUTO-${Date.now()}`,
      description: recipe.description || '',
      category: 'donut',  // Default kategori, Sema sonra düzeltir
      isActive: false,    // PASİF — Sema kontrol etmeli
      version: 1,
      createdBy: 'system-seed-2026-05-09',
    } as any).returning({ id: factoryRecipes.id });
    recipeId = created.id;
    result.notes = `YENİ REÇETE oluşturuldu (id: ${recipeId}, status: pasif). Sema kontrol edip aktive etmeli.`;
  } else {
    recipeId = recipeRows[0].id;
  }

  result.recipeId = recipeId;

  // 2) Reçetede zaten malzeme var mı? (idempotency)
  const existingCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(factoryRecipeIngredients)
    .where(eq(factoryRecipeIngredients.recipeId, recipeId));

  if (Number(existingCount[0]?.count || 0) > 0) {
    result.status = 'has_ingredients';
    result.notes = `Reçete zaten ${existingCount[0].count} malzeme içeriyor — SKIP. Üzerine yazmak için manuel sil + tekrar çalıştır.`;
    return result;
  }

  // 3) Her ingredient için match + insert
  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    const match = await findOrCreateInventoryItem(ing.name, ing.unit);

    result.ingredientLog.push({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      rawMaterialId: match.id,
      matchType: match.matchType,
      matchedName: match.matchedName,
      confidence: match.confidence,
    });

    if (match.matchType === 'exact') result.matched.exact++;
    else if (match.matchType === 'partial') result.matched.partial++;
    else result.matched.created++;

    // DRY_RUN ise insert atlama
    if (!DRY_RUN && match.id > 0) {
      await db.insert(factoryRecipeIngredients).values({
        recipeId,
        name: ing.name,
        amount: String(ing.amount),
        unit: ing.unit as any,
        rawMaterialId: match.id,
        sortOrder: i,
        notes: ing.notes,
        ingredientType: 'raw_material',
      } as any);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ANA ÇALIŞTIRMA
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('DOSPRESSO Reçete Seed (9 May 2026)');
  console.log('Aslan\'ın 9 reçetesi → factory_recipes');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (DB değişmez)' : 'CANLI (DB güncellenir)'}`);
  console.log('═══════════════════════════════════════\n');

  const allRecipes = [...RECIPES_PILOT_5, ...RECIPES_BONUS];
  const results: IngestionResult[] = [];

  for (const recipe of allRecipes) {
    console.log(`▶ İşleniyor: ${recipe.recipeName} (${recipe.ingredients.length} malzeme)...`);
    const result = await ingestRecipe(recipe);
    results.push(result);

    if (result.status === 'success') {
      console.log(`  ✅ Eklendi: ${result.matched.exact} exact + ${result.matched.partial} partial + ${result.matched.created} oluşturuldu`);
    } else if (result.status === 'has_ingredients') {
      console.log(`  ⏭  SKIP: Reçetede zaten malzeme var`);
    } else if (result.status === 'recipe_not_found') {
      console.log(`  ⚠️  Reçete factory_recipes'te yok — manuel kontrol gerekli`);
    }

    if (VERBOSE) {
      result.ingredientLog.forEach(log => {
        const icon = log.matchType === 'exact' ? '✅' : log.matchType === 'partial' ? '🔶' : '🆕';
        const confStr = log.confidence !== undefined ? ` [${(log.confidence * 100).toFixed(0)}%]` : '';
        const warning = log.matchType === 'partial' && (log.confidence ?? 1) < 0.85 ? ' ⚠️' : '';
        console.log(`    ${icon}${warning} ${log.name} (${log.amount}${log.unit}) → ${log.matchedName} (id:${log.rawMaterialId})${confStr}`);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ÖZET RAPOR
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════');
  console.log('ÖZET');
  console.log('═══════════════════════════════════════');

  const totalIng = results.reduce((sum, r) => sum + r.totalIngredients, 0);
  const totalExact = results.reduce((sum, r) => sum + r.matched.exact, 0);
  const totalPartial = results.reduce((sum, r) => sum + r.matched.partial, 0);
  const totalCreated = results.reduce((sum, r) => sum + r.matched.created, 0);

  console.log(`Toplam reçete:        ${results.length}`);
  console.log(`Toplam malzeme:       ${totalIng}`);
  console.log(`✅ Exact eşleşme:     ${totalExact} (${Math.round(totalExact/totalIng*100)}%)`);
  console.log(`🔶 Partial eşleşme:   ${totalPartial} (${Math.round(totalPartial/totalIng*100)}%)`);
  console.log(`🆕 Yeni hammadde:     ${totalCreated} (${Math.round(totalCreated/totalIng*100)}%)`);
  console.log(`⏭  Skip edilen reçete: ${results.filter(r => r.status === 'has_ingredients').length}`);
  console.log(`⚠️  Bulunamayan reçete: ${results.filter(r => r.status === 'recipe_not_found').length}`);

  // JSON dosyası kaydet
  const outputPath = join(__dirname, 'seed-result.json');
  writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'live',
    results,
    summary: {
      totalRecipes: results.length,
      totalIngredients: totalIng,
      exactMatches: totalExact,
      partialMatches: totalPartial,
      createdNew: totalCreated,
    },
  }, null, 2));

  console.log(`\n💾 Detaylı rapor: ${outputPath}`);
  console.log('\n✅ İşlem tamamlandı.');

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — DB değişmedi. Gerçek için --dry-run flag\'i kaldır:');
    console.log('   tsx server/scripts/recipe-seed-2026-05-09/run-seed.ts');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ HATA:', err);
    process.exit(1);
  });
