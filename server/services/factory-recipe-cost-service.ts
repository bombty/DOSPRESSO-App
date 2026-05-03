/**
 * DOSPRESSO — Factory Recipe Cost Service (R-5B)
 *
 * Reusable maliyet hesaplama servisi. Hem HTTP endpoint'lerden
 * (POST /api/factory/recipes/:id/recalc-cost) hem de CLI script'lerden
 * (scripts/pilot/21b-recete-maliyet-backfill.ts) kullanılabilir.
 *
 * Logic kaynağı: server/scripts/recalculate-recipe-prices.ts
 * Bu service module refactor edilmiş versiyonudur.
 *
 * KAYIT:
 * - factory_recipes tablosu güncellenir (raw/labor/energy/total/unit cost)
 * - factory_recipe_price_history tablosuna audit kaydı yazılır (R-5B fix)
 *
 * HESAP FORMÜLÜ:
 * - rawMaterialCost = Σ(ingredient.amount × unit_cost/conversion_factor)
 *   (keyblend'ler dahil, recursive expansion)
 * - laborCost = requiredWorkers × productionTimeMinutes/60 × hourlyWage
 * - energyCost = equipmentKwh × kwhPrice + waterConsumptionLt × waterPrice
 * - totalBatchCost = rawMaterialCost + laborCost + energyCost
 * - unitCost = totalBatchCost / baseBatchOutput
 */

import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  factoryRecipes,
  factoryRecipeIngredients,
  factoryRecipePriceHistory,
} from "@shared/schema/schema-22-factory-recipes";

// ────────────────────────────────────────
// CONFIG (Mahmut onayı ile güncellenir)
// ────────────────────────────────────────
export const COST_CONFIG = {
  // TL/saat — 2026 ortalama fabrika işçi saatlik ücret
  hourlyWage: Number(process.env.FACTORY_HOURLY_WAGE || "205"),
  // TL/kWh — Sanayi elektrik tarifesi
  kwhPrice: Number(process.env.FACTORY_KWH_PRICE || "3.50"),
  // TL/lt — Şebeke suyu
  waterPrice: Number(process.env.FACTORY_WATER_PRICE || "0.08"),
};

// ────────────────────────────────────────
// Tipler
// ────────────────────────────────────────
interface IngredientRow {
  amount: string;
  unit: string | null;
  ingredient_type: string;
  keyblend_id: number | null;
  inv_id: number | null;
  inv_code: string | null;
  inv_name: string | null;
  unit_cost: string | null;
  last_purchase_price: string | null;
  conversion_factor: string | null;
  purchase_unit: string | null;
  recipe_unit: string | null;
}

interface KeyblendIngRow {
  amount: string;
  unit: string | null;
  inv_id: number | null;
  inv_code: string | null;
  inv_name: string | null;
  unit_cost: string | null;
  last_purchase_price: string | null;
  conversion_factor: string | null;
  purchase_unit: string | null;
  recipe_unit: string | null;
}

export interface MissingIngredient {
  code: string | null;
  name: string;
  reason: "no_inventory" | "no_price" | "unit_mismatch";
  detail?: string;
}

export interface RecipeCostResult {
  recipeId: number;
  rawMaterialCost: number;
  laborCost: number;
  energyCost: number;
  totalBatchCost: number;
  unitCost: number;
  coveragePercent: number; // % of ingredients resolved
  totalIngredients: number;
  resolvedIngredients: number;
  missing: MissingIngredient[];
  previousCosts: {
    rawMaterialCost: number;
    totalBatchCost: number;
    unitCost: number;
  };
}

// ────────────────────────────────────────
// Birim normalizasyonu
// ────────────────────────────────────────
const UNIT_FAMILY: Record<string, { family: "mass" | "volume" | "count"; toBase: number }> = {
  g: { family: "mass", toBase: 1 },
  gr: { family: "mass", toBase: 1 },
  gram: { family: "mass", toBase: 1 },
  mg: { family: "mass", toBase: 0.001 },
  kg: { family: "mass", toBase: 1000 },
  ton: { family: "mass", toBase: 1_000_000 },
  ml: { family: "volume", toBase: 1 },
  cc: { family: "volume", toBase: 1 },
  cl: { family: "volume", toBase: 10 },
  dl: { family: "volume", toBase: 100 },
  l: { family: "volume", toBase: 1000 },
  lt: { family: "volume", toBase: 1000 },
  litre: { family: "volume", toBase: 1000 },
  adet: { family: "count", toBase: 1 },
  ad: { family: "count", toBase: 1 },
  pcs: { family: "count", toBase: 1 },
  piece: { family: "count", toBase: 1 },
  paket: { family: "count", toBase: 1 },
};

