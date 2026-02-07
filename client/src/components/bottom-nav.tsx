import { useLocation, Link } from "wouter";
import { Home, GraduationCap, Wrench, User, Headphones, Brain, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
  roles?: string[]; // If specified, only show for these roles
}

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isHQ = user && isHQRole(user.role as any);
  
  const getCrmPath = () => {
    if (!user) return "/crm";
    const role = user.role;
    
    switch (role) {
      case 'coach':
        return "/crm/coach-branches";
      case 'satinalma':
        return "/crm/tedarikciler";
      case 'muhasebe':
        return "/crm/cari-takip";
      case 'teknik':
      case 'ekipman_teknik':
        return "/crm/teknik-ariza";
      case 'trainer':
        return "/crm/dashboard";
      default:
        return "/crm";
    }
  };
  
  // Build nav items based on user role - all roles use "/" for dashboard
  // HQ users get AI Control Tower instead of Arıza
  // HQ için "CRM", şube/fabrika personeli için "Panelim" etiketi
  const crmLabel = isHQ ? "CRM" : "Panelim";
  
  const allNavItems: NavItem[] = [
    { icon: Home, label: "Ana Sayfa", path: "/" },
    { icon: GraduationCap, label: "Akademi", path: isHQ ? "/akademi-hq" : "/akademi" },
    // CRM - role göre dinamik yönlendirme ve etiket (HQ için CRM, şube/fabrika için Panelim)
    { icon: Headphones, label: crmLabel, path: getCrmPath() },
    isHQ 
      ? (user?.role === 'ceo' || user?.role === 'admin')
        ? { icon: Brain, label: "AI", path: "/ceo-command-center" }
        : { icon: BarChart3, label: "Raporlar", path: "/raporlar" }
      : { icon: Wrench, label: "Arıza", path: "/ariza" },
    { icon: User, label: "Profil", path: user ? `/personel/${user.id}` : "/login" },
  ];
  
  // Limit to 5 items max for bottom nav
  const navItems = allNavItems.slice(0, 5);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-[60]" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-card-border shadow-xl">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
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
  );
}
