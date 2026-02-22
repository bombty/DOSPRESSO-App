import * as LucideIcons from "lucide-react";
import { ChevronRight, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { type SidebarMenuResponse, type SidebarMenuSection, type SidebarMenuItem as SidebarMenuItemType, type SidebarMenuGroup } from "@shared/schema";
import dospressoLogo from "@assets/IMG_6637_1765138781125.png";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { NAV_GROUPS } from "@/lib/nav-registry";

// Icon mapping dictionary
const lucideIconMap: Record<string, any> = {
  "Home": LucideIcons.Home,
  "Users": LucideIcons.Users,
  "Calendar": LucideIcons.Calendar,
  "CalendarDays": LucideIcons.CalendarDays,
  "Clipboard": LucideIcons.Clipboard,
  "ClipboardList": LucideIcons.ClipboardList,
  "ClipboardCheck": LucideIcons.ClipboardCheck,
  "CheckSquare": LucideIcons.CheckSquare,
  "ListChecks": LucideIcons.ListChecks,
  "Settings": LucideIcons.Settings,
  "Wrench": LucideIcons.Wrench,
  "BookOpen": LucideIcons.BookOpen,
  "GraduationCap": LucideIcons.GraduationCap,
  "Bot": LucideIcons.Bot,
  "Sparkles": LucideIcons.Sparkles,
  "BarChart": LucideIcons.BarChart3,
  "BarChart3": LucideIcons.BarChart3,
  "Building2": LucideIcons.Building2,
  "MessageSquare": LucideIcons.MessageSquare,
  "Bell": LucideIcons.Bell,
  "Megaphone": LucideIcons.Megaphone,
  "Wallet": LucideIcons.Wallet,
  "Clock": LucideIcons.Clock,
  "QrCode": LucideIcons.QrCode,
  "Package": LucideIcons.Package,
  "DollarSign": LucideIcons.DollarSign,
  "TrendingUp": LucideIcons.TrendingUp,
  "FileText": LucideIcons.FileText,
  "Users2": LucideIcons.Users2,
  "ShoppingCart": LucideIcons.ShoppingCart,
  "LayoutDashboard": LucideIcons.LayoutDashboard,
  "FileSearch": LucideIcons.FileSearch,
  "Store": LucideIcons.Store,
  "Star": LucideIcons.Star,
  "Award": LucideIcons.Award,
  "Circle": LucideIcons.Circle,
  "AlertTriangle": LucideIcons.AlertTriangle,
  "Briefcase": LucideIcons.Briefcase,
  "Factory": LucideIcons.Factory,
  "Grid": LucideIcons.Grid2x2,
  "Tablet": LucideIcons.Tablet,
  "Shield": LucideIcons.Shield,
  "Timer": LucideIcons.Timer,
  "UserCheck": LucideIcons.UserCheck,
  "Headphones": LucideIcons.Headphones,
  "Calculator": LucideIcons.Calculator,
  "FolderKanban": LucideIcons.FolderKanban,
  "Truck": LucideIcons.Truck,
  "HardDrive": LucideIcons.HardDrive,
  "LayoutGrid": LucideIcons.LayoutGrid,
  "ShieldCheck": LucideIcons.ShieldCheck,
  "MessageSquareHeart": LucideIcons.MessageCircleHeart,
};

const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return LucideIcons.Circle;
  return lucideIconMap[iconName] || LucideIcons.Circle;
};

