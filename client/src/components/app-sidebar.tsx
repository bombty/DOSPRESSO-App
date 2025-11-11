import * as LucideIcons from "lucide-react";
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Settings,
  Wrench,
  BookOpen,
  GraduationCap,
  Bot,
  BarChart3,
  Building2,
  Users,
  MessageSquare,
  Bell,
  Megaphone,
  Wallet,
  Clock,
  Calendar,
  ChevronRight,
  QrCode,
  Circle,
} from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { canAccessModule, isHQRole, isBranchRole, type PermissionModule, type MenuSection, type MenuItem as DBMenuItem, type MenuVisibilityRule } from "@shared/schema";
import dospressoLogo from "@assets/IMG_5044_1762707935781.png";
import { useQuery } from "@tanstack/react-query";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { useEffect } from "react";

// PHASE 1: Icon mapping dictionary
const lucideIconMap: Record<string, any> = {
  "Home": LucideIcons.Home,
  "Users": LucideIcons.Users,
  "Calendar": LucideIcons.Calendar,
  "Clipboard": LucideIcons.Clipboard,
  "ClipboardList": LucideIcons.ClipboardList,
  "CheckSquare": LucideIcons.CheckSquare,
  "Settings": LucideIcons.Settings,
  "Wrench": LucideIcons.Wrench,
  "BookOpen": LucideIcons.BookOpen,
  "GraduationCap": LucideIcons.GraduationCap,
  "Bot": LucideIcons.Bot,
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
};

const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return LucideIcons.Circle;
  return lucideIconMap[iconName] || LucideIcons.Circle;
};

type MenuItem = {
  title: string;
  titleTr: string;
  url: string;
  icon: any;
  module: PermissionModule;
  scope?: 'branch' | 'hq' | 'both';
};

type MenuGroup = {
  groupTr: string;
  icon: any;
  scope?: 'branch' | 'hq' | 'both';
  items: MenuItem[];
};

const standaloneItems: MenuItem[] = [
  {
    title: "Dashboard",
    titleTr: "Gösterge Paneli",
    url: "/",
    icon: LayoutDashboard,
    module: "dashboard",
    scope: "both",
  },
  {
    title: "Şubeler",
    titleTr: "Şubeler",
    url: "/subeler",
    icon: Building2,
    module: "branches",
    scope: "hq",
  },
  {
    title: "Bildirimler",
    titleTr: "Bildirimler",
    url: "/bildirimler",
    icon: Bell,
    module: "dashboard",
    scope: "both",
  },
  {
    title: "Duyurular",
    titleTr: "Duyurular",
    url: "/duyurular",
    icon: Megaphone,
    module: "dashboard",
    scope: "both",
  },
  {
    title: "Performans",
    titleTr: "Performans",
    url: "/performans",
    icon: BarChart3,
    module: "performance",
    scope: "hq",
  },
];

const menuGroups: MenuGroup[] = [
  // BRANCH - Şube Operasyonları
  {
    groupTr: "Operasyon",
    icon: CheckSquare,
    scope: "branch",
    items: [
      {
        title: "Görevler",
        titleTr: "Görevler",
        url: "/gorevler",
        icon: CheckSquare,
        module: "tasks",
      },
      {
        title: "Checklistler",
        titleTr: "Checklistler",
        url: "/checklistler",
        icon: ClipboardList,
        module: "checklists",
      },
      {
        title: "Ekipman",
        titleTr: "Ekipman",
        url: "/ekipman",
        icon: Settings,
        module: "equipment",
      },
      {
        title: "Ekipman Arızaları",
        titleTr: "Ekipman Arızaları",
        url: "/ekipman-arizalari",
        icon: Wrench,
        module: "equipment_faults",
      },
      {
        title: "QR Tara",
        titleTr: "QR Tara",
        url: "/qr-tara",
        icon: QrCode,
        module: "equipment",
      },
    ],
  },
  {
    groupTr: "Vardiya & Devam",
    icon: Clock,
    scope: "branch",
    items: [
      {
        title: "Vardiya Yönetimi",
        titleTr: "Vardiya Yönetimi",
        url: "/vardiyalar",
        icon: Clock,
        module: "dashboard",
      },
      {
        title: "Devam Takibi",
        titleTr: "Devam Takibi",
        url: "/devam-takibi",
        icon: Clock,
        module: "employees",
      },
    ],
  },
  {
    groupTr: "Finans",
    icon: Wallet,
    scope: "branch",
    items: [
      {
        title: "Kasa Raporları",
        titleTr: "Kasa Raporları",
        url: "/kasa-raporlari",
        icon: Wallet,
        module: "dashboard",
      },
    ],
  },
  // HQ - Merkez Yönetim
  {
    groupTr: "İK Yönetimi",
    icon: Users,
    scope: "hq",
    items: [
      {
        title: "Eğitim",
        titleTr: "Eğitim",
        url: "/egitim",
        icon: GraduationCap,
        module: "training",
      },
      {
        title: "Personel",
        titleTr: "Personel",
        url: "/ik",
        icon: Users,
        module: "employees",
      },
      {
        title: "İzin Talepleri",
        titleTr: "İzin Talepleri",
        url: "/izin-talepleri",
        icon: Calendar,
        module: "employees",
      },
      {
        title: "İK Raporları",
        titleTr: "İK Raporları",
        url: "/ik-raporlari",
        icon: BarChart3,
        module: "employees",
      },
    ],
  },
  {
    groupTr: "Bilgi Bankası",
    icon: BookOpen,
    scope: "hq",
    items: [
      {
        title: "Bilgi Bankası",
        titleTr: "Bilgi Bankası",
        url: "/bilgi-bankasi",
        icon: BookOpen,
        module: "knowledge_base",
      },
    ],
  },
  // BOTH - Herkes
  {
    groupTr: "Destek",
    icon: MessageSquare,
    scope: "both",
    items: [
      {
        title: "HQ Destek",
        titleTr: "HQ Destek",
        url: "/hq-destek",
        icon: MessageSquare,
        module: "messages",
      },
      {
        title: "AI Asistan",
        titleTr: "AI Asistan",
        url: "/ai-asistan",
        icon: Bot,
        module: "ai_assistant",
      },
    ],
  },
];

