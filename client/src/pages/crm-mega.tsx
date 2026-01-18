import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Star,
  TrendingUp
} from "lucide-react";

const CRMDashboard = lazy(() => import("@/pages/crm/dashboard"));
const CRMTickets = lazy(() => import("@/pages/crm/tickets"));
const CRMPerformance = lazy(() => import("@/pages/crm/performance"));
const CRMSLA = lazy(() => import("@/pages/crm/sla"));
const CRMFeedback = lazy(() => import("@/pages/crm/feedback"));
const EmployeeDashboard = lazy(() => import("@/pages/crm/employee-dashboard"));

const HQ_ROLES = [
  'admin', 
  'muhasebe', 
  'satinalma', 
  'coach', 
  'teknik', 
  'destek', 
  'fabrika', 
  'yatirimci_hq',
  'yonetici', 
  'genel_mudur', 
  'bolge_muduru', 
  'operasyon_muduru',
  'teknik_mudur',
  'egitim_muduru',
  'ik_muduru',
  'pazarlama_muduru',
  'muhasebe_muduru'
];

function isHQRole(role: string): boolean {
  return HQ_ROLES.includes(role);
}

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const CRM_TABS: TabConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    labelTr: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    permissionModule: "crm_dashboard",
    component: CRMDashboard
  },
  {
    id: "tickets",
    label: "Tickets",
    labelTr: "Talepler",
    icon: <Ticket className="h-4 w-4" />,
    permissionModule: "crm_tickets",
    component: CRMTickets
  },
  {
    id: "performance",
    label: "Performance",
    labelTr: "Performans",
    icon: <TrendingUp className="h-4 w-4" />,
    permissionModule: "crm_performance",
    component: CRMPerformance
  },
  {
    id: "sla",
    label: "SLA",
    labelTr: "SLA Takibi",
    icon: <Clock className="h-4 w-4" />,
    permissionModule: "crm_sla",
    component: CRMSLA
  },
  {
    id: "feedback",
    label: "Feedback",
    labelTr: "Geri Bildirimler",
    icon: <Star className="h-4 w-4" />,
    permissionModule: "crm_feedback",
    component: CRMFeedback
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
  "dashboard": "/crm",
  "tickets": "/crm/talepler",
  "performance": "/crm/performans",
  "sla": "/crm/sla",
  "feedback": "/crm/geri-bildirimler"
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/crm" || pathname === "/crm/") return "dashboard";
  if (pathname.startsWith("/crm/talepler")) return "tickets";
  if (pathname.startsWith("/crm/performans")) return "performance";
  if (pathname.startsWith("/crm/sla")) return "sla";
  if (pathname.startsWith("/crm/geri-bildirimler")) return "feedback";
  
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "crm" && parts[1]) {
    const tab = CRM_TABS.find(t => t.id === parts[1]);
    if (tab) return tab.id;
  }
  
  return null;
}

export default function CRMMegaModule() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const userIsHQ = user ? isHQRole(user.role) : false;

  const allowedTabs = CRM_TABS.filter(tab => {
    // Admin ve HQ roller için CRM'e tam erişim ver (izin modülleri henüz eklenmemiş)
    if (user && isHQRole(user.role)) return true;
    if (!tab.permissionModule) return true;
    if (!user) return false;
    return hasPermission(user.role as any, tab.permissionModule as any, 'view');
  });

  useEffect(() => {
    if (!userIsHQ) return;
    
    const tabFromUrl = getTabFromUrl(location);
    
    if (tabFromUrl && !allowedTabs.some(t => t.id === tabFromUrl)) {
      if (allowedTabs.length > 0) {
        const firstAllowed = allowedTabs[0];
        const newUrl = TAB_URL_MAP[firstAllowed.id] || `/crm/${firstAllowed.id}`;
        setLocation(newUrl);
        setActiveTab(firstAllowed.id);
      }
      return;
    }
    
    if (tabFromUrl && allowedTabs.some(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeTab)) {
      const firstAllowed = allowedTabs[0];
      setActiveTab(firstAllowed.id);
      const newUrl = TAB_URL_MAP[firstAllowed.id] || `/crm/${firstAllowed.id}`;
      if (location !== newUrl) {
        setLocation(newUrl);
      }
    }
  }, [location, allowedTabs, userIsHQ]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const newUrl = TAB_URL_MAP[tabId] || `/crm/${tabId}`;
    if (location !== newUrl) {
      setLocation(newUrl);
    }
  };

  useEffect(() => {
    if (userIsHQ && allowedTabs.length === 0 && user) {
      setLocation("/");
    }
  }, [allowedTabs.length, user, userIsHQ]);

  if (!user) {
    return null;
  }

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

  if (allowedTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-semibold" data-testid="text-crm-title">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground">Merkez destek ve talep yönetimi</p>
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
