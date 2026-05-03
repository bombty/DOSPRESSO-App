import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp,
  date,
  time,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
  real,
  customType,
  uniqueIndex,
  unique,
  check,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Session storage table (required for Replit Auth)

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const UserRole = {
  // System Role
  ADMIN: "admin",
  // Executive Roles
  CEO: "ceo", // Full read access across all systems, AI Command Center
  CGO: "cgo", // Chief Growth Officer - Operasyon sorumlusu, tüm departman özeti
  // HQ Departman Rolleri
  MUHASEBE_IK: "muhasebe_ik", // Muhasebe & İK - Mahmut
  SATINALMA: "satinalma", // Satın alma - Samet
  COACH: "coach", // Şube performans ve personel - Yavuz
  MARKETING: "marketing", // Pazarlama & grafik tasarım - Diana
  TRAINER: "trainer", // Eğitim ve reçete sorumlusu - Ece
  KALITE_KONTROL: "kalite_kontrol", // Fabrika kalite ve feedback - Ümran
  GIDA_MUHENDISI: "gida_muhendisi", // Gıda güvenliği ve kalite - Sema
  FABRIKA_MUDUR: "fabrika_mudur", // Fabrika üretim ve stok - Eren
  // Eski HQ rolleri (geriye dönük uyumluluk)
  MUHASEBE: "muhasebe",
  TEKNIK: "teknik",
  DESTEK: "destek",
  FABRIKA: "fabrika",
  YATIRIMCI_HQ: "yatirimci_hq",
  // Branch Roles (Hierarchical - lowest to highest)
  STAJYER: "stajyer",
  BAR_BUDDY: "bar_buddy",
  BARISTA: "barista",
  SUPERVISOR_BUDDY: "supervisor_buddy",
  SUPERVISOR: "supervisor",
  MUDUR: "mudur", // Şube Müdürü - Branch Manager
  YATIRIMCI_BRANCH: "yatirimci_branch", // Branch investor (read-only)
  // Factory Floor Roles
  URETIM_SEFI: "uretim_sefi",
  FABRIKA_OPERATOR: "fabrika_operator",
  FABRIKA_SORUMLU: "fabrika_sorumlu",
  FABRIKA_PERSONEL: "fabrika_personel",
  FABRIKA_DEPO: "fabrika_depo",         // Fabrika depocu — malzeme çekme, stok, FEFO
  // Factory Recipe Roles
  SEF: "sef",
  RECETE_GM: "recete_gm",
  // Kiosk Roles
  SUBE_KIOSK: "sube_kiosk",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// HQ and Branch role sets
export const HQ_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.ADMIN,
  UserRole.CEO,
  UserRole.CGO,
  UserRole.MUHASEBE_IK,
  UserRole.MUHASEBE,
  UserRole.SATINALMA,
  UserRole.COACH,
  UserRole.MARKETING,
  UserRole.TRAINER,
  UserRole.KALITE_KONTROL,
  UserRole.GIDA_MUHENDISI,
  UserRole.FABRIKA_MUDUR,
  UserRole.TEKNIK,
  UserRole.DESTEK,
  UserRole.FABRIKA,
  UserRole.YATIRIMCI_HQ,
  UserRole.SEF,
  UserRole.RECETE_GM,
]);

// Executive roles with full read access
export const EXECUTIVE_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.ADMIN,
  UserRole.CEO,
  UserRole.CGO,
]);

// HQ departman rolleri - her biri kendi dashboard'una sahip
export const HQ_DEPARTMENT_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.CGO,
  UserRole.MUHASEBE_IK,
  UserRole.SATINALMA,
  UserRole.COACH,
  UserRole.MARKETING,
  UserRole.TRAINER,
  UserRole.KALITE_KONTROL,
  UserRole.GIDA_MUHENDISI,
  UserRole.FABRIKA_MUDUR,
]);

// Her departman rolünün dashboard yolu
export const DEPARTMENT_DASHBOARD_ROUTES: Record<string, string> = {
  [UserRole.CEO]: '/ceo-command-center',
  [UserRole.CGO]: '/cgo-command-center',
  [UserRole.MUHASEBE_IK]: '/hq-dashboard/ik',
  // F34 ✅ KAPANDI (3 May 2026, Wave B-4): Saf MUHASEBE rolü için dashboard alias.
  // Önceden sadece MUHASEBE_IK vardı → MUHASEBE login → '/' fallback.
  // Şimdi: MUHASEBE da ik dashboard'una yönlenir (muhasebe + ik aynı modül erişimi).
  [UserRole.MUHASEBE]: '/hq-dashboard/ik',
  [UserRole.SATINALMA]: '/hq-dashboard/satinalma',
  [UserRole.COACH]: '/hq-dashboard/coach',
  [UserRole.MARKETING]: '/hq-dashboard/marketing',
  [UserRole.TRAINER]: '/hq-dashboard/trainer',
  [UserRole.KALITE_KONTROL]: '/hq-dashboard/kalite',
  [UserRole.GIDA_MUHENDISI]: '/gida-guvenligi-dashboard',
  [UserRole.FABRIKA_MUDUR]: '/hq-dashboard/fabrika',
};

