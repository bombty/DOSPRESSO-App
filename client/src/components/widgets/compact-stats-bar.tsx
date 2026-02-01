import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getStatsForRole, isHQRole, isBranchRole, isFactoryRole } from "@/lib/role-visibility";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Building2,
  TrendingUp,
  Users,
  Factory
} from "lucide-react";

interface StatItem {
  id: string;
  label: string;
  value: number;
  icon: any;
  bgColor: string;
  path: string;
  roles: string[];
}

export function CompactStatsBar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userRole = user?.role;

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
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

  const { data: checklists = [] } = useQuery<any[]>({
    queryKey: ["/api/checklists/my-assignments"],
    enabled: !!user,
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!user && isHQRole(userRole),
  });

  const { data: personnel = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    enabled: !!user && isHQRole(userRole),
  });

  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede" || t.status === "devam_ediyor").length;
  const completedTasks = tasks.filter((t: any) => t.status === "tamamlandi").length;
  const openFaults = faults.filter((f: any) => f.currentStage !== "kapatildi").length;
  const activeChecklists = checklists.filter((c: any) => !c.isCompleted).length;
  const totalBranches = branches.length;
  const activePersonnel = personnel.filter((p: any) => p.isActive).length;

  const allStats: StatItem[] = [
    {
      id: "branches",
      label: "Şube",
      value: totalBranches,
      icon: Building2,
      bgColor: "bg-sky-500 dark:bg-sky-600",
      path: "/operasyon?tab=subeler",
      roles: ["admin", "ceo", "cgo", "coach", "muhasebe", "muhasebe_ik", "yatirimci_hq"]
    },
    {
      id: "personnel",
      label: "Personel",
      value: activePersonnel,
      icon: Users,
      bgColor: "bg-violet-500 dark:bg-violet-600",
      path: "/ik",
      roles: ["admin", "ceo", "cgo", "ik", "muhasebe_ik"]
    },
    {
      id: "tasks",
      label: "Bekleyen",
      value: pendingTasks,
      icon: ClipboardCheck,
      bgColor: "bg-blue-500 dark:bg-blue-600",
      path: "/gorevler",
      roles: ["admin", "ceo", "cgo", "supervisor", "supervisor_buddy", "barista", "stajyer", "coach", "trainer", "fabrika_mudur", "fabrika_sorumlu"]
    },
    {
      id: "completed",
      label: "Tamamlanan",
      value: completedTasks,
      icon: CheckCircle,
      bgColor: "bg-emerald-500 dark:bg-emerald-600",
      path: "/gorevler?filter=completed",
      roles: ["supervisor", "supervisor_buddy", "barista", "stajyer", "coach", "trainer", "fabrika_mudur", "fabrika_sorumlu"]
    },
    {
      id: "faults",
      label: "Arıza",
      value: openFaults,
      icon: AlertTriangle,
      bgColor: "bg-amber-500 dark:bg-amber-600",
      path: "/ariza",
      roles: ["admin", "ceo", "cgo", "supervisor", "supervisor_buddy", "teknik", "ekipman_teknik", "destek", "fabrika_mudur"]
    },
    {
      id: "checklists",
      label: "Checklist",
      value: activeChecklists,
      icon: Clock,
      bgColor: "bg-purple-500 dark:bg-purple-600",
      path: "/checklistler",
      roles: ["admin", "ceo", "cgo", "supervisor", "supervisor_buddy", "barista", "stajyer", "fabrika_sorumlu", "fabrika_personel"]
    }
  ];

  const filteredStats = allStats.filter(stat => {
    if (!userRole) return false;
    return stat.roles.includes(userRole);
  });

  if (filteredStats.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="compact-stats-bar">
      {filteredStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.button
            key={stat.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation(stat.path)}
            className={`flex items-center gap-1.5 ${stat.bgColor} px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer`}
            data-testid={`compact-stat-${stat.id}`}
          >
            <Icon className="w-3.5 h-3.5 text-white/90" />
            <span className="text-sm font-bold text-white">{stat.value}</span>
            <span className="text-[10px] text-white/80 font-medium">{stat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
