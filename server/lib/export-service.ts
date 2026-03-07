import { db } from '../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const EXPORT_DIR = '/tmp/exports';

export interface ExportOptions {
  scope: 'full' | 'config_only' | 'branch';
  branchId?: number;
  includeMedia?: boolean;
  password?: string;
}

export interface ExportJob {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  totalTables: number;
  processedTables: number;
  downloadUrl?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  fileSize?: number;
}

const exportJobs = new Map<string, ExportJob>();

const CONFIG_TABLES = [
  'branches', 'roles', 'role_permissions', 'role_permission_grants',
  'role_module_permissions', 'menu_items', 'menu_sections', 'menu_visibility_rules',
  'ai_settings', 'ai_system_config', 'ai_data_domains', 'ai_domain_policies',
  'ai_policies' as any, 'site_settings', 'email_settings', 'service_email_settings',
  'employee_types', 'employee_type_policies', 'titles', 'salary_scales',
  'payroll_parameters', 'public_holidays', 'badges', 'career_levels', 'career_gates',
  'mega_module_config', 'mega_module_items', 'ops_rules', 'kpi_signal_rules',
  'feedback_form_settings', 'branding', 'certificate_design_settings',
  'dashboard_widgets', 'dashboard_widget_items', 'dashboard_module_visibility',
  'role_templates', 'role_task_templates', 'permission_modules', 'permission_actions',
];

const USERS_TABLES = [
  'users', 'user_badges', 'user_career_progress', 'user_mission_progress',
  'user_pack_progress', 'learning_streaks', 'employee_salaries',
  'employee_documents', 'employee_benefits', 'personnel_files',
];

const TRAINING_TABLES = [
  'training_modules', 'training_materials', 'module_lessons', 'module_media',
  'module_videos', 'module_quizzes', 'quiz_questions', 'quizzes',
  'content_packs', 'content_pack_items', 'flashcards',
  'professional_training_lessons', 'onboarding_templates', 'onboarding_template_steps',
  'onboarding_weeks', 'onboarding_programs',
];

const RECIPE_TABLES = [
  'recipes', 'recipe_versions', 'recipe_categories', 'product_recipe_ingredients',
  'product_recipes', 'raw_materials', 'raw_material_price_history',
  'production_ingredients',
];

const PRODUCT_TABLES = [
  'factory_products', 'product_packaging_items', 'machine_products',
];

const FACTORY_TABLES = [
  'factory_stations', 'factory_machines', 'factory_station_targets',
  'factory_teams', 'factory_team_members', 'factory_cost_settings',
  'factory_fixed_costs', 'factory_quality_specs', 'factory_waste_reasons',
  'haccp_control_points', 'waste_categories', 'waste_reasons',
];

const OPERATIONS_TABLES = [
  'tasks', 'task_assignees', 'task_evidence', 'task_steps', 'task_status_history',
  'task_ratings', 'task_triggers', 'event_triggered_tasks',
  'checklists', 'checklist_tasks', 'checklist_assignments', 'checklist_completions',
  'checklist_task_completions', 'checklist_ratings',
  'equipment', 'equipment_catalog', 'equipment_faults', 'equipment_comments',
  'equipment_calibrations', 'equipment_knowledge', 'equipment_maintenance_logs',
  'equipment_service_requests', 'equipment_troubleshooting_steps',
  'maintenance_schedules', 'maintenance_logs',
  'shifts', 'shift_attendance', 'shift_templates', 'shift_tasks', 'shift_checklists',
  'announcements', 'announcement_read_status', 'banners',
];

const CRM_TABLES = [
  'customer_feedback', 'feedback_responses', 'guest_complaints',
  'product_complaints', 'campaigns', 'campaign_branches', 'campaign_metrics',
  'staff_evaluations', 'manager_evaluations', 'manager_monthly_ratings',
];

const INVENTORY_TABLES = [
  'inventory', 'inventory_counts', 'inventory_count_assignments',
  'inventory_count_entries', 'inventory_count_reports', 'inventory_movements',
  'suppliers', 'supplier_quotes', 'supplier_certifications',
  'supplier_performance_scores', 'supplier_issues',
  'purchase_orders', 'purchase_order_items', 'purchase_order_payments',
  'goods_receipts', 'goods_receipt_items', 'procurement_items', 'procurement_proposals',
  'stock_counts', 'stock_count_items',
];

const FACTORY_OPS_TABLES = [
  'factory_shifts', 'factory_shift_workers', 'factory_shift_productions',
  'factory_production_batches', 'factory_batch_specs', 'factory_batch_verifications',
  'factory_production_outputs', 'factory_production_plans', 'factory_production_runs',
  'factory_inventory', 'factory_shipments', 'factory_shipment_items',
  'factory_quality_checks', 'factory_quality_assignments', 'factory_quality_measurements',
  'factory_quality_media', 'factory_daily_targets',
  'factory_shift_sessions', 'factory_session_events', 'factory_shift_compliance',
  'factory_staff_pins', 'factory_worker_scores', 'factory_management_scores',
  'factory_ai_reports', 'factory_break_logs',
  'coffee_roasting_logs', 'production_lots', 'production_batches',
  'production_records', 'production_cost_tracking', 'haccp_records', 'haccp_check_records',
];

