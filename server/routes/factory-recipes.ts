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
  inventory, users,
} from "@shared/schema";
import { eq, and, desc, sql, isNull, asc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { canonicalIngredientName, INGREDIENT_ALIASES } from "@shared/lib/ingredient-canonical";

const router = Router();

// Task #131: Reçete malzeme insert/update'lerinde isim alanını
// kanonik forma normalize et (yazım/kasa duplicate'ları engellenir)
function normalizeIngredientPayload<T extends { name?: string | null }>(payload: T): T {
  if (payload && typeof payload.name === "string") {
    return { ...payload, name: canonicalIngredientName(payload.name) };
  }
  return payload;
}

// ── Role Guards ──
const RECIPE_ADMIN_ROLES = ["admin", "recete_gm"];
const RECIPE_EDIT_ROLES = ["admin", "recete_gm", "sef"];
const RECIPE_VIEW_ROLES = ["admin", "recete_gm", "gida_muhendisi", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "uretim_sefi"];
const KEYBLEND_ROLES = ["admin", "recete_gm"]; // Keyblend içerik = en gizli
const PRODUCTION_ROLES = ["admin", "recete_gm", "sef", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "uretim_sefi"];
const GRAMMAGE_APPROVE_ROLES = ["admin", "recete_gm", "gida_muhendisi"];

function isFactoryRole(role: string): boolean {
  return RECIPE_VIEW_ROLES.includes(role);
}

// Task #163: change_log'tan Sema gramaj onayını parse et
// Pattern: "[YYYY-MM-DD ... Sema/{userId}] Üretim formülü ile karşılaştırma: ONAYLANDI"
export function parseGrammageApproval(changeLog: string | null | undefined):
  { approved: boolean; date: string | null; userId: string | null; note: string | null } {
  if (!changeLog) return { approved: false, date: null, userId: null, note: null };
  const re = /\[(\d{4}-\d{2}-\d{2})[^\]]*?Sema\/([^\]\s]+)\][^\n]*?Üretim formülü ile karşılaştırma:\s*ONAYLANDI\.?\s*([^\n]*)/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(changeLog)) !== null) last = m;
  if (!last) return { approved: false, date: null, userId: null, note: null };
  return { approved: true, date: last[1], userId: last[2], note: (last[3] || "").trim() || null };
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

    // Malzemeler — inventory bilgisi ile birlikte
    const ingredientRows = await db.select({
      ing: factoryRecipeIngredients,
      invCode: inventory.code,
      invName: inventory.name,
      invUnit: inventory.unit,
      invMarketPrice: inventory.marketPrice,
      invConversionFactor: inventory.conversionFactor,
    }).from(factoryRecipeIngredients)
      .leftJoin(inventory, eq(factoryRecipeIngredients.rawMaterialId, inventory.id))
      .where(eq(factoryRecipeIngredients.recipeId, id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const COST_VIEW_ROLES = ["admin", "ceo", "recete_gm", "gida_muhendisi", "satinalma"];
    const canViewCost = COST_VIEW_ROLES.includes(req.user.role);

    const safeIngredients = ingredientRows.map(row => {
      const ing = row.ing;
      const base: any = {
        ...ing,
        inventoryCode: row.invCode || null,
        inventoryName: row.invName || null,
        linked: !!row.invCode,
      };
      if (canViewCost) {
        const price = Number(row.invMarketPrice || 0);
        const conv = Number(row.invConversionFactor || 1000);
        const amount = Number(ing.amount || 0);
        const pricePerUnit = conv > 0 ? price / conv : 0;
        base.unitPrice = pricePerUnit;
        base.lineCost = amount * pricePerUnit;
        base.hasPrice = price > 0;
      }
      if (ing.ingredientType === "keyblend" && !KEYBLEND_ROLES.includes(req.user.role)) {
        base.notes = null;
      }
      return base;
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

    const INGREDIENT_EDIT_ROLES = ["admin", "ceo", "gida_muhendisi"];
    const PRICE_EDIT_ROLES = ["admin", "ceo", "satinalma"];

    // Task #163: Sema gramaj onay durumu
    const approval = parseGrammageApproval(recipe.changeLog);
    let approvedByName: string | null = null;
    if (approval.userId) {
      const [u] = await db.select({
        firstName: users.firstName, lastName: users.lastName, username: users.username, id: users.id,
      }).from(users).where(eq(users.id, approval.userId)).limit(1);
      if (u) approvedByName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.id;
    }

    res.json({
      ...recipe,
      ingredients: safeIngredients,
      steps,
      childRecipes,
      canViewCost,
      canEditIngredients: INGREDIENT_EDIT_ROLES.includes(req.user.role),
      canEditPrices: PRICE_EDIT_ROLES.includes(req.user.role),
      grammageApproval: {
        approved: approval.approved,
        date: approval.date,
        userId: approval.userId,
        userName: approvedByName,
        note: approval.note,
        canApprove: GRAMMAGE_APPROVE_ROLES.includes(req.user.role),
      },
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

    // ── Otomatik versiyon snapshot (düzenlemeden ÖNCE) ──
    const { changeDescription, skipVersion, ...updateFields } = req.body;
    let newVersionNumber: number | null = null;

    if (!skipVersion) {
      // Mevcut malzeme + adımları snapshot al
      const currentIngredients = await db.select().from(factoryRecipeIngredients)
        .where(eq(factoryRecipeIngredients.recipeId, id))
        .orderBy(asc(factoryRecipeIngredients.sortOrder));
      const currentSteps = await db.select().from(factoryRecipeSteps)
        .where(eq(factoryRecipeSteps.recipeId, id))
        .orderBy(asc(factoryRecipeSteps.stepNumber));

      // Son versiyon numarasını bul
      const [lastVersion] = await db.select({ vn: factoryRecipeVersions.versionNumber })
        .from(factoryRecipeVersions)
        .where(eq(factoryRecipeVersions.recipeId, id))
        .orderBy(desc(factoryRecipeVersions.versionNumber))
        .limit(1);

      newVersionNumber = (lastVersion?.vn || recipe.version || 0) + 1;

      // Maliyet snapshot
      const costSnapshot = {
        rawMaterialCost: Number(recipe.rawMaterialCost || 0),
        laborCost: Number(recipe.laborCost || 0),
        energyCost: Number(recipe.energyCost || 0),
        totalBatchCost: Number(recipe.totalBatchCost || 0),
        unitCost: Number(recipe.unitCost || 0),
      };

      // Versiyon oluştur
      await db.insert(factoryRecipeVersions).values({
        recipeId: id,
        versionNumber: newVersionNumber,
        ingredientsSnapshot: currentIngredients,
        stepsSnapshot: currentSteps,
        costSnapshot,
        changedBy: req.user.id,
        changeDescription: changeDescription || `v${newVersionNumber} — ${req.user.role} tarafından güncellendi`,
        status: RECIPE_ADMIN_ROLES.includes(req.user.role) ? "approved" : "pending",
        ...(RECIPE_ADMIN_ROLES.includes(req.user.role) ? { approvedBy: req.user.id, approvedAt: new Date() } : {}),
      });
    }

    // ── Güncellemeyi uygula ──
    const setData: Record<string, any> = {
      ...updateFields,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    };
    if (newVersionNumber) setData.version = newVersionNumber;

    const [updated] = await db.update(factoryRecipes)
      .set(setData)
      .where(eq(factoryRecipes.id, id))
      .returning();

    res.json({ ...updated, versionCreated: newVersionNumber });
  } catch (error) {
    console.error("Update factory recipe error:", error);
    res.status(500).json({ error: "Reçete güncellenemedi" });
  }
});

// POST /api/factory/recipes/:id/approve-grammage — Sema gramaj onayı (Task #163)
// Tek tıkla change_log'a "[YYYY-MM-DD - Sema/{userId}] ... ONAYLANDI" satırı ekler.
// İdempotent — aynı kullanıcı aynı gün tekrar onaylasa da yeni satır eklenmez.
router.post("/api/factory/recipes/:id/approve-grammage", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!GRAMMAGE_APPROVE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Gramaj onay yetkisi sadece Gıda Mühendisi, Reçete GM ve Admin için" });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Geçersiz reçete id" });

    const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, id));
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    const note: string = (req.body?.note || "").toString().trim().slice(0, 500);
    const today = new Date().toISOString().slice(0, 10);
    const userId = req.user.id;
    const newLine = `[${today} - Sema/${userId}] Üretim formülü ile karşılaştırma: ONAYLANDI.${note ? " " + note : ""}`;

    // İdempotency: aynı tarih + aynı user için onay satırı varsa tekrar ekleme
    const existing = recipe.changeLog || "";
    const dupRe = new RegExp(`\\[${today}[^\\]]*?Sema\\/${userId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\][^\\n]*?ONAYLANDI`);
    if (dupRe.test(existing)) {
      const approval = parseGrammageApproval(existing);
      return res.json({ ok: true, alreadyApproved: true, grammageApproval: approval });
    }

    const newLog = existing ? `${existing}\n${newLine}` : newLine;

    const [updated] = await db.update(factoryRecipes)
      .set({ changeLog: newLog, updatedBy: userId, updatedAt: new Date() })
      .where(eq(factoryRecipes.id, id))
      .returning();

    const approval = parseGrammageApproval(updated.changeLog);
    res.json({ ok: true, grammageApproval: approval });
  } catch (error) {
    console.error("Grammage approve error:", error);
    res.status(500).json({ error: "Gramaj onayı kaydedilemedi" });
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
// KANONİK MALZEME İSİM LİSTESİ (auto-complete)
// ═══════════════════════════════════════

// GET /api/factory/ingredient-names — Sıralı kanonik malzeme isim listesi
// Frontend reçete editöründeki Combobox'ı besler. Kullanıcı yeni isim
// girerse uyarı gösterilebilir; nutrition tablosunda karşılığı yok demektir.
router.get("/api/factory/ingredient-names", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });

    // 1) Kanonik kaynak: factory_ingredient_nutrition.ingredient_name
    const nutritionRows = await db.select({ name: factoryIngredientNutrition.ingredientName })
      .from(factoryIngredientNutrition)
      .orderBy(asc(factoryIngredientNutrition.ingredientName));

    // 2) Reçetelerde kullanılmış ama nutrition'da olmayan isimler de listeye
    //    eklensin (yine de seçilebilsin), ama "hasNutrition: false" işaretiyle.
    const ingredientRows = await db.selectDistinct({ name: factoryRecipeIngredients.name })
      .from(factoryRecipeIngredients);

    const nutritionSet = new Set(
      nutritionRows.map(r => canonicalIngredientName(r.name || "")).filter(Boolean)
    );

    const merged = new Map<string, { name: string; hasNutrition: boolean }>();
    for (const r of nutritionRows) {
      const n = canonicalIngredientName(r.name || "");
      if (!n) continue;
      merged.set(n, { name: n, hasNutrition: true });
    }
    for (const r of ingredientRows) {
      const n = canonicalIngredientName(r.name || "");
      if (!n) continue;
      if (!merged.has(n)) {
        merged.set(n, { name: n, hasNutrition: nutritionSet.has(n) });
      }
    }

    const list = Array.from(merged.values())
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    res.json(list);
  } catch (error) {
    console.error("Ingredient names list error:", error);
    res.status(500).json({ error: "Malzeme isim listesi yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// MALZEME BESİN DEĞERLERİ (Task #165)
// ═══════════════════════════════════════

// GET /api/factory/ingredient-nutrition/:name — İsim bazlı besin/alerjen kaydı
// Reçete editöründe onay diyalogu açıldığında mevcut kaydı önyüklemek için.
router.get("/api/factory/ingredient-nutrition/:name", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!isFactoryRole(req.user.role)) return res.status(403).json({ error: "Fabrika erişimi gerekli" });
    // Express params zaten URL-decode edilmiş halde gelir; ekstra decode
    // "%" içeren isimlerde URIError'a yol açabilir.
    const canonical = canonicalIngredientName(req.params.name || "");
    if (!canonical) return res.json(null);
    const [row] = await db.select().from(factoryIngredientNutrition)
      .where(eq(factoryIngredientNutrition.ingredientName, canonical))
      .limit(1);
    res.json(row || null);
  } catch (error) {
    console.error("Get ingredient nutrition error:", error);
    res.status(500).json({ error: "Besin değer kaydı yüklenemedi" });
  }
});

