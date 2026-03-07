import { db } from "../../db";
import { productionBatches, factoryProducts } from "@shared/schema";
import { eq, and, gte, sql, count, avg } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const productionDirectorSkill: AgentSkill = {
  id: "production_director",
  name: "Uretim Direktoru",
  description: "Fabrika uretim ilerleme ve verimlilik takibi",
  targetRoles: ["fabrika_mudur", "fabrika_operator"],
  schedule: "hourly",
  autonomyLevel: "info_only",
  dataSources: ["productionBatches", "factoryProducts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const todayBatches = await db
        .select({
          status: productionBatches.status,
          quantity: productionBatches.quantity,
          qualityScore: productionBatches.qualityScore,
        })
        .from(productionBatches)
        .where(gte(productionBatches.createdAt, todayStart))
        .limit(50);

      const completed = todayBatches.filter((b) => b.status === "completed" || b.status === "approved");
      const inProgress = todayBatches.filter((b) => b.status === "in_progress");
      const rejected = todayBatches.filter((b) => b.status === "rejected");
      const total = todayBatches.length;

      if (total > 0) {
        insights.push({
          type: "production_progress",
          severity: "info",
          message: `Bugun ${total} batch: ${completed.length} tamamlandi, ${inProgress.length} devam ediyor`,
          data: { total, completed: completed.length, inProgress: inProgress.length },
          requiresAI: false,
        });
      }

      if (rejected.length > 0) {
        insights.push({
          type: "rejected_batches",
          severity: "warning",
          message: `${rejected.length} batch reddedildi — kalite kontrolu gozden gecirin`,
          data: { rejectedCount: rejected.length },
          requiresAI: true,
        });
      }
    } catch {}

    try {
      const lowRawMaterials = await db
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
        .limit(5);

      if (lowRawMaterials.length > 0) {
        insights.push({
          type: "raw_material_monitored",
          severity: "info",
          message: `${lowRawMaterials.length} hammadde minimum stok limiti tanimli — stok durumu kontrol edilmeli`,
          data: { items: lowRawMaterials.map((r) => ({ name: r.name, minStock: r.minStock })) },
          requiresAI: false,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "rejected_batches") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "Reddedilen batch'ler",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "med",
        });
      }

      if (insight.type === "raw_material_monitored") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Hammadde takibi",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "low",
        });
      }

      if (insight.type === "production_progress") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Uretim durumu",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "low",
        });
      }
    }

    return actions;
  },
};

registerSkill(productionDirectorSkill);
export default productionDirectorSkill;
