import { db } from "../../db";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const payrollReminderSkill: AgentSkill = {
  id: "payroll_reminder",
  name: "Bordro Hatırlatma",
  description: "Her ayın 25'inde muhasebe ekibine bordro hesaplama hatırlatması gönderir",
  targetRoles: ["muhasebe_ik", "admin", "ceo"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["users"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    const today = new Date();
    const dayOfMonth = today.getDate();

    if (dayOfMonth < 25 || dayOfMonth > 28) {
      return insights;
    }

    try {
      const accountingUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(
          and(
            eq(users.role, "muhasebe_ik"),
            eq(users.isActive, true),
            eq(users.accountStatus, "active")
          )
        );

      if (accountingUsers.length > 0) {
        const monthName = today.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

        insights.push({
          type: "payroll_reminder",
          severity: dayOfMonth >= 27 ? "critical" : "warning",
          message: `${monthName} bordro hesaplama zamanı. ${accountingUsers.length} muhasebe personeli bilgilendirilecek.`,
          data: {
            monthName,
            dayOfMonth,
            accountingUserCount: accountingUsers.length,
            accountingUserIds: accountingUsers.map(u => u.id),
          },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[payroll-reminder] Error:", error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    return insights.map((insight) => {
      const { dayOfMonth, monthName } = insight.data;
      const isUrgent = dayOfMonth >= 27;

      return {
        actionType: "reminder",
        targetRoleScope: "muhasebe_ik",
        title: isUrgent
          ? `ACİL: ${monthName} bordro hesaplama son günler!`
          : `${monthName} bordro hesaplama zamanı`,
        description: `Bu ay için bordro hesaplama henüz tamamlanmadı. PDKS verileri hazır — bordro hesaplamayı başlatın.`,
        deepLink: "/bordro",
        severity: isUrgent ? "high" : "med",
        metadata: {
          monthName,
          dayOfMonth,
        },
        skillId: "payroll_reminder",
        category: "finance",
        subcategory: "payroll_reminder",
      };
    });
  },
};

registerSkill(payrollReminderSkill);
