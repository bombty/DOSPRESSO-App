export type UserRole = 
  | 'ceo' | 'admin' | 'muhasebe' | 'satinalma' | 'pazarlama' | 'ik' 
  | 'teknik' | 'trainer' | 'coach' | 'ekipman_teknik'
  | 'supervisor' | 'supervisor_buddy' | 'barista' | 'stajyer'
  | 'fabrika_mudur' | 'fabrika_sorumlu' | 'fabrika_personel';

const HQ_ROLES: UserRole[] = ['ceo', 'admin', 'muhasebe', 'satinalma', 'pazarlama', 'ik', 'teknik', 'trainer', 'coach', 'ekipman_teknik'];
const BRANCH_ROLES: UserRole[] = ['supervisor', 'supervisor_buddy', 'barista', 'stajyer'];
const FACTORY_ROLES: UserRole[] = ['fabrika_mudur', 'fabrika_sorumlo', 'fabrika_personel'] as UserRole[];

export const QUICK_ACTIONS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: [],
  admin: [],
  muhasebe: ['reports'],
  satinalma: ['suppliers', 'orders'],
  pazarlama: ['announcements', 'banners'],
  ik: ['personnel', 'leaves', 'shifts'],
  teknik: ['fault', 'equipment'],
  trainer: ['academy', 'courses'],
  coach: ['branches', 'performance'],
  ekipman_teknik: ['fault', 'equipment'],
  supervisor: ['new-task', 'checklist', 'fault', 'academy', 'shifts', 'qr-scan'],
  supervisor_buddy: ['new-task', 'checklist', 'fault', 'academy', 'shifts'],
  barista: ['checklist', 'fault', 'academy', 'shifts'],
  stajyer: ['checklist', 'academy', 'shifts'],
  fabrika_mudur: ['production', 'quality', 'shifts', 'fault'],
  fabrika_sorumlu: ['production', 'quality', 'shifts'],
  fabrika_personel: ['production', 'shifts'],
};

export const MODULES_BY_ROLE: Record<UserRole, string[]> = {
  ceo: ['reports'],
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
  barista: ['operations', 'training'],
  stajyer: ['operations', 'training'],
  fabrika_mudur: ['factory', 'satinalma', 'reports'],
  fabrika_sorumlu: ['factory'],
  fabrika_personel: ['factory'],
};

export const STATS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: ['revenue', 'branches', 'performance'],
  admin: ['system', 'users', 'permissions'],
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
  stajyer: ['tasks', 'checklist', 'academy'],
  fabrika_mudur: ['production', 'quality', 'stock', 'personnel'],
  fabrika_sorumlu: ['production', 'quality', 'stock'],
  fabrika_personel: ['production', 'shifts'],
};

export const NAV_ITEMS_BY_ROLE: Record<UserRole, string[]> = {
  ceo: ['home', 'reports', 'ai', 'profile'],
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
  'ai-summary': HQ_ROLES,
  'branch-scorecard': [...BRANCH_ROLES, 'coach'],
  'personnel-status': ['supervisor', 'supervisor_buddy', 'ik', 'fabrika_mudur'],
  'critical-alerts': [...HQ_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  'quick-actions': [...BRANCH_ROLES, ...FACTORY_ROLES, 'teknik', 'ekipman_teknik', 'trainer'],
  'module-cards': [...HQ_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  'mini-calendar': [...BRANCH_ROLES, ...FACTORY_ROLES],
  'activity-timeline': [...HQ_ROLES, 'supervisor', 'supervisor_buddy'],
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
