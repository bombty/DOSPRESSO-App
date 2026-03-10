import { db } from "../../db";
import { branchStockMovements, branchInventory, branches } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const stockPredictorSkill: AgentSkill = {
  id: "stock_predictor",
  name: "Stok Tahmin",
  description: "Şube bazında son 30 günlük tüketim verilerini analiz ederek stok tükenme tahmini yapar",
  targetRoles: ["supervisor", "satinalma"],
  schedule: "weekly",
  autonomyLevel: "suggest_approve",
  dataSources: ["branchStockMovements", "branchInventory", "branches"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const activeBranches = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.isActive, true));

      if (activeBranches.length === 0) return insights;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const branchList = context.branchId
        ? activeBranches.filter((b) => b.id === context.branchId)
        : activeBranches;

      for (const branch of branchList) {
        try {
          const movements = await db
            .select({
              productId: branchStockMovements.productId,
              totalConsumed: sql<string>`COALESCE(SUM(ABS(${branchStockMovements.quantity}::numeric)), 0)`,
            })
            .from(branchStockMovements)
            .where(
              and(
                eq(branchStockMovements.branchId, branch.id),
                gte(branchStockMovements.createdAt, thirtyDaysAgo),
                eq(branchStockMovements.movementType, "consumption")
              )
            )
            .groupBy(branchStockMovements.productId);

          if (movements.length === 0) continue;

          const inventory = await db
            .select({
              productId: branchInventory.productId,
              currentStock: branchInventory.currentStock,
              unit: branchInventory.unit,
            })
            .from(branchInventory)
            .where(eq(branchInventory.branchId, branch.id));

          const stockMap = new Map(
            inventory.map((i) => [i.productId, { currentStock: parseFloat(i.currentStock || "0"), unit: i.unit }])
          );

          const criticalProducts: { productId: number; daysLeft: number; avgDaily: number; currentStock: number; unit: string | null }[] = [];

          for (const mov of movements) {
            const totalConsumed = parseFloat(mov.totalConsumed || "0");
            if (totalConsumed <= 0) continue;

            const avgDaily = totalConsumed / 30;
            const stockInfo = stockMap.get(mov.productId);
            if (!stockInfo || stockInfo.currentStock <= 0) continue;

            const daysLeft = stockInfo.currentStock / avgDaily;
            if (daysLeft < 5) {
              criticalProducts.push({
                productId: mov.productId,
                daysLeft: Math.round(daysLeft * 10) / 10,
                avgDaily: Math.round(avgDaily * 100) / 100,
                currentStock: stockInfo.currentStock,
                unit: stockInfo.unit,
              });
            }
          }

          if (criticalProducts.length > 0) {
            insights.push({
              type: "stock_depletion_forecast",
              severity: criticalProducts.some((p) => p.daysLeft < 2) ? "critical" : "warning",
              message: `${branch.name}: ${criticalProducts.length} ürün 5 gün içinde tükenebilir`,
              data: {
                branchId: branch.id,
                branchName: branch.name,
                products: criticalProducts,
              },
              requiresAI: false,
            });
          }
        } catch (err) {
          console.log(`[StockPredictor] Branch ${branch.id} analysis error:`, err);
        }
      }
    } catch (err) {
      console.log("[StockPredictor] Could not query stock data — tables may not exist yet:", err);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "stock_depletion_forecast") {
        const branchId = insight.data.branchId;
        const branchName = insight.data.branchName || "";
        const productCount = insight.data.products?.length || 0;

        actions.push({
          actionType: "suggest_task",
          targetUserId: context.userId,
          branchId,
          title: `Stok Tahmini Uyarısı — ${branchName}`,
          description: `${branchName} şubesinde ${productCount} ürün mevcut tüketim hızıyla 5 gün içinde tükenebilir. Sipariş planlaması önerilir.`,
          deepLink: `/sube/${branchId}`,
          severity: insight.severity === "critical" ? "high" : "med",
          category: "operations/stock_prediction",
          metadata: {
            branchId,
            branchName,
            productCount,
            products: insight.data.products,
            insightType: "stock_depletion_forecast",
          },
        });
      }
    }

    return actions;
  },
};

registerSkill(stockPredictorSkill);
export default stockPredictorSkill;
