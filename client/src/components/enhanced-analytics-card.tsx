import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, TrendingDown, Minus, ListTodo, Zap, Wrench, Award, AlertTriangle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface PerformerData {
  id: number;
  name: string;
  avatar?: string;
  score: number;
  completionRate: number;
  absences: number;
  lateArrivals: number;
}

interface DailyAnalytics {
  period: string;
  pendingTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  criticalEquipment: number;
  avgHealth: number;
  summary: string;
}

interface WeeklyAnalytics {
  period: string;
  completedTasks: number;
  pendingTasks: number;
  activeFaults: number;
  checklistCompletionRate: number;
  topPerformers: PerformerData[];
  bottomPerformers: PerformerData[];
  summary: string;
}

interface MonthlyAnalytics {
  period: string;
  totalTasks: number;
  completedTasks: number;
  totalFaults: number;
  resolvedFaults: number;
  activeFaults: number;
  avgHealth: number;
  criticalEquipment: number;
  topFaultyEquipment: { id: number; name: string; count: number }[];
  summary: string;
}

function TrendIcon({ value, threshold = 0 }: { value: number; threshold?: number }) {
  if (value > threshold) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (value < threshold) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function PerformerCard({ performer, isTop }: { performer: PerformerData; isTop: boolean }) {
  const [, navigate] = useLocation();
  
  return (
    <div 
      className={`p-2 rounded border cursor-pointer hover-elevate ${
        isTop ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
      }`}
      onClick={() => navigate(`/employees/${performer.id}`)}
      data-testid={`performer-card-${performer.id}`}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={performer.avatar} />
          <AvatarFallback className="text-[10px]">
            {performer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{performer.name}</p>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] ${isTop ? 'text-green-600' : 'text-red-600'}`}>
              %{performer.completionRate}
            </span>
            {performer.absences > 0 && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
                {performer.absences} devamsız
              </Badge>
            )}
          </div>
        </div>
        <div className={`text-sm font-bold ${isTop ? 'text-green-600' : 'text-red-600'}`}>
          {performer.score}
        </div>
      </div>
    </div>
  );
}

export function EnhancedAnalyticsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const role = user?.role;

  const { data: daily, isLoading: dailyLoading } = useQuery<DailyAnalytics>({
    queryKey: ["/api/analytics/daily"],
  });

  const { data: weekly, isLoading: weeklyLoading } = useQuery<WeeklyAnalytics>({
    queryKey: ["/api/analytics/weekly"],
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery<MonthlyAnalytics>({
    queryKey: ["/api/analytics/monthly"],
  });

  if (dailyLoading || weeklyLoading || monthlyLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Özet Yükleniyor...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const renderContent = (inModal = false) => (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="daily" className="text-xs" data-testid="tab-daily">
          Günlük
        </TabsTrigger>
        <TabsTrigger value="weekly" className="text-xs" data-testid="tab-weekly">
          Haftalık
        </TabsTrigger>
        <TabsTrigger value="monthly" className="text-xs" data-testid="tab-monthly">
          Aylık
        </TabsTrigger>
      </TabsList>

      {/* DAILY */}
      <TabsContent value="daily" className="space-y-3">
        {daily && (
          <>
            {daily.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs" data-testid="text-daily-summary">
                  {daily.summary}
                </AlertDescription>
              </Alert>
            )}

            <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
              {daily.activeFaults > 0 && (
                <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Aktif Arıza
                  </p>
                  <p className="text-lg font-bold text-destructive" data-testid="text-active-faults">
                    {daily.activeFaults}
                  </p>
                </div>
              )}

              {daily.pendingTasks > 0 && (
                <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ListTodo className="h-3 w-3" /> Bekleyen
                  </p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-pending-tasks">
                    {daily.pendingTasks}
                  </p>
                </div>
              )}

              {daily.overdueChecklists > 0 && (
                <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Geciken
                  </p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-500" data-testid="text-overdue-checklists">
                    {daily.overdueChecklists}
                  </p>
                </div>
              )}

              {daily.criticalEquipment > 0 && (
                <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                  <p className="text-xs text-muted-foreground">Kritik Ekipman</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-500" data-testid="text-critical-equipment">
                    {daily.criticalEquipment}
                  </p>
                </div>
              )}
            </div>

            {daily.avgHealth >= 0 && (
              <div className="p-2 bg-background/50 rounded border border-primary/10">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-muted-foreground">Ekipman Sağlığı</p>
                  <span className="text-sm font-semibold text-primary" data-testid="text-avg-health">
                    %{daily.avgHealth}
                  </span>
                </div>
                <Progress value={daily.avgHealth} className="h-1.5" />
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* WEEKLY */}
      <TabsContent value="weekly" className="space-y-3">
        {weekly && (
          <>
            {weekly.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs" data-testid="text-weekly-summary">
                  {weekly.summary}
                </AlertDescription>
              </Alert>
            )}

            <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Tamamlanan <TrendIcon value={weekly.completedTasks} threshold={5} />
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-completed-tasks">
                  {weekly.completedTasks}
                </p>
              </div>

              <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Bekleyen <TrendIcon value={-weekly.pendingTasks} threshold={-3} />
                </p>
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-weekly-pending">
                  {weekly.pendingTasks}
                </p>
              </div>

              {weekly.activeFaults > 0 && (
                <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                  <p className="text-xs text-muted-foreground">Aktif Arıza</p>
                  <p className="text-lg font-bold text-destructive" data-testid="text-weekly-faults">
                    {weekly.activeFaults}
                  </p>
                </div>
              )}

              <div className="p-2 bg-primary/10 rounded border border-primary/20">
                <p className="text-xs text-muted-foreground">Checklist</p>
                <p className="text-lg font-bold text-primary" data-testid="text-checklist-rate">
                  %{weekly.checklistCompletionRate}
                </p>
              </div>
            </div>

            {/* Checklist completion bar */}
            <div className="p-2 bg-background/50 rounded border border-primary/10">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">Checklist Tamamlanma</p>
                <span className={`text-xs font-medium ${
                  weekly.checklistCompletionRate >= 80 ? 'text-green-600' : 
                  weekly.checklistCompletionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  %{weekly.checklistCompletionRate}
                </span>
              </div>
              <Progress 
                value={weekly.checklistCompletionRate} 
                className="h-1.5"
              />
            </div>

            {/* Top & Bottom Performers - Only for supervisors/HQ */}
            {(role === 'supervisor' || role === 'supervisor_buddy' || role === 'admin' || role === 'coach') && (
              <>
                {weekly.topPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-3 w-3 text-green-500" /> En İyi Performans
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {weekly.topPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={true} />
                      ))}
                    </div>
                  </div>
                )}

                {weekly.bottomPerformers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-red-500" /> Gelişim Gerekli
                    </p>
                    <div className={`grid ${inModal ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {weekly.bottomPerformers.map((p) => (
                        <PerformerCard key={p.id} performer={p} isTop={false} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </TabsContent>

      {/* MONTHLY */}
      <TabsContent value="monthly" className="space-y-3">
        {monthly && (
          <>
            {monthly.summary && (
              <Alert className="bg-accent/10 border-accent/30">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs" data-testid="text-monthly-summary">
                  {monthly.summary}
                </AlertDescription>
              </Alert>
            )}

            <div className={`grid ${inModal ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
              <div className="p-2 bg-background/50 rounded border border-primary/10">
                <p className="text-xs text-muted-foreground">Toplam Görev</p>
                <p className="text-lg font-bold text-primary" data-testid="text-total-tasks">
                  {monthly.totalTasks}
                </p>
              </div>

              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Tamamlanan <TrendIcon value={monthly.completedTasks} threshold={10} />
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-monthly-completed">
                  {monthly.completedTasks}
                </p>
              </div>

              <div className="p-2 bg-background/50 rounded border border-primary/10">
                <p className="text-xs text-muted-foreground">Toplam Arıza</p>
                <p className="text-lg font-bold text-primary" data-testid="text-total-faults">
                  {monthly.totalFaults}
                </p>
              </div>

              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-xs text-muted-foreground">Çözülen</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-resolved-faults">
                  {monthly.resolvedFaults}
                </p>
              </div>
            </div>

            {/* Equipment Health */}
            <div className="p-2 bg-background/50 rounded border border-primary/10">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Ekipman Sağlığı
                </p>
                <div className="flex items-center gap-2">
                  {monthly.criticalEquipment > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      {monthly.criticalEquipment} kritik
                    </Badge>
                  )}
                  <span className={`text-sm font-semibold ${
                    monthly.avgHealth >= 80 ? 'text-green-600' : 
                    monthly.avgHealth >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    %{monthly.avgHealth}
                  </span>
                </div>
              </div>
              <Progress 
                value={monthly.avgHealth} 
                className="h-1.5"
              />
            </div>

            {/* Top Faulty Equipment */}
            {monthly.topFaultyEquipment?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" /> En Çok Arıza Yapan Ekipman
                </p>
                <div className="space-y-1">
                  {monthly.topFaultyEquipment.map((eq, idx) => (
                    <div 
                      key={eq.id} 
                      className="flex items-center justify-between p-2 bg-orange-500/10 rounded border border-orange-500/20"
                      data-testid={`faulty-equipment-${eq.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          #{idx + 1}
                        </Badge>
                        <span className="text-xs truncate">{eq.name}</span>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        {eq.count} arıza
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <Card 
        className="border-primary/20 bg-primary/5 dark:bg-blue-950/20 cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(true)}
        data-testid="analytics-card"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4" />
              Özet Rapor
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Tıkla: Genişlet
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent(false)}
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5" />
              Detaylı Özet Rapor
            </DialogTitle>
          </DialogHeader>
          {renderContent(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
