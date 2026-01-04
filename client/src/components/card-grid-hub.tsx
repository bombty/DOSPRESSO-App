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
import { AnnouncementBannerCarousel } from "@/components/AnnouncementBannerCarousel";
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
  ChevronRight
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

  // Fetch menu items from API (dynamic permissions)
  const { data: menuResponse } = useQuery<any>({
    queryKey: ["/api/me/menu"],
    enabled: !!user,
  });
  
  // Keep sections grouped (13 categories from menu blueprint)
  // Don't filter out empty sections - keep metadata for mega-module grouping
  const menuSections = (menuResponse?.sections || [])
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

  // 8 Mega-module definitions - comprehensive mapping of ALL known section IDs
  const MEGA_MODULE_MAPPING: Record<string, string[]> = {
    "operations": [
      "tasks", "tasks-hq", "tasks-branch", "tasks-section", "operations", "operations-hq", "operations-branch",
      "checklists", "checklists-hq", "checklists-branch", "checklists-section",
      "dashboard-branch", "dashboard-hq", "dashboard"
    ],
    "equipment": [
      "equipment", "equipment-hq", "equipment-branch", "equipment-section",
      "faults", "faults-hq", "faults-branch", "faults-section",
      "maintenance", "maintenance-hq", "maintenance-section"
    ],
    "hr": [
      "hr", "hr-hq", "hr-branch", "hr-section", "personel", "personel-section",
      "shifts", "shifts-hq", "shifts-branch", "shifts-section", "vardiya", "vardiyalar",
      "attendance", "attendance-section", "payroll", "payroll-section"
    ],
    "training": [
      "training", "training-hq", "training-branch", "training-section",
      "academy", "academy-hq", "academy-branch", "academy-section", "akademi",
      "education", "education-section"
    ],
    "kitchen": [
      "kitchen", "kitchen-hq", "kitchen-branch", "kitchen-section",
      "recipes", "recipes-hq", "recipes-branch", "recipes-section", "tarifler",
      "menu", "menu-section"
    ],
    "reports": [
      "reports", "reports-hq", "reports-branch", "reports-section", "raporlar",
      "analytics", "analytics-hq", "analytics-section",
      "quality", "quality-hq", "quality-branch", "quality-section", "kalite"
    ],
    "newshop": [
      "projects", "projects-hq", "projects-section", "projeler",
      "newshop", "newshop-section", "new-shop", "new-shop-opening"
    ],
    "admin": [
      "admin", "admin-hq", "admin-section", "yonetim",
      "settings", "settings-hq", "settings-section", "ayarlar",
      "support", "support-hq", "support-section", "destek",
      "system", "system-section"
    ],
  };

  const MEGA_MODULE_CONFIG = [
    { id: "operations", title: "Operasyonlar", icon: "ClipboardList", color: "bg-green-500" },
    { id: "equipment", title: "Ekipman & Bakım", icon: "Wrench", color: "bg-orange-500" },
    { id: "hr", title: "Personel & İK", icon: "Users", color: "bg-pink-500" },
    { id: "training", title: "Eğitim & Akademi", icon: "GraduationCap", color: "bg-blue-500" },
    { id: "kitchen", title: "Mutfak & Reçeteler", icon: "Coffee", color: "bg-amber-600" },
    { id: "reports", title: "Raporlar & Analitik", icon: "BarChart3", color: "bg-cyan-500" },
    { id: "newshop", title: "Yeni Mağaza Açılışı", icon: "FolderKanban", color: "bg-violet-600" },
    { id: "admin", title: "Yönetim & Ayarlar", icon: "Shield", color: "bg-slate-600" },
  ];

  // Helper: check if a section ID matches any of the mapped IDs
  const matchesMegaModule = (sectionId: string, mappedIds: string[]): boolean => {
    const normalizedId = sectionId.toLowerCase().trim();
    return mappedIds.some((mapped) => {
      const normalizedMapped = mapped.toLowerCase().trim();
      // Exact match or prefix/suffix match
      return normalizedId === normalizedMapped || 
             normalizedId.startsWith(normalizedMapped + "-") ||
             normalizedId.endsWith("-" + normalizedMapped) ||
             normalizedId.includes(normalizedMapped);
    });
  };

  // Group menu sections into 8 mega-modules (always show all 8)
  const megaModules = MEGA_MODULE_CONFIG.map((megaConfig) => {
    const mappedSectionIds = MEGA_MODULE_MAPPING[megaConfig.id] || [];
    
    // Find matching sections from menu API
    const matchedSections = menuSections.filter((s: any) => 
      matchesMegaModule(s.id, mappedSectionIds)
    );
    
    // Collect all items from matched sections
    const allItems = matchedSections.flatMap((s: any) => s.items || []);
    
    // Deduplicate items by path
    const uniqueItems = allItems.filter((item: any, index: number, self: any[]) =>
      index === self.findIndex((t) => t.path === item.path)
    );
    
    return {
      id: megaConfig.id,
      title: megaConfig.title,
      icon: megaConfig.icon,
      color: megaConfig.color,
      items: uniqueItems,
      isEmpty: uniqueItems.length === 0,
    };
  }); // Don't filter - always show all 8 mega-modules

  // Also keep flattened for backward compatibility
  const menuModules = menuResponse?.sections?.flatMap((section: any) => 
    section.items?.map((item: any) => ({
      id: item.id,
      label: item.titleTr,
      path: item.path,
      description: item.description || section.titleTr,
    })) || []
  ) || [];

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
  const isFactoryWorker = user?.role && FACTORY_ROLES.includes(user.role);

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
      "rol-yetkileri": Shield,
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
      "rol-yetkileri": "bg-red-600",
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

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Announcement Banners */}
      <AnnouncementBannerCarousel />

      {/* Shift Status - Branch users only */}
      {isBranch && <ShiftStatusCard />}

      {/* Shift Checklists - Branch users only */}
      {isBranch && <ShiftChecklistCard />}

      {/* Analytics Card - Branch supervisors + HQ roles */}
      {(isBranch && (user?.role === 'supervisor' || user?.role === 'supervisor_buddy')) && <EnhancedAnalyticsCard />}
      {isHQ && <EnhancedAnalyticsCard />}

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

      {/* Quick Actions */}
      <div className="flex gap-2">
        <QuickTaskModal trigger={
          <Button size="sm" variant="outline" className="flex-1" data-testid="button-quick-task-dashboard">
            <Plus className="h-4 w-4 mr-1" />
            Hızlı Görev
          </Button>
        } />
      </div>

      {/* Mega Module Cards - 8 grouped categories with direct navigation */}
      {megaModules && megaModules.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {megaModules.map((megaModule: any) => {
            const MegaIcon = getSectionIcon(megaModule.icon);
            const moduleBadge = getSectionBadge(megaModule.items);
            const isEmpty = megaModule.isEmpty;
            
            // Navigate to mega-module page (even if empty)
            const megaModulePath = `/modul/${megaModule.id}`;
            
            return (
              <button
                key={megaModule.id}
                onClick={() => setLocation(megaModulePath)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all active:scale-[0.98] min-h-[100px] ${
                  isEmpty 
                    ? "bg-muted/50 border-border/50 opacity-60" 
                    : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                }`}
                data-testid={`mega-module-${megaModule.id}`}
              >
                {moduleBadge > 0 && (
                  <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {moduleBadge > 99 ? "99+" : moduleBadge}
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl ${isEmpty ? "bg-muted" : megaModule.color} flex items-center justify-center mb-2`}>
                  <MegaIcon className={`w-6 h-6 ${isEmpty ? "text-muted-foreground" : "text-white"}`} />
                </div>
                <span className={`text-sm font-medium text-center leading-tight ${isEmpty ? "text-muted-foreground" : ""}`}>{megaModule.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {isEmpty ? "Erişim yok" : `${megaModule.items.length} modül`}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Fallback flat grid for backward compatibility */
        <div className="grid grid-cols-3 gap-2">
          {modules.map((module: any) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setLocation(module.path)}
                className="relative flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.98] min-h-[80px]"
                data-testid={`module-card-${module.id}`}
              >
                {module.badge && module.badge > 0 && (
                  <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {module.badge > 99 ? "99+" : module.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center mb-1`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{module.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Stats - Optional */}
      {(pendingTasks > 0 || openFaults > 0) && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Hızlı Bakış</p>
          <div className="flex gap-4 text-sm">
            {pendingTasks > 0 && (
              <div 
                className="flex items-center gap-1.5 hover-elevate cursor-pointer px-2 py-1 rounded"
                onClick={() => setLocation("/gorevler")}
                data-testid="link-pending-tasks"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>{pendingTasks} bekleyen görev</span>
              </div>
            )}
            {openFaults > 0 && (
              <div 
                className="flex items-center gap-1.5 hover-elevate cursor-pointer px-2 py-1 rounded"
                onClick={() => setLocation("/ariza")}
                data-testid="link-open-faults"
              >
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
