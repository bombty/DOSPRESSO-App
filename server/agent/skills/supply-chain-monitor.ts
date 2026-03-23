import { db } from "../../db";
import { branchInventory, factoryProducts, users, branches } from "@shared/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const supplyChainMonitorSkill: AgentSkill = {
  id: "supply_chain_monitor",
  name: "Tedarik Zinciri İzleyici",
  description: "Kritik stok uyarısı ve üretim-sevkiyat zinciri bildirimi",
  targetRoles: ["fabrika_mudur", "satinalma", "mudur", "admin"],
  schedule: "daily",
  autonomyLevel: "suggest_approve",
  dataSources: ["branchInventory", "factoryProducts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const criticalItems = await db
        .select({
          branchId: branchInventory.branchId,
          productId: branchInventory.productId,
          currentStock: branchInventory.currentStock,
          minimumStock: branchInventory.minimumStock,
          unit: branchInventory.unit,
        })
        .from(branchInventory)
        .where(sql`${branchInventory.currentStock} < ${branchInventory.minimumStock}`)
        .limit(50);

      if (criticalItems.length === 0) {
        return insights;
      }

      const branchMap = new Map<number, { items: typeof criticalItems; branchName: string }>();

      for (const item of criticalItems) {
        if (!item.branchId) continue;
        if (!branchMap.has(item.branchId)) {
          const [branch] = await db
            .select({ name: branches.name })
            .from(branches)
            .where(eq(branches.id, item.branchId))
            .limit(1);
          branchMap.set(item.branchId, { items: [], branchName: branch?.name || `Şube #${item.branchId}` });
        }
        branchMap.get(item.branchId)!.items.push(item);
      }

      for (const [brId, data] of branchMap) {
        insights.push({
          type: "branch_critical_stock",
          severity: data.items.length >= 5 ? "critical" : "warning",
          message: `${data.branchName}: ${data.items.length} üründe stok kritik seviyede`,
          data: {
            branchId: brId,
            branchName: data.branchName,
            itemCount: data.items.length,
            items: data.items.slice(0, 10),
          },
          requiresAI: false,
        });
      }

      if (criticalItems.length >= 10) {
        insights.push({
          type: "system_wide_stock_alert",
          severity: "critical",
          message: `Sistem genelinde ${criticalItems.length} üründe stok kritik — üretim planı güncellenmeli`,
          data: {
            totalCritical: criticalItems.length,
            branchCount: branchMap.size,
          },
          requiresAI: true,
        });
      }
    } catch (error) {
      console.error("[supply-chain-monitor] Error:", error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "branch_critical_stock") {
        actions.push({
          actionType: "warning",
          targetRoleScope: "mudur,supervisor",
          branchId: insight.data.branchId,
          title: `Stok kritik: ${insight.data.branchName}`,
          description: `${insight.data.branchName}'da ${insight.data.itemCount} üründe stok minimum seviyenin altında.`,
          deepLink: "/stok",
          severity: insight.data.itemCount >= 5 ? "high" : "med",
          metadata: insight.data,
          skillId: "supply_chain_monitor",
          category: "operations",
          subcategory: "critical_stock",
        });
      }

      if (insight.type === "system_wide_stock_alert") {
        actions.push({
          actionType: "alert",
          targetRoleScope: "fabrika_mudur,satinalma",
          title: `${insight.data.totalCritical} üründe stok kritik — üretim planı güncellenmeli`,
          description: `${insight.data.branchCount} şubede toplam ${insight.data.totalCritical} üründe stok minimum seviyenin altında. Fabrika üretim planı ve sevkiyat güncellenmeli.`,
          deepLink: "/fabrika",
          severity: "high",
          metadata: insight.data,
          skillId: "supply_chain_monitor",
          category: "operations",
          subcategory: "system_stock_alert",
        });
      }
    }

    return actions;
  },
};

export async function notifyProductionComplete(productName: string, quantity: number, unit: string, producedBy: string, stationName?: string): Promise<void> {
  try {
    const { storage } = await import("../../storage");

    const fabrikaMudurler = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, "fabrika_mudur"),
          eq(users.isActive, true)
        )
      );

    for (const fm of fabrikaMudurler) {
      await storage.createNotification({
        userId: fm.id,
        type: "production_complete",
        title: `Üretim kaydı: ${productName || "Ürün"}`,
        message: `${quantity} ${unit} ${productName || "ürün"} üretildi${stationName ? ` (${stationName})` : ""}. Sevkiyat planlanabilir.`,
        link: "/fabrika/uretim",
      });
    }
  } catch (error) {
    console.error("[supply-chain-monitor] Production notification error:", error);
  }
}

registerSkill(supplyChainMonitorSkill);
