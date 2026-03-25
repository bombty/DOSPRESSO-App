import { chat } from "./ai-client";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import {
  notifications,
  tasks,
  equipmentFaults,
  users,
} from "@shared/schema";

interface BriefingResult {
  summary: string;
  highlights: string[];
  actionItems: string[];
  generatedAt: string;
  cached: boolean;
}

const briefingCache = new Map<string, { data: BriefingResult; expires: number }>();

function getCacheKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `briefing:${userId}:${today}`;
}

async function gatherDashboardContext(userId: string, role: string, branchId?: number | null): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const contextParts: string[] = [];
  contextParts.push(`Tarih: ${now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`);
  contextParts.push(`Rol: ${role}`);

  try {
    const unreadNotifs = await db.select({ cnt: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ));
    contextParts.push(`Okunmamış bildirim: ${unreadNotifs[0]?.cnt ?? 0}`);

    const recentNotifs = await db.select({
      type: notifications.type,
      title: notifications.title,
    }).from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, yesterday)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    if (recentNotifs.length > 0) {
      const notifTypes = new Map<string, number>();
      recentNotifs.forEach(n => {
        const t = n.type || "general";
        notifTypes.set(t, (notifTypes.get(t) || 0) + 1);
      });
      contextParts.push(`Son 24 saat bildirimler: ${Array.from(notifTypes.entries()).map(([t, c]) => `${t}(${c})`).join(", ")}`);
    }
  } catch (e) {}

  try {
    const openTasks = await db.select({ cnt: count() })
      .from(tasks)
      .where(and(
        eq(tasks.assignedToId, userId),
        sql`${tasks.status} NOT IN ('completed', 'cancelled')`,
        sql`${tasks.deletedAt} IS NULL`
      ));
    contextParts.push(`Açık görev: ${openTasks[0]?.cnt ?? 0}`);

    const overdueTasks = await db.select({ cnt: count() })
      .from(tasks)
      .where(and(
        eq(tasks.assignedToId, userId),
        sql`${tasks.status} NOT IN ('completed', 'cancelled')`,
        sql`${tasks.deletedAt} IS NULL`,
        sql`${tasks.dueDate} < NOW()`
      ));
    if ((overdueTasks[0]?.cnt ?? 0) > 0) {
      contextParts.push(`Geciken görev: ${overdueTasks[0]?.cnt}`);
    }
  } catch (e) {}

  try {
    const openFaults = await db.select({ cnt: count() })
      .from(equipmentFaults)
      .where(and(
        sql`${equipmentFaults.status} IN ('open', 'in_progress')`,
        sql`${equipmentFaults.deletedAt} IS NULL`
      ));
    if ((openFaults[0]?.cnt ?? 0) > 0) {
      contextParts.push(`Açık arıza: ${openFaults[0]?.cnt}`);
    }
  } catch (e) {}

  if (branchId) {
    try {
      const branchStaff = await db.select({ cnt: count() })
        .from(users)
        .where(and(
          eq(users.branchId, branchId),
          eq(users.isActive, true)
        ));
      contextParts.push(`Şube personel: ${branchStaff[0]?.cnt ?? 0}`);
    } catch (e) {}
  }

  return contextParts.join("\n");
}

export async function generateDashboardBriefing(userId: string, role: string, branchId?: number | null): Promise<BriefingResult> {
  const cacheKey = getCacheKey(userId);
  const cached = briefingCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return { ...cached.data, cached: true };
  }

  const context = await gatherDashboardContext(userId, role, branchId);

  try {
    const response = await chat({
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO franchise yönetim platformunun günlük brifing asistanısın.
Kullanıcının rolüne ve verilerine göre kısa, net bir günlük brifing oluştur.
JSON formatında yanıt ver:
{
  "summary": "1-2 cümlelik genel durum özeti",
  "highlights": ["öne çıkan 2-3 önemli nokta"],
  "actionItems": ["bugün yapılması gereken 2-3 aksiyon"]
}
Kurallar:
- Türkçe yaz
- Kısa ve aksiyona yönelik ol
- Motivasyon katan pozitif bir ton kullan
- Kritik konuları öne çıkar`
        },
        {
          role: "user",
          content: `Günlük brifing oluştur:\n${context}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);
    const result: BriefingResult = {
      summary: parsed.summary || "Günlük brifing hazırlanamadı.",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    briefingCache.set(cacheKey, {
      data: result,
      expires: Date.now() + 4 * 60 * 60 * 1000,
    });

    return result;
  } catch (error) {
    console.error("[AI Briefing] Error:", error);
    return {
      summary: "AI brifing şu an kullanılamıyor.",
      highlights: [],
      actionItems: [],
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export function clearBriefingCache(userId?: string) {
  if (userId) {
    const key = getCacheKey(userId);
    briefingCache.delete(key);
  } else {
    briefingCache.clear();
  }
}
