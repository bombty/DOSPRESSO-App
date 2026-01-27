export type UserRole = 
  | 'ceo' | 'admin' | 'muhasebe' | 'satinalma' | 'pazarlama' | 'ik' 
  | 'teknik' | 'trainer' | 'coach' | 'ekipman_teknik'
  | 'supervisor' | 'supervisor_buddy' | 'barista' | 'stajyer'
  | 'fabrika_mudur' | 'fabrika_sorumlu' | 'fabrika_personel';

const HQ_ROLES: UserRole[] = ['ceo', 'admin', 'muhasebe', 'satinalma', 'pazarlama', 'ik', 'teknik', 'trainer', 'coach', 'ekipman_teknik'];
const HQ_NON_CEO_ROLES: UserRole[] = ['admin', 'muhasebe', 'satinalma', 'pazarlama', 'ik', 'teknik', 'trainer', 'coach', 'ekipman_teknik'];
const BRANCH_ROLES: UserRole[] = ['supervisor', 'supervisor_buddy', 'barista', 'stajyer'];
const FACTORY_ROLES: UserRole[] = ['fabrika_mudur', 'fabrika_sorumlu', 'fabrika_personel'];

export const QUICK_ACTIONS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: [],
  admin: ['announcements', 'settings'],
  muhasebe: ['reports'],
  satinalma: ['stock'],
  pazarlama: ['announcements'],
  ik: ['personnel', 'leaves', 'shifts'],
  teknik: [],
  trainer: ['new-task', 'academy'],
  coach: ['new-task', 'reports'],
  ekipman_teknik: [],
  supervisor: ['new-task', 'checklist', 'academy', 'shifts', 'leaves', 'personnel'],
  supervisor_buddy: ['new-task', 'checklist', 'academy', 'shifts'],
  barista: ['checklist', 'academy', 'shifts', 'leaves'],
  stajyer: ['checklist', 'academy'],
  fabrika_mudur: ['production', 'shifts', 'reports', 'personnel', 'stock'],
  fabrika_sorumlu: ['production', 'shifts'],
  fabrika_personel: ['production', 'shifts'],
};

export const MODULES_BY_ROLE: Record<UserRole, string[]> = {
  ceo: [],
  admin: ['admin'],
  muhasebe: ['reports', 'satinalma'],
  satinalma: ['satinalma'],
  pazarlama: ['admin'],
  ik: ['hr', 'operations'],
  teknik: ['equipment'],
  trainer: ['training'],
  coach: ['operations', 'training', 'reports'],
  ekipman_teknik: ['equipment'],
  supervisor: ['operations', 'equipment', 'training', 'hr'],
  supervisor_buddy: ['operations', 'equipment', 'training'],
  barista: ['training'],
  stajyer: [],
  fabrika_mudur: ['factory', 'satinalma', 'reports'],
  fabrika_sorumlu: ['factory'],
  fabrika_personel: ['factory'],
};

export const STATS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: [],
  admin: [],
  muhasebe: ['revenue', 'expenses', 'invoices'],
  satinalma: ['orders', 'suppliers', 'stock'],
  pazarlama: ['campaigns', 'announcements'],
  ik: ['personnel', 'leaves', 'attendance'],
  teknik: ['faults', 'equipment', 'sla'],
  trainer: ['courses', 'students', 'completions'],
  coach: ['branches', 'performance', 'tasks'],
  ekipman_teknik: ['faults', 'equipment', 'sla'],
  supervisor: ['tasks', 'faults', 'checklist', 'personnel'],
  supervisor_buddy: ['tasks', 'faults', 'checklist'],
  barista: ['tasks', 'checklist'],
  stajyer: ['checklist'],
  fabrika_mudur: ['production', 'quality', 'stock', 'personnel'],
  fabrika_sorumlu: ['production', 'quality', 'stock'],
  fabrika_personel: ['production', 'shifts'],
};

export const NAV_ITEMS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: ['home', 'ai', 'profile'],
  admin: ['home', 'admin', 'profile'],
  muhasebe: ['home', 'reports', 'crm', 'profile'],
  satinalma: ['home', 'crm', 'profile'],
  pazarlama: ['home', 'admin', 'profile'],
  ik: ['home', 'hr', 'crm', 'profile'],
  teknik: ['home', 'equipment', 'crm', 'profile'],
  trainer: ['home', 'academy', 'crm', 'profile'],
  coach: ['home', 'operations', 'crm', 'profile'],
  ekipman_teknik: ['home', 'equipment', 'crm', 'profile'],
  supervisor: ['home', 'academy', 'crm', 'fault', 'profile'],
  supervisor_buddy: ['home', 'academy', 'crm', 'fault', 'profile'],
  barista: ['home', 'academy', 'fault', 'profile'],
  stajyer: ['home', 'academy', 'profile'],
  fabrika_mudur: ['home', 'factory', 'crm', 'profile'],
  fabrika_sorumlu: ['home', 'factory', 'profile'],
  fabrika_personel: ['home', 'factory', 'profile'],
};

export const WIDGET_VISIBILITY: Record<string, UserRole[]> = {
  'unified-hero': [...BRANCH_ROLES, ...FACTORY_ROLES],
  'compact-stats': [...BRANCH_ROLES, ...FACTORY_ROLES, 'teknik', 'ekipman_teknik'],
  'ai-summary': ['ceo', 'admin', 'coach'],
  'branch-scorecard': [...BRANCH_ROLES, 'coach'],
  'personnel-status': ['supervisor', 'supervisor_buddy', 'ik', 'fabrika_mudur'],
  'critical-alerts': [...HQ_NON_CEO_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  'quick-actions': [...BRANCH_ROLES, ...FACTORY_ROLES, 'teknik', 'ekipman_teknik', 'trainer', 'ik', 'satinalma', 'pazarlama', 'muhasebe'],
  'module-cards': [...HQ_NON_CEO_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  'mini-calendar': [...BRANCH_ROLES, ...FACTORY_ROLES],
  'activity-timeline': [...HQ_NON_CEO_ROLES, 'supervisor', 'supervisor_buddy'],
};

export function isRoleAllowed(role: string | undefined, allowedRoles: UserRole[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role as UserRole);
}

export function getQuickActionsForRole(role: string | undefined): string[] {
  if (!role) return [];
  return QUICK_ACTIONS_BY_ROLE[role as UserRole] || [];
}

export function getModulesForRole(role: string | undefined): string[] {
  if (!role) return [];
  return MODULES_BY_ROLE[role as UserRole] || [];
}

export function getStatsForRole(role: string | undefined): string[] {
  if (!role) return [];
  return STATS_BY_ROLE[role as UserRole] || [];
}

export function canSeeWidget(role: string | undefined, widgetId: string): boolean {
  if (!role) return false;
  const allowedRoles = WIDGET_VISIBILITY[widgetId];
  if (!allowedRoles) return true;
  return allowedRoles.includes(role as UserRole);
}

export function isHQRole(role: string | undefined): boolean {
  if (!role) return false;
  return HQ_ROLES.includes(role as UserRole);
}

export function isBranchRole(role: string | undefined): boolean {
  if (!role) return false;
  return BRANCH_ROLES.includes(role as UserRole);
}

export function isFactoryRole(role: string | undefined): boolean {
  if (!role) return false;
  return FACTORY_ROLES.includes(role as UserRole);
}
