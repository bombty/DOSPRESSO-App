import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  Clock,
  Play,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Monitor,
  ClipboardList,
  Bell,
  XCircle,
  Check,
  QrCode,
  AlertCircle,
  AlertTriangle,
  Coffee,
  CircleDot,
  LogOut,
} from "lucide-react";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

interface WeeklyShift {
  id: number;
  assignedToId: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
}

interface ChecklistItem {
  id: number;
  checklistId: number;
  userId: string;
  status: string;
  completedTasks: number;
  totalTasks: number;
  completedAt: string | null;
  isLate: boolean | null;
  score: number | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  firstName: string | null;
  lastName: string | null;
  checklistTitle: string | null;
  checklistCategory: string | null;
}

interface DashboardData {
  branch: { id: number; name: string; city: string; address: string };
  weekDates: { monday: string; sunday: string };
  weeklyShifts: WeeklyShift[];
  todayChecklists: ChecklistItem[];
  stats: {
    activeStaff: number;
    completedTasks: number;
    pendingTasks: number;
    completedChecklists: number;
    pendingChecklists: number;
    activeAlerts: number;
  };
  alerts: any[];
}

const SHIFT_TYPE_LABELS: Record<string, string> = {
  morning: "Sabah",
  evening: "Akşam",
  night: "Gece",
};

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function SubeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [branchAuth, setBranchAuth] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const branchAuthStr = sessionStorage.getItem("branchAuth");
      if (branchAuthStr) {
        try {
          setBranchAuth(JSON.parse(branchAuthStr));
        } catch (e) {
          console.error("Failed to parse branchAuth", e);
        }
      }
      setAuthChecked(true);
    }
  }, []);

  const hasBranchAccess = branchAuth || user?.branchId;
  const branchId = branchAuth?.id || user?.branchId || 1;

  useEffect(() => {
    if (authChecked && !hasBranchAccess) {
      setLocation("/login");
    }
  }, [authChecked, hasBranchAccess, setLocation]);

  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["/api/branch-dashboard-v2", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-dashboard-v2/${branchId}`);
      if (!res.ok) throw new Error("Dashboard verisi alınamadı");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!branchId && authChecked,
  });

  const { data: evalStatus } = useQuery<{
    evaluated: any[];
    notEvaluated: any[];
    summary: { total: number; evaluated: number; notEvaluated: number; percentage: number; daysLeft: number };
  }>({
    queryKey: ["/api/evaluation-status"],
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/acknowledge`, {
        userId: user?.id || "branch-user",
      });
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Uyarı onaylandı" });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/dismiss`, {});
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Uyarı kapatıldı" });
    },
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("branchAuth");
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const getWeekDays = () => {
    if (!dashboardData?.weekDates) return [];
    const monday = new Date(dashboardData.weekDates.monday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };

  const weekDays = getWeekDays();

  const uniqueEmployees = dashboardData?.weeklyShifts
    ? Array.from(
        new Map(
          dashboardData.weeklyShifts
            .filter((s) => s.assignedToId)
            .map((s) => [
              s.assignedToId,
              { id: s.assignedToId, name: `${s.firstName || ""} ${s.lastName || ""}`.trim(), role: s.role },
            ])
        ).values()
      )
    : [];

  const getShiftForDay = (employeeId: string | null, dateStr: string) => {
    return dashboardData?.weeklyShifts.find(
      (s) => s.assignedToId === employeeId && s.shiftDate === dateStr
    );
  };

  const getShiftBadge = (shiftType: string) => {
    switch (shiftType) {
      case "morning":
        return <Badge variant="default" className="text-[10px] bg-amber-500">S</Badge>;
      case "evening":
        return <Badge variant="default" className="text-[10px] bg-blue-600">A</Badge>;
      case "night":
        return <Badge variant="default" className="text-[10px] bg-indigo-800 text-white">G</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{shiftType?.[0] || "?"}</Badge>;
    }
  };

  const completedChecklists = dashboardData?.todayChecklists.filter(
    (c) => c.status === "completed" || c.status === "submitted" || c.status === "reviewed"
  ) || [];
  const pendingChecklists = dashboardData?.todayChecklists.filter(
    (c) => c.status !== "completed" && c.status !== "submitted" && c.status !== "reviewed"
  ) || [];

  const checklistTotal = dashboardData?.todayChecklists.length || 0;
  const checklistDoneCount = completedChecklists.length;
  const checklistRate = checklistTotal > 0 ? Math.round((checklistDoneCount / checklistTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-2">
        <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="DOSPRESSO" className="h-7" data-testid="img-logo" />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-branch-name">
                {dashboardData?.branch.name || "Şube"}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href="/sube/kiosk">
              <Button size="sm" variant="default" className="gap-1.5" data-testid="button-kiosk-mode">
                <Monitor className="h-3.5 w-3.5" />
                Kiosk
              </Button>
            </Link>
            <Link href="/qr-scanner">
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-qr-view">
                <QrCode className="h-3.5 w-3.5" />
                QR
              </Button>
            </Link>
            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5" data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5" />
              Cikis
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Aktif Personel</p>
                      <p className="text-lg font-bold" data-testid="text-active-staff">{dashboardData?.stats.activeStaff || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <ClipboardList className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Checklist</p>
                      <p className="text-lg font-bold" data-testid="text-checklist-rate">%{checklistRate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Görev Tamamlama</p>
                      <p className="text-lg font-bold" data-testid="text-tasks-done">
                        {dashboardData?.stats.completedTasks || 0}/{(dashboardData?.stats.completedTasks || 0) + (dashboardData?.stats.pendingTasks || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${(dashboardData?.stats.activeAlerts || 0) > 0 ? "bg-red-500/20" : "bg-muted"}`}>
                      <Bell className={`h-4 w-4 ${(dashboardData?.stats.activeAlerts || 0) > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Uyarılar</p>
                      <p className="text-lg font-bold" data-testid="text-alerts">{dashboardData?.stats.activeAlerts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(dashboardData?.alerts?.length || 0) > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    Aktif Uyarılar
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {dashboardData?.alerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                        alert.severity === "critical"
                          ? "bg-red-500/10 border-red-500/30"
                          : alert.severity === "warning"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                      }`}
                      data-testid={`alert-item-${alert.id}`}
                    >
                      {alert.severity === "critical" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{alert.title}</p>
                        <p className="text-muted-foreground truncate">{alert.message}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                          data-testid={`button-ack-${alert.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => dismissAlertMutation.mutate(alert.id)}
                          data-testid={`button-dismiss-${alert.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {evalStatus && evalStatus.notEvaluated.length > 0 && (
              <Card data-testid="card-eval-warnings">
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${evalStatus.summary.daysLeft < 5 ? "text-red-500" : evalStatus.summary.daysLeft < 15 ? "text-amber-500" : "text-muted-foreground"}`} />
                    Değerlendirilmemiş Personel
                  </CardTitle>
                  <Badge variant={evalStatus.summary.daysLeft < 5 ? "destructive" : "secondary"} data-testid="badge-days-left">
                    {evalStatus.summary.daysLeft} gün kaldı
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{evalStatus.summary.evaluated}/{evalStatus.summary.total} personel değerlendirildi</span>
                    <span className="font-medium">%{evalStatus.summary.percentage}</span>
                  </div>
                  <Progress value={evalStatus.summary.percentage} className="h-2" />
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {evalStatus.notEvaluated.map((emp: any) => (
                      <Link key={emp.id} href={`/personel/${emp.id}`}>
                        <div className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`eval-warning-${emp.id}`}>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{emp.role}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Haftalık Vardiya Planı
                </CardTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Badge variant="default" className="text-[9px] bg-amber-500 px-1">S</Badge> Sabah</span>
                  <span className="flex items-center gap-1"><Badge variant="default" className="text-[9px] bg-blue-600 px-1">A</Badge> Akşam</span>
                  <span className="flex items-center gap-1"><Badge variant="default" className="text-[9px] bg-indigo-800 text-white px-1">G</Badge> Gece</span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {uniqueEmployees.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Bu hafta için vardiya planı bulunmuyor</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs min-w-[100px]">Personel</TableHead>
                          {weekDays.map((dateStr, i) => {
                            const isToday = dateStr === todayStr;
                            return (
                              <TableHead
                                key={dateStr}
                                className={`text-xs text-center min-w-[50px] ${isToday ? "bg-primary/10 font-bold" : ""}`}
                              >
                                <div>{DAY_NAMES[i]}</div>
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  {new Date(dateStr).getDate()}
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uniqueEmployees.map((emp) => (
                          <TableRow key={emp.id} data-testid={`shift-row-${emp.id}`}>
                            <TableCell className="text-xs font-medium py-1.5">
                              {emp.name || "İsimsiz"}
                            </TableCell>
                            {weekDays.map((dateStr, i) => {
                              const shift = getShiftForDay(emp.id, dateStr);
                              const isToday = dateStr === todayStr;
                              return (
                                <TableCell
                                  key={dateStr}
                                  className={`text-center py-1.5 ${isToday ? "bg-primary/5" : ""}`}
                                >
                                  {shift ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      {getShiftBadge(shift.shiftType)}
                                      <span className="text-[9px] text-muted-foreground">
                                        {shift.startTime?.slice(0, 5)}-{shift.endTime?.slice(0, 5)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Günlük Checklist Durumu
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {checklistDoneCount}/{checklistTotal} tamamlandı
                  </p>
                </div>
                <Progress value={checklistRate} className="w-24 h-2" data-testid="progress-checklist" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {checklistTotal === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Bugün checklist ataması bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingChecklists.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1.5 flex items-center gap-1">
                          <CircleDot className="h-3 w-3" />
                          Tamamlanmamış ({pendingChecklists.length})
                        </p>
                        <div className="space-y-1">
                          {pendingChecklists.map((cl) => (
                            <div
                              key={cl.id}
                              className="flex items-center gap-2 p-2 rounded-lg border border-red-500/20 bg-red-500/5"
                              data-testid={`checklist-pending-${cl.id}`}
                            >
                              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {cl.firstName} {cl.lastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {cl.checklistTitle || "Checklist"}
                                  {cl.timeWindowStart && ` (${cl.timeWindowStart?.slice(0, 5)}-${cl.timeWindowEnd?.slice(0, 5)})`}
                                </p>
                              </div>
                              <Badge variant="destructive" className="text-[10px] shrink-0">
                                {cl.completedTasks}/{cl.totalTasks}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {completedChecklists.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Tamamlanan ({completedChecklists.length})
                        </p>
                        <div className="space-y-1">
                          {completedChecklists.map((cl) => (
                            <div
                              key={cl.id}
                              className="flex items-center gap-2 p-2 rounded-lg border border-green-500/20 bg-green-500/5"
                              data-testid={`checklist-done-${cl.id}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {cl.firstName} {cl.lastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {cl.checklistTitle || "Checklist"}
                                  {cl.completedAt && ` - ${new Date(cl.completedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}
                                </p>
                              </div>
                              <Badge variant="default" className="text-[10px] bg-green-600 shrink-0">
                                {cl.completedTasks}/{cl.totalTasks}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
