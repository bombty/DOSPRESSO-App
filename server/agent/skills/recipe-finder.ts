/**
 * RECIPE FINDER SKILL — Mr.Dobody reçete öğrenme rehberi
 *
 * Yetki: coach, trainer, supervisor, mudur, admin
 * Schedule: daily
 *
 * Amaç:
 *   Yeni başlayan personelin (barista/bar_buddy/stajyer) reçete öğrenme
 *   sürecini takip eder, geri kalan veya quiz skoru düşük olanları tespit eder.
 *   Yöneticilere proaktif öneriler üretir.
 *
 * Insights:
 *   - "X personeli onboarding adımında ama 0 reçete açmış"
 *   - "Y personeli Z reçetesinde quiz skoru düşük (%50 altı, 3+ deneme)"
 *   - "W personel master olmaya yakın (1 reçete eksik)"
 *   - "V reçete bu şubede hiç açılmamış" (kullanılmayan içerik)
 *
 * Actions:
 *   - SuggestTask (coach): "X kişiye Y reçeteyi tekrar göster"
 *   - Alert (supervisor): "X personeli demo onayı bekliyor"
 *   - Report (trainer): "Bu hafta öğrenme istatistikleri"
 *
 * Aslan istek: 4 May 2026 — TASK-DOBODY-001
 */

import { db } from "../../db";
import {
  users,
  branchRecipes,
  branchProducts,
  branchRecipeLearningProgress,
  branchOnboardingSteps,
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  registerSkill,
  type AgentSkill,
  type SkillContext,
  type SkillInsight,
  type SkillAction,
} from "./skill-registry";

// Eğitim alan roller
const TRAINEE_ROLES = ["barista", "bar_buddy", "stajyer", "supervisor_buddy"];

// Quiz başarı eşiği
const LOW_QUIZ_THRESHOLD = 50;
const MIN_ATTEMPTS_FOR_ALERT = 3;

