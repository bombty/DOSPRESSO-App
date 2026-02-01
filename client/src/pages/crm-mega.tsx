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
  TrendingUp,
  Wrench,
  Building2,
  MessageSquare,
  GraduationCap
} from "lucide-react";

const CRMDashboard = lazy(() => import("@/pages/crm/dashboard"));
const CRMTickets = lazy(() => import("@/pages/crm/tickets"));
const CRMPerformance = lazy(() => import("@/pages/crm/performance"));
const CRMSLA = lazy(() => import("@/pages/crm/sla"));
const CRMFeedback = lazy(() => import("@/pages/crm/feedback"));
const EmployeeDashboard = lazy(() => import("@/pages/crm/employee-dashboard"));
const CoachBranches = lazy(() => import("@/pages/crm/coach-branches"));
const CoachOnboarding = lazy(() => import("@/pages/crm/coach-onboarding"));
const MentorNotes = lazy(() => import("@/pages/crm/mentor-notes"));
const TeknikAriza = lazy(() => import("@/pages/crm/teknik-ariza"));

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
  allowedRoles?: string[];
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
  },
  {
    id: "sube-takibi",
    label: "Branch Tracking",
    labelTr: "Şube Takibi",
    icon: <Building2 className="h-4 w-4" />,
    permissionModule: "sube_takibi",
    component: CoachBranches,
    allowedRoles: ['admin', 'coach', 'bolge_muduru', 'operasyon_muduru', 'genel_mudur']
  },
  {
    id: "onboarding-sablonlari",
    label: "Onboarding Templates",
    labelTr: "Onboarding Şablonları",
    icon: <GraduationCap className="h-4 w-4" />,
    permissionModule: "onboarding",
    component: CoachOnboarding,
    allowedRoles: ['admin', 'coach', 'egitim_muduru']
  },
  {
    id: "mentor-notlari",
    label: "Mentor Notes",
    labelTr: "Mentor Notları",
    icon: <MessageSquare className="h-4 w-4" />,
    permissionModule: "mentor_notlari",
    component: MentorNotes,
    allowedRoles: ['admin', 'coach', 'egitim_muduru', 'bolge_muduru']
  },
  {
    id: "ariza-takibi",
    label: "Fault Tracking",
    labelTr: "Arıza Takibi",
    icon: <Wrench className="h-4 w-4" />,
    permissionModule: "ariza_takibi",
    component: TeknikAriza,
    allowedRoles: ['admin', 'teknik', 'teknik_mudur']
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
  "feedback": "/crm/geri-bildirimler",
  "sube-takibi": "/crm/sube-takibi",
  "onboarding-sablonlari": "/crm/onboarding",
  "mentor-notlari": "/crm/mentor-notlari",
  "ariza-takibi": "/crm/ariza-takibi"
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/crm" || pathname === "/crm/") return "dashboard";
  if (pathname.startsWith("/crm/talepler")) return "tickets";
  if (pathname.startsWith("/crm/performans")) return "performance";
  if (pathname.startsWith("/crm/sla")) return "sla";
  if (pathname.startsWith("/crm/geri-bildirimler")) return "feedback";
  if (pathname.startsWith("/crm/sube-takibi")) return "sube-takibi";
  if (pathname.startsWith("/crm/onboarding")) return "onboarding-sablonlari";
  if (pathname.startsWith("/crm/mentor-notlari")) return "mentor-notlari";
  if (pathname.startsWith("/crm/ariza-takibi")) return "ariza-takibi";
  
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
    if (!user) return false;
    
    // Role-based tab kontrolü - eğer allowedRoles tanımlıysa
    if (tab.allowedRoles && tab.allowedRoles.length > 0) {
      // Eğer kullanıcının rolü izin verilen roller arasındaysa, tab'ı göster
      return tab.allowedRoles.includes(user.role);
    }
    
    // Admin tüm tab'lara erişebilir
    if (user.role === 'admin') return true;
    
    // HQ roller için genel tab'lara (allowedRoles tanımlı olmayanlar) erişim
    if (isHQRole(user.role)) return true;
    
    // İzin modülü kontrolü
    if (!tab.permissionModule) return true;
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
