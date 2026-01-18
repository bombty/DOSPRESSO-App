import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Monitor,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Brain,
  ClipboardList,
  BarChart3,
  Factory
} from "lucide-react";

const FabrikaDashboard = lazy(() => import("./dashboard"));
const FabrikaKiosk = lazy(() => import("./kiosk"));
const FabrikaKaliteKontrol = lazy(() => import("./kalite-kontrol"));
const FabrikaPerformans = lazy(() => import("./performans"));
const FabrikaVardiyaUyumluluk = lazy(() => import("./vardiya-uyumluluk"));
const FabrikaAIRaporlar = lazy(() => import("./ai-raporlar"));
const FabrikaUretimPlanlama = lazy(() => import("./uretim-planlama"));

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const FABRIKA_TABS: TabConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    labelTr: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    permissionModule: "factory_dashboard",
    component: FabrikaDashboard
  },
  {
    id: "kiosk",
    label: "Kiosk",
    labelTr: "Kiosk",
    icon: <Monitor className="h-4 w-4" />,
    permissionModule: "factory_kiosk",
    component: FabrikaKiosk
  },
  {
    id: "kalite-kontrol",
    label: "Quality Control",
    labelTr: "Kalite Kontrol",
    icon: <CheckCircle2 className="h-4 w-4" />,
    permissionModule: "factory_quality",
    component: FabrikaKaliteKontrol
  },
  {
    id: "performans",
    label: "Performance",
    labelTr: "Performans",
    icon: <TrendingUp className="h-4 w-4" />,
    permissionModule: "factory_analytics",
    component: FabrikaPerformans
  },
  {
    id: "vardiya-uyumluluk",
    label: "Shift Compliance",
    labelTr: "Vardiya Uyumluluk",
    icon: <Calendar className="h-4 w-4" />,
    permissionModule: "factory_compliance",
    component: FabrikaVardiyaUyumluluk
  },
  {
    id: "ai-raporlar",
    label: "AI Reports",
    labelTr: "AI Raporlar",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "factory_analytics",
    component: FabrikaAIRaporlar
  },
  {
    id: "uretim-planlama",
    label: "Production Planning",
    labelTr: "Üretim Planlama",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "factory_stations",
    component: FabrikaUretimPlanlama
  }
];

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
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
  const [location, setLocation] = useLocation();
  
  const visibleTabs = FABRIKA_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    // Admin ve fabrika rolleri tüm fabrika tab'larına erişebilir
    if (['admin', 'fabrika_mudur', 'fabrika_operator'].includes(user.role)) return true;
    return hasPermission(user.role as any, tab.permissionModule as any, 'view');
  });

  const firstVisibleTab = visibleTabs[0]?.id || "dashboard";
  
  const getTabFromPath = (path: string) => {
    const pathParts = path.split('/');
    if (pathParts.length > 2) {
      const tabId = pathParts[2];
      const matchingTab = visibleTabs.find(t => t.id === tabId);
      if (matchingTab) return matchingTab.id;
    }
    return firstVisibleTab;
  };
  
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location));
  
  useEffect(() => {
    const tabFromPath = getTabFromPath(location);
    if (tabFromPath !== activeTab && visibleTabs.find(t => t.id === tabFromPath)) {
      setActiveTab(tabFromPath);
    }
  }, [location]);
  
  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(firstVisibleTab);
    }
  }, [visibleTabs, activeTab, firstVisibleTab]);
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== firstVisibleTab) {
      setLocation(`/fabrika/${tabId}`);
    } else {
      setLocation('/fabrika');
    }
  };

  if (visibleTabs.length === 0) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Factory className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-xl font-semibold">Fabrika & Üretim</h1>
              <p className="text-sm text-muted-foreground">Üretim yönetimi ve kalite kontrol</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto p-1 bg-transparent gap-1">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                  data-testid={`tab-fabrika-${tab.id}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.labelTr}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          {visibleTabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className="h-full m-0 p-0"
              data-testid={`content-fabrika-${tab.id}`}
            >
              <Suspense fallback={<TabSkeleton />}>
                <tab.component />
              </Suspense>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
