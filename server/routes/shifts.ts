import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { isHQRole, isBranchRole, type UserRoleType } from "@shared/schema";
import {
  shifts,
  shiftCorrections,
  shiftAttendance,
  insertShiftAttendanceSchema,
  users,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { analyzeDressCodePhoto } from "../ai";

const router = Router();

// Haversine formula - iki nokta arasındaki mesafeyi metre cinsinden hesapla
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  const hh = String(parts[0] || '0').padStart(2, '0');
  const mm = String(parts[1] || '0').padStart(2, '0');
  return `${hh}:${mm}`;
};

// Update attendance record (check-out, break times)
router.patch('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    const existing = await storage.getShiftAttendance(id);
    if (!existing) {
      return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
    }
    
    // Authorization: Owner or supervisor can update
    if (!isHQRole(role)) {
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        // Regular employees can only update their own
        if (existing.userId !== user.id) {
          return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
        }
      } else {
        // Supervisors can update their branch
        const shift = await storage.getShift(existing.shiftId);
        if (shift?.branchId !== user.branchId) {
          return res.status(403).json({ message: "Bu yoklama kaydını güncelleme yetkiniz yok" });
        }
      }
    }
    
    // Validate partial update
    const validatedData = insertShiftAttendanceSchema.partial().parse(req.body);
    const reason = req.body.correctionReason || '';
    
    const updated = await storage.updateShiftAttendance(id, validatedData);

    if (existing.userId !== user.id) {
      const changedFields: string[] = [];
      const bodyKeys = Object.keys(req.body).filter(k => k !== 'correctionReason');
      for (const key of bodyKeys) {
        const oldVal = (existing as any)[key];
        const newVal = req.body[key];
        if (oldVal !== newVal) {
          changedFields.push(key);
          try {
            await db.insert(shiftCorrections).values({
              shiftId: existing.shiftId,
              correctedById: user.id,
              employeeId: existing.userId,
              correctionType: 'attendance_update',
              fieldChanged: key,
              oldValue: oldVal != null ? String(oldVal) : null,
              newValue: newVal != null ? String(newVal) : null,
              reason: reason || `Supervisor düzeltmesi: ${key}`,
              branchId: user.branchId,
            });
          } catch (e) {
            console.error("Error logging shift correction:", e);
          }
        }
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating attendance record:", error);
    if ((error as any).name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz yoklama verisi", errors: (error as any).errors });
    }
    res.status(500).json({ message: "Yoklama kaydı güncellenemedi" });
  }
});

// Delete attendance record (supervisor + HQ only)
router.delete('/api/shift-attendance/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    const existing = await storage.getShiftAttendance(id);
    if (!existing) {
      return res.status(404).json({ message: "Yoklama kaydı bulunamadı" });
    }
    
    // Authorization: Only supervisors and HQ can delete
    if (!isHQRole(role)) {
      if (role !== 'supervisor' && role !== 'supervisor_buddy') {
        return res.status(403).json({ message: "Yoklama kaydı silme yetkiniz yok" });
      }
      
      const shift = await storage.getShift(existing.shiftId);
      if (shift?.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu yoklama kaydını silme yetkiniz yok" });
      }
    }
    
    await storage.deleteShiftAttendance(id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting attendance record:", error);
    res.status(500).json({ message: "Yoklama kaydı silinemedi" });
  }
});

// ===== SHIFT TRADE REQUEST ENDPOINTS =====

// POST /api/shift-trades - Create a shift trade request
router.post('/api/shift-trades', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { insertShiftTradeRequestSchema } = await import('@shared/schema');
    
    const validatedData = insertShiftTradeRequestSchema.parse(req.body);
    
    const requesterShift = await storage.getShift(validatedData.requesterShiftId);
    if (!requesterShift) {
      return res.status(404).json({ message: "Talep eden vardiya bulunamadı" });
    }
    
    if (requesterShift.assignedToId !== validatedData.requesterId) {
      return res.status(403).json({ message: "Bu vardiya size atanmamış" });
    }
    
    if (validatedData.requesterId !== user.id) {
      return res.status(403).json({ message: "Yalnızca kendi vardiyalarınız için takas talebi oluşturabilirsiniz" });
    }
    
    const responderShift = await storage.getShift(validatedData.responderShiftId);
    if (!responderShift) {
      return res.status(404).json({ message: "Hedef vardiya bulunamadı" });
    }
    
    if (responderShift.assignedToId !== validatedData.responderId) {
      return res.status(400).json({ message: "Hedef çalışan bu vardiyaya atanmamış" });
    }
    
    if (validatedData.requesterShiftId === validatedData.responderShiftId) {
      return res.status(400).json({ message: "Aynı vardiya ile takas yapılamaz" });
    }
    
    const existingTrades = await storage.getShiftTradeRequests({
      userId: user.id,
      status: 'taslak'
    });
    
    const duplicate = existingTrades.find(
      trade => 
        (trade.requesterShiftId === validatedData.requesterShiftId && 
         trade.responderShiftId === validatedData.responderShiftId) ||
        (trade.requesterShiftId === validatedData.responderShiftId && 
         trade.responderShiftId === validatedData.requesterShiftId)
    );
    
    if (duplicate) {
      return res.status(400).json({ message: "Bu vardiyalar için zaten açık bir takas talebi var" });
    }
    
    const created = await storage.createShiftTradeRequest(validatedData);
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating shift trade request:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz takas talebi verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Takas talebi oluşturulamadı" });
  }
});

// GET /api/shift-trades - List shift trade requests with filters
router.get('/api/shift-trades', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const { branchId: queryBranchId, userId: queryUserId, status } = req.query;
    
    const filters: { branchId?: number; userId?: string; status?: string } = {};
    
    if (status) {
      filters.status = status as string;
    }
    
    if (isHQRole(role)) {
      if (queryBranchId) {
        filters.branchId = parseInt(queryBranchId as string);
      }
      if (queryUserId) {
        filters.userId = queryUserId as string;
      }
    } else if (role === 'supervisor' || role === 'supervisor_buddy' || role === 'coach' || role === 'admin') {
      filters.branchId = user.branchId!;
    } else {
      filters.userId = user.id;
    }
    
    const trades = await storage.getShiftTradeRequests(filters);
    res.json(trades);
  } catch (error: any) {
    console.error("Error fetching shift trade requests:", error);
    res.status(500).json({ message: "Takas talepleri alınamadı" });
  }
});

// PATCH /api/shift-trades/:id/respond - Responder confirms the trade
router.patch('/api/shift-trades/:id/respond', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    const trades = await storage.getShiftTradeRequests({ userId: user.id });
    const trade = trades.find(t => t.id === id);
    
    if (!trade) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (trade.responderId !== user.id) {
      return res.status(403).json({ message: "Bu takas talebini yalnızca hedef çalışan onaylayabilir" });
    }
    
    if (trade.status !== 'taslak') {
      return res.status(400).json({ message: "Bu takas talebi zaten işleme alınmış" });
    }
    
    await storage.respondToShiftTradeRequest(id, user.id);
    
    const updated = await storage.getShiftTradeRequests({ userId: user.id });
    const updatedTrade = updated.find(t => t.id === id);
    
    res.json(updatedTrade);
  } catch (error: any) {
    console.error("Error responding to shift trade request:", error);
    res.status(500).json({ message: "Takas talebi yanıtlanamadı" });
  }
});

// PATCH /api/shift-trades/:id/approve - Supervisor approves or rejects the trade
router.patch('/api/shift-trades/:id/approve', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
      return res.status(403).json({ message: "Takas taleplerini onaylama yetkiniz yok" });
    }
    
    const { z } = await import('zod');
    const approveSchema = z.object({
      approved: z.boolean(),
      notes: z.string().optional(),
    });
    
    const { approved, notes } = approveSchema.parse(req.body);
    
    const allTrades = await storage.getShiftTradeRequests({});
    const trade = allTrades.find(t => t.id === id);
    
    if (!trade) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (role === 'supervisor' || role === 'supervisor_buddy') {
      const requesterShift = await storage.getShift(trade.requesterShiftId);
      const responderShift = await storage.getShift(trade.responderShiftId);
      
      if (requesterShift?.branchId !== user.branchId && responderShift?.branchId !== user.branchId) {
        return res.status(403).json({ message: "Bu şubenin takas taleplerini onaylayabilirsiniz" });
      }
    }
    
    if (trade.status !== 'calisan_onayi') {
      return res.status(400).json({ message: "Bu takas talebi henüz çalışan tarafından onaylanmamış" });
    }
    
    await storage.approveShiftTradeRequest(id, user.id, approved, notes);
    
    const updatedTrades = await storage.getShiftTradeRequests({});
    const updatedTrade = updatedTrades.find(t => t.id === id);
    
    res.json(updatedTrade);
  } catch (error: any) {
    console.error("Error approving shift trade request:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz onay verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Takas talebi onaylanamadı" });
  }
});

// ===== SHIFT TEMPLATE ENDPOINTS =====

// GET /api/shift-templates - List shift templates
router.get('/api/shift-templates', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const { branchId: queryBranchId } = req.query;
    
    if (isHQRole(role)) {
      const branchId = queryBranchId ? parseInt(queryBranchId as string) : undefined;
      const templates = await storage.getShiftTemplates(branchId);
      return res.json(templates);
    }
    
    if (!user.branchId) {
      return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
    }
    
    const templates = await storage.getShiftTemplates(user.branchId);
    res.json(templates);
  } catch (error: any) {
    console.error("Error fetching shift templates:", error);
    res.status(500).json({ message: "Şablonlar getirilemedi" });
  }
});

// GET /api/shift-templates/:id - Get single shift template
router.get('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    const template = await storage.getShiftTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }
    
    if (!isHQRole(role) && template.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu şablonu görüntüleme yetkiniz yok" });
    }
    
    res.json(template);
  } catch (error: any) {
    console.error("Error fetching shift template:", error);
    res.status(500).json({ message: "Şablon getirilemedi" });
  }
});

