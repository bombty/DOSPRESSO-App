/**
 * DOSPRESSO — Task #137 Adım 2: 11 Reçete Maliyet Backfill
 *
 * factory_recipes id 2..12 için raw_material_cost / total_batch_cost /
 * unit_cost alanlarını canonical lineCost + keyblend ağacı semantiği ile
 * doldurur. Mantık server/scripts/recalculate-recipe-prices.ts ile bire bir
 * aynıdır (lineCost helper aynen kopyalandı; refactor için follow-up).
 *
 * Çalıştırma:
 *   npx tsx scripts/pilot/21b-recete-maliyet-backfill.ts
 *
 * IDEMPOTENT:
 *   Sadece raw_material_cost NULL/0 olan reçeteler güncellenir. Hâlihazırda
 *   doluysa NO-OP olur. Re-run güvenli.
 *
 * HARD ASSERTION:
 *   11/11 reçete için raw_material_cost > 0, total_batch_cost > 0,
 *   unit_cost > 0 olmalı. Aksi takdirde non-zero exit + hata mesajı.
 *
 * Kapsam dışı (recalc-script üzerinde):
 *   - factory_products fiyat senkronizasyonu (basePrice/suggestedPrice)
 *   - factory_recipe_price_history audit kayıtları
 *   Bu backfill sadece factory_recipes maliyet alanlarını yazar; finance
 *   denetim trail için periyodik recalc-script çalıştırılır.
 */

import { db } from "../../server/db";
import { sql, eq, and, between } from "drizzle-orm";
import { factoryRecipes } from "@shared/schema/schema-22-factory-recipes";

// ────────────────────────────────────────
// Birim normalizasyonu (lineCost ile aynı tablo)
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

// recalc-script lineCost'un birebir kopyası
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
  return null; // unit_mismatch → unresolved (NOT silently multiply by 1)
}

interface IngRow {
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

async function computeKeyblendCostPerUnit(keyblendId: number): Promise<number | null> {
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
      continue;
    }
    totalCost += lc;
  }
  if (anyMissing || totalAmount <= 0) return null;
  return totalCost / totalAmount;
}

async function computeIngredientsCost(recipeId: number): Promise<{
  cost: number;
  total: number;
  resolved: number;
}> {
  const rows = await db.execute<IngRow>(sql`
    SELECT
      fri.amount, fri.unit, fri.ingredient_type, fri.keyblend_id,
      i.id  AS inv_id, i.code AS inv_code, i.name AS inv_name,
      i.unit_cost, i.last_purchase_price,
      i.conversion_factor, i.purchase_unit, i.recipe_unit
    FROM factory_recipe_ingredients fri
    LEFT JOIN inventory i ON i.id = fri.raw_material_id
    WHERE fri.recipe_id = ${recipeId}
  `);
  const items = (rows.rows ?? []) as unknown as IngRow[];
  let cost = 0;
  let total = 0;
  let resolved = 0;
  for (const ing of items) {
    total++;
    if (ing.ingredient_type === "keyblend") {
      if (!ing.keyblend_id) continue;
      const kbPerUnit = await computeKeyblendCostPerUnit(ing.keyblend_id);
      if (kbPerUnit === null) continue;
      cost += Number(ing.amount || 0) * kbPerUnit;
      resolved++;
      continue;
    }
    const amount = Number(ing.amount || 0);
    const purchasePrice = Number(ing.unit_cost || ing.last_purchase_price || 0);
    if (!ing.inv_id || purchasePrice <= 0) continue;
    const lc = lineCost({
      amount,
      recipeUnit: ing.unit || "",
      purchasePrice,
      purchaseUnit: ing.purchase_unit || "",
      conversionFactor: Number(ing.conversion_factor || 0),
      inventoryRecipeUnit: ing.recipe_unit || "",
    });
    if (lc === null) continue;
    cost += lc;
    resolved++;
  }
  return { cost, total, resolved };
}

