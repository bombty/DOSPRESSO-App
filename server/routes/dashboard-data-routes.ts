import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { sql } from "drizzle-orm";
import type { AuthUser } from "../types/auth";
import { analyzeAllBranches, getInsightSummary } from "../services/cross-module-analyzer";
import { calculateMonthlySnapshots, calculateFactorySnapshot, getAllSnapshotsForMonth } from "../services/monthly-snapshot-service";
import { getDateRange } from "./dashboard-date-utils";

const router = Router();

const EXEC_ROLES = ["admin", "ceo", "cgo"];
const COACH_ROLES = ["admin", "ceo", "cgo", "coach", "trainer"];
const FINANCE_ROLES = ["admin", "ceo", "cgo", "muhasebe_ik", "muhasebe"];
const FACTORY_ROLES = ["admin", "ceo", "fabrika_mudur", "kalite_kontrol", "gida_muhendisi"];
const BRANCH_ROLES = ["admin", "ceo", "cgo", "coach", "trainer", "mudur", "supervisor"];

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user as AuthUser;
    if (!user || !roles.includes(user.role || "")) {
      return res.status(403).json({ message: "Bu dashboard'a erişim yetkiniz yok" });
    }
    next();
  };
}

async function safeCount(query: string): Promise<number> {
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.count || 0);
  } catch { return 0; }
}

async function safeAvg(query: string): Promise<number> {
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.avg || 0);
  } catch { return 0; }
}

async function safeRows(query: string): Promise<any[]> {
  try {
    const r = await db.execute(sql.raw(query));
    return r.rows || [];
  } catch { return []; }
}

router.get("/api/dashboard/executive", isAuthenticated, requireRole(EXEC_ROLES), async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);

    const totalBranches = await safeCount(`SELECT count(*) FROM branches WHERE is_active = true AND id NOT IN (23,24)`);
    const totalStaff = await safeCount(`SELECT count(*) FROM users WHERE is_active = true AND account_status = 'approved'`);
    const totalTickets = await safeCount(`SELECT count(*) FROM support_tickets WHERE created_at >= '${startDate}' AND created_at <= '${endDate} 23:59:59'`);
    const slaBreaches = await safeCount(`SELECT count(*) FROM support_tickets WHERE sla_breached = true AND created_at >= '${startDate}' AND created_at <= '${endDate} 23:59:59'`);
    const avgCustomerRating = await safeAvg(`SELECT avg(rating_overall) as avg FROM support_tickets WHERE rating_overall IS NOT NULL AND created_at >= '${startDate}' AND created_at <= '${endDate} 23:59:59'`);
    const totalFaults = await safeCount(`SELECT count(*) FROM equipment_faults WHERE created_at >= '${startDate}' AND created_at <= '${endDate} 23:59:59'`);

    const branchRows = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff_count,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.created_at >= '${startDate}' AND t.created_at <= '${endDate} 23:59:59') as tickets,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.sla_breached = true AND t.created_at >= '${startDate}' AND t.created_at <= '${endDate} 23:59:59') as sla_breaches,
        (SELECT avg(t.rating_overall) FROM support_tickets t WHERE t.branch_id = b.id AND t.rating_overall IS NOT NULL AND t.created_at >= '${startDate}' AND t.created_at <= '${endDate} 23:59:59') as avg_rating,
        (SELECT count(*) FROM equipment_faults f WHERE f.branch_id = b.id AND f.created_at >= '${startDate}' AND f.created_at <= '${endDate} 23:59:59') as faults
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const branchComparison = branchRows.map((r: any) => ({
      branchId: r.branch_id,
      name: r.name,
      healthScore: null,
      staffCount: Number(r.staff_count || 0),
      attendanceRate: null,
      taskCompletionRate: null,
      customerRating: r.avg_rating ? Number(Number(r.avg_rating).toFixed(1)) : null,
      slaBreaches: Number(r.sla_breaches || 0),
      faultCount: Number(r.faults || 0),
    }));

    const now = new Date();
    const trendData: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const mEnd = new Date(y, m, 0);
      const label = d.toLocaleString("tr-TR", { month: "short" });
      const tickets = await safeCount(`SELECT count(*) FROM support_tickets WHERE created_at >= '${d.toISOString().split("T")[0]}' AND created_at <= '${mEnd.toISOString().split("T")[0]} 23:59:59'`);
      const faults = await safeCount(`SELECT count(*) FROM equipment_faults WHERE created_at >= '${d.toISOString().split("T")[0]}' AND created_at <= '${mEnd.toISOString().split("T")[0]} 23:59:59'`);
      trendData.push({ month: label, tickets, faults });
    }

    let alerts: any[] = [];
    try {
      const insights = await analyzeAllBranches();
      alerts = insights.slice(0, 5).map((i) => ({
        type: i.severity === "critical" ? "critical" : i.severity === "warning" ? "warning" : "positive",
        message: i.recommendation,
        branchId: i.branchId,
      }));
    } catch {}

    const dataAvailable = totalTickets > 0 || totalFaults > 0 || totalStaff > 0;

    res.json({
      _meta: { dataAvailable, lastDataDate: endDate },
      kpis: {
        totalBranches, totalStaff,
        avgHealthScore: null,
        totalTickets, slaBreaches,
        avgCustomerRating: avgCustomerRating ? Number(avgCustomerRating.toFixed(1)) : null,
        totalFaults, totalRevenue: null,
      },
      branchComparison,
      trends: trendData,
      alerts,
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Executive]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Dashboard verisi alınamadı" });
  }
});

