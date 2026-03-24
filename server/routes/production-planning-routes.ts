import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { sql } from "drizzle-orm";
import type { AuthUser } from "../types/auth";
import {
  weeklyProductionPlans,
  productionPlanItems,
  dailyProductionRecords,
  productionResponsibilities,
} from "@shared/schema";

const router = Router();

const PLAN_MANAGE_ROLES = ["admin", "ceo", "cgo", "fabrika_mudur", "uretim_sefi", "fabrika_sorumlu", "coach", "trainer"];
const PLAN_APPROVE_ROLES = ["admin", "ceo", "cgo", "fabrika_mudur", "coach"];
const PLAN_VIEW_ROLES = [...PLAN_MANAGE_ROLES, "fabrika_personel", "fabrika_operator", "kalite_kontrol", "gida_muhendisi"];
const RECORD_ROLES = ["admin", "fabrika_mudur", "uretim_sefi", "fabrika_sorumlu", "fabrika_personel", "fabrika_operator"];

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user as AuthUser;
    if (!user || !roles.includes(user.role || "")) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }
    next();
  };
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

router.get("/api/production-planning/plans", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const { weekStart, status } = req.query;
    let where = "1=1";
    if (weekStart && isValidDate(weekStart as string)) where += ` AND week_start = '${weekStart}'`;
    if (status && typeof status === "string" && /^[a-z_]+$/.test(status)) where += ` AND status = '${status}'`;

    const plans = await db.execute(sql.raw(`
      SELECT p.*,
        u1.first_name || ' ' || u1.last_name as creator_name,
        u2.first_name || ' ' || u2.last_name as approver_name,
        (SELECT count(*) FROM production_plan_items pi WHERE pi.plan_id = p.id) as item_count
      FROM weekly_production_plans p
      LEFT JOIN users u1 ON u1.id = p.created_by
      LEFT JOIN users u2 ON u2.id = p.approved_by
      WHERE ${where}
      ORDER BY p.week_start DESC
      LIMIT 50
    `));
    res.json(plans.rows || []);
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Plans]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Planlar yüklenemedi" });
  }
});

router.get("/api/production-planning/plans/:id", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) return res.status(400).json({ message: "Geçersiz plan ID" });

    const planResult = await db.execute(sql.raw(`
      SELECT p.*,
        u1.first_name || ' ' || u1.last_name as creator_name,
        u2.first_name || ' ' || u2.last_name as approver_name
      FROM weekly_production_plans p
      LEFT JOIN users u1 ON u1.id = p.created_by
      LEFT JOIN users u2 ON u2.id = p.approved_by
      WHERE p.id = ${planId}
    `));
    if (!planResult.rows?.length) return res.status(404).json({ message: "Plan bulunamadı" });

    const items = await db.execute(sql.raw(`
      SELECT pi.*, fp.name as product_name, fp.category as product_category, fp.sku
      FROM production_plan_items pi
      JOIN factory_products fp ON fp.id = pi.product_id
      WHERE pi.plan_id = ${planId}
      ORDER BY pi.day_of_week, fp.category, fp.name
    `));

    res.json({ plan: planResult.rows[0], items: items.rows || [] });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/PlanDetail]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Plan detayı yüklenemedi" });
  }
});

router.post("/api/production-planning/plans", isAuthenticated, requireRole(PLAN_MANAGE_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { weekStart, weekEnd, notes, items } = req.body;
    if (!weekStart || !weekEnd || !isValidDate(weekStart) || !isValidDate(weekEnd)) {
      return res.status(400).json({ message: "Geçerli hafta başlangıç/bitiş tarihi gerekli" });
    }

    const userRole = user.role || "";
    const initialStatus = PLAN_APPROVE_ROLES.includes(userRole) ? "approved" : "draft";

    const planResult = await db.insert(weeklyProductionPlans).values({
      weekStart,
      weekEnd,
      status: initialStatus,
      createdBy: user.id,
      notes: notes || null,
      ...(initialStatus === "approved" ? { approvedBy: user.id, approvedAt: new Date() } : {}),
    }).returning();

    const plan = planResult[0];

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.productId || item.dayOfWeek == null || !item.plannedQuantity) continue;
        await db.insert(productionPlanItems).values({
          planId: plan.id,
          productId: item.productId,
          dayOfWeek: item.dayOfWeek,
          plannedQuantity: String(item.plannedQuantity),
          unit: item.unit || "adet",
          priority: item.priority || "normal",
          notes: item.notes || null,
        });
      }
    }

    res.json({ success: true, plan, status: initialStatus });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/CreatePlan]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Plan oluşturulamadı" });
  }
});

