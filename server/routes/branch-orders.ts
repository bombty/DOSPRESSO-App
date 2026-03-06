import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, sql, sum } from "drizzle-orm";
import {
  hasPermission,
  isHQRole,
  type UserRoleType,
  branchOrders,
  branchOrderItems,
  factoryProducts,
  factoryInventory,
  users,
  branches,
  notifications,
} from "../../shared/schema";

const router = Router();

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `ORD-${y}${m}${d}-${seq}`;
}

router.post("/api/branch-orders", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user?.role as UserRoleType;
    if (!hasPermission(userRole, "branch_orders", "create")) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const { items, requestedDeliveryDate, priority, notes } = req.body;
    let { branchId } = req.body;

    if (!isHQRole(userRole) && !['fabrika_mudur', 'fabrika'].includes(userRole)) {
      branchId = req.user.branchId ? Number(req.user.branchId) : branchId;
    }

    if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Şube ve en az bir ürün gerekli" });
    }

    const orderNumber = generateOrderNumber();

    const order = await storage.createBranchOrder({
      orderNumber,
      branchId,
      status: "pending",
      priority: priority || "normal",
      requestedById: req.user.id,
      requestedDeliveryDate: requestedDeliveryDate || null,
      notes: notes || null,
    });

    let totalAmount = 0;
    const createdItems = [];
    for (const item of items) {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      totalAmount += itemTotal;
      const created = await storage.createBranchOrderItem({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit || "adet",
        unitPrice: item.unitPrice || 0,
        totalPrice: itemTotal,
        notes: item.notes || null,
      });
      createdItems.push(created);
    }

    await storage.updateBranchOrder(order.id, { totalAmount });

    const [branchInfo] = await db.select({ name: branches.name }).from(branches)
      .where(eq(branches.id, branchId)).limit(1);

    const fabrikaMudurleri = await db.select({ id: users.id }).from(users)
      .where(sql`${users.role} IN ('fabrika_mudur', 'admin')`);
    for (const fm of fabrikaMudurleri) {
      await db.insert(notifications).values({
        userId: fm.id,
        type: 'branch_order_created',
        title: 'Yeni Şube Siparişi',
        message: `${branchInfo?.name || 'Şube'} yeni sipariş oluşturdu — ${items.length} ürün, ${orderNumber}`,
      });
    }

    res.status(201).json({ ...order, totalAmount, items: createdItems });
  } catch (error: any) {
    console.error("Create branch order error:", error);
    res.status(500).json({ message: "Sipariş oluşturulamadı" });
  }
});

router.get("/api/branch-orders", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user?.role as UserRoleType;
    if (!hasPermission(userRole, "branch_orders", "view")) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const statusFilter = req.query.status as string | undefined;
    let branchIdFilter: number | undefined = req.query.branchId
      ? parseInt(req.query.branchId as string)
      : undefined;

    if (
      userRole === "supervisor" ||
      userRole === "supervisor_buddy" ||
      userRole === "mudur"
    ) {
      branchIdFilter = req.user.branchId ? Number(req.user.branchId) : branchIdFilter;
    }

    const orders = await storage.getBranchOrders(branchIdFilter, statusFilter);

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const [branch] = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.id, order.branchId))
          .limit(1);
        return { ...order, branchName: branch?.name || "Bilinmiyor" };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error("Get branch orders error:", error);
    res.status(500).json({ message: "Siparişler getirilemedi" });
  }
});

router.get("/api/branch-orders/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user?.role as UserRoleType;
    if (!hasPermission(userRole, "branch_orders", "view")) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const id = parseInt(req.params.id);
    const order = await storage.getBranchOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" });
    }

    if (!isHQRole(userRole) && !['fabrika_mudur', 'fabrika', 'admin'].includes(userRole)) {
      if (req.user.branchId && Number(req.user.branchId) !== order.branchId) {
        return res.status(403).json({ message: "Bu siparişe erişim yetkiniz yok" });
      }
    }

    const items = await storage.getBranchOrderItems(id);

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select({ id: factoryProducts.id, name: factoryProducts.name, category: factoryProducts.category })
          .from(factoryProducts)
          .where(eq(factoryProducts.id, item.productId))
          .limit(1);
        return {
          ...item,
          productName: product?.name || "Bilinmiyor",
          productCategory: product?.category || null,
        };
      })
    );

    const [branch] = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.id, order.branchId))
      .limit(1);

    const [requester] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, order.requestedById))
      .limit(1);

    res.json({
      ...order,
      branchName: branch?.name || "Bilinmiyor",
      requestedByName: requester
        ? `${requester.firstName} ${requester.lastName}`
        : "Bilinmiyor",
      items: enrichedItems,
    });
  } catch (error: any) {
    console.error("Get branch order detail error:", error);
    res.status(500).json({ message: "Sipariş detayı getirilemedi" });
  }
});

