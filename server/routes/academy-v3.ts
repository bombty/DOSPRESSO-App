import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import {
  trainingModules,
  userTrainingProgress,
  userCareerProgress,
  careerLevels,
  employeeOnboardingAssignments,
  users,
  webinars,
  webinarRegistrations,
  insertWebinarSchema,
} from "@shared/schema";
import { eq, desc, and, sql, gte, lte, ilike, isNull, inArray } from "drizzle-orm";

const router = Router();

const HQ_ROLES = ["admin", "ceo", "cgo", "coach", "trainer"];

function isHQUser(role: string): boolean {
  return HQ_ROLES.includes(role);
}

router.get("/api/v3/academy/home-data", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const userRole = user.role;

    const queries: Record<string, Promise<any>> = {};

    queries.career = (async () => {
      const progress = await db
        .select({
          compositeScore: userCareerProgress.compositeScore,
          trainingScore: userCareerProgress.trainingScore,
          currentLevelId: userCareerProgress.currentCareerLevelId,
        })
        .from(userCareerProgress)
        .where(eq(userCareerProgress.userId, userId))
        .limit(1);

      if (!progress.length) {
        return { currentLevel: null, compositeScore: null };
      }

      const level = await db
        .select({
          id: careerLevels.id,
          levelNumber: careerLevels.levelNumber,
          titleTr: careerLevels.titleTr,
          roleId: careerLevels.roleId,
        })
        .from(careerLevels)
        .where(eq(careerLevels.id, progress[0].currentLevelId))
        .limit(1);

      return {
        currentLevel: level[0] || null,
        compositeScore: Number(progress[0].compositeScore ?? 0),
        trainingScore: Number(progress[0].trainingScore ?? 0),
      };
    })();

    queries.mandatoryModules = db
      .select({
        id: trainingModules.id,
        title: trainingModules.title,
        category: trainingModules.category,
        estimatedDuration: trainingModules.estimatedDuration,
        deadlineDays: trainingModules.deadlineDays,
        heroImageUrl: trainingModules.heroImageUrl,
        progress: userTrainingProgress.progressPercentage,
        status: userTrainingProgress.status,
      })
      .from(trainingModules)
      .leftJoin(
        userTrainingProgress,
        and(
          eq(userTrainingProgress.moduleId, trainingModules.id),
          eq(userTrainingProgress.userId, userId)
        )
      )
      .where(
        and(
          eq(trainingModules.isMandatory, true),
          eq(trainingModules.isActive, true),
          isNull(trainingModules.deletedAt)
        )
      )
      .orderBy(desc(trainingModules.createdAt))
      .limit(5);

    if (["stajyer", "bar_buddy"].includes(userRole)) {
      queries.onboardingStatus = (async () => {
        const assignment = await db
          .select()
          .from(employeeOnboardingAssignments)
          .where(eq(employeeOnboardingAssignments.userId, userId))
          .orderBy(desc(employeeOnboardingAssignments.startDate))
          .limit(1);
        return assignment[0] || null;
      })();
    }

    if (["supervisor", "mudur", "supervisor_buddy"].includes(userRole)) {
      queries.teamSummary = (async () => {
        const branchId = user.branchId;
        if (!branchId) return { memberCount: 0, avgCompositeScore: 0 };

        const result = await db
          .select({
            memberCount: sql<number>`count(distinct ${users.id})::int`,
            avgCompositeScore: sql<number>`coalesce(avg(${userCareerProgress.compositeScore}), 0)`,
          })
          .from(users)
          .leftJoin(userCareerProgress, eq(userCareerProgress.userId, users.id))
          .where(
            and(
              eq(users.branchId, branchId),
              eq(users.isActive, true),
              isNull(users.deletedAt)
            )
          );

        return {
          memberCount: result[0]?.memberCount || 0,
          avgCompositeScore: Number(Number(result[0]?.avgCompositeScore ?? 0).toFixed(1)),
        };
      })();
    }

    queries.upcomingWebinars = db
      .select({
        id: webinars.id,
        title: webinars.title,
        description: webinars.description,
        hostName: webinars.hostName,
        webinarDate: webinars.webinarDate,
        durationMinutes: webinars.durationMinutes,
        status: webinars.status,
        isRegistered: sql<boolean>`EXISTS (
          SELECT 1 FROM webinar_registrations wr 
          WHERE wr.webinar_id = ${webinars.id} AND wr.user_id = ${userId}
        )`,
      })
      .from(webinars)
      .where(
        and(
          gte(webinars.webinarDate, sql`NOW()`),
          inArray(webinars.status, ["scheduled", "live"]),
          sql`(${webinars.targetRoles} = '{}'::text[] OR ${webinars.targetRoles} @> ARRAY[${userRole}]::text[])`
        )
      )
      .orderBy(webinars.webinarDate)
      .limit(3);

    const keys = Object.keys(queries);
    const results = await Promise.all(Object.values(queries));

    const response: Record<string, any> = {};
    keys.forEach((key, i) => {
      response[key] = results[i];
    });

    res.json(response);
  } catch (error: any) {
    console.error("academy-v3 home-data error:", error);
    res.status(500).json({ error: "Veriler yüklenirken hata oluştu" });
  }
});

