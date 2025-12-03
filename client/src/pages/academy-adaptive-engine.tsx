import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, Zap, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
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
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-2 col-span-full">
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
      <div className="col-span-full">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          Uyarlanabilir Öğrenme
        </h1>
        <p className="text-xs text-muted-foreground mt-1">AI-güçlendirilen kişiselleştirilmiş yollar</p>
      </div>

      {/* Learning Path Recommendations */}
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Zap className="w-4 h-4 text-warning" />
            Önerilen Yollar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:gap-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, idx: number) => (
              <div key={idx} className="p-2 border rounded-lg space-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{rec.pathName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {rec.priority === "high" ? "Yüksek" : "Önerilen"}
                  </Badge>
                </div>
                <div className="w-full space-y-1 md:space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tahmini</span>
                    <span className="font-medium">{rec.completionPercent}%</span>
                  </div>
                  <Progress value={rec.completionPercent} className="h-1" />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-muted-foreground">{rec.estimatedDays}g</span>
                </div>
                <Link href={`/akademi-learning-path/${rec.pathId}`}>
                  <Button size="sm" variant="outline" className="w-full text-xs h-8">
                    Başlat
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
      <Card className="col-span-full bg-primary/10 dark:bg-blue-950 border-primary/30 dark:border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Öğrenme Stiliniz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Zorluk</p>
              <p className="text-sm font-semibold mt-0.5">Orta</p>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Performans</p>
              <p className="text-sm font-semibold mt-0.5">Quizler</p>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Hız</p>
              <p className="text-sm font-semibold mt-0.5">Normal</p>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Güçlü</p>
              <p className="text-sm font-semibold mt-0.5">Teknik</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adaptive Tips */}
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Adaptif İpuçları</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-1 text-xs">
          <p>✓ Zorluk otomatik ayarlanır</p>
          <p>✓ Zayıf alanlar önerilir</p>
          <p>✓ Başarı teşvik eder</p>
        </CardContent>
      </Card>
    </div>
  );
}
