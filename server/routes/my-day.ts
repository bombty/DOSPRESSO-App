import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  users,
  notifications,
  checklistCompletions,
  trainingAssignments,
  trainingMaterials,
  learningStreaks,
  userCareerProgress,
  careerLevels,
  employeeOnboardingAssignments,
} from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { getBaristaSuggestions } from "../lib/dobody-suggestions";
import { getLatestSkillInsights, deduplicateSuggestions } from "../agent/skills/skill-registry";

const router = Router();

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Gunaydin";
  if (hour < 18) return "Iyi gunler";
  return "Iyi aksamlar";
}

router.get("/api/my-day", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const branchId = req.user.branchId ? Number(req.user.branchId) : null;
    const today = new Date().toISOString().slice(0, 10);

    const [unreadResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    const unreadNotifications = unreadResult?.count || 0;

    let todayChecklists: any[] = [];
    try {
      const checklists = await db
        .select({
          id: checklistCompletions.id,
          status: checklistCompletions.status,
          totalTasks: checklistCompletions.totalTasks,
          completedTasks: checklistCompletions.completedTasks,
        })
        .from(checklistCompletions)
        .where(
          and(
            eq(checklistCompletions.userId, userId),
            eq(checklistCompletions.scheduledDate, today)
          )
        );
      todayChecklists = checklists;
    } catch {}

    let pendingTraining: any[] = [];
    try {
      const trainings = await db
        .select({
          id: trainingAssignments.id,
          materialId: trainingAssignments.materialId,
          status: trainingAssignments.status,
          dueDate: trainingAssignments.dueDate,
          materialName: trainingMaterials.title,
        })
        .from(trainingAssignments)
        .leftJoin(trainingMaterials, eq(trainingAssignments.materialId, trainingMaterials.id))
        .where(
          and(
            eq(trainingAssignments.userId, userId),
            sql`${trainingAssignments.status} IN ('assigned', 'in_progress')`
          )
        )
        .limit(3);
      pendingTraining = trainings;
    } catch {}

    let streak: any = { currentStreak: 0, bestStreak: 0, totalActiveDays: 0 };
    try {
      const [s] = await db
        .select({
          currentStreak: learningStreaks.currentStreak,
          bestStreak: learningStreaks.bestStreak,
          totalActiveDays: learningStreaks.totalActiveDays,
          weeklyGoalProgress: learningStreaks.weeklyGoalProgress,
          weeklyGoalTarget: learningStreaks.weeklyGoalTarget,
        })
        .from(learningStreaks)
        .where(eq(learningStreaks.userId, userId));
      if (s) streak = s;
    } catch {}

    let career: any = null;
    try {
      const [progress] = await db
        .select({
          compositeScore: userCareerProgress.compositeScore,
          currentCareerLevelId: userCareerProgress.currentCareerLevelId,
          completedModuleIds: userCareerProgress.completedModuleIds,
        })
        .from(userCareerProgress)
        .where(eq(userCareerProgress.userId, userId));

      if (progress) {
        const [currentLevel] = await db
          .select({
            id: careerLevels.id,
            titleTr: careerLevels.titleTr,
            levelNumber: careerLevels.levelNumber,
            roleId: careerLevels.roleId,
          })
          .from(careerLevels)
          .where(eq(careerLevels.id, progress.currentCareerLevelId));

        let nextLevel: any = null;
        if (currentLevel) {
          const [next] = await db
            .select({
              id: careerLevels.id,
              titleTr: careerLevels.titleTr,
              requiredModuleIds: careerLevels.requiredModuleIds,
            })
            .from(careerLevels)
            .where(eq(careerLevels.levelNumber, currentLevel.levelNumber + 1))
            .limit(1);
          if (next) {
            const completedSet = new Set(progress.completedModuleIds || []);
            const required = next.requiredModuleIds || [];
            const remaining = required.filter((id: number) => !completedSet.has(id));
            nextLevel = {
              titleTr: next.titleTr,
              requiredModules: required.length,
              remainingModules: remaining.length,
            };
          }
        }

        career = {
          compositeScore: Math.round(progress.compositeScore || 0),
          currentLevel: currentLevel?.titleTr || "Belirsiz",
          nextLevel,
        };
      }
    } catch {}

    let onboarding: any = null;
    if (userRole === "stajyer") {
      try {
        const [ob] = await db
          .select({
            id: employeeOnboardingAssignments.id,
            overallProgress: employeeOnboardingAssignments.overallProgress,
            startDate: employeeOnboardingAssignments.startDate,
            expectedEndDate: employeeOnboardingAssignments.expectedEndDate,
            mentorId: employeeOnboardingAssignments.mentorId,
            status: employeeOnboardingAssignments.status,
          })
          .from(employeeOnboardingAssignments)
          .where(
            and(
              eq(employeeOnboardingAssignments.userId, userId),
              eq(employeeOnboardingAssignments.status, "in_progress")
            )
          )
          .limit(1);

        if (ob) {
          let mentorName = null;
          if (ob.mentorId) {
            const [mentor] = await db
              .select({ firstName: users.firstName, lastName: users.lastName })
              .from(users)
              .where(eq(users.id, ob.mentorId));
            if (mentor) mentorName = `${mentor.firstName} ${mentor.lastName}`;
          }
          const startDate = new Date(ob.startDate);
          const now = new Date();
          const weeksPassed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
          const expectedEnd = ob.expectedEndDate ? new Date(ob.expectedEndDate) : null;
          const totalWeeks = expectedEnd
            ? Math.ceil((expectedEnd.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
            : 8;

          onboarding = {
            progress: ob.overallProgress,
            weeksPassed: Math.min(weeksPassed, totalWeeks),
            totalWeeks,
            mentorName,
          };
        }
      } catch {}
    }

    const todayTasks: any[] = [];

    const pendingChecklists = todayChecklists.filter((c) => c.status !== "completed");
    const completedChecklists = todayChecklists.filter((c) => c.status === "completed");
    if (pendingChecklists.length > 0) {
      todayTasks.push({
        type: "checklist",
        title: `Checklist (${completedChecklists.length}/${todayChecklists.length})`,
        status: "pending",
        link: "/checklistler",
      });
    } else if (todayChecklists.length > 0) {
      todayTasks.push({
        type: "checklist",
        title: `Checklist tamamlandi`,
        status: "completed",
        link: "/checklistler",
      });
    }

    for (const t of pendingTraining.slice(0, 2)) {
      todayTasks.push({
        type: "training",
        title: t.materialName || "Egitim",
        status: t.status === "in_progress" ? "in_progress" : "pending",
        link: `/akademi-modul/${t.materialId}`,
      });
    }

    if (unreadNotifications > 0) {
      todayTasks.push({
        type: "notification",
        title: `${unreadNotifications} bildirim`,
        status: "pending",
        link: "/bildirimler",
      });
    }

    const weeklyScoreChange = 0;

    let suggestions: any[] = [];
    try {
      suggestions = await getBaristaSuggestions(userId);
    } catch {}

    try {
      const skillInsights = await getLatestSkillInsights(userId, userRole);
      suggestions = deduplicateSuggestions([...suggestions, ...skillInsights]);
    } catch {}

    res.json({
      greeting: getGreeting(),
      user: {
        firstName: req.user.firstName,
        role: userRole,
        compositeScore: career?.compositeScore || 0,
        weeklyScoreChange,
      },
      todayTasks: todayTasks.slice(0, 3),
      unreadNotifications,
      streak,
      careerProgress: career,
      onboarding,
      suggestions,
    });
  } catch (error: unknown) {
    console.error("My day error:", error);
    res.status(500).json({ message: "Veri yuklenemedi" });
  }
});

export default router;
