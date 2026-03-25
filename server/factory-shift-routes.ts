import { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, inArray, isNull, count } from "drizzle-orm";
import aiClient from "./services/ai-client";
import {
  factoryShifts,
  factoryShiftWorkers,
  factoryBatchSpecs,
  factoryShiftProductions,
  factoryProductionBatches,
  factoryBatchVerifications,
  factoryMachines,
  factoryProducts,
  factoryWasteReasons,
  users,
  productRecipes,
  productRecipeIngredients,
  rawMaterials,
  notifications,
  insertFactoryShiftSchema,
  insertFactoryShiftWorkerSchema,
  insertFactoryBatchSpecSchema,
  insertFactoryShiftProductionSchema,
  insertFactoryProductionBatchSchema,
} from "@shared/schema";

const isAuthenticated = (req: any, res: Response, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Yetkisiz erişim" });
  }
  next();
};

const FACTORY_ROLES = ["admin", "ceo", "cgo", "fabrika_mudur", "fabrika_operator", "fabrika_supervisor", "supervisor", "kalite_kontrol"];

const isFactoryUser = (req: any, res: Response, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Yetkisiz erişim" });
  }
  const user = req.user;
  if (!user || !FACTORY_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
  }
  next();
};

const SUPERVISOR_ROLES = ["admin", "ceo", "cgo", "fabrika_mudur", "fabrika_supervisor", "supervisor", "kalite_kontrol"];

const isSupervisorUser = (req: any, res: Response, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Yetkisiz erişim" });
  }
  const user = req.user;
  if (!user || !SUPERVISOR_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "Bu işlem için yönetici yetkiniz gerekli" });
  }
  next();
};

