import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader, ArrowRight, Zap, Lock, RefreshCw, Trophy, AlertTriangle } from "lucide-react";

type AttemptInfo = {
  attempts: any[];
  attemptCount: number;
  hasPassed: boolean;
  lastAttempt: any;
  canRetry: boolean;
  retryAvailableAt: string | null;
  maxAttempts: number;
};

export default function AcademyQuiz() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute("/akademi-quiz/:quizId");
  const quizId = params?.quizId;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showRetryInfo, setShowRetryInfo] = useState(false);

  // Fetch attempt info to check if retry is allowed
  const { data: attemptInfo, isLoading: attemptsLoading } = useQuery<AttemptInfo>({
    queryKey: [`/api/academy/quiz/${quizId}/attempts`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz/${quizId}/attempts`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!quizId,
  });

  // Fetch quiz questions from database
  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/academy/quiz/${quizId}/questions`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz/${quizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!quizId && (attemptInfo?.canRetry !== false || attemptInfo?.hasPassed),
  });

  // Fetch adaptive recommendation
  const { data: recommendation } = useQuery({
    queryKey: [`/api/academy/adaptive-recommendation/${quizId}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/adaptive-recommendation/${quizId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: submitted,
  });

  // Calculate remaining cooldown time
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

  // Quiz metadata
  const quiz = {
    id: quizId,
    title: "Espresso Hazırlama Teknikleri",
    description: "Profesyonel espresso hazırlamayı öğrenin",
    timeLimit: 1800, // 30 minutes in seconds
    passingScore: 70,
    questions: questions,
  };

  const submitMutation = useMutation({
    mutationFn: async (result: { quizId: string; score: number; answers: Record<number, string> }) => {
      return apiRequest("POST", "/api/academy/quiz-result", result);
    },
    onSuccess: () => {
      toast({ title: "Quiz tamamlandı", description: "Sonuçlarınız kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quiz-results"] });
    },
  });

  const handleSubmit = () => {
    // Calculate score
    let correctCount = 0;
    quiz.questions.forEach((q: any, idx: number) => {
      if (parseInt(answers[idx]) === q.correct_answer_index) {
        correctCount++;
      }
    });
    const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    // Submit result
    submitMutation.mutate({
      quizId: quizId || "",
      score: finalScore,
      answers,
    });
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

  // Show locked state if already passed
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

  // Show cooldown state if retry is not allowed
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
              <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
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
              <div className="flex items-center justify-center gap-2 p-2 bg-red-500/10 rounded-lg">
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

  if (submitted) {
    return (
      <div className="grid grid-cols-1 gap-2 p-3 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm">Quiz Tamamlandı</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {score >= quiz.passingScore ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
              <p className="text-3xl font-bold mb-1">{score}%</p>
              <Badge variant={score >= quiz.passingScore ? "default" : "destructive"} className="text-xs">
                {score >= quiz.passingScore ? "BAŞARILI" : "BAŞARISIZ"}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Gerekli: {quiz.passingScore}%</p>
              <Progress value={score} className="h-1" />
            </div>

            {/* Retry info for failed attempts */}
            {score < quiz.passingScore && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Tekrar Deneme</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    24 saat sonra tekrar deneyebilirsiniz. Quiz'i geçmek için en az %{quiz.passingScore} almanız gerekiyor.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Deneme:</span>
                    <span className="font-medium">{(attemptInfo?.attemptCount || 0) + 1} / {attemptInfo?.maxAttempts || 3}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adaptive Progression */}
            {recommendation && (
              <Card className="bg-primary/10 dark:bg-blue-950 border-primary/30 dark:border-primary/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-primary dark:text-primary" />
                    <CardTitle className="text-sm">Yol Önerisi</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="w-full space-y-1 md:space-y-1">
                  <p className="text-sm">{recommendation.recommendation}</p>
                  
                  {/* Difficulty Progression Path */}
                  <div className="flex items-center justify-between mt-3 p-2 bg-white dark:bg-slate-900 rounded-lg">
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
              <Link to="/akademi" className="flex-1">
                <Button variant="outline" className="w-full">Akademi'ye Dön</Button>
              </Link>
              {score >= quiz.passingScore && (
                <Button className="flex-1" onClick={() => window.history.back()}>
                  <Trophy className="w-4 h-4 mr-1" />
                  Devam Et
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const question = quiz.questions[currentQuestion];

  return (
    <div className="grid grid-cols-1 gap-2 p-3 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm">{quiz.title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-0.5" />
              30 dk
            </Badge>
          </div>
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-muted-foreground mt-1">
            {currentQuestion + 1} / {quiz.questions.length}
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:gap-4">
          <div>
            <p className="text-sm font-medium mb-2">{question.question}</p>

            <RadioGroup value={answers[currentQuestion] || ""} onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}>
              {question.options.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted text-xs" data-testid={`option-${idx}`}>
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} className="h-8">
              Önceki
            </Button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button size="sm" onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-1 h-8">
                {submitMutation.isPending ? "Gönderiliyor..." : "Bitir"}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCurrentQuestion(currentQuestion + 1)} className="flex-1 h-8">
                Sonraki
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
