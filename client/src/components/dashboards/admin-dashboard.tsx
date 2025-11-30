import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Zap, AlertTriangle, Flame } from "lucide-react";
import { useLocation } from "wouter";
import { GaugeCard, KPICard } from "./shared-dashboard-components";
import { calculateAverageScore } from "./dashboard-utils";
import { BranchPerformanceHeatmap } from "./branch-performance-heatmap";

interface AdminDashboardProps {
  compositeBranchScores: any[];
  isLoading: boolean;
  totalBranches: number;
  totalFaults: number;
  openFaults: number;
  branchScoresTimeRange?: string;
  onTimeRangeChange?: (range: any) => void;
}

export function AdminDashboard({
  compositeBranchScores,
  isLoading,
  totalBranches,
  totalFaults,
  openFaults,
  branchScoresTimeRange,
  onTimeRangeChange,
}: AdminDashboardProps) {
  const [, setLocation] = useLocation();
  // Calculate overall system metrics
  const avgEmployeePerf = calculateAverageScore(compositeBranchScores.map(s => s.employeePerformanceScore));
  const avgEquipmentScore = calculateAverageScore(compositeBranchScores.map(s => s.equipmentScore));
  const avgQualityScore = calculateAverageScore(compositeBranchScores.map(s => s.qualityAuditScore));
  const avgCustomerScore = calculateAverageScore(compositeBranchScores.map(s => s.customerSatisfactionScore));
  const slaScore = totalFaults > 0 ? Math.round(((totalFaults - openFaults) / totalFaults) * 100) : 100;

  // Get critical alerts
  const criticalBranches = compositeBranchScores
    .filter(s => s.compositeScore < 70)
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, 3);

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Gauge Cards - Real-time KPI Monitoring */}
      {!isLoading && (
        <div className="grid gap-0.5 grid-cols-2 md:grid-cols-5">
          <GaugeCard label="Personel" value={avgEmployeePerf} icon={Zap} />
          <GaugeCard label="Ekipman" value={avgEquipmentScore} icon={Zap} />
          <GaugeCard label="Kalite" value={avgQualityScore} icon={Zap} />
          <GaugeCard label="Müşteri" value={avgCustomerScore} icon={Zap} />
          <GaugeCard label="SLA" value={slaScore} icon={Zap} />
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid gap-0.5 grid-cols-2 md:grid-cols-4">
        <KPICard icon={Building2} label="Toplam Şubeler" value={totalBranches} color="blue" />
        <KPICard icon={AlertCircle} label="Açık Arızalar" value={openFaults} color="red" />
        <KPICard icon={CheckCircle} label="Kapanan" value={totalFaults - openFaults} color="green" />
        <KPICard icon={TrendingUp} label="Kapanış Oranı" value={totalFaults > 0 ? Math.round(((totalFaults - openFaults) / totalFaults) * 100) : 0} suffix="%" color="amber" />
      </div>

      {/* Branch Performance Heatmap - Unified */}
      <BranchPerformanceHeatmap 
        compositeBranchScores={compositeBranchScores}
        isLoading={isLoading}
      />

      {/* Critical Alerts */}
      {!isLoading && criticalBranches.length > 0 && (
        <Card className="border-l-4 border-l-red-600 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <Flame className="h-4 w-4" />
              Kritik Uyarılar - Dikkat Gerektiren Şubeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalBranches.map((score) => (
                <div
                  key={score.branchId}
                  className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-md border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-red-700">{score.branchName}</div>
                      <div className="text-xs text-muted-foreground">
                        Skor: <span className="font-bold text-red-600">{score.compositeScore.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 text-xs">
                    {score.employeePerformanceScore < 70 && (
                      <Badge variant="destructive" className="text-xs">Personel</Badge>
                    )}
                    {score.equipmentScore < 70 && (
                      <Badge variant="destructive" className="text-xs">Ekipman</Badge>
                    )}
                    {score.qualityAuditScore < 70 && (
                      <Badge variant="destructive" className="text-xs">Kalite</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
