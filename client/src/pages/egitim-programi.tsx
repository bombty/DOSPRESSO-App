import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Loader2, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";

const TRAINING_TOPICS: Record<string, string> = {
  "franchise-yonetimi": "Franchise Yönetimi",
  "performans-analizi": "Performans Analizi",
  "kriz-yonetimi": "Kriz Yönetimi",
  "tedarik-zinciri": "Tedarik Zinciri",
  "maliyet-analizi": "Maliyet Analizi",
  "tedarikci-iliskileri": "Tedarikçi İlişkileri",
  "finansal-raporlama": "Finansal Raporlama",
  "vergi-mevzuat": "Vergi & Mevzuat",
  "butce-planlama": "Bütçe Planlama",
  "ekipman-bakim": "Ekipman Bakım",
  "yeni-teknolojiler": "Yeni Teknolojiler",
  "problem-cozme": "Problem Çözme",
  "uretim-planlama": "Üretim Planlama",
  "kalite-kontrol": "Kalite Kontrol",
};

const ROLE_TOPICS: Record<string, string[]> = {
  coach: ["franchise-yonetimi", "performans-analizi", "kriz-yonetimi"],
  satinalma: ["tedarik-zinciri", "maliyet-analizi", "tedarikci-iliskileri"],
  muhasebe: ["finansal-raporlama", "vergi-mevzuat", "butce-planlama"],
  teknik: ["ekipman-bakim", "yeni-teknolojiler", "problem-cozme"],
  fabrika: ["uretim-planlama", "kalite-kontrol"],
};

interface Lesson {
  id: number;
  topicId: string;
  lessonIndex: number;
  title: string;
  content: string;
  duration: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-lg font-semibold mt-4 mb-2">{line.replace("## ", "")}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-base font-semibold mt-3 mb-1">{line.replace("### ", "")}</h3>);
    } else if (line.startsWith("- ")) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-4 my-0.5">
          <span className="text-muted-foreground mt-1 shrink-0">&#8226;</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace("- ", "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 ml-4 my-0.5">
            <span className="text-muted-foreground font-medium shrink-0">{match[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: match[2].replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      );
    }
  }
  return elements;
}

