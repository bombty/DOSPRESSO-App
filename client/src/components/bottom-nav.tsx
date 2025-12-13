import { useLocation } from "wouter";
import { Home, GraduationCap, Wrench, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, PERMISSIONS } from "@shared/schema";

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
  const userRole = user?.role as string | undefined;
  
  // Check if user has HR access
  const hasHRAccess = userRole && PERMISSIONS[userRole as keyof typeof PERMISSIONS]?.hr?.length > 0;
  
  // Build nav items based on user role
  const allNavItems: NavItem[] = [
    { icon: Home, label: "Ana Sayfa", path: isHQ ? "/" : "/sube-dashboard" },
    { icon: GraduationCap, label: "Akademi", path: isHQ ? "/akademi-hq" : "/akademi" },
    // İK - show only for roles with HR access (supervisor, supervisor_buddy, admin, etc.)
    ...(hasHRAccess ? [{ icon: Users, label: "İK", path: "/ik" }] : []),
    { icon: Wrench, label: "Arıza", path: "/ariza" },
    { icon: User, label: "Profil", path: user ? `/personel/${user.id}` : "/login" },
  ];
  
  // Limit to 5 items max for bottom nav
  const navItems = allNavItems.slice(0, 5);

  const isActive = (path: string) => {
    if (path === "/" || path === "/sube-dashboard") return location === "/" || location === "/sube-dashboard";
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-border shadow-lg" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative ${
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
