/**
 * Fabrika Ürün + Satış Fiyat Seed
 * Excel fiyat listesinden (SİPARİŞ LİSTESİ 2026-04-002)
 * factoryProducts oluştur + factoryRecipes.productId bağla
 * 
 * Çalıştırma: npx tsx server/seed-factory-products.ts
 */

import { db } from "./db";
import { eq, sql } from "drizzle-orm";

// ── Ürün tanımları (Excel fiyat listesinden) ──
const PRODUCTS = [
  // Donut & Gourmet
  { sku: "FP-DON-001", name: "Donut", category: "donut", unit: "adet", price: 39.60, koliIci: 48, recipeCode: "DON-001" },
  { sku: "FP-DON-002", name: "Donut Gourmet", category: "donut", unit: "adet", price: 52.50, koliIci: 48, recipeCode: null },
  
  // Cinnaboom
  { sku: "FP-CIN-001", name: "Cinnaboom (6'lı)", category: "cinnamon_roll", unit: "paket", price: 54.35, koliIci: 36, recipeCode: "CIN-001" },
  { sku: "FP-CIN-002", name: "Beyaz Cinebom", category: "cinnamon_roll", unit: "adet", price: 54.35, koliIci: 36, recipeCode: "CIN-002" },
  { sku: "FP-CIN-003", name: "Siyah Brownie Cinebom", category: "cinnamon_roll", unit: "adet", price: 54.35, koliIci: 36, recipeCode: "CIN-003" },

  // Cheesecake
  { sku: "FP-CHE-001", name: "Cheesecake Lotus", category: "cheesecake", unit: "adet", price: 76.00, koliIci: 48, recipeCode: "CHE-001" },
  { sku: "FP-CHE-002", name: "Cheesecake Frambuaz", category: "cheesecake", unit: "adet", price: 76.00, koliIci: 48, recipeCode: "CHE-002" },
  { sku: "FP-CHE-003", name: "Cheesecake Limon", category: "cheesecake", unit: "adet", price: 76.00, koliIci: 48, recipeCode: "CHE-003" },
  { sku: "FP-CHE-004", name: "Cheesecake Oreo", category: "cheesecake", unit: "adet", price: 76.00, koliIci: 48, recipeCode: "CHE-004" },
  { sku: "FP-CHE-005", name: "Cheesecake San Sebastian", category: "cheesecake", unit: "adet", price: 115.622, koliIci: 48, recipeCode: "CHE-005" },

  // Brownie
  { sku: "FP-BRW-001", name: "Beyaz Brownie", category: "brownie", unit: "adet", price: 49.50, koliIci: 48, recipeCode: "BRW-001" },
  { sku: "FP-BRW-002", name: "Brownie", category: "brownie", unit: "adet", price: 49.50, koliIci: 48, recipeCode: "BRW-002" },

  // Cookie
  { sku: "FP-COK-001", name: "Crumble Cookie (Siyah)", category: "cookie", unit: "adet", price: 49.50, koliIci: 60, recipeCode: "COK-001" },
  { sku: "FP-COK-002", name: "NewYork Cookie (Yulaflı)", category: "cookie", unit: "adet", price: 49.50, koliIci: 60, recipeCode: "COK-002" },

  // Ekmek
  { sku: "FP-EKM-001", name: "Ciabatta", category: "ekmek", unit: "adet", price: 49.50, koliIci: 20, recipeCode: "EKM-001" },
  { sku: "FP-EKM-002", name: "Blueberry Crown", category: "ekmek", unit: "adet", price: 56.80, koliIci: 24, recipeCode: "EKM-002" },

  // Mamabon / Ciabatta çeşitleri
  { sku: "FP-MAM-001", name: "Hi Five Cheese (5 peynir)", category: "mamabon", unit: "adet", price: 49.50, koliIci: 30, recipeCode: null },
  { sku: "FP-MAM-002", name: "Texas BBQ (piliç köfte)", category: "mamabon", unit: "adet", price: 49.50, koliIci: 30, recipeCode: null },
  { sku: "FP-MAM-003", name: "Cheese Artisan (Peynirli)", category: "mamabon", unit: "adet", price: 78.00, koliIci: 20, recipeCode: null },
  { sku: "FP-MAM-004", name: "Master Cut (Karışık)", category: "mamabon", unit: "adet", price: 95.00, koliIci: 20, recipeCode: null },
  { sku: "FP-MAM-005", name: "Red Prime (Füme)", category: "mamabon", unit: "adet", price: 115.00, koliIci: 20, recipeCode: null },

  // BBQ
  { sku: "FP-BBQ-001", name: "BBQ 30cm", category: "bbq", unit: "adet", price: 82.00, koliIci: 20, recipeCode: null },
  { sku: "FP-BBQ-002", name: "Sweet Chili 30cm", category: "bbq", unit: "adet", price: 82.00, koliIci: 20, recipeCode: null },

  // Tatlılar
  { sku: "FP-TAT-001", name: "Bunny Cake", category: "kek_pasta", unit: "adet", price: 49.50, koliIci: 36, recipeCode: null },
  { sku: "FP-TAT-002", name: "Everest Cake", category: "kek_pasta", unit: "adet", price: 49.50, koliIci: 36, recipeCode: null },
  { sku: "FP-TAT-003", name: "Gold Cake", category: "kek_pasta", unit: "adet", price: 37.50, koliIci: 48, recipeCode: null },

  // Kruvasan
  { sku: "FP-KRV-001", name: "Kruvasan Sade Tereyağlı", category: "kruvasan", unit: "adet", price: 45.73, koliIci: 40, recipeCode: null },
];

