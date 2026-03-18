import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Users,
  Shield,
  Key,
  Mail,
  Image,
  Megaphone,
  Brain,
  Database,
  Activity,
  ClipboardList,
  GraduationCap,
  Wrench,
  FileText,
  BarChart3,
  Factory,
  Sparkles,
  AlertTriangle,
  Lock,
  Cog,
  BookOpen,
  ListTodo,
  LayoutGrid,
  Trash2,
  Bot,
  ArrowRightLeft,
  ToggleLeft
} from "lucide-react";

const AdminDashboard = lazy(() => import("./admin/index"));
const AdminKullanicilar = lazy(() => import("./admin/kullanicilar"));
const AdminYetkilendirme = lazy(() => import("./admin/yetkilendirme"));
const Settings2 = lazy(() => import("./yonetim/ayarlar"));
const AdminEmailAyarlari = lazy(() => import("./admin/email-ayarlari"));
const AdminYedekleme = lazy(() => import("./admin/yedekleme"));
const AdminAktiviteLoglar = lazy(() => import("./admin/aktivite-loglari"));
const AdminCopKutusu = lazy(() => import("./admin/cop-kutusu"));
const AdminContentManagement = lazy(() => import("./yonetim/icerik"));
const AdminDuyurular = lazy(() => import("./admin/duyurular"));
const AdminBannerlar = lazy(() => import("./admin/bannerlar"));
const AdminChecklistManagement = lazy(() => import("./yonetim/checklistler"));
const AdminAcademy = lazy(() => import("./yonetim/akademi"));
const EquipmentManagement = lazy(() => import("./yonetim/ekipman-yonetimi"));
const EkipmanServis = lazy(() => import("./yonetim/ekipman-servis"));
const ServiceRequestsManagement = lazy(() => import("./yonetim/servis-talepleri"));
const AdminTopluVeriYonetimi = lazy(() => import("./admin/toplu-veri-yonetimi"));
const AdminYapayZekaAyarlari = lazy(() => import("./admin/yapay-zeka-ayarlari"));
const AICostDashboard = lazy(() => import("./yonetim/ai-maliyetler"));
const AdminServisMailAyarlari = lazy(() => import("./admin/servis-mail-ayarlari"));
const AdminFabrikaIstasyonlar = lazy(() => import("./admin/fabrika-istasyonlar"));
const AdminFabrikaFireSebepleri = lazy(() => import("./admin/fabrika-fire-sebepleri"));
const AdminFabrikaPinYonetimi = lazy(() => import("./admin/fabrika-pin-yonetimi"));
const AdminFabrikaKaliteKriterleri = lazy(() => import("./admin/fabrika-kalite-kriterleri"));
const IcerikStudyosu = lazy(() => import("./icerik-studyosu"));
const AdminSeed = lazy(() => import("./admin-seed"));
const AdminAIBilgiYonetimi = lazy(() => import("./admin/ai-bilgi-yonetimi"));
const AdminVeriDisaAktarma = lazy(() => import("./admin/veri-disa-aktarma"));
const AdminGorunumAyarlari = lazy(() => import("./admin/gorunum-ayarlari"));
const AdminGorevSablonlari = lazy(() => import("./admin/gorev-sablonlari"));
const AdminEmployeeTypes = lazy(() => import("./admin-employee-types"));
const AdminWidgetYonetimi = lazy(() => import("./admin/widget-yonetimi"));
const AdminHeroWidgetEditor = lazy(() => import("./admin/widget-editor"));
const AdminAIPolitikalari = lazy(() => import("./admin/ai-politikalari"));
const AdminDobodyAvatarlar = lazy(() => import("./admin/dobody-avatarlar"));
const AdminDobodyGorevYonetimi = lazy(() => import("./admin/dobody-gorev-yonetimi"));
const AdminVeriKilitleri = lazy(() => import("./admin/veri-kilitleri"));
const AdminDegisiklikTalepleri = lazy(() => import("./admin/degisiklik-talepleri"));
const AdminDelegasyon = lazy(() => import("./admin/delegasyon"));
const AdminModuleFlags = lazy(() => import("./admin/module-flags"));

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  group: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

