import type { Express, Request, Response } from "express";
import { db } from "./db";
import { 
  rawMaterials,
  productRecipes,
  productRecipeIngredients,
  factoryFixedCosts,
  profitMarginTemplates,
  productCostCalculations,
  productionCostTracking,
  factoryProducts,
  inventory,
  inventoryMovements,
  purchaseOrderItems,
  purchaseOrders,
  productionRecords,
  productionIngredients,
  notifications,
  insertRawMaterialSchema,
  insertProductRecipeSchema,
  insertProductRecipeIngredientSchema,
  insertFactoryFixedCostSchema,
  insertProfitMarginTemplateSchema,
  insertProductCostCalculationSchema
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, asc, isNotNull } from "drizzle-orm";

type AuthMiddleware = (req: Request, res: Response, next: () => void) => void;

export function registerMaliyetRoutes(app: Express, isAuthenticated: AuthMiddleware) {
  
  // ========================================
  // HAMMADDE YÖNETİMİ - Raw Materials
  // ========================================
  
  app.get("/api/raw-materials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category, search, active } = req.query;
      
      let conditions: any[] = [];
      
      // Default to active=true unless explicitly set to "false"
      if (active !== "false") {
        conditions.push(eq(rawMaterials.isActive, true));
      }
      
      if (category && category !== "all") {
        conditions.push(eq(rawMaterials.category, category as string));
      }
      
      if (search) {
        conditions.push(or(
          like(rawMaterials.name, `%${search}%`),
          like(rawMaterials.code, `%${search}%`)
        ));
      }
      
      const materials = conditions.length > 0
        ? await db.select().from(rawMaterials).where(and(...conditions)).orderBy(rawMaterials.name)
        : await db.select().from(rawMaterials).orderBy(rawMaterials.name);
      
      res.json(materials);
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      res.status(500).json({ error: "Hammaddeler alınamadı" });
    }
  });
  
  app.post("/api/raw-materials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parseResult = insertRawMaterialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [newMaterial] = await db.insert(rawMaterials).values(parseResult.data).returning();
      res.status(201).json(newMaterial);
    } catch (error) {
      console.error("Error creating raw material:", error);
      res.status(500).json({ error: "Hammadde oluşturulamadı" });
    }
  });
  
  app.put("/api/raw-materials/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = insertRawMaterialSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [updated] = await db.update(rawMaterials)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(rawMaterials.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Hammadde bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating raw material:", error);
      res.status(500).json({ error: "Hammadde güncellenemedi" });
    }
  });
  
  app.delete("/api/raw-materials/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.update(rawMaterials)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(rawMaterials.id, parseInt(id)));
      res.json({ message: "Hammadde silindi" });
    } catch (error) {
      console.error("Error deleting raw material:", error);
      res.status(500).json({ error: "Hammadde silinemedi" });
    }
  });
  
  app.post("/api/raw-materials/sync-prices", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const materials = await db.select().from(rawMaterials).where(eq(rawMaterials.isActive, true));
      let updatedCount = 0;
      
      for (const material of materials) {
        if (material.inventoryId) {
          const lastOrder = await db.select({
            unitPrice: purchaseOrderItems.unitPrice,
            orderDate: purchaseOrders.orderDate
          })
            .from(purchaseOrderItems)
            .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
            .where(eq(purchaseOrderItems.inventoryId, material.inventoryId))
            .orderBy(desc(purchaseOrders.orderDate))
            .limit(1);
          
          if (lastOrder.length > 0) {
            await db.update(rawMaterials)
              .set({
                lastPurchasePrice: lastOrder[0].unitPrice,
                currentUnitPrice: lastOrder[0].unitPrice,
                priceLastUpdated: new Date(),
                updatedAt: new Date()
              })
              .where(eq(rawMaterials.id, material.id));
            updatedCount++;
          }
        }
      }
      
      res.json({ message: `${updatedCount} hammadde fiyatı güncellendi`, updatedCount });
    } catch (error) {
      console.error("Error syncing prices:", error);
      res.status(500).json({ error: "Fiyatlar senkronize edilemedi" });
    }
  });
  
  // ========================================
  // ÜRÜN REÇETELERİ - Product Recipes
  // ========================================
  
  app.get("/api/recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { productId, active } = req.query;
      
      let conditions: any[] = [];
      
      if (productId) {
        conditions.push(eq(productRecipes.productId, parseInt(productId as string)));
      }
      
      if (active === "true") {
        conditions.push(eq(productRecipes.isActive, true));
      }
      
      const recipes = conditions.length > 0
        ? await db.select({
            recipe: productRecipes,
            product: factoryProducts
          })
            .from(productRecipes)
            .leftJoin(factoryProducts, eq(productRecipes.productId, factoryProducts.id))
            .where(and(...conditions))
            .orderBy(desc(productRecipes.createdAt))
        : await db.select({
            recipe: productRecipes,
            product: factoryProducts
          })
            .from(productRecipes)
            .leftJoin(factoryProducts, eq(productRecipes.productId, factoryProducts.id))
            .orderBy(desc(productRecipes.createdAt));
      
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Reçeteler alınamadı" });
    }
  });
  
  app.get("/api/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [recipe] = await db.select({
        recipe: productRecipes,
        product: factoryProducts
      })
        .from(productRecipes)
        .leftJoin(factoryProducts, eq(productRecipes.productId, factoryProducts.id))
        .where(eq(productRecipes.id, parseInt(id)));
      
      if (!recipe) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }
      
      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, parseInt(id)));
      
      res.json({ ...recipe, ingredients });
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ error: "Reçete alınamadı" });
    }
  });
  
  app.post("/api/recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const parseResult = insertProductRecipeSchema.safeParse({
        ...req.body,
        createdById: user?.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [newRecipe] = await db.insert(productRecipes).values(parseResult.data).returning();
      res.status(201).json(newRecipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ error: "Reçete oluşturulamadı" });
    }
  });
  
  app.put("/api/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = insertProductRecipeSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [updated] = await db.update(productRecipes)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(productRecipes.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Reçete güncellenemedi" });
    }
  });
  
  // Reçete hammaddesi ekleme/güncelleme
  app.post("/api/recipes/:id/ingredients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rawMaterialId, quantity, unit, notes } = req.body;
      
      const [material] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, rawMaterialId));
      if (!material) {
        return res.status(404).json({ error: "Hammadde bulunamadı" });
      }
      
      const unitCost = parseFloat(material.currentUnitPrice || "0");
      const totalCost = unitCost * parseFloat(quantity);
      
      const [newIngredient] = await db.insert(productRecipeIngredients)
        .values({
          recipeId: parseInt(id),
          rawMaterialId,
          quantity,
          unit,
          unitCost: unitCost.toString(),
          totalCost: totalCost.toString(),
          notes
        })
        .returning();
      
      await updateRecipeCosts(parseInt(id));
      
      res.status(201).json(newIngredient);
    } catch (error) {
      console.error("Error adding ingredient:", error);
      res.status(500).json({ error: "Hammadde eklenemedi" });
    }
  });
  
  app.delete("/api/recipes/:recipeId/ingredients/:ingredientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipeId, ingredientId } = req.params;
      
      await db.delete(productRecipeIngredients)
        .where(eq(productRecipeIngredients.id, parseInt(ingredientId)));
      
      await updateRecipeCosts(parseInt(recipeId));
      
      res.json({ message: "Hammadde silindi" });
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      res.status(500).json({ error: "Hammadde silinemedi" });
    }
  });
  
  // ========================================
  // FABRİKA SABİT GİDERLERİ - Factory Fixed Costs
  // ========================================
  
  app.get("/api/fixed-costs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { year, month, category, active } = req.query;
      
      let conditions: any[] = [];
      
      // Default to active=true unless explicitly set to "false"
      if (active !== "false") {
        conditions.push(eq(factoryFixedCosts.isActive, true));
      }
      
      if (year) {
        conditions.push(eq(factoryFixedCosts.effectiveYear, parseInt(year as string)));
      }
      
      if (month) {
        conditions.push(eq(factoryFixedCosts.effectiveMonth, parseInt(month as string)));
      }
      
      if (category && category !== "all") {
        conditions.push(eq(factoryFixedCosts.category, category as string));
      }
      
      const costs = conditions.length > 0
        ? await db.select().from(factoryFixedCosts).where(and(...conditions)).orderBy(factoryFixedCosts.category)
        : await db.select().from(factoryFixedCosts).orderBy(factoryFixedCosts.category);
      
      res.json(costs);
    } catch (error) {
      console.error("Error fetching fixed costs:", error);
      res.status(500).json({ error: "Sabit giderler alınamadı" });
    }
  });
  
  app.get("/api/fixed-costs/summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { year, month } = req.query;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      
      const costs = await db.select()
        .from(factoryFixedCosts)
        .where(and(
          eq(factoryFixedCosts.isActive, true),
          or(
            eq(factoryFixedCosts.isRecurring, true),
            and(
              eq(factoryFixedCosts.effectiveYear, currentYear),
              eq(factoryFixedCosts.effectiveMonth, currentMonth)
            )
          )
        ));
      
      const summary = costs.reduce((acc, cost) => {
        const category = cost.category;
        if (!acc[category]) {
          acc[category] = { total: 0, items: [] };
        }
        acc[category].total += parseFloat(cost.monthlyAmount);
        acc[category].items.push(cost);
        return acc;
      }, {} as Record<string, { total: number; items: any[] }>);
      
      const totalMonthly = costs.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
      
      res.json({ summary, totalMonthly, year: currentYear, month: currentMonth });
    } catch (error) {
      console.error("Error fetching fixed cost summary:", error);
      res.status(500).json({ error: "Gider özeti alınamadı" });
    }
  });
  
  app.post("/api/fixed-costs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const parseResult = insertFactoryFixedCostSchema.safeParse({
        ...req.body,
        createdById: user?.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const data = parseResult.data;
      if (data.monthlyAmount && !data.annualAmount) {
        (data as any).annualAmount = (parseFloat(data.monthlyAmount) * 12).toString();
      }
      
      const [newCost] = await db.insert(factoryFixedCosts).values(data).returning();
      res.status(201).json(newCost);
    } catch (error) {
      console.error("Error creating fixed cost:", error);
      res.status(500).json({ error: "Sabit gider oluşturulamadı" });
    }
  });
  
  app.put("/api/fixed-costs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = insertFactoryFixedCostSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [updated] = await db.update(factoryFixedCosts)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(factoryFixedCosts.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Sabit gider bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating fixed cost:", error);
      res.status(500).json({ error: "Sabit gider güncellenemedi" });
    }
  });
  
  app.delete("/api/fixed-costs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Soft delete for audit trail
      await db.update(factoryFixedCosts)
        .set({ isActive: false })
        .where(eq(factoryFixedCosts.id, parseInt(id)));
      res.json({ message: "Sabit gider silindi" });
    } catch (error) {
      console.error("Error deleting fixed cost:", error);
      res.status(500).json({ error: "Sabit gider silinemedi" });
    }
  });
  
  // ========================================
  // KAR MARJI ŞABLONLARI - Profit Margin Templates
  // ========================================
  
  app.get("/api/profit-margins", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const margins = await db.select()
        .from(profitMarginTemplates)
        .where(eq(profitMarginTemplates.isActive, true))
        .orderBy(profitMarginTemplates.category);
      
      res.json(margins);
    } catch (error) {
      console.error("Error fetching profit margins:", error);
      res.status(500).json({ error: "Kar marjları alınamadı" });
    }
  });
  
  app.post("/api/profit-margins", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const parseResult = insertProfitMarginTemplateSchema.safeParse({
        ...req.body,
        createdById: user?.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [newMargin] = await db.insert(profitMarginTemplates).values(parseResult.data).returning();
      res.status(201).json(newMargin);
    } catch (error) {
      console.error("Error creating profit margin:", error);
      res.status(500).json({ error: "Kar marjı oluşturulamadı" });
    }
  });
  
  app.put("/api/profit-margins/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = insertProfitMarginTemplateSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [updated] = await db.update(profitMarginTemplates)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(profitMarginTemplates.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Kar marjı bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating profit margin:", error);
      res.status(500).json({ error: "Kar marjı güncellenemedi" });
    }
  });
  
  app.delete("/api/profit-margins/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.update(profitMarginTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(profitMarginTemplates.id, parseInt(id)));
      res.json({ message: "Kar marjı silindi" });
    } catch (error) {
      console.error("Error deleting profit margin:", error);
      res.status(500).json({ error: "Kar marjı silinemedi" });
    }
  });
  
  // ========================================
  // MALİYET HESAPLAMA - Cost Calculation
  // ========================================
  
  app.get("/api/cost-calculations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { productId, year, month } = req.query;
      
      let conditions: any[] = [];
      
      if (productId) {
        conditions.push(eq(productCostCalculations.productId, parseInt(productId as string)));
      }
      
      if (year) {
        conditions.push(eq(productCostCalculations.periodYear, parseInt(year as string)));
      }
      
      if (month) {
        conditions.push(eq(productCostCalculations.periodMonth, parseInt(month as string)));
      }
      
      const calculations = conditions.length > 0
        ? await db.select({
            calculation: productCostCalculations,
            product: factoryProducts
          })
            .from(productCostCalculations)
            .leftJoin(factoryProducts, eq(productCostCalculations.productId, factoryProducts.id))
            .where(and(...conditions))
            .orderBy(desc(productCostCalculations.calculationDate))
        : await db.select({
            calculation: productCostCalculations,
            product: factoryProducts
          })
            .from(productCostCalculations)
            .leftJoin(factoryProducts, eq(productCostCalculations.productId, factoryProducts.id))
            .orderBy(desc(productCostCalculations.calculationDate))
            .limit(100);
      
      res.json(calculations);
    } catch (error) {
      console.error("Error fetching cost calculations:", error);
      res.status(500).json({ error: "Maliyet hesaplamaları alınamadı" });
    }
  });
  
  app.post("/api/cost-calculations/calculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { productId, month, year } = req.body;
      
      const [recipe] = await db.select()
        .from(productRecipes)
        .where(and(
          eq(productRecipes.productId, productId),
          eq(productRecipes.isActive, true)
        ))
        .orderBy(desc(productRecipes.version))
        .limit(1);
      
      if (!recipe) {
        return res.status(404).json({ error: "Aktif reçete bulunamadı" });
      }
      
      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, recipe.id));
      
      let rawMaterialCost = 0;
      for (const ing of ingredients) {
        const qty = parseFloat(ing.ingredient.quantity);
        const price = parseFloat(ing.material?.currentUnitPrice || "0");
        rawMaterialCost += qty * price;
      }
      
      const fixedCostSummary = await db.select()
        .from(factoryFixedCosts)
        .where(eq(factoryFixedCosts.isActive, true));
      
      const totalFixedCosts = fixedCostSummary.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
      
      const productCount = await db.select({ count: sql<number>`count(*)` })
        .from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));
      
      const overheadPerProduct = productCount[0]?.count > 0 
        ? totalFixedCosts / productCount[0].count 
        : 0;
      
      const totalUnitCost = rawMaterialCost + overheadPerProduct;
      
      const [marginTemplate] = await db.select()
        .from(profitMarginTemplates)
        .leftJoin(factoryProducts, eq(profitMarginTemplates.category, factoryProducts.category))
        .where(eq(factoryProducts.id, productId))
        .limit(1);
      
      const appliedMargin = marginTemplate ? parseFloat((marginTemplate as any).profit_margin_templates?.defaultMargin || "1.20") : 1.20;
      const suggestedPrice = totalUnitCost * appliedMargin;
      
      const [calculation] = await db.insert(productCostCalculations)
        .values({
          productId,
          recipeId: recipe.id,
          periodMonth: month || new Date().getMonth() + 1,
          periodYear: year || new Date().getFullYear(),
          rawMaterialCost: rawMaterialCost.toFixed(4),
          overheadCost: overheadPerProduct.toFixed(4),
          totalUnitCost: totalUnitCost.toFixed(4),
          appliedMargin: appliedMargin.toFixed(2),
          suggestedSellingPrice: suggestedPrice.toFixed(2),
          profitPerUnit: (suggestedPrice - totalUnitCost).toFixed(4),
          profitMarginPercentage: ((appliedMargin - 1) * 100).toFixed(2),
          calculatedById: user?.id
        })
        .returning();
      
      await db.update(factoryProducts)
        .set({
          basePrice: totalUnitCost.toFixed(2),
          suggestedPrice: suggestedPrice.toFixed(2),
          profitMargin: appliedMargin.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(factoryProducts.id, productId));
      
      res.json(calculation);
    } catch (error) {
      console.error("Error calculating cost:", error);
      res.status(500).json({ error: "Maliyet hesaplanamadı" });
    }
  });
  
  app.post("/api/cost-calculations/calculate-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const products = await db.select()
        .from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));
      
      let calculated = 0;
      let errors = 0;
      
      for (const product of products) {
        try {
          const [recipe] = await db.select()
            .from(productRecipes)
            .where(and(
              eq(productRecipes.productId, product.id),
              eq(productRecipes.isActive, true)
            ))
            .limit(1);
          
          if (!recipe) continue;
          
          const ingredients = await db.select({
            ingredient: productRecipeIngredients,
            material: rawMaterials
          })
            .from(productRecipeIngredients)
            .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
            .where(eq(productRecipeIngredients.recipeId, recipe.id));
          
          let rawMaterialCost = 0;
          for (const ing of ingredients) {
            const qty = parseFloat(ing.ingredient.quantity);
            const price = parseFloat(ing.material?.currentUnitPrice || "0");
            rawMaterialCost += qty * price;
          }
          
          const workerCount = recipe.laborWorkerCount || 1;
          const productionMinutes = recipe.productionTimeMinutes || 0;
          const batchSize = recipe.laborBatchSize || 1;
          const hourlyRate = parseFloat(recipe.laborHourlyRate || "0");
          const laborCost = batchSize > 0 && hourlyRate > 0
            ? (workerCount * (productionMinutes / 60) * hourlyRate) / batchSize
            : 0;
          
          const fixedCostSummary = await db.select()
            .from(factoryFixedCosts)
            .where(eq(factoryFixedCosts.isActive, true));
          
          const totalFixedCosts = fixedCostSummary.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
          const overheadPerProduct = products.length > 0 ? totalFixedCosts / products.length : 0;
          const totalUnitCost = rawMaterialCost + laborCost + overheadPerProduct;
          
          const [marginTemplate] = await db.select()
            .from(profitMarginTemplates)
            .where(eq(profitMarginTemplates.category, product.category))
            .limit(1);
          
          const appliedMargin = marginTemplate ? parseFloat(marginTemplate.defaultMargin) : 1.20;
          const suggestedPrice = totalUnitCost * appliedMargin;
          
          await db.insert(productCostCalculations)
            .values({
              productId: product.id,
              recipeId: recipe.id,
              periodMonth: month,
              periodYear: year,
              rawMaterialCost: rawMaterialCost.toFixed(4),
              directLaborCost: laborCost.toFixed(4),
              overheadCost: overheadPerProduct.toFixed(4),
              totalUnitCost: totalUnitCost.toFixed(4),
              appliedMargin: appliedMargin.toFixed(2),
              suggestedSellingPrice: suggestedPrice.toFixed(2),
              profitPerUnit: (suggestedPrice - totalUnitCost).toFixed(4),
              profitMarginPercentage: ((appliedMargin - 1) * 100).toFixed(2),
              calculatedById: user?.id
            });
          
          await db.update(productRecipes)
            .set({
              rawMaterialCost: rawMaterialCost.toFixed(4),
              laborCost: laborCost.toFixed(4),
              overheadCost: overheadPerProduct.toFixed(4),
              totalUnitCost: totalUnitCost.toFixed(4),
              costLastCalculated: new Date(),
              updatedAt: new Date()
            })
            .where(eq(productRecipes.id, recipe.id));
          
          await db.update(factoryProducts)
            .set({
              basePrice: totalUnitCost.toFixed(2),
              suggestedPrice: suggestedPrice.toFixed(2),
              profitMargin: appliedMargin.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(factoryProducts.id, product.id));
          
          calculated++;
        } catch (e) {
          errors++;
        }
      }
      
      res.json({ message: `${calculated} ürün maliyeti hesaplandı, ${errors} hata`, calculated, errors });
    } catch (error) {
      console.error("Error calculating all costs:", error);
      res.status(500).json({ error: "Toplu maliyet hesaplaması başarısız" });
    }
  });
  
  // ========================================
  // MALİYET DASHBOARD
  // ========================================
  
  app.get("/api/cost-dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const productCount = await db.select({ count: sql<number>`count(*)` })
        .from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));
      
      const recipeCount = await db.select({ count: sql<number>`count(*)` })
        .from(productRecipes)
        .where(eq(productRecipes.isActive, true));
      
      const materialCount = await db.select({ count: sql<number>`count(*)` })
        .from(rawMaterials)
        .where(eq(rawMaterials.isActive, true));
      
      const fixedCosts = await db.select()
        .from(factoryFixedCosts)
        .where(eq(factoryFixedCosts.isActive, true));
      
      const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
      
      const calculations = await db.select()
        .from(productCostCalculations)
        .where(and(
          eq(productCostCalculations.periodMonth, currentMonth),
          eq(productCostCalculations.periodYear, currentYear)
        ));
      
      const avgProfit = calculations.length > 0
        ? calculations.reduce((sum, c) => sum + parseFloat(c.profitMarginPercentage || "0"), 0) / calculations.length
        : 0;
      
      res.json({
        productCount: productCount[0]?.count || 0,
        recipeCount: recipeCount[0]?.count || 0,
        materialCount: materialCount[0]?.count || 0,
        totalFixedCosts,
        avgProfitMargin: avgProfit,
        calculationsThisMonth: calculations.length
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Dashboard verileri alınamadı" });
    }
  });
  
  app.get("/api/cost-dashboard/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const products = await db.select({
        product: factoryProducts,
        recipe: productRecipes
      })
        .from(factoryProducts)
        .leftJoin(productRecipes, and(
          eq(productRecipes.productId, factoryProducts.id),
          eq(productRecipes.isActive, true)
        ))
        .where(eq(factoryProducts.isActive, true))
        .orderBy(factoryProducts.category, factoryProducts.name);
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products for dashboard:", error);
      res.status(500).json({ error: "Ürünler alınamadı" });
    }
  });
  
  // ========================================
  // ÜRÜN MALİYET DETAYI (Keyblend desteği ile)
  // ========================================
  
  app.get("/api/product-costs/:productId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const productId = parseInt(req.params.productId);
      const isAdmin = user?.role === 'admin' || user?.role === 'satinalma';
      
      const [product] = await db.select().from(factoryProducts).where(eq(factoryProducts.id, productId));
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }
      
      const [recipe] = await db.select()
        .from(productRecipes)
        .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));
      
      if (!recipe) {
        return res.json({
          product,
          recipe: null,
          ingredients: [],
          totalRawMaterialCost: 0,
          message: "Bu ürün için aktif reçete bulunamadı"
        });
      }
      
      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, recipe.id));
      
      let totalRawMaterialCost = 0;
      const isKeyblendRecipe = recipe.recipeType === "KEYBLEND";
      
      const processedIngredients = ingredients.map(ing => {
        const qty = parseFloat(ing.ingredient.quantity);
        const isKeyblendMaterial = ing.material?.isKeyblend || false;
        
        // Keyblend için keyblendCost kullan, normal malzeme için currentUnitPrice
        const unitPrice = isKeyblendMaterial 
          ? parseFloat(ing.material?.keyblendCost || "0")
          : parseFloat(ing.material?.currentUnitPrice || "0");
        
        const itemCost = qty * unitPrice;
        totalRawMaterialCost += itemCost;
        
        // Sadece KEYBLEND tipi reçetelerde TÜM malzemeler gizlenir (formülasyonu korumak için)
        // Normal (OPEN) reçetelerde tüm içerik görünür - KB malzemeleri dahil
        const shouldHide = !isAdmin && isKeyblendRecipe;
        
        if (shouldHide) {
          return {
            id: ing.ingredient.id,
            materialCode: isKeyblendMaterial ? "KB-***" : "GİZLİ",
            materialName: isKeyblendMaterial ? "Gizli Formülasyon" : "Gizli İçerik",
            quantity: "***",
            unit: ing.ingredient.unit,
            unitCost: "***",
            totalCost: itemCost.toFixed(2), // Maliyeti göster, formülasyonu gizle
            isKeyblend: isKeyblendMaterial,
            isHidden: true
          };
        }
        
        return {
          id: ing.ingredient.id,
          materialCode: ing.material?.code,
          materialName: ing.material?.name,
          quantity: qty.toFixed(4),
          unit: ing.ingredient.unit,
          unitCost: unitPrice.toFixed(4),
          totalCost: itemCost.toFixed(4),
          isKeyblend: isKeyblendMaterial,
          isHidden: false
        };
      });
      
      // Sabit gider payı hesapla
      const fixedCosts = await db.select()
        .from(factoryFixedCosts)
        .where(eq(factoryFixedCosts.isActive, true));
      
      const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
      
      const activeProducts = await db.select({ count: sql<number>`count(*)` })
        .from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));
      
      const overheadPerProduct = activeProducts[0]?.count > 0 
        ? totalFixedCosts / activeProducts[0].count 
        : 0;
      
      // Kar marjı al
      const [margin] = await db.select()
        .from(profitMarginTemplates)
        .where(eq(profitMarginTemplates.category, product.category));
      
      const appliedMargin = margin ? parseFloat(margin.defaultMargin) : 1.35;
      
      const workerCount = recipe.laborWorkerCount || 1;
      const productionMinutes = recipe.productionTimeMinutes || 0;
      const batchSize = recipe.laborBatchSize || 1;
      const hourlyRate = parseFloat(recipe.laborHourlyRate || "0");
      const laborCost = batchSize > 0 && hourlyRate > 0
        ? (workerCount * (productionMinutes / 60) * hourlyRate) / batchSize
        : 0;
      
      const totalUnitCost = totalRawMaterialCost + laborCost + overheadPerProduct;
      const suggestedPrice = totalUnitCost * appliedMargin;
      
      res.json({
        product,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          recipeType: recipe.recipeType,
          outputQuantity: recipe.outputQuantity,
          outputUnit: recipe.outputUnit,
          productionTimeMinutes: recipe.productionTimeMinutes,
          laborWorkerCount: recipe.laborWorkerCount,
          laborBatchSize: recipe.laborBatchSize,
          laborHourlyRate: recipe.laborHourlyRate
        },
        ingredients: processedIngredients,
        labor: {
          workerCount,
          productionMinutes,
          batchSize,
          hourlyRate,
          totalLaborCost: laborCost.toFixed(2),
          formula: `${workerCount} kişi x ${productionMinutes} dk x ₺${hourlyRate.toFixed(2)}/saat / ${batchSize} adet`
        },
        costs: {
          rawMaterialCost: totalRawMaterialCost.toFixed(2),
          laborCost: laborCost.toFixed(2),
          overheadCost: overheadPerProduct.toFixed(2),
          totalUnitCost: totalUnitCost.toFixed(2),
          profitMargin: ((appliedMargin - 1) * 100).toFixed(1) + "%",
          suggestedPrice: suggestedPrice.toFixed(2)
        }
      });
    } catch (error) {
      console.error("Error fetching product costs:", error);
      res.status(500).json({ error: "Ürün maliyeti alınamadı" });
    }
  });
  
  // ========================================
  // MAL KABUL → HAMMADDE FİYAT GÜNCELLEMESİ
  // ========================================
  
  app.post("/api/sync-prices-from-receipts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Sadece admin ve satınalma rolü bu işlemi yapabilir
      if (!['admin', 'satinalma', 'fabrika_mudur'].includes(user?.role)) {
        return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      }
      
      // Kabul edilen son mal kabul kalemlerinden fiyat güncelle
      // İlk önce inventory ile raw_materials eşleştirmesi yap
      const rawMaterialsList = await db.select().from(rawMaterials).where(eq(rawMaterials.isActive, true));
      
      let updated = 0;
      let errors = 0;
      
      for (const material of rawMaterialsList) {
        if (material.inventoryId) {
          try {
            // Bu hammaddenin stok kalemini bul ve son satınalma fiyatını al
            const [inv] = await db.select().from(inventory).where(eq(inventory.id, material.inventoryId));
            
            if (inv && inv.unitCost) {
              const newPrice = parseFloat(inv.unitCost);
              const oldPrice = parseFloat(material.currentUnitPrice || "0");
              
              if (newPrice !== oldPrice && newPrice > 0) {
                await db.update(rawMaterials)
                  .set({
                    lastPurchasePrice: material.currentUnitPrice || "0",
                    currentUnitPrice: newPrice.toFixed(4),
                    priceLastUpdated: new Date(),
                    updatedAt: new Date()
                  })
                  .where(eq(rawMaterials.id, material.id));
                updated++;
              }
            }
          } catch (e) {
            errors++;
          }
        }
      }
      
      // Reçete maliyetlerini güncelle
      const recipes = await db.select().from(productRecipes).where(eq(productRecipes.isActive, true));
      for (const recipe of recipes) {
        await updateRecipeCosts(recipe.id);
      }
      
      res.json({ 
        message: `${updated} hammadde fiyatı güncellendi, ${errors} hata`,
        updated,
        errors,
        recipesUpdated: recipes.length
      });
    } catch (error) {
      console.error("Error syncing prices from receipts:", error);
      res.status(500).json({ error: "Fiyat senkronizasyonu başarısız" });
    }
  });
  
  // Tek ürün maliyet hesapla
  app.post("/api/calculate-product-cost/:productId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const productId = parseInt(req.params.productId);
      
      const [product] = await db.select().from(factoryProducts).where(eq(factoryProducts.id, productId));
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }
      
      const [recipe] = await db.select()
        .from(productRecipes)
        .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));
      
      if (!recipe) {
        return res.status(400).json({ error: "Bu ürün için aktif reçete bulunamadı" });
      }
      
      // Reçete maliyetlerini güncelle
      await updateRecipeCosts(recipe.id);
      
      // Güncel reçete verilerini al
      const [updatedRecipe] = await db.select().from(productRecipes).where(eq(productRecipes.id, recipe.id));
      
      // Sabit gider payı
      const fixedCosts = await db.select()
        .from(factoryFixedCosts)
        .where(eq(factoryFixedCosts.isActive, true));
      
      const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
      
      const activeProducts = await db.select({ count: sql<number>`count(*)` })
        .from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));
      
      const overheadPerProduct = activeProducts[0]?.count > 0 
        ? totalFixedCosts / activeProducts[0].count 
        : 0;
      
      const rawMaterialCost = parseFloat(updatedRecipe?.rawMaterialCost || "0");
      const totalUnitCost = rawMaterialCost + overheadPerProduct;
      
      // Kar marjı
      const [margin] = await db.select()
        .from(profitMarginTemplates)
        .where(eq(profitMarginTemplates.category, product.category));
      
      const appliedMargin = margin ? parseFloat(margin.defaultMargin) : 1.35;
      const suggestedPrice = totalUnitCost * appliedMargin;
      
      // Ürünü güncelle
      await db.update(factoryProducts)
        .set({
          basePrice: totalUnitCost.toFixed(2),
          suggestedPrice: suggestedPrice.toFixed(2),
          profitMargin: appliedMargin.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(factoryProducts.id, productId));
      
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      // Maliyet kaydı
      await db.insert(productCostCalculations)
        .values({
          productId,
          recipeId: recipe.id,
          periodMonth: month,
          periodYear: year,
          rawMaterialCost: rawMaterialCost.toFixed(4),
          overheadCost: overheadPerProduct.toFixed(4),
          totalUnitCost: totalUnitCost.toFixed(4),
          appliedMargin: appliedMargin.toFixed(2),
          suggestedSellingPrice: suggestedPrice.toFixed(2),
          profitPerUnit: (suggestedPrice - totalUnitCost).toFixed(4),
          profitMarginPercentage: ((appliedMargin - 1) * 100).toFixed(2),
          calculatedById: user?.id
        })
        .onConflictDoUpdate({
          target: [productCostCalculations.productId, productCostCalculations.periodMonth, productCostCalculations.periodYear],
          set: {
            rawMaterialCost: rawMaterialCost.toFixed(4),
            overheadCost: overheadPerProduct.toFixed(4),
            totalUnitCost: totalUnitCost.toFixed(4),
            appliedMargin: appliedMargin.toFixed(2),
            suggestedSellingPrice: suggestedPrice.toFixed(2),
            profitPerUnit: (suggestedPrice - totalUnitCost).toFixed(4),
            profitMarginPercentage: ((appliedMargin - 1) * 100).toFixed(2),
            calculationDate: new Date()
          }
        });
      
      res.json({
        message: `${product.name} maliyeti hesaplandı`,
        costs: {
          rawMaterialCost: rawMaterialCost.toFixed(2),
          overheadCost: overheadPerProduct.toFixed(2),
          totalUnitCost: totalUnitCost.toFixed(2),
          profitMargin: ((appliedMargin - 1) * 100).toFixed(1) + "%",
          suggestedPrice: suggestedPrice.toFixed(2)
        }
      });
    } catch (error) {
      console.error("Error calculating product cost:", error);
      res.status(500).json({ error: "Maliyet hesaplaması başarısız" });
    }
  });
  
  // ========================================
  // YARDIMCI FONKSİYONLAR
  // ========================================
  
  async function updateRecipeCosts(recipeId: number) {
    try {
      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, recipeId));
      
      let totalCost = 0;
      for (const ing of ingredients) {
        const qty = parseFloat(ing.ingredient.quantity);
        
        // Keyblend malzemeleri için keyblendCost kullan
        const isKeyblend = ing.material?.isKeyblend || false;
        const price = isKeyblend 
          ? parseFloat(ing.material?.keyblendCost || "0")
          : parseFloat(ing.material?.currentUnitPrice || "0");
        
        const itemCost = qty * price;
        
        await db.update(productRecipeIngredients)
          .set({
            unitCost: price.toString(),
            totalCost: itemCost.toString()
          })
          .where(eq(productRecipeIngredients.id, ing.ingredient.id));
        
        totalCost += itemCost;
      }
      
      await db.update(productRecipes)
        .set({
          rawMaterialCost: totalCost.toString(),
          totalUnitCost: totalCost.toString(),
          costLastCalculated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(productRecipes.id, recipeId));
    } catch (error) {
      console.error("Error updating recipe costs:", error);
    }
  }

  // ========================================
  // ÜRETİM-STOK ENTEGRASYONU - Production-Stock Integration
  // ========================================

  // Üretim kaydı oluştur ve stok hareketlerini tetikle
  app.post("/api/production/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { productId, recipeId, producedQuantity, notes } = req.body;

      if (!productId || !recipeId || !producedQuantity || producedQuantity <= 0) {
        return res.status(400).json({ error: "Ürün, reçete ve üretim miktarı gerekli" });
      }

      // Reçeteyi ve malzemelerini al
      const [recipe] = await db.select().from(productRecipes).where(eq(productRecipes.id, recipeId));
      if (!recipe) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }

      const [product] = await db.select().from(factoryProducts).where(eq(factoryProducts.id, productId));
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, recipeId));

      // Üretim numarası oluştur
      const now = new Date();
      const productionNumber = `PR-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString(36).toUpperCase()}`;

      // Reçetenin çıktı miktarını al (1 reçete = outputQuantity adet ürün)
      const recipeOutputQty = parseFloat(recipe.outputQuantity || "1");
      const multiplier = producedQuantity / recipeOutputQty;

      // Stok yeterliliğini kontrol et
      const stockIssues: string[] = [];
      for (const ing of ingredients) {
        if (!ing.material?.inventoryId) continue;
        const requiredQty = parseFloat(ing.ingredient.quantity) * multiplier;
        const [invItem] = await db.select().from(inventory).where(eq(inventory.id, ing.material.inventoryId));
        if (invItem) {
          const currentStock = parseFloat(invItem.currentStock);
          if (currentStock < requiredQty) {
            stockIssues.push(`${ing.material.name}: Gereken ${requiredQty.toFixed(2)} ${ing.ingredient.unit}, Mevcut ${currentStock.toFixed(2)} ${invItem.unit}`);
          }
        }
      }

      if (stockIssues.length > 0) {
        return res.status(400).json({ 
          error: "Yetersiz stok", 
          details: stockIssues,
          message: `${stockIssues.length} hammaddede stok yetersiz` 
        });
      }

      // Üretim kaydını oluştur
      const [record] = await db.insert(productionRecords).values({
        productionNumber,
        productionDate: now,
        inventoryId: 0, // placeholder
        recipeId,
        plannedQuantity: producedQuantity.toString(),
        producedQuantity: producedQuantity.toString(),
        wasteQuantity: "0",
        unit: product.unit || "adet",
        status: "tamamlandi",
        ingredientsDeducted: true,
        productAddedToStock: true,
        notes: notes || `${product.name} - ${producedQuantity} ${product.unit} üretildi`,
        producedById: user?.id
      }).returning();

      // Hammaddeleri stoktan düş (uretim_cikis)
      const deductionResults: any[] = [];
      for (const ing of ingredients) {
        if (!ing.material?.inventoryId) continue;
        const requiredQty = parseFloat(ing.ingredient.quantity) * multiplier;

        const [invItem] = await db.select().from(inventory).where(eq(inventory.id, ing.material.inventoryId));
        if (!invItem) continue;

        const previousStock = parseFloat(invItem.currentStock);
        const newStock = previousStock - requiredQty;

        // Stok hareketi kaydet
        await db.insert(inventoryMovements).values({
          inventoryId: ing.material.inventoryId,
          movementType: "uretim_cikis",
          quantity: requiredQty.toString(),
          previousStock: previousStock.toString(),
          newStock: newStock.toString(),
          referenceType: "production",
          referenceId: record.id,
          notes: `${product.name} üretimi - ${productionNumber}`,
          createdById: user?.id
        });

        // Stok güncelle
        await db.update(inventory)
          .set({ currentStock: newStock.toString(), updatedAt: new Date() })
          .where(eq(inventory.id, ing.material.inventoryId));

        // Üretim hammadde kullanımı kaydet
        await db.insert(productionIngredients).values({
          productionRecordId: record.id,
          inventoryId: ing.material.inventoryId,
          plannedQuantity: requiredQty.toString(),
          usedQuantity: requiredQty.toString(),
          unit: ing.ingredient.unit,
          deductedFromStock: true
        });

        deductionResults.push({
          materialName: ing.material.name,
          materialCode: ing.material.code,
          usedQuantity: requiredQty.toFixed(4),
          unit: ing.ingredient.unit,
          previousStock: previousStock.toFixed(2),
          newStock: newStock.toFixed(2),
          inventoryId: ing.material.inventoryId
        });

        // Minimum stok kontrolü - uyarı oluştur
        const minStock = parseFloat(invItem.minimumStock || "0");
        if (newStock <= minStock && minStock > 0 && user?.id) {
          await db.insert(notifications).values({
            userId: user.id,
            title: "Düşük Stok Uyarısı",
            message: `${ing.material.name} stoğu minimum seviyenin altına düştü! Mevcut: ${newStock.toFixed(2)} ${invItem.unit}, Minimum: ${minStock.toFixed(2)} ${invItem.unit}`,
            type: "warning",
            isRead: false,
            link: "/satinalma?tab=stok-yonetimi"
          });
        }
      }

      // Bitmiş ürünü stoğa ekle - inventory'de bu ürün varsa
      // factoryProducts -> inventory bağlantısını code/sku üzerinden yap
      const [finishedProductInv] = await db.select()
        .from(inventory)
        .where(and(
          or(
            eq(inventory.code, product.sku),
            eq(inventory.name, product.name)
          ),
          eq(inventory.isActive, true)
        ));

      let productStockResult = null;
      if (finishedProductInv) {
        const prevStock = parseFloat(finishedProductInv.currentStock);
        const newProductStock = prevStock + producedQuantity;

        await db.insert(inventoryMovements).values({
          inventoryId: finishedProductInv.id,
          movementType: "uretim_giris",
          quantity: producedQuantity.toString(),
          previousStock: prevStock.toString(),
          newStock: newProductStock.toString(),
          referenceType: "production",
          referenceId: record.id,
          notes: `${product.name} üretimden giriş - ${productionNumber}`,
          createdById: user?.id
        });

        await db.update(inventory)
          .set({ currentStock: newProductStock.toString(), updatedAt: new Date() })
          .where(eq(inventory.id, finishedProductInv.id));

        productStockResult = {
          inventoryId: finishedProductInv.id,
          productName: product.name,
          addedQuantity: producedQuantity,
          previousStock: prevStock.toFixed(2),
          newStock: newProductStock.toFixed(2)
        };
      }

      res.json({
        success: true,
        productionRecord: record,
        productionNumber,
        producedProduct: product.name,
        producedQuantity,
        ingredientsDeducted: deductionResults,
        productAddedToStock: productStockResult,
        message: `${product.name} - ${producedQuantity} ${product.unit} üretim tamamlandı. ${deductionResults.length} hammadde stoktan düşüldü.`
      });
    } catch (error) {
      console.error("Error completing production:", error);
      res.status(500).json({ error: "Üretim tamamlanamadı" });
    }
  });

  // Üretim geçmişi listesi
  app.get("/api/production/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { limit: limitStr, status } = req.query;
      const queryLimit = parseInt(limitStr as string) || 50;
      
      let conditions: any[] = [];
      if (status) {
        conditions.push(eq(productionRecords.status, status as string));
      }
      
      const records = conditions.length > 0
        ? await db.select().from(productionRecords)
            .where(and(...conditions))
            .orderBy(desc(productionRecords.productionDate))
            .limit(queryLimit)
        : await db.select().from(productionRecords)
            .orderBy(desc(productionRecords.productionDate))
            .limit(queryLimit);
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching production history:", error);
      res.status(500).json({ error: "Üretim geçmişi alınamadı" });
    }
  });

  // Üretim detayı (hammadde kullanımlarıyla)
  app.get("/api/production/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [record] = await db.select().from(productionRecords).where(eq(productionRecords.id, id));
      if (!record) {
        return res.status(404).json({ error: "Üretim kaydı bulunamadı" });
      }

      const ingredientUsage = await db.select({
        usage: productionIngredients,
        inv: inventory
      })
        .from(productionIngredients)
        .leftJoin(inventory, eq(productionIngredients.inventoryId, inventory.id))
        .where(eq(productionIngredients.productionRecordId, id));

      res.json({ record, ingredients: ingredientUsage });
    } catch (error) {
      console.error("Error fetching production detail:", error);
      res.status(500).json({ error: "Üretim detayı alınamadı" });
    }
  });

  // Üretim öncesi stok kontrol - simülasyon
  app.post("/api/production/check-stock", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipeId, quantity } = req.body;

      const [recipe] = await db.select().from(productRecipes).where(eq(productRecipes.id, recipeId));
      if (!recipe) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }

      const ingredients = await db.select({
        ingredient: productRecipeIngredients,
        material: rawMaterials
      })
        .from(productRecipeIngredients)
        .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productRecipeIngredients.recipeId, recipeId));

      const recipeOutputQty = parseFloat(recipe.outputQuantity || "1");
      const multiplier = quantity / recipeOutputQty;

      const stockCheck = [];
      let allSufficient = true;

      for (const ing of ingredients) {
        const requiredQty = parseFloat(ing.ingredient.quantity) * multiplier;
        let currentStock = 0;
        let unit = ing.ingredient.unit;
        let linked = false;

        if (ing.material?.inventoryId) {
          const [invItem] = await db.select().from(inventory).where(eq(inventory.id, ing.material.inventoryId));
          if (invItem) {
            currentStock = parseFloat(invItem.currentStock);
            unit = invItem.unit;
            linked = true;
          }
        }

        const sufficient = !linked || currentStock >= requiredQty;
        if (!sufficient) allSufficient = false;

        stockCheck.push({
          materialName: ing.material?.name || "Bilinmeyen",
          materialCode: ing.material?.code || "-",
          requiredQuantity: requiredQty.toFixed(4),
          currentStock: linked ? currentStock.toFixed(2) : "Bağlantısız",
          unit,
          sufficient,
          linked,
          deficit: !sufficient ? (requiredQty - currentStock).toFixed(4) : "0"
        });
      }

      res.json({ 
        allSufficient, 
        items: stockCheck,
        recipeName: recipe.name,
        quantity
      });
    } catch (error) {
      console.error("Error checking stock:", error);
      res.status(500).json({ error: "Stok kontrol edilemedi" });
    }
  });

  // Tüm stok hareketleri (üretim filtreli)
  app.get("/api/production/stock-movements", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type, limit: limitStr } = req.query;
      const queryLimit = parseInt(limitStr as string) || 100;

      let conditions: any[] = [];
      if (type === "production") {
        conditions.push(or(
          eq(inventoryMovements.movementType, "uretim_giris"),
          eq(inventoryMovements.movementType, "uretim_cikis")
        ));
      } else if (type) {
        conditions.push(eq(inventoryMovements.movementType, type as string));
      }

      const movements = await db.select({
        movement: inventoryMovements,
        inv: inventory
      })
        .from(inventoryMovements)
        .leftJoin(inventory, eq(inventoryMovements.inventoryId, inventory.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(queryLimit);

      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ error: "Stok hareketleri alınamadı" });
    }
  });

  // Hammadde-Stok bağlantı durumu
  app.get("/api/production/material-stock-links", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const materials = await db.select({
        material: rawMaterials,
        inv: inventory
      })
        .from(rawMaterials)
        .leftJoin(inventory, eq(rawMaterials.inventoryId, inventory.id))
        .where(eq(rawMaterials.isActive, true))
        .orderBy(rawMaterials.name);

      const result = materials.map(m => ({
        materialId: m.material.id,
        materialCode: m.material.code,
        materialName: m.material.name,
        materialUnit: m.material.unit,
        linked: !!m.material.inventoryId,
        inventoryId: m.material.inventoryId,
        inventoryCode: m.inv?.code || null,
        inventoryName: m.inv?.name || null,
        currentStock: m.inv ? parseFloat(m.inv.currentStock) : null,
        minimumStock: m.inv ? parseFloat(m.inv.minimumStock) : null,
        stockUnit: m.inv?.unit || null
      }));

      const linked = result.filter(r => r.linked).length;
      const unlinked = result.filter(r => !r.linked).length;

      res.json({ materials: result, summary: { total: result.length, linked, unlinked } });
    } catch (error) {
      console.error("Error fetching material-stock links:", error);
      res.status(500).json({ error: "Bağlantı durumu alınamadı" });
    }
  });

  // Hammaddeyi stok kalemine bağla
  app.post("/api/production/link-material", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { rawMaterialId, inventoryId } = req.body;
      
      if (!rawMaterialId || !inventoryId) {
        return res.status(400).json({ error: "Hammadde ve stok kalemi ID gerekli" });
      }

      await db.update(rawMaterials)
        .set({ inventoryId, updatedAt: new Date() })
        .where(eq(rawMaterials.id, rawMaterialId));

      res.json({ success: true, message: "Hammadde stok kalemine bağlandı" });
    } catch (error) {
      console.error("Error linking material:", error);
      res.status(500).json({ error: "Bağlantı kurulamadı" });
    }
  });

  // AI Üretim Analiz & Tahmin
  app.get("/api/production/ai-insights", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Son 30 günlük üretim verileri
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentProductions = await db.select()
        .from(productionRecords)
        .where(gte(productionRecords.productionDate, thirtyDaysAgo))
        .orderBy(desc(productionRecords.productionDate));

      // Stok seviyeleri
      const allInventory = await db.select()
        .from(inventory)
        .where(eq(inventory.isActive, true));

      // Hammadde bağlantılı stoklar
      const linkedMaterials = await db.select({
        material: rawMaterials,
        inv: inventory
      })
        .from(rawMaterials)
        .leftJoin(inventory, eq(rawMaterials.inventoryId, inventory.id))
        .where(and(
          eq(rawMaterials.isActive, true),
          isNotNull(rawMaterials.inventoryId)
        ));

      // Son üretim hareketleri
      const recentMovements = await db.select({
        movement: inventoryMovements,
        inv: inventory
      })
        .from(inventoryMovements)
        .leftJoin(inventory, eq(inventoryMovements.inventoryId, inventory.id))
        .where(and(
          gte(inventoryMovements.createdAt, thirtyDaysAgo),
          or(
            eq(inventoryMovements.movementType, "uretim_cikis"),
            eq(inventoryMovements.movementType, "uretim_giris")
          )
        ))
        .orderBy(desc(inventoryMovements.createdAt));

      // Analiz verileri hesapla
      const lowStockItems = allInventory.filter(item => {
        const current = parseFloat(item.currentStock);
        const min = parseFloat(item.minimumStock || "0");
        return min > 0 && current <= min * 1.2;
      });

      const totalProductions = recentProductions.length;
      const totalWaste = recentProductions.reduce((sum, r) => sum + parseFloat(r.wasteQuantity || "0"), 0);
      const totalProduced = recentProductions.reduce((sum, r) => sum + parseFloat(r.producedQuantity || "0"), 0);
      const wasteRate = totalProduced > 0 ? (totalWaste / totalProduced * 100) : 0;

      // Günlük tüketim ortalaması
      const dailyConsumption: Record<string, { name: string; totalUsed: number; days: number }> = {};
      for (const mv of recentMovements) {
        if (mv.movement.movementType === "uretim_cikis" && mv.inv) {
          const key = mv.inv.id.toString();
          if (!dailyConsumption[key]) {
            dailyConsumption[key] = { name: mv.inv.name, totalUsed: 0, days: 0 };
          }
          dailyConsumption[key].totalUsed += parseFloat(mv.movement.quantity);
        }
      }
      
      const daysInPeriod = Math.max(1, Math.ceil((Date.now() - thirtyDaysAgo.getTime()) / 86400000));
      
      const consumptionForecasts = linkedMaterials.map(lm => {
        const key = lm.material.inventoryId?.toString() || "";
        const consumption = dailyConsumption[key];
        const dailyAvg = consumption ? consumption.totalUsed / daysInPeriod : 0;
        const currentStock = lm.inv ? parseFloat(lm.inv.currentStock) : 0;
        const daysRemaining = dailyAvg > 0 ? Math.floor(currentStock / dailyAvg) : 999;
        const minimumStock = lm.inv ? parseFloat(lm.inv.minimumStock || "0") : 0;
        
        return {
          materialName: lm.material.name,
          materialCode: lm.material.code,
          currentStock: currentStock.toFixed(2),
          minimumStock: minimumStock.toFixed(2),
          unit: lm.inv?.unit || lm.material.unit,
          dailyConsumption: dailyAvg.toFixed(4),
          daysRemaining,
          suggestedOrderQuantity: dailyAvg > 0 ? (dailyAvg * 14).toFixed(2) : "0",
          urgency: daysRemaining <= 3 ? "critical" : daysRemaining <= 7 ? "warning" : daysRemaining <= 14 ? "info" : "ok"
        };
      }).filter(f => parseFloat(f.dailyConsumption) > 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      res.json({
        summary: {
          totalProductions,
          totalProduced: totalProduced.toFixed(2),
          totalWaste: totalWaste.toFixed(2),
          wasteRate: wasteRate.toFixed(2),
          lowStockCount: lowStockItems.length,
          linkedMaterialCount: linkedMaterials.length,
          periodDays: daysInPeriod
        },
        lowStockAlerts: lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          currentStock: parseFloat(item.currentStock).toFixed(2),
          minimumStock: parseFloat(item.minimumStock || "0").toFixed(2),
          unit: item.unit
        })),
        consumptionForecasts,
        recommendations: generateRecommendations(consumptionForecasts, wasteRate, lowStockItems.length)
      });
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ error: "AI analiz oluşturulamadı" });
    }
  });
}

