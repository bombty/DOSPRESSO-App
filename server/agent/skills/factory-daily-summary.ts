import { db } from "../../db";
import { factoryShiftSessions, factoryQualityChecks, productionLots, factoryShiftProductions } from "@shared/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const factoryDailySummarySkill: AgentSkill = {
  id: "factory_daily_summary",
  name: "Fabrika Gunluk Ozeti",
  description: "Fabrika gunluk uretim, fire, QC ozeti — mudur ve ust yonetim icin",
  targetRoles: ["fabrika_mudur", "ceo", "cgo"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["factoryShiftSessions", "factoryQualityChecks", "productionLots", "factoryShiftProductions"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const todaySessions = await db
        .select({
          totalProduced: sql<number>`COALESCE(SUM(${factoryShiftSessions.totalProduced}), 0)`,
          totalWaste: sql<number>`COALESCE(SUM(${factoryShiftSessions.totalWaste}), 0)`,
          sessionCount: sql<number>`COUNT(*)`,
        })
        .from(factoryShiftSessions)
        .where(gte(factoryShiftSessions.checkInTime, todayStart));

      const produced = Number(todaySessions[0]?.totalProduced || 0);
      const waste = Number(todaySessions[0]?.totalWaste || 0);
      const sessionCount = Number(todaySessions[0]?.sessionCount || 0);
      const wasteRate = produced + waste > 0 ? ((waste / (produced + waste)) * 100) : 0;

      const pendingQC = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(productionLots)
        .where(eq(productionLots.status, "kalite_bekliyor"));

      const pendingQCCount = Number(pendingQC[0]?.cnt || 0);

      const todayQC = await db
        .select({
          decision: factoryQualityChecks.decision,
          cnt: sql<number>`COUNT(*)`,
        })
        .from(factoryQualityChecks)
        .where(gte(factoryQualityChecks.checkedAt, todayStart))
        .groupBy(factoryQualityChecks.decision);

      const qcApproved = todayQC.find((q) => q.decision === "approved" || q.decision === "onaylandi");
      const qcRejected = todayQC.find((q) => q.decision === "rejected" || q.decision === "reddedildi");
      const approvedCount = Number(qcApproved?.cnt || 0);
      const rejectedCount = Number(qcRejected?.cnt || 0);

      if (sessionCount > 0 || pendingQCCount > 0) {
        insights.push({
          type: "factory_daily_overview",
          severity: "info",
          message: `Bugun: ${produced} adet uretim, %${wasteRate.toFixed(1)} fire, ${pendingQCCount} LOT QC bekliyor, ${approvedCount} QC onaylandi${rejectedCount > 0 ? `, ${rejectedCount} reddedildi` : ""}`,
          data: {
            produced,
            waste,
            wasteRate: Number(wasteRate.toFixed(1)),
            sessionCount,
            pendingQCCount,
            approvedCount,
            rejectedCount,
          },
          requiresAI: false,
        });
      }

      const FIRE_THRESHOLD = 3;
      const QC_REJECT_THRESHOLD = 10;
      const isExecutive = context.role === "ceo" || context.role === "cgo";

      if (isExecutive && wasteRate > FIRE_THRESHOLD && produced > 0) {
        insights.push({
          type: "factory_fire_alert",
          severity: "warning",
          message: `Fabrika: Fire orani %${wasteRate.toFixed(1)} (hedef: <%${FIRE_THRESHOLD})`,
          data: { wasteRate: Number(wasteRate.toFixed(1)), threshold: FIRE_THRESHOLD },
          requiresAI: true,
        });
      }

      const totalQC = approvedCount + rejectedCount;
      if (isExecutive && totalQC > 0 && rejectedCount > 0) {
        const rejectRate = (rejectedCount / totalQC) * 100;
        if (rejectRate > QC_REJECT_THRESHOLD) {
          insights.push({
            type: "factory_qc_reject_alert",
            severity: "warning",
            message: `Fabrika: QC ret orani %${rejectRate.toFixed(0)} (hedef: <%${QC_REJECT_THRESHOLD})`,
            data: { rejectRate: Number(rejectRate.toFixed(0)), rejectedCount, totalQC },
            requiresAI: true,
          });
        }
      }

      const isMonday = new Date().getDay() === 1;
      if (isMonday) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyProduction = await db
          .select({
            totalProduced: sql<number>`COALESCE(SUM(${factoryShiftSessions.totalProduced}), 0)`,
            totalWaste: sql<number>`COALESCE(SUM(${factoryShiftSessions.totalWaste}), 0)`,
            sessionCount: sql<number>`COUNT(*)`,
          })
          .from(factoryShiftSessions)
          .where(gte(factoryShiftSessions.checkInTime, weekAgo));

        const weekProduced = Number(weeklyProduction[0]?.totalProduced || 0);
        const weekWaste = Number(weeklyProduction[0]?.totalWaste || 0);
        const weekSessions = Number(weeklyProduction[0]?.sessionCount || 0);
        const weekWasteRate = weekProduced + weekWaste > 0 ? ((weekWaste / (weekProduced + weekWaste)) * 100) : 0;

        if (weekSessions > 0) {
          insights.push({
            type: "factory_weekly_summary",
            severity: weekWasteRate > FIRE_THRESHOLD ? "warning" : "info",
            message: `Gecen hafta: ${weekProduced} adet uretim, %${weekWasteRate.toFixed(1)} fire, ${weekSessions} oturum`,
            data: {
              weekProduced,
              weekWaste,
              weekWasteRate: Number(weekWasteRate.toFixed(1)),
              weekSessions,
            },
            requiresAI: weekWasteRate > FIRE_THRESHOLD,
          });
        }
      }
    } catch (error) {
      console.error("[factory-daily-summary] Skill error:", error instanceof Error ? error.message : error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "factory_daily_overview") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Fabrika gunluk ozeti",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "low",
          category: "factory",
          subcategory: "daily_summary",
        });
      }

      if (insight.type === "factory_fire_alert") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "Yuksek fire orani",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/fabrika/dashboard",
          severity: "high",
          category: "factory",
          subcategory: "waste_alert",
        });
      }

      if (insight.type === "factory_qc_reject_alert") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "Yuksek QC ret orani",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/fabrika/kalite-kontrol",
          severity: "high",
          category: "factory",
          subcategory: "qc_alert",
        });
      }

      if (insight.type === "factory_weekly_summary") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Fabrika haftalik ozeti",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/fabrika/dashboard",
          severity: insight.data.weekWasteRate > 3 ? "med" : "low",
          category: "factory",
          subcategory: "weekly_summary",
        });
      }
    }

    return actions;
  },
};

registerSkill(factoryDailySummarySkill);
export default factoryDailySummarySkill;
