import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Clock, 
  Coffee, 
  Play, 
  Timer,
  Calendar,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Monitor,
  ClipboardList,
  ListTodo,
  Bell,
  BellRing,
  XCircle,
  Eye,
  Check,
  Star,
  QrCode
} from "lucide-react";

interface ActiveSession {
  session: {
    id: number;
    userId: string;
    branchId: number;
    checkInTime: string;
    status: string;
    breakMinutes: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    role: string;
  };
}

interface DailySummary {
  summary: {
    id: number;
    userId: string;
    branchId: number;
    workDate: string;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    netWorkMinutes: number;
    sessionCount: number;
    firstCheckIn: string;
    lastCheckOut: string | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface Alert {
  id: number;
  context: string;
  contextId: number;
  triggerType: string;
  severity: 'critical' | 'warning' | 'info';
  status: string;
  title: string;
  message: string;
  occurredAt: string;
  relatedUserId?: string;
}

interface BranchDashboardData {
  branch: {
    id: number;
    name: string;
    city: string;
    address: string;
  };
  stats: {
    activeStaff: number;
    totalShifts: number;
    completedTasks: number;
    pendingTasks: number;
    completedChecklists: number;
    pendingChecklists: number;
    activeAlerts: number;
    criticalAlerts: number;
  };
  alerts: Alert[];
  todayShifts: any[];
  todayTasks: any[];
  todayChecklists: any[];
}

export default function SubeDashboard() {
  // All hooks must be at the top - before any conditional returns
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [branchAuth, setBranchAuth] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Initialize branch auth from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const branchAuthStr = sessionStorage.getItem('branchAuth');
      if (branchAuthStr) {
        try {
          setBranchAuth(JSON.parse(branchAuthStr));
        } catch (e) {
          console.error('Failed to parse branchAuth', e);
        }
      }
      setAuthChecked(true);
    }
  }, []);
  
  // Branch-level authentication check: either branchAuth from sessionStorage or user with branchId
  const hasBranchAccess = branchAuth || user?.branchId;
  
  // Use branchAuth.id if available (branch login), otherwise use user.branchId
  const branchId = branchAuth?.id || user?.branchId || 1;
  const branchName = branchAuth?.name || '';
  const currentUserId = user?.id || 'branch-user';

  // Redirect to login if no branch access (only after auth check is complete)
  useEffect(() => {
    if (authChecked && !hasBranchAccess) {
      setLocation('/login');
    }
  }, [authChecked, hasBranchAccess, setLocation]);

  // All data queries - must be before any conditional returns
  const { data: dashboardData, isLoading: loadingDashboard, refetch } = useQuery<BranchDashboardData>({
    queryKey: ['/api/branch-dashboard', branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-dashboard/${branchId}`);
      if (!res.ok) throw new Error("Dashboard verisi alınamadı");
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: !!branchId && authChecked,
  });

  const { data: activeSessions = [], isLoading: loadingActive, refetch: refetchActive } = useQuery<ActiveSession[]>({
    queryKey: ['/api/branches', branchId, 'kiosk', 'active-shifts'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/kiosk/active-shifts`);
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: authChecked,
  });

  // Customer feedback stats query
  const { data: feedbackStats } = useQuery<{ avgRating: number; totalCount: number }>({
    queryKey: ["/api/customer-feedback/stats", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/customer-feedback/stats/${branchId}`);
      return res.json();
    },
    enabled: !!branchId && authChecked,
  });

  const { data: dailySummaries = [], isLoading: loadingDaily } = useQuery<DailySummary[]>({
    queryKey: ['/api/branches', branchId, 'attendance', 'daily', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/attendance/daily?date=${selectedDate}`);
      return res.json();
    },
    enabled: authChecked,
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('PATCH', `/api/alerts/${alertId}/acknowledge`, { userId: currentUserId });
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Uyarı onaylandı" });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('PATCH', `/api/alerts/${alertId}/dismiss`, {});
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Uyarı kapatıldı" });
    },
  });

  // Show loading while checking auth - this is after all hooks
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}s ${mins}dk`;
    }
    return `${mins}dk`;
  };

  const calculateElapsedTime = (checkInTime: string) => {
    const start = new Date(checkInTime).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 60000);
    return formatMinutes(elapsed);
  };

  const activeCount = activeSessions.filter(s => s.session.status === 'active').length;
  const onBreakCount = activeSessions.filter(s => s.session.status === 'on_break').length;
  const totalActiveMinutes = dailySummaries.reduce((sum, s) => sum + (s.summary.netWorkMinutes || 0), 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-600 border-red-500';
      case 'warning': return 'bg-amber-500/20 text-amber-600 border-amber-500';
      case 'info': return 'bg-blue-500/20 text-blue-600 border-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info': return <Bell className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const criticalAlerts = dashboardData?.alerts.filter(a => a.severity === 'critical') || [];
  const hasCriticalAlerts = criticalAlerts.length > 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {hasCriticalAlerts && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg animate-pulse">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 text-red-500 animate-bounce" />
            <div className="flex-1">
              <p className="font-semibold text-red-600">Kritik Uyarı!</p>
              <p className="text-sm text-red-500">{criticalAlerts[0]?.message}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-red-500 text-red-500"
              onClick={() => acknowledgeAlertMutation.mutate(criticalAlerts[0].id)}
              data-testid="button-ack-critical"
            >
              <Eye className="h-4 w-4 mr-1" />
              Görüldü
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
            <Coffee className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Şube Dashboard</h1>
            <p className="text-muted-foreground">{dashboardData?.branch?.name || 'Yükleniyor...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/sube/kiosk">
            <Button variant="default" className="gap-2" data-testid="button-kiosk-mode">
              <Monitor className="h-4 w-4" />
              Kiosk Modu
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); refetchActive(); }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Badge 
            variant={autoRefresh ? "default" : "secondary"} 
            className="cursor-pointer"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="badge-auto-refresh"
          >
            {autoRefresh ? "Otomatik yenileme açık" : "Otomatik yenileme kapalı"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Play className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktif Çalışan</p>
                <p className="text-2xl font-bold" data-testid="text-active-count">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Coffee className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Molada</p>
                <p className="text-2xl font-bold" data-testid="text-break-count">{onBreakCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Timer className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bugün Toplam</p>
                <p className="text-2xl font-bold" data-testid="text-total-time">{formatMinutes(totalActiveMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`hover-elevate ${(dashboardData?.stats.activeAlerts || 0) > 0 ? 'border-amber-500' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${(dashboardData?.stats.criticalAlerts || 0) > 0 ? 'bg-red-500/20' : 'bg-muted'}`}>
                <Bell className={`h-6 w-6 ${(dashboardData?.stats.criticalAlerts || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uyarılar</p>
                <p className="text-2xl font-bold" data-testid="text-alert-count">
                  {dashboardData?.stats.activeAlerts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(dashboardData?.alerts.length || 0) > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BellRing className="h-5 w-5 text-amber-500" />
              Aktif Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData?.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                data-testid={`alert-item-${alert.id}`}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs opacity-80 truncate">{alert.message}</p>
                  <p className="text-xs opacity-60">{formatTime(alert.occurredAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                    disabled={acknowledgeAlertMutation.isPending}
                    data-testid={`button-ack-${alert.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => dismissAlertMutation.mutate(alert.id)}
                    disabled={dismissAlertMutation.isPending}
                    data-testid={`button-dismiss-${alert.id}`}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            <Play className="h-4 w-4 mr-2" />
            Aktif Vardiyalar
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <ListTodo className="h-4 w-4 mr-2" />
            Görevler
          </TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">
            <ClipboardList className="h-4 w-4 mr-2" />
            Checklistler
          </TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">
            <Calendar className="h-4 w-4 mr-2" />
            Günlük Özet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Şu An Vardiyada Olanlar
                </CardTitle>
                <CardDescription>
                  Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Şu anda vardiyada personel yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map(({ session, user }) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover-elevate"
                      data-testid={`active-session-${session.id}`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Giriş: {formatTime(session.checkInTime)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Süre: {calculateElapsedTime(session.checkInTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.breakMinutes > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Coffee className="h-3 w-3 mr-1" />
                            {formatMinutes(session.breakMinutes)} mola
                          </Badge>
                        )}
                        <Badge variant={session.status === 'on_break' ? 'secondary' : 'default'}>
                          {session.status === 'on_break' ? (
                            <>
                              <Coffee className="h-3 w-3 mr-1" />
                              Molada
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Çalışıyor
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Bugünkü Görevler
                </CardTitle>
                <CardDescription>
                  {dashboardData?.stats.completedTasks || 0} / {(dashboardData?.stats.completedTasks || 0) + (dashboardData?.stats.pendingTasks || 0)} tamamlandı
                </CardDescription>
              </div>
              <Progress 
                value={dashboardData?.stats.completedTasks && dashboardData?.stats.pendingTasks 
                  ? (dashboardData.stats.completedTasks / (dashboardData.stats.completedTasks + dashboardData.stats.pendingTasks)) * 100 
                  : 0} 
                className="w-32 h-2"
              />
            </CardHeader>
            <CardContent>
              {dashboardData?.todayTasks && dashboardData.todayTasks.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.todayTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      data-testid={`task-item-${task.id}`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                      <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                        {task.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bugün henüz görev yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Bugünkü Checklistler
                </CardTitle>
                <CardDescription>
                  {dashboardData?.stats.completedChecklists || 0} / {(dashboardData?.stats.completedChecklists || 0) + (dashboardData?.stats.pendingChecklists || 0)} tamamlandı
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData?.todayChecklists && dashboardData.todayChecklists.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.todayChecklists.map((checklist: any) => (
                    <div 
                      key={checklist.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      data-testid={`checklist-item-${checklist.id}`}
                    >
                      {checklist.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{checklist.title}</p>
                        {checklist.firstName && (
                          <p className="text-xs text-muted-foreground">
                            Atanan: {checklist.firstName} {checklist.lastName}
                          </p>
                        )}
                      </div>
                      <Badge variant={checklist.status === 'completed' ? 'default' : 'secondary'}>
                        {checklist.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bugün henüz checklist yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Günlük Puantaj Özeti
                </CardTitle>
                <CardDescription>
                  Tarih seçerek geçmiş günleri görüntüleyebilirsiniz
                </CardDescription>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                data-testid="input-date"
              />
            </CardHeader>
            <CardContent>
              {loadingDaily ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : dailySummaries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bu tarihte kayıtlı vardiya yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead className="text-center">Giriş</TableHead>
                        <TableHead className="text-center">Çıkış</TableHead>
                        <TableHead className="text-center">Toplam</TableHead>
                        <TableHead className="text-center">Mola</TableHead>
                        <TableHead className="text-center">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySummaries.map(({ summary, user }) => (
                        <TableRow key={summary.id} data-testid={`summary-row-${summary.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user?.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {summary.firstCheckIn ? formatTime(summary.firstCheckIn) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {summary.lastCheckOut ? formatTime(summary.lastCheckOut) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatMinutes(summary.totalWorkMinutes || 0)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatMinutes(summary.totalBreakMinutes || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              (summary.netWorkMinutes || 0) >= 450 ? 'default' : 
                              (summary.netWorkMinutes || 0) >= 360 ? 'secondary' : 'destructive'
                            }>
                              {formatMinutes(summary.netWorkMinutes || 0)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Hızlı Erişim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/sube/kiosk">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-kiosk-quick">
                <Monitor className="h-8 w-8 text-amber-500" />
                <span>Kiosk Modu</span>
              </Button>
            </Link>
            <Link href="/gorevler">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-tasks">
                <ListTodo className="h-8 w-8 text-blue-500" />
                <span>Görevler</span>
              </Button>
            </Link>
            <Link href="/checklistler">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-checklists">
                <ClipboardList className="h-8 w-8 text-green-500" />
                <span>Checklistler</span>
              </Button>
            </Link>
            <Link href="/vardiya-planlama">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2" data-testid="link-shifts">
                <Calendar className="h-8 w-8 text-purple-500" />
                <span>Vardiya Planı</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