// POST /api/shift-templates - Create shift template
router.post('/api/shift-templates', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
      return res.status(403).json({ message: "Şablon oluşturma yetkiniz yok" });
    }
    
    const { insertShiftTemplateSchema } = await import('@shared/schema');
    const validatedData = insertShiftTemplateSchema.parse(req.body);
    
    if (!isHQRole(role) && validatedData.branchId !== user.branchId) {
      return res.status(403).json({ message: "Başka şubeler için şablon oluşturamazsınız" });
    }
    
    const created = await storage.createShiftTemplate({
      ...validatedData,
      createdById: user.id,
    });
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating shift template:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Şablon oluşturulamadı" });
  }
});

// PATCH /api/shift-templates/:id - Update shift template
router.patch('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
      return res.status(403).json({ message: "Şablon güncelleme yetkiniz yok" });
    }
    
    const existing = await storage.getShiftTemplate(id);
    if (!existing) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }
    
    if (!isHQRole(role) && existing.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu şablonu güncelleme yetkiniz yok" });
    }
    
    const { insertShiftTemplateSchema } = await import('@shared/schema');
    const validatedData = insertShiftTemplateSchema.partial().parse(req.body);
    
    const updated = await storage.updateShiftTemplate(id, validatedData);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating shift template:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz şablon verisi", errors: error.errors });
    }
    res.status(500).json({ message: "Şablon güncellenemedi" });
  }
});

// DELETE /api/shift-templates/:id - Delete shift template
router.delete('/api/shift-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
      return res.status(403).json({ message: "Şablon silme yetkiniz yok" });
    }
    
    const existing = await storage.getShiftTemplate(id);
    if (!existing) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }
    
    if (!isHQRole(role) && existing.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu şablonu silme yetkiniz yok" });
    }
    
    await storage.deleteShiftTemplate(id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting shift template:", error);
    res.status(500).json({ message: "Şablon silinemedi" });
  }
});

// POST /api/shift-templates/:id/create-shifts - Create shifts from template
router.post('/api/shift-templates/:id/create-shifts', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (!['supervisor', 'supervisor_buddy', 'coach', 'admin'].includes(role) && !isHQRole(role)) {
      return res.status(403).json({ message: "Şablondan vardiya oluşturma yetkiniz yok" });
    }
    
    const template = await storage.getShiftTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Şablon bulunamadı" });
    }
    
    if (!isHQRole(role) && template.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu şablonu kullanma yetkiniz yok" });
    }
    
    const { z } = await import('zod');
    const createShiftsSchema = z.object({
      startDate: z.string(),
      endDate: z.string(),
    });
    
    const { startDate, endDate } = createShiftsSchema.parse(req.body);
    
    const created = await storage.createShiftsFromTemplate(id, startDate, endDate, user.id);
    res.status(201).json({ 
      message: `${created.length} vardiya oluşturuldu`,
      shifts: created 
    });
  } catch (error: any) {
    console.error("Error creating shifts from template:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz tarih aralığı", errors: error.errors });
    }
    res.status(500).json({ message: "Vardiyalar oluşturulamadı" });
  }
});

// POST /api/shift-attendance/manual-check-in - Manual check-in with location verification (with optional shift)
router.post('/api/shift-attendance/manual-check-in', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { z } = await import('zod');
    const manualCheckInSchema = z.object({
      shiftId: z.coerce.number().optional(),
      branchId: z.coerce.number().optional(),
      checkInMethod: z.enum(['manual', 'qr']).default('manual'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      locationConfidenceScore: z.number().min(0).max(100).optional(),
    });
    
    const { shiftId, branchId, checkInMethod, latitude, longitude, locationConfidenceScore } = manualCheckInSchema.parse(req.body);
    
    let shift;
    let targetBranchId;
    
    if (shiftId) {
      shift = await storage.getShift(shiftId);
      if (!shift) {
        return res.status(404).json({ message: "Vardiya bulunamadı" });
      }
      
      if (shift.assignedToId !== user.id) {
        return res.status(403).json({ message: "Bu vardiya size atanmamış" });
      }
      targetBranchId = shift.branchId;
    } else if (branchId) {
      const branch = await storage.getBranch(branchId);
      if (!branch) {
        return res.status(404).json({ message: "Şube bulunamadı" });
      }
      targetBranchId = branchId;
    } else {
      return res.status(400).json({ message: "Vardiya ID veya Şube ID zorunludur" });
    }
    
    // Geofence validation
    if (latitude !== undefined && longitude !== undefined && targetBranchId) {
      const branch = await storage.getBranch(targetBranchId);
      if (branch && branch.shiftCornerLatitude && branch.shiftCornerLongitude) {
        const branchLat = parseFloat(branch.shiftCornerLatitude);
        const branchLon = parseFloat(branch.shiftCornerLongitude);
        const radius = (branch.geoRadius || 50) * 1.5;
        const distance = calculateDistance(latitude, longitude, branchLat, branchLon);
        
        if (distance > radius) {
          return res.status(400).json({ 
            message: `Şube dışındasınız (${Math.round(distance)}m, izin: ${radius}m)`,
            locationValid: false,
            distance: Math.round(distance)
          });
        }
      }
    }
    
    let existingAttendances: any[] = [];
    let userAttendance: any = null;
    
    if (shiftId) {
      existingAttendances = await storage.getShiftAttendances(shiftId);
      userAttendance = existingAttendances.find(a => a.userId === user.id);
      
      if (userAttendance?.checkInTime) {
        return res.status(400).json({ message: "Bu vardiyaya zaten giriş yaptınız" });
      }
    }
    
    const now = new Date();
    
    const attendanceData: any = {
      checkInTime: now,
      status: 'checked_in',
      checkInMethod: checkInMethod,
      locationConfidenceScore: locationConfidenceScore || 0,
    };
    
    if (latitude !== undefined) {
      attendanceData.checkInLatitude = latitude.toString();
    }
    if (longitude !== undefined) {
      attendanceData.checkInLongitude = longitude.toString();
    }
    
    let attendance;
    if (shiftId) {
      if (userAttendance) {
        attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
      } else {
        attendance = await storage.createShiftAttendance({
          shiftId: shiftId,
          userId: user.id,
          ...attendanceData,
        });
      }
    } else {
      attendance = await storage.createShiftAttendance({
        shiftId: -Math.abs(branchId || 1),
        userId: user.id,
        ...attendanceData,
      });
    }
    
    res.status(201).json(attendance);
  } catch (error: any) {
    console.error("Error manual check-in:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Giriş yapılamadı" });
  }
});

// POST /api/shift-attendance/manual-check-out - Manual check-out 
router.post('/api/shift-attendance/manual-check-out', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { z } = await import('zod');
    const manualCheckOutSchema = z.object({
      attendanceId: z.number(),
    });
    
    const { attendanceId } = manualCheckOutSchema.parse(req.body);
    
    const attendance = await storage.getShiftAttendance(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Giriş kaydı bulunamadı" });
    }
    
    if (attendance.userId !== user.id) {
      return res.status(403).json({ message: "Bu kayıt size ait değil" });
    }
    
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: "Zaten çıkış yapılmış" });
    }
    
    const now = new Date();
    const updated = await storage.updateShiftAttendance(attendanceId, {
      checkOutTime: now,
      status: 'completed',
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error manual check-out:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Çıkış yapılamadı" });
  }
});

// POST /api/shift-attendance/check-in - Check in with QR code, photo & location
router.post('/api/shift-attendance/check-in', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { z } = await import('zod');
    const checkInSchema = z.object({
      qrData: z.string(),
      photoUrl: z.string().min(1, "Fotoğraf gereklidir"),
      latitude: z.number().min(-90).max(90, "Geçersiz enlem"),
      longitude: z.number().min(-180).max(180, "Geçersiz boylam"),
    });
    
    const { qrData, photoUrl, latitude, longitude } = checkInSchema.parse(req.body);
    
    const verification = await storage.verifyShiftQR(qrData);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }
    
    const shift = await storage.getShift(verification.shiftId!);
    if (!shift) {
      return res.status(404).json({ message: "Vardiya bulunamadı" });
    }
    
    if (shift.assignedToId !== user.id) {
      return res.status(403).json({ message: "Bu vardiya size atanmamış" });
    }
    
    const existingAttendances = await storage.getShiftAttendances(shift.id);
    const userAttendance = existingAttendances.find(a => a.userId === user.id);
    
    if (userAttendance) {
      if (userAttendance.checkInTime) {
        return res.status(400).json({ message: "Bu vardiyaya zaten giriş yaptınız" });
      }
    }
    
    const now = new Date();
    
    const attendanceData: any = {
      checkInTime: now,
      status: 'checked_in',
      checkInPhotoUrl: photoUrl,
      checkInLatitude: latitude.toString(),
      checkInLongitude: longitude.toString(),
    };
    
    let attendance;
    if (userAttendance) {
      attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
    } else {
      attendance = await storage.createShiftAttendance({
        shiftId: shift.id,
        userId: user.id,
        ...attendanceData,
      });
    }
    
    // Trigger AI dress code analysis asynchronously (photo is required)
    if (attendance) {
      (async () => {
        try {
          const analysis = await analyzeDressCodePhoto(
            photoUrl,
            user.fullName || user.email || "Çalışan",
            user.id,
            false
          );
          
          await storage.updateShiftAttendance(attendance.id, {
            aiDressCodeScore: analysis.score,
            aiDressCodeAnalysis: analysis ,
            aiDressCodeStatus: analysis.isCompliant ? 'approved' : 'rejected',
            aiDressCodeWarnings: analysis.violations,
            aiDressCodeTimestamp: new Date(),
          });
          
          console.log(`✅ Dress code analyzed for attendance ${attendance.id}: ${analysis.score}/100`);
        } catch (error: any) {
          console.error("Error analyzing dress code:", error);
          await storage.updateShiftAttendance(attendance.id, {
            aiDressCodeStatus: 'error',
            aiDressCodeWarnings: ["AI analizi yapılamadı"],
          });
        }
      })();
    }
    
    res.status(201).json(attendance);
  } catch (error: any) {
    console.error("Error checking in:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
    }
    res.status(500).json({ message: "Giriş yapılamadı" });
  }
});

