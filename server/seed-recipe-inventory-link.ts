/**
 * Reçete Malzeme ↔ Inventory Eşleştirme
 * factory_recipe_ingredients.raw_material_id → inventory.id
 * 
 * Çalıştırma: npx tsx server/seed-recipe-inventory-link.ts
 * 
 * Algoritma:
 * 1. Tüm inventory kayıtlarını çek (code, name)
 * 2. Tüm recipe ingredients'ı çek (name, raw_material_id=NULL olanlar)
 * 3. İsim benzerliği ile eşleştir (normalize + contains + token match)
 * 4. Güvenli eşleşmeleri otomatik yaz, belirsizleri rapor et
 */

import { db } from "./db";
import { inventory, factoryRecipeIngredients } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

function normalize(s: string): string {
  return (s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[()\/\-_,\.]/g, " ")
    .replace(/\d+\s*(kg|gr|g|lt|l|ml|adet|li|lu|lı|lü)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(t => t.length > 1);
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  
  // Exact match
  if (na === nb) return 1.0;
  
  // Contains
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  
  // Token overlap
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap++;
  }
  
  const jaccardish = overlap / Math.max(ta.size, tb.size);
  return jaccardish;
}

async function linkRecipeIngredients() {
  console.log("[LINK] Reçete→Inventory eşleştirme başlıyor...");

  // 1. Tüm inventory
  const allInventory = await db.select({
    id: inventory.id,
    code: inventory.code,
    name: inventory.name,
    category: inventory.category,
    materialType: inventory.materialType,
    unit: inventory.unit,
  }).from(inventory).orderBy(inventory.name);

  console.log(`[LINK] ${allInventory.length} inventory kaydı yüklendi`);

  // 2. Eşleşmemiş recipe ingredients
  const unlinked = await db.select()
    .from(factoryRecipeIngredients)
    .where(isNull(factoryRecipeIngredients.rawMaterialId));

  console.log(`[LINK] ${unlinked.length} eşleşmemiş malzeme`);

  if (unlinked.length === 0) {
    console.log("[LINK] Tüm malzemeler zaten eşleşmiş!");
    return;
  }

  let linked = 0, uncertain = 0, noMatch = 0;
  const uncertainList: { ingredient: string; candidates: string[] }[] = [];

  for (const ing of unlinked) {
    // Keyblend'leri atla
    if (ing.ingredientType === "keyblend") continue;

    let bestMatch: typeof allInventory[0] | null = null;
    let bestScore = 0;
    const candidates: { inv: typeof allInventory[0]; score: number }[] = [];

    for (const inv of allInventory) {
      const score = similarity(ing.name, inv.name);
      if (score > 0.4) {
        candidates.push({ inv, score });
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = inv;
      }
    }

    if (bestMatch && bestScore >= 0.7) {
      // Güvenli eşleşme — otomatik yaz
      await db.update(factoryRecipeIngredients)
        .set({ rawMaterialId: bestMatch.id })
        .where(eq(factoryRecipeIngredients.id, ing.id));
      console.log(`  ✅ "${ing.name}" → "${bestMatch.name}" (${bestMatch.code}) [${(bestScore * 100).toFixed(0)}%]`);
      linked++;
    } else if (bestMatch && bestScore >= 0.4) {
      // Belirsiz — rapor et
      const topCandidates = candidates.sort((a, b) => b.score - a.score).slice(0, 3);
      uncertainList.push({
        ingredient: `#${ing.id} "${ing.name}" (recipe ${ing.recipeId})`,
        candidates: topCandidates.map(c => `${c.inv.code} "${c.inv.name}" [${(c.score * 100).toFixed(0)}%]`),
      });
      uncertain++;
    } else {
      console.log(`  ❌ "${ing.name}" → eşleşme bulunamadı`);
      noMatch++;
    }
  }

  console.log(`\n[LINK] ✅ Sonuç: ${linked} eşleşti, ${uncertain} belirsiz, ${noMatch} eşleşmedi`);

  if (uncertainList.length > 0) {
    console.log(`\n[LINK] Belirsiz eşleşmeler (manuel kontrol gerekli):`);
    for (const u of uncertainList) {
      console.log(`  ${u.ingredient}`);
      for (const c of u.candidates) {
        console.log(`    → ${c}`);
      }
    }
  }
}

linkRecipeIngredients()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[LINK] Fatal:", err); process.exit(1); });
