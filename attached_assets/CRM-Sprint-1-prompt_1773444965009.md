# CRM Sprint 1 — İletişim Merkezi Backend

## Context
DOSPRESSO franchise management platform. Stack: Node.js + Express, PostgreSQL with Drizzle ORM, shared schema in `shared/schema.ts`. users.id is VARCHAR. Soft delete only (never hard delete). Do NOT touch any existing tables or routes unless explicitly stated.

Existing tables to keep untouched: `customer_feedback`, `tasks`, `equipment_faults`, `messages`, `notifications`, `announcements`.

New system name: **İletişim Merkezi** (replaces "CRM" label in UI later).

---

## OVERVIEW — What We're Building

Three new tables + one routing engine + API endpoints:

1. `support_tickets` — Şube → HQ department requests (B2B layer)
2. `hq_tasks` — HQ internal tasks between HQ members only (invisible to branches)
3. `broadcast_receipts` — Read/confirm tracking for announcements
4. Auto-routing engine — When a ticket is created, automatically assign to correct HQ member + set SLA deadline + send notifications

---

## TASK 1 — Database Schema

### 1A. Add to `shared/schema.ts`

#### Table 1: `support_tickets`

```typescript
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  
  // Source
  branchId: integer("branch_id").references(() => branches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  
  // Classification
  department: varchar("department", { length: 50 }).notNull(),
  // Values: "teknik" | "lojistik" | "muhasebe" | "marketing" | "trainer" | "hr"
  
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  // Values: "dusuk" | "normal" | "yuksek" | "kritik"
  
  status: varchar("status", { length: 30 }).notNull().default("acik"),
  // Values: "acik" | "islemde" | "beklemede" | "cozuldu" | "kapatildi"
  
  // Assignment
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  
  // SLA
  slaDeadline: timestamp("sla_deadline"),
  slaBreached: boolean("sla_breached").notNull().default(false),
  slaBreachedAt: timestamp("sla_breached_at"),
  
  // Links to other tables
  relatedEquipmentId: integer("related_equipment_id"),
  // FK to equipment_faults if exists, nullable
  recurrenceCount: integer("recurrence_count").notNull().default(1),
  // How many times same branch reported same department issue
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id),
  resolutionNote: text("resolution_note"),
  satisfactionScore: integer("satisfaction_score"),
  // 1-5, filled by branch after resolution
  
  // Soft delete
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportTicketComments = pgTable("support_ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  // isInternal=true → only HQ can see, branch cannot
  createdAt: timestamp("created_at").defaultNow(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketComment = typeof supportTicketComments.$inferSelect;
```

#### Table 2: `hq_tasks`

```typescript
export const hqTasks = pgTable("hq_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 20 }).notNull().unique(),
  
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  
  // Assignment — both are HQ roles only
  assignedByUserId: varchar("assigned_by_user_id").notNull().references(() => users.id),
  assignedToUserId: varchar("assigned_to_user_id").notNull().references(() => users.id),
  
  department: varchar("department", { length: 50 }),
  // Which HQ department this belongs to
  
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("beklemede"),
  // Values: "beklemede" | "devam_ediyor" | "tamamlandi" | "iptal"
  
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
  progressPercent: integer("progress_percent").notNull().default(0),
  
  // Soft delete
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type HqTask = typeof hqTasks.$inferSelect;
export type InsertHqTask = typeof hqTasks.$inferInsert;
```

#### Table 3: `broadcast_receipts`

```typescript
export const broadcastReceipts = pgTable("broadcast_receipts", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  seenAt: timestamp("seen_at"),
  confirmedAt: timestamp("confirmed_at"),
  // confirmedAt filled when user clicks "Okundu / Onayladım"
}, (table) => ({
  uniq: unique("br_announcement_user_uniq").on(table.announcementId, table.userId),
}));

export type BroadcastReceipt = typeof broadcastReceipts.$inferSelect;
```

### 1B. Create migration SQL

Create file `migrations/add_crm_sprint1.sql`:

```sql
-- support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL UNIQUE,
  branch_id INTEGER REFERENCES branches(id),
  created_by_user_id VARCHAR REFERENCES users(id),
  department VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'acik',
  assigned_to_user_id VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP,
  sla_deadline TIMESTAMP,
  sla_breached BOOLEAN NOT NULL DEFAULT false,
  sla_breached_at TIMESTAMP,
  related_equipment_id INTEGER,
  recurrence_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMP,
  resolved_by_user_id VARCHAR REFERENCES users(id),
  resolution_note TEXT,
  satisfaction_score INTEGER,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS st_branch_idx ON support_tickets(branch_id);
CREATE INDEX IF NOT EXISTS st_dept_idx ON support_tickets(department);
CREATE INDEX IF NOT EXISTS st_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS st_assigned_idx ON support_tickets(assigned_to_user_id);

-- support_ticket_comments
CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  author_id VARCHAR NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- hq_tasks
CREATE TABLE IF NOT EXISTS hq_tasks (
  id SERIAL PRIMARY KEY,
  task_number VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  assigned_by_user_id VARCHAR NOT NULL REFERENCES users(id),
  assigned_to_user_id VARCHAR NOT NULL REFERENCES users(id),
  department VARCHAR(50),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'beklemede',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  completion_note TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hqt_assigned_to_idx ON hq_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS hqt_assigned_by_idx ON hq_tasks(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS hqt_status_idx ON hq_tasks(status);

-- broadcast_receipts
CREATE TABLE IF NOT EXISTS broadcast_receipts (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  branch_id INTEGER REFERENCES branches(id),
  seen_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  CONSTRAINT br_announcement_user_uniq UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS br_ann_idx ON broadcast_receipts(announcement_id);
```

Run this migration on server startup using `db.execute(sql`...`)` wrapped in try/catch. Add to a `runCrmMigrations()` function called from `server/routes.ts` during `registerRoutes()`.

---

## TASK 2 — Auto-Routing Engine

Create new file: `server/services/ticket-routing-engine.ts`

```typescript
import { db } from "../db";
import { supportTickets, users } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";

// SLA hours by department and priority
const SLA_RULES: Record<string, Record<string, number>> = {
  teknik:    { kritik: 4,  yuksek: 8,  normal: 24, dusuk: 48 },
  lojistik:  { kritik: 8,  yuksek: 12, normal: 24, dusuk: 48 },
  muhasebe:  { kritik: 12, yuksek: 24, normal: 48, dusuk: 72 },
  marketing: { kritik: 24, yuksek: 48, normal: 72, dusuk: 96 },
  trainer:   { kritik: 12, yuksek: 24, normal: 48, dusuk: 72 },
  hr:        { kritik: 12, yuksek: 24, normal: 72, dusuk: 96 },
};

// Default assignee role per department
const DEPT_ASSIGNEE_ROLE: Record<string, string> = {
  teknik:    "teknik_sorumlu",   // or closest match in your roles
  lojistik:  "satinalma",
  muhasebe:  "muhasebe_ik",
  marketing: "cgo",
  trainer:   "coach",
  hr:        "muhasebe_ik",
};

// Escalation: who gets notified beyond the assignee
const DEPT_ESCALATION_ROLES: Record<string, string[]> = {
  teknik:    ["cgo"],           // also notify CGO for kritik
  lojistik:  ["satinalma", "cgo"],
  muhasebe:  ["muhasebe_ik"],
  marketing: ["cgo"],
  trainer:   ["coach", "cgo"],
  hr:        ["muhasebe_ik", "cgo"],
};

export async function routeTicket(ticketId: number): Promise<void> {
  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, ticketId),
  });
  if (!ticket) return;

  // 1. Calculate SLA deadline
  const slaHours = SLA_RULES[ticket.department]?.[ticket.priority] ?? 48;
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  // 2. Find assignee — look for active user with the target role
  const targetRole = DEPT_ASSIGNEE_ROLE[ticket.department];
  let assignedToUserId: string | null = null;

  if (targetRole) {
    // Find first active HQ user with this role
    const assigneeResult = await db.execute(
      sql`SELECT id FROM users WHERE role = ${targetRole} AND is_active = true LIMIT 1`
    );
    if (assigneeResult.rows.length > 0) {
      assignedToUserId = assigneeResult.rows[0].id as string;
    }
  }

  // Fallback: if no assignee found, find CGO
  if (!assignedToUserId) {
    const cgoResult = await db.execute(
      sql`SELECT id FROM users WHERE role = 'cgo' AND is_active = true LIMIT 1`
    );
    if (cgoResult.rows.length > 0) {
      assignedToUserId = cgoResult.rows[0].id as string;
    }
  }

  // 3. Check recurrence — same branch + same department in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM support_tickets 
        WHERE branch_id = ${ticket.branchId} 
        AND department = ${ticket.department}
        AND created_at > ${thirtyDaysAgo}
        AND id != ${ticketId}
        AND is_deleted = false`
  );
  const recurrenceCount = parseInt(recentCount.rows[0]?.count as string ?? "0") + 1;

  // 4. Update ticket with routing info
  await db.update(supportTickets)
    .set({
      assignedToUserId,
      assignedAt: new Date(),
      slaDeadline,
      recurrenceCount,
      status: "islemde",
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));

  // 5. Send notification to assignee
  if (assignedToUserId) {
    await storage.createNotification({
      userId: assignedToUserId,
      type: "task_assigned",
      title: `Yeni Şube Talebi: ${ticket.department.toUpperCase()}`,
      message: `${ticket.title} — SLA: ${slaHours} saat`,
      link: `/iletisim-merkezi/ticket/${ticketId}`,
    });
  }

  // 6. Escalation notifications for kritik priority
  if (ticket.priority === "kritik") {
    const escalationRoles = DEPT_ESCALATION_ROLES[ticket.department] ?? ["cgo"];
    for (const role of escalationRoles) {
      if (role === targetRole) continue; // don't double-notify assignee
      const escResult = await db.execute(
        sql`SELECT id FROM users WHERE role = ${role} AND is_active = true`
      );
      for (const row of escResult.rows) {
        await storage.createNotification({
          userId: row.id as string,
          type: "critical_fault",
          title: `KRİTİK Şube Talebi — ${ticket.department.toUpperCase()}`,
          message: `${ticket.title} — SLA: ${slaHours} saat`,
          link: `/iletisim-merkezi/ticket/${ticketId}`,
        });
      }
    }
  }

  // 7. Recurrence alert — if this is 2nd+ time same dept from same branch
  if (recurrenceCount >= 2) {
    // Notify CGO about recurring issue
    const cgoUsers = await db.execute(
      sql`SELECT id FROM users WHERE role IN ('cgo', 'ceo') AND is_active = true`
    );
    for (const row of cgoUsers.rows) {
      await storage.createNotification({
        userId: row.id as string,
        type: "critical_fault",
        title: `Tekrarlayan Talep (${recurrenceCount}. kez) — ${ticket.department}`,
        message: `Şube ${ticket.branchId} bu departmana ${recurrenceCount}. kez talep açtı`,
        link: `/iletisim-merkezi?tab=b2b&branch=${ticket.branchId}`,
      });
    }
  }
}

