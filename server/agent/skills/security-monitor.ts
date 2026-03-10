import { db } from "../../db";
import { auditLogs } from "@shared/schema";
import { sql, and, gte, eq, like, or, count } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const securityMonitorSkill: AgentSkill = {
  id: "security_monitor",
  name: "Güvenlik İzleme",
  description: "Sistem güvenliğini izler, şüpheli aktiviteleri tespit eder ve admin'e bildirir",
  targetRoles: ["admin"],
  schedule: "hourly",
  autonomyLevel: "info_only",
  dataSources: ["auditLogs"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const [failedLogins] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, "auth.login_failed"),
            gte(auditLogs.createdAt, oneHourAgo)
          )
        );

      if (failedLogins && failedLogins.total >= 5) {
        insights.push({
          type: "failed_logins",
          severity: failedLogins.total >= 10 ? "critical" : "warning",
          message: `Son 1 saatte ${failedLogins.total} başarısız giriş denemesi tespit edildi`,
          data: { count: failedLogins.total },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const [lateNightAccess] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, "auth.login_success"),
            gte(auditLogs.createdAt, oneHourAgo),
            sql`EXTRACT(HOUR FROM ${auditLogs.createdAt} AT TIME ZONE 'Europe/Istanbul') >= 0`,
            sql`EXTRACT(HOUR FROM ${auditLogs.createdAt} AT TIME ZONE 'Europe/Istanbul') < 5`
          )
        );

      if (lateNightAccess && lateNightAccess.total > 0) {
        insights.push({
          type: "late_night_access",
          severity: "warning",
          message: `Son 1 saatte ${lateNightAccess.total} gece saati erişimi (00:00-05:00) tespit edildi`,
          data: { count: lateNightAccess.total },
          requiresAI: false,
        });
      }
    } catch {}

    try {
      const [bulkOps] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.createdAt, oneHourAgo),
            or(
              like(auditLogs.action, "%export%"),
              like(auditLogs.action, "%bulk%"),
              like(auditLogs.action, "%delete%")
            )
          )
        );

      if (bulkOps && bulkOps.total >= 3) {
        insights.push({
          type: "bulk_operations",
          severity: bulkOps.total >= 10 ? "critical" : "warning",
          message: `Son 1 saatte ${bulkOps.total} toplu işlem (export/bulk/delete) tespit edildi`,
          data: { count: bulkOps.total },
          requiresAI: false,
        });
      }
    } catch {}

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "failed_logins") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: "Başarısız Giriş Uyarısı",
          description: insight.message,
          severity: insight.severity === "critical" ? "critical" : "high",
          category: "security",
          subcategory: "failed_logins",
          metadata: { insightType: "failed_logins", count: insight.data.count },
        });
      }

      if (insight.type === "late_night_access") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: "Gece Saati Erişim Uyarısı",
          description: insight.message,
          severity: "high",
          category: "security",
          subcategory: "late_night_access",
          metadata: { insightType: "late_night_access", count: insight.data.count },
        });
      }

      if (insight.type === "bulk_operations") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: "Toplu İşlem Uyarısı",
          description: insight.message,
          severity: insight.severity === "critical" ? "critical" : "high",
          category: "security",
          subcategory: "bulk_operations",
          metadata: { insightType: "bulk_operations", count: insight.data.count },
        });
      }
    }

    return actions;
  },
};

registerSkill(securityMonitorSkill);
export default securityMonitorSkill;
