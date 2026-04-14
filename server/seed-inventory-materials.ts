/**
 * Inventory Seed — 805 malzeme (2025+2026 Excel parse)
 * Çalıştırma: npx tsx server/seed-inventory-materials.ts
 * 
 * İş mantığı:
 * - Mevcut inventory kayıtlarını code bazında kontrol eder
 * - Yeni malzemeleri ekler, mevcutları günceller (fiyat + tür)
 * - Her alım kaydını inventory_price_history'ye yazar
 * - Birim dönüşümü: KG→g (1000), LT→ml (1000), ADET→g (null, elle girilecek)
 */

import { db } from "./db";
import { inventory, inventoryPriceHistory } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import seedData from "./data/inventory-seed-data.json";

const TYPE_MAP: Record<string, string> = {
  HM: "hammadde",
  YM: "yari_mamul",
  MM: "mamul",
  TM: "ticari_mal",
  TK: "tuketim",
};

function getUnitDefaults(excelUnit: string) {
  const u = (excelUnit || "").toUpperCase().trim();
  if (u === "KG") return { purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" };
  if (u === "LT" || u === "L") return { purchaseUnit: "LT", recipeUnit: "ml", conversionFactor: "1000" };
  return { purchaseUnit: "ADET", recipeUnit: "g", conversionFactor: null as string | null };
}

function mapCategory(materialType: string, name: string): string {
  const nameLower = (name || "").toLocaleLowerCase("tr-TR");
  const type = (materialType || "").toUpperCase();

  if (type === "HM") {
    if (nameLower.includes("kahve") || nameLower.includes("espresso") || nameLower.includes("filtre")) return "kahve";
    if (nameLower.includes("çay")) return "cay_grubu";
    if (nameLower.includes("şurup") || nameLower.includes("konsantre")) return "konsantre";
    return "hammadde";
  }
  if (type === "YM") return "yari_mamul";
  if (type === "MM") {
    if (nameLower.includes("şurup")) return "konsantre";
    if (nameLower.includes("kahve") || nameLower.includes("espresso") || nameLower.includes("türk kahve")) return "kahve";
    if (nameLower.includes("çay")) return "cay_grubu";
    if (nameLower.includes("donut")) return "donut";
    if (nameLower.includes("cinnaboom") || nameLower.includes("cookie") || nameLower.includes("cake") || nameLower.includes("brownie") || nameLower.includes("cheesecake")) return "tatli";
    if (nameLower.includes("sandwich") || nameLower.includes("wrapitos") || nameLower.includes("ciabatta")) return "tuzlu";
    if (nameLower.includes("kruvasan")) return "bitimis_urun";
    return "bitimis_urun";
  }
  if (type === "TM") {
    if (nameLower.includes("çay")) return "cay_grubu";
    return "ticari_mal";
  }
  if (type === "TK") return "sube_malzeme";
  return "diger";
}

function parseMonthYear(my: string): Date {
  const parts = my.split("/");
  if (parts.length === 2) return new Date(Number(parts[1]), Number(parts[0]) - 1, 1);
  return new Date();
}

async function seedInventoryMaterials() {
  console.log(`[SEED] 805 malzeme import başlıyor...`);

  let created = 0, updated = 0, priceRecords = 0, skipped = 0;

  for (const mat of seedData as any[]) {
    const { code, name, type: matType, unit, prices, latestPrice } = mat;
    if (!code || !name) { skipped++; continue; }

    const unitDef = getUnitDefaults(unit);
    const category = mapCategory(matType, name);
    const materialType = TYPE_MAP[matType?.toUpperCase()] || "diger";

    try {
      // Mevcut kayıt var mı?
      const [existing] = await db.select({ id: inventory.id })
        .from(inventory)
        .where(eq(inventory.code, code))
        .limit(1);

      let inventoryId: number;

      if (existing) {
        inventoryId = existing.id;
        // Güncelle — tür + fiyat + birim
        await db.update(inventory).set({
          materialType,
          purchaseUnit: unitDef.purchaseUnit,
          recipeUnit: unitDef.recipeUnit,
          conversionFactor: unitDef.conversionFactor,
          ...(latestPrice ? {
            lastPurchasePrice: String(latestPrice),
            marketPrice: String(latestPrice),
            marketPriceUpdatedAt: new Date(),
          } : {}),
          updatedAt: new Date(),
        }).where(eq(inventory.id, existing.id));
        updated++;
      } else {
        // Yeni oluştur
        const [newItem] = await db.insert(inventory).values({
          code,
          name,
          category,
          unit: unit?.toLowerCase() || "adet",
          materialType,
          purchaseUnit: unitDef.purchaseUnit,
          recipeUnit: unitDef.recipeUnit,
          conversionFactor: unitDef.conversionFactor,
          lastPurchasePrice: latestPrice ? String(latestPrice) : null,
          marketPrice: latestPrice ? String(latestPrice) : null,
          marketPriceUpdatedAt: latestPrice ? new Date() : null,
          unitCost: latestPrice ? String(latestPrice) : "0",
          currentStock: "0",
          minimumStock: "0",
        }).returning();
        inventoryId = newItem.id;
        created++;
      }

      // Fiyat geçmişi kaydet
      if (prices && Array.isArray(prices)) {
        for (const p of prices) {
          const effectiveDate = parseMonthYear(p.monthYear);
          try {
            await db.insert(inventoryPriceHistory).values({
              inventoryId,
              priceType: "purchase",
              price: String(p.unitPrice),
              source: "excel_import",
              effectiveDate: effectiveDate.toISOString().split("T")[0],
              notes: `${p.quantity} ${unit} × ₺${p.unitPrice}`,
              createdBy: null,
            });
            priceRecords++;
          } catch (e) {
            // Duplicate kayıt olabilir — geç
          }
        }
      }
    } catch (err) {
      console.error(`[SEED] ${code} hata:`, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  console.log(`[SEED] ✅ Tamamlandı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı, ${priceRecords} fiyat kaydı`);
}

seedInventoryMaterials()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[SEED] Fatal:", err); process.exit(1); });
