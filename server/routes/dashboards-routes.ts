import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { handleApiError } from "./helpers";
import { eq, desc, and, sql, count } from "drizzle-orm";
import {
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  checklists,
  checklistCompletions,
  shifts,
  maintenanceSchedules,
  dashboardAlerts,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // ROLE TEMPLATES - Rol Şablonları API'leri
  // ========================================

  // ========================================
  // FACTORY PRODUCTION - Fabrika Üretim API'leri
  // ========================================







  // ===== EMPLOYEE DASHBOARD =====
  router.get('/api/employee-dashboard/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUser = req.user;
      const isOwnDashboard = currentUser.id === userId;
      if (!isOwnDashboard && !isHQRole(currentUser.role as SchemaUserRoleType)) {
        return res.status(403).json({ message: "Bu panele erişim yetkiniz yok" });
      }
      const todayStr = new Date().toISOString().split('T')[0];
      
      const [userData] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      }).from(users).where(eq(users.id, userId));
      
      if (!userData) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      const myShifts = await db.select({
        id: shifts.id,
        shiftDate: shifts.shiftDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        shiftType: shifts.shiftType,
        status: shifts.status,
      }).from(shifts).where(and(
        eq(shifts.assignedToId, userId),
        eq(shifts.shiftDate, todayStr)
      ));
      
      const myChecklists = await db.select({
        id: checklistCompletions.id,
        checklistId: checklistCompletions.checklistId,
        status: checklistCompletions.status,
        completedTasks: checklistCompletions.completedTasks,
        totalTasks: checklistCompletions.totalTasks,
        timeWindowStart: checklistCompletions.timeWindowStart,
        timeWindowEnd: checklistCompletions.timeWindowEnd,
        isLate: checklistCompletions.isLate,
        checklistTitle: checklists.title,
        checklistCategory: checklists.category,
      })
      .from(checklistCompletions)
      .leftJoin(checklists, eq(checklistCompletions.checklistId, checklists.id))
      .where(and(
        eq(checklistCompletions.userId, userId),
        eq(checklistCompletions.scheduledDate, todayStr)
      ));
      
      const myTasks = await db.select({
        id: tasks.id,
        title: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      }).from(tasks).where(and(
        eq(tasks.assignedToId, userId),
        sql`DATE(${tasks.dueDate}) = ${todayStr}`
      ));
      
      res.json({
        user: userData,
        myShifts,
        myChecklists,
        myTasks,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchEmployeeDashboard");
    }
  });

  // ===== HQ DASHBOARD SUMMARY =====
  router.get('/api/hq-dashboard-summary', isAuthenticated, async (req, res) => {
    const currentUser = req.user;
    if (!isHQRole(currentUser.role as SchemaUserRoleType)) {
      return res.status(403).json({ message: "Bu panele erişim yetkiniz yok" });
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const branchResult = await db.select({ count: sql<number>`count(*)::int` }).from(branches);
      const totalBranches = branchResult[0]?.count || 0;
      
      const employeeResult = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(
        eq(users.isActive, true),
        sql`${users.role} NOT IN ('admin', 'ceo', 'cgo')`,
        sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`
      ));
      const activeEmployees = employeeResult[0]?.count || 0;
      
      const checklistStats = await db.select({ 
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${checklistCompletions.status} IN ('completed', 'submitted', 'reviewed'))::int`
      }).from(checklistCompletions).where(eq(checklistCompletions.scheduledDate, todayStr));
      
      const openTasksResult = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(
        sql`${tasks.status} NOT IN ('completed', 'verified', 'cancelled')`,
        sql`DATE(${tasks.dueDate}) >= ${todayStr}`
      ));
      const openTasks = openTasksResult[0]?.count || 0;
      
      const alertsResult = await db.select({ 
        total: sql<number>`count(*)::int`,
        critical: sql<number>`count(*) FILTER (WHERE ${dashboardAlerts.severity} = 'critical')::int`
      }).from(dashboardAlerts).where(eq(dashboardAlerts.status, 'active'));
      
      const branchPerformance = await db.select({
        branchId: branches.id,
        branchName: branches.name,
        openTasks: sql<number>`count(${tasks.id}) FILTER (WHERE ${tasks.status} NOT IN ('completed', 'verified', 'cancelled'))::int`,
      }).from(branches)
      .leftJoin(tasks, eq(tasks.branchId, branches.id))
      .groupBy(branches.id, branches.name)
      .orderBy(sql`count(${tasks.id}) FILTER (WHERE ${tasks.status} NOT IN ('completed', 'verified', 'cancelled')) DESC`)
      .limit(10);

      const hqBranch = await db.select({ id: branches.id }).from(branches).where(sql`${branches.name} LIKE '%Merkez%' OR ${branches.name} LIKE '%HQ%'`).limit(1);
      const hqBranchId = hqBranch[0]?.id;

      let merkezStaff: any[] = [];
      if (hqBranchId) {
        const staffList = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        }).from(users).where(and(
          eq(users.branchId, hqBranchId),
          eq(users.isActive, true),
          sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`
        )).orderBy(users.role, users.lastName);

        const todayShifts = await db.select({
          assignedToId: shifts.assignedToId,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          shiftType: shifts.shiftType,
        }).from(shifts).where(and(
          eq(shifts.branchId, hqBranchId),
          eq(shifts.shiftDate, todayStr)
        ));

        const shiftMap = new Map<string, any>();
        for (const s of todayShifts) {
          if (s.assignedToId) shiftMap.set(s.assignedToId, s);
        }

        merkezStaff = staffList.map(staff => ({
          ...staff,
          todayShift: shiftMap.get(staff.id) || null,
        }));
      }
      
      let branchInfoGraphics: any[] = [];
      let criticalIssues: any[] = [];
      try {
      const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches)
        .where(sql`${branches.name} NOT LIKE '%Merkez%' AND ${branches.name} NOT LIKE '%HQ%' AND ${branches.name} NOT LIKE '%Fabrika%'`);
      
      for (const br of allBranches) {
        const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.branchId, br.id), eq(users.isActive, true), sql`${users.firstName} IS NOT NULL AND ${users.firstName} != ''`));
        const [shiftCount] = await db.select({ count: sql<number>`count(*)::int` }).from(shifts).where(and(eq(shifts.branchId, br.id), eq(shifts.shiftDate, todayStr)));
        const [clTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, br.id), eq(checklistCompletions.scheduledDate, todayStr)));
        const [clDone] = await db.select({ count: sql<number>`count(*)::int` }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, br.id), eq(checklistCompletions.scheduledDate, todayStr), sql`${checklistCompletions.status} IN ('completed', 'submitted', 'reviewed')`));
        const [faultCount] = await db.select({ count: sql<number>`count(*)::int` }).from(equipmentFaults).where(and(eq(equipmentFaults.branchId, br.id), sql`${equipmentFaults.status} NOT IN ('cozuldu', 'kapali')`));
        
        branchInfoGraphics.push({
        branchId: br.id,
          branchName: br.name,
          employeeCount: empCount?.count || 0,
          todayShiftCount: shiftCount?.count || 0,
          checklistTotal: clTotal?.count || 0,
          checklistDone: clDone?.count || 0,
          openFaultCount: faultCount?.count || 0,
        });
      }



      const openFaults = await db.select({
        id: equipmentFaults.id,
        equipmentName: equipmentFaults.equipmentName,
        priorityLevel: equipmentFaults.priorityLevel,
        currentStage: equipmentFaults.currentStage,
        branchId: equipmentFaults.branchId,
        createdAt: equipmentFaults.createdAt,
      }).from(equipmentFaults).where(and(
        sql`${equipmentFaults.status} NOT IN ('cozuldu', 'kapali')`,
        sql`${equipmentFaults.priorityLevel} = 'red' OR ${equipmentFaults.currentStage} IN ('bekliyor', 'servis_bekleniyor')`
      )).orderBy(desc(equipmentFaults.createdAt)).limit(10);

      for (const f of openFaults) {
        const branchInfo = branchInfoGraphics.find(b => b.branchId === f.branchId);
        criticalIssues.push({
          type: 'fault',
          title: f.equipmentName + ' Arizasi',
          detail: branchInfo ? branchInfo.branchName : 'Sube #' + f.branchId,
          severity: f.priorityLevel === 'red' ? 'critical' : 'warning',
          area: 'sube',
        });
      }

      const overdueTasks = await db.select({
        id: tasks.id,
        title: tasks.title,
        branchId: tasks.branchId,
        dueDate: tasks.dueDate,
      }).from(tasks).where(and(
        sql`${tasks.status} NOT IN ('completed', 'verified', 'cancelled')`,
        sql`DATE(${tasks.dueDate}) < ${todayStr}`
      )).orderBy(tasks.dueDate).limit(10);

      for (const t of overdueTasks) {
        const branchInfo = branchInfoGraphics.find(b => b.branchId === t.branchId);
        criticalIssues.push({
          type: 'overdue_task',
          title: t.title || 'Geciken Gorev',
          detail: branchInfo ? branchInfo.branchName : (t.branchId ? 'Sube #' + t.branchId : 'Merkez'),
          severity: 'warning',
          area: t.branchId ? 'sube' : 'merkez',
        });
      }

      const overdueMaintenances = await db.select({
        id: maintenanceSchedules.id,
        equipmentId: maintenanceSchedules.equipmentId,
        nextMaintenanceDate: maintenanceSchedules.nextMaintenanceDate,
      }).from(maintenanceSchedules).where(and(
        eq(maintenanceSchedules.isActive, true),
        sql`${maintenanceSchedules.nextMaintenanceDate} < ${todayStr}`
      )).limit(5);

      for (const m of overdueMaintenances) {
        criticalIssues.push({
          type: 'maintenance',
          title: 'Bakim Gecikmis (Ekipman #' + m.equipmentId + ')',
          detail: 'Son tarih: ' + m.nextMaintenanceDate,
          severity: 'warning',
          area: 'fabrika',
        });
      }

      } catch (error: unknown) {
        console.error('Error fetching branch infographics:', error.message);
      }

      res.json({
        totalBranches,
        activeEmployees,
        checklistCompletion: {
          total: checklistStats[0]?.total || 0,
          completed: checklistStats[0]?.completed || 0,
          rate: checklistStats[0]?.total ? Math.round((checklistStats[0].completed / checklistStats[0].total) * 100) : 0,
        },
        openTasks,
        alerts: {
          total: alertsResult[0]?.total || 0,
          critical: alertsResult[0]?.critical || 0,
        },
        branchPerformance,
        merkezStaff,
        branchInfoGraphics,
        criticalIssues,
      });
    } catch (error: unknown) {
      handleApiError(res, error, "FetchHQDashboard");
    }
  });


export default router;
