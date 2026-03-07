import { db } from "../../db";
import { customerFeedback, branches } from "@shared/schema";
import { eq, and, gte, lte, avg, count, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const customerWatcherSkill: AgentSkill = {
  id: "customer_watcher",
  name: "Musteri Nobetcisi",
  description: "Musteri memnuniyet trendlerini izler",
  targetRoles: ["supervisor", "mudur", "cgo", "coach"],
  schedule: "hourly",
  autonomyLevel: "info_only",
  dataSources: ["customerFeedback"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const targetBranchId = context.branchId;

    try {
      if (targetBranchId) {
        const lowRatings = await db
          .select({ cnt: count() })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, targetBranchId),
              gte(customerFeedback.createdAt, oneDayAgo),
              lte(customerFeedback.rating, 2)
            )
          );

        if ((lowRatings[0]?.cnt || 0) > 0) {
          insights.push({
            type: "low_rating_recent",
            severity: "warning",
            message: `Son 24 saatte ${lowRatings[0]?.cnt} dusuk puan (1-2 yildiz) geri bildirim geldi`,
            data: { count: lowRatings[0]?.cnt, branchId: targetBranchId },
            requiresAI: false,
          });
        }
      }
    } catch {}

    try {
      if (targetBranchId) {
        const [avgResult] = await db
          .select({ avgRating: avg(customerFeedback.rating), cnt: count() })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, targetBranchId),
              gte(customerFeedback.createdAt, sevenDaysAgo)
            )
          );

        const avgRating = avgResult?.avgRating ? parseFloat(String(avgResult.avgRating)) : 0;
        const feedbackCnt = avgResult?.cnt || 0;

        if (feedbackCnt >= 3 && avgRating < 3.5) {
          insights.push({
            type: "branch_avg_low",
            severity: "warning",
            message: `Sube ortalama puani ${avgRating.toFixed(1)} (son 7 gun, ${feedbackCnt} degerlendirme)`,
            data: { avgRating, feedbackCount: feedbackCnt, branchId: targetBranchId },
            requiresAI: true,
          });
        } else if (feedbackCnt >= 3 && avgRating >= 4.5) {
          insights.push({
            type: "branch_avg_high",
            severity: "positive",
            message: `Sube ortalama puani ${avgRating.toFixed(1)} — harika performans!`,
            data: { avgRating, feedbackCount: feedbackCnt },
            requiresAI: false,
          });
        }
      }
    } catch {}

    try {
      if (targetBranchId) {
        const slaBreached = await db
          .select({ cnt: count() })
          .from(customerFeedback)
          .where(
            and(
              eq(customerFeedback.branchId, targetBranchId),
              eq(customerFeedback.slaBreached, true),
              eq(customerFeedback.status, "new")
            )
          );

        if ((slaBreached[0]?.cnt || 0) > 0) {
          insights.push({
            type: "feedback_sla_breach",
            severity: "critical",
            message: `${slaBreached[0]?.cnt} geri bildirim SLA ihlali — yanitlanmamis`,
            data: { count: slaBreached[0]?.cnt, branchId: targetBranchId },
            requiresAI: false,
          });
        }
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "low_rating_recent" || insight.type === "branch_avg_low") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "Musteri memnuniyeti uyarisi",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/crm",
          severity: insight.severity === "critical" ? "critical" : "med",
        });
      }

      if (insight.type === "feedback_sla_breach") {
        actions.push({
          actionType: "escalate",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "SLA ihlali — yanitlanmamis feedback",
          description: insight.message,
          deepLink: "/crm",
          severity: "high",
        });
      }

      if (insight.type === "branch_avg_high") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "Musteri memnuniyeti basarili!",
          description: insight.message,
          severity: "low",
        });
      }
    }

    return actions;
  },
};

registerSkill(customerWatcherSkill);
export default customerWatcherSkill;
