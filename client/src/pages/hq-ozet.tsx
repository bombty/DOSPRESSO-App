import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SmartNotificationDialog } from "@/components/smart-notification-dialog";
import {
  Building2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Factory,
  Package,
  ShoppingCart,
  ExternalLink,
  Star,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Store,
  BarChart3,
  ArrowRightLeft,
  Bot,
} from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import { DobodySuggestionList, type DobodySuggestion } from "@/components/dobody-suggestion-card";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";
import { DashboardModeToggle } from "@/components/mission-control/DashboardModeToggle";
import { DashboardRouter } from "@/components/mission-control/DashboardRouter";
import { DobodyPanel, DobodyMobileCard } from "@/components/mission-control/DobodyPanel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface HQSummaryData {
  branchStatus: {
    normal: number;
    warning: number;
    critical: number;
    total: number;
  };
  branchRanking: Array<{
    id: number;
    name: string;
    avgRating: number;
    feedbackCount: number;
    status: string;
  }>;
  factory: {
    todayProduction: number;
    wasteCount: number;
    wastePercentage: number;
    pendingShipments: number;
  };
  pendingOrders: number;
  openTickets: number;
  slaBreaches: number;
  activeUsers: number;
  suggestions: Array<{
    id: string;
    message: string;
    actionType: string;
    actionLabel: string;
    priority: string;
    icon: string;
    payload?: Record<string, any>;
  }>;
}

function StatusCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-2.5 flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-base font-bold tabular-nums">{value}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDelegatedModulePath(moduleKey: string): string {
  const pathMap: Record<string, string> = {
    crm_teknik:    '/hq-destek',
    crm_lojistik:  '/hq-destek',
    crm_muhasebe:  '/hq-destek',
    crm_marketing: '/hq-destek',
    crm_ik:        '/hq-destek',
    akademi:       '/akademi',
    raporlar:      '/raporlar',
  };
  return pathMap[moduleKey] ?? '/';
}

