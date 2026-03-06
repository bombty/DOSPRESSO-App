import { db } from "../db";
import { storage } from "../storage";
import { sendNotificationEmail } from "../email";
import {
  agentPendingActions, agentEscalationHistory, agentRuns, users, branches,
  type AgentPendingAction, type InsertAgentEscalationHistory,
  UserRole,
} from "@shared/schema";
import { eq, and, or, lt, lte, gte, sql, desc, inArray, isNull } from "drizzle-orm";

const ESCALATION_LEVELS = [
  { level: 1, hoursAfterCreation: 0, targetRole: "assignee", label: "Sorumlu personel" },
  { level: 2, hoursAfterCreation: 24, targetRole: "branch_manager", label: "Şube müdürü" },
  { level: 3, hoursAfterCreation: 48, targetRole: "hq_ops", label: "HQ operasyon sorumlusu" },
  { level: 4, hoursAfterCreation: 72, targetRole: "executive", label: "Üst yönetim (CEO/CGO)" },
] as const;

const HQ_OPS_ROLES = [UserRole.COACH, UserRole.CGO] as const;
const EXECUTIVE_ROLES = [UserRole.CEO, UserRole.CGO] as const;

interface EscalationResult {
  actionId: number;
  previousLevel: number;
  newLevel: number;
  escalatedToUserId: string | null;
  escalatedToRole: string | null;
  success: boolean;
  error?: string;
}

