/**
 * DOSPRESSO — Fatura Fiyatları Senkronizasyonu
 *
 * 2024-2026 Bombtea muhasebe Excel dosyalarından çıkarılan
 * EN SON fatura fiyatlarıyla envanter + price history günceller.
 *
 * Kaynak: server/data/invoice-prices.json (143 malzeme)
 * Oluşturuldu: 18 Nisan 2026
 *
 * Çalıştırma: npx tsx server/scripts/update-prices-from-invoices.ts
 */

import { db } from "../db";
import { inventory, inventoryPriceHistory } from "@shared/schema/schema-09";
import { eq } from "drizzle-orm";
import invoicePrices from "../data/invoice-prices.json";

interface InvoicePrice {
  code: string;
  name: string;
  period: string;          // "MM/YYYY"
  date: string;            // "YYYY-MM-15"
  packagePrice: number;    // ₺/paket (son alım)
  packageSizeKg: number | null;
  packageUnit: string;     // "KG" | "LT" | "paket" | "adet"
  pricePerKg: number | null;
  purchaseCount: number;
}

const PRICES = invoicePrices as InvoicePrice[];

async function run() {
  console.log("=".repeat(80));
  console.log("📊 DOSPRESSO — Fatura Fiyatları Senkronizasyonu");
  console.log("=".repeat(80));
  console.log(`\n🎯 ${PRICES.length} malzemenin son fatura fiyatı işlenecek`);
  console.log(`   • Kaynak: 2024-2026 Bombtea muhasebe Excel (3 yıl)`);
  console.log(`   • ${PRICES.filter(p => p.packageSizeKg).length} malzeme ₺/KG kesin`);
  console.log(`   • ${PRICES.filter(p => !p.packageSizeKg).length} malzeme paket ağırlığı belirsiz`);

  let updated = 0;
  let notFound = 0;
  let priceHistoryCreated = 0;
  const missingCodes: string[] = [];

  console.log(`\n${"─".repeat(80)}`);
  console.log("🔄 Güncelleme başlıyor...\n");

  for (const item of PRICES) {
    // Envanterde kod ara
    const invItem = await db
      .select()
      .from(inventory)
      .where(eq(inventory.code, item.code))
      .limit(1);

    if (invItem.length === 0) {
      missingCodes.push(`${item.code}: ${item.name}`);
      notFound++;
      continue;
    }

    const existing = invItem[0];
    const oldPrice = existing.lastPurchasePrice
      ? parseFloat(existing.lastPurchasePrice.toString())
      : 0;
    const newPrice = item.packagePrice;
    const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    // 1. Envanter fiyatını güncelle
    await db
      .update(inventory)
      .set({
        lastPurchasePrice: newPrice.toFixed(2),
        unitCost: newPrice.toFixed(2), // Alım fiyatı = birim maliyet
        updatedAt: new Date(),
      })
      .where(eq(inventory.code, item.code));

    // 2. Price history kaydı oluştur
    await db.insert(inventoryPriceHistory).values({
      inventoryId: existing.id,
      priceType: "purchase",
      price: newPrice.toFixed(2),
      previousPrice: oldPrice > 0 ? oldPrice.toFixed(2) : null,
      changePercent: oldPrice > 0 ? changePercent.toFixed(2) : null,
      source: "excel_import",
      effectiveDate: item.date,
      notes: `Son fatura alımı ${item.period} (${item.purchaseCount} alım, 3 yıllık veri). Paket: ${item.packageSizeKg ?? "?"} ${item.packageUnit}${item.pricePerKg ? ` → ₺${item.pricePerKg.toFixed(2)}/KG` : ""}`,
    });

    priceHistoryCreated++;
    updated++;

    const symbol =
      changePercent > 10 ? "🔴" : changePercent > 5 ? "⚠️" : changePercent < -5 ? "🟢" : "✅";
    const perKg = item.pricePerKg ? ` (₺${item.pricePerKg.toFixed(2)}/KG)` : "";
    const changeStr = oldPrice > 0 ? ` ${symbol} ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%` : " 🆕 yeni fiyat";

    console.log(
      `  ${item.code}: ₺${oldPrice.toFixed(2)} → ₺${newPrice.toFixed(2)}${perKg}${changeStr}`
    );
  }

  // Özet
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 ÖZET");
  console.log("=".repeat(80));
  console.log(`  ✅ Güncellenen malzeme:         ${updated}`);
  console.log(`  📜 Price history kayıt:         ${priceHistoryCreated}`);
  console.log(`  ⚠️  Envanterde olmayan:          ${notFound}`);

  if (missingCodes.length > 0) {
    console.log(`\n⚠️ ENVANTERDE OLMAYAN KODLAR (${notFound} adet):`);
    console.log(`   Bu kodlar envanter DB'ye eklenmeli, ya da fatura dosyası temizlenmeli:\n`);
    missingCodes.slice(0, 20).forEach((c) => console.log(`   • ${c}`));
    if (missingCodes.length > 20) {
      console.log(`   ... ve ${missingCodes.length - 20} tane daha`);
    }
  }

  console.log(`\n✅ Senkronizasyon tamamlandı — ${new Date().toISOString()}`);
}

run()
  .then(() => {
    console.log("\n🎉 Script başarıyla tamamlandı");
    process.exit(0);
  })
  .catch((e) => {
    console.error("\n❌ HATA:", e);
    process.exit(1);
  });
