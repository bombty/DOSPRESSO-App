import { useLocation, Link } from "wouter";
import { Home, GraduationCap, Wrench, User, Headphones } from "lucide-react";
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
  const allNavItems: NavItem[] = [
    { icon: Home, label: "Ana Sayfa", path: "/" },
    { icon: GraduationCap, label: "Akademi", path: isHQ ? "/akademi-hq" : "/akademi" },
    // CRM - role göre dinamik yönlendirme (HQ için yönetim, şube/fabrika için kişisel)
    { icon: Headphones, label: "CRM", path: getCrmPath() },
    { icon: Wrench, label: "Arıza", path: "/ariza" },
    { icon: User, label: "Profil", path: user ? `/personel/${user.id}` : "/login" },
  ];
  
  // Limit to 5 items max for bottom nav
  const navItems = allNavItems.slice(0, 5);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 border-t border-border/50 shadow-lg" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0 transition-all relative no-underline ${
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full pointer-events-none" />
              )}
              <div className={`relative pointer-events-none transition-transform ${active ? "scale-110" : ""}`}>
                <Icon className={`w-4 h-4 ${active ? "stroke-[2.5px]" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] pointer-events-none mt-0.5 ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