// POST /api/shift-attendance/check-out - Check out with QR code + photo + location
router.post('/api/shift-attendance/check-out', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { z } = await import('zod');
    const checkOutSchema = z.object({
      qrData: z.string(),
      photoUrl: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    });
    
    const { qrData, photoUrl, latitude, longitude } = checkOutSchema.parse(req.body);
    
    const verification = await storage.verifyShiftQR(qrData);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }
    
    const shift = await storage.getShift(verification.shiftId!);
    if (!shift) {
      return res.status(404).json({ message: "Vardiya bulunamadı" });
    }
    
    if (shift.assignedToId !== user.id) {
      return res.status(403).json({ message: "Bu vardiya size atanmamış" });
    }
    
    const existingAttendances = await storage.getShiftAttendances(shift.id);
    const userAttendance = existingAttendances.find(a => a.userId === user.id);
    
    if (!userAttendance || !userAttendance.checkInTime) {
      return res.status(400).json({ message: "Önce giriş yapmalısınız" });
    }
    
    if (userAttendance.checkOutTime) {
      return res.status(400).json({ message: "Bu vardiyadan zaten çıkış yaptınız" });
    }
    
    const now = new Date();
    
    // Calculate actual working time
    const checkInTime = new Date(userAttendance.checkInTime);
    const actualWorkMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
    
    // Calculate planned working time from shift
    let plannedWorkMinutes = 480; // Default 8 hours
    if (shift.startTime && shift.endTime) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      plannedWorkMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (plannedWorkMinutes < 0) plannedWorkMinutes += 24 * 60;
    }
    
    // Calculate overtime (actual - planned)
    const overtimeMinutes = Math.max(0, actualWorkMinutes - plannedWorkMinutes);
    
    // Get approved overtime requests for this shift/attendance
    let approvedOvertimeMinutes = 0;
    try {
      const allOvertimeRequests = await storage.getOvertimeRequests({});
      const approvedRequests = allOvertimeRequests.filter((req: any) => 
        req.shiftAttendanceId === userAttendance.id && req.status === 'approved'
      );
      approvedOvertimeMinutes = approvedRequests.reduce((sum: number, req: any) => sum + (req.requestedMinutes || 0), 0);
    } catch (e) {
      console.log('Could not fetch overtime requests:', e);
    }
    
    // Effective overtime = min(actual overtime, approved overtime)
    const effectiveOvertimeMinutes = Math.min(overtimeMinutes, approvedOvertimeMinutes);
    
    // Total effective work = planned + effective overtime (unapproved overtime doesn't count)
    const effectiveWorkMinutes = plannedWorkMinutes + effectiveOvertimeMinutes;
    
    // Log if there's unapproved overtime
    const unapprovedOvertimeMinutes = overtimeMinutes - effectiveOvertimeMinutes;
    if (unapprovedOvertimeMinutes > 0) {
      console.log(`⚠️ Onaylanmamış mesai: ${unapprovedOvertimeMinutes} dakika (Kullanıcı: ${user.id}, Vardiya: ${shift.id})`);
    }
    
    const updated = await storage.updateShiftAttendance(userAttendance.id, {
      checkOutTime: now,
      checkOutPhotoUrl: photoUrl,
      checkOutLatitude: latitude.toString(),
      checkOutLongitude: longitude.toString(),
      status: 'checked_out',
      totalWorkedMinutes: actualWorkMinutes,
      effectiveWorkMinutes: effectiveWorkMinutes,
    });
    
    // Return response with overtime info
    res.json({
      ...updated,
      overtimeInfo: {
        actualWorkMinutes,
        plannedWorkMinutes,
        totalOvertimeMinutes: overtimeMinutes,
        approvedOvertimeMinutes,
        effectiveOvertimeMinutes,
        unapprovedOvertimeMinutes,
        message: unapprovedOvertimeMinutes > 0 
          ? `Dikkat: ${unapprovedOvertimeMinutes} dakika onaylanmamış mesai puantaja dahil edilmedi.`
          : undefined,
      }
    });
  } catch (error: any) {
    console.error("Error checking out:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz QR kod", errors: error.errors });
    }
    res.status(500).json({ message: "Çıkış yapılamadı" });
  }
});

// ========================
// SHIFT SWAP REQUESTS - Vardiya Takas Talepleri (Çift Onay Sistemi)
// ========================

// Get all shift swap requests (filtered by branch/user/status)
router.get('/api/shift-swap-requests', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { branchId, requesterId, targetUserId, status } = req.query;
    
    const filters: { branchId?: number; requesterId?: string; targetUserId?: string; status?: string } = {};
    
    // Non-HQ users can only see their branch's requests
    if (!isHQRole(user.role) && user.branchId) {
      filters.branchId = user.branchId;
    } else if (branchId) {
      filters.branchId = parseInt(branchId as string);
    }
    
    if (requesterId) filters.requesterId = requesterId as string;
    if (targetUserId) filters.targetUserId = targetUserId as string;
    if (status) filters.status = status as string;
    
    const requests = await storage.getShiftSwapRequests(filters);
    res.json(requests);
  } catch (error: any) {
    console.error("Error fetching shift swap requests:", error);
    res.status(500).json({ message: "Takas talepleri yüklenirken hata oluştu" });
  }
});

// Get pending swap requests for current user (as target)
router.get('/api/shift-swap-requests/pending-for-me', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const requests = await storage.getPendingSwapRequestsForUser(user.id);
    res.json(requests);
  } catch (error: any) {
    console.error("Error fetching pending swap requests:", error);
    res.status(500).json({ message: "Bekleyen talepler yüklenirken hata oluştu" });
  }
});

// Get pending swap requests for supervisor approval
router.get('/api/shift-swap-requests/pending-supervisor', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    
    const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role);
    if (!canApprove) {
      return res.status(403).json({ message: "Bu talepleri görüntüleme yetkiniz yok" });
    }
    
    const branchId = user.branchId || parseInt(req.query.branchId as string);
    if (!branchId) {
      return res.status(400).json({ message: "Şube belirtilmedi" });
    }
    
    const requests = await storage.getPendingSwapRequestsForSupervisor(branchId);
    res.json(requests);
  } catch (error: any) {
    console.error("Error fetching supervisor pending requests:", error);
    res.status(500).json({ message: "Bekleyen talepler yüklenirken hata oluştu" });
  }
});

// Create a new shift swap request
router.post('/api/shift-swap-requests', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { requesterShiftId, targetShiftId, targetUserId, branchId, swapDate, reason } = req.body;
    
    if (!requesterShiftId || !targetShiftId || !targetUserId || !branchId || !swapDate) {
      return res.status(400).json({ message: "Eksik alanlar var" });
    }
    
    const created = await storage.createShiftSwapRequest({
      requesterId: user.id,
      targetUserId,
      requesterShiftId,
      targetShiftId,
      branchId,
      swapDate,
      reason: reason || null,
    });

    await storage.createNotification({
      userId: targetUserId,
      title: 'Vardiya Takas Talebi',
      message: `${user.fullName || user.username} sizinle vardiya takas etmek istiyor`,
      type: 'shift_swap_request',
      relatedId: created.id,
      relatedType: 'shift_swap_request',
      branchId: branchId,
    });
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating shift swap request:", error);
    res.status(500).json({ message: "Takas talebi oluşturulurken hata oluştu" });
  }
});

// Target employee approves the swap request
router.patch('/api/shift-swap-requests/:id/target-approve', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const requestId = parseInt(req.params.id);
    
    const request = await storage.getShiftSwapRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (request.targetUserId !== user.id) {
      return res.status(403).json({ message: "Bu talebi onaylama yetkiniz yok" });
    }
    
    if (request.status !== 'pending_target') {
      return res.status(400).json({ message: "Bu talep zaten işlenmiş" });
    }
    
    const updated = await storage.targetApproveSwapRequest(requestId);

    await storage.createNotification({
      userId: request.requesterId,
      title: 'Takas Talebi Onaylandı',
      message: `${user.fullName || user.username} takas talebinizi onayladı. Yönetici onayı bekleniyor.`,
      type: 'shift_swap_approved',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });

    const supervisors = await storage.getUsersByBranchAndRole(request.branchId, 'supervisor');
    for (const supervisor of supervisors) {
      await storage.createNotification({
        userId: supervisor.id,
        title: 'Yeni Takas Onayı Bekliyor',
        message: `Bir vardiya takas talebi onayınızı bekliyor`,
        type: 'shift_swap_pending_supervisor',
        relatedId: requestId,
        relatedType: 'shift_swap_request',
        branchId: request.branchId,
      });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error approving swap request by target:", error);
    res.status(500).json({ message: "Talep onaylanırken hata oluştu" });
  }
});

// Target employee rejects the swap request
router.patch('/api/shift-swap-requests/:id/target-reject', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const requestId = parseInt(req.params.id);
    const { rejectionReason } = req.body;
    
    const request = await storage.getShiftSwapRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (request.targetUserId !== user.id) {
      return res.status(403).json({ message: "Bu talebi reddetme yetkiniz yok" });
    }
    
    if (request.status !== 'pending_target') {
      return res.status(400).json({ message: "Bu talep zaten işlenmiş" });
    }
    
    const updated = await storage.targetRejectSwapRequest(requestId, rejectionReason || 'Takas reddedildi');

    await storage.createNotification({
      userId: request.requesterId,
      title: 'Takas Talebi Reddedildi',
      message: `${user.fullName || user.username} takas talebinizi reddetti: ${rejectionReason || 'Takas reddedildi'}`,
      type: 'shift_swap_rejected',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error rejecting swap request by target:", error);
    res.status(500).json({ message: "Talep reddedilirken hata oluştu" });
  }
});

