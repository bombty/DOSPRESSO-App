import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Shield,
  Zap,
  BarChart3,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Download,
  XCircle,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface AiAction {
  type: string;
  title: string;
  reason: string;
  signal: string;
  severity: "high" | "medium" | "low";
  estimatedMinutes: number;
  deepLink?: string;
  description?: string;
}

interface RiskSignal {
  userId: string;
  name: string;
  role: string;
  riskType: string;
  currentScore: number;
  threshold: number;
  suggestedAction: string;
}

interface AiLogEntry {
  id: number;
  runType: string;
  triggeredByUserId: string | null;
  targetRoleScope: string;
  targetUserId: string | null;
  branchId: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  actionCount: number | null;
  status: string | null;
  executionTimeMs: number | null;
  createdAt: string;
}

interface EmployeePanelData {
  viewMode: "employee";
  actions: AiAction[];
  analyzedAt: string;
}

interface SupervisorPanelData {
  viewMode: "supervisor";
  riskSignals: RiskSignal[];
  teamStats: {
    totalMembers: number;
    atRiskCount: number;
    avgScore: number;
  };
  analyzedAt: string;
}

interface CoachPanelData {
  viewMode: "coach";
  recentLogs: AiLogEntry[];
  systemStats: {
    totalRuns: number;
    todayRuns: number;
    avgActionsGenerated: number;
    lastRunAt: string | null;
    errorCount: number;
    executionTimeMs: number;
  };
  triggerSummary: {
    employeeRuns: number;
    supervisorRuns: number;
    coachRuns: number;
  };
}

type AiPanelData = EmployeePanelData | SupervisorPanelData | CoachPanelData;

const SIGNAL_LABELS: Record<string, string> = {
  quiz_low: "Quiz Düşük",
  gate_close: "Gate Yaklaştı",
  kpi_warning: "KPI Uyarı",
  onboarding_due: "Onboarding Bekliyor",
  score_low: "Skor Düşük",
  training_gap: "Eğitim Eksik",
};

const SEVERITY_CONFIG: Record<string, { variant: string; label: string }> = {
  high: { variant: "destructive", label: "Yüksek" },
  medium: { variant: "secondary", label: "Orta" },
  low: { variant: "outline", label: "Düşük" },
};

const ACTION_TYPE_ICONS: Record<string, typeof Brain> = {
  score_improvement: TrendingUp,
  onboarding_task: Target,
  gate_exam: Shield,
  gate_proximity: Zap,
  kpi_signal: BarChart3,
};

const ACTION_TYPE_LINKS: Record<string, { path: string; label: string }> = {
  score_improvement: { path: "/akademi/benim-yolum", label: "Yoluma Git" },
  onboarding_task: { path: "/akademi/genel-egitimler", label: "Eğitimlere Git" },
  gate_exam: { path: "/akademi/benim-yolum", label: "Gate Sınavına Git" },
  gate_proximity: { path: "/akademi/benim-yolum", label: "Yoluma Git" },
  kpi_signal: { path: "/akademi/benim-yolum", label: "Detayları Gör" },
};

const RISK_TYPE_LABELS: Record<string, string> = {
  low_composite: "Düşük Genel Skor",
  low_training: "Düşük Eğitim Skoru",
  onboarding_overdue: "Onboarding Gecikmiş",
};

const RUN_TYPE_LABELS: Record<string, string> = {
  employee_nba: "Employee NBA",
  supervisor_risk: "Supervisor Risk",
  coach_summary: "Coach Summary",
};

const SCOPE_LABELS: Record<string, string> = {
  employee: "Employee",
  supervisor: "Supervisor",
  coach: "Coach",
};

