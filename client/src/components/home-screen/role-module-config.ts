import {
  Clock, Building2, Users, CheckSquare, Factory,
  MessageSquare, BarChart2, CreditCard, Settings,
  GraduationCap, Shield, Wrench, Sun, Package,
  BookOpen, CalendarDays, Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROLE_CONTROL_PATH } from "@/lib/role-routes";

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
  /** Manifest module ID — connects to shared/module-manifest.ts for on/off control */
  manifestModuleId?: string;
}

// ─── CARD DEFINITIONS ───────────────────────────────────────

const CONTROL: ModuleCardConfig = {
  id: "control",
  title: "Control",
  subtitle: "Genel durum & KPI",
  icon: Clock,
  iconBg: "#b42a2a",
  iconColor: "#ffffff",
  path: "/control",
  order: 1,
  manifestModuleId: "m01-core",
};

const SUBELER: ModuleCardConfig = {
  id: "subeler",
  title: "Şubeler",
  subtitle: "Şube yönetimi",
  icon: Building2,
  iconBg: "#2563eb",
  iconColor: "#ffffff",
  path: "/subeler",
  order: 2,
  manifestModuleId: "m01-core",
};

const IK_PERSONEL: ModuleCardConfig = {
  id: "ik",
  title: "İK & Personel",
  subtitle: "Personel yönetimi",
  icon: Users,
  iconBg: "#7c3aed",
  iconColor: "#ffffff",
  path: "/ik",
  order: 3,
  manifestModuleId: "m02-ik",
};

const OPERASYON: ModuleCardConfig = {
  id: "operasyon",
  title: "Operasyon",
  subtitle: "Görev & checklist",
  icon: CheckSquare,
  iconBg: "#16a34a",
  iconColor: "#ffffff",
  path: "/gorevler",
  order: 4,
  manifestModuleId: "m05-operasyon",
};

const FABRIKA: ModuleCardConfig = {
  id: "fabrika",
  title: "Fabrika",
  subtitle: "Üretim & kalite",
  icon: Factory,
  iconBg: "#d97706",
  iconColor: "#ffffff",
  path: "/fabrika/dashboard",
  order: 5,
  manifestModuleId: "m09-fabrika",
};

const MUSTERI: ModuleCardConfig = {
  id: "musteri",
  title: "Müşteri",
  subtitle: "CRM & destek",
  icon: MessageSquare,
  iconBg: "#2563eb",
  iconColor: "#ffffff",
  path: "/crm",
  order: 6,
  manifestModuleId: "m08-crm",
};

const RAPORLAR: ModuleCardConfig = {
  id: "raporlar",
  title: "Raporlar",
  subtitle: "Performans analiz",
  icon: BarChart2,
  iconBg: "#d97706",
  iconColor: "#ffffff",
  path: "/raporlar",
  order: 8,
  manifestModuleId: "m11-raporlar",
};

const FINANS: ModuleCardConfig = {
  id: "finans",
  title: "Finans",
  subtitle: "Maliyet & bordro",
  icon: CreditCard,
  iconBg: "#b42a2a",
  iconColor: "#ffffff",
  path: "/muhasebe",
  order: 9,
  halfWidth: true,
  manifestModuleId: "m04-bordro",
};

const YONETIM: ModuleCardConfig = {
  id: "yonetim",
  title: "Yönetim",
  subtitle: "Ayarlar & sistem",
  icon: Settings,
  iconBg: "rgba(138,125,109,0.1)",
  iconColor: "#ffffff",
  path: "/admin/dashboard-ayarlari",
  order: 10,
  halfWidth: true,
  manifestModuleId: "m01-core",
};

const EGITIM: ModuleCardConfig = {
  id: "egitim",
  title: "Eğitim",
  subtitle: "Akademi & sertifika",
  icon: GraduationCap,
  iconBg: "rgba(39,174,96,0.08)",
  iconColor: "#ffffff",
  path: "/akademi",
  order: 7,
  manifestModuleId: "m07-akademi",
};

const GUVENLIK: ModuleCardConfig = {
  id: "guvenlik",
  title: "Güvenlik",
  subtitle: "Denetim & erişim",
  icon: Shield,
  iconBg: "#b42a2a",
  iconColor: "#ffffff",
  path: "/admin/aktivite-loglari",
  order: 11,
  halfWidth: true,
  manifestModuleId: "m01-core",
};

const KULLANICILAR: ModuleCardConfig = {
  id: "kullanicilar",
  title: "Kullanıcılar",
  subtitle: "Hesap yönetimi",
  icon: Users,
  iconBg: "#2563eb",
  iconColor: "#ffffff",
  path: "/admin/yetkilendirme",
  order: 12,
  halfWidth: true,
  manifestModuleId: "m01-core",
};

const BENIM_GUNUM: ModuleCardConfig = {
  id: "benim-gunum",
  title: "Benim Günüm",
  subtitle: "Vardiya & görevler",
  icon: Sun,
  iconBg: "rgba(212,168,75,0.12)",
  iconColor: "#ffffff",
  path: "/benim-gunum",
  order: 1,
  manifestModuleId: "m03-vardiya",
};

