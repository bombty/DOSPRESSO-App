import { Link, useLocation } from "wouter";
import {
  Home, MessageSquare, GraduationCap, Building2, Factory,
  BarChart2, CheckSquare, Timer, User, Megaphone,
} from "lucide-react";
import { getNavRailItems } from "@/lib/navigation-config";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, MessageSquare, GraduationCap, Building2, Factory,
  BarChart2, CheckSquare, Timer, User, Megaphone,
};

export function NavRail({ className }: { className?: string }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const items = getNavRailItems(user?.role);

  return (
    <aside
      className={cn("hidden md:flex flex-col items-center bg-[#122549] w-[50px] py-3 gap-1 flex-shrink-0 z-40 overflow-y-auto", className)}
      data-testid="nav-rail"
    >
      {items.map((item) => {
        const IconComponent = ICON_MAP[item.icon] ?? Home;
        const isActive =
          location === item.path ||
          (item.path !== "/" && location.startsWith(item.path));

        return (
          <Tooltip key={item.key} delayDuration={200}>
            <TooltipTrigger asChild>
              <Link href={item.path}>
                <button
                  data-testid={`rail-${item.key}`}
                  className={cn(
                    "relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150",
                    isActive
                      ? "bg-[#cc1f1f]"
                      : "bg-transparent hover:bg-card/10"
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
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="mt-auto">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link href={user ? `/personel/${user.id}` : "/login"}>
              <button
                data-testid="rail-profile"
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-card/10 transition-all"
              >
                <User className="w-[18px] h-[18px] text-white opacity-40" />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Profilim
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
