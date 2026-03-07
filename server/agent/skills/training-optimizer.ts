import { db } from "../../db";
import { trainingAssignments, trainingMaterials, users } from "@shared/schema";
import { eq, and, gte, sql, count, avg } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const trainingOptimizerSkill: AgentSkill = {
  id: "training_optimizer",
  name: "Egitim Optimizasyoncusu",
  description: "Egitim tamamlama oranları ve modül performansı analizi",
  targetRoles: ["trainer", "coach"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: ["trainingAssignments", "trainingMaterials"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const totalAssigned = await db
        .select({ cnt: count() })
        .from(trainingAssignments)
        .where(gte(trainingAssignments.createdAt, thirtyDaysAgo));

      const totalCompleted = await db
        .select({ cnt: count() })
        .from(trainingAssignments)
        .where(
          and(
            gte(trainingAssignments.createdAt, thirtyDaysAgo),
            eq(trainingAssignments.status, "completed")
          )
        );

      const assigned = totalAssigned[0]?.cnt || 0;
      const completed = totalCompleted[0]?.cnt || 0;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      if (assigned > 0) {
        insights.push({
          type: "overall_completion_rate",
          severity: rate >= 80 ? "positive" : rate >= 50 ? "info" : "warning",
          message: `Son 30 gun egitim tamamlama orani: %${rate} (${completed}/${assigned})`,
          data: { assigned, completed, rate },
          requiresAI: rate < 60,
        });
      }
    } catch {}

    try {
      const moduleStats = await db
        .select({
          materialId: trainingAssignments.materialId,
          title: trainingMaterials.title,
          total: count(),
          completedCount: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'completed' THEN 1 ELSE 0 END)`,
        })
        .from(trainingAssignments)
        .innerJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .groupBy(trainingAssignments.materialId, trainingMaterials.title)
        .limit(20);

      const lowCompletionModules = moduleStats
        .filter((m) => {
          const total = Number(m.total);
          const comp = Number(m.completedCount || 0);
          return total >= 3 && (comp / total) < 0.4;
        })
        .slice(0, 3);

      if (lowCompletionModules.length > 0) {
        const names = lowCompletionModules.map((m) => m.title).join(", ");
        insights.push({
          type: "low_completion_modules",
          severity: "warning",
          message: `Dusuk tamamlama oranli moduller: ${names}`,
          data: { modules: lowCompletionModules },
          requiresAI: true,
        });
      }

      const highCompletionModules = moduleStats
        .filter((m) => {
          const total = Number(m.total);
          const comp = Number(m.completedCount || 0);
          return total >= 5 && (comp / total) >= 0.9;
        })
        .slice(0, 3);

      if (highCompletionModules.length > 0) {
        const names = highCompletionModules.map((m) => m.title).join(", ");
        insights.push({
          type: "high_completion_modules",
          severity: "positive",
          message: `Yuksek tamamlama oranli moduller: ${names}`,
          data: { modules: highCompletionModules },
          requiresAI: false,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      actions.push({
        actionType: "report",
        targetUserId: context.userId,
        title: insight.type === "overall_completion_rate" ? "Egitim ozeti" : insight.type === "low_completion_modules" ? "Modul iyilestirme onerisi" : "Egitim basarisi",
        description: (insight as any).aiMessage || insight.message,
        deepLink: "/hq-dashboard/academy",
        severity: insight.severity === "warning" ? "med" : "low",
      });
    }

    return actions;
  },
};

registerSkill(trainingOptimizerSkill);
export default trainingOptimizerSkill;