// Supervisor approves the swap request
router.patch('/api/shift-swap-requests/:id/supervisor-approve', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const requestId = parseInt(req.params.id);
    
    const canApprove = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role);
    if (!canApprove) {
      return res.status(403).json({ message: "Bu talebi onaylama yetkiniz yok" });
    }
    
    const request = await storage.getShiftSwapRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (request.status !== 'pending_supervisor') {
      return res.status(400).json({ message: "Bu talep yönetici onayı beklememiyor" });
    }
    
    if (!isHQRole(user.role) && user.branchId !== request.branchId) {
      return res.status(403).json({ message: "Sadece kendi şubenizin taleplerini onaylayabilirsiniz" });
    }
    
    const updated = await storage.supervisorApproveSwapRequest(requestId, user.id);

    const swapResult = await storage.executeShiftSwap(requestId);

    await storage.createNotification({
      userId: request.requesterId,
      title: 'Vardiya Takası Tamamlandı',
      message: `Vardiya takas talebiniz onaylandı ve gerçekleştirildi`,
      type: 'shift_swap_completed',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });

    await storage.createNotification({
      userId: request.targetUserId,
      title: 'Vardiya Takası Tamamlandı',
      message: `Vardiya takası onaylandı ve gerçekleştirildi`,
      type: 'shift_swap_completed',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });
    
    res.json({ request: updated, swapResult });
  } catch (error: any) {
    console.error("Error approving swap request by supervisor:", error);
    res.status(500).json({ message: "Talep onaylanırken hata oluştu" });
  }
});

// Supervisor rejects the swap request
router.patch('/api/shift-swap-requests/:id/supervisor-reject', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const requestId = parseInt(req.params.id);
    const { rejectionReason } = req.body;
    
    const canReject = user.role === 'supervisor' || user.role === 'supervisor_buddy' || isHQRole(user.role);
    if (!canReject) {
      return res.status(403).json({ message: "Bu talebi reddetme yetkiniz yok" });
    }
    
    const request = await storage.getShiftSwapRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    if (request.status !== 'pending_supervisor') {
      return res.status(400).json({ message: "Bu talep yönetici onayı beklememiyor" });
    }
    
    if (!isHQRole(user.role) && user.branchId !== request.branchId) {
      return res.status(403).json({ message: "Sadece kendi şubenizin taleplerini reddedebilirsiniz" });
    }
    
    const updated = await storage.supervisorRejectSwapRequest(requestId, user.id, rejectionReason || 'Yönetici tarafından reddedildi');

    await storage.createNotification({
      userId: request.requesterId,
      title: 'Vardiya Takası Reddedildi',
      message: `Vardiya takas talebiniz yönetici tarafından reddedildi: ${rejectionReason || 'Yönetici tarafından reddedildi'}`,
      type: 'shift_swap_rejected_supervisor',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });

    await storage.createNotification({
      userId: request.targetUserId,
      title: 'Vardiya Takası Reddedildi',
      message: `Vardiya takası yönetici tarafından reddedildi`,
      type: 'shift_swap_rejected_supervisor',
      relatedId: requestId,
      relatedType: 'shift_swap_request',
      branchId: request.branchId,
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error rejecting swap request by supervisor:", error);
    res.status(500).json({ message: "Talep reddedilirken hata oluştu" });
  }
});

// Get single swap request details
router.get('/api/shift-swap-requests/:id', isAuthenticated, async (req: any, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await storage.getShiftSwapRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ message: "Takas talebi bulunamadı" });
    }
    
    res.json(request);
  } catch (error: any) {
    console.error("Error fetching shift swap request:", error);
    res.status(500).json({ message: "Takas talebi yüklenirken hata oluştu" });
  }
});

router.get('/api/shift-attendances/my-recent', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    
    const attendances = await storage.getRecentShiftAttendances(user.id, 30);
    res.json(attendances);
  } catch (error: any) {
    console.error("Error fetching recent shift attendances:", error);
    res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
  }
});

// ===== SHIFTS CRUD ROUTES =====

// GET /api/shifts - Get all shifts
router.get('/api/shifts', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    let branchId: number | undefined = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    
    if (isBranchRole(role)) {
      branchId = user.branchId;
    }
    
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const assignedToId = req.query.assignedToId as string | undefined;
    
    const allShifts = await storage.getShifts(branchId, assignedToId, dateFrom, dateTo);
    res.json(allShifts);
  } catch (error: any) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
  }
});

// GET /api/shifts/my - Get current user's shifts
router.get('/api/shifts/my', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    
    const myShifts = await storage.getShifts(undefined, user.id, dateFrom, dateTo);
    res.json(myShifts);
  } catch (error: any) {
    console.error("Error fetching user shifts:", error);
    res.status(500).json({ message: "Vardiyalar yüklenirken hata oluştu" });
  }
});

// POST /api/shifts - Create a new shift
router.post('/api/shifts', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
    }
    
    const { z } = await import('zod');
    const shiftSchema = z.object({
      shiftDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      breakStartTime: z.string().optional().nullable(),
      breakEndTime: z.string().optional().nullable(),
      shiftType: z.enum(['morning', 'evening', 'night']).optional(),
      status: z.string().optional(),
      notes: z.string().optional().nullable(),
      branchId: z.number(),
      assignedToId: z.string().optional().nullable(),
      checklistId: z.number().optional().nullable(),
      checklist2Id: z.number().optional().nullable(),
      checklist3Id: z.number().optional().nullable(),
    });
    
    const validated = shiftSchema.parse(req.body);
    
    if (isBranchRole(role) && validated.branchId !== user.branchId) {
      return res.status(403).json({ message: "Sadece kendi şubeniz için vardiya oluşturabilirsiniz" });
    }
    
    const shift = await storage.createShift({
      ...validated,
      status: 'confirmed',
      createdById: user.id,
    });
    
    if (shift.assignedToId) {
      try {
        await storage.createNotification({
          userId: shift.assignedToId,
          type: 'shift_assigned',
          title: 'Yeni Vardiya Atandı',
          message: `${shift.shiftDate} tarihinde ${shift.startTime?.substring(0, 5)} - ${shift.endTime?.substring(0, 5)} vardiyası atandı.`,
          link: '/vardiyalarim',
          branchId: shift.branchId,
        });
        
        const assignedUser = await storage.getUser(shift.assignedToId);
        if (assignedUser?.email) {
          const { sendNotificationEmail } = await import('../email');
          sendNotificationEmail(
            assignedUser.email,
            'Yeni Vardiya Atandı - DOSPRESSO',
            `Merhaba ${assignedUser.firstName || 'Değerli Çalışan'},\n\n` +
            `${shift.shiftDate} tarihinde saat ${shift.startTime?.substring(0, 5)} - ${shift.endTime?.substring(0, 5)} arasında vardiyaya atandınız.\n\n` +
            `İyi çalışmalar dileriz.\n\nDOSPRESSO`,
            'info'
          ).catch(err => console.error("Background shift email error:", err));
        }
      } catch (notifErr) {
        console.error("Shift notification error:", notifErr);
      }
    }
    
    res.status(201).json(shift);
  } catch (error: any) {
    console.error("Error creating shift:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Vardiya oluşturulamadı" });
  }
});

// POST /api/shifts/bulk-create - Create multiple shifts at once
router.post('/api/shifts/bulk-create', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
    }
    
    const { z } = await import('zod');
    const shiftSchema = z.object({
      shiftDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      breakStartTime: z.string().optional().nullable(),
      breakEndTime: z.string().optional().nullable(),
      shiftType: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional().nullable(),
      branchId: z.union([z.number(), z.string().transform(v => parseInt(v))]),
      assignedToId: z.union([z.string(), z.number().transform(v => String(v))]).optional().nullable(),
      checklistId: z.number().optional().nullable(),
      checklist2Id: z.number().optional().nullable(),
      checklist3Id: z.number().optional().nullable(),
      employeeName: z.string().optional(),
      slotName: z.string().optional(),
      fairnessScore: z.number().optional(),
    });
    
    const bulkSchema = z.object({
      shifts: z.array(shiftSchema),
    });
    
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Bulk shift validation error:", JSON.stringify(parsed.error.errors, null, 2));
      return res.status(400).json({ message: "Geçersiz veri formatı", errors: parsed.error.errors });
    }
    const { shifts: shiftsData } = parsed.data;
    
    const invalidBranch = shiftsData.find(s => isBranchRole(role) && s.branchId !== user.branchId);
    if (invalidBranch) {
      return res.status(403).json({ message: "Sadece kendi şubeniz için vardiya oluşturabilirsiniz" });
    }
    
    const createdShifts = [];
    const notifiedEmployees = new Set<string>();
    
    for (const shiftData of shiftsData) {
      const { employeeName, slotName, fairnessScore, ...cleanShiftData } = shiftData as any;
      if (cleanShiftData.startTime) cleanShiftData.startTime = normalizeTime(cleanShiftData.startTime);
      if (cleanShiftData.endTime) cleanShiftData.endTime = normalizeTime(cleanShiftData.endTime);
      if (cleanShiftData.breakStartTime) cleanShiftData.breakStartTime = normalizeTime(cleanShiftData.breakStartTime);
      if (cleanShiftData.breakEndTime) cleanShiftData.breakEndTime = normalizeTime(cleanShiftData.breakEndTime);
      
      const timeRegex = /^\d{2}:\d{2}$/;
      if (cleanShiftData.startTime && !timeRegex.test(cleanShiftData.startTime)) {
        console.error(`Invalid startTime format: ${cleanShiftData.startTime}, normalizing`);
        cleanShiftData.startTime = normalizeTime(cleanShiftData.startTime);
      }
      if (cleanShiftData.endTime && !timeRegex.test(cleanShiftData.endTime)) {
        console.error(`Invalid endTime format: ${cleanShiftData.endTime}, normalizing`);
        cleanShiftData.endTime = normalizeTime(cleanShiftData.endTime);
      }
      
      const normalizedType = ['morning', 'evening', 'night'].includes(cleanShiftData.shiftType || '') 
        ? cleanShiftData.shiftType 
        : 'morning';
      const shift = await storage.createShift({
        ...cleanShiftData,
        shiftType: normalizedType,
        status: 'confirmed',
        createdById: user.id,
      });
      createdShifts.push(shift);
      
      if (shift.assignedToId) {
        notifiedEmployees.add(shift.assignedToId);
      }
    }
    
    for (const employeeId of notifiedEmployees) {
      const empShifts = createdShifts.filter(s => s.assignedToId === employeeId);
      const firstDate = empShifts[0]?.shiftDate;
      const lastDate = empShifts[empShifts.length - 1]?.shiftDate;
      
      try {
        await storage.createNotification({
          userId: employeeId,
          type: 'shift_assigned',
          title: 'Yeni Vardiya Planı',
          message: empShifts.length === 1 
            ? `${firstDate} tarihinde vardiya atandı.`
            : `${firstDate} - ${lastDate} arasında ${empShifts.length} vardiya atandı.`,
          link: '/vardiyalarim',
          branchId: empShifts[0]?.branchId,
        });
        
        const employee = await storage.getUser(employeeId);
        if (employee?.email) {
          const { sendNotificationEmail } = await import('../email');
          const msg = empShifts.length === 1 
            ? `${firstDate} tarihinde vardiyaya atandınız.`
            : `${firstDate} - ${lastDate} arasında ${empShifts.length} vardiya atandı.`;
          sendNotificationEmail(
            employee.email,
            'Yeni Vardiya Planı - DOSPRESSO',
            `Merhaba ${employee.firstName || 'Değerli Çalışan'},\n\n${msg}\n\nİyi çalışmalar dileriz.\n\nDOSPRESSO`,
            'info'
          ).catch(err => console.error("Background bulk shift email error:", err));
        }
      } catch (notifErr) {
        console.error("Bulk shift notification error:", notifErr);
      }
    }
    
    res.status(201).json({ 
      message: `${createdShifts.length} vardiya oluşturuldu`,
      shifts: createdShifts,
      notifiedCount: notifiedEmployees.size
    });
  } catch (error: any) {
    console.error("Error creating bulk shifts:", error?.message || error);
    if (error?.stack) console.error("Stack:", error.stack);
    if (error?.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri formatı", errors: error.errors });
    }
    res.status(500).json({ message: error?.message || "Vardiyalar oluşturulamadı" });
  }
});

