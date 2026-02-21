import { db } from "../db";
import { eq, and, sql, gte, lte, isNull, inArray } from "drizzle-orm";
import {
  opsRules,
  shifts,
  users,
  branches,
  shiftAttendance,
  attendancePenalties,
  type OpsRule,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  type UserRoleType,
} from "@shared/schema";

export interface RuleIssue {
  ruleId: number;
  ruleName: string;
  severity: string;
  entityType: string;
  message: string;
  evidence: Record<string, any>;
  suggestion: string;
}

export interface EvaluationContext {
  userId: string;
  userRole: UserRoleType;
  branchId?: number | null;
  dateRange?: { start: string; end: string };
  shiftData?: any[];
}

function interpolate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? key);
}

function parseCondition(rule: OpsRule): any {
  try {
    return JSON.parse(rule.conditionJson);
  } catch {
    return {};
  }
}

function parseMessage(rule: OpsRule): { tr: string; en: string } {
  try {
    return JSON.parse(rule.messageJson);
  } catch {
    return { tr: rule.name, en: rule.name };
  }
}

async function evaluateTraineeAlone(
  rule: OpsRule,
  ctx: EvaluationContext
): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];
  const cond = parseCondition(rule);
  const msg = parseMessage(rule);
  const traineeRoles = cond.traineeRoles || ["stajyer"];

  if (!ctx.branchId) return issues;

  const dateStart = ctx.dateRange?.start || new Date().toISOString().split("T")[0];
  const dateEnd = ctx.dateRange?.end || dateStart;

  const branchShifts = ctx.shiftData || await db
    .select({
      id: shifts.id,
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      assignedToId: shifts.assignedToId,
      userRole: users.role,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.assignedToId, users.id))
    .where(and(
      eq(shifts.branchId, ctx.branchId),
      gte(shifts.shiftDate, dateStart),
      lte(shifts.shiftDate, dateEnd),
      isNull(shifts.deletedAt)
    ));

  const byDateAndTime = new Map<string, any[]>();
  for (const s of branchShifts) {
    const key = `${s.shiftDate}|${s.startTime}-${s.endTime}`;
    if (!byDateAndTime.has(key)) byDateAndTime.set(key, []);
    byDateAndTime.get(key)!.push(s);
  }

  Array.from(byDateAndTime.entries()).forEach(([key, group]) => {
    const trainees = group.filter((s: any) => traineeRoles.includes(s.userRole));
    const nonTrainees = group.filter((s: any) => !traineeRoles.includes(s.userRole));

    for (const trainee of trainees) {
      if (nonTrainees.length === 0) {
        const vars = { employeeName: trainee.userName || "Stajyer", date: String(trainee.shiftDate) };
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          entityType: rule.entityType,
          message: interpolate(msg.tr, vars),
          evidence: { shiftDate: trainee.shiftDate, traineeId: trainee.assignedToId, shiftId: trainee.id },
          suggestion: "Vardiyaya en az 1 deneyimli çalışan ekleyin.",
        });
      }
    }
  });

  return issues;
}

async function evaluateMinStaff(
  rule: OpsRule,
  ctx: EvaluationContext
): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];
  const cond = parseCondition(rule);
  const msg = parseMessage(rule);
  const defaultMin = cond.defaultMin || 2;

  if (!ctx.branchId) return issues;

  const dateStart = ctx.dateRange?.start || new Date().toISOString().split("T")[0];
  const dateEnd = ctx.dateRange?.end || dateStart;

  const branchShifts = ctx.shiftData || await db
    .select({
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      assignedToId: shifts.assignedToId,
    })
    .from(shifts)
    .where(and(
      eq(shifts.branchId, ctx.branchId),
      gte(shifts.shiftDate, dateStart),
      lte(shifts.shiftDate, dateEnd),
      isNull(shifts.deletedAt)
    ));

  const byDate = new Map<string, Set<string>>();
  for (const s of branchShifts) {
    const dateKey = String(s.shiftDate);
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Set());
    if (s.assignedToId) byDate.get(dateKey)!.add(s.assignedToId);
  }

  Array.from(byDate.entries()).forEach(([date, staffSet]) => {
    const currentStaff = staffSet.size;
    if (currentStaff < defaultMin) {
      const vars = { date, minStaff: String(defaultMin), currentStaff: String(currentStaff) };
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        entityType: rule.entityType,
        message: interpolate(msg.tr, vars),
        evidence: { date, currentStaff, minStaff: defaultMin },
        suggestion: `${date} tarihine en az ${defaultMin - currentStaff} personel daha ekleyin.`,
      });
    }
  });

  return issues;
}