// PUT /api/factory/ingredient-nutrition/:name — Sadece besin/alerjen güncelle
// Recete malzemesi eklemeden mevcut bir kaydı düzenlemek için (yazım hatası
// vb. düzeltmeler). Upsert davranışı: kayıt yoksa oluşturur.
router.put("/api/factory/ingredient-nutrition/:name", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const canonical = canonicalIngredientName(req.params.name || "");
    if (!canonical) return res.status(400).json({ error: "Geçersiz isim" });

    const body = (req.body || {}) as {
      energyKcal?: string | number | null; fatG?: string | number | null;
      saturatedFatG?: string | number | null; carbohydrateG?: string | number | null;
      sugarG?: string | number | null; proteinG?: string | number | null;
      saltG?: string | number | null; allergens?: string[];
    };
    const toNum = (v: string | number | null | undefined): string | null =>
      v === "" || v == null || isNaN(Number(v)) ? null : String(Number(v));
    const nutValues = {
      energyKcal: toNum(body.energyKcal),
      fatG: toNum(body.fatG),
      saturatedFatG: toNum(body.saturatedFatG),
      carbohydrateG: toNum(body.carbohydrateG),
      sugarG: toNum(body.sugarG),
      proteinG: toNum(body.proteinG),
      saltG: toNum(body.saltG),
      allergens: Array.isArray(body.allergens) ? body.allergens : [],
    };
    const [row] = await db.insert(factoryIngredientNutrition).values({
      ingredientName: canonical,
      ...nutValues,
      source: "manual",
      verifiedBy: req.user.id,
    }).onConflictDoUpdate({
      target: factoryIngredientNutrition.ingredientName,
      set: {
        ...nutValues,
        source: "manual",
        verifiedBy: req.user.id,
        updatedAt: new Date(),
      },
    }).returning();
    res.json(row);
  } catch (error) {
    console.error("Upsert ingredient nutrition error:", error);
    res.status(500).json({ error: "Besin değer kaydı güncellenemedi" });
  }
});

