import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Circle, Clock, Calendar, CalendarDays,
  ChevronRight, Sparkles, ListTodo, Trophy,
  Monitor, UserCheck, Bell, Shield, Database, BarChart, TrendingUp,
  DollarSign, AlertTriangle, BarChart3, FileText, Target, Briefcase,
  MapPin, Building, Megaphone, Globe, Calculator, FileCheck, Wallet,
  Receipt, ArrowLeftRight, Package, ClipboardCheck, Scale, RotateCcw,
  Search, CheckSquare, Ruler, GraduationCap, MessageSquare, Award,
  PlusCircle, BookOpen, Share2, Image, MessageCircle, Wrench, Heart,
  Box, Headphones, AlertCircle, Factory, RefreshCw, CheckCircle, Users,
  ClipboardList, Coffee, Sunrise, Sunset, Settings, Droplet, Play,
  Star, Edit, HelpCircle, Sparkles as SparklesIcon
} from "lucide-react";

const iconMap: Record<string, any> = {
  Monitor, UserCheck, Bell, Shield, Database, BarChart, TrendingUp,
  DollarSign, AlertTriangle, BarChart3, FileText, Target, Briefcase,
  MapPin, Building, Megaphone, Globe, Calculator, FileCheck, Wallet,
  Receipt, ArrowLeftRight, Package, ClipboardCheck, Scale, RotateCcw,
  Search, CheckSquare, Ruler, GraduationCap, MessageSquare, Award,
  PlusCircle, BookOpen, Share2, Image, MessageCircle, Wrench, Heart,
  Box, Headphones, AlertCircle, Factory, RefreshCw, CheckCircle, Users,
  ClipboardList, Coffee, Sunrise, Sunset, Settings, Droplet, Play,
  Star, Edit, HelpCircle, Sparkles: SparklesIcon, Beaker: Box,
};

interface TaskItem {
  id: number;
  role: string;
  title: string;
  description: string | null;
  frequency: string;
  priority: number;
  sortOrder: number;
  icon: string | null;
  targetUrl: string | null;
  moduleLink: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

interface TaskSummary {
  daily: { total: number; completed: number };
  weekly: { total: number; completed: number };
  monthly: { total: number; completed: number };
}

const frequencyLabels: Record<string, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const frequencyIcons: Record<string, any> = {
  daily: Clock,
  weekly: Calendar,
  monthly: CalendarDays,
};

const priorityColors: Record<number, string> = {
  1: "text-red-500 dark:text-red-400",
  2: "text-amber-500 dark:text-amber-400",
  3: "text-blue-500 dark:text-blue-400",
};

export function DailyTaskPanel() {
  const [frequency, setFrequency] = useState("daily");
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: [`/api/daily-tasks?frequency=${frequency}`],
    refetchInterval: 60000,
  });

  const { data: summary } = useQuery<TaskSummary>({
    queryKey: ["/api/daily-tasks/summary"],
    refetchInterval: 60000,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/daily-tasks/${taskId}/complete?frequency=${frequency}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-tasks?frequency=${frequency}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/summary"] });
      toast({ title: "Gorev tamamlandi", description: "Tebrikler!" });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/daily-tasks/${taskId}/uncomplete?frequency=${frequency}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-tasks?frequency=${frequency}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/summary"] });
    },
  });

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (task: TaskItem) => {
    if (task.isCompleted) {
      uncompleteMutation.mutate(task.id);
    } else {
      completeMutation.mutate(task.id);
    }
  };

  const handleNavigate = (url: string | null) => {
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <Card data-testid="daily-task-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Bugunun Gorevleri</CardTitle>
          </div>
          {progressPercent === 100 && totalCount > 0 && (
            <Badge variant="default" className="bg-green-600 dark:bg-green-700">
              <Trophy className="h-3 w-3 mr-1" />
              Tamamlandi
            </Badge>
          )}
        </div>

        <Tabs value={frequency} onValueChange={setFrequency} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" data-testid="tab-daily" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Gunluk
              {summary?.daily && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {summary.daily.completed}/{summary.daily.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Haftalik
              {summary?.weekly && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {summary.weekly.completed}/{summary.weekly.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly" className="text-xs">
              <CalendarDays className="h-3 w-3 mr-1" />
              Aylik
              {summary?.monthly && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {summary.monthly.completed}/{summary.monthly.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {totalCount > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} gorev tamamlandi
              </span>
              <span className="text-xs font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Bu periyod icin gorev tanimlanmamis</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const IconComponent = (task.icon && iconMap[task.icon]) ? iconMap[task.icon] : ListTodo;
              return (
                <div
                  key={task.id}
                  data-testid={`task-item-${task.id}`}
                  className={`flex items-center gap-2 p-2 rounded-md transition-colors group ${
                    task.isCompleted 
                      ? "bg-green-50 dark:bg-green-950/20" 
                      : "hover:bg-muted/50"
                  }`}
                >
                  <button
                    onClick={() => handleToggle(task)}
                    disabled={completeMutation.isPending || uncompleteMutation.isPending}
                    className="flex-shrink-0 focus:outline-none"
                    data-testid={`task-toggle-${task.id}`}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className={`h-5 w-5 ${priorityColors[task.priority] || "text-muted-foreground"}`} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium leading-tight ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.targetUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(task.targetUrl);
                        }}
                        data-testid={`task-navigate-${task.id}`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DailyTaskSummaryWidget() {
  const { data: summary } = useQuery<TaskSummary>({
    queryKey: ["/api/daily-tasks/summary"],
    refetchInterval: 60000,
  });

  if (!summary) return null;

  const dailyPercent = summary.daily.total > 0 ? Math.round((summary.daily.completed / summary.daily.total) * 100) : 0;

  return (
    <Card className="hover-elevate cursor-pointer" data-testid="task-summary-widget">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${dailyPercent === 100 ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
            {dailyPercent === 100 ? (
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <ListTodo className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Bugunun Gorevleri</div>
            <div className="text-xs text-muted-foreground">
              {summary.daily.completed}/{summary.daily.total} tamamlandi
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{dailyPercent}%</div>
            <Progress value={dailyPercent} className="h-1 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