// PATCH /api/shifts/:id - Update a shift
router.patch('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya güncelleme yetkiniz yok" });
    }
    
    const shift = await storage.getShift(id);
    if (!shift) {
      return res.status(404).json({ message: "Vardiya bulunamadı" });
    }
    
    if (isBranchRole(role) && shift.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu vardiyayı güncelleme yetkiniz yok" });
    }
    
    const { z } = await import('zod');
    const updateSchema = z.object({
      shiftDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      breakStartTime: z.string().optional().nullable(),
      breakEndTime: z.string().optional().nullable(),
      shiftType: z.enum(['morning', 'evening', 'night']).optional(),
      status: z.string().optional(),
      notes: z.string().optional().nullable(),
      assignedToId: z.string().optional().nullable(),
      checklistId: z.number().optional().nullable(),
      checklist2Id: z.number().optional().nullable(),
      checklist3Id: z.number().optional().nullable(),
    });
    
    const validated = updateSchema.parse(req.body);
    const previousAssignedTo = shift.assignedToId;
    const updated = await storage.updateShift(id, validated);
    
    if (updated && updated.assignedToId) {
      try {
        if (validated.assignedToId && validated.assignedToId !== previousAssignedTo) {
          await storage.createNotification({
            userId: updated.assignedToId,
            type: 'shift_assigned',
            title: 'Vardiya Atandı',
            message: `${updated.shiftDate} tarihinde ${updated.startTime?.substring(0, 5)} - ${updated.endTime?.substring(0, 5)} vardiyası size atandı.`,
            link: '/vardiyalarim',
            branchId: updated.branchId || shift.branchId,
          });
        } else if (validated.shiftDate || validated.startTime || validated.endTime) {
          await storage.createNotification({
            userId: updated.assignedToId,
            type: 'shift_change',
            title: 'Vardiya Güncellendi',
            message: `${updated.shiftDate} tarihindeki vardiya güncellendi: ${updated.startTime?.substring(0, 5)} - ${updated.endTime?.substring(0, 5)}`,
            link: '/vardiyalarim',
            branchId: updated.branchId || shift.branchId,
          });
        }
      } catch (notifErr) {
        console.error("Shift update notification error:", notifErr);
      }
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating shift:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Vardiya güncellenemedi" });
  }
});

// DELETE /api/shifts/reset-weekly - Reset weekly shifts (MUST be before :id route)
router.delete('/api/shifts/reset-weekly', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya sıfırlama yetkiniz yok" });
    }
    
    const weekStart = req.query.weekStart as string;
    if (!weekStart) {
      return res.status(400).json({ message: "weekStart parametresi gerekli" });
    }
    
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];
    
    let branchId: number | undefined;
    if (isBranchRole(role)) {
      branchId = user.branchId;
    } else if (req.query.branchId) {
      branchId = parseInt(req.query.branchId as string);
    }
    
    const weekShifts = await storage.getShifts(branchId, undefined, weekStart, weekEnd);
    
    let deletedCount = 0;
    for (const shift of weekShifts) {
      if (shift && shift.id && !isNaN(shift.id)) {
        await storage.deleteShift(shift.id);
        deletedCount++;
      }
    }
    
    res.json({ message: `${deletedCount} vardiya silindi` });
  } catch (error: any) {
    console.error("Error resetting weekly shifts:", error);
    res.status(500).json({ message: "Vardiyalar sıfırlanamadı" });
  }
});

// PATCH /api/shift-checklists/:id - Update shift checklist completion status
router.patch('/api/shift-checklists/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Gecersiz checklist ID'si" });
    }

    const { isCompleted } = req.body;
    
    const shiftChecklist = await storage.getShiftChecklistById(id);
    if (!shiftChecklist) {
      return res.status(404).json({ message: "Shift checklist bulunamadi" });
    }

    const updated = await storage.updateShiftChecklist(id, {
      isCompleted,
      completedAt: isCompleted ? new Date() : null
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Shift checklist guncelleme hatasi:', error);
    res.status(500).json({ message: "Sunucu hatasi" });
  }
});

// DELETE /api/shifts/:id - Delete a shift (AFTER reset-weekly to avoid :id matching reset-weekly)
router.delete('/api/shifts/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Geçersiz vardiya ID'si" });
    }
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya silme yetkiniz yok" });
    }
    
    const shift = await storage.getShift(id);
    if (!shift) {
      return res.status(404).json({ message: "Vardiya bulunamadı" });
    }
    
    if (isBranchRole(role) && shift.branchId !== user.branchId) {
      return res.status(403).json({ message: "Bu vardiyayı silme yetkiniz yok" });
    }
    
    await storage.deleteShift(id);
    res.json({ message: "Vardiya silindi" });
  } catch (error: any) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ message: "Vardiya silinemedi" });
  }
});

