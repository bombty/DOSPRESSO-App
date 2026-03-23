import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { supportTickets, supportTicketComments, ticketAttachments, ticketCoworkMembers, hqTasks, broadcastReceipts, users, slaRules, slaBusinessHours, type SupportTicket } from "@shared/schema";
import { eq, and, sql, asc, inArray, isNull } from "drizzle-orm";
import { routeTicket, generateTicketNumber, generateHqTaskNumber } from "../services/ticket-routing-engine";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { getBusinessHoursConfig, getRemainingBusinessHours, getElapsedBusinessHours } from "../services/business-hours";
import multer from "multer";
import path from "path";
import fs from "fs";

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
  department: z.enum(["teknik", "lojistik", "muhasebe", "marketing", "trainer", "hr", "musteri_hizmetleri"]),
  title: z.string().min(5).max(300),
  description: z.string().min(10),
  priority: z.enum(["dusuk", "normal", "yuksek", "kritik"]).default("normal"),
  relatedEquipmentId: z.number().optional(),
  equipmentDescription: z.string().max(500).optional(),
  attachmentUrls: z.array(z.string()).max(5).optional(),
  channel: z.enum(["franchise", "misafir"]).default("franchise"),
  ticketType: z.string().max(50).default("franchise_talep"),
  source: z.enum(["manual", "qr", "web", "escalation"]).default("manual"),
  rating: z.number().min(1).max(5).optional(),
  ratingHizmet: z.number().min(1).max(5).optional(),
  ratingTemizlik: z.number().min(1).max(5).optional(),
  ratingUrun: z.number().min(1).max(5).optional(),
  ratingPersonel: z.number().min(1).max(5).optional(),
  customerName: z.string().max(200).optional(),
  customerEmail: z.string().email().max(200).optional(),
  customerPhone: z.string().max(50).optional(),
  isAnonymous: z.boolean().optional(),
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
  commentType: z.enum(["reply", "internal", "cowork"]).default("reply"),
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
  const ticketBranch = ticket.branchId ?? ticket.branch_id ?? null;
  if (BRANCH_ONLY_ROLES.includes(user.role)) return ticketBranch === user.branchId;
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
    const { department, status, priority, branchId, channel, ticketType, page = "1" } = req.query;
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) return res.status(400).json({ error: "Invalid page" });
    const pageLimit = 20;
    const pageOffset = (pageNum - 1) * pageLimit;

    const conditions: ReturnType<typeof sql>[] = [sql`st.is_deleted = false`];

    if (channel && ["misafir", "franchise"].includes(channel as string)) {
      conditions.push(sql`st.channel = ${channel}`);
    }
    if (ticketType) {
      conditions.push(sql`st.ticket_type = ${ticketType}`);
    }

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
        COALESCE(u1.first_name || ' ' || u1.last_name, u1.first_name, '') as created_by_name,
        COALESCE(u2.first_name || ' ' || u2.last_name, u2.first_name, '') as assigned_to_name
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
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const ticket = await db.execute(
      sql`SELECT st.*, b.name as branch_name, COALESCE(u1.first_name || ' ' || u1.last_name, u1.first_name, '') as created_by_name, COALESCE(u2.first_name || ' ' || u2.last_name, u2.first_name, '') as assigned_to_name, COALESCE(u3.first_name || ' ' || u3.last_name, u3.first_name, '') as resolved_by_name
          FROM support_tickets st
          LEFT JOIN branches b ON st.branch_id = b.id
          LEFT JOIN users u1 ON st.created_by_user_id = u1.id
          LEFT JOIN users u2 ON st.assigned_to_user_id = u2.id
          LEFT JOIN users u3 ON st.resolved_by_user_id = u3.id
          WHERE st.id = ${ticketId} AND st.is_deleted = false`
    );

    if (!ticket.rows.length) return res.status(404).json({ error: "Ticket not found" });
    const t = ticket.rows[0] as Record<string, unknown>;

    let coworkMembers: { userId: string }[] = [];
    if (isHQRole(user.role)) {
      coworkMembers = await db.select({ userId: ticketCoworkMembers.userId }).from(ticketCoworkMembers).where(eq(ticketCoworkMembers.ticketId, ticketId));
    }
    const isCoworkInvited = coworkMembers.some(m => m.userId === user.id);

    if (!canAccessTicket(user, t as TicketAccessFields) && !isCoworkInvited) {
      return res.status(403).json({ error: "Access denied" });
    }

    let commentsQuery;
    const isCoworkMemberFlag = isHQRole(user.role);
    if (isHQRole(user.role)) {
      commentsQuery = sql`SELECT stc.*, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') as author_name FROM support_ticket_comments stc LEFT JOIN users u ON stc.author_id = u.id WHERE stc.ticket_id = ${ticketId} ORDER BY stc.created_at ASC`;
    } else {
      commentsQuery = sql`SELECT stc.*, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') as author_name FROM support_ticket_comments stc LEFT JOIN users u ON stc.author_id = u.id WHERE stc.ticket_id = ${ticketId} AND stc.is_internal = false AND stc.comment_type != 'cowork' ORDER BY stc.created_at ASC`;
    }

    const comments = await db.execute(commentsQuery);

    res.json({ ...t, comments: comments.rows, isCoworkMember: isCoworkMemberFlag });
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
    const { department, title, description, priority, relatedEquipmentId, equipmentDescription, attachmentUrls, channel: ticketChannel, ticketType, source: ticketSource, rating: ticketRating, ratingHizmet, ratingTemizlik, ratingUrun, ratingPersonel, customerName, customerEmail, customerPhone, isAnonymous } = parsed.data;

    if (relatedEquipmentId && isBranchRole(user.role) && user.branchId) {
      const eqCheck = await db.execute(
        sql`SELECT id FROM equipment WHERE id = ${relatedEquipmentId} AND branch_id = ${user.branchId} LIMIT 1`
      );
      if (!eqCheck.rows.length) {
        return res.status(403).json({ error: "Gecersiz ekipman secimi" });
      }
    }

    const ticketNumber = await generateTicketNumber();
    const branchId = user.branchId ?? null;

    let finalDescription = description.trim();
    if (equipmentDescription && !relatedEquipmentId) {
      finalDescription = `[Cihaz: ${equipmentDescription}]\n\n${finalDescription}`;
    }

    const result = await db.insert(supportTickets).values({
      ticketNumber,
      branchId,
      createdByUserId: user.id,
      department,
      title: title.trim(),
      description: finalDescription,
      priority,
      status: "acik",
      relatedEquipmentId: relatedEquipmentId ?? null,
      channel: ticketChannel ?? "franchise",
      ticketType: ticketType ?? "franchise_talep",
      source: ticketSource ?? "manual",
      rating: ticketRating ?? null,
      ratingHizmet: ratingHizmet ?? null,
      ratingTemizlik: ratingTemizlik ?? null,
      ratingUrun: ratingUrun ?? null,
      ratingPersonel: ratingPersonel ?? null,
      customerName: customerName ?? null,
      customerEmail: customerEmail ?? null,
      customerPhone: customerPhone ?? null,
      isAnonymous: isAnonymous ?? false,
    }).returning();

    const newTicket = result[0];

    if (attachmentUrls && attachmentUrls.length > 0) {
      for (const url of attachmentUrls) {
        const filename = url.split('/').pop() ?? '';
        const reg = tempUploadRegistry.get(filename);
        if (!reg || reg.userId !== user.id) continue;
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          const ext = path.extname(filename).toLowerCase();
          const mimeMap: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp',
          };
          await db.insert(ticketAttachments).values({
            ticketId: newTicket.id,
            uploadedByUserId: user.id,
            fileName: filename,
            fileSize: stat.size,
            mimeType: mimeMap[ext] ?? 'image/jpeg',
            storageKey: filename,
          });
          tempUploadRegistry.delete(filename);
        }
      }
    }

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
    if (resolutionNote !== undefined) updates.resolutionNote = resolutionNote;
    if (priority) updates.priority = priority;
    if (status === "cozuldu") { updates.resolvedAt = new Date(); updates.resolvedByUserId = user.id; }

    await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));

    if (assignedToUserId && assignedToUserId !== ticket.assignedToUserId) {
      try {
        const { createTodoFromTicket } = await import("../../agent/skills/auto-todo-from-ticket");
        await createTodoFromTicket({
          assignedToUserId,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber || `TKT-${ticket.id}`,
          ticketTitle: ticket.title,
          channel: ticket.channel || undefined,
          department: ticket.department || undefined,
          priority: ticket.priority || undefined,
          slaDeadline: ticket.slaDeadlineAt ? new Date(ticket.slaDeadlineAt) : null,
        });
      } catch (hookErr) {
        console.error("[CRM→Todo] Hook error:", hookErr);
      }
    }

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
    const { content, isInternal, commentType } = parsed.data;

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    if (!canAccessTicket(user, { department: ticket.department, branchId: ticket.branchId, assignedToUserId: ticket.assignedToUserId })) {
      const coworkCheck = await db.select({ userId: ticketCoworkMembers.userId }).from(ticketCoworkMembers).where(eq(ticketCoworkMembers.ticketId, ticketId));
      if (!coworkCheck.some(m => m.userId === user.id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    let finalCommentType = commentType;
    if (finalCommentType === 'reply' && isInternal && isHQRole(user.role)) {
      finalCommentType = 'internal';
    }
    if (commentType === 'cowork') {
      if (!isHQRole(user.role)) {
        return res.status(403).json({ error: "Cowork sadece HQ kullanıcıları içindir" });
      }
    } else if (commentType === 'internal') {
      if (!isHQRole(user.role)) {
        finalCommentType = 'reply';
      }
    }

    const internal = finalCommentType === 'internal';

    const result = await db.insert(supportTicketComments).values({
      ticketId,
      authorId: user.id,
      content: content.trim(),
      isInternal: internal,
      commentType: finalCommentType,
    }).returning();

    if (finalCommentType === 'cowork') {
      const coworkMembers = await db.select().from(ticketCoworkMembers).where(eq(ticketCoworkMembers.ticketId, ticketId));
      const notifyUserIds = coworkMembers
        .map(m => m.userId)
        .filter(id => id !== user.id);
      if (ticket.assignedToUserId && ticket.assignedToUserId !== user.id) {
        if (!notifyUserIds.includes(ticket.assignedToUserId)) {
          notifyUserIds.push(ticket.assignedToUserId);
        }
      }
      for (const uid of notifyUserIds) {
        await storage.createNotification({
          userId: uid,
          type: "task_assigned",
          title: `Cowork Mesajı: ${ticket.title.substring(0, 50)}`,
          message: content.substring(0, 100),
          link: `/hq-destek`,
        });
      }
    } else if (ticket) {
      const notifyUserId = isHQRole(user.role) ? ticket.createdByUserId : ticket.assignedToUserId;
      if (notifyUserId && notifyUserId !== user.id) {
        await storage.createNotification({
          userId: notifyUserId,
          type: "task_assigned",
          title: `Ticket Yanıtı: ${ticket.title.substring(0, 50)}`,
          message: content.substring(0, 100),
          link: `/hq-destek`,
        });
      }
    }

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

router.get("/tickets/:id/cowork/members", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    const members = await db.execute(sql`
      SELECT tcm.*, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') as user_name, u.role as user_role,
             COALESCE(u2.first_name || ' ' || u2.last_name, u2.first_name, '') as invited_by_name
      FROM ticket_cowork_members tcm
      LEFT JOIN users u ON tcm.user_id = u.id
      LEFT JOIN users u2 ON tcm.invited_by_user_id = u2.id
      WHERE tcm.ticket_id = ${ticketId}
      ORDER BY tcm.invited_at ASC
    `);
    res.json(members.rows);
  } catch (error) {
    console.error("Error fetching cowork members:", error);
    res.status(500).json({ error: "Failed to fetch cowork members" });
  }
});

router.post("/tickets/:id/cowork/invite", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { userId } = parsed.data;

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    const existingMembers = await db.select().from(ticketCoworkMembers)
      .where(eq(ticketCoworkMembers.ticketId, ticketId));

    const [invitedUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
    if (!invitedUser || !isHQRole(invitedUser.role)) {
      return res.status(400).json({ error: "Sadece HQ kullanıcıları cowork sohbetine davet edilebilir" });
    }

    if (existingMembers.some(m => m.userId === userId)) {
      return res.status(409).json({ error: "Kullanıcı zaten cowork üyesi" });
    }

    if (ticket.assignedToUserId === userId) {
      return res.status(409).json({ error: "Atanan kişi zaten cowork erişimine sahip" });
    }

    const result = await db.insert(ticketCoworkMembers).values({
      ticketId,
      userId,
      invitedByUserId: user.id,
    }).returning();

    await storage.createNotification({
      userId,
      type: "task_assigned",
      title: `Cowork Daveti: ${ticket.title.substring(0, 50)}`,
      message: `${user.name ?? 'Bir kullanıcı'} sizi bir ticket cowork sohbetine davet etti`,
      link: `/hq-destek`,
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error inviting cowork member:", error);
    res.status(500).json({ error: "Failed to invite cowork member" });
  }
});

router.delete("/tickets/:id/cowork/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });
    const ticketId = parseInt(req.params.id);
    const targetUserId = req.params.userId;
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    if (ticket.assignedToUserId !== user.id) {
      return res.status(403).json({ error: "Sadece atanan kişi cowork üyesi çıkarabilir" });
    }

    await db.delete(ticketCoworkMembers)
      .where(and(eq(ticketCoworkMembers.ticketId, ticketId), eq(ticketCoworkMembers.userId, targetUserId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing cowork member:", error);
    res.status(500).json({ error: "Failed to remove cowork member" });
  }
});

router.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const channelParam = req.query.channel as string | undefined;
    const channelFilter = channelParam && ["misafir", "franchise"].includes(channelParam)
      ? sql`AND channel = ${channelParam}`
      : sql``;
    const channelFilterSt = channelParam && ["misafir", "franchise"].includes(channelParam)
      ? sql`AND st.channel = ${channelParam}`
      : sql``;

    const branchFilter = !isHQRole(user.role) ? sql`AND st.branch_id = ${user.branchId}` : sql``;
    const branchFilterSimple = !isHQRole(user.role) ? sql`AND branch_id = ${user.branchId}` : sql``;

    const [openTickets, slaBreaches, slaRisk, resolvedThisWeek, avgRating, hqTaskStats] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple} ${channelFilter}`),
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_breached = true AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple} ${channelFilter}`),
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_deadline < NOW() + INTERVAL '2 hours' AND sla_breached = false AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple} ${channelFilter}`),
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'cozuldu' AND resolved_at > NOW() - INTERVAL '7 days' AND is_deleted = false ${branchFilterSimple} ${channelFilter}`),
      db.execute(sql`SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as count FROM support_tickets WHERE rating IS NOT NULL AND is_deleted = false ${branchFilterSimple} ${channelFilter}`),
      isHQRole(user.role)
        ? db.execute(sql`SELECT status, COUNT(*) as count FROM hq_tasks WHERE is_deleted = false GROUP BY status`)
        : Promise.resolve({ rows: [] }),
    ]);

    const deptBreakdown = await db.execute(
      sql`SELECT department, COUNT(*) as count, SUM(CASE WHEN sla_breached THEN 1 ELSE 0 END) as sla_breached_count
          FROM support_tickets 
          WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false ${branchFilterSimple} ${channelFilter}
          GROUP BY department ORDER BY count DESC`
    );

    const recentTickets = await db.execute(
      sql`SELECT st.id, st.ticket_number, st.title, st.department, st.priority, st.status, st.sla_breached, st.created_at, st.channel, st.ticket_type, st.rating, b.name as branch_name
          FROM support_tickets st LEFT JOIN branches b ON st.branch_id = b.id
          WHERE st.is_deleted = false ${branchFilter} ${channelFilterSt} ORDER BY st.created_at DESC LIMIT 10`
    );

    const avgResolveTime = await db.execute(
      sql`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours
          FROM support_tickets WHERE resolved_at IS NOT NULL AND is_deleted = false ${branchFilterSimple} ${channelFilter}`
    );

    res.json({
      openTickets: parseInt(openTickets.rows[0]?.count as string ?? "0"),
      slaBreaches: parseInt(slaBreaches.rows[0]?.count as string ?? "0"),
      slaRisk: parseInt(slaRisk.rows[0]?.count as string ?? "0"),
      resolvedThisWeek: parseInt(resolvedThisWeek.rows[0]?.count as string ?? "0"),
      avgRating: parseFloat(avgRating.rows[0]?.avg_rating as string ?? "0") || null,
      ratingCount: parseInt(avgRating.rows[0]?.count as string ?? "0"),
      avgResolveTimeHours: parseFloat(avgResolveTime.rows[0]?.avg_hours as string ?? "0") || null,
      hqTaskStats: hqTaskStats.rows,
      deptBreakdown: deptBreakdown.rows,
      recentTickets: recentTickets.rows,
      channel: channelParam || "all",
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
      SELECT ht.*, COALESCE(u1.first_name || ' ' || u1.last_name, u1.first_name, '') as assigned_by_name, COALESCE(u2.first_name || ' ' || u2.last_name, u2.first_name, '') as assigned_to_name
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
      link: `/hq-destek`,
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
      sql`SELECT br.*, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') as user_name, b.name as branch_name
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

const uploadDir = path.join(process.cwd(), "uploads", "tickets");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "video/mp4", "video/quicktime",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Desteklenmeyen dosya türü"));
  },
});

const tempUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error("Sadece resim dosyalari yuklenebilir"));
  },
});

const tempUploadRegistry = new Map<string, { userId: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tempUploadRegistry.entries()) {
    if (now - val.createdAt > 30 * 60 * 1000) {
      tempUploadRegistry.delete(key);
      const fp = path.join(uploadDir, key);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  }
}, 10 * 60 * 1000);

router.post("/tickets/temp-upload", tempUpload.single("file"), async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userUploads = [...tempUploadRegistry.values()].filter(v => v.userId === user.id).length;
    if (userUploads >= 10) {
      return res.status(429).json({ error: "Cok fazla yukleme" });
    }

    if (!req.file) return res.status(400).json({ error: "Dosya gerekli" });
    tempUploadRegistry.set(req.file.filename, { userId: user.id, createdAt: Date.now() });
    const url = `/api/iletisim/attachments/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (err) {
    console.error("Error temp uploading:", err);
    res.status(500).json({ error: "Dosya yuklenemedi" });
  }
});

