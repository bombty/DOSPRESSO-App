import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, asc, and, or, sql, inArray, count } from "drizzle-orm";
import {
  tasks,
  equipment,
  equipmentFaults,
  checklists,
  checklistAssignments,
  notifications,
  dashboardWidgetItems,
} from "@shared/schema";

const router = Router();

  // ========================================
  // DASHBOARD WIDGET ITEMS API
  // ========================================

  // Seed default dashboard widget items if table is empty

  // GET /api/dashboard-widgets/counts - Get widget badge counts for current user
  router.get('/api/dashboard-widgets/counts', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userId = user.id as string;
      const userRole = user.role as string;
      const branchId = user.branchId ? Number(user.branchId) : null;

      const counts: Record<string, number> = {};

      try {
        const taskResult = await db.select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              inArray(tasks.status, ['pending', 'in_progress', 'onay_bekliyor', 'cevap_bekliyor']),
              or(
                eq(tasks.assignedToId, userId),
                ...(branchId ? [eq(tasks.branchId, branchId)] : [])
              )
            )
          );
        counts['tasks'] = Number(taskResult[0]?.count || 0);
      } catch (error: unknown) { counts['tasks'] = 0; }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checklistResult = await db.select({ count: sql<number>`count(*)` })
          .from(checklistAssignments)
          .where(
            and(
              eq(checklistAssignments.userId, userId),
              eq(checklistAssignments.status, 'pending')
            )
          );
        counts['checklists'] = Number(checklistResult[0]?.count || 0);
      } catch (error: unknown) { counts['checklists'] = 0; }

      try {
        const faultConditions = [
          inArray(equipmentFaults.status, ['open', 'in_progress', 'waiting_parts', 'escalated'])
        ];
        if (branchId) {
          faultConditions.push(eq(equipmentFaults.branchId, branchId));
        }
        const faultResult = await db.select({ count: sql<number>`count(*)` })
          .from(equipmentFaults)
          .where(and(...faultConditions));
        counts['faults'] = Number(faultResult[0]?.count || 0);
      } catch (error: unknown) { counts['faults'] = 0; }

      try {
        const trainingResult = await db.select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false),
              eq(notifications.type, 'training')
            )
          );
        counts['training'] = Number(trainingResult[0]?.count || 0);
      } catch (error: unknown) { counts['training'] = 0; }

      try {
        const reportResult = await db.select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false)
            )
          );
        counts['reports'] = Number(reportResult[0]?.count || 0);
      } catch (error: unknown) { counts['reports'] = 0; }

      res.json(counts);
    } catch (error: unknown) {
      console.error("Error fetching widget counts:", error);
      res.status(500).json({ message: "Widget sayıları yüklenemedi" });
    }
  });

  // GET /api/dashboard-widgets - Get active widgets filtered by user role
  router.get('/api/dashboard-widgets', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const userRole = user.role as string;

      const allWidgets = await db.select().from(dashboardWidgetItems)
        .where(eq(dashboardWidgetItems.isActive, true))
        .orderBy(asc(dashboardWidgetItems.displayOrder));

      const filtered = allWidgets.filter(w => {
        if (!w.targetRoles || w.targetRoles.length === 0) return true;
        return w.targetRoles.includes(userRole);
      });

      res.json(filtered);
    } catch (error: unknown) {
      console.error("Error fetching dashboard widgets:", error);
      res.status(500).json({ message: "Dashboard widget'ları yüklenemedi" });
    }
  });

export default router;
