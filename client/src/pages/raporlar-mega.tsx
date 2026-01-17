import { useState, useEffect, Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  Brain,
  ClipboardCheck,
  MessageSquare,
  FileText,
  Users,
  Wallet,
  AlertTriangle,
  FileSearch,
  CheckCircle2
} from "lucide-react";

const Raporlar = lazy(() => import("./raporlar"));
const Performance = lazy(() => import("./performance"));
const AIAssistant = lazy(() => import("./ai-assistant"));
const KaliteDenetimi = lazy(() => import("./kalite-denetimi"));
const MisafirMemnuniyeti = lazy(() => import("./misafir-memnuniyeti"));
const E2ERaporlar = lazy(() => import("./e2e-raporlar"));
const HRReports = lazy(() => import("./hr-reports"));
const CashReports = lazy(() => import("./cash-reports"));
const Denetimler = lazy(() => import("./denetimler"));
const DenetimSablonlari = lazy(() => import("./denetim-sablonlari"));
const Sikayetler = lazy(() => import("./sikayetler"));
const AdvancedReports = lazy(() => import("./advanced-reports"));

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const RAPORLAR_TABS: TabConfig[] = [
  {
    id: "genel",
    label: "Reports",
    labelTr: "Raporlar",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "reports",
    component: Raporlar
  },
  {
    id: "performans",
    label: "Performance",
    labelTr: "Performans",
    icon: <TrendingUp className="h-4 w-4" />,
    permissionModule: "reports",
    component: Performance
  },
  {
    id: "ai-asistan",
    label: "AI Assistant",
    labelTr: "AI Asistan",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "ai_assistant",
    component: AIAssistant
  },
  {
    id: "kalite-denetimi",
    label: "Quality Audit",
    labelTr: "Kalite Denetimi",
    icon: <ClipboardCheck className="h-4 w-4" />,
    permissionModule: "quality_audit",
    component: KaliteDenetimi
  },
  {
    id: "misafir-memnuniyeti",
    label: "Guest Satisfaction",
    labelTr: "Misafir Memnuniyeti",
    icon: <MessageSquare className="h-4 w-4" />,
    permissionModule: "guest_satisfaction",
    component: MisafirMemnuniyeti
  },
  {
    id: "e2e-raporlar",
    label: "E2E Reports",
    labelTr: "E2E Raporlar",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "reports",
    component: E2ERaporlar
  },
  {
    id: "ik-raporlari",
    label: "HR Reports",
    labelTr: "İK Raporları",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "hr_reports",
    component: HRReports
  },
  {
    id: "kasa-raporlari",
    label: "Cash Reports",
    labelTr: "Kasa Raporları",
    icon: <Wallet className="h-4 w-4" />,
    permissionModule: "cash_management",
    component: CashReports
  },
  {
    id: "denetimler",
    label: "Audits",
    labelTr: "Denetimler",
    icon: <CheckCircle2 className="h-4 w-4" />,
    permissionModule: "quality_audit",
    component: Denetimler
  },
  {
    id: "denetim-sablonlari",
    label: "Audit Templates",
    labelTr: "Denetim Şablonları",
    icon: <FileSearch className="h-4 w-4" />,
    permissionModule: "quality_templates",
    component: DenetimSablonlari
  },
  {
    id: "sikayetler",
    label: "Complaints",
    labelTr: "Şikayetler",
    icon: <AlertTriangle className="h-4 w-4" />,
    permissionModule: "complaints",
    component: Sikayetler
  },
  {
    id: "gelismis-raporlar",
    label: "Advanced Reports",
    labelTr: "Gelişmiş Raporlar",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "advanced_reports",
    component: AdvancedReports
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

export default function RaporlarMegaModule() {
  const { user } = useAuth();

  const visibleTabs = RAPORLAR_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    return hasPermission(user.role as any, tab.permissionModule as any, 'view');
  });

  const firstVisibleTab = visibleTabs[0]?.id || "genel";
  const [activeTab, setActiveTab] = useState(firstVisibleTab);
  
  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(firstVisibleTab);
    }
  }, [visibleTabs, activeTab, firstVisibleTab]);

  if (visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Raporlar & Analitik
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
            <BarChart3 className="h-6 w-6 text-amber-600" />
            <div>
              <h1 className="text-xl font-semibold">Raporlar & Analitik</h1>
              <p className="text-sm text-muted-foreground">Detaylı raporlar ve performans analizi</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
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
                  data-testid={`tab-raporlar-${tab.id}`}
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
              data-testid={`content-raporlar-${tab.id}`}
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