router.get("/api/v3/academy/modules", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const { category, mandatory, search } = req.query;

    const conditions = [
      eq(trainingModules.isActive, true),
      isNull(trainingModules.deletedAt),
    ];

    if (category && typeof category === "string") {
      conditions.push(eq(trainingModules.category, category));
    }

    if (mandatory === "true") {
      conditions.push(eq(trainingModules.isMandatory, true));
    } else if (mandatory === "false") {
      conditions.push(eq(trainingModules.isMandatory, false));
    }

    if (search && typeof search === "string") {
      conditions.push(ilike(trainingModules.title, `%${search}%`));
    }

    const modules = await db
      .select({
        id: trainingModules.id,
        title: trainingModules.title,
        category: trainingModules.category,
        isMandatory: trainingModules.isMandatory,
        deadlineDays: trainingModules.deadlineDays,
        estimatedDuration: trainingModules.estimatedDuration,
        heroImageUrl: trainingModules.heroImageUrl,
        progress: userTrainingProgress.progressPercentage,
        status: userTrainingProgress.status,
      })
      .from(trainingModules)
      .leftJoin(
        userTrainingProgress,
        and(
          eq(userTrainingProgress.moduleId, trainingModules.id),
          eq(userTrainingProgress.userId, userId)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(trainingModules.isMandatory), trainingModules.title);

    res.json(modules);
  } catch (error: any) {
    console.error("academy-v3 modules error:", error);
    res.status(500).json({ error: "Modüller yüklenirken hata oluştu" });
  }
});

router.get("/api/v3/academy/webinars", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const userRole = user.role;
    const { status: statusFilter, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr as string) || 20, 100);

    const conditions = [
      sql`(${webinars.targetRoles} = '{}'::text[] OR ${webinars.targetRoles} @> ARRAY[${userRole}]::text[])`,
    ];

    if (statusFilter && typeof statusFilter === "string") {
      conditions.push(eq(webinars.status, statusFilter));
    }

    const list = await db
      .select({
        id: webinars.id,
        title: webinars.title,
        description: webinars.description,
        hostName: webinars.hostName,
        webinarDate: webinars.webinarDate,
        durationMinutes: webinars.durationMinutes,
        meetingLink: webinars.meetingLink,
        status: webinars.status,
        isLive: webinars.isLive,
        maxParticipants: webinars.maxParticipants,
        isRegistered: sql<boolean>`EXISTS (
          SELECT 1 FROM webinar_registrations wr 
          WHERE wr.webinar_id = ${webinars.id} AND wr.user_id = ${userId}
        )`,
      })
      .from(webinars)
      .where(and(...conditions))
      .orderBy(webinars.webinarDate)
      .limit(limit);

    res.json(list);
  } catch (error: any) {
    console.error("academy-v3 webinars list error:", error);
    res.status(500).json({ error: "Webinarlar yüklenirken hata oluştu" });
  }
});

router.post("/api/v3/academy/webinars", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }

    const parsed = insertWebinarSchema.safeParse({
      ...req.body,
      webinarDate: req.body.webinarDate ? new Date(req.body.webinarDate) : undefined,
      createdBy: user.id,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz veri", details: parsed.error.flatten() });
    }

    const [webinar] = await db.insert(webinars).values(parsed.data).returning();
    res.status(201).json(webinar);
  } catch (error: any) {
    console.error("academy-v3 webinar create error:", error);
    res.status(500).json({ error: "Webinar oluşturulurken hata oluştu" });
  }
});

router.patch("/api/v3/academy/webinars/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const [existing] = await db.select().from(webinars).where(eq(webinars.id, id));
    if (!existing) return res.status(404).json({ error: "Webinar bulunamadı" });

    const { title, description, hostName, webinarDate, durationMinutes, meetingLink, recordingUrl, targetRoles, isLive, status, maxParticipants } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (hostName !== undefined) updateData.hostName = hostName;
    if (webinarDate !== undefined) updateData.webinarDate = new Date(webinarDate);
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (recordingUrl !== undefined) updateData.recordingUrl = recordingUrl;
    if (targetRoles !== undefined) updateData.targetRoles = targetRoles;
    if (isLive !== undefined) updateData.isLive = isLive;
    if (status !== undefined) updateData.status = status;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;

    const [updated] = await db.update(webinars).set(updateData).where(eq(webinars.id, id)).returning();
    res.json(updated);
  } catch (error: any) {
    console.error("academy-v3 webinar update error:", error);
    res.status(500).json({ error: "Webinar güncellenirken hata oluştu" });
  }
});