const recipeFinderSkill: AgentSkill = {
  id: "recipe_finder",
  name: "Reçete Öğrenme Takipçisi",
  description:
    "Personelin reçete öğrenme sürecini takip eder, geri kalanları ve düşük quiz skorlarını tespit edip yönetici için öneri üretir.",
  targetRoles: ["coach", "trainer", "supervisor", "mudur", "admin", "ceo", "cgo"],
  schedule: "daily",
  autonomyLevel: "suggest_approve",
  dataSources: [
    "users",
    "branchRecipes",
    "branchProducts",
    "branchRecipeLearningProgress",
    "branchOnboardingSteps",
  ],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const branchId = context.branchId;

      // Hedef personeli çek
      const userWhere = branchId
        ? and(
            eq(users.branchId, branchId),
            eq(users.isActive, true),
            inArray(users.role, TRAINEE_ROLES),
          )
        : and(eq(users.isActive, true), inArray(users.role, TRAINEE_ROLES));

      const trainees = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(userWhere)
        .limit(200);

      if (trainees.length === 0) return insights;

      const traineeIds = trainees.map((t) => t.id);
      const traineeMap = Object.fromEntries(trainees.map((t) => [t.id, t]));

      // Onboarding step'leri çek (hangi rolün hangi reçeteleri öğrenmesi gerek)
      const onboardingSteps = await db
        .select()
        .from(branchOnboardingSteps)
        .where(eq(branchOnboardingSteps.isActive, true));

      // Rol → recipeIds map
      const roleToRecipeIds: Record<string, Set<number>> = {};
      for (const step of onboardingSteps) {
        const recipeIds = (step.recipeIds || []) as number[];
        if (!roleToRecipeIds[step.targetRole]) {
          roleToRecipeIds[step.targetRole] = new Set();
        }
        recipeIds.forEach((id) => roleToRecipeIds[step.targetRole].add(id));
      }

      // Tüm trainee'lerin progress'ini çek
      const allProgress = await db
        .select()
        .from(branchRecipeLearningProgress)
        .where(inArray(branchRecipeLearningProgress.userId, traineeIds));

      // user → recipeId → progress
      const progressByUser: Record<string, Record<number, any>> = {};
      for (const p of allProgress) {
        if (!progressByUser[p.userId]) progressByUser[p.userId] = {};
        progressByUser[p.userId][p.recipeId] = p;
      }

      // Reçete adlarını çek
      const allRecipeIds = Array.from(
        new Set(
          Object.values(roleToRecipeIds).flatMap((s) => Array.from(s)),
        ),
      );
      const recipes =
        allRecipeIds.length > 0
          ? await db
              .select({
                id: branchRecipes.id,
                productId: branchRecipes.productId,
              })
              .from(branchRecipes)
              .where(inArray(branchRecipes.id, allRecipeIds))
          : [];

      const productIds = Array.from(new Set(recipes.map((r) => r.productId)));
      const products =
        productIds.length > 0
          ? await db
              .select({ id: branchProducts.id, name: branchProducts.name })
              .from(branchProducts)
              .where(inArray(branchProducts.id, productIds))
          : [];

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
      const recipeToProductName: Record<number, string> = {};
      for (const r of recipes) {
        recipeToProductName[r.id] = productMap[r.productId]?.name || `Reçete #${r.id}`;
      }

      // ── INSIGHT 1: Hiç reçete açmamış yeni başlayanlar ──────────
      const inactiveLearners: typeof trainees = [];
      for (const t of trainees) {
        const expectedRecipes = roleToRecipeIds[t.role || ""] || new Set();
        if (expectedRecipes.size === 0) continue;

        const userProgress = progressByUser[t.id] || {};
        const viewedCount = Array.from(expectedRecipes).filter(
          (rid) => (userProgress[rid]?.viewCount ?? 0) > 0,
        ).length;

        // Hiç açmamış (0 viewed) — onboarding bekleyen
        if (viewedCount === 0 && expectedRecipes.size > 0) {
          inactiveLearners.push(t);
        }
      }

      if (inactiveLearners.length > 0) {
        const names = inactiveLearners
          .slice(0, 3)
          .map((t) => `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim() || t.id);
        insights.push({
          type: "trainees_no_recipe_view",
          severity: "warning",
          message: `${inactiveLearners.length} yeni personel henüz hiç reçete açmamış: ${names.join(", ")}${inactiveLearners.length > 3 ? " ve diğerleri" : ""}`,
          data: {
            count: inactiveLearners.length,
            users: inactiveLearners.slice(0, 10).map((t) => ({
              userId: t.id,
              userName: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
              role: t.role,
              branchId: t.branchId,
            })),
            deepLink: "/branch-recipes/admin/onboarding",
          },
          requiresAI: false,
        });
      }

      // ── INSIGHT 2: Düşük quiz skoru (3+ deneme, <50%) ─────────
      const lowScoreEntries: Array<{
        userId: string;
        userName: string;
        recipeId: number;
        recipeName: string;
        attempts: number;
        bestScore: number;
      }> = [];

      for (const p of allProgress) {
        const attempts = p.quizAttempts ?? 0;
        const bestScore = p.bestScore ? Number(p.bestScore) : null;
        if (
          attempts >= MIN_ATTEMPTS_FOR_ALERT &&
          bestScore !== null &&
          bestScore < LOW_QUIZ_THRESHOLD
        ) {
          const t = traineeMap[p.userId];
          if (!t) continue;
          lowScoreEntries.push({
            userId: t.id,
            userName: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
            recipeId: p.recipeId,
            recipeName: recipeToProductName[p.recipeId] || `Reçete #${p.recipeId}`,
            attempts,
            bestScore,
          });
        }
      }

      if (lowScoreEntries.length > 0) {
        const examples = lowScoreEntries
          .slice(0, 3)
          .map((e) => `${e.userName} (${e.recipeName}, %${e.bestScore})`);
        insights.push({
          type: "low_quiz_score",
          severity: "critical",
          message: `${lowScoreEntries.length} reçetede quiz başarısı düşük (${MIN_ATTEMPTS_FOR_ALERT}+ deneme, %${LOW_QUIZ_THRESHOLD} altı): ${examples.join(", ")}`,
          data: {
            count: lowScoreEntries.length,
            entries: lowScoreEntries.slice(0, 15),
            deepLink: "/branch-recipes",
          },
          requiresAI: false,
        });
      }

      // ── INSIGHT 3: Demo onayı bekleyen kişiler ──────────
      const demoWaiters: Array<{
        userId: string;
        userName: string;
        recipeId: number;
        recipeName: string;
      }> = [];

      for (const p of allProgress) {
        const t = traineeMap[p.userId];
        if (!t) continue;

        const goodScore = p.bestScore && Number(p.bestScore) >= 70;
        const noDemo = !p.demoCompleted;

        // Quiz geçmiş ama demo onayı yok = demo bekliyor
        if (goodScore && noDemo && (p.viewCount ?? 0) > 0) {
          demoWaiters.push({
            userId: t.id,
            userName: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
            recipeId: p.recipeId,
            recipeName: recipeToProductName[p.recipeId] || `Reçete #${p.recipeId}`,
          });
        }
      }

      if (demoWaiters.length > 0) {
        const examples = demoWaiters
          .slice(0, 3)
          .map((d) => `${d.userName} → ${d.recipeName}`);
        insights.push({
          type: "demo_approval_pending",
          severity: "info",
          message: `${demoWaiters.length} demo onayı bekliyor: ${examples.join(", ")}${demoWaiters.length > 3 ? " ve diğerleri" : ""}`,
          data: {
            count: demoWaiters.length,
            waiters: demoWaiters.slice(0, 15),
            deepLink: "/branch-recipes",
          },
          requiresAI: false,
        });
      }

      // ── INSIGHT 4: Master olmaya yakın (≥%80 reçete tamam, son 1-2 eksik) ──
      const nearMaster: Array<{
        userId: string;
        userName: string;
        completedCount: number;
        totalCount: number;
        remaining: string[];
      }> = [];

      for (const t of trainees) {
        const expectedRecipes = roleToRecipeIds[t.role || ""];
        if (!expectedRecipes || expectedRecipes.size < 5) continue;

        const userProgress = progressByUser[t.id] || {};
        const completed: number[] = [];
        const remaining: number[] = [];

        for (const rid of Array.from(expectedRecipes)) {
          const p = userProgress[rid];
          const passed =
            p && p.bestScore && Number(p.bestScore) >= 70 && p.demoCompleted;
          if (passed) completed.push(rid);
          else remaining.push(rid);
        }

        const total = expectedRecipes.size;
        const ratio = total > 0 ? completed.length / total : 0;

        // %80 üstü ama %100 değil
        if (ratio >= 0.8 && ratio < 1) {
          nearMaster.push({
            userId: t.id,
            userName: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
            completedCount: completed.length,
            totalCount: total,
            remaining: remaining
              .slice(0, 3)
              .map((rid) => recipeToProductName[rid] || `#${rid}`),
          });
        }
      }

      if (nearMaster.length > 0) {
        const names = nearMaster.slice(0, 3).map((n) => n.userName);
        insights.push({
          type: "near_master",
          severity: "positive",
          message: `${nearMaster.length} personel onboarding'i tamamlamak üzere: ${names.join(", ")}`,
          data: {
            count: nearMaster.length,
            users: nearMaster.slice(0, 10),
            deepLink: "/branch-recipes/admin/onboarding",
          },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[RecipeFinder] error:", err);
    }

    return insights;
  },

  generateActions(insights, context): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      const data = insight.data || {};

      switch (insight.type) {
        case "trainees_no_recipe_view":
          // Coach/trainer için: yeni personele reçete tanıtımı yap
          actions.push({
            actionType: "suggest_task",
            targetRoleScope: "coach,trainer,supervisor,mudur",
            branchId: context.branchId,
            title: `${data.count} yeni personel reçete açmamış`,
            description: `Yeni başlayan personelin onboarding'i durmuş — ilk reçeteleri tanıtın. Birebir oturum önerilir.`,
            deepLink: data.deepLink || "/branch-recipes/admin/onboarding",
            severity: "high",
            skillId: "recipe_finder",
            category: "egitim",
            subcategory: "recete_baslangic",
            metadata: { users: data.users },
          });
          break;

        case "low_quiz_score":
          // Trainer için: düşük quiz skorlu reçeteleri tekrarlat
          actions.push({
            actionType: "alert",
            targetRoleScope: "coach,trainer",
            branchId: context.branchId,
            title: `${data.count} reçetede quiz başarısı düşük`,
            description: `${MIN_ATTEMPTS_FOR_ALERT}+ deneme yapan personel %${LOW_QUIZ_THRESHOLD} altında kalmış. Reçete videosunu/açıklamasını tekrar gözden geçirmek veya birebir tekrar yapmak gerekli.`,
            deepLink: data.deepLink || "/branch-recipes",
            severity: "critical",
            skillId: "recipe_finder",
            category: "egitim",
            subcategory: "quiz_basarisizlik",
            metadata: { entries: data.entries },
          });
          break;

        case "demo_approval_pending":
          // Supervisor için: demo onayı bekleyenler
          actions.push({
            actionType: "suggest_task",
            targetRoleScope: "supervisor,mudur",
            branchId: context.branchId,
            title: `${data.count} personel demo onayı bekliyor`,
            description: `Quiz'i geçen personeller demo (uygulama) onayı bekliyor. Bir vardiyada gözlem + onay yapın.`,
            deepLink: data.deepLink || "/branch-recipes",
            severity: "med",
            skillId: "recipe_finder",
            category: "egitim",
            subcategory: "demo_onay",
            metadata: { waiters: data.waiters },
          });
          break;

        case "near_master":
          // Coach için: master olmaya yakın olanları motivasyon
          actions.push({
            actionType: "report",
            targetRoleScope: "coach,trainer,mudur",
            branchId: context.branchId,
            title: `${data.count} personel onboarding'i bitirmek üzere`,
            description: `%80+ tamamlandı. Son 1-2 reçete + demo onayı ile master olabilirler. Motivasyon mesajı önerilir.`,
            deepLink: data.deepLink || "/branch-recipes/admin/onboarding",
            severity: "low",
            skillId: "recipe_finder",
            category: "egitim",
            subcategory: "near_master",
            metadata: { users: data.users },
          });
          break;
      }
    }

    return actions;
  },
};

registerSkill(recipeFinderSkill);
export default recipeFinderSkill;
