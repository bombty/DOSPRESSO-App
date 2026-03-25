import { Router, type Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { aiAgentLogs, notifications, tasks, users, branches, supportTickets, isHQRole, type UserRoleType } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { generateTicketNumber } from "../services/ticket-routing-engine";

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
  actionType: z.enum(["send_notification", "create_task", "redirect", "send_message", "info", "dobody_action"]),
  targetUserId: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  route: z.string().optional(),
  payload: z.record(z.any()).optional(),
  suggestionId: z.string().optional(),
  templateKey: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
  subActions: z.array(z.enum(["send_notification", "create_task"])).optional(),
  createCrmTicket: z.boolean().optional().default(true),
  recipients: z.array(z.object({
    userId: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
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

async function findBranchRecipients(branchId: number) {
  const recipients: Array<{ id: string; firstName: string | null; lastName: string | null; role: string }> = [];
  const supervisor = await findBranchSupervisor(branchId);
  if (supervisor) recipients.push(supervisor);

  const investorRoles = ["yatirimci_branch", "yatirimci_hq"];
  for (const role of investorRoles) {
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
    if (found && !recipients.some(r => r.id === found.id)) {
      recipients.push(found);
    }
  }
  return recipients;
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
    } else if (actionType === "dobody_action") {
      const { resolveTemplate, ACTION_TEMPLATES } = await import("../lib/dobody-action-templates");

      const HQ_ROLES = new Set(["admin", "ceo", "cgo", "coach", "trainer"]);
      const isHQ = HQ_ROLES.has(user.role);
      
      let branchName = "";
      let targetBranchId: number | null = null;
      const allRecipients: Array<{ id: string; name: string; role: string }> = [];

      const branchId = payload?.branchId ? Number(payload.branchId) : null;
      if (branchId && Number.isFinite(branchId) && branchId > 0) {
        branchName = await getBranchName(branchId);
        targetBranchId = branchId;

        const ALLOWED_RECIPIENT_ROLES = ["supervisor", "supervisor_buddy", "mudur", "yatirimci_branch", "yatirimci_hq"];
        if (parsed.data.recipients && parsed.data.recipients.length > 0) {
          for (const r of parsed.data.recipients) {
            const [verified] = await db.select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              role: users.role,
              branchId: users.branchId,
            }).from(users).where(and(eq(users.id, r.userId), eq(users.branchId, branchId)));
            if (verified && ALLOWED_RECIPIENT_ROLES.includes(verified.role || "")) {
              allRecipients.push({
                id: verified.id,
                name: [verified.firstName, verified.lastName].filter(Boolean).join(" ") || r.name || "Bilinmiyor",
                role: verified.role || r.role || "",
              });
            }
          }
        } else {
          const branchRecipients = await findBranchRecipients(branchId);
          for (const r of branchRecipients) {
            allRecipients.push({
              id: r.id,
              name: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Bilinmiyor",
              role: r.role,
            });
          }
        }
      } else if (payload?.type === "consolidated_inactive_alert" && Array.isArray(payload?.branchNames)) {
        if (!isHQ) {
          return res.status(403).json({ message: "Toplu aksiyon sadece merkez yönetim tarafından gönderilebilir" });
        }

        const activeBranches = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(and(eq(branches.isActive, true), sql`${branches.name} = ANY(${payload.branchNames})`));

        branchName = `${activeBranches.length} şube (toplu)`;
        const seenIds = new Set<string>();
        for (const branch of activeBranches) {
          const branchRecipients = await findBranchRecipients(branch.id);
          for (const r of branchRecipients) {
            if (!seenIds.has(r.id)) {
              seenIds.add(r.id);
              allRecipients.push({
                id: r.id,
                name: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Bilinmiyor",
                role: r.role,
              });
            }
          }
        }
        if (activeBranches.length > 0) {
          targetBranchId = activeBranches[0].id;
        }
      }

      if (allRecipients.length === 0 && targetUserId) {
        const [targetUser] = await db.select({
          id: users.id, firstName: users.firstName, lastName: users.lastName,
          role: users.role, branchId: users.branchId,
        }).from(users).where(eq(users.id, targetUserId));
        if (targetUser) {
          allRecipients.push({
            id: targetUser.id,
            name: [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || "Bilinmiyor",
            role: targetUser.role || "",
          });
          targetBranchId = targetUser.branchId ? Number(targetUser.branchId) : null;
          if (targetUser.branchId && !branchName) {
            branchName = await getBranchName(Number(targetUser.branchId));
          }
        }
      }

      if (allRecipients.length > 0 && !isHQ) {
        const userBranchId = user.branchId ? Number(user.branchId) : null;
        if (targetBranchId && userBranchId && targetBranchId !== userBranchId) {
          return res.status(403).json({ message: "Bu kullanıcıya aksiyon gönderme yetkiniz yok" });
        }
      }

      const templateKey = req.body.templateKey || 'generic_reminder';
      const primaryRecipient = allRecipients[0];
      const templateVars = {
        targetName: primaryRecipient?.name || 'İlgili Kişi',
        branchName: branchName || '',
        details: payload?.details || '',
        ...(req.body.templateVariables || {}),
      };

      const resolvedMessage = message || resolveTemplate(templateKey, templateVars);
      const resolvedTitle = title || ACTION_TEMPLATES[templateKey]?.labelTr || 'Hatırlatma';

      const actions = req.body.subActions || ['send_notification'];

      if (allRecipients.length === 0 && actions.includes('send_notification')) {
        return res.status(400).json({
          message: "Bildirim gönderilebilecek alıcı bulunamadı. Şubeye atanmış Supervisor veya Yatırımcı yok.",
          success: false,
        });
      }

      const actionResults: any = { success: true, recipientCount: allRecipients.length };

      if (actions.includes('send_notification') && allRecipients.length > 0) {
        const notificationIds: number[] = [];
        for (const recipient of allRecipients) {
          const notification = await storage.createNotification({
            userId: recipient.id,
            type: "quick_action",
            title: resolvedTitle,
            message: resolvedMessage,
            link: route || undefined,
            isRead: false,
          });
          notificationIds.push(notification.id);
        }
        actionResults.notificationIds = notificationIds;
        actionResults.notificationSent = true;
      }

      if (actions.includes('create_task')) {
        const taskData: any = {
          description: resolvedMessage,
          assignedById: user.id,
          status: "beklemede",
          priority: payload?.priority || "yüksek",
          branchId: targetBranchId || payload?.branchId || user.branchId || null,
        };
        if (primaryRecipient) {
          taskData.assignedToId = primaryRecipient.id;
        }
        if (payload?.dueDate) {
          taskData.dueDate = new Date(payload.dueDate);
        } else {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);
          taskData.dueDate = dueDate;
        }
        const task = await storage.createTask(taskData);
        actionResults.taskId = task.id;
        actionResults.taskCreated = true;

        if (primaryRecipient) {
          await storage.createNotification({
            userId: primaryRecipient.id,
            type: "task_assigned",
            title: "Yeni Görev Atandı",
            message: resolvedMessage.substring(0, 200),
            link: `/gorevler`,
            isRead: false,
          });
        }
      }

      const shouldCreateTicket = parsed.data.createCrmTicket !== false;
      if (shouldCreateTicket) {
        const categoryMap: Record<string, string> = {
          overdue_stock_count: "lojistik",
          low_performance: "trainer",
          missing_checklist: "trainer",
          maintenance_overdue: "teknik",
          capa_overdue: "teknik",
          low_customer_rating: "musteri_hizmetleri",
          training_overdue: "trainer",
          branch_inactivity: "trainer",
          onboarding_stuck: "hr",
          fault_unresolved: "teknik",
          generic_reminder: "trainer",
        };
        const department = categoryMap[templateKey] || "trainer";
        const priorityMap: Record<string, string> = {
          critical: "kritik",
          high: "yuksek",
          medium: "normal",
          low: "dusuk",
        };
        const ticketPriority = priorityMap[payload?.severity || payload?.priority || "high"] || "yuksek";

        const ticketBranchIds: number[] = [];
        if (payload?.type === "consolidated_inactive_alert" && Array.isArray(payload?.branchNames)) {
          const matchedBranches = await db
            .select({ id: branches.id })
            .from(branches)
            .where(and(eq(branches.isActive, true), sql`${branches.name} = ANY(${payload.branchNames})`));
          ticketBranchIds.push(...matchedBranches.map(b => b.id));
        } else if (targetBranchId) {
          ticketBranchIds.push(targetBranchId);
        }

        const createdTickets: Array<{ id: number; ticketNumber: string }> = [];
        for (const tbId of ticketBranchIds) {
          try {
            const ticketNumber = await generateTicketNumber();
            const [newTicket] = await db.insert(supportTickets).values({
              ticketNumber,
              branchId: tbId,
              createdByUserId: user.id,
              department,
              title: `[Uygunsuzluk] ${resolvedTitle}`,
              description: resolvedMessage,
              priority: ticketPriority,
              status: "acik",
              channel: "compliance",
              ticketType: "compliance",
              source: "mr_dobody",
            }).returning();
            if (newTicket) {
              createdTickets.push({ id: newTicket.id, ticketNumber: newTicket.ticketNumber });
            }
          } catch (crmError: any) {
            console.error(`CRM ticket creation error for branch ${tbId}:`, crmError);
          }
        }

        if (createdTickets.length > 0) {
          actionResults.crmTicketId = createdTickets[0].id;
          actionResults.crmTicketNumber = createdTickets[0].ticketNumber;
          actionResults.crmTicketCreated = true;
          actionResults.crmTicketCount = createdTickets.length;
        }
      }

      const recipientNames = allRecipients.map(r => r.name).join(", ");
      actionResults.details = {
        recipientName: recipientNames || primaryRecipient?.name || "",
        recipientRole: primaryRecipient ? (ROLE_LABELS[primaryRecipient.role] || primaryRecipient.role) : "",
        recipients: allRecipients.map(r => ({
          name: r.name,
          role: ROLE_LABELS[r.role] || r.role,
        })),
        branch: branchName,
        sentAt: new Date().toISOString(),
        templateKey,
        resolvedMessage,
      };

      result = actionResults;
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
