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

// ========================================
// STATIC MENU BLUEPRINT
// Single source of truth for all menu items
// 3 functional groups: operations / management / settings
// Consolidated from 13 → 9 sections
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

  // 2. Operasyon (Görevler + Checklistler + Kayıp Eşya + Ekipman + Arıza + QR)
  {
    id: "operations",
    titleTr: "Operasyon",
    icon: "CheckSquare",
    scope: "both",
    group: "operations",
    items: [
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

  // 3. İK & Vardiya
  {
    id: "hr-shifts",
    titleTr: "İK & Vardiya",
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

  // 5. Eğitim
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
        path: "/egitim",
        icon: "GraduationCap",
        moduleKey: "training",
        scope: "both",
      },
      {
        id: "knowledge-base",
        titleTr: "Bilgi Bankası",
        path: "/bilgi-bankasi",
        icon: "BookOpen",
        moduleKey: "knowledge_base",
        scope: "both",
      },
    ],
  },

  // 6. Denetim & Analitik (Quality + Analytics merged)
  {
    id: "audit-analytics",
    titleTr: "Denetim & Analitik",
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
        id: "customer-satisfaction",
        titleTr: "Misafir Memnuniyeti",
        path: "/misafir-memnuniyeti",
        icon: "MessageSquareHeart",
        moduleKey: "customer_satisfaction",
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
        titleTr: "Ürün Şikayetleri",
        path: "/urun-sikayet",
        icon: "AlertTriangle",
        moduleKey: "product_complaints",
        scope: "both",
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

  // ========================================
  // GROUP: SETTINGS — Sistem ayarları, iletişim, yönetim
  // ========================================

  // 7b. Pazarlama
  {
    id: "marketing",
    titleTr: "Pazarlama",
    icon: "Megaphone",
    scope: "hq",
    group: "management",
    items: [
      {
        id: "campaign-management",
        titleTr: "Kampanya Yönetimi",
        path: "/kampanya-yonetimi",
        icon: "Megaphone",
        moduleKey: "customer_satisfaction",
        scope: "hq",
      },
    ],
  },

  // 8. İletişim
  {
    id: "communication",
    titleTr: "İletişim",
    icon: "MessageSquare",
    scope: "both",
    group: "settings",
    items: [
      {
        id: "hq-support",
        titleTr: "Merkez Destek",
        path: "/hq-destek",
        icon: "Headphones",
        moduleKey: "support",
        scope: "both",
      },
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
        id: "messages",
        titleTr: "Mesajlar",
        path: "/mesajlar",
        icon: "MessageSquare",
        moduleKey: "messages",
        scope: "both",
        badge: "messages",
      },
      {
        id: "ai-assistant",
        titleTr: "AI Asistan",
        path: "/ai-asistan",
        icon: "Brain",
        moduleKey: "knowledge_base",
        scope: "both",
      },
      {
        id: "usage-guide",
        titleTr: "Kılavuz",
        path: "/kullanim-kilavuzu",
        icon: "BookOpen",
        moduleKey: "support",
        scope: "both",
        alwaysVisible: true,
      },
    ],
  },

  // 9. Yönetim (Admin + Branches + Projects merged)
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
        id: "users",
        titleTr: "Kullanıcılar",
        path: "/admin/kullanicilar",
        icon: "Users",
        moduleKey: "users",
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
        id: "content-studio",
        titleTr: "İçerik Stüdyosu",
        path: "/admin/icerik-studyosu",
        icon: "FileText",
        moduleKey: "admin_settings",
        scope: "hq",
      },
      {
        id: "settings",
        titleTr: "Ayarlar",
        path: "/admin/ayarlar",
        icon: "Settings",
        moduleKey: "settings",
        scope: "hq",
      },
      {
        id: "backup-security",
        titleTr: "Yedekleme",
        path: "/admin/yedekleme",
        icon: "HardDrive",
        moduleKey: "admin_settings",
        scope: "hq",
      },
      {
        id: "widget-editor",
        titleTr: "Widget Editör",
        path: "/admin/widget-editor",
        icon: "LayoutGrid",
        moduleKey: "admin_settings",
        scope: "hq",
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
    'branch-dashboard', 'tasks-list', 'checklists', 'faults',
    'training-academy', 'notifications', 'usage-guide', 'hq-support',
  ],
  stajyer: [
    'branch-dashboard', 'tasks-list', 'checklists',
    'training-academy', 'notifications', 'usage-guide', 'hq-support',
  ],
  bar_buddy: [
    'branch-dashboard', 'tasks-list', 'checklists', 'faults',
    'training-academy', 'notifications', 'usage-guide', 'hq-support',
  ],
  supervisor: [
    'branch-dashboard', 'tasks-list', 'checklists', 'shifts', 'equipment', 'faults',
    'hr', 'training-academy', 'notifications', 'usage-guide', 'hq-support', 'lost-found',
    'customer-satisfaction', 'ai-assistant',
  ],
  supervisor_buddy: [
    'branch-dashboard', 'tasks-list', 'checklists', 'shifts', 'equipment', 'faults',
    'hr', 'training-academy', 'notifications', 'usage-guide', 'hq-support', 'lost-found', 'ai-assistant',
  ],
  mudur: [
    'branch-dashboard', 'tasks-list', 'checklists', 'shifts', 'equipment', 'faults',
    'hr', 'branch-shift-tracking', 'attendance', 'reports', 'lost-found',
    'training-academy', 'notifications', 'usage-guide', 'hq-support',
    'branch-health', 'customer-satisfaction', 'ai-assistant',
  ],
  yatirimci_branch: [
    'branch-dashboard', 'tasks-list', 'checklists', 'shifts', 'hr', 'reports',
    'notifications', 'usage-guide', 'hq-support',
  ],
  ceo: [
    'dashboard', 'branches-list', 'reports', 'performance-dashboard', 'hr',
    'training-academy', 'knowledge-base', 'notifications', 'usage-guide',
    'branch-health', 'hq-support', 'messages', 'ai-assistant',
  ],
  cgo: [
    'dashboard', 'branches-list', 'reports', 'performance-dashboard', 'hr',
    'training-academy', 'knowledge-base', 'notifications', 'usage-guide',
    'branch-health', 'hq-support', 'messages', 'customer-satisfaction', 'ai-assistant',
  ],
  yatirimci_hq: [
    'dashboard', 'branches-list', 'reports', 'performance-dashboard',
    'notifications', 'usage-guide', 'hq-support',
  ],
  coach: [
    'dashboard', 'branches-list', 'hr', 'training-academy', 'reports',
    'branch-inspection', 'branch-health', 'notifications', 'usage-guide', 'hq-support', 'ai-assistant',
  ],
  destek: [
    'dashboard', 'branches-list', 'hr', 'training-academy', 'reports',
    'branch-inspection', 'branch-health', 'notifications', 'usage-guide', 'hq-support',
  ],
  trainer: [
    'dashboard', 'training-academy', 'knowledge-base', 'reports',
    'branches-list', 'notifications', 'usage-guide', 'hq-support', 'ai-assistant',
  ],
  kalite_kontrol: [
    'dashboard', 'quality-control', 'food-safety', 'equipment', 'faults',
    'product-complaints', 'reports', 'branch-health', 'branch-inspection',
    'notifications', 'usage-guide', 'hq-support',
  ],
  gida_muhendisi: [
    'dashboard', 'food-safety', 'quality-control', 'equipment', 'faults',
    'reports', 'notifications', 'usage-guide', 'hq-support',
  ],
  marketing: [
    'dashboard', 'content-studio', 'customer-satisfaction', 'campaign-management', 'reports',
    'branches-list', 'notifications', 'usage-guide', 'hq-support',
  ],
  muhasebe_ik: [
    'dashboard', 'hr', 'shifts', 'attendance', 'branch-shift-tracking',
    'accounting-main', 'financial-management', 'financial-reports', 'reports',
    'onboarding-programs', 'notifications', 'usage-guide', 'hq-support',
  ],
  muhasebe: [
    'dashboard', 'accounting-main', 'financial-management', 'financial-reports',
    'reports', 'notifications', 'usage-guide', 'hq-support',
  ],
  satinalma: [
    'dashboard', 'procurement-dashboard', 'stock-management', 'supplier-management',
    'order-management', 'goods-receipt', 'reports', 'notifications', 'usage-guide', 'hq-support',
  ],
  teknik: [
    'dashboard', 'equipment', 'faults', 'qr-scan', 'reports',
    'notifications', 'usage-guide', 'hq-support',
  ],
  fabrika_mudur: [
    'dashboard', 'factory-dashboard', 'factory-kiosk', 'factory-quality',
    'factory-stations', 'factory-analytics', 'factory-compliance',
    'notifications', 'usage-guide', 'hq-support',
  ],
  fabrika: [
    'factory-dashboard', 'factory-kiosk', 'factory-quality', 'factory-stations',
    'notifications', 'usage-guide', 'hq-support',
  ],
  fabrika_operator: [
    'factory-dashboard', 'factory-kiosk', 'factory-quality', 'factory-stations',
    'notifications', 'usage-guide', 'hq-support',
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

export function buildMenuForUser(
  user: { id: string; role: UserRoleType },
  badges: Record<string, number> = {},
  dynamicPermissions?: DynamicPermissions
): SidebarMenuResponse {
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
  const filteredSections: SidebarMenuSection[] = MENU_BLUEPRINT
    .filter(section => isScopeAllowed(section.scope, userScope))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!isScopeAllowed(item.scope, userScope)) return false;
        if (item.alwaysVisible) return true;
        if (!canAccessModule(role, item.moduleKey, dynamicPermissions)) return false;
        if (allowedItems && !allowedItems.includes(item.id)) return false;
        return true;
      }),
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
