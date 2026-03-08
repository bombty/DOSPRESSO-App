import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Star,
  ArrowRight,
  Bell,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  GraduationCap,
  User,
  ExternalLink,
} from "lucide-react";
import { DobodySuggestionList } from "@/components/dobody-suggestion-card";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";

interface MyDayData {
  greeting: string;
  user: {
    firstName: string;
    role: string;
    compositeScore: number;
    weeklyScoreChange: number;
  };
  todayTasks: Array<{
    type: string;
    title: string;
    status: string;
    link: string;
  }>;
  unreadNotifications: number;
  streak: {
    currentStreak: number;
    bestStreak: number;
    totalActiveDays: number;
    weeklyGoalProgress?: number;
    weeklyGoalTarget?: number;
  };
  careerProgress: {
    compositeScore: number;
    currentLevel: string;
    nextLevel?: {
      titleTr: string;
      requiredModules: number;
      remainingModules: number;
    };
  } | null;
  onboarding: {
    progress: number;
    weeksPassed: number;
    totalWeeks: number;
    mentorName: string | null;
  } | null;
  suggestions: Array<{
    id: string;
    message: string;
    actionType: string;
    actionLabel: string;
    priority: string;
    icon: string;
    payload?: Record<string, any>;
  }>;
}

function TaskIcon({ type, status }: { type: string; status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (type === "checklist") return <ClipboardCheck className="h-4 w-4 text-blue-500" />;
  if (type === "training") return <BookOpen className="h-4 w-4 text-purple-500" />;
  if (type === "notification") return <Bell className="h-4 w-4 text-orange-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function ScoreChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-green-500 text-xs"><TrendingUp className="h-3 w-3" />+{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-red-500 text-xs"><TrendingDown className="h-3 w-3" />{change}</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="h-3 w-3" />0</span>;
}

export default function BenimGunum() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MyDayData>({
    queryKey: ["/api/my-day"],
  });

  const quickAction = useMutation({
    mutationFn: async (action: any) => {
      const res = await apiRequest("POST", "/api/quick-action", action);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "İşlem tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-lg mx-auto" data-testid="benim-gunum-loading">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 max-w-lg mx-auto" data-testid="benim-gunum-error">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Veriler yüklenemedi</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto overflow-y-auto h-full" data-testid="benim-gunum-page">
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div className="space-y-1" data-testid="greeting-section">
        <h1 className="text-2xl font-bold" data-testid="text-greeting">
          {data.greeting}, {data.user.firstName}!
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="text-role">
          {data.user.role === "stajyer" ? "Stajyer" : data.user.role === "barista" ? "Barista" : "Bar Buddy"}
        </p>
      </div>

      {data.onboarding && (
        <Card data-testid="card-onboarding">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Onboarding</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Hafta {data.onboarding.weeksPassed}/{data.onboarding.totalWeeks}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(data.onboarding.progress || 0, 100)}%` }}
                data-testid="progress-onboarding"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              %{data.onboarding.progress || 0} tamamlandı
              {data.onboarding.mentorName && ` | Mentor: ${data.onboarding.mentorName}`}
            </p>
          </CardContent>
        </Card>
      )}

      {data.todayTasks.length > 0 && (
        <Card data-testid="card-today-tasks">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bugün Yapılacaklar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {data.todayTasks.map((task, i) => (
              <Link key={i} href={task.link}>
                <div
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                  data-testid={`task-item-${i}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TaskIcon type={task.type} status={task.status} />
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-my-status">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Benim Durumum
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center space-y-1" data-testid="stat-score">
              <div className="text-2xl font-bold">{data.user.compositeScore}</div>
              <div className="text-xs text-muted-foreground">Skor</div>
              <ScoreChangeIndicator change={data.user.weeklyScoreChange} />
            </div>
            <div className="text-center space-y-1" data-testid="stat-streak">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{data.streak?.currentStreak || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
            <div className="text-center space-y-1" data-testid="stat-level">
              <Trophy className="h-5 w-5 mx-auto text-yellow-500" />
              <div className="text-xs font-medium truncate">
                {data.careerProgress?.currentLevel || "---"}
              </div>
            </div>
          </div>
          {data.careerProgress?.nextLevel && (
            <div className="mt-3 p-2 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Sonraki: <span className="font-medium">{data.careerProgress.nextLevel.titleTr}</span>
                {" "}({data.careerProgress.nextLevel.remainingModules} modül kaldı)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DobodySuggestionList suggestions={data.suggestions || []} />

      <div className="pb-4">
        <Link href="/sube/employee-dashboard">
          <Button variant="outline" className="w-full" data-testid="btn-detailed-dashboard">
            <ExternalLink className="h-4 w-4 mr-2" />
            Detaylı Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
