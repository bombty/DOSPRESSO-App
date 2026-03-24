import { db } from "../db";
import { branchMonthlySnapshots, factoryMonthlySnapshots } from "@shared/schema";
import { eq, and, sql, gte, lte, count } from "drizzle-orm";

async function getActiveBranches(): Promise<Array<{ id: number; name: string }>> {
  const rows = await db.execute(sql`
    SELECT id, name FROM branches WHERE is_active = true AND id NOT IN (23, 24) ORDER BY name
  `);
  return (rows.rows || []) as Array<{ id: number; name: string }>;
}

function monthRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

async function safeCount(query: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(query));
    return Number(result.rows?.[0]?.count || 0);
  } catch {
    return 0;
  }
}

async function safeAvg(query: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(query));
    return Number(result.rows?.[0]?.avg || 0);
  } catch {
    return 0;
  }
}

async function collectBranchSnapshot(branchId: number, month: number, year: number) {
  const { start, end } = monthRange(month, year);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const staffCount = await safeCount(
    `SELECT count(*) FROM users WHERE branch_id = ${branchId} AND is_active = true AND account_status = 'approved'`
  );

  const newHires = await safeCount(
    `SELECT count(*) FROM users WHERE branch_id = ${branchId} AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const terminations = await safeCount(
    `SELECT count(*) FROM users WHERE branch_id = ${branchId} AND is_active = false AND updated_at >= '${startStr}' AND updated_at <= '${endStr}'`
  );

  const turnoverRate = staffCount > 0 ? Number(((terminations / staffCount) * 100).toFixed(2)) : 0;

  const lateCount = await safeCount(
    `SELECT count(*) FROM shift_attendance WHERE branch_id = ${branchId} AND date >= '${startStr}'::date AND date <= '${endStr}'::date AND status = 'late'`
  );

  const taskTotal = await safeCount(
    `SELECT count(*) FROM branch_task_instances WHERE branch_id = ${branchId} AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const taskCompleted = await safeCount(
    `SELECT count(*) FROM branch_task_instances WHERE branch_id = ${branchId} AND status = 'completed' AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const taskCompletionRate = taskTotal > 0 ? Number(((taskCompleted / taskTotal) * 100).toFixed(2)) : 0;

  const customerComplaints = await safeCount(
    `SELECT count(*) FROM support_tickets WHERE branch_id = ${branchId} AND channel = 'misafir' AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const customerAvgRating = await safeAvg(
    `SELECT avg(rating_overall) as avg FROM support_tickets WHERE branch_id = ${branchId} AND channel = 'misafir' AND rating_overall IS NOT NULL AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const slaBreaches = await safeCount(
    `SELECT count(*) FROM support_tickets WHERE branch_id = ${branchId} AND sla_breached = true AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const ticketsTotal = await safeCount(
    `SELECT count(*) FROM support_tickets WHERE branch_id = ${branchId} AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const ticketsResolved = await safeCount(
    `SELECT count(*) FROM support_tickets WHERE branch_id = ${branchId} AND status = 'resolved' AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const equipmentFaults = await safeCount(
    `SELECT count(*) FROM equipment_faults WHERE branch_id = ${branchId} AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const repeatFaults = await safeCount(
    `SELECT count(*) FROM equipment_faults WHERE branch_id = ${branchId} AND is_repeat = true AND created_at >= '${startStr}' AND created_at <= '${endStr}'`
  );

  const trainingCompletions = await safeCount(
    `SELECT count(*) FROM training_progress WHERE status = 'completed' AND completed_at >= '${startStr}' AND completed_at <= '${endStr}' AND user_id IN (SELECT id FROM users WHERE branch_id = ${branchId})`
  );

  const avgQuizScore = await safeAvg(
    `SELECT avg(score) as avg FROM quiz_attempts WHERE completed_at >= '${startStr}' AND completed_at <= '${endStr}' AND user_id IN (SELECT id FROM users WHERE branch_id = ${branchId})`
  );

  let costPayroll = 0, costSupplies = 0, costTotal = 0, revenueTotal = 0, netProfit = 0;
  try {
    const finResult = await db.execute(sql.raw(
      `SELECT cost_payroll, cost_supplies, total_cost, revenue_total, net_profit FROM branch_financial_summary WHERE branch_id = ${branchId} AND period_month = ${month} AND period_year = ${year} LIMIT 1`
    ));
    if (finResult.rows?.[0]) {
      const f = finResult.rows[0] as any;
      costPayroll = Number(f.cost_payroll || 0);
      costSupplies = Number(f.cost_supplies || 0);
      costTotal = Number(f.total_cost || 0);
      revenueTotal = Number(f.revenue_total || 0);
      netProfit = Number(f.net_profit || 0);
    }
  } catch {}

  const weights = { attendance: 0.20, task: 0.15, customer: 0.20, equipment: 0.15, training: 0.15, sla: 0.15 };
  const attendanceScore = 80;
  const taskScore = Math.min(taskCompletionRate, 100);
  const customerScore = customerAvgRating > 0 ? (customerAvgRating / 5) * 100 : 70;
  const equipmentScore = equipmentFaults === 0 ? 100 : Math.max(0, 100 - equipmentFaults * 10);
  const trainingScore = avgQuizScore > 0 ? avgQuizScore : 70;
  const slaScore = slaBreaches === 0 ? 100 : Math.max(0, 100 - slaBreaches * 20);

  const overallHealthScore = Number((
    attendanceScore * weights.attendance +
    taskScore * weights.task +
    customerScore * weights.customer +
    equipmentScore * weights.equipment +
    trainingScore * weights.training +
    slaScore * weights.sla
  ).toFixed(2));

  return {
    branchId, snapshotMonth: month, snapshotYear: year,
    staffCount, newHires, terminations,
    turnoverRate: String(turnoverRate),
    attendanceRate: String(attendanceScore),
    lateCount, leaveDaysUsed: 0,
    taskTotal, taskCompleted,
    taskCompletionRate: String(taskCompletionRate),
    checklistCompletionRate: "0",
    customerComplaints, customerAvgRating: String(Number(customerAvgRating).toFixed(2)),
    slaBreaches, ticketsTotal, ticketsResolved,
    avgResolutionHours: "0",
    equipmentFaults, repeatFaults, avgRepairHours: "0",
    trainingCompletions, avgQuizScore: String(Number(avgQuizScore).toFixed(2)),
    certificatesIssued: 0,
    costPayroll: String(costPayroll), costSupplies: String(costSupplies),
    costTotal: String(costTotal), revenueTotal: String(revenueTotal), netProfit: String(netProfit),
    overallHealthScore: String(overallHealthScore),
  };
}

export async function calculateMonthlySnapshots(month: number, year: number) {
  console.log(`[Snapshot] Calculating monthly snapshots for ${month}/${year}...`);
  const branches = await getActiveBranches();
  const results: any[] = [];

  for (const branch of branches) {
    try {
      const snapshot = await collectBranchSnapshot(branch.id, month, year);
      await db.execute(sql`
        INSERT INTO branch_monthly_snapshots (
          branch_id, snapshot_month, snapshot_year,
          staff_count, new_hires, terminations, turnover_rate,
          attendance_rate, late_count, leave_days_used,
          task_total, task_completed, task_completion_rate, checklist_completion_rate,
          customer_complaints, customer_avg_rating, sla_breaches,
          tickets_total, tickets_resolved, avg_resolution_hours,
          equipment_faults, repeat_faults, avg_repair_hours,
          training_completions, avg_quiz_score, certificates_issued,
          cost_payroll, cost_supplies, cost_total, revenue_total, net_profit,
          overall_health_score
        ) VALUES (
          ${snapshot.branchId}, ${snapshot.snapshotMonth}, ${snapshot.snapshotYear},
          ${snapshot.staffCount}, ${snapshot.newHires}, ${snapshot.terminations}, ${snapshot.turnoverRate},
          ${snapshot.attendanceRate}, ${snapshot.lateCount}, ${snapshot.leaveDaysUsed},
          ${snapshot.taskTotal}, ${snapshot.taskCompleted}, ${snapshot.taskCompletionRate}, ${snapshot.checklistCompletionRate},
          ${snapshot.customerComplaints}, ${snapshot.customerAvgRating}, ${snapshot.slaBreaches},
          ${snapshot.ticketsTotal}, ${snapshot.ticketsResolved}, ${snapshot.avgResolutionHours},
          ${snapshot.equipmentFaults}, ${snapshot.repeatFaults}, ${snapshot.avgRepairHours},
          ${snapshot.trainingCompletions}, ${snapshot.avgQuizScore}, ${snapshot.certificatesIssued},
          ${snapshot.costPayroll}, ${snapshot.costSupplies}, ${snapshot.costTotal}, ${snapshot.revenueTotal}, ${snapshot.netProfit},
          ${snapshot.overallHealthScore}
        )
        ON CONFLICT (branch_id, snapshot_month, snapshot_year)
        DO UPDATE SET
          staff_count = EXCLUDED.staff_count, new_hires = EXCLUDED.new_hires,
          terminations = EXCLUDED.terminations, turnover_rate = EXCLUDED.turnover_rate,
          attendance_rate = EXCLUDED.attendance_rate, late_count = EXCLUDED.late_count,
          task_total = EXCLUDED.task_total, task_completed = EXCLUDED.task_completed,
          task_completion_rate = EXCLUDED.task_completion_rate,
          customer_complaints = EXCLUDED.customer_complaints, customer_avg_rating = EXCLUDED.customer_avg_rating,
          sla_breaches = EXCLUDED.sla_breaches, tickets_total = EXCLUDED.tickets_total,
          tickets_resolved = EXCLUDED.tickets_resolved,
          equipment_faults = EXCLUDED.equipment_faults, repeat_faults = EXCLUDED.repeat_faults,
          training_completions = EXCLUDED.training_completions, avg_quiz_score = EXCLUDED.avg_quiz_score,
          cost_payroll = EXCLUDED.cost_payroll, cost_supplies = EXCLUDED.cost_supplies,
          cost_total = EXCLUDED.cost_total, revenue_total = EXCLUDED.revenue_total, net_profit = EXCLUDED.net_profit,
          overall_health_score = EXCLUDED.overall_health_score
      `);
      results.push({ branchId: branch.id, name: branch.name, status: "ok" });
    } catch (err: unknown) {
      console.error(`[Snapshot] Error for branch ${branch.id}:`, err instanceof Error ? err.message : err);
      results.push({ branchId: branch.id, name: branch.name, status: "error" });
    }
  }
  console.log(`[Snapshot] Completed: ${results.filter(r => r.status === "ok").length}/${results.length} branches`);
  return results;
}

export async function calculateFactorySnapshot(month: number, year: number) {
  try {
    const productionTotal = await safeCount(
      `SELECT COALESCE(SUM(quantity_produced), 0) as count FROM factory_shift_productions WHERE created_at >= '${new Date(year, month - 1, 1).toISOString()}' AND created_at <= '${new Date(year, month, 0, 23, 59, 59).toISOString()}'`
    );

    const staffCount = await safeCount(
      `SELECT count(*) FROM users WHERE branch_id = 24 AND is_active = true`
    );

    await db.execute(sql`
      INSERT INTO factory_monthly_snapshots (snapshot_month, snapshot_year, production_total, staff_count)
      VALUES (${month}, ${year}, ${productionTotal}, ${staffCount})
      ON CONFLICT (snapshot_month, snapshot_year)
      DO UPDATE SET production_total = EXCLUDED.production_total, staff_count = EXCLUDED.staff_count
    `);
  } catch (err: unknown) {
    console.error("[Snapshot] Factory error:", err instanceof Error ? err.message : err);
  }
}

export async function getSnapshots(branchId: number, months: number = 6) {
  const now = new Date();
  const results = await db.select()
    .from(branchMonthlySnapshots)
    .where(eq(branchMonthlySnapshots.branchId, branchId))
    .orderBy(sql`snapshot_year DESC, snapshot_month DESC`)
    .limit(months);
  return results;
}

export async function getAllSnapshotsForMonth(month: number, year: number) {
  const results = await db.execute(sql`
    SELECT s.*, b.name as branch_name
    FROM branch_monthly_snapshots s
    JOIN branches b ON b.id = s.branch_id
    WHERE s.snapshot_month = ${month} AND s.snapshot_year = ${year}
    ORDER BY s.overall_health_score DESC
  `);
  return results.rows || [];
}
