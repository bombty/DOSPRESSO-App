import { Link, useLocation } from "wouter";
import {
  Home, MessageSquare, GraduationCap, Building2, Factory,
  BarChart2, CheckSquare, Timer, User,
} from "lucide-react";
import { getNavRailItems } from "@/lib/navigation-config";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, MessageSquare, GraduationCap, Building2, Factory,
  BarChart2, CheckSquare, Timer, User,
};

export function NavRail() {
  const { user } = useAuth();
  const [location] = useLocation();
  const items = getNavRailItems(user?.role);

  return (
    <aside
      className="hidden md:flex flex-col items-center bg-[#122549] w-[50px] py-3 gap-1 flex-shrink-0 z-40 overflow-y-auto"
      data-testid="nav-rail"
    >
      {items.map((item) => {
        const IconComponent = ICON_MAP[item.icon] ?? Home;
        const isActive =
          location === item.path ||
          (item.path !== "/" && location.startsWith(item.path));

        return (
          <Link key={item.key} href={item.path}>
            <button
              title={item.label}
              data-testid={`rail-${item.key}`}
              className={cn(
                "relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 group",
                isActive
                  ? "bg-[#cc1f1f]"
                  : "bg-transparent hover:bg-white/10"
              )}
            >
              <IconComponent
                className={cn(
                  "w-[18px] h-[18px] transition-opacity",
                  isActive ? "text-white opacity-100" : "text-white opacity-50"
                )}
              />
              {item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#cc1f1f] border-2 border-[#122549]" />
              )}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
            </button>
          </Link>
        );
      })}

      <div className="mt-auto">
        <Link href={user ? `/personel/${user.id}` : "/login"}>
          <button
            title="Profil"
            data-testid="rail-profile"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <User className="w-[18px] h-[18px] text-white opacity-40" />
          </button>
        </Link>
      </div>
    </aside>
  );
}
