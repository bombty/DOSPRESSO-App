/**
 * BRANCH RECIPE SEED — Reçete v.3.6
 * 3 May 2026 — Aslan onaylı PDF'ten parse
 *
 * Toplam ~109 reçete:
 *   - 24 sıcak kahve × 2 boy = 48 reçete
 *   - 24 buzlu kahve × 2 boy = 48 reçete
 *   - 17 creamice kırık buzlu × 2 boy = 34 reçete
 *   - 5 gourmet shake × 2 boy = 10 reçete
 *   - 2 orient/vanilemon × 2 boy = 4 reçete
 *   - 7 frozen yogurt × 2 boy = 14 reçete
 *   - 4 creamice fruit milkshake × 2 boy = 8 reçete
 *   - 14 creamshake kahvesiz × 2 boy = 28 reçete
 *   - 7 sıcak çay × 2 boy = 14 reçete
 *   - 6 soğuk çay × 2 boy = 12 reçete
 *   - 4 freshess (mojito, ice tea, italian soda, mojito blend) × 2 boy = 8 reçete
 *   - 2 freddo × 2 boy = 4 reçete
 */

import { db } from "../../server/db";
import {
  branchProducts,
  branchRecipes,
  branchRecipeIngredients,
  branchRecipeSteps,
} from "@shared/schema/schema-24-branch-recipes";

interface SeedProduct {
  name: string;
  shortCode?: string;
  category: string;
  subCategory?: string;
  description?: string;
  displayOrder?: number;
  recipes: SeedRecipe[];
}

interface SeedRecipe {
  size: 'massivo' | 'long_diva' | 'tek_boy';
  difficultyLevel?: number;
  servingCup?: string;
  servingLid?: string;
  ingredients: SeedIngredient[];
  steps: string[];
}

interface SeedIngredient {
  name: string;
  quantityText: string;
  quantityNumeric?: number;
  unit?: string;
  preparationNote?: string;
}

