import { useState, Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Wrench,
  AlertTriangle,
  BarChart3,
  Settings2
} from "lucide-react";

const Equipment = lazy(() => import("./equipment"));
const FaultHub = lazy(() => import("./ariza"));
const EquipmentAnalytics = lazy(() => import("./ekipman-analitics"));

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const EKIPMAN_TABS: TabConfig[] = [
  {
    id: "ekipman",
    label: "Equipment",
    labelTr: "Ekipman",
    icon: <Wrench className="h-4 w-4" />,
    permissionModule: "equipment",
    component: Equipment
  },
  {
    id: "ariza",
    label: "Faults",
    labelTr: "Arıza Yönetimi",
    icon: <AlertTriangle className="h-4 w-4" />,
    permissionModule: "faults",
    component: FaultHub
  },
  {
    id: "analitik",
    label: "Analytics",
    labelTr: "Ekipman Analitik",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "equipment_analytics",
    component: EquipmentAnalytics
  }
];

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
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
  const [activeTab, setActiveTab] = useState("ekipman");

  const visibleTabs = EKIPMAN_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    return hasPermission(user.role as any, tab.permissionModule as any, 'view');
  });

  const firstVisibleTab = visibleTabs[0]?.id || "ekipman";

  if (visibleTabs.length === 0) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold">Ekipman & Bakım</h1>
              <p className="text-sm text-muted-foreground">Ekipman yönetimi ve arıza takibi</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="flex-1 flex flex-col"
        defaultValue={firstVisibleTab}
      >
        <div className="border-b px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto p-1 bg-transparent gap-1">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                  data-testid={`tab-ekipman-${tab.id}`}
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
              data-testid={`content-ekipman-${tab.id}`}
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
