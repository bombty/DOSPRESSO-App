import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, Zap, BookOpen, CheckCircle2, Circle, Lock, ArrowRight } from "lucide-react";
import { ArrowLeft, Loader } from "lucide-react";

export default function AcademyLearningPathDetail() {
  const { pathId } = useParams();
  const { user } = useAuth();

  const { data: pathDetail, isLoading } = useQuery({
    queryKey: ["/api/academy/learning-paths", pathId, user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/academy/learning-path-detail/${pathId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!pathId && !!user?.id,
  });

  const recommendedQuizzes = [
    { id: 1, title: "DOSPRESSO Temel Hizmet Bilgileri", difficulty: "easy", duration: 10, completion: 100, status: "completed" },
    { id: 2, title: "Espresso Çekme Teknikleri", difficulty: "medium", duration: 15, completion: 0, status: "recommended" },
    { id: 3, title: "Müşteri Hizmetleri İlkeleri", difficulty: "easy", duration: 12, completion: 0, status: "available" },
    { id: 4, title: "Barista Sertifikası", difficulty: "hard", duration: 20, completion: 0, status: "available" },
    { id: 5, title: "Yönetici Sorumluluğu", difficulty: "hard", duration: 25, completion: 0, status: "locked" },
  ];

  const pathTitle = pathId === "1" ? "Hızlı Kariyer Yolu" : pathId === "2" ? "Barista Ustası Yolu" : "Temel Beceriler Yolu";
  const totalCompletion = Math.round(recommendedQuizzes.reduce((sum, q) => sum + q.completion, 0) / recommendedQuizzes.length);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      $3div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          {pathTitle}
        </h1>
        <p className="text-muted-foreground mt-2">AI tarafından önerilen, sırayla öğrenilecek sınavlar</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yol İlerleme</CardTitle>
              <CardDescription>{totalCompletion}% tamamlandı</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={totalCompletion} className="h-3" />
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Tamamlanan</p>
                  <p className="font-bold text-lg">{recommendedQuizzes.filter(q => q.status === "completed").length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tavsiye Edilen</p>
                  <p className="font-bold text-lg">{recommendedQuizzes.filter(q => q.status === "recommended").length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kalan</p>
                  <p className="font-bold text-lg">{recommendedQuizzes.filter(q => q.status === "available").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Sequence */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Sırasıyla Öğren</h2>
            {recommendedQuizzes.map((quiz, idx) => (
              <Card 
                key={quiz.id} 
                className={`overflow-hidden ${
                  quiz.status === "completed" ? "opacity-75" : ""
                } ${quiz.status === "locked" ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-950 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {quiz.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {quiz.status === "recommended" && <Zap className="w-4 h-4 text-amber-600" />}
                            {quiz.status === "locked" && <Lock className="w-4 h-4 text-gray-400" />}
                            {(quiz.status === "available") && <Circle className="w-4 h-4 text-blue-600" />}
                            {quiz.title}
                          </h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {quiz.difficulty === "easy" && "🟢 Kolay"}
                              {quiz.difficulty === "medium" && "🟡 Orta"}
                              {quiz.difficulty === "hard" && "🔴 Zor"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">⏱️ {quiz.duration} min</Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          {quiz.status === "completed" && <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>}
                          {quiz.status === "recommended" && <Badge className="bg-amber-100 text-amber-800">Sırada</Badge>}
                          {quiz.status === "locked" && <Badge variant="outline">Kilitli</Badge>}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <Progress value={quiz.completion} className="h-2 mb-3" />

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mb-3">
                        {quiz.id === 1 && "DOSPRESSO'nun değerleri, ürünleri ve müşteri hizmet standartları"}
                        {quiz.id === 2 && "Profesyonel espresso çekme teknikleri ve sabırla hazırlama"}
                        {quiz.id === 3 && "Müşteri ihtiyaçlarını anlama ve memnuniyet sağlama"}
                        {quiz.id === 4 && "Barista sertifikaları ve uluslararası standartlar"}
                        {quiz.id === 5 && "Takım yönetimi, planlama ve özür vermek"}
                      </p>

                      {/* Action */}
                      <div className="flex gap-2">
                        {quiz.status === "completed" && (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Tekrar Al
                          </Button>
                        )}
                        {quiz.status === "recommended" && (
                          <Button size="sm">
                            <BookOpen className="w-3 h-3 mr-1" />
                            Şimdi Başla
                          </Button>
                        )}
                        {quiz.status === "available" && (
                          <Button size="sm" variant="outline">
                            <BookOpen className="w-3 h-3 mr-1" />
                            Başla
                          </Button>
                        )}
                        {quiz.status === "locked" && (
                          <Button size="sm" variant="outline" disabled>
                            <Lock className="w-3 h-3 mr-1" />
                            Kilitli
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    {idx < recommendedQuizzes.length - 1 && (
                      <div className="flex-shrink-0 hidden md:block">
                        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits Card */}
          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-base">Bu Yolun Faydaları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✓ Sırayla öğrenilerek bilgi birikimi maksimize edilir</p>
              <p>✓ Zor konulara geçmeden önce temel bilgiler pekiştirilir</p>
              <p>✓ Her başarılı quiz seni bir sonraki seviyeye taşır</p>
              <p>✓ Tahmini süre: {Math.round(recommendedQuizzes.reduce((sum, q) => sum + q.duration, 0) / 60)} saat</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
