import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedHero } from "@/components/widgets/unified-hero";
import { CompactStatsBar } from "@/components/widgets/compact-stats-bar";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { ActivityTimeline } from "@/components/widgets/activity-timeline";
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  FileText,
  ArrowRight,
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
  branchRanking: Array<{ id: number; name: string; avgRating: number; feedbackCount: number; status: string }>;
}

function MCKpiCard({ label, value, icon: Icon, color, subtext, link }: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  color: string;
  subtext?: string;
  link?: string;
}) {
  const content = (
    <Card className={link ? "hover-elevate cursor-pointer" : ""} data-testid={`mc-kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground truncate">{label}</div>
          {subtext && <div className="text-[10px] text-muted-foreground/70">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
}

function BranchHealthGrid({ branches }: { branches: HQSummaryData["branchRanking"] }) {
  if (!branches || branches.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Şube verisi henüz yok
        </CardContent>
      </Card>
    );
  }

  const sorted = [...branches].sort((a, b) => b.avgRating - a.avgRating);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.filter(b => b.avgRating > 0 && b.avgRating < 3.5).slice(-5).reverse();

  return (
    <Card data-testid="mc-branch-health">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          Şube Durumu
        </CardTitle>
        <Link href="/operasyon">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
            Tümü <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {top5.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">En İyi</p>
            <div className="space-y-1">
              {top5.map(b => (
                <div key={b.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30" data-testid={`mc-branch-${b.id}`}>
                  <span className="text-xs font-medium truncate">{b.name}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {b.avgRating > 0 ? `${Number(b.avgRating).toFixed(1)}/5` : "—"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        {bottom5.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Dikkat</p>
            <div className="space-y-1">
              {bottom5.map(b => (
                <div key={b.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-destructive/5" data-testid={`mc-branch-warn-${b.id}`}>
                  <span className="text-xs font-medium truncate">{b.name}</span>
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {Number(b.avgRating).toFixed(1)}/5
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QCStatusMini() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/factory/qc/stats"],
    staleTime: 3 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-20 rounded-lg" />;
  const today = data?.today;
  const passRate = today?.total > 0 ? Math.round(((today.total - (today.pending || 0)) / today.total) * 100) : 0;

  return (
    <MCKpiCard
      label="Kalite Kontrol"
      value={today?.total ?? 0}
      icon={ShieldCheck}
      color="bg-emerald-500 dark:bg-emerald-600"
      subtext={today?.total > 0 ? `%${passRate} geçti · ${today.pending || 0} bekliyor` : "Bugün kontrol yok"}
      link="/fabrika/kalite-kontrol"
    />
  );
}

function IKStatusMini() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/hr/ik-dashboard"],
    staleTime: 3 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-20 rounded-lg" />;
  const docs = data?.documents;
  const disc = data?.disciplinary;

  return (
    <MCKpiCard
      label="İK Durumu"
      value={docs?.total ?? 0}
      icon={FileText}
      color="bg-violet-500 dark:bg-violet-600"
      subtext={`${docs?.verified ?? 0} onaylı · ${disc?.total ?? 0} tutanak`}
      link="/ik"
    />
  );
}

export default function MissionControlHQ() {
  const { user } = useAuth();

  const { data: hqSummary, isLoading } = useQuery<HQSummaryData>({
    queryKey: ["/api/hq-summary"],
    staleTime: 2 * 60 * 1000,
  });

  const branchStatus = hqSummary?.branchStatus;
  const totalBranches = (branchStatus?.normal ?? 0) + (branchStatus?.warning ?? 0) + (branchStatus?.critical ?? 0);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto h-full" data-testid="mission-control-hq">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">Mission Control</h1>
        <DashboardModeToggle />
      </div>

      <UnifiedHero />

      <CompactStatsBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="mc-hq-kpis">
        <MCKpiCard
          label="Şubeler"
          value={totalBranches}
          icon={Building2}
          color="bg-sky-500 dark:bg-sky-600"
          subtext={branchStatus?.critical ? `${branchStatus.critical} kritik` : "Hepsi normal"}
          link="/operasyon"
        />
        <MCKpiCard
          label="Aktif Kullanıcı"
          value={hqSummary?.activeUsers ?? "—"}
          icon={Users}
          color="bg-indigo-500 dark:bg-indigo-600"
          link="/ik"
        />
        <MCKpiCard
          label="SLA İhlali"
          value={hqSummary?.slaBreaches ?? 0}
          icon={AlertTriangle}
          color={(hqSummary?.slaBreaches ?? 0) > 0 ? "bg-destructive" : "bg-emerald-500 dark:bg-emerald-600"}
          subtext={(hqSummary?.slaBreaches ?? 0) > 0 ? "Acil müdahale" : "Temiz"}
          link="/hq-destek"
        />
        <MCKpiCard
          label="Açık Ticket"
          value={hqSummary?.openTickets ?? 0}
          icon={CheckCircle2}
          color="bg-amber-500 dark:bg-amber-600"
          link="/hq-destek"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QCStatusMini />
        <IKStatusMini />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BranchHealthGrid branches={hqSummary?.branchRanking || []} />
        <TodaysTasksWidget />
      </div>

      <ActivityTimeline />
    </div>
  );
}
