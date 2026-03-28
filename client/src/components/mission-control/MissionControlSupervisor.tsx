import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import AlertPanel from "@/components/dashboard/AlertPanel";
import { PresenceBar, type PresenceMember } from "./shared/PresenceBar";
import { StaffCard, type StaffMember } from "./shared/StaffCard";
import { ShiftTimeline, type ShiftEntry } from "./shared/ShiftTimeline";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { ActivityTimeline } from "@/components/widgets/activity-timeline";
import { Link } from "wouter";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Clock,
  ClipboardCheck,
  MessageSquare,
  CalendarClock,
  Factory,
  BarChart3,
  GraduationCap,
  Star,
  Fingerprint,
} from "lucide-react";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SupervisorQuickBar } from "@/components/mobile/SupervisorQuickBar";
import { PdksYoklamaWidget } from "./shared/PdksWidget";

interface BranchSummaryKpis {
  activeStaff: number;
  totalStaff: number;
  checklistCompletion: number;
  customerAvg: number;
  feedbackCount: number;
  warnings: number;
  lateCount?: number;
  onBreakCount?: number;
  absentCount?: number;
  healthScore?: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  checklistStatus: string;
  score?: number;
  trend?: number;
  shiftStart?: string;
  shiftEnd?: string;
  status?: string;
}

interface BranchSummaryResponse {
  branch: { id: number; name: string };
  kpis: BranchSummaryKpis;
  teamStatus: TeamMember[];
  lowStockItems: Array<{ productName: string; currentStock: number; minimumStock: number; unit: string }>;
  suggestions: string[];
  checklists?: Array<{ id: number; name: string; done: boolean }>;
}