router.post("/tickets/:id/attachments", upload.single("file"), async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) return res.status(403).json({ error: "Access denied" });
    const ticketId = parseInt(req.params.id);
    const file = req.file;
    const userId = user.id;
    const { commentId } = req.body;

    if (!file) return res.status(400).json({ error: "Dosya gerekli" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket bulunamadı" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    const [attachment] = await db.insert(ticketAttachments).values({
      ticketId,
      commentId: commentId ? parseInt(commentId) : null,
      uploadedByUserId: userId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey: file.filename,
    }).returning();

    res.status(201).json(attachment);
  } catch (err) {
    console.error("Error uploading attachment:", err);
    res.status(500).json({ error: "Dosya yüklenemedi" });
  }
});

router.get("/tickets/:id/attachments", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) return res.status(403).json({ error: "Access denied" });
    const ticketId = parseInt(req.params.id);

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket bulunamadı" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    const attachments = await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId))
      .orderBy(asc(ticketAttachments.createdAt));
    res.json(attachments);
  } catch (err) {
    console.error("Error fetching attachments:", err);
    res.status(500).json({ error: "Ekler alınamadı" });
  }
});

router.get("/attachments/:filename", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) return res.status(403).json({ error: "Access denied" });

    const [attachment] = await db.select().from(ticketAttachments).where(eq(ticketAttachments.storageKey, req.params.filename));
    if (!attachment) return res.status(404).json({ error: "Dosya bulunamadı" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, attachment.ticketId));
    if (!ticket || !canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Dosya bulunamadı" });
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: "Dosya okunamadı" });
  }
});

