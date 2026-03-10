import { db } from "../../db";
import { productionCostTracking, factoryProducts } from "@shared/schema";
import { eq, and, gte, lt, sql, desc } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const costAnalyzerSkill: AgentSkill = {
  id: "cost_analyzer",
  name: "Maliyet Analizi",
  description: "Aylık birim maliyet değişimlerini karşılaştırır, en yüksek maliyet artışı olan ürünleri tespit eder",
  targetRoles: ["cgo", "muhasebe_ik"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: ["productionCostTracking", "factoryProducts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = thisMonthStart;

      const currentMonthCosts = await db
        .select({
          productId: productionCostTracking.productId,
          productName: factoryProducts.name,
          avgUnitCost: sql<string>`ROUND(AVG(CAST(${productionCostTracking.totalCostPerUnit} AS numeric)), 4)`,
          totalCost: sql<string>`ROUND(SUM(CAST(${productionCostTracking.totalProductionCost} AS numeric)), 2)`,
          totalQuantity: sql<number>`SUM(${productionCostTracking.quantity})::int`,
        })
        .from(productionCostTracking)
        .innerJoin(factoryProducts, eq(productionCostTracking.productId, factoryProducts.id))
        .where(gte(productionCostTracking.productionDate, thisMonthStart))
        .groupBy(productionCostTracking.productId, factoryProducts.name);

      const prevMonthCosts = await db
        .select({
          productId: productionCostTracking.productId,
          avgUnitCost: sql<string>`ROUND(AVG(CAST(${productionCostTracking.totalCostPerUnit} AS numeric)), 4)`,
          totalCost: sql<string>`ROUND(SUM(CAST(${productionCostTracking.totalProductionCost} AS numeric)), 2)`,
        })
        .from(productionCostTracking)
        .where(
          and(
            gte(productionCostTracking.productionDate, lastMonthStart),
            lt(productionCostTracking.productionDate, lastMonthEnd)
          )
        )
        .groupBy(productionCostTracking.productId);

      const prevMap = new Map<number, { avgUnitCost: number; totalCost: number }>();
      for (const row of prevMonthCosts) {
        prevMap.set(row.productId, {
          avgUnitCost: parseFloat(row.avgUnitCost) || 0,
          totalCost: parseFloat(row.totalCost) || 0,
        });
      }

      const costChanges: Array<{
        productId: number;
        productName: string;
        currentUnitCost: number;
        prevUnitCost: number;
        changePercent: number;
        totalCost: number;
      }> = [];

      for (const row of currentMonthCosts) {
        const currentCost = parseFloat(row.avgUnitCost) || 0;
        const prev = prevMap.get(row.productId);
        const prevCost = prev?.avgUnitCost || 0;

        if (prevCost > 0 && currentCost > 0) {
          const changePercent = ((currentCost - prevCost) / prevCost) * 100;
          costChanges.push({
            productId: row.productId,
            productName: row.productName || `Ürün #${row.productId}`,
            currentUnitCost: Math.round(currentCost * 100) / 100,
            prevUnitCost: Math.round(prevCost * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            totalCost: parseFloat(row.totalCost) || 0,
          });
        }
      }

      costChanges.sort((a, b) => b.changePercent - a.changePercent);
      const topDrivers = costChanges.slice(0, 3);

      if (topDrivers.length > 0 && topDrivers.some((d) => d.changePercent > 5)) {
        insights.push({
          type: "cost_increase",
          severity: topDrivers.some((d) => d.changePercent > 20) ? "critical" : "warning",
          message: `En yüksek maliyet artışı: ${topDrivers[0].productName} (%${topDrivers[0].changePercent})`,
          data: { topDrivers, totalProducts: costChanges.length },
          requiresAI: true,
        });
      }

      const decreases = costChanges.filter((c) => c.changePercent < -5);
      if (decreases.length > 0) {
        insights.push({
          type: "cost_decrease",
          severity: "positive",
          message: `${decreases.length} üründe maliyet düşüşü tespit edildi`,
          data: { products: decreases.slice(0, 3) },
          requiresAI: false,
        });
      }

      if (costChanges.length === 0 && currentMonthCosts.length > 0) {
        insights.push({
          type: "cost_stable",
          severity: "info",
          message: "Birim maliyetlerde önemli bir değişim yok",
          data: { productCount: currentMonthCosts.length },
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
      if (insight.type === "cost_increase") {
        const drivers = insight.data.topDrivers || [];
        const driverList = drivers.map((d: any) => `${d.productName} (+%${d.changePercent})`).join(", ");

        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Maliyet Artışı Uyarısı",
          description: `Top 3 maliyet artışı: ${driverList}`,
          deepLink: "/maliyet-yonetimi",
          severity: insight.severity === "critical" ? "high" : "med",
          category: "finance",
          subcategory: "cost_increase",
          metadata: {
            topDrivers: drivers,
            insightType: "cost_increase",
          },
        });
      }

      if (insight.type === "cost_decrease") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Maliyet Düşüşü",
          description: insight.message,
          deepLink: "/maliyet-yonetimi",
          severity: "low",
          category: "finance",
          subcategory: "cost_decrease",
          metadata: { insightType: "cost_decrease" },
        });
      }
    }

    return actions;
  },
};

registerSkill(costAnalyzerSkill);
export default costAnalyzerSkill;