// SLA breach checker — call this from the existing scheduler or reminders.ts
export async function checkSlaBreaches(): Promise<void> {
  const now = new Date();
  
  // Find tickets past SLA deadline, not yet marked as breached
  const breachedTickets = await db.execute(
    sql`SELECT id, assigned_to_user_id, title, department
        FROM support_tickets 
        WHERE sla_deadline < ${now}
        AND sla_breached = false
        AND status NOT IN ('cozuldu', 'kapatildi')
        AND is_deleted = false`
  );

  for (const ticket of breachedTickets.rows) {
    // Mark as breached
    await db.execute(
      sql`UPDATE support_tickets SET sla_breached = true, sla_breached_at = ${now}, updated_at = ${now} WHERE id = ${ticket.id}`
    );

    // Notify CGO + CEO
    const executives = await db.execute(
      sql`SELECT id FROM users WHERE role IN ('cgo', 'ceo') AND is_active = true`
    );
    for (const exec of executives.rows) {
      await storage.createNotification({
        userId: exec.id as string,
        type: "sla_breach",
        title: `SLA İhlali: ${(ticket.department as string).toUpperCase()}`,
        message: `${ticket.title} — Süre aşıldı`,
        link: `/iletisim-merkezi/ticket/${ticket.id}`,
      });
    }
  }
}

// Generate unique ticket number: TKT-B001, TKT-B002...
export async function generateTicketNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM support_tickets`
  );
  const count = parseInt(result.rows[0]?.count as string ?? "0") + 1;
  return `TKT-B${String(count).padStart(3, "0")}`;
}

// Generate HQ task number: HQT-001, HQT-002...
export async function generateHqTaskNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM hq_tasks`
  );
  const count = parseInt(result.rows[0]?.count as string ?? "0") + 1;
  return `HQT-${String(count).padStart(3, "0")}`;
}
```

Add `import { sql } from "drizzle-orm";` at the top of the file.

---

## TASK 3 — API Routes

Create new file: `server/routes/crm-iletisim.ts`

This file is separate from existing `server/crm-routes.ts` — do NOT modify that file.

```typescript
import { Router } from "express";
import { db } from "../db";
import { supportTickets, supportTicketComments, hqTasks, broadcastReceipts, announcements } from "../../shared/schema";
import { eq, and, desc, isNull, sql, or, inArray } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { routeTicket, generateTicketNumber, generateHqTaskNumber, checkSlaBreaches } from "../services/ticket-routing-engine";