router.get("/api/dashboard/coach", isAuthenticated, requireRole(COACH_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const { startDate, endDate } = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);

    const myBranches = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff_count,
        (SELECT count(*) FROM equipment_faults f WHERE f.branch_id = b.id AND f.status != 'resolved') as open_faults,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.status NOT IN ('resolved','closed') AND t.created_at >= '${startDate}') as open_tickets
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const trainingCompletions = await safeCount(
      `SELECT count(*) FROM training_progress WHERE status = 'completed' AND completed_at >= '${startDate}' AND completed_at <= '${endDate} 23:59:59'`
    );

    const avgQuizScore = await safeAvg(
      `SELECT avg(score) as avg FROM quiz_attempts WHERE completed_at >= '${startDate}' AND completed_at <= '${endDate} 23:59:59'`
    );

    const staffDev = await safeRows(`
      SELECT u.id as user_id, u.first_name || ' ' || u.last_name as name, u.role,
        (SELECT count(*) FROM training_progress tp WHERE tp.user_id = u.id AND tp.status = 'completed') as modules_completed
      FROM users u WHERE u.is_active = true AND u.role IN ('stajyer','bar_buddy','barista')
      ORDER BY modules_completed DESC LIMIT 20
    `);

    const actionRequired: any[] = [];
    const overdueTraining = await safeCount(`SELECT count(*) FROM training_progress WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '14 days'`);
    if (overdueTraining > 0) actionRequired.push({ type: "training_overdue", message: `${overdueTraining} personel eğitimi gecikiyor`, count: overdueTraining });

    const openTickets = await safeCount(`SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','closed')`);
    if (openTickets > 0) actionRequired.push({ type: "open_tickets", message: `${openTickets} açık destek talebi`, count: openTickets });

    res.json({
      _meta: { dataAvailable: myBranches.length > 0, lastDataDate: endDate },
      myBranches: myBranches.map((b: any) => ({
        branchId: b.branch_id, name: b.name,
        staffCount: Number(b.staff_count || 0),
        openFaults: Number(b.open_faults || 0),
        openTickets: Number(b.open_tickets || 0),
        healthScore: null, attendanceRate: null, taskCompletionRate: null, customerRating: null,
      })),
      trainingOverview: {
        totalCompletions: trainingCompletions,
        completionRate: 0,
        avgQuizScore: avgQuizScore ? Number(avgQuizScore.toFixed(1)) : null,
        upcomingCertificates: 0,
      },
      staffDevelopment: staffDev.map((s: any) => ({
        userId: s.user_id, name: s.name, role: s.role,
        modulesCompleted: Number(s.modules_completed || 0),
      })),
      actionRequired,
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Coach]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Coach dashboard verisi alınamadı" });
  }
});

