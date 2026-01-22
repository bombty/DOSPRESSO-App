import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Download, Loader2, FileText,
  Building2, Users, Wrench, AlertTriangle, Calendar, ClipboardCheck, Activity, UserX
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ComprehensiveAnalytics {
  taskMetrics: {
    daily: { completed: number; pending: number };
    weekly: { completed: number };
    monthly: { completed: number };
  };
  checklistMetrics: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  criticalIssues: {
    urgentFaults: { id: number; title: string; branchId: number; priority: string }[];
    slaBreaches: { id: number; title: string; branchId: number }[];
    totalActiveFaults: number;
  };
  branchStatus: {
    id: number;
    name: string;
    completionRate: number;
    activeFaults: number;
    status: 'ok' | 'warning' | 'critical';
  }[];
  personnel: {
    topPerformers: {
      id: number;
      name: string;
      completionRate: number;
      tasksCompleted: number;
      totalTasks: number;
    }[];
    inactiveUsers: {
      id: number;
      name: string;
      daysSinceActivity: number;
    }[];
  };
}

function StatTile({ 
  label, 
  value, 
  icon: Icon, 
  colorClass, 
  onClick,
  trend
}: { 
  label: string; 
  value: number | string; 
  icon: any; 
  colorClass: string;
  onClick?: () => void;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${colorClass}`}
      onClick={onClick}
      data-testid={`stat-tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {trend && (
          trend === 'up' ? <TrendingUp className="h-3 w-3 text-green-500" /> :
          trend === 'down' ? <TrendingDown className="h-3 w-3 text-red-500" /> : null
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

export function EnhancedAnalyticsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'personnel' | 'issues'>('overview');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role;
  const isHQ = ['admin', 'owner', 'coach', 'field_coordinator', 'equipment_specialist', 'hr_specialist', 'training_specialist'].includes(role || '');

  const { data: analytics, isLoading } = useQuery<ComprehensiveAnalytics>({
    queryKey: ["/api/analytics/comprehensive"],
    enabled: isExpanded,
    refetchInterval: 60000,
  });

  const handleNavigate = (path: string) => {
    setIsExpanded(false);
    navigate(path);
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div>
        <SectionHeader title="Görev Metrikleri" icon={ClipboardCheck} />
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Bugün Tamamlanan"
            value={analytics?.taskMetrics.daily.completed || 0}
            icon={CheckCircle2}
            colorClass="bg-green-500/10 border-green-500/20"
            onClick={() => handleNavigate('/gorevler?status=completed')}
          />
          <StatTile
            label="Bekleyen"
            value={analytics?.taskMetrics.daily.pending || 0}
            icon={Clock}
            colorClass="bg-yellow-500/10 border-yellow-500/20"
            onClick={() => handleNavigate('/gorevler?status=pending')}
          />
          <StatTile
            label="Bu Hafta"
            value={analytics?.taskMetrics.weekly.completed || 0}
            icon={Calendar}
            colorClass="bg-blue-500/10 border-blue-500/20"
            onClick={() => handleNavigate('/gorevler')}
          />
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader title="Checklist Durumu" icon={ClipboardCheck} />
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Tamamlanma</span>
              <span className={`text-sm font-bold ${
                (analytics?.checklistMetrics.completionRate || 0) >= 80 ? 'text-green-600' :
                (analytics?.checklistMetrics.completionRate || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                %{analytics?.checklistMetrics.completionRate || 0}
              </span>
            </div>
            <Progress value={analytics?.checklistMetrics.completionRate || 0} className="h-2" />
          </div>
          <StatTile
            label="Geciken"
            value={analytics?.checklistMetrics.overdue || 0}
            icon={AlertTriangle}
            colorClass={`${(analytics?.checklistMetrics.overdue || 0) > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/checklistler?filter=overdue')}
          />
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader title="Kritik Durumlar" icon={AlertCircle} />
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Aktif Arıza"
            value={analytics?.criticalIssues.totalActiveFaults || 0}
            icon={Wrench}
            colorClass={`${(analytics?.criticalIssues.totalActiveFaults || 0) > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/ariza')}
          />
          <StatTile
            label="SLA İhlali"
            value={analytics?.criticalIssues.slaBreaches?.length || 0}
            icon={AlertTriangle}
            colorClass={`${(analytics?.criticalIssues.slaBreaches?.length || 0) > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/ariza?filter=sla')}
          />
        </div>

        {analytics?.criticalIssues.urgentFaults && analytics.criticalIssues.urgentFaults.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-xs font-medium text-destructive mb-1">Acil Arızalar:</p>
            <div className="space-y-1">
              {analytics.criticalIssues.urgentFaults.slice(0, 3).map((f) => (
                <div 
                  key={f.id}
                  className="text-xs p-1.5 rounded bg-background/50 cursor-pointer"
                  onClick={() => handleNavigate(`/ariza/${f.id}`)}
                >
                  {f.title?.slice(0, 50) || `Arıza #${f.id}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBranches = () => (
    <div className="space-y-3">
      <SectionHeader title="Şube Durumları" icon={Building2} />
      
      {!isHQ ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Bu bölüm sadece merkez kullanıcıları için görünür.
        </p>
      ) : analytics?.branchStatus && analytics.branchStatus.length > 0 ? (
        <div className="space-y-2">
          {analytics.branchStatus.map((branch) => (
            <div 
              key={branch.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                branch.status === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                branch.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-green-500/10 border-green-500/30'
              }`}
              onClick={() => handleNavigate(`/sube/${branch.id}`)}
              data-testid={`branch-status-${branch.id}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{branch.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Tamamlanma: %{branch.completionRate}
                    </span>
                    {branch.activeFaults > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {branch.activeFaults} arıza
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  branch.status === 'critical' ? 'bg-destructive' :
                  branch.status === 'warning' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Şube verisi bulunamadı.
        </p>
      )}
    </div>
  );

  const renderPersonnel = () => (
    <div className="space-y-4">
      <div>
        <SectionHeader title="En İyi Performans" icon={Users} />
        {analytics?.personnel.topPerformers && analytics.personnel.topPerformers.length > 0 ? (
          <div className="space-y-2">
            {analytics.personnel.topPerformers.map((p, idx) => (
              <div 
                key={p.id}
                className="p-2 rounded-lg border bg-green-500/5 border-green-500/20 cursor-pointer"
                onClick={() => handleNavigate(`/personel/${p.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-600 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">%{p.completionRate}</span>
                    <p className="text-[10px] text-muted-foreground">{p.tasksCompleted}/{p.totalTasks} görev</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Veri bulunamadı</p>
        )}
      </div>

      <Separator />

      <div>
        <SectionHeader title="Aktif Olmayan Kullanıcılar" icon={UserX} />
        {analytics?.personnel.inactiveUsers && analytics.personnel.inactiveUsers.length > 0 ? (
          <div className="space-y-2">
            {analytics.personnel.inactiveUsers.map((p) => (
              <div 
                key={p.id}
                className="p-2 rounded-lg border bg-orange-500/5 border-orange-500/20 cursor-pointer"
                onClick={() => handleNavigate(`/personel/${p.id}`)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.daysSinceActivity} gün önce
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Tüm kullanıcılar aktif</p>
        )}
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-4">
      <div>
        <SectionHeader title="Acil Arızalar" icon={AlertTriangle} />
        {analytics?.criticalIssues.urgentFaults && analytics.criticalIssues.urgentFaults.length > 0 ? (
          <div className="space-y-2">
            {analytics.criticalIssues.urgentFaults.map((f) => (
              <div 
                key={f.id}
                className="p-2 rounded-lg border bg-destructive/10 border-destructive/20 cursor-pointer"
                onClick={() => handleNavigate(`/ariza/${f.id}`)}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{f.title || `Arıza #${f.id}`}</p>
                    <Badge variant="destructive" className="text-[10px] mt-1">
                      {f.priority === 'urgent' ? 'ACİL' : 'YÜKSEK'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Acil arıza yok</p>
        )}
      </div>

      <Separator />

      <div>
        <SectionHeader title="SLA İhlalleri" icon={Clock} />
        {analytics?.criticalIssues.slaBreaches && analytics.criticalIssues.slaBreaches.length > 0 ? (
          <div className="space-y-2">
            {analytics.criticalIssues.slaBreaches.map((f) => (
              <div 
                key={f.id}
                className="p-2 rounded-lg border bg-red-500/10 border-red-500/20 cursor-pointer"
                onClick={() => handleNavigate(`/ariza/${f.id}`)}
              >
                <p className="text-sm">{f.title || `Arıza #${f.id}`}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">SLA ihlali yok</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="h-auto flex flex-col items-center justify-center p-3 gap-1.5"
        data-testid="button-special-report"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium">Özet Rapor</span>
      </Button>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Özet Rapor
              </DialogTitle>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
            <div className="px-4 pt-2">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs">Genel</TabsTrigger>
                <TabsTrigger value="branches" className="text-xs" disabled={!isHQ}>Şubeler</TabsTrigger>
                <TabsTrigger value="personnel" className="text-xs">Personel</TabsTrigger>
                <TabsTrigger value="issues" className="text-xs">
                  Sorunlar
                  {(analytics?.criticalIssues.totalActiveFaults || 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[9px] flex items-center justify-center">
                      {analytics?.criticalIssues.totalActiveFaults}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[60vh] px-4 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="overview" className="mt-0">
                    {renderOverview()}
                  </TabsContent>
                  <TabsContent value="branches" className="mt-0">
                    {renderBranches()}
                  </TabsContent>
                  <TabsContent value="personnel" className="mt-0">
                    {renderPersonnel()}
                  </TabsContent>
                  <TabsContent value="issues" className="mt-0">
                    {renderIssues()}
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