function norm(u: string | null | undefined): string {
  return (u || "").trim().toLowerCase();
}

function lineCost(opts: {
  amount: number;
  recipeUnit: string;
  purchasePrice: number;
  purchaseUnit: string;
  conversionFactor: number;
  inventoryRecipeUnit: string;
}): number | null {
  const { amount, purchasePrice } = opts;
  if (amount <= 0 || purchasePrice <= 0) return null;

  const ru = norm(opts.recipeUnit);
  const pu = norm(opts.purchaseUnit);
  const ivRu = norm(opts.inventoryRecipeUnit);
  const cf = opts.conversionFactor;

  if (cf > 0 && ivRu && ru === ivRu) return amount * (purchasePrice / cf);
  if (ru && pu && ru === pu) return amount * purchasePrice;

  const ruInfo = UNIT_FAMILY[ru];
  const puInfo = UNIT_FAMILY[pu];
  if (ruInfo && puInfo && ruInfo.family === puInfo.family) {
    const amountInPurchaseUnit = (amount * ruInfo.toBase) / puInfo.toBase;
    return amountInPurchaseUnit * purchasePrice;
  }
  return null;
}

// ────────────────────────────────────────
// Keyblend maliyet hesap (recursive)
// ────────────────────────────────────────
async function computeKeyblendCostPerUnit(
  keyblendId: number,
  missing: MissingIngredient[]
): Promise<number | null> {
  const rows = await db.execute<KeyblendIngRow>(sql`
    SELECT
      fki.amount, fki.unit,
      i.id AS inv_id, i.code AS inv_code, i.name AS inv_name,
      i.unit_cost, i.last_purchase_price,
      i.conversion_factor, i.purchase_unit, i.recipe_unit
    FROM factory_keyblend_ingredients fki
    LEFT JOIN inventory i ON i.id = fki.raw_material_id
    WHERE fki.keyblend_id = ${keyblendId}
  `);

  const items = (rows.rows ?? []) as unknown as KeyblendIngRow[];
  let totalCost = 0;
  let totalAmount = 0;
  let anyMissing = false;

  for (const k of items) {
    const amt = Number(k.amount || 0);
    totalAmount += amt;
    const price = Number(k.unit_cost || k.last_purchase_price || 0);

    if (!k.inv_id || price <= 0) {
      anyMissing = true;
      missing.push({
        code: k.inv_code,
        name: `[keyblend] ${k.inv_name || "?"}`,
        reason: !k.inv_id ? "no_inventory" : "no_price",
      });
      continue;
    }

    const lc = lineCost({
      amount: amt,
      recipeUnit: k.unit || "",
      purchasePrice: price,
      purchaseUnit: k.purchase_unit || "",
      conversionFactor: Number(k.conversion_factor || 0),
      inventoryRecipeUnit: k.recipe_unit || "",
    });

    if (lc === null) {
      anyMissing = true;
      missing.push({
        code: k.inv_code,
        name: `[keyblend] ${k.inv_name || "?"}`,
        reason: "unit_mismatch",
        detail: `${k.unit} ↔ ${k.purchase_unit || "?"}`,
      });
      continue;
    }
    totalCost += lc;
  }

  if (anyMissing || totalAmount <= 0) return null;
  return totalCost / totalAmount;
}

// ────────────────────────────────────────
// Ingredient cost hesap (keyblend expansion ile)
// ────────────────────────────────────────
async function computeIngredientsCost(recipeId: number): Promise<{
  cost: number;
  total: number;
  resolved: number;
  missing: MissingIngredient[];
}> {
  const ingRows = await db.execute<IngredientRow>(sql`
    SELECT
      fri.amount, fri.unit, fri.ingredient_type, fri.keyblend_id,
      i.id  AS inv_id, i.code AS inv_code, i.name AS inv_name,
      i.unit_cost, i.last_purchase_price,
      i.conversion_factor, i.purchase_unit, i.recipe_unit
    FROM factory_recipe_ingredients fri
    LEFT JOIN inventory i ON i.id = fri.raw_material_id
    WHERE fri.recipe_id = ${recipeId}
  `);

  const items = (ingRows.rows ?? []) as unknown as IngredientRow[];
  let cost = 0;
  let total = 0;
  let resolved = 0;
  const missing: MissingIngredient[] = [];

  for (const ing of items) {
    total++;

    if (ing.ingredient_type === "keyblend") {
      if (!ing.keyblend_id) {
        missing.push({ code: null, name: "(keyblend referansı yok)", reason: "no_inventory" });
        continue;
      }
      const kbPerUnit = await computeKeyblendCostPerUnit(ing.keyblend_id, missing);
      if (kbPerUnit === null) continue;
      cost += Number(ing.amount || 0) * kbPerUnit;
      resolved++;
      continue;
    }

    const amount = Number(ing.amount || 0);
    const purchasePrice = Number(ing.unit_cost || ing.last_purchase_price || 0);

    if (!ing.inv_id) {
      missing.push({ code: ing.inv_code, name: ing.inv_name || "(eşleşmemiş)", reason: "no_inventory" });
      continue;
    }
    if (purchasePrice <= 0) {
      missing.push({ code: ing.inv_code, name: ing.inv_name || "?", reason: "no_price" });
      continue;
    }

    const lc = lineCost({
      amount,
      recipeUnit: ing.unit || "",
      purchasePrice,
      purchaseUnit: ing.purchase_unit || "",
      conversionFactor: Number(ing.conversion_factor || 0),
      inventoryRecipeUnit: ing.recipe_unit || "",
    });

    if (lc === null) {
      missing.push({
        code: ing.inv_code,
        name: ing.inv_name || "?",
        reason: "unit_mismatch",
        detail: `${ing.unit} ↔ ${ing.purchase_unit || "?"} (cf=${ing.conversion_factor || "0"})`,
      });
      continue;
    }

    cost += lc;
    resolved++;
  }

  return { cost, total, resolved, missing };
}

