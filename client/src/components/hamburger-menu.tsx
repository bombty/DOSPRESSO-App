import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu,
  Building2,
  Wrench,
  GraduationCap,
  BarChart3,
  Factory,
  Users,
  ShoppingCart,
  Settings,
  Briefcase,
  ChevronRight,
  ClipboardList,
  Calendar,
  MessageSquare,
  BookOpen,
  Star,
  Calculator,
  Shield,
  Bot,
  Coffee,
  Headphones,
  FolderKanban,
  Megaphone,
  Database,
  Package,
  MapPin,
  FileText,
  Home,
  CheckSquare,
  ClipboardCheck,
  UserCheck,
  Heart,
  Bell,
  Truck,
} from "lucide-react";

interface MenuCategory {
  id: string;
  title: string;
  icon: any;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  badge?: number;
}

const ICON_MAP: Record<string, any> = {
  Home, Building2, Wrench, GraduationCap, BarChart3, Factory, Users,
  ShoppingCart, Settings, Briefcase, ClipboardList, Calendar, MessageSquare,
  BookOpen, Star, Calculator, Shield, Bot, Coffee, Headphones, FolderKanban,
  Megaphone, Database, Package, MapPin, FileText, CheckSquare, ClipboardCheck,
  UserCheck, Heart, Bell, Truck,
};

function getIconComponent(iconName: string | undefined): any {
  if (!iconName) return Coffee;
  return ICON_MAP[iconName] || Coffee;
}

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: dashboardModulesData } = useQuery<any>({
    queryKey: ["/api/dashboard-modules"],
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: faults = [] } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const res = await fetch("/api/faults");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  const openFaults = faults.filter((f: any) => f.currentStage !== "kapatildi").length;
  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede").length;

  const serverMegaModules = dashboardModulesData?.megaModules || [];

  const categories: MenuCategory[] = serverMegaModules.map((mm: any) => ({
    id: mm.id,
    title: mm.title,
    icon: getIconComponent(mm.icon),
    items: (mm.items || []).map((item: any) => {
      const itemPath = item.path || '';
      let badge: number | undefined;
      if (itemPath.includes('gorev') || itemPath.includes('task')) badge = pendingTasks > 0 ? pendingTasks : undefined;
      if (itemPath.includes('ariza') || itemPath.includes('fault')) badge = openFaults > 0 ? openFaults : undefined;

      return {
        id: item.path || item.id,
        label: item.title,
        path: item.path,
        icon: getIconComponent(item.icon),
        badge,
      };
    }),
  }));

  const handleNavigate = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          data-testid="button-hamburger-menu"
          title="Menü"
        >
          <Menu className="w-4 h-4 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0" data-testid="panel-hamburger-menu">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            DOSPRESSO
          </SheetTitle>
          {user && (
            <p className="text-xs text-muted-foreground">
              {user.firstName || user.username} - {user.role}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="py-2">
            <button
              onClick={() => handleNavigate("/")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
              data-testid="menu-item-home"
            >
              <Home className="w-4 h-4 text-primary" />
              <span className="font-medium">Ana Sayfa</span>
            </button>

            {categories
              .filter((category) => category.items.length > 0)
              .map((category) => {
                const CategoryIcon = category.icon;
                if (category.items.length === 1) {
                  const item = category.items[0];
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                      data-testid={`menu-item-${item.id}`}
                    >
                      <CategoryIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left font-medium">{category.title}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>
                  );
                }
                return (
                  <div key={category.id} className="mt-1">
                    <div className="px-4 py-2 flex items-center gap-2">
                      <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {category.title}
                      </span>
                    </div>
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.path)}
                          className="w-full flex items-center gap-3 px-4 pl-8 py-2 text-sm hover:bg-accent transition-colors"
                          data-testid={`menu-item-${item.id}`}
                        >
                          <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}

            <div className="mt-3 pt-3 border-t">
              <button
                onClick={() => handleNavigate("/bildirimler")}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                data-testid="menu-item-notifications"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span>Bildirimler</span>
              </button>
              <button
                onClick={() => handleNavigate(user ? `/personel/${user.id}` : "/login")}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                data-testid="menu-item-profile"
              >
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span>Profilim</span>
              </button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
