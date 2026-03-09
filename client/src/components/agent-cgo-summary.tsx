import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ArrowUpRight,
  Loader2,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface RoutingStat {
  role: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface AgentAction {
  id: number;
  runId: number | null;
  actionType: string;
  targetUserId: number | null;
  targetRoleScope: string | null;
  branchId: number | null;
  title: string;
  description: string | null;
  deepLink: string | null;
  severity: string;
  status: string;
  approvedByUserId: number | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  expiresAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

interface OutcomeStat {
  outcome: string;
  total: number;
}

interface CGOSummaryData {
  routingStats: RoutingStat[];
  escalatedActions: AgentAction[];
  outcomeStats: OutcomeStat[];
  strategicActions: AgentAction[];
}

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  improved: {
    label: "İyileşme",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: TrendingUp,
  },
  declined: {
    label: "Düşüş",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: TrendingDown,
  },
  unchanged: {
    label: "Değişim yok",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    icon: Minus,
  },
  no_data: {
    label: "Veri yok",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: HelpCircle,
  },
};

export function AgentCGOSummary() {
  const { toast } = useToast();

  const summaryQuery = useQuery<CGOSummaryData>({
    queryKey: ["/api/agent/cgo-summary"],
    refetchInterval: 120000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/agent/actions/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/cgo-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Öneri onaylandı" });
    },
    onError: () => {
      toast({ title: "Onaylama hatası", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/agent/actions/${id}/reject`, { reason: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/cgo-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Öneri reddedildi" });
    },
    onError: () => {
      toast({ title: "Reddetme hatası", variant: "destructive" });
    },
  });

  const takeOverMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/agent/actions/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/cgo-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      toast({ title: "Eskalasyon devralındı" });
    },
    onError: () => {
      toast({ title: "Devralma hatası", variant: "destructive" });
    },
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = summaryQuery.data;
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-summary">
        Özet verisi yüklenemedi.
      </div>
    );
  }

  const totalOutcome = data.outcomeStats.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6" data-testid="agent-cgo-summary">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4" />
          Yönlendirme İstatistikleri
        </h3>
        {data.routingStats.length === 0 ? (
          <div className="text-sm text-muted-foreground">Henüz yönlendirme verisi yok.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.routingStats.map((stat) => (
              <Card key={stat.role} data-testid={`card-routing-stat-${stat.role}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{stat.role}</span>
                    <Badge variant="outline" className="ml-auto">{stat.total}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid={`text-routing-approved-${stat.role}`}>
                        {stat.approved}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Onay</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-600 dark:text-red-400" data-testid={`text-routing-rejected-${stat.role}`}>
                        {stat.rejected}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Red</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400" data-testid={`text-routing-pending-${stat.role}`}>
                        {stat.pending}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Bekleyen</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4" />
          Sonuç Takibi
        </h3>
        {data.outcomeStats.length === 0 ? (
          <div className="text-sm text-muted-foreground">Henüz sonuç verisi yok.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.outcomeStats.map((stat) => {
              const config = OUTCOME_LABELS[stat.outcome] || OUTCOME_LABELS.no_data;
              const Icon = config.icon;
              const pct = totalOutcome > 0 ? Math.round((stat.total / totalOutcome) * 100) : 0;
              return (
                <Card key={stat.outcome} data-testid={`card-outcome-${stat.outcome}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`p-2 rounded-md ${config.color} shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-lg font-bold" data-testid={`text-outcome-total-${stat.outcome}`}>
                        {stat.total}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {config.label} (%{pct})
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Stratejik Öneriler
          </h3>
          <Link href="/agent-merkezi">
            <Button variant="ghost" size="sm" data-testid="link-full-management">
              Tüm Öneriler
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        {data.strategicActions.length === 0 ? (
          <div className="text-sm text-muted-foreground" data-testid="text-no-strategic">
            Bekleyen stratejik öneri yok.
          </div>
        ) : (
          <div className="space-y-2">
            {data.strategicActions.map((action) => (
              <Card key={action.id} data-testid={`card-strategic-${action.id}`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" data-testid={`text-strategic-title-${action.id}`}>
                      {action.title}
                    </div>
                    {action.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {action.description}
                      </p>
                    )}
                  </div>
                  {action.status === "pending" && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-green-600 dark:text-green-400"
                        onClick={() => approveMutation.mutate(action.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-strategic-${action.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => rejectMutation.mutate(action.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-strategic-${action.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4" />
          Eskalasyonlar
        </h3>
        {data.escalatedActions.length === 0 ? (
          <div className="text-sm text-muted-foreground" data-testid="text-no-escalations">
            Bekleyen eskalasyon yok.
          </div>
        ) : (
          <div className="space-y-2">
            {data.escalatedActions.map((action) => (
              <Card key={action.id} data-testid={`card-escalation-${action.id}`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <ArrowUpRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" data-testid={`text-escalation-title-${action.id}`}>
                      {action.title}
                    </div>
                    {action.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {action.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => takeOverMutation.mutate(action.id)}
                    disabled={takeOverMutation.isPending}
                    data-testid={`button-takeover-${action.id}`}
                  >
                    Devral
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}