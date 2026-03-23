import { useQuery, useMutation } from "@tanstack/react-query";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Brain,
  RefreshCw,
  Send,
  Loader2,
  Building2,
  Users,
  Factory,
  ClipboardCheck,
  ShieldCheck,
  GraduationCap,
  Eye,
  User,
  Store,
  Wrench,
  Target,
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { Textarea } from "@/components/ui/textarea";
import { CEOFinancialCard } from "@/components/ceo-financial-card";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";

interface DeptDetail {
  key: string;
  value: string;
}

interface DeptSummary {
  label: string;
  source: string;
  status: 'healthy' | 'warning' | 'critical';
  mainMetric: string;
  details: DeptDetail[];
  alert: string | null;
}

interface UrgentAlert {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
  count?: number;
}

interface BottomManager {
  id: string | number;
  name: string;
  department: string;
  score: number;
}

interface KPISummary {
  totalBranches: number;
  totalEmployees: number;
  activeFaults: number;
  equipmentUptime: number;
  monthlyRevenue?: string;
  branchAvgScore: number;
}

interface CEODashboardData {
  urgentAlerts: UrgentAlert[];
  departments: DeptSummary[];
  bottomManagers: BottomManager[];
  kpiSummary?: KPISummary;
  lastUpdated: string;
}

const HQ_ROLES_LIST = ['ceo', 'cgo', 'admin', 'satinalma', 'kalite_kontrol', 'muhasebe', 'muhasebe_ik', 'coach', 'trainer', 'teknik', 'fabrika', 'fabrika_mudur', 'fabrika_sorumlu', 'destek', 'operasyon', 'marketing', 'ik'];

const roleTitles: Record<string, string> = {
  ceo: "CEO Komuta Merkezi",
  cgo: "CGO Komuta Merkezi",
  admin: "Admin Komuta Merkezi",
  satinalma: "Satınalma Komuta Merkezi",
  kalite_kontrol: "Kalite Kontrol Komuta Merkezi",
  muhasebe: "Muhasebe Komuta Merkezi",
  muhasebe_ik: "Muhasebe & IK Komuta Merkezi",
  coach: "Coach Komuta Merkezi",
  trainer: "Trainer Komuta Merkezi",
  teknik: "Teknik Komuta Merkezi",
  fabrika: "Fabrika Komuta Merkezi",
  fabrika_mudur: "Fabrika Müdürü Komuta Merkezi",
  destek: "Destek Komuta Merkezi",
  operasyon: "Operasyon Komuta Merkezi",
  marketing: "Pazarlama Komuta Merkezi",
  ik: "IK Komuta Merkezi",
};

function getDeptIcon(source: string) {
  switch (source) {
    case 'CGO': return <Building2 className="w-4 h-4" />;
    case 'Muhasebe & IK': return <Users className="w-4 h-4" />;
    case 'Fabrika Müdürü': return <Factory className="w-4 h-4" />;
    case 'Fabrika': return <Factory className="w-4 h-4" />;
    case 'Coach': return <ClipboardCheck className="w-4 h-4" />;
    case 'Kalite Kontrol': return <ShieldCheck className="w-4 h-4" />;
    case 'Trainer': return <GraduationCap className="w-4 h-4" />;
    case 'Satınalma': return <Store className="w-4 h-4" />;
    case 'Teknik': return <Wrench className="w-4 h-4" />;
    case 'Destek': return <AlertCircle className="w-4 h-4" />;
    default: return <Eye className="w-4 h-4" />;
  }
}

function getStatusIcon(status: 'healthy' | 'warning' | 'critical') {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
}

function getStatusVariant(status: 'healthy' | 'warning' | 'critical'): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'healthy': return 'default';
    case 'warning': return 'secondary';
    case 'critical': return 'destructive';
  }
}

