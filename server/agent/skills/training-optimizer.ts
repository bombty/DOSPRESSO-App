import { db } from "../../db";
import {
  trainingAssignments,
  trainingMaterials,
  trainingModules,
  trainingCompletions,
  userTrainingProgress,
  userQuizAttempts,
  quizResults,
  quizQuestions,
  moduleQuizzes,
  userCareerProgress,
  examRequests,
  issuedCertificates,
  branches,
  users,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, avg, desc, ne, isNotNull } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const trainingOptimizerSkill: AgentSkill = {
  id: "training_optimizer",
  name: "Eğitim Optimizasyoncusu",
  description: "Eğitim tamamlama, quiz performansı, şube karşılaştırması, onboarding durumu ve sertifika pipeline analizi",
  targetRoles: ["trainer", "coach", "ceo", "cgo", "admin"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: [
    "trainingAssignments",
    "trainingCompletions",
    "userTrainingProgress",
    "userQuizAttempts",
    "quizResults",
    "quizQuestions",
    "moduleQuizzes",
    "userCareerProgress",
    "examRequests",
    "employeeOnboardingProgress",
    "issuedCertificates",
    "branches",
    "users",
  ],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // ============================================
    // 1. OVERALL COMPLETION RATE (existing)
    // ============================================
    try {
      const totalAssigned = await db
        .select({ cnt: count() })
        .from(trainingAssignments)
        .where(gte(trainingAssignments.createdAt, thirtyDaysAgo));

      const totalCompleted = await db
        .select({ cnt: count() })
        .from(trainingAssignments)
        .where(
          and(
            gte(trainingAssignments.createdAt, thirtyDaysAgo),
            eq(trainingAssignments.status, "completed")
          )
        );

      const assigned = totalAssigned[0]?.cnt || 0;
      const completed = totalCompleted[0]?.cnt || 0;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      if (assigned > 0) {
        insights.push({
          type: "overall_completion_rate",
          severity: rate >= 80 ? "positive" : rate >= 50 ? "info" : "warning",
          message: `Son 30 gün eğitim tamamlama oranı: %${rate} (${completed}/${assigned})`,
          data: { assigned, completed, rate },
          requiresAI: rate < 60,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] overall_completion_rate error:", err);
    }

    // ============================================
    // 2. LOW COMPLETION MODULES (existing)
    // ============================================
    try {
      const moduleStats = await db
        .select({
          materialId: trainingAssignments.materialId,
          title: trainingMaterials.title,
          total: count(),
          completedCount: sql<number>`SUM(CASE WHEN ${trainingAssignments.status} = 'completed' THEN 1 ELSE 0 END)`,
        })
        .from(trainingAssignments)
        .innerJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .groupBy(trainingAssignments.materialId, trainingMaterials.title)
        .limit(20);

      const lowCompletionModules = moduleStats
        .filter((m) => {
          const total = Number(m.total);
          const comp = Number(m.completedCount || 0);
          return total >= 3 && (comp / total) < 0.4;
        })
        .slice(0, 3);

      if (lowCompletionModules.length > 0) {
        const names = lowCompletionModules.map((m) => m.title).join(", ");
        insights.push({
          type: "low_completion_modules",
          severity: "warning",
          message: `Düşük tamamlama oranlı modüller: ${names}`,
          data: { modules: lowCompletionModules },
          requiresAI: true,
        });
      }

      // 3. HIGH COMPLETION MODULES (existing)
      const highCompletionModules = moduleStats
        .filter((m) => {
          const total = Number(m.total);
          const comp = Number(m.completedCount || 0);
          return total >= 5 && (comp / total) >= 0.9;
        })
        .slice(0, 3);

      if (highCompletionModules.length > 0) {
        const names = highCompletionModules.map((m) => m.title).join(", ");
        insights.push({
          type: "high_completion_modules",
          severity: "positive",
          message: `Yüksek tamamlama oranlı modüller: ${names}`,
          data: { modules: highCompletionModules },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] low_high_completion_modules error:", err);
    }

    // ============================================
    // 4. HARDEST QUIZ QUESTIONS (grouped by quiz)
    // ============================================
    try {
      const quizStats = await db
        .select({
          quizId: userQuizAttempts.quizId,
          quizTitle: moduleQuizzes.title,
          totalAttempts: count(),
          avgScore: avg(userQuizAttempts.score),
          failCount: sql<number>`SUM(CASE WHEN ${userQuizAttempts.isPassed} = false THEN 1 ELSE 0 END)`,
          passCount: sql<number>`SUM(CASE WHEN ${userQuizAttempts.isPassed} = true THEN 1 ELSE 0 END)`,
        })
        .from(userQuizAttempts)
        .innerJoin(moduleQuizzes, eq(userQuizAttempts.quizId, moduleQuizzes.id))
        .where(gte(userQuizAttempts.completedAt, thirtyDaysAgo))
        .groupBy(userQuizAttempts.quizId, moduleQuizzes.title);

      const hardQuizzes = quizStats
        .filter((q) => {
          const total = Number(q.totalAttempts || 0);
          const failed = Number(q.failCount || 0);
          return total >= 3 && (failed / total) > 0.5;
        })
        .map((q) => ({
          quizId: q.quizId,
          title: q.quizTitle || `Quiz #${q.quizId}`,
          failRate: Math.round((Number(q.failCount || 0) / Number(q.totalAttempts || 1)) * 100),
          total: Number(q.totalAttempts || 0),
          avgScore: Math.round(Number(q.avgScore || 0)),
        }))
        .sort((a, b) => b.failRate - a.failRate)
        .slice(0, 5);

      if (hardQuizzes.length > 0) {
        const names = hardQuizzes.map(q => `${q.title} (%${q.failRate} başarısız)`).join(", ");
        insights.push({
          type: "hardest_quiz_questions",
          severity: "warning",
          message: `${hardQuizzes.length} quizde başarısızlık oranı %50'nin üzerinde: ${names}`,
          data: { quizzes: hardQuizzes },
          requiresAI: true,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] hardest_quiz_questions error:", err);
    }

    // ============================================
    // 5. QUIZ SCORE TRENDS
    // ============================================
    try {
      const recentScores = await db
        .select({ avgScore: avg(userQuizAttempts.score) })
        .from(userQuizAttempts)
        .where(
          and(
            gte(userQuizAttempts.completedAt, thirtyDaysAgo),
            isNotNull(userQuizAttempts.score)
          )
        );

      const prevScores = await db
        .select({ avgScore: avg(userQuizAttempts.score) })
        .from(userQuizAttempts)
        .where(
          and(
            gte(userQuizAttempts.completedAt, sixtyDaysAgo),
            lte(userQuizAttempts.completedAt, thirtyDaysAgo),
            isNotNull(userQuizAttempts.score)
          )
        );

      const recentAvg = Number(recentScores[0]?.avgScore || 0);
      const prevAvg = Number(prevScores[0]?.avgScore || 0);

      if (recentAvg > 0 && prevAvg > 0) {
        const diff = Math.round(recentAvg - prevAvg);
        const trend = diff > 5 ? "yükseliyor" : diff < -5 ? "düşüyor" : "stabil";
        const severity = diff < -10 ? "warning" : diff < -5 ? "info" : "positive";

        insights.push({
          type: "quiz_score_trends",
          severity,
          message: `Quiz puan trendi: ortalama %${Math.round(recentAvg)} (önceki dönem %${Math.round(prevAvg)}) — ${trend}`,
          data: { recentAvg: Math.round(recentAvg), prevAvg: Math.round(prevAvg), diff, trend },
          requiresAI: diff < -5,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] quiz_score_trends error:", err);
    }

    // ============================================
    // 6. BRANCH TRAINING COMPARISON
    // ============================================
    try {
      const branchActivity = await db
        .select({
          branchId: users.branchId,
          branchName: branches.name,
          activeUsers: sql<number>`COUNT(DISTINCT ${userTrainingProgress.userId})`,
          avgProgress: avg(userTrainingProgress.progressPercentage),
        })
        .from(userTrainingProgress)
        .innerJoin(users, eq(userTrainingProgress.userId, users.id))
        .innerJoin(branches, eq(users.branchId, branches.id))
        .where(gte(userTrainingProgress.lastAccessedAt, fourteenDaysAgo))
        .groupBy(users.branchId, branches.name);

      const allBranches = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.isActive, true));

      const activeBranchIds = new Set(branchActivity.map(b => b.branchId));
      const inactiveBranches = allBranches.filter(b => !activeBranchIds.has(b.id));

      if (inactiveBranches.length > 0 && inactiveBranches.length <= 10) {
        const names = inactiveBranches.map(b => b.name).slice(0, 5).join(", ");
        insights.push({
          type: "branch_training_comparison",
          severity: "warning",
          message: `${inactiveBranches.length} şubede son 14 günde eğitim aktivitesi yok: ${names}`,
          data: { inactiveBranches: inactiveBranches.map(b => ({ id: b.id, name: b.name })) },
          requiresAI: true,
        });
      }

      const lowBranches = branchActivity
        .filter(b => Number(b.avgProgress || 0) < 30 && Number(b.activeUsers || 0) > 0)
        .slice(0, 3);

      if (lowBranches.length > 0) {
        const names = lowBranches.map(b => `${b.branchName} (%${Math.round(Number(b.avgProgress || 0))})`).join(", ");
        insights.push({
          type: "branch_training_comparison",
          severity: "info",
          message: `Düşük eğitim ilerlemeli şubeler: ${names}`,
          data: { lowBranches },
          requiresAI: false,
        });
      }

      const topBranches = branchActivity
        .filter(b => Number(b.avgProgress || 0) >= 80)
        .slice(0, 3);

      if (topBranches.length > 0) {
        const names = topBranches.map(b => `${b.branchName} (%${Math.round(Number(b.avgProgress || 0))})`).join(", ");
        insights.push({
          type: "branch_training_comparison",
          severity: "positive",
          message: `En başarılı şubeler: ${names}`,
          data: { topBranches },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] branch_training_comparison error:", err);
    }

    // ============================================
    // 7. PERSONAL TRAINING RECOMMENDATIONS
    // ============================================
    try {
      const overdueAssignments = await db
        .select({
          userId: trainingAssignments.userId,
          userName: users.fullName,
          branchId: users.branchId,
          materialTitle: trainingMaterials.title,
          assignedAt: trainingAssignments.createdAt,
        })
        .from(trainingAssignments)
        .innerJoin(users, eq(trainingAssignments.userId, users.id))
        .innerJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .where(
          and(
            ne(trainingAssignments.status, "completed"),
            lte(trainingAssignments.createdAt, fourteenDaysAgo),
            eq(users.isActive, true)
          )
        )
        .limit(20);

      if (overdueAssignments.length > 0) {
        const employeeMap = new Map<string, { name: string; branchId: number | null; modules: string[] }>();
        for (const a of overdueAssignments) {
          const existing = employeeMap.get(a.userId) || { name: a.userName || "Bilinmiyor", branchId: a.branchId, modules: [] };
          existing.modules.push(a.materialTitle || "");
          employeeMap.set(a.userId, existing);
        }

        const employees = Array.from(employeeMap.entries()).map(([userId, data]) => ({
          userId,
          name: data.name,
          branchId: data.branchId,
          recommendation: `${data.name} — ${data.modules.length} zorunlu modül 14+ gündür tamamlanmadı: ${data.modules.slice(0, 2).join(", ")}`,
        })).slice(0, 10);

        insights.push({
          type: "personal_training_recommendations",
          severity: employees.length > 5 ? "warning" : "info",
          message: `${employees.length} çalışanın 14+ gündür tamamlanmamış eğitim ataması var`,
          data: { employees },
          requiresAI: true,
        });
      }

      const failedNotRetried = await db
        .select({
          userId: userQuizAttempts.userId,
          userName: users.fullName,
          branchId: users.branchId,
          quizTitle: moduleQuizzes.title,
          score: userQuizAttempts.score,
        })
        .from(userQuizAttempts)
        .innerJoin(users, eq(userQuizAttempts.userId, users.id))
        .innerJoin(moduleQuizzes, eq(userQuizAttempts.quizId, moduleQuizzes.id))
        .where(
          and(
            eq(userQuizAttempts.isPassed, false),
            gte(userQuizAttempts.completedAt, fourteenDaysAgo),
            eq(userQuizAttempts.attemptNumber, 1),
            eq(users.isActive, true)
          )
        )
        .limit(10);

      if (failedNotRetried.length > 0) {
        const names = failedNotRetried.slice(0, 3).map(f => `${f.userName} (${f.quizTitle})`).join(", ");
        insights.push({
          type: "personal_training_recommendations",
          severity: "info",
          message: `${failedNotRetried.length} çalışan quizde başarısız olup tekrar denemedi: ${names}`,
          data: { failedQuizUsers: failedNotRetried },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] personal_training_recommendations error:", err);
    }

    // ============================================
    // 8. ONBOARDING STATUS (via userTrainingProgress + onboarding modules)
    // ============================================
    try {
      const incompleteOnboarding = await db
        .select({
          userId: userTrainingProgress.userId,
          userName: users.fullName,
          branchId: users.branchId,
          moduleTitle: trainingModules.title,
          progressPct: userTrainingProgress.progressPercentage,
          createdAt: userTrainingProgress.createdAt,
        })
        .from(userTrainingProgress)
        .innerJoin(users, eq(userTrainingProgress.userId, users.id))
        .innerJoin(trainingModules, eq(userTrainingProgress.moduleId, trainingModules.id))
        .where(
          and(
            ne(userTrainingProgress.status, "completed"),
            lte(userTrainingProgress.createdAt, sevenDaysAgo),
            eq(trainingModules.category, "onboarding"),
            eq(users.isActive, true)
          )
        )
        .limit(15);

      if (incompleteOnboarding.length > 0) {
        const employeeMap = new Map<string, { name: string; branchId: number | null; modules: string[] }>();
        for (const o of incompleteOnboarding) {
          const existing = employeeMap.get(o.userId) || { name: o.userName || "Bilinmiyor", branchId: o.branchId, modules: [] };
          existing.modules.push(o.moduleTitle || "");
          employeeMap.set(o.userId, existing);
        }

        const employees = Array.from(employeeMap.entries()).map(([userId, data]) => ({
          userId,
          name: data.name,
          branchId: data.branchId,
          pendingModules: data.modules,
        }));

        const names = employees.slice(0, 3).map(e => e.name).join(", ");
        insights.push({
          type: "onboarding_status",
          severity: "warning",
          message: `${employees.length} çalışanın onboarding'i 7+ gündür tamamlanmadı: ${names}`,
          data: { employees },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] onboarding_status error:", err);
    }

    // ============================================
    // 9. USAGE / ENGAGEMENT REPORT
    // ============================================
    try {
      const branchUsage = await db
        .select({
          branchId: users.branchId,
          branchName: branches.name,
          activeUsers: sql<number>`COUNT(DISTINCT ${userTrainingProgress.userId})`,
        })
        .from(userTrainingProgress)
        .innerJoin(users, eq(userTrainingProgress.userId, users.id))
        .innerJoin(branches, eq(users.branchId, branches.id))
        .where(gte(userTrainingProgress.lastAccessedAt, sevenDaysAgo))
        .groupBy(users.branchId, branches.name);

      const branchTotals = await db
        .select({
          branchId: users.branchId,
          branchName: branches.name,
          totalUsers: count(),
        })
        .from(users)
        .innerJoin(branches, eq(users.branchId, branches.id))
        .where(eq(users.isActive, true))
        .groupBy(users.branchId, branches.name);

      const usageMap = new Map(branchUsage.map(b => [b.branchId, Number(b.activeUsers || 0)]));
      const usageRates: { name: string; rate: number; active: number; total: number }[] = [];

      for (const bt of branchTotals) {
        const active = usageMap.get(bt.branchId) || 0;
        const total = Number(bt.totalUsers || 0);
        if (total > 0) {
          usageRates.push({
            name: bt.branchName || "",
            rate: Math.round((active / total) * 100),
            active,
            total,
          });
        }
      }

      usageRates.sort((a, b) => b.rate - a.rate);

      if (usageRates.length > 0) {
        const top = usageRates[0];
        const bottom = usageRates[usageRates.length - 1];
        const lowUsage = usageRates.filter(u => u.rate < 20);
        const highUsage = usageRates.filter(u => u.rate >= 80);

        let msg = `Haftalık eğitim kullanım raporu: `;
        if (top.rate > 0) msg += `En yüksek: ${top.name} %${top.rate}. `;
        if (bottom.rate < top.rate) msg += `En düşük: ${bottom.name} %${bottom.rate}. `;
        if (lowUsage.length > 0) msg += `${lowUsage.length} şube %20 altında.`;

        insights.push({
          type: "usage_report",
          severity: lowUsage.length > 3 ? "warning" : "info",
          message: msg.trim(),
          data: { usageRates, highUsage, lowUsage },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] usage_report error:", err);
    }

    // ============================================
    // 10. CERTIFICATION & EXAM PIPELINE
    // ============================================
    try {
      const pendingExams = await db
        .select({
          id: examRequests.id,
          userId: examRequests.userId,
          userName: users.fullName,
          createdAt: examRequests.createdAt,
        })
        .from(examRequests)
        .innerJoin(users, eq(examRequests.userId, users.id))
        .where(
          and(
            eq(examRequests.status, "pending"),
            lte(examRequests.createdAt, threeDaysAgo)
          )
        )
        .limit(10);

      if (pendingExams.length > 0) {
        const names = pendingExams.slice(0, 3).map(e => e.userName).join(", ");
        insights.push({
          type: "certification_pipeline",
          severity: "warning",
          message: `${pendingExams.length} sınav talebi 3+ gündür bekliyor: ${names}`,
          data: { pendingExams },
          requiresAI: false,
        });
      }

      const recentCerts = await db
        .select({
          id: issuedCertificates.id,
          recipientName: issuedCertificates.recipientName,
          title: issuedCertificates.title,
          issuedAt: issuedCertificates.issuedAt,
        })
        .from(issuedCertificates)
        .where(
          and(
            gte(issuedCertificates.issuedAt, sevenDaysAgo),
            eq(issuedCertificates.isActive, true)
          )
        )
        .orderBy(desc(issuedCertificates.issuedAt))
        .limit(5);

      if (recentCerts.length > 0) {
        const certList = recentCerts.map(c => `${c.recipientName} (${c.title})`).join(", ");
        insights.push({
          type: "certification_pipeline",
          severity: "positive",
          message: `Bu hafta ${recentCerts.length} yeni sertifika verildi: ${certList}`,
          data: { recentCerts },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] certification_pipeline error:", err);
    }

    // ============================================
    // 11. QUIZ GAP DETECTION
    // ============================================
    try {
      const publishedModules = await db
        .select({
          moduleId: trainingModules.id,
          moduleTitle: trainingModules.title,
        })
        .from(trainingModules)
        .where(eq(trainingModules.isPublished, true));

      const modulesWithQuiz = await db
        .select({
          moduleId: moduleQuizzes.moduleId,
          questionCount: count(),
        })
        .from(moduleQuizzes)
        .innerJoin(quizQuestions, eq(moduleQuizzes.id, quizQuestions.quizId))
        .groupBy(moduleQuizzes.moduleId);

      const quizModuleIds = new Set(modulesWithQuiz.map(m => m.moduleId));
      const noQuizModules = publishedModules.filter(m => !quizModuleIds.has(m.moduleId));
      const fewQuestionModules = modulesWithQuiz.filter(m => Number(m.questionCount) < 5);

      if (noQuizModules.length > 0) {
        const names = noQuizModules.slice(0, 5).map(m => m.moduleTitle).join(", ");
        insights.push({
          type: "quiz_gap_detection",
          severity: noQuizModules.length > 5 ? "warning" : "info",
          message: `${noQuizModules.length} yayında modülde hiç quiz yok: ${names}`,
          data: { noQuizModules: noQuizModules.slice(0, 10) },
          requiresAI: false,
        });
      }

      if (fewQuestionModules.length > 0) {
        insights.push({
          type: "quiz_gap_detection",
          severity: "info",
          message: `${fewQuestionModules.length} modülde 5'ten az quiz sorusu var — soru havuzu genişletilmeli`,
          data: { fewQuestionModules },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[training-optimizer] quiz_gap_detection error:", err);
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      switch (insight.type) {
        case "overall_completion_rate": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: `Eğitim Özeti: %${insight.data.rate} tamamlama`,
            description: (insight as any).aiMessage || insight.message,
            deepLink: "/akademi-hq",
            severity: insight.severity === "warning" ? "med" : "low",
            category: "training",
            subcategory: "completion_rate",
            metadata: { rate: insight.data.rate, assigned: insight.data.assigned, completed: insight.data.completed, insightType: insight.type },
          });
          break;
        }

        case "low_completion_modules": {
          const moduleNames = (insight.data.modules || []).map((m: any) => m.title).slice(0, 2).join(", ");
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: `Modül İyileştirme Önerisi: ${moduleNames}`,
            description: (insight as any).aiMessage || insight.message,
            deepLink: "/akademi-hq",
            severity: "med",
            category: "training",
            subcategory: "low_completion",
            metadata: { insightType: insight.type },
          });
          break;
        }

        case "high_completion_modules": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Eğitim Başarısı",
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: "low",
            category: "training",
            subcategory: "high_completion",
            metadata: { insightType: insight.type },
          });
          break;
        }

        case "hardest_quiz_questions": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Quiz Soru Analizi",
            description: (insight as any).aiMessage || insight.message,
            deepLink: "/akademi-hq",
            severity: "med",
            category: "training",
            subcategory: "quiz_analysis",
            metadata: { insightType: insight.type, quizzes: insight.data.quizzes },
          });
          break;
        }

        case "quiz_score_trends": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: `Quiz Puan Trendi: ${insight.data.trend}`,
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: insight.severity === "warning" ? "med" : "low",
            category: "training",
            subcategory: "quiz_trends",
            metadata: { insightType: insight.type, ...insight.data },
          });
          break;
        }

        case "branch_training_comparison": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Şube Eğitim Karşılaştırması",
            description: (insight as any).aiMessage || insight.message,
            deepLink: "/akademi-hq",
            severity: insight.severity === "warning" ? "high" : insight.severity === "info" ? "med" : "low",
            category: "training",
            subcategory: "branch_comparison",
            metadata: { insightType: insight.type },
          });
          break;
        }

        case "personal_training_recommendations": {
          if (insight.data.employees && Array.isArray(insight.data.employees)) {
            for (const emp of insight.data.employees.slice(0, 5)) {
              actions.push({
                actionType: "report",
                targetUserId: context.userId,
                title: `Eğitim Takibi: ${emp.name}`,
                description: emp.recommendation || insight.message,
                deepLink: "/akademi-hq",
                severity: "med",
                category: "training",
                subcategory: "personal_recommendation",
                branchId: emp.branchId || undefined,
                metadata: { insightType: insight.type, employeeId: emp.userId, employeeName: emp.name },
              });
            }
          } else {
            actions.push({
              actionType: "report",
              targetUserId: context.userId,
              title: "Kişisel Eğitim Takibi",
              description: insight.message,
              deepLink: "/akademi-hq",
              severity: "med",
              category: "training",
              subcategory: "personal_recommendation",
              metadata: { insightType: insight.type },
            });
          }
          break;
        }

        case "onboarding_status": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Onboarding Durumu",
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: "high",
            category: "training",
            subcategory: "onboarding",
            metadata: { insightType: insight.type, employees: insight.data.employees },
          });
          break;
        }

        case "usage_report": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Haftalık Eğitim Kullanım Raporu",
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: "low",
            category: "training",
            subcategory: "usage",
            metadata: { insightType: insight.type },
          });
          break;
        }

        case "certification_pipeline": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Sertifika ve Sınav Durumu",
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: insight.severity === "warning" ? "med" : "low",
            category: "training",
            subcategory: "certification",
            metadata: { insightType: insight.type },
          });
          break;
        }

        case "quiz_gap_detection": {
          actions.push({
            actionType: "report",
            targetUserId: context.userId,
            title: "Quiz Eksiklik Tespiti",
            description: insight.message,
            deepLink: "/akademi-hq",
            severity: "med",
            category: "training",
            subcategory: "quiz_gaps",
            metadata: { insightType: insight.type },
          });
          break;
        }
      }
    }

    return actions;
  },
};

registerSkill(trainingOptimizerSkill);
export default trainingOptimizerSkill;
