/**
 * RECIPE FINDER SKILL — Reçete Öğrenme Proaktif Rehber (DOBODY-001)
 *
 * Mr.Dobody'nin şube personeline reçete öğrenme konusunda yardımı.
 *
 * Hedef roller: stajyer, bar_buddy, barista, supervisor_buddy, supervisor
 *
 * Insight tipleri:
 * - onboarding_next_step: Onboarding'de sıradaki adım nedir
 * - low_quiz_score: Quiz puanı düşük olan reçete
 * - stale_recipes: 30+ gündür bakılmamış reçete
 * - mastery_close: Master olmaya yakın reçete (95%+ ama henüz tamamlanmamış)
 *
 * 4 May 2026 — TASK-DOBODY-001
 */

import { db } from "../../db";
import {
  branchOnboardingSteps,
  branchRecipes,
  branchProducts,
  branchRecipeLearningProgress,
  users,
} from "@shared/schema";
import { eq, and, lt, desc, isNull, isNotNull, sql, inArray } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const recipeFinderSkill: AgentSkill = {
  id: "recipe_finder",
  name: "Reçete Rehberi",
  description: "Şube personeline reçete öğrenme konusunda proaktif rehberlik (onboarding adımları, düşük quiz puanları, eskiyen bilgi tazeleme)",
  targetRoles: ["stajyer", "bar_buddy", "barista", "supervisor_buddy", "supervisor"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: [
    "branchOnboardingSteps",
    "branchRecipeLearningProgress",
    "branchRecipes",
    "branchProducts",
  ],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const role = context.role;
    const userId = context.userId;

    // ─────────────────────────────────────────────────────────
    // 1) ONBOARDING — Sıradaki adım var mı?
    // ─────────────────────────────────────────────────────────
    try {
      const onboardingSteps = await db
        .select()
        .from(branchOnboardingSteps)
        .where(and(
          eq(branchOnboardingSteps.targetRole, role),
          eq(branchOnboardingSteps.isActive, true),
        ))
        .orderBy(branchOnboardingSteps.stepNumber);

      if (onboardingSteps.length > 0) {
        // Tüm reçete ID'lerini topla
        const allRecipeIds = new Set<number>();
        for (const s of onboardingSteps) {
          for (const rid of (s.recipeIds || [])) allRecipeIds.add(rid);
        }

        if (allRecipeIds.size > 0) {
          const progress = await db
            .select()
            .from(branchRecipeLearningProgress)
            .where(and(
              eq(branchRecipeLearningProgress.userId, userId),
              inArray(branchRecipeLearningProgress.recipeId, Array.from(allRecipeIds)),
            ));

          const progressByRecipe = new Map(progress.map(p => [p.recipeId, p]));

          // Sıradaki tamamlanmamış adımı bul
          let nextStep = null;
          let totalSteps = onboardingSteps.length;
          let completedSteps = 0;

          for (const step of onboardingSteps) {
            const recipeIds = step.recipeIds || [];
            const total = recipeIds.length;

            if (total === 0) {
              completedSteps++;
              continue;
            }

            const masteredCount = recipeIds.filter(rid => {
              const p = progressByRecipe.get(rid);
              return p && p.masteredAt;
            }).length;

            const isComplete = masteredCount === total;

            if (isComplete) {
              completedSteps++;
            } else if (!nextStep) {
              nextStep = {
                id: step.id,
                stepNumber: step.stepNumber,
                title: step.title,
                masteredCount,
                totalRecipes: total,
                percentComplete: Math.round((masteredCount / total) * 100),
              };
            }
          }

          if (nextStep) {
            insights.push({
              type: "onboarding_next_step",
              severity: "info",
              message: `Onboarding ilerlemesi: ${completedSteps}/${totalSteps} adım. Sıradaki: "${nextStep.title}"`,
              data: {
                nextStep,
                completedSteps,
                totalSteps,
                overallPercent: Math.round((completedSteps / totalSteps) * 100),
              },
              requiresAI: false,
            });
          } else if (completedSteps === totalSteps && totalSteps > 0) {
            insights.push({
              type: "onboarding_complete",
              severity: "positive",
              message: `${role.toUpperCase()} rolü için tüm onboarding adımlarını tamamladın!`,
              data: { totalSteps, role },
              requiresAI: false,
            });
          }
        }
      }
    } catch (error) {
      console.error("[recipe-finder] onboarding analiz hatası:", error instanceof Error ? error.message : error);
    }

    // ─────────────────────────────────────────────────────────
    // 2) DÜŞÜK QUIZ PUANI — bestScore < 70 olan reçeteler
    // ─────────────────────────────────────────────────────────
    try {
      const lowScoreRecipes = await db
        .select({
          progressId: branchRecipeLearningProgress.id,
          recipeId: branchRecipeLearningProgress.recipeId,
          bestScore: branchRecipeLearningProgress.bestScore,
          quizAttempts: branchRecipeLearningProgress.quizAttempts,
          productName: branchProducts.name,
          productId: branchProducts.id,
          recipeSize: branchRecipes.size,
        })
        .from(branchRecipeLearningProgress)
        .innerJoin(branchRecipes, eq(branchRecipes.id, branchRecipeLearningProgress.recipeId))
        .innerJoin(branchProducts, eq(branchProducts.id, branchRecipes.productId))
        .where(and(
          eq(branchRecipeLearningProgress.userId, userId),
          isNotNull(branchRecipeLearningProgress.bestScore),
          sql`${branchRecipeLearningProgress.bestScore}::numeric < 70`,
          eq(branchRecipes.isActive, true),
        ))
        .limit(3);

      if (lowScoreRecipes.length > 0) {
        insights.push({
          type: "low_quiz_score",
          severity: "warning",
          message: `${lowScoreRecipes.length} reçetede quiz puanın düşük (<70). Tekrar dene!`,
          data: {
            recipes: lowScoreRecipes.map(r => ({
              productId: r.productId,
              productName: r.productName,
              recipeSize: r.recipeSize,
              bestScore: r.bestScore,
              attempts: r.quizAttempts,
            })),
          },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[recipe-finder] quiz score analiz hatası:", error instanceof Error ? error.message : error);
    }

    // ─────────────────────────────────────────────────────────
    // 3) ESKİYEN BİLGİ — 30+ gündür bakılmamış mastered reçete
    // ─────────────────────────────────────────────────────────
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const staleRecipes = await db
        .select({
          recipeId: branchRecipeLearningProgress.recipeId,
          masteredAt: branchRecipeLearningProgress.masteredAt,
          lastViewedAt: branchRecipeLearningProgress.lastViewedAt,
          productName: branchProducts.name,
          productId: branchProducts.id,
        })
        .from(branchRecipeLearningProgress)
        .innerJoin(branchRecipes, eq(branchRecipes.id, branchRecipeLearningProgress.recipeId))
        .innerJoin(branchProducts, eq(branchProducts.id, branchRecipes.productId))
        .where(and(
          eq(branchRecipeLearningProgress.userId, userId),
          isNotNull(branchRecipeLearningProgress.masteredAt),
          eq(branchRecipes.isActive, true),
          sql`(${branchRecipeLearningProgress.lastViewedAt} IS NULL OR ${branchRecipeLearningProgress.lastViewedAt} < ${thirtyDaysAgo.toISOString()})`,
        ))
        .limit(3);

      if (staleRecipes.length >= 2) {
        // Sadece 2+ varsa anlamlı
        insights.push({
          type: "stale_recipes",
          severity: "info",
          message: `${staleRecipes.length} reçeteyi 30+ gündür açmadın — bilgini tazele!`,
          data: {
            recipes: staleRecipes.map(r => ({
              productId: r.productId,
              productName: r.productName,
            })),
          },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[recipe-finder] stale recipes hatası:", error instanceof Error ? error.message : error);
    }

    // ─────────────────────────────────────────────────────────
    // 4) MASTERY YAKINI — bestScore >= 80 ama henüz mastered değil
    // ─────────────────────────────────────────────────────────
    try {
      const closeToMastery = await db
        .select({
          recipeId: branchRecipeLearningProgress.recipeId,
          bestScore: branchRecipeLearningProgress.bestScore,
          demoCompleted: branchRecipeLearningProgress.demoCompleted,
          productName: branchProducts.name,
          productId: branchProducts.id,
        })
        .from(branchRecipeLearningProgress)
        .innerJoin(branchRecipes, eq(branchRecipes.id, branchRecipeLearningProgress.recipeId))
        .innerJoin(branchProducts, eq(branchProducts.id, branchRecipes.productId))
        .where(and(
          eq(branchRecipeLearningProgress.userId, userId),
          isNull(branchRecipeLearningProgress.masteredAt),
          isNotNull(branchRecipeLearningProgress.bestScore),
          sql`${branchRecipeLearningProgress.bestScore}::numeric >= 80`,
          eq(branchRecipes.isActive, true),
        ))
        .limit(2);

      if (closeToMastery.length > 0) {
        insights.push({
          type: "mastery_close",
          severity: "positive",
          message: `${closeToMastery.length} reçetede ustalığa çok yakınsın — son adımı at!`,
          data: {
            recipes: closeToMastery.map(r => ({
              productId: r.productId,
              productName: r.productName,
              bestScore: r.bestScore,
              demoCompleted: r.demoCompleted,
              missingDemo: !r.demoCompleted,
            })),
          },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[recipe-finder] mastery_close hatası:", error instanceof Error ? error.message : error);
    }

    return insights;
  },

  generateActions(insights, context): SkillAction[] {
    const actions: SkillAction[] = [];

    // Onboarding sıradaki adım — orta öncelikli aksiyon
    const onboardingNext = insights.find(i => i.type === "onboarding_next_step");
    if (onboardingNext) {
      const ns = onboardingNext.data.nextStep;
      actions.push({
        actionType: "suggest_task",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: `Reçete Onboarding: ${ns.title}`,
        description: `${ns.masteredCount}/${ns.totalRecipes} reçete tamamlandı (%${ns.percentComplete}). Sıradaki adımı tamamlamak için reçeteler sayfasına git.`,
        deepLink: "/branch-recipes",
        severity: "low",
        category: "training",
        subcategory: "onboarding",
        skillId: "recipe_finder",
        metadata: {
          stepId: ns.id,
          stepNumber: ns.stepNumber,
          completedSteps: onboardingNext.data.completedSteps,
          totalSteps: onboardingNext.data.totalSteps,
          overallPercent: onboardingNext.data.overallPercent,
        },
      });
    }

    // Onboarding tamamlandı — kutlama
    const onboardingDone = insights.find(i => i.type === "onboarding_complete");
    if (onboardingDone) {
      actions.push({
        actionType: "celebrate",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: "🎉 Onboarding Tamamlandı!",
        description: `Tüm ${onboardingDone.data.totalSteps} reçete onboarding adımını başarıyla tamamladın. Tebrikler!`,
        deepLink: "/branch-recipes",
        severity: "low",
        category: "training",
        subcategory: "onboarding_complete",
        skillId: "recipe_finder",
        metadata: { totalSteps: onboardingDone.data.totalSteps, role: onboardingDone.data.role },
      });
    }

    // Düşük quiz puanları — uyarı
    const lowScore = insights.find(i => i.type === "low_quiz_score");
    if (lowScore) {
      const recipeNames = lowScore.data.recipes.map((r: any) => r.productName).slice(0, 3).join(", ");
      actions.push({
        actionType: "suggest_task",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: "Quiz Tekrarı Önerisi",
        description: `Quiz puanın düşük olan reçeteler: ${recipeNames}. Tekrar deneyerek puanı yükseltebilirsin.`,
        deepLink: "/branch-recipes",
        severity: "med",
        category: "training",
        subcategory: "quiz_retry",
        skillId: "recipe_finder",
        metadata: {
          lowScoreCount: lowScore.data.recipes.length,
          recipes: lowScore.data.recipes,
        },
      });
    }

    // Eskiyen bilgi
    const stale = insights.find(i => i.type === "stale_recipes");
    if (stale) {
      const names = stale.data.recipes.map((r: any) => r.productName).slice(0, 3).join(", ");
      actions.push({
        actionType: "remind",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: "Reçete Bilgini Tazele",
        description: `30+ gündür açmadığın reçeteler: ${names}. Hızlı bir göz atış müşteri sorularına hazır olmana yardımcı olur.`,
        deepLink: "/branch-recipes",
        severity: "low",
        category: "training",
        subcategory: "knowledge_refresh",
        skillId: "recipe_finder",
        metadata: { staleCount: stale.data.recipes.length, recipes: stale.data.recipes },
      });
    }

    // Mastery yakın
    const mastery = insights.find(i => i.type === "mastery_close");
    if (mastery) {
      const names = mastery.data.recipes.map((r: any) => r.productName).join(", ");
      const needsDemo = mastery.data.recipes.some((r: any) => r.missingDemo);
      const desc = needsDemo
        ? `Quiz puanın iyi (${names}). Süpervizöre demo göstererek ustalaşabilirsin.`
        : `${names} için son adımdasın — biraz daha çabayla ustalık kazanırsın.`;
      actions.push({
        actionType: "suggest_task",
        targetUserId: context.userId,
        branchId: context.branchId,
        title: "Ustalığa Çok Yakınsın!",
        description: desc,
        deepLink: "/branch-recipes",
        severity: "low",
        category: "training",
        subcategory: "mastery_push",
        skillId: "recipe_finder",
        metadata: { recipes: mastery.data.recipes },
      });
    }

    return actions;
  },
};

registerSkill(recipeFinderSkill);
export default recipeFinderSkill;
