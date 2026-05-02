import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { aiSettings, aiUsageLogs, users, type AISettings } from "@shared/schema";
import { storage } from "./storage";

export class AiBudgetExceededError extends Error {
  status = 503;
  code = "AI_BUDGET_EXCEEDED";
  monthToDateCost: number;
  monthlyBudget: number;
  constructor(monthToDateCost: number, monthlyBudget: number) {
    super(
      `AI aylık harcama tavanı aşıldı ($${monthToDateCost.toFixed(2)} / $${monthlyBudget.toFixed(2)}). ` +
        `Yapay zeka çağrıları geçici olarak durduruldu. Admin panelinden tavanı güncelleyebilirsiniz.`,
    );
    this.name = "AiBudgetExceededError";
    this.monthToDateCost = monthToDateCost;
    this.monthlyBudget = monthlyBudget;
  }
}

interface BudgetSettings {
  id?: number;
  monthlyBudgetUsd: number;
  budgetEnforcementEnabled: boolean;
  budgetAlertThresholdPct: number;
  lastBudgetAlertPct: number;
  lastBudgetAlertMonth: string | null;
}

export interface BudgetStatus {
  enforcementEnabled: boolean;
  monthlyBudgetUsd: number;
  monthToDateCost: number;
  percentUsed: number;
  remainingUsd: number;
  exceeded: boolean;
  alertThresholdPct: number;
  monthKey: string;
}

const DEFAULT_BUDGET = 50;
const DEFAULT_THRESHOLD = 80;
const COST_CACHE_TTL_MS = 60 * 1000;

let _costCache: { value: number; expiresAt: number; monthKey: string } | null = null;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthStartDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function rowToSettings(row: AISettings | undefined): BudgetSettings {
  if (!row) {
    return {
      monthlyBudgetUsd: DEFAULT_BUDGET,
      budgetEnforcementEnabled: true,
      budgetAlertThresholdPct: DEFAULT_THRESHOLD,
      lastBudgetAlertPct: 0,
      lastBudgetAlertMonth: null,
    };
  }
  return {
    id: row.id,
    monthlyBudgetUsd: row.monthlyBudgetUsd != null ? Number(row.monthlyBudgetUsd) : DEFAULT_BUDGET,
    budgetEnforcementEnabled: row.budgetEnforcementEnabled !== false,
    budgetAlertThresholdPct: row.budgetAlertThresholdPct ?? DEFAULT_THRESHOLD,
    lastBudgetAlertPct: row.lastBudgetAlertPct ?? 0,
    lastBudgetAlertMonth: row.lastBudgetAlertMonth ?? null,
  };
}

async function loadBudgetSettings(): Promise<BudgetSettings> {
  try {
    const rows = await db.select().from(aiSettings).limit(1);
    return rowToSettings(rows[0]);
  } catch (err) {
    console.warn("[ai-budget-guard] Failed to load ai_settings:", err);
    return rowToSettings(undefined);
  }
}