router.patch("/api/branch-orders/:id/approve", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user?.role as UserRoleType;
    if (!["admin", "fabrika_mudur", "fabrika"].includes(userRole)) {
      return res.status(403).json({ message: "Sadece fabrika müdürü veya admin onaylayabilir" });
    }

    const id = parseInt(req.params.id);
    const order = await storage.getBranchOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Sadece bekleyen siparişler onaylanabilir" });
    }

    const items = await storage.getBranchOrderItems(id);
    const stockWarnings: string[] = [];

    for (const item of items) {
      const inventoryRows = await db
        .select({
          totalQty: sum(factoryInventory.quantity),
        })
        .from(factoryInventory)
        .where(eq(factoryInventory.productId, item.productId));

      const availableStock = Number(inventoryRows[0]?.totalQty || 0);

      let approvedQty = item.quantity;
      if (availableStock < item.quantity) {
        approvedQty = Math.max(0, availableStock);
        const [product] = await db
          .select({ name: factoryProducts.name })
          .from(factoryProducts)
          .where(eq(factoryProducts.id, item.productId))
          .limit(1);
        stockWarnings.push(
          `${product?.name || "Ürün"}: Talep ${item.quantity}, Stok ${availableStock}, Onaylanan ${approvedQty}`
        );
      }

      await storage.updateBranchOrderItem(item.id, {
        approvedQuantity: approvedQty,
      });
    }

    const updated = await storage.updateBranchOrder(id, {
      status: "approved",
      approvedById: req.user.id,
      approvedAt: new Date(),
    } as any);

    const supervisors = await db.select({ id: users.id }).from(users)
      .where(and(
        eq(users.branchId, order.branchId),
        sql`${users.role} IN ('supervisor', 'mudur')`
      ));
    for (const sup of supervisors) {
      await db.insert(notifications).values({
        userId: sup.id,
        type: 'branch_order_approved',
        title: 'Sipariş Onaylandı',
        message: `${order.orderNumber} numaralı siparişiniz onaylandı` + (stockWarnings.length > 0 ? ` (${stockWarnings.length} üründe stok uyarısı)` : ''),
      });
    }

    res.json({
      ...updated,
      stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
    });
  } catch (error: any) {
    console.error("Approve branch order error:", error);
    res.status(500).json({ message: "Sipariş onaylanamadı" });
  }
});

router.patch("/api/branch-orders/:id/cancel", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user?.role as UserRoleType;
    if (!hasPermission(userRole, "branch_orders", "edit")) {
      return res.status(403).json({ message: "Yetkiniz yok" });
    }

    const id = parseInt(req.params.id);
    const order = await storage.getBranchOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" });
    }

    if (!isHQRole(userRole) && !['fabrika_mudur', 'fabrika', 'admin'].includes(userRole)) {
      if (req.user.branchId && Number(req.user.branchId) !== order.branchId) {
        return res.status(403).json({ message: "Bu siparişe erişim yetkiniz yok" });
      }
    }

    if (!["pending", "approved"].includes(order.status)) {
      return res.status(400).json({
        message: "Sadece bekleyen veya onaylanmış siparişler iptal edilebilir",
      });
    }

    const { reason } = req.body;

    const updated = await storage.updateBranchOrder(id, {
      status: "cancelled",
      rejectionReason: reason || "İptal edildi",
    } as any);

    const supervisors = await db.select({ id: users.id }).from(users)
      .where(and(
        eq(users.branchId, order.branchId),
        sql`${users.role} IN ('supervisor', 'mudur')`
      ));
    for (const sup of supervisors) {
      await db.insert(notifications).values({
        userId: sup.id,
        type: 'branch_order_cancelled',
        title: 'Sipariş İptal Edildi',
        message: `${order.orderNumber} numaralı sipariş iptal edildi: ${reason || 'Sebep belirtilmedi'}`,
      });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Cancel branch order error:", error);
    res.status(500).json({ message: "Sipariş iptal edilemedi" });
  }
});

export default router;
