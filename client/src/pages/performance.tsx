import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { PerformanceMetric, Branch } from "@shared/schema";
import { TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";

export default function Performance() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/performance", selectedBranchId],
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const latestMetric = metrics?.[0];
  const previousMetric = metrics?.[1];

  const calculateTrend = (current: number | null | undefined, previous: number | null | undefined) => {
    if (!current || !previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const completionTrend = calculateTrend(latestMetric?.completionRate ?? 0, previousMetric?.completionRate ?? 0);
  const aiScoreTrend = calculateTrend(latestMetric?.averageAiScore ?? 0, previousMetric?.averageAiScore ?? 0);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Performans</h1>
          <p className="text-muted-foreground mt-1">Şube performansını izleyin ve KPI'ları analiz edin</p>
        </div>
        <div className="w-64">
          {branchesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger data-testid="select-branch">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Şubeler</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {metricsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    {completionTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : completionTrend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Tamamlanma</p>
                  <p className="text-lg font-bold" data-testid="text-completion-rate">%{latestMetric?.completionRate || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    {aiScoreTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : aiScoreTrend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">AI Skoru</p>
                  <p className="text-lg font-bold" data-testid="text-avg-ai-score">{latestMetric?.averageAiScore || 0}/100</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground">Görevler</p>
                  <p className="text-lg font-bold" data-testid="text-tasks-completed">{latestMetric?.tasksCompleted || 0}/{latestMetric?.tasksTotal || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">Arıza Çözüm</p>
                  <p className="text-lg font-bold" data-testid="text-faults-resolved">{latestMetric?.faultsResolved || 0}/{latestMetric?.faultsReported || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {(!metrics || metrics.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Henüz performans verisi yok.
                </p>
              </CardContent>
            </Card>
          )}

          {latestMetric && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performans Skorları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Görev</p>
                    <div className="text-lg font-bold mt-0.5">{latestMetric.taskScore || 0}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Fotoğraf</p>
                    <div className="text-lg font-bold mt-0.5">{latestMetric.photoScore || 0}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Zaman</p>
                    <div className="text-lg font-bold mt-0.5">{latestMetric.timeScore || 0}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Supervisor</p>
                    <div className="text-lg font-bold mt-0.5">{latestMetric.supervisorScore || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics && metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Son Performans Kayıtları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:gap-4 gap-2">
                  {metrics.slice(0, 9).map((metric) => (
                    <div
                      key={metric.id}
                      className="p-3 rounded-lg bg-muted/50"
                      data-testid={`metric-item-${metric.id}`}
                    >
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.date).toLocaleDateString("tr-TR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm font-bold mt-1">%{metric.completionRate}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {metric.tasksCompleted}/{metric.tasksTotal} görev
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
