import { 
  SidebarMenuSection, 
  SidebarMenuResponse, 
  SidebarMenuScope,
  SidebarMenuGroup,
  UserRoleType,
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  PERMISSIONS,
  PermissionModule
} from "@shared/schema";
import { isModuleEnabled, getModuleKeyForPath } from "./services/module-flag-service";

// ========================================
// STATIC MENU BLUEPRINT
// Single source of truth for all menu items
// 3 functional groups: operations / management / settings
// Consolidated from 13 → 9 sections. PDKS+Maaş→İK, AI Asistan→Eğitim, Agent→Yönetim, MisafirMemn→Müşteri İlişkileri
// ========================================

const MENU_BLUEPRINT: SidebarMenuSection[] = [
  // ========================================
  // GROUP: OPERATIONS — Günlük operasyonel işlemler
  // ========================================

  // 1. Dashboard (HQ)
  {
    id: "dashboard-hq",
    titleTr: "Ana Sayfa",
    icon: "LayoutDashboard",
    scope: "hq",
    group: "operations",
    items: [
      {
        id: "dashboard",
        titleTr: "Ana Sayfa",
        path: "/",
        icon: "LayoutDashboard",
        moduleKey: "dashboard",
        scope: "hq",
      },
    ],
  },
  // 1b. Dashboard (Branch)
  {
    id: "dashboard-branch",
    titleTr: "",
    icon: "Home",
    scope: "branch",
    group: "operations",
    items: [
      {
        id: "branch-dashboard",
        titleTr: "Ana Sayfa",
        path: "/sube/dashboard",
        icon: "Home",
        moduleKey: "dashboard",
        scope: "branch",
      },
    ],
  },

  // 1c. Ajanda (Kişisel takvim + todo + notlar)
  {
    id: "ajanda-section",
    titleTr: "Ajanda",
    icon: "CalendarDays",
    scope: "both",
    group: "operations",
    items: [
      {
        id: "ajanda",
        titleTr: "Ajanda",
        path: "/ajanda",
        icon: "CalendarDays",
        moduleKey: "ajanda",
        scope: "both",
      },
    ],
  },

  // 2. Operasyon (Görevler + Checklistler + Kayıp Eşya + Ekipman + Arıza + QR)
  {
    id: "operations",
    titleTr: "Operasyon",
    icon: "CheckSquare",
    scope: "both",
    group: "operations",
    items: [
      {
        id: "notifications",
        titleTr: "Bildirimler",
        path: "/bildirimler",
        icon: "Bell",
        moduleKey: "notifications",
        scope: "both",
        badge: "notifications",
      },
      {
        id: "tasks-list",
        titleTr: "Görevler",
        path: "/gorevler",
        icon: "CheckSquare",
        moduleKey: "tasks",
        scope: "both",
      },
      {
        id: "checklists",
        titleTr: "Kontrol Listeleri",
        path: "/checklistler",
        icon: "ClipboardList",
        moduleKey: "checklists",
        scope: "both",
      },
      {
        id: "equipment",
        titleTr: "Ekipman",
        path: "/ekipman",
        icon: "Wrench",
        moduleKey: "equipment",
        scope: "both",
      },
      {
        id: "faults",
        titleTr: "Arızalar",
        path: "/ariza",
        icon: "AlertTriangle",
        moduleKey: "faults",
        scope: "both",
        badge: "faults",
      },
      {
        id: "qr-scan",
        titleTr: "QR Tara",
        path: "/qr-tara",
        icon: "QrCode",
        moduleKey: "equipment",
        scope: "both",
      },
      {
        id: "branch-stock-orders",
        titleTr: "Şube Stok & Sipariş",
        path: "/sube/siparis-stok",
        icon: "Package",
        moduleKey: "branch_orders",
        scope: "branch",
      },
      {
        id: "lost-found",
        titleTr: "Kayıp Eşya",
        path: "/kayip-esya",
        icon: "Briefcase",
        moduleKey: "lost_found",
        scope: "branch",
      },
      {
        id: "lost-found-hq",
        titleTr: "Kayıp Eşya",
        path: "/kayip-esya-hq",
        icon: "Briefcase",
        moduleKey: "lost_found_hq",
        scope: "hq",
      },
    ],
  },

  // 3. İK & Personel (PDKS + Maaş taşındı — Finans'tan)
  {
    id: "hr-shifts",
    titleTr: "İK & Personel",
    icon: "Users",
    scope: "both",
    group: "operations",
    items: [
      {
        id: "hr",
        titleTr: "Personel",
        path: "/ik",
        icon: "Users",
        moduleKey: "hr",
        scope: "both",
      },
      {
        id: "shifts",
        titleTr: "Vardiyalar",
        path: "/vardiyalar",
        icon: "Calendar",
        moduleKey: "shifts",
        scope: "both",
      },
      {
        id: "branch-shift-tracking",
        titleTr: "Puantaj",
        path: "/sube-vardiya-takibi",
        icon: "Timer",
        moduleKey: "branch_shift_tracking",
        scope: "both",
      },
      {
        id: "attendance",
        titleTr: "Devam Takibi",
        path: "/devam-takibi",
        icon: "UserCheck",
        moduleKey: "attendance",
        scope: "both",
      },
      {
        id: "onboarding-programs",
        titleTr: "Onboarding Programları",
        path: "/onboarding-programlar",
        icon: "GraduationCap",
        moduleKey: "hr",
        scope: "both",
      },
      {
        id: "pdks",
        titleTr: "PDKS",
        path: "/pdks",
        icon: "Fingerprint",
        moduleKey: "attendance",
        scope: "hq",
      },
      {
        id: "maas",
        titleTr: "Maaş Hesaplama",
        path: "/maas",
        icon: "Banknote",
        moduleKey: "accounting",
        scope: "hq",
      },
    ],
  },

  // 4. Fabrika
  {
    id: "fabrika",
    titleTr: "Fabrika",
    icon: "Factory",
    scope: "both",
    group: "operations",
    items: [
      {
        id: "factory-dashboard",
        titleTr: "Fabrika Paneli",
        path: "/fabrika/dashboard",
        icon: "LayoutDashboard",
        moduleKey: "factory_dashboard",
        scope: "both",
      },
      {
        id: "factory-kiosk",
        titleTr: "Giriş/Çıkış Kiosk",
        path: "/fabrika/kiosk",
        icon: "Tablet",
        moduleKey: "factory_kiosk",
        scope: "both",
      },
      {
        id: "factory-quality",
        titleTr: "Kalite Kontrol",
        path: "/fabrika/kalite-kontrol",
        icon: "Shield",
        moduleKey: "factory_quality",
        scope: "both",
      },
      {
        id: "factory-stations",
        titleTr: "Üretim İstasyonları",
        path: "/fabrika/istasyonlar",
        icon: "Grid",
        moduleKey: "factory_stations",
        scope: "both",
      },
      {
        id: "factory-analytics",
        titleTr: "Performans",
        path: "/fabrika/performans",
        icon: "BarChart3",
        moduleKey: "factory_analytics",
        scope: "both",
      },
      {
        id: "factory-compliance",
        titleTr: "Vardiya Uyumluluk",
        path: "/fabrika/vardiya-uyumluluk",
        icon: "Clock",
        moduleKey: "factory_compliance",
        scope: "both",
      },
    ],
  },

  // ========================================
  // GROUP: MANAGEMENT — Yönetim, denetim, eğitim, finans
  // ========================================

  // 5. Eğitim (AI Asistan taşındı — İletişim'den)
  {
    id: "training-academy-section",
    titleTr: "Eğitim",
    icon: "GraduationCap",
    scope: "both",
    group: "management",
    items: [
      {
        id: "training-academy",
        titleTr: "Akademi",
        path: "/akademi",
        icon: "GraduationCap",
        moduleKey: "training",
        scope: "both",
      },
      {
        id: "training-academy-hq",
        titleTr: "Akademi Yönetimi",
        path: "/akademi-hq",
        icon: "GraduationCap",
        moduleKey: "training",
        scope: "hq",
      },
      {
        id: "knowledge-base",
        titleTr: "Bilgi Bankası",
        path: "/bilgi-bankasi",
        icon: "BookOpen",
        moduleKey: "knowledge_base",
        scope: "both",
      },
      {
        id: "ai-assistant",
        titleTr: "AI Asistan",
        path: "/akademi-ai-assistant",
        icon: "Brain",
        moduleKey: "knowledge_base",
        scope: "both",
      },
    ],
  },

  // 6. Denetim & Analitik (Quality + Analytics merged)
  {
    id: "audit-analytics",
    titleTr: "Kalite & Denetim",
    icon: "Star",
    scope: "both",
    group: "management",
    items: [
      {
        id: "performance-dashboard",
        titleTr: "Performans",
        path: "/performans",
        icon: "BarChart3",
        moduleKey: "performance",
        scope: "both",
      },
      {
        id: "reports",
        titleTr: "Raporlar",
        path: "/raporlar",
        icon: "FileText",
        moduleKey: "reports",
        scope: "both",
      },
      {
        id: "quality-control",
        titleTr: "Kalite Denetimi",
        path: "/kalite-denetimi",
        icon: "Star",
        moduleKey: "quality_audit",
        scope: "hq",
      },
      {
        id: "branch-inspection",
        titleTr: "Şube Denetim",
        path: "/coach-sube-denetim",
        icon: "ClipboardCheck",
        moduleKey: "branch_inspection",
        scope: "hq",
      },
      {
        id: "food-safety",
        titleTr: "Gıda Güvenliği",
        path: "/gida-guvenligi-dashboard",
        icon: "ShieldCheck",
        moduleKey: "food_safety",
        scope: "hq",
      },
      {
        id: "branch-health",
        titleTr: "Şube Sağlık Skoru",
        path: "/sube-saglik-skoru",
        icon: "BarChart",
        moduleKey: "branch_inspection",
        scope: "hq",
      },
      {
        id: "product-complaints",
        titleTr: "Ticket / Talepler",
        path: "/crm/ticket-talepler",
        icon: "AlertTriangle",
        moduleKey: "crm_complaints",
        scope: "hq",
      },
    ],
  },

  // 7. Finans & Tedarik (Finance + Procurement merged)
  {
    id: "finance-procurement",
    titleTr: "Finans & Tedarik",
    icon: "Calculator",
    scope: "both",
    group: "management",
    items: [
      {
        id: "accounting-main",
        titleTr: "Muhasebe",
        path: "/muhasebe",
        icon: "Calculator",
        moduleKey: "accounting",
        scope: "both",
      },
      {
        id: "financial-management",
        titleTr: "Mali Yönetim",
        path: "/mali-yonetim",
        icon: "BarChart3",
        moduleKey: "accounting",
        scope: "both",
      },
      {
        id: "financial-reports",
        titleTr: "Mali Raporlar",
        path: "/muhasebe-raporlama",
        icon: "FileText",
        moduleKey: "accounting",
        scope: "both",
      },
      {
        id: "procurement-dashboard",
        titleTr: "Satınalma",
        path: "/satinalma",
        icon: "ShoppingCart",
        moduleKey: "satinalma",
        scope: "hq",
      },
      {
        id: "stock-management",
        titleTr: "Stok",
        path: "/satinalma/stok-yonetimi",
        icon: "Package",
        moduleKey: "inventory",
        scope: "hq",
      },
      {
        id: "supplier-management",
        titleTr: "Tedarikçiler",
        path: "/satinalma/tedarikci-yonetimi",
        icon: "Truck",
        moduleKey: "suppliers",
        scope: "hq",
      },
      {
        id: "order-management",
        titleTr: "Siparişler",
        path: "/satinalma/siparis-yonetimi",
        icon: "FileText",
        moduleKey: "purchase_orders",
        scope: "hq",
      },
      {
        id: "goods-receipt",
        titleTr: "Mal Kabul",
        path: "/satinalma/mal-kabul",
        icon: "ClipboardCheck",
        moduleKey: "goods_receipt",
        scope: "hq",
      },
    ],
  },

  // 7b. CRM & Destek (Müşteri İlişkileri + İletişim Merkezi birleştirildi)
  {
    id: "crm",
    titleTr: "CRM & Destek",
    icon: "MessageSquare",
    scope: "both",
    group: "management",
    items: [
      {
        id: "crm-main",
        titleTr: "CRM",
        path: "/crm",
        icon: "MessageSquare",
        moduleKey: "crm_dashboard",
        scope: "both",
      },
      {
        id: "franchise-investors",
        titleTr: "Yatırımcılar",
        path: "/franchise-yatirimcilar",
        icon: "Building2",
        moduleKey: "crm_dashboard",
        scope: "hq",
      },
      {
        id: "customer-satisfaction",
        titleTr: "Misafir Memnuniyeti",
        path: "/crm?channel=misafir",
        icon: "MessageSquareHeart",
        moduleKey: "crm_feedback",
        scope: "hq",
      },
    ],
  },

  // ========================================
  // GROUP: SETTINGS — Sistem ayarları, iletişim, yönetim
  // ========================================

  // 8. Yönetim (Admin + Branches + Projects merged)
  {
    id: "management",
    titleTr: "Yönetim",
    icon: "Settings",
    scope: "hq",
    group: "settings",
    items: [
      {
        id: "admin-panel",
        titleTr: "Yönetim Paneli",
        path: "/admin",
        icon: "LayoutDashboard",
        moduleKey: "admin_settings",
        scope: "hq",
      },
      {
        id: "branches-list",
        titleTr: "Şubeler",
        path: "/subeler",
        icon: "Building2",
        moduleKey: "branches",
        scope: "hq",
      },
      {
        id: "project-list",
        titleTr: "Projeler",
        path: "/projeler",
        icon: "FolderKanban",
        moduleKey: "projects",
        scope: "hq",
      },
      {
        id: "agent-center",
        titleTr: "Agent Merkezi",
        path: "/agent-merkezi",
        icon: "Shield",
        moduleKey: "support",
        scope: "hq",
        badge: "agent",
      },
    ],
  },
];