const BRANCH_OPS_TABLES = [
  'branch_orders', 'branch_order_items', 'branch_inventory', 'branch_stock_movements',
  'branch_shift_sessions', 'branch_shift_events', 'branch_shift_daily_summary',
  'branch_break_logs', 'branch_kiosk_settings', 'branch_staff_pins',
  'branch_quality_audits', 'branch_audit_scores',
  'branch_monthly_payroll_summary', 'branch_weekly_attendance_summary',
];

const HR_TABLES = [
  'leave_requests', 'leave_records', 'overtime_requests',
  'attendance_penalties', 'monthly_attendance_summaries',
  'employee_warnings', 'employee_terminations', 'disciplinary_reports',
  'employee_onboarding', 'employee_onboarding_assignments',
  'employee_onboarding_progress', 'employee_onboarding_tasks',
  'employee_performance_scores', 'employee_satisfaction_scores',
  'employee_of_month_awards', 'employee_of_month_weights',
  'monthly_payrolls', 'payroll_records', 'salary_deductions', 'salary_deduction_types',
  'employee_tax_ledger', 'employee_availability', 'employee_leaves',
  'interviews', 'interview_questions', 'interview_responses',
  'job_positions', 'job_applications', 'staff_qr_ratings', 'staff_qr_tokens',
];

const KNOWLEDGE_TABLES = [
  'knowledge_base_articles', 'knowledge_base_embeddings',
  'guide_docs', 'food_safety_documents', 'food_safety_trainings',
];

const MISC_TABLES = [
  'notifications', 'reminders', 'messages', 'message_reads', 'thread_participants',
  'hq_support_tickets', 'hq_support_messages',
  'daily_missions', 'daily_cash_reports', 'financial_records',
  'corrective_actions', 'corrective_action_updates',
  'detailed_reports', 'management_reports',
  'quality_audits', 'audit_templates', 'audit_template_items',
  'audit_instances', 'audit_instance_items', 'audit_item_scores',
  'hygiene_audits', 'license_renewals',
  'lost_found_items', 'page_content',
  'training_assignments', 'training_completions', 'user_training_progress',
  'user_quiz_attempts', 'quiz_results', 'user_practice_sessions',
  'gate_attempts', 'exam_requests',
  'leaderboard_snapshots', 'career_score_history',
  'franchise_projects', 'franchise_project_phases', 'franchise_project_tasks',
  'franchise_project_comments', 'franchise_collaborators', 'franchise_onboarding',
  'projects', 'project_phases', 'project_tasks', 'project_members',
  'project_milestones', 'project_risks', 'project_comments',
  'project_budget_lines', 'project_vendors', 'project_task_dependencies',
  'phase_assignments', 'phase_sub_tasks',
  'shift_swap_requests', 'shift_trade_requests', 'shift_corrections',
  'onboarding_instances', 'onboarding_checkins', 'onboarding_documents',
  'waste_events', 'waste_lots', 'waste_action_links',
  'cari_accounts', 'cari_transactions',
  'profit_margin_templates', 'product_cost_calculations',
  'dashboard_alerts', 'recipe_notifications',
  'push_subscriptions', 'qr_checkin_nonces',
  'fault_comments', 'fault_service_tracking', 'fault_service_status_updates', 'fault_stage_transitions',
  'agent_runs', 'agent_pending_actions', 'agent_escalation_history',
  'ai_agent_logs', 'ai_usage_logs',
  'external_users', 'external_user_projects', 'external_user_audit_log',
  'import_batches', 'import_results',
  'performance_metrics', 'monthly_employee_performance',
  'org_employee_type_assignments',
  'role_task_completions',
  'hq_shift_sessions', 'hq_shift_events',
  'factory_team_sessions', 'factory_team_session_members',
  'academy_hub_categories',
  'professional_training_progress', 'professional_training_quiz_cache',
];

export const EXPORT_CATEGORIES: { name: string; tables: string[] }[] = [
  { name: 'config', tables: CONFIG_TABLES },
  { name: 'users', tables: USERS_TABLES },
  { name: 'training', tables: TRAINING_TABLES },
  { name: 'recipes', tables: RECIPE_TABLES },
  { name: 'products', tables: PRODUCT_TABLES },
  { name: 'factory', tables: FACTORY_TABLES },
  { name: 'operations', tables: OPERATIONS_TABLES },
  { name: 'crm', tables: CRM_TABLES },
  { name: 'inventory', tables: INVENTORY_TABLES },
  { name: 'factory_ops', tables: FACTORY_OPS_TABLES },
  { name: 'branch_ops', tables: BRANCH_OPS_TABLES },
  { name: 'hr', tables: HR_TABLES },
  { name: 'knowledge', tables: KNOWLEDGE_TABLES },
  { name: 'misc', tables: MISC_TABLES },
];

