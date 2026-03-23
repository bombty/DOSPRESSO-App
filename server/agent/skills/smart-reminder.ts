import { registerSkill } from "./skill-registry";
import { db } from "../../db";
import { userTodos, userCalendarEvents, users } from "@shared/schema";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";
import { storage } from "../../storage";

registerSkill({
  id: "smart_reminder",
  name: "Akıllı Hatırlatma",
  description: "Yaklaşan etkinlikler ve gecikmiş todo'lar için hatırlatma gönderir",
  category: "ajanda",
  schedule: "hourly",
  targetRoles: ["admin", "ceo", "cgo", "coach", "trainer", "supervisor", "mudur", "muhasebe_ik", "satinalma", "fabrika_mudur"],

  analyze: async (context) => {
    const insights: any[] = [];
    try {
      const now = new Date();
      const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

      const upcomingEvents = await db.select()
        .from(userCalendarEvents)
        .where(and(
          eq(userCalendarEvents.userId, context.userId),
          gte(userCalendarEvents.startTime, now),
          lte(userCalendarEvents.startTime, thirtyMinLater)
        ))
        .limit(5);

      for (const event of upcomingEvents) {
        insights.push({
          type: "upcoming_event",
          severity: "info" as const,
          message: `Yaklaşan: ${event.title}`,
          data: { eventId: event.id, title: event.title, startTime: event.startTime, location: event.location },
          requiresAI: false,
        });
      }

      const overdueTodos = await db.select({ count: sql<number>`count(*)` })
        .from(userTodos)
        .where(and(
          eq(userTodos.userId, context.userId),
          eq(userTodos.status, "pending"),
          lte(userTodos.dueDate, now)
        ));

      const overdueCount = Number(overdueTodos[0]?.count || 0);
      if (overdueCount > 0) {
        insights.push({
          type: "overdue_todos",
          severity: "warning" as const,
          message: `${overdueCount} gecikmiş yapılacak var`,
          data: { overdueCount },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[smart-reminder] Error:", err);
    }
    return insights;
  },

  generateActions: async (insights, context) => {
    const actions: any[] = [];
    for (const insight of insights) {
      if (insight.type === "upcoming_event") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: `Yaklaşan: ${insight.data.title}`,
          message: insight.data.location ? `Konum: ${insight.data.location}` : "30 dakika içinde başlayacak",
          priority: "medium",
          deepLink: "/ajanda",
        });
      } else if (insight.type === "overdue_todos") {
        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: `${insight.data.overdueCount} gecikmiş görev`,
          message: "Gecikmiş yapılacaklarınızı kontrol edin",
          priority: "high",
          deepLink: "/ajanda?view=todos&filter=overdue",
        });
      }
    }
    return actions;
  },
});

export async function checkSmartReminders() {
  try {
    const now = new Date();
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

    const upcomingEvents = await db.select({
      userId: userCalendarEvents.userId,
      title: userCalendarEvents.title,
      startTime: userCalendarEvents.startTime,
      location: userCalendarEvents.location,
    })
    .from(userCalendarEvents)
    .where(and(
      gte(userCalendarEvents.startTime, now),
      lte(userCalendarEvents.startTime, thirtyMinLater)
    ))
    .limit(50);

    for (const event of upcomingEvents) {
      try {
        const startStr = event.startTime ? new Date(event.startTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        await storage.createNotification({
          userId: event.userId,
          type: "calendar_reminder",
          title: `Yaklaşan: ${event.title}`,
          message: `${startStr}${event.location ? ` — ${event.location}` : ""}`,
          priority: "medium",
          deepLink: "/ajanda",
        });
      } catch { /* dedup — notification already exists */ }
    }
  } catch (err) {
    console.error("[smart-reminder] Batch check error:", err);
  }
}
