import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  BarChart3,
  Factory,
  Settings
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  path: string;
  color: string;
  bgColor: string;
  roles: string[];
}

const allActions: QuickAction[] = [
  { 
    id: "new-task", 
    label: "Yeni Görev", 
    icon: Plus, 
    path: "/gorevler?new=true",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    roles: ["supervisor", "supervisor_buddy", "coach", "trainer"]
  },
  { 
    id: "checklist", 
    label: "Checklist", 
    icon: ClipboardList, 
    path: "/checklistler",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "fabrika_sorumlu", "fabrika_personel"]
  },
  { 
    id: "academy", 
    label: "Eğitimler", 
    icon: GraduationCap, 
    path: "/akademi",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40",
    roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "trainer"]
  },
  { 
    id: "shifts", 
    label: "Vardiyalar", 
    icon: Calendar, 
    path: "/vardiyalar",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40",
    roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "ik", "fabrika_mudur", "fabrika_sorumlu", "fabrika_personel"]
  },
  { 
    id: "leaves", 
    label: "İzin Talebi", 
    icon: CalendarDays, 
    path: "/izinler",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
    roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "ik", "fabrika_mudur", "fabrika_sorumlu", "fabrika_personel"]
  },
  { 
    id: "reports", 
    label: "Raporlar", 
    icon: FileText, 
    path: "/raporlar",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40",
    roles: ["ceo", "muhasebe", "coach", "fabrika_mudur"]
  },
  { 
    id: "personnel", 
    label: "Personel", 
    icon: Users, 
    path: "/ik",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/40",
    roles: ["ik", "supervisor"]
  },
  { 
    id: "stock", 
    label: "Stok", 
    icon: Package, 
    path: "/satinalma?tab=stok",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
    roles: ["satinalma", "fabrika_mudur"]
  },
  { 
    id: "production", 
    label: "Üretim", 
    icon: Factory, 
    path: "/fabrika",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    roles: ["fabrika_mudur", "fabrika_sorumlu", "fabrika_personel"]
  },
  { 
    id: "announcements", 
    label: "Duyurular", 
    icon: Megaphone, 
    path: "/admin?tab=icerik",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40",
    roles: ["pazarlama", "admin"]
  },
  { 
    id: "analytics", 
    label: "Analitik", 
    icon: BarChart3, 
    path: "/raporlar?tab=analitik",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/40",
    roles: ["ceo", "admin"]
  },
  { 
    id: "settings", 
    label: "Ayarlar", 
    icon: Settings, 
    path: "/admin",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/40",
    roles: ["admin"]
  }
];

export function QuickActionsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role;

  const filteredActions = allActions.filter(action => {
    if (!userRole) return false;
    return action.roles.includes(userRole);
  }).slice(0, 6);

  if (filteredActions.length === 0) {
    return null;
  }

  const gridCols = filteredActions.length <= 3 ? "grid-cols-3" : 
                   filteredActions.length <= 4 ? "grid-cols-4" : 
                   filteredActions.length <= 5 ? "grid-cols-5" : "grid-cols-6";

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hızlı İşlemler</h3>
      
      <div className={`grid ${gridCols} gap-2`}>
        {filteredActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(action.path)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover-elevate"
              data-testid={`quick-action-${action.id}`}
            >
              <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight truncate w-full">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