export async function checkAndEscalateActions(): Promise<EscalationResult[]> {
  const results: EscalationResult[] = [];
  const now = new Date();

  try {
    const actionsToCheck = await db.select()
      .from(agentPendingActions)
      .where(
        or(
          eq(agentPendingActions.status, "pending"),
          eq(agentPendingActions.status, "expired")
        )
      );

    const eligibleActions = actionsToCheck.filter(action => {
      if (action.status === "expired") return true;
      if (action.status === "pending" && action.createdAt) {
        const hoursSinceCreation = (now.getTime() - new Date(action.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation >= 24) return true;
      }
      return false;
    });

    for (const action of eligibleActions) {
      try {
        const result = await processEscalation(action, now);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        console.error(`Escalation error for action ${action.id}:`, err);
        results.push({
          actionId: action.id,
          previousLevel: 0,
          newLevel: 0,
          escalatedToUserId: null,
          escalatedToRole: null,
          success: false,
          error: String(err),
        });
      }
    }
  } catch (err) {
    console.error("checkAndEscalateActions error:", err);
  }

  return results;
}

async function processEscalation(action: AgentPendingAction, now: Date): Promise<EscalationResult | null> {
  const existingEscalations = await db.select()
    .from(agentEscalationHistory)
    .where(eq(agentEscalationHistory.sourceActionId, action.id))
    .orderBy(desc(agentEscalationHistory.escalationLevel));

  const currentLevel = existingEscalations.length > 0
    ? existingEscalations[0].escalationLevel
    : 0;

  if (currentLevel >= 4) return null;

  const actionCreatedAt = action.createdAt ? new Date(action.createdAt) : now;
  const hoursSinceCreation = (now.getTime() - actionCreatedAt.getTime()) / (1000 * 60 * 60);

  let targetLevel: number | null = null;
  for (let i = ESCALATION_LEVELS.length - 1; i >= 0; i--) {
    const level = ESCALATION_LEVELS[i];
    if (level.level > currentLevel && hoursSinceCreation >= level.hoursAfterCreation) {
      targetLevel = level.level;
      break;
    }
  }

  if (targetLevel === null) return null;

  const levelConfig = ESCALATION_LEVELS.find(l => l.level === targetLevel)!;
  const { userId, userRole } = await findEscalationTarget(action, levelConfig);

  const escalationRecord: InsertAgentEscalationHistory = {
    sourceActionId: action.id,
    escalationLevel: targetLevel,
    escalatedToUserId: userId,
    escalatedToRole: userRole,
    resolvedAt: null,
    resolution: null,
  };

  const [inserted] = await db.insert(agentEscalationHistory).values(escalationRecord).returning();

  if (action.status === "pending" && action.expiresAt && new Date(action.expiresAt) < now) {
    await db.update(agentPendingActions)
      .set({ status: "expired" })
      .where(eq(agentPendingActions.id, action.id));
  }

  await sendEscalationNotification(action, targetLevel, userId, userRole, levelConfig.label);

  return {
    actionId: action.id,
    previousLevel: currentLevel,
    newLevel: targetLevel,
    escalatedToUserId: userId,
    escalatedToRole: userRole,
    success: true,
  };
}

async function findEscalationTarget(
  action: AgentPendingAction,
  levelConfig: typeof ESCALATION_LEVELS[number]
): Promise<{ userId: string | null; userRole: string | null }> {
  try {
    switch (levelConfig.targetRole) {
      case "assignee": {
        return {
          userId: action.targetUserId ?? null,
          userRole: action.targetRoleScope ?? null,
        };
      }

      case "branch_manager": {
        if (!action.branchId) {
          return { userId: null, userRole: UserRole.MUDUR };
        }
        const managers = await db.select({ id: users.id, role: users.role })
          .from(users)
          .where(and(
            eq(users.branchId, action.branchId),
            or(eq(users.role, UserRole.MUDUR), eq(users.role, UserRole.SUPERVISOR)),
            eq(users.isActive, true)
          ));
        const manager = managers.find(m => m.role === UserRole.MUDUR) || managers[0];
        return {
          userId: manager?.id ?? null,
          userRole: manager?.role ?? UserRole.MUDUR,
        };
      }

      case "hq_ops": {
        const hqUsers = await db.select({ id: users.id, role: users.role })
          .from(users)
          .where(and(
            or(...HQ_OPS_ROLES.map(r => eq(users.role, r))),
            eq(users.isActive, true)
          ));
        const coach = hqUsers.find(u => u.role === UserRole.COACH) || hqUsers[0];
        return {
          userId: coach?.id ?? null,
          userRole: coach?.role ?? UserRole.COACH,
        };
      }

      case "executive": {
        const executives = await db.select({ id: users.id, role: users.role })
          .from(users)
          .where(and(
            or(...EXECUTIVE_ROLES.map(r => eq(users.role, r))),
            eq(users.isActive, true)
          ));
        const ceo = executives.find(u => u.role === UserRole.CEO)
          || executives.find(u => u.role === UserRole.CGO)
          || executives[0];
        return {
          userId: ceo?.id ?? null,
          userRole: ceo?.role ?? UserRole.CEO,
        };
      }

      default:
        return { userId: null, userRole: null };
    }
  } catch (err) {
    console.error("findEscalationTarget error:", err);
    return { userId: null, userRole: null };
  }
}

async function sendEscalationNotification(
  action: AgentPendingAction,
  level: number,
  targetUserId: string | null,
  targetRole: string | null,
  levelLabel: string
): Promise<void> {
  const severityMap: Record<string, string> = {
    low: "Düşük",
    med: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  };
  const severityText = severityMap[action.severity] || action.severity;

  const notifTitle = `Escalation Seviye ${level}: ${action.title}`;
  const notifMessage = `${levelLabel}'ye yükseltildi. Öncelik: ${severityText}. ${action.description?.substring(0, 100) || ""}`;

  if (targetUserId) {
    try {
      await storage.createNotification({
        userId: String(targetUserId),
        type: "agent_escalation",
        title: notifTitle,
        message: notifMessage,
        link: action.deepLink || "/gorevler",
        isRead: false,
        branchId: action.branchId ?? null,
      });
    } catch (err) {
      console.error(`Escalation notification error for action ${action.id}:`, err);
    }

    try {
      const [targetUser] = await db.select({ email: users.email, firstName: users.firstName, username: users.username })
        .from(users)
        .where(eq(users.id, String(targetUserId)));

      if (targetUser?.email) {
        const emailType = level >= 3 ? "error" : level >= 2 ? "warning" : "info";
        await sendNotificationEmail(
          targetUser.email,
          `[DOSPRESSO Agent] ${notifTitle}`,
          `Merhaba ${targetUser.firstName || targetUser.username || "Kullanıcı"},\n\n${notifMessage}\n\nLütfen en kısa sürede aksiyonu değerlendirin.\n\nDOSPRESSO AI Agent (Mr. Dobody)`,
          emailType
        );
      }
    } catch (err) {
      console.error(`Escalation email error for action ${action.id}:`, err);
    }
  }

  if (action.targetUserId && action.targetUserId !== targetUserId) {
    try {
      await storage.createNotification({
        userId: String(action.targetUserId),
        type: "agent_escalation_info",
        title: `Aksiyon yükseltildi (Seviye ${level})`,
        message: `"${action.title}" aksiyonu ${levelLabel}'ye yükseltildi.`,
        link: action.deepLink || "/gorevler",
        isRead: false,
        branchId: action.branchId ?? null,
      });
    } catch (err) {
      console.error(`Original assignee notification error for action ${action.id}:`, err);
    }
  }
}

export async function resolveEscalation(
  actionId: number,
  resolution: string,
  resolvedByUserId?: string
): Promise<boolean> {
  try {
    const escalations = await db.select()
      .from(agentEscalationHistory)
      .where(and(
        eq(agentEscalationHistory.sourceActionId, actionId),
        isNull(agentEscalationHistory.resolvedAt)
      ));

    if (escalations.length === 0) return false;

    await db.update(agentEscalationHistory)
      .set({
        resolvedAt: new Date(),
        resolution,
      })
      .where(and(
        eq(agentEscalationHistory.sourceActionId, actionId),
        isNull(agentEscalationHistory.resolvedAt)
      ));

    return true;
  } catch (err) {
    console.error("resolveEscalation error:", err);
    return false;
  }
}

export async function getEscalationHistory(actionId: number) {
  return db.select()
    .from(agentEscalationHistory)
    .where(eq(agentEscalationHistory.sourceActionId, actionId))
    .orderBy(agentEscalationHistory.escalationLevel);
}

export async function getCurrentEscalationLevel(actionId: number): Promise<number> {
  const result = await db.select({ maxLevel: sql<number>`COALESCE(MAX(${agentEscalationHistory.escalationLevel}), 0)` })
    .from(agentEscalationHistory)
    .where(eq(agentEscalationHistory.sourceActionId, actionId));
  return result[0]?.maxLevel ?? 0;
}

export async function getUnresolvedEscalations() {
  return db.select({
    escalation: agentEscalationHistory,
    action: agentPendingActions,
  })
    .from(agentEscalationHistory)
    .innerJoin(agentPendingActions, eq(agentEscalationHistory.sourceActionId, agentPendingActions.id))
    .where(isNull(agentEscalationHistory.resolvedAt))
    .orderBy(desc(agentEscalationHistory.escalationLevel), desc(agentEscalationHistory.escalatedAt));
}

export async function runEscalationCheck(): Promise<{ results: EscalationResult[]; runId: number | null }> {
  const startTime = Date.now();
  let runId: number | null = null;

  try {
    const results = await checkAndEscalateActions();

    const [run] = await db.insert(agentRuns).values({
      runType: "escalation_check",
      scopeType: "global",
      scopeId: null,
      triggeredBy: "cron",
      inputKpis: { escalationsProcessed: results.length },
      llmUsed: false,
      llmModel: null,
      llmTokens: 0,
      actionsGenerated: results.filter(r => r.success).length,
      status: "success",
      executionTimeMs: Date.now() - startTime,
    }).returning();

    runId = run?.id ?? null;

    if (results.length > 0) {
      console.log(`[Agent Escalation] ${results.length} escalation işlendi. Run #${runId}`);
    }

    return { results, runId };
  } catch (err) {
    console.error("[Agent Escalation] runEscalationCheck error:", err);

    try {
      const [run] = await db.insert(agentRuns).values({
        runType: "escalation_check",
        scopeType: "global",
        scopeId: null,
        triggeredBy: "cron",
        inputKpis: { error: String(err) },
        llmUsed: false,
        llmModel: null,
        llmTokens: 0,
        actionsGenerated: 0,
        status: "error",
        executionTimeMs: Date.now() - startTime,
      }).returning();
      runId = run?.id ?? null;
    } catch {}

    return { results: [], runId };
  }
}
