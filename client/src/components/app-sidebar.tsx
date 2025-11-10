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
import { canAccessModule, type PermissionModule } from "@shared/schema";
import dospressoLogo from "@assets/IMG_5044_1762707935781.png";
import { useQuery } from "@tanstack/react-query";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";

type MenuItem = {
  title: string;
  titleTr: string;
  url: string;
  icon: any;
  module: PermissionModule;
};

type MenuGroup = {
  groupTr: string;
  icon: any;
  items: MenuItem[];
};

const standaloneItems: MenuItem[] = [
  {
    title: "Dashboard",
    titleTr: "Gösterge Paneli",
    url: "/",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    title: "Şubeler",
    titleTr: "Şubeler",
    url: "/subeler",
    icon: Building2,
    module: "branches",
  },
  {
    title: "Bildirimler",
    titleTr: "Bildirimler",
    url: "/bildirimler",
    icon: Bell,
    module: "dashboard",
  },
  {
    title: "Duyurular",
    titleTr: "Duyurular",
    url: "/duyurular",
    icon: Megaphone,
    module: "dashboard",
  },
  {
    title: "Performans",
    titleTr: "Performans",
    url: "/performans",
    icon: BarChart3,
    module: "performance",
  },
];

const menuGroups: MenuGroup[] = [
  {
    groupTr: "İK Yönetimi",
    icon: Users,
    items: [
      {
        title: "Eğitim",
        titleTr: "Eğitim",
        url: "/egitim",
        icon: GraduationCap,
        module: "training",
      },
      {
        title: "Vardiya Yönetimi",
        titleTr: "Vardiya Yönetimi",
        url: "/vardiyalar",
        icon: Clock,
        module: "dashboard",
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
    ],
  },
  {
    groupTr: "Operasyon",
    icon: CheckSquare,
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
    groupTr: "Bilgi Bankası",
    icon: BookOpen,
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
  {
    groupTr: "Finans",
    icon: Wallet,
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
  {
    groupTr: "Destek",
    icon: MessageSquare,
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

  // Filter standalone items based on user role permissions
  const visibleStandaloneItems = standaloneItems.filter((item) => {
    if (!user?.role) return false;
    return canAccessModule(user.role as any, item.module);
  });

  // Filter menu groups based on user role permissions (only show groups with visible items)
  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!user?.role) return false;
        return canAccessModule(user.role as any, item.module);
      }),
    }))
    .filter((group) => group.items.length > 0);

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
              
              {visibleMenuGroups.map((group) => (
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
