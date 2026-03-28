import { useState } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ChevronRight,
  ChevronDown,
  Target,
  TrendingUp,
  Award,
  Flame,
  PlayCircle,
  ClipboardCheck,
  Star,
  ShieldCheck,
  Calendar,
  FileQuestion,
  Wrench,
  ChefHat,
  Loader2,
  ArrowUpCircle,
  Info,
  XCircle,
  MapPin,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

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

interface OnboardingStep {
  id: number;
  stepId: number;
  dayNumber: number;
  orderIndex: number;
  title: string;
  description: string | null;
  contentType: string;
  estimatedMinutes: number | null;
  approverType: string;
  status: string;
  completedAt: string | null;
  approvalStatus: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  rating: number | null;
}

interface OnboardingAssignment {
  assignment: {
    id: number;
    templateId: number;
    userId: string;
    startDate: string;
    expectedEndDate: string;
    status: string;
    templateName: string;
  };
  progress: OnboardingStep[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    approved: number;
    rejected: number;
    overallPercent: number;
  };
}

const CONTENT_TYPE_ICONS: Record<string, any> = {
  module: BookOpen,
  quiz: FileQuestion,
  practical: Wrench,
  recipe: ChefHat,
  gate_exam: Award,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  module: "Modül",
  quiz: "Quiz",
  practical: "Pratik",
  recipe: "Reçete",
  gate_exam: "Gate Sınavı",
};

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  not_started: { label: "Başlanmadı", variant: "secondary" },
  in_progress: { label: "Devam Ediyor", variant: "default" },
  completed: { label: "Tamamlandı", variant: "default" },
};

const APPROVAL_LABELS: Record<string, { label: string; variant: string }> = {
  pending: { label: "Onay Bekliyor", variant: "secondary" },
  waiting_approval: { label: "Onay Bekliyor", variant: "secondary" },
  approved: { label: "Onaylandı", variant: "default" },
  rejected: { label: "Reddedildi", variant: "destructive" },
  not_required: { label: "Otomatik", variant: "secondary" },
};