// POST /api/shifts/validate-plan - Validate weekly shift plan against DOSPRESSO rules
router.post('/api/shifts/validate-plan', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;

    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya doğrulama yetkiniz yok" });
    }

    const { z } = await import('zod');
    const validateSchema = z.object({
      weekStart: z.string(),
      branchId: z.number(),
    });

    const { weekStart, branchId } = validateSchema.parse(req.body);

    if (isBranchRole(role) && branchId !== user.branchId) {
      return res.status(403).json({ message: "Sadece kendi şubenizi doğrulayabilirsiniz" });
    }

    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];

    const weekShifts = await storage.getShifts(branchId, undefined, weekStart, weekEnd);
    const allEmployees = await storage.getAllEmployees(branchId);

    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(startDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekShifts = await storage.getShifts(
      branchId, undefined,
      prevWeekStart.toISOString().split('T')[0],
      prevWeekEnd.toISOString().split('T')[0]
    );

    interface ShiftValidation {
      type: 'error' | 'warning';
      message: string;
      category: 'hours' | 'rotation' | 'power_balance' | 'weekend' | 'peak_hours' | 'opening';
      affectedEmployees?: string[];
      day?: string;
    }

    const validations: ShiftValidation[] = [];

    const timeToMinutes = (t: string | null | undefined): number => {
      if (!t) return 0;
      const parts = t.substring(0, 5).split(':').map(Number);
      return parts[0] * 60 + parts[1];
    };

    const getShiftDurationHours = (s: any): number => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      let diff = end - start;
      if (diff < 0) diff += 24 * 60;
      return diff / 60;
    };

    const getDospressoType = (startTime: string | null | undefined): string => {
      const mins = timeToMinutes(startTime);
      if (mins <= 8 * 60) return 'opening';
      if (mins <= 12 * 60) return 'intermediate';
      if (mins <= 16 * 60) return 'first_closing';
      return 'closing';
    };

    const experiencedRoles = ['supervisor', 'supervisor_buddy', 'barista', 'admin'];

    // 1. 45-Hour Weekly Minimum for full-time employees
    const fulltimeEmployees = allEmployees.filter((e: any) => e.employmentType !== 'parttime');
    for (const emp of fulltimeEmployees) {
      const empShifts = weekShifts.filter((s: any) => String(s.assignedToId) === String(emp.id));
      const totalHours = empShifts.reduce((sum: number, s: any) => sum + getShiftDurationHours(s), 0);
      if (totalHours < 45) {
        validations.push({
          type: 'warning',
          message: `${emp.fullName || emp.firstName} haftalık ${totalHours.toFixed(1)} saat çalışıyor (minimum 45 saat)`,
          category: 'hours',
          affectedEmployees: [String(emp.id)],
        });
      }
    }

    // 2. Weekly Rotation Fairness
    for (const emp of allEmployees) {
      const currentShifts = weekShifts.filter((s: any) => String(s.assignedToId) === String(emp.id));
      const prevShifts = prevWeekShifts.filter((s: any) => String(s.assignedToId) === String(emp.id));

      if (currentShifts.length > 0 && prevShifts.length > 0) {
        const currentTypes = new Set(currentShifts.map((s: any) => getDospressoType(s.startTime)));
        const prevTypes = new Set(prevShifts.map((s: any) => getDospressoType(s.startTime)));

        if (currentTypes.size === 1 && prevTypes.size === 1) {
          const currentType = [...currentTypes][0];
          const prevType = [...prevTypes][0];
          if (currentType === prevType) {
            const typeLabels: Record<string, string> = {
              opening: 'Açılış', intermediate: 'Aracı',
              first_closing: '1. Kapanış', closing: 'Kapanış'
            };
            validations.push({
              type: 'warning',
              message: `${(emp as any).fullName || (emp as any).firstName} ardışık 2 hafta aynı vardiya tipinde (${typeLabels[currentType] || currentType})`,
              category: 'rotation',
              affectedEmployees: [String(emp.id)],
            });
          }
        }
      }
    }

    // Group shifts by day for day-level checks
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + d);
      const dayStr = dayDate.toISOString().split('T')[0];
      const dayOfWeek = dayDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const dayShifts = weekShifts.filter((s: any) => s.shiftDate === dayStr);

      // 3. Power Balance checks
      const shiftSlots: Record<string, any[]> = {};
      for (const s of dayShifts) {
        const sType = getDospressoType(s.startTime);
        if (!shiftSlots[sType]) shiftSlots[sType] = [];
        shiftSlots[sType].push(s);
      }

      for (const [slotType, slotShifts] of Object.entries(shiftSlots)) {
        const slotEmps = slotShifts.map((s: any) => {
          const emp = allEmployees.find((e: any) => String(e.id) === String(s.assignedToId));
          return emp;
        }).filter(Boolean);

        const trainees = slotEmps.filter((e: any) => e.role === 'stajyer');
        if (trainees.length >= 2 && slotEmps.length === trainees.length) {
          validations.push({
            type: 'error',
            message: `${dayName}: ${slotType} vardiyasında yalnızca stajyerler var`,
            category: 'power_balance',
            affectedEmployees: trainees.map((e: any) => String(e.id)),
            day: dayStr,
          });
        }

        const hasExperienced = slotEmps.some((e: any) => experiencedRoles.includes(e.role));
        if (slotEmps.length > 0 && !hasExperienced) {
          validations.push({
            type: 'error',
            message: `${dayName}: ${slotType} vardiyasında deneyimli personel yok`,
            category: 'power_balance',
            affectedEmployees: slotEmps.map((e: any) => String(e.id)),
            day: dayStr,
          });
        }

        const supervisors = slotEmps.filter((e: any) => e.role === 'supervisor');
        const buddies = slotEmps.filter((e: any) => e.role === 'supervisor_buddy');
        if (supervisors.length > 0 && buddies.length > 0) {
          validations.push({
            type: 'warning',
            message: `${dayName}: ${slotType} vardiyasında supervisor ve buddy aynı anda çalışıyor`,
            category: 'power_balance',
            affectedEmployees: [...supervisors, ...buddies].map((e: any) => String(e.id)),
            day: dayStr,
          });
        }
      }

      // 4. Weekend Rules (Saturday=6, Sunday=0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (dayShifts.length < 2) {
          validations.push({
            type: 'warning',
            message: `${dayName} (${dayStr}): Hafta sonunda yetersiz personel (${dayShifts.length} kişi)`,
            category: 'weekend',
            day: dayStr,
          });
        }
      }

      // 5. Peak Hour Break Check (13:00-17:30)
      const peakStart = 13 * 60;
      const peakEnd = 17 * 60 + 30;
      const peakBreaks = dayShifts.filter((s: any) => {
        const breakMin = timeToMinutes(s.breakStartTime);
        return breakMin >= peakStart && breakMin <= peakEnd;
      });

      if (peakBreaks.length > 1) {
        validations.push({
          type: 'warning',
          message: `${dayName}: Yoğun saatlerde (13:00-17:30) ${peakBreaks.length} kişi aynı anda molada`,
          category: 'peak_hours',
          affectedEmployees: peakBreaks.map((s: any) => String(s.assignedToId)),
          day: dayStr,
        });
      }

      // 6. Opening Shift Check (must have exactly 2 people at 07:30, one experienced)
      const openingShifts = dayShifts.filter((s: any) => {
        const startMin = timeToMinutes(s.startTime);
        return startMin <= 8 * 60;
      });

      if (openingShifts.length > 0 && openingShifts.length < 2) {
        validations.push({
          type: 'error',
          message: `${dayName}: Açılış vardiyasında ${openingShifts.length} kişi var (minimum 2 olmalı)`,
          category: 'opening',
          affectedEmployees: openingShifts.map((s: any) => String(s.assignedToId)),
          day: dayStr,
        });
      }

      if (openingShifts.length > 0) {
        const openingEmps = openingShifts.map((s: any) =>
          allEmployees.find((e: any) => String(e.id) === String(s.assignedToId))
        ).filter(Boolean);
        const hasExpOpening = openingEmps.some((e: any) => experiencedRoles.includes(e.role));
        if (!hasExpOpening) {
          validations.push({
            type: 'error',
            message: `${dayName}: Açılış vardiyasında deneyimli personel yok`,
            category: 'opening',
            affectedEmployees: openingEmps.map((e: any) => String(e.id)),
            day: dayStr,
          });
        }
      }
    }

    res.json({
      validations,
      summary: {
        errors: validations.filter(v => v.type === 'error').length,
        warnings: validations.filter(v => v.type === 'warning').length,
        total: validations.length,
      },
    });
  } catch (error: any) {
    console.error("Error validating shift plan:", error);
    if (error?.name === 'ZodError') {
      return res.status(400).json({ message: "Geçersiz veri", errors: error.errors });
    }
    res.status(500).json({ message: "Vardiya planı doğrulanamadı" });
  }
});

