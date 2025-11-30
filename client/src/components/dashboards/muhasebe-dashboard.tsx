import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Building2, AlertCircle } from "lucide-react";
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

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Mali Gösterge Paneli</h2>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <KPICard icon={Building2} label="Şubeler" value={totalBranches} color="blue" />
        <KPICard icon={TrendingUp} label="Ort. Skor" value={avgScoreBranches.toFixed(0)} color="green" />
        <KPICard icon={AlertCircle} label="Onarım Malı" value={`₺${(totalRepairCost / 1000).toFixed(1)}K`} color="orange" />
        <KPICard icon={DollarSign} label="Ort. Maliyet" value={`${(totalRepairCost > 0 ? totalRepairCost / totalBranches : 0).toFixed(0)}₺`} color="purple" />
      </div>

      {/* Branch Performance - Using Shared Heatmap */}
      <BranchPerformanceHeatmap 
        compositeBranchScores={compositeBranchScores}
        isLoading={isLoading}
        title="Şube Performans Özeti"
      />

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
