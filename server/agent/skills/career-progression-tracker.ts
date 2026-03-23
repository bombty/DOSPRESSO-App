import { db } from "../../db";
import { users, trainingCompletions, quizAttempts, issuedCertificates } from "@shared/schema";
import { eq, and, sql, count, avg } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const CAREER_PATH = [
  { from: "stajyer", to: "bar_buddy", requiredModules: 8, minQuizAvg: 70, minDays: 30 },
  { from: "bar_buddy", to: "barista", requiredModules: 12, minQuizAvg: 75, minDays: 60 },
  { from: "barista", to: "supervisor_buddy", requiredModules: 16, minQuizAvg: 80, minDays: 90 },
  { from: "supervisor_buddy", to: "supervisor", requiredModules: 20, minQuizAvg: 85, minDays: 180 },
];

const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
};

async function getUserCareerData(userId: string): Promise<{
  completedModules: number;
  quizAvg: number;
  daysSinceHire: number;
}> {
  const [moduleCount] = await db
    .select({ cnt: count() })
    .from(trainingCompletions)
    .where(
      and(
        eq(trainingCompletions.userId, userId),
        eq(trainingCompletions.status, "completed")
      )
    );

  const [quizAvgResult] = await db
    .select({ avgScore: avg(quizAttempts.score) })
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId));

  const [userRow] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));

  const daysSinceHire = userRow?.createdAt
    ? Math.floor((Date.now() - new Date(userRow.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    completedModules: Number(moduleCount?.cnt ?? 0),
    quizAvg: Math.round(Number(quizAvgResult?.avgScore ?? 0)),
    daysSinceHire,
  };
}

const careerProgressionTrackerSkill: AgentSkill = {
  id: "career_progression_tracker",
  name: "Kariyer İlerleme Takipçisi",
  description: "Eğitim tamamlama ve quiz performansına göre rol yükseltme önerisi oluşturur",
  targetRoles: ["supervisor", "mudur", "coach", "trainer", "admin"],
  schedule: "weekly",
  autonomyLevel: "suggest_approve",
  dataSources: ["users", "trainingCompletions", "quizAttempts"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const branchFilter = context.branchId
        ? and(
            eq(users.isActive, true),
            eq(users.accountStatus, "active"),
            eq(users.branchId, context.branchId)
          )
        : and(
            eq(users.isActive, true),
            eq(users.accountStatus, "active")
          );

      const branchUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
        })
        .from(users)
        .where(branchFilter);

      const eligibleRoles = CAREER_PATH.map(p => p.from);
      const candidates = branchUsers.filter(u => eligibleRoles.includes(u.role || ""));

      for (const candidate of candidates) {
        const nextStep = CAREER_PATH.find(p => p.from === candidate.role);
        if (!nextStep) continue;

        const careerData = await getUserCareerData(candidate.id);

        if (
          careerData.completedModules >= nextStep.requiredModules &&
          careerData.quizAvg >= nextStep.minQuizAvg &&
          careerData.daysSinceHire >= nextStep.minDays
        ) {
          const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();

          insights.push({
            type: "career_promotion_ready",
            severity: "positive",
            message: `${fullName} ${ROLE_LABELS[nextStep.to] || nextStep.to} seviyesine yükseltilebilir`,
            data: {
              userId: candidate.id,
              userName: fullName,
              currentRole: candidate.role,
              nextRole: nextStep.to,
              completedModules: careerData.completedModules,
              requiredModules: nextStep.requiredModules,
              quizAvg: careerData.quizAvg,
              minQuizAvg: nextStep.minQuizAvg,
              daysSinceHire: careerData.daysSinceHire,
              branchId: candidate.branchId,
            },
            requiresAI: true,
          });
        }
      }
    } catch (error) {
      console.error("[career-progression-tracker] Error:", error);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    return insights.map((insight) => {
      const d = insight.data;
      const currentLabel = ROLE_LABELS[d.currentRole] || d.currentRole;
      const nextLabel = ROLE_LABELS[d.nextRole] || d.nextRole;

      return {
        actionType: "recommendation",
        targetRoleScope: context.role,
        branchId: d.branchId,
        title: `Rol yükseltme önerisi: ${d.userName}`,
        description: `${d.userName} ${nextLabel} seviyesine yükseltilebilir. ${d.completedModules} modül tamamladı (gerekli: ${d.requiredModules}), quiz ortalaması %${d.quizAvg} (gerekli: %${d.minQuizAvg}), ${d.daysSinceHire} gündür çalışıyor.`,
        deepLink: `/personel/${d.userId}`,
        severity: "med",
        metadata: {
          userId: d.userId,
          currentRole: d.currentRole,
          nextRole: d.nextRole,
          completedModules: d.completedModules,
          quizAvg: d.quizAvg,
        },
        skillId: "career_progression_tracker",
        category: "hr",
        subcategory: "career_promotion",
      };
    });
  },
};

export async function checkCareerProgressionForUser(userId: string, branchId?: number): Promise<void> {
  try {
    const [user] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role, branchId: users.branchId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.role) return;

    const nextStep = CAREER_PATH.find(p => p.from === user.role);
    if (!nextStep) return;

    const careerData = await getUserCareerData(userId);

    if (
      careerData.completedModules >= nextStep.requiredModules &&
      careerData.quizAvg >= nextStep.minQuizAvg &&
      careerData.daysSinceHire >= nextStep.minDays
    ) {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const nextLabel = ROLE_LABELS[nextStep.to] || nextStep.to;
      const targetBranchId = user.branchId || branchId;

      if (targetBranchId) {
        const supervisors = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.branchId, targetBranchId),
              eq(users.isActive, true),
              sql`${users.role} IN ('supervisor', 'mudur')`
            )
          );

        const { storage } = await import("../../storage");
        for (const sup of supervisors) {
          await storage.createNotification({
            userId: sup.id,
            type: "career_promotion_ready",
            title: `Rol yükseltme önerisi: ${fullName}`,
            message: `${fullName} ${nextLabel} seviyesine yükseltilebilir. ${careerData.completedModules} modül, %${careerData.quizAvg} quiz.`,
            link: `/personel/${userId}`,
            branchId: targetBranchId,
          });
        }
      }
    }
  } catch (error) {
    console.error("[career-progression-tracker] Inline check error:", error);
  }
}

registerSkill(careerProgressionTrackerSkill);
