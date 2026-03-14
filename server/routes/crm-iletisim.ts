import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { supportTickets, supportTicketComments, hqTasks, broadcastReceipts, type SupportTicket } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { routeTicket, generateTicketNumber, generateHqTaskNumber } from "../services/ticket-routing-engine";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";

interface AuthenticatedUser {
  id: string;
  role: string;
  branchId: number | null;
  name: string | null;
}

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const router = Router();

router.use(isAuthenticated);

const createTicketSchema = z.object({
  department: z.enum(["teknik", "lojistik", "muhasebe", "marketing", "trainer", "hr"]),
  title: z.string().min(5).max(300),
  description: z.string().min(10),
  priority: z.enum(["dusuk", "normal", "yuksek", "kritik"]).default("normal"),
  relatedEquipmentId: z.number().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(["acik", "islemde", "beklemede", "cozuldu", "kapatildi"]).optional(),
  assignedToUserId: z.string().optional(),
  resolutionNote: z.string().optional(),
  priority: z.enum(["dusuk", "normal", "yuksek", "kritik"]).optional(),
  satisfactionScore: z.number().min(1).max(5).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

const createHqTaskSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().optional(),
  assignedToUserId: z.string().min(1),
  priority: z.enum(["dusuk", "normal", "yuksek", "kritik"]).default("normal"),
  dueDate: z.string().optional(),
  department: z.string().optional(),
});

const updateHqTaskSchema = z.object({
  status: z.enum(["beklemede", "devam_ediyor", "tamamlandi", "iptal"]).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  completionNote: z.string().optional(),
});

const BRANCH_ONLY_ROLES = ["barista", "bar_buddy", "stajyer"];
const BRANCH_SCOPED_ROLES = ["supervisor", "mudur"];

function isHQRole(role: string): boolean {
  return ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "kalite_kontrol", "teknik_sorumlu"].includes(role);
}

function canSeeAllTickets(role: string): boolean {
  return ["admin", "ceo", "cgo"].includes(role);
}

function isBranchRole(role: string): boolean {
  return BRANCH_ONLY_ROLES.includes(role) || BRANCH_SCOPED_ROLES.includes(role);
}

const ROLE_TO_DEPT_MAP: Record<string, string> = {
  satinalma: "lojistik",
  muhasebe_ik: "muhasebe",
  coach: "trainer",
  trainer: "trainer",
  kalite_kontrol: "lojistik",
  teknik_sorumlu: "teknik",
};

interface TicketAccessFields {
  department: string;
  branchId?: number | null;
  branch_id?: number | null;
  assignedToUserId?: string | null;
  assigned_to_user_id?: string | null;
}

function canAccessTicket(user: AuthenticatedUser, ticket: TicketAccessFields): boolean {
  if (canSeeAllTickets(user.role)) return true;
  if (BRANCH_ONLY_ROLES.includes(user.role)) return false;
  const ticketBranch = ticket.branchId ?? ticket.branch_id ?? null;
  if (BRANCH_SCOPED_ROLES.includes(user.role)) return ticketBranch === user.branchId;
  if (isHQRole(user.role)) {
    const dept = ROLE_TO_DEPT_MAP[user.role];
    if (!dept) return true;
    const assignedTo = ticket.assignedToUserId ?? ticket.assigned_to_user_id ?? null;
    return ticket.department === dept || assignedTo === user.id;
  }
  return false;
}

