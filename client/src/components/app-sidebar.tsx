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
import { type SidebarMenuResponse, type SidebarMenuSection, type SidebarMenuItem as SidebarMenuItemType } from "@shared/schema";
import dospressoLogo from "@assets/IMG_5044_1762707935781.png";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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
};

const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return LucideIcons.Circle;
  return lucideIconMap[iconName] || LucideIcons.Circle;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı (HQ)",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  yatirimci_branch: "Yatırımcı (Şube)",
};

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch menu from server (v2 API - pre-filtered by role)
  const { data: menuData, isLoading: isMenuLoading, isError } = useQuery<SidebarMenuResponse>({
    queryKey: ["sidebar-menu", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/menu", { credentials: "include" });
      if (!res.ok) throw new Error("Menu fetch failed");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
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

  // Group sections by scope for visual organization
  const branchSections = sections.filter(s => s.scope === 'branch');
  const hqSections = sections.filter(s => s.scope === 'hq');
  const bothSections = sections.filter(s => s.scope === 'both');

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
              className="h-12 w-auto"
              data-testid="img-dospresso-logo"
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Branch-scoped sections */}
              {branchSections.length > 0 && (
                <>
                  <div className="mt-2 mb-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Şube İşlemleri
                  </div>
                  {branchSections.map(renderMenuSection)}
                </>
              )}
              
              {/* HQ-scoped sections */}
              {hqSections.length > 0 && (
                <>
                  {branchSections.length > 0 && <div className="my-2 border-t" />}
                  <div className="mt-2 mb-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Merkez (HQ)
                  </div>
                  {hqSections.map(renderMenuSection)}
                </>
              )}
              
              {/* Both-scoped sections (shared) */}
              {bothSections.length > 0 && (
                <>
                  {(branchSections.length > 0 || hqSections.length > 0) && <div className="my-2 border-t" />}
                  <div className="mt-2 mb-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Genel İşlemler
                  </div>
                  {bothSections.map(renderMenuSection)}
                </>
              )}
              
              {/* Academy Link */}
              {(branchSections.length > 0 || hqSections.length > 0 || bothSections.length > 0) && <div className="my-2 border-t" />}
              <div className="mt-2 mb-2 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Eğitim
              </div>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/akademi"} data-testid="link-academy">
                  <Link href="/akademi">
                    <LucideIcons.Trophy className="h-4 w-4" />
                    <span>Akademi</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/akademi-hq"} data-testid="link-academy-hq">
                    <Link href="/akademi-hq">
                      <LucideIcons.Settings className="h-4 w-4" />
                      <span>Akademi Yönetimi</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Error state */}
              {isError && sections.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Menü yüklenemedi
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback data-testid="avatar-fallback">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.username || 'Kullanıcı'}
            </p>
            <p className="truncate text-xs text-muted-foreground" data-testid="text-user-role">
              {user?.role ? roleLabels[user.role] || user.role : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="button-logout"
            title="Çıkış Yap"
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
