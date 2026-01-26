import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { 
  inventory, 
  inventoryMovements, 
  suppliers, 
  productSuppliers,
  purchaseOrders, 
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  productionRecords,
  productionIngredients,
  recipeIngredients,
  insertInventorySchema,
  insertSupplierSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertGoodsReceiptSchema,
  insertGoodsReceiptItemSchema,
  insertInventoryMovementSchema
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, asc } from "drizzle-orm";

type AuthMiddleware = (req: Request, res: Response, next: () => void) => void;

export function registerSatinalmaRoutes(app: Express, isAuthenticated: AuthMiddleware) {
  
  // ========================================
  // STOK YÖNETİMİ - Inventory
  // ========================================
  
  // Tüm stok listesi
  app.get("/api/inventory", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category, search, lowStock } = req.query;
      
      let conditions = [];
      conditions.push(eq(inventory.isActive, true));
      
      if (category && category !== "all") {
        conditions.push(eq(inventory.category, category as string));
      }
      
      if (search) {
        conditions.push(or(
          like(inventory.name, `%${search}%`),
          like(inventory.code, `%${search}%`)
        ));
      }
      
      const items = await db.select()
        .from(inventory)
        .where(and(...conditions))
        .orderBy(asc(inventory.name));
      
      // Düşük stok filtresi
      let result = items;
      if (lowStock === "true") {
        result = items.filter(item => 
          parseFloat(item.currentStock) <= parseFloat(item.minimumStock)
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Stok listesi alınamadı" });
    }
  });
  
  // Tek stok kalemi
  app.get("/api/inventory/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select()
        .from(inventory)
        .where(eq(inventory.id, id));
      
      if (!item) {
        return res.status(404).json({ error: "Stok kalemi bulunamadı" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ error: "Stok kalemi alınamadı" });
    }
  });
  
  // Yeni stok kalemi ekle
  app.post("/api/inventory", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validatedData = insertInventorySchema.parse({
        ...req.body,
        createdById: user?.id
      });
      
      const [newItem] = await db.insert(inventory)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Stok kalemi oluşturulamadı" });
    }
  });
  
  // Stok kalemi güncelle
  app.patch("/api/inventory/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const [updated] = await db.update(inventory)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(inventory.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Stok kalemi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Stok kalemi güncellenemedi" });
    }
  });
  
  // Stok hareketi ekle
  app.post("/api/inventory/:id/movement", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const inventoryId = parseInt(req.params.id);
      const { movementType, quantity, notes, batchNumber, expiryDate, fromLocation, toLocation, referenceType, referenceId } = req.body;
      
      // Mevcut stoğu al
      const [currentItem] = await db.select()
        .from(inventory)
        .where(eq(inventory.id, inventoryId));
      
      if (!currentItem) {
        return res.status(404).json({ error: "Stok kalemi bulunamadı" });
      }
      
      const previousStock = parseFloat(currentItem.currentStock);
      let newStock = previousStock;
      
      // Hareket tipine göre stok hesapla
      const incomingTypes = ["giris", "uretim_giris", "iade"];
      const outgoingTypes = ["cikis", "uretim_cikis", "fire"];
      
      if (incomingTypes.includes(movementType)) {
        newStock = previousStock + parseFloat(quantity);
      } else if (outgoingTypes.includes(movementType)) {
        newStock = previousStock - parseFloat(quantity);
        if (newStock < 0) {
          return res.status(400).json({ error: "Yetersiz stok" });
        }
      } else if (movementType === "sayim_duzeltme") {
        newStock = parseFloat(quantity); // Direkt değer ataması
      }
      
      // Stok hareketini kaydet
      const [movement] = await db.insert(inventoryMovements)
        .values({
          inventoryId,
          movementType,
          quantity: quantity.toString(),
          previousStock: previousStock.toString(),
          newStock: newStock.toString(),
          notes,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          fromLocation,
          toLocation,
          referenceType,
          referenceId,
          createdById: user?.id
        })
        .returning();
      
      // Stok miktarını güncelle
      await db.update(inventory)
        .set({ 
          currentStock: newStock.toString(),
          updatedAt: new Date()
        })
        .where(eq(inventory.id, inventoryId));
      
      res.status(201).json(movement);
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ error: "Stok hareketi kaydedilemedi" });
    }
  });
  
  // Stok hareketleri geçmişi
  app.get("/api/inventory/:id/movements", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const inventoryId = parseInt(req.params.id);
      
      const movements = await db.select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryId, inventoryId))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(100);
      
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ error: "Stok hareketleri alınamadı" });
    }
  });
  
  // Ürün tedarikçileri
  app.get("/api/inventory/:id/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const inventoryId = parseInt(req.params.id);
      
      const result = await db.select({
        id: productSuppliers.id,
        supplierName: suppliers.name,
        supplierCode: suppliers.code,
        unitPrice: productSuppliers.unitPrice,
        leadTime: productSuppliers.leadTimeDays,
        isPrimary: productSuppliers.isPrimary,
        preferenceOrder: productSuppliers.preferenceOrder,
      })
        .from(productSuppliers)
        .leftJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
        .where(eq(productSuppliers.inventoryId, inventoryId))
        .orderBy(asc(productSuppliers.preferenceOrder));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching inventory suppliers:", error);
      res.status(500).json({ error: "Ürün tedarikçileri alınamadı" });
    }
  });
  
  // Düşük stok uyarıları
  app.get("/api/inventory/alerts/low-stock", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await db.select()
        .from(inventory)
        .where(eq(inventory.isActive, true));
      
      const lowStockItems = items.filter(item => 
        parseFloat(item.currentStock) <= parseFloat(item.minimumStock)
      );
      
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock alerts:", error);
      res.status(500).json({ error: "Düşük stok uyarıları alınamadı" });
    }
  });
  
  // ========================================
  // TEDARİKÇİ YÖNETİMİ - Suppliers
  // ========================================
  
  // Tüm tedarikçiler
  app.get("/api/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { status, search } = req.query;
      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(suppliers.status, status as string));
      }
      
      if (search) {
        conditions.push(or(
          like(suppliers.name, `%${search}%`),
          like(suppliers.code, `%${search}%`)
        ));
      }
      
      const items = await db.select()
        .from(suppliers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(suppliers.name));
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Tedarikçi listesi alınamadı" });
    }
  });
  
  // Tek tedarikçi
  app.get("/api/suppliers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select()
        .from(suppliers)
        .where(eq(suppliers.id, id));
      
      if (!item) {
        return res.status(404).json({ error: "Tedarikçi bulunamadı" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ error: "Tedarikçi alınamadı" });
    }
  });
  
  // Yeni tedarikçi ekle
  app.post("/api/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validatedData = insertSupplierSchema.parse({
        ...req.body,
        createdById: user?.id
      });
      
      const [newItem] = await db.insert(suppliers)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Tedarikçi oluşturulamadı" });
    }
  });
  
  // Tedarikçi güncelle
  app.patch("/api/suppliers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const [updated] = await db.update(suppliers)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Tedarikçi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Tedarikçi güncellenemedi" });
    }
  });
  
  // ========================================
  // SİPARİŞ YÖNETİMİ - Purchase Orders
  // ========================================
  
  // Tüm siparişler
  app.get("/api/purchase-orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { status, supplierId } = req.query;
      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(purchaseOrders.status, status as string));
      }
      
      if (supplierId) {
        conditions.push(eq(purchaseOrders.supplierId, parseInt(supplierId as string)));
      }
      
      const orders = await db.select()
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(purchaseOrders.orderDate));
      
      res.json(orders.map(o => ({
        ...o.purchase_orders,
        supplier: o.suppliers
      })));
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Sipariş listesi alınamadı" });
    }
  });
  
  // Tek sipariş detayı
  app.get("/api/purchase-orders/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const [order] = await db.select()
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(eq(purchaseOrders.id, id));
      
      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }
      
      // Sipariş kalemlerini al
      const items = await db.select()
        .from(purchaseOrderItems)
        .leftJoin(inventory, eq(purchaseOrderItems.inventoryId, inventory.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, id));
      
      res.json({
        ...order.purchase_orders,
        supplier: order.suppliers,
        items: items.map(i => ({
          ...i.purchase_order_items,
          inventory: i.inventory
        }))
      });
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ error: "Sipariş alınamadı" });
    }
  });
  
  // Yeni sipariş oluştur
  app.post("/api/purchase-orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { items, ...orderData } = req.body;
      
      // Sipariş numarası oluştur
      const orderNumber = `PO-${Date.now()}`;
      
      const validatedOrder = insertPurchaseOrderSchema.parse({
        ...orderData,
        orderNumber,
        createdById: user?.id
      });
      
      // Siparişi oluştur
      const [newOrder] = await db.insert(purchaseOrders)
        .values(validatedOrder)
        .returning();
      
      // Sipariş kalemlerini ekle
      if (items && items.length > 0) {
        for (const item of items) {
          const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
          
          await db.insert(purchaseOrderItems).values({
            purchaseOrderId: newOrder.id,
            inventoryId: item.inventoryId,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate?.toString() || "18",
            discountRate: item.discountRate?.toString() || "0",
            lineTotal: lineTotal.toString(),
            notes: item.notes
          });
        }
        
        // Toplam tutarları hesapla ve güncelle
        const orderItems = await db.select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, newOrder.id));
        
        const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
        const taxAmount = subtotal * 0.18; // Varsayılan KDV
        const totalAmount = subtotal + taxAmount;
        
        await db.update(purchaseOrders)
          .set({
            subtotal: subtotal.toString(),
            taxAmount: taxAmount.toString(),
            totalAmount: totalAmount.toString()
          })
          .where(eq(purchaseOrders.id, newOrder.id));
      }
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Sipariş oluşturulamadı" });
    }
  });
  
  // Sipariş durumu güncelle
  app.patch("/api/purchase-orders/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const updateData: any = { 
        status,
        updatedAt: new Date()
      };
      
      // Onaylama durumunda
      if (status === "onaylandi") {
        updateData.approvedById = user?.id;
        updateData.approvedAt = new Date();
      }
      
      const [updated] = await db.update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      res.status(500).json({ error: "Sipariş durumu güncellenemedi" });
    }
  });
  
  // ========================================
  // MAL KABUL - Goods Receipt
  // ========================================
  
  // Tüm mal kabul kayıtları
  app.get("/api/goods-receipts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { status, supplierId } = req.query;
      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(goodsReceipts.status, status as string));
      }
      
      if (supplierId) {
        conditions.push(eq(goodsReceipts.supplierId, parseInt(supplierId as string)));
      }
      
      const receipts = await db.select()
        .from(goodsReceipts)
        .leftJoin(suppliers, eq(goodsReceipts.supplierId, suppliers.id))
        .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(goodsReceipts.receiptDate));
      
      res.json(receipts.map(r => ({
        ...r.goods_receipts,
        supplier: r.suppliers,
        purchaseOrder: r.purchase_orders
      })));
    } catch (error) {
      console.error("Error fetching goods receipts:", error);
      res.status(500).json({ error: "Mal kabul kayıtları alınamadı" });
    }
  });
  
  // Mal kabul detayı
  app.get("/api/goods-receipts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const [receipt] = await db.select()
        .from(goodsReceipts)
        .leftJoin(suppliers, eq(goodsReceipts.supplierId, suppliers.id))
        .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
        .where(eq(goodsReceipts.id, id));
      
      if (!receipt) {
        return res.status(404).json({ error: "Mal kabul kaydı bulunamadı" });
      }
      
      // Mal kabul kalemlerini al
      const items = await db.select()
        .from(goodsReceiptItems)
        .leftJoin(inventory, eq(goodsReceiptItems.inventoryId, inventory.id))
        .where(eq(goodsReceiptItems.goodsReceiptId, id));
      
      res.json({
        ...receipt.goods_receipts,
        supplier: receipt.suppliers,
        purchaseOrder: receipt.purchase_orders,
        items: items.map(i => ({
          ...i.goods_receipt_items,
          inventory: i.inventory
        }))
      });
    } catch (error) {
      console.error("Error fetching goods receipt:", error);
      res.status(500).json({ error: "Mal kabul kaydı alınamadı" });
    }
  });
  
  // Yeni mal kabul oluştur
  app.post("/api/goods-receipts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { items, ...receiptData } = req.body;
      
      // Kabul numarası oluştur
      const receiptNumber = `GR-${Date.now()}`;
      
      const validatedReceipt = insertGoodsReceiptSchema.parse({
        ...receiptData,
        receiptNumber,
        receivedById: user?.id
      });
      
      // Mal kabulü oluştur
      const [newReceipt] = await db.insert(goodsReceipts)
        .values(validatedReceipt)
        .returning();
      
      // Mal kabul kalemlerini ekle ve stok güncelle
      if (items && items.length > 0) {
        for (const item of items) {
          await db.insert(goodsReceiptItems).values({
            goodsReceiptId: newReceipt.id,
            inventoryId: item.inventoryId,
            purchaseOrderItemId: item.purchaseOrderItemId,
            orderedQuantity: item.orderedQuantity?.toString(),
            receivedQuantity: item.receivedQuantity.toString(),
            acceptedQuantity: item.acceptedQuantity?.toString() || item.receivedQuantity.toString(),
            rejectedQuantity: item.rejectedQuantity?.toString() || "0",
            unit: item.unit,
            unitPrice: item.unitPrice?.toString(),
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            productionDate: item.productionDate ? new Date(item.productionDate) : null,
            qualityStatus: item.qualityStatus || "beklemede",
            qualityNotes: item.qualityNotes,
            rejectionReason: item.rejectionReason
          });
          
          // Kabul edilen miktarı stoğa ekle
          const acceptedQty = parseFloat(item.acceptedQuantity || item.receivedQuantity);
          if (acceptedQty > 0) {
            // Mevcut stoğu al
            const [currentInventory] = await db.select()
              .from(inventory)
              .where(eq(inventory.id, item.inventoryId));
            
            if (currentInventory) {
              const previousStock = parseFloat(currentInventory.currentStock);
              const newStock = previousStock + acceptedQty;
              
              // Stok hareketini kaydet
              await db.insert(inventoryMovements).values({
                inventoryId: item.inventoryId,
                movementType: "giris",
                quantity: acceptedQty.toString(),
                previousStock: previousStock.toString(),
                newStock: newStock.toString(),
                referenceType: "goods_receipt",
                referenceId: newReceipt.id,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                notes: `Mal kabul - ${receiptNumber}`,
                createdById: user?.id
              });
              
              // Stok miktarını güncelle
              await db.update(inventory)
                .set({ 
                  currentStock: newStock.toString(),
                  lastPurchasePrice: item.unitPrice?.toString(),
                  updatedAt: new Date()
                })
                .where(eq(inventory.id, item.inventoryId));
            }
          }
        }
      }
      
      res.status(201).json(newReceipt);
    } catch (error) {
      console.error("Error creating goods receipt:", error);
      res.status(500).json({ error: "Mal kabul kaydı oluşturulamadı" });
    }
  });
  
  // Mal kabul durumu güncelle
  app.patch("/api/goods-receipts/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const { status, qualityCheckPassed, qualityCheckNotes } = req.body;
      
      const updateData: any = { 
        status,
        updatedAt: new Date()
      };
      
      // Kalite kontrol durumunda
      if (qualityCheckPassed !== undefined) {
        updateData.qualityCheckPassed = qualityCheckPassed;
        updateData.qualityCheckNotes = qualityCheckNotes;
        updateData.qualityCheckedById = user?.id;
        updateData.qualityCheckedAt = new Date();
      }
      
      const [updated] = await db.update(goodsReceipts)
        .set(updateData)
        .where(eq(goodsReceipts.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Mal kabul kaydı bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating goods receipt status:", error);
      res.status(500).json({ error: "Mal kabul durumu güncellenemedi" });
    }
  });
  
  // ========================================
  // DASHBOARD VE İSTATİSTİKLER
  // ========================================
  
  // Satınalma dashboard özet verileri
  app.get("/api/satinalma/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Toplam tedarikçi sayısı
      const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.status, "aktif"));
      
      // Bekleyen siparişler
      const pendingOrders = await db.select().from(purchaseOrders)
        .where(or(
          eq(purchaseOrders.status, "onay_bekliyor"),
          eq(purchaseOrders.status, "siparis_verildi")
        ));
      
      // Düşük stok uyarıları
      const allInventory = await db.select().from(inventory).where(eq(inventory.isActive, true));
      const lowStockCount = allInventory.filter(item => 
        parseFloat(item.currentStock) <= parseFloat(item.minimumStock)
      ).length;
      
      // Son 30 gün mal kabul
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReceipts = await db.select().from(goodsReceipts)
        .where(gte(goodsReceipts.receiptDate, thirtyDaysAgo));
      
      res.json({
        totalSuppliers: allSuppliers.length,
        pendingOrders: pendingOrders.length,
        lowStockAlerts: lowStockCount,
        recentReceipts: recentReceipts.length,
        totalInventoryItems: allInventory.length
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Dashboard verileri alınamadı" });
    }
  });
}
