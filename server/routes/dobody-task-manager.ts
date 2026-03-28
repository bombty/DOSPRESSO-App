import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { storage } from "../storage";
import {
  dobodyFlowTasks,
  dobodyFlowCompletions,
  insertDobodyFlowTaskSchema,
  users,
  branches,
  isHQRole,
  type UserRoleType,
  type DobodyFlowTask,
} from "@shared/schema";
import { eq, and, sql, count, desc, inArray, gte, lte, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const FULL_ACCESS_ROLES = new Set(["admin", "ceo", "cgo"]);
const TASK_MANAGER_ROLES = new Set([
  "admin", "ceo", "cgo",
  "coach", "supervisor", "mudur",
  "trainer", "fabrika_mudur",
]);

function canManageTasks(role: string): boolean {
  return TASK_MANAGER_ROLES.has(role);
}

function hasFullAccess(role: string): boolean {
  return FULL_ACCESS_ROLES.has(role);
}

function isTaskInScope(task: DobodyFlowTask, role: string, userId: string, branchId: number | null): boolean {
  if (hasFullAccess(role)) return true;
  if (task.createdById === userId) return true;
  if ((role === "supervisor" || role === "mudur") && branchId) {
    return !task.targetBranches || task.targetBranches.length === 0 || task.targetBranches.includes(branchId);
  }
  if (role === "trainer") {
    const allowedRoles = ["barista", "bar_buddy", "stajyer", "supervisor", "mudur", "supervisor_buddy"];
    return !!task.targetRoles && task.targetRoles.some(r => allowedRoles.includes(r));
  }
  if (role === "fabrika_mudur") {
    const factoryRoles = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel", "fabrika_mudur"];
    return !!task.targetRoles && task.targetRoles.some(r => factoryRoles.includes(r));
  }
  return false;
}

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

router.get("/api/admin/dobody-tasks/summary", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const today = new Date().toISOString().split("T")[0];
    const weekStart = getStartOfWeek();

    let scopeFilter = sql`TRUE`;
    if (role === "supervisor" || role === "mudur") {
      const branchId = req.user.branchId ? Number(req.user.branchId) : null;
      if (branchId) {
        scopeFilter = sql`(${dobodyFlowTasks.targetBranches} IS NULL OR ${branchId} = ANY(${dobodyFlowTasks.targetBranches}))`;
      }
    } else if (role === "trainer") {
      scopeFilter = sql`(${dobodyFlowTasks.targetRoles} IS NOT NULL AND ${dobodyFlowTasks.targetRoles} && ARRAY['barista','bar_buddy','stajyer','supervisor','mudur']::text[])`;
    } else if (role === "fabrika_mudur") {
      scopeFilter = sql`(${dobodyFlowTasks.targetRoles} IS NOT NULL AND ${dobodyFlowTasks.targetRoles} && ARRAY['fabrika_operator','fabrika_sorumlu','fabrika_personel','fabrika_mudur']::text[])`;
    }

    const [activeCount] = await db
      .select({ cnt: count() })
      .from(dobodyFlowTasks)
      .where(and(
        eq(dobodyFlowTasks.isActive, true),
        or(
          sql`${dobodyFlowTasks.endDate} IS NULL`,
          sql`${dobodyFlowTasks.endDate} >= ${today}`
        ),
        scopeFilter
      ));

    const [weeklyCreated] = await db
      .select({ cnt: count() })
      .from(dobodyFlowTasks)
      .where(and(
        sql`${dobodyFlowTasks.createdAt} >= ${weekStart}::date`,
        scopeFilter
      ));

    const [totalCompletions] = await db
      .select({ cnt: count() })
      .from(dobodyFlowCompletions);

    const allTasks = await db
      .select({ id: dobodyFlowTasks.id })
      .from(dobodyFlowTasks)
      .where(and(eq(dobodyFlowTasks.isActive, true), scopeFilter));

    let avgCompletion = 0;
    if (allTasks.length > 0) {
      const taskIds = allTasks.map(t => t.id);
      const [completionData] = await db
        .select({ cnt: count() })
        .from(dobodyFlowCompletions)
        .where(inArray(dobodyFlowCompletions.taskId, taskIds));

      const totalTargetUsers = allTasks.length * 10;
      avgCompletion = totalTargetUsers > 0
        ? Math.round(((completionData?.cnt || 0) / totalTargetUsers) * 100)
        : 0;
    }

    res.json({
      activeCount: activeCount?.cnt || 0,
      weeklyCreated: weeklyCreated?.cnt || 0,
      avgCompletion: Math.min(avgCompletion, 100),
      totalCompletions: totalCompletions?.cnt || 0,
    });
  } catch (error: unknown) {
    console.error("Dobody task summary error:", error);
    res.status(500).json({ message: "Özet veriler yüklenemedi" });
  }
});

