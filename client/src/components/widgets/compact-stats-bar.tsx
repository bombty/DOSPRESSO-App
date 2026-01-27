import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from "lucide-react";

export function CompactStatsBar() {
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

  const stats = [
    {
      id: "tasks",
      label: "Bekleyen",
      value: pendingTasks,
      icon: ClipboardCheck,
      bgColor: "bg-blue-500 dark:bg-blue-600",
      textColor: "text-white"
    },
    {
      id: "completed",
      label: "Tamamlanan",
      value: completedTasks,
      icon: CheckCircle,
      bgColor: "bg-emerald-500 dark:bg-emerald-600",
      textColor: "text-white"
    },
    {
      id: "faults",
      label: "Arıza",
      value: openFaults,
      icon: AlertTriangle,
      bgColor: "bg-amber-500 dark:bg-amber-600",
      textColor: "text-white"
    },
    {
      id: "checklists",
      label: "Checklist",
      value: activeChecklists,
      icon: Clock,
      bgColor: "bg-purple-500 dark:bg-purple-600",
      textColor: "text-white"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`relative overflow-hidden rounded-xl ${stat.bgColor} p-3 ${stat.textColor}`}
            data-testid={`compact-stat-${stat.id}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{stat.value}</p>
                <p className="text-[10px] text-white/80 truncate mt-0.5">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