router.patch("/tickets/:id/assign", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "Yetki yok" });

    const ticketId = parseInt(req.params.id);
    const { assignedToUserId } = req.body;
    if (!assignedToUserId) return res.status(400).json({ error: "assignedToUserId gerekli" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket bulunamadı" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    const [updated] = await db
      .update(supportTickets)
      .set({
        assignedToUserId,
        assignedAt: new Date(),
        status: "islemde",
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    const [assignedUser] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, assignedToUserId));
    const assigneeName = assignedUser ? `${assignedUser.firstName ?? ""} ${assignedUser.lastName ?? ""}`.trim() : assignedToUserId;

    await db.insert(supportTicketComments).values({
      ticketId,
      authorId: user.id,
      content: `Ticket atandı: ${assigneeName}`,
      isInternal: true,
      commentType: 'internal',
    });

    await storage.createNotification({
      userId: assignedToUserId,
      type: "task_assigned",
      title: `Ticket Atandı: ${ticket.title.substring(0, 50)}`,
      message: `${ticket.department.toUpperCase()} departmanı ticket'ı size atandı`,
      link: `/hq-destek`,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error assigning ticket:", err);
    res.status(500).json({ error: "Atama başarısız" });
  }
});

const DEPT_ASSIGNABLE_ROLES: Record<string, string[]> = {
  teknik: ["admin", "ceo", "cgo", "teknik_sorumlu"],
  lojistik: ["admin", "ceo", "cgo", "satinalma"],
  muhasebe: ["admin", "ceo", "muhasebe_ik"],
  marketing: ["admin", "ceo", "cgo"],
  trainer: ["admin", "ceo", "coach", "trainer"],
  hr: ["admin", "ceo", "muhasebe_ik"],
};

router.get("/assignable-users", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "Yetki yok" });
    const { department } = req.query;
    const HQ_ALL_ROLES = ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "kalite_kontrol", "teknik_sorumlu"];
    const allowedRoles = department === 'all'
      ? HQ_ALL_ROLES
      : department
        ? (DEPT_ASSIGNABLE_ROLES[department as string] ?? ["admin", "ceo", "cgo"])
        : ["admin", "ceo", "cgo"];

    const assignableUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.isActive, true),
          inArray(users.role, allowedRoles)
        )
      );

    const result = assignableUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id,
      role: u.role,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching assignable users:", err);
    res.status(500).json({ error: "Kullanıcılar alınamadı" });
  }
});

