import { db } from "../../db";
import { purchaseOrders, suppliers } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const supplierTrackerSkill: AgentSkill = {
  id: "supplier_tracker",
  name: "Tedarikçi Güvenilirlik",
  description: "Tedarikçi performansını analiz eder, zamanında teslimat ve sipariş tamamlama oranlarını hesaplar",
  targetRoles: ["satinalma", "cgo"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: ["purchaseOrders", "suppliers"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const orderData = await db
        .select({
          supplierId: purchaseOrders.supplierId,
          supplierName: suppliers.name,
          totalOrders: sql<number>`COUNT(*)::int`,
          deliveredOrders: sql<number>`COUNT(*) FILTER (WHERE ${purchaseOrders.status} IN ('teslim_edildi', 'tamamlandi', 'delivered', 'completed'))::int`,
          onTimeOrders: sql<number>`COUNT(*) FILTER (WHERE ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.expectedDeliveryDate} IS NOT NULL AND ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate})::int`,
          lateOrders: sql<number>`COUNT(*) FILTER (WHERE ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.expectedDeliveryDate} IS NOT NULL AND ${purchaseOrders.actualDeliveryDate} > ${purchaseOrders.expectedDeliveryDate})::int`,
        })
        .from(purchaseOrders)
        .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(gte(purchaseOrders.orderDate, thirtyDaysAgo))
        .groupBy(purchaseOrders.supplierId, suppliers.name);

      const unreliableSuppliers: Array<{
        supplierId: number;
        supplierName: string;
        totalOrders: number;
        onTimeRate: number;
        completionRate: number;
      }> = [];

      for (const row of orderData) {
        if (row.totalOrders === 0) continue;
        const deliveredCount = row.deliveredOrders + row.onTimeOrders + row.lateOrders;
        const relevantCount = Math.max(deliveredCount, 1);
        const onTimeRate = relevantCount > 0 ? (row.onTimeOrders / relevantCount) * 100 : 100;
        const completionRate = (row.deliveredOrders / row.totalOrders) * 100;

        if (onTimeRate < 80) {
          unreliableSuppliers.push({
            supplierId: row.supplierId,
            supplierName: row.supplierName,
            totalOrders: row.totalOrders,
            onTimeRate: Math.round(onTimeRate * 100) / 100,
            completionRate: Math.round(completionRate * 100) / 100,
          });
        }
      }

      if (unreliableSuppliers.length > 0) {
        insights.push({
          type: "unreliable_suppliers",
          severity: unreliableSuppliers.some((s) => s.onTimeRate < 50) ? "critical" : "warning",
          message: `${unreliableSuppliers.length} tedarikçinin zamanında teslimat oranı %80'in altında`,
          data: { suppliers: unreliableSuppliers },
          requiresAI: true,
        });
      }

      if (orderData.length > 0 && unreliableSuppliers.length === 0) {
        insights.push({
          type: "suppliers_reliable",
          severity: "positive",
          message: "Tüm tedarikçiler zamanında teslimat kriterlerini karşılıyor",
          data: { supplierCount: orderData.length },
          requiresAI: false,
        });
      }
    } catch {
      return [];
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "unreliable_suppliers") {
        const supps = insight.data.suppliers || [];
        const names = supps.map((s: any) => `${s.supplierName} (%${s.onTimeRate})`).join(", ");

        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Tedarikçi Güvenilirlik Uyarısı",
          description: `${supps.length} tedarikçi zamanında teslimat hedefinin altında: ${names}`,
          deepLink: "/satinalma/tedarikci-yonetimi",
          severity: insight.severity === "critical" ? "high" : "med",
          category: "procurement",
          subcategory: "supplier_reliability",
          metadata: {
            supplierCount: supps.length,
            suppliers: supps,
            insightType: "unreliable_suppliers",
          },
        });
      }

      if (insight.type === "suppliers_reliable") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Tedarikçi Performansı - Normal",
          description: insight.message,
          severity: "low",
          category: "procurement",
          subcategory: "supplier_ok",
          metadata: { insightType: "suppliers_reliable" },
        });
      }
    }

    return actions;
  },
};

registerSkill(supplierTrackerSkill);
export default supplierTrackerSkill;
