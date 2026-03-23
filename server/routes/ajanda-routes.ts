import { Router } from "express";
import { db } from "../db";
import { userTodos, userCalendarEvents, userNotes } from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte, ilike, or } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { z } from "zod";

const router = Router();

interface AuthUser {
  id: string;
  role: string;
  branchId?: number | null;
  firstName?: string;
  lastName?: string;
}

const todoCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().max(5).optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string()).optional().nullable(),
  source: z.string().max(30).default("manual"),
  sourceId: z.string().max(50).optional().nullable(),
  sourceUrl: z.string().max(200).optional().nullable(),
});

const todoUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().max(5).optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
  tags: z.array(z.string()).optional().nullable(),
});

const eventCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  startTime: z.string().min(1),
  endTime: z.string().optional().nullable(),
  allDay: z.boolean().default(false),
  eventType: z.enum(["meeting", "reminder", "deadline", "visit", "call", "training", "shift"]).default("meeting"),
  location: z.string().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  relatedEntityType: z.string().max(30).optional().nullable(),
  relatedEntityId: z.string().max(50).optional().nullable(),
  relatedEntityUrl: z.string().max(200).optional().nullable(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  reminderMinutes: z.number().int().min(0).max(1440).default(30),
});

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
  eventType: z.enum(["meeting", "reminder", "deadline", "visit", "call", "training", "shift"]).optional(),
  location: z.string().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  reminderMinutes: z.number().int().min(0).max(1440).optional(),
});

const noteCreateSchema = z.object({
  title: z.string().max(300).optional().nullable(),
  content: z.string().min(1),
  relatedEntityType: z.string().max(30).optional().nullable(),
  relatedEntityId: z.string().max(50).optional().nullable(),
  relatedEntityName: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isPinned: z.boolean().default(false),
  color: z.string().max(20).optional().nullable(),
});

const noteUpdateSchema = z.object({
  title: z.string().max(300).optional().nullable(),
  content: z.string().min(1).optional(),
  relatedEntityType: z.string().max(30).optional().nullable(),
  relatedEntityId: z.string().max(50).optional().nullable(),
  relatedEntityName: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isPinned: z.boolean().optional(),
  color: z.string().max(20).optional().nullable(),
});

router.get("/api/ajanda/todos", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { status, source, priority, due } = req.query;

    const conditions: any[] = [eq(userTodos.userId, user.id)];

    if (status && status !== "all") {
      conditions.push(eq(userTodos.status, status as string));
    }
    if (source) {
      conditions.push(eq(userTodos.source, source as string));
    }
    if (priority) {
      conditions.push(eq(userTodos.priority, priority as string));
    }

    const now = new Date();
    if (due === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(gte(userTodos.dueDate, startOfDay));
      conditions.push(lte(userTodos.dueDate, endOfDay));
    } else if (due === "week") {
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      conditions.push(lte(userTodos.dueDate, endOfWeek));
    } else if (due === "overdue") {
      conditions.push(lte(userTodos.dueDate, now));
      conditions.push(eq(userTodos.status, "pending"));
    }

    const todos = await db
      .select()
      .from(userTodos)
      .where(and(...conditions))
      .orderBy(
        asc(userTodos.status),
        desc(sql`CASE WHEN ${userTodos.priority} = 'urgent' THEN 0 WHEN ${userTodos.priority} = 'high' THEN 1 WHEN ${userTodos.priority} = 'medium' THEN 2 ELSE 3 END`),
        asc(userTodos.dueDate)
      );

    res.json(todos);
  } catch (err: any) {
    console.error("[Ajanda] Todo list error:", err.message);
    res.status(500).json({ error: "Todo listesi alınamadı" });
  }
});

router.post("/api/ajanda/todos", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const parsed = todoCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = parsed.data;
    const [todo] = await db.insert(userTodos).values({
      userId: user.id,
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      dueTime: data.dueTime || null,
      priority: data.priority,
      tags: data.tags || null,
      source: data.source,
      sourceId: data.sourceId || null,
      sourceUrl: data.sourceUrl || null,
    }).returning();

    res.status(201).json(todo);
  } catch (err: any) {
    console.error("[Ajanda] Todo create error:", err.message);
    res.status(500).json({ error: "Todo oluşturulamadı" });
  }
});

router.patch("/api/ajanda/todos/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const parsed = todoUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await db.select().from(userTodos).where(and(eq(userTodos.id, id), eq(userTodos.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Todo bulunamadı" });

    const updates: any = { updatedAt: new Date() };
    const data = parsed.data;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.dueTime !== undefined) updates.dueTime = data.dueTime;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === "done") updates.completedAt = new Date();
    }
    if (data.tags !== undefined) updates.tags = data.tags;

    const [updated] = await db.update(userTodos).set(updates).where(eq(userTodos.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Todo update error:", err.message);
    res.status(500).json({ error: "Todo güncellenemedi" });
  }
});

