import { useState, useCallback } from "react";
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
  ChevronDown,
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
  LogOut,
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  const strategicRoles = ['ceo', 'cgo', 'admin'];
  const isStrategicRole = user?.role ? strategicRoles.includes(user.role) : false;

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
      if (!isStrategicRole) {
        if (itemPath.includes('gorev') || itemPath.includes('task')) badge = pendingTasks > 0 ? pendingTasks : undefined;
        if (itemPath.includes('ariza') || itemPath.includes('fault')) badge = openFaults > 0 ? openFaults : undefined;
      }

      return {
        id: item.path || item.id,
        label: item.title,
        path: item.path,
        icon: getIconComponent(item.icon),
        badge,
      };
    }),
  }));

  const handleNavigate = useCallback((path: string) => {
    setOpen(false);
    setLocation(path);
  }, [setLocation]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const getCategoryBadgeCount = (category: MenuCategory): number => {
    return category.items.reduce((sum, item) => sum + (item.badge || 0), 0);
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
      <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0" data-testid="panel-hamburger-menu">
        <SheetHeader className="px-4 pt-4 pb-3 border-b bg-primary/5">
          <SheetTitle className="text-sm font-bold flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            DOSPRESSO
          </SheetTitle>
          {user && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {(user.firstName || user.username || "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{user.firstName || user.username}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="py-1">
            <button
              onClick={() => {
                const homePath = user?.role === 'ceo' ? '/ceo-command-center' : user?.role === 'cgo' ? '/cgo-command-center' : '/';
                handleNavigate(homePath);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover-elevate transition-colors"
              data-testid="menu-item-home"
            >
              <Home className="w-4 h-4 text-primary" />
              <span className="font-medium">Ana Sayfa</span>
            </button>

            <div className="mx-3 my-1 border-t" />

            {categories
              .filter((category) => category.items.length > 0)
              .map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories.has(category.id);
                const totalBadge = getCategoryBadgeCount(category);

                if (category.items.length === 1) {
                  const item = category.items[0];
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover-elevate transition-colors"
                      data-testid={`menu-item-${item.id}`}
                    >
                      <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left font-medium truncate">{category.title}</span>
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
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover-elevate transition-colors"
                      data-testid={`menu-category-${category.id}`}
                    >
                      <CategoryIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left font-semibold truncate">{category.title}</span>
                      {totalBadge > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 mr-1">
                          {totalBadge}
                        </Badge>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="ml-4 border-l border-border/50 mb-1">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavigate(item.path)}
                              className="w-full flex items-center gap-2.5 pl-4 pr-4 py-2 text-[13px] hover-elevate transition-colors"
                              data-testid={`menu-item-${item.id}`}
                            >
                              <ItemIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="flex-1 text-left truncate">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  {item.badge}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

            <div className="mx-3 my-1 border-t" />

            <button
              onClick={() => handleNavigate("/bildirimler")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover-elevate transition-colors"
              data-testid="menu-item-notifications"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span>Iletisim Merkezi</span>
            </button>
            <button
              onClick={() => handleNavigate(user ? `/personel/${user.id}` : "/login")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover-elevate transition-colors"
              data-testid="menu-item-profile"
            >
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <span>Profilim</span>
            </button>

            <div className="mx-3 my-1 border-t" />

            <button
              onClick={() => {
                setOpen(false);
                window.location.href = "/api/logout";
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover-elevate transition-colors"
              data-testid="menu-item-logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
