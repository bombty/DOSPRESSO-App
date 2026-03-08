import { db } from "../../db";
import { branchInventory, factoryProducts, users, branches } from "@shared/schema";
import { eq, and, lt, lte, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

async function getBranchName(branchId?: number): Promise<string> {
  if (!branchId) return "";
  try {
    const [b] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
    return b?.name || "";
  } catch { return ""; }
}

const stockAssistantSkill: AgentSkill = {
  id: "stock_assistant",
  name: "Stok Asistanı",
  description: "Şube ve fabrika stok durumunu izler, eksik stok uyarısı verir",
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
          const branchName = await getBranchName(context.branchId);
          insights.push({
            type: "branch_low_stock",
            severity: lowStock.length >= 5 ? "critical" : "warning",
            message: `${lowStock.length} ürün minimum stok altında`,
            data: { items: lowStock, branchName, branchId: context.branchId },
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
            message: `Fabrikada ${factoryItems.length} hammadde minimum stok limiti tanımlı — stok takibi önerilir`,
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
        const branchName = insight.data.branchName || "";
        const branchSuffix = branchName ? ` (${branchName})` : "";
        actions.push({
          actionType: "suggest_task",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: `Stok Siparişi Gerekli${branchSuffix}: ${insight.data.items?.length} ürün`,
          description: `${insight.data.items?.length} ürün minimum stok seviyesinin altında. Sipariş oluşturulması önerilir.`,
          deepLink: "/sube/siparis-stok",
          severity: insight.severity === "critical" ? "high" : "med",
          metadata: {
            branchId: context.branchId,
            branchName,
            itemCount: insight.data.items?.length,
            insightType: "branch_low_stock",
          },
        });
      }

      if (insight.type === "factory_materials_monitored") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Fabrika Hammadde Takibi",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "low",
          metadata: { insightType: "factory_materials_monitored" },
        });
      }

    }

    return actions;
  },
};

registerSkill(stockAssistantSkill);
export default stockAssistantSkill;