// ========================================
// SIDEBAR VISIBILITY OVERRIDES
// Restricts which menu item IDs each role sees in the sidebar.
// Roles NOT listed here (e.g. admin) see everything that passes scope+permission checks.
// This is an additional filter on top of scope + PERMISSIONS — it only hides, never grants access.
// ========================================

const SIDEBAR_ALLOWED_ITEMS: Partial<Record<UserRoleType, string[]>> = {
  barista: [
    'branch-dashboard', 'tasks-list', 'training-academy', 'notifications', 'crm-main',
  ],
  stajyer: [
    'branch-dashboard', 'training-academy', 'notifications', 'crm-main',
  ],
  bar_buddy: [
    'branch-dashboard', 'tasks-list', 'training-academy', 'notifications',
  ],
  supervisor: [
    'branch-dashboard', 'ajanda', 'tasks-list', 'checklists', 'faults', 'equipment',
    'customer-satisfaction', 'reports', 'knowledge-base', 'performance-dashboard',
    'notifications', 'ai-assistant', 'branch-stock-orders', 'crm-main',
    'hr', 'shifts', 'attendance',
  ],
  supervisor_buddy: [
    'branch-dashboard', 'tasks-list', 'checklists', 'knowledge-base',
    'notifications', 'ai-assistant', 'crm-main',
  ],
  mudur: [
    'branch-dashboard', 'ajanda', 'tasks-list', 'checklists', 'equipment', 'faults',
    'reports', 'customer-satisfaction', 'knowledge-base', 'performance-dashboard',
    'notifications', 'branch-stock-orders', 'crm-main',
    'hr', 'shifts', 'attendance',
  ],
  yatirimci_branch: [
    'branch-dashboard', 'reports', 'financial-management', 'notifications',
  ],
  ceo: [
    'dashboard', 'ajanda', 'branches-list', 'hr', 'reports', 'performance-dashboard',
    'knowledge-base', 'ai-assistant', 'training-academy-hq', 'notifications', 'crm-main',
    'franchise-investors',
  ],
  cgo: [
    'dashboard', 'ajanda', 'branches-list', 'hr', 'reports', 'performance-dashboard',
    'customer-satisfaction', 'knowledge-base', 'ai-assistant',
    'franchise-investors', 'notifications', 'crm-main',
  ],
  yatirimci_hq: [
    'dashboard', 'reports', 'financial-management', 'notifications',
  ],
  coach: [
    'dashboard', 'ajanda', 'branches-list', 'hr', 'branch-inspection', 'customer-satisfaction',
    'reports', 'knowledge-base', 'training-academy-hq', 'tasks-list',
    'notifications', 'crm-main',
  ],
  destek: [
    'dashboard', 'branches-list', 'equipment', 'faults',
    'crm-main', 'notifications',
  ],
  trainer: [
    'dashboard', 'ajanda', 'hr', 'training-academy-hq', 'tasks-list', 'branch-inspection',
    'knowledge-base', 'reports', 'performance-dashboard',
    'notifications', 'crm-main',
  ],
  kalite_kontrol: [
    'dashboard', 'quality-control', 'customer-satisfaction', 'food-safety',
    'factory-quality', 'reports', 'notifications',
    'crm-main',
  ],
  gida_muhendisi: [
    'dashboard', 'food-safety', 'quality-control', 'factory-quality',
    'factory-dashboard', 'reports', 'notifications',
    'crm-main',
  ],
  marketing: [
    'dashboard', 'customer-satisfaction', 'reports',
    'notifications', 'crm-main',
  ],
  muhasebe_ik: [
    'dashboard', 'ajanda', 'hr', 'shifts', 'attendance', 'pdks', 'maas',
    'accounting-main', 'financial-management', 'financial-reports', 'reports',
    'notifications', 'crm-main',
  ],
  muhasebe: [
    'dashboard', 'accounting-main', 'financial-management', 'financial-reports',
    'pdks', 'maas', 'reports', 'notifications',
    'crm-main',
  ],
  satinalma: [
    'dashboard', 'ajanda', 'procurement-dashboard', 'stock-management', 'supplier-management',
    'order-management', 'goods-receipt', 'reports',
    'notifications', 'crm-main',
  ],
  teknik: [
    'dashboard', 'equipment', 'faults', 'reports',
    'notifications', 'crm-main',
  ],
  fabrika_mudur: [
    'factory-dashboard', 'ajanda', 'factory-kiosk', 'factory-quality', 'factory-stations',
    'factory-analytics', 'factory-compliance', 'hr', 'shifts', 'reports',
    'performance-dashboard', 'notifications', 'crm-main',
  ],
  fabrika: [
    'factory-dashboard', 'factory-kiosk', 'factory-quality', 'factory-stations', 'notifications',
  ],
  fabrika_operator: [
    'factory-dashboard', 'factory-kiosk', 'notifications',
  ],
  admin: [
    'dashboard', 'ajanda', 'tasks-list', 'checklists', 'equipment', 'faults',
    'branches-list', 'hr', 'shifts', 'attendance',
    'reports', 'performance-dashboard', 'quality-control', 'food-safety',
    'branch-inspection', 'branch-health', 'customer-satisfaction',
    'training-academy-hq', 'knowledge-base',
    'accounting-main', 'financial-management', 'pdks', 'maas',
    'procurement-dashboard', 'stock-management',
    'ai-assistant', 'agent-center', 'crm-main', 'franchise-investors',
    'notifications',
    'admin-panel', 'project-list',
  ],
  uretim_sefi: [
    'factory-dashboard', 'ajanda', 'factory-kiosk', 'factory-quality', 'factory-stations',
    'factory-analytics', 'hr', 'shifts', 'reports',
    'performance-dashboard', 'notifications', 'crm-main',
  ],
  fabrika_sorumlu: [
    'factory-dashboard', 'factory-kiosk', 'factory-quality', 'notifications',
  ],
  fabrika_personel: [
    'factory-dashboard', 'factory-kiosk', 'notifications',
  ],
};