router.post("/api/v3/academy/webinars/:id/cancel", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const [existing] = await db.select().from(webinars).where(eq(webinars.id, id));
    if (!existing) return res.status(404).json({ error: "Webinar bulunamadı" });
    if (existing.status === "cancelled") return res.status(400).json({ error: "Webinar zaten iptal edilmiş" });

    const [updated] = await db.update(webinars)
      .set({ status: "cancelled", isLive: false, updatedAt: new Date() })
      .where(eq(webinars.id, id))
      .returning();

    const registrations = await db
      .select({ userId: webinarRegistrations.userId })
      .from(webinarRegistrations)
      .where(eq(webinarRegistrations.webinarId, id));

    for (const reg of registrations) {
      try {
        await storage.createNotification({
          userId: reg.userId,
          type: "webinar_cancelled",
          title: "Webinar İptal Edildi",
          message: `"${existing.title}" webinarı iptal edildi.`,
          link: "/akademi/webinarlar",
        });
      } catch {}
    }

    res.json(updated);
  } catch (error: any) {
    console.error("academy-v3 webinar cancel error:", error);
    res.status(500).json({ error: "Webinar iptal edilirken hata oluştu" });
  }
});

router.post("/api/v3/academy/webinars/:id/complete", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID" });

    const [existing] = await db.select().from(webinars).where(eq(webinars.id, id));
    if (!existing) return res.status(404).json({ error: "Webinar bulunamadı" });
    if (existing.status === "completed") return res.status(400).json({ error: "Webinar zaten tamamlanmış" });

    const { recordingUrl } = req.body || {};
    const updateData: Record<string, any> = { status: "completed", isLive: false, updatedAt: new Date() };
    if (recordingUrl) updateData.recordingUrl = recordingUrl;

    const [updated] = await db.update(webinars)
      .set(updateData)
      .where(eq(webinars.id, id))
      .returning();

    await db
      .update(webinarRegistrations)
      .set({ status: "missed" })
      .where(
        and(
          eq(webinarRegistrations.webinarId, id),
          eq(webinarRegistrations.attended, false)
        )
      );

    res.json(updated);
  } catch (error: any) {
    console.error("academy-v3 webinar complete error:", error);
    res.status(500).json({ error: "Webinar tamamlanırken hata oluştu" });
  }
});

router.post("/api/v3/academy/webinars/:id/register", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const webinarId = parseInt(req.params.id);
    if (isNaN(webinarId)) return res.status(400).json({ error: "Geçersiz ID" });

    const [existing] = await db.select().from(webinars).where(eq(webinars.id, webinarId));
    if (!existing) return res.status(404).json({ error: "Webinar bulunamadı" });

    if (existing.targetRoles && existing.targetRoles.length > 0 && !existing.targetRoles.includes(user.role)) {
      return res.status(403).json({ error: "Bu webinara kayıt yetkiniz yok" });
    }

    if (existing.status !== "scheduled" && existing.status !== "live") {
      return res.status(400).json({ error: "Bu webinara artık kayıt yapılamaz" });
    }

    if (existing.maxParticipants) {
      const [{ count: regCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(webinarRegistrations)
        .where(eq(webinarRegistrations.webinarId, webinarId));
      if (regCount >= existing.maxParticipants) {
        return res.status(400).json({ error: "Webinar kontenjanı dolmuştur" });
      }
    }

    const [reg] = await db
      .insert(webinarRegistrations)
      .values({ webinarId, userId: user.id, status: "registered" })
      .onConflictDoNothing()
      .returning();

    if (!reg) {
      return res.status(409).json({ error: "Bu webinara zaten kayıtlısınız" });
    }

    res.status(201).json(reg);
  } catch (error: any) {
    console.error("academy-v3 webinar register error:", error);
    res.status(500).json({ error: "Kayıt olurken hata oluştu" });
  }
});

router.delete("/api/v3/academy/webinars/:id/register", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const webinarId = parseInt(req.params.id);
    if (isNaN(webinarId)) return res.status(400).json({ error: "Geçersiz ID" });

    await db
      .delete(webinarRegistrations)
      .where(
        and(
          eq(webinarRegistrations.webinarId, webinarId),
          eq(webinarRegistrations.userId, user.id)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    console.error("academy-v3 webinar unregister error:", error);
    res.status(500).json({ error: "Kayıt silinirken hata oluştu" });
  }
});

