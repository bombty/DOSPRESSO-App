import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { Link } from "wouter";
import {
  Fingerprint,
  ArrowRight,
  Clock,
  UserCheck,
  UserX,
  CalendarOff,
  Timer,
} from "lucide-react";

interface PdksSummaryData {
  scope: string;
  today: { present: number; totalStaff: number };
  thisMonth: {
    totalEntries: number;
    totalExits: number;
    lateArrivals: number;
    totalLateMinutes: number;
    scheduledOffs: number;
  };
  weeklyCompliance: Array<{
    branchId: number;
    plannedMinutes: number;
    actualMinutes: number;
    complianceScore: number;
  }>;
  payroll: { lastMonthCalculated: number };
  branchBreakdown: Array<{
    branchId: number;
    name: string;
    staffCount: number;
    todayPresent: number;
    monthLateCount: number;
  }>;
}

interface PdksBranchAttendanceData {
  branchId: number;
  month: number;
  year: number;
  staffCount: number;
  summary: {
    totalWorkedDays: number;
    totalAbsentDays: number;
    totalLateArrivals: number;
    totalOvertimeMinutes: number;
  };
  staff: Array<{
    userId: string;
    name: string;
    role: string;
    workedDays: number;
    offDays: number;
    absentDays: number;
    lateArrivals: number;
    totalLateMinutes: number;
    overtimeMinutes: number;
  }>;
}

