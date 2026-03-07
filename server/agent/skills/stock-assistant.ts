import { db } from "../../db";
import { branchInventory, factoryProducts, users, branches } from "@shared/schema";
import { eq, and, lt, lte, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const stockAssistantSkill: AgentSkill = {
  id: "stock_assistant",
  name: "Stok Asistani",
  description: "Sube ve fabrika stok durumunu izler, eksik stok uyarisi verir",
  targetRoles: ["supervisor", "mudur", "satinalma"],
  schedule: "daily",
  autonomyLevel: "suggest_approve",
  dataSources: ["branchInventory", "factoryProducts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    if (context.branchId) {
      try {
        const lowStock = await db
          .select({
            productId: branchInventory.productId,
            currentStock: branchInventory.currentStock,
            minimumStock: branchInventory.minimumStock,
            unit: branchInventory.unit,
          })
          .from(branchInventory)
          .where(
            and(
              eq(branchInventory.branchId, context.branchId),
              sql`${branchInventory.currentStock} < ${branchInventory.minimumStock}`
            )
          )
          .limit(10);

        if (lowStock.length > 0) {
          insights.push({
            type: "branch_low_stock",
            severity: lowStock.length >= 5 ? "critical" : "warning",
            message: `${lowStock.length} urun minimum stok altinda`,
            data: { items: lowStock },
            requiresAI: false,
          });
        }
      } catch {}
    }

    if (context.role === "satinalma") {
      try {
        const factoryItems = await db
          .select({
            id: factoryProducts.id,
            name: factoryProducts.name,
            minStock: factoryProducts.minStock,
          })
          .from(factoryProducts)
          .where(
            and(
              eq(factoryProducts.isActive, true),
              eq(factoryProducts.productType, "hammadde"),
              sql`${factoryProducts.minStock} > 0`
            )
          )
          .limit(10);

        if (factoryItems.length > 0) {
          insights.push({
            type: "factory_materials_monitored",
            severity: "info",
            message: `Fabrikada ${factoryItems.length} hammadde minimum stok limiti tanimli — stok takibi onerilir`,
            data: { items: factoryItems.map((f) => ({ id: f.id, name: f.name, minStock: f.minStock })) },
            requiresAI: false,
          });
        }
      } catch {}
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "branch_low_stock") {
        actions.push({
          actionType: "suggest_task",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "Stok siparisi gerekli",
          description: insight.message,
          deepLink: "/sube/siparis-stok",
          severity: insight.severity === "critical" ? "high" : "med",
        });
      }

      if (insight.type === "factory_materials_monitored") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Fabrika hammadde takibi",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "low",
        });
      }

    }

    return actions;
  },
};

registerSkill(stockAssistantSkill);
export default stockAssistantSkill;