interface TabGroup {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
}

const TAB_GROUPS: TabGroup[] = [
  { id: "kullanicilar", label: "Users", labelTr: "Kullanıcılar", icon: <Users className="h-4 w-4" /> },
  { id: "sistem", label: "System", labelTr: "Sistem", icon: <Cog className="h-4 w-4" /> },
  { id: "icerik", label: "Content", labelTr: "İçerik", icon: <FileText className="h-4 w-4" /> },
  { id: "operasyon", label: "Operations", labelTr: "Operasyon", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "fabrika", label: "Factory", labelTr: "Fabrika", icon: <Factory className="h-4 w-4" /> }
];

const ADMIN_TABS: TabConfig[] = [
  {
    id: "admin-panel",
    label: "Admin Panel",
    labelTr: "Admin Panel",
    icon: <Settings className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminDashboard
  },
  {
    id: "kullanicilar",
    label: "Users",
    labelTr: "Kullanıcı Yönetimi",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "user_management",
    group: "kullanicilar",
    component: AdminKullanicilar
  },
  {
    id: "yetkilendirme",
    label: "Authorization",
    labelTr: "Rol ve Yetki Yönetimi",
    icon: <Shield className="h-4 w-4" />,
    permissionModule: "authorization",
    group: "kullanicilar",
    component: AdminYetkilendirme
  },
  {
    id: "personel-tipleri",
    label: "Employee Types",
    labelTr: "Personel Tipleri",
    icon: <ListTodo className="h-4 w-4" />,
    permissionModule: "user_management",
    group: "kullanicilar",
    component: AdminEmployeeTypes
  },
  {
    id: "ayarlar",
    label: "Settings",
    labelTr: "Ayarlar",
    icon: <Settings className="h-4 w-4" />,
    permissionModule: "settings",
    group: "sistem",
    component: Settings2
  },
  {
    id: "email-ayarlari",
    label: "Email Settings",
    labelTr: "Email Ayarları",
    icon: <Mail className="h-4 w-4" />,
    permissionModule: "email_settings",
    group: "sistem",
    component: AdminEmailAyarlari
  },
  {
    id: "servis-mail",
    label: "Service Mail",
    labelTr: "Servis Mail Ayarları",
    icon: <Mail className="h-4 w-4" />,
    permissionModule: "service_email",
    group: "sistem",
    component: AdminServisMailAyarlari
  },
  {
    id: "yapay-zeka",
    label: "AI Settings",
    labelTr: "Yapay Zeka Ayarları",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "ai_settings",
    group: "sistem",
    component: AdminYapayZekaAyarlari
  },
  {
    id: "ai-bilgi-yonetimi",
    label: "AI Knowledge",
    labelTr: "AI Bilgi Yönetimi",
    icon: <BookOpen className="h-4 w-4" />,
    permissionModule: "ai_settings",
    group: "sistem",
    component: AdminAIBilgiYonetimi
  },
  {
    id: "ai-maliyetler",
    label: "AI Costs",
    labelTr: "AI Maliyetleri",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "ai_costs",
    group: "sistem",
    component: AICostDashboard
  },
  {
    id: "yedekleme",
    label: "Backup",
    labelTr: "Yedekleme",
    icon: <Database className="h-4 w-4" />,
    permissionModule: "backup",
    group: "sistem",
    component: AdminYedekleme
  },
  {
    id: "gorunum-ayarlari",
    label: "Appearance",
    labelTr: "Görünüm Ayarları",
    icon: <Sparkles className="h-4 w-4" />,
    group: "sistem",
    component: AdminGorunumAyarlari
  },
  {
    id: "veri-disa-aktarma",
    label: "Data Export",
    labelTr: "Veri Dışa Aktarma",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "data_export",
    group: "sistem",
    component: AdminVeriDisaAktarma
  },
  {
    id: "aktivite-loglari",
    label: "Audit Logs",
    labelTr: "Denetim Günlüğü",
    icon: <Activity className="h-4 w-4" />,
    permissionModule: "activity_logs",
    group: "sistem",
    component: AdminAktiviteLoglar
  },
  {
    id: "cop-kutusu",
    label: "Trash",
    labelTr: "Çöp Kutusu",
    icon: <Trash2 className="h-4 w-4" />,
    permissionModule: "backup",
    group: "sistem",
    component: AdminCopKutusu
  },
  {
    id: "seed",
    label: "Seed Data",
    labelTr: "Seed Verisi",
    icon: <Sparkles className="h-4 w-4" />,
    permissionModule: "seed_data",
    group: "sistem",
    component: AdminSeed
  },
  {
    id: "icerik-studyosu",
    label: "Content Studio",
    labelTr: "İçerik Stüdyosu",
    icon: <Image className="h-4 w-4" />,
    permissionModule: "content_studio",
    group: "icerik",
    component: IcerikStudyosu
  },
  {
    id: "bannerlar",
    label: "Banners",
    labelTr: "Banner Yönetimi",
    icon: <Image className="h-4 w-4" />,
    permissionModule: "banners",
    group: "icerik",
    component: AdminBannerlar
  },
  {
    id: "checklistler",
    label: "Checklists",
    labelTr: "Checklist Yönetimi",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "checklist_management",
    group: "operasyon",
    component: AdminChecklistManagement
  },
  {
    id: "akademi-yonetimi",
    label: "Academy Management",
    labelTr: "Akademi Yönetimi",
    icon: <GraduationCap className="h-4 w-4" />,
    permissionModule: "academy_admin",
    group: "operasyon",
    component: AdminAcademy
  },
  {
    id: "ekipman-yonetimi",
    label: "Equipment Management",
    labelTr: "Ekipman Yönetimi",
    icon: <Wrench className="h-4 w-4" />,
    permissionModule: "equipment_admin",
    group: "operasyon",
    component: EquipmentManagement
  },
  {
    id: "toplu-veri",
    label: "Bulk Data",
    labelTr: "Toplu Veri Yönetimi",
    icon: <Database className="h-4 w-4" />,
    permissionModule: "bulk_data",
    group: "operasyon",
    component: AdminTopluVeriYonetimi
  },
  {
    id: "gorev-sablonlari",
    label: "Task Templates",
    labelTr: "Görev Şablonları",
    icon: <ListTodo className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "operasyon",
    component: AdminGorevSablonlari
  },
  {
    id: "widget-yonetimi",
    label: "Page Widgets",
    labelTr: "Sayfa Widgetları",
    icon: <Settings className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminWidgetYonetimi
  },
  {
    id: "widget-editor",
    label: "Hero Banner Editor",
    labelTr: "Hero Banner Editör",
    icon: <LayoutGrid className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminHeroWidgetEditor
  },
  {
    id: "fabrika-istasyonlar",
    label: "Factory Stations",
    labelTr: "Fabrika İstasyonları",
    icon: <Factory className="h-4 w-4" />,
    permissionModule: "factory_stations",
    group: "fabrika",
    component: AdminFabrikaIstasyonlar
  },
  {
    id: "fire-sebepleri",
    label: "Waste Reasons",
    labelTr: "Fire Sebepleri",
    icon: <AlertTriangle className="h-4 w-4" />,
    permissionModule: "factory_waste",
    group: "fabrika",
    component: AdminFabrikaFireSebepleri
  },
  {
    id: "pin-yonetimi",
    label: "PIN Management",
    labelTr: "PIN Yönetimi",
    icon: <Lock className="h-4 w-4" />,
    permissionModule: "factory_pins",
    group: "fabrika",
    component: AdminFabrikaPinYonetimi
  },
  {
    id: "kalite-kriterleri",
    label: "Quality Criteria",
    labelTr: "Kalite Kriterleri",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "factory_quality",
    group: "fabrika",
    component: AdminFabrikaKaliteKriterleri
  },
  {
    id: "ai-politikalari",
    label: "AI Policies",
    labelTr: "AI Politikaları",
    icon: <Shield className="h-4 w-4" />,
    group: "sistem",
    component: AdminAIPolitikalari
  },
  {
    id: "dobody-avatarlar",
    label: "Mr. Dobody Avatars",
    labelTr: "Mr. Dobody Avatarları",
    icon: <Bot className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "icerik",
    component: AdminDobodyAvatarlar
  },
  {
    id: "dobody-gorevler",
    label: "Mr. Dobody Tasks",
    labelTr: "Mr. Dobody Görevler",
    icon: <Bot className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "operasyon",
    component: AdminDobodyGorevYonetimi
  },
  {
    id: "veri-kilitleri",
    label: "Data Locks",
    labelTr: "Veri Kilitleri",
    icon: <Lock className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminVeriKilitleri
  },
  {
    id: "degisiklik-talepleri",
    label: "Change Requests",
    labelTr: "Değişiklik Talepleri",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminDegisiklikTalepleri
  },
  {
    id: "delegasyon",
    label: "Delegation",
    labelTr: "Delegasyon",
    icon: <ArrowRightLeft className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "operasyon",
    component: AdminDelegasyon
  },
  {
    id: "modul-bayraklari",
    label: "Module Flags",
    labelTr: "Modül Bayrakları",
    icon: <ToggleLeft className="h-4 w-4" />,
    permissionModule: "admin_panel",
    group: "sistem",
    component: AdminModuleFlags
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

const TAB_URL_MAP: Record<string, string> = {
  "admin-panel": "/admin",
  "kullanicilar": "/admin/kullanicilar",
  "yetkilendirme": "/admin/yetkilendirme",
  "ayarlar": "/admin/ayarlar",
  "email-ayarlari": "/admin/email-ayarlari",
  "servis-mail": "/admin/servis-mail",
  "yapay-zeka": "/admin/yapay-zeka",
  "ai-bilgi-yonetimi": "/admin/ai-bilgi-yonetimi",
  "ai-maliyetler": "/admin/ai-maliyetler",
  "yedekleme": "/admin/yedekleme",
  "gorunum-ayarlari": "/admin/gorunum-ayarlari",
  "veri-disa-aktarma": "/admin/veri-disa-aktarma",
  "aktivite-loglari": "/admin/aktivite-loglari",
  "cop-kutusu": "/admin/cop-kutusu",
  "seed": "/admin/seed",
  "icerik-studyosu": "/admin/icerik-studyosu",
  "bannerlar": "/admin/bannerlar",
  "checklistler": "/admin/checklistler",
  "akademi-yonetimi": "/admin/akademi-yonetimi",
  "ekipman-yonetimi": "/admin/ekipman-yonetimi",
  "toplu-veri": "/admin/toplu-veri",
  "gorev-sablonlari": "/admin/gorev-sablonlari",
  "widget-yonetimi": "/admin/widget-yonetimi",
  "widget-editor": "/admin/widget-editor",
  "fabrika-istasyonlar": "/admin/fabrika-istasyonlar",
  "fire-sebepleri": "/admin/fire-sebepleri",
  "pin-yonetimi": "/admin/pin-yonetimi",
  "kalite-kriterleri": "/admin/kalite-kriterleri",
  "personel-tipleri": "/admin/personel-tipleri",
  "ai-politikalari": "/admin/ai-politikalari",
  "dobody-avatarlar": "/admin/dobody-avatarlar",
  "dobody-gorevler": "/admin/dobody-gorevler",
  "veri-kilitleri": "/admin/veri-kilitleri",
  "degisiklik-talepleri": "/admin/degisiklik-talepleri",
  "delegasyon": "/admin/delegasyon"
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return "admin-panel";
  const sortedEntries = Object.entries(TAB_URL_MAP)
    .filter(([tabId]) => tabId !== "admin-panel")
    .sort((a, b) => b[1].length - a[1].length);
  for (const [tabId, url] of sortedEntries) {
    if (pathname === url || pathname.startsWith(url + "/")) {
      return tabId;
    }
  }
  return null;
}

export default function AdminMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const visibleTabs = ADMIN_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    return canAccess(tab.permissionModule!, 'view');
  });

  const visibleGroups = TAB_GROUPS.filter(group => 
    visibleTabs.some(tab => tab.group === group.id)
  );

  const firstVisibleGroup = visibleGroups[0]?.id || "kullanicilar";
  
  const initialTab = getTabFromUrl(location);
  const initialTabConfig = initialTab ? visibleTabs.find(t => t.id === initialTab) : null;
  const initialGroup = initialTabConfig?.group || firstVisibleGroup;
  
  const [activeGroup, setActiveGroup] = useState(
    visibleGroups.find(g => g.id === initialGroup) ? initialGroup : firstVisibleGroup
  );

  const tabsInActiveGroup = visibleTabs.filter(tab => tab.group === activeGroup);
  const firstTabInGroup = tabsInActiveGroup[0]?.id || "";
  const [activeTab, setActiveTab] = useState(
    initialTabConfig 
      ? initialTab! 
      : firstTabInGroup
  );
  
  useEffect(() => {
    if (!visibleGroups.find(g => g.id === activeGroup)) {
      setActiveGroup(firstVisibleGroup);
    }
  }, [visibleGroups, activeGroup, firstVisibleGroup]);
  
  useEffect(() => {
    if (!tabsInActiveGroup.find(t => t.id === activeTab)) {
      setActiveTab(firstTabInGroup);
      const url = TAB_URL_MAP[firstTabInGroup];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  }, [tabsInActiveGroup, activeTab, firstTabInGroup]);
  
  useEffect(() => {
    const tabFromUrl = getTabFromUrl(location);
    if (tabFromUrl && tabFromUrl !== activeTab) {
      const tabConfig = visibleTabs.find(t => t.id === tabFromUrl);
      if (tabConfig) {
        if (tabConfig.group !== activeGroup) {
          setActiveGroup(tabConfig.group);
        }
        setActiveTab(tabFromUrl);
      }
    }
  }, [location, visibleTabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const url = TAB_URL_MAP[tabId];
    if (url && location !== url) {
      setLocation(url);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const firstTab = visibleTabs.find(t => t.group === groupId);
    if (firstTab) {
      setActiveTab(firstTab.id);
      const url = TAB_URL_MAP[firstTab.id];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Yönetim & Ayarlar
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
            <Settings className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-semibold">Yönetim & Ayarlar</h1>
              <p className="text-sm text-muted-foreground">Sistem yönetimi ve ayarlar</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-2">
          <div className="relative">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2">
                {visibleGroups.map((group) => {
                  const tabCount = visibleTabs.filter(t => t.group === group.id).length;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleGroupChange(group.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeGroup === group.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      data-testid={`group-admin-${group.id}`}
                    >
                      {group.icon}
                      <span>{group.labelTr}</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {tabCount}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-[1]" data-testid="scroll-fade-groups" />
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab || firstTabInGroup}
        onValueChange={handleTabChange} 
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <div className="relative">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex h-auto p-1 bg-transparent gap-1">
                {tabsInActiveGroup.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                    data-testid={`tab-admin-${tab.id}`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.labelTr}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-[1]" data-testid="scroll-fade-tabs" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {visibleTabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className="h-full m-0 p-0"
              data-testid={`content-admin-${tab.id}`}
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
