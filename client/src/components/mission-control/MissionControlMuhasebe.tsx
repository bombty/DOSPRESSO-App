import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import DateRangeFilter, { type PeriodType } from "@/components/dashboard/DateRangeFilter";
import TrendChart from "@/components/dashboard/TrendChart";
import EmptyStateCard from "@/components/dashboard/EmptyStateCard";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { Link } from "wouter";
import { PdksBordroWidget } from "./shared/PdksWidget";
import {
  DollarSign,
  Users,
  ArrowRight,
  FileText,
  Clock,
  Building2,
  Calculator,
  CalendarClock,
} from "lucide-react";

interface FinanceDashboardData {
  _meta: { dataAvailable: boolean; lastDataDate: string };
  payrollSummary: {
    currentMonth: { total: number; calculated: boolean };
    branchBreakdown: Array<{
      branch: string;
      payroll: number;
      totalCost: number;
      staffCount: number;
    }>;
  };
  staffMetrics: {
    totalActive: number;
    expiringDocuments: number;
    pendingLeaves: number;
    pendingOvertimes: number;
  };
  costAnalysis: {
    perBranch: Array<{ branch: string; cost: number }>;
    perEmployee: number;
    overtimeCost: number;
  };
}

export default function MissionControlMuhasebe() {
  const { user } = useAuth();
  const firstName = user?.firstName || "Kullanıcı";
  const [period, setPeriod] = useState<PeriodType>("this_month");
  const [customStart, setCustomStart] = useState<string>();
  const [customEnd, setCustomEnd] = useState<string>();

  const queryParams = new URLSearchParams({ period });
  if (period === "custom" && customStart && customEnd) {
    queryParams.set("startDate", customStart);
    queryParams.set("endDate", customEnd);
  }

  const { data, isLoading } = useQuery<FinanceDashboardData>({
    queryKey: ["/api/dashboard/finance", period, customStart, customEnd],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/finance?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Finance dashboard failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString("tr-TR");
  };

  const kpiItems = useMemo((): KPIItem[] => [
    { value: data?.staffMetrics?.totalActive?.toString() ?? "—", label: "Aktif Personel", color: "info" as const },
    { value: data?.payrollSummary?.currentMonth?.total ? `${fmt(data.payrollSummary.currentMonth.total)} TL` : "—", label: "Bu Ay Maaş", color: "info" as const },
    { value: data?.costAnalysis?.perEmployee ? `${fmt(data.costAnalysis.perEmployee)} TL` : "—", label: "Kişi Başı Maliyet", color: "warning" as const },
    { value: data?.staffMetrics?.pendingLeaves?.toString() ?? "0", label: "Bekleyen İzin", color: (data?.staffMetrics?.pendingLeaves ?? 0) > 0 ? "warning" as const : "success" as const },
    { value: data?.staffMetrics?.pendingOvertimes?.toString() ?? "0", label: "Bekleyen Mesai", color: (data?.staffMetrics?.pendingOvertimes ?? 0) > 0 ? "warning" as const : "success" as const },
    { value: data?.staffMetrics?.expiringDocuments?.toString() ?? "0", label: "Süresi Dolan Belge", color: (data?.staffMetrics?.expiringDocuments ?? 0) > 0 ? "danger" as const : "success" as const },
  ], [data]);

  const branchCostData = useMemo(() => {
    if (!data?.payrollSummary?.branchBreakdown?.length) return [];
    return data.payrollSummary.branchBreakdown.map((b) => ({
      branch: b.branch.length > 12 ? b.branch.slice(0, 12) + "..." : b.branch,
      maliyet: b.totalCost,
    }));
  }, [data]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const handlePeriodChange = (p: PeriodType, start?: string, end?: string) => {
    setPeriod(p);
    setCustomStart(start);
    setCustomEnd(end);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-3xl mx-auto" data-testid="mc-muhasebe-loading">
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-3 gap-1.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3 max-w-3xl mx-auto overflow-y-auto h-full" data-testid="mission-control-muhasebe">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate" data-testid="mc-muh-greeting">Merhaba, {firstName}</h1>
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] h-5" data-testid="mc-muh-role">Muhasebe</Badge>
          <DashboardModeToggle />
        </div>
      </div>

      <DateRangeFilter period={period} onPeriodChange={handlePeriodChange} data-testid="mc-muh-date-filter" />

      <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={3} />

      {data?.payrollSummary?.branchBreakdown && data.payrollSummary.branchBreakdown.length > 0 ? (
        <Card data-testid="mc-muh-payroll">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              Şube Maliyet Dağılımı
            </CardTitle>
            <Link href="/bordro">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5">
                Detay <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {data.payrollSummary.branchBreakdown.slice(0, 10).map((b, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`muh-branch-cost-${i}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate">{b.branch}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{b.staffCount} kişi</Badge>
                </div>
                <span className="text-xs font-medium flex-shrink-0">{fmt(b.totalCost)} TL</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyStateCard icon={<Calculator className="h-10 w-10" />} title="Bordro verisi" description="Bu dönem için hesaplanmış bordro bulunamadı" />
      )}

      <TrendChart
        title="Şube Maliyet Karşılaştırması"
        data={branchCostData}
        xKey="branch"
        bars={[{ key: "maliyet", color: "#6366f1", name: "Toplam Maliyet" }]}
        type="bar"
        height={180}
        data-testid="mc-muh-cost-chart"
      />

      <PdksBordroWidget />

      <TodaysTasksWidget />

      <div className="grid grid-cols-3 gap-2" data-testid="mc-muh-quick-nav">
        <Link href="/bordro">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span className="text-[9px] font-medium text-center">Bordro</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ik">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-[9px] font-medium text-center">İK</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/vardiya-planlama">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <CalendarClock className="w-5 h-5 text-violet-500" />
              <span className="text-[9px] font-medium text-center">Vardiya</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
