import { registerSkill } from "./skill-registry";
import { db } from "../../db";
import { userTodos } from "@shared/schema";
import { sql } from "drizzle-orm";

registerSkill({
  id: "auto_todo_from_ticket",
  name: "Ticket → Todo Otomatik Oluşturma",
  description: "CRM ticket atandığında otomatik todo oluşturur",
  category: "ajanda",
  schedule: "event",
  targetRoles: [],

  analyze: async () => [],
  generateActions: async () => [],
});

export async function createTodoFromTicket(params: {
  assignedToUserId: string;
  ticketId: number;
  ticketNumber: string;
  ticketTitle: string;
  channel?: string;
  department?: string;
  priority?: string;
  slaDeadline?: Date | null;
}) {
  try {
    const { assignedToUserId, ticketId, ticketNumber, ticketTitle, channel, department, priority, slaDeadline } = params;

    const todoPriority = priority === "kritik" || priority === "high" ? "high"
      : priority === "yuksek" ? "high"
      : priority === "dusuk" || priority === "low" ? "low"
      : "medium";

    const dueDate = slaDeadline || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const tags = [channel, department].filter(Boolean) as string[];

    await db.insert(userTodos).values({
      userId: assignedToUserId,
      title: `CRM Talep: ${ticketTitle}`,
      description: `Ticket #${ticketNumber} — ${department || channel || "Genel"}`,
      dueDate,
      priority: todoPriority,
      source: "crm_ticket",
      sourceId: String(ticketId),
      sourceUrl: `/crm/${ticketId}`,
      tags: tags.length > 0 ? tags : null,
    });

    console.log(`[auto-todo] Todo created for ticket #${ticketNumber} → user ${assignedToUserId}`);
  } catch (err) {
    console.error("[auto-todo] Error creating todo from ticket:", err);
  }
}
