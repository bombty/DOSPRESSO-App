import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated, isKioskAuthenticated, createKioskSession } from "../localAuth";
import { eq, desc, asc, and, or, gte, lte, sql, inArray, isNull, isNotNull, not, ne, count, sum, avg, max, min } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  hasPermission,
  isHQRole,
  type UserRoleType,
  factoryStations,
  factoryStaffPins,
  factoryShiftSessions,
  factoryProductionRuns,
  factoryDailyTargets,
  factoryWasteReasons,
  factorySessionEvents,
  factoryBreakLogs,
  factoryProductionOutputs,
  factoryQualitySpecs,
  factoryProductionPlans,
  factoryTeams,
  factoryTeamMembers,
  factoryShiftCompliance,
  factoryWeeklyAttendanceSummary,
  factoryProducts,
  factoryProductionBatches,
  factoryBatchVerifications,
  factoryManagementScores,
  factoryQualityChecks,
  haccpCheckRecords,
  factoryShipments,
  factoryShipmentItems,
  factoryInventory,
  inventoryMovements,
  coffeeRoastingLogs,
  productionLots,
  users,
  branches,
  inventory,
  recipes,
  notifications,
  branchKioskSettings,
} from "../../shared/schema";

const router = Router();

const kioskLoginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 30 * 60 * 1000;

