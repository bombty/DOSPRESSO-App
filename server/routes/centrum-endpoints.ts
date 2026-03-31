/**
 * Centrum Dashboard Endpoints
 * Fabrika, Depo, Muhasebe, Satınalma, Şube Centrum sayfaları için
 */
import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  branches,
  users,
  branchInventory,
  factoryProducts,
  factoryInventory,
  factoryProductionRuns,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

// ═══ FACTORY PRODUCTION STATS ═══
router.get("/api/factory/production-stats", isAuthenticated, async (_req, res) => {
  try {
    const workers = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "fabrika" as any), eq(users.isActive, true)));

    const products = await db.select({ id: factoryProducts.id, name: factoryProducts.name })
      .from(factoryProducts).limit(6);

    res.json({
      activeWorkers: workers[0]?.count || 0,
      efficiency: 0,
      products: products.map(p => ({ name: p.name, target: 100, actual: 0 })),
    });
  } catch (error) {
    console.error("[FACTORY-STATS]", error);
    res.json({ activeWorkers: 0, efficiency: 0, products: [] });
  }
});

// ═══ FACTORY SHIPMENTS PENDING ═══
router.get("/api/factory/shipments/pending", isAuthenticated, async (_req, res) => {
  try {
    // factoryProductionRuns'dan bekleyen üretimler → sevkiyat olarak
    const pending = await db.select({
      id: factoryProductionRuns.id,
      status: factoryProductionRuns.status,
      createdAt: factoryProductionRuns.createdAt,
    })
      .from(factoryProductionRuns)
      .where(eq(factoryProductionRuns.status, "in_progress" as any))
      .orderBy(desc(factoryProductionRuns.createdAt))
      .limit(10);

    res.json(pending.map(p => ({
      id: p.id,
      branchName: "Fabrika",
      status: "hazırlanıyor",
      itemCount: 0,
      deadline: p.createdAt ? new Date(p.createdAt).toLocaleDateString("tr") : "—",
    })));
  } catch (error) {
    console.error("[SHIPMENTS]", error);
    res.json([]);
  }
});

// ═══ BRANCH FINANCIAL SUMMARY ═══
router.get("/api/branch-financial-summary", isAuthenticated, async (req, res) => {
  try {
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;
    const branchList = await db.select({ id: branches.id, name: branches.name }).from(branches);

    const summary = branchList.map(b => ({
      branchId: b.id,
      branchName: b.name,
      last3Months: [],
      fixedCosts: [
        { category: "Kira", amount: null },
        { category: "Elektrik", amount: null },
        { category: "Su/Gaz", amount: null },
      ],
    }));

    if (branchId) {
      res.json(summary.find(s => s.branchId === branchId) || { branchId, last3Months: [], fixedCosts: [] });
    } else {
      res.json(summary);
    }
  } catch (error) {
    console.error("[FINANCIAL-SUMMARY]", error);
    res.json([]);
  }
});

// ═══ INVENTORY ALERTS ═══
router.get("/api/inventory/alerts", isAuthenticated, async (_req, res) => {
  try {
    const lowStock = await db.select({
      id: branchInventory.id,
      branchId: branchInventory.branchId,
      productId: branchInventory.productId,
      currentQuantity: branchInventory.currentQuantity,
      minQuantity: branchInventory.minQuantity,
    })
      .from(branchInventory)
      .where(sql`${branchInventory.currentQuantity} <= ${branchInventory.minQuantity} * 1.5`)
      .limit(20);

    const branchList = await db.select({ id: branches.id, name: branches.name }).from(branches);
    const branchMap = Object.fromEntries(branchList.map(b => [b.id, b.name]));
    const productList = await db.select({ id: factoryProducts.id, name: factoryProducts.name }).from(factoryProducts);
    const productMap = Object.fromEntries(productList.map(p => [p.id, p.name]));

    res.json(lowStock.map(s => ({
      id: s.id,
      branchName: branchMap[s.branchId ?? 0] || "—",
      productName: productMap[s.productId ?? 0] || "—",
      currentQuantity: Number(s.currentQuantity) || 0,
      daysLeft: Math.max(0, Math.round((Number(s.currentQuantity) || 0) / Math.max(1, Number(s.minQuantity) || 1))),
      dailyUsage: Number(s.minQuantity) || 1,
    })));
  } catch (error) {
    console.error("[INVENTORY-ALERTS]", error);
    res.json([]);
  }
});

// ═══ PURCHASE ORDERS ACTIVE ═══
router.get("/api/purchase-orders/active", isAuthenticated, async (_req, res) => {
  try {
    // Henüz purchase_orders tablosu yok — boş dizi döndür
    res.json([]);
  } catch (error) {
    console.error("[PURCHASE-ORDERS]", error);
    res.json([]);
  }
});

export default router;
