import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { isHQRole, isBranchRole } from "@shared/schema";
import { canSeeWidget } from "@/lib/role-visibility";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { ShiftStatusCard } from "@/components/shift-status-card";
import { ShiftChecklistCard } from "@/components/shift-checklist-card";
import { EnhancedAnalyticsCard } from "@/components/enhanced-analytics-card";
import { PersonalSummaryCard } from "@/components/personal-summary-card";
import { AnnouncementBannerCarousel } from "@/components/AnnouncementBannerCarousel";
import { EmployeeOfMonthWidget } from "@/components/employee-of-month-widget";
import { DailyTaskPanel } from "@/components/daily-task-panel";
import { RecentActivities } from "@/components/recent-activities";
import { BranchScorecard } from "@/components/branch-scorecard";
import { PersonnelStatusPanel } from "@/components/personnel-status-panel";
import { CriticalAlerts } from "@/components/critical-alerts";
import { MEGA_MODULE_ORDER } from "@/lib/megaModuleConfig";
import { HeroSection } from "@/components/ui/hero-section";
import { UnifiedHero } from "@/components/widgets/unified-hero";
import { CompactStatsBar } from "@/components/widgets/compact-stats-bar";
import { QuickActionsGrid } from "@/components/widgets/quick-actions-grid";
import { ActivityTimeline } from "@/components/widgets/activity-timeline";
import { ModuleCardsGrid } from "@/components/widgets/module-cards-grid";
import { AISummaryCard } from "@/components/widgets/ai-summary-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Calculator,
  Megaphone,
  UserCheck,
  MapPin,
  Database,
  Clock,
  Timer,
  TrendingDown,
  Sparkles,
  LayoutDashboard,
  Factory,
  Grid,
  Home,
  QrCode,
  Bell,
  Headphones,
  Tablet,
  ChevronRight,
  CheckCircle,
  ListChecks,
  ListTodo,
  ShoppingCart,
  Package,
  Truck,
  ClipboardCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  // Fetch dashboard modules from authoritative server endpoint (synced with yetkilendirme)
  const { data: dashboardModulesData, isLoading: dashboardLoading } = useQuery<any>({
    queryKey: ["/api/dashboard-modules"],
    enabled: !!user,
    staleTime: 10000, // Shorter cache for faster sync with permission changes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Fetch banner carousel enabled setting from public endpoint
  const { data: publicSettings = [] } = useQuery<any[]>({
    queryKey: ["/api/public/settings"],
  });
  
  const bannerCarouselEnabled = publicSettings.find(
    (s: any) => s.key === "banner_carousel_enabled"
  )?.value !== "false";
  
  // Use server-authoritative mega-modules data (synced with yetkilendirme)
  // This replaces client-side computation for accurate permission sync
  const serverMegaModules = dashboardModulesData?.megaModules || [];
  
  // Transform server data to match component's expected format
  const megaModules = serverMegaModules.map((mm: any) => ({
    id: mm.id,
    title: mm.title,
    icon: mm.icon,
    color: mm.color,
    items: (mm.items || []).map((item: any) => ({
      id: item.path,
      label: item.title,
      path: item.path,
      description: item.title,
      moduleKey: item.path,
    })),
    isEmpty: (mm.itemCount || 0) === 0,
  }));

  // Flatten items for backward compatibility
  const menuModules = serverMegaModules.flatMap((mm: any) => 
    (mm.items || []).map((item: any) => ({
      id: item.path,
      label: item.title,
      path: item.path,
      description: item.title,
    }))
  );

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

  // Fetch current user's shifts for today
  const { data: myShifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts/my"],
    enabled: !!user,
  });

  // Today's date for filtering
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Filter shifts for today
  const todayShifts = myShifts.filter((shift: any) => {
    if (!shift.shiftDate) return false;
    const shiftDateStr = new Date(shift.shiftDate).toISOString().split('T')[0];
    return shiftDateStr === todayStr;
  });

  // Fetch user's assigned checklists
  const { data: myChecklists = [] } = useQuery<any[]>({
    queryKey: ["/api/checklists/my-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/checklists/my-assignments");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch user's assigned tasks
  const { data: myAssignedTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/my");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch pending checks for current user (checker role)
  const { data: pendingChecks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/pending-checks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/pending-checks");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });
  const pendingChecksCount = pendingChecks.length;

  // Factory roles check - explicit list
  const FACTORY_ROLES = ['fabrika', 'fabrika_mudur', 'fabrika_kalite', 'fabrika_personel'];
  const isFactoryWorker = Boolean(user?.role && FACTORY_ROLES.includes(user.role));

  // Fetch shift compliance warnings for factory workers
  const { data: complianceWarnings } = useQuery<any>({
    queryKey: ['/api/factory', 'shift-compliance', 'my-warnings'],
    queryFn: async () => {
      const res = await fetch('/api/factory/shift-compliance/my-warnings');
      if (!res.ok) return { warnings: [], complianceScore: 100 };
      return res.json();
    },
    enabled: !!user && isFactoryWorker,
  });

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
      id: "pending-checks", 
      icon: UserCheck, 
      label: "Bekleyen Kontroller", 
      path: "/gorevler?status=kontrol_bekliyor",
      color: "bg-amber-500",
      badge: pendingChecksCount,
      description: "Kontrol bekleyen görevler",
      roles: ["supervisor", "supervisor_buddy"]
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
    { 
      id: "live-tracking", 
      icon: MapPin, 
      label: "Canlı Takip", 
      path: "/canli-takip",
      color: "bg-emerald-500",
      description: "Personel konum takibi",
      roles: ["supervisor", "manager"]
    },
  ];

  const hqModules: ModuleCard[] = [
    { 
      id: "announcements", 
      icon: Megaphone, 
      label: "Duyurular", 
      path: "/admin/duyurular",
      color: "bg-red-500",
      description: "Duyuru yönetimi"
    },
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
      id: "live-tracking-hq", 
      icon: MapPin, 
      label: "Canlı Takip", 
      path: "/canli-takip",
      color: "bg-emerald-500",
      description: "Personel konum takibi"
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
    { 
      id: "bulk-data", 
      icon: Database, 
      label: "Toplu Veri Yönetimi", 
      path: "/admin/toplu-veri-yonetimi",
      color: "bg-indigo-600",
      description: "Excel ile veri aktarımı"
    },
    { 
      id: "crm", 
      icon: Headphones, 
      label: "CRM", 
      path: "/crm",
      color: "bg-rose-500",
      description: "Franchise Destek Merkezi"
    },
  ];

  // Eğer API'den modüller gelmişse onları kullan, yoksa statik fallback
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
      "satinalma": ShoppingCart,
      "satinalma-dashboard": ShoppingCart,
      "stok-yonetimi": Package,
      "inventory": Package,
      "tedarikci-yonetimi": Truck,
      "suppliers": Truck,
      "siparis-yonetimi": ShoppingCart,
      "purchase-orders": ShoppingCart,
      "mal-kabul": ClipboardCheck,
      "goods-receipt": ClipboardCheck,
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
            "role-permissions": Shield,
      "ai-asistan": Bot,
      "ai-assistant": Bot,
      "ai-main": Bot,
      "kalite-denetimi": Star,
      "quality": Star,
      "quality-main": Star,
      "kullanicilar": Users,
      "users": Users,
      "users-main": Users,
      "dashboard": Building2,
      "dashboard-main": Building2,
      "branch-dashboard": Building2,
      "branches": Building2,
      "branches-list": Building2,
      "qr-scan": Coffee,
      "tasks-list": ClipboardList,
      "training-academy": GraduationCap,
      "knowledge-base": BookOpen,
      "performance-dashboard": BarChart3,
      "quality-control": Star,
      "ai-chat": Bot,
      "project-list": FolderKanban,
      "notifications": MessageSquare,
      "messages": MessageSquare,
      "hq-support": MessageSquare,
      "announcements": Megaphone,
      "duyurular": Megaphone,
      "bulk-data": Database,
      "toplu-veri": Database,
      "toplu-veri-yonetimi": Database,
      "crm": Headphones,
      "crm-dashboard": Headphones,
    };
    return iconMap[moduleId.toLowerCase()] || Coffee;
  };

  const getColor = (moduleId: string | undefined | null) => {
    if (!moduleId) return "bg-slate-400";
    const colorMap: Record<string, string> = {
      "akademi": "bg-blue-500",
      "akademi-hq": "bg-blue-500",
      "academy": "bg-blue-500",
      "academy-main": "bg-blue-500",
      "tasklar": "bg-green-500",
      "tasks": "bg-green-500",
      "tasks-main": "bg-green-500",
      "ariza": "bg-orange-500",
      "arızalar": "bg-orange-500",
      "faults": "bg-orange-500",
      "faults-main": "bg-orange-500",
      "vardiya": "bg-purple-500",
      "shifts": "bg-purple-500",
      "shifts-main": "bg-purple-500",
      "checklistler": "bg-teal-500",
      "checklists": "bg-teal-500",
      "checklists-main": "bg-teal-500",
      "kayip-esya": "bg-yellow-600",
      "lost-found": "bg-yellow-600",
      "lost-found-hq": "bg-yellow-600",
      "ekipman": "bg-amber-600",
      "equipment": "bg-amber-600",
      "equipment-main": "bg-amber-600",
      "destek": "bg-blue-500",
      "support": "bg-rose-500",
      "support-main": "bg-rose-500",
      "ik": "bg-pink-500",
      "hr": "bg-pink-500",
      "hr-main": "bg-pink-500",
      "muhasebe": "bg-emerald-600",
      "accounting": "bg-emerald-600",
      "accounting-main": "bg-emerald-600",
      "raporlar": "bg-cyan-500",
      "reports": "bg-cyan-500",
      "reports-main": "bg-cyan-500",
      "bilgi-bankasi": "bg-emerald-500",
      "knowledge": "bg-emerald-500",
      "knowledge-main": "bg-emerald-500",
      "performans": "bg-cyan-500",
      "performance": "bg-cyan-500",
      "performance-main": "bg-cyan-500",
      "projeler": "bg-violet-600",
      "projects": "bg-violet-600",
      "projects-main": "bg-violet-600",
      "ayarlar": "bg-slate-600",
      "settings": "bg-slate-600",
      "settings-main": "bg-slate-600",
      "admin": "bg-red-600",
      "admin-main": "bg-red-600",
      "yetkilendirme": "bg-red-600",
      "authorization": "bg-red-600",
            "role-permissions": "bg-red-600",
      "ai-asistan": "bg-violet-500",
      "ai-assistant": "bg-violet-500",
      "ai-main": "bg-violet-500",
      "kalite-denetimi": "bg-amber-500",
      "quality": "bg-amber-500",
      "quality-main": "bg-amber-500",
      "kullanicilar": "bg-sky-500",
      "users": "bg-sky-500",
      "users-main": "bg-sky-500",
      "dashboard": "bg-indigo-500",
      "dashboard-main": "bg-indigo-500",
      "branch-dashboard": "bg-indigo-500",
      "branches": "bg-indigo-500",
      "branches-list": "bg-indigo-500",
      "qr-scan": "bg-gray-500",
      "tasks-list": "bg-green-500",
      "training-academy": "bg-blue-500",
      "knowledge-base": "bg-emerald-500",
      "performance-dashboard": "bg-cyan-500",
      "quality-control": "bg-amber-500",
      "ai-chat": "bg-violet-500",
      "project-list": "bg-violet-600",
      "notifications": "bg-rose-500",
      "messages": "bg-blue-400",
      "hq-support": "bg-rose-500",
      "announcements": "bg-red-500",
      "duyurular": "bg-red-500",
      "bulk-data": "bg-indigo-600",
      "toplu-veri": "bg-indigo-600",
      "toplu-veri-yonetimi": "bg-indigo-600",
      "crm": "bg-rose-500",
      "crm-dashboard": "bg-rose-500",
    };
    return colorMap[moduleId.toLowerCase()] || "bg-slate-400";
  };

  // Badge mapping for dynamic modules
  const getBadge = (moduleId: string | undefined | null): number | undefined => {
    if (!moduleId) return undefined;
    const id = moduleId.toLowerCase();
    if (id.includes('task') || id.includes('gorev')) return pendingTasks > 0 ? pendingTasks : undefined;
    if (id.includes('fault') || id.includes('ariza')) return openFaults > 0 ? openFaults : undefined;
    return undefined;
  };

  // Helper to normalize module key from id, label, or path
  const normalizeModuleKey = (m: any): string => {
    if (m.id) return m.id;
    if (m.label) return m.label.toLowerCase().replace(/\s+/g, '-');
    if (m.path) return m.path.replace(/^\//, '').replace(/\//g, '-');
    return 'unknown-module';
  };

  // Get section icon from icon name string
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
      "ShoppingCart": ShoppingCart,
      "Package": Package,
      "Truck": Truck,
      "ClipboardCheck": ClipboardCheck,
      "Briefcase": Briefcase,
      "ClipboardList": ClipboardList,
    };
    return sectionIconMap[iconName] || Coffee;
  };

  // Get section color based on section ID
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

  // Get aggregate badge count for a section's items
  const getSectionBadge = (items: any[]): number => {
    let total = 0;
    for (const item of items) {
      const key = normalizeModuleKey(item);
      const badge = getBadge(key);
      if (badge) total += badge;
    }
    return total;
  };

  const baseModules = menuModules && menuModules.length > 0 
    ? menuModules
        .filter((m: any) => m.path !== '/' && m.path !== '/sube/dashboard')
        .map((m: any) => {
          const moduleKey = normalizeModuleKey(m);
          return {
            id: moduleKey,
            icon: getIcon(moduleKey),
            label: m.label,
            path: m.path,
            color: getColor(moduleKey),
            description: m.description,
            badge: getBadge(moduleKey),
          };
        })
    : (isHQ ? hqModules : branchModules);

  // Admin kullanıcıları için Admin Panel kartını her zaman ekle
  const adminModule = {
    id: "admin",
    icon: Shield,
    label: "Admin Panel",
    path: "/admin",
    color: "bg-red-600",
    description: "Sistem yönetimi",
  };

  const modules = user?.role === 'admin' && !baseModules.some((m: any) => m.id === 'admin' || m.path === '/admin')
    ? [...baseModules, adminModule]
    : baseModules;

  const userRole = user?.role;
  const isCEO = userRole === 'ceo';
  const isAdmin = userRole === 'admin';

  if (isCEO) {
    return (
      <div className="p-3 pb-24 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-[hsl(var(--dospresso-navy))] via-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue)/0.8)] p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hoş geldiniz, {user?.firstName || user?.username}</h1>
              <p className="text-sm text-white/70">CEO Dashboard</p>
            </div>
          </div>
          <p className="text-sm text-white/80 mb-4">
            DOSPRESSO franchise ağınızı AI Control Tower üzerinden yönetebilirsiniz.
          </p>
          <Button
            variant="secondary"
            className="w-full bg-white/20 text-white border-0"
            onClick={() => setLocation("/ceo-command-center")}
            data-testid="ceo-ai-control-tower-btn"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            AI Control Tower'a Git
          </Button>
        </motion.div>

        <AISummaryCard />

        {bannerCarouselEnabled && <AnnouncementBannerCarousel />}
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 space-y-3">
      {/* Unified Hero: Greeting + Progress Ring - For operational roles */}
      {canSeeWidget(userRole, 'unified-hero') && <UnifiedHero />}

      {/* Compact Stats Bar - Role filtered internally */}
      {canSeeWidget(userRole, 'compact-stats') && <CompactStatsBar />}


      {/* Critical Alerts - Top priority notifications */}
      {canSeeWidget(userRole, 'critical-alerts') && <CriticalAlerts />}

      {/* Quick Actions - Role filtered internally */}
      {canSeeWidget(userRole, 'quick-actions') && <QuickActionsGrid />}

      {/* Daily Task Panel - Available for all roles */}
      <DailyTaskPanel />

      {/* Module Cards Grid - Role filtered internally */}
      {canSeeWidget(userRole, 'module-cards') && <ModuleCardsGrid />}


      {/* Announcement Banners - Only show if enabled */}
      {bannerCarouselEnabled && <AnnouncementBannerCarousel />}

      {/* Branch Scorecard and Personnel Status - For supervisors */}
      {canSeeWidget(userRole, 'branch-scorecard') && isBranch && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BranchScorecard />
          {canSeeWidget(userRole, 'personnel-status') && <PersonnelStatusPanel />}
        </div>
      )}

      {/* Shift Status - Branch users only */}
      {isBranch && <ShiftStatusCard />}

      {/* Shift Checklists - Branch users only */}
      {isBranch && <ShiftChecklistCard />}

      {/* Personal Summary Card - Non-supervisor branch roles (barista, etc.) */}
      {isBranch && user?.role !== "supervisor" && user?.role !== "supervisor_buddy" && <PersonalSummaryCard />}


      {/* Employee of Month Widget */}
      <EmployeeOfMonthWidget />

      {/* Today's Shift Card - Show assigned shifts for today */}
      {todayShifts.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Bugünkü Vardiyam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayShifts.map((shift: any) => (
              <div 
                key={shift.id} 
                className="flex items-center justify-between text-sm p-3 bg-background/80 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    shift.shiftType === 'sabah' ? 'bg-amber-500' : 
                    shift.shiftType === 'aksam' ? 'bg-indigo-500' : 
                    shift.shiftType === 'gece' ? 'bg-slate-700' : 'bg-green-500'
                  }`} />
                  <span className="font-medium capitalize">{shift.shiftType || 'Tam Gün'}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    {shift.startTime?.slice(0,5) || '09:00'} - {shift.endTime?.slice(0,5) || '18:00'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shift.branchName || 'Şube'}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      {/* Factory Shift Compliance Warnings */}
      {isFactoryWorker && complianceWarnings?.warnings && complianceWarnings.warnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Vardiya Uyumluluk Uyarıları
              <Badge variant="outline" className="ml-auto bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs">
                Skor: {complianceWarnings.complianceScore || 100}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {complianceWarnings.warnings.map((warning: any, idx: number) => (
              <div 
                key={idx} 
                className={`p-2 rounded-lg border text-xs ${
                  warning.severity === 'high' 
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
                    : warning.severity === 'medium'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {warning.type === 'late' && <Timer className="h-3 w-3 text-red-500" />}
                  {warning.type === 'early_leave' && <TrendingDown className="h-3 w-3 text-orange-500" />}
                  {warning.type === 'break_overage' && <Coffee className="h-3 w-3 text-amber-500" />}
                  {warning.type === 'weekly_missing' && <Clock className="h-3 w-3 text-blue-500" />}
                  <span className="font-medium">{warning.title}</span>
                  <Badge 
                    variant={warning.severity === 'high' ? 'destructive' : 'outline'} 
                    className="ml-auto text-[10px] px-1.5 py-0"
                  >
                    {warning.minutes} dk
                  </Badge>
                </div>
                <p className="text-muted-foreground">{warning.message}</p>
                {warning.aiSuggestion && (
                  <div className="mt-2 p-2 bg-background/50 rounded border border-primary/20">
                    <div className="flex items-center gap-1 text-primary mb-1">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium text-[10px]">AI Öneri</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{warning.aiSuggestion}</p>
                  </div>
                )}
              </div>
            ))}
            {complianceWarnings.weeklySummary && (
              <div className="mt-2 p-2 bg-background/50 rounded border">
                <p className="text-xs text-muted-foreground">
                  Bu hafta: {Math.floor((complianceWarnings.weeklySummary.actualTotalMinutes || 0) / 60)} saat 
                  / 45 saat hedef
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <div 
                key={eq.id} 
                className="flex items-center justify-between text-xs p-2 bg-background/50 rounded border border-destructive/20 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/ekipman?id=${eq.id}`)}
                data-testid={`equipment-critical-${eq.id}`}
              >
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


      {/* Enhanced Analytics Card - For supervisors and HQ */}
      {((isBranch && (user?.role === 'supervisor' || user?.role === 'supervisor_buddy')) || isHQ) && (
        <EnhancedAnalyticsCard />
      )}

      {/* Recent Activities Panel - For supervisors and HQ */}
      {(isHQ || (isBranch && (user?.role === 'supervisor' || user?.role === 'supervisor_buddy'))) && (
        <RecentActivities compact />
      )}
    </div>
  );
}
