import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  BarChart3
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  path: string;
  color: string;
  bgColor: string;
}

const allActions: QuickAction[] = [
  { 
    id: "new-task", 
    label: "Yeni Görev", 
    icon: Plus, 
    path: "/gorevler?new=true",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40"
  },
  { 
    id: "checklist", 
    label: "Kontrol Listesi", 
    icon: ClipboardList, 
    path: "/checklistler",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  { 
    id: "academy", 
    label: "Eğitimler", 
    icon: GraduationCap, 
    path: "/akademi",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40"
  },
  { 
    id: "shifts", 
    label: "Vardiyalar", 
    icon: Calendar, 
    path: "/vardiyalar",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40"
  },
  { 
    id: "leaves", 
    label: "İzin Talebi", 
    icon: CalendarDays, 
    path: "/izin-talepleri",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40"
  },
  { 
    id: "reports", 
    label: "Raporlar", 
    icon: FileText, 
    path: "/raporlar",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40"
  },
  { 
    id: "personnel", 
    label: "Personel", 
    icon: Users, 
    path: "/ik",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/40"
  },
  { 
    id: "stock", 
    label: "Stok", 
    icon: Package, 
    path: "/satinalma",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40"
  },
  { 
    id: "production", 
    label: "Üretim", 
    icon: Factory, 
    path: "/fabrika",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
  { 
    id: "announcements", 
    label: "Duyurular", 
    icon: Megaphone, 
    path: "/admin/icerik-yonetimi",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40"
  },
  { 
    id: "settings", 
    label: "Ayarlar", 
    icon: Settings, 
    path: "/admin",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/40"
  },
  { 
    id: "users", 
    label: "Kullanıcılar", 
    icon: Users, 
    path: "/admin/kullanicilar",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/40"
  },
  { 
    id: "system", 
    label: "Sistem", 
    icon: ShieldCheck, 
    path: "/admin/ayarlar",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40"
  },
  { 
    id: "faults", 
    label: "Arızalar", 
    icon: Wrench, 
    path: "/ekipman/ariza",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
  },
  { 
    id: "equipment", 
    label: "Ekipman", 
    icon: Wrench, 
    path: "/ekipman",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40"
  },
  { 
    id: "maintenance", 
    label: "Bakım", 
    icon: Wrench, 
    path: "/ekipman",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40"
  },
  { 
    id: "orders", 
    label: "Siparişler", 
    icon: ShoppingCart, 
    path: "/satinalma",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40"
  },
  { 
    id: "suppliers", 
    label: "Tedarikçiler", 
    icon: Store, 
    path: "/satinalma",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40"
  },
  { 
    id: "campaigns", 
    label: "Kampanyalar", 
    icon: Megaphone, 
    path: "/admin",
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/40"
  },
  { 
    id: "courses", 
    label: "Kurslar", 
    icon: GraduationCap, 
    path: "/akademi",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40"
  },
  { 
    id: "branches", 
    label: "Şubeler", 
    icon: Building2, 
    path: "/operasyon",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/40"
  },
  { 
    id: "tasks", 
    label: "Görevler", 
    icon: ClipboardList, 
    path: "/gorevler",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40"
  },
  { 
    id: "ai-dashboard", 
    label: "AI Panel", 
    icon: Bot, 
    path: "/raporlar/ai-asistan",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40"
  },
  { 
    id: "support", 
    label: "Destek", 
    icon: Briefcase, 
    path: "/destek",
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-100 dark:bg-lime-900/40"
  },
  { 
    id: "quality", 
    label: "Kalite", 
    icon: ShieldCheck, 
    path: "/fabrika",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  { 
    id: "audits", 
    label: "Denetim", 
    icon: ClipboardList, 
    path: "/raporlar/denetimler",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40"
  },
  { 
    id: "invoices", 
    label: "Faturalar", 
    icon: FileText, 
    path: "/raporlar",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40"
  },
  { 
    id: "attendance", 
    label: "Devam", 
    icon: Users, 
    path: "/ik",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40"
  }
];

export function QuickActionsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role;

  const allowedActionIds = getQuickActionsForRole(userRole);
  
  const filteredActions = allActions.filter(action => {
    if (!userRole) return false;
    return allowedActionIds.includes(action.id);
  });

  if (filteredActions.length === 0) {
    return null;
  }

  // Maksimum 6 aksiyon göster, 3x2 grid
  const displayActions = filteredActions.slice(0, 6);

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hızlı İşlemler</h3>
      
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
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
