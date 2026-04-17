/**
 * DOSPRESSO — Recipe ↔ Product Mapping Fix
 *
 * SORUN: factory_recipes.productId boş — 27 reçete × 163 ürün arası 0 eşleşme
 *
 * ÇÖZÜM: Mantıksal eşleşme (prefix farklı olduğu için otomatik değil):
 *   - DON-001 (reçete) → DNT-009 Classic (ana "Standart" donut — en yakın match)
 *   - CIN-001 (reçete) → (Cinnaboom ürün SKU'sunun faktoride olması gerek — yoksa ekle)
 *   - CHE-001..005 → Cheesecake (FP-* veya TLI-*?)
 *   - BRW-001..002 → Brownie (FP-BRO-001 gibi eklenmeli)
 *   - COK-001..002 → Cookie (FP-COK-001)
 *   - EKM-001..002 → Ekmek
 *
 * STRATEJİ:
 * 1. factory_products'ta BRW/CHE/CIN/COK/EKM prefix'li ürün yoksa, eksik olanları EKLE
 * 2. Her reçeteye productId ata (recipe.code bazlı mantıksal eşleşme)
 * 3. Eşleşme raporla (kaç tane başarılı, kaç tane eksik ürün)
 *
 * Çalıştırma: npx tsx server/scripts/fix-recipe-product-mapping.ts
 */

import { db } from "../db";
import { factoryRecipes, factoryProducts } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

// ── Reçete kod → Ürün SKU mapping ──
// (Her reçete için hangi ürüne bağlanacak)
const RECIPE_PRODUCT_MAP: Record<string, {
  sku: string;                // Hedef ürün SKU
  productName: string;        // Ürün adı (yoksa oluşturulacak)
  category: string;
  subCategory?: string;
  unitPrice: number;          // Kuruş cinsinden (₺×100)
  description?: string;
}> = {
  // ─── DONUT (reçete DON-* → ürün DNT-*) ───
  "DON-001": { sku: "DNT-009", productName: "Donut Classic", category: "Donut", subCategory: "Standart", unitPrice: 3960, description: "Klasik sade donut — temel reçete" },
  
  // ─── CHEESECAKE (reçete CHE-001..005 → ürün FP-CHE-*) ───
  "CHE-001": { sku: "FP-CHE-001", productName: "Cheesecake Klasik", category: "Tatlı", subCategory: "Cheesecake", unitPrice: 7600, description: "Labne + taze peynir + krema" },
  "CHE-002": { sku: "FP-CHE-002", productName: "Cheesecake Çikolata", category: "Tatlı", subCategory: "Cheesecake", unitPrice: 7600, description: "Çikolata soslu cheesecake" },
  "CHE-003": { sku: "FP-CHE-003", productName: "Cheesecake Karamel", category: "Tatlı", subCategory: "Cheesecake", unitPrice: 7600, description: "Karamel soslu cheesecake" },
  "CHE-004": { sku: "FP-CHE-004", productName: "Cheesecake Frambuaz", category: "Tatlı", subCategory: "Cheesecake", unitPrice: 7600, description: "Frambuaz soslu cheesecake" },
  "CHE-005": { sku: "FP-CHE-005", productName: "Cheesecake New York", category: "Tatlı", subCategory: "Cheesecake", unitPrice: 7600, description: "Klasik New York stili" },
  
  // ─── BROWNIE (reçete BRW-* → ürün FP-BRW-*) ───
  "BRW-001": { sku: "FP-BRW-001", productName: "Brownie Klasik", category: "Tatlı", subCategory: "Brownie", unitPrice: 4950, description: "Çikolatalı brownie" },
  "BRW-002": { sku: "FP-BRW-002", productName: "Brownie Cevizli", category: "Tatlı", subCategory: "Brownie", unitPrice: 5450, description: "Cevizli brownie" },
  
  // ─── COOKIE (reçete COK-* → ürün FP-COK-*) ───
  "COK-001": { sku: "FP-COK-001", productName: "Cookie Chocolate Chip", category: "Kurabiye", subCategory: "Cookie", unitPrice: 2500, description: "Damla çikolatalı cookie" },
  "COK-002": { sku: "FP-COK-002", productName: "Cookie Double Chocolate", category: "Kurabiye", subCategory: "Cookie", unitPrice: 2800, description: "Çift çikolatalı cookie" },
  
  // ─── EKMEK (reçete EKM-* → ürün FP-EKM-*) ───
  "EKM-001": { sku: "FP-EKM-001", productName: "Ekmek Klasik", category: "Ekmek", unitPrice: 1500, description: "Sade beyaz ekmek" },
  "EKM-002": { sku: "FP-EKM-002", productName: "Ekmek Tam Buğday", category: "Ekmek", unitPrice: 1800, description: "Tam buğday ekmek" },
  
  // ─── CINNABOOM (reçete CIN-* → ürün FP-CIN-*) ───
  "CIN-001": { sku: "FP-CIN-001", productName: "Cinnaboom Klasik", category: "Tatlı", subCategory: "Cinnamon Roll", unitPrice: 5435, description: "Tarçınlı rulo — klasik" },
  "CIN-002": { sku: "FP-CIN-002", productName: "Cinnaboom Çikolata", category: "Tatlı", subCategory: "Cinnamon Roll", unitPrice: 5435, description: "Çikolata dolgulu cinnamon roll" },
  "CIN-003": { sku: "FP-CIN-003", productName: "Cinnaboom Karamel", category: "Tatlı", subCategory: "Cinnamon Roll", unitPrice: 5435, description: "Karamel soslu cinnamon roll" },
};

