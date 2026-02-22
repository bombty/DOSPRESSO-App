import { 
  LayoutDashboard,
  ClipboardCheck,
  Wrench, 
  Users, 
  GraduationCap, 
  Factory, 
  BarChart3, 
  Building2, 
  Settings,
  ShoppingCart,
  Coffee
} from "lucide-react";
import { MEGA_MODULES, getMegaModuleMapping, type MegaModuleId } from "@shared/modules-registry";

export interface MegaModuleConfig {
  id: string;
  title: string;
  icon: any;
  color: string;
}

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  ClipboardCheck,
  Wrench,
  Users,
  GraduationCap,
  Factory,
  BarChart3,
  Building2,
  Settings,
  ShoppingCart,
  Coffee,
};

const COLOR_MAP: Record<string, string> = {
  'bg-slate-500': 'text-slate-500',
  'bg-green-500': 'text-green-500',
  'bg-orange-500': 'text-orange-500',
  'bg-pink-500': 'text-pink-500',
  'bg-blue-500': 'text-blue-500',
  'bg-indigo-600': 'text-indigo-600',
  'bg-cyan-500': 'text-cyan-500',
  'bg-violet-600': 'text-violet-600',
  'bg-slate-600': 'text-slate-600',
  'bg-amber-500': 'text-amber-500',
  'bg-amber-600': 'text-amber-600',
};

export const MEGA_MODULE_CONFIG: Record<string, MegaModuleConfig> = Object.fromEntries(
  Object.entries(MEGA_MODULES).map(([key, mod]) => [
    key,
    {
      id: mod.id,
      title: mod.title,
      icon: ICON_MAP[mod.icon] || LayoutDashboard,
      color: COLOR_MAP[mod.color] || 'text-gray-500',
    }
  ])
);

export const MEGA_MODULE_ORDER = Object.values(MEGA_MODULES)
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map(m => m.id);

export const DEFAULT_MENU_SECTION_MAPPING: Record<string, string[]> = {
  "dashboard": ["dashboard", "dashboard-hq", "dashboard-branch", "branch-dashboard"],
  "operations": [
    "operations", "branch-management", "branches-list",
    "tasks", "tasks-hq", "tasks-branch", "tasks-section", "tasks-list",
    "checklists", "checklists-hq", "checklists-branch", "checklists-section", "checklist-management",
    "lost-found", "lost-found-hq",
    "operasyon", "subeler"
  ],
  "equipment": [
    "equipment-maintenance", "equipment-management", "equipment-service",
    "equipment", "equipment-hq", "equipment-branch", "equipment-section",
    "faults", "faults-hq", "faults-branch", "faults-section",
    "maintenance", "maintenance-hq", "maintenance-section",
    "qr-scan", "service-requests"
  ],
  "hr": [
    "hr-shifts", "finance", "hr",
    "hr-hq", "hr-branch", "hr-section", "personel", "personel-section",
    "shifts", "shifts-hq", "shifts-branch", "shifts-section",
    "attendance", "attendance-section", "payroll", "payroll-section",
    "branch-shift-tracking", "accounting-main", "performance-dashboard",
    "vardiya", "vardiyalar", "ik", "finans"
  ],
  "training": [
    "training-academy", "academy-management",
    "academy", "academy-hq", "academy-section", "training", "training-section",
    "quizzes", "quizzes-section", "knowledge-base",
    "egitim", "akademi", "bilgi-bankasi"
  ],
  "kitchen": [
    "kitchen", "kitchen-section", "recipes", "recipes-section",
    "mutfak", "receteler"
  ],
  "factory": [
    "factory", "factory-section", "fabrika",
    "factory-dashboard", "factory-kiosk", "factory-quality", "factory-stations",
    "factory-analytics", "factory-compliance", "factory-quality-criteria",
    "factory-stations-admin", "factory-waste-reasons", "factory-pin-management",
    "production", "production-section", "quality-control", "waste-management",
    "uretim"
  ],
  "waste": [
    "waste", "waste-management", "zai-fire", "zai", "fire",
    "waste-entry", "waste-coach", "waste-trainer", "waste-qc", "waste-executive"
  ],
  "reports": [
    "analytics-reports", "quality-customer", "customer-satisfaction",
    "reports", "reports-section", "analytics", "analytics-section",
    "audits", "audit-section", "feedback", "customer-feedback",
    "raporlar", "denetimler", "kalite"
  ],
  "newshop": [
    "projects", "projeler", "project-list",
    "new-shop", "new-shop-section", "projects-section",
    "yeni-sube"
  ],
  "satinalma": [
    "satinalma", "satinalma-section", "procurement",
    "inventory", "stok-yonetimi", "stock-management",
    "suppliers", "tedarikci-yonetimi", "supplier-management",
    "purchase-orders", "siparis-yonetimi", "orders",
    "goods-receipt", "mal-kabul", "receiving"
  ],
  "admin": [
    "management", "communication", "content-management",
    "admin", "admin-section", "settings", "settings-section",
    "users", "users-section", "roles", "role-permissions", "authorization",
    "announcements", "banners", "support", "hq-support",
    "email-settings", "ai-settings", "ai-chat", "ai-costs",
    "backup", "activity-logs", "bulk-data", "quality-templates",
    "menu-management", "messages", "notifications", "service-mail-settings",
    "yonetim", "ayarlar", "kullanicilar", "destek"
  ],
};

