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

// ──────────────────────────────────────
// AROMA OPTIONS — Branş aromaları
// (TASK-AROMA-001 — 4 May 2026)
// ──────────────────────────────────────

// GET /api/branch-aroma-options — Tüm aktif aromalar
router.get("/api/branch-aroma-options", isAuthenticated, async (req: any, res: Response) => {
  try {
    const role = req.user.role as string;
    if (!ALLOWED_VIEW_ROLES.includes(role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const category = req.query.category as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const conditions: any[] = [];
    if (!includeInactive) conditions.push(eq(branchAromaOptions.isActive, true));
    if (category) conditions.push(eq(branchAromaOptions.category, category));

    const aromas = await db.select()
      .from(branchAromaOptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(branchAromaOptions.displayOrder, branchAromaOptions.name);

    res.json({ aromas, total: aromas.length });
  } catch (error: any) {
    console.error("[GET branch-aroma-options] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// GET /api/branch-recipes/:id/aromas — Bir reçetenin uyumlu aromaları
router.get("/api/branch-recipes/:id/aromas", isAuthenticated, async (req: any, res: Response) => {
  try {
    const role = req.user.role as string;
    if (!ALLOWED_VIEW_ROLES.includes(role)) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    // Reçete var mı?
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));
    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    // Compatibility tablosu + aroma detayı join
    const compat = await db.select({
      id: branchRecipeAromaCompatibility.id,
      recipeId: branchRecipeAromaCompatibility.recipeId,
      aromaId: branchRecipeAromaCompatibility.aromaId,
      slotName: branchRecipeAromaCompatibility.slotName,
      overridePumpsMassivo: branchRecipeAromaCompatibility.overridePumpsMassivo,
      overridePumpsLongDiva: branchRecipeAromaCompatibility.overridePumpsLongDiva,
      overrideUnit: branchRecipeAromaCompatibility.overrideUnit,
      isDefault: branchRecipeAromaCompatibility.isDefault,
      displayNameOverride: branchRecipeAromaCompatibility.displayNameOverride,
      isActive: branchRecipeAromaCompatibility.isActive,
      // Join'den gelen aroma detayı
      aromaName: branchAromaOptions.name,
      aromaShortCode: branchAromaOptions.shortCode,
      aromaCategory: branchAromaOptions.category,
      aromaColorHex: branchAromaOptions.colorHex,
      aromaIconEmoji: branchAromaOptions.iconEmoji,
      aromaFormType: branchAromaOptions.formType,
    })
      .from(branchRecipeAromaCompatibility)
      .innerJoin(branchAromaOptions, eq(branchRecipeAromaCompatibility.aromaId, branchAromaOptions.id))
      .where(and(
        eq(branchRecipeAromaCompatibility.recipeId, id),
        eq(branchRecipeAromaCompatibility.isActive, true),
      ))
      .orderBy(branchRecipeAromaCompatibility.slotName, desc(branchRecipeAromaCompatibility.isDefault));

    res.json({
      recipeId: id,
      isTemplate: recipe.isTemplate,
      templateType: recipe.templateType,
      compatibilities: compat,
      total: compat.length,
    });
  } catch (error: any) {
    console.error("[GET branch-recipes/:id/aromas] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// PUT /api/branch-recipes/:id/aromas — Replace all (HQ rolleri)
router.put("/api/branch-recipes/:id/aromas", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!canEdit(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok (sadece HQ rolleri)" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Geçersiz ID" });
    }

    const { compatibilities } = req.body;
    if (!Array.isArray(compatibilities)) {
      return res.status(400).json({ error: "compatibilities dizi olmalı" });
    }

    // Reçete var mı?
    const [recipe] = await db.select().from(branchRecipes).where(eq(branchRecipes.id, id));
    if (!recipe) {
      return res.status(404).json({ error: "Reçete bulunamadı" });
    }

    // Aroma ID'lerinin gerçekten var olduğunu doğrula (FK koruması)
    const aromaIds = Array.from(new Set(compatibilities.map((c: any) => Number(c.aromaId)).filter(Boolean)));
    if (aromaIds.length > 0) {
      const existing = await db.select({ id: branchAromaOptions.id })
        .from(branchAromaOptions)
        .where(inArray(branchAromaOptions.id, aromaIds));
      const existingIds = new Set(existing.map(e => e.id));
      const invalid = aromaIds.filter(aid => !existingIds.has(aid));
      if (invalid.length > 0) {
        return res.status(400).json({ error: `Geçersiz aroma ID'leri: ${invalid.join(', ')}` });
      }
    }

    // Transaction: replace all
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
            isActive: c.isActive !== false,
          }))
        );
      }
    });

    const updated = await db.select()
      .from(branchRecipeAromaCompatibility)
      .where(eq(branchRecipeAromaCompatibility.recipeId, id));

    res.json({
      message: "Aroma uyumlulukları güncellendi",
      count: updated.length,
      compatibilities: updated,
    });
  } catch (error: any) {
    console.error("[PUT branch-recipes/:id/aromas] hata:", error);
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

export default router;
