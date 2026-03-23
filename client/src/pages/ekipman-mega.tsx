import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout, type KPIMetric } from "@/components/module-layout/ModuleLayout";
import type { SidebarSection } from "@/components/module-layout/ModuleSidebar";
import {
  Wrench,
  AlertTriangle,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Settings2,
  CheckCircle2,
  Clock,
} from "lucide-react";

const EkipmanKatalog = lazy(() => import("./ekipman-katalog"));
const Equipment = lazy(() => import("./equipment"));
const FaultHub = lazy(() => import("./ariza"));
const EquipmentAnalytics = lazy(() => import("./ekipman-analitics"));

interface ViewConfig {
  id: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  section: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const VIEWS: ViewConfig[] = [
  { id: "katalog", labelTr: "Merkez Katalog", icon: <BookOpen />, permissionModule: "equipment", section: "genel", component: EkipmanKatalog },
  { id: "ekipman", labelTr: "Ekipman Listesi", icon: <Wrench />, permissionModule: "equipment", section: "genel", component: Equipment },
  { id: "ariza", labelTr: "Arıza Yönetimi", icon: <AlertTriangle />, permissionModule: "faults", section: "genel", component: FaultHub },
  { id: "analitik", labelTr: "Ekipman Analitik", icon: <BarChart3 />, permissionModule: "equipment_analytics", section: "analitik", component: EquipmentAnalytics },
];

const VIEW_URL_MAP: Record<string, string> = {
  katalog: "/ekipman/katalog",
  ekipman: "/ekipman",
  ariza: "/ekipman/ariza",
  analitik: "/ekipman/analitik",
};

function getViewFromUrl(pathname: string): string | null {
  if (pathname.startsWith("/ekipman/katalog")) return "katalog";
  if (pathname.startsWith("/ekipman/ariza")) return "ariza";
  if (pathname.startsWith("/ekipman/analitik")) return "analitik";
  if (pathname === "/ekipman" || pathname === "/ekipman/") return "ekipman";
  return null;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function EkipmanMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const visibleViews = VIEWS.filter((v) => {
    if (!v.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === "admin") return true;
    return canAccess(v.permissionModule!, "view");
  });

  const firstVisible = visibleViews[0]?.id || "ekipman";

  const initialView = getViewFromUrl(location);
  const [activeView, setActiveView] = useState(
    initialView && visibleViews.find((v) => v.id === initialView) ? initialView : firstVisible
  );

  useEffect(() => {
    const vFromUrl = getViewFromUrl(location);
    if (vFromUrl && vFromUrl !== activeView && visibleViews.find((v) => v.id === vFromUrl)) {
      setActiveView(vFromUrl);
    }
  }, [location, visibleViews]);

  useEffect(() => {
    if (!visibleViews.find((v) => v.id === activeView)) {
      setActiveView(firstVisible);
    }
  }, [visibleViews, activeView, firstVisible]);

  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    const url = VIEW_URL_MAP[viewId];
    if (url && location !== url) {
      setLocation(url);
    }
  };

  const { data: equipmentStats } = useQuery<{
    total?: number;
    activeFaults?: number;
    maintenanceDue?: number;
    avgResolutionHours?: number;
  }>({
    queryKey: ["/api/equipment/stats"],
    enabled: !!user,
  });

  const kpiMetrics: KPIMetric[] = [
    { label: "Toplam Ekipman", value: equipmentStats?.total ?? "—", icon: <Wrench className="h-4 w-4" /> },
    { label: "Aktif Arıza", value: equipmentStats?.activeFaults ?? "—", color: (equipmentStats?.activeFaults ?? 0) > 0 ? "text-red-500" : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Bakım Gereken", value: equipmentStats?.maintenanceDue ?? "—", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Ort. Çözüm (saat)", value: equipmentStats?.avgResolutionHours != null ? `${equipmentStats.avgResolutionHours}s` : "—", icon: <Clock className="h-4 w-4" /> },
  ];

  const sidebarSections: SidebarSection[] = [
    {
      title: "GENEL",
      items: visibleViews
        .filter((v) => v.section === "genel")
        .map((v) => ({ id: v.id, label: v.labelTr, icon: v.icon })),
    },
    {
      title: "ANALİTİK",
      items: visibleViews
        .filter((v) => v.section === "analitik")
        .map((v) => ({ id: v.id, label: v.labelTr, icon: v.icon })),
    },
  ];

  if (visibleViews.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Ekipman & Bakım
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu modüle erişim yetkiniz bulunmamaktadır.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeConfig = visibleViews.find((v) => v.id === activeView);

  return (
    <ModuleLayout
      title="Ekipman & Bakım"
      description="Ekipman yönetimi ve arıza takibi"
      icon={<Settings2 className="h-6 w-6" />}
      kpiMetrics={kpiMetrics}
      sidebarSections={sidebarSections}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      {activeConfig && (
        <Suspense fallback={<ContentSkeleton />}>
          <activeConfig.component />
        </Suspense>
      )}
    </ModuleLayout>
  );
}
