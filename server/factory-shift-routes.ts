import { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, inArray, isNull } from "drizzle-orm";
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

const FACTORY_ROLES = ["admin", "fabrika_mudur", "fabrika_operator", "fabrika_supervisor", "supervisor"];

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

export function registerFactoryShiftRoutes(app: Express) {
  // ========================================
  // FACTORY SHIFTS CRUD
  // ========================================

  app.get("/api/factory-shifts", isAuthenticated, async (req: Request, res: Response) => {
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
        workers = await db.select({
          id: factoryShiftWorkers.id,
          shiftId: factoryShiftWorkers.shiftId,
          userId: factoryShiftWorkers.userId,
          machineId: factoryShiftWorkers.machineId,
          role: factoryShiftWorkers.role,
          selfSelected: factoryShiftWorkers.selfSelected,
          notes: factoryShiftWorkers.notes,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          machineName: factoryMachines.name,
        }).from(factoryShiftWorkers)
          .leftJoin(users, eq(factoryShiftWorkers.userId, users.id))
          .leftJoin(factoryMachines, eq(factoryShiftWorkers.machineId, factoryMachines.id))
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
    } catch (error: any) {
      console.error("Get factory shifts error:", error);
      res.status(500).json({ error: "Vardiyalar alınamadı" });
    }
  });

  app.post("/api/factory-shifts", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const parseResult = insertFactoryShiftSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      const [shift] = await db.insert(factoryShifts).values({
        ...parseResult.data,
        createdById: (req as any).user?.id,
      }).returning();
      res.json(shift);
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Update factory shift error:", error);
      res.status(500).json({ error: "Vardiya güncellenemedi" });
    }
  });

  app.delete("/api/factory-shifts/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShifts).where(eq(factoryShifts.id, id));
      res.json({ success: true });
    } catch (error: any) {
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
      const { userId, machineId, role, notes } = req.body;

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
        role: role || "operator",
        notes,
      }).returning();
      res.json(worker);
    } catch (error: any) {
      console.error("Add shift worker error:", error);
      res.status(500).json({ error: "Çalışan atanamadı" });
    }
  });

  app.delete("/api/factory-shift-workers/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShiftWorkers).where(eq(factoryShiftWorkers.id, id));
      res.json({ success: true });
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Add shift production error:", error);
      res.status(500).json({ error: "Üretim planı eklenemedi" });
    }
  });

  app.delete("/api/factory-shift-productions/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryShiftProductions).where(eq(factoryShiftProductions.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove shift production error:", error);
      res.status(500).json({ error: "Üretim planı kaldırılamadı" });
    }
  });

  // ========================================
  // BATCH SPECS (Batch Spesifikasyonları)
  // ========================================

  app.get("/api/factory-batch-specs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const specs = await db.select({
        id: factoryBatchSpecs.id,
        productId: factoryBatchSpecs.productId,
        machineId: factoryBatchSpecs.machineId,
        batchWeightKg: factoryBatchSpecs.batchWeightKg,
        expectedPieces: factoryBatchSpecs.expectedPieces,
        pieceWeightGrams: factoryBatchSpecs.pieceWeightGrams,
        targetDurationMinutes: factoryBatchSpecs.targetDurationMinutes,
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
    } catch (error: any) {
      console.error("Get batch specs error:", error);
      res.status(500).json({ error: "Batch spesifikasyonları alınamadı" });
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Update batch spec error:", error);
      res.status(500).json({ error: "Batch spesifikasyonu güncellenemedi" });
    }
  });

  app.delete("/api/factory-batch-specs/:id", isFactoryUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(factoryBatchSpecs).where(eq(factoryBatchSpecs.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete batch spec error:", error);
      res.status(500).json({ error: "Batch spesifikasyonu silinemedi" });
    }
  });

  // ========================================
  // PRODUCTION BATCHES (Üretim Batch'leri)
  // ========================================

  app.get("/api/factory-production-batches", isAuthenticated, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Get production batches error:", error);
      res.status(500).json({ error: "Üretim batch'leri alınamadı" });
    }
  });

  // Start a new batch
  app.post("/api/factory-production-batches/start", isAuthenticated, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Start batch error:", error);
      res.status(500).json({ error: "Batch başlatılamadı" });
    }
  });

  // Complete a batch (worker submits production data)
  app.put("/api/factory-production-batches/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { actualWeightKg, actualPieces, wasteWeightKg, wastePieces, wasteReasonId, wasteNotes, photoUrl, notes } = req.body;

      const [batch] = await db.select().from(factoryProductionBatches).where(eq(factoryProductionBatches.id, id));
      if (!batch) return res.status(404).json({ error: "Batch bulunamadı" });

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

      const [updated] = await db.update(factoryProductionBatches).set({
        endTime,
        actualWeightKg: actualWeightKg?.toString(),
        actualPieces,
        actualDurationMinutes,
        wasteWeightKg: wasteWeightKg?.toString() || "0",
        wastePieces: wastePieces || 0,
        wasteReasonId: wasteReasonId || null,
        wasteNotes,
        performanceScore: performanceScore?.toString(),
        yieldRate: yieldRate?.toString(),
        photoUrl,
        notes,
        status: "completed",
      }).where(eq(factoryProductionBatches.id, id)).returning();

      // Update shift production completed count
      if (batch.shiftProductionId) {
        await db.update(factoryShiftProductions).set({
          completedBatchCount: sql`${factoryShiftProductions.completedBatchCount} + 1`,
        }).where(eq(factoryShiftProductions.id, batch.shiftProductionId));
      }

      // Check if target duration exceeded - add warning flag
      let warning = null;
      if (targetDur && actualDurationMinutes > targetDur) {
        warning = `Hedef süre aşıldı! Hedef: ${targetDur} dk, Gerçekleşen: ${actualDurationMinutes} dk`;
      }

      res.json({ ...updated, warning });
    } catch (error: any) {
      console.error("Complete batch error:", error);
      res.status(500).json({ error: "Batch tamamlanamadı" });
    }
  });

  // ========================================
  // BATCH VERIFICATIONS (Doğrulama)
  // ========================================

  app.get("/api/factory-batch-verifications/pending", isAuthenticated, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Get pending verifications error:", error);
      res.status(500).json({ error: "Doğrulama bekleyenler alınamadı" });
    }
  });

  app.post("/api/factory-batch-verifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { batchId, verifiedWeightKg, verifiedPieces, verifiedWasteKg, verifiedWastePieces, isApproved, rejectionReason, notes } = req.body;

      const [verification] = await db.insert(factoryBatchVerifications).values({
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
      await db.update(factoryProductionBatches).set({
        status: isApproved ? "verified" : "rejected",
      }).where(eq(factoryProductionBatches.id, batchId));

      res.json(verification);
    } catch (error: any) {
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
      const today = new Date().toISOString().split("T")[0];

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
    } catch (error: any) {
      console.error("Get my assignment error:", error);
      res.status(500).json({ error: "Atama bilgisi alınamadı" });
    }
  });

  // Self-select machine (when no assignment exists)
  app.post("/api/factory-shifts/self-select-machine", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId, shiftId, machineId } = req.body;

      const existing = await db.select().from(factoryShiftWorkers)
        .where(and(
          eq(factoryShiftWorkers.shiftId, shiftId),
          eq(factoryShiftWorkers.userId, userId),
        ));

      if (existing.length > 0) {
        const [updated] = await db.update(factoryShiftWorkers).set({
          machineId,
          selfSelected: true,
        }).where(eq(factoryShiftWorkers.id, existing[0].id)).returning();
        return res.json(updated);
      }

      const [worker] = await db.insert(factoryShiftWorkers).values({
        shiftId,
        userId,
        machineId,
        selfSelected: true,
        role: "operator",
      }).returning();

      res.json(worker);
    } catch (error: any) {
      console.error("Self-select machine error:", error);
      res.status(500).json({ error: "Makine seçilemedi" });
    }
  });

  // ========================================
  // STATS & DASHBOARD
  // ========================================

  app.get("/api/factory-production-stats", isAuthenticated, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Get production stats error:", error);
      res.status(500).json({ error: "Üretim istatistikleri alınamadı" });
    }
  });

  // Worker's own dashboard data
  app.get("/api/factory-worker-dashboard/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
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
    } catch (error: any) {
      console.error("Get worker dashboard error:", error);
      res.status(500).json({ error: "Dashboard verisi alınamadı" });
    }
  });
}