router.get("/api/dashboard/branch/:branchId", isAuthenticated, requireRole(BRANCH_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) return res.status(400).json({ message: "Geçersiz şube ID" });

    if (user.role && !["admin", "ceo", "cgo", "coach", "trainer"].includes(user.role) && user.branchId !== branchId) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const today = new Date().toISOString().split("T")[0];

    const staffPresent = await safeCount(`SELECT count(*) FROM shift_attendance WHERE branch_id = ${branchId} AND date = '${today}' AND status IN ('present','late')`);
    const staffExpected = await safeCount(`SELECT count(*) FROM users WHERE branch_id = ${branchId} AND is_active = true AND role IN ('barista','bar_buddy','stajyer','supervisor','supervisor_buddy')`);
    const lateArrivals = await safeCount(`SELECT count(*) FROM shift_attendance WHERE branch_id = ${branchId} AND date = '${today}' AND status = 'late'`);
    const openTasks = await safeCount(`SELECT count(*) FROM branch_task_instances WHERE branch_id = ${branchId} AND status IN ('pending','in_progress')`);
    const completedTasks = await safeCount(`SELECT count(*) FROM branch_task_instances WHERE branch_id = ${branchId} AND status = 'completed' AND completed_at >= '${today}'`);
    const openFaults = await safeCount(`SELECT count(*) FROM equipment_faults WHERE branch_id = ${branchId} AND status != 'resolved'`);

    const staffPerf = await safeRows(`
      SELECT u.id as user_id, u.first_name || ' ' || u.last_name as name, u.role
      FROM users u WHERE u.branch_id = ${branchId} AND u.is_active = true
      AND u.role IN ('barista','bar_buddy','stajyer','supervisor','supervisor_buddy')
      ORDER BY u.first_name LIMIT 20
    `);

    const alerts: any[] = [];
    if (openFaults > 0) alerts.push({ type: "equipment", message: `${openFaults} açık ekipman arızası var` });
    const dueTasks = await safeCount(`SELECT count(*) FROM branch_task_instances WHERE branch_id = ${branchId} AND status = 'pending' AND due_date = '${today}'`);
    if (dueTasks > 0) alerts.push({ type: "task", message: `${dueTasks} görevin deadline'ı bugün` });

    res.json({
      _meta: { dataAvailable: true, lastDataDate: today },
      today: { staffPresent, staffExpected, lateArrivals, openTasks, completedTasks, openFaults },
      staffPerformance: staffPerf.map((s: any) => ({
        userId: s.user_id, name: s.name, role: s.role,
        attendanceRate: null, taskRate: null, quizAvg: null, score: null,
      })),
      alerts,
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Branch]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Şube dashboard verisi alınamadı" });
  }
});

router.get("/api/dashboard/finance", isAuthenticated, requireRole(FINANCE_ROLES), async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);

    const totalActive = await safeCount(`SELECT count(*) FROM users WHERE is_active = true AND account_status = 'approved'`);
    const pendingLeaves = await safeCount(`SELECT count(*) FROM leave_requests WHERE status = 'pending'`);
    const pendingOvertimes = await safeCount(`SELECT count(*) FROM overtime_requests WHERE status = 'pending'`);

    const payrollData = await safeRows(`
      SELECT b.name, bfs.cost_payroll, bfs.total_cost, bfs.staff_count
      FROM branch_financial_summary bfs
      JOIN branches b ON b.id = bfs.branch_id
      WHERE bfs.period_month = EXTRACT(MONTH FROM CURRENT_DATE)
      AND bfs.period_year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY bfs.total_cost DESC
    `);

    const payrollCalculated = payrollData.length > 0;
    const totalPayroll = payrollData.reduce((s: number, r: any) => s + Number(r.cost_payroll || 0), 0);

    res.json({
      _meta: { dataAvailable: totalActive > 0, lastDataDate: endDate },
      payrollSummary: {
        currentMonth: { total: totalPayroll, calculated: payrollCalculated },
        branchBreakdown: payrollData.map((r: any) => ({
          branch: r.name, payroll: Number(r.cost_payroll || 0), totalCost: Number(r.total_cost || 0), staffCount: Number(r.staff_count || 0),
        })),
      },
      staffMetrics: { totalActive, expiringDocuments: 0, pendingLeaves, pendingOvertimes },
      costAnalysis: {
        perBranch: payrollData.map((r: any) => ({ branch: r.name, cost: Number(r.total_cost || 0) })),
        perEmployee: totalActive > 0 ? Math.round(totalPayroll / totalActive) : 0,
        overtimeCost: 0,
      },
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Finance]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Finans dashboard verisi alınamadı" });
  }
});

