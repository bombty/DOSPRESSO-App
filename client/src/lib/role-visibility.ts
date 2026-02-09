// Tüm roller - shared/schema.ts'deki UserRole enum ile senkronize
export type UserRole = 
  // HQ Executive & Admin Roles
  | 'ceo' | 'cgo' | 'admin'
  // HQ Department Roles
  | 'muhasebe' | 'muhasebe_ik' | 'satinalma' | 'marketing' | 'pazarlama'
  | 'teknik' | 'destek' | 'trainer' | 'coach' | 'kalite_kontrol'
  | 'fabrika_mudur' | 'fabrika' | 'yatirimci_hq' | 'ekipman_teknik' | 'ik'
  // Branch Roles
  | 'supervisor' | 'supervisor_buddy' | 'barista' | 'bar_buddy' | 'stajyer' | 'yatirimci_branch'
  // Factory Roles
  | 'fabrika_sorumlu' | 'fabrika_personel';

// HQ Rolleri - Tüm merkez çalışanları
const HQ_ROLES: UserRole[] = [
  'ceo', 'cgo', 'admin', 
  'muhasebe', 'muhasebe_ik', 'satinalma', 'marketing', 'pazarlama',
  'teknik', 'destek', 'trainer', 'coach', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika', 'yatirimci_hq', 'ekipman_teknik', 'ik'
];

// HQ Modül Kartları Görebilenler (CEO dahil - tüm HQ)
const HQ_MODULE_CARD_ROLES: UserRole[] = [
  'ceo', 'cgo', 'admin',
  'muhasebe', 'muhasebe_ik', 'satinalma', 'marketing', 'pazarlama',
  'teknik', 'destek', 'trainer', 'coach', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika', 'yatirimci_hq', 'ekipman_teknik', 'ik'
];

// Şube Rolleri
const BRANCH_ROLES: UserRole[] = ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer', 'yatirimci_branch'];

// Fabrika Rolleri
const FACTORY_ROLES: UserRole[] = ['fabrika_mudur', 'fabrika_sorumlu', 'fabrika_personel'];

// Hızlı giriş butonları - Alt menü ve modüllerle TEKRARLANMAMALI
// Bu butonlar dashboard'da hızlı aksiyon sağlar
// Alt menüde veya modüllerde zaten olan öğeleri İÇERMEMELİ
export const QUICK_ACTIONS_BY_ROLE: Record<UserRole, string[]> = {
  // Executive - Nav: ai, notifications, search/branches | Modüller: all
  ceo: ['announcements', 'tasks', 'branches'],
  cgo: ['announcements', 'tasks', 'reports'],
  admin: ['users', 'settings', 'system'],
  // HQ Departments
  muhasebe: ['invoices', 'leaves', 'attendance'],
  muhasebe_ik: ['invoices', 'leaves', 'attendance'],
  satinalma: ['suppliers', 'goods-receipt'],
  marketing: ['campaigns', 'announcements'],
  pazarlama: ['campaigns', 'announcements'],
  ik: ['leaves', 'attendance', 'personnel'],
  teknik: ['maintenance', 'sla'],
  destek: ['support', 'tickets'],
  trainer: ['courses', 'new-task'],
  coach: ['new-task', 'personnel', 'tasks'],
  kalite_kontrol: ['audits', 'branches'],
  ekipman_teknik: ['maintenance', 'sla'],
  fabrika: ['production', 'quality', 'shifts'],
  yatirimci_hq: ['announcements', 'performance'],
  // Branch Roles - Nav: checklists, academy, fault, myshifts
  supervisor: ['new-task', 'shifts', 'leaves', 'personnel'],
  supervisor_buddy: ['new-task', 'shifts', 'personnel'],
  barista: ['checklist', 'leaves'],
  bar_buddy: ['checklist'],
  stajyer: ['leaves'],
  yatirimci_branch: ['performance'],
  // Factory Roles - Nav: factory, myshifts/shifts
  fabrika_mudur: ['production', 'personnel', 'quality'],
  fabrika_sorumlu: ['production', 'quality'],
  fabrika_personel: ['production'],
};

