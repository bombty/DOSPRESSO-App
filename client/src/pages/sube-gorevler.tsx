import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

type BranchTaskStats = {
  totalTasks: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  onTimeRate: number;
  overdueRate: number;
  failureRate: number;
  avgAckTime: number;
  avgCompletionTime: number;
  performanceScore: number;
};

export default function SubeGorevlerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const branchId = parseInt(id || "0");

  const { data: stats, isLoading } = useQuery<BranchTaskStats>({
    queryKey: [`/api/branches/${branchId}/task-stats`],
    enabled: !!branchId,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 dark:bg-green-950";
    if (score >= 60) return "bg-amber-50 dark:bg-amber-950";
    return "bg-red-50 dark:bg-red-950";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Veriler yükleniyor...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-lg text-muted-foreground">Görev istatistikleri bulunamadı</p>
        <Link href="/subeler">
          <Button variant="default">Şubelere Dön</Button>
        </Link>
      </div>
    );
  }

  const scorePercentage = (stats.performanceScore / 100) * 100;
  const trendData = [
    { name: "Haftası 1", completed: 12, failed: 2, pending: 3 },
    { name: "Haftası 2", completed: 15, failed: 1, pending: 2 },
    { name: "Haftası 3", completed: 14, failed: 3, pending: 1 },
    { name: "Bu Hafta", completed: 18, failed: 1, pending: 2 },
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/subeler/${id}`}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Görev Performansı</h1>
              <p className="text-muted-foreground">Şube görev istatistikleri ve analitik</p>
            </div>
          </div>
        </div>

        {/* Performance Score Gauge */}
        {stats.totalTasks === 0 && stats.completed === 0 ? (
          <Card data-testid="card-no-performance-data">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Genel Performans Skoru</span>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-2">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-data">Henüz yeterli veri yok</p>
                  <p className="text-sm text-muted-foreground">Performans skoru için en az 1 tamamlanmış görev gerekli</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={getScoreBg(stats.performanceScore)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Genel Performans Skoru</span>
                <TrendingUp className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(stats.performanceScore)}`}>
                    {stats.performanceScore}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">/100</p>
                </div>
                <div className="flex-1">
                  <Progress value={scorePercentage} className="h-4" data-testid="progress-performance" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.performanceScore >= 80
                      ? "Mükemmel"
                      : stats.performanceScore >= 60
                      ? "İyi"
                      : "Geliştirilmesi Gerekli"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Toplam Görevler */}
          <Card data-testid="card-total-tasks">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Görev</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">Tamamlanan:</span>
                  <span className="font-semibold">{stats.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Devam Eden:</span>
                  <span className="font-semibold">{stats.inProgress}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zamanında Tamamlama */}
          <Card data-testid="card-on-time">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Zamanında Tamamlama</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.onTimeRate}%</div>
              <Progress value={stats.onTimeRate} className="mt-2 h-2" data-testid="progress-on-time" />
              <p className="text-xs text-muted-foreground mt-1">{stats.completed} görev tamamlandı</p>
            </CardContent>
          </Card>

          {/* Başarısız Görevler */}
          <Card data-testid="card-failed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Başarısız Görevler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failureRate}%</div>
              <Progress value={stats.failureRate} className="mt-2 h-2" data-testid="progress-failure" />
              <p className="text-xs text-muted-foreground mt-1">{stats.failed} görev başarısız</p>
            </CardContent>
          </Card>

          {/* Geciken Görevler */}
          <Card data-testid="card-overdue">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Geciken Görevler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.overdue}</div>
              <Progress value={Math.min(100, (stats.overdue / stats.totalTasks) * 100)} className="mt-2 h-2" data-testid="progress-overdue" />
              <p className="text-xs text-muted-foreground mt-1">{stats.overdueRate}% oranı</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zaman Metrikleri */}
          <Card data-testid="card-time-metrics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Zaman Metrikleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ortalama Görülme Süresi</span>
                  <Badge variant="secondary">{stats.avgAckTime} dk</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Görev atandıktan sonra "Gördüm" tıklamasına kadar geçen ortalama süre
                </p>
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ortalama Tamamlama Süresi</span>
                  <Badge variant="secondary">{stats.avgCompletionTime} sa</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Görev başlangıcından tamamlanmasına kadar geçen ortalama süre
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SLA ve Durum Özeti */}
          <Card data-testid="card-sla-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Durum Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Beklemede</span>
                <Badge variant="outline">{stats.pending}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-sm">Devam Ediyor</span>
                <Badge variant="outline">{stats.inProgress}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-sm">Tamamlanan</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {stats.completed}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-sm">Başarısız</span>
                <Badge variant="destructive">{stats.failed}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card data-testid="card-trend-chart">
          <CardHeader>
            <CardTitle>Son 4 Hafta Trend</CardTitle>
            <CardDescription>Haftalık görev tamamlama ve başarısızlık oranları</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#22c55e" name="Tamamlanan" />
                <Bar dataKey="failed" fill="#ef4444" name="Başarısız" />
                <Bar dataKey="pending" fill="#eab308" name="Beklemede" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Calculation Info */}
        <Card className="border-dashed" data-testid="card-score-info">
          <CardHeader>
            <CardTitle className="text-base">Skor Hesaplama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Zamanında Tamamlama Oranı</span>
                <span className="font-medium">%40</span>
              </div>
              <div className="flex justify-between">
                <span>Gecikme Oranı</span>
                <span className="font-medium">%20</span>
              </div>
              <div className="flex justify-between">
                <span>Başarısızlık Oranı</span>
                <span className="font-medium">%15</span>
              </div>
              <div className="flex justify-between">
                <span>Ortalama Görülme Süresi</span>
                <span className="font-medium">%15</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Tamamlama Hızı</span>
                <span className="font-medium">%10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
