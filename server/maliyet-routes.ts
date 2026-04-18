import type { Express, Request, Response } from "express";
import { db } from "./db";
import aiClient from "./services/ai-client";
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
  productPackagingItems,
  factoryCostSettings,
  rawMaterialPriceHistory,
  suppliers,
  factoryMachines,
  machineProducts,
  insertRawMaterialSchema,
  insertProductRecipeSchema,
  insertProductRecipeIngredientSchema,
  insertFactoryFixedCostSchema,
  insertProfitMarginTemplateSchema,
  insertProductCostCalculationSchema,
  insertProductPackagingItemSchema,
  insertFactoryMachineSchema,
  factoryProductionBatches,
  factoryWasteReasons,
  factoryProductPriceHistory
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, asc, isNotNull, inArray } from "drizzle-orm";


type AuthMiddleware = (req: Request, res: Response, next: () => void) => void;

// Fabrika ürün fiyat değişiklik geçmişine kayıt ekler.
// Eski/yeni basePrice veya suggestedPrice değişmişse history tablosuna yazar.
export async function logFactoryProductPriceChange(params: {
  productId: number;
  oldBasePrice: string | number | null | undefined;
  newBasePrice: string | number | null | undefined;
  oldSuggestedPrice: string | number | null | undefined;
  newSuggestedPrice: string | number | null | undefined;
  source: string;
  sourceReferenceId?: number | null;
  changedById?: string | null;
  notes?: string | null;
}) {
  const oldBase = params.oldBasePrice == null ? null : Number(params.oldBasePrice);
  const newBase = params.newBasePrice == null ? null : Number(params.newBasePrice);
  const oldSug = params.oldSuggestedPrice == null ? null : Number(params.oldSuggestedPrice);
  const newSug = params.newSuggestedPrice == null ? null : Number(params.newSuggestedPrice);

  const baseChanged = (oldBase ?? 0) !== (newBase ?? 0);
  const sugChanged = (oldSug ?? 0) !== (newSug ?? 0);
  if (!baseChanged && !sugChanged) return;

  let changePercent: string | null = null;
  if (oldBase != null && oldBase > 0 && newBase != null) {
    changePercent = (((newBase - oldBase) / oldBase) * 100).toFixed(2);
  } else if (oldSug != null && oldSug > 0 && newSug != null) {
    changePercent = (((newSug - oldSug) / oldSug) * 100).toFixed(2);
  }

  // Audit-critical: bir hata olursa propagate edilir, sessizce yutulmaz.
  // Çağıran route hatayı logger ile yakalayıp uygun HTTP yanıtına çevirir.
  await db.insert(factoryProductPriceHistory).values({
    productId: params.productId,
    oldBasePrice: oldBase != null ? oldBase.toFixed(2) : null,
    newBasePrice: newBase != null ? newBase.toFixed(2) : null,
    oldSuggestedPrice: oldSug != null ? oldSug.toFixed(2) : null,
    newSuggestedPrice: newSug != null ? newSug.toFixed(2) : null,
    changePercent,
    source: params.source,
    sourceReferenceId: params.sourceReferenceId ?? null,
    notes: params.notes ?? null,
    changedById: params.changedById ?? null,
  });
}

// Faaliyet Tabanlı Maliyet Hesaplama Yardımcı Fonksiyonları
async function getCostSettings(): Promise<Record<string, number>> {
  const settings = await db.select().from(factoryCostSettings);
  const result: Record<string, number> = {};
  for (const s of settings) {
    result[s.settingKey] = parseFloat(s.settingValue);
  }
  return result;
}

async function calculateAutoHourlyRate(): Promise<number> {
  const settings = await getCostSettings();
  const totalWorkers = settings['total_factory_workers'] || 10;
  const monthlyHours = settings['monthly_work_hours'] || 180;
  
  const personnelCosts = await db.select()
    .from(factoryFixedCosts)
    .where(and(
      eq(factoryFixedCosts.category, "personel"),
      eq(factoryFixedCosts.isActive, true)
    ));
  
  const totalPersonnelCost = personnelCosts.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
  if (totalWorkers <= 0 || monthlyHours <= 0) return 0;
  return totalPersonnelCost / totalWorkers / monthlyHours;
}

async function calculateEnergyCost(kwhPerBatch: number, batchSize: number): Promise<number> {
  const settings = await getCostSettings();
  const kwhPrice = settings['kwh_unit_price'] || 4.5;
  if (batchSize <= 0) return 0;
  return (kwhPerBatch * kwhPrice) / batchSize;
}

async function calculatePackagingCost(productId: number): Promise<number> {
  const items = await db.select().from(productPackagingItems)
    .where(eq(productPackagingItems.productId, productId));
  return items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || "1") * parseFloat(item.unitCost));
  }, 0);
}

async function calculateOverheadPerUnit(productionMinutes: number, batchSize: number): Promise<number> {
  const overheadCategories = ["kira", "su", "sigorta", "temizlik", "guvenlik", "iletisim", "vergi", "diger", "amortisman", "bakim_onarim", "dogalgaz"];
  
  const overheadCosts = await db.select()
    .from(factoryFixedCosts)
    .where(and(
      eq(factoryFixedCosts.isActive, true),
      inArray(factoryFixedCosts.category, overheadCategories)
    ));
  
  const totalMonthlyOverhead = overheadCosts.reduce((sum, c) => sum + parseFloat(c.monthlyAmount), 0);
  
  const settings = await getCostSettings();
  const totalWorkers = settings['total_factory_workers'] || 10;
  const monthlyHours = settings['monthly_work_hours'] || 180;
  const totalMonthlyMinutes = totalWorkers * monthlyHours * 60;
  
  if (totalMonthlyMinutes <= 0 || batchSize <= 0) return 0;
  const costPerMinute = totalMonthlyOverhead / totalMonthlyMinutes;
  return (costPerMinute * productionMinutes) / batchSize;
}

