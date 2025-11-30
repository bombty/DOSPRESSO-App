import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Coffee, ListTodo, TrendingUp, Zap } from "lucide-react";
import { GaugeCard, KPICard } from "./shared-dashboard-components";

interface BaristaDashboardProps {
  completedTasks: number;
  pendingTasks: number;
  tasks?: any[];
  isLoading: boolean;
}

export function BaristaDashboard({
  completedTasks,
  pendingTasks,
  tasks,
  isLoading,
}: BaristaDashboardProps) {
  const todaysTasks = tasks?.filter(t => {
    const taskDate = new Date(t.dueDate).toDateString();
    const today = new Date().toDateString();
    return taskDate === today;
  }) || [];

  const dailyRate = todaysTasks.length > 0 ? Math.round((todaysTasks.filter(t => t.status === 'onaylandi').length / todaysTasks.length) * 100) : 0;
  const overallRate = completedTasks + pendingTasks > 0 ? Math.round((completedTasks / (completedTasks + pendingTasks)) * 100) : 0;

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Coffee className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Günlük Görevler</h2>
      </div>

      {/* Personal Performance Gauges */}
      {!isLoading && (
        <div className="grid gap-0.5 grid-cols-3">
          <GaugeCard label="Günlük" value={dailyRate} icon={TrendingUp} />
          <GaugeCard label="Genel" value={overallRate} icon={Zap} />
          <GaugeCard label="Kalan" value={Math.max(0, 100 - (pendingTasks * 20))} icon={Clock} />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-0.5 grid-cols-3">
        <KPICard icon={CheckCircle} label="Yapıldı" value={completedTasks} color="green" />
        <KPICard icon={Clock} label="Yapılacak" value={pendingTasks} color="blue" />
        <KPICard icon={ListTodo} label="Bugün" value={todaysTasks.length} color="purple" />
      </div>

      {/* Today's Tasks */}
      {!isLoading && todaysTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Bugünün Görevleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaysTasks.map((task) => (
                <div key={task.id} className="p-2 bg-muted/50 rounded border-l-2 border-blue-600">
                  <p className="font-semibold text-sm">{task.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                    <Badge 
                      variant={task.status === "onaylandi" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {task.status === "onaylandi" ? "✓ Tamamlandı" : "⏳ Beklemede"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">💡 İpucu:</p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
            Tüm görevlerinizi zamanında tamamlamak için günü başlamadan görevler bölümünü kontrol edin.
          </p>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-40 w-full" />}
    </div>
  );
}
