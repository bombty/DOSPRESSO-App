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
import { UnifiedHero } from "@/components/widgets/unified-hero";
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
  QrCode,
  GraduationCap,
  Users2
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

  // Onboarding assignments query
  interface OnboardingAssignment {
    id: number;
    userId: string;
    branchId: number;
    templateId: number;
    startDate: string;
    expectedEndDate: string;
    actualEndDate: string | null;
    status: 'active' | 'completed' | 'cancelled' | 'on_hold';
    overallProgress: number;
    managerNotified: boolean;
    evaluationStatus: string | null;
    createdAt: string;
    employeeName: string;
    templateName: string;
    templateDurationDays: number;
  }

  const { data: onboardingAssignments = [] } = useQuery<OnboardingAssignment[]>({
    queryKey: ["/api/employee-onboarding-assignments/branch", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/employee-onboarding-assignments/branch/${branchId}`);
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
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const criticalAlerts = dashboardData?.alerts.filter(a => a.severity === 'critical') || [];
  const hasCriticalAlerts = criticalAlerts.length > 0;

  return (
    <div className="container mx-auto p-3 space-y-3">
      {hasCriticalAlerts && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-lg animate-pulse">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-red-500 animate-bounce" />
            <div className="flex-1">
              <p className="font-semibold text-red-600 text-xs">Kritik Uyarı!</p>
              <p className="text-xs text-red-500">{criticalAlerts[0]?.message}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-red-500 text-red-500"
              onClick={() => acknowledgeAlertMutation.mutate(criticalAlerts[0].id)}
              data-testid="button-ack-critical"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Görüldü
            </Button>
          </div>
        </div>
      )}

      <UnifiedHero />

      <div className="flex items-center gap-2 flex-wrap">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetch(); refetchActive(); }}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Play className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif Çalışan</p>
                <p className="text-sm font-bold" data-testid="text-active-count">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Coffee className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Molada</p>
                <p className="text-sm font-bold" data-testid="text-break-count">{onBreakCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Timer className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bugün Toplam</p>
                <p className="text-sm font-bold" data-testid="text-total-time">{formatMinutes(totalActiveMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`hover-elevate ${(dashboardData?.stats.activeAlerts || 0) > 0 ? 'border-amber-500' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${(dashboardData?.stats.criticalAlerts || 0) > 0 ? 'bg-red-500/20' : 'bg-muted'}`}>
                <Bell className={`h-4 w-4 ${(dashboardData?.stats.criticalAlerts || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Uyarılar</p>
                <p className="text-sm font-bold" data-testid="text-alert-count">
                  {dashboardData?.stats.activeAlerts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate col-span-2 md:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Müşteri Puanı</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" data-testid="text-feedback-rating">
                    {feedbackStats?.avgRating?.toFixed(1) || '—'}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ({feedbackStats?.totalCount || 0} değerlendirme)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(dashboardData?.alerts.length || 0) > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="flex items-center gap-2 text-xs">
              <BellRing className="h-3.5 w-3.5 text-amber-500" />
              Aktif Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {dashboardData?.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-center gap-2 p-2 rounded-lg border ${getSeverityColor(alert.severity)}`}
                data-testid={`alert-item-${alert.id}`}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{alert.title}</p>
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
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => dismissAlertMutation.mutate(alert.id)}
                    disabled={dismissAlertMutation.isPending}
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

      {/* Onboarding Assignments Widget */}
      {onboardingAssignments.length > 0 && (
        <Card className="mb-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xs">
                <GraduationCap className="h-3.5 w-3.5" />
                Aktif Onboarding Süreçleri
              </CardTitle>
              <CardDescription className="text-xs">
                Şubede eğitim sürecinde olan personeller
              </CardDescription>
            </div>
            <Link href="/sube/onboarding">
              <Button variant="outline" size="sm" data-testid="button-view-all-onboarding">
                Tümünü Gör
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {onboardingAssignments
                .filter(a => a.status === 'active')
                .slice(0, 6)
                .map((assignment) => {
                  const daysRemaining = assignment.expectedEndDate
                    ? Math.max(0, Math.ceil((new Date(assignment.expectedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : null;
                  
                  const getStatusBadge = (status: string, progress: number) => {
                    if (progress === 100) return <Badge variant="default" className="bg-green-500 text-[10px]">Tamamlandı</Badge>;
                    if (status === 'on_hold') return <Badge variant="secondary" className="text-[10px]">Beklemede</Badge>;
                    if (daysRemaining !== null && daysRemaining <= 3) return <Badge variant="destructive" className="text-[10px]">Son {daysRemaining} Gün</Badge>;
                    return <Badge variant="outline" className="text-[10px]">Devam Ediyor</Badge>;
                  };

                  return (
                    <Card key={assignment.id} className="hover-elevate" data-testid={`card-onboarding-${assignment.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Users2 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate" data-testid={`text-employee-name-${assignment.id}`}>
                                {assignment.employeeName || 'İsimsiz'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {assignment.templateName || 'Şablon Yok'}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(assignment.status, assignment.overallProgress)}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">İlerleme</span>
                            <span className="font-medium" data-testid={`text-progress-${assignment.id}`}>
                              %{assignment.overallProgress || 0}
                            </span>
                          </div>
                          <Progress 
                            value={assignment.overallProgress || 0} 
                            className="h-2"
                            data-testid={`progress-bar-${assignment.id}`}
                          />
                          
                          {daysRemaining !== null && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                              <span>Kalan Süre</span>
                              <span className={daysRemaining <= 3 ? 'text-red-500 font-medium' : ''}>
                                {daysRemaining} gün
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
            {onboardingAssignments.filter(a => a.status === 'active').length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Aktif onboarding süreci bulunmuyor</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="space-y-3">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            <Play className="h-3.5 w-3.5 mr-2" />
            Aktif Vardiyalar
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <ListTodo className="h-3.5 w-3.5 mr-2" />
            Görevler
          </TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">
            <ClipboardList className="h-3.5 w-3.5 mr-2" />
            Checklistler
          </TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Günlük Özet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Şu An Vardiyada Olanlar
                </CardTitle>
                <CardDescription className="text-xs">
                  Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Şu anda vardiyada personel yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map(({ session, user }) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-card hover-elevate"
                      data-testid={`active-session-${session.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{user.firstName} {user.lastName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Giriş: {formatTime(session.checkInTime)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Süre: {calculateElapsedTime(session.checkInTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.breakMinutes > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Coffee className="h-3 w-3 mr-1" />
                            {formatMinutes(session.breakMinutes)} mola
                          </Badge>
                        )}
                        <Badge variant={session.status === 'on_break' ? 'secondary' : 'default'} className="text-[10px]">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xs">
                  <ListTodo className="h-3.5 w-3.5" />
                  Bugünkü Görevler
                </CardTitle>
                <CardDescription className="text-xs">
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
            <CardContent className="px-3 pb-3">
              {dashboardData?.todayTasks && dashboardData.todayTasks.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.todayTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-2 p-2 rounded-lg border"
                      data-testid={`task-item-${task.id}`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-xs ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                      <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                        {task.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Bugün henüz görev yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xs">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Bugünkü Checklistler
                </CardTitle>
                <CardDescription className="text-xs">
                  {dashboardData?.stats.completedChecklists || 0} / {(dashboardData?.stats.completedChecklists || 0) + (dashboardData?.stats.pendingChecklists || 0)} tamamlandı
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {dashboardData?.todayChecklists && dashboardData.todayChecklists.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.todayChecklists.map((checklist: any) => (
                    <div 
                      key={checklist.id} 
                      className="flex items-center gap-2 p-2 rounded-lg border"
                      data-testid={`checklist-item-${checklist.id}`}
                    >
                      {checklist.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{checklist.title}</p>
                        {checklist.firstName && (
                          <p className="text-xs text-muted-foreground">
                            Atanan: {checklist.firstName} {checklist.lastName}
                          </p>
                        )}
                      </div>
                      <Badge variant={checklist.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                        {checklist.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Bugün henüz checklist yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 pt-3 px-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Günlük Puantaj Özeti
                </CardTitle>
                <CardDescription className="text-xs">
                  Tarih seçerek geçmiş günleri görüntüleyebilirsiniz
                </CardDescription>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-xs"
                data-testid="input-date"
              />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loadingDaily ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : dailySummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Bu tarihte kayıtlı vardiya yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Personel</TableHead>
                        <TableHead className="text-center text-xs">Giriş</TableHead>
                        <TableHead className="text-center text-xs">Çıkış</TableHead>
                        <TableHead className="text-center text-xs">Toplam</TableHead>
                        <TableHead className="text-center text-xs">Mola</TableHead>
                        <TableHead className="text-center text-xs">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySummaries.map(({ summary, user }) => (
                        <TableRow key={summary.id} data-testid={`summary-row-${summary.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user?.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {summary.firstCheckIn ? formatTime(summary.firstCheckIn) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {summary.lastCheckOut ? formatTime(summary.lastCheckOut) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {formatMinutes(summary.totalWorkMinutes || 0)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {formatMinutes(summary.totalBreakMinutes || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="text-[10px]" variant={
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

    </div>
  );
}
