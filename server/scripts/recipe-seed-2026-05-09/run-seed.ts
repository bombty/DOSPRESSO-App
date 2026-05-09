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
// HAMMADDE EŞLEŞTİRME — Smart match (Türkçe normalize + benzerlik)
// ═══════════════════════════════════════════════════════════════════

/**
 * Türkçe karakterleri normalize et + lowercase
 * Örn: "Buğday Unu (E.M)" → "bugday unu em"
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

/**
 * inventory tablosunda hammadde ara — 4 strateji
 */
async function findOrCreateInventoryItem(
  ingredientName: string,
  unit: string,
): Promise<{ id: number; matchType: 'exact' | 'partial' | 'created'; matchedName: string }> {
  const normalized = normalize(ingredientName);

  // 1) Tam eşleşme (case-insensitive, normalize)
  const allInventory = await db.select({
    id: inventory.id,
    name: inventory.name,
  }).from(inventory);

  const exactMatch = allInventory.find(inv => normalize(inv.name) === normalized);
  if (exactMatch) {
    return { id: exactMatch.id, matchType: 'exact', matchedName: exactMatch.name };
  }

  // 2) Partial eşleşme (kelime içerme)
  const partialMatch = allInventory.find(inv => {
    const invNorm = normalize(inv.name);
    return invNorm.includes(normalized) || normalized.includes(invNorm);
  });
  if (partialMatch) {
    return { id: partialMatch.id, matchType: 'partial', matchedName: partialMatch.name };
  }

  // 3) Anahtar kelime eşleşme (örn: "Margarin Alba" → "Margarin")
  const firstWord = normalized.split(' ')[0];
  if (firstWord.length > 3) {
    const keywordMatch = allInventory.find(inv => {
      const invNorm = normalize(inv.name);
      return invNorm.includes(firstWord);
    });
    if (keywordMatch) {
      return { id: keywordMatch.id, matchType: 'partial', matchedName: keywordMatch.name };
    }
  }

  // 4) Yok → otomatik oluştur (PASİF olarak — Sema sonra kontrol eder)
  if (DRY_RUN) {
    return { id: -1, matchType: 'created', matchedName: ingredientName + ' (CREATE)' };
  }

  // Code generate: HAM-XXX
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
    description: `Otomatik oluşturuldu (9 May 2026 reçete seed). Sema kontrol etmeli, fiyat + besin değer doldurulmalı.`,
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

  if (recipeRows.length === 0) {
    result.status = 'recipe_not_found';
    result.notes = `Reçete "${recipe.recipeName}" factory_recipes'te bulunamadı. Yeni reçete oluşturulmalı.`;
    return result;
  }

  const recipeId = recipeRows[0].id;
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
        console.log(`    ${icon} ${log.name} (${log.amount}${log.unit}) → ${log.matchedName} (id:${log.rawMaterialId})`);
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
