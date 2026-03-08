import { db } from "../../db";
import {
  checklistCompletions, trainingAssignments, trainingMaterials, users, userCareerProgress, branches,
} from "@shared/schema";
import { eq, and, gte, lt, lte, count, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

async function getBranchName(branchId?: number): Promise<string> {
  if (!branchId) return "";
  try {
    const [b] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
    return b?.name || "";
  } catch { return ""; }
}

const teamTrackerSkill: AgentSkill = {
  id: "team_tracker",
  name: "Ekip Takipçisi",
  description: "Supervisor ve müdürlerin ekip durumunu takip etmesi",
  targetRoles: ["supervisor", "supervisor_buddy", "mudur"],
  schedule: "hourly",
  autonomyLevel: "suggest_approve",
  dataSources: ["checklistCompletions", "trainingAssignments", "users", "userCareerProgress"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    if (!context.branchId) return insights;

    const today = new Date().toISOString().split("T")[0];
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      const lateChecklists = await db
        .select({
          userId: checklistCompletions.userId,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(checklistCompletions)
        .innerJoin(users, eq(checklistCompletions.userId, users.id))
        .where(
          and(
            eq(checklistCompletions.branchId, context.branchId),
            eq(checklistCompletions.scheduledDate, today),
            eq(checklistCompletions.status, "pending"),
            lte(checklistCompletions.createdAt, thirtyMinAgo)
          )
        )
        .limit(5);

      if (lateChecklists.length > 0) {
        const names = lateChecklists.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
        insights.push({
          type: "checklist_late",
          severity: "warning",
          message: `${lateChecklists.length} personel 30dk+ gecikmiş checklist: ${names}`,
          data: { users: lateChecklists.map((c) => ({ userId: c.userId, name: `${c.firstName} ${c.lastName}` })) },
          requiresAI: lateChecklists.length >= 3,
        });
      }
    } catch {}

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const overdueTrainings = await db
        .select({
          userId: trainingAssignments.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          title: trainingMaterials.title,
        })
        .from(trainingAssignments)
        .innerJoin(users, eq(trainingAssignments.userId, users.id))
        .innerJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .where(
          and(
            eq(users.branchId, context.branchId),
            eq(users.isActive, true),
            eq(trainingAssignments.status, "assigned"),
            lte(trainingAssignments.dueDate, threeDaysAgo)
          )
        )
        .limit(5);

      if (overdueTrainings.length > 0) {
        const names = overdueTrainings.map((t) => `${t.firstName} ${t.lastName}`).join(", ");
        insights.push({
          type: "training_overdue",
          severity: "warning",
          message: `${overdueTrainings.length} personelin eğitimi 3+ gündür bekliyor: ${names}`,
          data: { trainings: overdueTrainings.map((t) => ({ userId: t.userId, name: `${t.firstName} ${t.lastName}`, module: t.title })) },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const droppedScores = await db
        .select({
          userId: userCareerProgress.userId,
          compositeScore: userCareerProgress.compositeScore,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(userCareerProgress)
        .innerJoin(users, eq(userCareerProgress.userId, users.id))
        .where(
          and(
            eq(users.branchId, context.branchId),
            eq(users.isActive, true),
            lt(userCareerProgress.compositeScore, 55)
          )
        )
        .limit(3);

      if (droppedScores.length > 0) {
        insights.push({
          type: "score_dropping",
          severity: "warning",
          message: `${droppedScores.length} personelin skoru düşük (<55)`,
          data: { users: droppedScores.map((u) => ({ userId: u.userId, name: `${u.firstName} ${u.lastName}`, score: Math.round(u.compositeScore || 0) })) },
          requiresAI: true,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "checklist_late") {
        const userList = insight.data.users || [];
        const names = userList.map((u: any) => u.name).slice(0, 3).join(", ");
        actions.push({
          actionType: "remind",
          targetUserId: userList[0]?.userId || context.userId,
          targetRoleScope: "branch_floor",
          branchId: context.branchId,
          title: `Checklist Hatırlatması: ${names}`,
          description: (insight as any).aiMessage || `${userList.length} personelin checklist'i 30+ dakikadır tamamlanmadı: ${names}`,
          deepLink: "/checklistler",
          severity: "med",
          metadata: {
            targetUsers: userList,
            branchId: context.branchId,
            insightType: "checklist_late",
          },
        });
      }

      if (insight.type === "training_overdue") {
        const trainings = insight.data.trainings || [];
        const names = trainings.map((t: any) => t.name).slice(0, 3).join(", ");
        actions.push({
          actionType: "remind",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: `Eğitim Gecikmesi: ${trainings.length} personel`,
          description: (insight as any).aiMessage || `${trainings.length} personelin eğitimi 3+ gündür bekliyor: ${names}`,
          deepLink: "/akademi",
          severity: "med",
          metadata: {
            targetUsers: trainings,
            branchId: context.branchId,
            insightType: "training_overdue",
          },
        });
      }

      if (insight.type === "score_dropping") {
        const userList = insight.data.users || [];
        for (const u of userList) {
          actions.push({
            actionType: "alert",
            targetUserId: context.userId,
            branchId: context.branchId,
            title: `Performans Uyarısı: ${u.name} (${u.score}/100)`,
            description: (insight as any).aiMessage || `${u.name} composite skoru ${u.score}/100 — düşük performans bölgesinde. Takip gerekiyor.`,
            deepLink: `/personel/${u.userId}`,
            severity: "high",
            metadata: {
              targetUserName: u.name,
              targetUserId: u.userId,
              score: u.score,
              branchId: context.branchId,
              insightType: "score_dropping",
            },
          });
        }
      }
    }

    return actions;
  },
};

registerSkill(teamTrackerSkill);
export default teamTrackerSkill;
