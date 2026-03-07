import { Router, type Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { aiAgentLogs, notifications, tasks, users, isHQRole, type UserRoleType } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const SUPERVISOR_PLUS_ROLES = new Set([
  "supervisor", "supervisor_buddy", "mudur",
  "admin", "ceo", "cgo",
  "coach", "trainer", "kalite_kontrol", "gida_muhendisi",
  "fabrika_mudur", "muhasebe_ik", "muhasebe", "satinalma",
  "marketing", "teknik", "destek",
]);

function isSupervisorPlus(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (!SUPERVISOR_PLUS_ROLES.has(role)) {
    return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
  }
  next();
}

const quickActionSchema = z.object({
  actionType: z.enum(["send_notification", "create_task", "redirect", "send_message", "info"]),
  targetUserId: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  route: z.string().optional(),
  payload: z.record(z.any()).optional(),
  suggestionId: z.string().optional(),
});

router.post("/api/quick-action", isAuthenticated, isSupervisorPlus, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const parsed = quickActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz istek", errors: parsed.error.flatten() });
    }

    const { actionType, targetUserId, title, message, route, payload, suggestionId } = parsed.data;
    const user = req.user;
    let result: any = { success: true };

    if (actionType === "send_notification") {
      if (!targetUserId || !title || !message) {
        return res.status(400).json({ message: "send_notification için targetUserId, title ve message gereklidir" });
      }
      const [targetUser] = await db.select({ id: users.id, branchId: users.branchId }).from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "Hedef kullanıcı bulunamadı" });
      }
      const senderRole = user.role as UserRoleType;
      if (!isHQRole(senderRole)) {
        const senderBranch = user.branchId ? Number(user.branchId) : null;
        const targetBranch = targetUser.branchId ? Number(targetUser.branchId) : null;
        if (senderBranch !== targetBranch) {
          return res.status(403).json({ message: "Farkli subedeki kullaniciya bildirim gonderemezsiniz" });
        }
      }
      const notification = await storage.createNotification({
        userId: targetUserId,
        type: "quick_action",
        title,
        message,
        link: route || undefined,
        isRead: false,
      });
      result = { success: true, notificationId: notification.id };
    } else if (actionType === "create_task") {
      if (!title) {
        return res.status(400).json({ message: "create_task için title gereklidir" });
      }
      const taskData: any = {
        description: title,
        assignedById: user.id,
        status: "beklemede",
        priority: payload?.priority || "orta",
        branchId: payload?.branchId || user.branchId || null,
      };
      if (targetUserId) {
        taskData.assignedToId = targetUserId;
      }
      if (payload?.dueDate) {
        taskData.dueDate = new Date(payload.dueDate);
      }
      const task = await storage.createTask(taskData);
      result = { success: true, taskId: task.id };

      if (targetUserId) {
        await storage.createNotification({
          userId: targetUserId,
          type: "task_assigned",
          title: "Yeni Görev Atandı",
          message: title,
          link: `/gorevler`,
          isRead: false,
        });
      }
    } else if (actionType === "redirect") {
      if (!route) {
        return res.status(400).json({ message: "redirect için route gereklidir" });
      }
      result = { success: true, route };
    } else if (actionType === "send_message") {
      if (!targetUserId || !message) {
        return res.status(400).json({ message: "send_message için targetUserId ve message gereklidir" });
      }
      await storage.createNotification({
        userId: targetUserId,
        type: "message",
        title: title || "Yeni Mesaj",
        message,
        isRead: false,
      });
      result = { success: true };
    } else if (actionType === "info") {
      result = { success: true, message: message || "Bilgi alındı" };
    }

    const executionTime = Date.now() - startTime;
    await db.insert(aiAgentLogs).values({
      runType: `quick_action_${actionType}`,
      triggeredByUserId: user.id,
      targetRoleScope: user.role,
      targetUserId: targetUserId || null,
      branchId: user.branchId || null,
      inputSummary: JSON.stringify({
        actionType,
        title,
        suggestionId,
        targetUserId,
      }),
      outputSummary: JSON.stringify(result),
      actionCount: 1,
      status: "success",
      executionTimeMs: executionTime,
    });

    res.json(result);
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    try {
      await db.insert(aiAgentLogs).values({
        runType: `quick_action_error`,
        triggeredByUserId: req.user?.id || null,
        targetRoleScope: req.user?.role || "unknown",
        targetUserId: null,
        branchId: req.user?.branchId || null,
        inputSummary: JSON.stringify(req.body),
        outputSummary: JSON.stringify({ error: error.message }),
        actionCount: 0,
        status: "error",
        executionTimeMs: executionTime,
      });
    } catch {}
    console.error("Quick action error:", error);
    res.status(500).json({ message: "İşlem gerçekleştirilemedi" });
  }
});

export function registerQuickActionRoutes(app: Express) {
  app.use(router);
}
