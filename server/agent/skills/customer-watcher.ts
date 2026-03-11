import { db } from "../../db";
import { customerFeedback, branches } from "@shared/schema";
import { eq, and, gte, lte, avg, count, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

async function getBranchName(branchId?: number): Promise<string> {
  if (!branchId) return "";
  try {
    const [b] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
    return b?.name || "";
  } catch { return ""; }
}

const customerWatcherSkill: AgentSkill = {
  id: "customer_watcher",
  name: "Müşteri Nöbetçisi",
  description: "Müşteri memnuniyet trendlerini izler",
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
    let branchName = "";
    if (targetBranchId) {
      branchName = await getBranchName(targetBranchId);
    }

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
            message: `Son 24 saatte ${lowRatings[0]?.cnt} düşük puan (1-2 yıldız) geri bildirim geldi`,
            data: { count: lowRatings[0]?.cnt, branchId: targetBranchId, branchName },
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
            message: `Şube ortalama puanı ${avgRating.toFixed(1)} (son 7 gün, ${feedbackCnt} değerlendirme)`,
            data: { avgRating, feedbackCount: feedbackCnt, branchId: targetBranchId, branchName },
            requiresAI: true,
          });
        } else if (feedbackCnt >= 3 && avgRating >= 4.5) {
          insights.push({
            type: "branch_avg_high",
            severity: "positive",
            message: `Şube ortalama puanı ${avgRating.toFixed(1)} — harika performans!`,
            data: { avgRating, feedbackCount: feedbackCnt, branchId: targetBranchId, branchName },
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
            message: `${slaBreached[0]?.cnt} geri bildirim SLA ihlali — yanıtlanmamış`,
            data: { count: slaBreached[0]?.cnt, branchId: targetBranchId, branchName },
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
      const branchName = insight.data.branchName || "";
      const branchSuffix = branchName ? ` (${branchName})` : "";

      if (insight.type === "low_rating_recent" || insight.type === "branch_avg_low") {
        const avgInfo = insight.data.avgRating ? ` — Ortalama: ${Number(insight.data.avgRating).toFixed(1)}` : "";
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: `Müşteri Memnuniyeti Uyarısı${branchSuffix}`,
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/misafir-memnuniyeti",
          severity: insight.severity === "critical" ? "critical" : "med",
          category: "quality",
          subcategory: "low_satisfaction",
          metadata: {
            branchId: context.branchId,
            branchName,
            avgRating: insight.data.avgRating,
            feedbackCount: insight.data.feedbackCount || insight.data.count,
            insightType: insight.type,
          },
        });
      }

      if (insight.type === "feedback_sla_breach") {
        actions.push({
          actionType: "escalate",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: `SLA İhlali${branchSuffix}: ${insight.data.count} yanıtlanmamış`,
          description: insight.message,
          deepLink: "/misafir-memnuniyeti",
          severity: "high",
          category: "quality",
          subcategory: "customer_complaint",
          metadata: {
            branchId: context.branchId,
            branchName,
            slaBreachCount: insight.data.count,
            insightType: "feedback_sla_breach",
          },
        });
      }

      if (insight.type === "branch_avg_high") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: `Müşteri Memnuniyeti Başarılı${branchSuffix}`,
          description: insight.message,
          severity: "low",
          category: "quality",
          subcategory: "low_satisfaction",
          metadata: {
            branchId: context.branchId,
            branchName,
            avgRating: insight.data.avgRating,
            insightType: "branch_avg_high",
          },
        });
      }
    }

    return actions;
  },
};

registerSkill(customerWatcherSkill);
export default customerWatcherSkill;
