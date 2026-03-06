import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HQ_ROLES } from "@shared/schema";
import {
  LayoutDashboard,
  MessageSquareHeart,
  AlertTriangle,
  Megaphone,
  Clock,
  BarChart3,
  Settings,
} from "lucide-react";

const CRMDashboard = lazy(() => import("@/pages/crm/dashboard"));
const CRMFeedback = lazy(() => import("@/pages/crm/feedback"));
const CRMComplaints = lazy(() => import("@/pages/crm/complaints"));
const CRMCampaigns = lazy(() => import("@/pages/crm/campaigns"));
const CRMSLATracking = lazy(() => import("@/pages/crm/sla-tracking"));
const CRMAnalytics = lazy(() => import("@/pages/crm/analytics"));
const CRMSettings = lazy(() => import("@/pages/crm/settings"));
const EmployeeDashboard = lazy(() => import("@/pages/crm/employee-dashboard"));

interface TabConfig {
  id: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const CRM_TABS: TabConfig[] = [
  {
    id: "dashboard",
    labelTr: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    permissionModule: "crm_dashboard",
    component: CRMDashboard,
  },
  {
    id: "geri-bildirimler",
    labelTr: "Geri Bildirimler",
    icon: <MessageSquareHeart className="h-4 w-4" />,
    permissionModule: "crm_feedback",
    component: CRMFeedback,
  },
  {
    id: "sikayetler",
    labelTr: "Şikayetler",
    icon: <AlertTriangle className="h-4 w-4" />,
    permissionModule: "crm_complaints",
    component: CRMComplaints,
  },
  {
    id: "kampanyalar",
    labelTr: "Kampanyalar",
    icon: <Megaphone className="h-4 w-4" />,
    permissionModule: "crm_campaigns",
    component: CRMCampaigns,
  },
  {
    id: "sla",
    labelTr: "SLA Takibi",
    icon: <Clock className="h-4 w-4" />,
    permissionModule: "crm_feedback",
    component: CRMSLATracking,
  },
  {
    id: "analizler",
    labelTr: "Analizler",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "crm_analytics",
    component: CRMAnalytics,
  },
  {
    id: "ayarlar",
    labelTr: "Ayarlar",
    icon: <Settings className="h-4 w-4" />,
    permissionModule: "crm_settings",
    component: CRMSettings,
  },
];

const TAB_URL_MAP: Record<string, string> = {
  dashboard: "/crm",
  "geri-bildirimler": "/crm/geri-bildirimler",
  sikayetler: "/crm/sikayetler",
  kampanyalar: "/crm/kampanyalar",
  sla: "/crm/sla",
  analizler: "/crm/analizler",
  ayarlar: "/crm/ayarlar",
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/crm" || pathname === "/crm/") return "dashboard";
  for (const [tabId, url] of Object.entries(TAB_URL_MAP)) {
    if (tabId !== "dashboard" && pathname.startsWith(url)) return tabId;
  }
  return null;
}

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function CRMMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const userIsHQ = user ? (HQ_ROLES.has(user.role as any) || user.role === "admin") : false;

  const allowedTabs = CRM_TABS.filter((tab) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return canAccess(tab.permissionModule, "view");
  });

  useEffect(() => {
    if (!userIsHQ) return;
    const tabFromUrl = getTabFromUrl(location);
    if (tabFromUrl && allowedTabs.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (allowedTabs.length > 0 && !allowedTabs.some((t) => t.id === activeTab)) {
      const first = allowedTabs[0];
      setActiveTab(first.id);
      const newUrl = TAB_URL_MAP[first.id] || `/crm/${first.id}`;
      if (location !== newUrl) setLocation(newUrl);
    }
  }, [location, allowedTabs, userIsHQ]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const newUrl = TAB_URL_MAP[tabId] || `/crm/${tabId}`;
    if (location !== newUrl) setLocation(newUrl);
  };

  if (!user) return null;

  if (!userIsHQ) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-2 border-b">
          <h1 className="text-xl font-semibold" data-testid="text-crm-title">Kişisel Dashboard</h1>
          <p className="text-sm text-muted-foreground">İstatistikleriniz ve performansınız</p>
        </div>
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<TabSkeleton />}>
            <EmployeeDashboard />
          </Suspense>
        </div>
      </div>
    );
  }

  if (allowedTabs.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-semibold" data-testid="text-crm-title">CRM — Müşteri İlişkileri</h1>
        <p className="text-sm text-muted-foreground">Geri bildirim, şikayet, kampanya ve müşteri etkileşimleri</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="px-4 border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 w-max items-center justify-start gap-1 bg-transparent p-0">
              {allowedTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                  data-testid={`tab-crm-${tab.id}`}
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
          {allowedTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="h-full m-0 p-0 data-[state=inactive]:hidden"
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
