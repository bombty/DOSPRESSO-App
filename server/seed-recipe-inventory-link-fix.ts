/**
 * Manuel Eşleştirme Fix — Kalan 9 malzeme
 * 1. Eksik 5 hammaddeyi inventory'ye ekle
 * 2. Belirsiz 4'ü doğru eşleştir
 * 
 * Çalıştırma: npx tsx server/seed-recipe-inventory-link-fix.ts
 */

import { db } from "./db";
import { inventory, factoryRecipeIngredients } from "@shared/schema";
import { eq, and, isNull, sql, ilike } from "drizzle-orm";

// ── Eksik 5 hammadde (inventory'de yok, eklenmeli) ──

const MISSING_MATERIALS = [
  { code: "HM-NEW-001", name: "Modifiye Nişasta", category: "hammadde", unit: "kg", materialType: "hammadde", purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" },
  { code: "HM-NEW-002", name: "Vital Wheat Gluten (Buğday Gluteni)", category: "hammadde", unit: "kg", materialType: "hammadde", purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" },
  { code: "HM-NEW-003", name: "Su", category: "hammadde", unit: "lt", materialType: "hammadde", purchaseUnit: "LT", recipeUnit: "ml", conversionFactor: "1000" },
  { code: "HM-NEW-004", name: "AAK ALBA Margarin", category: "hammadde", unit: "kg", materialType: "hammadde", purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" },
  { code: "HM-NEW-005", name: "Gliserin", category: "hammadde", unit: "kg", materialType: "hammadde", purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" },
];

// ── Belirsiz 4 eşleştirme (isim bazlı) ──

const UNCERTAIN_FIXES: { ingredientName: string; inventoryCode: string }[] = [
  { ingredientName: "Yaş maya", inventoryCode: "H-1006" },           // Yaş Maya 500 gr*24
  { ingredientName: "Vanilya özütü", inventoryCode: "H-1009" },      // Vanilya Dkt
  { ingredientName: "İnvert şeker", inventoryCode: "M-1104" },        // Creamice Base Şurup = İnvert şeker (kendi üretim)
  { ingredientName: "Whey protein tozu", inventoryCode: "HM-NEW-006" },
];

async function fixLinks() {
  console.log("[FIX] Manuel eşleştirme başlıyor...");

  // 1. Eksik hammaddeleri ekle
  console.log("\n[FIX] Eksik hammaddeler ekleniyor...");
  
  // Whey protein de ekle
  MISSING_MATERIALS.push({
    code: "HM-NEW-006", name: "Whey Protein Tozu", category: "hammadde", unit: "kg",
    materialType: "hammadde", purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000",
  });

  for (const mat of MISSING_MATERIALS) {
    const [existing] = await db.select({ id: inventory.id })
      .from(inventory).where(eq(inventory.code, mat.code)).limit(1);
    
    if (existing) {
      console.log(`  ⏭️ "${mat.name}" zaten var (${mat.code})`);
      continue;
    }

    const [created] = await db.insert(inventory).values({
      code: mat.code,
      name: mat.name,
      category: mat.category,
      unit: mat.unit,
      materialType: mat.materialType,
      purchaseUnit: mat.purchaseUnit,
      recipeUnit: mat.recipeUnit,
      conversionFactor: mat.conversionFactor,
      currentStock: "0",
      minimumStock: "0",
      unitCost: "0",
    }).returning();
    console.log(`  ✅ "${mat.name}" eklendi (id: ${created.id}, code: ${mat.code})`);
  }

  // 2. Tüm eşleşmemiş malzemeleri bul
  const unlinked = await db.select({
    id: factoryRecipeIngredients.id,
    name: factoryRecipeIngredients.name,
    ingredientType: factoryRecipeIngredients.ingredientType,
  })
  .from(factoryRecipeIngredients)
  .where(and(
    isNull(factoryRecipeIngredients.rawMaterialId),
    sql`${factoryRecipeIngredients.ingredientType} != 'keyblend'`
  ));

  console.log(`\n[FIX] ${unlinked.length} eşleşmemiş malzeme kaldı`);

  let fixed = 0;
  for (const ing of unlinked) {
    const nameLower = (ing.name || "").toLocaleLowerCase("tr-TR");

    // Belirsiz fix listesinden eşleştir
    const fixEntry = UNCERTAIN_FIXES.find(f => 
      nameLower.includes(f.ingredientName.toLocaleLowerCase("tr-TR"))
    );

    // Eksik malzeme listesinden eşleştir
    const missingEntry = MISSING_MATERIALS.find(m => 
      nameLower.includes(m.name.toLocaleLowerCase("tr-TR").split(" ")[0])
    );

    let invCode = fixEntry?.inventoryCode || null;
    
    if (!invCode && missingEntry) {
      invCode = missingEntry.code;
    }

    // Ek heuristik eşleştirmeler
    if (!invCode) {
      if (nameLower.includes("nişasta") || nameLower.includes("modifiye")) invCode = "HM-NEW-001";
      else if (nameLower.includes("gluten") || nameLower.includes("vital")) invCode = "HM-NEW-002";
      else if (nameLower === "su" || nameLower === "water") invCode = "HM-NEW-003";
      else if (nameLower.includes("alba") || nameLower.includes("margarin")) invCode = "HM-NEW-004";
      else if (nameLower.includes("gliserin") || nameLower.includes("glycerin")) invCode = "HM-NEW-005";
      else if (nameLower.includes("whey") || nameLower.includes("protein tozu")) invCode = "HM-NEW-006";
      else if (nameLower.includes("invert") || nameLower.includes("İnvert")) invCode = "M-1104"; // Creamice Base = İnvert şeker
    }

    if (invCode) {
      const [invItem] = await db.select({ id: inventory.id, name: inventory.name })
        .from(inventory).where(eq(inventory.code, invCode)).limit(1);
      
      if (invItem) {
        await db.update(factoryRecipeIngredients)
          .set({ rawMaterialId: invItem.id })
          .where(eq(factoryRecipeIngredients.id, ing.id));
        console.log(`  ✅ "${ing.name}" → "${invItem.name}" (${invCode})`);
        fixed++;
      } else {
        console.log(`  ⚠️ "${ing.name}" → ${invCode} bulunamadı`);
      }
    } else {
      console.log(`  ❌ "${ing.name}" → hâlâ eşleşmedi`);
    }
  }

  // 3. Özet
  const finalCheck = await db.select({
    total: sql<number>`count(*)::int`,
    linked: sql<number>`count(raw_material_id)::int`,
    unlinked: sql<number>`count(*) FILTER (WHERE raw_material_id IS NULL AND ingredient_type != 'keyblend')::int`,
    keyblend: sql<number>`count(*) FILTER (WHERE ingredient_type = 'keyblend')::int`,
  }).from(factoryRecipeIngredients);

  const r = finalCheck[0];
  console.log(`\n[FIX] ✅ Sonuç: Toplam ${r.total}, Bağlı ${r.linked}, Keyblend ${r.keyblend}, Eksik ${r.unlinked}`);
  console.log(`[FIX] Bu oturumda ${fixed} ek eşleştirme yapıldı`);
}

fixLinks()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[FIX] Fatal:", err); process.exit(1); });
