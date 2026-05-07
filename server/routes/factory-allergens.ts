/**
 * Müşteriye dönük Alerjen + Besin Tablosu API
 * Task #130 — /kalite/alerjen sayfası için
 *
 * Veriler factory_recipe_ingredients ↔ factory_ingredient_nutrition JOIN'inden
 * her istek anında hesaplanır. Reçete üzerindeki snapshot kolonları (allergens,
 * nutrition_facts) yerine canlı hesap kullanılır — Sema Gıda 111 malzemeyi
 * verify ettiği için confidence=100 olan kayıtlar "doğrulanmış" sayılır.
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  factoryRecipes,
  factoryRecipeIngredients,
  factoryIngredientNutrition,
  factoryKeyblendIngredients,
  factoryRecipeLabelPrintLogs,
  users,
} from "@shared/schema";
import { and, asc, desc, eq, sql, inArray, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticated } from "../localAuth";
import { parseGrammageApproval } from "./factory-recipes";

const router = Router();

const ALLERGEN_VIEW_ROLES = [
  "admin",
  "fabrika_muduru",
  "fabrika_mudur",
  "kalite_yoneticisi",
  "kalite_kontrol",
  "gida_muhendisi",
  "recete_gm",
  "musteri",
];

function requireAllergenViewRole(req: any, res: Response, next: any) {
  const role = req.user?.role || "";
  if (!ALLERGEN_VIEW_ROLES.includes(role)) {
    return res.status(403).json({ error: "Bu bilgilere erişim yetkiniz yok" });
  }
  next();
}

const VERIFIED_CONFIDENCE_MIN = 80;

type IngredientRow = typeof factoryRecipeIngredients.$inferSelect;

interface NutritionRow {
  ingredientName: string;
  energyKcal: any;
  fatG: any;
  saturatedFatG: any;
  carbohydrateG: any;
  sugarG: any;
  fiberG: any;
  proteinG: any;
  saltG: any;
  allergens: string[] | null;
  confidence: number | null;
  source: string | null;
  verifiedBy: string | null;
  updatedAt: Date | string | null;
}

interface PerHundredGrams {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbohydrate_g: number;
  sugar_g: number;
  fiber_g: number;
  protein_g: number;
  salt_g: number;
}

const ZERO: PerHundredGrams = {
  energy_kcal: 0, fat_g: 0, saturated_fat_g: 0, carbohydrate_g: 0,
  sugar_g: 0, fiber_g: 0, protein_g: 0, salt_g: 0,
};

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundNutrition(n: PerHundredGrams): PerHundredGrams {
  return {
    energy_kcal: Math.round(n.energy_kcal),
    fat_g: round1(n.fat_g),
    saturated_fat_g: round1(n.saturated_fat_g),
    carbohydrate_g: round1(n.carbohydrate_g),
    sugar_g: round1(n.sugar_g),
    fiber_g: round1(n.fiber_g),
    protein_g: round1(n.protein_g),
    salt_g: round1(n.salt_g),
  };
}

function findNutritionMatch(name: string, nutritionMap: Map<string, NutritionRow>): NutritionRow | null {
  const lower = (name || "").toLowerCase().trim();
  if (!lower) return null;
  const exact = nutritionMap.get(lower);
  if (exact) return exact;
  // Substring fallback — uzun reçete malzeme adları için
  for (const [key, value] of nutritionMap.entries()) {
    if (key.length >= 4 && (lower.includes(key) || key.includes(lower))) {
      return value;
    }
  }
  return null;
}

interface RecipeComputation {
  recipeId: number;
  totalGrams: number;
  matchedCount: number;
  totalCount: number;
  per100g: PerHundredGrams;
  allergens: string[];
  unmatched: string[];
  ingredientBreakdown: Array<{
    name: string;
    amount: number;
    unit: string;
    matched: boolean;
    matchedName?: string;
    allergens: string[];
    confidence?: number | null;
    source?: string | null;
    verifiedBy?: string | null;
    updatedAt?: string | null;
  }>;
  isVerified: boolean;
  verificationReason: string | null;
  lowConfidenceCount: number;
  minConfidence: number | null;
  approvedCount: number;
}

export async function computeRecipeNutrition(
  recipeId: number,
  ingredients: IngredientRow[],
  nutritionMap: Map<string, NutritionRow>,
  keyblendAllergensByKbId: Map<number, Set<string>>,
): Promise<RecipeComputation> {
  // Yalnızca gram cinsinden malzemeleri toplama dahil et
  const gramIngredients = ingredients.filter(i => {
    const u = (i.unit || "").toLowerCase();
    return u === "gr" || u === "g" || u === "gram";
  });
  const totalGrams = gramIngredients.reduce((s, i) => s + num(i.amount), 0);

  let acc: PerHundredGrams = { ...ZERO };
  const allergenSet = new Set<string>();
  const unmatched: string[] = [];
  let matchedCount = 0;
  const breakdown: RecipeComputation["ingredientBreakdown"] = [];

  for (const ing of ingredients) {
    const unit = (ing.unit || "").toLowerCase();
    const isGram = unit === "gr" || unit === "g" || unit === "gram";
    const amount = num(ing.amount);
    const match = findNutritionMatch(ing.name, nutritionMap);

    let ingAllergens: string[] = [];
    if (match?.allergens && match.allergens.length > 0) {
      ingAllergens = match.allergens;
      ingAllergens.forEach(a => allergenSet.add(a));
    }

    // Keyblend içindeki alerjenler
    if ((ing.ingredientType || "normal") === "keyblend" && ing.keyblendId) {
      const kbAllergens = keyblendAllergensByKbId.get(ing.keyblendId);
      if (kbAllergens) {
        kbAllergens.forEach(a => {
          allergenSet.add(a);
          if (!ingAllergens.includes(a)) ingAllergens.push(a);
        });
      }
    }

    if (match && isGram && totalGrams > 0) {
      const ratio = amount / totalGrams;
      acc.energy_kcal += num(match.energyKcal) * ratio;
      acc.fat_g += num(match.fatG) * ratio;
      acc.saturated_fat_g += num(match.saturatedFatG) * ratio;
      acc.carbohydrate_g += num(match.carbohydrateG) * ratio;
      acc.sugar_g += num(match.sugarG) * ratio;
      acc.fiber_g += num(match.fiberG) * ratio;
      acc.protein_g += num(match.proteinG) * ratio;
      acc.salt_g += num(match.saltG) * ratio;
      matchedCount++;
    } else if (!match) {
      unmatched.push(ing.name);
    }

    breakdown.push({
      name: ing.name,
      amount,
      unit: ing.unit,
      matched: !!match,
      matchedName: match?.ingredientName,
      allergens: ingAllergens,
      confidence: match?.confidence ?? null,
      source: match?.source ?? null,
      verifiedBy: match?.verifiedBy ?? null,
      updatedAt: match?.updatedAt
        ? (match.updatedAt instanceof Date
            ? match.updatedAt.toISOString()
            : new Date(match.updatedAt).toISOString())
        : null,
    });
  }

  const isVerified =
    ingredients.length > 0 &&
    matchedCount === ingredients.length &&
    breakdown.every(b => !b.matched || (b.confidence ?? 0) >= VERIFIED_CONFIDENCE_MIN);

  const matchedConfidences = breakdown
    .filter(b => b.matched && b.confidence != null)
    .map(b => b.confidence as number);
  const lowConfidenceCount = matchedConfidences.filter(c => c < VERIFIED_CONFIDENCE_MIN).length;
  const minConfidence = matchedConfidences.length > 0 ? Math.min(...matchedConfidences) : null;

  let verificationReason: string | null = null;
  if (!isVerified) {
    if (ingredients.length === 0) {
      verificationReason = "Malzeme listesi henüz girilmedi";
    } else if (matchedCount < ingredients.length) {
      const missing = ingredients.length - matchedCount;
      verificationReason = `Sema Gıda onayı bekleniyor — ${missing} malzemenin besin değeri henüz eşleşmedi`;
    } else if (lowConfidenceCount > 0) {
      verificationReason = `Düşük güven skoru — ${lowConfidenceCount} malzeme ${VERIFIED_CONFIDENCE_MIN} eşiğinin altında`;
    } else {
      verificationReason = "Henüz tam doğrulanmadı";
    }
  }

  const approvedCount = breakdown.filter(b =>
    b.matched &&
    b.confidence === 100 &&
    (b.source ?? "").toLowerCase().includes("manual_verified")
  ).length;

  return {
    recipeId,
    totalGrams,
    matchedCount,
    totalCount: ingredients.length,
    per100g: roundNutrition(acc),
    allergens: Array.from(allergenSet).sort(),
    unmatched,
    ingredientBreakdown: breakdown,
    isVerified,
    verificationReason,
    lowConfidenceCount,
    minConfidence,
    approvedCount,
  };
}

export async function loadNutritionMap(): Promise<Map<string, NutritionRow>> {
  const rows = await db.select({
    ingredientName: factoryIngredientNutrition.ingredientName,
    energyKcal: factoryIngredientNutrition.energyKcal,
    fatG: factoryIngredientNutrition.fatG,
    saturatedFatG: factoryIngredientNutrition.saturatedFatG,
    carbohydrateG: factoryIngredientNutrition.carbohydrateG,
    sugarG: factoryIngredientNutrition.sugarG,
    fiberG: factoryIngredientNutrition.fiberG,
    proteinG: factoryIngredientNutrition.proteinG,
    saltG: factoryIngredientNutrition.saltG,
    allergens: factoryIngredientNutrition.allergens,
    confidence: factoryIngredientNutrition.confidence,
    source: factoryIngredientNutrition.source,
    verifiedBy: factoryIngredientNutrition.verifiedBy,
    // Onay tarihi göstergesi: kayıt güncellendiğinde DB trigger'ı updated_at'i
    // otomatik tazeler (task #156).
    updatedAt: factoryIngredientNutrition.updatedAt,
  }).from(factoryIngredientNutrition);
  const map = new Map<string, NutritionRow>();
  for (const r of rows) {
    map.set(r.ingredientName.toLowerCase().trim(), r as NutritionRow);
  }
  return map;
}

export async function loadKeyblendAllergens(
  nutritionMap: Map<string, NutritionRow>,
): Promise<Map<number, Set<string>>> {
  const rows = await db.select().from(factoryKeyblendIngredients);
  const map = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!r.keyblendId) continue;
    const set = map.get(r.keyblendId) || new Set<string>();
    if (r.isAllergen) {
      const match = findNutritionMatch(r.name, nutritionMap);
      if (match?.allergens) match.allergens.forEach(a => set.add(a));
    }
    map.set(r.keyblendId, set);
  }
  return map;
}

// ═══════════════════════════════════════
// GET /api/quality/allergens/recipes
// ═══════════════════════════════════════
router.get("/api/quality/allergens/recipes", isAuthenticated, requireAllergenViewRole, async (_req: any, res: Response) => {
  try {
    const nutritionMap = await loadNutritionMap();
    const keyblendAllergens = await loadKeyblendAllergens(nutritionMap);

    const recipes = await db.select({
      id: factoryRecipes.id,
      name: factoryRecipes.name,
      code: factoryRecipes.code,
      category: factoryRecipes.category,
      outputType: factoryRecipes.outputType,
      coverPhotoUrl: factoryRecipes.coverPhotoUrl,
      expectedUnitWeight: factoryRecipes.expectedUnitWeight,
      baseBatchOutput: factoryRecipes.baseBatchOutput,
      changeLog: factoryRecipes.changeLog,
    })
    .from(factoryRecipes)
    .where(and(eq(factoryRecipes.isActive, true), eq(factoryRecipes.isVisible, true)))
    .orderBy(asc(factoryRecipes.category), asc(factoryRecipes.name));

    if (recipes.length === 0) return res.json({ verified: [], unverified: [], stats: { verified: 0, unverified: 0, totalIngredientsCovered: nutritionMap.size } });

    const recipeIds = recipes.map(r => r.id);
    const allIngredients = await db.select().from(factoryRecipeIngredients)
      .where(sql`${factoryRecipeIngredients.recipeId} IN (${sql.join(recipeIds.map(id => sql`${id}`), sql`, `)})`);

    const ingByRecipe = new Map<number, IngredientRow[]>();
    for (const ing of allIngredients) {
      const arr = ingByRecipe.get(ing.recipeId) || [];
      arr.push(ing);
      ingByRecipe.set(ing.recipeId, arr);
    }

    const verified: any[] = [];
    const unverified: any[] = [];

    for (const r of recipes) {
      const ings = ingByRecipe.get(r.id) || [];
      const comp = await computeRecipeNutrition(r.id, ings, nutritionMap, keyblendAllergens);
      const grammage = parseGrammageApproval(r.changeLog);
      const summary = {
        id: r.id,
        name: r.name,
        code: r.code,
        category: r.category,
        outputType: r.outputType,
        coverPhotoUrl: r.coverPhotoUrl,
        expectedUnitWeight: r.expectedUnitWeight ? Number(r.expectedUnitWeight) : null,
        per100g: comp.per100g,
        allergens: comp.allergens,
        ingredientCount: comp.totalCount,
        matchedCount: comp.matchedCount,
        approvedCount: comp.approvedCount,
        unmatchedNames: comp.unmatched,
        isVerified: comp.isVerified,
        verificationReason: comp.verificationReason,
        lowConfidenceCount: comp.lowConfidenceCount,
        minConfidence: comp.minConfidence,
        grammageApproved: grammage.approved,
        grammageApprovalDate: grammage.date,
      };
      if (comp.isVerified) verified.push(summary);
      else unverified.push(summary);
    }

    res.json({
      verified,
      unverified,
      stats: {
        verified: verified.length,
        unverified: unverified.length,
        totalIngredientsCovered: nutritionMap.size,
      },
    });
  } catch (error) {
    console.error("Allergen recipe list error:", error);
    res.status(500).json({ error: "Alerjen listesi yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// GET /api/quality/allergens/recipes/:id
// ═══════════════════════════════════════
router.get("/api/quality/allergens/recipes/:id", isAuthenticated, requireAllergenViewRole, async (req: any, res: Response) => {
  try {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ error: "Geçersiz reçete id" });

    const [recipe] = await db.select().from(factoryRecipes)
      .where(and(eq(factoryRecipes.id, recipeId), eq(factoryRecipes.isActive, true), eq(factoryRecipes.isVisible, true)))
      .limit(1);
    if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

    const grammage = parseGrammageApproval(recipe.changeLog);

    const nutritionMap = await loadNutritionMap();
    const keyblendAllergens = await loadKeyblendAllergens(nutritionMap);
    const ings = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, recipeId))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const comp = await computeRecipeNutrition(recipeId, ings, nutritionMap, keyblendAllergens);

    // verifier kullanıcı adlarını çöz
    const verifierIds = Array.from(new Set(
      comp.ingredientBreakdown.map(b => b.verifiedBy).filter((v): v is string => !!v)
    ));
    const verifierMap = new Map<string, string>();
    if (verifierIds.length > 0) {
      const verifiers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      }).from(users).where(inArray(users.id, verifierIds));
      for (const v of verifiers) {
        const name = [v.firstName, v.lastName].filter(Boolean).join(" ").trim() || v.username || v.id;
        verifierMap.set(v.id, name);
      }
    }
    const ingredientsWithVerifier = comp.ingredientBreakdown.map(b => ({
      ...b,
      verifiedByName: b.verifiedBy ? (verifierMap.get(b.verifiedBy) ?? null) : null,
    }));

    // Task #174: gıda mühendisi onaylayan kullanıcı adı (etiket damgası için)
    let grammageApprovalUserName: string | null = null;
    if (grammage.userId) {
      const [u] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      }).from(users).where(eq(users.id, grammage.userId)).limit(1);
      if (u) {
        grammageApprovalUserName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.id;
      }
    }

    const portionGrams = recipe.expectedUnitWeight ? Number(recipe.expectedUnitWeight) : null;
    const perPortion = portionGrams ? roundNutrition({
      energy_kcal: comp.per100g.energy_kcal * portionGrams / 100,
      fat_g: comp.per100g.fat_g * portionGrams / 100,
      saturated_fat_g: comp.per100g.saturated_fat_g * portionGrams / 100,
      carbohydrate_g: comp.per100g.carbohydrate_g * portionGrams / 100,
      sugar_g: comp.per100g.sugar_g * portionGrams / 100,
      fiber_g: comp.per100g.fiber_g * portionGrams / 100,
      protein_g: comp.per100g.protein_g * portionGrams / 100,
      salt_g: comp.per100g.salt_g * portionGrams / 100,
    }) : null;

    res.json({
      id: recipe.id,
      name: recipe.name,
      code: recipe.code,
      category: recipe.category,
      outputType: recipe.outputType,
      description: recipe.description,
      coverPhotoUrl: recipe.coverPhotoUrl,
      expectedUnitWeight: portionGrams,
      baseBatchOutput: recipe.baseBatchOutput,
      per100g: comp.per100g,
      perPortion,
      allergens: comp.allergens,
      ingredientCount: comp.totalCount,
      matchedCount: comp.matchedCount,
      approvedCount: comp.approvedCount,
      unmatchedNames: comp.unmatched,
      isVerified: comp.isVerified,
      verificationReason: comp.verificationReason,
      lowConfidenceCount: comp.lowConfidenceCount,
      minConfidence: comp.minConfidence,
      ingredients: ingredientsWithVerifier,
      grammageApproved: grammage.approved,
      grammageApprovalDate: grammage.date,
      grammageApprovalUserId: grammage.userId,
      grammageApprovalUserName,
      grammageApprovalNote: grammage.note ?? null,
    });
  } catch (error) {
    console.error("Allergen recipe detail error:", error);
    res.status(500).json({ error: "Reçete alerjen detayı yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// POST /api/quality/allergens/weekly-summary/run
// Yöneticilerin manuel olarak haftalık özeti tetiklemesini sağlar.
// ═══════════════════════════════════════
router.post("/api/quality/allergens/weekly-summary/run", isAuthenticated, async (req: any, res: Response) => {
  const role = req.user?.role || "";
  if (!["admin", "kalite_yoneticisi", "gida_muhendisi"].includes(role)) {
    return res.status(403).json({ error: "Bu işlemi yapma yetkiniz yok" });
  }
  try {
    const { sendAllergenWeeklySummary } = await import("../services/allergen-weekly-summary");
    const result = await sendAllergenWeeklySummary();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Allergen weekly summary trigger error:", error);
    res.status(500).json({ error: "Haftalık özet gönderilemedi" });
  }
});

// Task #187 — Etiket basım logu
// POST /api/quality/allergens/recipes/:id/print-log
// Frontend her PDF indirme sonrası çağırır.
// ═══════════════════════════════════════
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const printLogBodySchema = z.object({
  isDraft: z.boolean().optional().default(false),
  grammageApproved: z.boolean().optional().default(false),
  draftReason: z.string().max(255).optional().nullable(),
  // Task #199 — üretim partisi
  lotNumber: z.string().trim().min(1).max(60).optional().nullable(),
  productionDate: z.string().regex(ISO_DATE_RE).optional().nullable(),
  expiryDate: z.string().regex(ISO_DATE_RE).optional().nullable(),
  // Aynı lot tekrar girildiğinde kullanıcı uyarıyı onayladıysa true gönderilir
  allowDuplicateLot: z.boolean().optional().default(false),
});

router.post(
  "/api/quality/allergens/recipes/:id/print-log",
  isAuthenticated,
  requireAllergenViewRole,
  async (req: any, res: Response) => {
    try {
      const recipeId = Number(req.params.id);
      if (!Number.isFinite(recipeId)) {
        return res.status(400).json({ error: "Geçersiz reçete id" });
      }
      const parsed = printLogBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz istek", details: parsed.error.format() });
      }

      const [recipe] = await db
        .select({ id: factoryRecipes.id, code: factoryRecipes.code, name: factoryRecipes.name })
        .from(factoryRecipes)
        .where(eq(factoryRecipes.id, recipeId))
        .limit(1);
      if (!recipe) return res.status(404).json({ error: "Reçete bulunamadı" });

      const lotNumber = parsed.data.lotNumber?.trim() || null;

      // Duplicate lot check — aynı reçete + aynı lot daha önce basıldıysa uyar
      if (lotNumber && !parsed.data.allowDuplicateLot) {
        const [dupe] = await db
          .select({
            id: factoryRecipeLabelPrintLogs.id,
            printedAt: factoryRecipeLabelPrintLogs.printedAt,
            productionDate: factoryRecipeLabelPrintLogs.productionDate,
            expiryDate: factoryRecipeLabelPrintLogs.expiryDate,
          })
          .from(factoryRecipeLabelPrintLogs)
          .where(and(
            eq(factoryRecipeLabelPrintLogs.recipeId, recipeId),
            eq(factoryRecipeLabelPrintLogs.lotNumber, lotNumber),
          ))
          .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt))
          .limit(1);

        if (dupe) {
          return res.status(409).json({
            error: "duplicate_lot",
            message: `"${lotNumber}" lot numarası bu reçete için daha önce kullanıldı. Devam etmek istiyor musunuz?`,
            duplicate: {
              id: dupe.id,
              printedAt: dupe.printedAt,
              productionDate: dupe.productionDate,
              expiryDate: dupe.expiryDate,
            },
          });
        }
      }

      const [inserted] = await db
        .insert(factoryRecipeLabelPrintLogs)
        .values({
          recipeId,
          recipeCode: recipe.code,
          recipeName: recipe.name,
          printedBy: req.user?.id ?? null,
          isDraft: !!parsed.data.isDraft,
          grammageApproved: !!parsed.data.grammageApproved,
          draftReason: parsed.data.draftReason ?? null,
          lotNumber,
          productionDate: parsed.data.productionDate ?? null,
          expiryDate: parsed.data.expiryDate ?? null,
        })
        .returning();

      res.json({ ok: true, id: inserted.id, printedAt: inserted.printedAt });
    } catch (error) {
      console.error("Etiket basım logu kaydedilemedi:", error);
      res.status(500).json({ error: "Etiket basım logu kaydedilemedi" });
    }
  },
);

// ═══════════════════════════════════════
// GET /api/quality/allergens/recipes/:id/print-log
// Reçete detayında "Geçmiş Etiket Basımları" sekmesi için
// ═══════════════════════════════════════
router.get(
  "/api/quality/allergens/recipes/:id/print-log",
  isAuthenticated,
  requireAllergenViewRole,
  async (req: any, res: Response) => {
    try {
      const recipeId = Number(req.params.id);
      if (!Number.isFinite(recipeId)) {
        return res.status(400).json({ error: "Geçersiz reçete id" });
      }

      const rows = await db
        .select({
          id: factoryRecipeLabelPrintLogs.id,
          recipeId: factoryRecipeLabelPrintLogs.recipeId,
          isDraft: factoryRecipeLabelPrintLogs.isDraft,
          grammageApproved: factoryRecipeLabelPrintLogs.grammageApproved,
          draftReason: factoryRecipeLabelPrintLogs.draftReason,
          lotNumber: factoryRecipeLabelPrintLogs.lotNumber,
          productionDate: factoryRecipeLabelPrintLogs.productionDate,
          expiryDate: factoryRecipeLabelPrintLogs.expiryDate,
          printedAt: factoryRecipeLabelPrintLogs.printedAt,
          printedBy: factoryRecipeLabelPrintLogs.printedBy,
          printedByFirstName: users.firstName,
          printedByLastName: users.lastName,
          printedByUsername: users.username,
          printedByRole: users.role,
        })
        .from(factoryRecipeLabelPrintLogs)
        .leftJoin(users, eq(users.id, factoryRecipeLabelPrintLogs.printedBy))
        .where(eq(factoryRecipeLabelPrintLogs.recipeId, recipeId))
        .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt))
        .limit(200);

      const logs = rows.map((r) => ({
        id: r.id,
        printedById: r.printedBy,
        printedByName:
          [r.printedByFirstName, r.printedByLastName].filter(Boolean).join(" ").trim() ||
          r.printedByUsername ||
          r.printedBy ||
          "—",
        printedByRole: r.printedByRole ?? null,
        isDraft: r.isDraft,
        grammageApproved: r.grammageApproved,
        draftReason: r.draftReason,
        lotNumber: r.lotNumber,
        productionDate: r.productionDate,
        expiryDate: r.expiryDate,
        printedAt: r.printedAt,
      }));

      res.json({ logs });
    } catch (error) {
      console.error("Reçete basım geçmişi yüklenemedi:", error);
      res.status(500).json({ error: "Reçete basım geçmişi yüklenemedi" });
    }
  },
);

// ═══════════════════════════════════════
// GET /api/quality/allergens/print-log — Admin/Kalite raporu
// Query: ?recipeId=&from=ISO&to=ISO&limit=200
// ═══════════════════════════════════════
const PRINT_LOG_VIEW_ROLES = new Set([
  "admin",
  "ceo",
  "ust_yonetim",
  "fabrika_muduru",
  "fabrika_mudur",
  "kalite_yoneticisi",
  "kalite_kontrol",
  "gida_muhendisi",
  "recete_gm",
]);

function requirePrintLogViewRole(req: any, res: Response, next: any) {
  const role = req.user?.role || "";
  if (!PRINT_LOG_VIEW_ROLES.has(role)) {
    return res.status(403).json({ error: "Etiket basım geçmişine erişim yetkiniz yok" });
  }
  next();
}

router.get(
  "/api/quality/allergens/print-log",
  isAuthenticated,
  requirePrintLogViewRole,
  async (req: any, res: Response) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const recipeId = req.query.recipeId ? Number(req.query.recipeId) : null;
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;

      const conds: any[] = [];
      if (recipeId && Number.isFinite(recipeId)) {
        conds.push(eq(factoryRecipeLabelPrintLogs.recipeId, recipeId));
      }
      if (from && !isNaN(from.getTime())) {
        conds.push(gte(factoryRecipeLabelPrintLogs.printedAt, from));
      }
      if (to && !isNaN(to.getTime())) {
        conds.push(lte(factoryRecipeLabelPrintLogs.printedAt, to));
      }

      const whereExpr = conds.length > 0 ? and(...conds) : undefined;

      // Tek sorguda toplam + taslak + onaylı sayıları (Task #208)
      const statsRow = await db
        .select({
          total: sql<number>`count(*)::int`,
          draftCount: sql<number>`coalesce(sum(case when ${factoryRecipeLabelPrintLogs.isDraft} then 1 else 0 end), 0)::int`,
          approvedCount: sql<number>`coalesce(sum(case when ${factoryRecipeLabelPrintLogs.isDraft} then 0 else 1 end), 0)::int`,
        })
        .from(factoryRecipeLabelPrintLogs)
        .where(whereExpr);

      const totals = statsRow[0] ?? { total: 0, draftCount: 0, approvedCount: 0 };

      const baseQuery = db
        .select({
          id: factoryRecipeLabelPrintLogs.id,
          recipeId: factoryRecipeLabelPrintLogs.recipeId,
          recipeCode: factoryRecipeLabelPrintLogs.recipeCode,
          recipeName: factoryRecipeLabelPrintLogs.recipeName,
          printedBy: factoryRecipeLabelPrintLogs.printedBy,
          isDraft: factoryRecipeLabelPrintLogs.isDraft,
          grammageApproved: factoryRecipeLabelPrintLogs.grammageApproved,
          draftReason: factoryRecipeLabelPrintLogs.draftReason,
          lotNumber: factoryRecipeLabelPrintLogs.lotNumber,
          productionDate: factoryRecipeLabelPrintLogs.productionDate,
          expiryDate: factoryRecipeLabelPrintLogs.expiryDate,
          printedAt: factoryRecipeLabelPrintLogs.printedAt,
          printedByFirstName: users.firstName,
          printedByLastName: users.lastName,
          printedByUsername: users.username,
          printedByRole: users.role,
        })
        .from(factoryRecipeLabelPrintLogs)
        .leftJoin(users, eq(users.id, factoryRecipeLabelPrintLogs.printedBy));

      const rows = await (whereExpr ? baseQuery.where(whereExpr) : baseQuery)
        .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt))
        .limit(limit)
        .offset(offset);

      const logs = rows.map((r) => ({
        id: r.id,
        recipeId: r.recipeId,
        recipeCode: r.recipeCode,
        recipeName: r.recipeName,
        printedById: r.printedBy,
        printedByName:
          [r.printedByFirstName, r.printedByLastName].filter(Boolean).join(" ").trim() ||
          r.printedByUsername ||
          r.printedBy ||
          "—",
        printedByRole: r.printedByRole ?? null,
        isDraft: r.isDraft,
        grammageApproved: r.grammageApproved,
        draftReason: r.draftReason,
        lotNumber: r.lotNumber,
        productionDate: r.productionDate,
        expiryDate: r.expiryDate,
        printedAt: r.printedAt,
      }));

      const stats = {
        total: totals.total,
        draftCount: totals.draftCount,
        approvedCount: totals.approvedCount,
        returned: logs.length,
        offset,
        limit,
        hasMore: offset + logs.length < totals.total,
      };

      res.json({ logs, stats });
    } catch (error) {
      console.error("Etiket basım geçmişi yüklenemedi:", error);
      res.status(500).json({ error: "Etiket basım geçmişi yüklenemedi" });
    }
  },
);

// ═══════════════════════════════════════
// GET /api/quality/allergens/print-log/export?format=csv|xlsx
// ISO/HACCP denetimleri için dışa aktarım — task #201
// ═══════════════════════════════════════
function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get(
  "/api/quality/allergens/print-log/export",
  isAuthenticated,
  requirePrintLogViewRole,
  async (req: any, res: Response) => {
    try {
      const format = String(req.query.format || "csv").toLowerCase() === "xlsx" ? "xlsx" : "csv";
      const recipeId = req.query.recipeId ? Number(req.query.recipeId) : null;
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      // Hard upper safety cap (200k) — pratikte tüm yıllık denetim kayıtları için yeterli.
      const maxRows = Math.min(Math.max(Number(req.query.limit) || 200000, 1), 200000);
      const BATCH_SIZE = 2000;

      const conds: any[] = [];
      if (recipeId && Number.isFinite(recipeId)) {
        conds.push(eq(factoryRecipeLabelPrintLogs.recipeId, recipeId));
      }
      if (from && !isNaN(from.getTime())) {
        conds.push(gte(factoryRecipeLabelPrintLogs.printedAt, from));
      }
      if (to && !isNaN(to.getTime())) {
        conds.push(lte(factoryRecipeLabelPrintLogs.printedAt, to));
      }
      const whereClause = conds.length > 0 ? and(...conds) : undefined;

      const fetchBatch = async (offset: number, batchLimit: number) => {
        const q = db
          .select({
            id: factoryRecipeLabelPrintLogs.id,
            recipeCode: factoryRecipeLabelPrintLogs.recipeCode,
            recipeName: factoryRecipeLabelPrintLogs.recipeName,
            printedBy: factoryRecipeLabelPrintLogs.printedBy,
            isDraft: factoryRecipeLabelPrintLogs.isDraft,
            grammageApproved: factoryRecipeLabelPrintLogs.grammageApproved,
            draftReason: factoryRecipeLabelPrintLogs.draftReason,
            lotNumber: factoryRecipeLabelPrintLogs.lotNumber,
            productionDate: factoryRecipeLabelPrintLogs.productionDate,
            expiryDate: factoryRecipeLabelPrintLogs.expiryDate,
            printedAt: factoryRecipeLabelPrintLogs.printedAt,
            printedByFirstName: users.firstName,
            printedByLastName: users.lastName,
            printedByUsername: users.username,
            printedByRole: users.role,
          })
          .from(factoryRecipeLabelPrintLogs)
          .leftJoin(users, eq(users.id, factoryRecipeLabelPrintLogs.printedBy));
        return await (whereClause ? q.where(whereClause) : q)
          .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt), desc(factoryRecipeLabelPrintLogs.id))
          .limit(batchLimit)
          .offset(offset);
      };

      const toRecord = (r: any) => {
        const printedByName =
          [r.printedByFirstName, r.printedByLastName].filter(Boolean).join(" ").trim() ||
          r.printedByUsername ||
          r.printedBy ||
          "—";
        const printedAt = r.printedAt
          ? (r.printedAt instanceof Date ? r.printedAt : new Date(r.printedAt))
          : null;
        return {
          tarih: printedAt ? printedAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) : "",
          tarihIso: printedAt ? printedAt.toISOString() : "",
          kullanici: printedByName,
          rol: r.printedByRole ?? "",
          receteKodu: r.recipeCode ?? "",
          receteAdi: r.recipeName ?? "",
          durum: r.isDraft ? "Taslak" : "Onaylı",
          gramajOnayli: r.grammageApproved ? "Evet" : "Hayır",
          lot: r.lotNumber ?? "",
          uretimTarihi: r.productionDate ?? "",
          skt: r.expiryDate ?? "",
          sebep: r.draftReason ?? "",
        };
      };

      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const baseName = `etiket_basim_gecmisi_${stamp}`;

      if (format === "xlsx") {
        const ExcelJS = (await import("exceljs")).default;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xlsx"`);
        const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });
        wb.creator = "DOSPRESSO";
        wb.created = new Date();
        const sheet = wb.addWorksheet("Etiket Basım Geçmişi", {
          views: [{ state: "frozen", ySplit: 1 }],
        });
        // Streaming modunda tüm veriyi belleğe almadan yazıyoruz (Task #208),
        // bu yüzden dinamik genişlik yerine HEAD'in tanımladığı min genişlikleri kullanıyoruz.
        const columnDefs: { header: string; key: string; min: number; max: number }[] = [
          { header: "Tarih (TR)", key: "tarih", min: 18, max: 26 },
          { header: "Tarih (ISO)", key: "tarihIso", min: 22, max: 28 },
          { header: "Kullanıcı", key: "kullanici", min: 16, max: 36 },
          { header: "Rol", key: "rol", min: 12, max: 24 },
          { header: "Reçete Kodu", key: "receteKodu", min: 14, max: 22 },
          { header: "Reçete Adı", key: "receteAdi", min: 24, max: 50 },
          { header: "Durum", key: "durum", min: 10, max: 14 },
          { header: "Gramaj Onaylı", key: "gramajOnayli", min: 14, max: 16 },
          { header: "Lot / Parti", key: "lot", min: 14, max: 24 },
          { header: "Üretim Tarihi", key: "uretimTarihi", min: 12, max: 16 },
          { header: "SKT", key: "skt", min: 12, max: 16 },
          { header: "Sebep / Not", key: "sebep", min: 24, max: 60 },
        ];
        sheet.columns = columnDefs.map((c) => ({
          header: c.header,
          key: c.key,
          width: c.min,
        }));

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "left" };
        headerRow.height = 22;
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columnDefs.length },
        };
        headerRow.commit();

        let offset = 0;
        let written = 0;
        while (written < maxRows) {
          const remaining = maxRows - written;
          const take = Math.min(BATCH_SIZE, remaining);
          const batch = await fetchBatch(offset, take);
          if (batch.length === 0) break;
          for (const r of batch) {
            const rec = toRecord(r);
            const row = sheet.addRow(rec);
            if (rec.durum === "Taslak") {
              row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFF4CE" },
                };
                cell.font = { color: { argb: "FF8A6D00" } };
              });
            }
            row.commit();
          }
          written += batch.length;
          offset += batch.length;
          if (batch.length < take) break;
        }
        sheet.commit();
        await wb.commit();
        return;
      }

      // CSV — UTF-8 BOM ile Excel uyumlu, batch streaming
      const headers = [
        "Tarih (TR)",
        "Tarih (ISO)",
        "Kullanıcı",
        "Rol",
        "Reçete Kodu",
        "Reçete Adı",
        "Durum",
        "Gramaj Onaylı",
        "Lot / Parti",
        "Üretim Tarihi",
        "SKT",
        "Sebep / Not",
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.csv"`);
      res.write("\uFEFF" + headers.join(",") + "\r\n");

      let offset = 0;
      let written = 0;
      while (written < maxRows) {
        const remaining = maxRows - written;
        const take = Math.min(BATCH_SIZE, remaining);
        const batch = await fetchBatch(offset, take);
        if (batch.length === 0) break;
        const chunk = batch
          .map(toRecord)
          .map((r) =>
            [
              r.tarih, r.tarihIso, r.kullanici, r.rol,
              r.receteKodu, r.receteAdi, r.durum, r.gramajOnayli,
              r.lot, r.uretimTarihi, r.skt, r.sebep,
            ].map(csvEscape).join(","),
          )
          .join("\r\n");
        res.write(chunk + "\r\n");
        written += batch.length;
        offset += batch.length;
        if (batch.length < take) break;
      }
      res.end();
    } catch (error) {
      console.error("Etiket basım geçmişi dışa aktarımı başarısız:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Etiket basım geçmişi dışa aktarılamadı" });
      } else {
        try { res.end(); } catch {}
      }
    }
  },
);

// ═══════════════════════════════════════
// GET /api/public/urun/:code
// Task #200 — Müşteriye dönük halka açık ürün sayfası verisi.
// QR kod taramasında auth gerektirmeden alerjen + besin tablosu gösterir.
// Yalnızca isActive + isVisible reçeteleri yayınlar; iç bilgileri (malzeme
// detayları, onay verileri vb.) bu uçtan dönmez.
// ═══════════════════════════════════════
router.get("/api/public/urun/:code", async (req: any, res: Response) => {
  try {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ error: "Geçersiz ürün kodu" });

    const [recipe] = await db.select().from(factoryRecipes)
      .where(and(
        eq(factoryRecipes.code, code),
        eq(factoryRecipes.isActive, true),
        eq(factoryRecipes.isVisible, true),
      ))
      .limit(1);
    if (!recipe) return res.status(404).json({ error: "Ürün bulunamadı" });

    const grammage = parseGrammageApproval(recipe.changeLog);
    // Public endpoint — `updated_at` kolonu bazı ortamlarda drift sebebiyle
    // henüz mevcut olmayabildiği için (bkz. drift fix task'ları) loadNutritionMap
    // yerine yalnızca ihtiyaç duyduğumuz kolonları çekiyoruz. Bu sayede public
    // sayfa, drift düzeltmesinden bağımsız olarak çalışır.
    const nutritionRows = await db.select({
      ingredientName: factoryIngredientNutrition.ingredientName,
      energyKcal: factoryIngredientNutrition.energyKcal,
      fatG: factoryIngredientNutrition.fatG,
      saturatedFatG: factoryIngredientNutrition.saturatedFatG,
      carbohydrateG: factoryIngredientNutrition.carbohydrateG,
      sugarG: factoryIngredientNutrition.sugarG,
      fiberG: factoryIngredientNutrition.fiberG,
      proteinG: factoryIngredientNutrition.proteinG,
      saltG: factoryIngredientNutrition.saltG,
      allergens: factoryIngredientNutrition.allergens,
      confidence: factoryIngredientNutrition.confidence,
      source: factoryIngredientNutrition.source,
      verifiedBy: factoryIngredientNutrition.verifiedBy,
    }).from(factoryIngredientNutrition);
    const nutritionMap = new Map<string, NutritionRow>();
    for (const r of nutritionRows) {
      nutritionMap.set(r.ingredientName.toLowerCase().trim(), { ...r, updatedAt: null } as NutritionRow);
    }
    const keyblendAllergens = await loadKeyblendAllergens(nutritionMap);
    const ings = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, recipe.id))
      .orderBy(asc(factoryRecipeIngredients.sortOrder));

    const comp = await computeRecipeNutrition(recipe.id, ings, nutritionMap, keyblendAllergens);

    const portionGrams = recipe.expectedUnitWeight ? Number(recipe.expectedUnitWeight) : null;
    const perPortion = portionGrams ? roundNutrition({
      energy_kcal: comp.per100g.energy_kcal * portionGrams / 100,
      fat_g: comp.per100g.fat_g * portionGrams / 100,
      saturated_fat_g: comp.per100g.saturated_fat_g * portionGrams / 100,
      carbohydrate_g: comp.per100g.carbohydrate_g * portionGrams / 100,
      sugar_g: comp.per100g.sugar_g * portionGrams / 100,
      fiber_g: comp.per100g.fiber_g * portionGrams / 100,
      protein_g: comp.per100g.protein_g * portionGrams / 100,
      salt_g: comp.per100g.salt_g * portionGrams / 100,
    }) : null;

    const lastUpdated = recipe.updatedAt
      ? (recipe.updatedAt instanceof Date
          ? recipe.updatedAt.toISOString()
          : new Date(String(recipe.updatedAt)).toISOString())
      : null;

    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      name: recipe.name,
      code: recipe.code,
      category: recipe.category,
      description: recipe.description,
      coverPhotoUrl: recipe.coverPhotoUrl,
      expectedUnitWeight: portionGrams,
      per100g: comp.per100g,
      perPortion,
      allergens: comp.allergens,
      grammageApproved: grammage.approved,
      grammageApprovalDate: grammage.date,
      lastUpdated,
    });
  } catch (error) {
    console.error("Public ürün sayfası verisi alınamadı:", error);
    res.status(500).json({ error: "Ürün bilgileri yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// PUBLIC MÜŞTERİ ENDPOINT (R-5D)
// Auth YOK - QR kod ile erişim için
// Rate-limit: 30 istek/dakika per IP
// Sadece alerjen + 100g besin değeri döner
// (malzeme detayı, maliyet, adım YOK)
// ═══════════════════════════════════════

const publicAllergenRateLimit = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_RATE_WINDOW = 60 * 1000; // 1 dk
const PUBLIC_MAX_REQUESTS = 30;

function checkPublicRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = publicAllergenRateLimit.get(ip);

  if (!record || now > record.resetAt) {
    publicAllergenRateLimit.set(ip, { count: 1, resetAt: now + PUBLIC_RATE_WINDOW });
    return { allowed: true };
  }

  if (record.count >= PUBLIC_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// GET /api/public/allergens/recipes/:id — Auth YOK (müşteri QR)
router.get("/api/public/allergens/recipes/:id", async (req: any, res: Response) => {
  try {
    // Rate limit (DoS koruma)
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const rl = checkPublicRateLimit(String(clientIp));
    if (!rl.allowed) {
      res.set("Retry-After", String(rl.retryAfter));
      return res.status(429).json({ error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin.", retryAfter: rl.retryAfter });
    }

    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) return res.status(400).json({ error: "Geçersiz reçete id" });

    // Reçete meta (sadece müşteri görmesi gerekenler)
    const [recipe] = await db.select({
      id: factoryRecipes.id,
      name: factoryRecipes.name,
      code: factoryRecipes.code,
      category: factoryRecipes.category,
      coverPhotoUrl: factoryRecipes.coverPhotoUrl,
      expectedUnitWeight: factoryRecipes.expectedUnitWeight,
      baseBatchOutput: factoryRecipes.baseBatchOutput,
      isVisible: factoryRecipes.isVisible,
      isActive: factoryRecipes.isActive,
    })
    .from(factoryRecipes)
    .where(eq(factoryRecipes.id, recipeId));

    if (!recipe) return res.status(404).json({ error: "Ürün bulunamadı" });
    if (!recipe.isActive || !recipe.isVisible) {
      return res.status(404).json({ error: "Bu ürün şu an gösterilmiyor" });
    }

    // Besin + alerjen hesapla (mevcut helper fonksiyonları kullan)
    const nutritionMap = await loadNutritionMap();
    const keyblendAllergens = await loadKeyblendAllergens(nutritionMap);
    const ings = await db.select().from(factoryRecipeIngredients)
      .where(eq(factoryRecipeIngredients.recipeId, recipeId));

    if (ings.length === 0) {
      return res.json({
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        coverPhotoUrl: recipe.coverPhotoUrl,
        per100g: null,
        perPortion: null,
        portionWeight: recipe.expectedUnitWeight ? Number(recipe.expectedUnitWeight) : null,
        allergens: [],
        isVerified: false,
        message: "Bu ürün için besin bilgisi henüz hazırlanmamış.",
      });
    }

    const comp = await computeRecipeNutrition(recipeId, ings, nutritionMap, keyblendAllergens);

    // SADECE müşteri verileri döner (malzeme/maliyet/adım YOK)
    res.json({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      coverPhotoUrl: recipe.coverPhotoUrl,
      per100g: comp.per100g,
      perPortion: comp.per100g && recipe.expectedUnitWeight
        ? {
            energy_kcal: Math.round((comp.per100g.energy_kcal * Number(recipe.expectedUnitWeight)) / 100),
            fat_g: Number(((comp.per100g.fat_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            saturated_fat_g: Number(((comp.per100g.saturated_fat_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            carbohydrate_g: Number(((comp.per100g.carbohydrate_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            sugar_g: Number(((comp.per100g.sugar_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            fiber_g: Number(((comp.per100g.fiber_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            protein_g: Number(((comp.per100g.protein_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(1)),
            salt_g: Number(((comp.per100g.salt_g * Number(recipe.expectedUnitWeight)) / 100).toFixed(2)),
          }
        : null,
      portionWeight: recipe.expectedUnitWeight ? Number(recipe.expectedUnitWeight) : null,
      allergens: comp.allergens,
      isVerified: comp.isVerified,
    });
  } catch (error) {
    console.error("Public allergen error:", error);
    res.status(500).json({ error: "Bilgi yüklenemedi" });
  }
});

// GET /api/public/allergens/recipes — Tüm görünür ürünler (auth YOK, müşteri liste sayfası)
router.get("/api/public/allergens/recipes", async (req: any, res: Response) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const rl = checkPublicRateLimit(String(clientIp));
    if (!rl.allowed) {
      res.set("Retry-After", String(rl.retryAfter));
      return res.status(429).json({ error: "Çok fazla istek.", retryAfter: rl.retryAfter });
    }

    // Sadece görünür + aktif + mamul (yarı mamul müşteri için gizli)
    const recipes = await db.select({
      id: factoryRecipes.id,
      name: factoryRecipes.name,
      category: factoryRecipes.category,
      coverPhotoUrl: factoryRecipes.coverPhotoUrl,
      allergens: factoryRecipes.allergens,
    })
    .from(factoryRecipes)
    .where(and(
      eq(factoryRecipes.isActive, true),
      eq(factoryRecipes.isVisible, true),
      eq(factoryRecipes.outputType, "mamul"), // yarı mamul gizli
    ))
    .orderBy(asc(factoryRecipes.category), asc(factoryRecipes.name));

    // Public response - sadece liste
    res.json(recipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      coverPhotoUrl: r.coverPhotoUrl,
      allergens: r.allergens || [],
    })));
  } catch (error) {
    console.error("Public allergen list error:", error);
    res.status(500).json({ error: "Liste yüklenemedi" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/quality/allergens/print-log — Etiket basım geçmişi
// ═══════════════════════════════════════════════════════════════════
// Aslan 7 May 2026 BUG FIX: kalite-alerjen.tsx bu endpoint'i çağırıyordu
// ama backend'de yoktu — sayfa "Yüklenemedi" hatası veriyordu.
//
// Query params:
//   recipeId?: number — sadece bu reçete için
//   from?: ISO datetime — başlangıç tarihi
//   to?: ISO datetime — bitiş tarihi
//   limit?: number (default 20) — sayfa boyutu
//   offset?: number (default 0) — sayfa başlangıcı
//
// Response:
//   { entries: PrintLogEntry[], hasMore: boolean, total?: number }
// ═══════════════════════════════════════════════════════════════════

router.get("/api/quality/allergens/print-log", isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!ALLERGEN_VIEW_ROLES.includes(user?.role)) {
      return res.status(403).json({ error: "Etiket basım geçmişi görüntüleme yetkiniz yok" });
    }

    const recipeId = req.query.recipeId ? Number(req.query.recipeId) : null;
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const conditions: any[] = [];
    if (recipeId) conditions.push(eq(factoryRecipeLabelPrintLogs.recipeId, recipeId));
    if (from) conditions.push(gte(factoryRecipeLabelPrintLogs.printedAt, from));
    if (to) conditions.push(lte(factoryRecipeLabelPrintLogs.printedAt, to));

    const rows = await db
      .select({
        id: factoryRecipeLabelPrintLogs.id,
        recipeId: factoryRecipeLabelPrintLogs.recipeId,
        recipeCode: factoryRecipeLabelPrintLogs.recipeCode,
        recipeName: factoryRecipeLabelPrintLogs.recipeName,
        printedById: factoryRecipeLabelPrintLogs.printedBy,
        printedByFirstName: users.firstName,
        printedByLastName: users.lastName,
        printedByUsername: users.username,
        printedByRole: users.role,
        isDraft: factoryRecipeLabelPrintLogs.isDraft,
        grammageApproved: factoryRecipeLabelPrintLogs.grammageApproved,
        draftReason: factoryRecipeLabelPrintLogs.draftReason,
        lotNumber: factoryRecipeLabelPrintLogs.lotNumber,
        productionDate: factoryRecipeLabelPrintLogs.productionDate,
        expiryDate: factoryRecipeLabelPrintLogs.expiryDate,
        printedAt: factoryRecipeLabelPrintLogs.printedAt,
      })
      .from(factoryRecipeLabelPrintLogs)
      .leftJoin(users, eq(factoryRecipeLabelPrintLogs.printedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt))
      .limit(limit + 1)  // hasMore tespiti için 1 fazla çek
      .offset(offset);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const entries = pageRows.map(r => ({
      id: r.id,
      recipeId: r.recipeId,
      recipeCode: r.recipeCode,
      recipeName: r.recipeName,
      printedById: r.printedById,
      printedByName: [r.printedByFirstName, r.printedByLastName].filter(Boolean).join(' ') || r.printedByUsername || 'Bilinmiyor',
      printedByRole: r.printedByRole,
      isDraft: r.isDraft,
      grammageApproved: r.grammageApproved,
      draftReason: r.draftReason,
      lotNumber: r.lotNumber,
      productionDate: r.productionDate,
      expiryDate: r.expiryDate,
      printedAt: r.printedAt,
    }));

    return res.json({ entries, hasMore });
  } catch (error: any) {
    console.error('/api/quality/allergens/print-log error:', error);
    return res.status(500).json({
      error: "Etiket basım geçmişi yüklenemedi",
      ...(process.env.NODE_ENV !== 'production' ? { debug: error?.message } : {}),
    });
  }
});

export default router;
