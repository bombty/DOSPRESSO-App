import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle2, Clock, ClipboardList, Bell, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface DashboardSummary {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId: number;
  };
  stats: {
    completedTasks: number;
    pendingTasks: number;
    totalTasks: number;
    completedChecklists: number;
    pendingChecklists: number;
    totalChecklists: number;
    unreadNotifications: number;
  };
  todayShift: {
    startTime: string;
    endTime: string;
    shiftType: string;
  } | null;
  performanceScore: number | null;
  aiSummary: string;
  date: string;
}

export function PersonalSummaryCard() {
  const [, navigate] = useLocation();
  
  const { data: summary, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ["/api/me/dashboard-summary"],
  });

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Kişisel Özet Yükleniyor...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (isError || !summary) {
    return null;
  }

  const taskCompletionRate = summary.stats.totalTasks > 0 
    ? Math.round((summary.stats.completedTasks / summary.stats.totalTasks) * 100) 
    : 100;
  
  const checklistCompletionRate = summary.stats.totalChecklists > 0 
    ? Math.round((summary.stats.completedChecklists / summary.stats.totalChecklists) * 100) 
    : 100;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-blue-950/20 dark:to-purple-950/20" data-testid="card-personal-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Merhaba, {summary.user.firstName}!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.aiSummary && (
          <p className="text-sm text-muted-foreground italic" data-testid="text-ai-summary">
            {summary.aiSummary}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div 
            className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" 
            onClick={() => navigate('/gorevler')}
            data-testid="card-my-tasks"
          >
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Görevler
            </p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold" data-testid="text-tasks-completed">
                {summary.stats.completedTasks}/{summary.stats.totalTasks}
              </p>
              <Badge variant={summary.stats.pendingTasks > 0 ? "secondary" : "default"} className="text-[10px]">
                {summary.stats.pendingTasks > 0 ? `${summary.stats.pendingTasks} bekliyor` : 'Tamam'}
              </Badge>
            </div>
            <Progress value={taskCompletionRate} className="h-1 mt-1" />
          </div>

          <div 
            className="p-2 bg-background/50 rounded border border-primary/10 cursor-pointer hover-elevate" 
            onClick={() => navigate('/checklistler')}
            data-testid="card-my-checklists"
          >
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Checklistler
            </p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold" data-testid="text-checklists-completed">
                {summary.stats.completedChecklists}/{summary.stats.totalChecklists}
              </p>
              <Badge variant={summary.stats.pendingChecklists > 0 ? "secondary" : "default"} className="text-[10px]">
                {summary.stats.pendingChecklists > 0 ? `${summary.stats.pendingChecklists} bekliyor` : 'Tamam'}
              </Badge>
            </div>
            <Progress value={checklistCompletionRate} className="h-1 mt-1" />
          </div>
        </div>

        <div className="flex gap-2">
          {summary.todayShift && (
            <div 
              className="flex-1 p-2 bg-green-500/10 rounded border border-green-500/20"
              data-testid="card-today-shift"
            >
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Bugünkü Vardiya
              </p>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                {summary.todayShift.startTime} - {summary.todayShift.endTime}
              </p>
            </div>
          )}

          {summary.stats.unreadNotifications > 0 && (
            <div 
              className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20 cursor-pointer hover-elevate"
              onClick={() => navigate('/bildirimler')}
              data-testid="card-notifications"
            >
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3" /> Bildirimler
              </p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {summary.stats.unreadNotifications}
              </p>
            </div>
          )}

          {summary.performanceScore !== null && (
            <div 
              className="p-2 bg-accent/10 rounded border border-accent/20"
              data-testid="card-performance"
            >
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Performans
              </p>
              <p className={`text-lg font-bold ${
                summary.performanceScore >= 80 ? 'text-green-600' :
                summary.performanceScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {summary.performanceScore}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
