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
  FABRIKA_OPERATOR: "fabrika_operator",
  FABRIKA_SORUMLU: "fabrika_sorumlu",
  FABRIKA_PERSONEL: "fabrika_personel",
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

const FACTORY_ROLES = new Set<UserRoleType>(['fabrika_mudur', 'fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel']);

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
  | 'branch_inventory';

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

// Permission Matrix: Define what each role can do
export const PERMISSIONS: Record<UserRoleType, Record<PermissionModule, PermissionAction[]>> = {
  // ADMIN - Full access to everything
  admin: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'delete', 'approve'],
    checklists: ['view', 'create', 'edit', 'delete'],
    equipment: ['view', 'create', 'edit', 'delete'],
    equipment_faults: ['view', 'create', 'edit', 'delete', 'approve'],
    faults: ['view', 'create', 'edit', 'delete', 'approve'],
    knowledge_base: ['view', 'create', 'edit', 'delete', 'approve'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete'],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create', 'delete'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'create', 'edit', 'delete', 'approve'],
    leave_requests: ['view', 'create', 'edit', 'approve'],
    overtime_requests: ['view', 'create', 'edit', 'approve'],
    admin_settings: ['view'],
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view', 'create', 'edit', 'delete', 'approve'],
    // New modules
    lost_found: ['view', 'create', 'edit', 'delete'],
    lost_found_hq: ['view', 'create', 'edit', 'delete'],
    projects: ['view', 'create', 'edit', 'delete', 'approve'],
    reports: ['view'],
    support: ['view', 'create', 'edit', 'delete'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'delete', 'approve'],
    shifts: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit', 'delete', 'approve'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'create', 'edit', 'delete'],
    factory_compliance: ['view', 'edit', 'approve'],
    factory_production: ['view', 'create', 'edit', 'delete'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view', 'create', 'edit', 'delete'],
    factory_food_safety: ['view', 'create', 'edit', 'approve'],
    branch_shift_tracking: ['view', 'edit'],
    // Satinalma modules
    satinalma: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    purchase_orders: ['view', 'create', 'edit', 'delete', 'approve'],
    goods_receipt: ['view', 'create', 'edit', 'delete'],
    cost_management: ['view', 'create', 'edit', 'delete'],
    branch_inspection: ['view', 'create', 'edit', 'delete', 'approve'],
    product_complaints: ['view', 'create', 'edit', 'delete', 'approve'],
    food_safety: ['view', 'create', 'edit', 'delete', 'approve'],
    // Academy modules - Admin full access
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit', 'delete'],
    badges: ['view', 'create', 'edit', 'delete'],
    certificates: ['view', 'create', 'edit', 'delete'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_feedback: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_complaints: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_campaigns: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_analytics: ['view'],
      crm_settings: ['view', 'edit'],
  },
  // HQ ROLES
  muhasebe: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - HQ full access
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit', 'delete'],
    badges: ['view', 'create', 'edit', 'delete'],
    certificates: ['view', 'create', 'edit', 'delete'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - Read access for muhasebe
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  satinalma: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view', 'create', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    faults: ['view', 'edit', 'approve'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - Full access for satinalma role
    satinalma: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    purchase_orders: ['view', 'create', 'edit', 'delete', 'approve'],
    goods_receipt: ['view', 'create', 'edit', 'delete'],
    cost_management: ['view', 'create', 'edit', 'delete'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  coach: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view', 'create', 'edit', 'approve'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'edit'],
    leave_requests: ['view', 'approve'],
    overtime_requests: ['view', 'approve'],
    admin_settings: [],
    bulk_data: ['view', 'edit'],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit', 'approve'],
    branch_inspection: ['view', 'create', 'edit', 'approve'],
    product_complaints: ['view'],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: ['view'],
    projects: ['view', 'create', 'edit', 'approve'],
    reports: ['view'],
    support: ['view', 'create', 'edit'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'approve'],
    shifts: ['view', 'create', 'edit'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: [],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view', 'edit'],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    food_safety: [],
  },
  teknik: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    faults: ['view', 'edit', 'approve'],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: ['view', 'edit'],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view', 'create', 'edit'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    // Satinalma modules - No access for teknik
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - HQ access
    academy: ['view'],
    academy_admin: ['view'],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  destek: {
    dashboard: ['view'],
    tasks: ['view', 'create'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit'],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view', 'create', 'edit', 'approve'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Satinalma modules - No access for destek
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - destek access
    academy: ['view'],
    academy_admin: ['view'],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  fabrika: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules - Factory roles have full factory access
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view', 'create', 'edit'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    // Satinalma modules - No access for fabrika
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  yatirimci_hq: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: [],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: [],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: [],
    factory_analytics: ['view'],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - HQ read access
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  // BRANCH ROLES
  supervisor: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit', 'approve'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: ['view', 'create', 'edit', 'approve'],
    hr: ['view', 'create', 'edit', 'delete'],
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: ['view', 'create', 'approve'],
    overtime_requests: ['view', 'create', 'approve'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create'],
    food_safety: [],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view', 'create', 'edit'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view', 'edit'],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],

    // Academy modules - Branch view
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: ['view'],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  supervisor_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: [],
    hr: ['view'],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  barista: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Şube personeli eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  bar_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Şube personeli eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  stajyer: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Stajyer eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  mudur: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'delete', 'approve'],
    checklists: ['view', 'create', 'edit', 'approve'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit', 'delete'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete'],
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create'],
    announcements: ['view', 'create'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: ['view', 'create', 'edit', 'approve'],
    overtime_requests: ['view', 'create', 'edit', 'approve'],
    admin_settings: [],
    bulk_data: [],
    accounting: ['view'],
    customer_satisfaction: ['view', 'create', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create', 'edit'],
    food_safety: [],
    lost_found: ['view', 'create', 'edit', 'delete'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view', 'edit'],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: ['view'],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  yatirimci_branch: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: [],
    schedules: [],
    messages: ['view'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // CEO - Full read access
  ceo: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: ['view'],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
    bulk_data: ['view'],
    accounting: ['view'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: ['view'],
      crm_analytics: ['view'],
      crm_settings: ['view'],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: ['view'],
    product_complaints: ['view'],
    food_safety: ['view'],
  },
  // CGO - Chief Growth Officer
  cgo: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view'],
    branches: ['view', 'edit'],
    users: ['view'],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
    complaints: ['view'],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
    bulk_data: ['view'],
    accounting: ['view'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view', 'create', 'edit'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view', 'create', 'edit', 'approve'],
      crm_feedback: ['view', 'create', 'edit', 'approve'],
      crm_complaints: ['view', 'create', 'edit', 'approve'],
      crm_campaigns: ['view', 'create', 'edit', 'approve'],
      crm_analytics: ['view'],
      crm_settings: ['view', 'edit'],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: ['view'],
    product_complaints: ['view'],
    food_safety: [],
  },
  // MUHASEBE_IK - Muhasebe & İK
  muhasebe_ik: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: ['view'],
    users: ['view'],
    employees: ['view', 'create', 'edit'],
    hr: ['view', 'create', 'edit'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view', 'edit', 'approve'],
    overtime_requests: ['view', 'edit', 'approve'],
    admin_settings: [],
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view', 'create', 'edit'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // MARKETING - Pazarlama
  marketing: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: ['view', 'create', 'edit'],
      crm_analytics: ['view'],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // TRAINER - Eğitim Sorumlusu
  trainer: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view', 'create', 'edit', 'delete'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // KALITE_KONTROL - Kalite Kontrol
  kalite_kontrol: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create', 'edit', 'approve'],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit'],
    shifts: [],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    food_safety: ['view'],
  },
  // GIDA_MUHENDISI - Gıda Mühendisi (Gıda Güvenliği & Kalite)
  gida_muhendisi: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view', 'create', 'edit'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view', 'create'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'edit'],
    branch_inspection: ['view', 'create', 'edit'],
    product_complaints: ['view', 'create', 'edit', 'approve'],
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'approve'],
    shifts: [],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit', 'approve'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view', 'create', 'edit'],
    factory_production: ['view', 'create', 'edit'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view', 'create', 'edit', 'approve'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    food_safety: ['view', 'create', 'edit', 'approve'],
  },
  // FABRIKA_MUDUR - Fabrika Müdürü
  fabrika_mudur: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view', 'edit'],
    branches: ['view'],
    users: [],
    employees: ['view', 'edit'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view', 'approve'],
    overtime_requests: ['view', 'approve'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view', 'edit'],
    settings: [],
    factory_kiosk: ['view', 'edit'],
    factory_dashboard: ['view', 'edit'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'create', 'edit'],
    factory_compliance: ['view', 'edit'],
    factory_production: ['view', 'create', 'edit'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view', 'create', 'edit'],
    factory_food_safety: ['view', 'create', 'edit'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: ['view'],
    inventory: ['view', 'edit'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view', 'create', 'edit'],
    cost_management: ['view', 'create', 'edit'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // FABRIKA_OPERATOR - Fabrika Operatör
  fabrika_operator: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'edit'],
    factory_analytics: [],
    factory_stations: ['view'],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  fabrika_sorumlu: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create'],
    leave_requests: ['view', 'create'],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: [],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'edit'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  fabrika_personel: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: [],
    factory_stations: ['view'],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
};

// Helper function to check permissions
export function hasPermission(
  role: UserRoleType,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const modulePermissions = PERMISSIONS[role]?.[module];
  return modulePermissions?.includes(action) ?? false;
}

// Helper function to check if user can access a module at all
export function canAccessModule(role: UserRoleType, module: PermissionModule): boolean {
  const modulePermissions = PERMISSIONS[role]?.[module];
  return (modulePermissions?.length ?? 0) > 0;
}

// Branches table (declared first since users references it)
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  managerName: varchar("manager_name", { length: 255 }),
  openingHours: time("opening_hours", { precision: 0 }).default(sql`'08:00'::time`),
  closingHours: time("closing_hours", { precision: 0 }).default(sql`'22:00'::time`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  shiftCornerPhotoUrl: text("shift_corner_photo_url"),
  shiftCornerLatitude: numeric("shift_corner_latitude", { precision: 10, scale: 7 }),
  shiftCornerLongitude: numeric("shift_corner_longitude", { precision: 10, scale: 7 }),
  qrCodeToken: varchar("qr_code_token", { length: 64 }),
  geoRadius: integer("geo_radius").default(50),
  wifiSsid: varchar("wifi_ssid", { length: 100 }),
  checkInMethod: varchar("check_in_method", { length: 20 }).default("both"), // rfid, qr, or both
  // Customer Feedback QR & Social Media Integration
  feedbackQrToken: varchar("feedback_qr_token", { length: 64 }), // Unique token for customer feedback QR
  googleMapsUrl: text("google_maps_url"), // Google Maps/Business URL for review aggregation
  instagramHandle: varchar("instagram_handle", { length: 100 }), // Instagram handle for review tracking
  // Kiosk Authentication
  kioskUsername: varchar("kiosk_username", { length: 50 }), // Şube kiosk giriş kullanıcı adı
  kioskPassword: varchar("kiosk_password", { length: 100 }),
  ownershipType: varchar("ownership_type", { length: 20 }).default("franchise"),
  deletedAt: timestamp("deleted_at"),
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Users table (Username/Password Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default(UserRole.BARISTA),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  // HR/Employee fields
  hireDate: date("hire_date"),
  probationEndDate: date("probation_end_date"),
  birthDate: date("birth_date"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  // AI Photo Analysis Quota (10/day for dress code, task verification, etc.)
  dailyPhotoCount: integer("daily_photo_count").default(0).notNull(),
  lastPhotoDate: date("last_photo_date"),
  // Account approval workflow
  accountStatus: varchar("account_status", { length: 20 }).notNull().default("approved"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  // Employment type and hours for shift planning
  employmentType: varchar("employment_type", { length: 20 }).default("fulltime"), // fulltime, parttime
  weeklyHours: integer("weekly_hours").default(45), // 45 for fulltime, custom for parttime
  skillScore: integer("skill_score").default(50), // 0-100, for AI planning balance
  // Extended HR fields
  tckn: varchar("tckn", { length: 11 }), // Turkish ID number
  gender: varchar("gender", { length: 20 }), // Erkek, Kadın
  maritalStatus: varchar("marital_status", { length: 30 }), // Bekar, Evli, Boşanmış, Dul
  department: varchar("department", { length: 100 }), // BAR, Fabrika, etc.
  address: text("address"), // Home address
  city: varchar("city", { length: 100 }), // City (separate from branch city)
  militaryStatus: varchar("military_status", { length: 30 }), // Tamamlandı, Tecilli, Muaf, Tamamlanmadı
  educationLevel: varchar("education_level", { length: 100 }), // Lise, Ön Lisans, Lisans
  educationStatus: varchar("education_status", { length: 50 }), // Mezun, Öğrenci
  educationInstitution: varchar("education_institution", { length: 255 }), // School/University name
  contractType: varchar("contract_type", { length: 50 }), // Süresiz, Süreli
  homePhone: varchar("home_phone", { length: 20 }), // Home phone number
  numChildren: integer("num_children").default(0), // Number of children
  disabilityLevel: varchar("disability_level", { length: 50 }), // Yok, etc.
  leaveStartDate: date("leave_start_date"), // When employee left
  leaveReason: text("leave_reason"), // Reason for leaving
  // Salary/Compensation fields (kuruş cinsinden)
  netSalary: integer("net_salary").default(0), // Aylık net maaş
  mealAllowance: integer("meal_allowance").default(0), // Yemek yardımı
  transportAllowance: integer("transport_allowance").default(0), // Ulaşım yardımı
  bonusBase: integer("bonus_base").default(0), // Prim matrahı
  bonusType: varchar("bonus_type", { length: 30 }).default("normal"),
  bonusPercentage: numeric("bonus_percentage").default("0"),
  language: varchar("language", { length: 5 }).default("tr"),
  notificationPreferences: jsonb("notification_preferences").$type<Record<string, boolean>>(),
  titleId: integer("title_id"),
  employeeTypeId: integer("employee_type_id"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  hashedPassword: true, // Password updates handled separately
}).partial();

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Employee Warnings table
export const employeeWarnings = pgTable("employee_warnings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  warningType: varchar("warning_type", { length: 50 }).notNull(), // verbal, written, final
  description: text("description").notNull(),
  issuedBy: varchar("issued_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmployeeWarningSchema = createInsertSchema(employeeWarnings).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeWarning = z.infer<typeof insertEmployeeWarningSchema>;
export type EmployeeWarning = typeof employeeWarnings.$inferSelect;

// Checklists table
export const checklistScopeEnum = ["branch", "factory"] as const;
export type ChecklistScope = typeof checklistScopeEnum[number];

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // daily, weekly, monthly
  category: varchar("category", { length: 100 }), // opening, closing, cleaning, etc.
  scope: varchar("scope", { length: 20 }).notNull().default("branch"), // branch or factory
  isEditable: boolean("is_editable").default(true),
  editableFields: text("editable_fields").array(), // which fields branches can edit
  timeWindowStart: time("time_window_start", { precision: 0 }),
  timeWindowEnd: time("time_window_end", { precision: 0 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    if (data.timeWindowStart && data.timeWindowEnd) {
      return data.timeWindowStart < data.timeWindowEnd;
    }
    return true;
  },
  { message: "Time window start must be before end" }
);

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

// AI verification types for checklist tasks
export const aiVerificationTypeEnum = ["none", "cleanliness", "arrangement", "machine_settings", "general"] as const;
export type AiVerificationType = typeof aiVerificationTypeEnum[number];

// Checklist Tasks (many-to-many between checklists and task templates)
export const checklistTasks = pgTable("checklist_tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  requiresPhoto: boolean("requires_photo").default(false),
  // AI verification settings
  referencePhotoUrl: text("reference_photo_url"), // Reference photo for AI comparison
  tolerancePercent: integer("tolerance_percent").default(80), // Minimum acceptable similarity (0-100)
  aiVerificationType: varchar("ai_verification_type", { length: 50 }).default("none"), // none, cleanliness, arrangement, machine_settings, general
  taskTimeStart: time("task_time_start", { precision: 0 }),
  taskTimeEnd: time("task_time_end", { precision: 0 }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    return data.order > 0;
  },
  { message: "Order must be a positive integer" }
).refine(
  (data) => {
    if (data.taskTimeStart && data.taskTimeEnd) {
      return data.taskTimeStart < data.taskTimeEnd;
    }
    return true;
  },
  { message: "Task time start must be before end" }
);

export type InsertChecklistTask = z.infer<typeof insertChecklistTaskSchema>;
export type ChecklistTask = typeof checklistTasks.$inferSelect;

export const updateChecklistSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  frequency: z.string().optional(),
  category: z.string().nullable().optional(),
  isEditable: z.boolean().optional(),
  timeWindowStart: z.string().nullable().optional(),
  timeWindowEnd: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  tasks: z.array(
    z.object({
      id: z.number().nullable().optional(),
      taskDescription: z.string().min(1),
      requiresPhoto: z.boolean().default(false),
      // AI verification settings
      referencePhotoUrl: z.string().nullable().optional(),
      tolerancePercent: z.number().min(0).max(100).default(80),
      aiVerificationType: z.enum(["none", "cleanliness", "arrangement", "machine_settings", "general"]).default("none"),
      taskTimeStart: z.string().nullable().optional(),
      taskTimeEnd: z.string().nullable().optional(),
      order: z.number(),
      _action: z.enum(['delete']).optional(),
    })
  ).optional(),
}).refine(
  (data) => {
    if (data.timeWindowStart && data.timeWindowEnd) {
      return data.timeWindowStart < data.timeWindowEnd;
    }
    return true;
  },
  { message: "Time window start must be before end" }
);

export type UpdateChecklist = z.infer<typeof updateChecklistSchema>;

// ========================================
// CHECKLIST ASSIGNMENTS TABLE
// ========================================

// Assignment scope enum: user = specific user, branch = all users in branch, role = all users with specific role in branch
export const checklistAssignmentScopeEnum = ["user", "branch", "role"] as const;
export type ChecklistAssignmentScope = typeof checklistAssignmentScopeEnum[number];

// Checklist assignments table - links checklists to users/branches/roles
export const checklistAssignments = pgTable("checklist_assignments", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull(), // 'user' | 'branch' | 'role'
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "cascade" }), // For scope='user'
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }), // For scope='branch' or 'role'
  role: varchar("role", { length: 50 }), // For scope='role' - specific role in branch
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "set null" }), // Optional: link to specific shift
  effectiveFrom: date("effective_from"), // Optional: when assignment starts
  effectiveTo: date("effective_to"), // Optional: when assignment ends (null = permanent)
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  checklistIdx: index("checklist_assignments_checklist_idx").on(table.checklistId),
  userIdx: index("checklist_assignments_user_idx").on(table.assignedUserId),
  branchIdx: index("checklist_assignments_branch_idx").on(table.branchId),
  activeIdx: index("checklist_assignments_active_idx").on(table.isActive),
}));

export const insertChecklistAssignmentSchema = createInsertSchema(checklistAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistAssignment = z.infer<typeof insertChecklistAssignmentSchema>;
export type ChecklistAssignment = typeof checklistAssignments.$inferSelect;

// ========================================
// CHECKLIST COMPLETION TRACKING
// ========================================

// Checklist completion status enum
export const checklistCompletionStatusEnum = ["pending", "in_progress", "completed", "incomplete", "late"] as const;
export type ChecklistCompletionStatus = typeof checklistCompletionStatusEnum[number];

// Checklist completions - tracks each instance of a user completing a checklist
export const checklistCompletions = pgTable("checklist_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => checklistAssignments.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, incomplete, late
  scheduledDate: date("scheduled_date").notNull(), // The date this completion is for
  timeWindowStart: time("time_window_start", { precision: 0 }), // Copied from checklist template
  timeWindowEnd: time("time_window_end", { precision: 0 }), // Copied from checklist template
  startedAt: timestamp("started_at"), // When user started the checklist
  completedAt: timestamp("completed_at"), // When user finished all tasks
  submittedAt: timestamp("submitted_at"), // When user submitted for review
  isLate: boolean("is_late").default(false), // Started or completed after time window
  lateMinutes: integer("late_minutes").default(0), // How many minutes late
  totalTasks: integer("total_tasks").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
  score: integer("score").default(0), // 0-100 based on completion quality
  reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  assignmentIdx: index("checklist_completions_assignment_idx").on(table.assignmentId),
  userIdx: index("checklist_completions_user_idx").on(table.userId),
  dateIdx: index("checklist_completions_date_idx").on(table.scheduledDate),
  statusIdx: index("checklist_completions_status_idx").on(table.status),
}));

export const insertChecklistCompletionSchema = createInsertSchema(checklistCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistCompletion = z.infer<typeof insertChecklistCompletionSchema>;
export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;

// AI verification result types
export const aiVerificationResultEnum = ["passed", "failed", "pending", "skipped"] as const;
export type AiVerificationResult = typeof aiVerificationResultEnum[number];

// Checklist task completions - tracks each task completion within a checklist
export const checklistTaskCompletions = pgTable("checklist_task_completions", {
  id: serial("id").primaryKey(),
  completionId: integer("completion_id").notNull().references(() => checklistCompletions.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => checklistTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  photoUrl: text("photo_url"), // Photo evidence if required
  notes: text("notes"), // Optional notes from staff
  isLate: boolean("is_late").default(false), // Completed after task time window
  taskOrder: integer("task_order").notNull(), // Order in which this task should be completed
  // AI verification results (stored permanently even after photo deletion)
  aiVerificationResult: varchar("ai_verification_result", { length: 20 }).default("skipped"), // passed, failed, pending, skipped
  aiSimilarityScore: integer("ai_similarity_score"), // 0-100 similarity percentage
  aiVerificationNote: text("ai_verification_note"), // AI analysis explanation
  photoExpiresAt: timestamp("photo_expires_at"), // When photo will be auto-deleted (2 weeks from upload)
  photoDeleted: boolean("photo_deleted").default(false), // Flag to indicate photo was auto-deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  completionIdx: index("checklist_task_completions_completion_idx").on(table.completionId),
  taskIdx: index("checklist_task_completions_task_idx").on(table.taskId),
  photoExpiresIdx: index("checklist_task_completions_photo_expires_idx").on(table.photoExpiresAt),
}));

export const insertChecklistTaskCompletionSchema = createInsertSchema(checklistTaskCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistTaskCompletion = z.infer<typeof insertChecklistTaskCompletionSchema>;
export type ChecklistTaskCompletion = typeof checklistTaskCompletions.$inferSelect;

// ========================================
// TASK MANAGEMENT TABLES
// ========================================

// Task status enum
export const taskStatusEnum = ["beklemede", "goruldu", "devam_ediyor", "foto_bekleniyor", "incelemede", "kontrol_bekliyor", "onaylandi", "reddedildi", "gecikmiş", "ek_bilgi_bekleniyor", "tamamlandi", "basarisiz", "cevap_bekliyor", "onay_bekliyor", "sure_uzatma_talebi", "zamanlanmis"] as const;
export type TaskStatus = typeof taskStatusEnum[number];

// Task priority enum
export const taskPriorityEnum = ["düşük", "orta", "yüksek", "acil", "kritik"] as const;
export type TaskPriority = typeof taskPriorityEnum[number];

// Tasks table (actual task instances)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklistTaskId: integer("checklist_task_id").references(() => checklistTasks.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }), // Nullable for HQ tasks
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedById: varchar("assigned_by_id").references(() => users.id, { onDelete: "set null" }), // Who assigned the task
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"), // beklemede, devam_ediyor, foto_bekleniyor, incelemede, onaylandi, reddedildi, gecikmiş
  priority: varchar("priority", { length: 20 }).default("orta"), // düşük, orta, yüksek
  requiresPhoto: boolean("requires_photo").default(false), // Photo mandatory
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiScore: integer("ai_score"), // 0-100
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  // Recurring task fields
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: varchar("recurrence_type", { length: 20 }), // daily, weekly, monthly
  recurrenceInterval: integer("recurrence_interval").default(1), // Every N days/weeks/months
  lastRecurredAt: timestamp("last_recurred_at"),
  nextRunAt: timestamp("next_run_at"), // When the next recurrence should trigger
  // Task lifecycle fields
  acknowledgedAt: timestamp("acknowledged_at"), // When assignee marked as "seen"
  acknowledgedById: varchar("acknowledged_by_id").references(() => users.id, { onDelete: "set null" }),
  failureNote: text("failure_note"), // Required when status is "basarisiz"
  statusUpdatedAt: timestamp("status_updated_at"), // Last status change time
  statusUpdatedById: varchar("status_updated_by_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"), // When task was started
  // Onboarding checker fields
  isOnboarding: boolean("is_onboarding").default(false), // Is this an onboarding task
  checkerId: varchar("checker_id").references(() => users.id, { onDelete: "set null" }), // Who will verify completion
  checkedAt: timestamp("checked_at"), // When checker verified
  checkerNote: text("checker_note"), // Checker's verification note
  // Scheduled delivery fields
  scheduledDeliveryAt: timestamp("scheduled_delivery_at"), // When task should be delivered/visible
  isDelivered: boolean("is_delivered").default(true), // false = scheduled but not yet delivered
  // Assignee-Assigner approval workflow fields
  questionText: text("question_text"), // Question from assignee to assigner
  questionAnswerText: text("question_answer_text"), // Answer from assigner
  extensionReason: text("extension_reason"), // Why assignee requests deadline extension
  requestedDueDate: timestamp("requested_due_date"), // New deadline requested by assignee
  approvedByAssignerId: varchar("approved_by_assigner_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"), // When assigner approved closure
  approverNote: text("approver_note"), // Note from assigner when approving
  triggerId: integer("trigger_id"),
  occurrenceKey: varchar("occurrence_key", { length: 100 }),
  autoGenerated: boolean("auto_generated").default(false),
  evidenceType: varchar("evidence_type", { length: 20 }).default("none"),
  evidenceData: text("evidence_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchStatusIdx: index("tasks_branch_status_idx").on(table.branchId, table.status),
  assignedToIdx: index("tasks_assigned_to_idx").on(table.assignedToId),
  triggerIdempotentIdx: uniqueIndex("tasks_trigger_idempotent_idx").on(table.assignedToId, table.triggerId, table.occurrenceKey),
}));

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(taskStatusEnum).optional(),
  priority: z.enum(taskPriorityEnum).optional(),
  branchId: z.number().nullable().optional(),
  dueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  // Onboarding checker fields
  isOnboarding: z.boolean().optional(),
  checkerId: z.string().nullable().optional(),
  // Scheduled delivery
  scheduledDeliveryAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  isDelivered: z.boolean().optional(),
});

export const updateTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(taskStatusEnum).optional(),
  priority: z.enum(taskPriorityEnum).optional(),
  branchId: z.number().nullable().optional(),
  dueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  // Onboarding checker fields
  isOnboarding: z.boolean().optional(),
  checkerId: z.string().nullable().optional(),
  checkerNote: z.string().nullable().optional(),
  checkedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  startedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  // Approval workflow fields
  questionText: z.string().nullable().optional(),
  questionAnswerText: z.string().nullable().optional(),
  extensionReason: z.string().nullable().optional(),
  requestedDueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  approvedByAssignerId: z.string().nullable().optional(),
  approvedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  approverNote: z.string().nullable().optional(),
  // Scheduled delivery
  scheduledDeliveryAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  isDelivered: z.boolean().optional(),
}).partial();

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Task Status History - tracks all status changes
export const taskStatusHistory = pgTable("task_status_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedById: varchar("changed_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: text("note"), // Optional note explaining the change
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdIdx: index("task_status_history_task_idx").on(table.taskId),
}));

export const insertTaskStatusHistorySchema = createInsertSchema(taskStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskStatusHistory = z.infer<typeof insertTaskStatusHistorySchema>;
export type TaskStatusHistory = typeof taskStatusHistory.$inferSelect;

// ========================================
// TASK ASSIGNEES TABLE (Multiple assignees per task)
// ========================================

export const taskAssignees = pgTable("task_assignees", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"),
  acknowledgedAt: timestamp("acknowledged_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskUserIdx: uniqueIndex("task_assignees_task_user_idx").on(table.taskId, table.userId),
  taskIdx: index("task_assignees_task_idx").on(table.taskId),
  userIdx: index("task_assignees_user_idx").on(table.userId),
}));

export const insertTaskAssigneeSchema = createInsertSchema(taskAssignees).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskAssignee = z.infer<typeof insertTaskAssigneeSchema>;
export type TaskAssignee = typeof taskAssignees.$inferSelect;

// ========================================
// TASK RATINGS TABLE (Manual rating by assigner)
// ========================================

export const taskRatings = pgTable("task_ratings", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  ratedById: varchar("rated_by_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Assigner who rates
  ratedUserId: varchar("rated_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Assignee being rated
  rawRating: integer("raw_rating").notNull(), // What assigner submitted (1-5)
  finalRating: integer("final_rating").notNull(), // After penalty applied (1-5)
  penaltyApplied: integer("penalty_applied").default(0), // 0 or 1 (late delivery penalty)
  isLate: boolean("is_late").default(false), // Whether task was completed after deadline
  feedback: text("feedback"), // Optional comment from assigner
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdUniqueIdx: uniqueIndex("task_ratings_task_id_unique_idx").on(table.taskId), // One rating per task
  ratedUserIdx: index("task_ratings_rated_user_idx").on(table.ratedUserId),
}));

export const insertTaskRatingSchema = createInsertSchema(taskRatings).omit({
  id: true,
  createdAt: true,
}).extend({
  rawRating: z.number().min(1).max(5),
  finalRating: z.number().min(1).max(5),
  penaltyApplied: z.number().min(0).max(1).optional(),
  isLate: z.boolean().optional(),
  feedback: z.string().max(500).optional(),
});

export type InsertTaskRating = z.infer<typeof insertTaskRatingSchema>;
export type TaskRating = typeof taskRatings.$inferSelect;

// ========================================
// CHECKLIST RATINGS TABLE (Automatic rating based on completion)
// ========================================

export const checklistRatings = pgTable("checklist_ratings", {
  id: serial("id").primaryKey(),
  checklistInstanceId: integer("checklist_instance_id").notNull(), // Reference to daily checklist assignment
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Person being rated
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  completionRate: real("completion_rate").notNull(), // 0.0 - 1.0 (percentage of tasks completed)
  isOnTime: boolean("is_on_time").default(true), // Completed before deadline?
  rawScore: integer("raw_score").notNull(), // Score before penalty (1-5)
  finalScore: integer("final_score").notNull(), // After penalty applied (1-5)
  penaltyApplied: integer("penalty_applied").default(0), // 0 or 1 (late penalty)
  totalTasks: integer("total_tasks").notNull(), // How many tasks in checklist
  completedTasks: integer("completed_tasks").notNull(), // How many completed
  checklistDate: date("checklist_date").notNull(), // Which day's checklist
  scoredAt: timestamp("scored_at").defaultNow(),
}, (table) => ({
  userDateIdx: index("checklist_ratings_user_date_idx").on(table.userId, table.checklistDate),
  branchDateIdx: index("checklist_ratings_branch_date_idx").on(table.branchId, table.checklistDate),
}));

export const insertChecklistRatingSchema = createInsertSchema(checklistRatings).omit({
  id: true,
  scoredAt: true,
}).extend({
  completionRate: z.number().min(0).max(1),
  rawScore: z.number().min(1).max(5),
  finalScore: z.number().min(1).max(5),
  penaltyApplied: z.number().min(0).max(1).optional(),
});

export type InsertChecklistRating = z.infer<typeof insertChecklistRatingSchema>;
export type ChecklistRating = typeof checklistRatings.$inferSelect;

// ========================================
// EMPLOYEE SATISFACTION SCORES (Aggregated task/checklist ratings)
// ========================================

export const employeeSatisfactionScores = pgTable("employee_satisfaction_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  // Task satisfaction metrics
  taskRatingCount: integer("task_rating_count").default(0), // Total rated tasks
  taskRatingSum: real("task_rating_sum").default(0), // Sum of finalRatings
  taskSatisfactionAvg: real("task_satisfaction_avg").default(0), // Average 1-5
  taskOnTimeCount: integer("task_on_time_count").default(0), // Tasks completed on time
  taskLateCount: integer("task_late_count").default(0), // Tasks completed late
  // Checklist discipline metrics
  checklistRatingCount: integer("checklist_rating_count").default(0), // Total rated checklists
  checklistRatingSum: real("checklist_rating_sum").default(0), // Sum of finalScores
  checklistScoreAvg: real("checklist_score_avg").default(0), // Average 1-5
  checklistOnTimeCount: integer("checklist_on_time_count").default(0),
  checklistLateCount: integer("checklist_late_count").default(0),
  // Composite score (100 üzerinden)
  onTimeRate: real("on_time_rate").default(0), // Percentage of on-time completions
  compositeScore: real("composite_score").default(0), // 0-100 weighted score
  // Metadata
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdUniqueIdx: uniqueIndex("employee_satisfaction_scores_user_unique_idx").on(table.userId),
  branchIdx: index("employee_satisfaction_scores_branch_idx").on(table.branchId),
  compositeScoreIdx: index("employee_satisfaction_scores_composite_idx").on(table.compositeScore),
}));

export const insertEmployeeSatisfactionScoreSchema = createInsertSchema(employeeSatisfactionScores).omit({
  id: true,
  lastCalculatedAt: true,
  updatedAt: true,
});

export type InsertEmployeeSatisfactionScore = z.infer<typeof insertEmployeeSatisfactionScoreSchema>;
export type EmployeeSatisfactionScore = typeof employeeSatisfactionScores.$inferSelect;

// ========================================
// EQUIPMENT MANAGEMENT TABLES
// ========================================

// Equipment Types (8 types)
export const EQUIPMENT_TYPES = {
  ESPRESSO: "espresso",          // Thermoplan Espresso Machine
  KREMA: "krema",                // Krema Machine
  MIXER: "mixer",                // Artemis Mixer
  BLENDER: "blender",            // Blendtech Blender
  CASH: "cash",                  // Cash System
  KIOSK: "kiosk",                // Kiosk System
  TEA: "tea",                    // Tea Machine
  ICE: "ice",                    // Manitowock Ice Machine
} as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[keyof typeof EQUIPMENT_TYPES];

// Equipment static metadata (Turkish names, maintenance intervals, routing)
export const EQUIPMENT_METADATA: Record<EquipmentType, {
  nameTr: string;
  category: string;
  maintenanceInterval: number; // days
  maintenanceResponsible: 'branch' | 'hq';
  faultProtocol: 'branch' | 'hq_teknik';
}> = {
  espresso: {
    nameTr: "Thermoplan Espresso Makinesi",
    category: "kahve",
    maintenanceInterval: 30, // Monthly
    maintenanceResponsible: "branch",
    faultProtocol: "hq_teknik", // HQ technical team handles espresso machine faults
  },
  krema: {
    nameTr: "Krema Makinesi",
    category: "kahve",
    maintenanceInterval: 30,
    maintenanceResponsible: "branch",
    faultProtocol: "hq_teknik",
  },
  mixer: {
    nameTr: "Artemis Karıştırıcı",
    category: "mutfak",
    maintenanceInterval: 90, // Quarterly
    maintenanceResponsible: "branch",
    faultProtocol: "branch", // Branch can handle mixer issues
  },
  blender: {
    nameTr: "Blendtech Blender",
    category: "mutfak",
    maintenanceInterval: 60, // Bi-monthly
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
  cash: {
    nameTr: "Kasa Sistemi",
    category: "sistem",
    maintenanceInterval: 180, // Semi-annual
    maintenanceResponsible: "hq",
    faultProtocol: "hq_teknik",
  },
  kiosk: {
    nameTr: "Kiosk Sistemi",
    category: "sistem",
    maintenanceInterval: 90,
    maintenanceResponsible: "hq",
    faultProtocol: "hq_teknik",
  },
  tea: {
    nameTr: "Çay Makinesi",
    category: "mutfak",
    maintenanceInterval: 90,
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
  ice: {
    nameTr: "Manitowock Buz Makinesi",
    category: "mutfak",
    maintenanceInterval: 60,
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
};

// Equipment table
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  catalogId: integer("catalog_id"),
  equipmentType: varchar("equipment_type", { length: 50 }).notNull(), // espresso, krema, mixer, etc.
  modelNo: varchar("model_no", { length: 255 }), // Model numarası
  serialNumber: varchar("serial_number", { length: 255 }),
  imageUrl: text("image_url"), // Ekipman banner/görseli
  purchaseDate: date("purchase_date"),
  warrantyEndDate: date("warranty_end_date"),
  // Routing: Who maintains / handles faults
  maintenanceResponsible: varchar("maintenance_responsible", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq'
  faultProtocol: varchar("fault_protocol", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq_teknik'
  // Service contact info (HQ managed)
  serviceContactName: varchar("service_contact_name", { length: 255 }), // Servis firma adı
  serviceContactPhone: varchar("service_contact_phone", { length: 50 }), // Servis telefon
  serviceContactEmail: varchar("service_contact_email", { length: 255 }), // Servis email
  serviceContactAddress: text("service_contact_address"), // Servis adres
  serviceHandledBy: varchar("service_handled_by", { length: 20 }).default("hq"), // 'branch' (şube servisle iletişim kurar) | 'hq' (HQ yönetir)
  // Maintenance tracking
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(30),
  // QR code for quick access
  qrCodeUrl: text("qr_code_url"),
  notes: text("notes"),
  // Service scope: who services this equipment
  servicingScope: varchar("servicing_scope", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq'
  // Maximum acceptable service time in hours before alarm
  maxServiceTimeHours: integer("max_service_time_hours").default(48), // Alert threshold
  // Alarm threshold in hours - send notification when exceeded
  alertThresholdHours: integer("alert_threshold_hours").default(36),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchIdx: index("equipment_branch_idx").on(table.branchId),
  typeIdx: index("equipment_type_idx").on(table.equipmentType),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Fault Stage enum for tracking workflow
export const FAULT_STAGES = {
  BEKLIYOR: 'bekliyor',              // Waiting (just reported)
  ISLEME_ALINDI: 'isleme_alindi',    // Acknowledged by branch/HQ
  SERVIS_CAGRILDI: 'servis_cagrildi', // Service called (external repair)
  KARGOYA_VERILDI: 'kargoya_verildi', // Shipped to manufacturer
  TESLIM_ALINDI: 'teslim_alindi',    // Delivered back from repair
  TAKIP_EDILIYOR: 'takip_ediliyor',  // In progress (internal tracking)
  KAPATILDI: 'kapatildi',            // Closed (resolved)
} as const;

export type FaultStageType = typeof FAULT_STAGES[keyof typeof FAULT_STAGES];

// Priority levels for faults
export const PRIORITY_LEVELS = {
  GREEN: 'green',   // Low priority (can wait)
  YELLOW: 'yellow', // Medium priority (needs attention)
  RED: 'red',       // High priority (urgent, production impact)
} as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];

// Equipment Faults table
export const equipmentFaults = pgTable("equipment_faults", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  equipmentId: integer("equipment_id").references(() => equipment.id, { onDelete: "set null" }), // Link to equipment table
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  equipmentName: varchar("equipment_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiSeverity: varchar("ai_severity", { length: 50 }), // low, medium, high, critical
  aiRecommendations: text("ai_recommendations").array(),
  status: varchar("status", { length: 50 }).notNull().default("acik"), // acik, devam_ediyor, cozuldu (legacy)
  priority: varchar("priority", { length: 50 }).default("orta"), // dusuk, orta, yuksek (legacy)
  // New multi-stage fault tracking
  priorityLevel: varchar("priority_level", { length: 20 }).notNull().default(PRIORITY_LEVELS.YELLOW), // green, yellow, red
  currentStage: varchar("current_stage", { length: 50 }).notNull().default(FAULT_STAGES.BEKLIYOR),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }), // Assigned user (branch or HQ teknik)
  stageHistory: jsonb("stage_history").$type<Array<{
    stage: FaultStageType;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>>().default([]),
  // Cost tracking
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  // Troubleshooting requirement
  troubleshootingCompleted: boolean("troubleshooting_completed").notNull().default(false),
  completedTroubleshootingSteps: jsonb("completed_troubleshooting_steps").$type<Array<{
    stepId: number;
    completedAt: string;
    photoUrl?: string;
    notes?: string;
  }>>().default([]),
  // Detailed fault report (checkbox selections)
  faultReportDetails: jsonb("fault_report_details").$type<{
    symptoms: string[]; // Selected symptom checkboxes
    affectedAreas: string[];
    immediateImpact: boolean; // Production affected
    safetyHazard: boolean; // Safety concern
    partsIdentified: string[];
    notes: string;
  }>(),
  // Service time tracking
  serviceRequestedAt: timestamp("service_requested_at"),
  serviceAlarmSent: boolean("service_alarm_sent").default(false),
  serviceNotificationDate: timestamp("service_notification_date"),
  serviceNotificationMethod: varchar("service_notification_method", { length: 50 }),
  responsibleParty: varchar("responsible_party", { length: 20 }).default("branch"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchStageIdx: index("equipment_faults_branch_stage_idx").on(table.branchId, table.currentStage),
  equipmentIdx: index("equipment_faults_equipment_idx").on(table.equipmentId),
  troubleshootingIdx: index("equipment_faults_troubleshooting_idx").on(table.troubleshootingCompleted),
  statusIdx: index("equipment_faults_status_idx").on(table.status),
  createdIdx: index("equipment_faults_created_idx").on(table.createdAt),
}));

export const insertEquipmentFaultSchema = createInsertSchema(equipmentFaults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentFault = z.infer<typeof insertEquipmentFaultSchema>;
export type EquipmentFault = typeof equipmentFaults.$inferSelect;

// Equipment Troubleshooting Completion table - Track completed steps per fault
export const equipmentTroubleshootingCompletion = pgTable("equipment_troubleshooting_completion", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  stepId: integer("step_id").notNull().references(() => equipmentTroubleshootingSteps.id, { onDelete: "cascade" }),
  completedById: varchar("completed_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"), // If step required photo
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("troubleshooting_completion_fault_idx").on(table.faultId),
  index("troubleshooting_completion_step_idx").on(table.stepId),
  unique("unique_fault_step").on(table.faultId, table.stepId),
]);

export const insertEquipmentTroubleshootingCompletionSchema = createInsertSchema(equipmentTroubleshootingCompletion).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export type InsertEquipmentTroubleshootingCompletion = z.infer<typeof insertEquipmentTroubleshootingCompletionSchema>;
export type EquipmentTroubleshootingCompletion = typeof equipmentTroubleshootingCompletion.$inferSelect;

// Fault Stage Transitions table (audit log for stage changes)
export const faultStageTransitions = pgTable("fault_stage_transitions", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  fromStage: varchar("from_stage", { length: 50 }), // null for initial creation
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertFaultStageTransitionSchema = createInsertSchema(faultStageTransitions).omit({
  id: true,
  changedAt: true,
});

export type InsertFaultStageTransition = z.infer<typeof insertFaultStageTransitionSchema>;
export type FaultStageTransition = typeof faultStageTransitions.$inferSelect;

export const faultComments = pgTable("fault_comments", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fault_comments_fault_idx").on(table.faultId),
]);

export const insertFaultCommentSchema = createInsertSchema(faultComments).omit({
  id: true,
  createdAt: true,
});

export type InsertFaultComment = z.infer<typeof insertFaultCommentSchema>;
export type FaultComment = typeof faultComments.$inferSelect;

// Knowledge Base Articles table
export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // recipe, procedure, training (legacy: sop, maintenance)
  content: text("content").notNull(),
  tags: text("tags").array(),
  attachmentUrls: text("attachment_urls").array(),
  equipmentTypeId: varchar("equipment_type_id", { length: 100 }), // Links article to equipment type (e.g., 'espresso_machine', 'grinder')
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseArticle = z.infer<typeof insertKnowledgeBaseArticleSchema>;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;

// Knowledge Base Embeddings table (for RAG/semantic search)
export const knowledgeBaseEmbeddings = pgTable("knowledge_base_embeddings", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(), // For ordering chunks within an article
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kb_embeddings_article_idx").on(table.articleId),
]);

export const insertKnowledgeBaseEmbeddingSchema = createInsertSchema(knowledgeBaseEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseEmbedding = z.infer<typeof insertKnowledgeBaseEmbeddingSchema>;
export type KnowledgeBaseEmbedding = typeof knowledgeBaseEmbeddings.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Performance Metrics table
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksTotal: integer("tasks_total").default(0),
  completionRate: integer("completion_rate").default(0), // percentage
  averageAiScore: integer("average_ai_score").default(0),
  taskScore: integer("task_score").default(0), // 0-100 (task completion rate)
  photoScore: integer("photo_score").default(0), // 0-100 (AI photo analysis average)
  timeScore: integer("time_score").default(0), // 0-100 (on-time completion rate)
  supervisorScore: integer("supervisor_score").default(0), // 0-100 (manual supervisor rating)
  totalScore: integer("total_score").default(0), // Weighted: task 40% + photo 25% + time 25% + supervisor 10%
  faultsReported: integer("faults_reported").default(0),
  faultsResolved: integer("faults_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("performance_metrics_branch_date_idx").on(table.branchId, table.date),
  userDateIdx: index("performance_metrics_user_date_idx").on(table.userId, table.date),
  ownershipCheck: check("ownership_check", sql`branch_id IS NOT NULL OR user_id IS NOT NULL`),
}));

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
  totalScore: true, // Calculated field
}).refine(
  (data) => data.branchId !== undefined || data.userId !== undefined,
  { message: "Either branchId or userId must be provided" }
).refine(
  (data) => {
    const scores = [data.taskScore, data.photoScore, data.timeScore, data.supervisorScore];
    return scores.every(s => s === undefined || s === null || (s >= 0 && s <= 100));
  },
  { message: "All scores must be between 0 and 100" }
);

export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;

// ========================================
// TRAINING SYSTEM TABLES
// ========================================

// Training Modules (e.g., "Espresso Basics", "Latte Art", "Customer Service")
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }), // e.g., "S1", "BB2", for JSON mapping
  slug: varchar("slug", { length: 100 }), // URL-friendly slug
  category: varchar("category", { length: 100 }), // "barista", "supervisor", "hygiene", etc.
  moduleType: varchar("module_type", { length: 50 }).default("skill"), // skill, recipe, onboarding, general
  scope: varchar("scope", { length: 20 }).default("branch"), // branch, factory, both
  recipeCategoryId: integer("recipe_category_id"), // Link to recipe_categories for recipe modules
  level: varchar("level", { length: 50 }).default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").default(30), // minutes
  isPublished: boolean("is_published").default(false),
  /** @deprecated use isMandatory instead */
  isRequired: boolean("is_required").default(false),
  requiredForRole: varchar("required_for_role", { length: 100 }).array(), // ["barista", "supervisor"]
  prerequisiteModuleIds: integer("prerequisite_module_ids").array(), // Must complete these first
  heroImageUrl: text("hero_image_url"), // Module banner image
  galleryImages: jsonb("gallery_images").$type<Array<{url: string; alt?: string; uploadedAt: number}>>().default([]), // Module gallery images (optimized)
  learningObjectives: jsonb("learning_objectives").$type<string[]>().default([]), // ["Objective 1", "Objective 2"]
  steps: jsonb("steps").$type<Array<{stepNumber: number; title: string; content: string; mediaSuggestions?: string[]}>>().default([]),
  scenarioTasks: jsonb("scenario_tasks").$type<Array<{scenarioId: string; title: string; description: string; expectedActions: string[]}>>().default([]),
  supervisorChecklist: jsonb("supervisor_checklist").$type<string[]>().default([]), // Supervisor review items
  quiz: jsonb("quiz").$type<Array<{questionId: string; questionType: string; questionText: string; options: string[]; correctOptionIndex: number}>>().default([]), // Quiz questions
  tags: varchar("tags", { length: 100 }).array(), // ["kültür", "disiplin", "stajyer"]
  generatedByAi: boolean("generated_by_ai").default(false), // AI generation metadata
  xpReward: integer("xp_reward").default(50), // XP points for completing module
  mainVideoUrl: text("main_video_url"), // Primary video URL (YouTube/S3)
  mindmapData: jsonb("mindmap_data").$type<{nodes: {id: string; label: string; level: number}[]; edges: {source: string; target: string}[]}>(), // AI-generated knowledge map
  aiSummary: text("ai_summary"), // AI-generated module summary
  examPassingScore: integer("exam_passing_score").default(70), // Passing score for final exam
  maxRetries: integer("max_retries").default(3), // Max exam retry attempts
  isActive: boolean("is_active").default(true), // Active/inactive status
  
  // AI Satış Koçu & Pazarlama Desteği
  salesTips: jsonb("sales_tips").$type<Array<{phrase: string; context: string; emotion?: string}>>().default([]), // AI-generated sales phrases
  presentationGuide: jsonb("presentation_guide").$type<{
    servingInstructions: string; // Sunum talimatları
    thawingInstructions?: string; // Çözündürme talimatları (donuk ürünler için)
    heatingInstructions?: string; // Isıtma talimatları
    platingTips?: string; // Tabak düzenleme ipuçları
    storageNotes?: string; // Saklama notları
    allergenInfo?: string; // Alerjen bilgisi
  }>(), // Profesyonel sunum rehberi
  marketingContent: jsonb("marketing_content").$type<{
    socialMediaCaptions?: string[]; // Sosyal medya açıklamaları
    upsellingPhrases?: string[]; // Upselling önerileri
    customerQA?: Array<{question: string; answer: string}>; // Müşteri S&C
    productStory?: string; // Ürün hikayesi
    targetAudience?: string; // Hedef kitle
  }>(), // Pazarlama içerikleri
  aiRoleplayScenarios: jsonb("ai_roleplay_scenarios").$type<Array<{
    scenarioId: string;
    title: string;
    customerType: string; // "meraklı", "kararsız", "aceleci", "şikayetçi"
    initialMessage: string;
    expectedResponses: string[];
    tips: string[];
  }>>().default([]), // AI Rol Yapma Senaryoları
  
  targetRoles: text("target_roles").array().default(sql`'{}'::text[]`),
  isMandatory: boolean("is_mandatory").notNull().default(false),
  deadlineDays: integer("deadline_days"),
  status: varchar("status", { length: 20 }).default("approved"),
  rejectionReason: text("rejection_reason"),
  createdBy: varchar("created_by").references(() => users.id), // VARCHAR - users.id is UUID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Module Media (Images, videos, documents)
export const moduleMedia = pgTable("module_media", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  mediaType: varchar("media_type", { length: 50 }).notNull(), // "image", "video", "pdf", "document"
  objectKey: text("object_key").notNull(), // Cloud storage object key
  url: text("url").notNull(), // Public/signed URL
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Videos
export const moduleVideos = pgTable("module_videos", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(), // S3 URL or YouTube embed
  duration: integer("duration").default(0), // seconds
  orderIndex: integer("order_index").default(0),
  transcript: text("transcript"), // For AI assistant context
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Lessons (Step-by-step content)
export const moduleLessons = pgTable("module_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text content (Markdown or HTML)
  orderIndex: integer("order_index").default(0),
  estimatedDuration: integer("estimated_duration").default(5), // minutes
  lessonType: varchar("lesson_type", { length: 50 }).default("reading"), // reading, video, interactive, practice
  videoUrl: text("video_url"), // Optional embedded video
  imageUrl: text("image_url"), // Optional image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Module Quizzes
export const moduleQuizzes = pgTable("module_quizzes", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: integer("passing_score").default(70), // percentage
  timeLimit: integer("time_limit"), // minutes, null = unlimited
  isExam: boolean("is_exam").default(false), // Requires supervisor approval
  randomizeQuestions: boolean("randomize_questions").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz Questions
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  careerQuizId: integer("career_quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { length: 50 }).default("multiple_choice"), // multiple_choice, true_false, short_answer
  options: text("options").array(), // JSON array for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  correctAnswerIndex: integer("correct_answer_index").default(0),
  explanation: text("explanation"),
  points: integer("points").default(1),
  reviewStatus: varchar("review_status", { length: 20 }).default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards (AI-generated and cached for cost optimization)
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  front: text("front").notNull(), // Question/term
  back: text("back").notNull(), // Answer/definition
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 50 }).default("medium"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Training Progress
export const userTrainingProgress = pgTable("user_training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("not_started"), // not_started, in_progress, completed
  progressPercentage: integer("progress_percentage").default(0),
  videosWatched: integer("videos_watched").array().default([]), // Array of video IDs
  lastAccessedAt: timestamp("last_accessed_at"),
  completedAt: timestamp("completed_at"),
  certificateIssued: boolean("certificate_issued").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for upsert on (userId, moduleId)
  uniqueUserModule: uniqueIndex("user_training_progress_user_module_idx").on(table.userId, table.moduleId),
}));

// User Quiz Attempts
export const userQuizAttempts = pgTable("user_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  quizId: integer("quiz_id").notNull().references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  score: integer("score").default(0), // percentage
  answers: text("answers"), // JSON storing question_id -> user_answer
  isPassed: boolean("is_passed").default(false),
  timeSpent: integer("time_spent"), // seconds
  attemptNumber: integer("attempt_number").default(1),
  isExamAttempt: boolean("is_exam_attempt").default(false),
  approvedBy: varchar("approved_by").references(() => users.id), // VARCHAR - Supervisor/coach approval
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending, approved, rejected
  feedback: text("feedback"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertModuleMediaSchema = createInsertSchema(moduleMedia).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleVideoSchema = createInsertSchema(moduleVideos).omit({
  id: true,
  createdAt: true,
});

export const insertModuleLessonSchema = createInsertSchema(moduleLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleQuizSchema = createInsertSchema(moduleQuizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertUserTrainingProgressSchema = createInsertSchema(userTrainingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserQuizAttemptSchema = createInsertSchema(userQuizAttempts).omit({
  id: true,
  startedAt: true,
});

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertModuleMedia = z.infer<typeof insertModuleMediaSchema>;
export type ModuleMedia = typeof moduleMedia.$inferSelect;
export type InsertModuleVideo = z.infer<typeof insertModuleVideoSchema>;
export type ModuleVideo = typeof moduleVideos.$inferSelect;
export type InsertModuleLesson = z.infer<typeof insertModuleLessonSchema>;
export type ModuleLesson = typeof moduleLessons.$inferSelect;
export type InsertModuleQuiz = z.infer<typeof insertModuleQuizSchema>;
export type ModuleQuiz = typeof moduleQuizzes.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertUserTrainingProgress = z.infer<typeof insertUserTrainingProgressSchema>;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;
export type InsertUserQuizAttempt = z.infer<typeof insertUserQuizAttemptSchema>;
export type UserQuizAttempt = typeof userQuizAttempts.$inferSelect;

// Messages table - Inter-user and system messaging with thread support
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(), // Group messages into conversations
  parentMessageId: integer("parent_message_id").references((): any => messages.id), // For reply chains
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // null for role-based broadcast
  recipientRole: varchar("recipient_role", { length: 50 }), // null for specific user messages
  subject: text("subject"),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).default("direct"), // task_assignment, hq_message, branch_message, notification, direct
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for fast inbox queries
  recipientIdx: index("messages_recipient_idx").on(table.recipientId),
  recipientRoleIdx: index("messages_recipient_role_idx").on(table.recipientRole),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  threadIdx: index("messages_thread_idx").on(table.threadId),
  createdIdx: index("messages_created_idx").on(table.createdAt),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Thread Participants - Track users in each conversation thread
export const threadParticipants = pgTable("thread_participants", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  threadUserIdx: uniqueIndex("thread_participants_thread_user_idx").on(table.threadId, table.userId),
}));

export const insertThreadParticipantSchema = createInsertSchema(threadParticipants).omit({
  id: true,
  createdAt: true,
});

export type InsertThreadParticipant = z.infer<typeof insertThreadParticipantSchema>;
export type ThreadParticipant = typeof threadParticipants.$inferSelect;

// Message Reads - Junction table for tracking read status per user (supports broadcasts)
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMessage: uniqueIndex("message_reads_user_message_idx").on(table.messageId, table.userId),
}));

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  readAt: true,
});

export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type MessageRead = typeof messageReads.$inferSelect;

// Equipment Maintenance Logs table
export const equipmentMaintenanceLogs = pgTable("equipment_maintenance_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedBy: varchar("performed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  nextScheduledDate: date("next_scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentMaintenanceLogSchema = createInsertSchema(equipmentMaintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentMaintenanceLog = z.infer<typeof insertEquipmentMaintenanceLogSchema>;
export type EquipmentMaintenanceLog = typeof equipmentMaintenanceLogs.$inferSelect;

// Equipment Comments table
export const equipmentComments = pgTable("equipment_comments", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentCommentSchema = createInsertSchema(equipmentComments).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentComment = z.infer<typeof insertEquipmentCommentSchema>;
export type EquipmentComment = typeof equipmentComments.$inferSelect;

// Equipment Service Request Status enum
export const SERVICE_REQUEST_STATUS = {
  CREATED: 'created',
  SERVICE_CALLED: 'service_called',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  NOT_FIXED: 'not_fixed',
  WARRANTY_CLAIMED: 'warranty_claimed',
  DEVICE_SHIPPED: 'device_shipped',
  CLOSED: 'closed',
} as const;

export type ServiceRequestStatusType = typeof SERVICE_REQUEST_STATUS[keyof typeof SERVICE_REQUEST_STATUS];

// Service Decision enum
export const SERVICE_DECISION = {
  HQ: 'hq',
  BRANCH: 'branch',
} as const;

export type ServiceDecisionType = typeof SERVICE_DECISION[keyof typeof SERVICE_DECISION];

// Equipment Service Requests table
export const equipmentServiceRequests = pgTable("equipment_service_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  faultId: integer("fault_id").references(() => equipmentFaults.id, { onDelete: "set null" }),
  serviceDecision: varchar("service_decision", { length: 20 }).notNull(),
  serviceProvider: text("service_provider"),
  contactInfo: text("contact_info"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default(SERVICE_REQUEST_STATUS.CREATED),
  timeline: jsonb("timeline").$type<Array<{
    id: string;
    timestamp: string;
    status: ServiceRequestStatusType;
    actorId: string;
    notes?: string;
    meta?: Record<string, any>;
  }>>().default([]),
  photo1Url: text("photo1_url"),
  photo2Url: text("photo2_url"),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  equipmentIdx: index("equipment_service_requests_equipment_idx").on(table.equipmentId),
  statusIdx: index("equipment_service_requests_status_idx").on(table.status),
  faultIdx: index("equipment_service_requests_fault_idx").on(table.faultId),
}));

export const insertEquipmentServiceRequestSchema = createInsertSchema(equipmentServiceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  timeline: true,
});

export type InsertEquipmentServiceRequest = z.infer<typeof insertEquipmentServiceRequestSchema>;
export type EquipmentServiceRequest = typeof equipmentServiceRequests.$inferSelect;

// Relations (defined after all tables to avoid temporal dead zone)
export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  faults: many(equipmentFaults),
  metrics: many(performanceMetrics),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  tasksCreated: many(tasks),
  faultsReported: many(equipmentFaults),
  pageContentCreated: many(pageContent, { relationName: "pageContentCreatedBy" }),
  pageContentUpdated: many(pageContent, { relationName: "pageContentUpdatedBy" }),
}));

export const checklistsRelations = relations(checklists, ({ many }) => ({
  checklistTasks: many(checklistTasks),
}));

export const checklistTasksRelations = relations(checklistTasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistTasks.checklistId],
    references: [checklists.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [tasks.checklistId],
    references: [checklists.id],
  }),
  checklistTask: one(checklistTasks, {
    fields: [tasks.checklistTaskId],
    references: [checklistTasks.id],
  }),
  branch: one(branches, {
    fields: [tasks.branchId],
    references: [branches.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
}));

export const equipmentFaultsRelations = relations(equipmentFaults, ({ one }) => ({
  branch: one(branches, {
    fields: [equipmentFaults.branchId],
    references: [branches.id],
  }),
  reportedBy: one(users, {
    fields: [equipmentFaults.reportedById],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, {
    fields: [reminders.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  branch: one(branches, {
    fields: [performanceMetrics.branchId],
    references: [branches.id],
  }),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  branch: one(branches, {
    fields: [equipment.branchId],
    references: [branches.id],
  }),
  faults: many(equipmentFaults),
  maintenanceLogs: many(equipmentMaintenanceLogs),
  comments: many(equipmentComments),
  serviceRequests: many(equipmentServiceRequests),
}));

export const equipmentServiceRequestsRelations = relations(equipmentServiceRequests, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentServiceRequests.equipmentId],
    references: [equipment.id],
  }),
  fault: one(equipmentFaults, {
    fields: [equipmentServiceRequests.faultId],
    references: [equipmentFaults.id],
  }),
  createdBy: one(users, {
    fields: [equipmentServiceRequests.createdById],
    references: [users.id],
  }),
}));

// HQ Support Ticket Status
export const HQ_SUPPORT_STATUS = {
  AKTIF: 'aktif',
  KAPATILDI: 'kapatildi',
} as const;

export type HQSupportStatusType = typeof HQ_SUPPORT_STATUS[keyof typeof HQ_SUPPORT_STATUS];

// HQ Support Category (which HQ department)
export const HQ_SUPPORT_CATEGORY = {
  ARIZA: 'ariza',           // Equipment/machine issues
  TEKNIK: 'teknik',         // Technical support
  MUHASEBE: 'muhasebe',     // Accounting/finance
  LOJISTIK: 'lojistik',     // Logistics/supply chain
  FABRIKA: 'fabrika',       // Factory/production
  URUN_URETIM: 'urun_uretim', // Product/production
  SATINALMA: 'satinalma',   // Purchasing
  COACH: 'coach',           // Training/coaching
  DESTEK: 'destek',         // General support
  GENEL: 'genel',           // General inquiries
  IT_DESTEK: 'it_destek',   // IT support (software/program requests) - routes to admin
} as const;

export type HQSupportCategoryType = typeof HQ_SUPPORT_CATEGORY[keyof typeof HQ_SUPPORT_CATEGORY];

// Support ticket priority
export const TICKET_PRIORITY = {
  DUSUK: 'dusuk',
  NORMAL: 'normal',
  YUKSEK: 'yuksek',
  ACIL: 'acil',
} as const;

export type TicketPriorityType = typeof TICKET_PRIORITY[keyof typeof TICKET_PRIORITY];

// HQ Support Tickets table
export const hqSupportTickets = pgTable("hq_support_tickets", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default(TICKET_PRIORITY.NORMAL),
  status: varchar("status", { length: 20 }).notNull().default(HQ_SUPPORT_STATUS.AKTIF),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hq_support_tickets_branch_idx").on(table.branchId),
  index("hq_support_tickets_category_idx").on(table.category),
  index("hq_support_tickets_status_idx").on(table.status),
  index("hq_support_tickets_priority_idx").on(table.priority),
  index("hq_support_tickets_assigned_idx").on(table.assignedToId),
]);

export const insertHQSupportTicketSchema = createInsertSchema(hqSupportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHQSupportTicket = z.infer<typeof insertHQSupportTicketSchema>;
export type HQSupportTicket = typeof hqSupportTickets.$inferSelect;

// HQ Support Messages table (with attachments support)
export const hqSupportMessages = pgTable("hq_support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ticketCreatedIdx: index("hq_support_messages_ticket_created_idx").on(table.ticketId, table.createdAt),
}));

export const insertHQSupportMessageSchema = createInsertSchema(hqSupportMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportMessage = z.infer<typeof insertHQSupportMessageSchema>;
export type HQSupportMessage = typeof hqSupportMessages.$inferSelect;

// Ticket activity log for timeline tracking
export const ticketActivityLogs = pgTable("ticket_activity_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_activity_logs_ticket_idx").on(table.ticketId),
  index("ticket_activity_logs_created_idx").on(table.createdAt),
]);

export const insertTicketActivityLogSchema = createInsertSchema(ticketActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketActivityLog = z.infer<typeof insertTicketActivityLogSchema>;
export type TicketActivityLog = typeof ticketActivityLogs.$inferSelect;

// HQ Support Category Assignments - Which HQ users can view which ticket categories
export const hqSupportCategoryAssignments = pgTable("hq_support_category_assignments", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canAssign: boolean("can_assign").default(false),
  canClose: boolean("can_close").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("hq_support_cat_assign_category_idx").on(table.category),
  index("hq_support_cat_assign_user_idx").on(table.userId),
  unique("hq_support_cat_assign_unique").on(table.category, table.userId),
]);

export const insertHQSupportCategoryAssignmentSchema = createInsertSchema(hqSupportCategoryAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportCategoryAssignment = z.infer<typeof insertHQSupportCategoryAssignmentSchema>;
export type HQSupportCategoryAssignment = typeof hqSupportCategoryAssignments.$inferSelect;

// Notification types enum
export const NotificationType = {
  TASK_ASSIGNED: "task_assigned",
  TASK_COMPLETE: "task_complete",
  FAULT_REPORTED: "fault_reported",
  FAULT_RESOLVED: "fault_resolved",
  TRAINING_ASSIGNED: "training_assigned",
  ANNOUNCEMENT: "announcement",
  SYSTEM: "system",
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

// Notifications table - User-specific notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userReadCreatedIdx: index("notifications_user_read_created_idx").on(table.userId, table.isRead, table.createdAt),
  archivedCreatedIdx: index("notifications_archived_created_idx").on(table.isArchived, table.createdAt),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isArchived: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Announcement priority enum
export const AnnouncementPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type AnnouncementPriorityType = typeof AnnouncementPriority[keyof typeof AnnouncementPriority];

// Announcements table - HQ broadcasts to branches/roles
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  summary: text("summary"),
  category: varchar("category", { length: 30 }).notNull().default("general"), // new_product, general, policy, campaign, urgent, training, event
  targetRoles: text("target_roles").array(),
  targetBranches: integer("target_branches").array(),
  priority: text("priority").notNull().default("normal"),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  
  // Banner görseli ve ayarları
  bannerImageUrl: text("banner_image_url"),
  bannerTitle: varchar("banner_title", { length: 100 }),
  bannerSubtitle: varchar("banner_subtitle", { length: 200 }),
  showOnDashboard: boolean("show_on_dashboard").default(false),
  bannerPriority: integer("banner_priority").default(0),
  isPinned: boolean("is_pinned").default(false),
  
  // Zengin içerik alanları
  detailedContent: text("detailed_content"), // Uzun açıklama/makale içeriği
  ctaLink: text("cta_link"), // Call-to-action buton linki
  ctaText: varchar("cta_text", { length: 50 }), // Buton metni (örn: "Daha Fazla")
  mediaUrls: text("media_urls").array().default(sql`ARRAY[]::text[]`), // Ek görseller/videolar
  
  publishedAt: timestamp("published_at").defaultNow(),
  validFrom: timestamp("valid_from"), // Geçerlilik başlangıç tarihi
  expiresAt: timestamp("expires_at"), // Geçerlilik bitiş tarihi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  publishedIdx: index("announcements_published_idx").on(table.publishedAt),
  categoryIdx: index("announcements_category_idx").on(table.category),
  dashboardIdx: index("announcements_dashboard_idx").on(table.showOnDashboard),
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
}).extend({
  attachments: z.array(z.string()).default([]),
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Announcement Read Status table - Track who has read each announcement
// Note: Column names match database schema (camelCase)
export const announcementReadStatus = pgTable("announcement_read_status", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("readAt").defaultNow(),
}, (table) => [
  index("announcement_read_user_idx").on(table.userId),
  index("announcement_read_announcement_idx").on(table.announcementId),
  unique("unique_announcement_read").on(table.announcementId, table.userId),
]);

export const insertAnnouncementReadStatusSchema = createInsertSchema(announcementReadStatus).omit({
  id: true,
  readAt: true,
});

export type InsertAnnouncementReadStatus = z.infer<typeof insertAnnouncementReadStatusSchema>;
export type AnnouncementReadStatus = typeof announcementReadStatus.$inferSelect;

// Daily Cash Reports table - Supervisor daily cash summary for accounting
export const dailyCashReports = pgTable("daily_cash_reports", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  openingCash: numeric("opening_cash", { precision: 10, scale: 2 }).notNull(),
  closingCash: numeric("closing_cash", { precision: 10, scale: 2 }).notNull(),
  totalSales: numeric("total_sales", { precision: 10, scale: 2 }).notNull(),
  cashSales: numeric("cash_sales", { precision: 10, scale: 2 }),
  cardSales: numeric("card_sales", { precision: 10, scale: 2 }),
  expenses: numeric("expenses", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("daily_cash_reports_branch_date_idx").on(table.branchId, table.reportDate),
  uniqueBranchDate: unique("unique_branch_date").on(table.branchId, table.reportDate),
}));

export const insertDailyCashReportSchema = createInsertSchema(dailyCashReports).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyCashReport = z.infer<typeof insertDailyCashReportSchema>;
export type DailyCashReport = typeof dailyCashReports.$inferSelect;

// Shifts table - Employee shift scheduling for supervisors and HR
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist2Id: integer("checklist2_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist3Id: integer("checklist3_id").references(() => checklists.id, { onDelete: "set null" }),
  shiftDate: date("shift_date").notNull(),
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(),
  breakStartTime: time("break_start_time", { precision: 0 }),
  breakEndTime: time("break_end_time", { precision: 0 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  workloadScore: numeric("workload_score", { precision: 5, scale: 2 }),
  aiPlanId: varchar("ai_plan_id", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchDateIdx: index("shifts_branch_date_idx").on(table.branchId, table.shiftDate),
  assignedToIdx: index("shifts_assigned_to_idx").on(table.assignedToId),
  createdByIdx: index("shifts_created_by_idx").on(table.createdById),
  checklistIdx: index("shifts_checklist_idx").on(table.checklistId),
}));

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night"]),
  status: z.enum(["draft", "pending_hq", "confirmed", "completed", "cancelled"]).default("draft"),
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type ShiftType = "morning" | "evening" | "night";
export type ShiftStatus = "draft" | "pending_hq" | "confirmed" | "completed" | "cancelled";

// Shift Checklists (many-to-many) - Assign checklists to shifts
export const shiftChecklists = pgTable("shift_checklists", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftChecklist: unique("unique_shift_checklist").on(table.shiftId, table.checklistId),
  shiftIdx: index("shift_checklists_shift_idx").on(table.shiftId),
  checklistIdx: index("shift_checklists_checklist_idx").on(table.checklistId),
}));

export const insertShiftChecklistSchema = createInsertSchema(shiftChecklists).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftChecklist = z.infer<typeof insertShiftChecklistSchema>;
export type ShiftChecklist = typeof shiftChecklists.$inferSelect;

// Shift Tasks (many-to-many) - Assign tasks to shifts
export const shiftTasks = pgTable("shift_tasks", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftTask: unique("unique_shift_task").on(table.shiftId, table.taskId),
  shiftIdx: index("shift_tasks_shift_idx").on(table.shiftId),
  taskIdx: index("shift_tasks_task_idx").on(table.taskId),
}));

export const insertShiftTaskSchema = createInsertSchema(shiftTasks).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftTask = z.infer<typeof insertShiftTaskSchema>;
export type ShiftTask = typeof shiftTasks.$inferSelect;

// Bulk shift creation schema for shift planning
export const bulkCreateShiftsSchema = z.object({
  branchId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  period: z.enum(['weekly', '2weekly', 'monthly']),
  checklistId: z.number().int().positive().optional().nullable(),
  openingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  closingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  shiftType: z.string().min(1).default('regular'),
});

export type BulkCreateShifts = z.infer<typeof bulkCreateShiftsSchema>;

// Leave Requests table - Employee leave/time-off management
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 20 }).notNull(), // annual, sick, personal, unpaid
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("leave_requests_user_idx").on(table.userId),
  statusIdx: index("leave_requests_status_idx").on(table.status),
  dateIdx: index("leave_requests_date_idx").on(table.startDate, table.endDate),
}));

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Shift Attendance table - Employee check-in/out and break tracking
export const shiftAttendance = pgTable("shift_attendance", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Scheduled times (planned shift hours)
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  // Actual check-in/out times
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  // Break tracking
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  breakPlannedMinutes: integer("break_planned_minutes").default(60), // Default 1 hour break
  breakTakenMinutes: integer("break_taken_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  // Work time calculations
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  effectiveWorkMinutes: integer("effective_work_minutes").default(0), // After penalties
  penaltyMinutes: integer("penalty_minutes").default(0),
  // Compliance & punctuality
  latenessMinutes: integer("lateness_minutes").default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  breakOverageMinutes: integer("break_overage_minutes").default(0), // Break time exceeded planned break
  complianceScore: integer("compliance_score").default(100), // 0-100
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, checked_in, on_break, checked_out, absent, late
  notes: text("notes"),
  // Check-in Method & Verification
  checkInMethod: varchar("check_in_method", { length: 20 }).default("manual"),
  locationConfidenceScore: integer("location_confidence_score"),
  // Check-in Photo & Location Verification fields
  checkInPhotoUrl: text("check_in_photo_url"),
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  // Check-out Photo & Location Verification fields
  checkOutPhotoUrl: text("check_out_photo_url"),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  // Break Photo & Location fields
  breakStartPhotoUrl: text("break_start_photo_url"),
  breakStartLatitude: numeric("break_start_latitude", { precision: 10, scale: 7 }),
  breakStartLongitude: numeric("break_start_longitude", { precision: 10, scale: 7 }),
  breakEndPhotoUrl: text("break_end_photo_url"),
  breakEndLatitude: numeric("break_end_latitude", { precision: 10, scale: 7 }),
  breakEndLongitude: numeric("break_end_longitude", { precision: 10, scale: 7 }),
  // AI Background Verification (Shift Corner matching)
  aiBackgroundCheckInStatus: varchar("ai_background_check_in_status", { length: 20 }).default("pending"), // pending, verified, rejected, error
  aiBackgroundCheckInScore: integer("ai_background_check_in_score"), // 0-100 similarity score
  aiBackgroundCheckInDetails: jsonb("ai_background_check_in_details"),
  aiBackgroundCheckOutStatus: varchar("ai_background_check_out_status", { length: 20 }).default("pending"),
  aiBackgroundCheckOutScore: integer("ai_background_check_out_score"),
  aiBackgroundCheckOutDetails: jsonb("ai_background_check_out_details"),
  aiBackgroundBreakStartStatus: varchar("ai_background_break_start_status", { length: 20 }).default("pending"),
  aiBackgroundBreakStartScore: integer("ai_background_break_start_score"),
  aiBackgroundBreakEndStatus: varchar("ai_background_break_end_status", { length: 20 }).default("pending"),
  aiBackgroundBreakEndScore: integer("ai_background_break_end_score"),
  // AI Dress Code Analysis fields (check-in)
  aiDressCodeScore: integer("ai_dress_code_score"), // 0-100
  aiDressCodeAnalysis: jsonb("ai_dress_code_analysis"), // Detailed analysis object
  aiDressCodeStatus: varchar("ai_dress_code_status", { length: 20 }).default("pending"), // pending, approved, rejected, error
  aiDressCodeWarnings: text("ai_dress_code_warnings").array(), // Turkish warnings
  aiDressCodeTimestamp: timestamp("ai_dress_code_timestamp"),
  // Legacy fields (keeping for backward compatibility)
  photoUrl: text("photo_url"),
  analysisStatus: varchar("analysis_status", { length: 20 }).default("pending"), // pending, completed, error
  analysisDetails: jsonb("analysis_details"), // Structured AI response
  analysisTimestamp: timestamp("analysis_timestamp"),
  aiWarnings: text("ai_warnings").array(), // Turkish warnings array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShiftUser: unique("unique_shift_user_attendance").on(table.shiftId, table.userId),
  shiftIdx: index("shift_attendance_shift_idx").on(table.shiftId),
  userIdx: index("shift_attendance_user_idx").on(table.userId),
  statusIdx: index("shift_attendance_status_idx").on(table.status),
}));

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// Shift Trade Requests table - Employee shift swapping with approval workflow
export const shiftTradeRequests = pgTable("shift_trade_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  responderShiftId: integer("responder_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("taslak"), // taslak, calisan_onayi, yonetici_onayi, reddedildi, iptal
  notes: text("notes"),
  responderConfirmedAt: timestamp("responder_confirmed_at"),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  requesterIdx: index("shift_trade_requests_requester_idx").on(table.requesterId),
  responderIdx: index("shift_trade_requests_responder_idx").on(table.responderId),
  statusIdx: index("shift_trade_requests_status_idx").on(table.status),
  uniqueOpenTrade: unique("unique_open_shift_trade").on(table.requesterShiftId, table.responderShiftId, table.status),
}));

export const insertShiftTradeRequestSchema = createInsertSchema(shiftTradeRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["taslak", "calisan_onayi", "yonetici_onayi", "reddedildi", "iptal"]).default("taslak"),
});

export type InsertShiftTradeRequest = z.infer<typeof insertShiftTradeRequestSchema>;
export type ShiftTradeRequest = typeof shiftTradeRequests.$inferSelect;
export type ShiftTradeStatus = "taslak" | "calisan_onayi" | "yonetici_onayi" | "reddedildi" | "iptal";

// ========================================
// DYNAMIC MENU CONFIGURATION TABLES
// ========================================

// Menu Sections table
export const menuSections = pgTable("menu_sections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMenuSectionSchema = createInsertSchema(menuSections).omit({
  id: true,
});

export type InsertMenuSection = z.infer<typeof insertMenuSectionSchema>;
export type MenuSection = typeof menuSections.$inferSelect;

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => menuSections.id, { onDelete: "cascade" }),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  path: varchar("path", { length: 200 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  moduleKey: varchar("module_key", { length: 100 }),
  scope: varchar("scope", { length: 20 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Menu Visibility Rules table
export const menuVisibilityRules = pgTable("menu_visibility_rules", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ruleType: varchar("rule_type", { length: 20 }).notNull(),
  role: varchar("role", { length: 50 }),
  userId: varchar("user_id").references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  allow: boolean("allow").notNull().default(true),
});

export const insertMenuVisibilityRuleSchema = createInsertSchema(menuVisibilityRules).omit({
  id: true,
});

export type InsertMenuVisibilityRule = z.infer<typeof insertMenuVisibilityRuleSchema>;
export type MenuVisibilityRule = typeof menuVisibilityRules.$inferSelect;

// Menu Relations
export const menuSectionsRelations = relations(menuSections, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  section: one(menuSections, {
    fields: [menuItems.sectionId],
    references: [menuSections.id],
  }),
  visibilityRules: many(menuVisibilityRules),
}));

export const menuVisibilityRulesRelations = relations(menuVisibilityRules, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuVisibilityRules.menuItemId],
    references: [menuItems.id],
  }),
  user: one(users, {
    fields: [menuVisibilityRules.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [menuVisibilityRules.branchId],
    references: [branches.id],
  }),
}));

// Page Content (Markdown-based CMS)
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("page_content_slug_idx").on(table.slug),
]);

export const insertPageContentSchema = createInsertSchema(pageContent).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string()
    .min(1, "Slug gerekli")
    .max(255, "Slug çok uzun")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, sayı ve tire içermeli"),
  title: z.string().min(1, "Başlık gerekli").max(500, "Başlık çok uzun"),
  content: z.string().min(1, "İçerik gerekli"),
  publishedAt: z.string().datetime().optional().nullable(),
});

export type InsertPageContent = z.infer<typeof insertPageContentSchema>;
export type PageContent = typeof pageContent.$inferSelect;

export const pageContentRelations = relations(pageContent, ({ one }) => ({
  createdBy: one(users, {
    fields: [pageContent.createdById],
    references: [users.id],
    relationName: "pageContentCreatedBy",
  }),
  updatedBy: one(users, {
    fields: [pageContent.updatedById],
    references: [users.id],
    relationName: "pageContentUpdatedBy",
  }),
}));

// AI Summary types for HQ Dashboard
export const SummaryCategory = z.enum(["personel", "cihazlar", "gorevler"]);
export type SummaryCategoryType = z.infer<typeof SummaryCategory>;

export const aiSummaryRequestSchema = z.object({
  category: SummaryCategory,
});

export type AISummaryRequest = z.infer<typeof aiSummaryRequestSchema>;

export const aiSummaryResponseSchema = z.object({
  summary: z.string(),
  cached: z.boolean(),
  generatedAt: z.string(), // ISO timestamp
  category: SummaryCategory,
  scope: z.object({
    branchId: z.number().optional(),
    branchName: z.string().optional(),
  }).optional(),
});

export type AISummaryResponse = z.infer<typeof aiSummaryResponseSchema>;

// ========================================
// AI USAGE LOGS - Cost Monitoring
// ========================================

export const AIFeature = z.enum([
  "task_photo", 
  "fault_photo", 
  "cleanliness", 
  "dress_code", 
  "rag_chat", 
  "summary"
]);
export type AIFeatureType = z.infer<typeof AIFeature>;

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  feature: varchar("feature", { length: 50 }).notNull(), // task_photo, fault_photo, cleanliness, dress_code, rag_chat, summary
  model: varchar("model", { length: 100 }).notNull(), // gpt-4o, gpt-4o-mini, text-embedding-3-small
  operation: varchar("operation", { length: 100 }).notNull(), // e.g., "analyzeTaskPhoto", "generateEmbedding"
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  requestLatencyMs: integer("request_latency_ms").notNull().default(0),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cachedHit: boolean("cached_hit").default(false).notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("ai_usage_logs_created_at_idx").on(table.createdAt),
  index("ai_usage_logs_feature_idx").on(table.feature),
  index("ai_usage_logs_user_id_idx").on(table.userId),
  index("ai_usage_logs_branch_id_idx").on(table.branchId),
]);

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ========================================
// BRANDING CONFIGURATION
// ========================================

// Branding table - Company logo and branding assets (singleton pattern)
export const branding = pgTable("branding", {
  id: serial("id").primaryKey(),
  logoUrl: text("logo_url"), // Public S3 URL for company logo
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandingSchema = createInsertSchema(branding).omit({
  id: true,
  updatedAt: true,
});

export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;

// ========================================
// QUALITY AUDITS (Kalite Denetimi) - Enhanced unified system
// ========================================

// Audit Templates - Reusable audit checklists for both branch and personnel
export const auditTemplates = pgTable("audit_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Keeping old column name for compatibility
  description: text("description"),
  auditType: varchar("audit_type", { length: 20 }), // nullable for backward compat, 'branch' or 'personnel'
  category: varchar("category", { length: 50 }).notNull(), // cleanliness, service, knowledge, dress_code, etc.
  isActive: boolean("is_active").notNull().default(true),
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  aiAnalysisEnabled: boolean("ai_analysis_enabled").notNull().default(false),
  createdById: varchar("created_by_id").notNull().references(() => users.id), // Keeping old column name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("audit_templates_type_idx").on(table.auditType),
  index("audit_templates_category_idx").on(table.category),
]);

export const insertAuditTemplateSchema = createInsertSchema(auditTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditTemplate = z.infer<typeof insertAuditTemplateSchema>;
export type AuditTemplate = typeof auditTemplates.$inferSelect;

// Audit Template Items - Individual checklist items
export const auditTemplateItems = pgTable("audit_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id, { onDelete: "cascade" }),
  itemText: text("item_text").notNull(),
  maxPoints: integer("max_points").notNull().default(10), // Legacy field kept for backward compat
  sortOrder: integer("sort_order").notNull().default(0),
  // NEW fields for enhanced audit system
  itemType: varchar("item_type", { length: 20 }), // checkbox, rating, text, photo, multiple_choice - nullable for backwards compat
  weight: numeric("weight", { precision: 5, scale: 2 }), // Scoring weight as percentage (e.g., 6.25) - nullable
  section: varchar("section", { length: 30 }), // gida_guvenligi, urun_standardi, servis, operasyon, marka, ekipman
  requiresPhoto: boolean("requires_photo"), // nullable
  aiCheckEnabled: boolean("ai_check_enabled"), // nullable
  aiPrompt: text("ai_prompt"), // Custom AI analysis prompt for this item
  // For multiple choice questions (personnel audits)
  options: text("options").array(), // Multiple choice options - nullable
  correctAnswer: text("correct_answer"), // Correct answer for test questions - nullable
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_template_items_template_idx").on(table.templateId),
]);

export const insertAuditTemplateItemSchema = createInsertSchema(auditTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditTemplateItem = z.infer<typeof insertAuditTemplateItemSchema>;
export type AuditTemplateItem = typeof auditTemplateItems.$inferSelect;

// Quality Audits - Legacy table kept for backward compatibility, links to new audit instances
export const qualityAudits = pgTable("quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull(),
  totalScore: integer("total_score").notNull().default(0),
  maxPossibleScore: integer("max_possible_score").notNull().default(0),
  percentageScore: integer("percentage_score").notNull().default(0), // 0-100
  // Section scores (weighted percentages)
  gidaGuvenligiScore: integer("gida_guvenligi_score"), // Food Safety score 0-100
  urunStandardiScore: integer("urun_standardi_score"), // Product Standard score 0-100
  servisScore: integer("servis_score"), // Service score 0-100
  operasyonScore: integer("operasyon_score"), // Operations score 0-100
  markaScore: integer("marka_score"), // Brand score 0-100
  ekipmanScore: integer("ekipman_score"), // Equipment score 0-100
  weightedTotalScore: integer("weighted_total_score"), // Final weighted score 0-100
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  notes: text("notes"),
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quality_audits_branch_idx").on(table.branchId),
  index("quality_audits_auditor_idx").on(table.auditorId),
  index("quality_audits_date_idx").on(table.auditDate),
]);

export const insertQualityAuditSchema = createInsertSchema(qualityAudits, {
  auditDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({
  id: true,
  createdAt: true,
  auditorId: true,
});

export type InsertQualityAudit = z.infer<typeof insertQualityAuditSchema>;
export type QualityAudit = typeof qualityAudits.$inferSelect;

// Audit Item Scores - Legacy table
export const auditItemScores = pgTable("audit_item_scores", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => qualityAudits.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  scoreGiven: integer("score_given").notNull(),
  notes: text("notes"),
}, (table) => [
  index("audit_item_scores_audit_idx").on(table.auditId),
]);

export const insertAuditItemScoreSchema = createInsertSchema(auditItemScores).omit({
  id: true,
});

export type InsertAuditItemScore = z.infer<typeof insertAuditItemScoreSchema>;
export type AuditItemScore = typeof auditItemScores.$inferSelect;

// Audit Section Constants - 6 weighted sections for quality audits
export const AUDIT_SECTIONS = {
  gida_guvenligi: { label: "Gıda Güvenliği", weight: 25, color: "red" },
  urun_standardi: { label: "Ürün Standardı", weight: 25, color: "orange" },
  servis: { label: "Servis", weight: 15, color: "blue" },
  operasyon: { label: "Operasyon", weight: 15, color: "green" },
  marka: { label: "Marka", weight: 10, color: "purple" },
  ekipman: { label: "Ekipman", weight: 10, color: "gray" },
} as const;

export type AuditSection = keyof typeof AUDIT_SECTIONS;

// Branch Audit Scores - Aggregated audit scores per branch per period
export const branchAuditScores = pgTable("branch_audit_scores", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  auditCount: integer("audit_count").notNull().default(0),
  // Section averages (0-100)
  gidaGuvenligiAvg: integer("gida_guvenligi_avg"),
  urunStandardiAvg: integer("urun_standardi_avg"),
  servisAvg: integer("servis_avg"),
  operasyonAvg: integer("operasyon_avg"),
  markaAvg: integer("marka_avg"),
  ekipmanAvg: integer("ekipman_avg"),
  // Overall weighted average
  overallScore: integer("overall_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_audit_scores_branch_idx").on(table.branchId),
  index("branch_audit_scores_period_idx").on(table.periodType, table.periodStart),
]);

export const insertBranchAuditScoreSchema = createInsertSchema(branchAuditScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchAuditScore = z.infer<typeof insertBranchAuditScoreSchema>;
export type BranchAuditScore = typeof branchAuditScores.$inferSelect;

// NEW: Audit Instances - Unified audit execution for both branch and personnel
export const auditInstances = pgTable("audit_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditType: varchar("audit_type", { length: 20 }).notNull(), // 'branch' or 'personnel'
  
  // Target (either branch or personnel)
  branchId: integer("branch_id").references(() => branches.id),
  userId: varchar("user_id").references(() => users.id), // For personnel audits
  
  // Audit metadata
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  
  // Scoring
  totalScore: integer("total_score"), // Calculated from items (0-100)
  maxScore: integer("max_score"), // Maximum possible score
  
  // Overall notes
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instances_template_idx").on(table.templateId),
  index("audit_instances_branch_idx").on(table.branchId),
  index("audit_instances_user_idx").on(table.userId),
  index("audit_instances_auditor_idx").on(table.auditorId),
  index("audit_instances_date_idx").on(table.auditDate),
]);

export const insertAuditInstanceSchema = createInsertSchema(auditInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstance = z.infer<typeof insertAuditInstanceSchema>;
export type AuditInstance = typeof auditInstances.$inferSelect;

// NEW: Audit Instance Items - Individual responses in an audit
export const auditInstanceItems = pgTable("audit_instance_items", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => auditInstances.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  
  // Response data
  response: text("response"), // Checkbox: 'yes'/'no', Rating: '1-5', Text: actual text
  score: integer("score"), // 0-100 for this item
  
  // Notes and photos
  notes: text("notes"),
  photoUrl: text("photo_url"),
  
  // AI analysis results
  aiAnalysisStatus: varchar("ai_analysis_status", { length: 20 }), // pending, completed, failed
  aiScore: integer("ai_score"), // 0-100 from AI
  aiInsights: text("ai_insights"), // AI-generated feedback
  aiConfidence: integer("ai_confidence"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instance_items_instance_idx").on(table.instanceId),
  index("audit_instance_items_template_item_idx").on(table.templateItemId),
]);

export const insertAuditInstanceItemSchema = createInsertSchema(auditInstanceItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstanceItem = z.infer<typeof insertAuditInstanceItemSchema>;
export type AuditInstanceItem = typeof auditInstanceItems.$inferSelect;

// ========================================
// CORRECTIVE ACTIONS (CAPA - Müdahale Masası)
// ========================================

export const correctiveActions = pgTable("corrective_actions", {
  id: serial("id").primaryKey(),
  auditInstanceId: integer("audit_instance_id").notNull().references(() => auditInstances.id, { onDelete: "cascade" }),
  auditItemId: integer("audit_item_id").notNull().references(() => auditTemplateItems.id),
  priority: varchar("priority", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  actionSlaHours: integer("action_sla_hours").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  closedDate: timestamp("closed_date"),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("corrective_actions_audit_instance_idx").on(table.auditInstanceId),
  index("corrective_actions_priority_idx").on(table.priority),
  index("corrective_actions_status_idx").on(table.status),
  index("corrective_actions_due_date_idx").on(table.dueDate),
]);

export const insertCorrectiveActionSchema = createInsertSchema(correctiveActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCorrectiveAction = z.infer<typeof insertCorrectiveActionSchema>;
export type CorrectiveAction = typeof correctiveActions.$inferSelect;

export const correctiveActionUpdates = pgTable("corrective_action_updates", {
  id: serial("id").primaryKey(),
  correctiveActionId: integer("corrective_action_id").notNull().references(() => correctiveActions.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }).notNull(),
  notes: text("notes"),
  evidence: jsonb("evidence"),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("corrective_action_updates_action_idx").on(table.correctiveActionId),
]);

export const insertCorrectiveActionUpdateSchema = createInsertSchema(correctiveActionUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertCorrectiveActionUpdate = z.infer<typeof insertCorrectiveActionUpdateSchema>;
export type CorrectiveActionUpdate = typeof correctiveActionUpdates.$inferSelect;

// NEW: Personnel Files - Comprehensive employee records
export const personnelFiles = pgTable("personnel_files", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Performance metrics (aggregated)
  overallPerformanceScore: integer("overall_performance_score"), // 0-100
  attendanceScore: integer("attendance_score"), // 0-100
  knowledgeScore: integer("knowledge_score"), // 0-100 from audits
  behaviorScore: integer("behavior_score"), // 0-100 from audits
  
  // Audit history summary
  lastAuditDate: timestamp("last_audit_date"),
  totalAuditsCompleted: integer("total_audits_completed").notNull().default(0),
  averageAuditScore: integer("average_audit_score"), // 0-100
  
  // Notes
  strengthsNotes: text("strengths_notes"),
  improvementNotes: text("improvement_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("personnel_files_user_idx").on(table.userId),
]);

export const insertPersonnelFileSchema = createInsertSchema(personnelFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPersonnelFile = z.infer<typeof insertPersonnelFileSchema>;
export type PersonnelFile = typeof personnelFiles.$inferSelect;

// ========================================
// GUEST FEEDBACK (Misafir Geri Bildirimi) - Enhanced with SLA, Categories, Social Media
// ========================================

export const customerFeedback = pgTable("customer_feedback", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Source of feedback
  source: varchar("source", { length: 30 }).notNull().default("qr_code"), // qr_code, google, instagram, in_person, phone, email
  externalReviewId: varchar("external_review_id", { length: 255 }), // External review ID (Google/Instagram)
  externalReviewUrl: text("external_review_url"), // Link to external review
  
  // Overall rating and category ratings (1-5)
  rating: integer("rating").notNull(), // Overall rating 1-5
  serviceRating: integer("service_rating"), // Hizmet puanı 1-5
  cleanlinessRating: integer("cleanliness_rating"), // Temizlik puanı 1-5
  productRating: integer("product_rating"), // Ürün kalitesi puanı 1-5
  staffRating: integer("staff_rating"), // Personel puanı 1-5
  
  // Staff attribution (optional)
  staffId: varchar("staff_id").references(() => users.id, { onDelete: "set null" }), // Which staff served the customer
  
  // Customer info
  comment: text("comment"),
  feedbackDate: timestamp("feedback_date").defaultNow(),
  customerName: varchar("customer_name", { length: 100 }), // Optional
  customerEmail: varchar("customer_email", { length: 200 }), // Optional
  customerPhone: varchar("customer_phone", { length: 20 }), // Optional
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  
  // Priority & SLA
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  responseDeadline: timestamp("response_deadline"), // Calculated from priority
  slaBreached: boolean("sla_breached").notNull().default(false),
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, in_progress, awaiting_response, resolved, closed
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  resolvedAt: timestamp("resolved_at"),
  
  // Customer satisfaction after resolution
  resolutionSatisfaction: integer("resolution_satisfaction"), // 1-5 rating after resolution
  
  // Photo attachments
  photoUrls: text("photo_urls").array(), // Array of uploaded photo URLs
  
  // Anti-fraud / Suspicious detection
  deviceFingerprint: varchar("device_fingerprint", { length: 50 }), // Browser fingerprint
  userIp: varchar("user_ip", { length: 50 }), // IP address
  userLatitude: real("user_latitude"), // GPS latitude
  userLongitude: real("user_longitude"), // GPS longitude
  distanceFromBranch: real("distance_from_branch"), // Calculated distance in meters
  isSuspicious: boolean("is_suspicious").notNull().default(false), // Flagged for review
  suspiciousReasons: text("suspicious_reasons").array(), // Why it's suspicious
  
  // Language used for feedback
  feedbackLanguage: varchar("feedback_language", { length: 5 }).default("tr"),
  
  // Feedback type: feedback or complaint
  feedbackType: varchar("feedback_type", { length: 20 }).notNull().default("feedback"), // feedback, complaint
  
  // Contact preference
  requiresContact: boolean("requires_contact").notNull().default(false), // Customer wants to be contacted back
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("customer_feedback_branch_idx").on(table.branchId),
  index("customer_feedback_date_idx").on(table.feedbackDate),
  index("customer_feedback_rating_idx").on(table.rating),
  index("customer_feedback_source_idx").on(table.source),
  index("customer_feedback_status_idx").on(table.status),
  index("customer_feedback_staff_idx").on(table.staffId),
  index("customer_feedback_sla_idx").on(table.responseDeadline),
]);

export const insertCustomerFeedbackSchema = createInsertSchema(customerFeedback).omit({
  id: true,
  feedbackDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  serviceRating: z.number().int().min(1).max(5).optional().nullable(),
  cleanlinessRating: z.number().int().min(1).max(5).optional().nullable(),
  productRating: z.number().int().min(1).max(5).optional().nullable(),
  staffRating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000, "Comment too long").optional().transform(val => val?.trim() || null),
  feedbackType: z.enum(["feedback", "complaint"]).optional().default("feedback"),
  requiresContact: z.boolean().optional().default(false),
});

export type InsertCustomerFeedback = z.infer<typeof insertCustomerFeedbackSchema>;
export type CustomerFeedback = typeof customerFeedback.$inferSelect;

// ========================================
// FEEDBACK RESPONSES (Yanıt Geçmişi)
// ========================================

export const feedbackResponses = pgTable("feedback_responses", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").notNull().references(() => customerFeedback.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responseType: varchar("response_type", { length: 30 }).notNull(), // defense, reply, internal_note, customer_contact
  content: text("content").notNull(),
  isVisibleToCustomer: boolean("is_visible_to_customer").notNull().default(false), // Whether customer can see this
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("feedback_responses_feedback_idx").on(table.feedbackId),
  index("feedback_responses_responder_idx").on(table.responderId),
]);

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedbackResponse = z.infer<typeof insertFeedbackResponseSchema>;
export type FeedbackResponse = typeof feedbackResponses.$inferSelect;

// ========================================
// FEEDBACK FORM SETTINGS (Form Özelleştirme)
// ========================================

export const feedbackFormSettings = pgTable("feedback_form_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  
  // Banner / Visual customization
  bannerUrl: text("banner_url"), // Custom banner image URL
  logoUrl: text("logo_url"), // Custom logo URL
  primaryColor: varchar("primary_color", { length: 20 }).default("#7c3aed"), // Primary theme color
  backgroundColor: varchar("background_color", { length: 20 }).default("#1e1b4b"), // Background color
  
  // Welcome message customization (per language)
  welcomeMessageTr: text("welcome_message_tr").default("Geri bildiriminiz bizim için çok değerli"),
  welcomeMessageEn: text("welcome_message_en").default("Your feedback is very valuable to us"),
  welcomeMessageZh: text("welcome_message_zh").default("您的意见对我们非常宝贵"),
  welcomeMessageAr: text("welcome_message_ar").default("رأيك مهم جداً بالنسبة لنا"),
  welcomeMessageDe: text("welcome_message_de").default("Ihre Meinung ist uns sehr wichtig"),
  welcomeMessageKo: text("welcome_message_ko").default("귀하의 의견은 저희에게 매우 소중합니다"),
  welcomeMessageFr: text("welcome_message_fr").default("Votre avis nous est très précieux"),
  
  // Question visibility toggles
  showServiceRating: boolean("show_service_rating").notNull().default(true),
  showCleanlinessRating: boolean("show_cleanliness_rating").notNull().default(true),
  showProductRating: boolean("show_product_rating").notNull().default(true),
  showStaffRating: boolean("show_staff_rating").notNull().default(true),
  showStaffSelection: boolean("show_staff_selection").notNull().default(true), // Allow selecting specific staff
  
  // Feature toggles
  showPhotoUpload: boolean("show_photo_upload").notNull().default(true),
  showFeedbackTypeSelection: boolean("show_feedback_type_selection").notNull().default(true), // Feedback vs Complaint
  showContactPreference: boolean("show_contact_preference").notNull().default(true), // Requires contact checkbox
  showCommentField: boolean("show_comment_field").notNull().default(true),
  requireComment: boolean("require_comment").notNull().default(false), // Make comment mandatory
  
  // Anonymous settings
  allowAnonymous: boolean("allow_anonymous").notNull().default(true),
  defaultAnonymous: boolean("default_anonymous").notNull().default(true), // Default state of anonymous checkbox
  
  // Location verification
  requireLocationVerification: boolean("require_location_verification").notNull().default(false),
  maxDistanceFromBranch: integer("max_distance_from_branch").default(500), // meters
  
  // Language settings
  availableLanguages: text("available_languages").array().default(["tr", "en"]),
  defaultLanguage: varchar("default_language", { length: 5 }).default("tr"),
  
  // Active status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedById: varchar("updated_by_id").references(() => users.id),
}, (table) => [
  index("feedback_form_settings_branch_idx").on(table.branchId),
]);

export const insertFeedbackFormSettingsSchema = createInsertSchema(feedbackFormSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedbackFormSettings = z.infer<typeof insertFeedbackFormSettingsSchema>;
export type FeedbackFormSettings = typeof feedbackFormSettings.$inferSelect;

export const feedbackCustomQuestions = pgTable("feedback_custom_questions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  questionTr: text("question_tr").notNull(),
  questionEn: text("question_en"),
  questionDe: text("question_de"),
  questionAr: text("question_ar"),
  questionZh: text("question_zh"),
  questionKo: text("question_ko"),
  questionFr: text("question_fr"),
  questionType: varchar("question_type", { length: 20 }).notNull().default("rating"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("feedback_custom_questions_branch_idx").on(table.branchId),
]);

export const insertFeedbackCustomQuestionSchema = createInsertSchema(feedbackCustomQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedbackCustomQuestion = z.infer<typeof insertFeedbackCustomQuestionSchema>;
export type FeedbackCustomQuestion = typeof feedbackCustomQuestions.$inferSelect;

export const feedbackIpBlocks = pgTable("feedback_ip_blocks", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  reason: text("reason"),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("feedback_ip_blocks_ip_idx").on(table.ipAddress),
  index("feedback_ip_blocks_branch_idx").on(table.branchId),
]);

export const insertFeedbackIpBlockSchema = createInsertSchema(feedbackIpBlocks).omit({
  id: true,
  createdAt: true,
});

export type FeedbackIpBlock = typeof feedbackIpBlocks.$inferSelect;

// ========================================
// MAINTENANCE SCHEDULES (Proaktif Bakım)
// ========================================

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(), // routine, deep_clean, calibration, part_replacement
  frequencyDays: integer("frequency_days").notNull(), // Kaç günde bir (örn: 180 = 6 ayda bir)
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_schedules_equipment_idx").on(table.equipmentId),
  index("maintenance_schedules_next_date_idx").on(table.nextMaintenanceDate),
]);

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

// Maintenance Logs - Bakım geçmişi
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => maintenanceSchedules.id, { onDelete: "set null" }),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  performedDate: timestamp("performed_date").notNull(),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  workDescription: text("work_description").notNull(),
  partsReplaced: text("parts_replaced").array(), // Değiştirilen parçalar
  cost: numeric("cost", { precision: 10, scale: 2 }),
  nextMaintenanceDue: date("next_maintenance_due"),
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("maintenance_logs_equipment_idx").on(table.equipmentId),
  index("maintenance_logs_schedule_idx").on(table.scheduleId),
  index("maintenance_logs_date_idx").on(table.performedDate),
]);

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;

// ========================================
// EQUIPMENT CALIBRATIONS (Kalibrasyon Takibi)
// ========================================

export const equipmentCalibrations = pgTable("equipment_calibrations", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  calibrationDate: timestamp("calibration_date").notNull(),
  calibrationType: varchar("calibration_type", { length: 50 }).notNull(), // internal, external, manufacturer
  result: varchar("result", { length: 20 }).notNull(), // pass, fail, conditional
  nextCalibrationDue: date("next_calibration_due").notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  calibratedById: varchar("calibrated_by_id").references(() => users.id), // Internal calibration
  externalProvider: varchar("external_provider", { length: 200 }), // External calibration company
  measurements: text("measurements"), // JSON: before/after measurements
  deviations: text("deviations"), // Any deviations noted
  correctiveActions: text("corrective_actions"), // Actions taken if failed
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  auditInstanceId: integer("audit_instance_id").references(() => auditInstances.id), // Link to quality audit
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("equipment_calibrations_equipment_idx").on(table.equipmentId),
  index("equipment_calibrations_date_idx").on(table.calibrationDate),
  index("equipment_calibrations_next_due_idx").on(table.nextCalibrationDue),
  index("equipment_calibrations_result_idx").on(table.result),
]);

export const insertEquipmentCalibrationSchema = createInsertSchema(equipmentCalibrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true, // Set by server
});

export type InsertEquipmentCalibration = z.infer<typeof insertEquipmentCalibrationSchema>;
export type EquipmentCalibration = typeof equipmentCalibrations.$inferSelect;

// ========================================
// CAMPAIGNS (Kampanya Yönetimi)
// ========================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  campaignType: varchar("campaign_type", { length: 50 }).notNull(), // promotion, seasonal, new_product, discount
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetRoles: text("target_roles").array(), // Hedef roller (opsiyonel)
  imageUrls: text("image_urls").array(), // Kampanya görselleri
  pdfUrl: text("pdf_url"), // PDF döküman
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, active, paused, completed
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("campaigns_status_idx").on(table.status),
  index("campaigns_start_date_idx").on(table.startDate),
  index("campaigns_end_date_idx").on(table.endDate),
]);

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Campaign Branches - Kampanyanın hedef şubeleri
export const campaignBranches = pgTable("campaign_branches", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
}, (table) => [
  index("campaign_branches_campaign_idx").on(table.campaignId),
  index("campaign_branches_branch_idx").on(table.branchId),
  unique("unique_campaign_branch").on(table.campaignId, table.branchId),
]);

export const insertCampaignBranchSchema = createInsertSchema(campaignBranches).omit({
  id: true,
});

export type InsertCampaignBranch = z.infer<typeof insertCampaignBranchSchema>;
export type CampaignBranch = typeof campaignBranches.$inferSelect;

// Campaign Metrics - Kampanya başarı ölçümü (manuel girilen metrikler)
export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  salesIncrease: numeric("sales_increase", { precision: 10, scale: 2 }), // Satış artışı %
  customerCount: integer("customer_count"), // Müşteri sayısı
  revenue: numeric("revenue", { precision: 12, scale: 2 }), // Gelir
  notes: text("notes"),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  reportDate: timestamp("report_date").defaultNow(),
}, (table) => [
  index("campaign_metrics_campaign_idx").on(table.campaignId),
  index("campaign_metrics_branch_idx").on(table.branchId),
]);

export const insertCampaignMetricSchema = createInsertSchema(campaignMetrics).omit({
  id: true,
  reportDate: true,
});

export type InsertCampaignMetric = z.infer<typeof insertCampaignMetricSchema>;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;

// ========================================
// FRANCHISE ONBOARDING (Franchise Açılış)
// ========================================

export const franchiseOnboarding = pgTable("franchise_onboarding", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("planning"), // planning, in_progress, completed
  expectedOpeningDate: date("expected_opening_date"),
  actualOpeningDate: date("actual_opening_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedCoachId: varchar("assigned_coach_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_onboarding_branch_idx").on(table.branchId),
  index("franchise_onboarding_status_idx").on(table.status),
]);

export const insertFranchiseOnboardingSchema = createInsertSchema(franchiseOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFranchiseOnboarding = z.infer<typeof insertFranchiseOnboardingSchema>;
export type FranchiseOnboarding = typeof franchiseOnboarding.$inferSelect;

// Onboarding Documents - Gerekli belgeler
export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => franchiseOnboarding.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // license, contract, insurance, permits
  documentName: varchar("document_name", { length: 200 }).notNull(),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, uploaded, approved, rejected
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_documents_onboarding_idx").on(table.onboardingId),
  index("onboarding_documents_status_idx").on(table.status),
]);

export const insertOnboardingDocumentSchema = createInsertSchema(onboardingDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingDocument = z.infer<typeof insertOnboardingDocumentSchema>;
export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;

// License Renewals - Lisans yenileme hatırlatıcıları
export const licenseRenewals = pgTable("license_renewals", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  licenseType: varchar("license_type", { length: 100 }).notNull(), // franchise, health, business
  licenseNumber: varchar("license_number", { length: 100 }),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  renewalStatus: varchar("renewal_status", { length: 20 }).notNull().default("active"), // active, expiring_soon, expired, renewed
  reminderDaysBefore: integer("reminder_days_before").notNull().default(30), // Kaç gün önce hatırlat
  notes: text("notes"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("license_renewals_branch_idx").on(table.branchId),
  index("license_renewals_expiry_idx").on(table.expiryDate),
  index("license_renewals_status_idx").on(table.renewalStatus),
]);

export const insertLicenseRenewalSchema = createInsertSchema(licenseRenewals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLicenseRenewal = z.infer<typeof insertLicenseRenewalSchema>;
export type LicenseRenewal = typeof licenseRenewals.$inferSelect;

// ========================================
// SHIFT TEMPLATES - Vardiya Şablonları
// ========================================

// Shift Templates table - Reusable shift patterns for easy scheduling
export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Hafta İçi Sabah", "Hafta Sonu Akşam"
  description: text("description"),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // morning, evening, night
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_templates_branch_idx").on(table.branchId),
  index("shift_templates_active_idx").on(table.isActive),
]);

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// ========================================
// EMPLOYEE AVAILABILITY - Çalışan Müsaitlik
// ========================================

// Employee Availability table - Track when employees are unavailable
export const employeeAvailability = pgTable("employee_availability", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(), // unavailable, vacation, sick, personal, other
  notes: text("notes"),
  isAllDay: boolean("is_all_day").notNull().default(true),
  startTime: time("start_time", { precision: 0 }), // If not all day
  endTime: time("end_time", { precision: 0 }), // If not all day
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_availability_user_idx").on(table.userId),
  index("employee_availability_date_idx").on(table.startDate, table.endDate),
  index("employee_availability_status_idx").on(table.status),
]);

export const insertEmployeeAvailabilitySchema = createInsertSchema(employeeAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reason: z.enum(["unavailable", "vacation", "sick", "personal", "other"]),
  status: z.enum(["active", "cancelled"]).default("active"),
});

export type InsertEmployeeAvailability = z.infer<typeof insertEmployeeAvailabilitySchema>;
export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;
export type AvailabilityReason = "unavailable" | "vacation" | "sick" | "personal" | "other";

// ========================================
// RBAC SYSTEM - Role-Based Access Control
// ========================================

// Roles - Dynamic role management (separate from hard-coded UserRole enum)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").notNull().default(false), // Built-in roles cannot be deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("roles_name_idx").on(table.name),
]);

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions - Define what actions can be performed
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., "tasks.create", "equipment.delete"
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(), // tasks, equipment, users, etc.
  action: varchar("action", { length: 20 }).notNull(), // view, create, edit, delete, approve
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permissions_module_idx").on(table.module),
  index("permissions_name_idx").on(table.name),
]);

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role Permissions - Many-to-many relationship
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("role_permissions_role_idx").on(table.roleId),
  index("role_permissions_permission_idx").on(table.permissionId),
  unique("role_permission_unique").on(table.roleId, table.permissionId),
]);

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// ========================================
// SITE SETTINGS - Global configuration
// ========================================

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  type: varchar("type", { length: 20 }).notNull().default("string"), // string, number, boolean, json, file
  category: varchar("category", { length: 50 }).notNull().default("general"), // general, branding, theme, email
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false), // Can be accessed by non-admin users
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("site_settings_key_idx").on(table.key),
  index("site_settings_category_idx").on(table.category),
]);

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// ========================================
// PASSWORD RESET TOKENS
// ========================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_tokens_token_idx").on(table.token),
  index("password_reset_tokens_user_idx").on(table.userId),
]);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ========================================
// AUDIT LOGS - Activity tracking
// ========================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  actorRole: varchar("actor_role", { length: 50 }),
  scopeBranchId: integer("scope_branch_id"),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  targetResource: varchar("target_resource", { length: 100 }),
  targetResourceId: varchar("target_resource_id", { length: 100 }),
  before: jsonb("before"),
  after: jsonb("after"),
  details: jsonb("details"),
  requestId: varchar("request_id", { length: 64 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_event_type_idx").on(table.eventType),
  index("audit_logs_resource_idx").on(table.resource),
  index("audit_logs_branch_idx").on(table.scopeBranchId),
  index("audit_logs_created_idx").on(table.createdAt),
  index("audit_logs_request_idx").on(table.requestId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========================================
// OVERTIME REQUESTS - Employee overtime management
// ========================================

export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  overtimeDate: date("overtime_date").notNull(), // Date of overtime
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format - overtime start
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format - overtime end
  requestedMinutes: integer("requested_minutes").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approverId: varchar("approver_id").references(() => users.id, { onDelete: "set null" }),
  approvedMinutes: integer("approved_minutes"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  appliedToPeriod: varchar("applied_to_period", { length: 7 }), // YYYY-MM format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("overtime_requests_user_idx").on(table.userId),
  index("overtime_requests_status_idx").on(table.status),
  index("overtime_requests_period_idx").on(table.appliedToPeriod),
  index("overtime_requests_date_idx").on(table.overtimeDate),
  index("overtime_requests_branch_idx").on(table.branchId),
]);

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;

// ========================================
// SHIFT SWAP REQUESTS - Employee shift swap with dual approval
// ========================================

export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  targetShiftId: integer("target_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  swapDate: date("swap_date").notNull(), // Date of the shift swap
  reason: text("reason"),
  // Dual approval system
  targetApproved: boolean("target_approved"), // null = pending, true = approved, false = rejected
  targetApprovedAt: timestamp("target_approved_at"),
  targetRejectionReason: text("target_rejection_reason"),
  supervisorApproved: boolean("supervisor_approved"), // null = pending, true = approved, false = rejected
  supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  supervisorRejectionReason: text("supervisor_rejection_reason"),
  // Overall status
  status: varchar("status", { length: 20 }).notNull().default("pending_target"), 
  // pending_target, pending_supervisor, approved, rejected_by_target, rejected_by_supervisor, cancelled
  executedAt: timestamp("executed_at"), // When the swap was actually performed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_swap_requester_idx").on(table.requesterId),
  index("shift_swap_target_idx").on(table.targetUserId),
  index("shift_swap_status_idx").on(table.status),
  index("shift_swap_branch_idx").on(table.branchId),
  index("shift_swap_date_idx").on(table.swapDate),
]);

export const insertShiftSwapRequestSchema = createInsertSchema(shiftSwapRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftSwapRequest = z.infer<typeof insertShiftSwapRequestSchema>;
export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;

// ========================================
// ATTENDANCE PENALTIES - Track all penalties and deductions
// ========================================

export const attendancePenalties = pgTable("attendance_penalties", {
  id: serial("id").primaryKey(),
  shiftAttendanceId: integer("shift_attendance_id").notNull().references(() => shiftAttendance.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // lateness, early_leave, break_overage, manual
  minutes: integer("minutes").notNull(),
  reason: text("reason").notNull(),
  autoGenerated: boolean("auto_generated").notNull().default(true),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("attendance_penalties_shift_idx").on(table.shiftAttendanceId),
  index("attendance_penalties_type_idx").on(table.type),
]);

export const insertAttendancePenaltySchema = createInsertSchema(attendancePenalties).omit({
  id: true,
  createdAt: true,
});

export type InsertAttendancePenalty = z.infer<typeof insertAttendancePenaltySchema>;
export type AttendancePenalty = typeof attendancePenalties.$inferSelect;

// ========================================
// MONTHLY ATTENDANCE SUMMARIES - Pre-aggregated monthly reports
// ========================================

export const monthlyAttendanceSummaries = pgTable("monthly_attendance_summaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodMonth: varchar("period_month", { length: 7 }).notNull(), // YYYY-MM format
  totalScheduledMinutes: integer("total_scheduled_minutes").default(0).notNull(),
  totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
  totalPenaltyMinutes: integer("total_penalty_minutes").default(0).notNull(),
  totalOvertimeMinutes: integer("total_overtime_minutes").default(0).notNull(),
  latenessCount: integer("lateness_count").default(0).notNull(),
  earlyLeaveCount: integer("early_leave_count").default(0).notNull(),
  complianceScoreAvg: integer("compliance_score_avg").default(100).notNull(), // 0-100
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_period").on(table.userId, table.periodMonth),
  index("monthly_summaries_user_idx").on(table.userId),
  index("monthly_summaries_period_idx").on(table.periodMonth),
]);

export const insertMonthlyAttendanceSummarySchema = createInsertSchema(monthlyAttendanceSummaries).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});

export type InsertMonthlyAttendanceSummary = z.infer<typeof insertMonthlyAttendanceSummarySchema>;
export type MonthlyAttendanceSummary = typeof monthlyAttendanceSummaries.$inferSelect;

// ========================================
// GUEST COMPLAINTS - Enhanced customer complaint tracking with SLA
// ========================================

export const guestComplaints = pgTable("guest_complaints", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  // Complaint details
  complaintSource: varchar("complaint_source", { length: 50 }).notNull(), // phone, email, google, instagram, facebook, in_person
  complaintCategory: varchar("complaint_category", { length: 100 }).notNull(), // product, staff, cleanliness, service_speed, temperature, noise, other
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  complaintDate: timestamp("complaint_date").defaultNow().notNull(),
  complaintTime: varchar("complaint_time", { length: 5 }), // HH:MM format
  // Customer info (optional)
  customerName: varchar("customer_name", { length: 100 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  // Assignment & SLA
  assignedToType: varchar("assigned_to_type", { length: 50 }), // branch, hq_tech, hq_admin, accounting
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  responseDeadline: timestamp("response_deadline"), // Calculated from priority
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  // Status & Resolution
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, assigned, in_progress, resolved, closed
  slaBreached: boolean("sla_breached").notNull().default(false),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating after resolution
  sourceFeedbackId: integer("source_feedback_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("guest_complaints_branch_idx").on(table.branchId),
  index("guest_complaints_status_idx").on(table.status),
  index("guest_complaints_priority_idx").on(table.priority),
  index("guest_complaints_date_idx").on(table.complaintDate),
  index("guest_complaints_deadline_idx").on(table.responseDeadline),
]);

export const insertGuestComplaintSchema = createInsertSchema(guestComplaints).omit({
  id: true,
  complaintDate: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuestComplaint = z.infer<typeof insertGuestComplaintSchema>;
export type GuestComplaint = typeof guestComplaints.$inferSelect;

// ========================================
// EQUIPMENT TROUBLESHOOTING STEPS - Guided self-service before fault reporting
// ========================================

export const equipmentTroubleshootingSteps = pgTable("equipment_troubleshooting_steps", {
  id: serial("id").primaryKey(),
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(), // espresso_machine, grinder, refrigerator
  order: integer("order").notNull(), // Display order
  description: text("description").notNull(), // "Cihazı kapatıp 30 saniye bekleyin"
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  isRequired: boolean("is_required").notNull().default(true), // Must complete before fault reporting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("troubleshooting_equipment_type_idx").on(table.equipmentType),
  index("troubleshooting_order_idx").on(table.order),
]);

export const insertEquipmentTroubleshootingStepSchema = createInsertSchema(equipmentTroubleshootingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentTroubleshootingStep = z.infer<typeof insertEquipmentTroubleshootingStepSchema>;
export type EquipmentTroubleshootingStep = typeof equipmentTroubleshootingSteps.$inferSelect;

// ========================================
// EMPLOYEE PERFORMANCE SCORES - Personel Performans Skorları  
// ========================================

export const employeePerformanceScores = pgTable("employee_performance_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  week: varchar("week", { length: 10 }).notNull(), // 2025-W47
  // Attendance & Punctuality scores
  attendanceScore: integer("attendance_score").notNull().default(100), // 0-100
  latenessScore: integer("lateness_score").notNull().default(100), // 0-100, decreased by lateness
  earlyLeaveScore: integer("early_leave_score").notNull().default(100), // 0-100
  breakComplianceScore: integer("break_compliance_score").notNull().default(100), // 0-100
  // Shift compliance
  shiftComplianceScore: integer("shift_compliance_score").notNull().default(100), // 0-100
  overtimeComplianceScore: integer("overtime_compliance_score").notNull().default(100), // 0-100
  // Checklist compliance (40% weight in daily total)
  checklistScore: integer("checklist_score").notNull().default(100), // 0-100
  checklistsCompleted: integer("checklists_completed").notNull().default(0), // Count of completed checklists
  // Totals
  dailyTotalScore: integer("daily_total_score").notNull().default(100), // Weighted average
  weeklyTotalScore: integer("weekly_total_score").notNull().default(100), // Week average
  // Penalties applied
  totalPenaltyMinutes: integer("total_penalty_minutes").notNull().default(0),
  // Metadata
  latenessMinutes: integer("lateness_minutes").notNull().default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").notNull().default(0),
  breakOverageMinutes: integer("break_overage_minutes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("performance_scores_user_idx").on(table.userId),
  index("performance_scores_branch_idx").on(table.branchId),
  index("performance_scores_date_idx").on(table.date),
  index("performance_scores_week_idx").on(table.week),
  unique("unique_user_date_performance").on(table.userId, table.date),
]);

export const insertEmployeePerformanceScoreSchema = createInsertSchema(employeePerformanceScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeePerformanceScore = z.infer<typeof insertEmployeePerformanceScoreSchema>;
export type EmployeePerformanceScore = typeof employeePerformanceScores.$inferSelect;

// ========================================
// STAFF EVALUATIONS - Personel Değerlendirme Sistemi
// ========================================

export const staffEvaluations = pgTable("staff_evaluations", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorRole: varchar("evaluator_role", { length: 50 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  inspectionId: integer("inspection_id"),
  customerBehavior: integer("customer_behavior").notNull().default(3),
  friendliness: integer("friendliness").notNull().default(3),
  knowledgeExperience: integer("knowledge_experience").notNull().default(3),
  dressCode: integer("dress_code").notNull().default(3),
  cleanliness: integer("cleanliness").notNull().default(3),
  teamwork: integer("teamwork").notNull().default(3),
  punctuality: integer("punctuality").notNull().default(3),
  initiative: integer("initiative").notNull().default(3),
  overallScore: real("overall_score").notNull().default(0),
  notes: text("notes"),
  evaluationType: varchar("evaluation_type", { length: 30 }).notNull().default("standard"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffEvaluationSchema = createInsertSchema(staffEvaluations).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffEvaluation = z.infer<typeof insertStaffEvaluationSchema>;
export type StaffEvaluation = typeof staffEvaluations.$inferSelect;

// ========================================
// BRANCH QUALITY AUDITS - Şube Kalite Denetim Puanlama
// ========================================

export const branchQualityAudits = pgTable("branch_quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  auditDate: date("audit_date").notNull(),
  auditorId: varchar("auditor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Audit Categories (0-100 each)
  cleanlinessScore: integer("cleanliness_score").notNull(), // Temizlik skoru
  serviceQualityScore: integer("service_quality_score").notNull(), // Hizmet kalitesi
  productQualityScore: integer("product_quality_score").notNull(), // Ürün kalitesi
  staffBehaviorScore: integer("staff_behavior_score").notNull(), // Personel davranışı
  safetyComplianceScore: integer("safety_compliance_score").notNull(), // Güvenlik uyumu
  equipmentMaintenanceScore: integer("equipment_maintenance_score").notNull(), // Ekipman bakım
  
  // Expanded Coach Inspection Categories (0-100 each)
  exteriorScore: integer("exterior_score").default(0), // Dış mekan
  buildingAppearanceScore: integer("building_appearance_score").default(0), // Bina görünüş
  barLayoutScore: integer("bar_layout_score").default(0), // Bar düzeni
  storageScore: integer("storage_score").default(0), // Depo tamamlığı
  productPresentationScore: integer("product_presentation_score").default(0), // Ürün sunumu
  dressCodeScore: integer("dress_code_score").default(0), // Personel dress code
  
  // Overall
  overallScore: integer("overall_score").notNull(), // Weighted average
  
  // Notes and actions
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array of required actions
  categoryNotes: text("category_notes"), // JSON: { "exterior": "note", ... }
  photoUrls: text("photo_urls"), // JSON array of photo URLs
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("completed"), // draft, completed, follow_up_pending
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_quality_audits_branch_idx").on(table.branchId),
  index("branch_quality_audits_date_idx").on(table.auditDate),
  index("branch_quality_audits_auditor_idx").on(table.auditorId),
]);

export const insertBranchQualityAuditSchema = createInsertSchema(branchQualityAudits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cleanlinessScore: z.number().int().min(0).max(100),
  serviceQualityScore: z.number().int().min(0).max(100),
  productQualityScore: z.number().int().min(0).max(100),
  staffBehaviorScore: z.number().int().min(0).max(100),
  safetyComplianceScore: z.number().int().min(0).max(100),
  equipmentMaintenanceScore: z.number().int().min(0).max(100),
  exteriorScore: z.number().int().min(0).max(100).optional(),
  buildingAppearanceScore: z.number().int().min(0).max(100).optional(),
  barLayoutScore: z.number().int().min(0).max(100).optional(),
  storageScore: z.number().int().min(0).max(100).optional(),
  productPresentationScore: z.number().int().min(0).max(100).optional(),
  dressCodeScore: z.number().int().min(0).max(100).optional(),
  overallScore: z.number().int().min(0).max(100),
});

export type InsertBranchQualityAudit = z.infer<typeof insertBranchQualityAuditSchema>;
export type BranchQualityAudit = typeof branchQualityAudits.$inferSelect;

// ========================================
// PRODUCT COMPLAINTS - Ürün Şikayetleri (Şube → Kalite Kontrol)
// ========================================

export const productComplaints = pgTable("product_complaints", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),

  productName: varchar("product_name", { length: 255 }).notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  complaintType: varchar("complaint_type", { length: 50 }).notNull(), // taste, appearance, packaging, freshness, foreign_object, other
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  description: text("description").notNull(),
  photoUrls: text("photo_urls"), // JSON array
  
  status: varchar("status", { length: 30 }).notNull().default("new"), // new, investigating, resolved, rejected
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("product_complaints_branch_idx").on(table.branchId),
  index("product_complaints_status_idx").on(table.status),
  index("product_complaints_assigned_idx").on(table.assignedToId),
  index("product_complaints_created_idx").on(table.createdAt),
]);

export const insertProductComplaintSchema = createInsertSchema(productComplaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  status: true,
});

export type InsertProductComplaint = z.infer<typeof insertProductComplaintSchema>;
export type ProductComplaint = typeof productComplaints.$inferSelect;

// ========================================
// EMPLOYEE DOCUMENTS - Özlük Dosyası Belgeleri
// ========================================

export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // id_card, diploma, health_report, contract, bank_info, insurance, certificate
  documentName: varchar("document_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  expiryDate: date("expiry_date"),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_documents_user_idx").on(table.userId),
  index("employee_documents_type_idx").on(table.documentType),
  index("employee_documents_expiry_idx").on(table.expiryDate),
]);

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;

// ========================================
// DISCIPLINARY REPORTS - Tutanaklar, Disiplin İşlemleri, Yazılı Savunmalar
// ========================================

export const disciplinaryReports = pgTable("disciplinary_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportType: varchar("report_type", { length: 50 }).notNull(), // warning, investigation, defense, meeting_minutes
  severity: varchar("severity", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  incidentDate: date("incident_date").notNull(),
  incidentTime: varchar("incident_time", { length: 5 }), // HH:MM format
  location: varchar("location", { length: 255 }),
  witnessIds: text("witness_ids").array(), // Array of user IDs
  attachmentUrls: text("attachment_urls").array(), // Fotoğraflar ve belgeler
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employeeResponse: text("employee_response"), // Yazılı savunma
  employeeResponseDate: timestamp("employee_response_date"),
  employeeResponseAttachments: text("employee_response_attachments").array(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, under_review, resolved, closed
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  actionTaken: varchar("action_taken", { length: 100 }), // verbal_warning, written_warning, suspension, termination, cleared
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("disciplinary_reports_user_idx").on(table.userId),
  index("disciplinary_reports_branch_idx").on(table.branchId),
  index("disciplinary_reports_type_idx").on(table.reportType),
  index("disciplinary_reports_status_idx").on(table.status),
  index("disciplinary_reports_date_idx").on(table.incidentDate),
]);

export const insertDisciplinaryReportSchema = createInsertSchema(disciplinaryReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDisciplinaryReport = z.infer<typeof insertDisciplinaryReportSchema>;
export type DisciplinaryReport = typeof disciplinaryReports.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING - Yeni Personel Onboarding Süreci
// ========================================

export const employeeOnboarding = pgTable("employee_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, completed
  startDate: date("start_date").notNull(),
  expectedCompletionDate: date("expected_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedMentorId: varchar("assigned_mentor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  employeeNotes: text("employee_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_user_idx").on(table.userId),
  index("employee_onboarding_branch_idx").on(table.branchId),
  index("employee_onboarding_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingSchema = createInsertSchema(employeeOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboarding = z.infer<typeof insertEmployeeOnboardingSchema>;
export type EmployeeOnboarding = typeof employeeOnboarding.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING TASKS - Onboarding Görevleri
// ========================================

export const employeeOnboardingTasks = pgTable("employee_onboarding_tasks", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => employeeOnboarding.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 100 }).notNull(), // document_upload, training, orientation, system_access, meet_team
  taskName: varchar("task_name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, skipped
  completedById: varchar("completed_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  attachmentUrls: text("attachment_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_tasks_onboarding_idx").on(table.onboardingId),
  index("onboarding_tasks_status_idx").on(table.status),
  index("onboarding_tasks_due_date_idx").on(table.dueDate),
]);

export const insertEmployeeOnboardingTaskSchema = createInsertSchema(employeeOnboardingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingTask = z.infer<typeof insertEmployeeOnboardingTaskSchema>;
export type EmployeeOnboardingTask = typeof employeeOnboardingTasks.$inferSelect;

// ========================================
// ONBOARDING TEMPLATES - Coach Onboarding Şablonları
// ========================================

// Onboarding şablonları - Coach HQ'da oluşturur, tüm şubelerde kullanılır
export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // "Yeni Barista Onboarding", "Stajyer Programı"
  description: text("description"),
  targetRole: varchar("target_role", { length: 50 }).notNull().default("barista"), // barista, stajyer, supervisor_buddy
  scope: varchar("scope", { length: 20 }).notNull().default("branch"), // branch, factory
  durationDays: integer("duration_days").notNull().default(60), // Toplam süre (örn: 60 gün = 2 ay deneme süresi)
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").notNull(), // Coach user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("onboarding_templates_target_role_idx").on(table.targetRole),
  index("onboarding_templates_active_idx").on(table.isActive),
]);

export const insertOnboardingTemplateSchema = createInsertSchema(onboardingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingTemplate = z.infer<typeof insertOnboardingTemplateSchema>;
export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;

// Onboarding şablon adımları - Her şablondaki eğitim aşamaları
export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => onboardingTemplates.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull().default(1),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startDay: integer("start_day").notNull().default(1),
  endDay: integer("end_day").notNull().default(3),
  contentType: varchar("content_type", { length: 30 }).notNull().default("module"),
  contentId: integer("content_id"),
  estimatedMinutes: integer("estimated_minutes").default(15),
  approverType: varchar("approver_type", { length: 30 }).notNull().default("auto"),
  mentorRoleType: varchar("mentor_role_type", { length: 50 }).notNull().default("barista"),
  trainingModuleId: integer("training_module_id"),
  requiredCompletion: boolean("required_completion").notNull().default(true),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_template_steps_template_idx").on(table.templateId),
  index("onboarding_template_steps_order_idx").on(table.stepOrder),
]);

export const insertOnboardingTemplateStepSchema = createInsertSchema(onboardingTemplateSteps).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingTemplateStep = z.infer<typeof insertOnboardingTemplateStepSchema>;
export type OnboardingTemplateStep = typeof onboardingTemplateSteps.$inferSelect;

// Personel onboarding atama - Yeni personele şablon uygulandığında
export const employeeOnboardingAssignments = pgTable("employee_onboarding_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Yeni personel
  branchId: integer("branch_id").notNull(),
  templateId: integer("template_id").notNull().references(() => onboardingTemplates.id),
  mentorId: varchar("mentor_id"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  expectedEndDate: timestamp("expected_end_date"), // Beklenen bitiş (startDate + durationDays)
  actualEndDate: timestamp("actual_end_date"), // Gerçek bitiş
  status: varchar("status", { length: 30 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  overallProgress: integer("overall_progress").notNull().default(0), // 0-100 yüzde
  managerNotified: boolean("manager_notified").notNull().default(false), // Tamamlandığında bildirim gönderildi mi?
  evaluationStatus: varchar("evaluation_status", { length: 30 }), // pending, passed, failed (deneme süreci değerlendirmesi)
  evaluationNotes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_assignments_user_idx").on(table.userId),
  index("employee_onboarding_assignments_branch_idx").on(table.branchId),
  index("employee_onboarding_assignments_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingAssignmentSchema = createInsertSchema(employeeOnboardingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingAssignment = z.infer<typeof insertEmployeeOnboardingAssignmentSchema>;
export type EmployeeOnboardingAssignment = typeof employeeOnboardingAssignments.$inferSelect;

// Personel onboarding adım ilerlemesi - Her adım için ilerleme
export const employeeOnboardingProgress = pgTable("employee_onboarding_progress", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => employeeOnboardingAssignments.id, { onDelete: "cascade" }),
  stepId: integer("step_id").notNull().references(() => onboardingTemplateSteps.id),
  mentorId: varchar("mentor_id"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  approvalStatus: varchar("approval_status", { length: 30 }).default("not_required"),
  approvedById: varchar("approved_by_id"),
  approvedAt: timestamp("approved_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  mentorNotes: text("mentor_notes"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_progress_assignment_idx").on(table.assignmentId),
  index("employee_onboarding_progress_step_idx").on(table.stepId),
  index("employee_onboarding_progress_mentor_idx").on(table.mentorId),
  index("employee_onboarding_progress_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingProgressSchema = createInsertSchema(employeeOnboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingProgress = z.infer<typeof insertEmployeeOnboardingProgressSchema>;
export type EmployeeOnboardingProgress = typeof employeeOnboardingProgress.$inferSelect;

// ========================================
// CERTIFICATE DESIGN SETTINGS
// ========================================

export const certificateDesignSettings = pgTable("certificate_design_settings", {
  id: serial("id").primaryKey(),
  transitionFrom: varchar("transition_from", { length: 50 }).notNull(), // e.g., "stajyer"
  transitionTo: varchar("transition_to", { length: 50 }).notNull(), // e.g., "bar_buddy"
  certificateTitle: varchar("certificate_title", { length: 255 }).notNull().default("Başarı Sertifikası"),
  subtitle: varchar("subtitle", { length: 255 }),
  primaryColor: varchar("primary_color", { length: 20 }).default("#1e3a5f"),
  secondaryColor: varchar("secondary_color", { length: 20 }).default("#c9a96e"),
  logoUrl: text("logo_url"),
  signatureLabel: varchar("signature_label", { length: 200 }).default("DOSPRESSO Eğitim Müdürü"),
  signatureImageUrl: text("signature_image_url"),
  templateLayout: varchar("template_layout", { length: 50 }).default("classic"), // classic, modern, minimal
  footerText: text("footer_text"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("cert_design_transition_idx").on(table.transitionFrom, table.transitionTo),
]);

export const insertCertificateDesignSettingSchema = createInsertSchema(certificateDesignSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCertificateDesignSetting = z.infer<typeof insertCertificateDesignSettingSchema>;
export type CertificateDesignSetting = typeof certificateDesignSettings.$inferSelect;

// ========================================
// PERMISSION MODULES - Yetki Modülleri Tanımları
// ========================================

export const permissionModules = pgTable("permission_modules", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 50 }).notNull().unique(), // dashboard, tasks, checklists, etc.
  moduleName: varchar("module_name", { length: 100 }).notNull(), // "Panel", "Görevler", etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // hq, branch, factory, shared
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("permission_modules_module_key_idx").on(table.moduleKey),
  index("permission_modules_category_idx").on(table.category),
]);

export const insertPermissionModuleSchema = createInsertSchema(permissionModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPermissionModule = z.infer<typeof insertPermissionModuleSchema>;
export type PermissionModule_DB = typeof permissionModules.$inferSelect;

// ========================================
// PERMISSION ACTIONS - Modül İçi Granüler Aksiyonlar
// ========================================

export const PermissionScope = {
  SELF: "self",       // Sadece kendi verilerini görebilir
  BRANCH: "branch",   // Şube genelini görebilir
  GLOBAL: "global",   // Tüm şubeleri görebilir
} as const;

export type PermissionScopeType = typeof PermissionScope[keyof typeof PermissionScope];

export const permissionActions = pgTable("permission_actions", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 50 }).notNull(), // accounting, hr, employees, etc.
  actionKey: varchar("action_key", { length: 50 }).notNull(), // view_salary, edit_salary, etc.
  labelTr: varchar("label_tr", { length: 100 }).notNull(), // "Maaş Görüntüle"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permission_actions_module_key_idx").on(table.moduleKey),
  unique("permission_actions_module_action_unique").on(table.moduleKey, table.actionKey),
]);

export const insertPermissionActionSchema = createInsertSchema(permissionActions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermissionAction = z.infer<typeof insertPermissionActionSchema>;
export type PermissionActionRow = typeof permissionActions.$inferSelect;

// ========================================
// ROLE PERMISSION GRANTS - Rol-Aksiyon-Scope İlişkileri
// ========================================

export const rolePermissionGrants = pgTable("role_permission_grants", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, muhasebe, supervisor, etc.
  actionId: integer("action_id").notNull().references(() => permissionActions.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull().default("self"), // self, branch, global
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_permission_grants_role_idx").on(table.role),
  index("role_permission_grants_action_idx").on(table.actionId),
  unique("role_permission_grants_role_action_unique").on(table.role, table.actionId),
]);

export const insertRolePermissionGrantSchema = createInsertSchema(rolePermissionGrants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRolePermissionGrantSchema = insertRolePermissionGrantSchema.partial();

export type InsertRolePermissionGrant = z.infer<typeof insertRolePermissionGrantSchema>;
export type UpdateRolePermissionGrant = z.infer<typeof updateRolePermissionGrantSchema>;
export type RolePermissionGrant = typeof rolePermissionGrants.$inferSelect;

// ========================================
// ROLE MODULE PERMISSIONS - Rol-Modül-Aksiyon İlişkileri  
// ========================================

export const roleModulePermissions = pgTable("role_module_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, muhasebe, barista, etc.
  module: varchar("module", { length: 50 }).notNull(), // dashboard, tasks, etc.
  actions: text("actions").array().notNull().default(sql`ARRAY[]::text[]`), // ['view', 'create', 'edit', 'delete', 'approve']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_module_permissions_role_idx").on(table.role),
  index("role_module_permissions_module_idx").on(table.module),
  unique("role_module_permissions_role_module_unique").on(table.role, table.module),
]);

export const insertRoleModulePermissionSchema = createInsertSchema(roleModulePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRoleModulePermissionSchema = insertRoleModulePermissionSchema.partial();

export type InsertRoleModulePermission = z.infer<typeof insertRoleModulePermissionSchema>;
export type UpdateRoleModulePermission = z.infer<typeof updateRoleModulePermissionSchema>;
export type RoleModulePermission = typeof roleModulePermissions.$inferSelect;

// ========================================
// MEGA MODULE MAPPINGS - Modül-Mega Modül Eşleştirmeleri
// Dashboard kartlarındaki modüllerin hangi mega-modüle ait olduğu
// ========================================

export const megaModuleMappings = pgTable("mega_module_mappings", {
  id: serial("id").primaryKey(),
  moduleId: varchar("module_id", { length: 100 }).notNull(), // menu-service'deki item.id (equipment, faults, etc.)
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // operations, equipment, hr, training, kitchen, reports, newshop, admin
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("mega_module_mappings_module_idx").on(table.moduleId),
  index("mega_module_mappings_mega_idx").on(table.megaModuleId),
  unique("mega_module_mappings_unique").on(table.moduleId),
]);

export const insertMegaModuleMappingSchema = createInsertSchema(megaModuleMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMegaModuleMappingSchema = insertMegaModuleMappingSchema.partial();

export type InsertMegaModuleMapping = z.infer<typeof insertMegaModuleMappingSchema>;
export type UpdateMegaModuleMapping = z.infer<typeof updateMegaModuleMappingSchema>;
export type MegaModuleMapping = typeof megaModuleMappings.$inferSelect;

// ========================================
// BACKUP RECORDS - Yedekleme Kayıtları
// ========================================

export const backupRecords = pgTable("backup_records", {
  id: serial("id").primaryKey(),
  backupId: varchar("backup_id", { length: 100 }).notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  success: boolean("success").notNull().default(false),
  tablesBackedUp: text("tables_backed_up").array().notNull().default(sql`ARRAY[]::text[]`),
  recordCounts: jsonb("record_counts").notNull().default('{}'),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").notNull().default(0),
  backupType: varchar("backup_type", { length: 20 }).notNull().default('daily'), // daily, manual
}, (table) => [
  index("backup_records_timestamp_idx").on(table.timestamp),
  index("backup_records_success_idx").on(table.success),
]);

export const insertBackupRecordSchema = createInsertSchema(backupRecords).omit({
  id: true,
  timestamp: true,
});

export type InsertBackupRecord = z.infer<typeof insertBackupRecordSchema>;
export type BackupRecord = typeof backupRecords.$inferSelect;

// ========================================
// TRAINING MATERIALS - AI Eğitim Materyalleri
// ========================================

// Training Materials - Knowledge Base makalesinden AI tarafından oluşturulan eğitim içeriği
export const trainingMaterials = pgTable("training_materials", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  materialType: varchar("material_type", { length: 50 }).notNull(), // flashcard_set, quiz, multi_step_guide, mindmap
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: jsonb("content").notNull(), // { flashcards: [], quizzes: [], steps: [], mindmap: {} }
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published, archived
  targetRoles: text("target_roles").array(), // Hedef roller
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_materials_article_idx").on(table.articleId),
  index("training_materials_status_idx").on(table.status),
  index("training_materials_type_idx").on(table.materialType),
]);

export const insertTrainingMaterialSchema = createInsertSchema(trainingMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingMaterial = z.infer<typeof insertTrainingMaterialSchema>;
export type TrainingMaterial = typeof trainingMaterials.$inferSelect;

// Training Assignments - Eğitim atamaları (kullanıcı/rol gruplarına)
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  targetRole: varchar("target_role", { length: 50 }), // Rol grubuna atama
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  assignedById: varchar("assigned_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  isRequired: boolean("is_required").default(true),
  status: varchar("status", { length: 20 }).notNull().default("assigned"), // assigned, in_progress, completed, overdue, expired
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_assignments_material_idx").on(table.materialId),
  index("training_assignments_user_idx").on(table.userId),
  index("training_assignments_status_idx").on(table.status),
  index("training_assignments_due_date_idx").on(table.dueDate),
]);

export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;

// Training Completions - Tamamlama kayıtları (skor, süre, durumlar)
export const trainingCompletions = pgTable("training_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => trainingAssignments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, passed, failed, abandoned
  score: integer("score"), // 0-100
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_completions_user_idx").on(table.userId),
  index("training_completions_material_idx").on(table.materialId),
  index("training_completions_status_idx").on(table.status),
  index("training_completions_completed_idx").on(table.completedAt),
]);

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;

// ========================================
// CAREER PROGRESSION - Kariyer İlerleme Sistemi
// ========================================

// Career Levels - 5 seviye
export const careerLevels = pgTable("career_levels", {
  id: serial("id").primaryKey(),
  roleId: varchar("role_id", { length: 50 }).notNull().unique(), // stajyer, bar_buddy, barista, supervisor_buddy, supervisor
  levelNumber: integer("level_number").notNull(), // 1-5
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // "Stajyer", "Bar Buddy", vb
  descriptionTr: text("description_tr"),
  requiredModuleIds: integer("required_module_ids").array().default(sql`ARRAY[]::integer[]`), // Zorunlu modül ID'leri
  prerequisiteRoles: text("prerequisite_roles").array(), // Önceki roller
  successRateThreshold: integer("success_rate_threshold").default(80), // Sınav geçiş notu (%)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("career_levels_role_idx").on(table.roleId),
  index("career_levels_level_idx").on(table.levelNumber),
]);

export const insertCareerLevelSchema = createInsertSchema(careerLevels).omit({
  id: true,
  createdAt: true,
});

export type InsertCareerLevel = z.infer<typeof insertCareerLevelSchema>;
export type CareerLevel = typeof careerLevels.$inferSelect;

// Exam Requests - Supervisor tarafından başlatılan sınav talepleri
export const examRequests = pgTable("exam_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetRoleId: varchar("target_role_id", { length: 50 }).notNull(), // Hangi role'e terfi (e.g., "barista")
  supervisorId: varchar("supervisor_id").notNull().references(() => users.id),
  supervisorNotes: text("supervisor_notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, exam_in_progress, passed, failed
  approvedById: varchar("approved_by_id").references(() => users.id), // HQ onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  examStartedAt: timestamp("exam_started_at"),
  examCompletedAt: timestamp("exam_completed_at"),
  examScore: integer("exam_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("exam_requests_user_idx").on(table.userId),
  index("exam_requests_status_idx").on(table.status),
  index("exam_requests_target_role_idx").on(table.targetRoleId),
]);

export const insertExamRequestSchema = createInsertSchema(examRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExamRequest = z.infer<typeof insertExamRequestSchema>;
export type ExamRequest = typeof examRequests.$inferSelect;

// User Career Progress - Her kullanıcının kariyer durumu
export const userCareerProgress = pgTable("user_career_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentCareerLevelId: integer("current_career_level_id").notNull().references(() => careerLevels.id),
  completedModuleIds: integer("completed_module_ids").array().default(sql`ARRAY[]::integer[]`),
  averageQuizScore: real("average_quiz_score").default(0),
  totalQuizzesAttempted: integer("total_quizzes_attempted").default(0),
  lastExamRequestId: integer("last_exam_request_id").references(() => examRequests.id),
  promotionEligibleAt: timestamp("promotion_eligible_at"),
  // Kompozit Kariyer Skoru Alanları
  trainingScore: real("training_score").default(0), // Eğitim skoru %25
  practicalScore: real("practical_score").default(0), // Pratik skor (checklist, task) %25
  attendanceScore: real("attendance_score").default(0), // Devam/dakiklik skoru %25
  managerScore: real("manager_score").default(0), // Yönetici değerlendirmesi %25
  compositeScore: real("composite_score").default(0), // Toplam kompozit skor
  // Tehlike bölgesi takibi
  dangerZoneMonths: integer("danger_zone_months").default(0), // Üst üste kaç ay %60 altında
  lastWarningDate: timestamp("last_warning_date"), // Son uyarı tarihi
  statusDemotedAt: timestamp("status_demoted_at"), // Düşürme tarihi
  statusDemotedFrom: integer("status_demoted_from"), // Hangi seviyeden düşürüldü
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_career_progress_user_idx").on(table.userId),
  index("user_career_progress_level_idx").on(table.currentCareerLevelId),
  index("user_career_progress_composite_score_idx").on(table.compositeScore),
]);

export const insertUserCareerProgressSchema = createInsertSchema(userCareerProgress).omit({
  id: true,
  lastUpdatedAt: true,
  createdAt: true,
});

export type InsertUserCareerProgress = z.infer<typeof insertUserCareerProgressSchema>;
export type UserCareerProgress = typeof userCareerProgress.$inferSelect;

// Manager Monthly Evaluations - Yönetici aylık personel değerlendirmesi
export const managerEvaluations = pgTable("manager_evaluations", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  evaluationMonth: varchar("evaluation_month", { length: 7 }).notNull(), // YYYY-MM format
  // Soft skill değerlendirmeleri (1-5 puan)
  customerServiceScore: integer("customer_service_score").default(3), // Müşteri hizmetleri
  teamworkScore: integer("teamwork_score").default(3), // Takım çalışması
  punctualityScore: integer("punctuality_score").default(3), // Dakiklik
  communicationScore: integer("communication_score").default(3), // İletişim
  initiativeScore: integer("initiative_score").default(3), // İnisiyatif alma
  cleanlinessScore: integer("cleanliness_score").default(3), // Temizlik/Düzen
  technicalSkillScore: integer("technical_skill_score").default(3), // Teknik beceri
  attitudeScore: integer("attitude_score").default(3), // Güler yüz/Tutum
  overallScore: real("overall_score").default(0), // Ortalama puan
  notes: text("notes"), // Ek notlar
  promotionRecommendation: varchar("promotion_recommendation", { length: 20 }).default("hold"), // promote, hold, demote
  warningIssued: boolean("warning_issued").default(false), // Uyarı verildi mi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("manager_evaluations_employee_idx").on(table.employeeId),
  index("manager_evaluations_month_idx").on(table.evaluationMonth),
  index("manager_evaluations_branch_idx").on(table.branchId),
]);

export const insertManagerEvaluationSchema = createInsertSchema(managerEvaluations).omit({
  id: true,
  overallScore: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManagerEvaluation = z.infer<typeof insertManagerEvaluationSchema>;
export type ManagerEvaluation = typeof managerEvaluations.$inferSelect;

// Career Score History - Kariyer skoru geçmişi (aylık)
export const careerScoreHistory = pgTable("career_score_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scoreMonth: varchar("score_month", { length: 7 }).notNull(), // YYYY-MM format
  trainingScore: real("training_score").default(0),
  practicalScore: real("practical_score").default(0),
  attendanceScore: real("attendance_score").default(0),
  managerScore: real("manager_score").default(0),
  compositeScore: real("composite_score").default(0),
  careerLevelId: integer("career_level_id").references(() => careerLevels.id),
  dangerZone: boolean("danger_zone").default(false), // O ay tehlike bölgesinde miydi
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("career_score_history_user_idx").on(table.userId),
  index("career_score_history_month_idx").on(table.scoreMonth),
]);

export const insertCareerScoreHistorySchema = createInsertSchema(careerScoreHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertCareerScoreHistory = z.infer<typeof insertCareerScoreHistorySchema>;
export type CareerScoreHistory = typeof careerScoreHistory.$inferSelect;

// Quiz Results - Sınav sonuçları ve leaderboard verileri
export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id", { length: 100 }).notNull(),
  score: integer("score").notNull(),
  answers: jsonb("answers"),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("quiz_results_user_idx").on(table.userId),
  index("quiz_results_score_idx").on(table.score),
]);

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

// ========================================
// QUIZ METADATA - Sınav Metaveri
// ========================================

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  quizId: varchar("quiz_id", { length: 100 }).notNull().unique(), // e.g., "espresso-101"
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  careerLevelId: integer("career_level_id").notNull().references(() => careerLevels.id),
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(30),
  passingScore: integer("passing_score").default(70),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quizzes_career_level_idx").on(table.careerLevelId),
  index("quizzes_difficulty_idx").on(table.difficulty),
]);

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

// ========================================
// BADGE SYSTEM - Başarı ve Rozetler
// ========================================

// Available Badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  badgeKey: varchar("badge_key", { length: 50 }).notNull().unique(), // first_quiz, top_10, expert_barista, etc
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  descriptionTr: text("description_tr"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  category: varchar("category", { length: 20 }).notNull(), // achievement, skill, milestone, leadership
  condition: jsonb("condition"), // {type: "quiz_score", minScore: 90, count: 3}
  points: integer("points").default(10), // Gamification points
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("badges_category_idx").on(table.category),
]);

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badge Progress
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0), // 0-100% toward badge
}, (table) => [
  index("user_badges_user_idx").on(table.userId),
  index("user_badges_badge_idx").on(table.badgeId),
  unique("user_badges_unique").on(table.userId, table.badgeId),
]);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ========================================
// BRANCH FEEDBACK SYSTEM - Şubelerden Geribildirim
// ========================================

export const branchFeedbacks = pgTable("branch_feedbacks", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "order", "invoice", "logistics", "other"
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("yeni"), // yeni, okundu, yanıtlandı
  response: text("response"),
  respondedById: varchar("responded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("branch_feedbacks_branch_idx").on(table.branchId),
  index("branch_feedbacks_status_idx").on(table.status),
  index("branch_feedbacks_created_idx").on(table.createdAt),
]);

export const insertBranchFeedbackSchema = createInsertSchema(branchFeedbacks).omit({
  id: true,
  createdAt: true,
  status: true,
  respondedAt: true,
});

export type InsertBranchFeedback = z.infer<typeof insertBranchFeedbackSchema>;
export type BranchFeedback = typeof branchFeedbacks.$inferSelect;

// ========================================
// LOST & FOUND SYSTEM - Kayıp Eşya Takibi
// ========================================

export const lostFoundStatusEnum = ["bulunan", "teslim_edildi"] as const;
export type LostFoundStatusType = typeof lostFoundStatusEnum[number];

export const lostFoundItems = pgTable("lost_found_items", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  foundById: varchar("found_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foundDate: date("found_date").notNull(),
  foundTime: time("found_time").notNull(),
  foundArea: varchar("found_area", { length: 100 }).notNull(),
  itemDescription: text("item_description").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("bulunan").notNull(),
  ownerName: varchar("owner_name", { length: 100 }),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  handoverDate: timestamp("handover_date"),
  handoveredById: varchar("handovered_by_id").references(() => users.id, { onDelete: "set null" }),
  handoverNotes: text("handover_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("lost_found_branch_idx").on(table.branchId),
  index("lost_found_status_idx").on(table.status),
  index("lost_found_found_date_idx").on(table.foundDate),
  index("lost_found_created_idx").on(table.createdAt),
]);

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  ownerName: true,
  ownerPhone: true,
  handoverDate: true,
  handoveredById: true,
  handoverNotes: true,
  branchId: true,
  foundById: true,
});

export const handoverLostFoundItemSchema = z.object({
  ownerName: z.string().min(2, "Sahip adı en az 2 karakter olmalı"),
  ownerPhone: z.string().min(10, "Telefon numarası geçersiz"),
  handoverNotes: z.string().optional(),
});

export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;
export type HandoverLostFoundItem = z.infer<typeof handoverLostFoundItemSchema>;
export type LostFoundItem = typeof lostFoundItems.$inferSelect;

// ========================================
// RECIPE MANAGEMENT SYSTEM - Reçete Yönetimi
// ========================================

// Recipe Categories (HOT, ICED, CREAMICE, FRESHESS, etc.)
export const recipeCategories = pgTable("recipe_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // hot, iced, creamice, freshess
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // Sıcak Kahve
  titleEn: varchar("title_en", { length: 100 }), // Hot Coffee
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  colorHex: varchar("color_hex", { length: 7 }), // #FF5733
  displayOrder: integer("display_order").default(0),
  bannerImageUrl: text("banner_image_url"), // Category banner
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recipe_categories_slug_idx").on(table.slug),
  index("recipe_categories_order_idx").on(table.displayOrder),
]);

export const insertRecipeCategorySchema = createInsertSchema(recipeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipeCategory = z.infer<typeof insertRecipeCategorySchema>;
export type RecipeCategory = typeof recipeCategories.$inferSelect;

// Recipes - Ana reçete tablosu
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => recipeCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(), // A, L, FW, BL, etc.
  nameTr: varchar("name_tr", { length: 150 }).notNull(), // Iced Americano
  nameEn: varchar("name_en", { length: 150 }), // Iced Americano
  description: text("description"),
  coffeeType: varchar("coffee_type", { length: 50 }), // espresso, filter, none
  hasCoffee: boolean("has_coffee").default(true),
  hasMilk: boolean("has_milk").default(false),
  difficulty: varchar("difficulty", { length: 20 }).default("easy"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(3),
  requiredRole: varchar("required_role", { length: 50 }), // Minimum rol gereksinimi
  photoUrl: text("photo_url"), // Reçete fotoğrafı
  infographicUrl: text("infographic_url"), // İnfografik / menü kart görseli
  marketingText: text("marketing_text"), // AI destekli pazarlama cümlesi
  salesTips: text("sales_tips"), // Satış dili ve stratejisi
  presentationNotes: text("presentation_notes"), // Sunum bilgileri
  storageConditions: text("storage_conditions"), // Saklama koşulları
  upsellingNotes: text("upselling_notes"), // Upselling önerileri (yan ürün)
  importantNotes: text("important_notes"), // Dikkat edilecek önemli bilgiler
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false), // Öne çıkan reçete
  displayOrder: integer("display_order").default(0),
  tags: varchar("tags", { length: 50 }).array(), // ["seasonal", "signature", "new"]
  subCategory: varchar("sub_category", { length: 20 }), // hot, iced, blend
  currentVersionId: integer("current_version_id"), // En güncel versiyon
  aiEmbedding: vector("ai_embedding"), // pgvector for AI search
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("recipes_category_idx").on(table.categoryId),
  index("recipes_code_idx").on(table.code),
  index("recipes_active_idx").on(table.isActive),
  unique("recipes_category_code_unique").on(table.categoryId, table.code),
]);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiEmbedding: true,
  currentVersionId: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// ========================================
// Size Recipe Type - Comprehensive recipe card structure
// ========================================
export type SizeRecipe = {
  cupMl: number;
  steps: string[];
  espresso?: string;
  concentrates?: Array<{ name: string; pumps: number; }>;
  milk?: { ml?: number; line?: string; type?: string; };
  water?: { ml?: number; line?: string; };
  syrups?: Record<string, number>;
  powders?: Record<string, number>;
  liquids?: Record<string, number>;
  garnish?: string[];
  toppings?: string[];
  ice?: string;
  lid?: string;
  equipment?: string[];
  blenderSetting?: string;
  servingNotes?: string;
};

// Recipe Versions - Versiyon takibi
export const recipeVersions = pgTable("recipe_versions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull().default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  updatedById: varchar("updated_by_id").references(() => users.id),
  changeLog: text("change_log"), // Değişiklik açıklaması
  changedFields: jsonb("changed_fields").$type<string[]>().default([]), // ["steps", "syrups"] - highlighted fields
  // Size variants
  sizes: jsonb("sizes").$type<{
    massivo?: SizeRecipe;
    longDiva?: SizeRecipe;
    camKupa?: SizeRecipe;
    porselenBardak?: SizeRecipe;
    [key: string]: SizeRecipe | undefined;
  }>(),
  // Common fields
  ingredients: jsonb("ingredients").$type<Array<{name: string; amount: string; unit?: string}>>().default([]),
  notes: text("notes"),
  cookingSteps: jsonb("cooking_steps").$type<string[]>().default([]),
  preparationNotes: text("preparation_notes"),
  servingInstructions: text("serving_instructions"),
  storageInfo: text("storage_info"),
  seasonInfo: varchar("season_info", { length: 100 }), // "Sonbahar-Kış sezon ürünü"
  isApproved: boolean("is_approved").default(false),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_versions_recipe_idx").on(table.recipeId),
  index("recipe_versions_version_idx").on(table.versionNumber),
  unique("recipe_versions_unique").on(table.recipeId, table.versionNumber),
]);

export const insertRecipeVersionSchema = createInsertSchema(recipeVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeVersion = z.infer<typeof insertRecipeVersionSchema>;
export type RecipeVersion = typeof recipeVersions.$inferSelect;

// Recipe Notifications - Güncelleme bildirimleri
export const recipeNotifications = pgTable("recipe_notifications", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionId: integer("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_notifications_user_idx").on(table.userId),
  index("recipe_notifications_recipe_idx").on(table.recipeId),
  unique("recipe_notifications_unique").on(table.recipeId, table.versionId, table.userId),
]);

export const insertRecipeNotificationSchema = createInsertSchema(recipeNotifications).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeNotification = z.infer<typeof insertRecipeNotificationSchema>;
export type RecipeNotification = typeof recipeNotifications.$inferSelect;

// ========================================
// GAMIFICATION EXTENSIONS - Oyunlaştırma
// ========================================

// Daily Missions - Günlük görevler
export const dailyMissions = pgTable("daily_missions", {
  id: serial("id").primaryKey(),
  missionKey: varchar("mission_key", { length: 50 }).notNull(), // learn_recipe, complete_quiz, etc.
  titleTr: varchar("title_tr", { length: 150 }).notNull(),
  descriptionTr: text("description_tr"),
  xpReward: integer("xp_reward").default(10),
  targetCount: integer("target_count").default(1), // Kaç kez yapılmalı
  missionType: varchar("mission_type", { length: 30 }).notNull(), // daily, weekly, special
  condition: jsonb("condition"), // {type: "quiz_complete", categoryId: 1}
  iconName: varchar("icon_name", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("daily_missions_type_idx").on(table.missionType),
  index("daily_missions_active_idx").on(table.isActive),
]);

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;

// User Mission Progress - Kullanıcı görev ilerlemesi
export const userMissionProgress = pgTable("user_mission_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull().references(() => dailyMissions.id, { onDelete: "cascade" }),
  currentCount: integer("current_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  xpEarned: integer("xp_earned").default(0),
  missionDate: date("mission_date").notNull(), // Hangi gün için
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_mission_progress_user_idx").on(table.userId),
  index("user_mission_progress_date_idx").on(table.missionDate),
  unique("user_mission_progress_unique").on(table.userId, table.missionId, table.missionDate),
]);

export const insertUserMissionProgressSchema = createInsertSchema(userMissionProgress).omit({
  id: true,
  createdAt: true,
});

export type InsertUserMissionProgress = z.infer<typeof insertUserMissionProgressSchema>;
export type UserMissionProgress = typeof userMissionProgress.$inferSelect;

// Leaderboard Snapshots - Liderlik tablosu anlık görüntüleri
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // weekly, monthly, all_time
  periodKey: varchar("period_key", { length: 20 }).notNull(), // 2025-W01, 2025-01
  totalXp: integer("total_xp").default(0),
  quizCount: integer("quiz_count").default(0),
  perfectQuizCount: integer("perfect_quiz_count").default(0),
  streakDays: integer("streak_days").default(0),
  rank: integer("rank"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leaderboard_snapshots_user_idx").on(table.userId),
  index("leaderboard_snapshots_period_idx").on(table.periodType, table.periodKey),
  index("leaderboard_snapshots_rank_idx").on(table.rank),
  unique("leaderboard_snapshots_unique").on(table.userId, table.periodType, table.periodKey),
]);

export const insertLeaderboardSnapshotSchema = createInsertSchema(leaderboardSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaderboardSnapshot = z.infer<typeof insertLeaderboardSnapshotSchema>;
export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;

// User Practice Sessions - Pratik oturum takibi
export const userPracticeSessions = pgTable("user_practice_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(),
  quizzesCompleted: integer("quizzes_completed").default(0),
  recipesViewed: integer("recipes_viewed").default(0),
  modulesCompleted: integer("modules_completed").default(0),
  xpEarned: integer("xp_earned").default(0),
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  streakDay: integer("streak_day").default(1), // Seri günü
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_practice_sessions_user_idx").on(table.userId),
  index("user_practice_sessions_date_idx").on(table.sessionDate),
  unique("user_practice_sessions_unique").on(table.userId, table.sessionDate),
]);

export const insertUserPracticeSessionSchema = createInsertSchema(userPracticeSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPracticeSession = z.infer<typeof insertUserPracticeSessionSchema>;
export type UserPracticeSession = typeof userPracticeSessions.$inferSelect;

export const learningStreaks = pgTable("learning_streaks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastActivityDate: date("last_activity_date"),
  totalActiveDays: integer("total_active_days").notNull().default(0),
  weeklyGoalTarget: integer("weekly_goal_target").notNull().default(5),
  weeklyGoalProgress: integer("weekly_goal_progress").notNull().default(0),
  monthlyXp: integer("monthly_xp").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("learning_streaks_user_idx").on(table.userId),
  unique("learning_streaks_user_unique").on(table.userId),
]);

export const insertLearningStreakSchema = createInsertSchema(learningStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningStreak = z.infer<typeof insertLearningStreakSchema>;
export type LearningStreak = typeof learningStreaks.$inferSelect;

// Academy Hub Categories - Akademi ana sayfa kategorileri
export const academyHubCategories = pgTable("academy_hub_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // career, recipes, general, practice
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  titleEn: varchar("title_en", { length: 100 }),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon
  colorHex: varchar("color_hex", { length: 7 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("academy_hub_categories_order_idx").on(table.displayOrder),
]);

export const insertAcademyHubCategorySchema = createInsertSchema(academyHubCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertAcademyHubCategory = z.infer<typeof insertAcademyHubCategorySchema>;
export type AcademyHubCategory = typeof academyHubCategories.$inferSelect;

// ========================================
// HQ PROJECT MANAGEMENT SYSTEM
// Proje yönetimi, görev atama, iş birliği
// ========================================

// Project Types
export const projectTypeEnum = ["standard", "new_shop"] as const;
export type ProjectTypeType = typeof projectTypeEnum[number];

// Projects - Ana proje tablosu
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  projectType: varchar("project_type", { length: 30 }).default("standard"), // standard, new_shop
  status: varchar("status", { length: 30 }).default("planning"), // planning, in_progress, completed, on_hold, cancelled
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }), // Yeni şube için oluşturulacak branch
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  // New Shop specific fields
  cityName: varchar("city_name", { length: 100 }), // Şube şehri
  locationAddress: text("location_address"), // Şube adresi
  estimatedBudget: integer("estimated_budget"), // Tahmini bütçe (TL)
  actualBudget: integer("actual_budget"), // Gerçekleşen bütçe (TL)
  franchiseeName: varchar("franchisee_name", { length: 200 }), // Bayi adı
  franchiseePhone: varchar("franchisee_phone", { length: 20 }),
  franchiseeEmail: varchar("franchisee_email", { length: 255 }),
  contractSignedAt: timestamp("contract_signed_at"), // Sözleşme imza tarihi
  targetOpeningDate: date("target_opening_date"), // Hedef açılış tarihi
  actualOpeningDate: date("actual_opening_date"), // Gerçek açılış tarihi
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("projects_owner_idx").on(table.ownerId),
  index("projects_status_idx").on(table.status),
  index("projects_active_idx").on(table.isActive),
  index("projects_type_idx").on(table.projectType),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project Members - Proje ekip üyeleri
// Roller: editor (düzenleme), contributor (görev ekleme), viewer (sadece görüntüleme), owner (tam yetki)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("contributor"), // owner, editor, contributor, viewer
  canManageTeam: boolean("can_manage_team").default(false), // Ekip yönetim yetkisi
  canDeleteTasks: boolean("can_delete_tasks").default(false), // Görev silme yetkisi
  joinedAt: timestamp("joined_at").defaultNow(),
  removedAt: timestamp("removed_at"),
}, (table) => [
  index("project_members_project_idx").on(table.projectId),
  index("project_members_user_idx").on(table.userId),
  unique("project_members_unique").on(table.projectId, table.userId),
]);

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  joinedAt: true,
  removedAt: true,
});

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Project Milestones - Kilometre taşları
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 30 }).default("pending"), // pending, in_progress, completed
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_milestones_project_idx").on(table.projectId),
  index("project_milestones_status_idx").on(table.status),
]);

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;

// Project Tasks - Proje görevleri (enhanced with subtask & milestone support)
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: integer("parent_task_id"), // Alt görev için üst görev ID'si
  milestoneId: integer("milestone_id").references(() => projectMilestones.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("todo"), // todo, in_progress, review, done
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_tasks_project_idx").on(table.projectId),
  index("project_tasks_assigned_idx").on(table.assignedToId),
  index("project_tasks_status_idx").on(table.status),
  index("project_tasks_parent_idx").on(table.parentTaskId),
  index("project_tasks_milestone_idx").on(table.milestoneId),
]);

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// Project Task Dependencies - Görev bağımlılıkları
export const projectTaskDependencies = pgTable("project_task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 30 }).default("finish_to_start"), // finish_to_start, start_to_start, finish_to_finish
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_dependencies_task_idx").on(table.taskId),
  index("task_dependencies_depends_on_idx").on(table.dependsOnTaskId),
  unique("task_dependencies_unique").on(table.taskId, table.dependsOnTaskId),
]);

export const insertProjectTaskDependencySchema = createInsertSchema(projectTaskDependencies).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectTaskDependency = z.infer<typeof insertProjectTaskDependencySchema>;
export type ProjectTaskDependency = typeof projectTaskDependencies.$inferSelect;

// Project Comments - Proje timeline/yorumları
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => projectTasks.id, { onDelete: "cascade" }), // null = project-level comment
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isSystemMessage: boolean("is_system_message").default(false), // For auto-generated activity logs
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_comments_project_idx").on(table.projectId),
  index("project_comments_task_idx").on(table.taskId),
  index("project_comments_user_idx").on(table.userId),
  index("project_comments_created_idx").on(table.createdAt),
]);

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;

// ========================================
// NEW SHOP OPENING - Yeni Şube Açılış Sistemi
// ========================================

// Project Phases - Proje Fazları (Yeni Şube için 7 ana faz)
export const projectPhaseTypeEnum = [
  "company_setup",      // Şirket Kurulum
  "contract_legal",     // Sözleşme & Hukuki
  "construction",       // İnşaat & Dekorasyon
  "equipment",          // Ekipman Yönetimi
  "payments",           // Ödemeler & Bütçe
  "staffing",           // Personel & İşe Alım
  "training_opening"    // Eğitim & Açılış
] as const;
export type ProjectPhaseType = typeof projectPhaseTypeEnum[number];

export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseType: varchar("phase_type", { length: 50 }).notNull(), // company_setup, contract_legal, construction, equipment, payments, staffing, training_opening
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("not_started"), // not_started, in_progress, completed, blocked
  progress: integer("progress").default(0), // 0-100 percentage
  orderIndex: integer("order_index").default(0),
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  isCustom: boolean("is_custom").default(false), // Özel eklenen faz mı?
  iconName: varchar("icon_name", { length: 50 }), // lucide icon name
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_phases_project_idx").on(table.projectId),
  index("project_phases_type_idx").on(table.phaseType),
  index("project_phases_status_idx").on(table.status),
]);

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

// Budget Categories for New Shop
export const budgetCategoryEnum = [
  "franchise_fee",      // Franchise Ücreti
  "rent_deposit",       // Kira & Depozito
  "construction",       // İnşaat
  "decoration",         // Dekorasyon
  "furniture",          // Mobilya
  "equipment",          // Ekipman
  "signage",            // Tabela & Reklam
  "permits",            // İzin & Ruhsat
  "staffing",           // Personel
  "training",           // Eğitim
  "marketing",          // Pazarlama
  "inventory",          // Stok
  "contingency",        // Beklenmedik Giderler
  "other"               // Diğer
] as const;
export type BudgetCategoryType = typeof budgetCategoryEnum[number];

// Project Budget Lines - Bütçe Kalemleri
export const projectBudgetLines = pgTable("project_budget_lines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  category: varchar("category", { length: 50 }).notNull(), // From budgetCategoryEnum
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  plannedAmount: integer("planned_amount").default(0), // TL
  actualAmount: integer("actual_amount").default(0), // TL
  paidAmount: integer("paid_amount").default(0), // Ödenen tutar
  paymentStatus: varchar("payment_status", { length: 30 }).default("pending"), // pending, partial, paid, overdue
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  vendorId: integer("vendor_id"), // Project vendor reference
  invoiceNo: varchar("invoice_no", { length: 100 }),
  notes: text("notes"),
  isContingency: boolean("is_contingency").default(false), // Acil durum tamponu mu?
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_budget_project_idx").on(table.projectId),
  index("project_budget_phase_idx").on(table.phaseId),
  index("project_budget_category_idx").on(table.category),
  index("project_budget_status_idx").on(table.paymentStatus),
]);

export const insertProjectBudgetLineSchema = createInsertSchema(projectBudgetLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectBudgetLine = z.infer<typeof insertProjectBudgetLineSchema>;
export type ProjectBudgetLine = typeof projectBudgetLines.$inferSelect;

// Vendor Types
export const vendorTypeEnum = [
  "contractor",         // Müteahhit
  "architect",          // Mimar
  "interior_designer",  // İç Mimar
  "furniture_supplier", // Mobilya Tedarikçisi
  "equipment_supplier", // Ekipman Tedarikçisi
  "signage_company",    // Tabela Firması
  "marketing_agency",   // Reklam Ajansı
  "legal_advisor",      // Hukuk Danışmanı
  "accountant",         // Mali Müşavir
  "consultant",         // Danışman
  "other"               // Diğer
] as const;
export type VendorType = typeof vendorTypeEnum[number];

// Project Vendors - Tedarikçi/Firma Yönetimi
export const projectVendors = pgTable("project_vendors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  vendorType: varchar("vendor_type", { length: 50 }).notNull(), // From vendorTypeEnum
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 50 }),
  contractStatus: varchar("contract_status", { length: 30 }).default("pending"), // pending, signed, completed, cancelled
  contractAmount: integer("contract_amount"), // TL
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  responsibilityArea: text("responsibility_area"), // Sorumluluk alanı açıklaması
  notes: text("notes"),
  rating: integer("rating"), // 1-5 performance rating
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_vendors_project_idx").on(table.projectId),
  index("project_vendors_type_idx").on(table.vendorType),
  index("project_vendors_status_idx").on(table.contractStatus),
]);

export const insertProjectVendorSchema = createInsertSchema(projectVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectVendor = z.infer<typeof insertProjectVendorSchema>;
export type ProjectVendor = typeof projectVendors.$inferSelect;

// Risk Severity Levels
export const riskSeverityEnum = ["low", "medium", "high", "critical"] as const;
export type RiskSeverityType = typeof riskSeverityEnum[number];

// Project Risks - Risk Yönetimi
export const projectRisks = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  probability: integer("probability").default(3), // 1-5 (1=düşük, 5=yüksek)
  impact: integer("impact").default(3), // 1-5 (1=düşük, 5=yüksek)
  severity: varchar("severity", { length: 20 }).default("medium"), // Calculated: low, medium, high, critical
  status: varchar("status", { length: 30 }).default("identified"), // identified, mitigating, resolved, occurred
  mitigationPlan: text("mitigation_plan"), // Risk azaltma planı
  contingencyPlan: text("contingency_plan"), // Alternatif plan
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  identifiedAt: timestamp("identified_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_risks_project_idx").on(table.projectId),
  index("project_risks_phase_idx").on(table.phaseId),
  index("project_risks_severity_idx").on(table.severity),
  index("project_risks_status_idx").on(table.status),
]);

export const insertProjectRiskSchema = createInsertSchema(projectRisks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectRisk = z.infer<typeof insertProjectRiskSchema>;
export type ProjectRisk = typeof projectRisks.$inferSelect;

// ========================================
// PHASE MANAGEMENT SYSTEM - Faz Yönetim Sistemi
// ========================================

// RACI Enum
export const raciRoleEnum = ["responsible", "accountable", "consulted", "informed"] as const;
export type RaciRoleType = typeof raciRoleEnum[number];

// Phase Assignments - Faz Ekip Atamaları (RACI)
export const phaseAssignments = pgTable("phase_assignments", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Internal user
  externalUserId: integer("external_user_id").references(() => externalUsers.id, { onDelete: "cascade" }), // External user
  raciRole: varchar("raci_role", { length: 20 }).notNull(), // responsible, accountable, consulted, informed
  canEditPhase: boolean("can_edit_phase").default(false),
  canManageTasks: boolean("can_manage_tasks").default(false),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("phase_assignments_phase_idx").on(table.phaseId),
  index("phase_assignments_user_idx").on(table.userId),
  index("phase_assignments_external_idx").on(table.externalUserId),
]);

export const insertPhaseAssignmentSchema = createInsertSchema(phaseAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertPhaseAssignment = z.infer<typeof insertPhaseAssignmentSchema>;
export type PhaseAssignment = typeof phaseAssignments.$inferSelect;

// Sub Task Status
export const subTaskStatusEnum = ["not_started", "in_progress", "blocked", "done"] as const;
export type SubTaskStatusType = typeof subTaskStatusEnum[number];

// Phase Sub Tasks - Faz Alt Görevleri
export const phaseSubTasks = pgTable("phase_sub_tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // Self-reference for nested categories - will add .references in table config
  isCategory: boolean("is_category").default(false), // True if this is a category, false if task
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("not_started"),
  sortOrder: integer("sort_order").default(0),
  dueDate: date("due_date"),
  assigneeUserId: varchar("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
  assigneeExternalId: integer("assignee_external_id").references(() => externalUsers.id, { onDelete: "set null" }),
  requiresBidding: boolean("requires_bidding").default(false), // Teklif gerektirir mi?
  completedAt: timestamp("completed_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("phase_sub_tasks_phase_idx").on(table.phaseId),
  index("phase_sub_tasks_parent_idx").on(table.parentId),
  index("phase_sub_tasks_status_idx").on(table.status),
]);

export const insertPhaseSubTaskSchema = createInsertSchema(phaseSubTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertPhaseSubTask = z.infer<typeof insertPhaseSubTaskSchema>;
export type PhaseSubTask = typeof phaseSubTasks.$inferSelect;

// Procurement Status
export const procurementStatusEnum = ["draft", "open", "under_review", "awarded", "closed", "cancelled"] as const;
export type ProcurementStatusType = typeof procurementStatusEnum[number];

// Procurement Items - Tedarik Kalemleri
export const procurementItems = pgTable("procurement_items", {
  id: serial("id").primaryKey(),
  subTaskId: integer("sub_task_id").notNull().references(() => phaseSubTasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  specifications: text("specifications"), // Teknik özellikler
  quantity: integer("quantity").default(1),
  unit: varchar("unit", { length: 50 }), // adet, kg, metre vb.
  estimatedBudget: integer("estimated_budget"), // TL
  status: varchar("status", { length: 30 }).default("draft"),
  biddingDeadline: timestamp("bidding_deadline"),
  selectedProposalId: integer("selected_proposal_id"), // Will reference proposals
  awardedAt: timestamp("awarded_at"),
  awardedById: varchar("awarded_by_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_items_subtask_idx").on(table.subTaskId),
  index("procurement_items_status_idx").on(table.status),
]);

export const insertProcurementItemSchema = createInsertSchema(procurementItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  awardedAt: true,
});

export type InsertProcurementItem = z.infer<typeof insertProcurementItemSchema>;
export type ProcurementItem = typeof procurementItems.$inferSelect;

// Proposal Status
export const proposalStatusEnum = ["submitted", "under_review", "selected", "rejected", "withdrawn"] as const;
export type ProposalStatusType = typeof proposalStatusEnum[number];

// Procurement Proposals - Teklifler
export const procurementProposals = pgTable("procurement_proposals", {
  id: serial("id").primaryKey(),
  procurementItemId: integer("procurement_item_id").notNull().references(() => procurementItems.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => externalUsers.id, { onDelete: "set null" }), // External vendor
  vendorName: varchar("vendor_name", { length: 200 }), // If no external user record
  vendorPhone: varchar("vendor_phone", { length: 30 }),
  vendorEmail: varchar("vendor_email", { length: 255 }),
  vendorCompany: varchar("vendor_company", { length: 200 }),
  proposedPrice: integer("proposed_price").notNull(), // TL
  currency: varchar("currency", { length: 10 }).default("TRY"),
  deliveryDays: integer("delivery_days"), // Teslimat süresi (gün)
  warrantyMonths: integer("warranty_months"), // Garanti süresi (ay)
  specifications: text("specifications"), // Teklif detayları
  notes: text("notes"),
  attachmentUrls: text("attachment_urls").array(), // Teklif dosyaları
  status: varchar("status", { length: 30 }).default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_proposals_item_idx").on(table.procurementItemId),
  index("procurement_proposals_vendor_idx").on(table.vendorId),
  index("procurement_proposals_status_idx").on(table.status),
]);

export const insertProcurementProposalSchema = createInsertSchema(procurementProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
});

export type InsertProcurementProposal = z.infer<typeof insertProcurementProposalSchema>;
export type ProcurementProposal = typeof procurementProposals.$inferSelect;

// ========================================
// EXTERNAL USERS - Dış Kullanıcı Erişim Sistemi
// ========================================

// External Users - Proje bazlı dış kullanıcılar (mimar, müteahhit vb.)
export const externalUsers = pgTable("external_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  companyName: varchar("company_name", { length: 200 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  specialty: varchar("specialty", { length: 100 }), // Mobilyacı, Mimar, Elektrikçi, Avukat vb.
  accessToken: varchar("access_token", { length: 255 }), // Magic link token
  tokenExpiresAt: timestamp("token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  invitedById: varchar("invited_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("external_users_email_idx").on(table.email),
  index("external_users_token_idx").on(table.accessToken),
]);

export const insertExternalUserSchema = createInsertSchema(externalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExternalUser = z.infer<typeof insertExternalUserSchema>;
export type ExternalUser = typeof externalUsers.$inferSelect;

// External User Project Access - Dış kullanıcıların proje erişimleri
export const externalUserProjects = pgTable("external_user_projects", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("viewer"), // viewer, contributor
  canViewBudget: boolean("can_view_budget").default(false),
  canViewTasks: boolean("can_view_tasks").default(true),
  canComment: boolean("can_comment").default(true),
  canUploadFiles: boolean("can_upload_files").default(false),
  grantedById: varchar("granted_by_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null = no expiration
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("external_user_projects_user_idx").on(table.externalUserId),
  index("external_user_projects_project_idx").on(table.projectId),
  unique("external_user_projects_unique").on(table.externalUserId, table.projectId),
]);

export const insertExternalUserProjectSchema = createInsertSchema(externalUserProjects).omit({
  id: true,
  grantedAt: true,
});

export type InsertExternalUserProject = z.infer<typeof insertExternalUserProjectSchema>;
export type ExternalUserProject = typeof externalUserProjects.$inferSelect;

// External User Audit Log - Dış kullanıcı aktivite logları
export const externalUserAuditLog = pgTable("external_user_audit_log", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // login, view_project, add_comment, upload_file, etc.
  details: text("details"), // JSON details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("external_audit_user_idx").on(table.externalUserId),
  index("external_audit_project_idx").on(table.projectId),
  index("external_audit_created_idx").on(table.createdAt),
]);

export const insertExternalUserAuditLogSchema = createInsertSchema(externalUserAuditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertExternalUserAuditLog = z.infer<typeof insertExternalUserAuditLogSchema>;
export type ExternalUserAuditLog = typeof externalUserAuditLog.$inferSelect;


// ============================================
// ADMIN PANEL - E-posta Ayarları
// ============================================
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }), // Encrypted
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO"),
  smtpSecure: boolean("smtp_secure").default(false), // TLS
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Servis Email Ayarları (Arıza/Bakım için ayrı SMTP)
// ============================================
export const serviceEmailSettings = pgTable("service_email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO Teknik"),
  smtpSecure: boolean("smtp_secure").default(false),
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceEmailSettingsSchema = createInsertSchema(serviceEmailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertServiceEmailSettings = z.infer<typeof insertServiceEmailSettingsSchema>;
export type ServiceEmailSettings = typeof serviceEmailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Banner Yönetimi
// ============================================
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  targetRoles: text("target_roles").array(), // null = all roles
  startDate: timestamp("start_date"), // Nullable for drafts
  endDate: timestamp("end_date"), // Nullable for drafts
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("banners_active_idx").on(table.isActive),
  index("banners_dates_idx").on(table.startDate, table.endDate),
]);

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// ============================================
// ADMIN PANEL - AI Sağlayıcı Ayarları
// ============================================
export const AI_PROVIDERS = {
  OPENAI: "openai",
  GEMINI: "gemini",
  ANTHROPIC: "anthropic",
} as const;

export type AIProviderType = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  // Aktif sağlayıcı
  provider: varchar("provider", { length: 30 }).notNull().default("openai"), // openai, gemini, anthropic
  isActive: boolean("is_active").default(true),
  // OpenAI ayarları
  openaiApiKey: text("openai_api_key"), // Şifreli
  openaiChatModel: varchar("openai_chat_model", { length: 100 }).default("gpt-4o"),
  openaiEmbeddingModel: varchar("openai_embedding_model", { length: 100 }).default("text-embedding-3-small"),
  openaiVisionModel: varchar("openai_vision_model", { length: 100 }).default("gpt-4o"),
  // Gemini ayarları
  geminiApiKey: text("gemini_api_key"), // Şifreli
  geminiChatModel: varchar("gemini_chat_model", { length: 100 }).default("gemini-2.0-flash"),
  geminiEmbeddingModel: varchar("gemini_embedding_model", { length: 100 }).default("text-embedding-004"),
  geminiVisionModel: varchar("gemini_vision_model", { length: 100 }).default("gemini-2.0-flash"),
  // Anthropic (Claude) ayarları
  anthropicApiKey: text("anthropic_api_key"), // Şifreli
  anthropicChatModel: varchar("anthropic_chat_model", { length: 100 }).default("claude-sonnet-4-20250514"),
  anthropicVisionModel: varchar("anthropic_vision_model", { length: 100 }).default("claude-sonnet-4-20250514"),
  // Genel ayarlar
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2000),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  // Embedding tracking
  lastEmbeddingProvider: varchar("last_embedding_provider", { length: 30 }),
  needsReembed: boolean("needs_reembed").default(false),
  // Metadata
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

// Phase Status Constants
export const PHASE_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
} as const;

export type PhaseStatusType = typeof PHASE_STATUS[keyof typeof PHASE_STATUS];
export const NEW_SHOP_PHASE_TEMPLATE: Array<{
  phaseType: ProjectPhaseType;
  title: string;
  description: string;
  iconName: string;
  colorHex: string;
  orderIndex: number;
  targetDays: number;
}> = [
  {
    phaseType: "company_setup",
    title: "Şirket Kurulumu",
    description: "Şirket tescili, vergi mükellefiyet kaydı, banka hesabı açılışı, imza sirküleri",
    iconName: "Building2",
    colorHex: "#8b5cf6",
    orderIndex: 0,
    targetDays: 30,
  },
  {
    phaseType: "contract_legal",
    title: "Sözleşmeler & Hukuki",
    description: "Franchise sözleşmesi, kira sözleşmesi, sigorta poliçeleri, yasal izinler",
    iconName: "FileSignature",
    colorHex: "#6366f1",
    orderIndex: 1,
    targetDays: 45,
  },
  {
    phaseType: "construction",
    title: "İnşaat & Dekorasyon",
    description: "Mekan tadilat, elektrik/tesisat, dekorasyon, dış cephe, tabela",
    iconName: "Hammer",
    colorHex: "#f59e0b",
    orderIndex: 2,
    targetDays: 120,
  },
  {
    phaseType: "equipment",
    title: "Ekipman Yönetimi",
    description: "Kahve makineleri, mutfak ekipmanları, mobilya, POS sistemi, güvenlik",
    iconName: "Coffee",
    colorHex: "#10b981",
    orderIndex: 3,
    targetDays: 150,
  },
  {
    phaseType: "payments",
    title: "Ödemeler & Bütçe",
    description: "Franchise ücreti, depozito, tedarikçi ödemeleri, bütçe takibi",
    iconName: "Wallet",
    colorHex: "#ef4444",
    orderIndex: 4,
    targetDays: 165,
  },
  {
    phaseType: "staffing",
    title: "Personel & İşe Alım",
    description: "İşe alım, mülakat, sözleşme, SGK kaydı, oryantasyon",
    iconName: "Users",
    colorHex: "#3b82f6",
    orderIndex: 5,
    targetDays: 175,
  },
  {
    phaseType: "training_opening",
    title: "Eğitim & Açılış",
    description: "Barista eğitimi, operasyon eğitimi, hijyen sertifikası, açılış öncesi pratik",
    iconName: "GraduationCap",
    colorHex: "#ec4899",
    orderIndex: 6,
    targetDays: 180,
  },
];

// ============================================
// İŞE ALIM MODÜLÜ - Job Positions, Applications, Interviews
// ============================================

// Pozisyon durumları
export const JOB_POSITION_STATUS = {
  OPEN: "open",
  PAUSED: "paused",
  FILLED: "filled",
  CANCELLED: "cancelled",
} as const;

export type JobPositionStatusType = typeof JOB_POSITION_STATUS[keyof typeof JOB_POSITION_STATUS];

// Başvuru durumları
export const APPLICATION_STATUS = {
  NEW: "new",
  SCREENING: "screening",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_COMPLETED: "interview_completed",
  OFFERED: "offered",
  HIRED: "hired",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatusType = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// Mülakat durumları
export const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type InterviewStatusType = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

// Mülakat sonuçları
export const INTERVIEW_RESULT = {
  PENDING: "pending",
  POSITIVE: "positive",
  FINALIST: "finalist",
  NEGATIVE: "negative",
} as const;

export type InterviewResultType = typeof INTERVIEW_RESULT[keyof typeof INTERVIEW_RESULT];

// Açık Pozisyonlar Tablosu
export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Pozisyon adı: Barista, Supervisor vb.
  targetRole: varchar("target_role", { length: 50 }).notNull(), // UserRoleType
  branchId: integer("branch_id").references(() => branches.id), // Null ise HQ pozisyonu
  department: varchar("department", { length: 100 }), // HQ için departman
  description: text("description"), // Pozisyon açıklaması
  requirements: text("requirements"), // Gereksinimler
  salaryMin: integer("salary_min"), // Minimum maaş
  salaryMax: integer("salary_max"), // Maximum maaş
  employmentType: varchar("employment_type", { length: 50 }).default("fulltime"), // fulltime, parttime, intern
  headcount: integer("headcount").default(1), // Kaç kişi alınacak
  hiredCount: integer("hired_count").default(0), // Kaç kişi alındı
  status: varchar("status", { length: 30 }).notNull().default("open"), // open, paused, filled, cancelled
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  deadline: date("deadline"), // Son başvuru tarihi
  selectedApplicationId: integer("selected_application_id").references(() => jobApplications.id), // Seçilen aday
  closedAt: timestamp("closed_at"), // Pozisyon kapatılma tarihi
  closedReason: varchar("closed_reason", { length: 100 }), // closed_reason: hired, no_candidates, cancelled
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id), // İşe alımdan sorumlu kişi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("job_positions_status_idx").on(table.status),
  index("job_positions_branch_idx").on(table.branchId),
]);

export const insertJobPositionSchema = createInsertSchema(jobPositions).omit({
  id: true,
  hiredCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobPosition = z.infer<typeof insertJobPositionSchema>;
export type JobPosition = typeof jobPositions.$inferSelect;

// Başvurular Tablosu
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull().references(() => jobPositions.id),
  // Aday bilgileri
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  tckn: varchar("tckn", { length: 11 }), // TC Kimlik No (opsiyonel başvuru aşamasında)
  birthDate: date("birth_date"),
  address: text("address"),
  // Başvuru bilgileri
  resumeUrl: text("resume_url"), // CV dosyası
  coverLetter: text("cover_letter"), // Ön yazı
  source: varchar("source", { length: 100 }), // Nereden geldi: kariyer.net, referans, yürüyen vb.
  referredBy: varchar("referred_by_id").references(() => users.id), // Referans veren personel
  experience: text("experience"), // Deneyim özeti
  education: varchar("education", { length: 200 }), // Eğitim durumu
  expectedSalary: integer("expected_salary"), // Beklenen maaş
  availableFrom: date("available_from"), // Ne zaman başlayabilir
  // Durum ve değerlendirme
  status: varchar("status", { length: 30 }).notNull().default("new"), // ApplicationStatusType
  rating: integer("rating"), // 1-5 arası puanlama
  notes: text("notes"), // Değerlendirme notları
  rejectionReason: text("rejection_reason"), // Red nedeni
  // Tracking
  createdById: varchar("created_by_id").references(() => users.id), // Kim ekledi (null = online başvuru)
  assignedToId: varchar("assigned_to_id").references(() => users.id), // Kim takip ediyor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("job_applications_position_idx").on(table.positionId),
  index("job_applications_status_idx").on(table.status),
]);

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

// Mülakatlar Tablosu
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  // Mülakat bilgileri
  interviewType: varchar("interview_type", { length: 50 }).notNull(), // phone, video, onsite, trial_day
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(30), // Dakika cinsinden
  location: text("location"), // Şube adresi veya online link
  // Mülakatçı bilgileri
  interviewerId: varchar("interviewer_id").notNull().references(() => users.id),
  additionalInterviewers: text("additional_interviewers"), // JSON: [userId1, userId2]
  // Sonuç
  status: varchar("status", { length: 30 }).notNull().default("scheduled"), // InterviewStatusType
  result: varchar("result", { length: 30 }), // InterviewResultType
  feedback: text("feedback"), // Mülakat geri bildirimi
  rating: integer("rating"), // 1-5 arası değerlendirme
  strengths: text("strengths"), // Güçlü yönler
  weaknesses: text("weaknesses"), // Gelişim alanları
  recommendation: text("recommendation"), // İşe al/alma önerisi
  // Metadata
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("interviews_application_idx").on(table.applicationId),
  index("interviews_date_idx").on(table.scheduledDate),
  index("interviews_interviewer_idx").on(table.interviewerId),
]);

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;

// Standart Mülakat Soruları (HQ yönetimli)
export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // behavioral, technical, situational, star, general
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

// Mülakat Soru-Cevap Kayıtları
export const interviewResponses = pgTable("interview_responses", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => interviewQuestions.id),
  answer: text("answer"), // Adayın cevabı
  score: integer("score"), // 1-5 arası puan
  notes: text("notes"), // Mülakatçı notu
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("interview_responses_interview_idx").on(table.interviewId),
  index("interview_responses_question_idx").on(table.questionId),
]);

export const insertInterviewResponseSchema = createInsertSchema(interviewResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertInterviewResponse = z.infer<typeof insertInterviewResponseSchema>;
export type InterviewResponse = typeof interviewResponses.$inferSelect;

// İşten Çıkarma ve Ayrılış Kayıtları
export const employeeTerminations = pgTable("employee_terminations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  terminationType: varchar("termination_type", { length: 50 }).notNull(), // resignation, termination, retirement, mutual_agreement, contract_end
  terminationDate: date("termination_date").notNull(),
  terminationReason: text("termination_reason"), // Ayrılış sebebi
  lastWorkDay: date("last_work_day"), // Son çalışma günü
  noticeGiven: integer("notice_given"), // Gün cinsinden uyarı süresi
  finalSalary: integer("final_salary"), // Son maaş tutarı
  severancePayment: integer("severance_payment"), // Kıdem tazminatı
  otherPayments: integer("other_payments"), // Diğer ödemeler
  totalPayment: integer("total_payment"), // Toplam ödeme
  returnedItems: text("returned_items"), // Teslim edilen işletme malları (JSON array)
  exitInterview: text("exit_interview"), // Çıkış görüşmesi notları
  performanceRating: integer("performance_rating"), // Son performans puanı (1-5)
  recommendation: text("recommendation"), // Yeniden işe alım önerisi
  processedById: varchar("processed_by_id").notNull().references(() => users.id), // İK tarafından işlem gören
  approvedById: varchar("approved_by_id").references(() => users.id), // Onay yapan (genellikle HQ)
  documents: text("documents").array(), // Sözleşme, tazminat formu vb. URL'ler
  notes: text("notes"), // Genel notlar
  noticeEndDate: date("notice_end_date"), // İhbar süresi bitiş tarihi
  severanceEligible: boolean("severance_eligible").default(false), // Kıdem tazminatı hak ediyor mu
  noticePeriodDays: integer("notice_period_days"), // İhbar süresi (gün)
  terminationSubReason: varchar("termination_sub_reason", { length: 100 }), // Alt ayrılış nedeni (resigned_voluntarily, resigned_forced, fired_performance, fired_misconduct, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_terminations_user_idx").on(table.userId),
  index("employee_terminations_date_idx").on(table.terminationDate),
  index("employee_terminations_type_idx").on(table.terminationType),
]);

export const insertEmployeeTerminationSchema = createInsertSchema(employeeTerminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeTermination = z.infer<typeof insertEmployeeTerminationSchema>;
export type EmployeeTermination = typeof employeeTerminations.$inferSelect;

export const shiftCorrections = pgTable("shift_corrections", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "cascade" }),
  sessionId: integer("session_id"),
  correctedById: varchar("corrected_by_id").notNull().references(() => users.id),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  correctionType: varchar("correction_type", { length: 50 }).notNull(),
  fieldChanged: varchar("field_changed", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("shift_corrections_shift_idx").on(table.shiftId),
  index("shift_corrections_employee_idx").on(table.employeeId),
  index("shift_corrections_corrected_by_idx").on(table.correctedById),
]);

export const insertShiftCorrectionSchema = createInsertSchema(shiftCorrections).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftCorrection = z.infer<typeof insertShiftCorrectionSchema>;
export type ShiftCorrection = typeof shiftCorrections.$inferSelect;

// Çalışan İzin Bakiyeleri
export const employeeLeaves = pgTable("employee_leaves", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(), // İzin yılı
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, maternity, paternity, marriage, bereavement
  totalDays: integer("total_days").notNull().default(14), // Toplam izin hakkı
  usedDays: integer("used_days").notNull().default(0), // Kullanılan gün
  remainingDays: integer("remaining_days").notNull().default(14), // Kalan izin
  carriedOver: integer("carried_over").default(0), // Geçen yıldan aktarılan
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_leaves_user_idx").on(table.userId),
  index("employee_leaves_year_idx").on(table.year),
  index("employee_leaves_type_idx").on(table.leaveType),
]);

export const insertEmployeeLeaveSchema = createInsertSchema(employeeLeaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeLeave = z.infer<typeof insertEmployeeLeaveSchema>;
export type EmployeeLeave = typeof employeeLeaves.$inferSelect;

// ========================================
// DETAYLI RAPORLAMA VE ANALİTİK SİSTEMİ
// ========================================

// Detaylı Raporlar
export const detailedReports = pgTable("detailed_reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  reportType: varchar("report_type", { length: 50 }).notNull(), // branch_comparison, trend_analysis, performance
  branchIds: integer("branch_ids").array(),
  dateRange: jsonb("date_range").notNull(), // { startDate, endDate }
  metrics: jsonb("metrics").notNull(),
  filters: jsonb("filters"),
  chartType: varchar("chart_type", { length: 50 }),
  includeAISummary: boolean("include_ai_summary").default(false),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("reports_type_idx").on(table.reportType),
  index("reports_created_idx").on(table.createdAt),
]);

export const insertDetailedReportSchema = createInsertSchema(detailedReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDetailedReport = z.infer<typeof insertDetailedReportSchema>;
export type DetailedReport = typeof detailedReports.$inferSelect;

// Şube Karşılaştırma
export const branchComparisons = pgTable("branch_comparisons", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => detailedReports.id, { onDelete: "cascade" }),
  branch1Id: integer("branch1_id").notNull().references(() => branches.id),
  branch2Id: integer("branch2_id").notNull().references(() => branches.id),
  metric: varchar("metric", { length: 100 }).notNull(),
  branch1Value: numeric("branch1_value"),
  branch2Value: numeric("branch2_value"),
  difference: numeric("difference"),
  percentDifference: numeric("percent_difference"),
  trend: varchar("trend", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("comparisons_report_idx").on(table.reportId),
  index("comparisons_metric_idx").on(table.metric),
]);

export const insertBranchComparisonSchema = createInsertSchema(branchComparisons).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchComparison = z.infer<typeof insertBranchComparisonSchema>;
export type BranchComparison = typeof branchComparisons.$inferSelect;

// Trend Metrikler
export const trendMetrics = pgTable("trend_metrics", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => detailedReports.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  date: date("date").notNull(),
  value: numeric("value").notNull(),
  previousValue: numeric("previous_value"),
  changePercent: numeric("change_percent"),
  target: numeric("target"),
  status: varchar("status", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("trends_report_idx").on(table.reportId),
  index("trends_branch_idx").on(table.branchId),
  index("trends_metric_idx").on(table.metricName),
  index("trends_date_idx").on(table.date),
]);

export const insertTrendMetricSchema = createInsertSchema(trendMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertTrendMetric = z.infer<typeof insertTrendMetricSchema>;
export type TrendMetric = typeof trendMetrics.$inferSelect;

// AI Rapor Özeti
export const aiReportSummaries = pgTable("ai_report_summaries", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => detailedReports.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyFindings: jsonb("key_findings"),
  recommendations: jsonb("recommendations"),
  visualInsights: jsonb("visual_insights"),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("summaries_report_idx").on(table.reportId),
]);

export const insertAIReportSummarySchema = createInsertSchema(aiReportSummaries).omit({
  id: true,
  generatedAt: true,
});

export type InsertAIReportSummary = z.infer<typeof insertAIReportSummarySchema>;
export type AIReportSummary = typeof aiReportSummaries.$inferSelect;

// Resmi Tatiller
export const publicHolidays = pgTable("public_holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // Tatil adı
  date: date("date").notNull(), // Tatil tarihi
  year: integer("year").notNull(), // Yıl
  isHalfDay: boolean("is_half_day").default(false), // Yarım gün mü
  isActive: boolean("is_active").default(true), // Aktif mi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("public_holidays_date_idx").on(table.date),
  index("public_holidays_year_idx").on(table.year),
]);

export const insertPublicHolidaySchema = createInsertSchema(publicHolidays).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicHoliday = z.infer<typeof insertPublicHolidaySchema>;
export type PublicHoliday = typeof publicHolidays.$inferSelect;

// İzin Kayıtları (kullanılan izinler)
export const leaveRecords = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(), // Toplam gün sayısı
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  reason: text("reason"), // İzin nedeni
  approvedById: varchar("approved_by_id").references(() => users.id), // Onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leave_records_user_idx").on(table.userId),
  index("leave_records_date_idx").on(table.startDate),
  index("leave_records_status_idx").on(table.status),
]);

export const insertLeaveRecordSchema = createInsertSchema(leaveRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaveRecord = z.infer<typeof insertLeaveRecordSchema>;
export type LeaveRecord = typeof leaveRecords.$inferSelect;

// ========== MAAŞ YÖNETİMİ SİSTEMİ ==========

// Personel Maaş Bilgileri
export const employeeSalaries = pgTable("employee_salaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseSalary: integer("base_salary").notNull(), // Brüt maaş (kuruş cinsinden - 100 = 1 TL)
  netSalary: integer("net_salary"), // Net maaş
  employmentType: varchar("employment_type", { length: 20 }).notNull().default("fulltime"), // fulltime, parttime
  weeklyHours: integer("weekly_hours").notNull().default(45), // Haftalık çalışma saati (fulltime: 45, parttime: özel)
  hourlyRate: integer("hourly_rate"), // Saatlik ücret (part-time için)
  paymentDay: integer("payment_day").default(1), // Maaş ödeme günü (1-31)
  bankName: varchar("bank_name", { length: 100 }),
  iban: varchar("iban", { length: 34 }),
  taxRate: numeric("tax_rate").default("0"), // Vergi oranı
  insuranceRate: numeric("insurance_rate").default("0"), // SGK oranı
  effectiveFrom: date("effective_from").notNull(), // Geçerlilik başlangıcı
  effectiveTo: date("effective_to"), // Geçerlilik bitişi (null = aktif)
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_salaries_user_idx").on(table.userId),
  index("employee_salaries_active_idx").on(table.isActive),
  index("employee_salaries_effective_idx").on(table.effectiveFrom, table.effectiveTo),
]);

export const insertEmployeeSalarySchema = createInsertSchema(employeeSalaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeSalary = z.infer<typeof insertEmployeeSalarySchema>;
export type EmployeeSalary = typeof employeeSalaries.$inferSelect;

// Maaş Kesintileri Tanımları
export const salaryDeductionTypes = pgTable("salary_deduction_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // late_arrival, unpaid_leave, sick_leave_no_report, etc.
  name: varchar("name", { length: 100 }).notNull(), // Geç Kalma, Ücretsiz İzin, vb.
  description: text("description"),
  calculationType: varchar("calculation_type", { length: 20 }).notNull(), // fixed, hourly, daily, percentage
  defaultAmount: integer("default_amount"), // Sabit kesinti miktarı (kuruş)
  defaultPercentage: numeric("default_percentage"), // Yüzde bazlı kesinti
  perMinuteDeduction: integer("per_minute_deduction"), // Dakika başına kesinti (geç kalma için)
  perHourDeduction: integer("per_hour_deduction"), // Saat başına kesinti
  perDayDeduction: integer("per_day_deduction"), // Gün başına kesinti
  isAutomatic: boolean("is_automatic").default(true), // Otomatik hesaplanır mı
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("deduction_types_code_idx").on(table.code),
  index("deduction_types_active_idx").on(table.isActive),
]);

export const insertSalaryDeductionTypeSchema = createInsertSchema(salaryDeductionTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertSalaryDeductionType = z.infer<typeof insertSalaryDeductionTypeSchema>;
export type SalaryDeductionType = typeof salaryDeductionTypes.$inferSelect;

// Aylık Bordro
export const monthlyPayrolls = pgTable("monthly_payrolls", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  // Brüt hesaplamalar
  baseSalary: integer("base_salary").notNull(), // Brüt maaş
  workedDays: integer("worked_days").notNull().default(0), // Çalışılan gün
  workedHours: integer("worked_hours").notNull().default(0), // Çalışılan saat
  overtimeHours: integer("overtime_hours").default(0), // Fazla mesai saati
  overtimePay: integer("overtime_pay").default(0), // Fazla mesai ücreti
  // Kesintiler
  totalDeductions: integer("total_deductions").default(0), // Toplam kesinti
  lateDeductions: integer("late_deductions").default(0), // Geç kalma kesintisi
  absenceDeductions: integer("absence_deductions").default(0), // Devamsızlık kesintisi
  unpaidLeaveDeductions: integer("unpaid_leave_deductions").default(0), // Ücretsiz izin kesintisi
  sickLeaveDeductions: integer("sick_leave_deductions").default(0), // Raporlu izin kesintisi
  otherDeductions: integer("other_deductions").default(0), // Diğer kesintiler
  // Vergiler
  taxAmount: integer("tax_amount").default(0), // Gelir vergisi
  insuranceEmployee: integer("insurance_employee").default(0), // SGK işçi payı
  insuranceEmployer: integer("insurance_employer").default(0), // SGK işveren payı
  unemploymentInsurance: integer("unemployment_insurance").default(0), // İşsizlik sigortası
  // Sonuç
  grossSalary: integer("gross_salary").notNull(), // Brüt toplam
  netSalary: integer("net_salary").notNull(), // Net maaş
  // Durum
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, calculated, approved, paid
  calculatedAt: timestamp("calculated_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payrolls_user_idx").on(table.userId),
  index("payrolls_branch_idx").on(table.branchId),
  index("payrolls_period_idx").on(table.month, table.year),
  index("payrolls_status_idx").on(table.status),
  unique("payrolls_user_period_unique").on(table.userId, table.month, table.year),
]);

export const insertMonthlyPayrollSchema = createInsertSchema(monthlyPayrolls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyPayroll = z.infer<typeof insertMonthlyPayrollSchema>;
export type MonthlyPayroll = typeof monthlyPayrolls.$inferSelect;

// Uygulanan Maaş Kesintileri
export const salaryDeductions = pgTable("salary_deductions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  payrollId: integer("payroll_id").references(() => monthlyPayrolls.id, { onDelete: "cascade" }),
  deductionTypeId: integer("deduction_type_id").notNull().references(() => salaryDeductionTypes.id),
  amount: integer("amount").notNull(), // Kesinti miktarı (kuruş)
  reason: text("reason"), // Kesinti sebebi detayı
  referenceDate: date("reference_date").notNull(), // İlgili tarih
  referenceType: varchar("reference_type", { length: 50 }), // attendance, leave_request, manual
  referenceId: integer("reference_id"), // İlgili kaydın ID'si (shiftAttendance.id, leaveRequest.id vb.)
  lateMinutes: integer("late_minutes"), // Geç kalma dakikası
  absentHours: integer("absent_hours"), // Devamsızlık saati
  absentDays: integer("absent_days"), // Devamsızlık günü
  isAutomatic: boolean("is_automatic").default(true), // Otomatik mi manuel mi
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("salary_deductions_user_idx").on(table.userId),
  index("salary_deductions_payroll_idx").on(table.payrollId),
  index("salary_deductions_type_idx").on(table.deductionTypeId),
  index("salary_deductions_date_idx").on(table.referenceDate),
  index("salary_deductions_status_idx").on(table.status),
]);

export const insertSalaryDeductionSchema = createInsertSchema(salaryDeductions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalaryDeduction = z.infer<typeof insertSalaryDeductionSchema>;
export type SalaryDeduction = typeof salaryDeductions.$inferSelect;

// =====================================================
// BORDRO PARAMETRELERİ - Türkiye Mevzuatı
// =====================================================

// Bordro Parametreleri (Yıllık vergi dilimleri, SGK oranları, muafiyetler)
export const payrollParameters = pgTable("payroll_parameters", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(), // 2025, 2026, vb.
  effectiveFrom: date("effective_from").notNull(), // Yürürlük başlangıcı
  effectiveTo: date("effective_to"), // Yürürlük bitişi (null = aktif)
  isActive: boolean("is_active").default(true),
  
  // Asgari Ücret
  minimumWageGross: integer("minimum_wage_gross").notNull(), // Brüt asgari ücret (kuruş)
  minimumWageNet: integer("minimum_wage_net").notNull(), // Net asgari ücret (kuruş)
  
  // SGK Oranları (binde cinsinden - 140 = %14)
  sgkEmployeeRate: integer("sgk_employee_rate").notNull().default(140), // %14 - SGK işçi payı
  sgkEmployerRate: integer("sgk_employer_rate").notNull().default(205), // %20.5 - SGK işveren payı
  unemploymentEmployeeRate: integer("unemployment_employee_rate").notNull().default(10), // %1 - İşsizlik işçi
  unemploymentEmployerRate: integer("unemployment_employer_rate").notNull().default(20), // %2 - İşsizlik işveren
  
  // Damga Vergisi (onbinde cinsinden - 759 = %0.0759)
  stampTaxRate: integer("stamp_tax_rate").notNull().default(759), // Binde 7.59
  
  // Gelir Vergisi Dilimleri (kuruş cinsinden)
  taxBracket1Limit: integer("tax_bracket_1_limit").notNull(), // İlk dilim üst sınırı
  taxBracket1Rate: integer("tax_bracket_1_rate").notNull().default(150), // %15
  taxBracket2Limit: integer("tax_bracket_2_limit").notNull(), // 2. dilim üst sınırı
  taxBracket2Rate: integer("tax_bracket_2_rate").notNull().default(200), // %20
  taxBracket3Limit: integer("tax_bracket_3_limit").notNull(), // 3. dilim üst sınırı
  taxBracket3Rate: integer("tax_bracket_3_rate").notNull().default(270), // %27
  taxBracket4Limit: integer("tax_bracket_4_limit").notNull(), // 4. dilim üst sınırı
  taxBracket4Rate: integer("tax_bracket_4_rate").notNull().default(350), // %35
  taxBracket5Rate: integer("tax_bracket_5_rate").notNull().default(400), // %40 (son dilim)
  
  // Yemek Parası Muafiyetleri (kuruş/gün)
  mealAllowanceTaxExemptDaily: integer("meal_allowance_tax_exempt_daily").notNull(), // Vergi muafiyeti günlük limit
  mealAllowanceSgkExemptDaily: integer("meal_allowance_sgk_exempt_daily").notNull(), // SGK muafiyeti günlük limit (nakit için)
  
  // Ulaşım Yardımı Muafiyeti (kuruş/gün)
  transportAllowanceExemptDaily: integer("transport_allowance_exempt_daily").default(0),
  
  // Diğer Parametreler
  workingDaysPerMonth: integer("working_days_per_month").default(30), // Aylık çalışma günü
  workingHoursPerDay: integer("working_hours_per_day").default(8), // Günlük çalışma saati
  overtimeMultiplier: numeric("overtime_multiplier").default("1.5"), // Fazla mesai çarpanı
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payroll_parameters_year_idx").on(table.year),
  index("payroll_parameters_active_idx").on(table.isActive),
  unique("payroll_parameters_year_effective_unique").on(table.year, table.effectiveFrom),
]);

export const insertPayrollParametersSchema = createInsertSchema(payrollParameters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollParameters = z.infer<typeof insertPayrollParametersSchema>;
export type PayrollParameters = typeof payrollParameters.$inferSelect;

// Çalışan Kümülatif Vergi Defteri (Yıl içi matrah takibi)
export const employeeTaxLedger = pgTable("employee_tax_ledger", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Aylık Değerler
  grossSalary: integer("gross_salary").notNull(), // Aylık brüt maaş
  sgkBase: integer("sgk_base").notNull(), // SGK matrahı
  taxBase: integer("tax_base").notNull(), // Gelir vergisi matrahı
  
  // Kümülatif Değerler (Ocak'tan itibaren toplam)
  cumulativeTaxBase: integer("cumulative_tax_base").notNull(), // Kümülatif vergi matrahı
  cumulativeIncomeTax: integer("cumulative_income_tax").notNull(), // Kümülatif gelir vergisi
  
  // Uygulanan Vergi Dilimi
  appliedTaxBracket: integer("applied_tax_bracket").notNull().default(1), // 1-5 arası
  
  // Asgari ücret istisnası
  minimumWageExemption: integer("minimum_wage_exemption").default(0), // Uygulanan istisna tutarı
  stampTaxExemption: integer("stamp_tax_exemption").default(0), // Damga vergisi istisnası
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_tax_ledger_user_idx").on(table.userId),
  index("employee_tax_ledger_year_idx").on(table.year),
  unique("employee_tax_ledger_user_year_month_unique").on(table.userId, table.year, table.month),
]);

export const insertEmployeeTaxLedgerSchema = createInsertSchema(employeeTaxLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeTaxLedger = z.infer<typeof insertEmployeeTaxLedgerSchema>;
export type EmployeeTaxLedger = typeof employeeTaxLedger.$inferSelect;

// Çalışan Yan Haklar (Yemek parası, ulaşım, prim vb.)
export const employeeBenefits = pgTable("employee_benefits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Yemek Yardımı
  mealBenefitType: varchar("meal_benefit_type", { length: 20 }).default("none"), // none, card, cash, workplace
  mealBenefitAmount: integer("meal_benefit_amount").default(0), // Günlük yemek parası (kuruş)
  
  // Ulaşım Yardımı
  transportBenefitType: varchar("transport_benefit_type", { length: 20 }).default("none"), // none, card, cash
  transportBenefitAmount: integer("transport_benefit_amount").default(0), // Günlük ulaşım parası (kuruş)
  
  // Prim/Bonus
  bonusEligible: boolean("bonus_eligible").default(true), // Prim hakkı var mı
  bonusPercentage: numeric("bonus_percentage").default("0"), // Sabit prim yüzdesi
  
  // Özel İndirimler
  disabilityDiscount: boolean("disability_discount").default(false), // Engelli indirimi
  disabilityDegree: integer("disability_degree"), // Engellilik derecesi (1-3)
  
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_benefits_user_idx").on(table.userId),
  index("employee_benefits_active_idx").on(table.isActive),
]);

export const insertEmployeeBenefitsSchema = createInsertSchema(employeeBenefits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeBenefits = z.infer<typeof insertEmployeeBenefitsSchema>;
export type EmployeeBenefits = typeof employeeBenefits.$inferSelect;

// ========================================
// PAYROLL RECORDS - Aylık Bordro Kayıtları
// ========================================

export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  
  // Dönem bilgisi
  periodYear: integer("period_year").notNull(), // 2024, 2025, etc.
  periodMonth: integer("period_month").notNull(), // 1-12
  
  // Temel maaş (kuruş cinsinden)
  baseSalary: integer("base_salary").notNull(), // Net baz maaş (kuruş)
  
  // Mesai hesaplamaları (kuruş)
  overtimeMinutes: integer("overtime_minutes").default(0), // Onaylanan toplam mesai dakikası
  overtimeRate: numeric("overtime_rate").default("1.5"), // Mesai çarpanı (1.5x normal, 2x tatil)
  overtimeAmount: integer("overtime_amount").default(0), // Mesai ücreti (kuruş)
  
  // Prim hesaplamaları (kuruş)
  bonusType: varchar("bonus_type", { length: 20 }).default("normal"), // kasa_primi, normal
  bonusBase: integer("bonus_base").default(0), // Prim matrahı (kuruş)
  bonusPercentage: numeric("bonus_percentage").default("0"), // Prim yüzdesi
  bonusAmount: integer("bonus_amount").default(0), // Hesaplanan prim (kuruş)
  
  // Eksik çalışma kesintisi (kuruş)
  undertimeMinutes: integer("undertime_minutes").default(0), // 45 saat altı çalışma dakikası
  undertimeDeduction: integer("undertime_deduction").default(0), // Primden kesilen tutar (kuruş)
  
  // Yan haklar (kuruş)
  mealAllowance: integer("meal_allowance").default(0), // Yemek yardımı
  transportAllowance: integer("transport_allowance").default(0), // Ulaşım yardımı
  
  // Ödenecek net maaş (kuruş)
  totalNetPayable: integer("total_net_payable").notNull(), // baseSalary + overtime + bonus - undertime + allowances
  
  // Brüt maaş ve kesintiler (kayıt amaçlı, kuruş)
  grossSalary: integer("gross_salary").default(0), // Hesaplanan brüt
  sgkEmployee: integer("sgk_employee").default(0), // SGK işçi payı
  sgkEmployer: integer("sgk_employer").default(0), // SGK işveren payı
  unemploymentEmployee: integer("unemployment_employee").default(0), // İşsizlik işçi
  unemploymentEmployer: integer("unemployment_employer").default(0), // İşsizlik işveren
  incomeTax: integer("income_tax").default(0), // Gelir vergisi
  stampTax: integer("stamp_tax").default(0), // Damga vergisi
  
  // Kümülatif vergi matrahı
  cumulativeTaxBase: integer("cumulative_tax_base").default(0), // Yıl başından bu aya kadar
  
  // Durum yönetimi
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, pending_approval, approved, paid
  
  // Onay bilgileri
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payroll_records_user_idx").on(table.userId),
  index("payroll_records_period_idx").on(table.periodYear, table.periodMonth),
  index("payroll_records_status_idx").on(table.status),
  unique("payroll_records_user_period_unique").on(table.userId, table.periodYear, table.periodMonth),
]);

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// ========================================
// TASK STEPS - Görev Adım Takibi
// ========================================

export const taskSteps = pgTable("task_steps", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  
  order: integer("order").notNull().default(0),
  
  claimedAt: timestamp("claimed_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("task_steps_task_idx").on(table.taskId),
  index("task_steps_author_idx").on(table.authorId),
  index("task_steps_order_idx").on(table.taskId, table.order),
]);

export const insertTaskStepSchema = createInsertSchema(taskSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskStep = z.infer<typeof insertTaskStepSchema>;
export type TaskStep = typeof taskSteps.$inferSelect;

// ========================================
// JOB TITLES - Ünvan Yönetimi
// ========================================

export const TitleScope = {
  HQ: "hq",
  FACTORY: "factory",
  BRANCH: "branch",
  ALL: "all",
} as const;

export type TitleScopeType = typeof TitleScope[keyof typeof TitleScope];

export const titles = pgTable("titles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  scope: varchar("scope", { length: 20 }).notNull().default("all"),
  isSystem: boolean("is_system").notNull().default(false),
  isDeletable: boolean("is_deletable").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("titles_scope_idx").on(table.scope),
]);

export const insertTitleSchema = createInsertSchema(titles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTitle = z.infer<typeof insertTitleSchema>;
export type Title = typeof titles.$inferSelect;

// ========================================
// ROLE TEMPLATES - Rol Şablonları
// ========================================

export const roleTemplates = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  
  domain: varchar("domain", { length: 30 }).notNull(), // hq, factory, branch
  baseRole: varchar("base_role", { length: 50 }).notNull(), // admin, supervisor, barista, etc.
  
  permissions: jsonb("permissions").notNull().default({}), // { moduleKey: ['view', 'edit'] }
  
  isDefault: boolean("is_default").default(false),
  isSystem: boolean("is_system").notNull().default(false),
  isDeletable: boolean("is_deletable").notNull().default(true),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_templates_domain_idx").on(table.domain),
  index("role_templates_base_role_idx").on(table.baseRole),
]);

export const insertRoleTemplateSchema = createInsertSchema(roleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;
export type RoleTemplate = typeof roleTemplates.$inferSelect;

// ========================================
// FACTORY PRODUCTION - Fabrika Üretim Modülü
// ========================================

// Ürün Kategorileri
export const ProductionCategory = {
  DONUT: 'donut',
  CINNABOOM: 'cinnaboom',
  QUESADILLA: 'quesadilla',
  MAMABON: 'mamabon',
  COOKIE: 'cookie',
  CAKE: 'cake',
  CHEESECAKE: 'cheesecake',
  BROWNIE: 'brownie',
  KRUVASAN: 'kruvasan',
  SIRUP: 'sirup',
  SOS: 'sos',
  DIGER: 'diger',
} as const;

export type ProductionCategoryType = typeof ProductionCategory[keyof typeof ProductionCategory];

// Fabrika Ürünleri
export const factoryProducts = pgTable("factory_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  unit: varchar("unit", { length: 20 }).notNull(), // kg, lt, adet
  unitPrice: integer("unit_price").default(0), // Kuruş cinsinden
  minStock: integer("min_stock").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  // Maliyet hesaplama sütunları
  packageQuantity: integer("package_quantity").default(1),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).default("0"),
  suggestedPrice: numeric("suggested_price", { precision: 12, scale: 2 }).default("0"),
  currentSellingPrice: numeric("current_selling_price", { precision: 12, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).default("1.01"),
  isTemporarilyStopped: boolean("is_temporarily_stopped").default(false),
  isNewProduct: boolean("is_new_product").default(false),
  
  requiresFoodEngineerApproval: boolean("requires_food_engineer_approval").default(false),
  allergens: text("allergens").array(),
  
  productType: varchar("product_type", { length: 20 }).default("mamul"),
  parentProductId: integer("parent_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  conversionRatio: numeric("conversion_ratio", { precision: 10, scale: 4 }).default("1"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_products_category_idx").on(table.category),
  index("factory_products_sku_idx").on(table.sku),
]);

export const insertFactoryProductSchema = createInsertSchema(factoryProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryProduct = z.infer<typeof insertFactoryProductSchema>;
export type FactoryProduct = typeof factoryProducts.$inferSelect;

// Üretim Partileri
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  batchNumber: varchar("batch_number", { length: 50 }).notNull().unique(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  productionDate: date("production_date").notNull(),
  expiryDate: date("expiry_date"),
  
  status: varchar("status", { length: 30 }).notNull().default("planned"), // planned, in_progress, completed, quality_check, approved, rejected
  qualityScore: integer("quality_score"), // 0-100
  qualityNotes: text("quality_notes"),
  
  producedById: varchar("produced_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("production_batches_product_idx").on(table.productId),
  index("production_batches_status_idx").on(table.status),
  index("production_batches_date_idx").on(table.productionDate),
]);

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

// Şube Sipariş Talepleri
export const branchOrders = pgTable("branch_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  
  requestedById: varchar("requested_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  processedById: varchar("processed_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  shipmentId: integer("shipment_id"),
  
  requestedDeliveryDate: date("requested_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  
  totalAmount: integer("total_amount").default(0),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_orders_branch_idx").on(table.branchId),
  index("branch_orders_status_idx").on(table.status),
  index("branch_orders_date_idx").on(table.createdAt),
]);

export const insertBranchOrderSchema = createInsertSchema(branchOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchOrder = z.infer<typeof insertBranchOrderSchema>;
export type BranchOrder = typeof branchOrders.$inferSelect;

// Sipariş Kalemleri
export const branchOrderItems = pgTable("branch_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => branchOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  
  quantity: integer("quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  unit: varchar("unit", { length: 20 }).default("adet"),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  
  deliveredQuantity: integer("delivered_quantity").default(0),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  
  notes: text("notes"),
}, (table) => [
  index("branch_order_items_order_idx").on(table.orderId),
  index("branch_order_items_product_idx").on(table.productId),
]);

export const insertBranchOrderItemSchema = createInsertSchema(branchOrderItems).omit({
  id: true,
});

export type InsertBranchOrderItem = z.infer<typeof insertBranchOrderItemSchema>;
export type BranchOrderItem = typeof branchOrderItems.$inferSelect;

// Fabrika Stok
export const factoryInventory = pgTable("factory_inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").default(0), // Siparişler için ayrılan
  
  lastUpdatedById: varchar("last_updated_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_inventory_product_idx").on(table.productId),
  unique("factory_inventory_product_batch_unique").on(table.productId, table.batchId),
]);

export const insertFactoryInventorySchema = createInsertSchema(factoryInventory).omit({
  id: true,
  updatedAt: true,
});

export type InsertFactoryInventory = z.infer<typeof insertFactoryInventorySchema>;
export type FactoryInventory = typeof factoryInventory.$inferSelect;

// ========================================
// FABRIKA KIOSK SISTEMI
// ========================================

// Fabrika Üretim İstasyonları
export const factoryStations = pgTable("factory_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Donut Hamur Hattı, Konsantre Dolum, Cheesecake, Mamabon, Wrapitos, Cookies, Donut Süsleme, Donut Paketleme, Cinnaboom
  code: varchar("code", { length: 20 }).notNull().unique(), // DONUT_HAMUR, KONSANTRE, CHEESECAKE, etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // hamur, dolum, susleme, paketleme
  productTypeId: integer("product_type_id").references(() => factoryProducts.id, { onDelete: "set null" }), // Hangi ürünü üretir
  targetHourlyOutput: integer("target_hourly_output").default(0), // Saatlik hedef üretim
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFactoryStationSchema = createInsertSchema(factoryStations).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryStation = z.infer<typeof insertFactoryStationSchema>;
export type FactoryStation = typeof factoryStations.$inferSelect;

// Fabrika Personeli PIN Kodları (kiosk girişi için)
export const factoryStaffPins = pgTable("factory_staff_pins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hashedPin: varchar("hashed_pin", { length: 255 }).notNull(), // Bcrypt hash
  pinFailedAttempts: integer("pin_failed_attempts").default(0),
  pinLockedUntil: timestamp("pin_locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("factory_staff_pins_user_unique").on(table.userId),
]);

export const insertFactoryStaffPinSchema = createInsertSchema(factoryStaffPins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryStaffPin = z.infer<typeof insertFactoryStaffPinSchema>;
export type FactoryStaffPin = typeof factoryStaffPins.$inferSelect;

// Fabrika Vardiya Oturumları (kiosk giriş/çıkış)
export const factoryShiftSessions = pgTable("factory_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "restrict" }),
  
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  // Üretim özeti
  totalProduced: integer("total_produced").default(0),
  totalWaste: integer("total_waste").default(0),
  
  // Çalışma süresi (dakika)
  workMinutes: integer("work_minutes").default(0),
  
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, completed, abandoned
  
  phase: varchar("phase", { length: 20 }).default("hazirlik"), // hazirlik, uretim, temizlik, tamamlandi
  prepStartedAt: timestamp("prep_started_at"),
  prodStartedAt: timestamp("prod_started_at"),
  cleanStartedAt: timestamp("clean_started_at"),
  prodEndedAt: timestamp("prod_ended_at"),
  prepDurationMinutes: integer("prep_duration_minutes"),
  prodDurationMinutes: integer("prod_duration_minutes"),
  cleanDurationMinutes: integer("clean_duration_minutes"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_shift_sessions_user_idx").on(table.userId),
  index("factory_shift_sessions_station_idx").on(table.stationId),
  index("factory_shift_sessions_date_idx").on(table.checkInTime),
]);

export const insertFactoryShiftSessionSchema = createInsertSchema(factoryShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryShiftSession = z.infer<typeof insertFactoryShiftSessionSchema>;
export type FactoryShiftSession = typeof factoryShiftSessions.$inferSelect;

// Fabrika Üretim Kayıtları (her istasyon değişiminde veya vardiya sonunda)
export const factoryProductionRuns = pgTable("factory_production_runs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "restrict" }),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  
  // Üretim detayları
  quantityProduced: integer("quantity_produced").default(0).notNull(),
  quantityWaste: integer("quantity_waste").default(0).notNull(), // Zaiyat/Fire
  wasteReason: text("waste_reason"), // Zaiyat nedeni
  
  // Kalite kontrol
  qualityScore: integer("quality_score"), // 0-100
  qualityNotes: text("quality_notes"),
  
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, completed
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_production_runs_session_idx").on(table.sessionId),
  index("factory_production_runs_user_idx").on(table.userId),
  index("factory_production_runs_station_idx").on(table.stationId),
  index("factory_production_runs_date_idx").on(table.startTime),
]);

export const insertFactoryProductionRunSchema = createInsertSchema(factoryProductionRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryProductionRun = z.infer<typeof insertFactoryProductionRunSchema>;
export type FactoryProductionRun = typeof factoryProductionRuns.$inferSelect;

// Fabrika Günlük Üretim Hedefleri
export const factoryDailyTargets = pgTable("factory_daily_targets", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  targetDate: date("target_date").notNull(),
  targetQuantity: integer("target_quantity").notNull(),
  actualQuantity: integer("actual_quantity").default(0),
  wasteQuantity: integer("waste_quantity").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("factory_daily_targets_station_date_unique").on(table.stationId, table.targetDate),
]);

export const insertFactoryDailyTargetSchema = createInsertSchema(factoryDailyTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryDailyTarget = z.infer<typeof insertFactoryDailyTargetSchema>;
export type FactoryDailyTarget = typeof factoryDailyTargets.$inferSelect;

// ========================================
// FABRIKA GELIŞMIŞ TABLOLAR
// ========================================

// Fire/Zayiat Sebepleri
export const factoryWasteReasons = pgTable("factory_waste_reasons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }), // makine, malzeme, insan, ortam
  description: text("description"),
  severityScore: integer("severity_score").default(1), // 1-5 ciddiyet puanı
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFactoryWasteReasonSchema = createInsertSchema(factoryWasteReasons).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryWasteReason = z.infer<typeof insertFactoryWasteReasonSchema>;
export type FactoryWasteReason = typeof factoryWasteReasons.$inferSelect;

// Fabrika İstasyon Benchmark'ları
export const factoryStationBenchmarks = pgTable("factory_station_benchmarks", {
  id: serial("id").primaryKey(),
  stationName: varchar("station_name", { length: 200 }).notNull(),
  stationKey: varchar("station_key", { length: 100 }).notNull().unique(),
  minWorkers: integer("min_workers").notNull().default(1),
  maxWorkers: integer("max_workers").notNull().default(4),
  benchmarkWorkers: integer("benchmark_workers").notNull(),
  outputPerHour: integer("output_per_hour").notNull(),
  outputUnit: varchar("output_unit", { length: 50 }).notNull().default("adet"),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
  cleanTimeMinutes: integer("clean_time_minutes").notNull().default(15),
  wasteTolerancePercent: numeric("waste_tolerance_percent", { precision: 5, scale: 2 }).notNull().default("5.00"),
  warningThresholdPercent: numeric("warning_threshold_percent", { precision: 5, scale: 2 }).notNull().default("70.00"),
  starThresholdPercent: numeric("star_threshold_percent", { precision: 5, scale: 2 }).notNull().default("120.00"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FactoryStationBenchmark = typeof factoryStationBenchmarks.$inferSelect;
export type InsertFactoryStationBenchmark = typeof factoryStationBenchmarks.$inferInsert;

// Vardiya Olay Kaydı (her aksiyon loglanır)
export const factorySessionEvents = pgTable("factory_session_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").references(() => factoryStations.id),
  
  eventType: varchar("event_type", { length: 30 }).notNull(), // start, pause, resume, assist, special_break, complete_task, station_change, logout, auto_logout
  
  // Mola/ara detayları
  breakReason: varchar("break_reason", { length: 30 }), // mola, yardim, ozel_ihtiyac, gorev_bitis
  breakDurationMinutes: integer("break_duration_minutes"),
  
  // Üretim verileri (görev sonlandırmada)
  producedQuantity: numeric("produced_quantity", { precision: 10, scale: 2 }),
  producedUnit: varchar("produced_unit", { length: 20 }), // adet, kg, litre
  wasteQuantity: numeric("waste_quantity", { precision: 10, scale: 2 }),
  wasteUnit: varchar("waste_unit", { length: 20 }),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_session_events_session_idx").on(table.sessionId),
  index("factory_session_events_user_idx").on(table.userId),
  index("factory_session_events_type_idx").on(table.eventType),
  index("factory_session_events_date_idx").on(table.createdAt),
]);

export const insertFactorySessionEventSchema = createInsertSchema(factorySessionEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertFactorySessionEvent = z.infer<typeof insertFactorySessionEventSchema>;
export type FactorySessionEvent = typeof factorySessionEvents.$inferSelect;

// Mola Kayıtları (detaylı izleme)
export const factoryBreakLogs = pgTable("factory_break_logs", {
  id: serial("id").primaryKey(),
  sessionEventId: integer("session_event_id").references(() => factorySessionEvents.id),
  userId: text("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  
  breakReason: varchar("break_reason", { length: 30 }).notNull(), // mola, yardim, ozel_ihtiyac, gorev_bitis
  targetStationId: integer("target_station_id").references(() => factoryStations.id), // yardım için gidilen istasyon
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  
  autoFlagged: boolean("auto_flagged").default(false), // çok uzun/sık mola uyarısı
  notes: text("notes"),
}, (table) => [
  index("factory_break_logs_user_idx").on(table.userId),
  index("factory_break_logs_session_idx").on(table.sessionId),
  index("factory_break_logs_reason_idx").on(table.breakReason),
  index("factory_break_logs_date_idx").on(table.startedAt),
]);

export const insertFactoryBreakLogSchema = createInsertSchema(factoryBreakLogs).omit({
  id: true,
});

export type InsertFactoryBreakLog = z.infer<typeof insertFactoryBreakLogSchema>;
export type FactoryBreakLog = typeof factoryBreakLogs.$inferSelect;

// İstasyon Hedefleri (günlük/haftalık/aylık)
export const factoryStationTargets = pgTable("factory_station_targets", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
  targetQuantity: numeric("target_quantity", { precision: 10, scale: 2 }).notNull(),
  targetUnit: varchar("target_unit", { length: 20 }).notNull(), // adet, kg, litre
  
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_station_targets_station_idx").on(table.stationId),
  index("factory_station_targets_period_idx").on(table.periodType),
]);

export const insertFactoryStationTargetSchema = createInsertSchema(factoryStationTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryStationTarget = z.infer<typeof insertFactoryStationTargetSchema>;
export type FactoryStationTarget = typeof factoryStationTargets.$inferSelect;

// Personel Performans Skorları
export const factoryWorkerScores = pgTable("factory_worker_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  periodDate: date("period_date").notNull(), // günlük skor
  periodType: varchar("period_type", { length: 20 }).default("daily"), // daily, weekly, monthly
  
  // Skor bileşenleri
  productionScore: numeric("production_score", { precision: 5, scale: 2 }), // üretim puanı
  wasteScore: numeric("waste_score", { precision: 5, scale: 2 }), // fire puanı (düşük = iyi)
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }), // kalite puanı
  attendanceScore: numeric("attendance_score", { precision: 5, scale: 2 }), // devam puanı
  breakScore: numeric("break_score", { precision: 5, scale: 2 }), // mola davranış puanı
  
  totalScore: numeric("total_score", { precision: 5, scale: 2 }), // toplam puan
  
  // İstatistikler
  totalProduced: numeric("total_produced", { precision: 10, scale: 2 }),
  totalWaste: numeric("total_waste", { precision: 10, scale: 2 }),
  totalBreakMinutes: integer("total_break_minutes"),
  specialBreakCount: integer("special_break_count").default(0), // özel ihtiyaç sayısı
  
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("factory_worker_scores_user_idx").on(table.userId),
  index("factory_worker_scores_date_idx").on(table.periodDate),
  unique("factory_worker_scores_user_date_unique").on(table.userId, table.periodDate, table.periodType),
]);

export const insertFactoryWorkerScoreSchema = createInsertSchema(factoryWorkerScores).omit({
  id: true,
  generatedAt: true,
});

export type InsertFactoryWorkerScore = z.infer<typeof insertFactoryWorkerScoreSchema>;
export type FactoryWorkerScore = typeof factoryWorkerScores.$inferSelect;

// Üretim Çıktıları (her görev sonlandırmada)
export const factoryProductionOutputs = pgTable("factory_production_outputs", {
  id: serial("id").primaryKey(),
  sessionEventId: integer("session_event_id").references(() => factorySessionEvents.id),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  // Ürün bilgisi
  productId: integer("product_id").references(() => factoryProducts.id),
  productName: text("product_name"),
  
  // Üretim
  producedQuantity: numeric("produced_quantity", { precision: 10, scale: 2 }).notNull(),
  producedUnit: varchar("produced_unit", { length: 20 }).notNull(),
  
  // Fire/Zayiat
  wasteQuantity: numeric("waste_quantity", { precision: 10, scale: 2 }).default("0"),
  wasteUnit: varchar("waste_unit", { length: 20 }),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id),
  wasteNotes: text("waste_notes"),
  wasteDoughKg: numeric("waste_dough_kg", { precision: 8, scale: 2 }),
  wasteProductCount: integer("waste_product_count"),
  
  // Süre
  durationMinutes: integer("duration_minutes"),
  
  // Fotoğraf doğrulama
  photoUrl: text("photo_url"), // Üretim kanıtı fotoğrafı
  photoVerified: boolean("photo_verified").default(false), // Fotoğraf kontrol edildi mi
  
  // Kalite kontrol durumu
  qualityStatus: varchar("quality_status", { length: 20 }).default("pending"), // pending, pending_engineer, approved, rejected
  qualityCheckedBy: text("quality_checked_by").references(() => users.id),
  qualityCheckedAt: timestamp("quality_checked_at"),
  qualityNotes: text("quality_notes"), // Kalite kontrol notları
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_production_outputs_session_idx").on(table.sessionId),
  index("factory_production_outputs_user_idx").on(table.userId),
  index("factory_production_outputs_station_idx").on(table.stationId),
  index("factory_production_outputs_quality_idx").on(table.qualityStatus),
  index("factory_production_outputs_date_idx").on(table.createdAt),
]);

export const insertFactoryProductionOutputSchema = createInsertSchema(factoryProductionOutputs).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryProductionOutput = z.infer<typeof insertFactoryProductionOutputSchema>;
export type FactoryProductionOutput = typeof factoryProductionOutputs.$inferSelect;

// ========================================
// FABRIKA KALİTE KONTROL TABLOLARI
// ========================================

// Kalite Kontrol Kriterleri (her istasyon/ürün için)
export const factoryQualitySpecs = pgTable("factory_quality_specs", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => factoryProducts.id),
  
  name: text("name").notNull(), // Kriter adı
  description: text("description"),
  
  // Ölçüm türü
  measurementType: varchar("measurement_type", { length: 30 }).notNull(), // numeric, boolean, text
  unit: varchar("unit", { length: 20 }), // °C, kg, adet, cm vs.
  
  // Tolerans aralıkları (numeric için)
  minValue: numeric("min_value", { precision: 10, scale: 2 }),
  maxValue: numeric("max_value", { precision: 10, scale: 2 }),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  
  // Ayarlar
  isRequired: boolean("is_required").default(true),
  requirePhoto: boolean("require_photo").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_quality_specs_station_idx").on(table.stationId),
  index("factory_quality_specs_product_idx").on(table.productId),
]);

export const insertFactoryQualitySpecSchema = createInsertSchema(factoryQualitySpecs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryQualitySpec = z.infer<typeof insertFactoryQualitySpecSchema>;
export type FactoryQualitySpec = typeof factoryQualitySpecs.$inferSelect;

// Kalite Kontrol Sorumlusu Atamaları
export const factoryQualityAssignments = pgTable("factory_quality_assignments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  // Yetki kapsamı
  assignedStations: integer("assigned_stations").array(), // null = tüm istasyonlar
  
  assignedBy: text("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  
  notes: text("notes"),
}, (table) => [
  index("factory_quality_assignments_user_idx").on(table.userId),
  unique("factory_quality_assignments_user_unique").on(table.userId),
]);

export const insertFactoryQualityAssignmentSchema = createInsertSchema(factoryQualityAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertFactoryQualityAssignment = z.infer<typeof insertFactoryQualityAssignmentSchema>;
export type FactoryQualityAssignment = typeof factoryQualityAssignments.$inferSelect;

// Kalite Kontrol Kayıtları
export const factoryQualityChecks = pgTable("factory_quality_checks", {
  id: serial("id").primaryKey(),
  productionOutputId: integer("production_output_id").notNull().references(() => factoryProductionOutputs.id),
  
  inspectorId: text("inspector_id").notNull().references(() => users.id),
  producerId: text("producer_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  decision: varchar("decision", { length: 20 }).notNull(), // approved, rejected, pending_engineer, hold
  decisionReason: text("decision_reason"),
  notes: text("notes"),
  
  visualInspection: varchar("visual_inspection", { length: 20 }),
  tasteTest: varchar("taste_test", { length: 20 }),
  textureCheck: varchar("texture_check", { length: 20 }),
  weightCheck: varchar("weight_check", { length: 20 }),
  temperatureCheck: varchar("temperature_check", { length: 20 }),
  packagingIntegrity: varchar("packaging_integrity", { length: 20 }),
  
  allergenCheck: boolean("allergen_check").default(false),
  haccpCompliance: boolean("haccp_compliance").default(true),
  
  inspectorNotes: text("inspector_notes"),
  correctiveAction: text("corrective_action"),
  holdReason: text("hold_reason"),
  
  foodEngineerApproval: boolean("food_engineer_approval").default(false),
  foodEngineerId: varchar("food_engineer_id", { length: 255 }),
  foodEngineerApprovedAt: timestamp("food_engineer_approved_at"),
  
  checkedAt: timestamp("checked_at").defaultNow(),
}, (table) => [
  index("factory_quality_checks_output_idx").on(table.productionOutputId),
  index("factory_quality_checks_inspector_idx").on(table.inspectorId),
  index("factory_quality_checks_producer_idx").on(table.producerId),
  index("factory_quality_checks_date_idx").on(table.checkedAt),
]);

export const insertFactoryQualityCheckSchema = createInsertSchema(factoryQualityChecks).omit({
  id: true,
  checkedAt: true,
});

export type InsertFactoryQualityCheck = z.infer<typeof insertFactoryQualityCheckSchema>;
export type FactoryQualityCheck = typeof factoryQualityChecks.$inferSelect;

// Kalite Ölçümleri (her kriter için)
export const factoryQualityMeasurements = pgTable("factory_quality_measurements", {
  id: serial("id").primaryKey(),
  qualityCheckId: integer("quality_check_id").notNull().references(() => factoryQualityChecks.id, { onDelete: "cascade" }),
  specId: integer("spec_id").notNull().references(() => factoryQualitySpecs.id),
  
  // Ölçüm değeri
  numericValue: numeric("numeric_value", { precision: 10, scale: 2 }),
  booleanValue: boolean("boolean_value"),
  textValue: text("text_value"),
  
  // Sonuç
  passed: boolean("passed").notNull(),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_quality_measurements_check_idx").on(table.qualityCheckId),
  index("factory_quality_measurements_spec_idx").on(table.specId),
]);

export const insertFactoryQualityMeasurementSchema = createInsertSchema(factoryQualityMeasurements).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryQualityMeasurement = z.infer<typeof insertFactoryQualityMeasurementSchema>;
export type FactoryQualityMeasurement = typeof factoryQualityMeasurements.$inferSelect;

// Kalite Kontrol Fotoğrafları
export const factoryQualityMedia = pgTable("factory_quality_media", {
  id: serial("id").primaryKey(),
  qualityCheckId: integer("quality_check_id").notNull().references(() => factoryQualityChecks.id, { onDelete: "cascade" }),
  
  mediaType: varchar("media_type", { length: 20 }).notNull(), // photo, video
  mediaUrl: text("media_url").notNull(),
  
  caption: text("caption"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("factory_quality_media_check_idx").on(table.qualityCheckId),
]);

export const insertFactoryQualityMediaSchema = createInsertSchema(factoryQualityMedia).omit({
  id: true,
  uploadedAt: true,
});

export type InsertFactoryQualityMedia = z.infer<typeof insertFactoryQualityMediaSchema>;
export type FactoryQualityMedia = typeof factoryQualityMedia.$inferSelect;

// AI Fabrika Raporları
export const factoryAiReports = pgTable("factory_ai_reports", {
  id: serial("id").primaryKey(),
  
  reportType: varchar("report_type", { length: 30 }).notNull(), // rotation, waste_pattern, device_errors, performance, custom
  reportScope: varchar("report_scope", { length: 20 }).notNull(), // hq, manager, worker
  
  // Filtreler
  targetUserId: text("target_user_id").references(() => users.id), // belirli personel için
  targetStationId: integer("target_station_id").references(() => factoryStations.id),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  
  // Rapor içeriği
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  recommendations: text("recommendations").array(),
  details: jsonb("details"), // Detaylı veriler
  
  generatedBy: text("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("factory_ai_reports_type_idx").on(table.reportType),
  index("factory_ai_reports_user_idx").on(table.targetUserId),
  index("factory_ai_reports_date_idx").on(table.generatedAt),
]);

export const insertFactoryAiReportSchema = createInsertSchema(factoryAiReports).omit({
  id: true,
  generatedAt: true,
});

export type InsertFactoryAiReport = z.infer<typeof insertFactoryAiReportSchema>;
export type FactoryAiReport = typeof factoryAiReports.$inferSelect;

// ========================================
// ÜRETİM PLANLAMA VE TAKVİM
// ========================================

// Üretim Planları (Günlük/Haftalık)
export const factoryProductionPlans = pgTable("factory_production_plans", {
  id: serial("id").primaryKey(),
  
  planDate: date("plan_date").notNull(), // Hangi gün için plan
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  
  targetQuantity: integer("target_quantity").notNull(), // Hedef üretim miktarı
  unit: varchar("unit", { length: 20 }).default("adet"),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  
  // Gerçekleşen
  actualQuantity: integer("actual_quantity").default(0),
  status: varchar("status", { length: 20 }).default("planned"), // planned, in_progress, completed, cancelled
  
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_production_plans_date_idx").on(table.planDate),
  index("factory_production_plans_product_idx").on(table.productId),
  index("factory_production_plans_status_idx").on(table.status),
]);

export const insertFactoryProductionPlanSchema = createInsertSchema(factoryProductionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryProductionPlan = z.infer<typeof insertFactoryProductionPlanSchema>;
export type FactoryProductionPlan = typeof factoryProductionPlans.$inferSelect;

// ========================================
// TAKIM ÇALIŞMASI (Aynı istasyonda birden fazla kişi)
// ========================================

// Takım/Ekip Tanımları
export const factoryTeams = pgTable("factory_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  leaderId: text("leader_id").references(() => users.id, { onDelete: "set null" }), // Ekip lideri
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_teams_station_idx").on(table.stationId),
]);

export const insertFactoryTeamSchema = createInsertSchema(factoryTeams).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryTeam = z.infer<typeof insertFactoryTeamSchema>;
export type FactoryTeam = typeof factoryTeams.$inferSelect;

// Takım Üyeleri
export const factoryTeamMembers = pgTable("factory_team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => factoryTeams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  role: varchar("role", { length: 30 }).default("member"), // leader, member
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
}, (table) => [
  index("factory_team_members_team_idx").on(table.teamId),
  index("factory_team_members_user_idx").on(table.userId),
  unique("factory_team_members_team_user_unique").on(table.teamId, table.userId),
]);

export const insertFactoryTeamMemberSchema = createInsertSchema(factoryTeamMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertFactoryTeamMember = z.infer<typeof insertFactoryTeamMemberSchema>;
export type FactoryTeamMember = typeof factoryTeamMembers.$inferSelect;

// Takım Vardiya Oturumları (Birlikte çalışma kaydı)
export const factoryTeamSessions = pgTable("factory_team_sessions", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  
  // Toplam takım üretimi
  totalProduced: integer("total_produced").default(0),
  totalWaste: integer("total_waste").default(0),
  
  status: varchar("status", { length: 20 }).default("active"), // active, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_team_sessions_station_idx").on(table.stationId),
  index("factory_team_sessions_date_idx").on(table.startTime),
]);

export const insertFactoryTeamSessionSchema = createInsertSchema(factoryTeamSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryTeamSession = z.infer<typeof insertFactoryTeamSessionSchema>;
export type FactoryTeamSession = typeof factoryTeamSessions.$inferSelect;

// Takım Oturum Üyeleri (O anda hangi kişiler takımda)
export const factoryTeamSessionMembers = pgTable("factory_team_session_members", {
  id: serial("id").primaryKey(),
  teamSessionId: integer("team_session_id").notNull().references(() => factoryTeamSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shiftSessionId: integer("shift_session_id").references(() => factoryShiftSessions.id, { onDelete: "set null" }),
  
  role: varchar("role", { length: 30 }).default("member"), // leader, member
  contributionPercent: integer("contribution_percent").default(100), // Katkı yüzdesi (eşit paylaşım için 100/kişi sayısı)
  
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
}, (table) => [
  index("factory_team_session_members_session_idx").on(table.teamSessionId),
  index("factory_team_session_members_user_idx").on(table.userId),
]);

export const insertFactoryTeamSessionMemberSchema = createInsertSchema(factoryTeamSessionMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertFactoryTeamSessionMember = z.infer<typeof insertFactoryTeamSessionMemberSchema>;
export type FactoryTeamSessionMember = typeof factoryTeamSessionMembers.$inferSelect;

// ========================================
// FABRİKA VARDİYA UYUMLULUK SİSTEMİ
// ========================================

// Fabrika Vardiya Uyumluluk - Fabrika oturumlarını ana vardiya sistemiyle bağlar
export const factoryShiftCompliance = pgTable("factory_shift_compliance", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  factorySessionId: integer("factory_session_id").references(() => factoryShiftSessions.id, { onDelete: "set null" }),
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  
  // Planlanan çalışma saatleri (fabrika için: 08:00 - 18:00)
  plannedStartTime: timestamp("planned_start_time").notNull(),
  plannedEndTime: timestamp("planned_end_time").notNull(),
  plannedBreakMinutes: integer("planned_break_minutes").default(60), // 1 saat mola
  
  // Gerçekleşen saatler
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  actualBreakMinutes: integer("actual_break_minutes").default(0),
  
  // Uyumluluk metrikleri
  latenessMinutes: integer("lateness_minutes").default(0), // Geç kalma
  earlyLeaveMinutes: integer("early_leave_minutes").default(0), // Erken çıkış
  breakOverageMinutes: integer("break_overage_minutes").default(0), // Mola aşımı
  unauthorizedBreakMinutes: integer("unauthorized_break_minutes").default(0), // İzinsiz mola
  
  // Toplam çalışma
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  effectiveWorkedMinutes: integer("effective_worked_minutes").default(0), // Net çalışma (cezalar düşülmüş)
  overtimeMinutes: integer("overtime_minutes").default(0), // Mesai (yönetici onayı gerekli)
  missingMinutes: integer("missing_minutes").default(0), // Eksik saat
  
  // Uyumluluk durumu
  complianceScore: integer("compliance_score").default(100), // 0-100
  complianceStatus: varchar("compliance_status", { length: 30 }).default("compliant"), // compliant, late, early_leave, break_overage, absent, needs_review
  
  // Onay durumu (mesai için)
  overtimeApproved: boolean("overtime_approved").default(false),
  overtimeApprovedBy: text("overtime_approved_by").references(() => users.id),
  overtimeApprovedAt: timestamp("overtime_approved_at"),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  
  // AI öneri
  aiSuggestion: text("ai_suggestion"), // Telafi önerisi
  aiSuggestionGeneratedAt: timestamp("ai_suggestion_generated_at"),
  
  // Notlar
  notes: text("notes"),
  
  // Tarih
  workDate: date("work_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_shift_compliance_user_idx").on(table.userId),
  index("factory_shift_compliance_date_idx").on(table.workDate),
  index("factory_shift_compliance_session_idx").on(table.factorySessionId),
  index("factory_shift_compliance_status_idx").on(table.complianceStatus),
]);

export const insertFactoryShiftComplianceSchema = createInsertSchema(factoryShiftCompliance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryShiftCompliance = z.infer<typeof insertFactoryShiftComplianceSchema>;
export type FactoryShiftCompliance = typeof factoryShiftCompliance.$inferSelect;

// Haftalık Çalışma Özeti (45 saat takibi)
export const factoryWeeklyAttendanceSummary = pgTable("factory_weekly_attendance_summary", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Hafta bilgisi
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Çalışma saatleri
  plannedTotalMinutes: integer("planned_total_minutes").default(2700), // 45 saat = 2700 dk
  actualTotalMinutes: integer("actual_total_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0), // Eksik saat
  
  // Günlük dağılım
  workDaysCount: integer("work_days_count").default(0),
  absentDaysCount: integer("absent_days_count").default(0),
  lateDaysCount: integer("late_days_count").default(0),
  
  // Uyumluluk
  weeklyComplianceScore: integer("weekly_compliance_score").default(100),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  accountingNotes: text("accounting_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_weekly_summary_user_idx").on(table.userId),
  index("factory_weekly_summary_week_idx").on(table.weekStartDate),
  unique("factory_weekly_summary_user_week_unique").on(table.userId, table.weekStartDate),
]);

export const insertFactoryWeeklyAttendanceSummarySchema = createInsertSchema(factoryWeeklyAttendanceSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryWeeklyAttendanceSummary = z.infer<typeof insertFactoryWeeklyAttendanceSummarySchema>;
export type FactoryWeeklyAttendanceSummary = typeof factoryWeeklyAttendanceSummary.$inferSelect;

// ========================================
// ŞUBE KIOSK SİSTEMİ
// ========================================

// Şube Personeli PIN Kodları (kiosk girişi için)
export const branchStaffPins = pgTable("branch_staff_pins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  hashedPin: varchar("hashed_pin", { length: 255 }).notNull(), // Bcrypt hash - 4 haneli PIN
  pinFailedAttempts: integer("pin_failed_attempts").default(0),
  pinLockedUntil: timestamp("pin_locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("branch_staff_pins_user_branch_unique").on(table.userId, table.branchId),
  index("branch_staff_pins_branch_idx").on(table.branchId),
]);

export const insertBranchStaffPinSchema = createInsertSchema(branchStaffPins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchStaffPin = z.infer<typeof insertBranchStaffPinSchema>;
export type BranchStaffPin = typeof branchStaffPins.$inferSelect;

// Şube Vardiya Oturumları (kiosk giriş/çıkış)
export const branchShiftSessions = pgTable("branch_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Vardiya zamanları
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  // Çalışma ve mola süreleri (dakika)
  workMinutes: integer("work_minutes").default(0),
  breakMinutes: integer("break_minutes").default(0), // Toplam mola süresi
  netWorkMinutes: integer("net_work_minutes").default(0), // workMinutes - breakMinutes
  
  // Durum
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, on_break, completed, abandoned
  
  // shiftAttendance ile bağlantı
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  
  // Lokasyon dogrulama
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  isLocationVerified: boolean("is_location_verified").default(false),
  locationDistance: integer("location_distance"), // metre cinsinden mesafe
  
  // Planlanan vardiya karsilastirmasi
  plannedShiftId: integer("planned_shift_id"),
  lateMinutes: integer("late_minutes").default(0), // gec kalma dakikasi
  earlyLeaveMinutes: integer("early_leave_minutes").default(0), // erken cikis dakikasi
  overtimeMinutes: integer("overtime_minutes").default(0), // fazla mesai dakikasi
  
  checkinMethod: varchar("checkin_method", { length: 10 }).default("pin").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_shift_sessions_user_idx").on(table.userId),
  index("branch_shift_sessions_branch_idx").on(table.branchId),
  index("branch_shift_sessions_date_idx").on(table.checkInTime),
  index("branch_shift_sessions_status_idx").on(table.status),
]);

export const insertBranchShiftSessionSchema = createInsertSchema(branchShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchShiftSession = z.infer<typeof insertBranchShiftSessionSchema>;
export type BranchShiftSession = typeof branchShiftSessions.$inferSelect;

// Şube Vardiya Olayları (check-in, check-out, break-start, break-end)
export const branchShiftEvents = pgTable("branch_shift_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => branchShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Olay tipi
  eventType: varchar("event_type", { length: 30 }).notNull(), // check_in, check_out, break_start, break_end
  eventTime: timestamp("event_time").notNull().defaultNow(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_shift_events_session_idx").on(table.sessionId),
  index("branch_shift_events_user_idx").on(table.userId),
  index("branch_shift_events_time_idx").on(table.eventTime),
  index("branch_shift_events_type_idx").on(table.eventType),
]);

export const insertBranchShiftEventSchema = createInsertSchema(branchShiftEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchShiftEvent = z.infer<typeof insertBranchShiftEventSchema>;
export type BranchShiftEvent = typeof branchShiftEvents.$inferSelect;

// Şube Mola Kayıtları (her mola ayrı kaydedilir)
export const branchBreakLogs = pgTable("branch_break_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => branchShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  breakStartTime: timestamp("break_start_time").notNull(),
  breakEndTime: timestamp("break_end_time"),
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  
  breakType: varchar("break_type", { length: 30 }).default("regular"), // regular, lunch, prayer
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_break_logs_session_idx").on(table.sessionId),
  index("branch_break_logs_user_idx").on(table.userId),
]);

export const insertBranchBreakLogSchema = createInsertSchema(branchBreakLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchBreakLog = z.infer<typeof insertBranchBreakLogSchema>;
export type BranchBreakLog = typeof branchBreakLogs.$inferSelect;

// Şube Günlük Çalışma Özeti (puantaj için)
export const branchShiftDailySummary = pgTable("branch_shift_daily_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),
  
  // Vardiya detayları
  sessionCount: integer("session_count").default(0), // Gün içi toplam oturum
  firstCheckIn: timestamp("first_check_in"),
  lastCheckOut: timestamp("last_check_out"),
  
  // Süre hesaplamaları (dakika)
  totalWorkMinutes: integer("total_work_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  netWorkMinutes: integer("net_work_minutes").default(0),
  
  // Planlanan vs gerçekleşen
  plannedWorkMinutes: integer("planned_work_minutes").default(540), // 9 saat = 540 dk
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0),
  
  // Durum
  isLate: boolean("is_late").default(false),
  lateMinutes: integer("late_minutes").default(0),
  isEarlyLeave: boolean("is_early_leave").default(false),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  
  // Onay durumu
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_daily_summary_user_idx").on(table.userId),
  index("branch_daily_summary_branch_idx").on(table.branchId),
  index("branch_daily_summary_date_idx").on(table.workDate),
  unique("branch_daily_summary_user_date_unique").on(table.userId, table.workDate),
]);

export const insertBranchShiftDailySummarySchema = createInsertSchema(branchShiftDailySummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchShiftDailySummary = z.infer<typeof insertBranchShiftDailySummarySchema>;
export type BranchShiftDailySummary = typeof branchShiftDailySummary.$inferSelect;

// Şube Haftalık Çalışma Özeti (45 saat takibi)
export const branchWeeklyAttendanceSummary = pgTable("branch_weekly_attendance_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Hafta bilgisi
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Çalışma saatleri
  plannedTotalMinutes: integer("planned_total_minutes").default(2700), // 45 saat = 2700 dk
  actualTotalMinutes: integer("actual_total_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0),
  
  // Günlük dağılım
  workDaysCount: integer("work_days_count").default(0),
  absentDaysCount: integer("absent_days_count").default(0),
  lateDaysCount: integer("late_days_count").default(0),
  
  // Uyumluluk
  weeklyComplianceScore: integer("weekly_compliance_score").default(100),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  accountingNotes: text("accounting_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_weekly_summary_user_idx").on(table.userId),
  index("branch_weekly_summary_branch_idx").on(table.branchId),
  index("branch_weekly_summary_week_idx").on(table.weekStartDate),
  unique("branch_weekly_summary_user_week_unique").on(table.userId, table.weekStartDate),
]);

export const insertBranchWeeklyAttendanceSummarySchema = createInsertSchema(branchWeeklyAttendanceSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchWeeklyAttendanceSummary = z.infer<typeof insertBranchWeeklyAttendanceSummarySchema>;
export type BranchWeeklyAttendanceSummary = typeof branchWeeklyAttendanceSummary.$inferSelect;

// HQ Vardiya Oturumlari (Merkez ofis personel takibi)
export const hqShiftSessions = pgTable("hq_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  workMinutes: integer("work_minutes").default(0),
  breakMinutes: integer("break_minutes").default(0),
  netWorkMinutes: integer("net_work_minutes").default(0),
  outsideMinutes: integer("outside_minutes").default(0), // dis gorev suresi
  
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, on_break, outside, completed
  
  // Lokasyon
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  isLocationVerified: boolean("is_location_verified").default(false),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hq_shift_sessions_user_idx").on(table.userId),
  index("hq_shift_sessions_date_idx").on(table.checkInTime),
  index("hq_shift_sessions_status_idx").on(table.status),
]);

export const insertHqShiftSessionSchema = createInsertSchema(hqShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertHqShiftSession = z.infer<typeof insertHqShiftSessionSchema>;
export type HqShiftSession = typeof hqShiftSessions.$inferSelect;

// HQ Cikis Olaylari (mola, dis gorev, kisisel izin)
export const hqShiftEvents = pgTable("hq_shift_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => hqShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  eventType: varchar("event_type", { length: 30 }).notNull(), // check_in, check_out, break_start, break_end, outside_start, outside_end
  exitReason: varchar("exit_reason", { length: 30 }), // break, external_task, personal, end_of_day
  exitDescription: text("exit_description"), // dis gorev aciklamasi
  estimatedReturnTime: timestamp("estimated_return_time"), // tahmini donus
  
  eventTime: timestamp("event_time").notNull().defaultNow(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hq_shift_events_session_idx").on(table.sessionId),
  index("hq_shift_events_user_idx").on(table.userId),
]);

export const insertHqShiftEventSchema = createInsertSchema(hqShiftEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertHqShiftEvent = z.infer<typeof insertHqShiftEventSchema>;
export type HqShiftEvent = typeof hqShiftEvents.$inferSelect;

// Şube Aylık Puantaj Özeti (İK raporlama için)
export const branchMonthlyPayrollSummary = pgTable("branch_monthly_payroll_summary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Ay bilgisi
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Toplam çalışma
  totalWorkDays: integer("total_work_days").default(0),
  totalWorkMinutes: integer("total_work_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  totalNetWorkMinutes: integer("total_net_work_minutes").default(0),
  
  // Fazla mesai / eksik saat
  totalOvertimeMinutes: integer("total_overtime_minutes").default(0),
  totalMissingMinutes: integer("total_missing_minutes").default(0),
  
  // Devamsızlık
  absentDays: integer("absent_days").default(0),
  lateDays: integer("late_days").default(0),
  earlyLeaveDays: integer("early_leave_days").default(0),
  
  // İzinler
  paidLeaveDays: integer("paid_leave_days").default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").default(0),
  sickLeaveDays: integer("sick_leave_days").default(0),
  
  // Resmi tatil
  publicHolidayDays: integer("public_holiday_days").default(0),
  
  // Onay ve export
  status: varchar("status", { length: 20 }).default("draft"), // draft, finalized, exported
  finalizedById: varchar("finalized_by_id").references(() => users.id, { onDelete: "set null" }),
  finalizedAt: timestamp("finalized_at"),
  exportedAt: timestamp("exported_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_monthly_payroll_user_idx").on(table.userId),
  index("branch_monthly_payroll_branch_idx").on(table.branchId),
  index("branch_monthly_payroll_month_idx").on(table.month, table.year),
  unique("branch_monthly_payroll_user_month_unique").on(table.userId, table.month, table.year),
]);

export const insertBranchMonthlyPayrollSummarySchema = createInsertSchema(branchMonthlyPayrollSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchMonthlyPayrollSummary = z.infer<typeof insertBranchMonthlyPayrollSummarySchema>;
export type BranchMonthlyPayrollSummary = typeof branchMonthlyPayrollSummary.$inferSelect;

// Şube Kiosk Ayarları (şube bazlı yapılandırma)
export const branchKioskSettings = pgTable("branch_kiosk_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }).unique(),
  
  // Kiosk erişim parolası
  kioskPassword: varchar("kiosk_password", { length: 255 }).notNull(),
  
  // Çalışma saatleri (varsayılan vardiya)
  defaultShiftStartTime: varchar("default_shift_start_time", { length: 5 }).default("08:00"), // HH:mm
  defaultShiftEndTime: varchar("default_shift_end_time", { length: 5 }).default("18:00"),
  
  // Mola ayarları
  defaultBreakMinutes: integer("default_break_minutes").default(60), // 1 saat mola
  maxBreakMinutes: integer("max_break_minutes").default(90), // Maksimum mola
  
  // Tolerans ayarları
  lateToleranceMinutes: integer("late_tolerance_minutes").default(15), // 15 dk tolerans
  earlyLeaveToleranceMinutes: integer("early_leave_tolerance_minutes").default(15),
  
  // Aktiflik
  isKioskEnabled: boolean("is_kiosk_enabled").default(true).notNull(),
  
  kioskMode: varchar("kiosk_mode", { length: 10 }).default("pin").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBranchKioskSettingsSchema = createInsertSchema(branchKioskSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchKioskSettings = z.infer<typeof insertBranchKioskSettingsSchema>;
export type BranchKioskSettings = typeof branchKioskSettings.$inferSelect;

export const qrCheckinNonces = pgTable("qr_checkin_nonces", {
  id: serial("id").primaryKey(),
  nonce: varchar("nonce", { length: 64 }).notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QrCheckinNonce = typeof qrCheckinNonces.$inferSelect;

// ========================================
// BİRLEŞİK UYARI SİSTEMİ (Dashboard Alerts)
// Hem Şube hem Fabrika için ortak uyarı altyapısı
// ========================================

// Uyarı konteksti - hangi dashboard için
export const ALERT_CONTEXT = {
  BRANCH: "branch",
  FACTORY: "factory",
} as const;

export type AlertContextType = typeof ALERT_CONTEXT[keyof typeof ALERT_CONTEXT];

// Uyarı türleri
export const ALERT_TRIGGER_TYPE = {
  // Şube uyarıları
  LATE_CLOCK_IN: "late_clock_in",           // Geç giriş
  EARLY_CLOCK_OUT: "early_clock_out",       // Erken çıkış
  MISSING_STAFF: "missing_staff",           // Eksik personel (vardiyaya gelmedi)
  CHECKLIST_OVERDUE: "checklist_overdue",   // Checklist gecikmesi
  NEGATIVE_FEEDBACK: "negative_feedback",   // Olumsuz müşteri geri bildirimi
  SHIFT_GAP: "shift_gap",                   // Vardiya boşluğu
  
  // Fabrika uyarıları
  QUALITY_ISSUE: "quality_issue",           // Kalite kontrol uyumsuzluğu
  PRODUCTION_DELAY: "production_delay",     // Üretim hedefi gecikmesi
  STATION_MALFUNCTION: "station_malfunction", // İstasyon arızası
  HIGH_WASTE_RATE: "high_waste_rate",       // Yüksek fire oranı
  EQUIPMENT_FAILURE: "equipment_failure",   // Ekipman arızası
  LOW_INVENTORY: "low_inventory",           // Düşük stok
} as const;

export type AlertTriggerType = typeof ALERT_TRIGGER_TYPE[keyof typeof ALERT_TRIGGER_TYPE];

// Uyarı seviyeleri
export const ALERT_SEVERITY = {
  CRITICAL: "critical",   // Kırmızı - acil müdahale gerekir
  WARNING: "warning",     // Turuncu - dikkat edilmeli
  INFO: "info",           // Sarı - bilgilendirme
} as const;

export type AlertSeverityType = typeof ALERT_SEVERITY[keyof typeof ALERT_SEVERITY];

// Uyarı durumları
export const ALERT_STATUS = {
  ACTIVE: "active",           // Aktif - henüz işlenmedi
  ACKNOWLEDGED: "acknowledged", // Görüldü/Onaylandı
  DISMISSED: "dismissed",     // Kapatıldı
  RESOLVED: "resolved",       // Çözüldü
  EXPIRED: "expired",         // Süresi doldu (auto-clear)
} as const;

export type AlertStatusType = typeof ALERT_STATUS[keyof typeof ALERT_STATUS];

// Birleşik Uyarılar Tablosu
export const dashboardAlerts = pgTable("dashboard_alerts", {
  id: serial("id").primaryKey(),
  
  // Kontekst - hangi dashboard için (branch/factory)
  context: varchar("context", { length: 20 }).notNull(), // AlertContextType
  contextId: integer("context_id").notNull(), // branchId veya factoryId (şimdilik hep 1)
  
  // Uyarı bilgileri
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // AlertTriggerType
  severity: varchar("severity", { length: 20 }).notNull().default("warning"), // AlertSeverityType
  status: varchar("status", { length: 20 }).notNull().default("active"), // AlertStatusType
  
  // Uyarı içeriği
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  
  // İlgili veri (JSON formatında)
  payload: text("payload"), // { userId, shiftId, checklistId, etc. }
  
  // İlişkili kayıtlar (opsiyonel)
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: "set null" }),
  relatedShiftId: integer("related_shift_id"),
  relatedChecklistId: integer("related_checklist_id"),
  
  // Zamanlama
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Otomatik expire için
  
  // Onay bilgileri
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedByUserId: varchar("acknowledged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Çözüm bilgileri
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolutionNote: text("resolution_note"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dashboard_alerts_context_idx").on(table.context, table.contextId),
  index("dashboard_alerts_status_idx").on(table.status),
  index("dashboard_alerts_severity_idx").on(table.severity),
  index("dashboard_alerts_occurred_at_idx").on(table.occurredAt),
]);

export const insertDashboardAlertSchema = createInsertSchema(dashboardAlerts).omit({
  id: true,
  createdAt: true,
});

export type InsertDashboardAlert = z.infer<typeof insertDashboardAlertSchema>;
export type DashboardAlert = typeof dashboardAlerts.$inferSelect;

// ============ MEGA-MODULE CONFIGURATION ============
// Allows admin to configure mega-module groupings

export const megaModuleConfig = pgTable("mega_module_config", {
  id: serial("id").primaryKey(),
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // e.g., "operations", "equipment", "hr"
  megaModuleName: varchar("mega_module_name", { length: 100 }).notNull(), // Display name
  megaModuleNameTr: varchar("mega_module_name_tr", { length: 100 }).notNull(), // Turkish name
  icon: varchar("icon", { length: 50 }).notNull(), // Lucide icon name
  color: varchar("color", { length: 50 }).notNull(), // Tailwind color class
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMegaModuleConfigSchema = createInsertSchema(megaModuleConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMegaModuleConfig = z.infer<typeof insertMegaModuleConfigSchema>;
export type MegaModuleConfig = typeof megaModuleConfig.$inferSelect;

// Sub-module assignments to mega-modules
export const megaModuleItems = pgTable("mega_module_items", {
  id: serial("id").primaryKey(),
  megaModuleId: varchar("mega_module_id", { length: 50 }).notNull(), // FK to mega_module_config
  subModuleId: varchar("sub_module_id", { length: 100 }).notNull(), // Original module ID from menu blueprint
  subModulePath: varchar("sub_module_path", { length: 255 }).notNull(), // Route path
  subModuleName: varchar("sub_module_name", { length: 100 }).notNull(), // Display name
  subModuleNameTr: varchar("sub_module_name_tr", { length: 100 }).notNull(), // Turkish name
  icon: varchar("icon", { length: 50 }), // Optional override icon
  tabGroup: varchar("tab_group", { length: 50 }), // Group tabs for large modules (e.g., "users", "settings", "content")
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMegaModuleItemSchema = createInsertSchema(megaModuleItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMegaModuleItem = z.infer<typeof insertMegaModuleItemSchema>;
export type MegaModuleItem = typeof megaModuleItems.$inferSelect;

// Default mega-module definitions (8 main categories)
export const DEFAULT_MEGA_MODULES = [
  { id: "operations", name: "Operations", nameTr: "Operasyonlar", icon: "ClipboardList", color: "bg-green-500" },
  { id: "equipment", name: "Equipment & Maintenance", nameTr: "Ekipman & Bakım", icon: "Wrench", color: "bg-orange-500" },
  { id: "hr", name: "Personnel & HR", nameTr: "Personel & İK", icon: "Users", color: "bg-pink-500" },
  { id: "training", name: "Training & Academy", nameTr: "Eğitim & Akademi", icon: "GraduationCap", color: "bg-blue-500" },
  { id: "kitchen", name: "Kitchen & Recipes", nameTr: "Mutfak & Tarifler", icon: "Coffee", color: "bg-amber-600" },
  { id: "reports", name: "Reports & Analytics", nameTr: "Raporlar & Analiz", icon: "BarChart3", color: "bg-cyan-500" },
  { id: "newshop", name: "New Shop Opening", nameTr: "Yeni Şube Açılış", icon: "Building2", color: "bg-violet-600" },
  { id: "admin", name: "Management & Settings", nameTr: "Yönetim & Ayarlar", icon: "Settings", color: "bg-slate-600" },
] as const;

// ========================================
// AYIN ELEMANI (Employee of the Month) SİSTEMİ
// ========================================

// QR Kod ile Personel Değerlendirme (Müşteri geri bildirimi)
export const staffQrRatings = pgTable("staff_qr_ratings", {
  id: serial("id").primaryKey(),
  
  // Personel ve şube bilgisi
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Değerlendirme puanları (1-5)
  serviceRating: integer("service_rating").notNull(), // Hizmet kalitesi
  friendlinessRating: integer("friendliness_rating").notNull(), // Güler yüzlülük
  speedRating: integer("speed_rating").notNull(), // Hız
  overallRating: integer("overall_rating").notNull(), // Genel puan
  
  // Opsiyonel yorum
  comment: text("comment"),
  
  // Müşteri bilgisi (anonim veya kayıtlı)
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  
  // QR kod bilgisi
  qrToken: varchar("qr_token", { length: 64 }).notNull(), // Benzersiz QR token
  
  // Durum
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, flagged, removed
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("staff_qr_ratings_staff_idx").on(table.staffId),
  index("staff_qr_ratings_branch_idx").on(table.branchId),
  index("staff_qr_ratings_date_idx").on(table.createdAt),
  index("staff_qr_ratings_token_idx").on(table.qrToken),
]);

export const insertStaffQrRatingSchema = createInsertSchema(staffQrRatings).omit({
  id: true,
  createdAt: true,
}).extend({
  serviceRating: z.number().int().min(1).max(5),
  friendlinessRating: z.number().int().min(1).max(5),
  speedRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
});

export type InsertStaffQrRating = z.infer<typeof insertStaffQrRatingSchema>;
export type StaffQrRating = typeof staffQrRatings.$inferSelect;

// Personel QR Token Yönetimi
export const staffQrTokens = pgTable("staff_qr_tokens", {
  id: serial("id").primaryKey(),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // QR token (benzersiz, kısa URL için)
  token: varchar("token", { length: 32 }).notNull().unique(),
  
  // Aktiflik ve son kullanım
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("staff_qr_tokens_staff_branch_unique").on(table.staffId, table.branchId),
  index("staff_qr_tokens_token_idx").on(table.token),
]);

export const insertStaffQrTokenSchema = createInsertSchema(staffQrTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffQrToken = z.infer<typeof insertStaffQrTokenSchema>;
export type StaffQrToken = typeof staffQrTokens.$inferSelect;

// Ayın Elemanı Puanlama Ağırlıkları (Admin yapılandırması)
export const employeeOfMonthWeights = pgTable("employee_of_month_weights", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }), // null = global default
  
  // Puanlama ağırlıkları (toplam 100 olmalı)
  attendanceWeight: integer("attendance_weight").default(20).notNull(), // Vardiya uyumu, zamanında gelme
  checklistWeight: integer("checklist_weight").default(20).notNull(), // Checklist tamamlama oranı
  taskWeight: integer("task_weight").default(15).notNull(), // Görev performansı
  customerRatingWeight: integer("customer_rating_weight").default(15).notNull(), // QR müşteri değerlendirmesi
  managerRatingWeight: integer("manager_rating_weight").default(20).notNull(), // Yönetici değerlendirmesi
  leaveDeductionWeight: integer("leave_deduction_weight").default(10).notNull(), // İzin kesintisi (rapor, ücretsiz izin)
  
  // Bonus puanlar (opsiyonel)
  bonusMaxPoints: integer("bonus_max_points").default(10), // Maksimum bonus puan
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeOfMonthWeightsSchema = createInsertSchema(employeeOfMonthWeights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOfMonthWeights = z.infer<typeof insertEmployeeOfMonthWeightsSchema>;
export type EmployeeOfMonthWeights = typeof employeeOfMonthWeights.$inferSelect;

// Aylık Personel Performans Özeti (Ayın Elemanı hesaplama için)
export const monthlyEmployeePerformance = pgTable("monthly_employee_performance", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Alt skorlar (0-100 arası)
  attendanceScore: integer("attendance_score").default(0), // Vardiya uyumu skoru
  checklistScore: integer("checklist_score").default(0), // Checklist tamamlama skoru
  taskScore: integer("task_score").default(0), // Görev performans skoru
  customerRatingScore: integer("customer_rating_score").default(0), // QR değerlendirme skoru
  managerRatingScore: integer("manager_rating_score").default(0), // Yönetici değerlendirme skoru
  
  // Detaylı metrikler
  totalShifts: integer("total_shifts").default(0),
  onTimeShifts: integer("on_time_shifts").default(0),
  lateShifts: integer("late_shifts").default(0),
  absentShifts: integer("absent_shifts").default(0),
  
  totalChecklists: integer("total_checklists").default(0),
  completedChecklists: integer("completed_checklists").default(0),
  onTimeChecklists: integer("on_time_checklists").default(0),
  
  totalTasks: integer("total_tasks").default(0),
  completedTasks: integer("completed_tasks").default(0),
  avgTaskRating: numeric("avg_task_rating", { precision: 3, scale: 2 }).default("0"),
  
  totalCustomerRatings: integer("total_customer_ratings").default(0),
  avgCustomerRating: numeric("avg_customer_rating", { precision: 3, scale: 2 }).default("0"),
  
  // İzin bilgileri
  paidLeaveDays: integer("paid_leave_days").default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").default(0),
  sickLeaveDays: integer("sick_leave_days").default(0),
  
  // Hesaplanan toplam skor
  leaveDeduction: integer("leave_deduction").default(0), // İzin kesintisi puanı
  bonusPoints: integer("bonus_points").default(0), // Bonus puanlar
  finalScore: integer("final_score").default(0), // Ağırlıklı toplam (0-100)
  
  // Sıralama
  branchRank: integer("branch_rank"), // Şube içi sıralama
  
  // Durum
  status: varchar("status", { length: 20 }).default("calculating").notNull(), // calculating, finalized, awarded
  calculatedAt: timestamp("calculated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("monthly_perf_user_month_unique").on(table.userId, table.month, table.year),
  index("monthly_perf_branch_idx").on(table.branchId),
  index("monthly_perf_period_idx").on(table.month, table.year),
  index("monthly_perf_score_idx").on(table.finalScore),
]);

export const insertMonthlyEmployeePerformanceSchema = createInsertSchema(monthlyEmployeePerformance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyEmployeePerformance = z.infer<typeof insertMonthlyEmployeePerformanceSchema>;
export type MonthlyEmployeePerformance = typeof monthlyEmployeePerformance.$inferSelect;

// Ayın Elemanı Kayıtları (Kazananlar)
export const employeeOfMonthAwards = pgTable("employee_of_month_awards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  
  // Skor bilgileri
  finalScore: integer("final_score").notNull(),
  performanceId: integer("performance_id").references(() => monthlyEmployeePerformance.id, { onDelete: "set null" }),
  
  // Ödül detayları
  awardType: varchar("award_type", { length: 30 }).default("employee_of_month").notNull(), // employee_of_month, runner_up, rising_star
  awardTitle: varchar("award_title", { length: 100 }),
  awardDescription: text("award_description"),
  
  // Ödül badge/sertifika
  certificateUrl: text("certificate_url"),
  badgeId: varchar("badge_id", { length: 50 }),
  
  // Onay durumu
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, announced, celebrated
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  announcedAt: timestamp("announced_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("eom_award_branch_month_unique").on(table.branchId, table.month, table.year, table.awardType),
  index("eom_award_user_idx").on(table.userId),
  index("eom_award_period_idx").on(table.month, table.year),
]);

export const insertEmployeeOfMonthAwardSchema = createInsertSchema(employeeOfMonthAwards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOfMonthAward = z.infer<typeof insertEmployeeOfMonthAwardSchema>;
export type EmployeeOfMonthAward = typeof employeeOfMonthAwards.$inferSelect;

// ========================================
// YÖNETİCİ AYLIK PERSONEL DEĞERLENDİRME
// ========================================

// Yönetici Aylık Personel Değerlendirmesi
export const managerMonthlyRatings = pgTable("manager_monthly_ratings", {
  id: serial("id").primaryKey(),
  
  // Değerlendiren yönetici
  managerId: varchar("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Değerlendirilen personel
  employeeId: varchar("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Dönem
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  
  // Değerlendirme kriterleri (1-5 puan)
  workPerformanceRating: integer("work_performance_rating").notNull(), // Genel çalışma performansı
  teamworkRating: integer("teamwork_rating").notNull(), // Ekip uyumu ve iletişim
  initiativeRating: integer("initiative_rating").notNull(), // İnisiyatif ve problem çözme
  customerRelationsRating: integer("customer_relations_rating").notNull(), // Müşteri ilişkileri
  punctualityRating: integer("punctuality_rating").notNull(), // Dakiklik ve güvenilirlik
  
  // Ortalama puan (otomatik hesaplanır)
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull(),
  
  // Yorum ve öneriler
  strengths: text("strengths"), // Güçlü yönler
  areasToImprove: text("areas_to_improve"), // Geliştirilmesi gereken alanlar
  generalComment: text("general_comment"), // Genel yorum
  
  // Durum
  status: varchar("status", { length: 20 }).default("submitted").notNull(), // draft, submitted
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("manager_rating_unique").on(table.managerId, table.employeeId, table.month, table.year),
  index("manager_rating_employee_idx").on(table.employeeId),
  index("manager_rating_branch_idx").on(table.branchId),
  index("manager_rating_period_idx").on(table.month, table.year),
]);

export const insertManagerMonthlyRatingSchema = createInsertSchema(managerMonthlyRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  workPerformanceRating: z.number().int().min(1).max(5),
  teamworkRating: z.number().int().min(1).max(5),
  initiativeRating: z.number().int().min(1).max(5),
  customerRelationsRating: z.number().int().min(1).max(5),
  punctualityRating: z.number().int().min(1).max(5),
});

export type InsertManagerMonthlyRating = z.infer<typeof insertManagerMonthlyRatingSchema>;
export type ManagerMonthlyRating = typeof managerMonthlyRatings.$inferSelect;

// ========================================
// AI EKİPMAN BİLGİ BANKASI - Equipment Knowledge Base
// ========================================

export const equipmentKnowledge = pgTable("equipment_knowledge", {
  id: serial("id").primaryKey(),
  
  // Ekipman tipi (espresso_machine, grinder, refrigerator, blender, etc.)
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(),
  
  // Marka ve model (opsiyonel - genel bilgi için null)
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  
  // Bilgi kategorisi
  category: varchar("category", { length: 50 }).notNull(), // maintenance, troubleshooting, usage, safety, cleaning
  
  // Başlık ve içerik
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Detaylı bilgi (markdown destekli)
  
  // Anahtar kelimeler (arama için)
  keywords: text("keywords").array(),
  
  // Önem seviyesi
  priority: integer("priority").default(0), // 0=normal, 1=önemli, 2=kritik
  
  // Aktiflik durumu
  isActive: boolean("is_active").default(true).notNull(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("eq_knowledge_type_idx").on(table.equipmentType),
  index("eq_knowledge_brand_idx").on(table.brand),
  index("eq_knowledge_category_idx").on(table.category),
  index("eq_knowledge_active_idx").on(table.isActive),
]);

export const insertEquipmentKnowledgeSchema = createInsertSchema(equipmentKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentKnowledge = z.infer<typeof insertEquipmentKnowledgeSchema>;
export type EquipmentKnowledge = typeof equipmentKnowledge.$inferSelect;

// ========================================
// AI SİSTEM YAPILANDIRMASI - AI System Configuration
// ========================================

export const aiSystemConfig = pgTable("ai_system_config", {
  id: serial("id").primaryKey(),
  
  // Yapılandırma anahtarı
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  
  // Yapılandırma değeri (JSON formatında)
  configValue: text("config_value").notNull(),
  
  // Açıklama
  description: text("description"),
  
  // Aktiflik
  isActive: boolean("is_active").default(true).notNull(),
  
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiSystemConfigSchema = createInsertSchema(aiSystemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiSystemConfig = z.infer<typeof insertAiSystemConfigSchema>;
export type AiSystemConfig = typeof aiSystemConfig.$inferSelect;

// ========================================
// STOK YÖNETİMİ - Inventory Management
// ========================================

export const inventoryUnitEnum = ["kg", "gr", "lt", "ml", "adet", "paket", "kutu", "koli"] as const;
export type InventoryUnit = typeof inventoryUnitEnum[number];

export const inventoryCategoryEnum = [
  "hammadde", "ambalaj", "ekipman", "sube_ekipman",
  "sube_malzeme", "konsantre", "donut", "tatli", "tuzlu",
  "cay_grubu", "kahve", "toz_topping", "yarimamul", "mamul", "sarf_malzeme", "temizlik", "diger", "arge"
] as const;
export type InventoryCategory = typeof inventoryCategoryEnum[number];

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 50 }),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).default("0").notNull(),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 3 }).default("0").notNull(),
  maximumStock: numeric("maximum_stock", { precision: 12, scale: 3 }),
  reorderPoint: numeric("reorder_point", { precision: 12, scale: 3 }),
  
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0"),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 10, scale: 2 }),
  
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  storageConditions: text("storage_conditions"),
  shelfLife: integer("shelf_life"),
  
  barcode: varchar("barcode", { length: 100 }),
  qrCode: varchar("qr_code", { length: 255 }),
  batchTracking: boolean("batch_tracking").default(false),
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inventory_code_idx").on(table.code),
  index("inventory_category_idx").on(table.category),
  index("inventory_barcode_idx").on(table.barcode),
  index("inventory_active_idx").on(table.isActive),
  index("inventory_qr_code_idx").on(table.qrCode),
]);

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// Stok Hareketleri
export const inventoryMovementTypeEnum = ["giris", "cikis", "transfer", "uretim_giris", "uretim_cikis", "sayim_duzeltme", "fire", "iade"] as const;
export type InventoryMovementType = typeof inventoryMovementTypeEnum[number];

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  movementType: varchar("movement_type", { length: 30 }).notNull(), // giris, cikis, transfer, uretim_giris, uretim_cikis, sayim_duzeltme
  
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 12, scale: 3 }).notNull(),
  newStock: numeric("new_stock", { precision: 12, scale: 3 }).notNull(),
  
  // Referans bilgileri
  referenceType: varchar("reference_type", { length: 50 }), // purchase_order, production, goods_receipt, sale, transfer
  referenceId: integer("reference_id"),
  
  // Lokasyon (transfer için)
  fromLocation: varchar("from_location", { length: 100 }),
  toLocation: varchar("to_location", { length: 100 }),
  
  // Lot/Batch bilgisi
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  notes: text("notes"),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_movement_inventory_idx").on(table.inventoryId),
  index("inv_movement_type_idx").on(table.movementType),
  index("inv_movement_date_idx").on(table.createdAt),
  index("inv_movement_ref_idx").on(table.referenceType, table.referenceId),
]);

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
});

export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;

// ========================================
// TEDARİKÇİ YÖNETİMİ - Supplier Management
// ========================================

export const supplierStatusEnum = ["aktif", "pasif", "askiya_alinmis", "kara_liste"] as const;
export type SupplierStatus = typeof supplierStatusEnum[number];

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  
  // Temel bilgiler
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  taxNumber: varchar("tax_number", { length: 20 }),
  taxOffice: varchar("tax_office", { length: 100 }),
  
  // İletişim bilgileri
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  alternativePhone: varchar("alternative_phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  
  // Banka bilgileri
  bankName: varchar("bank_name", { length: 100 }),
  iban: varchar("iban", { length: 50 }),
  
  // Ticari bilgiler
  paymentTermDays: integer("payment_term_days").default(30),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }),
  
  // Kategoriler ve ürünler
  categories: text("categories").array(), // Tedarik ettiği kategoriler
  
  // Performans metrikleri
  performanceScore: numeric("performance_score", { precision: 3, scale: 1 }).default("0"),
  onTimeDeliveryRate: numeric("on_time_delivery_rate", { precision: 5, scale: 2 }).default("0"),
  qualityScore: numeric("quality_score", { precision: 3, scale: 1 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  totalOrderValue: numeric("total_order_value", { precision: 14, scale: 2 }).default("0"),
  
  // Durum
  status: varchar("status", { length: 30 }).default("aktif").notNull(),
  notes: text("notes"),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("supplier_code_idx").on(table.code),
  index("supplier_name_idx").on(table.name),
  index("supplier_status_idx").on(table.status),
]);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ========================================
// ÜRÜN-TEDARİKÇİ İLİŞKİSİ - Product Supplier Mapping
// ========================================

export const productSuppliers = pgTable("product_suppliers", {
  id: serial("id").primaryKey(),
  
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  
  // Tedarikçiye özel bilgiler
  supplierProductCode: varchar("supplier_product_code", { length: 100 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  minimumOrderQuantity: numeric("minimum_order_quantity", { precision: 12, scale: 3 }).default("1"),
  leadTimeDays: integer("lead_time_days").default(3),
  
  // Tercih sırası
  preferenceOrder: integer("preference_order").default(1),
  isPrimary: boolean("is_primary").default(false),
  
  // Durum
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ps_inventory_idx").on(table.inventoryId),
  index("ps_supplier_idx").on(table.supplierId),
]);

export const insertProductSupplierSchema = createInsertSchema(productSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductSupplier = z.infer<typeof insertProductSupplierSchema>;
export type ProductSupplier = typeof productSuppliers.$inferSelect;

// ========================================
// SİPARİŞ YÖNETİMİ - Purchase Order Management
// ========================================

export const purchaseOrderStatusEnum = ["taslak", "onay_bekliyor", "onaylandi", "siparis_verildi", "kismen_teslim", "tamamlandi", "iptal"] as const;
export type PurchaseOrderStatus = typeof purchaseOrderStatusEnum[number];

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  
  // Sipariş bilgileri
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  
  // Tarihler
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  
  // Tutar bilgileri
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  
  // Durum ve onay
  status: varchar("status", { length: 30 }).default("taslak").notNull(),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  // Teslimat bilgileri
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),
  
  // Notlar
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("po_order_number_idx").on(table.orderNumber),
  index("po_supplier_idx").on(table.supplierId),
  index("po_status_idx").on(table.status),
  index("po_date_idx").on(table.orderDate),
]);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Sipariş Kalemleri
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("18"),
  discountRate: numeric("discount_rate", { precision: 5, scale: 2 }).default("0"),
  
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  
  // Teslimat durumu
  deliveredQuantity: numeric("delivered_quantity", { precision: 12, scale: 3 }).default("0"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("poi_order_idx").on(table.purchaseOrderId),
  index("poi_inventory_idx").on(table.inventoryId),
]);

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

// ========================================
// MAL KABUL - Goods Receipt
// ========================================

export const goodsReceiptStatusEnum = ["beklemede", "kontrol_ediliyor", "kabul_edildi", "kismen_kabul", "reddedildi"] as const;
export type GoodsReceiptStatus = typeof goodsReceiptStatusEnum[number];

export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  
  // Kabul bilgileri
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  
  // Tarih ve zaman
  receiptDate: timestamp("receipt_date").defaultNow().notNull(),
  
  // Belge bilgileri
  supplierInvoiceNumber: varchar("supplier_invoice_number", { length: 100 }),
  supplierInvoiceDate: timestamp("supplier_invoice_date"),
  deliveryNoteNumber: varchar("delivery_note_number", { length: 100 }),
  
  // Durum
  status: varchar("status", { length: 30 }).default("beklemede").notNull(),
  
  // Kalite kontrol
  qualityCheckRequired: boolean("quality_check_required").default(false),
  qualityCheckPassed: boolean("quality_check_passed"),
  qualityCheckNotes: text("quality_check_notes"),
  qualityCheckedById: varchar("quality_checked_by_id").references(() => users.id, { onDelete: "set null" }),
  qualityCheckedAt: timestamp("quality_checked_at"),
  
  // Teslimat durumu ve tedarikçi değerlendirmesi
  deliveryStatus: varchar("delivery_status", { length: 20 }), // early, on_time, late
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  deliveryDelayDays: integer("delivery_delay_days").default(0),
  supplierQualityScore: integer("supplier_quality_score"), // 1-5 puan
  supplierQualityNotes: text("supplier_quality_notes"),
  
  // Notlar
  notes: text("notes"),
  
  receivedById: varchar("received_by_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("gr_receipt_number_idx").on(table.receiptNumber),
  index("gr_po_idx").on(table.purchaseOrderId),
  index("gr_supplier_idx").on(table.supplierId),
  index("gr_status_idx").on(table.status),
  index("gr_date_idx").on(table.receiptDate),
]);

export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoodsReceipt = z.infer<typeof insertGoodsReceiptSchema>;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;

// Mal Kabul Kalemleri
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  purchaseOrderItemId: integer("purchase_order_item_id").references(() => purchaseOrderItems.id, { onDelete: "set null" }),
  
  // Miktarlar
  orderedQuantity: numeric("ordered_quantity", { precision: 12, scale: 3 }),
  receivedQuantity: numeric("received_quantity", { precision: 12, scale: 3 }).notNull(),
  acceptedQuantity: numeric("accepted_quantity", { precision: 12, scale: 3 }),
  rejectedQuantity: numeric("rejected_quantity", { precision: 12, scale: 3 }).default("0"),
  
  unit: varchar("unit", { length: 20 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  
  // Lot/Batch bilgisi
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  productionDate: timestamp("production_date"),
  
  // Kalite kontrol
  qualityStatus: varchar("quality_status", { length: 30 }).default("beklemede"), // beklemede, gecti, kaldi
  qualityNotes: text("quality_notes"),
  
  // Red nedeni
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("gri_receipt_idx").on(table.goodsReceiptId),
  index("gri_inventory_idx").on(table.inventoryId),
  index("gri_batch_idx").on(table.batchNumber),
]);

export const insertGoodsReceiptItemSchema = createInsertSchema(goodsReceiptItems).omit({
  id: true,
  createdAt: true,
});

export type InsertGoodsReceiptItem = z.infer<typeof insertGoodsReceiptItemSchema>;
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;

// ========================================
// REÇETE-HAMMADDE İLİŞKİSİ - Recipe Ingredients
// ========================================

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  // Miktar bilgisi
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Boyut (küçük/büyük bardak için farklı miktarlar)
  cupSize: varchar("cup_size", { length: 20 }).default("all"), // small, large, all
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ri_recipe_idx").on(table.recipeId),
  index("ri_inventory_idx").on(table.inventoryId),
]);

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

// ========================================
// ÜRETİM KAYITLARI - Production Records
// ========================================

export const productionRecords = pgTable("production_records", {
  id: serial("id").primaryKey(),
  
  // Üretim bilgileri
  productionNumber: varchar("production_number", { length: 50 }).notNull().unique(),
  productionDate: timestamp("production_date").defaultNow().notNull(),
  
  // Üretilen ürün
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  
  // Miktarlar
  plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 3 }).notNull(),
  producedQuantity: numeric("produced_quantity", { precision: 12, scale: 3 }).notNull(),
  wasteQuantity: numeric("waste_quantity", { precision: 12, scale: 3 }).default("0"),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Lot/Batch
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  // Durum
  status: varchar("status", { length: 30 }).default("tamamlandi"), // planlandi, devam_ediyor, tamamlandi, iptal
  
  // Hammadde tüketimi işlendi mi?
  ingredientsDeducted: boolean("ingredients_deducted").default(false),
  productAddedToStock: boolean("product_added_to_stock").default(false),
  
  notes: text("notes"),
  
  producedById: varchar("produced_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pr_number_idx").on(table.productionNumber),
  index("pr_date_idx").on(table.productionDate),
  index("pr_inventory_idx").on(table.inventoryId),
  index("pr_recipe_idx").on(table.recipeId),
  index("pr_status_idx").on(table.status),
]);

export const insertProductionRecordSchema = createInsertSchema(productionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionRecord = z.infer<typeof insertProductionRecordSchema>;
export type ProductionRecord = typeof productionRecords.$inferSelect;

// Üretim Hammadde Kullanımı
export const productionIngredients = pgTable("production_ingredients", {
  id: serial("id").primaryKey(),
  
  productionRecordId: integer("production_record_id").references(() => productionRecords.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "restrict" }).notNull(),
  
  plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 3 }).notNull(),
  usedQuantity: numeric("used_quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Stoktan düşüldü mü?
  deductedFromStock: boolean("deducted_from_stock").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pi_production_idx").on(table.productionRecordId),
  index("pi_inventory_idx").on(table.inventoryId),
]);

export const insertProductionIngredientSchema = createInsertSchema(productionIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertProductionIngredient = z.infer<typeof insertProductionIngredientSchema>;
export type ProductionIngredient = typeof productionIngredients.$inferSelect;

// ========================================
// CARİ TAKİP - Receivables/Payables Tracking
// ========================================

export const cariAccounts = pgTable("cari_accounts", {
  id: serial("id").primaryKey(),
  
  // Hesap bilgileri
  accountCode: varchar("account_code", { length: 50 }).notNull().unique(),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(), // branch, supplier, customer, other
  
  // İlişkili kayıtlar (opsiyonel)
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  
  // İletişim bilgileri
  contactPerson: varchar("contact_person", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  
  // Bakiye bilgileri (cache olarak tutulur)
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).default("0"),
  lastTransactionDate: timestamp("last_transaction_date"),
  
  // Durum
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("cari_account_type_idx").on(table.accountType),
  index("cari_branch_idx").on(table.branchId),
]);

export const cariTransactions = pgTable("cari_transactions", {
  id: serial("id").primaryKey(),
  
  accountId: integer("account_id").references(() => cariAccounts.id, { onDelete: "cascade" }).notNull(),
  
  // İşlem bilgileri
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // borc (debit), alacak (credit)
  
  // Tutar
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  
  // Açıklama
  description: text("description"),
  documentNumber: varchar("document_number", { length: 100 }),
  documentType: varchar("document_type", { length: 50 }), // fatura, tahsilat, tediye, virman
  
  // Vade bilgisi
  dueDate: timestamp("due_date"),
  isPaid: boolean("is_paid").default(false),
  paidDate: timestamp("paid_date"),
  
  // İlişkili kayıtlar
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id, { onDelete: "set null" }),
  
  createdById: varchar("created_by_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("cari_tx_account_idx").on(table.accountId),
  index("cari_tx_date_idx").on(table.transactionDate),
  index("cari_tx_due_idx").on(table.dueDate),
]);

export const insertCariAccountSchema = createInsertSchema(cariAccounts).omit({
  id: true,
  currentBalance: true,
  lastTransactionDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCariTransactionSchema = createInsertSchema(cariTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCariAccount = z.infer<typeof insertCariAccountSchema>;
export type CariAccount = typeof cariAccounts.$inferSelect;
export type InsertCariTransaction = z.infer<typeof insertCariTransactionSchema>;
export type CariTransaction = typeof cariTransactions.$inferSelect;

// ========================================
// MALİYET HESAPLAMA SİSTEMİ - Cost Calculation System
// ========================================

// Ürün Kategorileri
export const productCategoryEnum = [
  "donut", "pastane", "konsantre", "topping", "kahve", "cay", 
  "kullan_at", "sarf_malzeme", "wasp", "porselen", "mamabon", "diger"
] as const;
export type ProductCategory = typeof productCategoryEnum[number];

// Hammadde Listesi - Raw Materials (Satınalma stoğundan çekilen)
export const rawMaterials = pgTable("raw_materials", {
  id: serial("id").primaryKey(),
  
  // Hammadde bilgileri
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  
  // Birim bilgileri
  unit: varchar("unit", { length: 20 }).notNull(), // kg, lt, adet vs.
  
  // Fiyat bilgileri (Satınalmadan güncel)
  currentUnitPrice: numeric("current_unit_price", { precision: 12, scale: 4 }).default("0"),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 12, scale: 4 }).default("0"),
  averagePrice: numeric("average_price", { precision: 12, scale: 4 }).default("0"),
  priceLastUpdated: timestamp("price_last_updated"),
  
  // Stok bağlantısı
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  
  // Durum
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  // Keyblend - Gizli formülasyon hammaddesi
  isKeyblend: boolean("is_keyblend").default(false),
  keyblendCost: numeric("keyblend_cost", { precision: 12, scale: 4 }).default("0"), // Admin tarafından girilen maliyet
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("rm_code_idx").on(table.code),
  index("rm_category_idx").on(table.category),
  index("rm_inventory_idx").on(table.inventoryId),
]);

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// Ürün Reçetesi - Product Recipe
export const productRecipes = pgTable("product_recipes", {
  id: serial("id").primaryKey(),
  
  // Ürün bağlantısı
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  
  // Reçete bilgileri
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  
  // Reçete tipi - OPEN (görünür) veya KEYBLEND (bazı içerikler gizli)
  recipeType: varchar("recipe_type", { length: 20 }).default("OPEN"), // OPEN, KEYBLEND
  
  // Üretim bilgileri
  outputQuantity: numeric("output_quantity", { precision: 12, scale: 3 }).default("1"),
  outputUnit: varchar("output_unit", { length: 20 }).default("adet"),
  productionTimeMinutes: integer("production_time_minutes").default(0),
  
  // İşçilik bilgileri
  laborWorkerCount: integer("labor_worker_count").default(1),
  laborBatchSize: integer("labor_batch_size").default(1),
  laborHourlyRate: numeric("labor_hourly_rate", { precision: 10, scale: 2 }).default("0"),
  
  // Enerji bilgileri - Activity-Based Costing
  energyKwhPerBatch: numeric("energy_kwh_per_batch", { precision: 10, scale: 3 }).default("0"),
  equipmentDescription: text("equipment_description"),
  machineId: integer("machine_id"),
  
  // Batch verim & fire hesaplama
  expectedUnitWeight: numeric("expected_unit_weight", { precision: 10, scale: 3 }),
  expectedUnitWeightUnit: varchar("expected_unit_weight_unit", { length: 10 }).default("g"),
  expectedOutputCount: integer("expected_output_count"),
  expectedWastePercent: numeric("expected_waste_percent", { precision: 5, scale: 2 }),
  wasteTolerancePercent: numeric("waste_tolerance_percent", { precision: 5, scale: 2 }).default("5"),

  // Hesaplanan maliyetler
  rawMaterialCost: numeric("raw_material_cost", { precision: 12, scale: 4 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 12, scale: 4 }).default("0"),
  energyCost: numeric("energy_cost", { precision: 12, scale: 4 }).default("0"),
  packagingCost: numeric("packaging_cost", { precision: 12, scale: 4 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 12, scale: 4 }).default("0"),
  totalUnitCost: numeric("total_unit_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Maliyet son güncelleme
  costLastCalculated: timestamp("cost_last_calculated"),
  
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pr_product_idx").on(table.productId),
  index("pr_active_idx").on(table.isActive),
]);

export const insertProductRecipeSchema = createInsertSchema(productRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductRecipe = z.infer<typeof insertProductRecipeSchema>;
export type ProductRecipe = typeof productRecipes.$inferSelect;

// Reçete Hammaddeleri - Recipe Ingredients
export const productRecipeIngredients = pgTable("product_recipe_ingredients", {
  id: serial("id").primaryKey(),
  
  recipeId: integer("recipe_id").references(() => productRecipes.id, { onDelete: "cascade" }).notNull(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "restrict" }).notNull(),
  
  // Miktar bilgileri
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  // Hesaplanan maliyet
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 4 }).default("0"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pri_recipe_idx").on(table.recipeId),
  index("pri_material_idx").on(table.rawMaterialId),
]);

export const insertProductRecipeIngredientSchema = createInsertSchema(productRecipeIngredients).omit({
  id: true,
  createdAt: true,
});

export type InsertProductRecipeIngredient = z.infer<typeof insertProductRecipeIngredientSchema>;
export type ProductRecipeIngredient = typeof productRecipeIngredients.$inferSelect;

// Ürün Ambalaj Malzemeleri - Product Packaging Items
export const productPackagingItems = pgTable("product_packaging_items", {
  id: serial("id").primaryKey(),
  
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "set null" }),
  
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("adet"),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).default("1"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 4 }).notNull(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ppi_product_idx").on(table.productId),
]);

export const insertProductPackagingItemSchema = createInsertSchema(productPackagingItems).omit({
  id: true,
  createdAt: true,
});

export type InsertProductPackagingItem = z.infer<typeof insertProductPackagingItemSchema>;
export type ProductPackagingItem = typeof productPackagingItems.$inferSelect;

// Fabrika Maliyet Ayarları - Factory Cost Settings
export const factoryCostSettings = pgTable("factory_cost_settings", {
  id: serial("id").primaryKey(),
  
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: numeric("setting_value", { precision: 14, scale: 4 }).notNull(),
  description: text("description"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFactoryCostSettingSchema = createInsertSchema(factoryCostSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertFactoryCostSetting = z.infer<typeof insertFactoryCostSettingSchema>;
export type FactoryCostSetting = typeof factoryCostSettings.$inferSelect;

// Fabrika Sabit Giderleri - Factory Fixed Costs
export const fixedCostCategoryEnum = [
  "personel", "elektrik", "dogalgaz", "su", "kira", "sigorta", 
  "amortisman", "bakim_onarim", "temizlik", "guvenlik", "iletisim",
  "vergi", "diger"
] as const;
export type FixedCostCategory = typeof fixedCostCategoryEnum[number];

export const factoryFixedCosts = pgTable("factory_fixed_costs", {
  id: serial("id").primaryKey(),
  
  // Gider bilgileri
  category: varchar("category", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Tutar bilgileri
  monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 }).notNull(),
  annualAmount: numeric("annual_amount", { precision: 14, scale: 2 }),
  
  // Dağıtım yöntemi
  allocationMethod: varchar("allocation_method", { length: 50 }).default("production_volume"), // production_volume, direct_labor, machine_hours
  allocationPercentage: numeric("allocation_percentage", { precision: 5, scale: 2 }).default("100"),
  
  // Dönem bilgisi
  effectiveMonth: integer("effective_month"), // 1-12
  effectiveYear: integer("effective_year"),
  
  // Durum
  isRecurring: boolean("is_recurring").default(true),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ffc_category_idx").on(table.category),
  index("ffc_period_idx").on(table.effectiveYear, table.effectiveMonth),
]);

export const insertFactoryFixedCostSchema = createInsertSchema(factoryFixedCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryFixedCost = z.infer<typeof insertFactoryFixedCostSchema>;
export type FactoryFixedCost = typeof factoryFixedCosts.$inferSelect;

// Kar Marjı Şablonları - Profit Margin Templates
export const profitMarginTemplates = pgTable("profit_margin_templates", {
  id: serial("id").primaryKey(),
  
  // Şablon bilgileri
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // Ürün kategorisi
  
  // Marj bilgileri
  defaultMargin: numeric("default_margin", { precision: 5, scale: 2 }).notNull(), // Örn: 1.20 = %20 kar
  minimumMargin: numeric("minimum_margin", { precision: 5, scale: 2 }).default("1.01"),
  maximumMargin: numeric("maximum_margin", { precision: 5, scale: 2 }).default("2.00"),
  
  // Ek bilgiler
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pmt_category_idx").on(table.category),
]);

export const insertProfitMarginTemplateSchema = createInsertSchema(profitMarginTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProfitMarginTemplate = z.infer<typeof insertProfitMarginTemplateSchema>;
export type ProfitMarginTemplate = typeof profitMarginTemplates.$inferSelect;

// Ürün Maliyet Hesaplamaları - Product Cost Calculations (Geçmiş kayıtları)
export const productCostCalculations = pgTable("product_cost_calculations", {
  id: serial("id").primaryKey(),
  
  // Ürün ve reçete bağlantısı
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  recipeId: integer("recipe_id").references(() => productRecipes.id, { onDelete: "set null" }),
  
  // Hesaplama dönemi
  calculationDate: timestamp("calculation_date").defaultNow().notNull(),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  
  // Maliyet bileşenleri
  rawMaterialCost: numeric("raw_material_cost", { precision: 12, scale: 4 }).default("0"),
  directLaborCost: numeric("direct_labor_cost", { precision: 12, scale: 4 }).default("0"),
  energyCost: numeric("energy_cost", { precision: 12, scale: 4 }).default("0"),
  packagingCost: numeric("packaging_cost", { precision: 12, scale: 4 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Toplam maliyet
  totalUnitCost: numeric("total_unit_cost", { precision: 12, scale: 4 }).notNull(),
  totalPackageCost: numeric("total_package_cost", { precision: 12, scale: 4 }).default("0"),
  
  // Fiyatlandırma
  appliedMargin: numeric("applied_margin", { precision: 5, scale: 2 }).default("1.01"),
  suggestedSellingPrice: numeric("suggested_selling_price", { precision: 12, scale: 2 }).default("0"),
  actualSellingPrice: numeric("actual_selling_price", { precision: 12, scale: 2 }).default("0"),
  
  // Kar bilgileri
  profitPerUnit: numeric("profit_per_unit", { precision: 12, scale: 4 }).default("0"),
  profitMarginPercentage: numeric("profit_margin_percentage", { precision: 5, scale: 2 }).default("0"),
  
  // Üretim miktarı (bu dönemdeki)
  productionQuantity: integer("production_quantity").default(0),
  
  notes: text("notes"),
  calculatedById: varchar("calculated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pcc_product_idx").on(table.productId),
  index("pcc_period_idx").on(table.periodYear, table.periodMonth),
  index("pcc_date_idx").on(table.calculationDate),
]);

export const insertProductCostCalculationSchema = createInsertSchema(productCostCalculations).omit({
  id: true,
  createdAt: true,
});

export type InsertProductCostCalculation = z.infer<typeof insertProductCostCalculationSchema>;
export type ProductCostCalculation = typeof productCostCalculations.$inferSelect;

// Üretim Kayıtları için Maliyet Takibi - Production Cost Tracking
export const productionCostTracking = pgTable("production_cost_tracking", {
  id: serial("id").primaryKey(),
  
  // Üretim bağlantısı
  productionRecordId: integer("production_record_id").references(() => productionRecords.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  
  // Üretim bilgileri
  productionDate: timestamp("production_date").defaultNow().notNull(),
  quantity: integer("quantity").notNull(),
  
  // Maliyet bilgileri
  rawMaterialCostPerUnit: numeric("raw_material_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  laborCostPerUnit: numeric("labor_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  overheadCostPerUnit: numeric("overhead_cost_per_unit", { precision: 12, scale: 4 }).default("0"),
  totalCostPerUnit: numeric("total_cost_per_unit", { precision: 12, scale: 4 }).notNull(),
  
  // Toplam maliyet
  totalProductionCost: numeric("total_production_cost", { precision: 14, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pct_product_idx").on(table.productId),
  index("pct_date_idx").on(table.productionDate),
  index("pct_production_idx").on(table.productionRecordId),
]);

export const insertProductionCostTrackingSchema = createInsertSchema(productionCostTracking).omit({
  id: true,
  createdAt: true,
});

export type InsertProductionCostTracking = z.infer<typeof insertProductionCostTrackingSchema>;
export type ProductionCostTracking = typeof productionCostTracking.$inferSelect;

export const rawMaterialPriceHistory = pgTable("raw_material_price_history", {
  id: serial("id").primaryKey(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  previousPrice: numeric("previous_price", { precision: 12, scale: 4 }),
  newPrice: numeric("new_price", { precision: 12, scale: 4 }).notNull(),
  changePercent: numeric("change_percent", { precision: 8, scale: 2 }),
  source: varchar("source", { length: 50 }).default("manual"),
  notes: text("notes"),
  changedBy: varchar("changed_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("rmph_material_idx").on(table.rawMaterialId),
  index("rmph_date_idx").on(table.createdAt),
  index("rmph_supplier_idx").on(table.supplierId),
]);

export const insertRawMaterialPriceHistorySchema = createInsertSchema(rawMaterialPriceHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertRawMaterialPriceHistory = z.infer<typeof insertRawMaterialPriceHistorySchema>;
export type RawMaterialPriceHistory = typeof rawMaterialPriceHistory.$inferSelect;

// Fabrika Cihazlar / Makineler - Factory Machines
export const factoryMachines = pgTable("factory_machines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  kwhConsumption: numeric("kwh_consumption", { precision: 10, scale: 3 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFactoryMachineSchema = createInsertSchema(factoryMachines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryMachine = z.infer<typeof insertFactoryMachineSchema>;
export type FactoryMachine = typeof factoryMachines.$inferSelect;

// Cihaz - Ürün İlişkisi - Machine-Product Mapping
export const machineProducts = pgTable("machine_products", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("mp_machine_idx").on(table.machineId),
  index("mp_product_idx").on(table.productId),
]);

// ========================================
// FABRIKA VARDİYA & ÜRETİM PLANLAMA SİSTEMİ
// ========================================

// Fabrika Vardiyaları - Factory Shifts (sabah/akşam/gece)
export const factoryShifts = pgTable("factory_shifts", {
  id: serial("id").primaryKey(),
  shiftDate: date("shift_date").notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // sabah, aksam, gece
  startTime: varchar("start_time", { length: 5 }).notNull(), // "06:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "14:00"
  status: varchar("status", { length: 20 }).default("planned").notNull(), // planned, active, completed, cancelled
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fs_date_idx").on(table.shiftDate),
  index("fs_type_idx").on(table.shiftType),
  index("fs_status_idx").on(table.status),
]);

export const insertFactoryShiftSchema = createInsertSchema(factoryShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryShift = z.infer<typeof insertFactoryShiftSchema>;
export type FactoryShift = typeof factoryShifts.$inferSelect;

// Vardiya Çalışan Atamaları - Shift Worker Assignments
export const factoryShiftWorkers = pgTable("factory_shift_workers", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => factoryShifts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  role: varchar("role", { length: 30 }).default("operator"), // operator, supervisor, kalite_kontrol, destek
  selfSelected: boolean("self_selected").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fsw_shift_idx").on(table.shiftId),
  index("fsw_user_idx").on(table.userId),
  index("fsw_machine_idx").on(table.machineId),
]);

export const insertFactoryShiftWorkerSchema = createInsertSchema(factoryShiftWorkers).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryShiftWorker = z.infer<typeof insertFactoryShiftWorkerSchema>;
export type FactoryShiftWorker = typeof factoryShiftWorkers.$inferSelect;

// Batch Spesifikasyonları - Her ürün+makine için standart batch tanımı
export const factoryBatchSpecs = pgTable("factory_batch_specs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchWeightKg: numeric("batch_weight_kg", { precision: 10, scale: 2 }).notNull(),
  batchWeightUnit: varchar("batch_weight_unit", { length: 10 }).default("kg").notNull(),
  expectedPieces: integer("expected_pieces").notNull(),
  pieceWeightGrams: numeric("piece_weight_grams", { precision: 10, scale: 2 }),
  pieceWeightUnit: varchar("piece_weight_unit", { length: 10 }).default("g").notNull(),
  targetDurationMinutes: integer("target_duration_minutes").notNull(),
  recipeId: integer("recipe_id"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fbs_product_idx").on(table.productId),
  index("fbs_machine_idx").on(table.machineId),
]);

export const insertFactoryBatchSpecSchema = createInsertSchema(factoryBatchSpecs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryBatchSpec = z.infer<typeof insertFactoryBatchSpecSchema>;
export type FactoryBatchSpec = typeof factoryBatchSpecs.$inferSelect;

// Vardiya Üretim Planları - Her vardiyada hangi üründen kaç batch üretilecek
export const factoryShiftProductions = pgTable("factory_shift_productions", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => factoryShifts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchSpecId: integer("batch_spec_id").references(() => factoryBatchSpecs.id, { onDelete: "set null" }),
  plannedBatchCount: integer("planned_batch_count").notNull().default(1),
  completedBatchCount: integer("completed_batch_count").default(0),
  status: varchar("status", { length: 20 }).default("planned").notNull(), // planned, in_progress, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fsp_shift_idx").on(table.shiftId),
  index("fsp_product_idx").on(table.productId),
]);

export const insertFactoryShiftProductionSchema = createInsertSchema(factoryShiftProductions).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryShiftProduction = z.infer<typeof insertFactoryShiftProductionSchema>;
export type FactoryShiftProduction = typeof factoryShiftProductions.$inferSelect;

// Üretim Batch'leri - Her batch'in başlangıç/bitiş süresi ve sonuçları
export const factoryProductionBatches = pgTable("factory_production_batches", {
  id: serial("id").primaryKey(),
  shiftProductionId: integer("shift_production_id").references(() => factoryShiftProductions.id, { onDelete: "set null" }),
  shiftId: integer("shift_id").references(() => factoryShifts.id, { onDelete: "set null" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").references(() => factoryMachines.id, { onDelete: "set null" }),
  batchSpecId: integer("batch_spec_id").references(() => factoryBatchSpecs.id, { onDelete: "set null" }),
  operatorUserId: varchar("operator_user_id").references(() => users.id, { onDelete: "set null" }),
  batchNumber: integer("batch_number").default(1),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  actualWeightKg: numeric("actual_weight_kg", { precision: 10, scale: 2 }),
  actualPieces: integer("actual_pieces"),
  targetWeightKg: numeric("target_weight_kg", { precision: 10, scale: 2 }),
  targetPieces: integer("target_pieces"),
  targetDurationMinutes: integer("target_duration_minutes"),
  actualDurationMinutes: integer("actual_duration_minutes"),
  wasteWeightKg: numeric("waste_weight_kg", { precision: 10, scale: 2 }).default("0"),
  wastePieces: integer("waste_pieces").default(0),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id, { onDelete: "set null" }),
  wasteNotes: text("waste_notes"),
  expectedWastePercent: numeric("expected_waste_percent", { precision: 5, scale: 2 }),
  actualWastePercent: numeric("actual_waste_percent", { precision: 5, scale: 2 }),
  wasteDeviationPercent: numeric("waste_deviation_percent", { precision: 5, scale: 2 }),
  totalInputWeightKg: numeric("total_input_weight_kg", { precision: 10, scale: 2 }),
  totalOutputWeightKg: numeric("total_output_weight_kg", { precision: 10, scale: 2 }),
  wasteCostTl: numeric("waste_cost_tl", { precision: 12, scale: 2 }),
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  yieldRate: numeric("yield_rate", { precision: 5, scale: 2 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, completed, verified, rejected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fpb_shift_prod_idx").on(table.shiftProductionId),
  index("fpb_shift_idx").on(table.shiftId),
  index("fpb_product_idx").on(table.productId),
  index("fpb_operator_idx").on(table.operatorUserId),
  index("fpb_machine_idx").on(table.machineId),
  index("fpb_start_idx").on(table.startTime),
]);

export const insertFactoryProductionBatchSchema = createInsertSchema(factoryProductionBatches).omit({
  id: true,
  createdAt: true,
});
export type InsertFactoryProductionBatch = z.infer<typeof insertFactoryProductionBatchSchema>;
export type FactoryProductionBatch = typeof factoryProductionBatches.$inferSelect;

// Batch Doğrulama - Supervisor/kalite kontrol onayı
export const factoryBatchVerifications = pgTable("factory_batch_verifications", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => factoryProductionBatches.id, { onDelete: "cascade" }),
  verifierUserId: varchar("verifier_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  verifiedWeightKg: numeric("verified_weight_kg", { precision: 10, scale: 2 }),
  verifiedPieces: integer("verified_pieces"),
  verifiedWasteKg: numeric("verified_waste_kg", { precision: 10, scale: 2 }),
  verifiedWastePieces: integer("verified_waste_pieces"),
  isApproved: boolean("is_approved").notNull(),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fbv_batch_idx").on(table.batchId),
  index("fbv_verifier_idx").on(table.verifierUserId),
]);

// ========================================
// ROLE TASK TEMPLATES & COMPLETIONS
// ========================================

export const roleTaskTemplates = pgTable("role_task_templates", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 20 }).notNull().default("daily"),
  priority: integer("priority").notNull().default(2),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: varchar("icon", { length: 50 }),
  targetUrl: varchar("target_url", { length: 200 }),
  moduleLink: varchar("module_link", { length: 100 }),
  detailSteps: jsonb("detail_steps").$type<Array<{step: string; tip?: string}>>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("rtt_role_idx").on(table.role),
  index("rtt_frequency_idx").on(table.frequency),
]);

export const roleTaskCompletions = pgTable("role_task_completions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  templateId: integer("template_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  periodDate: varchar("period_date", { length: 10 }).notNull(),
  notes: text("notes"),
}, (table) => [
  index("rtc_user_idx").on(table.userId),
  index("rtc_template_idx").on(table.templateId),
  index("rtc_period_idx").on(table.periodDate),
]);

// ========================================
// STOCK COUNTS (Stok Sayım)
// ========================================

export const stockCounts = pgTable("stock_counts", {
  id: serial("id").primaryKey(),
  countType: varchar("count_type", { length: 20 }).notNull().default("raw_material"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  startedBy: varchar("started_by", { length: 255 }).notNull(),
  approvedBy: varchar("approved_by", { length: 255 }),
  assignedTo: varchar("assigned_to", { length: 255 }),
  requestedBy: varchar("requested_by", { length: 255 }),
  requestedCategory: varchar("requested_category", { length: 50 }),
  scope: varchar("scope", { length: 30 }).notNull().default("full"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sc_status_idx").on(table.status),
  index("sc_type_idx").on(table.countType),
]);

export const insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
export type InsertStockCount = z.infer<typeof insertStockCountSchema>;
export type StockCount = typeof stockCounts.$inferSelect;

// ========================================
// EVENT-TRIGGERED DYNAMIC TASKS
// ========================================

export const eventTriggeredTasks = pgTable("event_triggered_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  priority: integer("priority").notNull().default(2),
  targetUrl: varchar("target_url", { length: 300 }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceId: integer("source_id"),
  sourceLabel: varchar("source_label", { length: 200 }),
  isCompleted: boolean("is_completed").notNull().default(false),
  isAutoResolved: boolean("is_auto_resolved").notNull().default(false),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ett_user_idx").on(table.userId),
  index("ett_source_idx").on(table.sourceType, table.sourceId),
  index("ett_completed_idx").on(table.isCompleted),
  index("ett_expires_idx").on(table.expiresAt),
]);

// ========================================
// PROFESSIONAL TRAINING SYSTEM
// ========================================

export const professionalTrainingLessons = pgTable("professional_training_lessons", {
  id: serial("id").primaryKey(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  lessonIndex: integer("lesson_index").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  duration: integer("duration").notNull().default(15),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfessionalTrainingLessonSchema = createInsertSchema(professionalTrainingLessons).omit({ id: true, createdAt: true });
export type InsertProfessionalTrainingLesson = z.infer<typeof insertProfessionalTrainingLessonSchema>;
export type ProfessionalTrainingLesson = typeof professionalTrainingLessons.$inferSelect;

export const professionalTrainingProgress = pgTable("professional_training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  lessonIndex: integer("lesson_index").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfessionalTrainingProgressSchema = createInsertSchema(professionalTrainingProgress).omit({ id: true, createdAt: true });
export type InsertProfessionalTrainingProgress = z.infer<typeof insertProfessionalTrainingProgressSchema>;
export type ProfessionalTrainingProgress = typeof professionalTrainingProgress.$inferSelect;

export const professionalTrainingQuizCache = pgTable("professional_training_quiz_cache", {
  id: serial("id").primaryKey(),
  topicId: varchar("topic_id", { length: 100 }).notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: serial("id").primaryKey(),
  stockCountId: integer("stock_count_id").notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(),
  itemId: integer("item_id").notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  expectedQuantity: varchar("expected_quantity", { length: 50 }).notNull().default("0"),
  countedQuantity: varchar("counted_quantity", { length: 50 }),
  unit: varchar("unit", { length: 20 }),
  difference: varchar("difference", { length: 50 }),
  notes: text("notes"),
}, (table) => [
  index("sci_count_idx").on(table.stockCountId),
]);

export const insertStockCountItemSchema = createInsertSchema(stockCountItems).omit({ id: true });
export type InsertStockCountItem = z.infer<typeof insertStockCountItemSchema>;
export type StockCountItem = typeof stockCountItems.$inferSelect;

// ========================================
// DASHBOARD WIDGET CONFIGURATION
// ========================================

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  widgetType: varchar("widget_type", { length: 50 }).notNull(),
  size: varchar("size", { length: 20 }).notNull().default("medium"),
  dataSource: varchar("data_source", { length: 100 }).notNull(),
  config: text("config"),
  roles: text("roles").array(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;

export const dashboardModuleVisibility = pgTable("dashboard_module_visibility", {
  id: serial("id").primaryKey(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  displayLocation: varchar("display_location", { length: 50 }).notNull().default("menu"),
  roles: text("roles").array(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDashboardModuleVisibilitySchema = createInsertSchema(dashboardModuleVisibility).omit({ id: true, updatedAt: true });
export type InsertDashboardModuleVisibility = z.infer<typeof insertDashboardModuleVisibilitySchema>;
export type DashboardModuleVisibility = typeof dashboardModuleVisibility.$inferSelect;

// Management Reports (Yönetim Raporları)
export const managementReports = pgTable("management_reports", {
  id: serial("id").primaryKey(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  revenue: numeric("revenue", { precision: 12, scale: 2 }),
  expenses: numeric("expenses", { precision: 12, scale: 2 }),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }),
  employeeCount: integer("employee_count"),
  customerCount: integer("customer_count"),
  averageTicket: numeric("average_ticket", { precision: 8, scale: 2 }),
  notes: text("notes"),
  aiAnalysis: text("ai_analysis"),
  status: varchar("status", { length: 20 }).default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManagementReportSchema = createInsertSchema(managementReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManagementReport = z.infer<typeof insertManagementReportSchema>;
export type ManagementReport = typeof managementReports.$inferSelect;

export const franchiseProjects = pgTable("franchise_projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  franchiseeName: varchar("franchisee_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  location: varchar("location", { length: 500 }),
  city: varchar("city", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("sozlesme"),
  currentPhase: integer("current_phase").default(1),
  totalPhases: integer("total_phases").default(7),
  completionPercentage: integer("completion_percentage").default(0),
  estimatedBudget: numeric("estimated_budget", { precision: 12, scale: 2 }),
  actualBudget: numeric("actual_budget", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  branchId: integer("branch_id").references(() => branches.id),
  managerId: varchar("manager_id").references(() => users.id),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_projects_status_idx").on(table.status),
]);

export const insertFranchiseProjectSchema = createInsertSchema(franchiseProjects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseProject = z.infer<typeof insertFranchiseProjectSchema>;
export type FranchiseProject = typeof franchiseProjects.$inferSelect;

export const franchiseProjectPhases = pgTable("franchise_project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  phaseNumber: integer("phase_number").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  completionPercentage: integer("completion_percentage").default(0),
  dependsOnPhaseId: integer("depends_on_phase_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("franchise_phases_project_idx").on(table.projectId),
]);

export const insertFranchiseProjectPhaseSchema = createInsertSchema(franchiseProjectPhases).omit({ id: true, createdAt: true });
export type InsertFranchiseProjectPhase = z.infer<typeof insertFranchiseProjectPhaseSchema>;
export type FranchiseProjectPhase = typeof franchiseProjectPhases.$inferSelect;

export const franchiseProjectTasks = pgTable("franchise_project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").notNull().references(() => franchiseProjectPhases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedToCollaboratorId: integer("assigned_to_collaborator_id"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  raciResponsible: varchar("raci_responsible", { length: 255 }),
  raciAccountable: varchar("raci_accountable", { length: 255 }),
  raciConsulted: varchar("raci_consulted", { length: 500 }),
  raciInformed: varchar("raci_informed", { length: 500 }),
  dependsOnTaskId: integer("depends_on_task_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_tasks_project_idx").on(table.projectId),
  index("franchise_tasks_phase_idx").on(table.phaseId),
]);

export const insertFranchiseProjectTaskSchema = createInsertSchema(franchiseProjectTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseProjectTask = z.infer<typeof insertFranchiseProjectTaskSchema>;
export type FranchiseProjectTask = typeof franchiseProjectTasks.$inferSelect;

export const franchiseCollaborators = pgTable("franchise_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  specialty: varchar("specialty", { length: 255 }),
  accessToken: varchar("access_token", { length: 255 }),
  isActive: boolean("is_active").default(true),
  invitedAt: timestamp("invited_at").defaultNow(),
  lastAccessAt: timestamp("last_access_at"),
  notes: text("notes"),
}, (table) => [
  index("franchise_collaborators_project_idx").on(table.projectId),
]);

export const insertFranchiseCollaboratorSchema = createInsertSchema(franchiseCollaborators).omit({ id: true, invitedAt: true, lastAccessAt: true });
export type InsertFranchiseCollaborator = z.infer<typeof insertFranchiseCollaboratorSchema>;
export type FranchiseCollaborator = typeof franchiseCollaborators.$inferSelect;

export const franchiseProjectComments = pgTable("franchise_project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => franchiseProjects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => franchiseProjectTasks.id, { onDelete: "cascade" }),
  authorUserId: varchar("author_user_id").references(() => users.id),
  authorCollaboratorId: integer("author_collaborator_id").references(() => franchiseCollaborators.id),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("franchise_comments_project_idx").on(table.projectId),
]);

export const insertFranchiseProjectCommentSchema = createInsertSchema(franchiseProjectComments).omit({ id: true, createdAt: true });
export type InsertFranchiseProjectComment = z.infer<typeof insertFranchiseProjectCommentSchema>;
export type FranchiseProjectComment = typeof franchiseProjectComments.$inferSelect;

// ========================================
// EQUIPMENT CATALOG (Merkez Ekipman Kataloğu)
// ========================================

export const equipmentCatalog = pgTable("equipment_catalog", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 200 }),
  model: varchar("model", { length: 200 }),
  imageUrl: text("image_url"),
  usageGuide: text("usage_guide"),
  calibrationProcedure: text("calibration_procedure"),
  calibrationIntervalDays: integer("calibration_interval_days"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(30),
  maintenanceGuide: text("maintenance_guide"),
  troubleshootSteps: jsonb("troubleshoot_steps").$type<Array<{
    order: number;
    title: string;
    description: string;
    requiresPhoto: boolean;
  }>>().default([]),
  tips: text("tips"),
  defaultServiceProviderName: varchar("default_service_provider_name", { length: 255 }),
  defaultServiceProviderPhone: varchar("default_service_provider_phone", { length: 50 }),
  defaultServiceProviderEmail: varchar("default_service_provider_email", { length: 255 }),
  defaultServiceProviderAddress: text("default_service_provider_address"),
  createdById: varchar("created_by_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("equipment_catalog_type_idx").on(table.equipmentType),
]);

export const insertEquipmentCatalogSchema = createInsertSchema(equipmentCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentCatalog = z.infer<typeof insertEquipmentCatalogSchema>;
export type EquipmentCatalog = typeof equipmentCatalog.$inferSelect;

// ========================================
// FAULT SERVICE TRACKING (Arıza Servis Takip)
// ========================================

export const FAULT_SERVICE_STATUS = {
  SERVIS_BEKLENIYOR: 'servis_bekleniyor',
  SERVISE_GONDERILECEK: 'servise_gonderilecek',
  SERVISE_GONDERILDI: 'servise_gonderildi',
  YEDEK_PARCA_BEKLENIYOR: 'yedek_parca_bekleniyor',
  SERVIS_TAMAMLANDI: 'servis_tamamlandi',
  TESLIM_ALINDI: 'teslim_alindi',
  KAPANDI: 'kapandi',
} as const;

export type FaultServiceStatusType = typeof FAULT_SERVICE_STATUS[keyof typeof FAULT_SERVICE_STATUS];

export const faultServiceTracking = pgTable("fault_service_tracking", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  equipmentId: integer("equipment_id").references(() => equipment.id, { onDelete: "set null" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  currentStatus: varchar("current_status", { length: 50 }).notNull().default(FAULT_SERVICE_STATUS.SERVIS_BEKLENIYOR),
  serviceContactedAt: timestamp("service_contacted_at"),
  serviceProviderName: varchar("service_provider_name", { length: 255 }),
  serviceProviderPhone: varchar("service_provider_phone", { length: 50 }),
  serviceProviderEmail: varchar("service_provider_email", { length: 255 }),
  serviceHandledBy: varchar("service_handled_by", { length: 20 }).default("branch"),
  estimatedCompletionDate: date("estimated_completion_date"),
  deliveryForm: jsonb("delivery_form").$type<{
    deviceConditionOnReturn: string;
    additionalDamages: string;
    reportedFaultResolved: boolean;
    deviceTested: boolean;
    testedByName: string;
    testedDate: string;
    serviceCost: number;
    isWarrantyCovered: boolean;
    warrantyNotes: string;
    receivedByName: string;
    receivedDate: string;
    photos: string[];
    notes: string;
  }>(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fault_service_tracking_fault_idx").on(table.faultId),
  index("fault_service_tracking_equipment_idx").on(table.equipmentId),
  index("fault_service_tracking_branch_idx").on(table.branchId),
  index("fault_service_tracking_status_idx").on(table.currentStatus),
]);

export const insertFaultServiceTrackingSchema = createInsertSchema(faultServiceTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFaultServiceTracking = z.infer<typeof insertFaultServiceTrackingSchema>;
export type FaultServiceTracking = typeof faultServiceTracking.$inferSelect;

// Fault Service Status Updates (yorum geçmişi)
export const faultServiceStatusUpdates = pgTable("fault_service_status_updates", {
  id: serial("id").primaryKey(),
  trackingId: integer("tracking_id").notNull().references(() => faultServiceTracking.id, { onDelete: "cascade" }),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  comment: text("comment"),
  attachmentUrl: text("attachment_url"),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fault_service_status_updates_tracking_idx").on(table.trackingId),
]);

export const insertFaultServiceStatusUpdateSchema = createInsertSchema(faultServiceStatusUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertFaultServiceStatusUpdate = z.infer<typeof insertFaultServiceStatusUpdateSchema>;
export type FaultServiceStatusUpdate = typeof faultServiceStatusUpdates.$inferSelect;

export const DEFAULT_FRANCHISE_PHASES = [
  { phaseNumber: 1, name: "Sozlesme ve Planlama", description: "Franchise sozlesmesi imzalanmasi, is plani hazirligi, fizibilite calismasi" },
  { phaseNumber: 2, name: "Mekan Secimi ve Kiralama", description: "Uygun lokasyon arastirmasi, kira sozlesmesi, imar durumu kontrolu" },
  { phaseNumber: 3, name: "Mimari Proje ve Tasarim", description: "Ic mekan tasarimi, dekorasyon projesi, DOSPRESSO marka standartlari uyumu" },
  { phaseNumber: 4, name: "Tadilat ve Insaat", description: "Mekan renovasyonu, altyapi islemleri, elektrik-tesisat, mobilya uretim" },
  { phaseNumber: 5, name: "Ekipman Kurulum", description: "Kahve makineleri, sogutma uniteleri, kasa sistemi, POS entegrasyonu" },
  { phaseNumber: 6, name: "Personel Alim ve Egitim", description: "Kadro olusturma, DOSPRESSO Akademi egitimi, staj donemi" },
  { phaseNumber: 7, name: "Acilis Oncesi ve Acilis", description: "Son kontroller, test servisleri, resmi acilis, marketing kampanyasi" },
];

// ========================================
// INVENTORY COUNTING SCHEMA
// ========================================

export const inventoryCountStatusEnum = ["planned", "in_progress", "counting", "review", "completed", "overdue"] as const;
export type InventoryCountStatus = typeof inventoryCountStatusEnum[number];

export const inventoryCounts = pgTable("inventory_counts", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  countType: varchar("count_type", { length: 30 }).notNull().default("tam_sayim"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("planned"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inv_count_month_year_idx").on(table.month, table.year),
  index("inv_count_status_idx").on(table.status),
]);

export const insertInventoryCountSchema = createInsertSchema(inventoryCounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInventoryCount = z.infer<typeof insertInventoryCountSchema>;
export type InventoryCount = typeof inventoryCounts.$inferSelect;

export const inventoryCountAssignments = pgTable("inventory_count_assignments", {
  id: serial("id").primaryKey(),
  countId: integer("count_id").references(() => inventoryCounts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  counter1Id: varchar("counter_1_id").references(() => users.id, { onDelete: "set null" }),
  counter2Id: varchar("counter_2_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_count_assign_count_idx").on(table.countId),
  index("inv_count_assign_inv_idx").on(table.inventoryId),
]);

export const insertInventoryCountAssignmentSchema = createInsertSchema(inventoryCountAssignments).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryCountAssignment = z.infer<typeof insertInventoryCountAssignmentSchema>;
export type InventoryCountAssignment = typeof inventoryCountAssignments.$inferSelect;

export const inventoryCountEntries = pgTable("inventory_count_entries", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => inventoryCountAssignments.id, { onDelete: "cascade" }).notNull(),
  counterId: varchar("counter_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  countedQuantity: numeric("counted_quantity", { precision: 12, scale: 3 }).notNull(),
  systemQuantity: numeric("system_quantity", { precision: 12, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 12, scale: 3 }).notNull(),
  isRecount: boolean("is_recount").default(false),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  countedAt: timestamp("counted_at").defaultNow(),
}, (table) => [
  index("inv_count_entry_assign_idx").on(table.assignmentId),
  index("inv_count_entry_counter_idx").on(table.counterId),
]);

export const insertInventoryCountEntrySchema = createInsertSchema(inventoryCountEntries).omit({
  id: true,
  countedAt: true,
});
export type InsertInventoryCountEntry = z.infer<typeof insertInventoryCountEntrySchema>;
export type InventoryCountEntry = typeof inventoryCountEntries.$inferSelect;

// ========================================
// FACTORY MANAGEMENT SCORES SCHEMA
// ========================================

export const factoryManagementScores = pgTable("factory_management_scores", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  inventoryCountScore: integer("inventory_count_score").default(100),
  wasteScore: integer("waste_score").default(100),
  productionErrorScore: integer("production_error_score").default(100),
  wrongProductionScore: integer("wrong_production_score").default(100),
  branchComplaintScore: integer("branch_complaint_score").default(100),
  overallScore: integer("overall_score").default(100),
  wasteCount: integer("waste_count").default(0),
  productionErrorCount: integer("production_error_count").default(0),
  wrongProductionCount: integer("wrong_production_count").default(0),
  branchComplaintCount: integer("branch_complaint_count").default(0),
  inventoryCountCompleted: boolean("inventory_count_completed").default(false),
  inventoryCountOnTime: boolean("inventory_count_on_time").default(false),
  notes: text("notes"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_mgmt_score_month_idx").on(table.month, table.year),
]);

export const insertFactoryManagementScoreSchema = createInsertSchema(factoryManagementScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFactoryManagementScore = z.infer<typeof insertFactoryManagementScoreSchema>;
export type FactoryManagementScore = typeof factoryManagementScores.$inferSelect;

// ========================================
// TEDARİKÇİ PERFORMANS PUANLAMA
// ========================================

export const supplierPerformanceScores = pgTable("supplier_performance_scores", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  deliveryScore: numeric("delivery_score", { precision: 5, scale: 2 }).default("0"),
  pricePerformanceScore: numeric("price_performance_score", { precision: 5, scale: 2 }).default("0"),
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }).default("0"),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  onTimeDeliveries: integer("on_time_deliveries").default(0),
  lateDeliveries: integer("late_deliveries").default(0),
  avgDeliveryDays: numeric("avg_delivery_days", { precision: 5, scale: 1 }).default("0"),
  returnCount: integer("return_count").default(0),
  complaintCount: integer("complaint_count").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sup_perf_supplier_idx").on(table.supplierId),
  index("sup_perf_month_year_idx").on(table.month, table.year),
]);

export const insertSupplierPerformanceScoreSchema = createInsertSchema(supplierPerformanceScores).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierPerformanceScore = z.infer<typeof insertSupplierPerformanceScoreSchema>;
export type SupplierPerformanceScore = typeof supplierPerformanceScores.$inferSelect;

// ========================================
// SAYIM TUTARSIZLIK RAPORLARI
// ========================================

export const inventoryCountReports = pgTable("inventory_count_reports", {
  id: serial("id").primaryKey(),
  countId: integer("count_id").references(() => inventoryCounts.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  systemQuantity: numeric("system_quantity", { precision: 12, scale: 3 }).notNull(),
  countedQuantity: numeric("counted_quantity", { precision: 12, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 12, scale: 3 }).notNull(),
  differencePercent: numeric("difference_percent", { precision: 5, scale: 2 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("low"),
  notifiedRoles: text("notified_roles").array(),
  actionTaken: text("action_taken"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inv_report_count_idx").on(table.countId),
  index("inv_report_severity_idx").on(table.severity),
]);

export const insertInventoryCountReportSchema = createInsertSchema(inventoryCountReports).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryCountReport = z.infer<typeof insertInventoryCountReportSchema>;
export type InventoryCountReport = typeof inventoryCountReports.$inferSelect;

// ========================================
// DASHBOARD WIDGET ITEMS
// ========================================

export const dashboardWidgetItems = pgTable("dashboard_widget_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  type: varchar("type", { length: 50 }).notNull().default("link"),
  icon: varchar("icon", { length: 100 }),
  url: varchar("url", { length: 500 }),
  targetRoles: text("target_roles").array().notNull().default(sql`'{}'::text[]`),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDashboardWidgetItemSchema = createInsertSchema(dashboardWidgetItems).omit({ id: true, createdAt: true });
export type InsertDashboardWidgetItem = z.infer<typeof insertDashboardWidgetItemSchema>;
export type DashboardWidgetItem = typeof dashboardWidgetItems.$inferSelect;

// ========================================
// FINANCIAL RECORDS - Gelir/Gider Kayıtları
// ========================================

export const financialRecords = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  recordDate: timestamp("record_date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'gelir' or 'gider'
  category: varchar("category", { length: 100 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  invoiceNo: varchar("invoice_no", { length: 100 }),
  status: varchar("status", { length: 20 }).default("onaylandi"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fin_record_branch_idx").on(table.branchId),
  index("fin_record_date_idx").on(table.recordDate),
  index("fin_record_type_idx").on(table.type),
  index("fin_record_month_year_idx").on(table.month, table.year),
]);

export const insertFinancialRecordSchema = createInsertSchema(financialRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialRecord = z.infer<typeof insertFinancialRecordSchema>;
export type FinancialRecord = typeof financialRecords.$inferSelect;

// ========================================
// SALARY SCALES - Maaş & Prim Tablosu
// ========================================

export const salaryScales = pgTable("salary_scales", {
  id: serial("id").primaryKey(),
  locationType: varchar("location_type", { length: 20 }).notNull(), // 'sube' or 'fabrika'
  positionName: varchar("position_name", { length: 100 }).notNull(),
  level: integer("level").notNull(), // ordering/display level
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }).notNull(), // temel maaş
  cashRegisterBonus: numeric("cash_register_bonus", { precision: 12, scale: 2 }).default("0"), // kasa primi (only branches)
  performanceBonus: numeric("performance_bonus", { precision: 12, scale: 2 }).notNull(), // performans primi
  bonusCalculationType: varchar("bonus_calculation_type", { length: 20 }).notNull().default("per_day"), // 'per_day' or 'full'
  totalSalary: numeric("total_salary", { precision: 12, scale: 2 }).notNull(), // toplam
  isActive: boolean("is_active").default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("salary_scale_type_idx").on(table.locationType),
  index("salary_scale_level_idx").on(table.level),
]);

export const insertSalaryScaleSchema = createInsertSchema(salaryScales).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalaryScale = z.infer<typeof insertSalaryScaleSchema>;
export type SalaryScale = typeof salaryScales.$inferSelect;

// ========================================
// SUPPLIER QUOTES - Tedarikçi Fiyat Teklifleri
// ========================================

export const supplierQuotes = pgTable("supplier_quotes", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  minimumOrderQuantity: numeric("minimum_order_quantity", { precision: 12, scale: 3 }).default("1"),
  leadTimeDays: integer("lead_time_days").default(3),
  validUntil: timestamp("valid_until"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  shippingResponsibility: varchar("shipping_responsibility", { length: 50 }).default("tedarikci"),
  paymentTermDays: integer("payment_term_days").default(30),
  hasInstallments: boolean("has_installments").default(false),
  qualityScore: numeric("quality_score", { precision: 3, scale: 1 }),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("aktif").notNull(),
  requestedById: varchar("requested_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sq_inventory_idx").on(table.inventoryId),
  index("sq_supplier_idx").on(table.supplierId),
  index("sq_status_idx").on(table.status),
]);

export const insertSupplierQuoteSchema = createInsertSchema(supplierQuotes).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierQuote = z.infer<typeof insertSupplierQuoteSchema>;
export type SupplierQuote = typeof supplierQuotes.$inferSelect;

// ========================================
// SUPPLIER ISSUES - Tedarikçi Sorunları
// ========================================

export const supplierIssues = pgTable("supplier_issues", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id, { onDelete: "set null" }),
  issueType: varchar("issue_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("orta").notNull(),
  description: text("description").notNull(),
  resolution: text("resolution"),
  status: varchar("status", { length: 30 }).default("acik").notNull(),
  reportedById: varchar("reported_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("si_supplier_idx").on(table.supplierId),
  index("si_inventory_idx").on(table.inventoryId),
  index("si_status_idx").on(table.status),
]);

export const insertSupplierIssueSchema = createInsertSchema(supplierIssues).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplierIssue = z.infer<typeof insertSupplierIssueSchema>;
export type SupplierIssue = typeof supplierIssues.$inferSelect;

// ========================================
// PURCHASE ORDER PAYMENTS - Sipariş Ödemeleri
// ========================================

export const purchaseOrderPayments = pgTable("purchase_order_payments", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceDate: timestamp("invoice_date"),
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("havale"),
  status: varchar("status", { length: 30 }).default("beklemede").notNull(),
  notes: text("notes"),
  processedById: varchar("processed_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pop_order_idx").on(table.purchaseOrderId),
  index("pop_status_idx").on(table.status),
]);

export const insertPurchaseOrderPaymentSchema = createInsertSchema(purchaseOrderPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseOrderPayment = z.infer<typeof insertPurchaseOrderPaymentSchema>;
export type PurchaseOrderPayment = typeof purchaseOrderPayments.$inferSelect;

// ==========================================
// FOOD SAFETY (GIDA GÜVENLİĞİ) TABLES
// ==========================================

export const haccpControlPoints = pgTable("haccp_control_points", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  controlPointName: varchar("control_point_name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  hazardType: varchar("hazard_type", { length: 50 }).notNull(),
  criticalLimit: varchar("critical_limit", { length: 200 }).notNull(),
  monitoringMethod: varchar("monitoring_method", { length: 200 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  correctiveAction: text("corrective_action").notNull(),
  responsibleRole: varchar("responsible_role", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("haccp_cp_branch_idx").on(table.branchId),
  index("haccp_cp_category_idx").on(table.category),
]);

export const insertHaccpControlPointSchema = createInsertSchema(haccpControlPoints).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHaccpControlPoint = z.infer<typeof insertHaccpControlPointSchema>;
export type HaccpControlPoint = typeof haccpControlPoints.$inferSelect;

export const haccpRecords = pgTable("haccp_records", {
  id: serial("id").primaryKey(),
  controlPointId: integer("control_point_id").references(() => haccpControlPoints.id, { onDelete: "cascade" }).notNull(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  recordedById: varchar("recorded_by_id").references(() => users.id).notNull(),
  measuredValue: varchar("measured_value", { length: 100 }).notNull(),
  isWithinLimits: boolean("is_within_limits").notNull(),
  deviationNote: text("deviation_note"),
  correctiveActionTaken: text("corrective_action_taken"),
  photoUrl: text("photo_url"),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("haccp_rec_cp_idx").on(table.controlPointId),
  index("haccp_rec_branch_idx").on(table.branchId),
  index("haccp_rec_date_idx").on(table.recordedAt),
]);

export const insertHaccpRecordSchema = createInsertSchema(haccpRecords).omit({ id: true, recordedAt: true });
export type InsertHaccpRecord = z.infer<typeof insertHaccpRecordSchema>;
export type HaccpRecord = typeof haccpRecords.$inferSelect;

export const hygieneAudits = pgTable("hygiene_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  auditorId: varchar("auditor_id").references(() => users.id).notNull(),
  auditDate: timestamp("audit_date").notNull(),
  overallScore: integer("overall_score").notNull().default(0),
  handHygieneScore: integer("hand_hygiene_score").default(0),
  surfaceCleanlinessScore: integer("surface_cleanliness_score").default(0),
  equipmentHygieneScore: integer("equipment_hygiene_score").default(0),
  personalHygieneScore: integer("personal_hygiene_score").default(0),
  wasteManagementScore: integer("waste_management_score").default(0),
  pestControlScore: integer("pest_control_score").default(0),
  storageConditionsScore: integer("storage_conditions_score").default(0),
  findings: text("findings"),
  recommendations: text("recommendations"),
  photoUrls: text("photo_urls").array(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hygiene_audit_branch_idx").on(table.branchId),
  index("hygiene_audit_date_idx").on(table.auditDate),
]);

export const insertHygieneAuditSchema = createInsertSchema(hygieneAudits, {
  auditDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({ id: true, createdAt: true, auditorId: true });
export type InsertHygieneAudit = z.infer<typeof insertHygieneAuditSchema>;
export type HygieneAudit = typeof hygieneAudits.$inferSelect;

export const supplierCertifications = pgTable("supplier_certifications", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  certificationType: varchar("certification_type", { length: 100 }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  issuedBy: varchar("issued_by", { length: 200 }),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date").notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  documentUrl: text("document_url"),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("supp_cert_supplier_idx").on(table.supplierId),
  index("supp_cert_expiry_idx").on(table.expiryDate),
  index("supp_cert_status_idx").on(table.status),
]);

export const insertSupplierCertificationSchema = createInsertSchema(supplierCertifications, {
  issuedDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  expiryDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({ id: true, createdAt: true });
export type InsertSupplierCertification = z.infer<typeof insertSupplierCertificationSchema>;
export type SupplierCertification = typeof supplierCertifications.$inferSelect;

export const foodSafetyTrainings = pgTable("food_safety_trainings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  trainerId: varchar("trainer_id").references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  targetRole: varchar("target_role", { length: 50 }),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  duration: integer("duration"),
  attendeeCount: integer("attendee_count").default(0),
  maxAttendees: integer("max_attendees"),
  status: varchar("status", { length: 30 }).default("scheduled").notNull(),
  materials: text("materials"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fst_branch_idx").on(table.branchId),
  index("fst_status_idx").on(table.status),
  index("fst_date_idx").on(table.scheduledDate),
]);

export const insertFoodSafetyTrainingSchema = createInsertSchema(foodSafetyTrainings, {
  scheduledDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  completedDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
}).omit({ id: true, createdAt: true });
export type InsertFoodSafetyTraining = z.infer<typeof insertFoodSafetyTrainingSchema>;
export type FoodSafetyTraining = typeof foodSafetyTrainings.$inferSelect;

export const foodSafetyDocuments = pgTable("food_safety_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  fileUrl: text("file_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fsd_category_idx").on(table.category),
  index("fsd_type_idx").on(table.documentType),
]);

export const insertFoodSafetyDocumentSchema = createInsertSchema(foodSafetyDocuments, {
  effectiveDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  reviewDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFoodSafetyDocument = z.infer<typeof insertFoodSafetyDocumentSchema>;
export type FoodSafetyDocument = typeof foodSafetyDocuments.$inferSelect;

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  mode: varchar("mode", { length: 30 }).notNull().default("append"),
  matchKey: varchar("match_key", { length: 30 }).default("username"),
  scope: varchar("scope", { length: 30 }),
  fileName: varchar("file_name", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalRows: integer("total_rows").default(0),
  createdCount: integer("created_count").default(0),
  updatedCount: integer("updated_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  errorCount: integer("error_count").default(0),
  deactivatedCount: integer("deactivated_count").default(0),
  summaryJson: text("summary_json"),
  rolledBackAt: timestamp("rolled_back_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("import_batch_user_idx").on(table.createdByUserId),
  index("import_batch_status_idx").on(table.status),
]);

export type ImportBatch = typeof importBatches.$inferSelect;

export const importResults = pgTable("import_results", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  employeeId: varchar("employee_id"),
  message: text("message"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
}, (table) => [
  index("import_result_batch_idx").on(table.batchId),
  index("import_result_employee_idx").on(table.employeeId),
]);

export type ImportResult = typeof importResults.$inferSelect;

export const taskTriggers = pgTable("task_triggers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  roleCode: varchar("role_code", { length: 50 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  branchType: varchar("branch_type", { length: 50 }),
  appliesToAllBranches: boolean("applies_to_all_branches").default(true),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  dueOffsetMinutes: integer("due_offset_minutes").default(480),
  requiredEvidenceType: varchar("required_evidence_type", { length: 20 }).notNull().default("none"),
  template: text("template").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("task_triggers_role_idx").on(table.roleCode),
  index("task_triggers_scope_idx").on(table.scope),
  index("task_triggers_active_idx").on(table.isActive),
]);

export const insertTaskTriggerSchema = createInsertSchema(taskTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskTrigger = z.infer<typeof insertTaskTriggerSchema>;
export type TaskTrigger = typeof taskTriggers.$inferSelect;

export const opsRules = pgTable("ops_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  severity: varchar("severity", { length: 10 }).notNull(),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  conditionJson: text("condition_json").notNull(),
  messageJson: text("message_json").notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ops_rules_scope_idx").on(table.scope),
  index("ops_rules_active_idx").on(table.isActive),
  index("ops_rules_entity_idx").on(table.entityType),
]);

export const insertOpsRuleSchema = createInsertSchema(opsRules).omit({
  id: true,
  createdAt: true,
});

export type InsertOpsRule = z.infer<typeof insertOpsRuleSchema>;
export type OpsRule = typeof opsRules.$inferSelect;

export const taskEvidence = pgTable("task_evidence", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  submittedByUserId: varchar("submitted_by_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  payloadJson: text("payload_json"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  reviewedByUserId: varchar("reviewed_by_user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_evidence_task_idx").on(table.taskId),
  index("task_evidence_status_idx").on(table.status),
  index("task_evidence_submitted_by_idx").on(table.submittedByUserId),
]);

export const insertTaskEvidenceSchema = createInsertSchema(taskEvidence).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskEvidence = z.infer<typeof insertTaskEvidenceSchema>;
export type TaskEvidence = typeof taskEvidence.$inferSelect;

// ========================================
// WASTE / ZAI-FIRE MANAGEMENT
// ========================================

export const wasteCategories = pgTable("waste_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameTr: varchar("name_tr", { length: 150 }).notNull(),
  nameEn: varchar("name_en", { length: 150 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWasteCategorySchema = createInsertSchema(wasteCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteCategory = z.infer<typeof insertWasteCategorySchema>;
export type WasteCategory = typeof wasteCategories.$inferSelect;

export const wasteReasons = pgTable("waste_reasons", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => wasteCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 80 }).notNull(),
  nameTr: varchar("name_tr", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("waste_reasons_category_idx").on(table.categoryId),
]);

export const insertWasteReasonSchema = createInsertSchema(wasteReasons).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteReason = z.infer<typeof insertWasteReasonSchema>;
export type WasteReason = typeof wasteReasons.$inferSelect;

export const WasteResponsibilityScope = {
  DEMAND: "demand",
  MERCHANDISING: "merchandising",
  MARKETING: "marketing",
  RECIPE_QUALITY: "recipe_quality",
  PRODUCTION_DEFECT: "production_defect",
  PREP_ERROR: "prep_error",
  LOGISTICS_COLD_CHAIN: "logistics_cold_chain",
  STORAGE: "storage",
  EXPIRY: "expiry",
  UNKNOWN: "unknown",
} as const;

export type WasteResponsibilityScopeType = typeof WasteResponsibilityScope[keyof typeof WasteResponsibilityScope];

export const WasteEventStatus = {
  OPEN: "open",
  CONFIRMED: "confirmed",
  RESOLVED: "resolved",
} as const;

export type WasteEventStatusType = typeof WasteEventStatus[keyof typeof WasteEventStatus];

export const wasteEvents = pgTable("waste_events", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  eventTs: timestamp("event_ts").notNull().defaultNow(),
  productId: integer("product_id"),
  productGroup: varchar("product_group", { length: 100 }),
  recipeRef: varchar("recipe_ref", { length: 100 }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("adet"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  categoryId: integer("category_id").notNull().references(() => wasteCategories.id),
  reasonId: integer("reason_id").notNull().references(() => wasteReasons.id),
  responsibilityScope: varchar("responsibility_scope", { length: 30 }).default("unknown"),
  notes: text("notes"),
  evidencePhotos: jsonb("evidence_photos").default([]),
  lotId: varchar("lot_id", { length: 100 }),
  supplierBatch: varchar("supplier_batch", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("waste_events_branch_idx").on(table.branchId),
  index("waste_events_category_idx").on(table.categoryId),
  index("waste_events_reason_idx").on(table.reasonId),
  index("waste_events_status_idx").on(table.status),
  index("waste_events_event_ts_idx").on(table.eventTs),
  index("waste_events_lot_idx").on(table.lotId),
  index("waste_events_created_by_idx").on(table.createdByUserId),
]);

export const insertWasteEventSchema = createInsertSchema(wasteEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWasteEvent = z.infer<typeof insertWasteEventSchema>;
export type WasteEvent = typeof wasteEvents.$inferSelect;

export const WasteLotQcStatus = {
  PENDING: "pending",
  PASSED: "passed",
  FAILED: "failed",
  UNDER_REVIEW: "under_review",
} as const;

export type WasteLotQcStatusType = typeof WasteLotQcStatus[keyof typeof WasteLotQcStatus];

export const wasteLots = pgTable("waste_lots", {
  id: serial("id").primaryKey(),
  lotId: varchar("lot_id", { length: 100 }).notNull(),
  productId: integer("product_id"),
  productName: varchar("product_name", { length: 200 }),
  productionDate: timestamp("production_date"),
  expiryDate: timestamp("expiry_date"),
  qcStatus: varchar("qc_status", { length: 20 }).notNull().default("pending"),
  qcNotes: text("qc_notes"),
  evidencePhotos: jsonb("evidence_photos").default([]),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("waste_lots_lot_id_idx").on(table.lotId),
  index("waste_lots_qc_status_idx").on(table.qcStatus),
  index("waste_lots_product_idx").on(table.productId),
]);

export const insertWasteLotSchema = createInsertSchema(wasteLots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWasteLot = z.infer<typeof insertWasteLotSchema>;
export type WasteLot = typeof wasteLots.$inferSelect;

export const wasteActionLinks = pgTable("waste_action_links", {
  id: serial("id").primaryKey(),
  wasteEventId: integer("waste_event_id").notNull().references(() => wasteEvents.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  auditLogId: integer("audit_log_id").references(() => auditLogs.id, { onDelete: "set null" }),
  linkType: varchar("link_type", { length: 30 }).notNull().default("task"),
  notes: text("notes"),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("waste_action_links_event_idx").on(table.wasteEventId),
  index("waste_action_links_task_idx").on(table.taskId),
])

export const insertWasteActionLinkSchema = createInsertSchema(wasteActionLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteActionLink = z.infer<typeof insertWasteActionLinkSchema>;
export type WasteActionLink = typeof wasteActionLinks.$inferSelect;

// =============================================
// GUIDE DOCS (Kılavuz Dokümanları)
// =============================================
export const guideDocs = pgTable("guide_docs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  targetRoles: text("target_roles").array().default([]),
  scope: varchar("scope", { length: 50 }).default("all"),
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("guide_docs_slug_idx").on(table.slug),
  index("guide_docs_category_idx").on(table.category),
]);

export const insertGuideDocSchema = createInsertSchema(guideDocs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuideDoc = z.infer<typeof insertGuideDocSchema>;
export type GuideDoc = typeof guideDocs.$inferSelect;

// =============================================
// ONBOARDING V2: Programs + Weeks + Instances + Checkins
// =============================================
export const onboardingPrograms = pgTable("onboarding_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetRole: varchar("target_role", { length: 50 }).notNull(),
  durationWeeks: integer("duration_weeks").notNull().default(4),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOnboardingProgramSchema = createInsertSchema(onboardingPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingProgram = z.infer<typeof insertOnboardingProgramSchema>;
export type OnboardingProgram = typeof onboardingPrograms.$inferSelect;

export const onboardingWeeks = pgTable("onboarding_weeks", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  goals: text("goals").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_weeks_program_idx").on(table.programId),
]);

export const insertOnboardingWeekSchema = createInsertSchema(onboardingWeeks).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingWeek = z.infer<typeof insertOnboardingWeekSchema>;
export type OnboardingWeek = typeof onboardingWeeks.$inferSelect;

export const onboardingInstances = pgTable("onboarding_instances", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  traineeId: integer("trainee_id").notNull(),
  mentorId: integer("mentor_id"),
  branchId: integer("branch_id"),
  status: varchar("status", { length: 30 }).default("active"),
  startDate: timestamp("start_date").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_instances_trainee_idx").on(table.traineeId),
  index("onboarding_instances_mentor_idx").on(table.mentorId),
  index("onboarding_instances_program_idx").on(table.programId),
]);

export const insertOnboardingInstanceSchema = createInsertSchema(onboardingInstances).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export type InsertOnboardingInstance = z.infer<typeof insertOnboardingInstanceSchema>;
export type OnboardingInstance = typeof onboardingInstances.$inferSelect;

export const onboardingCheckins = pgTable("onboarding_checkins", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  mentorId: integer("mentor_id").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  strengths: text("strengths"),
  areasToImprove: text("areas_to_improve"),
  checkinDate: timestamp("checkin_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_checkins_instance_idx").on(table.instanceId),
  index("onboarding_checkins_week_idx").on(table.weekNumber),
]);

export const insertOnboardingCheckinSchema = createInsertSchema(onboardingCheckins).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingCheckin = z.infer<typeof insertOnboardingCheckinSchema>;
export type OnboardingCheckin = typeof onboardingCheckins.$inferSelect;

// ========================================
// ACADEMY V2 - GATE SYSTEM & CONTENT PACKS
// ========================================

export const careerGates = pgTable("career_gates", {
  id: serial("id").primaryKey(),
  gateNumber: integer("gate_number").notNull(),
  fromLevelId: integer("from_level_id").references(() => careerLevels.id),
  toLevelId: integer("to_level_id").references(() => careerLevels.id),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  quizId: integer("quiz_id").references(() => quizzes.id),
  quizPassingScore: integer("quiz_passing_score").default(80),
  practicalChecklist: jsonb("practical_checklist").$type<Array<{item: string; weight: number}>>().default([]),
  practicalApprover: varchar("practical_approver", { length: 50 }).default("supervisor"),
  kpiRules: jsonb("kpi_rules").$type<Array<{metric: string; max: number; period_days: number}>>().default([]),
  minAttendanceRate: integer("min_attendance_rate").default(90),
  attendancePeriodDays: integer("attendance_period_days").default(30),
  minDaysInLevel: integer("min_days_in_level").default(30),
  retryCooldownDays: integer("retry_cooldown_days").default(7),
  maxRetries: integer("max_retries").default(3),
  requiresSupervisor: boolean("requires_supervisor").default(true),
  requiresCoach: boolean("requires_coach").default(true),
  requiresCgo: boolean("requires_cgo").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("career_gates_gate_number_idx").on(table.gateNumber),
  index("career_gates_active_idx").on(table.isActive),
]);

export const insertCareerGateSchema = createInsertSchema(careerGates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCareerGate = z.infer<typeof insertCareerGateSchema>;
export type CareerGate = typeof careerGates.$inferSelect;

export const gateAttempts = pgTable("gate_attempts", {
  id: serial("id").primaryKey(),
  gateId: integer("gate_id").notNull().references(() => careerGates.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed"),
  practicalScore: integer("practical_score"),
  practicalPassed: boolean("practical_passed"),
  practicalApprovedBy: varchar("practical_approved_by").references(() => users.id),
  kpiScore: integer("kpi_score"),
  kpiPassed: boolean("kpi_passed"),
  kpiDetails: jsonb("kpi_details").$type<Record<string, number>>(),
  attendanceRate: integer("attendance_rate"),
  attendancePassed: boolean("attendance_passed"),
  overallPassed: boolean("overall_passed").notNull().default(false),
  overallScore: integer("overall_score"),
  status: varchar("status", { length: 20 }).default("in_progress"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  nextRetryAt: timestamp("next_retry_at"),
  supervisorApproved: boolean("supervisor_approved").default(false),
  coachApproved: boolean("coach_approved").default(false),
  cgoApproved: boolean("cgo_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("gate_attempts_gate_idx").on(table.gateId),
  index("gate_attempts_user_idx").on(table.userId),
  index("gate_attempts_status_idx").on(table.status),
]);

export const insertGateAttemptSchema = createInsertSchema(gateAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertGateAttempt = z.infer<typeof insertGateAttemptSchema>;
export type GateAttempt = typeof gateAttempts.$inferSelect;

export const kpiSignalRules = pgTable("kpi_signal_rules", {
  id: serial("id").primaryKey(),
  signalKey: varchar("signal_key", { length: 50 }).notNull().unique(),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  metricSource: varchar("metric_source", { length: 50 }).notNull(),
  metricTable: varchar("metric_table", { length: 100 }),
  thresholdType: varchar("threshold_type", { length: 20 }).default("above"),
  thresholdValue: real("threshold_value").notNull(),
  evaluationPeriodDays: integer("evaluation_period_days").default(30),
  recommendedModuleId: integer("recommended_module_id").references(() => trainingModules.id),
  recommendedAction: varchar("recommended_action", { length: 100 }),
  targetRoles: text("target_roles").array().default(sql`ARRAY['barista', 'bar_buddy', 'stajyer']::text[]`),
  notifyRoles: text("notify_roles").array().default(sql`ARRAY['coach']::text[]`),
  severity: varchar("severity", { length: 20 }).default("warning"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kpi_signal_rules_key_idx").on(table.signalKey),
  index("kpi_signal_rules_active_idx").on(table.isActive),
]);

export const insertKpiSignalRuleSchema = createInsertSchema(kpiSignalRules).omit({
  id: true,
  createdAt: true,
});

export type InsertKpiSignalRule = z.infer<typeof insertKpiSignalRuleSchema>;
export type KpiSignalRule = typeof kpiSignalRules.$inferSelect;

export const contentPacks = pgTable("content_packs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  targetRole: varchar("target_role", { length: 50 }).notNull(),
  packType: varchar("pack_type", { length: 30 }).default("onboarding"),
  durationDays: integer("duration_days"),
  isMandatory: boolean("is_mandatory").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_packs_role_idx").on(table.targetRole),
  index("content_packs_type_idx").on(table.packType),
  index("content_packs_active_idx").on(table.isActive),
]);

export const insertContentPackSchema = createInsertSchema(contentPacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentPack = z.infer<typeof insertContentPackSchema>;
export type ContentPack = typeof contentPacks.$inferSelect;

export const contentPackItems = pgTable("content_pack_items", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => contentPacks.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number"),
  sortOrder: integer("sort_order").notNull().default(1),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  trainingModuleId: integer("training_module_id").references(() => trainingModules.id),
  quizId: integer("quiz_id").references(() => quizzes.id),
  recipeId: integer("recipe_id"),
  titleOverride: varchar("title_override", { length: 200 }),
  isRequired: boolean("is_required").default(true),
  estimatedMinutes: integer("estimated_minutes").default(15),
  passingScore: integer("passing_score").default(70),
  requiresApproval: boolean("requires_approval").default(false),
  approverRole: varchar("approver_role", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_pack_items_pack_idx").on(table.packId),
  index("content_pack_items_day_idx").on(table.dayNumber),
  index("content_pack_items_order_idx").on(table.sortOrder),
]);

export const insertContentPackItemSchema = createInsertSchema(contentPackItems).omit({
  id: true,
  createdAt: true,
});

export type InsertContentPackItem = z.infer<typeof insertContentPackItemSchema>;
export type ContentPackItem = typeof contentPackItems.$inferSelect;

export const userPackProgress = pgTable("user_pack_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packId: integer("pack_id").notNull().references(() => contentPacks.id),
  packItemId: integer("pack_item_id").notNull().references(() => contentPackItems.id),
  status: varchar("status", { length: 20 }).default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_pack_progress_user_idx").on(table.userId),
  index("user_pack_progress_pack_idx").on(table.packId),
  index("user_pack_progress_item_idx").on(table.packItemId),
  index("user_pack_progress_status_idx").on(table.status),
]);

export const aiAgentLogs = pgTable("ai_agent_logs", {
  id: serial("id").primaryKey(),
  runType: varchar("run_type", { length: 50 }).notNull(),
  triggeredByUserId: varchar("triggered_by_user_id", { length: 255 }),
  targetRoleScope: varchar("target_role_scope", { length: 30 }).notNull(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  branchId: integer("branch_id"),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  actionCount: integer("action_count").default(0),
  status: varchar("status", { length: 20 }).default("success"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ai_agent_logs_type_idx").on(table.runType),
  index("ai_agent_logs_scope_idx").on(table.targetRoleScope),
  index("ai_agent_logs_created_idx").on(table.createdAt),
]);

export const insertAiAgentLogSchema = createInsertSchema(aiAgentLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiAgentLog = z.infer<typeof insertAiAgentLogSchema>;
export type AiAgentLog = typeof aiAgentLogs.$inferSelect;

// ==================== AI Data Domains & Policies ====================

export const aiDataDomains = pgTable("ai_data_domains", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(),
  labelTr: varchar("label_tr", { length: 100 }).notNull(),
  labelEn: varchar("label_en", { length: 100 }).notNull(),
  description: text("description"),
  sensitivity: varchar("sensitivity", { length: 20 }).notNull().default("internal"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiDomainPolicies = pgTable("ai_domain_policies", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => aiDataDomains.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  employeeType: varchar("employee_type", { length: 50 }),
  decision: varchar("decision", { length: 30 }).notNull().default("DENY"),
  scope: varchar("scope", { length: 20 }).notNull().default("org_wide"),
  redactionMode: varchar("redaction_mode", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ai_policy_domain_idx").on(table.domainId),
  index("ai_policy_role_idx").on(table.role),
]);

export const insertAiDataDomainSchema = createInsertSchema(aiDataDomains).omit({
  id: true,
  createdAt: true,
});

export const insertAiDomainPolicySchema = createInsertSchema(aiDomainPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiDataDomain = z.infer<typeof insertAiDataDomainSchema>;
export type AiDataDomain = typeof aiDataDomains.$inferSelect;
export type InsertAiDomainPolicy = z.infer<typeof insertAiDomainPolicySchema>;
export type AiDomainPolicy = typeof aiDomainPolicies.$inferSelect;

// ==================== Employee Types & Policies (P1 Role Registry) ====================

export const employeeTypes = pgTable("employee_types", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  allowedGroups: jsonb("allowed_groups").$type<string[]>().default([]),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeTypePolicies = pgTable("employee_type_policies", {
  id: serial("id").primaryKey(),
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id, { onDelete: "cascade" }).notNull(),
  policyKey: varchar("policy_key", { length: 100 }).notNull(),
  policyJson: jsonb("policy_json").$type<Record<string, any>>().default({}),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("emp_type_policy_type_idx").on(table.employeeTypeId),
]);

export const orgEmployeeTypeAssignments = pgTable("org_employee_type_assignments", {
  id: serial("id").primaryKey(),
  orgScope: varchar("org_scope", { length: 20 }).notNull(),
  orgId: integer("org_id").notNull(),
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id, { onDelete: "cascade" }).notNull(),
  taskPackKey: varchar("task_pack_key", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("org_emp_assign_scope_idx").on(table.orgScope, table.orgId),
  index("org_emp_assign_type_idx").on(table.employeeTypeId),
]);

export const insertEmployeeTypeSchema = createInsertSchema(employeeTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeTypePolicySchema = createInsertSchema(employeeTypePolicies).omit({
  id: true,
  createdAt: true,
});

export const insertOrgEmployeeTypeAssignmentSchema = createInsertSchema(orgEmployeeTypeAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeType = z.infer<typeof insertEmployeeTypeSchema>;
export type EmployeeType = typeof employeeTypes.$inferSelect;
export type InsertEmployeeTypePolicy = z.infer<typeof insertEmployeeTypePolicySchema>;
export type EmployeeTypePolicy = typeof employeeTypePolicies.$inferSelect;
export type InsertOrgEmployeeTypeAssignment = z.infer<typeof insertOrgEmployeeTypeAssignmentSchema>;
export type OrgEmployeeTypeAssignment = typeof orgEmployeeTypeAssignments.$inferSelect;

// ==================== Agent Engine — Pending Actions ====================

export const agentActionTypeEnum = ["remind", "escalate", "report", "suggest_task", "alert", "checklist_warning", "training_nudge", "stock_alert", "sla_warning", "performance_note"] as const;
export type AgentActionType = typeof agentActionTypeEnum[number];

export const agentActionSeverityEnum = ["low", "med", "high", "critical"] as const;
export type AgentActionSeverity = typeof agentActionSeverityEnum[number];

export const agentActionStatusEnum = ["pending", "approved", "rejected", "expired", "auto_resolved"] as const;
export type AgentActionStatus = typeof agentActionStatusEnum[number];

export const agentPendingActions = pgTable("agent_pending_actions", {
  id: serial("id").primaryKey(),
  runId: integer("run_id"),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  targetRoleScope: varchar("target_role_scope", { length: 30 }),
  branchId: integer("branch_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  deepLink: varchar("deep_link", { length: 500 }),
  severity: varchar("severity", { length: 10 }).notNull().default("med"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedByUserId: varchar("approved_by_user_id", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  expiresAt: timestamp("expires_at"),
  category: varchar("category", { length: 50 }),
  subcategory: varchar("subcategory", { length: 100 }),
  escalationDate: timestamp("escalation_date"),
  escalationRole: varchar("escalation_role", { length: 50 }),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_action_status_idx").on(table.status),
  index("agent_action_target_idx").on(table.targetUserId),
  index("agent_action_type_idx").on(table.actionType),
  index("agent_action_branch_idx").on(table.branchId),
  index("agent_action_created_idx").on(table.createdAt),
  index("agent_action_category_idx").on(table.category),
  index("agent_action_escalation_idx").on(table.escalationDate),
]);

export const insertAgentPendingActionSchema = createInsertSchema(agentPendingActions).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentPendingAction = z.infer<typeof insertAgentPendingActionSchema>;
export type AgentPendingAction = typeof agentPendingActions.$inferSelect;

// ==================== Agent Engine — Agent Runs ====================

export const agentRunTypeEnum = ["daily_analysis", "weekly_summary", "event_triggered", "escalation_check"] as const;
export type AgentRunType = typeof agentRunTypeEnum[number];

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  runType: varchar("run_type", { length: 30 }).notNull(),
  scopeType: varchar("scope_type", { length: 20 }).notNull(),
  scopeId: varchar("scope_id", { length: 255 }),
  triggeredBy: varchar("triggered_by", { length: 20 }).notNull().default("cron"),
  inputKpis: jsonb("input_kpis").$type<Record<string, any>>().default({}),
  llmUsed: boolean("llm_used").default(false),
  llmModel: varchar("llm_model", { length: 50 }),
  llmTokens: integer("llm_tokens").default(0),
  actionsGenerated: integer("actions_generated").default(0),
  status: varchar("status", { length: 20 }).default("success"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_run_type_idx").on(table.runType),
  index("agent_run_scope_idx").on(table.scopeType),
  index("agent_run_created_idx").on(table.createdAt),
]);

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// ==================== Agent Engine — Escalation History ====================

export const agentEscalationHistory = pgTable("agent_escalation_history", {
  id: serial("id").primaryKey(),
  sourceActionId: integer("source_action_id").references(() => agentPendingActions.id, { onDelete: "cascade" }).notNull(),
  escalationLevel: integer("escalation_level").notNull().default(1),
  escalatedToUserId: varchar("escalated_to_user_id", { length: 255 }),
  escalatedToRole: varchar("escalated_to_role", { length: 30 }),
  escalatedAt: timestamp("escalated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
}, (table) => [
  index("agent_esc_action_idx").on(table.sourceActionId),
  index("agent_esc_level_idx").on(table.escalationLevel),
  index("agent_esc_user_idx").on(table.escalatedToUserId),
]);

export const insertAgentEscalationHistorySchema = createInsertSchema(agentEscalationHistory).omit({
  id: true,
  escalatedAt: true,
});
export type InsertAgentEscalationHistory = z.infer<typeof insertAgentEscalationHistorySchema>;
export type AgentEscalationHistory = typeof agentEscalationHistory.$inferSelect;

// ==================== Agent Engine — Routing Rules ====================

export const agentRoutingRules = pgTable("agent_routing_rules", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  description: text("description"),
  primaryRole: varchar("primary_role", { length: 50 }).notNull(),
  secondaryRole: varchar("secondary_role", { length: 50 }),
  escalationRole: varchar("escalation_role", { length: 50 }),
  escalationDays: integer("escalation_days").default(3),
  notifyBranchSupervisor: boolean("notify_branch_supervisor").default(true),
  sendHqSummary: boolean("send_hq_summary").default(true),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_routing_category_idx").on(table.category, table.subcategory),
  index("agent_routing_active_idx").on(table.isActive),
]);

export const insertAgentRoutingRuleSchema = createInsertSchema(agentRoutingRules).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentRoutingRule = z.infer<typeof insertAgentRoutingRuleSchema>;
export type AgentRoutingRule = typeof agentRoutingRules.$inferSelect;

// ==================== Agent Engine — Action Outcomes ====================

export const agentActionOutcomes = pgTable("agent_action_outcomes", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull(),
  taskId: integer("task_id"),
  initialScore: real("initial_score"),
  followUpScore: real("follow_up_score"),
  outcome: varchar("outcome", { length: 20 }),
  followUpDate: timestamp("follow_up_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_outcome_action_idx").on(table.actionId),
  index("agent_outcome_followup_idx").on(table.followUpDate),
  index("agent_outcome_status_idx").on(table.outcome),
]);

export const insertAgentActionOutcomeSchema = createInsertSchema(agentActionOutcomes).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentActionOutcome = z.infer<typeof insertAgentActionOutcomeSchema>;
export type AgentActionOutcome = typeof agentActionOutcomes.$inferSelect;

// ==================== Agent Engine — Rejection Patterns ====================

export const agentRejectionPatterns = pgTable("agent_rejection_patterns", {
  id: serial("id").primaryKey(),
  targetUserId: varchar("target_user_id", { length: 255 }),
  category: varchar("category", { length: 50 }),
  subcategory: varchar("subcategory", { length: 100 }),
  rejectionReason: text("rejection_reason"),
  rejectedBy: varchar("rejected_by", { length: 255 }),
  rejectedAt: timestamp("rejected_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("agent_rejection_target_idx").on(table.targetUserId, table.category),
  index("agent_rejection_expires_idx").on(table.expiresAt),
]);

export const insertAgentRejectionPatternSchema = createInsertSchema(agentRejectionPatterns).omit({
  id: true,
  rejectedAt: true,
});
export type InsertAgentRejectionPattern = z.infer<typeof insertAgentRejectionPatternSchema>;
export type AgentRejectionPattern = typeof agentRejectionPatterns.$inferSelect;

// ========================================
// FABRIKA SEVKİYAT SİSTEMİ
// ========================================

export const factoryShipments = pgTable("factory_shipments", {
  id: serial("id").primaryKey(),
  shipmentNumber: varchar("shipment_number", { length: 50 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("hazirlaniyor"),
  preparedById: varchar("prepared_by_id").references(() => users.id, { onDelete: "set null" }),
  orderRequestId: integer("order_request_id"),
  transferType: varchar("transfer_type", { length: 20 }).default("sale"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  totalSalePrice: numeric("total_sale_price", { precision: 12, scale: 2 }),
  dispatchedAt: timestamp("dispatched_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("factory_shipments_branch_idx").on(table.branchId),
  index("factory_shipments_status_idx").on(table.status),
  index("factory_shipments_date_idx").on(table.createdAt),
]);

export const insertFactoryShipmentSchema = createInsertSchema(factoryShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryShipment = z.infer<typeof insertFactoryShipmentSchema>;
export type FactoryShipment = typeof factoryShipments.$inferSelect;

export const factoryShipmentItems = pgTable("factory_shipment_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => factoryShipments.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  lotNumber: varchar("lot_number", { length: 50 }),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
}, (table) => [
  index("factory_shipment_items_shipment_idx").on(table.shipmentId),
  index("factory_shipment_items_product_idx").on(table.productId),
]);

export const insertFactoryShipmentItemSchema = createInsertSchema(factoryShipmentItems).omit({
  id: true,
});

export type InsertFactoryShipmentItem = z.infer<typeof insertFactoryShipmentItemSchema>;
export type FactoryShipmentItem = typeof factoryShipmentItems.$inferSelect;

// ==========================================
// HACCP CHECK RECORDS (FABRİKA)
// ==========================================

export const haccpCheckRecords = pgTable("haccp_check_records", {
  id: serial("id").primaryKey(),
  checkPoint: varchar("check_point", { length: 100 }).notNull(),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  checkedBy: varchar("checked_by", { length: 255 }).references(() => users.id).notNull(),
  checkDate: timestamp("check_date").defaultNow(),
  result: varchar("result", { length: 20 }).notNull(),
  temperatureValue: numeric("temperature_value", { precision: 5, scale: 2 }),
  correctiveAction: text("corrective_action"),
  notes: text("notes"),
  productionOutputId: integer("production_output_id").references(() => factoryProductionOutputs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("haccp_cr_station_idx").on(table.stationId),
  index("haccp_cr_checked_by_idx").on(table.checkedBy),
  index("haccp_cr_date_idx").on(table.checkDate),
  index("haccp_cr_result_idx").on(table.result),
]);

export const insertHaccpCheckRecordSchema = createInsertSchema(haccpCheckRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertHaccpCheckRecord = z.infer<typeof insertHaccpCheckRecordSchema>;
export type HaccpCheckRecord = typeof haccpCheckRecords.$inferSelect;

export const coffeeRoastingLogs = pgTable("coffee_roasting_logs", {
  id: serial("id").primaryKey(),
  chargeNumber: varchar("charge_number", { length: 50 }).notNull(),
  greenCoffeeProductId: integer("green_coffee_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  roastedProductId: integer("roasted_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  greenWeightKg: numeric("green_weight_kg", { precision: 10, scale: 3 }).notNull(),
  roastedWeightKg: numeric("roasted_weight_kg", { precision: 10, scale: 3 }).notNull(),
  weightLossPct: numeric("weight_loss_pct", { precision: 5, scale: 2 }),
  roastDegree: varchar("roast_degree", { length: 30 }).notNull(),
  startTemperature: numeric("start_temperature", { precision: 5, scale: 1 }),
  endTemperature: numeric("end_temperature", { precision: 5, scale: 1 }),
  firstCrackTime: integer("first_crack_time"),
  roastDurationMinutes: integer("roast_duration_minutes"),
  roastDate: timestamp("roast_date").defaultNow(),
  operatorId: text("operator_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("coffee_roasting_date_idx").on(table.roastDate),
  index("coffee_roasting_operator_idx").on(table.operatorId),
  index("coffee_roasting_degree_idx").on(table.roastDegree),
]);

export const insertCoffeeRoastingLogSchema = createInsertSchema(coffeeRoastingLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertCoffeeRoastingLog = z.infer<typeof insertCoffeeRoastingLogSchema>;
export type CoffeeRoastingLog = typeof coffeeRoastingLogs.$inferSelect;

export const productionLots = pgTable("production_lots", {
  id: serial("id").primaryKey(),
  lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
  productId: integer("product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  productionDate: timestamp("production_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  producedBy: text("produced_by").references(() => users.id, { onDelete: "set null" }),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("uretildi").notNull(),
  qualityCheckId: integer("quality_check_id").references(() => factoryQualityChecks.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("production_lots_product_idx").on(table.productId),
  index("production_lots_date_idx").on(table.productionDate),
  index("production_lots_status_idx").on(table.status),
  index("production_lots_expiry_idx").on(table.expiryDate),
]);

export const insertProductionLotSchema = createInsertSchema(productionLots).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionLot = z.infer<typeof insertProductionLotSchema>;
export type ProductionLot = typeof productionLots.$inferSelect;

// ========================================
// ŞUBE STOK SİSTEMİ
// ========================================

export const branchInventory = pgTable("branch_inventory", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  currentStock: numeric("current_stock", { precision: 10, scale: 2 }).default("0"),
  minimumStock: numeric("minimum_stock", { precision: 10, scale: 2 }).default("5"),
  unit: varchar("unit", { length: 20 }),
  lastReceivedAt: timestamp("last_received_at"),
  lastCountedAt: timestamp("last_counted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_inventory_branch_idx").on(table.branchId),
  index("branch_inventory_product_idx").on(table.productId),
]);

export const insertBranchInventorySchema = createInsertSchema(branchInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBranchInventory = z.infer<typeof insertBranchInventorySchema>;
export type BranchInventory = typeof branchInventory.$inferSelect;

export const branchStockMovements = pgTable("branch_stock_movements", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  movementType: varchar("movement_type", { length: 30 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 10, scale: 2 }),
  newStock: numeric("new_stock", { precision: 10, scale: 2 }),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: integer("reference_id"),
  lotNumber: varchar("lot_number", { length: 50 }),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_stock_movements_branch_idx").on(table.branchId),
  index("branch_stock_movements_product_idx").on(table.productId),
  index("branch_stock_movements_date_idx").on(table.createdAt),
]);

export const insertBranchStockMovementSchema = createInsertSchema(branchStockMovements).omit({
  id: true,
  createdAt: true,
});
export type InsertBranchStockMovement = z.infer<typeof insertBranchStockMovementSchema>;
export type BranchStockMovement = typeof branchStockMovements.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceInfo: text("device_info"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const pdksRecords = pgTable("pdks_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  recordDate: date("record_date").notNull(),
  recordTime: time("record_time").notNull(),
  recordType: varchar("record_type", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).default("kiosk"),
  deviceInfo: varchar("device_info", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("pdks_records_user_date_idx").on(table.userId, table.recordDate),
  index("pdks_records_branch_date_idx").on(table.branchId, table.recordDate),
]);

export const insertPdksRecordSchema = createInsertSchema(pdksRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertPdksRecord = z.infer<typeof insertPdksRecordSchema>;
export type PdksRecord = typeof pdksRecords.$inferSelect;

export const positionSalaries = pgTable("position_salaries", {
  id: serial("id").primaryKey(),
  positionCode: varchar("position_code", { length: 50 }).notNull(),
  positionName: varchar("position_name", { length: 100 }).notNull(),
  totalSalary: integer("total_salary").notNull(),
  baseSalary: integer("base_salary").notNull(),
  bonus: integer("bonus").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPositionSalarySchema = createInsertSchema(positionSalaries).omit({
  id: true,
  createdAt: true,
});
export type InsertPositionSalary = z.infer<typeof insertPositionSalarySchema>;
export type PositionSalary = typeof positionSalaries.$inferSelect;

export const monthlyPayroll = pgTable("monthly_payroll", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  positionCode: varchar("position_code", { length: 50 }).notNull(),
  totalCalendarDays: integer("total_calendar_days").notNull(),
  workedDays: integer("worked_days").notNull().default(0),
  offDays: integer("off_days").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  unpaidLeaveDays: integer("unpaid_leave_days").notNull().default(0),
  sickLeaveDays: integer("sick_leave_days").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  totalSalary: integer("total_salary").notNull(),
  baseSalary: integer("base_salary").notNull(),
  bonus: integer("bonus").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  absenceDeduction: integer("absence_deduction").notNull().default(0),
  bonusDeduction: integer("bonus_deduction").notNull().default(0),
  overtimePay: integer("overtime_pay").notNull().default(0),
  netPay: integer("net_pay").notNull().default(0),
  status: varchar("status", { length: 20 }).default("draft"),
  calculatedAt: timestamp("calculated_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("monthly_payroll_user_year_month_uniq").on(table.userId, table.year, table.month),
  index("monthly_payroll_branch_idx").on(table.branchId),
  index("monthly_payroll_period_idx").on(table.year, table.month),
]);

export const insertPdksPayrollSchema = createInsertSchema(monthlyPayroll).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPdksPayroll = z.infer<typeof insertPdksPayrollSchema>;
export type PdksPayroll = typeof monthlyPayroll.$inferSelect;

export const scheduledOffs = pgTable("scheduled_offs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  offDate: date("off_date").notNull(),
  offType: varchar("off_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("scheduled_offs_user_date_uniq").on(table.userId, table.offDate),
  index("scheduled_offs_user_idx").on(table.userId),
  index("scheduled_offs_date_idx").on(table.offDate),
]);

export const insertScheduledOffSchema = createInsertSchema(scheduledOffs).omit({
  id: true,
  createdAt: true,
});
export type InsertScheduledOff = z.infer<typeof insertScheduledOffSchema>;
export type ScheduledOff = typeof scheduledOffs.$inferSelect;

export const dobodyAvatars = pgTable("dobody_avatars", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  label: text("label"),
  category: text("category").default("general").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  timeStart: text("time_start"),
  timeEnd: text("time_end"),
  roles: text("roles").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertDobodyAvatarSchema = createInsertSchema(dobodyAvatars).omit({
  id: true,
  createdAt: true,
});
export type InsertDobodyAvatar = z.infer<typeof insertDobodyAvatarSchema>;
export type DobodyAvatar = typeof dobodyAvatars.$inferSelect;

export const dobodyFlowTasks = pgTable("dobody_flow_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  navigateTo: varchar("navigate_to", { length: 500 }),
  estimatedMinutes: integer("estimated_minutes").default(5),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(),
  targetRoles: text("target_roles").array(),
  targetBranches: integer("target_branches").array(),
  targetUsers: text("target_users").array(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dobody_flow_tasks_active_idx").on(table.isActive),
  index("dobody_flow_tasks_created_by_idx").on(table.createdById),
]);

export const insertDobodyFlowTaskSchema = createInsertSchema(dobodyFlowTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDobodyFlowTask = z.infer<typeof insertDobodyFlowTaskSchema>;
export type DobodyFlowTask = typeof dobodyFlowTasks.$inferSelect;

export const dobodyFlowCompletions = pgTable("dobody_flow_completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: varchar("user_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("dobody_flow_comp_task_idx").on(table.taskId),
  index("dobody_flow_comp_user_idx").on(table.userId),
]);

export const insertDobodyFlowCompletionSchema = createInsertSchema(dobodyFlowCompletions).omit({
  id: true,
  completedAt: true,
});
export type InsertDobodyFlowCompletion = z.infer<typeof insertDobodyFlowCompletionSchema>;
export type DobodyFlowCompletion = typeof dobodyFlowCompletions.$inferSelect;

// ========================================
// DATA LOCK RULES — Sprint 27 Data Protection
// ========================================
export const dataLockRules = pgTable("data_lock_rules", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull().unique(),
  lockAfterDays: integer("lock_after_days"),
  lockOnStatus: varchar("lock_on_status", { length: 50 }),
  lockImmediately: boolean("lock_immediately").default(false),
  canRequestChange: boolean("can_request_change").default(true),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDataLockRuleSchema = createInsertSchema(dataLockRules).omit({
  id: true,
  createdAt: true,
});
export type InsertDataLockRule = z.infer<typeof insertDataLockRuleSchema>;
export type DataLockRule = typeof dataLockRules.$inferSelect;

// ========================================
// DATA CHANGE REQUESTS — Sprint 27
// ========================================
export const dataChangeRequests = pgTable("data_change_requests", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  currentValue: text("current_value"),
  requestedValue: text("requested_value"),
  reason: text("reason").notNull(),
  supportingDocumentUrl: text("supporting_document_url"),
  requestedBy: varchar("requested_by").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("dcr_table_record_idx").on(table.tableName, table.recordId),
  index("dcr_status_idx").on(table.status),
  index("dcr_requested_by_idx").on(table.requestedBy),
]);

export const insertDataChangeRequestSchema = createInsertSchema(dataChangeRequests).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
});
export type InsertDataChangeRequest = z.infer<typeof insertDataChangeRequestSchema>;
export type DataChangeRequest = typeof dataChangeRequests.$inferSelect;

// ========================================
// RECORD REVISIONS — Sprint 27
// ========================================
export const recordRevisions = pgTable("record_revisions", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  fieldChanges: jsonb("field_changes").notNull(),
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changeSource: varchar("change_source", { length: 30 }).default("direct"),
  changeRequestId: integer("change_request_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("rr_table_record_idx").on(table.tableName, table.recordId),
  index("rr_changed_by_idx").on(table.changedBy),
]);

export const insertRecordRevisionSchema = createInsertSchema(recordRevisions).omit({
  id: true,
  createdAt: true,
});
export type InsertRecordRevision = z.infer<typeof insertRecordRevisionSchema>;
export type RecordRevision = typeof recordRevisions.$inferSelect;

// ========================================
// DATA CHANGE LOG — Sprint 27
// ========================================
export const dataChangeLog = pgTable("data_change_log", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: integer("record_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changeReason: text("change_reason"),
  changeRequestId: integer("change_request_id"),
}, (table) => [
  index("dcl_table_record_idx").on(table.tableName, table.recordId),
  index("dcl_changed_by_idx").on(table.changedBy),
  index("dcl_changed_at_idx").on(table.changedAt),
]);

// ==================== Franchise Investors ====================

export const franchiseInvestors = pgTable("franchise_investors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 200 }),
  companyName: varchar("company_name", { length: 200 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  contractStart: date("contract_start"),
  contractEnd: date("contract_end"),
  contractRenewalReminder: boolean("contract_renewal_reminder").default(true),
  investmentAmount: numeric("investment_amount", { precision: 12, scale: 2 }),
  monthlyRoyaltyRate: numeric("monthly_royalty_rate", { precision: 5, scale: 2 }).default("5.0"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("active"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("fi_user_id_idx").on(table.userId),
  index("fi_status_idx").on(table.status),
]);

export const insertFranchiseInvestorSchema = createInsertSchema(franchiseInvestors).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export type InsertFranchiseInvestor = z.infer<typeof insertFranchiseInvestorSchema>;
export type FranchiseInvestor = typeof franchiseInvestors.$inferSelect;

export const franchiseInvestorBranches = pgTable("franchise_investor_branches", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => franchiseInvestors.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fib_investor_idx").on(table.investorId),
  index("fib_branch_idx").on(table.branchId),
]);

export const insertFranchiseInvestorBranchSchema = createInsertSchema(franchiseInvestorBranches).omit({ id: true, createdAt: true });
export type InsertFranchiseInvestorBranch = z.infer<typeof insertFranchiseInvestorBranchSchema>;
export type FranchiseInvestorBranch = typeof franchiseInvestorBranches.$inferSelect;

export const franchiseInvestorNotes = pgTable("franchise_investor_notes", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull().references(() => franchiseInvestors.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }),
  content: text("content"),
  noteType: varchar("note_type", { length: 30 }).default("meeting"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fin_investor_idx").on(table.investorId),
]);

export const insertFranchiseInvestorNoteSchema = createInsertSchema(franchiseInvestorNotes).omit({ id: true, createdAt: true });
export type InsertFranchiseInvestorNote = z.infer<typeof insertFranchiseInvestorNoteSchema>;
export type FranchiseInvestorNote = typeof franchiseInvestorNotes.$inferSelect;

// =============================================
// Academy V3 — Webinars
// =============================================

export const webinars = pgTable("webinars", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  hostName: text("host_name"),
  hostUserId: varchar("host_user_id").references(() => users.id, { onDelete: "set null" }),
  webinarDate: timestamp("webinar_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  meetingLink: text("meeting_link"),
  recordingUrl: text("recording_url"),
  targetRoles: text("target_roles").array().default(sql`'{}'::text[]`),
  isLive: boolean("is_live").default(false),
  status: text("status").default("scheduled"),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  maxParticipants: integer("max_participants"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("webinars_date_idx").on(table.webinarDate),
  index("webinars_status_idx").on(table.status),
]);

export const insertWebinarSchema = createInsertSchema(webinars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinars.$inferSelect;

export const webinarRegistrations = pgTable("webinar_registrations", {
  id: serial("id").primaryKey(),
  webinarId: integer("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  registeredAt: timestamp("registered_at").defaultNow(),
  attended: boolean("attended").default(false),
  attendedAt: timestamp("attended_at"),
  status: text("status").default("registered"),
}, (table) => [
  index("wr_webinar_idx").on(table.webinarId),
  index("wr_user_idx").on(table.userId),
  unique("wr_webinar_user_uniq").on(table.webinarId, table.userId),
]);

export const insertWebinarRegistrationSchema = createInsertSchema(webinarRegistrations).omit({ id: true, registeredAt: true });
export type InsertWebinarRegistration = z.infer<typeof insertWebinarRegistrationSchema>;
export type WebinarRegistration = typeof webinarRegistrations.$inferSelect;

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  branchId: integer("branch_id").references(() => branches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  department: varchar("department", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("acik"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  slaDeadline: timestamp("sla_deadline"),
  slaBreached: boolean("sla_breached").notNull().default(false),
  slaBreachedAt: timestamp("sla_breached_at"),
  relatedEquipmentId: integer("related_equipment_id"),
  recurrenceCount: integer("recurrence_count").notNull().default(1),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id),
  resolutionNote: text("resolution_note"),
  satisfactionScore: integer("satisfaction_score"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("st_branch_idx").on(table.branchId),
  index("st_dept_idx").on(table.department),
  index("st_status_idx").on(table.status),
  index("st_assigned_idx").on(table.assignedToUserId),
]);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export const supportTicketComments = pgTable("support_ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketCommentSchema = createInsertSchema(supportTicketComments).omit({ id: true, createdAt: true });
export type InsertSupportTicketComment = z.infer<typeof insertSupportTicketCommentSchema>;
export type SupportTicketComment = typeof supportTicketComments.$inferSelect;

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => supportTicketComments.id, { onDelete: "set null" }),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull().references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ta_ticket_idx").on(table.ticketId),
]);

export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = typeof ticketAttachments.$inferInsert;

export const hqTasks = pgTable("hq_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  assignedByUserId: varchar("assigned_by_user_id").notNull().references(() => users.id),
  assignedToUserId: varchar("assigned_to_user_id").notNull().references(() => users.id),
  department: varchar("department", { length: 50 }),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("beklemede"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
  progressPercent: integer("progress_percent").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hqt_assigned_to_idx").on(table.assignedToUserId),
  index("hqt_assigned_by_idx").on(table.assignedByUserId),
  index("hqt_status_idx").on(table.status),
]);

export const insertHqTaskSchema = createInsertSchema(hqTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHqTask = z.infer<typeof insertHqTaskSchema>;
export type HqTask = typeof hqTasks.$inferSelect;

export const broadcastReceipts = pgTable("broadcast_receipts", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  seenAt: timestamp("seen_at"),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  unique("br_announcement_user_uniq").on(table.announcementId, table.userId),
  index("br_ann_idx").on(table.announcementId),
]);

export const insertBroadcastReceiptSchema = createInsertSchema(broadcastReceipts).omit({ id: true });
export type InsertBroadcastReceipt = z.infer<typeof insertBroadcastReceiptSchema>;
export type BroadcastReceipt = typeof broadcastReceipts.$inferSelect;

export const moduleDelegations = pgTable('module_delegations', {
  id: serial('id').primaryKey(),
  moduleKey: varchar('module_key', { length: 100 }).notNull(),
  moduleName: varchar('module_name', { length: 200 }).notNull(),
  fromRole: varchar('from_role', { length: 100 }).notNull(),
  toRole: varchar('to_role', { length: 100 }).notNull(),
  delegationType: varchar('delegation_type', { length: 20 }).notNull().default('gecici'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  note: varchar('note', { length: 500 }),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index("md_module_key_idx").on(table.moduleKey),
  index("md_to_role_idx").on(table.toRole),
  index("md_is_active_idx").on(table.isActive),
]);

export type ModuleDelegation = typeof moduleDelegations.$inferSelect;
export type InsertModuleDelegation = typeof moduleDelegations.$inferInsert;

// Module departments (content map for delegation)
export const moduleDepartments = pgTable('module_departments', {
  id: serial('id').primaryKey(),
  moduleKey: varchar('module_key', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  icon: varchar('icon', { length: 10 }).default('📌'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moduleDepartmentTopics = pgTable('module_department_topics', {
  id: serial('id').primaryKey(),
  departmentId: integer('department_id')
    .notNull()
    .references(() => moduleDepartments.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 200 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertModuleDepartmentSchema = createInsertSchema(moduleDepartments).omit({ id: true, createdAt: true });
export const insertModuleDepartmentTopicSchema = createInsertSchema(moduleDepartmentTopics).omit({ id: true, createdAt: true });

export type ModuleDepartment = typeof moduleDepartments.$inferSelect;
export type InsertModuleDepartment = z.infer<typeof insertModuleDepartmentSchema>;
export type ModuleDepartmentTopic = typeof moduleDepartmentTopics.$inferSelect;
export type InsertModuleDepartmentTopic = z.infer<typeof insertModuleDepartmentTopicSchema>;

export const slaRules = pgTable('sla_rules', {
  id: serial('id').primaryKey(),
  department: varchar('department', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  hoursLimit: integer('hours_limit').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedBy: varchar('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SlaRule = typeof slaRules.$inferSelect;
export type InsertSlaRule = typeof slaRules.$inferInsert;

export const slaBusinessHours = pgTable('sla_business_hours', {
  id: serial('id').primaryKey(),
  startHour: integer('start_hour').notNull().default(8),
  endHour: integer('end_hour').notNull().default(18),
  workDays: integer('work_days').array().notNull().default(sql`'{1,2,3,4,5}'`),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Istanbul'),
  updatedBy: varchar('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SlaBusinessHours = typeof slaBusinessHours.$inferSelect;
export type InsertSlaBusinessHours = typeof slaBusinessHours.$inferInsert;

export const factoryKioskConfig = pgTable("factory_kiosk_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: varchar("config_value", { length: 500 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FactoryKioskConfig = typeof factoryKioskConfig.$inferSelect;
export type InsertFactoryKioskConfig = typeof factoryKioskConfig.$inferInsert;
