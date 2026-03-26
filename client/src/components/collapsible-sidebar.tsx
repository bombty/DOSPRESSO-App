import { useState, useEffect, useCallback } from "react";
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
  ChevronRight, ChevronDown, QrCode, Tablet, Grid, Clock,
  Truck, ClipboardCheck, Briefcase,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, LayoutDashboard: Home, MessageSquare, GraduationCap,
  Building2, Factory, BarChart2, BarChart3, CheckSquare, Timer,
  User, Users, Settings, Star, Calculator, ShoppingCart, Package,
  Wrench, AlertTriangle, Calendar, UserCheck, BookOpen, FileText,
  Megaphone, Bell, Shield, Headphones, FolderKanban, ClipboardList,
  Brain, ChevronRight, QrCode, Tablet, Grid, Clock, Truck,
  ClipboardCheck, Briefcase,
  MessageSquareHeart: MessageSquare,
  ShieldCheck: Shield,
  Fingerprint: UserCheck,
  Banknote: Calculator,
  HardDrive: Settings,
  LayoutGrid: Settings,
  CalendarDays: Calendar,
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

const STORAGE_KEY = "dospresso_sidebar_groups";

function isSingleItemSection(section: MenuSection): boolean {
  return section.items.length === 1 && section.titleTr === section.items[0].titleTr;
}

export function CollapsibleSidebar({ isExpanded }: CollapsibleSidebarProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: menuData } = useQuery<{ sections: MenuSection[] }>({
    queryKey: ["/api/me/menu"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const sections = menuData?.sections || [];

  const isItemActive = useCallback((path: string) =>
    location === path || (path !== "/" && location.startsWith(path.split("?")[0])), [location]);

  const getActiveSectionId = useCallback(() => {
    for (const section of sections) {
      for (const item of section.items) {
        if (isItemActive(item.path)) return section.id;
      }
    }
    return null;
  }, [sections, isItemActive]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set<string>();
  });

  useEffect(() => {
    const activeSectionId = getActiveSectionId();
    if (activeSectionId && !expandedGroups.has(activeSectionId)) {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeSectionId);
        return next;
      });
    }
  }, [location, sections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedGroups]));
    } catch {}
  }, [expandedGroups]);

  const toggleGroup = (sectionId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col flex-shrink-0 z-40 transition-[width] duration-200 ease-in-out overflow-hidden",
        "bg-sidebar border-r border-sidebar-border",
        isExpanded ? "w-[220px]" : "w-12"
      )}
      data-testid="collapsible-sidebar"
    >
      <div className={cn(
        "flex items-center py-3 flex-shrink-0 border-b border-sidebar-border",
        isExpanded ? "px-3 gap-3" : "justify-center px-0"
      )}>
        {isExpanded ? (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            D
          </div>
        )}
        {isExpanded && (
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {ROLE_LABELS[user?.role || ""] || user?.role}
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 py-1">
        {sections.map((section) => {
          const SectionIcon = ICON_MAP[section.icon] || Home;
          const singleItem = isSingleItemSection(section);
          const isGroupOpen = expandedGroups.has(section.id);
          const hasActiveItem = section.items.some(item => isItemActive(item.path));

          if (singleItem) {
            const item = section.items[0];
            const IconComp = ICON_MAP[item.icon] || Home;
            const active = isItemActive(item.path);

            if (!isExpanded) {
              return (
                <Tooltip key={section.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Link href={item.path}>
                      <button
                        data-testid={`sidebar-${item.id}`}
                        className={cn(
                          "w-full flex items-center justify-center h-9 transition-all duration-150",
                          active
                            ? "bg-sidebar-accent text-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>{item.titleTr}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={section.id} href={item.path}>
                <button
                  data-testid={`sidebar-${item.id}`}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 h-8 text-left transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <IconComp className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs truncate">{item.titleTr}</span>
                </button>
              </Link>
            );
          }

          if (!isExpanded) {
            return (
              <Tooltip key={section.id} delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    data-testid={`sidebar-group-${section.id}`}
                    onClick={() => {
                      const firstItem = section.items[0];
                      if (firstItem) {
                        setLocation(firstItem.path);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-center h-9 transition-all duration-150",
                      hasActiveItem
                        ? "bg-sidebar-accent text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <SectionIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div className="space-y-1">
                    <p className="font-medium text-xs">{section.titleTr}</p>
                    {section.items.map(item => (
                      <Link key={item.id} href={item.path}>
                        <p className={cn(
                          "text-xs cursor-pointer py-0.5",
                          isItemActive(item.path) ? "text-primary" : "hover:text-foreground"
                        )}>
                          {item.titleTr}
                        </p>
                      </Link>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={section.id} className="mb-0.5">
              <button
                data-testid={`sidebar-group-${section.id}`}
                onClick={() => toggleGroup(section.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 h-8 text-left transition-all duration-150",
                  hasActiveItem
                    ? "text-primary"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <SectionIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate flex-1">{section.titleTr}</span>
                <ChevronDown className={cn(
                  "w-3 h-3 flex-shrink-0 transition-transform duration-200",
                  isGroupOpen ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              <div className={cn(
                "overflow-hidden transition-all duration-200",
                isGroupOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {section.items.map((item) => {
                  const IconComp = ICON_MAP[item.icon] || Home;
                  const active = isItemActive(item.path);

                  return (
                    <Link key={item.id} href={item.path}>
                      <button
                        data-testid={`sidebar-${item.id}`}
                        className={cn(
                          "w-full flex items-center gap-2.5 pl-7 pr-3 h-7 text-left transition-all duration-150",
                          active
                            ? "bg-sidebar-accent text-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[11px] truncate">{item.titleTr}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </ScrollArea>

      <div className={cn(
        "flex-shrink-0 border-t border-sidebar-border py-2",
        isExpanded ? "px-3" : "flex justify-center"
      )}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link href={user ? `/personel/${user.id}` : "/login"}>
              <button
                data-testid="sidebar-profile"
                className={cn(
                  "flex items-center gap-2.5 h-8 transition-all rounded-md",
                  "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isExpanded ? "w-full px-2" : "w-9 justify-center"
                )}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-xs truncate">Profilim</span>
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
