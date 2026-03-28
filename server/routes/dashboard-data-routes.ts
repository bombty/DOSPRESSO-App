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

// ═══════════════════════════════════════════════════════════
// SECURITY: Parameterized query helpers
// NEVER interpolate user input into SQL strings
// Always use sql`` tagged template for date parameters
// ═══════════════════════════════════════════════════════════

/** Strict date sanitization — only allows YYYY-MM-DD format */
function sanitizeDate(input: string): string {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date().toISOString().split("T")[0]; // fallback to today
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}`);
  if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return `${y}-${m}-${d}`;
}

async function safeCountParam(query: ReturnType<typeof sql>): Promise<number> {
  try {
    const r = await db.execute(query);
    return Number(r.rows?.[0]?.count || 0);
  } catch (e) { 
    console.error("[dashboard-data] safeCountParam error:", e);
    return 0; 
  }
}

async function safeAvgParam(query: ReturnType<typeof sql>): Promise<number> {
  try {
    const r = await db.execute(query);
    return Number(r.rows?.[0]?.avg || 0);
  } catch (e) { 
    console.error("[dashboard-data] safeAvgParam error:", e);
    return 0; 
  }
}

async function safeRowsParam(query: ReturnType<typeof sql>): Promise<any[]> {
  try {
    const r = await db.execute(query);
    return r.rows || [];
  } catch (e) { 
    console.error("[dashboard-data] safeRowsParam error:", e);
    return []; 
  }
}

// Legacy helpers — injection protection added
// New queries should use safeCountParam with sql`` tagged template

/** Reject queries with common SQL injection patterns */
function validateQuerySafety(query: string): boolean {
  const dangerous = /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|EXEC|UNION\s+SELECT|--)/i;
  if (dangerous.test(query)) {
    console.error("[SECURITY] Blocked suspicious SQL query:", query.substring(0, 120));
    return false;
  }
  return true;
}

/** Sanitize branchId — must be a positive integer */
function safeBranchId(input: any): number {
  const num = parseInt(String(input), 10);
  if (isNaN(num) || num <= 0 || num > 100000) return -1;
  return num;
}

async function safeCount(query: string): Promise<number> {
  if (!validateQuerySafety(query)) return 0;
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.count || 0);
  } catch (e) {
    console.error("[dashboard-data] safeCount error:", e);
    return 0;
  }
}

async function safeAvg(query: string): Promise<number> {
  if (!validateQuerySafety(query)) return 0;
  try {
    const r = await db.execute(sql.raw(query));
    return Number(r.rows?.[0]?.avg || 0);
  } catch (e) {
    console.error("[dashboard-data] safeAvg error:", e);
    return 0;
  }
}

async function safeRows(query: string): Promise<any[]> {
  if (!validateQuerySafety(query)) return [];
  try {
    const r = await db.execute(sql.raw(query));
    return r.rows || [];
  } catch (e) {
    console.error("[dashboard-data] safeRows error:", e);
    return [];
  }
}

router.get("/api/dashboard/executive", isAuthenticated, requireRole(EXEC_ROLES), async (req, res) => {
  try {
    const raw = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);
    const startDate = sanitizeDate(raw.startDate);
    const endDate = sanitizeDate(raw.endDate);

    const totalBranches = await safeCount(`SELECT count(*) FROM branches WHERE is_active = true AND id NOT IN (23,24)`);
    const totalStaff = await safeCount(`SELECT count(*) FROM users WHERE is_active = true AND account_status = 'approved'`);
    const totalTickets = await safeCountParam(sql`SELECT count(*) FROM support_tickets WHERE created_at >= ${startDate}::date AND created_at <= (${endDate}::date + interval '1 day')`);
    const slaBreaches = await safeCountParam(sql`SELECT count(*) FROM support_tickets WHERE sla_breached = true AND created_at >= ${startDate}::date AND created_at <= (${endDate}::date + interval '1 day')`);
    const avgCustomerRating = await safeAvgParam(sql`SELECT avg(rating_overall) as avg FROM support_tickets WHERE rating_overall IS NOT NULL AND created_at >= ${startDate}::date AND created_at <= (${endDate}::date + interval '1 day')`);
    const totalFaults = await safeCountParam(sql`SELECT count(*) FROM equipment_faults WHERE created_at >= ${startDate}::date AND created_at <= (${endDate}::date + interval '1 day')`);

    const branchRows = await safeRowsParam(sql`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff_count,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.created_at >= ${startDate}::date AND t.created_at <= (${endDate}::date + interval '1 day')) as tickets,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.sla_breached = true AND t.created_at >= ${startDate}::date AND t.created_at <= (${endDate}::date + interval '1 day')) as sla_breaches,
        (SELECT avg(t.rating_overall) FROM support_tickets t WHERE t.branch_id = b.id AND t.rating_overall IS NOT NULL AND t.created_at >= ${startDate}::date AND t.created_at <= (${endDate}::date + interval '1 day')) as avg_rating,
        (SELECT count(*) FROM equipment_faults f WHERE f.branch_id = b.id AND f.created_at >= ${startDate}::date AND f.created_at <= (${endDate}::date + interval '1 day')) as faults
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
    } catch (e) { console.error(e); }

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
    const rawDates = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);
    const startDate = sanitizeDate(rawDates.startDate);
    const endDate = sanitizeDate(rawDates.endDate);

    const myBranches = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff_count,
        (SELECT count(*) FROM equipment_faults f WHERE f.branch_id = b.id AND f.status != 'resolved') as open_faults,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.status NOT IN ('resolved','closed') AND t.created_at >= '${startDate}') as open_tickets
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const trainingCompletions = await safeCount(
      `SELECT count(*) FROM user_training_progress WHERE status = 'completed' AND completed_at >= '${startDate}' AND completed_at <= '${endDate} 23:59:59'`
    );

    const avgQuizScore = await safeAvg(
      `SELECT avg(score) as avg FROM quiz_attempts WHERE completed_at >= '${startDate}' AND completed_at <= '${endDate} 23:59:59'`
    );

    const staffDev = await safeRows(`
      SELECT u.id as user_id, u.first_name || ' ' || u.last_name as name, u.role,
        (SELECT count(*) FROM user_training_progress tp WHERE tp.user_id = u.id AND tp.status = 'completed') as modules_completed
      FROM users u WHERE u.is_active = true AND u.role IN ('stajyer','bar_buddy','barista')
      ORDER BY modules_completed DESC LIMIT 20
    `);

    const checklistByBranch = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM branch_task_instances bti WHERE bti.branch_id = b.id AND bti.status = 'completed' AND bti.completed_at >= '${startDate}') as completed,
        (SELECT count(*) FROM branch_task_instances bti WHERE bti.branch_id = b.id AND bti.created_at >= '${startDate}') as total
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const feedbackByBranch = await safeRows(`
      SELECT b.id as branch_id, b.name,
        count(cf.id) as feedback_count,
        round(coalesce(avg(cf.rating), 0)::numeric, 1) as avg_rating
      FROM branches b
      LEFT JOIN customer_feedback cf ON cf.branch_id = b.id AND cf.created_at >= '${startDate}' AND cf.created_at <= '${endDate} 23:59:59'
      WHERE b.is_active = true AND b.id NOT IN (23,24)
      GROUP BY b.id, b.name ORDER BY b.name
    `);

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const shiftByBranch = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM shifts s WHERE s.branch_id = b.id AND s.shift_date >= '${sevenDaysAgo}' AND s.shift_date <= '${today}') as total_shifts,
        (SELECT count(*) FROM shifts s WHERE s.branch_id = b.id AND s.shift_date >= '${sevenDaysAgo}' AND s.shift_date <= '${today}' AND s.status = 'completed') as completed_shifts
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const ticketsByBranch = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM support_tickets t WHERE t.branch_id = b.id AND t.status NOT IN ('resolved','closed')) as open_tickets
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const equipmentByBranch = await safeRows(`
      SELECT b.id as branch_id, b.name,
        (SELECT count(*) FROM equipment e WHERE e.branch_id = b.id) as total_equipment,
        (SELECT count(*) FROM equipment_faults ef WHERE ef.branch_id = b.id AND ef.status IN ('open','in_progress')) as open_faults,
        (SELECT count(*) FROM equipment_faults ef WHERE ef.branch_id = b.id AND ef.status = 'in_progress') as in_progress
      FROM branches b WHERE b.is_active = true AND b.id NOT IN (23,24) ORDER BY b.name
    `);

    const actionRequired: any[] = [];
    const overdueTraining = await safeCount(`SELECT count(*) FROM user_training_progress WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '14 days'`);
    if (overdueTraining > 0) actionRequired.push({ type: "training_overdue", message: `${overdueTraining} personel eğitimi gecikiyor`, count: overdueTraining });

    const openTickets = await safeCount(`SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','closed')`);
    if (openTickets > 0) actionRequired.push({ type: "open_tickets", message: `${openTickets} açık destek talebi`, count: openTickets });

    const totalEquipFaults = equipmentByBranch.reduce((s: number, e: any) => s + Number(e.open_faults || 0), 0);
    if (totalEquipFaults > 0) actionRequired.push({ type: "equipment_faults", message: `${totalEquipFaults} açık ekipman arızası`, count: totalEquipFaults });

    res.json({
      _meta: { dataAvailable: myBranches.length > 0, lastDataDate: endDate },
      myBranches: myBranches.map((b: any) => ({
        branchId: b.branch_id, name: b.name,
        staffCount: Number(b.staff_count || 0),
        openFaults: Number(b.open_faults || 0),
        openTickets: Number(b.open_tickets || 0),
        healthScore: null, attendanceRate: null, taskCompletionRate: null, customerRating: null,
      })),
      kpis: {
        totalBranches: myBranches.length,
        totalStaff: myBranches.reduce((s: number, b: any) => s + Number(b.staff_count || 0), 0),
        openFaults: myBranches.reduce((s: number, b: any) => s + Number(b.open_faults || 0), 0),
        openTickets: myBranches.reduce((s: number, b: any) => s + Number(b.open_tickets || 0), 0),
        avgHealthScore: null,
        avgTrainingProgress: avgQuizScore ? Number(avgQuizScore.toFixed(1)) : null,
      },
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
      checklistByBranch: checklistByBranch.map((c: any) => ({
        branchId: c.branch_id, name: c.name,
        completed: Number(c.completed || 0), total: Number(c.total || 0),
        rate: c.total > 0 ? Math.round((Number(c.completed || 0) / Number(c.total)) * 100) : 100,
      })),
      feedbackByBranch: feedbackByBranch.map((f: any) => ({
        branchId: f.branch_id, name: f.name,
        feedbackCount: Number(f.feedback_count || 0),
        avgRating: Number(f.avg_rating || 0),
      })),
      shiftByBranch: shiftByBranch.map((s: any) => ({
        branchId: s.branch_id, name: s.name,
        totalShifts: Number(s.total_shifts || 0),
        completedShifts: Number(s.completed_shifts || 0),
        complianceRate: s.total_shifts > 0 ? Math.round((Number(s.completed_shifts || 0) / Number(s.total_shifts)) * 100) : 100,
      })),
      ticketsByBranch: ticketsByBranch.map((t: any) => ({
        branchId: t.branch_id, name: t.name,
        openTickets: Number(t.open_tickets || 0),
      })).filter((t: any) => t.openTickets > 0),
      equipmentByBranch: equipmentByBranch.map((e: any) => ({
        branchId: e.branch_id, name: e.name,
        totalEquipment: Number(e.total_equipment || 0),
        openFaults: Number(e.open_faults || 0),
        inProgress: Number(e.in_progress || 0),
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
    const branchId = safeBranchId(req.params.branchId);
    if (branchId === -1) return res.status(400).json({ error: "Geçersiz şube ID" });
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
    const rawDates = getDateRange(req.query.period as string, req.query.startDate as string, req.query.endDate as string);
    const startDate = sanitizeDate(rawDates.startDate);
    const endDate = sanitizeDate(rawDates.endDate);

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
    const trainingCompleted = await safeCount(`SELECT count(*) FROM user_training_progress WHERE user_id = '${user.id}' AND status = 'completed'`);
    const trainingTotal = await safeCount(`SELECT count(*) FROM user_training_progress WHERE user_id = '${user.id}'`);
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

const BRANCH_ACCESS_ROLES = ["admin", "ceo", "cgo", "coach", "trainer", "mudur", "supervisor", "yatirimci_branch", "yatirimci_hq"];

router.get("/api/branch-training-progress/:branchId", isAuthenticated, requireRole(BRANCH_ACCESS_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const branchId = safeBranchId(req.params.branchId);
    if (branchId === -1) return res.status(400).json({ error: "Geçersiz şube ID" });
    if (isNaN(branchId)) return res.status(400).json({ message: "Invalid branchId" });

    const globalRoles = ["admin", "ceo", "cgo", "coach", "trainer"];
    if (!globalRoles.includes(user.role || "") && user.branchId !== branchId) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const rows = await safeRows(`
      SELECT u.id as user_id, u.first_name || ' ' || u.last_name as name, u.role,
        (SELECT count(*) FROM user_training_progress tp WHERE tp.user_id = u.id AND tp.status = 'completed') as completed_modules,
        (SELECT count(*) FROM user_training_progress tp WHERE tp.user_id = u.id) as total_assigned
      FROM users u
      WHERE u.branch_id = ${branchId} AND u.is_active = true
        AND u.role IN ('stajyer','bar_buddy','barista','supervisor','supervisor_buddy')
      ORDER BY completed_modules DESC LIMIT 15
    `);

    res.json(rows.map((r: any) => ({
      userId: r.user_id,
      name: r.name,
      role: r.role,
      completedModules: Number(r.completed_modules || 0),
      totalAssigned: Number(r.total_assigned || 0),
      progressRate: r.total_assigned > 0 ? Math.round((Number(r.completed_modules || 0) / Number(r.total_assigned)) * 100) : 0,
    })));
  } catch (err: unknown) {
    console.error("[BranchTrainingProgress]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Training progress error" });
  }
});

router.get("/api/branch-feedback-summary/:branchId", isAuthenticated, requireRole(BRANCH_ACCESS_ROLES), async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const branchId = safeBranchId(req.params.branchId);
    if (branchId === -1) return res.status(400).json({ error: "Geçersiz şube ID" });
    if (isNaN(branchId)) return res.status(400).json({ message: "Invalid branchId" });

    const globalRoles = ["admin", "ceo", "cgo", "coach", "trainer"];
    if (!globalRoles.includes(user.role || "") && user.branchId !== branchId) {
      return res.status(403).json({ message: "Bu şubeye erişim yetkiniz yok" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const avgRow = await safeRows(`
      SELECT round(coalesce(avg(rating), 0)::numeric, 1) as avg_rating, count(*) as total_count
      FROM customer_feedback WHERE branch_id = ${branchId} AND created_at >= '${thirtyDaysAgo}'
    `);

    const recent = await safeRows(`
      SELECT id, rating, comment, created_at FROM customer_feedback
      WHERE branch_id = ${branchId} AND created_at >= '${thirtyDaysAgo}'
      ORDER BY created_at DESC LIMIT 5
    `);

    const stats = avgRow[0] || { avg_rating: 0, total_count: 0 };
    res.json({
      avgRating: Number(stats.avg_rating || 0),
      totalCount: Number(stats.total_count || 0),
      recent: recent.map((r: any) => ({
        id: r.id,
        rating: Number(r.rating || 0),
        comment: r.comment || "",
        createdAt: r.created_at,
      })),
    });
  } catch (err: unknown) {
    console.error("[BranchFeedbackSummary]", err instanceof Error ? err.message : err);
    res.status(500).json({ message: "Feedback summary error" });
  }
});

export default router;
