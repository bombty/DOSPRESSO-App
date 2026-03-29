import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Zap
} from "lucide-react";

interface StatItem {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  icon: any;
  gradient: string;
  iconBg: string;
}

export function QuickStatsGrid() {
  const { user } = useAuth();

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

  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede" || t.status === "devam_ediyor").length;
  const completedTasks = tasks.filter((t: any) => t.status === "tamamlandi").length;
  const openFaults = faults.filter((f: any) => f.currentStage !== "kapatildi").length;
  const activeChecklists = checklists.filter((c: any) => !c.isCompleted).length;

  const stats: StatItem[] = [
    {
      id: "tasks",
      label: "Bekleyen Görevler",
      value: pendingTasks,
      icon: ClipboardCheck,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-400/30"
    },
    {
      id: "completed",
      label: "Tamamlanan",
      value: completedTasks,
      change: "+12%",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-400/30"
    },
    {
      id: "faults",
      label: "Açık Arızalar",
      value: openFaults,
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-400/30"
    },
    {
      id: "checklists",
      label: "Aktif Checklistler",
      value: activeChecklists,
      icon: Clock,
      gradient: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-400/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-4 text-white`}
            data-testid={`stat-card-${stat.id}`}
          >
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-card/10" />
            
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            
            <div className="relative z-10">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-white/80 mt-0.5">{stat.label}</p>
              {stat.change && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs font-medium">{stat.change}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
