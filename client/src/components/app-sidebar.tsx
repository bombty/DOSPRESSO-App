import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Wrench,
  BookOpen,
  Bot,
  BarChart3,
  Building2,
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { canAccessModule, type PermissionModule } from "@shared/schema";
import dospressoLogo from "@assets/IMG_5044_1762707935781.png";

const menuItems: Array<{
  title: string;
  titleTr: string;
  url: string;
  icon: any;
  module: PermissionModule;
}> = [
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
    title: "Ekipman Arızaları",
    titleTr: "Ekipman Arızaları",
    url: "/ekipman-arizalari",
    icon: Wrench,
    module: "equipment_faults",
  },
  {
    title: "Bilgi Bankası",
    titleTr: "Bilgi Bankası",
    url: "/bilgi-bankasi",
    icon: BookOpen,
    module: "knowledge_base",
  },
  {
    title: "AI Asistan",
    titleTr: "AI Asistan",
    url: "/ai-asistan",
    icon: Bot,
    module: "ai_assistant",
  },
  {
    title: "Performans",
    titleTr: "Performans",
    url: "/performans",
    icon: BarChart3,
    module: "performance",
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

  // Filter menu items based on user role permissions
  const visibleMenuItems = menuItems.filter((item) => {
    if (!user?.role) return false;
    return canAccessModule(user.role as any, item.module);
  });

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
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon />
                      <span>{item.titleTr}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
