import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Coffee, ListTodo, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
          {[
            { label: 'Günlük', value: dailyRate, icon: TrendingUp, color: dailyRate >= 70 ? 'green' : 'yellow' },
            { label: 'Genel', value: overallRate, icon: Zap, color: overallRate >= 75 ? 'green' : 'blue' },
            { label: 'Kalan', value: Math.max(0, 100 - (pendingTasks * 20)), icon: Clock, color: 'blue' }
          ].map((gauge) => (
            <Card key={gauge.label}>
              <CardContent className="pt-1.5 pb-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">{gauge.label}</span>
                  <gauge.icon className={`h-2.5 w-2.5 text-${gauge.color}-600`} />
                </div>
                <div className={`text-base font-bold text-${gauge.color}-700`}>{gauge.value}%</div>
                <Progress value={gauge.value} className="h-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-0.5 grid-cols-3">
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div className="text-sm font-bold text-green-700">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Yapıldı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-700">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Yapılacak</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <ListTodo className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-sm font-bold text-purple-700">
              {todaysTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">Bugün</p>
          </CardContent>
        </Card>
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
