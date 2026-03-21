import { db } from "../db";
import { users, branches, agentPendingActions, agentRuns, inventory, customerFeedback, equipmentFaults, productComplaints } from "@shared/schema";
import { eq, and, or, gte, lte, sql, count, isNull, notInArray, lt } from "drizzle-orm";
import { getRoleGroup, ROLE_GROUP_MAP } from "./ai-policy-engine";
import { runAgentAnalysis, runBatchAnalysis } from "./agent-engine";
import { checkDailyActionLimit } from "./agent-safety";
import { runEscalationCheck, checkRoutingEscalations, checkActionOutcomes } from "./agent-escalation";
import { getSkillsBySchedule, runSkillsForUser, ensureSkillsLoaded } from "../agent/skills/skill-registry";
import { sendQueuedNotifications } from "../agent/skills/skill-notifications";
import { auditLogSystem } from "../audit";
import { storage } from "../storage";
import { schedulerManager } from "../scheduler-manager";

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

const TOKEN_BUDGET: Record<string, { daily: number; weekly: number }> = {
  branch_floor: { daily: 2, weekly: 5 },
  branch_mgmt: { daily: 3, weekly: 8 },
  hq_ops: { daily: 2, weekly: 10 },
  hq_finance: { daily: 2, weekly: 10 },
  executive: { daily: 1, weekly: 5 },
  factory: { daily: 2, weekly: 5 },
};

const llmCallTracker = new Map<string, { daily: number; weekly: number; lastDailyReset: string; lastWeeklyReset: string }>();

function getTurkeyDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + TURKEY_OFFSET_MS);
}

function getTurkeyDateKey(): string {
  return getTurkeyDate().toISOString().slice(0, 10);
}