const VARDIYAM: ModuleCardConfig = {
  id: "vardiyam",
  title: "Vardiyam",
  subtitle: "Vardiya bilgisi",
  icon: CalendarDays,
  iconBg: "#2563eb",
  iconColor: "#ffffff",
  path: "/vardiyalarim",
  order: 3,
  manifestModuleId: "m03-vardiya",
};

const AKADEMI: ModuleCardConfig = {
  id: "akademi",
  title: "Akademi",
  subtitle: "Eğitimlerim",
  icon: BookOpen,
  iconBg: "#16a34a",
  iconColor: "#ffffff",
  path: "/akademi",
  order: 2,
  manifestModuleId: "m07-akademi",
};

const EKIPMAN_ARIZA: ModuleCardConfig = {
  id: "ekipman",
  title: "Ekipman & Arıza",
  subtitle: "Arıza bildirimi",
  icon: Wrench,
  iconBg: "#ef4444",
  iconColor: "#ffffff",
  path: "/ekipman",
  order: 5,
  manifestModuleId: "m06-ekipman",
};

const STOK: ModuleCardConfig = {
  id: "stok",
  title: "Stok",
  subtitle: "Şube stok durumu",
  icon: Package,
  iconBg: "#d97706",
  iconColor: "#ffffff",
  path: "/sube/siparis-stok",
  order: 6,
  manifestModuleId: "m10-stok",
};

const SUBEM: ModuleCardConfig = {
  id: "subem",
  title: "Şubem",
  subtitle: "Şube raporu",
  icon: Building2,
  iconBg: "#2563eb",
  iconColor: "#ffffff",
  path: "/franchise-ozet",
  order: 1,
  manifestModuleId: "m01-core",
};

const BORDRO_PDKS: ModuleCardConfig = {
  id: "bordro",
  title: "Bordro & PDKS",
  subtitle: "Maaş & puantaj",
  icon: CreditCard,
  iconBg: "#ef4444",
  iconColor: "#ffffff",
  path: "/pdks",
  order: 4,
  manifestModuleId: "m04-bordro",
};

const PERSONEL_YONETIMI: ModuleCardConfig = {
  id: "personel",
  title: "Personel",
  subtitle: "Vardiya & personel",
  icon: Users,
  iconBg: "#7c3aed",
  iconColor: "#ffffff",
  path: "/ik",
  order: 4,
  manifestModuleId: "m02-ik",
};

const FABRIKA_MODUL: ModuleCardConfig = {
  id: "fabrika-modul",
  title: "Fabrika",
  subtitle: "Üretim & istasyonlar",
  icon: Factory,
  iconBg: "#d97706",
  iconColor: "#ffffff",
  path: "/fabrika/dashboard",
  order: 2,
  manifestModuleId: "m09-fabrika",
};

const PROFIL: ModuleCardConfig = {
  id: "profil",
  title: "Profil",
  subtitle: "Hesabım",
  icon: Users,
  iconBg: "#6b7a8d",
  iconColor: "#ffffff",
  path: "/profil",
  order: 99,
  halfWidth: true,
  manifestModuleId: "m01-core",
};

const SISTEM_ATOLYESI: ModuleCardConfig = {
  id: "sistem-atolyesi",
  title: "Sistem Atölyesi",
  subtitle: "Brainstorming & planlama",
  icon: Map,
  iconBg: "#6366f1",
  iconColor: "#ffffff",
  path: "/sistem-atolyesi",
  order: 50,
};

const DENETIM: ModuleCardConfig = {
  id: "denetim",
  title: "Denetim",
  subtitle: "Şube denetim & audit",
  icon: CheckSquare,
  iconBg: "#f97316",
  iconColor: "#ffffff",
  path: "/denetimler",
  order: 15,
};

const RECETELER: ModuleCardConfig = {
  id: "receteler",
  title: "Reçeteler",
  subtitle: "Ürün reçete kartları",
  icon: BookOpen,
  iconBg: "#ef4444",
  iconColor: "#ffffff",
  path: "/fabrika/receteler",
  order: 16,
};

const SUBE_SAGLIK: ModuleCardConfig = {
  id: "sube-saglik",
  title: "Şube Sağlık",
  subtitle: "Şube skor & sıralama",
  icon: BarChart2,
  iconBg: "#10b981",
  iconColor: "#ffffff",
  path: "/sube-saglik-skoru",
  order: 8,
};

const CHECKLISTLER: ModuleCardConfig = {
  id: "checklistler",
  title: "Checklistler",
  subtitle: "Günlük kontrol listeleri",
  icon: CheckSquare,
  iconBg: "#8b5cf6",
  iconColor: "#ffffff",
  path: "/checklistler",
  order: 12,
};

const GOREVLERIM: ModuleCardConfig = {
  id: "gorevlerim",
  title: "Görevlerim",
  subtitle: "Atanan görevler",
  icon: CheckSquare,
  iconBg: "#3b82f6",
  iconColor: "#ffffff",
  path: "/gorevler",
  order: 3,
};

