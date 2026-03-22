import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  hasPermission,
  isHQRole,
  isBranchRole,
  type UserRoleType,
  equipment,
  equipmentFaults,
  equipmentCalibrations,
  equipmentCatalog,
  equipmentServiceRequests,
  maintenanceLogs,
  faultServiceTracking,
  branches,
  users,
  insertEquipmentCalibrationSchema,
  insertEquipmentTroubleshootingStepSchema,
  insertEquipmentCatalogSchema,
} from "@shared/schema";
import { generateEquipmentKnowledgeFromManual, researchEquipmentTroubleshooting, generateBulkEquipmentKnowledge } from "../ai";
import { auditLog } from "../audit";
import { handleApiError } from "./helpers";

class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

function ensurePermission(user: any, module: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, module, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${module} ${action} yetkiniz yok`);
  }
}

function assertBranchScope(user: Express.User): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

const responseCache = new Map<string, { data: any; expiresAt: number }>();
const getCachedResponse = (key: string) => {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
};
const setCachedResponse = (key: string, data: unknown, ttlSeconds: number = 60) => {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
};
const invalidateCache = (pattern: string) => {
  const keysToDelete: string[] = [];
  responseCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => responseCache.delete(key));
};

const router = Router();

  // Equipment routes
  router.get('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const requestedBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      
      ensurePermission(user, 'equipment', 'view');
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube ataması yapılmamış" });
        }
        if (requestedBranchId && requestedBranchId !== user.branchId) {
          return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
        }
        const cacheKey = `equipment-branch-${user.branchId}`;
        const cached = getCachedResponse(cacheKey);
        if (cached) return res.json(cached);
        
        const equipmentList = await storage.getEquipment(user.branchId);
        setCachedResponse(cacheKey, equipmentList, 30);
        return res.json(equipmentList);
      }
      
      const cacheKey = `equipment-${requestedBranchId || 'all'}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) return res.json(cached);
      
      const equipmentList = await storage.getEquipment(requestedBranchId);
      setCachedResponse(cacheKey, equipmentList, 30);
      res.json(equipmentList);
    } catch (error: unknown) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Ekipman listesi alınırken hata oluştu" });
    }
  });

  router.get('/api/equipment/critical', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      ensurePermission(user, 'equipment', 'view');
      
      const cacheKey = user.branchId ? `critical-equipment-${user.branchId}` : 'critical-equipment-all';
      const cached = getCachedResponse(cacheKey);
      if (cached) return res.json(cached);
      
      const allEquipment = await storage.getEquipment();
      
      const criticalEquipment = allEquipment.filter((item) => (item.healthScore ?? 100) < 50);
      
      if (user.role && isBranchRole(user.role as UserRoleType) && user.branchId) {
        const filtered = criticalEquipment.filter((item) => item.branchId === user.branchId);
        setCachedResponse(cacheKey, filtered, 30);
        return res.json(filtered);
      }
      
      setCachedResponse(cacheKey, criticalEquipment, 30);
      res.json(criticalEquipment);
    } catch (error: unknown) {
      console.error("Error fetching critical equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Kritik ekipman listesi alınırken hata oluştu" });
    }
  });

  router.get('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      ensurePermission(user, 'equipment', 'view');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }

      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || equipmentItem.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmana erişim yetkiniz yok" });
        }
      }

      const [maintenanceLogsList, faults, comments] = await Promise.all([
        storage.getEquipmentMaintenanceLogs(id),
        storage.getFaults(equipmentItem.branchId),
        storage.getEquipmentComments(id)
      ]);

      const equipmentFaultsList = faults.filter(f => f.equipmentId === id);

      res.json({
        ...equipmentItem,
        maintenanceLogs: maintenanceLogsList,
        faults: equipmentFaultsList,
        comments
      });
    } catch (error: unknown) {
      console.error("Error fetching equipment:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Ekipman bilgisi alınırken hata oluştu" });
    }
  });

  router.post('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      let equipmentBranchId = validatedData.branchId;
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        equipmentBranchId = branchId;
      }
      
      const equipmentItem = await storage.createEquipment({
        ...validatedData,
        branchId: equipmentBranchId,
        qrCodeUrl: null,
      });
      
      const { generateEquipmentQR } = await import('../ai');
      const qrCodeUrl = await generateEquipmentQR(equipmentItem.id);
      await storage.updateEquipment(equipmentItem.id, { qrCodeUrl });
      
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      auditLog(req, { eventType: "equipment.created", action: "created", resource: "equipment", resourceId: String(equipmentItem.id), after: { name: validatedData.name, branchId: equipmentBranchId } });
      res.json({ ...equipmentItem, qrCodeUrl });
    } catch (error: unknown) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Ekipman oluşturulurken hata oluştu" });
    }
  });

  router.put('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { insertEquipmentSchema } = await import('@shared/schema');
      const validatedData = insertEquipmentSchema.partial().parse(req.body);
      
      const existingEquipment = await storage.getEquipmentById(id);
      if (!existingEquipment) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        if (!user.branchId || existingEquipment.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu ekipmanı düzenleme yetkiniz yok" });
        }
        if (validatedData.branchId && validatedData.branchId !== user.branchId) {
          return res.status(403).json({ message: "Ekipmanın şubesini değiştiremezsiniz" });
        }
      }
      
      if (!existingEquipment.qrCodeUrl) {
        const { generateEquipmentQR } = await import('../ai');
        validatedData.qrCodeUrl = await generateEquipmentQR(id);
      }
      
      const equipmentItem = await storage.updateEquipment(id, validatedData);
      
      invalidateCache('equipment');
      invalidateCache('critical-equipment');
      
      auditLog(req, { eventType: "equipment.updated", action: "updated", resource: "equipment", resourceId: String(id), before: { name: existingEquipment.name, status: existingEquipment.status }, after: validatedData });
      res.json(equipmentItem);
    } catch (error: unknown) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Ekipman güncellenirken hata oluştu" });
    }
  });

  router.post('/api/equipment/generate-qr-bulk', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!user.role || !isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Sadece HQ yetkilileri toplu QR oluşturabilir" });
      }
      
      const allEquipment = await storage.getEquipment();
      
      const { generateEquipmentQR } = await import('../ai');
      let successCount = 0;
      
      for (const item of allEquipment) {
        try {
          const qrCodeUrl = await generateEquipmentQR(item.id);
          await storage.updateEquipment(item.id, { qrCodeUrl });
          successCount++;
        } catch (error: unknown) {
          console.error(`QR generation failed for equipment ${item.id}:`, error);
        }
      }
      
      res.json({ 
        message: `${successCount} ekipman için QR kodu yenilendi`,
        generated: successCount,
        total: allEquipment.length
      });
    } catch (error: unknown) {
      console.error("Bulk QR generation error:", error);
      res.status(500).json({ message: "QR kod oluşturma başarısız" });
    }
  });

  router.post('/api/equipment/:id/maintenance', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentMaintenanceLogSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için bakım kaydı oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentMaintenanceLogSchema.parse(req.body);
      const maintenanceLog = await storage.createEquipmentMaintenanceLog({
        ...validatedData,
        equipmentId: id,
        performedBy: userId,
      });

      const intervalDays = equipmentItem.maintenanceIntervalDays || 30;
      await storage.logMaintenance(id, intervalDays);
      
      res.json(maintenanceLog);
    } catch (error: unknown) {
      console.error("Error logging maintenance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz bakım kaydı verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Bakım kaydı oluşturulurken hata oluştu" });
    }
  });

  router.post('/api/equipment/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentCommentSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için yorum oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentCommentSchema.parse(req.body);
      const comment = await storage.createEquipmentComment({
        ...validatedData,
        equipmentId: id,
        userId,
      });
      res.json(comment);
    } catch (error: unknown) {
      console.error("Error creating equipment comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz yorum verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Yorum oluşturulurken hata oluştu" });
    }
  });

  // Equipment Service Request routes
  router.get('/api/equipment/:id/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis taleplerini görüntüleme yetkiniz yok" });
        }
      }
      
      const serviceRequests = await storage.listServiceRequests(id);
      res.json(serviceRequests);
    } catch (error: unknown) {
      console.error("Error fetching service requests:", error);
      res.status(500).json({ message: "Servis talepleri alınırken hata oluştu" });
    }
  });

  router.post('/api/equipment/:id/service-requests', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { insertEquipmentServiceRequestSchema } = await import('@shared/schema');
      
      const equipmentItem = await storage.getEquipmentById(id);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu ekipman için servis talebi oluşturma yetkiniz yok" });
        }
      }
      
      const validatedData = insertEquipmentServiceRequestSchema.parse(req.body);
      const serviceRequest = await storage.createServiceRequest({
        ...validatedData,
        equipmentId: id,
        createdById: userId,
      });
      auditLog(req, { eventType: "equipment.fault_created", action: "created", resource: "service_requests", resourceId: String(serviceRequest.id), after: { equipmentId: id, type: validatedData.requestType } });
      res.json(serviceRequest);
    } catch (error: unknown) {
      console.error("Error creating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz servis talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Servis talebi oluşturulurken hata oluştu" });
    }
  });

  router.get('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Servis talebi bulunamadı" });
      }
      
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini görüntüleme yetkiniz yok" });
        }
      }
      
      res.json(serviceRequest);
    } catch (error: unknown) {
      console.error("Error fetching service request:", error);
      res.status(500).json({ message: "Servis talebi alınırken hata oluştu" });
    }
  });

  router.patch('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Servis talebi bulunamadı" });
      }
      
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequest(id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating service request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz servis talebi verisi", errors: error.errors });
      }
      res.status(500).json({ message: "Servis talebi güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/equipment/service-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Servis talebi bulunamadı" });
      }
      
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebini silme yetkiniz yok" });
        }
      }
      
      await storage.deleteServiceRequest(id);
      res.json({ message: "Servis talebi başarıyla silindi" });
    } catch (error: unknown) {
      console.error("Error deleting service request:", error);
      res.status(500).json({ message: "Servis talebi silinirken hata oluştu" });
    }
  });

  router.patch('/api/equipment/service-requests/:id/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { newStatus, notes } = req.body;
      
      if (!newStatus) {
        return res.status(400).json({ message: "Yeni durum değeri gereklidir" });
      }
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Servis talebi bulunamadı" });
      }
      
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebinin durumunu güncelleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateServiceRequestStatus(id, newStatus, userId, notes);
      auditLog(req, { eventType: newStatus === "resolved" ? "equipment.fault_resolved" : "equipment.fault_created", action: newStatus === "resolved" ? "resolved" : "status_changed", resource: "service_requests", resourceId: String(id), before: { status: serviceRequest.status }, after: { status: newStatus }, details: { equipmentId: serviceRequest.equipmentId, notes } });
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating service request status:", error);
      if (error.message?.includes("Invalid status transition")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Servis talebi durumu güncellenirken hata oluştu" });
    }
  });

  router.post('/api/equipment/service-requests/:id/timeline', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { notes, meta } = req.body;
      
      const serviceRequest = await storage.getServiceRequest(id);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Servis talebi bulunamadı" });
      }
      
      const equipmentItem = await storage.getEquipmentById(serviceRequest.equipmentId);
      if (!equipmentItem) {
        return res.status(404).json({ message: "Ekipman bulunamadı" });
      }
      
      if (user.role && isBranchRole(user.role as UserRoleType)) {
        const branchId = assertBranchScope(user);
        if (equipmentItem.branchId !== branchId) {
          return res.status(403).json({ message: "Bu servis talebine not ekleme yetkiniz yok" });
        }
      }
      
      const updated = await storage.appendTimelineEntry(id, {
        timestamp: new Date().toISOString(),
        status: serviceRequest.status,
        actorId: userId,
        notes: notes || '',
        meta: meta || {},
      });
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error adding timeline entry:", error);
      res.status(500).json({ message: "Zaman çizelgesi kaydı eklenirken hata oluştu" });
    }
  });

  // ========================================
  // EQUIPMENT CATALOG CRUD APIs
  // ========================================

  router.get('/api/equipment-catalog', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const search = (req.query.search as string || '').trim().toLowerCase();
      const typeFilter = req.query.equipmentType as string | undefined;

      let conditions = [eq(equipmentCatalog.isActive, true)];
      if (typeFilter) {
        conditions.push(eq(equipmentCatalog.equipmentType, typeFilter));
      }

      let query = db.select().from(equipmentCatalog).where(and(...conditions)).orderBy(desc(equipmentCatalog.createdAt));
      const results = await query;

      if (search) {
        const filtered = results.filter(item =>
          item.name.toLowerCase().includes(search) ||
          item.equipmentType.toLowerCase().includes(search) ||
          (item.brand && item.brand.toLowerCase().includes(search)) ||
          (item.model && item.model.toLowerCase().includes(search))
        );
        return res.json(filtered);
      }

      res.json(results);
    } catch (error: unknown) {
      console.error("Error fetching equipment catalog:", error);
      res.status(500).json({ message: "Ekipman kataloğu yüklenirken hata oluştu" });
    }
  });

  router.get('/api/equipment-catalog/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const [item] = await db.select().from(equipmentCatalog).where(eq(equipmentCatalog.id, id));
      if (!item) return res.status(404).json({ message: "Katalog öğesi bulunamadı" });

      res.json(item);
    } catch (error: unknown) {
      console.error("Error fetching catalog item:", error);
      res.status(500).json({ message: "Katalog öğesi yüklenirken hata oluştu" });
    }
  });

  router.post('/api/equipment-catalog', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const parsed = insertEquipmentCatalogSchema.parse({
        ...req.body,
        createdById: user.id,
      });

      const [created] = await db.insert(equipmentCatalog).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error creating catalog item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Katalog öğesi oluşturulurken hata oluştu" });
    }
  });

  router.put('/api/equipment-catalog/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const [existing] = await db.select().from(equipmentCatalog).where(eq(equipmentCatalog.id, id));
      if (!existing) return res.status(404).json({ message: "Katalog öğesi bulunamadı" });

      const allowedFields = [
        'name', 'brand', 'model', 'equipmentType', 'category', 'description',
        'imageUrl', 'specifications', 'usageGuide', 'troubleshootingGuide',
        'calibrationProcedure', 'maintenanceIntervalDays', 'defaultServiceProviderName',
        'defaultServiceProviderPhone', 'defaultServiceProviderEmail', 'defaultServiceProviderAddress',
        'warrantyDurationMonths', 'faultProtocol', 'isActive',
      ];
      const sanitized: Record<string, any> = {};
      for (const key of allowedFields) {
        if (key in req.body) sanitized[key] = req.body[key];
      }
      sanitized.updatedAt = new Date();

      const [updated] = await db.update(equipmentCatalog)
        .set(sanitized)
        .where(eq(equipmentCatalog.id, id))
        .returning();

      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating catalog item:", error);
      res.status(500).json({ message: "Katalog öğesi güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/equipment-catalog/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

      const [updated] = await db.update(equipmentCatalog)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(equipmentCatalog.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Katalog öğesi bulunamadı" });

      res.json({ message: "Katalog öğesi devre dışı bırakıldı", item: updated });
    } catch (error: unknown) {
      console.error("Error deleting catalog item:", error);
      res.status(500).json({ message: "Katalog öğesi silinirken hata oluştu" });
    }
  });

  router.post('/api/equipment-catalog/:id/assign-to-branch', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
      }

      const catalogId = parseInt(req.params.id);
      if (isNaN(catalogId)) return res.status(400).json({ message: "Geçersiz katalog ID" });

      const { branchId, serialNumber, notes, warrantyEndDate, purchaseDate } = req.body;
      if (!branchId) return res.status(400).json({ message: "Şube ID zorunludur" });

      const [catalogItem] = await db.select().from(equipmentCatalog).where(eq(equipmentCatalog.id, catalogId));
      if (!catalogItem) return res.status(404).json({ message: "Katalog öğesi bulunamadı" });

      const [branch] = await db.select().from(branches).where(eq(branches.id, parseInt(branchId)));
      if (!branch) return res.status(404).json({ message: "Şube bulunamadı" });

      const [created] = await db.insert(equipment).values({
        branchId: parseInt(branchId),
        catalogId: catalogId,
        equipmentType: catalogItem.equipmentType,
        modelNo: catalogItem.model || undefined,
        serialNumber: serialNumber || undefined,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        imageUrl: catalogItem.imageUrl || undefined,
        maintenanceIntervalDays: catalogItem.maintenanceIntervalDays || 30,
        serviceContactName: catalogItem.defaultServiceProviderName || undefined,
        serviceContactPhone: catalogItem.defaultServiceProviderPhone || undefined,
        serviceContactEmail: catalogItem.defaultServiceProviderEmail || undefined,
        serviceContactAddress: catalogItem.defaultServiceProviderAddress || undefined,
        notes: notes || undefined,
      }).returning();

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error("Error assigning catalog item to branch:", error);
      res.status(500).json({ message: "Ekipman şubeye atanırken hata oluştu" });
    }
  });

  router.get('/api/equipment/:id/timeline', isAuthenticated, async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      if (isNaN(equipmentId)) return res.status(400).json({ message: "Geçersiz ekipman ID" });

      const timeline: Array<{
        type: string;
        id: number;
        date: string;
        title: string;
        description?: string;
        status?: string;
        data?: any;
      }> = [];

      const faults = await db.select().from(equipmentFaults)
        .where(eq(equipmentFaults.equipmentId, equipmentId));
      for (const f of faults) {
        timeline.push({
          type: 'fault',
          id: f.id,
          date: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
          title: `Arıza: ${f.description?.substring(0, 80) || 'Tanımsız'}`,
          description: f.description || undefined,
          status: f.status || undefined,
          data: f,
        });
      }

      const maintenance = await db.select().from(maintenanceLogs)
        .where(eq(maintenanceLogs.equipmentId, equipmentId));
      for (const m of maintenance) {
        timeline.push({
          type: 'maintenance',
          id: m.id,
          date: m.performedDate ? m.performedDate.toISOString() : (m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()),
          title: `Bakım: ${m.workDescription?.substring(0, 80) || 'Bakım yapıldı'}`,
          description: m.workDescription || undefined,
          status: m.maintenanceType || undefined,
          data: m,
        });
      }

      const serviceReqs = await db.select().from(equipmentServiceRequests)
        .where(eq(equipmentServiceRequests.equipmentId, equipmentId));
      for (const s of serviceReqs) {
        timeline.push({
          type: 'service_request',
          id: s.id,
          date: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
          title: `Servis Talebi: ${s.serviceProvider || 'Servis talebi'}`,
          description: s.notes || undefined,
          status: s.status || undefined,
          data: s,
        });
      }

      const calibrations = await db.select().from(equipmentCalibrations)
        .where(eq(equipmentCalibrations.equipmentId, equipmentId));
      for (const c of calibrations) {
        timeline.push({
          type: 'calibration',
          id: c.id,
          date: c.calibrationDate ? c.calibrationDate.toISOString() : (c.createdAt ? c.createdAt.toISOString() : new Date().toISOString()),
          title: `Kalibrasyon: ${c.calibrationType || 'Kalibrasyon'}`,
          description: c.notes || undefined,
          status: c.result || undefined,
          data: c,
        });
      }

      const serviceTracking = await db.select().from(faultServiceTracking)
        .where(eq(faultServiceTracking.equipmentId, equipmentId));
      for (const st of serviceTracking) {
        timeline.push({
          type: 'service_tracking',
          id: st.id,
          date: st.createdAt ? st.createdAt.toISOString() : new Date().toISOString(),
          title: `Servis Takip: ${st.serviceProviderName || 'Servis'}`,
          description: `Durum: ${st.currentStatus}`,
          status: st.currentStatus || undefined,
          data: st,
        });
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json(timeline);
    } catch (error: unknown) {
      console.error("Error fetching equipment timeline:", error);
      res.status(500).json({ message: "Ekipman zaman çizelgesi yüklenirken hata oluştu" });
    }
  });

  // Equipment Knowledge by equipment type (for all authenticated users)
  router.get('/api/equipment-knowledge/by-equipment', isAuthenticated, async (req, res) => {
    try {
      const { type, brand, model } = req.query;
      
      if (!type) {
        return res.status(400).json({ message: "Ekipman tipi zorunludur" });
      }
      
      const allKnowledge = await storage.getEquipmentKnowledge();
      
      const EQUIPMENT_TYPE_MAP: Record<string, string> = {
        'espresso': 'espresso_machine',
        'grinder': 'grinder',
        'cappuccino': 'espresso_machine',
        'water_filter': 'water_filter',
        'kiosk': 'pos',
        'pos': 'pos',
        'tea': 'general',
        'ice': 'ice_machine',
        'refrigerator': 'refrigerator',
        'dishwasher': 'dishwasher',
        'oven': 'oven',
        'blender': 'blender',
      };
      
      const knowledgeType = EQUIPMENT_TYPE_MAP[type as string] || type;
      
      let filtered = allKnowledge.filter(k => k.isActive && k.equipmentType === knowledgeType);
      
      if (brand && model) {
        const exactMatch = filtered.filter(k => 
          k.brand && k.brand.toLowerCase() === (brand as string).toLowerCase() &&
          k.model && k.model.toLowerCase() === (model as string).toLowerCase()
        );
        if (exactMatch.length > 0) {
          filtered = exactMatch;
        } else {
          const brandMatch = filtered.filter(k => 
            k.brand && k.brand.toLowerCase() === (brand as string).toLowerCase()
          );
          if (brandMatch.length > 0) {
            filtered = brandMatch;
          }
        }
      } else if (brand) {
        const brandMatch = filtered.filter(k => 
          k.brand && k.brand.toLowerCase() === (brand as string).toLowerCase()
        );
        if (brandMatch.length > 0) {
          filtered = brandMatch;
        }
      }
      
      filtered.sort((a, b) => b.priority - a.priority);
      
      res.json(filtered);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchEquipmentKnowledgeByType");
    }
  });


  // Equipment Knowledge CRUD (Admin only)
  router.get('/api/equipment-knowledge', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu sayfa sadece admin kullanıcıları içindir" });
      }
      const items = await storage.getEquipmentKnowledge();
      res.json(items);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchEquipmentKnowledge");
    }
  });

  router.post('/api/equipment-knowledge', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }
      const { equipmentType, brand, model, category, title, content, keywords, priority, isActive } = req.body;
      
      if (!equipmentType || !title || !content) {
        return res.status(400).json({ message: "Ekipman tipi, başlık ve içerik zorunludur" });
      }

      const item = await storage.createEquipmentKnowledge({
        equipmentType,
        brand: brand || null,
        model: model || null,
        category: category || 'maintenance',
        title,
        content,
        keywords: keywords || [],
        priority: priority || 1,
        isActive: isActive !== false,
      });
      res.json(item);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateEquipmentKnowledge");
    }
  });

  router.patch('/api/equipment-knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const item = await storage.updateEquipmentKnowledge(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Bilgi bulunamadı" });
      }
      res.json(item);
    } catch (error: unknown) {
      handleApiError(res, error, "UpdateEquipmentKnowledge");
    }
  });

  router.delete('/api/equipment-knowledge/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteEquipmentKnowledge(id);
      res.json({ success: true });
    } catch (error: unknown) {
      handleApiError(res, error, "DeleteEquipmentKnowledge");
    }
  });

  // AI Equipment Knowledge Generator from Manual
  router.post('/api/equipment-knowledge/generate-from-manual', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }
      
      const { manualText, equipmentType, brand, model } = req.body;
      
      if (!manualText || typeof manualText !== 'string' || manualText.trim().length < 50) {
        return res.status(400).json({ message: "Kılavuz metni en az 50 karakter olmalıdır" });
      }
      
      if (!equipmentType) {
        return res.status(400).json({ message: "Ekipman tipi zorunludur" });
      }
      
      const result = await generateEquipmentKnowledgeFromManual(
        manualText.trim(),
        equipmentType,
        brand || undefined,
        model || undefined,
        user.id
      );
      
      res.json(result);
    } catch (error: unknown) {
      handleApiError(res, error, "GenerateEquipmentKnowledge");
    }
  });

  // Auto-research equipment troubleshooting from AI knowledge
  router.post('/api/equipment-knowledge/auto-research', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }
      
      const { equipmentType, brand, model } = req.body;
      
      if (!brand || typeof brand !== 'string' || brand.trim().length < 2) {
        return res.status(400).json({ message: "Marka adı en az 2 karakter olmalıdır" });
      }
      
      if (!model || typeof model !== 'string' || model.trim().length < 1) {
        return res.status(400).json({ message: "Model adı zorunludur" });
      }
      
      if (!equipmentType) {
        return res.status(400).json({ message: "Ekipman tipi zorunludur" });
      }
      
      const result = await researchEquipmentTroubleshooting(
        equipmentType,
        brand.trim(),
        model.trim(),
        user.id
      );
      
      res.json(result);
    } catch (error: unknown) {
      handleApiError(res, error, "ResearchEquipment");
    }
  });

  router.post('/api/equipment-knowledge/bulk-generate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }

      const { types } = req.body;

      if (!types || !Array.isArray(types) || types.length === 0) {
        return res.status(400).json({ message: "En az bir ekipman tipi gereklidir" });
      }

      const knowledge = await storage.getEquipmentKnowledge();
      const coveredTypes = new Set(knowledge.map(k => k.equipmentType));

      const typeMapping: Record<string, string> = {
        'espresso': 'espresso_machine',
        'grinder': 'grinder',
        'cappuccino': 'espresso_machine',
        'water_filter': 'water_filter',
        'kiosk': 'pos',
        'pos': 'pos',
        'tea': 'general',
        'ice': 'ice_machine',
        'ice_machine': 'ice_machine',
        'refrigerator': 'refrigerator',
        'dishwasher': 'dishwasher',
        'oven': 'oven',
        'blender': 'blender',
        'cash': 'pos',
        'mixer': 'blender',
        'krema': 'espresso_machine',
        'general': 'general',
      };

      const uniqueTypes = Array.from(new Set(types.map((t: string) => typeMapping[t] || t)));
      const missingTypes = uniqueTypes.filter(t => !coveredTypes.has(t));

      if (missingTypes.length === 0) {
        return res.json({ 
          message: "Tüm ekipman tipleri zaten bilgi tabanında mevcut",
          generated: 0,
          total: 0,
          results: []
        });
      }

      const results: Array<{ type: string; itemCount: number; error?: string }> = [];

      for (const eqType of missingTypes) {
        try {
          const result = await generateBulkEquipmentKnowledge(eqType, user.id);

          for (const item of result.items) {
            await storage.createEquipmentKnowledge({
              equipmentType: eqType,
              brand: null,
              model: null,
              category: item.category,
              title: item.title,
              content: item.content,
              keywords: item.keywords,
              priority: 1,
              isActive: true,
            });
          }

          results.push({ type: eqType, itemCount: result.items.length });
        } catch (error: unknown) {
          console.error(`Bulk generate failed for type ${eqType}:`, error);
          results.push({ type: eqType, itemCount: 0, error: error.message });
        }
      }

      const totalGenerated = results.reduce((sum, r) => sum + r.itemCount, 0);

      res.json({
        message: `${totalGenerated} bilgi kaydı oluşturuldu (${results.filter(r => r.itemCount > 0).length} tip)`,
        generated: totalGenerated,
        total: missingTypes.length,
        results
      });
    } catch (error: unknown) {
      handleApiError(res, error, "BulkGenerateKnowledge");
    }
  });

  // Check for missing equipment knowledge
  router.get('/api/equipment-knowledge/missing', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Bu işlem sadece admin kullanıcıları içindir" });
      }

      const allEquipment = await storage.getEquipment();
      
      const knowledge = await storage.getEquipmentKnowledge();
      
      const knowledgeSet = new Set<string>();
      knowledge.forEach(k => {
        const key = `${k.equipmentType}|${k.brand || ''}|${k.model || ''}`.toLowerCase();
        knowledgeSet.add(key);
        knowledgeSet.add(`${k.equipmentType}||`.toLowerCase());
      });

      const typeMapping: Record<string, string> = {
        'espresso': 'espresso_machine',
        'grinder': 'grinder',
        'cappuccino': 'espresso_machine',
        'water_filter': 'water_filter',
        'kiosk': 'pos',
        'tea': 'general',
        'ice': 'ice_machine',
        'refrigerator': 'refrigerator',
        'dishwasher': 'dishwasher',
        'oven': 'oven',
        'blender': 'blender',
      };

      const missingKnowledge = allEquipment.filter(eq => {
        const mappedType = typeMapping[eq.type || ''] || eq.type || 'general';
        const specificKey = `${mappedType}|${eq.brand || ''}|${eq.model || ''}`.toLowerCase();
        const typeOnlyKey = `${mappedType}||`.toLowerCase();
        return !knowledgeSet.has(specificKey) && !knowledgeSet.has(typeOnlyKey);
      });

      const groupedMissing: Record<string, { type: string; brand: string | null; model: string | null; count: number; equipmentIds: number[] }> = {};
      
      missingKnowledge.forEach(eq => {
        const key = `${eq.type}|${eq.brand || ''}|${eq.model || ''}`;
        if (!groupedMissing[key]) {
          groupedMissing[key] = {
            type: eq.type || 'unknown',
            brand: eq.brand || null,
            model: eq.model || null,
            count: 0,
            equipmentIds: []
          };
        }
        groupedMissing[key].count++;
        groupedMissing[key].equipmentIds.push(eq.id);
      });

      res.json({
        totalEquipment: allEquipment.length,
        missingKnowledgeCount: missingKnowledge.length,
        groups: Object.values(groupedMissing)
      });
    } catch (error: unknown) {
      handleApiError(res, error, "CheckMissingKnowledge");
    }
  });

  // ========================================
  // EQUIPMENT CALIBRATIONS CRUD APIs
  // ========================================

  router.get('/api/equipment-calibrations', isAuthenticated, async (req, res) => {
    try {
      const { equipmentId, result, upcoming } = req.query;
      
      let query = db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        calibratedBy: users,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(users, eq(equipmentCalibrations.calibratedById, users.id));
      
      const conditions = [];
      
      if (equipmentId) {
        conditions.push(eq(equipmentCalibrations.equipmentId, parseInt(equipmentId as string)));
      }
      
      if (result) {
        conditions.push(eq(equipmentCalibrations.result, result as string));
      }
      
      if (upcoming === 'true') {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        conditions.push(sql`${equipmentCalibrations.nextCalibrationDue} <= ${thirtyDaysLater.toISOString().split('T')[0]}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const calibrations = await query.orderBy(desc(equipmentCalibrations.calibrationDate));
      
      res.json(calibrations.map(c => ({
        ...c.calibration,
        equipment: c.equipment,
        calibratedBy: c.calibratedBy,
      })));
    } catch (error: unknown) {
      console.error("Error fetching calibrations:", error);
      res.status(500).json({ message: "Kalibrasyon kayıtları yüklenirken hata oluştu" });
    }
  });

  router.get('/api/equipment-calibrations/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [calibration] = await db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        calibratedBy: users,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(users, eq(equipmentCalibrations.calibratedById, users.id))
        .where(eq(equipmentCalibrations.id, parseInt(id)));
      
      if (!calibration) {
        return res.status(404).json({ message: "Kalibrasyon kaydı bulunamadı" });
      }
      
      res.json({
        ...calibration.calibration,
        equipment: calibration.equipment,
        calibratedBy: calibration.calibratedBy,
      });
    } catch (error: unknown) {
      console.error("Error fetching calibration:", error);
      res.status(500).json({ message: "Kalibrasyon kaydı yüklenirken hata oluştu" });
    }
  });

  router.post('/api/equipment-calibrations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon kaydı oluşturma yetkisi gerekli" });
      }
      
      const validatedData = insertEquipmentCalibrationSchema.parse({
        ...req.body,
        calibrationDate: new Date(req.body.calibrationDate),
      });
      
      const [calibration] = await db.insert(equipmentCalibrations).values({
        ...validatedData,
        createdById: user.id,
      }).returning();
      
      await db.update(equipment)
        .set({ updatedAt: new Date() })
        .where(eq(equipment.id, validatedData.equipmentId));
      
      res.status(201).json(calibration);
    } catch (error: unknown) {
      console.error("Error creating calibration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Kalibrasyon kaydı oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/equipment-calibrations/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon güncelleme yetkisi gerekli" });
      }
      
      const [existing] = await db.select().from(equipmentCalibrations).where(eq(equipmentCalibrations.id, parseInt(id)));
      if (!existing) {
        return res.status(404).json({ message: "Kalibrasyon kaydı bulunamadı" });
      }
      
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.calibrationDate) {
        updateData.calibrationDate = new Date(updateData.calibrationDate);
      }
      
      const [updated] = await db.update(equipmentCalibrations)
        .set(updateData)
        .where(eq(equipmentCalibrations.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating calibration:", error);
      res.status(500).json({ message: "Kalibrasyon güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/equipment-calibrations/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      if (!isHQRole(user.role as UserRoleType) && user.role !== 'admin') {
        return res.status(403).json({ message: "Kalibrasyon silme yetkisi gerekli" });
      }
      
      await db.delete(equipmentCalibrations).where(eq(equipmentCalibrations.id, parseInt(id)));
      
      res.json({ message: "Kalibrasyon kaydı silindi" });
    } catch (error: unknown) {
      console.error("Error deleting calibration:", error);
      res.status(500).json({ message: "Kalibrasyon silinirken hata oluştu" });
    }
  });

  router.get('/api/equipment-calibrations-due-soon', isAuthenticated, async (req, res) => {
    try {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      
      const dueSoon = await db.select({
        calibration: equipmentCalibrations,
        equipment: equipment,
        branch: branches,
      }).from(equipmentCalibrations)
        .leftJoin(equipment, eq(equipmentCalibrations.equipmentId, equipment.id))
        .leftJoin(branches, eq(equipment.branchId, branches.id))
        .where(sql`${equipmentCalibrations.nextCalibrationDue} <= ${thirtyDaysLater.toISOString().split('T')[0]}`)
        .orderBy(equipmentCalibrations.nextCalibrationDue);
      
      res.json(dueSoon.map(d => ({
        ...d.calibration,
        equipment: d.equipment,
        branch: d.branch,
      })));
    } catch (error: unknown) {
      console.error("Error fetching due calibrations:", error);
      res.status(500).json({ message: "Yaklaşan kalibrasyonlar yüklenirken hata oluştu" });
    }
  });

  // ========================================
  // EQUIPMENT TROUBLESHOOTING STEPS
  // ========================================

  router.get('/api/equipment-troubleshooting-steps', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { equipmentType } = req.query;
      
      ensurePermission(user, 'equipment', 'view', 'Sorun giderme adımlarını görüntülemek için yetkiniz yok');
      
      if (!equipmentType) {
        return res.status(400).json({ message: "Cihaz tipi gerekli" });
      }
      
      const steps = await storage.getEquipmentTroubleshootingSteps(equipmentType as string);
      res.json(steps);
    } catch (error: unknown) {
      console.error("Error fetching troubleshooting steps:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımları yüklenirken hata oluştu" });
    }
  });

  router.post('/api/equipment-troubleshooting-steps', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!isHQRole(user.role as UserRoleType)) {
        return res.status(403).json({ message: 'Sadece HQ/admin kullanıcıları sorun giderme adımı oluşturabilir' });
      }
      
      ensurePermission(user, 'equipment', 'create', 'Sorun giderme adımı oluşturmak için HQ Tech yetkisi gerekli');
      
      const validatedData = insertEquipmentTroubleshootingStepSchema.parse(req.body);
      
      const step = await storage.createEquipmentTroubleshootingStep(validatedData);
      res.status(201).json(step);
    } catch (error: unknown) {
      console.error("Error creating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı oluşturulurken hata oluştu" });
    }
  });

  router.patch('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'edit', 'Sorun giderme adımı güncellemek için HQ Tech yetkisi gerekli');
      
      const updateSchema = insertEquipmentTroubleshootingStepSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateEquipmentTroubleshootingStep(parseInt(id), validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Adım bulunamadı" });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
      }
      res.status(500).json({ message: "Sorun giderme adımı güncellenirken hata oluştu" });
    }
  });

  router.delete('/api/equipment-troubleshooting-steps/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      ensurePermission(user, 'equipment', 'delete', 'Sorun giderme adımı silmek için HQ Tech yetkisi gerekli');
      
      await storage.deleteEquipmentTroubleshootingStep(parseInt(id));
      res.json({ message: "Adım silindi" });
    } catch (error: unknown) {
      console.error("Error deleting troubleshooting step:", error);
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Sorun giderme adımı silinirken hata oluştu" });
    }
  });

export default router;
