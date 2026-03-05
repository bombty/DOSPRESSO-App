import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home, GraduationCap, Wrench, User, Brain, BarChart3, Factory, Settings, Building2, Users, Bell, CalendarDays, ClipboardCheck, Package, ShoppingCart, Clock, FileText, Megaphone, Search, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { NAV_ITEMS_BY_ROLE, UserRole } from "@/lib/role-visibility";
import { GlobalSearchModal } from "@/components/global-search-modal";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
  isSearch?: boolean;
  isOverlay?: boolean;
}

interface NavItemConfig {
  icon: any;
  labelKey: string;
  defaultLabelTR: string;
  defaultLabelEN: string;
  getPath: (user: any) => string;
  isSearch?: boolean;
  isOverlay?: boolean;
}

const NAV_ITEM_CONFIG: Record<string, NavItemConfig> = {
  home: {
    icon: Home,
    labelKey: "nav.home",
    defaultLabelTR: "Ana Sayfa",
    defaultLabelEN: "Home",
    getPath: (user) => {
      if (user?.role === 'ceo') return '/ceo-command-center';
      if (user?.role === 'cgo') return '/cgo-command-center';
      return '/';
    },
  },
  academy: {
    icon: GraduationCap,
    labelKey: "nav.academy",
    defaultLabelTR: "Akademi",
    defaultLabelEN: "Academy",
    getPath: (user) => {
      const hqRoles = ['ceo', 'cgo', 'admin', 'muhasebe', 'muhasebe_ik', 'satinalma', 'marketing', 'pazarlama', 'teknik', 'destek', 'trainer', 'coach', 'kalite_kontrol', 'fabrika_mudur', 'fabrika', 'yatirimci_hq', 'ekipman_teknik', 'ik'];
      return hqRoles.includes(user?.role) ? "/akademi-hq" : "/akademi";
    },
  },
  reports: {
    icon: BarChart3,
    labelKey: "nav.reports",
    defaultLabelTR: "Raporlar",
    defaultLabelEN: "Reports",
    getPath: () => "/raporlar",
  },
  ai: {
    icon: Brain,
    labelKey: "nav.aiAssistant",
    defaultLabelTR: "AI Asistan",
    defaultLabelEN: "AI Assistant",
    getPath: (user) => {
      if (user?.role === 'ceo') return '/ceo-command-center';
      if (user?.role === 'cgo') return '/cgo-command-center';
      return '#ai-overlay';
    },
    isOverlay: true,
  },
  admin: {
    icon: Settings,
    labelKey: "nav.admin",
    defaultLabelTR: "Yönetim",
    defaultLabelEN: "Admin",
    getPath: () => "/admin",
  },
  equipment: {
    icon: Wrench,
    labelKey: "nav.equipment",
    defaultLabelTR: "Ekipman",
    defaultLabelEN: "Equipment",
    getPath: () => "/ekipman",
  },
  factory: {
    icon: Factory,
    labelKey: "nav.factory",
    defaultLabelTR: "Fabrika",
    defaultLabelEN: "Factory",
    getPath: () => "/fabrika",
  },
  operations: {
    icon: Building2,
    labelKey: "nav.operations",
    defaultLabelTR: "Operasyon",
    defaultLabelEN: "Operations",
    getPath: () => "/operasyon",
  },
  hr: {
    icon: Users,
    labelKey: "nav.hr",
    defaultLabelTR: "Personel",
    defaultLabelEN: "HR",
    getPath: () => "/ik",
  },
  fault: {
    icon: Wrench,
    labelKey: "nav.faults",
    defaultLabelTR: "Arızalar",
    defaultLabelEN: "Faults",
    getPath: () => "/ariza",
  },
  notifications: {
    icon: Bell,
    labelKey: "nav.notifications",
    defaultLabelTR: "Bildirimler",
    defaultLabelEN: "Notifications",
    getPath: () => "/bildirimler",
  },
  tasks: {
    icon: ClipboardCheck,
    labelKey: "nav.tasks",
    defaultLabelTR: "Görevler",
    defaultLabelEN: "Tasks",
    getPath: () => "/gorevler",
  },
  shifts: {
    icon: Clock,
    labelKey: "nav.shifts",
    defaultLabelTR: "Vardiyalar",
    defaultLabelEN: "Shifts",
    getPath: () => "/vardiyalar",
  },
  myshifts: {
    icon: Clock,
    labelKey: "nav.myShifts",
    defaultLabelTR: "Vardiyam",
    defaultLabelEN: "My Shifts",
    getPath: () => "/vardiyalarim",
  },
  checklists: {
    icon: ClipboardCheck,
    labelKey: "nav.checklists",
    defaultLabelTR: "Kontrol Listesi",
    defaultLabelEN: "Checklist",
    getPath: () => "/checklistler",
  },
  stock: {
    icon: Package,
    labelKey: "nav.stock",
    defaultLabelTR: "Stok",
    defaultLabelEN: "Stock",
    getPath: () => "/satinalma?tab=stok-yonetimi",
  },
  orders: {
    icon: ShoppingCart,
    labelKey: "nav.orders",
    defaultLabelTR: "Siparişler",
    defaultLabelEN: "Orders",
    getPath: () => "/satinalma?tab=siparisler",
  },
  calendar: {
    icon: CalendarDays,
    labelKey: "nav.calendar",
    defaultLabelTR: "Takvim",
    defaultLabelEN: "Calendar",
    getPath: () => "/vardiya-planlama",
  },
  crm: {
    icon: FileText,
    labelKey: "nav.crm",
    defaultLabelTR: "CRM",
    defaultLabelEN: "CRM",
    getPath: (user) => {
      if (!user) return "/crm";
      switch (user.role) {
        case 'coach': return "/crm/coach-branches";
        case 'satinalma': return "/crm/tedarikciler";
        case 'muhasebe': return "/crm/cari-takip";
        case 'muhasebe_ik': return "/crm/cari-takip";
        case 'teknik':
        case 'ekipman_teknik': return "/crm/teknik-ariza";
        case 'trainer': return "/crm/dashboard";
        default: return "/crm";
      }
    },
  },
  quality: {
    icon: Shield,
    labelKey: "nav.quality",
    defaultLabelTR: "Kalite",
    defaultLabelEN: "Quality",
    getPath: () => "/kalite-denetimi",
  },
  announcements: {
    icon: Megaphone,
    labelKey: "nav.announcements",
    defaultLabelTR: "Duyurular",
    defaultLabelEN: "Announcements",
    getPath: () => "/duyurular",
  },
  search: {
    icon: Search,
    labelKey: "nav.search",
    defaultLabelTR: "Ara",
    defaultLabelEN: "Search",
    getPath: () => "#search",
    isSearch: true,
  },
  branches: {
    icon: Building2,
    labelKey: "nav.branches",
    defaultLabelTR: "Şubeler",
    defaultLabelEN: "Branches",
    getPath: () => "/subeler",
  },
  profile: {
    icon: User,
    labelKey: "nav.profile",
    defaultLabelTR: "Profil",
    defaultLabelEN: "Profile",
    getPath: (user) => user ? `/personel/${user.id}` : "/login",
  },
};

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation("common");
  const [searchOpen, setSearchOpen] = useState(false);

  const userRole = user?.role as UserRole | undefined;
  const navKeys = userRole ? (NAV_ITEMS_BY_ROLE[userRole] || ['home', 'profile']) : ['home', 'profile'];

  const resolveLabel = (config: NavItemConfig) => {
    return t(config.labelKey, { defaultValue: i18n.language === "en" ? config.defaultLabelEN : config.defaultLabelTR });
  };

  const navItems: NavItem[] = navKeys
    .filter(key => NAV_ITEM_CONFIG[key])
    .slice(0, 5)
    .map(key => {
      const config = NAV_ITEM_CONFIG[key];
      return {
        icon: config.icon,
        label: resolveLabel(config),
        path: config.getPath(user),
        isSearch: config.isSearch,
        isOverlay: config.isOverlay,
      };
    });

  const isActive = (path: string) => {
    if (path === "#search") return false;
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-3 left-3 right-3 z-[60]" data-testid="bottom-nav">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-card-border shadow-xl">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            if (item.isSearch) {
              return (
                <button
                  key={`${item.label}-${index}`}
                  onClick={() => setSearchOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300 relative rounded-xl text-muted-foreground hover:text-foreground"
                  data-testid="nav-ara"
                >
                  <div className="relative pointer-events-none">
                    <div className="p-1.5 rounded-xl transition-all duration-300">
                      <Icon className="w-5 h-5 transition-colors duration-300" />
                    </div>
                  </div>
                  <span className="text-[10px] pointer-events-none transition-all duration-300 font-medium">
                    {item.label}
                  </span>
                </button>
              );
            }

            if (item.isOverlay && item.path === '#ai-overlay') {
              return (
                <button
                  key={`${item.label}-${index}`}
                  onClick={() => window.dispatchEvent(new Event('open-ai-assistant'))}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300 relative rounded-xl text-muted-foreground hover:text-foreground"
                  data-testid="nav-ai-asistan"
                >
                  <div className="relative pointer-events-none">
                    <div className="p-1.5 rounded-xl transition-all duration-300">
                      <Icon className="w-5 h-5 transition-colors duration-300" />
                    </div>
                  </div>
                  <span className="text-[10px] pointer-events-none transition-all duration-300 font-medium">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={`${item.label}-${index}`}
                href={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300 relative no-underline rounded-xl ${
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {active && (
                  <div className="absolute inset-1 rounded-xl bg-primary/10 pointer-events-none" />
                )}
                <div className="relative pointer-events-none">
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? "bg-primary shadow-sm" : ""}`}>
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${active ? "text-white stroke-[2.5px]" : ""}`} />
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] pointer-events-none transition-all duration-300 ${active ? "font-bold text-primary" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