async function calculateActivityBasedCost(recipe: any, product: any) {
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
    const isKeyblend = ing.material?.isKeyblend || false;
    const price = isKeyblend 
      ? parseFloat(ing.material?.keyblendCost || "0")
      : parseFloat(ing.material?.currentUnitPrice || "0");
    rawMaterialCost += qty * price;
  }

  const workerCount = recipe.laborWorkerCount || 1;
  const productionMinutes = recipe.productionTimeMinutes || 0;
  const batchSize = recipe.laborBatchSize || 1;
  
  const avgHourlyRate = await calculateAutoHourlyRate();
  const manualRate = parseFloat(recipe.laborHourlyRate || "0");
  const hourlyRate = manualRate > 0 ? manualRate : avgHourlyRate;
  
  const laborCost = batchSize > 0 && hourlyRate > 0
    ? (workerCount * (productionMinutes / 60) * hourlyRate) / batchSize
    : 0;

  const kwhPerBatch = parseFloat(recipe.energyKwhPerBatch || "0");
  const energyCost = await calculateEnergyCost(kwhPerBatch, batchSize);

  const packagingCost = await calculatePackagingCost(product.id);

  const overheadCost = await calculateOverheadPerUnit(productionMinutes * workerCount, batchSize);

  const totalUnitCost = rawMaterialCost + laborCost + energyCost + packagingCost + overheadCost;

  const [marginTemplate] = await db.select()
    .from(profitMarginTemplates)
    .where(eq(profitMarginTemplates.category, product.category))
    .limit(1);
  
  const appliedMargin = marginTemplate ? parseFloat(marginTemplate.defaultMargin) : 1.20;
  const suggestedPrice = totalUnitCost * appliedMargin;

  return {
    rawMaterialCost,
    laborCost,
    energyCost,
    packagingCost,
    overheadCost,
    totalUnitCost,
    appliedMargin,
    suggestedPrice,
    hourlyRate,
    workerCount,
    productionMinutes,
    batchSize,
    kwhPerBatch
  };
}

