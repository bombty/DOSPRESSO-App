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
const printLogBodySchema = z.object({
  isDraft: z.boolean().optional().default(false),
  grammageApproved: z.boolean().optional().default(false),
  draftReason: z.string().max(255).optional().nullable(),
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

      const countQuery = db
        .select({ value: sql<number>`count(*)::int` })
        .from(factoryRecipeLabelPrintLogs);
      const countRows = await (whereExpr ? countQuery.where(whereExpr) : countQuery);
      const totalCount = Number(countRows[0]?.value ?? 0);

      const draftCountQuery = db
        .select({ value: sql<number>`count(*)::int` })
        .from(factoryRecipeLabelPrintLogs)
        .where(
          whereExpr
            ? and(whereExpr, eq(factoryRecipeLabelPrintLogs.isDraft, true))
            : eq(factoryRecipeLabelPrintLogs.isDraft, true),
        );
      const draftCountRows = await draftCountQuery;
      const draftCount = Number(draftCountRows[0]?.value ?? 0);
      const approvedCount = totalCount - draftCount;

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
        printedAt: r.printedAt,
      }));

      const stats = {
        total: totalCount,
        draftCount,
        approvedCount,
        returned: logs.length,
        offset,
        limit,
        hasMore: offset + logs.length < totalCount,
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
      const limit = Math.min(Math.max(Number(req.query.limit) || 5000, 1), 20000);

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
          printedAt: factoryRecipeLabelPrintLogs.printedAt,
          printedByFirstName: users.firstName,
          printedByLastName: users.lastName,
          printedByUsername: users.username,
          printedByRole: users.role,
        })
        .from(factoryRecipeLabelPrintLogs)
        .leftJoin(users, eq(users.id, factoryRecipeLabelPrintLogs.printedBy));

      const rows = await (conds.length > 0
        ? baseQuery.where(and(...conds))
        : baseQuery)
        .orderBy(desc(factoryRecipeLabelPrintLogs.printedAt))
        .limit(limit);

      const records = rows.map((r) => {
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
          sebep: r.draftReason ?? "",
        };
      });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const baseName = `etiket_basim_gecmisi_${stamp}`;

      if (format === "xlsx") {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        wb.creator = "DOSPRESSO";
        wb.created = new Date();
        const sheet = wb.addWorksheet("Etiket Basım Geçmişi", {
          views: [{ state: "frozen", ySplit: 1 }],
        });
        const columnDefs: { header: string; key: keyof (typeof records)[number]; min: number; max: number }[] = [
          { header: "Tarih (TR)", key: "tarih", min: 18, max: 26 },
          { header: "Tarih (ISO)", key: "tarihIso", min: 22, max: 28 },
          { header: "Kullanıcı", key: "kullanici", min: 16, max: 36 },
          { header: "Rol", key: "rol", min: 12, max: 24 },
          { header: "Reçete Kodu", key: "receteKodu", min: 14, max: 22 },
          { header: "Reçete Adı", key: "receteAdi", min: 24, max: 50 },
          { header: "Durum", key: "durum", min: 10, max: 14 },
          { header: "Gramaj Onaylı", key: "gramajOnayli", min: 14, max: 16 },
          { header: "Sebep / Not", key: "sebep", min: 24, max: 60 },
        ];
        sheet.columns = columnDefs.map((c) => {
          let maxLen = c.header.length;
          for (const rec of records) {
            const len = String(rec[c.key] ?? "").length;
            if (len > maxLen) maxLen = len;
          }
          const width = Math.max(c.min, Math.min(c.max, maxLen + 2));
          return { header: c.header, key: c.key as string, width };
        });

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

        for (const rec of records) {
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
        }

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xlsx"`);
        await wb.xlsx.write(res);
        res.end();
        return;
      }

      // CSV — UTF-8 BOM ile Excel uyumlu
      const headers = [
        "Tarih (TR)",
        "Tarih (ISO)",
        "Kullanıcı",
        "Rol",
        "Reçete Kodu",
        "Reçete Adı",
        "Durum",
        "Gramaj Onaylı",
        "Sebep / Not",
      ];
      const lines: string[] = [headers.join(",")];
      for (const r of records) {
        lines.push([
          r.tarih, r.tarihIso, r.kullanici, r.rol,
          r.receteKodu, r.receteAdi, r.durum, r.gramajOnayli, r.sebep,
        ].map(csvEscape).join(","));
      }
      const body = "\uFEFF" + lines.join("\r\n") + "\r\n";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.csv"`);
      res.send(body);
    } catch (error) {
      console.error("Etiket basım geçmişi dışa aktarımı başarısız:", error);
      res.status(500).json({ error: "Etiket basım geçmişi dışa aktarılamadı" });
    }
  },
);

export default router;
