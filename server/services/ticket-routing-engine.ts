import { db } from "../db";
import { supportTickets, slaRules } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "../storage";
import { addBusinessHours, getBusinessHoursConfig, isWithinBusinessHours } from "./business-hours";

const SLA_DEFAULTS: Record<string, Record<string, number>> = {
  teknik:    { kritik: 4,  yuksek: 8,  normal: 24, dusuk: 48 },
  lojistik:  { kritik: 8,  yuksek: 12, normal: 24, dusuk: 48 },
  muhasebe:  { kritik: 12, yuksek: 24, normal: 48, dusuk: 72 },
  marketing: { kritik: 24, yuksek: 48, normal: 72, dusuk: 96 },
  trainer:   { kritik: 12, yuksek: 24, normal: 48, dusuk: 72 },
  hr:        { kritik: 12, yuksek: 24, normal: 72, dusuk: 96 },
};

async function getSlaHours(department: string, priority: string): Promise<number> {
  try {
    const [rule] = await db
      .select()
      .from(slaRules)
      .where(
        and(
          eq(slaRules.department, department),
          eq(slaRules.priority, priority),
          eq(slaRules.isActive, true)
        )
      );
    return rule?.hoursLimit ?? SLA_DEFAULTS[department]?.[priority] ?? 24;
  } catch {
    return SLA_DEFAULTS[department]?.[priority] ?? 24;
  }
}

const DEPT_ASSIGNEE_ROLE: Record<string, string> = {
  teknik:    "teknik_sorumlu",
  lojistik:  "satinalma",
  muhasebe:  "muhasebe_ik",
  marketing: "cgo",
  trainer:   "coach",
  hr:        "muhasebe_ik",
};

const DEPT_ESCALATION_ROLES: Record<string, string[]> = {
  teknik:    ["cgo"],
  lojistik:  ["satinalma", "cgo"],
  muhasebe:  ["muhasebe_ik"],
  marketing: ["cgo"],
  trainer:   ["coach", "cgo"],
  hr:        ["muhasebe_ik", "cgo"],
};

export async function routeTicket(ticketId: number): Promise<void> {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!ticket) return;

  const slaHours = await getSlaHours(ticket.department, ticket.priority);
  const bhConfig = await getBusinessHoursConfig();
  const slaDeadline = addBusinessHours(new Date(), slaHours, bhConfig);

  const targetRole = DEPT_ASSIGNEE_ROLE[ticket.department];
  let assignedToUserId: string | null = null;

  if (targetRole) {
    const assigneeResult = await db.execute(
      sql`SELECT id FROM users WHERE role = ${targetRole} AND is_active = true LIMIT 1`
    );
    if (assigneeResult.rows.length > 0) {
      assignedToUserId = assigneeResult.rows[0].id as string;
    }
  }

  if (!assignedToUserId) {
    const cgoResult = await db.execute(
      sql`SELECT id FROM users WHERE role = 'cgo' AND is_active = true LIMIT 1`
    );
    if (cgoResult.rows.length > 0) {
      assignedToUserId = cgoResult.rows[0].id as string;
    }
  }

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

  if (assignedToUserId) {
    await storage.createNotification({
      userId: assignedToUserId,
      type: "task_assigned",
      title: `Yeni Şube Talebi: ${ticket.department.toUpperCase()}`,
      message: `${ticket.title} — SLA: ${slaHours} saat`,
      link: `/iletisim-merkezi/ticket/${ticketId}`,
    });
  }

  if (ticket.priority === "kritik") {
    const escalationRoles = DEPT_ESCALATION_ROLES[ticket.department] ?? ["cgo"];
    for (const role of escalationRoles) {
      if (role === targetRole) continue;
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

  if (recurrenceCount >= 2) {
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

export async function checkSlaBreaches(): Promise<void> {
  const now = new Date();
  const bhConfig = await getBusinessHoursConfig();

  const breachedTickets = await db.execute(
    sql`SELECT id, assigned_to_user_id, title, department
        FROM support_tickets 
        WHERE sla_deadline < ${now}
        AND sla_breached = false
        AND status NOT IN ('cozuldu', 'kapatildi')
        AND is_deleted = false`
  );

  for (const ticket of breachedTickets.rows) {
    await db.execute(
      sql`UPDATE support_tickets SET sla_breached = true, sla_breached_at = ${now}, updated_at = ${now} WHERE id = ${ticket.id}`
    );

    if (!isWithinBusinessHours(now, bhConfig)) continue;

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

export async function generateTicketNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM support_tickets`
  );
  const count = parseInt(result.rows[0]?.count as string ?? "0") + 1;
  return `TKT-B${String(count).padStart(3, "0")}`;
}

export async function generateHqTaskNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM hq_tasks`
  );
  const count = parseInt(result.rows[0]?.count as string ?? "0") + 1;
  return `HQT-${String(count).padStart(3, "0")}`;
}
