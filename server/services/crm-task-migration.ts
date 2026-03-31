import { pool } from "../db";

export async function migrateCrmTaskTables(): Promise<void> {
  const client = await pool.connect();
  try {
    // tasks tablosuna P0 kolonları
    await client.query(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'hq_manual',
        ADD COLUMN IF NOT EXISTS task_group_id INTEGER,
        ADD COLUMN IF NOT EXISTS total_assigned INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS notify_assigner BOOLEAN DEFAULT true;
    `);

    // task_groups tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_groups (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_by_id TEXT,
        source_type TEXT DEFAULT 'hq_manual',
        target_branch_ids TEXT,
        target_roles TEXT,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // customer_feedback SLA + iç not kolonları
    await client.query(`
      ALTER TABLE customer_feedback
        ADD COLUMN IF NOT EXISTS sla_deadline_hours INTEGER DEFAULT 24,
        ADD COLUMN IF NOT EXISTS branch_response_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS branch_response_text TEXT,
        ADD COLUMN IF NOT EXISTS branch_responder_id TEXT,
        ADD COLUMN IF NOT EXISTS hq_note TEXT,
        ADD COLUMN IF NOT EXISTS hq_note_by_id TEXT,
        ADD COLUMN IF NOT EXISTS hq_note_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS hq_intervention_required BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS hq_intervention_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS feedback_status TEXT DEFAULT 'open';
    `);

    // Mevcut feedback'leri migrate et
    await client.query(`
      UPDATE customer_feedback SET feedback_status = 'closed'
      WHERE feedback_status IS NULL AND created_at < NOW() - INTERVAL '7 days';
    `);
    await client.query(`
      UPDATE customer_feedback SET feedback_status = 'open'
      WHERE feedback_status IS NULL;
    `);

    // source_type için mevcut tasks'ları güncelle
    await client.query(`
      UPDATE tasks SET source_type = 'periodic'
      WHERE source_type IS NULL AND checklist_id IS NOT NULL;
    `);
    await client.query(`
      UPDATE tasks SET source_type = 'hq_manual'
      WHERE source_type IS NULL;
    `);

    console.log("[CRMTaskMigration] ✅ Tables ready");
  } catch (err) {
    console.error("[CRMTaskMigration] Error:", err);
  } finally {
    client.release();
  }
}
