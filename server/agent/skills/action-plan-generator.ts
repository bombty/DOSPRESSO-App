/**
 * Otomatik Aksiyon Planı Skill
 * Şube için çok boyutlu sorun tespitinde tek tıkla uygulanabilir plan üretir.
 * Coach/Trainer onayı ile şube müdürüne gönderilir.
 */
import { db } from "../../db";
import { branches, agentPendingActions } from "@shared/schema";
import { eq, and, notInArray, desc } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const actionPlanGeneratorSkill: AgentSkill = {
  id: "action_plan_generator",
  name: "Aksiyon Planı Üreticisi",
  description: "Şubedeki çok boyutlu sorunları analiz ederek Coach/Trainer için tek onaylı aksiyon paketi hazırlar",
  targetRoles: ["coach", "trainer", "cgo", "admin", "ceo"],
  schedule: "weekly",
  autonomyLevel: "suggest",
  dataSources: ["agentPendingActions", "branches"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      // Şube bazında bekleyen aksiyonları grupla
      const pending = await db.select({
        id: agentPendingActions.id,
        title: agentPendingActions.title,
        description: agentPendingActions.description,
        branchId: agentPendingActions.branchId,
        severity: agentPendingActions.severity,
        category: agentPendingActions.category,
        metadata: agentPendingActions.metadata,
      }).from(agentPendingActions)
        .where(notInArray(agentPendingActions.status, ["approved", "rejected", "expired"]))
        .orderBy(desc(agentPendingActions.createdAt))
        .limit(200);

      // Şube bazında grupla
      const byBranch = new Map<number, typeof pending>();
      for (const action of pending) {
        if (!action.branchId) continue;
        if (!byBranch.has(action.branchId)) byBranch.set(action.branchId, []);
        byBranch.get(action.branchId)!.push(action);
      }

      // 3+ sorun olan şubelere aksiyon planı öner
      for (const [branchId, actions] of byBranch) {
        if (context.branchId && context.branchId !== branchId) continue;
        if (actions.length < 3) continue;

        const criticals = actions.filter(a => a.severity === "critical" || a.severity === "high");
        const branchInfo = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, branchId)).limit(1);
        const branchName = branchInfo[0]?.name || `Şube #${branchId}`;

        // Aksiyon paketini kategorilere göre grupla
        const categories = [...new Set(actions.map(a => a.category).filter(Boolean))];
        const planSteps = actions.slice(0, 5).map((a, i) =>
          `${i+1}. ${a.title}`).join(" · ");

        insights.push({
          type: "action_plan_ready",
          severity: criticals.length > 2 ? "critical" : "warning",
          message: `${branchName}: ${actions.length} bekleyen sorun için aksiyon planı hazır. Onaylayın → tüm görevler ilgili kişilere otomatik dağıtılır.`,
          data: {
            branchId, branchName,
            actionCount: actions.length,
            criticalCount: criticals.length,
            categories,
            planSteps,
            actionIds: actions.map(a => a.id),
            deepLink: "/sube-uyum-merkezi",
          },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[ActionPlanGenerator] error:", err);
    }
    return insights;
  },
};

registerSkill(actionPlanGeneratorSkill);
export default actionPlanGeneratorSkill;
