import { Router, type Express } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { 
  agentPendingActions, agentRuns, agentEscalationHistory, 
  agentActionOutcomes, agentRejectionPatterns, agentRoutingRules,
  users, notifications, aiAgentLogs, tasks, dobodyFlowTasks,
  guidanceDismissals, isHQRole, equipmentFaults, branches,
  shifts, branchShiftSessions, checklistCompletions, trainingAssignments,
} from "@shared/schema";
import { eq, desc, and, count, sql, gte, lte, or, inArray, ne, notInArray } from "drizzle-orm";
import { runAgentAnalysis } from "../services/agent-engine";
import { getEscalationHistory, resolveEscalation, getUnresolvedEscalations } from "../services/agent-escalation";
import { getSchedulerStatus } from "../services/agent-scheduler";
import { auditLog } from "../audit";

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

router.get("/api/agent/actions", isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Agent actions list error:", error);
    res.status(500).json({ message: "Agent önerileri alınamadı" });
  }
});

router.get("/api/agent/actions/summary", isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Agent summary error:", error);
    res.status(500).json({ message: "Agent özeti alınamadı" });
  }
});

router.post("/api/agent/actions/:id/approve", isAuthenticated, async (req, res) => {
  try {
    const actionId = parseInt(req.params.id);
    const user = req.user;

    const [action] = await db.select().from(agentPendingActions).where(eq(agentPendingActions.id, actionId));
    if (!action) return res.status(404).json({ message: "Öneri bulunamadı" });
    if (action.status !== "pending" && action.status !== "escalated") return res.status(400).json({ message: "Bu öneri zaten işlenmiş" });

    // Yetki kontrol sistemi:
    // 1. Admin/CEO/CGO — her şeyi onaylayabilir + zincir aksiyonları tetikler
    // 2. Coach/Trainer — kendi rolüne atanmış aksiyonları onaylayabilir (eğitim, checklist, uyum)
    // 3. Supervisor/Müdür — kendi şubesine ait aksiyonları onaylayabilir
    // 4. Hedef kullanıcı — kendine atanan reminders
    const adminRoles = ["admin", "ceo", "cgo"];
    const coachTrainerRoles = ["coach", "trainer"];
    const branchMgrRoles = ["mudur", "supervisor", "supervisor_buddy"];
    const isAdmin = adminRoles.includes(user.role);
    const isCoachTrainer = coachTrainerRoles.includes(user.role);
    const isBranchMgr = branchMgrRoles.includes(user.role);
    const isTargetUser = action.targetUserId && action.targetUserId === String(user.id);
    const isRoleScopeFallback = !action.targetUserId && action.targetRoleScope === user.role &&
      (action.branchId === null || action.branchId === user.branchId);
    const isEscalationTarget = action.status === "escalated" && action.escalationRole === user.role;
    // Coach/Trainer: eğitim, uyum, checklist ve kendi scope aksiyonlarını onaylayabilir
    const coachTrainerCanApprove = isCoachTrainer && (
      ["training_overdue", "critical_training_overdue", "no_training_assigned",
       "compliance_warning", "compliance_critical", "weekly_compliance_summary",
       "missing_checklist", "rotation_imbalance", "weekend_off_violation"].includes(action.metadata?.type || "") ||
      action.targetRoleScope === user.role
    );
    // Şube yöneticisi: kendi şubesine ait aksiyonları onaylayabilir
    const branchMgrCanApprove = isBranchMgr && action.branchId === user.branchId;

    if (!isAdmin && !isTargetUser && !isRoleScopeFallback && !isEscalationTarget && !coachTrainerCanApprove && !branchMgrCanApprove) {
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

    // Aksiyon tipine göre otomatik eylem
    if (!chainResult.notificationSent) {
      const meta2 = action.metadata as Record<string, any> || {};
      const actionType2 = meta2.type || action.actionType;
      const branchMgrUsers = action.branchId ? await db.select({ id: users.id })
        .from(users).where(and(eq(users.branchId, action.branchId as number), inArray(users.role, ["mudur", "supervisor"]), eq(users.isActive, true))).limit(1) : [];

      // Eğitim aksiyonları
      if (["critical_training_overdue", "training_overdue", "no_training_assigned"].includes(actionType2)) {
        const target = action.targetUserId || branchMgrUsers[0]?.id;
        if (target) {
          await storage.createNotification({ userId: target, type: "training_action", title: action.title, message: action.description || "", link: "/akademi" });
          chainResult.notificationSent = true;
        }
      }
      // Vardiya düzeltme önerisi
      else if (["weekend_off_violation", "peak_understaffed", "rotation_imbalance", "week_not_planned"].includes(actionType2)) {
        const target = action.targetUserId || branchMgrUsers[0]?.id;
        if (target) {
          await storage.createNotification({ userId: target, type: "shift_fix_suggestion", title: `Vardiya Düzeltme Önerisi: ${action.title}`, message: action.description || "", link: "/vardiya-planlama" });
          chainResult.notificationSent = true;
          // Görev de oluştur
          const due = new Date(); due.setDate(due.getDate() + 2);
          await db.insert(tasks).values({ description: `${action.title}: ${action.description || ""}`, branchId: action.branchId as number, assignedToId: target, assignedById: String(user.id), status: "beklemede", priority: "yüksek", dueDate: due, autoGenerated: true }).catch(() => {});
          chainResult.taskCreated = true;
        }
      }
      // Uyum ve SLA aksiyonları
      else if (["compliance_critical", "compliance_warning", "sla_breached"].includes(actionType2)) {
        const target = action.targetUserId || branchMgrUsers[0]?.id;
        if (target) {
          await storage.createNotification({ userId: target, type: "compliance_action", title: action.title, message: action.description || "", link: "/sube-uyum-merkezi" });
          chainResult.notificationSent = true;
        }
      }
      // Standart remind/alert
      else if (action.actionType === "remind" && action.targetUserId) {
        await storage.createNotification({ userId: action.targetUserId, type: "agent_reminder", title: action.title, message: action.description || "", link: action.deepLink || undefined });
        chainResult.notificationSent = true;
      } else if (action.actionType === "alert" && action.targetUserId) {
        await storage.createNotification({ userId: action.targetUserId, type: "agent_alert", title: action.title, message: action.description || "", link: action.deepLink || undefined });
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

    await auditLog(req, {
      eventType: "agent_action_approve",
      action: "approve",
      resource: "agent_pending_actions",
      resourceId: String(actionId),
      details: { title: action.title, category: action.category, targetUserId: action.targetUserId },
    });

    res.json({ 
      message: "Öneri onaylandı", 
      actionId,
      ...chainResult,
    });
  } catch (error: unknown) {
    console.error("Agent approve error:", error);
    res.status(500).json({ message: "Onaylama hatası" });
  }
});

router.post("/api/agent/actions/:id/reject", isAuthenticated, async (req, res) => {
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

    await auditLog(req, {
      eventType: "agent_action_reject",
      action: "reject",
      resource: "agent_pending_actions",
      resourceId: String(actionId),
      details: { title: action.title, category: action.category, targetUserId: action.targetUserId, reason: reason || null },
    });

    res.json({ message: "Öneri reddedildi", actionId });
  } catch (error: unknown) {
    console.error("Agent reject error:", error);
    res.status(500).json({ message: "Reddetme hatası" });
  }
});

router.post("/api/agent/run-now", isAuthenticated, isHQOrAdmin, async (req, res) => {
  try {
    const user = req.user;
    const result = await runAgentAnalysis(String(user.id), "daily_analysis", "manual");
    res.json({
      message: "Agent analizi tamamlandı",
      actionsGenerated: result.actionsCreated,
      runId: result.run?.id ?? null,
    });
  } catch (error: unknown) {
    console.error("Agent run-now error:", error);
    res.status(500).json({ message: "Agent analizi çalıştırılamadı" });
  }
});

router.get("/api/agent/escalations", isAuthenticated, isHQOrAdmin, async (req, res) => {
  try {
    const unresolved = await getUnresolvedEscalations();
    res.json({ data: unresolved });
  } catch (error: unknown) {
    console.error("Agent escalations error:", error);
    res.status(500).json({ message: "Escalation listesi alınamadı" });
  }
});

router.get("/api/agent/escalations/:actionId", isAuthenticated, async (req, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    const history = await getEscalationHistory(actionId);
    res.json({ data: history });
  } catch (error: unknown) {
    console.error("Escalation history error:", error);
    res.status(500).json({ message: "Escalation geçmişi alınamadı" });
  }
});

router.post("/api/agent/escalations/:actionId/resolve", isAuthenticated, isHQOrAdmin, async (req, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    const { resolution } = req.body;
    await resolveEscalation(actionId, resolution || "Manuel olarak çözüldü");
    res.json({ message: "Escalation çözüldü" });
  } catch (error: unknown) {
    console.error("Resolve escalation error:", error);
    res.status(500).json({ message: "Escalation çözülemedi" });
  }
});