const ROLE_LABEL_KEYS: Record<string, { key: string; tr: string; en: string }> = {
  admin: { key: "role.admin", tr: "Admin", en: "Admin" },
  ceo: { key: "role.ceo", tr: "CEO", en: "CEO" },
  cgo: { key: "role.cgo", tr: "CGO", en: "CGO" },
  muhasebe_ik: { key: "role.muhasebe_ik", tr: "Muhasebe & İK", en: "Accounting & HR" },
  satinalma: { key: "role.satinalma", tr: "Satın Alma", en: "Procurement" },
  coach: { key: "role.coach", tr: "Coach", en: "Coach" },
  marketing: { key: "role.marketing", tr: "Marketing", en: "Marketing" },
  trainer: { key: "role.trainer", tr: "Trainer (Eğitmen)", en: "Trainer" },
  kalite_kontrol: { key: "role.kalite_kontrol", tr: "Kalite Kontrol", en: "Quality Control" },
  gida_muhendisi: { key: "role.gida_muhendisi", tr: "Gıda Mühendisi", en: "Food Engineer" },
  fabrika_mudur: { key: "role.fabrika_mudur", tr: "Fabrika Müdürü", en: "Factory Manager" },
  muhasebe: { key: "role.muhasebe", tr: "Muhasebe", en: "Accounting" },
  teknik: { key: "role.teknik", tr: "Teknik", en: "Technical" },
  destek: { key: "role.destek", tr: "Destek", en: "Support" },
  fabrika: { key: "role.fabrika", tr: "Fabrika", en: "Factory" },
  yatirimci_hq: { key: "role.yatirimci_hq", tr: "Yatırımcı HQ", en: "Investor HQ" },
  stajyer: { key: "role.stajyer", tr: "Stajyer", en: "Intern" },
  bar_buddy: { key: "role.bar_buddy", tr: "Bar Buddy", en: "Bar Buddy" },
  barista: { key: "role.barista", tr: "Barista", en: "Barista" },
  supervisor_buddy: { key: "role.supervisor_buddy", tr: "Supervisor Buddy", en: "Supervisor Buddy" },
  supervisor: { key: "role.supervisor", tr: "Supervisor", en: "Supervisor" },
  mudur: { key: "role.mudur", tr: "Müdür", en: "Manager" },
  yatirimci_branch: { key: "role.yatirimci_branch", tr: "Yatırımcı", en: "Investor" },
  fabrika_operator: { key: "role.fabrika_operator", tr: "Fabrika Operatör", en: "Factory Operator" },
  fabrika_sorumlu: { key: "role.fabrika_sorumlu", tr: "Fabrika Sorumlu", en: "Factory Supervisor" },
  fabrika_personel: { key: "role.fabrika_personel", tr: "Fabrika Personel", en: "Factory Personnel" },
  ik: { key: "role.ik", tr: "İK", en: "HR" },
  pazarlama: { key: "role.pazarlama", tr: "Pazarlama", en: "Marketing" },
  ekipman_teknik: { key: "role.ekipman_teknik", tr: "Ekipman Teknik", en: "Equipment Technical" },
};

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation("common");

  const getRoleLabel = (role: string): string => {
    const def = ROLE_LABEL_KEYS[role];
    if (!def) return role;
    return t(def.key, { defaultValue: i18n.language === "en" ? def.en : def.tr });
  };

  // Fetch menu from server (v2 API - pre-filtered by role)
  // Short staleTime + refetchInterval ensures permission changes reflect quickly
  const { data: menuData, isLoading: isMenuLoading, isError } = useQuery<SidebarMenuResponse>({
    queryKey: ["sidebar-menu", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/menu", { credentials: "include" });
      if (!res.ok) throw new Error("Menu fetch failed");
      return res.json();
    },
    staleTime: 10 * 1000, // 10 seconds - shorter for faster permission updates
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds to catch permission changes
    enabled: !!user,
  });

  const sections = menuData?.sections || [];
  const badges = menuData?.badges || {};

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      queryClient.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const GROUP_ORDER: SidebarMenuGroup[] = ["operations", "management", "settings"];
  const sectionsByGroup = GROUP_ORDER.map(g => {
    const grpDef = NAV_GROUPS.find(ng => ng.id === g);
    return {
      group: g,
      label: grpDef ? t(grpDef.labelKey, { defaultValue: grpDef.defaultLabelTR }) : g,
      items: sections.filter(s => s.group === g),
    };
  }).filter(g => g.items.length > 0);

  const renderMenuSection = (section: SidebarMenuSection) => {
    const IconComponent = getIconComponent(section.icon);
    
    // If section title is empty and there's only one item, render as direct link
    if (!section.titleTr && section.items.length === 1) {
      const item = section.items[0];
      return (
        <SidebarMenuItem key={section.id}>
          <SidebarMenuButton asChild isActive={location === item.path} data-testid={`link-${item.id}`}>
            <Link href={item.path}>
              <span>{item.titleTr}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
    
    return (
      <Collapsible key={section.id} defaultOpen className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton data-testid={`button-section-${section.id}`}>
              <IconComponent className="h-4 w-4" />
              <span>{section.titleTr}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {section.items.map((item) => renderMenuItem(item))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  const renderMenuItem = (item: SidebarMenuItemType) => {
    const badgeCount = item.badge ? badges[item.badge] : 0;
    
    return (
      <SidebarMenuSubItem key={item.id}>
        <SidebarMenuSubButton asChild isActive={location === item.path}>
          <Link href={item.path} data-testid={`link-${item.id}`}>
            <span>{item.titleTr}</span>
            {badgeCount > 0 && (
              <Badge variant="destructive" className="ml-auto" data-testid={`badge-${item.id}`}>
                {badgeCount}
              </Badge>
            )}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  // Loading state
  if (isMenuLoading) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 py-4">
              <img src={dospressoLogo} alt="DOSPRESSO" className="h-12 w-auto" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-4">
            <img 
              src={dospressoLogo} 
              alt="DOSPRESSO" 
              className="h-12 w-auto cursor-pointer"
              data-testid="img-dospresso-logo"
              onClick={() => {
                const homePath = user?.role === 'ceo' ? '/ceo-command-center' : user?.role === 'cgo' ? '/cgo-command-center' : '/';
                navigate(homePath);
              }}
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sectionsByGroup.map((grp, gi) => (
                <div key={grp.group}>
                  {gi > 0 && <div className="my-2 border-t" />}
                  <div className="mt-2 mb-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {grp.label}
                  </div>
                  {grp.items.map(renderMenuSection)}
                </div>
              ))}
              
              {isError && sections.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  {t("menuLoadError", { defaultValue: "Menü yüklenemedi" })}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <div className="flex items-center gap-3 pt-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback data-testid="avatar-fallback">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.username || t("user", { defaultValue: "Kullanıcı" })}
            </p>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-user-role">
              {user?.role ? getRoleLabel(user.role) : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="button-logout"
            title={t("logout", { defaultValue: "Çıkış Yap" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Export for cache invalidation from other components
export function invalidateMenuCache() {
  queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
}
