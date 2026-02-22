import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ChevronRight,
  Target,
  TrendingUp,
  Award,
  Flame,
  PlayCircle,
  ClipboardCheck,
  Star,
  ShieldCheck,
} from "lucide-react";

interface MyPathData {
  userId: string;
  role: string;
  currentLevel: {
    id: number;
    roleId: string;
    levelNumber: number;
    titleTr: string;
  } | null;
  compositeScore: number;
  trainingScore: number;
  practicalScore: number;
  attendanceScore: number;
  managerScore: number;
  onboarding: {
    assignmentId: number;
    dayNumber: number;
    totalDays: number;
    overallProgress: number;
    startDate: string;
    expectedEndDate: string;
  } | null;
  activeGate: {
    attemptId: number;
    gateNumber: number;
    gateTitleTr: string;
    status: string;
    quizPassed: boolean | null;
    practicalPassed: boolean | null;
    attendancePassed: boolean | null;
  } | null;
  nextGate: {
    gateId: number;
    gateNumber: number;
    titleTr: string;
    minDaysInLevel: number;
    requiredModulesTotal: number;
    requiredModulesCompleted: number;
    compositeScoreRequired: number;
    currentCompositeScore: number;
    allModulesCompleted: boolean;
  } | null;
  actions: ActionItem[];
  completedModuleCount: number;
}

interface ActionItem {
  priority: number;
  type: string;
  contentId: number | null;
  title: string;
  reason: string;
  estimatedMinutes?: number;
  status: string;
  progressId?: number;
  packItemId?: number;
  attemptId?: number;
}

const PRIORITY_CONFIG: Record<number, { color: string; label: string }> = {
  1: { color: "destructive", label: "Bugün" },
  2: { color: "destructive", label: "Gecikmiş" },
  3: { color: "secondary", label: "KPI" },
  4: { color: "default", label: "Gelişim" },
  5: { color: "outline", label: "Önerilen" },
  6: { color: "outline", label: "Tazelendirme" },
};

const TYPE_ICONS: Record<string, any> = {
  module: BookOpen,
  quiz: ClipboardCheck,
  practical: ShieldCheck,
  recipe: Star,
  gate_exam: Award,
  onboarding: GraduationCap,
  onboarding_overdue: AlertTriangle,
  kpi_training: TrendingUp,
};

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1" data-testid={`score-bar-${label}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

function OnboardingBanner({ onboarding }: { onboarding: MyPathData["onboarding"] }) {
  if (!onboarding) return null;
  const percent = Math.round((onboarding.dayNumber / onboarding.totalDays) * 100);

  return (
    <Card className="border-l-0 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30" data-testid="onboarding-banner">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm">
              Onboarding — Gün {onboarding.dayNumber}/{onboarding.totalDays}
            </span>
          </div>
          <Badge variant="secondary" data-testid="onboarding-progress-badge">
            %{onboarding.overallProgress}
          </Badge>
        </div>
        <Progress value={percent} className="mt-2 h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          Gate-0 sınavına {onboarding.totalDays - onboarding.dayNumber} gün kaldı
        </p>
      </CardContent>
    </Card>
  );
}

