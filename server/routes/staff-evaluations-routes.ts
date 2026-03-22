import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuth";
import { type UserRoleType } from "../permission-service";
import { eq, desc, and, gte, lte, sql, inArray, not, count, sum, avg, max } from "drizzle-orm";
import { z } from "zod";
import {
  branches,
  users,
  tasks,
  equipment,
  equipmentFaults,
  equipmentServiceRequests,
  checklistCompletions,
  shifts,
  messages,
  qualityAudits,
  disciplinaryReports,
  leaveRequests,
  employeeSalaries,
  employeePerformanceScores,
  staffEvaluations,
  productComplaints,
  productionBatches,
  purchaseOrders,
  trainingCompletions,
  isHQRole,
  type UserRoleType as SchemaUserRoleType,
} from "@shared/schema";

const router = Router();

  // ========================================
  // STAFF EVALUATIONS & PERFORMANCE SUMMARY
  // ========================================

  // GET /api/personnel/:id/performance-summary
  router.get('/api/personnel/:id/performance-summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;

      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      // 1. Attendance from performance scores
      const perfScores = await db.select({
        avgAttendance: avg(employeePerformanceScores.attendanceScore),
        avgChecklist: avg(employeePerformanceScores.checklistScore),
        avgDaily: avg(employeePerformanceScores.dailyTotalScore),
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      // 2. Task completion rate
      const taskStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
      }).from(tasks)
        .where(eq(tasks.assignedToId, targetId));

      // 3. Checklist completion
      const checklistStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${checklistCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(checklistCompletions)
        .where(eq(checklistCompletions.userId, targetId));

      // 4. Training progress
      const trainingStats = await db.select({
        total: count(),
        completed: sql`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(trainingCompletions)
        .where(eq(trainingCompletions.userId, targetId));

      // 5. Role-specific KPI calculation
      const targetUser = await storage.getUserById(targetId);
      const targetRole = (targetUser?.role || 'barista') as UserRoleType;
      const targetIsHQ = isHQRole(targetRole);

      let roleKpi = 0;
      let roleKpiLabel = "Denetim Puanı";

      if (targetRole === 'fabrika' || targetRole === 'fabrika_mudur') {
        roleKpiLabel = "Zayi/Fire Oranı";
        try {
          const batchStats = await db.select({
            total: count(),
            rejected: sql`COUNT(CASE WHEN ${productionBatches.status} = 'rejected' THEN 1 END)`,
          }).from(productionBatches);
          const bTotal = Number(batchStats[0]?.total || 0);
          const bRejected = Number(batchStats[0]?.rejected || 0);
          roleKpi = bTotal > 0 ? Math.max(0, 100 - (bRejected / bTotal) * 100) : 80;
        } catch (error: unknown) { roleKpi = 80; }

      } else if (targetRole === 'satinalma') {
        roleKpiLabel = "Tedarik Performansı";
        try {
          const poStats = await db.select({
            total: count(),
            onTime: sql`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate} THEN 1 END)`,
            delivered: sql`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL THEN 1 END)`,
          }).from(purchaseOrders);
          const poTotal = Number(poStats[0]?.delivered || 0);
          const poOnTime = Number(poStats[0]?.onTime || 0);
          roleKpi = poTotal > 0 ? (poOnTime / poTotal) * 100 : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'trainer') {
        roleKpiLabel = "Eğitim Etkinliği";
        try {
          const trAllStats = await db.select({
            total: count(),
            completed: sql`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
          }).from(trainingCompletions);
          const trAllTotal = Number(trAllStats[0]?.total || 0);
          const trAllCompleted = Number(trAllStats[0]?.completed || 0);
          const completionRate = trAllTotal > 0 ? (trAllCompleted / trAllTotal) * 100 : 75;
          const complaintStats = await db.select({ total: count() }).from(productComplaints)
            .where(eq(productComplaints.complaintType, 'taste'));
          const recipeErrors = Number(complaintStats[0]?.total || 0);
          const errorPenalty = Math.min(recipeErrors * 2, 30);
          roleKpi = Math.max(0, completionRate - errorPenalty);
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'coach') {
        roleKpiLabel = "Şube Gelişim Skoru";
        try {
          const auditAvg = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits);
          roleKpi = auditAvg[0]?.avgScore ? Number(auditAvg[0].avgScore) : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'kalite_kontrol') {
        roleKpiLabel = "Kalite Uyum Oranı";
        try {
          const compStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${productComplaints.status} = 'resolved' THEN 1 END)`,
          }).from(productComplaints);
          const cTotal = Number(compStats[0]?.total || 0);
          const cResolved = Number(compStats[0]?.resolved || 0);
          roleKpi = cTotal > 0 ? (cResolved / cTotal) * 100 : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'muhasebe' || targetRole === 'muhasebe_ik') {
        roleKpiLabel = "Raporlama Performansı";
        try {
          const muhasebeTaskStats = await db.select({
            total: count(),
            completed: sql`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
          }).from(tasks).where(eq(tasks.assignedToId, targetId));
          const mTotal = Number(muhasebeTaskStats[0]?.total || 0);
          const mCompleted = Number(muhasebeTaskStats[0]?.completed || 0);
          roleKpi = mTotal > 0 ? (mCompleted / mTotal) * 100 : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'teknik') {
        roleKpiLabel = "Arıza Çözüm Performansı";
        try {
          const faultStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${equipmentFaults.status} = 'cozuldu' THEN 1 END)`,
          }).from(equipmentFaults);
          const fTotal = Number(faultStats[0]?.total || 0);
          const fResolved = Number(faultStats[0]?.resolved || 0);
          roleKpi = fTotal > 0 ? (fResolved / fTotal) * 100 : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'destek') {
        roleKpiLabel = "Destek Çözüm Oranı";
        try {
          const supportStats = await db.select({
            total: count(),
            resolved: sql`COUNT(CASE WHEN ${equipmentServiceRequests.status} = 'completed' OR ${equipmentServiceRequests.status} = 'resolved' THEN 1 END)`,
          }).from(equipmentServiceRequests);
          const sTotal = Number(supportStats[0]?.total || 0);
          const sResolved = Number(supportStats[0]?.resolved || 0);
          roleKpi = sTotal > 0 ? (sResolved / sTotal) * 100 : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else if (targetRole === 'admin' || targetRole === 'ceo' || targetRole === 'cgo' || targetRole === 'yatirimci_hq' || targetRole === 'marketing') {
        roleKpiLabel = "Operasyonel Skor";
        try {
          const branchAvg = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits);
          roleKpi = branchAvg[0]?.avgScore ? Number(branchAvg[0].avgScore) : 75;
        } catch (error: unknown) { roleKpi = 75; }

      } else {
        roleKpiLabel = "Denetim Puanı";
        if (targetUser?.branchId) {
          try {
            const auditScores = await db.select({ avgScore: avg(qualityAudits.percentageScore) }).from(qualityAudits)
              .where(eq(qualityAudits.branchId, targetUser.branchId));
            roleKpi = auditScores[0]?.avgScore ? Number(auditScores[0].avgScore) : 0;
          } catch (error: unknown) { roleKpi = 0; }
        }
      }

      // 6. Staff evaluation scores
      const evalScores = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, targetId));

      const attendanceRate = perfScores[0]?.avgAttendance ? Number(perfScores[0].avgAttendance) : 0;
      const taskTotal = Number(taskStats[0]?.total || 0);
      const taskCompleted = Number(taskStats[0]?.completed || 0);
      const taskCompletionRate = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

      const clTotal = Number(checklistStats[0]?.total || 0);
      const clCompleted = Number(checklistStats[0]?.completed || 0);
      const checklistScore = clTotal > 0 ? (clCompleted / clTotal) * 100 : 0;

      const trTotal = Number(trainingStats[0]?.total || 0);
      const trCompleted = Number(trainingStats[0]?.completed || 0);
      const trainingProgress = trTotal > 0 ? (trCompleted / trTotal) * 100 : 0;

      const evaluationScore = evalScores[0]?.avgScore ? Number(evalScores[0].avgScore) : 0;

      const genelSkor = targetIsHQ
        ? (trainingProgress * 0.30 + roleKpi * 0.35 + evaluationScore * 0.35)
        : (attendanceRate * 0.15 + taskCompletionRate * 0.20 + checklistScore * 0.20 + trainingProgress * 0.10 + roleKpi * 0.15 + evaluationScore * 0.20);

      const hiddenMetrics = targetIsHQ
        ? ['attendanceRate', 'taskCompletion', 'checklistScore']
        : [];

      res.json({
        overallScore: Math.round(genelSkor * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        taskCompletion: Math.round(taskCompletionRate * 10) / 10,
        checklistScore: Math.round(checklistScore * 10) / 10,
        trainingProgress: Math.round(trainingProgress * 10) / 10,
        inspectionScore: Math.round(roleKpi * 10) / 10,
        roleKpi: Math.round(roleKpi * 10) / 10,
        roleKpiLabel,
        evaluationScore: Math.round(evaluationScore * 10) / 10,
        isHQ: targetIsHQ,
        hiddenMetrics,
      });
    } catch (error: unknown) {
      console.error("Error fetching performance summary:", error);
      res.status(500).json({ message: "Performans özeti alınırken hata oluştu" });
    }
  });

  // POST /api/staff-evaluations
  router.post('/api/staff-evaluations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const allowedRoles = ['coach', 'admin', 'supervisor', 'yatirimci_hq'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Değerlendirme oluşturma yetkiniz yok" });
      }

      const body = req.body;
      const criteria = ['customerBehavior', 'friendliness', 'knowledgeExperience', 'dressCode', 'cleanliness', 'teamwork', 'punctuality', 'initiative'];
      for (const c of criteria) {
        const val = Number(body[c]);
        if (!Number.isInteger(val) || val < 1 || val > 5) {
          return res.status(400).json({ message: `${c} 1-5 arasında olmalıdır` });
        }
      }

      // Suistimal korumasi: 24 saat kurali
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentEval] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, body.employeeId),
          gte(staffEvaluations.createdAt, twentyFourHoursAgo)
        ));
      if (recentEval && recentEval.cnt > 0) {
        return res.status(429).json({ message: "Bu personeli son 24 saat içinde zaten değerlendirdiniz. Lütfen yarın tekrar deneyin." });
      }

      // Suistimal korumasi: Ayda max 2 degerlendirme
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const [monthlyCount] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, body.employeeId),
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd)
        ));
      if (monthlyCount && monthlyCount.cnt >= 2) {
        return res.status(429).json({ message: "Bu personel için bu ay maksimum 2 değerlendirme yapabilirsiniz." });
      }

      const avgCriteria = criteria.reduce((sum, c) => sum + Number(body[c]), 0) / criteria.length;
      const overallScore = (avgCriteria / 5) * 100;

      const evalData = {
        employeeId: body.employeeId,
        evaluatorId: user.id,
        evaluatorRole: user.role,
        branchId: body.branchId || user.branchId || null,
        inspectionId: body.inspectionId || null,
        customerBehavior: Number(body.customerBehavior),
        friendliness: Number(body.friendliness),
        knowledgeExperience: Number(body.knowledgeExperience),
        dressCode: Number(body.dressCode),
        cleanliness: Number(body.cleanliness),
        teamwork: Number(body.teamwork),
        punctuality: Number(body.punctuality),
        initiative: Number(body.initiative),
        overallScore,
        notes: body.notes || null,
        evaluationType: body.evaluationType || 'standard',
      };

      const [result] = await db.insert(staffEvaluations).values(evalData).returning();
      res.status(201).json(result);
    } catch (error: unknown) {
      console.error("Error creating staff evaluation:", error);
      res.status(500).json({ message: "Değerlendirme oluşturulamadı" });
    }
  });

  // GET /api/evaluation-coverage - Sube bazli degerlendirme kapsam istatistigi (HQ/CEO)
  router.get('/api/evaluation-coverage', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!isHQRole(user.role as any)) {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const allBranches = await db.select({
        id: branches.id,
        name: branches.name,
      }).from(branches).where(eq(branches.isActive, true));

      const branchStats = [];
      let totalEmployees = 0;
      let totalEvaluated = 0;

      for (const branch of allBranches) {
        const branchEmps = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.branchId, branch.id),
            eq(users.isActive, true)
          ));

        if (branchEmps.length === 0) continue;

        const empIds = branchEmps.map(e => e.id);
        const evaluatedEmps = await db.selectDistinct({ employeeId: staffEvaluations.employeeId })
          .from(staffEvaluations)
          .where(and(
            gte(staffEvaluations.createdAt, monthStart),
            lte(staffEvaluations.createdAt, monthEnd),
            inArray(staffEvaluations.employeeId, empIds)
          ));

        const evaluatedCount = evaluatedEmps.length;
        const empCount = branchEmps.length;
        totalEmployees += empCount;
        totalEvaluated += evaluatedCount;

        branchStats.push({
          branchId: branch.id,
          branchName: branch.name,
          totalEmployees: empCount,
          evaluatedCount,
          notEvaluatedCount: empCount - evaluatedCount,
          percentage: Math.round((evaluatedCount / empCount) * 100),
        });
      }

      branchStats.sort((a, b) => a.percentage - b.percentage);

      res.json({
        branches: branchStats,
        summary: {
          totalBranches: branchStats.length,
          totalEmployees,
          totalEvaluated,
          totalNotEvaluated: totalEmployees - totalEvaluated,
          overallPercentage: totalEmployees > 0 ? Math.round((totalEvaluated / totalEmployees) * 100) : 0,
          daysLeft,
          month: now.toISOString().slice(0, 7),
        },
      });
    } catch (error: unknown) {
      console.error("Evaluation coverage error:", error);
      res.status(500).json({ message: "Değerlendirme kapsam bilgisi alınamadı" });
    }
  });

  // GET /api/evaluation-status - Bu aydaki degerlendirme durumu (supervisor icin)
  router.get('/api/evaluation-status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (!['supervisor', 'admin', 'yatirimci_hq', 'operasyon_muduru', 'bolgeMuduru', 'coach'].includes(user.role)) {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const branchId = user.role === 'supervisor' ? user.branchId : (req.query.branchId ? parseInt(req.query.branchId as string) : null);
      if (!branchId) {
        return res.json({ evaluated: [], notEvaluated: [], summary: { total: 0, evaluated: 0, notEvaluated: 0, percentage: 0 } });
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const branchEmployees = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
      }).from(users)
        .where(and(
          eq(users.branchId, branchId),
          eq(users.isActive, true),
          not(eq(users.id, user.id))
        ));

      const thisMonthEvals = await db.select({
        employeeId: staffEvaluations.employeeId,
        evalCount: count(),
        lastEvalDate: max(staffEvaluations.createdAt),
      }).from(staffEvaluations)
        .where(and(
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd),
          eq(staffEvaluations.evaluatorId, user.id)
        ))
        .groupBy(staffEvaluations.employeeId);

      const evalMap = new Map(thisMonthEvals.map(e => [e.employeeId, { count: Number(e.evalCount), lastDate: e.lastEvalDate }]));

      const evaluated: any[] = [];
      const notEvaluated: any[] = [];

      for (const emp of branchEmployees) {
        const evalInfo = evalMap.get(emp.id);
        if (evalInfo && evalInfo.count > 0) {
          evaluated.push({ ...emp, evalCount: evalInfo.count, lastEvalDate: evalInfo.lastDate });
        } else {
          notEvaluated.push(emp);
        }
      }

      res.json({
        evaluated,
        notEvaluated,
        summary: {
          total: branchEmployees.length,
          evaluated: evaluated.length,
          notEvaluated: notEvaluated.length,
          percentage: branchEmployees.length > 0 ? Math.round((evaluated.length / branchEmployees.length) * 100) : 0,
          daysLeft,
        },
      });
    } catch (error: unknown) {
      console.error("Evaluation status error:", error);
      res.status(500).json({ message: "Değerlendirme durumu alınamadı" });
    }
  });

  // GET /api/staff-evaluations/:employeeId/limit-status - Değerlendirme limit durumu
  router.get('/api/staff-evaluations/:employeeId/limit-status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const employeeId = req.params.employeeId;
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const [monthlyResult] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId),
          gte(staffEvaluations.createdAt, monthStart),
          lte(staffEvaluations.createdAt, monthEnd)
        ));
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentResult] = await db.select({ cnt: count() })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId),
          gte(staffEvaluations.createdAt, twentyFourHoursAgo)
        ));
      
      const [lastEval] = await db.select({ createdAt: staffEvaluations.createdAt })
        .from(staffEvaluations)
        .where(and(
          eq(staffEvaluations.evaluatorId, user.id),
          eq(staffEvaluations.employeeId, employeeId)
        ))
        .orderBy(desc(staffEvaluations.createdAt))
        .limit(1);
      
      res.json({
        thisMonthCount: monthlyResult?.cnt || 0,
        lastEvalDate: lastEval?.createdAt?.toISOString() || null,
        canEvaluateToday: !(recentResult && recentResult.cnt > 0),
      });
    } catch (error: unknown) {
      console.error("Eval limit status error:", error);
      res.status(500).json({ message: "Limit durumu alınamadı" });
    }
  });

  // GET /api/staff-evaluations/:employeeId
  router.get('/api/staff-evaluations/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const employeeId = req.params.employeeId;

      const isOwnProfile = user.id === employeeId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const evaluations = await db.select({
        id: staffEvaluations.id,
        employeeId: staffEvaluations.employeeId,
        evaluatorId: staffEvaluations.evaluatorId,
        evaluatorRole: staffEvaluations.evaluatorRole,
        branchId: staffEvaluations.branchId,
        customerBehavior: staffEvaluations.customerBehavior,
        friendliness: staffEvaluations.friendliness,
        knowledgeExperience: staffEvaluations.knowledgeExperience,
        dressCode: staffEvaluations.dressCode,
        cleanliness: staffEvaluations.cleanliness,
        teamwork: staffEvaluations.teamwork,
        punctuality: staffEvaluations.punctuality,
        initiative: staffEvaluations.initiative,
        overallScore: staffEvaluations.overallScore,
        notes: staffEvaluations.notes,
        evaluationType: staffEvaluations.evaluationType,
        createdAt: staffEvaluations.createdAt,
        evaluatorFirstName: users.firstName,
        evaluatorLastName: users.lastName,
      })
        .from(staffEvaluations)
        .leftJoin(users, eq(staffEvaluations.evaluatorId, users.id))
        .where(eq(staffEvaluations.employeeId, employeeId))
        .orderBy(desc(staffEvaluations.createdAt));

      const avgResult = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
        totalCount: count(),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, employeeId));

      const enrichedEvals = evaluations.map(e => ({
        ...e,
        evaluatorName: ((e.evaluatorFirstName || '') + ' ' + (e.evaluatorLastName || '')).trim() || null,
      }));
      res.json({
        evaluations: enrichedEvals,
        averageScore: avgResult[0]?.avgScore ? Number(avgResult[0].avgScore) : 0,
        totalCount: Number(avgResult[0]?.totalCount || 0),
      });
    } catch (error: unknown) {
      console.error("Error fetching staff evaluations:", error);
      res.status(500).json({ message: "Değerlendirmeler alınırken hata oluştu" });
    }
  });


  // GET /api/personnel/:id/ai-recommendations - AI Performance Coach recommendations
  router.get('/api/personnel/:id/ai-recommendations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;
      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const perfScores = await db.select({
        avgAttendance: avg(employeePerformanceScores.attendanceScore),
        avgChecklist: avg(employeePerformanceScores.checklistScore),
        avgDaily: avg(employeePerformanceScores.dailyTotalScore),
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      const taskStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'onaylandi' THEN 1 END)`,
      }).from(tasks)
        .where(eq(tasks.assignedToId, targetId));

      const checklistStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${checklistCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(checklistCompletions)
        .where(eq(checklistCompletions.userId, targetId));

      const trainingStats = await db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${trainingCompletions.completedAt} IS NOT NULL THEN 1 END)`,
      }).from(trainingCompletions)
        .where(eq(trainingCompletions.userId, targetId));

      const evalScores = await db.select({
        avgScore: avg(staffEvaluations.overallScore),
      }).from(staffEvaluations)
        .where(eq(staffEvaluations.employeeId, targetId));

      const disciplinaryRecords = await db.select({
        id: disciplinaryReports.id,
        reportType: disciplinaryReports.reportType,
        severity: disciplinaryReports.severity,
        subject: disciplinaryReports.subject,
        actionTaken: disciplinaryReports.actionTaken,
        status: disciplinaryReports.status,
      }).from(disciplinaryReports)
        .where(eq(disciplinaryReports.userId, targetId))
        .orderBy(desc(disciplinaryReports.createdAt))
        .limit(5);

      const targetUser = await storage.getUserById(targetId);
      let inspectionScoreVal = 0;
      if (targetUser?.branchId) {
        const auditScores = await db.select({
          avgScore: avg(qualityAudits.percentageScore),
        }).from(qualityAudits)
          .where(eq(qualityAudits.branchId, targetUser.branchId));
        inspectionScoreVal = auditScores[0]?.avgScore ? Number(auditScores[0].avgScore) : 0;
      }

      const attendanceRate = perfScores[0]?.avgAttendance ? Number(perfScores[0].avgAttendance) : 0;
      const taskTotal = Number(taskStats[0]?.total || 0);
      const taskCompleted = Number(taskStats[0]?.completed || 0);
      const taskCompletionRate = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;
      const clTotal = Number(checklistStats[0]?.total || 0);
      const clCompleted = Number(checklistStats[0]?.completed || 0);
      const checklistScore = clTotal > 0 ? (clCompleted / clTotal) * 100 : 0;
      const trTotal = Number(trainingStats[0]?.total || 0);
      const trCompleted = Number(trainingStats[0]?.completed || 0);
      const trainingProgress = trTotal > 0 ? (trCompleted / trTotal) * 100 : 0;
      const evaluationScore = evalScores[0]?.avgScore ? Number(evalScores[0].avgScore) : 0;

      const overallScore = (attendanceRate * 0.15) + (taskCompletionRate * 0.20) + (checklistScore * 0.20) + (trainingProgress * 0.10) + (inspectionScoreVal * 0.15) + (evaluationScore * 0.20);

      const performanceData = {
        attendanceRate: Math.round(attendanceRate),
        taskCompletionRate: Math.round(taskCompletionRate),
        checklistScore: Math.round(checklistScore),
        trainingProgress: Math.round(trainingProgress),
        inspectionScore: Math.round(inspectionScoreVal),
        evaluationScore: Math.round(evaluationScore),
        overallScore: Math.round(overallScore),
        disciplinaryCount: disciplinaryRecords.length,
        disciplinarySummary: disciplinaryRecords.map(d => `${d.reportType} - ${d.subject} (${d.severity})`).join('; '),
        role: targetUser?.role || 'barista',
        fullName: targetUser?.fullName || '',
      };

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Sen bir franchise kahve zincirinde (DOSPRESSO) çalışan personel için performans koçusun. Türkçe yanıt ver. Personelin performans verilerini analiz edip yapıcı öneriler sun. JSON formatında yanıt ver:
{
  "weakAreas": ["string - zayıf alanlar listesi"],
  "recommendations": ["string - iyileştirme önerileri, numaralı"],
  "targetPlan": ["string - hedef plan maddeleri"],
  "overallAdvice": "string - genel tavsiye",
  "levelRisk": boolean
}
Kurallar:
- 75 altı skorlar zayıf alan olarak belirle
- 65 altı genel skor levelRisk=true
- Önerileri somut ve uygulanabilir yap
- Türk iş hukuku ve franchise standartlarına uygun öneriler ver`
          },
          {
            role: "user",
            content: `Personel: ${performanceData.fullName} (${performanceData.role})
Genel Skor: ${performanceData.overallScore}%
Devam Oranı: ${performanceData.attendanceRate}%
Görev Tamamlama: ${performanceData.taskCompletionRate}%
Checklist Skoru: ${performanceData.checklistScore}%
Eğitim İlerlemesi: ${performanceData.trainingProgress}%
Denetim Puanı: ${performanceData.inspectionScore}%
Değerlendirme Puanı: ${performanceData.evaluationScore}%
Disiplin Kayıtları: ${performanceData.disciplinaryCount > 0 ? performanceData.disciplinarySummary : 'Yok'}

Bu verilere dayanarak performans analizi ve iyileştirme önerileri oluştur.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI yanıt üretemedi" });
      }

      const parsed = JSON.parse(content);
      res.json({
        weakAreas: parsed.weakAreas || [],
        recommendations: parsed.recommendations || [],
        targetPlan: parsed.targetPlan || [],
        overallAdvice: parsed.overallAdvice || '',
        levelRisk: parsed.levelRisk || overallScore < 65,
      });
    } catch (error: unknown) {
      console.error("Error generating AI recommendations:", error);
      res.status(500).json({ message: "AI önerileri oluşturulurken hata oluştu" });
    }
  });

  // GET /api/personnel/:id/leave-salary-summary - Leave and salary summary
  router.get('/api/personnel/:id/leave-salary-summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const targetId = req.params.id;
      const isOwnProfile = user.id === targetId;
      const isHQ = isHQRole(user.role as UserRoleType);
      if (!isOwnProfile && !isHQ && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Erişim yetkiniz yok" });
      }

      const targetUser = await storage.getUserById(targetId);
      if (!targetUser) {
        return res.status(404).json({ message: "Personel bulunamadı" });
      }

      const hireDate = targetUser.hireDate ? new Date(targetUser.hireDate) : null;
      const now = new Date();
      let annualLeaveTotal = 14;
      let renewalDate = '';

      if (hireDate) {
        const yearsWorked = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (yearsWorked >= 15) {
          annualLeaveTotal = 26;
        } else if (yearsWorked >= 5) {
          annualLeaveTotal = 20;
        } else {
          annualLeaveTotal = 14;
        }
        const nextAnniversary = new Date(hireDate);
        nextAnniversary.setFullYear(now.getFullYear());
        if (nextAnniversary < now) {
          nextAnniversary.setFullYear(now.getFullYear() + 1);
        }
        renewalDate = `${String(nextAnniversary.getDate()).padStart(2, '0')}/${String(nextAnniversary.getMonth() + 1).padStart(2, '0')}/${nextAnniversary.getFullYear()}`;
      }

      const currentYear = now.getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const approvedLeaves = await db.select({
        totalDays: sql<number>`COALESCE(SUM(${leaveRequests.totalDays}), 0)`,
        leaveType: leaveRequests.leaveType,
      }).from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, targetId),
          eq(leaveRequests.status, 'approved'),
          gte(leaveRequests.startDate, yearStart),
          lte(leaveRequests.endDate, yearEnd),
        ))
        .groupBy(leaveRequests.leaveType);

      let usedLeave = 0;
      let unpaidLeaveDays = 0;
      for (const leave of approvedLeaves) {
        const days = Number(leave.totalDays);
        if (leave.leaveType === 'unpaid') {
          unpaidLeaveDays += days;
        } else {
          usedLeave += days;
        }
      }

      const remainingLeave = Math.max(0, annualLeaveTotal - usedLeave);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const perfScores = await db.select({
        latenessCount: sql<number>`COUNT(CASE WHEN ${employeePerformanceScores.attendanceScore} < 50 THEN 1 END)`,
      }).from(employeePerformanceScores)
        .where(and(
          eq(employeePerformanceScores.userId, targetId),
          gte(employeePerformanceScores.date, thirtyDaysStr)
        ));

      const latenessCount = Number(perfScores[0]?.latenessCount || targetUser.latenessCount || 0);

      const salaryRecord = await db.select().from(employeeSalaries)
        .where(eq(employeeSalaries.userId, targetId))
        .limit(1);

      const baseSalary = salaryRecord[0]?.baseSalary ? Number(salaryRecord[0].baseSalary) : 0;

      // Salary scales mapping - map user role to salary_scales position
      const roleToPositionMap: Record<string, { positionName: string; locationType: string }> = {
        'stajyer': { positionName: 'Stajyer', locationType: 'sube' },
        'bar_buddy': { positionName: 'Bar Buddy', locationType: 'sube' },
        'barista': { positionName: 'Barista', locationType: 'sube' },
        'senior_barista': { positionName: 'Barista', locationType: 'sube' },
        'supervisor_buddy': { positionName: 'Supervisor Buddy', locationType: 'sube' },
        'supervisor': { positionName: 'Süpervizör', locationType: 'sube' },
      };

      let salaryScaleData: any = null;
      const roleMapping = roleToPositionMap[targetUser.role || ''];
      if (roleMapping) {
        const scaleResult = await db.execute(sql`
          SELECT * FROM salary_scales 
          WHERE position_name = ${roleMapping.positionName} 
          AND location_type = ${roleMapping.locationType} 
          AND is_active = true 
          LIMIT 1
        `);
        if (scaleResult.rows.length > 0) {
          const scale = scaleResult.rows[0] as any;
          salaryScaleData = {
            positionName: scale.position_name,
            level: scale.level,
            baseSalary: Number(scale.base_salary),
            cashRegisterBonus: Number(scale.cash_register_bonus),
            performanceBonus: Number(scale.performance_bonus),
            bonusCalculationType: scale.bonus_calculation_type,
            totalSalary: Number(scale.total_salary),
          };
        }
      }

      // Calculate daily meal allowance from worked days this month
      const currentMonth = now.getMonth() + 1;
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = now.toISOString().split('T')[0];

      const workedShifts = await db.execute(sql`
        SELECT COUNT(DISTINCT shift_date) as worked_days
        FROM shifts 
        WHERE assigned_to_id = ${targetId}
        AND shift_date >= ${monthStart}
        AND shift_date <= ${monthEnd}
        AND status = 'confirmed'
      `);
      const workedDaysThisMonth = Number((workedShifts.rows[0] as any)?.worked_days || 0);
      const dailyMealAllowance = targetUser.mealAllowance ? Number(targetUser.mealAllowance) : 0;
      const monthlyMealAllowance = Math.round((dailyMealAllowance / 26) * workedDaysThisMonth);

      const canViewSalary = isOwnProfile || user.role === 'admin' || user.role === 'muhasebe' || user.role === 'muhasebe_ik';

      const overtimeResult = await db.execute(sql`
        SELECT COALESCE(SUM(approved_minutes), 0) as total_minutes
        FROM overtime_requests
        WHERE user_id = ${targetId}
        AND status = 'approved'
        AND overtime_date >= ${monthStart}
        AND overtime_date <= ${monthEnd}
      `);
      const totalOvertimeMinutes = Number((overtimeResult.rows[0] as any)?.total_minutes || 0);
      const overtimeHoursThisMonth = Math.round((totalOvertimeMinutes / 60) * 100) / 100;

      const effectiveBaseSalary = salaryScaleData ? salaryScaleData.baseSalary : baseSalary;
      const hourlyRate = effectiveBaseSalary > 0 ? effectiveBaseSalary / (26 * 7.5) : 0;
      const overtimeAmountThisMonth = Math.round(hourlyRate * 1.5 * overtimeHoursThisMonth);

      const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const todayDate = Math.min(now.getDate(), totalDaysInMonth);
      // Count business days (Mon-Sat, excluding Sunday) from 1st to today
      let expectedWorkDays = 0;
      for (let d = 1; d <= todayDate; d++) {
        const date = new Date(currentYear, currentMonth - 1, d);
        if (date.getDay() !== 0) { // 0 = Sunday
          expectedWorkDays++;
        }
      }
      const missingDaysThisMonth = Math.max(0, expectedWorkDays - workedDaysThisMonth);
      const missingDayDeduction = effectiveBaseSalary > 0 ? Math.round((effectiveBaseSalary / 30) * missingDaysThisMonth) : 0;

      const performanceBonus = salaryScaleData ? salaryScaleData.performanceBonus : 0;
      const cashRegisterBonus = salaryScaleData ? salaryScaleData.cashRegisterBonus : 0;
      const netEstimatedSalary = effectiveBaseSalary + overtimeAmountThisMonth + performanceBonus + cashRegisterBonus + monthlyMealAllowance - missingDayDeduction;

      res.json({
        annualLeaveTotal,
        usedLeave,
        remainingLeave,
        renewalDate,
        unpaidLeaveDays,
        latenessCount,
        baseSalary: canViewSalary ? baseSalary : null,
        canViewSalary,
        salaryScale: canViewSalary ? salaryScaleData : null,
        workedDaysThisMonth: canViewSalary ? workedDaysThisMonth : null,
        monthlyMealAllowance: canViewSalary ? monthlyMealAllowance : null,
        overtimeHoursThisMonth: canViewSalary ? overtimeHoursThisMonth : 0,
        overtimeAmountThisMonth: canViewSalary ? overtimeAmountThisMonth : 0,
        missingDaysThisMonth: canViewSalary ? missingDaysThisMonth : 0,
        missingDayDeduction: canViewSalary ? missingDayDeduction : 0,
        expectedWorkDays,
        netEstimatedSalary: canViewSalary ? netEstimatedSalary : 0,
      });
    } catch (error: unknown) {
      console.error("Error fetching leave-salary summary:", error);
      res.status(500).json({ message: "İzin ve maaş bilgileri alınırken hata oluştu" });
    }
  });


export default router;
