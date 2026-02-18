import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Circle, Clock, Calendar, CalendarDays,
  ChevronRight, ChevronDown, Sparkles, ListTodo, Trophy, Zap,
  Monitor, UserCheck, Bell, Shield, Database, BarChart, TrendingUp,
  DollarSign, AlertTriangle, BarChart3, FileText, Target, Briefcase,
  MapPin, Building, Megaphone, Globe, Calculator, FileCheck, Wallet,
  Receipt, ArrowLeftRight, Package, ClipboardCheck, Scale, RotateCcw,
  Search, CheckSquare, Ruler, GraduationCap, MessageSquare, Award,
  PlusCircle, BookOpen, Share2, Image, MessageCircle, Wrench, Heart,
  Box, Headphones, AlertCircle, Factory, RefreshCw, CheckCircle, Users,
  ClipboardList, Coffee, Sunrise, Sunset, Settings, Droplet, Play,
  Star, Edit, HelpCircle, Sparkles as SparklesIcon, ExternalLink
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

interface DetailStep {
  step: string;
  tip?: string;
}

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
  detailSteps: DetailStep[] | null;
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

function TaskDetailPanel({ steps, targetUrl, onNavigate }: { steps: DetailStep[]; targetUrl: string | null; onNavigate: (url: string | null) => void }) {
  return (
    <div className="mt-2 ml-7 pb-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed">{s.step}</p>
            {s.tip && (
              <p className="text-[10px] text-muted-foreground mt-0.5 italic">{s.tip}</p>
            )}
          </div>
        </div>
      ))}
      {targetUrl && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1.5 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(targetUrl);
          }}
          data-testid="task-detail-navigate"
        >
          <ExternalLink className="h-3 w-3" />
          Ilgili module git
        </Button>
      )}
    </div>
  );
}