const router = Router();

// Helper — check if user is HQ role
function isHQRole(role: string): boolean {
  return ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "kalite_kontrol", "teknik_sorumlu"].includes(role);
}

// Helper — check if user can see all tickets (HQ) or only their branch
function canSeeAllTickets(role: string): boolean {
  return ["admin", "ceo", "cgo"].includes(role);
}

// ─── SUPPORT TICKETS ────────────────────────────────────────────────────────

// GET /api/iletisim/tickets — list tickets
// HQ sees all (filtered by dept for non-CGO/CEO)
// Branch sees only their own
router.get("/tickets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { department, status, priority, branchId, page = "1" } = req.query;
    const limit = 20;
    const offset = (parseInt(page as string) - 1) * limit;

    let query = `
      SELECT 
        st.*,
        b.name as branch_name,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM support_tickets st
      LEFT JOIN branches b ON st.branch_id = b.id
      LEFT JOIN users u1 ON st.created_by_user_id = u1.id
      LEFT JOIN users u2 ON st.assigned_to_user_id = u2.id
      WHERE st.is_deleted = false
    `;
    const params: any[] = [];
    let paramIdx = 1;

    // Role-based filtering
    if (!isHQRole(user.role)) {
      // Branch users: only see their branch tickets
      query += ` AND st.branch_id = $${paramIdx++}`;
      params.push(user.branchId);
    } else if (!canSeeAllTickets(user.role)) {
      // HQ dept users: only see tickets assigned to their department
      const roleToDepttMap: Record<string, string> = {
        satinalma: "lojistik",
        muhasebe_ik: "muhasebe",
        coach: "trainer",
        trainer: "trainer",
        kalite_kontrol: "lojistik",
        teknik_sorumlu: "teknik",
      };
      const deptFilter = roleToDepttMap[user.role];
      if (deptFilter) {
        query += ` AND (st.department = $${paramIdx++} OR st.assigned_to_user_id = $${paramIdx++})`;
        params.push(deptFilter, user.id);
      }
    }

    // Optional filters
    if (department) { query += ` AND st.department = $${paramIdx++}`; params.push(department); }
    if (status) { query += ` AND st.status = $${paramIdx++}`; params.push(status); }
    if (priority) { query += ` AND st.priority = $${paramIdx++}`; params.push(priority); }
    if (branchId && canSeeAllTickets(user.role)) { query += ` AND st.branch_id = $${paramIdx++}`; params.push(parseInt(branchId as string)); }

    query += ` ORDER BY 
      CASE st.priority WHEN 'kritik' THEN 1 WHEN 'yuksek' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      st.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await db.execute(sql.raw(query, params));
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET /api/iletisim/tickets/:id — single ticket with comments
router.get("/tickets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
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
    const t = ticket.rows[0] as any;

    // Access check: branch user can only see own branch tickets
    if (!isHQRole(user.role) && t.branch_id !== user.branchId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get comments — branch users cannot see internal comments
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

// POST /api/iletisim/tickets — create ticket (branch or HQ can open)
router.post("/tickets", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { department, title, description, priority = "normal", relatedEquipmentId } = req.body;

    if (!department || !title || !description) {
      return res.status(400).json({ error: "department, title, description are required" });
    }

    const validDepts = ["teknik", "lojistik", "muhasebe", "marketing", "trainer", "hr"];
    if (!validDepts.includes(department)) {
      return res.status(400).json({ error: "Invalid department" });
    }

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
      relatedEquipmentId: relatedEquipmentId ? parseInt(relatedEquipmentId) : null,
    }).returning();

    const newTicket = result[0];

    // Trigger auto-routing asynchronously
    routeTicket(newTicket.id).catch(err => 
      console.error("[TICKET-ROUTING] Error routing ticket:", err)
    );

    res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// PATCH /api/iletisim/tickets/:id — update status, assign, resolve
router.patch("/tickets/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    if (!isHQRole(user.role)) {
      // Branch users can only update satisfactionScore after resolution
      const { satisfactionScore } = req.body;
      if (satisfactionScore !== undefined) {
        const score = parseInt(satisfactionScore);
        if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ error: "Score must be 1-5" });
        await db.update(supportTickets).set({ satisfactionScore: score, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
        return res.json({ success: true });
      }
      return res.status(403).json({ error: "Access denied" });
    }

    const { status, assignedToUserId, resolutionNote, priority } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };

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

// POST /api/iletisim/tickets/:id/comments — add comment
router.post("/tickets/:id/comments", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

    const { content, isInternal = false } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    // Only HQ can post internal comments
    const internal = isHQRole(user.role) ? Boolean(isInternal) : false;

    const result = await db.insert(supportTicketComments).values({
      ticketId,
      authorId: user.id,
      content: content.trim(),
      isInternal: internal,
    }).returning();

    // Notify the other party
    const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
    if (ticket) {
      const notifyUserId = isHQRole(user.role) ? ticket.createdByUserId : ticket.assignedToUserId;
      if (notifyUserId && notifyUserId !== user.id) {
        const { storage } = await import("../storage");
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

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

// GET /api/iletisim/dashboard — unified dashboard data
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;

    const [openTickets, slaBreaches, slaRisk, hqTaskStats, b2cStats] = await Promise.all([
      // Open tickets count
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false`),
      // SLA breaches
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_breached = true AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false`),
      // SLA risk (deadline within 2 hours)
      db.execute(sql`SELECT COUNT(*) as count FROM support_tickets WHERE sla_deadline < NOW() + INTERVAL '2 hours' AND sla_breached = false AND status NOT IN ('cozuldu','kapatildi') AND is_deleted = false`),
      // HQ task stats (only for HQ roles)
      isHQRole(user.role)
        ? db.execute(sql`SELECT status, COUNT(*) as count FROM hq_tasks WHERE is_deleted = false GROUP BY status`)
        : Promise.resolve({ rows: [] }),
      // B2C feedback count this month
      db.execute(sql`SELECT COUNT(*) as count FROM customer_feedback WHERE created_at > NOW() - INTERVAL '30 days'`),
    ]);

    // Department breakdown for open tickets
    const deptBreakdown = await db.execute(
      sql`SELECT department, COUNT(*) as count, SUM(CASE WHEN sla_breached THEN 1 ELSE 0 END) as sla_breached_count
          FROM support_tickets 
          WHERE status NOT IN ('cozuldu','kapatildi') AND is_deleted = false
          GROUP BY department ORDER BY count DESC`
    );

    // Recent tickets (last 10)
    const recentTickets = await db.execute(
      sql`SELECT st.id, st.ticket_number, st.title, st.department, st.priority, st.status, st.sla_breached, st.created_at, b.name as branch_name
          FROM support_tickets st LEFT JOIN branches b ON st.branch_id = b.id
          WHERE st.is_deleted = false ORDER BY st.created_at DESC LIMIT 10`
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

// ─── HQ TASKS ───────────────────────────────────────────────────────────────

// GET /api/iletisim/hq-tasks
router.get("/hq-tasks", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const { filter = "all" } = req.query;
    let whereClause = `WHERE ht.is_deleted = false`;

    if (filter === "mine") whereClause += ` AND (ht.assigned_to_user_id = '${user.id}' OR ht.assigned_by_user_id = '${user.id}')`;
    if (filter === "assigned_to_me") whereClause += ` AND ht.assigned_to_user_id = '${user.id}'`;
    if (filter === "i_assigned") whereClause += ` AND ht.assigned_by_user_id = '${user.id}'`;
    if (filter === "overdue") whereClause += ` AND ht.due_date < NOW() AND ht.status NOT IN ('tamamlandi','iptal')`;

    const result = await db.execute(
      sql.raw(`SELECT ht.*, u1.name as assigned_by_name, u2.name as assigned_to_name
               FROM hq_tasks ht
               LEFT JOIN users u1 ON ht.assigned_by_user_id = u1.id
               LEFT JOIN users u2 ON ht.assigned_to_user_id = u2.id
               ${whereClause}
               ORDER BY CASE ht.priority WHEN 'kritik' THEN 1 WHEN 'yuksek' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, ht.created_at DESC`)
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching HQ tasks:", error);
    res.status(500).json({ error: "Failed to fetch HQ tasks" });
  }
});

// POST /api/iletisim/hq-tasks
router.post("/hq-tasks", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const { title, description, assignedToUserId, priority = "normal", dueDate, department } = req.body;
    if (!title || !assignedToUserId) return res.status(400).json({ error: "title and assignedToUserId required" });

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

    // Notify assignee
    const { storage } = await import("../storage");
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

// PATCH /api/iletisim/hq-tasks/:id
router.patch("/hq-tasks/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQRole(user.role)) return res.status(403).json({ error: "HQ only" });

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

    const { status, progressPercent, completionNote } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (status) updates.status = status;
    if (progressPercent !== undefined) updates.progressPercent = Math.min(100, Math.max(0, parseInt(progressPercent)));
    if (completionNote) updates.completionNote = completionNote;
    if (status === "tamamlandi") updates.completedAt = new Date();

    await db.update(hqTasks).set(updates).where(and(eq(hqTasks.id, taskId), eq(hqTasks.isDeleted, false)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating HQ task:", error);
    res.status(500).json({ error: "Failed to update HQ task" });
  }
});

// ─── BROADCAST RECEIPTS ─────────────────────────────────────────────────────

// POST /api/iletisim/broadcast/:announcementId/seen
router.post("/broadcast/:announcementId/seen", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
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

// POST /api/iletisim/broadcast/:announcementId/confirm
router.post("/broadcast/:announcementId/confirm", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
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

// GET /api/iletisim/broadcast/:announcementId/receipts — HQ only
router.get("/broadcast/:announcementId/receipts", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
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

// ─── BRANCH HEALTH SCORE ────────────────────────────────────────────────────

// GET /api/iletisim/branch-health — CGO/CEO only
router.get("/branch-health", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
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

    // Calculate health score (0-100)
    const withScore = result.rows.map((row: any) => {
      const openTickets = parseInt(row.open_tickets ?? 0);
      const slaBreaches = parseInt(row.sla_breaches ?? 0);
      const avgSatisfaction = parseFloat(row.avg_satisfaction ?? 5);
      const recurringIssues = parseInt(row.recurring_issues ?? 0);

      // Score formula: starts at 100, deductions
      let score = 100;
      score -= openTickets * 5;           // -5 per open ticket
      score -= slaBreaches * 10;          // -10 per SLA breach
      score -= (5 - avgSatisfaction) * 8; // -8 per satisfaction point below 5
      score -= recurringIssues * 7;       // -7 per recurring issue

      return { ...row, healthScore: Math.max(0, Math.min(100, Math.round(score))) };
    });

    res.json(withScore);
  } catch (error) {
    console.error("Error fetching branch health:", error);
    res.status(500).json({ error: "Failed" });
  }
});

export { router as crmIletisimRouter };
```