export default function HQOzet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMissionControl, isLoading: modeLoading } = useDashboardMode();
  const [smartNotifOpen, setSmartNotifOpen] = useState(false);
  const [smartNotifSuggestion, setSmartNotifSuggestion] = useState<DobodySuggestion | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<HQSummaryData>({
    queryKey: ["/api/hq-summary"],
    enabled: !isMissionControl && !modeLoading,
  });

  const { data: activeDelegations = [] } = useQuery<any[]>({
    queryKey: ['/api/delegations/active'],
  });

  const { data: agentSummary } = useQuery<any>({
    queryKey: ["/api/agent/actions/summary"],
    queryFn: async () => {
      const res = await fetch("/api/agent/actions/summary", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
  });

  const quickAction = useMutation({
    mutationFn: async (action: any) => {
      const res = await apiRequest("POST", "/api/quick-action", action);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.details) {
        const d = data.details;
        const time = d.sentAt ? new Date(d.sentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        toast({
          title: "Bildirim Gönderildi",
          description: `${d.recipientName}${d.recipientRole ? ` (${d.recipientRole})` : ""}${d.branch ? ` — ${d.branch}` : ""}${time ? ` • ${time}` : ""}`,
        });
      } else {
        toast({ title: "İşlem tamamlandı" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/hq-summary"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem gerçekleştirilemedi", variant: "destructive" });
    },
  });

  const handleSuggestionAction = useCallback((s: DobodySuggestion) => {
    if (s.actionType === "send_notification" || s.actionType === "send_message") {
      setSmartNotifSuggestion(s);
      setSmartNotifOpen(true);
    } else {
      const actionPayload: any = {
        actionType: s.actionType,
        suggestionId: s.id,
        title: s.actionLabel,
        message: s.message,
        ...(s.targetUserId ? { targetUserId: s.targetUserId } : {}),
        ...(s.payload ? { payload: s.payload } : {}),
      };
      quickAction.mutate(actionPayload);
    }
  }, [quickAction]);

  if (modeLoading) {
    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto" data-testid="hq-ozet-loading">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    );
  }

  if (isMissionControl) {
    return (
      <div className="flex h-full" data-testid="hq-mission-control-wrapper">
        <div className="hidden md:flex">
          <DobodyPanel />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="md:hidden">
            <DobodyMobileCard />
          </div>
          <DashboardRouter />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto" data-testid="hq-ozet-loading">
        <Skeleton className="h-6 w-2/3" />
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 max-w-[1200px] mx-auto" data-testid="hq-ozet-error">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Veriler yüklenemedi</CardContent></Card>
      </div>
    );
  }

  const topBranches = data.branchRanking.filter((b) => b.avgRating >= 3.5).slice(0, 5);
  const bottomBranches = data.branchRanking.filter((b) => b.avgRating > 0 && b.avgRating < 3.5).slice(-5).reverse();

  return (
    <div className="p-4 space-y-4 max-w-[1200px] mx-auto overflow-y-auto h-full" data-testid="hq-ozet-page">
      <div className="flex justify-end">
        <DashboardModeToggle />
      </div>
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div className="space-y-3 mb-2" data-testid="hq-ci-section">
        <DashboardAlertPills pills={[
          ...(data.slaBreaches > 0 ? [{ label: `${data.slaBreaches} SLA Ihlali`, variant: 'red' as const, dot: true }] : []),
          ...(data.openTickets > 0 ? [{ label: `${data.openTickets} Açık Ticket`, variant: 'orange' as const, dot: true }] : []),
          ...(data.branchStatus.critical > 0 ? [{ label: `${data.branchStatus.critical} Kritik Şube`, variant: 'red' as const, dot: true }] : []),
          { label: `${data.branchStatus.total} Aktif Şube`, variant: 'green' as const, dot: true },
          ...activeDelegations.map((del: any) => ({ label: `${del.moduleName} devredildi`, variant: 'blue' as const, dot: true })),
          ...(data.slaBreaches === 0 && data.openTickets === 0 && data.branchStatus.critical === 0 ? [{ label: 'Sistem normal', variant: 'green' as const, dot: true }] : []),
        ]} />

        <UnifiedKPI variant="compact" desktopColumns={4} items={[
          { value: String(data.branchStatus.total), label: 'Sube' },
          { value: String(data.slaBreaches ?? 0), label: 'SLA Ihlali', color: (data.slaBreaches ?? 0) > 0 ? 'danger' as const : 'default' as const },
          { value: String(data.openTickets ?? 0), label: 'Açık Ticket', color: (data.openTickets ?? 0) > 10 ? 'warning' as const : 'default' as const },
          { value: String(data.activeUsers ?? 0), label: 'Aktif Kullanici' },
        ]} />

        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Hızlı Erişim
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <ModuleCard label="İletişim M." sublabel="Şube Talepleri" path="/hq-destek" icon={<MessageSquare className="w-8 h-8 text-red-600 dark:text-red-400" />} gradient="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900" />
            <ModuleCard label="Akademi" sublabel="Eğitim & Gelişim" path="/akademi" icon={<GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />} gradient="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900" />
            <ModuleCard label="Şubeler" sublabel={`${data.branchStatus.total} Şube`} path="/subeler" icon={<Store className="w-8 h-8 text-purple-600 dark:text-purple-400" />} gradient="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900" />
            <ModuleCard label="Raporlar" sublabel="Analiz & KPI" path="/raporlar" icon={<BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />} gradient="bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900" />
            {activeDelegations.map((del: any) => (
              <ModuleCard
                key={del.moduleKey}
                label={del.moduleName}
                sublabel="Devral\u0131nan mod\u00fcl"
                path={getDelegatedModulePath(del.moduleKey)}
                icon={<ArrowRightLeft className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
                gradient="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900"
                badge="DEV\u0130R"
                badgeVariant="blue"
                className="ring-2 ring-blue-300 dark:ring-blue-700"
              />
            ))}
          </div>
        </div>
      </div>

      <div data-testid="hq-header">
        <h1 className="text-xl font-bold" data-testid="text-hq-title">HQ Genel Bakış</h1>
        <p className="text-sm text-muted-foreground">{data.branchStatus.total} şube</p>
      </div>

      <div className="grid grid-cols-3 gap-3" data-testid="status-grid">
        <StatusCard
          icon={CheckCircle2}
          label="Normal"
          value={data.branchStatus.normal}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatusCard
          icon={AlertTriangle}
          label="Dikkat"
          value={data.branchStatus.warning}
          color="bg-orange-500/10 text-orange-500"
        />
        <StatusCard
          icon={AlertOctagon}
          label="Kritik"
          value={data.branchStatus.critical}
          color="bg-red-500/10 text-red-500"
        />
      </div>

      <Card data-testid="card-factory">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Fabrika Özet
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1" data-testid="stat-production">
              <div className="text-lg font-bold">{data.factory.todayProduction}</div>
              <div className="text-xs text-muted-foreground">Bugünün Üretimi</div>
            </div>
            <div className="space-y-1" data-testid="stat-waste">
              <div className="text-lg font-bold">
                %{data.factory.wastePercentage}
              </div>
              <div className="text-xs text-muted-foreground">Fire Oranı</div>
            </div>
            <div className="space-y-1" data-testid="stat-shipments">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">{data.factory.pendingShipments}</span>
              </div>
              <div className="text-xs text-muted-foreground">Bekleyen Sevkiyat</div>
            </div>
            <div className="space-y-1" data-testid="stat-orders">
              <div className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4 text-purple-500" />
                <span className="text-lg font-bold">{data.pendingOrders}</span>
              </div>
              <div className="text-xs text-muted-foreground">Bekleyen Sipariş</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {agentSummary && Number(agentSummary.pending) > 0 && (
        <Card className="border-amber-500/30" data-testid="card-agent-pending">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-amber-500" />
              Mr. Dobody — Onay Bekleyen Aksiyonlar
              <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                {agentSummary.pending}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm text-muted-foreground mb-3">
              {agentSummary.critical > 0 && (
                <span className="text-red-500 font-medium">{agentSummary.critical} kritik · </span>
              )}
              {agentSummary.pending} aksiyon onayınızı bekliyor
            </p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => window.location.href = '/agent-merkezi'}>
              <ExternalLink className="h-3.5 w-3.5" />
              Agent Merkezi'ne Git
            </Button>
          </CardContent>
        </Card>
      )}

      <DobodySuggestionList
        suggestions={data.suggestions || []}
        onAction={handleSuggestionAction}
        isPending={quickAction.isPending}
      />

      {(topBranches.length > 0 || bottomBranches.length > 0) && (
        <Card data-testid="card-branch-ranking">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Şube Sıralaması
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {topBranches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">En iyi şubeler</p>
                {topBranches.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 py-1" data-testid={`branch-top-${b.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm truncate">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-sm font-medium">{b.avgRating}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bottomBranches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Dikkat gereken şubeler</p>
                {bottomBranches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 py-1" data-testid={`branch-bottom-${b.id}`}>
                    <span className="text-sm truncate">{b.name}</span>
                    <Badge variant="outline" className={`text-xs ${b.status === "critical" ? "text-red-500 border-red-500/30" : "text-orange-500 border-orange-500/30"}`}>
                      {b.avgRating}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="pb-4 flex gap-2">
        <Link href="/hq-dashboard" className="flex-1">
          <Button variant="outline" className="w-full" data-testid="btn-hq-dashboard">
            <ExternalLink className="h-4 w-4 mr-2" />
            HQ Dashboard
          </Button>
        </Link>
        <Link href="/ceo-command-center" className="flex-1">
          <Button variant="outline" className="w-full" data-testid="btn-ceo-center">
            <Building2 className="h-4 w-4 mr-2" />
            Komut Merkezi
          </Button>
        </Link>
      </div>

      <SmartNotificationDialog
        open={smartNotifOpen}
        onOpenChange={setSmartNotifOpen}
        suggestion={smartNotifSuggestion ? {
          id: smartNotifSuggestion.id,
          message: smartNotifSuggestion.message,
          actionLabel: smartNotifSuggestion.actionLabel,
          priority: smartNotifSuggestion.priority,
          targetUserId: smartNotifSuggestion.targetUserId,
          payload: smartNotifSuggestion.payload,
          branchId: smartNotifSuggestion.payload?.branchId,
          branchName: smartNotifSuggestion.payload?.branchName,
        } : null}
      />
    </div>
  );
}