router.delete("/api/ajanda/todos/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const existing = await db.select().from(userTodos).where(and(eq(userTodos.id, id), eq(userTodos.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Todo bulunamadı" });

    await db.delete(userTodos).where(eq(userTodos.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Ajanda] Todo delete error:", err.message);
    res.status(500).json({ error: "Todo silinemedi" });
  }
});

router.post("/api/ajanda/todos/:id/complete", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const existing = await db.select().from(userTodos).where(and(eq(userTodos.id, id), eq(userTodos.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Todo bulunamadı" });

    const newStatus = existing[0].status === "done" ? "pending" : "done";
    const [updated] = await db.update(userTodos).set({
      status: newStatus,
      completedAt: newStatus === "done" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(userTodos.id, id)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Todo complete error:", err.message);
    res.status(500).json({ error: "Todo tamamlanamadı" });
  }
});

router.post("/api/ajanda/todos/:id/snooze", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const { snoozeUntil } = req.body;
    if (!snoozeUntil) return res.status(400).json({ error: "snoozeUntil gerekli" });

    const existing = await db.select().from(userTodos).where(and(eq(userTodos.id, id), eq(userTodos.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Todo bulunamadı" });

    const [updated] = await db.update(userTodos).set({
      dueDate: new Date(snoozeUntil),
      updatedAt: new Date(),
    }).where(eq(userTodos.id, id)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Todo snooze error:", err.message);
    res.status(500).json({ error: "Todo ertelenemedi" });
  }
});

router.get("/api/ajanda/events", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { start, end, type } = req.query;

    const conditions: any[] = [eq(userCalendarEvents.userId, user.id)];

    if (start) {
      conditions.push(gte(userCalendarEvents.startTime, new Date(start as string)));
    }
    if (end) {
      conditions.push(lte(userCalendarEvents.startTime, new Date(end as string)));
    }
    if (type && type !== "all") {
      conditions.push(eq(userCalendarEvents.eventType, type as string));
    }

    const events = await db
      .select()
      .from(userCalendarEvents)
      .where(and(...conditions))
      .orderBy(asc(userCalendarEvents.startTime));

    res.json(events);
  } catch (err: any) {
    console.error("[Ajanda] Event list error:", err.message);
    res.status(500).json({ error: "Etkinlik listesi alınamadı" });
  }
});

router.post("/api/ajanda/events", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const parsed = eventCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = parsed.data;
    const [event] = await db.insert(userCalendarEvents).values({
      userId: user.id,
      title: data.title,
      description: data.description || null,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      allDay: data.allDay,
      eventType: data.eventType,
      location: data.location || null,
      color: data.color || null,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      relatedEntityUrl: data.relatedEntityUrl || null,
      recurrence: data.recurrence,
      reminderMinutes: data.reminderMinutes,
    }).returning();

    res.status(201).json(event);
  } catch (err: any) {
    console.error("[Ajanda] Event create error:", err.message);
    res.status(500).json({ error: "Etkinlik oluşturulamadı" });
  }
});

router.patch("/api/ajanda/events/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await db.select().from(userCalendarEvents).where(and(eq(userCalendarEvents.id, id), eq(userCalendarEvents.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Etkinlik bulunamadı" });

    const updates: any = { updatedAt: new Date() };
    const data = parsed.data;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.startTime !== undefined) updates.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updates.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.allDay !== undefined) updates.allDay = data.allDay;
    if (data.eventType !== undefined) updates.eventType = data.eventType;
    if (data.location !== undefined) updates.location = data.location;
    if (data.color !== undefined) updates.color = data.color;
    if (data.reminderMinutes !== undefined) updates.reminderMinutes = data.reminderMinutes;

    const [updated] = await db.update(userCalendarEvents).set(updates).where(eq(userCalendarEvents.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Event update error:", err.message);
    res.status(500).json({ error: "Etkinlik güncellenemedi" });
  }
});

router.delete("/api/ajanda/events/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const existing = await db.select().from(userCalendarEvents).where(and(eq(userCalendarEvents.id, id), eq(userCalendarEvents.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Etkinlik bulunamadı" });

    await db.delete(userCalendarEvents).where(eq(userCalendarEvents.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Ajanda] Event delete error:", err.message);
    res.status(500).json({ error: "Etkinlik silinemedi" });
  }
});

router.get("/api/ajanda/notes", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { search, entity_type, pinned, tags } = req.query;

    const conditions: any[] = [eq(userNotes.userId, user.id)];

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(
          ilike(userNotes.title, term),
          ilike(userNotes.content, term)
        )
      );
    }
    if (entity_type) {
      conditions.push(eq(userNotes.relatedEntityType, entity_type as string));
    }
    if (pinned === "true") {
      conditions.push(eq(userNotes.isPinned, true));
    }

    const notes = await db
      .select()
      .from(userNotes)
      .where(and(...conditions))
      .orderBy(desc(userNotes.isPinned), desc(userNotes.updatedAt));

    if (tags) {
      const tagList = (tags as string).split(",").map(t => t.trim().toLowerCase());
      const filtered = notes.filter(n =>
        n.tags && n.tags.some(t => tagList.includes(t.toLowerCase()))
      );
      return res.json(filtered);
    }

    res.json(notes);
  } catch (err: any) {
    console.error("[Ajanda] Note list error:", err.message);
    res.status(500).json({ error: "Not listesi alınamadı" });
  }
});