// Check if role has dedicated dashboard
export function hasDedicatedDashboard(role: UserRoleType): boolean {
  return role in DEPARTMENT_DASHBOARD_ROUTES;
}

// Get dashboard route for role
export function getDashboardRoute(role: UserRoleType): string {
  return DEPARTMENT_DASHBOARD_ROUTES[role] || '/';
}

// Check if role is an executive role
export function isExecutiveRole(role: UserRoleType): boolean {
  return EXECUTIVE_ROLES.has(role);
}

export const BRANCH_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.STAJYER,
  UserRole.BAR_BUDDY,
  UserRole.BARISTA,
  UserRole.SUPERVISOR_BUDDY,
  UserRole.SUPERVISOR,
  UserRole.MUDUR,
  UserRole.YATIRIMCI_BRANCH,
  UserRole.SUBE_KIOSK,
]);

export const FACTORY_FLOOR_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.FABRIKA_OPERATOR,
  UserRole.FABRIKA_SORUMLU,
  UserRole.FABRIKA_PERSONEL,
]);

export function isFactoryFloorRole(role: UserRoleType): boolean {
  return FACTORY_FLOOR_ROLES.has(role);
}

// ========================================
// SIMPLIFIED SIDEBAR MENU SYSTEM (v2)
// Static menu blueprint - no database required
// Server-side RBAC filtering only
// ========================================

export type SidebarMenuScope = 'branch' | 'hq' | 'both';
export type SidebarMenuGroup = 'operations' | 'management' | 'settings';

export interface SidebarMenuItem {
  id: string;
  titleTr: string;
  path: string;
  icon: string;
  moduleKey: PermissionModule;
  scope: SidebarMenuScope;
  badge?: string;
  alwaysVisible?: boolean;
}

export interface SidebarMenuSection {
  id: string;
  titleTr: string;
  icon: string;
  scope: SidebarMenuScope;
  group: SidebarMenuGroup;
  items: SidebarMenuItem[];
}

// API response type for frontend consumption
export interface SidebarMenuResponse {
  sections: SidebarMenuSection[];
  badges: Record<string, number>; // Badge counts (notifications, messages, etc.)
  meta: {
    userId: string;
    role: UserRoleType;
    scope: 'branch' | 'hq' | 'admin';
    timestamp: number;
  };
}

// Helper functions for role checking
export function isHQRole(role: UserRoleType): boolean {
  return HQ_ROLES.has(role);
}

export function isBranchRole(role: UserRoleType): boolean {
  return BRANCH_ROLES.has(role);
}

const FACTORY_ROLES = new Set<UserRoleType>(['fabrika_mudur', 'uretim_sefi', 'fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel', 'fabrika_depo', 'sef', 'recete_gm']);

export function isFactoryRole(role: UserRoleType): boolean {
  return FACTORY_ROLES.has(role);
}

// Permission types
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type PermissionModule = 
  | 'dashboard'
  | 'tasks'
  | 'checklists'
  | 'equipment'
  | 'equipment_faults'
  | 'faults'
  | 'knowledge_base'
  | 'ai_assistant'
  | 'performance'
  | 'attendance'
  | 'branches'
  | 'users'
  | 'employees'
  | 'hr'
  | 'training'
  | 'schedules'
  | 'messages'
  | 'announcements'
  | 'complaints'
  | 'leave_requests'
  | 'overtime_requests'
  | 'admin_settings'
  | 'bulk_data'
  | 'accounting'
  | 'customer_satisfaction'
  // New modules for proper permission mapping
  | 'lost_found'
  | 'lost_found_hq'
  | 'projects'
  | 'reports'
  | 'support'
  | 'notifications'
  | 'quality_audit'
  | 'shifts'
  | 'settings'
  // Factory modules
  | 'factory_kiosk'
  | 'factory_dashboard'
  | 'factory_quality'
  | 'factory_analytics'
  | 'factory_stations'
  | 'factory_compliance'
  | 'factory_production'
  // Branch shift tracking
  | 'branch_shift_tracking'
  // Academy modules (maps to training permission)
  | 'academy'
  | 'academy_admin'
  | 'badges'
  | 'certificates'
  | 'leaderboard'
  | 'achievements'
  | 'team_competitions'
  | 'streak_tracker'
  | 'academy_analytics'
  | 'progress_overview'
  | 'cohort_analytics'
  | 'branch_analytics'
  | 'learning_paths'
  | 'adaptive_engine'
  | 'social_groups'
  | 'academy_supervisor'
  | 'academy_ai'
  // Satinalma modules
  | 'satinalma'
  | 'inventory'
  | 'suppliers'
  | 'purchase_orders'
  | 'goods_receipt'
  // Cost management
  | 'cost_management'
  // Branch inspection & product complaints
  | 'branch_inspection'
  | 'product_complaints'
  // Food safety
  | 'food_safety'
  // Shipments & HACCP
  | 'factory_shipments'
  | 'factory_food_safety'
  // CRM modules
  | 'crm_dashboard'
  | 'crm_feedback'
  | 'crm_complaints'
  | 'crm_campaigns'
  | 'crm_analytics'
  | 'crm_settings'
  | 'branch_orders'
  | 'branch_inventory'
  | 'ajanda';