function OnboardingDetailSection({ assignmentData }: { assignmentData: OnboardingAssignment }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const { toast } = useToast();

  const dayGroups = assignmentData.progress.reduce<Record<number, OnboardingStep[]>>((acc, step) => {
    if (!acc[step.dayNumber]) acc[step.dayNumber] = [];
    acc[step.dayNumber].push(step);
    return acc;
  }, {});

  const sortedDays = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  const completeSelfMutation = useMutation({
    mutationFn: async (progressId: number) => {
      const res = await apiRequest('POST', `/api/academy/onboarding/progress/${progressId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/onboarding/my-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/academy/my-path'] });
      toast({ title: "Adım tamamlandı" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const currentDay = (() => {
    const start = new Date(assignmentData.assignment.startDate);
    const now = new Date();
    return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  return (
    <div className="space-y-2" data-testid="onboarding-detail-section">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold">Onboarding Programı</h3>
        <Badge variant="secondary">
          %{assignmentData.stats.overallPercent}
        </Badge>
      </div>

      <Progress value={assignmentData.stats.overallPercent} className="h-2 mb-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-center text-xs mb-3">
        <div className="p-2 rounded-md bg-muted/50">
          <div className="font-semibold text-green-600 dark:text-green-400">{assignmentData.stats.completed}</div>
          <div className="text-muted-foreground">Tamamlanan</div>
        </div>
        <div className="p-2 rounded-md bg-muted/50">
          <div className="font-semibold text-amber-600 dark:text-amber-400">{assignmentData.stats.pending}</div>
          <div className="text-muted-foreground">Bekleyen</div>
        </div>
        <div className="p-2 rounded-md bg-muted/50">
          <div className="font-semibold">{assignmentData.stats.total}</div>
          <div className="text-muted-foreground">Toplam</div>
        </div>
      </div>

      {sortedDays.map((day) => {
        const steps = dayGroups[day].sort((a, b) => a.orderIndex - b.orderIndex);
        const allCompleted = steps.every(s => s.status === 'completed');
        const isToday = day === currentDay;
        const isPast = day < currentDay;
        const isExpanded = expandedDay === day;

        return (
          <Card
            key={day}
            className={`${isToday ? 'border-blue-300 dark:border-blue-700' : ''}`}
            data-testid={`onboarding-day-${day}`}
          >
            <CardContent className="p-0">
              <button
                className="w-full flex items-center justify-between gap-2 p-3 text-left"
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                data-testid={`toggle-day-${day}`}
              >
                <div className="flex items-center gap-2">
                  {allCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isToday ? (
                    <PlayCircle className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : isPast ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    Gün {day}
                  </span>
                  {isToday && <Badge variant="default">Bugün</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {steps.filter(s => s.status === 'completed').length}/{steps.length} adım
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  {steps.map((step) => {
                    const StepIcon = CONTENT_TYPE_ICONS[step.contentType] || BookOpen;
                    const isStepCompleted = step.status === 'completed';
                    const needsApproval = step.approverType !== 'auto' && step.approvalStatus !== 'approved';
                    const isRejected = step.approvalStatus === 'rejected';

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-2 p-2 rounded-md ${
                          isStepCompleted && !isRejected ? 'bg-green-50/50 dark:bg-green-950/20' :
                          isRejected ? 'bg-red-50/50 dark:bg-red-950/20' :
                          'bg-muted/30'
                        }`}
                        data-testid={`onboarding-step-${step.id}`}
                      >
                        <div className="mt-0.5">
                          {isStepCompleted && !isRejected ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : isRejected ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <StepIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium ${isStepCompleted && !isRejected ? 'line-through text-muted-foreground' : ''}`}>
                              {step.title}
                            </span>
                            <Badge variant="secondary">
                              {CONTENT_TYPE_LABELS[step.contentType] || step.contentType}
                            </Badge>
                          </div>

                          {step.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          )}

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {step.estimatedMinutes && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {step.estimatedMinutes} dk
                              </span>
                            )}
                            {needsApproval && step.approvalStatus && (
                              <Badge variant={APPROVAL_LABELS[step.approvalStatus]?.variant as any || "secondary"}>
                                {APPROVAL_LABELS[step.approvalStatus]?.label || step.approvalStatus}
                              </Badge>
                            )}
                            {step.rating && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                <Star className="h-3 w-3" />
                                {step.rating}/5
                              </span>
                            )}
                          </div>

                          {isRejected && step.approvalNotes && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Ret nedeni: {step.approvalNotes}
                            </p>
                          )}
                        </div>

                        {!isStepCompleted && (day <= currentDay) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => completeSelfMutation.mutate(step.id)}
                            disabled={completeSelfMutation.isPending}
                            data-testid={`complete-step-${step.id}`}
                          >
                            {completeSelfMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}

                        {isRejected && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => completeSelfMutation.mutate(step.id)}
                            disabled={completeSelfMutation.isPending}
                            data-testid={`retry-step-${step.id}`}
                          >
                            {completeSelfMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <PlayCircle className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface GateEligibility {
  eligible: boolean;
  checks: {
    minDaysInLevel: boolean;
    requiredModules: boolean;
    compositeScore: boolean;
    noActiveCooldown: boolean;
    maxRetriesNotExceeded: boolean;
  };
  gate: {
    id: number;
    gateNumber: number;
    titleTr: string;
  };
  attemptCount: number;
  maxRetries: number;
}

function GateRequestButton({ data }: { data: MyPathData }) {
  const { toast } = useToast();

  const nextGate = data.nextGate;
  const hasActiveGate = !!data.activeGate;

  const { data: eligibility, isLoading: eligLoading, isError, refetch } = useQuery<GateEligibility>({
    queryKey: ['/api/academy/gates', nextGate?.gateId, 'eligibility', data.userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/gates/${nextGate?.gateId}/eligibility/${data.userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Eligibility check failed');
      return res.json();
    },
    enabled: !!nextGate?.gateId && !hasActiveGate,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/academy/gates/${nextGate?.gateId}/attempt`, {
        userId: data.userId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/my-path'] });
      toast({ title: "Talep Gönderildi", description: "Statü atlama talebiniz başarıyla oluşturuldu." });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  if (!nextGate || hasActiveGate) return null;

  const missingItems: string[] = [];
  if (eligibility && !eligibility.eligible) {
    if (!eligibility.checks.requiredModules) missingItems.push("Zorunlu modüller tamamlanmadı");
    if (!eligibility.checks.compositeScore) missingItems.push("Bileşik skor 70'in altında");
    if (!eligibility.checks.minDaysInLevel) missingItems.push("Minimum süre dolmadı");
    if (!eligibility.checks.noActiveCooldown) missingItems.push("Bekleme süresi devam ediyor");
    if (!eligibility.checks.maxRetriesNotExceeded) missingItems.push("Maksimum deneme hakkı doldu");
  }

  const isEligible = eligibility?.eligible === true;

  return (
    <Card className={isEligible ? "border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-950/20" : ""} data-testid="gate-request-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpCircle className={`h-5 w-5 ${isEligible ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
          <span className="font-semibold text-sm">Statü Atlama</span>
          {nextGate && (
            <Badge variant="secondary">{nextGate.titleTr}</Badge>
          )}
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs">
            {eligibility?.checks.requiredModules ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className={eligibility?.checks.requiredModules ? "text-muted-foreground" : ""}>
              Modüller: {nextGate.requiredModulesCompleted}/{nextGate.requiredModulesTotal}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {eligibility?.checks.compositeScore ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className={eligibility?.checks.compositeScore ? "text-muted-foreground" : ""}>
              Skor: {Math.round(nextGate.currentCompositeScore)}/{nextGate.compositeScoreRequired}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {eligibility?.checks.minDaysInLevel ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className={eligibility?.checks.minDaysInLevel ? "text-muted-foreground" : ""}>
              Minimum süre
            </span>
          </div>
          {eligibility && !eligibility.checks.noActiveCooldown && (
            <div className="flex items-center gap-2 text-xs">
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span>Bekleme süresi devam ediyor</span>
            </div>
          )}
        </div>

        {isEligible ? (
          <Button
            className="w-full gap-2"
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            data-testid="button-gate-request"
          >
            {requestMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
            Statü Atlama Talep Et
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  className="w-full gap-2"
                  disabled
                  data-testid="button-gate-request-disabled"
                >
                  <Lock className="h-4 w-4" />
                  Statü Atlama Talep Et
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium text-xs mb-1">Eksik Koşullar:</p>
              <ul className="text-xs space-y-0.5">
                {missingItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}

        {eligLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uygunluk kontrol ediliyor...
          </div>
        )}
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

  const { data: onboardingData } = useQuery<OnboardingAssignment>({
    queryKey: ['/api/academy/onboarding/my-assignment'],
    enabled: !!data?.onboarding,
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

  const actions = data.actions || [];
  const todayActions = actions.filter(a => a.priority <= 2);
  const developmentActions = actions.filter(a => a.priority >= 3 && a.priority <= 4);
  const optionalActions = actions.filter(a => a.priority >= 5);

  return (
    <div className="space-y-4 p-4 max-w-[1200px] mx-auto" data-testid="my-path-container">
      {data.onboarding && <OnboardingBanner onboarding={data.onboarding} />}

      {onboardingData && <OnboardingDetailSection assignmentData={onboardingData} />}

      <LevelBanner data={data} />

      <GateRequestButton data={data} />

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

      {actions.length === 0 && !data.onboarding && !data.activeGate && (
        <Card data-testid="no-actions">
          <CardContent className="p-6 text-center">
            {data.currentLevel && data.currentLevel.levelNumber >= 5 ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="font-medium">Tebrikler!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tüm adımlarınızı tamamladınız. Yeni içerikler yakında eklenecek.
                </p>
              </>
            ) : (
              <>
                <MapPin className="h-10 w-10 mx-auto text-primary mb-2" />
                <p className="font-medium">Kariyer yolunuz henüz başlatılmamış</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mentorunuz sizi sisteme ekledikten sonra kariyer hedefleriniz burada görünecek.
                </p>
              </>
            )}
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