function getScopeTables(scope: 'full' | 'config_only' | 'branch'): string[] {
  if (scope === 'config_only') {
    return [...CONFIG_TABLES, ...PRODUCT_TABLES, ...RECIPE_TABLES, ...TRAINING_TABLES, ...FACTORY_TABLES];
  }
  return EXPORT_CATEGORIES.flatMap(c => c.tables);
}

function getCategoryForTable(tableName: string): string {
  for (const cat of EXPORT_CATEGORIES) {
    if (cat.tables.includes(tableName)) return cat.name;
  }
  return 'misc';
}

async function getExistingTables(): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set((result.rows as any[]).map(r => r.table_name));
}

export function getExportJob(jobId: string): ExportJob | undefined {
  return exportJobs.get(jobId);
}

export async function startExport(options: ExportOptions): Promise<string> {
  const jobId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const scopeTables = getScopeTables(options.scope);
  const job: ExportJob = {
    id: jobId,
    status: 'processing',
    progress: 0,
    totalTables: scopeTables.length,
    processedTables: 0,
    startedAt: new Date(),
  };
  exportJobs.set(jobId, job);

  runExport(jobId, options).catch(err => {
    const j = exportJobs.get(jobId);
    if (j) {
      j.status = 'failed';
      j.error = err.message;
    }
  });

  return jobId;
}

async function runExport(jobId: string, options: ExportOptions): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const job = exportJobs.get(jobId)!;

  const existingTables = await getExistingTables();
  const scopeTables = getScopeTables(options.scope);
  const tablesToExport = scopeTables.filter(t => existingTables.has(t));

  job.totalTables = tablesToExport.length;

  const [userCountResult] = (await db.execute(sql`SELECT count(*)::int as cnt FROM users`)).rows as any[];
  const [branchCountResult] = (await db.execute(sql`SELECT count(*)::int as cnt FROM branches`)).rows as any[];

  zip.file('manifest.json', JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    scope: options.scope,
    branchId: options.branchId || null,
    appVersion: '19.0',
    tableCount: tablesToExport.length,
    userCount: userCountResult?.cnt || 0,
    branchCount: branchCountResult?.cnt || 0,
    includeMedia: options.includeMedia || false,
  }, null, 2));

  const schemaHash = crypto.createHash('sha256')
    .update(tablesToExport.sort().join(','))
    .digest('hex');
  zip.file('schema_version.json', JSON.stringify({
    hash: schemaHash,
    tables: tablesToExport.sort(),
    exportedAt: new Date().toISOString(),
  }, null, 2));

  const tableRecordCounts: Record<string, number> = {};

  for (let i = 0; i < tablesToExport.length; i++) {
    const tableName = tablesToExport[i];
    const category = getCategoryForTable(tableName);

    try {
      let result;
      const branchId = options.scope === 'branch' && options.branchId ? Number(options.branchId) : null;
      if (branchId && !isNaN(branchId)) {
        const colResult = await db.execute(sql`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = ${tableName} AND column_name IN ('branch_id', 'branchId')
        `);
        if ((colResult.rows as any[]).length > 0) {
          const colName = (colResult.rows[0] as any).column_name;
          result = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(colName)} = ${branchId}`);
        } else {
          result = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
        }
      } else {
        result = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
      }
      const rows = result.rows || [];
      tableRecordCounts[tableName] = rows.length;

      if (rows.length > 0) {
        zip.file(`data/${category}/${tableName}.json`, JSON.stringify(rows, null, 2));
      }
    } catch (err: any) {
      console.warn(`[Export] Table ${tableName} skipped: ${err.message}`);
      tableRecordCounts[tableName] = -1;
    }

    job.processedTables = i + 1;
    job.progress = Math.round(((i + 1) / tablesToExport.length) * 100);
  }

  zip.file('record_counts.json', JSON.stringify(tableRecordCounts, null, 2));

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  zip.file('checksum.sha256', checksum);

  const finalContent = await zip.generateAsync({ type: 'nodebuffer' });
  const filePath = path.join(EXPORT_DIR, `export-${jobId}.zip`);
  fs.writeFileSync(filePath, finalContent);

  job.status = 'completed';
  job.progress = 100;
  job.completedAt = new Date();
  job.fileSize = finalContent.length;
  job.downloadUrl = `/api/admin/export/${jobId}/download`;
}

export function getExportFilePath(jobId: string): string | null {
  const filePath = path.join(EXPORT_DIR, `export-${jobId}.zip`);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

export function cleanupOldExports(): void {
  if (!fs.existsSync(EXPORT_DIR)) return;
  const files = fs.readdirSync(EXPORT_DIR);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const file of files) {
    const fp = path.join(EXPORT_DIR, file);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < oneDayAgo) {
      fs.unlinkSync(fp);
    }
  }
}