router.put("/api/production-planning/plans/:id", isAuthenticated, requireRole(PLAN_MANAGE_ROLES), async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) return res.status(400).json({ message: "Geçersiz plan ID" });

    const { notes, items } = req.body;

    const existing = await db.execute(sql.raw(`SELECT status FROM weekly_production_plans WHERE id = ${planId}`));
    if (!existing.rows?.length) return res.status(404).json({ message: "Plan bulunamadı" });
    if (existing.rows[0].status === "approved") {
      const user = req.user as AuthUser;
      if (!PLAN_APPROVE_ROLES.includes(user.role || "")) {
        return res.status(403).json({ message: "Onaylanmış planı sadece yetkili roller düzenleyebilir" });
      }
    }

    if (notes !== undefined) {
      await db.execute(sql.raw(`UPDATE weekly_production_plans SET notes = '${(notes || "").replace(/'/g, "''")}', updated_at = NOW() WHERE id = ${planId}`));
    }

    if (items && Array.isArray(items)) {
      await db.execute(sql.raw(`DELETE FROM production_plan_items WHERE plan_id = ${planId}`));
      for (const item of items) {
        if (!item.productId || item.dayOfWeek == null || !item.plannedQuantity) continue;
        await db.insert(productionPlanItems).values({
          planId,
          productId: item.productId,
          dayOfWeek: item.dayOfWeek,
          plannedQuantity: String(item.plannedQuantity),
          unit: item.unit || "adet",
          priority: item.priority || "normal",
          notes: item.notes || null,
        });
      }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/UpdatePlan]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Plan güncellenemedi" });
  }
});

router.post("/api/production-planning/plans/:id/approve", isAuthenticated, requireRole(PLAN_APPROVE_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) return res.status(400).json({ message: "Geçersiz plan ID" });

    await db.execute(sql.raw(`
      UPDATE weekly_production_plans
      SET status = 'approved', approved_by = '${user.id}', approved_at = NOW(), updated_at = NOW()
      WHERE id = ${planId}
    `));
    res.json({ success: true, message: "Plan onaylandı" });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Approve]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Onay başarısız" });
  }
});

router.post("/api/production-planning/plans/:id/suggest", isAuthenticated, requireRole(PLAN_MANAGE_ROLES), async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) return res.status(400).json({ message: "Geçersiz plan ID" });

    await db.execute(sql.raw(`
      UPDATE weekly_production_plans SET status = 'suggested', updated_at = NOW() WHERE id = ${planId}
    `));
    res.json({ success: true, message: "Plan öneri olarak gönderildi" });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Suggest]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Öneri başarısız" });
  }
});

router.post("/api/production-planning/plans/copy-last-week", isAuthenticated, requireRole(PLAN_MANAGE_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { targetWeekStart, targetWeekEnd } = req.body;
    if (!targetWeekStart || !targetWeekEnd || !isValidDate(targetWeekStart) || !isValidDate(targetWeekEnd)) {
      return res.status(400).json({ message: "Hedef hafta tarihleri gerekli" });
    }

    const lastPlan = await db.execute(sql.raw(`
      SELECT id FROM weekly_production_plans
      WHERE week_start < '${targetWeekStart}'
      ORDER BY week_start DESC LIMIT 1
    `));
    if (!lastPlan.rows?.length) return res.status(404).json({ message: "Kopyalanacak önceki plan bulunamadı" });

    const sourcePlanId = lastPlan.rows[0].id;
    const sourceItems = await db.execute(sql.raw(`
      SELECT product_id, day_of_week, planned_quantity, unit, priority, notes
      FROM production_plan_items WHERE plan_id = ${sourcePlanId}
    `));

    const userRole = user.role || "";
    const initialStatus = PLAN_APPROVE_ROLES.includes(userRole) ? "approved" : "draft";

    const newPlan = await db.insert(weeklyProductionPlans).values({
      weekStart: targetWeekStart,
      weekEnd: targetWeekEnd,
      status: initialStatus,
      createdBy: user.id,
      copiedFromId: sourcePlanId,
      notes: "Geçen haftadan kopyalandı",
      ...(initialStatus === "approved" ? { approvedBy: user.id, approvedAt: new Date() } : {}),
    }).returning();

    const newPlanId = newPlan[0].id;
    for (const item of (sourceItems.rows || [])) {
      await db.insert(productionPlanItems).values({
        planId: newPlanId,
        productId: item.product_id,
        dayOfWeek: item.day_of_week,
        plannedQuantity: String(item.planned_quantity),
        unit: item.unit,
        priority: item.priority || "normal",
        notes: item.notes,
      });
    }

    res.json({ success: true, plan: newPlan[0], copiedItemCount: sourceItems.rows?.length || 0 });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/CopyLastWeek]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Kopyalama başarısız" });
  }
});

