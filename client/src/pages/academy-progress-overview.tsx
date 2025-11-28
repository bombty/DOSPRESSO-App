import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Zap, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function AcademyProgressOverview() {
  const { user } = useAuth();

  const { data: progress = {} } = useQuery({
    queryKey: ["/api/academy/progress-overview", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const res = await fetch(`/api/academy/progress-overview/${user.id}`, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!user?.id,
  });

  const metrics = [
    { label: "Kariyer Seviyesi", value: "Barista", color: "text-green-600" },
    { label: "Tamamlanan Sınavlar", value: "24", color: "text-blue-600" },
    { label: "Ortalama Puan", value: "82.5", color: "text-purple-600" },
    { label: "Başarı Rozeti", value: "4/6", color: "text-amber-600" },
  ];

  const nextMilestones = [
    { stage: "Supervisor Buddy", progress: 65, quizzes: "3/5 tamamlandı" },
    { stage: "Quiz Uzmanı", progress: 70, quizzes: "7/10 tamamlandı" },
    { stage: "Mükemmel Skor", progress: 45, quizzes: "1/3 mükemmel" },
  ];

  const recommendations = [
    { title: "Barista Ustası Yolu", description: "İleri seviye espresso teknikleri", action: "Başla" },
    { title: "Zor Sınavlar", description: "En zor soruları çöz ve kendini geliştir", action: "Dene" },
    { title: "Takım Yarışması", description: "Bu ayın rakamları: 2. sıradesin", action: "Katıl" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">İlerleme Özeti</h1>
        <p className="text-muted-foreground mt-2">Tüm başarılarınızı ve hedeflerinizi bir yerde görün</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Yaklaşan Hedefler
          </CardTitle>
          <CardDescription>Sıradaki başarı rozeti seçin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextMilestones.map((m, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{m.stage}</span>
                <span className="text-muted-foreground">{m.progress}%</span>
              </div>
              <Progress value={m.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{m.quizzes}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Personalized Recommendations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5" />
          AI Önerileri
        </h2>
        {recommendations.map((rec, idx) => (
          <Card key={idx} className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Link to="/akademi-learning-paths">
                  <Button size="sm" variant="outline">{rec.action}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Son Aktiviteler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Barista Rozeti Kazandı</p>
                <p className="text-xs text-muted-foreground">2 gün önce</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Zor Seviye Sınavı Tamamlandı</p>
                <p className="text-xs text-muted-foreground">5 gün önce - 88 puan</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Supervisor Buddy Sınavını Geç Aldı</p>
                <p className="text-xs text-muted-foreground">1 hafta önce - Bekleniyor</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-950">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Sıradaki Adım: Supervisor Buddy Sınavı</h3>
              <p className="text-sm text-muted-foreground">Takım yönetimi ve özür verme tekniklerini öğren</p>
            </div>
            <Link to="/akademi-learning-paths">
              <Button>
                <TrendingUp className="w-4 h-4 mr-2" />
                Devam Et
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
