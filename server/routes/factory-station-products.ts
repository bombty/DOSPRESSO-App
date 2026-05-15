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

// POST /auto-seed — 3 yeni istasyon ekle + mapping (Aslan'ın kataloguna göre)
// Aslan onay verince çalıştırılır (idempotent — onConflictDoNothing)
router.post("/api/factory/station-products/auto-seed", isAuthenticated, requireFactoryAdmin, async (req, res) => {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // ADIM 1 — 3 YENİ İSTASYON EKLE (Sprint 55.1, Aslan 14 May 2026)
    // ═══════════════════════════════════════════════════════════════════
    const newStations = [
      {
        code: "CINNABOOM_HATTI",
        name: "Cinnaboom Hattı",
        description: "Cinnaboom hamur üretimi (klassik + siyah hamur, apparat değişimi ile Donut Hattı'ndan ayrılmış)",
        category: "hamur",
        targetHourlyOutput: 60,
        sortOrder: 11,
      },
      {
        code: "SANDVIC_PAKETLEME",
        name: "Sandviç Paketleme",
        description: "Yatay paketleme: Mamabon, Wrapitos, Ciabatta, Croissant. Şoklamadan ÖNCE paketlenir.",
        category: "paketleme",
        targetHourlyOutput: 120,
        sortOrder: 20,
      },
      {
        code: "SURUP_PAKETLEME",
        name: "Şurup Paketleme",
        description: "Üst kat — Şurup etiketleme + kolileme. Konsantre Dolum'dan AYRI istasyon.",
        category: "paketleme",
        targetHourlyOutput: 80,
        sortOrder: 21,
      },
    ];

    const stationInsertResult = await db.insert(factoryStations)
      .values(newStations as any)
      .onConflictDoNothing({ target: factoryStations.code })
      .returning();

    console.log(`[AutoSeed] ${stationInsertResult.length} yeni istasyon eklendi`);

    // ═══════════════════════════════════════════════════════════════════
    // ADIM 2 — MAPPING (Aslan'ın açıkladığı kurgu)
    // ═══════════════════════════════════════════════════════════════════
    const mappings: Array<{ stationNames: string[]; categories: string[]; notes?: string }> = [
      // ÜRETİM İSTASYONLARI
      { stationNames: ["donut hattı", "donut hamur"], categories: ["donut-hamur"], notes: "Klassik + Black donut hamuru üretimi" },
      { stationNames: ["cinnaboom hattı"], categories: ["cinnabon-hamur", "cinnabon"], notes: "Klassik + Siyah cinnaboom hamur" },
      { stationNames: ["donut süsleme"], categories: ["donut"], notes: "21 donut çeşidi - süsleme sonrası" },
      { stationNames: ["cinnaboom"], categories: ["cinnabon"], notes: "Cinnaboom final çeşitler (hattı OLMAYAN)" },
      { stationNames: ["cheesecake"], categories: ["cheesecake"], notes: "5 çeşit cheesecake" },
      { stationNames: ["mamabon"], categories: ["mamabon"], notes: "Bagel'lı sandviçler" },
      { stationNames: ["wrapitos"], categories: ["wrapitos"], notes: "Quesadilla çeşitleri" },
      { stationNames: ["cookies"], categories: ["cookie"], notes: "Sadece kurabiye (Crumbel, New York)" },
      { stationNames: ["konsantre dolum", "konsantre"], categories: ["syrup", "şurup"], notes: "~20 şurup üretim" },
      
      // PAKETLEME İSTASYONLARI (Aslan'ın kurgusu)
      { stationNames: ["donut paketleme"], categories: ["donut", "cinnabon", "cheesecake", "cookie", "brownie", "cake"], notes: "Şoklama sonrası kolileme - 1 koli 48 donut. TÜM TATLILAR aynı yerde." },
      { stationNames: ["sandviç paketleme"], categories: ["mamabon", "wrapitos"], notes: "Yatay paketleme + koli. Şoklamadan ÖNCE." },
      { stationNames: ["şurup paketleme", "surup paketleme"], categories: ["syrup", "şurup", "topping"], notes: "Üst kat - etiketleme + kolileme" },
    ];

    const allStations = await db.select().from(factoryStations).where(eq(factoryStations.isActive, true));
    const allProducts = await db.select().from(factoryProducts).where(eq(factoryProducts.isActive, true));

    const seedResults: any[] = [];
    let totalAdded = 0;

    for (const mapping of mappings) {
      const matchingStations = allStations.filter(s => {
        const name = (s.name || "").toLowerCase();
        return mapping.stationNames.some(ms => name.includes(ms.toLowerCase()));
      });

      const matchingProducts = allProducts.filter(p => {
        const cat = (p.category || "").toLowerCase();
        return mapping.categories.some(mc => cat === mc.toLowerCase() || cat.includes(mc.toLowerCase()));
      });

      for (const station of matchingStations) {
        if (matchingProducts.length === 0) {
          seedResults.push({ station: station.name, products: 0, status: "no-products-in-category", categories: mapping.categories });
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
      newStations: stationInsertResult.length,
      newStationCodes: stationInsertResult.map((s: any) => s.code),
      totalProductMappings: totalAdded,
      totalStationsProcessed: seedResults.length,
      details: seedResults,
      message: `${stationInsertResult.length} yeni istasyon + ${totalAdded} ürün mapping eklendi. Idempotent.`,
    });
  } catch (err: any) {
    console.error("[StationProducts/auto-seed]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
