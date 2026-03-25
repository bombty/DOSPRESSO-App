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
import EmptyStateCard from "@/components/dashboard/EmptyStateCard";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { Link } from "wouter";
import {
  Users,
  GraduationCap,
  ArrowRight,
  Building2,
  AlertTriangle,
  TrendingUp,
  Wrench,
  MessageSquare,
  Target,
} from "lucide-react";

interface CoachDashboardData {
  _meta: { dataAvailable: boolean; lastDataDate: string };
  myBranches: Array<{
    branchId: number;
    name: string;
    staffCount: number;
    openFaults: number;
    openTickets: number;
    healthScore: number | null;
    attendanceRate: number | null;
    taskCompletionRate: number | null;
    customerRating: number | null;
  }>;
  trainingOverview: {
    totalCompletions: number;
    completionRate: number;
    avgQuizScore: number | null;
    upcomingCertificates: number;
  };
  staffDevelopment: Array<{
    userId: string;
    name: string;
    role: string;
    modulesCompleted: number;
  }>;
  actionRequired: Array<{
    type: string;
    message: string;
    count: number;
  }>;
}

export default function MissionControlCoach() {
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

  const { data, isLoading } = useQuery<CoachDashboardData>({
    queryKey: ["/api/dashboard/coach", period, customStart, customEnd],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/coach?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Coach dashboard failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const kpiItems = useMemo((): KPIItem[] => {
    const d = data;
    return [
      { value: d?.myBranches?.length?.toString() ?? "—", label: "Şubelerim", color: "info" as const },
      { value: d?.myBranches?.reduce((s, b) => s + b.staffCount, 0)?.toString() ?? "—", label: "Personel", color: "info" as const },
      { value: d?.trainingOverview?.totalCompletions?.toString() ?? "—", label: "Eğitim Tamamlama", color: "success" as const },
      { value: d?.trainingOverview?.avgQuizScore ? `${d.trainingOverview.avgQuizScore}` : "—", label: "Ort. Quiz", color: (d?.trainingOverview?.avgQuizScore ?? 0) >= 70 ? "success" as const : "warning" as const },
      { value: d?.myBranches?.reduce((s, b) => s + b.openFaults, 0)?.toString() ?? "0", label: "Açık Arıza", color: (d?.myBranches?.reduce((s, b) => s + b.openFaults, 0) ?? 0) > 0 ? "danger" as const : "success" as const },
      { value: d?.myBranches?.reduce((s, b) => s + b.openTickets, 0)?.toString() ?? "0", label: "Açık Ticket", color: (d?.myBranches?.reduce((s, b) => s + b.openTickets, 0) ?? 0) > 0 ? "warning" as const : "success" as const },
    ];
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
      <div className="p-4 space-y-4 max-w-3xl mx-auto" data-testid="mc-coach-loading">
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-3 gap-1.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto overflow-y-auto h-full" data-testid="mission-control-coach">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">{firstName[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate" data-testid="mc-coach-greeting">Merhaba, {firstName}</h1>
            <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5" data-testid="mc-coach-role">Koç</Badge>
          <DashboardModeToggle />
        </div>
      </div>

      <DateRangeFilter period={period} onPeriodChange={handlePeriodChange} data-testid="mc-coach-date-filter" />

      <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={3} />

      {data?.actionRequired && data.actionRequired.length > 0 && (
        <Card className="border-amber-500/30" data-testid="mc-coach-actions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Aksiyon Gerekiyor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {data.actionRequired.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-amber-500/5" data-testid={`coach-action-${i}`}>
                <span className="text-xs">{a.message}</span>
                <Badge variant="outline" className="text-[10px] h-5">{a.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card data-testid="mc-coach-branches">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            Şube Durumu
          </CardTitle>
          <Badge variant="outline" className="text-[10px] h-5">{data?.myBranches?.length ?? 0} şube</Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {!data?.myBranches?.length ? (
            <EmptyStateCard icon={<Building2 className="h-10 w-10" />} title="Şube yok" description="Atanmış şube bulunamadı" />
          ) : (
            <div className="space-y-2">
              {data.myBranches.map((b) => (
                <div key={b.branchId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover-elevate" data-testid={`coach-branch-${b.branchId}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                      {b.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium truncate block">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground">{b.staffCount} personel</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.openFaults > 0 && (
                      <Badge variant="destructive" className="text-[9px] h-5">
                        <Wrench className="w-3 h-3 mr-0.5" />{b.openFaults}
                      </Badge>
                    )}
                    {b.openTickets > 0 && (
                      <Badge className="bg-amber-500 text-white text-[9px] h-5">
                        <MessageSquare className="w-3 h-3 mr-0.5" />{b.openTickets}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.staffDevelopment && data.staffDevelopment.length > 0 && (
        <Card data-testid="mc-coach-staff-dev">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Personel Gelişimi
            </CardTitle>
            <Link href="/akademi-hq">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5">
                Tümü <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {data.staffDevelopment.slice(0, 10).map((s, i) => (
              <div key={s.userId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-staff-${i}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium truncate block">{s.name}</span>
                    <span className="text-[9px] text-muted-foreground capitalize">{s.role.replace("_", " ")}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5">{s.modulesCompleted} modül</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <TodaysTasksWidget />

      <div className="grid grid-cols-3 gap-2" data-testid="mc-coach-quick-nav">
        <Link href="/akademi-hq">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              <span className="text-[9px] font-medium text-center">Akademi HQ</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/operasyon">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <Building2 className="w-5 h-5 text-emerald-500" />
              <span className="text-[9px] font-medium text-center">Operasyon</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/raporlar">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2.5 flex flex-col items-center gap-1">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <span className="text-[9px] font-medium text-center">Raporlar</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