router.get("/api/admin/dobody-tasks", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const status = (req.query.status as string) || "active";
    const targetRole = req.query.targetRole as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split("T")[0];

    const conditions: any[] = [];

    if (status === "active") {
      conditions.push(eq(dobodyFlowTasks.isActive, true));
      conditions.push(or(
        sql`${dobodyFlowTasks.endDate} IS NULL`,
        sql`${dobodyFlowTasks.endDate} >= ${today}`
      ));
    } else if (status === "expired") {
      conditions.push(sql`${dobodyFlowTasks.endDate} < ${today}`);
      conditions.push(eq(dobodyFlowTasks.isActive, true));
    }

    if (targetRole) {
      conditions.push(sql`${targetRole} = ANY(${dobodyFlowTasks.targetRoles})`);
    }

    if (role === "supervisor" || role === "mudur") {
      const branchId = req.user.branchId ? Number(req.user.branchId) : null;
      if (branchId) {
        conditions.push(or(
          sql`${dobodyFlowTasks.targetBranches} IS NULL`,
          sql`${branchId} = ANY(${dobodyFlowTasks.targetBranches})`
        ));
      }
    } else if (role === "coach") {
      // coach can see tasks they created or tasks targeting branch roles
    } else if (role === "trainer") {
      conditions.push(sql`(${dobodyFlowTasks.createdById} = ${req.user.id} OR ${dobodyFlowTasks.targetRoles} && ARRAY['barista','bar_buddy','stajyer','supervisor','mudur']::text[])`);
    } else if (role === "fabrika_mudur") {
      conditions.push(sql`(${dobodyFlowTasks.createdById} = ${req.user.id} OR ${dobodyFlowTasks.targetRoles} && ARRAY['fabrika_operator','fabrika_sorumlu','fabrika_personel','fabrika_mudur']::text[])`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ cnt: count() })
      .from(dobodyFlowTasks)
      .where(whereClause);

    const taskList = await db
      .select()
      .from(dobodyFlowTasks)
      .where(whereClause)
      .orderBy(desc(dobodyFlowTasks.createdAt))
      .limit(limit)
      .offset(offset);

    const taskIds = taskList.map(t => t.id);
    let completionCounts = new Map<number, number>();
    if (taskIds.length > 0) {
      const completions = await db
        .select({
          taskId: dobodyFlowCompletions.taskId,
          cnt: count(),
        })
        .from(dobodyFlowCompletions)
        .where(inArray(dobodyFlowCompletions.taskId, taskIds))
        .groupBy(dobodyFlowCompletions.taskId);

      for (const c of completions) {
        completionCounts.set(c.taskId, c.cnt);
      }
    }

    const tasksWithStats = taskList.map(task => ({
      ...task,
      completionCount: completionCounts.get(task.id) || 0,
    }));

    res.json({
      tasks: tasksWithStats,
      total: totalResult?.cnt || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.cnt || 0) / limit),
    });
  } catch (error: unknown) {
    console.error("Dobody task list error:", error);
    res.status(500).json({ message: "Görevler yüklenemedi" });
  }
});

router.get("/api/admin/dobody-tasks/:id", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const taskId = parseInt(req.params.id);
    if (!taskId) return res.status(400).json({ message: "Geçersiz görev ID" });

    const [task] = await db
      .select()
      .from(dobodyFlowTasks)
      .where(eq(dobodyFlowTasks.id, taskId));

    if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

    const branchId = req.user.branchId ? Number(req.user.branchId) : null;
    if (!isTaskInScope(task, role, req.user.id, branchId)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    const [completionCount] = await db
      .select({ cnt: count() })
      .from(dobodyFlowCompletions)
      .where(eq(dobodyFlowCompletions.taskId, taskId));

    res.json({
      ...task,
      completionCount: completionCount?.cnt || 0,
    });
  } catch (error: unknown) {
    console.error("Dobody task detail error:", error);
    res.status(500).json({ message: "Görev detayı yüklenemedi" });
  }
});

