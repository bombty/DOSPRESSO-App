import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import {
  Plus,
  QrCode,
  ClipboardList,
  Wrench,
  GraduationCap,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  BarChart3,
  Briefcase
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  path: string;
  color: string;
  bgColor: string;
  roles?: string[];
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
    id: "qr-scan", 
    label: "QR Tara", 
    icon: QrCode, 
    path: "/qr-scan",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40"
  },
  { 
    id: "checklist", 
    label: "Checklist", 
    icon: ClipboardList, 
    path: "/checklistler",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    // Sadece şube çalışanları için görünür - HQ admin/ceo için gizle
    roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "fabrika_mudur", "fabrika_sorumlu", "fabrika_personel"]
  },
  { 
    id: "fault", 
    label: "Arıza Bildir", 
    icon: Wrench, 
    path: "/ariza?new=true",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40"
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
  }
];

export function QuickActionsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const filteredActions = allActions.filter(action => {
    if (!action.roles) return true;
    return user?.role && action.roles.includes(user.role);
  }).slice(0, 6);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hızlı İşlemler</h3>
      
      <div className="grid grid-cols-6 gap-2">
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
