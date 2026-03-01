import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { getQuickActionsForRole } from "@/lib/role-visibility";
import {
  Plus,
  ClipboardList,
  GraduationCap,
  Calendar,
  FileText,
  CalendarDays,
  Package,
  Users,
  Megaphone,
  Factory,
  Settings,
  Wrench,
  Building2,
  ShieldCheck,
  Bot,
  Briefcase,
  ShoppingCart,
  Store,
  BarChart3,
  Search as SearchIcon,
  MessageSquare
} from "lucide-react";

interface QuickAction {
  id: string;
  labelKey: string;
  defaultLabelTR: string;
  defaultLabelEN: string;
  icon: any;
  path: string;
  color: string;
  bgColor: string;
}

const allActions: QuickAction[] = [
  { 
    id: "new-task", 
    labelKey: "nav.newTask",
    defaultLabelTR: "Yeni Görev",
    defaultLabelEN: "New Task",
    icon: Plus, 
    path: "/gorevler?new=true",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40"
  },
  { 
    id: "checklist", 
    labelKey: "nav.checklists",
    defaultLabelTR: "Kontrol Listesi",
    defaultLabelEN: "Checklist",
    icon: ClipboardList, 
    path: "/checklistler",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  { 
    id: "academy", 
    labelKey: "nav.academy",
    defaultLabelTR: "Eğitimler",
    defaultLabelEN: "Training",
    icon: GraduationCap, 
    path: "/akademi",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40"
  },
  { 
    id: "shifts", 
    labelKey: "nav.shifts",
    defaultLabelTR: "Vardiyalar",
    defaultLabelEN: "Shifts",
    icon: Calendar, 
    path: "/vardiyalar",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40"
  },
  { 
    id: "leaves", 
    labelKey: "nav.leaves",
    defaultLabelTR: "İzin Talebi",
    defaultLabelEN: "Leave Request",
    icon: CalendarDays, 
    path: "/izin-talepleri",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40"
  },
  { 
    id: "reports", 
    labelKey: "nav.reports",
    defaultLabelTR: "Raporlar",
    defaultLabelEN: "Reports",
    icon: FileText, 
    path: "/raporlar",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40"
  },
  { 
    id: "personnel", 
    labelKey: "nav.hr",
    defaultLabelTR: "Personel",
    defaultLabelEN: "Personnel",
    icon: Users, 
    path: "/ik",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/40"
  },
  { 
    id: "stock", 
    labelKey: "nav.stock",
    defaultLabelTR: "Stok",
    defaultLabelEN: "Stock",
    icon: Package, 
    path: "/satinalma",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40"
  },
  { 
    id: "production", 
    labelKey: "nav.factory",
    defaultLabelTR: "Üretim",
    defaultLabelEN: "Production",
    icon: Factory, 
    path: "/fabrika",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
  { 
    id: "announcements", 
    labelKey: "nav.announcements",
    defaultLabelTR: "Duyurular",
    defaultLabelEN: "Announcements",
    icon: Megaphone, 
    path: "/admin/icerik-yonetimi",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40"
  },
  { 
    id: "settings", 
    labelKey: "nav.settings",
    defaultLabelTR: "Ayarlar",
    defaultLabelEN: "Settings",
    icon: Settings, 
    path: "/admin",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/40"
  },
  { 
    id: "users", 
    labelKey: "nav.users",
    defaultLabelTR: "Kullanıcılar",
    defaultLabelEN: "Users",
    icon: Users, 
    path: "/admin/kullanicilar",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/40"
  },
  { 
    id: "system", 
    labelKey: "nav.system",
    defaultLabelTR: "Sistem",
    defaultLabelEN: "System",
    icon: ShieldCheck, 
    path: "/admin/ayarlar",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40"
  },
  { 
    id: "faults", 
    labelKey: "nav.faults",
    defaultLabelTR: "Arızalar",
    defaultLabelEN: "Faults",
    icon: Wrench, 
    path: "/ekipman/ariza",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
  { 
    id: "equipment", 
    labelKey: "nav.equipment",
    defaultLabelTR: "Ekipman",
    defaultLabelEN: "Equipment",
    icon: Wrench, 
    path: "/ekipman",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40"
  },
  { 
    id: "maintenance", 
    labelKey: "nav.maintenance",
    defaultLabelTR: "Bakım",
    defaultLabelEN: "Maintenance",
    icon: Wrench, 
    path: "/ekipman",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40"
  },
  { 
    id: "orders", 
    labelKey: "nav.orders",
    defaultLabelTR: "Siparişler",
    defaultLabelEN: "Orders",
    icon: ShoppingCart, 
    path: "/satinalma",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40"
  },
  { 
    id: "suppliers", 
    labelKey: "nav.suppliers",
    defaultLabelTR: "Tedarikçiler",
    defaultLabelEN: "Suppliers",
    icon: Store, 
    path: "/satinalma",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40"
  },
  { 
    id: "campaigns", 
    labelKey: "nav.campaigns",
    defaultLabelTR: "Kampanyalar",
    defaultLabelEN: "Campaigns",
    icon: Megaphone, 
    path: "/admin",
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/40"
  },
  { 
    id: "courses", 
    labelKey: "nav.courses",
    defaultLabelTR: "Kurslar",
    defaultLabelEN: "Courses",
    icon: GraduationCap, 
    path: "/akademi",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40"
  },
  { 
    id: "branches", 
    labelKey: "nav.branches",
    defaultLabelTR: "Şubeler",
    defaultLabelEN: "Branches",
    icon: Building2, 
    path: "/operasyon",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/40"
  },
  { 
    id: "tasks", 
    labelKey: "nav.tasks",
    defaultLabelTR: "Görevler",
    defaultLabelEN: "Tasks",
    icon: ClipboardList, 
    path: "/gorevler",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40"
  },
  { 
    id: "ai-dashboard", 
    labelKey: "nav.aiAssistant",
    defaultLabelTR: "AI Panel",
    defaultLabelEN: "AI Panel",
    icon: Bot, 
    path: "/raporlar/ai-asistan",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40"
  },
  { 
    id: "support", 
    labelKey: "nav.support",
    defaultLabelTR: "Destek",
    defaultLabelEN: "Support",
    icon: Briefcase, 
    path: "/destek",
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-100 dark:bg-lime-900/40"
  },
  { 
    id: "quality", 
    labelKey: "nav.quality",
    defaultLabelTR: "Kalite",
    defaultLabelEN: "Quality",
    icon: ShieldCheck, 
    path: "/fabrika",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  { 
    id: "audits", 
    labelKey: "nav.audits",
    defaultLabelTR: "Denetim",
    defaultLabelEN: "Audits",
    icon: ClipboardList, 
    path: "/raporlar/denetimler",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40"
  },
  { 
    id: "invoices", 
    labelKey: "nav.invoices",
    defaultLabelTR: "Faturalar",
    defaultLabelEN: "Invoices",
    icon: FileText, 
    path: "/raporlar",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40"
  },
  { 
    id: "attendance", 
    labelKey: "nav.attendance",
    defaultLabelTR: "Devam",
    defaultLabelEN: "Attendance",
    icon: Users, 
    path: "/ik",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40"
  },
  { 
    id: "lost-found", 
    labelKey: "nav.lostFound",
    defaultLabelTR: "Kayıp Eşya",
    defaultLabelEN: "Lost & Found",
    icon: SearchIcon, 
    path: "/kayip-esya",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
  { 
    id: "guest-feedback", 
    labelKey: "nav.guestFeedback",
    defaultLabelTR: "Misafir Geri Bildirim",
    defaultLabelEN: "Guest Feedback",
    icon: MessageSquare, 
    path: "/misafir-memnuniyeti",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40"
  }
];

export function QuickActionsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation("common");
  const userRole = user?.role;

  const allowedActionIds = getQuickActionsForRole(userRole);
  
  const filteredActions = allActions.filter(action => {
    if (!userRole) return false;
    return allowedActionIds.includes(action.id);
  });

  if (filteredActions.length === 0) {
    return null;
  }

  const displayActions = filteredActions.slice(0, 6);

  const resolveLabel = (action: QuickAction) => {
    return t(action.labelKey, { defaultValue: i18n.language === "en" ? action.defaultLabelEN : action.defaultLabelTR });
  };

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {t("quickActions", { defaultValue: "Hızlı İşlemler" })}
      </h3>
      
      <div className="grid grid-cols-3 gap-1.5">
        {displayActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(action.path)}
              className="flex items-center gap-2 p-2 rounded-lg hover-elevate border bg-card/50"
              data-testid={`quick-action-${action.id}`}
            >
              <div className={`w-7 h-7 rounded-lg ${action.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${action.color}`} />
              </div>
              <span className="text-[10px] font-medium text-foreground truncate">
                {resolveLabel(action)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