// Admin TÜM modüllere erişebilir
const ALL_MODULES = ['operations', 'equipment', 'training', 'hr', 'reports', 'factory', 'satinalma', 'newshop', 'admin'];

export const MODULES_BY_ROLE: Record<UserRole, string[]> = {
  // Executive - CEO ve CGO tüm modüllere erişebilir (raporlama odaklı)
  ceo: ALL_MODULES,
  cgo: ALL_MODULES,
  admin: ALL_MODULES,
  // HQ Departments - Departmanlara özel modüller
  muhasebe: ['reports', 'satinalma', 'hr'],
  muhasebe_ik: ['reports', 'satinalma', 'hr'],
  satinalma: ['satinalma', 'reports', 'factory'],
  marketing: ['reports'],
  pazarlama: ['reports'],
  ik: ['hr', 'operations', 'reports'],
  teknik: ['equipment', 'reports'],
  destek: ['equipment', 'operations', 'reports'],
  trainer: ['training', 'reports'],
  coach: ['operations', 'training', 'reports', 'hr'],
  kalite_kontrol: ['factory', 'reports'],
  ekipman_teknik: ['equipment'],
  fabrika: ['factory', 'reports'],
  yatirimci_hq: ['reports'],
  // Branch Roles - Şube çalışanları
  supervisor: ['operations', 'equipment', 'training', 'hr'],
  supervisor_buddy: ['operations', 'equipment', 'training'],
  barista: ['operations', 'training'],
  bar_buddy: ['operations', 'training'],
  stajyer: ['training'],
  yatirimci_branch: ['reports'],
  // Factory Roles - Fabrika çalışanları
  fabrika_mudur: ['factory', 'satinalma', 'reports', 'hr'],
  fabrika_sorumlu: ['factory'],
  fabrika_personel: ['factory'],
};

// İstatistikler - Her rol için özelleştirilmiş metrikler
export const STATS_BY_ROLE: Record<UserRole, string[]> = {
  // Executive
  ceo: ['branches', 'revenue', 'performance', 'personnel'],
  cgo: ['branches', 'revenue', 'performance', 'personnel'],
  admin: ['branches', 'personnel', 'faults', 'tasks', 'revenue', 'performance'],
  // HQ Departments
  muhasebe: ['revenue', 'expenses', 'invoices', 'personnel'],
  muhasebe_ik: ['revenue', 'expenses', 'invoices', 'personnel', 'leaves'],
  satinalma: ['orders', 'suppliers', 'stock', 'expenses'],
  marketing: ['campaigns', 'announcements', 'engagement'],
  pazarlama: ['campaigns', 'announcements', 'engagement'],
  ik: ['personnel', 'leaves', 'attendance', 'overtime'],
  teknik: ['faults', 'equipment', 'sla', 'maintenance'],
  destek: ['faults', 'tickets', 'sla'],
  trainer: ['courses', 'students', 'completions', 'ratings'],
  coach: ['branches', 'performance', 'tasks', 'faults'],
  kalite_kontrol: ['audits', 'quality', 'compliance'],
  ekipman_teknik: ['faults', 'equipment', 'sla'],
  fabrika: ['production', 'quality', 'stock'],
  yatirimci_hq: ['branches', 'revenue', 'performance'],
  // Branch Roles
  supervisor: ['tasks', 'faults', 'checklist', 'personnel'],
  supervisor_buddy: ['tasks', 'faults', 'checklist'],
  barista: ['tasks', 'checklist'],
  bar_buddy: ['tasks', 'checklist'],
  stajyer: ['checklist'],
  yatirimci_branch: ['revenue', 'performance'],
  // Factory Roles
  fabrika_mudur: ['production', 'quality', 'stock', 'personnel'],
  fabrika_sorumlu: ['production', 'quality', 'stock'],
  fabrika_personel: ['production', 'shifts'],
};