router.get("/api/agent-center/stats", isAuthenticated, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Agent center stats error:", error);
    res.status(500).json({ message: "Agent merkezi istatistikleri alınamadı" });
  }
});

router.get("/api/agent/admin/stats", isAuthenticated, isHQOrAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Agent admin stats error:", error);
    res.status(500).json({ message: "Agent istatistikleri alınamadı" });
  }
});

router.get("/api/admin/agent-routing-rules", isAuthenticated, isAdminCgoCeo, async (req, res) => {
  try {
    const rules = await db.select().from(agentRoutingRules).orderBy(agentRoutingRules.category, agentRoutingRules.subcategory);
    res.json(rules);
  } catch (error: unknown) {
    console.error("Get routing rules error:", error);
    res.status(500).json({ message: "Yönlendirme kuralları alınamadı" });
  }
});

router.patch("/api/admin/agent-routing-rules/:id", isAuthenticated, isAdminCgoCeo, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("Update routing rule error:", error);
    res.status(500).json({ message: "Kural güncellenemedi" });
  }
});

router.get("/api/agent/cgo-summary", isAuthenticated, isAdminCgoCeo, async (req, res) => {
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
  } catch (error: unknown) {
    console.error("CGO summary error:", error);
    res.status(500).json({ message: "CGO özeti alınamadı" });
  }
});

