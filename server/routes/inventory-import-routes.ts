/**
 * Inventory Excel Import API
 * Satınalma malzeme listesi import — fiyat geçmişi + piyasa fiyatı takibi
 * Yetki: admin, satinalma, muhasebe_ik
 */

import { Router, Response } from "express";
import { db } from "../db";
import { inventory, inventoryPriceHistory } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import type { AuthUser } from "../types/auth";
import multer from "multer";
import * as XLSX from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const IMPORT_ROLES = ["admin", "satinalma", "muhasebe_ik"];

// ── Malzeme türü dönüşümü (Excel → DB) ───────────────────────────

const TYPE_MAP: Record<string, string> = {
  HM: "hammadde",
  YM: "yari_mamul",
  MM: "mamul",
  TM: "ticari_mal",
  TK: "tuketim",
};

// ── Birim dönüşüm varsayılanları ──────────────────────────────────

function getUnitDefaults(excelUnit: string): { purchaseUnit: string; recipeUnit: string; conversionFactor: string | null } {
  const u = (excelUnit || "").toUpperCase().trim();
  if (u === "KG") return { purchaseUnit: "KG", recipeUnit: "g", conversionFactor: "1000" };
  if (u === "LT" || u === "L") return { purchaseUnit: "LT", recipeUnit: "ml", conversionFactor: "1000" };
  // ADET — birim dönüşümü malzemeye özel, sonradan elle girilmeli
  return { purchaseUnit: "ADET", recipeUnit: "g", conversionFactor: null };
}

// ── Kategori eşleştirme (Excel türü → DB kategori) ────────────────

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
    if (nameLower.includes("şeker") || nameLower.includes("stevia")) return "ambalaj";
    return "ticari_mal";
  }
  if (type === "TK") return "sube_malzeme";
  return "diger";
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/inventory/import-excel — Excel malzeme listesi import
// ═══════════════════════════════════════════════════════════════════

