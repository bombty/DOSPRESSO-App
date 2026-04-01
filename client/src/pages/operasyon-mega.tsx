import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  CheckSquare,
  ClipboardList,
  ClipboardCheck,
  Search,
  MapPin,
} from "lucide-react";

const Tasks = lazy(() => import("./tasks"));
const Checklists = lazy(() => import("./checklists"));
const Denetimler = lazy(() => import("./denetimler"));
const KayipEsya = lazy(() => import("./kayip-esya"));
const CanliTakip = lazy(() => import("./canli-takip"));

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const OPERASYON_TABS: TabConfig[] = [
  {
    id: "gorevler",
    label: "Tasks",
    labelTr: "Görevler",
    icon: <CheckSquare className="h-4 w-4" />,
    permissionModule: "tasks",
    component: Tasks
  },
  {
    id: "checklistler",
    label: "Checklists",
    labelTr: "Checklistler",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "checklists",
    component: Checklists
  },
  {
    id: "denetimler",
    label: "Audits",
    labelTr: "Denetimler",
    icon: <ClipboardCheck className="h-4 w-4" />,
    permissionModule: "denetim",
    component: Denetimler
  },
  {
    id: "kayip-esya",
    label: "Lost & Found",
    labelTr: "Kayıp Eşya",
    icon: <Search className="h-4 w-4" />,
    permissionModule: "lost_found",
    component: KayipEsya
  },
  {
    id: "canli-takip",
    label: "Live Tracking",
    labelTr: "Canlı Takip",
    icon: <MapPin className="h-4 w-4" />,
    permissionModule: "live_tracking",
    component: CanliTakip
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

const TAB_URL_MAP: Record<string, string> = {
  "gorevler": "/operasyon",
  "checklistler": "/operasyon/checklistler",
  "denetimler": "/operasyon/denetimler",
  "kayip-esya": "/operasyon/kayip-esya",
  "canli-takip": "/operasyon/canli-takip",
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/operasyon" || pathname === "/operasyon/") return "gorevler";
  if (pathname.startsWith("/operasyon/gorevler")) return "gorevler";
  if (pathname.startsWith("/operasyon/checklistler")) return "checklistler";
  if (pathname.startsWith("/operasyon/denetimler")) return "denetimler";
  if (pathname.startsWith("/operasyon/kayip-esya")) return "kayip-esya";
  if (pathname.startsWith("/operasyon/canli-takip")) return "canli-takip";
  return null;
}

export default function OperasyonMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const visibleTabs = OPERASYON_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    return canAccess(tab.permissionModule!, 'view');
  });

  const firstVisibleTab = visibleTabs[0]?.id || "gorevler";
  
  const initialTab = getTabFromUrl(location);
  const [activeTab, setActiveTab] = useState(
    initialTab && visibleTabs.find(t => t.id === initialTab) ? initialTab : firstVisibleTab
  );
  
  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(firstVisibleTab);
      const url = TAB_URL_MAP[firstVisibleTab];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  }, [visibleTabs, activeTab, firstVisibleTab]);
  
  useEffect(() => {
    const tabFromUrl = getTabFromUrl(location);
    if (tabFromUrl && tabFromUrl !== activeTab && visibleTabs.find(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location, visibleTabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const url = TAB_URL_MAP[tabId];
    if (url && location !== url) {
      setLocation(url);
    }
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Operasyonlar
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
            <Settings2 className="h-6 w-6 text-orange-600" />
            <div>
              <h1 className="text-xl font-semibold">Operasyonlar</h1>
              <p className="text-sm text-muted-foreground">Şube operasyonları ve günlük işlemler</p>
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
                  data-testid={`tab-operasyon-${tab.id}`}
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
              data-testid={`content-operasyon-${tab.id}`}
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
