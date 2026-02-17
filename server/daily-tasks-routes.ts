import { Express, Request, Response } from "express";
import { db } from "./db";
import { roleTaskTemplates, roleTaskCompletions, stockCounts, stockCountItems, eventTriggeredTasks, inventory, inventoryMovements } from "@shared/schema";
import { eq, and, desc, sql, inArray, gte, or, isNull, ne } from "drizzle-orm";
import { resolveEventTaskForUser } from "./event-task-generator";

const isAuthenticated = (req: any, res: Response, next: Function) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

export function registerDailyTaskRoutes(app: Express) {
  app.get('/api/daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const frequency = (req.query.frequency as string) || 'daily';

      if (!userRole) {
        return res.status(400).json({ message: "Rol bilgisi bulunamadı" });
      }

      const templates = await db.select().from(roleTaskTemplates)
        .where(and(
          eq(roleTaskTemplates.role, userRole),
          eq(roleTaskTemplates.frequency, frequency),
          eq(roleTaskTemplates.isActive, true)
        ))
        .orderBy(roleTaskTemplates.sortOrder, roleTaskTemplates.priority);

      const today = new Date().toISOString().split('T')[0];
      let periodDate = today;
      if (frequency === 'weekly') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        periodDate = new Date(d.setDate(diff)).toISOString().split('T')[0];
      } else if (frequency === 'monthly') {
        periodDate = today.substring(0, 7);
      }

      const templateIds = templates.map(t => t.id);
      let completions: any[] = [];
      if (templateIds.length > 0) {
        completions = await db.select().from(roleTaskCompletions)
          .where(and(
            eq(roleTaskCompletions.userId, userId),
            eq(roleTaskCompletions.periodDate, periodDate),
            inArray(roleTaskCompletions.templateId, templateIds)
          ));
      }

      const completedIds = new Set(completions.map(c => c.templateId));

      const tasks = templates.map(t => ({
        ...t,
        isCompleted: completedIds.has(t.id),
        completedAt: completions.find(c => c.templateId === t.id)?.completedAt || null,
      }));

      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching daily tasks:", error);
      res.status(500).json({ message: "Görevler alınamadı" });
    }
  });

  app.post('/api/daily-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { notes } = req.body;
      const frequency = (req.query.frequency as string) || 'daily';

      const today = new Date().toISOString().split('T')[0];
      let periodDate = today;
      if (frequency === 'weekly') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        periodDate = new Date(d.setDate(diff)).toISOString().split('T')[0];
      } else if (frequency === 'monthly') {
        periodDate = today.substring(0, 7);
      }

      const existing = await db.select().from(roleTaskCompletions)
        .where(and(
          eq(roleTaskCompletions.userId, userId),
          eq(roleTaskCompletions.templateId, templateId),
          eq(roleTaskCompletions.periodDate, periodDate)
        ));

      if (existing.length > 0) {
        return res.json({ message: "Görev zaten tamamlanmış", alreadyCompleted: true });
      }

      const [completion] = await db.insert(roleTaskCompletions).values({
        userId,
        templateId,
        periodDate,
        notes: notes || null,
      }).returning();

      res.json(completion);
    } catch (error: any) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Görev tamamlanamadı" });
    }
  });

  app.post('/api/daily-tasks/:id/uncomplete', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user?.id;
      const frequency = (req.query.frequency as string) || 'daily';

      const today = new Date().toISOString().split('T')[0];
      let periodDate = today;
      if (frequency === 'weekly') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        periodDate = new Date(d.setDate(diff)).toISOString().split('T')[0];
      } else if (frequency === 'monthly') {
        periodDate = today.substring(0, 7);
      }

      await db.delete(roleTaskCompletions)
        .where(and(
          eq(roleTaskCompletions.userId, userId),
          eq(roleTaskCompletions.templateId, templateId),
          eq(roleTaskCompletions.periodDate, periodDate)
        ));

      res.json({ message: "Görev geri alındı" });
    } catch (error: any) {
      console.error("Error uncompleting task:", error);
      res.status(500).json({ message: "İşlem yapılamadı" });
    }
  });

  app.get('/api/daily-tasks/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const today = new Date().toISOString().split('T')[0];

      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];
      const monthPeriod = today.substring(0, 7);

      const dailyTemplates = await db.select().from(roleTaskTemplates)
        .where(and(eq(roleTaskTemplates.role, userRole), eq(roleTaskTemplates.frequency, 'daily'), eq(roleTaskTemplates.isActive, true)));
      const weeklyTemplates = await db.select().from(roleTaskTemplates)
        .where(and(eq(roleTaskTemplates.role, userRole), eq(roleTaskTemplates.frequency, 'weekly'), eq(roleTaskTemplates.isActive, true)));
      const monthlyTemplates = await db.select().from(roleTaskTemplates)
        .where(and(eq(roleTaskTemplates.role, userRole), eq(roleTaskTemplates.frequency, 'monthly'), eq(roleTaskTemplates.isActive, true)));

      const dailyCompletions = await db.select().from(roleTaskCompletions)
        .where(and(eq(roleTaskCompletions.userId, userId), eq(roleTaskCompletions.periodDate, today)));
      const weeklyCompletions = await db.select().from(roleTaskCompletions)
        .where(and(eq(roleTaskCompletions.userId, userId), eq(roleTaskCompletions.periodDate, weekStart)));
      const monthlyCompletions = await db.select().from(roleTaskCompletions)
        .where(and(eq(roleTaskCompletions.userId, userId), eq(roleTaskCompletions.periodDate, monthPeriod)));

      const now = new Date();
      const eventTasks = await db.select().from(eventTriggeredTasks)
        .where(and(
          eq(eventTriggeredTasks.userId, userId),
          or(isNull(eventTriggeredTasks.expiresAt), gte(eventTriggeredTasks.expiresAt, now))
        ));
      const eventCompleted = eventTasks.filter(t => t.isCompleted).length;
      const eventTotal = eventTasks.length;

      res.json({
        daily: { total: dailyTemplates.length + eventTotal, completed: dailyCompletions.length + eventCompleted },
        weekly: { total: weeklyTemplates.length, completed: weeklyCompletions.length },
        monthly: { total: monthlyTemplates.length, completed: monthlyCompletions.length },
        events: { total: eventTotal, completed: eventCompleted },
      });
    } catch (error: any) {
      console.error("Error fetching task summary:", error);
      res.status(500).json({ message: "Özet alınamadı" });
    }
  });

  app.get('/api/daily-tasks/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const now = new Date();

      const tasks = await db.select().from(eventTriggeredTasks)
        .where(and(
          eq(eventTriggeredTasks.userId, userId),
          or(isNull(eventTriggeredTasks.expiresAt), gte(eventTriggeredTasks.expiresAt, now))
        ))
        .orderBy(eventTriggeredTasks.priority, desc(eventTriggeredTasks.createdAt))
        .limit(50);

      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching event tasks:", error);
      res.status(500).json({ message: "Sistem gorevleri alinamadi" });
    }
  });

  app.post('/api/daily-tasks/events/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user?.id;

      const [updated] = await db.update(eventTriggeredTasks)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(and(
          eq(eventTriggeredTasks.id, taskId),
          eq(eventTriggeredTasks.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Gorev bulunamadi" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error completing event task:", error);
      res.status(500).json({ message: "Gorev tamamlanamadi" });
    }
  });

  app.post('/api/daily-tasks/events/:id/uncomplete', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user?.id;

      const [updated] = await db.update(eventTriggeredTasks)
        .set({ isCompleted: false, isAutoResolved: false, completedAt: null })
        .where(and(
          eq(eventTriggeredTasks.id, taskId),
          eq(eventTriggeredTasks.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Gorev bulunamadi" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error uncompleting event task:", error);
      res.status(500).json({ message: "Islem yapilamadi" });
    }
  });

  app.delete('/api/daily-tasks/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user?.id;

      await db.delete(eventTriggeredTasks)
        .where(and(
          eq(eventTriggeredTasks.id, taskId),
          eq(eventTriggeredTasks.userId, userId)
        ));

      res.json({ message: "Gorev silindi" });
    } catch (error: any) {
      console.error("Error deleting event task:", error);
      res.status(500).json({ message: "Gorev silinemedi" });
    }
  });

  // Admin: Manage task templates
  app.get('/api/admin/task-templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const role = req.query.role as string;
      let query = db.select().from(roleTaskTemplates).orderBy(roleTaskTemplates.role, roleTaskTemplates.sortOrder);
      
      const templates = role 
        ? await db.select().from(roleTaskTemplates).where(eq(roleTaskTemplates.role, role)).orderBy(roleTaskTemplates.sortOrder)
        : await db.select().from(roleTaskTemplates).orderBy(roleTaskTemplates.role, roleTaskTemplates.sortOrder);
      
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ message: "Şablonlar alınamadı" });
    }
  });

  app.post('/api/admin/task-templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [template] = await db.insert(roleTaskTemplates).values(req.body).returning();
      res.json(template);
    } catch (error: any) {
      console.error("Error creating task template:", error);
      res.status(500).json({ message: "Şablon oluşturulamadı" });
    }
  });

  app.patch('/api/admin/task-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [template] = await db.update(roleTaskTemplates)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(roleTaskTemplates.id, parseInt(req.params.id)))
        .returning();
      res.json(template);
    } catch (error: any) {
      console.error("Error updating task template:", error);
      res.status(500).json({ message: "Şablon güncellenemedi" });
    }
  });

  app.delete('/api/admin/task-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      await db.delete(roleTaskTemplates).where(eq(roleTaskTemplates.id, parseInt(req.params.id)));
      res.json({ message: "Şablon silindi" });
    } catch (error: any) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ message: "Şablon silinemedi" });
    }
  });

  // Stock Count endpoints
  app.get('/api/factory/stock-counts', isAuthenticated, async (req: any, res) => {
    try {
      const counts = await db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt)).limit(50);
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ message: "Stok sayımları alınamadı" });
    }
  });

  const RAW_MATERIAL_CATEGORIES = ["hammadde", "ambalaj", "konsantre", "cay_grubu", "kahve", "toz_topping", "sarf_malzeme", "temizlik", "arge"];
  const FINISHED_PRODUCT_CATEGORIES = ["mamul", "donut", "tatli", "tuzlu", "yarimamul"];

  async function autoPopulateItems(countId: number, countType: string, scope: string, requestedCategory: string | null) {
    let categoryFilter: string[] | null = null;

    if (scope === 'category' && requestedCategory) {
      categoryFilter = [requestedCategory];
    } else if (scope === 'full' || countType === 'both') {
      categoryFilter = null;
    } else if (countType === 'raw_material') {
      categoryFilter = RAW_MATERIAL_CATEGORIES;
    } else if (countType === 'finished_product') {
      categoryFilter = FINISHED_PRODUCT_CATEGORIES;
    }

    let inventoryItems;
    if (categoryFilter) {
      inventoryItems = await db.select().from(inventory)
        .where(and(eq(inventory.isActive, true), inArray(inventory.category, categoryFilter)));
    } else {
      inventoryItems = await db.select().from(inventory)
        .where(eq(inventory.isActive, true));
    }

    for (const item of inventoryItems) {
      await db.insert(stockCountItems).values({
        stockCountId: countId,
        itemType: item.category,
        itemId: item.id,
        itemName: item.name,
        expectedQuantity: item.currentStock?.toString() || "0",
        unit: item.unit,
      });
    }

    return inventoryItems.length;
  }

  app.post('/api/factory/stock-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'fabrika_mudur', 'ceo', 'cgo', 'satinalma'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { countType, notes, assignedTo, requestedCategory, scope } = req.body;

      const [count] = await db.insert(stockCounts).values({
        countType: countType || 'raw_material',
        startedBy: req.user.id,
        notes: notes || null,
        assignedTo: assignedTo || null,
        requestedCategory: requestedCategory || null,
        scope: scope || 'full',
      }).returning();

      const itemCount = await autoPopulateItems(count.id, count.countType, count.scope, count.requestedCategory);

      res.json({ ...count, itemCount });
    } catch (error: any) {
      console.error("Error creating stock count:", error);
      res.status(500).json({ message: "Stok sayımı oluşturulamadı" });
    }
  });

  app.get('/api/factory/stock-counts/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await db.select().from(stockCountItems)
        .where(eq(stockCountItems.stockCountId, parseInt(req.params.id)));
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: "Sayım kalemleri alınamadı" });
    }
  });

  app.patch('/api/factory/stock-counts/:countId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { countedQuantity, notes } = req.body;
      const expected = parseFloat(req.body.expectedQuantity || "0");
      const counted = parseFloat(countedQuantity || "0");
      const difference = (counted - expected).toString();

      const [updated] = await db.update(stockCountItems)
        .set({ countedQuantity, difference, notes })
        .where(eq(stockCountItems.id, parseInt(req.params.itemId)))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Kalem güncellenemedi" });
    }
  });

  app.patch('/api/factory/stock-counts/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const countId = parseInt(req.params.id);

      const items = await db.select().from(stockCountItems)
        .where(eq(stockCountItems.stockCountId, countId));

      for (const item of items) {
        if (item.countedQuantity && item.difference && parseFloat(item.difference) !== 0) {
          const countedQty = parseFloat(item.countedQuantity);
          const invItem = await db.select().from(inventory).where(eq(inventory.id, item.itemId)).limit(1);

          if (invItem.length > 0) {
            const previousStock = parseFloat(invItem[0].currentStock?.toString() || "0");

            await db.insert(inventoryMovements).values({
              inventoryId: item.itemId,
              movementType: 'sayim_duzeltme',
              quantity: Math.abs(countedQty - previousStock).toString(),
              previousStock: previousStock.toString(),
              newStock: countedQty.toString(),
              referenceType: 'stock_count',
              referenceId: countId,
              notes: `Sayım düzeltme - Fark: ${item.difference}`,
              createdById: req.user?.id || null,
            });

            await db.update(inventory)
              .set({ currentStock: countedQty.toString(), updatedAt: new Date() })
              .where(eq(inventory.id, item.itemId));
          }
        }
      }

      const [updated] = await db.update(stockCounts)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(stockCounts.id, countId))
        .returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Error completing stock count:", error);
      res.status(500).json({ message: "Sayım tamamlanamadı" });
    }
  });

  app.patch('/api/factory/stock-counts/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'admin' && userRole !== 'fabrika_mudur') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const [updated] = await db.update(stockCounts)
        .set({ status: 'approved', approvedBy: req.user.id })
        .where(eq(stockCounts.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Sayım onaylanamadı" });
    }
  });

  app.post('/api/factory/stock-counts/request', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const allowedRoles = ['admin', 'ceo', 'cgo', 'satinalma', 'fabrika_mudur'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { countType, notes, assignedTo, requestedCategory, scope } = req.body;

      const [count] = await db.insert(stockCounts).values({
        countType: countType || 'raw_material',
        status: 'requested',
        startedBy: req.user.id,
        requestedBy: req.user.id,
        assignedTo: assignedTo || null,
        requestedCategory: requestedCategory || null,
        scope: scope || 'full',
        notes: notes || null,
      }).returning();

      res.json(count);
    } catch (error: any) {
      console.error("Error requesting stock count:", error);
      res.status(500).json({ message: "Sayım talebi oluşturulamadı" });
    }
  });

  app.patch('/api/factory/stock-counts/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const countId = parseInt(req.params.id);

      const existing = await db.select().from(stockCounts).where(eq(stockCounts.id, countId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ message: "Sayım bulunamadı" });
      }

      const count = existing[0];

      const isAdminOrManager = req.user?.role === 'admin' || req.user?.role === 'fabrika_mudur';
      if (!isAdminOrManager && count.assignedTo && count.assignedTo !== req.user?.id) {
        return res.status(403).json({ message: "Bu sayım size atanmamış" });
      }

      if (count.status !== 'requested') {
        return res.status(400).json({ message: "Bu sayım zaten başlatılmış" });
      }

      const itemCount = await autoPopulateItems(countId, count.countType, count.scope, count.requestedCategory);

      const [updated] = await db.update(stockCounts)
        .set({ status: 'in_progress', startedAt: new Date() })
        .where(eq(stockCounts.id, countId))
        .returning();

      res.json({ ...updated, itemCount });
    } catch (error: any) {
      console.error("Error starting stock count:", error);
      res.status(500).json({ message: "Sayım başlatılamadı" });
    }
  });

  app.get('/api/inventory/:id/qr', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const items = await db.select().from(inventory).where(eq(inventory.id, itemId)).limit(1);

      if (items.length === 0) {
        return res.status(404).json({ message: "Ürün bulunamadı" });
      }

      const item = items[0];
      const qrData = `INV-${item.id}-${item.code}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

      res.json({
        ...item,
        qrData,
        qrCodeUrl,
      });
    } catch (error: any) {
      console.error("Error generating QR:", error);
      res.status(500).json({ message: "QR oluşturulamadı" });
    }
  });

  app.post('/api/inventory/by-qr', isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      if (!qrCode) {
        return res.status(400).json({ message: "QR kodu gerekli" });
      }

      const match = qrCode.match(/^INV-(\d+)-(.+)$/);
      if (match) {
        const itemId = parseInt(match[1]);
        const items = await db.select().from(inventory).where(eq(inventory.id, itemId)).limit(1);
        if (items.length > 0) {
          return res.json(items[0]);
        }
      }

      const itemsByQr = await db.select().from(inventory).where(eq(inventory.qrCode, qrCode)).limit(1);
      if (itemsByQr.length > 0) {
        return res.json(itemsByQr[0]);
      }

      const itemsByBarcode = await db.select().from(inventory).where(eq(inventory.barcode, qrCode)).limit(1);
      if (itemsByBarcode.length > 0) {
        return res.json(itemsByBarcode[0]);
      }

      res.status(404).json({ message: "Ürün bulunamadı" });
    } catch (error: any) {
      console.error("Error looking up by QR:", error);
      res.status(500).json({ message: "QR ile arama yapılamadı" });
    }
  });

  app.get('/api/inventory-movements', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'fabrika_mudur', 'fabrika_personel', 'depo_sorumlusu', 'satinalma', 'ceo', 'cgo'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const type = req.query.type as string;
      const limit = parseInt(req.query.limit as string) || 20;
      let query = db.select().from(inventoryMovements);
      if (type) {
        query = query.where(eq(inventoryMovements.movementType, type));
      }
      const movements = await query.orderBy(desc(inventoryMovements.createdAt)).limit(limit);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: "Hareketler alınamadı" });
    }
  });

  app.post('/api/factory/stock-exit', isAuthenticated, async (req: any, res) => {
    try {
      const allowedRoles = ['admin', 'fabrika_mudur', 'fabrika_personel', 'depo_sorumlusu', 'satinalma'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { inventoryId, quantity, notes, referenceType, referenceId } = req.body;

      if (!inventoryId || !quantity) {
        return res.status(400).json({ message: "Ürün ve miktar gerekli" });
      }

      const items = await db.select().from(inventory).where(eq(inventory.id, inventoryId)).limit(1);
      if (items.length === 0) {
        return res.status(404).json({ message: "Ürün bulunamadı" });
      }

      const item = items[0];
      const previousStock = parseFloat(item.currentStock?.toString() || "0");
      const exitQty = parseFloat(quantity);
      const newStock = previousStock - exitQty;

      const [movement] = await db.insert(inventoryMovements).values({
        inventoryId,
        movementType: 'cikis',
        quantity: exitQty.toString(),
        previousStock: previousStock.toString(),
        newStock: newStock.toString(),
        referenceType: referenceType || 'order_fulfillment',
        referenceId: referenceId ? parseInt(referenceId) : null,
        notes: notes || null,
        createdById: req.user?.id || null,
      }).returning();

      await db.update(inventory)
        .set({ currentStock: newStock.toString(), updatedAt: new Date() })
        .where(eq(inventory.id, inventoryId));

      res.json(movement);
    } catch (error: any) {
      console.error("Error creating stock exit:", error);
      res.status(500).json({ message: "Stok çıkışı oluşturulamadı" });
    }
  });
}
