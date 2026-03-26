import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
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
  ClipboardList,
  ClipboardCheck,
  Star,
  CalendarClock,
  Headphones,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PdksDevamsizlikWidget } from "./shared/PdksWidget";

interface CoachDashboardData {
  _meta: { dataAvailable: boolean; lastDataDate: string };
  myBranches: Array<{
    branchId: number;
    name: string;
    staffCount: number;
    openFaults: number;
    openTickets: number;
    healthScore?: number;
  }>;
  kpis: {
    totalBranches: number;
    totalStaff: number;
    openFaults: number;
    openTickets: number;
    avgHealthScore?: number;
    avgTrainingProgress?: number;
  };
  actionRequired?: Array<{ message: string; count: number; type?: string }>;
  staffDevelopment?: Array<{ userId: string; name: string; role: string; modulesCompleted: number }>;
  checklistByBranch?: Array<{ branchId: number; name: string; completed: number; total: number; rate: number }>;
  feedbackByBranch?: Array<{ branchId: number; name: string; feedbackCount: number; avgRating: number }>;
  shiftByBranch?: Array<{ branchId: number; name: string; totalShifts: number; completedShifts: number; complianceRate: number }>;
  ticketsByBranch?: Array<{ branchId: number; name: string; openTickets: number }>;
  equipmentByBranch?: Array<{ branchId: number; name: string; totalEquipment: number; openFaults: number; inProgress: number }>;
}

