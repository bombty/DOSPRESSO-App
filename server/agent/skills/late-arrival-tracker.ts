import { db } from "../../db";
import { factoryShiftSessions, shifts, users } from "@shared/schema";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";
import { getEffectiveConfig } from "../../routes/payroll-config";

const DEFAULT_LATE_THRESHOLD_MINUTES = 15;
const MONTHLY_LATE_WARNING = 2;
const MONTHLY_LATE_ESCALATION = 4;
const BRANCH_SYSTEMIC_THRESHOLD = 20;

/**
 * F15: Geç kalma eşiğini payrollDeductionConfig cascade'inden dinamik oku.
 * Fabrika tarafında branchId yok (factoryShiftSessions.branchId mevcut değil),
 * bu yüzden 0 ile çağrı yapılır → cascade `IS NULL` (genel) config'e fallback eder.
 * Hata durumunda DEFAULT_LATE_THRESHOLD_MINUTES (15) ile devam edilir, skill çökmez.
 */
async function resolveLateThreshold(
  branchId: number,
  year: number,
  month: number,
): Promise<{ thresholdMinutes: number; source: string }> {
  try {
    const cfg = await getEffectiveConfig(branchId, year, month);
    const minutes = cfg.lateToleranceMinutes ?? DEFAULT_LATE_THRESHOLD_MINUTES;
    const source = (cfg as { source?: string }).source ?? "default";
    console.info(
      `[late-arrival-tracker] threshold=${minutes}dk source=${source} (branchId=${branchId} ${year}-${month})`,
    );
    return { thresholdMinutes: minutes, source };
  } catch (err) {
    console.error(
      "[late-arrival-tracker] threshold fetch failed, falling back to default:",
      err instanceof Error ? err.message : err,
    );
    return { thresholdMinutes: DEFAULT_LATE_THRESHOLD_MINUTES, source: "fallback" };
  }
}