// Startup validation: verify all SIDEBAR_ALLOWED_ITEMS IDs exist in MENU_BLUEPRINT
const ALL_BLUEPRINT_ITEM_IDS = new Set(
  MENU_BLUEPRINT.flatMap(section => section.items.map(item => item.id))
);
for (const [role, itemIds] of Object.entries(SIDEBAR_ALLOWED_ITEMS)) {
  if (!itemIds) continue;
  for (const itemId of itemIds) {
    if (!ALL_BLUEPRINT_ITEM_IDS.has(itemId)) {
      console.warn(`[menu-service] SIDEBAR_ALLOWED_ITEMS: role "${role}" references unknown item ID "${itemId}"`);
    }
  }
}

// ========================================
// MENU SERVICE
// Server-side RBAC filtering with dynamic permissions support
// ========================================

// Dynamic permissions type from database
export type DynamicPermissions = Array<{ role: string; module: string; actions: string[] }>;

function canAccessModule(
  role: UserRoleType, 
  moduleKey: PermissionModule,
  dynamicPermissions?: DynamicPermissions
): boolean {
  // Normalize for case-insensitive comparison
  const normalizedRole = (role || "").trim().toLocaleLowerCase('tr-TR');
  const normalizedModuleKey = (moduleKey || "").trim().toLocaleLowerCase('tr-TR');
  
  // If dynamic permissions exist for this role, use ONLY dynamic permissions (no static fallback)
  // This ensures that when permissions are revoked in the database, modules are hidden
  if (dynamicPermissions && dynamicPermissions.length > 0) {
    const dynamicPerm = dynamicPermissions.find(
      p => p.role && p.role.trim().toLocaleLowerCase('tr-TR') === normalizedRole && 
           p.module && p.module.trim().toLocaleLowerCase('tr-TR') === normalizedModuleKey
    );
    
    // If no dynamic permission record for this module, deny access
    if (!dynamicPerm) {
      return false;
    }
    
    // Handle both array and string formats for actions
    const actions = dynamicPerm.actions as string[] | string;
    const hasActions = Array.isArray(actions) 
      ? actions.length > 0 
      : (typeof actions === 'string' && actions.length > 0);
    
    // Only allow access if there are actual actions granted
    return hasActions;
  }
  
  // Fallback to static PERMISSIONS matrix ONLY when no dynamic permissions exist at all
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  const modulePermissions = rolePermissions[moduleKey];
  return modulePermissions && modulePermissions.length > 0;
}

