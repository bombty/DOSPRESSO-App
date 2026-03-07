import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { 
  branchInventory, 
  branchStockMovements, 
  factoryProducts, 
  branches, 
  users,
  hasPermission, 
  isHQRole, 
  type UserRoleType 
} from "@shared/schema";
import { eq, and, desc, sql, lte, gte, count } from "drizzle-orm";
import { handleApiError, parsePagination, wrapPaginatedResponse } from "./helpers";
import { z } from "zod";
import { auditLog } from "../audit";

const router = Router();

function canAccessBranch(user: any, branchId: number): boolean {
  const role = user.role as UserRoleType;
  if (role === 'admin' || role === 'ceo' || role === 'cgo') return true;
  if (isHQRole(role)) return true;
  if (user.branchId === branchId) return true;
  return false;
}

router.get("/api/branch-inventory/:branchId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!hasPermission(user.role as UserRoleType, 'branch_inventory', 'view')) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    if (!canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const inventory = await db
      .select({
        id: branchInventory.id,
        branchId: branchInventory.branchId,
        productId: branchInventory.productId,
        currentStock: branchInventory.currentStock,
        minimumStock: branchInventory.minimumStock,
        unit: branchInventory.unit,
        lastReceivedAt: branchInventory.lastReceivedAt,
        lastCountedAt: branchInventory.lastCountedAt,
        createdAt: branchInventory.createdAt,
        updatedAt: branchInventory.updatedAt,
        productName: factoryProducts.name,
        productSku: factoryProducts.sku,
        productCategory: factoryProducts.category,
        productUnit: factoryProducts.unit,
      })
      .from(branchInventory)
      .leftJoin(factoryProducts, eq(branchInventory.productId, factoryProducts.id))
      .where(eq(branchInventory.branchId, branchId))
      .orderBy(factoryProducts.name);

    res.json(inventory);
  } catch (error) {
    handleApiError(res, error, "BranchInventory:list");
  }
});

router.get("/api/branch-inventory/:branchId/movements", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!hasPermission(user.role as UserRoleType, 'branch_inventory', 'view')) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    if (!canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const pagination = parsePagination(req.query as Record<string, any>);

    const productIdFilter = req.query.productId ? parseInt(req.query.productId as string) : null;
    const typeFilter = req.query.movementType as string | undefined;

    const conditions = [eq(branchStockMovements.branchId, branchId)];
    if (productIdFilter && !isNaN(productIdFilter)) {
      conditions.push(eq(branchStockMovements.productId, productIdFilter));
    }
    if (typeFilter) {
      conditions.push(eq(branchStockMovements.movementType, typeFilter));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [totalResult] = await db
      .select({ total: count() })
      .from(branchStockMovements)
      .where(whereClause);

    const movements = await db
      .select({
        id: branchStockMovements.id,
        branchId: branchStockMovements.branchId,
        productId: branchStockMovements.productId,
        movementType: branchStockMovements.movementType,
        quantity: branchStockMovements.quantity,
        previousStock: branchStockMovements.previousStock,
        newStock: branchStockMovements.newStock,
        referenceType: branchStockMovements.referenceType,
        referenceId: branchStockMovements.referenceId,
        lotNumber: branchStockMovements.lotNumber,
        expiryDate: branchStockMovements.expiryDate,
        notes: branchStockMovements.notes,
        createdById: branchStockMovements.createdById,
        createdAt: branchStockMovements.createdAt,
        productName: factoryProducts.name,
        productSku: factoryProducts.sku,
      })
      .from(branchStockMovements)
      .leftJoin(factoryProducts, eq(branchStockMovements.productId, factoryProducts.id))
      .where(whereClause)
      .orderBy(desc(branchStockMovements.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const total = totalResult?.total || 0;
    res.json(wrapPaginatedResponse(movements, total, pagination));
  } catch (error) {
    handleApiError(res, error, "BranchInventory:movements");
  }
});

const wasteSchema = z.object({
  productId: z.number(),
  quantity: z.number().positive("Miktar pozitif olmalı"),
  reason: z.string().optional(),
});

router.post("/api/branch-inventory/:branchId/waste", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!hasPermission(user.role as UserRoleType, 'branch_inventory', 'create')) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    if (!canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const parsed = wasteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const { productId, quantity, reason } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(branchInventory)
        .where(and(
          eq(branchInventory.branchId, branchId),
          eq(branchInventory.productId, productId)
        ))
        .for("update");

      const previousStock = parseFloat(existing?.currentStock || "0");
      const newStock = Math.max(0, previousStock - quantity);

      if (existing) {
        await tx
          .update(branchInventory)
          .set({ currentStock: String(newStock), updatedAt: new Date() })
          .where(eq(branchInventory.id, existing.id));
      } else {
        await tx.insert(branchInventory).values({
          branchId,
          productId,
          currentStock: String(newStock),
          minimumStock: "5",
        });
      }

      const [movement] = await tx.insert(branchStockMovements).values({
        branchId,
        productId,
        movementType: "zayiat",
        quantity: String(-quantity),
        previousStock: String(previousStock),
        newStock: String(newStock),
        referenceType: "waste",
        notes: reason || "Zayiat kaydı",
        createdById: user.id,
      }).returning();

      return { movement, previousStock, newStock };
    });

    auditLog(req, { eventType: "branch_inventory.waste", action: "waste_recorded", resource: "branch_inventory", resourceId: String(branchId), details: { productId, quantity, reason, previousStock: result.previousStock, newStock: result.newStock } });

    res.json({
      message: "Zayiat kaydı oluşturuldu",
      movement: result.movement,
      previousStock: result.previousStock,
      newStock: result.newStock,
    });
  } catch (error) {
    handleApiError(res, error, "BranchInventory:waste");
  }
});

