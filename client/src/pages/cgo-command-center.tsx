import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Brain,
  RefreshCw,
  Send,
  Loader2,
  Store,
  Wrench,
  Shield,
  Factory,
  ShoppingCart,
  GraduationCap,
  ClipboardCheck,
  Megaphone,
  ArrowUpRight,
  Activity,
  Target,
  BarChart3,
  Crown,
  Briefcase,
  Phone,
  Mail,
  Gauge,
  Zap
} from "lucide-react";

interface CGOData {
  growth: {
    totalBranches: number;
    averageBranchScore: number;
    totalEmployees: number;
    hqEmployees: number;
    branchEmployees: number;
    activeFaults: number;
    criticalFaults: number;
    equipmentUptime: number;
    checklistCompletions: number;
    customerFeedbackCount: number;
    auditCount: number;
  };
  branchPerformance: Array<{
    id: number;
    name: string;
    score: number;
    staffCount: number;
    openFaults: number;
    totalFaults: number;
    auditCount: number;
    status: string;
  }>;
  departmentHealth: Array<{
    name: string;
    icon: string;
    score: number;
    status: string;
    route: string;
  }>;
  alerts: Array<{
    message: string;
    severity: string;
    type: string;
  }>;
  operational: {
    totalFaults: number;
    activeFaults: number;
    criticalFaults: number;
    highFaults: number;
    resolvedFaults: number;
    equipmentTotal: number;
    equipmentActive: number;
    uptimeRate: number;
    totalChecklists: number;
  };
  workforce: {
    total: number;
    hq: number;
    branch: number;
    roleDistribution: Record<string, number>;
  };
  lastUpdated: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case 'healthy': return 'bg-green-500/10';
    case 'warning': return 'bg-yellow-500/10';
    case 'critical': return 'bg-red-500/10';
    default: return 'bg-muted/50';
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default: return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
}

function getDeptIcon(iconName: string) {
  const iconMap: Record<string, any> = {
    ShoppingCart: <ShoppingCart className="w-4 h-4" />,
    Factory: <Factory className="w-4 h-4" />,
    Users: <Users className="w-4 h-4" />,
    ClipboardCheck: <ClipboardCheck className="w-4 h-4" />,
    Megaphone: <Megaphone className="w-4 h-4" />,
    GraduationCap: <GraduationCap className="w-4 h-4" />,
    Shield: <Shield className="w-4 h-4" />,
  };
  return iconMap[iconName] || <Building2 className="w-4 h-4" />;
}

