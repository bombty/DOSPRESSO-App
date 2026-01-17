import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { 
  getMenuSectionMapping, 
  getMegaModuleTitles, 
  matchesMegaModule 
} from "@/lib/megaModuleConfig";
import { 
  ChevronLeft,
  GraduationCap, 
  Wrench, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Calendar,
  MessageSquare,
  Settings,
  Building2,
  AlertTriangle,
  BookOpen,
  Coffee,
  Briefcase,
  FolderKanban,
  CheckSquare,
  Shield,
  Bot,
  Star,
  Calculator,
  Megaphone,
  UserCheck,
  MapPin,
  Database,
  Clock,
  LayoutDashboard,
  Factory,
  Grid,
  Home,
  QrCode,
  Bell,
  Headphones,
  Tablet,
  Timer,
  ChevronRight
} from "lucide-react";

export default function MegaModulePage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const moduleId = params.moduleId as string;
  const { user } = useAuth();

  const { data: menuResponse, isLoading } = useQuery<any>({
    queryKey: ["/api/me/menu"],
    enabled: !!user,
  });

  // Dashboard modüllerini veritabanından çek (mega_module_items tablosu)
  const { data: dashboardModules, isLoading: isDashboardLoading } = useQuery<any>({
    queryKey: ["/api/dashboard-modules"],
    enabled: !!user,
  });

  const { data: faults = [] } = useQuery<any[]>({
    queryKey: ["/api/faults"],
    queryFn: async () => {
      const res = await fetch("/api/faults");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const openFaults = faults.filter((f) => f.currentStage !== "kapatildi").length;
  const pendingTasks = tasks.filter((t) => t.status === "beklemede").length;

  const getIcon = (moduleId: string | undefined | null) => {
    if (!moduleId) return Coffee;
    const iconMap: Record<string, any> = {
      "akademi": GraduationCap,
      "akademi-hq": GraduationCap,
      "academy": GraduationCap,
      "academy-hq": GraduationCap,
      "academy-main": GraduationCap,
      "tasklar": ClipboardList,
      "tasks": ClipboardList,
      "tasks-hq": ClipboardList,
      "tasks-main": ClipboardList,
      "ariza": Wrench,
      "arızalar": Wrench,
      "faults": Wrench,
      "faults-main": Wrench,
      "vardiya": Calendar,
      "vardiyalar": Calendar,
      "shifts": Calendar,
      "shifts-hq": Calendar,
      "shifts-main": Calendar,
      "checklistler": CheckSquare,
      "checklists": CheckSquare,
      "checklists-hq": CheckSquare,
      "checklists-main": CheckSquare,
      "kayip-esya": Briefcase,
      "kayip-esya-hq": Briefcase,
      "lost-found": Briefcase,
      "lost-found-hq": Briefcase,
      "ekipman": Coffee,
      "equipment": Coffee,
      "equipment-main": Coffee,
      "destek": MessageSquare,
      "support": MessageSquare,
      "hq-destek": MessageSquare,
      "support-main": MessageSquare,
      "ik": Users,
      "hr": Users,
      "hr-main": Users,
      "muhasebe": Calculator,
      "accounting": Calculator,
      "accounting-main": Calculator,
      "raporlar": BarChart3,
      "reports": BarChart3,
      "reports-main": BarChart3,
      "bilgi-bankasi": BookOpen,
      "knowledge": BookOpen,
      "knowledge-main": BookOpen,
      "performans": BarChart3,
      "performance": BarChart3,
      "performance-main": BarChart3,
      "projeler": FolderKanban,
      "projects": FolderKanban,
      "projects-main": FolderKanban,
      "ayarlar": Settings,
      "settings": Settings,
      "settings-main": Settings,
      "yonetim": Settings,
      "admin": Shield,
      "admin-main": Shield,
      "yetkilendirme": Shield,
      "authorization": Shield,
      "kalite-denetimi": Star,
      "quality": Star,
      "quality-main": Star,
      "kullanicilar": Users,
      "users": Users,
      "users-main": Users,
      "dashboard": Building2,
      "dashboard-main": Building2,
      "branches": Building2,
      "qr-scan": Coffee,
      "announcements": Megaphone,
      "duyurular": Megaphone,
      "bulk-data": Database,
      "toplu-veri": Database,
      "canlı-takip": MapPin,
      "live-tracking": MapPin,
      "ai-asistan": Bot,
      "ai-assistant": Bot,
    };
    return iconMap[moduleId.toLowerCase()] || Coffee;
  };

  const getColor = (moduleId: string | undefined | null) => {
    if (!moduleId) return "bg-slate-400";
    const colorMap: Record<string, string> = {
      "akademi": "bg-blue-500",
      "academy": "bg-blue-500",
      "tasklar": "bg-green-500",
      "tasks": "bg-green-500",
      "ariza": "bg-orange-500",
      "faults": "bg-orange-500",
      "vardiya": "bg-purple-500",
      "shifts": "bg-purple-500",
      "checklistler": "bg-teal-500",
      "checklists": "bg-teal-500",
      "kayip-esya": "bg-yellow-600",
      "lost-found": "bg-yellow-600",
      "ekipman": "bg-amber-600",
      "equipment": "bg-amber-600",
      "destek": "bg-blue-500",
      "support": "bg-rose-500",
      "ik": "bg-pink-500",
      "hr": "bg-pink-500",
      "muhasebe": "bg-emerald-600",
      "accounting": "bg-emerald-600",
      "raporlar": "bg-cyan-500",
      "reports": "bg-cyan-500",
      "bilgi-bankasi": "bg-emerald-500",
      "knowledge": "bg-emerald-500",
      "performans": "bg-cyan-500",
      "performance": "bg-cyan-500",
      "projeler": "bg-violet-600",
      "projects": "bg-violet-600",
      "ayarlar": "bg-slate-600",
      "settings": "bg-slate-600",
      "admin": "bg-red-600",
      "yetkilendirme": "bg-red-600",
      "kalite-denetimi": "bg-amber-500",
      "quality": "bg-amber-500",
      "kullanicilar": "bg-sky-500",
      "users": "bg-sky-500",
      "dashboard": "bg-indigo-500",
      "branches": "bg-indigo-500",
      "announcements": "bg-red-500",
      "duyurular": "bg-red-500",
      "bulk-data": "bg-indigo-600",
      "canlı-takip": "bg-emerald-500",
      "ai-asistan": "bg-violet-500",
    };
    return colorMap[moduleId.toLowerCase()] || "bg-slate-400";
  };

  const getBadge = (moduleId: string | undefined | null): number | undefined => {
    if (!moduleId) return undefined;
    const id = moduleId.toLowerCase();
    if (id.includes('task') || id.includes('gorev')) return pendingTasks > 0 ? pendingTasks : undefined;
    if (id.includes('fault') || id.includes('ariza')) return openFaults > 0 ? openFaults : undefined;
    return undefined;
  };

  const getSectionIcon = (iconName: string | undefined) => {
    if (!iconName) return Coffee;
    const sectionIconMap: Record<string, any> = {
      "LayoutDashboard": LayoutDashboard,
      "Home": Home,
      "Factory": Factory,
      "Wrench": Wrench,
      "Building2": Building2,
      "CheckSquare": CheckSquare,
      "Users": Users,
      "GraduationCap": GraduationCap,
      "BarChart3": BarChart3,
      "Star": Star,
      "Calculator": Calculator,
      "FolderKanban": FolderKanban,
      "MessageSquare": MessageSquare,
      "Settings": Settings,
      "Clock": Clock,
      "Timer": Timer,
      "Grid": Grid,
      "Shield": Shield,
      "Tablet": Tablet,
      "QrCode": QrCode,
      "AlertTriangle": AlertTriangle,
      "Calendar": Calendar,
      "BookOpen": BookOpen,
      "Bot": Bot,
      "Bell": Bell,
      "Headphones": Headphones,
      "Megaphone": Megaphone,
      "Database": Database,
      "Briefcase": Briefcase,
      "ClipboardList": ClipboardList,
      "Coffee": Coffee,
    };
    return sectionIconMap[iconName] || Coffee;
  };

  const getSectionColor = (sectionId: string | undefined): string => {
    if (!sectionId) return "bg-slate-500";
    const colorMap: Record<string, string> = {
      "dashboard-hq": "bg-indigo-500",
      "dashboard-branch": "bg-indigo-500",
      "operations": "bg-green-500",
      "equipment": "bg-orange-500",
      "equipment-section": "bg-orange-500",
      "hr": "bg-pink-500",
      "hr-section": "bg-pink-500",
      "training": "bg-blue-500",
      "training-section": "bg-blue-500",
      "academy": "bg-blue-500",
      "academy-section": "bg-blue-500",
      "kitchen": "bg-amber-600",
      "recipes": "bg-amber-600",
      "reports": "bg-cyan-500",
      "reports-section": "bg-cyan-500",
      "analytics": "bg-cyan-500",
      "newshop": "bg-violet-600",
      "projects": "bg-violet-600",
      "projects-section": "bg-violet-600",
      "admin": "bg-red-600",
      "admin-section": "bg-red-600",
      "settings": "bg-slate-600",
      "settings-section": "bg-slate-600",
      "support": "bg-rose-500",
      "support-section": "bg-rose-500",
      "quality": "bg-amber-500",
      "quality-section": "bg-amber-500",
      "factory": "bg-emerald-600",
      "factory-section": "bg-emerald-600",
      "checklists": "bg-teal-500",
      "checklists-section": "bg-teal-500",
      "tasks": "bg-green-500",
      "tasks-section": "bg-green-500",
    };
    return colorMap[sectionId.toLowerCase()] || "bg-primary";
  };

  const normalizeModuleKey = (m: any): string => {
    if (m.id) return m.id;
    if (m.label) return m.label.toLowerCase().replace(/\s+/g, '-');
    if (m.path) return m.path.replace(/^\//, '').replace(/\//g, '-');
    return 'unknown-module';
  };

  // Get mega-module mapping from shared config (localStorage with fallback)
  const MEGA_MODULE_MAPPING = getMenuSectionMapping();
  const megaModuleTitles = getMegaModuleTitles();

  const MEGA_MODULE_CONFIG: Record<string, { title: string; icon: string; color: string }> = {
    "operations": { title: megaModuleTitles["operations"] || "Operasyonlar", icon: "ClipboardList", color: "bg-green-500" },
    "equipment": { title: megaModuleTitles["equipment"] || "Ekipman & Bakım", icon: "Wrench", color: "bg-orange-500" },
    "hr": { title: megaModuleTitles["hr"] || "Personel & İK", icon: "Users", color: "bg-pink-500" },
    "training": { title: megaModuleTitles["training"] || "Eğitim & Akademi", icon: "GraduationCap", color: "bg-blue-500" },
    "kitchen": { title: megaModuleTitles["kitchen"] || "Mutfak & Reçeteler", icon: "Coffee", color: "bg-amber-600" },
    "factory": { title: megaModuleTitles["factory"] || "Fabrika & Üretim", icon: "Factory", color: "bg-indigo-600" },
    "reports": { title: megaModuleTitles["reports"] || "Raporlar & Analitik", icon: "BarChart3", color: "bg-cyan-500" },
    "newshop": { title: megaModuleTitles["newshop"] || "Yeni Mağaza Açılışı", icon: "FolderKanban", color: "bg-violet-600" },
    "admin": { title: megaModuleTitles["admin"] || "Yönetim & Ayarlar", icon: "Shield", color: "bg-slate-600" },
  };

  // Get all menu sections from API
  // Don't filter out empty sections - keep metadata for mega-module grouping
  const allMenuSections = (menuResponse?.sections || [])
    .filter((section: any) => section.titleTr || section.id)
    .map((section: any) => ({
      id: section.id,
      title: section.titleTr,
      icon: section.icon,
      items: (section.items || [])
        .filter((item: any) => item.path !== '/' && item.path !== '/sube/dashboard')
        .map((item: any) => ({
          id: item.id,
          label: item.titleTr,
          path: item.path,
          description: item.description,
          moduleKey: item.moduleKey,
        })),
    }));
    // Don't filter by items.length - preserve section metadata

  // Find mega-module by ID and group matching sections
  const megaConfig = MEGA_MODULE_CONFIG[moduleId];
  const mappedSectionIds = MEGA_MODULE_MAPPING[moduleId] || [];
  
  // Get all items from matching sections using the helper function
  const matchedSections = allMenuSections.filter((s: any) => 
    matchesMegaModule(s.id, mappedSectionIds)
  );
  
  const allItems = matchedSections.flatMap((s: any) => s.items || []);
  
  // Deduplicate items by path
  let sectionItems = allItems.filter((item: any, index: number, self: any[]) =>
    index === self.findIndex((t) => t.path === item.path)
  );

  // DASHBOARD-SYNC: Veritabanı modüllerini kullan (mega_module_items tablosu ile senkron)
  // Bu, Modül Düzenleme sekmesiyle tam uyum sağlar
  if (dashboardModules?.modules?.[moduleId]) {
    const dbItems = dashboardModules.modules[moduleId].items || [];
    sectionItems = dbItems.map((item: any) => ({
      id: item.id || item.path.replace(/\//g, '-').replace(/^-/, ''),
      label: item.titleTr || item.title,
      titleTr: item.titleTr || item.title,
      path: item.path,
      moduleKey: item.id,
    }));
  }

  // Create a virtual "currentSection" for rendering
  // If it's a valid mega-module ID, always create the section (even if empty)
  const currentSection = megaConfig ? {
    id: moduleId,
    title: megaConfig.title,
    icon: megaConfig.icon,
    items: sectionItems,
  } : allMenuSections.find((s: any) => s.id === moduleId);

  if (isLoading || isDashboardLoading) {
    return (
      <div className="p-4 space-y-4">
        <ListSkeleton count={6} variant="card" showHeader />
      </div>
    );
  }

  if (!currentSection) {
    return (
      <div className="p-4 space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/")}
          data-testid="button-back-dashboard"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Modül bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SectionIcon = getSectionIcon(currentSection.icon);
  const sectionColor = megaConfig ? megaConfig.color : getSectionColor(moduleId);
  const sectionTitle = megaConfig ? megaConfig.title : (currentSection.titleTr || currentSection.title);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/")}
          data-testid="button-back-dashboard"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className={`w-10 h-10 rounded-xl ${sectionColor} flex items-center justify-center`}>
          <SectionIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{sectionTitle}</h1>
          <p className="text-xs text-muted-foreground">{sectionItems.length} modül</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sectionItems.map((item: any) => {
          const moduleKey = normalizeModuleKey(item);
          const ModuleIcon = getIcon(moduleKey);
          const moduleColor = getColor(moduleKey);
          const moduleBadge = getBadge(moduleKey);
          
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.path)}
              className="relative flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] min-h-[90px]"
              data-testid={`submodule-card-${item.id}`}
            >
              {moduleBadge && moduleBadge > 0 && (
                <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {moduleBadge > 99 ? "99+" : moduleBadge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-lg ${moduleColor} flex items-center justify-center mb-2`}>
                <ModuleIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-center leading-tight">{item.titleTr || item.label}</span>
            </button>
          );
        })}
      </div>

      {sectionItems.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Bu modülde erişiminiz yok</p>
            <p className="text-xs text-muted-foreground">
              Bu alana erişim için yöneticinizle iletişime geçin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