router.get("/api/v3/academy/webinars/:id/participants", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }

    const webinarId = parseInt(req.params.id);
    if (isNaN(webinarId)) return res.status(400).json({ error: "Geçersiz ID" });

    const participants = await db
      .select({
        id: webinarRegistrations.id,
        userId: webinarRegistrations.userId,
        registeredAt: webinarRegistrations.registeredAt,
        attended: webinarRegistrations.attended,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
      })
      .from(webinarRegistrations)
      .innerJoin(users, eq(webinarRegistrations.userId, users.id))
      .where(eq(webinarRegistrations.webinarId, webinarId))
      .orderBy(webinarRegistrations.registeredAt);

    res.json(participants);
  } catch (error: any) {
    console.error("academy-v3 webinar participants error:", error);
    res.status(500).json({ error: "Katılımcılar yüklenirken hata oluştu" });
  }
});

router.patch("/api/v3/academy/webinars/:id/attendance", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }

    const webinarId = parseInt(req.params.id);
    if (isNaN(webinarId)) return res.status(400).json({ error: "Geçersiz ID" });

    const { userIds, attended } = req.body;
    if (!Array.isArray(userIds) || typeof attended !== "boolean") {
      return res.status(400).json({ error: "userIds (array) ve attended (boolean) gerekli" });
    }

    const updateData: Record<string, any> = {
      attended,
      status: attended ? "attended" : "registered",
      attendedAt: attended ? new Date() : null,
    };

    await db
      .update(webinarRegistrations)
      .set(updateData)
      .where(
        and(
          eq(webinarRegistrations.webinarId, webinarId),
          inArray(webinarRegistrations.userId, userIds)
        )
      );

    res.json({ success: true, updated: userIds.length });
  } catch (error: any) {
    console.error("academy-v3 webinar attendance error:", error);
    res.status(500).json({ error: "Katılım durumu güncellenirken hata oluştu" });
  }
});

router.get("/api/v3/academy/webinars/admin/all", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!isHQUser(user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }

    const { status: statusFilter } = req.query;
    const conditions: any[] = [];
    if (statusFilter && typeof statusFilter === "string") {
      conditions.push(eq(webinars.status, statusFilter));
    }

    const list = await db
      .select({
        id: webinars.id,
        title: webinars.title,
        description: webinars.description,
        hostName: webinars.hostName,
        webinarDate: webinars.webinarDate,
        durationMinutes: webinars.durationMinutes,
        meetingLink: webinars.meetingLink,
        targetRoles: webinars.targetRoles,
        status: webinars.status,
        isLive: webinars.isLive,
        maxParticipants: webinars.maxParticipants,
        createdBy: webinars.createdBy,
        createdAt: webinars.createdAt,
        registrationCount: sql<number>`(SELECT count(*) FROM webinar_registrations wr WHERE wr.webinar_id = ${webinars.id})::int`,
      })
      .from(webinars)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(webinars.webinarDate));

    res.json(list);
  } catch (error: any) {
    console.error("academy-v3 admin webinars error:", error);
    res.status(500).json({ error: "Webinarlar yüklenirken hata oluştu" });
  }
});

const sentWebinarReminders = new Set<string>();

export async function checkWebinarReminders() {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tenMinWindow = 10 * 60 * 1000;

    const upcomingWebinars = await db
      .select()
      .from(webinars)
      .where(
        and(
          eq(webinars.status, "scheduled"),
          gte(webinars.webinarDate, now)
        )
      );

    for (const webinar of upcomingWebinars) {
      const webinarTime = new Date(webinar.webinarDate).getTime();
      const diffToOneHour = Math.abs(webinarTime - oneHourLater.getTime());
      const diffToOneDay = Math.abs(webinarTime - oneDayLater.getTime());

      let reminderType: string | null = null;
      let reminderMessage = "";

      if (diffToOneHour < tenMinWindow) {
        reminderType = "webinar_reminder_1h";
        reminderMessage = `"${webinar.title}" webinarı 1 saat sonra başlıyor!`;
      } else if (diffToOneDay < tenMinWindow) {
        reminderType = "webinar_reminder_1d";
        reminderMessage = `"${webinar.title}" webinarı yarın gerçekleşecek.`;
      }

      if (reminderType) {
        const dedupeKey = `${webinar.id}_${reminderType}`;
        if (sentWebinarReminders.has(dedupeKey)) continue;

        const registrations = await db
          .select({ userId: webinarRegistrations.userId })
          .from(webinarRegistrations)
          .where(eq(webinarRegistrations.webinarId, webinar.id));

        for (const reg of registrations) {
          try {
            await storage.createNotification({
              userId: reg.userId,
              type: reminderType,
              title: "Webinar Hatırlatma",
              message: reminderMessage,
              link: "/akademi/webinarlar",
            });
          } catch {}
        }

        sentWebinarReminders.add(dedupeKey);
      }
    }
  } catch (error) {
    console.error("Webinar reminder check error:", error);
  }
}

export default router;
