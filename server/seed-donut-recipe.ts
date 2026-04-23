/**
 * DOSPRESSO Donut Reçetesi + Keyblend Seed
 * Atşye Hanım formülü
 * 
 * Keyblend: RGM tam görür, diğerleri sadece "Keyblend DON-KB-001" görür
 * Çalıştırma: npx tsx server/seed-donut-recipe.ts
 */

import { db } from "./db";
import { factoryRecipes, factoryRecipeIngredients, factoryKeyblends, factoryKeyblendIngredients, inventory } from "@shared/schema";
import { canonicalIngredientName } from "@shared/lib/ingredient-canonical";
import { eq, sql, ilike } from "drizzle-orm";

// Inventory eşleştirme
async function findInv(searchTerms: string[]): Promise<number | null> {
  for (const term of searchTerms) {
    const [found] = await db.select({ id: inventory.id })
      .from(inventory)
      .where(ilike(inventory.name, `%${term}%`))
      .limit(1);
    if (found) return found.id;
  }
  return null;
}

async function seedDonutRecipe() {
  console.log("[SEED] Donut reçetesi + Keyblend ekleniyor...\n");

  // ── 1. Keyblend oluştur ──
  const KB_CODE = "DON-KB-001";
  let keyblendId: number;

  const [existingKb] = await db.select({ id: factoryKeyblends.id })
    .from(factoryKeyblends)
    .where(eq(factoryKeyblends.code, KB_CODE))
    .limit(1);

  if (existingKb) {
    keyblendId = existingKb.id;
    console.log(`  ⏭️ Keyblend ${KB_CODE} zaten var (id: ${keyblendId})`);
  } else {
    const [kb] = await db.insert(factoryKeyblends).values({
      name: "Donut Keyblend",
      code: KB_CODE,
      description: "Donut hamur katkı karışımı — emülgatör + koruyucu + aroma sistemi",
      
      totalWeight: "335",
      isActive: true,
    }).returning();
    keyblendId = kb.id;
    console.log(`  ✅ Keyblend ${KB_CODE} oluşturuldu (id: ${keyblendId})`);

    // Keyblend malzemeleri
    const KB_INGREDIENTS = [
      { name: "CMC (E466)", amount: 40, unit: "g", category: "emulgatör", searchTerms: ["CMC"] },
      { name: "Xanthan (E415)", amount: 1, unit: "g", category: "emulgatör", searchTerms: ["Xanthan", "KSANTAN"] },
      { name: "Maltogenik amilaz", amount: 3, unit: "g", category: "enzim", searchTerms: ["Maltogenik", "MALTOGENİK"] },
      { name: "L-sistein (E920)", amount: 1, unit: "g", category: "enzim", searchTerms: ["Sistein", "L-SİSTEİN"] },
      { name: "Vitamin C (E300)", amount: 2, unit: "g", category: "antioksidan", searchTerms: ["VİTAMİN C", "Askorbik"] },
      { name: "Kalsiyum propiyonat (E282)", amount: 40, unit: "g", category: "koruyucu", searchTerms: ["Kalsiyum", "KALSİYUM PROPİYONAT"] },
      { name: "DATEM (E472e)", amount: 60, unit: "g", category: "emulgatör", searchTerms: ["DATEM"] },
      { name: "SSL (E481)", amount: 85, unit: "g", category: "emulgatör", searchTerms: ["SSL"] },
      { name: "E471", amount: 85, unit: "g", category: "emulgatör", searchTerms: ["E471"] },
      { name: "Şeker kamışı aroması", amount: 12, unit: "g", category: "aroma", searchTerms: ["ŞEKER KAMIŞI", "Şeker Kamışı"] },
      { name: "Acı badem aroması", amount: 3, unit: "g", category: "aroma", searchTerms: ["ACI BADEM", "Acı Badem"] },
      { name: "Muskat", amount: 3, unit: "g", category: "aroma", searchTerms: ["MUSKAT", "Muskat"] },
    ];

    for (let i = 0; i < KB_INGREDIENTS.length; i++) {
      const ing = KB_INGREDIENTS[i];
      const invId = await findInv(ing.searchTerms);
      await db.insert(factoryKeyblendIngredients).values({
        keyblendId,
        name: ing.name,
        amount: String(ing.amount),
        unit: ing.unit,
        
        sortOrder: i,
        rawMaterialId: invId,
      });
      console.log(`    ${invId ? "✅" : "⚠️"} KB: ${ing.name} — ${ing.amount}${ing.unit}`);
    }
  }

  // ── 2. Donut reçetesi oluştur ──
  const RECIPE_CODE = "DON-001";

  const [existingRecipe] = await db.select({ id: factoryRecipes.id })
    .from(factoryRecipes)
    .where(eq(factoryRecipes.code, RECIPE_CODE))
    .limit(1);

  if (existingRecipe) {
    console.log(`\n  ⏭️ Reçete ${RECIPE_CODE} zaten var (id: ${existingRecipe.id})`);
    return;
  }

  const [recipe] = await db.insert(factoryRecipes).values({
    name: "Donut",
    code: RECIPE_CODE,
    
    outputType: "mamul",
    baseBatchOutput: 65,
    expectedUnitWeight: "120",
    outputUnit: "adet",
    recipeType: "OPEN",
    isVisible: true,
    editLocked: false,
    version: 1,
    description: "Atşye Hanım formülü. Keyblend DON-KB-001 (emülgatör+koruyucu+aroma sistemi). Kızartma sıcaklığı: 180°C, süre: 2-3dk/yüz",
  }).returning();

  console.log(`\n  ✅ Reçete ${RECIPE_CODE} "${recipe.name}" (id: ${recipe.id})`);

  // ── 3. Ana hamur malzemeleri ──
  const MAIN_INGREDIENTS = [
    { name: "Buğday unu", amount: 30000, unit: "g", searchTerms: ["Un", "un"] },
    { name: "Vital gluten", amount: 130, unit: "g", searchTerms: ["Gluten", "Vital Wheat Gluten"] },
    { name: "Toz yumurta", amount: 150, unit: "g", searchTerms: ["Yumurta Tozu", "TOZ YUMURTA"] },
    { name: "Su", amount: 17000, unit: "g", searchTerms: ["Su"] },
    { name: "Şeker", amount: 3300, unit: "g", searchTerms: ["TOZ ŞEKER", "Toz Şeker"] },
    { name: "Dekstroz", amount: 500, unit: "g", searchTerms: ["DEKSTROZ", "Dekstroz"] },
    { name: "İnvert şeker şurubu", amount: 250, unit: "g", searchTerms: ["Creamice Base", "İnvert"] },
    { name: "Gliserin", amount: 110, unit: "g", searchTerms: ["Gliserin", "GLİSERİN"] },
    { name: "Yağ (margarin)", amount: 2900, unit: "g", searchTerms: ["Margarin", "AAK ALBA", "TURYAĞ"] },
    { name: "Sıvı yağ", amount: 1300, unit: "g", searchTerms: ["SIVI YAĞ", "Sıvı Yağ", "Ayçiçek"] },
    { name: "Yağsız süt tozu", amount: 500, unit: "g", searchTerms: ["Yağsız Süt Tozu", "SÜT TOZU"] },
    { name: "Soya unu", amount: 120, unit: "g", searchTerms: ["SOYA UNU", "Soya"] },
    { name: "PST", amount: 30, unit: "g", searchTerms: ["PST"] },
    { name: "Tuz", amount: 400, unit: "g", searchTerms: ["TUZ", "Tuz"] },
    { name: "Pregel modifiye mısır nişastası", amount: 110, unit: "g", searchTerms: ["Modifiye Nişasta", "NİŞASTA"] },
    { name: "Vanilya", amount: 35, unit: "g", searchTerms: ["VANİLİN", "Vanilya", "VANILYA"] },
    { name: "Yaş maya", amount: 1000, unit: "g", searchTerms: ["Yaş Maya", "YAŞ MAYA"] },
  ];

  let linked = 0, unlinked = 0;

  for (let i = 0; i < MAIN_INGREDIENTS.length; i++) {
    const ing = MAIN_INGREDIENTS[i];
    const invId = await findInv(ing.searchTerms);
    const refId = String(i + 1).padStart(4, "0");

    await db.insert(factoryRecipeIngredients).values({
      recipeId: recipe.id,
      refId,
      name: canonicalIngredientName(ing.name),
      amount: String(ing.amount),
      unit: ing.unit,
      ingredientType: "normal",
      ingredientCategory: "ana",
      rawMaterialId: invId,
      sortOrder: i,
    });

    if (invId) linked++; else unlinked++;
    console.log(`  ${invId ? "✅" : "⚠️"} ${ing.name} — ${ing.amount}${ing.unit}`);
  }

  // ── 4. Keyblend malzemesi olarak ekle ──
  const kbRefId = String(MAIN_INGREDIENTS.length + 1).padStart(4, "0");
  await db.insert(factoryRecipeIngredients).values({
    recipeId: recipe.id,
    refId: kbRefId,
    name: `Keyblend ${KB_CODE}`,
    amount: "335",
    unit: "g",
    ingredientType: "keyblend",
    ingredientCategory: "katki",
    keyblendId: keyblendId,
    sortOrder: MAIN_INGREDIENTS.length,
  });

  console.log(`  🔒 Keyblend ${KB_CODE} — 335g (12 bileşen, sadece RGM görür)`);

  // ── 5. Özet ──
  console.log(`\n[SEED] ═══════════════════════════════════════`);
  console.log(`[SEED] ✅ Donut reçetesi tamamlandı`);
  console.log(`[SEED] Ana hamur: ${MAIN_INGREDIENTS.length} malzeme (${linked} eşleşti, ${unlinked} eşleşmedi)`);
  console.log(`[SEED] Keyblend: ${KB_CODE} — 12 bileşen, 335g toplam`);
  console.log(`[SEED] Toplam batch: 65 adet × ~120g = ~7.8 kg hamur`);
  console.log(`[SEED] Toplam hamur: ~57.4 kg (ana) + 0.335 kg (keyblend) = ~57.7 kg`);
}

seedDonutRecipe()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[SEED] Fatal:", err); process.exit(1); });
