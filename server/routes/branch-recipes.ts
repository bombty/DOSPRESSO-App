/**
 * BRANCH RECIPES API
 *
 * Şube reçete sistemi endpoint'leri.
 * Erişim: Şube barista/supervisor/mudur + HQ rolleri (admin/ceo).
 * Fabrika rolleri (fabrika_*, sef, recete_gm) bu endpoint'lere erişemez.
 *
 * Yeni endpoint'ler:
 *   GET  /api/branch-recipes           — Tüm reçeteler (filtreli)
 *   GET  /api/branch-recipes/:id       — Reçete detay (malzeme + adım)
 *   GET  /api/branch-products          — Ürün listesi
 *   GET  /api/branch-products/:id      — Ürün detay (reçete ile)
 *   GET  /api/branch-recipes/search    — Arama
 *   GET  /api/branch-recipes/categories — Kategori listesi
 *
 * Quiz endpoint'leri:
 *   GET  /api/branch-recipes/:id/quizzes — Reçete quiz soruları
 *   POST /api/branch-recipes/:id/quizzes/attempt — Quiz cevap
 *
 * Onboarding endpoint'leri:
 *   GET  /api/branch-onboarding/:role  — Rol bazlı onboarding adımları
 *   GET  /api/branch-recipes/learning-progress — Kullanıcı öğrenme durumu
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  branchProducts,
  branchRecipes,
  branchRecipeIngredients,
  branchRecipeSteps,
  branchRecipeQuizzes,
  branchOnboardingSteps,
  branchRecipeLearningProgress,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// ──────────────────────────────────────
// Yetki kontrol — Şube rolleri + HQ
// ──────────────────────────────────────
const ALLOWED_VIEW_ROLES = [
  // Şube rolleri
  'mudur', 'supervisor', 'sup_buddy', 'barista', 'bar_buddy', 'stajyer',
  // HQ rolleri (yönetim/eğitim için)
  'admin', 'ceo', 'cgo', 'coach', 'trainer',
  // Eğitim/akademi rolleri
  'destek', 'teknik',
];

const ALLOWED_EDIT_ROLES = [
  'admin', 'ceo', 'coach', 'trainer', // Sadece HQ + eğitim
];

function canView(role: string): boolean {
  return ALLOWED_VIEW_ROLES.includes(role);
}

function canEdit(role: string): boolean {
  return ALLOWED_EDIT_ROLES.includes(role);
}

// ──────────────────────────────────────
// GET /api/branch-products
// Tüm şube ürünlerini getirir
// ──────────────────────────────────────
router.get("/api/branch-products", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const { category, isActive, search } = req.query;
    const conditions: any[] = [];

    if (category) {
      conditions.push(eq(branchProducts.category, category as string));
    }
    if (isActive !== undefined) {
      conditions.push(eq(branchProducts.isActive, isActive === 'true'));
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(or(
        ilike(branchProducts.name, term),
        ilike(branchProducts.shortCode, term),
      ));
    }

    const products = conditions.length > 0
      ? await db.select().from(branchProducts).where(and(...conditions))
          .orderBy(branchProducts.displayOrder, branchProducts.name)
      : await db.select().from(branchProducts)
          .orderBy(branchProducts.displayOrder, branchProducts.name);

    res.json(products);
  } catch (error: any) {
    console.error("[branch-products] GET hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-products/:id
// Tek ürün + reçeteleri (boy bazlı)
// ──────────────────────────────────────
router.get("/api/branch-products/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const id = Number(req.params.id);
    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, id));

    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    // Reçeteleri getir (boy bazlı)
    const recipes = await db.select().from(branchRecipes)
      .where(and(
        eq(branchRecipes.productId, id),
        eq(branchRecipes.isActive, true),
      ))
      .orderBy(branchRecipes.size);

    res.json({ product, recipes });
  } catch (error: any) {
    console.error("[branch-products/:id] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/search?q=...
// ÖNEMLI: Bu route /:id'den ÖNCE olmalı (Express sıra)
// ──────────────────────────────────────
router.get("/api/branch-recipes/search", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const q = (req.query.q as string ?? '').trim();
    if (q.length < 2) {
      return res.json([]);
    }

    const term = `%${q}%`;

    const productMatches = await db.select({
      id: branchProducts.id,
      name: branchProducts.name,
      shortCode: branchProducts.shortCode,
      category: branchProducts.category,
      matchType: sql<string>`'product'`,
    })
      .from(branchProducts)
      .where(and(
        eq(branchProducts.isActive, true),
        or(
          ilike(branchProducts.name, term),
          ilike(branchProducts.shortCode, term),
        ),
      ))
      .limit(20);

    const ingredientMatches = await db.selectDistinct({
      id: branchProducts.id,
      name: branchProducts.name,
      shortCode: branchProducts.shortCode,
      category: branchProducts.category,
      matchType: sql<string>`'ingredient'`,
    })
      .from(branchProducts)
      .innerJoin(branchRecipes, eq(branchRecipes.productId, branchProducts.id))
      .innerJoin(branchRecipeIngredients, eq(branchRecipeIngredients.recipeId, branchRecipes.id))
      .where(and(
        eq(branchProducts.isActive, true),
        ilike(branchRecipeIngredients.ingredientName, term),
      ))
      .limit(10);

    const seen = new Set<number>();
    const combined = [...productMatches, ...ingredientMatches].filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    res.json(combined);
  } catch (error: any) {
    console.error("[branch-recipes/search] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/categories
// ÖNEMLI: Bu route /:id'den ÖNCE olmalı (Express sıra)
// ──────────────────────────────────────
router.get("/api/branch-recipes/categories", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const categories = await db.select({
      category: branchProducts.category,
      count: sql<number>`count(*)::int`,
    })
      .from(branchProducts)
      .where(eq(branchProducts.isActive, true))
      .groupBy(branchProducts.category)
      .orderBy(branchProducts.category);

    res.json(categories);
  } catch (error: any) {
    console.error("[branch-recipes/categories] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/learning-progress
// ÖNEMLI: Bu route /:id'den ÖNCE olmalı (Express sıra)
// ──────────────────────────────────────
router.get("/api/branch-recipes/learning-progress", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const progress = await db.select({
      recipeId: branchRecipeLearningProgress.recipeId,
      viewCount: branchRecipeLearningProgress.viewCount,
      quizAttempts: branchRecipeLearningProgress.quizAttempts,
      quizCorrect: branchRecipeLearningProgress.quizCorrect,
      bestScore: branchRecipeLearningProgress.bestScore,
      demoCompleted: branchRecipeLearningProgress.demoCompleted,
      masteredAt: branchRecipeLearningProgress.masteredAt,
      productName: branchProducts.name,
      size: branchRecipes.size,
    })
      .from(branchRecipeLearningProgress)
      .innerJoin(branchRecipes, eq(branchRecipes.id, branchRecipeLearningProgress.recipeId))
      .innerJoin(branchProducts, eq(branchProducts.id, branchRecipes.productId))
      .where(eq(branchRecipeLearningProgress.userId, userId))
      .orderBy(desc(branchRecipeLearningProgress.lastViewedAt));

    res.json(progress);
  } catch (error: any) {
    console.error("[learning-progress] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/:id
// Reçete detay — malzeme + adım + quiz sayısı
// ──────────────────────────────────────
router.get("/api/branch-recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));

    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, recipe.productId));

    const ingredients = await db.select().from(branchRecipeIngredients)
      .where(eq(branchRecipeIngredients.recipeId, id))
      .orderBy(branchRecipeIngredients.stepOrder);

    const steps = await db.select().from(branchRecipeSteps)
      .where(eq(branchRecipeSteps.recipeId, id))
      .orderBy(branchRecipeSteps.stepOrder);

    const [quizCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(branchRecipeQuizzes)
      .where(and(
        eq(branchRecipeQuizzes.recipeId, id),
        eq(branchRecipeQuizzes.isActive, true),
      ));

    // Görüntüleme kaydet
    await trackRecipeView(req.user.id, id);

    res.json({
      product,
      recipe,
      ingredients,
      steps,
      quizCount: quizCount.count,
    });
  } catch (error: any) {
    console.error("[branch-recipes/:id] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/:id/quizzes
// Reçete quiz soruları (rastgele 3-5)
// ──────────────────────────────────────
router.get("/api/branch-recipes/:id/quizzes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }
    const limit = Math.min(Number(req.query.limit ?? 5), 10);

    const quizzes = await db.select().from(branchRecipeQuizzes)
      .where(and(
        eq(branchRecipeQuizzes.recipeId, id),
        eq(branchRecipeQuizzes.isActive, true),
      ))
      .orderBy(sql`random()`)
      .limit(limit);

    // correctAnswer'ı önceden gösterme — frontend submit sonrası kontrol eder
    const sanitized = quizzes.map(q => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType,
      options: q.options,
      difficulty: q.difficulty,
      focusArea: q.focusArea,
    }));

    res.json(sanitized);
  } catch (error: any) {
    console.error("[branch-recipes/:id/quizzes] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/branch-recipes/quizzes/:quizId/attempt
// Quiz cevap submit
// ──────────────────────────────────────
router.post("/api/branch-recipes/quizzes/:quizId/attempt", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const quizId = Number(req.params.quizId);
    const { answer } = req.body;

    const [quiz] = await db.select().from(branchRecipeQuizzes).where(eq(branchRecipeQuizzes.id, quizId));
    if (!quiz) {
      return res.status(404).json({ error: "Quiz bulunamadı" });
    }

    const isCorrect = String(answer).trim().toLowerCase() === String(quiz.correctAnswer).trim().toLowerCase();

    // Öğrenme ilerlemesini güncelle
    const userId = req.user.id;
    const recipeId = quiz.recipeId;

    const [progress] = await db.select().from(branchRecipeLearningProgress)
      .where(and(
        eq(branchRecipeLearningProgress.userId, userId),
        eq(branchRecipeLearningProgress.recipeId, recipeId),
      ));

    if (progress) {
      await db.update(branchRecipeLearningProgress)
        .set({
          quizAttempts: (progress.quizAttempts ?? 0) + 1,
          quizCorrect: (progress.quizCorrect ?? 0) + (isCorrect ? 1 : 0),
          updatedAt: new Date(),
        })
        .where(eq(branchRecipeLearningProgress.id, progress.id));
    } else {
      await db.insert(branchRecipeLearningProgress).values({
        userId,
        recipeId,
        quizAttempts: 1,
        quizCorrect: isCorrect ? 1 : 0,
      });
    }

    res.json({
      isCorrect,
      correctAnswer: quiz.correctAnswer,
      explanation: quiz.explanation,
    });
  } catch (error: any) {
    console.error("[quizzes/:id/attempt] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-onboarding/:role
// Rol bazlı onboarding adımları
// ──────────────────────────────────────
router.get("/api/branch-onboarding/:role", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Bu kaynağa erişim yetkiniz yok" });
    }

    const role = req.params.role;
    const steps = await db.select().from(branchOnboardingSteps)
      .where(and(
        eq(branchOnboardingSteps.targetRole, role),
        eq(branchOnboardingSteps.isActive, true),
      ))
      .orderBy(branchOnboardingSteps.stepNumber);

    res.json(steps);
  } catch (error: any) {
    console.error("[branch-onboarding/:role] hatası:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// Helper: Görüntüleme kaydet
// ──────────────────────────────────────
async function trackRecipeView(userId: string, recipeId: number) {
  try {
    const [existing] = await db.select().from(branchRecipeLearningProgress)
      .where(and(
        eq(branchRecipeLearningProgress.userId, userId),
        eq(branchRecipeLearningProgress.recipeId, recipeId),
      ));

    if (existing) {
      await db.update(branchRecipeLearningProgress)
        .set({
          viewCount: (existing.viewCount ?? 0) + 1,
          lastViewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(branchRecipeLearningProgress.id, existing.id));
    } else {
      await db.insert(branchRecipeLearningProgress).values({
        userId,
        recipeId,
        viewCount: 1,
        lastViewedAt: new Date(),
      });
    }
  } catch (err) {
    // İlerleme kaydı hata verirse ana endpoint'i bozma
    console.warn("[trackRecipeView] hata (ignored):", err);
  }
}

export default router;