export default function EgitimProgrami() {
  const params = useParams<{ topicId: string }>();
  const topicId = params.topicId || "";
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);

  const topicTitle = TRAINING_TOPICS[topicId] || "Bilinmeyen Konu";

  const hasAccess = user && (
    user.role === "admin" ||
    user.role === "yatirimci_hq" ||
    (ROLE_TOPICS[user.role] && ROLE_TOPICS[user.role].includes(topicId))
  );

  const lessonsQuery = useQuery<{ lessons: Lesson[]; topicTitle: string }>({
    queryKey: ["/api/training-program", topicId, "lessons"],
    enabled: !!topicId && !!hasAccess,
  });

  const progressQuery = useQuery<{ completedLessons: number[]; quizScore: number | null; quizPassed: boolean | null }>({
    queryKey: ["/api/training-program", topicId, "progress"],
    enabled: !!topicId && !!hasAccess,
  });

  const quizQuery = useQuery<{ questions: QuizQuestion[] }>({
    queryKey: ["/api/training-program", topicId, "quiz"],
    enabled: showQuiz && !!topicId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/training-program/${topicId}/generate-lessons`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-program", topicId, "lessons"] });
    },
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (lessonIndex: number) => {
      await apiRequest("POST", `/api/training-program/${topicId}/lesson/${lessonIndex}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-program", topicId, "progress"] });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      const res = await apiRequest("POST", `/api/training-program/${topicId}/quiz/submit`, { answers });
      return res.json();
    },
    onSuccess: (data) => {
      setQuizResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/training-program", topicId, "progress"] });
    },
  });

  const lessons = lessonsQuery.data?.lessons || [];
  const completedLessons = progressQuery.data?.completedLessons || [];
  const allLessonsCompleted = lessons.length > 0 && completedLessons.length >= lessons.length;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-no-access">Bu eğitime erişim yetkiniz bulunmamaktadır</h2>
            <p className="text-muted-foreground mb-4">Bu eğitim programı rolünüze atanmamış.</p>
            <Button onClick={() => setLocation("/personel-profil")} data-testid="button-back-profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Profile Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmitQuiz = () => {
    const questions = quizQuery.data?.questions || [];
    const answers = questions.map((_, i) => quizAnswers[i] ?? -1);
    submitQuizMutation.mutate(answers);
  };

  const handleRetryQuiz = () => {
    setQuizResult(null);
    setQuizAnswers({});
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/personel-profil")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Geri
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <GraduationCap className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl" data-testid="text-topic-title">{topicTitle}</CardTitle>
            {user && <Badge variant="secondary" data-testid="badge-role">{user.role}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="text-progress-count">
              {completedLessons.length}/{lessons.length} ders tamamlandı
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" data-testid="progress-bar" />
          <p className="text-xs text-muted-foreground mt-1">%{progressPercent} tamamlandı</p>
        </CardContent>
      </Card>

      {lessonsQuery.isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Dersler yükleniyor...</p>
          </CardContent>
        </Card>
      )}

      {!lessonsQuery.isLoading && lessons.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Henüz ders içeriği oluşturulmamış</h3>
            <p className="text-muted-foreground mb-4">
              AI destekli ders içeriklerini oluşturmak için aşağıdaki butona tıklayın.
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-lessons"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ders İçeriklerini Oluştur
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {lessons.length > 0 && (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const isCompleted = completedLessons.includes(lesson.lessonIndex);
            const isExpanded = expandedLesson === lesson.lessonIndex;

            return (
              <Card key={lesson.id} data-testid={`card-lesson-${lesson.lessonIndex}`}>
                <div
                  className="flex items-center justify-between gap-2 p-4 cursor-pointer"
                  onClick={() => setExpandedLesson(isExpanded ? null : lesson.lessonIndex)}
                  data-testid={`button-expand-lesson-${lesson.lessonIndex}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-muted"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">{lesson.lessonIndex + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate" data-testid={`text-lesson-title-${lesson.lessonIndex}`}>
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.duration} dk</span>
                        {isCompleted && <Badge variant="secondary" className="text-xs">Tamamlandı</Badge>}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="prose prose-sm dark:prose-invert max-w-none py-4 text-sm leading-relaxed" data-testid={`content-lesson-${lesson.lessonIndex}`}>
                      {renderMarkdown(lesson.content)}
                    </div>
                    {!isCompleted && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeLessonMutation.mutate(lesson.lessonIndex);
                          }}
                          disabled={completeLessonMutation.isPending}
                          data-testid={`button-complete-lesson-${lesson.lessonIndex}`}
                        >
                          {completeLessonMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Tamamla
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {progressQuery.data?.quizPassed && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400" data-testid="text-quiz-passed">
              Tebrikler! Sınavı geçtiniz.
            </h3>
            <p className="text-muted-foreground">Puan: %{progressQuery.data.quizScore}</p>
          </CardContent>
        </Card>
      )}

      {allLessonsCompleted && !showQuiz && !progressQuery.data?.quizPassed && (
        <Card>
          <CardContent className="p-6 text-center">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Tüm dersler tamamlandı!</h3>
            <p className="text-muted-foreground mb-4">Şimdi bilginizi test etmek için sınava girebilirsiniz.</p>
            <Button onClick={() => setShowQuiz(true)} data-testid="button-start-quiz">
              <GraduationCap className="w-4 h-4 mr-2" />
              Sınava Gir
            </Button>
          </CardContent>
        </Card>
      )}

      {showQuiz && !quizResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {topicTitle} - Sınav
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quizQuery.isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Sınav soruları hazırlanıyor...</p>
              </div>
            ) : quizQuery.data?.questions ? (
              <>
                {quizQuery.data.questions.map((q, qIndex) => (
                  <div key={qIndex} className="space-y-3" data-testid={`quiz-question-${qIndex}`}>
                    <p className="font-medium text-sm">
                      {qIndex + 1}. {q.question}
                    </p>
                    <RadioGroup
                      value={quizAnswers[qIndex]?.toString()}
                      onValueChange={(val) => setQuizAnswers(prev => ({ ...prev, [qIndex]: parseInt(val) }))}
                    >
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={oIndex.toString()}
                            id={`q${qIndex}-o${oIndex}`}
                            data-testid={`radio-q${qIndex}-o${oIndex}`}
                          />
                          <Label htmlFor={`q${qIndex}-o${oIndex}`} className="text-sm cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={submitQuizMutation.isPending || Object.keys(quizAnswers).length < (quizQuery.data?.questions?.length || 0)}
                    data-testid="button-submit-quiz"
                  >
                    {submitQuizMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Sınavı Gönder
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {quizResult && (
        <Card className={quizResult.passed ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
          <CardContent className="p-6 text-center">
            {quizResult.passed ? (
              <>
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400" data-testid="text-quiz-result-passed">
                  Tebrikler! Sınavı geçtiniz.
                </h3>
              </>
            ) : (
              <>
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400" data-testid="text-quiz-result-failed">
                  Maalesef sınavı geçemediniz.
                </h3>
              </>
            )}
            <p className="text-muted-foreground mt-2" data-testid="text-quiz-score">
              Puan: %{quizResult.score} ({quizResult.correct}/{quizResult.total} doğru)
            </p>
            {!quizResult.passed && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">Dersleri tekrar gözden geçirip yeniden deneyebilirsiniz.</p>
                <Button variant="outline" onClick={handleRetryQuiz} data-testid="button-retry-quiz">
                  Tekrar Deneyin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}