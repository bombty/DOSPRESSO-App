/**
 * MRP-Light API — Günlük Malzeme Çekme Sistemi
 * Plan oluşturma, malzeme çekme, artan malzeme takibi
 * 
 * Roller:
 * - Plan oluştur/düzenle: uretim_sefi, fabrika_mudur, recete_gm, admin
 * - Malzeme çek (pick): fabrika_depo, uretim_sefi, fabrika_mudur, admin
 * - Teslim al (verify): fabrika_operator, sef, uretim_sefi, fabrika_mudur, admin
 * - Artan kayıt: fabrika_operator, sef, uretim_sefi, admin
 * - Artan doğrula: gida_muhendisi, recete_gm, admin
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  dailyMaterialPlans, dailyMaterialPlanItems,
  productionAreaLeftovers, materialPickLogs,
  inventory, factoryRecipes, factoryRecipeIngredients,
  inventoryMovements,
} from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte, isNull } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import type { AuthUser } from "../types/auth";

const router = Router();

const PLAN_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "recete_gm"];
const PICK_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "fabrika_depo"];
const VERIFY_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_RECORD_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator"];
const LEFTOVER_VERIFY_ROLES = ["admin", "gida_muhendisi", "recete_gm"];
const VIEW_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "recete_gm", "gida_muhendisi", "fabrika_depo", "sef", "fabrika_operator", "fabrika_sorumlu"];

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user as AuthUser;
    if (!user || !roles.includes(user.role || "")) return res.status(403).json({ error: "Yetkiniz yok" });
    next();
  };
}

// ═══════════════════════════════════════════════════════════════
// PLAN — Günlük malzeme planı
// ═══════════════════════════════════════════════════════════════

// POST /api/mrp/generate-daily-plan — Üretim planından malzeme ihtiyacı hesapla
router.post("/api/mrp/generate-daily-plan", isAuthenticated, requireRole(PLAN_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const { planDate, recipes } = req.body;
    // recipes: [{ recipeId: number, batchCount: number }]

    if (!planDate || !recipes || !Array.isArray(recipes) || recipes.length === 0) {
      return res.status(400).json({ error: "planDate ve recipes[] gerekli" });
    }

    // Aynı tarihte plan var mı?
    const [existing] = await db.select({ id: dailyMaterialPlans.id, status: dailyMaterialPlans.status })
      .from(dailyMaterialPlans)
      .where(eq(dailyMaterialPlans.planDate, planDate))
      .limit(1);

    if (existing && existing.status !== "draft") {
      return res.status(409).json({ error: "Bu tarihte onaylanmış plan var", planId: existing.id });
    }

    // Dünün artanlarını al
    const yesterday = new Date(new Date(planDate).getTime() - 86400000).toISOString().split("T")[0];
    const leftovers = await db.select()
      .from(productionAreaLeftovers)
      .where(and(
        eq(productionAreaLeftovers.recordDate, yesterday),
        eq(productionAreaLeftovers.usedInNextDay, false),
        sql`${productionAreaLeftovers.condition} != 'unusable'`
      ));

    const leftoverMap = new Map<number, number>();
    for (const lo of leftovers) {
      leftoverMap.set(lo.inventoryId, Number(lo.remainingQuantity || 0));
    }

    // Her reçete için malzeme ihtiyacı hesapla
    const itemsToCreate: Array<{
      inventoryId: number;
      recipeId: number;
      batchCount: number;
      requiredQuantity: number;
      unit: string;
    }> = [];

    for (const r of recipes) {
      const ingredients = await db.select({
        inventoryId: factoryRecipeIngredients.rawMaterialId,
        amount: factoryRecipeIngredients.amount,
        unit: factoryRecipeIngredients.unit,
        ingredientType: factoryRecipeIngredients.ingredientType,
      })
      .from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, r.recipeId));

      for (const ing of ingredients) {
        if (!ing.inventoryId || ing.ingredientType === "keyblend") continue;
        const required = Number(ing.amount || 0) * Number(r.batchCount || 1);
        itemsToCreate.push({
          inventoryId: ing.inventoryId,
          recipeId: r.recipeId,
          batchCount: r.batchCount,
          requiredQuantity: required,
          unit: ing.unit || "g",
        });
      }
    }

    // Aynı malzemeyi birleştir (farklı reçetelerden aynı malzeme)
    const mergedItems = new Map<number, {
      inventoryId: number;
      recipeIds: number[];
      totalRequired: number;
      unit: string;
      batchCounts: number[];
    }>();

    for (const item of itemsToCreate) {
      const existing = mergedItems.get(item.inventoryId);
      if (existing) {
        existing.totalRequired += item.requiredQuantity;
        if (!existing.recipeIds.includes(item.recipeId)) {
          existing.recipeIds.push(item.recipeId);
          existing.batchCounts.push(item.batchCount);
        }
      } else {
        mergedItems.set(item.inventoryId, {
          inventoryId: item.inventoryId,
          recipeIds: [item.recipeId],
          totalRequired: item.requiredQuantity,
          unit: item.unit,
          batchCounts: [item.batchCount],
        });
      }
    }

    // Plan oluştur veya güncelle
    let planId: number;
    if (existing) {
      planId = existing.id;
      await db.delete(dailyMaterialPlanItems).where(eq(dailyMaterialPlanItems.planId, planId));
      await db.update(dailyMaterialPlans).set({
        status: "draft",
        totalItemCount: mergedItems.size,
        updatedAt: new Date(),
      }).where(eq(dailyMaterialPlans.id, planId));
    } else {
      const [plan] = await db.insert(dailyMaterialPlans).values({
        planDate,
        status: "draft",
        createdBy: user.id,
        totalItemCount: mergedItems.size,
      }).returning();
      planId = plan.id;
    }

    // Plan kalemlerini ekle
    let totalCost = 0;
    for (const [invId, item] of mergedItems) {
      const leftoverQty = leftoverMap.get(invId) || 0;
      const netPick = Math.max(0, item.totalRequired - leftoverQty);

      // Birim maliyet
      const [inv] = await db.select({ unitCost: inventory.unitCost })
        .from(inventory).where(eq(inventory.id, invId)).limit(1);
      totalCost += netPick * Number(inv?.unitCost || 0);

      await db.insert(dailyMaterialPlanItems).values({
        planId,
        inventoryId: invId,
        recipeId: item.recipeIds[0], // İlk reçete
        batchCount: String(item.batchCounts.reduce((a, b) => a + b, 0)),
        requiredQuantity: String(item.totalRequired),
        leftoverQuantity: String(leftoverQty),
        netPickQuantity: String(netPick),
        unit: item.unit,
        status: "pending",
      });
    }

    // Toplam maliyet güncelle
    await db.update(dailyMaterialPlans).set({
      totalCostEstimate: String(totalCost),
    }).where(eq(dailyMaterialPlans.id, planId));

    // Kullanılan artanları işaretle
    for (const [invId] of leftoverMap) {
      if (mergedItems.has(invId)) {
        await db.update(productionAreaLeftovers).set({ usedInNextDay: true })
          .where(and(
            eq(productionAreaLeftovers.recordDate, yesterday),
            eq(productionAreaLeftovers.inventoryId, invId)
          ));
      }
    }

    res.json({
      planId,
      planDate,
      totalItems: mergedItems.size,
      totalCostEstimate: totalCost,
      leftoverUsed: [...leftoverMap.entries()].filter(([k]) => mergedItems.has(k)).length,
    });
  } catch (error) {
    console.error("[MRP/GeneratePlan]", error);
    res.status(500).json({ error: "Plan oluşturulamadı" });
  }
});

// GET /api/mrp/daily-plan/:date — Belirli tarihin planı
router.get("/api/mrp/daily-plan/:date", isAuthenticated, requireRole(VIEW_ROLES), async (req: any, res: Response) => {
  try {
    const { date } = req.params;
    const [plan] = await db.select().from(dailyMaterialPlans)
      .where(eq(dailyMaterialPlans.planDate, date)).limit(1);
    if (!plan) return res.status(404).json({ error: "Bu tarihte plan yok" });

    const items = await db.execute(sql`
      SELECT dmi.*, i.name as inventory_name, i.code as inventory_code, i.category,
        i.warehouse_location, fr.name as recipe_name,
        u1.first_name || ' ' || u1.last_name as picker_name,
        u2.first_name || ' ' || u2.last_name as verifier_name
      FROM daily_material_plan_items dmi
      JOIN inventory i ON i.id = dmi.inventory_id
      LEFT JOIN factory_recipes fr ON fr.id = dmi.recipe_id
      LEFT JOIN users u1 ON u1.id = dmi.picked_by
      LEFT JOIN users u2 ON u2.id = dmi.verified_by
      WHERE dmi.plan_id = ${plan.id}
      ORDER BY i.category, i.name
    `);

    res.json({ plan, items: items.rows || [] });
  } catch (error) {
    console.error("[MRP/GetPlan]", error);
    res.status(500).json({ error: "Plan yüklenemedi" });
  }
});

// PATCH /api/mrp/daily-plan/:id/confirm — Planı onayla
router.patch("/api/mrp/daily-plan/:id/confirm", isAuthenticated, requireRole(PLAN_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const id = Number(req.params.id);
    const [updated] = await db.update(dailyMaterialPlans).set({
      status: "confirmed",
      confirmedBy: user.id,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(dailyMaterialPlans.id, id)).returning();
    res.json(updated);
  } catch (error) {
    console.error("[MRP/ConfirmPlan]", error);
    res.status(500).json({ error: "Onay başarısız" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PICK — Malzeme çekme
// ═══════════════════════════════════════════════════════════════

// PATCH /api/mrp/plan-items/:id/pick — Depocu malzeme çeker
router.patch("/api/mrp/plan-items/:id/pick", isAuthenticated, requireRole(PICK_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const id = Number(req.params.id);
    const { actualPickedQuantity, fromLocation, lotNumber, expiryDate } = req.body;

    const [item] = await db.select().from(dailyMaterialPlanItems)
      .where(eq(dailyMaterialPlanItems.id, id)).limit(1);
    if (!item) return res.status(404).json({ error: "Kalem bulunamadı" });

    // Güncelle
    const [updated] = await db.update(dailyMaterialPlanItems).set({
      actualPickedQuantity: String(actualPickedQuantity || item.netPickQuantity),
      status: "picked",
      pickedBy: user.id,
      pickedAt: new Date(),
    }).where(eq(dailyMaterialPlanItems.id, id)).returning();

    // Pick log oluştur
    await db.insert(materialPickLogs).values({
      planItemId: id,
      inventoryId: item.inventoryId,
      quantity: String(actualPickedQuantity || item.netPickQuantity),
      unit: item.unit,
      fromLocation: fromLocation || "depo_ana",
      toLocation: "uretim_alani",
      lotNumber: lotNumber || null,
      expiryDate: expiryDate || null,
      pickedBy: user.id,
    });

    // Plan picked count güncelle
    const pickedCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(dailyMaterialPlanItems)
      .where(and(eq(dailyMaterialPlanItems.planId, item.planId), eq(dailyMaterialPlanItems.status, "picked")));

    await db.update(dailyMaterialPlans).set({
      totalPickedCount: pickedCount[0]?.count || 0,
      status: "in_progress",
      updatedAt: new Date(),
    }).where(eq(dailyMaterialPlans.id, item.planId));

    res.json(updated);
  } catch (error) {
    console.error("[MRP/Pick]", error);
    res.status(500).json({ error: "Çekme başarısız" });
  }
});

// PATCH /api/mrp/plan-items/:id/verify — Operatör teslim alır
router.patch("/api/mrp/plan-items/:id/verify", isAuthenticated, requireRole(VERIFY_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const id = Number(req.params.id);

    const [updated] = await db.update(dailyMaterialPlanItems).set({
      status: "verified",
      verifiedBy: user.id,
      verifiedAt: new Date(),
    }).where(eq(dailyMaterialPlanItems.id, id)).returning();

    res.json(updated);
  } catch (error) {
    console.error("[MRP/Verify]", error);
    res.status(500).json({ error: "Doğrulama başarısız" });
  }
});

// ═══════════════════════════════════════════════════════════════
// LEFTOVERS — Artan malzeme
// ═══════════════════════════════════════════════════════════════

// POST /api/mrp/leftovers — Gün sonu artan malzeme kayıt
router.post("/api/mrp/leftovers", isAuthenticated, requireRole(LEFTOVER_RECORD_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const { recordDate, items } = req.body;
    // items: [{ inventoryId, remainingQuantity, unit, condition, storageTemp }]

    if (!recordDate || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "recordDate ve items[] gerekli" });
    }

    const results = [];
    for (const item of items) {
      if (!item.inventoryId || !item.remainingQuantity) continue;

      const [created] = await db.insert(productionAreaLeftovers).values({
        recordDate,
        inventoryId: item.inventoryId,
        remainingQuantity: String(item.remainingQuantity),
        unit: item.unit || "g",
        condition: item.condition || "good",
        storageTemp: item.storageTemp ? String(item.storageTemp) : null,
        expiryRisk: item.expiryRisk || false,
        recordedBy: user.id,
      }).onConflictDoNothing().returning();

      if (created) results.push(created);
    }

    res.json({ success: true, count: results.length, items: results });
  } catch (error) {
    console.error("[MRP/Leftovers]", error);
    res.status(500).json({ error: "Artan kayıt başarısız" });
  }
});

// GET /api/mrp/leftovers/:date — Belirli günün artanları
router.get("/api/mrp/leftovers/:date", isAuthenticated, requireRole(VIEW_ROLES), async (req: any, res: Response) => {
  try {
    const items = await db.execute(sql`
      SELECT pal.*, i.name as inventory_name, i.code as inventory_code, i.category,
        u1.first_name || ' ' || u1.last_name as recorder_name,
        u2.first_name || ' ' || u2.last_name as verifier_name
      FROM production_area_leftovers pal
      JOIN inventory i ON i.id = pal.inventory_id
      LEFT JOIN users u1 ON u1.id = pal.recorded_by
      LEFT JOIN users u2 ON u2.id = pal.verified_by
      WHERE pal.record_date = ${req.params.date}
      ORDER BY i.category, i.name
    `);
    res.json(items.rows || []);
  } catch (error) {
    console.error("[MRP/GetLeftovers]", error);
    res.status(500).json({ error: "Artanlar yüklenemedi" });
  }
});

// PATCH /api/mrp/leftovers/:id/verify — Gıda mühendisi artan doğrulama
router.patch("/api/mrp/leftovers/:id/verify", isAuthenticated, requireRole(LEFTOVER_VERIFY_ROLES), async (req: any, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const id = Number(req.params.id);
    const { condition, wastedQuantity, wasteReason } = req.body;

    const updates: Record<string, any> = {
      verifiedBy: user.id,
      verifiedAt: new Date(),
    };
    if (condition) updates.condition = condition;
    if (wastedQuantity) {
      updates.wastedQuantity = String(wastedQuantity);
      updates.wasteReason = wasteReason || null;
    }

    const [updated] = await db.update(productionAreaLeftovers)
      .set(updates)
      .where(eq(productionAreaLeftovers.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[MRP/VerifyLeftover]", error);
    res.status(500).json({ error: "Doğrulama başarısız" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PICK LOGS — Çekme geçmişi
// ═══════════════════════════════════════════════════════════════

// GET /api/mrp/pick-logs — Malzeme çekme geçmişi
router.get("/api/mrp/pick-logs", isAuthenticated, requireRole(VIEW_ROLES), async (req: any, res: Response) => {
  try {
    const { startDate, endDate, inventoryId } = req.query;
    const conditions = [];
    if (startDate) conditions.push(sql`mpl.created_at >= ${startDate}::date`);
    if (endDate) conditions.push(sql`mpl.created_at <= (${endDate}::date + interval '1 day')`);
    if (inventoryId && !isNaN(Number(inventoryId))) conditions.push(sql`mpl.inventory_id = ${Number(inventoryId)}`);

    const whereClause = conditions.length > 0
      ? sql.join([sql`WHERE`, sql.join(conditions, sql` AND `)], sql` `)
      : sql``;

    const logs = await db.execute(sql`
      SELECT mpl.*, i.name as inventory_name, i.code as inventory_code,
        u.first_name || ' ' || u.last_name as picker_name
      FROM material_pick_logs mpl
      JOIN inventory i ON i.id = mpl.inventory_id
      LEFT JOIN users u ON u.id = mpl.picked_by
      ${whereClause}
      ORDER BY mpl.created_at DESC
      LIMIT 200
    `);
    res.json(logs.rows || []);
  } catch (error) {
    console.error("[MRP/PickLogs]", error);
    res.status(500).json({ error: "Çekme geçmişi yüklenemedi" });
  }
});

export default router;
