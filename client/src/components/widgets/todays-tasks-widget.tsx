import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModuleEnabled } from "@/hooks/use-module-flags";
import { Link } from "wouter";
import { ClipboardList, ListChecks, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";

interface CombinedTask {
  id: number;
  title: string;
  source: "adhoc" | "branch";
  status: string;
  isOverdue?: boolean;
  priority?: string;
  category?: string;
}

export function TodaysTasksWidget() {
  const { isEnabled: isBranchTasksEnabled } = useModuleEnabled("sube_gorevleri");
  const today = new Date().toISOString().slice(0, 10);

  const { data: adHocTasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
  });

  const { data: branchInstances } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/instances", { date: today }],
    queryFn: () => fetch(`/api/branch-tasks/instances?date=${today}`).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
    enabled: !!isBranchTasksEnabled,
  });

  const combined: CombinedTask[] = [];

  if (adHocTasks) {
    const todayDate = new Date(today);
    const myTasks = adHocTasks.filter(t => {
      const isActive = !["onaylandi", "iptal_edildi", "reddedildi"].includes(t.status);
      const isDueToday = t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) === today;
      return isActive && isDueToday;
    });
    myTasks.forEach(t => {
      combined.push({
        id: t.id,
        title: t.description || "Görev",
        source: "adhoc",
        status: t.status,
        isOverdue: t.dueDate && new Date(t.dueDate) < todayDate,
        priority: t.priority,
      });
    });
  }

  if (branchInstances) {
    branchInstances
      .filter((i: any) => i.status !== "completed")
      .forEach((i: any) => {
        combined.push({
          id: i.id,
          title: i.title,
          source: "branch",
          status: i.status,
          isOverdue: i.is_overdue,
          category: i.category,
        });
      });
  }

  combined.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return 0;
  });

  const displayTasks = combined.slice(0, 10);
  const totalTasks = (adHocTasks?.filter(t => t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) === today).length || 0) +
    (branchInstances?.length || 0);
  const completedCount = (adHocTasks?.filter(t => t.status === "onaylandi" && t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) === today).length || 0) +
    (branchInstances?.filter((i: any) => i.status === "completed").length || 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (totalTasks === 0 && !isBranchTasksEnabled) return null;

  return (
    <Card data-testid="widget-todays-tasks">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Bugünün Görevleri
          </CardTitle>
          <span className="text-xs text-muted-foreground">{completedCount}/{totalTasks} tamamlandı</span>
        </div>
        {totalTasks > 0 && <Progress value={progressPercent} className="h-1.5 mt-1" />}
      </CardHeader>
      <CardContent className="pt-0">
        {displayTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Bugün için bekleyen görev yok.</p>
        ) : (
          <div className="space-y-1.5">
            {displayTasks.map((task) => (
              <Link
                key={`${task.source}-${task.id}`}
                href={task.source === "adhoc" ? "/gorevler" : "/gorevler"}
                data-testid={`link-widget-task-${task.source}-${task.id}`}
              >
                <div className="flex items-center gap-2 p-1.5 rounded-md hover-elevate cursor-pointer">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {task.isOverdue ? (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : task.status === "claimed" || task.status === "devam_ediyor" ? (
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className={`text-[9px] ${task.source === "adhoc" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-teal-500/10 text-teal-600 dark:text-teal-400"}`}>
                      {task.source === "adhoc" ? "Görev" : "Şube"}
                    </Badge>
                    {task.isOverdue && <Badge variant="destructive" className="text-[9px]">Gecikmiş</Badge>}
                  </div>
                </div>
              </Link>
            ))}
            {combined.length > 10 && (
              <Link href="/gorevler">
                <div className="flex items-center justify-center gap-1 pt-1 text-xs text-primary cursor-pointer" data-testid="link-widget-see-all">
                  Tümünü Gör <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
