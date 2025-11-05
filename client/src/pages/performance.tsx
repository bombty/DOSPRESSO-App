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

  const calculateTrend = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const completionTrend = calculateTrend(latestMetric?.completionRate, previousMetric?.completionRate);
  const aiScoreTrend = calculateTrend(latestMetric?.averageAiScore, previousMetric?.averageAiScore);

  return (
    <div className="space-y-6">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tamamlanma Oranı
                </CardTitle>
                {completionTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : completionTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-completion-rate">
                  %{latestMetric?.completionRate || 0}
                </div>
                {completionTrend !== 0 && (
                  <p className={`text-xs mt-1 ${completionTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                    {completionTrend > 0 ? "+" : ""}{completionTrend}% önceki döneme göre
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ortalama AI Skoru
                </CardTitle>
                {aiScoreTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : aiScoreTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-avg-ai-score">
                  {latestMetric?.averageAiScore || 0}/100
                </div>
                {aiScoreTrend !== 0 && (
                  <p className={`text-xs mt-1 ${aiScoreTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                    {aiScoreTrend > 0 ? "+" : ""}{aiScoreTrend}% önceki döneme göre
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tamamlanan Görevler
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-tasks-completed">
                  {latestMetric?.tasksCompleted || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {latestMetric?.tasksTotal || 0} görevden
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Arıza Çözüm Oranı
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-faults-resolved">
                  {latestMetric?.faultsResolved || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestMetric?.faultsReported || 0} raporlanan arızadan
                </p>
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

          {metrics && metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Son Performans Kayıtları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.slice(0, 10).map((metric, index) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                      data-testid={`metric-item-${metric.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(metric.date).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {metric.tasksCompleted}/{metric.tasksTotal} görev
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">%{metric.completionRate}</p>
                        <p className="text-xs text-muted-foreground">
                          AI: {metric.averageAiScore}/100
                        </p>
                      </div>
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