async function getMonthToDateCost(force = false): Promise<number> {
  const monthKey = currentMonthKey();
  const now = Date.now();
  if (
    !force &&
    _costCache &&
    _costCache.monthKey === monthKey &&
    _costCache.expiresAt > now
  ) {
    return _costCache.value;
  }
  try {
    const rows = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${aiUsageLogs.costUsd} AS DECIMAL)), 0)`,
      })
      .from(aiUsageLogs)
      .where(sql`${aiUsageLogs.createdAt} >= ${monthStartDate()}`);
    const total = Number(rows[0]?.total || 0);
    _costCache = {
      value: total,
      expiresAt: now + COST_CACHE_TTL_MS,
      monthKey,
    };
    return total;
  } catch (err) {
    console.warn("[ai-budget-guard] Failed to read ai_usage_logs:", err);
    return _costCache?.value ?? 0;
  }
}

export function invalidateBudgetCache() {
  _costCache = null;
}

export async function getBudgetStatus(force = false): Promise<BudgetStatus> {
  const settings = await loadBudgetSettings();
  const monthToDateCost = await getMonthToDateCost(force);
  const monthlyBudget = settings.monthlyBudgetUsd > 0 ? settings.monthlyBudgetUsd : DEFAULT_BUDGET;
  const percentUsed = monthlyBudget > 0 ? (monthToDateCost / monthlyBudget) * 100 : 0;
  return {
    enforcementEnabled: settings.budgetEnforcementEnabled,
    monthlyBudgetUsd: monthlyBudget,
    monthToDateCost,
    percentUsed,
    remainingUsd: Math.max(0, monthlyBudget - monthToDateCost),
    exceeded: monthToDateCost >= monthlyBudget,
    alertThresholdPct: settings.budgetAlertThresholdPct,
    monthKey: currentMonthKey(),
  };
}

export function isAiBudgetError(err: unknown): err is AiBudgetExceededError {
  if (err instanceof AiBudgetExceededError) return true;
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: unknown }).code === "AI_BUDGET_EXCEEDED";
  }
  return false;
}

/**
 * Helper for route catch blocks: if `err` is an AI budget exceeded error,
 * sends a 503 response and returns true so the caller can `return` early.
 * Otherwise returns false and the caller continues with its own handling.
 */
export function respondIfAiBudgetError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => unknown } }): boolean {
  if (!isAiBudgetError(err)) return false;
  const e = err as AiBudgetExceededError;
  res.status(503).json({
    message: e.message,
    code: "AI_BUDGET_EXCEEDED",
    monthToDateCost: e.monthToDateCost,
    monthlyBudget: e.monthlyBudget,
  });
  return true;
}

export async function assertBudgetAvailable(): Promise<void> {
  const status = await getBudgetStatus();
  if (status.enforcementEnabled && status.exceeded) {
    throw new AiBudgetExceededError(status.monthToDateCost, status.monthlyBudgetUsd);
  }
}

export async function notifyBudgetThresholdIfNeeded(): Promise<void> {
  try {
    const settings = await loadBudgetSettings();
    const monthToDateCost = await getMonthToDateCost(true);
    const monthlyBudget = settings.monthlyBudgetUsd > 0 ? settings.monthlyBudgetUsd : DEFAULT_BUDGET;
    const percentUsed = monthlyBudget > 0 ? (monthToDateCost / monthlyBudget) * 100 : 0;
    const monthKey = currentMonthKey();
    const threshold = Math.max(1, Math.min(100, settings.budgetAlertThresholdPct || DEFAULT_THRESHOLD));

    let milestone = 0;
    if (percentUsed >= 100) milestone = 100;
    else if (percentUsed >= threshold) milestone = threshold;
    if (milestone === 0) return;

    const sameMonth = settings.lastBudgetAlertMonth === monthKey;
    if (sameMonth && settings.lastBudgetAlertPct >= milestone) return;

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.role} IN ('admin', 'hq_admin', 'general_manager')`);

    const title = milestone >= 100
      ? "AI aylık tavanı aşıldı"
      : `AI aylık tavanın %${milestone} eşiği geçildi`;
    const message = milestone >= 100
      ? `Bu ay AI harcaması $${monthToDateCost.toFixed(2)} / $${monthlyBudget.toFixed(2)} oldu. Yapay zeka çağrıları durduruldu.`
      : `Bu ay AI harcaması $${monthToDateCost.toFixed(2)} / $${monthlyBudget.toFixed(2)} (%${percentUsed.toFixed(1)}). Tavanı kontrol edin.`;

    for (const a of admins) {
      try {
        await storage.createNotification({
          userId: a.id,
          type: milestone >= 100 ? "alert" : "warning",
          title,
          message,
          link: "/admin/yapay-zeka-ayarlari",
        });
      } catch (e) {
        console.warn("[ai-budget-guard] notify failed for user", a.id, e);
      }
    }

    if (settings.id) {
      await db
        .update(aiSettings)
        .set({
          lastBudgetAlertPct: milestone,
          lastBudgetAlertAt: new Date(),
          lastBudgetAlertMonth: monthKey,
        })
        .where(eq(aiSettings.id, settings.id));
    }
  } catch (err) {
    console.warn("[ai-budget-guard] notifyBudgetThresholdIfNeeded failed:", err);
  }
}
