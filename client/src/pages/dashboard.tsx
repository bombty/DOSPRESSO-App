import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import type { Task, EquipmentFault, PerformanceMetric } from "@shared/schema";

export default function Dashboard() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: faults, isLoading: faultsLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/performance/latest"],
  });

  const completedTasks = tasks?.filter(t => t.status === "tamamlandi").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "beklemede").length || 0;
  const overdueTasks = tasks?.filter(t => t.status === "gecikmiş").length || 0;
  const openFaults = faults?.filter(f => f.status === "acik").length || 0;

  const latestMetric = metrics?.[0];
  const completionRate = latestMetric?.completionRate || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Gösterge Paneli</h1>
        <p className="text-muted-foreground mt-1">DOSPRESSO operasyon özeti</p>
      </div>

      <AnnouncementBanner />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tamamlanan Görevler
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-completed-tasks">
                  {completedTasks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {tasks?.length || 0} görevden
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bekleyen Görevler
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-pending-tasks">
                  {pendingTasks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overdueTasks > 0 && `${overdueTasks} gecikmiş`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Açık Arızalar
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {faultsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-open-faults">
                  {openFaults}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {faults?.length || 0} arızadan
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tamamlanma Oranı
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-completion-rate">
                  %{completionRate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bugünkü performans
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Görevler</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {tasks?.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                    data-testid={`task-item-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.createdAt!).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === "tamamlandi"
                          ? "default"
                          : task.status === "gecikmiş"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {task.status === "tamamlandi"
                        ? "Tamamlandı"
                        : task.status === "gecikmiş"
                        ? "Gecikmiş"
                        : "Beklemede"}
                    </Badge>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz görev yok
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Arızalar</CardTitle>
          </CardHeader>
          <CardContent>
            {faultsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {faults?.slice(0, 5).map((fault) => (
                  <div
                    key={fault.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                    data-testid={`fault-item-${fault.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fault.equipmentName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {fault.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        fault.status === "cozuldu"
                          ? "default"
                          : fault.priority === "yuksek"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {fault.status === "cozuldu"
                        ? "Çözüldü"
                        : fault.status === "devam_ediyor"
                        ? "Devam Ediyor"
                        : "Açık"}
                    </Badge>
                  </div>
                ))}
                {(!faults || faults.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz arıza yok
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
