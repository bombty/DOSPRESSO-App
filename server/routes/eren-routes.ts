// ═══════════════════════════════════════════════════════════════════
// Sprint 54 (Aslan 13 May 2026) — Eren (fabrika_mudur) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 görev:
//   1. Üretim paneli (production_batches today + status)
//   2. Vardiya & personel (factory_shifts today + check-in)
//   3. KPI & maliyet (üretim hızı, ekipman, birim maliyet)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { productionBatches, factoryProducts } from "@shared/schema";
import { factoryShifts, factoryShiftWorkers, factoryMachines, users } from "@shared/schema";
import { isAuthenticated } from "../localAuth";

const router = Router();

const requireEren = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "ceo", "cgo", "fabrika_mudur", "uretim_sefi"].includes(role)) {
    return res.status(403).json({ message: "Bu işlem için yetki yok (fabrika_mudur gerekli)" });
  }
  next();
};

const todayISO = () => new Date().toISOString().split("T")[0];

// ═══════════════════════════════════════════════════════════════════
// 1. ÜRETİM PANELİ
// ═══════════════════════════════════════════════════════════════════

// GET /api/eren/production-today
// Bugünün üretim batch'leri + ürün adları + status dağılımı
router.get("/api/eren/production-today", isAuthenticated, requireEren, async (req, res) => {
  try {
    const today = todayISO();

    const batches = await db.select({
      id: productionBatches.id,
      batchNumber: productionBatches.batchNumber,
      productId: productionBatches.productId,
      quantity: productionBatches.quantity,
      unit: productionBatches.unit,
      productionDate: productionBatches.productionDate,
      expiryDate: productionBatches.expiryDate,
      status: productionBatches.status,
      qualityScore: productionBatches.qualityScore,
      qualityNotes: productionBatches.qualityNotes,
      notes: productionBatches.notes,
      createdAt: productionBatches.createdAt,
    })
    .from(productionBatches)
    .where(eq(productionBatches.productionDate, today))
    .orderBy(desc(productionBatches.createdAt));

    // Ürün adları
    const productIds = Array.from(new Set(batches.map(b => b.productId).filter(Boolean)));
    let productMap: Record<number, any> = {};
    if (productIds.length > 0) {
      const products = await db.select({
        id: factoryProducts.id,
        name: factoryProducts.name,
        sku: factoryProducts.sku,
        category: factoryProducts.category,
      })
      .from(factoryProducts)
      .where(sql`${factoryProducts.id} = ANY(${productIds})`);
      productMap = Object.fromEntries(products.map(p => [p.id, p]));
    }

    const enriched = batches.map(b => ({
      ...b,
      product: b.productId ? productMap[b.productId] : null,
    }));

    // Summary
    const summary = {
      total: batches.length,
      planned: batches.filter(b => b.status === "planned").length,
      inProgress: batches.filter(b => b.status === "in_progress").length,
      completed: batches.filter(b => b.status === "completed").length,
      qualityCheck: batches.filter(b => b.status === "quality_check").length,
      approved: batches.filter(b => b.status === "approved").length,
      rejected: batches.filter(b => b.status === "rejected").length,
      totalQuantity: batches.reduce((s, b) => s + (b.quantity || 0), 0),
      avgQuality: batches.filter(b => b.qualityScore).length > 0
        ? Math.round(batches.filter(b => b.qualityScore).reduce((s, b) => s + (b.qualityScore || 0), 0) / batches.filter(b => b.qualityScore).length)
        : null,
    };

    res.json({ batches: enriched, summary, date: today });
  } catch (err: any) {
    console.error("[Eren/production-today]", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/eren/production-week — son 7 gün trend
router.get("/api/eren/production-week", isAuthenticated, requireEren, async (req, res) => {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);

    const result = await db.select({
      date: productionBatches.productionDate,
      status: productionBatches.status,
      totalQty: sql<number>`COALESCE(SUM(${productionBatches.quantity}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productionBatches)
    .where(and(
      gte(productionBatches.productionDate, start.toISOString().split("T")[0]),
      lte(productionBatches.productionDate, end.toISOString().split("T")[0]),
    ))
    .groupBy(productionBatches.productionDate, productionBatches.status);

    res.json({ trend: result, startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] });
  } catch (err: any) {
    console.error("[Eren/production-week]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. VARDİYA & PERSONEL
// ═══════════════════════════════════════════════════════════════════

// GET /api/eren/shifts-today — bugünün vardiyaları + atanan personel
router.get("/api/eren/shifts-today", isAuthenticated, requireEren, async (req, res) => {
  try {
    const today = todayISO();

    const shifts = await db.select({
      id: factoryShifts.id,
      shiftDate: factoryShifts.shiftDate,
      shiftType: factoryShifts.shiftType,
      startTime: factoryShifts.startTime,
      endTime: factoryShifts.endTime,
      status: factoryShifts.status,
      notes: factoryShifts.notes,
    })
    .from(factoryShifts)
    .where(eq(factoryShifts.shiftDate, today))
    .orderBy(factoryShifts.startTime);

    // Atanan personel
    const shiftIds = shifts.map(s => s.id);
    let workersByShift: Record<number, any[]> = {};
    if (shiftIds.length > 0) {
      const workers = await db.select({
        id: factoryShiftWorkers.id,
        shiftId: factoryShiftWorkers.shiftId,
        userId: factoryShiftWorkers.userId,
        machineId: factoryShiftWorkers.machineId,
        productId: factoryShiftWorkers.productId,
        role: factoryShiftWorkers.role,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userRole: users.role,
        userUsername: users.username,
      })
      .from(factoryShiftWorkers)
      .leftJoin(users, eq(factoryShiftWorkers.userId, users.id))
      .where(sql`${factoryShiftWorkers.shiftId} = ANY(${shiftIds})`);

      for (const w of workers) {
        if (!workersByShift[w.shiftId]) workersByShift[w.shiftId] = [];
        workersByShift[w.shiftId].push({
          id: w.id,
          userId: w.userId,
          machineId: w.machineId,
          productId: w.productId,
          role: w.role,
          name: [w.userFirstName, w.userLastName].filter(Boolean).join(" ") || w.userUsername || "Bilinmiyor",
          userRole: w.userRole,
        });
      }
    }

    const enriched = shifts.map(s => ({
      ...s,
      workers: workersByShift[s.id] || [],
      workerCount: (workersByShift[s.id] || []).length,
    }));

    const summary = {
      totalShifts: shifts.length,
      activeShifts: shifts.filter(s => s.status === "active").length,
      totalWorkers: Object.values(workersByShift).reduce((s, w) => s + w.length, 0),
    };

    res.json({ shifts: enriched, summary, date: today });
  } catch (err: any) {
    console.error("[Eren/shifts-today]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. KPI & MALİYET
// ═══════════════════════════════════════════════════════════════════

// GET /api/eren/kpi — özet KPI'lar (son 7 gün)
router.get("/api/eren/kpi", isAuthenticated, requireEren, async (req, res) => {
  try {
    const today = todayISO();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    // Toplam üretim son 7 gün
    const [weekProd] = await db.select({
      totalQty: sql<number>`COALESCE(SUM(${productionBatches.quantity}), 0)`,
      batchCount: sql<number>`COUNT(*)`,
      avgQuality: sql<number>`COALESCE(AVG(${productionBatches.qualityScore}), 0)`,
      rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${productionBatches.status} = 'rejected')`,
    })
    .from(productionBatches)
    .where(gte(productionBatches.productionDate, weekAgoStr));

    // Aktif makineler
    const [machineStat] = await db.select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${factoryMachines.isActive} = true)`,
    })
    .from(factoryMachines);

    // Bugün vardiyada kaç kişi
    const [todayWorkers] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${factoryShiftWorkers.userId})`,
    })
    .from(factoryShiftWorkers)
    .innerJoin(factoryShifts, eq(factoryShiftWorkers.shiftId, factoryShifts.id))
    .where(eq(factoryShifts.shiftDate, today));

    const kpi = {
      week: {
        totalProduction: Number(weekProd?.totalQty || 0),
        batchCount: Number(weekProd?.batchCount || 0),
        avgQuality: Math.round(Number(weekProd?.avgQuality || 0)),
        rejectionRate: weekProd && Number(weekProd.batchCount) > 0
          ? Math.round((Number(weekProd.rejectedCount) / Number(weekProd.batchCount)) * 100)
          : 0,
        avgDaily: Math.round(Number(weekProd?.totalQty || 0) / 7),
      },
      machines: {
        total: Number(machineStat?.total || 0),
        active: Number(machineStat?.active || 0),
        utilizationPct: machineStat && Number(machineStat.total) > 0
          ? Math.round((Number(machineStat.active) / Number(machineStat.total)) * 100)
          : 0,
      },
      personnel: {
        todayWorkers: Number(todayWorkers?.count || 0),
      },
    };

    res.json({ kpi, date: today });
  } catch (err: any) {
    console.error("[Eren/kpi]", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/eren/batches/:id/status — batch durumu güncelle
router.patch("/api/eren/batches/:id/status", isAuthenticated, requireEren, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, qualityScore, qualityNotes } = req.body;
    const userId = req.user.id;

    if (!["planned", "in_progress", "completed", "quality_check", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz status" });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    if (status === "approved" || status === "rejected") {
      updateData.approvedById = userId;
    }
    if (qualityScore !== undefined) updateData.qualityScore = qualityScore;
    if (qualityNotes !== undefined) updateData.qualityNotes = qualityNotes;

    const [updated] = await db.update(productionBatches)
      .set(updateData)
      .where(eq(productionBatches.id, id))
      .returning();

    console.log(`[Eren] ${userId} batch ${id} → ${status}`);
    res.json({ success: true, batch: updated });
  } catch (err: any) {
    console.error("[Eren/batch-status]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
