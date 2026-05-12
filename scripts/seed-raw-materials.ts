// ═══════════════════════════════════════════════════════════════════
// Sprint 47 (Aslan 13 May 2026) - Seed Raw Materials + Suppliers
// ═══════════════════════════════════════════════════════════════════
// Aslan'ın Excel'inden çıkarılan 185 hammadde + tahmin edilen tedarikçi
// Logo yazılımından "2026 Satınalınan Ürünler" raporu kaynak
// ═══════════════════════════════════════════════════════════════════
//
// USAGE:
//   npx tsx scripts/seed-raw-materials.ts
//
// SAFE:
//   - Var olan code'lu hammaddeleri SKIP eder (upsert by code)
//   - İlk çalıştırmada 185 ürün ekler
//   - Sonraki çalıştırmalar: sadece fiyat güncellemesi

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import { rawMaterials, suppliers } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

interface SeedRecord {
  code: string;
  name: string;
  category: string;
  unit: string;
  last_purchase_price: number;
  current_unit_price: number;
  price_increase_rate: number;
  supplier_hint: string | null;
  last_purchase_year: number;
}

interface SupplierSeed {
  code: string;
  name: string;
  category_hint: string;
}

interface SeedData {
  raw_materials: SeedRecord[];
  suppliers_inferred: SupplierSeed[];
  stats: any;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  console.log("📂 Reading seed JSON...");
  const seedPath = path.join(new URL('.', import.meta.url).pathname, "raw-materials-seed.json");
  const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  console.log(`📊 ${seedData.raw_materials.length} hammadde, ${seedData.suppliers_inferred.length} tedarikçi`);

  // ═══════════════════════════════════════════════════════════════════
  // 1. Tedarikçileri ekle (upsert by code)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n🏢 Tedarikçileri ekliyor...");
  const supplierIdMap: Record<string, number> = {};

  for (const s of seedData.suppliers_inferred) {
    const existing = await db.select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.code, s.code))
      .limit(1);

    if (existing.length > 0) {
      supplierIdMap[s.name] = existing[0].id;
      console.log(`  ↪ Mevcut: ${s.code} ${s.name}`);
    } else {
      const inserted = await db.insert(suppliers).values({
        code: s.code,
        name: s.name,
        status: "aktif",
        categories: [s.category_hint],
        paymentTermDays: 30,
        currency: "TRY",
      }).returning({ id: suppliers.id });

      supplierIdMap[s.name] = inserted[0].id;
      console.log(`  ✅ Yeni: ${s.code} ${s.name}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. Hammaddeleri ekle (upsert by code)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n📦 Hammaddeleri ekliyor...");
  let inserted = 0;
  let updated = 0;
  let priceUpdated = 0;

  for (const r of seedData.raw_materials) {
    const supplierId = r.supplier_hint && supplierIdMap[r.supplier_hint] ? supplierIdMap[r.supplier_hint] : null;

    const existing = await db.select({
      id: rawMaterials.id,
      currentUnitPrice: rawMaterials.currentUnitPrice,
    })
      .from(rawMaterials)
      .where(eq(rawMaterials.code, r.code))
      .limit(1);

    if (existing.length > 0) {
      // Güncelle (fiyat)
      const currentPrice = parseFloat(existing[0].currentUnitPrice?.toString() || "0");
      if (Math.abs(currentPrice - r.current_unit_price) > 0.01) {
        await db.update(rawMaterials)
          .set({
            lastPurchasePrice: r.last_purchase_price.toString(),
            currentUnitPrice: r.current_unit_price.toString(),
            priceLastUpdated: new Date(),
          })
          .where(eq(rawMaterials.id, existing[0].id));
        priceUpdated++;
      }
      updated++;
    } else {
      // Yeni ekle
      await db.insert(rawMaterials).values({
        code: r.code,
        name: r.name,
        category: r.category,
        unit: r.unit,
        currentUnitPrice: r.current_unit_price.toString(),
        lastPurchasePrice: r.last_purchase_price.toString(),
        priceLastUpdated: new Date(),
        supplierId: supplierId || null,
        isActive: true,
        nutritionSource: "manual", // başlangıçta manuel — Sema doldurmalı
        // Besin değerleri NULL — AI uyarı sistemi tetiklenecek
      });
      inserted++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. Sonuç raporu
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════");
  console.log("✅ SEED TAMAMLANDI");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Tedarikçi: ${Object.keys(supplierIdMap).length}`);
  console.log(`  Yeni hammadde: ${inserted}`);
  console.log(`  Var olan: ${updated}`);
  console.log(`  Fiyat güncellendi: ${priceUpdated}`);
  console.log(`  TOPLAM hammadde: ${seedData.raw_materials.length}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\n📊 Kategori dağılımı:");
  for (const [cat, count] of Object.entries(seedData.stats.categories || {})) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log("\n⚠️  Besin değerleri eksik — AI uyarı sistemi Sprint 50'de devreye alınacak");

  await pool.end();
}

main().catch((err) => {
  console.error("❌ HATA:", err);
  process.exit(1);
});