function generateRecommendations(
  forecasts: any[], 
  wasteRate: number, 
  lowStockCount: number
): string[] {
  const recommendations: string[] = [];

  const criticalItems = forecasts.filter(f => f.urgency === "critical");
  if (criticalItems.length > 0) {
    recommendations.push(`ACİL: ${criticalItems.map(i => i.materialName).join(", ")} stoğu 3 gün içinde tükenecek. Hemen sipariş verin.`);
  }

  const warningItems = forecasts.filter(f => f.urgency === "warning");
  if (warningItems.length > 0) {
    recommendations.push(`UYARI: ${warningItems.map(i => i.materialName).join(", ")} stoğu 7 gün içinde tükenebilir. Sipariş planlamanızı yapın.`);
  }

  if (wasteRate > 5) {
    recommendations.push(`Fire oranı %${wasteRate.toFixed(1)} ile yüksek. Üretim süreçlerini gözden geçirin ve kayıp nedenlerini analiz edin.`);
  } else if (wasteRate > 0 && wasteRate <= 2) {
    recommendations.push(`Fire oranı %${wasteRate.toFixed(1)} - mükemmel seviyede. Bu performansı korumaya devam edin.`);
  }

  if (lowStockCount > 5) {
    recommendations.push(`${lowStockCount} üründe stok minimum seviyenin altında. Toplu sipariş vermeyi düşünün.`);
  }

  if (forecasts.length > 0) {
    const topConsumer = forecasts[0];
    if (topConsumer.daysRemaining < 14) {
      recommendations.push(`${topConsumer.materialName} için 2 haftalık önerilen sipariş miktarı: ${topConsumer.suggestedOrderQuantity} ${topConsumer.unit}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Tüm stok seviyeleri yeterli görünüyor. Üretim planınıza devam edebilirsiniz.");
  }

  return recommendations;
}
