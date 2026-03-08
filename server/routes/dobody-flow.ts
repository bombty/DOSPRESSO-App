import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  users,
  tasks,
  checklistAssignments,
  checklistCompletions,
  learningStreaks,
  trainingAssignments,
  trainingModules,
  branches,
  customerFeedback,
  branchInventory,
  factoryProducts,
  dashboardAlerts,
  staffEvaluations,
  productionBatches,
  branchOrders,
  purchaseOrders,
  payrollRecords,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  dobodyFlowTasks,
  dobodyFlowCompletions,
  agentPendingActions,
  type UserRoleType,
} from "@shared/schema";
import { eq, and, sql, count, avg, lte, gte, desc, ne, or, inArray } from "drizzle-orm";
import {
  getBaristaSuggestions,
  getSupervisorSuggestions,
  getHQSuggestions,
  getCoachSuggestions,
  getFactorySuggestions,
  getTrainerSuggestions,
  getMuhasebeSuggestions,
} from "../lib/dobody-suggestions";

const router = Router();

interface FlowTask {
  id: string;
  title: string;
  description: string;
  route: string;
  estimatedMinutes: number;
  priority: "low" | "medium" | "high" | "critical";
  icon: string;
  completed: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi Günler";
  return "İyi Akşamlar";
}

function getPersonalMessage(streakData: any): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const lastActivity = streakData.lastActivityDate;

  if (!lastActivity && streakData.totalActiveDays === 0) {
    return "DOSPRESSO'ya hoş geldin!";
  }

  if (dayOfWeek === 1) {
    return "Yeni hafta, yeni hedefler!";
  }

  if (streakData.currentStreak > 1) {
    return `${streakData.currentStreak} gün streak! Bugün de devam edelim.`;
  }

  if (lastActivity) {
    const lastDate = new Date(lastActivity);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Dün harika iş çıkardın!";
    }
    if (diffDays > 1) {
      return "Tekrar hoş geldin!";
    }
  }

  return "Bugün harika bir gün olacak!";
}

async function getStreakData(userId: string) {
  try {
    const [streak] = await db
      .select({
        currentStreak: learningStreaks.currentStreak,
        bestStreak: learningStreaks.bestStreak,
        totalActiveDays: learningStreaks.totalActiveDays,
        lastActivityDate: learningStreaks.lastActivityDate,
        totalXp: learningStreaks.totalXp,
      })
      .from(learningStreaks)
      .where(eq(learningStreaks.userId, userId))
      .limit(1);
    return streak || { currentStreak: 0, bestStreak: 0, totalActiveDays: 0, lastActivityDate: null, totalXp: 0 };
  } catch {
    return { currentStreak: 0, bestStreak: 0, totalActiveDays: 0, lastActivityDate: null, totalXp: 0 };
  }
}

