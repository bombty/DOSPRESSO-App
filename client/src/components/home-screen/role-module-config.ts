import {
  Clock, Building2, Users, CheckSquare, Factory,
  MessageSquare, BarChart2, CreditCard, Settings,
  GraduationCap, Shield, Wrench, Sun, Package,
  BookOpen, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ModuleCardConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  path: string;
  /** API endpoint to fetch badge/status data (optional) */
  badgeEndpoint?: string;
  /** Priority order (lower = first) */
  order: number;
  /** If true, card spans 2 columns on desktop (for smaller utility cards) */
  halfWidth?: boolean;
}

// ─── CARD DEFINITIONS ───────────────────────────────────────

const CONTROL: ModuleCardConfig = {
  id: "control",
  title: "Control",
  subtitle: "Genel durum & KPI",
  icon: Clock,
  iconBg: "rgba(192,57,43,0.15)",
  iconColor: "#c0392b",
  path: "/control",
  order: 1,
};

const SUBELER: ModuleCardConfig = {
  id: "subeler",
  title: "Şubeler",
  subtitle: "Şube yönetimi",
  icon: Building2,
  iconBg: "rgba(41,128,185,0.1)",
  iconColor: "#5dade2",
  path: "/subeler",
  order: 2,
};

const IK_PERSONEL: ModuleCardConfig = {
  id: "ik",
  title: "İK & Personel",
  subtitle: "Personel yönetimi",
  icon: Users,
  iconBg: "rgba(155,89,182,0.1)",
  iconColor: "#9b59b6",
  path: "/ik",
  order: 3,
};

const OPERASYON: ModuleCardConfig = {
  id: "operasyon",
  title: "Operasyon",
  subtitle: "Görev & checklist",
  icon: CheckSquare,
  iconBg: "rgba(39,174,96,0.1)",
  iconColor: "#27ae60",
  path: "/gorevler",
  order: 4,
};

const FABRIKA: ModuleCardConfig = {
  id: "fabrika",
  title: "Fabrika",
  subtitle: "Üretim & kalite",
  icon: Factory,
  iconBg: "rgba(212,168,75,0.1)",
  iconColor: "#d4a84b",
  path: "/fabrika/dashboard",
  order: 5,
};

const MUSTERI: ModuleCardConfig = {
  id: "musteri",
  title: "Müşteri",
  subtitle: "CRM & destek",
  icon: MessageSquare,
  iconBg: "rgba(41,128,185,0.1)",
  iconColor: "#5dade2",
  path: "/crm",
  order: 6,
};

const RAPORLAR: ModuleCardConfig = {
  id: "raporlar",
  title: "Raporlar",
  subtitle: "Performans analiz",
  icon: BarChart2,
  iconBg: "rgba(212,168,75,0.1)",
  iconColor: "#d4a84b",
  path: "/raporlar",
  order: 8,
};

const FINANS: ModuleCardConfig = {
  id: "finans",
  title: "Finans",
  subtitle: "Maliyet & bordro",
  icon: CreditCard,
  iconBg: "rgba(192,57,43,0.08)",
  iconColor: "#c0392b",
  path: "/muhasebe",
  order: 9,
  halfWidth: true,
};

const YONETIM: ModuleCardConfig = {
  id: "yonetim",
  title: "Yönetim",
  subtitle: "Ayarlar & sistem",
  icon: Settings,
  iconBg: "rgba(138,125,109,0.1)",
  iconColor: "#8a7d6d",
  path: "/admin/dashboard-ayarlari",
  order: 10,
  halfWidth: true,
};

const EGITIM: ModuleCardConfig = {
  id: "egitim",
  title: "Eğitim",
  subtitle: "Akademi & sertifika",
  icon: GraduationCap,
  iconBg: "rgba(39,174,96,0.08)",
  iconColor: "#27ae60",
  path: "/akademi",
  order: 7,
};

const GUVENLIK: ModuleCardConfig = {
  id: "guvenlik",
  title: "Güvenlik",
  subtitle: "Denetim & erişim",
  icon: Shield,
  iconBg: "rgba(192,57,43,0.08)",
  iconColor: "#c0392b",
  path: "/admin/aktivite-loglari",
  order: 11,
  halfWidth: true,
};

const KULLANICILAR: ModuleCardConfig = {
  id: "kullanicilar",
  title: "Kullanıcılar",
  subtitle: "Hesap yönetimi",
  icon: Users,
  iconBg: "rgba(41,128,185,0.06)",
  iconColor: "#5dade2",
  path: "/admin/yetkilendirme",
  order: 12,
  halfWidth: true,
};

const BENIM_GUNUM: ModuleCardConfig = {
  id: "benim-gunum",
  title: "Benim Günüm",
  subtitle: "Vardiya & görevler",
  icon: Sun,
  iconBg: "rgba(212,168,75,0.12)",
  iconColor: "#d4a84b",
  path: "/benim-gunum",
  order: 1,
};

const VARDIYAM: ModuleCardConfig = {
  id: "vardiyam",
  title: "Vardiyam",
  subtitle: "Vardiya bilgisi",
  icon: CalendarDays,
  iconBg: "rgba(41,128,185,0.1)",
  iconColor: "#5dade2",
  path: "/vardiyalarim",
  order: 3,
};

const AKADEMI: ModuleCardConfig = {
  id: "akademi",
  title: "Akademi",
  subtitle: "Eğitimlerim",
  icon: BookOpen,
  iconBg: "rgba(39,174,96,0.1)",
  iconColor: "#27ae60",
  path: "/akademi",
  order: 2,
};

const EKIPMAN_ARIZA: ModuleCardConfig = {
  id: "ekipman",
  title: "Ekipman & Arıza",
  subtitle: "Arıza bildirimi",
  icon: Wrench,
  iconBg: "rgba(192,57,43,0.1)",
  iconColor: "#c0392b",
  path: "/ekipman",
  order: 5,
};

