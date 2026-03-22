import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home, MessageSquare, GraduationCap, Building2, Factory,
  BarChart2, BarChart3, CheckSquare, Timer, User, Users,
  Settings, Star, Calculator, ShoppingCart, Package,
  Wrench, AlertTriangle, Calendar, UserCheck, BookOpen,
  FileText, Megaphone, Bell, Shield, Headphones,
  FolderKanban, ClipboardList, LayoutDashboard, Brain,
  ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, LayoutDashboard: Home, MessageSquare, GraduationCap,
  Building2, Factory, BarChart2, BarChart3, CheckSquare, Timer,
  User, Users, Settings, Star, Calculator, ShoppingCart, Package,
  Wrench, AlertTriangle, Calendar, UserCheck, BookOpen, FileText,
  Megaphone, Bell, Shield, Headphones, FolderKanban, ClipboardList,
  Brain, ChevronRight,
  MessageSquareHeart: MessageSquare,
  ShieldCheck: Shield,
  Fingerprint: UserCheck,
  Banknote: Calculator,
  HardDrive: Settings,
  LayoutGrid: Settings,
};

interface MenuSection {
  id: string;
  titleTr: string;
  icon: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  titleTr: string;
  path: string;
  icon: string;
}

interface CollapsibleSidebarProps {
  isExpanded: boolean;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || "";
  const l = lastName?.charAt(0)?.toUpperCase() || "";
  return f + l || "?";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", ceo: "CEO", cgo: "CGO",
  muhasebe_ik: "Muhasebe IK", satinalma: "Satinalma",
  coach: "Coach", marketing: "Marketing", trainer: "Egitmen",
  kalite_kontrol: "Kalite Kontrol", fabrika_mudur: "Fabrika Mudur",
  muhasebe: "Muhasebe", teknik: "Teknik", destek: "Destek",
  fabrika: "Fabrika", yatirimci_hq: "Yatirimci",
  stajyer: "Stajyer", bar_buddy: "Bar Buddy", barista: "Barista",
  supervisor_buddy: "Supervisor Buddy", supervisor: "Supervisor",
  mudur: "Mudur", yatirimci_branch: "Yatirimci",
  fabrika_operator: "Fabrika Operator", fabrika_sorumlu: "Fabrika Sorumlu",
  fabrika_personel: "Fabrika Personel", gida_muhendisi: "Gida Muhendisi",
};

export function CollapsibleSidebar({ isExpanded }: CollapsibleSidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: menuData } = useQuery<{ sections: MenuSection[] }>({
    queryKey: ["/api/me/menu"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const sections = menuData?.sections || [];

  const isItemActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-[#122549] flex-shrink-0 z-40 transition-[width] duration-200 ease-in-out overflow-hidden",
        isExpanded ? "w-[200px]" : "w-[50px]"
      )}
      data-testid="collapsible-sidebar"
    >
      <div className={cn(
        "flex items-center py-3 flex-shrink-0 border-b border-white/10",
        isExpanded ? "px-3 gap-3" : "justify-center px-0"
      )}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
            {getInitials(user?.firstName, user?.lastName)}
          </AvatarFallback>
        </Avatar>
        {isExpanded && (
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-white/50 truncate">
              {ROLE_LABELS[user?.role || ""] || user?.role}
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 py-2">
        {sections.map((section) => (
          <div key={section.id} className="mb-1">
            {isExpanded && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider truncate">
                {section.titleTr}
              </p>
            )}
            {section.items.map((item) => {
              const IconComp = ICON_MAP[item.icon] || Home;
              const active = isItemActive(item.path);

              if (!isExpanded) {
                return (
                  <Tooltip key={item.id} delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Link href={item.path}>
                        <button
                          data-testid={`sidebar-${item.id}`}
                          className={cn(
                            "w-full flex items-center justify-center h-9 transition-all duration-150",
                            active
                              ? "bg-amber-500/20"
                              : "hover:bg-white/10"
                          )}
                        >
                          <IconComp
                            className={cn(
                              "w-[18px] h-[18px]",
                              active ? "text-amber-400" : "text-white/50"
                            )}
                          />
                        </button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.titleTr}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link key={item.id} href={item.path}>
                  <button
                    data-testid={`sidebar-${item.id}`}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 h-8 text-left transition-all duration-150",
                      active
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-white/60 hover:bg-white/10 hover:text-white/80"
                    )}
                  >
                    <IconComp className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs truncate">{item.titleTr}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        ))}
      </ScrollArea>

      <div className={cn(
        "flex-shrink-0 border-t border-white/10 py-2",
        isExpanded ? "px-3" : "flex justify-center"
      )}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link href={user ? `/personel/${user.id}` : "/login"}>
              <button
                data-testid="sidebar-profile"
                className={cn(
                  "flex items-center gap-2.5 h-8 transition-all hover:bg-white/10 rounded-md",
                  isExpanded ? "w-full px-2" : "w-9 justify-center"
                )}
              >
                <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-xs text-white/60 truncate">Profilim</span>
                )}
              </button>
            </Link>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right" sideOffset={8}>
              Profilim
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
