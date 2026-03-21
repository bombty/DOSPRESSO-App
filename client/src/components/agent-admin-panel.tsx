import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  RefreshCw,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalRuns: number;
  totalActions: number;
  statusBreakdown: Record<string, number>;
  approvalRate: number;
  llmTokens: number;
  llmCallCount: number;
  recentRuns: Array<{
    id: number;
    runType: string;
    scopeType: string;
    triggeredBy: string;
    llmUsed: boolean;
    llmTokens: number;
    actionsGenerated: number;
    status: string;
    executionTimeMs: number;
    createdAt: string;
  }>;
  schedulerStatus: {
    running: boolean;
    tokenBudgets: Record<string, any>;
  };
  period: string;
}

const RUN_TYPE_LABELS: Record<string, string> = {
  daily_analysis: "Günlük Analiz",
  weekly_summary: "Haftalık Özet",
  event_triggered: "Olay Tetikli",
  escalation_check: "Yükseltme Kontrolü",
};

export function AgentAdminPanel() {
  const { toast } = useToast();

  const statsQuery = useQuery<AdminStats>({
    queryKey: ["/api/agent/admin/stats"],
    refetchInterval: 120000,
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/run-now");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
      toast({
        title: "Agent analizi tamamlandı",
        description: `${data.actionsGenerated} öneri üretildi. LLM: ${data.llmUsed ? "Evet" : "Hayır"}`,
      });
    },
    onError: () => {
      toast({ title: "Agent analizi çalıştırılamadı", variant: "destructive" });
    },
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-4" data-testid="agent-admin-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Agent Yönetim Paneli
        </h3>
        <Button
          onClick={() => runNowMutation.mutate()}
          disabled={runNowMutation.isPending}
          data-testid="button-run-agent-now"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${runNowMutation.isPending ? "animate-spin" : ""}`} />
          {runNowMutation.isPending ? "Çalışıyor..." : "Şimdi Analiz Et"}
        </Button>
      </div>

      {statsQuery.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : !stats ? (
        <div className="text-center py-8 text-muted-foreground">İstatistikler alınamadı</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card data-testid="card-stat-runs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalRuns}</div>
                  <div className="text-xs text-muted-foreground">Toplam Çalıştırma (30g)</div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-actions">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalActions}</div>
                  <div className="text-xs text-muted-foreground">Toplam Öneri (30g)</div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-approval">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">%{stats.approvalRate}</div>
                  <div className="text-xs text-muted-foreground">Onay Oranı</div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-tokens">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {(stats.llmTokens ?? 0) > 1000 ? `${((stats.llmTokens ?? 0) / 1000).toFixed(1)}K` : (stats.llmTokens ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">LLM Token ({stats.llmCallCount} çağrı)</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Durum Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(stats.statusBreakdown).map(([status, cnt]) => {
                    const labels: Record<string, { label: string; color: string }> = {
                      pending: { label: "Bekleyen", color: "bg-amber-500" },
                      approved: { label: "Onaylanan", color: "bg-green-500" },
                      rejected: { label: "Reddedilen", color: "bg-red-500" },
                      expired: { label: "Süresi Dolan", color: "bg-muted text-muted-foreground" },
                      auto_resolved: { label: "Otomatik Çözülen", color: "bg-blue-500" },
                    };
                    const config = labels[status] || { label: status, color: "bg-muted" };
                    const total = Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;

                    return (
                      <div key={status} className="flex items-center gap-3" data-testid={`stat-status-${status}`}>
                        <div className={`w-3 h-3 rounded-full ${config.color} shrink-0`} />
                        <span className="text-sm flex-1">{config.label}</span>
                        <span className="text-sm font-medium">{cnt}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">%{pct}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Son Çalıştırmalar</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recentRuns.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Henüz çalıştırma yok
                    </div>
                  ) : (
                    stats.recentRuns.map((run) => (
                      <div key={run.id} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0" data-testid={`row-run-${run.id}`}>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {RUN_TYPE_LABELS[run.runType] || run.runType}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-1">
                          {new Date(run.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-xs">
                          {run.actionsGenerated} öneri
                        </span>
                        {run.llmUsed && (
                          <Badge variant="secondary" className="text-xs">AI</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Zamanlayıcı Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${stats.schedulerStatus?.running ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm">
                  {stats.schedulerStatus?.running ? "Çalışıyor" : "Durdu"}
                </span>
              </div>
              {stats.schedulerStatus?.tokenBudgets && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(stats.schedulerStatus.tokenBudgets).map(([group, budget]: [string, any]) => (
                    <div key={group} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm" data-testid={`budget-${group}`}>
                      <span className="text-xs">{group}</span>
                      <span className="text-xs text-muted-foreground">
                        {budget?.dailyUsed || 0}/{budget?.dailyLimit || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
