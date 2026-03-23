import { db } from "../../db";
import { branchTaskInstances, branchRecurringTasks, users } from "@shared/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const branchTaskTrackerSkill: AgentSkill = {
  id: "branch_task_tracker",
  name: "Sube Gorev Takipcisi",
  description: "Sube gorevlerini takip eder, gecikme uyarisi verir, haftalik tamamlama orani raporlar",
  targetRoles: ["supervisor", "mudur", "coach", "trainer"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["branchTaskInstances", "branchRecurringTasks"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    try {
      const branchId = context.branchId;
      if (!branchId && (context.role === "supervisor" || context.role === "mudur")) {
        return insights;
      }

      const branchFilter = branchId ? eq(branchTaskInstances.branchId, branchId) : undefined;

      const todayTasks = await db
        .select({
          id: branchTaskInstances.id,
          status: branchTaskInstances.status,
          dueDate: branchTaskInstances.dueDate,
          claimedByUserId: branchTaskInstances.claimedByUserId,
          isOverdue: branchTaskInstances.isOverdue,
        })
        .from(branchTaskInstances)
        .where(
          and(
            branchFilter,
            gte(branchTaskInstances.dueDate, todayStart.toISOString().split("T")[0]),
            lte(branchTaskInstances.dueDate, todayEnd.toISOString().split("T")[0])
          )
        )
        .limit(200);

      const overdueTasks = await db
        .select({
          id: branchTaskInstances.id,
          status: branchTaskInstances.status,
          dueDate: branchTaskInstances.dueDate,
          claimedByUserId: branchTaskInstances.claimedByUserId,
        })
        .from(branchTaskInstances)
        .where(
          and(
            branchFilter,
            eq(branchTaskInstances.status, "pending"),
            sql`${branchTaskInstances.dueDate} < CURRENT_DATE`
          )
        )
        .limit(200);

      const unclaimedTasks = todayTasks.filter(
        (t) => t.status === "pending" && !t.claimedByUserId
      );
      const pendingToday = todayTasks.filter((t) => t.status === "pending");
      const completedToday = todayTasks.filter((t) => t.status === "completed");

      if (todayTasks.length > 0 || overdueTasks.length > 0) {
        insights.push({
          type: "daily_task_summary",
          severity: overdueTasks.length > 3 ? "warning" : "info",
          message: `Bugun ${todayTasks.length} gorev var (${completedToday.length} tamamlandi, ${pendingToday.length} bekliyor). ${overdueTasks.length} gecikmiş gorev mevcut.`,
          data: {
            todayTotal: todayTasks.length,
            completed: completedToday.length,
            pending: pendingToday.length,
            overdue: overdueTasks.length,
            unclaimed: unclaimedTasks.length,
          },
          requiresAI: false,
        });
      }

      if (unclaimedTasks.length >= 3) {
        insights.push({
          type: "unclaimed_tasks_warning",
          severity: "warning",
          message: `${unclaimedTasks.length} gorev sahipsiz bekliyor — acik havuzda`,
          data: { unclaimedCount: unclaimedTasks.length },
          requiresAI: false,
        });
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const isMonday = new Date().getDay() === 1;
      if (isMonday && (context.role === "coach" || context.role === "mudur" || context.role === "trainer")) {
        const lastWeekTasks = await db
          .select({
            status: branchTaskInstances.status,
          })
          .from(branchTaskInstances)
          .where(
            and(
              branchFilter,
              gte(branchTaskInstances.dueDate, weekAgo.toISOString().split("T")[0]),
              lte(branchTaskInstances.dueDate, todayStart.toISOString().split("T")[0])
            )
          )
          .limit(500);

        const prevWeekTasks = await db
          .select({
            status: branchTaskInstances.status,
          })
          .from(branchTaskInstances)
          .where(
            and(
              branchFilter,
              gte(branchTaskInstances.dueDate, twoWeeksAgo.toISOString().split("T")[0]),
              lte(branchTaskInstances.dueDate, weekAgo.toISOString().split("T")[0])
            )
          )
          .limit(500);

        const lastWeekTotal = lastWeekTasks.length;
        const lastWeekCompleted = lastWeekTasks.filter((t) => t.status === "completed").length;
        const lastWeekRate = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;

        const prevWeekTotal = prevWeekTasks.length;
        const prevWeekCompleted = prevWeekTasks.filter((t) => t.status === "completed").length;
        const prevWeekRate = prevWeekTotal > 0 ? Math.round((prevWeekCompleted / prevWeekTotal) * 100) : 0;

        if (lastWeekTotal > 0) {
          const trend = lastWeekRate - prevWeekRate;
          const trendText = trend > 0 ? `artis (+${trend}%)` : trend < 0 ? `dusus (${trend}%)` : "sabit";

          insights.push({
            type: "weekly_completion_rate",
            severity: lastWeekRate < 60 ? "warning" : "info",
            message: `Gecen hafta %${lastWeekRate} tamamlama (${lastWeekCompleted}/${lastWeekTotal}). Onceki hafta %${prevWeekRate} — ${trendText}`,
            data: {
              lastWeekRate,
              lastWeekCompleted,
              lastWeekTotal,
              prevWeekRate,
              prevWeekCompleted,
              prevWeekTotal,
              trend,
            },
            requiresAI: lastWeekRate < 60,
          });
        }
      }
    } catch (error) {
      console.error("[branch-task-tracker] Skill error:", error instanceof Error ? error.message : error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "daily_task_summary") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Gunluk gorev ozeti",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/sube-gorevler",
          severity: insight.data.overdue > 3 ? "med" : "low",
          category: "branch_ops",
          subcategory: "task_tracking",
        });
      }

      if (insight.type === "unclaimed_tasks_warning") {
        actions.push({
          actionType: "alert",
          targetUserId: context.userId,
          title: "Sahipsiz gorevler",
          description: insight.message,
          deepLink: "/sube-gorevler",
          severity: "med",
          category: "branch_ops",
          subcategory: "task_tracking",
        });
      }

      if (insight.type === "weekly_completion_rate") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Haftalik gorev raporu",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/sube-gorevler",
          severity: insight.data.lastWeekRate < 60 ? "med" : "low",
          category: "branch_ops",
          subcategory: "task_tracking",
        });
      }
    }

    return actions;
  },
};

registerSkill(branchTaskTrackerSkill);
export default branchTaskTrackerSkill;