router.get("/api/agent/test-skill/:skillId", isAuthenticated, async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  try {
    const { ensureSkillsLoaded, SKILL_REGISTRY } = await import("../agent/skills/skill-registry");
    await ensureSkillsLoaded();
    const skill = SKILL_REGISTRY.find((s) => s.id === req.params.skillId);
    if (!skill) return res.status(404).json({ error: "Skill bulunamadı" });

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const context = { userId: user.id, role: user.role, timeRange: { start: dayStart, end: now } };

    const insights = await skill.analyze(context);
    const actions = skill.generateActions(insights, context);

    res.json({ skillId: skill.id, insightCount: insights.length, actionCount: actions.length, insights, actions });
  } catch (error: unknown) {
    console.error("Test skill error:", error);
    res.status(500).json({ error: error.message });
  }
});

let cachedGaps: any[] | null = null;
let cachedGapsAt = 0;
const GAP_CACHE_TTL = 3 * 60 * 1000;

async function getCachedGaps() {
  if (cachedGaps && Date.now() - cachedGapsAt < GAP_CACHE_TTL) return cachedGaps;
  const { detectSystemGaps } = await import("../services/system-completeness-service");
  cachedGaps = await detectSystemGaps();
  cachedGapsAt = Date.now();
  return cachedGaps;
}

