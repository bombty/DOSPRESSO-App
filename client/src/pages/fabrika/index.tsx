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
  CheckCircle2,
  TrendingUp,
  Calendar,
  Brain,
  ClipboardList,
  Factory,
  Calculator,
  Clock,
  Package,
  Truck,
  Shield,
  ScanBarcode,
  Flame,
  Award,
  LayoutDashboard,
  AlertTriangle,
  Users,
  Target,
} from "lucide-react";

const FabrikaDashboardTab = lazy(() => import("./dashboard").then(mod => ({
  default: () => mod.default({ embedded: true })
})));
const FabrikaKaliteKontrol = lazy(() => import("./kalite-kontrol"));
const FabrikaPerformans = lazy(() => import("./performans"));
const FabrikaVardiyaUyumluluk = lazy(() => import("./vardiya-uyumluluk"));
const FabrikaAIRaporlar = lazy(() => import("./ai-raporlar"));
const FabrikaUretimPlanlama = lazy(() => import("./uretim-planlama"));
const FabrikaMaliyetYonetimi = lazy(() => import("./maliyet-yonetimi"));
const FabrikaVardiyaPlanlama = lazy(() => import("./vardiya-planlama"));
const FabrikaStokSayim = lazy(() => import("./stok-sayim"));
const FabrikaSiparisHazirlama = lazy(() => import("./siparis-hazirlama"));
const FabrikaSevkiyat = lazy(() => import("./sevkiyat"));
const GidaGuvenligi = lazy(() => import("./gida-guvenligi"));
const LotIzleme = lazy(() => import("./lot-izleme"));
const Kavurma = lazy(() => import("./kavurma"));
const FabrikaYonetimSkoru = lazy(() => import("./fabrika-yonetim-skoru"));