async function evaluateSoloNotAllowed(
  rule: OpsRule,
  ctx: EvaluationContext
): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];
  const msg = parseMessage(rule);

  if (!ctx.branchId) return issues;

  const dateStart = ctx.dateRange?.start || new Date().toISOString().split("T")[0];
  const dateEnd = ctx.dateRange?.end || dateStart;

  const branchShifts = await db
    .select({
      id: shifts.id,
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      assignedToId: shifts.assignedToId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
      userRole: users.role,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.assignedToId, users.id))
    .where(and(
      eq(shifts.branchId, ctx.branchId),
      gte(shifts.shiftDate, dateStart),
      lte(shifts.shiftDate, dateEnd),
      isNull(shifts.deletedAt)
    ));

  const byDateAndTime = new Map<string, any[]>();
  for (const s of branchShifts) {
    const key = `${s.shiftDate}|${s.startTime}-${s.endTime}`;
    if (!byDateAndTime.has(key)) byDateAndTime.set(key, []);
    byDateAndTime.get(key)!.push(s);
  }

  Array.from(byDateAndTime.entries()).forEach(([_, group]) => {
    if (group.length === 1) {
      const person = group[0];
      const noSoloRoles = ["stajyer", "barista"];
      if (noSoloRoles.includes(person.userRole || "")) {
        const vars = { employeeName: person.userName || "Çalışan" };
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          entityType: rule.entityType,
          message: interpolate(msg.tr, vars),
          evidence: { shiftId: person.id, userId: person.assignedToId, shiftDate: person.shiftDate },
          suggestion: "Bu vardiyaya ek personel atayın.",
        });
      }
    }
  });

  return issues;
}

async function evaluateLateCheckins(
  rule: OpsRule,
  ctx: EvaluationContext
): Promise<RuleIssue[]> {
  const issues: RuleIssue[] = [];
  const cond = parseCondition(rule);
  const msg = parseMessage(rule);
  const threshold = cond.threshold || 3;
  const dayRange = cond.dayRange || 14;

  if (!ctx.branchId) return issues;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dayRange);

  const lateResults = await db
    .select({
      userId: shiftAttendance.userId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
      lateCount: sql<number>`COUNT(*)`,
    })
    .from(attendancePenalties)
    .innerJoin(shiftAttendance, eq(attendancePenalties.shiftAttendanceId, shiftAttendance.id))
    .innerJoin(shifts, eq(shiftAttendance.shiftId, shifts.id))
    .innerJoin(users, eq(shiftAttendance.userId, users.id))
    .where(and(
      eq(shifts.branchId, ctx.branchId),
      eq(attendancePenalties.type, "lateness"),
      gte(attendancePenalties.createdAt, sinceDate),
    ))
    .groupBy(shiftAttendance.userId, users.firstName, users.lastName, users.username)
    .having(sql`COUNT(*) >= ${threshold}`);

  for (const row of lateResults) {
    const vars = {
      employeeName: row.userName || "Çalışan",
      dayRange: String(dayRange),
      lateCount: String(row.lateCount),
    };
    issues.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      entityType: rule.entityType,
      message: interpolate(msg.tr, vars),
      evidence: { userId: row.userId, lateCount: row.lateCount, dayRange },
      suggestion: "Çalışan ile görüşme yaparak gecikme nedenlerini değerlendirin.",
    });
  }

  return issues;
}

const RULE_EVALUATORS: Record<string, (rule: OpsRule, ctx: EvaluationContext) => Promise<RuleIssue[]>> = {
  trainee_alone: evaluateTraineeAlone,
  min_staff: evaluateMinStaff,
  solo_not_allowed: evaluateSoloNotAllowed,
  late_checkins: evaluateLateCheckins,
};

export async function evaluateRules(ctx: EvaluationContext): Promise<RuleIssue[]> {
  const allIssues: RuleIssue[] = [];

  const userScope = isBranchRole(ctx.userRole) ? "branch"
    : isFactoryFloorRole(ctx.userRole) ? "factory"
    : isHQRole(ctx.userRole) ? "all"
    : "branch";

  const scopeFilter = userScope === "all"
    ? eq(opsRules.isActive, true)
    : and(eq(opsRules.isActive, true), eq(opsRules.scope, userScope));

  const activeRules = await db
    .select()
    .from(opsRules)
    .where(scopeFilter);

  for (const rule of activeRules) {
    const cond = parseCondition(rule);
    const evaluator = RULE_EVALUATORS[cond.ruleType];
    if (!evaluator) continue;

    try {
      const ruleIssues = await evaluator(rule, ctx);
      allIssues.push(...ruleIssues);
    } catch (err: any) {
      console.error(`[RulesEngine] Error evaluating rule ${rule.id} (${rule.name}):`, err.message);
    }
  }

  return allIssues;
}

export async function evaluateShiftBlockRules(
  branchId: number,
  shiftData: any[]
): Promise<RuleIssue[]> {
  const blockRules = await db
    .select()
    .from(opsRules)
    .where(and(
      eq(opsRules.isActive, true),
      eq(opsRules.severity, "block"),
      eq(opsRules.entityType, "shift_plan")
    ));

  const issues: RuleIssue[] = [];

  for (const rule of blockRules) {
    const cond = parseCondition(rule);
    const evaluator = RULE_EVALUATORS[cond.ruleType];
    if (!evaluator) continue;

    try {
      const ctx: EvaluationContext = {
        userId: "system",
        userRole: "admin" as UserRoleType,
        branchId,
        shiftData,
      };
      const ruleIssues = await evaluator(rule, ctx);
      issues.push(...ruleIssues.filter(i => i.severity === "block"));
    } catch (err: any) {
      console.error(`[RulesEngine] Block rule error ${rule.id}:`, err.message);
    }
  }

  return issues;
}
