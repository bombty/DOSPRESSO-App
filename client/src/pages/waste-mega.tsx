import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  AlertTriangle, BarChart3, GraduationCap,
  Factory, LineChart, ClipboardList
} from "lucide-react";

const WasteEntry = lazy(() => import("./waste-entry"));
const WasteCoachConsole = lazy(() => import("./waste-coach-console"));
const WasteTrainerConsole = lazy(() => import("./waste-trainer-console"));
const WasteQCConsole = lazy(() => import("./waste-qc-console"));
const WasteExecutive = lazy(() => import("./waste-executive"));

interface TabConfig {
  id: string;
  labelTr: string;
  labelEn: string;
  icon: React.ReactNode;
  roles: string[];
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const WASTE_TABS: TabConfig[] = [
  {
    id: "giris",
    labelTr: "Zai/Fire Girişi",
    labelEn: "Waste Entry",
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ["supervisor", "mudur", "barista", "bar_buddy", "supervisor_buddy", "stajyer", "admin", "coach", "trainer"],
    component: WasteEntry,
  },
  {
    id: "coach",
    labelTr: "Coach Konsolu",
    labelEn: "Coach Console",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ["coach", "admin", "ceo", "cgo"],
    component: WasteCoachConsole,
  },
  {
    id: "trainer",
    labelTr: "Trainer Konsolu",
    labelEn: "Trainer Console",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["trainer", "admin", "ceo", "cgo", "coach"],
    component: WasteTrainerConsole,
  },
  {
    id: "kalite",
    labelTr: "QC / Kalite Konsolu",
    labelEn: "QC Console",
    icon: <Factory className="h-4 w-4" />,
    roles: ["kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "admin", "ceo", "cgo"],
    component: WasteQCConsole,
  },
  {
    id: "yonetici",
    labelTr: "Yönetici Özeti",
    labelEn: "Executive Snapshot",
    icon: <LineChart className="h-4 w-4" />,
    roles: ["ceo", "cgo", "admin"],
    component: WasteExecutive,
  },
];

function LoadingFallback() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function WasteMegaModule() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language?.startsWith("en") ? "en" : "tr";
  const [, setLocation] = useLocation();
  const params = useParams<{ tab?: string }>();

  const userRole = (user as any)?.role || "";

  const visibleTabs = WASTE_TABS.filter(tab =>
    tab.roles.includes(userRole) || userRole === "admin"
  );

  const defaultTab = visibleTabs[0]?.id || "giris";
  const [activeTab, setActiveTab] = useState(params?.tab || defaultTab);

  useEffect(() => {
    if (params?.tab && params.tab !== activeTab) {
      setActiveTab(params.tab);
    }
  }, [params?.tab]);

  function handleTabChange(value: string) {
    setActiveTab(value);
    setLocation(`/waste/${value}`, { replace: true });
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("waste.noAccess", { defaultValue: "Bu modüle erişiminiz yok" })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
        <div className="border-b px-4 pt-2">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-10 w-auto" data-testid="tabs-waste">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.icon}
                  <span>{lang === "en" ? tab.labelEn : tab.labelTr}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          {visibleTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="m-0 h-full">
              <Suspense fallback={<LoadingFallback />}>
                <tab.component />
              </Suspense>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
