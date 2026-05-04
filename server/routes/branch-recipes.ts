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
  branchAromaOptions,
  branchRecipeAromaCompatibility,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, inArray, asc } from "drizzle-orm";
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
  // 4 May 2026 - Aslan onayı: HQ rolleri reçete düzenleyebilmeli
  'admin', 'ceo', 'cgo', 'coach', 'trainer',
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

// ════════════════════════════════════════════════════════════════
// ONBOARDING ADMIN ENDPOINTS (TASK-ONBOARDING-001 — 4 May 2026)
// ════════════════════════════════════════════════════════════════

// ──────────────────────────────────────
// GET /api/branch-onboarding-admin/all
// Tüm rollerin onboarding adımları (admin paneli için, isActive filtre yok)
// ──────────────────────────────────────
router.get("/api/branch-onboarding-admin/all", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Yönetim yetkiniz yok" });
    }

    const all = await db.select().from(branchOnboardingSteps)
      .orderBy(asc(branchOnboardingSteps.targetRole), asc(branchOnboardingSteps.stepNumber));

    // Rolleri grupla
    const grouped: Record<string, any[]> = {};
    for (const step of all) {
      if (!grouped[step.targetRole]) grouped[step.targetRole] = [];
      grouped[step.targetRole].push(step);
    }

    res.json({
      steps: all,
      grouped,
      roles: Object.keys(grouped),
      total: all.length,
    });
  } catch (error: any) {
    console.error("[GET branch-onboarding-admin/all] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PUT /api/branch-onboarding-admin/:role
// Belirli rolün tüm onboarding adımlarını topluca güncelle (replace all)
// Body: { steps: [{ stepNumber, title, description, recipeIds, estimatedMinutes, ... }] }
// ──────────────────────────────────────
router.put("/api/branch-onboarding-admin/:role", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const role = req.params.role;
    const { steps } = req.body;

    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: "steps dizi olmalı" });
    }

    // Validation: stepNumber'lar unique ve >=1
    const stepNumbers = steps.map((s: any) => s.stepNumber);
    const uniqueStepNumbers = new Set(stepNumbers);
    if (stepNumbers.length !== uniqueStepNumbers.size) {
      return res.status(400).json({ error: "stepNumber değerleri benzersiz olmalı" });
    }
    if (stepNumbers.some((n: any) => !Number.isInteger(n) || n < 1)) {
      return res.status(400).json({ error: "stepNumber pozitif tam sayı olmalı" });
    }

    // Validation: title boş olamaz
    const emptyTitle = steps.find((s: any) => !s.title || !s.title.trim());
    if (emptyTitle) {
      return res.status(400).json({ error: "Tüm adımların başlığı olmalı" });
    }

    await db.transaction(async (tx) => {
      // Eski adımları sil
      await tx.delete(branchOnboardingSteps)
        .where(eq(branchOnboardingSteps.targetRole, role));

      // Yenileri ekle
      if (steps.length > 0) {
        await tx.insert(branchOnboardingSteps).values(
          steps.map((s: any) => ({
            targetRole: role,
            stepNumber: s.stepNumber,
            title: s.title.trim(),
            description: s.description ?? null,
            recipeIds: Array.isArray(s.recipeIds) ? s.recipeIds.map(Number) : [],
            estimatedMinutes: s.estimatedMinutes ?? 30,
            prerequisiteStepIds: Array.isArray(s.prerequisiteStepIds) ? s.prerequisiteStepIds.map(Number) : [],
            completionCriteria: s.completionCriteria ?? null,
            isActive: s.isActive !== false,
          }))
        );
      }
    });

    const updated = await db.select().from(branchOnboardingSteps)
      .where(eq(branchOnboardingSteps.targetRole, role))
      .orderBy(asc(branchOnboardingSteps.stepNumber));

    res.json({
      message: "Onboarding adımları güncellendi",
      role,
      count: updated.length,
      steps: updated,
    });
  } catch (error: any) {
    console.error("[PUT branch-onboarding-admin/:role] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-onboarding/me/progress
// Kullanıcının kendi onboarding ilerlemesi (rol bazlı)
// Her adım için: tamamlandı mı, bekliyor mu, kilitli mi?
// ──────────────────────────────────────
router.get("/api/branch-onboarding/me/progress", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Bu rol için adımlar
    const steps = await db.select().from(branchOnboardingSteps)
      .where(and(
        eq(branchOnboardingSteps.targetRole, role),
        eq(branchOnboardingSteps.isActive, true),
      ))
      .orderBy(asc(branchOnboardingSteps.stepNumber));

    if (steps.length === 0) {
      return res.json({
        role,
        steps: [],
        progress: [],
        completedSteps: 0,
        totalSteps: 0,
        percentComplete: 0,
        message: "Bu rol için onboarding tanımlı değil",
      });
    }

    // Kullanıcının tüm reçete ilerlemesini çek
    const myProgress = await db.select()
      .from(branchRecipeLearningProgress)
      .where(eq(branchRecipeLearningProgress.userId, userId));

    const progressByRecipe: Record<number, any> = {};
    for (const p of myProgress) {
      progressByRecipe[p.recipeId] = p;
    }

    // Her adım için durum hesapla
    const progress = steps.map((step) => {
      const recipeIds = (step.recipeIds || []) as number[];
      const totalRecipes = recipeIds.length;

      let completedRecipes = 0;
      let viewedRecipes = 0;
      let totalQuizScore = 0;
      let recipesWithQuiz = 0;
      const recipeDetails: any[] = [];

      for (const rid of recipeIds) {
        const p = progressByRecipe[rid];
        if (p) {
          if ((p.viewCount ?? 0) > 0) viewedRecipes++;
          if (p.bestScore && Number(p.bestScore) > 0) {
            totalQuizScore += Number(p.bestScore);
            recipesWithQuiz++;
          }
          // Tamamlandı: en az 1 görüntüleme + bestScore >= minQuizScore (default 70)
          const minScore = step.completionCriteria?.minQuizScore ?? 70;
          const passed = p.bestScore && Number(p.bestScore) >= minScore;
          const demoOk = !step.completionCriteria?.requireRecipeDemo || p.demoCompleted;
          if (passed && demoOk) completedRecipes++;
          recipeDetails.push({
            recipeId: rid,
            viewed: (p.viewCount ?? 0) > 0,
            quizAttempts: p.quizAttempts ?? 0,
            bestScore: p.bestScore ? Number(p.bestScore) : null,
            demoCompleted: p.demoCompleted ?? false,
            passed: passed && demoOk,
          });
        } else {
          recipeDetails.push({
            recipeId: rid,
            viewed: false,
            quizAttempts: 0,
            bestScore: null,
            demoCompleted: false,
            passed: false,
          });
        }
      }

      const stepCompleted = totalRecipes > 0 && completedRecipes === totalRecipes;
      const stepProgress = totalRecipes > 0 ? Math.round((completedRecipes / totalRecipes) * 100) : 0;
      const avgQuizScore = recipesWithQuiz > 0 ? Math.round(totalQuizScore / recipesWithQuiz) : null;

      return {
        stepId: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        totalRecipes,
        viewedRecipes,
        completedRecipes,
        stepProgress,
        completed: stepCompleted,
        avgQuizScore,
        recipeDetails,
        prerequisiteStepIds: step.prerequisiteStepIds,
        completionCriteria: step.completionCriteria,
      };
    });

    // Locked durumu hesapla (önkoşul tamamlanmamış mı?)
    const completedStepIds = new Set(progress.filter(p => p.completed).map(p => p.stepId));
    for (const p of progress) {
      const prereqs = (p.prerequisiteStepIds || []) as number[];
      (p as any).locked = prereqs.length > 0 && !prereqs.every(id => completedStepIds.has(id));
    }

    const completedCount = progress.filter(p => p.completed).length;
    const percentComplete = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

    res.json({
      role,
      userId,
      steps,
      progress,
      completedSteps: completedCount,
      totalSteps: steps.length,
      percentComplete,
    });
  } catch (error: any) {
    console.error("[GET branch-onboarding/me/progress] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/branch-onboarding/seed-defaults
// Default barista onboarding adımlarını seed et (idempotent — sadece boş ise)
// ──────────────────────────────────────
router.post("/api/branch-onboarding/seed-defaults", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const force = req.body?.force === true;

    // Mevcut sayım
    const existing = await db.select({ count: sql<number>`count(*)::int` })
      .from(branchOnboardingSteps);

    if (!force && existing[0]?.count > 0) {
      return res.status(200).json({
        message: "Onboarding adımları zaten mevcut — seed atlandı",
        existing: existing[0].count,
        hint: "Tüm adımları silmek için body'de force:true gönderin",
      });
    }

    // İlk 5 reçete'yi al (ID sıralı)
    const firstRecipes = await db.select({ id: branchRecipes.id, productId: branchRecipes.productId })
      .from(branchRecipes)
      .where(eq(branchRecipes.isActive, true))
      .orderBy(asc(branchRecipes.id))
      .limit(20);

    const recipeIds = firstRecipes.map(r => r.id);

    // Seed verileri (default barista yolu)
    const baristaSteps = [
      {
        targetRole: 'barista',
        stepNumber: 1,
        title: 'Hoşgeldin & Sistem Tanıtımı',
        description: 'DOSPRESSO platformunu tanı, profilini doldur, KVKK formunu imzala. Bu adımda reçete yok — sadece sistem alışkanlığı.',
        recipeIds: [],
        estimatedMinutes: 30,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true },
        isActive: true,
      },
      {
        targetRole: 'barista',
        stepNumber: 2,
        title: 'Temel Ekipman & Hijyen',
        description: 'Espresso makinesi, grinder, blender kullanımı. Hijyen kuralları, mavi/yeşil/kırmızı bıçak ayrımı.',
        recipeIds: [],
        estimatedMinutes: 60,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true, minQuizScore: 80 },
        isActive: true,
      },
      {
        targetRole: 'barista',
        stepNumber: 3,
        title: 'Klasik Kahveler — İlk 5 Reçete',
        description: 'Espresso, Americano, Cappuccino, Latte, Mocha. Her reçeteyi oku, quizini geç, ustaya demo yap.',
        recipeIds: recipeIds.slice(0, 5),
        estimatedMinutes: 120,
        prerequisiteStepIds: [],
        completionCriteria: { minQuizScore: 70, requireRecipeDemo: true },
        isActive: true,
      },
      {
        targetRole: 'barista',
        stepNumber: 4,
        title: 'Soğuk İçecekler',
        description: 'Buzlu kahveler, freshess, frozen yogurt. Boyutlandırma (Massivo / Long Diva) farkı.',
        recipeIds: recipeIds.slice(5, 12),
        estimatedMinutes: 120,
        prerequisiteStepIds: [],
        completionCriteria: { minQuizScore: 70, requireRecipeDemo: true },
        isActive: true,
      },
      {
        targetRole: 'barista',
        stepNumber: 5,
        title: 'Şablon Reçeteler & Aroma Sistemi',
        description: 'Meyveli Mojito, Meyveli Yoğurt gibi aroma kombinasyonu kullanan reçeteler. Hangi aroma + hangi pump?',
        recipeIds: recipeIds.slice(12, 20),
        estimatedMinutes: 90,
        prerequisiteStepIds: [],
        completionCriteria: { minQuizScore: 75, requireRecipeDemo: true, requireSupervisorApproval: true },
        isActive: true,
      },
    ];

    // Bar buddy için kısa yol (3 adım)
    const barBuddySteps = [
      {
        targetRole: 'bar_buddy',
        stepNumber: 1,
        title: 'Hoşgeldin & Sistem',
        description: 'Platform tanıtımı + profil + KVKK.',
        recipeIds: [],
        estimatedMinutes: 30,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true },
        isActive: true,
      },
      {
        targetRole: 'bar_buddy',
        stepNumber: 2,
        title: 'Hijyen & Yardımcı Görevler',
        description: 'Mise en place, blender temizliği, buz hazırlığı.',
        recipeIds: [],
        estimatedMinutes: 45,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true },
        isActive: true,
      },
      {
        targetRole: 'bar_buddy',
        stepNumber: 3,
        title: 'Temel Reçete Bilgisi',
        description: 'Baristanın hangi reçete için ne hazırlamasını istediğini anla. Malzemeleri tanı.',
        recipeIds: recipeIds.slice(0, 5),
        estimatedMinutes: 60,
        prerequisiteStepIds: [],
        completionCriteria: { minQuizScore: 60 },
        isActive: true,
      },
    ];

    // Stajyer için ileri seviye yol (8 adım) — barista yolunun üstüne 3 ek
    const stajyerSteps = [
      ...baristaSteps.map(s => ({ ...s, targetRole: 'stajyer' })),
      {
        targetRole: 'stajyer',
        stepNumber: 6,
        title: 'Mali Sorumluluk & Kasa',
        description: 'POS sistemi, sipariş alma, müşteri ile iletişim.',
        recipeIds: [],
        estimatedMinutes: 90,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true, minQuizScore: 75 },
        isActive: true,
      },
      {
        targetRole: 'stajyer',
        stepNumber: 7,
        title: 'Stok Sayımı & Kayıt',
        description: 'Günlük stok sayımı, fire raporu, sistem girişi.',
        recipeIds: [],
        estimatedMinutes: 60,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true },
        isActive: true,
      },
      {
        targetRole: 'stajyer',
        stepNumber: 8,
        title: 'Kapanış & Devir',
        description: 'Vardiya kapanışı, kasa sayımı, bir sonraki vardiyaya devir.',
        recipeIds: [],
        estimatedMinutes: 45,
        prerequisiteStepIds: [],
        completionCriteria: { requireSupervisorApproval: true },
        isActive: true,
      },
    ];

    const allSteps = [...baristaSteps, ...barBuddySteps, ...stajyerSteps];

    await db.transaction(async (tx) => {
      if (force) {
        // Force ise tüm onboarding'i sıfırla
        await tx.delete(branchOnboardingSteps);
      }
      await tx.insert(branchOnboardingSteps).values(allSteps);
    });

    res.json({
      message: force ? "Onboarding sıfırlandı ve seed edildi" : "Onboarding seed edildi",
      inserted: allSteps.length,
      breakdown: {
        barista: baristaSteps.length,
        bar_buddy: barBuddySteps.length,
        stajyer: stajyerSteps.length,
      },
    });
  } catch (error: any) {
    console.error("[POST seed-defaults] hata:", error);
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

// ════════════════════════════════════════════════════
// HQ EDIT ENDPOINT'LERİ (4 May 2026 — Aslan onayı)
// Yetki: admin, ceo, cgo, coach, trainer
// ════════════════════════════════════════════════════

// ──────────────────────────────────────
// POST /api/branch-products
// Yeni ürün ekle
// ──────────────────────────────────────
router.post("/api/branch-products", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const { name, shortCode, category, subCategory, description, imageUrl,
            displayOrder, massivoPrice, longDivaPrice, notes } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "name ve category zorunlu" });
    }

    const [product] = await db.insert(branchProducts).values({
      name, shortCode, category, subCategory, description, imageUrl,
      displayOrder: displayOrder ?? 0,
      massivoPrice: massivoPrice?.toString(),
      longDivaPrice: longDivaPrice?.toString(),
      notes,
      isActive: true,
    }).returning();

    res.status(201).json(product);
  } catch (error: any) {
    console.error("[POST branch-products] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PATCH /api/branch-products/:id
// Ürün güncelle
// ──────────────────────────────────────
router.patch("/api/branch-products/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const updates: Record<string, any> = {};
    const allowedFields = [
      'name', 'shortCode', 'category', 'subCategory', 'description',
      'imageUrl', 'displayOrder', 'massivoPrice', 'longDivaPrice',
      'notes', 'isActive', 'isPilotOnly',
    ];

    for (const field of allowedFields) {
      if (field in req.body) {
        if (field === 'massivoPrice' || field === 'longDivaPrice') {
          updates[field] = req.body[field]?.toString();
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Güncellenecek alan yok" });
    }

    updates.updatedAt = new Date();

    const [updated] = await db.update(branchProducts)
      .set(updates)
      .where(eq(branchProducts.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("[PATCH branch-products/:id] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// DELETE /api/branch-products/:id
// Ürün soft delete (isActive=false)
// ──────────────────────────────────────
router.delete("/api/branch-products/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    // Soft delete (DOSPRESSO kuralı — hard delete YASAK)
    const [deleted] = await db.update(branchProducts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branchProducts.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    res.json({ message: "Ürün pasif edildi (soft delete)", product: deleted });
  } catch (error: any) {
    console.error("[DELETE branch-products/:id] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/branch-products/:id/image
// Ürün görseli yükle (3 boyut: thumbnail, card, hero)
// ──────────────────────────────────────
router.post("/api/branch-products/:id/image", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, id));
    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    const { dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: "dataUrl zorunlu (base64 image)" });
    }

    // Base64 parse
    const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: "Geçersiz image data URL" });
    }

    const mimeType = matches[1];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: "Sadece JPEG, PNG, WebP desteklenir" });
    }

    const buffer = Buffer.from(matches[2], 'base64');

    // Boyut limiti (max 10 MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Maksimum 10 MB" });
    }

    // Sharp ile 3 boyut transform (KVKK: EXIF metadata sıfırlanır)
    const sharp = (await import('sharp')).default;

    const baseImage = sharp(buffer)
      .rotate() // EXIF orientation auto-fix
      .removeAlpha(); // Alpha channel kaldır

    // Thumbnail (200×200) — liste için
    const thumbnail = await baseImage.clone()
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // Card (600×400) — mobil kart için
    const card = await baseImage.clone()
      .resize(600, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    // Hero (1200×800) — detay sayfası için
    const hero = await baseImage.clone()
      .resize(1200, 800, { fit: 'cover' })
      .webp({ quality: 90 })
      .toBuffer();

    // Object Storage'a yükle
    const { Client } = await import('@replit/object-storage');
    const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });

    const timestamp = Date.now();
    const basePath = `branch-recipes/products/${id}`;
    const thumbnailPath = `${basePath}/thumbnail-${timestamp}.webp`;
    const cardPath = `${basePath}/card-${timestamp}.webp`;
    const heroPath = `${basePath}/hero-${timestamp}.webp`;

    const [thumbnailUpload, cardUpload, heroUpload] = await Promise.all([
      client.uploadFromBytes(thumbnailPath, thumbnail),
      client.uploadFromBytes(cardPath, card),
      client.uploadFromBytes(heroPath, hero),
    ]);

    if (!thumbnailUpload.ok || !cardUpload.ok || !heroUpload.ok) {
      console.error("[branch-products image upload] Object Storage hata:", {
        thumbnail: thumbnailUpload.error,
        card: cardUpload.error,
        hero: heroUpload.error,
      });
      return res.status(500).json({ error: "Görsel yükleme başarısız" });
    }

    // Veritabanına primary URL kaydet (card boyutu — varsayılan)
    const protocol = req.protocol || 'https';
    const host = req.get('host') || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const cardUrl = `${protocol}://${host}/api/branch-recipes/files/${encodeURIComponent(cardPath)}`;

    await db.update(branchProducts)
      .set({ imageUrl: cardUrl, updatedAt: new Date() })
      .where(eq(branchProducts.id, id));

    res.json({
      message: "Görsel yüklendi (3 boyut)",
      productId: id,
      sizes: {
        thumbnail: { path: thumbnailPath, bytes: thumbnail.length, dimensions: '200x200' },
        card: { path: cardPath, bytes: card.length, dimensions: '600x400', primary: true },
        hero: { path: heroPath, bytes: hero.length, dimensions: '1200x800' },
      },
      primaryUrl: cardUrl,
    });
  } catch (error: any) {
    console.error("[POST branch-products/:id/image] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/files/:path
// Object Storage'tan görsel oku (public)
// ──────────────────────────────────────
router.get("/api/branch-recipes/files/:filepath(*)", async (req: any, res: Response) => {
  try {
    const filepath = decodeURIComponent(req.params.filepath);

    // Güvenlik: Sadece branch-recipes/products/ altından okuma
    if (!filepath.startsWith('branch-recipes/products/')) {
      return res.status(403).json({ error: "Yetkisiz path" });
    }

    const { Client } = await import('@replit/object-storage');
    const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID });

    const { ok, value, error } = await client.downloadAsBytes(filepath);
    if (!ok || !value) {
      return res.status(404).json({ error: "Görsel bulunamadı" });
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    // value can be Buffer or Buffer[]
    const buffer = Array.isArray(value) ? Buffer.concat(value) : value;
    res.send(buffer);
  } catch (error: any) {
    console.error("[GET branch-recipes/files] hata:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ──────────────────────────────────────
// PATCH /api/branch-recipes/:id
// Reçete güncelle
// ──────────────────────────────────────
router.patch("/api/branch-recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const updates: Record<string, any> = {};
    const allowedFields = [
      'size', 'version', 'isActive', 'isTemplate', 'templateType',
      'preparationTimeSec', 'difficultyLevel',
      'servingCup', 'servingLid', 'servingNotes', 'notes',
    ];

    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Güncellenecek alan yok" });
    }

    updates.updatedAt = new Date();

    const [updated] = await db.update(branchRecipes)
      .set(updates)
      .where(eq(branchRecipes.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("[PATCH branch-recipes/:id] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PUT /api/branch-recipes/:id/ingredients
// Reçete malzemelerini toplu güncelle (replace all)
// ──────────────────────────────────────
router.put("/api/branch-recipes/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: "ingredients dizi olmalı" });
    }

    // Reçete var mı kontrol
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));
    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    // Transaction: eski malzemeleri sil, yenileri ekle
    await db.transaction(async (tx) => {
      await tx.delete(branchRecipeIngredients).where(eq(branchRecipeIngredients.recipeId, id));

      if (ingredients.length > 0) {
        await tx.insert(branchRecipeIngredients).values(
          ingredients.map((ing: any, idx: number) => ({
            recipeId: id,
            stepOrder: ing.stepOrder ?? idx + 1,
            ingredientName: ing.ingredientName,
            quantityText: ing.quantityText,
            quantityNumeric: ing.quantityNumeric?.toString(),
            unit: ing.unit,
            preparationNote: ing.preparationNote,
            isVariableAroma: ing.isVariableAroma ?? false,
            aromaSlot: ing.aromaSlot,
          }))
        );
      }
    });

    const updated = await db.select().from(branchRecipeIngredients)
      .where(eq(branchRecipeIngredients.recipeId, id))
      .orderBy(branchRecipeIngredients.stepOrder);

    res.json({ message: "Malzemeler güncellendi", count: updated.length, ingredients: updated });
  } catch (error: any) {
    console.error("[PUT branch-recipes/:id/ingredients] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PUT /api/branch-recipes/:id/steps
// Reçete adımlarını toplu güncelle (replace all)
// ──────────────────────────────────────
router.put("/api/branch-recipes/:id/steps", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const { steps } = req.body;
    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: "steps dizi olmalı" });
    }

    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));
    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(branchRecipeSteps).where(eq(branchRecipeSteps.recipeId, id));

      if (steps.length > 0) {
        await tx.insert(branchRecipeSteps).values(
          steps.map((step: any, idx: number) => ({
            recipeId: id,
            stepOrder: step.stepOrder ?? idx + 1,
            instruction: step.instruction,
            imageUrl: step.imageUrl,
            videoUrl: step.videoUrl,
            isCritical: step.isCritical ?? false,
            estimatedSec: step.estimatedSec,
          }))
        );
      }
    });

    const updated = await db.select().from(branchRecipeSteps)
      .where(eq(branchRecipeSteps.recipeId, id))
      .orderBy(branchRecipeSteps.stepOrder);

    res.json({ message: "Adımlar güncellendi", count: updated.length, steps: updated });
  } catch (error: any) {
    console.error("[PUT branch-recipes/:id/steps] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/branch-products/:id/recipes
// Yeni reçete ekle (boy bazlı)
// ──────────────────────────────────────
router.post("/api/branch-products/:id/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Geçersiz ürün ID" });
    }

    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, productId));
    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    const { size, version, isTemplate, templateType, preparationTimeSec,
            difficultyLevel, servingCup, servingLid, servingNotes, notes } = req.body;

    if (!size || !['massivo', 'long_diva', 'tek_boy'].includes(size)) {
      return res.status(400).json({ error: "size: 'massivo', 'long_diva' veya 'tek_boy'" });
    }

    const [recipe] = await db.insert(branchRecipes).values({
      productId,
      size,
      version: version ?? '3.6',
      isTemplate: isTemplate ?? false,
      templateType,
      preparationTimeSec,
      difficultyLevel: difficultyLevel ?? 1,
      servingCup,
      servingLid,
      servingNotes,
      notes,
      isActive: true,
    }).returning();

    res.status(201).json(recipe);
  } catch (error: any) {
    console.error("[POST branch-products/:id/recipes] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
// AROMA OPTIONS ENDPOINTS (TASK-AROMA-001 — 4 May 2026)
// ════════════════════════════════════════════════════════════════

// ──────────────────────────────────────
// GET /api/aroma-options
// Tüm aktif aromaları getirir (kategori ile gruplandırılmış)
// Query: ?category=fruit|herbal|dairy|sweet (opsiyonel filtre)
// ──────────────────────────────────────
router.get("/api/aroma-options", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Aroma listesini görüntüleme yetkiniz yok" });
    }

    const category = req.query.category as string | undefined;

    const conditions = [eq(branchAromaOptions.isActive, true)];
    if (category) {
      conditions.push(eq(branchAromaOptions.category, category));
    }

    const aromas = await db.select()
      .from(branchAromaOptions)
      .where(and(...conditions))
      .orderBy(asc(branchAromaOptions.displayOrder), asc(branchAromaOptions.name));

    // Kategoriye göre grupla (UI için pratik)
    const grouped: Record<string, any[]> = {};
    for (const aroma of aromas) {
      const cat = aroma.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(aroma);
    }

    res.json({
      aromas,
      grouped,
      categories: Object.keys(grouped),
      total: aromas.length,
    });
  } catch (error: any) {
    console.error("[GET aroma-options] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// GET /api/branch-recipes/:id/aroma-options
// Bu reçete için uygun aromaları getirir (slot bazlı gruplandırılmış)
// Reçete template değilse boş döner.
// ──────────────────────────────────────
router.get("/api/branch-recipes/:id/aroma-options", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canView(req.user.role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz reçete ID" });
    }

    // Reçete var mı, template mi
    const [recipe] = await db.select()
      .from(branchRecipes)
      .where(eq(branchRecipes.id, id));

    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    if (!recipe.isTemplate) {
      return res.json({
        recipeId: id,
        isTemplate: false,
        message: "Bu reçete şablon değil — aroma seçimi yok",
        slots: {},
        compatibilities: [],
      });
    }

    // Compatibility + aroma JOIN
    const compatRows = await db.select({
      compatId: branchRecipeAromaCompatibility.id,
      aromaId: branchRecipeAromaCompatibility.aromaId,
      slotName: branchRecipeAromaCompatibility.slotName,
      overridePumpsMassivo: branchRecipeAromaCompatibility.overridePumpsMassivo,
      overridePumpsLongDiva: branchRecipeAromaCompatibility.overridePumpsLongDiva,
      overrideUnit: branchRecipeAromaCompatibility.overrideUnit,
      isDefault: branchRecipeAromaCompatibility.isDefault,
      displayNameOverride: branchRecipeAromaCompatibility.displayNameOverride,
      // Aroma detayı
      aromaName: branchAromaOptions.name,
      aromaShortCode: branchAromaOptions.shortCode,
      aromaCategory: branchAromaOptions.category,
      aromaDescription: branchAromaOptions.description,
      aromaColorHex: branchAromaOptions.colorHex,
      aromaIconEmoji: branchAromaOptions.iconEmoji,
      aromaFormType: branchAromaOptions.formType,
      aromaDisplayOrder: branchAromaOptions.displayOrder,
    })
    .from(branchRecipeAromaCompatibility)
    .innerJoin(branchAromaOptions, eq(branchAromaOptions.id, branchRecipeAromaCompatibility.aromaId))
    .where(and(
      eq(branchRecipeAromaCompatibility.recipeId, id),
      eq(branchRecipeAromaCompatibility.isActive, true),
      eq(branchAromaOptions.isActive, true),
    ))
    .orderBy(
      asc(branchRecipeAromaCompatibility.slotName),
      desc(branchRecipeAromaCompatibility.isDefault),
      asc(branchAromaOptions.displayOrder),
    );

    // Slot'lara göre grupla
    const slots: Record<string, any[]> = {};
    for (const row of compatRows) {
      if (!slots[row.slotName]) slots[row.slotName] = [];
      slots[row.slotName].push({
        compatId: row.compatId,
        aroma: {
          id: row.aromaId,
          name: row.aromaName,
          shortCode: row.aromaShortCode,
          category: row.aromaCategory,
          description: row.aromaDescription,
          colorHex: row.aromaColorHex,
          iconEmoji: row.aromaIconEmoji,
          formType: row.aromaFormType,
        },
        overridePumpsMassivo: row.overridePumpsMassivo,
        overridePumpsLongDiva: row.overridePumpsLongDiva,
        overrideUnit: row.overrideUnit,
        isDefault: row.isDefault,
        displayNameOverride: row.displayNameOverride,
      });
    }

    res.json({
      recipeId: id,
      isTemplate: true,
      templateType: recipe.templateType,
      slots,
      slotNames: Object.keys(slots),
      compatibilities: compatRows,
      total: compatRows.length,
    });
  } catch (error: any) {
    console.error("[GET branch-recipes/:id/aroma-options] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PUT /api/branch-recipes/:id/aroma-compatibility
// Bu reçetenin aroma uyumluluk listesini topluca güncelle (replace all)
// Sadece HQ_EDIT_ROLES.
// ──────────────────────────────────────
router.put("/api/branch-recipes/:id/aroma-compatibility", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz reçete ID" });
    }

    const { compatibilities } = req.body;
    if (!Array.isArray(compatibilities)) {
      return res.status(400).json({ error: "compatibilities dizi olmalı" });
    }

    // Reçete var mı + template mi kontrol
    const [recipe] = await db.select()
      .from(branchRecipes)
      .where(eq(branchRecipes.id, id));

    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    if (!recipe.isTemplate) {
      return res.status(400).json({
        error: "Bu reçete şablon değil — aroma uyumluluğu eklenemez",
        hint: "Önce reçeteyi 'isTemplate=true' olarak güncelleyin",
      });
    }

    // Her bir compatibility için aroma ID + slot kombinasyonu unique olmalı
    // Replace-all transaction
    await db.transaction(async (tx) => {
      await tx.delete(branchRecipeAromaCompatibility)
        .where(eq(branchRecipeAromaCompatibility.recipeId, id));

      if (compatibilities.length > 0) {
        await tx.insert(branchRecipeAromaCompatibility).values(
          compatibilities.map((c: any) => ({
            recipeId: id,
            aromaId: Number(c.aromaId),
            slotName: c.slotName || 'primary',
            overridePumpsMassivo: c.overridePumpsMassivo?.toString() ?? null,
            overridePumpsLongDiva: c.overridePumpsLongDiva?.toString() ?? null,
            overrideUnit: c.overrideUnit ?? null,
            isDefault: c.isDefault ?? false,
            displayNameOverride: c.displayNameOverride ?? null,
            isActive: true,
          }))
        );
      }
    });

    const updated = await db.select()
      .from(branchRecipeAromaCompatibility)
      .where(eq(branchRecipeAromaCompatibility.recipeId, id));

    res.json({
      message: "Aroma uyumluluğu güncellendi",
      count: updated.length,
      compatibilities: updated,
    });
  } catch (error: any) {
    console.error("[PUT branch-recipes/:id/aroma-compatibility] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/aroma-options
// Yeni aroma ekle (sadece HQ_EDIT_ROLES)
// ──────────────────────────────────────
router.post("/api/aroma-options", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Aroma ekleme yetkiniz yok" });
    }

    const { name, shortCode, category, description, colorHex, iconEmoji, formType, displayOrder } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "name ve category zorunlu" });
    }

    // Aynı isimde aktif aroma var mı?
    const [existing] = await db.select()
      .from(branchAromaOptions)
      .where(eq(branchAromaOptions.name, name));

    if (existing) {
      return res.status(409).json({
        error: "Bu isimde bir aroma zaten var",
        existingId: existing.id,
        isActive: existing.isActive,
      });
    }

    const [aroma] = await db.insert(branchAromaOptions).values({
      name,
      shortCode: shortCode ?? null,
      category,
      description: description ?? null,
      colorHex: colorHex ?? null,
      iconEmoji: iconEmoji ?? null,
      formType: formType ?? 'syrup',
      displayOrder: displayOrder ?? 0,
      isActive: true,
    }).returning();

    res.status(201).json(aroma);
  } catch (error: any) {
    console.error("[POST aroma-options] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// PATCH /api/aroma-options/:id
// Aroma güncelle / pasif et
// ──────────────────────────────────────
router.patch("/api/aroma-options/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const { name, shortCode, category, description, colorHex, iconEmoji, formType, displayOrder, isActive } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (shortCode !== undefined) updates.shortCode = shortCode;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (colorHex !== undefined) updates.colorHex = colorHex;
    if (iconEmoji !== undefined) updates.iconEmoji = iconEmoji;
    if (formType !== undefined) updates.formType = formType;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(branchAromaOptions)
      .set(updates)
      .where(eq(branchAromaOptions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Aroma bulunamadı" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("[PATCH aroma-options/:id] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
// QUIZ AUTO-GENERATOR (TASK-QUIZ-001 — 4 May 2026)
// Bir reçetenin malzeme/adım/servis bilgilerinden otomatik quiz soruları üretir.
// AI değil — template-based deterministic generator.
// ════════════════════════════════════════════════════════════════

interface GeneratedQuiz {
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  focusArea: string;
  isAutoGenerated: boolean;
}

// Helper: Doğru cevaba 3 distractor (yanlış cevap) üret
function generateNumericDistractors(correct: string, count: number = 3): string[] {
  // "30", "30 ml", "2 pump", "1.5 pump" gibi değerleri parse et
  const match = correct.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return [];

  const num = parseFloat(match[1].replace(',', '.'));
  const suffix = match[2].trim();
  const distractors = new Set<string>();

  // Tipik yanlışlar: ±25%, ±50%, ±100%
  const variations = [0.5, 0.75, 1.5, 2, 0.25, 3];
  for (const v of variations) {
    if (distractors.size >= count) break;
    const newNum = Math.round((num * v) * 10) / 10; // 1 ondalık
    if (newNum === num || newNum <= 0) continue;
    const formatted = newNum % 1 === 0 ? String(newNum) : newNum.toFixed(1);
    distractors.add(suffix ? `${formatted} ${suffix}` : formatted);
  }

  return Array.from(distractors).slice(0, count);
}

// Helper: Aynı kategoriden başka malzeme adları (genel set)
const COMMON_INGREDIENT_DISTRACTORS = [
  'Süt', 'Espresso shot', 'Çikolata sosu', 'Karamel sosu', 'Vanilya şurubu',
  'Tarçın tozu', 'Kakao', 'Buz', 'Krema', 'Şeker',
];

// Helper: Bardak/servis distractorları
const COMMON_CUP_DISTRACTORS = ['Massivo bardak', 'Long Diva bardak', 'Espresso fincanı', 'Cappuccino fincanı', 'Latte bardağı'];

// Karıştırma (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuizzesForRecipe(
  recipe: any,
  product: any,
  ingredients: any[],
  steps: any[],
  options: { maxQuestions?: number; difficulty?: 'easy' | 'medium' | 'hard' | 'mixed' } = {}
): GeneratedQuiz[] {
  const maxQ = options.maxQuestions ?? 8;
  const out: GeneratedQuiz[] = [];

  const sizeLabel = recipe.size === 'massivo' ? 'Massivo' : recipe.size === 'long_diva' ? 'Long Diva' : 'Standart';
  const productName = product.name;

  // ─────────────────────────────────────────────
  // 1) Malzeme miktarı soruları (her sayısal malzeme için 1 tane, max 3)
  // ─────────────────────────────────────────────
  const quantitativeIngredients = ingredients.filter(i => {
    const text = i.quantityText || '';
    return /\d/.test(text) && !i.isVariableAroma;
  }).slice(0, 3);

  for (const ing of quantitativeIngredients) {
    const correct = ing.quantityText.trim();
    const distractors = generateNumericDistractors(correct, 3);
    if (distractors.length < 3) continue; // yetersiz seçenek

    const opts = shuffle([correct, ...distractors]);
    out.push({
      question: `${sizeLabel} ${productName} reçetesinde ${ing.ingredientName} miktarı ne kadardır?`,
      questionType: 'multiple_choice',
      options: opts,
      correctAnswer: correct,
      explanation: ing.preparationNote
        ? `Doğru cevap: ${correct}. Not: ${ing.preparationNote}`
        : `Doğru cevap: ${correct}.`,
      difficulty: 'easy',
      focusArea: 'ingredient_amount',
      isAutoGenerated: true,
    });
  }

  // ─────────────────────────────────────────────
  // 2) Malzeme tanıma sorusu (en az 4 malzeme varsa)
  // ─────────────────────────────────────────────
  if (ingredients.length >= 4) {
    // Reçetede olan bir malzemeyi seç
    const target = ingredients[0];
    // Distractorlar: bu reçetede olmayan ama yaygın
    const inRecipeNames = new Set(ingredients.map(i => i.ingredientName.toLowerCase()));
    const distractors = COMMON_INGREDIENT_DISTRACTORS
      .filter(d => !inRecipeNames.has(d.toLowerCase()) && d.toLowerCase() !== target.ingredientName.toLowerCase())
      .slice(0, 3);

    if (distractors.length === 3) {
      const opts = shuffle([target.ingredientName, ...distractors]);
      out.push({
        question: `Aşağıdakilerden hangisi ${productName} reçetesinin temel malzemelerindendir?`,
        questionType: 'multiple_choice',
        options: opts,
        correctAnswer: target.ingredientName,
        explanation: `${productName} reçetesinde ${target.ingredientName} kullanılır.`,
        difficulty: 'easy',
        focusArea: 'ingredient_recognition',
        isAutoGenerated: true,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 3) Adım sırası soruları (max 2)
  // ─────────────────────────────────────────────
  if (steps.length >= 3) {
    // İlk adım sorusu
    const firstStep = steps[0];
    const distractors = steps.slice(1, 4).map(s => s.instruction.substring(0, 60) + (s.instruction.length > 60 ? '...' : ''));
    if (distractors.length >= 3) {
      const correct = firstStep.instruction.substring(0, 60) + (firstStep.instruction.length > 60 ? '...' : '');
      const opts = shuffle([correct, ...distractors.slice(0, 3)]);
      out.push({
        question: `${productName} hazırlanırken ilk adım hangisidir?`,
        questionType: 'multiple_choice',
        options: opts,
        correctAnswer: correct,
        explanation: `İlk adım: ${firstStep.instruction}`,
        difficulty: 'medium',
        focusArea: 'preparation_step',
        isAutoGenerated: true,
      });
    }

    // Kritik adım var mı? (eğer varsa true/false)
    const criticalStep = steps.find(s => s.isCritical);
    if (criticalStep) {
      out.push({
        question: `Doğru mu yanlış mı? "${criticalStep.instruction.substring(0, 80)}${criticalStep.instruction.length > 80 ? '...' : ''}" adımı ${productName} hazırlamada kritik bir adımdır.`,
        questionType: 'true_false',
        options: ['Doğru', 'Yanlış'],
        correctAnswer: 'Doğru',
        explanation: `Bu adım kritik olarak işaretlenmiştir — özellikle dikkat edilmelidir.`,
        difficulty: 'easy',
        focusArea: 'critical_step',
        isAutoGenerated: true,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 4) Servis bardağı sorusu
  // ─────────────────────────────────────────────
  if (recipe.servingCup) {
    const distractors = COMMON_CUP_DISTRACTORS
      .filter(c => c.toLowerCase() !== recipe.servingCup!.toLowerCase())
      .slice(0, 3);

    if (distractors.length === 3) {
      const opts = shuffle([recipe.servingCup, ...distractors]);
      out.push({
        question: `${sizeLabel} ${productName} hangi bardakta/fincanda servis edilir?`,
        questionType: 'multiple_choice',
        options: opts,
        correctAnswer: recipe.servingCup,
        explanation: `${recipe.servingCup} kullanılır.${recipe.servingNotes ? ' Not: ' + recipe.servingNotes : ''}`,
        difficulty: 'easy',
        focusArea: 'serving',
        isAutoGenerated: true,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 5) Hazırlama süresi sorusu
  // ─────────────────────────────────────────────
  if (recipe.preparationTimeSec && recipe.preparationTimeSec > 0) {
    const correctMin = Math.round(recipe.preparationTimeSec / 60);
    const correct = `~${correctMin} dakika`;
    const distractors = [
      `~${Math.max(1, correctMin - 2)} dakika`,
      `~${correctMin + 2} dakika`,
      `~${correctMin * 2} dakika`,
    ].filter(d => d !== correct);

    if (distractors.length >= 3) {
      const opts = shuffle([correct, ...distractors.slice(0, 3)]);
      out.push({
        question: `${productName} hazırlama süresi yaklaşık ne kadardır?`,
        questionType: 'multiple_choice',
        options: opts,
        correctAnswer: correct,
        difficulty: 'medium',
        focusArea: 'preparation_time',
        isAutoGenerated: true,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 6) Zorluk: difficulty filter (eğer mixed değilse)
  // ─────────────────────────────────────────────
  let filtered = out;
  if (options.difficulty && options.difficulty !== 'mixed') {
    filtered = out.filter(q => q.difficulty === options.difficulty);
    // Eğer filtreden sonra çok az kaldıysa, hepsini kullan
    if (filtered.length < 3) filtered = out;
  }

  return filtered.slice(0, maxQ);
}

// ──────────────────────────────────────
// POST /api/branch-recipes/:id/quizzes/generate
// Bir reçete için otomatik quiz soruları üretir.
// Query: ?maxQuestions=8&difficulty=mixed&dryRun=false
// dryRun=true ise sadece preview döner, DB'ye yazmaz.
// ──────────────────────────────────────
router.post("/api/branch-recipes/:id/quizzes/generate", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Quiz üretme yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz reçete ID" });
    }

    const maxQuestions = Math.min(Math.max(Number(req.body?.maxQuestions ?? 8), 1), 20);
    const difficulty = (req.body?.difficulty ?? 'mixed') as 'easy' | 'medium' | 'hard' | 'mixed';
    const dryRun = req.body?.dryRun === true;
    const replace = req.body?.replace === true; // true ise eski quizleri sil

    // Reçete + ürün
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));
    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, recipe.productId));
    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    const ingredients = await db.select()
      .from(branchRecipeIngredients)
      .where(eq(branchRecipeIngredients.recipeId, id))
      .orderBy(asc(branchRecipeIngredients.stepOrder));

    const steps = await db.select()
      .from(branchRecipeSteps)
      .where(eq(branchRecipeSteps.recipeId, id))
      .orderBy(asc(branchRecipeSteps.stepOrder));

    if (ingredients.length === 0 && steps.length === 0) {
      return res.status(400).json({
        error: "Bu reçetede malzeme veya adım yok — quiz üretilemez",
        hint: "Önce malzeme/adım ekleyin",
      });
    }

    const generated = generateQuizzesForRecipe(recipe, product, ingredients, steps, {
      maxQuestions,
      difficulty,
    });

    if (generated.length === 0) {
      return res.status(200).json({
        message: "Bu reçeteden quiz üretilemedi (yetersiz veri)",
        generated: 0,
        quizzes: [],
      });
    }

    // Dry run: sadece preview
    if (dryRun) {
      return res.json({
        message: "Önizleme — DB'ye kaydedilmedi",
        generated: generated.length,
        quizzes: generated,
      });
    }

    // DB'ye kaydet
    let inserted: any[] = [];
    await db.transaction(async (tx) => {
      if (replace) {
        // Sadece otomatik üretilenleri sil (manuel olanları koru)
        await tx.delete(branchRecipeQuizzes).where(and(
          eq(branchRecipeQuizzes.recipeId, id),
          eq(branchRecipeQuizzes.isAutoGenerated, true),
        ));
      }

      const rows = generated.map(q => ({
        recipeId: id,
        question: q.question,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        focusArea: q.focusArea,
        isAutoGenerated: true,
        createdBy: req.user.id ?? null,
        isActive: true,
      }));

      inserted = await tx.insert(branchRecipeQuizzes).values(rows).returning();
    });

    res.json({
      message: replace
        ? `${generated.length} quiz oluşturuldu (önceki otomatik quizler silindi)`
        : `${generated.length} quiz oluşturuldu (mevcut quizlere eklendi)`,
      generated: generated.length,
      quizzes: inserted,
    });
  } catch (error: any) {
    console.error("[POST quizzes/generate] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// ──────────────────────────────────────
// POST /api/branch-recipes/quizzes/bulk-generate
// Tüm aktif reçeteler için otomatik quiz üretir (toplu).
// Body: { onlyMissing: true } → sadece quiz'i olmayanlar
// ──────────────────────────────────────
router.post("/api/branch-recipes/quizzes/bulk-generate", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Toplu quiz üretme yetkiniz yok" });
    }

    const onlyMissing = req.body?.onlyMissing !== false; // varsayılan true
    const maxQuestions = Math.min(Math.max(Number(req.body?.maxQuestions ?? 5), 1), 15);

    // Tüm aktif reçeteler
    const allRecipes = await db.select()
      .from(branchRecipes)
      .where(eq(branchRecipes.isActive, true));

    const results: Array<{ recipeId: number; productName?: string; status: string; count: number; error?: string }> = [];
    let totalGenerated = 0;

    for (const recipe of allRecipes) {
      try {
        // Ürün bul
        const [product] = await db.select().from(branchProducts).where(eq(branchProducts.id, recipe.productId));
        if (!product) {
          results.push({ recipeId: recipe.id, status: 'no_product', count: 0 });
          continue;
        }

        // Quiz var mı kontrol et
        if (onlyMissing) {
          const [existing] = await db.select({ count: sql<number>`count(*)::int` })
            .from(branchRecipeQuizzes)
            .where(and(
              eq(branchRecipeQuizzes.recipeId, recipe.id),
              eq(branchRecipeQuizzes.isActive, true),
            ));

          if (existing.count > 0) {
            results.push({ recipeId: recipe.id, productName: product.name, status: 'skipped_has_quizzes', count: existing.count });
            continue;
          }
        }

        const ingredients = await db.select()
          .from(branchRecipeIngredients)
          .where(eq(branchRecipeIngredients.recipeId, recipe.id))
          .orderBy(asc(branchRecipeIngredients.stepOrder));

        const steps = await db.select()
          .from(branchRecipeSteps)
          .where(eq(branchRecipeSteps.recipeId, recipe.id))
          .orderBy(asc(branchRecipeSteps.stepOrder));

        if (ingredients.length === 0 && steps.length === 0) {
          results.push({ recipeId: recipe.id, productName: product.name, status: 'no_data', count: 0 });
          continue;
        }

        const generated = generateQuizzesForRecipe(recipe, product, ingredients, steps, {
          maxQuestions,
          difficulty: 'mixed',
        });

        if (generated.length === 0) {
          results.push({ recipeId: recipe.id, productName: product.name, status: 'no_quiz_generated', count: 0 });
          continue;
        }

        const rows = generated.map(q => ({
          recipeId: recipe.id,
          question: q.question,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          focusArea: q.focusArea,
          isAutoGenerated: true,
          createdBy: req.user.id ?? null,
          isActive: true,
        }));

        await db.insert(branchRecipeQuizzes).values(rows);
        totalGenerated += generated.length;
        results.push({ recipeId: recipe.id, productName: product.name, status: 'generated', count: generated.length });
      } catch (e: any) {
        results.push({ recipeId: recipe.id, status: 'error', count: 0, error: e.message });
      }
    }

    res.json({
      message: `Toplu quiz üretimi tamamlandı: ${totalGenerated} soru, ${allRecipes.length} reçete`,
      totalRecipes: allRecipes.length,
      totalGenerated,
      results,
    });
  } catch (error: any) {
    console.error("[POST quizzes/bulk-generate] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

export default router;
