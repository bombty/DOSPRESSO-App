type NotificationLevel = "operational" | "tactical" | "strategic" | "personal";
type NotificationType = string;

const NOTIFICATION_LEVELS: Record<NotificationType, NotificationLevel> = {
  "task_assigned": "operational",
  "task_completed": "operational",
  "task_overdue": "operational",
  "shift_reminder": "operational",
  "checklist_incomplete": "operational",
  "stock_low": "operational",
  "equipment_fault": "operational",
  "equipment_fault_escalated": "tactical",
  "sla_breach": "tactical",
  "sla_warning": "tactical",
  "ticket_assigned": "tactical",
  "ticket_resolved": "operational",
  "feedback_received": "tactical",
  "feedback_pattern": "strategic",
  "training_assigned": "operational",
  "training_completed": "operational",
  "training_overdue": "tactical",
  "quiz_completed": "personal",
  "badge_earned": "personal",
  "certificate_issued": "personal",
  "onboarding_step": "personal",
  "leave_request": "tactical",
  "leave_approved": "personal",
  "overtime_request": "tactical",
  "disciplinary_action": "tactical",
  "payroll_reminder": "strategic",
  "payroll_calculated": "strategic",
  "danger_zone_warning": "strategic",
  "danger_zone_demotion": "strategic",
  "branch_health_alert": "strategic",
  "cross_module_insight": "strategic",
  "financial_insight": "strategic",
  "weekly_summary": "strategic",
  "daily_briefing": "tactical",
  "system_announcement": "strategic",
  "dobody_action": "tactical",
  "agenda_reminder": "personal",
  "career_progression": "personal",
};

const ROLE_NOTIFICATION_LEVELS: Record<string, NotificationLevel[]> = {
  ceo: ["strategic"],
  cgo: ["strategic", "tactical"],
  admin: ["strategic", "tactical", "operational"],
  coach: ["tactical", "operational"],
  trainer: ["tactical", "operational"],
  muhasebe_ik: ["strategic", "tactical"],
  muhasebe: ["strategic", "tactical"],
  satinalma: ["tactical", "operational"],
  mudur: ["tactical", "operational"],
  supervisor: ["operational", "personal"],
  supervisor_buddy: ["operational", "personal"],
  barista: ["operational", "personal"],
  bar_buddy: ["operational", "personal"],
  stajyer: ["operational", "personal"],
  fabrika_mudur: ["tactical", "operational"],
  fabrika_sorumlu: ["operational"],
  fabrika_personel: ["operational", "personal"],
  fabrika_pisman: ["operational"],
  fabrika_depo: ["operational"],
  fabrika_kalite: ["tactical", "operational"],
  kalite_kontrol: ["tactical", "operational"],
  gida_muhendisi: ["tactical", "operational"],
  teknik: ["tactical", "operational"],
  destek: ["tactical", "operational"],
  marketing: ["tactical", "strategic"],
};

export function shouldReceiveNotification(notificationType: string, userRole: string): boolean {
  const level = NOTIFICATION_LEVELS[notificationType];
  if (!level) return true;

  if (notificationType === "weekly_summary" && (userRole === "ceo" || userRole === "cgo")) {
    return true;
  }

  const allowedLevels = ROLE_NOTIFICATION_LEVELS[userRole];
  if (!allowedLevels) return true;

  return allowedLevels.includes(level);
}

export function getNotificationLevel(notificationType: string): NotificationLevel {
  return NOTIFICATION_LEVELS[notificationType] || "operational";
}

export function getAllowedLevelsForRole(role: string): NotificationLevel[] {
  return ROLE_NOTIFICATION_LEVELS[role] || ["operational", "personal"];
}

export function filterNotificationsForRole(
  notifications: Array<{ type?: string; [key: string]: any }>,
  userRole: string
): Array<{ type?: string; [key: string]: any }> {
  return notifications.filter((n) => {
    if (!n.type) return true;
    return shouldReceiveNotification(n.type, userRole);
  });
}
