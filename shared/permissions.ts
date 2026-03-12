import { UserRole, type UserRoleType, HQ_ROLES, BRANCH_ROLES, FACTORY_FLOOR_ROLES, type PermissionModule, type PermissionAction, hasPermission } from "./schema";

export type AcademyViewMode = 'coach' | 'employee' | 'supervisor';

export const ACADEMY_COACH_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.ADMIN,
  UserRole.COACH,
  UserRole.TRAINER,
  UserRole.KALITE_KONTROL,
]);

export const ACADEMY_SUPERVISOR_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.SUPERVISOR,
  UserRole.MUDUR,
]);

export const ACADEMY_EMPLOYEE_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.STAJYER,
  UserRole.BAR_BUDDY,
  UserRole.BARISTA,
  UserRole.SUPERVISOR_BUDDY,
  UserRole.YATIRIMCI_BRANCH,
]);

export function getAcademyViewMode(role: UserRoleType | string | undefined): AcademyViewMode {
  if (!role) return 'employee';
  if (ACADEMY_COACH_ROLES.has(role as UserRoleType)) return 'coach';
  if (ACADEMY_SUPERVISOR_ROLES.has(role as UserRoleType)) return 'supervisor';
  return 'employee';
}

export function isAcademyCoach(role: string | undefined): boolean {
  if (!role) return false;
  return ACADEMY_COACH_ROLES.has(role as UserRoleType);
}

export function isAcademySupervisor(role: string | undefined): boolean {
  if (!role) return false;
  return ACADEMY_SUPERVISOR_ROLES.has(role as UserRoleType);
}

export function isAcademyEmployee(role: string | undefined): boolean {
  if (!role) return false;
  return ACADEMY_EMPLOYEE_ROLES.has(role as UserRoleType);
}

export type AcademyTabVisibility = 'coach' | 'employee' | 'supervisor' | 'all';

export interface AcademyRoutePermission {
  path: string;
  requiredModule: PermissionModule;
  requiredAction: PermissionAction;
  visibility: AcademyTabVisibility;
  labelTr: string;
}

export const ACADEMY_ROUTE_PERMISSIONS: AcademyRoutePermission[] = [
  { path: '/akademi', requiredModule: 'academy', requiredAction: 'view', visibility: 'all', labelTr: 'Akademi Ana Sayfa' },
  { path: '/akademi/genel-egitimler', requiredModule: 'academy', requiredAction: 'view', visibility: 'employee', labelTr: 'Modüllerim' },
  { path: '/akademi/bilgi-bankasi', requiredModule: 'knowledge_base', requiredAction: 'view', visibility: 'employee', labelTr: 'Bilgi Bankası' },
  { path: '/akademi/rozetler', requiredModule: 'badges', requiredAction: 'view', visibility: 'employee', labelTr: 'Rozetlerim' },
  { path: '/akademi/sertifikalar', requiredModule: 'certificates', requiredAction: 'view', visibility: 'employee', labelTr: 'Sertifikalarım' },
  { path: '/akademi/siralama', requiredModule: 'leaderboard', requiredAction: 'view', visibility: 'employee', labelTr: 'Sıralama' },
  { path: '/akademi/basarilar', requiredModule: 'achievements', requiredAction: 'view', visibility: 'employee', labelTr: 'Başarılarım' },
  { path: '/akademi/seri-takibi', requiredModule: 'streak_tracker', requiredAction: 'view', visibility: 'employee', labelTr: 'Seri Takibi' },
  { path: '/akademi/gate-yonetim', requiredModule: 'academy', requiredAction: 'edit', visibility: 'coach', labelTr: 'Gate Yönetimi' },
  { path: '/akademi/kpi-sinyalleri', requiredModule: 'academy', requiredAction: 'edit', visibility: 'coach', labelTr: 'KPI Sinyalleri' },
  { path: '/akademi/icerik-kutuphanesi', requiredModule: 'academy', requiredAction: 'edit', visibility: 'coach', labelTr: 'İçerik Kütüphanesi' },
  { path: '/akademi/onboarding-studio', requiredModule: 'academy_admin', requiredAction: 'view', visibility: 'coach', labelTr: 'Onboarding Studio' },
  { path: '/akademi/takim-ilerleme', requiredModule: 'academy', requiredAction: 'view', visibility: 'coach', labelTr: 'Takım İlerlemesi' },
  { path: '/akademi/analitik', requiredModule: 'academy_analytics', requiredAction: 'view', visibility: 'coach', labelTr: 'Analitik' },
  { path: '/akademi/ilerleme-ozeti', requiredModule: 'progress_overview', requiredAction: 'view', visibility: 'coach', labelTr: 'İlerleme Özeti' },
  { path: '/akademi/kohort-analitik', requiredModule: 'cohort_analytics', requiredAction: 'view', visibility: 'coach', labelTr: 'Kohort Analitik' },
  { path: '/akademi/sube-analitik', requiredModule: 'branch_analytics', requiredAction: 'view', visibility: 'coach', labelTr: 'Şube Analitik' },
  { path: '/akademi/takim-yarismalar', requiredModule: 'team_competitions', requiredAction: 'view', visibility: 'all', labelTr: 'Takım Yarışmaları' },
  { path: '/akademi/ogrenme-yollari', requiredModule: 'learning_paths', requiredAction: 'view', visibility: 'all', labelTr: 'Öğrenme Yolları' },
  { path: '/akademi/uyarlanabilir-motor', requiredModule: 'adaptive_engine', requiredAction: 'view', visibility: 'all', labelTr: 'Uyarlanabilir Motor' },
  { path: '/akademi/supervisor', requiredModule: 'academy_supervisor', requiredAction: 'view', visibility: 'supervisor', labelTr: 'Supervisor Görünümü' },
  { path: '/akademi/supervisor-onboarding', requiredModule: 'academy_supervisor', requiredAction: 'view', visibility: 'supervisor', labelTr: 'Onboarding Onayları' },
  { path: '/akademi/personel-onboarding', requiredModule: 'academy', requiredAction: 'view', visibility: 'coach', labelTr: 'Personel Onboarding' },
  { path: '/akademi/onboarding-programlar', requiredModule: 'academy', requiredAction: 'view', visibility: 'supervisor', labelTr: 'Onboarding Programları' },
  { path: '/akademi/ai-kanit', requiredModule: 'academy', requiredAction: 'view', visibility: 'coach', labelTr: 'AI Kanıt' },
  { path: '/akademi/sosyal-gruplar', requiredModule: 'social_groups', requiredAction: 'view', visibility: 'coach', labelTr: 'Sosyal Gruplar' },
];

