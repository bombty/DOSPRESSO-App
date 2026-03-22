import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedHero } from "@/components/widgets/unified-hero";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { ActivityTimeline } from "@/components/widgets/activity-timeline";
import { DashboardKpiStrip, type KpiItem } from "@/components/dashboard-kpi-strip";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { Link } from "wouter";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";

interface BranchSummaryKpis {
  activeStaff: number;
  totalStaff: number;
  checklistCompletion: number;
  customerAvg: number;
  feedbackCount: number;
  warnings: number;
}

interface BranchSummaryResponse {
  branch: { id: number; name: string };
  kpis: BranchSummaryKpis;
  teamStatus: Array<{ id: string; name: string; role: string; checklistStatus: string }>;
  lowStockItems: Array<{ productName: string; currentStock: number; minimumStock: number; unit: string }>;
  suggestions: string[];
}

function StaffStatusCard({ member }: { member: { id: string; name: string; role: string; checklistStatus: string } }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    tamamlandi: { label: "Tamamlandı", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    devam_ediyor: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    beklemede: { label: "Beklemede", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    yapilmadi: { label: "Yapılmadı", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  };

  const status = statusConfig[member.checklistStatus] || { label: member.checklistStatus || "—", color: "bg-muted text-muted-foreground" };

  const roleLabels: Record<string, string> = {
    barista: "Barista",
    stajyer: "Stajyer",
    bar_buddy: "Bar Buddy",
    supervisor: "Supervisor",
    supervisor_buddy: "Sup. Buddy",
    mudur: "Müdür",
  };

  return (
    <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-muted/30" data-testid={`mc-staff-${member.id}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{member.name}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabels[member.role] || member.role}</p>
        </div>
      </div>
      <Badge className={`text-[9px] h-4 px-1.5 ${status.color} border-0`}>
        {status.label}
      </Badge>
    </div>
  );
}

export default function MissionControlSupervisor() {
  const { user } = useAuth();
  const branchId = (user as any)?.branchId;

  const { data: branchSummary, isLoading } = useQuery<BranchSummaryResponse>({
    queryKey: ["/api/branch-summary", branchId],
    queryFn: async () => {
      const r = await fetch(`/api/branch-summary/${branchId}`);
      if (!r.ok) throw new Error(`branch-summary ${r.status}`);
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const kpiItems = useMemo((): KpiItem[] => {
    const kpis = branchSummary?.kpis;
    return [
      {
        value: kpis?.activeStaff?.toString() ?? "—",
        label: "Aktif Personel",
        color: undefined,
      },
      {
        value: kpis?.checklistCompletion != null ? `%${Math.round(kpis.checklistCompletion)}` : "—",
        label: "Checklist",
        color: kpis?.checklistCompletion != null && kpis.checklistCompletion < 70 ? "#dc2626" : undefined,
      },
      {
        value: kpis?.customerAvg != null && kpis.customerAvg > 0 ? `${Number(kpis.customerAvg).toFixed(1)}/5` : "—",
        label: "Müşteri",
        color: kpis?.customerAvg != null && kpis.customerAvg > 0 ? (kpis.customerAvg < 3.5 ? "#dc2626" : "#16a34a") : undefined,
      },
      {
        value: kpis?.warnings != null ? kpis.warnings.toString() : "—",
        label: "Uyarı",
        color: kpis?.warnings != null && kpis.warnings > 0 ? "#dc2626" : undefined,
      },
    ];
  }, [branchSummary]);

  const alertPills = useMemo((): AlertPill[] => {
    const pills: AlertPill[] = [];
    const kpis = branchSummary?.kpis;

    if ((kpis?.warnings ?? 0) > 0) {
      pills.push({ label: `${kpis?.warnings} uyarı`, variant: "red", dot: true });
    }
    if (kpis?.checklistCompletion != null && kpis.checklistCompletion < 70) {
      pills.push({ label: `Checklist %${Math.round(kpis.checklistCompletion)}`, variant: "orange", dot: true });
    }
    if ((branchSummary?.lowStockItems?.length ?? 0) > 0) {
      pills.push({ label: `${branchSummary!.lowStockItems.length} düşük stok`, variant: "orange", dot: true });
    }
    if (kpis?.customerAvg != null && kpis.customerAvg >= 4.0) {
      pills.push({ label: `Müşteri ${Number(kpis.customerAvg).toFixed(1)}/5`, variant: "green", dot: true });
    }
    if (pills.length === 0) {
      pills.push({ label: "Şube normal", variant: "green", dot: true });
    }
    return pills;
  }, [branchSummary]);

  if (!branchId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-6" data-testid="mc-no-branch">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-base font-bold">Şube Ataması Yok</p>
        <p className="text-sm text-muted-foreground">Hesabınıza henüz bir şube atanmamış.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto overflow-y-auto h-full" data-testid="mission-control-supervisor">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold">Mission Control</h1>
          {branchSummary?.branch && (
            <p className="text-xs text-muted-foreground">{branchSummary.branch.name}</p>
          )}
        </div>
        <DashboardModeToggle />
      </div>

      <UnifiedHero />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <DashboardAlertPills pills={alertPills} />
          <DashboardKpiStrip items={kpiItems} />
        </>
      )}

      {branchSummary?.teamStatus && branchSummary.teamStatus.length > 0 && (
        <Card data-testid="mc-team-status">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Ekip Durumu
            </CardTitle>
            <Badge variant="outline" className="text-[10px] h-5">
              {branchSummary.teamStatus.length} kişi
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {branchSummary.teamStatus.map(member => (
              <StaffStatusCard key={member.id} member={member} />
            ))}
          </CardContent>
        </Card>
      )}

      {branchSummary?.lowStockItems && branchSummary.lowStockItems.length > 0 && (
        <Card data-testid="mc-low-stock">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Düşük Stok
            </CardTitle>
            <Link href="/stok">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                Detay <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {branchSummary.lowStockItems.slice(0, 5).map((item, idx) => (
              <div key={`${item.productName}-${idx}`} className="flex items-center justify-between px-2 py-1 rounded-md bg-amber-500/5" data-testid={`mc-stock-${idx}`}>
                <span className="text-xs truncate">{item.productName}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {Number(item.currentStock).toFixed(1)}/{Number(item.minimumStock).toFixed(1)} {item.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <TodaysTasksWidget />

      <ActivityTimeline />
    </div>
  );
}
