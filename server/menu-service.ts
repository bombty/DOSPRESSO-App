import { 
  SidebarMenuSection, 
  SidebarMenuResponse, 
  SidebarMenuScope,
  UserRoleType,
  isHQRole,
  isBranchRole,
  PERMISSIONS,
  PermissionModule
} from "@shared/schema";

// ========================================
// STATIC MENU BLUEPRINT
// Single source of truth for all menu items
// ========================================

const MENU_BLUEPRINT: SidebarMenuSection[] = [
  // HQ-Only: Dashboard
  {
    id: "dashboard-hq",
    titleTr: "Kontrol Paneli",
    icon: "LayoutDashboard",
    scope: "hq",
    items: [
      {
        id: "dashboard",
        titleTr: "Kontrol Paneli",
        path: "/",
        icon: "LayoutDashboard",
        moduleKey: "dashboard",
        scope: "hq",
      },
    ],
  },
  // Branch-Only: Dashboard
  {
    id: "dashboard-branch",
    titleTr: "",
    icon: "Home",
    scope: "branch",
    items: [
      {
        id: "branch-dashboard",
        titleTr: "Ana Sayfa",
        path: "/sube-dashboard",
        icon: "Home",
        moduleKey: "dashboard",
        scope: "branch",
      },
    ],
  },
  // HQ-Only: Branches
  {
    id: "branches",
    titleTr: "Şubeler",
    icon: "Building2",
    scope: "hq",
    items: [
      {
        id: "branches-list",
        titleTr: "Şubeler",
        path: "/subeler",
        icon: "Building2",
        moduleKey: "branches",
        scope: "hq",
      },
    ],
  },
  // Both: Operations
  {
    id: "operations",
    titleTr: "Operasyon",
    icon: "Wrench",
    scope: "both",
    items: [
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
        titleTr: "Arıza Yönetimi",
        path: "/ariza",
        icon: "AlertTriangle",
        moduleKey: "equipment_faults",
        scope: "both",
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
        titleTr: "Lost&Found",
        path: "/kayip-esya",
        icon: "Briefcase",
        moduleKey: "equipment",
        scope: "branch",
      },
      {
        id: "lost-found-hq",
        titleTr: "Lost&Found (Tüm Şubeler)",
        path: "/kayip-esya-hq",
        icon: "Briefcase",
        moduleKey: "equipment",
        scope: "hq",
      },
    ],
  },
  // Both: Tasks
  {
    id: "tasks",
    titleTr: "Görevler",
    icon: "CheckSquare",
    scope: "both",
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
        titleTr: "Checklistler",
        path: "/checklistler",
        icon: "ClipboardList",
        moduleKey: "checklists",
        scope: "both",
      },
    ],
  },
  // Both: Training & Knowledge
  {
    id: "training",
    titleTr: "Eğitim & Bilgi",
    icon: "GraduationCap",
    scope: "both",
    items: [
      {
        id: "training-academy",
        titleTr: "Eğitim Akademisi",
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
  // Both: HR & Shifts
  {
    id: "hr-shifts",
    titleTr: "İK & Vardiya",
    icon: "Users",
    scope: "both",
    items: [
      {
        id: "hr",
        titleTr: "İK Yönetimi",
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
        moduleKey: "schedules",
        scope: "both",
      },
    ],
  },
  // Both: Performance
  {
    id: "performance",
    titleTr: "Performans",
    icon: "BarChart3",
    scope: "both",
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
        moduleKey: "performance",
        scope: "both",
      },
    ],
  },
  // Both: Accounting (Muhasebe)
  {
    id: "accounting",
    titleTr: "Muhasebe",
    icon: "Calculator",
    scope: "both",
    items: [
      {
        id: "accounting-main",
        titleTr: "Muhasebe",
        path: "/muhasebe",
        icon: "Calculator",
        moduleKey: "accounting",
        scope: "both",
      },
    ],
  },
  // HQ-Only: Quality
  {
    id: "quality",
    titleTr: "Kalite & Gelişim",
    icon: "Star",
    scope: "hq",
    items: [
      {
        id: "quality-control",
        titleTr: "Kalite Kontrol",
        path: "/kalite",
        icon: "Star",
        moduleKey: "dashboard",
        scope: "hq",
      },
    ],
  },
  // HQ-Only: AI Assistant
  {
    id: "ai-assistant",
    titleTr: "AI Asistan",
    icon: "Bot",
    scope: "hq",
    items: [
      {
        id: "ai-chat",
        titleTr: "AI Asistan",
        path: "/ai-asistan",
        icon: "Bot",
        moduleKey: "ai_assistant",
        scope: "hq",
      },
    ],
  },
  // HQ-Only: Projects
  {
    id: "projects",
    titleTr: "Projeler",
    icon: "FolderKanban",
    scope: "hq",
    items: [
      {
        id: "project-list",
        titleTr: "Projeler",
        path: "/projeler",
        icon: "FolderKanban",
        moduleKey: "dashboard",
        scope: "hq",
      },
    ],
  },
  // HQ-Only: Management
  {
    id: "management",
    titleTr: "Yönetim / Ayarlar",
    icon: "Settings",
    scope: "hq",
    items: [
      {
        id: "announcements",
        titleTr: "Duyurular",
        path: "/admin/duyurular",
        icon: "Megaphone",
        moduleKey: "admin_settings",
        scope: "hq",
      },
      {
        id: "bulk-data",
        titleTr: "Toplu Veri Yönetimi",
        path: "/admin/toplu-veri-yonetimi",
        icon: "Database",
        moduleKey: "admin_settings",
        scope: "hq",
      },
      {
        id: "users",
        titleTr: "Kullanıcılar",
        path: "/yonetim/kullanicilar",
        icon: "Users",
        moduleKey: "users",
        scope: "hq",
      },
      {
        id: "settings",
        titleTr: "Ayarlar",
        path: "/yonetim/ayarlar",
        icon: "Settings",
        moduleKey: "admin_settings",
        scope: "hq",
      },
    ],
  },
  // Both: Communication (standalone items style)
  {
    id: "communication",
    titleTr: "İletişim",
    icon: "MessageSquare",
    scope: "both",
    items: [
      {
        id: "notifications",
        titleTr: "Bildirimler",
        path: "/bildirimler",
        icon: "Bell",
        moduleKey: "dashboard",
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
        id: "hq-support",
        titleTr: "HQ Destek",
        path: "/hq-destek",
        icon: "Wrench",
        moduleKey: "dashboard",
        scope: "both",
      },
    ],
  },
];

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
  const normalizedRole = role.trim().toLowerCase();
  const normalizedModuleKey = moduleKey.trim().toLowerCase();
  
  // If dynamic permissions exist for this role, use ONLY dynamic permissions (no static fallback)
  // This ensures that when permissions are revoked in the database, modules are hidden
  if (dynamicPermissions && dynamicPermissions.length > 0) {
    const dynamicPerm = dynamicPermissions.find(
      p => p.role.trim().toLowerCase() === normalizedRole && 
           p.module.trim().toLowerCase() === normalizedModuleKey
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
  } else if (isBranchRole(role)) {
    userScope = 'branch';
  } else if (isHQRole(role)) {
    userScope = 'hq';
  } else {
    userScope = 'branch'; // Default fallback
  }

  // Filter sections by scope
  const filteredSections: SidebarMenuSection[] = MENU_BLUEPRINT
    .filter(section => isScopeAllowed(section.scope, userScope))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Check scope
        if (!isScopeAllowed(item.scope, userScope)) return false;
        // Check module permission (with dynamic permissions support)
        if (!canAccessModule(role, item.moduleKey, dynamicPermissions)) return false;
        return true;
      }),
    }))
    .filter(section => section.items.length > 0); // Remove empty sections

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

// Session-based memoization (optional performance optimization)
const menuCache = new Map<string, { data: SidebarMenuResponse; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export function getCachedMenuForUser(
  user: { id: string; role: UserRoleType },
  badges: Record<string, number> = {}
): SidebarMenuResponse {
  const cacheKey = `${user.id}:${user.role}`;
  const cached = menuCache.get(cacheKey);
  
  // Check if valid cache exists (without badges - badges always fresh)
  if (cached && cached.expires > Date.now()) {
    // Update badges in cached response
    return {
      ...cached.data,
      badges,
      meta: {
        ...cached.data.meta,
        timestamp: Date.now(),
      },
    };
  }
  
  // Build fresh menu
  const menu = buildMenuForUser(user, badges);
  
  // Cache it
  menuCache.set(cacheKey, {
    data: menu,
    expires: Date.now() + CACHE_TTL,
  });
  
  return menu;
}

// Clear cache for a specific user (call after role change)
export function invalidateMenuCache(userId: string): void {
  const keysToDelete = Array.from(menuCache.keys()).filter(key => key.startsWith(userId + ':'));
  keysToDelete.forEach(key => menuCache.delete(key));
}

// Clear all menu cache
export function clearAllMenuCache(): void {
  menuCache.clear();
}