router.post("/api/admin/dobody-tasks", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const body = {
      ...req.body,
      createdById: req.user.id,
    };

    if (!body.startDate) {
      body.startDate = new Date().toISOString().split("T")[0];
    }

    if (role === "supervisor" || role === "mudur") {
      const branchId = req.user.branchId ? Number(req.user.branchId) : null;
      if (!branchId) {
        return res.status(400).json({ message: "Şube atamanız yapılmamış" });
      }
      body.targetBranches = [branchId];
    }

    if (role === "trainer") {
      const allowedRoles = ["barista", "bar_buddy", "stajyer", "supervisor", "mudur", "supervisor_buddy"];
      if (body.targetRoles && body.targetRoles.length > 0) {
        const invalid = body.targetRoles.filter((r: string) => !allowedRoles.includes(r));
        if (invalid.length > 0) {
          return res.status(403).json({ message: `Eğitmen olarak bu rollere görev atamazsınız: ${invalid.join(", ")}` });
        }
      } else {
        body.targetRoles = allowedRoles;
      }
    }

    if (role === "fabrika_mudur") {
      const allowedRoles = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel", "fabrika_mudur"];
      if (body.targetRoles && body.targetRoles.length > 0) {
        const invalid = body.targetRoles.filter((r: string) => !allowedRoles.includes(r));
        if (invalid.length > 0) {
          return res.status(403).json({ message: `Fabrika müdürü olarak bu rollere görev atamazsınız: ${invalid.join(", ")}` });
        }
      } else {
        body.targetRoles = allowedRoles;
      }
    }

    if (role === "coach") {
      if (!body.targetBranches || body.targetBranches.length === 0) {
        return res.status(400).json({ message: "Koç olarak hedef şube belirtmelisiniz" });
      }
    }

    const parsed = insertDobodyFlowTaskSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const [task] = await db
      .insert(dobodyFlowTasks)
      .values(parsed.data)
      .returning();

    res.status(201).json(task);
  } catch (error: unknown) {
    console.error("Dobody task create error:", error);
    res.status(500).json({ message: "Görev oluşturulamadı" });
  }
});

router.patch("/api/admin/dobody-tasks/:id", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const taskId = parseInt(req.params.id);
    if (!taskId) return res.status(400).json({ message: "Geçersiz görev ID" });

    const [existing] = await db
      .select()
      .from(dobodyFlowTasks)
      .where(eq(dobodyFlowTasks.id, taskId));

    if (!existing) return res.status(404).json({ message: "Görev bulunamadı" });

    if (!hasFullAccess(role) && existing.createdById !== req.user.id) {
      return res.status(403).json({ message: "Sadece kendi oluşturduğunuz görevleri düzenleyebilirsiniz" });
    }

    const updates = {
      ...req.body,
      updatedAt: new Date(),
    };

    delete updates.id;
    delete updates.createdById;
    delete updates.createdAt;

    const [updated] = await db
      .update(dobodyFlowTasks)
      .set(updates)
      .where(eq(dobodyFlowTasks.id, taskId))
      .returning();

    res.json(updated);
  } catch (error: unknown) {
    console.error("Dobody task update error:", error);
    res.status(500).json({ message: "Görev güncellenemedi" });
  }
});

router.delete("/api/admin/dobody-tasks/:id", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const taskId = parseInt(req.params.id);
    if (!taskId) return res.status(400).json({ message: "Geçersiz görev ID" });

    const [existing] = await db
      .select()
      .from(dobodyFlowTasks)
      .where(eq(dobodyFlowTasks.id, taskId));

    if (!existing) return res.status(404).json({ message: "Görev bulunamadı" });

    if (!hasFullAccess(role) && existing.createdById !== req.user.id) {
      return res.status(403).json({ message: "Sadece kendi oluşturduğunuz görevleri silebilirsiniz" });
    }

    const [updated] = await db
      .update(dobodyFlowTasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dobodyFlowTasks.id, taskId))
      .returning();

    res.json({ success: true, task: updated });
  } catch (error: unknown) {
    console.error("Dobody task delete error:", error);
    res.status(500).json({ message: "Görev silinemedi" });
  }
});

