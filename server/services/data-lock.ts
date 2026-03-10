import { db } from "../db";
import { dataLockRules, dataChangeLog, recordRevisions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface LockCheckResult {
  locked: boolean;
  reason?: string;
  canRequestChange?: boolean;
}

export async function checkDataLock(
  tableName: string,
  recordCreatedAt: Date,
  recordStatus?: string
): Promise<LockCheckResult> {
  try {
    const rules = await db.select().from(dataLockRules)
      .where(and(eq(dataLockRules.tableName, tableName), eq(dataLockRules.isActive, true)))
      .limit(1);

    if (!rules.length) return { locked: false };
    const rule = rules[0];

    if (rule.lockImmediately) {
      return { locked: true, reason: rule.description || "Bu kayıt kilitli", canRequestChange: rule.canRequestChange ?? true };
    }

    if (rule.lockOnStatus && recordStatus === rule.lockOnStatus) {
      return { locked: true, reason: rule.description || "Bu kayıt kilitli", canRequestChange: rule.canRequestChange ?? true };
    }

    if (rule.lockAfterDays !== null && rule.lockAfterDays !== undefined) {
      const lockDate = new Date(recordCreatedAt.getTime() + rule.lockAfterDays * 86400000);
      if (new Date() > lockDate) {
        return { locked: true, reason: rule.description || `${rule.lockAfterDays} günlük düzenleme süresi doldu`, canRequestChange: rule.canRequestChange ?? true };
      }
    }

    return { locked: false };
  } catch {
    return { locked: false };
  }
}

export async function trackChange(
  tableName: string,
  recordId: number,
  fieldName: string,
  oldVal: any,
  newVal: any,
  userId: string,
  reason?: string,
  changeRequestId?: number
): Promise<void> {
  const oldStr = oldVal === null || oldVal === undefined ? null : String(oldVal);
  const newStr = newVal === null || newVal === undefined ? null : String(newVal);
  if (oldStr === newStr) return;

  try {
    await db.insert(dataChangeLog).values({
      tableName,
      recordId,
      fieldName,
      oldValue: oldStr,
      newValue: newStr,
      changedBy: userId,
      changeReason: reason || null,
      changeRequestId: changeRequestId || null,
    });
  } catch (err) {
    console.error("[data-lock] trackChange error:", err);
  }
}

export async function createRevision(
  tableName: string,
  recordId: number,
  changes: Record<string, { old: any; new: any }>,
  userId: string,
  source: "direct" | "change_request" = "direct",
  changeRequestId?: number
): Promise<void> {
  try {
    const lastRevision = await db.select({
      max: sql<number>`COALESCE(MAX(revision_number), 0)`
    }).from(recordRevisions)
      .where(and(
        eq(recordRevisions.tableName, tableName),
        eq(recordRevisions.recordId, recordId)
      ));

    const revNum = (lastRevision[0]?.max || 0) + 1;

    await db.insert(recordRevisions).values({
      tableName,
      recordId,
      revisionNumber: revNum,
      fieldChanges: changes,
      changedBy: userId,
      changeSource: source,
      changeRequestId: changeRequestId || null,
    });
  } catch (err) {
    console.error("[data-lock] createRevision error:", err);
  }
}
