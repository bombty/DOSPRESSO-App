import {
  Users, Clock, CreditCard, Calendar, FileText, Shield, UserPlus,
  CheckSquare, ClipboardList, FolderKanban, ClipboardCheck,
  Factory, Beaker, Package, TrendingUp, Wrench, BarChart3,
  MessageSquare, Star, UserCheck,
  BookOpen, Video, Target, Award,
  Building2, Settings, Bell, Search,
  BarChart2, FileBarChart, Sun, User, Briefcase,
  Home, Wallet, Headphones, Megaphone, GraduationCap, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ModuleMenuItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Optional: only show this item to these roles. If omitted, all roles see it. */
  allowedRoles?: string[];
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
    { id: "pdks-import", label: "Excel İçe Aktar", path: "/pdks-excel-import", icon: FileBarChart },
    { id: "bordro", label: "Bordro", path: "/bordrom", icon: CreditCard },
    { id: "izinler", label: "İzin Yönetimi", path: "/izin-talepleri", icon: Calendar },
    { id: "mesai", label: "Mesai Talepleri", path: "/mesai-talepleri", icon: Clock },
    { id: "onboarding", label: "Onboarding", path: "/personel-onboarding", icon: UserPlus },
    { id: "performans", label: "Performans", path: "/performansim", icon: TrendingUp },
    { id: "ik-raporlar", label: "İK Raporları", path: "/ik-raporlari", icon: BarChart2 },
    { id: "sube-bordro", label: "Bordro Özeti", path: "/sube-bordro-ozet", icon: CreditCard },
  ],
};

const OPERASYON_MENU: ModuleMenuConfig = {
  title: "Operasyon",
  items: [
    { id: "gorevler", label: "Görevler", path: "/gorevler", icon: CheckSquare },
    { id: "checklistler", label: "Checklistler", path: "/checklistler", icon: ClipboardList },
    { id: "projeler", label: "Projeler", path: "/projeler", icon: FolderKanban },
    { id: "denetimler", label: "Denetimler", path: "/denetimler", icon: ClipboardCheck },
    { id: "alerjen", label: "Alerjen & Besin", path: "/kalite/alerjen", icon: Shield, allowedRoles: ["admin", "ceo", "cgo", "kalite_yoneticisi", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "fabrika", "recete_gm", "musteri", "marketing", "destek", "yatirimci_branch", "yatirimci_hq"] },
    { id: "bildirimler", label: "Bildirimler", path: "/bildirimler", icon: Bell },
    { id: "duyurular", label: "Duyurular", path: "/duyurular", icon: Megaphone, allowedRoles: ["admin", "ceo", "cgo", "coach", "trainer", "marketing", "muhasebe_ik", "muhasebe", "satinalma", "kalite_kontrol", "gida_muhendisi", "teknik", "destek", "fabrika", "fabrika_mudur"] },
  ],
};

const FABRIKA_MENU: ModuleMenuConfig = {
  title: "Fabrika",
  items: [
    { id: "dashboard", label: "Dashboard", path: "/fabrika/dashboard", icon: Factory },
    { id: "receteler", label: "Reçeteler", path: "/fabrika/receteler", icon: FileBarChart },
    { id: "keyblend", label: "Keyblend", path: "/fabrika/keyblend-yonetimi", icon: Lock },
    { id: "kalite", label: "Kalite Kontrol", path: "/fabrika/kalite-kontrol", icon: Beaker },
    { id: "kavurma", label: "Kavurma", path: "/fabrika/kavurma", icon: Factory },
    { id: "lot", label: "Lot İzleme", path: "/fabrika/lot-izleme", icon: Package },
    { id: "maliyet", label: "Maliyet", path: "/fabrika/maliyet-yonetimi", icon: CreditCard },
    { id: "gida", label: "Gıda Güvenliği", path: "/fabrika/gida-guvenligi", icon: Shield },
  ],
};

const EKIPMAN_MENU: ModuleMenuConfig = {
  title: "Ekipman & Arıza",
  items: [
    { id: "ekipman", label: "Ekipman Listesi", path: "/ekipman", icon: Wrench },
    { id: "ariza", label: "Arıza Bildir", path: "/ariza", icon: Wrench },
    { id: "ariza-yeni", label: "Yeni Arıza", path: "/ariza-yeni", icon: Wrench },
  ],
};

