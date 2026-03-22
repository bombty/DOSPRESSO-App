import { db } from "../../db";
import { productionLots, factoryProductionOutputs, factoryQualityAssignments } from "@shared/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const qcTrackerSkill: AgentSkill = {
  id: "qc_tracker",
  name: "Kalite Kontrol Takipçisi",
  description: "QC lot takibi, bekleyen denetimler ve kalite atama kontrolü",
  targetRoles: ["gida_muhendisi", "fabrika_mudur", "kalite_kontrol", "admin"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["productionLots", "factoryProductionOutputs", "factoryQualityAssignments"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const pendingOutputs = await db
        .select({ cnt: count() })
        .from(factoryProductionOutputs)
        .where(eq(factoryProductionOutputs.qualityStatus, "pending"));

      const pendingCount = Number(pendingOutputs[0]?.cnt || 0);
      if (pendingCount > 3) {
        insights.push({
          type: "qc_pending_high",
          severity: pendingCount >= 10 ? "critical" : "warning",
          message: `${pendingCount} üretim kaydı QC bekliyor`,
          data: { count: pendingCount },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[qc-tracker] Pending outputs error:", error instanceof Error ? error.message : error);
    }

    try {
      const todayStart = new Date(new Date().toISOString().slice(0, 10));
      const rejectedToday = await db
        .select({ cnt: count() })
        .from(factoryProductionOutputs)
        .where(
          and(
            eq(factoryProductionOutputs.qualityStatus, "rejected"),
            gte(factoryProductionOutputs.createdAt, todayStart)
          )
        );

      const rejectedCount = Number(rejectedToday[0]?.cnt || 0);
      if (rejectedCount > 0) {
        insights.push({
          type: "qc_rejected_today",
          severity: rejectedCount >= 5 ? "critical" : "warning",
          message: `Bugün ${rejectedCount} lot reddedildi`,
          data: { count: rejectedCount },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[qc-tracker] Rejected today error:", error instanceof Error ? error.message : error);
    }

    try {
      const pendingLots = await db
        .select({ cnt: count() })
        .from(productionLots)
        .where(eq(productionLots.status, "kalite_bekliyor"));

      const lotCount = Number(pendingLots[0]?.cnt || 0);
      if (lotCount > 5) {
        insights.push({
          type: "lots_pending_qc",
          severity: lotCount >= 15 ? "critical" : "warning",
          message: `${lotCount} lot kalite onay bekliyor`,
          data: { count: lotCount },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[qc-tracker] Pending lots error:", error instanceof Error ? error.message : error);
    }

    try {
      const activeAssignments = await db
        .select({ cnt: count() })
        .from(factoryQualityAssignments)
        .where(eq(factoryQualityAssignments.isActive, true));

      if (Number(activeAssignments[0]?.cnt || 0) === 0) {
        insights.push({
          type: "no_qc_assignment",
          severity: "critical",
          message: "QC sorumlusu atanmadı — denetim yapılmıyor olabilir",
          data: {},
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[qc-tracker] Assignment check error:", error instanceof Error ? error.message : error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], _context: SkillContext): SkillAction[] {
    return insights.map(insight => ({
      actionType: "notification",
      title: insight.message,
      description: `QC Takipçisi: ${insight.message}`,
      severity: insight.severity === "critical" ? "critical" as const : "med" as const,
      deepLink: "/fabrika/kalite-kontrol",
      skillId: "qc_tracker",
      category: "quality",
      subcategory: insight.type,
    }));
  },
};

registerSkill(qcTrackerSkill);

export default qcTrackerSkill;
