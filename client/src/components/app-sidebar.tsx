import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Wrench,
  BookOpen,
  BarChart3,
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

const menuItems = [
  {
    title: "Dashboard",
    titleTr: "Gösterge Paneli",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Görevler",
    titleTr: "Görevler",
    url: "/gorevler",
    icon: CheckSquare,
  },
  {
    title: "Checklistler",
    titleTr: "Checklistler",
    url: "/checklistler",
    icon: ClipboardList,
  },
  {
    title: "Ekipman Arızaları",
    titleTr: "Ekipman Arızaları",
    url: "/ekipman-arizalari",
    icon: Wrench,
  },
  {
    title: "Bilgi Bankası",
    titleTr: "Bilgi Bankası",
    url: "/bilgi-bankasi",
    icon: BookOpen,
  },
  {
    title: "Performans",
    titleTr: "Performans",
    url: "/performans",
    icon: BarChart3,
  },
];

const roleLabels: Record<string, string> = {
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  coach: "Coach",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci: "Yatırımcı",
  supervisor: "Supervisor",
  barista: "Barista",
  stajyer: "Stajyer",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold text-primary">
            DOSPRESSO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
        <a
          href="/api/logout"
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
          data-testid="link-logout"
        >
          Çıkış Yap
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