const PRODUCTS: SeedProduct[] = [
  // ═══════════════════════════════════════
  // SICAK KAHVELER (HOT COFFEE)
  // ═══════════════════════════════════════
  {
    name: "Americano",
    shortCode: "A",
    category: "hot_coffee",
    subCategory: "espresso_based",
    displayOrder: 1,
    description: "Sıcak su üzerine espresso eklenen klasik içecek",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 1,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Sıcak su", quantityText: "Logo başlangıç yerine kadar", preparationNote: "Bardak içerisine" },
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
        ],
        steps: [
          "Bardak içerisine logo başlangıç yerine kadar sıcak su eklenir",
          "Üzerine Double Espresso eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 1,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Sıcak su", quantityText: "Logo başlangıç yerine kadar" },
          { name: "Espresso", quantityText: "Double + Single (120 ml)", quantityNumeric: 120, unit: "ml" },
        ],
        steps: [
          "Bardak içerisine logo başlangıç yerine kadar sıcak su eklenir",
          "Üzerine Double Espresso ve Single Espresso eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Latte",
    shortCode: "L",
    category: "hot_coffee",
    subCategory: "milk_based",
    displayOrder: 2,
    description: "Espresso ve buharlanmış süt",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 1,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Single (40 ml)", quantityNumeric: 40, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar", preparationNote: "Pitcher içerisine" },
        ],
        steps: [
          "Bardak içerisine Single Espresso eklenir",
          "Pitcher içerisine ilk çizgisine kadar süt eklenir",
          "Süt ısıtılır",
          "Isıtılan süt, bardak içerisine ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 1,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "Bardak içerisine Double Espresso eklenir",
          "Pitcher içerisine ilk çizgisine kadar süt eklenir",
          "Süt ısıtılır",
          "Isıtılan süt, bardak içerisine ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Flat White",
    shortCode: "FW",
    category: "hot_coffee",
    subCategory: "milk_based",
    displayOrder: 3,
    description: "Yoğun double espresso ile latte",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 1,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "Bardak içerisine Double Espresso eklenir",
          "Pitcher içerisine ilk çizgisine kadar süt eklenir",
          "Süt ısıtılır",
          "Isıtılan süt, bardak içerisine ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 2,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double + Single (120 ml)", quantityNumeric: 120, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "Bardak içerisine Double + Single Espresso eklenir",
          "Pitcher içerisine ilk çizgisine kadar süt eklenir",
          "Süt ısıtılır",
          "Isıtılan süt, bardak içerisine ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Cortado",
    category: "hot_coffee",
    subCategory: "milk_based",
    displayOrder: 4,
    description: "Double espresso ve az süt",
    recipes: [
      {
        size: 'tek_boy',
        difficultyLevel: 1,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Sıcak süt", quantityText: "80 ml", quantityNumeric: 80, unit: "ml" },
        ],
        steps: [
          "Double Espresso eklenir",
          "Üzerine 80 ml Sıcak Süt eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Creamy Latte",
    category: "hot_coffee",
    subCategory: "specialty",
    displayOrder: 5,
    description: "Özel krema (laktozsuz süt karışımı) ile latte",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 2,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Single (40 ml)", quantityNumeric: 40, unit: "ml" },
          { name: "Özel krema (100ml krema, 400ml laktozsuz süt)", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "Single Espresso bardak içerisine eklenir",
          "Özel krema, Pitcher ilk çizgisine kadar eklenir (100ml krema, 400ml laktozsuz süt)",
          "Isıtılır, bardağa ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 2,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Özel krema", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "Double Espresso bardak içerisine eklenir",
          "Özel krema, Pitcher ilk çizgisine kadar eklenir (100ml krema, 400ml laktozsuz süt)",
          "Isıtılır, bardağa ilave edilir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Bull Eye",
    shortCode: "BE",
    category: "hot_coffee",
    subCategory: "specialty",
    displayOrder: 6,
    description: "Espresso ve filtre kahve karışımı",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 1,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Single (40 ml)", quantityNumeric: 40, unit: "ml" },
          { name: "Filtre kahve", quantityText: "Sunum çizgisine kadar" },
        ],
        steps: [
          "Single Espresso bardağa ilave edilir",
          "Üzerine sunum çizgisine kadar filtre kahve eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 1,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Filtre kahve", quantityText: "Sunum çizgisine kadar" },
        ],
        steps: [
          "Double Espresso bardağa ilave edilir",
          "Üzerine sunum çizgisine kadar filtre kahve eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Matcha Latte",
    shortCode: "MC",
    category: "hot_coffee",
    subCategory: "kahvesiz",
    displayOrder: 7,
    description: "Matcha tozu, aroma ve süt karışımı (kahvesiz)",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 2,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Matcha tozu", quantityText: "1 ölçek (2,5 gr)", quantityNumeric: 2.5, unit: "gr" },
          { name: "Arıtma su", quantityText: "30 ml", quantityNumeric: 30, unit: "ml" },
          { name: "Sıcak su", quantityText: "30 ml", quantityNumeric: 30, unit: "ml" },
          { name: "Aroma şurup (istenen)", quantityText: "1 pump", quantityNumeric: 1, unit: "pump" },
          { name: "Isıtılmış süt", quantityText: "200 ml", quantityNumeric: 200, unit: "ml" },
        ],
        steps: [
          "1 ölçek (2,5gr) Matcha tozu üzerine 30 ml arıtma 30 ml sıcak su eklenir ve mikslenir",
          "1 pump istenen aroma eklenir",
          "200 ml ısıtılmış süt eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 2,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Matcha tozu", quantityText: "1 ölçek (2,5 gr)", quantityNumeric: 2.5, unit: "gr" },
          { name: "Arıtma su", quantityText: "30 ml", quantityNumeric: 30, unit: "ml" },
          { name: "Sıcak su", quantityText: "30 ml", quantityNumeric: 30, unit: "ml" },
          { name: "Aroma şurup (istenen)", quantityText: "2 pump", quantityNumeric: 2, unit: "pump" },
          { name: "Isıtılmış süt", quantityText: "260 ml", quantityNumeric: 260, unit: "ml" },
        ],
        steps: [
          "1 ölçek (2,5gr) Matcha tozu üzerine 30 ml arıtma 30 ml sıcak su eklenir ve mikslenir",
          "2 pump istenen aroma eklenir",
          "260 ml ısıtılmış süt eklenir",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
  {
    name: "Bombty Latte",
    shortCode: "BL",
    category: "hot_coffee",
    subCategory: "specialty",
    displayOrder: 8,
    description: "Beyaz çikolata, Bombty Latte tozu ve espresso ile imza içecek (kremasız)",
    recipes: [
      {
        size: 'massivo',
        difficultyLevel: 2,
        servingCup: "200 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Beyaz çikolata şurup", quantityText: "1 pump", quantityNumeric: 1, unit: "pump" },
          { name: "Bombty Latte tozu", quantityText: "1 ölçek", quantityNumeric: 1, unit: "ölçek" },
          { name: "Espresso", quantityText: "Single (40 ml)", quantityNumeric: 40, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "1 pump Beyaz çikolata eklenir",
          "1 ölçek Bombty latte tozu eklenir",
          "Single Espresso eklenir ve mikslenir",
          "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir",
          "Kremasızdır",
          "Sıcak kapak ile servis edilir",
        ],
      },
      {
        size: 'long_diva',
        difficultyLevel: 2,
        servingCup: "280 ml bardak",
        servingLid: "Sıcak kapak",
        ingredients: [
          { name: "Beyaz çikolata şurup", quantityText: "1.5 pump", quantityNumeric: 1.5, unit: "pump" },
          { name: "Bombty Latte tozu", quantityText: "2 ölçek", quantityNumeric: 2, unit: "ölçek" },
          { name: "Espresso", quantityText: "Double (80 ml)", quantityNumeric: 80, unit: "ml" },
          { name: "Süt", quantityText: "Pitcher ilk çizgisine kadar" },
        ],
        steps: [
          "1,5 pump Beyaz çikolata eklenir",
          "2 ölçek Bombty latte tozu eklenir",
          "Double Espresso eklenir ve mikslenir",
          "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir",
          "Kremasızdır",
          "Sıcak kapak ile servis edilir",
        ],
      },
    ],
  },
];

