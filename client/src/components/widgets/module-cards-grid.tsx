import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Wrench, 
  GraduationCap, 
  BarChart3, 
  Factory,
  Users,
  ShoppingCart,
  Settings,
  Briefcase,
  ChevronRight
} from "lucide-react";

interface ModulePreview {
  id: string;
  title: string;
  icon: any;
  path: string;
  color: string;
  metric?: number | string;
  metricLabel?: string;
}

const MEGA_MODULE_ICONS: Record<string, any> = {
  operations: Building2,
  equipment: Wrench,
  training: GraduationCap,
  reports: BarChart3,
  factory: Factory,
  hr: Users,
  satinalma: ShoppingCart,
  admin: Settings,
  newshop: Briefcase,
};

const MEGA_MODULE_PATHS: Record<string, string> = {
  operations: "/operasyon",
  equipment: "/ekipman",
  training: "/akademi",
  reports: "/raporlar",
  factory: "/fabrika",
  hr: "/ik",
  satinalma: "/satinalma",
  admin: "/admin",
  newshop: "/yeni-sube",
};

export function ModuleCardsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: dashboardModules } = useQuery<any>({
    queryKey: ["/api/dashboard-modules"],
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
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

  const megaModules = dashboardModules?.megaModules || [];
  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede" || t.status === "devam_ediyor").length;
  const openFaults = faults.filter((f: any) => f.currentStage !== "kapatildi").length;

  const getModuleMetric = (moduleId: string): { value: number | string; label: string } | null => {
    switch (moduleId) {
      case "operations":
        return { value: pendingTasks, label: "görev" };
      case "equipment":
        return { value: openFaults, label: "arıza" };
      default:
        return null;
    }
  };

  if (!megaModules || megaModules.length === 0) {
    return null;
  }

  const visibleModules = megaModules.filter((m: any) => !m.isEmpty);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modüller</h3>
      
      <div className="grid grid-cols-3 gap-2">
        {visibleModules.map((module: any, index: number) => {
          const Icon = MEGA_MODULE_ICONS[module.id] || Building2;
          const path = MEGA_MODULE_PATHS[module.id] || `/modul/${module.id}`;
          const metric = getModuleMetric(module.id);
          const itemCount = module.items?.length || 0;
          
          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(path)}
              className="relative flex flex-col items-center p-3 rounded-xl border bg-card hover-elevate text-left"
              data-testid={`module-card-${module.id}`}
            >
              {/* Icon with color */}
              <div className={`w-10 h-10 rounded-xl ${module.color} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Title */}
              <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2 mb-1">
                {module.title}
              </span>
              
              {/* Preview metric or item count */}
              <div className="flex items-center gap-1">
                {metric && Number(metric.value) > 0 ? (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
                    {metric.value} {metric.label}
                  </Badge>
                ) : (
                  <span className="text-[8px] text-muted-foreground">{itemCount} modül</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