async function getOperationalAlerts(userId: string, userRole: string, userBranchId: number | null): Promise<any[]> {
  const alerts: any[] = [];
  const isHQ = isHQRole(userRole);
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Open equipment faults
    const faultConditions = [ne(equipmentFaults.status, 'cozuldu')];
    if (!isHQ && userBranchId) {
      faultConditions.push(eq(equipmentFaults.branchId, userBranchId));
    }
    const openFaults = await db.select({ cnt: sql<number>`count(*)` })
      .from(equipmentFaults)
      .where(and(...faultConditions));
    const faultCount = Number(openFaults[0]?.cnt || 0);
    
    if (faultCount > 0) {
      alerts.push({
        id: `ops-faults-${userBranchId || 'all'}-${today}`,
        category: 'operational',
        severity: faultCount >= 5 ? 'critical' : faultCount >= 2 ? 'high' : 'medium',
        title: `${faultCount} açık ekipman arızası var`,
        description: `${faultCount} ekipman arızası çözüm bekliyor. Hemen kontrol edin.`,
        deepLink: '/ariza',
        targetRoles: ['admin', 'supervisor', 'mudur', 'coach', 'ceo', 'cgo'],
        targetBranchId: userBranchId,
        autoResolvable: false,
        checkFn: 'ops-equipment-faults',
      });
    }

    // Overdue/due today tasks
    const taskConditions = [
      sql`${tasks.status} IN ('pending', 'in_progress')`,
      sql`${tasks.dueDate} <= ${today}`,
    ];
    if (!isHQ && userBranchId) {
      taskConditions.push(eq(tasks.branchId, userBranchId));
    }
    const dueTasks = await db.select({ cnt: sql<number>`count(*)` })
      .from(tasks)
      .where(and(...taskConditions));
    const dueCount = Number(dueTasks[0]?.cnt || 0);

    if (dueCount > 0) {
      alerts.push({
        id: `ops-tasks-due-${userBranchId || 'all'}-${today}`,
        category: 'operational',
        severity: dueCount >= 5 ? 'high' : 'medium',
        title: `${dueCount} görevin deadline'ı geçti veya bugün`,
        description: `${dueCount} görev acil ilgi bekliyor.`,
        deepLink: '/gorevler',
        targetRoles: ['admin', 'supervisor', 'mudur', 'coach'],
        targetBranchId: userBranchId,
        autoResolvable: false,
        checkFn: 'ops-overdue-tasks',
      });
    }

    // Pending leave requests (for supervisors/managers)
    if (['supervisor', 'mudur', 'admin', 'muhasebe_ik'].includes(userRole)) {
      const pendingLeaves = await db.execute(sql`
        SELECT count(*) as cnt FROM leave_requests WHERE status = 'pending'
        ${userBranchId && !isHQ ? sql`AND user_id IN (SELECT id FROM users WHERE branch_id = ${userBranchId})` : sql``}
      `);
      const leaveCount = Number((pendingLeaves.rows as any[])?.[0]?.cnt || 0);
      if (leaveCount > 0) {
        alerts.push({
          id: `ops-leaves-pending-${userBranchId || 'all'}-${today}`,
          category: 'operational',
          severity: leaveCount >= 3 ? 'medium' : 'low',
          title: `${leaveCount} bekleyen izin talebi`,
          description: `${leaveCount} izin talebi onay bekliyor.`,
          deepLink: '/izin-talepleri',
          targetRoles: ['admin', 'supervisor', 'mudur', 'muhasebe_ik'],
          targetBranchId: userBranchId,
          autoResolvable: false,
          checkFn: 'ops-pending-leaves',
        });
      }
    }
  } catch (err) {
    console.error("[Guidance] Operational alerts error:", err);
  }
  
  return alerts;
}

