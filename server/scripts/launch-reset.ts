import { db } from "../db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const CONFIRM_CODE = process.argv[2];
if (CONFIRM_CODE !== "LAUNCH-2026-DOSPRESSO") {
  console.error("SAFETY CHECK: Run with confirmation code:");
  console.error("  npx tsx server/scripts/launch-reset.ts LAUNCH-2026-DOSPRESSO");
  process.exit(1);
}

async function launchReset() {
  console.log("═══════════════════════════════════════");
  console.log("DOSPRESSO LAUNCH RESET — STARTING");
  console.log("═══════════════════════════════════════");

  const tablesToClear = [
    "agent_pending_actions",
    "agent_action_outcomes",
    "agent_escalation_history",
    "agent_rejection_patterns",
    "agent_runs",
    "ai_agent_logs",
    "ai_usage_logs",

    "announcement_read_status",
    "announcements",
    "broadcast_receipts",
    "push_subscriptions",
    "reminders",

    "notifications",

    "support_ticket_comments",
    "ticket_attachments",
    "ticket_cowork_members",
    "support_tickets",

    "corrective_action_updates",
    "corrective_actions",
    "audit_item_scores",
    "audit_instance_items",
    "audit_instances",
    "branch_audit_scores",
    "branch_quality_audits",
    "quality_audits",

    "factory_production_outputs",
    "factory_break_logs",
    "factory_session_events",
    "factory_worker_scores",
    "factory_management_scores",
    "factory_shift_sessions",
    "factory_production_runs",
    "production_batches",
    "production_records",
    "factory_daily_targets",
    "production_lots",
    "coffee_roasting_logs",

    "kiosk_sessions",

    "branch_break_logs",
    "branch_shift_events",
    "branch_shift_sessions",
    "branch_shift_daily_summary",
    "branch_weekly_attendance_summary",

    "attendance_penalties",
    "pdks_records",
    "scheduled_offs",
    "shift_attendance",
    "shift_corrections",
    "shift_swap_requests",
    "shift_trade_requests",
    "shift_checklists",
    "shift_tasks",

    "task_status_history",
    "task_assignees",
    "task_ratings",
    "task_evidence",
    "task_steps",
    "role_task_completions",
    "branch_task_instances",
    "branch_recurring_task_overrides",

    "checklist_task_completions",
    "checklist_completions",
    "checklist_ratings",
    "checklist_assignments",

    "user_training_progress",
    "user_quiz_attempts",
    "quiz_results",
    "training_completions",
    "training_assignments",
    "professional_training_progress",
    "professional_training_quiz_cache",
    "user_badges",
    "user_pack_progress",
    "user_practice_sessions",
    "user_mission_progress",
    "daily_missions",
    "dobody_flow_completions",

    "issued_certificates",

    "user_career_progress",
    "career_score_history",

    "employee_performance_scores",
    "staff_evaluations",
    "employee_satisfaction_scores",
    "employee_onboarding_progress",
    "employee_onboarding_assignments",
    "employee_of_month_awards",
    "staff_qr_ratings",

    "customer_feedback",
    "campaign_metrics",
    "campaign_branches",
    "campaigns",

    "waste_action_links",
    "waste_lots",
    "waste_events",

    "supplier_performance_scores",
    "supplier_issues",
    "supplier_quotes",
    "purchase_order_payments",
    "purchase_order_items",
    "purchase_orders",

    "branch_stock_movements",
    "stock_count_items",
    "stock_counts",
    "branch_order_items",
    "branch_orders",
    "branch_inventory",

    "daily_cash_reports",
    "cari_transactions",

    "recipe_notifications",

    "project_task_dependencies",
    "project_tasks",
    "project_comments",
    "project_members",
    "project_milestones",
    "project_phases",
    "project_risks",
    "project_budget_lines",
    "project_vendors",

    "employee_documents",
    "employee_leaves",
    "employee_tax_ledger",
    "salary_deductions",
    "branch_monthly_payroll_summary",

    "disciplinary_reports",
    "employee_warnings",
    "employee_terminations",

    "webinar_registrations",

    "data_change_log",
    "data_change_requests",
    "record_revisions",
    "audit_logs",
    "backup_records",

    "import_results",
    "import_batches",

    "dashboard_alerts",

    "qr_checkin_nonces",
    "staff_qr_tokens",

    "thread_participants",

    "detailed_reports",

    "guidance_dismissals",
    "skill_notification_queue",
  ];

  let totalDeleted = 0;

  for (const table of tablesToClear) {
    try {
      const result = await db.execute(sql.raw(`DELETE FROM "${table}"`));
      const count = (result as any).rowCount || 0;
      if (count > 0) {
        console.log(`  + ${table}: ${count} rows deleted`);
        totalDeleted += count;
      } else {
        console.log(`  - ${table}: already empty`);
      }
    } catch (error: any) {
      console.log(`  X ${table}: ${error.message?.substring(0, 100)}`);
    }
  }

  console.log("\n--- Resetting ID sequences ---");
  for (const table of tablesToClear) {
    try {
      await db.execute(sql.raw(`ALTER SEQUENCE IF EXISTS "${table}_id_seq" RESTART WITH 1`));
    } catch (_e) {}
  }

  console.log("\n--- Resetting all non-admin passwords ---");
  const hashedPassword = await bcrypt.hash("Dospresso2026!", 10);
  const pwResult = await db.execute(
    sql`UPDATE users SET hashed_password = ${hashedPassword}, must_change_password = true WHERE role != 'admin'`
  );
  console.log(`  + ${(pwResult as any).rowCount} user passwords reset`);

  console.log("\n--- Clearing tasks (keeping templates) ---");
  try {
    const taskResult = await db.execute(sql.raw(`DELETE FROM tasks WHERE status IN ('completed', 'cancelled', 'in_progress', 'pending')`));
    console.log(`  + tasks: ${(taskResult as any).rowCount || 0} rows deleted`);
  } catch (e: any) {
    console.log(`  X tasks cleanup: ${e.message?.substring(0, 100)}`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("LAUNCH RESET COMPLETE");
  console.log(`Total rows deleted: ${totalDeleted}`);
  console.log("Passwords reset: all non-admin users");
  console.log("Default password: Dospresso2026!");
  console.log("═══════════════════════════════════════");

  process.exit(0);
}

launchReset().catch(err => {
  console.error("RESET FAILED:", err);
  process.exit(1);
});
