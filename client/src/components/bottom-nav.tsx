import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home, GraduationCap, Wrench, User, Brain, BarChart3, Factory, Settings, Building2, Users, Bell, CalendarDays, ClipboardCheck, Package, ShoppingCart, Clock, FileText, Megaphone, Search, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NAV_ITEMS_BY_ROLE, UserRole } from "@/lib/role-visibility";
import { GlobalSearchModal } from "@/components/global-search-modal";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
  isSearch?: boolean;
}

const NAV_ITEM_CONFIG: Record<string, { icon: any; label: string; getPath: (user: any) => string; isSearch?: boolean }> = {
  home: {
    icon: Home,
    label: "Ana Sayfa",
    getPath: () => "/",
  },
  academy: {
    icon: GraduationCap,
    label: "Akademi",
    getPath: (user) => {
      const hqRoles = ['ceo', 'cgo', 'admin', 'muhasebe', 'muhasebe_ik', 'satinalma', 'marketing', 'pazarlama', 'teknik', 'destek', 'trainer', 'coach', 'kalite_kontrol', 'fabrika_mudur', 'fabrika', 'yatirimci_hq', 'ekipman_teknik', 'ik'];
      return hqRoles.includes(user?.role) ? "/akademi-hq" : "/akademi";
    },
  },
  reports: {
    icon: BarChart3,
    label: "Raporlar",
    getPath: () => "/raporlar",
  },
  ai: {
    icon: Brain,
    label: "AI Asistan",
    getPath: (user) => {
      if (user?.role === 'ceo') return '/ceo-command-center';
      if (user?.role === 'cgo') return '/cgo-command-center';
      return '/ai-asistan';
    },
  },
  admin: {
    icon: Settings,
    label: "Yönetim",
    getPath: () => "/admin",
  },
  equipment: {
    icon: Wrench,
    label: "Ekipman",
    getPath: () => "/ekipman",
  },
  factory: {
    icon: Factory,
    label: "Fabrika",
    getPath: () => "/fabrika",
  },
  operations: {
    icon: Building2,
    label: "Operasyon",
    getPath: () => "/operasyon",
  },
  hr: {
    icon: Users,
    label: "İK",
    getPath: () => "/ik",
  },
  fault: {
    icon: Wrench,
    label: "Arıza",
    getPath: () => "/ariza",
  },
  notifications: {
    icon: Bell,
    label: "Bildirimler",
    getPath: () => "/bildirimler",
  },
  tasks: {
    icon: ClipboardCheck,
    label: "Görevler",
    getPath: () => "/gorevler",
  },
  shifts: {
    icon: Clock,
    label: "Vardiyalar",
    getPath: () => "/vardiyalar",
  },
  myshifts: {
    icon: Clock,
    label: "Vardiyam",
    getPath: () => "/vardiyalarim",
  },
  checklists: {
    icon: ClipboardCheck,
    label: "Checklist",
    getPath: () => "/checklistler",
  },
  stock: {
    icon: Package,
    label: "Stok",
    getPath: () => "/satinalma?tab=stok-yonetimi",
  },
  orders: {
    icon: ShoppingCart,
    label: "Siparişler",
    getPath: () => "/satinalma?tab=siparisler",
  },
  calendar: {
    icon: CalendarDays,
    label: "Takvim",
    getPath: () => "/vardiya-planlama",
  },
  crm: {
    icon: FileText,
    label: "CRM",
    getPath: (user) => {
      if (!user) return "/crm";
      switch (user.role) {
        case 'coach': return "/crm/coach-branches";
        case 'satinalma': return "/crm/tedarikciler";
        case 'muhasebe': return "/crm/cari-takip";
        case 'teknik':
        case 'ekipman_teknik': return "/crm/teknik-ariza";
        case 'trainer': return "/crm/dashboard";
        default: return "/crm";
      }
    },
  },
  quality: {
    icon: Shield,
    label: "Kalite",
    getPath: () => "/kalite-denetimi",
  },
  announcements: {
    icon: Megaphone,
    label: "Duyurular",
    getPath: () => "/duyurular",
  },
  search: {
    icon: Search,
    label: "Ara",
    getPath: () => "#search",
    isSearch: true,
  },
  branches: {
    icon: Building2,
    label: "Şubeler",
    getPath: () => "/subeler",
  },
  profile: {
    icon: User,
    label: "Profil",
    getPath: (user) => user ? `/personel/${user.id}` : "/login",
  },
};

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const userRole = user?.role as UserRole | undefined;
  const navKeys = userRole ? (NAV_ITEMS_BY_ROLE[userRole] || ['home', 'profile']) : ['home', 'profile'];

  const navItems: NavItem[] = navKeys
    .filter(key => NAV_ITEM_CONFIG[key])
    .slice(0, 5)
    .map(key => {
      const config = NAV_ITEM_CONFIG[key];
      return {
        icon: config.icon,
        label: config.label,
        path: config.getPath(user),
        isSearch: config.isSearch,
      };
    });

  const isActive = (path: string) => {
    if (path === "/" || path === "#search") return location === path;
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
