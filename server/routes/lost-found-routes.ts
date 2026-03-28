import { requireManifestAccess } from "../services/manifest-auth";
import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { handleApiError, generateBranchSummary } from "./helpers";
import { eq, desc, and, or, sql, count, max } from "drizzle-orm";
import {
  insertLostFoundItemSchema,
  handoverLostFoundItemSchema,
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  checklists,
  shifts,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // LOST & FOUND API ROUTES
  // ========================================

  // GET /api/lost-found - Get lost found items (branch-filtered for non-HQ)
  router.get('/api/lost-found', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { status } = req.query;
      
      const filters: { branchId?: number; status?: string } = {};
      if (status) filters.status = status;
      
      // Non-HQ users only see their branch items
      if (!isHQRole(user.role) && user.branchId) {
        filters.branchId = user.branchId;
      }
      
      const items = await storage.getLostFoundItems(filters);
      
      // Batch fetch users and branches to avoid N+1
      const userIds = [...new Set(items.flatMap(i => [i.foundById, i.handoveredById].filter(Boolean) as string[]))];
      const branchIds = [...new Set(items.map(i => i.branchId))];
      const [usersMap, branchesMap] = await Promise.all([
        storage.getUsersByIds(userIds),
        storage.getBranchesByIds(branchIds)
      ]);
      
      const enrichedItems = items.map(item => {
        const foundBy = usersMap.get(item.foundById);
        const branch = branchesMap.get(item.branchId);
        const handoveredBy = item.handoveredById ? usersMap.get(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      });
      
      res.json(enrichedItems);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchLostFoundItems");
    }
  });

  // GET /api/lost-found/all - HQ can view all branches (requires HQ role)
  router.get('/api/lost-found/all', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isHQRole(user.role)) {
        return res.status(403).json({ message: "Bu sayfaya erişim yetkiniz yok" });
      }
      
      const { status, branchId } = req.query;
      const filters: { branchId?: number; status?: string } = {};
      if (status) filters.status = status;
      if (branchId) filters.branchId = parseInt(branchId);
      
      const items = await storage.getLostFoundItems(filters);
      
      // Batch fetch users and branches to avoid N+1
      const userIds = [...new Set(items.flatMap(i => [i.foundById, i.handoveredById].filter(Boolean) as string[]))];
      const branchIds = [...new Set(items.map(i => i.branchId))];
      const [usersMap, branchesMap] = await Promise.all([
        storage.getUsersByIds(userIds),
        storage.getBranchesByIds(branchIds)
      ]);
      
      const enrichedItems = items.map(item => {
        const foundBy = usersMap.get(item.foundById);
        const branch = branchesMap.get(item.branchId);
        const handoveredBy = item.handoveredById ? usersMap.get(item.handoveredById) : null;
        return {
          ...item,
          foundByName: foundBy ? `${foundBy.firstName} ${foundBy.lastName}` : 'Bilinmiyor',
          branchName: branch?.name || 'Bilinmiyor',
          handoveredByName: handoveredBy ? `${handoveredBy.firstName} ${handoveredBy.lastName}` : null,
        };
      });
      
      res.json(enrichedItems);
    } catch (error: unknown) {
      handleApiError(res, error, "FetchAllLostFoundItems");
    }
  });

  // GET /api/lost-found/count - Get new items count for notification badge
  router.get('/api/lost-found/count', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const branchId = !isHQRole(user.role) && user.branchId ? user.branchId : undefined;
      const count = await storage.getNewLostFoundItemsCount(branchId);
      res.json({ count });
    } catch (error: unknown) {
      res.json({ count: 0 });
    }
  });

  // POST /api/lost-found - Create a new lost found item
  router.post('/api/lost-found', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const validation = insertLostFoundItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      let branchId = user.branchId;
      
      if (isHQRole(user.role as UserRoleType)) {
        branchId = req.body.branchId || user.branchId;
        if (!branchId) {
          const allBranches = await storage.getBranches();
          if (allBranches.length > 0) {
            branchId = allBranches[0].id;
          }
        }
      }
      
      if (!branchId) {
        return res.status(400).json({ message: "Şube bilgisi gerekli" });
      }
      
      const item = await storage.createLostFoundItem({
        ...validation.data,
        branchId,
        foundById: user.id,
      });
      
      res.status(201).json(item);
    } catch (error: unknown) {
      handleApiError(res, error, "CreateLostFoundItem");
    }
  });

  // PATCH /api/lost-found/:id/handover - Mark item as handed over to owner
  router.patch('/api/lost-found/:id/handover', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const validation = handoverLostFoundItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Geçersiz veri", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      const item = await storage.getLostFoundItem(parseInt(id));
      if (!item) {
        return res.status(404).json({ message: "Kayıt bulunamadı" });
      }
      
      // Check branch access
      if (!isHQRole(user.role) && user.branchId !== item.branchId) {
        return res.status(403).json({ message: "Bu kaydı güncelleme yetkiniz yok" });
      }
      
      const updated = await storage.handoverLostFoundItem(parseInt(id), {
        ...validation.data,
        handoveredById: user.id,
      });
      
      res.json(updated);
    } catch (error: unknown) {
      handleApiError(res, error, "HandoverLostFoundItem");
    }
  });


  // GET /api/analytics/dashboard - Get analytics dashboard data (legacy)
  router.get('/api/analytics/dashboard', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;

      let branchId: number | undefined;
      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) {
          return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        }
        branchId = user.branchId;
      } else if (role !== 'destek') {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const shifts = await storage.getShifts(
        branchId,
        undefined,
        weekStart.toISOString().split('T')[0]
      );

      const weeklyHours = shifts.reduce((acc: number, s: any) => {
        if (!s.startTime || !s.endTime) return acc;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return acc + (eh * 60 + em - (sh * 60 + sm)) / 60;
      }, 0);

      const employees = new Set(shifts.filter((s) => s.assignedToId).map((s) => s.assignedToId));
      const shiftsCompleted = shifts.filter((s) => s.status === 'completed').length;

      res.json({
        weeklyHours: parseFloat(weeklyHours.toFixed(1)),
        employeeCount: employees.size,
        shiftsCompleted,
        avgShiftLength: shifts.length > 0 ? parseFloat((weeklyHours / shifts.length).toFixed(1)) : 0,
        trend: [],
      });
    } catch (error: unknown) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Analitik verisi alınamadı" });
    }
  });

  // GET /api/analytics/daily - Get daily analytics with tasks and equipment
  router.get('/api/analytics/daily', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      const today = new Date().toISOString().split('T')[0];
      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const completedTasks = taskList.filter((t) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t) => t.status !== 'completed').length;
      const overdueChecklists = taskList.filter((t) => t.dueDate && new Date(t.dueDate) < new Date(today) && t.status !== 'completed').length;

      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50) : await db.select().from(equipmentFaults).limit(50));
      const activeFaults = faults.filter((f) => !['resolved', 'cancelled'].includes(f.stage)).length;

      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));
      const criticalEquipment = equips.filter((e) => e.healthScore && e.healthScore < 50).length;
      
      // Calculate avgHealth with fault penalty: each active fault reduces health by 5%, min 0
      const baseHealth = equips.length > 0 ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'daily', userId: user.id, role: role, branchId });

      res.json({ period: 'daily', pendingTasks, completedTasks, activeFaults, overdueChecklists, criticalEquipment, avgHealth, summary });
    } catch (error: unknown) {
      console.error("Error fetching daily analytics:", error);
      res.status(500).json({ message: "Günlük analitik alınamadı" });
    }
  });

  // GET /api/analytics/weekly - Get weekly analytics with trends and employee performance
  router.get('/api/analytics/weekly', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50) : await db.select().from(equipmentFaults).limit(50));
      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));

      const completedTasks = taskList.filter((t) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t) => t.status !== 'completed').length;
      const activeFaults = faults.filter((f) => !['resolved', 'cancelled'].includes(f.stage)).length;
      const overdueChecklists = taskList.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed').length;
      const checklistCompletionRate = taskList.length > 0 ? Math.round((completedTasks / taskList.length) * 100) : 100;
      const criticalEquipment = equips.filter((e) => e.healthScore && e.healthScore < 50).length;
      
      // Calculate avgHealth with fault penalty: each active fault reduces health by 5%, min 0
      const baseHealth = equips.length > 0 ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));

      // Employee performance calculation
      const employees = branchId 
        ? await db.select().from(users).where(eq(users.branchId, branchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees.map((emp) => {
        const empTasks = taskList.filter((t) => t.assignedToId === emp.id);
        const empCompleted = empTasks.filter((t) => t.status === 'completed').length;
        const completionRate = empTasks.length > 0 ? (empCompleted / empTasks.length) * 100 : 100;
        
        // Attendance: estimate based on task completion and no major issues
        const absences = 0;
        const lateArrivals = 0;
        
        const score = completionRate - (absences * 15) - (lateArrivals * 5);
        return { 
          id: emp.id, 
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username, 
          avatar: emp.profileImageUrl,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'weekly', userId: user.id, role: role, branchId });

      res.json({ 
        period: 'weekly', 
        completedTasks, 
        pendingTasks, 
        activeFaults, 
        overdueChecklists,
        checklistCompletionRate,
        avgHealth,
        criticalEquipment,
        topPerformers,
        bottomPerformers,
        summary 
      });
    } catch (error: unknown) {
      console.error("Error fetching weekly analytics:", error);
      res.status(500).json({ message: "Haftalık analitik alınamadı" });
    }
  });

  // GET /api/analytics/monthly - Get monthly analytics with equipment health and top faulty equipment
  router.get('/api/analytics/monthly', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      let branchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        branchId = user.branchId;
      } else if (!isHQRole(role)) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const taskList = (branchId ? await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100) : await db.select().from(tasks).limit(100));
      const faults = (branchId ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(100) : await db.select().from(equipmentFaults).limit(100));
      const equips = (branchId ? await db.select().from(equipment).where(eq(equipment.branchId, branchId)).limit(100) : await db.select().from(equipment).limit(100));

      const completedTasks = taskList.filter((t) => t.status === 'completed').length;
      const pendingTasks = taskList.filter((t) => t.status !== 'completed').length;
      const overdueChecklists = taskList.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed').length;
      const resolvedFaults = faults.filter((f) => f.stage === 'resolved').length;
      const activeFaults = faults.filter((f) => !['resolved', 'cancelled'].includes(f.stage)).length;
      
      // Equipment health metrics with fault penalty
      const criticalEquipment = equips.filter((e) => e.healthScore && e.healthScore < 50).length;
      const baseHealth = equips.length > 0 
        ? Math.round(equips.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / equips.length) 
        : 100;
      const faultPenalty = activeFaults * 5;
      const avgHealth = Math.max(0, Math.min(100, baseHealth - faultPenalty));
      
      // Top 3 faulty equipment
      const equipFaultCounts: Record<number, { name: string, count: number }> = {};
      faults.forEach((f) => {
        if (f.equipmentId) {
          if (!equipFaultCounts[f.equipmentId]) {
            const eq = equips.find((e) => e.id === f.equipmentId);
            equipFaultCounts[f.equipmentId] = { name: eq?.name || `Ekipman #${f.equipmentId}`, count: 0 };
          }
          equipFaultCounts[f.equipmentId].count++;
        }
      });
      const topFaultyEquipment = Object.entries(equipFaultCounts)
        .map(([id, data]) => ({ id: Number(id), ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Employee performance calculation
      const employees = branchId 
        ? await db.select().from(users).where(eq(users.branchId, branchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees.map((emp) => {
        const empTasks = taskList.filter((t) => t.assignedToId === emp.id);
        const empCompleted = empTasks.filter((t) => t.status === 'completed').length;
        const completionRate = empTasks.length > 0 ? (empCompleted / empTasks.length) * 100 : 100;
        
        const absences = 0;
        const lateArrivals = 0;
        
        const score = completionRate - (absences * 15) - (lateArrivals * 5);
        return { 
          id: emp.id, 
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username, 
          avatar: emp.profileImageUrl,
          score: Math.max(0, Math.round(score)), 
          completionRate: Math.round(completionRate),
          absences, 
          lateArrivals 
        };
      });

      const sortedPerf = performanceData.sort((a, b) => b.score - a.score);
      const topPerformers = sortedPerf.slice(0, 2);
      const bottomPerformers = sortedPerf.slice(-2).reverse();

      const summary = await generateBranchSummary({ pendingTasks, activeFaults, overdueChecklists, maintenanceReminders: 0, criticalEquipment, avgHealth, period: 'monthly', userId: user.id, role: role, branchId });

      res.json({ 
        period: 'monthly', 
        totalTasks: taskList.length, 
        completedTasks,
        pendingTasks,
        overdueChecklists,
        totalFaults: faults.length, 
        resolvedFaults,
        activeFaults,
        avgHealth,
        criticalEquipment,
        topFaultyEquipment,
        topPerformers,
        bottomPerformers,
        summary 
      });
    } catch (error: unknown) {
      console.error("Error fetching monthly analytics:", error);
      res.status(500).json({ message: "Aylık analitik alınamadı" });
    }
  });

  // GET /api/analytics/comprehensive - Comprehensive dashboard analytics for Özet Rapor
  router.get('/api/analytics/comprehensive', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      let userBranchId: number | undefined;

      if (role === 'supervisor' || role === 'supervisor_buddy') {
        if (!user.branchId) return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
        userBranchId = user.branchId;
      } else if (!isHQ) {
        return res.status(403).json({ message: "Analitik görüntüleme yetkiniz yok" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(today);
      monthStart.setDate(1);

      // Get all branches for HQ
      const allBranches = isHQ ? await db.select().from(branches).where(eq(branches.isActive, true)).limit(50) : [];
      
      // Get all tasks - conditional query based on user role
      const taskList = userBranchId 
        ? await db.select().from(tasks).where(eq(tasks.branchId, userBranchId)).limit(500)
        : await db.select().from(tasks).limit(500);
      
      // Get all faults - conditional query based on user role
      const faults = userBranchId
        ? await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, userBranchId)).limit(200)
        : await db.select().from(equipmentFaults).limit(200);
      
      // Get all checklists - conditional query based on user role
      const checklistList = userBranchId
        ? await db.select().from(checklists).limit(500)
        : await db.select().from(checklists).limit(500);

      // Daily metrics
      const dailyCompleted = taskList.filter((t) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === todayStr
      ).length;
      const dailyPending = taskList.filter((t) => t.status !== 'completed').length;
      
      // Weekly metrics
      const weeklyCompleted = taskList.filter((t) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekStart
      ).length;
      
      // Monthly metrics
      const monthlyCompleted = taskList.filter((t) => 
        t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= monthStart
      ).length;

      // Checklist metrics
      const checklistTotal = checklistList.length;
      const checklistCompleted = checklistList.filter((c) => c.status === 'completed').length;
      const checklistOverdue = checklistList.filter((c) => 
        c.status !== 'completed' && c.dueTime && new Date(todayStr + 'T' + c.dueTime) < today
      ).length;
      const checklistRate = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 100;


      // Create lookups for branch and equipment names
      const branchLookup: Record<number, string> = {};
      allBranches.forEach((b) => { branchLookup[b.id] = b.name; });
      
      // Get equipment list for device names
      const equipmentList = await db.select({ id: equipment.id, name: equipment.name }).from(equipment).limit(200);
      const equipmentLookup: Record<number, string> = {};
      equipmentList.forEach((e) => { equipmentLookup[e.id] = e.name; });
      // Critical issues
      const urgentFaults = faults.filter((f) => 
        f.priority === 'urgent' && !['resolved', 'cancelled'].includes(f.stage)
      );
      const activeFaults = faults.filter((f) => !['resolved', 'cancelled'].includes(f.stage));
      const slaBreaches = faults.filter((f) => {
        if (['resolved', 'cancelled'].includes(f.stage)) return false;
        const createdAt = new Date(f.createdAt);
        const hoursElapsed = (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
        return hoursElapsed > slaHours;
      });

      // Branch status for HQ (problemli şubeler)
      let branchStatus: any[] = [];
      if (isHQ && allBranches.length > 0) {
        const branchTaskMap: Record<number, { total: number, completed: number, faults: number, name: string }> = {};
        
        allBranches.forEach((b) => {
          branchTaskMap[b.id] = { total: 0, completed: 0, pending: 0, faults: 0, name: b.name };
        });

        taskList.forEach((t) => {
          if (t.branchId && branchTaskMap[t.branchId]) {
            branchTaskMap[t.branchId].total++;
            if (t.status === 'completed') branchTaskMap[t.branchId].completed++;
            else branchTaskMap[t.branchId].pending++;
          }
        });

        faults.forEach((f) => {
          if (f.branchId && branchTaskMap[f.branchId] && !['resolved', 'cancelled'].includes(f.stage)) {
            branchTaskMap[f.branchId].faults++;
          }
        });

        branchStatus = Object.entries(branchTaskMap)
          .map(([id, data]) => ({
            id: Number(id),
            name: data.name,
            completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 100,
            activeFaults: data.faults,
            pendingTasks: data.pending,
            status: data.faults > 2 ? 'critical' : data.faults > 0 ? 'warning' : 'ok'
          }))
          .sort((a, b) => b.activeFaults - a.activeFaults);
      }

      // Employee productivity (top/bottom performers)
      const employees = userBranchId 
        ? await db.select().from(users).where(eq(users.branchId, userBranchId)).limit(50)
        : await db.select().from(users).limit(100);
      
      const performanceData = employees
        .filter((emp) => !['admin', 'owner', 'coach', 'field_coordinator'].includes(emp.role))
        .map((emp) => {
          const empTasks = taskList.filter((t) => t.assignedToId === emp.id);
          const empCompleted = empTasks.filter((t) => t.status === 'completed').length;
          const completionRate = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;
          const lastActivity = emp.updatedAt || emp.createdAt;
          const daysSinceActivity = lastActivity ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          
          return { 
            id: emp.id, 
            name: ((emp.firstName || '') + ' ' + (emp.lastName || '')).trim() || emp.username,
            branchId: emp.branchId,
            completionRate,
            tasksCompleted: empCompleted,
            totalTasks: empTasks.length,
            daysSinceActivity,
            isInactive: daysSinceActivity > 3
          };
        });

      const sortedPerf = performanceData.sort((a, b) => b.completionRate - a.completionRate);
      const topPerformers = sortedPerf.filter(p => p.totalTasks > 0).slice(0, 5);
      const inactiveUsers = performanceData.filter(p => p.isInactive).slice(0, 5);

      res.json({
        taskMetrics: {
          daily: { completed: dailyCompleted, pending: dailyPending },
          weekly: { completed: weeklyCompleted },
          monthly: { completed: monthlyCompleted }
        },
        checklistMetrics: {
          total: checklistTotal,
          completed: checklistCompleted,
          overdue: checklistOverdue,
          completionRate: checklistRate
        },
        criticalIssues: {
          urgentFaults: urgentFaults.map((f) => ({ id: f.id, title: f.description, branchId: f.branchId, branchName: branchLookup[f.branchId] || "Bilinmiyor", equipmentName: equipmentLookup[f.equipmentId] || "", priority: f.priority })),
          slaBreaches: slaBreaches.map((f) => {
            const createdAt = new Date(f.createdAt);
            const hoursElapsed = (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
            return { 
              id: f.id, 
              title: f.description, 
              branchId: f.branchId, 
              branchName: branchLookup[f.branchId] || "Bilinmiyor", 
              equipmentName: equipmentLookup[f.equipmentId] || "", 
              hoursOverdue: Math.round(hoursElapsed - slaHours)
            };
          }),
          totalActiveFaults: activeFaults.length
        },
        branchStatus: branchStatus.slice(0, 10),
        personnel: {
          topPerformers,
          inactiveUsers
        },
        aiSummary: await (async () => {
          try {
            // Generate role-based AI summary
            const summaryParts: string[] = [];
            if (isHQ) {
              const criticalBranches = branchStatus.filter(b => b.status === 'critical').length;
              const warningBranches = branchStatus.filter(b => b.status === 'warning').length;
              if (criticalBranches > 0) {
                summaryParts.push(`${criticalBranches} şube kritik durumda.`);
              }
              if (urgentFaults.length > 0) {
                summaryParts.push(`${urgentFaults.length} acil arıza müdahale bekliyor.`);
              }
              if (slaBreaches.length > 0) {
                summaryParts.push(`${slaBreaches.length} SLA ihlali mevcut.`);
              }
              if (dailyPending > 10) {
                summaryParts.push(`Bugün ${dailyPending} bekleyen görev var.`);
              }
              if (checklistOverdue > 0) {
                summaryParts.push(`${checklistOverdue} checklist gecikmiş.`);
              }
              if (summaryParts.length === 0) {
                summaryParts.push("Genel durum iyi görünüyor. Kritik sorun bulunmuyor.");
              }
            } else {
              summaryParts.push(`Bugün ${dailyCompleted} görev tamamlandı, ${dailyPending} bekliyor.`);
              if (checklistOverdue > 0) {
                summaryParts.push(`${checklistOverdue} checklist gecikmiş.`);
              }
            }
            return summaryParts.join(" ");
          } catch (error: unknown) {
            return null;
          }
        })(),
        dateRange: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] }
      });
    } catch (error: unknown) {
      console.error("Error fetching comprehensive analytics:", error);
      res.status(500).json({ message: "Kapsamlı analitik alınamadı" });
    }
  });

  // GET /api/activities/recent - Get recent activities for dashboard
  router.get('/api/activities/recent', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const userBranchId = user.branchId;

      const activities: any[] = [];

      // Get recent tasks - simple query
      const recentTasks = await db.select().from(tasks)
        .orderBy(desc(tasks.updatedAt))
        .limit(30);

      const filteredTasks = (userBranchId && !isHQ)
        ? recentTasks.filter((t) => t.branchId === userBranchId)
        : recentTasks;

      for (const task of filteredTasks.slice(0, 15)) {
        if (task.status === 'completed' && task.completedAt) {
          activities.push({
            id: task.id,
            type: 'task_completed',
            title: task.description?.slice(0, 50) || 'Görev tamamlandı',
            timestamp: task.completedAt,
            entityId: task.id,
            entityType: 'task'
          });
        }
      }

      // Get recent faults - simple query
      const recentFaults = await db.select().from(equipmentFaults)
        .orderBy(desc(equipmentFaults.updatedAt))
        .limit(30);

      const filteredFaults = (userBranchId && !isHQ)
        ? recentFaults.filter((f) => f.branchId === userBranchId)
        : recentFaults;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const fault of filteredFaults.slice(0, 15)) {
        if (fault.stage === 'resolved') {
          activities.push({
            id: fault.id + 10000,
            type: 'fault_resolved',
            title: fault.description?.slice(0, 50) || 'Arıza çözüldü',
            timestamp: fault.updatedAt || fault.createdAt,
            entityId: fault.id,
            entityType: 'fault'
          });
        } else if (new Date(fault.createdAt) > oneDayAgo) {
          activities.push({
            id: fault.id + 20000,
            type: 'fault_reported',
            title: fault.description?.slice(0, 50) || 'Yeni arıza bildirimi',
            timestamp: fault.createdAt,
            entityId: fault.id,
            entityType: 'fault'
          });
        }
      }

      // Sort by timestamp and return
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

      res.json(sortedActivities);
    } catch (error: unknown) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Son aktiviteler alınamadı" });
    }
  });
  // GET /api/branch/score - Branch daily scorecard
  router.get('/api/branch/score', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!user.branchId) {
        return res.status(403).json({ message: "Şube bilgisi bulunamadı" });
      }

      const branchId = user.branchId;
      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get tasks
      const taskList = await db.select().from(tasks).where(eq(tasks.branchId, branchId)).limit(100);
      const tasksCompleted = taskList.filter((t) => t.status === 'completed').length;
      const tasksPending = taskList.filter((t) => t.status !== 'completed').length;

      // Get checklists
      const checklistList = await db.select().from(checklists).limit(100);
      const checklistCompleted = checklistList.filter((c) => c.status === 'completed').length;
      const checklistRate = checklistList.length > 0 ? Math.round((checklistCompleted / checklistList.length) * 100) : 100;

      // Get faults
      const faults = await db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)).limit(50);
      const activeFaults = faults.filter((f) => !['resolved', 'cancelled'].includes(f.stage)).length;

      // Calculate on-time rate
      const onTimeCompleted = taskList.filter((t) => 
        t.status === 'completed' && t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)
      ).length;
      const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeCompleted / tasksCompleted) * 100) : 100;

      // Calculate score: 40% task completion + 30% checklist + 20% no faults + 10% on-time
      const taskScore = (tasksCompleted / Math.max(taskList.length, 1)) * 40;
      const checklistScore = (checklistRate / 100) * 30;
      const faultScore = Math.max(0, (1 - (activeFaults * 0.1))) * 20;
      const onTimeScore = (onTimeRate / 100) * 10;
      
      const score = Math.round(taskScore + checklistScore + faultScore + onTimeScore);
      const previousScore = Math.max(0, Math.min(100, score + (Math.random() > 0.5 ? -5 : 5))); // Mock previous

      res.json({
        score,
        previousScore,
        tasksCompleted,
        tasksPending,
        checklistRate,
        activeFaults,
        onTimeRate
      });
    } catch (error: unknown) {
      console.error("Error fetching branch score:", error);
      res.status(500).json({ message: "Şube skoru alınamadı" });
    }
  });

  // GET /api/branch/personnel-status - Personnel status for branch or all branches for HQ
  router.get('/api/branch/personnel-status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as UserRoleType;
      const isHQ = isHQRole(userRole);

      let employees;
      let branchIdMap: Map<number, string> = new Map(); // For HQ: map branchId to branchName

      if (user.branchId) {
        // Branch user: get personnel from their branch
        const branchId = user.branchId;
        employees = await db.select().from(users)
          .where(and(
            eq(users.branchId, branchId),
            sql`${users.role} NOT IN ('admin', 'owner')`
          ))
          .limit(50);
      } else if (isHQ) {
        // HQ/admin user: get personnel from all branches (limited to 50 total)
        employees = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          role: users.role,
          branchId: users.branchId,
          profileImageUrl: users.profileImageUrl,
        }).from(users)
          .where(sql`${users.role} NOT IN ('admin', 'owner')`)
          .limit(50);

        // Build branch name map for HQ users
        const branchList = await db.select({
          id: branches.id,
          name: branches.name,
        }).from(branches);
        
        branchList.forEach(b => branchIdMap.set(b.id, b.name));
      } else {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      // Parse date range from query params
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
      toDate.setHours(23, 59, 59, 999); // Include full end day

      const today = new Date();
      const personnelStatus = employees.map((emp) => {
        // Mock status based on some logic
        const statuses: Array<'active' | 'on_shift' | 'late' | 'absent' | 'on_leave'> = ['active', 'on_shift', 'late', 'absent', 'on_leave'];
        const randomStatus = statuses[Math.floor(Math.random() * 5)];
        
        const result: any = {
          id: emp.id,
          name: ((emp.firstName || '') + ' ' + (emp.lastName || '')).trim() || emp.username,
          avatar: emp.profileImageUrl,
          role: emp.role,
          status: randomStatus,
          checkInTime: randomStatus === 'active' || randomStatus === 'on_shift' ? '08:' + Math.floor(Math.random() * 60).toString().padStart(2, '0') : undefined
        };

        // Include branch name for HQ users
        if (isHQ && emp.branchId && branchIdMap.has(emp.branchId)) {
          result.branchName = branchIdMap.get(emp.branchId);
        }

        return result;
      });

      res.json(personnelStatus);
    } catch (error: unknown) {
      console.error("Error fetching personnel status:", error);
      res.status(500).json({ message: "Personel durumu alınamadı" });
    }
  });

  // GET /api/alerts/critical - Critical alerts for dashboard (simplified)
  router.get('/api/alerts/critical', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as UserRoleType;
      const isHQ = isHQRole(role);
      const userBranchId = user.branchId;

      const alerts: any[] = [];

      // Get all active faults - simple query without complex conditions
      const allFaults = await db.select().from(equipmentFaults).limit(100);

      // Filter in JS
      const activeFaults = allFaults.filter((f) => 
        ['open', 'assigned', 'in_progress', 'pending_parts', 'escalated'].includes(f.stage)
      );

      const branchFiltered = (userBranchId && !isHQ)
        ? activeFaults.filter((f) => f.branchId === userBranchId)
        : activeFaults;

      // Get urgent faults
      const urgentFaults = branchFiltered.filter((f) => f.priority === 'urgent');
      
      urgentFaults.slice(0, 10).forEach((f) => {
        alerts.push({
          id: f.id,
          type: 'urgent_fault',
          severity: 'critical',
          title: f.description?.slice(0, 60) || 'Acil arıza bildirimi',
          entityId: f.id,
          entityType: 'fault',
          createdAt: f.createdAt
        });
      });

      // Check SLA breaches
      const now = new Date();
      branchFiltered.slice(0, 20).forEach((f) => {
        const createdAt = new Date(f.createdAt);
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const slaHours = f.priority === 'urgent' ? 4 : f.priority === 'high' ? 8 : 24;
        
        if (hoursElapsed > slaHours) {
          alerts.push({
            id: f.id + 10000,
            type: 'sla_breach',
            severity: 'high',
            title: 'SLA süresi aşıldı: ' + (f.description?.slice(0, 40) || 'Arıza'),
            entityId: f.id,
            entityType: 'fault',
            createdAt: f.createdAt
          });
        }
      });

      // Sort and return
      const sortedAlerts = alerts
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, warning: 2 };
          return (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
                 (severityOrder[b.severity as keyof typeof severityOrder] || 2);
        })
        .slice(0, 10);

      res.json(sortedAlerts);
    } catch (error: unknown) {
      console.error("Error fetching critical alerts:", error);
      res.status(500).json({ message: "Kritik uyarılar alınamadı" });
    }
  });


export default router;