function isScopeAllowed(scope: SidebarMenuScope, userScope: 'branch' | 'hq' | 'admin'): boolean {
  if (userScope === 'admin') return true;
  if (scope === 'both') return true;
  return scope === userScope;
}

export async function buildMenuForUser(
  user: { id: string; role: UserRoleType; branchId?: number | null },
  badges: Record<string, number> = {},
  dynamicPermissions?: DynamicPermissions
): Promise<SidebarMenuResponse> {
  const role = user.role;
  
  // Determine user scope
  let userScope: 'branch' | 'hq' | 'admin';
  if (role === 'admin') {
    userScope = 'admin';
  } else if (isFactoryFloorRole(role)) {
    userScope = 'hq';
  } else if (isBranchRole(role)) {
    userScope = 'branch';
  } else if (isHQRole(role)) {
    userScope = 'hq';
  } else {
    userScope = 'branch';
  }

  const allowedItems = SIDEBAR_ALLOWED_ITEMS[role];

  // Filter sections by scope, permissions, and sidebar visibility overrides
  const preFilteredSections: SidebarMenuSection[] = MENU_BLUEPRINT
    .filter(section => isScopeAllowed(section.scope, userScope))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!isScopeAllowed(item.scope, userScope)) return false;
        if (item.alwaysVisible) return true;
        if (allowedItems && !allowedItems.includes(item.id)) return false;
        if (!canAccessModule(role, item.moduleKey, dynamicPermissions)) return false;
        return true;
      }),
    }))
    .filter(section => section.items.length > 0);

  // Apply module feature flags — filter out items whose path maps to a disabled module
  const branchId = user.branchId ?? null;
  const userRole = user.role;
  const moduleFlagChecks = new Map<string, boolean>();
  const allPaths = preFilteredSections.flatMap(s => s.items.map(i => i.path));
  for (const path of allPaths) {
    const flagKey = getModuleKeyForPath(path);
    if (flagKey && !moduleFlagChecks.has(flagKey)) {
      try {
        moduleFlagChecks.set(flagKey, await isModuleEnabled(flagKey, branchId, "ui", userRole));
      } catch {
        moduleFlagChecks.set(flagKey, true);
      }
    }
  }

  const filteredSections = preFilteredSections
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => {
          const flagKey = getModuleKeyForPath(item.path);
          if (!flagKey) return true;
          return moduleFlagChecks.get(flagKey) !== false;
        })
        .map(item => ({
          ...item,
          path: item.path === '/personel/me' ? `/personel/${user.id}` : item.path,
        })),
    }))
    .filter(section => section.items.length > 0);

  return {
    sections: filteredSections,
    badges,
    meta: {
      userId: user.id,
      role,
      scope: userScope,
      timestamp: Date.now(),
    },
  };
}

// Export menu blueprint for seeding
export { MENU_BLUEPRINT };
