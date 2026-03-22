import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  checklistCompletions,
  userCareerProgress,
  leaveRequests,
  equipmentFaults,
  purchaseOrders,
  factoryBatchVerifications,
  productComplaints,
  quizResults,
  aiAgentLogs,
  factoryProductionBatches,
  factoryInventory,
  announcements,
  users,
} from "@shared/schema";
import { getNBAConfigForRole, getRoleGroup } from "@shared/ai-nba-config";
import type { AlertTemplate, ActionTemplate, RoleGroup } from "@shared/ai-nba-config";
import { eq, and, ne, gte, lte, count } from "drizzle-orm";
import { handleApiError } from "./helpers";
import { redactPII } from "../services/pii-redactor";
import { evaluateEmployeePolicies } from "../services/employee-policy-engine";
import type { EmployeePolicyResult } from "../services/employee-policy-engine";

const router = Router();

type BranchScoped = { branchId: number | null; group: RoleGroup | null };

async function querySignalCount(
  dataSource: string,
  { branchId, group }: BranchScoped,
  userId: string,
): Promise<number> {
  const isBranch = group === 'branch_floor' || group === 'branch_mgmt';
  const isFactory = group === 'factory';

  switch (dataSource) {
    case 'checklist_completions': {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const conditions = [
        ne(checklistCompletions.status, 'completed'),
        eq(checklistCompletions.scheduledDate, todayStr),
      ];
      if (isBranch && branchId) conditions.push(eq(checklistCompletions.branchId, branchId));
      const [r] = await db.select({ count: count() }).from(checklistCompletions).where(and(...conditions));
      return r?.count ?? 0;
    }

    case 'user_career_progress': {
      if (isBranch && (group === 'branch_floor')) {
        const [p] = await db.select().from(userCareerProgress)
          .where(eq(userCareerProgress.userId, userId)).limit(1);
        return p && (p.compositeScore ?? 0) < 50 ? 1 : 0;
      }
      const conditions = [lte(userCareerProgress.compositeScore, 50)];
      if (isBranch && branchId) {
        const [r] = await db.select({ count: count() }).from(userCareerProgress)
          .innerJoin(users, eq(users.id, userCareerProgress.userId))
          .where(and(eq(users.branchId, branchId), ...conditions));
        return r?.count ?? 0;
      }
      const [r] = await db.select({ count: count() }).from(userCareerProgress).where(and(...conditions));
      return r?.count ?? 0;
    }

    case 'leave_requests': {
      if (isBranch && branchId) {
        const [r] = await db.select({ count: count() }).from(leaveRequests)
          .innerJoin(users, eq(users.id, leaveRequests.userId))
          .where(and(eq(leaveRequests.status, 'pending'), eq(users.branchId, branchId)));
        return r?.count ?? 0;
      }
      const [r] = await db.select({ count: count() }).from(leaveRequests)
        .where(eq(leaveRequests.status, 'pending'));
      return r?.count ?? 0;
    }

    case 'equipment_faults': {
      const conditions = [ne(equipmentFaults.status, 'cozuldu')];
      if (isBranch && branchId) conditions.push(eq(equipmentFaults.branchId, branchId));
      const [r] = await db.select({ count: count() }).from(equipmentFaults).where(and(...conditions));
      return r?.count ?? 0;
    }

    case 'purchase_orders': {
      const [r] = await db.select({ count: count() }).from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'taslak'));
      return r?.count ?? 0;
    }

    case 'factory_batch_verifications': {
      const [r] = await db.select({ count: count() }).from(factoryBatchVerifications)
        .where(eq(factoryBatchVerifications.isApproved, false));
      return r?.count ?? 0;
    }

    case 'product_complaints': {
      const [r] = await db.select({ count: count() }).from(productComplaints)
        .where(ne(productComplaints.status, 'resolved'));
      return r?.count ?? 0;
    }

    case 'quiz_results': {
      const [r] = await db.select({ count: count() }).from(quizResults)
        .where(lte(quizResults.score, 60));
      return r?.count ?? 0;
    }

    case 'ai_agent_logs': {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [r] = await db.select({ count: count() }).from(aiAgentLogs)
        .where(and(eq(aiAgentLogs.status, 'error'), gte(aiAgentLogs.createdAt, yesterday)));
      return r?.count ?? 0;
    }

    case 'factory_production_batches': {
      const [r] = await db.select({ count: count() }).from(factoryProductionBatches)
        .where(eq(factoryProductionBatches.status, 'in_progress'));
      return r?.count ?? 0;
    }

    case 'factory_inventory': {
      const [r] = await db.select({ count: count() }).from(factoryInventory)
        .where(lte(factoryInventory.quantity, 10));
      return r?.count ?? 0;
    }

    case 'announcements': {
      const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [r] = await db.select({ count: count() }).from(announcements)
        .where(and(
          eq(announcements.showOnDashboard, true),
          lte(announcements.expiresAt, sevenDays),
        ));
      return r?.count ?? 0;
    }

    case 'users': {
      const [r] = await db.select({ count: count() }).from(users);
      return r?.count ?? 0;
    }

    default:
      return 0;
  }
}

