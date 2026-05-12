// ═══════════════════════════════════════════════════════════════════
// Sprint 48 (Aslan 13 May 2026) — Daily AI Brief Generator
// ═══════════════════════════════════════════════════════════════════
// Her sabah 09:00 (TR time) çalışır. Her aktif kullanıcı için rol
// bazlı veri toplar, ChatGPT API'den özet ister, DB'ye kaydeder.
// Kullanıcı dashboard'da brief'i görür, "faydalı/değil" reaksiyon verir.
// ═══════════════════════════════════════════════════════════════════

import { db } from "../db";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import {
  users,
  dailyBriefs,
  onboardingTemplates,
  tasks,
  shifts,
  branches,
  rawMaterials,
  suppliers,
  aiAlerts,
} from "@shared/schema";
import { aiChatCall } from "../ai";

// Brief generated for which roles (others get a generic version)
const SUPPORTED_ROLES = [
  "satinalma",
  "gida_muhendisi",
  "cgo",
  "coach",
  "trainer",
  "ceo",
  "fabrika_mudur",
  "mudur",
  "supervisor",
  "supervisor_buddy",
  "barista",
  "bar_buddy",
  "admin",
];

interface RoleDataSnapshot {
  role: string;
  userName: string;
  branchName?: string;
  yesterdayMetrics?: any;
  openTasks?: any[];
  anomalies?: any[];
  alerts?: any[];
  todayShifts?: any[];
  custom?: any;
}

// ═══════════════════════════════════════════════════════════════════
// Rol bazlı veri toplama
// ═══════════════════════════════════════════════════════════════════
export async function aggregateRoleData(
  userId: string,
  role: string,
  branchId?: number | null,
  userName?: string
): Promise<RoleDataSnapshot> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const snapshot: RoleDataSnapshot = {
    role,
    userName: userName || "Kullanıcı",
  };

  // Şube adı
  if (branchId) {
    const branch = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    if (branch.length > 0) {
      snapshot.branchName = branch[0].name;
    }
  }

  // Bugünkü açık AI alerts (rol filtreli)
  try {
    const alerts = await db.select()
      .from(aiAlerts)
      .where(and(
        eq(aiAlerts.status, "pending"),
        sql`(${aiAlerts.targetRole} IS NULL OR ${aiAlerts.targetRole} = ${role})`,
      ))
      .limit(5);
    snapshot.alerts = alerts;
  } catch {
    snapshot.alerts = [];
  }

  // Rol bazlı özel veriler
  switch (role) {
    case "satinalma":
      try {
        // Eksik besin değeri olan hammaddeler (energyKcal NULL ise eksik sayılır)
        const missingNutrition = await db.select({ count: sql<number>`count(*)` })
          .from(rawMaterials)
          .where(and(
            eq(rawMaterials.isActive, true),
            isNull(rawMaterials.energyKcal),
          ));
        // Fiyat artışı: currentUnitPrice / lastPurchasePrice oranı %20+
        const priceAnomalies = await db.select()
          .from(rawMaterials)
          .where(and(
            eq(rawMaterials.isActive, true),
            sql`CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL) > 0`,
            sql`(CAST(${rawMaterials.currentUnitPrice} AS DECIMAL) - CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL)) / CAST(${rawMaterials.lastPurchasePrice} AS DECIMAL) > 0.20`,
          ))
          .limit(3);
        // Toplam tedarikçi sayısı
        const supplierCount = await db.select({ count: sql<number>`count(*)` })
          .from(suppliers)
          .where(eq(suppliers.status, "aktif"));

        snapshot.custom = {
          missingNutritionCount: missingNutrition[0]?.count || 0,
          priceAnomalies: priceAnomalies.slice(0, 3).map((m) => ({
            name: m.name,
            currentPrice: m.currentUnitPrice,
            lastPrice: m.lastPurchasePrice,
          })),
          totalSuppliers: supplierCount[0]?.count || 0,
        };
      } catch (err: any) {
        snapshot.custom = { error: "Satınalma verisi alınamadı" };
      }
      break;

    case "gida_muhendisi":
      try {
        const missingNutrition = await db.select({ count: sql<number>`count(*)` })
          .from(rawMaterials)
          .where(and(
            eq(rawMaterials.isActive, true),
            isNull(rawMaterials.energyKcal),
          ));
        const totalMaterials = await db.select({ count: sql<number>`count(*)` })
          .from(rawMaterials)
          .where(eq(rawMaterials.isActive, true));
        snapshot.custom = {
          missingNutritionCount: missingNutrition[0]?.count || 0,
          totalMaterials: totalMaterials[0]?.count || 0,
          completionRate: totalMaterials[0]?.count
            ? Math.round(
                (((totalMaterials[0].count - (missingNutrition[0]?.count || 0)) /
                  totalMaterials[0].count) *
                  100)
              )
            : 0,
        };
      } catch {
        snapshot.custom = { error: "Reçete verisi alınamadı" };
      }
      break;

    case "mudur":
    case "supervisor":
    case "supervisor_buddy":
    case "barista":
    case "bar_buddy":
      // Şube odaklı: bugünkü vardiyalar + açık görevler
      if (branchId) {
        try {
          const todayShiftsList = await db.select()
            .from(shifts)
            .where(and(
              eq(shifts.branchId, branchId),
              eq(shifts.shiftDate, todayStr),
            ))
            .limit(10);
          snapshot.todayShifts = todayShiftsList;

          const openTasks = await db.select()
            .from(tasks)
            .where(and(
              eq(tasks.branchId, branchId),
              eq(tasks.status, "pending"),
            ))
            .limit(5);
          snapshot.openTasks = openTasks;
        } catch {
          // skip
        }
      }
      break;

    case "cgo":
    case "ceo":
    case "coach":
      // Multi-branch özet
      try {
        const branchCount = await db.select({ count: sql<number>`count(*)` })
          .from(branches)
          .where(eq(branches.isActive, true));
        const todayShiftsCount = await db.select({ count: sql<number>`count(*)` })
          .from(shifts)
          .where(eq(shifts.shiftDate, todayStr));
        snapshot.custom = {
          activeBranches: branchCount[0]?.count || 0,
          todayShifts: todayShiftsCount[0]?.count || 0,
        };
      } catch {
        snapshot.custom = {};
      }
      break;

    case "fabrika_mudur":
      try {
        const factoryTasks = await db.select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.status, "pending"))
          .limit(1);
        snapshot.custom = {
          openTasks: factoryTasks[0]?.count || 0,
        };
      } catch {
        snapshot.custom = {};
      }
      break;

    case "trainer":
    case "admin":
    default:
      // Genel veri
      snapshot.custom = {};
      break;
  }

  return snapshot;
}

