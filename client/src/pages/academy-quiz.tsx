import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader, ArrowRight, Zap, Lock, RefreshCw, Trophy, AlertTriangle, Eye, EyeOff, Timer, Shield, Flame, BookOpen, Star, TrendingUp } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

type AttemptInfo = {
  attempts: any[];
  attemptCount: number;
  hasPassed: boolean;
  lastAttempt: any;
  canRetry: boolean;
  retryAvailableAt: string | null;
  maxAttempts: number;
};

type AntiCheatMetadata = {
  tabSwitchCount: number;
  completionType: "normal" | "timeout" | "tab_switch" | "page_close" | "question_timeout";
  deviceType: string;
  questionTimings: Record<number, number>;
  totalTimeSpent: number;
  anomalyFlags: string[];
};

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

const QUESTION_TIME_LIMIT = 60;
const TOTAL_TIME_LIMIT_MINUTES = 30;
const TOTAL_TIME_LIMIT_SECONDS = TOTAL_TIME_LIMIT_MINUTES * 60;
const TAB_SWITCH_AUTO_SUBMIT_DELAY = 10;

export default function AcademyQuiz() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute("/akademi-quiz/:quizId");
  const quizId = params?.quizId;
  const { isOnline } = useNetworkStatus();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [offlineWarningShown, setOfflineWarningShown] = useState(false);

  const [totalTimeRemaining, setTotalTimeRemaining] = useState(TOTAL_TIME_LIMIT_SECONDS);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(QUESTION_TIME_LIMIT);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningCountdown, setTabWarningCountdown] = useState(TAB_SWITCH_AUTO_SUBMIT_DELAY);

  const questionStartTimeRef = useRef<number>(Date.now());
  const questionTimingsRef = useRef<Record<number, number>>({});
  const quizStartTimeRef = useRef<number>(Date.now());
  const hasAutoSubmittedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const completionTypeRef = useRef<AntiCheatMetadata["completionType"]>("normal");

  useEffect(() => {
    if (!isOnline && quizStarted && !submitted && !offlineWarningShown) {
      setOfflineWarningShown(true);
      toast({
        title: "İnternet bağlantısı kesildi",
        description: "Sınavınız geçersiz sayılacak. Lütfen internet bağlantınızı kontrol edin.",
        variant: "destructive",
        duration: 10000,
      });
    }
    if (isOnline && offlineWarningShown) {
      setOfflineWarningShown(false);
    }
  }, [isOnline, quizStarted, submitted, offlineWarningShown, toast]);

  const { data: attemptInfo, isLoading: attemptsLoading, isError, refetch } = useQuery<AttemptInfo>({
    queryKey: [`/api/academy/quiz/${quizId}/attempts`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz/${quizId}/attempts`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!quizId,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/academy/quiz/${quizId}/questions`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz/${quizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!quizId,
  });

  const { data: recommendation } = useQuery({
    queryKey: [`/api/academy/adaptive-recommendation/${quizId}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/adaptive-recommendation/${quizId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: submitted,
  });

  const { data: dailyRecommendation } = useQuery({
    queryKey: ['/api/academy/daily-recommendation'],
    queryFn: async () => {
      const res = await fetch('/api/academy/daily-recommendation', { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: submitted && score >= (quiz?.passingScore ?? 70),
  });

  const { data: careerProgress } = useQuery({
    queryKey: ['/api/academy/career-progress', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/academy/career-progress/${user?.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: submitted && !!user?.id,
  });

  const { data: careerLevels } = useQuery({
    queryKey: ['/api/academy/career-levels'],
    queryFn: async () => {
      const res = await fetch('/api/academy/career-levels', { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: submitted,
  });

  const getRemainingTime = () => {
    if (!attemptInfo?.retryAvailableAt) return null;
    const retryTime = new Date(attemptInfo.retryAvailableAt).getTime();
    const now = Date.now();
    const diff = retryTime - now;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} saat ${minutes} dakika`;
  };

  const quiz = {
    id: quizId,
    title: "Espresso Hazırlama Teknikleri",
    description: "Profesyonel espresso hazırlamayı öğrenin",
    timeLimit: TOTAL_TIME_LIMIT_SECONDS,
    passingScore: 70,
    questions: questions,
  };

  const buildMetadata = useCallback((cType: AntiCheatMetadata["completionType"]): AntiCheatMetadata => {
    const totalTimeSpent = Math.round((Date.now() - quizStartTimeRef.current) / 1000);
    const anomalyFlags: string[] = [];

    if (totalTimeSpent < 60 && quiz.questions.length >= 10) {
      anomalyFlags.push("too_fast");
    }
    if (tabSwitchCountRef.current >= 3) {
      anomalyFlags.push("excessive_tab_switches");
    }
    if (cType === "page_close") {
      anomalyFlags.push("page_close");
    }

    return {
      tabSwitchCount: tabSwitchCountRef.current,
      completionType: cType,
      deviceType: getDeviceType(),
      questionTimings: { ...questionTimingsRef.current },
      totalTimeSpent,
      anomalyFlags,
    };
  }, [quiz.questions.length]);

  const submitMutation = useMutation({
    mutationFn: async (result: { quizId: string; score: number; answers: Record<number, string>; metadata: AntiCheatMetadata }) => {
      return apiRequest("POST", "/api/academy/quiz-result", result);
    },
    onSuccess: () => {
      toast({ title: "Quiz tamamlandı", description: "Sonuçlarınız kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quiz-results"] });
      queryClient.invalidateQueries({ queryKey: [`/api/academy/quiz/${quizId}/attempts`] });
    },
  });

  const doSubmit = useCallback((cType: AntiCheatMetadata["completionType"] = "normal") => {
    if (hasAutoSubmittedRef.current || submitted) return;
    hasAutoSubmittedRef.current = true;
    completionTypeRef.current = cType;

    const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    questionTimingsRef.current[currentQuestion] = (questionTimingsRef.current[currentQuestion] || 0) + elapsed;

    let correctCount = 0;
    quiz.questions.forEach((q: any, idx: number) => {
      if (parseInt(answers[idx]) === q.correct_answer_index) {
        correctCount++;
      }
    });
    const finalScore = quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
    setScore(finalScore);
    setSubmitted(true);
    setShowTabWarning(false);

    const metadata = buildMetadata(cType);

    submitMutation.mutate({
      quizId: quizId || "",
      score: finalScore,
      answers,
      metadata,
    });
  }, [answers, buildMetadata, currentQuestion, quiz.questions, quizId, submitted, submitMutation]);

  const handleSubmit = useCallback(() => {
    doSubmit("normal");
  }, [doSubmit]);

  useEffect(() => {
    if (!quizStarted || submitted || quiz.questions.length === 0) return;

    const interval = setInterval(() => {
      setTotalTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          doSubmit("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  return () => clearInterval(interval);
  }, [quizStarted, submitted, quiz.questions.length, doSubmit]);

  useEffect(() => {
    if (!quizStarted || submitted || quiz.questions.length === 0) return;

    setQuestionTimeRemaining(QUESTION_TIME_LIMIT);
    questionStartTimeRef.current = Date.now();

    const interval = setInterval(() => {
      setQuestionTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const elapsed = QUESTION_TIME_LIMIT;
          questionTimingsRef.current[currentQuestion] = (questionTimingsRef.current[currentQuestion] || 0) + elapsed;

          if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion((q) => q + 1);
          } else {
            doSubmit("question_timeout");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, quizStarted, submitted, quiz.questions.length, doSubmit]);

  useEffect(() => {
    if (!quizStarted || submitted || quiz.questions.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        setTabSwitchCount(tabSwitchCountRef.current);
        setShowTabWarning(true);
        setTabWarningCountdown(TAB_SWITCH_AUTO_SUBMIT_DELAY);

        toast({
          title: "Sekme Değişikliği Tespit Edildi",
          description: `Uyarı ${tabSwitchCountRef.current}: 10 saniye içinde geri dönmezseniz sınavınız otomatik gönderilecektir.`,
          variant: "destructive",
        });
      } else {
        setShowTabWarning(false);
        setTabWarningCountdown(TAB_SWITCH_AUTO_SUBMIT_DELAY);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [quizStarted, submitted, quiz.questions.length, toast]);

  useEffect(() => {
    if (!showTabWarning || submitted) return;

    const interval = setInterval(() => {
      setTabWarningCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          doSubmit("tab_switch");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTabWarning, submitted, doSubmit]);

  useEffect(() => {
    if (!quizStarted || submitted || quiz.questions.length === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Sınavınız henüz tamamlanmadı. Sayfadan ayrılmak istediğinize emin misiniz?";

      if (!hasAutoSubmittedRef.current) {
        doSubmit("page_close");
      }
    };

    const handlePageHide = () => {
      if (!hasAutoSubmittedRef.current) {
        doSubmit("page_close");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [quizStarted, submitted, quiz.questions.length, doSubmit]);

  const advanceToNextQuestion = useCallback(() => {
    if (submitted || quiz.questions.length === 0) return;

    const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    questionTimingsRef.current[currentQuestion] = (questionTimingsRef.current[currentQuestion] || 0) + elapsed;

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }, [currentQuestion, quiz.questions.length, submitted]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading || attemptsLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Soru yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (attemptInfo?.hasPassed) {
    return (
      <div className="grid grid-cols-1 gap-3 p-3 max-w-md mx-auto">
        <Link to="/akademi">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Akademi
          </Button>
        </Link>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="text-center pb-2">
            <Trophy className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Quiz Tamamlandı!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Bu quiz'i başarıyla tamamladınız.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-green-500">BAŞARILI</Badge>
              <span className="text-sm font-medium">{attemptInfo.lastAttempt?.score}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {attemptInfo.attemptCount} deneme kullanıldı
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (attemptInfo && !attemptInfo.canRetry && !attemptInfo.hasPassed) {
    const remainingTime = getRemainingTime();
    const attemptsRemaining = attemptInfo.maxAttempts - attemptInfo.attemptCount;
    
    return (
      <div className="grid grid-cols-1 gap-3 p-3 max-w-md mx-auto">
        <Link to="/akademi">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Akademi
          </Button>
        </Link>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="text-center pb-2">
            <Lock className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Bekleme Süresi</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Tekrar denemeden önce beklemeniz gerekiyor.
            </p>
            {remainingTime && (
              <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-md">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="font-medium">{remainingTime}</span>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Son puan: <span className="font-medium">{attemptInfo.lastAttempt?.score}%</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Kalan deneme: <span className="font-medium">{attemptsRemaining > 0 ? attemptsRemaining : 0}</span>
              </p>
            </div>
            {attemptsRemaining <= 0 && (
              <div className="flex items-center justify-center gap-2 p-2 bg-red-500/10 rounded-md">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">Deneme hakkınız kalmadı</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quiz.questions.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Soru Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Bu sınav için henüz soru eklenmemiş.</p>
            <Button onClick={() => window.history.back()}>Geri Dön</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="grid grid-cols-1 gap-3 p-3 max-w-md mx-auto">
        <Link to="/akademi">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Akademi
          </Button>
        </Link>
        <Card>
          <CardHeader className="text-center pb-2">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-base">Sınav Kuralları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Timer className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Toplam süre: <strong className="text-foreground">{TOTAL_TIME_LIMIT_MINUTES} dakika</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Her soru için: <strong className="text-foreground">{QUESTION_TIME_LIMIT} saniye</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Sorularda <strong className="text-foreground">geri dönemezsiniz</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <EyeOff className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Sekme değiştirme <strong className="text-foreground">tespit edilir</strong> ve kaydedilir</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>10 saniye içinde geri dönmezseniz sınav <strong className="text-foreground">otomatik gönderilir</strong></span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Toplam {quiz.questions.length} soru | Geçme notu: %{quiz.passingScore}
              </p>
              <Button
                className="w-full"
                data-testid="button-start-quiz"
                onClick={() => {
                  setQuizStarted(true);
                  quizStartTimeRef.current = Date.now();
                  questionStartTimeRef.current = Date.now();
                }}
              >
                Sınava Başla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const isPassed = score >= quiz.passingScore;
    const wrongQuestions = quiz.questions
      .map((q: any, idx: number) => ({
        index: idx,
        question: q.question,
        userAnswer: answers[idx] !== undefined ? q.options[parseInt(answers[idx])] : null,
        correctAnswer: q.options[q.correct_answer_index],
        isCorrect: parseInt(answers[idx]) === q.correct_answer_index,
      }))
      .filter((q: any) => !q.isCorrect);

    const correctCount = quiz.questions.length - wrongQuestions.length;

    const currentLevel = careerLevels?.find((l: any) => l.id === careerProgress?.currentCareerLevelId);
    const nextLevel = careerLevels?.find((l: any) => l.levelNumber === (currentLevel?.levelNumber || 0) + 1);
    const completedModuleCount = careerProgress?.completedModuleIds?.length || 0;
    const totalRequired = currentLevel?.requiredModuleIds?.length || 1;
    const progressPercent = Math.min(100, Math.round((completedModuleCount / totalRequired) * 100));

    const motivationalMessages = [
      "Her usta bir zamanlar amatördü. Tekrar dene!",
      "Hatalar, en iyi öğretmenlerdir.",
      "Azimle devam et, başarı yakın!",
      "Bir adım geri, iki adım ileri.",
      "Öğrenmek bir yolculuk, her deneme seni ileriye taşır.",
    ];
    const motivationMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    return (
      <div className="grid grid-cols-1 gap-3 p-3 max-w-2xl mx-auto">
        <Card className={isPassed ? "border-green-500/30" : "border-amber-500/30"}>
          <CardHeader className="text-center pb-2">
            {isPassed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Trophy className="w-12 h-12 text-green-500 animate-bounce" data-testid="icon-success" />
                  <Star className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1" />
                </div>
                <CardTitle className="text-lg" data-testid="text-result-title">Tebrikler!</CardTitle>
                <p className="text-sm text-muted-foreground">Quiz'i başarıyla tamamladın</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="w-12 h-12 text-amber-500" data-testid="icon-fail" />
                <CardTitle className="text-lg" data-testid="text-result-title">Biraz Daha Çalışmalısın</CardTitle>
                <p className="text-sm text-muted-foreground">Endişelenme, tekrar deneyebilirsin</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold mb-1" data-testid="text-quiz-score">{score}%</p>
              <Badge variant={isPassed ? "default" : "destructive"} className="text-xs" data-testid="badge-quiz-result">
                {isPassed ? "BAŞARILI" : "BAŞARISIZ"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-500/10 rounded-md">
                <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-correct-count">{correctCount}</p>
                <p className="text-xs text-muted-foreground">Doğru</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-md">
                <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-wrong-count">{wrongQuestions.length}</p>
                <p className="text-xs text-muted-foreground">Yanlış</p>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <p className="text-lg font-bold" data-testid="text-total-count">{quiz.questions.length}</p>
                <p className="text-xs text-muted-foreground">Toplam</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Geçme Notu: %{quiz.passingScore}</p>
              <div className="relative">
                <Progress value={score} className="h-2" />
                <div
                  className="absolute top-0 h-2 w-0.5 bg-foreground/50"
                  style={{ left: `${quiz.passingScore}%` }}
                />
              </div>
            </div>

            {completionTypeRef.current !== "normal" && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">
                  {completionTypeRef.current === "timeout" && "Süre dolduğu için sınav otomatik gönderildi."}
                  {completionTypeRef.current === "tab_switch" && "Sekme değişikliği nedeniyle sınav otomatik gönderildi."}
                  {completionTypeRef.current === "page_close" && "Sayfa kapatıldığı için sınav otomatik gönderildi."}
                  {completionTypeRef.current === "question_timeout" && "Son sorunun süresi dolduğu için sınav otomatik gönderildi."}
                </span>
              </div>
            )}

            {tabSwitchCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-md text-sm">
                <Eye className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-muted-foreground">
                  {tabSwitchCount} kez sekme değişikliği tespit edildi.
                </span>
              </div>
            )}

            {wrongQuestions.length > 0 && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-1 pt-3 px-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <CardTitle className="text-sm">Yanlış Cevaplanan Konular</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-1">
                  <div className="space-y-2" data-testid="list-wrong-topics">
                    {wrongQuestions.map((wq: any) => (
                      <div key={wq.index} className="flex items-start gap-2 text-sm p-2 bg-background rounded-md">
                        <span className="text-red-500 font-medium shrink-0">S{wq.index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{wq.question}</p>
                          <p className="text-muted-foreground mt-0.5">
                            Doğru: <span className="text-green-600 dark:text-green-400">{wq.correctAnswer}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isPassed && currentLevel && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Kariyer İlerlemen</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-muted-foreground">{currentLevel.titleTr || currentLevel.title}</span>
                    {nextLevel && (
                      <>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{nextLevel.titleTr || nextLevel.title}</span>
                      </>
                    )}
                  </div>
                  <div className="relative" data-testid="career-progress-bar">
                    <Progress value={progressPercent} className="h-2 transition-all duration-1000" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {completedModuleCount} / {totalRequired} modül tamamlandı
                  </p>
                </CardContent>
              </Card>
            )}

            {!isPassed && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Tekrar Deneme</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded-md">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">24 saat</strong> sonra tekrar deneyebilirsiniz
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Kullanılan deneme:</span>
                    <span className="font-medium">{attemptInfo?.attemptCount || 1} / {attemptInfo?.maxAttempts || 3}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-md">
                    <Flame className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground italic" data-testid="text-motivation">
                      {motivationMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {recommendation && (
              <Card className="bg-primary/10 dark:bg-blue-950 border-primary/30 dark:border-primary/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm">Yol Önerisi</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="w-full space-y-1">
                  <p className="text-sm">{recommendation.recommendation}</p>
                  <div className="flex items-center justify-between gap-2 mt-3 p-2 bg-white dark:bg-slate-900 rounded-md">
                    <div className="text-xs text-center">
                      <Badge variant="outline" className="bg-success/10 dark:bg-success/5 text-success dark:text-success">Kolay</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Tamamlandı</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-xs text-center">
                      <Badge variant="outline" className={recommendation.nextDifficulty === 'medium' ? "bg-warning/20 dark:bg-warning/5 text-warning dark:text-warning" : "bg-slate-100 dark:bg-slate-800"}>Orta</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{recommendation.nextDifficulty === 'medium' ? 'Sonraki' : 'Kilitli'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-xs text-center">
                      <Badge variant="outline" className={recommendation.nextDifficulty === 'hard' ? "bg-destructive/10 dark:bg-red-950 text-destructive dark:text-destructive" : "bg-slate-100 dark:bg-slate-800"}>Zor</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{recommendation.nextDifficulty === 'hard' ? 'Sonraki' : 'Kilitli'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              {isPassed && dailyRecommendation?.module ? (
                <>
                  <Link to="/akademi" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-back-academy">Akademi'ye Dön</Button>
                  </Link>
                  <Link to={`/akademi-quiz/${dailyRecommendation.module.quizId || dailyRecommendation.module.id}`} className="flex-1">
                    <Button className="w-full" data-testid="button-next-module">
                      Sonraki Modül
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </>
              ) : isPassed ? (
                <>
                  <Link to="/akademi" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-back-academy">Akademi'ye Dön</Button>
                  </Link>
                  <Link to="/akademi" className="flex-1">
                    <Button className="w-full" data-testid="button-continue">
                      <Trophy className="w-4 h-4 mr-1" />
                      Devam Et
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/akademi" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-back-academy">Akademi'ye Dön</Button>
                  </Link>
                  <Button variant="outline" className="flex-1" onClick={() => window.history.back()} data-testid="button-review-module">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Modülü Tekrar Çalış
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const question = quiz.questions[currentQuestion];
  const totalTimeCritical = totalTimeRemaining <= 60;
  const questionTimeCritical = questionTimeRemaining <= 10;

  return (
    <div className="grid grid-cols-1 gap-2 p-3 max-w-2xl mx-auto">
      {showTabWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="overlay-tab-warning">
          <Card className="max-w-sm w-full border-red-500/50">
            <CardContent className="p-6 text-center space-y-4">
              <EyeOff className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <p className="font-semibold text-base mb-1">Sekme Değişikliği Tespit Edildi!</p>
                <p className="text-sm text-muted-foreground">
                  Sınav sırasında sekme değiştirmeniz kayıt altına alındı.
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-md">
                <p className="text-2xl font-bold text-red-500" data-testid="text-tab-countdown">{tabWarningCountdown}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  saniye içinde sınavınız otomatik gönderilecek
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Uyarı sayısı: {tabSwitchCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <CardTitle className="text-sm">{quiz.title}</CardTitle>
            <div className="flex items-center gap-2">
              {tabSwitchCount > 0 && (
                <Badge variant="destructive" className="text-xs" data-testid="badge-tab-switch-count">
                  <Eye className="w-3 h-3 mr-0.5" />
                  {tabSwitchCount}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${totalTimeCritical ? "border-red-500 text-red-500" : ""}`}
                data-testid="badge-total-timer"
              >
                <Clock className="w-3 h-3 mr-0.5" />
                {formatTime(totalTimeRemaining)}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {currentQuestion + 1} / {quiz.questions.length}
            </p>
            <div className="flex items-center gap-1">
              <Timer className={`w-3 h-3 ${questionTimeCritical ? "text-red-500" : "text-muted-foreground"}`} />
              <span className={`text-xs font-mono ${questionTimeCritical ? "text-red-500 font-semibold" : "text-muted-foreground"}`} data-testid="text-question-timer">
                {questionTimeRemaining}s
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:gap-4">
          <div>
            <p className="text-sm font-medium mb-2">{question.question}</p>

            <RadioGroup value={answers[currentQuestion] || ""} onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })} className="flex flex-col gap-3">
              {question.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-3 p-3 border rounded-md hover-elevate text-sm min-h-[48px]" data-testid={`option-${idx}`}>
                  <RadioGroupItem value={idx.toString()} id={`option-${currentQuestion}-${idx}`} />
                  <Label htmlFor={`option-${currentQuestion}-${idx}`} className="flex-1 cursor-pointer text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-1 sticky bottom-0 bg-card py-2">
            {currentQuestion === quiz.questions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-1" data-testid="button-submit-quiz">
                {submitMutation.isPending ? "Gönderiliyor..." : "Bitir"}
              </Button>
            ) : (
              <Button onClick={advanceToNextQuestion} className="flex-1" data-testid="button-next-question">
                Sonraki
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
