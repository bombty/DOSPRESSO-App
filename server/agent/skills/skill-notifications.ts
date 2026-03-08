import { db } from "../../db";
import { storage } from "../../storage";
import { agentPendingActions, aiAgentLogs } from "@shared/schema";
import { eq, and, gte, count } from "drizzle-orm";
import type { AgentSkill, SkillAction } from "./skill-registry";

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;
const MAX_AGENT_NOTIFICATIONS_PER_TYPE_PER_DAY = 3;
const QUIET_HOUR_START = 20;
const QUIET_HOUR_END = 7;

const notificationTracker = new Map<string, { count: number; dateKey: string }>();

function getTurkeyHour(): number {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + TURKEY_OFFSET_MS);
  return turkeyTime.getUTCHours();
}

function getTurkeyDateKey(): string {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + TURKEY_OFFSET_MS);
  return turkeyTime.toISOString().slice(0, 10);
}

function isQuietHour(): boolean {
  const hour = getTurkeyHour();
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

function checkThrottle(userId: string, skillId: string): boolean {
  const key = `${userId}:${skillId}`;
  const dateKey = getTurkeyDateKey();
  const tracker = notificationTracker.get(key);

  if (!tracker || tracker.dateKey !== dateKey) {
    notificationTracker.set(key, { count: 1, dateKey });
    return true;
  }

  if (tracker.count >= MAX_AGENT_NOTIFICATIONS_PER_TYPE_PER_DAY) {
    return false;
  }

  tracker.count++;
  return true;
}

async function checkDuplicate(targetUserId: string, title: string, skillId: string): Promise<boolean> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: agentPendingActions.id })
      .from(agentPendingActions)
      .where(
        and(
          eq(agentPendingActions.targetUserId, targetUserId),
          eq(agentPendingActions.title, title),
          eq(agentPendingActions.status, "pending"),
          gte(agentPendingActions.createdAt, oneDayAgo)
        )
      )
      .limit(1);
    return existing.length > 0;
  } catch {
    return false;
  }
}

export async function processSkillActions(
  actions: SkillAction[],
  skill: AgentSkill,
  runUserId?: string
): Promise<{ sent: number; queued: number; throttled: number }> {
  let sent = 0;
  let queued = 0;
  let throttled = 0;

  for (const action of actions) {
    const targetUserId = action.targetUserId;
    if (!targetUserId) continue;

    if (!checkThrottle(targetUserId, skill.id)) {
      throttled++;
      continue;
    }

    const existingDup = await checkDuplicate(targetUserId, action.title, skill.id);
    if (existingDup) {
      throttled++;
      continue;
    }

    if (skill.autonomyLevel === "full_auto") {
      if (isQuietHour()) {
        try {
          await db.insert(agentPendingActions).values({
            actionType: action.actionType,
            targetUserId,
            targetRoleScope: action.targetRoleScope || null,
            branchId: action.branchId || null,
            title: action.title,
            description: action.description,
            deepLink: action.deepLink || null,
            severity: action.severity,
            status: "pending",
            metadata: { ...(action.metadata || {}), skillId: skill.id, queued: true, queuedAt: new Date().toISOString() },
          });
          queued++;
        } catch (err) {
          console.error(`[SkillNotification] Queue error for ${skill.id}:`, err);
        }
      } else {
        try {
          await storage.createNotification({
            userId: targetUserId,
            type: "agent_suggestion",
            title: `Mr. Dobody: ${action.title}`,
            message: action.description,
            link: action.deepLink || null,
            isRead: false,
            branchId: action.branchId || null,
          });

          await logAgentAction(skill.id, action, "auto_executed", runUserId);
          sent++;
        } catch (err) {
          console.error(`[SkillNotification] Send error for ${skill.id}:`, err);
        }
      }
    } else if (skill.autonomyLevel === "suggest_approve") {
      try {
        await db.insert(agentPendingActions).values({
          actionType: action.actionType,
          targetUserId,
          targetRoleScope: action.targetRoleScope || null,
          branchId: action.branchId || null,
          title: action.title,
          description: action.description,
          deepLink: action.deepLink || null,
          severity: action.severity,
          status: "pending",
          metadata: { ...(action.metadata || {}), skillId: skill.id },
        });

        const approverUserId = runUserId || targetUserId;
        await storage.createNotification({
          userId: approverUserId,
          type: "agent_suggestion",
          title: `Mr. Dobody öneri bekliyor`,
          message: action.title,
          link: "/agent-merkezi",
          isRead: false,
        });

        await logAgentAction(skill.id, action, "pending_approval", runUserId);
        queued++;
      } catch (err) {
        console.error(`[SkillNotification] Pending action error for ${skill.id}:`, err);
      }
    } else {
      try {
        await storage.createNotification({
          userId: targetUserId,
          type: "agent_suggestion",
          title: `Mr. Dobody: ${action.title}`,
          message: action.description,
          link: action.deepLink || null,
          isRead: false,
          branchId: action.branchId || null,
        });
        await logAgentAction(skill.id, action, "info_sent", runUserId);
        sent++;
      } catch (err) {
        console.error(`[SkillNotification] Info send error:`, err);
      }
    }
  }

  return { sent, queued, throttled };
}

async function logAgentAction(
  skillId: string,
  action: SkillAction,
  status: string,
  triggeredByUserId?: string
): Promise<void> {
  try {
    await db.insert(aiAgentLogs).values({
      runType: `skill_${skillId}`,
      triggeredByUserId: triggeredByUserId || action.targetUserId || "system",
      targetRoleScope: action.targetRoleScope || "skill_action",
      targetUserId: action.targetUserId || null,
      branchId: action.branchId || null,
      inputSummary: `skill:${skillId} action:${action.actionType}`,
      outputSummary: `${action.title} [${status}]`,
      actionCount: 1,
      status,
      executionTimeMs: 0,
    });
  } catch {}
}

export async function sendQueuedNotifications(): Promise<number> {
  if (isQuietHour()) return 0;

  let sent = 0;
  try {
    const queuedActions = await db
      .select()
      .from(agentPendingActions)
      .where(
        and(
          eq(agentPendingActions.status, "pending"),
          gte(agentPendingActions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .limit(50);

    for (const action of queuedActions) {
      const meta = (action.metadata as Record<string, any>) || {};
      if (!meta.queued) continue;

      try {
        await storage.createNotification({
          userId: action.targetUserId!,
          type: "agent_suggestion",
          title: `Mr. Dobody: ${action.title}`,
          message: action.description || "",
          link: action.deepLink || null,
          isRead: false,
          branchId: action.branchId || null,
        });

        await db
          .update(agentPendingActions)
          .set({ status: "completed", metadata: { ...meta, queued: false, sentAt: new Date().toISOString() } })
          .where(eq(agentPendingActions.id, action.id));

        sent++;
      } catch {}
    }
  } catch {}

  return sent;
}