router.post("/api/production-planning/records", isAuthenticated, requireRole(RECORD_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { planItemId, productId, recordDate, producedQuantity, wasteQuantity, wasteReason, unit, notes } = req.body;

    if (!productId || !recordDate || producedQuantity == null || !isValidDate(recordDate)) {
      return res.status(400).json({ message: "Ürün, tarih ve üretim miktarı gerekli" });
    }

    const record = await db.insert(dailyProductionRecords).values({
      planItemId: planItemId || null,
      productId,
      recordDate,
      producedQuantity: String(producedQuantity),
      wasteQuantity: wasteQuantity ? String(wasteQuantity) : "0",
      wasteReason: wasteReason || null,
      unit: unit || "adet",
      recordedBy: user.id,
      notes: notes || null,
    }).returning();

    res.json({ success: true, record: record[0] });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/CreateRecord]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Kayıt oluşturulamadı" });
  }
});

router.get("/api/production-planning/records", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    let where = "1=1";
    if (startDate && isValidDate(startDate as string)) where += ` AND r.record_date >= '${startDate}'`;
    if (endDate && isValidDate(endDate as string)) where += ` AND r.record_date <= '${endDate}'`;
    if (productId && !isNaN(Number(productId))) where += ` AND r.product_id = ${Number(productId)}`;

    const records = await db.execute(sql.raw(`
      SELECT r.*, fp.name as product_name, fp.category as product_category, fp.sku,
        u.first_name || ' ' || u.last_name as recorder_name
      FROM daily_production_records r
      JOIN factory_products fp ON fp.id = r.product_id
      LEFT JOIN users u ON u.id = r.recorded_by
      WHERE ${where}
      ORDER BY r.record_date DESC, fp.name
      LIMIT 500
    `));
    res.json(records.rows || []);
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Records]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Kayıtlar yüklenemedi" });
  }
});

router.get("/api/production-planning/comparison", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart || !isValidDate(weekStart as string)) {
      return res.status(400).json({ message: "weekStart gerekli (YYYY-MM-DD)" });
    }

    const weekEnd = new Date(new Date(weekStart as string).getTime() + 6 * 86400000).toISOString().split("T")[0];

    const planData = await db.execute(sql.raw(`
      SELECT pi.product_id, pi.day_of_week, pi.planned_quantity, pi.unit,
        fp.name as product_name, fp.category as product_category
      FROM production_plan_items pi
      JOIN weekly_production_plans p ON p.id = pi.plan_id
      JOIN factory_products fp ON fp.id = pi.product_id
      WHERE p.week_start = '${weekStart}'
      ORDER BY pi.day_of_week, fp.name
    `));

    const actualData = await db.execute(sql.raw(`
      SELECT r.product_id, EXTRACT(DOW FROM r.record_date::date) as day_of_week,
        SUM(r.produced_quantity::numeric) as total_produced,
        SUM(r.waste_quantity::numeric) as total_waste,
        fp.name as product_name, fp.category as product_category
      FROM daily_production_records r
      JOIN factory_products fp ON fp.id = r.product_id
      WHERE r.record_date >= '${weekStart}' AND r.record_date <= '${weekEnd}'
      GROUP BY r.product_id, EXTRACT(DOW FROM r.record_date::date), fp.name, fp.category
      ORDER BY fp.name
    `));

    const planned = (planData.rows || []).map((p: any) => ({
      productId: p.product_id,
      productName: p.product_name,
      category: p.product_category,
      dayOfWeek: p.day_of_week,
      planned: Number(p.planned_quantity),
      unit: p.unit,
    }));

    const actual = (actualData.rows || []).map((a: any) => ({
      productId: a.product_id,
      productName: a.product_name,
      category: a.product_category,
      dayOfWeek: Number(a.day_of_week),
      produced: Number(a.total_produced),
      waste: Number(a.total_waste),
    }));

    const productSummary: Record<number, any> = {};
    for (const p of planned) {
      if (!productSummary[p.productId]) {
        productSummary[p.productId] = { productId: p.productId, name: p.productName, category: p.category, unit: p.unit, totalPlanned: 0, totalProduced: 0, totalWaste: 0 };
      }
      productSummary[p.productId].totalPlanned += p.planned;
    }
    for (const a of actual) {
      if (!productSummary[a.productId]) {
        productSummary[a.productId] = { productId: a.productId, name: a.productName, category: a.category, unit: "adet", totalPlanned: 0, totalProduced: 0, totalWaste: 0 };
      }
      productSummary[a.productId].totalProduced += a.produced;
      productSummary[a.productId].totalWaste += a.waste;
    }

    const summary = Object.values(productSummary).map((s: any) => ({
      ...s,
      completionRate: s.totalPlanned > 0 ? Math.round((s.totalProduced / s.totalPlanned) * 100) : null,
    }));

    res.json({ weekStart, weekEnd, planned, actual, summary });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Comparison]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Karşılaştırma verisi alınamadı" });
  }
});