---

## TASK 4 — Register Routes

### 4A. In `server/routes.ts`, import and register:

```typescript
import { crmIletisimRouter } from "./routes/crm-iletisim";
```

Inside `registerRoutes()`, add:
```typescript
app.use("/api/iletisim", crmIletisimRouter);
```

### 4B. Run migration on startup

In `server/routes.ts`, add near the top of `registerRoutes()`:

```typescript
// CRM Sprint 1 migration
try {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      ticket_number VARCHAR(20) NOT NULL UNIQUE,
      branch_id INTEGER,
      created_by_user_id VARCHAR,
      department VARCHAR(50) NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      status VARCHAR(30) NOT NULL DEFAULT 'acik',
      assigned_to_user_id VARCHAR,
      assigned_at TIMESTAMP,
      sla_deadline TIMESTAMP,
      sla_breached BOOLEAN NOT NULL DEFAULT false,
      sla_breached_at TIMESTAMP,
      related_equipment_id INTEGER,
      recurrence_count INTEGER NOT NULL DEFAULT 1,
      resolved_at TIMESTAMP,
      resolved_by_user_id VARCHAR,
      resolution_note TEXT,
      satisfaction_score INTEGER,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      author_id VARCHAR NOT NULL,
      content TEXT NOT NULL,
      is_internal BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hq_tasks (
      id SERIAL PRIMARY KEY,
      task_number VARCHAR(20) NOT NULL UNIQUE,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      assigned_by_user_id VARCHAR NOT NULL,
      assigned_to_user_id VARCHAR NOT NULL,
      department VARCHAR(50),
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      status VARCHAR(30) NOT NULL DEFAULT 'beklemede',
      due_date TIMESTAMP,
      completed_at TIMESTAMP,
      completion_note TEXT,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS broadcast_receipts (
      id SERIAL PRIMARY KEY,
      announcement_id INTEGER NOT NULL,
      user_id VARCHAR NOT NULL,
      branch_id INTEGER,
      seen_at TIMESTAMP,
      confirmed_at TIMESTAMP,
      CONSTRAINT br_ann_user_uniq UNIQUE(announcement_id, user_id)
    )
  `);
  console.log("[CRM-SPRINT-1] Migration complete");
} catch (err) {
  console.error("[CRM-SPRINT-1] Migration error:", err);
}
```

### 4C. Add SLA checker to existing scheduler

Find `server/reminders.ts` or wherever `setInterval` schedulers run. Add:

```typescript
import { checkSlaBreaches } from "./services/ticket-routing-engine";