// PHASE 4: Visibility Rules Logic
const checkVisibilityRules = (
  menuItemId: number,
  rules: MenuVisibilityRule[],
  user: any
): boolean => {
  const itemRules = rules.filter(r => r.menuItemId === menuItemId);
  if (itemRules.length === 0) return true; // Default: allow if no rules

  // Priority 1: User-specific rules (with branch scoping)
  const userRules = itemRules.filter(r => r.ruleType === 'user' && r.userId === user.id);
  if (userRules.length > 0) {
    // Check for matching branch scope
    const matchingUserRule = userRules.find(r => r.branchId === null || r.branchId === user.branchId);
    if (matchingUserRule) {
      return matchingUserRule.allow;
    }
    // No matching user rule - continue to next priority
  }

  // Priority 2: Role-based rules (with branch scoping)
  const roleRules = itemRules.filter(r => r.ruleType === 'role' && r.role === user.role);
  if (roleRules.length > 0) {
    // Check branch-scoped role rules first
    const branchScopedRule = roleRules.find(r => r.branchId === user.branchId);
    if (branchScopedRule) return branchScopedRule.allow;
    
    // Then check global role rules (branchId = null)
    const globalRoleRule = roleRules.find(r => r.branchId === null);
    if (globalRoleRule) return globalRoleRule.allow;
  }

  // Priority 3: Branch-level rules (NEW)
  const branchRules = itemRules.filter(r => r.ruleType === 'branch' && r.branchId === user.branchId);
  if (branchRules.length > 0) {
    // If multiple branch rules exist, use first one (or could use most restrictive)
    return branchRules[0].allow;
  }

  // Default: allow
  return true;
};