function getTurkeyWeekKey(): string {
  const d = getTurkeyDate();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function checkTokenBudget(userId: string, roleGroup: string): boolean {
  const budget = TOKEN_BUDGET[roleGroup] || TOKEN_BUDGET.branch_floor;
  const dateKey = getTurkeyDateKey();
  const weekKey = getTurkeyWeekKey();
  const key = `${userId}:${roleGroup}`;

  const tracker = llmCallTracker.get(key) || {
    daily: 0,
    weekly: 0,
    lastDailyReset: dateKey,
    lastWeeklyReset: weekKey,
  };

  if (tracker.lastDailyReset !== dateKey) {
    tracker.daily = 0;
    tracker.lastDailyReset = dateKey;
  }
  if (tracker.lastWeeklyReset !== weekKey) {
    tracker.weekly = 0;
    tracker.lastWeeklyReset = weekKey;
  }

  llmCallTracker.set(key, tracker);

  return tracker.daily < budget.daily && tracker.weekly < budget.weekly;
}

function incrementTokenUsage(userId: string, roleGroup: string): void {
  const dateKey = getTurkeyDateKey();
  const weekKey = getTurkeyWeekKey();
  const key = `${userId}:${roleGroup}`;
  const tracker = llmCallTracker.get(key) || {
    daily: 0,
    weekly: 0,
    lastDailyReset: dateKey,
    lastWeeklyReset: weekKey,
  };
  tracker.daily++;
  tracker.weekly++;
  llmCallTracker.set(key, tracker);
}

let inactiveUsersInterval: NodeJS.Timeout | null = null;

async function cleanupOrphanedShiftSessions(): Promise<void> {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      UPDATE factory_shift_sessions
      SET status = 'completed',
          check_out_time = NOW(),
          notes = COALESCE(notes, '') || ' [Otomatik kapatıldı: 12 saatten fazla aktif]'
      WHERE status = 'active'
        AND check_in_time < ${twelveHoursAgo}
    `);
    const closedCount = result.rowCount || 0;
    if (closedCount > 0) {
      console.log(`[ShiftCleanup] ${closedCount} orphaned shift session(s) closed.`);
    }
  } catch (err) {
    console.error("[ShiftCleanup] Error cleaning up orphaned sessions:", err);
  }
}

async function deactivateInactiveUsers(): Promise<void> {
  console.log("[AgentScheduler] Inactive user deactivation starting...");
  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          notInArray(users.role, ['admin', 'ceo']),
          or(
            and(
              sql`${users.lastLoginAt} IS NOT NULL`,
              lt(users.lastLoginAt, sixtyDaysAgo)
            ),
            and(
              sql`${users.lastLoginAt} IS NULL`,
              lt(users.createdAt, sixtyDaysAgo)
            )
          )
        )
      );

    if (inactiveUsers.length === 0) {
      return;
    }

    for (const user of inactiveUsers) {
      await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));

      await auditLogSystem({
        eventType: "user.auto_deactivated",
        action: "deactivate",
        resource: "user",
        resourceId: user.id,
        details: {
          username: user.username,
          role: user.role,
          reason: "inactive_60_days",
        },
        actorRole: "system",
      });
    }

    const adminUsers = await storage.getUsersByRole('admin');
    for (const admin of adminUsers) {
      await storage.createNotification({
        userId: admin.id,
        title: "Inactive Users Deactivated",
        message: `${inactiveUsers.length} user(s) deactivated due to 60+ days of inactivity: ${inactiveUsers.map(u => u.username).join(', ')}`,
        type: "warning",
        relatedType: "security",
        relatedId: "inactive_users",
      });
    }

  } catch (err) {
    console.error("[AgentScheduler] Inactive user deactivation error:", err);
  }
}

let dailyInterval: NodeJS.Timeout | null = null;
let weeklyInterval: NodeJS.Timeout | null = null;
let eventCheckInterval: NodeJS.Timeout | null = null;
let escalationInterval: NodeJS.Timeout | null = null;
let skillHourlyInterval: NodeJS.Timeout | null = null;
let skillDailyInterval: NodeJS.Timeout | null = null;
let skillWeeklyInterval: NodeJS.Timeout | null = null;
let skillQueueInterval: NodeJS.Timeout | null = null;
let routingEscalationInterval: NodeJS.Timeout | null = null;
let outcomeCheckInterval: NodeJS.Timeout | null = null;
let isRunning = false;

async function getUsersByRoleGroups(groups: string[]): Promise<{ id: string; role: string; branchId: number | null }[]> {
  const allUsers = await db.select({
    id: users.id,
    role: users.role,
    branchId: users.branchId,
  }).from(users).where(eq(users.isActive, true));

  return allUsers.filter(u => groups.includes(getRoleGroup(u.role)));
}

async function runDailyAnalysis(): Promise<void> {
  const turkeyDate = getTurkeyDate();
  console.log(`[AgentScheduler] Günlük analiz başlatılıyor - ${turkeyDate.toISOString()}`);

  try {
    const targetUsers = await getUsersByRoleGroups(["branch_floor", "branch_mgmt"]);

    const branchGroups = new Map<number, string[]>();
    for (const u of targetUsers) {
      if (u.branchId) {
        const group = branchGroups.get(u.branchId) || [];
        group.push(u.id);
        branchGroups.set(u.branchId, group);
      }
    }

    let totalActions = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const [branchId, userIds] of branchGroups) {
      const eligibleUserIds = userIds.filter(uid => {
        const user = targetUsers.find(u => u.id === uid);
        const roleGroup = getRoleGroup(user?.role || "barista");
        return checkTokenBudget(uid, roleGroup);
      });

      if (eligibleUserIds.length === 0) continue;

      const result = await runBatchAnalysis(eligibleUserIds, "daily_analysis", "cron");
      totalActions += result.totalActions;
      totalProcessed += result.usersProcessed;
      totalErrors += result.errors;

      for (const uid of eligibleUserIds) {
        const user = targetUsers.find(u => u.id === uid);
        const roleGroup = getRoleGroup(user?.role || "barista");
        incrementTokenUsage(uid, roleGroup);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

  } catch (err) {
    console.error("[AgentScheduler] Günlük analiz hatası:", err);
  }
}

async function runWeeklySummary(): Promise<void> {
  const turkeyDate = getTurkeyDate();
  console.log(`[AgentScheduler] Haftalık özet başlatılıyor - ${turkeyDate.toISOString()}`);

  try {
    const targetUsers = await getUsersByRoleGroups(["hq_ops", "hq_finance", "executive", "factory"]);

    const roleGroupBatches = new Map<string, string[]>();
    for (const u of targetUsers) {
      const rg = getRoleGroup(u.role);
      const batch = roleGroupBatches.get(rg) || [];
      batch.push(u.id);
      roleGroupBatches.set(rg, batch);
    }

    let totalActions = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const [roleGroup, userIds] of roleGroupBatches) {
      const eligibleUserIds = userIds.filter(uid => checkTokenBudget(uid, roleGroup));

      if (eligibleUserIds.length === 0) continue;

      const result = await runBatchAnalysis(eligibleUserIds, "weekly_summary", "cron");
      totalActions += result.totalActions;
      totalProcessed += result.usersProcessed;
      totalErrors += result.errors;

      for (const uid of eligibleUserIds) {
        incrementTokenUsage(uid, roleGroup);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (err) {
    console.error("[AgentScheduler] Haftalık özet hatası:", err);
  }
}

async function checkEventTriggers(): Promise<void> {
  try {
    const now = new Date();

    const [zeroStockResult] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(inventory)
      .where(and(
        eq(inventory.isActive, true),
        lte(inventory.currentStock, sql`0`),
        sql`${inventory.minimumStock} > 0`
      ));

    const zeroStockCount = zeroStockResult?.cnt ?? 0;

    const slaThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const [slaBreachResult] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(productComplaints)
      .where(and(
        sql`${productComplaints.status} NOT IN ('resolved', 'cozuldu', 'closed')`,
        lte(productComplaints.createdAt, slaThreshold)
      ));

    const slaBreachCount = slaBreachResult?.cnt ?? 0;

    const feedbackSlaThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [feedbackSlaResult] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(customerFeedback)
      .where(and(
        isNull(customerFeedback.reviewedAt),
        lte(customerFeedback.createdAt, feedbackSlaThreshold),
        gte(customerFeedback.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      ));

    const feedbackSlaCount = feedbackSlaResult?.cnt ?? 0;

    const shouldTrigger = zeroStockCount >= 3 || slaBreachCount >= 5 || feedbackSlaCount >= 10;

    if (!shouldTrigger) return;


    const targetGroups = [];
    if (zeroStockCount >= 3) targetGroups.push("hq_finance");
    if (slaBreachCount >= 5) targetGroups.push("hq_ops", "executive");
    if (feedbackSlaCount >= 10) targetGroups.push("branch_mgmt", "hq_ops");

    const uniqueGroups = [...new Set(targetGroups)];
    const targetUsers = await getUsersByRoleGroups(uniqueGroups);

    const selectedUsers = targetUsers.slice(0, 10);

    if (selectedUsers.length > 0) {
      const result = await runBatchAnalysis(
        selectedUsers.map(u => u.id),
        "daily_analysis",
        "event"
      );
    }
  } catch (err) {
    console.error("[AgentScheduler] Event trigger kontrolü hatası:", err);
  }
}

async function runSkillsBySchedule(schedule: "hourly" | "daily" | "weekly"): Promise<void> {
  const label = schedule === "hourly" ? "Saatlik" : schedule === "daily" ? "Gunluk" : "Haftalik";
  console.log(`[SkillScheduler] ${label} skill calismasi baslatiliyor...`);

  try {
    const skills = await getSkillsBySchedule(schedule);
    if (skills.length === 0) return;

    const allTargetRoles = [...new Set(skills.flatMap((s) => s.targetRoles))];

    const activeUsers = await db
      .select({
        id: users.id,
        role: users.role,
        branchId: users.branchId,
      })
      .from(users)
      .where(eq(users.isActive, true));

    const targetUsers = activeUsers.filter((u) => allTargetRoles.includes(u.role));

    let processed = 0;
    let errors = 0;

    for (const user of targetUsers) {
      try {
        await runSkillsForUser(user.id, user.role, user.branchId || undefined);
        processed++;
      } catch (err) {
        errors++;
        console.error(`[SkillScheduler] ${schedule} skill error for ${user.id}:`, err);
      }

      if (processed % 20 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

  } catch (err) {
    console.error(`[SkillScheduler] ${label} skill hatasi:`, err);
  }
}

async function runHourlySkills(): Promise<void> {
  const turkeyHour = getTurkeyDate().getUTCHours();
  if (turkeyHour < 7 || turkeyHour >= 20) {
    return;
  }
  await runSkillsBySchedule("hourly");
}

async function runDailySkills(): Promise<void> {
  await runSkillsBySchedule("daily");
}

async function runWeeklySkills(): Promise<void> {
  await runSkillsBySchedule("weekly");
}

function getMillisUntilTurkeyTime(targetHour: number, targetMinute: number): number {
  const now = new Date();
  const turkeyNow = new Date(now.getTime() + TURKEY_OFFSET_MS);

  const target = new Date(turkeyNow);
  target.setHours(targetHour, targetMinute, 0, 0);

  if (turkeyNow >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - turkeyNow.getTime();
}

function getMillisUntilNextMonday(targetHour: number, targetMinute: number): number {
  const now = new Date();
  const turkeyNow = new Date(now.getTime() + TURKEY_OFFSET_MS);

  const daysUntilMonday = (8 - turkeyNow.getDay()) % 7 || 7;
  const target = new Date(turkeyNow);
  target.setDate(target.getDate() + daysUntilMonday);
  target.setHours(targetHour, targetMinute, 0, 0);

  if (turkeyNow >= target) {
    target.setDate(target.getDate() + 7);
  }

  return target.getTime() - turkeyNow.getTime();
}

export function startAgentScheduler(): void {
  if (isRunning) {
    console.log("[AgentScheduler] Zaten calisiyor, tekrar baslatilmadi.");
    return;
  }

  isRunning = true;
  console.log("[AgentScheduler] Agent Scheduler baslatiliyor...");

  const dailyDelayMs = getMillisUntilTurkeyTime(6, 0);
  console.log(`[AgentScheduler] Gunluk analiz ${Math.round(dailyDelayMs / 60000)} dakika sonra calisacak (06:00 TR)`);

  schedulerManager.registerTimeout('agent-daily-delay', () => {
    runDailyAnalysis();
    schedulerManager.registerInterval('agent-daily', runDailyAnalysis, 24 * 60 * 60 * 1000);
  }, dailyDelayMs);

  const weeklyDelayMs = getMillisUntilNextMonday(8, 0);
  console.log(`[AgentScheduler] Haftalik ozet ${Math.round(weeklyDelayMs / 60000)} dakika sonra calisacak (Pazartesi 08:00 TR)`);

  schedulerManager.registerTimeout('agent-weekly-delay', () => {
    runWeeklySummary();
    schedulerManager.registerInterval('agent-weekly', runWeeklySummary, 7 * 24 * 60 * 60 * 1000);
  }, weeklyDelayMs);

  schedulerManager.registerInterval('agent-event-check', checkEventTriggers, 15 * 60 * 1000);
  console.log("[AgentScheduler] Event-triggered kontrol her 15 dakikada calisacak.");

  schedulerManager.registerInterval('agent-hourly-tick', async () => {
    try {
      const result = await runEscalationCheck();
      if (result.results.length > 0) {
      }
    } catch (err) {
      console.error("[AgentScheduler] Escalation check error:", err);
    }

    try { await runHourlySkills(); } catch (err) { console.error("[SkillScheduler] Hourly skills error:", err); }

    try {
      const cnt = await checkRoutingEscalations();
    } catch (err) {
      console.error("[RoutingEscalation] Hata:", err);
    }
  }, 60 * 60 * 1000);
  console.log("[AgentScheduler] Consolidated hourly tick (escalation + skills + routing) her 1 saatte calisacak.");

  const dailySkillDelayMs = getMillisUntilTurkeyTime(7, 0);
  console.log(`[SkillScheduler] Gunluk skill'ler ${Math.round(dailySkillDelayMs / 60000)} dakika sonra calisacak (07:00 TR)`);
  schedulerManager.registerTimeout('skill-daily-delay', () => {
    runDailySkills();
    schedulerManager.registerInterval('skill-daily', runDailySkills, 24 * 60 * 60 * 1000);
  }, dailySkillDelayMs);

  const weeklySkillDelayMs = getMillisUntilNextMonday(9, 0);
  console.log(`[SkillScheduler] Haftalik skill'ler ${Math.round(weeklySkillDelayMs / 60000)} dakika sonra calisacak (Pazartesi 09:00 TR)`);
  schedulerManager.registerTimeout('skill-weekly-delay', () => {
    runWeeklySkills();
    schedulerManager.registerInterval('skill-weekly', runWeeklySkills, 7 * 24 * 60 * 60 * 1000);
  }, weeklySkillDelayMs);

  schedulerManager.registerInterval('skill-queue', async () => {
    try {
      const sent = await sendQueuedNotifications();
    } catch {}
  }, 30 * 60 * 1000);
  console.log("[SkillScheduler] Kuyruk kontrolu her 30 dakikada calisacak.");


  const inactiveUsersDelayMs = getMillisUntilTurkeyTime(2, 0);
  console.log(`[AgentScheduler] Inactive user check ${Math.round(inactiveUsersDelayMs / 60000)} dakika sonra calisacak (02:00 TR)`);
  schedulerManager.registerTimeout('inactive-users-delay', () => {
    deactivateInactiveUsers();
    schedulerManager.registerInterval('inactive-users', deactivateInactiveUsers, 24 * 60 * 60 * 1000);
  }, inactiveUsersDelayMs);

  const outcomeDelayMs = getMillisUntilTurkeyTime(8, 0);
  console.log(`[OutcomeTracking] Sonuc kontrolu ${Math.round(outcomeDelayMs / 60000)} dakika sonra calisacak (08:00 TR)`);
  schedulerManager.registerTimeout('outcome-delay', () => {
    checkActionOutcomes().catch(err => console.error("[OutcomeTracking] Ilk calisma hatasi:", err));
    schedulerManager.registerInterval('outcome-check', async () => {
      try {
        const cnt = await checkActionOutcomes();
      } catch (err) {
        console.error("[OutcomeTracking] Hata:", err);
      }
    }, 24 * 60 * 60 * 1000);
  }, outcomeDelayMs);

  const shiftCleanupDelayMs = getMillisUntilTurkeyTime(3, 0);
  console.log(`[AgentScheduler] Shift session cleanup ${Math.round(shiftCleanupDelayMs / 60000)} dakika sonra calisacak (03:00 TR)`);
  schedulerManager.registerTimeout('shift-cleanup-delay', () => {
    cleanupOrphanedShiftSessions();
    schedulerManager.registerInterval('shift-cleanup', cleanupOrphanedShiftSessions, 24 * 60 * 60 * 1000);
  }, shiftCleanupDelayMs);

  cleanupOrphanedShiftSessions();

  console.log("[AgentScheduler] Agent Scheduler basariyla baslatildi.");
}

export function stopAgentScheduler(): void {
  if (!isRunning) return;

  const agentJobs = [
    'agent-daily-delay', 'agent-daily', 'agent-weekly-delay', 'agent-weekly',
    'agent-event-check', 'agent-hourly-tick', 'skill-daily-delay',
    'skill-daily', 'skill-weekly-delay', 'skill-weekly', 'skill-queue',
    'inactive-users-delay', 'inactive-users',
    'outcome-delay', 'outcome-check',
    'shift-cleanup-delay', 'shift-cleanup'
  ];
  for (const name of agentJobs) {
    schedulerManager.removeJob(name);
  }

  isRunning = false;
  console.log("[AgentScheduler] Agent Scheduler durduruldu.");
}

export function getSchedulerStatus(): {
  running: boolean;
  tokenBudgets: Record<string, { dailyUsed: number; dailyLimit: number; weeklyUsed: number; weeklyLimit: number }>;
} {
  const tokenBudgets: Record<string, { dailyUsed: number; dailyLimit: number; weeklyUsed: number; weeklyLimit: number }> = {};

  for (const [group, budget] of Object.entries(TOKEN_BUDGET)) {
    let dailyUsed = 0;
    let weeklyUsed = 0;
    for (const [key, tracker] of llmCallTracker.entries()) {
      if (key.endsWith(`:${group}`)) {
        dailyUsed += tracker.daily;
        weeklyUsed += tracker.weekly;
      }
    }
    tokenBudgets[group] = {
      dailyUsed,
      dailyLimit: budget.daily,
      weeklyUsed,
      weeklyLimit: budget.weekly,
    };
  }

  return { running: isRunning, tokenBudgets };
}