// GET /api/shifts/recommendations - Get AI shift recommendations using OpenAI
router.get('/api/shifts/recommendations', isAuthenticated, async (req: any, res) => {
  try {
    const { generateShiftPlan } = await import('../ai');
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    const allowedRoles = ['supervisor', 'supervisor_buddy', 'destek', 'admin', 'coach', 'muhasebe'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Vardiya önerileri görüntüleme yetkiniz yok" });
    }

    const weekStart = req.query.weekStart as string;
    const branchId = req.query.branchId as string;
    const skipCache = req.query.skipCache === 'true';
    
    if (!weekStart || !branchId) {
      return res.status(400).json({ message: "weekStart ve branchId parametreleri gerekli" });
    }

    const bid = parseInt(branchId);
    
    if ((role === 'supervisor' || role === 'supervisor_buddy') && (!user.branchId || user.branchId !== bid)) {
      return res.status(403).json({ message: "Sadece kendi şubenizin vardiyalarını görebilirsiniz" });
    }

    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];

    const sixWeeksAgo = new Date(startDate);
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const historicalShifts = await storage.getShifts(
      bid, 
      undefined, 
      sixWeeksAgo.toISOString().split('T')[0],
      weekStart
    );

    const branch = await storage.getBranch(bid);
    const branchHours = {
      openingHours: branch?.openingHours || '08:00',
      closingHours: branch?.closingHours || '22:00',
    };

    const allEmployees = await storage.getAllEmployees(bid);
    const employees = allEmployees.map((e: any) => ({
      id: String(e.id),
      name: e.fullName || `${e.firstName} ${e.lastName}`,
      role: e.role || 'barista',
      employmentType: e.employmentType || 'fulltime',
      weeklyHours: e.weeklyHours || (e.employmentType === 'parttime' ? 25 : 45),
    }));

    const formattedHistorical = historicalShifts.map((s: any) => ({
      shiftDate: s.shiftDate,
      shiftType: s.shiftType || 'morning',
      assignedToId: s.assignedToId ? String(s.assignedToId) : null,
      status: s.status || 'draft',
    }));

    if (employees.length === 0) {
      return res.json({ 
        recommendations: [], 
        summary: 'Şubede personel bulunamadı', 
        totalShifts: 0,
        cached: false,
        weekStart,
        weekEnd,
      });
    }

    const aiPlan = await generateShiftPlan(
      bid,
      weekStart,
      weekEnd,
      formattedHistorical,
      employees,
      { branchHours },
      user.id,
      skipCache
    );

    const existingShifts = await storage.getShifts(bid, undefined, weekStart, weekEnd);
    const existingShiftsByDayAndEmployee = new Map<string, Set<string>>();
    existingShifts.forEach((s: any) => {
      const key = s.shiftDate;
      if (!existingShiftsByDayAndEmployee.has(key)) {
        existingShiftsByDayAndEmployee.set(key, new Set());
      }
      if (s.assignedToId) {
        existingShiftsByDayAndEmployee.get(key)!.add(String(s.assignedToId));
      }
    });

    const validEmployeeIds = new Set(employees.map(e => String(e.id)));
    const employeeIdArray = employees.map(e => String(e.id));
    let fallbackIndex = 0;
    
    const newShiftsByDayAndEmployee = new Map<string, Set<string>>();
    
    const validatedShifts = (aiPlan.shifts || [])
      .filter((shift: any) => {
        if (!shift.shiftDate || !/^\d{4}-\d{2}-\d{2}$/.test(shift.shiftDate)) {
          return false;
        }
        return true;
      })
      .map((shift: any) => {
        let assignedToId = String(shift.assignedToId);
        if (!shift.assignedToId || !validEmployeeIds.has(assignedToId)) {
          assignedToId = employeeIdArray[fallbackIndex % employeeIdArray.length];
          fallbackIndex++;
        }
        return { ...shift, assignedToId };
      })
      .filter((shift: any) => {
        const dayKey = shift.shiftDate;
        const employeeId = String(shift.assignedToId);
        
        const existingForDay = existingShiftsByDayAndEmployee.get(dayKey);
        if (existingForDay && existingForDay.has(employeeId)) {
          console.log(`⚠️ Skipping duplicate: ${employeeId} already has shift on ${dayKey} (existing)`);
          return false;
        }
        
        if (!newShiftsByDayAndEmployee.has(dayKey)) {
          newShiftsByDayAndEmployee.set(dayKey, new Set());
        }
        const newForDay = newShiftsByDayAndEmployee.get(dayKey)!;
        if (newForDay.has(employeeId)) {
          console.log(`⚠️ Skipping duplicate: ${employeeId} already assigned on ${dayKey} (in batch)`);
          return false;
        }
        
        newForDay.add(employeeId);
        return true;
      })
      .map((shift: any) => {
        const shiftType = shift.shiftType || 'morning';
        return {
          shiftDate: shift.shiftDate,
          assignedToId: String(shift.assignedToId),
          shiftType,
          status: 'draft',
          startTime: normalizeTime(shift.startTime || (shiftType === 'morning' ? '07:00' : shiftType === 'evening' ? '15:00' : '23:00')),
          endTime: normalizeTime(shift.endTime || (shiftType === 'morning' ? '15:00' : shiftType === 'evening' ? '23:00' : '07:00')),
          breakStartTime: normalizeTime(shift.breakStartTime || (shiftType === 'morning' ? '11:00' : '19:00')),
          breakEndTime: normalizeTime(shift.breakEndTime || (shiftType === 'morning' ? '12:00' : '20:00')),
        };
      });

    // COVERAGE VALIDATION: Ensure every employee has correct shift count (FT=6, PT=3)
    const weekDates: string[] = [];
    const currentD = new Date(startDate);
    while (currentD <= endDate) {
      weekDates.push(currentD.toISOString().split('T')[0]);
      currentD.setDate(currentD.getDate() + 1);
    }

    const branchHoursInfo = await storage.getBranch(bid);
    const bOpen = branchHoursInfo?.openingHours || '08:00';
    const bClose = branchHoursInfo?.closingHours || '22:00';
    const bOpenHr = parseInt(bOpen.split(':')[0]);
    const bCloseHr = parseInt(bClose.split(':')[0]);
    const bMidHr = Math.floor((bOpenHr + bCloseHr) / 2);

    for (const emp of employees) {
      const employeeId = String(emp.id);
      const currentCount = validatedShifts.filter(s => s.assignedToId === employeeId).length;
      const targetDays = emp.employmentType === 'parttime' ? 3 : 6;

      if (currentCount > targetDays) {
        console.log(`Trimming: ${emp.name} ${currentCount}/${targetDays} gun, ${currentCount - targetDays} siliniyor`);
        let removedCount = 0;
        for (let i = validatedShifts.length - 1; i >= 0 && removedCount < (currentCount - targetDays); i--) {
          if (validatedShifts[i].assignedToId === employeeId) {
            const dayOfWeek = new Date(validatedShifts[i].shiftDate).getDay();
            if (dayOfWeek === 1 || dayOfWeek === 2) {
              validatedShifts.splice(i, 1);
              removedCount++;
            }
          }
        }
        for (let i = validatedShifts.length - 1; i >= 0 && removedCount < (currentCount - targetDays); i--) {
          if (validatedShifts[i].assignedToId === employeeId) {
            const dayOfWeek = new Date(validatedShifts[i].shiftDate).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              validatedShifts.splice(i, 1);
              removedCount++;
            }
          }
        }
      }

      const missingDays = targetDays - validatedShifts.filter(s => s.assignedToId === employeeId).length;
      if (missingDays <= 0) continue;

      console.log(`Filler: ${emp.name} ${currentCount}/${targetDays} gun, ${missingDays} ekleniyor`);

      const assignedDates = new Set(
        validatedShifts.filter(s => s.assignedToId === employeeId).map(s => s.shiftDate)
      );

      const availableDates = weekDates.filter(d => !assignedDates.has(d));
      const sortedDates = availableDates.sort((a, b) => {
        const countA = validatedShifts.filter(s => s.shiftDate === a).length;
        const countB = validatedShifts.filter(s => s.shiftDate === b).length;
        return countA - countB;
      });

      const isFT = emp.employmentType !== 'parttime';
      for (let i = 0; i < missingDays && i < sortedDates.length; i++) {
        const shiftDate = sortedDates[i];
        const mCount = validatedShifts.filter(s => s.shiftDate === shiftDate && s.shiftType === 'morning').length;
        const eCount = validatedShifts.filter(s => s.shiftDate === shiftDate && s.shiftType === 'evening').length;
        const shiftType = mCount <= eCount ? 'morning' : 'evening';

        let sTime: string, eTime: string, bStart: string, bEnd: string;
        if (shiftType === 'morning') {
          sTime = normalizeTime(bOpen);
          const endH = bOpenHr + (isFT ? 8 : 4);
          eTime = `${String(endH).padStart(2,'0')}:${isFT ? '30' : '00'}`;
          const breakH = bOpenHr + 4;
          bStart = `${String(breakH).padStart(2,'0')}:${String(Math.min(mCount * 15, 45)).padStart(2,'0')}`;
          bEnd = `${String(breakH + 1).padStart(2,'0')}:${String(Math.min(mCount * 15, 45)).padStart(2,'0')}`;
        } else {
          sTime = `${String(bMidHr).padStart(2,'0')}:00`;
          const endH = Math.min(bMidHr + (isFT ? 8 : 4), bCloseHr);
          eTime = `${String(endH).padStart(2,'0')}:${isFT ? '30' : '00'}`;
          const breakH = bMidHr + 4;
          bStart = `${String(breakH).padStart(2,'0')}:${String(Math.min(eCount * 15, 45)).padStart(2,'0')}`;
          bEnd = `${String(breakH + 1).padStart(2,'0')}:${String(Math.min(eCount * 15, 45)).padStart(2,'0')}`;
        }

        validatedShifts.push({
          shiftDate,
          assignedToId: employeeId,
          shiftType,
          status: 'draft',
          startTime: sTime,
          endTime: eTime,
          breakStartTime: bStart,
          breakEndTime: bEnd,
        });
      }
    }

    const saturdayDate = weekDates.find(d => new Date(d).getDay() === 6);
    const sundayDate = weekDates.find(d => new Date(d).getDay() === 0);

    for (const emp of employees) {
      const employeeId = String(emp.id);
      const empShifts = validatedShifts.filter(s => s.assignedToId === employeeId);

      if (saturdayDate && !empShifts.some(s => s.shiftDate === saturdayDate)) {
        const isFT = emp.employmentType !== 'parttime';
        const targetDays = isFT ? 6 : 3;

        if (empShifts.length >= targetDays) {
          for (let i = validatedShifts.length - 1; i >= 0; i--) {
            if (validatedShifts[i].assignedToId === employeeId) {
              const dow = new Date(validatedShifts[i].shiftDate).getDay();
              if (dow === 1 || dow === 2) {
                console.log(`Weekend swap: ${emp.name} removing ${validatedShifts[i].shiftDate} (${dow === 1 ? 'Mon' : 'Tue'}) for Saturday`);
                validatedShifts.splice(i, 1);
                break;
              }
            }
          }
        }

        const alreadyHasShift = validatedShifts.some(s => s.assignedToId === employeeId && s.shiftDate === saturdayDate);
        if (!alreadyHasShift) {
          const mCount = validatedShifts.filter(s => s.shiftDate === saturdayDate && s.shiftType === 'morning').length;
          const eCount = validatedShifts.filter(s => s.shiftDate === saturdayDate && s.shiftType === 'evening').length;
          const shiftType = mCount <= eCount ? 'morning' : 'evening';

          const isFTEmp = emp.employmentType !== 'parttime';
          validatedShifts.push({
            shiftDate: saturdayDate,
            assignedToId: employeeId,
            shiftType,
            status: 'draft',
            startTime: normalizeTime(shiftType === 'morning' ? bOpen : `${String(bMidHr).padStart(2,'0')}:00`),
            endTime: normalizeTime(shiftType === 'morning' ? `${String(bOpenHr + (isFTEmp ? 8 : 4)).padStart(2,'0')}:${isFTEmp ? '30' : '00'}` : `${String(Math.min(bMidHr + (isFTEmp ? 8 : 4), bCloseHr)).padStart(2,'0')}:${isFTEmp ? '30' : '00'}`),
            breakStartTime: normalizeTime(`${String((shiftType === 'morning' ? bOpenHr : bMidHr) + 4).padStart(2,'0')}:00`),
            breakEndTime: normalizeTime(`${String((shiftType === 'morning' ? bOpenHr : bMidHr) + 5).padStart(2,'0')}:00`),
          });
        }
      }

      if (sundayDate && !empShifts.some(s => s.shiftDate === sundayDate)) {
        const isFT = emp.employmentType !== 'parttime';
        const targetDays = isFT ? 6 : 3;
        const currentEmpShifts = validatedShifts.filter(s => s.assignedToId === employeeId);

        if (currentEmpShifts.length >= targetDays) {
          for (let i = validatedShifts.length - 1; i >= 0; i--) {
            if (validatedShifts[i].assignedToId === employeeId) {
              const dow = new Date(validatedShifts[i].shiftDate).getDay();
              if (dow === 1 || dow === 2) {
                console.log(`Weekend swap: ${emp.name} removing ${validatedShifts[i].shiftDate} for Sunday`);
                validatedShifts.splice(i, 1);
                break;
              }
            }
          }
        }

        const alreadyHasShift = validatedShifts.some(s => s.assignedToId === employeeId && s.shiftDate === sundayDate);
        if (!alreadyHasShift) {
          const mCount = validatedShifts.filter(s => s.shiftDate === sundayDate && s.shiftType === 'morning').length;
          const eCount = validatedShifts.filter(s => s.shiftDate === sundayDate && s.shiftType === 'evening').length;
          const shiftType = mCount <= eCount ? 'morning' : 'evening';

          const isFTEmp = emp.employmentType !== 'parttime';
          validatedShifts.push({
            shiftDate: sundayDate,
            assignedToId: employeeId,
            shiftType,
            status: 'draft',
            startTime: normalizeTime(shiftType === 'morning' ? bOpen : `${String(bMidHr).padStart(2,'0')}:00`),
            endTime: normalizeTime(shiftType === 'morning' ? `${String(bOpenHr + (isFTEmp ? 8 : 4)).padStart(2,'0')}:${isFTEmp ? '30' : '00'}` : `${String(Math.min(bMidHr + (isFTEmp ? 8 : 4), bCloseHr)).padStart(2,'0')}:${isFTEmp ? '30' : '00'}`),
            breakStartTime: normalizeTime(`${String((shiftType === 'morning' ? bOpenHr : bMidHr) + 4).padStart(2,'0')}:00`),
            breakEndTime: normalizeTime(`${String((shiftType === 'morning' ? bOpenHr : bMidHr) + 5).padStart(2,'0')}:00`),
          });
        }
      }
    }

    // FINAL VALIDATION PASS: Ensure no employee exceeds target days
    for (const emp of employees) {
      const employeeId = String(emp.id);
      const targetDays = emp.employmentType === 'parttime' ? 3 : 6;
      const empShiftCount = validatedShifts.filter(s => s.assignedToId === employeeId).length;
      
      if (empShiftCount > targetDays) {
        console.log(`Final trim: ${emp.name} has ${empShiftCount}/${targetDays} shifts, removing ${empShiftCount - targetDays}`);
        let toRemove = empShiftCount - targetDays;
        const dayPriority = [1, 2, 3, 4];
        for (const dayTarget of dayPriority) {
          if (toRemove <= 0) break;
          for (let i = validatedShifts.length - 1; i >= 0; i--) {
            if (toRemove <= 0) break;
            if (validatedShifts[i].assignedToId === employeeId) {
              const dow = new Date(validatedShifts[i].shiftDate).getDay();
              if (dow === dayTarget) {
                validatedShifts.splice(i, 1);
                toRemove--;
              }
            }
          }
        }
      }
    }

    // Remove any remaining duplicates (same employee, same date)
    const seenShifts = new Set<string>();
    for (let i = validatedShifts.length - 1; i >= 0; i--) {
      const key = `${validatedShifts[i].assignedToId}_${validatedShifts[i].shiftDate}`;
      if (seenShifts.has(key)) {
        console.log(`Removing duplicate: ${key}`);
        validatedShifts.splice(i, 1);
      } else {
        seenShifts.add(key);
      }
    }

    const finalPlannedCount = new Set(validatedShifts.map(s => s.assignedToId)).size;
    console.log(`Final: ${validatedShifts.length} vardiya, ${finalPlannedCount}/${employees.length} personel`);

    res.json({
      recommendations: validatedShifts,
      summary: aiPlan.summary || '',
      totalShifts: validatedShifts.length,
      cached: aiPlan.cached || false,
      weekStart,
      weekEnd,
    });
  } catch (error: any) {
    console.error("Error generating shift recommendations:", error);
    const message = error instanceof Error ? error.message : "Vardiya önerileri oluşturulamadı";
    res.status(500).json({ message });
  }
});

