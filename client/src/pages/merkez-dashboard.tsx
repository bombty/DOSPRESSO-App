import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Users,
  ClipboardCheck,
  ListTodo,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Building2,
  ChevronRight,
  RefreshCw,
  Shield,
  BarChart3,
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
}

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

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-2">
        <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="DOSPRESSO" className="h-7" data-testid="img-logo" />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-dashboard-title">Merkez Yönetim</h1>
              <p className="text-[10px] text-muted-foreground">
                {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-full-dashboard">
                <BarChart3 className="h-3.5 w-3.5" />
                Detaylı Panel
              </Button>
            </Link>
            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
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
                    <div className="p-2 bg-blue-500/20 rounded-lg">
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
                    <div className="p-2 bg-green-500/20 rounded-lg">
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
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Checklist Tamamlama</p>
                      <p className="text-lg font-bold" data-testid="text-checklist-rate">%{data?.checklistCompletion?.rate || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-tasks">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
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
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
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
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
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
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Bugünkü Checklist Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Şube Durum Özeti
                </CardTitle>
                <Link href="/subeler">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="button-all-branches">
                    Tümü
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {data?.branchPerformance && data.branchPerformance.length > 0 ? (
                  <div className="space-y-1.5">
                    {data.branchPerformance.slice(0, 8).map((branch) => (
                      <Link key={branch.branchId} href={`/subeler/${branch.branchId}`}>
                        <div
                          className="flex items-center gap-2 p-2 rounded-lg border hover-elevate cursor-pointer"
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
                      </Link>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Link href="/operasyon">
                <Card className="hover-elevate cursor-pointer" data-testid="link-operations">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Operasyon</p>
                      <p className="text-[10px] text-muted-foreground">Şube yönetimi</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin">
                <Card className="hover-elevate cursor-pointer" data-testid="link-admin">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Admin</p>
                      <p className="text-[10px] text-muted-foreground">Sistem ayarları</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/raporlar">
                <Card className="hover-elevate cursor-pointer" data-testid="link-reports">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="p-2 bg-teal-500/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Raporlar</p>
                      <p className="text-[10px] text-muted-foreground">Analitik & AI</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/ik">
                <Card className="hover-elevate cursor-pointer" data-testid="link-hr">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="p-2 bg-rose-500/20 rounded-lg">
                      <Users className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">IK</p>
                      <p className="text-[10px] text-muted-foreground">Personel yönetimi</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