router.post("/tickets/:id/sla-remind", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "Yetki yok" });

    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket) return res.status(404).json({ error: "Ticket bulunamadı" });
    if (!canAccessTicket(user, ticket)) return res.status(403).json({ error: "Access denied" });

    await db.insert(supportTicketComments).values({
      ticketId,
      authorId: user.id,
      content: "SLA hatırlatması gönderildi",
      isInternal: true,
      commentType: 'internal',
    });

    const executives = await db.execute(
      sql`SELECT id FROM users WHERE role IN ('cgo', 'ceo') AND is_active = true AND deleted_at IS NULL`
    );
    for (const exec of executives.rows) {
      await storage.createNotification({
        userId: exec.id as string,
        type: "sla_breach",
        title: `SLA Hatırlatma: ${ticket.department.toUpperCase()}`,
        message: `${ticket.title.substring(0, 80)} — Manuel hatırlatma gönderildi`,
        link: `/hq-destek`,
      });
    }

    if (ticket.assignedToUserId) {
      await storage.createNotification({
        userId: ticket.assignedToUserId,
        type: "sla_breach",
        title: `SLA Hatırlatma: ${ticket.title.substring(0, 60)}`,
        message: `Bu ticket için SLA hatırlatması yapıldı`,
        link: `/hq-destek`,
      });
    }

    res.json({ success: true, message: "SLA hatırlatması gönderildi" });
  } catch (err) {
    console.error("Error sending SLA reminder:", err);
    res.status(500).json({ error: "Hatırlatma gönderilemedi" });
  }
});

