import { db } from "./db";
import { sql } from "drizzle-orm";

const DEFAULT_CATEGORIES = [
  { key: "temizlik", label: "Temizlik", icon: "Sparkles", color: "blue", sortOrder: 1 },
  { key: "bakim", label: "Bakım", icon: "Wrench", color: "amber", sortOrder: 2 },
  { key: "stok", label: "Stok", icon: "Package", color: "green", sortOrder: 3 },
  { key: "genel", label: "Genel", icon: "ClipboardList", color: "gray", sortOrder: 4 },
];

const SAMPLE_HQ_TASKS = [
  { title: "Vitrin cam temizliği", category: "temizlik", recurrenceType: "weekly", dayOfWeek: 1 },
  { title: "Tezgah dezenfeksiyon kontrolü", category: "temizlik", recurrenceType: "daily" },
  { title: "Aylık ekipman bakım kontrolü", category: "bakim", recurrenceType: "monthly", dayOfMonth: 1 },
];

export async function seedBranchTasks() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS branch_task_categories (
      id SERIAL PRIMARY KEY,
      key VARCHAR(50) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      icon VARCHAR(50),
      color VARCHAR(20),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS branch_recurring_tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL DEFAULT 'genel',
      branch_id INTEGER REFERENCES branches(id),
      recurrence_type VARCHAR(20) NOT NULL,
      day_of_week INTEGER,
      day_of_month INTEGER,
      specific_date DATE,
      assigned_to_user_id VARCHAR REFERENCES users(id),
      created_by_user_id VARCHAR NOT NULL REFERENCES users(id),
      created_by_role VARCHAR(50) NOT NULL,
      photo_required BOOLEAN DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS branch_task_instances (
      id SERIAL PRIMARY KEY,
      recurring_task_id INTEGER NOT NULL REFERENCES branch_recurring_tasks(id),
      branch_id INTEGER NOT NULL REFERENCES branches(id),
      due_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      assigned_to_user_id VARCHAR REFERENCES users(id),
      claimed_by_user_id VARCHAR REFERENCES users(id),
      claimed_at TIMESTAMPTZ,
      completed_by_user_id VARCHAR REFERENCES users(id),
      completed_at TIMESTAMPTZ,
      completion_note TEXT,
      photo_url TEXT,
      is_overdue BOOLEAN NOT NULL DEFAULT false,
      original_due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_branch_task_instance_recurring_branch_date
    ON branch_task_instances (recurring_task_id, branch_id, due_date)
  `);

  let catCount = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const result = await db.execute(
      sql`INSERT INTO branch_task_categories (key, label, icon, color, sort_order)
          VALUES (${cat.key}, ${cat.label}, ${cat.icon}, ${cat.color}, ${cat.sortOrder})
          ON CONFLICT (key) DO NOTHING`
    );
    if (result.rowCount && result.rowCount > 0) catCount++;
  }

  const adminResult = await db.execute(
    sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  );
  const adminId = adminResult.rows?.[0]?.id as string | undefined;

  if (!adminId) {
    console.log(`[BRANCH-TASKS] No admin user found, skipping sample task seeding`);
    console.log(`[BRANCH-TASKS] ${catCount} categories created, 0 sample tasks`);
    return;
  }

  let taskCount = 0;
  for (const task of SAMPLE_HQ_TASKS) {
    const existing = await db.execute(
      sql`SELECT id FROM branch_recurring_tasks
          WHERE title = ${task.title} AND branch_id IS NULL AND deleted_at IS NULL
          LIMIT 1`
    );
    if (existing.rows && existing.rows.length > 0) continue;

    await db.execute(
      sql`INSERT INTO branch_recurring_tasks (title, category, branch_id, recurrence_type, day_of_week, day_of_month, created_by_user_id, created_by_role)
          VALUES (${task.title}, ${task.category}, NULL, ${task.recurrenceType}, ${task.dayOfWeek ?? null}, ${task.dayOfMonth ?? null}, ${adminId}, 'admin')`
    );
    taskCount++;
  }

  console.log(`[BRANCH-TASKS] ${catCount} categories created, ${taskCount} sample HQ tasks created`);
}