export default function MissionControlSupervisor() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const branchId = (user as any)?.branchId;
  const firstName = user?.firstName || user?.username?.split(" ")[0] || "Kullanıcı";

  const { data: branchSummary, isLoading } = useQuery<BranchSummaryResponse>({
    queryKey: ["/api/branch-summary", branchId],
    queryFn: async () => {
      const r = await fetch(`/api/branch-summary/${branchId}`);
      if (!r.ok) throw new Error(`branch-summary ${r.status}`);
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 30 * 1000, // 30 saniye stale
    refetchInterval: 60 * 1000, // Her 60 saniyede güncelle (yoklama gerçek zamanlı)
  });

  const { data: dashboardAlerts } = useQuery<{ alerts: Array<{ type: string; message: string }> }>({
    queryKey: ["/api/dashboard/branch", branchId],
    queryFn: async () => {
      const r = await fetch(`/api/dashboard/branch/${branchId}`, { credentials: "include" });
      if (!r.ok) return { alerts: [] };
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 3 * 60 * 1000,
  });

  const { data: trainingData } = useQuery<Array<{
    userId: number; name: string; role: string;
    completedModules: number; totalAssigned: number; progressRate: number;
  }>>({
    queryKey: ["/api/branch-training-progress", branchId],
    queryFn: async () => {
      const r = await fetch(`/api/branch-training-progress/${branchId}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedbackData } = useQuery<{
    avgRating: number; totalCount: number;
    recent: Array<{ id: number; rating: number; comment: string; createdAt: string }>;
  }>({
    queryKey: ["/api/branch-feedback-summary", branchId],
    queryFn: async () => {
      const r = await fetch(`/api/branch-feedback-summary/${branchId}`, { credentials: "include" });
      if (!r.ok) return { avgRating: 0, totalCount: 0, recent: [] };
      return r.json();
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  const kpiItems = useMemo((): KPIItem[] => {
    const k = branchSummary?.kpis;
    return [
      { value: k?.activeStaff?.toString() ?? "—", label: "Burada", color: "success" as const },
      { value: k?.lateCount?.toString() ?? "0", label: "Geç", color: (k?.lateCount ?? 0) > 0 ? "warning" as const : "muted" as const },
      { value: k?.onBreakCount?.toString() ?? "0", label: "Molada", color: "info" as const },
      { value: k?.absentCount?.toString() ?? "0", label: "Gelmedi", color: (k?.absentCount ?? 0) > 0 ? "danger" as const : "muted" as const },
      { value: k?.checklistCompletion != null ? `%${Math.round(k.checklistCompletion)}` : "—", label: "Checklist", color: (k?.checklistCompletion ?? 100) >= 80 ? "success" as const : "danger" as const },
      { value: k?.healthScore != null ? `%${Math.round(k.healthScore)}` : k?.customerAvg ? `${Number(k.customerAvg).toFixed(1)}` : "—", label: "Performans", color: (k?.healthScore ?? k?.customerAvg ?? 80) >= 80 ? "success" as const : "warning" as const },
    ];
  }, [branchSummary]);

  const presenceMembers = useMemo((): PresenceMember[] => {
    if (!branchSummary?.teamStatus) return [];
    return branchSummary.teamStatus.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      status: (m.status as PresenceMember["status"]) || (m.checklistStatus === "yapilmadi" ? "absent" : "active"),
      shiftLabel: m.shiftStart && m.shiftEnd ? `${m.shiftStart}-${m.shiftEnd}` : undefined,
    }));
  }, [branchSummary]);

  const staffMembers = useMemo((): StaffMember[] => {
    if (!branchSummary?.teamStatus) return [];
    return branchSummary.teamStatus.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      status: m.status || (m.checklistStatus === "yapilmadi" ? "absent" : "active"),
      score: m.score,
      trend: m.trend,
      shiftLabel: m.shiftStart && m.shiftEnd ? `${m.shiftStart}-${m.shiftEnd}` : undefined,
    }));
  }, [branchSummary]);

  const shiftEntries = useMemo((): ShiftEntry[] => {
    if (!branchSummary?.teamStatus) return [];
    return branchSummary.teamStatus
      .filter((m) => m.shiftStart && m.shiftEnd)
      .map((m) => {
        const parseHour = (t: string) => {
          const [h, min] = t.split(":").map(Number);
          return h + (min || 0) / 60;
        };
        return {
          id: m.id,
          name: m.name,
          startHour: parseHour(m.shiftStart!),
          endHour: parseHour(m.shiftEnd!),
          status: (m.status as ShiftEntry["status"]) || "active",
        };
      });
  }, [branchSummary]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

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
    <div className="p-3 md:p-4 space-y-3 max-w-[1400px] mx-auto overflow-y-auto h-full pb-24 md:pb-4" data-testid="mission-control-supervisor">
      {!isMobile && <SupervisorQuickBar />}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {firstName[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate" data-testid="mc-sup-greeting">Merhaba, {firstName}</h1>
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {branchSummary?.branch && (
            <Badge variant="secondary" className="text-[10px] h-5">{branchSummary.branch.name}</Badge>
          )}
          <DashboardModeToggle />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={6} />
      )}

      {dashboardAlerts?.alerts && dashboardAlerts.alerts.length > 0 && (
        <AlertPanel alerts={dashboardAlerts.alerts.map(a => ({
          type: a.type === "equipment" ? "critical" as const : "warning" as const,
          message: a.message,
        }))} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:items-start">
        <div className="space-y-3">
          {presenceMembers.length > 0 && (
            <Card data-testid="mc-presence">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Personel Durumu
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5">
                  {presenceMembers.length} kişi
                </Badge>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <PresenceBar members={presenceMembers} />
              </CardContent>
            </Card>
          )}

          {staffMembers.length > 0 && (
            <Card data-testid="mc-staff-grid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Ekip Kartları
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {staffMembers.map((m) => (
                    <StaffCard key={m.id} member={m} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {shiftEntries.length > 0 && (
            <Card className="hidden md:block" data-testid="mc-shift-timeline-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" />
                  Vardiya Zaman Çizelgesi
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ShiftTimeline shifts={shiftEntries} />
              </CardContent>
            </Card>
          )}

          <div className="md:hidden">
            {staffMembers.length > 0 && shiftEntries.length > 0 && (
              <Card data-testid="mc-shift-list-mobile">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Vardiyalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {staffMembers.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30">
                      <span className="text-[10px] font-medium">{m.name.split(" ")[0]}</span>
                      <span className="text-[10px] text-muted-foreground">{m.shiftLabel || "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {branchSummary?.checklists && branchSummary.checklists.length > 0 && (
            <Card data-testid="mc-checklists">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4" />
                  Bugünkü Checklist
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5">
                  {branchSummary.checklists.filter((c) => c.done).length}/{branchSummary.checklists.length}
                </Badge>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {branchSummary.checklists.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30">
                    <div className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] ${c.done ? "bg-emerald-500 text-white" : "border border-muted-foreground/30"}`}>
                      {c.done ? "✓" : ""}
                    </div>
                    <span className={`text-xs ${c.done ? "text-muted-foreground line-through" : "font-medium"}`}>{c.name}</span>
                  </div>
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

          {trainingData && trainingData.length > 0 && (
            <Card data-testid="mc-training-progress">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  {"E\u011Fitim \u0130lerlemesi"}
                </CardTitle>
                <Link href="/akademi">
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" data-testid="btn-training-all">
                    {"T\u00FCm\u00FC"} <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {trainingData.slice(0, 6).map((t, idx) => (
                  <div key={t.userId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30" data-testid={`training-item-${idx}`}>
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium truncate block">{t.name}</span>
                      <span className="text-[9px] text-muted-foreground capitalize">{t.role?.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{t.completedModules}/{t.totalAssigned}</span>
                      <Badge variant={t.progressRate >= 80 ? "default" : t.progressRate >= 50 ? "secondary" : "destructive"} className="text-[9px] h-5">
                        %{t.progressRate}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {feedbackData && feedbackData.totalCount > 0 && (
            <Card data-testid="mc-feedback-summary">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  {"M\u00FC\u015Fteri Geri Bildirim"}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Badge variant={feedbackData.avgRating >= 4 ? "default" : feedbackData.avgRating >= 3 ? "secondary" : "destructive"} className="text-[9px] h-5">
                    <Star className="w-3 h-3 mr-0.5" />{feedbackData.avgRating.toFixed(1)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {feedbackData.totalCount} yorum
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {feedbackData.recent.slice(0, 4).map((fb) => (
                  <div key={fb.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/30" data-testid={`feedback-item-${fb.id}`}>
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < fb.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">{fb.comment || "Puan verildi"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {branchSummary?.kpis && (
            <Card data-testid="mc-branch-scorecard">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  {"Şube Skor Kartı"}
                </CardTitle>
                <Badge variant={
                  (branchSummary.kpis.healthScore ?? branchSummary.kpis.checklistCompletion ?? 0) >= 80 ? "default"
                  : (branchSummary.kpis.healthScore ?? branchSummary.kpis.checklistCompletion ?? 0) >= 50 ? "secondary"
                  : "destructive"
                } className="text-[9px] h-5">
                  %{Math.round(branchSummary.kpis.healthScore ?? branchSummary.kpis.checklistCompletion ?? 0)}
                </Badge>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {[
                  { label: "Aktif Personel", value: `${branchSummary.kpis.activeStaff}/${branchSummary.kpis.totalStaff}`, pct: branchSummary.kpis.totalStaff > 0 ? Math.round((branchSummary.kpis.activeStaff / branchSummary.kpis.totalStaff) * 100) : 0 },
                  { label: "Checklist", value: `%${Math.round(branchSummary.kpis.checklistCompletion ?? 0)}`, pct: Math.round(branchSummary.kpis.checklistCompletion ?? 0) },
                  { label: "Müşteri Puanı", value: branchSummary.kpis.customerAvg ? `${Number(branchSummary.kpis.customerAvg).toFixed(1)}/5` : "—", pct: branchSummary.kpis.customerAvg ? Math.round(Number(branchSummary.kpis.customerAvg) * 20) : 0 },
                  { label: "Uyarılar", value: String(branchSummary.kpis.warnings ?? 0), pct: (branchSummary.kpis.warnings ?? 0) === 0 ? 100 : Math.max(0, 100 - (branchSummary.kpis.warnings ?? 0) * 20) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-24 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.pct >= 80 ? "bg-emerald-500" : item.pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                        style={{ width: `${Math.min(100, item.pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-12 text-right flex-shrink-0">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PdksYoklamaWidget branchId={branchId} />

      <div className="grid grid-cols-4 gap-2" data-testid="mc-sup-quick-actions">
        <Link href="/iletisim">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2 flex flex-col items-center gap-1">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span className="text-[9px] font-medium text-center">İletişim</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/vardiya">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2 flex flex-col items-center gap-1">
              <CalendarClock className="w-5 h-5 text-violet-500" />
              <span className="text-[9px] font-medium text-center">Vardiya</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stok">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2 flex flex-col items-center gap-1">
              <Factory className="w-5 h-5 text-amber-500" />
              <span className="text-[9px] font-medium text-center">Stok</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/raporlar">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-2 flex flex-col items-center gap-1">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <span className="text-[9px] font-medium text-center">Raporlar</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <TodaysTasksWidget />
      <ActivityTimeline />

      {isMobile && <SupervisorQuickBar />}
    </div>
  );
}
