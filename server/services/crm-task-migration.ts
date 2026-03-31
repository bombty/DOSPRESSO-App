import { db } from "../db";
import { sql } from "drizzle-orm";

export async function migrateCrmTaskTables() {
  try {
    await db.execute(sql.raw(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'hq_manual';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_group_id INTEGER;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_role TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_branch_ids TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS task_groups (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_by_id INTEGER,
        target_branch_ids TEXT,
        target_role TEXT,
        source_type TEXT DEFAULT 'hq_manual',
        priority TEXT DEFAULT 'medium',
        due_date TIMESTAMP,
        task_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `));

    await db.execute(sql.raw(`
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS resolved_by_id INTEGER;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS hq_note TEXT;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS hq_alerted BOOLEAN DEFAULT false;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS branch_response_at TIMESTAMP;
      ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS visibility_level TEXT DEFAULT 'branch';
    `));

    await db.execute(sql.raw(`
      ALTER TABLE feedback_responses ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
      ALTER TABLE feedback_responses ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
      ALTER TABLE guest_complaints ADD COLUMN IF NOT EXISTS hq_note TEXT;
      ALTER TABLE guest_complaints ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
    `));

    console.log("[CrmTaskMigration] Tables ready");
  } catch (err) {
    console.error("[CrmTaskMigration] Error:", err);
  }
}