const STOK: ModuleCardConfig = {
  id: "stok",
  title: "Stok",
  subtitle: "Şube stok durumu",
  icon: Package,
  iconBg: "rgba(212,168,75,0.1)",
  iconColor: "#d4a84b",
  path: "/stok",
  order: 6,
};

const SUBEM: ModuleCardConfig = {
  id: "subem",
  title: "Şubem",
  subtitle: "Şube raporu",
  icon: Building2,
  iconBg: "rgba(41,128,185,0.1)",
  iconColor: "#5dade2",
  path: "/franchise-ozet",
  order: 1,
};

const BORDRO_PDKS: ModuleCardConfig = {
  id: "bordro",
  title: "Bordro & PDKS",
  subtitle: "Maaş & puantaj",
  icon: CreditCard,
  iconBg: "rgba(192,57,43,0.1)",
  iconColor: "#c0392b",
  path: "/pdks",
  order: 4,
};

const PERSONEL_YONETIMI: ModuleCardConfig = {
  id: "personel",
  title: "Personel",
  subtitle: "Vardiya & personel",
  icon: Users,
  iconBg: "rgba(155,89,182,0.1)",
  iconColor: "#9b59b6",
  path: "/ik",
  order: 4,
};

const FABRIKA_MODUL: ModuleCardConfig = {
  id: "fabrika-modul",
  title: "Fabrika",
  subtitle: "Üretim & istasyonlar",
  icon: Factory,
  iconBg: "rgba(212,168,75,0.1)",
  iconColor: "#d4a84b",
  path: "/fabrika/dashboard",
  order: 2,
};

const PROFIL: ModuleCardConfig = {
  id: "profil",
  title: "Profil",
  subtitle: "Hesabım",
  icon: Users,
  iconBg: "rgba(138,125,109,0.08)",
  iconColor: "#8a7d6d",
  path: "/profil",
  order: 99,
  halfWidth: true,
};

// ─── ROLE → CARDS MAPPING ───────────────────────────────────

export const ROLE_MODULES: Record<string, ModuleCardConfig[]> = {
  // ── Executive ──
  admin: [CONTROL, SUBELER, IK_PERSONEL, OPERASYON, FABRIKA, MUSTERI, EGITIM, RAPORLAR, FINANS, YONETIM, GUVENLIK, KULLANICILAR],
  ceo: [CONTROL, SUBELER, IK_PERSONEL, OPERASYON, FABRIKA, MUSTERI, RAPORLAR, FINANS, YONETIM],
  cgo: [CONTROL, SUBELER, IK_PERSONEL, OPERASYON, FABRIKA, MUSTERI, RAPORLAR, FINANS, YONETIM],

  // ── Coach / Trainer ──
  coach: [CONTROL, SUBELER, EGITIM, OPERASYON, MUSTERI, RAPORLAR],
  trainer: [CONTROL, SUBELER, EGITIM, OPERASYON, RAPORLAR],

  // ── HQ Departments ──
  muhasebe_ik: [CONTROL, IK_PERSONEL, BORDRO_PDKS, RAPORLAR, FINANS],
  muhasebe: [CONTROL, IK_PERSONEL, BORDRO_PDKS, RAPORLAR, FINANS],
  satinalma: [CONTROL, OPERASYON, STOK, RAPORLAR],
  marketing: [CONTROL, MUSTERI, RAPORLAR, OPERASYON],
  gida_muhendisi: [CONTROL, FABRIKA, OPERASYON, RAPORLAR],
  kalite_kontrol: [CONTROL, FABRIKA, OPERASYON, RAPORLAR],
  teknik: [CONTROL, EKIPMAN_ARIZA, OPERASYON, RAPORLAR],
  destek: [CONTROL, MUSTERI, OPERASYON, RAPORLAR],

  // ── Supervisor / Branch Manager ──
  supervisor: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK, EGITIM],
  supervisor_buddy: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK],
  mudur: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK, EGITIM, RAPORLAR],

  // ── Staff ──
  barista: [BENIM_GUNUM, AKADEMI, VARDIYAM, PROFIL],
  bar_buddy: [BENIM_GUNUM, AKADEMI, VARDIYAM, PROFIL],
  stajyer: [BENIM_GUNUM, AKADEMI, VARDIYAM, PROFIL],

  // ── Factory ──
  fabrika_mudur: [CONTROL, FABRIKA_MODUL, PERSONEL_YONETIMI, RAPORLAR],
  uretim_sefi: [CONTROL, FABRIKA_MODUL, PERSONEL_YONETIMI, RAPORLAR],

  // ── Investor ──
  yatirimci_branch: [SUBEM, RAPORLAR, PROFIL],
  yatirimci_hq: [SUBELER, RAPORLAR, PROFIL],
};

/** Get module cards for a given role, sorted by order */
export function getModulesForRole(role: string | undefined): ModuleCardConfig[] {
  if (!role) return [];
  const modules = ROLE_MODULES[role] || [];
  return [...modules].sort((a, b) => a.order - b.order);
}

/** Check if role should see Mr. Dobody card */
export function showDobodyCard(role: string | undefined): boolean {
  if (!role) return false;
  // Kiosk roles don't see Dobody on home screen
  const KIOSK_ROLES = ["fabrika_operator", "sube_kiosk", "fabrika_sorumlu", "fabrika_personel"];
  return !KIOSK_ROLES.includes(role);
}

/** Roles that skip HomeScreen entirely (go straight to kiosk) */
export const KIOSK_ROLES = ["fabrika_operator", "sube_kiosk", "fabrika_sorumlu", "fabrika_personel"];
