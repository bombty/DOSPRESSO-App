/**
 * Fiyat Dönüşüm Fix — conversionFactor paket ağırlığından hesaplama
 * 
 * Sorun: marketPrice paket fiyatı saklanıyor (ör: TOZ ŞEKER 50 KG = ₺1,890)
 *        ama conversionFactor = 1000 (1 KG varsayımı)
 *        Bu yüzden maliyet hesabı 50x fazla çıkıyor!
 * 
 * Çözüm: İsimden paket ağırlığını çıkar, conversionFactor'ü güncelle
 *        conversionFactor = paket ağırlığı × 1000 (gram cinsinden)
 *        pricePerGram = marketPrice / conversionFactor → doğru maliyet
 * 
 * Çalıştırma: npx tsx server/fix-conversion-factors.ts
 */

import { db } from "./db";
import { inventory } from "@shared/schema";
import { eq, sql, isNotNull } from "drizzle-orm";

function extractPackageKg(name: string): number | null {
  // "TOZ ŞEKER 50 KG" → 50
  // "Un 25 Kg" → 25
  // "Tereyağ 1 Kg" → 1
  // "Tereyağ 2 Kg" → 2
  const kgMatch = name.match(/(\d+(?:[.,]\d+)?)\s*[Kk][Gg]/);
  if (kgMatch) return parseFloat(kgMatch[1].replace(",", "."));

  // "Yaş Maya 500 gr*24" → 0.5 * 24 = 12
  const grMultMatch = name.match(/(\d+)\s*[Gg][Rr]\s*\*\s*(\d+)/);
  if (grMultMatch) return (parseFloat(grMultMatch[1]) * parseFloat(grMultMatch[2])) / 1000;

  // "500 gr" → 0.5
  const grMatch = name.match(/(\d+)\s*[Gg][Rr](?!\*)/);
  if (grMatch) return parseFloat(grMatch[1]) / 1000;

  // "5 lt" veya "5 LT" → 5 (sıvılarda 1lt ≈ 1kg)
  const ltMatch = name.match(/(\d+(?:[.,]\d+)?)\s*[Ll][Tt]?(?:\s|$)/i);
  if (ltMatch) return parseFloat(ltMatch[1].replace(",", "."));

  // "950 ml" → 0.95
  const mlMatch = name.match(/(\d+)\s*[Mm][Ll]/);
  if (mlMatch) return parseFloat(mlMatch[1]) / 1000;

  return null;
}

async function fixConversionFactors() {
  console.log("[FIX] Paket ağırlığından conversionFactor hesaplama...\n");

  const allItems = await db.select({
    id: inventory.id,
    code: inventory.code,
    name: inventory.name,
    marketPrice: inventory.marketPrice,
    conversionFactor: inventory.conversionFactor,
    purchaseUnit: inventory.purchaseUnit,
  }).from(inventory).where(eq(inventory.isActive, true));

  let updated = 0, skipped = 0, noWeight = 0;

  for (const item of allItems) {
    const packageKg = extractPackageKg(item.name);
    
    if (!packageKg) {
      // İsimden çıkarılamadı — 1 KG varsay
      noWeight++;
      continue;
    }

    const newFactor = Math.round(packageKg * 1000); // gram cinsinden
    const currentFactor = Number(item.conversionFactor || 1000);

    if (newFactor === currentFactor) {
      skipped++;
      continue;
    }

    await db.update(inventory)
      .set({ conversionFactor: String(newFactor) })
      .where(eq(inventory.id, item.id));

    const price = Number(item.marketPrice || 0);
    const oldPerKg = currentFactor > 0 ? (price / currentFactor * 1000) : 0;
    const newPerKg = newFactor > 0 ? (price / newFactor * 1000) : 0;

    console.log(`  ✅ ${item.code} ${item.name}`);
    console.log(`     ${currentFactor}→${newFactor}g | ₺${price} paket → ₺${newPerKg.toFixed(2)}/KG (eski: ₺${oldPerKg.toFixed(2)}/KG)`);
    updated++;
  }

  console.log(`\n[FIX] ═══════════════════════════════════════`);
  console.log(`[FIX] ✅ ${updated} güncellendi, ${skipped} zaten doğru, ${noWeight} ağırlık çıkarılamadı`);
  console.log(`[FIX] Toplam: ${allItems.length} malzeme kontrol edildi`);

  // Doğrulama: bazı örnek fiyatlar
  console.log(`\n[FIX] ═══ ÖRNEK FİYATLAR ═══`);
  const samples = await db.execute(sql`
    SELECT code, name, market_price, conversion_factor,
      CASE WHEN conversion_factor::numeric > 0 AND market_price IS NOT NULL
        THEN ROUND(market_price::numeric / conversion_factor::numeric * 1000, 2)
        ELSE 0 END as price_per_kg
    FROM inventory
    WHERE market_price IS NOT NULL AND market_price::numeric > 0
    ORDER BY name
    LIMIT 20
  `);

  for (const s of (samples.rows || []) as any[]) {
    console.log(`  ${s.code} ${s.name}: ₺${s.market_price}/paket → ₺${s.price_per_kg}/KG (factor: ${s.conversion_factor})`);
  }
}

fixConversionFactors()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[FIX] Fatal:", err); process.exit(1); });