// ────────────────────────────────────────
// ANA FONKSIYON — Recipe maliyet hesap + kayıt + audit
// ────────────────────────────────────────
export async function recalculateRecipeCost(
  recipeId: number,
  options: {
    triggerSource?: "manual" | "raw_material_change" | "scheduler" | "bulk";
    triggeredBy?: string; // user ID
  } = {}
): Promise<RecipeCostResult> {
  const { triggerSource = "manual", triggeredBy } = options;

  // 1. Reçete meta
  const [recipe] = await db.select().from(factoryRecipes).where(eq(factoryRecipes.id, recipeId));
  if (!recipe) {
    throw new Error(`Reçete bulunamadı: ${recipeId}`);
  }

  // 2. Önceki değerler (audit için)
  const previousCosts = {
    rawMaterialCost: Number(recipe.rawMaterialCost || 0),
    totalBatchCost: Number(recipe.totalBatchCost || 0),
    unitCost: Number(recipe.unitCost || 0),
  };

  // 3. Hammadde maliyet (keyblend dahil)
  const ingResult = await computeIngredientsCost(recipeId);
  const rawMaterialCost = ingResult.cost;

  // 4. İşçilik: workers × saat × hourlyWage
  const productionTimeMin = recipe.productionTimeMinutes || 0;
  const prepTimeMin = recipe.prepTimeMinutes || 0;
  const cleaningTimeMin = recipe.cleaningTimeMinutes || 0;
  const totalTimeMin = productionTimeMin + prepTimeMin + cleaningTimeMin;
  const workers = recipe.requiredWorkers || 1;
  const laborCost = (workers * totalTimeMin / 60) * COST_CONFIG.hourlyWage;

  // 5. Enerji: kWh × kwhPrice + su × waterPrice
  const kwh = Number(recipe.equipmentKwh || 0);
  const waterLt = Number(recipe.waterConsumptionLt || 0);
  const energyCost = (kwh * COST_CONFIG.kwhPrice) + (waterLt * COST_CONFIG.waterPrice);

  // 6. Toplam batch + birim
  const totalBatchCost = rawMaterialCost + laborCost + energyCost;
  const baseBatchOutput = recipe.baseBatchOutput || 1;
  const unitCost = totalBatchCost / baseBatchOutput;

  // 7. Coverage %
  const coveragePercent = ingResult.total > 0
    ? (ingResult.resolved / ingResult.total) * 100
    : 0;

  // F20: lineCost null guard — eksik içerik varsa structured warning,
  // toplam %0 ise unitCost güvenilmez (UI badge için coveragePercent
  // ve missing[] response'ta zaten döner; status alanı da audit history'ye yazılır).
  if (ingResult.missing.length > 0) {
    console.warn(
      `[recipe-cost] recipe=${recipeId} coverage=${coveragePercent.toFixed(1)}% ` +
      `resolved=${ingResult.resolved}/${ingResult.total} ` +
      `missing=${ingResult.missing.length} ` +
      `reasons=${JSON.stringify(
        ingResult.missing.reduce<Record<string, number>>((acc, m) => {
          acc[m.reason] = (acc[m.reason] || 0) + 1;
          return acc;
        }, {})
      )}`
    );
  }

  // 8. factory_recipes tablosuna yaz
  await db.update(factoryRecipes)
    .set({
      rawMaterialCost: rawMaterialCost.toFixed(4),
      laborCost: laborCost.toFixed(4),
      energyCost: energyCost.toFixed(4),
      totalBatchCost: totalBatchCost.toFixed(4),
      unitCost: unitCost.toFixed(4),
      costLastCalculated: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(factoryRecipes.id, recipeId));

  // 9. AUDIT: factory_recipe_price_history kaydı (R-5B fix - boş tablo sorunu)
  try {
    const changePercent = previousCosts.unitCost > 0
      ? ((unitCost - previousCosts.unitCost) / previousCosts.unitCost) * 100
      : 0;

    await db.insert(factoryRecipePriceHistory).values({
      recipeId,
      productId: recipe.productId || null,
      oldRawMaterialCost: String(previousCosts.rawMaterialCost.toFixed(4)),
      newRawMaterialCost: String(rawMaterialCost.toFixed(4)),
      oldUnitCost: String(previousCosts.unitCost.toFixed(4)),
      newUnitCost: String(unitCost.toFixed(4)),
      changePercent: String(changePercent.toFixed(2)),
      status: ingResult.resolved === 0 ? "skipped_empty"
            : ingResult.resolved < ingResult.total ? "applied_partial"
            : "applied",
      reason: triggerSource === "manual" ? "Kullanıcı tetikledi" : `Otomatik: ${triggerSource}`,
      ingredientCount: ingResult.total,
      resolvedIngredientCount: ingResult.resolved,
      coveragePercent: String(coveragePercent.toFixed(2)),
      missingIngredients: ingResult.missing.map(m => ({
        code: m.code,
        name: m.name,
        reason: m.reason,
        detail: m.detail,
      })) as any,
      source: "api",
      runId: `api-${Date.now()}`,
    });
  } catch (err) {
    // Ana işlem bitti, audit yazılamazsa warning
    console.warn("Price history audit yazılamadı:", err);
  }

  return {
    recipeId,
    rawMaterialCost,
    laborCost,
    energyCost,
    totalBatchCost,
    unitCost,
    coveragePercent,
    totalIngredients: ingResult.total,
    resolvedIngredients: ingResult.resolved,
    missing: ingResult.missing,
    previousCosts,
  };
}

// ────────────────────────────────────────
// BULK RECALC — Tüm aktif reçeteler için
// ────────────────────────────────────────
export async function recalculateAllRecipeCosts(
  options: {
    triggerSource?: "manual" | "raw_material_change" | "scheduler" | "bulk";
    triggeredBy?: string;
    onlyUnpriced?: boolean; // Sadece unit_cost=0 olanları yeniden hesapla
  } = {}
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: RecipeCostResult[];
  errors: Array<{ recipeId: number; error: string }>;
}> {
  const { onlyUnpriced = false } = options;

  // Aktif reçeteleri çek
  let recipeIds: number[];
  if (onlyUnpriced) {
    const rows = await db.execute<{ id: number }>(sql`
      SELECT id FROM factory_recipes
      WHERE is_active = true
        AND (unit_cost IS NULL OR unit_cost::numeric = 0)
      ORDER BY id
    `);
    recipeIds = (rows.rows as any[]).map(r => r.id);
  } else {
    const recipes = await db.select({ id: factoryRecipes.id })
      .from(factoryRecipes)
      .where(eq(factoryRecipes.isActive, true));
    recipeIds = recipes.map(r => r.id);
  }

  const results: RecipeCostResult[] = [];
  const errors: Array<{ recipeId: number; error: string }> = [];

  for (const recipeId of recipeIds) {
    try {
      const result = await recalculateRecipeCost(recipeId, {
        triggerSource: options.triggerSource || "bulk",
        triggeredBy: options.triggeredBy,
      });
      results.push(result);
    } catch (err) {
      errors.push({ recipeId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    total: recipeIds.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

// ────────────────────────────────────────
// HAMMADDE FIYAT DEĞIŞTI → etkilenen reçeteleri yeniden hesapla
// ────────────────────────────────────────
export async function recalculateRecipesByInventoryId(
  inventoryId: number,
  options: { triggeredBy?: string } = {}
): Promise<RecipeCostResult[]> {
  // Bu hammaddeyi kullanan reçeteleri bul (factory_recipe_ingredients.raw_material_id)
  const affected = await db.execute<{ recipe_id: number }>(sql`
    SELECT DISTINCT recipe_id FROM factory_recipe_ingredients
    WHERE raw_material_id = ${inventoryId}
  `);

  const recipeIds = (affected.rows as any[]).map(r => r.recipe_id);
  const results: RecipeCostResult[] = [];

  for (const recipeId of recipeIds) {
    try {
      const result = await recalculateRecipeCost(recipeId, {
        triggerSource: "raw_material_change",
        triggeredBy: options.triggeredBy,
      });
      results.push(result);
    } catch (err) {
      console.error(`Recipe ${recipeId} recalc failed:`, err);
    }
  }

  return results;
}
