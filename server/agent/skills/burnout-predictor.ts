import { db } from "../../db";
import { overtimeRequests, shiftAttendance, employeePerformanceScores, users } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const burnoutPredictorSkill: AgentSkill = {
  id: "burnout_predictor",
  name: "Tükenmişlik Tahmini",
  description: "Çalışanların fazla mesai, geç gelme ve performans düşüşü trendlerini analiz ederek tükenmişlik riskini tahmin eder",
  targetRoles: ["coach", "supervisor"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: ["overtimeRequests", "shiftAttendance", "employeePerformanceScores"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const now = new Date();
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const overtimeData = await db
        .select({
          userId: overtimeRequests.userId,
          totalOvertimeMinutes: sql<number>`COALESCE(SUM(${overtimeRequests.requestedMinutes}), 0)::int`,
          overtimeCount: sql<number>`COUNT(*)::int`,
        })
        .from(overtimeRequests)
        .where(
          and(
            gte(overtimeRequests.overtimeDate, fourWeeksAgo.toISOString().split("T")[0]),
            eq(overtimeRequests.status, "approved")
          )
        )
        .groupBy(overtimeRequests.userId);

      const latenessData = await db
        .select({
          userId: shiftAttendance.userId,
          totalLateMinutes: sql<number>`COALESCE(SUM(${shiftAttendance.latenessMinutes}), 0)::int`,
          lateCount: sql<number>`COUNT(*) FILTER (WHERE ${shiftAttendance.latenessMinutes} > 0)::int`,
          shiftCount: sql<number>`COUNT(*)::int`,
        })
        .from(shiftAttendance)
        .where(gte(shiftAttendance.scheduledStartTime, fourWeeksAgo))
        .groupBy(shiftAttendance.userId);

      const scoreData = await db
        .select({
          userId: employeePerformanceScores.userId,
          avgScore: sql<number>`ROUND(AVG(${employeePerformanceScores.dailyTotalScore}))::int`,
          minScore: sql<number>`MIN(${employeePerformanceScores.dailyTotalScore})::int`,
          scoreCount: sql<number>`COUNT(*)::int`,
        })
        .from(employeePerformanceScores)
        .where(gte(employeePerformanceScores.date, fourWeeksAgo.toISOString().split("T")[0]))
        .groupBy(employeePerformanceScores.userId);

      const overtimeMap = new Map<string, { minutes: number; count: number }>();
      for (const row of overtimeData) {
        overtimeMap.set(row.userId, { minutes: row.totalOvertimeMinutes, count: row.overtimeCount });
      }

      const latenessMap = new Map<string, { lateMinutes: number; lateCount: number; shiftCount: number }>();
      for (const row of latenessData) {
        latenessMap.set(row.userId, {
          lateMinutes: row.totalLateMinutes,
          lateCount: row.lateCount,
          shiftCount: row.shiftCount,
        });
      }

      const scoreMap = new Map<string, { avgScore: number; minScore: number }>();
      for (const row of scoreData) {
        scoreMap.set(row.userId, { avgScore: row.avgScore, minScore: row.minScore });
      }

      let allUserIds = new Set([
        ...overtimeMap.keys(),
        ...latenessMap.keys(),
        ...scoreMap.keys(),
      ]);

      if (context.branchId && (context.role === 'supervisor' || context.role === 'coach')) {
        const branchUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.branchId, context.branchId));
        const branchUserIds = new Set(branchUsers.map(u => u.id));
        allUserIds = new Set([...allUserIds].filter(id => branchUserIds.has(id)));
      }

      const atRiskEmployees: Array<{
        userId: string;
        indicators: string[];
        overtimeMinutes: number;
        lateCount: number;
        avgScore: number;
      }> = [];

      for (const userId of allUserIds) {
        const indicators: string[] = [];

        const ot = overtimeMap.get(userId);
        if (ot && ot.count >= 4) {
          indicators.push("Yüksek mesai sıklığı");
        }
        if (ot && ot.minutes > 600) {
          indicators.push("Aşırı fazla mesai saati");
        }

        const late = latenessMap.get(userId);
        if (late && late.shiftCount > 0) {
          const lateRate = (late.lateCount / late.shiftCount) * 100;
          if (lateRate > 30) {
            indicators.push("Sık geç gelme");
          }
        }

        const score = scoreMap.get(userId);
        if (score && score.avgScore < 60) {
          indicators.push("Düşük performans skoru");
        }
        if (score && score.minScore < 40) {
          indicators.push("Kritik düşük performans günü");
        }

        if (indicators.length >= 2) {
          atRiskEmployees.push({
            userId,
            indicators,
            overtimeMinutes: ot?.minutes || 0,
            lateCount: late?.lateCount || 0,
            avgScore: score?.avgScore || 0,
          });
        }
      }

      if (atRiskEmployees.length > 0) {
        let userNames: Record<string, string> = {};
        try {
          const userIds = atRiskEmployees.map((e) => e.userId);
          const userRows = await db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(sql`${users.id} = ANY(${userIds})`);
          for (const u of userRows) {
            userNames[u.id] = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.id;
          }
        } catch {}

        insights.push({
          type: "burnout_risk",
          severity: atRiskEmployees.length >= 3 ? "critical" : "warning",
          message: `${atRiskEmployees.length} çalışanda tükenmişlik riski tespit edildi`,
          data: {
            employees: atRiskEmployees.map((e) => ({
              ...e,
              name: userNames[e.userId] || e.userId,
            })),
          },
          requiresAI: true,
        });
      }
    } catch {
      return [];
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "burnout_risk") {
        const employees = insight.data.employees || [];
        const names = employees.slice(0, 3).map((e: any) => e.name).join(", ");
        const suffix = employees.length > 3 ? ` ve ${employees.length - 3} kişi daha` : "";

        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Tükenmişlik Riski Tespiti",
          description: `${employees.length} çalışanda 2+ negatif gösterge: ${names}${suffix}`,
          deepLink: "/performans",
          severity: insight.severity === "critical" ? "high" : "med",
          category: "hr",
          subcategory: "burnout_risk",
          metadata: {
            employeeCount: employees.length,
            employees: employees.map((e: any) => ({
              userId: e.userId,
              name: e.name,
              indicators: e.indicators,
            })),
            insightType: "burnout_risk",
          },
        });
      }
    }

    return actions;
  },
};

registerSkill(burnoutPredictorSkill);
export default burnoutPredictorSkill;