export function PdksYoklamaWidget({ branchId }: { branchId: number }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data, isLoading } = useQuery<PdksBranchAttendanceData>({
    queryKey: ["/api/pdks/branch-attendance", branchId, month, year],
    queryFn: async () => {
      const r = await fetch(`/api/pdks/branch-attendance?branchId=${branchId}&month=${month}&year=${year}`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS yoklama verisi alınamadı");
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;
  if (!data || !data.staff?.length) return null;

  const topAbsent = [...data.staff].sort((a, b) => b.absentDays - a.absentDays).slice(0, 5);

  return (
    <Card data-testid="mc-pdks-yoklama">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Fingerprint className="w-4 h-4" />
          Personel Yoklama
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] h-5">
            {data.staffCount} kişi
          </Badge>
          <Link href="/pdks">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5" data-testid="btn-pdks-detail">
              Detay <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.summary.totalWorkedDays}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-0.5">
              <UserCheck className="w-2.5 h-2.5" /> Çalışılan
            </p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className={`text-base font-semibold ${data.summary.totalAbsentDays > 0 ? "text-destructive" : ""}`}>
              {data.summary.totalAbsentDays}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-0.5">
              <UserX className="w-2.5 h-2.5" /> Devamsız
            </p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.summary.totalLateArrivals}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> Geç Gelen
            </p>
          </div>
        </div>
        {data.summary.totalOvertimeMinutes > 0 && (
          <div className="flex items-center justify-between px-2 py-1 rounded-md bg-amber-500/5">
            <span className="text-[10px] flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-500" /> Toplam Fazla Mesai
            </span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {Math.floor(data.summary.totalOvertimeMinutes / 60)}s {data.summary.totalOvertimeMinutes % 60}dk
            </span>
          </div>
        )}
        {topAbsent.filter(s => s.absentDays > 0).length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium px-1">En çok devamsız:</p>
            {topAbsent.filter(s => s.absentDays > 0).map(s => (
              <div key={s.userId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30" data-testid={`pdks-absent-${s.userId}`}>
                <span className="text-[10px] truncate">{s.name}</span>
                <Badge variant={s.absentDays >= 5 ? "destructive" : s.absentDays >= 3 ? "secondary" : "outline"} className="text-[9px] h-5">
                  {s.absentDays} gün
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PdksBordroWidget() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data, isLoading } = useQuery<PdksSummaryData>({
    queryKey: ["/api/pdks/dashboard-summary", "all"],
    queryFn: async () => {
      const r = await fetch(`/api/pdks/dashboard-summary?scope=all`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS özet verisi alınamadı");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-28 rounded-lg" />;
  if (!data) return null;

  return (
    <Card data-testid="mc-pdks-bordro">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Fingerprint className="w-4 h-4" />
          Bordro & Puantaj
        </CardTitle>
        <Link href="/pdks">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5" data-testid="btn-pdks-bordro-detail">
            Detay <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.today.totalStaff}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Personel</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.thisMonth.totalEntries}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Giriş</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className={`text-base font-semibold ${data.thisMonth.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {data.thisMonth.lateArrivals}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Geç Gelen</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.thisMonth.scheduledOffs}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">İzin</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30">
          <span className="text-[10px] text-muted-foreground">Geçen ay bordro hesaplanan</span>
          <Badge variant={data.payroll.lastMonthCalculated > 0 ? "default" : "secondary"} className="text-[9px] h-5">
            {data.payroll.lastMonthCalculated} kişi
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function PdksDevamsizlikWidget({ scope = "all" }: { scope?: "all" | "hq" }) {
  const { data, isLoading } = useQuery<PdksSummaryData>({
    queryKey: ["/api/pdks/dashboard-summary", scope],
    queryFn: async () => {
      const r = await fetch(`/api/pdks/dashboard-summary?scope=${scope}`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS verisi alınamadı");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-28 rounded-lg" />;
  if (!data) return null;

  const branches = data.branchBreakdown || [];
  const attendanceRate = data.today.totalStaff > 0
    ? Math.round((data.today.present / data.today.totalStaff) * 100) : 0;

  return (
    <CollapsibleSection
      title="Devamsızlık & Puantaj"
      icon={<Fingerprint className="w-3.5 h-3.5" />}
      badge={`%${attendanceRate}`}
      badgeVariant={attendanceRate >= 80 ? "success" as const : attendanceRate >= 50 ? "warning" as const : "danger" as const}
      defaultOpen={false}
      data-testid="mc-pdks-devamsizlik"
    >
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.today.present}/{data.today.totalStaff}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bugün Mevcut</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className={`text-base font-semibold ${data.thisMonth.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {data.thisMonth.lateArrivals}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bu Ay Geç</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.thisMonth.scheduledOffs}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">İzinli</p>
          </div>
        </div>
        {branches.length > 0 && (
          <div className="space-y-1">
            {branches.sort((a, b) => {
              const rateA = a.staffCount > 0 ? a.todayPresent / a.staffCount : 0;
              const rateB = b.staffCount > 0 ? b.todayPresent / b.staffCount : 0;
              return rateA - rateB;
            }).slice(0, 6).map(b => {
              const rate = b.staffCount > 0 ? Math.round((b.todayPresent / b.staffCount) * 100) : 0;
              return (
                <div key={b.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`pdks-branch-${b.branchId}`}>
                  <span className="text-xs truncate">{b.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{b.todayPresent}/{b.staffCount}</span>
                    <Badge variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "destructive"} className="text-[9px] h-5">
                      %{rate}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export function PdksHQOverviewWidget() {
  const { data, isLoading } = useQuery<PdksSummaryData>({
    queryKey: ["/api/pdks/dashboard-summary", "all"],
    queryFn: async () => {
      const r = await fetch(`/api/pdks/dashboard-summary?scope=all`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS verisi alınamadı");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-28 rounded-lg" />;
  if (!data) return null;

  const attendanceRate = data.today.totalStaff > 0
    ? Math.round((data.today.present / data.today.totalStaff) * 100) : 0;

  return (
    <CollapsibleSection
      title="Personel & Yoklama"
      icon={<Fingerprint className="w-3.5 h-3.5" />}
      badge={`${data.today.present}/${data.today.totalStaff}`}
      badgeVariant={attendanceRate >= 80 ? "success" as const : attendanceRate >= 50 ? "warning" as const : "danger" as const}
      defaultOpen={false}
      data-testid="mc-pdks-hq-overview"
    >
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.today.present}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bugün</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.thisMonth.totalEntries}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Ay Giriş</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className={`text-base font-semibold ${data.thisMonth.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {data.thisMonth.lateArrivals}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Geç Gelen</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{data.thisMonth.scheduledOffs}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">İzinli</p>
          </div>
        </div>
        {data.branchBreakdown.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium px-1">Şube bazlı durum:</p>
            {data.branchBreakdown.sort((a, b) => {
              const rateA = a.staffCount > 0 ? a.todayPresent / a.staffCount : 0;
              const rateB = b.staffCount > 0 ? b.todayPresent / b.staffCount : 0;
              return rateA - rateB;
            }).slice(0, 8).map(b => {
              const rate = b.staffCount > 0 ? Math.round((b.todayPresent / b.staffCount) * 100) : 0;
              return (
                <div key={b.branchId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30" data-testid={`pdks-hq-branch-${b.branchId}`}>
                  <span className="text-[10px] truncate">{b.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{b.todayPresent}/{b.staffCount}</span>
                    {b.monthLateCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] h-4">{b.monthLateCount} geç</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export function PdksYatirimciWidget({ branchId, isHQ }: { branchId?: number; isHQ: boolean }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const scope = isHQ ? "hq" : "branch";

  const { data: summaryData, isLoading: summaryLoading } = useQuery<PdksSummaryData>({
    queryKey: ["/api/pdks/dashboard-summary", scope, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ scope });
      if (!isHQ && branchId) params.set("branchId", String(branchId));
      const r = await fetch(`/api/pdks/dashboard-summary?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS verisi alınamadı");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendanceData, isLoading: attLoading } = useQuery<PdksBranchAttendanceData>({
    queryKey: ["/api/pdks/branch-attendance", branchId, month, year],
    queryFn: async () => {
      const r = await fetch(`/api/pdks/branch-attendance?branchId=${branchId}&month=${month}&year=${year}`, { credentials: "include" });
      if (!r.ok) throw new Error("PDKS şube verisi alınamadı");
      return r.json();
    },
    enabled: !isHQ && !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  if (summaryLoading || attLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (!summaryData) return null;

  const d = summaryData;

  return (
    <CollapsibleSection
      title="Personel Puantaj"
      icon={<Fingerprint className="w-3.5 h-3.5" />}
      badge={`${d.today.present}/${d.today.totalStaff}`}
      badgeVariant={d.today.present >= d.today.totalStaff * 0.8 ? "success" as const : "warning" as const}
      defaultOpen={false}
      data-testid="mc-pdks-yatirimci"
    >
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{d.today.present}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bugün Mevcut</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className={`text-base font-semibold ${d.thisMonth.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {d.thisMonth.lateArrivals}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Bu Ay Geç</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2 text-center">
            <p className="text-base font-semibold">{d.thisMonth.scheduledOffs}</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">İzinli</p>
          </div>
        </div>
        {!isHQ && attendanceData && attendanceData.staff.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium px-1">Personel detay:</p>
            {attendanceData.staff.slice(0, 5).map(s => (
              <div key={s.userId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30" data-testid={`pdks-yat-staff-${s.userId}`}>
                <span className="text-[10px] truncate">{s.name}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] h-4">{s.workedDays}g</Badge>
                  {s.absentDays > 0 && <Badge variant="destructive" className="text-[9px] h-4">{s.absentDays}d</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