const CRM_MENU: ModuleMenuConfig = {
  title: "Müşteri & CRM",
  items: [
    { id: "crm", label: "CRM", path: "/crm", icon: MessageSquare },
    { id: "misafir", label: "Misafir Memnuniyeti", path: "/misafir-memnuniyeti", icon: UserCheck },
    { id: "sikayetler", label: "Şikayetler", path: "/sikayetler", icon: MessageSquare },
    { id: "destek", label: "Destek Talepleri", path: "/destek", icon: Headphones },
    { id: "kampanya", label: "Kampanya", path: "/kampanya-yonetimi", icon: Megaphone },
  ],
};

const AKADEMI_MENU: ModuleMenuConfig = {
  title: "Akademi & Eğitim",
  items: [
    { id: "anasayfa", label: "Akademi", path: "/akademi", icon: BookOpen },
    { id: "egitimler", label: "Eğitim Modülleri", path: "/akademi?tab=egitimler", icon: BookOpen },
    { id: "webinar", label: "Webinar", path: "/akademi?tab=webinar", icon: Video },
    { id: "kariyer", label: "Kariyer Yolu", path: "/akademi?tab=kariyer", icon: Target },
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
    { id: "stok", label: "Stok Yönetimi", path: "/sube/siparis-stok", icon: Package },
    { id: "canli", label: "Canlı Takip", path: "/canli-takip", icon: TrendingUp, allowedRoles: ["admin", "ceo", "cgo", "coach", "trainer", "muhasebe", "muhasebe_ik", "satinalma", "teknik", "destek", "fabrika"] },
    { id: "uyum", label: "Uyum Merkezi", path: "/sube-uyum-merkezi", icon: BarChart2 },
    { id: "uyum-panel", label: "Uyum Paneli", path: "/coach-uyum-paneli", icon: TrendingUp },
    { id: "cgo-teknik", label: "Teknik Komuta", path: "/cgo-teknik-komuta", icon: Wrench },
    { id: "coach-merkezi", label: "Kontrol Merkezi", path: "/coach-kontrol-merkezi", icon: BarChart2 },
    { id: "trainer-egitim", label: "Eğitim Merkezi", path: "/trainer-egitim-merkezi", icon: GraduationCap },
    { id: "saglik", label: "Şube Sağlık", path: "/sube-saglik-skoru", icon: BarChart3 },
    { id: "karsilastirma", label: "Karşılaştırma", path: "/sube-karsilastirma", icon: BarChart2 },
  ],
};

const RAPORLAR_MENU: ModuleMenuConfig = {
  title: "Raporlar",
  items: [
    { id: "genel", label: "Raporlar", path: "/raporlar", icon: BarChart2 },
    { id: "gelismis", label: "Gelişmiş Raporlar", path: "/gelismis-raporlar", icon: FileBarChart },
    { id: "e2e", label: "E2E Raporlar", path: "/e2e-raporlar", icon: BarChart3 },
    { id: "kasa", label: "Kasa Raporları", path: "/kasa-raporlari", icon: CreditCard },
    { id: "muhasebe", label: "Muhasebe", path: "/muhasebe", icon: Wallet },
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
    { id: "banner-editor", label: "Banner Editor", path: "/banner-editor", icon: FileText },
    { id: "pilot", label: "Pilot Başlat", path: "/pilot-baslat", icon: TrendingUp },
  ],
};

const FINANS_MENU: ModuleMenuConfig = {
  title: "Finans",
  items: [
    { id: "muhasebe", label: "Muhasebe", path: "/muhasebe", icon: Wallet },
    { id: "mali", label: "Mali Yönetim", path: "/mali-yonetim", icon: CreditCard },
    { id: "bordro", label: "Bordro", path: "/bordrom", icon: CreditCard },
    { id: "muhasebe-rapor", label: "Muhasebe Rapor", path: "/muhasebe-raporlama", icon: BarChart2 },
  ],
};

const BENIM_GUNUM_MENU: ModuleMenuConfig = {
  title: "Benim Günüm",
  items: [
    { id: "gunum", label: "Benim Günüm", path: "/benim-gunum", icon: Sun },
    { id: "vardiya", label: "Vardiyam", path: "/vardiya-planlama", icon: Clock },
    { id: "bordro", label: "Bordrom", path: "/bordrom", icon: CreditCard },
    { id: "profil", label: "Profilim", path: "/profil", icon: User },
  ],
};

// ─── ROUTE → MODÜL EŞLEŞTİRME ─────────────────────
// Exact path matches first, then prefix matches
// Order matters: more specific paths BEFORE general prefixes