function EmployeePanel({ data }: { data: EmployeePanelData }) {
  const [, setLocation] = useLocation();
  const [detailAction, setDetailAction] = useState<AiAction | null>(null);

  return (
    <div className="space-y-4" data-testid="employee-ai-panel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            AI Asistan - Bugünün Önerileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.actions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-md bg-green-50 dark:bg-green-950/20" data-testid="no-actions-message">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Harika! Şu an için özel bir aksiyon önerisi bulunmuyor.
              </p>
            </div>
          ) : (
            data.actions?.map((action, idx) => {
              const Icon = ACTION_TYPE_ICONS[action.type] || Brain;
              const severityCfg = SEVERITY_CONFIG[action.severity] || SEVERITY_CONFIG.medium;
              const signalLabel = SIGNAL_LABELS[action.signal] || action.signal;
              const linkConfig = ACTION_TYPE_LINKS[action.type];

              return (
                <Card
                  key={idx}
                  className="hover-elevate"
                  data-testid={`action-card-${idx}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-md ${
                        action.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                        action.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          action.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                          action.severity === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`action-title-${idx}`}>
                            {action.title}
                          </span>
                          <Badge variant={severityCfg.variant as any} data-testid={`action-severity-${idx}`}>
                            {severityCfg.label}
                          </Badge>
                          <Badge variant="outline" data-testid={`action-signal-${idx}`}>
                            {signalLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`action-reason-${idx}`}>
                          {action.reason}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{action.estimatedMinutes} dk</span>
                          </div>
                          {action.deepLink ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(action.deepLink!)}
                              data-testid={`button-action-go-${idx}`}
                            >
                              {linkConfig?.label || "Detayları Gör"}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDetailAction(action)}
                              data-testid={`button-action-detail-${idx}`}
                            >
                              Detayları Gör
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          <p className="text-xs text-muted-foreground text-right" data-testid="analyzed-at">
            Son analiz: {new Date(data.analyzedAt).toLocaleString("tr-TR")}
          </p>
        </CardContent>
      </Card>
      <Dialog open={!!detailAction} onOpenChange={(open) => !open && setDetailAction(null)}>
        <DialogContent data-testid="action-detail-dialog">
          <DialogHeader>
            <DialogTitle>{detailAction?.title}</DialogTitle>
            <DialogDescription>
              {detailAction?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {detailAction?.description && (
              <p className="text-sm text-foreground">{detailAction.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Tahmini süre: {detailAction?.estimatedMinutes} dk</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupervisorPanel({ data }: { data: SupervisorPanelData }) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-4" data-testid="supervisor-ai-panel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            AI Risk Sinyalleri - Ekibiniz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="team-stats-row">
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold" data-testid="stat-total-members">
                {data.teamStats.totalMembers}
              </div>
              <div className="text-xs text-muted-foreground">Toplam Ekip</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-lg font-semibold" data-testid="stat-at-risk">
                {data.teamStats.atRiskCount}
              </div>
              <div className="text-xs text-muted-foreground">Risk Altında</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold" data-testid="stat-avg-score">
                {data.teamStats.avgScore}
              </div>
              <div className="text-xs text-muted-foreground">Ort. Skor</div>
            </div>
          </div>

          {data.riskSignals.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-md bg-green-50 dark:bg-green-950/20" data-testid="no-risk-message">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Ekibiniz iyi durumda
              </p>
            </div>
          ) : (
            data.riskSignals?.map((signal, idx) => (
              <Card key={idx} className="hover-elevate" data-testid={`risk-card-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`risk-name-${idx}`}>
                          {signal.name}
                        </span>
                        <Badge variant="secondary" data-testid={`risk-role-${idx}`}>
                          {signal.role}
                        </Badge>
                        <Badge variant="destructive" data-testid={`risk-type-${idx}`}>
                          {RISK_TYPE_LABELS[signal.riskType] || signal.riskType}
                        </Badge>
                      </div>
                      {signal.threshold > 0 && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-red-600 dark:text-red-400 font-medium" data-testid={`risk-score-${idx}`}>
                            Skor: {signal.currentScore}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground" data-testid={`risk-threshold-${idx}`}>
                            Eşik: {signal.threshold}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`risk-action-${idx}`}>
                        {signal.suggestedAction}
                      </p>
                      <div className="flex items-center justify-end mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/personel/${signal.userId}`)}
                          data-testid={`button-view-employee-${idx}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Görüntüle
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <p className="text-xs text-muted-foreground text-right" data-testid="analyzed-at">
            Son analiz: {new Date(data.analyzedAt).toLocaleString("tr-TR")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function exportLogsToCsv(logs: AiLogEntry[]) {
  const headers = ["Timestamp", "Run Type", "Scope", "Actions", "Status", "Time (ms)"];
  const rows = (Array.isArray(logs) ? logs : []).map((log) => [
    new Date(log.createdAt).toISOString(),
    log.runType,
    log.targetRoleScope,
    String(log.actionCount ?? 0),
    log.status || "unknown",
    String(log.executionTimeMs ?? ""),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-agent-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function CoachPanel({ data }: { data: CoachPanelData }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalTriggers =
    Number(data.triggerSummary.employeeRuns) +
    Number(data.triggerSummary.supervisorRuns) +
    Number(data.triggerSummary.coachRuns);

  const getPercent = (val: number) =>
    totalTriggers > 0 ? Math.round((val / totalTriggers) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="coach-ai-panel">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Agent Leader Console
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {data.systemStats.lastRunAt && (
                <Badge variant="outline" data-testid="last-run-indicator">
                  <Activity className="h-3 w-3 mr-1" />
                  Last: {new Date(data.systemStats.lastRunAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              )}
              <Badge variant="outline" data-testid="execution-time-indicator">
                <Clock className="h-3 w-3 mr-1" />
                {data.systemStats.executionTimeMs} ms
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportLogsToCsv(data.recentLogs)}
                disabled={data.recentLogs.length === 0}
                data-testid="button-csv-export"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="system-stats-row">
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="text-lg font-semibold" data-testid="stat-total-runs">
                {data.systemStats.totalRuns}
              </div>
              <div className="text-xs text-muted-foreground">Total Runs</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="text-lg font-semibold" data-testid="stat-today-runs">
                {data.systemStats.todayRuns}
              </div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="text-lg font-semibold" data-testid="stat-avg-actions">
                {data.systemStats.avgActionsGenerated}
              </div>
              <div className="text-xs text-muted-foreground">Avg Actions</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className={`text-lg font-semibold ${Number(data.systemStats.errorCount) > 0 ? 'text-red-600 dark:text-red-400' : ''}`} data-testid="stat-error-count">
                {data.systemStats.errorCount}
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3" />
                Errors
              </div>
            </div>
          </div>

          <div data-testid="trigger-summary">
            <h4 className="text-sm font-medium mb-2">Trigger Breakdown</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs w-20 text-muted-foreground">Employee</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${getPercent(Number(data.triggerSummary.employeeRuns))}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right" data-testid="trigger-employee-count">
                  {data.triggerSummary.employeeRuns}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-20 text-muted-foreground">Supervisor</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${getPercent(Number(data.triggerSummary.supervisorRuns))}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right" data-testid="trigger-supervisor-count">
                  {data.triggerSummary.supervisorRuns}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-20 text-muted-foreground">Coach</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${getPercent(Number(data.triggerSummary.coachRuns))}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right" data-testid="trigger-coach-count">
                  {data.triggerSummary.coachRuns}
                </span>
              </div>
            </div>
          </div>

          <div data-testid="recent-logs-section">
            <h4 className="text-sm font-medium mb-2">Recent Logs</h4>
            <div className="space-y-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <span>Timestamp</span>
                <span>Run Type</span>
                <span>Scope</span>
                <span className="text-right">Actions</span>
                <span className="text-center">Status</span>
                <span className="text-right">Time (ms)</span>
              </div>
              {data.recentLogs?.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <div key={log.id} data-testid={`log-row-${log.id}`}>
                    <button
                      className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-2 py-2 text-xs rounded-md hover-elevate items-center"
                      onClick={() => toggleRow(log.id)}
                      data-testid={`toggle-log-${log.id}`}
                    >
                      <span className="text-left truncate">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-left">
                        <Badge variant="secondary">
                          {RUN_TYPE_LABELS[log.runType] || log.runType}
                        </Badge>
                      </span>
                      <span className="text-left">
                        <Badge variant="outline">
                          {SCOPE_LABELS[log.targetRoleScope] || log.targetRoleScope}
                        </Badge>
                      </span>
                      <span className="text-right font-medium">
                        {log.actionCount ?? 0}
                      </span>
                      <span className="text-center">
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>
                          {log.status || "unknown"}
                        </Badge>
                      </span>
                      <span className="text-right flex items-center justify-end gap-1">
                        {log.executionTimeMs ?? "-"}
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        )}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-3 py-2 ml-2 mb-1 rounded-md bg-muted/50 text-xs space-y-2" data-testid={`log-detail-${log.id}`}>
                        {log.inputSummary && (
                          <div>
                            <span className="font-medium text-muted-foreground">Input: </span>
                            <code className="break-all">{log.inputSummary}</code>
                          </div>
                        )}
                        {log.outputSummary && (
                          <div>
                            <span className="font-medium text-muted-foreground">Output: </span>
                            <code className="break-all">{log.outputSummary}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {data.recentLogs.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground" data-testid="no-logs-message">
                  No logs recorded yet
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcademyAiPanel() {
  const { toast } = useToast();

  const { data, isLoading, error, refetch, isError } = useQuery<AiPanelData>({
    queryKey: ["/api/academy/ai-panel"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 max-w-3xl mx-auto" data-testid="ai-panel-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 max-w-3xl mx-auto" data-testid="ai-panel-error">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Veri yüklenemedi"}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-1" />
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto" data-testid="ai-panel-container">
      <div className="flex items-center justify-end mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/academy/ai-panel"] });
            toast({ title: data.viewMode === "coach" ? "Refreshing..." : "Yenileniyor..." });
          }}
          data-testid="button-refresh-panel"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          {data.viewMode === "coach" ? "Refresh" : "Yenile"}
        </Button>
      </div>

      {data.viewMode === "employee" && <EmployeePanel data={data as EmployeePanelData} />}
      {data.viewMode === "supervisor" && <SupervisorPanel data={data as SupervisorPanelData} />}
      {data.viewMode === "coach" && <CoachPanel data={data as CoachPanelData} />}
    </div>
  );
}