export default function MissionControlCoach() {
  const { user } = useAuth();
  const firstName = user?.firstName || "Koç";
  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

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
      if (!res.ok) throw new Error("Dashboard fetch failed");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const kpiItems = useMemo((): KPIItem[] => {
    if (!data?.kpis) return [];
    const k = data.kpis;
    return [
      { value: k.totalBranches.toString(), label: "Şube", color: "default" as const },
      { value: k.totalStaff.toString(), label: "Personel", color: "info" as const },
      { value: k.openFaults.toString(), label: "Arıza", color: k.openFaults > 0 ? "danger" as const : "success" as const },
      { value: k.openTickets.toString(), label: "Ticket", color: k.openTickets > 0 ? "warning" as const : "success" as const },
      { value: k.avgHealthScore ? `${k.avgHealthScore}` : "—", label: "Sağlık", color: (k.avgHealthScore ?? 0) >= 70 ? "success" as const : "warning" as const },
      { value: k.avgTrainingProgress ? `%${k.avgTrainingProgress}` : "—", label: "Eğitim", color: "info" as const },
    ];
  }, [data]);

  const handlePeriodChange = (p: PeriodType, start?: string, end?: string) => {
    setPeriod(p);
    setCustomStart(start);
    setCustomEnd(end);
  };

  const actionCount = data?.actionRequired?.length ?? 0;

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
    <div className="p-4 space-y-3 max-w-3xl mx-auto overflow-y-auto h-full" data-testid="mission-control-coach">
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

      {actionCount > 0 && (
        <CollapsibleSection
          title="Aksiyon Gerekiyor"
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          badge={`${actionCount}`}
          badgeVariant="warning"
          defaultOpen={true}
          data-testid="mc-coach-actions"
        >
          <div className="space-y-1.5">
            {data!.actionRequired!.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-amber-500/5" data-testid={`coach-action-${i}`}>
                <span className="text-xs">{a.message}</span>
                <Badge variant="outline" className="text-[10px] h-5">{a.count}</Badge>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Şube Durumu"
        icon={<Building2 className="w-3.5 h-3.5" />}
        badge={`${data?.myBranches?.length ?? 0} şube`}
        badgeVariant="info"
        defaultOpen={true}
        data-testid="mc-coach-branches"
      >
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
      </CollapsibleSection>

      {data?.staffDevelopment && data.staffDevelopment.length > 0 && (
        <CollapsibleSection
          title="Personel Gelişimi"
          icon={<GraduationCap className="w-3.5 h-3.5" />}
          badge={`${data.staffDevelopment.length} kişi`}
          badgeVariant="info"
          defaultOpen={false}
          headerRight={
            <Link href="/akademi-hq">
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5" onClick={e => e.stopPropagation()}>
                Tümü <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          }
          data-testid="mc-coach-staff-dev"
        >
          <div className="space-y-1">
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
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Bugünün Görevleri"
        icon={<ClipboardList className="w-3.5 h-3.5" />}
        defaultOpen={true}
        data-testid="mc-coach-tasks"
      >
        <TodaysTasksWidget />
      </CollapsibleSection>

      <CollapsibleSection
        title="Ekipman Durumu"
        icon={<Wrench className="w-3.5 h-3.5" />}
        badge={(() => {
          const total = (data?.equipmentByBranch || []).reduce((s, e) => s + e.openFaults, 0);
          return total > 0 ? `${total} arıza` : "Sorun yok";
        })()}
        badgeVariant={(() => {
          const total = (data?.equipmentByBranch || []).reduce((s, e) => s + e.openFaults, 0);
          return total > 3 ? "danger" as const : total > 0 ? "warning" as const : "success" as const;
        })()}
        defaultOpen={false}
        data-testid="mc-coach-equipment"
      >
        {!(data?.equipmentByBranch || []).some(e => e.openFaults > 0) ? (
          <p className="text-xs text-muted-foreground text-center py-3">{"T\u00FCm \u015Fubelerde sorun yok"}</p>
        ) : (
          <div className="space-y-1">
            {(data?.equipmentByBranch || []).filter(e => e.openFaults > 0).sort((a, b) => b.openFaults - a.openFaults).map(e => (
              <div key={e.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-equip-${e.branchId}`}>
                <span className="text-xs truncate">{e.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{e.totalEquipment} ekipman</span>
                  <Badge variant={e.openFaults > 2 ? "destructive" : "secondary"} className="text-[9px] h-5">
                    <Wrench className="w-3 h-3 mr-0.5" />{e.openFaults}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Checklist & Denetim"
        icon={<ClipboardCheck className="w-3.5 h-3.5" />}
        badge={(() => {
          const items = data?.checklistByBranch || [];
          const avgRate = items.length > 0 ? Math.round(items.reduce((s, c) => s + c.rate, 0) / items.length) : 100;
          return `%${avgRate}`;
        })()}
        badgeVariant={(() => {
          const items = data?.checklistByBranch || [];
          const avgRate = items.length > 0 ? Math.round(items.reduce((s, c) => s + c.rate, 0) / items.length) : 100;
          return avgRate >= 80 ? "success" as const : avgRate >= 50 ? "warning" as const : "danger" as const;
        })()}
        defaultOpen={false}
        data-testid="mc-coach-checklists"
      >
        {!(data?.checklistByBranch || []).some(c => c.total > 0) ? (
          <p className="text-xs text-muted-foreground text-center py-3">Veri yok</p>
        ) : (
          <div className="space-y-1">
            {(data?.checklistByBranch || []).filter(c => c.total > 0).map(c => (
              <div key={c.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-checklist-${c.branchId}`}>
                <span className="text-xs truncate">{c.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{c.completed}/{c.total}</span>
                  <Badge variant={c.rate >= 80 ? "default" : c.rate >= 50 ? "secondary" : "destructive"} className="text-[9px] h-5">
                    %{c.rate}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={"M\u00FC\u015Fteri Geri Bildirim"}
        icon={<Star className="w-3.5 h-3.5" />}
        badge={(() => {
          const items = (data?.feedbackByBranch || []).filter(f => f.feedbackCount > 0);
          if (items.length === 0) return "—";
          const avg = items.reduce((s, f) => s + f.avgRating, 0) / items.length;
          return avg.toFixed(1);
        })()}
        badgeVariant={(() => {
          const items = (data?.feedbackByBranch || []).filter(f => f.feedbackCount > 0);
          if (items.length === 0) return "info" as const;
          const avg = items.reduce((s, f) => s + f.avgRating, 0) / items.length;
          return avg >= 4 ? "success" as const : avg >= 3 ? "warning" as const : "danger" as const;
        })()}
        defaultOpen={false}
        data-testid="mc-coach-feedback"
      >
        {!(data?.feedbackByBranch || []).some(f => f.feedbackCount > 0) ? (
          <p className="text-xs text-muted-foreground text-center py-3">Veri yok</p>
        ) : (
          <div className="space-y-1">
            {(data?.feedbackByBranch || []).filter(f => f.feedbackCount > 0).sort((a, b) => a.avgRating - b.avgRating).map(f => (
              <div key={f.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-feedback-${f.branchId}`}>
                <span className="text-xs truncate">{f.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{f.feedbackCount} yorum</span>
                  <Badge variant={f.avgRating >= 4 ? "default" : f.avgRating >= 3 ? "secondary" : "destructive"} className="text-[9px] h-5">
                    <Star className="w-3 h-3 mr-0.5" />{f.avgRating}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <PdksDevamsizlikWidget scope="all" />

      <CollapsibleSection
        title="Vardiya Uyumu"
        icon={<CalendarClock className="w-3.5 h-3.5" />}
        badge={"Son 7 g\u00FCn"}
        badgeVariant="info"
        defaultOpen={false}
        data-testid="mc-coach-shifts"
      >
        {!(data?.shiftByBranch || []).some(s => s.totalShifts > 0) ? (
          <p className="text-xs text-muted-foreground text-center py-3">Veri yok</p>
        ) : (
          <div className="space-y-1">
            {(data?.shiftByBranch || []).filter(s => s.totalShifts > 0).sort((a, b) => a.complianceRate - b.complianceRate).map(s => (
              <div key={s.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-shift-${s.branchId}`}>
                <span className="text-xs truncate">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{s.completedShifts}/{s.totalShifts}</span>
                  <Badge variant={s.complianceRate >= 80 ? "default" : s.complianceRate >= 50 ? "secondary" : "destructive"} className="text-[9px] h-5">
                    %{s.complianceRate}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {(data?.ticketsByBranch || []).length > 0 && (
        <CollapsibleSection
          title="SLA & Talepler"
          icon={<Headphones className="w-3.5 h-3.5" />}
          badge={`${(data?.ticketsByBranch || []).reduce((s, t) => s + t.openTickets, 0)} a\u00E7\u0131k`}
          badgeVariant="warning"
          defaultOpen={false}
          data-testid="mc-coach-tickets"
        >
          <div className="space-y-1">
            {(data?.ticketsByBranch || []).sort((a, b) => b.openTickets - a.openTickets).map(t => (
              <div key={t.branchId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`coach-ticket-${t.branchId}`}>
                <span className="text-xs truncate">{t.name}</span>
                <Badge variant="destructive" className="text-[9px] h-5">{t.openTickets} ticket</Badge>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

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
