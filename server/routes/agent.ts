import { Router, type Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { 
  agentPendingActions, agentRuns, agentEscalationHistory, 
  agentActionOutcomes, agentRejectionPatterns, agentRoutingRules,
  users, notifications, aiAgentLogs, tasks, dobodyFlowTasks
} from "@shared/schema";
import { eq, desc, and, count, sql, gte, or, inArray, ne } from "drizzle-orm";
import { runAgentAnalysis } from "../services/agent-engine";
import { getEscalationHistory, resolveEscalation, getUnresolvedEscalations } from "../services/agent-escalation";
import { getSchedulerStatus } from "../services/agent-scheduler";

const router = Router();

function isAuthenticated(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Oturum açmanız gerekiyor" });
  next();
}

function isHQOrAdmin(req: any, res: any, next: any) {
  const role = req.user?.role;
  const hqRoles = ["admin", "ceo", "cgo", "coach", "trainer", "teknik", "ekipman_teknik", "satinalma", "muhasebe", "destek", "gida_muhendisi", "kalite_kontrol"];
  if (!hqRoles.includes(role)) return res.status(403).json({ message: "Yetkiniz yok" });
  next();
}

function isAdminCgoCeo(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (!["admin", "ceo", "cgo"].includes(role)) return res.status(403).json({ message: "Yetkiniz yok" });
  next();
}

router.get("/api/agent/actions", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const { status, limit: limitParam, offset: offsetParam, skillId } = req.query;
    const limit = Math.min(parseInt(limitParam as string) || 20, 100);
    const offset = parseInt(offsetParam as string) || 0;

    const conditions: any[] = [];

    const adminRoles = ["admin", "ceo", "cgo"];
    if (!adminRoles.includes(user.role)) {
      conditions.push(
        or(
          eq(agentPendingActions.targetUserId, user.id),
          eq(agentPendingActions.targetRoleScope, user.role)
        )
      );
      if (user.branchId) {
        conditions.push(
          or(
            eq(agentPendingActions.branchId, user.branchId),
            sql`${agentPendingActions.branchId} IS NULL`
          )
        );
      }
    }

    if (status && status !== "all") {
      conditions.push(eq(agentPendingActions.status, status as string));
    }

    if (skillId && skillId !== "all") {
      conditions.push(
        sql`(${agentPendingActions.metadata}->>'skillId')::text = ${skillId as string}`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select().from(agentPendingActions)
      .where(whereClause)
      .orderBy(desc(agentPendingActions.createdAt));

    const seen = new Set<string>();
    const deduped = results.filter((a) => {
      const key = `${a.title}__${a.status}__${a.targetUserId || ""}__${a.branchId || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const total = deduped.length;
    const paged = deduped.slice(offset, offset + limit);

    res.json({ data: paged, total, limit, offset });
  } catch (error: any) {
    console.error("Agent actions list error:", error);
    res.status(500).json({ message: "Agent önerileri alınamadı" });
  }
});

router.get("/api/agent/actions/summary", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const conditions: any[] = [];
    const adminRoles = ["admin", "ceo", "cgo"];

    if (!adminRoles.includes(user.role)) {
      conditions.push(
        or(
          eq(agentPendingActions.targetUserId, user.id),
          eq(agentPendingActions.targetRoleScope, user.role)
        )
      );
    }

    const pendingConditions = [...conditions, eq(agentPendingActions.status, "pending")];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayConditions = [...conditions, gte(agentPendingActions.createdAt, todayStart)];

    const [pendingResult, todayResult, criticalResult] = await Promise.all([
      db.select({ count: count() }).from(agentPendingActions)
        .where(pendingConditions.length > 0 ? and(...pendingConditions) : eq(agentPendingActions.status, "pending")),
      db.select({ count: count() }).from(agentPendingActions)
        .where(todayConditions.length > 0 ? and(...todayConditions) : gte(agentPendingActions.createdAt, todayStart)),
      db.select({ count: count() }).from(agentPendingActions)
        .where(and(
          eq(agentPendingActions.status, "pending"),
          or(
            eq(agentPendingActions.severity, "high"),
            eq(agentPendingActions.severity, "critical")
          ),
          ...(conditions.length > 0 ? conditions : [])
        ))
    ]);

    res.json({
      pending: pendingResult[0]?.count ?? 0,
      today: todayResult[0]?.count ?? 0,
      critical: criticalResult[0]?.count ?? 0,
    });
  } catch (error: any) {
    console.error("Agent summary error:", error);
    res.status(500).json({ message: "Agent özeti alınamadı" });
  }
});

router.post("/api/agent/actions/:id/approve", isAuthenticated, async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.id);
    const user = req.user;

    const [action] = await db.select().from(agentPendingActions).where(eq(agentPendingActions.id, actionId));
    if (!action) return res.status(404).json({ message: "Öneri bulunamadı" });
    if (action.status !== "pending" && action.status !== "escalated") return res.status(400).json({ message: "Bu öneri zaten işlenmiş" });

    const adminRoles = ["admin", "ceo", "cgo"];
    const isAdmin = adminRoles.includes(user.role);
    const isTargetUser = action.targetUserId && action.targetUserId === String(user.id);
    const isRoleScopeFallback = !action.targetUserId && action.targetRoleScope === user.role &&
      (action.branchId === null || action.branchId === user.branchId);
    const isEscalationTarget = action.status === "escalated" && action.escalationRole === user.role;

    if (!isAdmin && !isTargetUser && !isRoleScopeFallback && !isEscalationTarget) {
      return res.status(403).json({ message: "Bu öneriyi onaylama yetkiniz yok" });
    }

    await db.update(agentPendingActions)
      .set({
        status: "approved",
        approvedByUserId: String(user.id),
        approvedAt: new Date(),
      })
      .where(eq(agentPendingActions.id, actionId));

    let chainResult: {
      supervisorName?: string;
      taskCreated?: boolean;
      notificationSent?: boolean;
      flowTaskCreated?: boolean;
      followUpDate?: string;
      outcomeTrackingCreated?: boolean;
    } = {};

    const meta = action.metadata as Record<string, any> || {};
    const targetUserId = action.targetUserId || meta.targetUserId;

    if (isAdmin && targetUserId) {
      const [targetUser] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        branchId: users.branchId,
        role: users.role,
      }).from(users).where(eq(users.id, String(targetUserId)));

      if (targetUser && targetUser.branchId) {
        const targetName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ");
        const supervisors = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(
          and(
            eq(users.branchId, targetUser.branchId),
            or(eq(users.role, "supervisor"), eq(users.role, "mudur")),
            eq(users.isActive, true),
            ne(users.id, String(targetUserId))
          )
        );

        const supervisor = supervisors[0];
        if (supervisor) {
          const supervisorName = [supervisor.firstName, supervisor.lastName].filter(Boolean).join(" ");
          chainResult.supervisorName = supervisorName;

          const approverName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
          const scoreInfo = meta.score !== undefined ? ` Skor: ${meta.score}/100.` : "";

          await storage.createNotification({
            userId: supervisor.id,
            type: "agent_approval",
            title: "Performans Değerlendirmesi İstendi",
            message: `${targetName} için birebir görüşme yapmanız isteniyor.${scoreInfo} ${approverName} tarafından onaylandı.`,
            link: `/personel-detay/${targetUserId}`,
          });
          chainResult.notificationSent = true;

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);

          const [newTask] = await db.insert(tasks).values({
            description: `${targetName} ile birebir performans görüşmesi.${scoreInfo} ${approverName} tarafından istenen değerlendirme. Lütfen personel ile görüşme yapın ve sonucu not edin.`,
            branchId: targetUser.branchId,
            assignedToId: supervisor.id,
            assignedById: String(user.id),
            status: "beklemede",
            priority: "yüksek",
            dueDate,
            autoGenerated: true,
          }).returning({ id: tasks.id });
          chainResult.taskCreated = !!newTask;

          const today = new Date().toISOString().split("T")[0];
          const endDate = dueDate.toISOString().split("T")[0];
          await db.insert(dobodyFlowTasks).values({
            title: `${targetName} görüşmesi (Yönetim talebi)`,
            description: `${targetName} için performans görüşmesi yapılması gerekiyor.${scoreInfo}`,
            navigateTo: `/personel-detay/${targetUserId}`,
            priority: "high",
            targetUsers: [supervisor.id],
            startDate: today,
            endDate,
            isActive: true,
            createdById: String(user.id),
          });
          chainResult.flowTaskCreated = true;

          const followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + 7);

          try {
            await db.insert(agentActionOutcomes).values({
              actionId,
              taskId: newTask?.id || null,
              initialScore: meta.score !== undefined ? Number(meta.score) : null,
              followUpDate,
            });
            chainResult.outcomeTrackingCreated = true;
            chainResult.followUpDate = followUpDate.toISOString().split("T")[0];
          } catch (outcomeErr) {
            console.error("[Agent] Outcome tracking insert error:", outcomeErr);
          }
        }
      }
    }

    if (!chainResult.notificationSent) {
      if (action.actionType === "remind" && action.targetUserId) {
        await storage.createNotification({
          userId: action.targetUserId,
          type: "agent_reminder",
          title: action.title,
          message: action.description || "",
          link: action.deepLink || undefined,
        });
        chainResult.notificationSent = true;
      } else if (action.actionType === "alert" && action.targetUserId) {
        await storage.createNotification({
          userId: action.targetUserId,
          type: "agent_alert",
          title: action.title,
          message: action.description || "",
          link: action.deepLink || undefined,
        });
        chainResult.notificationSent = true;
      }
    }

    if (!chainResult.outcomeTrackingCreated && action.category) {
      try {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7);

        await db.insert(agentActionOutcomes).values({
          actionId,
          taskId: null,
          initialScore: meta.score !== undefined ? Number(meta.score) : null,
          followUpDate,
        });
        chainResult.outcomeTrackingCreated = true;
        chainResult.followUpDate = followUpDate.toISOString().split("T")[0];
      } catch (outcomeErr) {
        console.error("[Agent] Fallback outcome tracking error:", outcomeErr);
      }
    }

    res.json({ 
      message: "Öneri onaylandı", 
      actionId,
      ...chainResult,
    });
  } catch (error: any) {
    console.error("Agent approve error:", error);
    res.status(500).json({ message: "Onaylama hatası" });
  }
});

router.post("/api/agent/actions/:id/reject", isAuthenticated, async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.id);
    const user = req.user;
    const { reason } = req.body;

    const [action] = await db.select().from(agentPendingActions).where(eq(agentPendingActions.id, actionId));
    if (!action) return res.status(404).json({ message: "Öneri bulunamadı" });
    if (action.status !== "pending" && action.status !== "escalated") return res.status(400).json({ message: "Bu öneri zaten işlenmiş" });

    const adminRoles = ["admin", "ceo", "cgo"];
    const isAdmin = adminRoles.includes(user.role);
    const isTargetUser = action.targetUserId && action.targetUserId === String(user.id);
    const isRoleScopeFallback = !action.targetUserId && action.targetRoleScope === user.role &&
      (action.branchId === null || action.branchId === user.branchId);
    const isEscalationTarget = action.status === "escalated" && action.escalationRole === user.role;

    if (!isAdmin && !isTargetUser && !isRoleScopeFallback && !isEscalationTarget) {
      return res.status(403).json({ message: "Bu öneriyi reddetme yetkiniz yok" });
    }

    await db.update(agentPendingActions)
      .set({
        status: "rejected",
        rejectedReason: reason || null,
      })
      .where(eq(agentPendingActions.id, actionId));

    if (action.category) {
      const rejectionTargetUserId = action.targetUserId || (action.metadata as Record<string, any>)?.targetUserId;
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await db.insert(agentRejectionPatterns).values({
          targetUserId: rejectionTargetUserId || null,
          category: action.category,
          subcategory: action.subcategory || null,
          rejectionReason: reason || null,
          rejectedBy: String(user.id),
          expiresAt,
        });
      } catch (rejErr) {
        console.error("[Agent] Rejection pattern insert error:", rejErr);
      }
    }

    res.json({ message: "Öneri reddedildi", actionId });
  } catch (error: any) {
    console.error("Agent reject error:", error);
    res.status(500).json({ message: "Reddetme hatası" });
  }
});

router.post("/api/agent/run-now", isAuthenticated, isHQOrAdmin, async (req: any, res) => {
  try {
    const user = req.user;
    const result = await runAgentAnalysis(String(user.id), "daily_analysis", "manual");
    res.json({
      message: "Agent analizi tamamlandı",
      actionsGenerated: result.actionsCreated,
      runId: result.run?.id ?? null,
    });
  } catch (error: any) {
    console.error("Agent run-now error:", error);
    res.status(500).json({ message: "Agent analizi çalıştırılamadı" });
  }
});

router.get("/api/agent/escalations", isAuthenticated, isHQOrAdmin, async (req: any, res) => {
  try {
    const unresolved = await getUnresolvedEscalations();
    res.json({ data: unresolved });
  } catch (error: any) {
    console.error("Agent escalations error:", error);
    res.status(500).json({ message: "Escalation listesi alınamadı" });
  }
});

router.get("/api/agent/escalations/:actionId", isAuthenticated, async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    const history = await getEscalationHistory(actionId);
    res.json({ data: history });
  } catch (error: any) {
    console.error("Escalation history error:", error);
    res.status(500).json({ message: "Escalation geçmişi alınamadı" });
  }
});

router.post("/api/agent/escalations/:actionId/resolve", isAuthenticated, isHQOrAdmin, async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    const { resolution } = req.body;
    await resolveEscalation(actionId, resolution || "Manuel olarak çözüldü");
    res.json({ message: "Escalation çözüldü" });
  } catch (error: any) {
    console.error("Resolve escalation error:", error);
    res.status(500).json({ message: "Escalation çözülemedi" });
  }
});

router.get("/api/agent-center/stats", isAuthenticated, async (req: any, res) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const user = req.user;
    const conditions: any[] = [gte(agentPendingActions.createdAt, weekStart)];
    const adminRoles = ["admin", "ceo", "cgo"];
    if (!adminRoles.includes(user.role)) {
      conditions.push(
        or(
          eq(agentPendingActions.targetUserId, String(user.id)),
          eq(agentPendingActions.targetRoleScope, user.role)
        )
      );
    }

    const whereClause = and(...conditions);

    const [
      weeklyStatusBreakdown,
      weeklySkillBreakdown,
      autoExecutedResult,
      tokenUsageResult,
    ] = await Promise.all([
      db.select({
        status: agentPendingActions.status,
        cnt: count(),
      })
        .from(agentPendingActions)
        .where(whereClause)
        .groupBy(agentPendingActions.status),

      db.select({
        skillId: sql<string>`COALESCE((${agentPendingActions.metadata}->>'skillId')::text, 'legacy')`,
        cnt: count(),
      })
        .from(agentPendingActions)
        .where(whereClause)
        .groupBy(sql`COALESCE((${agentPendingActions.metadata}->>'skillId')::text, 'legacy')`),

      db.select({ cnt: count() })
        .from(aiAgentLogs)
        .where(
          and(
            gte(aiAgentLogs.createdAt, weekStart),
            eq(aiAgentLogs.status, "auto_executed")
          )
        ),

      db.select({
        totalTokens: sql<number>`COALESCE(SUM(${agentRuns.llmTokens}), 0)`,
        callCount: sql<number>`COUNT(*) FILTER (WHERE ${agentRuns.llmUsed} = true)`,
      })
        .from(agentRuns)
        .where(gte(agentRuns.createdAt, todayStart)),
    ]);

    const statusMap: Record<string, number> = {};
    let totalSuggestions = 0;
    for (const row of weeklyStatusBreakdown) {
      statusMap[row.status || "unknown"] = Number(row.cnt);
      totalSuggestions += Number(row.cnt);
    }

    const skillMap: Record<string, number> = {};
    for (const row of weeklySkillBreakdown) {
      skillMap[row.skillId] = Number(row.cnt);
    }

    const dailyTokenLimit = 10;
    const dailyTokensUsed = Number(tokenUsageResult[0]?.totalTokens ?? 0);
    const dailyCallCount = Number(tokenUsageResult[0]?.callCount ?? 0);

    res.json({
      period: "7d",
      totalSuggestions,
      approved: statusMap["approved"] || 0,
      rejected: statusMap["rejected"] || 0,
      pending: statusMap["pending"] || 0,
      completed: statusMap["completed"] || 0,
      expired: statusMap["expired"] || 0,
      autoExecuted: Number(autoExecutedResult[0]?.cnt ?? 0),
      skillBreakdown: skillMap,
      tokenUsage: {
        dailyUsed: dailyTokensUsed,
        dailyLimit: dailyTokenLimit,
        dailyCallCount,
      },
      quietHours: {
        start: "20:00",
        end: "07:00",
        timezone: "Europe/Istanbul",
      },
    });
  } catch (error: any) {
    console.error("Agent center stats error:", error);
    res.status(500).json({ message: "Agent merkezi istatistikleri alınamadı" });
  }
});

router.get("/api/agent/admin/stats", isAuthenticated, isHQOrAdmin, async (req: any, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalRunsResult,
      totalActionsResult,
      statusBreakdown,
      llmTokensResult,
      recentRuns,
      schedulerStatus
    ] = await Promise.all([
      db.select({ count: count() }).from(agentRuns)
        .where(gte(agentRuns.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(agentPendingActions)
        .where(gte(agentPendingActions.createdAt, thirtyDaysAgo)),
      db.select({
        status: agentPendingActions.status,
        count: count(),
      }).from(agentPendingActions)
        .where(gte(agentPendingActions.createdAt, thirtyDaysAgo))
        .groupBy(agentPendingActions.status),
      db.select({
        totalTokens: sql<number>`COALESCE(SUM(${agentRuns.llmTokens}), 0)`,
        llmCallCount: sql<number>`COUNT(*) FILTER (WHERE ${agentRuns.llmUsed} = true)`,
      }).from(agentRuns)
        .where(gte(agentRuns.createdAt, thirtyDaysAgo)),
      db.select().from(agentRuns)
        .orderBy(desc(agentRuns.createdAt))
        .limit(10),
      Promise.resolve(getSchedulerStatus()),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusBreakdown) {
      statusMap[row.status || "unknown"] = Number(row.count);
    }

    const approvalRate = (statusMap["approved"] || 0) + (statusMap["rejected"] || 0) > 0
      ? Math.round(((statusMap["approved"] || 0) / ((statusMap["approved"] || 0) + (statusMap["rejected"] || 0))) * 100)
      : 0;

    res.json({
      totalRuns: totalRunsResult[0]?.count ?? 0,
      totalActions: totalActionsResult[0]?.count ?? 0,
      statusBreakdown: statusMap,
      approvalRate,
      llmTokens: llmTokensResult[0]?.totalTokens ?? 0,
      llmCallCount: llmTokensResult[0]?.llmCallCount ?? 0,
      recentRuns,
      schedulerStatus,
      period: "30d",
    });
  } catch (error: any) {
    console.error("Agent admin stats error:", error);
    res.status(500).json({ message: "Agent istatistikleri alınamadı" });
  }
});

router.get("/api/admin/agent-routing-rules", isAuthenticated, isAdminCgoCeo, async (req: any, res) => {
  try {
    const rules = await db.select().from(agentRoutingRules).orderBy(agentRoutingRules.category, agentRoutingRules.subcategory);
    res.json(rules);
  } catch (error: any) {
    console.error("Get routing rules error:", error);
    res.status(500).json({ message: "Yönlendirme kuralları alınamadı" });
  }
});

router.patch("/api/admin/agent-routing-rules/:id", isAuthenticated, isAdminCgoCeo, async (req: any, res) => {
  try {
    const ruleId = Number(req.params.id);
    const { primaryRole, secondaryRole, escalationRole, escalationDays, isActive, notifyBranchSupervisor, sendHqSummary } = req.body;

    const updateData: Record<string, any> = {};
    if (primaryRole !== undefined) updateData.primaryRole = primaryRole;
    if (secondaryRole !== undefined) updateData.secondaryRole = secondaryRole;
    if (escalationRole !== undefined) updateData.escalationRole = escalationRole;
    if (escalationDays !== undefined) updateData.escalationDays = escalationDays;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notifyBranchSupervisor !== undefined) updateData.notifyBranchSupervisor = notifyBranchSupervisor;
    if (sendHqSummary !== undefined) updateData.sendHqSummary = sendHqSummary;

    await db.update(agentRoutingRules)
      .set(updateData)
      .where(eq(agentRoutingRules.id, ruleId));

    res.json({ message: "Kural güncellendi", ruleId });
  } catch (error: any) {
    console.error("Update routing rule error:", error);
    res.status(500).json({ message: "Kural güncellenemedi" });
  }
});

router.get("/api/agent/cgo-summary", isAuthenticated, isAdminCgoCeo, async (req: any, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [routingStats, escalatedActions, outcomeStats, strategicActions] = await Promise.all([
      db.execute(sql`
        SELECT 
          COALESCE(target_role_scope, 'unknown') as role,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM agent_pending_actions
        WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        AND category IS NOT NULL
        GROUP BY target_role_scope
        ORDER BY total DESC
      `),
      db.select()
        .from(agentPendingActions)
        .where(
          and(
            eq(agentPendingActions.status, "escalated"),
            gte(agentPendingActions.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(agentPendingActions.createdAt))
        .limit(20),
      db.execute(sql`
        SELECT 
          outcome,
          COUNT(*) as total
        FROM agent_action_outcomes
        WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        AND outcome IS NOT NULL
        GROUP BY outcome
      `),
      db.select()
        .from(agentPendingActions)
        .where(
          and(
            eq(agentPendingActions.category, "strategic"),
            eq(agentPendingActions.status, "pending"),
          )
        )
        .orderBy(desc(agentPendingActions.createdAt))
        .limit(10),
    ]);

    res.json({
      routingStats: routingStats.rows,
      escalatedActions,
      outcomeStats: outcomeStats.rows,
      strategicActions,
    });
  } catch (error: any) {
    console.error("CGO summary error:", error);
    res.status(500).json({ message: "CGO özeti alınamadı" });
  }
});

export function registerAgentRoutes(app: Express) {
  app.use(router);
}
