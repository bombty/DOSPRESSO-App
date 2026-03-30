import { db } from "../../db";
import { agentPendingActions, aiAgentLogs } from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { enrichInsightsWithAI } from "./ai-enrichment";
import { processSkillActions } from "./skill-notifications";

export interface SkillContext {
  userId: string;
  role: string;
  branchId?: number;
  timeRange: { start: Date; end: Date };
}

export interface SkillInsight {
  type: string;
  severity: "critical" | "warning" | "info" | "positive";
  message: string;
  data: Record<string, any>;
  requiresAI: boolean;
}

export interface EnrichedInsight extends SkillInsight {
  aiMessage?: string;
}

export interface SkillAction {
  actionType: string;
  targetUserId?: string;
  targetRoleScope?: string;
  branchId?: number;
  title: string;
  description: string;
  deepLink?: string;
  severity: "low" | "med" | "high" | "critical";
  metadata?: Record<string, any>;
  skillId?: string;
  category?: string;
  subcategory?: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  targetRoles: string[];
  schedule: "realtime" | "hourly" | "daily" | "weekly";
  autonomyLevel: "full_auto" | "suggest_approve" | "info_only";
  dataSources: string[];
  analyze: (context: SkillContext) => Promise<SkillInsight[]>;
  aiEnrich?: (insights: SkillInsight[], context: SkillContext) => Promise<EnrichedInsight[]>;
  generateActions: (insights: SkillInsight[] | EnrichedInsight[], context: SkillContext) => SkillAction[];
}

export const SKILL_REGISTRY: AgentSkill[] = [];

let skillsLoaded = false;

export async function ensureSkillsLoaded(): Promise<void> {
  if (skillsLoaded) return;
  skillsLoaded = true;
  await import("./daily-coach");
  await import("./team-tracker");
  await import("./stock-assistant");
  await import("./customer-watcher");
  await import("./production-director");
  await import("./food-safety");
  await import("./training-optimizer");
  await import("./performance-coach");
  await import("./security-monitor");
  await import("./stock-predictor");
  await import("./waste-analyzer");
  await import("./supplier-tracker");
  await import("./burnout-predictor");
  await import("./cost-analyzer");
  await import("./contract-tracker");
  await import("./qc-tracker");
  await import("./branch-task-tracker");
  await import("./factory-daily-summary");
  await import("./late-arrival-tracker");
  await import("./payroll-reminder");
  await import("./career-progression-tracker");
  await import("./equipment-lifecycle-tracker");
  await import("./supply-chain-monitor");
  await import("./daily-briefing");
  await import("./smart-reminder");
  await import("./auto-todo-from-ticket");
  await import("./cross-module-insight");
  await import("./shift-planner");
  await import("./training-assigner");
  await import("./compliance-reporter");
  await import("./sla-tracker");
  await import("./financial-insight");
}

export function registerSkill(skill: AgentSkill): void {
  const existing = SKILL_REGISTRY.findIndex((s) => s.id === skill.id);
  if (existing >= 0) {
    SKILL_REGISTRY[existing] = skill;
  } else {
    SKILL_REGISTRY.push(skill);
  }
}

export async function getSkillsForRole(role: string): Promise<AgentSkill[]> {
  await ensureSkillsLoaded();
  return SKILL_REGISTRY.filter((s) => s.targetRoles.includes(role));
}

export async function getSkillsBySchedule(schedule: AgentSkill["schedule"]): Promise<AgentSkill[]> {
  await ensureSkillsLoaded();
  return SKILL_REGISTRY.filter((s) => s.schedule === schedule);
}

export async function runSkillsForUser(
  userId: string,
  role: string,
  branchId?: number
): Promise<{ skillId: string; insights: SkillInsight[]; actions: SkillAction[] }[]> {
  const applicableSkills = await getSkillsForRole(role);
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const context: SkillContext = {
    userId,
    role,
    branchId,
    timeRange: { start: dayStart, end: now },
  };

  const results: { skillId: string; insights: SkillInsight[]; actions: SkillAction[] }[] = [];

  for (const skill of applicableSkills) {
    try {
      const insights = await skill.analyze(context);
      if (insights.length === 0) continue;

      let enriched: SkillInsight[] | EnrichedInsight[] = insights;
      const aiNeeded = insights.filter((i) => i.requiresAI);
      if (aiNeeded.length > 0) {
        try {
          enriched = await enrichInsightsWithAI(insights, context);
        } catch (error) { console.error("[skill-registry] Skill error:", error instanceof Error ? error.message : error);
          enriched = insights;
        }
      }

      const actions = skill.generateActions(enriched, context);
      for (const action of actions) {
        action.skillId = skill.id;
      }

      await processSkillActions(actions, skill, userId);

      results.push({ skillId: skill.id, insights, actions });
    } catch (err) {
      console.error(`[SkillRegistry] Skill ${skill.id} error for user ${userId}:`, err);
    }
  }

  return results;
}

export async function getSkillRegistryInfo(): Promise<{ id: string; name: string; description: string; schedule: string; autonomyLevel: string; targetRoles: string[] }[]> {
  await ensureSkillsLoaded();
  return SKILL_REGISTRY.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    schedule: s.schedule,
    autonomyLevel: s.autonomyLevel,
    targetRoles: s.targetRoles,
  }));
}

export async function getLatestSkillInsights(
  userId: string,
  role: string
): Promise<Array<{
  id: string;
  message: string;
  actionType: string;
  actionLabel: string;
  priority: string;
  icon: string;
  targetUserId?: string;
  payload?: Record<string, any>;
}>> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentActions = await db
      .select({
        id: agentPendingActions.id,
        actionType: agentPendingActions.actionType,
        title: agentPendingActions.title,
        description: agentPendingActions.description,
        severity: agentPendingActions.severity,
        deepLink: agentPendingActions.deepLink,
        targetUserId: agentPendingActions.targetUserId,
        metadata: agentPendingActions.metadata,
        status: agentPendingActions.status,
      })
      .from(agentPendingActions)
      .where(
        and(
          eq(agentPendingActions.targetUserId, userId),
          gte(agentPendingActions.createdAt, todayStart),
          eq(agentPendingActions.status, "pending")
        )
      )
      .orderBy(desc(agentPendingActions.createdAt))
      .limit(4);

    return recentActions.map((a) => {
      const meta = (a.metadata as Record<string, any>) || {};
      return {
        id: `skill-${a.id}`,
        message: a.description || a.title,
        actionType: a.deepLink ? "redirect" : "info",
        actionLabel: a.deepLink ? "Git" : "Bilgi",
        priority: a.severity === "critical" ? "high" : a.severity === "high" ? "high" : "medium",
        icon: a.severity === "critical" ? "AlertTriangle" : "Lightbulb",
        targetUserId: a.targetUserId || undefined,
        payload: a.deepLink ? { route: a.deepLink, ...meta } : meta,
      };
    });
  } catch (error) { console.error("[skill-registry] Skill error:", error instanceof Error ? error.message : error);
    return [];
  }
}

export function deduplicateSuggestions(suggestions: any[]): any[] {
  const seenIds = new Set<string>();
  const seenMessages = new Set<string>();
  return suggestions.filter((s) => {
    const id = s.id || "";
    const msg = s.message || "";
    if ((id && seenIds.has(id)) || (msg && seenMessages.has(msg))) return false;
    if (id) seenIds.add(id);
    if (msg) seenMessages.add(msg);
    return true;
  });
}