// ═══════════════════════════════════════════════════════════════════
// AI'dan brief üret
// ═══════════════════════════════════════════════════════════════════
async function generateBriefContent(
  snapshot: RoleDataSnapshot,
  templateBriefPrompt?: string
): Promise<{
  content: string;
  summary: string;
  priorityItems: any[];
  tokens: number;
}> {
  const systemPrompt = templateBriefPrompt ||
    `Sen Mr. Dobody, DOSPRESSO'nun AI asistanısın. Kullanıcıya günün özetini hazırla. Kısa, eyleme dönük, motive edici. Türkçe yaz.`;

  const userPrompt = `KULLANICI: ${snapshot.userName} (${snapshot.role})
${snapshot.branchName ? `ŞUBE: ${snapshot.branchName}` : ""}

VERİLER:
${JSON.stringify(snapshot, null, 2)}

GÖREVİN:
- Maksimum 200 kelime brief
- 3-5 önemli madde (emoji ile)
- En önemli aksiyon ne olmalı?

JSON FORMAT:
{
  "summary": "Bir cümlede günün özeti (max 100 char)",
  "content": "Markdown formatında 3-5 maddelik brief",
  "priorityItems": [
    { "type": "warning|info|success", "text": "Madde içeriği", "actionUrl": "/path" }
  ]
}`;

  try {
    const response = await aiChatCall({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      content: parsed.content || "Bugün için özel bir uyarı yok. İyi çalışmalar!",
      summary: parsed.summary || "Günün özeti hazır",
      priorityItems: parsed.priorityItems || [],
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err: any) {
    console.error("[DailyBrief AI Error]", err);
    // Fallback: basit özet
    return {
      content: `Günaydın ${snapshot.userName}! Bugün iyi bir gün olsun. AI brief geçici olarak kullanılamıyor.`,
      summary: "Günün özeti hazırlanamadı",
      priorityItems: [],
      tokens: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tek kullanıcı için brief üret + DB'ye kaydet
// ═══════════════════════════════════════════════════════════════════
export async function generateBriefForUser(
  userId: string,
  options: { force?: boolean } = {}
): Promise<{ success: boolean; briefId?: number; reason?: string }> {
  try {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) {
      return { success: false, reason: "Kullanıcı bulunamadı" };
    }

    const user = userResult[0];
    if (!user.isActive) {
      return { success: false, reason: "Pasif kullanıcı" };
    }

    if (!user.role || !SUPPORTED_ROLES.includes(user.role)) {
      return { success: false, reason: `Rol desteklenmiyor: ${user.role}` };
    }

    // Bugün için zaten brief var mı?
    const todayStr = new Date().toISOString().split("T")[0];
    if (!options.force) {
      const existing = await db.select()
        .from(dailyBriefs)
        .where(and(
          eq(dailyBriefs.userId, userId),
          eq(dailyBriefs.briefDate, todayStr),
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: true, briefId: existing[0].id, reason: "Bugün zaten üretildi" };
      }
    }

    // Veri topla
    const userName = user.firstName || user.username || "Kullanıcı";
    const snapshot = await aggregateRoleData(userId, user.role, user.branchId, userName);

    // Template'den brief prompt'unu al
    const template = await db.select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.role, user.role))
      .limit(1);

    const briefPrompt = template[0]?.dailyBriefPrompt;

    // AI çağrı
    const brief = await generateBriefContent(snapshot, briefPrompt || undefined);

    // DB'ye kaydet
    const [saved] = await db.insert(dailyBriefs).values({
      userId,
      role: user.role,
      branchId: user.branchId || null,
      briefDate: todayStr,
      content: brief.content,
      summary: brief.summary,
      priorityItems: brief.priorityItems,
      dataSnapshot: snapshot,
      aiModel: "gpt-4o-mini",
      tokenCount: brief.tokens,
    }).returning();

    return { success: true, briefId: saved.id };
  } catch (err: any) {
    console.error("[generateBriefForUser]", err);
    return { success: false, reason: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tüm aktif kullanıcılar için brief üret (sabah cron)
// ═══════════════════════════════════════════════════════════════════
export async function generateBriefsForAllUsers(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  reasons: Record<string, number>;
}> {
  const allActiveUsers = await db.select()
    .from(users)
    .where(eq(users.isActive, true));

  const result = {
    total: allActiveUsers.length,
    succeeded: 0,
    failed: 0,
    reasons: {} as Record<string, number>,
  };

  console.log(`[DailyBrief] ${allActiveUsers.length} aktif kullanıcı için brief üretimi başladı...`);

  // Sıralı çalıştır (rate limit + cost control)
  for (const user of allActiveUsers) {
    const r = await generateBriefForUser(user.id);
    if (r.success) {
      result.succeeded++;
    } else {
      result.failed++;
      const reason = r.reason || "unknown";
      result.reasons[reason] = (result.reasons[reason] || 0) + 1;
    }

    // 500ms bekle (rate limit korumalı)
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[DailyBrief] Tamamlandı: ${result.succeeded} başarılı, ${result.failed} başarısız`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// Scheduler: her sabah 09:00 TR time
// ═══════════════════════════════════════════════════════════════════
export function startDailyBriefScheduler(): void {
  // İlk kontrol: bir sonraki 09:00 TR time
  const calculateNextRun = (): Date => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(9, 0, 0, 0); // 09:00:00.000
    if (next <= now) {
      // Bugünkü 09:00 geçti — yarın
      next.setDate(next.getDate() + 1);
    }
    return next;
  };

  const scheduleNextRun = () => {
    const next = calculateNextRun();
    const delayMs = next.getTime() - Date.now();
    console.log(`[DailyBrief Scheduler] Sonraki çalışma: ${next.toLocaleString("tr-TR")} (${Math.round(delayMs / 1000 / 60)} dk sonra)`);

    setTimeout(async () => {
      try {
        await generateBriefsForAllUsers();
      } catch (err) {
        console.error("[DailyBrief Scheduler] Error:", err);
      }
      // Bir sonraki çalışma için tekrar planla (her gün)
      scheduleNextRun();
    }, delayMs);
  };

  scheduleNextRun();
}