// ═══════════════════════════════════════
// MALZEMELER — CRUD
// ═══════════════════════════════════════

// PATCH /api/factory/recipes/:recipeId/ingredients/:id — Malzeme düzenle
router.patch("/api/factory/recipes/:recipeId/ingredients/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const INGREDIENT_EDIT_ROLES = ["admin", "ceo", "gida_muhendisi"];
    if (!INGREDIENT_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const ingredientId = Number(req.params.id);
    const { name, amount, unit, rawMaterialId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = canonicalIngredientName(name);
    if (amount !== undefined) updateData.amount = String(amount);
    if (unit !== undefined) updateData.unit = unit;
    if (rawMaterialId !== undefined) updateData.rawMaterialId = rawMaterialId;

    const [updated] = await db.update(factoryRecipeIngredients)
      .set(updateData)
      .where(eq(factoryRecipeIngredients.id, ingredientId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update ingredient error:", error);
    res.status(500).json({ error: "Malzeme güncellenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients — Malzeme ekle
// Task #152: Body'de opsiyonel `nutrition` alanı varsa, aynı transaksiyon
// içinde factory_ingredient_nutrition tablosuna da kayıt eklenir
// (ingredient_name unique olduğu için onConflictDoNothing — mevcut veriyi ezmeyiz).
router.post("/api/factory/recipes/:id/ingredients", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    type NutritionPayload = {
      energyKcal?: string | number | null;
      fatG?: string | number | null;
      saturatedFatG?: string | number | null;
      carbohydrateG?: string | number | null;
      sugarG?: string | number | null;
      proteinG?: string | number | null;
      saltG?: string | number | null;
      allergens?: string[];
    };

    const recipeId = Number(req.params.id);
    const body = (req.body || {}) as { nutrition?: NutritionPayload } & Record<string, unknown> & { name?: string | null };
    const { nutrition, ...ingredientPayload } = body;
    const normalized = normalizeIngredientPayload(ingredientPayload);

    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(factoryRecipeIngredients)
        .values({ ...normalized, recipeId })
        .returning();

      // Opsiyonel besin değer + alerjen kaydı (yeni kanonik dışı malzemeler için)
      if (nutrition && typeof nutrition === "object") {
        const ingredientName = normalized.name?.trim();
        const hasAnyValue =
          nutrition.energyKcal != null ||
          nutrition.fatG != null ||
          nutrition.saturatedFatG != null ||
          nutrition.carbohydrateG != null ||
          nutrition.sugarG != null ||
          nutrition.proteinG != null ||
          nutrition.saltG != null ||
          (Array.isArray(nutrition.allergens) && nutrition.allergens.length > 0);

        if (ingredientName && hasAnyValue) {
          const toNum = (v: string | number | null | undefined): string | null =>
            v === "" || v == null || isNaN(Number(v)) ? null : String(Number(v));
          // Task #165: mevcut kayıt varsa üstüne yaz (audit alanları güncellenir)
          const allergensArr = Array.isArray(nutrition.allergens) ? nutrition.allergens : [];
          const nutValues = {
            energyKcal: toNum(nutrition.energyKcal),
            fatG: toNum(nutrition.fatG),
            saturatedFatG: toNum(nutrition.saturatedFatG),
            carbohydrateG: toNum(nutrition.carbohydrateG),
            sugarG: toNum(nutrition.sugarG),
            proteinG: toNum(nutrition.proteinG),
            saltG: toNum(nutrition.saltG),
            allergens: allergensArr,
          };
          await tx.insert(factoryIngredientNutrition).values({
            ingredientName: canonicalIngredientName(ingredientName),
            ...nutValues,
            source: "manual",
            verifiedBy: req.user.id,
          }).onConflictDoUpdate({
            target: factoryIngredientNutrition.ingredientName,
            set: {
              ...nutValues,
              source: "manual",
              verifiedBy: req.user.id,
              updatedAt: new Date(),
            },
          });
        }
      }

      return row;
    });

    res.json(created);
  } catch (error) {
    console.error("Add ingredient error:", error);
    res.status(500).json({ error: "Malzeme eklenemedi" });
  }
});

// POST /api/factory/recipes/:id/ingredients/bulk — Toplu malzeme kaydet
// Task #153: Kanonik-dışı (sözlükte ve nutrition tablosunda olmayan) isimler
// için server tarafında uyarı. `?force=true` veya body'de `allowUnknown: true`
// olmadan kanonik-dışı isim varsa 400 + `unknownIngredients: string[]` döner.
router.post("/api/factory/recipes/:id/ingredients/bulk", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!RECIPE_EDIT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const recipeId = Number(req.params.id);
    const { ingredients, allowUnknown } = req.body;
    if (!Array.isArray(ingredients)) return res.status(400).json({ error: "ingredients array gerekli" });

    const force = req.query.force === "true" || allowUnknown === true;

    // Bilinen isimler kümesi: kanonik sözlük (INGREDIENT_ALIASES anahtarları) +
    // factory_ingredient_nutrition tablosundaki kanonikleştirilmiş isimler.
    // Mevcut reçete malzemeleri kasten hariç — tarihi typo'lar bypass aracı
    // olmasın (Task #153).
    const nutritionRows = await db.select({ name: factoryIngredientNutrition.ingredientName })
      .from(factoryIngredientNutrition);

    const knownSet = new Set<string>();
    for (const canonical of Object.keys(INGREDIENT_ALIASES)) {
      knownSet.add(canonical);
    }
    for (const r of nutritionRows) {
      const n = canonicalIngredientName(r.name || "");
      if (n) knownSet.add(n);
    }

    const unknownIngredients: string[] = [];
    for (const ing of ingredients) {
      const raw = typeof ing?.name === "string" ? ing.name.trim() : "";
      if (!raw) continue;
      const canonical = canonicalIngredientName(raw);
      if (!knownSet.has(canonical) && !unknownIngredients.includes(raw)) {
        unknownIngredients.push(raw);
      }
    }

    if (unknownIngredients.length > 0 && !force) {
      return res.status(400).json({
        error: "Kanonik olmayan malzeme isimleri",
        message: "Bazı malzemeler kanonik isim listesinde değil. Devam etmek için onay gerekli.",
        unknownIngredients,
      });
    }

    // Mevcut malzemeleri sil, yenilerini ekle (replace stratejisi)
    await db.delete(factoryRecipeIngredients).where(eq(factoryRecipeIngredients.recipeId, recipeId));

    const created = [];
    for (const ing of ingredients) {
      const [row] = await db.insert(factoryRecipeIngredients)
        .values({ ...normalizeIngredientPayload(ing), recipeId })
        .returning();
      created.push(row);
    }

    res.json({ ingredients: created, unknownIngredients });
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
