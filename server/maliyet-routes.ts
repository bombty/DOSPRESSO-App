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
  purchaseOrderItems,
  purchaseOrders,
  insertRawMaterialSchema,
  insertProductRecipeSchema,
  insertProductRecipeIngredientSchema,
  insertFactoryFixedCostSchema,
  insertProfitMarginTemplateSchema,
  insertProductCostCalculationSchema
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, asc } from "drizzle-orm";

type AuthMiddleware = (req: Request, res: Response, next: () => void) => void;

export function registerMaliyetRoutes(app: Express, isAuthenticated: AuthMiddleware) {
  
  // ========================================
  // HAMMADDE YÖNETİMİ - Raw Materials
  // ========================================
  
  app.get("/api/raw-materials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category, search, active } = req.query;
      
      let conditions: any[] = [];
      
      if (active === "true") {
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
      
      if (active === "true") {
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
      await db.delete(factoryFixedCosts).where(eq(factoryFixedCosts.id, parseInt(id)));
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
          
          const fixedCostSummary = await db.select()
            .from(factoryFixedCosts)
            .where(eq(factoryFixedCosts.isActive, true));
          
          const totalFixedCosts = fixedCostSummary.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
          const overheadPerProduct = products.length > 0 ? totalFixedCosts / products.length : 0;
          const totalUnitCost = rawMaterialCost + overheadPerProduct;
          
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
              overheadCost: overheadPerProduct.toFixed(4),
              totalUnitCost: totalUnitCost.toFixed(4),
              appliedMargin: appliedMargin.toFixed(2),
              suggestedSellingPrice: suggestedPrice.toFixed(2),
              profitPerUnit: (suggestedPrice - totalUnitCost).toFixed(4),
              profitMarginPercentage: ((appliedMargin - 1) * 100).toFixed(2),
              calculatedById: user?.id
            });
          
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
        const price = parseFloat(ing.material?.currentUnitPrice || "0");
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
}