function AIAssistant() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/ceo/ai-assistant", { question: q });
      return await res.json();
    },
    onSuccess: (data) => setAnswer(data.answer),
    onError: (error: any) => toast({ title: "Hata", description: error?.message || "AI yanıt veremedi", variant: "destructive" }),
  });

  const suggestions = [
    "Bu hafta nelere dikkat etmeliyim?",
    "Şube performansları nasıl?",
    "Personel durumu hakkında özet ver",
    "En büyük riskler neler?",
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Strateji Danışmanı
          </CardTitle>
          <p className="text-xs text-muted-foreground">DOSPRESSO verilerine dayalı akıllı öneriler</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Sorunuzu yazın..."
              className="flex-1"
              rows={2}
              data-testid="textarea-ai-question"
            />
            <Button
              size="icon"
              onClick={() => { askMutation.mutate(question); }}
              disabled={!question.trim() || askMutation.isPending}
              data-testid="button-ai-ask"
            >
              {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {suggestions.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setQuestion(s); askMutation.mutate(s); }}
                disabled={askMutation.isPending}
                data-testid={`button-ai-suggestion-${i}`}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {answer && (
        <Card data-testid="card-ai-answer">
          <CardContent className="pt-4">
            <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap">{answer}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AbuseAlert {
  type: string;
  severity: string;
  correctedById: string;
  correctorName: string;
  employeeId?: string;
  employeeName?: string;
  branchId: number | null;
  totalCorrections?: number;
  uniqueEmployees?: number;
  correctionCount?: number;
  message: string;
}

interface AbuseReport {
  alerts: AbuseAlert[];
  totalAlerts: number;
}

const MissionControlHQ = lazy(() => import("@/components/mission-control/MissionControlHQ"));

export default function CEOCommandCenter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isMissionControl, isLoading: modeLoading } = useDashboardMode();

  if (!modeLoading && isMissionControl) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Yükleniyor...</p></div>}>
        <MissionControlHQ />
      </Suspense>
    );
  }

  const isHQRole = user?.role ? HQ_ROLES_LIST.includes(user.role) : false;
  const isCeoOrCgo = user?.role === 'ceo' || user?.role === 'cgo';
  const showFinancialCard = ['ceo', 'cgo', 'admin', 'muhasebe'].includes(user?.role || '');

  const pageTitle = roleTitles[user?.role || ''] || "Komuta Merkezi";

  const { data: dashboardData, isLoading, isRefetching, refetch, isError } = useQuery<CEODashboardData>({
    queryKey: ["/api/hq/command-center"],
    refetchInterval: 60000,
    enabled: isHQRole,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 5000),
  });

  const { data: abuseReport } = useQuery<AbuseReport>({
    queryKey: ["/api/shift-corrections/abuse-report"],
    refetchInterval: 300000,
    enabled: isCeoOrCgo,
  });

  const { data: evalCoverage } = useQuery<{
    branches: { branchId: number; branchName: string; totalEmployees: number; evaluatedCount: number; notEvaluatedCount: number; percentage: number }[];
    summary: { totalBranches: number; totalEmployees: number; totalEvaluated: number; totalNotEvaluated: number; overallPercentage: number; daysLeft: number; month: string };
  }>({
    queryKey: ["/api/evaluation-coverage"],
    refetchInterval: 300000,
    enabled: isCeoOrCgo,
  });

  if (user && !isHQRole) {
    setLocation('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Dashboard verileri yüklenemedi</p>
            <Button variant="outline" className="mt-3" onClick={() => refetch()} data-testid="button-retry">Tekrar Dene</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalAlerts = dashboardData.urgentAlerts.filter(a => a.severity === 'critical');

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold" data-testid="heading-ceo-dashboard">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground">
              Son güncelleme: {new Date(dashboardData.lastUpdated).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Eye className="w-4 h-4 mr-1.5" />Özet
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Brain className="w-4 h-4 mr-1.5" />AI Asistan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">

          {dashboardData.urgentAlerts.length > 0 && (
            <Card data-testid="card-urgent-alerts">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${criticalAlerts.length > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                  Dikkat Gerektiren Konular ({dashboardData.urgentAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {dashboardData.urgentAlerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm" data-testid={`alert-item-${i}`}>
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      )}
                      <span className="flex-1">{alert.message}</span>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {alert.severity === 'critical' ? 'Acil' : 'Uyarı'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dashboardData.urgentAlerts.length === 0 && (
            <Card data-testid="card-all-clear">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Her şey yolunda</p>
                  <p className="text-xs text-muted-foreground">Acil dikkat gerektiren bir konu yok</p>
                </div>
              </CardContent>
            </Card>
          )}

          {dashboardData.kpiSummary && (
            <CompactKPIStrip
              items={[
                { label: "Şube", value: dashboardData.kpiSummary.totalBranches, icon: <Store className="h-4 w-4 text-blue-500" />, color: "info", testId: "ceo-kpi-branches" },
                { label: "Personel", value: dashboardData.kpiSummary.totalEmployees, icon: <Users className="h-4 w-4 text-purple-500" />, color: "info", testId: "ceo-kpi-employees" },
                { label: "Aktif Arıza", value: dashboardData.kpiSummary.activeFaults, icon: <AlertTriangle className={`h-4 w-4 ${dashboardData.kpiSummary.activeFaults > 5 ? 'text-red-500' : 'text-orange-500'}`} />, color: dashboardData.kpiSummary.activeFaults > 5 ? "danger" : "warning", testId: "ceo-kpi-faults" },
                { label: "Uptime", value: `%${dashboardData.kpiSummary.equipmentUptime}`, icon: <Wrench className="h-4 w-4 text-emerald-500" />, color: "success", testId: "ceo-kpi-uptime" },
                { label: "Ort. Skor", value: dashboardData.kpiSummary.branchAvgScore, icon: <Target className="h-4 w-4 text-blue-600" />, color: "info", testId: "ceo-kpi-score" },
                ...(dashboardData.kpiSummary.monthlyRevenue ? [{ label: "Aylık Ciro", value: dashboardData.kpiSummary.monthlyRevenue, icon: <TrendingUp className="h-4 w-4 text-green-500" />, color: "success" as const, testId: "ceo-kpi-revenue" }] : []),
              ]}
              desktopRenderer={
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card data-testid="ceo-kpi-branches">
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <Store className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-xl font-bold">{dashboardData.kpiSummary.totalBranches}</p>
                      <p className="text-[10px] text-muted-foreground">Şube</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="ceo-kpi-employees">
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-xl font-bold">{dashboardData.kpiSummary.totalEmployees}</p>
                      <p className="text-[10px] text-muted-foreground">Personel</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="ceo-kpi-faults">
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${dashboardData.kpiSummary.activeFaults > 5 ? 'text-red-500' : 'text-orange-500'}`} />
                      <p className="text-xl font-bold">{dashboardData.kpiSummary.activeFaults}</p>
                      <p className="text-[10px] text-muted-foreground">Aktif Arıza</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="ceo-kpi-uptime">
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <Wrench className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xl font-bold">%{dashboardData.kpiSummary.equipmentUptime}</p>
                      <p className="text-[10px] text-muted-foreground">Uptime</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="ceo-kpi-score">
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xl font-bold">{dashboardData.kpiSummary.branchAvgScore}</p>
                      <p className="text-[10px] text-muted-foreground">Ort. Skor</p>
                    </CardContent>
                  </Card>
                  {dashboardData.kpiSummary.monthlyRevenue && (
                    <Card data-testid="ceo-kpi-revenue">
                      <CardContent className="pt-3 pb-2 px-3 text-center">
                        <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{dashboardData.kpiSummary.monthlyRevenue}</p>
                        <p className="text-[10px] text-muted-foreground">Aylık Ciro</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              }
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboardData.departments.map((dept, i) => (
              <Card key={i} data-testid={`card-dept-${dept.source.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(dept.status)}
                      {getDeptIcon(dept.source)}
                      <CardTitle className="text-sm">{dept.label}</CardTitle>
                    </div>
                    <Badge variant={getStatusVariant(dept.status)} className="text-[10px]">
                      {dept.status === 'healthy' ? 'İyi' : dept.status === 'warning' ? 'İzle' : 'Kritik'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Kaynak: {dept.source}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-semibold mb-2" data-testid={`text-dept-metric-${i}`}>{dept.mainMetric}</p>
                  <div className="space-y-1">
                    {dept.details.map((d, j) => (
                      <div key={j} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{d.key}</span>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  {dept.alert && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {dept.alert}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {showFinancialCard && <CEOFinancialCard />}

          {isCeoOrCgo && abuseReport && abuseReport.alerts.length > 0 && (
            <Card data-testid="card-abuse-alerts" className="border-red-200 dark:border-red-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Suistimal Uyarıları ({abuseReport.totalAlerts})
                </CardTitle>
                <p className="text-xs text-muted-foreground">Son 30 gündeki aşırı vardiya düzeltmeleri</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {abuseReport.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg border" data-testid={`abuse-alert-${i}`}>
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{alert.correctorName || 'Bilinmeyen'}</span>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {alert.type === 'person_focused' ? 'Kişi Odaklı' : 'Yüksek Hacim'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        {alert.employeeName && (
                          <p className="text-xs text-muted-foreground mt-0.5">Hedef personel: <span className="font-medium text-foreground">{alert.employeeName}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isCeoOrCgo && evalCoverage && (
            <Card data-testid="card-eval-coverage">
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    Değerlendirme Kapsamı
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {evalCoverage.summary.month} - {evalCoverage.summary.daysLeft} gün kaldı
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" data-testid="text-eval-overall-pct">%{evalCoverage.summary.overallPercentage}</p>
                  <p className="text-xs text-muted-foreground">{evalCoverage.summary.totalEvaluated}/{evalCoverage.summary.totalEmployees}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={evalCoverage.summary.overallPercentage} className="h-2" />
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {evalCoverage.branches.map((b) => (
                    <div key={b.branchId} className="flex items-center justify-between gap-2 p-1.5 rounded-md" data-testid={`eval-branch-${b.branchId}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${b.percentage >= 80 ? 'bg-green-500' : b.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className="text-sm truncate">{b.branchName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{b.evaluatedCount}/{b.totalEmployees}</span>
                        <Badge variant={b.percentage >= 80 ? 'secondary' : b.percentage >= 50 ? 'outline' : 'destructive'} className="text-xs min-w-[40px] justify-center">
                          %{b.percentage}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isCeoOrCgo && dashboardData.bottomManagers.length > 0 && (
            <Card data-testid="card-bottom-managers">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dikkat Edilmesi Gereken Yöneticiler
                </CardTitle>
                <p className="text-xs text-muted-foreground">En düşük performans skoruna sahip 3 yönetici</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.bottomManagers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border" data-testid={`card-bottom-mgr-${m.id}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${m.score >= 80 ? 'bg-green-500' : m.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-lg font-bold ${m.score >= 80 ? 'text-green-600 dark:text-green-400' : m.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{m.score}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}
