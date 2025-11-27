import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Zap, AlertTriangle, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  // Calculate overall system metrics
  const avgEmployeePerf = compositeBranchScores.length > 0 
    ? Math.round(compositeBranchScores.reduce((sum, s) => sum + s.employeePerformanceScore, 0) / compositeBranchScores.length)
    : 0;
  const avgEquipmentScore = compositeBranchScores.length > 0 
    ? Math.round(compositeBranchScores.reduce((sum, s) => sum + s.equipmentScore, 0) / compositeBranchScores.length)
    : 0;
  const avgQualityScore = compositeBranchScores.length > 0 
    ? Math.round(compositeBranchScores.reduce((sum, s) => sum + s.qualityAuditScore, 0) / compositeBranchScores.length)
    : 0;
  const avgCustomerScore = compositeBranchScores.length > 0 
    ? Math.round(compositeBranchScores.reduce((sum, s) => sum + s.customerSatisfactionScore, 0) / compositeBranchScores.length)
    : 0;
  const slaScore = totalFaults > 0 ? Math.round(((totalFaults - openFaults) / totalFaults) * 100) : 100;

  // Radial chart data
  const radarData = [
    { name: 'Personel', value: avgEmployeePerf, fullMark: 100 },
    { name: 'Ekipman', value: avgEquipmentScore, fullMark: 100 },
    { name: 'Kalite', value: avgQualityScore, fullMark: 100 },
    { name: 'Müşteri', value: avgCustomerScore, fullMark: 100 },
    { name: 'SLA', value: slaScore, fullMark: 100 },
  ];

  // Get gauge color based on score
  const getGaugeColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGaugeTextColor = (score: number) => {
    if (score >= 85) return 'text-green-700';
    if (score >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  // Get color for heat map based on score
  const getHeatColor = (score: number) => {
    if (score >= 85) return 'bg-green-500 hover:bg-green-600';
    if (score >= 75) return 'bg-lime-500 hover:bg-lime-600';
    if (score >= 65) return 'bg-yellow-500 hover:bg-yellow-600';
    if (score >= 50) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-600 hover:bg-red-700';
  };

  // Get critical alerts
  const criticalBranches = compositeBranchScores
    .filter(s => s.compositeScore < 70)
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, 3);

  return (
    <div className="space-y-3 md:space-y-6">
      {/* System Performance Overview - Radial Chart */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-sm">Sistem Performans Göstergesi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Skor" dataKey="value" stroke="#1F3A93" fill="#1F3A93" fillOpacity={0.6} />
                <RechartsTooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gauge Cards - Real-time KPI Monitoring */}
      {!isLoading && (
        <div className="grid gap-1 grid-cols-2 md:grid-cols-5">
          {/* Personel Gauge */}
          <Card>
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Personel</span>
                <Zap className={`h-3 w-3 ${getGaugeTextColor(avgEmployeePerf)}`} />
              </div>
              <div className={`text-lg font-bold ${getGaugeTextColor(avgEmployeePerf)} mb-1`}>
                {avgEmployeePerf}%
              </div>
              <Progress value={avgEmployeePerf} className="h-1.5" />
            </CardContent>
          </Card>

          {/* Ekipman Gauge */}
          <Card>
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Ekipman</span>
                <Zap className={`h-3 w-3 ${getGaugeTextColor(avgEquipmentScore)}`} />
              </div>
              <div className={`text-lg font-bold ${getGaugeTextColor(avgEquipmentScore)} mb-1`}>
                {avgEquipmentScore}%
              </div>
              <Progress value={avgEquipmentScore} className="h-1.5" />
            </CardContent>
          </Card>

          {/* Kalite Gauge */}
          <Card>
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Kalite</span>
                <Zap className={`h-3 w-3 ${getGaugeTextColor(avgQualityScore)}`} />
              </div>
              <div className={`text-lg font-bold ${getGaugeTextColor(avgQualityScore)} mb-1`}>
                {avgQualityScore}%
              </div>
              <Progress value={avgQualityScore} className="h-1.5" />
            </CardContent>
          </Card>

          {/* Müşteri Gauge */}
          <Card>
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Müşteri</span>
                <Zap className={`h-3 w-3 ${getGaugeTextColor(avgCustomerScore)}`} />
              </div>
              <div className={`text-lg font-bold ${getGaugeTextColor(avgCustomerScore)} mb-1`}>
                {avgCustomerScore}%
              </div>
              <Progress value={avgCustomerScore} className="h-1.5" />
            </CardContent>
          </Card>

          {/* SLA Gauge */}
          <Card>
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">SLA</span>
                <Zap className={`h-3 w-3 ${getGaugeTextColor(slaScore)}`} />
              </div>
              <div className={`text-lg font-bold ${getGaugeTextColor(slaScore)} mb-1`}>
                {slaScore}%
              </div>
              <Progress value={slaScore} className="h-1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid gap-1 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-2 pb-2 text-center">
            <div className="flex justify-center mb-0.5">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-base md:text-lg font-bold text-blue-700">{totalBranches}</div>
            <p className="text-xs text-muted-foreground">Toplam Şubeler</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-2 pb-2 text-center">
            <div className="flex justify-center mb-0.5">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-base md:text-lg font-bold text-red-700">{openFaults}</div>
            <p className="text-xs text-muted-foreground">Açık Arızalar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 md:col-span-1">
          <CardContent className="pt-2 pb-2 text-center">
            <div className="flex justify-center mb-0.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-base md:text-lg font-bold text-green-700">{totalFaults - openFaults}</div>
            <p className="text-xs text-muted-foreground">Kapanan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600 md:col-span-1">
          <CardContent className="pt-2 pb-2 text-center">
            <div className="flex justify-center mb-0.5">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-base md:text-lg font-bold text-amber-700">
              {totalFaults > 0 ? Math.round(((totalFaults - openFaults) / totalFaults) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Kapanış Oranı</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Table - Desktop Only */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle>Şube Performans Tablosu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Şube</th>
                    <th className="text-center py-2 px-2">Personel</th>
                    <th className="text-center py-2 px-2">Ekipman</th>
                    <th className="text-center py-2 px-2">Kalite</th>
                    <th className="text-center py-2 px-2">Müşteri</th>
                    <th className="text-center py-2 px-2">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {compositeBranchScores.map((score) => {
                    // Sparkline data (last 5 scores - simulated)
                    const trendData = [
                      score.compositeScore * 0.9,
                      score.compositeScore * 0.95,
                      score.compositeScore * 0.98,
                      score.compositeScore * 0.97,
                      score.compositeScore
                    ];
                    return (
                    <tr key={score.branchId} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{score.branchName}</td>
                      <td className="text-center py-2 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline">{score.employeePerformanceScore.toFixed(0)}</Badge>
                          <div className="h-6 w-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData.map((v) => ({ value: v }))}>
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline">{score.equipmentScore.toFixed(0)}</Badge>
                          <div className="h-6 w-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData.map((v) => ({ value: v }))}>
                                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline">{score.qualityAuditScore.toFixed(0)}</Badge>
                          <div className="h-6 w-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData.map((v) => ({ value: v }))}>
                                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline">{score.customerSatisfactionScore.toFixed(0)}</Badge>
                          <div className="h-6 w-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData.map((v) => ({ value: v }))}>
                                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={1} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge 
                          variant={score.compositeScore >= 80 ? "default" : "secondary"}
                        >
                          {score.compositeScore.toFixed(0)}
                        </Badge>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heat Map Grid - Branch Performance at a Glance */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Şube Performans Isı Haritası</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
              {compositeBranchScores.map((score) => (
                <Tooltip key={score.branchId}>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-3 rounded-md text-center cursor-pointer transition-all ${getHeatColor(
                        score.compositeScore
                      )} text-white text-xs font-semibold`}
                    >
                      <div className="truncate text-xs">{score.branchName.split(' ')[0]}</div>
                      <div className="font-bold">{score.compositeScore.toFixed(0)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    <div className="font-semibold">{score.branchName}</div>
                    <div>Personel: {score.employeePerformanceScore.toFixed(0)}</div>
                    <div>Ekipman: {score.equipmentScore.toFixed(0)}</div>
                    <div>Kalite: {score.qualityAuditScore.toFixed(0)}</div>
                    <div>Müşteri: {score.customerSatisfactionScore.toFixed(0)}</div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>85%+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-500 rounded"></div>
                <span>75-84%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>65-74%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>50-64%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>&lt;50%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Branch Performance List - Mobile */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <div className="lg:hidden space-y-2">
          {compositeBranchScores.slice(0, 5).map((score) => (
            <Card key={score.branchId}>
              <CardContent className="pt-3 pb-3">
                <div className="font-semibold text-sm mb-2">{score.branchName}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Personel: <span className="font-bold text-blue-600">{score.employeePerformanceScore.toFixed(0)}</span></div>
                  <div>Ekipman: <span className="font-bold text-green-600">{score.equipmentScore.toFixed(0)}</span></div>
                  <div>Kalite: <span className="font-bold text-purple-600">{score.qualityAuditScore.toFixed(0)}</span></div>
                  <div>Müşteri: <span className="font-bold text-orange-600">{score.customerSatisfactionScore.toFixed(0)}</span></div>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Toplam Skor</span>
                  <Badge className="text-base">{score.compositeScore.toFixed(0)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
