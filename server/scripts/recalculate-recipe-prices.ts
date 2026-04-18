/**
 * DOSPRESSO — Reçete Fiyatlarını Yeni Malzeme Maliyetlerine Göre Yeniden Hesapla
 *
 * Sprint A'da 143 malzemenin son fatura fiyatı `inventory.unit_cost` /
 * `inventory.last_purchase_price` alanlarına yazıldı. Bu script:
 *
 *   1. Her aktif reçete için raw_material_cost = SUM(amount × unit_cost / cf)
 *      - Normal malzemeler ve keyblend bileşenleri DAHİL
 *   2. Reçete `unit_cost` = (raw + labor + energy) / base_batch_output (internal COGS)
 *   3. Bağlı ürünler için (Task #97 spec):
 *        factory_products.basePrice      = SUM(qty × inventory.unit_price) = rawCost
 *        factory_products.suggestedPrice = basePrice × profitMargin (default 1.01)
 *   4. Coverage'a göre status atanır (applied / applied_partial / skipped_empty);
 *      her durumda kalıcı audit kaydı yazılır.
 *   5. JSON özet raporu `server/data/price-recalc-report-<runId>.json`
 *
 * Çalıştırma:
 *   npx tsx server/scripts/recalculate-recipe-prices.ts
 *   COVERAGE_THRESHOLD=0.8 npx tsx server/scripts/recalculate-recipe-prices.ts
 *
 * Migration: migrations/task-97-recipe-price-history.sql
 */

import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import {
  factoryRecipes,
  factoryRecipeIngredients,
  type FactoryRecipe,
} from "@shared/schema/schema-22-factory-recipes";
import { factoryProducts, type FactoryProduct } from "@shared/schema/schema-08";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Spec: base_price = SUM(ingredient_qty × inventory.unit_price). Bu nedenle
// çözümlenmiş malzeme oranı düşük olsa bile yazma yapılır; ilgili reçete
// "applied" olarak işaretlenir, eksik malzemeler audit kaydında missing
// olarak listelenir. COVERAGE_THRESHOLD < 1 ise düşük kapsam "applied_partial"
// alt-status'u verir (finance görünürlüğü için). Default 0 → her zaman "applied".
const COVERAGE_THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || "0");
// WRITE_PARTIAL=false ile düşük kapsamalı yazmalar tamamen devre dışı bırakılır
// (finance "güvenlik > süreklilik" tercih ederse). Default true (operasyonel devamlılık).
const WRITE_PARTIAL = (process.env.WRITE_PARTIAL ?? "true").toLowerCase() !== "false";
const RUN_ID = `recalc-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto
  .randomBytes(3)
  .toString("hex")}`;

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

interface MissingItem {
  code: string | null;
  name: string;
  reason: "no_inventory" | "no_price" | "unit_mismatch";
  detail?: string;
}

type RecipeStatus = "applied" | "applied_partial" | "skipped_empty";

