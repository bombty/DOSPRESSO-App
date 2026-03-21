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
    color: "bg-muted"
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

  // Admin bypass: Admin TÜM modülleri görür, MODULES_BY_ROLE kontrolü atlanır
  const isAdmin = userRole === 'admin';
  const allowedModuleIds = userRole ? (MODULES_BY_ROLE[userRole as UserRole] || []) : [];
  
  const visibleModules = MODULE_CONFIG.filter(module => {
    if (!userRole) return false;
    // Admin bypass - admin tüm modülleri görür
    if (isAdmin) return true;
    return allowedModuleIds.includes(module.id);
  });

  if (visibleModules.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Modüller</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {visibleModules.map((module, index) => {
          const Icon = module.icon;
          const metric = getModuleMetric(module.id);
          
          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(module.path)}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover-elevate"
              data-testid={`module-card-${module.id}`}
            >
              <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[11px] font-semibold truncate block">
                  {module.title}
                </span>
                {metric && (
                  <Badge variant="secondary" className="text-[8px] h-3.5 px-1 mt-0.5">
                    {metric.value} {metric.label}
                  </Badge>
                )}
              </div>
              
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
