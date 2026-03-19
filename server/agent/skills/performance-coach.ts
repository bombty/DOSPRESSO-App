import { db } from "../../db";
import { userCareerProgress, careerLevels, users, employeePerformanceScores } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const performanceCoachSkill: AgentSkill = {
  id: "performance_coach",
  name: "Performans Koçu",
  description: "Haftalık performans özeti ve gelişim önerileri",
  targetRoles: ["barista", "bar_buddy", "stajyer"],
  schedule: "weekly",
  autonomyLevel: "full_auto",
  dataSources: ["userCareerProgress", "employeePerformanceScores"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const [career] = await db
        .select({
          compositeScore: userCareerProgress.compositeScore,
          practicalScore: userCareerProgress.practicalScore,
          trainingScore: userCareerProgress.trainingScore,
          attendanceScore: userCareerProgress.attendanceScore,
          managerScore: userCareerProgress.managerScore,
          currentLevelId: userCareerProgress.currentCareerLevelId,
        })
        .from(userCareerProgress)
        .where(eq(userCareerProgress.userId, context.userId))
        .limit(1);

      if (career) {
        const score = Math.round(career.compositeScore || 0);

        const [level] = await db
          .select({ titleTr: careerLevels.titleTr })
          .from(careerLevels)
          .where(eq(careerLevels.id, career.currentLevelId))
          .limit(1);

        const scores: Record<string, number> = {
          practical: Math.round(career.practicalScore || 0),
          training: Math.round(career.trainingScore || 0),
          attendance: Math.round(career.attendanceScore || 0),
        };

        const strongest = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
        const weakest = Object.entries(scores).sort(([, a], [, b]) => a - b)[0];

        const scoreLabels: Record<string, string> = {
          practical: "Pratik & Checklist",
          training: "Eğitim",
          attendance: "Devam & Dakiklik",
        };

        insights.push({
          type: "weekly_score_summary",
          severity: score >= 70 ? "positive" : score >= 50 ? "info" : "warning",
          message: `Haftalık skor: ${score}/100. Güçlü alan: ${scoreLabels[strongest[0]]} (${strongest[1]}). Geliştirilecek: ${scoreLabels[weakest[0]]} (${weakest[1]})`,
          data: {
            compositeScore: score,
            level: level?.titleTr || "Belirsiz",
            strongest: { area: strongest[0], score: strongest[1], label: scoreLabels[strongest[0]] },
            weakest: { area: weakest[0], score: weakest[1], label: scoreLabels[weakest[0]] },
            allScores: scores,
          },
          requiresAI: true,
        });
      }
    } catch (error) { console.error("[performance-coach] Skill error:", error instanceof Error ? error.message : error); }

    try {
      if (context.branchId) {
        const [peerAvg] = await db
          .select({
            avgScore: sql<number>`AVG(${userCareerProgress.compositeScore})`,
          })
          .from(userCareerProgress)
          .innerJoin(users, eq(userCareerProgress.userId, users.id))
          .where(
            and(
              eq(users.branchId, context.branchId),
              eq(users.isActive, true)
            )
          );

        const [myScore] = await db
          .select({ compositeScore: userCareerProgress.compositeScore })
          .from(userCareerProgress)
          .where(eq(userCareerProgress.userId, context.userId))
          .limit(1);

        if (peerAvg?.avgScore && myScore?.compositeScore) {
          const avg = Math.round(Number(peerAvg.avgScore));
          const mine = Math.round(Number(myScore.compositeScore));
          const diff = mine - avg;

          if (diff > 0) {
            insights.push({
              type: "peer_comparison_positive",
              severity: "positive",
              message: `Şube ortalamasının ${diff} puan üstündesin (Sen: ${mine}, Ortalama: ${avg})`,
              data: { myScore: mine, peerAvg: avg, diff },
              requiresAI: false,
            });
          } else if (diff < -10) {
            insights.push({
              type: "peer_comparison_below",
              severity: "info",
              message: `Şube ortalamasının ${Math.abs(diff)} puan altındasın — gelişim fırsatı!`,
              data: { myScore: mine, peerAvg: avg, diff },
              requiresAI: false,
            });
          }
        }
      }
    } catch (error) { console.error("[performance-coach] Skill error:", error instanceof Error ? error.message : error); }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    const summary = insights.find((i) => i.type === "weekly_score_summary");
    if (summary) {
      const score = summary.data.compositeScore || 0;
      const strongest = summary.data.strongest?.label || "";
      const weakest = summary.data.weakest?.label || "";
      actions.push({
        actionType: "report",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: `Mr. Dobody: Haftalık Performans (${score}/100)`,
        description: (summary as any).aiMessage || `Haftalık skor: ${score}/100. Güçlü: ${strongest}. Geliştirilecek: ${weakest}.`,
        deepLink: "/benim-gunum",
        severity: "low",
        category: "performance",
        subcategory: "low_score",
        metadata: {
          compositeScore: score,
          level: summary.data.level,
          strongest: summary.data.strongest,
          weakest: summary.data.weakest,
          insightType: "weekly_score_summary",
        },
      });
    }

    return actions;
  },
};

registerSkill(performanceCoachSkill);
export default performanceCoachSkill;