router.get("/api/agent/guidance", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const allGaps = await getCachedGaps();
    
    // BUG1 FIX: Also fetch operational alerts
    const opsAlerts = await getOperationalAlerts(user.id, user.role, user.branchId);
    const combined = [...allGaps, ...opsAlerts];

    const dismissals = await db.select().from(guidanceDismissals).where(eq(guidanceDismissals.userId, user.id));
    const dismissedIds = new Set(dismissals.map((d) => d.guidanceId));

    const isHQ = isHQRole(user.role);
    const myGuidance = combined.filter(gap => {
      if (dismissedIds.has(gap.id)) return false;
      if (!gap.targetRoles.includes(user.role)) return false;
      if (gap.targetBranchId) {
        if (!isHQ) {
          if (!user.branchId || gap.targetBranchId !== user.branchId) return false;
        }
      }
      return true;
    });

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    myGuidance.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    const grouped = {
      critical: myGuidance.filter(g => g.severity === "critical"),
      high: myGuidance.filter(g => g.severity === "high"),
      medium: myGuidance.filter(g => g.severity === "medium"),
      low: myGuidance.filter(g => g.severity === "low"),
    };

    // Şube sağlık skoru ekleme (HQ rolleri için)
    let healthSummary = null;
    let patterns: any[] = [];
    if (isHQ) {
      try {
        const { getAllBranchHealthScores, detectPatterns } = await import("../services/branch-health-score");
        const scores = await getAllBranchHealthScores();
        patterns = await detectPatterns(scores);
        healthSummary = {
          average: scores.average,
          healthyCount: scores.healthyCount,
          warningCount: scores.warningCount,
          criticalCount: scores.criticalCount,
          worstBranches: scores.branches.slice(0, 3).map(b => ({
            name: b.branchName,
            score: b.overallScore,
            status: b.status,
          })),
        };
      } catch (e) {
        console.error("[Guidance] Health score error:", e);
      }
    }

    res.json({
      totalGaps: myGuidance.length,
      criticalCount: grouped.critical.length,
      items: myGuidance,
      grouped,
      healthSummary,
      patterns,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Guidance] Error:", error);
    res.json({ totalGaps: 0, items: [], grouped: { critical: [], high: [], medium: [], low: [] } });
  }
});

router.post("/api/agent/guidance/:id/dismiss", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const guidanceId = req.params.id;
    await db.insert(guidanceDismissals).values({
      userId: user.id,
      guidanceId,
    }).onConflictDoUpdate({
      target: [guidanceDismissals.userId, guidanceDismissals.guidanceId],
      set: { dismissedAt: new Date() },
    });
    res.json({ dismissed: true });
  } catch (error) {
    console.error("[Guidance] Dismiss error:", error);
    res.status(500).json({ error: "Dismiss failed" });
  }
});

// ═══════════════════════════════════════════
// BRANCH HEALTH SCORE ENDPOINTS
// ═══════════════════════════════════════════

router.get("/api/agent/branch-health", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { getAllBranchHealthScores, detectPatterns } = await import("../services/branch-health-score");

    const scores = await getAllBranchHealthScores();
    const patterns = await detectPatterns(scores);

    // Rol bazlı filtreleme
    const isHQ = isHQRole(user.role);
    let filteredBranches = scores.branches;

    if (!isHQ && user.branchId) {
      // Şube rolleri sadece kendi şubesini görür
      filteredBranches = scores.branches.filter(b => b.branchId === user.branchId);
    }

    res.json({
      branches: filteredBranches,
      average: scores.average,
      healthyCount: scores.healthyCount,
      warningCount: scores.warningCount,
      criticalCount: scores.criticalCount,
      patterns: isHQ ? patterns : [], // Pattern'ler sadece HQ'ya gösterilir
      calculatedAt: scores.calculatedAt,
    });
  } catch (error) {
    console.error("[BranchHealth] Error:", error);
    res.json({ branches: [], average: 0, healthyCount: 0, warningCount: 0, criticalCount: 0, patterns: [] });
  }
});

router.get("/api/agent/branch-health/:branchId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ error: "Geçersiz şube ID" });

    // Scope kontrolü
    if (!isHQRole(user.role) && user.branchId !== branchId) {
      return res.status(403).json({ error: "Bu şubeye erişim yetkiniz yok" });
    }

    const { calculateBranchHealthScore } = await import("../services/branch-health-score");

    // Şube adını bul
    const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
    if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });

    const score = await calculateBranchHealthScore(branchId, branch.name);
    res.json(score);
  } catch (error) {
    console.error("[BranchHealth] Single branch error:", error);
    res.status(500).json({ error: "Sağlık skoru hesaplanamadı" });
  }
});

export function registerAgentRoutes(app: Express) {
  app.use(router);
}