router.get("/sla-rules", async (req: any, res: Response) => {
  try {
    const rules = await db
      .select()
      .from(slaRules)
      .orderBy(asc(slaRules.department), asc(slaRules.priority));
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "SLA kuralları alınamadı" });
  }
});

router.patch("/sla-rules/:id", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (!['admin', 'ceo'].includes(user.role)) {
      return res.status(403).json({ error: "Yetki yok" });
    }
    const id = parseInt(req.params.id);
    const { hoursLimit } = req.body;

    if (!hoursLimit || hoursLimit < 1 || hoursLimit > 720) {
      return res.status(400).json({ error: "hoursLimit must be between 1 and 720" });
    }

    const [updated] = await db
      .update(slaRules)
      .set({ hoursLimit, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(slaRules.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Kural bulunamadı" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "SLA kuralı güncellenemedi" });
  }
});

router.post("/sla-rules/reset", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Yetki yok" });
    }

    const DEFAULTS = [
      { department: 'teknik', priority: 'kritik', hoursLimit: 4 },
      { department: 'teknik', priority: 'yuksek', hoursLimit: 8 },
      { department: 'teknik', priority: 'normal', hoursLimit: 24 },
      { department: 'teknik', priority: 'dusuk', hoursLimit: 48 },
      { department: 'lojistik', priority: 'kritik', hoursLimit: 8 },
      { department: 'lojistik', priority: 'yuksek', hoursLimit: 12 },
      { department: 'lojistik', priority: 'normal', hoursLimit: 24 },
      { department: 'lojistik', priority: 'dusuk', hoursLimit: 48 },
      { department: 'muhasebe', priority: 'kritik', hoursLimit: 12 },
      { department: 'muhasebe', priority: 'yuksek', hoursLimit: 24 },
      { department: 'muhasebe', priority: 'normal', hoursLimit: 48 },
      { department: 'muhasebe', priority: 'dusuk', hoursLimit: 72 },
      { department: 'marketing', priority: 'kritik', hoursLimit: 24 },
      { department: 'marketing', priority: 'yuksek', hoursLimit: 48 },
      { department: 'marketing', priority: 'normal', hoursLimit: 72 },
      { department: 'marketing', priority: 'dusuk', hoursLimit: 96 },
      { department: 'trainer', priority: 'kritik', hoursLimit: 12 },
      { department: 'trainer', priority: 'yuksek', hoursLimit: 24 },
      { department: 'trainer', priority: 'normal', hoursLimit: 48 },
      { department: 'trainer', priority: 'dusuk', hoursLimit: 72 },
      { department: 'hr', priority: 'kritik', hoursLimit: 12 },
      { department: 'hr', priority: 'yuksek', hoursLimit: 24 },
      { department: 'hr', priority: 'normal', hoursLimit: 72 },
      { department: 'hr', priority: 'dusuk', hoursLimit: 96 },
    ];

    for (const rule of DEFAULTS) {
      const [existing] = await db
        .select()
        .from(slaRules)
        .where(
          and(
            eq(slaRules.department, rule.department),
            eq(slaRules.priority, rule.priority)
          )
        );
      if (existing) {
        await db
          .update(slaRules)
          .set({ hoursLimit: rule.hoursLimit, updatedAt: new Date() })
          .where(eq(slaRules.id, existing.id));
      } else {
        await db.insert(slaRules).values(rule);
      }
    }

    res.json({ success: true, message: "Tüm SLA kuralları varsayılana sıfırlandı" });
  } catch (err) {
    res.status(500).json({ error: "Sıfırlama başarısız" });
  }
});