router.post("/api/inventory/import-excel", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    if (!IMPORT_ROLES.includes(user.role || "")) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    if (!req.file) return res.status(400).json({ error: "Excel dosyası gerekli" });

    const { mode } = req.body; // "preview" | "import"
    const isPreview = mode === "preview";

    // Excel parse
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    // Başlık satırını bul (2. satır genelde)
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && rows[i].some((cell: any) => String(cell || "").includes("Malzeme"))) {
        headerRow = i;
        break;
      }
    }
    if (headerRow === -1) return res.status(400).json({ error: "Başlık satırı bulunamadı" });

    // Veri satırlarını parse et — malzeme bazlı grupla
    interface MaterialRow {
      type: string;
      code: string;
      name: string;
      unitSet: string;
      unit: string;
      monthYear: string;
      netQuantity: number | null;
      netPurchaseAmount: number | null;
      unitPrice: number | null;
    }

    const materials = new Map<string, {
      type: string;
      code: string;
      name: string;
      unit: string;
      monthlyPrices: { monthYear: string; quantity: number; amount: number; unitPrice: number }[];
    }>();

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1]) continue;

      const type = String(row[0] || "").trim();
      const code = String(row[1] || "").trim();
      const name = String(row[2] || "").trim();
      const unit = String(row[4] || "").trim();
      const monthYear = String(row[5] || "").trim();

      if (!code || !name || type === "/" || type === "Malzeme (Sınıfı) Türü") continue;

      const netQuantity = row[6] ? Number(row[6]) : null;
      const netAmount = row[7] ? Number(row[7]) : null;
      const unitPrice = row[9] ? Number(row[9]) : null;

      if (!materials.has(code)) {
        materials.set(code, { type, code, name, unit, monthlyPrices: [] });
      }

      // Sadece alım yapılmış ayları kaydet (fiyat > 0)
      if (unitPrice && unitPrice > 0 && netQuantity && netQuantity > 0) {
        materials.get(code)!.monthlyPrices.push({
          monthYear,
          quantity: netQuantity,
          amount: netAmount || 0,
          unitPrice,
        });
      }
    }

    // En son fiyatı bul (en güncel ay/yıl)
    function parseMonthYear(my: string): Date {
      const parts = my.split("/");
      if (parts.length === 2) {
        return new Date(Number(parts[1]), Number(parts[0]) - 1, 1);
      }
      return new Date(0);
    }

    interface ImportResult {
      code: string;
      name: string;
      type: string;
      unit: string;
      category: string;
      latestPrice: number | null;
      latestPriceDate: string | null;
      priceHistoryCount: number;
      status: "new" | "updated" | "unchanged";
    }

    const results: ImportResult[] = [];
    let created = 0;
    let updated = 0;
    let priceHistoryCreated = 0;

    for (const [code, mat] of materials) {
      // Aylık fiyatları tarihe göre sırala
      mat.monthlyPrices.sort((a, b) => parseMonthYear(a.monthYear).getTime() - parseMonthYear(b.monthYear).getTime());

      const latestPrice = mat.monthlyPrices.length > 0
        ? mat.monthlyPrices[mat.monthlyPrices.length - 1]
        : null;

      const unitDefaults = getUnitDefaults(mat.unit);
      const category = mapCategory(mat.type, mat.name);
      const materialType = TYPE_MAP[mat.type.toUpperCase()] || "diger";

      const result: ImportResult = {
        code: mat.code,
        name: mat.name,
        type: materialType,
        unit: mat.unit.toLocaleLowerCase("tr-TR"),
        category,
        latestPrice: latestPrice?.unitPrice || null,
        latestPriceDate: latestPrice?.monthYear || null,
        priceHistoryCount: mat.monthlyPrices.length,
        status: "new",
      };

      if (!isPreview) {
        // DB'de var mı kontrol et
        const [existing] = await db.select({ id: inventory.id, lastPurchasePrice: inventory.lastPurchasePrice })
          .from(inventory)
          .where(eq(inventory.code, code))
          .limit(1);

        if (existing) {
          // Güncelle — sadece fiyat ve tür bilgisi
          const updates: Record<string, any> = {
            materialType,
            purchaseUnit: unitDefaults.purchaseUnit,
            updatedAt: new Date(),
          };

          if (latestPrice) {
            updates.lastPurchasePrice = String(latestPrice.unitPrice);
            updates.marketPrice = String(latestPrice.unitPrice);
            updates.marketPriceUpdatedAt = new Date();
          }
          if (unitDefaults.recipeUnit) updates.recipeUnit = unitDefaults.recipeUnit;
          if (unitDefaults.conversionFactor) updates.conversionFactor = unitDefaults.conversionFactor;

          await db.update(inventory).set(updates).where(eq(inventory.id, existing.id));
          result.status = "updated";
          updated++;

          // Fiyat geçmişi
          for (const mp of mat.monthlyPrices) {
            const effectiveDate = parseMonthYear(mp.monthYear);
            await db.insert(inventoryPriceHistory).values({
              inventoryId: existing.id,
              priceType: "purchase",
              price: String(mp.unitPrice),
              source: "excel_import",
              effectiveDate: effectiveDate.toISOString().split("T")[0],
              notes: `${mp.quantity} ${mat.unit} × ₺${mp.unitPrice} = ₺${mp.amount}`,
              createdBy: user.id,
            }).onConflictDoNothing();
            priceHistoryCreated++;
          }
        } else {
          // Yeni malzeme oluştur
          const [newItem] = await db.insert(inventory).values({
            code,
            name: mat.name,
            category,
            unit: mat.unit.toLocaleLowerCase("tr-TR"),
            materialType,
            purchaseUnit: unitDefaults.purchaseUnit,
            recipeUnit: unitDefaults.recipeUnit,
            conversionFactor: unitDefaults.conversionFactor,
            lastPurchasePrice: latestPrice ? String(latestPrice.unitPrice) : null,
            marketPrice: latestPrice ? String(latestPrice.unitPrice) : null,
            marketPriceUpdatedAt: latestPrice ? new Date() : null,
            unitCost: latestPrice ? String(latestPrice.unitPrice) : "0",
            currentStock: "0",
            minimumStock: "0",
          }).onConflictDoNothing().returning();

          if (newItem) {
            result.status = "new";
            created++;

            // Fiyat geçmişi
            for (const mp of mat.monthlyPrices) {
              const effectiveDate = parseMonthYear(mp.monthYear);
              await db.insert(inventoryPriceHistory).values({
                inventoryId: newItem.id,
                priceType: "purchase",
                price: String(mp.unitPrice),
                source: "excel_import",
                effectiveDate: effectiveDate.toISOString().split("T")[0],
                notes: `${mp.quantity} ${mat.unit} × ₺${mp.unitPrice} = ₺${mp.amount}`,
                createdBy: user.id,
              }).onConflictDoNothing();
              priceHistoryCreated++;
            }
          }
        }
      }

      results.push(result);
    }

    res.json({
      mode: isPreview ? "preview" : "import",
      totalMaterials: materials.size,
      created,
      updated,
      unchanged: materials.size - created - updated,
      priceHistoryCreated,
      typeBreakdown: Object.entries(
        results.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).map(([type, count]) => ({ type, count })),
      results: isPreview ? results : results.slice(0, 20), // Preview: tüm liste, import: ilk 20
    });
  } catch (error) {
    console.error("[InventoryImport] error:", error);
    res.status(500).json({ error: "Import başarısız" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/inventory/price-history/:id — Malzeme fiyat geçmişi
// ═══════════════════════════════════════════════════════════════════

router.get("/api/inventory/price-history/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    if (!IMPORT_ROLES.includes(user.role || "") && !["ceo", "cgo", "gida_muhendisi", "recete_gm"].includes(user.role || "")) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const inventoryId = Number(req.params.id);
    if (isNaN(inventoryId)) return res.status(400).json({ error: "Geçersiz ID" });

    const history = await db.select()
      .from(inventoryPriceHistory)
      .where(eq(inventoryPriceHistory.inventoryId, inventoryId))
      .orderBy(sql`${inventoryPriceHistory.effectiveDate} DESC`)
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error("[InventoryPriceHistory] error:", error);
    res.status(500).json({ error: "Fiyat geçmişi yüklenemedi" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PATCH /api/inventory/:id/market-price — Piyasa fiyatı güncelle
// ═══════════════════════════════════════════════════════════════════

router.patch("/api/inventory/:id/market-price", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    if (!IMPORT_ROLES.includes(user.role || "")) {
      return res.status(403).json({ error: "Sadece satınalma fiyat güncelleyebilir" });
    }

    const id = Number(req.params.id);
    const { marketPrice, notes } = req.body;
    if (!marketPrice || isNaN(Number(marketPrice))) {
      return res.status(400).json({ error: "Geçerli piyasa fiyatı gerekli" });
    }

    // Mevcut fiyatı al
    const [item] = await db.select({ id: inventory.id, marketPrice: inventory.marketPrice })
      .from(inventory).where(eq(inventory.id, id)).limit(1);
    if (!item) return res.status(404).json({ error: "Malzeme bulunamadı" });

    const previousPrice = item.marketPrice ? Number(item.marketPrice) : null;
    const newPrice = Number(marketPrice);
    const changePercent = previousPrice ? ((newPrice - previousPrice) / previousPrice * 100) : null;

    // Fiyat güncelle
    await db.update(inventory).set({
      marketPrice: String(newPrice),
      marketPriceUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(inventory.id, id));

    // Fiyat geçmişine kaydet
    await db.insert(inventoryPriceHistory).values({
      inventoryId: id,
      priceType: "market",
      price: String(newPrice),
      previousPrice: previousPrice ? String(previousPrice) : null,
      changePercent: changePercent ? String(changePercent.toFixed(2)) : null,
      source: "manual",
      effectiveDate: new Date().toISOString().split("T")[0],
      notes: notes || null,
      createdBy: user.id,
    });

    res.json({
      success: true,
      previousPrice,
      newPrice,
      changePercent: changePercent ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%` : null,
    });
  } catch (error) {
    console.error("[MarketPriceUpdate] error:", error);
    res.status(500).json({ error: "Fiyat güncellenemedi" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/inventory/stale-prices — 30+ gün güncellenmemiş fiyatlar
// ═══════════════════════════════════════════════════════════════════

router.get("/api/inventory/stale-prices", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    if (!IMPORT_ROLES.includes(user.role || "") && !["ceo", "cgo", "gida_muhendisi", "recete_gm", "fabrika_mudur"].includes(user.role || "")) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const staleItems = await db.execute(sql`
      SELECT id, code, name, category, material_type, unit,
        market_price, market_price_updated_at, last_purchase_price
      FROM inventory
      WHERE is_active = true
        AND material_type IN ('hammadde', 'yari_mamul')
        AND (market_price_updated_at IS NULL OR market_price_updated_at < ${thirtyDaysAgo}::timestamp)
      ORDER BY market_price_updated_at ASC NULLS FIRST
      LIMIT 50
    `);

    const totalStale = await db.execute(sql`
      SELECT count(*)::int as count FROM inventory
      WHERE is_active = true
        AND material_type IN ('hammadde', 'yari_mamul')
        AND (market_price_updated_at IS NULL OR market_price_updated_at < ${thirtyDaysAgo}::timestamp)
    `);

    res.json({
      staleCount: totalStale.rows?.[0]?.count || 0,
      items: staleItems.rows || [],
      threshold: "30 gün",
    });
  } catch (error) {
    console.error("[StalePrices] error:", error);
    res.status(500).json({ error: "Stale fiyatlar yüklenemedi" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/inventory/price-summary — Fiyat durumu özeti (dashboard)
// ═══════════════════════════════════════════════════════════════════

router.get("/api/inventory/price-summary", isAuthenticated, async (req: any, res: Response) => {
  try {
    const summary = await db.execute(sql`
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE market_price IS NOT NULL AND market_price::numeric > 0)::int as with_price,
        count(*) FILTER (WHERE material_type = 'hammadde')::int as hammadde_count,
        count(*) FILTER (WHERE material_type = 'yari_mamul')::int as yari_mamul_count,
        count(*) FILTER (
          WHERE material_type IN ('hammadde', 'yari_mamul')
          AND (market_price_updated_at IS NULL OR market_price_updated_at < NOW() - INTERVAL '30 days')
        )::int as stale_price_count
      FROM inventory WHERE is_active = true
    `);

    res.json(summary.rows?.[0] || {});
  } catch (error) {
    console.error("[PriceSummary] error:", error);
    res.status(500).json({ error: "Fiyat özeti yüklenemedi" });
  }
});

export default router;
