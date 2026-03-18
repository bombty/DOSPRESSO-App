import { db } from "../db";
import { sql } from "drizzle-orm";
import { isModuleEnabled } from "./module-flag-service";

function getTurkeyToday(): string {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return turkeyTime.toISOString().slice(0, 10);
}

function getTurkeyDayOfWeek(): number {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return turkeyTime.getUTCDay();
}

function getTurkeyDayOfMonth(): number {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return turkeyTime.getUTCDate();
}

export async function generateDailyTaskInstances(): Promise<number> {
  const today = getTurkeyToday();
  const dayOfWeek = getTurkeyDayOfWeek();
  const dayOfMonth = getTurkeyDayOfMonth();

  const recurringTasks = await db.execute(sql`
    SELECT id, title, branch_id, recurrence_type, day_of_week, day_of_month, specific_date, assigned_to_user_id
    FROM branch_recurring_tasks
    WHERE is_active = true AND deleted_at IS NULL
  `);

  const activeBranches = await db.execute(sql`
    SELECT id FROM branches WHERE is_active = true
  `);
  const branchIds = (activeBranches.rows || []).map((r: any) => r.id as number);

  let generated = 0;

  for (const task of (recurringTasks.rows || []) as any[]) {
    let matches = false;

    switch (task.recurrence_type) {
      case "daily":
        matches = true;
        break;
      case "weekly":
        matches = task.day_of_week === dayOfWeek;
        break;
      case "monthly":
        matches = task.day_of_month === dayOfMonth;
        break;
      case "once":
        matches = task.specific_date === today;
        break;
    }

    if (!matches) continue;

    const targetBranchIds = task.branch_id ? [task.branch_id] : branchIds;

    for (const branchId of targetBranchIds) {
      try {
        const enabled = await isModuleEnabled("sube_gorevleri", branchId, "data");
        if (!enabled) continue;
      } catch {}

      const overrideCheck = await db.execute(
        sql`SELECT 1 FROM branch_recurring_task_overrides
            WHERE recurring_task_id = ${task.id} AND branch_id = ${branchId}
              AND is_disabled = true AND deleted_at IS NULL
            LIMIT 1`
      );
      if (overrideCheck.rows && overrideCheck.rows.length > 0) continue;

      const result = await db.execute(
        sql`INSERT INTO branch_task_instances (recurring_task_id, branch_id, due_date, status, assigned_to_user_id)
            VALUES (${task.id}, ${branchId}, ${today}, 'pending', ${task.assigned_to_user_id})
            ON CONFLICT (recurring_task_id, branch_id, due_date) DO NOTHING`
      );
      if (result.rowCount && result.rowCount > 0) generated++;
    }
  }

  console.log(`[BRANCH-TASKS] Generated ${generated} task instances for ${today}`);
  return generated;
}

export async function markOverdueInstances(): Promise<number> {
  const today = getTurkeyToday();

  const result = await db.execute(sql`
    UPDATE branch_task_instances
    SET is_overdue = true, updated_at = NOW()
    WHERE (status = 'pending' OR status = 'claimed')
      AND due_date < ${today}
      AND is_overdue = false
  `);

  const count = result.rowCount || 0;
  if (count > 0) {
    console.log(`[BRANCH-TASKS] Marked ${count} instances as overdue`);
  }
  return count;
}
