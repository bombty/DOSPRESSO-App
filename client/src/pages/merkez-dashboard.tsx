import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import {
  Store,
  Users,
  ClipboardCheck,
  ListTodo,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Clock,
  UserCheck,
  LogOut,
} from "lucide-react";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

interface HQSummaryData {
  totalBranches: number;
  activeEmployees: number;
  checklistCompletion: {
    total: number;
    completed: number;
    rate: number;
  };
  openTasks: number;
  alerts: {
    total: number;
    critical: number;
  };
  branchPerformance: Array<{
    branchId: number;
    branchName: string;
    openTasks: number;
  }>;
  merkezStaff?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    todayShift?: {
      startTime: string;
      endTime: string;
      shiftType: string;
    } | null;
  }>;
}

const roleLabels: Record<string, string> = {
  admin: "Yönetici",
  ceo: "CEO",
  cgo: "CGO",
  coach: "Coach",
  trainer: "Eğitmen",
  muhasebe_ik: "Muhasebe/İK",
  muhasebe: "Muhasebe",
  satinalma: "Satınalma",
  marketing: "Pazarlama",
  supervisor: "Süpervizör",
  supervisor_buddy: "Süpervizör Yrd.",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
  stajyer: "Stajyer",
  yatirimci_branch: "Yatırımcı",
  fabrika_mudur: "Fabrika Müdürü",
  fabrika_operator: "Fabrika Operatör",
  teknik: "Teknik",
  destek: "Destek",
};

const shiftTypeLabels: Record<string, string> = {
  morning: "Sabah",
  evening: "Akşam",
  night: "Gece",
  full: "Tam Gün",
};

export default function MerkezDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading, refetch } = useQuery<HQSummaryData>({
    queryKey: ["/api/hq-dashboard-summary"],
    refetchInterval: 60000,
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  const today = new Date();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-2">
        <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="DOSPRESSO" className="h-8" data-testid="img-logo" />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-dashboard-title">Merkez Yönetim Paneli</h1>
              <p className="text-[10px] text-muted-foreground">
                {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5" data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card data-testid="card-branches">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                      <Store className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Toplam Şube</p>
                      <p className="text-lg font-bold" data-testid="text-total-branches">{data?.totalBranches || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-employees">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg shrink-0">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Aktif Personel</p>
                      <p className="text-lg font-bold" data-testid="text-active-employees">{data?.activeEmployees || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-checklists">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Checklist</p>
                      <p className="text-lg font-bold" data-testid="text-checklist-rate">%{data?.checklistCompletion?.rate || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-tasks">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                      <ListTodo className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Açık Görev</p>
                      <p className="text-lg font-bold" data-testid="text-open-tasks">{data?.openTasks || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(data?.alerts?.critical || 0) > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3" data-testid="panel-critical-alerts">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">
                      {data?.alerts.critical} Kritik Uyarı
                    </p>
                    <p className="text-[10px] text-red-600 dark:text-red-400/80">
                      Toplam {data?.alerts.total} aktif uyarı mevcut
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(data?.alerts?.total || 0) > 0 && (data?.alerts?.critical || 0) === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3" data-testid="panel-alerts">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {data?.alerts.total} aktif uyarı mevcut
                  </p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <UserCheck className="h-3.5 w-3.5" />
                  Merkez Personel Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {data?.merkezStaff && data.merkezStaff.length > 0 ? (
                  <div className="space-y-1.5">
                    {data.merkezStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center gap-2 p-2 rounded-lg border"
                        data-testid={`staff-row-${staff.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {roleLabels[staff.role] || staff.role}
                          </p>
                        </div>
                        {staff.todayShift ? (
                          <Badge variant="default" className="text-[10px] gap-1 shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {staff.todayShift.startTime?.slice(0, 5)} - {staff.todayShift.endTime?.slice(0, 5)}
                            {" "}({shiftTypeLabels[staff.todayShift.shiftType] || staff.todayShift.shiftType})
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Vardiya yok
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Merkez personel verisi bulunamadı</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Bugünkü Checklist Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Tamamlanan / Toplam</span>
                    <span className="font-medium" data-testid="text-checklist-summary">
                      {data?.checklistCompletion?.completed || 0} / {data?.checklistCompletion?.total || 0}
                    </span>
                  </div>
                  <Progress
                    value={data?.checklistCompletion?.rate || 0}
                    className="h-2.5"
                    data-testid="progress-checklist-overall"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">
                    Tüm şubelerde günlük checklist tamamlanma oranı
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Şube Durum Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {data?.branchPerformance && data.branchPerformance.length > 0 ? (
                  <div className="space-y-1.5">
                    {data.branchPerformance.slice(0, 8).map((branch) => (
                      <div
                        key={branch.branchId}
                        className="flex items-center gap-2 p-2 rounded-lg border"
                        data-testid={`branch-row-${branch.branchId}`}
                      >
                        <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium flex-1 truncate">{branch.branchName}</span>
                        {branch.openTasks > 0 ? (
                          <Badge
                            variant={branch.openTasks > 5 ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {branch.openTasks} görev
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] bg-green-600">
                            Tamam
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Şube verisi bulunamadı</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
