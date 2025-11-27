import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Coffee, ListTodo } from "lucide-react";

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

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Coffee className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Günlük Görevler</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-700">{completedTasks}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Yapıldı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-700">{pendingTasks}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Yapılacak</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <ListTodo className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-purple-700">
              {todaysTasks.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Bugün</p>
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