const countSchema = z.object({
  productId: z.number(),
  countedQuantity: z.number().min(0, "Sayım miktarı negatif olamaz"),
});

router.post("/api/branch-inventory/:branchId/count", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!hasPermission(user.role as UserRoleType, 'branch_inventory', 'edit')) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    if (!canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const parsed = countSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const { productId, countedQuantity } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(branchInventory)
        .where(and(
          eq(branchInventory.branchId, branchId),
          eq(branchInventory.productId, productId)
        ))
        .for("update");

      const previousStock = parseFloat(existing?.currentStock || "0");
      const diff = countedQuantity - previousStock;

      if (existing) {
        await tx
          .update(branchInventory)
          .set({
            currentStock: String(countedQuantity),
            lastCountedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(branchInventory.id, existing.id));
      } else {
        await tx.insert(branchInventory).values({
          branchId,
          productId,
          currentStock: String(countedQuantity),
          minimumStock: "5",
          lastCountedAt: new Date(),
        });
      }

      const [movement] = await tx.insert(branchStockMovements).values({
        branchId,
        productId,
        movementType: "sayim_duzeltme",
        quantity: String(diff),
        previousStock: String(previousStock),
        newStock: String(countedQuantity),
        referenceType: "count",
        notes: `Sayım düzeltmesi: ${previousStock} → ${countedQuantity} (fark: ${diff > 0 ? '+' : ''}${diff})`,
        createdById: user.id,
      }).returning();

      return { movement, previousStock, newStock: countedQuantity, diff };
    });

    auditLog(req, { eventType: "branch_inventory.count_correction", action: "count_corrected", resource: "branch_inventory", resourceId: String(branchId), details: { productId, countedQuantity, previousStock: result.previousStock, newStock: result.newStock, diff: result.diff } });

    res.json({
      message: "Sayım düzeltmesi kaydedildi",
      movement: result.movement,
      previousStock: result.previousStock,
      newStock: result.newStock,
      diff: result.diff,
    });
  } catch (error) {
    handleApiError(res, error, "BranchInventory:count");
  }
});

router.get("/api/branch-inventory/:branchId/expiring", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);

    if (isNaN(branchId)) {
      return res.status(400).json({ message: "Geçersiz şube ID" });
    }

    if (!hasPermission(user.role as UserRoleType, 'branch_inventory', 'view')) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    if (!canAccessBranch(user, branchId)) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const daysAhead = parseInt(req.query.days as string) || 7;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const expiringItems = await db
      .select({
        id: branchStockMovements.id,
        branchId: branchStockMovements.branchId,
        productId: branchStockMovements.productId,
        lotNumber: branchStockMovements.lotNumber,
        expiryDate: branchStockMovements.expiryDate,
        quantity: branchStockMovements.quantity,
        movementType: branchStockMovements.movementType,
        createdAt: branchStockMovements.createdAt,
        productName: factoryProducts.name,
        productSku: factoryProducts.sku,
      })
      .from(branchStockMovements)
      .leftJoin(factoryProducts, eq(branchStockMovements.productId, factoryProducts.id))
      .where(and(
        eq(branchStockMovements.branchId, branchId),
        lte(branchStockMovements.expiryDate, futureDate),
        gte(branchStockMovements.expiryDate, now),
        eq(branchStockMovements.movementType, "sevkiyat_giris"),
      ))
      .orderBy(branchStockMovements.expiryDate);

    res.json(expiringItems);
  } catch (error) {
    handleApiError(res, error, "BranchInventory:expiring");
  }
});

export default router;