const lateArrivalTrackerSkill: AgentSkill = {
  id: "late_arrival_tracker",
  name: "Gec Kalma Takipcisi",
  description: "Personel gec kalma tespiti, eskalasyon ve aylik trend raporu",
  targetRoles: ["supervisor", "mudur", "fabrika_mudur", "cgo", "coach", "trainer"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: ["factoryShiftSessions", "shifts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (context.role === "fabrika_mudur") {
        const todayFactory = await db
          .select({
            userId: factoryShiftSessions.userId,
            checkInTime: factoryShiftSessions.checkInTime,
          })
          .from(factoryShiftSessions)
          .where(gte(factoryShiftSessions.checkInTime, todayStart))
          .limit(100);

        if (todayFactory.length > 0) {
          const now = new Date();
          const { thresholdMinutes } = await resolveLateThreshold(
            0,
            now.getFullYear(),
            now.getMonth() + 1,
          );
          const earlyHour = 7;
          const lateArrivals = todayFactory.filter((s) => {
            if (!s.checkInTime) return false;
            const checkIn = new Date(s.checkInTime);
            const expectedStart = new Date(checkIn);
            expectedStart.setHours(earlyHour, 0, 0, 0);
            const diffMinutes = (checkIn.getTime() - expectedStart.getTime()) / 60000;
            return diffMinutes > thresholdMinutes;
          });

          if (lateArrivals.length > 0) {
            insights.push({
              type: "factory_late_today",
              severity: lateArrivals.length >= 3 ? "warning" : "info",
              message: `Bugün ${lateArrivals.length} fabrika calisan gec kaldi (toplam ${todayFactory.length} giris)`,
              data: {
                lateCount: lateArrivals.length,
                totalEntries: todayFactory.length,
                lateUserIds: lateArrivals.map((l) => l.userId).slice(0, 10),
                thresholdMinutes,
              },
              requiresAI: false,
            });
          }
        }
      }

      if (context.branchId && (context.role === "supervisor" || context.role === "mudur")) {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const todayShifts = await db
          .select({
            assignedToId: shifts.assignedToId,
            startTime: shifts.startTime,
            shiftDate: shifts.shiftDate,
          })
          .from(shifts)
          .where(
            and(
              eq(shifts.branchId, context.branchId),
              eq(shifts.shiftDate, todayStr),
              isNotNull(shifts.assignedToId)
            )
          )
          .limit(50);

        if (todayShifts.length > 0) {
          insights.push({
            type: "branch_shift_overview",
            severity: "info",
            message: `Bugün ${todayShifts.length} personel vardiyada planli`,
            data: { plannedCount: todayShifts.length },
            requiresAI: false,
          });
        }
      }

      const isFirstOfMonth = new Date().getDate() === 1;
      if (isFirstOfMonth && (context.role === "cgo" || context.role === "coach" || context.role === "trainer" || context.role === "fabrika_mudur")) {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const monthlyFactory = await db
          .select({
            userId: factoryShiftSessions.userId,
            checkInTime: factoryShiftSessions.checkInTime,
          })
          .from(factoryShiftSessions)
          .where(gte(factoryShiftSessions.checkInTime, monthAgo))
          .limit(1000);

        if (monthlyFactory.length > 0) {
          const { thresholdMinutes } = await resolveLateThreshold(
            0,
            monthAgo.getFullYear(),
            monthAgo.getMonth() + 1,
          );
          const earlyHour = 7;
          const lateByUser = new Map<string, number>();

          for (const session of monthlyFactory) {
            if (!session.checkInTime) continue;
            const checkIn = new Date(session.checkInTime);
            const expected = new Date(checkIn);
            expected.setHours(earlyHour, 0, 0, 0);
            const diff = (checkIn.getTime() - expected.getTime()) / 60000;
            if (diff > thresholdMinutes) {
              lateByUser.set(session.userId, (lateByUser.get(session.userId) || 0) + 1);
            }
          }

          const frequentLate = Array.from(lateByUser.entries()).filter(
            ([_, count]) => count >= MONTHLY_LATE_WARNING
          );
          const severelyLate = frequentLate.filter(([_, count]) => count >= MONTHLY_LATE_ESCALATION);

          const uniqueUsers = new Set(monthlyFactory.map((s) => s.userId));
          const latePercentage = uniqueUsers.size > 0
            ? Math.round((frequentLate.length / uniqueUsers.size) * 100)
            : 0;

          if (frequentLate.length > 0) {
            insights.push({
              type: "monthly_late_summary",
              severity: severelyLate.length > 0 ? "warning" : "info",
              message: `Gecen ay ${frequentLate.length} kisi 2+ kez gec kaldi. ${severelyLate.length} kisi 4+ kez (escalation). Sube geneli %${latePercentage} duzensiz devam.`,
              data: {
                frequentLateCount: frequentLate.length,
                severelyLateCount: severelyLate.length,
                latePercentage,
                isSystemic: latePercentage >= BRANCH_SYSTEMIC_THRESHOLD,
                topOffenders: severelyLate.slice(0, 5).map(([userId, count]) => ({ userId, count })),
                thresholdMinutes,
              },
              requiresAI: severelyLate.length > 0,
            });
          }
        }
      }
    } catch (error) {
      console.error("[late-arrival-tracker] Skill error:", error instanceof Error ? error.message : error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "factory_late_today") {
        actions.push({
          actionType: insight.data.lateCount >= 3 ? "alert" : "report",
          targetUserId: context.userId,
          title: "Gec kalma bildirimi",
          description: insight.message,
          deepLink: "/fabrika/dashboard",
          severity: insight.data.lateCount >= 3 ? "med" : "low",
          category: "hr",
          subcategory: "attendance",
        });
      }

      if (insight.type === "branch_shift_overview") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Vardiya durumu",
          description: insight.message,
          deepLink: "/vardiyalar",
          severity: "low",
          category: "hr",
          subcategory: "attendance",
        });
      }

      if (insight.type === "monthly_late_summary") {
        const sev = insight.data.isSystemic ? "high" : insight.data.severelyLateCount > 0 ? "med" : "low";
        actions.push({
          actionType: insight.data.isSystemic ? "escalate" : "alert",
          targetUserId: context.userId,
          title: "Aylik gec kalma raporu",
          description: (insight as any).aiMessage || insight.message,
          deepLink: "/ik",
          severity: sev,
          category: "hr",
          subcategory: "attendance",
        });
      }
    }

    return actions;
  },
};

registerSkill(lateArrivalTrackerSkill);
export { resolveLateThreshold };
export default lateArrivalTrackerSkill;
