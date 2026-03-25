import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { ActivityTimeline } from "@/components/widgets/activity-timeline";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import DateRangeFilter, { type PeriodType } from "@/components/dashboard/DateRangeFilter";
import BranchComparisonTable from "@/components/dashboard/BranchComparisonTable";
import TrendChart from "@/components/dashboard/TrendChart";
import AlertPanel from "@/components/dashboard/AlertPanel";
import {
  Building2,
  AlertTriangle,
  Users,
  ArrowRight,
  MessageSquare,
  Calendar,
  Factory,
  BarChart3,
  TrendingUp,
  ClipboardList,
  Zap,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface HQSummaryData {
  branchStatus: { normal: number; warning: number; critical: number };
  totalStaff: number;
  activeStaff: number;
  activeUsers: number;
  slaBreaches: number;
  openTickets: number;
  factorySummary?: {
    todayProduction: number;
    wasteCount: number;
    wastePercentage: number;
    pendingShipments: number;
  };
  branchRanking: Array<{ id: number; name: string; avgRating: number; feedbackCount: number; status: string }>;
}

interface QCStatsData {
  today: { total: number; pending: number; approved: number; rejected: number; passRate: number };
  week: { total: number; pending: number; approved: number; rejected: number; passRate: number };
  lots?: { today: { total: number; kaliteBekliyor: number; onaylandi: number; reddedildi: number } };
}

interface IKDashboardData {
  documents: { total: number; verified: number; completionRate: number; expiringSoon: number };
  disciplinary: { total: number; open: number };
}

interface ExecutiveDashboardData {
  _meta: { dataAvailable: boolean; lastDataDate: string };
  kpis: {
    totalBranches: number;
    totalStaff: number;
    avgHealthScore: number | null;
    totalTickets: number;
    slaBreaches: number;
    avgCustomerRating: number | null;
    totalFaults: number;
    totalRevenue: number | null;
  };
  branchComparison: Array<{
    branchId: number;
    name: string;
    healthScore: number | null;
    staffCount: number;
    attendanceRate: number | null;
    taskCompletionRate: number | null;
    customerRating: number | null;
    slaBreaches: number;
    faultCount: number;
  }>;
  trends: Array<{ month: string; tickets: number; faults: number }>;
  alerts: Array<{ type: "critical" | "warning" | "positive"; message: string; branchId?: number }>;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Sistem Yöneticisi",
  ceo: "CEO",
  cgo: "CGO",
  coach: "Koç",
  trainer: "Eğitmen",
  muhasebe_ik: "Muhasebe & İK",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  kalite_kontrol: "Kalite Kontrol",
  gida_muhendisi: "Gıda Mühendisi",
  teknik: "Teknik",
  destek: "Destek",
  marketing: "Pazarlama",
};

const EXEC_ROLES = ["admin", "ceo", "cgo"];
const IK_ACCESS_ROLES = ["admin", "muhasebe_ik", "ceo", "cgo"];

function KPICell({ label, value, color, subtext }: {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30" data-testid={`mc-kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <span className={`text-xl font-semibold leading-tight ${color || ""}`}>{value}</span>
      <span className="text-[8px] uppercase tracking-wide text-muted-foreground font-medium mt-0.5">{label}</span>
      {subtext && <span className="text-[9px] text-muted-foreground/70">{subtext}</span>}
    </div>
  );
}

function BranchCard({ branch }: { branch: { id: number; name: string; avgRating: number; feedbackCount: number; status: string } }) {
  const initials = branch.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const statusColor = branch.status === "critical" ? "bg-destructive" : branch.status === "warning" ? "bg-amber-500" : "bg-emerald-500";
  const healthPercent = Math.min(100, Math.max(0, (branch.avgRating / 5) * 100));

  return (
    <Card className="hover-elevate" data-testid={`mc-branch-card-${branch.id}`}>
      <CardContent className="p-2.5 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium truncate">{branch.name}</span>
            <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${statusColor}`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {branch.avgRating > 0 ? `${branch.avgRating.toFixed(1)}` : "—"}
            </span>
          </div>
          {branch.feedbackCount > 0 && (
            <span className="text-[9px] text-muted-foreground">{branch.feedbackCount} geri bildirim</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: "İletişim", icon: MessageSquare, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", path: "/hq-destek" },
    { label: "Vardiya", icon: Calendar, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400", path: "/vardiya-planlama" },
    { label: "Fabrika", icon: Factory, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", path: "/fabrika/dashboard" },
    { label: "Raporlar", icon: BarChart3, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400", path: "/raporlar" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2" data-testid="mc-quick-actions">
      {actions.map(a => (
        <Link key={a.path} href={a.path}>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover-elevate cursor-pointer bg-muted/20">
            <div className={`w-9 h-9 rounded-lg ${a.color} flex items-center justify-center`}>
              <a.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function MissionControlHQ() {
  const { user } = useAuth();
  const role = user?.role || "";
  const hasIKAccess = IK_ACCESS_ROLES.includes(role);
  const isExec = EXEC_ROLES.includes(role);

  const [period, setPeriod] = useState<PeriodType>("this_month");
  const [customStart, setCustomStart] = useState<string>();
  const [customEnd, setCustomEnd] = useState<string>();

  const { data: hqSummary, isLoading } = useQuery<HQSummaryData>({
    queryKey: ["/api/hq-summary"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: qcStats } = useQuery<QCStatsData>({
    queryKey: ["/api/factory/qc/stats"],
    staleTime: 3 * 60 * 1000,
  });

  const { data: ikData } = useQuery<IKDashboardData>({
    queryKey: ["/api/hr/ik-dashboard"],
    staleTime: 3 * 60 * 1000,
    enabled: hasIKAccess,
  });

  const { data: briefingData, isLoading: briefingLoading } = useQuery<{
    summary: string;
    highlights: string[];
    actionItems: string[];
    generatedAt: string;
    cached: boolean;
  }>({
    queryKey: ["/api/me/dashboard-briefing"],
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const execQueryParams = new URLSearchParams({ period });
  if (period === "custom" && customStart && customEnd) {
    execQueryParams.set("startDate", customStart);
    execQueryParams.set("endDate", customEnd);
  }

  const { data: execData } = useQuery<ExecutiveDashboardData>({
    queryKey: ["/api/dashboard/executive", period, customStart, customEnd],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/executive?${execQueryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Dashboard fetch failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    enabled: isExec,
  });

  const branchStatus = hqSummary?.branchStatus;
  const totalBranches = (branchStatus?.normal ?? 0) + (branchStatus?.warning ?? 0) + (branchStatus?.critical ?? 0);
  const firstName = user?.firstName || "Kullanıcı";
  const initials = `${(user?.firstName || "?")[0]}${(user?.lastName || "?")[0]}`.toUpperCase();
  const roleLabel = ROLE_LABELS[role] || role;
  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const handlePeriodChange = (p: PeriodType, start?: string, end?: string) => {
    setPeriod(p);
    setCustomStart(start);
    setCustomEnd(end);
  };

  const alertCount = execData?.alerts?.length ?? 0;
  const criticalAlerts = execData?.alerts?.filter(a => a.type === "critical").length ?? 0;
  const factorySummary = hqSummary?.factorySummary;
  const qcToday = qcStats?.today;

  const branchHealthBadge = branchStatus?.critical
    ? { text: `${branchStatus.critical} kritik`, variant: "danger" as const }
    : branchStatus?.warning
    ? { text: `${branchStatus.warning} uyarı`, variant: "warning" as const }
    : { text: "İyi", variant: "success" as const };

  const factoryBadge = (factorySummary?.wastePercentage ?? 0) > 5
    ? { text: `Fire %${factorySummary?.wastePercentage ?? 0}`, variant: "danger" as const }
    : (qcToday?.pending ?? 0) > 0
    ? { text: `${qcToday?.pending} bekleyen`, variant: "warning" as const }
    : { text: "İyi", variant: "success" as const };

  const ikBadge = ikData
    ? ikData.disciplinary.open > 0
      ? { text: `${ikData.disciplinary.open} açık tutanak`, variant: "warning" as const }
      : { text: `${ikData.documents.total} dosya`, variant: "info" as const }
    : { text: "Veri yok", variant: "muted" as const };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto" data-testid="mc-hq-loading">
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 max-w-4xl mx-auto overflow-y-auto h-full" data-testid="mission-control-hq">
      <div className="flex items-center justify-between gap-3 flex-wrap" data-testid="mc-header">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7" data-testid="mc-user-avatar">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={firstName} />
            <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold leading-tight">Merhaba, {firstName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-5" data-testid="mc-role-badge">{roleLabel}</Badge>
          <DashboardModeToggle />
        </div>
      </div>

      {isExec && (
        <DateRangeFilter
          period={period}
          onPeriodChange={handlePeriodChange}
          data-testid="mc-date-filter"
        />
      )}

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2" data-testid="mc-hq-kpis">
        <KPICell
          label="Şube"
          value={totalBranches}
          subtext={branchStatus?.critical ? `${branchStatus.critical} kritik` : undefined}
        />
        <KPICell
          label="SLA İhlali"
          value={isExec && execData ? execData.kpis.slaBreaches : (hqSummary?.slaBreaches ?? 0)}
          color={(isExec && execData ? execData.kpis.slaBreaches : (hqSummary?.slaBreaches ?? 0)) > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}
        />
        <KPICell
          label={isExec ? "Toplam Ticket" : "Açık Ticket"}
          value={isExec && execData ? execData.kpis.totalTickets : (hqSummary?.openTickets ?? 0)}
          color={(isExec && execData ? execData.kpis.totalTickets : (hqSummary?.openTickets ?? 0)) > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
        <KPICell
          label="Personel"
          value={isExec && execData ? execData.kpis.totalStaff : (hqSummary?.activeUsers ?? "—")}
          color="text-emerald-600 dark:text-emerald-400"
        />
        {isExec && execData ? (
          <KPICell
            label="Müşteri Puan"
            value={execData.kpis.avgCustomerRating ? `${execData.kpis.avgCustomerRating}` : "—"}
            color={execData.kpis.avgCustomerRating && execData.kpis.avgCustomerRating >= 4 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}
          />
        ) : (
          <KPICell
            label="QC Bekleyen"
            value={qcStats?.today?.pending ?? 0}
            color={(qcStats?.today?.pending ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
          />
        )}
      </div>

      {briefingData && briefingData.summary && briefingData.summary !== "AI brifing şu an kullanılamıyor." && (
        <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20" data-testid="mc-ai-briefing">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">AI Brifing</span>
              {briefingData.cached && (
                <Badge variant="outline" className="text-[8px] h-4 ml-auto">Cache</Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed">{briefingData.summary}</p>
            {briefingData.highlights.length > 0 && (
              <div className="space-y-0.5">
                {briefingData.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-[10px] text-primary mt-0.5 flex-shrink-0">*</span>
                    <span className="text-[11px] text-muted-foreground">{h}</span>
                  </div>
                ))}
              </div>
            )}
            {briefingData.actionItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {briefingData.actionItems.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] h-5 font-normal">{a}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {briefingLoading && (
        <Skeleton className="h-20 rounded-lg" data-testid="mc-briefing-loading" />
      )}

      <CollapsibleSection
        title="Bugünün Görevleri"
        icon={<ClipboardList className="w-3.5 h-3.5" />}
        defaultOpen={true}
        data-testid="mc-tasks-section"
      >
        <TodaysTasksWidget />
      </CollapsibleSection>

      {isExec && execData && (
        <CollapsibleSection
          title="Uyarılar"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          badge={alertCount > 0 ? (criticalAlerts > 0 ? `${criticalAlerts} kritik` : `${alertCount} uyarı`) : "Yok"}
          badgeVariant={criticalAlerts > 0 ? "danger" : alertCount > 0 ? "warning" : "success"}
          defaultOpen={alertCount > 0}
          data-testid="mc-alerts-section"
        >
          <AlertPanel alerts={execData.alerts} grouped={true} />
        </CollapsibleSection>
      )}

      {isExec && execData && execData.branchComparison.length > 0 && (
        <CollapsibleSection
          title="Şube Sağlığı"
          icon={<Building2 className="w-3.5 h-3.5" />}
          badge={branchHealthBadge.text}
          badgeVariant={branchHealthBadge.variant}
          defaultOpen={true}
          headerRight={
            <Link href="/operasyon">
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
                Tümü <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          }
          data-testid="mc-branch-health-section"
        >
          <BranchComparisonTable data={execData.branchComparison} />
        </CollapsibleSection>
      )}

      {isExec && execData && (
        <CollapsibleSection
          title="Trend"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          defaultOpen={false}
          data-testid="mc-trend-section"
        >
          <TrendChart
            title="6 Aylık Trend"
            data={execData.trends}
            xKey="month"
            lines={[
              { key: "tickets", color: "#f59e0b", name: "Ticket" },
              { key: "faults", color: "#ef4444", name: "Arıza" },
            ]}
          />
        </CollapsibleSection>
      )}

      {!isExec && (
        <CollapsibleSection
          title="Şube Durumu"
          icon={<Building2 className="w-3.5 h-3.5" />}
          badge={`${totalBranches} şube`}
          badgeVariant={branchHealthBadge.variant}
          defaultOpen={true}
          headerRight={
            <Link href="/operasyon">
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
                Tümü <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          }
          data-testid="mc-branch-grid-section"
        >
          {(hqSummary?.branchRanking || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(hqSummary?.branchRanking || []).slice(0, 6).map(b => (
                <BranchCard key={b.id} branch={b} />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-xs">
              Şube verisi henüz yok
            </div>
          )}
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Fabrika & Kalite Kontrol"
        icon={<Factory className="w-3.5 h-3.5" />}
        badge={factoryBadge.text}
        badgeVariant={factoryBadge.variant}
        defaultOpen={false}
        headerRight={
          <Link href="/fabrika/dashboard">
            <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
              Detay <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        }
        data-testid="mc-factory-qc-section"
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <span className="text-lg font-semibold">{factorySummary?.todayProduction ?? 0}</span>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bugün üretim</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <span className={`text-lg font-semibold ${(factorySummary?.wastePercentage ?? 0) > 5 ? "text-destructive" : ""}`}>
              %{factorySummary?.wastePercentage ?? 0}
            </span>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Fire oranı</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <span className={`text-lg font-semibold ${(qcToday?.pending ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {qcToday?.pending ?? 0}
            </span>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">QC bekleyen</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              %{qcToday?.passRate ?? 0}
            </span>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">QC onay oranı</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Canlı Akış"
        icon={<Zap className="w-3.5 h-3.5" />}
        defaultOpen={false}
        headerRight={
          <Link href="/bildirimler">
            <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
              Tümü <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        }
        data-testid="mc-activity-section"
      >
        <ActivityTimeline />
      </CollapsibleSection>

      {hasIKAccess && (
        <CollapsibleSection
          title="İK & Personel"
          icon={<Users className="w-3.5 h-3.5" />}
          badge={ikBadge.text}
          badgeVariant={ikBadge.variant}
          defaultOpen={false}
          headerRight={
            <Link href="/ik">
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
                Detay <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          }
          data-testid="mc-ik-section"
        >
          {ikData ? (
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <span className="text-base font-semibold">{ikData.documents.total}</span>
                <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Özlük dosya</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{ikData.documents.verified}</span>
                <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Onaylı</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <span className={`text-base font-semibold ${ikData.documents.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {ikData.documents.expiringSoon}
                </span>
                <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Süresi dolan</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <span className={`text-base font-semibold ${ikData.disciplinary.open > 0 ? "text-destructive" : ""}`}>
                  {ikData.disciplinary.open}
                </span>
                <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Açık tutanak</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-xs">
              İK verileri yükleniyor...
            </div>
          )}
        </CollapsibleSection>
      )}

      <QuickActions />
    </div>
  );
}
