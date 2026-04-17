/**
 * Labne Fiyat Düzeltme
 * H-1081 "Labne" → conversionFactor 1000g değil 2750g (kova 2.75 KG)
 * Fiyat: ₺537.65/KOVA → gerçek ₺195.51/KG
 * 
 * Çalıştırma: npx tsx server/fix-labne-price.ts
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

async function fixLabnePrice() {
  console.log("[FIX] Labne fiyat düzeltmesi başlıyor...\n");

  // Mevcut durumu oku
  const before = await db.execute(sql`
    SELECT id, code, name, market_price, conversion_factor 
    FROM inventory WHERE code = 'H-1081' OR LOWER(name) LIKE 'labne%' AND name NOT LIKE '%180%'
  `);
  
  for (const row of (before.rows || []) as any[]) {
    const price = Number(row.market_price || 0);
    const factor = Number(row.conversion_factor || 1000);
    const oldPerKg = price / (factor / 1000);
    console.log(`📌 ÖNCE: ${row.code} ${row.name}`);
    console.log(`   Fiyat: ₺${price}, Factor: ${factor}g → ₺${oldPerKg.toFixed(2)}/KG`);
  }

  // Labne (H-1081) conversion_factor: 1000 → 2750 (kova 2.75 KG)
  // market_price: ₺537.65 aynı kalır (kova fiyatı)
  // Sonuç: ₺537.65 / 2.75 KG = ₺195.51/KG
  const result = await db.execute(sql`
    UPDATE inventory 
    SET conversion_factor = 2750, updated_at = NOW()
    WHERE code = 'H-1081'
  `);

  console.log(`\n✅ Labne conversion_factor 1000 → 2750 güncellendi`);

  // Doğrulama
  const after = await db.execute(sql`
    SELECT code, name, market_price, conversion_factor 
    FROM inventory WHERE code = 'H-1081'
  `);
  
  for (const row of (after.rows || []) as any[]) {
    const price = Number(row.market_price || 0);
    const factor = Number(row.conversion_factor || 1000);
    const newPerKg = price / (factor / 1000);
    console.log(`\n📌 SONRA: ${row.code} ${row.name}`);
    console.log(`   Fiyat: ₺${price}/kova, Factor: ${factor}g → ₺${newPerKg.toFixed(2)}/KG ✅`);
  }

  console.log(`\n[FIX] Labne fiyat düzeltme TAMAM`);
}

fixLabnePrice()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[FIX] Fatal:", err); process.exit(1); });