const EXACT_ROUTE_MAP: Record<string, ModuleMenuConfig> = {
  "/gorevler": OPERASYON_MENU,
  "/checklistler": OPERASYON_MENU,
  "/projeler": OPERASYON_MENU,
  "/denetimler": OPERASYON_MENU,
  "/bildirimler": OPERASYON_MENU,
  "/duyurular": OPERASYON_MENU,
  "/yeni-sube-projeler": OPERASYON_MENU,
  "/kalite-denetimi": OPERASYON_MENU,
  "/kalite/alerjen": OPERASYON_MENU,
  "/denetim-sablonlari": OPERASYON_MENU,
  "/vardiyalar": IK_MENU,
  "/vardiya-planlama": IK_MENU,
  "/vardiyalarim": IK_MENU,
  "/vardiya-checkin": IK_MENU,
  "/bordrom": IK_MENU,
  "/performansim": IK_MENU,
  "/izin-talepleri": IK_MENU,
  "/mesai-talepleri": IK_MENU,
  "/devam-takibi": IK_MENU,
  "/personel-musaitlik": IK_MENU,
  "/personel-onboarding": IK_MENU,
  "/onboarding-programlar": IK_MENU,
  "/personel-qr-tokenlar": IK_MENU,
  "/ayin-elemani": IK_MENU,
  "/maas": IK_MENU,
  "/pdks-izin-gunleri": IK_MENU,
  "/pdks-excel-import": IK_MENU,
  "/ik-raporlari": IK_MENU,
  "/sube-vardiya-takibi": IK_MENU,
  "/ekipman": EKIPMAN_MENU,
  "/ariza": EKIPMAN_MENU,
  "/ariza-yeni": EKIPMAN_MENU,
  "/ekipman-analitics": EKIPMAN_MENU,
  "/hq-fabrika-analitik": FABRIKA_MENU,
  "/fabrika/receteler": FABRIKA_MENU,
  "/fabrika/keyblend-yonetimi": FABRIKA_MENU,
  "/kalite-kontrol-dashboard": FABRIKA_MENU,
  "/gida-guvenligi-dashboard": FABRIKA_MENU,
  "/misafir-memnuniyeti": CRM_MENU,
  "/sikayetler": CRM_MENU,
  "/hq-destek": CRM_MENU,
  "/kampanya-yonetimi": CRM_MENU,
  "/urun-sikayet": CRM_MENU,
  "/franchise-yatirimcilar": CRM_MENU,
  "/muhasebe-geribildirimi": CRM_MENU,
  "/bilgi-bankasi": AKADEMI_MENU,
  "/receteler": FABRIKA_MENU,
  "/egitim-ata": AKADEMI_MENU,
  "/icerik-studyosu": AKADEMI_MENU,
  "/duyuru-studio": AKADEMI_MENU,
  "/subeler": SUBELER_MENU,
  "/sube/siparis-stok": SUBELER_MENU,
  "/coach-sube-denetim": SUBELER_MENU,
  "/canli-takip": SUBELER_MENU,
  "/sube-saglik-skoru": SUBELER_MENU,
  "/sube-karsilastirma": SUBELER_MENU,
  "/sube-uyum-merkezi": SUBELER_MENU,
  "/coach-uyum-paneli": SUBELER_MENU,
  "/cgo-teknik-komuta": SUBELER_MENU,
  "/coach-kontrol-merkezi": SUBELER_MENU,
  "/trainer-egitim-merkezi": SUBELER_MENU,
  "/raporlar": RAPORLAR_MENU,
  "/gelismis-raporlar": RAPORLAR_MENU,
  "/e2e-raporlar": RAPORLAR_MENU,
  "/kasa-raporlari": RAPORLAR_MENU,
  "/raporlar-hub": RAPORLAR_MENU,
  "/muhasebe": FINANS_MENU,
  "/mali-yonetim": FINANS_MENU,
  "/muhasebe-raporlama": FINANS_MENU,
  "/ajanda": YONETIM_MENU,
  "/banner-editor": YONETIM_MENU,
  "/pilot-baslat": YONETIM_MENU,
  "/kayip-esya": YONETIM_MENU,
  "/kayip-esya-hq": YONETIM_MENU,
  "/kullanim-kilavuzu": YONETIM_MENU,
  "/benim-gunum": BENIM_GUNUM_MENU,
  "/mesajlar": OPERASYON_MENU,
  "/iletisim-merkezi": CRM_MENU,
  "/franchise-acilis": SUBELER_MENU,
  "/agent-merkezi": YONETIM_MENU,
  "/qr-tara": OPERASYON_MENU,
  "/hq-dashboard": YONETIM_MENU,
  "/stok-transferleri": SUBELER_MENU,
  "/canli-izleme": SUBELER_MENU,
};