function GrowthTab({ data }: { data: CGOData }) {
  const [, setLocation] = useLocation();
  const g = data.growth;

  const kpiCards = [
    { label: "Toplam Şube", value: g.totalBranches, icon: <Store className="w-5 h-5 text-blue-500" />, color: "text-blue-500" },
    { label: "Ort. Şube Skoru", value: g.averageBranchScore, icon: <Target className="w-5 h-5 text-emerald-500" />, color: "text-emerald-500", suffix: "/100" },
    { label: "Toplam Personel", value: g.totalEmployees, icon: <Users className="w-5 h-5 text-purple-500" />, color: "text-purple-500" },
    { label: "Ekipman Uptime", value: `%${g.equipmentUptime}`, icon: <Wrench className="w-5 h-5 text-orange-500" />, color: "text-orange-500" },
  ];

  const quickActions = [
    { icon: Store, label: "Operasyonlar", route: "/operasyon" },
    { icon: Users, label: "Personel", route: "/ik" },
    { icon: AlertTriangle, label: "Arızalar", route: "/ekipman/ariza" },
    { icon: Factory, label: "Fabrika", route: "/fabrika" },
    { icon: ShoppingCart, label: "Satınalma", route: "/satinalma" },
    { icon: GraduationCap, label: "Akademi", route: "/akademi" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi, i) => (
          <Card key={i} data-testid={`cgo-kpi-${i}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                {kpi.icon}
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold">
                {kpi.value}{kpi.suffix && <span className="text-sm text-muted-foreground font-normal">{kpi.suffix}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Şube Performans Sıralaması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.branchPerformance.slice(0, 8).map((branch, i) => (
                <div 
                  key={branch.id} 
                  className="flex items-center gap-2 cursor-pointer hover-elevate rounded-md p-1.5"
                  onClick={() => setLocation(`/subeler/${branch.id}`)}
                  data-testid={`cgo-branch-rank-${i}`}
                >
                  <Badge variant={i < 3 ? "default" : "secondary"} className="text-[10px] w-6 justify-center shrink-0">
                    {i + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{branch.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusIcon status={branch.status} />
                        <span className="text-sm font-bold">{branch.score}</span>
                      </div>
                    </div>
                    <Progress value={branch.score} className="h-1.5" />
                  </div>
                </div>
              ))}
              {data.branchPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz şube verisi yok</p>
              )}
              {data.branchPerformance.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setLocation('/sube-karsilastirma')} data-testid="cgo-branch-compare-link">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Şube Karşılaştırma
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Kritik Uyarılar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.alerts.length > 0 ? data.alerts.map((alert, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-md ${getStatusBg(alert.severity)}`} data-testid={`cgo-alert-${i}`}>
                    <StatusIcon status={alert.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{alert.message}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{alert.type}</Badge>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-xs text-muted-foreground">Kritik uyarı yok</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Hızlı Erişim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {quickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => setLocation(action.route)}
                    data-testid={`cgo-quick-${action.label.toLowerCase()}`}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-[10px]">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            İş Gücü Dağılımı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center" data-testid="cgo-workforce-total">
              <p className="text-2xl font-bold">{data.workforce.total}</p>
              <p className="text-xs text-muted-foreground">Toplam Personel</p>
            </div>
            <div className="text-center" data-testid="cgo-workforce-hq">
              <p className="text-2xl font-bold">{data.workforce.hq}</p>
              <p className="text-xs text-muted-foreground">Merkez (HQ)</p>
            </div>
            <div className="text-center" data-testid="cgo-workforce-branch">
              <p className="text-2xl font-bold">{data.workforce.branch}</p>
              <p className="text-xs text-muted-foreground">Şube Personeli</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.workforce.roleDistribution)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 12)
              .map(([role, count]) => (
                <Badge key={role} variant="secondary" className="text-[10px]">
                  {role}: {count as number}
                </Badge>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentTab({ data }: { data: CGOData }) {
  const [, setLocation] = useLocation();
  const overallScore = data.departmentHealth.length > 0
    ? Math.round(data.departmentHealth.reduce((s, d) => s + d.score, 0) / data.departmentHealth.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Genel Departman Skoru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${(overallScore / 100) * 251.2} 251.2`} className={overallScore >= 80 ? 'text-green-500' : overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{overallScore}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-muted-foreground">Saglikli</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="text-[10px] text-muted-foreground">Uyari</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[10px] text-muted-foreground">Kritik</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Departman Detayları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.departmentHealth.map((dept, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-md hover-elevate cursor-pointer bg-muted/30"
                  onClick={() => setLocation(dept.route)}
                  data-testid={`cgo-dept-${dept.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`p-1.5 rounded-md ${getStatusBg(dept.status)}`}>
                    {getDeptIcon(dept.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{dept.name}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={dept.status} />
                        <span className={`text-sm font-bold ${getStatusColor(dept.status)}`}>{dept.score}</span>
                      </div>
                    </div>
                    <Progress value={dept.score} className="h-1.5" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OperationalTab({ data }: { data: CGOData }) {
  const op = data.operational;
  const resolveRate = op.totalFaults > 0 ? Math.round((op.resolvedFaults / op.totalFaults) * 100) : 100;

  const statCards = [
    { label: "Toplam Arıza", value: op.totalFaults, icon: <Wrench className="w-4 h-4 text-blue-500" />, sub: `${op.activeFaults} açık` },
    { label: "Kritik Arızalar", value: op.criticalFaults, icon: <AlertTriangle className="w-4 h-4 text-red-500" />, sub: `${op.highFaults || 0} yüksek öncelikli` },
    { label: "Çözüm Oranı", value: `%${resolveRate}`, icon: <CheckCircle className="w-4 h-4 text-green-500" />, sub: `${op.resolvedFaults} çözüldü` },
    { label: "Ekipman Uptime", value: `%${op.uptimeRate}`, icon: <Activity className="w-4 h-4 text-purple-500" />, sub: `${op.equipmentActive}/${op.equipmentTotal} aktif` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} data-testid={`cgo-op-stat-${i}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="w-4 h-4" />
              Şube Arıza Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.branchPerformance.slice(0, 6).map((branch) => (
                <div key={branch.id} className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-muted/30" data-testid={`cgo-branch-fault-${branch.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon status={branch.status} />
                    <span className="text-sm truncate">{branch.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {branch.openFaults > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{branch.openFaults} açık</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{branch.totalFaults} toplam</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Operasyonel Metrikler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Arıza Çözüm Oranı</span>
                  <span className="text-xs font-medium">%{resolveRate}</span>
                </div>
                <Progress value={resolveRate} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Ekipman Uptime</span>
                  <span className="text-xs font-medium">%{op.uptimeRate}</span>
                </div>
                <Progress value={op.uptimeRate} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Checklist Tamamlanma</span>
                  <span className="text-xs font-medium">{op.totalChecklists}</span>
                </div>
                <div className="text-xs text-muted-foreground">Toplam {op.totalChecklists} checklist tamamlandı</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold">{data.growth.customerFeedbackCount}</p>
                  <p className="text-[10px] text-muted-foreground">Müşteri Geri Bildirimi</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{data.growth.auditCount}</p>
                  <p className="text-[10px] text-muted-foreground">Tamamlanan Denetim</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ManagerData {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string | null;
  phone: string | null;
  profileImage: string | null;
  hireDate: string | null;
  type: 'hq' | 'branch';
  branchName: string | null;
  branchId?: number;
  metrics: {
    assignedFaults: number;
    resolvedFaults: number;
    faultResolutionRate: number;
    checklistsCompleted: number;
    overallScore: number;
    slaComplianceRate?: number;
    trainingProgress?: number;
    avgResponseTime?: string;
  };
}

interface ManagerPerformanceData {
  hqManagers: ManagerData[];
  branchManagers: ManagerData[];
  summary: {
    totalHQ: number;
    totalBranch: number;
    hqAverageScore: number;
    branchAverageScore: number;
    overallAverageScore: number;
  };
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBadge(score: number) {
  if (score >= 80) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-300">Başarılı</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">Orta</Badge>;
  return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300">Düşük</Badge>;
}

function ManagerCard({ manager }: { manager: ManagerData }) {
  const initials = manager.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Card data-testid={`card-manager-${manager.id}`} className="hover-elevate">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={manager.profileImage || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" data-testid={`text-manager-name-${manager.id}`}>{manager.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">{manager.department}</span>
                  {manager.branchName && (
                    <Badge variant="outline" className="text-[10px] ml-1">{manager.branchName}</Badge>
                  )}
                </p>
              </div>
              {getScoreBadge(manager.metrics.overallScore)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded p-1.5">
                <p className={`text-sm font-bold ${getScoreColor(manager.metrics.overallScore)}`} data-testid={`text-score-${manager.id}`}>{manager.metrics.overallScore}</p>
                <p className="text-[10px] text-muted-foreground">Puan</p>
              </div>
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-sm font-bold">{manager.metrics.resolvedFaults}/{manager.metrics.assignedFaults}</p>
                <p className="text-[10px] text-muted-foreground">Arıza</p>
              </div>
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-sm font-bold">{manager.metrics.checklistsCompleted}</p>
                <p className="text-[10px] text-muted-foreground">Checklist</p>
              </div>
            </div>
            {(manager.metrics.slaComplianceRate !== undefined || manager.metrics.trainingProgress !== undefined || manager.metrics.avgResponseTime) && (
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
                {manager.metrics.slaComplianceRate !== undefined && (
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className={`text-sm font-bold ${getScoreColor(manager.metrics.slaComplianceRate)}`}>%{manager.metrics.slaComplianceRate}</p>
                    <p className="text-[10px] text-muted-foreground">SLA Uyum</p>
                  </div>
                )}
                {manager.metrics.trainingProgress !== undefined && (
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-sm font-bold">%{manager.metrics.trainingProgress}</p>
                    <p className="text-[10px] text-muted-foreground">Eğitim</p>
                  </div>
                )}
                {manager.metrics.avgResponseTime && (
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-sm font-bold">{manager.metrics.avgResponseTime}</p>
                    <p className="text-[10px] text-muted-foreground">Ort. Yanıt</p>
                  </div>
                )}
              </div>
            )}
            <Progress value={manager.metrics.overallScore} className="h-1.5 mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerPerformanceTab() {
  const { data, isLoading } = useQuery<ManagerPerformanceData>({
    queryKey: ['/api/manager-performance'],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Yonetici performans verileri yuklenemedi
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="card-summary-hq">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">HQ Merkez</span>
            </div>
            <p className="text-xl font-bold">{data.summary.totalHQ}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-branch">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Şube Yöneticileri</span>
            </div>
            <p className="text-xl font-bold">{data.summary.totalBranch}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-hq-avg">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">HQ Ort.</span>
            </div>
            <p className={`text-xl font-bold ${getScoreColor(data.summary.hqAverageScore)}`}>{data.summary.hqAverageScore}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-branch-avg">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Şube Ort.</span>
            </div>
            <p className={`text-xl font-bold ${getScoreColor(data.summary.branchAverageScore)}`}>{data.summary.branchAverageScore}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" data-testid="heading-hq-staff">
          <Crown className="w-4 h-4 text-blue-500" />
          DOSPRESSO Merkez Kadro
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Ece Hanım ve Yavuz Bey'e bağlı merkez departman yöneticileri</p>
        {data.hqManagers.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">HQ merkez personeli bulunamadı</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.hqManagers.sort((a, b) => b.metrics.overallScore - a.metrics.overallScore).map(m => (
              <ManagerCard key={m.id} manager={m} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" data-testid="heading-branch-supervisors">
          <Store className="w-4 h-4 text-purple-500" />
          Şube Yöneticileri (Supervisors)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Her şubenin sorumlu supervisor yöneticileri</p>
        {data.branchManagers.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">Şube supervisor bulunamadı</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.branchManagers.sort((a, b) => b.metrics.overallScore - a.metrics.overallScore).map(m => (
              <ManagerCard key={m.id} manager={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AIStrategist() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const { toast } = useToast();

  const askAI = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    const userQuestion = question;
    setQuestion("");
    setConversation(prev => [...prev, { role: 'user', content: userQuestion }]);

    try {
      const response = await apiRequest("POST", "/api/cgo/ai-assistant", { question: userQuestion });
      const data = await response.json();
      setConversation(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      toast({
        title: "Hata",
        description: "AI yanit veremedi. Lutfen tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Hangi subeler buyume potansiyeline sahip?",
    "Departmanlar arasi koordinasyonu nasil gelistirebilirim?",
    "Personel verimliligini artirmak icin ne yapmaliyim?",
    "En kritik operasyonel riskler neler?",
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">AI Strateji Danışmanı</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Büyüme stratejileri ve operasyonel verimlilik hakkında sorun</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
          {conversation.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium mb-3">Örnek Sorular</p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="block w-full text-left text-xs p-2 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => { setQuestion(s); }}
                    data-testid={`cgo-ai-suggestion-${i}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              }`}
              data-testid={`cgo-ai-message-${idx}`}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted mr-8 p-3 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs text-muted-foreground">Dusunuyor...</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Sorunuzu yazin..."
            className="resize-none"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askAI())}
            data-testid="input-cgo-ai-question"
          />
          <Button
            size="icon"
            onClick={askAI}
            disabled={isLoading || !question.trim()}
            data-testid="button-cgo-ai-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CGOCommandCenter() {
  const { toast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery<CGOData>({
    queryKey: ['/api/cgo/command-center'],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const fallbackData: CGOData = {
    growth: { totalBranches: 0, averageBranchScore: 0, totalEmployees: 0, hqEmployees: 0, branchEmployees: 0, activeFaults: 0, criticalFaults: 0, equipmentUptime: 100, checklistCompletions: 0, customerFeedbackCount: 0, auditCount: 0 },
    branchPerformance: [],
    departmentHealth: [],
    alerts: [],
    operational: { totalFaults: 0, activeFaults: 0, criticalFaults: 0, highFaults: 0, resolvedFaults: 0, equipmentTotal: 0, equipmentActive: 0, uptimeRate: 100, totalChecklists: 0 },
    workforce: { total: 0, hq: 0, branch: 0, roleDistribution: {} },
    lastUpdated: new Date().toISOString()
  };

  const commandData = data || fallbackData;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-cgo-title">
            <TrendingUp className="w-6 h-6 text-primary" />
            CGO Komuta Merkezi
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Son guncelleme: {new Date(commandData.lastUpdated).toLocaleString('tr-TR')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-cgo-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Tabs defaultValue="growth" className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="growth" className="text-xs" data-testid="tab-cgo-growth">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Büyüme</span>
          </TabsTrigger>
          <TabsTrigger value="managers" className="text-xs" data-testid="tab-cgo-managers">
            <Crown className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Yöneticiler</span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="text-xs" data-testid="tab-cgo-departments">
            <Building2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Departmanlar</span>
          </TabsTrigger>
          <TabsTrigger value="operational" className="text-xs" data-testid="tab-cgo-operational">
            <Activity className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Operasyonel</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs" data-testid="tab-cgo-ai">
            <Brain className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="mt-4">
          <GrowthTab data={commandData} />
        </TabsContent>

        <TabsContent value="managers" className="mt-4">
          <ManagerPerformanceTab />
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <DepartmentTab data={commandData} />
        </TabsContent>

        <TabsContent value="operational" className="mt-4">
          <OperationalTab data={commandData} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIStrategist />
        </TabsContent>
      </Tabs>
    </div>
  );
}