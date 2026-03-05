import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Loader2, FileText,
  Building2, Users, Wrench, AlertTriangle, Calendar as CalendarIcon, ClipboardCheck, Activity, UserX,
  Sparkles, ChevronRight, MapPin
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

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
    urgentFaults: { id: number; title: string; branchId: number; branchName?: string; equipmentName?: string; priority: string }[];
    slaBreaches: { id: number; title: string; branchId: number; branchName?: string; equipmentName?: string; hoursOverdue?: number }[];
    totalActiveFaults: number;
  };
  branchStatus: {
    id: number;
    name: string;
    completionRate: number;
    activeFaults: number;
    pendingTasks: number;
    status: 'ok' | 'warning' | 'critical';
  }[];
  personnel: {
    topPerformers: {
      id: number;
      name: string;
      completionRate: number;
      tasksCompleted: number;
      totalTasks: number;
      branchName?: string;
    }[];
    inactiveUsers: {
      id: number;
      name: string;
      daysSinceActivity: number;
      branchName?: string;
    }[];
  };
  aiSummary?: string;
  dateRange?: { from: string; to: string };
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';

function StatTile({ 
  label, 
  value, 
  icon: Icon, 
  colorClass, 
  onClick,
  compact = false
}: { 
  label: string; 
  value: number | string; 
  icon: any; 
  colorClass: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <div 
      className={`p-2 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${colorClass}`}
      onClick={onClick}
      data-testid={`stat-tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className={`font-bold ${compact ? 'text-lg' : 'text-xl'}`}>{value}</p>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h3 className="text-xs font-semibold">{title}</h3>
    </div>
  );
}

function FaultItem({ 
  id, 
  title, 
  branchName, 
  equipmentName, 
  priority, 
  hoursOverdue,
  onClick 
}: { 
  id: number;
  title: string;
  branchName?: string;
  equipmentName?: string;
  priority?: string;
  hoursOverdue?: number;
  onClick: () => void;
}) {
  return (
    <div 
      className="p-2 rounded-lg border bg-destructive/5 border-destructive/20 cursor-pointer hover:bg-destructive/10 transition-colors"
      onClick={onClick}
      data-testid={`fault-item-${id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{title || `Arıza #${id}`}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {branchName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {branchName}
              </span>
            )}
            {equipmentName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Wrench className="h-2.5 w-2.5" />
                {equipmentName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {priority && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
              {priority === 'urgent' ? 'ACİL' : 'YÜKSEK'}
            </Badge>
          )}
          {hoursOverdue !== undefined && (
            <span className="text-[9px] text-destructive font-medium">
              +{Math.round(hoursOverdue)}s
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3 w-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
    </div>
  );
}

export function EnhancedAnalyticsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'personnel' | 'issues'>('overview');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role;
  const isHQ = ['admin', 'owner', 'coach', 'field_coordinator', 'equipment_specialist', 'hr_specialist', 'training_specialist'].includes(role || '');

  const dateParams = useMemo(() => {
    const from = format(dateRange.from, 'yyyy-MM-dd');
    const to = format(dateRange.to, 'yyyy-MM-dd');
    return { from, to };
  }, [dateRange]);

  const { data: analytics, isLoading, refetch } = useQuery<ComprehensiveAnalytics>({
    queryKey: ["/api/analytics/comprehensive", dateParams.from, dateParams.to],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/comprehensive?from=${dateParams.from}&to=${dateParams.to}`);
      if (!res.ok) throw new Error('Analytics fetch failed');
      return res.json();
    },
    enabled: isExpanded,
    refetchInterval: 60000,
  });

  const handleDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'week':
        setDateRange({ from: startOfWeek(today, { locale: tr }), to: endOfWeek(today, { locale: tr }) });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
    }
  };

  const handleNavigate = (path: string) => {
    setIsExpanded(false);
    navigate(path);
  };

  const renderAISummary = () => {
    if (!analytics?.aiSummary) return null;
    
    return (
      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1">AI Değerlendirmesi</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{analytics.aiSummary}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDatePicker = () => (
    <div className="flex items-center gap-1.5 mb-3">
      <div className="flex gap-1">
        {(['today', 'week', 'month'] as DatePreset[]).map((preset) => (
          <Button
            key={preset}
            variant={datePreset === preset ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => handleDatePreset(preset)}
          >
            {preset === 'today' ? 'Bugün' : preset === 'week' ? 'Bu Hafta' : 'Bu Ay'}
          </Button>
        ))}
      </div>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={datePreset === 'custom' ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] px-2"
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {datePreset === 'custom' 
              ? `${format(dateRange.from, 'dd.MM')} - ${format(dateRange.to, 'dd.MM')}`
              : 'Özel'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
                setDatePreset('custom');
                setIsCalendarOpen(false);
              }
            }}
            locale={tr}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-3">
      {renderAISummary()}
      
      <div>
        <SectionHeader title="Görev Metrikleri" icon={ClipboardCheck} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          <StatTile
            label="Bugün Tamamlanan"
            value={analytics?.taskMetrics.daily.completed || 0}
            icon={CheckCircle2}
            colorClass="bg-green-500/10 border-green-500/20"
            onClick={() => handleNavigate('/gorevler?status=completed')}
            compact
          />
          <StatTile
            label="Bekleyen"
            value={analytics?.taskMetrics.daily.pending || 0}
            icon={Clock}
            colorClass="bg-yellow-500/10 border-yellow-500/20"
            onClick={() => handleNavigate('/gorevler?status=pending')}
            compact
          />
          <StatTile
            label="Bu Hafta"
            value={analytics?.taskMetrics.weekly.completed || 0}
            icon={CalendarIcon}
            colorClass="bg-blue-500/10 border-blue-500/20"
            onClick={() => handleNavigate('/gorevler')}
            compact
          />
        </div>
      </div>

      <Separator className="my-2" />

      <div>
        <SectionHeader title="Checklist Durumu" icon={ClipboardCheck} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          <div className="p-2 rounded-lg border bg-card col-span-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-muted-foreground">Tamamlanma</span>
              <span className={`text-xs font-bold ${
                (analytics?.checklistMetrics.completionRate || 0) >= 80 ? 'text-green-600' :
                (analytics?.checklistMetrics.completionRate || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                %{analytics?.checklistMetrics.completionRate || 0}
              </span>
            </div>
            <Progress value={analytics?.checklistMetrics.completionRate || 0} className="h-1.5" />
          </div>
          <StatTile
            label="Geciken"
            value={analytics?.checklistMetrics.overdue || 0}
            icon={AlertTriangle}
            colorClass={`${(analytics?.checklistMetrics.overdue || 0) > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/yonetim/checklist-takip?filter=overdue')}
            compact
          />
        </div>
      </div>

      <Separator className="my-2" />

      <div>
        <SectionHeader title="Kritik Durumlar" icon={AlertCircle} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          <StatTile
            label="Aktif Arıza"
            value={analytics?.criticalIssues.totalActiveFaults || 0}
            icon={Wrench}
            colorClass={`${(analytics?.criticalIssues.totalActiveFaults || 0) > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/ariza')}
            compact
          />
          <StatTile
            label="SLA İhlali"
            value={analytics?.criticalIssues.slaBreaches?.length || 0}
            icon={AlertTriangle}
            colorClass={`${(analytics?.criticalIssues.slaBreaches?.length || 0) > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/ariza?filter=sla')}
            compact
          />
          <StatTile
            label="Acil"
            value={analytics?.criticalIssues.urgentFaults?.length || 0}
            icon={AlertCircle}
            colorClass={`${(analytics?.criticalIssues.urgentFaults?.length || 0) > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'}`}
            onClick={() => handleNavigate('/ariza?filter=urgent')}
            compact
          />
        </div>
      </div>
    </div>
  );

  const renderBranches = () => (
    <div className="space-y-2">
      <SectionHeader title="Şube Durumları" icon={Building2} />
      
      {!isHQ ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Bu bölüm sadece merkez kullanıcıları için görünür.
        </p>
      ) : analytics?.branchStatus && analytics.branchStatus.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {analytics.branchStatus.map((branch) => (
            <div 
              key={branch.id}
              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                branch.status === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                branch.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-green-500/10 border-green-500/30'
              }`}
              onClick={() => handleNavigate(`/subeler/${branch.id}`)}
              data-testid={`branch-status-${branch.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{branch.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      %{branch.completionRate}
                    </span>
                    {branch.activeFaults > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                        {branch.activeFaults} arıza
                      </Badge>
                    )}
                    {branch.pendingTasks > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                        {branch.pendingTasks} bekl.
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                  branch.status === 'critical' ? 'bg-destructive' :
                  branch.status === 'warning' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          Şube verisi bulunamadı.
        </p>
      )}
    </div>
  );

  const renderPersonnel = () => (
    <div className="space-y-3">
      <div>
        <SectionHeader title="En İyi Performans" icon={Users} />
        {analytics?.personnel.topPerformers && analytics.personnel.topPerformers.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {analytics.personnel.topPerformers.map((p, idx) => (
              <div 
                key={p.id}
                className="p-2 rounded-lg border bg-green-500/5 border-green-500/20 cursor-pointer"
                onClick={() => handleNavigate(`/personel/${p.id}`)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    {p.branchName && (
                      <p className="text-[9px] text-muted-foreground truncate">{p.branchName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-green-600">%{p.completionRate}</span>
                    <p className="text-[9px] text-muted-foreground">{p.tasksCompleted}/{p.totalTasks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Veri bulunamadı</p>
        )}
      </div>

      <Separator className="my-2" />

      <div>
        <SectionHeader title="Aktif Olmayan Kullanıcılar" icon={UserX} />
        {analytics?.personnel.inactiveUsers && analytics.personnel.inactiveUsers.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {analytics.personnel.inactiveUsers.map((p) => (
              <div 
                key={p.id}
                className="p-2 rounded-lg border bg-orange-500/5 border-orange-500/20 cursor-pointer"
                onClick={() => handleNavigate(`/personel/${p.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{p.name}</p>
                    {p.branchName && (
                      <p className="text-[9px] text-muted-foreground truncate">{p.branchName}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 ml-1">
                    {p.daysSinceActivity}g
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Tüm kullanıcılar aktif</p>
        )}
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Acil Arızalar" icon={AlertTriangle} />
        {analytics?.criticalIssues.urgentFaults && analytics.criticalIssues.urgentFaults.length > 0 ? (
          <div className="space-y-1.5">
            {analytics.criticalIssues.urgentFaults.map((f) => (
              <FaultItem
                key={f.id}
                id={f.id}
                title={f.title}
                branchName={f.branchName}
                equipmentName={f.equipmentName}
                priority={f.priority}
                onClick={() => handleNavigate(`/ariza-detay/${f.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">Acil arıza yok</p>
        )}
      </div>

      <Separator className="my-2" />

      <div>
        <SectionHeader title="SLA İhlalleri" icon={Clock} />
        {analytics?.criticalIssues.slaBreaches && analytics.criticalIssues.slaBreaches.length > 0 ? (
          <div className="space-y-1.5">
            {analytics.criticalIssues.slaBreaches.map((f) => (
              <FaultItem
                key={f.id}
                id={f.id}
                title={f.title}
                branchName={f.branchName}
                equipmentName={f.equipmentName}
                hoursOverdue={f.hoursOverdue}
                onClick={() => handleNavigate(`/ariza-detay/${f.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">SLA ihlali yok</p>
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
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-3 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Özet Rapor
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-3 pt-2">
            {renderDatePicker()}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
            <div className="px-3">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-8">
                <TabsTrigger value="overview" className="text-[10px]">Genel</TabsTrigger>
                <TabsTrigger value="branches" className="text-[10px]" disabled={!isHQ}>Şubeler</TabsTrigger>
                <TabsTrigger value="personnel" className="text-[10px]">Personel</TabsTrigger>
                <TabsTrigger value="issues" className="text-[10px]">
                  Sorunlar
                  {(analytics?.criticalIssues.totalActiveFaults || 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-3.5 w-3.5 p-0 text-[8px] flex items-center justify-center">
                      {analytics?.criticalIssues.totalActiveFaults}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[55vh] px-3 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