router.get("/api/production-planning/reports", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const { type, startDate, endDate, productId } = req.query;
    const sd = startDate && isValidDate(startDate as string) ? startDate as string : new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const ed = endDate && isValidDate(endDate as string) ? endDate as string : new Date().toISOString().split("T")[0];

    if (type === "product" && productId && !isNaN(Number(productId))) {
      const data = await db.execute(sql.raw(`
        SELECT r.record_date, SUM(r.produced_quantity::numeric) as produced,
          SUM(r.waste_quantity::numeric) as waste
        FROM daily_production_records r
        WHERE r.product_id = ${Number(productId)} AND r.record_date >= '${sd}' AND r.record_date <= '${ed}'
        GROUP BY r.record_date ORDER BY r.record_date
      `));
      return res.json({ type: "product", data: data.rows || [] });
    }

    if (type === "weekly") {
      const data = await db.execute(sql.raw(`
        SELECT DATE_TRUNC('week', r.record_date::date) as week,
          SUM(r.produced_quantity::numeric) as total_produced,
          SUM(r.waste_quantity::numeric) as total_waste,
          COUNT(DISTINCT r.product_id) as product_count
        FROM daily_production_records r
        WHERE r.record_date >= '${sd}' AND r.record_date <= '${ed}'
        GROUP BY DATE_TRUNC('week', r.record_date::date)
        ORDER BY week DESC
      `));
      return res.json({ type: "weekly", data: data.rows || [] });
    }

    const data = await db.execute(sql.raw(`
      SELECT DATE_TRUNC('month', r.record_date::date) as month,
        SUM(r.produced_quantity::numeric) as total_produced,
        SUM(r.waste_quantity::numeric) as total_waste,
        COUNT(DISTINCT r.product_id) as product_count,
        COUNT(*) as record_count
      FROM daily_production_records r
      WHERE r.record_date >= '${sd}' AND r.record_date <= '${ed}'
      GROUP BY DATE_TRUNC('month', r.record_date::date)
      ORDER BY month DESC
    `));
    res.json({ type: "monthly", data: data.rows || [] });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Reports]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Rapor verisi alınamadı" });
  }
});

router.get("/api/production-planning/responsibilities", isAuthenticated, requireRole(PLAN_VIEW_ROLES), async (req, res) => {
  try {
    const data = await db.execute(sql.raw(`
      SELECT pr.*, fp.name as product_name, fp.category as product_category, fp.sku,
        u.first_name || ' ' || u.last_name as user_name, u.role as user_role
      FROM production_responsibilities pr
      JOIN factory_products fp ON fp.id = pr.product_id
      LEFT JOIN users u ON u.id = pr.user_id
      ORDER BY fp.category, fp.name
    `));
    res.json(data.rows || []);
  } catch (err: unknown) {
    console.error("[ProductionPlanning/Responsibilities]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Sorumluluklar yüklenemedi" });
  }
});

router.post("/api/production-planning/responsibilities", isAuthenticated, requireRole(PLAN_APPROVE_ROLES), async (req, res) => {
  try {
    const { userId, productId, role, isPrimary, notes } = req.body;
    if (!userId || !productId) return res.status(400).json({ message: "userId ve productId gerekli" });

    const result = await db.insert(productionResponsibilities).values({
      userId,
      productId,
      role: role || "uretim_sefi",
      isPrimary: isPrimary !== false,
      notes: notes || null,
    }).returning();

    res.json({ success: true, responsibility: result[0] });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/CreateResp]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Sorumluluk atanamadı" });
  }
});

router.delete("/api/production-planning/responsibilities/:id", isAuthenticated, requireRole(PLAN_APPROVE_ROLES), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    await db.execute(sql.raw(`DELETE FROM production_responsibilities WHERE id = ${id}`));
    res.json({ success: true });
  } catch (err: unknown) {
    console.error("[ProductionPlanning/DeleteResp]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Sorumluluk silinemedi" });
  }
});

export default router;