router.get("/api/admin/dobody-tasks/:id/stats", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const taskId = parseInt(req.params.id);
    if (!taskId) return res.status(400).json({ message: "Geçersiz görev ID" });

    const [task] = await db
      .select()
      .from(dobodyFlowTasks)
      .where(eq(dobodyFlowTasks.id, taskId));

    if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

    const userBranchId = req.user.branchId ? Number(req.user.branchId) : null;
    if (!isTaskInScope(task, role, req.user.id, userBranchId)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    const completions = await db
      .select({
        userId: dobodyFlowCompletions.userId,
        completedAt: dobodyFlowCompletions.completedAt,
      })
      .from(dobodyFlowCompletions)
      .where(eq(dobodyFlowCompletions.taskId, taskId))
      .orderBy(desc(dobodyFlowCompletions.completedAt));

    const completedUserIds = completions.map(c => c.userId);

    let completedUsers: any[] = [];
    if (completedUserIds.length > 0) {
      const usersList = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
        })
        .from(users)
        .where(inArray(users.id, completedUserIds));

      const usersMap = new Map(usersList.map(u => [u.id, u]));

      let branchMap = new Map<number, string>();
      const branchIds = [...new Set(usersList.filter(u => u.branchId).map(u => Number(u.branchId)))];
      if (branchIds.length > 0) {
        const branchesList = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(inArray(branches.id, branchIds));
        branchMap = new Map(branchesList.map(b => [b.id, b.name]));
      }

      completedUsers = completions.map(c => {
        const user = usersMap.get(c.userId);
        return {
          userId: c.userId,
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          role: user?.role || "",
          branchName: user?.branchId ? branchMap.get(Number(user.branchId)) || "" : "",
          completedAt: c.completedAt,
        };
      });
    }

    const targetConditions: any[] = [eq(users.isActive, true)];
    if (task.targetRoles && task.targetRoles.length > 0) {
      targetConditions.push(inArray(users.role, task.targetRoles));
    }
    if (task.targetBranches && task.targetBranches.length > 0) {
      targetConditions.push(inArray(users.branchId, task.targetBranches));
    }
    if (task.targetUsers && task.targetUsers.length > 0) {
      targetConditions.push(inArray(users.id, task.targetUsers));
    }

    let pendingUsers: any[] = [];
    if (targetConditions.length > 1) {
      const allTargetUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
        })
        .from(users)
        .where(and(...targetConditions));

      const completedSet = new Set(completedUserIds);

      let branchMap2 = new Map<number, string>();
      const branchIds2 = [...new Set(allTargetUsers.filter(u => u.branchId).map(u => Number(u.branchId)))];
      if (branchIds2.length > 0) {
        const branchesList2 = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(inArray(branches.id, branchIds2));
        branchMap2 = new Map(branchesList2.map(b => [b.id, b.name]));
      }

      pendingUsers = allTargetUsers
        .filter(u => !completedSet.has(u.id))
        .map(u => ({
          userId: u.id,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          role: u.role || "",
          branchName: u.branchId ? branchMap2.get(Number(u.branchId)) || "" : "",
        }));
    }

    const totalTarget = completedUsers.length + pendingUsers.length;
    const completionRate = totalTarget > 0
      ? Math.round((completedUsers.length / totalTarget) * 100)
      : 0;

    res.json({
      task,
      completedUsers,
      pendingUsers,
      completionRate,
      totalTarget,
      totalCompleted: completedUsers.length,
    });
  } catch (error: unknown) {
    console.error("Dobody task stats error:", error);
    res.status(500).json({ message: "İstatistikler yüklenemedi" });
  }
});

router.post("/api/admin/dobody-tasks/:id/remind", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role as string;
    if (!canManageTasks(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const taskId = parseInt(req.params.id);
    if (!taskId) return res.status(400).json({ message: "Geçersiz görev ID" });

    const [task] = await db
      .select()
      .from(dobodyFlowTasks)
      .where(eq(dobodyFlowTasks.id, taskId));

    if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

    const userBranchId = req.user.branchId ? Number(req.user.branchId) : null;
    if (!isTaskInScope(task, role, req.user.id, userBranchId)) {
      return res.status(403).json({ message: "Bu göreve erişim yetkiniz yok" });
    }

    const completions = await db
      .select({ userId: dobodyFlowCompletions.userId })
      .from(dobodyFlowCompletions)
      .where(eq(dobodyFlowCompletions.taskId, taskId));

    const completedSet = new Set(completions.map(c => c.userId));

    const targetConditions: any[] = [eq(users.isActive, true)];
    if (task.targetRoles && task.targetRoles.length > 0) {
      targetConditions.push(inArray(users.role, task.targetRoles));
    }
    if (task.targetBranches && task.targetBranches.length > 0) {
      targetConditions.push(inArray(users.branchId, task.targetBranches));
    }
    if (task.targetUsers && task.targetUsers.length > 0) {
      targetConditions.push(inArray(users.id, task.targetUsers));
    }

    let sentCount = 0;

    if (targetConditions.length > 1) {
      const allTargetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(...targetConditions));

      const pendingUserIds = allTargetUsers
        .filter(u => !completedSet.has(u.id))
        .map(u => u.id);

      for (const userId of pendingUserIds) {
        try {
          await storage.createNotification({
            userId,
            type: "task_reminder",
            title: "Görev Hatırlatması",
            message: `"${task.title}" görevini tamamlamayı unutmayın.`,
            link: task.navigateTo || undefined,
            isRead: false,
          });
          sentCount++;
        } catch (e) { console.error(e); }
      }
    }

    res.json({
      success: true,
      sentCount,
      message: `${sentCount} kişiye hatırlatma gönderildi`,
    });
  } catch (error: unknown) {
    console.error("Dobody task remind error:", error);
    res.status(500).json({ message: "Hatırlatma gönderilemedi" });
  }
});

export default router;
