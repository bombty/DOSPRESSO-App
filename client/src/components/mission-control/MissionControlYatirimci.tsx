import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { DashboardModeToggle } from "./DashboardModeToggle";
import {
  Building2,
  AlertTriangle,
  Users,
  Star,
  Wrench,
  BarChart3,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Sparkles,
  GraduationCap,
  CalendarClock,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface BranchSummaryData {
  branch: { id: number; name: string; city?: string };
  kpis: {
    activeStaff: number;
    totalStaff: number;
    checklistCompletion: number;
    customerRating: number;
    openFaults: number;
    todayAttendance: number;
  };
  teamStatus: Array<{ id: string; name: string; role: string; checklistStatus: string }>;
  lowStockItems: Array<{ name: string; quantity: number }>;
  suggestions: Array<{ id: string; title: string; priority: string }>;
}

interface DashboardAlerts {
  alerts: Array<{ type: string; message: string }>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function getScoreColor(val: number | null | undefined): "success" | "warning" | "danger" | "info" {
  if (val == null) return "info";
  if (val >= 80) return "success";
  if (val >= 60) return "warning";
  return "danger";
}

export default function MissionControlYatirimci() {
  const { user } = useAuth();
  const branchId = (user as any)?.branchId;
  const isHQ = user?.role === "yatirimci_hq";
  const firstName = user?.firstName || "Yatırımcı";
  const initials = `${(user?.firstName || "Y")[0]}${(user?.lastName || "")[0] || ""}`.toUpperCase();

  const { data: branchData, isLoading } = useQuery<BranchSummaryData>({
    queryKey: ["/api/branch-summary", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-summary/${branchId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Branch summary fetch failed");
      return res.json();
    },
    enabled: !!branchId && !isHQ,
    staleTime: 2 * 60 * 1000,
  });

  const { data: dashAlerts } = useQuery<DashboardAlerts>({
    queryKey: ["/api/dashboard/branch", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/branch/${branchId}`, { credentials: "include" });
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
    enabled: !!branchId && !isHQ,
    staleTime: 2 * 60 * 1000,
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
    enabled: !!branchId && !isHQ,
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
    enabled: !!branchId && !isHQ,
    staleTime: 5 * 60 * 1000,
  });

  const { data: briefingData } = useQuery<{
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

  const { data: hqSummary } = useQuery<{
    branchStatus: { normal: number; warning: number; critical: number };
    branchRanking: Array<{ id: number; name: string; avgRating: number; feedbackCount: number; status: string }>;
    activeUsers: number;
  }>({
    queryKey: ["/api/hq-summary"],
    enabled: isHQ,
    staleTime: 2 * 60 * 1000,
  });

  const kpis = branchData?.kpis;
  const alerts = dashAlerts?.alerts || [];
  const criticalAlerts = alerts.filter(a => a.type === "critical").length;

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const kpiItems = useMemo((): KPIItem[] => {
    if (isHQ && hqSummary) {
      const total = (hqSummary.branchStatus.normal ?? 0) + (hqSummary.branchStatus.warning ?? 0) + (hqSummary.branchStatus.critical ?? 0);
      return [
        { value: String(total), label: "Toplam Şube", color: "info" as const },
        { value: String(hqSummary.branchStatus.normal ?? 0), label: "Normal", color: "success" as const },
        { value: String(hqSummary.branchStatus.warning ?? 0), label: "Dikkat", color: (hqSummary.branchStatus.warning ?? 0) > 0 ? "warning" as const : "success" as const },
        { value: String(hqSummary.branchStatus.critical ?? 0), label: "Kritik", color: (hqSummary.branchStatus.critical ?? 0) > 0 ? "danger" as const : "success" as const },
      ];
    }
    if (!kpis) return [];
    return [
      { value: String(kpis.activeStaff ?? 0), label: "Aktif Personel", color: "info" as const },
      { value: kpis.customerRating ? `${kpis.customerRating.toFixed(1)}` : "—", label: "Müşteri Puanı", color: getScoreColor(kpis.customerRating ? kpis.customerRating * 20 : null) },
      { value: kpis.checklistCompletion != null ? `%${Math.round(kpis.checklistCompletion)}` : "—", label: "Checklist", color: (kpis.checklistCompletion ?? 100) >= 80 ? "success" as const : "warning" as const },
      { value: String(kpis.openFaults ?? 0), label: "Açık Arıza", color: (kpis.openFaults ?? 0) > 0 ? "danger" as const : "success" as const },
    ];
  }, [kpis, isHQ, hqSummary]);

  if (isLoading && !isHQ) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto" data-testid="mc-yatirimci-loading">
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3 max-w-2xl mx-auto overflow-y-auto h-full" data-testid="mission-control-yatirimci">
      <div className="flex items-center justify-between gap-3 flex-wrap" data-testid="mc-yat-header">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold leading-tight">{getGreeting()}, {firstName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-5" data-testid="mc-role-badge">
            {isHQ ? "Yatırımcı (HQ)" : "Yatırımcı"}
          </Badge>
          <DashboardModeToggle />
        </div>
      </div>

      {!isHQ && branchData?.branch && (
        <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20" data-testid="mc-yat-branch-info">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{branchData.branch.name}</p>
              {branchData.branch.city && (
                <p className="text-[10px] text-muted-foreground">{branchData.branch.city}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {briefingData && briefingData.summary && briefingData.summary !== "AI brifing şu an kullanılamıyor." && (
        <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20" data-testid="mc-yat-briefing">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">AI Brifing</span>
            </div>
            <p className="text-xs leading-relaxed">{briefingData.summary}</p>
          </CardContent>
        </Card>
      )}

      <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={4} />

      {alerts.length > 0 && (
        <CollapsibleSection
          title="Dikkat Gereken Konular"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          badge={criticalAlerts > 0 ? `${criticalAlerts} kritik` : `${alerts.length} uyarı`}
          badgeVariant={criticalAlerts > 0 ? "danger" : "warning"}
          defaultOpen={true}
          data-testid="mc-yat-alerts"
        >
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30">
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.type === "critical" ? "text-destructive" : "text-amber-500"}`} />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {!isHQ && (
        <CollapsibleSection
          title="Personel Durumu"
          icon={<Users className="w-3.5 h-3.5" />}
          badge={kpis ? `${kpis.activeStaff}/${kpis.totalStaff}` : undefined}
          defaultOpen={false}
          data-testid="mc-yat-staff"
        >
          {(branchData?.teamStatus || []).length > 0 ? (
            <div className="space-y-1">
              {(branchData?.teamStatus || []).slice(0, 10).map((m, i) => (
                <div key={m.id || i} className="flex items-center justify-between text-xs p-1.5 rounded-md bg-muted/20">
                  <span className="font-medium truncate">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4 capitalize">{m.role?.replace("_", " ")}</Badge>
                    <div className={`w-2 h-2 rounded-full ${m.checklistStatus === "tamamlandi" ? "bg-emerald-500" : m.checklistStatus === "devam" ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">Personel verisi bulunamadı</p>
          )}
        </CollapsibleSection>
      )}

      {!isHQ && (branchData?.lowStockItems || []).length > 0 && (
        <CollapsibleSection
          title="Düşük Stok Uyarısı"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          badge={`${branchData!.lowStockItems.length} ürün`}
          badgeVariant="warning"
          defaultOpen={true}
          data-testid="mc-yat-stock"
        >
          <div className="space-y-1">
            {branchData!.lowStockItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-md bg-muted/20">
                <span>{item.name}</span>
                <Badge variant="outline" className="text-[9px] h-4 text-amber-600">{item.quantity}</Badge>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {isHQ && hqSummary && (hqSummary.branchRanking || []).length > 0 && (
        <CollapsibleSection
          title="Şube Durumu"
          icon={<Building2 className="w-3.5 h-3.5" />}
          badge={`${(hqSummary.branchRanking || []).length} şube`}
          defaultOpen={true}
          data-testid="mc-yat-branches"
        >
          <div className="space-y-1">
            {(hqSummary.branchRanking || []).map(b => {
              const statusColor = b.status === "critical" ? "text-destructive" : b.status === "warning" ? "text-amber-600" : "text-emerald-600";
              return (
                <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/20">
                  <span className="font-medium truncate">{b.name}</span>
                  <div className="flex items-center gap-2">
                    {b.avgRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>{b.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                    <div className={`w-2 h-2 rounded-full ${b.status === "critical" ? "bg-destructive" : b.status === "warning" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {!isHQ && trainingData && trainingData.length > 0 && (
        <CollapsibleSection
          title={"E\u011Fitim \u0130lerlemesi"}
          icon={<GraduationCap className="w-3.5 h-3.5" />}
          badge={(() => {
            const withProgress = trainingData.filter(t => t.totalAssigned > 0);
            if (withProgress.length === 0) return "0%";
            const avg = Math.round(withProgress.reduce((s, t) => s + t.progressRate, 0) / withProgress.length);
            return `%${avg}`;
          })()}
          badgeVariant={(() => {
            const withProgress = trainingData.filter(t => t.totalAssigned > 0);
            if (withProgress.length === 0) return "info" as const;
            const avg = Math.round(withProgress.reduce((s, t) => s + t.progressRate, 0) / withProgress.length);
            return avg >= 70 ? "success" as const : avg >= 40 ? "warning" as const : "danger" as const;
          })()}
          defaultOpen={false}
          data-testid="mc-yat-training"
        >
          <div className="space-y-1">
            {trainingData.slice(0, 8).map((t, idx) => (
              <div key={t.userId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/20" data-testid={`yat-training-${idx}`}>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium truncate block">{t.name}</span>
                  <span className="text-[9px] text-muted-foreground capitalize">{t.role?.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{t.completedModules}/{t.totalAssigned}</span>
                  <Badge variant={t.progressRate >= 70 ? "default" : t.progressRate >= 40 ? "secondary" : "destructive"} className="text-[9px] h-4">
                    %{t.progressRate}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {!isHQ && feedbackData && feedbackData.totalCount > 0 && (
        <CollapsibleSection
          title={"M\u00FC\u015Fteri Geri Bildirim"}
          icon={<Star className="w-3.5 h-3.5" />}
          badge={feedbackData.avgRating > 0 ? feedbackData.avgRating.toFixed(1) : undefined}
          badgeVariant={feedbackData.avgRating >= 4 ? "success" : feedbackData.avgRating >= 3 ? "warning" : "danger"}
          defaultOpen={false}
          headerRight={
            <Badge variant="outline" className="text-[10px] h-5">{feedbackData.totalCount} yorum</Badge>
          }
          data-testid="mc-yat-feedback"
        >
          <div className="space-y-1">
            {feedbackData.recent.slice(0, 4).map((fb) => (
              <div key={fb.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/20" data-testid={`yat-feedback-${fb.id}`}>
                <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-2.5 h-2.5 ${i < fb.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">{fb.comment || "Puan verildi"}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Görevlerim"
        defaultOpen={true}
        data-testid="mc-yat-tasks"
      >
        <TodaysTasksWidget />
      </CollapsibleSection>

      <div className="grid grid-cols-2 gap-2" data-testid="mc-yat-quick-actions">
        <Link href="/raporlar">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Raporlar</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/crm">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">CRM & Talepler</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
