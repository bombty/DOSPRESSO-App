import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Zap, AlertTriangle, Flame, Trophy, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { GaugeCard, KPICard } from "./shared-dashboard-components";
import { getHeatColor, calculateAverageScore } from "./dashboard-utils";

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

  // Radial chart data
  const radarData = [
    { name: 'Personel', value: avgEmployeePerf, fullMark: 100 },
    { name: 'Ekipman', value: avgEquipmentScore, fullMark: 100 },
    { name: 'Kalite', value: avgQualityScore, fullMark: 100 },
    { name: 'Müşteri', value: avgCustomerScore, fullMark: 100 },
    { name: 'SLA', value: slaScore, fullMark: 100 },
  ];

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