export const DEFAULT_PERMISSION_MODULE_MAPPING: Record<string, string[]> = getMegaModuleMapping();

const MENU_MAPPING_KEY = "megaModuleMappings";
const PERMISSION_MAPPING_KEY = "megaModulePermissionMappings";
const MEGA_MODULE_TITLES_KEY = "megaModuleTitles";

export function getMenuSectionMapping(): Record<string, string[]> {
  if (typeof window === "undefined") return DEFAULT_MENU_SECTION_MAPPING;
  const saved = localStorage.getItem(MENU_MAPPING_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_MENU_SECTION_MAPPING;
}

export function setMenuSectionMapping(mapping: Record<string, string[]>): void {
  localStorage.setItem(MENU_MAPPING_KEY, JSON.stringify(mapping));
}

export function getPermissionModuleMapping(): Record<string, string[]> {
  if (typeof window === "undefined") return DEFAULT_PERMISSION_MODULE_MAPPING;
  const saved = localStorage.getItem(PERMISSION_MAPPING_KEY);
  if (saved) return JSON.parse(saved);
  return DEFAULT_PERMISSION_MODULE_MAPPING;
}

export function setPermissionModuleMapping(mapping: Record<string, string[]>): void {
  localStorage.setItem(PERMISSION_MAPPING_KEY, JSON.stringify(mapping));
}

export function getMegaModuleTitles(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const saved = localStorage.getItem(MEGA_MODULE_TITLES_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function setMegaModuleTitles(titles: Record<string, string>): void {
  localStorage.setItem(MEGA_MODULE_TITLES_KEY, JSON.stringify(titles));
}

export function resetMegaModuleConfig(): void {
  localStorage.removeItem(MENU_MAPPING_KEY);
  localStorage.removeItem(PERMISSION_MAPPING_KEY);
  localStorage.removeItem(MEGA_MODULE_TITLES_KEY);
  localStorage.removeItem("customModuleLabels");
}

export function matchesMegaModule(sectionId: string, mappedIds: string[]): boolean {
  const normalizedSectionId = sectionId.toLowerCase().replace(/-/g, "_");
  return mappedIds.some(mappedId => {
    const normalizedMappedId = mappedId.toLowerCase().replace(/-/g, "_");
    return normalizedSectionId === normalizedMappedId ||
           normalizedSectionId.startsWith(normalizedMappedId + "_") ||
           normalizedSectionId.includes(normalizedMappedId);
  });
}