router.get('/api/ai/dashboard-nba', isAuthenticated, async (req, res) => {
  const startTime = Date.now();
  try {
    const role: string = req.user.role;
    const userId: string = req.user.id;
    const branchId: number | null = req.user.branchId ?? null;

    const config = getNBAConfigForRole(role);
    if (!config) {
      return res.json({
        role,
        group: getRoleGroup(role),
        alerts: [],
        actions: [],
        analyzedAt: new Date().toISOString(),
      });
    }

    const group = getRoleGroup(role);
    const scope: BranchScoped = { branchId, group };

    const alertPromises = config.alerts.map(async (tpl: AlertTemplate) => {
      if (tpl.dataSource === 'missing') {
        return { type: tpl.type, title: tpl.titleTR + ' (veri kaynağı eksik)', severity: 'warning' as const, count: 0 };
      }
      try {
        const c = await querySignalCount(tpl.dataSource, scope, userId);
        if (c > 0) return { type: tpl.type, title: tpl.titleTR, severity: tpl.severity, count: c };
        return null;
      } catch {
        return null;
      }
    });

    const actionPromises = config.actions.map(async (tpl: ActionTemplate) => {
      if (tpl.dataSource === 'missing') {
        return { type: tpl.type, title: tpl.titleTR, reason: tpl.reasonTR, severity: tpl.severity, deepLink: tpl.deepLink, estimatedMinutes: tpl.estimatedMinutes };
      }
      try {
        const c = await querySignalCount(tpl.dataSource, scope, userId);
        if (c > 0) {
          return { type: tpl.type, title: tpl.titleTR, reason: tpl.reasonTR, severity: tpl.severity, deepLink: tpl.deepLink, estimatedMinutes: tpl.estimatedMinutes };
        }
        return null;
      } catch {
        return null;
      }
    });

    const [results, policyResult] = await Promise.all([
      Promise.allSettled([...alertPromises, ...actionPromises]),
      evaluateEmployeePolicies(userId).catch(() => null as EmployeePolicyResult | null),
    ]);

    const alertResults = results.slice(0, config.alerts.length);
    const actionResults = results.slice(config.alerts.length);

    let alerts = alertResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .slice(0, 3);

    let actions = actionResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .slice(0, 3);

    let employeeTypeKey: string | null = null;
    if (policyResult && policyResult.employeeTypeKey) {
      employeeTypeKey = policyResult.employeeTypeKey;
      const hiddenBuckets = policyResult.restrictions.hiddenBuckets;
      if (hiddenBuckets.length > 0) {
        actions = actions.filter((a) => {
          const tpl = config.actions.find((t: ActionTemplate) => t.type === a.type);
          return !tpl || !hiddenBuckets.includes(tpl.bucket);
        });
      }
      if (policyResult.complianceAlerts.length > 0) {
        alerts = [...alerts, ...policyResult.complianceAlerts].slice(0, 5);
      }
      if (policyResult.additionalActions.length > 0) {
        actions = [...actions, ...policyResult.additionalActions].slice(0, 5);
      }
    }

    try {
      await db.insert(aiAgentLogs).values({
        runType: 'dashboard_nba',
        triggeredByUserId: userId,
        targetRoleScope: role,
        targetUserId: userId,
        branchId: branchId ? Number(branchId) : null,
        inputSummary: redactPII(`NBA request for role=${role}${employeeTypeKey ? `, empType=${employeeTypeKey}` : ''}`),
        outputSummary: redactPII(`alerts=${alerts.length}, actions=${actions.length}`),
        actionCount: actions.length,
        status: 'success',
        executionTimeMs: Date.now() - startTime,
      });
    } catch { /* logging failure should not break response */ }

    res.json({
      role,
      group: config.group,
      employeeType: employeeTypeKey,
      alerts,
      actions,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleApiError(res, error, "NBA dashboard hatası");
  }
});

export default router;