export function DailyTaskPanel() {
  const [frequency, setFrequency] = useState("daily");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<{type: 'template' | 'event', task: any} | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
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

  const pendingTasks = tasks.filter(t => !t.isCompleted).sort((a, b) => a.priority - b.priority);
  const completedTemplateTasks = tasks.filter(t => t.isCompleted);
  const allCompletedTasks = [...completedTemplateTasks, ...completedEventTasks];

  const templateCompleted = completedTemplateTasks.length;
  const allCompleted = templateCompleted + completedEventTasks.length;
  const allTotal = tasks.length + eventTasks.length;
  const progressPercent = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

  const handleToggle = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    if (task.isCompleted) {
      uncompleteMutation.mutate(task.id);
    } else {
      setConfirmTask({ type: 'template', task });
    }
  };

  const handleEventToggle = (e: React.MouseEvent, task: EventTask) => {
    e.stopPropagation();
    if (task.isCompleted) {
      eventUncompleteMutation.mutate(task.id);
    } else {
      setConfirmTask({ type: 'event', task });
    }
  };

  const handleConfirmComplete = () => {
    if (!confirmTask) return;
    if (confirmTask.type === 'template') {
      completeMutation.mutate(confirmTask.task.id);
    } else {
      eventCompleteMutation.mutate(confirmTask.task.id);
    }
    setConfirmTask(null);
  };

  const handleNavigate = (url: string | null) => {
    if (url) {
      navigate(url);
    }
  };

  const toggleExpand = (taskKey: string) => {
    setExpandedTaskId(prev => prev === taskKey ? null : taskKey);
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
                  const taskKey = `event-${task.id}`;
                  const isExpanded = expandedTaskId === taskKey;
                  return (
                    <div
                      key={taskKey}
                      data-testid={`event-task-${task.id}`}
                      className="rounded-md transition-colors bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer select-none"
                        onClick={() => toggleExpand(taskKey)}
                        data-testid={`event-task-row-${task.id}`}
                      >
                        <button
                          onClick={(e) => handleEventToggle(e, task)}
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
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
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
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-2 pb-2">
                          <div className="ml-7 text-xs text-muted-foreground">
                            {task.description || "Detay bilgisi bulunmuyor"}
                          </div>
                          {task.targetUrl && (
                            <div className="ml-7 mt-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(task.targetUrl);
                                }}
                                data-testid={`event-task-navigate-${task.id}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ilgili module git
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {pendingTasks.length > 0 && (
              <>
                {activeEventTasks.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 pb-1">
                    <ListTodo className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Rol Gorevleri</span>
                  </div>
                )}
                {pendingTasks.map((task) => {
                  const IconComponent = (task.icon && iconMap[task.icon]) ? iconMap[task.icon] : ListTodo;
                  const taskKey = `template-${task.id}`;
                  const isExpanded = expandedTaskId === taskKey;
                  const hasSteps = task.detailSteps && task.detailSteps.length > 0;
                  return (
                    <div
                      key={taskKey}
                      data-testid={`task-item-${task.id}`}
                      className={`rounded-md transition-colors ${
                        isExpanded ? "bg-muted/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer select-none"
                        onClick={() => toggleExpand(taskKey)}
                        data-testid={`task-row-${task.id}`}
                      >
                        <button
                          onClick={(e) => handleToggle(e, task)}
                          disabled={completeMutation.isPending || uncompleteMutation.isPending}
                          className="flex-shrink-0 focus:outline-none"
                          data-testid={`task-toggle-${task.id}`}
                        >
                          <Circle className={`h-5 w-5 ${priorityColors[task.priority] || "text-muted-foreground"}`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-tight">
                            {task.title}
                          </div>
                          {task.description && !isExpanded && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-2 pb-2">
                          {task.description && (
                            <p className="ml-7 text-xs text-muted-foreground mb-1.5">{task.description}</p>
                          )}
                          {hasSteps ? (
                            <TaskDetailPanel
                              steps={task.detailSteps!}
                              targetUrl={task.targetUrl}
                              onNavigate={handleNavigate}
                            />
                          ) : (
                            <div className="ml-7">
                              {task.targetUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(task.targetUrl);
                                  }}
                                  data-testid={`task-navigate-${task.id}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ilgili module git
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {allCompletedTasks.length > 0 && (
              <>
                <div
                  className="flex items-center gap-1.5 pt-2 pb-1 cursor-pointer select-none"
                  onClick={() => setShowCompleted(prev => !prev)}
                  data-testid="toggle-completed-section"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Tamamlanan Gorevler</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {allCompletedTasks.length}
                  </Badge>
                  {showCompleted ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  )}
                </div>
                {showCompleted && allCompletedTasks.map((task) => {
                  const isEvent = 'sourceType' in task;
                  const IconComponent = isEvent
                    ? ((task as EventTask).icon && iconMap[(task as EventTask).icon!]) ? iconMap[(task as EventTask).icon!] : Zap
                    : ((task as TaskItem).icon && iconMap[(task as TaskItem).icon!]) ? iconMap[(task as TaskItem).icon!] : ListTodo;
                  const taskKey = isEvent ? `event-done-${task.id}` : `template-done-${task.id}`;
                  return (
                    <div
                      key={taskKey}
                      data-testid={isEvent ? `event-task-done-${task.id}` : `task-item-done-${task.id}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEvent) {
                            eventUncompleteMutation.mutate(task.id);
                          } else {
                            uncompleteMutation.mutate(task.id);
                          }
                        }}
                        disabled={uncompleteMutation.isPending || eventUncompleteMutation.isPending}
                        className="flex-shrink-0 focus:outline-none"
                        data-testid={isEvent ? `event-task-toggle-done-${task.id}` : `task-toggle-done-${task.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight line-through text-muted-foreground">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {isEvent && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                              {sourceTypeLabels[(task as EventTask).sourceType] || (task as EventTask).sourceType}
                            </Badge>
                          )}
                          {isEvent && (task as EventTask).isAutoResolved && (
                            <span className="text-[9px] text-green-600 dark:text-green-400">Otomatik</span>
                          )}
                        </div>
                      </div>
                      <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmTask} onOpenChange={(open) => { if (!open) setConfirmTask(null); }}>
        <AlertDialogContent data-testid="task-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Gorevi tamamladiniz mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTask?.task?.title}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="task-confirm-cancel">Iptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete} data-testid="task-confirm-action">
              Evet, Tamamlandi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
