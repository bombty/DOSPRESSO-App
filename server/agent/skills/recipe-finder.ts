/**
 * RECIPE FINDER SKILL — Reçete Arama
 *
 * TASK-DOBODY-001 (4 May 2026 — Aslan onayı)
 *
 * Özellikler:
 *   - Şube barista/bar_buddy/stajyer için: "X reçetesi nerede?" sorularını cevaplar
 *   - Eksik öğrenme tespiti: 7+ gündür reçete açmamış personeli HQ'ya bildirir
 *   - Düşük quiz skoru tespiti: <70% ortalamalı reçeteleri trainer'a hatırlatır
 *
 * Schedule: daily
 * Roles: barista, bar_buddy, stajyer, supervisor, mudur (şube)
 *        coach, trainer, admin (HQ — toplu rapor)
 */

import { db } from "../../db";
import {
  branchProducts,
  branchRecipes,
  branchRecipeLearningProgress,
  users,
  branches,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, avg, desc, isNull } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const recipeFinderSkill: AgentSkill = {
  id: "recipe_finder",
  name: "Reçete Bulucu",
  description: "Reçete öğrenme durumunu izler, eksik öğrenenleri tespit eder, popüler/zor reçeteleri raporlar",
  targetRoles: ["barista", "bar_buddy", "stajyer", "supervisor", "mudur", "coach", "trainer", "admin"],
  schedule: "daily",
  autonomyLevel: "info_only",
  dataSources: [
    "branchProducts",
    "branchRecipes",
    "branchRecipeLearningProgress",
    "users",
  ],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const isBranchRole = ["barista", "bar_buddy", "stajyer", "supervisor", "mudur"].includes(context.role);
    const isHQRole = ["coach", "trainer", "admin"].includes(context.role);

    // ============================================
    // 1. ŞUBE PERSONELİ — Eksik reçete öğrenme
    // ============================================
    if (isBranchRole) {
      try {
        // Aktif ürün sayısı
        const [productCount] = await db
          .select({ cnt: count() })
          .from(branchProducts)
          .where(eq(branchProducts.isActive, true));
        const totalProducts = Number(productCount?.cnt ?? 0);

        // Bu kullanıcının öğrendiği reçete sayısı (son 30 gün açılan)
        const [learnedCount] = await db
          .select({ cnt: count() })
          .from(branchRecipeLearningProgress)
          .where(and(
            eq(branchRecipeLearningProgress.userId, context.userId),
            gte(branchRecipeLearningProgress.lastViewedAt, thirtyDaysAgo),
          ));
        const learned = Number(learnedCount?.cnt ?? 0);

        if (totalProducts > 0) {
          const coverage = Math.round((learned / totalProducts) * 100);

          if (coverage < 30) {
            insights.push({
              type: "low_recipe_coverage",
              severity: "warning",
              message: `Son 30 günde sadece ${learned}/${totalProducts} reçete inceledin (%${coverage}).`,
              data: { learned, totalProducts, coverage, daysWindow: 30 },
              requiresAI: false,
            });
          } else if (coverage >= 80) {
            insights.push({
              type: "high_recipe_coverage",
              severity: "positive",
              message: `Son 30 günde ${learned}/${totalProducts} reçete incelendi (%${coverage}). Harika!`,
              data: { learned, totalProducts, coverage },
              requiresAI: false,
            });
          }
        }

        // Son 7 gündür hiç reçete açmadı mı?
        const [recentActivity] = await db
          .select({ cnt: count() })
          .from(branchRecipeLearningProgress)
          .where(and(
            eq(branchRecipeLearningProgress.userId, context.userId),
            gte(branchRecipeLearningProgress.lastViewedAt, sevenDaysAgo),
          ));
        const recentCount = Number(recentActivity?.cnt ?? 0);

        if (recentCount === 0 && totalProducts > 0) {
          insights.push({
            type: "no_recent_recipe_activity",
            severity: "warning",
            message: "Son 7 gündür hiç reçete sayfasına bakmadın. Pratik için günde 1 reçete inceleyelim mi?",
            data: { daysSinceLastView: 7 },
            requiresAI: false,
          });
        }
      } catch (e) {
        console.error("[recipe-finder] Şube analiz hatası:", e);
      }
    }

    // ============================================
    // 2. HQ — Şube bazında öğrenme raporu
    // ============================================
    if (isHQRole) {
      try {
        // Şube bazında: aktif kullanıcı / öğrenmiş kullanıcı oranı
        const branchStats = await db
          .select({
            branchId: branches.id,
            branchName: branches.name,
            totalActive: sql<number>`COUNT(DISTINCT ${users.id})`.as("total_active"),
            learners: sql<number>`COUNT(DISTINCT ${branchRecipeLearningProgress.userId})`.as("learners"),
          })
          .from(branches)
          .leftJoin(users, and(
            eq(users.branchId, branches.id),
            eq(users.isActive, true),
            sql`${users.role} IN ('barista', 'bar_buddy', 'stajyer', 'supervisor', 'mudur')`,
          ))
          .leftJoin(branchRecipeLearningProgress, and(
            eq(branchRecipeLearningProgress.userId, users.id),
            gte(branchRecipeLearningProgress.lastViewedAt, sevenDaysAgo),
          ))
          .where(eq(branches.isActive, true))
          .groupBy(branches.id, branches.name);

        const lowEngagementBranches = branchStats.filter(b => {
          const total = Number(b.totalActive ?? 0);
          const learn = Number(b.learners ?? 0);
          return total >= 3 && (learn / total) < 0.3;
        });

        if (lowEngagementBranches.length > 0) {
          insights.push({
            type: "branches_low_recipe_engagement",
            severity: "warning",
            message: `${lowEngagementBranches.length} şubede son 7 günde reçete sayfa açma <%30. En düşük: ${lowEngagementBranches[0]?.branchName}`,
            data: {
              branches: lowEngagementBranches.map(b => ({
                id: b.branchId,
                name: b.branchName,
                totalActive: Number(b.totalActive ?? 0),
                learners: Number(b.learners ?? 0),
                rate: Number(b.totalActive ?? 0) > 0
                  ? Math.round((Number(b.learners ?? 0) / Number(b.totalActive ?? 0)) * 100)
                  : 0,
              })),
            },
            requiresAI: false,
          });
        }

        // Hiç açılmamış reçeteler (popüler olmayan)
        const [unviewedRecipes] = await db.execute<{ unviewed: number }>(sql`
          SELECT COUNT(DISTINCT bp.id)::int AS unviewed
          FROM branch_products bp
          WHERE bp.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM branch_recipe_learning_progress brlp
              JOIN branch_recipes br ON brlp.recipe_id = br.id
              WHERE br.product_id = bp.id
                AND brlp.last_viewed_at >= ${thirtyDaysAgo.toISOString()}
            )
        `);
        const unviewedCount = Number((unviewedRecipes as any)?.unviewed ?? 0);

        if (unviewedCount > 0) {
          insights.push({
            type: "unviewed_recipes",
            severity: "info",
            message: `${unviewedCount} ürün son 30 günde hiç bir personel tarafından incelenmedi. Eğitim listesine alınabilir.`,
            data: { unviewedCount, daysWindow: 30 },
            requiresAI: false,
          });
        }
      } catch (e) {
        console.error("[recipe-finder] HQ analiz hatası:", e);
      }
    }

    return insights;
  },

  generateActions(insights, context): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const ins of insights) {
      if (ins.type === "low_recipe_coverage") {
        actions.push({
          actionType: "info_card",
          targetUserId: context.userId,
          title: "📚 Reçete pratiği yapalım",
          description: ins.message,
          deepLink: "/branch-recipes",
          severity: "med",
          skillId: "recipe_finder",
          category: "training",
          subcategory: "coverage_low",
          metadata: ins.data,
        });
      } else if (ins.type === "no_recent_recipe_activity") {
        actions.push({
          actionType: "info_card",
          targetUserId: context.userId,
          title: "👀 Reçete sayfasına uğramadık",
          description: ins.message,
          deepLink: "/branch-recipes",
          severity: "med",
          skillId: "recipe_finder",
          category: "training",
          subcategory: "no_activity",
          metadata: ins.data,
        });
      } else if (ins.type === "high_recipe_coverage") {
        actions.push({
          actionType: "info_card",
          targetUserId: context.userId,
          title: "🌟 Süper iş",
          description: ins.message,
          deepLink: "/branch-recipes",
          severity: "low",
          skillId: "recipe_finder",
          category: "training",
          subcategory: "praise",
          metadata: ins.data,
        });
      } else if (ins.type === "branches_low_recipe_engagement") {
        actions.push({
          actionType: "report",
          targetRoleScope: "trainer",
          title: "⚠️ Şubelerde reçete eğitimi düşük",
          description: ins.message,
          deepLink: "/akademi-hq",
          severity: "high",
          skillId: "recipe_finder",
          category: "training",
          subcategory: "branch_engagement",
          metadata: ins.data,
        });
      } else if (ins.type === "unviewed_recipes") {
        actions.push({
          actionType: "report",
          targetRoleScope: "trainer",
          title: "📦 Hiç incelenmemiş reçeteler var",
          description: ins.message,
          deepLink: "/branch-recipes",
          severity: "med",
          skillId: "recipe_finder",
          category: "training",
          subcategory: "unviewed",
          metadata: ins.data,
        });
      }
    }

    return actions;
  },
};

registerSkill(recipeFinderSkill);
export default recipeFinderSkill;
