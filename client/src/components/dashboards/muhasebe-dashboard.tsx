import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  DollarSign, 
  Building2, 
  AlertCircle,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Clock
} from "lucide-react";
import { KPICard } from "./shared-dashboard-components";
import { BranchPerformanceHeatmap } from "./branch-performance-heatmap";

interface MuhasebeDashboardProps {
  compositeBranchScores: any[];
  totalBranches: number;
  faults?: any[];
  isLoading: boolean;
}

export function MuhasebeDashboard({
  compositeBranchScores,
  totalBranches,
  faults,
  isLoading,
}: MuhasebeDashboardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Role check for HR data access
  const hasHRAccess = Boolean(user?.role && ["admin", "muhasebe", "muhasebe_ik", "ceo", "cgo"].includes(user.role));

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    enabled: hasHRAccess,
  });

  const { data: leaveRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/leave-requests"],
    enabled: hasHRAccess,
  });

  const { data: overtimeRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/overtime-requests"],
    enabled: hasHRAccess,
  });

  const faultsByCost = faults?.reduce((acc: any[], fault) => {
    const cost = fault.repairCost || 0;
    const existing = acc.find(f => f.branch === fault.branchName);
    if (existing) {
      existing.cost += cost;
    } else {
      acc.push({ branch: fault.branchName, cost });
    }
    return acc;
  }, []) || [];

  const totalRepairCost = faultsByCost.reduce((sum, f) => sum + f.cost, 0);
  const avgScoreBranches = compositeBranchScores.reduce((sum, s) => sum + s.compositeScore, 0) / (compositeBranchScores.length || 1);
  const activeEmployees = employees.filter((e: any) => e.isActive).length;
  const pendingLeaves = leaveRequests.filter((r: any) => r.status === "beklemede").length;
  const pendingOvertimes = overtimeRequests.filter((r: any) => r.status === "beklemede").length;

  const quickActions = [
    { label: "Personel Listesi", icon: Users, path: "/ik", color: "bg-blue-500" },
    { label: "İzin Talepleri", icon: Calendar, path: "/izin-talepleri", color: "bg-green-500" },
    { label: "Mesai Talepleri", icon: Clock, path: "/ik", color: "bg-orange-500" },
    { label: "Maliyet Yönetimi", icon: DollarSign, path: "/fabrika", color: "bg-purple-500" },
    { label: "Satınalma", icon: CreditCard, path: "/satinalma", color: "bg-indigo-500" },
    { label: "Raporlar", icon: FileText, path: "/raporlar", color: "bg-teal-500" },
  ];

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-base md:text-lg font-bold text-blue-900 dark:text-blue-300">Mali ve İK Paneli</h2>
      </div>

      {/* Financial & HR KPIs - Compact Row */}
      <div className="grid gap-1.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard icon={Building2} label="Şube" value={totalBranches} color="blue" />
        <KPICard icon={Users} label="Personel" value={activeEmployees} color="blue" />
        <KPICard icon={TrendingUp} label="Ort. Skor" value={avgScoreBranches.toFixed(0)} color="green" />
        <KPICard icon={AlertCircle} label="Onarım" value={`₺${(totalRepairCost / 1000).toFixed(1)}K`} color="orange" />
        <KPICard icon={Calendar} label="İzin Bkl" value={pendingLeaves} color="purple" />
        <KPICard icon={Clock} label="Mesai Bkl" value={pendingOvertimes} color="amber" />
      </div>

      {/* Quick Actions - Compact 3-Column Grid */}
      <Card className="border-0 bg-gradient-to-r from-slate-50/80 to-blue-50/50 dark:from-slate-900/50 dark:to-blue-900/30">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400">Hızlı Erişim</CardTitle>
        </CardHeader>
        <CardContent className="py-1 px-3 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {quickActions.map((action, idx) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-auto py-2 px-2 flex flex-col items-center gap-1"
                  onClick={() => setLocation(action.path)}
                  data-testid={`btn-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`p-1.5 rounded-md ${action.color} text-white`}>
                    <action.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 text-center leading-tight">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Branch Performance - Using Shared Heatmap */}
      <BranchPerformanceHeatmap 
        compositeBranchScores={compositeBranchScores}
        isLoading={isLoading}
        title="Şube Performans Özeti"
      />

      {isLoading && <Skeleton className="h-48 w-full" />}
    </div>
  );
}
