/**
 * DON-001 Donut Reçetesi — Aslan'ın Gerçek Formülü
 * 29 ayrıştırılmış hammadde (katkı maddeleri ayrı)
 * 41 KG hamur → 630 adet × 65g
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

// Reçete bileşenleri — isim + miktar (gram) + hammadde kodu
const DONUT_INGREDIENTS = [
  // Ana unsurlar
  { name: "Buğday Unu", amount: 30000, unit: "g", category: "un", type: "hammadde", material_search: "un 25" },
  { name: "Vital Gluten", amount: 130, unit: "g", category: "katki", type: "hammadde", material_search: "gluten" },
  { name: "Toz Yumurta", amount: 150, unit: "g", category: "sut_urunu", type: "hammadde", material_search: "yumurta tozu" },
  { name: "Su", amount: 17000, unit: "g", category: "sivi", type: "hammadde", material_search: null },
  
  // Şekerler
  { name: "Şeker", amount: 3300, unit: "g", category: "seker", type: "hammadde", material_search: "toz şeker 50" },
  { name: "Dekstroz", amount: 500, unit: "g", category: "seker", type: "hammadde", material_search: "dekstroz" },
  { name: "İnvert Şurup (Creambase)", amount: 250, unit: "g", category: "seker", type: "hammadde", material_search: "creamice base" },
  { name: "Gliserin", amount: 110, unit: "g", category: "katki", type: "hammadde", material_search: "gliserin" },
  
  // Yağlar
  { name: "Margarin (Alba)", amount: 2900, unit: "g", category: "yag", type: "hammadde", material_search: "turyağ mayalı" },
  { name: "Sıvı Yağ", amount: 1300, unit: "g", category: "yag", type: "hammadde", material_search: "ayçiçek yağı" },
  
  // Süt ürünleri
  { name: "Yağsız Süt Tozu", amount: 500, unit: "g", category: "sut_urunu", type: "hammadde", material_search: "yağsız süt tozu 25" },
  { name: "Soya Unu", amount: 120, unit: "g", category: "un", type: "hammadde", material_search: "soya" },
  { name: "PST (Peynir Altı Suyu Tozu)", amount: 30, unit: "g", category: "sut_urunu", type: "hammadde", material_search: "peynir altı suyu" },
  { name: "Tuz", amount: 400, unit: "g", category: "katki", type: "hammadde", material_search: "tuz 3 kg" },
  
  // Maya
  { name: "Yaş Maya", amount: 1000, unit: "g", category: "maya", type: "hammadde", material_search: "yaş maya 500" },
  
  // Keyblend - Emülgatörler
  { name: "CMC (E466)", amount: 40, unit: "g", category: "katki", type: "keyblend", material_search: "cmc" },
  { name: "Xanthan (E415)", amount: 1, unit: "g", category: "katki", type: "keyblend", material_search: "ksantan" },
  { name: "Pregel Modifiye Mısır Nişastası", amount: 110, unit: "g", category: "katki", type: "keyblend", material_search: "nişasta" },
  
  // Keyblend - Enzimler
  { name: "Maltogenik Amilaz", amount: 3, unit: "g", category: "katki", type: "keyblend", material_search: "maltogenik" },
  { name: "L-Sistein (E920)", amount: 1, unit: "g", category: "katki", type: "keyblend", material_search: "sistein" },
  
  // Keyblend - Koruyucular
  { name: "Vitamin C (E300)", amount: 2, unit: "g", category: "katki", type: "keyblend", material_search: "vitamin c" },
  { name: "Kalsiyum Propiyonat (E282)", amount: 40, unit: "g", category: "katki", type: "keyblend", material_search: "kalsiyum propiyonat" },
  
  // Keyblend - Emülgatörler 2
  { name: "DATEM (E472e)", amount: 60, unit: "g", category: "katki", type: "keyblend", material_search: "datem" },
  { name: "SSL (E481)", amount: 85, unit: "g", category: "katki", type: "keyblend", material_search: "ssl" },
  { name: "E471", amount: 85, unit: "g", category: "katki", type: "keyblend", material_search: "e471" },
  
  // Aromalar
  { name: "Vanilya", amount: 35, unit: "g", category: "aroma", type: "hammadde", material_search: "vanilya dkt" },
  { name: "Şeker Kamışı Aroması", amount: 12, unit: "g", category: "aroma", type: "keyblend", material_search: "şeker kamışı" },
  { name: "Acı Badem Aroması", amount: 3, unit: "g", category: "aroma", type: "keyblend", material_search: "acı badem" },
  { name: "Muskat", amount: 3, unit: "g", category: "aroma", type: "keyblend", material_search: "muskat" },
];

async function seedDonutRecipe() {
  console.log("[SEED] DON-001 Donut reçetesi (29 malzeme) seed başlıyor...\n");

  // 1. Mevcut reçeteyi bul
  const existing = await db.execute(sql`SELECT id FROM factory_recipes WHERE code = 'DON-001' LIMIT 1`);
  const recipeId = (existing.rows?.[0] as any)?.id;
  
  if (!recipeId) {
    console.log("❌ DON-001 reçetesi bulunamadı. Önce reçete oluşturulmalı.");
    return;
  }
  
  console.log(`✅ DON-001 reçetesi bulundu (id: ${recipeId})`);

  // 2. Eski malzemeleri sil
  const deleteResult = await db.execute(sql`DELETE FROM factory_recipe_ingredients WHERE recipe_id = ${recipeId}`);
  console.log(`   Eski malzemeler silindi\n`);

  // 3. Her malzeme için inventory'de eşleşme bul
  let linked = 0, unlinked = 0;
  
  for (let i = 0; i < DONUT_INGREDIENTS.length; i++) {
    const ing = DONUT_INGREDIENTS[i];
    let materialId = null;
    
    if (ing.material_search) {
      const match = await db.execute(sql`
        SELECT id FROM inventory 
        WHERE LOWER(name) LIKE ${`%${ing.material_search.toLowerCase()}%`}
        LIMIT 1
      `);
      materialId = (match.rows?.[0] as any)?.id || null;
    }
    
    if (materialId) linked++; else unlinked++;
    
    // Malzemeyi ekle
    await db.execute(sql`
      INSERT INTO factory_recipe_ingredients (
        recipe_id, name, amount, unit, ingredient_type, ingredient_category,
        raw_material_id, sort_order
      ) VALUES (
        ${recipeId}, ${ing.name}, ${ing.amount}, ${ing.unit}, ${ing.type}, ${ing.category},
        ${materialId}, ${i + 1}
      )
    `);
    
    const status = materialId ? "✅" : "⚠️";
    console.log(`   ${status} ${ing.name.padEnd(32)} ${String(ing.amount).padStart(6)}${ing.unit.padEnd(3)} [${ing.type}/${ing.category}] ${materialId ? `→ inv#${materialId}` : "(envanter yok)"}`);
  }

  // 4. Reçete meta güncelle
  await db.execute(sql`
    UPDATE factory_recipes 
    SET 
      base_batch_output = 630,
      expected_unit_weight = '65',
      expected_output_count = 630,
      output_unit = 'adet',
      expected_unit_weight_unit = 'g',
      updated_at = NOW()
    WHERE id = ${recipeId}
  `);

  console.log(`\n[SEED] ═══════════════════════════════════════════`);
  console.log(`[SEED] ✅ ${DONUT_INGREDIENTS.length} malzeme eklendi`);
  console.log(`[SEED]    ${linked} inventory'e bağlandı, ${unlinked} bağlanamadı`);
  console.log(`[SEED]    Batch: 41 KG → 630 adet × 65g`);
  console.log(`[SEED] Doğrulama: SELECT COUNT(*) FROM factory_recipe_ingredients WHERE recipe_id = ${recipeId};`);
}

seedDonutRecipe()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[SEED] Fatal:", err); process.exit(1); });