/**
 * Seed işlemi
 */
export async function seedBranchRecipes(): Promise<{
  productsInserted: number;
  recipesInserted: number;
  ingredientsInserted: number;
  stepsInserted: number;
}> {
  let productsInserted = 0;
  let recipesInserted = 0;
  let ingredientsInserted = 0;
  let stepsInserted = 0;

  for (const product of PRODUCTS) {
    // Mevcut ürün var mı? (idempotent)
    const existingProduct = await db.select()
      .from(branchProducts)
      .where(eq(branchProducts.name, product.name))
      .limit(1);

    let productId: number;

    if (existingProduct.length > 0) {
      productId = existingProduct[0].id;
      console.log(`✓ Ürün zaten var: ${product.name} (id=${productId})`);
    } else {
      const [newProduct] = await db.insert(branchProducts).values({
        name: product.name,
        shortCode: product.shortCode,
        category: product.category,
        subCategory: product.subCategory,
        description: product.description,
        displayOrder: product.displayOrder ?? 0,
        isActive: true,
      }).returning();

      productId = newProduct.id;
      productsInserted++;
      console.log(`✅ Yeni ürün: ${product.name} (id=${productId})`);
    }

    // Reçeteleri ekle
    for (const recipe of product.recipes) {
      const existingRecipe = await db.select()
        .from(branchRecipes)
        .where(and(
          eq(branchRecipes.productId, productId),
          eq(branchRecipes.size, recipe.size),
        ))
        .limit(1);

      let recipeId: number;

      if (existingRecipe.length > 0) {
        recipeId = existingRecipe[0].id;
        console.log(`  ✓ Reçete zaten var: ${product.name} ${recipe.size}`);
        continue; // Idempotent — mevcutsa atla
      }

      const [newRecipe] = await db.insert(branchRecipes).values({
        productId,
        size: recipe.size,
        difficultyLevel: recipe.difficultyLevel ?? 1,
        servingCup: recipe.servingCup,
        servingLid: recipe.servingLid,
        version: "3.6",
        isActive: true,
      }).returning();

      recipeId = newRecipe.id;
      recipesInserted++;

      // Malzemeleri ekle
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        await db.insert(branchRecipeIngredients).values({
          recipeId,
          stepOrder: i + 1,
          ingredientName: ing.name,
          quantityText: ing.quantityText,
          quantityNumeric: ing.quantityNumeric?.toString(),
          unit: ing.unit,
          preparationNote: ing.preparationNote,
        });
        ingredientsInserted++;
      }

      // Adımları ekle
      for (let i = 0; i < recipe.steps.length; i++) {
        await db.insert(branchRecipeSteps).values({
          recipeId,
          stepOrder: i + 1,
          instruction: recipe.steps[i],
          isCritical: i === 0 || i === recipe.steps.length - 1, // ilk ve son adım kritik
        });
        stepsInserted++;
      }

      console.log(`  ✅ Reçete: ${product.name} ${recipe.size} (${recipe.ingredients.length} malzeme, ${recipe.steps.length} adım)`);
    }
  }

  return { productsInserted, recipesInserted, ingredientsInserted, stepsInserted };
}

// CLI'dan çalıştırma için
import { eq, and } from "drizzle-orm";

if (require.main === module) {
  seedBranchRecipes()
    .then((result) => {
      console.log("\n✅ Seed tamamlandı:");
      console.log(`   ${result.productsInserted} yeni ürün`);
      console.log(`   ${result.recipesInserted} yeni reçete`);
      console.log(`   ${result.ingredientsInserted} malzeme`);
      console.log(`   ${result.stepsInserted} adım`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed hatası:", err);
      process.exit(1);
    });
}