export function registerFactoryShiftRoutes(app: Express) {
  // ========================================
  // FACTORY SHIFTS CRUD
  // ========================================

  app.get("/api/factory-shifts", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, status } = req.query;
      let conditions: any[] = [];
      if (startDate) conditions.push(gte(factoryShifts.shiftDate, startDate as string));
      if (endDate) conditions.push(lte(factoryShifts.shiftDate, endDate as string));
      if (status) conditions.push(eq(factoryShifts.status, status as string));

      const shifts = await db.select().from(factoryShifts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(factoryShifts.shiftDate), asc(factoryShifts.startTime));

      const shiftIds = shifts.map(s => s.id);
      let workers: any[] = [];
      let productions: any[] = [];

      if (shiftIds.length > 0) {
        const fpAlias = factoryProducts;
        workers = await db.select({
          id: factoryShiftWorkers.id,
          shiftId: factoryShiftWorkers.shiftId,
          userId: factoryShiftWorkers.userId,
          machineId: factoryShiftWorkers.machineId,
          productId: factoryShiftWorkers.productId,
          role: factoryShiftWorkers.role,
          selfSelected: factoryShiftWorkers.selfSelected,
          notes: factoryShiftWorkers.notes,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          machineName: factoryMachines.name,
          productName: fpAlias.name,
        }).from(factoryShiftWorkers)
          .leftJoin(users, eq(factoryShiftWorkers.userId, users.id))
          .leftJoin(factoryMachines, eq(factoryShiftWorkers.machineId, factoryMachines.id))
          .leftJoin(fpAlias, eq(factoryShiftWorkers.productId, fpAlias.id))
          .where(inArray(factoryShiftWorkers.shiftId, shiftIds));

        productions = await db.select({
          id: factoryShiftProductions.id,
          shiftId: factoryShiftProductions.shiftId,
          productId: factoryShiftProductions.productId,
          machineId: factoryShiftProductions.machineId,
          batchSpecId: factoryShiftProductions.batchSpecId,
          plannedBatchCount: factoryShiftProductions.plannedBatchCount,
          completedBatchCount: factoryShiftProductions.completedBatchCount,
          status: factoryShiftProductions.status,
          notes: factoryShiftProductions.notes,
          productName: factoryProducts.name,
          machineName: factoryMachines.name,
        }).from(factoryShiftProductions)
          .leftJoin(factoryProducts, eq(factoryShiftProductions.productId, factoryProducts.id))
          .leftJoin(factoryMachines, eq(factoryShiftProductions.machineId, factoryMachines.id))
          .where(inArray(factoryShiftProductions.shiftId, shiftIds));
      }

      const result = shifts.map(shift => ({
        ...shift,
        workers: workers.filter(w => w.shiftId === shift.id),
        productions: productions.filter(p => p.shiftId === shift.id),
      }));

      res.json(result);
    } catch (error: unknown) {
      console.error("Get factory shifts error:", error);
      res.status(500).json({ error: "Vardiyalar alınamadı" });
    }
  });

  app.post("/api/factory-shifts", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { workers, productions, ...shiftData } = req.body;
      const parseResult = insertFactoryShiftSchema.safeParse(shiftData);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }

      const result = await db.transaction(async (tx) => {
        const [shift] = await tx.insert(factoryShifts).values({
          ...parseResult.data,
          createdById: (req as any).user?.id,
        }).returning();

        if (workers && Array.isArray(workers) && workers.length > 0) {
          await tx.insert(factoryShiftWorkers).values(
            workers.map((w: any) => ({
              shiftId: shift.id,
              userId: w.userId,
              machineId: w.machineId || null,
              productId: w.productId || null,
              role: w.role || "operator",
              notes: w.notes || null,
            }))
          );
        }

        if (productions && Array.isArray(productions) && productions.length > 0) {
          await tx.insert(factoryShiftProductions).values(
            productions.map((p: any) => ({
              shiftId: shift.id,
              productId: p.productId,
              machineId: p.machineId || null,
              batchSpecId: p.batchSpecId || null,
              plannedBatchCount: p.plannedBatchCount || 1,
              notes: p.notes || null,
            }))
          );
        }

        return shift;
      });

      res.json(result);
    } catch (error: unknown) {
      console.error("Create factory shift error:", error);
      res.status(500).json({ error: "Vardiya oluşturulamadı" });
    }
  });

  app.put("/api/factory-shifts/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db.update(factoryShifts)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(factoryShifts.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Vardiya bulunamadı" });
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update factory shift error:", error);
      res.status(500).json({ error: "Vardiya güncellenemedi" });
    }
  });

  app.delete("/api/factory-shifts/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShifts).where(eq(factoryShifts.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete factory shift error:", error);
      res.status(500).json({ error: "Vardiya silinemedi" });
    }
  });

  // ========================================
  // SHIFT WORKERS (Çalışan Atamaları)
  // ========================================

  app.post("/api/factory-shifts/:shiftId/workers", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const shiftId = parseInt(req.params.shiftId);
      const { userId, machineId, productId, role, notes } = req.body;

      const existing = await db.select({ id: factoryShiftWorkers.id })
        .from(factoryShiftWorkers)
        .where(and(
          eq(factoryShiftWorkers.shiftId, shiftId),
          eq(factoryShiftWorkers.userId, userId),
        ));
      if (existing.length > 0) {
        return res.status(400).json({ error: "Bu çalışan zaten bu vardiyaya atanmış" });
      }

      const [worker] = await db.insert(factoryShiftWorkers).values({
        shiftId,
        userId,
        machineId: machineId || null,
        productId: productId || null,
        role: role || "operator",
        notes,
      }).returning();
      res.json(worker);
    } catch (error: unknown) {
      console.error("Add shift worker error:", error);
      res.status(500).json({ error: "Çalışan atanamadı" });
    }
  });

  app.delete("/api/factory-shift-workers/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShiftWorkers).where(eq(factoryShiftWorkers.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Remove shift worker error:", error);
      res.status(500).json({ error: "Çalışan kaldırılamadı" });
    }
  });

  app.put("/api/factory-shift-workers/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db.update(factoryShiftWorkers)
        .set(req.body)
        .where(eq(factoryShiftWorkers.id, id))
        .returning();
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update shift worker error:", error);
      res.status(500).json({ error: "Çalışan ataması güncellenemedi" });
    }
  });

  // ========================================
  // SHIFT PRODUCTIONS (Üretim Planları)
  // ========================================

  app.post("/api/factory-shifts/:shiftId/productions", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const shiftId = parseInt(req.params.shiftId);
      const { productId, machineId, batchSpecId, plannedBatchCount, notes } = req.body;
      const [production] = await db.insert(factoryShiftProductions).values({
        shiftId,
        productId,
        machineId: machineId || null,
        batchSpecId: batchSpecId || null,
        plannedBatchCount: plannedBatchCount || 1,
        notes,
      }).returning();
      res.json(production);
    } catch (error: unknown) {
      console.error("Add shift production error:", error);
      res.status(500).json({ error: "Üretim planı eklenemedi" });
    }
  });

  app.delete("/api/factory-shift-productions/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShiftProductions).where(eq(factoryShiftProductions.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Remove shift production error:", error);
      res.status(500).json({ error: "Üretim planı kaldırılamadı" });
    }
  });

  // ========================================
  // BATCH SPECS (Batch Spesifikasyonları)
  // ========================================

  app.get("/api/factory-batch-specs", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const specs = await db.select({
        id: factoryBatchSpecs.id,
        productId: factoryBatchSpecs.productId,
        machineId: factoryBatchSpecs.machineId,
        batchWeightKg: factoryBatchSpecs.batchWeightKg,
        batchWeightUnit: factoryBatchSpecs.batchWeightUnit,
        expectedPieces: factoryBatchSpecs.expectedPieces,
        pieceWeightGrams: factoryBatchSpecs.pieceWeightGrams,
        pieceWeightUnit: factoryBatchSpecs.pieceWeightUnit,
        targetDurationMinutes: factoryBatchSpecs.targetDurationMinutes,
        recipeId: factoryBatchSpecs.recipeId,
        description: factoryBatchSpecs.description,
        isActive: factoryBatchSpecs.isActive,
        createdAt: factoryBatchSpecs.createdAt,
        productName: factoryProducts.name,
        machineName: factoryMachines.name,
      }).from(factoryBatchSpecs)
        .leftJoin(factoryProducts, eq(factoryBatchSpecs.productId, factoryProducts.id))
        .leftJoin(factoryMachines, eq(factoryBatchSpecs.machineId, factoryMachines.id))
        .orderBy(desc(factoryBatchSpecs.createdAt));
      res.json(specs);
    } catch (error: unknown) {
      console.error("Get batch specs error:", error);
      res.status(500).json({ error: "Batch spesifikasyonları alınamadı" });
    }
  });

  app.get("/api/factory-products/:productId/recipe-info", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const [recipe] = await db.select().from(productRecipes)
        .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)))
        .limit(1);

      if (!recipe) {
        return res.json({ hasRecipe: false });
      }

      const ingredients = await db.select({
        quantity: productRecipeIngredients.quantity,
        unit: productRecipeIngredients.unit,
      }).from(productRecipeIngredients)
        .where(eq(productRecipeIngredients.recipeId, recipe.id));

      const isVolumeUnit = (u: string) => ["ml", "litre", "lt", "l"].includes(u.toLowerCase());
      const isMassUnit = (u: string) => ["kg", "g"].includes(u.toLowerCase());

      let totalMassKg = 0;
      let totalVolumeLitre = 0;
      let massCount = 0;
      let volumeCount = 0;

      for (const ing of ingredients) {
        const qty = parseFloat(ing.quantity?.toString() || "0");
        const unit = (ing.unit || "kg").toLowerCase();

        if (unit === "kg") { totalMassKg += qty; massCount++; }
        else if (unit === "g") { totalMassKg += qty / 1000; massCount++; }
        else if (unit === "ml") { totalVolumeLitre += qty / 1000; volumeCount++; }
        else if (unit === "litre" || unit === "lt" || unit === "l") { totalVolumeLitre += qty; volumeCount++; }
        else { totalMassKg += qty; massCount++; }
      }

      let primaryUnit = "kg";
      let batchWeight = totalMassKg;

      const outUnit = (recipe.outputUnit || "").toLowerCase();
      if (isVolumeUnit(outUnit)) {
        primaryUnit = "litre";
        batchWeight = totalVolumeLitre > 0 ? totalVolumeLitre : totalMassKg;
      } else if (isMassUnit(outUnit) || outUnit === "adet") {
        primaryUnit = "kg";
        batchWeight = totalMassKg + totalVolumeLitre;
      } else if (volumeCount > massCount && totalVolumeLitre > 0) {
        primaryUnit = "litre";
        batchWeight = totalVolumeLitre;
      }

      const outputCount = parseInt(recipe.outputQuantity?.toString() || "1");
      const expectedUnitWeight = recipe.expectedUnitWeight ? parseFloat(recipe.expectedUnitWeight.toString()) : null;
      const expectedUnitWeightUnit = recipe.expectedUnitWeightUnit || "g";

      res.json({
        hasRecipe: true,
        recipeId: recipe.id,
        recipeName: recipe.name,
        batchWeight: parseFloat(batchWeight.toFixed(3)),
        batchWeightUnit: primaryUnit,
        outputCount: outputCount,
        expectedUnitWeight,
        expectedUnitWeightUnit,
        productionTimeMinutes: recipe.productionTimeMinutes,
      });
    } catch (error: unknown) {
      console.error("Get recipe info error:", error);
      res.status(500).json({ error: "Reçete bilgisi alınamadı" });
    }
  });

  app.post("/api/factory-batch-specs", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const parseResult = insertFactoryBatchSpecSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      const [spec] = await db.insert(factoryBatchSpecs).values(parseResult.data).returning();
      res.json(spec);
    } catch (error: unknown) {
      console.error("Create batch spec error:", error);
      res.status(500).json({ error: "Batch spesifikasyonu oluşturulamadı" });
    }
  });

  app.put("/api/factory-batch-specs/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db.update(factoryBatchSpecs)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(factoryBatchSpecs.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Batch spesifikasyonu bulunamadı" });
      res.json(updated);
    } catch (error: unknown) {
      console.error("Update batch spec error:", error);
      res.status(500).json({ error: "Batch spesifikasyonu güncellenemedi" });
    }
  });

  app.delete("/api/factory-batch-specs/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryBatchSpecs).where(eq(factoryBatchSpecs.id, id));
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Delete batch spec error:", error);
      res.status(500).json({ error: "Batch spesifikasyonu silinemedi" });
    }
  });

  // ========================================
  // PRODUCTION BATCHES (Üretim Batch'leri)
  // ========================================

  app.get("/api/factory-production-batches", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { shiftId, status, operatorUserId, startDate, endDate } = req.query;
      let conditions: any[] = [];
      if (shiftId) conditions.push(eq(factoryProductionBatches.shiftId, parseInt(shiftId as string)));
      if (status) conditions.push(eq(factoryProductionBatches.status, status as string));
      if (operatorUserId) conditions.push(eq(factoryProductionBatches.operatorUserId, operatorUserId as string));
      if (startDate) conditions.push(gte(factoryProductionBatches.startTime, new Date(startDate as string)));
      if (endDate) conditions.push(lte(factoryProductionBatches.startTime, new Date(endDate as string)));

      const batches = await db.select({
        id: factoryProductionBatches.id,
        shiftProductionId: factoryProductionBatches.shiftProductionId,
        shiftId: factoryProductionBatches.shiftId,
        productId: factoryProductionBatches.productId,
        machineId: factoryProductionBatches.machineId,
        batchSpecId: factoryProductionBatches.batchSpecId,
        operatorUserId: factoryProductionBatches.operatorUserId,
        batchNumber: factoryProductionBatches.batchNumber,
        startTime: factoryProductionBatches.startTime,
        endTime: factoryProductionBatches.endTime,
        actualWeightKg: factoryProductionBatches.actualWeightKg,
        actualPieces: factoryProductionBatches.actualPieces,
        targetWeightKg: factoryProductionBatches.targetWeightKg,
        targetPieces: factoryProductionBatches.targetPieces,
        targetDurationMinutes: factoryProductionBatches.targetDurationMinutes,
        actualDurationMinutes: factoryProductionBatches.actualDurationMinutes,
        wasteWeightKg: factoryProductionBatches.wasteWeightKg,
        wastePieces: factoryProductionBatches.wastePieces,
        wasteReasonId: factoryProductionBatches.wasteReasonId,
        wasteNotes: factoryProductionBatches.wasteNotes,
        performanceScore: factoryProductionBatches.performanceScore,
        yieldRate: factoryProductionBatches.yieldRate,
        photoUrl: factoryProductionBatches.photoUrl,
        status: factoryProductionBatches.status,
        notes: factoryProductionBatches.notes,
        createdAt: factoryProductionBatches.createdAt,
        productName: factoryProducts.name,
        machineName: factoryMachines.name,
        operatorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      }).from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .leftJoin(factoryMachines, eq(factoryProductionBatches.machineId, factoryMachines.id))
        .leftJoin(users, eq(factoryProductionBatches.operatorUserId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(factoryProductionBatches.startTime));

      res.json(batches);
    } catch (error: unknown) {
      console.error("Get production batches error:", error);
      res.status(500).json({ error: "Üretim batch'leri alınamadı" });
    }
  });

  // Start a new batch
  app.post("/api/factory-production-batches/start", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { shiftProductionId, shiftId, productId, machineId, batchSpecId, operatorUserId } = req.body;

      let targetWeightKg = null;
      let targetPieces = null;
      let targetDurationMinutes = null;

      if (batchSpecId) {
        const [spec] = await db.select().from(factoryBatchSpecs).where(eq(factoryBatchSpecs.id, batchSpecId));
        if (spec) {
          targetWeightKg = spec.batchWeightKg;
          targetPieces = spec.expectedPieces;
          targetDurationMinutes = spec.targetDurationMinutes;
        }
      }

      const existingBatches = await db.select({ count: sql<number>`count(*)::int` })
        .from(factoryProductionBatches)
        .where(and(
          eq(factoryProductionBatches.shiftId, shiftId),
          eq(factoryProductionBatches.productId, productId),
        ));
      const batchNumber = (existingBatches[0]?.count || 0) + 1;

      const [batch] = await db.insert(factoryProductionBatches).values({
        shiftProductionId,
        shiftId,
        productId,
        machineId,
        batchSpecId,
        operatorUserId: operatorUserId || (req as any).user?.id,
        batchNumber,
        startTime: new Date(),
        targetWeightKg,
        targetPieces,
        targetDurationMinutes,
        status: "in_progress",
      }).returning();

      res.json(batch);
    } catch (error: unknown) {
      console.error("Start batch error:", error);
      res.status(500).json({ error: "Batch başlatılamadı" });
    }
  });

  // Complete a batch (worker submits production data)
  app.put("/api/factory-production-batches/:id/complete", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { actualWeightKg, actualPieces, wasteWeightKg, wastePieces, wasteReasonId, wasteNotes, photoUrl, notes } = req.body;

      const result = await db.transaction(async (tx) => {
        const [batch] = await tx.select().from(factoryProductionBatches).where(eq(factoryProductionBatches.id, id));
        if (!batch) throw new Error("Batch bulunamadı");

        const endTime = new Date();
        const startTime = new Date(batch.startTime);
        const actualDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        let performanceScore = null;
        let yieldRate = null;
        const targetDur = batch.targetDurationMinutes;
        const targetPcs = batch.targetPieces;

        if (targetDur && targetDur > 0) {
          performanceScore = Math.round((targetDur / actualDurationMinutes) * 100 * 100) / 100;
        }
        if (targetPcs && targetPcs > 0 && actualPieces) {
          yieldRate = Math.round((actualPieces / targetPcs) * 100 * 100) / 100;
        }

        // Fetch recipe batch yield settings for waste calculation
        let expectedWastePercent: number | null = null;
        let actualWastePercent: number | null = null;
        let wasteDeviationPercent: number | null = null;
        let totalInputWeightKg: number | null = null;
        let totalOutputWeightKg: number | null = null;
        let wasteCostTl: number | null = null;

        const [recipe] = await tx.select()
          .from(productRecipes)
          .where(and(
            eq(productRecipes.productId, batch.productId),
            eq(productRecipes.isActive, true)
          ));
        
        if (recipe && recipe.expectedUnitWeight && recipe.expectedOutputCount) {
          // Calculate total ingredient weight from recipe
          const ingredients = await tx.select({
            ingredient: productRecipeIngredients,
            material: rawMaterials
          })
            .from(productRecipeIngredients)
            .leftJoin(rawMaterials, eq(productRecipeIngredients.rawMaterialId, rawMaterials.id))
            .where(eq(productRecipeIngredients.recipeId, recipe.id));
          
          let ingredientTotalKg = 0;
          let ingredientTotalCost = 0;
          for (const ing of ingredients) {
            const qty = parseFloat(ing.ingredient.quantity);
            const unit = (ing.ingredient.unit || "kg").toLowerCase();
            if (unit === "kg") ingredientTotalKg += qty;
            else if (unit === "g") ingredientTotalKg += qty / 1000;
            else if (unit === "lt" || unit === "l") ingredientTotalKg += qty;
            else if (unit === "ml") ingredientTotalKg += qty / 1000;
            else ingredientTotalKg += qty;
            
            const isKB = ing.material?.isKeyblend || false;
            const price = isKB ? parseFloat(ing.material?.keyblendCost || "0") : parseFloat(ing.material?.currentUnitPrice || "0");
            ingredientTotalCost += qty * price;
          }
          
          totalInputWeightKg = ingredientTotalKg;
          
          const expUnitW = parseFloat(recipe.expectedUnitWeight);
          const expUnit = recipe.expectedUnitWeightUnit || "g";
          const expCount = recipe.expectedOutputCount;
          
          let expectedOutputKg = 0;
          if (expUnit === "g" || expUnit === "ml") expectedOutputKg = (expUnitW * expCount) / 1000;
          else expectedOutputKg = expUnitW * expCount;
          
          expectedWastePercent = ingredientTotalKg > 0
            ? ((ingredientTotalKg - expectedOutputKg) / ingredientTotalKg) * 100
            : 0;
          
          // Calculate actual output from actualPieces
          if (actualPieces && actualPieces > 0) {
            let actualOutputKg = 0;
            if (expUnit === "g" || expUnit === "ml") actualOutputKg = (expUnitW * actualPieces) / 1000;
            else actualOutputKg = expUnitW * actualPieces;
            
            totalOutputWeightKg = actualOutputKg;
            const actualWasteKg = ingredientTotalKg - actualOutputKg;
            actualWastePercent = ingredientTotalKg > 0
              ? (actualWasteKg / ingredientTotalKg) * 100
              : 0;
            
            wasteDeviationPercent = actualWastePercent - expectedWastePercent;
            
            const costPerKg = ingredientTotalKg > 0 ? ingredientTotalCost / ingredientTotalKg : 0;
            wasteCostTl = actualWasteKg > 0 ? actualWasteKg * costPerKg : 0;
          }
        }

        const [updated] = await tx.update(factoryProductionBatches).set({
          endTime,
          actualWeightKg: actualWeightKg?.toString(),
          actualPieces,
          actualDurationMinutes,
          wasteWeightKg: wasteWeightKg?.toString() || "0",
          wastePieces: wastePieces || 0,
          wasteReasonId: wasteReasonId || null,
          wasteNotes,
          expectedWastePercent: expectedWastePercent?.toFixed(2),
          actualWastePercent: actualWastePercent?.toFixed(2),
          wasteDeviationPercent: wasteDeviationPercent?.toFixed(2),
          totalInputWeightKg: totalInputWeightKg?.toFixed(2),
          totalOutputWeightKg: totalOutputWeightKg?.toFixed(2),
          wasteCostTl: wasteCostTl?.toFixed(2),
          performanceScore: performanceScore?.toString(),
          yieldRate: yieldRate?.toString(),
          photoUrl,
          notes,
          status: "completed",
        }).where(eq(factoryProductionBatches.id, id)).returning();

        // Update shift production completed count
        if (batch.shiftProductionId) {
          await tx.update(factoryShiftProductions).set({
            completedBatchCount: sql`${factoryShiftProductions.completedBatchCount} + 1`,
          }).where(eq(factoryShiftProductions.id, batch.shiftProductionId));
        }

        return {
          updated,
          expectedWastePercent,
          actualWastePercent,
          wasteDeviationPercent,
          wasteCostTl,
          targetDur,
          actualDurationMinutes,
          recipe,
          batch,
        };
      });

      // Check warnings (outside transaction)
      let warning = null;
      const warnings: string[] = [];
      
      if (result.targetDur && result.actualDurationMinutes > result.targetDur) {
        warnings.push(`Hedef süre aşıldı! Hedef: ${result.targetDur} dk, Gerçekleşen: ${result.actualDurationMinutes} dk`);
      }

      const tolerancePercent = parseFloat(result.recipe?.wasteTolerancePercent || "5");
      if (result.wasteDeviationPercent !== null && result.wasteDeviationPercent > tolerancePercent) {
        warnings.push(`Fire toleransı aşıldı! Beklenen: %${result.expectedWastePercent?.toFixed(1)}, Gerçekleşen: %${result.actualWastePercent?.toFixed(1)}, Sapma: +%${result.wasteDeviationPercent.toFixed(1)}`);
        
        try {
          await db.insert(notifications).values({
            userId: (req as any).user?.id || "system",
            title: "Fire Toleransı Aşıldı",
            message: `Ürün #${result.batch.productId} üretiminde fire toleransı aşıldı. Beklenen: %${result.expectedWastePercent?.toFixed(1)}, Gerçekleşen: %${result.actualWastePercent?.toFixed(1)}`,
            type: "warning",
          });
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
      
      if (warnings.length > 0) warning = warnings.join(" | ");

      res.json({ 
        ...result.updated, 
        warning,
        wasteAnalysis: result.wasteDeviationPercent !== null ? {
          expectedWastePercent: result.expectedWastePercent?.toFixed(2),
          actualWastePercent: result.actualWastePercent?.toFixed(2),
          deviationPercent: result.wasteDeviationPercent?.toFixed(2),
          wasteCostTl: result.wasteCostTl?.toFixed(2),
          toleranceExceeded: result.wasteDeviationPercent > tolerancePercent,
          status: result.wasteDeviationPercent > tolerancePercent ? "over" : result.wasteDeviationPercent < -5 ? "under" : "normal"
        } : null
      });
    } catch (error: unknown) {
      console.error("Complete batch error:", error);
      res.status(404).json({ error: error.message || "Batch tamamlanamadı" });
    }
  });

  // ========================================
  // BATCH VERIFICATIONS (Doğrulama)
  // ========================================

  app.get("/api/factory-batch-verifications/pending", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const pendingBatches = await db.select({
        id: factoryProductionBatches.id,
        productId: factoryProductionBatches.productId,
        machineId: factoryProductionBatches.machineId,
        operatorUserId: factoryProductionBatches.operatorUserId,
        batchNumber: factoryProductionBatches.batchNumber,
        startTime: factoryProductionBatches.startTime,
        endTime: factoryProductionBatches.endTime,
        actualWeightKg: factoryProductionBatches.actualWeightKg,
        actualPieces: factoryProductionBatches.actualPieces,
        targetWeightKg: factoryProductionBatches.targetWeightKg,
        targetPieces: factoryProductionBatches.targetPieces,
        actualDurationMinutes: factoryProductionBatches.actualDurationMinutes,
        targetDurationMinutes: factoryProductionBatches.targetDurationMinutes,
        wasteWeightKg: factoryProductionBatches.wasteWeightKg,
        wastePieces: factoryProductionBatches.wastePieces,
        wasteNotes: factoryProductionBatches.wasteNotes,
        performanceScore: factoryProductionBatches.performanceScore,
        yieldRate: factoryProductionBatches.yieldRate,
        photoUrl: factoryProductionBatches.photoUrl,
        notes: factoryProductionBatches.notes,
        createdAt: factoryProductionBatches.createdAt,
        productName: factoryProducts.name,
        machineName: factoryMachines.name,
        operatorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      }).from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .leftJoin(factoryMachines, eq(factoryProductionBatches.machineId, factoryMachines.id))
        .leftJoin(users, eq(factoryProductionBatches.operatorUserId, users.id))
        .where(eq(factoryProductionBatches.status, "completed"))
        .orderBy(asc(factoryProductionBatches.endTime));

      res.json(pendingBatches);
    } catch (error: unknown) {
      console.error("Get pending verifications error:", error);
      res.status(500).json({ error: "Doğrulama bekleyenler alınamadı" });
    }
  });

  app.post("/api/factory-batch-verifications", isSupervisorUser, async (req: Request, res: Response) => {
    try {
      const { batchId, verifiedWeightKg, verifiedPieces, verifiedWasteKg, verifiedWastePieces, isApproved, rejectionReason, notes } = req.body;

      const verification = await db.transaction(async (tx) => {
        const [newVerification] = await tx.insert(factoryBatchVerifications).values({
          batchId,
          verifierUserId: (req as any).user?.id,
          verifiedWeightKg: verifiedWeightKg?.toString(),
          verifiedPieces,
          verifiedWasteKg: verifiedWasteKg?.toString(),
          verifiedWastePieces,
          isApproved,
          rejectionReason,
          notes,
        }).returning();

        // Update batch status
        await tx.update(factoryProductionBatches).set({
          status: isApproved ? "verified" : "rejected",
        }).where(eq(factoryProductionBatches.id, batchId));

        return newVerification;
      });

      res.json(verification);
    } catch (error: unknown) {
      console.error("Create verification error:", error);
      res.status(500).json({ error: "Doğrulama kaydedilemedi" });
    }
  });

  // ========================================
  // KIOSK: Get today's shift assignment for a user
  // ========================================

  app.get("/api/factory-shifts/my-assignment/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const nowIstanbul = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
      const today = nowIstanbul.toISOString().split("T")[0];

      const assignments = await db.select({
        assignmentId: factoryShiftWorkers.id,
        shiftId: factoryShifts.id,
        shiftDate: factoryShifts.shiftDate,
        shiftType: factoryShifts.shiftType,
        startTime: factoryShifts.startTime,
        endTime: factoryShifts.endTime,
        shiftStatus: factoryShifts.status,
        machineId: factoryShiftWorkers.machineId,
        machineName: factoryMachines.name,
        role: factoryShiftWorkers.role,
      }).from(factoryShiftWorkers)
        .innerJoin(factoryShifts, eq(factoryShiftWorkers.shiftId, factoryShifts.id))
        .leftJoin(factoryMachines, eq(factoryShiftWorkers.machineId, factoryMachines.id))
        .where(and(
          eq(factoryShiftWorkers.userId, userId),
          eq(factoryShifts.shiftDate, today),
          inArray(factoryShifts.status, ["planned", "active"]),
        ));

      if (assignments.length === 0) {
        return res.json({ assigned: false, assignment: null, productions: [] });
      }

      const assignment = assignments[0];

      // Get production plans for this shift
      const productions = await db.select({
        id: factoryShiftProductions.id,
        productId: factoryShiftProductions.productId,
        machineId: factoryShiftProductions.machineId,
        batchSpecId: factoryShiftProductions.batchSpecId,
        plannedBatchCount: factoryShiftProductions.plannedBatchCount,
        completedBatchCount: factoryShiftProductions.completedBatchCount,
        status: factoryShiftProductions.status,
        productName: factoryProducts.name,
      }).from(factoryShiftProductions)
        .leftJoin(factoryProducts, eq(factoryShiftProductions.productId, factoryProducts.id))
        .where(eq(factoryShiftProductions.shiftId, assignment.shiftId));

      res.json({ assigned: true, assignment, productions });
    } catch (error: unknown) {
      console.error("Get my assignment error:", error);
      res.status(500).json({ error: "Atama bilgisi alınamadı" });
    }
  });

  // Self-select machine (when no assignment exists)
  app.post("/api/factory-shifts/self-select-machine", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId, shiftId, machineId } = req.body;

      const result = await db.transaction(async (tx) => {
        const existing = await tx.select().from(factoryShiftWorkers)
          .where(and(
            eq(factoryShiftWorkers.shiftId, shiftId),
            eq(factoryShiftWorkers.userId, userId),
          ));

        if (existing.length > 0) {
          const [updated] = await tx.update(factoryShiftWorkers).set({
            machineId,
            selfSelected: true,
          }).where(eq(factoryShiftWorkers.id, existing[0].id)).returning();
          return updated;
        }

        const [worker] = await tx.insert(factoryShiftWorkers).values({
          shiftId,
          userId,
          machineId,
          selfSelected: true,
          role: "operator",
        }).returning();

        return worker;
      });

      res.json(result);
    } catch (error: unknown) {
      console.error("Self-select machine error:", error);
      res.status(500).json({ error: "Makine seçilemedi" });
    }
  });

  // ========================================
  // STATS & DASHBOARD
  // ========================================

  app.get("/api/factory-production-stats", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, userId } = req.query;
      let conditions: any[] = [];
      if (startDate) conditions.push(gte(factoryProductionBatches.startTime, new Date(startDate as string)));
      if (endDate) conditions.push(lte(factoryProductionBatches.startTime, new Date(endDate as string)));
      if (userId) conditions.push(eq(factoryProductionBatches.operatorUserId, userId as string));
      conditions.push(inArray(factoryProductionBatches.status, ["completed", "verified"]));

      const stats = await db.select({
        totalBatches: sql<number>`count(*)::int`,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        totalWeightKg: sql<string>`coalesce(sum(${factoryProductionBatches.actualWeightKg}::numeric), 0)::text`,
        totalWasteKg: sql<string>`coalesce(sum(${factoryProductionBatches.wasteWeightKg}::numeric), 0)::text`,
        totalWastePieces: sql<number>`coalesce(sum(${factoryProductionBatches.wastePieces}), 0)::int`,
        avgPerformanceScore: sql<string>`coalesce(avg(${factoryProductionBatches.performanceScore}::numeric), 0)::numeric(5,2)::text`,
        avgYieldRate: sql<string>`coalesce(avg(${factoryProductionBatches.yieldRate}::numeric), 0)::numeric(5,2)::text`,
        avgDurationMinutes: sql<number>`coalesce(avg(${factoryProductionBatches.actualDurationMinutes}), 0)::int`,
        targetExceededCount: sql<number>`count(*) filter (where ${factoryProductionBatches.actualDurationMinutes} > ${factoryProductionBatches.targetDurationMinutes} and ${factoryProductionBatches.targetDurationMinutes} is not null)::int`,
        verifiedCount: sql<number>`count(*) filter (where ${factoryProductionBatches.status} = 'verified')::int`,
      }).from(factoryProductionBatches)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Per-product breakdown
      const productBreakdown = await db.select({
        productId: factoryProductionBatches.productId,
        productName: factoryProducts.name,
        batchCount: sql<number>`count(*)::int`,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        totalWeightKg: sql<string>`coalesce(sum(${factoryProductionBatches.actualWeightKg}::numeric), 0)::text`,
        totalWasteKg: sql<string>`coalesce(sum(${factoryProductionBatches.wasteWeightKg}::numeric), 0)::text`,
        avgPerformance: sql<string>`coalesce(avg(${factoryProductionBatches.performanceScore}::numeric), 0)::numeric(5,2)::text`,
      }).from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(factoryProductionBatches.productId, factoryProducts.name);

      // Per-worker breakdown
      const workerBreakdown = await db.select({
        userId: factoryProductionBatches.operatorUserId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        batchCount: sql<number>`count(*)::int`,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        avgPerformance: sql<string>`coalesce(avg(${factoryProductionBatches.performanceScore}::numeric), 0)::numeric(5,2)::text`,
        avgYield: sql<string>`coalesce(avg(${factoryProductionBatches.yieldRate}::numeric), 0)::numeric(5,2)::text`,
        targetExceeded: sql<number>`count(*) filter (where ${factoryProductionBatches.actualDurationMinutes} > ${factoryProductionBatches.targetDurationMinutes})::int`,
      }).from(factoryProductionBatches)
        .leftJoin(users, eq(factoryProductionBatches.operatorUserId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(factoryProductionBatches.operatorUserId, users.firstName, users.lastName);

      res.json({
        summary: stats[0],
        productBreakdown,
        workerBreakdown,
      });
    } catch (error: unknown) {
      console.error("Get production stats error:", error);
      res.status(500).json({ error: "Üretim istatistikleri alınamadı" });
    }
  });

  // Team Performance & Compatibility Analysis
  app.get("/api/factory-team-analysis", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const { startDate, productId } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);

      let batchConditions: any[] = [
        gte(factoryProductionBatches.startTime, start),
        inArray(factoryProductionBatches.status, ["completed", "verified"]),
      ];
      if (productId) batchConditions.push(eq(factoryProductionBatches.productId, parseInt(productId as string)));

      // Get all completed batches with their shift workers
      const batches = await db.select({
        batchId: factoryProductionBatches.id,
        shiftId: factoryProductionBatches.shiftId,
        productId: factoryProductionBatches.productId,
        productName: factoryProducts.name,
        operatorUserId: factoryProductionBatches.operatorUserId,
        operatorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        actualPieces: factoryProductionBatches.actualPieces,
        actualWeightKg: factoryProductionBatches.actualWeightKg,
        performanceScore: factoryProductionBatches.performanceScore,
        yieldRate: factoryProductionBatches.yieldRate,
        actualDurationMinutes: factoryProductionBatches.actualDurationMinutes,
        targetDurationMinutes: factoryProductionBatches.targetDurationMinutes,
        wasteWeightKg: factoryProductionBatches.wasteWeightKg,
        wastePieces: factoryProductionBatches.wastePieces,
        startTime: factoryProductionBatches.startTime,
      }).from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .leftJoin(users, eq(factoryProductionBatches.operatorUserId, users.id))
        .where(and(...batchConditions))
        .orderBy(desc(factoryProductionBatches.startTime));

      // Get shift workers for those shifts
      const shiftIds = Array.from(new Set(batches.map(b => b.shiftId).filter(Boolean))) as number[];
      let shiftWorkerMap: Record<number, Array<{ userId: string; userName: string; role: string }>> = {};

      if (shiftIds.length > 0) {
        const sw = await db.select({
          shiftId: factoryShiftWorkers.shiftId,
          userId: factoryShiftWorkers.userId,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          role: factoryShiftWorkers.role,
        }).from(factoryShiftWorkers)
          .leftJoin(users, eq(factoryShiftWorkers.userId, users.id))
          .where(inArray(factoryShiftWorkers.shiftId, shiftIds));

        for (const w of sw) {
          if (!shiftWorkerMap[w.shiftId]) shiftWorkerMap[w.shiftId] = [];
          shiftWorkerMap[w.shiftId].push({ userId: w.userId, userName: w.userName || "", role: w.role || "operator" });
        }
      }

      // Build team combinations: for each shift, identify which workers worked together
      // Key = sorted list of worker userIds, Value = performance data
      const teamMap: Record<string, {
        workers: Array<{ userId: string; userName: string }>;
        shifts: number;
        totalBatches: number;
        totalPieces: number;
        avgPerformance: number;
        avgYield: number;
        totalWasteKg: number;
        products: Set<string>;
        performanceScores: number[];
      }> = {};

      for (const batch of batches) {
        if (!batch.shiftId) continue;
        const workers = shiftWorkerMap[batch.shiftId] || [];
        if (workers.length < 2) continue;

        const sortedIds = workers.map(w => w.userId).sort();
        const key = sortedIds.join("|");

        if (!teamMap[key]) {
          teamMap[key] = {
            workers: workers.map(w => ({ userId: w.userId, userName: w.userName }))
              .sort((a, b) => a.userId.localeCompare(b.userId)),
            shifts: 0,
            totalBatches: 0,
            totalPieces: 0,
            avgPerformance: 0,
            avgYield: 0,
            totalWasteKg: 0,
            products: new Set(),
            performanceScores: [],
          };
        }

        const team = teamMap[key];
        team.totalBatches++;
        team.totalPieces += batch.actualPieces || 0;
        team.totalWasteKg += parseFloat(String(batch.wasteWeightKg || "0"));
        if (batch.productName) team.products.add(batch.productName);
        if (batch.performanceScore) team.performanceScores.push(parseFloat(String(batch.performanceScore)));
      }

      // Count unique shifts per team
      const shiftsByTeam: Record<string, Set<number>> = {};
      for (const batch of batches) {
        if (!batch.shiftId) continue;
        const workers = shiftWorkerMap[batch.shiftId] || [];
        if (workers.length < 2) continue;
        const key = workers.map(w => w.userId).sort().join("|");
        if (!shiftsByTeam[key]) shiftsByTeam[key] = new Set();
        shiftsByTeam[key].add(batch.shiftId);
      }

      const teamAnalysis = Object.entries(teamMap).map(([key, team]) => {
        const avgPerf = team.performanceScores.length > 0
          ? team.performanceScores.reduce((a, b) => a + b, 0) / team.performanceScores.length
          : 0;
        return {
          teamKey: key,
          workers: team.workers,
          workerCount: team.workers.length,
          shiftCount: shiftsByTeam[key]?.size || 0,
          totalBatches: team.totalBatches,
          totalPieces: team.totalPieces,
          avgPerformance: parseFloat(avgPerf.toFixed(1)),
          totalWasteKg: parseFloat(team.totalWasteKg.toFixed(2)),
          products: Array.from(team.products),
        };
      })
        .filter(t => t.shiftCount >= 1)
        .sort((a, b) => b.avgPerformance - a.avgPerformance);

      // Individual worker comparison within shifts
      const workerShiftPerf: Record<string, {
        userId: string;
        userName: string;
        soloPerformances: number[];
        teamPerformances: number[];
        totalBatches: number;
        products: Set<string>;
      }> = {};

      for (const batch of batches) {
        if (!batch.operatorUserId) continue;
        const uid = batch.operatorUserId;
        if (!workerShiftPerf[uid]) {
          workerShiftPerf[uid] = {
            userId: uid,
            userName: batch.operatorName || "",
            soloPerformances: [],
            teamPerformances: [],
            totalBatches: 0,
            products: new Set(),
          };
        }
        const wp = workerShiftPerf[uid];
        wp.totalBatches++;
        if (batch.productName) wp.products.add(batch.productName);
        const perf = batch.performanceScore ? parseFloat(String(batch.performanceScore)) : 0;
        const workers = batch.shiftId ? (shiftWorkerMap[batch.shiftId] || []) : [];
        if (workers.length >= 2) {
          wp.teamPerformances.push(perf);
        } else {
          wp.soloPerformances.push(perf);
        }
      }

      const workerComparison = Object.values(workerShiftPerf).map(wp => {
        const avgSolo = wp.soloPerformances.length > 0
          ? wp.soloPerformances.reduce((a, b) => a + b, 0) / wp.soloPerformances.length : null;
        const avgTeam = wp.teamPerformances.length > 0
          ? wp.teamPerformances.reduce((a, b) => a + b, 0) / wp.teamPerformances.length : null;
        return {
          userId: wp.userId,
          userName: wp.userName,
          totalBatches: wp.totalBatches,
          avgSoloPerformance: avgSolo !== null ? parseFloat(avgSolo.toFixed(1)) : null,
          avgTeamPerformance: avgTeam !== null ? parseFloat(avgTeam.toFixed(1)) : null,
          teamBoost: avgSolo !== null && avgTeam !== null ? parseFloat((avgTeam - avgSolo).toFixed(1)) : null,
          products: Array.from(wp.products),
        };
      }).sort((a, b) => (b.avgTeamPerformance || 0) - (a.avgTeamPerformance || 0));

      res.json({
        teamAnalysis,
        workerComparison,
        totalBatches: batches.length,
        analyzedShifts: shiftIds.length,
      });
    } catch (error: unknown) {
      console.error("Team analysis error:", error);
      res.status(500).json({ error: "Takım analizi alınamadı" });
    }
  });

  // AI Production Recommendations
  app.get("/api/factory-ai-recommendations", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const monthAgo = new Date(Date.now() - 30 * 86400000);

      // 1. Get all active factory products with minStock
      const allProducts = await db.select({
        id: factoryProducts.id,
        name: factoryProducts.name,
        category: factoryProducts.category,
        unit: factoryProducts.unit,
        minStock: factoryProducts.minStock,
        sku: factoryProducts.sku,
      }).from(factoryProducts)
        .where(eq(factoryProducts.isActive, true));

      // 2. Get recent production volumes (last 7 days)
      const recentProduction = await db.select({
        productId: factoryProductionBatches.productId,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        totalWeightKg: sql<string>`coalesce(sum(${factoryProductionBatches.actualWeightKg}::numeric), 0)::text`,
        batchCount: sql<number>`count(*)::int`,
        avgPerformance: sql<string>`coalesce(avg(${factoryProductionBatches.performanceScore}::numeric), 0)::numeric(5,1)::text`,
      }).from(factoryProductionBatches)
        .where(and(
          gte(factoryProductionBatches.startTime, weekAgo),
          inArray(factoryProductionBatches.status, ["completed", "verified"]),
        ))
        .groupBy(factoryProductionBatches.productId);

      // 3. Get monthly production volumes for trend
      const monthlyProduction = await db.select({
        productId: factoryProductionBatches.productId,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        batchCount: sql<number>`count(*)::int`,
      }).from(factoryProductionBatches)
        .where(and(
          gte(factoryProductionBatches.startTime, monthAgo),
          inArray(factoryProductionBatches.status, ["completed", "verified"]),
        ))
        .groupBy(factoryProductionBatches.productId);

      // 4. Get current shift plans (upcoming)
      const today = new Date().toISOString().split("T")[0];
      const plannedProductions = await db.select({
        productId: factoryShiftProductions.productId,
        productName: factoryProducts.name,
        plannedBatchCount: sql<number>`coalesce(sum(${factoryShiftProductions.plannedBatchCount}), 0)::int`,
      }).from(factoryShiftProductions)
        .innerJoin(factoryShifts, eq(factoryShiftProductions.shiftId, factoryShifts.id))
        .leftJoin(factoryProducts, eq(factoryShiftProductions.productId, factoryProducts.id))
        .where(and(
          gte(factoryShifts.shiftDate, today),
          inArray(factoryShiftProductions.status, ["planned", "in_progress"]),
        ))
        .groupBy(factoryShiftProductions.productId, factoryProducts.name);

      // 5. Get batch specs for production capacity info
      const specs = await db.select({
        productId: factoryBatchSpecs.productId,
        batchWeightKg: factoryBatchSpecs.batchWeightKg,
        expectedPieces: factoryBatchSpecs.expectedPieces,
        targetDurationMinutes: factoryBatchSpecs.targetDurationMinutes,
      }).from(factoryBatchSpecs);

      // Build product summary for AI
      const productSummary = allProducts.map(p => {
        const recent = recentProduction.find(r => r.productId === p.id);
        const monthly = monthlyProduction.find(m => m.productId === p.id);
        const planned = plannedProductions.find(pl => pl.productId === p.id);
        const spec = specs.find(s => s.productId === p.id);

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          minStock: p.minStock,
          weeklyProduction: {
            pieces: recent?.totalPieces || 0,
            weightKg: parseFloat(recent?.totalWeightKg || "0"),
            batches: recent?.batchCount || 0,
            avgPerformance: recent?.avgPerformance || "0",
          },
          monthlyProduction: {
            pieces: monthly?.totalPieces || 0,
            batches: monthly?.batchCount || 0,
          },
          plannedBatches: planned?.plannedBatchCount || 0,
          batchSpec: spec ? {
            weightKg: spec.batchWeightKg,
            pieces: spec.expectedPieces,
            durationMin: spec.targetDurationMinutes,
          } : null,
        };
      });

      // Generate AI recommendation
      const prompt = `Sen bir fabrika üretim planlama uzmanısın. Aşağıdaki verilere göre bugünkü üretim önceliklerini belirle.

ÜRÜN VERİLERİ:
${JSON.stringify(productSummary.filter(p => p.monthlyProduction.batches > 0 || (p.minStock || 0) > 0).slice(0, 30), null, 2)}

KURALLAR:
1. Minimum stok seviyesinin altına düşme riski olan ürünlere öncelik ver
2. Haftalık üretimi düşen ürünleri tespit et
3. Zaten planlanan üretimleri dikkate al
4. Her öneri için tahmini batch sayısı ve zaman dilimi belirt

JSON formatında yanıt ver:
{
  "recommendations": [
    {
      "productId": number,
      "productName": "string",
      "priority": "critical" | "high" | "medium" | "low",
      "reason": "string (Türkçe kısa açıklama)",
      "suggestedBatches": number,
      "suggestedShift": "morning" | "afternoon" | "night",
      "estimatedDurationHours": number
    }
  ],
  "summary": "string (Türkçe genel özet, max 2 cümle)"
}`;

      const completion = await aiClient.chat({
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500,
      });

      let aiResponse: any = { recommendations: [], summary: "Veri yetersiz" };
      try {
        const content = completion.choices[0]?.message?.content;
        if (content) aiResponse = JSON.parse(content);
      } catch (e) {
        console.error("AI response parse error:", e);
      }

      res.json({
        recommendations: aiResponse.recommendations || [],
        summary: aiResponse.summary || "",
        productSummary: productSummary.filter(p => p.monthlyProduction.batches > 0 || (p.minStock || 0) > 0),
        generatedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("AI recommendations error:", error);
      res.status(500).json({ error: "AI önerileri alınamadı" });
    }
  });

  // Worker's own dashboard data
  app.get("/api/factory-worker-dashboard/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user as any;
      const supervisorRoles = ["super_admin", "factory_director", "factory_supervisor", "factory_quality_manager", "genel_mudur", "operasyon_muduru"];
      if (currentUser.id !== userId && !supervisorRoles.includes(currentUser.role)) {
        return res.status(403).json({ error: "Bu veriye erişim yetkiniz yok" });
      }
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      // Today's shift assignment
      const assignments = await db.select({
        shiftId: factoryShifts.id,
        shiftDate: factoryShifts.shiftDate,
        shiftType: factoryShifts.shiftType,
        startTime: factoryShifts.startTime,
        endTime: factoryShifts.endTime,
        machineId: factoryShiftWorkers.machineId,
        machineName: factoryMachines.name,
        role: factoryShiftWorkers.role,
      }).from(factoryShiftWorkers)
        .innerJoin(factoryShifts, eq(factoryShiftWorkers.shiftId, factoryShifts.id))
        .leftJoin(factoryMachines, eq(factoryShiftWorkers.machineId, factoryMachines.id))
        .where(and(
          eq(factoryShiftWorkers.userId, userId),
          eq(factoryShifts.shiftDate, today),
        ));

      // Today's batches
      const todayBatches = await db.select({
        id: factoryProductionBatches.id,
        productName: factoryProducts.name,
        batchNumber: factoryProductionBatches.batchNumber,
        startTime: factoryProductionBatches.startTime,
        endTime: factoryProductionBatches.endTime,
        actualPieces: factoryProductionBatches.actualPieces,
        targetPieces: factoryProductionBatches.targetPieces,
        actualDurationMinutes: factoryProductionBatches.actualDurationMinutes,
        targetDurationMinutes: factoryProductionBatches.targetDurationMinutes,
        wasteWeightKg: factoryProductionBatches.wasteWeightKg,
        wastePieces: factoryProductionBatches.wastePieces,
        performanceScore: factoryProductionBatches.performanceScore,
        yieldRate: factoryProductionBatches.yieldRate,
        status: factoryProductionBatches.status,
      }).from(factoryProductionBatches)
        .leftJoin(factoryProducts, eq(factoryProductionBatches.productId, factoryProducts.id))
        .where(and(
          eq(factoryProductionBatches.operatorUserId, userId),
          gte(factoryProductionBatches.startTime, new Date(today)),
        ))
        .orderBy(desc(factoryProductionBatches.startTime));

      // Weekly performance
      const weeklyStats = await db.select({
        totalBatches: sql<number>`count(*)::int`,
        totalPieces: sql<number>`coalesce(sum(${factoryProductionBatches.actualPieces}), 0)::int`,
        avgPerformance: sql<string>`coalesce(avg(${factoryProductionBatches.performanceScore}::numeric), 0)::numeric(5,2)::text`,
        avgYield: sql<string>`coalesce(avg(${factoryProductionBatches.yieldRate}::numeric), 0)::numeric(5,2)::text`,
        totalWasteKg: sql<string>`coalesce(sum(${factoryProductionBatches.wasteWeightKg}::numeric), 0)::text`,
        targetExceeded: sql<number>`count(*) filter (where ${factoryProductionBatches.actualDurationMinutes} > ${factoryProductionBatches.targetDurationMinutes})::int`,
      }).from(factoryProductionBatches)
        .where(and(
          eq(factoryProductionBatches.operatorUserId, userId),
          gte(factoryProductionBatches.startTime, new Date(weekAgo)),
          inArray(factoryProductionBatches.status, ["completed", "verified"]),
        ));

      res.json({
        todayShift: assignments[0] || null,
        todayBatches,
        weeklyStats: weeklyStats[0],
      });
    } catch (error: unknown) {
      console.error("Get worker dashboard error:", error);
      res.status(500).json({ error: "Dashboard verisi alınamadı" });
    }
  });
}