router.get("/business-hours", async (req: any, res: Response) => {
  try {
    const config = await getBusinessHoursConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Mesai saatleri alınamadı" });
  }
});

router.patch("/business-hours", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (!['admin', 'ceo', 'cgo'].includes(user.role)) {
      return res.status(403).json({ error: "Yetki yok" });
    }

    const schema = z.object({
      startHour: z.number().min(0).max(23).optional(),
      endHour: z.number().min(1).max(24).optional(),
      workDays: z.array(z.number().min(1).max(7)).min(1).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    const { startHour, endHour, workDays } = parsed.data;

    if (startHour !== undefined && endHour !== undefined && startHour >= endHour) {
      return res.status(400).json({ error: "Başlangıç saati bitiş saatinden küçük olmalı" });
    }

    const [existing] = await db.select().from(slaBusinessHours).limit(1);

    const updates: Record<string, any> = { updatedBy: user.id, updatedAt: new Date() };
    if (startHour !== undefined) updates.startHour = startHour;
    if (endHour !== undefined) updates.endHour = endHour;
    if (workDays !== undefined) updates.workDays = workDays;

    if (existing) {
      const finalStart = startHour ?? existing.startHour;
      const finalEnd = endHour ?? existing.endHour;
      if (finalStart >= finalEnd) {
        return res.status(400).json({ error: "Başlangıç saati bitiş saatinden küçük olmalı" });
      }
      await db.update(slaBusinessHours).set(updates).where(eq(slaBusinessHours.id, existing.id));
    } else {
      await db.insert(slaBusinessHours).values({
        startHour: startHour ?? 8,
        endHour: endHour ?? 18,
        workDays: workDays ?? [1, 2, 3, 4, 5],
      });
    }

    const config = await getBusinessHoursConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Mesai saatleri güncellenemedi" });
  }
});