async function getBaristaFlowTasks(userId: string, branchId: number | null): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const pendingChecklists = await db
      .select({ id: checklistCompletions.id, checklistId: checklistCompletions.checklistId })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.userId, userId),
          eq(checklistCompletions.scheduledDate, today),
          ne(checklistCompletions.status, "completed")
        )
      )
      .limit(3);

    if (pendingChecklists.length > 0) {
      flowTasks.push({
        id: `checklist-daily-${userId}`,
        title: "Günlük Checklist",
        description: `${pendingChecklists.length} tamamlanmamış checklist var`,
        route: "/checklistler",
        estimatedMinutes: 10,
        priority: "high",
        icon: "ClipboardCheck",
        completed: false,
      });
    }
  } catch {}

  try {
    const pendingTraining = await db
      .select({ id: trainingAssignments.id })
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.userId, userId),
          eq(trainingAssignments.status, "assigned")
        )
      )
      .limit(1);

    if (pendingTraining.length > 0) {
      flowTasks.push({
        id: `training-${userId}`,
        title: "Eğitim Modülü",
        description: "Atanmış eğitim modülünü tamamla",
        route: "/akademi",
        estimatedMinutes: 15,
        priority: "medium",
        icon: "GraduationCap",
        completed: false,
      });
    }
  } catch {}

  try {
    const pendingTasks = await db
      .select({ id: tasks.id, description: tasks.description })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedToId, userId),
          eq(tasks.status, "beklemede")
        )
      )
      .limit(2);

    for (const task of pendingTasks) {
      flowTasks.push({
        id: `task-${task.id}`,
        title: "Görev",
        description: task.description.substring(0, 80),
        route: "/gorevler",
        estimatedMinutes: 5,
        priority: "medium",
        icon: "ListTodo",
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getSupervisorFlowTasks(userId: string, branchId: number): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const pendingChecklists = await db
      .select({ cnt: count() })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.branchId, branchId),
          eq(checklistCompletions.scheduledDate, today),
          ne(checklistCompletions.status, "completed")
        )
      );

    const pendingCount = pendingChecklists[0]?.cnt || 0;
    if (pendingCount > 0) {
      flowTasks.push({
        id: `checklist-branch-${branchId}`,
        title: "Checklist Takibi",
        description: `${pendingCount} tamamlanmamış checklist`,
        route: "/checklistler",
        estimatedMinutes: 5,
        priority: "high",
        icon: "ClipboardCheck",
        completed: false,
      });
    }
  } catch {}

  try {
    const pendingApprovals = await db
      .select({ cnt: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.branchId, branchId),
          eq(tasks.status, "incelemede")
        )
      );

    const approvalCount = pendingApprovals[0]?.cnt || 0;
    if (approvalCount > 0) {
      flowTasks.push({
        id: `approvals-${branchId}`,
        title: "Görev Onayları",
        description: `${approvalCount} görev onay bekliyor`,
        route: "/gorevler",
        estimatedMinutes: 10,
        priority: "high",
        icon: "CheckCircle",
        completed: false,
      });
    }
  } catch {}

  try {
    const lowStock = await db
      .select({ cnt: count() })
      .from(branchInventory)
      .where(
        and(
          eq(branchInventory.branchId, branchId),
          sql`CAST(${branchInventory.currentStock} AS numeric) < CAST(${branchInventory.minimumStock} AS numeric)`
        )
      );

    const lowStockCount = lowStock[0]?.cnt || 0;
    if (lowStockCount > 0) {
      flowTasks.push({
        id: `stock-${branchId}`,
        title: "Stok Uyarısı",
        description: `${lowStockCount} ürün minimum stok altında`,
        route: "/satinalma/stok-yonetimi",
        estimatedMinutes: 5,
        priority: "high",
        icon: "PackageX",
        completed: false,
      });
    }
  } catch {}

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [fb] = await db
      .select({ avgRating: avg(customerFeedback.rating), cnt: count() })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.branchId, branchId),
          gte(customerFeedback.feedbackDate, sevenDaysAgo)
        )
      );

    const avgRating = fb?.avgRating ? parseFloat(String(fb.avgRating)) : 0;
    const fbCount = fb?.cnt || 0;
    if (fbCount > 0 && avgRating < 3.5) {
      flowTasks.push({
        id: `feedback-${branchId}`,
        title: "Geri Bildirim Analizi",
        description: `Son 7 gün ortalama: ${avgRating.toFixed(1)} - inceleme gerekli`,
        route: "/crm/geri-bildirimler",
        estimatedMinutes: 10,
        priority: "critical",
        icon: "MessageSquareWarning",
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getMudurFlowTasks(userId: string, branchId: number): Promise<FlowTask[]> {
  const supervisorTasks = await getSupervisorFlowTasks(userId, branchId);

  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 1) {
      supervisorTasks.push({
        id: `weekly-report-${branchId}`,
        title: "Haftalık Rapor",
        description: "Bu haftanın şube raporunu incele",
        route: "/raporlar",
        estimatedMinutes: 15,
        priority: "medium",
        icon: "BarChart3",
        completed: false,
      });
    }
  } catch {}

  return supervisorTasks.slice(0, 3);
}

async function getCeoFlowTasks(userId: string): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];

  try {
    const activeAlerts = await db
      .select({ cnt: count() })
      .from(dashboardAlerts)
      .where(eq(dashboardAlerts.status, "active"));

    const alertCount = activeAlerts[0]?.cnt || 0;
    if (alertCount > 0) {
      flowTasks.push({
        id: "ceo-alerts",
        title: "Şube Uyarıları",
        description: `${alertCount} aktif uyarı var`,
        route: "/subeler",
        estimatedMinutes: 5,
        priority: "critical",
        icon: "AlertTriangle",
        completed: false,
      });
    }
  } catch {}

  try {
    const pendingAgentActions = await db
      .select({ cnt: count() })
      .from(agentPendingActions)
      .where(eq(agentPendingActions.status, "pending"));

    const pendingCount = pendingAgentActions[0]?.cnt || 0;
    if (pendingCount > 0) {
      flowTasks.push({
        id: "agent-pending-review",
        title: `${pendingCount} Mr. Dobody önerisi bekliyor`,
        description: "Agent önerilerini inceleyin ve onaylayın/reddedin",
        route: "/agent-merkezi",
        estimatedMinutes: 10,
        priority: pendingCount >= 5 ? "critical" : "high",
        icon: "Shield",
        completed: false,
      });
    }
  } catch {}

  try {
    const suggestions = await getHQSuggestions();
    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      flowTasks.push({
        id: `dobody-suggestion-${topSuggestion.id}`,
        title: "Mr. Dobody Önerisi",
        description: topSuggestion.message.substring(0, 80),
        route: topSuggestion.payload?.route || "/subeler",
        estimatedMinutes: 5,
        priority: topSuggestion.priority,
        icon: "Bot",
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 5);
}

async function getCoachFlowTasks(userId: string): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];

  try {
    const suggestions = await getCoachSuggestions(userId);
    for (const s of suggestions.slice(0, 2)) {
      flowTasks.push({
        id: `coach-${s.id}`,
        title: s.actionLabel,
        description: s.message.substring(0, 80),
        route: s.payload?.route || "/kocluk-paneli",
        estimatedMinutes: 10,
        priority: s.priority,
        icon: s.icon,
        completed: false,
      });
    }
  } catch {}

  if (flowTasks.length === 0) {
    flowTasks.push({
      id: "coach-branch-visit",
      title: "Şube Ziyareti",
      description: "Şubelerin performansını incele",
      route: "/subeler",
      estimatedMinutes: 15,
      priority: "medium",
      icon: "MapPin",
      completed: false,
    });
  }

  return flowTasks.slice(0, 3);
}

