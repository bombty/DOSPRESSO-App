import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Clock, ListTodo, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  weeklyHours: number;
  completedTasks: number;
  pendingTasks: number;
  activeFaults: number;
  shiftsCount: number;
  summary: string;
}

interface MonthlyAnalytics {
  period: string;
  totalTasks: number;
  completedTasks: number;
  totalFaults: number;
  resolvedFaults: number;
  totalCost: number;
  summary: string;
}

export function EnhancedAnalyticsCard() {
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

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            Özet Rapor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
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

                <div className="grid grid-cols-2 gap-2">
                  {daily.activeFaults > 0 && (
                    <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                      <p className="text-xs text-muted-foreground">Aktif Arızalar</p>
                      <p className="text-lg font-bold text-destructive" data-testid="text-active-faults">
                        {daily.activeFaults}
                      </p>
                    </div>
                  )}

                  {daily.pendingTasks > 0 && (
                    <div className="p-2 bg-warning/10 rounded border border-warning/20">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ListTodo className="h-3 w-3" /> Bekleyen Görev
                      </p>
                      <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-pending-tasks">
                        {daily.pendingTasks}
                      </p>
                    </div>
                  )}

                  {daily.overdueChecklists > 0 && (
                    <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                      <p className="text-xs text-muted-foreground">Geciken Checklist</p>
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
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Ortalama Ekipman Sağlığı</p>
                      <span className="text-sm font-semibold text-primary" data-testid="text-avg-health">
                        %{daily.avgHealth}
                      </span>
                    </div>
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Haftalık Saatler
                    </p>
                    <p className="text-lg font-bold text-primary" data-testid="text-weekly-hours">
                      {weekly.weeklyHours}
                    </p>
                    <p className="text-xs text-muted-foreground">saat</p>
                  </div>

                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Tamamlanan Görev</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-completed-tasks">
                      {weekly.completedTasks}
                    </p>
                  </div>

                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Bekleyen Görev</p>
                    <p className="text-lg font-bold text-primary" data-testid="text-weekly-pending">
                      {weekly.pendingTasks}
                    </p>
                  </div>

                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Vardiya Sayısı</p>
                    <p className="text-lg font-bold text-primary" data-testid="text-shifts-count">
                      {weekly.shiftsCount}
                    </p>
                  </div>
                </div>
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Toplam Görev</p>
                    <p className="text-lg font-bold text-primary" data-testid="text-total-tasks">
                      {monthly.totalTasks}
                    </p>
                  </div>

                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Tamamlanan</p>
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

                  <div className="p-2 bg-background/50 rounded border border-primary/10">
                    <p className="text-xs text-muted-foreground">Çözülen</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-500" data-testid="text-resolved-faults">
                      {monthly.resolvedFaults}
                    </p>
                  </div>

                  <div className="p-2 bg-background/50 rounded border border-primary/10 col-span-2">
                    <p className="text-xs text-muted-foreground">Aylık Maliyet</p>
                    <p className="text-lg font-bold text-primary" data-testid="text-total-cost">
                      ₺{monthly.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