interface ViewConfig {
  id: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  restrictedToRoles?: string[];
  section: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const VIEWS: ViewConfig[] = [
  { id: "dashboard", labelTr: "Dashboard", icon: <LayoutDashboard />, section: "genel", component: FabrikaDashboardTab },
  { id: "kalite-kontrol", labelTr: "Kalite Kontrol", icon: <CheckCircle2 />, permissionModule: "factory_quality", section: "genel", component: FabrikaKaliteKontrol },
  { id: "lot-izleme", labelTr: "LOT İzleme", icon: <ScanBarcode />, permissionModule: "factory_production", section: "genel", component: LotIzleme },
  { id: "uretim-planlama", labelTr: "Üretim Planlama", icon: <ClipboardList />, permissionModule: "factory_stations", section: "uretim", component: FabrikaUretimPlanlama },
  { id: "siparis-hazirlama", labelTr: "Sipariş Hazırlama", icon: <Package />, permissionModule: "factory_stations", section: "uretim", component: FabrikaSiparisHazirlama },
  { id: "kavurma", labelTr: "Kavurma", icon: <Flame />, permissionModule: "factory_production", section: "uretim", component: Kavurma },
  { id: "stok-sayim", labelTr: "Stok Sayım", icon: <ClipboardList />, permissionModule: "factory_stations", restrictedToRoles: ["admin", "fabrika_mudur"], section: "uretim", component: FabrikaStokSayim },
  { id: "sevkiyat", labelTr: "Sevkiyat", icon: <Truck />, permissionModule: "factory_shipments", section: "sevkiyat", component: FabrikaSevkiyat },
  { id: "vardiya-planlama", labelTr: "Vardiya Planlama", icon: <Clock />, permissionModule: "factory_stations", section: "yonetim", component: FabrikaVardiyaPlanlama },
  { id: "vardiya-uyumluluk", labelTr: "Vardiya Uyumluluk", icon: <Calendar />, permissionModule: "factory_compliance", restrictedToRoles: ["admin", "fabrika_mudur"], section: "yonetim", component: FabrikaVardiyaUyumluluk },
  { id: "maliyet-yonetimi", labelTr: "Maliyet Yönetimi", icon: <Calculator />, permissionModule: "factory_analytics", restrictedToRoles: ["admin", "muhasebe", "muhasebe_ik", "satinalma"], section: "yonetim", component: FabrikaMaliyetYonetimi },
  { id: "gida-guvenligi", labelTr: "Gıda Güvenliği", icon: <Shield />, permissionModule: "factory_food_safety", section: "yonetim", component: GidaGuvenligi },
  { id: "performans", labelTr: "Performans", icon: <TrendingUp />, permissionModule: "factory_analytics", section: "analitik", component: FabrikaPerformans },
  { id: "yonetim-skoru", labelTr: "Yönetim Skoru", icon: <Award />, permissionModule: "factory_analytics", restrictedToRoles: ["admin", "ceo", "cgo", "fabrika_mudur"], section: "analitik", component: FabrikaYonetimSkoru },
  { id: "ai-raporlar", labelTr: "AI Raporlar", icon: <Brain />, permissionModule: "factory_analytics", restrictedToRoles: ["admin", "fabrika_mudur"], section: "analitik", component: FabrikaAIRaporlar },
];

function getViewFromPath(path: string): string | null {
  const parts = path.split("/");
  if (parts.length > 2) {
    const viewId = parts[2];
    if (VIEWS.find((v) => v.id === viewId)) return viewId;
  }
  return null;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function FabrikaMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const visibleViews = VIEWS.filter((v) => {
    if (!user?.role) return false;
    if (v.restrictedToRoles && !v.restrictedToRoles.includes(user.role)) return false;
    if (!v.permissionModule) return true;
    if (user.role === "admin") return true;
    return canAccess(v.permissionModule!, "view");
  });

  const firstVisible = visibleViews[0]?.id || "dashboard";

  const initialView = getViewFromPath(location);
  const [activeView, setActiveView] = useState(
    initialView && visibleViews.find((v) => v.id === initialView) ? initialView : firstVisible
  );

  useEffect(() => {
    const vFromPath = getViewFromPath(location);
    if (vFromPath && vFromPath !== activeView && visibleViews.find((v) => v.id === vFromPath)) {
      setActiveView(vFromPath);
    }
  }, [location, visibleViews]);

  useEffect(() => {
    if (!visibleViews.find((v) => v.id === activeView)) {
      setActiveView(firstVisible);
    }
  }, [visibleViews, activeView, firstVisible]);

  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    if (viewId !== "dashboard") {
      setLocation(`/fabrika/${viewId}`);
    } else {
      setLocation("/fabrika");
    }
  };

  const { data: factoryStats } = useQuery<{
    todayProduction?: number;
    wasteRate?: number;
    qcPending?: number;
    activeStations?: number;
  }>({
    queryKey: ["/api/factory/stats"],
    enabled: !!user,
  });

  const kpiMetrics: KPIMetric[] = [
    { label: "Bugün Üretim", value: factoryStats?.todayProduction ?? "—", icon: <Package className="h-4 w-4" /> },
    { label: "Fire Oranı", value: factoryStats?.wasteRate != null ? `%${factoryStats.wasteRate}` : "—", color: (factoryStats?.wasteRate ?? 0) > 2 ? "text-red-500" : undefined, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "QC Bekleyen", value: factoryStats?.qcPending ?? "—", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Aktif İstasyon", value: factoryStats?.activeStations ?? "—", icon: <Target className="h-4 w-4" /> },
  ];

  const sectionMap: Record<string, string> = {
    genel: "GENEL",
    uretim: "ÜRETİM",
    sevkiyat: "SEVKİYAT",
    yonetim: "YÖNETİM",
    analitik: "ANALİTİK",
  };

  const sidebarSections: SidebarSection[] = Object.entries(sectionMap)
    .map(([key, title]) => ({
      title,
      items: visibleViews
        .filter((v) => v.section === key)
        .map((v) => ({ id: v.id, label: v.labelTr, icon: v.icon })),
    }))
    .filter((s) => s.items.length > 0);

  if (visibleViews.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Fabrika & Üretim
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
      title="Fabrika & Üretim"
      description="Üretim yönetimi ve kalite kontrol"
      icon={<Factory className="h-6 w-6" />}
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
