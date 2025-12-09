import { db } from "./db";
import { recipes, recipeCategories, recipeVersions } from "@shared/schema";
import { eq } from "drizzle-orm";

// Additional recipes to reach 100+ total
const additionalRecipes = [
  // Temel Espresso (category 9) - 8 recipes
  { categoryId: 9, code: "ESP002", nameTr: "Double Espresso", nameEn: "Double Espresso", difficulty: "easy", estimatedMinutes: 2, hasCoffee: true, hasMilk: false, coffeeType: "espresso" },
  { categoryId: 9, code: "ESP003", nameTr: "Ristretto", nameEn: "Ristretto", difficulty: "medium", estimatedMinutes: 2, hasCoffee: true, hasMilk: false, coffeeType: "espresso" },
  { categoryId: 9, code: "ESP004", nameTr: "Lungo", nameEn: "Lungo", difficulty: "easy", estimatedMinutes: 3, hasCoffee: true, hasMilk: false, coffeeType: "espresso" },
  { categoryId: 9, code: "MAC001", nameTr: "Macchiato", nameEn: "Macchiato", difficulty: "easy", estimatedMinutes: 2, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 9, code: "MAC002", nameTr: "Latte Macchiato", nameEn: "Latte Macchiato", difficulty: "medium", estimatedMinutes: 4, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 9, code: "AFF001", nameTr: "Affogato", nameEn: "Affogato", difficulty: "easy", estimatedMinutes: 3, hasCoffee: true, hasMilk: false, coffeeType: "espresso" },
  { categoryId: 9, code: "CON001", nameTr: "Con Panna", nameEn: "Con Panna", difficulty: "easy", estimatedMinutes: 3, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 9, code: "BRV001", nameTr: "Breve", nameEn: "Breve", difficulty: "medium", estimatedMinutes: 4, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },

  // Matcha (category 25) - 6 recipes
  { categoryId: 25, code: "MAT001", nameTr: "Matcha Latte", nameEn: "Matcha Latte", difficulty: "medium", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 25, code: "MAT002", nameTr: "Iced Matcha Latte", nameEn: "Iced Matcha Latte", difficulty: "medium", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 25, code: "MAT003", nameTr: "Matcha Frappuccino", nameEn: "Matcha Frappuccino", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 25, code: "MAT004", nameTr: "Matcha Shot", nameEn: "Matcha Shot", difficulty: "easy", estimatedMinutes: 2, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 25, code: "MAT005", nameTr: "Matcha Coconut", nameEn: "Matcha Coconut", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 25, code: "MAT006", nameTr: "Matcha Oat Milk", nameEn: "Matcha Oat Milk", difficulty: "medium", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },

  // Modum Çay (category 10) - 6 recipes
  { categoryId: 10, code: "MDM001", nameTr: "Türk Çayı", nameEn: "Turkish Tea", difficulty: "easy", estimatedMinutes: 5, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 10, code: "MDM002", nameTr: "Earl Grey", nameEn: "Earl Grey", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 10, code: "MDM003", nameTr: "Papatya Çayı", nameEn: "Chamomile Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 10, code: "MDM004", nameTr: "Ihlamur", nameEn: "Linden Tea", difficulty: "easy", estimatedMinutes: 5, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 10, code: "MDM005", nameTr: "Adaçayı", nameEn: "Sage Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 10, code: "MDM006", nameTr: "Nane Limon", nameEn: "Mint Lemon Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },

  // Paketli İçecekler (category 8) - 8 recipes
  { categoryId: 8, code: "PKT001", nameTr: "Su 500ml", nameEn: "Water 500ml", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT002", nameTr: "Maden Suyu", nameEn: "Sparkling Water", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT003", nameTr: "Ayran", nameEn: "Ayran", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 8, code: "PKT004", nameTr: "Portakal Suyu", nameEn: "Orange Juice", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT005", nameTr: "Elma Suyu", nameEn: "Apple Juice", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT006", nameTr: "Soda", nameEn: "Soda", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT007", nameTr: "Ice Tea Şeftali", nameEn: "Ice Tea Peach", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 8, code: "PKT008", nameTr: "Ice Tea Limon", nameEn: "Ice Tea Lemon", difficulty: "easy", estimatedMinutes: 1, hasCoffee: false, hasMilk: false, coffeeType: "none" },

  // Milkshake (category 6) - 6 recipes
  { categoryId: 6, code: "MLK001", nameTr: "Çikolatalı Milkshake", nameEn: "Chocolate Milkshake", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 6, code: "MLK002", nameTr: "Vanilyalı Milkshake", nameEn: "Vanilla Milkshake", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 6, code: "MLK003", nameTr: "Çilekli Milkshake", nameEn: "Strawberry Milkshake", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 6, code: "MLK004", nameTr: "Muzlu Milkshake", nameEn: "Banana Milkshake", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 6, code: "MLK005", nameTr: "Karamelli Milkshake", nameEn: "Caramel Milkshake", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 6, code: "MLK006", nameTr: "Oreo Milkshake", nameEn: "Oreo Milkshake", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: true, coffeeType: "none" },

  // Limonatalar (category 5) - 6 recipes
  { categoryId: 5, code: "LMN003", nameTr: "Çilekli Limonata", nameEn: "Strawberry Lemonade", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 5, code: "LMN004", nameTr: "Naneli Limonata", nameEn: "Mint Lemonade", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 5, code: "LMN005", nameTr: "Zencefilli Limonata", nameEn: "Ginger Lemonade", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 5, code: "LMN006", nameTr: "Lavanta Limonata", nameEn: "Lavender Lemonade", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 5, code: "LMN007", nameTr: "Karpuzlu Limonata", nameEn: "Watermelon Lemonade", difficulty: "easy", estimatedMinutes: 5, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 5, code: "LMN008", nameTr: "Greyfurtlu Limonata", nameEn: "Grapefruit Lemonade", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },

  // Sıcak Kahveler (category 1) - 6 more recipes
  { categoryId: 1, code: "MOC001", nameTr: "Mocha", nameEn: "Mocha", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 1, code: "CAR001", nameTr: "Caramel Latte", nameEn: "Caramel Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 1, code: "VAN001", nameTr: "Vanilla Latte", nameEn: "Vanilla Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 1, code: "HAZ001", nameTr: "Hazelnut Latte", nameEn: "Hazelnut Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 1, code: "WHT001", nameTr: "White Mocha", nameEn: "White Mocha", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 1, code: "CIN001", nameTr: "Cinnamon Latte", nameEn: "Cinnamon Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },

  // Soğuk Kahveler (category 2) - 6 more recipes
  { categoryId: 2, code: "ICE003", nameTr: "Iced Mocha", nameEn: "Iced Mocha", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 2, code: "ICE004", nameTr: "Iced Caramel Latte", nameEn: "Iced Caramel Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 2, code: "ICE005", nameTr: "Iced Vanilla Latte", nameEn: "Iced Vanilla Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 2, code: "FRP001", nameTr: "Frappuccino Classic", nameEn: "Frappuccino Classic", difficulty: "medium", estimatedMinutes: 5, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 2, code: "FRP002", nameTr: "Caramel Frappuccino", nameEn: "Caramel Frappuccino", difficulty: "medium", estimatedMinutes: 6, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },
  { categoryId: 2, code: "FRP003", nameTr: "Mocha Frappuccino", nameEn: "Mocha Frappuccino", difficulty: "medium", estimatedMinutes: 6, hasCoffee: true, hasMilk: true, coffeeType: "espresso" },

  // SICAK ÇAYLAR (category 17) - 4 more recipes
  { categoryId: 17, code: "HT005", nameTr: "Kuşburnu Çayı", nameEn: "Rosehip Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 17, code: "HT006", nameTr: "Hibiskus Çayı", nameEn: "Hibiscus Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 17, code: "HT007", nameTr: "Chai Latte", nameEn: "Chai Latte", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 17, code: "HT008", nameTr: "Sıcak Elma Çayı", nameEn: "Hot Apple Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },

  // SOĞUK ÇAYLAR (category 18) - 4 more recipes
  { categoryId: 18, code: "CT004", nameTr: "Buzlu Yeşil Çay", nameEn: "Iced Green Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 18, code: "CT005", nameTr: "Buzlu Hibiskus", nameEn: "Iced Hibiscus", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
  { categoryId: 18, code: "CT006", nameTr: "Buzlu Chai", nameEn: "Iced Chai", difficulty: "medium", estimatedMinutes: 5, hasCoffee: false, hasMilk: true, coffeeType: "none" },
  { categoryId: 18, code: "CT007", nameTr: "Şeftalili Buzlu Çay", nameEn: "Peach Iced Tea", difficulty: "easy", estimatedMinutes: 4, hasCoffee: false, hasMilk: false, coffeeType: "none" },
];

export async function seedMoreRecipes() {
  console.log("🍵 Starting additional recipes seed...");
  
  let inserted = 0;
  let skipped = 0;
  
  for (const recipe of additionalRecipes) {
    try {
      // Check if recipe with same code in same category already exists
      const existing = await db.select()
        .from(recipes)
        .where(eq(recipes.code, recipe.code))
        .limit(1);
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert recipe
      const [newRecipe] = await db.insert(recipes).values({
        categoryId: recipe.categoryId,
        code: recipe.code,
        nameTr: recipe.nameTr,
        nameEn: recipe.nameEn,
        difficulty: recipe.difficulty,
        estimatedMinutes: recipe.estimatedMinutes,
        hasCoffee: recipe.hasCoffee,
        hasMilk: recipe.hasMilk,
        coffeeType: recipe.coffeeType,
        isActive: true,
        displayOrder: 0,
      }).returning();
      
      // Create initial version for the recipe
      await db.insert(recipeVersions).values({
        recipeId: newRecipe.id,
        versionNumber: 1,
        sizes: {
          massivo: { cupMl: 350, steps: [`${recipe.nameTr} hazırlama adımları - 350ml`] },
          longDiva: { cupMl: 550, steps: [`${recipe.nameTr} hazırlama adımları - 550ml`] },
        },
        isPublished: true,
      });
      
      inserted++;
    } catch (error) {
      console.error(`Error inserting recipe ${recipe.code}:`, error);
    }
  }
  
  console.log(`✅ Additional recipes seed completed:`);
  console.log(`   - Inserted: ${inserted} new recipes`);
  console.log(`   - Skipped: ${skipped} existing recipes`);
  
  // Get final count
  const totalCount = await db.select().from(recipes);
  console.log(`   - Total recipes: ${totalCount.length}`);
}