router.get("/tickets/:id/sla-remaining", async (req: any, res: Response) => {
  try {
    const user = req.user!;
    if (BRANCH_ONLY_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket || ticket.isDeleted) return res.status(404).json({ error: "Ticket not found" });

    if (!canAccessTicket(user, ticket)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!ticket.slaDeadline) {
      return res.json({ remainingHours: null, breached: false });
    }

    if (ticket.slaBreached) {
      return res.json({ remainingHours: 0, breached: true });
    }

    const config = await getBusinessHoursConfig();
    const remaining = getRemainingBusinessHours(ticket.slaDeadline, new Date(), config);

    res.json({
      remainingHours: Math.round(remaining * 10) / 10,
      breached: remaining <= 0,
      deadline: ticket.slaDeadline,
    });
  } catch (err) {
    res.status(500).json({ error: "SLA bilgisi alınamadı" });
  }
});

interface ResolvedTicketRow {
  user_id: string;
  created_at: string;
  resolved_at: string;
  sla_breached: boolean;
  satisfaction_score: string | null;
}

interface OpenStatRow {
  user_id: string;
  open_ticket_count: string;
}

interface UserInfoRow {
  id: string;
  user_name: string;
  user_role: string;
}

router.get("/staff-performance", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!canSeeAllTickets(user.role)) return res.status(403).json({ error: "Yetkiniz yok" });

    const days = parseInt(req.query.days as string) || 30;
    const bhConfig = await getBusinessHoursConfig();

    const resolvedTickets = await db.execute(sql`
      SELECT st.resolved_by_user_id as user_id, st.created_at, st.resolved_at,
             st.sla_breached, st.satisfaction_score
      FROM support_tickets st
      WHERE st.resolved_by_user_id IS NOT NULL
        AND st.resolved_at IS NOT NULL
        AND st.resolved_at >= NOW() - CAST(${days + ' days'} AS INTERVAL)
        AND st.is_deleted = false
    `);

    const openStats = await db.execute(sql`
      SELECT st.assigned_to_user_id as user_id, COUNT(*) as open_ticket_count
      FROM support_tickets st
      WHERE st.status NOT IN ('cozuldu', 'kapatildi')
        AND st.assigned_to_user_id IS NOT NULL
        AND st.is_deleted = false
      GROUP BY st.assigned_to_user_id
    `);

    const openMap = new Map<string, number>();
    for (const row of openStats.rows as OpenStatRow[]) {
      openMap.set(row.user_id, parseInt(String(row.open_ticket_count)));
    }

    const userMap = new Map<string, { resolvedCount: number; totalBizHours: number; slaBreachedCount: number; satisfactionSum: number; satisfactionCount: number }>();
    for (const row of resolvedTickets.rows as ResolvedTicketRow[]) {
      const uid = row.user_id;
      if (!userMap.has(uid)) userMap.set(uid, { resolvedCount: 0, totalBizHours: 0, slaBreachedCount: 0, satisfactionSum: 0, satisfactionCount: 0 });
      const entry = userMap.get(uid)!;
      entry.resolvedCount++;
      entry.totalBizHours += getElapsedBusinessHours(new Date(row.created_at), new Date(row.resolved_at), bhConfig);
      if (row.sla_breached) entry.slaBreachedCount++;
      if (row.satisfaction_score != null) {
        entry.satisfactionSum += parseFloat(String(row.satisfaction_score));
        entry.satisfactionCount++;
      }
    }

    const allUserIds = new Set([...userMap.keys(), ...openMap.keys()]);
    if (allUserIds.size === 0) return res.json([]);

    const userInfoResult = await db.execute(sql`
      SELECT id, COALESCE(first_name || ' ' || last_name, first_name, '') as user_name, role as user_role
      FROM users WHERE id = ANY(${sql`ARRAY[${sql.join([...allUserIds].map(id => sql`${id}`), sql`, `)}]`})
    `);
    const userInfoMap = new Map<string, { userName: string; userRole: string }>();
    for (const row of userInfoResult.rows as UserInfoRow[]) {
      userInfoMap.set(row.id, { userName: row.user_name, userRole: row.user_role });
    }

    const staff = [...allUserIds].map(uid => {
      const stats = userMap.get(uid);
      const info = userInfoMap.get(uid);
      if (!info) return null;

      const resolvedCount = stats?.resolvedCount ?? 0;
      const avgHours = resolvedCount > 0 ? (stats!.totalBizHours / resolvedCount) : 0;
      const slaBreachedCount = stats?.slaBreachedCount ?? 0;
      const avgSatisfaction = stats && stats.satisfactionCount > 0 ? stats.satisfactionSum / stats.satisfactionCount : 0;
      const openCount = openMap.get(uid) ?? 0;

      const slaComplianceRate = resolvedCount > 0
        ? Math.round(((resolvedCount - slaBreachedCount) / resolvedCount) * 100)
        : 100;

      let score = 50;
      score += Math.min(resolvedCount * 2, 30);
      score += (slaComplianceRate / 100) * 20;
      if (avgSatisfaction > 0) score += Math.min(avgSatisfaction, 5) * 4;
      if (avgHours > 24) score -= Math.min((avgHours - 24) * 0.5, 15);

      const performanceScore = Math.max(0, Math.min(100, Math.round(score)));

      return {
        userId: uid,
        userName: info.userName,
        userRole: info.userRole,
        resolvedCount,
        avgResolutionHours: Math.round(avgHours * 10) / 10,
        slaComplianceRate,
        avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        openTicketCount: openCount,
        performanceScore,
      };
    }).filter(Boolean);

    staff.sort((a, b) => (b!.performanceScore - a!.performanceScore) || (b!.resolvedCount - a!.resolvedCount));

    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff performance:", error);
    res.status(500).json({ error: "Performans verisi alınamadı" });
  }
});

