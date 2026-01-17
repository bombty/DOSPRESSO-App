import { useState, Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@shared/schema";
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
  Cog
} from "lucide-react";

const AdminDashboard = lazy(() => import("./admin/index"));
const AdminKullanicilar = lazy(() => import("./admin/kullanicilar"));
const RolYetkileri = lazy(() => import("./rol-yetkileri"));
const AdminYetkilendirme = lazy(() => import("./admin/yetkilendirme"));
const Settings2 = lazy(() => import("./yonetim/ayarlar"));
const AdminEmailAyarlari = lazy(() => import("./admin/email-ayarlari"));
const AdminYedekleme = lazy(() => import("./admin/yedekleme"));
const AdminAktiviteLoglar = lazy(() => import("./admin/aktivite-loglari"));
const AdminMenuManagement = lazy(() => import("./yonetim/menu"));
const AdminContentManagement = lazy(() => import("./yonetim/icerik"));
const AdminDuyurular = lazy(() => import("./admin/duyurular"));
const AdminBannerlar = lazy(() => import("./admin/bannerlar"));
const AdminChecklistManagement = lazy(() => import("./yonetim/checklistler"));
const AdminAcademy = lazy(() => import("./yonetim/akademi"));
const EquipmentManagement = lazy(() => import("./yonetim/ekipman-yonetimi"));
const EkipmanServis = lazy(() => import("./yonetim/ekipman-servis"));
const ServiceRequestsManagement = lazy(() => import("./yonetim/servis-talepleri"));
const AdminTopluVeriYonetimi = lazy(() => import("./admin/toplu-veri-yonetimi"));
const AdminKaliteDenetimSablonlari = lazy(() => import("./admin/kalite-denetim-şablonları"));
const AdminYapayZekaAyarlari = lazy(() => import("./admin/yapay-zeka-ayarlari"));
const AICostDashboard = lazy(() => import("./yonetim/ai-maliyetler"));
const AdminServisMailAyarlari = lazy(() => import("./admin/servis-mail-ayarlari"));
const AdminFabrikaIstasyonlar = lazy(() => import("./admin/fabrika-istasyonlar"));
const AdminFabrikaFireSebepleri = lazy(() => import("./admin/fabrika-fire-sebepleri"));
const AdminFabrikaPinYonetimi = lazy(() => import("./admin/fabrika-pin-yonetimi"));
const AdminFabrikaKaliteKriterleri = lazy(() => import("./admin/fabrika-kalite-kriterleri"));
const IcerikStudyosu = lazy(() => import("./icerik-studyosu"));
const AdminSeed = lazy(() => import("./admin-seed"));

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
    id: "rol-yetkileri",
    label: "Role Permissions",
    labelTr: "Rol Yetkileri",
    icon: <Shield className="h-4 w-4" />,
    permissionModule: "role_permissions",
    group: "kullanicilar",
    component: RolYetkileri
  },
  {
    id: "yetkilendirme",
    label: "Authorization",
    labelTr: "Yetkilendirme",
    icon: <Key className="h-4 w-4" />,
    permissionModule: "authorization",
    group: "kullanicilar",
    component: AdminYetkilendirme
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
    id: "aktivite-loglari",
    label: "Activity Logs",
    labelTr: "Aktivite Logları",
    icon: <Activity className="h-4 w-4" />,
    permissionModule: "activity_logs",
    group: "sistem",
    component: AdminAktiviteLoglar
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
    id: "menu-yonetimi",
    label: "Menu Management",
    labelTr: "Menü Yönetimi",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "menu_management",
    group: "icerik",
    component: AdminMenuManagement
  },
  {
    id: "icerik-yonetimi",
    label: "Content Management",
    labelTr: "İçerik Yönetimi",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "content_management",
    group: "icerik",
    component: AdminContentManagement
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
    id: "duyurular",
    label: "Announcements",
    labelTr: "Duyurular",
    icon: <Megaphone className="h-4 w-4" />,
    permissionModule: "announcements_admin",
    group: "icerik",
    component: AdminDuyurular
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
    id: "ekipman-servis",
    label: "Equipment Service",
    labelTr: "Ekipman Servis",
    icon: <Wrench className="h-4 w-4" />,
    permissionModule: "equipment_service",
    group: "operasyon",
    component: EkipmanServis
  },
  {
    id: "servis-talepleri",
    label: "Service Requests",
    labelTr: "Servis Talepleri",
    icon: <FileText className="h-4 w-4" />,
    permissionModule: "service_requests",
    group: "operasyon",
    component: ServiceRequestsManagement
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
    id: "kalite-sablonlari",
    label: "Quality Templates",
    labelTr: "Kalite Şablonları",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "quality_templates",
    group: "operasyon",
    component: AdminKaliteDenetimSablonlari
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

export default function AdminMegaModule() {
  const { user } = useAuth();
  const [activeGroup, setActiveGroup] = useState("kullanicilar");
  const [activeTab, setActiveTab] = useState("");

  const visibleTabs = ADMIN_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    return hasPermission(user.role as any, tab.permissionModule as any, 'view');
  });

  const visibleGroups = TAB_GROUPS.filter(group => 
    visibleTabs.some(tab => tab.group === group.id)
  );

  const tabsInActiveGroup = visibleTabs.filter(tab => tab.group === activeGroup);
  
  const firstTabInGroup = tabsInActiveGroup[0]?.id || "";

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
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {visibleGroups.map((group) => {
                const tabCount = visibleTabs.filter(t => t.group === group.id).length;
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setActiveGroup(group.id);
                      const firstTab = visibleTabs.find(t => t.group === group.id);
                      if (firstTab) setActiveTab(firstTab.id);
                    }}
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
        </div>
      </div>

      <Tabs 
        value={activeTab || firstTabInGroup}
        onValueChange={setActiveTab} 
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
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