async function run() {
  console.log("=".repeat(80));
  console.log("🔧 DOSPRESSO — Recipe ↔ Product Mapping Fix");
  console.log("=".repeat(80));

  // 1. Önce mevcut duruma bak
  const totalRecipes = await db.select({ count: sql<number>`count(*)` }).from(factoryRecipes);
  const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(factoryProducts);
  const recipesWithoutProduct = await db
    .select({ count: sql<number>`count(*)` })
    .from(factoryRecipes)
    .where(isNull(factoryRecipes.productId));

  console.log(`\n📊 Mevcut Durum:`);
  console.log(`   • Toplam reçete:                  ${totalRecipes[0].count}`);
  console.log(`   • Toplam ürün:                    ${totalProducts[0].count}`);
  console.log(`   • productId=NULL olan reçete:     ${recipesWithoutProduct[0].count}`);

  let productsCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;
  const unmapped: string[] = [];
  const report: Array<{ recipeCode: string; productSku: string; action: string }> = [];

  console.log(`\n${"─".repeat(80)}`);
  console.log("🔄 Mapping başlıyor...\n");

  // 2. Her reçete için eşleşme yap
  for (const [recipeCode, productInfo] of Object.entries(RECIPE_PRODUCT_MAP)) {
    // Reçete DB'de var mı?
    const [recipe] = await db
      .select()
      .from(factoryRecipes)
      .where(eq(factoryRecipes.code, recipeCode))
      .limit(1);

    if (!recipe) {
      console.log(`  ⚪ ${recipeCode} — reçete DB'de yok, atlanıyor`);
      unmapped.push(recipeCode);
      recipesSkipped++;
      continue;
    }

    // Ürün DB'de var mı?
    let [product] = await db
      .select()
      .from(factoryProducts)
      .where(eq(factoryProducts.sku, productInfo.sku))
      .limit(1);

    // Yoksa oluştur
    if (!product) {
      const [newProduct] = await db
        .insert(factoryProducts)
        .values({
          sku: productInfo.sku,
          name: productInfo.productName,
          category: productInfo.category,
          subCategory: productInfo.subCategory,
          unit: "adet",
          unitPrice: productInfo.unitPrice,
          description: productInfo.description,
          isActive: true,
          productType: "mamul",
        })
        .returning();
      product = newProduct;
      productsCreated++;
      console.log(`  🆕 ${productInfo.sku} ürün oluşturuldu: ${productInfo.productName}`);
    }

    // Reçete.productId'yi güncelle
    if (recipe.productId === product.id) {
      console.log(`  ✓ ${recipeCode} → ${productInfo.sku} (zaten eşleşmiş)`);
      report.push({ recipeCode, productSku: productInfo.sku, action: "already_linked" });
    } else {
      await db
        .update(factoryRecipes)
        .set({ productId: product.id, updatedAt: new Date() })
        .where(eq(factoryRecipes.id, recipe.id));
      recipesUpdated++;
      console.log(`  ✅ ${recipeCode} → ${productInfo.sku} (${productInfo.productName})`);
      report.push({ recipeCode, productSku: productInfo.sku, action: "linked" });
    }
  }

  // 3. Eşleşmeyen reçeteleri bul
  const unlinkedRecipes = await db
    .select({ code: factoryRecipes.code, name: factoryRecipes.name })
    .from(factoryRecipes)
    .where(isNull(factoryRecipes.productId));

  // 4. Özet
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 ÖZET");
  console.log("=".repeat(80));
  console.log(`  ✅ Reçete↔Ürün bağlandı:          ${recipesUpdated}`);
  console.log(`  🆕 Yeni ürün oluşturuldu:         ${productsCreated}`);
  console.log(`  ⚪ Reçete DB'de yok, atlandı:     ${recipesSkipped}`);
  console.log(`  ⚠️  Hâlâ productId=NULL reçete:    ${unlinkedRecipes.length}`);

  if (unlinkedRecipes.length > 0) {
    console.log(`\n⚠️ Manuel bağlanması gereken reçeteler:`);
    unlinkedRecipes.forEach((r) => console.log(`   • ${r.code}: ${r.name}`));
  }

  if (unmapped.length > 0) {
    console.log(`\n⚪ Mapping tablosunda var ama DB'de olmayan reçete kodları (seed çalıştırılmamış olabilir):`);
    unmapped.forEach((c) => console.log(`   • ${c}`));
  }

  // 5. Son durum
  const finalRecipesWithoutProduct = await db
    .select({ count: sql<number>`count(*)` })
    .from(factoryRecipes)
    .where(isNull(factoryRecipes.productId));

  console.log(`\n🎯 Son durum: ${totalRecipes[0].count - finalRecipesWithoutProduct[0].count}/${totalRecipes[0].count} reçete ürüne bağlı`);
  console.log(`\n✅ Script tamamlandı — ${new Date().toISOString()}`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ HATA:", e);
    process.exit(1);
  });
