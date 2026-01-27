import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MODULES_BY_ROLE, UserRole } from "@/lib/role-visibility";
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

interface ModuleConfig {
  id: string;
  title: string;
  icon: any;
  path: string;
  color: string;
}

const MODULE_CONFIG: ModuleConfig[] = [
  {
    id: "operations",
    title: "Operasyonlar",
    icon: Building2,
    path: "/operasyon",
    color: "bg-blue-500"
  },
  {
    id: "equipment",
    title: "Ekipman & Bakım",
    icon: Wrench,
    path: "/ekipman",
    color: "bg-orange-500"
  },
  {
    id: "training",
    title: "Eğitim & Akademi",
    icon: GraduationCap,
    path: "/akademi",
    color: "bg-emerald-500"
  },
  {
    id: "hr",
    title: "Personel & İK",
    icon: Users,
    path: "/ik",
    color: "bg-pink-500"
  },
  {
    id: "reports",
    title: "Raporlar",
    icon: BarChart3,
    path: "/raporlar",
    color: "bg-indigo-500"
  },
  {
    id: "factory",
    title: "Fabrika & Üretim",
    icon: Factory,
    path: "/fabrika",
    color: "bg-amber-500"
  },
  {
    id: "satinalma",
    title: "Satınalma",
    icon: ShoppingCart,
    path: "/satinalma",
    color: "bg-cyan-500"
  },
  {
    id: "newshop",
    title: "Yeni Şube Açılış",
    icon: Briefcase,
    path: "/yeni-sube",
    color: "bg-violet-500"
  },
  {
    id: "admin",
    title: "Yönetim",
    icon: Settings,
    path: "/admin",
    color: "bg-slate-500"
  }
];

export function ModuleCardsGrid() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role;

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

  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede" || t.status === "devam_ediyor").length;
  const openFaults = faults.filter((f: any) => f.currentStage !== "kapatildi").length;

  const getModuleMetric = (moduleId: string): { value: number | string; label: string } | null => {
    switch (moduleId) {
      case "operations":
        return pendingTasks > 0 ? { value: pendingTasks, label: "görev" } : null;
      case "equipment":
        return openFaults > 0 ? { value: openFaults, label: "arıza" } : null;
      default:
        return null;
    }
  };

  const allowedModuleIds = userRole ? (MODULES_BY_ROLE[userRole as UserRole] || []) : [];
  
  const visibleModules = MODULE_CONFIG.filter(module => {
    if (!userRole) return false;
    return allowedModuleIds.includes(module.id);
  });

  if (visibleModules.length === 0) {
    return null;
  }

  const gridCols = visibleModules.length <= 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modüller</h3>
      
      <div className={`grid ${gridCols} gap-2`}>
        {visibleModules.map((module, index) => {
          const Icon = module.icon;
          const metric = getModuleMetric(module.id);
          
          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(module.path)}
              className="relative flex flex-col items-center p-3 rounded-xl border bg-card hover-elevate text-left"
              data-testid={`module-card-${module.id}`}
            >
              <div className={`w-10 h-10 rounded-xl ${module.color} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2 mb-1">
                {module.title}
              </span>
              
              <div className="flex items-center gap-1">
                {metric ? (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
                    {metric.value} {metric.label}
                  </Badge>
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