router.get("/staff-performance/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!canSeeAllTickets(user.role)) return res.status(403).json({ error: "Yetkiniz yok" });

    const targetUserId = req.params.userId;
    const days = parseInt(req.query.days as string) || 30;
    const bhConfig = await getBusinessHoursConfig();

    const tickets = await db.execute(sql`
      SELECT 
        st.id, st.ticket_number, st.title, st.department, st.priority, st.status,
        st.sla_breached, st.created_at, st.resolved_at, st.satisfaction_score,
        b.name as branch_name
      FROM support_tickets st
      LEFT JOIN branches b ON st.branch_id = b.id
      WHERE st.resolved_by_user_id = ${targetUserId}
        AND st.resolved_at IS NOT NULL
        AND st.resolved_at >= NOW() - CAST(${days + ' days'} AS INTERVAL)
        AND st.is_deleted = false
      ORDER BY st.resolved_at DESC
      LIMIT 50
    `);

    interface StaffDetailTicketRow {
      id: number;
      ticket_number: string;
      title: string;
      department: string;
      priority: string;
      status: string;
      sla_breached: boolean;
      created_at: string;
      resolved_at: string | null;
      satisfaction_score: string | null;
      branch_name: string | null;
    }

    const ticketsWithBizHours = (tickets.rows as StaffDetailTicketRow[]).map((row) => ({
      ...row,
      resolution_hours: row.resolved_at && row.created_at
        ? Math.round(getElapsedBusinessHours(new Date(row.created_at), new Date(row.resolved_at), bhConfig) * 10) / 10
        : null,
    }));

    const userInfo = await db.execute(sql`
      SELECT id, COALESCE(first_name || ' ' || last_name, first_name, '') as name, role
      FROM users WHERE id = ${targetUserId}
    `);

    res.json({
      user: userInfo.rows[0] ?? null,
      tickets: ticketsWithBizHours,
    });
  } catch (error) {
    console.error("Error fetching staff detail:", error);
    res.status(500).json({ error: "Detay alınamadı" });
  }
});

export { router as crmIletisimRouter };