async function getTrainerFlowTasks(): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];

  try {
    const suggestions = await getTrainerSuggestions();
    for (const s of suggestions.slice(0, 3)) {
      flowTasks.push({
        id: `trainer-${s.id}`,
        title: s.actionLabel,
        description: s.message.substring(0, 80),
        route: s.payload?.route || "/egitim",
        estimatedMinutes: 10,
        priority: s.priority,
        icon: s.icon,
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getFabrikaFlowTasks(userId: string): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const pendingChecklists = await db
      .select({ cnt: count() })
      .from(checklistCompletions)
      .where(
        and(
          eq(checklistCompletions.userId, userId),
          eq(checklistCompletions.scheduledDate, today),
          ne(checklistCompletions.status, "completed")
        )
      );

    const checklistCount = pendingChecklists[0]?.cnt || 0;
    if (checklistCount > 0) {
      flowTasks.push({
        id: `fabrika-checklist-${userId}`,
        title: "Üretim Checklist",
        description: `${checklistCount} checklist tamamlanmadı`,
        route: "/checklistler",
        estimatedMinutes: 10,
        priority: "high",
        icon: "ClipboardCheck",
        completed: false,
      });
    }
  } catch {}

  try {
    const suggestions = await getFactorySuggestions();
    for (const s of suggestions.slice(0, 2)) {
      flowTasks.push({
        id: `fabrika-${s.id}`,
        title: s.actionLabel,
        description: s.message.substring(0, 80),
        route: s.payload?.route || "/fabrika/dashboard",
        estimatedMinutes: 10,
        priority: s.priority,
        icon: s.icon,
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getMuhasebeFlowTasks(): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];

  try {
    const suggestions = await getMuhasebeSuggestions();
    for (const s of suggestions.slice(0, 3)) {
      flowTasks.push({
        id: `muhasebe-${s.id}`,
        title: s.actionLabel,
        description: s.message.substring(0, 80),
        route: s.payload?.route || "/maas",
        estimatedMinutes: 10,
        priority: s.priority,
        icon: s.icon,
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getDefaultFlowTasks(userId: string, role: string): Promise<FlowTask[]> {
  const flowTasks: FlowTask[] = [];

  try {
    const pendingTasks = await db
      .select({ id: tasks.id, description: tasks.description, priority: tasks.priority })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedToId, userId),
          eq(tasks.status, "beklemede")
        )
      )
      .orderBy(desc(tasks.dueDate))
      .limit(3);

    for (const task of pendingTasks) {
      flowTasks.push({
        id: `task-${task.id}`,
        title: "Görev",
        description: task.description.substring(0, 80),
        route: "/gorevler",
        estimatedMinutes: 10,
        priority: (task.priority as any) || "medium",
        icon: "ListTodo",
        completed: false,
      });
    }
  } catch {}

  return flowTasks.slice(0, 3);
}

async function getManualFlowTasks(userId: string, userRole: string, branchId: number | null): Promise<FlowTask[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const activeManualTasks = await db
      .select()
      .from(dobodyFlowTasks)
      .where(
        and(
          eq(dobodyFlowTasks.isActive, true),
          lte(dobodyFlowTasks.startDate, today),
          or(
            sql`${dobodyFlowTasks.endDate} IS NULL`,
            gte(dobodyFlowTasks.endDate, today)
          )
        )
      );

    const matchingTasks = activeManualTasks.filter((task) => {
      const targetUsers = task.targetUsers || [];
      if (targetUsers.length > 0 && targetUsers.includes(userId)) {
        return true;
      }

      if (targetUsers.length > 0) {
        return false;
      }

      const targetRoles = task.targetRoles || [];
      const targetBranches = task.targetBranches || [];

      const roleMatch = targetRoles.length === 0 || targetRoles.includes(userRole);
      const branchMatch = targetBranches.length === 0 || (branchId !== null && targetBranches.includes(branchId));

      return roleMatch && branchMatch;
    });

    if (matchingTasks.length === 0) return [];

    const taskIds = matchingTasks.map((t) => t.id);
    const completions = await db
      .select({ taskId: dobodyFlowCompletions.taskId })
      .from(dobodyFlowCompletions)
      .where(
        and(
          eq(dobodyFlowCompletions.userId, userId),
          inArray(dobodyFlowCompletions.taskId, taskIds)
        )
      );

    const completedTaskIds = new Set(completions.map((c) => c.taskId));

    const priorityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
      high: "critical",
      normal: "medium",
      low: "low",
    };

    return matchingTasks.map((task) => ({
      id: `manual-task-${task.id}`,
      title: `${task.title} (HQ)`,
      description: task.description ? task.description.substring(0, 80) : "",
      route: task.navigateTo || "/",
      estimatedMinutes: task.estimatedMinutes || 5,
      priority: priorityMap[task.priority] || "medium",
      icon: "Star",
      completed: completedTaskIds.has(task.id),
    }));
  } catch (err) {
    console.error("Manual flow tasks error:", err);
    return [];
  }
}

router.get("/api/dobody/flow-tasks", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role as UserRoleType;
    const branchId = req.user.branchId ? Number(req.user.branchId) : null;

    const greeting = getGreeting();
    const streakData = await getStreakData(userId);

    let flowTasks: FlowTask[] = [];

    const baristaRoles = ["barista", "bar_buddy", "stajyer"];
    const supervisorRoles = ["supervisor", "supervisor_buddy"];
    const fabrikaRoles = ["fabrika_mudur", "fabrika", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel"];
    const muhasebeRoles = ["muhasebe", "muhasebe_ik"];

    if (baristaRoles.includes(userRole)) {
      flowTasks = await getBaristaFlowTasks(userId, branchId);
    } else if (supervisorRoles.includes(userRole) && branchId) {
      flowTasks = await getSupervisorFlowTasks(userId, branchId);
    } else if (userRole === "mudur" && branchId) {
      flowTasks = await getMudurFlowTasks(userId, branchId);
    } else if (userRole === "ceo" || userRole === "cgo" || userRole === "admin") {
      flowTasks = await getCeoFlowTasks(userId);
    } else if (userRole === "coach") {
      flowTasks = await getCoachFlowTasks(userId);
    } else if (userRole === "trainer") {
      flowTasks = await getTrainerFlowTasks();
    } else if (fabrikaRoles.includes(userRole)) {
      flowTasks = await getFabrikaFlowTasks(userId);
    } else if (muhasebeRoles.includes(userRole)) {
      flowTasks = await getMuhasebeFlowTasks();
    } else {
      flowTasks = await getDefaultFlowTasks(userId, userRole);
    }

    const manualTasks = await getManualFlowTasks(userId, userRole, branchId);
    flowTasks = [...manualTasks, ...flowTasks];

    const today = new Date().toISOString().split("T")[0];
    let completedToday = 0;
    try {
      const [result] = await db
        .select({ cnt: count() })
        .from(checklistCompletions)
        .where(
          and(
            eq(checklistCompletions.userId, userId),
            eq(checklistCompletions.scheduledDate, today),
            eq(checklistCompletions.status, "completed")
          )
        );
      completedToday = result?.cnt || 0;
    } catch {}

    const score = streakData.totalXp || 0;

    const personalMessage = getPersonalMessage(streakData);

    res.json({
      greeting,
      personalMessage,
      tasks: flowTasks,
      completedToday,
      streak: streakData.currentStreak || 0,
      score,
    });
  } catch (error: any) {
    console.error("Dobody flow-tasks error:", error);
    res.status(500).json({ message: "Flow görevleri yüklenemedi" });
  }
});

export default router;
