import { db } from "../../db";
import {
  checklistCompletions, trainingAssignments, trainingMaterials, users, userCareerProgress,
} from "@shared/schema";
import { eq, and, gte, lt, lte, count, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const teamTrackerSkill: AgentSkill = {
  id: "team_tracker",
  name: "Ekip Takipcisi",
  description: "Supervisor ve mudurlerin ekip durumunu takip etmesi",
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
        insights.push({
          type: "training_overdue",
          severity: "warning",
          message: `${overdueTrainings.length} personelin egitimi 3+ gundur bekliyor`,
          data: { trainings: overdueTrainings.map((t) => ({ userId: t.userId, name: `${t.firstName} ${t.lastName}`, module: t.title })) },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

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
          message: `${droppedScores.length} personelin skoru dusuk (<55)`,
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
        const firstUser = insight.data.users?.[0];
        if (firstUser) {
          actions.push({
            actionType: "remind",
            targetUserId: firstUser.userId,
            targetRoleScope: "branch_floor",
            branchId: context.branchId,
            title: `Checklist hatirlatmasi`,
            description: (insight as any).aiMessage || insight.message,
            deepLink: "/sube-ozet",
            severity: "med",
          });
        }
      }

      if (insight.type === "training_overdue") {
        actions.push({
          actionType: "remind",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "Egitim gecikmesi",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/sube/employee-dashboard",
          severity: "med",
        });
      }

      if (insight.type === "score_dropping") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          branchId: context.branchId,
          title: "Performans uyarisi",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/sube/employee-dashboard",
          severity: "high",
        });
      }
    }

    return actions;
  },
};

registerSkill(teamTrackerSkill);
export default teamTrackerSkill;
