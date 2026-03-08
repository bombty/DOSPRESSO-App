import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, Clock, Flame, Trophy, X } from "lucide-react";
import { useDobodyFlow, type FlowTask } from "@/contexts/dobody-flow-context";

interface DobodyFlowModeProps {
  userId: string | number;
  userRole: string;
  userName: string;
  branchId?: number | null;
}

interface FlowTasksResponse {
  greeting: string;
  personalMessage?: string;
  tasks: FlowTask[];
  completedToday: number;
  streak: number;
  score: number;
}

export function DobodyFlowMode({ userId, userRole, userName, branchId }: DobodyFlowModeProps) {
  const [, navigate] = useLocation();
  const {
    flowTasks,
    isFlowActive,
    isDismissed,
    completedToday,
    streak,
    score,
    greeting,
    personalMessage,
    setFlowData,
    startFlow,
    dismissFlow,
    setUserId,
  } = useDobodyFlow();

  const [showCompletion, setShowCompletion] = useState(false);
  const [userIdSet, setUserIdSet] = useState(false);

  useEffect(() => {
    if (userId) {
      setUserId(userId);
      setUserIdSet(true);
    }
  }, [userId, setUserId]);

  const queryUrl = `/api/dobody/flow-tasks?userId=${userId}&role=${userRole}&branchId=${branchId || ""}`;
  const { data, isLoading } = useQuery<FlowTasksResponse>({
    queryKey: [queryUrl],
    enabled: userIdSet && !isDismissed && !isFlowActive,
  });

  useEffect(() => {
    if (data && data.tasks) {
      setFlowData({
        tasks: data.tasks.map((t: any) => ({
          ...t,
          navigateTo: t.navigateTo || t.route,
          completed: t.completed ?? false,
        })),
        completedToday: data.completedToday,
        streak: typeof data.streak === "object" ? (data.streak as any).currentStreak || 0 : data.streak,
        score: data.score,
        greeting: data.greeting,
        personalMessage: data.personalMessage,
      });
    }
  }, [data, setFlowData]);

  const allCompleted = flowTasks.length > 0 && flowTasks.every((t) => t.completed);

  useEffect(() => {
    if (allCompleted && isFlowActive) {
      setShowCompletion(true);
    }
  }, [allCompleted, isFlowActive]);

  if (!userIdSet) return null;
  if (isDismissed) return null;
  if (isFlowActive && !showCompletion) return null;
  if (isLoading) return <FlowCardSkeleton />;
  if (!flowTasks || flowTasks.length === 0) return null;

  if (showCompletion) {
    return (
      <Card
        className="mb-4 overflow-visible border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20"
        data-testid="card-flow-completion"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <img
                src="/mascot/dobody_5.png"
                alt="Mr. Dobody"
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base" data-testid="text-completion-title">
                Harika! Bugünlük tamamladın!
              </h3>
              <p className="text-sm text-muted-foreground">
                Tüm görevlerini başarıyla tamamladın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap mb-3">
            {streak > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-streak-count">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">{streak} gün streak</span>
              </div>
            )}
            {score > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-score-count">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{score} puan</span>
              </div>
            )}
            <div className="flex items-center gap-1.5" data-testid="text-completed-count">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{completedToday} görev tamamlandı</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowCompletion(false);
              dismissFlow();
            }}
            data-testid="button-close-completion"
          >
            Kapat
          </Button>
        </CardContent>
      </Card>
    );
  }

  const firstName = userName?.split(" ")[0] || "";

  return (
    <Card
      className="mb-4 overflow-visible border-0 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20"
      data-testid="card-flow-mode"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <img
              src="/mascot/dobody_0.png"
              alt="Mr. Dobody"
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base" data-testid="text-flow-greeting">
              {greeting || "Merhaba"}{firstName ? `, ${firstName}` : ""}
            </h3>
            {personalMessage && (
              <p className="text-sm text-muted-foreground" data-testid="text-personal-message">
                {personalMessage}
              </p>
            )}
          </div>
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium" data-testid="text-flow-streak">
              {streak} gün streak!
            </span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {flowTasks.map((task, index) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2.5 rounded-md bg-background/60 dark:bg-background/30"
              data-testid={`flow-task-${task.id}`}
            >
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  task.completed
                    ? "bg-green-500 border-green-500"
                    : "border-muted-foreground/30"
                }`}
              >
                {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                )}
              </div>
              {task.estimatedMinutes && (
                <Badge variant="secondary" className="flex-shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {task.estimatedMinutes} dk
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => {
              startFlow();
              const firstTask = flowTasks.find((t) => !t.completed);
              if (firstTask?.navigateTo) {
                navigate(firstTask.navigateTo);
              }
            }}
            data-testid="button-start-flow"
          >
            <Bot className="w-4 h-4 mr-2" />
            İlk İşe Başla
          </Button>
          <button
            className="w-full text-center text-sm text-muted-foreground py-1 transition-colors"
            onClick={() => dismissFlow()}
            data-testid="button-dismiss-flow"
          >
            Kendi başıma devam etmek istiyorum
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function FlowCardSkeleton() {
  return (
    <Card className="mb-4 overflow-visible border-0 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/50 animate-pulse rounded-md" />
          ))}
        </div>
        <div className="h-9 bg-muted animate-pulse rounded-md" />
      </CardContent>
    </Card>
  );
}