const PREFIX_ROUTE_MAP: Array<{ prefix: string; config: ModuleMenuConfig }> = [
  { prefix: "/ik", config: IK_MENU },
  { prefix: "/personel", config: IK_MENU },
  { prefix: "/fabrika", config: FABRIKA_MENU },
  { prefix: "/crm", config: CRM_MENU },
  { prefix: "/destek", config: CRM_MENU },
  { prefix: "/akademi", config: AKADEMI_MENU },
  { prefix: "/egitim", config: AKADEMI_MENU },
  { prefix: "/admin", config: YONETIM_MENU },
  { prefix: "/yonetim", config: YONETIM_MENU },
  { prefix: "/rapor", config: RAPORLAR_MENU },
  { prefix: "/denetim", config: OPERASYON_MENU },
  { prefix: "/proje", config: OPERASYON_MENU },
  { prefix: "/checklist", config: OPERASYON_MENU },
  { prefix: "/gorev", config: OPERASYON_MENU },
  { prefix: "/vardiya", config: IK_MENU },
  { prefix: "/bordro", config: IK_MENU },
  { prefix: "/izin", config: IK_MENU },
  { prefix: "/ariza", config: EKIPMAN_MENU },
  { prefix: "/ekipman", config: EKIPMAN_MENU },
  { prefix: "/sube", config: SUBELER_MENU },
  { prefix: "/hq-personel", config: IK_MENU },
  { prefix: "/hq-vardiya", config: IK_MENU },
  { prefix: "/capa", config: OPERASYON_MENU },
  { prefix: "/misafir", config: CRM_MENU },
];

// Pages that should NEVER show a module sidebar
const NO_SIDEBAR_PATHS = ["/", "/control", "/control-legacy", "/login", "/register",
  "/forgot-password", "/reset-password", "/setup", "/gizlilik-politikasi",
  "/hq-ozet", "/kocluk-paneli", "/sube-ozet", "/merkez-dashboard",
  "/franchise-ozet", "/ceo-command-center", "/cgo-command-center",
  "/profil", "/dobody", "/nfc-giris", "/ai-asistan",
];

export function getModuleMenuForPath(path: string): ModuleMenuConfig | null {
  // Strip query params
  const cleanPath = path.split("?")[0];
  
  // Explicit no-sidebar pages
  if (NO_SIDEBAR_PATHS.some(p => cleanPath === p || cleanPath.startsWith(p + "/"))) return null;
  
  // Kiosk / standalone pages
  if (cleanPath.includes("/kiosk")) return null;
  
  // Exact match first (highest priority)
  if (EXACT_ROUTE_MAP[cleanPath]) return EXACT_ROUTE_MAP[cleanPath];
  
  // Prefix match (order matters — more specific prefixes should be earlier)
  for (const entry of PREFIX_ROUTE_MAP) {
    if (cleanPath.startsWith(entry.prefix)) {
      return entry.config;
    }
  }
  
  return null;
}

export function getActiveMenuItemForPath(path: string): string | null {
  const cleanPath = path.split("?")[0];
  const config = getModuleMenuForPath(cleanPath);
  if (!config) return null;
  
  // Full URL with query string (wouter gives path only, browser has full URL)
  const fullPath = cleanPath + (typeof window !== "undefined" ? window.location.search : "");
  
  // 1. Exact match WITH query params (for items like /akademi?tab=egitimler)
  const exactFull = config.items.find(item => item.path === fullPath);
  if (exactFull) return exactFull.id;
  
  // 2. Exact match on clean path (for items like /gorevler)
  const exact = config.items.find(item => item.path === cleanPath);
  if (exact) return exact.id;
  
  // 3. Starts-with match on clean path (for nested routes like /fabrika/receteler/123)
  const startsWith = config.items.find(item => {
    const itemClean = item.path.split("?")[0];
    return itemClean !== "/" && cleanPath.startsWith(itemClean) && cleanPath !== itemClean;
  });
  if (startsWith) return startsWith.id;
  
  return config.items[0]?.id || null;
}
