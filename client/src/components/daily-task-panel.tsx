import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Circle, Clock, Calendar, CalendarDays,
  ChevronRight, Sparkles, ListTodo, Trophy, Zap,
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
  Star, Edit, HelpCircle, Sparkles: SparklesIcon, Beaker: Box, Zap,
  Calendar,
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

interface EventTask {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  priority: number;
  targetUrl: string | null;
  sourceType: string;
  sourceId: number | null;
  sourceLabel: string | null;
  isCompleted: boolean;
  isAutoResolved: boolean;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface TaskSummary {
  daily: { total: number; completed: number };
  weekly: { total: number; completed: number };
  monthly: { total: number; completed: number };
  events?: { total: number; completed: number };
}

const frequencyLabels: Record<string, string> = {
  daily: "Gunluk",
  weekly: "Haftalik",
  monthly: "Aylik",
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

const sourceTypeLabels: Record<string, string> = {
  task_assigned: "Atanan Gorev",
  task_completed: "Tamamlanan Gorev",
  checklist_assigned: "Checklist",
  feedback_received: "Geri Bildirim",
  fault_reported: "Ariza Bildirimi",
  fault_assigned: "Ariza Gorevi",
  leave_request: "Izin Talebi",
  training_assigned: "Egitim",
  stock_alert: "Stok Uyarisi",
  sla_warning: "SLA Uyarisi",
  performance_review: "Performans",
  quality_audit: "Kalite Denetimi",
  announcement: "Duyuru",
};

export function DailyTaskPanel() {
  const [frequency, setFrequency] = useState("daily");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: [`/api/daily-tasks?frequency=${frequency}`],
    refetchInterval: 60000,
  });

  const { data: eventTasks = [], isLoading: eventsLoading } = useQuery<EventTask[]>({
    queryKey: ["/api/daily-tasks/events"],
    refetchInterval: 30000,
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

  const eventCompleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/daily-tasks/events/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/summary"] });
      toast({ title: "Gorev tamamlandi", description: "Tebrikler!" });
    },
  });

  const eventUncompleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/daily-tasks/events/${taskId}/uncomplete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks/summary"] });
    },
  });

  const activeEventTasks = eventTasks.filter(t => !t.isCompleted);
  const completedEventTasks = eventTasks.filter(t => t.isCompleted);

  const templateCompleted = tasks.filter(t => t.isCompleted).length;
  const allCompleted = templateCompleted + completedEventTasks.length;
  const allTotal = tasks.length + eventTasks.length;
  const progressPercent = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

  const handleToggle = (task: TaskItem) => {
    if (task.isCompleted) {
      uncompleteMutation.mutate(task.id);
    } else {
      completeMutation.mutate(task.id);
    }
  };

  const handleEventToggle = (task: EventTask) => {
    if (task.isCompleted) {
      eventUncompleteMutation.mutate(task.id);
    } else {
      eventCompleteMutation.mutate(task.id);
    }
  };

  const handleNavigate = (url: string | null) => {
    if (url) {
      navigate(url);
    }
  };

  const loading = isLoading || eventsLoading;

  return (
    <Card data-testid="daily-task-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Bugunun Gorevleri</CardTitle>
            {activeEventTasks.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                {activeEventTasks.length}
              </Badge>
            )}
          </div>
          {progressPercent === 100 && allTotal > 0 && (
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

        {allTotal > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                {allCompleted}/{allTotal} gorev tamamlandi
              </span>
              <span className="text-xs font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : (tasks.length === 0 && eventTasks.length === 0) ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Bu periyod icin gorev tanimlanmamis</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeEventTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 pt-1 pb-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Sistem Gorevleri</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {activeEventTasks.length}
                  </Badge>
                </div>
                {activeEventTasks.map((task) => {
                  const IconComponent = (task.icon && iconMap[task.icon]) ? iconMap[task.icon] : Zap;
                  return (
                    <div
                      key={`event-${task.id}`}
                      data-testid={`event-task-${task.id}`}
                      className="flex items-center gap-2 p-2 rounded-md transition-colors group bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <button
                        onClick={() => handleEventToggle(task)}
                        disabled={eventCompleteMutation.isPending || eventUncompleteMutation.isPending}
                        className="flex-shrink-0 focus:outline-none"
                        data-testid={`event-task-toggle-${task.id}`}
                      >
                        <Circle className={`h-5 w-5 ${priorityColors[task.priority] || "text-amber-500"}`} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                            {sourceTypeLabels[task.sourceType] || task.sourceType}
                          </Badge>
                          {task.description && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconComponent className="h-3.5 w-3.5 text-amber-500" />
                        {task.targetUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(task.targetUrl);
                            }}
                            data-testid={`event-task-navigate-${task.id}`}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tasks.length > 0 && (
              <>
                {activeEventTasks.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 pb-1">
                    <ListTodo className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Rol Gorevleri</span>
                  </div>
                )}
                {tasks.map((task) => {
                  const IconComponent = (task.icon && iconMap[task.icon]) ? iconMap[task.icon] : ListTodo;
                  return (
                    <div
                      key={`template-${task.id}`}
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
              </>
            )}

            {completedEventTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 pt-2 pb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Tamamlanan Sistem Gorevleri</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {completedEventTasks.length}
                  </Badge>
                </div>
                {completedEventTasks.slice(0, 3).map((task) => {
                  const IconComponent = (task.icon && iconMap[task.icon]) ? iconMap[task.icon] : Zap;
                  return (
                    <div
                      key={`event-done-${task.id}`}
                      data-testid={`event-task-done-${task.id}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 group"
                    >
                      <button
                        onClick={() => handleEventToggle(task)}
                        disabled={eventUncompleteMutation.isPending}
                        className="flex-shrink-0 focus:outline-none"
                        data-testid={`event-task-toggle-done-${task.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight line-through text-muted-foreground">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                            {sourceTypeLabels[task.sourceType] || task.sourceType}
                          </Badge>
                          {task.isAutoResolved && (
                            <span className="text-[9px] text-green-600 dark:text-green-400">Otomatik</span>
                          )}
                        </div>
                      </div>
                      <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
                {completedEventTasks.length > 3 && (
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground">
                      +{completedEventTasks.length - 3} tamamlanan gorev daha
                    </span>
                  </div>
                )}
              </>
            )}
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
  const eventCount = summary.events?.total || 0;
  const eventPending = eventCount - (summary.events?.completed || 0);

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {summary.daily.completed}/{summary.daily.total} tamamlandi
              </span>
              {eventPending > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                  <Zap className="h-2 w-2 mr-0.5" />
                  {eventPending}
                </Badge>
              )}
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
