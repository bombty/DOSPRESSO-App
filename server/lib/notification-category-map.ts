export const NOTIFICATION_TYPE_TO_CATEGORY: Record<string, string> = {
  task_assigned: 'tasks',
  task_started: 'tasks',
  task_complete: 'tasks',
  task_completed: 'tasks',
  task_verified: 'tasks',
  task_rejected: 'tasks',
  task_overdue: 'tasks',
  task_overdue_assigner: 'tasks',
  task_acknowledged: 'tasks',
  task_check_requested: 'tasks',
  task_check_approved: 'tasks',
  task_check_rejected: 'tasks',
  task_status_changed: 'tasks',
  quick_action: 'tasks',
  
  ticket_assigned: 'crm',
  ticket_resolved: 'crm',
  sla_breach: 'crm',
  complaint: 'crm',
  feedback_alert: 'crm',
  feedback_info: 'crm',
  feedback_positive: 'crm',
  stale_quote_reminder: 'crm',
  
  stock_alert: 'stock',
  low_stock: 'stock',
  stock_count_overdue: 'stock',
  
  agent_suggestion: 'dobody',
  agent_reminder: 'dobody',
  agent_alert: 'dobody',
  agent_approval: 'dobody',
  
  fault_reported: 'faults',
  fault_assigned: 'faults',
  fault_resolved: 'faults',
  critical_fault: 'faults',
  maintenance_reminder: 'faults',
  fault_alert: 'faults',
  
  checklist_overdue: 'checklist',
  checklist_reminder: 'checklist',
  shift_checklist_complete: 'checklist',
  
  training_assigned: 'training',
  quiz_passed: 'training',
  quiz_failed: 'training',
  badge_earned: 'training',
  certificate_earned: 'training',
  module_completed: 'training',
  gate_passed: 'training',
  gate_failed: 'training',
  gate_result: 'training',
  gate_request: 'training',
  streak_milestone: 'training',
  score_change: 'training',
  
  shift_change: 'hr',
  leave_request: 'hr',
  leave_approved: 'hr',
  leave_rejected: 'hr',
  evaluation_reminder: 'hr',
  onboarding_deadline: 'hr',
  onboarding_stuck: 'hr',
  onboarding_complete: 'hr',
  capa_overdue: 'hr',
};

export function getNotificationCategory(type: string): string {
  return NOTIFICATION_TYPE_TO_CATEGORY[type] || 'tasks';
}

export const CATEGORY_LABELS: Record<string, string> = {
  tasks: 'Görevler',
  crm: 'CRM',
  stock: 'Stok',
  dobody: 'Mr. Dobody',
  faults: 'Arızalar',
  checklist: 'Checklist',
  training: 'Eğitim',
  hr: 'İK',
};