// ─── ROLE → CARDS MAPPING ───────────────────────────────────

export const ROLE_MODULES: Record<string, ModuleCardConfig[]> = {
  // ── Executive (optimize: günlük kullanım kartları) ──
  admin: [CONTROL, SUBELER, IK_PERSONEL, OPERASYON, FABRIKA, MUSTERI, RAPORLAR, YONETIM, GUVENLIK, SISTEM_ATOLYESI],
  ceo: [CONTROL, SUBELER, IK_PERSONEL, OPERASYON, FABRIKA, MUSTERI, RAPORLAR, SISTEM_ATOLYESI],
  cgo: [CONTROL, EKIPMAN_ARIZA, SUBELER, OPERASYON, FABRIKA, MUSTERI, RAPORLAR, IK_PERSONEL, SISTEM_ATOLYESI],

  // ── Coach / Trainer ──
  coach: [CONTROL, SUBELER, DENETIM, OPERASYON, EGITIM, MUSTERI, RAPORLAR, SISTEM_ATOLYESI],
  trainer: [CONTROL, SUBELER, AKADEMI, EGITIM, DENETIM, RAPORLAR, SISTEM_ATOLYESI],

  // ── HQ Departments ──
  muhasebe_ik: [CONTROL, IK_PERSONEL, BORDRO_PDKS, RAPORLAR, FINANS],
  muhasebe: [CONTROL, IK_PERSONEL, BORDRO_PDKS, RAPORLAR, FINANS],
  satinalma: [CONTROL, OPERASYON, STOK, RAPORLAR],
  marketing: [CONTROL, MUSTERI, RAPORLAR, OPERASYON],
  gida_muhendisi: [CONTROL, FABRIKA_MODUL, RECETELER, OPERASYON, RAPORLAR],
  kalite_kontrol: [CONTROL, FABRIKA, OPERASYON, RAPORLAR],
  teknik: [CONTROL, EKIPMAN_ARIZA, OPERASYON, RAPORLAR],
  destek: [CONTROL, MUSTERI, OPERASYON, RAPORLAR],

  // ── Supervisor / Branch Manager ──
  supervisor: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK, EGITIM, VARDIYAM, CHECKLISTLER],
  supervisor_buddy: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK, CHECKLISTLER],
  mudur: [CONTROL, OPERASYON, PERSONEL_YONETIMI, EKIPMAN_ARIZA, STOK, EGITIM, RAPORLAR, CHECKLISTLER],

  // ── Staff ──
  barista: [BENIM_GUNUM, GOREVLERIM, AKADEMI, VARDIYAM, EKIPMAN_ARIZA, PROFIL],
  bar_buddy: [BENIM_GUNUM, GOREVLERIM, AKADEMI, VARDIYAM, EKIPMAN_ARIZA, PROFIL],
  stajyer: [BENIM_GUNUM, GOREVLERIM, AKADEMI, VARDIYAM, PROFIL],

  // ── Factory ──
  fabrika_mudur: [CONTROL, FABRIKA_MODUL, PERSONEL_YONETIMI, RAPORLAR, RECETELER],
  uretim_sefi: [CONTROL, FABRIKA_MODUL, PERSONEL_YONETIMI, RAPORLAR, RECETELER],
  recete_gm: [CONTROL, FABRIKA_MODUL, RECETELER, STOK, RAPORLAR],
  sef: [CONTROL, FABRIKA_MODUL, RECETELER, RAPORLAR],
  fabrika_sorumlu: [CONTROL, FABRIKA_MODUL, PROFIL],
  fabrika_operator: [BENIM_GUNUM, FABRIKA_MODUL, PROFIL],
  fabrika_depo: [CONTROL, FABRIKA_MODUL, STOK, PROFIL],
  fabrika_personel: [BENIM_GUNUM, FABRIKA_MODUL, PROFIL],
  fabrika: [BENIM_GUNUM, FABRIKA_MODUL, PROFIL], // Legacy → fabrika_personel ile aynı

  // ── Kiosk ──
  sube_kiosk: [CONTROL, PROFIL], // Kiosk ekranına yönlendirilir ama fallback kartlar

  // ── Investor ──
  yatirimci_branch: [SUBEM, RAPORLAR, PROFIL],
  yatirimci_hq: [SUBELER, RAPORLAR, PROFIL],
};

/** Get module cards for a given role, sorted by order.
 *  Control card path is overridden per role (CEO→/hq-ozet, Coach→/kocluk-paneli, etc.)
 */
export function getModulesForRole(role: string | undefined): ModuleCardConfig[] {
  if (!role) return [];
  const modules = ROLE_MODULES[role] || [];
  const controlPath = ROLE_CONTROL_PATH[role] || "/control";
  
  return [...modules]
    .map((mod) => {
      if (mod.id === "control" && controlPath !== "/control") {
        return { ...mod, path: controlPath };
      }
      return mod;
    })
    .sort((a, b) => a.order - b.order);
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