interface RecipeReport {
  recipeId: number;
  recipeCode: string;
  recipeName: string;
  productId: number | null;
  productSku: string | null;
  baseBatchOutput: number;
  coveragePercent: number;
  ingredientCount: number;
  resolvedIngredientCount: number;
  oldRawMaterialCost: number;
  newRawMaterialCost: number;
  oldUnitCost: number;
  newUnitCost: number;
  oldBasePrice: number | null;
  newBasePrice: number | null;
  oldSuggestedPrice: number | null;
  newSuggestedPrice: number | null;
  profitMargin: number;
  status: RecipeStatus;
  reason: string | null;
  changePercent: number | null;
  missingIngredients: MissingItem[];
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
// Maliyet hesaplama
// ────────────────────────────────────────

interface CostResult {
  cost: number;
  total: number;
  resolved: number;
  missing: MissingItem[];
}

async function computeKeyblendCostPerUnit(
  keyblendId: number,
  missing: MissingItem[]
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

async function computeIngredientsCost(recipeId: number): Promise<CostResult> {
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
  const missing: MissingItem[] = [];

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
// Ana akış
// ────────────────────────────────────────

async function run(): Promise<void> {
  console.log("=".repeat(80));
  console.log("DOSPRESSO — Reçete Fiyatları Yeniden Hesaplama");
  console.log(`Run ID: ${RUN_ID}`);
  console.log(`Coverage threshold: ${(COVERAGE_THRESHOLD * 100).toFixed(0)}% (applied vs applied_partial sınırı)`);
  console.log("=".repeat(80));

  const recipes: FactoryRecipe[] = await db
    .select()
    .from(factoryRecipes)
    .where(eq(factoryRecipes.isActive, true));

  console.log(`\n${recipes.length} aktif reçete işlenecek\n`);

  const reports: RecipeReport[] = [];
  let applied = 0;
  let appliedPartial = 0;
  let skippedEmpty = 0;
  let updatedProducts = 0;

  for (const recipe of recipes) {
    const { cost: rawCost, total, resolved, missing } = await computeIngredientsCost(recipe.id);

    const oldRaw = Number(recipe.rawMaterialCost || 0);
    const oldUnitCost = Number(recipe.unitCost || 0);
    const batchOutput = recipe.baseBatchOutput || 1;
    const labor = Number(recipe.laborCost || 0);
    const energy = Number(recipe.energyCost || 0);
    const totalBatch = rawCost + labor + energy;
    const newUnitCost = batchOutput > 0 ? totalBatch / batchOutput : 0;
    const coverage = total > 0 ? resolved / total : 0;

    let status: RecipeStatus;
    let reason: string | null = null;

    if (total === 0) {
      // İş kuralı: malzeme satırı olmayan legacy PR-* reçeteleri (12 adet)
      // 0₺'a sıfırlanmaz — eski değer korunur. IT'nin bu reçeteleri silmesi
      // ya da malzeme eklemesi beklenir (follow-up #98 / #100). Spec'in
      // "SUM(...)" formülü 0 verir ama reçetede malzeme tanımı olmadığı için
      // "destructive overwrite" sayılır; audit'te skipped_empty olarak işaretlenir.
      status = "skipped_empty";
      reason = "Reçetede malzeme satırı yok — eski fiyat korundu (placeholder/legacy)";
      skippedEmpty++;
    } else if (coverage >= COVERAGE_THRESHOLD) {
      status = "applied";
      applied++;
    } else if (WRITE_PARTIAL) {
      status = "applied_partial";
      reason = `Coverage ${(coverage * 100).toFixed(0)}% < ${(COVERAGE_THRESHOLD * 100).toFixed(
        0
      )}% — best-effort yazıldı; ${missing.length} malzeme eksik (WRITE_PARTIAL=true)`;
      appliedPartial++;
    } else {
      // WRITE_PARTIAL=false → düşük kapsamalı reçeteler de yazılmaz
      status = "skipped_empty"; // semantik olarak "yazılmadı"; alt-kategorilendirme audit reason'da
      reason = `Coverage ${(coverage * 100).toFixed(0)}% < ${(COVERAGE_THRESHOLD * 100).toFixed(
        0
      )}% ve WRITE_PARTIAL=false — eski fiyat korundu`;
      skippedEmpty++;
    }

    // Bağlı ürün (sadece read)
    let product: FactoryProduct | null = null;
    let productSku: string | null = null;
    let oldBasePrice: number | null = null;
    let oldSuggested: number | null = null;
    let margin = 1.01;

    if (recipe.productId) {
      const rows = await db
        .select()
        .from(factoryProducts)
        .where(eq(factoryProducts.id, recipe.productId))
        .limit(1);
      if (rows.length > 0) {
        product = rows[0];
        productSku = product.sku;
        margin = Number(product.profitMargin || 1.01);
        oldBasePrice = Number(product.basePrice || 0);
        oldSuggested = Number(product.suggestedPrice || 0);
      }
    }

    // Yazma kararı + audit'e gerçekten yazılan değerleri belirle
    const willWrite = status === "applied" || status === "applied_partial";

    const writtenRawMaterialCost = willWrite ? rawCost : oldRaw;
    const writtenUnitCost = willWrite ? newUnitCost : oldUnitCost;
    // Spec: factory_products.basePrice = SUM(ingredient_qty × inventory.unit_price)
    // = rawCost (per batch raw material toplamı). Bu, recipe.unitCost'tan farklıdır
    // (unitCost = (raw + labor + energy) / batch_output, internal cost-of-goods).
    // suggestedPrice = basePrice × profitMargin (default 1.01).
    const writtenBasePrice =
      willWrite && product ? rawCost : oldBasePrice;
    const writtenSuggested =
      willWrite && product ? rawCost * margin : oldSuggested;

    if (willWrite) {
      await db
        .update(factoryRecipes)
        .set({
          rawMaterialCost: rawCost.toFixed(4),
          totalBatchCost: totalBatch.toFixed(4),
          unitCost: newUnitCost.toFixed(4),
          costLastCalculated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(factoryRecipes.id, recipe.id));

      if (product && writtenBasePrice !== null && writtenSuggested !== null) {
        await db
          .update(factoryProducts)
          .set({
            basePrice: writtenBasePrice.toFixed(2),
            suggestedPrice: writtenSuggested.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(factoryProducts.id, product.id));
        updatedProducts++;
      }
    }

    const changePercent =
      oldUnitCost > 0
        ? ((writtenUnitCost - oldUnitCost) / oldUnitCost) * 100
        : null;

    // Audit kaydı devre dışı (factory_recipe_price_history şeması task-97'den sonra kaldırıldı)
    const _auditPayload = ({
      recipeId: recipe.id,
      productId: recipe.productId ?? null,
      oldRawMaterialCost: oldRaw.toFixed(4),
      newRawMaterialCost: writtenRawMaterialCost.toFixed(4),
      oldUnitCost: oldUnitCost.toFixed(4),
      newUnitCost: writtenUnitCost.toFixed(4),
      oldBasePrice: oldBasePrice !== null ? oldBasePrice.toFixed(2) : null,
      newBasePrice: writtenBasePrice !== null ? writtenBasePrice.toFixed(2) : null,
      oldSuggestedPrice: oldSuggested !== null ? oldSuggested.toFixed(2) : null,
      newSuggestedPrice: writtenSuggested !== null ? writtenSuggested.toFixed(2) : null,
      changePercent: changePercent !== null ? changePercent.toFixed(2) : null,
      status,
      reason,
      ingredientCount: total,
      resolvedIngredientCount: resolved,
      coveragePercent: (coverage * 100).toFixed(2),
      missingIngredients: missing,
      source: "recalc_script",
      runId: RUN_ID,
    });

    reports.push({
      recipeId: recipe.id,
      recipeCode: recipe.code,
      recipeName: recipe.name,
      productId: recipe.productId ?? null,
      productSku,
      baseBatchOutput: batchOutput,
      coveragePercent: Math.round(coverage * 1000) / 10,
      ingredientCount: total,
      resolvedIngredientCount: resolved,
      oldRawMaterialCost: Math.round(oldRaw * 100) / 100,
      newRawMaterialCost: Math.round(writtenRawMaterialCost * 100) / 100,
      oldUnitCost: Math.round(oldUnitCost * 100) / 100,
      newUnitCost: Math.round(writtenUnitCost * 100) / 100,
      oldBasePrice: oldBasePrice !== null ? Math.round(oldBasePrice * 100) / 100 : null,
      newBasePrice: writtenBasePrice !== null ? Math.round(writtenBasePrice * 100) / 100 : null,
      oldSuggestedPrice: oldSuggested !== null ? Math.round(oldSuggested * 100) / 100 : null,
      newSuggestedPrice: writtenSuggested !== null ? Math.round(writtenSuggested * 100) / 100 : null,
      profitMargin: margin,
      status,
      reason,
      changePercent: changePercent !== null ? Math.round(changePercent * 10) / 10 : null,
      missingIngredients: missing,
    });

    const flag =
      status === "skipped_empty"
        ? "[SKIP-empty]"
        : status === "applied_partial"
        ? "[partial]"
        : changePercent === null
        ? "[YENİ]"
        : changePercent > 10
        ? "[+++]"
        : changePercent < -10
        ? "[---]"
        : "[ok]";
    const sku = productSku ? ` → ${productSku}` : "";
    const cov = `cov ${(coverage * 100).toFixed(0)}% (${resolved}/${total})`;
    const chg =
      changePercent !== null
        ? ` (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%)`
        : "";
    console.log(
      `  ${flag} ${recipe.code} ${recipe.name}${sku}: ` +
        `unit ₺${oldUnitCost.toFixed(2)} → ₺${writtenUnitCost.toFixed(2)}${chg} | ${cov}`
    );
  }

  // JSON karşılaştırma raporu
  const dataDir = path.join(process.cwd(), "server", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const reportPath = path.join(dataDir, `price-recalc-report-${RUN_ID}.json`);

  // KPI'lar product.basePrice (= rawCost) deltası üzerinden hesaplanır
  // çünkü Task #97'nin asıl çıktısı ürün fiyatlarıdır (recipe.unitCost
  // sadece internal COGS). Bu, finance/IT dashboard'larında gerçek fiyat
  // etkisini doğru yansıtır.
  const written = reports.filter(
    (r) => r.status === "applied" || r.status === "applied_partial"
  );

  const newPriced = written.filter(
    (r) => (r.oldBasePrice ?? 0) === 0 && (r.newBasePrice ?? 0) > 0
  ).length;

  const basePriceDeltaPct = (r: RecipeReport): number | null => {
    const oldBp = r.oldBasePrice ?? 0;
    const newBp = r.newBasePrice ?? 0;
    if (oldBp <= 0) return null;
    return ((newBp - oldBp) / oldBp) * 100;
  };

  const summary = {
    runId: RUN_ID,
    generatedAt: new Date().toISOString(),
    coverageThreshold: COVERAGE_THRESHOLD,
    totalRecipes: recipes.length,
    applied,
    appliedPartial,
    skippedEmpty,
    updatedProducts,
    // basePrice (= ürün fiyatı) bazlı sayaçlar
    bigIncreases: written.filter((r) => {
      const d = basePriceDeltaPct(r);
      return d !== null && d > 10;
    }).length,
    bigDecreases: written.filter((r) => {
      const d = basePriceDeltaPct(r);
      return d !== null && d < -10;
    }).length,
    newPriced,
    // Geriye dönük uyumluluk için unitCost-bazlı sayaçlar da eklenir
    unitCostBigIncreases: written.filter(
      (r) => r.changePercent !== null && r.changePercent > 10
    ).length,
    unitCostBigDecreases: written.filter(
      (r) => r.changePercent !== null && r.changePercent < -10
    ).length,
    reports,
  };

  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n" + "=".repeat(80));
  console.log("ÖZET");
  console.log("=".repeat(80));
  console.log(`  Toplam reçete:                    ${recipes.length}`);
  console.log(`  Tam uygulanan (applied):          ${applied}`);
  console.log(`  Best-effort (applied_partial):    ${appliedPartial}`);
  console.log(`  Atlanan — boş:                    ${skippedEmpty}`);
  console.log(`  Güncellenen ürün:                 ${updatedProducts}`);
  console.log(`  Yeni fiyatlanan ürün (eski 0):    ${newPriced}`);
  console.log(`  basePrice büyük artış (>%10):     ${summary.bigIncreases}`);
  console.log(`  basePrice büyük düşüş (<-%10):    ${summary.bigDecreases}`);
  console.log(`  unitCost büyük artış (>%10):      ${summary.unitCostBigIncreases}`);
  console.log(`  unitCost büyük düşüş (<-%10):     ${summary.unitCostBigDecreases}`);
  console.log(`\n  Audit DB yazımı:     devre dışı (factory_recipe_price_history şeması kaldırıldı — follow-up #106)`);
  console.log(`  Run ID:              ${RUN_ID}`);
  console.log(`  JSON raporu:         ${reportPath}`);
}

run()
  .then(() => {
    console.log("\nScript tamamlandı.");
    process.exit(0);
  })
  .catch((e: unknown) => {
    console.error("\nHATA:", e);
    process.exit(1);
  });