router.post("/api/ajanda/notes", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const parsed = noteCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = parsed.data;
    const [note] = await db.insert(userNotes).values({
      userId: user.id,
      title: data.title || null,
      content: data.content,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      relatedEntityName: data.relatedEntityName || null,
      tags: data.tags || null,
      isPinned: data.isPinned,
      color: data.color || null,
    }).returning();

    res.status(201).json(note);
  } catch (err: any) {
    console.error("[Ajanda] Note create error:", err.message);
    res.status(500).json({ error: "Not oluşturulamadı" });
  }
});

router.patch("/api/ajanda/notes/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const parsed = noteUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await db.select().from(userNotes).where(and(eq(userNotes.id, id), eq(userNotes.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not bulunamadı" });

    const updates: any = { updatedAt: new Date() };
    const data = parsed.data;
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.relatedEntityType !== undefined) updates.relatedEntityType = data.relatedEntityType;
    if (data.relatedEntityId !== undefined) updates.relatedEntityId = data.relatedEntityId;
    if (data.relatedEntityName !== undefined) updates.relatedEntityName = data.relatedEntityName;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.isPinned !== undefined) updates.isPinned = data.isPinned;
    if (data.color !== undefined) updates.color = data.color;

    const [updated] = await db.update(userNotes).set(updates).where(eq(userNotes.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Note update error:", err.message);
    res.status(500).json({ error: "Not güncellenemedi" });
  }
});

router.delete("/api/ajanda/notes/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const existing = await db.select().from(userNotes).where(and(eq(userNotes.id, id), eq(userNotes.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not bulunamadı" });

    await db.delete(userNotes).where(eq(userNotes.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Ajanda] Note delete error:", err.message);
    res.status(500).json({ error: "Not silinemedi" });
  }
});

router.post("/api/ajanda/notes/:id/pin", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const existing = await db.select().from(userNotes).where(and(eq(userNotes.id, id), eq(userNotes.userId, user.id))).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not bulunamadı" });

    const [updated] = await db.update(userNotes).set({
      isPinned: !existing[0].isPinned,
      updatedAt: new Date(),
    }).where(eq(userNotes.id, id)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("[Ajanda] Note pin error:", err.message);
    res.status(500).json({ error: "Not sabitlenirken hata" });
  }
});

router.get("/api/ajanda/briefing", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [todayTodosResult, overdueTodosResult, todayEventsResult, highPriorityResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(userTodos)
        .where(and(
          eq(userTodos.userId, user.id),
          eq(userTodos.status, "pending"),
          gte(userTodos.dueDate, startOfDay),
          lte(userTodos.dueDate, endOfDay)
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(userTodos)
        .where(and(
          eq(userTodos.userId, user.id),
          eq(userTodos.status, "pending"),
          lte(userTodos.dueDate, now)
        )),
      db.select()
        .from(userCalendarEvents)
        .where(and(
          eq(userCalendarEvents.userId, user.id),
          gte(userCalendarEvents.startTime, startOfDay),
          lte(userCalendarEvents.startTime, endOfDay)
        ))
        .orderBy(asc(userCalendarEvents.startTime))
        .limit(10),
      db.select({ count: sql<number>`count(*)` })
        .from(userTodos)
        .where(and(
          eq(userTodos.userId, user.id),
          eq(userTodos.status, "pending"),
          or(eq(userTodos.priority, "high"), eq(userTodos.priority, "urgent"))
        )),
    ]);

    let openTickets = { total: 0, slaNearing: 0 };
    try {
      const ticketResult = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('acik', 'beklemede')) as total,
          COUNT(*) FILTER (WHERE status IN ('acik', 'beklemede') AND sla_deadline_at IS NOT NULL AND sla_deadline_at < NOW() + INTERVAL '2 hours') as sla_nearing
        FROM support_tickets 
        WHERE assigned_to_user_id = ${user.id}
      `);
      if (ticketResult.rows[0]) {
        openTickets = {
          total: parseInt(ticketResult.rows[0].total as string) || 0,
          slaNearing: parseInt(ticketResult.rows[0].sla_nearing as string) || 0,
        };
      }
    } catch { /* no crm tickets table */ }

    res.json({
      todayTodos: {
        total: Number(todayTodosResult[0]?.count || 0),
        overdue: Number(overdueTodosResult[0]?.count || 0),
        highPriority: Number(highPriorityResult[0]?.count || 0),
      },
      todayEvents: todayEventsResult.map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        type: e.eventType,
        location: e.location,
      })),
      openTickets,
      pendingApprovals: 0,
    });
  } catch (err: any) {
    console.error("[Ajanda] Briefing error:", err.message);
    res.status(500).json({ error: "Briefing alınamadı" });
  }
});

export { router as ajandaRouter };
