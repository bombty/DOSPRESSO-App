import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader, ArrowRight, Zap } from "lucide-react";

export default function AcademyQuiz() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute("/akademi-quiz/:quizId");
  const quizId = params?.quizId;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch quiz questions from database
  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/academy/quiz/${quizId}/questions`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz/${quizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!quizId,
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
      if (parseInt(answers[idx]) === q.correctAnswerIndex) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Soru yükleniyor...</p>
        </div>
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
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Quiz Tamamlandı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {score >= quiz.passingScore ? (
                  <CheckCircle className="w-12 h-12 text-green-500" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500" />
                )}
              </div>
              <p className="text-5xl font-bold mb-2">{score}%</p>
              <Badge variant={score >= quiz.passingScore ? "default" : "destructive"}>
                {score >= quiz.passingScore ? "BAŞARILI" : "BAŞARISIZ"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Gerekli puan: {quiz.passingScore}%</p>
              <Progress value={score} className="h-2" />
            </div>

            {/* Adaptive Progression */}
            {recommendation && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-base">Uyarlanabilir Yol Önerisi</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{recommendation.recommendation}</p>
                  
                  {/* Difficulty Progression Path */}
                  <div className="flex items-center justify-between mt-3 p-2 bg-white dark:bg-slate-900 rounded-lg">
                    <div className="text-xs text-center">
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200">Kolay</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Tamamlandı</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-xs text-center">
                      <Badge variant="outline" className={recommendation.nextDifficulty === 'medium' ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200" : "bg-slate-100 dark:bg-slate-800"}>Orta</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{recommendation.nextDifficulty === 'medium' ? 'Sonraki' : 'Kilitli'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-xs text-center">
                      <Badge variant="outline" className={recommendation.nextDifficulty === 'hard' ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200" : "bg-slate-100 dark:bg-slate-800"}>Zor</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{recommendation.nextDifficulty === 'hard' ? 'Sonraki' : 'Kilitli'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={() => window.history.back()}>Geri Dön</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const question = quiz.questions[currentQuestion];

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{quiz.title}</CardTitle>
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              30 dk
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Soru {currentQuestion + 1} / {quiz.questions.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <p className="text-lg font-medium mb-4">{question.questionText}</p>

            <RadioGroup value={answers[currentQuestion] || ""} onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}>
              {question.options.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted" data-testid={`option-${idx}`}>
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
              Önceki
            </Button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-1">
                {submitMutation.isPending ? "Gönderiliyor..." : "Bitir"}
              </Button>
            ) : (
              <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="flex-1">
                Sonraki
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
