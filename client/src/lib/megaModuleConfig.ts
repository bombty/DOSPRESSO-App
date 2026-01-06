import { 
  LayoutGrid, 
  Wrench, 
  Users, 
  GraduationCap, 
  ChefHat, 
  Factory, 
  BarChart3, 
  Building2, 
  Settings 
} from "lucide-react";

export interface MegaModuleConfig {
  id: string;
  title: string;
  icon: any;
  color: string;
}

export const MEGA_MODULE_CONFIG: Record<string, MegaModuleConfig> = {
  "operations": { id: "operations", title: "Operasyonlar", icon: LayoutGrid, color: "text-blue-500" },
  "equipment": { id: "equipment", title: "Ekipman & Bakım", icon: Wrench, color: "text-orange-500" },
  "hr": { id: "hr", title: "Personel & İK", icon: Users, color: "text-green-500" },
  "training": { id: "training", title: "Eğitim & Akademi", icon: GraduationCap, color: "text-purple-500" },
  "kitchen": { id: "kitchen", title: "Mutfak & Tarifler", icon: ChefHat, color: "text-amber-600" },
  "factory": { id: "factory", title: "Fabrika & Üretim", icon: Factory, color: "text-slate-600" },
  "reports": { id: "reports", title: "Raporlar & Analitik", icon: BarChart3, color: "text-cyan-500" },
  "newshop": { id: "newshop", title: "Yeni Şube Açılış", icon: Building2, color: "text-rose-500" },
  "admin": { id: "admin", title: "Yönetim & Ayarlar", icon: Settings, color: "text-gray-500" },
};

export const MEGA_MODULE_ORDER = [
  "operations", "equipment", "hr", "training", "kitchen", "factory", "reports", "newshop", "admin"
];

export const DEFAULT_MENU_SECTION_MAPPING: Record<string, string[]> = {
  "operations": [
    "dashboard-hq", "dashboard-branch", "operations", "branch-management",
    "tasks", "tasks-hq", "tasks-branch", "tasks-section", "operations-hq", "operations-branch",
    "checklists", "checklists-hq", "checklists-branch", "checklists-section",
    "dashboard", "lost-found", "lost-found-hq",
    "operasyon", "subeler"
  ],
  "equipment": [
    "equipment-maintenance",
    "equipment", "equipment-hq", "equipment-branch", "equipment-section",
    "faults", "faults-hq", "faults-branch", "faults-section",
    "maintenance", "maintenance-hq", "maintenance-section",
    "qr-scan"
  ],
  "hr": [
    "hr-shifts", "finance",
    "hr", "hr-hq", "hr-branch", "hr-section", "personel", "personel-section",
    "shifts", "shifts-hq", "shifts-branch", "shifts-section",
    "attendance", "attendance-section", "payroll", "payroll-section",
    "branch-shift-tracking",
    "vardiya", "vardiyalar", "ik", "finans"
  ],
  "training": [
    "training-academy",
    "academy", "academy-hq", "academy-section", "training", "training-section",
    "quizzes", "quizzes-section", "knowledge-base",
    "egitim", "akademi"
  ],
  "kitchen": [
    "kitchen",
    "recipes", "recipes-section", "menu", "menu-section",
    "tarifler", "mutfak"
  ],
  "factory": [
    "factory",
    "production", "production-section", "factory-section",
    "quality-control", "waste-management",
    "fabrika", "uretim"
  ],
  "reports": [
    "analytics-reports", "quality-customer",
    "reports", "reports-section", "analytics", "analytics-section",
    "audits", "audit-section", "feedback", "customer-feedback",
    "raporlar", "denetimler"
  ],
  "newshop": [
    "projects",
    "new-shop", "new-shop-section", "projects-section",
    "yeni-sube", "projeler"
  ],
  "admin": [
    "management", "communication",
    "admin", "admin-section", "settings", "settings-section",
    "users", "users-section", "roles", "announcements", "support",
    "yonetim", "ayarlar", "kullanicilar"
  ],
};

export const DEFAULT_PERMISSION_MODULE_MAPPING: Record<string, string[]> = {
  "operations": ["dashboard", "tasks", "checklists", "branches", "lost_found", "lost_found_hq", "canli_takip", "qr_tara", "nfc_giris"],
  "equipment": ["equipment", "faults", "equipment_analytics"],
  "hr": ["shifts", "shift_planning", "hr", "attendance", "leave_requests", "accounting", "personel_onboarding", "mesai_talepleri"],
  "training": ["academy.general", "academy.hq", "academy.analytics", "academy.badges", "academy.certificates", "academy.leaderboard", "academy.quizzes", "academy.learning_paths", "academy.ai", "academy.social", "academy.supervisor", "bilgi_bankasi"],
  "kitchen": ["recipes", "menu", "tarifler"],
  "factory": ["factory_kiosk", "factory_dashboard", "factory_quality", "factory_analytics", "factory_ai_reports", "factory_stations", "factory_waste_reasons", "factory_pins", "factory_compliance", "factory_uretim_planlama", "factory_vardiya_uyumluluk"],
  "reports": ["reports", "e2e_reports", "cash_reports", "hr_reports", "quality_audit", "audit_templates", "capa", "denetimler", "misafir_memnuniyeti", "sikayetler"],
  "newshop": ["projects", "new_branch_projects", "kampanya_yonetimi"],
  "admin": ["settings", "bulk_data", "users", "menu_management", "content_management", "admin_panel", "authorization", "support", "hq_destek", "notifications", "announcements", "messages", "ai_asistan", "banner_editor", "aktivite_loglari", "email_ayarlari", "ai_ayarlari", "yedekleme"],
};

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
  const legacyMapping = localStorage.getItem(MENU_MAPPING_KEY);
  return legacyMapping ? JSON.parse(legacyMapping) : DEFAULT_PERMISSION_MODULE_MAPPING;
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
