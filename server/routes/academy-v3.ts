import { Router } from "express";
import { db } from "../db";
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
import { eq, desc, and, sql, gte, ilike, isNull } from "drizzle-orm";

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

    const { title, description, hostName, webinarDate, durationMinutes, meetingLink, targetRoles, isLive, status, maxParticipants } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (hostName !== undefined) updateData.hostName = hostName;
    if (webinarDate !== undefined) updateData.webinarDate = new Date(webinarDate);
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
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

    const [reg] = await db
      .insert(webinarRegistrations)
      .values({ webinarId, userId: user.id })
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

export default router;