router.get("/api/dashboard/factory", isAuthenticated, requireRole(FACTORY_ROLES), async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const todayOutput = await safeCount(`SELECT COALESCE(SUM(quantity_produced),0) as count FROM factory_shift_productions WHERE created_at >= '${today}'`);
    const pendingQC = await safeCount(`SELECT count(*) FROM factory_qc_inspections WHERE status = 'pending'`);
    const totalWorkers = await safeCount(`SELECT count(*) FROM users WHERE branch_id = 24 AND is_active = true`);

    const stations = await safeRows(`
      SELECT id, station_name as name, is_active
      FROM factory_stations ORDER BY station_name
    `);

    res.json({
      _meta: { dataAvailable: true, lastDataDate: today },
      production: { todayOutput, todayTarget: 288, completionRate: todayOutput > 0 ? Math.round((todayOutput / 288) * 100) : 0 },
      quality: { wasteRate: null, qcPassRate: null, pendingQC },
      stations: stations.map((s: any) => ({ id: s.id, name: s.name, status: s.is_active ? "active" : "idle", todayOutput: 0 })),
      staff: { onShift: 0, totalWorkers, avgScore: null },
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Factory]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Fabrika dashboard verisi alınamadı" });
  }
});

router.get("/api/dashboard/barista", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;

    const myTasks = await safeCount(`SELECT count(*) FROM branch_task_instances WHERE assigned_to = '${user.id}' AND status IN ('pending','in_progress')`);
    const completedTasks = await safeCount(`SELECT count(*) FROM branch_task_instances WHERE assigned_to = '${user.id}' AND status = 'completed'`);
    const trainingCompleted = await safeCount(`SELECT count(*) FROM training_progress WHERE user_id = '${user.id}' AND status = 'completed'`);
    const trainingTotal = await safeCount(`SELECT count(*) FROM training_progress WHERE user_id = '${user.id}'`);
    const avgQuiz = await safeAvg(`SELECT avg(score) as avg FROM quiz_attempts WHERE user_id = '${user.id}'`);

    res.json({
      _meta: { dataAvailable: true },
      kpis: {
        myTasks,
        completedTasks,
        trainingProgress: trainingTotal > 0 ? Math.round((trainingCompleted / trainingTotal) * 100) : null,
        quizAvg: avgQuiz ? Number(avgQuiz.toFixed(0)) : null,
        attendanceRate: null,
      },
    });
  } catch (err: unknown) {
    console.error("[Dashboard/Barista]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Kişisel dashboard verisi alınamadı" });
  }
});

router.post("/api/dashboard/snapshots/calculate", isAuthenticated, requireRole(EXEC_ROLES), async (req, res) => {
  try {
    const month = parseInt(req.body.month) || new Date().getMonth() + 1;
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const results = await calculateMonthlySnapshots(month, year);
    await calculateFactorySnapshot(month, year);
    res.json({ message: "Snapshot hesaplandı", results });
  } catch (err: unknown) {
    console.error("[Snapshot/Calculate]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Snapshot hesaplama başarısız" });
  }
});

export default router;
