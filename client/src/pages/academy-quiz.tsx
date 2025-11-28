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
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function AcademyQuiz() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute("/akademi-quiz/:quizId");
  const quizId = params?.quizId;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Mock quiz data
  const quiz = {
    id: quizId,
    title: "Espresso Hazırlama Teknikleri",
    description: "Profesyonel espresso hazırlamayı öğrenin",
    timeLimit: 1800, // 30 minutes in seconds
    passingScore: 70,
    questions: [
      {
        id: 1,
        question: "Ideal espresso çekim süresi kaç saniyedir?",
        options: ["15-20 saniye", "25-30 saniye", "35-40 saniye", "45+ saniye"],
        correctAnswer: 1,
      },
      {
        id: 2,
        question: "Espresso makinesi basıncı kaç bar olmalıdır?",
        options: ["5 bar", "7 bar", "9 bar", "12 bar"],
        correctAnswer: 2,
      },
      {
        id: 3,
        question: "Su sıcaklığı kaç derece olmalıdır?",
        options: ["85°C", "90°C", "92-96°C", "100°C"],
        correctAnswer: 2,
      },
    ],
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
    quiz.questions.forEach((q, idx) => {
      if (parseInt(answers[idx]) === q.correctAnswer) {
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

  if (submitted) {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Quiz Tamamlandı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div>
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
            <p className="text-lg font-medium mb-4">{question.question}</p>

            <RadioGroup value={answers[currentQuestion] || ""} onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}>
              {question.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
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