// Run every 15 minutes
setInterval(async () => {
  try {
    await checkSlaBreaches();
  } catch (err) {
    console.error("[SLA-CHECKER] Error:", err);
  }
}, 15 * 60 * 1000);
```

---

## TASK 5 — Seed Test Data

After all tables are created, seed 5 sample support tickets so the dashboard is not empty:

```typescript
// Seed only if table is empty
const ticketCount = await db.execute(sql`SELECT COUNT(*) as count FROM support_tickets`);
if (parseInt(ticketCount.rows[0]?.count as string) === 0) {
  const sampleTickets = [
    { ticketNumber: "TKT-B001", department: "teknik", title: "Soğutucu dolap arızalandı — ürünler tehlikede", description: "Sabah 07:30'dan beri çalışmıyor. İçindeki cheesecake ve tiramisu risk altında.", priority: "kritik" },
    { ticketNumber: "TKT-B002", department: "lojistik", title: "Sevkiyatta 24 adet Cinnaboom eksik", description: "Bu haftaki sevkiyatta Cinnaboom 6'lı paketten 24 adet eksik geldi.", priority: "yuksek" },
    { ticketNumber: "TKT-B003", department: "muhasebe", title: "Kasım ayı faturasında 340₺ fark var", description: "Kasım ayı faturasında sipariş etmediğimiz 2 kalem ürün yer alıyor.", priority: "normal" },
    { ticketNumber: "TKT-B004", department: "trainer", title: "Yeni barista için Bombty Latte reçete eğitimi", description: "Yeni başlayan personelimiz Bombty Latte reçetesinde sorun yaşıyor, eğitim talep ediyoruz.", priority: "normal" },
    { ticketNumber: "TKT-B005", department: "marketing", title: "Bahar menüsü için masa üstü materyal talebi", description: "14 Mart lansmanı için 50 adet stand üstü menü kartı ve 20 adet pencere afişi talep ediyoruz.", priority: "dusuk" },
  ];

  for (const t of sampleTickets) {
    await db.insert(supportTickets).values({
      ...t,
      branchId: 1, // first branch
      createdByUserId: null,
      status: "acik",
    }).onConflictDoNothing();
  }
  console.log("[CRM-SPRINT-1] Sample tickets seeded");
}
```

---

## TASK 6 — Verification

After all tasks complete, run these queries and show results:

```sql
-- 1. New tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('support_tickets','support_ticket_comments','hq_tasks','broadcast_receipts');

-- 2. Sample tickets
SELECT ticket_number, department, priority, status FROM support_tickets ORDER BY id;

-- 3. Test dashboard endpoint response (show the curl command output)
-- GET /api/iletisim/dashboard (needs auth but check the route is registered)

-- 4. Routing engine file exists
-- ls server/services/ticket-routing-engine.ts
```

---

## IMPORTANT RULES
- Do NOT touch `server/crm-routes.ts` — existing CRM routes stay untouched
- Do NOT delete any existing tables or data
- Do NOT modify `shared/schema.ts` drizzle relations for existing tables
- users.id is VARCHAR — never use integer for user foreign keys
- All new endpoints under `/api/iletisim/` prefix
- All new columns: use `ADD COLUMN IF NOT EXISTS` or `CREATE TABLE IF NOT EXISTS`
- isAuthenticated middleware on every route
- Turkish UI strings (ticket statuses, notifications) must stay in Turkish
- Soft delete only — never use DELETE SQL on business data
