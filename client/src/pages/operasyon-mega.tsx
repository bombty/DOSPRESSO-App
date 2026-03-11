import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Store,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Search,
  MapPin,
  QrCode,
  Headphones,
  Bell,
  MessageSquare,
  Smartphone,
  HelpCircle,
  Users,
  Settings2
} from "lucide-react";

const Subeler = lazy(() => import("./subeler"));
const SubeDashboard = lazy(() => import("./sube/dashboard"));
const Tasks = lazy(() => import("./tasks"));
const Checklists = lazy(() => import("./checklists"));
const KayipEsya = lazy(() => import("./kayip-esya"));
const CanliTakip = lazy(() => import("./canli-takip"));
const QRScanner = lazy(() => import("./qr-scanner"));
const KayipEsyaHQ = lazy(() => import("./kayip-esya-hq"));
const HQSupport = lazy(() => import("./hq-support"));
const Notifications = lazy(() => import("./notifications"));
const Mesajlar = lazy(() => import("./mesajlar"));
const NFCGiris = lazy(() => import("./nfc-giris"));
const Destek = lazy(() => import("./destek"));
const MisafirMemnuniyeti = lazy(() => import("./misafir-memnuniyeti-modul"));

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
    id: "subeler",
    label: "Branches",
    labelTr: "Şubeler",
    icon: <Store className="h-4 w-4" />,
    permissionModule: "branches",
    component: Subeler
  },
  {
    id: "sube-dashboard",
    label: "Branch Dashboard",
    labelTr: "Şube Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    permissionModule: "branch_dashboard",
    component: SubeDashboard
  },
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
  },
  {
    id: "qr-tara",
    label: "QR Scan",
    labelTr: "QR Tara",
    icon: <QrCode className="h-4 w-4" />,
    permissionModule: "qr_scanner",
    component: QRScanner
  },
  {
    id: "kayip-esya-hq",
    label: "Lost & Found HQ",
    labelTr: "Kayıp Eşya HQ",
    icon: <Search className="h-4 w-4" />,
    permissionModule: "lost_found_hq",
    component: KayipEsyaHQ
  },
  {
    id: "hq-destek",
    label: "HQ Support",
    labelTr: "HQ Destek",
    icon: <Headphones className="h-4 w-4" />,
    permissionModule: "hq_support",
    component: HQSupport
  },
  {
    id: "bildirimler",
    label: "Notifications",
    labelTr: "Bildirimler",
    icon: <Bell className="h-4 w-4" />,
    permissionModule: "notifications",
    component: Notifications
  },
  {
    id: "mesajlar",
    label: "Messages",
    labelTr: "Mesajlar",
    icon: <MessageSquare className="h-4 w-4" />,
    permissionModule: "messages",
    component: Mesajlar
  },
  {
    id: "nfc-giris",
    label: "NFC Entry",
    labelTr: "NFC Giriş",
    icon: <Smartphone className="h-4 w-4" />,
    permissionModule: "nfc_entry",
    component: NFCGiris
  },
  {
    id: "destek",
    label: "Support",
    labelTr: "Destek Talepleri",
    icon: <HelpCircle className="h-4 w-4" />,
    permissionModule: "support_requests",
    component: Destek
  },
  {
    id: "misafir-geri-bildirim",
    label: "Guest Feedback",
    labelTr: "Misafir Geri Bildirim",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "guest_feedback",
    component: MisafirMemnuniyeti
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
  "subeler": "/operasyon",
  "sube-dashboard": "/operasyon/dashboard",
  "gorevler": "/operasyon/gorevler",
  "checklistler": "/operasyon/checklistler",
  "kayip-esya": "/operasyon/kayip-esya",
  "canli-takip": "/operasyon/canli-takip",
  "qr-tara": "/operasyon/qr",
  "kayip-esya-hq": "/operasyon/kayip-esya-hq",
  "hq-destek": "/operasyon/hq-destek",
  "bildirimler": "/operasyon/bildirimler",
  "mesajlar": "/operasyon/mesajlar",
  "nfc-giris": "/operasyon/nfc",
  "destek": "/operasyon/destek",
  "misafir-geri-bildirim": "/operasyon/misafir-geri-bildirim"
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/operasyon" || pathname === "/operasyon/") return "subeler";
  if (pathname.startsWith("/operasyon/dashboard")) return "sube-dashboard";
  if (pathname.startsWith("/operasyon/gorevler")) return "gorevler";
  if (pathname.startsWith("/operasyon/checklistler")) return "checklistler";
  if (pathname.startsWith("/operasyon/kayip-esya-hq")) return "kayip-esya-hq";
  if (pathname.startsWith("/operasyon/kayip-esya")) return "kayip-esya";
  if (pathname.startsWith("/operasyon/canli-takip")) return "canli-takip";
  if (pathname.startsWith("/operasyon/qr")) return "qr-tara";
  if (pathname.startsWith("/operasyon/hq-destek")) return "hq-destek";
  if (pathname.startsWith("/operasyon/bildirimler")) return "bildirimler";
  if (pathname.startsWith("/operasyon/mesajlar")) return "mesajlar";
  if (pathname.startsWith("/operasyon/nfc")) return "nfc-giris";
  if (pathname.startsWith("/operasyon/destek")) return "destek";
  if (pathname.startsWith("/operasyon/misafir-geri-bildirim")) return "misafir-geri-bildirim";
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

  const firstVisibleTab = visibleTabs[0]?.id || "subeler";
  
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
