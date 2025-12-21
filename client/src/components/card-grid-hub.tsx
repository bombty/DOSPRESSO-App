import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { isHQRole, isBranchRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { ShiftStatusCard } from "@/components/shift-status-card";
import { ShiftChecklistCard } from "@/components/shift-checklist-card";
import { EnhancedAnalyticsCard } from "@/components/enhanced-analytics-card";
import { 
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
  Heart,
  AlertCircle,
  Plus,
  FolderKanban,
  CheckSquare,
  Shield,
  Bot,
  Star,
  Calculator
} from "lucide-react";

interface ModuleCard {
  id: string;
  icon: any;
  label: string;
  path: string;
  color: string;
  badge?: number;
  description?: string;
  roles?: string[];
}

export function CardGridHub() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isHQ = user && isHQRole(user.role as any);
  const isBranch = user && isBranchRole(user.role as any);

  // Fetch menu items from API (dynamic permissions)
  const { data: menuModules = [] } = useQuery<any[]>({
    queryKey: ["/api/me/menu"],
    enabled: !!user,
  });

  // Fetch counts for badges
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

  const { data: criticalEquipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment/critical"],
  });

  const openFaults = faults.filter((f) => f.currentStage !== "kapatildi").length;
  const pendingTasks = tasks.filter((t) => t.status === "beklemede").length;

  // Module definitions - different for HQ vs Branch users
  const branchModules: ModuleCard[] = [
    { 
      id: "academy", 
      icon: GraduationCap, 
      label: "Akademi", 
      path: "/akademi",
      color: "bg-blue-500",
      description: "Eğitim & Gelişim"
    },
    { 
      id: "tasks", 
      icon: ClipboardList, 
      label: "Tasklar", 
      path: "/gorevler",
      color: "bg-green-500",
      badge: pendingTasks,
      description: "Günlük işler"
    },
    { 
      id: "faults", 
      icon: Wrench, 
      label: "Arıza", 
      path: "/ariza",
      color: "bg-orange-500",
      badge: openFaults,
      description: "Ekipman sorunları"
    },
    { 
      id: "shifts", 
      icon: Calendar, 
      label: "Vardiya", 
      path: "/vardiyalar",
      color: "bg-purple-500",
      description: "Çalışma saatleri"
    },
    { 
      id: "checklists", 
      icon: ClipboardList, 
      label: "Checklistler", 
      path: "/checklistler",
      color: "bg-teal-500",
      description: "Günlük kontroller"
    },
    { 
      id: "lost-found", 
      icon: Briefcase, 
      label: "Lost&Found", 
      path: "/kayip-esya",
      color: "bg-yellow-600",
      description: "Bulunan eşyalar"
    },
    { 
      id: "equipment", 
      icon: Coffee, 
      label: "Ekipman", 
      path: "/ekipman",
      color: "bg-amber-600",
      description: "Ekipman yönetimi"
    },
    { 
      id: "support", 
      icon: MessageSquare, 
      label: "Merkez Destek", 
      path: "/hq-destek",
      color: "bg-blue-500",
      description: "HQ'ya talep gönder"
    },
    // Yeni eklenen modüller
    { 
      id: "hr", 
      icon: Users, 
      label: "İK Yönetimi", 
      path: "/ik",
      color: "bg-pink-500",
      description: "Personel yönetimi",
      roles: ["supervisor", "supervisor_buddy", "yatirimci_branch", "admin"]
    },
    { 
      id: "knowledge", 
      icon: BookOpen, 
      label: "Bilgi Bankası", 
      path: "/bilgi-bankasi",
      color: "bg-emerald-500",
      description: "Dokümanlar & rehberler"
    },
    { 
      id: "performance", 
      icon: BarChart3, 
      label: "Performans", 
      path: "/performans",
      color: "bg-cyan-500",
      description: "Performans metrikleri",
      roles: ["supervisor", "supervisor_buddy", "yatirimci_branch", "admin"]
    },
  ];

  const hqModules: ModuleCard[] = [
    { 
      id: "tasks-hq", 
      icon: ClipboardList, 
      label: "Tasklar", 
      path: "/gorevler",
      color: "bg-green-500",
      badge: pendingTasks,
      description: "Task yönetimi"
    },
    { 
      id: "academy-hq", 
      icon: GraduationCap, 
      label: "Akademi Yönetimi", 
      path: "/yonetim/akademi",
      color: "bg-blue-500",
      description: "Eğitim yönetimi"
    },
    { 
      id: "branches", 
      icon: Building2, 
      label: "Şubeler", 
      path: "/subeler",
      color: "bg-indigo-500",
      description: "Şube yönetimi"
    },
    { 
      id: "checklists-hq", 
      icon: CheckSquare, 
      label: "Checklistler", 
      path: "/yonetim/checklistler",
      color: "bg-teal-500",
      description: "Checklist yönetimi"
    },
    { 
      id: "shifts-hq", 
      icon: Calendar, 
      label: "Vardiya Planlama", 
      path: "/vardiyalar",
      color: "bg-purple-500",
      description: "Vardiya planlaması"
    },
    { 
      id: "faults", 
      icon: AlertTriangle, 
      label: "Arızalar", 
      path: "/ariza",
      color: "bg-orange-500",
      badge: openFaults,
      description: "Tüm arızalar"
    },
    { 
      id: "hr", 
      icon: Users, 
      label: "İK", 
      path: "/ik",
      color: "bg-pink-500",
      description: "Personel yönetimi"
    },
    { 
      id: "muhasebe", 
      icon: Calculator, 
      label: "Muhasebe", 
      path: "/muhasebe",
      color: "bg-emerald-600",
      description: "Bordro & Maaş Yönetimi",
      roles: ["admin", "muhasebe"]
    },
    { 
      id: "reports", 
      icon: BarChart3, 
      label: "Raporlar", 
      path: "/e2e-raporlar",
      color: "bg-cyan-500",
      description: "Analitik & PDF export"
    },
    { 
      id: "equipment", 
      icon: Coffee, 
      label: "Ekipman", 
      path: "/ekipman",
      color: "bg-amber-600",
      description: "Ekipman listesi"
    },
    { 
      id: "lost-found", 
      icon: Briefcase, 
      label: "Lost&Found", 
      path: "/kayip-esya-hq",
      color: "bg-yellow-600",
      description: "Bulunan eşyalar"
    },
    { 
      id: "projects", 
      icon: FolderKanban, 
      label: "Projeler", 
      path: "/projeler",
      color: "bg-violet-600",
      description: "HQ Proje Yönetimi"
    },
    { 
      id: "support", 
      icon: MessageSquare, 
      label: "Destek", 
      path: "/hq-destek",
      color: "bg-rose-500",
      description: "Destek talepleri"
    },
    { 
      id: "settings", 
      icon: Settings, 
      label: "Yönetim", 
      path: "/yonetim/ayarlar",
      color: "bg-slate-600",
      description: "Sistem ayarları"
    },
    { 
      id: "admin", 
      icon: Shield, 
      label: "Admin Panel", 
      path: "/admin",
      color: "bg-red-600",
      description: "Sistem yönetimi",
      roles: ["admin"]
    },
    // Yeni eklenen modüller
    { 
      id: "knowledge", 
      icon: BookOpen, 
      label: "Bilgi Bankası", 
      path: "/bilgi-bankasi",
      color: "bg-emerald-500",
      description: "Dokümanlar & rehberler"
    },
    { 
      id: "ai-assistant", 
      icon: Bot, 
      label: "AI Asistan", 
      path: "/ai-asistan",
      color: "bg-violet-500",
      description: "Yapay zeka asistanı"
    },
    { 
      id: "quality", 
      icon: Star, 
      label: "Kalite Kontrol", 
      path: "/kalite-denetimi",
      color: "bg-amber-500",
      description: "Kalite & denetim"
    },
    { 
      id: "users", 
      icon: Users, 
      label: "Kullanıcılar", 
      path: "/yonetim/kullanicilar",
      color: "bg-sky-500",
      description: "Kullanıcı yönetimi"
    },
  ];

  // Eğer API'den modüller gelmişse onları kullan, yoksa statik fallback
  const getIcon = (moduleId: string) => {
    const iconMap: Record<string, any> = {
      "akademi": GraduationCap,
      "akademi-hq": GraduationCap,
      "academy": GraduationCap,
      "academy-hq": GraduationCap,
      "tasklar": ClipboardList,
      "tasks": ClipboardList,
      "tasks-hq": ClipboardList,
      "ariza": Wrench,
      "arızalar": Wrench,
      "faults": Wrench,
      "vardiya": Calendar,
      "vardiyalar": Calendar,
      "shifts": Calendar,
      "shifts-hq": Calendar,
      "checklistler": CheckSquare,
      "checklists": CheckSquare,
      "checklists-hq": CheckSquare,
      "kayip-esya": Briefcase,
      "kayip-esya-hq": Briefcase,
      "lost-found": Briefcase,
      "ekipman": Coffee,
      "equipment": Coffee,
      "destek": MessageSquare,
      "support": MessageSquare,
      "hq-destek": MessageSquare,
      "ik": Users,
      "hr": Users,
      "muhasebe": Calculator,
      "raporlar": BarChart3,
      "reports": BarChart3,
      "bilgi-bankasi": BookOpen,
      "knowledge": BookOpen,
      "performans": BarChart3,
      "performance": BarChart3,
      "projeler": FolderKanban,
      "projects": FolderKanban,
      "ayarlar": Settings,
      "settings": Settings,
      "yonetim": Settings,
      "admin": Shield,
      "ai-asistan": Bot,
      "kalite-denetimi": Star,
      "quality": Star,
      "kullanicilar": Users,
      "users": Users,
    };
    return iconMap[moduleId.toLowerCase()] || Coffee;
  };

  const getColor = (moduleId: string) => {
    const colorMap: Record<string, string> = {
      "akademi": "bg-blue-500",
      "akademi-hq": "bg-blue-500",
      "academy": "bg-blue-500",
      "tasklar": "bg-green-500",
      "tasks": "bg-green-500",
      "ariza": "bg-orange-500",
      "arızalar": "bg-orange-500",
      "vardiya": "bg-purple-500",
      "checklistler": "bg-teal-500",
      "kayip-esya": "bg-yellow-600",
      "ekipman": "bg-amber-600",
      "destek": "bg-blue-500",
      "ik": "bg-pink-500",
      "muhasebe": "bg-emerald-600",
      "raporlar": "bg-cyan-500",
      "bilgi-bankasi": "bg-emerald-500",
      "performans": "bg-cyan-500",
      "projeler": "bg-violet-600",
      "ayarlar": "bg-slate-600",
      "admin": "bg-red-600",
      "ai-asistan": "bg-violet-500",
      "kalite-denetimi": "bg-amber-500",
      "kullanicilar": "bg-sky-500",
    };
    return colorMap[moduleId.toLowerCase()] || "bg-slate-400";
  };

  const modules = menuModules && menuModules.length > 0 
    ? menuModules.map(m => ({
        id: m.id || m.label?.toLowerCase().replace(/\s+/g, '-'),
        icon: getIcon(m.id),
        label: m.label,
        path: m.path,
        color: getColor(m.id),
        description: m.description,
      }))
    : (isHQ ? hqModules : branchModules);

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Shift Status - Branch users only */}
      {isBranch && <ShiftStatusCard />}

      {/* Shift Checklists - Branch users only */}
      {isBranch && <ShiftChecklistCard />}

      {/* Analytics Card - Branch supervisors only */}
      {isBranch && (user?.role === 'supervisor' || user?.role === 'supervisor_buddy') && <EnhancedAnalyticsCard />}

      {/* Equipment Health Alert */}
      {criticalEquipment.length > 0 && (
        <Card className="border-destructive bg-destructive/5 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Kritik Ekipmanlar ({criticalEquipment.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalEquipment.slice(0, 3).map((eq: any) => (
              <div key={eq.id} className="flex items-center justify-between text-xs p-2 bg-background/50 rounded border border-destructive/20">
                <span className="font-medium truncate">{eq.equipmentType}</span>
                <span className="text-destructive font-bold">{Math.round(eq.healthScore || 0)}%</span>
              </div>
            ))}
            {criticalEquipment.length > 3 && (
              <p className="text-xs text-muted-foreground">+{criticalEquipment.length - 3} daha...</p>
            )}
            <Button 
              size="sm" 
              variant="destructive" 
              className="w-full mt-2 h-8"
              onClick={() => setLocation("/ekipman")}
              data-testid="button-equipment-critical"
            >
              <Heart className="h-3 w-3 mr-1" />
              Ekipmanları Gözden Geçir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <QuickTaskModal trigger={
          <Button size="sm" variant="outline" className="flex-1" data-testid="button-quick-task-dashboard">
            <Plus className="h-4 w-4 mr-1" />
            Hızlı Görev
          </Button>
        } />
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-3 gap-2">
        {modules.filter((module) => {
          if (module.roles && module.roles.length > 0) {
            return module.roles.includes(user?.role || '');
          }
          return true;
        }).map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => setLocation(module.path)}
              className="relative flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.98] min-h-[80px]"
              data-testid={`module-card-${module.id}`}
            >
              {/* Badge */}
              {module.badge && module.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {module.badge > 99 ? "99+" : module.badge}
                </span>
              )}
              
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center mb-1`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Label */}
              <span className="text-xs font-semibold text-center leading-tight">{module.label}</span>
              
              {/* Description - Hidden on compact */}
              {module.description && (
                <span className="hidden text-[9px] text-muted-foreground mt-0.5">
                  {module.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Stats - Optional */}
      {(pendingTasks > 0 || openFaults > 0) && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Hızlı Bakış</p>
          <div className="flex gap-4 text-sm">
            {pendingTasks > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>{pendingTasks} bekleyen görev</span>
              </div>
            )}
            {openFaults > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>{openFaults} açık arıza</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
