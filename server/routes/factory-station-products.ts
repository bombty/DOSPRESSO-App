// ═══════════════════════════════════════════════════════════════════
// Sprint 54.2 (Aslan 13 May 2026) — İstasyon-Ürün Mapping Yönetimi
// ═══════════════════════════════════════════════════════════════════
// 9 istasyon × N ürün ataması: factory_station_products
//
// Endpoints:
//   GET    /api/factory/station-products/:stationId  → o istasyonun ürünleri
//   POST   /api/factory/station-products             → ürün(ler) ata
//   DELETE /api/factory/station-products/:id         → atamayı kaldır
//   POST   /api/factory/station-products/auto-seed   → kategoriden otomatik seed
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, sql, inArray, asc } from "drizzle-orm";
import { factoryStations, factoryStationProducts, factoryProducts } from "@shared/schema";
import { isAuthenticated } from "../localAuth";

const router = Router();

const requireFactoryAdmin = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "ceo", "cgo", "fabrika_mudur", "uretim_sefi"].includes(role)) {
    return res.status(403).json({ message: "Bu işlem için yetki yok" });
  }
  next();
};

// GET — İstasyona atanmış ürünler
router.get("/api/factory/station-products/:stationId", isAuthenticated, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    if (isNaN(stationId)) return res.status(400).json({ message: "Geçersiz stationId" });

    const items = await db.select({
      mappingId: factoryStationProducts.id,
      productId: factoryProducts.id,
      sku: factoryProducts.sku,
      name: factoryProducts.name,
      category: factoryProducts.category,
      unit: factoryProducts.unit,
      isPrimary: factoryStationProducts.isPrimary,
      sortOrder: factoryStationProducts.sortOrder,
      notes: factoryStationProducts.notes,
    })
    .from(factoryStationProducts)
    .innerJoin(factoryProducts, eq(factoryStationProducts.productId, factoryProducts.id))
    .where(eq(factoryStationProducts.stationId, stationId))
    .orderBy(asc(factoryStationProducts.sortOrder), asc(factoryProducts.name));

    res.json({ stationId, products: items, count: items.length });
  } catch (err: any) {
    console.error("[StationProducts/get]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST — Tek veya çoklu ürün ataması
router.post("/api/factory/station-products", isAuthenticated, requireFactoryAdmin, async (req, res) => {
  try {
    const { stationId, productIds, notes } = req.body;
    if (!stationId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "stationId ve productIds (array) zorunlu" });
    }

    const inserts = productIds.map((pid: number, idx: number) => ({
      stationId,
      productId: pid,
      sortOrder: idx,
      notes: notes || null,
    }));

    const result = await db.insert(factoryStationProducts)
      .values(inserts)
      .onConflictDoNothing()
      .returning();

    console.log(`[StationProducts] ${result.length} ürün eklendi → station ${stationId}`);
    res.json({ success: true, added: result.length, items: result });
  } catch (err: any) {
    console.error("[StationProducts/post]", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE — Atamayı kaldır
router.delete("/api/factory/station-products/:id", isAuthenticated, requireFactoryAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    await db.delete(factoryStationProducts).where(eq(factoryStationProducts.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[StationProducts/delete]", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /auto-seed — Tüm istasyonlar için kategori bazlı otomatik seed
// Aslan onay verince çalıştırılır (idempotent — mevcut atamalar etkilenmez)
router.post("/api/factory/station-products/auto-seed", isAuthenticated, requireFactoryAdmin, async (req, res) => {
  try {
    // İstasyon adı → ürün category eşleştirmesi (Aslan'ın kataloguna göre)
    const mappings: Array<{ stationNames: string[]; categories: string[]; notes?: string }> = [
      { stationNames: ["donut süsleme"], categories: ["donut"], notes: "21 donut çeşidi - süsleme sonrası" },
      { stationNames: ["cinnaboom"], categories: ["cinnabon"], notes: "Cinnaboom çeşitleri" },
      { stationNames: ["cheesecake"], categories: ["cheesecake"], notes: "5 çeşit cheesecake" },
      { stationNames: ["mamabon"], categories: ["mamabon"], notes: "Bagel'lı sandviçler" },
      { stationNames: ["wrapitos"], categories: ["wrapitos"], notes: "Quesadilla çeşitleri" },
      { stationNames: ["cookies"], categories: ["cookie"], notes: "Sadece kurabiye (Crumbel, New York)" },
      { stationNames: ["konsantre dolum", "konsantre"], categories: ["syrup", "şurup"], notes: "~20 şurup + base" },
      // Donut Paketleme: TÜM TATLILAR (Aslan'ın açıkladığı kurgu)
      { stationNames: ["donut paketleme", "paketleme"], categories: ["donut", "cinnabon", "cheesecake", "cookie", "brownie", "cake"], notes: "Şoklama sonrası kolileme - 1 koli 48 donut" },
    ];

    const allStations = await db.select().from(factoryStations).where(eq(factoryStations.isActive, true));
    const allProducts = await db.select().from(factoryProducts).where(eq(factoryProducts.isActive, true));

    const seedResults: any[] = [];
    let totalAdded = 0;

    for (const mapping of mappings) {
      const matchingStations = allStations.filter(s => {
        const name = (s.name || "").toLowerCase();
        return mapping.stationNames.some(ms => name.includes(ms));
      });

      const matchingProducts = allProducts.filter(p => {
        const cat = (p.category || "").toLowerCase();
        return mapping.categories.some(mc => cat === mc.toLowerCase() || cat.includes(mc.toLowerCase()));
      });

      for (const station of matchingStations) {
        if (matchingProducts.length === 0) {
          seedResults.push({ station: station.name, products: 0, status: "no-products-in-category" });
          continue;
        }

        const inserts = matchingProducts.map((p, idx) => ({
          stationId: station.id,
          productId: p.id,
          sortOrder: idx,
          notes: mapping.notes || null,
        }));

        const result = await db.insert(factoryStationProducts)
          .values(inserts)
          .onConflictDoNothing()
          .returning();

        totalAdded += result.length;
        seedResults.push({
          station: station.name,
          stationId: station.id,
          categories: mapping.categories,
          productsFound: matchingProducts.length,
          newlyAdded: result.length,
          notes: mapping.notes,
        });
        console.log(`[AutoSeed] "${station.name}" → ${result.length} ürün eklendi (kategori: ${mapping.categories.join(",")})`);
      }
    }

    res.json({
      success: true,
      totalAdded,
      totalStationsProcessed: seedResults.length,
      details: seedResults,
      message: `${totalAdded} yeni mapping eklendi. Idempotent (tekrar çalıştırılabilir).`,
    });
  } catch (err: any) {
    console.error("[StationProducts/auto-seed]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
