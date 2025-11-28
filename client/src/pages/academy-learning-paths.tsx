import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, Zap, Target } from "lucide-react";
import { ArrowLeft, Loader } from "lucide-react";
import { Link } from "wouter";

export default function AcademyLearningPaths() {
  const { user } = useAuth();

  const { data: learningPaths = [], isLoading } = useQuery({
    queryKey: ["/api/academy/learning-paths", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/academy/learning-paths", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const paths = [
    {
      id: 1,
      title: "Hızlı Kariyer Yolu",
      description: "Supervisor olmak için en etkili sınavları seçer",
      duration: "4 hafta",
      difficulty: "Orta",
      quizzes: 12,
      completion: 35,
      color: "from-blue-100 to-blue-50",
    },
    {
      id: 2,
      title: "Barista Ustası Yolu",
      description: "Espresso ve kahve hazırlama konusunda derinlemesine",
      duration: "6 hafta",
      difficulty: "Yüksek",
      quizzes: 18,
      completion: 15,
      color: "from-amber-100 to-amber-50",
    },
    {
      id: 3,
      title: "Temel Beceriler Yolu",
      description: "DOSPRESSO'nun temel işletme ve hizmet kuralları",
      duration: "2 hafta",
      difficulty: "Kolay",
      quizzes: 8,
      completion: 62,
      color: "from-green-100 to-green-50",
    },
  ];

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
          AI Öğrenme Yolları
        </h1>
        <p className="text-muted-foreground mt-2">Yapay zekanın önerdiği, kişiselleştirilmiş eğitim rotaları</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paths.map((path) => (
            <Card key={path.id} className={`bg-gradient-to-br ${path.color} overflow-hidden`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <CardTitle className="text-base">{path.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">{path.description}</CardDescription>
                  </div>
                  <Brain className="w-5 h-5 text-purple-600 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">⏱️ {path.duration}</Badge>
                  <Badge variant="outline" className="text-xs">📊 {path.difficulty}</Badge>
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium">İlerleme</span>
                    <span className="text-muted-foreground">{path.completion}%</span>
                  </div>
                  <Progress value={path.completion} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <p className="text-muted-foreground">Toplam Sınav</p>
                    <p className="font-bold text-base">{path.quizzes}</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <p className="text-muted-foreground">Tahmini Süre</p>
                    <p className="font-bold">{path.duration}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/akademi-learning-path/${path.id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="outline">
                      Ayrıntıları Gör
                    </Button>
                  </Link>
                  <Link href={`/akademi-learning-path/${path.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      <Zap className="w-3 h-3 mr-1" />
                      Başla
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Kişiselleştirmesi Nasıl Çalışır?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>🧠 Yapay zeka, geçmiş quiz sonuçlarını analiz eder</p>
          <p>🎯 Zayıf alanları belirler ve iyileştirme için quizler önerir</p>
          <p>⚡ En etkili öğrenme sırasını dinamik olarak ayarlar</p>
          <p>📈 İlerlemeye göre zorluk seviyesini otomatik artırır</p>
        </CardContent>
      </Card>
    </div>
  );
}