// Path to Permission Module mapping - Merkezi tanım
// Dashboard modülleri için URL path'lerini permission modüllerine eşleştirir
export const PATH_TO_PERMISSION_MAP: Record<string, PermissionModule> = {
  // Operations
  '/operasyon': 'dashboard',
  '/subeler': 'branches',
  '/sube/dashboard': 'dashboard',
  '/gorevler': 'tasks',
  '/checklistler': 'checklists',
  '/kayip-esya': 'lost_found',
  '/kayip-esya-hq': 'lost_found_hq',
  '/vardiyalar': 'shifts',
  '/canli-takip': 'branch_shift_tracking',
  
  // Equipment
  '/ekipman': 'equipment',
  '/ekipmanlar': 'equipment',
  '/arizalar': 'faults',
  '/ariza-yonetimi': 'equipment_faults',
  '/ekipman-analitik': 'equipment',
  
  // HR
  '/personel': 'employees',
  '/izinler': 'leave_requests',
  '/mesai': 'overtime_requests',
  '/puantaj': 'attendance',
  '/pdks': 'attendance',
  '/maas': 'accounting',
  '/bordrom': 'employees',
  '/performans': 'performance',
  '/onboarding-programlar': 'hr',
  '/akademi/personel-onboarding': 'academy',
  '/akademi/onboarding-programlar': 'academy',
  
  // Training / Academy
  '/akademi': 'academy',
  '/akademi/eğitim': 'academy',
  '/akademi/oyunlaştırma': 'badges',
  '/akademi/analitik': 'academy_analytics',
  '/akademi/gelişmiş': 'adaptive_engine',
  '/akademi-leaderboard': 'leaderboard',
  '/akademi-badges': 'badges',
  '/akademi-certificates': 'certificates',
  '/akademi-achievements': 'achievements',
  '/akademi-learning-paths': 'learning_paths',
  '/akademi-quiz': 'academy',
  '/akademi-supervisor': 'academy_supervisor',
  '/akademi-analytics': 'academy_analytics',
  '/akademi-ai-assistant': 'academy_ai',
  '/egitim': 'training',
  '/receteler': 'training',
  '/recete': 'training',
  
  // Reports
  '/raporlar': 'reports',
  '/kalite-denetim': 'quality_audit',
  
  // Factory
  '/fabrika': 'factory_dashboard',
  '/fabrika-kiosk': 'factory_kiosk',
  
  // Admin
  '/admin': 'admin_settings',
  '/yetkilendirme': 'admin_settings',
  '/kullanicilar': 'users',
  '/ayarlar': 'settings',
  
  // NewShop / Projects
  '/yeni-sube': 'projects',
  '/projeler': 'projects',
  
  // Kitchen
  '/mutfak': 'training',
  
  // Support
  '/destek': 'support',
  '/bildirimler': 'notifications',
  '/duyurular': 'announcements',
  
  // Satinalma / Procurement
  '/satinalma': 'satinalma',
  '/satinalma/stok-yonetimi': 'inventory',
  '/satinalma/tedarikci-yonetimi': 'suppliers',
  '/satinalma/siparis-yonetimi': 'purchase_orders',
  '/satinalma/mal-kabul': 'goods_receipt',
  
  // Cost Management
  '/fabrika/maliyet-yonetimi': 'cost_management',
  
  // Branch Inspection & Product Complaints
  '/coach-sube-denetim': 'branch_inspection',
  '/sube-saglik-skoru': 'branch_inspection',
  '/urun-sikayet': 'product_complaints',
  '/gida-guvenligi-dashboard': 'food_safety',
  '/maliyet-yonetimi': 'cost_management',
  // CRM
  '/crm': 'crm_dashboard',
  '/misafir-memnuniyeti': 'crm_feedback',
  '/crm/ticket-talepler': 'crm_complaints',
  '/crm/kampanyalar': 'crm_campaigns',
  '/crm/analizler': 'crm_analytics',
  '/crm/ayarlar': 'crm_settings',
  '/franchise-yatirimcilar': 'crm_dashboard',
};