async function seedFactoryProducts() {
  console.log("[SEED] Fabrika ürünleri + satış fiyatları seed...\n");

  let created = 0, skipped = 0, linked = 0;

  for (const product of PRODUCTS) {
    // Var mı kontrol
    const [existing] = await db.execute(sql`SELECT id FROM factory_products WHERE sku = ${product.sku} LIMIT 1`);
    if ((existing as any)?.rows?.length > 0 || (existing as any)?.id) {
      console.log(`  ⏭️ ${product.sku} "${product.name}" zaten var`);
      skipped++;
      continue;
    }

    // Ürün oluştur
    const result = await db.execute(sql`
      INSERT INTO factory_products (name, sku, category, unit, current_selling_price, package_quantity, is_active)
      VALUES (${product.name}, ${product.sku}, ${product.category}, ${product.unit}, ${product.price.toString()}, ${product.koliIci}, true)
      RETURNING id
    `);
    const newId = (result.rows?.[0] as any)?.id;
    console.log(`  ✅ ${product.sku} "${product.name}" → ₺${product.price} (id: ${newId})`);
    created++;

    // Reçete bağlantısı
    if (product.recipeCode && newId) {
      const linkResult = await db.execute(sql`
        UPDATE factory_recipes SET product_id = ${newId} WHERE code = ${product.recipeCode} AND product_id IS NULL
      `);
      if ((linkResult as any)?.rowCount > 0 || (linkResult as any)?.count > 0) {
        console.log(`     🔗 ${product.recipeCode} → product #${newId}`);
        linked++;
      }
    }
  }

  // Doğrulama
  const productCount = await db.execute(sql`SELECT count(*) as c FROM factory_products WHERE is_active = true`);
  const linkedRecipes = await db.execute(sql`SELECT count(*) as c FROM factory_recipes WHERE product_id IS NOT NULL`);

  console.log(`\n[SEED] ═══════════════════════════════════════`);
  console.log(`[SEED] ✅ ${created} oluşturuldu, ${skipped} atlandı, ${linked} reçete bağlandı`);
  console.log(`[SEED] Toplam aktif ürün: ${(productCount.rows?.[0] as any)?.c}`);
  console.log(`[SEED] Reçete↔Ürün bağlı: ${(linkedRecipes.rows?.[0] as any)?.c}`);
}

seedFactoryProducts()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[SEED] Fatal:", err); process.exit(1); });