function LevelBanner({ data }: { data: MyPathData }) {
  if (!data.currentLevel) return null;

  const levelLabels: Record<string, string> = {
    stajyer: "Stajyer",
    bar_buddy: "Bar Buddy",
    barista: "Barista",
    supervisor_buddy: "Supervisor Buddy",
    supervisor: "Supervisor",
  };

  return (
    <Card data-testid="level-banner">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">
              {levelLabels[data.currentLevel.roleId] || data.currentLevel.titleTr} — Seviye {data.currentLevel.levelNumber}
            </span>
          </div>
          <Badge variant="default" data-testid="composite-score-badge">
            Skor: {Math.round(data.compositeScore)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <ScoreBar label="Eğitim" value={data.trainingScore} />
          <ScoreBar label="Pratik" value={data.practicalScore} />
          <ScoreBar label="Devam" value={data.attendanceScore} />
          <ScoreBar label="Yönetici" value={data.managerScore} />
        </div>

        {data.nextGate && (
          <div className="mt-3 p-2 rounded-md bg-muted/50">
            <div className="flex items-center gap-1 text-xs font-medium">
              <ChevronRight className="h-3 w-3" />
              Sonraki: {data.nextGate.titleTr}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span data-testid="next-gate-modules">
                Modül: {data.nextGate.requiredModulesCompleted}/{data.nextGate.requiredModulesTotal}
              </span>
              <span data-testid="next-gate-score">
                Skor: {Math.round(data.nextGate.currentCompositeScore)}/{data.nextGate.compositeScoreRequired}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GateExamBanner({ gate }: { gate: MyPathData["activeGate"] }) {
  if (!gate) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20" data-testid="gate-exam-banner">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-sm">{gate.gateTitleTr}</span>
          <Badge variant="secondary">Aktif</Badge>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
          <span className={gate.quizPassed === true ? "text-green-600" : gate.quizPassed === false ? "text-red-600" : "text-muted-foreground"}>
            {gate.quizPassed === true ? "Quiz Geçti" : gate.quizPassed === false ? "Quiz Kaldı" : "Quiz Bekliyor"}
          </span>
          <span className={gate.practicalPassed === true ? "text-green-600" : gate.practicalPassed === false ? "text-red-600" : "text-muted-foreground"}>
            {gate.practicalPassed === true ? "Pratik Geçti" : gate.practicalPassed === false ? "Pratik Kaldı" : "Pratik Bekliyor"}
          </span>
          <span className={gate.attendancePassed === true ? "text-green-600" : gate.attendancePassed === false ? "text-red-600" : "text-muted-foreground"}>
            {gate.attendancePassed === true ? "Devam OK" : gate.attendancePassed === false ? "Devam Kaldı" : "Devam Bekliyor"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ action, onComplete }: { action: ActionItem; onComplete: (item: ActionItem) => void }) {
  const Icon = TYPE_ICONS[action.type] || BookOpen;
  const priorityCfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG[4];

  const isCompleted = action.status === 'completed';
  const isOverdue = action.priority <= 2;

  return (
    <Card
      className={`hover-elevate ${isOverdue ? 'border-red-200 dark:border-red-900/40' : ''}`}
      data-testid={`action-card-${action.priority}-${action.type}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-1.5 rounded-md ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Icon className={`h-4 w-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {action.title}
              </span>
              <Badge
                variant={priorityCfg.color as any}
              >
                {priorityCfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
            {action.estimatedMinutes && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{action.estimatedMinutes} dk</span>
              </div>
            )}
          </div>

          {!isCompleted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onComplete(action)}
              data-testid={`action-start-${action.type}`}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AcademyMyPath() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<MyPathData>({
    queryKey: ['/api/academy/my-path'],
  });

  const completeMutation = useMutation({
    mutationFn: async (item: ActionItem) => {
      if (item.progressId) {
        const res = await apiRequest('POST', '/api/academy/my-path/complete-item', {
          progressId: item.progressId,
          type: item.type,
        });
        return res.json();
      }
      return { message: "Yönlendiriliyor..." };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/my-path'] });
      toast({ title: "Adım tamamlandı" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleActionClick = (action: ActionItem) => {
    if (action.type === 'gate_exam') {
      toast({ title: "Gate Sınavı", description: "Gate sınav sayfasına yönlendiriliyorsunuz..." });
      return;
    }

    if (action.progressId) {
      completeMutation.mutate(action);
    } else if (action.contentId) {
      setLocation(`/akademi-modul/${action.contentId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="my-path-loading">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center" data-testid="my-path-error">
        <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Veriler yüklenemedi. Lütfen tekrar deneyin.
        </p>
      </div>
    );
  }

  const todayActions = data.actions.filter(a => a.priority <= 2);
  const developmentActions = data.actions.filter(a => a.priority >= 3 && a.priority <= 4);
  const optionalActions = data.actions.filter(a => a.priority >= 5);

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto" data-testid="my-path-container">
      {data.onboarding && <OnboardingBanner onboarding={data.onboarding} />}

      <LevelBanner data={data} />

      {data.activeGate && <GateExamBanner gate={data.activeGate} />}

      {todayActions.length > 0 && (
        <div data-testid="today-actions">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">Bugün Yapılacaklar</h3>
            <Badge variant="destructive">{todayActions.length}</Badge>
          </div>
          <div className="space-y-2">
            {todayActions.map((action, idx) => (
              <ActionCard
                key={`today-${idx}`}
                action={action}
                onComplete={handleActionClick}
              />
            ))}
          </div>
        </div>
      )}

      {developmentActions.length > 0 && (
        <div data-testid="development-actions">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Seviye Gelişimi</h3>
            <Badge variant="secondary">{developmentActions.length}</Badge>
          </div>
          <div className="space-y-2">
            {developmentActions.map((action, idx) => (
              <ActionCard
                key={`dev-${idx}`}
                action={action}
                onComplete={handleActionClick}
              />
            ))}
          </div>
        </div>
      )}

      {optionalActions.length > 0 && (
        <div data-testid="optional-actions">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Önerilen</h3>
          </div>
          <div className="space-y-2">
            {optionalActions.map((action, idx) => (
              <ActionCard
                key={`opt-${idx}`}
                action={action}
                onComplete={handleActionClick}
              />
            ))}
          </div>
        </div>
      )}

      {data.actions.length === 0 && !data.onboarding && !data.activeGate && (
        <Card data-testid="no-actions">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
            <p className="font-medium">Tebrikler!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tüm adımlarınızı tamamladınız. Yeni içerikler yakında eklenecek.
            </p>
          </CardContent>
        </Card>
      )}

      {data.completedModuleCount > 0 && (
        <div className="text-center pt-2 text-xs text-muted-foreground" data-testid="completed-count">
          Toplam {data.completedModuleCount} modül tamamlandı
        </div>
      )}
    </div>
  );
}