router.get("/tickets", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { department, status, priority, branchId, page = "1" } = req.query;
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) return res.status(400).json({ error: "Invalid page" });
    const pageLimit = 20;
    const pageOffset = (pageNum - 1) * pageLimit;

    const conditions: ReturnType<typeof sql>[] = [sql`st.is_deleted = false`];

    if (!isHQRole(user.role)) {
      conditions.push(sql`st.branch_id = ${user.branchId}`);
    } else if (!canSeeAllTickets(user.role)) {
      const deptFilter = ROLE_TO_DEPT_MAP[user.role];
      if (deptFilter) {
        conditions.push(sql`(st.department = ${deptFilter} OR st.assigned_to_user_id = ${user.id})`);
      }
    }

    if (department) conditions.push(sql`st.department = ${department}`);
    if (status) conditions.push(sql`st.status = ${status}`);
    if (priority) conditions.push(sql`st.priority = ${priority}`);
    if (branchId && canSeeAllTickets(user.role)) {
      const bid = parseInt(branchId as string);
      if (!isNaN(bid)) conditions.push(sql`st.branch_id = ${bid}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await db.execute(sql`
      SELECT 
        st.*,
        b.name as branch_name,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM support_tickets st
      LEFT JOIN branches b ON st.branch_id = b.id
      LEFT JOIN users u1 ON st.created_by_user_id = u1.id
      LEFT JOIN users u2 ON st.assigned_to_user_id = u2.id
      WHERE ${whereClause}
      ORDER BY 
        CASE st.priority WHEN 'kritik' THEN 1 WHEN 'yuksek' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        st.created_at DESC
      LIMIT ${pageLimit} OFFSET ${pageOffset}
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.get("/tickets/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const ticket = await db.execute(
      sql`SELECT st.*, b.name as branch_name, u1.name as created_by_name, u2.name as assigned_to_name
          FROM support_tickets st
          LEFT JOIN branches b ON st.branch_id = b.id
          LEFT JOIN users u1 ON st.created_by_user_id = u1.id
          LEFT JOIN users u2 ON st.assigned_to_user_id = u2.id
          WHERE st.id = ${ticketId} AND st.is_deleted = false`
    );

    if (!ticket.rows.length) return res.status(404).json({ error: "Ticket not found" });
    const t = ticket.rows[0] as Record<string, unknown>;

    if (!canAccessTicket(user, t as TicketAccessFields)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const commentsQuery = isHQRole(user.role)
      ? sql`SELECT stc.*, u.name as author_name FROM support_ticket_comments stc LEFT JOIN users u ON stc.author_id = u.id WHERE stc.ticket_id = ${ticketId} ORDER BY stc.created_at ASC`
      : sql`SELECT stc.*, u.name as author_name FROM support_ticket_comments stc LEFT JOIN users u ON stc.author_id = u.id WHERE stc.ticket_id = ${ticketId} AND stc.is_internal = false ORDER BY stc.created_at ASC`;

    const comments = await db.execute(commentsQuery);

    res.json({ ...t, comments: comments.rows });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

router.post("/tickets", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { department, title, description, priority, relatedEquipmentId } = parsed.data;

    const ticketNumber = await generateTicketNumber();
    const branchId = user.branchId ?? null;

    const result = await db.insert(supportTickets).values({
      ticketNumber,
      branchId,
      createdByUserId: user.id,
      department,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "acik",
      relatedEquipmentId: relatedEquipmentId ?? null,
    }).returning();

    const newTicket = result[0];

    routeTicket(newTicket.id).catch(err =>
      console.error("[TICKET-ROUTING] Error routing ticket:", err)
    );

    res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.patch("/tickets/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    if (!canAccessTicket(user, ticket)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!isHQRole(user.role)) {
      const { satisfactionScore } = parsed.data;
      if (satisfactionScore !== undefined) {
        await db.update(supportTickets).set({ satisfactionScore, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
        return res.json({ success: true });
      }
      return res.status(403).json({ error: "Access denied" });
    }

    const { status, assignedToUserId, resolutionNote, priority } = parsed.data;
    const updates: Partial<SupportTicket> = { updatedAt: new Date() };

    if (status) updates.status = status;
    if (assignedToUserId) { updates.assignedToUserId = assignedToUserId; updates.assignedAt = new Date(); }
    if (resolutionNote) updates.resolutionNote = resolutionNote;
    if (priority) updates.priority = priority;
    if (status === "cozuldu") { updates.resolvedAt = new Date(); updates.resolvedByUserId = user.id; }

    await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

router.delete("/tickets/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "Access denied" });
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    if (!canAccessTicket(user, ticket)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.update(supportTickets).set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

router.post("/tickets/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { content, isInternal } = parsed.data;

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    if (!isHQRole(user.role) && ticket.branchId !== user.branchId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const internal = isHQRole(user.role) ? Boolean(isInternal) : false;

    const result = await db.insert(supportTicketComments).values({
      ticketId,
      authorId: user.id,
      content: content.trim(),
      isInternal: internal,
    }).returning();

    if (ticket) {
      const notifyUserId = isHQRole(user.role) ? ticket.createdByUserId : ticket.assignedToUserId;
      if (notifyUserId && notifyUserId !== user.id) {
        await storage.createNotification({
          userId: notifyUserId,
          type: "task_assigned",
          title: `Ticket Yanıtı: ${ticket.title.substring(0, 50)}`,
          message: content.substring(0, 100),
          link: `/iletisim-merkezi/ticket/${ticketId}`,
        });
      }
    }

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

router.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const branchFilter = !isHQRole(user.role) ? sql`AND st.branch_id = ${user.branchId}` : sql``;
    const branchFilterSimple = !isHQRole(user.role) ? sql`AND branch_id = ${user.branchId}` : sql``;

    const [openTickets, slaBreaches, slaRisk, hqTaskStats, b2cStats] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple}`),
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_breached = true AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple}`),
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_deadline < NOW() + INTERVAL '2 hours' AND sla_breached = false AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple}`),
      isHQRole(user.role)
        ? db.execute(sql`SELECT status, COUNT(*) as count FROM hq_tasks WHERE is_deleted = false GROUP BY status`)
        : Promise.resolve({ rows: [] }),
      db.execute(sql`SELECT COUNT(*) as count FROM customer_feedback WHERE created_at > NOW() - INTERVAL '30 days'`),
    ]);

    const deptBreakdown = await db.execute(
      sql`SELECT department, COUNT(*) as count, SUM(CASE WHEN sla_breached THEN 1 ELSE 0 END) as sla_breached_count
          FROM support_tickets 
          WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple}
          GROUP BY department ORDER BY count DESC`
    );

    const recentTickets = await db.execute(
      sql`SELECT st.id, st.ticket_number, st.title, st.department, st.priority, st.status, st.sla_breached, st.created_at, b.name as branch_name
          FROM support_tickets st LEFT JOIN branches b ON st.branch_id = b.id
          WHERE st.is_deleted = false ${branchFilter} ORDER BY st.created_at DESC LIMIT 10`
    );

    res.json({
      openTickets: parseInt(openTickets.rows[0]?.count as string ?? "0"),
      slaBreaches: parseInt(slaBreaches.rows[0]?.count as string ?? "0"),
      slaRisk: parseInt(slaRisk.rows[0]?.count as string ?? "0"),
      hqTaskStats: hqTaskStats.rows,
      b2cFeedbackCount: parseInt(b2cStats.rows[0]?.count as string ?? "0"),
      deptBreakdown: deptBreakdown.rows,
      recentTickets: recentTickets.rows,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

router.get("/hq-tasks", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const { filter = "all" } = req.query;
    const conditions: ReturnType<typeof sql>[] = [sql`ht.is_deleted = false`];

    if (filter === "mine") {
      conditions.push(sql`(ht.assigned_to_user_id = ${user.id} OR ht.assigned_by_user_id = ${user.id})`);
    } else if (filter === "assigned_to_me") {
      conditions.push(sql`ht.assigned_to_user_id = ${user.id}`);
    } else if (filter === "i_assigned") {
      conditions.push(sql`ht.assigned_by_user_id = ${user.id}`);
    } else if (filter === "overdue") {
      conditions.push(sql`ht.due_date < NOW() AND ht.status NOT IN ('tamamlandi','iptal')`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await db.execute(sql`
      SELECT ht.*, u1.name as assigned_by_name, u2.name as assigned_to_name
      FROM hq_tasks ht
      LEFT JOIN users u1 ON ht.assigned_by_user_id = u1.id
      LEFT JOIN users u2 ON ht.assigned_to_user_id = u2.id
      WHERE ${whereClause}
      ORDER BY CASE ht.priority WHEN 'kritik' THEN 1 WHEN 'yuksek' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, ht.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching HQ tasks:", error);
    res.status(500).json({ error: "Failed to fetch HQ tasks" });
  }
});

router.post("/hq-tasks", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const parsed = createHqTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { title, description, assignedToUserId, priority, dueDate, department } = parsed.data;

    const taskNumber = await generateHqTaskNumber();

    const result = await db.insert(hqTasks).values({
      taskNumber,
      title: title.trim(),
      description: description?.trim(),
      assignedByUserId: user.id,
      assignedToUserId,
      priority,
      department,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "beklemede",
    }).returning();

    await storage.createNotification({
      userId: assignedToUserId,
      type: "task_assigned",
      title: `HQ Görev Atandı: ${title.substring(0, 60)}`,
      message: `${user.name ?? "HQ"} tarafından atandı`,
      link: `/iletisim-merkezi?tab=hq-tasks`,
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating HQ task:", error);
    res.status(500).json({ error: "Failed to create HQ task" });
  }
});

router.patch("/hq-tasks/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

    const parsed = updateHqTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { status, progressPercent, completionNote } = parsed.data;

    const updates: Partial<typeof hqTasks.$inferSelect> = { updatedAt: new Date() };

    if (status) updates.status = status;
    if (progressPercent !== undefined) updates.progressPercent = progressPercent;
    if (completionNote) updates.completionNote = completionNote;
    if (status === "tamamlandi") updates.completedAt = new Date();

    await db.update(hqTasks).set(updates).where(and(eq(hqTasks.id, taskId), eq(hqTasks.isDeleted, false)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating HQ task:", error);
    res.status(500).json({ error: "Failed to update HQ task" });
  }
});

router.delete("/hq-tasks/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

    await db.update(hqTasks).set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(hqTasks.id, taskId), eq(hqTasks.isDeleted, false)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting HQ task:", error);
    res.status(500).json({ error: "Failed to delete HQ task" });
  }
});

router.post("/broadcast/:announcementId/seen", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const announcementId = parseInt(req.params.announcementId);
    if (isNaN(announcementId)) return res.status(400).json({ error: "Invalid ID" });

    await db.insert(broadcastReceipts).values({
      announcementId,
      userId: user.id,
      branchId: user.branchId ?? null,
      seenAt: new Date(),
    }).onConflictDoNothing();

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking seen:", error);
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/broadcast/:announcementId/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const announcementId = parseInt(req.params.announcementId);
    if (isNaN(announcementId)) return res.status(400).json({ error: "Invalid ID" });

    await db.insert(broadcastReceipts).values({
      announcementId,
      userId: user.id,
      branchId: user.branchId ?? null,
      seenAt: new Date(),
      confirmedAt: new Date(),
    }).onConflictDoUpdate({
      target: [broadcastReceipts.announcementId, broadcastReceipts.userId],
      set: { confirmedAt: new Date(), seenAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error confirming:", error);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/broadcast/:announcementId/receipts", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const announcementId = parseInt(req.params.announcementId);
    if (isNaN(announcementId)) return res.status(400).json({ error: "Invalid ID" });

    const result = await db.execute(
      sql`SELECT br.*, u.name as user_name, b.name as branch_name
          FROM broadcast_receipts br
          LEFT JOIN users u ON br.user_id = u.id
          LEFT JOIN branches b ON br.branch_id = b.id
          WHERE br.announcement_id = ${announcementId}
          ORDER BY br.seen_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/branch-health", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!canSeeAllTickets(user.role)) return res.status(403).json({ error: "CGO/CEO only" });

    const result = await db.execute(
      sql`SELECT 
        b.id, b.name,
        COUNT(st.id) FILTER (WHERE st.status NOT IN ('cozuldu','kapatildi') AND st.is_deleted = false) as open_tickets,
        COUNT(st.id) FILTER (WHERE st.sla_breached = true AND st.is_deleted = false) as sla_breaches,
        AVG(st.satisfaction_score) FILTER (WHERE st.satisfaction_score IS NOT NULL) as avg_satisfaction,
        COUNT(st.id) FILTER (WHERE st.recurrence_count >= 2 AND st.is_deleted = false) as recurring_issues
      FROM branches b
      LEFT JOIN support_tickets st ON b.id = st.branch_id
      GROUP BY b.id, b.name
      ORDER BY open_tickets DESC`
    );

    const withScore = result.rows.map((row: Record<string, unknown>) => {
      const openTickets = parseInt(String(row.open_tickets ?? "0"));
      const slaBreaches = parseInt(String(row.sla_breaches ?? "0"));
      const avgSatisfaction = parseFloat(String(row.avg_satisfaction ?? "5"));
      const recurringIssues = parseInt(String(row.recurring_issues ?? "0"));

      let score = 100;
      score -= openTickets * 5;
      score -= slaBreaches * 10;
      score -= (5 - avgSatisfaction) * 8;
      score -= recurringIssues * 7;

      return { ...row, healthScore: Math.max(0, Math.min(100, Math.round(score))) };
    });

    res.json(withScore);
  } catch (error) {
    console.error("Error fetching branch health:", error);
    res.status(500).json({ error: "Failed" });
  }
});

export { router as crmIletisimRouter };
