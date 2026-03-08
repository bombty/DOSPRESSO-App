import { db } from "../../db";
import {
  checklistCompletions, trainingAssignments, trainingMaterials, learningStreaks,
  userBadges, badges, userCareerProgress, careerLevels,
} from "@shared/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const dailyCoachSkill: AgentSkill = {
  id: "daily_coach",
  name: "Günlük Koç",
  description: "Barista ve stajyerler için günlük motivasyon ve rehberlik",
  targetRoles: ["stajyer", "bar_buddy", "barista"],
  schedule: "daily",
  autonomyLevel: "full_auto",
  dataSources: ["checklistCompletions", "trainingAssignments", "learningStreaks", "userBadges"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const today = new Date().toISOString().split("T")[0];

    try {
      const pendingChecklists = await db
        .select({ id: checklistCompletions.id })
        .from(checklistCompletions)
        .where(
          and(
            eq(checklistCompletions.userId, context.userId),
            eq(checklistCompletions.scheduledDate, today),
            eq(checklistCompletions.status, "pending")
          )
        )
        .limit(1);

      if (pendingChecklists.length > 0) {
        insights.push({
          type: "checklist_pending",
          severity: "info",
          message: "Bugünün checklist'i henüz tamamlanmadı",
          data: { count: pendingChecklists.length },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const pendingTrainings = await db
        .select({
          id: trainingAssignments.id,
          title: trainingMaterials.title,
        })
        .from(trainingAssignments)
        .innerJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .where(
          and(
            eq(trainingAssignments.userId, context.userId),
            eq(trainingAssignments.status, "assigned")
          )
        )
        .limit(3);

      if (pendingTrainings.length > 0) {
        insights.push({
          type: "training_assigned",
          severity: "info",
          message: `${pendingTrainings.length} eğitim modülü seni bekliyor`,
          data: { modules: pendingTrainings.map((t) => t.title) },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const [streak] = await db
        .select({
          currentStreak: learningStreaks.currentStreak,
          bestStreak: learningStreaks.bestStreak,
        })
        .from(learningStreaks)
        .where(eq(learningStreaks.userId, context.userId))
        .limit(1);

      if (streak) {
        if (streak.currentStreak >= 5) {
          insights.push({
            type: "streak_motivation",
            severity: "positive",
            message: `${streak.currentStreak} günlük öğrenme serisi! Harika gidiyorsun`,
            data: { currentStreak: streak.currentStreak, bestStreak: streak.bestStreak },
            requiresAI: true,
          });
        } else if (streak.currentStreak >= 2) {
          insights.push({
            type: "streak_continue",
            severity: "info",
            message: `${streak.currentStreak} günlük serin var. Bugün devam et!`,
            data: { currentStreak: streak.currentStreak },
            requiresAI: false,
          });
        }
      }
    } catch {}

    try {
      const nearBadges = await db
        .select({
          badgeId: userBadges.badgeId,
          progress: userBadges.progress,
          badgeName: badges.name,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(
          and(
            eq(userBadges.userId, context.userId),
            gte(userBadges.progress, 70),
            lt(userBadges.progress, 100)
          )
        )
        .limit(2);

      for (const b of nearBadges) {
        insights.push({
          type: "badge_near",
          severity: "positive",
          message: `${b.badgeName} rozetine %${b.progress} ulaştın! Az kaldı`,
          data: { badgeId: b.badgeId, badgeName: b.badgeName, progress: b.progress },
          requiresAI: false,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    if (insights.length === 0) return [];

    const parts: string[] = [];

    const checklist = insights.find((i) => i.type === "checklist_pending");
    if (checklist) parts.push("Checklist bekliyor");

    const training = insights.find((i) => i.type === "training_assigned");
    if (training) parts.push(`${training.data.modules?.length || 1} eğitim modülü`);

    const streak = insights.find((i) => i.type === "streak_motivation" || i.type === "streak_continue");
    if (streak) parts.push(`Streak: ${streak.data.currentStreak} gün`);

    const badge = insights.find((i) => i.type === "badge_near");
    if (badge) parts.push(`${badge.data.badgeName} yakında!`);

    const enrichedInsight = insights.find((i) => (i as any).aiMessage);
    const description = (enrichedInsight as any)?.aiMessage || `Günaydın! ${parts.join(" | ")}`;

    return [
      {
        actionType: "remind",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: "Mr. Dobody: Günlük Rehber",
        description,
        deepLink: "/benim-gunum",
        severity: "low",
        metadata: {
          hasChecklist: !!checklist,
          hasTraining: !!training,
          streakDays: streak?.data.currentStreak,
          insightType: "daily_summary",
        },
      },
    ];
  },
};

registerSkill(dailyCoachSkill);
export default dailyCoachSkill;