async function run(): Promise<void> {
  console.log("=".repeat(72));
  console.log("Task #137 Adım 2: 11 reçete maliyet backfill (id 2..12)");
  console.log("=".repeat(72));

  const recipes = await db
    .select()
    .from(factoryRecipes)
    .where(and(between(factoryRecipes.id, 2, 12), eq(factoryRecipes.isActive, true)));

  let updated = 0;
  let skippedAlreadyOk = 0;
  const failures: Array<{ id: number; code: string; reason: string }> = [];

  for (const r of recipes) {
    const oldRaw = Number(r.rawMaterialCost || 0);
    const oldUnit = Number(r.unitCost || 0);

    if (oldRaw > 0 && oldUnit > 0) {
      console.log(`  [skip-ok] ${r.code} id=${r.id}: zaten dolu (raw=${oldRaw}, unit=${oldUnit})`);
      skippedAlreadyOk++;
      continue;
    }

    const { cost: rawCost, total, resolved } = await computeIngredientsCost(r.id);
    const labor = Number(r.laborCost || 0);
    const energy = Number(r.energyCost || 0);
    const totalBatch = rawCost + labor + energy;
    const batchOutput = r.baseBatchOutput || 1;
    const newUnit = batchOutput > 0 ? totalBatch / batchOutput : 0;

    if (rawCost <= 0) {
      failures.push({
        id: r.id,
        code: r.code,
        reason: `Hesaplanan raw_material_cost=0 (resolved=${resolved}/${total} malzeme; inventory.unit_cost eksik)`,
      });
      continue;
    }

    await db
      .update(factoryRecipes)
      .set({
        rawMaterialCost: rawCost.toFixed(4),
        totalBatchCost: totalBatch.toFixed(4),
        unitCost: newUnit.toFixed(4),
        costLastCalculated: new Date(),
        updatedAt: new Date(),
        changeLog:
          (r.changeLog || "") +
          `\n[2026-04-23 Task #137] raw=${rawCost.toFixed(4)}₺ total=${totalBatch.toFixed(
            4
          )}₺ unit=${newUnit.toFixed(4)}₺ (cov ${resolved}/${total}).`,
      })
      .where(eq(factoryRecipes.id, r.id));

    updated++;
    console.log(
      `  [ok] ${r.code} id=${r.id}: raw=${rawCost.toFixed(4)} unit=${newUnit.toFixed(
        4
      )} cov=${resolved}/${total}`
    );
  }

  console.log("\nÖzet:");
  console.log(`  Güncellenen: ${updated}`);
  console.log(`  Zaten dolu: ${skippedAlreadyOk}`);
  console.log(`  Başarısız:   ${failures.length}`);

  // ─── HARD ASSERTION ───
  const final = await db
    .select()
    .from(factoryRecipes)
    .where(between(factoryRecipes.id, 2, 12));
  const incomplete = final.filter(
    (r) =>
      Number(r.rawMaterialCost || 0) <= 0 ||
      Number(r.totalBatchCost || 0) <= 0 ||
      Number(r.unitCost || 0) <= 0,
  );
  if (incomplete.length > 0) {
    console.error("\n✗ ASSERT FAIL: Aşağıdaki reçetelerde maliyet hâlâ eksik:");
    for (const r of incomplete) {
      console.error(
        `   id=${r.id} code=${r.code} raw=${r.rawMaterialCost} batch=${r.totalBatchCost} unit=${r.unitCost}`,
      );
    }
    if (failures.length > 0) {
      console.error("\nNeden:");
      for (const f of failures) console.error(`   ${f.code}: ${f.reason}`);
    }
    process.exit(1);
  }

  console.log("\n✓ Task #137: 11/11 reçete için maliyet alanları dolu (raw>0, batch>0, unit>0).");
  process.exit(0);
}

run().catch((err) => {
  console.error("Task #137 backfill hata:", err);
  process.exit(1);
});