// PHASE 3: Data Transformation
const transformDynamicMenu = (
  sections: MenuSection[],
  items: DBMenuItem[],
  rules: MenuVisibilityRule[],
  user: any
): { groups: MenuGroup[], standalone: MenuItem[] } => {
  const sectionItemsMap = new Map<number, DBMenuItem[]>();
  items.forEach(item => {
    if (!item.isActive) return;
    if (item.moduleKey && !canAccessModule(user.role as any, item.moduleKey as PermissionModule)) return;
    
    if (!checkVisibilityRules(item.id, rules, user)) return;
    
    const sectionItems = sectionItemsMap.get(item.sectionId) || [];
    sectionItems.push(item);
    sectionItemsMap.set(item.sectionId, sectionItems);
  });

  const groups: MenuGroup[] = sections
    .filter(section => {
      const sectionItems = sectionItemsMap.get(section.id) || [];
      return sectionItems.length > 0;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(section => ({
      groupTr: section.titleTr,
      icon: getIconComponent(section.icon),
      scope: section.scope as 'hq' | 'branch' | 'both' | undefined,
      items: (sectionItemsMap.get(section.id) || [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(item => ({
          title: item.titleTr,
          titleTr: item.titleTr,
          url: item.path,
          icon: getIconComponent(item.icon),
          module: (item.moduleKey || 'dashboard') as PermissionModule,
          scope: item.scope as 'hq' | 'branch' | 'both' | undefined,
        })),
    }));

  return { groups, standalone: [] };
};

const roleLabels: Record<string, string> = {
  // System
  admin: "Admin",
  // HQ
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı (HQ)",
  // Branch
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  yatirimci: "Yatırımcı",
};

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch unread notification count with adaptive polling
  const pollingInterval = useAdaptivePolling();
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!user,
    refetchInterval: pollingInterval,
  });
  const unreadCount = unreadData?.count || 0;

  // PHASE 2: API Query - Fetch dynamic menu data
  const { data: dynamicMenuData, isError } = useQuery<{
    sections: MenuSection[];
    items: DBMenuItem[];
    rules: MenuVisibilityRule[];
  }>({
    queryKey: ["/api/admin/menu"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!user,
  });

  // PHASE 5: Fallback Mechanism
  const { groups: dynamicGroups, standalone: dynamicStandalone } = dynamicMenuData && !isError && user
    ? transformDynamicMenu(dynamicMenuData.sections, dynamicMenuData.items, dynamicMenuData.rules, user)
    : { groups: [], standalone: [] };

  const activeMenuGroups = dynamicGroups.length > 0 ? dynamicGroups : menuGroups;
  const activeStandaloneItems = dynamicStandalone.length > 0 ? dynamicStandalone : standaloneItems;

  useEffect(() => {
    if (dynamicGroups.length === 0 && !isError && user) {
      console.log("[Sidebar] Using hardcoded menu (dynamic menu empty)");
    }
  }, [dynamicGroups.length, isError, user]);

  // Helper to check if user can see item based on scope
  const canSeeScope = (scope?: 'branch' | 'hq' | 'both') => {
    if (!scope || scope === 'both' || user?.role === 'admin') return true;
    if (scope === 'branch') return isBranchRole(user?.role as any);
    if (scope === 'hq') return isHQRole(user?.role as any);
    return false;
  };

  // Filter standalone items based on scope and permissions
  const visibleStandaloneItems = activeStandaloneItems.filter((item) => {
    if (!user?.role) return false;
    return canSeeScope(item.scope) && canAccessModule(user.role as any, item.module);
  });

  // Filter menu groups based on scope and permissions (exact match only)
  const filterMenuGroups = (targetScope: 'branch' | 'hq' | 'both') => {
    return activeMenuGroups
      .filter((group) => canSeeScope(group.scope) && group.scope === targetScope)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!user?.role) return false;
          return canAccessModule(user.role as any, item.module);
        }),
      }))
      .filter((group) => group.items.length > 0);
  };

  const branchMenuGroups = filterMenuGroups('branch');
  const hqMenuGroups = filterMenuGroups('hq');
  const bothMenuGroups = filterMenuGroups('both');

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem('dospresso_token');
    
    // Dispatch custom event to notify useAuth hook
    window.dispatchEvent(new Event('tokenChanged'));
    
    // Clear all cached queries
    queryClient.clear();
    
    // Navigate to login page
    navigate('/login');
  };

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
              {visibleStandaloneItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon />
                      <span>{item.titleTr}</span>
                      {item.url === '/bildirimler' && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto" data-testid="badge-unread-count">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {branchMenuGroups.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Şube Operasyonları
                  </div>
                  {branchMenuGroups.map((group) => (
                    <Collapsible key={group.groupTr} defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton data-testid={`button-${group.groupTr.toLowerCase().replace(/\s+/g, '-')}`}>
                            <group.icon />
                            <span>{group.groupTr}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {group.items.map((item) => (
                              <SidebarMenuSubItem key={item.url}>
                                <SidebarMenuSubButton asChild isActive={location === item.url}>
                                  <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <item.icon />
                                    <span>{item.titleTr}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                </>
              )}
              
              {hqMenuGroups.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Merkez (HQ)
                  </div>
                  {hqMenuGroups.map((group) => (
                    <Collapsible key={group.groupTr} defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton data-testid={`button-${group.groupTr.toLowerCase().replace(/\s+/g, '-')}`}>
                            <group.icon />
                            <span>{group.groupTr}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {group.items.map((item) => (
                              <SidebarMenuSubItem key={item.url}>
                                <SidebarMenuSubButton asChild isActive={location === item.url}>
                                  <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <item.icon />
                                    <span>{item.titleTr}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                </>
              )}
              
              {bothMenuGroups.map((group) => (
                <Collapsible key={group.groupTr} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton data-testid={`button-${group.groupTr.toLowerCase().replace(/\s+/g, '-')}`}>
                        <group.icon />
                        <span>{group.groupTr}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild isActive={location === item.url}>
                              <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                <item.icon />
                                <span>{item.titleTr}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "Kullanıcı"}
            </p>
            <Badge variant="secondary" className="mt-1" data-testid="badge-user-role">
              {roleLabels[user?.role as string] || "Kullanıcı"}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground text-left"
          data-testid="button-logout"
        >
          Çıkış Yap
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

// PHASE 6: Cache Invalidation Export
export const invalidateMenuCache = () => {
  queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
};