// Alt menü - Modüller ve Hızlı İşlemlerle TEKRARLANMAMALI
// Prensip: Her katman farklı içerik sunar
// - Alt menü: En sık kullanılan navigasyon kısayolları (modüllerde olmayanlar)
// - Hızlı İşlemler: Departman özel aksiyonlar
// - Modüller: Ana bölüm kartları
export const NAV_ITEMS_BY_ROLE: Record<UserRole, string[]> = {
  // Executive - AI komut merkezi, bildirimler (raporlar+şubeler modüllerde var)
  ceo: ['home', 'ai', 'notifications', 'search', 'profile'],
  cgo: ['home', 'ai', 'branches', 'notifications', 'profile'],
  admin: ['home', 'admin', 'notifications', 'search', 'profile'],
  // HQ Departments - Departmana özel kısayollar (modüllerde olmayanlar)
  muhasebe: ['home', 'crm', 'notifications', 'search', 'profile'],
  muhasebe_ik: ['home', 'crm', 'notifications', 'search', 'profile'],
  satinalma: ['home', 'crm', 'notifications', 'search', 'profile'],
  marketing: ['home', 'notifications', 'search', 'calendar', 'profile'],
  pazarlama: ['home', 'notifications', 'search', 'calendar', 'profile'],
  ik: ['home', 'shifts', 'notifications', 'search', 'profile'],
  teknik: ['home', 'fault', 'crm', 'notifications', 'profile'],
  destek: ['home', 'fault', 'notifications', 'search', 'profile'],
  trainer: ['home', 'tasks', 'notifications', 'search', 'profile'],
  coach: ['home', 'branches', 'crm', 'notifications', 'profile'],
  kalite_kontrol: ['home', 'quality', 'notifications', 'search', 'profile'],
  ekipman_teknik: ['home', 'fault', 'crm', 'notifications', 'profile'],
  fabrika: ['home', 'stock', 'notifications', 'search', 'profile'],
  yatirimci_hq: ['home', 'branches', 'notifications', 'search', 'profile'],
  // Branch Roles - Günlük operasyon kısayolları
  supervisor: ['home', 'tasks', 'notifications', 'fault', 'profile'],
  supervisor_buddy: ['home', 'tasks', 'notifications', 'fault', 'profile'],
  barista: ['home', 'academy', 'myshifts', 'fault', 'profile'],
  bar_buddy: ['home', 'academy', 'myshifts', 'fault', 'profile'],
  stajyer: ['home', 'academy', 'notifications', 'profile'],
  yatirimci_branch: ['home', 'branches', 'notifications', 'profile'],
  // Factory Roles - Üretim odaklı kısayollar
  fabrika_mudur: ['home', 'shifts', 'notifications', 'search', 'profile'],
  fabrika_sorumlu: ['home', 'factory', 'myshifts', 'profile'],
  fabrika_personel: ['home', 'factory', 'myshifts', 'profile'],
};

// Widget görünürlük kuralları - Tüm roller için widget erişimi
export const WIDGET_VISIBILITY: Record<string, UserRole[]> = {
  // Hero widget: Tüm roller görmeli
  'unified-hero': [...HQ_ROLES, ...BRANCH_ROLES, ...FACTORY_ROLES],
  
  // İstatistik bar: Tüm roller görmeli
  'compact-stats': [...HQ_ROLES, ...BRANCH_ROLES, ...FACTORY_ROLES],
  
  // AI özet: CEO, Admin ve Coach
  'ai-summary': ['ceo', 'admin', 'coach'],
  
  // Şube scorecard: Şube rolleri ve coach
  'branch-scorecard': [...BRANCH_ROLES, 'coach'],
  
  // Personel durumu: Supervisor'lar, IK ve fabrika müdürü
  'personnel-status': ['supervisor', 'supervisor_buddy', 'ik', 'fabrika_mudur', 'admin'],
  
  // Kritik uyarılar: HQ ve supervisor'lar
  'critical-alerts': [...HQ_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  
  // Hızlı giriş: TÜM roller görmeli
  'quick-actions': [...HQ_ROLES, ...BRANCH_ROLES, ...FACTORY_ROLES],
  
  // Modül kartları: Tüm HQ (CEO dahil) ve supervisor'lar
  'module-cards': [...HQ_MODULE_CARD_ROLES, 'supervisor', 'supervisor_buddy', 'fabrika_mudur'],
  
  // Aktivite zaman çizelgesi: HQ ve supervisor'lar
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
