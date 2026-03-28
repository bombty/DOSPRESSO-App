import {
  Users, Clock, CreditCard, Calendar, FileText, Shield, UserPlus,
  CheckSquare, ClipboardList, FolderKanban, ClipboardCheck,
  Factory, Beaker, Package, TrendingUp, Wrench, BarChart3,
  MessageSquare, Star, UserCheck,
  BookOpen, Video, Target, Award,
  Building2, Settings, Bell, Search,
  BarChart2, FileBarChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ModuleMenuItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface ModuleMenuConfig {
  title: string;
  items: ModuleMenuItem[];
}

// ─── MODÜL ALT MENÜ TANIMLARI ─────────────────────

const IK_MENU: ModuleMenuConfig = {
  title: "İK & Personel",
  items: [
    { id: "personel", label: "Personel", path: "/ik", icon: Users },
    { id: "vardiya", label: "Vardiya Planlama", path: "/vardiya-planlama", icon: Clock },
    { id: "pdks", label: "PDKS & Devam", path: "/pdks", icon: Calendar },
    { id: "bordro", label: "Bordro", path: "/bordrom", icon: CreditCard },
    { id: "izinler", label: "İzin Yönetimi", path: "/izin-yonetimi", icon: Calendar },
    { id: "disiplin", label: "Disiplin", path: "/ik", icon: Shield },
    { id: "onboarding", label: "Onboarding", path: "/ik", icon: UserPlus },
    { id: "performans", label: "Performans", path: "/performansim", icon: TrendingUp },
  ],
};

const OPERASYON_MENU: ModuleMenuConfig = {
  title: "Operasyon",
  items: [
    { id: "gorevler", label: "Görevler", path: "/gorevler", icon: CheckSquare },
    { id: "checklistler", label: "Checklistler", path: "/checklistler", icon: ClipboardList },
    { id: "projeler", label: "Projeler", path: "/projeler", icon: FolderKanban },
    { id: "denetimler", label: "Denetimler", path: "/denetimler", icon: ClipboardCheck },
    { id: "bildirimler", label: "Bildirimler", path: "/bildirimler", icon: Bell },
  ],
};

const FABRIKA_MENU: ModuleMenuConfig = {
  title: "Fabrika",
  items: [
    { id: "dashboard", label: "Dashboard", path: "/fabrika/dashboard", icon: Factory },
    { id: "kalite", label: "Kalite Kontrol", path: "/fabrika/kalite-kontrol", icon: Beaker },
    { id: "kavurma", label: "Kavurma", path: "/fabrika/kavurma", icon: Factory },
    { id: "lot", label: "Lot İzleme", path: "/fabrika/lot-izleme", icon: Package },
    { id: "maliyet", label: "Maliyet", path: "/fabrika/maliyet-yonetimi", icon: CreditCard },
    { id: "gida", label: "Gıda Güvenliği", path: "/fabrika/gida-guvenligi", icon: Shield },
    { id: "ekipman", label: "Ekipman", path: "/ekipman", icon: Wrench },
  ],
};

const CRM_MENU: ModuleMenuConfig = {
  title: "Müşteri & CRM",
  items: [
    { id: "crm", label: "CRM", path: "/crm", icon: MessageSquare },
    { id: "yatirimcilar", label: "Yatırımcılar", path: "/crm", icon: Star },
    { id: "misafir", label: "Misafir Memnuniyeti", path: "/misafir-memnuniyeti", icon: UserCheck },
    { id: "destek", label: "Destek Talepleri", path: "/destek", icon: MessageSquare },
  ],
};

const AKADEMI_MENU: ModuleMenuConfig = {
  title: "Akademi & Eğitim",
  items: [
    { id: "anasayfa", label: "Ana Sayfa", path: "/akademi", icon: BookOpen },
    { id: "egitimler", label: "Eğitimler", path: "/akademi", icon: BookOpen },
    { id: "webinar", label: "Webinar", path: "/akademi", icon: Video },
    { id: "kariyer", label: "Kariyer Yolu", path: "/akademi", icon: Target },
    { id: "sertifikalar", label: "Sertifikalar", path: "/akademi-certificates", icon: Award },
    { id: "liderlik", label: "Liderlik Tablosu", path: "/akademi-leaderboard", icon: BarChart3 },
    { id: "bilgi", label: "Bilgi Bankası", path: "/bilgi-bankasi", icon: Search },
  ],
};

const SUBELER_MENU: ModuleMenuConfig = {
  title: "Şubeler",
  items: [
    { id: "liste", label: "Şube Listesi", path: "/subeler", icon: Building2 },
    { id: "denetim", label: "Şube Denetim", path: "/coach-sube-denetim", icon: ClipboardCheck },
    { id: "stok", label: "Stok Yönetimi", path: "/sube-stok", icon: Package },
    { id: "canli", label: "Canlı Takip", path: "/canli-takip", icon: TrendingUp },
  ],
};

const RAPORLAR_MENU: ModuleMenuConfig = {
  title: "Raporlar",
  items: [
    { id: "genel", label: "Raporlar", path: "/raporlar", icon: BarChart2 },
    { id: "gelismis", label: "Gelişmiş Raporlar", path: "/gelismis-raporlar", icon: FileBarChart },
    { id: "e2e", label: "E2E Raporlar", path: "/e2e-raporlar", icon: BarChart3 },
  ],
};

const YONETIM_MENU: ModuleMenuConfig = {
  title: "Yönetim",
  items: [
    { id: "ayarlar", label: "Dashboard Ayarları", path: "/admin/dashboard-ayarlari", icon: Settings },
    { id: "kullanicilar", label: "Yetkilendirme", path: "/admin/yetkilendirme", icon: Users },
    { id: "loglar", label: "Aktivite Logları", path: "/admin/aktivite-loglari", icon: FileText },
    { id: "bannerlar", label: "Bannerlar", path: "/admin/bannerlar", icon: FileText },
    { id: "delegasyon", label: "Delegasyon", path: "/admin/delegasyon", icon: UserCheck },
    { id: "ajanda", label: "Ajanda", path: "/ajanda", icon: Calendar },
  ],
};

const BENIM_GUNUM_MENU: ModuleMenuConfig = {
  title: "Benim Günüm",
  items: [
    { id: "gunum", label: "Benim Günüm", path: "/benim-gunum", icon: Clock },
    { id: "vardiya", label: "Vardiyam", path: "/vardiya-planlama", icon: Calendar },
    { id: "gorevler", label: "Görevlerim", path: "/gorevler", icon: CheckSquare },
    { id: "akademi", label: "Akademi", path: "/akademi", icon: BookOpen },
    { id: "profil", label: "Profilim", path: "/profil", icon: Users },
  ],
};

// ─── ROUTE → MODÜL EŞLEŞTİRME ─────────────────────
// URL path prefix → hangi modül menüsü gösterilecek

const ROUTE_MODULE_MAP: Array<{ prefix: string; config: ModuleMenuConfig }> = [
  { prefix: "/ik", config: IK_MENU },
  { prefix: "/personel", config: IK_MENU },
  { prefix: "/vardiya", config: IK_MENU },
  { prefix: "/pdks", config: IK_MENU },
  { prefix: "/bordro", config: IK_MENU },
  { prefix: "/izin", config: IK_MENU },
  { prefix: "/devam-takibi", config: IK_MENU },
  { prefix: "/performans", config: IK_MENU },
  { prefix: "/gorev", config: OPERASYON_MENU },
  { prefix: "/checklist", config: OPERASYON_MENU },
  { prefix: "/proje", config: OPERASYON_MENU },
  { prefix: "/denetim", config: OPERASYON_MENU },
  { prefix: "/bildirim", config: OPERASYON_MENU },
  { prefix: "/fabrika", config: FABRIKA_MENU },
  { prefix: "/ekipman", config: FABRIKA_MENU },
  { prefix: "/ariza", config: FABRIKA_MENU },
  { prefix: "/crm", config: CRM_MENU },
  { prefix: "/misafir", config: CRM_MENU },
  { prefix: "/destek", config: CRM_MENU },
  { prefix: "/akademi", config: AKADEMI_MENU },
  { prefix: "/egitim", config: AKADEMI_MENU },
  { prefix: "/bilgi-bankasi", config: AKADEMI_MENU },
  { prefix: "/subeler", config: SUBELER_MENU },
  { prefix: "/sube-stok", config: SUBELER_MENU },
  { prefix: "/coach-sube", config: SUBELER_MENU },
  { prefix: "/canli-takip", config: SUBELER_MENU },
  { prefix: "/rapor", config: RAPORLAR_MENU },
  { prefix: "/gelismis-rapor", config: RAPORLAR_MENU },
  { prefix: "/e2e-rapor", config: RAPORLAR_MENU },
  { prefix: "/admin", config: YONETIM_MENU },
  { prefix: "/yonetim", config: YONETIM_MENU },
  { prefix: "/ajanda", config: YONETIM_MENU },
  { prefix: "/benim-gunum", config: BENIM_GUNUM_MENU },
  { prefix: "/profil", config: BENIM_GUNUM_MENU },
];

/**
 * Returns the module menu config for a given path, or null if no module sidebar needed.
 * Home (/), Control (/control), and unmatched paths return null.
 */
export function getModuleMenuForPath(path: string): ModuleMenuConfig | null {
  if (path === "/" || path === "/control" || path === "/control-legacy") return null;
  
  for (const entry of ROUTE_MODULE_MAP) {
    if (path === entry.prefix || path.startsWith(entry.prefix + "/") || path.startsWith(entry.prefix + "?")) {
      return entry.config;
    }
  }
  
  return null;
}

/**
 * Returns the active menu item ID for a given path.
 */
export function getActiveMenuItemForPath(path: string): string | null {
  const config = getModuleMenuForPath(path);
  if (!config) return null;
  
  // Exact match first
  const exact = config.items.find(item => item.path === path);
  if (exact) return exact.id;
  
  // Prefix match
  const prefix = config.items.find(item => path.startsWith(item.path + "/") || path.startsWith(item.path + "?"));
  if (prefix) return prefix.id;
  
  // Default to first item
  return config.items[0]?.id || null;
}
