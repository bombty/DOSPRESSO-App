import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function AcademyAdaptiveEngine() {
  const { user } = useAuth();

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/academy/adaptive-recommendations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/academy/adaptive-recommendations/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-500" />
          Uyarlanabilir Öğrenme Motoru
        </h1>
        <p className="text-muted-foreground mt-2">AI-güçlendirme yapılan kişiselleştirilmiş öğrenme yolları</p>
      </div>

      {/* Learning Path Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Önerilen Öğrenme Yolları
          </CardTitle>
          <CardDescription>Performansınıza göre AI tarafından özelleştirilmiş</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{rec.pathName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                  <Badge variant={rec.priority === "high" ? "default" : "secondary"}>
                    {rec.priority === "high" ? "Yüksek Öncelik" : "Önerilen"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tahmini Tamamlanma</span>
                    <span className="font-medium">{rec.completionPercent}%</span>
                  </div>
                  <Progress value={rec.completionPercent} className="h-2" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Tahmini Süre: {rec.estimatedDays} gün</span>
                </div>
                <Link href={`/akademi-learning-path/${rec.pathId}`}>
                  <Button size="sm" variant="outline" className="w-full">
                    Yolu Başlat
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">Henüz öneri yok. Sınavlar çözerek başlayın!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Style Analysis */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Öğrenme Stiliniz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Tercih Edilen Zorluk</p>
              <p className="text-lg font-semibold mt-1">Orta Seviye</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground">En İyi Performans</p>
              <p className="text-lg font-semibold mt-1">Quizler</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Öğrenme Hızı</p>
              <p className="text-lg font-semibold mt-1">Normal</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground">Güç Alanlar</p>
              <p className="text-lg font-semibold mt-1">Teknik</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adaptive Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adaptif Öğrenme İpuçları</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>✓ Performansınıza göre zorluk otomatik ayarlanır</p>
          <p>✓ Zayıf alanlar daha fazla pratik için önerilir</p>
          <p>✓ Başarı hızlı öğrenme teşvik eder</p>
          <p>✓ AI sürekli öğrenme stilinizi analiz eder</p>
        </CardContent>
      </Card>
    </div>
  );
}
