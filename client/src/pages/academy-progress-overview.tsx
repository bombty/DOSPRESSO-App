import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Target, Zap, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2 mb-2">
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
      <div>
        <h1 className="text-lg font-bold tracking-tight">İlerleme Özeti</h1>
        <p className="text-xs text-muted-foreground mt-1">Başarılar ve hedefleriniz</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {metrics.map((m, idx) => (
          <Card key={idx}>
            <CardContent className="pt-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Milestones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Target className="w-4 h-4" />
            Hedefler
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2">
          {nextMilestones.map((m, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{m.stage}</span>
                <span className="text-muted-foreground">{m.progress}%</span>
              </div>
              <Progress value={m.progress} className="h-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Personalized Recommendations */}
      <div className="grid grid-cols-1 gap-1">
        <h2 className="text-sm font-semibold flex items-center gap-1">
          <Zap className="w-4 h-4" />
          Öneriler
        </h2>
        {recommendations.map((rec, idx) => (
          <Card key={idx} className="hover-elevate">
            <CardContent className="p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{rec.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{rec.description}</p>
                </div>
                <Link to="/akademi-learning-paths">
                  <Button size="sm" variant="outline" className="h-7 text-xs">{rec.action}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Son Aktiviteler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">Barista Rozeti Kazandı</p>
                <p className="text-xs text-muted-foreground">2 gün önce</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">Zor Sınav Tamamlandı</p>
                <p className="text-xs text-muted-foreground">5 gün önce</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-950">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold mb-0.5">Sıradaki: Supervisor Buddy Sınavı</h3>
              <p className="text-xs text-muted-foreground">Takım yönetimi öğren</p>
            </div>
            <Link to="/akademi-learning-paths">
              <Button size="sm" className="h-8">
                <TrendingUp className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
