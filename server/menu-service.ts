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
// Konsolide edilmiş 10 ana kategori yapısı
// ========================================

const MENU_BLUEPRINT: SidebarMenuSection[] = [
  // ========================================
  // 1. KONTROL PANELİ (Dashboard)
  // ========================================
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

  // ========================================
  // 2. FABRİKA OPERASYONLARİ (Tek grup altında)
  // ========================================
  {
    id: "fabrika",
    titleTr: "Fabrika Operasyonları",
    icon: "Factory",
    scope: "hq",
    items: [
      {
        id: "factory-dashboard",
        titleTr: "Fabrika Paneli",
        path: "/fabrika/dashboard",
        icon: "LayoutDashboard",
        moduleKey: "factory_dashboard",
        scope: "hq",
      },
      {
        id: "factory-kiosk",
        titleTr: "Giriş/Çıkış Kiosk",
        path: "/fabrika/kiosk",
        icon: "Tablet",
        moduleKey: "factory_kiosk",
        scope: "hq",
      },
      {
        id: "factory-quality",
        titleTr: "Kalite Kontrol",
        path: "/fabrika/kalite-kontrol",
        icon: "Shield",
        moduleKey: "factory_quality",
        scope: "hq",
      },
      {
        id: "factory-stations",
        titleTr: "Üretim İstasyonları",
        path: "/fabrika/istasyonlar",
        icon: "Grid",
        moduleKey: "factory_stations",
        scope: "hq",
      },
      {
        id: "factory-analytics",
        titleTr: "Performans Analitik",
        path: "/fabrika/analitik",
        icon: "BarChart3",
        moduleKey: "factory_analytics",
        scope: "hq",
      },
      {
        id: "factory-compliance",
        titleTr: "Vardiya Uyumluluk",
        path: "/fabrika/vardiya-uyumluluk",
        icon: "Clock",
        moduleKey: "factory_compliance",
        scope: "hq",
      },
    ],
  },

  // ========================================
  // 3. EKİPMAN & BAKIM (Ekipman + Arıza + Bakım birleşik)
  // ========================================
  {
    id: "equipment-maintenance",
    titleTr: "Ekipman & Bakım",
    icon: "Wrench",
    scope: "both",
    items: [
      {
        id: "equipment",
        titleTr: "Ekipman Listesi",
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
        moduleKey: "faults",
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
    ],
  },

  // ========================================
  // 4. ŞUBE YÖNETİMİ
  // ========================================
  {
    id: "branch-management",
    titleTr: "Şube Yönetimi",
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

  // ========================================
  // 5. OPERASYON YÖNETİMİ (Görevler, Checklistler, Lost&Found)
  // ========================================
  {
    id: "operations",
    titleTr: "Operasyon Yönetimi",
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
      {
        id: "lost-found",
        titleTr: "Lost & Found",
        path: "/kayip-esya",
        icon: "Briefcase",
        moduleKey: "lost_found",
        scope: "branch",
      },
      {
        id: "lost-found-hq",
        titleTr: "Lost & Found (Tüm Şubeler)",
        path: "/kayip-esya-hq",
        icon: "Briefcase",
        moduleKey: "lost_found_hq",
        scope: "hq",
      },
    ],
  },

  // ========================================
  // 6. İK & VARDİYA (HR, Vardiya, Puantaj birleşik)
  // ========================================
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
        titleTr: "Vardiya Planlama",
        path: "/vardiyalar",
        icon: "Calendar",
        moduleKey: "shifts",
        scope: "both",
      },
      {
        id: "branch-shift-tracking",
        titleTr: "Şube Puantaj",
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
    ],
  },

  // ========================================
  // 7. EĞİTİM & AKADEMİ
  // ========================================
  {
    id: "training-academy",
    titleTr: "Eğitim & Akademi",
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

  // ========================================
  // 8. ANALİTİK & RAPORLAR
  // ========================================
  {
    id: "analytics-reports",
    titleTr: "Analitik & Raporlar",
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
        moduleKey: "reports",
        scope: "both",
      },
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

  // ========================================
  // 9. KALİTE & MÜŞTERİ DENEYİMİ
  // ========================================
  {
    id: "quality-customer",
    titleTr: "Kalite & Misafir",
    icon: "Star",
    scope: "hq",
    items: [
      {
        id: "quality-control",
        titleTr: "Kalite Kontrol",
        path: "/kalite",
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
    ],
  },

  // ========================================
  // 10. FİNANS & MUHASEBE
  // ========================================
  {
    id: "finance",
    titleTr: "Finans & Muhasebe",
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

  // ========================================
  // 11. PROJELER
  // ========================================
  {
    id: "projects",
    titleTr: "Projeler",
    icon: "FolderKanban",
    scope: "hq",
    items: [
      {
        id: "project-list",
        titleTr: "Yeni Açılışlar",
        path: "/projeler",
        icon: "FolderKanban",
        moduleKey: "projects",
        scope: "hq",
      },
    ],
  },

  // ========================================
  // 12. DESTEK & BİLDİRİMLER
  // ========================================
  {
    id: "communication",
    titleTr: "Destek & İletişim",
    icon: "MessageSquare",
    scope: "both",
    items: [
      {
        id: "hq-support",
        titleTr: "HQ Destek",
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
    ],
  },

  // ========================================
  // 13. YÖNETİM & AYARLAR (Admin only)
  // ========================================
  {
    id: "management",
    titleTr: "Yönetim & Ayarlar",
    icon: "Settings",
    scope: "hq",
    items: [
      {
        id: "users",
        titleTr: "Kullanıcılar",
        path: "/yonetim/kullanicilar",
        icon: "Users",
        moduleKey: "users",
        scope: "hq",
      },
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
        id: "settings",
        titleTr: "Sistem Ayarları",
        path: "/yonetim/ayarlar",
        icon: "Settings",
        moduleKey: "settings",
        scope: "hq",
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

// Export menu blueprint for seeding
export { MENU_BLUEPRINT };
