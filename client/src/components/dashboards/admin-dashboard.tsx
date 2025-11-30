import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Zap, AlertTriangle, Flame, Trophy, Award } from "lucide-react";
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
  academyData?: any;
  academyLoading?: boolean;
}

export function AdminDashboard({
  compositeBranchScores,
  isLoading,
  totalBranches,
  totalFaults,
  openFaults,
  branchScoresTimeRange,
  onTimeRangeChange,
  academyData,
  academyLoading,
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


      {/* Akademi Section - Personalized */}
      <Card 
        className="cursor-pointer hover-elevate transition-all" 
        onClick={() => setLocation("/akademi")}
        data-testid="card-akademi-admin"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Akademi
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {academyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : academyData?.careerLevel ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">{academyData.careerLevel.titleTr}</span>
                </div>
                <Badge variant="secondary" data-testid="badge-career-level-admin">
                  Seviye {academyData.careerLevel.levelNumber}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quiz Başarı</span>
                  <span className="font-medium" data-testid="text-quiz-average-admin">
                    {Math.round(academyData.quizStats?.averageScore || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rozetler</span>
                  <span className="font-medium text-amber-600" data-testid="text-badges-count-admin">
                    {academyData.totalBadgesEarned || 0}
                  </span>
                </div>
              </div>

              {academyData.userBadges && academyData.userBadges.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Son Rozetler</p>
                  <div className="flex gap-1">
                    {academyData.userBadges.slice(0, 3).map((ub: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-admin-${ub.badge?.nameEn || idx}`}>
                        {ub.badge?.nameEn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/akademi");
                }}
                data-testid="button-view-academy-admin"
              >
                Akademiye Git
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Akademi henüz başlamamış</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/akademi");
                }}
                data-testid="button-start-academy-admin"
              >
                Akademiye Başla
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
