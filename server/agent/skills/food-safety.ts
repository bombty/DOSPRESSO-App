import { db } from "../../db";
import { productionBatches } from "@shared/schema";
import { eq, and, lte, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const foodSafetySkill: AgentSkill = {
  id: "food_safety",
  name: "Gida Guvenligi Nobetcisi",
  description: "Kalite kontrol, SKT takibi ve HACCP izleme",
  targetRoles: ["gida_muhendisi", "fabrika_mudur"],
  schedule: "hourly",
  autonomyLevel: "info_only",
  dataSources: ["productionBatches"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const pendingQC = await db
        .select({ cnt: count() })
        .from(productionBatches)
        .where(eq(productionBatches.status, "quality_check"));

      if ((pendingQC[0]?.cnt || 0) > 0) {
        insights.push({
          type: "pending_quality_check",
          severity: (pendingQC[0]?.cnt || 0) >= 5 ? "critical" : "warning",
          message: `${pendingQC[0]?.cnt} lot kalite onay bekliyor`,
          data: { count: pendingQC[0]?.cnt },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysStr = threeDaysLater.toISOString().slice(0, 10);

      const expiringLots = await db
        .select({ cnt: count() })
        .from(productionBatches)
        .where(
          and(
            sql`${productionBatches.expiryDate} IS NOT NULL`,
            lte(productionBatches.expiryDate, threeDaysStr),
            sql`${productionBatches.expiryDate} >= CURRENT_DATE`,
            sql`${productionBatches.status} NOT IN ('rejected', 'cancelled')`
          )
        );

      if ((expiringLots[0]?.cnt || 0) > 0) {
        insights.push({
          type: "skt_expiring_soon",
          severity: "warning",
          message: `${expiringLots[0]?.cnt} lot'un SKT'si 3 gun icinde doluyor`,
          data: { count: expiringLots[0]?.cnt },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const expiredLots = await db
        .select({ cnt: count() })
        .from(productionBatches)
        .where(
          and(
            sql`${productionBatches.expiryDate} IS NOT NULL`,
            sql`${productionBatches.expiryDate} < CURRENT_DATE`,
            sql`${productionBatches.status} NOT IN ('rejected', 'cancelled')`
          )
        );

      if ((expiredLots[0]?.cnt || 0) > 0) {
        insights.push({
          type: "skt_expired_in_stock",
          severity: "critical",
          message: `ACIL: ${expiredLots[0]?.cnt} lot'un SKT'si gecmis!`,
          data: { count: expiredLots[0]?.cnt },
          requiresAI: false,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "pending_quality_check") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "Kalite kontrol bekliyor",
          description: insight.message,
          deepLink: "/fabrika/kalite",
          severity: insight.severity === "critical" ? "high" : "med",
        });
      }

      if (insight.type === "skt_expiring_soon") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "SKT uyarisi",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "med",
        });
      }

      if (insight.type === "skt_expired_in_stock") {
        actions.push({
          actionType: "escalate",
          targetUserId: context.userId,
          title: "ACIL: SKT gecmis lot",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "critical",
        });
      }
    }

    return actions;
  },
};

registerSkill(foodSafetySkill);
export default foodSafetySkill;
