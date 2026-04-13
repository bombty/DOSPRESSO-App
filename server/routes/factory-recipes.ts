/**
 * Fabrika Reçete Yönetim Sistemi API
 * Şubelerden tamamen bağımsız — fabrika rolleri kontrol eder
 * Keyblend: admin + recete_gm only
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  factoryRecipes, factoryRecipeIngredients, factoryRecipeSteps,
  factoryKeyblends, factoryKeyblendIngredients,
  factoryProductionLogs, factoryRecipeVersions,
  factoryRecipeCategoryAccess, factoryIngredientNutrition,
} from "@shared/schema";
import { eq, and, desc, sql, isNull, asc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// ── Role Guards ──
const RECIPE_ADMIN_ROLES = ["admin", "recete_gm"];
const RECIPE_EDIT_ROLES = ["admin", "recete_gm", "sef"];
const RECIPE_VIEW_ROLES = ["admin", "recete_gm", "gida_muhendisi", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "uretim_sefi"];
const KEYBLEND_ROLES = ["admin", "recete_gm"]; // Keyblend içerik = en gizli
const PRODUCTION_ROLES = ["admin", "recete_gm", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "uretim_sefi"];

function isFactoryRole(role: string): boolean {
  return RECIPE_VIEW_ROLES.includes(role);
}

// ═══════════════════════════════════════
// REÇETELER — CRUD
// ═══════════════════════════════════════

// GET /api/factory/recipes — Reçete listesi
router.get("/api/factory/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    const { category, outputType } = req.query;
    const conditions: any[] = [eq(factoryRecipes.isActive, true)];

    // Şef kategori kısıtlaması
    if (req.user.role === "sef") {
      const access = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(eq(factoryRecipeCategoryAccess.role, "sef"), eq(factoryRecipeCategoryAccess.canView, true)));
      const allowedCategories = access.map(a => a.category);
      if (allowedCategories.length > 0) {
        conditions.push(sql`${factoryRecipes.category} IN (${sql.join(allowedCategories.map(c => sql`${c}`), sql`, `)})`);
      } else {
        return res.json([]); // Hiçbir kategoriye erişimi yok
      }
    }

    // Gizli reçeteler sadece admin + recete_gm görür
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      conditions.push(eq(factoryRecipes.isVisible, true));
    }

    if (category) conditions.push(eq(factoryRecipes.category, String(category)));
    if (outputType) conditions.push(eq(factoryRecipes.outputType, String(outputType)));

    const recipes = await db.select()
      .from(factoryRecipes)
      .where(and(...conditions))
      .orderBy(asc(factoryRecipes.category), asc(factoryRecipes.name));

    res.json(recipes);
  } catch (error) {
    console.error("Factory recipes list error:", error);
    res.status(500).json({ error: "Reçeteler yüklenemedi" });
  }
});

// GET /api/factory/recipes/:id — Reçete detay (malzeme + adım)
router.get("/api/factory/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    const id = Number(req.params.id);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Şef kategori kontrolü
    if (req.user.role === "sef" && recipe.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, recipe.category),
          eq(factoryRecipeCategoryAccess.canView, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoriye erişiminiz yok" });
    }

    // Malzemeler
    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    // Keyblend bilgilerini gizle (personel sadece kod+ağırlık görür)
    const safeIngredients = ingredients.map(ing => {
      if (ing.ingredientType === "keyblend" && !KEYBLEND_ROLES.includes(req.user.role)) {
        return { ...ing, notes: null }; // Keyblend notları gizle
      }
      return ing;
    });

    // Adımlar
    const steps = await db.select().from(factoryRecipeSteps)
      .where(eq(factoryRecipeSteps.recipeId, id))
      .orderBy(asc(factoryRecipeSteps.stepNumber));

    // Türev reçeteler (yarı mamül ise)
    let childRecipes: any[] = [];
    if (recipe.outputType === "yari_mamul") {
      childRecipes = await db.select({
        id: factoryRecipes.id,
        name: factoryRecipes.name,
        code: factoryRecipes.code,
        coverPhotoUrl: factoryRecipes.coverPhotoUrl,
      }).from(factoryRecipes)
        .where(and(eq(factoryRecipes.parentRecipeId, id), eq(factoryRecipes.isActive, true)));
    }

    res.json({
      ...recipe,
      ingredients: safeIngredients,
      steps,
      childRecipes,
    });
  } catch (error) {
    console.error("Factory recipe detail error:", error);
    res.status(500).json({ error: "Reçete detayı yüklenemedi" });
  }
});

// POST /api/factory/recipes — Yeni reçete oluştur
router.post("/api/factory/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Reçete oluşturma yetkiniz yok" });
    }

    // Şef kategori kontrolü
    if (req.user.role === "sef" && req.body.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, req.body.category),
          eq(factoryRecipeCategoryAccess.canCreate, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoride reçete oluşturma yetkiniz yok" });
    }

    const [created] = await db.insert(factoryRecipes).values({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }).returning();

    res.json(created);
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Bu kodla reçete zaten var" });
    console.error("Create factory recipe error:", error);
    res.status(500).json({ error: "Reçete oluşturulamadı" });
  }
});

// PATCH /api/factory/recipes/:id — Reçete güncelle
router.patch("/api/factory/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Düzenleme yetkiniz yok" });
    }

    const id = Number(req.params.id);
    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Kilitli reçete kontrolü
    if (recipe.editLocked && !RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu reçete kilitli. Sadece Reçete GM veya Admin düzenleyebilir." });
    }

    // Şef kategori kontrolü
    if (req.user.role === "sef" && recipe.category) {
      const [access] = await db.select().from(factoryRecipeCategoryAccess)
        .where(and(
          eq(factoryRecipeCategoryAccess.role, "sef"),
          eq(factoryRecipeCategoryAccess.category, recipe.category),
          eq(factoryRecipeCategoryAccess.canEdit, true)
        ));
      if (!access) return res.status(403).json({ error: "Bu kategoride düzenleme yetkiniz yok" });
    }

    const [updated] = await db.update(factoryRecipes)
      .set({ ...req.body, updatedBy: req.user.id, updatedAt: new Date() })
      .where(eq(factoryRecipes.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update factory recipe error:", error);
    res.status(500).json({ error: "Reçete güncellenemedi" });
  }
});

// POST /api/factory/recipes/:id/lock — Reçete kilitle/aç (sadece admin+recete_gm)
router.post("/api/factory/recipes/:id/lock", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Sadece Reçete GM veya Admin reçete kilitleyebilir" });
    }

    const id = Number(req.params.id);
    const { lock, reason } = req.body; // lock: true/false

    const [updated] = await db.update(factoryRecipes)
      .set({
        editLocked: lock,
        lockedBy: lock ? req.user.id : null,
        lockedAt: lock ? new Date() : null,
        lockReason: lock ? (reason || null) : null,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      })
      .where(eq(factoryRecipes.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Lock recipe error:", error);
    res.status(500).json({ error: "Kilit işlemi başarısız" });
  }
});

// ═══════════════════════════════════════
// MALZEMELER — CRUD
// ═══════════════════════════════════════

// POST /api/factory/recipes/:id/ingredients — Malzeme ekle
router.post("/api/factory/recipes/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const recipeId = Number(req.params.id);
    const [created] = await db.insert(factoryRecipeIngredients)
      .values({ ...req.body, recipeId })
      .returning();

    res.json(created);
  } catch (error) {
    console.error("Add ingredient error:", error);
    res.status(500).json({ error: "Malzeme eklenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients/bulk — Toplu malzeme kaydet
router.post("/api/factory/recipes/:id/ingredients/bulk", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const recipeId = Number(req.params.id);
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) return res.status(400).json({ error: "ingredients array gerekli" });

    // Mevcut malzemeleri sil, yenilerini ekle (replace stratejisi)
    await db.delete(factoryRecipeIngredients).where(eq(factoryRecipeIngredients.recipeId, recipeId));

    const created = [];
    for (const ing of ingredients) {
      const [row] = await db.insert(factoryRecipeIngredients)
        .values({ ...ing, recipeId })
        .returning();
      created.push(row);
    }

    res.json(created);
  } catch (error) {
    console.error("Bulk ingredients error:", error);
    res.status(500).json({ error: "Malzemeler kaydedilemedi" });
  }
});

// ═══════════════════════════════════════
// ADIMLAR — CRUD
// ═══════════════════════════════════════

// GET /api/factory/recipes/:id/steps
router.get("/api/factory/recipes/:id/steps", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const steps = await db.select().from(factoryRecipeSteps)
      .where(eq(factoryRecipeSteps.recipeId, Number(req.params.id)))
      .orderBy(asc(factoryRecipeSteps.stepNumber));

    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: "Adımlar yüklenemedi" });
  }
});

// POST /api/factory/recipes/:id/steps/bulk — Toplu adım kaydet
router.post("/api/factory/recipes/:id/steps/bulk", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const recipeId = Number(req.params.id);
    const { steps } = req.body;

    await db.delete(factoryRecipeSteps).where(eq(factoryRecipeSteps.recipeId, recipeId));

    const created = [];
    for (const step of steps) {
      const [row] = await db.insert(factoryRecipeSteps)
        .values({ ...step, recipeId })
        .returning();
      created.push(row);
    }

    res.json(created);
  } catch (error) {
    console.error("Bulk steps error:", error);
    res.status(500).json({ error: "Adımlar kaydedilemedi" });
  }
});

// ═══════════════════════════════════════
// KEYBLEND — CRUD (EN GİZLİ!)
// ═══════════════════════════════════════

// GET /api/factory/keyblends — Keyblend listesi
router.get("/api/factory/keyblends", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!KEYBLEND_ROLES.includes(req.user.role)) {
      // Gıda mühendisi: sadece kod+ağırlık+isim (bileşen yok)
      if (req.user.role === "gida_muhendisi") {
        const keyblends = await db.select({
          id: factoryKeyblends.id,
          code: factoryKeyblends.code,
          name: factoryKeyblends.name,
          totalWeight: factoryKeyblends.totalWeight,
        }).from(factoryKeyblends).where(eq(factoryKeyblends.isActive, true));
        return res.json(keyblends);
      }
      return res.status(403).json({ error: "Keyblend erişimi sadece Admin ve Reçete GM" });
    }

    const keyblends = await db.select().from(factoryKeyblends)
      .where(eq(factoryKeyblends.isActive, true))
      .orderBy(asc(factoryKeyblends.code));

    // Bileşenlerle birlikte
    const result = [];
    for (const kb of keyblends) {
      const ingredients = await db.select().from(factoryKeyblendIngredients)
        .where(eq(factoryKeyblendIngredients.keyblendId, kb.id))
        .orderBy(asc(factoryKeyblendIngredients.sortOrder));
      result.push({ ...kb, ingredients });
    }

    res.json(result);
  } catch (error) {
    console.error("Keyblends list error:", error);
    res.status(500).json({ error: "Keyblend'ler yüklenemedi" });
  }
});

// GET /api/factory/keyblends/:id/ingredients — Keyblend bileşenleri (EN GİZLİ!)
router.get("/api/factory/keyblends/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (KEYBLEND_ROLES.includes(req.user.role)) {
      // Admin + Reçete GM: TAM erişim
      const ingredients = await db.select().from(factoryKeyblendIngredients)
        .where(eq(factoryKeyblendIngredients.keyblendId, id))
        .orderBy(asc(factoryKeyblendIngredients.sortOrder));
      return res.json(ingredients);
    }

    if (req.user.role === "gida_muhendisi") {
      // Gıda müh: sadece show_name_to_gm=true olanların ismi (oran YOK)
      const [kb] = await db.select().from(factoryKeyblends).where(eq(factoryKeyblends.id, id));
      if (!kb?.showToGm) return res.status(403).json({ error: "Bu keyblend bileşenleri size açık değil" });

      const ingredients = await db.select({
        id: factoryKeyblendIngredients.id,
        name: factoryKeyblendIngredients.name,
        isAllergen: factoryKeyblendIngredients.isAllergen,
        allergenType: factoryKeyblendIngredients.allergenType,
      }).from(factoryKeyblendIngredients)
        .where(and(
          eq(factoryKeyblendIngredients.keyblendId, id),
          eq(factoryKeyblendIngredients.showNameToGm, true)
        ));
      return res.json(ingredients); // ORAN YOK — sadece isim + alerjen
    }

    return res.status(403).json({ error: "Keyblend bileşen erişimi yok" });
  } catch (error) {
    console.error("Keyblend ingredients error:", error);
    res.status(500).json({ error: "Bileşenler yüklenemedi" });
  }
});

// POST /api/factory/keyblends — Keyblend oluştur
router.post("/api/factory/keyblends", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!KEYBLEND_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { ingredients, ...keyblendData } = req.body;

    const [kb] = await db.insert(factoryKeyblends)
      .values({ ...keyblendData, createdBy: req.user.id })
      .returning();

    // Bileşenleri ekle
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        await db.insert(factoryKeyblendIngredients).values({ ...ing, keyblendId: kb.id });
      }
      // Toplam ağırlık hesapla
      const total = ingredients.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
      await db.update(factoryKeyblends).set({ totalWeight: String(total) }).where(eq(factoryKeyblends.id, kb.id));
    }

    res.json(kb);
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Bu kodla keyblend zaten var" });
    console.error("Create keyblend error:", error);
    res.status(500).json({ error: "Keyblend oluşturulamadı" });
  }
});

// ═══════════════════════════════════════
// ÜRETİM LOG
// ═══════════════════════════════════════

// POST /api/factory/recipes/:id/start-production
router.post("/api/factory/recipes/:id/start-production", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!PRODUCTION_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Üretim başlatma yetkiniz yok" });

    const recipeId = Number(req.params.id);
    const { batchMultiplier, sessionId, isArge, argeNotes } = req.body;

    if (isArge && !argeNotes?.trim()) {
      return res.status(400).json({ error: "AR-GE üretiminde not zorunludur" });
    }

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    // Aktif reçete versiyonunu yakala (onaylanmış en son versiyon)
    const [latestVersion] = await db.select({
      id: factoryRecipeVersions.id,
      versionNumber: factoryRecipeVersions.versionNumber,
    })
    .from(factoryRecipeVersions)
    .where(and(
      eq(factoryRecipeVersions.recipeId, recipeId),
      eq(factoryRecipeVersions.status, "approved")
    ))
    .orderBy(desc(factoryRecipeVersions.versionNumber))
    .limit(1);

    const expectedOutput = Math.round((recipe.baseBatchOutput || 1) * Number(batchMultiplier || 1));

    const [log] = await db.insert(factoryProductionLogs).values({
      recipeId,
      recipeVersionId: latestVersion?.id || null,
      recipeVersionNumber: latestVersion?.versionNumber || recipe.version || 1,
      sessionId: sessionId || null,
      batchMultiplier: String(batchMultiplier || 1),
      expectedOutput,
      startedAt: new Date(),
      startedBy: req.user.id,
      status: "in_progress",
      isArge: isArge || false,
      argeNotes: argeNotes || null,
    }).returning();

    res.json(log);
  } catch (error) {
    console.error("Start production error:", error);
    res.status(500).json({ error: "Üretim başlatılamadı" });
  }
});

// POST /api/factory/production-logs/:id/complete
router.post("/api/factory/production-logs/:id/complete", isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { actualOutput, actualWasteKg, actualLossGrams, qualityScore, qcNotes, notes } = req.body;

    const [updated] = await db.update(factoryProductionLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy: req.user.id,
        actualOutput,
        actualWasteKg: actualWasteKg ? String(actualWasteKg) : null,
        actualLossGrams: actualLossGrams ? String(actualLossGrams) : null,
        qualityScore,
        qcNotes,
        notes,
      })
      .where(eq(factoryProductionLogs.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Complete production error:", error);
    res.status(500).json({ error: "Üretim tamamlanamadı" });
  }
});

// GET /api/factory/production-logs — Üretim geçmişi
router.get("/api/factory/production-logs", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const logs = await db.select({
      log: factoryProductionLogs,
      recipeName: factoryRecipes.name,
      recipeCode: factoryRecipes.code,
    })
    .from(factoryProductionLogs)
    .leftJoin(factoryRecipes, eq(factoryProductionLogs.recipeId, factoryRecipes.id))
    .orderBy(desc(factoryProductionLogs.createdAt))
    .limit(100);

    res.json(logs.map(l => ({ ...l.log, recipeName: l.recipeName, recipeCode: l.recipeCode })));
  } catch (error) {
    console.error("Production logs error:", error);
    res.status(500).json({ error: "Üretim logları yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// BATCH HESAPLAMA
// ═══════════════════════════════════════

// GET /api/factory/recipes/:id/calculate?multiplier=1.5
router.get("/api/factory/recipes/:id/calculate", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const id = Number(req.params.id);
    const multiplier = Number(req.query.multiplier || 1);

    const ingredients = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const scaled = ingredients.map(ing => ({
      ...ing,
      scaledAmount: Math.round(Number(ing.amount) * multiplier * 100) / 100,
      // Keyblend bilgisi gizleme
      ...(ing.ingredientType === "keyblend" && !KEYBLEND_ROLES.includes(req.user.role)
        ? { notes: null } : {}),
    }));

    res.json({ multiplier, ingredients: scaled });
  } catch (error) {
    res.status(500).json({ error: "Hesaplama başarısız" });
  }
});

// ═══════════════════════════════════════
// KATEGORİ ERİŞİM YÖNETİMİ (Admin)
// ═══════════════════════════════════════

// GET /api/factory/recipe-access
router.get("/api/factory/recipe-access", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const access = await db.select().from(factoryRecipeCategoryAccess)
      .orderBy(asc(factoryRecipeCategoryAccess.role), asc(factoryRecipeCategoryAccess.category));

    res.json(access);
  } catch (error) {
    res.status(500).json({ error: "Erişim listesi yüklenemedi" });
  }
});

// POST /api/factory/recipe-access — Erişim kuralı ekle/güncelle
router.post("/api/factory/recipe-access", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { role, category, canView, canEdit, canCreate } = req.body;

    const [existing] = await db.select().from(factoryRecipeCategoryAccess)
      .where(and(
        eq(factoryRecipeCategoryAccess.role, role),
        eq(factoryRecipeCategoryAccess.category, category)
      ));

    if (existing) {
      const [updated] = await db.update(factoryRecipeCategoryAccess)
        .set({ canView, canEdit, canCreate, setBy: req.user.id, updatedAt: new Date() })
        .where(eq(factoryRecipeCategoryAccess.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db.insert(factoryRecipeCategoryAccess)
      .values({ role, category, canView, canEdit, canCreate, setBy: req.user.id })
      .returning();

    res.json(created);
  } catch (error) {
    console.error("Recipe access error:", error);
    res.status(500).json({ error: "Erişim kuralı kaydedilemedi" });
  }
});

export default router;