// GET /api/agent/compliance-overview — Tüm şubelerin uyum özeti (coach/trainer/cgo için)
router.get("/api/agent/compliance-overview", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const allowedRoles = ["admin", "ceo", "cgo", "coach", "trainer", "mudur", "supervisor"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Uyum özeti görüntüleme yetkiniz yok" });
    }

    const { branchId, period = "week" } = req.query;
    const now = new Date();
    const periodDays = period === "month" ? 30 : 7;
    const since = new Date(now.getTime() - periodDays * 864e5);
    const sinceStr = since.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];

    // Şube filtresi
    const targetBranchId = branchId ? parseInt(String(branchId)) : null;
    const isBranchRole = ["mudur", "supervisor", "supervisor_buddy"].includes(user.role);
    const effectiveBranchId = isBranchRole ? user.branchId : targetBranchId;

    const branchFilter = effectiveBranchId ? eq(branches.id, effectiveBranchId) : eq(branches.isActive, true);
    const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches).where(branchFilter);

    const results = await Promise.all(allBranches.slice(0, 20).map(async (branch) => {
      const [shiftStats, sessionStats, checkStats, faultStats, trainingStats] = await Promise.all([
        // Planlanan vardiya
        db.select({ cnt: sql<number>`count(*)::int` }).from(shifts)
          .where(and(eq(shifts.branchId, branch.id), gte(shifts.shiftDate, sinceStr), lte(shifts.shiftDate, todayStr), notInArray(shifts.status, ["cancelled"]))),
        // Gerçekleşen kiosk giriş
        db.select({ cnt: sql<number>`count(*)::int` }).from(branchShiftSessions)
          .where(and(eq(branchShiftSessions.branchId, branch.id), gte(branchShiftSessions.checkInTime, since))),
        // Checklist tamamlama
        db.select({
          total: sql<number>`count(*)::int`,
          done: sql<number>`count(*) filter (where status = 'completed')::int`,
        }).from(checklistCompletions).where(and(eq(checklistCompletions.branchId, branch.id), gte(checklistCompletions.createdAt, since))),
        // Açık arıza
        db.select({ cnt: sql<number>`count(*)::int` }).from(equipmentFaults)
          .where(and(eq(equipmentFaults.branchId, branch.id), notInArray(equipmentFaults.status, ["resolved", "closed", "cozuldu"]))),
        // Gecikmiş eğitim
        db.select({ cnt: sql<number>`count(*)::int` }).from(trainingAssignments)
          .leftJoin(users, eq(trainingAssignments.userId, users.id))
          .where(and(eq(users.branchId, branch.id), notInArray(trainingAssignments.status, ["completed", "expired"]))),
      ]);

      const planned = shiftStats[0]?.cnt || 0;
      const actual = sessionStats[0]?.cnt || 0;
      const totalCL = checkStats[0]?.total || 0;
      const doneCL = checkStats[0]?.done || 0;
      const openFaults = faultStats[0]?.cnt || 0;
      const overdueTraining = trainingStats[0]?.cnt || 0;

      const shiftScore = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 50;
      const checkScore = totalCL > 0 ? Math.round((doneCL / totalCL) * 100) : 50;
      const faultScore = Math.max(0, 100 - openFaults * 8);
      const trainingScore = Math.max(0, 100 - overdueTraining * 10);
      const overallScore = Math.round((shiftScore * 0.3 + checkScore * 0.3 + faultScore * 0.2 + trainingScore * 0.2));

      return {
        branchId: branch.id,
        branchName: branch.name,
        period: period as string,
        scores: {
          shift: shiftScore,
          checklist: checkScore,
          fault: faultScore,
          training: trainingScore,
          overall: overallScore,
        },
        raw: { planned, actual, totalCL, doneCL, openFaults, overdueTraining },
        status: overallScore >= 80 ? "healthy" : overallScore >= 60 ? "warning" : "critical",
      };
    }));

    const sorted = results.sort((a, b) => a.scores.overall - b.scores.overall);
    const avgScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.scores.overall, 0) / results.length)
      : 0;

    res.json({
      branches: sorted,
      summary: {
        avgScore,
        critical: sorted.filter(r => r.status === "critical").length,
        warning: sorted.filter(r => r.status === "warning").length,
        healthy: sorted.filter(r => r.status === "healthy").length,
        total: sorted.length,
        period: period as string,
        calculatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[ComplianceOverview] error:", error);
    res.status(500).json({ error: "Uyum özeti alınamadı" });
  }
});