export function registerMaliyetRoutes(app: Express, isAuthenticated: AuthMiddleware) {
  
  // ========================================
  // MALİYET AYARLARI - Cost Settings
  // ========================================
  
  app.get("/api/cost-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(factoryCostSettings).orderBy(factoryCostSettings.settingKey);
      const autoHourlyRate = await calculateAutoHourlyRate();
      res.json({ settings, autoHourlyRate: autoHourlyRate.toFixed(2) });
    } catch (error) {
      console.error("Error fetching cost settings:", error);
      res.status(500).json({ error: "Ayarlar alınamadı" });
    }
  });

  app.put("/api/cost-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;
      for (const s of settings) {
        await db.update(factoryCostSettings)
          .set({ settingValue: s.value.toString(), updatedAt: new Date() })
          .where(eq(factoryCostSettings.settingKey, s.key));
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating cost settings:", error);
      res.status(500).json({ error: "Ayarlar güncellenemedi" });
    }
  });

  // ========================================
  // AMBALAJ MALZEMELERİ - Packaging Items
  // ========================================

  app.get("/api/packaging-items/:productId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await db.select().from(productPackagingItems)
        .where(eq(productPackagingItems.productId, parseInt(req.params.productId)));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Ambalaj malzemeleri alınamadı" });
    }
  });

  app.post("/api/packaging-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parseResult = insertProductPackagingItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      const [item] = await db.insert(productPackagingItems).values(parseResult.data).returning();
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Ambalaj malzemesi eklenemedi" });
    }
  });

  app.delete("/api/packaging-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await db.delete(productPackagingItems).where(eq(productPackagingItems.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Ambalaj malzemesi silinemedi" });
    }
  });

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
      const user = (req as any).user;
      const materialId = parseInt(id);
      const parseResult = insertRawMaterialSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      
      const [existing] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, materialId));
      
      const [updated] = await db.update(rawMaterials)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(rawMaterials.id, materialId))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Hammadde bulunamadı" });
      }
      
      if (existing && parseResult.data.currentUnitPrice !== undefined) {
        const oldPrice = parseFloat(existing.currentUnitPrice || "0");
        const newPrice = parseFloat(parseResult.data.currentUnitPrice || "0");
        if (oldPrice !== newPrice) {
          const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;
          await db.insert(rawMaterialPriceHistory).values({
            rawMaterialId: materialId,
            supplierId: updated.supplierId,
            previousPrice: existing.currentUnitPrice || "0",
            newPrice: newPrice.toFixed(4),
            changePercent: changePercent.toFixed(2),
            source: "manual",
            changedBy: user?.username || user?.id || "system",
          });
        }
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
      const user = (req as any).user;
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
            const oldPrice = parseFloat(material.currentUnitPrice || "0");
            const newPrice = parseFloat(lastOrder[0].unitPrice || "0");
            
            if (oldPrice !== newPrice && newPrice > 0) {
              const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;
              await db.insert(rawMaterialPriceHistory).values({
                rawMaterialId: material.id,
                supplierId: material.supplierId,
                previousPrice: material.currentUnitPrice || "0",
                newPrice: newPrice.toFixed(4),
                changePercent: changePercent.toFixed(2),
                source: "sync_purchase",
                changedBy: user?.username || user?.id || "system",
              });
            }
            
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
  // HAMMADDE FİYAT GEÇMİŞİ - Raw Material Price History
  // ========================================
  
  app.get("/api/raw-materials/:id/price-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const materialId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const [material] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, materialId));
      if (!material) {
        return res.status(404).json({ error: "Hammadde bulunamadı" });
      }
      
      let supplier = null;
      if (material.supplierId) {
        const [s] = await db.select().from(suppliers).where(eq(suppliers.id, material.supplierId));
        supplier = s || null;
      }
      
      const history = await db.select({
        priceHistory: rawMaterialPriceHistory,
        supplierName: suppliers.name,
      })
        .from(rawMaterialPriceHistory)
        .leftJoin(suppliers, eq(rawMaterialPriceHistory.supplierId, suppliers.id))
        .where(eq(rawMaterialPriceHistory.rawMaterialId, materialId))
        .orderBy(desc(rawMaterialPriceHistory.createdAt))
        .limit(limit);
      
      res.json({
        material,
        supplier,
        history: history.map(h => ({
          ...h.priceHistory,
          supplierName: h.supplierName,
        })),
      });
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ error: "Fiyat geçmişi alınamadı" });
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
  
  app.patch("/api/recipes/:recipeId/ingredients/:ingredientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role;
      if (userRole !== 'admin' && userRole !== 'fabrika_mudur') {
        return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      }
      const { recipeId, ingredientId } = req.params;
      const { quantity, unit } = req.body;
      
      const [existing] = await db.select().from(productRecipeIngredients)
        .where(eq(productRecipeIngredients.id, parseInt(ingredientId)));
      if (!existing) {
        return res.status(404).json({ error: "Malzeme bulunamadı" });
      }
      
      const [material] = await db.select().from(rawMaterials)
        .where(eq(rawMaterials.id, existing.rawMaterialId));
      
      const unitCost = parseFloat(material?.currentUnitPrice || existing.unitCost || "0");
      const newQuantity = quantity || existing.quantity;
      const totalCost = unitCost * parseFloat(newQuantity);
      
      const [updated] = await db.update(productRecipeIngredients)
        .set({
          quantity: newQuantity,
          unit: unit || existing.unit,
          unitCost: unitCost.toString(),
          totalCost: totalCost.toString(),
        })
        .where(eq(productRecipeIngredients.id, parseInt(ingredientId)))
        .returning();
      
      await updateRecipeCosts(parseInt(recipeId));
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating ingredient:", error);
      res.status(500).json({ error: "Malzeme güncellenemedi" });
    }
  });

  app.delete("/api/recipes/:recipeId/ingredients/:ingredientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role;
      if (userRole !== 'admin' && userRole !== 'fabrika_mudur') {
        return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      }
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
      
      const [product] = await db.select().from(factoryProducts).where(eq(factoryProducts.id, productId));
      if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

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
      
      const costs = await calculateActivityBasedCost(recipe, product);
      
      const [calculation] = await db.insert(productCostCalculations)
        .values({
          productId,
          recipeId: recipe.id,
          periodMonth: month || new Date().getMonth() + 1,
          periodYear: year || new Date().getFullYear(),
          rawMaterialCost: costs.rawMaterialCost.toFixed(4),
          directLaborCost: costs.laborCost.toFixed(4),
          energyCost: costs.energyCost.toFixed(4),
          packagingCost: costs.packagingCost.toFixed(4),
          overheadCost: costs.overheadCost.toFixed(4),
          totalUnitCost: costs.totalUnitCost.toFixed(4),
          appliedMargin: costs.appliedMargin.toFixed(2),
          suggestedSellingPrice: costs.suggestedPrice.toFixed(2),
          profitPerUnit: (costs.suggestedPrice - costs.totalUnitCost).toFixed(4),
          profitMarginPercentage: ((costs.appliedMargin - 1) * 100).toFixed(2),
          calculatedById: user?.id
        })
        .returning();
      
      await db.update(productRecipes)
        .set({
          rawMaterialCost: costs.rawMaterialCost.toFixed(4),
          laborCost: costs.laborCost.toFixed(4),
          energyCost: costs.energyCost.toFixed(4),
          packagingCost: costs.packagingCost.toFixed(4),
          overheadCost: costs.overheadCost.toFixed(4),
          totalUnitCost: costs.totalUnitCost.toFixed(4),
          costLastCalculated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(productRecipes.id, recipe.id));

      const newBasePrice = costs.totalUnitCost.toFixed(2);
      const newSuggestedPrice = costs.suggestedPrice.toFixed(2);

      await db.update(factoryProducts)
        .set({
          basePrice: newBasePrice,
          suggestedPrice: newSuggestedPrice,
          profitMargin: costs.appliedMargin.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(factoryProducts.id, productId));

      await logFactoryProductPriceChange({
        productId,
        oldBasePrice: product.basePrice,
        newBasePrice,
        oldSuggestedPrice: product.suggestedPrice,
        newSuggestedPrice,
        source: "cost_calc",
        sourceReferenceId: calculation?.id ?? null,
        changedById: user?.id,
      });

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
          
          const costs = await calculateActivityBasedCost(recipe, product);
          
          await db.insert(productCostCalculations)
            .values({
              productId: product.id,
              recipeId: recipe.id,
              periodMonth: month,
              periodYear: year,
              rawMaterialCost: costs.rawMaterialCost.toFixed(4),
              directLaborCost: costs.laborCost.toFixed(4),
              energyCost: costs.energyCost.toFixed(4),
              packagingCost: costs.packagingCost.toFixed(4),
              overheadCost: costs.overheadCost.toFixed(4),
              totalUnitCost: costs.totalUnitCost.toFixed(4),
              appliedMargin: costs.appliedMargin.toFixed(2),
              suggestedSellingPrice: costs.suggestedPrice.toFixed(2),
              profitPerUnit: (costs.suggestedPrice - costs.totalUnitCost).toFixed(4),
              profitMarginPercentage: ((costs.appliedMargin - 1) * 100).toFixed(2),
              calculatedById: user?.id
            });
          
          await db.update(productRecipes)
            .set({
              rawMaterialCost: costs.rawMaterialCost.toFixed(4),
              laborCost: costs.laborCost.toFixed(4),
              energyCost: costs.energyCost.toFixed(4),
              packagingCost: costs.packagingCost.toFixed(4),
              overheadCost: costs.overheadCost.toFixed(4),
              totalUnitCost: costs.totalUnitCost.toFixed(4),
              costLastCalculated: new Date(),
              updatedAt: new Date()
            })
            .where(eq(productRecipes.id, recipe.id));
          
          const newBasePrice = costs.totalUnitCost.toFixed(2);
          const newSuggestedPrice = costs.suggestedPrice.toFixed(2);

          await db.update(factoryProducts)
            .set({
              basePrice: newBasePrice,
              suggestedPrice: newSuggestedPrice,
              profitMargin: costs.appliedMargin.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(factoryProducts.id, product.id));

          await logFactoryProductPriceChange({
            productId: product.id,
            oldBasePrice: product.basePrice,
            newBasePrice,
            oldSuggestedPrice: product.suggestedPrice,
            newSuggestedPrice,
            source: "cost_calc_all",
            changedById: user?.id,
          });

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
      let totalIngredientWeightKg = 0;
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
        
        const unit = (ing.ingredient.unit || "kg").toLowerCase();
        if (unit === "kg") totalIngredientWeightKg += qty;
        else if (unit === "g") totalIngredientWeightKg += qty / 1000;
        else if (unit === "lt" || unit === "l") totalIngredientWeightKg += qty;
        else if (unit === "ml") totalIngredientWeightKg += qty / 1000;
        else totalIngredientWeightKg += qty;
        
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
      
      // Faaliyet Tabanlı Maliyet Hesaplama
      const workerCount = recipe.laborWorkerCount || 1;
      const productionMinutes = recipe.productionTimeMinutes || 0;
      const batchSize = recipe.laborBatchSize || 1;
      const manualRate = parseFloat(recipe.laborHourlyRate || "0");
      const autoHourlyRate = await calculateAutoHourlyRate();
      const hourlyRate = manualRate > 0 ? manualRate : autoHourlyRate;
      
      const laborCost = batchSize > 0 && hourlyRate > 0
        ? (workerCount * (productionMinutes / 60) * hourlyRate) / batchSize
        : 0;

      const kwhPerBatch = parseFloat(recipe.energyKwhPerBatch || "0");
      const energyCost = await calculateEnergyCost(kwhPerBatch, batchSize);
      
      const packagingCost = await calculatePackagingCost(product.id);
      
      const overheadCost = await calculateOverheadPerUnit(productionMinutes * workerCount, batchSize);
      
      const totalUnitCost = totalRawMaterialCost + laborCost + energyCost + packagingCost + overheadCost;

      const [margin] = await db.select()
        .from(profitMarginTemplates)
        .where(eq(profitMarginTemplates.category, product.category));
      
      const appliedMargin = margin ? parseFloat(margin.defaultMargin) : 1.35;
      const suggestedPrice = totalUnitCost * appliedMargin;

      const settings = await getCostSettings();
      const kwhPrice = settings['kwh_unit_price'] || 4.5;

      const packagingItems = await db.select().from(productPackagingItems)
        .where(eq(productPackagingItems.productId, product.id));
      
      const expectedUnitWeight = parseFloat(recipe.expectedUnitWeight || "0");
      const expectedUnitWeightUnit = recipe.expectedUnitWeightUnit || "g";
      const expectedOutputCount = recipe.expectedOutputCount || 0;
      const wasteTolerancePercent = parseFloat(recipe.wasteTolerancePercent || "5");
      
      let calculatedTotalOutputKg = 0;
      if (expectedUnitWeight > 0 && expectedOutputCount > 0) {
        if (expectedUnitWeightUnit === "g") {
          calculatedTotalOutputKg = (expectedUnitWeight * expectedOutputCount) / 1000;
        } else if (expectedUnitWeightUnit === "ml") {
          calculatedTotalOutputKg = (expectedUnitWeight * expectedOutputCount) / 1000;
        } else if (expectedUnitWeightUnit === "kg" || expectedUnitWeightUnit === "lt") {
          calculatedTotalOutputKg = expectedUnitWeight * expectedOutputCount;
        } else {
          calculatedTotalOutputKg = (expectedUnitWeight * expectedOutputCount) / 1000;
        }
      }
      
      const expectedWasteKg = totalIngredientWeightKg - calculatedTotalOutputKg;
      const expectedWastePercent = totalIngredientWeightKg > 0 
        ? (expectedWasteKg / totalIngredientWeightKg) * 100
        : 0;
      const wasteCostPerKg = totalIngredientWeightKg > 0 
        ? totalRawMaterialCost / totalIngredientWeightKg 
        : 0;
      const expectedWasteCostTl = expectedWasteKg * wasteCostPerKg;

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
          laborHourlyRate: recipe.laborHourlyRate,
          energyKwhPerBatch: recipe.energyKwhPerBatch,
          equipmentDescription: recipe.equipmentDescription,
          machineId: recipe.machineId
        },
        ingredients: processedIngredients,
        labor: {
          workerCount,
          productionMinutes,
          batchSize,
          hourlyRate: hourlyRate.toFixed(2),
          autoHourlyRate: autoHourlyRate.toFixed(2),
          isAutoRate: manualRate <= 0,
          totalLaborCost: laborCost.toFixed(2),
          formula: `${workerCount} kişi x ${productionMinutes} dk x ₺${hourlyRate.toFixed(2)}/saat / ${batchSize} adet`
        },
        energy: {
          kwhPerBatch,
          kwhPrice: kwhPrice.toFixed(2),
          totalEnergyCost: energyCost.toFixed(2),
          equipmentDescription: recipe.equipmentDescription || "",
          formula: kwhPerBatch > 0 ? `${kwhPerBatch} kWh x ₺${kwhPrice.toFixed(2)}/kWh / ${batchSize} adet` : "Tanımlanmadı"
        },
        packaging: {
          items: packagingItems,
          totalPackagingCost: packagingCost.toFixed(2)
        },
        batchYield: {
          totalIngredientWeightKg: totalIngredientWeightKg.toFixed(4),
          expectedUnitWeight: expectedUnitWeight || null,
          expectedUnitWeightUnit,
          expectedOutputCount: expectedOutputCount || null,
          calculatedTotalOutputKg: calculatedTotalOutputKg.toFixed(4),
          expectedWasteKg: expectedWasteKg > 0 ? expectedWasteKg.toFixed(4) : "0",
          expectedWastePercent: expectedWastePercent > 0 ? expectedWastePercent.toFixed(2) : "0",
          expectedWasteCostTl: expectedWasteCostTl > 0 ? expectedWasteCostTl.toFixed(2) : "0",
          wasteTolerancePercent: wasteTolerancePercent.toFixed(2),
          wasteCostPerKg: wasteCostPerKg.toFixed(2),
          isConfigured: expectedUnitWeight > 0 && expectedOutputCount > 0
        },
        costs: {
          rawMaterialCost: totalRawMaterialCost.toFixed(2),
          laborCost: laborCost.toFixed(2),
          energyCost: energyCost.toFixed(2),
          packagingCost: packagingCost.toFixed(2),
          overheadCost: overheadCost.toFixed(2),
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
  // BATCH VERİM & FİRE AYARLARI
  // ========================================
  
  app.patch("/api/product-recipes/:recipeId/batch-yield", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const { expectedUnitWeight, expectedUnitWeightUnit, expectedOutputCount, wasteTolerancePercent } = req.body;
      
      const [updated] = await db.update(productRecipes)
        .set({
          expectedUnitWeight: expectedUnitWeight?.toString() || null,
          expectedUnitWeightUnit: expectedUnitWeightUnit || "g",
          expectedOutputCount: expectedOutputCount || null,
          wasteTolerancePercent: wasteTolerancePercent?.toString() || "5",
          updatedAt: new Date()
        })
        .where(eq(productRecipes.id, recipeId))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating batch yield settings:", error);
      res.status(500).json({ error: "Batch verim ayarları güncellenemedi" });
    }
  });

  // Fire istatistikleri - ürün bazlı
  app.get("/api/waste-stats/product/:productId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const batches = await db.select()
        .from(factoryProductionBatches)
        .where(and(
          eq(factoryProductionBatches.productId, productId),
          eq(factoryProductionBatches.status, "completed"),
          gte(factoryProductionBatches.createdAt, since)
        ))
        .orderBy(desc(factoryProductionBatches.createdAt));
      
      const totalBatches = batches.length;
      let totalWasteKg = 0;
      let totalInputKg = 0;
      let totalOutputKg = 0;
      let totalWasteCost = 0;
      let overToleranceCount = 0;
      
      const batchDetails = batches.map(b => {
        const wasteKg = parseFloat(b.wasteWeightKg || "0");
        const inputKg = parseFloat(b.totalInputWeightKg || "0");
        const outputKg = parseFloat(b.totalOutputWeightKg || "0");
        const wasteCost = parseFloat(b.wasteCostTl || "0");
        const actualWP = parseFloat(b.actualWastePercent || "0");
        const expectedWP = parseFloat(b.expectedWastePercent || "0");
        const deviation = parseFloat(b.wasteDeviationPercent || "0");
        
        totalWasteKg += wasteKg;
        totalInputKg += inputKg;
        totalOutputKg += outputKg;
        totalWasteCost += wasteCost;
        if (deviation > 0) overToleranceCount++;
        
        return {
          id: b.id,
          date: b.createdAt,
          actualPieces: b.actualPieces,
          wasteKg,
          actualWastePercent: actualWP,
          expectedWastePercent: expectedWP,
          deviation,
          wasteCost,
          status: deviation > 0 ? "over" : deviation < -5 ? "under" : "normal"
        };
      });
      
      const avgWastePercent = totalInputKg > 0 ? (totalWasteKg / totalInputKg) * 100 : 0;
      
      res.json({
        productId,
        period: `${days} gün`,
        totalBatches,
        totalWasteKg: totalWasteKg.toFixed(2),
        totalInputKg: totalInputKg.toFixed(2),
        totalOutputKg: totalOutputKg.toFixed(2),
        avgWastePercent: avgWastePercent.toFixed(2),
        totalWasteCostTl: totalWasteCost.toFixed(2),
        overToleranceCount,
        overToleranceRate: totalBatches > 0 ? ((overToleranceCount / totalBatches) * 100).toFixed(1) : "0",
        batches: batchDetails
      });
    } catch (error) {
      console.error("Error fetching waste stats:", error);
      res.status(500).json({ error: "Fire istatistikleri alınamadı" });
    }
  });

  // Genel fire dashboard istatistikleri
  app.get("/api/waste-stats/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const batches = await db.select({
        batch: factoryProductionBatches,
        product: factoryProducts
      })
        .from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .where(and(
          eq(factoryProductionBatches.status, "completed"),
          gte(factoryProductionBatches.createdAt, since)
        ))
        .orderBy(desc(factoryProductionBatches.createdAt));
      
      let totalWasteKg = 0;
      let totalInputKg = 0;
      let totalWasteCost = 0;
      let overToleranceCount = 0;
      const productStats: Record<number, { name: string; wasteKg: number; inputKg: number; wasteCost: number; batchCount: number; overTolerance: number }> = {};
      
      const dailyWaste: Record<string, { date: string; wasteKg: number; inputKg: number; wastePercent: number; batchCount: number }> = {};
      
      for (const { batch: b, product: p } of batches) {
        const wasteKg = parseFloat(b.wasteWeightKg || "0");
        const inputKg = parseFloat(b.totalInputWeightKg || "0");
        const wasteCost = parseFloat(b.wasteCostTl || "0");
        const deviation = parseFloat(b.wasteDeviationPercent || "0");
        
        totalWasteKg += wasteKg;
        totalInputKg += inputKg;
        totalWasteCost += wasteCost;
        if (deviation > 0) overToleranceCount++;
        
        const pid = b.productId;
        if (!productStats[pid]) {
          productStats[pid] = { name: p?.name || "Bilinmeyen", wasteKg: 0, inputKg: 0, wasteCost: 0, batchCount: 0, overTolerance: 0 };
        }
        productStats[pid].wasteKg += wasteKg;
        productStats[pid].inputKg += inputKg;
        productStats[pid].wasteCost += wasteCost;
        productStats[pid].batchCount++;
        if (deviation > 0) productStats[pid].overTolerance++;
        
        const dateKey = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '';
        if (dateKey) {
          if (!dailyWaste[dateKey]) {
            dailyWaste[dateKey] = { date: dateKey, wasteKg: 0, inputKg: 0, wastePercent: 0, batchCount: 0 };
          }
          dailyWaste[dateKey].wasteKg += wasteKg;
          dailyWaste[dateKey].inputKg += inputKg;
          dailyWaste[dateKey].batchCount++;
        }
      }
      
      const avgWastePercent = totalInputKg > 0 ? (totalWasteKg / totalInputKg) * 100 : 0;
      
      const productRanking = Object.entries(productStats)
        .map(([id, stats]) => ({
          productId: parseInt(id),
          name: stats.name,
          wasteKg: stats.wasteKg.toFixed(2),
          wastePercent: stats.inputKg > 0 ? ((stats.wasteKg / stats.inputKg) * 100).toFixed(2) : "0",
          wasteCostTl: stats.wasteCost.toFixed(2),
          batchCount: stats.batchCount,
          overToleranceRate: stats.batchCount > 0 ? ((stats.overTolerance / stats.batchCount) * 100).toFixed(1) : "0"
        }))
        .sort((a, b) => parseFloat(b.wastePercent) - parseFloat(a.wastePercent));
      
      const trend = Object.values(dailyWaste)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
          ...d,
          wastePercent: d.inputKg > 0 ? Number(((d.wasteKg / d.inputKg) * 100).toFixed(2)) : 0,
          wasteKg: d.wasteKg.toFixed(2)
        }));
      
      res.json({
        period: `${days} gün`,
        totalBatches: batches.length,
        totalWasteKg: totalWasteKg.toFixed(2),
        totalInputKg: totalInputKg.toFixed(2),
        avgWastePercent: avgWastePercent.toFixed(2),
        totalWasteCostTl: totalWasteCost.toFixed(2),
        overToleranceCount,
        overToleranceRate: batches.length > 0 ? ((overToleranceCount / batches.length) * 100).toFixed(1) : "0",
        productRanking,
        trend
      });
    } catch (error) {
      console.error("Error fetching waste dashboard:", error);
      res.status(500).json({ error: "Fire dashboard istatistikleri alınamadı" });
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
                const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;
                await db.insert(rawMaterialPriceHistory).values({
                  rawMaterialId: material.id,
                  supplierId: material.supplierId,
                  previousPrice: material.currentUnitPrice || "0",
                  newPrice: newPrice.toFixed(4),
                  changePercent: changePercent.toFixed(2),
                  source: "sync_receipts",
                  changedBy: user?.username || user?.id || "system",
                });
                
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
      
      // Faaliyet tabanlı maliyet hesapla
      const costs = await calculateActivityBasedCost(recipe, product);
      
      // Ürünü güncelle
      const newBasePrice = costs.totalUnitCost.toFixed(2);
      const newSuggestedPrice = costs.suggestedPrice.toFixed(2);

      await db.update(factoryProducts)
        .set({
          basePrice: newBasePrice,
          suggestedPrice: newSuggestedPrice,
          profitMargin: costs.appliedMargin.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(factoryProducts.id, productId));

      await logFactoryProductPriceChange({
        productId,
        oldBasePrice: product.basePrice,
        newBasePrice,
        oldSuggestedPrice: product.suggestedPrice,
        newSuggestedPrice,
        source: "recipe_recalc",
        sourceReferenceId: recipe.id,
        changedById: user?.id,
      });

      await db.update(productRecipes)
        .set({
          rawMaterialCost: costs.rawMaterialCost.toFixed(4),
          laborCost: costs.laborCost.toFixed(4),
          energyCost: costs.energyCost.toFixed(4),
          packagingCost: costs.packagingCost.toFixed(4),
          overheadCost: costs.overheadCost.toFixed(4),
          totalUnitCost: costs.totalUnitCost.toFixed(4),
          costLastCalculated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(productRecipes.id, recipe.id));
      
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      await db.insert(productCostCalculations)
        .values({
          productId,
          recipeId: recipe.id,
          periodMonth: month,
          periodYear: year,
          rawMaterialCost: costs.rawMaterialCost.toFixed(4),
          directLaborCost: costs.laborCost.toFixed(4),
          energyCost: costs.energyCost.toFixed(4),
          packagingCost: costs.packagingCost.toFixed(4),
          overheadCost: costs.overheadCost.toFixed(4),
          totalUnitCost: costs.totalUnitCost.toFixed(4),
          appliedMargin: costs.appliedMargin.toFixed(2),
          suggestedSellingPrice: costs.suggestedPrice.toFixed(2),
          profitPerUnit: (costs.suggestedPrice - costs.totalUnitCost).toFixed(4),
          profitMarginPercentage: ((costs.appliedMargin - 1) * 100).toFixed(2),
          calculatedById: user?.id
        });
      
      res.json({
        message: `${product.name} maliyeti hesaplandı`,
        costs: {
          rawMaterialCost: costs.rawMaterialCost.toFixed(2),
          laborCost: costs.laborCost.toFixed(2),
          energyCost: costs.energyCost.toFixed(2),
          packagingCost: costs.packagingCost.toFixed(2),
          overheadCost: costs.overheadCost.toFixed(2),
          totalUnitCost: costs.totalUnitCost.toFixed(2),
          profitMargin: ((costs.appliedMargin - 1) * 100).toFixed(1) + "%",
          suggestedPrice: costs.suggestedPrice.toFixed(2)
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

  // AI ile Reçete Oluşturma - Fotoğraf veya metin analizi
  app.post("/api/recipes/ai-parse", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { imageBase64, textInput, mode } = req.body;
      
      if (!imageBase64 && !textInput) {
        return res.status(400).json({ error: "Fotoğraf veya metin girişi gereklidir" });
      }

      const allMaterials = await db.select().from(rawMaterials).where(eq(rawMaterials.isActive, true));
      const materialNames = allMaterials.map(m => `${m.code}: ${m.name} (${m.unit})`).join("\n");

      const systemPrompt = `Sen bir profesyonel gıda reçetesi analiz asistanısın. Verilen reçeteyi analiz et ve JSON formatında çıktı ver.

Mevcut hammadde listemiz:
${materialNames}

KURALLAR:
1. Reçetedeki her malzemeyi analiz et
2. Miktar ve birimi doğru şekilde çıkar (gram=gr, kilogram=kg, litre=lt, mililitre=ml, adet=adet)
3. Ürün adını belirle
4. Batch miktarını (kaç adet/kg üretim) belirle
5. Üretim süresini tahmin et (dakika)
6. Reçete tipini belirle: "OPEN" (standart) veya "KEYBLEND" (gizli formülasyon)

JSON formatı:
{
  "productName": "Ürün Adı",
  "category": "donut|pastane|konsantre|topping|kahve|cay|diger",
  "batchSize": 100,
  "outputUnit": "adet",
  "productionTimeMinutes": 60,
  "recipeType": "OPEN",
  "ingredients": [
    {
      "name": "Malzeme Adı",
      "quantity": 0.5,
      "unit": "kg"
    }
  ],
  "notes": "Ek notlar"
}

Sadece JSON döndür, başka metin ekleme.`;

      let messages: any[] = [{ role: "system", content: systemPrompt }];

      if (mode === "photo" && imageBase64) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: "Bu fotoğraftaki reçeteyi analiz et ve JSON olarak döndür." },
            { type: "image_url", image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
          ]
        });
      } else {
        messages.push({
          role: "user",
          content: `Bu reçete metnini analiz et ve JSON olarak döndür:\n\n${textInput}`
        });
      }

      const response = await aiClient.chat({
        messages,
        max_tokens: 2000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || "";
      
      let parsed: any;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("JSON bulunamadı");
        }
      } catch (e) {
        return res.status(422).json({ error: "AI yanıtı parse edilemedi", rawResponse: content });
      }

      const matchedIngredients = matchMaterials(parsed.ingredients || [], allMaterials);

      const products = await db.select().from(factoryProducts).where(eq(factoryProducts.isActive, true));
      let matchedProduct: any = null;
      let bestProductScore = 0;
      for (const p of products) {
        const score = fuzzyMatch(parsed.productName || "", p.name);
        if (score > bestProductScore) {
          bestProductScore = score;
          matchedProduct = p;
        }
      }

      const activeRecipes = await db.select({
        recipe: productRecipes,
        productName: factoryProducts.name,
      }).from(productRecipes)
        .leftJoin(factoryProducts, eq(productRecipes.productId, factoryProducts.id))
        .where(eq(productRecipes.isActive, true));

      const allRecipes = activeRecipes.map(r => ({
        id: r.recipe.id,
        name: r.recipe.name,
        version: r.recipe.version,
        productId: r.recipe.productId,
        recipeType: r.recipe.recipeType,
        productName: r.productName || "",
      }));

      res.json({
        parsed: {
          productName: parsed.productName,
          category: parsed.category,
          batchSize: parsed.batchSize,
          outputUnit: parsed.outputUnit,
          productionTimeMinutes: parsed.productionTimeMinutes,
          recipeType: parsed.recipeType || "OPEN",
          notes: parsed.notes,
        },
        ingredients: matchedIngredients,
        matchedProduct: bestProductScore >= 0.5 ? matchedProduct : null,
        allProducts: products,
        allMaterials: allMaterials,
        allRecipes: allRecipes,
      });
    } catch (error: unknown) {
      console.error("Error in AI recipe parse:", error);
      res.status(500).json({ error: "AI reçete analizi başarısız: " + (error.message || "Bilinmeyen hata") });
    }
  });

  // AI ile Reçete Kaydetme (parsed sonuçlardan)
  app.post("/api/recipes/ai-create", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { productId, recipeName, recipeType, outputQuantity, outputUnit, productionTimeMinutes, notes, ingredients } = req.body;

      if (!productId || !recipeName || !ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: "Ürün, reçete adı ve en az bir malzeme gereklidir" });
      }

      const existingRecipes = await db.select().from(productRecipes)
        .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));
      
      if (existingRecipes.length > 0) {
        await db.update(productRecipes)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));
      }

      const maxVersion = existingRecipes.length > 0 
        ? Math.max(...existingRecipes.map(r => r.version || 0)) + 1 
        : 1;

      const [newRecipe] = await db.insert(productRecipes).values({
        productId,
        name: recipeName,
        version: maxVersion,
        isActive: true,
        recipeType: recipeType || "OPEN",
        outputQuantity: outputQuantity?.toString() || "1",
        outputUnit: outputUnit || "adet",
        productionTimeMinutes: productionTimeMinutes || 0,
        notes: notes || "AI tarafından oluşturuldu",
        createdById: user?.id,
      }).returning();

      let totalRawMaterialCost = 0;
      for (const ing of ingredients) {
        if (!ing.rawMaterialId || !ing.quantity) continue;
        
        const [material] = await db.select().from(rawMaterials)
          .where(eq(rawMaterials.id, ing.rawMaterialId));
        
        const unitCost = material ? parseFloat(material.currentUnitPrice || "0") : 0;
        const totalCost = unitCost * parseFloat(ing.quantity);
        totalRawMaterialCost += totalCost;

        await db.insert(productRecipeIngredients).values({
          recipeId: newRecipe.id,
          rawMaterialId: ing.rawMaterialId,
          quantity: ing.quantity.toString(),
          unit: ing.unit || "gr",
          unitCost: unitCost.toFixed(4),
          totalCost: totalCost.toFixed(4),
        });
      }

      await db.update(productRecipes)
        .set({ rawMaterialCost: totalRawMaterialCost.toFixed(4), updatedAt: new Date() })
        .where(eq(productRecipes.id, newRecipe.id));

      res.json({ 
        success: true, 
        recipe: newRecipe, 
        message: `Reçete "${recipeName}" başarıyla oluşturuldu (v${maxVersion})` 
      });
    } catch (error: unknown) {
      console.error("Error creating AI recipe:", error);
      res.status(500).json({ error: "Reçete oluşturulamadı: " + (error.message || "Bilinmeyen hata") });
    }
  });

  // AI ile mevcut reçeteyi güncelle
  app.put("/api/recipes/:id/ai-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const recipeId = parseInt(req.params.id);
      const { recipeName, recipeType, outputQuantity, outputUnit, productionTimeMinutes, notes, ingredients } = req.body;

      if (!ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: "En az bir malzeme gereklidir" });
      }

      const [existingRecipe] = await db.select().from(productRecipes)
        .where(eq(productRecipes.id, recipeId));
      
      if (!existingRecipe) {
        return res.status(404).json({ error: "Reçete bulunamadı" });
      }

      await db.delete(productRecipeIngredients)
        .where(eq(productRecipeIngredients.recipeId, recipeId));

      const updateData: any = {
        updatedAt: new Date(),
        version: (existingRecipe.version || 0) + 1,
      };
      if (recipeName) updateData.name = recipeName;
      if (recipeType) updateData.recipeType = recipeType;
      if (outputQuantity) updateData.outputQuantity = outputQuantity.toString();
      if (outputUnit) updateData.outputUnit = outputUnit;
      if (productionTimeMinutes !== undefined) updateData.productionTimeMinutes = productionTimeMinutes;
      if (notes) updateData.notes = notes;

      const [updatedRecipe] = await db.update(productRecipes)
        .set(updateData)
        .where(eq(productRecipes.id, recipeId))
        .returning();

      let totalRawMaterialCost = 0;
      for (const ing of ingredients) {
        if (!ing.rawMaterialId || !ing.quantity) continue;
        
        const [material] = await db.select().from(rawMaterials)
          .where(eq(rawMaterials.id, ing.rawMaterialId));
        
        const unitCost = material ? parseFloat(material.currentUnitPrice || "0") : 0;
        const totalCost = unitCost * parseFloat(ing.quantity);
        totalRawMaterialCost += totalCost;

        await db.insert(productRecipeIngredients).values({
          recipeId: recipeId,
          rawMaterialId: ing.rawMaterialId,
          quantity: ing.quantity.toString(),
          unit: ing.unit || "gr",
          unitCost: unitCost.toFixed(4),
          totalCost: totalCost.toFixed(4),
        });
      }

      await db.update(productRecipes)
        .set({ rawMaterialCost: totalRawMaterialCost.toFixed(4), costLastCalculated: new Date(), updatedAt: new Date() })
        .where(eq(productRecipes.id, recipeId));

      res.json({ 
        success: true, 
        recipe: updatedRecipe, 
        message: `Reçete "${updatedRecipe.name}" AI ile güncellendi (v${updateData.version})` 
      });
    } catch (error: unknown) {
      console.error("Error updating recipe with AI:", error);
      res.status(500).json({ error: "Reçete güncellenemedi: " + (error.message || "Bilinmeyen hata") });
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

  // ==================== FABRİKA CİHAZLAR / MAKİNELER ====================

  // GET /api/factory-machines - Tüm cihazları listele
  app.get("/api/factory-machines", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const machines = await db.select().from(factoryMachines).orderBy(asc(factoryMachines.name));
      
      const machinesWithProducts = await Promise.all(machines.map(async (machine) => {
        const products = await db.select({
          id: machineProducts.id,
          productId: machineProducts.productId,
          productName: factoryProducts.name,
        })
          .from(machineProducts)
          .leftJoin(factoryProducts, eq(machineProducts.productId, factoryProducts.id))
          .where(eq(machineProducts.machineId, machine.id));
        
        return { ...machine, products };
      }));
      
      res.json(machinesWithProducts);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ error: "Cihaz listesi alınamadı" });
    }
  });

  // POST /api/factory-machines - Yeni cihaz ekle
  app.post("/api/factory-machines", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, description, kwhConsumption, isActive, productIds } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Cihaz adı zorunludur" });
      }
      
      const [machine] = await db.insert(factoryMachines).values({
        name,
        description: description || null,
        kwhConsumption: kwhConsumption?.toString() || "0",
        isActive: isActive !== false,
      }).returning();
      
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        await db.insert(machineProducts).values(
          productIds.map((pid: number) => ({
            machineId: machine.id,
            productId: pid,
          }))
        );
      }
      
      res.json(machine);
    } catch (error) {
      console.error("Error creating machine:", error);
      res.status(500).json({ error: "Cihaz oluşturulamadı" });
    }
  });

  // PUT /api/factory-machines/:id - Cihaz güncelle
  app.put("/api/factory-machines/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, kwhConsumption, isActive, productIds } = req.body;
      
      const [machine] = await db.update(factoryMachines)
        .set({
          name,
          description: description || null,
          kwhConsumption: kwhConsumption?.toString() || "0",
          isActive: isActive !== false,
          updatedAt: new Date(),
        })
        .where(eq(factoryMachines.id, id))
        .returning();
      
      if (!machine) {
        return res.status(404).json({ error: "Cihaz bulunamadı" });
      }
      
      if (productIds !== undefined && Array.isArray(productIds)) {
        await db.delete(machineProducts).where(eq(machineProducts.machineId, id));
        if (productIds.length > 0) {
          await db.insert(machineProducts).values(
            productIds.map((pid: number) => ({
              machineId: id,
              productId: pid,
            }))
          );
        }
      }
      
      res.json(machine);
    } catch (error) {
      console.error("Error updating machine:", error);
      res.status(500).json({ error: "Cihaz güncellenemedi" });
    }
  });

  // DELETE /api/factory-machines/:id - Cihaz sil
  app.delete("/api/factory-machines/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryMachines).where(eq(factoryMachines.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting machine:", error);
      res.status(500).json({ error: "Cihaz silinemedi" });
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

function fuzzyMatch(input: string, target: string): number {
  const a = input.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]/gi, "");
  const b = target.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]/gi, "");
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  
  const aWords = input.toLocaleLowerCase('tr-TR').split(/\s+/);
  const bWords = target.toLocaleLowerCase('tr-TR').split(/\s+/);
  let matchCount = 0;
  for (const aw of aWords) {
    for (const bw of bWords) {
      if (bw.includes(aw) || aw.includes(bw)) {
        matchCount++;
        break;
      }
    }
  }
  return matchCount / Math.max(aWords.length, 1);
}

function matchMaterials(parsedIngredients: any[], materialsList: any[]): any[] {
  return parsedIngredients.map(ing => {
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const mat of materialsList) {
      const nameScore = fuzzyMatch(ing.name, mat.name);
      const codeScore = mat.code ? fuzzyMatch(ing.name, mat.code) : 0;
      const score = Math.max(nameScore, codeScore);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = mat;
      }
    }
    
    return {
      originalName: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      matchedMaterial: bestScore >= 0.5 ? bestMatch : null,
      matchScore: bestScore,
      isMatched: bestScore >= 0.5
    };
  });
}
