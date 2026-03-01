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
  rawMaterials,
  insertInventorySchema,
  insertSupplierSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertGoodsReceiptSchema,
  insertGoodsReceiptItemSchema,
  insertInventoryMovementSchema,
  cariAccounts,
  cariTransactions,
  insertCariAccountSchema,
  insertCariTransactionSchema,
  supplierQuotes,
  supplierIssues,
  purchaseOrderPayments,
  insertSupplierQuoteSchema,
  insertSupplierIssueSchema,
  insertPurchaseOrderPaymentSchema,
  insertProductSupplierSchema,
  rawMaterialPriceHistory,
  users
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, like, asc, inArray } from "drizzle-orm";

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
  
  // Tedarikçiye ait ürünler
  app.get("/api/inventory/by-supplier/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      
      const items = await db.select({
        id: inventory.id,
        code: inventory.code,
        name: inventory.name,
        unit: inventory.unit,
        category: inventory.category,
        currentStock: inventory.currentStock,
        unitPrice: productSuppliers.unitPrice,
      })
        .from(productSuppliers)
        .innerJoin(inventory, eq(productSuppliers.inventoryId, inventory.id))
        .where(and(
          eq(productSuppliers.supplierId, supplierId),
          eq(productSuppliers.isActive, true),
          eq(inventory.isActive, true)
        ))
        .orderBy(asc(inventory.name));
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching supplier inventory:", error);
      res.status(500).json({ error: "Tedarikçi ürünleri alınamadı" });
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
      const { status, supplierId, branchId } = req.query;
      const user = (req as any).user;
      
      let conditions = [];
      
      if (status && status !== "all") {
        conditions.push(eq(purchaseOrders.status, status as string));
      }
      
      if (supplierId) {
        conditions.push(eq(purchaseOrders.supplierId, parseInt(supplierId as string)));
      }
      
      const hqRoles = ["admin", "ceo", "cgo", "satinalma", "muhasebe"];
      const isHqRole = user && hqRoles.includes(user.role);

      if (branchId && isHqRole) {
        const parsedBranchId = parseInt(branchId as string);
        if (!isNaN(parsedBranchId)) {
          const branchUsers = await db.select({ id: users.id }).from(users).where(eq(users.branchId, parsedBranchId));
          const branchUserIds = branchUsers.map(u => u.id);
          if (branchUserIds.length > 0) {
            conditions.push(inArray(purchaseOrders.createdById, branchUserIds));
          } else {
            return res.json([]);
          }
        }
      } else if (!isHqRole && user?.branchId) {
        const branchUsers = await db.select({ id: users.id }).from(users).where(eq(users.branchId, user.branchId));
        const branchUserIds = branchUsers.map(u => u.id);
        if (branchUserIds.length > 0) {
          conditions.push(inArray(purchaseOrders.createdById, branchUserIds));
        } else {
          return res.json([]);
        }
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
      const { status, qualityCheckPassed, qualityCheckNotes, deliveryStatus, supplierQualityScore, qualityNotes } = req.body;
      
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
      
      // Tedarikçi değerlendirme bilgileri
      if (deliveryStatus) {
        updateData.deliveryStatus = deliveryStatus;
      }
      if (supplierQualityScore) {
        updateData.supplierQualityScore = supplierQualityScore;
      }
      if (qualityNotes) {
        updateData.qualityNotes = qualityNotes;
      }
      
      const [updated] = await db.update(goodsReceipts)
        .set(updateData)
        .where(eq(goodsReceipts.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Mal kabul kaydı bulunamadı" });
      }
      
      // Kabul edildi veya kısmen kabul durumunda stok hareketleri oluştur
      if ((status === "kabul_edildi" || status === "kismen_kabul") && updated.supplierId) {
        // Mal kabul kalemlerini al
        const receiptItems = await db.select()
          .from(goodsReceiptItems)
          .leftJoin(inventory, eq(goodsReceiptItems.inventoryId, inventory.id))
          .where(eq(goodsReceiptItems.goodsReceiptId, id));
        
        for (const item of receiptItems) {
          const grItem = item.goods_receipt_items;
          const invItem = item.inventory;
          
          // Kabul edilen miktar (qualityStatus uygun veya sartli_kabul ise)
          const qualityOk = grItem.qualityStatus === "uygun" || grItem.qualityStatus === "sartli_kabul" || grItem.qualityStatus === "gecti";
          const acceptedQty = parseFloat(grItem.acceptedQuantity || grItem.receivedQuantity || "0");
          
          if (qualityOk && acceptedQty > 0 && invItem) {
            const previousStock = parseFloat(invItem.currentStock);
            const newStock = previousStock + acceptedQty;
            
            // Stok hareketini kaydet
            await db.insert(inventoryMovements).values({
              inventoryId: grItem.inventoryId,
              movementType: "mal_kabul",
              quantity: acceptedQty.toString(),
              previousStock: previousStock.toString(),
              newStock: newStock.toString(),
              referenceType: "goods_receipt",
              referenceId: id,
              batchNumber: grItem.batchNumber,
              expiryDate: grItem.expiryDate,
              notes: `Mal kabul - ${updated.receiptNumber}`,
              createdById: user?.id
            });
            
            // Stok miktarını güncelle
            await db.update(inventory)
              .set({ 
                currentStock: newStock.toString(),
                lastPurchasePrice: grItem.unitPrice?.toString(),
                updatedAt: new Date()
              })
              .where(eq(inventory.id, grItem.inventoryId));
          }
        }
        
        // Tedarikçi skorunu güncelle
        await updateSupplierScore(updated.supplierId);
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating goods receipt status:", error);
      res.status(500).json({ error: "Mal kabul durumu güncellenemedi" });
    }
  });
  
  // Mal kabul kalemi kalite durumunu güncelle
  app.patch("/api/goods-receipt-items/:id/quality", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { qualityStatus, qualityNotes, acceptedQuantity, rejectedQuantity, rejectionReason } = req.body;
      
      const updateData: any = {};
      if (qualityStatus) updateData.qualityStatus = qualityStatus;
      if (qualityNotes !== undefined) updateData.qualityNotes = qualityNotes;
      if (acceptedQuantity !== undefined) updateData.acceptedQuantity = acceptedQuantity.toString();
      if (rejectedQuantity !== undefined) updateData.rejectedQuantity = rejectedQuantity.toString();
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      
      const [updated] = await db.update(goodsReceiptItems)
        .set(updateData)
        .where(eq(goodsReceiptItems.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Mal kabul kalemi bulunamadı" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating goods receipt item quality:", error);
      res.status(500).json({ error: "Kalite durumu güncellenemedi" });
    }
  });
  
  // Tedarikçi performans skoru hesaplama fonksiyonu
  async function updateSupplierScore(supplierId: number) {
    try {
      // Son 12 ayın mal kabullerini al
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const receipts = await db.select()
        .from(goodsReceipts)
        .where(and(
          eq(goodsReceipts.supplierId, supplierId),
          eq(goodsReceipts.status, "kabul_edildi"),
          gte(goodsReceipts.receiptDate, oneYearAgo)
        ));
      
      if (receipts.length === 0) return;
      
      // Teslimat performansı hesapla (early: +1, on_time: +1, late: -1)
      let deliveryScore = 0;
      let qualityScoreSum = 0;
      let qualityScoreCount = 0;
      
      for (const receipt of receipts) {
        if (receipt.deliveryStatus === "early" || receipt.deliveryStatus === "on_time") {
          deliveryScore += 1;
        } else if (receipt.deliveryStatus === "late") {
          deliveryScore -= 1;
        }
        
        if (receipt.supplierQualityScore) {
          qualityScoreSum += receipt.supplierQualityScore;
          qualityScoreCount++;
        }
      }
      
      // Teslimat oranı (0-100)
      const deliveryPerformance = Math.round(((deliveryScore + receipts.length) / (2 * receipts.length)) * 100);
      
      // Ortalama kalite puanı (1-5 -> 0-100)
      const avgQualityScore = qualityScoreCount > 0 
        ? Math.round((qualityScoreSum / qualityScoreCount) * 20)
        : 80; // Varsayılan
      
      // Genel performans skoru (%60 kalite, %40 teslimat)
      const performanceScore = Math.round((avgQualityScore * 0.6) + (deliveryPerformance * 0.4));
      
      // Tedarikçiyi güncelle
      await db.update(suppliers)
        .set({ 
          performanceScore: performanceScore.toString(),
          updatedAt: new Date()
        })
        .where(eq(suppliers.id, supplierId));
      
      console.log(`Supplier ${supplierId} score updated: ${performanceScore}`);
    } catch (error) {
      console.error("Error updating supplier score:", error);
    }
  }
  
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
      
      // Hammaddeler listesi (son 10 kalem)
      const allRawMaterials = await db.select().from(rawMaterials)
        .where(eq(rawMaterials.isActive, true));
      
      const rawMaterialsList = await db.select({
        id: rawMaterials.id,
        name: rawMaterials.name,
        category: rawMaterials.category,
        unit: rawMaterials.unit,
        currentPrice: rawMaterials.currentUnitPrice,
        isKeyblend: rawMaterials.isKeyblend,
      }).from(rawMaterials)
        .where(eq(rawMaterials.isActive, true))
        .orderBy(desc(rawMaterials.updatedAt))
        .limit(10);
      
      // Stok listesi
      const inventoryList = await db.select({
        id: inventory.id,
        name: inventory.name,
        currentStock: inventory.currentStock,
        minimumStock: inventory.minimumStock,
        unit: inventory.unit,
        category: inventory.category,
      }).from(inventory)
        .where(eq(inventory.isActive, true))
        .orderBy(inventory.name)
        .limit(10);

      // Muhasebe (Cari) entegrasyonu - Alacak/Borç özeti
      const allCariAccounts = await db.select().from(cariAccounts).where(eq(cariAccounts.isActive, true));
      let totalReceivables = 0;
      let totalPayables = 0;
      
      for (const account of allCariAccounts) {
        const balance = parseFloat(account.currentBalance || "0");
        if (balance > 0) {
          totalReceivables += balance;
        } else {
          totalPayables += Math.abs(balance);
        }
      }

      res.json({
        totalSuppliers: allSuppliers.length,
        pendingOrders: pendingOrders.length,
        lowStockAlerts: lowStockCount,
        recentReceipts: recentReceipts.length,
        totalInventoryItems: allInventory.length,
        rawMaterials: rawMaterialsList,
        inventory: inventoryList,
        totalRawMaterials: allRawMaterials.length,
        accounting: {
          totalReceivables,
          totalPayables,
          accountCount: allCariAccounts.length
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Dashboard verileri alınamadı" });
    }
  });

  // ========================================
  // CARİ TAKİP - Receivables/Payables
  // ========================================
  
  // Cari istatistikler
  app.get("/api/cari/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allAccounts = await db.select().from(cariAccounts).where(eq(cariAccounts.isActive, true));
      
      let totalReceivables = 0;
      let totalPayables = 0;
      
      for (const account of allAccounts) {
        const balance = parseFloat(account.currentBalance || "0");
        if (balance > 0) {
          totalReceivables += balance;
        } else {
          totalPayables += Math.abs(balance);
        }
      }
      
      // Vadesi geçmiş işlemler
      const now = new Date();
      const overdueTransactions = await db.select()
        .from(cariTransactions)
        .where(and(
          eq(cariTransactions.isPaid, false),
          lte(cariTransactions.dueDate, now)
        ));
      
      // Yaklaşan vadeler (7 gün içinde)
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const upcomingTransactions = await db.select()
        .from(cariTransactions)
        .where(and(
          eq(cariTransactions.isPaid, false),
          gte(cariTransactions.dueDate, now),
          lte(cariTransactions.dueDate, sevenDaysLater)
        ));
      
      res.json({
        totalReceivables,
        totalPayables,
        overdueCount: overdueTransactions.length,
        upcomingDueCount: upcomingTransactions.length
      });
    } catch (error) {
      console.error("Error fetching cari stats:", error);
      res.status(500).json({ error: "Cari istatistikleri alınamadı" });
    }
  });
  
  // Cari hesaplar listesi
  app.get("/api/cari/accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type, search } = req.query;
      
      let conditions: any[] = [eq(cariAccounts.isActive, true)];
      
      if (type && type !== "all") {
        conditions.push(eq(cariAccounts.accountType, type as string));
      }
      
      if (search) {
        conditions.push(or(
          like(cariAccounts.accountName, `%${search}%`),
          like(cariAccounts.accountCode, `%${search}%`)
        ));
      }
      
      const accounts = await db.select()
        .from(cariAccounts)
        .where(and(...conditions))
        .orderBy(desc(cariAccounts.lastTransactionDate));
      
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching cari accounts:", error);
      res.status(500).json({ error: "Cari hesaplar alınamadı" });
    }
  });
  
  // Yeni cari hesap oluştur
  app.post("/api/cari/accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parseResult = insertCariAccountSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      const data = parseResult.data;
      
      const [newAccount] = await db.insert(cariAccounts)
        .values(data)
        .returning();
      
      res.status(201).json(newAccount);
    } catch (error) {
      console.error("Error creating cari account:", error);
      res.status(500).json({ error: "Cari hesap oluşturulamadı" });
    }
  });
  
  // Vadesi geçmiş işlemler
  app.get("/api/cari/transactions/overdue", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      
      const transactions = await db.select({
        id: cariTransactions.id,
        accountId: cariTransactions.accountId,
        transactionDate: cariTransactions.transactionDate,
        transactionType: cariTransactions.transactionType,
        amount: cariTransactions.amount,
        description: cariTransactions.description,
        dueDate: cariTransactions.dueDate,
        isPaid: cariTransactions.isPaid,
        account: {
          accountName: cariAccounts.accountName,
          accountCode: cariAccounts.accountCode,
        }
      })
        .from(cariTransactions)
        .leftJoin(cariAccounts, eq(cariTransactions.accountId, cariAccounts.id))
        .where(and(
          eq(cariTransactions.isPaid, false),
          lte(cariTransactions.dueDate, now)
        ))
        .orderBy(asc(cariTransactions.dueDate))
        .limit(20);
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching overdue transactions:", error);
      res.status(500).json({ error: "Vadesi geçmiş işlemler alınamadı" });
    }
  });
  
  // Yaklaşan vadeler
  app.get("/api/cari/transactions/upcoming", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const transactions = await db.select({
        id: cariTransactions.id,
        accountId: cariTransactions.accountId,
        transactionDate: cariTransactions.transactionDate,
        transactionType: cariTransactions.transactionType,
        amount: cariTransactions.amount,
        description: cariTransactions.description,
        dueDate: cariTransactions.dueDate,
        isPaid: cariTransactions.isPaid,
        account: {
          accountName: cariAccounts.accountName,
          accountCode: cariAccounts.accountCode,
        }
      })
        .from(cariTransactions)
        .leftJoin(cariAccounts, eq(cariTransactions.accountId, cariAccounts.id))
        .where(and(
          eq(cariTransactions.isPaid, false),
          gte(cariTransactions.dueDate, now),
          lte(cariTransactions.dueDate, sevenDaysLater)
        ))
        .orderBy(asc(cariTransactions.dueDate))
        .limit(20);
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching upcoming transactions:", error);
      res.status(500).json({ error: "Yaklaşan vadeler alınamadı" });
    }
  });
  
  // Yeni işlem oluştur
  app.post("/api/cari/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const parseResult = insertCariTransactionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parseResult.error.errors });
      }
      const data = parseResult.data;
      
      const [newTransaction] = await db.insert(cariTransactions)
        .values({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          createdById: user?.id,
        })
        .returning();
      
      // Hesap bakiyesini güncelle
      const account = await db.select().from(cariAccounts).where(eq(cariAccounts.id, data.accountId));
      if (account.length > 0) {
        const currentBalance = parseFloat(account[0].currentBalance || "0");
        const amount = parseFloat(data.amount);
        const newBalance = data.transactionType === "alacak" 
          ? currentBalance + amount 
          : currentBalance - amount;
        
        await db.update(cariAccounts)
          .set({ 
            currentBalance: newBalance.toString(),
            lastTransactionDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(cariAccounts.id, data.accountId));
      }
      
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Error creating cari transaction:", error);
      res.status(500).json({ error: "İşlem kaydedilemedi" });
    }
  });

  // ========================================
  // ÜRÜN KARTI - Product Card (Enriched Detail)
  // ========================================

  app.get("/api/inventory/:id/card", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [product] = await db.select()
        .from(inventory)
        .where(eq(inventory.id, id));

      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      let productSuppliersData: any[] = [];
      try {
        productSuppliersData = await db.select({
          id: productSuppliers.id,
          supplierId: productSuppliers.supplierId,
          unitPrice: productSuppliers.unitPrice,
          leadTimeDays: productSuppliers.leadTimeDays,
          isPrimary: productSuppliers.isPrimary,
          preferenceOrder: productSuppliers.preferenceOrder,
          supplierName: suppliers.name,
          supplierCode: suppliers.code,
          supplierStatus: suppliers.status,
          paymentTerms: suppliers.paymentTermDays,
          qualityScore: suppliers.qualityScore,
          deliveryRate: suppliers.onTimeDeliveryRate,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
        })
          .from(productSuppliers)
          .leftJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
          .where(eq(productSuppliers.inventoryId, id))
          .orderBy(asc(productSuppliers.preferenceOrder));
      } catch (e) {
        console.warn("Product suppliers query failed:", e);
      }

      let priceHistory: any[] = [];
      try {
        if (product.category === "hammadde" || product.category === "raw_material") {
          const rawMat = await db.select()
            .from(rawMaterials)
            .where(eq(rawMaterials.inventoryId, id))
            .limit(1);

          if (rawMat.length > 0) {
            priceHistory = await db.select()
              .from(rawMaterialPriceHistory)
              .where(eq(rawMaterialPriceHistory.rawMaterialId, rawMat[0].id))
              .orderBy(desc(rawMaterialPriceHistory.createdAt))
              .limit(50);
          }
        }
      } catch (e) {
        console.warn("Price history query failed:", e);
      }

      let quotes: any[] = [];
      try {
        quotes = await db.select()
          .from(supplierQuotes)
          .where(eq(supplierQuotes.inventoryId, id))
          .orderBy(desc(supplierQuotes.createdAt));
      } catch (e) {
        console.warn("Supplier quotes query failed:", e);
      }

      let issues: any[] = [];
      try {
        issues = await db.select()
          .from(supplierIssues)
          .where(eq(supplierIssues.inventoryId, id))
          .orderBy(desc(supplierIssues.createdAt));
      } catch (e) {
        console.warn("Supplier issues query failed:", e);
      }

      let movementSummary: any[] = [];
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        movementSummary = await db.select({
          movementType: inventoryMovements.movementType,
          count: sql<number>`count(*)::int`,
          totalQuantity: sql<string>`sum(${inventoryMovements.quantity}::numeric)::text`,
        })
          .from(inventoryMovements)
          .where(and(
            eq(inventoryMovements.inventoryId, id),
            gte(inventoryMovements.createdAt, ninetyDaysAgo)
          ))
          .groupBy(inventoryMovements.movementType);
      } catch (e) {
        console.warn("Movement summary query failed:", e);
      }

      let poHistory: any[] = [];
      try {
        poHistory = await db.select({
          poItemId: purchaseOrderItems.id,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
          lineTotal: purchaseOrderItems.lineTotal,
          orderId: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          orderDate: purchaseOrders.orderDate,
          orderStatus: purchaseOrders.status,
          supplierId: purchaseOrders.supplierId,
        })
          .from(purchaseOrderItems)
          .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
          .where(eq(purchaseOrderItems.inventoryId, id))
          .orderBy(desc(purchaseOrders.orderDate))
          .limit(10);
      } catch (e) {
        console.warn("Purchase order history query failed:", e);
      }

      res.json({
        product,
        suppliers: productSuppliersData,
        priceHistory,
        quotes,
        issues,
        movementSummary,
        purchaseOrderHistory: poHistory,
      });
    } catch (error) {
      console.error("Error fetching product card:", error);
      res.status(500).json({ error: "Ürün kartı bilgileri alınamadı" });
    }
  });

  // ========================================
  // TEDARİKÇİ FİYAT TEKLİFLERİ - Supplier Quotes
  // ========================================

  app.get("/api/supplier-quotes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.query;

      let conditions = [];
      if (inventoryId) {
        conditions.push(eq(supplierQuotes.inventoryId, parseInt(inventoryId as string)));
      }

      const quotes = await db.select()
        .from(supplierQuotes)
        .leftJoin(suppliers, eq(supplierQuotes.supplierId, suppliers.id))
        .leftJoin(inventory, eq(supplierQuotes.inventoryId, inventory.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(supplierQuotes.createdAt));

      res.json(quotes.map(q => ({
        ...q.supplier_quotes,
        supplier: q.suppliers,
        inventory: q.inventory,
      })));
    } catch (error) {
      console.error("Error fetching supplier quotes:", error);
      res.status(500).json({ error: "Tedarikçi teklifleri alınamadı" });
    }
  });

  app.post("/api/supplier-quotes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validatedData = insertSupplierQuoteSchema.parse({
        ...req.body,
        requestedById: user?.id,
      });

      const [newQuote] = await db.insert(supplierQuotes)
        .values(validatedData)
        .returning();

      res.status(201).json(newQuote);
    } catch (error) {
      console.error("Error creating supplier quote:", error);
      res.status(500).json({ error: "Tedarikçi teklifi oluşturulamadı" });
    }
  });

  app.patch("/api/supplier-quotes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [updated] = await db.update(supplierQuotes)
        .set(req.body)
        .where(eq(supplierQuotes.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Tedarikçi teklifi bulunamadı" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating supplier quote:", error);
      res.status(500).json({ error: "Tedarikçi teklifi güncellenemedi" });
    }
  });

  // ========================================
  // TEDARİKÇİ SORUNLARI - Supplier Issues
  // ========================================

  app.get("/api/supplier-issues", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId, inventoryId } = req.query;

      let conditions = [];
      if (supplierId) {
        conditions.push(eq(supplierIssues.supplierId, parseInt(supplierId as string)));
      }
      if (inventoryId) {
        conditions.push(eq(supplierIssues.inventoryId, parseInt(inventoryId as string)));
      }

      const issues = await db.select()
        .from(supplierIssues)
        .leftJoin(suppliers, eq(supplierIssues.supplierId, suppliers.id))
        .leftJoin(inventory, eq(supplierIssues.inventoryId, inventory.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(supplierIssues.createdAt));

      res.json(issues.map(i => ({
        ...i.supplier_issues,
        supplier: i.suppliers,
        inventory: i.inventory,
      })));
    } catch (error) {
      console.error("Error fetching supplier issues:", error);
      res.status(500).json({ error: "Tedarikçi sorunları alınamadı" });
    }
  });

  app.post("/api/supplier-issues", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validatedData = insertSupplierIssueSchema.parse({
        ...req.body,
        reportedById: user?.id,
      });

      const [newIssue] = await db.insert(supplierIssues)
        .values(validatedData)
        .returning();

      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Error creating supplier issue:", error);
      res.status(500).json({ error: "Tedarikçi sorunu oluşturulamadı" });
    }
  });

  app.patch("/api/supplier-issues/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = { ...req.body };

      if (updateData.status === "cozuldu" && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }

      const [updated] = await db.update(supplierIssues)
        .set(updateData)
        .where(eq(supplierIssues.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Tedarikçi sorunu bulunamadı" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating supplier issue:", error);
      res.status(500).json({ error: "Tedarikçi sorunu güncellenemedi" });
    }
  });

  // ========================================
  // SİPARİŞ ÖDEMELERİ - Purchase Order Payments
  // ========================================

  app.get("/api/purchase-order-payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId, status } = req.query;

      let conditions = [];
      if (purchaseOrderId) {
        conditions.push(eq(purchaseOrderPayments.purchaseOrderId, parseInt(purchaseOrderId as string)));
      }
      if (status) {
        conditions.push(eq(purchaseOrderPayments.status, status as string));
      }

      const payments = await db.select()
        .from(purchaseOrderPayments)
        .leftJoin(purchaseOrders, eq(purchaseOrderPayments.purchaseOrderId, purchaseOrders.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(purchaseOrderPayments.createdAt));

      res.json(payments.map(p => ({
        ...p.purchase_order_payments,
        purchaseOrder: p.purchase_orders,
      })));
    } catch (error) {
      console.error("Error fetching purchase order payments:", error);
      res.status(500).json({ error: "Sipariş ödemeleri alınamadı" });
    }
  });

  app.post("/api/purchase-order-payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validatedData = insertPurchaseOrderPaymentSchema.parse({
        ...req.body,
        processedById: user?.id,
      });

      const [newPayment] = await db.insert(purchaseOrderPayments)
        .values(validatedData)
        .returning();

      res.status(201).json(newPayment);
    } catch (error) {
      console.error("Error creating purchase order payment:", error);
      res.status(500).json({ error: "Ödeme kaydı oluşturulamadı" });
    }
  });

  app.patch("/api/purchase-order-payments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [updated] = await db.update(purchaseOrderPayments)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(purchaseOrderPayments.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Ödeme kaydı bulunamadı" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase order payment:", error);
      res.status(500).json({ error: "Ödeme kaydı güncellenemedi" });
    }
  });

  // ========================================
  // CEO ONAY - Purchase Order Approval
  // ========================================

  app.patch("/api/purchase-orders/:id/approve", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);

      if (!user || !["ceo", "cgo", "admin"].includes(user.role)) {
        return res.status(403).json({ error: "Bu işlem için yetkiniz yok. Sadece CEO/CGO/Admin onaylayabilir." });
      }

      const [order] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, id));

      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }

      if (order.status !== "onay_bekliyor") {
        return res.status(400).json({ error: "Bu sipariş onay bekliyor durumunda değil" });
      }

      const [updated] = await db.update(purchaseOrders)
        .set({
          status: "onaylandi",
          approvedById: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error approving purchase order:", error);
      res.status(500).json({ error: "Sipariş onaylanamadı" });
    }
  });

  // ========================================
  // ÜRÜN TEDARİKÇİ YÖNETİMİ - Product Supplier Management
  // ========================================

  app.post("/api/inventory/:id/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const inventoryId = parseInt(req.params.id);

      const [product] = await db.select()
        .from(inventory)
        .where(eq(inventory.id, inventoryId));

      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const validatedData = insertProductSupplierSchema.parse({
        ...req.body,
        inventoryId,
      });

      const [newLink] = await db.insert(productSuppliers)
        .values(validatedData)
        .returning();

      res.status(201).json(newLink);
    } catch (error) {
      console.error("Error adding product supplier:", error);
      res.status(500).json({ error: "Ürün tedarikçisi eklenemedi" });
    }
  });

  // ========================================
  // TREND ANALİZİ - Trend Analysis Dashboard
  // ========================================

  app.get("/api/satinalma/trends", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const topOrderedProductsQuery = db.execute(sql`
        SELECT 
          i.name as product_name,
          SUM(CAST(poi.quantity AS DECIMAL)) as total_quantity,
          SUM(CAST(poi.line_total AS DECIMAL)) as total_cost
        FROM purchase_order_items poi
        JOIN inventory i ON poi.inventory_id = i.id
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.order_date >= ${ninetyDaysAgo}
        GROUP BY i.name
        ORDER BY total_quantity DESC
        LIMIT 10
      `);

      const priceChangesQuery = db.execute(sql`
        SELECT 
          rm.name as product_name,
          rmph.previous_price as old_price,
          rmph.new_price as new_price,
          rmph.change_percent,
          rmph.created_at as date
        FROM raw_material_price_history rmph
        JOIN raw_materials rm ON rmph.raw_material_id = rm.id
        WHERE rmph.created_at >= ${ninetyDaysAgo}
        ORDER BY rmph.created_at DESC
        LIMIT 20
      `);

      const monthlySpendingQuery = db.execute(sql`
        SELECT 
          TO_CHAR(order_date, 'YYYY-MM') as month,
          SUM(CAST(total_amount AS DECIMAL)) as total_spending,
          COUNT(*) as order_count
        FROM purchase_orders
        WHERE order_date >= ${sixMonthsAgo}
        GROUP BY TO_CHAR(order_date, 'YYYY-MM')
        ORDER BY month ASC
      `);

      const stockMovementTrendsQuery = db.execute(sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date,
          movement_type,
          COUNT(*) as count
        FROM inventory_movements
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD'), movement_type
        ORDER BY date ASC
      `);

      const categoryDistributionQuery = db.execute(sql`
        SELECT 
          i.category,
          SUM(CAST(poi.line_total AS DECIMAL)) as total_cost
        FROM purchase_order_items poi
        JOIN inventory i ON poi.inventory_id = i.id
        GROUP BY i.category
        ORDER BY total_cost DESC
      `);

      const totalSpendingQuery = db.execute(sql`
        SELECT 
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_spending,
          COUNT(*) as order_count
        FROM purchase_orders
        WHERE order_date >= ${ninetyDaysAgo}
      `);

      const [
        topOrderedProducts,
        priceChanges,
        monthlySpending,
        stockMovementTrends,
        categoryDistribution,
        totalSpendingResult
      ] = await Promise.all([
        topOrderedProductsQuery,
        priceChangesQuery,
        monthlySpendingQuery,
        stockMovementTrendsQuery,
        categoryDistributionQuery,
        totalSpendingQuery
      ]);

      const totalSpending = parseFloat((totalSpendingResult.rows[0] as any)?.total_spending || "0");
      const orderCount = parseInt((totalSpendingResult.rows[0] as any)?.order_count || "0");
      const avgOrderAmount = orderCount > 0 ? totalSpending / orderCount : 0;

      const priceIncreases = priceChanges.rows.filter((p: any) => parseFloat(p.change_percent || "0") > 0).length;
      const priceIncreaseRate = priceChanges.rows.length > 0 
        ? (priceIncreases / priceChanges.rows.length) * 100 
        : 0;

      res.json({
        topOrderedProducts: topOrderedProducts.rows,
        priceChanges: priceChanges.rows,
        monthlySpending: monthlySpending.rows,
        stockMovementTrends: stockMovementTrends.rows,
        categoryDistribution: categoryDistribution.rows,
        summary: {
          totalSpending,
          orderCount,
          avgOrderAmount,
          priceIncreaseRate
        }
      });
    } catch (error) {
      console.error("Error fetching trend data:", error);
      res.status(500).json({ error: "Trend verileri alınamadı" });
    }
  });

  // ========================================
  // AI HATIRATMALAR - Stale Quotes & Critical Stock
  // ========================================

  app.get("/api/satinalma/stale-quotes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          i.id, i.name, i.code, i.category, i.unit_cost as "unitCost", i.unit,
          MAX(sq.created_at) as "lastQuoteDate",
          EXTRACT(DAY FROM NOW() - MAX(sq.created_at))::int as "daysSinceQuote"
        FROM inventory i
        LEFT JOIN supplier_quotes sq ON sq.inventory_id = i.id
        WHERE i.is_active = true
        GROUP BY i.id
        HAVING MAX(sq.created_at) IS NULL 
           OR MAX(sq.created_at) < NOW() - INTERVAL '60 days'
        ORDER BY MAX(sq.created_at) ASC NULLS FIRST
      `);

      const items = (result as any).rows || result;

      const enriched = [];
      for (const item of items) {
        const itemSuppliers = await db.select({
          supplierName: suppliers.name,
          unitPrice: productSuppliers.unitPrice,
        })
          .from(productSuppliers)
          .leftJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
          .where(and(
            eq(productSuppliers.inventoryId, item.id),
            eq(productSuppliers.isActive, true)
          ));

        enriched.push({
          ...item,
          daysSinceQuote: item.daysSinceQuote || null,
          suppliers: itemSuppliers,
        });
      }

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching stale quotes:", error);
      res.status(500).json({ error: "Eski teklif verileri alınamadı" });
    }
  });

  app.get("/api/satinalma/critical-stock", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await db.select()
        .from(inventory)
        .where(eq(inventory.isActive, true));

      const criticalItems = items.filter(item =>
        parseFloat(item.currentStock) <= parseFloat(item.minimumStock)
      );

      res.json(criticalItems);
    } catch (error) {
      console.error("Error fetching critical stock:", error);
      res.status(500).json({ error: "Kritik stok verileri alınamadı" });
    }
  });

  app.post("/api/satinalma/update-prices-from-quotes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!['admin', 'ceo', 'satinalma'].includes(user?.role)) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      }

      const activeItems = await db.select()
        .from(inventory)
        .where(eq(inventory.isActive, true));

      let updatedCount = 0;

      for (const item of activeItems) {
        const [latestQuote] = await db.select()
          .from(supplierQuotes)
          .where(and(
            eq(supplierQuotes.inventoryId, item.id),
            eq(supplierQuotes.status, "aktif")
          ))
          .orderBy(desc(supplierQuotes.createdAt))
          .limit(1);

        if (latestQuote && latestQuote.unitPrice !== item.unitCost) {
          await db.update(inventory)
            .set({
              unitCost: latestQuote.unitPrice,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, item.id));
          updatedCount++;
        }
      }

      res.json({ updatedCount, message: `${updatedCount} urun fiyati guncellendi` });
    } catch (error) {
      console.error("Error updating prices from quotes:", error);
      res.status(500).json({ error: "Fiyat guncellemesi yapilamadi" });
    }
  });

  // ========================================
  // TEDARİKÇİ PERFORMANS - Supplier Performance Report
  // ========================================

  app.get("/api/satinalma/supplier-performance", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const supplierList = await db.select().from(suppliers).where(eq(suppliers.status, "active")).orderBy(asc(suppliers.name));

      const results = [];
      for (const s of supplierList) {
        const orderStats = await db.execute(sql`
          SELECT
            COUNT(*)::int as order_count,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_value,
            AVG(CASE WHEN delivered_at IS NOT NULL AND order_date IS NOT NULL
              THEN EXTRACT(DAY FROM delivered_at - order_date) END)::numeric(5,1) as avg_delivery_days
          FROM purchase_orders
          WHERE supplier_id = ${s.id} AND order_date >= ${ninetyDaysAgo}
        `);

        const activeProducts = await db.select({ count: sql<number>`count(*)::int` })
          .from(productSuppliers)
          .where(and(eq(productSuppliers.supplierId, s.id), eq(productSuppliers.isActive, true)));

        const recentIssues = await db.select({ count: sql<number>`count(*)::int` })
          .from(supplierIssues)
          .where(and(eq(supplierIssues.supplierId, s.id), gte(supplierIssues.createdAt, ninetyDaysAgo)));

        const stats = (orderStats.rows[0] as any) || {};
        results.push({
          id: s.id,
          name: s.name,
          code: s.code,
          qualityScore: parseFloat(s.qualityScore || "0"),
          deliveryRate: parseFloat(s.onTimeDeliveryRate || "0"),
          orderCount: stats.order_count || 0,
          totalValue: parseFloat(stats.total_value || "0"),
          avgDeliveryDays: parseFloat(stats.avg_delivery_days || "0"),
          activeProductCount: activeProducts[0]?.count || 0,
          recentIssuesCount: recentIssues[0]?.count || 0,
        });
      }

      const totalOrders = results.reduce((s, r) => s + r.orderCount, 0);
      const totalValue = results.reduce((s, r) => s + r.totalValue, 0);
      const avgQuality = results.length > 0 ? results.reduce((s, r) => s + r.qualityScore, 0) / results.length : 0;
      const totalIssues = results.reduce((s, r) => s + r.recentIssuesCount, 0);

      res.json({
        suppliers: results,
        summary: { totalSuppliers: results.length, totalOrders, totalValue, avgQuality, totalIssues },
      });
    } catch (error) {
      console.error("Error fetching supplier performance:", error);
      res.status(500).json({ error: "Tedarikçi performans verileri alınamadı" });
    }
  });

  // ========================================
  // STOK HAREKET RAPORU - Stock Movement Report
  // ========================================

  app.get("/api/satinalma/stock-movement-report", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const monthlyMovements = await db.execute(sql`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') as month,
          movement_type,
          COUNT(*)::int as count,
          COALESCE(SUM(CAST(quantity AS DECIMAL)), 0) as total_quantity
        FROM inventory_movements
        WHERE created_at >= ${sixMonthsAgo}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM'), movement_type
        ORDER BY month ASC
      `);

      const topMovingItems = await db.execute(sql`
        SELECT
          i.name as product_name,
          i.category,
          COUNT(*)::int as movement_count,
          COALESCE(SUM(CAST(im.quantity AS DECIMAL)), 0) as total_quantity
        FROM inventory_movements im
        JOIN inventory i ON im.inventory_id = i.id
        WHERE im.created_at >= ${sixMonthsAgo}
        GROUP BY i.name, i.category
        ORDER BY movement_count DESC
        LIMIT 15
      `);

      const categoryBreakdown = await db.execute(sql`
        SELECT
          i.category,
          im.movement_type,
          COUNT(*)::int as count,
          COALESCE(SUM(CAST(im.quantity AS DECIMAL)), 0) as total_quantity
        FROM inventory_movements im
        JOIN inventory i ON im.inventory_id = i.id
        WHERE im.created_at >= ${sixMonthsAgo}
        GROUP BY i.category, im.movement_type
        ORDER BY i.category
      `);

      const incomingTypes = ["giris", "uretim_giris", "iade", "mal_kabul"];
      const outgoingTypes = ["cikis", "uretim_cikis", "fire"];
      const allRows = monthlyMovements.rows as any[];
      const totalIn = allRows.filter(r => incomingTypes.includes(r.movement_type)).reduce((s, r) => s + parseFloat(r.total_quantity || "0"), 0);
      const totalOut = allRows.filter(r => outgoingTypes.includes(r.movement_type)).reduce((s, r) => s + parseFloat(r.total_quantity || "0"), 0);
      const totalMovements = allRows.reduce((s, r) => s + r.count, 0);

      res.json({
        monthlyMovements: monthlyMovements.rows,
        topMovingItems: topMovingItems.rows,
        categoryBreakdown: categoryBreakdown.rows,
        summary: { totalMovements, totalIn, totalOut },
      });
    } catch (error) {
      console.error("Error fetching stock movement report:", error);
      res.status(500).json({ error: "Stok hareket raporu alınamadı" });
    }
  });

  // ========================================
  // MALİYET ANALİZİ - Cost Analysis Report
  // ========================================

  app.get("/api/satinalma/cost-analysis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const monthlySpending = await db.execute(sql`
        SELECT
          TO_CHAR(order_date, 'YYYY-MM') as month,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_spending,
          COUNT(*)::int as order_count
        FROM purchase_orders
        WHERE order_date >= ${twelveMonthsAgo}
        GROUP BY TO_CHAR(order_date, 'YYYY-MM')
        ORDER BY month ASC
      `);

      const topCostItems = await db.execute(sql`
        SELECT
          i.name as product_name,
          i.category,
          SUM(CAST(poi.line_total AS DECIMAL)) as total_cost,
          SUM(CAST(poi.quantity AS DECIMAL)) as total_quantity,
          AVG(CAST(poi.unit_price AS DECIMAL))::numeric(10,2) as avg_unit_price
        FROM purchase_order_items poi
        JOIN inventory i ON poi.inventory_id = i.id
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.order_date >= ${twelveMonthsAgo}
        GROUP BY i.name, i.category
        ORDER BY total_cost DESC
        LIMIT 15
      `);

      const categorySpending = await db.execute(sql`
        SELECT
          i.category,
          COALESCE(SUM(CAST(poi.line_total AS DECIMAL)), 0) as total_cost,
          COUNT(DISTINCT poi.inventory_id)::int as product_count
        FROM purchase_order_items poi
        JOIN inventory i ON poi.inventory_id = i.id
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.order_date >= ${twelveMonthsAgo}
        GROUP BY i.category
        ORDER BY total_cost DESC
      `);

      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const currentPeriod = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
        FROM purchase_orders WHERE order_date >= ${sixMonthsAgo}
      `);
      const previousPeriod = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
        FROM purchase_orders WHERE order_date >= ${yearAgo} AND order_date < ${sixMonthsAgo}
      `);

      const currentTotal = parseFloat((currentPeriod.rows[0] as any)?.total || "0");
      const previousTotal = parseFloat((previousPeriod.rows[0] as any)?.total || "0");
      const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100) : 0;

      const totalSpending = (monthlySpending.rows as any[]).reduce((s, r) => s + parseFloat(r.total_spending || "0"), 0);
      const totalOrders = (monthlySpending.rows as any[]).reduce((s, r) => s + r.order_count, 0);
      const avgMonthly = monthlySpending.rows.length > 0 ? totalSpending / monthlySpending.rows.length : 0;

      res.json({
        monthlySpending: monthlySpending.rows,
        topCostItems: topCostItems.rows,
        categorySpending: categorySpending.rows,
        summary: { totalSpending, totalOrders, avgMonthlySpending: avgMonthly, changePercent: parseFloat(changePercent.toFixed(1)) },
      });
    } catch (error) {
      console.error("Error fetching cost analysis:", error);
      res.status(500).json({ error: "Maliyet analizi verileri alınamadı" });
    }
  });

  app.delete("/api/product-suppliers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db.delete(productSuppliers)
        .where(eq(productSuppliers.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Ürün-tedarikçi bağlantısı bulunamadı" });
      }

      res.json({ message: "Tedarikçi bağlantısı silindi", deleted });
    } catch (error) {
      console.error("Error removing product supplier:", error);
      res.status(500).json({ error: "Ürün tedarikçisi silinemedi" });
    }
  });
}
