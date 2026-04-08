/**
 * Fabrika F2 — Üretim↔Vardiya Entegrasyonu + Stok KPI
 * 
 * production_runs (vardiya bazlı) + production_logs (reçete bazlı) birleşimi
 * Stok seviyesi vs üretim çıktısı KPI
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  factoryProductionRuns, factoryShiftSessions, factoryStations,
  factoryProducts, factoryProductionLogs, factoryRecipes,
  factoryProductionOutputs, users,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

const F2_ROLES = [
  "admin", "recete_gm", "sef", "fabrika_mudur", "fabrika_sorumlu",
  "uretim_sefi", "gida_muhendisi", "fabrika_operator",
];

// ═══════════════════════════════════════
// ÜRETİM DASHBOARD — Vardiya + Reçete Birleşik
// ═══════════════════════════════════════

// GET /api/factory/production-dashboard?date=2026-04-08
router.get("/api/factory/production-dashboard", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!F2_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Erişim yok" });

    const dateStr = req.query.date as string || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(dateStr + "T00:00:00Z");
    const dayEnd = new Date(dateStr + "T23:59:59Z");

    // Vardiya bazlı üretim (factory_production_runs)
    const shiftProduction = await db.select({
      id: factoryProductionRuns.id,
      userId: factoryProductionRuns.userId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
      stationId: factoryProductionRuns.stationId,
      stationName: factoryStations.name,
      startTime: factoryProductionRuns.startTime,
      endTime: factoryProductionRuns.endTime,
      quantityProduced: factoryProductionRuns.quantityProduced,
      quantityWaste: factoryProductionRuns.quantityWaste,
      qualityScore: factoryProductionRuns.qualityScore,
    })
    .from(factoryProductionRuns)
    .leftJoin(users, eq(factoryProductionRuns.userId, users.id))
    .leftJoin(factoryStations, eq(factoryProductionRuns.stationId, factoryStations.id))
    .where(and(
      gte(factoryProductionRuns.startTime, dayStart),
      lte(factoryProductionRuns.startTime, dayEnd),
    ))
    .orderBy(desc(factoryProductionRuns.startTime));

    // Reçete bazlı üretim (factory_production_logs)
    const recipeProduction = await db.select({
      id: factoryProductionLogs.id,
      recipeId: factoryProductionLogs.recipeId,
      recipeName: factoryRecipes.name,
      recipeCode: factoryRecipes.code,
      batchMultiplier: factoryProductionLogs.batchMultiplier,
      expectedOutput: factoryProductionLogs.expectedOutput,
      actualOutput: factoryProductionLogs.actualOutput,
      status: factoryProductionLogs.status,
      isArge: factoryProductionLogs.isArge,
      startedAt: factoryProductionLogs.startedAt,
      completedAt: factoryProductionLogs.completedAt,
      actualWasteKg: factoryProductionLogs.actualWasteKg,
    })
    .from(factoryProductionLogs)
    .leftJoin(factoryRecipes, eq(factoryProductionLogs.recipeId, factoryRecipes.id))
    .where(and(
      gte(factoryProductionLogs.createdAt, dayStart),
      lte(factoryProductionLogs.createdAt, dayEnd),
    ))
    .orderBy(desc(factoryProductionLogs.createdAt));

    // Özet KPI'lar
    const totalShiftOutput = shiftProduction.reduce((sum, p) => sum + (p.quantityProduced || 0), 0);
    const totalShiftWaste = shiftProduction.reduce((sum, p) => sum + (p.quantityWaste || 0), 0);
    const avgQuality = shiftProduction.length > 0
      ? Math.round(shiftProduction.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / shiftProduction.filter(p => p.qualityScore).length)
      : 0;
    
    const completedRecipes = recipeProduction.filter(r => r.status === "completed");
    const totalRecipeOutput = completedRecipes.reduce((sum, r) => sum + (r.actualOutput || 0), 0);
    const totalRecipeWaste = completedRecipes.reduce((sum, r) => sum + Number(r.actualWasteKg || 0), 0);

    // Aktif istasyonlar
    const activeStations = new Set(shiftProduction.map(p => p.stationId)).size;
    const activeWorkers = new Set(shiftProduction.map(p => p.userId)).size;

    res.json({
      date: dateStr,
      summary: {
        shiftOutput: totalShiftOutput,
        shiftWaste: totalShiftWaste,
        wasteRate: totalShiftOutput > 0 ? Math.round(totalShiftWaste / totalShiftOutput * 100) : 0,
        recipeOutput: totalRecipeOutput,
        recipeWasteKg: Math.round(totalRecipeWaste * 100) / 100,
        completedBatches: completedRecipes.length,
        inProgressBatches: recipeProduction.filter(r => r.status === "in_progress").length,
        avgQualityScore: avgQuality,
        activeStations,
        activeWorkers,
      },
      shiftProduction,
      recipeProduction,
    });
  } catch (error) {
    console.error("Production dashboard error:", error);
    res.status(500).json({ error: "Üretim dashboard yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// STOK KPI — Üretim çıktısı vs stok durumu
// ═══════════════════════════════════════

// GET /api/factory/stock-kpi
router.get("/api/factory/stock-kpi", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!F2_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Erişim yok" });

    // Ürün bazlı stok durumu
    const products = await db.select({
      id: factoryProducts.id,
      name: factoryProducts.name,
      sku: factoryProducts.sku,
      category: factoryProducts.category,
      currentStock: sql<number>`0`, // TODO: currentStock kolonu eklenecek
      minStock: factoryProducts.minStock,
      maxStock: sql<number>`0`, // TODO: maxStockLevel kolonu eklenecek
      unit: factoryProducts.unit,
    }).from(factoryProducts)
      .where(eq(factoryProducts.isActive, true))
      .orderBy(factoryProducts.name);

    // Son 7 günlük üretim çıktısı (product_outputs)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let weeklyOutputs: any[] = [];
    try {
      weeklyOutputs = await db.select({
        productId: factoryProductionOutputs.productId,
        totalQuantity: sql<number>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS NUMERIC)), 0)`,
      }).from(factoryProductionOutputs)
        .where(gte(factoryProductionOutputs.createdAt, weekAgo))
        .groupBy(factoryProductionOutputs.productId);
    } catch { /* tablo boş olabilir */ }

    const outputMap = new Map(weeklyOutputs.map(o => [o.productId, Number(o.totalQuantity)]));

    // KPI hesapla
    const stockItems = products.map(p => {
      const current = Number(p.currentStock || 0);
      const min = Number(p.minStock || 0);
      const max = Number(p.maxStock || 100);
      const weeklyOutput = outputMap.get(p.id) || 0;

      let status: "critical" | "low" | "normal" | "high" = "normal";
      if (min > 0 && current <= min * 0.5) status = "critical";
      else if (min > 0 && current <= min) status = "low";
      else if (max > 0 && current >= max * 0.9) status = "high";

      return {
        ...p,
        weeklyOutput,
        status,
        daysRemaining: weeklyOutput > 0 ? Math.round(current / (weeklyOutput / 7)) : null,
      };
    });

    const criticalCount = stockItems.filter(s => s.status === "critical").length;
    const lowCount = stockItems.filter(s => s.status === "low").length;

    res.json({
      summary: {
        totalProducts: stockItems.length,
        criticalStock: criticalCount,
        lowStock: lowCount,
        normalStock: stockItems.filter(s => s.status === "normal").length,
      },
      items: stockItems,
    });
  } catch (error) {
    console.error("Stock KPI error:", error);
    res.status(500).json({ error: "Stok KPI yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// VARDİYA ÜRETİM DETAYI
// ═══════════════════════════════════════

// GET /api/factory/shift-production/:sessionId
router.get("/api/factory/shift-production/:sessionId", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!F2_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Erişim yok" });

    const sessionId = Number(req.params.sessionId);

    // Vardiya bilgisi
    const [session] = await db.select().from(factoryShiftSessions)
      .where(eq(factoryShiftSessions.id, sessionId));
    if (!session) return res.status(404).json({ error: "Vardiya bulunamadı" });

    // Bu vardiyada yapılan üretimler
    const runs = await db.select({
      id: factoryProductionRuns.id,
      userId: factoryProductionRuns.userId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
      stationName: factoryStations.name,
      quantityProduced: factoryProductionRuns.quantityProduced,
      quantityWaste: factoryProductionRuns.quantityWaste,
      qualityScore: factoryProductionRuns.qualityScore,
      startTime: factoryProductionRuns.startTime,
      endTime: factoryProductionRuns.endTime,
    })
    .from(factoryProductionRuns)
    .leftJoin(users, eq(factoryProductionRuns.userId, users.id))
    .leftJoin(factoryStations, eq(factoryProductionRuns.stationId, factoryStations.id))
    .where(eq(factoryProductionRuns.sessionId, sessionId))
    .orderBy(factoryProductionRuns.startTime);

    // Bu vardiyada başlatılan reçete üretimleri
    const recipeLogs = await db.select({
      id: factoryProductionLogs.id,
      recipeName: factoryRecipes.name,
      batchMultiplier: factoryProductionLogs.batchMultiplier,
      expectedOutput: factoryProductionLogs.expectedOutput,
      actualOutput: factoryProductionLogs.actualOutput,
      status: factoryProductionLogs.status,
    })
    .from(factoryProductionLogs)
    .leftJoin(factoryRecipes, eq(factoryProductionLogs.recipeId, factoryRecipes.id))
    .where(eq(factoryProductionLogs.sessionId, sessionId));

    res.json({
      session,
      runs,
      recipeLogs,
      summary: {
        totalOutput: runs.reduce((sum, r) => sum + (r.quantityProduced || 0), 0),
        totalWaste: runs.reduce((sum, r) => sum + (r.quantityWaste || 0), 0),
        workerCount: new Set(runs.map(r => r.userId)).size,
        batchCount: recipeLogs.length,
      },
    });
  } catch (error) {
    console.error("Shift production error:", error);
    res.status(500).json({ error: "Vardiya üretim detayı yüklenemedi" });
  }
});

export default router;
