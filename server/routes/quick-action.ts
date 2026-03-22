import { Router, type Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { aiAgentLogs, notifications, tasks, users, branches, isHQRole, type UserRoleType } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", ceo: "CEO", cgo: "CGO",
  muhasebe_ik: "Muhasebe/İK", muhasebe: "Muhasebe", satinalma: "Satınalma",
  coach: "Koç", marketing: "Pazarlama", trainer: "Eğitmen",
  kalite_kontrol: "Kalite Kontrol", gida_muhendisi: "Gıda Mühendisi",
  fabrika_mudur: "Fabrika Müdür", teknik: "Teknik", destek: "Destek",
  mudur: "Şube Müdürü", supervisor: "Supervisor", supervisor_buddy: "Supervisor Buddy",
  barista: "Barista", bar_buddy: "Bar Buddy", stajyer: "Stajyer",
  fabrika_operator: "Fabrika Operatör", fabrika_sorumlu: "Fabrika Sorumlu",
  fabrika_personel: "Fabrika Personel", yatirimci_hq: "Yatırımcı HQ",
  yatirimci_branch: "Yatırımcı Şube", fabrika: "Fabrika",
};

const quickActionSchema = z.object({
  actionType: z.enum(["send_notification", "create_task", "redirect", "send_message", "info"]),
  targetUserId: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  route: z.string().optional(),
  payload: z.record(z.any()).optional(),
  suggestionId: z.string().optional(),
});

async function findBranchSupervisor(branchId: number) {
  const supervisorRoles = ["supervisor", "supervisor_buddy", "mudur"];
  for (const role of supervisorRoles) {
    const [found] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      })
      .from(users)
      .where(and(eq(users.branchId, branchId), eq(users.role, role)))
      .limit(1);
    if (found) return found;
  }
  return null;
}

async function getBranchName(branchId: number): Promise<string> {
  try {
    const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId));
    return branch?.name || `Şube #${branchId}`;
  } catch {
    return `Şube #${branchId}`;
  }
}

router.post("/api/quick-action", isAuthenticated, isSupervisorPlus, async (req, res) => {
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
      let resolvedTargetUserId = targetUserId;
      let recipientName = "";
      let recipientRole = "";
      let branchName = "";

      let targetBranchId: number | null = null;

      if (!resolvedTargetUserId && payload?.branchId) {
        const branchId = Number(payload.branchId);
        if (!Number.isFinite(branchId) || branchId <= 0) {
          return res.status(400).json({ message: "Geçersiz branchId" });
        }
        const supervisor = await findBranchSupervisor(branchId);
        if (!supervisor) {
          branchName = await getBranchName(branchId);
          return res.status(404).json({
            message: `${branchName} şubesinde supervisor bulunamadı`,
          });
        }
        resolvedTargetUserId = supervisor.id;
        recipientName = [supervisor.firstName, supervisor.lastName].filter(Boolean).join(" ") || "Bilinmiyor";
        recipientRole = supervisor.role || "";
        targetBranchId = supervisor.branchId ? Number(supervisor.branchId) : null;
        branchName = await getBranchName(branchId);
      }

      if (!resolvedTargetUserId) {
        return res.status(400).json({ message: "send_notification için targetUserId veya payload.branchId gereklidir" });
      }

      if (!recipientName) {
        const [targetUser] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            branchId: users.branchId,
          })
          .from(users)
          .where(eq(users.id, resolvedTargetUserId));
        if (!targetUser) {
          return res.status(404).json({ message: "Hedef kullanıcı bulunamadı" });
        }
        recipientName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || "Bilinmiyor";
        recipientRole = targetUser.role || "";
        targetBranchId = targetUser.branchId ? Number(targetUser.branchId) : null;

        if (targetUser.branchId && !branchName) {
          branchName = await getBranchName(Number(targetUser.branchId));
        }
      }

      const senderRole = user.role as UserRoleType;
      if (!isHQRole(senderRole)) {
        const senderBranch = user.branchId ? Number(user.branchId) : null;
        if (senderBranch !== targetBranchId) {
          return res.status(403).json({ message: "Farklı şubedeki kullanıcıya bildirim gönderemezsiniz" });
        }
      }

      const notifTitle = title || "Hatırlatma";
      const notifMessage = message || "Lütfen kontrol ediniz.";

      const notification = await storage.createNotification({
        userId: resolvedTargetUserId,
        type: "quick_action",
        title: notifTitle,
        message: notifMessage,
        link: route || undefined,
        isRead: false,
      });

      result = {
        success: true,
        notificationId: notification.id,
        details: {
          recipientName,
          recipientRole: ROLE_LABELS[recipientRole] || recipientRole,
          branch: branchName || "",
          sentAt: new Date().toISOString(),
          notificationTitle: notifTitle,
          notificationMessage: notifMessage,
        },
      };
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
  } catch (error: unknown) {
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