export function canAccessAcademyRoute(role: UserRoleType, path: string): boolean {
  if (role === UserRole.ADMIN) return true;

  const routeConfig = ACADEMY_ROUTE_PERMISSIONS.find(r => r.path === path);
  if (!routeConfig) return false;

  const viewMode = getAcademyViewMode(role);

  if (routeConfig.visibility !== 'all') {
    if (routeConfig.visibility === 'coach' && viewMode !== 'coach') return false;
    if (routeConfig.visibility === 'employee' && viewMode === 'coach') return false;
    if (routeConfig.visibility === 'supervisor') {
      if (viewMode !== 'supervisor' && viewMode !== 'coach') return false;
    }
  }

  return hasPermission(role, routeConfig.requiredModule, routeConfig.requiredAction);
}

export function getAcademyDefaultTab(role: string | undefined): string {
  const viewMode = getAcademyViewMode(role);
  switch (viewMode) {
    case 'coach': return 'coach-icerik-kutuphanesi';
    case 'supervisor': return 'genel-egitimler';
    default: return 'genel-egitimler';
  }
}

export const ACADEMY_COACH_API_PERMISSIONS: Record<string, { requiredModule: PermissionModule; requiredAction: PermissionAction; coachOnly: boolean }> = {
  'POST /api/academy/gates': { requiredModule: 'academy', requiredAction: 'create', coachOnly: true },
  'PUT /api/academy/gates/:id': { requiredModule: 'academy', requiredAction: 'edit', coachOnly: true },
  'POST /api/academy/gates/:id/approve': { requiredModule: 'academy', requiredAction: 'approve', coachOnly: true },
  'GET /api/academy/team-progress': { requiredModule: 'academy', requiredAction: 'view', coachOnly: true },
  'GET /api/academy/kpi-signals': { requiredModule: 'academy', requiredAction: 'view', coachOnly: true },
  'GET /api/academy/content-packs': { requiredModule: 'academy', requiredAction: 'view', coachOnly: true },
  'POST /api/academy/content-packs': { requiredModule: 'academy', requiredAction: 'create', coachOnly: true },
};
