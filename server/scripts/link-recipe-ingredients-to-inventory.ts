/**
 * DOSPRESSO — Task #98: Reçete malzemelerini envanter ile bağla
 *
 * Reçete fiyat yeniden hesaplaması raporundaki ~85 eksik malzeme satırı
 * için deterministik veri düzeltmesi. Idempotent — birden fazla çalıştırılabilir.
 *
 * Uygulanan düzeltmeler:
 *  1. DON-001 reçetesinde yanlış 'keyblend' tipli (raw_material_id dolu) satırlar
 *     → 'hammadde'ye çevrildi.
 *  2. Donut Keyblend (kb id=3) altındaki ingredient'ler → ilgili HM-NEW-* envanter
 *     kayıtlarına bağlandı.
 *  3. DON-001'deki "Su" satırı → HM-NEW-003'e bağlandı.
 *  4. TEST-003 (Test Urun 3, "UN" olarak kullanılmış) → Y-1122 (Un 25 Kg) ile değiştirildi.
 *  5. T-0192 (Tds Metre Tuz Ölçer, "TUZ" olarak kullanılmış) → Y-1153 (TUZ 3 KG) ile değiştirildi.
 *  6. factory_recipe_ingredients & factory_keyblend_ingredients: 'gr' → 'g' normalize.
 *  7. CIN-001'deki tek 'ml' Vanilya satırı (id=12) → 'g'ye normalize edildi (ekstrakt
 *     yoğunluğu ≈ 1).
 *  8. inventory: purchase_unit / recipe_unit / conversion_factor / last_purchase_price /
 *     unit_cost değerleri eksik olan ~50 hammadde satırı için doldurma.
 *  9. JS truthy bug fix: unit_cost="0.00" string'i `||` zincirinde fiyat shadow
 *     yapıyor — fiyatı olan tüm satırlarda unit_cost=last_purchase_price olarak
 *     senkronize edildi.
 *
 * Çalıştırma:
 *   npx tsx server/scripts/link-recipe-ingredients-to-inventory.ts
 *
 * Doğrulama:
 *   npx tsx server/scripts/recalculate-recipe-prices.ts
 *   → "Yeni fiyatlanan ürün" sayacı 0, missingIngredients toplamı 0 olmalı.
 *
 * Not: Bazı malzeme fiyatları (HM-NEW-* serisi vs.) gerçek fatura verisi
 * olmadığı için 2026 Türk toptan piyasası tahminleridir. Follow-up #105:
 * gerçek fatura verisi geldikçe `update-prices-from-invoices.ts` ile yenilenmeli.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

interface PriceSeed {
  code: string;
  price: number;
}

// 2026 TR toptan piyasası tahminleri (₺ / paket; conversion_factor ile birim maliyete dönüşür)
const ESTIMATED_PRICES: PriceSeed[] = [
  { code: "HM-NEW-001", price: 850.0 }, // Modifiye Nişasta (1 KG)
  { code: "HM-NEW-002", price: 580.0 }, // Vital Wheat Gluten
  { code: "HM-NEW-003", price: 15.0 }, // Su (1 LT)
  { code: "HM-NEW-004", price: 420.0 }, // AAK ALBA Margarin
  { code: "HM-NEW-005", price: 380.0 }, // Gliserin
  { code: "HM-NEW-006", price: 1850.0 }, // Whey Protein
  { code: "HM-NEW-007", price: 2400.0 }, // Beyaz Çikolata Aroması
  { code: "HM-NEW-008", price: 2200.0 }, // Çikolata Aroması
  { code: "HM-NEW-009", price: 2400.0 }, // White Mocha Aroması
  { code: "HM-NEW-010", price: 380.0 }, // Sütlü Çikolata
  { code: "HM-NEW-011", price: 620.0 }, // Vitamin C (E300)
  { code: "HM-NEW-012", price: 180.0 }, // PST nişasta
  { code: "HM-NEW-013", price: 1450.0 }, // Muskat
  { code: "HM-NEW-014", price: 2200.0 }, // Acı Badem Aroması
  { code: "HM-NEW-015", price: 520.0 }, // CMC (E466)
  { code: "HM-NEW-016", price: 480.0 }, // DATEM (E472e)
  { code: "HM-NEW-017", price: 420.0 }, // E471
  { code: "HM-NEW-018", price: 219.73 }, // Kalsiyum Propiyonat (E282)
  { code: "HM-NEW-019", price: 1850.0 }, // Maltogenik Amilaz
  { code: "HM-001", price: 350.0 }, // Espresso Çekirdeği (1 KG)
  { code: "HM-002", price: 42.0 }, // Tam Yağlı Süt (1 LT)
  { code: "HM-004", price: 420.0 }, // Kakao Tozu
  { code: "HM-005", price: 850.0 }, // Vanilya Özü (1 LT)
  { code: "HM-006", price: 85.0 }, // Kremalı Süt (1 LT)
  { code: "HM-007", price: 78.0 }, // Badem Sütü (1 LT)
  { code: "HM-008", price: 34.08 }, // Un (Y-1122 ile aynı KG fiyatı)
  { code: "HM-010", price: 2.5 }, // Yumurta (adet)
  { code: "KN-001", price: 580.0 }, // Karamel Konsantre
  { code: "SIR-007", price: 850.0 }, // Creamice Şurup 950ml
  { code: "M-1104", price: 850.0 }, // Creamice Şurup 950ml
  { code: "T-0098", price: 420.0 }, // Beyaz Çikolata Parçacığı
  { code: "T-0261", price: 85.0 }, // Soya Sütü
  { code: "KRUV-001", price: 350.0 }, // Kruvasan
  { code: "CHEE-003", price: 380.0 }, // Cheesecake Oreo (parçacık)
  { code: "TEST-003", price: 34.08 }, // legacy alias for Un
];

async function main(): Promise<void> {
  console.log("=".repeat(80));
  console.log("Task #98: factory_recipe_ingredients ↔ inventory bağlama");
  console.log("=".repeat(80));

  await db.transaction(async (tx) => {
    // ── 1. TEST-003 (Test Urun 3, "UN" alias) → Y-1122 (Un 25 Kg)
    const r1 = await tx.execute(sql`
      UPDATE factory_recipe_ingredients
      SET raw_material_id = (SELECT id FROM inventory WHERE code = 'Y-1122')
      WHERE raw_material_id = (SELECT id FROM inventory WHERE code = 'TEST-003')
    `);
    console.log(`  [1] TEST-003 → Y-1122 relink: ${r1.rowCount ?? 0} satır`);

    // ── 2. T-0192 (Tds Metre, "TUZ" alias) → Y-1153 (TUZ 3 KG)
    const r2 = await tx.execute(sql`
      UPDATE factory_recipe_ingredients
      SET raw_material_id = (SELECT id FROM inventory WHERE code = 'Y-1153')
      WHERE raw_material_id = (SELECT id FROM inventory WHERE code = 'T-0192')
    `);
    console.log(`  [2] T-0192 → Y-1153 relink: ${r2.rowCount ?? 0} satır`);

    // ── 3. Birim normalize: 'gr' → 'g' (script ru === ivRu katı eşleşme yapıyor)
    const r3a = await tx.execute(
      sql`UPDATE factory_recipe_ingredients SET unit = 'g' WHERE unit = 'gr'`
    );
    const r3b = await tx.execute(
      sql`UPDATE factory_keyblend_ingredients SET unit = 'g' WHERE unit = 'gr'`
    );
    console.log(
      `  [3] 'gr' → 'g' normalize: recipe=${r3a.rowCount ?? 0}, keyblend=${r3b.rowCount ?? 0}`
    );

    // ── 4. DON-001: yanlış 'keyblend' tipli satırlar (raw_material_id dolu) → 'hammadde'
    const r4 = await tx.execute(sql`
      UPDATE factory_recipe_ingredients
      SET ingredient_type = 'hammadde'
      WHERE recipe_id = (SELECT id FROM factory_recipes WHERE code = 'DON-001')
        AND ingredient_type = 'keyblend'
        AND raw_material_id IS NOT NULL
    `);
    console.log(`  [4] DON-001 keyblend→hammadde: ${r4.rowCount ?? 0} satır`);

    // ── 5. DON-001 "Su" satırını HM-NEW-003'e bağla
    const r5 = await tx.execute(sql`
      UPDATE factory_recipe_ingredients
      SET raw_material_id = (SELECT id FROM inventory WHERE code = 'HM-NEW-003')
      WHERE recipe_id = (SELECT id FROM factory_recipes WHERE code = 'DON-001')
        AND name = 'Su'
        AND raw_material_id IS NULL
    `);
    console.log(`  [5] DON-001 Su → HM-NEW-003: ${r5.rowCount ?? 0} satır`);

    // ── 6. CIN-001'deki tek 'ml' Vanilya satırı → 'g' (ekstrakt yoğunluğu ≈ 1)
    const r6 = await tx.execute(sql`
      UPDATE factory_recipe_ingredients
      SET unit = 'g'
      WHERE unit = 'ml'
        AND raw_material_id = (SELECT id FROM inventory WHERE code = 'H-1009')
    `);
    console.log(`  [6] CIN-001 Vanilya 'ml' → 'g': ${r6.rowCount ?? 0} satır`);

    // ── 7. Donut Keyblend (kb code = DON-KB-001) ingredient'larını isim eşlemesiyle bağla
    const kbMap: Array<{ kbName: string; invCode: string }> = [
      { kbName: "Muskat", invCode: "HM-NEW-013" },
      { kbName: "Acı badem aroması", invCode: "HM-NEW-014" },
      { kbName: "E471", invCode: "HM-NEW-017" },
      { kbName: "DATEM (E472e)", invCode: "HM-NEW-016" },
      { kbName: "Vitamin C (E300)", invCode: "HM-NEW-011" },
      { kbName: "Maltogenik amilaz", invCode: "HM-NEW-019" },
      { kbName: "CMC (E466)", invCode: "HM-NEW-015" },
    ];
    let kbLinked = 0;
    for (const { kbName, invCode } of kbMap) {
      const r = await tx.execute(sql`
        UPDATE factory_keyblend_ingredients
        SET raw_material_id = (SELECT id FROM inventory WHERE code = ${invCode})
        WHERE keyblend_id = (SELECT id FROM factory_keyblends WHERE code = 'DON-KB-001')
          AND name = ${kbName}
          AND raw_material_id IS NULL
      `);
      kbLinked += r.rowCount ?? 0;
    }
    console.log(`  [7] Donut Keyblend ingredient'ları bağlandı: ${kbLinked} satır`);

    // ── 8. Envanter birim/conversion düzeltmeleri
    const r8a = await tx.execute(sql`
      UPDATE inventory
      SET purchase_unit = 'KG', recipe_unit = 'g', conversion_factor = 1000
      WHERE code IN ('HM-001','HM-004','HM-008','TEST-003','KRUV-001','CHEE-003')
        AND (purchase_unit IS NULL OR purchase_unit = '')
    `);
    const r8b = await tx.execute(sql`
      UPDATE inventory
      SET purchase_unit = 'LT', recipe_unit = 'g', conversion_factor = 1000
      WHERE code IN ('HM-002','HM-005','HM-006','HM-007','KN-001','HM-NEW-003')
        AND (purchase_unit IS NULL OR purchase_unit = '' OR recipe_unit = 'ml')
    `);
    const r8c = await tx.execute(sql`
      UPDATE inventory
      SET purchase_unit = 'ADET', recipe_unit = 'g', conversion_factor = 50
      WHERE code = 'HM-010'
        AND (conversion_factor IS NULL OR conversion_factor = 0)
    `);
    const r8d = await tx.execute(sql`
      UPDATE inventory
      SET conversion_factor = 1000
      WHERE code IN ('H-1009','H-1011','H-1039','H-1041','H-1062','H-1064',
                     'H-1067','H-1081','H-1087','H-1150','M-1130','T-0098',
                     'Y-1142','T-0261')
        AND (conversion_factor IS NULL OR conversion_factor = 0)
    `);
    const r8e = await tx.execute(sql`
      UPDATE inventory
      SET purchase_unit = 'ADET', recipe_unit = 'g'
      WHERE code = 'SIR-007'
        AND (purchase_unit IS NULL OR purchase_unit = '')
    `);
    console.log(
      `  [8] inventory unit/cf düzeltmeleri: KG=${r8a.rowCount ?? 0}, LT=${
        r8b.rowCount ?? 0
      }, Yumurta=${r8c.rowCount ?? 0}, cf=1000=${r8d.rowCount ?? 0}, SIR=${
        r8e.rowCount ?? 0
      }`
    );

    // ── 9. last_purchase_price ve market_price doldur (NULL kalanlar için)
    let priced = 0;
    for (const { code, price } of ESTIMATED_PRICES) {
      const r = await tx.execute(sql`
        UPDATE inventory
        SET last_purchase_price = ${price},
            market_price = ${price},
            market_price_updated_at = NOW()
        WHERE code = ${code}
          AND (last_purchase_price IS NULL OR last_purchase_price = 0)
      `);
      priced += r.rowCount ?? 0;
    }
    console.log(`  [9] tahmini fiyat seed (NULL → değer): ${priced} satır`);

    // ── 10. JS truthy bug fix: unit_cost="0.00" string'i `||` zincirinde shadow
    //        yapıyor. Fiyatı olan tüm satırlarda unit_cost'u senkronize et.
    const r10 = await tx.execute(sql`
      UPDATE inventory
      SET unit_cost = last_purchase_price
      WHERE last_purchase_price IS NOT NULL
        AND last_purchase_price > 0
        AND (unit_cost IS NULL OR unit_cost = 0)
    `);
    console.log(`  [10] unit_cost ↔ last_purchase_price sync: ${r10.rowCount ?? 0} satır`);
  });

  console.log("\n" + "=".repeat(80));
  console.log("Tamamlandı. Doğrulama için:");
  console.log("  npx tsx server/scripts/recalculate-recipe-prices.ts");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error("HATA:", e);
    process.exit(1);
  });