function checkKioskRateLimit(identifier: string): { allowed: boolean; retryAfter?: number; remainingAttempts?: number } {
  const now = Date.now();
  const record = kioskLoginAttempts.get(identifier);
  if (!record) { kioskLoginAttempts.set(identifier, { count: 1, lastAttempt: now }); return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }; }
  if (record.blockedUntil && now < record.blockedUntil) { return { allowed: false, retryAfter: Math.ceil((record.blockedUntil - now) / 1000) }; }
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) { kioskLoginAttempts.set(identifier, { count: 1, lastAttempt: now }); return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }; }
  record.count++; record.lastAttempt = now;
  if (record.count > MAX_ATTEMPTS) { record.blockedUntil = now + BLOCK_DURATION; kioskLoginAttempts.set(identifier, record); return { allowed: false, retryAfter: BLOCK_DURATION / 1000 }; }
  kioskLoginAttempts.set(identifier, record);
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

  router.get('/api/factory/products', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string | undefined;
      const products = await storage.getFactoryProducts(category);
      res.json(products);
    } catch (error: any) {
      console.error("Get factory products error:", error);
      res.status(500).json({ message: "Ürünler getirilemedi" });
    }
  });

  router.get('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getFactoryProduct(id);
      if (!product) return res.status(404).json({ message: "Ürün bulunamadı" });
      res.json(product);
    } catch (error: any) {
      console.error("Get factory product error:", error);
      res.status(500).json({ message: "Ürün getirilemedi" });
    }
  });

  router.post('/api/factory/products', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const product = await storage.createFactoryProduct(req.body);
      res.json(product);
    } catch (error: any) {
      console.error("Create factory product error:", error);
      res.status(500).json({ message: "Ürün oluşturulamadı" });
    }
  });

  router.patch('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const product = await storage.updateFactoryProduct(id, req.body);
      res.json(product);
    } catch (error: any) {
      console.error("Update factory product error:", error);
      res.status(500).json({ message: "Ürün güncellenemedi" });
    }
  });

  router.delete('/api/factory/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteFactoryProduct(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete factory product error:", error);
      res.status(500).json({ message: "Ürün silinemedi" });
    }
  });

  // Production Batches
  router.get('/api/factory/batches', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const status = req.query.status as string | undefined;
      const batches = await storage.getProductionBatches(productId, status);
      res.json(batches);
    } catch (error: any) {
      console.error("Get production batches error:", error);
      res.status(500).json({ message: "Partiler getirilemedi" });
    }
  });

  router.get('/api/factory/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const batch = await storage.getProductionBatch(id);
      if (!batch) return res.status(404).json({ message: "Parti bulunamadı" });
      res.json(batch);
    } catch (error: any) {
      console.error("Get production batch error:", error);
      res.status(500).json({ message: "Parti getirilemedi" });
    }
  });

  router.post('/api/factory/batches', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const batch = await storage.createProductionBatch({
        ...req.body,
        producedById: req.user.id
      });
      res.json(batch);
    } catch (error: any) {
      console.error("Create production batch error:", error);
      res.status(500).json({ message: "Parti oluşturulamadı" });
    }
  });

  router.patch('/api/factory/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const id = parseInt(req.params.id);
      const batch = await storage.updateProductionBatch(id, req.body);
      res.json(batch);
    } catch (error: any) {
      console.error("Update production batch error:", error);
      res.status(500).json({ message: "Parti güncellenemedi" });
    }
  });

  // Branch Orders
  router.get('/api/factory/orders', isAuthenticated, async (req: any, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const status = req.query.status as string | undefined;
      const orders = await storage.getBranchOrders(branchId, status);
      res.json(orders);
    } catch (error: any) {
      console.error("Get branch orders error:", error);
      res.status(500).json({ message: "Siparişler getirilemedi" });
    }
  });

  router.get('/api/factory/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getBranchOrder(id);
      if (!order) return res.status(404).json({ message: "Sipariş bulunamadı" });
      const items = await storage.getBranchOrderItems(id);
      res.json({ ...order, items });
    } catch (error: any) {
      console.error("Get branch order error:", error);
      res.status(500).json({ message: "Sipariş getirilemedi" });
    }
  });

  router.post('/api/factory/orders', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...orderData } = req.body;
      const orderNumber = `ORD-${Date.now()}`;
      const order = await storage.createBranchOrder({
        ...orderData,
        orderNumber,
        requestedById: req.user.id
      });
      
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createBranchOrderItem({
            ...item,
            orderId: order.id
          });
        }
      }
      
      res.json(order);
    } catch (error: any) {
      console.error("Create branch order error:", error);
      res.status(500).json({ message: "Sipariş oluşturulamadı" });
    }
  });

  router.patch('/api/factory/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: any = { ...req.body };
      
      if (req.body.status && ['confirmed', 'preparing', 'shipped', 'delivered'].includes(req.body.status)) {
        updates.processedById = req.user.id;
      }
      
      const order = await storage.updateBranchOrder(id, updates);
      res.json(order);
    } catch (error: any) {
      console.error("Update branch order error:", error);
      res.status(500).json({ message: "Sipariş güncellenemedi" });
    }
  });

  // Factory Inventory
  router.get('/api/factory/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const inventory = await storage.getFactoryInventory(productId);
      res.json(inventory);
    } catch (error: any) {
      console.error("Get factory inventory error:", error);
      res.status(500).json({ message: "Stok bilgisi getirilemedi" });
    }
  });

  router.post('/api/factory/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const { productId, batchId, quantity } = req.body;
      const inventory = await storage.updateFactoryInventory(productId, batchId, quantity, req.user.id);
      res.json(inventory);
    } catch (error: any) {
      console.error("Update factory inventory error:", error);
      res.status(500).json({ message: "Stok güncellenemedi" });
    }
  });

  // ========================================
  // TOPLU VERİ YÖNETİMİ - Bulk Data Management API'leri
  // ========================================

  // Download Excel template for equipment
  router.get('/api/factory/stations', isAuthenticated, async (req, res) => {
    try {
      const showAll = req.query.all === 'true';
      const stations = await db.select().from(factoryStations)
        .where(showAll ? undefined : eq(factoryStations.isActive, true))
        .orderBy(factoryStations.sortOrder);
      res.json(stations);
    } catch (error: any) {
      console.error("Error fetching factory stations:", error);
      res.status(500).json({ message: "İstasyonlar alınamadı" });
    }
  });

  // Yeni istasyon oluştur
  router.post('/api/factory/stations', isAuthenticated, async (req, res) => {
    try {
      const { name, code, description, category, targetHourlyOutput, maxCapacity, isActive, sortOrder } = req.body;
      
      if (!name || !code) {
        return res.status(400).json({ message: "İstasyon adı ve kodu gerekli" });
      }

      const [newStation] = await db.insert(factoryStations).values({
        name,
        code,
        description: description || null,
        category: category || null,
        targetHourlyOutput: targetHourlyOutput || null,
        maxCapacity: maxCapacity || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      }).returning();

      res.status(201).json(newStation);
    } catch (error: any) {
      console.error("Error creating station:", error);
      res.status(500).json({ message: "İstasyon oluşturulamadı" });
    }
  });

  // İstasyon güncelle
  router.patch('/api/factory/stations/:id', isAuthenticated, async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const { name, code, description, category, targetHourlyOutput, maxCapacity, isActive, sortOrder } = req.body;

      const [updated] = await db.update(factoryStations)
        .set({
          name,
          code,
          description: description || null,
          category: category || null,
          targetHourlyOutput: targetHourlyOutput || null,
          maxCapacity: maxCapacity || null,
          isActive,
          sortOrder: sortOrder || 0,
        })
        .where(eq(factoryStations.id, stationId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "İstasyon bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating station:", error);
      res.status(500).json({ message: "İstasyon güncellenemedi" });
    }
  });

  // İstasyon sil
  router.delete('/api/factory/stations/:id', isAuthenticated, async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);

      // Soft delete - just set isActive to false
      const [deleted] = await db.update(factoryStations)
        .set({ isActive: false })
        .where(eq(factoryStations.id, stationId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "İstasyon bulunamadı" });
      }

      res.json({ success: true, message: "İstasyon silindi" });
    } catch (error: any) {
      console.error("Error deleting station:", error);
      res.status(500).json({ message: "İstasyon silinemedi" });
    }
  });

  // Fabrika PIN kayıtlarını listele
  router.get('/api/factory/pins', isAuthenticated, async (req, res) => {
    try {
      const pinRecords = await db.select({
        id: factoryStaffPins.id,
        userId: factoryStaffPins.userId,
        isActive: factoryStaffPins.isActive,
        pinFailedAttempts: factoryStaffPins.pinFailedAttempts,
        pinLockedUntil: factoryStaffPins.pinLockedUntil,
        createdAt: factoryStaffPins.createdAt,
      }).from(factoryStaffPins)
        .orderBy(factoryStaffPins.createdAt);
      res.json(pinRecords);
    } catch (error: any) {
      console.error("Error fetching pins:", error);
      res.status(500).json({ message: "PIN kayıtları alınamadı" });
    }
  });

  // Yeni PIN oluştur
  router.post('/api/factory/pins', isAuthenticated, async (req, res) => {
    try {
      const { userId, pin } = req.body;
      
      if (!userId || !pin) {
        return res.status(400).json({ message: "Kullanıcı ID ve PIN gerekli" });
      }

      if (pin.length !== 4) {
        return res.status(400).json({ message: "PIN 4 haneli olmalı" });
      }

      // Check if user already has a PIN
      const existing = await db.select().from(factoryStaffPins)
        .where(eq(factoryStaffPins.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ message: "Bu kullanıcının zaten PIN kaydı var" });
      }

      // Hash the PIN
      const hashedPin = await bcrypt.hash(pin, 10);

      const [newPin] = await db.insert(factoryStaffPins).values({
        userId,
        hashedPin,
        isActive: true,
        createdAt: new Date(),
      }).returning();

      res.status(201).json({ success: true, id: newPin.id });
    } catch (error: any) {
      console.error("Error creating PIN:", error);
      res.status(500).json({ message: "PIN oluşturulamadı" });
    }
  });

  // PIN sıfırla
  router.patch('/api/factory/pins/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { pin } = req.body;

      if (!pin || pin.length !== 4) {
        return res.status(400).json({ message: "4 haneli PIN gerekli" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);

      const [updated] = await db.update(factoryStaffPins)
        .set({
          hashedPin,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        })
        .where(eq(factoryStaffPins.userId, userId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "PIN kaydı bulunamadı" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error resetting PIN:", error);
      res.status(500).json({ message: "PIN sıfırlanamadı" });
    }
  });

  // Hesap kilidini aç
  router.post('/api/factory/pins/:userId/unlock', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const [updated] = await db.update(factoryStaffPins)
        .set({
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        })
        .where(eq(factoryStaffPins.userId, userId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "PIN kaydı bulunamadı" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unlocking account:", error);
      res.status(500).json({ message: "Hesap kilidi açılamadı" });
    }
  });

  // PIN sil
  router.delete('/api/factory/pins/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const [deleted] = await db.delete(factoryStaffPins)
        .where(eq(factoryStaffPins.userId, userId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "PIN kaydı bulunamadı" });
      }

      res.json({ success: true, message: "PIN silindi" });
    } catch (error: any) {
      console.error("Error deleting PIN:", error);
      res.status(500).json({ message: "PIN silinemedi" });
    }
  });

  // Fabrika personeli listesi (PIN ile giriş için)
  router.get('/api/factory/staff', isAuthenticated, async (req, res) => {
    try {
      // Get users with factory role or factory branch
      const factoryStaff = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
      }).from(users)
        .where(and(
          eq(users.isActive, true),
          or(
            eq(users.role, 'fabrika'),
            eq(users.role, 'fabrika_mudur'),
            eq(users.role, 'fabrika_operator'),
            eq(users.role, 'fabrika_supervisor'),
          )
        ))
        .orderBy(users.firstName);
      
      res.json(factoryStaff);
    } catch (error: any) {
      console.error("Error fetching factory staff:", error);
      res.status(500).json({ message: "Fabrika personeli alınamadı" });
    }
  });

  // Kiosk PIN girişi (personel seçip PIN ile giriş)
  router.post('/api/factory/kiosk/login', async (req, res) => {
    try {
      const { userId, pin } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitId = `factory_${clientIp}_${userId || 'unknown'}`;
      const rateCheck = checkKioskRateLimit(rateLimitId);
      if (!rateCheck.allowed) { return res.status(429).json({ message: `Çok fazla deneme. ${Math.ceil((rateCheck.retryAfter || 1800) / 60)} dakika sonra tekrar deneyin.`, retryAfter: rateCheck.retryAfter }); }
      
      if (!userId || !pin) {
        return res.status(400).json({ message: "Kullanıcı ve PIN gerekli" });
      }

      // Get user's PIN record
      const [pinRecord] = await db.select().from(factoryStaffPins)
        .where(and(
          eq(factoryStaffPins.userId, userId),
          eq(factoryStaffPins.isActive, true)
        ))
        .limit(1);

      if (!pinRecord) {
        return res.status(404).json({ message: "PIN kaydı bulunamadı. Yöneticinizle iletişime geçin." });
      }

      // Check if locked
      if (pinRecord.pinLockedUntil && new Date(pinRecord.pinLockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(pinRecord.pinLockedUntil).getTime() - Date.now()) / 60000);
        return res.status(423).json({ message: `Hesabınız ${remainingMinutes} dakika kilitli` });
      }

      // Verify PIN
      const isValid = await bcrypt.compare(pin, pinRecord.hashedPin);
      
      if (!isValid) {
        const newAttempts = (pinRecord.pinFailedAttempts || 0) + 1;
        const lockUntil = newAttempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        
        await db.update(factoryStaffPins)
          .set({ 
            pinFailedAttempts: newAttempts,
            pinLockedUntil: lockUntil
          })
          .where(eq(factoryStaffPins.id, pinRecord.id));

        if (newAttempts >= 3) {
          try {
            const [lockedUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
              .from(users).where(eq(users.id, userId)).limit(1);
            const lockedName = lockedUser ? `${lockedUser.firstName} ${lockedUser.lastName}` : `Kullanıcı #${userId}`;
            const admins = await db.select({ id: users.id })
              .from(users)
              .where(or(eq(users.role, 'admin'), eq(users.role, 'fabrika_mudur')));
            if (admins.length > 0) {
              await db.insert(notifications).values(admins.map(a => ({
                userId: a.id,
                type: 'pin_lockout',
                title: 'PIN Kilitlendi',
                message: `${lockedName} hesabı 3 başarısız PIN denemesi sonrası kilitlendi`,
                link: '/admin/fabrika-pin-yonetimi',
                isRead: false,
              })));
            }
          } catch (notifErr) {
            console.error("PIN lockout notification error:", notifErr);
          }
        }
        
        return res.status(401).json({ 
          message: "Hatalı PIN",
          attemptsRemaining: Math.max(0, 3 - newAttempts)
        });
      }

      // Reset failed attempts
      await db.update(factoryStaffPins)
        .set({ pinFailedAttempts: 0, pinLockedUntil: null })
        .where(eq(factoryStaffPins.id, pinRecord.id));

      // Get user details
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Check for active session
      const [activeSession] = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ))
        .limit(1);

      const kioskToken = createKioskSession(userId);
      res.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        activeSession: activeSession || null,
        kioskToken,
      });
    } catch (error: any) {
      console.error("Error in kiosk login:", error);
      res.status(500).json({ message: "Giriş yapılamadı" });
    }
  });

  // Kiosk vardiya başlat (istasyon seçerek)
  router.post('/api/factory/kiosk/start-shift', isKioskAuthenticated, async (req, res) => {
    try {
      const { userId, stationId } = req.body;
      
      if (!userId || !stationId) {
        return res.status(400).json({ message: "Kullanıcı ve istasyon gerekli" });
      }

      // Check for existing active session
      const [existingSession] = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ))
        .limit(1);

      if (existingSession) {
        return res.status(400).json({ message: "Zaten aktif bir vardiyası var", sessionId: existingSession.id });
      }

      // Create shift session
      const [session] = await db.insert(factoryShiftSessions).values({
        userId,
        stationId,
        checkInTime: new Date(),
        status: 'active',
      }).returning();

      // Start production run
      const [productionRun] = await db.insert(factoryProductionRuns).values({
        sessionId: session.id,
        userId,
        stationId,
        startTime: new Date(),
        status: 'in_progress',
      }).returning();

      // Get station info
      const [station] = await db.select().from(factoryStations)
        .where(eq(factoryStations.id, stationId))
        .limit(1);

      res.json({
        success: true,
        session,
        productionRun,
        station,
      });
    } catch (error: any) {
      console.error("Error starting shift:", error);
      res.status(500).json({ message: "Vardiya başlatılamadı" });
    }
  });

  // Kiosk üretim kaydet ve istasyon değiştir
  router.post('/api/factory/kiosk/switch-station', isKioskAuthenticated, async (req, res) => {
    try {
      const { sessionId, productionRunId, quantityProduced, quantityWaste, wasteReason, newStationId } = req.body;
      
      if (!sessionId || !productionRunId) {
        return res.status(400).json({ message: "Oturum ve üretim kaydı gerekli" });
      }

      const now = new Date();

      // Close current production run
      await db.update(factoryProductionRuns)
        .set({
          endTime: now,
          quantityProduced: quantityProduced || 0,
          quantityWaste: quantityWaste || 0,
          wasteReason: wasteReason || null,
          status: 'completed',
        })
        .where(eq(factoryProductionRuns.id, productionRunId));

      // Get session
      const [session] = await db.select().from(factoryShiftSessions)
        .where(eq(factoryShiftSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return res.status(404).json({ message: "Oturum bulunamadı" });
      }

      // Update session totals
      await db.update(factoryShiftSessions)
        .set({
          totalProduced: (session.totalProduced || 0) + (quantityProduced || 0),
          totalWaste: (session.totalWaste || 0) + (quantityWaste || 0),
        })
        .where(eq(factoryShiftSessions.id, sessionId));

      // If new station selected, start new production run
      let newProductionRun = null;
      if (newStationId) {
        await db.update(factoryShiftSessions)
          .set({ stationId: newStationId })
          .where(eq(factoryShiftSessions.id, sessionId));

        [newProductionRun] = await db.insert(factoryProductionRuns).values({
          sessionId,
          userId: session.userId,
          stationId: newStationId,
          startTime: now,
          status: 'in_progress',
        }).returning();
      }

      // Get new station info
      const [station] = newStationId ? await db.select().from(factoryStations)
        .where(eq(factoryStations.id, newStationId))
        .limit(1) : [null];

      res.json({
        success: true,
        newProductionRun,
        station,
      });
    } catch (error: any) {
      console.error("Error switching station:", error);
      res.status(500).json({ message: "İstasyon değiştirilemedi" });
    }
  });

  // Kiosk vardiya bitir
  router.post('/api/factory/kiosk/end-shift', isKioskAuthenticated, async (req, res) => {
    try {
      const { sessionId, productionRunId, quantityProduced, producedUnit, quantityWaste, wasteUnit, wasteReasonId, wasteNotes, wasteReason, photoUrl } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Oturum ID gerekli" });
      }

      const now = new Date();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Close current production run if exists
      if (productionRunId) {
        await db.update(factoryProductionRuns)
          .set({
            endTime: now,
            quantityProduced: quantityProduced || 0,
            quantityWaste: quantityWaste || 0,
            wasteReason: wasteReason || null,
            status: 'completed',
          })
          .where(eq(factoryProductionRuns.id, productionRunId));
      }

      // Get session
      const [session] = await db.select().from(factoryShiftSessions)
        .where(eq(factoryShiftSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return res.status(404).json({ message: "Oturum bulunamadı" });
      }

      // Create production output record with photo if provided
      if (quantityProduced > 0 || photoUrl) {
        await db.insert(factoryProductionOutputs).values({
          sessionId,
          userId: session.userId,
          stationId: session.stationId,
          producedQuantity: String(quantityProduced || 0),
          producedUnit: producedUnit || 'adet',
          wasteQuantity: String(quantityWaste || 0),
          wasteUnit: wasteUnit || 'adet',
          wasteReasonId: wasteReasonId || null,
          wasteNotes: wasteNotes || null,
          photoUrl: photoUrl || null,
          qualityStatus: 'pending',
        });
      }

      // Calculate work minutes
      const workMinutes = Math.round((now.getTime() - new Date(session.checkInTime).getTime()) / 60000);

      // Update session
      await db.update(factoryShiftSessions)
        .set({
          checkOutTime: now,
          totalProduced: (session.totalProduced || 0) + (quantityProduced || 0),
          totalWaste: (session.totalWaste || 0) + (quantityWaste || 0),
          workMinutes,
          status: 'completed',
        })
        .where(eq(factoryShiftSessions.id, sessionId));

      // Get all production runs for this session
      const productionRuns = await db.select().from(factoryProductionRuns)
        .where(eq(factoryProductionRuns.sessionId, sessionId));

      // Calculate totals
      const totalProduced = productionRuns.reduce((sum, run) => sum + (run.quantityProduced || 0), 0);
      const totalWaste = productionRuns.reduce((sum, run) => sum + (run.quantityWaste || 0), 0);

      // ===== SHIFT COMPLIANCE TRACKING =====
      // Fabrika çalışma saatleri: 08:00 - 18:00, 1 saat mola
      const PLANNED_START_HOUR = 8;
      const PLANNED_END_HOUR = 18;
      const PLANNED_BREAK_MINUTES = 60;
      const PLANNED_WORK_MINUTES = (PLANNED_END_HOUR - PLANNED_START_HOUR) * 60 - PLANNED_BREAK_MINUTES; // 540 dakika

      const checkInTime = new Date(session.checkInTime);
      const plannedStartTime = new Date(checkInTime);
      plannedStartTime.setHours(PLANNED_START_HOUR, 0, 0, 0);
      
      const plannedEndTime = new Date(checkInTime);
      plannedEndTime.setHours(PLANNED_END_HOUR, 0, 0, 0);

      // Geç kalma hesapla
      let latenessMinutes = 0;
      if (checkInTime > plannedStartTime) {
        latenessMinutes = Math.round((checkInTime.getTime() - plannedStartTime.getTime()) / 60000);
      }

      // Erken çıkış hesapla
      let earlyLeaveMinutes = 0;
      if (now < plannedEndTime) {
        earlyLeaveMinutes = Math.round((plannedEndTime.getTime() - now.getTime()) / 60000);
      }

      // Mola aşımı hesapla (session'daki break events'den)
      const breakEvents = await db.select().from(factorySessionEvents)
        .where(and(
          eq(factorySessionEvents.sessionId, sessionId),
          eq(factorySessionEvents.eventType, 'break')
        ));
      
      const totalBreakMinutes = breakEvents.reduce((sum, evt) => {
        if (evt.eventStartTime && evt.eventEndTime) {
          return sum + Math.round((new Date(evt.eventEndTime).getTime() - new Date(evt.eventStartTime).getTime()) / 60000);
        }
        return sum;
      }, 0);
      
      const breakOverageMinutes = Math.max(0, totalBreakMinutes - PLANNED_BREAK_MINUTES);

      // Eksik dakika hesapla
      const effectiveWorkedMinutes = workMinutes - totalBreakMinutes;
      const missingMinutes = Math.max(0, PLANNED_WORK_MINUTES - effectiveWorkedMinutes);
      const overtimeMinutes = Math.max(0, effectiveWorkedMinutes - PLANNED_WORK_MINUTES);

      // Uyumluluk skoru hesapla (100 üzerinden)
      let complianceScore = 100;
      if (latenessMinutes > 0) complianceScore -= Math.min(30, latenessMinutes * 2);
      if (earlyLeaveMinutes > 0) complianceScore -= Math.min(30, earlyLeaveMinutes);
      if (breakOverageMinutes > 0) complianceScore -= Math.min(20, breakOverageMinutes * 2);
      complianceScore = Math.max(0, complianceScore);

      // Uyumluluk durumu belirle
      let complianceStatus = 'compliant';
      if (complianceScore < 50) complianceStatus = 'critical';
      else if (complianceScore < 70) complianceStatus = 'warning';
      else if (complianceScore < 90) complianceStatus = 'minor_issue';

      // Uyumluluk kaydı oluştur
      try {
        await db.insert(factoryShiftCompliance).values({
          userId: session.userId,
          factorySessionId: sessionId,
          plannedStartTime: plannedStartTime,
          plannedEndTime: plannedEndTime,
          plannedBreakMinutes: PLANNED_BREAK_MINUTES,
          actualStartTime: checkInTime,
          actualEndTime: now,
          actualBreakMinutes: totalBreakMinutes,
          latenessMinutes,
          earlyLeaveMinutes,
          breakOverageMinutes,
          totalWorkedMinutes: workMinutes,
          effectiveWorkedMinutes,
          overtimeMinutes,
          missingMinutes,
          complianceScore,
          complianceStatus,
          workDate: today.toISOString().split('T')[0],
        });
      } catch (complianceError) {
        console.error("Error creating compliance record:", complianceError);
      }

      // Haftalık özet güncelle
      try {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Pazartesi
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekNumber = Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

        // Mevcut haftalık özeti al veya oluştur
        const [existingSummary] = await db.select()
          .from(factoryWeeklyAttendanceSummary)
          .where(and(
            eq(factoryWeeklyAttendanceSummary.userId, session.userId),
            eq(factoryWeeklyAttendanceSummary.weekStartDate, weekStart.toISOString().split('T')[0])
          ))
          .limit(1);

        if (existingSummary) {
          const newActualTotal = (existingSummary.actualTotalMinutes || 0) + effectiveWorkedMinutes;
          const newOvertime = (existingSummary.overtimeMinutes || 0) + overtimeMinutes;
          const newMissing = Math.max(0, 2700 - newActualTotal); // 45 saat = 2700 dakika
          const newWorkDays = (existingSummary.workDaysCount || 0) + 1;
          const newLateDays = (existingSummary.lateDaysCount || 0) + (latenessMinutes > 0 ? 1 : 0);
          
          await db.update(factoryWeeklyAttendanceSummary)
            .set({
              actualTotalMinutes: newActualTotal,
              overtimeMinutes: newOvertime,
              missingMinutes: newMissing,
              workDaysCount: newWorkDays,
              lateDaysCount: newLateDays,
              weeklyComplianceScore: Math.round((complianceScore + (existingSummary.weeklyComplianceScore || 100)) / 2),
              updatedAt: new Date(),
            })
            .where(eq(factoryWeeklyAttendanceSummary.id, existingSummary.id));
        } else {
          await db.insert(factoryWeeklyAttendanceSummary).values({
            userId: session.userId,
            weekStartDate: weekStart.toISOString().split('T')[0],
            weekEndDate: weekEnd.toISOString().split('T')[0],
            weekNumber,
            year: today.getFullYear(),
            plannedTotalMinutes: 2700, // 45 saat
            actualTotalMinutes: effectiveWorkedMinutes,
            overtimeMinutes,
            missingMinutes: Math.max(0, 2700 - effectiveWorkedMinutes),
            workDaysCount: 1,
            absentDaysCount: 0,
            lateDaysCount: latenessMinutes > 0 ? 1 : 0,
            weeklyComplianceScore: complianceScore,
          });
        }
      } catch (weeklyError) {
        console.error("Error updating weekly summary:", weeklyError);
      }

      res.json({
        success: true,
        summary: {
          workMinutes,
          totalProduced,
          totalWaste,
          efficiency: totalProduced > 0 ? ((totalProduced - totalWaste) / totalProduced * 100).toFixed(1) : 0,
          stationsWorked: productionRuns.length,
        },
        compliance: {
          latenessMinutes,
          earlyLeaveMinutes,
          breakOverageMinutes,
          missingMinutes,
          complianceScore,
          complianceStatus,
        }
      });
    } catch (error: any) {
      console.error("Error ending shift:", error);
      res.status(500).json({ message: "Vardiya sonlandırılamadı" });
    }
  });

  // Kullanıcı PIN oluştur/güncelle
  router.post('/api/factory/staff/pin', isAuthenticated, async (req, res) => {
    try {
      const { userId, pin } = req.body;
      const user = req.user!;
      
      // Only factory managers or admins can set PINs for others
      const canManage = user.role === 'admin' || user.role === 'fabrika_mudur' || user.id === userId;
      
      if (!canManage) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      if (!pin || pin.length < 4 || pin.length > 6) {
        return res.status(400).json({ message: "PIN 4-6 haneli olmalıdır" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);

      // Upsert PIN record
      const existing = await db.select().from(factoryStaffPins)
        .where(eq(factoryStaffPins.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(factoryStaffPins)
          .set({ hashedPin, pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
          .where(eq(factoryStaffPins.userId, userId));
      } else {
        await db.insert(factoryStaffPins).values({
          userId,
          hashedPin,
          isActive: true,
        });
      }

      res.json({ success: true, message: "PIN güncellendi" });
    } catch (error: any) {
      console.error("Error setting PIN:", error);
      res.status(500).json({ message: "PIN ayarlanamadı" });
    }
  });

  // Fabrika dashboard istatistikleri
  router.get('/api/factory/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's sessions
      const todaySessions = await db.select().from(factoryShiftSessions)
        .where(gte(factoryShiftSessions.checkInTime, today));

      // Get active sessions
      const activeSessions = await db.select().from(factoryShiftSessions)
        .where(eq(factoryShiftSessions.status, 'active'));

      // Get today's production runs
      const todayRuns = await db.select().from(factoryProductionRuns)
        .where(gte(factoryProductionRuns.startTime, today));

      const totalProduced = todayRuns.reduce((sum, run) => sum + (run.quantityProduced || 0), 0);
      const totalWaste = todayRuns.reduce((sum, run) => sum + (run.quantityWaste || 0), 0);

      // Get stations with today's production
      const stationProduction = await db.select({
        stationId: factoryProductionRuns.stationId,
        produced: sql<number>`SUM(${factoryProductionRuns.quantityProduced})`,
        waste: sql<number>`SUM(${factoryProductionRuns.quantityWaste})`,
      }).from(factoryProductionRuns)
        .where(gte(factoryProductionRuns.startTime, today))
        .groupBy(factoryProductionRuns.stationId);

      res.json({
        activeWorkers: activeSessions.length,
        todayShifts: todaySessions.length,
        totalProduced,
        totalWaste,
        efficiency: totalProduced > 0 ? ((totalProduced - totalWaste) / totalProduced * 100).toFixed(1) : 0,
        stationProduction,
      });
    } catch (error: any) {
      console.error("Error fetching factory dashboard:", error);
      res.status(500).json({ message: "Dashboard verileri alınamadı" });
    }
  });


  // Cost dashboard stats for fabrika dashboard - admin & fabrika_mudur only
  router.get('/api/factory/cost-dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin' && user.role !== 'fabrika_mudur') {
        return res.status(403).json({ message: "Bu verilere erişim yetkiniz yok" });
      }

      const [productCount] = await db.execute(sql`SELECT COUNT(*) as count FROM factory_products WHERE is_active = true`);
      const [recipeCount] = await db.execute(sql`SELECT COUNT(*) as count FROM product_recipes WHERE is_active = true`);
      const [materialCount] = await db.execute(sql`SELECT COUNT(*) as count FROM raw_materials`);
      const [fixedCostResult] = await db.execute(sql`SELECT COALESCE(SUM(CAST(monthly_amount AS numeric)), 0) as total FROM factory_fixed_costs WHERE is_recurring = true`);
      const [marginResult] = await db.execute(sql`SELECT COALESCE(AVG(CAST(default_margin AS numeric)), 1) as avg_margin FROM profit_margin_templates`);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const [calcCount] = await db.execute(sql`SELECT COUNT(*) as count FROM product_recipes WHERE cost_last_calculated >= ${thisMonth}`);

      res.json({
        productCount: Number((productCount as any).count || 0),
        recipeCount: Number((recipeCount as any).count || 0),
        materialCount: Number((materialCount as any).count || 0),
        totalFixedCosts: Number((fixedCostResult as any).total || 0),
        avgProfitMargin: (Number((marginResult as any).avg_margin || 1) - 1) * 100,
        calculationsThisMonth: Number((calcCount as any).count || 0),
      });
    } catch (error: any) {
      console.error("Error fetching cost dashboard stats:", error);
      res.status(500).json({ message: "Maliyet istatistikleri alınamadı" });
    }
  });
  // Quality Control Overview for fabrika dashboard
  router.get('/api/factory/quality-overview', isAuthenticated, async (req: any, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const qualityResults = await db.execute(sql`
        SELECT 
          COUNT(*) as total_checked,
          COUNT(CASE WHEN quality_status = 'approved' THEN 1 END) as passed,
          COUNT(CASE WHEN quality_status = 'rejected' THEN 1 END) as failed,
          COUNT(CASE WHEN quality_status IN ('pending', 'pending_engineer') THEN 1 END) as pending
        FROM factory_production_batches
        WHERE DATE(start_time) = CURRENT_DATE
          AND status IN ('completed', 'verified')
      `);

      const row = (qualityResults as any)[0] || {};
      const todayChecked = Number(row.total_checked || 0);
      const todayPassed = Number(row.passed || 0);
      const todayFailed = Number(row.failed || 0);
      const pendingCheck = Number(row.pending || 0);
      const qualityRate = todayChecked > 0 ? (todayPassed / todayChecked) * 100 : 100;

      res.json({
        todayChecked,
        todayPassed,
        todayFailed,
        pendingCheck,
        qualityRate,
      });
    } catch (error: any) {
      console.error("Error fetching quality overview:", error);
      res.status(500).json({ message: "Kalite kontrol özeti alınamadı" });
    }
  });

  // Stock Overview for fabrika dashboard
  router.get('/api/factory/stock-overview', isAuthenticated, async (req: any, res) => {
    try {
      const rawMaterialCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM raw_materials WHERE is_active = true
      `);
      const finishedProductCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM factory_products WHERE is_active = true
      `);
      const lowStockResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM inventory_items 
        WHERE current_stock <= COALESCE(min_stock, 0) 
          AND COALESCE(min_stock, 0) > 0
      `);
      const lastCountResult = await db.execute(sql`
        SELECT MAX(created_at) as last_count FROM stock_counts
      `);

      res.json({
        totalRawMaterials: Number((rawMaterialCount as any)[0]?.count || 0),
        totalFinishedProducts: Number((finishedProductCount as any)[0]?.count || 0),
        lowStockCount: Number((lowStockResult as any)[0]?.count || 0),
        lastCountDate: (lastCountResult as any)[0]?.last_count || null,
      });
    } catch (error: any) {
      console.error("Error fetching stock overview:", error);
      res.json({
        totalRawMaterials: 0,
        totalFinishedProducts: 0,
        lowStockCount: 0,
        lastCountDate: null,
      });
    }
  });

  // Waste dashboard stats for fabrika dashboard
  router.get('/api/factory/waste-dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      const canSeeCostData = userRole === 'admin' || userRole === 'fabrika_mudur';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const batchStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_batches,
          COALESCE(AVG(CAST(actual_waste_percent AS numeric)), 0) as avg_waste_percent,
          COALESCE(SUM(CAST(waste_weight_kg AS numeric)), 0) as total_waste_kg,
          COALESCE(SUM(CAST(waste_cost_tl AS numeric)), 0) as total_waste_cost_tl,
          COUNT(CASE WHEN CAST(actual_waste_percent AS numeric) > COALESCE(CAST(expected_waste_percent AS numeric), 5) + COALESCE(CAST(waste_deviation_percent AS numeric), 5) THEN 1 END) as over_tolerance_count
        FROM factory_production_batches
        WHERE start_time >= ${thirtyDaysAgo}
          AND status IN ('completed', 'verified')
      `);

      const row = (batchStats as any)[0] || {};
      const totalBatches = Number(row.total_batches || 0);
      const overToleranceCount = Number(row.over_tolerance_count || 0);

      // Get trend data (last 30 days grouped by date)
      const trendData = await db.execute(sql`
        SELECT 
          TO_CHAR(start_time, 'MM/DD') as date,
          COALESCE(AVG(CAST(actual_waste_percent AS numeric)), 0) as waste_percent,
          COUNT(*) as batch_count
        FROM factory_production_batches
        WHERE start_time >= ${thirtyDaysAgo}
          AND status IN ('completed', 'verified')
        GROUP BY TO_CHAR(start_time, 'MM/DD'), DATE(start_time)
        ORDER BY DATE(start_time)
      `);

      // Get product ranking by waste
      const productRanking = await db.execute(sql`
        SELECT 
          fpb.product_id,
          fp.name,
          COALESCE(AVG(CAST(fpb.actual_waste_percent AS numeric)), 0) as waste_percent,
          COUNT(*) as batch_count
        FROM factory_production_batches fpb
        LEFT JOIN factory_products fp ON fpb.product_id = fp.id
        WHERE fpb.start_time >= ${thirtyDaysAgo}
          AND fpb.status IN ('completed', 'verified')
        GROUP BY fpb.product_id, fp.name
        ORDER BY waste_percent DESC
        LIMIT 5
      `);

      res.json({
        totalBatches,
        avgWastePercent: Number(row.avg_waste_percent || 0),
        totalWasteKg: Number(row.total_waste_kg || 0),
        totalWasteCostTl: canSeeCostData ? Number(row.total_waste_cost_tl || 0) : null,
        overToleranceCount,
        overToleranceRate: totalBatches > 0 ? ((overToleranceCount / totalBatches) * 100).toFixed(1) : '0',
        trend: (trendData as any[]).map((t: any) => ({
          date: t.date,
          wastePercent: Number(t.waste_percent || 0),
          batchCount: Number(t.batch_count || 0),
        })),
        productRanking: (productRanking as any[]).map((p: any) => ({
          productId: p.product_id,
          name: p.name,
          wastePercent: Number(p.waste_percent || 0),
          batchCount: Number(p.batch_count || 0),
        })),
      });
    } catch (error: any) {
      console.error("Error fetching waste dashboard stats:", error);
      res.status(500).json({ message: "Fire istatistikleri alınamadı" });
    }
  });

  // GET /api/factory/product-recipe-info/:productId - Get recipe info for production planning auto-fill
  router.get('/api/factory/product-recipe-info/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      // Get active recipe for this product
      const [recipe] = await db.execute(sql`
        SELECT 
          pr.id, pr.name, pr.output_quantity, pr.output_unit,
          pr.expected_output_count, pr.expected_waste_percent,
          pr.production_time_minutes, pr.labor_batch_size,
          pr.machine_id
        FROM product_recipes pr
        WHERE pr.product_id = ${productId} AND pr.is_active = true
        ORDER BY pr.version DESC
        LIMIT 1
      `);

      // Get batch spec for this product  
      const [batchSpec] = await db.execute(sql`
        SELECT 
          bs.id, bs.batch_weight_kg, bs.expected_pieces,
          bs.target_duration_minutes, bs.machine_id, bs.description,
          fm.name as machine_name,
          fm.station_id
        FROM factory_batch_specs bs
        LEFT JOIN factory_machines fm ON bs.machine_id = fm.id
        WHERE bs.product_id = ${productId} AND bs.is_active = true
        LIMIT 1
      `);

      // Get the station for this product from batch spec or recipe
      let stationId = null;
      if (batchSpec && (batchSpec as any).station_id) {
        stationId = (batchSpec as any).station_id;
      } else if (recipe && (recipe as any).machine_id) {
        const [machine] = await db.execute(sql`
          SELECT station_id FROM factory_machines WHERE id = ${(recipe as any).machine_id}
        `);
        if (machine) stationId = (machine as any).station_id;
      }

      res.json({
        recipe: recipe ? {
          id: (recipe as any).id,
          name: (recipe as any).name,
          outputQuantity: Number((recipe as any).output_quantity || 1),
          outputUnit: (recipe as any).output_unit || 'adet',
          expectedOutputCount: (recipe as any).expected_output_count,
          expectedWastePercent: Number((recipe as any).expected_waste_percent || 0),
          productionTimeMinutes: (recipe as any).production_time_minutes || 0,
          laborBatchSize: (recipe as any).labor_batch_size || 1,
        } : null,
        batchSpec: batchSpec ? {
          id: (batchSpec as any).id,
          batchWeightKg: Number((batchSpec as any).batch_weight_kg || 0),
          expectedPieces: (batchSpec as any).expected_pieces || 0,
          targetDurationMinutes: (batchSpec as any).target_duration_minutes || 0,
          machineName: (batchSpec as any).machine_name,
        } : null,
        stationId,
      });
    } catch (error: any) {
      console.error("Error fetching product recipe info:", error);
      res.status(500).json({ message: "Ürün reçete bilgisi alınamadı" });
    }
  });

  // Aktif oturum bilgisi al
  router.get('/api/factory/kiosk/session/:userId', isKioskAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;

      const [session] = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ))
        .limit(1);

      if (!session) {
        return res.json({ session: null });
      }

      // Get active production run
      const [productionRun] = await db.select().from(factoryProductionRuns)
        .where(and(
          eq(factoryProductionRuns.sessionId, session.id),
          eq(factoryProductionRuns.status, 'in_progress')
        ))
        .limit(1);

      // Get station info
      const [station] = await db.select().from(factoryStations)
        .where(eq(factoryStations.id, session.stationId))
        .limit(1);

      res.json({
        session,
        productionRun,
        station,
      });
    } catch (error: any) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Oturum bilgisi alınamadı" });
    }
  });

  // Fire/Zayiat Sebepleri listesi
  router.get('/api/factory/waste-reasons', isAuthenticated, async (req: any, res) => {
    try {
      const showAll = req.query.all === 'true';
      const reasons = await db.select().from(factoryWasteReasons)
        .where(showAll ? undefined : eq(factoryWasteReasons.isActive, true))
        .orderBy(factoryWasteReasons.category, factoryWasteReasons.name);
      res.json(reasons);
    } catch (error: any) {
      console.error("Error fetching waste reasons:", error);
      res.status(500).json({ message: "Zaiyat sebepleri alınamadı" });
    }
  });

  // Yeni fire sebebi oluştur
  router.post('/api/factory/waste-reasons', isAuthenticated, async (req, res) => {
    try {
      const { name, category, description, isActive, sortOrder } = req.body;
      
      if (!name || !category) {
        return res.status(400).json({ message: "Sebep adı ve kategori gerekli" });
      }

      const [newReason] = await db.insert(factoryWasteReasons).values({
        name,
        category,
        description: description || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      }).returning();

      res.status(201).json(newReason);
    } catch (error: any) {
      console.error("Error creating waste reason:", error);
      res.status(500).json({ message: "Fire sebebi oluşturulamadı" });
    }
  });

  // Fire sebebi güncelle
  router.patch('/api/factory/waste-reasons/:id', isAuthenticated, async (req, res) => {
    try {
      const reasonId = parseInt(req.params.id);
      const { name, category, description, isActive, sortOrder } = req.body;

      const [updated] = await db.update(factoryWasteReasons)
        .set({
          name,
          category,
          description: description || null,
          isActive,
          sortOrder: sortOrder || 0,
        })
        .where(eq(factoryWasteReasons.id, reasonId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Fire sebebi bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating waste reason:", error);
      res.status(500).json({ message: "Fire sebebi güncellenemedi" });
    }
  });

  // Fire sebebi sil
  router.delete('/api/factory/waste-reasons/:id', isAuthenticated, async (req, res) => {
    try {
      const reasonId = parseInt(req.params.id);

      const [deleted] = await db.update(factoryWasteReasons)
        .set({ isActive: false })
        .where(eq(factoryWasteReasons.id, reasonId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Fire sebebi bulunamadı" });
      }

      res.json({ success: true, message: "Fire sebebi silindi" });
    } catch (error: any) {
      console.error("Error deleting waste reason:", error);
      res.status(500).json({ message: "Fire sebebi silinemedi" });
    }
  });

  // ========================================
  // KALİTE KRİTERLERİ API
  // ========================================

  // Kalite kriterleri listesi
  router.get('/api/factory/quality-specs', isAuthenticated, async (req, res) => {
    try {
      const specs = await db.select().from(factoryQualitySpecs)
        .orderBy(factoryQualitySpecs.stationId, factoryQualitySpecs.sortOrder);
      res.json(specs);
    } catch (error: any) {
      console.error("Error fetching quality specs:", error);
      res.status(500).json({ message: "Kalite kriterleri alınamadı" });
    }
  });

  // Yeni kalite kriteri oluştur
  router.post('/api/factory/quality-specs', isAuthenticated, async (req, res) => {
    try {
      const { stationId, productId, name, description, measurementType, unit, minValue, maxValue, targetValue, isRequired, requirePhoto, sortOrder, isActive } = req.body;

      const [spec] = await db.insert(factoryQualitySpecs).values({
        stationId,
        productId: productId || null,
        name,
        description: description || null,
        measurementType,
        unit: unit || null,
        minValue: minValue || null,
        maxValue: maxValue || null,
        targetValue: targetValue || null,
        isRequired: isRequired ?? true,
        requirePhoto: requirePhoto ?? false,
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true,
        createdBy: req.user?.id,
      }).returning();

      res.json(spec);
    } catch (error: any) {
      console.error("Error creating quality spec:", error);
      res.status(500).json({ message: "Kalite kriteri oluşturulamadı" });
    }
  });

  // Kalite kriteri güncelle
  router.patch('/api/factory/quality-specs/:id', isAuthenticated, async (req, res) => {
    try {
      const specId = parseInt(req.params.id);
      const { stationId, productId, name, description, measurementType, unit, minValue, maxValue, targetValue, isRequired, requirePhoto, sortOrder, isActive } = req.body;

      const [updated] = await db.update(factoryQualitySpecs)
        .set({
          stationId,
          productId: productId || null,
          name,
          description: description || null,
          measurementType,
          unit: unit || null,
          minValue: minValue || null,
          maxValue: maxValue || null,
          targetValue: targetValue || null,
          isRequired,
          requirePhoto,
          sortOrder: sortOrder || 0,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(factoryQualitySpecs.id, specId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Kalite kriteri bulunamadı" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating quality spec:", error);
      res.status(500).json({ message: "Kalite kriteri güncellenemedi" });
    }
  });

  // Kalite kriteri sil
  router.delete('/api/factory/quality-specs/:id', isAuthenticated, async (req, res) => {
    try {
      const specId = parseInt(req.params.id);

      const [deleted] = await db.update(factoryQualitySpecs)
        .set({ isActive: false })
        .where(eq(factoryQualitySpecs.id, specId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Kalite kriteri bulunamadı" });
      }

      res.json({ success: true, message: "Kalite kriteri silindi" });
    } catch (error: any) {
      console.error("Error deleting quality spec:", error);
      res.status(500).json({ message: "Kalite kriteri silinemedi" });
    }
  });

  // İstasyon bazlı kalite kriterleri (kalite kontrol formu için)
  router.get('/api/factory/quality-specs/station/:stationId', isAuthenticated, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const productId = req.query.productId ? parseInt(req.query.productId as string) : null;

      const specs = await db.select().from(factoryQualitySpecs)
        .where(and(
          eq(factoryQualitySpecs.stationId, stationId),
          eq(factoryQualitySpecs.isActive, true),
          productId ? or(eq(factoryQualitySpecs.productId, productId), isNull(factoryQualitySpecs.productId)) : isNull(factoryQualitySpecs.productId)
        ))
        .orderBy(factoryQualitySpecs.sortOrder);

      res.json(specs);
    } catch (error: any) {
      console.error("Error fetching station quality specs:", error);
      res.status(500).json({ message: "İstasyon kalite kriterleri alınamadı" });
    }
  });

  // ========================================
  // TAKIM YÖNETİMİ API
  // ========================================

  // Takımlar listesi
  router.get('/api/factory/teams', isAuthenticated, async (req, res) => {
    try {
      const teams = await db.select({
        id: factoryTeams.id,
        name: factoryTeams.name,
        stationId: factoryTeams.stationId,
        leaderId: factoryTeams.leaderId,
        isActive: factoryTeams.isActive,
        createdAt: factoryTeams.createdAt,
        stationName: factoryStations.name,
      })
      .from(factoryTeams)
      .leftJoin(factoryStations, eq(factoryTeams.stationId, factoryStations.id))
      .orderBy(factoryTeams.name);
      res.json(teams);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Takımlar alınamadı" });
    }
  });

  // Yeni takım oluştur
  router.post('/api/factory/teams', isAuthenticated, async (req, res) => {
    try {
      const { name, stationId, leaderId } = req.body;
      const [team] = await db.insert(factoryTeams).values({
        name,
        stationId,
        leaderId,
      }).returning();
      res.json(team);
    } catch (error: any) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Takım oluşturulamadı" });
    }
  });

  // Takım üyeleri
  router.get('/api/factory/teams/:teamId/members', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const members = await db.select({
        id: factoryTeamMembers.id,
        teamId: factoryTeamMembers.teamId,
        userId: factoryTeamMembers.userId,
        role: factoryTeamMembers.role,
        isActive: factoryTeamMembers.isActive,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(factoryTeamMembers)
      .innerJoin(users, eq(factoryTeamMembers.userId, users.id))
      .where(and(eq(factoryTeamMembers.teamId, teamId), eq(factoryTeamMembers.isActive, true)));
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Takım üyeleri alınamadı" });
    }
  });

  // Takıma üye ekle
  router.post('/api/factory/teams/:teamId/members', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { userId, role } = req.body;
      const [member] = await db.insert(factoryTeamMembers).values({
        teamId,
        userId,
        role: role || 'member',
      }).returning();
      res.json(member);
    } catch (error: any) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Üye eklenemedi" });
    }
  });

  // ========================================
  // ÜRETİM PLANLAMA API
  // ========================================

  // Üretim planları listesi
  router.get('/api/factory/production-plans', isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      let query = db.select({
        id: factoryProductionPlans.id,
        productId: factoryProductionPlans.productId,
        stationId: factoryProductionPlans.stationId,
        plannedDate: factoryProductionPlans.planDate,
        targetQuantity: factoryProductionPlans.targetQuantity,
        actualQuantity: factoryProductionPlans.actualQuantity,
        status: factoryProductionPlans.status,
        notes: factoryProductionPlans.notes,
        productName: factoryProducts.name,
        stationName: factoryStations.name,
      })
      .from(factoryProductionPlans)
      .leftJoin(factoryProducts, eq(factoryProductionPlans.productId, factoryProducts.id))
      .leftJoin(factoryStations, eq(factoryProductionPlans.stationId, factoryStations.id))
      .orderBy(factoryProductionPlans.planDate);

      const plans = await query;
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching production plans:", error);
      res.status(500).json({ message: "Üretim planları alınamadı" });
    }
  });

  // Yeni üretim planı oluştur
  router.post('/api/factory/production-plans', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      // Fabrika müdürü, HQ veya admin izni kontrolü
      const canCreate = user.role === 'admin' || 
                        user.role === 'fabrika_mudur' || 
                        isHQRole(user.role) ||
                        hasPermission(user, 'factory_planning' as any, 'create');
      
      if (!canCreate) {
        return res.status(403).json({ message: "Üretim planı oluşturma yetkiniz yok" });
      }
      
      const { productId, stationId, plannedDate, targetQuantity, notes } = req.body;
      const [plan] = await db.insert(factoryProductionPlans).values({
        productId,
        stationId,
        planDate: new Date(plannedDate),
        targetQuantity,
        notes,
        createdBy: req.user?.id,
      }).returning();
      res.json(plan);
    } catch (error: any) {
      console.error("Error creating production plan:", error);
      res.status(500).json({ message: "Üretim planı oluşturulamadı" });
    }
  });

  // ========================================
  // FABRIKA ANALİTİK API (HQ)
  // ========================================

  // Fabrika istatistikleri
  router.get('/api/factory/analytics/stats', isAuthenticated, async (req, res) => {
    try {
      const period = req.query.period as string || 'week';
      
      const now = new Date();
      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const outputs = await db.select()
        .from(factorySessionEvents)
        .where(and(
          gte(factorySessionEvents.createdAt, startDate),
          or(
            eq(factorySessionEvents.eventType, 'complete_task'),
            eq(factorySessionEvents.eventType, 'pause')
          )
        ));

      let totalProduced = 0;
      let totalWaste = 0;
      
      outputs.forEach(output => {
        totalProduced += parseFloat(output.producedQuantity || '0');
        totalWaste += parseFloat(output.wasteQuantity || '0');
      });

      const qualityOutputs = await db.select()
        .from(factoryProductionOutputs)
        .where(gte(factoryProductionOutputs.createdAt, startDate));

      const approved = qualityOutputs.filter(o => o.qualityStatus === 'approved').length;
      const rejected = qualityOutputs.filter(o => o.qualityStatus === 'rejected').length;
      const pendingEngineer = qualityOutputs.filter(o => o.qualityStatus === 'pending_engineer').length;
      const pending = qualityOutputs.filter(o => o.qualityStatus === 'pending').length;
      const total = approved + rejected;
      
      const approvalRate = total > 0 ? (approved / total * 100).toFixed(1) : 0;
      const rejectionRate = total > 0 ? (rejected / total * 100).toFixed(1) : 0;
      
      const efficiency = totalProduced > 0 ? ((totalProduced - totalWaste) / totalProduced * 100).toFixed(1) : 0;

      res.json({
        totalProduced: Math.round(totalProduced),
        totalWaste: Math.round(totalWaste),
        approvalRate: parseFloat(approvalRate as string) || 0,
        rejectionRate: parseFloat(rejectionRate as string) || 0,
        avgEfficiency: parseFloat(efficiency as string) || 0,
      });
    } catch (error: any) {
      console.error("Error fetching factory analytics stats:", error);
      res.status(500).json({ message: "İstatistikler alınamadı" });
    }
  });

  // İstasyon performansı
  router.get('/api/factory/analytics/station-performance', isAuthenticated, async (req, res) => {
    try {
      const period = req.query.period as string || 'week';
      
      const now = new Date();
      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const stationStats = await db.select({
        stationId: factorySessionEvents.stationId,
        stationName: factoryStations.name,
        produced: sql<number>`COALESCE(SUM(CAST(${factorySessionEvents.producedQuantity} AS NUMERIC)), 0)`,
        waste: sql<number>`COALESCE(SUM(CAST(${factorySessionEvents.wasteQuantity} AS NUMERIC)), 0)`,
      })
      .from(factorySessionEvents)
      .leftJoin(factoryStations, eq(factorySessionEvents.stationId, factoryStations.id))
      .where(gte(factorySessionEvents.createdAt, startDate))
      .groupBy(factorySessionEvents.stationId, factoryStations.name);

      const performance = stationStats.map(stat => ({
        stationName: stat.stationName || 'Bilinmiyor',
        produced: Math.round(stat.produced),
        waste: Math.round(stat.waste),
        efficiency: stat.produced > 0 ? Math.round((stat.produced - stat.waste) / stat.produced * 100) : 0,
      }));

      res.json(performance);
    } catch (error: any) {
      console.error("Error fetching station performance:", error);
      res.status(500).json({ message: "İstasyon performansı alınamadı" });
    }
  });

  // Günlük üretim
  router.get('/api/factory/analytics/daily-production', isAuthenticated, async (req, res) => {
    try {
      const period = req.query.period as string || 'week';
      
      let days = 7;
      if (period === 'today') days = 1;
      else if (period === 'month') days = 30;

      const result = [];
      const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dayData = await db.select({
          produced: sql<number>`COALESCE(SUM(CAST(${factorySessionEvents.producedQuantity} AS NUMERIC)), 0)`,
          waste: sql<number>`COALESCE(SUM(CAST(${factorySessionEvents.wasteQuantity} AS NUMERIC)), 0)`,
        })
        .from(factorySessionEvents)
        .where(and(
          gte(factorySessionEvents.createdAt, startOfDay),
          lte(factorySessionEvents.createdAt, endOfDay)
        ));

        result.push({
          day: dayNames[date.getDay()],
          date: date.toISOString().split('T')[0],
          produced: Math.round(dayData[0]?.produced || 0),
          waste: Math.round(dayData[0]?.waste || 0),
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching daily production:", error);
      res.status(500).json({ message: "Günlük üretim verileri alınamadı" });
    }
  });

  // Üretim planı güncelle
  router.patch('/api/factory/production-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      // Fabrika müdürü, HQ veya admin izni kontrolü
      const canEdit = user.role === 'admin' || 
                      user.role === 'fabrika_mudur' || 
                      isHQRole(user.role) ||
                      hasPermission(user, 'factory_planning' as any, 'edit');
      
      if (!canEdit) {
        return res.status(403).json({ message: "Üretim planı düzenleme yetkiniz yok" });
      }
      
      const planId = parseInt(req.params.id);
      const { productId, stationId, plannedDate, targetQuantity, actualQuantity, status, notes } = req.body;
      const [updated] = await db.update(factoryProductionPlans)
        .set({
          productId,
          stationId,
          planDate: plannedDate ? new Date(plannedDate) : undefined,
          targetQuantity,
          actualQuantity,
          status,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(factoryProductionPlans.id, planId))
        .returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating production plan:", error);
      res.status(500).json({ message: "Üretim planı güncellenemedi" });
    }
  });

  // ========================================
  // FABRİKA VARDİYA UYUMLULUK API
  // ========================================

  // Personelin günlük vardiya uyumluluk uyarıları
  router.get('/api/factory/shift-compliance/my-warnings', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Bugünkü uyumluluk kaydını al
      const [todayCompliance] = await db.select()
        .from(factoryShiftCompliance)
        .where(and(
          eq(factoryShiftCompliance.userId, user.id),
          gte(factoryShiftCompliance.workDate, today.toISOString().split('T')[0])
        ))
        .limit(1);

      // Bu haftaki özeti al
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Pazartesi
      
      const [weeklySummary] = await db.select()
        .from(factoryWeeklyAttendanceSummary)
        .where(and(
          eq(factoryWeeklyAttendanceSummary.userId, user.id),
          eq(factoryWeeklyAttendanceSummary.weekStartDate, weekStart.toISOString().split('T')[0])
        ))
        .limit(1);

      const warnings: any[] = [];
      
      if (todayCompliance) {
        if (todayCompliance.latenessMinutes && todayCompliance.latenessMinutes > 0) {
          warnings.push({
            type: 'late',
            severity: todayCompliance.latenessMinutes > 15 ? 'high' : 'medium',
            title: 'Geç Kalma',
            message: `Bugün ${todayCompliance.latenessMinutes} dakika geç kaldınız.`,
            minutes: todayCompliance.latenessMinutes,
            aiSuggestion: todayCompliance.aiSuggestion,
          });
        }
        
        if (todayCompliance.earlyLeaveMinutes && todayCompliance.earlyLeaveMinutes > 0) {
          warnings.push({
            type: 'early_leave',
            severity: todayCompliance.earlyLeaveMinutes > 30 ? 'high' : 'medium',
            title: 'Erken Çıkış',
            message: `${todayCompliance.earlyLeaveMinutes} dakika erken çıkış yaptınız.`,
            minutes: todayCompliance.earlyLeaveMinutes,
          });
        }
        
        if (todayCompliance.breakOverageMinutes && todayCompliance.breakOverageMinutes > 0) {
          warnings.push({
            type: 'break_overage',
            severity: todayCompliance.breakOverageMinutes > 15 ? 'high' : 'low',
            title: 'Mola Aşımı',
            message: `Mola sürenizi ${todayCompliance.breakOverageMinutes} dakika aştınız.`,
            minutes: todayCompliance.breakOverageMinutes,
          });
        }
      }

      // Haftalık eksik saat uyarısı
      if (weeklySummary && weeklySummary.missingMinutes && weeklySummary.missingMinutes > 0) {
        const missingHours = Math.floor(weeklySummary.missingMinutes / 60);
        const missingMins = weeklySummary.missingMinutes % 60;
        warnings.push({
          type: 'weekly_missing',
          severity: weeklySummary.missingMinutes > 120 ? 'high' : 'medium',
          title: 'Haftalık Eksik Saat',
          message: `Bu hafta ${missingHours} saat ${missingMins} dakika eksik çalışmanız var. (45 saat hedefi)`,
          minutes: weeklySummary.missingMinutes,
          weeklyActual: weeklySummary.actualTotalMinutes,
          weeklyTarget: 2700, // 45 saat
        });
      }

      res.json({
        warnings,
        todayCompliance: todayCompliance || null,
        weeklySummary: weeklySummary || null,
        complianceScore: todayCompliance?.complianceScore || 100,
      });
    } catch (error: any) {
      console.error("Error fetching shift compliance warnings:", error);
      res.status(500).json({ message: "Vardiya uyumluluk verileri alınamadı" });
    }
  });

  // AI ile telafi önerisi oluştur
  router.post('/api/factory/shift-compliance/:id/generate-suggestion', isAuthenticated, async (req, res) => {
    try {
      const complianceId = parseInt(req.params.id);
      
      const [compliance] = await db.select()
        .from(factoryShiftCompliance)
        .where(eq(factoryShiftCompliance.id, complianceId))
        .limit(1);

      if (!compliance) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }

      // AI ile öneri oluştur
      let suggestion = "";
      
      if (compliance.latenessMinutes && compliance.latenessMinutes > 0) {
        suggestion = `Bugün ${compliance.latenessMinutes} dakika geç kaldınız. Bu durumu telafi etmek için bugün ${compliance.latenessMinutes} dakika fazla çalışabilir veya yöneticinizden izin talep edebilirsiniz. Haftalık 45 saat hedefinize ulaşmak için kalan günlerdeki çalışma saatlerinizi kontrol edin.`;
      } else if (compliance.earlyLeaveMinutes && compliance.earlyLeaveMinutes > 0) {
        suggestion = `${compliance.earlyLeaveMinutes} dakika erken çıktınız. Bu eksikliği telafi etmek için yarın ${compliance.earlyLeaveMinutes} dakika erken gelebilir veya başka bir gün mesai yapabilirsiniz. Yönetici onayı ile bu süre mesai olarak sayılabilir.`;
      } else if (compliance.breakOverageMinutes && compliance.breakOverageMinutes > 0) {
        suggestion = `Mola sürenizi ${compliance.breakOverageMinutes} dakika aştınız. Bir sonraki molada daha dikkatli olun. Bu süre haftalık çalışma saatinizden düşülecektir.`;
      } else {
        suggestion = "Vardiya uyumluluğunuz mükemmel! Böyle devam edin.";
      }

      await db.update(factoryShiftCompliance)
        .set({
          aiSuggestion: suggestion,
          aiSuggestionGeneratedAt: new Date(),
        })
        .where(eq(factoryShiftCompliance.id, complianceId));

      res.json({ suggestion });
    } catch (error: any) {
      console.error("Error generating compliance suggestion:", error);
      res.status(500).json({ message: "Öneri oluşturulamadı" });
    }
  });

  // HQ - Fabrika vardiya uyumluluk listesi
  router.get('/api/factory/shift-compliance', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'fabrika_mudur') {
        return res.status(403).json({ message: "Bu sayfaya erişim yetkiniz yok" });
      }

      const dateFilter = req.query.date as string;
      const statusFilter = req.query.status as string;

      let query = db.select({
        compliance: factoryShiftCompliance,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(factoryShiftCompliance)
      .leftJoin(users, eq(factoryShiftCompliance.userId, users.id));

      if (dateFilter) {
        query = query.where(eq(factoryShiftCompliance.workDate, dateFilter)) as any;
      }

      const records = await query;

      const filtered = statusFilter 
        ? records.filter((r: any) => r.compliance.complianceStatus === statusFilter)
        : records;

      res.json(filtered);
    } catch (error: any) {
      console.error("Error fetching shift compliance list:", error);
      res.status(500).json({ message: "Liste alınamadı" });
    }
  });

  // HQ - Haftalık özet listesi
  router.get('/api/factory/weekly-summaries', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'fabrika_mudur' && user.role !== 'muhasebe') {
        return res.status(403).json({ message: "Bu sayfaya erişim yetkiniz yok" });
      }

      const weekStart = req.query.weekStart as string;

      let query = db.select({
        summary: factoryWeeklyAttendanceSummary,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(factoryWeeklyAttendanceSummary)
      .leftJoin(users, eq(factoryWeeklyAttendanceSummary.userId, users.id));

      if (weekStart) {
        query = query.where(eq(factoryWeeklyAttendanceSummary.weekStartDate, weekStart)) as any;
      }

      const summaries = await query;

      // Eksik saati olanları filtrele
      const withMissing = summaries.filter((s: any) => 
        s.summary.missingMinutes && s.summary.missingMinutes > 0
      );

      res.json({
        all: summaries,
        withMissingHours: withMissing,
        totalMissingMinutes: withMissing.reduce((sum: number, s: any) => 
          sum + (s.summary.missingMinutes || 0), 0
        ),
      });
    } catch (error: any) {
      console.error("Error fetching weekly summaries:", error);
      res.status(500).json({ message: "Haftalık özetler alınamadı" });
    }
  });

  // Muhasebe - Eksik saat bildirimi
  router.post('/api/factory/report-to-accounting', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!isHQRole(user.role) && user.role !== 'admin' && user.role !== 'fabrika_mudur') {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { summaryIds, notes } = req.body;

      await db.update(factoryWeeklyAttendanceSummary)
        .set({
          reportedToAccounting: true,
          reportedToAccountingAt: new Date(),
          accountingNotes: notes,
          updatedAt: new Date(),
        })
        .where(inArray(factoryWeeklyAttendanceSummary.id, summaryIds));

      res.json({ success: true, message: "Muhasebe bildirimi gönderildi" });
    } catch (error: any) {
      console.error("Error reporting to accounting:", error);
      res.status(500).json({ message: "Bildirim gönderilemedi" });
    }
  });

  // Fabrika ürünleri listesi (duplicate kaldırıldı - yukarıda mevcut)
  router.get('/api/factory/catalog/products', isAuthenticated, async (req: any, res) => {
    try {
      const products = await db.select().from(factoryProducts)
        .where(eq(factoryProducts.isActive, true))
        .orderBy(factoryProducts.category, factoryProducts.name);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching factory products:", error);
      res.status(500).json({ message: "Ürünler alınamadı" });
    }
  });

  // Mola / Ara kaydet
  router.post('/api/factory/kiosk/log-break', isKioskAuthenticated, async (req, res) => {
    try {
      const { 
        sessionId, 
        breakReason, 
        targetStationId,
        producedQuantity,
        producedUnit,
        wasteQuantity,
        wasteUnit,
        wasteReasonId,
        wasteNotes,
        photoUrl
      } = req.body;

      // Parse quantities safely
      const parsedProduced = parseFloat(producedQuantity) || 0;
      const parsedWaste = parseFloat(wasteQuantity) || 0;

      // Get session
      const [session] = await db.select().from(factoryShiftSessions)
        .where(eq(factoryShiftSessions.id, sessionId))
        .limit(1);

      if (!session) {
        return res.status(404).json({ message: "Oturum bulunamadı" });
      }

      // Log event
      const [event] = await db.insert(factorySessionEvents).values({
        sessionId,
        userId: session.userId,
        stationId: session.stationId,
        eventType: breakReason === 'gorev_bitis' ? 'complete_task' : 'pause',
        breakReason,
        producedQuantity: parsedProduced > 0 ? parsedProduced.toString() : null,
        producedUnit: parsedProduced > 0 ? (producedUnit || 'adet') : null,
        wasteQuantity: parsedWaste > 0 ? parsedWaste.toString() : null,
        wasteUnit: parsedWaste > 0 ? (wasteUnit || 'adet') : null,
        wasteReasonId: parsedWaste > 0 ? wasteReasonId : null,
        notes: wasteNotes || null,
      }).returning();

      // Log break
      await db.insert(factoryBreakLogs).values({
        sessionEventId: event.id,
        userId: session.userId,
        sessionId,
        breakReason,
        targetStationId: targetStationId || null,
        startedAt: new Date(),
      });

      // If production data provided, save output with photo
      if (parsedProduced > 0 || parsedWaste > 0 || photoUrl) {
        await db.insert(factoryProductionOutputs).values({
          sessionEventId: event.id,
          sessionId,
          userId: session.userId,
          stationId: session.stationId,
          producedQuantity: parsedProduced.toString(),
          producedUnit: producedUnit || 'adet',
          wasteQuantity: parsedWaste.toString(),
          wasteUnit: wasteUnit || 'adet',
          wasteReasonId: parsedWaste > 0 ? wasteReasonId : null,
          wasteNotes: wasteNotes || null,
          photoUrl: photoUrl || null,
          qualityStatus: 'pending',
        });
      }

      if (breakReason === 'gorev_bitis') {
        const [activeRun] = await db.select().from(factoryProductionRuns)
          .where(and(
            eq(factoryProductionRuns.sessionId, sessionId),
            eq(factoryProductionRuns.status, 'in_progress')
          ))
          .limit(1);

        if (activeRun) {
          await db.update(factoryProductionRuns)
            .set({
              endTime: new Date(),
              quantityProduced: parsedProduced,
              quantityWaste: parsedWaste,
              wasteReason: wasteNotes || null,
              status: 'completed',
            })
            .where(eq(factoryProductionRuns.id, activeRun.id));

          await db.update(factoryShiftSessions)
            .set({
              totalProduced: (session.totalProduced || 0) + parsedProduced,
              totalWaste: (session.totalWaste || 0) + parsedWaste,
            })
            .where(eq(factoryShiftSessions.id, sessionId));
        }
      }

      res.json({ 
        success: true, 
        event,
        message: breakReason === 'gorev_bitis' ? 'Görev tamamlandı' : 'Mola kaydedildi'
      });
    } catch (error: any) {
      console.error("Error logging break:", error);
      res.status(500).json({ message: "Mola kaydedilemedi" });
    }
  });

  // Ortak Üretim Skor Sistemi - Collaborative Production Scoring
  // Aynı istasyonda çalışan birden fazla kişinin mola/uzaklaşma sürelerini hesaba katarak skor paylaşımı
  // Note: Score distribution is based on total active minutes per worker.
  // Workers who take more breaks get lower share percentages automatically.
  // This fairly rewards workers who contribute more active time.
  router.get('/api/factory/collaborative-scores/:stationId', isKioskAuthenticated, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
      
      const dayStart = new Date(dateStr + 'T00:00:00');
      const dayEnd = new Date(dateStr + 'T23:59:59');

      // Get all sessions at this station for today
      const sessions = await db.select({
        sessionId: factoryShiftSessions.id,
        userId: factoryShiftSessions.userId,
        checkInTime: factoryShiftSessions.checkInTime,
        checkOutTime: factoryShiftSessions.checkOutTime,
        status: factoryShiftSessions.status,
        firstName: users.firstName,
        lastName: users.lastName,
      })
        .from(factoryShiftSessions)
        .innerJoin(users, eq(factoryShiftSessions.userId, users.id))
        .where(and(
          eq(factoryShiftSessions.stationId, stationId),
          gte(factoryShiftSessions.checkInTime, dayStart),
          lte(factoryShiftSessions.checkInTime, dayEnd)
        ));

      if (sessions.length === 0) {
        return res.json({ workers: [], isCollaborative: false });
      }

      // For each worker, calculate active time (total time - break time)
      const workerScores = await Promise.all(sessions.map(async (session) => {
        const now = new Date();
        const endTime = session.checkOutTime || now;
        const totalMinutes = Math.max(1, Math.round((endTime.getTime() - new Date(session.checkInTime).getTime()) / 60000));

        // Get break logs for this session
        const breaks = await db.select({
          startedAt: factoryBreakLogs.startedAt,
          endedAt: factoryBreakLogs.endedAt,
          durationMinutes: factoryBreakLogs.durationMinutes,
          breakReason: factoryBreakLogs.breakReason,
        })
          .from(factoryBreakLogs)
          .where(eq(factoryBreakLogs.sessionId, session.sessionId));

        // Calculate total break minutes
        let totalBreakMinutes = 0;
        breaks.forEach(brk => {
          if (brk.durationMinutes) {
            totalBreakMinutes += brk.durationMinutes;
          } else if (brk.startedAt && brk.endedAt) {
            totalBreakMinutes += Math.round((new Date(brk.endedAt).getTime() - new Date(brk.startedAt).getTime()) / 60000);
          } else if (brk.startedAt && !brk.endedAt) {
            // Ongoing break - count from start to now
            totalBreakMinutes += Math.round((now.getTime() - new Date(brk.startedAt).getTime()) / 60000);
          }
        });

        // Get production outputs for this session
        const outputs = await db.select({
          producedQuantity: factoryProductionOutputs.producedQuantity,
          wasteQuantity: factoryProductionOutputs.wasteQuantity,
        })
          .from(factoryProductionOutputs)
          .where(eq(factoryProductionOutputs.sessionId, session.sessionId));

        const totalProduced = outputs.reduce((sum, o) => sum + parseFloat(o.producedQuantity || '0'), 0);
        const totalWaste = outputs.reduce((sum, o) => sum + parseFloat(o.wasteQuantity || '0'), 0);

        const activeMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
        const breakCount = breaks.length;

        return {
          userId: session.userId,
          firstName: session.firstName,
          lastName: session.lastName,
          sessionId: session.sessionId,
          totalMinutes,
          breakMinutes: totalBreakMinutes,
          activeMinutes,
          breakCount,
          totalProduced,
          totalWaste,
          status: session.status,
        };
      }));

      // Calculate collaborative scores
      const totalActiveMinutes = workerScores.reduce((sum, w) => sum + w.activeMinutes, 0);
      const isCollaborative = workerScores.length > 1;

      const scoredWorkers = workerScores.map(worker => {
        const sharePercentage = totalActiveMinutes > 0
          ? Math.round((worker.activeMinutes / totalActiveMinutes) * 100)
          : Math.round(100 / workerScores.length);

        // Efficiency penalty for excessive breaks
        const breakRatio = worker.totalMinutes > 0 ? worker.breakMinutes / worker.totalMinutes : 0;
        let efficiencyPenalty = 0;
        if (breakRatio > 0.2) efficiencyPenalty = Math.round((breakRatio - 0.2) * 100); // Penalty if >20% break time

        return {
          ...worker,
          sharePercentage,
          efficiencyPenalty,
          adjustedScore: Math.max(0, sharePercentage - efficiencyPenalty),
        };
      });

      res.json({
        stationId,
        date: dateStr,
        isCollaborative,
        totalActiveMinutes,
        workers: scoredWorkers,
      });
    } catch (error: any) {
      console.error('Error calculating collaborative scores:', error);
      res.status(500).json({ message: 'Ortak skor hesaplanamadı' });
    }
  });

  router.post('/api/factory/kiosk/report-fault', isKioskAuthenticated, async (req, res) => {
    try {
      const { faultType, description, stationId, sessionId, userId } = req.body;

      if (!faultType || !description?.trim()) {
        return res.status(400).json({ message: 'Arıza türü ve açıklama gerekli' });
      }

      const stationInfo = stationId
        ? await db.select().from(factoryStations).where(eq(factoryStations.id, stationId)).limit(1)
        : [];
      const stationName = stationInfo.length > 0 ? stationInfo[0].name : 'Bilinmeyen İstasyon';

      const reporterInfo = userId
        ? await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId)).limit(1)
        : [];
      const reporterName = reporterInfo.length > 0 ? `${reporterInfo[0].firstName} ${reporterInfo[0].lastName}` : 'Bilinmeyen Personel';

      const faultTypeLabel = faultType === 'machine' ? 'Makina Arızası' : 'Ürün Hatası';

      const factoryManagers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.role, 'fabrika_mudur'));

      let notifiedPerson = '';

      if (factoryManagers.length > 0) {
        const notifValues = factoryManagers.map(manager => ({
          userId: manager.id,
          type: 'factory_fault_report',
          title: `${faultTypeLabel} Bildirimi`,
          message: `${reporterName} tarafından ${stationName} istasyonunda ${faultTypeLabel.toLowerCase()} bildirildi: ${description}`,
          link: '/fabrika/dashboard',
          isRead: false,
        }));

        await db.insert(notifications).values(notifValues);
        notifiedPerson = factoryManagers.map(m => `${m.firstName} ${m.lastName}`).join(', ');
      }

      if (!notifiedPerson) {
        const supervisors = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.role, 'fabrika_sorumlu'));

        if (supervisors.length > 0) {
          const notifValues = supervisors.map(s => ({
            userId: s.id,
            type: 'factory_fault_report',
            title: `${faultTypeLabel} Bildirimi`,
            message: `${reporterName} tarafından ${stationName} istasyonunda ${faultTypeLabel.toLowerCase()} bildirildi: ${description}`,
            link: '/fabrika/dashboard',
            isRead: false,
          }));
          await db.insert(notifications).values(notifValues);
          notifiedPerson = supervisors.map(s => `${s.firstName} ${s.lastName}`).join(', ');
        }
      }

      if (sessionId) {
        await db.insert(factorySessionEvents).values({
          sessionId,
          userId: userId || 'system',
          stationId: stationId || null,
          eventType: 'fault_report',
          notes: `[${faultTypeLabel}] ${description}`,
        });
      }

      res.json({
        success: true,
        notifiedPerson: notifiedPerson || null,
        message: notifiedPerson
          ? `Arıza bildirildi, ${notifiedPerson} bilgilendirildi`
          : 'Arıza bildirildi ancak yetkili bulunamadı',
      });
    } catch (error: any) {
      console.error('Error reporting fault:', error);
      res.status(500).json({ message: 'Arıza bildirilemedi' });
    }
  });

  // Aktif çalışanlar listesi (dashboard için)
  router.get('/api/factory/active-workers', isAuthenticated, async (req: any, res) => {
    try {
      const activeSessions = await db.select({
        sessionId: factoryShiftSessions.id,
        userId: factoryShiftSessions.userId,
        stationId: factoryShiftSessions.stationId,
        checkInTime: factoryShiftSessions.checkInTime,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        stationName: factoryStations.name,
        stationCode: factoryStations.code,
      })
        .from(factoryShiftSessions)
        .innerJoin(users, eq(factoryShiftSessions.userId, users.id))
        .innerJoin(factoryStations, eq(factoryShiftSessions.stationId, factoryStations.id))
        .where(eq(factoryShiftSessions.status, 'active'));

      res.json(activeSessions);
    } catch (error: any) {
      console.error("Error fetching active workers:", error);
      res.status(500).json({ message: "Aktif çalışanlar alınamadı" });
    }
  });

  // Kalite Kontrol - Bekleyen üretim çıktıları
  router.get('/api/factory/quality/pending', isAuthenticated, async (req: any, res) => {
    try {
      const outputs = await db.select({
        id: factoryProductionOutputs.id,
        sessionId: factoryProductionOutputs.sessionId,
        userId: factoryProductionOutputs.userId,
        stationId: factoryProductionOutputs.stationId,
        producedQuantity: factoryProductionOutputs.producedQuantity,
        producedUnit: factoryProductionOutputs.producedUnit,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        wasteUnit: factoryProductionOutputs.wasteUnit,
        qualityStatus: factoryProductionOutputs.qualityStatus,
        createdAt: factoryProductionOutputs.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        stationName: factoryStations.name,
      })
        .from(factoryProductionOutputs)
        .innerJoin(users, eq(factoryProductionOutputs.userId, users.id))
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(eq(factoryProductionOutputs.qualityStatus, 'pending'))
        .orderBy(desc(factoryProductionOutputs.createdAt));

      res.json(outputs);
    } catch (error: any) {
      console.error("Error fetching pending outputs:", error);
      res.status(500).json({ message: "Bekleyen çıktılar alınamadı" });
    }
  });

  // Kalite Kontrol - Onaylanan üretim çıktıları
  router.get('/api/factory/quality/approved', isAuthenticated, async (req: any, res) => {
    try {
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const outputs = await db.select({
        id: factoryProductionOutputs.id,
        sessionId: factoryProductionOutputs.sessionId,
        userId: factoryProductionOutputs.userId,
        stationId: factoryProductionOutputs.stationId,
        producedQuantity: factoryProductionOutputs.producedQuantity,
        producedUnit: factoryProductionOutputs.producedUnit,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        wasteUnit: factoryProductionOutputs.wasteUnit,
        qualityStatus: factoryProductionOutputs.qualityStatus,
        createdAt: factoryProductionOutputs.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        stationName: factoryStations.name,
      })
        .from(factoryProductionOutputs)
        .innerJoin(users, eq(factoryProductionOutputs.userId, users.id))
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(and(
          eq(factoryProductionOutputs.qualityStatus, 'approved'),
          gte(factoryProductionOutputs.createdAt, today)
        ))
        .orderBy(desc(factoryProductionOutputs.createdAt))
        .limit(50);

      res.json(outputs);
    } catch (error: any) {
      console.error("Error fetching approved outputs:", error);
      res.status(500).json({ message: "Onaylanan çıktılar alınamadı" });
    }
  });

  // Kalite Kontrol - Reddedilen üretim çıktıları
  router.get('/api/factory/quality/rejected', isAuthenticated, async (req: any, res) => {
    try {
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const outputs = await db.select({
        id: factoryProductionOutputs.id,
        sessionId: factoryProductionOutputs.sessionId,
        userId: factoryProductionOutputs.userId,
        stationId: factoryProductionOutputs.stationId,
        producedQuantity: factoryProductionOutputs.producedQuantity,
        producedUnit: factoryProductionOutputs.producedUnit,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        wasteUnit: factoryProductionOutputs.wasteUnit,
        qualityStatus: factoryProductionOutputs.qualityStatus,
        createdAt: factoryProductionOutputs.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        stationName: factoryStations.name,
      })
        .from(factoryProductionOutputs)
        .innerJoin(users, eq(factoryProductionOutputs.userId, users.id))
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(and(
          eq(factoryProductionOutputs.qualityStatus, 'rejected'),
          gte(factoryProductionOutputs.createdAt, today)
        ))
        .orderBy(desc(factoryProductionOutputs.createdAt))
        .limit(50);

      res.json(outputs);
    } catch (error: any) {
      console.error("Error fetching rejected outputs:", error);
      res.status(500).json({ message: "Reddedilen çıktılar alınamadı" });
    }
  });

  // Kalite Kontrol - Onay/Red işlemi
  router.post('/api/factory/quality/review', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const allowedRoles = ['admin', 'fabrika_mudur', 'fabrika_sorumlu', 'inspector'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { outputId, decision, reason } = req.body;

      if (!outputId || !decision || !['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: "Geçersiz parametreler" });
      }

      if (decision === 'rejected' && !reason?.trim()) {
        return res.status(400).json({ message: "Red sebebi zorunludur" });
      }

      // Update production output status
      const [updated] = await db.update(factoryProductionOutputs)
        .set({
          qualityStatus: decision,
          qualityCheckedAt: new Date(),
        })
        .where(eq(factoryProductionOutputs.id, outputId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Üretim kaydı bulunamadı" });
      }

      res.json({ 
        success: true, 
        output: updated,
        message: decision === 'approved' ? 'Üretim onaylandı' : 'Üretim reddedildi'
      });
    } catch (error: any) {
      console.error("Error reviewing output:", error);
      res.status(500).json({ message: "Kalite kontrolü kaydedilemedi" });
    }
  });

  router.post('/api/factory/quality/technician-review', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const allowedRoles = ['admin', 'fabrika_mudur', 'fabrika_sorumlu', 'inspector', 'fabrika_operator', 'kalite_kontrol'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const {
        outputId, decision, reason, visualInspection, weightCheck, packagingIntegrity,
        temperatureCheck, allergenCheck, haccpCompliance, inspectorNotes
      } = req.body;

      if (!outputId || !decision) {
        return res.status(400).json({ message: "Geçersiz parametreler" });
      }

      const [output] = await db.select({
        id: factoryProductionOutputs.id,
        productId: factoryProductionOutputs.productId,
        stationId: factoryProductionOutputs.stationId,
        userId: factoryProductionOutputs.userId,
        qualityStatus: factoryProductionOutputs.qualityStatus,
      }).from(factoryProductionOutputs)
        .where(eq(factoryProductionOutputs.id, outputId))
        .limit(1);

      if (!output) {
        return res.status(404).json({ message: "Üretim kaydı bulunamadı" });
      }

      if (output.qualityStatus === 'pending_engineer' || output.qualityStatus === 'approved') {
        return res.status(400).json({ message: "Bu üretim kaydı zaten kontrol edilmiş" });
      }

      let requiresEngineer = false;
      if (output.productId) {
        const [product] = await db.select({ requiresFoodEngineerApproval: factoryProducts.requiresFoodEngineerApproval })
          .from(factoryProducts)
          .where(eq(factoryProducts.id, output.productId))
          .limit(1);
        if (product?.requiresFoodEngineerApproval) {
          requiresEngineer = true;
        }
      }

      let finalDecision = decision;
      if (decision === 'approved' && requiresEngineer) {
        finalDecision = 'pending_engineer';
      }

      const qualityStatus = finalDecision === 'pending_engineer' ? 'pending_engineer' : finalDecision;
      await db.update(factoryProductionOutputs)
        .set({
          qualityStatus,
          qualityCheckedBy: user.id,
          qualityCheckedAt: new Date(),
        })
        .where(eq(factoryProductionOutputs.id, outputId));

      const [qualityCheck] = await db.insert(factoryQualityChecks).values({
        productionOutputId: outputId,
        inspectorId: user.id,
        producerId: output.userId,
        stationId: output.stationId,
        decision: finalDecision,
        decisionReason: reason || null,
        visualInspection: visualInspection || null,
        weightCheck: weightCheck || null,
        packagingIntegrity: packagingIntegrity || null,
        temperatureCheck: temperatureCheck || null,
        allergenCheck: allergenCheck || false,
        haccpCompliance: haccpCompliance !== false,
        inspectorNotes: inspectorNotes || null,
      }).returning();

      if (requiresEngineer && finalDecision === 'pending_engineer') {
        try {
          const engineers = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, 'gida_muhendisi'), eq(users.isActive, true)));
          if (engineers.length > 0) {
            await db.insert(notifications).values(engineers.map(eng => ({
              userId: eng.id,
              type: 'quality_approval_needed',
              title: 'Kalite Onayı Bekliyor',
              message: `Üretim #${outputId} gıda mühendisi onayı bekliyor`,
              link: '/fabrika?tab=kalite-kontrol',
              isRead: false,
            })));
          }
        } catch (notifErr) {
          console.error("Quality notification error:", notifErr);
        }
      }

      res.json({
        success: true,
        qualityCheck,
        requiresEngineerApproval: requiresEngineer,
        message: finalDecision === 'pending_engineer'
          ? 'Teknisyen kontrolü tamamlandı, gıda mühendisi onayı bekleniyor'
          : finalDecision === 'approved' ? 'Üretim onaylandı' : 'Üretim reddedildi'
      });
    } catch (error: any) {
      console.error("Error in technician review:", error);
      res.status(500).json({ message: "Teknisyen kontrolü kaydedilemedi" });
    }
  });

  router.patch('/api/factory/quality/engineer-approve/:checkId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'gida_muhendisi' && user.role !== 'admin') {
        return res.status(403).json({ message: "Sadece gıda mühendisi bu işlemi yapabilir" });
      }

      const checkId = parseInt(req.params.checkId);
      const {
        decision, tasteTest, textureCheck, haccpCompliance,
        correctiveAction, holdReason, notes
      } = req.body;

      if (!decision || !['approved', 'rejected', 'hold'].includes(decision)) {
        return res.status(400).json({ message: "Geçersiz karar. approved, rejected veya hold olmalı" });
      }

      if (decision === 'rejected' && !correctiveAction?.trim()) {
        return res.status(400).json({ message: "Red durumunda düzeltici faaliyet zorunludur" });
      }

      if (decision === 'hold' && !holdReason?.trim()) {
        return res.status(400).json({ message: "Hold durumunda sebep zorunludur" });
      }

      const [existingCheck] = await db.select().from(factoryQualityChecks)
        .where(eq(factoryQualityChecks.id, checkId))
        .limit(1);

      if (!existingCheck) {
        return res.status(404).json({ message: "Kalite kontrol kaydı bulunamadı" });
      }

      if (existingCheck.decision !== 'pending_engineer') {
        return res.status(400).json({ message: "Bu kayıt gıda mühendisi onayı beklemiyordu" });
      }

      const [updatedCheck] = await db.update(factoryQualityChecks)
        .set({
          decision,
          tasteTest: tasteTest || null,
          textureCheck: textureCheck || null,
          haccpCompliance: haccpCompliance !== false,
          correctiveAction: correctiveAction || null,
          holdReason: holdReason || null,
          notes: notes || existingCheck.notes,
          foodEngineerApproval: decision === 'approved',
          foodEngineerId: user.id,
          foodEngineerApprovedAt: new Date(),
        })
        .where(eq(factoryQualityChecks.id, checkId))
        .returning();

      const qualityStatus = decision === 'hold' ? 'pending' : decision;
      await db.update(factoryProductionOutputs)
        .set({
          qualityStatus,
          qualityCheckedAt: new Date(),
        })
        .where(eq(factoryProductionOutputs.id, existingCheck.productionOutputId));

      res.json({
        success: true,
        qualityCheck: updatedCheck,
        message: decision === 'approved' ? 'Gıda mühendisi onayı verildi'
          : decision === 'hold' ? 'Ürün beklemeye alındı'
          : 'Ürün reddedildi'
      });
    } catch (error: any) {
      console.error("Error in engineer approval:", error);
      res.status(500).json({ message: "Gıda mühendisi onayı kaydedilemedi" });
    }
  });

  router.get('/api/factory/quality/pending-engineer', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_quality', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const checks = await db.select({
        id: factoryQualityChecks.id,
        productionOutputId: factoryQualityChecks.productionOutputId,
        inspectorId: factoryQualityChecks.inspectorId,
        producerId: factoryQualityChecks.producerId,
        stationId: factoryQualityChecks.stationId,
        decision: factoryQualityChecks.decision,
        decisionReason: factoryQualityChecks.decisionReason,
        visualInspection: factoryQualityChecks.visualInspection,
        weightCheck: factoryQualityChecks.weightCheck,
        packagingIntegrity: factoryQualityChecks.packagingIntegrity,
        temperatureCheck: factoryQualityChecks.temperatureCheck,
        allergenCheck: factoryQualityChecks.allergenCheck,
        haccpCompliance: factoryQualityChecks.haccpCompliance,
        inspectorNotes: factoryQualityChecks.inspectorNotes,
        checkedAt: factoryQualityChecks.checkedAt,
        producedQuantity: factoryProductionOutputs.producedQuantity,
        producedUnit: factoryProductionOutputs.producedUnit,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        wasteUnit: factoryProductionOutputs.wasteUnit,
        producerFirstName: users.firstName,
        producerLastName: users.lastName,
        stationName: factoryStations.name,
      })
        .from(factoryQualityChecks)
        .innerJoin(factoryProductionOutputs, eq(factoryQualityChecks.productionOutputId, factoryProductionOutputs.id))
        .innerJoin(users, eq(factoryQualityChecks.producerId, users.id))
        .innerJoin(factoryStations, eq(factoryQualityChecks.stationId, factoryStations.id))
        .where(eq(factoryQualityChecks.decision, 'pending_engineer'))
        .orderBy(desc(factoryQualityChecks.checkedAt));

      res.json(checks);
    } catch (error: any) {
      console.error("Error fetching pending engineer checks:", error);
      res.status(500).json({ message: "Mühendis onayı bekleyen kayıtlar alınamadı" });
    }
  });

  // Fabrika Analitiği - Personel performansı
  router.get('/api/factory/analytics/workers', isAuthenticated, async (req: any, res) => {
    try {
      const period = req.query.period as string || 'weekly';
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Get production outputs with user info
      const outputs = await db.select({
        userId: factoryProductionOutputs.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        stationId: factoryProductionOutputs.stationId,
        stationName: factoryStations.name,
        producedQuantity: factoryProductionOutputs.producedQuantity,
        wasteQuantity: factoryProductionOutputs.wasteQuantity,
        qualityStatus: factoryProductionOutputs.qualityStatus,
      })
        .from(factoryProductionOutputs)
        .innerJoin(users, eq(factoryProductionOutputs.userId, users.id))
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(gte(factoryProductionOutputs.createdAt, startDate));

      // Aggregate by user
      const workerMap = new Map<string, any>();
      
      for (const output of outputs) {
        if (!workerMap.has(output.userId)) {
          workerMap.set(output.userId, {
            userId: output.userId,
            firstName: output.firstName,
            lastName: output.lastName,
            profileImageUrl: output.profileImageUrl,
            totalProduced: 0,
            totalWaste: 0,
            totalHours: 8, // Estimate
            qualityApproved: 0,
            qualityRejected: 0,
            stationsWorked: new Set<string>(),
          });
        }
        
        const worker = workerMap.get(output.userId)!;
        worker.totalProduced += parseFloat(output.producedQuantity || '0');
        worker.totalWaste += parseFloat(output.wasteQuantity || '0');
        worker.stationsWorked.add(output.stationName);
        
        if (output.qualityStatus === 'approved') worker.qualityApproved++;
        if (output.qualityStatus === 'rejected') worker.qualityRejected++;
      }

      const result = Array.from(workerMap.values()).map(w => ({
        ...w,
        stationsWorked: Array.from(w.stationsWorked),
        efficiency: w.totalProduced > 0 
          ? ((w.totalProduced - w.totalWaste) / w.totalProduced * 100) 
          : 0,
        avgProductionPerHour: w.totalHours > 0 ? w.totalProduced / w.totalHours : 0,
      }));

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching worker analytics:", error);
      res.status(500).json({ message: "Personel analitiği alınamadı" });
    }
  });

  // Fabrika Analitiği - İstasyon performansı
  router.get('/api/factory/analytics/stations', isAuthenticated, async (req: any, res) => {
    try {
      const period = req.query.period as string || 'weekly';
      
      const now = new Date();
      let startDate = new Date();
      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const stationStats = await db.select({
        stationId: factoryProductionOutputs.stationId,
        stationName: factoryStations.name,
        totalProduced: sql<number>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS NUMERIC)), 0)`,
        totalWaste: sql<number>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS NUMERIC)), 0)`,
        workerCount: sql<number>`COUNT(DISTINCT ${factoryProductionOutputs.userId})`,
      })
        .from(factoryProductionOutputs)
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(gte(factoryProductionOutputs.createdAt, startDate))
        .groupBy(factoryProductionOutputs.stationId, factoryStations.name);

      const result = stationStats.map(s => ({
        ...s,
        totalProduced: Number(s.totalProduced),
        totalWaste: Number(s.totalWaste),
        workerCount: Number(s.workerCount),
        wastePercentage: s.totalProduced > 0 ? (Number(s.totalWaste) / Number(s.totalProduced) * 100) : 0,
        avgOutputPerHour: Number(s.totalProduced) / 8, // Estimate 8 hours
      }));

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching station analytics:", error);
      res.status(500).json({ message: "İstasyon analitiği alınamadı" });
    }
  });

  // Fabrika Analitiği - Zaiyat analizi
  router.get('/api/factory/analytics/waste', isAuthenticated, async (req: any, res) => {
    try {
      const period = req.query.period as string || 'weekly';
      
      const now = new Date();
      let startDate = new Date();
      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const wasteStats = await db.select({
        reasonId: factoryWasteReasons.id,
        reasonName: factoryWasteReasons.name,
        category: factoryWasteReasons.category,
        count: sql<number>`COUNT(*)`,
      })
        .from(factoryProductionOutputs)
        .innerJoin(factoryWasteReasons, eq(factoryProductionOutputs.wasteReasonId, factoryWasteReasons.id))
        .where(and(
          gte(factoryProductionOutputs.createdAt, startDate),
          isNotNull(factoryProductionOutputs.wasteReasonId)
        ))
        .groupBy(factoryWasteReasons.id, factoryWasteReasons.name, factoryWasteReasons.category);

      const total = wasteStats.reduce((sum, w) => sum + Number(w.count), 0);
      
      const result = wasteStats.map(w => ({
        ...w,
        count: Number(w.count),
        percentage: total > 0 ? (Number(w.count) / total * 100) : 0,
      }));

      res.json(result);
    } catch (error: any) {
      console.error("Error fetching waste analytics:", error);
      res.status(500).json({ message: "Zaiyat analitiği alınamadı" });
    }
  });


  // ========================================
  // FACTORY ANALYTICS - Production Stats & Worker Scoring
  // ========================================

  // Helper: Get date range from period
  function getAnalyticsPeriodDates(period: string, startDateStr?: string, endDateStr?: string): { startDate: Date; endDate: Date; prevStartDate: Date; prevEndDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 365);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        startDate = startDateStr ? new Date(startDateStr) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = endDateStr ? new Date(endDateStr) : new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }

    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    prevEndDate.setHours(23, 59, 59, 999);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);
    prevStartDate.setHours(0, 0, 0, 0);

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  // 1. GET /api/factory/analytics/production-stats
  router.get('/api/factory/analytics/production-stats', isAuthenticated, async (req, res) => {
    try {
      const { period = 'monthly', startDate: startDateStr, endDate: endDateStr, productId: productIdStr } = req.query as any;
      const { startDate, endDate, prevStartDate, prevEndDate } = getAnalyticsPeriodDates(period, startDateStr, endDateStr);
      const productIdFilter = productIdStr ? parseInt(productIdStr) : null;

      const baseConditions = [
        gte(factoryProductionOutputs.createdAt, startDate),
        lte(factoryProductionOutputs.createdAt, endDate),
      ];
      if (productIdFilter) {
        baseConditions.push(eq(factoryProductionOutputs.productId, productIdFilter));
      }

      const outputStats = await db.select({
        productId: factoryProductionOutputs.productId,
        productName: factoryProductionOutputs.productName,
        totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
        totalWaste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
        totalBatches: sql<string>`COUNT(*)`,
        totalMinutes: sql<string>`COALESCE(SUM(${factoryProductionOutputs.durationMinutes}), 0)`,
      })
      .from(factoryProductionOutputs)
      .where(and(...baseConditions))
      .groupBy(factoryProductionOutputs.productId, factoryProductionOutputs.productName);

      const batchConditions: any[] = [
        gte(factoryProductionBatches.startTime, startDate),
        lte(factoryProductionBatches.startTime, endDate),
      ];
      if (productIdFilter) {
        batchConditions.push(eq(factoryProductionBatches.productId, productIdFilter));
      }

      const batchStats = await db.select({
        productId: factoryProductionBatches.productId,
        totalPieces: sql<string>`COALESCE(SUM(${factoryProductionBatches.actualPieces}), 0)`,
        totalWasteKg: sql<string>`COALESCE(SUM(CAST(${factoryProductionBatches.wasteWeightKg} AS numeric)), 0)`,
        totalWastePieces: sql<string>`COALESCE(SUM(${factoryProductionBatches.wastePieces}), 0)`,
        batchCount: sql<string>`COUNT(*)`,
        totalDurationMin: sql<string>`COALESCE(SUM(${factoryProductionBatches.actualDurationMinutes}), 0)`,
      })
      .from(factoryProductionBatches)
      .where(and(...batchConditions))
      .groupBy(factoryProductionBatches.productId);

      const prevConditions = [
        gte(factoryProductionOutputs.createdAt, prevStartDate),
        lte(factoryProductionOutputs.createdAt, prevEndDate),
      ];
      if (productIdFilter) {
        prevConditions.push(eq(factoryProductionOutputs.productId, productIdFilter));
      }

      const prevStats = await db.select({
        productId: factoryProductionOutputs.productId,
        totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
      })
      .from(factoryProductionOutputs)
      .where(and(...prevConditions))
      .groupBy(factoryProductionOutputs.productId);

      const prevMap = new Map(prevStats.map(p => [p.productId, Number(p.totalProduced)]));
      const batchMap = new Map(batchStats.map(b => [b.productId, b]));

      const allProducts = await db.select({
        id: factoryProducts.id,
        name: factoryProducts.name,
        category: factoryProducts.category,
      }).from(factoryProducts);
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      let totalProducedAll = 0;
      let totalWasteAll = 0;
      let totalMinutesAll = 0;
      const productIds = new Set<number>();

      const productStats = outputStats.map(stat => {
        const pid = stat.productId || 0;
        const prod = productMap.get(pid);
        const batch = batchMap.get(pid);
        const totalProduced = Number(stat.totalProduced) + (batch ? Number(batch.totalPieces) : 0);
        const totalWaste = Number(stat.totalWaste) + (batch ? Number(batch.totalWasteKg) : 0);
        const totalBatches = Number(stat.totalBatches) + (batch ? Number(batch.batchCount) : 0);
        const totalMinutes = Number(stat.totalMinutes) + (batch ? Number(batch.totalDurationMin) : 0);
        const totalHours = totalMinutes / 60;
        const wastePercent = totalProduced > 0 ? (totalWaste / (totalProduced + totalWaste)) * 100 : 0;
        const avgProductionPerHour = totalHours > 0 ? totalProduced / totalHours : 0;
        const avgBatchSize = totalBatches > 0 ? totalProduced / totalBatches : 0;

        const prevProduced = prevMap.get(pid) || 0;
        const trend = prevProduced > 0 ? ((totalProduced - prevProduced) / prevProduced) * 100 : 0;

        totalProducedAll += totalProduced;
        totalWasteAll += totalWaste;
        totalMinutesAll += totalMinutes;
        if (pid) productIds.add(pid);

        return {
          productId: pid,
          productName: prod?.name || stat.productName || 'Bilinmeyen',
          category: prod?.category || '',
          totalProduced: Math.round(totalProduced * 100) / 100,
          totalWaste: Math.round(totalWaste * 100) / 100,
          wastePercent: Math.round(wastePercent * 100) / 100,
          totalBatches,
          avgBatchSize: Math.round(avgBatchSize * 100) / 100,
          totalHours: Math.round(totalHours * 100) / 100,
          avgProductionPerHour: Math.round(avgProductionPerHour * 100) / 100,
          trend: Math.round(trend * 100) / 100,
        };
      });

      const totalHoursAll = totalMinutesAll / 60;

      const dailyTrendConditions = [
        gte(factoryProductionOutputs.createdAt, startDate),
        lte(factoryProductionOutputs.createdAt, endDate),
      ];
      if (productIdFilter) {
        dailyTrendConditions.push(eq(factoryProductionOutputs.productId, productIdFilter));
      }

      const dailyTrend = await db.select({
        date: sql<string>`DATE(${factoryProductionOutputs.createdAt})`,
        produced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
        waste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
      })
      .from(factoryProductionOutputs)
      .where(and(...dailyTrendConditions))
      .groupBy(sql`DATE(${factoryProductionOutputs.createdAt})`)
      .orderBy(sql`DATE(${factoryProductionOutputs.createdAt})`);

      res.json({
        summary: {
          totalProducts: productIds.size,
          totalProduced: Math.round(totalProducedAll * 100) / 100,
          totalWaste: Math.round(totalWasteAll * 100) / 100,
          avgWastePercent: totalProducedAll > 0 ? Math.round((totalWasteAll / (totalProducedAll + totalWasteAll)) * 10000) / 100 : 0,
          totalHours: Math.round(totalHoursAll * 100) / 100,
          avgProductionPerHour: totalHoursAll > 0 ? Math.round((totalProducedAll / totalHoursAll) * 100) / 100 : 0,
        },
        productStats,
        dailyTrend: dailyTrend.map(d => ({
          date: String(d.date),
          produced: Math.round(Number(d.produced) * 100) / 100,
          waste: Math.round(Number(d.waste) * 100) / 100,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching production stats:", error);
      res.status(500).json({ message: "Üretim istatistikleri alınamadı" });
    }
  });

  // 2. GET /api/factory/analytics/worker-comparison
  router.get('/api/factory/analytics/worker-comparison', isAuthenticated, async (req, res) => {
    try {
      const { period = 'monthly', startDate: startDateStr, endDate: endDateStr, productId: productIdStr } = req.query as any;

      if (!productIdStr) {
        return res.status(400).json({ message: "productId gereklidir" });
      }

      const productIdFilter = parseInt(productIdStr);
      const { startDate, endDate } = getAnalyticsPeriodDates(period, startDateStr, endDateStr);

      const [product] = await db.select({ name: factoryProducts.name }).from(factoryProducts).where(eq(factoryProducts.id, productIdFilter));

      const workerOutputs = await db.select({
        userId: factoryProductionOutputs.userId,
        totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
        totalWaste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
        totalMinutes: sql<string>`COALESCE(SUM(${factoryProductionOutputs.durationMinutes}), 0)`,
        batchCount: sql<string>`COUNT(*)`,
      })
      .from(factoryProductionOutputs)
      .where(and(
        eq(factoryProductionOutputs.productId, productIdFilter),
        gte(factoryProductionOutputs.createdAt, startDate),
        lte(factoryProductionOutputs.createdAt, endDate),
      ))
      .groupBy(factoryProductionOutputs.userId);

      if (workerOutputs.length === 0) {
        return res.json({ productName: product?.name || 'Bilinmeyen', workers: [] });
      }

      const userIds = workerOutputs.map(w => w.userId);
      const workerUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(inArray(users.id, userIds));
      const userMap = new Map(workerUsers.map(u => [u.id, u]));

      const batchDetails = await db.select({
        userId: factoryProductionOutputs.userId,
        produced: factoryProductionOutputs.producedQuantity,
        duration: factoryProductionOutputs.durationMinutes,
      })
      .from(factoryProductionOutputs)
      .where(and(
        eq(factoryProductionOutputs.productId, productIdFilter),
        gte(factoryProductionOutputs.createdAt, startDate),
        lte(factoryProductionOutputs.createdAt, endDate),
      ));

      const userBatchProductions = new Map<string, number[]>();
      for (const b of batchDetails) {
        const arr = userBatchProductions.get(b.userId) || [];
        arr.push(Number(b.produced || 0));
        userBatchProductions.set(b.userId, arr);
      }

      const workersRaw = workerOutputs.map(w => {
        const user = userMap.get(w.userId);
        const totalProduced = Number(w.totalProduced);
        const totalWaste = Number(w.totalWaste);
        const totalMinutes = Number(w.totalMinutes);
        const totalHours = totalMinutes / 60;
        const batchCount = Number(w.batchCount);
        const wastePercent = (totalProduced + totalWaste) > 0 ? (totalWaste / (totalProduced + totalWaste)) * 100 : 0;
        const avgProductionPerHour = totalHours > 0 ? totalProduced / totalHours : 0;
        const avgBatchDuration = batchCount > 0 ? totalMinutes / batchCount : 0;

        const productions = userBatchProductions.get(w.userId) || [];
        let consistencyScore = 50;
        if (productions.length > 1) {
          const mean = productions.reduce((a, b) => a + b, 0) / productions.length;
          const variance = productions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / productions.length;
          const stdDev = Math.sqrt(variance);
          const cv = mean > 0 ? stdDev / mean : 1;
          consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));
        }

        const qualityScore = Math.max(0, Math.min(100, (1 - wastePercent / 100) * 100));

        return {
          userId: w.userId,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          profileImageUrl: user?.profileImageUrl || null,
          totalProduced: Math.round(totalProduced * 100) / 100,
          totalWaste: Math.round(totalWaste * 100) / 100,
          wastePercent: Math.round(wastePercent * 100) / 100,
          avgProductionPerHour: Math.round(avgProductionPerHour * 100) / 100,
          totalHours: Math.round(totalHours * 100) / 100,
          batchCount,
          avgBatchDuration: Math.round(avgBatchDuration * 100) / 100,
          consistencyScore: Math.round(consistencyScore * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          speedScore: 0,
          overallScore: 0,
        };
      });

      const maxSpeed = Math.max(...workersRaw.map(w => w.avgProductionPerHour), 1);
      for (const w of workersRaw) {
        w.speedScore = Math.round((w.avgProductionPerHour / maxSpeed) * 10000) / 100;
        w.overallScore = Math.round((w.speedScore * 0.3 + w.qualityScore * 0.4 + w.consistencyScore * 0.3) * 100) / 100;
      }

      workersRaw.sort((a, b) => b.overallScore - a.overallScore);

      res.json({
        productName: product?.name || 'Bilinmeyen',
        workers: workersRaw,
      });
    } catch (error: any) {
      console.error("Error fetching worker comparison:", error);
      res.status(500).json({ message: "Çalışan karşılaştırması alınamadı" });
    }
  });

  // 3. GET /api/factory/analytics/worker-score/:userId
  router.get('/api/factory/analytics/worker-score/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;

      const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      const allOutputs = await db.select({
        produced: factoryProductionOutputs.producedQuantity,
        waste: factoryProductionOutputs.wasteQuantity,
        duration: factoryProductionOutputs.durationMinutes,
        createdAt: factoryProductionOutputs.createdAt,
        productName: factoryProductionOutputs.productName,
        productId: factoryProductionOutputs.productId,
      })
      .from(factoryProductionOutputs)
      .where(eq(factoryProductionOutputs.userId, userId))
      .orderBy(factoryProductionOutputs.createdAt);

      const monthlyMap = new Map<string, { produced: number; waste: number; minutes: number; count: number; productions: number[] }>();
      const productBreakdownMap = new Map<number, { productName: string; produced: number; waste: number; minutes: number }>();
      const hourlyMap = new Map<number, { total: number; count: number }>();

      let totalProduced = 0;
      let totalWaste = 0;
      let totalMinutes = 0;
      const allProductions: number[] = [];

      for (const o of allOutputs) {
        const produced = Number(o.produced || 0);
        const waste = Number(o.waste || 0);
        const duration = Number(o.duration || 0);
        const createdAt = o.createdAt ? new Date(o.createdAt) : new Date();
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        const hour = createdAt.getHours();
        const pid = o.productId || 0;

        totalProduced += produced;
        totalWaste += waste;
        totalMinutes += duration;
        allProductions.push(produced);

        const m = monthlyMap.get(monthKey) || { produced: 0, waste: 0, minutes: 0, count: 0, productions: [] };
        m.produced += produced;
        m.waste += waste;
        m.minutes += duration;
        m.count += 1;
        m.productions.push(produced);
        monthlyMap.set(monthKey, m);

        const pb = productBreakdownMap.get(pid) || { productName: o.productName || 'Bilinmeyen', produced: 0, waste: 0, minutes: 0 };
        pb.produced += produced;
        pb.waste += waste;
        pb.minutes += duration;
        productBreakdownMap.set(pid, pb);

        const h = hourlyMap.get(hour) || { total: 0, count: 0 };
        h.total += produced;
        h.count += 1;
        hourlyMap.set(hour, h);
      }

      const totalHours = totalMinutes / 60;
      const userAvgPerHour = totalHours > 0 ? totalProduced / totalHours : 0;
      const wastePercent = (totalProduced + totalWaste) > 0 ? totalWaste / (totalProduced + totalWaste) : 0;

      const factoryAvgRows2 = await db.execute(sql`SELECT COALESCE(AVG(CAST(produced_quantity AS numeric)), 1) as avg_produced, COALESCE(AVG(duration_minutes), 60) as avg_minutes FROM factory_production_outputs`);
      const factoryAvgRow2 = ((factoryAvgRows2 as any).rows?.[0] || (factoryAvgRows2 as any)[0] || { avg_produced: 1, avg_minutes: 60 }) as any;
      const factoryAvgProduced = Number(factoryAvgRow2.avg_produced || 1);
      const factoryAvgMinutes = Number(factoryAvgRow2.avg_minutes || 60);
      const factoryAvgPerHour = factoryAvgMinutes > 0 ? factoryAvgProduced / (factoryAvgMinutes / 60) : 1;

      const speedScore = Math.max(0, Math.min(100, (userAvgPerHour / Math.max(factoryAvgPerHour, 0.01)) * 50));
      const qualityScore = Math.max(0, Math.min(100, (1 - wastePercent) * 100));

      let consistencyScore = 50;
      if (allProductions.length > 1) {
        const mean = allProductions.reduce((a, b) => a + b, 0) / allProductions.length;
        const variance = allProductions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allProductions.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 1;
        consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));
      }

      const shiftCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM factory_shift_sessions WHERE user_id = ${userId}`);
      const shiftRow = ((shiftCountResult as any).rows?.[0] || (shiftCountResult as any)[0] || { count: 0 }) as any;
      const totalShifts = Number(shiftRow.count || 0);
      const monthlyDataPoints = monthlyMap.size;
      const expectedShifts = monthlyDataPoints * 22;
      const attendanceScore = expectedShifts > 0 ? Math.max(0, Math.min(100, (totalShifts / expectedShifts) * 100)) : 80;

      const sortedMonths = Array.from(monthlyMap.keys()).sort();
      let improvementScore = 50;
      if (sortedMonths.length >= 6) {
        const last3 = sortedMonths.slice(-3);
        const prev3 = sortedMonths.slice(-6, -3);
        const last3Avg = last3.reduce((sum, key) => sum + (monthlyMap.get(key)?.produced || 0), 0) / 3;
        const prev3Avg = prev3.reduce((sum, key) => sum + (monthlyMap.get(key)?.produced || 0), 0) / 3;
        if (prev3Avg > 0) {
          const improvement = ((last3Avg - prev3Avg) / prev3Avg) * 100;
          improvementScore = Math.max(0, Math.min(100, 50 + improvement));
        }
      }

      const currentScore = speedScore * 0.25 + qualityScore * 0.30 + consistencyScore * 0.20 + attendanceScore * 0.15 + improvementScore * 0.10;

      const scoreHistory = sortedMonths.map(month => {
        const m = monthlyMap.get(month)!;
        const mHours = m.minutes / 60;
        const mSpeed = mHours > 0 ? m.produced / mHours : 0;
        const mSpeedScore = Math.max(0, Math.min(100, (mSpeed / Math.max(factoryAvgPerHour, 0.01)) * 50));
        const mWaste = (m.produced + m.waste) > 0 ? m.waste / (m.produced + m.waste) : 0;
        const mQuality = (1 - mWaste) * 100;
        let mConsistency = 50;
        if (m.productions.length > 1) {
          const mean = m.productions.reduce((a, b) => a + b, 0) / m.productions.length;
          const variance = m.productions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / m.productions.length;
          const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
          mConsistency = Math.max(0, Math.min(100, 100 - cv * 100));
        }
        const mScore = mSpeedScore * 0.25 + mQuality * 0.30 + mConsistency * 0.20 + attendanceScore * 0.15 + 50 * 0.10;
        return {
          month,
          score: Math.round(mScore * 100) / 100,
          produced: Math.round(m.produced * 100) / 100,
          waste: Math.round(m.waste * 100) / 100,
        };
      });

      const productBreakdown = Array.from(productBreakdownMap.entries()).map(([, pb]) => ({
        productName: pb.productName,
        produced: Math.round(pb.produced * 100) / 100,
        waste: Math.round(pb.waste * 100) / 100,
        wastePercent: (pb.produced + pb.waste) > 0 ? Math.round((pb.waste / (pb.produced + pb.waste)) * 100 * 10) / 10 : 0,
        avgSpeed: pb.minutes > 0 ? Math.round((pb.produced / (pb.minutes / 60)) * 100) / 100 : 0,
      }));

      const peakHours = Array.from(hourlyMap.entries())
        .map(([hour, h]) => ({
          hour,
          avgProduction: Math.round((h.total / h.count) * 100) / 100,
        }))
        .sort((a, b) => b.avgProduction - a.avgProduction);

      res.json({
        userId,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        currentScore: Math.round(currentScore * 100) / 100,
        scoreHistory,
        breakdown: {
          speedScore: Math.round(speedScore * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          consistencyScore: Math.round(consistencyScore * 100) / 100,
          attendanceScore: Math.round(attendanceScore * 100) / 100,
          improvementScore: Math.round(improvementScore * 100) / 100,
        },
        productBreakdown,
        peakHours,
        monthlyDataPoints,
      });
    } catch (error: any) {
      console.error("Error fetching worker score:", error);
      res.status(500).json({ message: "Çalışan skoru alınamadı" });
    }
  });

  router.post('/api/factory/analytics/update-scores', isAuthenticated, async (req, res) => {
    try {
      const factoryWorkersRows = await db.execute(sql`SELECT id, first_name as "firstName", last_name as "lastName", performance_score as "performanceScore" FROM users WHERE role IN ('fabrika', 'fabrika_operator')`);

      const factoryWorkers = ((factoryWorkersRows as any).rows || factoryWorkersRows) as any[];
      const factoryAvgRows = await db.execute(sql`SELECT COALESCE(AVG(CAST(produced_quantity AS numeric)), 1) as avg_produced, COALESCE(AVG(duration_minutes), 60) as avg_minutes FROM factory_production_outputs`);
      const factoryAvgRow = (factoryAvgRows as any).rows?.[0] || factoryAvgRows[0] || { avg_produced: 1, avg_minutes: 60 };

      const factoryAvgProduced = Number(factoryAvgRow.avg_produced || 1);
      const factoryAvgMinutes = Number(factoryAvgRow.avg_minutes || 60);
      const factoryAvgPerHour = factoryAvgMinutes > 0 ? factoryAvgProduced / (factoryAvgMinutes / 60) : 1;

      const results: { userId: string; firstName: string; lastName: string; oldScore: number; newScore: number }[] = [];

      for (const worker of factoryWorkers) {
        const outputRows = await db.execute(sql`SELECT produced_quantity as produced, waste_quantity as waste, duration_minutes as duration, created_at as created_at FROM factory_production_outputs WHERE user_id = ${worker.id}`);
        const outputs = ((outputRows as any).rows || outputRows) as any[];

        if (outputs.length === 0) continue;

        let totalProduced = 0;
        let totalWaste = 0;
        let totalMinutes = 0;
        const allProductions: number[] = [];
        const monthSet = new Set<string>();
        const monthlyProduced = new Map<string, number>();

        for (const o of outputs) {
          const produced = Number(o.produced || 0);
          const waste = Number(o.waste || 0);
          const duration = Number(o.duration || 0);
          totalProduced += produced;
          totalWaste += waste;
          totalMinutes += duration;
          allProductions.push(produced);
          if (o.createdAt) {
            const d = new Date(o.createdAt);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthSet.add(monthKey);
            monthlyProduced.set(monthKey, (monthlyProduced.get(monthKey) || 0) + produced);
          }
        }

        const totalHours = totalMinutes / 60;
        const userAvgPerHour = totalHours > 0 ? totalProduced / totalHours : 0;
        const wastePercent = (totalProduced + totalWaste) > 0 ? totalWaste / (totalProduced + totalWaste) : 0;

        const speedScore = Math.max(0, Math.min(100, (userAvgPerHour / Math.max(factoryAvgPerHour, 0.01)) * 50));
        const qualityScore = Math.max(0, Math.min(100, (1 - wastePercent) * 100));

        let consistencyScore = 50;
        if (allProductions.length > 1) {
          const mean = allProductions.reduce((a, b) => a + b, 0) / allProductions.length;
          const variance = allProductions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allProductions.length;
          const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
          consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));
        }

        const shiftCountRows = await db.execute(sql`SELECT COUNT(*) as count FROM factory_shift_sessions WHERE user_id = ${worker.id}`);
        const totalShifts = Number(((shiftCountRows as any).rows?.[0] || shiftCountRows[0] || {}).count || 0);
        const monthlyDataPoints = monthSet.size;
        const expectedShifts = monthlyDataPoints * 22;
        const attendanceScore = expectedShifts > 0 ? Math.max(0, Math.min(100, (totalShifts / expectedShifts) * 100)) : 80;

        const sortedMonths = Array.from(monthSet).sort();
        let improvementScore = 50;
        if (sortedMonths.length >= 6) {
          const last3 = sortedMonths.slice(-3);
          const prev3 = sortedMonths.slice(-6, -3);
          const last3Avg = last3.reduce((sum, key) => sum + (monthlyProduced.get(key) || 0), 0) / 3;
          const prev3Avg = prev3.reduce((sum, key) => sum + (monthlyProduced.get(key) || 0), 0) / 3;
          if (prev3Avg > 0) {
            const improvement = ((last3Avg - prev3Avg) / prev3Avg) * 100;
            improvementScore = Math.max(0, Math.min(100, 50 + improvement));
          }
        }

        const compositeScore = speedScore * 0.25 + qualityScore * 0.30 + consistencyScore * 0.20 + attendanceScore * 0.15 + improvementScore * 0.10;

        const maturityWeight = Math.min(monthlyDataPoints / 6, 1.0);
        const finalScore = compositeScore * maturityWeight + 50 * (1 - maturityWeight);
        const scaledScore = Math.round((finalScore / 20) * 10) / 10;

        const oldScore = Number(worker.performanceScore || 0);
        await db.execute(sql`UPDATE users SET performance_score = ${String(scaledScore)} WHERE id = ${worker.id}`);

        results.push({
          userId: worker.id,
          firstName: worker.firstName || "",
          lastName: worker.lastName || "",
          oldScore,
          newScore: scaledScore,
        });
      }

      res.json({
        updated: results.length,
        workers: results,
      });
    } catch (error: any) {
      console.error("Error updating worker scores:", error);
      res.status(500).json({ message: "Çalışan skorları güncellenemedi" });
    }
  });

  // AI Fabrika Raporları - Rotasyon Analizi (HQ Only)
  router.get('/api/factory/ai-reports/rotation', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const role = user?.role || '';
      
      // Only true HQ roles can access cross-branch analytics
      if (!isHQRole(role as UserRoleType) && role !== 'admin') {
        return res.status(403).json({ message: "Bu rapora erişim yetkiniz yok" });
      }
      
      const period = req.query.period as string || 'weekly';
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Get session data for analysis
      const sessions = await db.select({
        userId: factoryShiftSessions.userId,
        stationId: factoryShiftSessions.stationId,
        stationName: factoryStations.name,
        userName: users.firstName,
        userLastName: users.lastName,
        count: sql<number>`COUNT(*)`,
      })
        .from(factoryShiftSessions)
        .innerJoin(factoryStations, eq(factoryShiftSessions.stationId, factoryStations.id))
        .innerJoin(users, eq(factoryShiftSessions.userId, users.id))
        .where(gte(factoryShiftSessions.loginTime, startDate))
        .groupBy(factoryShiftSessions.userId, factoryShiftSessions.stationId, factoryStations.name, users.firstName, users.lastName);

      // Build analysis content
      let content = `📊 Rotasyon Analizi (${period === 'daily' ? 'Son 24 Saat' : period === 'weekly' ? 'Son 7 Gün' : 'Son 30 Gün'})\n\n`;
      
      if (sessions.length === 0) {
        content += "Bu dönemde yeterli veri bulunmuyor.";
      } else {
        const userStations: Record<string, Set<string>> = {};
        sessions.forEach(s => {
          const name = `${s.userName} ${s.userLastName}`;
          if (!userStations[name]) userStations[name] = new Set();
          userStations[name].add(s.stationName);
        });

        content += "Personel İstasyon Dağılımı:\n";
        Object.entries(userStations).forEach(([name, stations]) => {
          content += `• ${name}: ${Array.from(stations).join(', ')} (${stations.size} farklı istasyon)\n`;
        });

        const avgStations = Object.values(userStations).reduce((sum, s) => sum + s.size, 0) / Object.keys(userStations).length;
        content += `\nOrtalama İstasyon Çeşitliliği: ${avgStations.toFixed(1)}`;
      }

      const recommendations = [
        "Tek istasyonda uzun süre çalışan personele farklı istasyon deneyimi sağlayın",
        "Yüksek performanslı çalışanları kritik istasyonlara öncelikli atayın",
        "İstasyon değişikliklerini kademeli yaparak adaptasyon süresini azaltın"
      ];

      res.json({
        type: 'rotation',
        content,
        recommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error generating rotation report:", error);
      res.status(500).json({ message: "Rotasyon raporu oluşturulamadı" });
    }
  });

  // AI Fabrika Raporları - Hata Örüntüleri (HQ Only)
  router.get('/api/factory/ai-reports/errors', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const role = user?.role || '';
      
      // Only true HQ roles can access cross-branch analytics
      if (!isHQRole(role as UserRoleType) && role !== 'admin') {
        return res.status(403).json({ message: "Bu rapora erişim yetkiniz yok" });
      }
      
      const period = req.query.period as string || 'weekly';
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Get waste data
      const wasteData = await db.select({
        reasonName: factoryWasteReasons.name,
        category: factoryWasteReasons.category,
        stationName: factoryStations.name,
        count: sql<number>`COUNT(*)`,
        totalWaste: sql<number>`SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS DECIMAL))`,
      })
        .from(factoryProductionOutputs)
        .innerJoin(factoryWasteReasons, eq(factoryProductionOutputs.wasteReasonId, factoryWasteReasons.id))
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(and(
          gte(factoryProductionOutputs.createdAt, startDate),
          isNotNull(factoryProductionOutputs.wasteReasonId)
        ))
        .groupBy(factoryWasteReasons.name, factoryWasteReasons.category, factoryStations.name);

      let content = `⚠️ Hata ve Fire Analizi (${period === 'daily' ? 'Son 24 Saat' : period === 'weekly' ? 'Son 7 Gün' : 'Son 30 Gün'})\n\n`;

      if (wasteData.length === 0) {
        content += "Bu dönemde kayıtlı fire/zaiyat bulunmuyor.";
      } else {
        const categoryTotals: Record<string, number> = {};
        const stationTotals: Record<string, number> = {};

        wasteData.forEach(w => {
          categoryTotals[w.category] = (categoryTotals[w.category] || 0) + Number(w.count);
          stationTotals[w.stationName] = (stationTotals[w.stationName] || 0) + Number(w.count);
        });

        content += "Kategori Bazlı Dağılım:\n";
        Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
          content += `• ${cat}: ${count} olay\n`;
        });

        content += "\nİstasyon Bazlı Dağılım:\n";
        Object.entries(stationTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([station, count]) => {
          content += `• ${station}: ${count} olay\n`;
        });

        const topReason = wasteData.sort((a, b) => Number(b.count) - Number(a.count))[0];
        if (topReason) {
          content += `\n🔴 En Sık Görülen Sorun: ${topReason.reasonName} (${topReason.stationName} - ${topReason.count} kez)`;
        }
      }

      const recommendations = [
        "Tekrarlayan hataların kök nedenini analiz edin",
        "Yüksek fire oranına sahip istasyonlarda eğitim düzenleyin",
        "Ekipman kaynaklı hatalarda bakım programını gözden geçirin",
        "Malzeme kalitesini tedarikçi bazında takip edin"
      ];

      res.json({
        type: 'errors',
        content,
        recommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error generating error report:", error);
      res.status(500).json({ message: "Hata raporu oluşturulamadı" });
    }
  });

  // AI Fabrika Raporları - Verimlilik (HQ Only)
  router.get('/api/factory/ai-reports/efficiency', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const role = user?.role || '';
      
      // Only true HQ roles can access cross-branch analytics
      if (!isHQRole(role as UserRoleType) && role !== 'admin') {
        return res.status(403).json({ message: "Bu rapora erişim yetkiniz yok" });
      }
      
      const period = req.query.period as string || 'weekly';
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Get production data
      const productionData = await db.select({
        stationName: factoryStations.name,
        userName: users.firstName,
        userLastName: users.lastName,
        totalProduced: sql<number>`SUM(CAST(${factoryProductionOutputs.quantity} AS DECIMAL))`,
        totalWaste: sql<number>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS DECIMAL)), 0)`,
        outputCount: sql<number>`COUNT(*)`,
      })
        .from(factoryProductionOutputs)
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .innerJoin(users, eq(factoryProductionOutputs.userId, users.id))
        .where(gte(factoryProductionOutputs.createdAt, startDate))
        .groupBy(factoryStations.name, users.firstName, users.lastName);

      let content = `📈 Verimlilik Raporu (${period === 'daily' ? 'Son 24 Saat' : period === 'weekly' ? 'Son 7 Gün' : 'Son 30 Gün'})\n\n`;

      if (productionData.length === 0) {
        content += "Bu dönemde üretim verisi bulunmuyor.";
      } else {
        const totalProduced = productionData.reduce((sum, p) => sum + Number(p.totalProduced || 0), 0);
        const totalWaste = productionData.reduce((sum, p) => sum + Number(p.totalWaste || 0), 0);
        const efficiency = totalProduced > 0 ? ((totalProduced - totalWaste) / totalProduced * 100) : 0;

        content += `Genel Özet:\n`;
        content += `• Toplam Üretim: ${totalProduced.toLocaleString('tr-TR')} birim\n`;
        content += `• Toplam Fire: ${totalWaste.toLocaleString('tr-TR')} birim\n`;
        content += `• Genel Verimlilik: %${efficiency.toFixed(1)}\n\n`;

        // Top performers
        const workerEfficiency = productionData.map(p => ({
          name: `${p.userName} ${p.userLastName}`,
          station: p.stationName,
          produced: Number(p.totalProduced || 0),
          waste: Number(p.totalWaste || 0),
          efficiency: Number(p.totalProduced) > 0 ? ((Number(p.totalProduced) - Number(p.totalWaste)) / Number(p.totalProduced) * 100) : 0
        })).sort((a, b) => b.efficiency - a.efficiency);

        content += "En Verimli Çalışanlar:\n";
        workerEfficiency.slice(0, 5).forEach((w, i) => {
          content += `${i + 1}. ${w.name} - ${w.station}: %${w.efficiency.toFixed(1)} verimlilik\n`;
        });

        if (workerEfficiency.length > 5) {
          content += `\nDikkat Gerektiren Çalışanlar:\n`;
          workerEfficiency.slice(-3).filter(w => w.efficiency < 90).forEach(w => {
            content += `• ${w.name} - ${w.station}: %${w.efficiency.toFixed(1)} (iyileştirme gerekli)\n`;
          });
        }
      }

      const recommendations = [
        "Yüksek performanslı çalışanlardan mentorluk programı oluşturun",
        "Düşük verimlilik gösteren istasyonlarda süreç analizi yapın",
        "Vardiya başlangıç ve bitiş saatlerini optimize edin",
        "Hedeflerin gerçekçiliğini periyodik olarak değerlendirin"
      ];

      res.json({
        type: 'efficiency',
        content,
        recommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error generating efficiency report:", error);
      res.status(500).json({ message: "Verimlilik raporu oluşturulamadı" });
    }
  });

  // AI Rapor Oluşturma (manuel tetikleme)
  router.post('/api/factory/ai-reports/generate', isAuthenticated, async (req, res) => {
    try {
      const { type, period } = req.body;
      
      // Simply redirect to GET endpoints - they generate reports on demand
      res.json({ success: true, message: "Rapor oluşturuldu" });
    } catch (error: any) {
      console.error("Error generating AI report:", error);
      res.status(500).json({ message: "Rapor oluşturulamadı" });
    }
  });

  // ========================================
  // ŞUBE KIOSK SİSTEMİ API'LERİ
  // ========================================

  // Şube kiosk ayarlarını getir veya oluştur
  router.get('/api/branches/:branchId/kiosk/settings', isAuthenticated, async (req: any, res) => {
    try {
      const branchId = parseInt(req.params.branchId);
      
      let [settings] = await db.select().from(branchKioskSettings)
        .where(eq(branchKioskSettings.branchId, branchId))
        .limit(1);
      
      // Yoksa varsayılan oluştur
      if (!settings) {
        [settings] = await db.insert(branchKioskSettings).values({
          branchId,
          kioskPassword: '0000',
        }).returning();
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching kiosk settings:", error);
      res.status(500).json({ message: "Kiosk ayarları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/factory-workers', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, first_name, last_name, role, username
        FROM users 
        WHERE role IN ('fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel', 'fabrika_mudur', 'fabrika')
        AND is_active = true
        ORDER BY first_name, last_name
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching factory workers:", error);
      res.status(500).json({ message: "Fabrika çalışanları alınamadı" });
    }
  });
  router.get('/api/factory-management-scores', isAuthenticated, async (req: any, res) => {
    try {
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const result = await db.execute(sql`
        SELECT * FROM factory_management_scores 
        WHERE year = ${targetYear}
        ORDER BY month DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching factory scores:", error);
      res.status(500).json({ message: "Fabrika yönetim skorları alınamadı" });
    }
  });

  // Calculate/update factory management score for a month
  router.post('/api/factory-management-scores/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['admin', 'ceo', 'cgo', 'fabrika_mudur'].includes(role)) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { month, year } = req.body;
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();

      // 1. Check inventory count status
      const countResult = await db.execute(sql`
        SELECT * FROM inventory_counts WHERE month = ${targetMonth} AND year = ${targetYear} LIMIT 1
      `);
      const countRows = Array.isArray(countResult) ? countResult : ((countResult as any)?.rows ?? []);
      const inventoryCount = countRows[0] as any;
      
      let inventoryCountScore = 100;
      let inventoryCountCompleted = false;
      let inventoryCountOnTime = false;
      
      if (!inventoryCount) {
        inventoryCountScore = 0; // No count created
      } else if (inventoryCount.status === 'completed') {
        inventoryCountCompleted = true;
        const lastDay = new Date(targetYear, targetMonth, 0);
        const completedAt = new Date(inventoryCount.completed_at);
        inventoryCountOnTime = completedAt <= lastDay;
        inventoryCountScore = inventoryCountOnTime ? 100 : 60;
      } else if (inventoryCount.status === 'overdue') {
        inventoryCountScore = 20;
      } else {
        // Still in progress
        const now = new Date();
        const lastDay = new Date(targetYear, targetMonth, 0);
        if (now > lastDay) {
          inventoryCountScore = 30; // Past deadline
        } else {
          inventoryCountScore = 70; // In progress
        }
      }

      // 2. Count production complaints from branches
      const complaintsResult = await db.execute(sql`
        SELECT count(*)::int as cnt FROM product_complaints 
        WHERE EXTRACT(MONTH FROM created_at) = ${targetMonth} 
        AND EXTRACT(YEAR FROM created_at) = ${targetYear}
      `);
      const complaintsRows = Array.isArray(complaintsResult) ? complaintsResult : ((complaintsResult as any)?.rows ?? []);
      const branchComplaintCount = parseInt((complaintsRows[0] as any)?.cnt || '0');
      const branchComplaintScore = Math.max(0, 100 - (branchComplaintCount * 10));

      // 3. Count waste (fire/zayiat from inventory movements)
      const wasteResult = await db.execute(sql`
        SELECT count(*)::int as cnt FROM inventory_movements 
        WHERE movement_type = 'fire'
        AND EXTRACT(MONTH FROM created_at) = ${targetMonth}
        AND EXTRACT(YEAR FROM created_at) = ${targetYear}
      `);
      const wasteRows = Array.isArray(wasteResult) ? wasteResult : ((wasteResult as any)?.rows ?? []);
      const wasteCount = parseInt((wasteRows[0] as any)?.cnt || '0');
      const wasteScore = Math.max(0, 100 - (wasteCount * 5));

      // 4. Production errors (wrong production)
      const prodErrorResult = await db.execute(sql`
        SELECT count(*)::int as cnt FROM production_batches 
        WHERE (quality_status = 'rejected' OR quality_status = 'failed')
        AND EXTRACT(MONTH FROM created_at) = ${targetMonth}
        AND EXTRACT(YEAR FROM created_at) = ${targetYear}
      `);
      const prodErrorRows = Array.isArray(prodErrorResult) ? prodErrorResult : ((prodErrorResult as any)?.rows ?? []);
      const productionErrorCount = parseInt((prodErrorRows[0] as any)?.cnt || '0');
      const productionErrorScore = Math.max(0, 100 - (productionErrorCount * 15));

      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        inventoryCountScore * 0.25 +
        branchComplaintScore * 0.25 +
        wasteScore * 0.25 +
        productionErrorScore * 0.25
      );

      // Upsert score
      const existingScore = await db.execute(sql`
        SELECT id FROM factory_management_scores WHERE month = ${targetMonth} AND year = ${targetYear} LIMIT 1
      `);
      const existingScoreRows = Array.isArray(existingScore) ? existingScore : ((existingScore as any)?.rows ?? []);

      let scoreRecord;
      if (existingScoreRows.length > 0) {
        [scoreRecord] = await db.update(factoryManagementScores)
          .set({
            inventoryCountScore, wasteScore, productionErrorScore,
            wrongProductionScore: productionErrorScore,
            branchComplaintScore, overallScore,
            wasteCount, productionErrorCount, wrongProductionCount: productionErrorCount,
            branchComplaintCount, inventoryCountCompleted, inventoryCountOnTime,
            calculatedAt: new Date(), updatedAt: new Date()
          })
          .where(eq(factoryManagementScores.id, (existingScoreRows[0] as any).id))
          .returning();
      } else {
        [scoreRecord] = await db.insert(factoryManagementScores).values({
          month: targetMonth, year: targetYear,
          inventoryCountScore, wasteScore, productionErrorScore,
          wrongProductionScore: productionErrorScore,
          branchComplaintScore, overallScore,
          wasteCount, productionErrorCount, wrongProductionCount: productionErrorCount,
          branchComplaintCount, inventoryCountCompleted, inventoryCountOnTime,
        }).returning();
      }

      res.json(scoreRecord);
    } catch (error: any) {
      console.error("Error calculating factory score:", error);
      res.status(500).json({ message: "Fabrika skoru hesaplanamadı" });
    }
  });

  // ========================================
  // HACCP CHECK RECORDS
  // ========================================

  router.post('/api/factory/haccp', isAuthenticated, async (req: any, res) => {
    try {
      const { checkPoint, stationId, result, temperatureValue, correctiveAction, notes, productionOutputId, checkDate } = req.body;

      if (!checkPoint || !result) {
        return res.status(400).json({ message: "Kontrol noktası ve sonuç gerekli" });
      }

      if (!['pass', 'fail', 'warning'].includes(result)) {
        return res.status(400).json({ message: "Sonuç pass, fail veya warning olmalı" });
      }

      const [record] = await db.insert(haccpCheckRecords).values({
        checkPoint,
        stationId: stationId || null,
        checkedBy: req.user.id,
        checkDate: checkDate ? new Date(checkDate) : new Date(),
        result,
        temperatureValue: temperatureValue != null ? String(temperatureValue) : null,
        correctiveAction: correctiveAction || null,
        notes: notes || null,
        productionOutputId: productionOutputId || null,
      }).returning();

      if (result === 'fail') {
        try {
          const alertRoles = ['gida_muhendisi', 'fabrika_mudur'];
          const alertUsers = await db.select({ id: users.id })
            .from(users)
            .where(and(inArray(users.role, alertRoles), eq(users.isActive, true)));
          if (alertUsers.length > 0) {
            await db.insert(notifications).values(alertUsers.map(u => ({
              userId: u.id,
              type: 'haccp_fail' as any,
              title: 'HACCP Kontrol Başarısız',
              message: `${checkPoint} kontrol noktasında HACCP başarısızlık kaydedildi`,
              link: '/fabrika/gida-guvenligi',
              isRead: false,
            })));
          }
        } catch (notifErr) {
          console.error("HACCP fail notification error:", notifErr);
        }
      }

      res.status(201).json(record);
    } catch (error: any) {
      console.error("Error creating HACCP record:", error);
      res.status(500).json({ message: "HACCP kaydı oluşturulamadı" });
    }
  });

  router.get('/api/factory/haccp', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_food_safety', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const { stationId, result: resultFilter, startDate, endDate } = req.query;

      const conditions: any[] = [];

      if (stationId) {
        conditions.push(eq(haccpCheckRecords.stationId, parseInt(stationId as string)));
      }
      if (resultFilter) {
        conditions.push(eq(haccpCheckRecords.result, resultFilter as string));
      }
      if (startDate) {
        conditions.push(gte(haccpCheckRecords.checkDate, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(haccpCheckRecords.checkDate, new Date(endDate as string)));
      }

      const records = await db.select({
        id: haccpCheckRecords.id,
        checkPoint: haccpCheckRecords.checkPoint,
        stationId: haccpCheckRecords.stationId,
        checkedBy: haccpCheckRecords.checkedBy,
        checkDate: haccpCheckRecords.checkDate,
        result: haccpCheckRecords.result,
        temperatureValue: haccpCheckRecords.temperatureValue,
        correctiveAction: haccpCheckRecords.correctiveAction,
        notes: haccpCheckRecords.notes,
        productionOutputId: haccpCheckRecords.productionOutputId,
        createdAt: haccpCheckRecords.createdAt,
        checkedByFirstName: users.firstName,
        checkedByLastName: users.lastName,
        stationName: factoryStations.name,
      })
        .from(haccpCheckRecords)
        .leftJoin(users, eq(haccpCheckRecords.checkedBy, users.id))
        .leftJoin(factoryStations, eq(haccpCheckRecords.stationId, factoryStations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(haccpCheckRecords.checkDate));

      res.json(records);
    } catch (error: any) {
      console.error("Error fetching HACCP records:", error);
      res.status(500).json({ message: "HACCP kayıtları getirilemedi" });
    }
  });

  router.get('/api/factory/haccp/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_food_safety', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const summary = await db.select({
        result: haccpCheckRecords.result,
        count: count(),
      })
        .from(haccpCheckRecords)
        .where(gte(haccpCheckRecords.checkDate, thirtyDaysAgo))
        .groupBy(haccpCheckRecords.result);

      const summaryMap: Record<string, number> = { pass: 0, fail: 0, warning: 0 };
      for (const row of summary) {
        summaryMap[row.result] = Number(row.count);
      }

      const total = summaryMap.pass + summaryMap.fail + summaryMap.warning;

      res.json({
        pass: summaryMap.pass,
        fail: summaryMap.fail,
        warning: summaryMap.warning,
        total,
        complianceRate: total > 0 ? Math.round((summaryMap.pass / total) * 100) : 100,
        period: '30_days',
      });
    } catch (error: any) {
      console.error("Error fetching HACCP summary:", error);
      res.status(500).json({ message: "HACCP özeti getirilemedi" });
    }
  });

  // ========================================
  // SEVKİYAT SİSTEMİ — Shipment Management
  // ========================================

  router.get('/api/factory/shipments', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_shipments', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const conditions: any[] = [];
      if (branchId) conditions.push(eq(factoryShipments.branchId, branchId));
      if (status) conditions.push(eq(factoryShipments.status, status));
      if (startDate) conditions.push(gte(factoryShipments.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(factoryShipments.createdAt, new Date(endDate)));

      const shipments = await db.select({
        id: factoryShipments.id,
        shipmentNumber: factoryShipments.shipmentNumber,
        branchId: factoryShipments.branchId,
        status: factoryShipments.status,
        preparedById: factoryShipments.preparedById,
        dispatchedAt: factoryShipments.dispatchedAt,
        deliveredAt: factoryShipments.deliveredAt,
        deliveryNotes: factoryShipments.deliveryNotes,
        createdAt: factoryShipments.createdAt,
        updatedAt: factoryShipments.updatedAt,
        branchName: branches.name,
      })
        .from(factoryShipments)
        .leftJoin(branches, eq(factoryShipments.branchId, branches.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(factoryShipments.createdAt));

      res.json(shipments);
    } catch (error: any) {
      console.error("Get shipments error:", error);
      res.status(500).json({ message: "Sevkiyatlar getirilemedi" });
    }
  });

  router.get('/api/factory/shipments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_shipments', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const id = parseInt(req.params.id);

      const [shipment] = await db.select({
        id: factoryShipments.id,
        shipmentNumber: factoryShipments.shipmentNumber,
        branchId: factoryShipments.branchId,
        status: factoryShipments.status,
        preparedById: factoryShipments.preparedById,
        dispatchedAt: factoryShipments.dispatchedAt,
        deliveredAt: factoryShipments.deliveredAt,
        deliveryNotes: factoryShipments.deliveryNotes,
        createdAt: factoryShipments.createdAt,
        updatedAt: factoryShipments.updatedAt,
        branchName: branches.name,
      })
        .from(factoryShipments)
        .leftJoin(branches, eq(factoryShipments.branchId, branches.id))
        .where(eq(factoryShipments.id, id));

      if (!shipment) {
        return res.status(404).json({ message: "Sevkiyat bulunamadı" });
      }

      const items = await db.select({
        id: factoryShipmentItems.id,
        shipmentId: factoryShipmentItems.shipmentId,
        productId: factoryShipmentItems.productId,
        quantity: factoryShipmentItems.quantity,
        unit: factoryShipmentItems.unit,
        lotNumber: factoryShipmentItems.lotNumber,
        notes: factoryShipmentItems.notes,
        productName: factoryProducts.name,
        productSku: factoryProducts.sku,
      })
        .from(factoryShipmentItems)
        .leftJoin(factoryProducts, eq(factoryShipmentItems.productId, factoryProducts.id))
        .where(eq(factoryShipmentItems.shipmentId, id));

      res.json({ ...shipment, items });
    } catch (error: any) {
      console.error("Get shipment detail error:", error);
      res.status(500).json({ message: "Sevkiyat detayı getirilemedi" });
    }
  });

  router.post('/api/factory/shipments', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'fabrika_mudur', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const { branchId, deliveryNotes, items } = req.body;

      if (!branchId) {
        return res.status(400).json({ message: "Şube seçilmeli" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "En az bir ürün eklenmeli" });
      }

      const shipmentNumber = `SVK-${Date.now()}`;

      const [shipment] = await db.insert(factoryShipments).values({
        shipmentNumber,
        branchId,
        status: 'hazirlaniyor',
        preparedById: req.user.id,
        deliveryNotes: deliveryNotes || null,
      }).returning();

      for (const item of items) {
        await db.insert(factoryShipmentItems).values({
          shipmentId: shipment.id,
          productId: item.productId,
          quantity: String(item.quantity),
          unit: item.unit || null,
          lotNumber: item.lotNumber || null,
          notes: item.notes || null,
        });
      }

      res.status(201).json(shipment);
    } catch (error: any) {
      console.error("Create shipment error:", error);
      res.status(500).json({ message: "Sevkiyat oluşturulamadı" });
    }
  });

  router.patch('/api/factory/shipments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'fabrika_mudur', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      const { status, deliveryNotes } = req.body;

      const [currentShipment] = await db.select().from(factoryShipments)
        .where(eq(factoryShipments.id, id));

      if (!currentShipment) {
        return res.status(404).json({ message: "Sevkiyat bulunamadı" });
      }

      const validTransitions: Record<string, string[]> = {
        'hazirlaniyor': ['sevk_edildi', 'iptal'],
        'sevk_edildi': ['teslim_edildi'],
      };

      const allowed = validTransitions[currentShipment.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({
          message: `Geçersiz durum geçişi: ${currentShipment.status} → ${status}`
        });
      }

      const updates: any = { status, updatedAt: new Date() };

      if (status === 'sevk_edildi') {
        updates.dispatchedAt = new Date();

        const result = await db.transaction(async (tx) => {
          const lockedShipment = await tx.execute(
            sql`SELECT * FROM factory_shipments WHERE id = ${id} FOR UPDATE`
          );
          const shipmentRow = lockedShipment.rows?.[0] as any;
          if (!shipmentRow || shipmentRow.status !== 'hazirlaniyor') {
            throw new Error("INVALID_TRANSITION:Bu sevkiyat zaten işlenmiş veya durumu değişmiş");
          }

          const items = await tx.select().from(factoryShipmentItems)
            .where(eq(factoryShipmentItems.shipmentId, id));

          const insufficientItems: string[] = [];
          for (const item of items) {
            const lockedRows = await tx.execute(
              sql`SELECT * FROM factory_inventory WHERE product_id = ${item.productId} LIMIT 1 FOR UPDATE`
            );
            const invRecord = lockedRows.rows?.[0] as any;
            const needed = Math.round(parseFloat(item.quantity));
            if (!invRecord || invRecord.quantity < needed) {
              const [prod] = await tx.select({ name: factoryProducts.name }).from(factoryProducts).where(eq(factoryProducts.id, item.productId)).limit(1);
              insufficientItems.push(`${prod?.name || 'Urun #' + item.productId}: Mevcut ${invRecord?.quantity || 0}, Gerekli ${needed}`);
            }
          }

          if (insufficientItems.length > 0) {
            throw new Error("INSUFFICIENT_STOCK:" + insufficientItems.join("; "));
          }

          for (const item of items) {
            const lockedRows = await tx.execute(
              sql`SELECT * FROM factory_inventory WHERE product_id = ${item.productId} LIMIT 1 FOR UPDATE`
            );
            const invRecord = lockedRows.rows?.[0] as any;

            if (invRecord) {
              const newQuantity = invRecord.quantity - Math.round(parseFloat(item.quantity));
              if (newQuantity < 0) {
                const [prod] = await tx.select({ name: factoryProducts.name }).from(factoryProducts).where(eq(factoryProducts.id, item.productId)).limit(1);
                throw new Error("INSUFFICIENT_STOCK:" + `${prod?.name || 'Urun #' + item.productId}: Stok negatife düşer`);
              }
              await tx.update(factoryInventory)
                .set({
                  quantity: newQuantity,
                  lastUpdatedById: req.user.id,
                  updatedAt: new Date(),
                })
                .where(eq(factoryInventory.id, invRecord.id));
            }

            const [prod] = await tx.select({ name: factoryProducts.name }).from(factoryProducts).where(eq(factoryProducts.id, item.productId)).limit(1);
            const prodName = prod?.name || '';

            const invItems = await tx.select().from(inventory)
              .where(eq(inventory.name, prodName))
              .limit(1);

            if (invItems.length > 0) {
              const prevStock = invItems[0].currentStock || "0";
              const qtyNum = parseFloat(item.quantity);
              const newStock = String(Math.max(0, parseFloat(prevStock) - qtyNum));

              await tx.insert(inventoryMovements).values({
                inventoryId: invItems[0].id,
                movementType: 'cikis',
                quantity: item.quantity,
                previousStock: prevStock,
                newStock: newStock,
                referenceType: 'shipment',
                referenceId: id,
                notes: `Sevkiyat #${currentShipment.shipmentNumber} - stok çıkışı`,
                createdById: req.user.id,
              });
            }
          }

          if (deliveryNotes) {
            updates.deliveryNotes = deliveryNotes;
          }

          const [updated] = await tx.update(factoryShipments)
            .set(updates)
            .where(eq(factoryShipments.id, id))
            .returning();

          return updated;
        });

        return res.json(result);
      }

      if (status === 'teslim_edildi') {
        updates.deliveredAt = new Date();
      }

      if (deliveryNotes) {
        updates.deliveryNotes = deliveryNotes;
      }

      const [updated] = await db.update(factoryShipments)
        .set(updates)
        .where(eq(factoryShipments.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
        return res.status(400).json({
          message: "Yetersiz stok: " + error.message.replace('INSUFFICIENT_STOCK:', '')
        });
      }
      if (error.message?.startsWith('INVALID_TRANSITION:')) {
        return res.status(409).json({
          message: error.message.replace('INVALID_TRANSITION:', '')
        });
      }
      console.error("Update shipment status error:", error);
      res.status(500).json({ message: "Sevkiyat durumu güncellenemedi" });
    }
  });

  router.delete('/api/factory/shipments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['admin', 'fabrika', 'fabrika_mudur', 'coach'].includes(userRole)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }

      const id = parseInt(req.params.id);

      const [shipment] = await db.select().from(factoryShipments)
        .where(eq(factoryShipments.id, id));

      if (!shipment) {
        return res.status(404).json({ message: "Sevkiyat bulunamadı" });
      }

      if (shipment.status !== 'hazirlaniyor') {
        return res.status(400).json({ message: "Sadece 'hazırlanıyor' durumundaki sevkiyatlar silinebilir" });
      }

      await db.delete(factoryShipmentItems).where(eq(factoryShipmentItems.shipmentId, id));
      await db.delete(factoryShipments).where(eq(factoryShipments.id, id));

      res.json({ success: true, message: "Sevkiyat silindi" });
    } catch (error: any) {
      console.error("Delete shipment error:", error);
      res.status(500).json({ message: "Sevkiyat silinemedi" });
    }
  });

  router.get('/api/factory/dashboard/food-engineer-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_quality', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [pendingEngineerResult] = await db
        .select({ count: count() })
        .from(factoryQualityChecks)
        .where(eq(factoryQualityChecks.decision, 'pending_engineer'));

      const todayOutputs = await db
        .select({
          qualityStatus: factoryProductionOutputs.qualityStatus,
          cnt: count(),
          totalWaste: sum(factoryProductionOutputs.wasteQuantity),
          totalProduced: sum(factoryProductionOutputs.producedQuantity),
        })
        .from(factoryProductionOutputs)
        .where(gte(factoryProductionOutputs.createdAt, todayStart))
        .groupBy(factoryProductionOutputs.qualityStatus);

      let todayTotalLots = 0;
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;
      let totalWaste = 0;
      let totalProduced = 0;

      for (const row of todayOutputs) {
        const c = Number(row.cnt);
        todayTotalLots += c;
        totalWaste += parseFloat(row.totalWaste || '0');
        totalProduced += parseFloat(row.totalProduced || '0');
        if (row.qualityStatus === 'approved') approvedCount += c;
        else if (row.qualityStatus === 'rejected') rejectedCount += c;
        else pendingCount += c;
      }

      const wasteRate = totalProduced > 0 ? Math.round((totalWaste / totalProduced) * 10000) / 100 : 0;

      const haccpResults = await db
        .select({
          result: haccpCheckRecords.result,
          cnt: count(),
        })
        .from(haccpCheckRecords)
        .where(gte(haccpCheckRecords.checkDate, thirtyDaysAgo))
        .groupBy(haccpCheckRecords.result);

      let haccpFail = 0;
      let haccpWarning = 0;
      let haccpPass = 0;
      for (const row of haccpResults) {
        const c = Number(row.cnt);
        if (row.result === 'fail') haccpFail = c;
        else if (row.result === 'warning') haccpWarning = c;
        else if (row.result === 'pass') haccpPass = c;
      }

      const [openCorrectiveActions] = await db
        .select({ count: count() })
        .from(haccpCheckRecords)
        .where(and(
          isNotNull(haccpCheckRecords.correctiveAction),
          or(
            eq(haccpCheckRecords.result, 'fail'),
            eq(haccpCheckRecords.result, 'warning')
          ),
          gte(haccpCheckRecords.checkDate, thirtyDaysAgo)
        ));

      const lowStockItems = await db
        .select({ count: count() })
        .from(factoryInventory)
        .innerJoin(factoryProducts, eq(factoryInventory.productId, factoryProducts.id))
        .where(sql`${factoryInventory.quantity} <= ${factoryProducts.minStock} AND ${factoryProducts.minStock} > 0`);

      const lowStockCount = lowStockItems[0]?.count ? Number(lowStockItems[0].count) : 0;

      res.json({
        pendingEngineerApprovals: Number(pendingEngineerResult?.count || 0),
        dailyProduction: {
          totalLots: todayTotalLots,
          approved: approvedCount,
          pending: pendingCount,
          rejected: rejectedCount,
          wasteRate,
        },
        haccpCompliance: {
          pass: haccpPass,
          fail: haccpFail,
          warning: haccpWarning,
          openCorrectiveActions: Number(openCorrectiveActions?.count || 0),
        },
        stockAlerts: {
          lowStockCount,
        },
      });
    } catch (error: any) {
      console.error("Food engineer stats error:", error);
      res.status(500).json({ message: "İstatistikler getirilemedi" });
    }
  });

  router.post('/api/factory/seed-data', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Sadece admin seed data oluşturabilir" });
      }

      const existingStations = await db.select({ id: factoryStations.id }).from(factoryStations).limit(1);
      if (existingStations.length > 0) {
        return res.json({ message: "Seed data zaten mevcut", seeded: false });
      }

      const stationsData = [
        { name: "Kavurma Hatti", code: "KAVURMA", category: "uretim", description: "Kahve kavurma istasyonu", targetHourlyOutput: 50, sortOrder: 1 },
        { name: "Paketleme Hatti", code: "PAKETLEME", category: "paketleme", description: "Urun paketleme istasyonu", targetHourlyOutput: 100, sortOrder: 2 },
        { name: "Dondurma Hatti", code: "DONDURMA", category: "uretim", description: "Soguk urun uretim hatti", targetHourlyOutput: 30, sortOrder: 3 },
        { name: "Hamur Hatti", code: "HAMUR", category: "uretim", description: "Hamurisi urun hazirlama", targetHourlyOutput: 40, sortOrder: 4 },
        { name: "Pisirme Hatti", code: "PISIRME", category: "uretim", description: "Firinlama ve pisirme", targetHourlyOutput: 60, sortOrder: 5 },
      ];
      const insertedStations = await db.insert(factoryStations).values(stationsData).returning();

      const productsData = [
        { name: "Cheesecake", sku: "FP-CHEESE-001", category: "tatli", unit: "adet", unitPrice: 4500, minStock: 20, requiresFoodEngineerApproval: true, allergens: ["sut", "gluten", "yumurta"], description: "Klasik cheesecake" },
        { name: "Cookie", sku: "FP-COOKIE-001", category: "tatli", unit: "adet", unitPrice: 1500, minStock: 50, requiresFoodEngineerApproval: true, allergens: ["gluten", "yumurta", "sut"], description: "Cikolatali cookie" },
        { name: "Filtre Kahve 250g", sku: "FP-FILTRE-250", category: "kahve", unit: "paket", unitPrice: 12000, minStock: 100, requiresFoodEngineerApproval: false, description: "Filtre kahve 250g paket" },
        { name: "Espresso Blend 1kg", sku: "FP-ESPRESSO-1K", category: "kahve", unit: "paket", unitPrice: 45000, minStock: 50, requiresFoodEngineerApproval: false, description: "Espresso blend 1kg" },
        { name: "Donut", sku: "FP-DONUT-001", category: "tatli", unit: "adet", unitPrice: 2000, minStock: 40, requiresFoodEngineerApproval: true, allergens: ["gluten", "yumurta", "sut"], description: "Klasik donut" },
        { name: "Kek Dilimi", sku: "FP-KEK-001", category: "tatli", unit: "adet", unitPrice: 3500, minStock: 30, requiresFoodEngineerApproval: true, allergens: ["gluten", "yumurta", "sut"], description: "Gunluk taze kek dilimi" },
        { name: "Granola Bar", sku: "FP-GRANOLA-001", category: "atistirmalik", unit: "adet", unitPrice: 2500, minStock: 60, requiresFoodEngineerApproval: false, allergens: ["gluten", "fistik"], description: "Yulafli granola bar" },
        { name: "Soguk Brew 500ml", sku: "FP-COLDBREW-500", category: "kahve", unit: "sise", unitPrice: 8000, minStock: 80, requiresFoodEngineerApproval: false, description: "Cold brew kahve 500ml" },
        { name: "Tuzlu Kurabiye", sku: "FP-TUZLU-001", category: "atistirmalik", unit: "adet", unitPrice: 1800, minStock: 40, requiresFoodEngineerApproval: true, allergens: ["gluten", "sut"], description: "Tuzlu kurabiye" },
        { name: "Brownie", sku: "FP-BROWNIE-001", category: "tatli", unit: "adet", unitPrice: 3000, minStock: 25, requiresFoodEngineerApproval: true, allergens: ["gluten", "yumurta", "sut", "kakao"], description: "Cikolatali brownie" },
        { name: "Limonata Konsantre", sku: "FP-LIMONATA-001", category: "icecek", unit: "litre", unitPrice: 6000, minStock: 30, requiresFoodEngineerApproval: false, description: "Ev yapimi limonata konsantresi" },
        { name: "Cinnaboom", sku: "FP-CINNABOOM-001", category: "tatli", unit: "adet", unitPrice: 3500, minStock: 20, requiresFoodEngineerApproval: true, allergens: ["gluten", "yumurta", "sut", "tarcin"], description: "Tarcınlı rulo" },
      ];
      const insertedProducts = await db.insert(factoryProducts).values(productsData).returning();

      for (const product of insertedProducts) {
        await db.insert(factoryInventory).values({
          productId: product.id,
          quantity: Math.floor(Math.random() * 50) + 10,
          reservedQuantity: 0,
        });
      }

      res.json({
        message: "Fabrika seed data basariyla olusturuldu",
        seeded: true,
        stations: insertedStations.length,
        products: insertedProducts.length,
      });
    } catch (error: any) {
      console.error("Factory seed error:", error);
      res.status(500).json({ message: "Seed data olusturulamadi: " + error.message });
    }
  });

  // ========================================
  // T007: KAHVE KAVURMA KAYIT SİSTEMİ
  // ========================================

  router.post("/api/factory/roasting", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'create')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { greenCoffeeProductId, roastedProductId, greenWeightKg, roastedWeightKg, roastDegree, startTemperature, endTemperature, firstCrackTime, roastDurationMinutes, notes } = req.body;

      if (!greenWeightKg || !roastedWeightKg || !roastDegree) {
        return res.status(400).json({ message: "Yeşil kahve ağırlığı, kavurulmuş ağırlık ve kavurma derecesi zorunludur" });
      }

      const greenW = parseFloat(greenWeightKg);
      const roastedW = parseFloat(roastedWeightKg);

      if (!greenW || greenW <= 0 || isNaN(greenW)) {
        return res.status(400).json({ message: "Yeşil kahve ağırlığı 0'dan büyük olmalı" });
      }
      if (isNaN(roastedW) || roastedW < 0) {
        return res.status(400).json({ message: "Kavurulmuş ağırlık geçerli bir değer olmalı" });
      }

      const rawPct = (greenW - roastedW) / greenW * 100;
      if (!isFinite(rawPct)) {
        return res.status(400).json({ message: "Fire oranı hesaplanamadı — ağırlık değerlerini kontrol edin" });
      }
      const weightLossPct = rawPct.toFixed(2);

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const existingCount = await db.select({ count: count() }).from(coffeeRoastingLogs)
        .where(gte(coffeeRoastingLogs.roastDate, new Date(today.toISOString().slice(0, 10))));
      const seq = String((existingCount[0]?.count || 0) + 1).padStart(3, '0');
      const chargeNumber = `CHG-${dateStr}-${seq}`;

      const result = await db.transaction(async (tx) => {
        const [log] = await tx.insert(coffeeRoastingLogs).values({
          chargeNumber,
          greenCoffeeProductId: greenCoffeeProductId || null,
          roastedProductId: roastedProductId || null,
          greenWeightKg: String(greenWeightKg),
          roastedWeightKg: String(roastedWeightKg),
          weightLossPct,
          roastDegree,
          startTemperature: startTemperature ? String(startTemperature) : null,
          endTemperature: endTemperature ? String(endTemperature) : null,
          firstCrackTime: firstCrackTime || null,
          roastDurationMinutes: roastDurationMinutes || null,
          operatorId: req.user?.id,
          notes: notes || null,
        }).returning();

        if (greenCoffeeProductId) {
          const [greenStock] = await tx.select().from(factoryInventory)
            .where(eq(factoryInventory.productId, greenCoffeeProductId));
          if (greenStock) {
            const newQty = Math.round(parseFloat(String(greenStock.quantity)) - greenW);
            await tx.update(factoryInventory)
              .set({ quantity: Math.max(0, newQty), updatedAt: new Date() })
              .where(eq(factoryInventory.productId, greenCoffeeProductId));
          }
        }

        if (roastedProductId) {
          const [roastedStock] = await tx.select().from(factoryInventory)
            .where(eq(factoryInventory.productId, roastedProductId));
          if (roastedStock) {
            const newQty = Math.round(parseFloat(String(roastedStock.quantity)) + roastedW);
            await tx.update(factoryInventory)
              .set({ quantity: newQty, updatedAt: new Date() })
              .where(eq(factoryInventory.productId, roastedProductId));
          } else {
            await tx.insert(factoryInventory).values({
              productId: roastedProductId,
              quantity: Math.round(roastedW),
              reservedQuantity: 0,
            });
          }
        }

        return log;
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Roasting log create error:", error);
      res.status(500).json({ message: "Kavurma kaydı oluşturulamadı: " + error.message });
    }
  });

  router.get("/api/factory/roasting", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { startDate, endDate, roastDegree, operatorId } = req.query;
      const conditions: any[] = [];

      if (startDate) conditions.push(gte(coffeeRoastingLogs.roastDate, new Date(startDate as string)));
      if (endDate) conditions.push(lte(coffeeRoastingLogs.roastDate, new Date(endDate as string)));
      if (roastDegree) conditions.push(eq(coffeeRoastingLogs.roastDegree, roastDegree as string));
      if (operatorId) conditions.push(eq(coffeeRoastingLogs.operatorId, operatorId as string));

      const rawLogs = await db.select()
        .from(coffeeRoastingLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(coffeeRoastingLogs.roastDate))
        .limit(100);

      const operatorIds = [...new Set(rawLogs.map(l => l.operatorId).filter(Boolean))] as string[];
      const productIds = [...new Set(rawLogs.map(l => l.greenCoffeeProductId).filter(Boolean))] as number[];

      const operatorMap = new Map<string, string>();
      if (operatorIds.length > 0) {
        const ops = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users).where(inArray(users.id, operatorIds));
        for (const u of ops) operatorMap.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim());
      }

      const productMap = new Map<number, string>();
      if (productIds.length > 0) {
        const prods = await db.select({ id: factoryProducts.id, name: factoryProducts.name })
          .from(factoryProducts).where(inArray(factoryProducts.id, productIds));
        for (const p of prods) productMap.set(p.id, p.name);
      }

      const enriched = rawLogs.map(log => ({
        log,
        operatorName: log.operatorId ? operatorMap.get(log.operatorId) || null : null,
        greenProductName: log.greenCoffeeProductId ? productMap.get(log.greenCoffeeProductId) || null : null,
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error("Roasting list error:", error);
      res.status(500).json({ message: "Kavurma kayıtları listelenemedi" });
    }
  });

  router.get("/api/factory/roasting/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await db.select({
        totalRoasts: count(),
        avgWeightLoss: avg(coffeeRoastingLogs.weightLossPct),
        totalGreenKg: sum(coffeeRoastingLogs.greenWeightKg),
        totalRoastedKg: sum(coffeeRoastingLogs.roastedWeightKg),
      }).from(coffeeRoastingLogs)
        .where(gte(coffeeRoastingLogs.roastDate, thirtyDaysAgo));

      const degreeBreakdown = await db.select({
        degree: coffeeRoastingLogs.roastDegree,
        count: count(),
      }).from(coffeeRoastingLogs)
        .where(gte(coffeeRoastingLogs.roastDate, thirtyDaysAgo))
        .groupBy(coffeeRoastingLogs.roastDegree);

      res.json({ stats: stats[0], degreeBreakdown });
    } catch (error: any) {
      console.error("Roasting stats error:", error);
      res.status(500).json({ message: "Kavurma istatistikleri alınamadı" });
    }
  });

  // ========================================
  // T005: LOT/PARTİ İZLENEBİLİRLİK SİSTEMİ
  // ========================================

  router.post("/api/factory/lots", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'create')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { productId, batchId, quantity, unit, expiryDate, stationId, notes } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({ message: "Ürün ve miktar zorunludur" });
      }

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const existingCount = await db.select({ count: count() }).from(productionLots)
        .where(gte(productionLots.productionDate, new Date(today.toISOString().slice(0, 10))));
      const seq = String((existingCount[0]?.count || 0) + 1).padStart(3, '0');
      const lotNumber = `LOT-${dateStr}-${seq}`;

      const [lot] = await db.insert(productionLots).values({
        lotNumber,
        productId,
        batchId: batchId || null,
        quantity: String(quantity),
        unit: unit || 'adet',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        producedBy: req.user?.id,
        stationId: stationId || null,
        status: 'uretildi',
        notes: notes || null,
      }).returning();

      res.status(201).json(lot);
    } catch (error: any) {
      console.error("LOT create error:", error);
      res.status(500).json({ message: "LOT oluşturulamadı: " + error.message });
    }
  });

  router.get("/api/factory/lots", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { productId, status, startDate, endDate } = req.query;
      const conditions: any[] = [];

      if (productId) conditions.push(eq(productionLots.productId, parseInt(productId as string)));
      if (status) conditions.push(eq(productionLots.status, status as string));
      if (startDate) conditions.push(gte(productionLots.productionDate, new Date(startDate as string)));
      if (endDate) conditions.push(lte(productionLots.productionDate, new Date(endDate as string)));

      const rawLots = await db.select()
        .from(productionLots)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(productionLots.productionDate))
        .limit(200);

      const lotProductIds = [...new Set(rawLots.map(l => l.productId).filter(Boolean))] as number[];
      const lotProducerIds = [...new Set(rawLots.map(l => l.producedBy).filter(Boolean))] as string[];

      const lotProductMap = new Map<number, string>();
      if (lotProductIds.length > 0) {
        const prods = await db.select({ id: factoryProducts.id, name: factoryProducts.name })
          .from(factoryProducts).where(inArray(factoryProducts.id, lotProductIds));
        for (const p of prods) lotProductMap.set(p.id, p.name);
      }

      const lotProducerMap = new Map<string, string>();
      if (lotProducerIds.length > 0) {
        const usrs = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users).where(inArray(users.id, lotProducerIds));
        for (const u of usrs) lotProducerMap.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim());
      }

      const enriched = rawLots.map(lot => ({
        lot,
        productName: lot.productId ? lotProductMap.get(lot.productId) || null : null,
        producerName: lot.producedBy ? lotProducerMap.get(lot.producedBy) || null : null,
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error("LOT list error:", error);
      res.status(500).json({ message: "LOT listesi alınamadı" });
    }
  });

  router.get("/api/factory/lots/:lotNumber/trace", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role as UserRoleType;
      if (!hasPermission(userRole, 'factory_production', 'view')) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const { lotNumber } = req.params;
      const [lot] = await db.select().from(productionLots)
        .where(eq(productionLots.lotNumber, lotNumber));

      if (!lot) {
        return res.status(404).json({ message: "LOT bulunamadı" });
      }

      const product = lot.productId ? await db.select().from(factoryProducts)
        .where(eq(factoryProducts.id, lot.productId)) : [];

      const qualityCheck = lot.qualityCheckId ? await db.select().from(factoryQualityChecks)
        .where(eq(factoryQualityChecks.id, lot.qualityCheckId)) : [];

      const shipmentItems = await db.select({
        item: factoryShipmentItems,
        shipment: factoryShipments,
      })
        .from(factoryShipmentItems)
        .leftJoin(factoryShipments, eq(factoryShipmentItems.shipmentId, factoryShipments.id))
        .where(eq(factoryShipmentItems.lotNumber, lotNumber));

      const producerRaw = lot.producedBy ? await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, lot.producedBy)) : [];
      const producer = producerRaw.length > 0 ? [{ fullName: `${producerRaw[0].firstName || ''} ${producerRaw[0].lastName || ''}`.trim() }] : [];

      res.json({
        lot,
        product: product[0] || null,
        producer: producer[0] || null,
        qualityCheck: qualityCheck[0] || null,
        shipments: shipmentItems,
      });
    } catch (error: any) {
      console.error("LOT trace error:", error);
      res.status(500).json({ message: "LOT izlenebilirlik bilgisi alınamadı" });
    }
  });

  // ========================================
  // T009: KİOSK BASİTLEŞTİRME (3 BUTON AKIŞI)
  // ========================================

  router.post("/api/factory/kiosk/quick-start", isKioskAuthenticated, async (req: any, res) => {
    try {
      const { stationId } = req.body;
      const userId = req.user?.id;

      if (!stationId) {
        return res.status(400).json({ message: "İstasyon seçimi zorunludur" });
      }

      const existingSession = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ));

      if (existingSession.length > 0) {
        return res.json({ session: existingSession[0], message: "Zaten aktif vardiya var" });
      }

      const [session] = await db.insert(factoryShiftSessions).values({
        userId,
        stationId,
        status: 'active',
        checkInTime: new Date(),
      }).returning();

      res.status(201).json({ session, message: "Vardiya başlatıldı" });
    } catch (error: any) {
      console.error("Quick start error:", error);
      res.status(500).json({ message: "Vardiya başlatılamadı: " + error.message });
    }
  });

  router.post("/api/factory/kiosk/quick-complete", isKioskAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { productId, quantity, wasteQuantity, notes } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({ message: "Ürün ve miktar zorunludur" });
      }

      const [activeSession] = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ));

      if (!activeSession) {
        return res.status(400).json({ message: "Aktif vardiya bulunamadı. Önce vardiya başlatın." });
      }

      const [product] = await db.select().from(factoryProducts)
        .where(eq(factoryProducts.id, productId));

      if (!product) {
        return res.status(404).json({ message: "Ürün bulunamadı" });
      }

      const qty = parseFloat(quantity);
      const waste = wasteQuantity ? parseFloat(wasteQuantity) : 0;

      if (!qty || qty <= 0 || isNaN(qty)) {
        return res.status(400).json({ message: "Miktar 0'dan büyük olmalı" });
      }
      if (waste < 0 || isNaN(waste)) {
        return res.status(400).json({ message: "Fire miktarı negatif olamaz" });
      }

      const result = await db.transaction(async (tx) => {
        if (product.productType === 'mamul' && product.parentProductId) {
          const ratio = parseFloat(String(product.conversionRatio || '1'));
          if (ratio <= 0) {
            throw new Error(`INSUFFICIENT_SEMI: Geçersiz dönüşüm oranı: ${ratio}`);
          }
          const [parentStock] = await tx.select().from(factoryInventory)
            .where(eq(factoryInventory.productId, product.parentProductId));
          const needed = qty * ratio;
          const available = parentStock ? parseFloat(String(parentStock.quantity)) : 0;

          if (available < needed) {
            throw new Error(`INSUFFICIENT_SEMI: Yarı mamül yetersiz. Gereken: ${needed}, Mevcut: ${available}`);
          }

          await tx.update(factoryInventory)
            .set({ quantity: Math.round(available - needed), updatedAt: new Date() })
            .where(eq(factoryInventory.productId, product.parentProductId));
        }

        const [output] = await tx.insert(factoryProductionOutputs).values({
          sessionId: activeSession.id,
          userId,
          stationId: activeSession.stationId,
          productId,
          productName: product.name,
          producedQuantity: String(qty),
          producedUnit: product.unit || 'adet',
          wasteQuantity: String(waste),
          wasteUnit: product.unit || 'adet',
          qualityStatus: 'pending',
          createdAt: new Date(),
        }).returning();

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const existingLots = await tx.select({ count: count() }).from(productionLots)
          .where(gte(productionLots.productionDate, new Date(today.toISOString().slice(0, 10))));
        const seq = String((existingLots[0]?.count || 0) + 1).padStart(3, '0');
        const lotNumber = `LOT-${dateStr}-${seq}`;

        const [lot] = await tx.insert(productionLots).values({
          lotNumber,
          productId,
          quantity: String(qty),
          unit: product.unit || 'adet',
          producedBy: userId,
          stationId: activeSession.stationId,
          status: 'kalite_bekliyor',
        }).returning();

        const [existingInventory] = await tx.select().from(factoryInventory)
          .where(eq(factoryInventory.productId, productId));
        if (existingInventory) {
          await tx.update(factoryInventory)
            .set({ quantity: Math.round(parseFloat(String(existingInventory.quantity)) + qty), updatedAt: new Date() })
            .where(eq(factoryInventory.productId, productId));
        } else {
          await tx.insert(factoryInventory).values({
            productId,
            quantity: Math.round(qty),
            reservedQuantity: 0,
          });
        }

        return { output, lot };
      });

      res.status(201).json({
        message: "Üretim kaydedildi",
        output: result.output,
        lot: result.lot,
      });
    } catch (error: any) {
      if (error.message?.startsWith('INSUFFICIENT_SEMI:')) {
        return res.status(400).json({ message: error.message.replace('INSUFFICIENT_SEMI: ', '') });
      }
      console.error("Quick complete error:", error);
      res.status(500).json({ message: "Üretim kaydedilemedi: " + error.message });
    }
  });

  router.post("/api/factory/kiosk/quick-end", isKioskAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;

      const [activeSession] = await db.select().from(factoryShiftSessions)
        .where(and(
          eq(factoryShiftSessions.userId, userId),
          eq(factoryShiftSessions.status, 'active')
        ));

      if (!activeSession) {
        return res.status(400).json({ message: "Aktif vardiya bulunamadı" });
      }

      const outputAgg = await db.select({
        totalCount: count(),
        totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
        totalWaste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
      }).from(factoryProductionOutputs)
        .where(eq(factoryProductionOutputs.sessionId, activeSession.id));

      const checkOutTime = new Date();
      const workMinutes = Math.round((checkOutTime.getTime() - new Date(activeSession.checkInTime).getTime()) / 60000);
      const totalProduced = Math.round(parseFloat(outputAgg[0]?.totalProduced || '0'));
      const totalWaste = Math.round(parseFloat(outputAgg[0]?.totalWaste || '0'));

      await db.update(factoryShiftSessions)
        .set({
          status: 'completed',
          checkOutTime,
          totalProduced,
          totalWaste,
          workMinutes: Math.max(0, workMinutes),
        })
        .where(eq(factoryShiftSessions.id, activeSession.id));

      res.json({
        message: "Vardiya sonlandırıldı",
        sessionId: activeSession.id,
        totalOutputs: outputAgg[0]?.totalCount || 0,
        totalProduced,
        totalWaste,
        workMinutes: Math.max(0, workMinutes),
      });
    } catch (error: any) {
      console.error("Quick end error:", error);
      res.status(500).json({ message: "Vardiya sonlandırılamadı: " + error.message });
    }
  });

  // ========================================
  // T004: TEST SEED DATA (Üretim + HACCP)
  // ========================================

  router.post("/api/factory/seed-test-data", isAuthenticated, async (req: any, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Seed data üretim ortamında kullanılamaz" });
      }
      const userRole = req.user?.role as UserRoleType;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Sadece admin seed data oluşturabilir" });
      }

      const products = await db.select().from(factoryProducts).limit(10);
      const stations = await db.select().from(factoryStations).limit(5);

      if (products.length === 0 || stations.length === 0) {
        return res.status(400).json({ message: "Önce fabrika ürün ve istasyon seed'i çalıştırın" });
      }

      const userId = req.user?.id;

      const [testSession] = await db.insert(factoryShiftSessions).values({
        userId,
        stationId: stations[0].id,
        status: 'completed',
        checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
        checkOutTime: new Date(),
      }).returning();

      const outputStatuses = ['pending', 'pending_engineer', 'approved', 'rejected', 'pending', 'approved', 'pending_engineer', 'approved'];
      const outputValues = [];
      for (let i = 0; i < Math.min(8, products.length); i++) {
        outputValues.push({
          sessionId: testSession.id,
          userId,
          stationId: stations[i % stations.length].id,
          productId: products[i].id,
          productName: products[i].name,
          producedQuantity: String(Math.floor(Math.random() * 50) + 10),
          producedUnit: products[i].unit || 'adet',
          wasteQuantity: String(Math.floor(Math.random() * 5)),
          wasteUnit: products[i].unit || 'adet',
          qualityStatus: outputStatuses[i],
          createdAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        });
      }
      const insertedOutputs = await db.insert(factoryProductionOutputs).values(outputValues).returning();

      const haccpValues = [
        { checkType: 'sicaklik', checkPoint: 'Depolama Buzdolabı A', measuredValue: '3.2', standardValue: '0-4°C', unit: '°C', result: 'pass' as const, checkedById: userId, notes: 'Normal sıcaklık aralığında' },
        { checkType: 'sicaklik', checkPoint: 'Pişirme Hattı B', measuredValue: '72.5', standardValue: '72°C min', unit: '°C', result: 'pass' as const, checkedById: userId, notes: 'Pişirme sıcaklığı uygun' },
        { checkType: 'temizlik', checkPoint: 'Üretim Tezgahı C', measuredValue: 'Uygun Değil', standardValue: 'Temiz', unit: 'gözlem', result: 'fail' as const, checkedById: userId, notes: 'Temizlik yetersiz, yeniden temizlenmeli' },
        { checkType: 'sicaklik', checkPoint: 'Soğuk Zincir Aracı', measuredValue: '5.8', standardValue: '0-4°C', unit: '°C', result: 'warning' as const, checkedById: userId, notes: 'Sıcaklık sınırda, izlemeye alındı' },
        { checkType: 'nem', checkPoint: 'Hammadde Deposu', measuredValue: '55', standardValue: '40-60%', unit: '%RH', result: 'pass' as const, checkedById: userId, notes: 'Nem değeri uygun' },
      ];
      const insertedHaccp = await db.insert(haccpCheckRecords).values(haccpValues).returning();

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const lotValues = [];
      for (let i = 0; i < Math.min(5, products.length); i++) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (i < 2 ? 5 : 30));
        lotValues.push({
          lotNumber: `LOT-${dateStr}-T${String(i + 1).padStart(2, '0')}`,
          productId: products[i].id,
          quantity: String(Math.floor(Math.random() * 100) + 20),
          unit: products[i].unit || 'adet',
          producedBy: userId,
          stationId: stations[i % stations.length].id,
          status: ['uretildi', 'kalite_bekliyor', 'onaylandi', 'sevk_edildi', 'uretildi'][i],
          expiryDate,
          notes: `Test LOT #${i + 1}`,
        });
      }
      const insertedLots = await db.insert(productionLots).values(lotValues).returning();

      res.json({
        message: "Test seed data başarıyla oluşturuldu",
        session: testSession.id,
        outputs: insertedOutputs.length,
        haccpRecords: insertedHaccp.length,
        lots: insertedLots.length,
      });
    } catch (error: any) {
      console.error("Test seed error:", error);
      res.status(500).json({ message: "Test seed data oluşturulamadı: " + error.message });
    }
  });

export default router;
