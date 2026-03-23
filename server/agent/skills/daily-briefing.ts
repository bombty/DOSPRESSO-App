import { registerSkill } from "./skill-registry";
import { db } from "../../db";
import { userTodos, userCalendarEvents } from "@shared/schema";
import { eq, and, gte, lte, or, sql } from "drizzle-orm";
import { storage } from "../../storage";

registerSkill({
  id: "daily_briefing",
  name: "Günlük Briefing",
  description: "Her sabah kullanıcıya günün özetini sunar",
  category: "ajanda",
  schedule: "daily",
  targetRoles: ["admin", "ceo", "cgo", "coach", "trainer", "supervisor", "mudur", "muhasebe_ik", "satinalma", "fabrika_mudur"],

  analyze: async (context) => {
    const insights: any[] = [];
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const [todayTodos, overdueTodos, todayEvents] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(userTodos)
          .where(and(
            eq(userTodos.userId, context.userId),
            eq(userTodos.status, "pending"),
            gte(userTodos.dueDate, startOfDay),
            lte(userTodos.dueDate, endOfDay)
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(userTodos)
          .where(and(
            eq(userTodos.userId, context.userId),
            eq(userTodos.status, "pending"),
            lte(userTodos.dueDate, now)
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(userCalendarEvents)
          .where(and(
            eq(userCalendarEvents.userId, context.userId),
            gte(userCalendarEvents.startTime, startOfDay),
            lte(userCalendarEvents.startTime, endOfDay)
          )),
      ]);

      const todoCount = Number(todayTodos[0]?.count || 0);
      const overdueCount = Number(overdueTodos[0]?.count || 0);
      const eventCount = Number(todayEvents[0]?.count || 0);

      if (todoCount > 0 || overdueCount > 0 || eventCount > 0) {
        const parts: string[] = [];
        if (eventCount > 0) parts.push(`${eventCount} etkinlik`);
        if (todoCount > 0) parts.push(`${todoCount} yapılacak`);
        if (overdueCount > 0) parts.push(`${overdueCount} gecikmiş görev`);

        insights.push({
          type: "daily_briefing",
          severity: overdueCount > 0 ? "warning" : "info",
          message: `Bugün: ${parts.join(", ")}`,
          data: { todoCount, overdueCount, eventCount },
          requiresAI: false,
        });
      }
    } catch (err) {
      console.error("[daily-briefing] Error:", err);
    }
    return insights;
  },

  generateActions: async (insights, context) => {
    const actions: any[] = [];
    for (const insight of insights) {
      if (insight.type === "daily_briefing") {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

        actions.push({
          actionType: "notification",
          targetUserId: context.userId,
          title: `${greeting}! Günün özeti`,
          message: insight.aiMessage || insight.message,
          priority: insight.severity === "warning" ? "high" : "medium",
          deepLink: "/ajanda",
        });
      }
    }
    return actions;
  },
});

export async function runDailyBriefingForUser(userId: string) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [todayTodos, overdueTodos, todayEvents] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(userTodos)
        .where(and(eq(userTodos.userId, userId), eq(userTodos.status, "pending"), gte(userTodos.dueDate, startOfDay), lte(userTodos.dueDate, endOfDay))),
      db.select({ count: sql<number>`count(*)` }).from(userTodos)
        .where(and(eq(userTodos.userId, userId), eq(userTodos.status, "pending"), lte(userTodos.dueDate, now))),
      db.select({ count: sql<number>`count(*)` }).from(userCalendarEvents)
        .where(and(eq(userCalendarEvents.userId, userId), gte(userCalendarEvents.startTime, startOfDay), lte(userCalendarEvents.startTime, endOfDay))),
    ]);

    const todoCount = Number(todayTodos[0]?.count || 0);
    const overdueCount = Number(overdueTodos[0]?.count || 0);
    const eventCount = Number(todayEvents[0]?.count || 0);

    if (todoCount > 0 || overdueCount > 0 || eventCount > 0) {
      const parts: string[] = [];
      if (eventCount > 0) parts.push(`${eventCount} etkinlik`);
      if (todoCount > 0) parts.push(`${todoCount} yapılacak`);
      if (overdueCount > 0) parts.push(`${overdueCount} gecikmiş görev`);

      const hour = now.getHours();
      const greeting = hour < 12 ? "Günaydın" : "İyi günler";

      await storage.createNotification({
        userId,
        type: "daily_briefing",
        title: `${greeting}! Günün özeti`,
        message: `Bugün: ${parts.join(", ")}`,
        priority: overdueCount > 0 ? "high" : "medium",
        deepLink: "/ajanda",
      });
    }
  } catch (err) {
    console.error("[daily-briefing] Error for user:", userId, err);
  }
}