// POST /api/shift-attendance/check-in/nfc - NFC check-in
router.post('/api/shift-attendance/check-in/nfc', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const { location } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: "Konum gereklidir" });
    }

    const userShifts = await db.query.shifts.findMany({
      where: eq(shifts.assignedToId, user.id),
    });

    if (!userShifts || userShifts.length === 0) {
      return res.status(400).json({ message: "Atanmış vardiya bulunamadı" });
    }

    const shift = userShifts[0];
    const now = new Date();

    const existingAttendances = await storage.getShiftAttendances(shift.id);
    const userAttendance = existingAttendances.find(a => a.userId === user.id);

    const attendanceData: any = {
      checkInTime: now,
      status: 'checked_in',
      checkInLatitude: location.latitude.toString(),
      checkInLongitude: location.longitude.toString(),
      checkInMethod: 'nfc',
    };

    let attendance;
    if (userAttendance) {
      attendance = await storage.updateShiftAttendance(userAttendance.id, attendanceData);
    } else {
      attendance = await storage.createShiftAttendance({
        shiftId: shift.id,
        userId: user.id,
        ...attendanceData,
      });
    }

    res.status(201).json(attendance);
  } catch (error: any) {
    console.error("Error NFC check-in:", error);
    res.status(500).json({ message: "NFC giriş yapılamadı" });
  }
});

// POST /api/shift-corrections - Create shift correction
router.post('/api/shift-corrections', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    
    if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'admin'].includes(role)) {
      return res.status(403).json({ message: "Vardiya düzeltme yetkiniz yok" });
    }
    
    const { shiftId, sessionId, employeeId, correctionType, fieldChanged, oldValue, newValue, reason, branchId } = req.body;
    
    if (!employeeId || !correctionType || !fieldChanged || !reason) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik: employeeId, correctionType, fieldChanged, reason" });
    }
    
    const [correction] = await db.insert(shiftCorrections)
      .values({
        shiftId: shiftId || null,
        sessionId: sessionId || null,
        correctedById: user.id,
        employeeId,
        correctionType,
        fieldChanged,
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason,
        branchId: branchId || user.branchId || null,
      })
      .returning();
    
    try {
      await storage.createNotification({
        userId: employeeId,
        type: 'shift_correction',
        title: 'Vardiya Düzeltmesi',
        message: `${fieldChanged} alanı düzeltildi. Neden: ${reason}`,
        link: '/vardiyalarim',
        branchId: branchId || user.branchId,
      });
    } catch (e) { console.error("Shift correction notification error:", e); }
    
    res.status(201).json(correction);
  } catch (error: any) {
    console.error("Error creating shift correction:", error);
    res.status(500).json({ message: "Vardiya düzeltmesi kaydedilemedi" });
  }
});

// GET /api/shift-corrections - Get shift correction history
router.get('/api/shift-corrections', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;
    const { employeeId, shiftId, branchId } = req.query;
    
    let query = db.select({
      correction: shiftCorrections,
      correctedBy: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
      },
    })
    .from(shiftCorrections)
    .leftJoin(users, eq(shiftCorrections.correctedById, users.id));
    
    const conditions: any[] = [];
    if (employeeId) conditions.push(eq(shiftCorrections.employeeId, employeeId as string));
    if (shiftId) conditions.push(eq(shiftCorrections.shiftId, parseInt(shiftId as string)));
    if (branchId) conditions.push(eq(shiftCorrections.branchId, parseInt(branchId as string)));
    
    if (!isHQRole(role)) {
      if (user.branchId) {
        conditions.push(eq(shiftCorrections.branchId, user.branchId));
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await (query as any).orderBy(desc(shiftCorrections.createdAt)).limit(100);
    res.json(results);
  } catch (error: any) {
    console.error("Error fetching shift corrections:", error);
    res.status(500).json({ message: "Vardiya düzeltme geçmişi yüklenemedi" });
  }
});

// GET /api/shift-corrections/abuse-report - Get abuse report
router.get('/api/shift-corrections/abuse-report', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    const role = user.role as UserRoleType;

    if (!isHQRole(role) && role !== 'yatirimci') {
      return res.status(403).json({ message: "Bu raporu görüntüleme yetkiniz yok" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const correctionStatsResult = await db.execute(sql`
      SELECT 
        sc.corrected_by_id as "correctedById",
        u.first_name as "correctorFirstName",
        u.last_name as "correctorLastName",
        COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, '') as "correctorFullName",
        sc.branch_id as "branchId",
        count(*)::int as "totalCorrections",
        count(distinct sc.employee_id)::int as "uniqueEmployees"
      FROM shift_corrections sc
      LEFT JOIN users u ON u.id = sc.corrected_by_id
      WHERE sc.created_at >= ${thirtyDaysAgo}
      GROUP BY sc.corrected_by_id, u.first_name, u.last_name, sc.branch_id
    `);
    const correctionStats: any[] = Array.isArray(correctionStatsResult) 
      ? correctionStatsResult 
      : ((correctionStatsResult as any)?.rows ?? []);

    const employeeFocusResult = await db.execute(sql`
      SELECT 
        sc.corrected_by_id as "correctedById",
        sc.employee_id as "employeeId",
        emp.first_name as "employeeFirstName",
        emp.last_name as "employeeLastName",
        count(*)::int as "correctionCount"
      FROM shift_corrections sc
      LEFT JOIN users emp ON emp.id = sc.employee_id
      WHERE sc.created_at >= ${thirtyDaysAgo}
      GROUP BY sc.corrected_by_id, sc.employee_id, emp.first_name, emp.last_name
    `);
    const employeeFocusStats: any[] = Array.isArray(employeeFocusResult) 
      ? employeeFocusResult 
      : ((employeeFocusResult as any)?.rows ?? []);

    const TOTAL_THRESHOLD = 10;
    const PER_PERSON_THRESHOLD = 5;

    const alerts: any[] = [];

    for (const stat of correctionStats) {
      if (stat.totalCorrections >= TOTAL_THRESHOLD) {
        alerts.push({
          type: 'excessive_total',
          severity: stat.totalCorrections >= TOTAL_THRESHOLD * 2 ? 'critical' : 'warning',
          correctedById: stat.correctedById,
          correctorName: stat.correctorFullName || `${stat.correctorFirstName || ''} ${stat.correctorLastName || ''}`.trim(),
          branchId: stat.branchId,
          totalCorrections: stat.totalCorrections,
          uniqueEmployees: stat.uniqueEmployees,
          message: `Son 30 günde ${stat.totalCorrections} vardiya düzeltmesi yapıldı (${stat.uniqueEmployees} farklı personel)`,
        });
      }
    }

    for (const stat of employeeFocusStats) {
      if (stat.correctionCount >= PER_PERSON_THRESHOLD) {
        const corrector = correctionStats.find(c => c.correctedById === stat.correctedById);
        alerts.push({
          type: 'person_focused',
          severity: stat.correctionCount >= PER_PERSON_THRESHOLD * 2 ? 'critical' : 'warning',
          correctedById: stat.correctedById,
          correctorName: corrector?.correctorFullName || `${corrector?.correctorFirstName || ''} ${corrector?.correctorLastName || ''}`.trim(),
          employeeId: stat.employeeId,
          employeeName: `${stat.employeeFirstName || ''} ${stat.employeeLastName || ''}`.trim(),
          branchId: corrector?.branchId,
          correctionCount: stat.correctionCount,
          message: `Aynı personel için son 30 günde ${stat.correctionCount} düzeltme yapıldı - pozitif ayrımcılık riski`,
        });
      }
    }

    res.json({
      period: '30_days',
      thresholds: { total: TOTAL_THRESHOLD, perPerson: PER_PERSON_THRESHOLD },
      stats: correctionStats,
      alerts,
      totalAlerts: alerts.length,
    });
  } catch (error: any) {
    console.error("Error generating abuse report:", error);
    res.status(500).json({ message: "Suistimal raporu oluşturulamadı" });
  }
});

export default router;
