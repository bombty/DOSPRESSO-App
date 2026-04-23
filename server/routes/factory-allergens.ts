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
  users,
} from "@shared/schema";
import { and, asc, eq, sql, inArray } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

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

async function computeRecipeNutrition(
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

async function loadNutritionMap(): Promise<Map<string, NutritionRow>> {
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

async function loadKeyblendAllergens(
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
    });
  } catch (error) {
    console.error("Allergen recipe detail error:", error);
    res.status(500).json({ error: "Reçete alerjen detayı yüklenemedi" });
  }
});

export default router;
