import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Flame, Target, Zap, Star, Lock, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACHIEVEMENTS = [
  {
    id: 1,
    name: "İlk Adım",
    description: "İlk sınavını tamamla",
    icon: Star,
    requirement: 1,
    type: "quizzes",
    color: "from-blue-100 to-blue-50",
  },
  {
    id: 2,
    name: "Quiz Uzmanı",
    description: "10 sınav tamamla",
    icon: Zap,
    requirement: 10,
    type: "quizzes",
    color: "from-purple-100 to-purple-50",
  },
  {
    id: 3,
    name: "Mükemmel Skoru",
    description: "100 puan al",
    icon: Trophy,
    requirement: 100,
    type: "score",
    color: "from-yellow-100 to-yellow-50",
  },
  {
    id: 4,
    name: "Hızlı Öğrenci",
    description: "5 günde 5 sınav tamamla",
    icon: Flame,
    requirement: 5,
    type: "streak",
    color: "from-red-100 to-red-50",
  },
  {
    id: 5,
    name: "Barista Ustası",
    description: "Barista seviyesine ulaş",
    icon: Target,
    requirement: 3,
    type: "level",
    color: "from-green-100 to-green-50",
  },
  {
    id: 6,
    name: "Lider",
    description: "Leaderboard'da ilk 10'da ol",
    icon: Trophy,
    requirement: 10,
    type: "leaderboard",
    color: "from-indigo-100 to-indigo-50",
  },
];

export default function AcademyAchievements() {
  const { user } = useAuth();

  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ["/api/academy/achievement-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const res = await fetch(`/api/academy/achievement-stats/${user.id}`, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!user?.id,
  });

  const getProgress = (achievement: any) => {
    let current = 0;
    if (achievement.type === "quizzes") current = stats.completedQuizzes || 0;
    if (achievement.type === "score") current = stats.maxScore || 0;
    if (achievement.type === "streak") current = stats.currentStreak || 0;
    if (achievement.type === "level") current = stats.currentLevel || 0;
    if (achievement.type === "leaderboard") current = stats.leaderboardRank || 999;
    return Math.min(100, Math.round((current / achievement.requirement) * 100));
  };

  const isUnlocked = (achievement: any) => getProgress(achievement) >= 100;
  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          Başarılar
        </h1>
        <p className="text-muted-foreground mt-2">Mileleri aşarak özel başarıları kilidi aç</p>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Başarı Özeti</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{unlockedCount}</p>
            <p className="text-xs text-muted-foreground">Açıldı</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-500">{ACHIEVEMENTS.length - unlockedCount}</p>
            <p className="text-xs text-muted-foreground">Kilitli</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%</p>
            <p className="text-xs text-muted-foreground">Tamamlandı</p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map((achievement) => {
          const Icon = achievement.icon;
          const progress = getProgress(achievement);
          const unlocked = isUnlocked(achievement);

          return (
            <Card
              key={achievement.id}
              className={`relative overflow-hidden transition-all ${
                unlocked
                  ? `bg-gradient-to-br ${achievement.color}`
                  : "opacity-60 bg-slate-100 dark:bg-slate-900"
              }`}
            >
              {/* Lock overlay */}
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{achievement.name}</h3>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Icon className={`w-6 h-6 flex-shrink-0 ${unlocked ? "text-amber-500" : "text-gray-400"}`} />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">İlerleme</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {unlocked && (
                  <Badge className="w-full justify-center bg-green-500 hover:bg-green-600">
                    ✓ Açıldı
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Başarıları Nasıl Açarsın?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>🎯 Düzenli olarak sınavlara katıl - her sınav ilerlemenizi arttırır</p>
          <p>⭐ Mükemmel puanlar almaya çalış - 100 puan başarısını açmak mümkün</p>
          <p>🔥 Tutarlı kal - haftada birden fazla sınav tamamla</p>
          <p>🏆 Kariyeri ilerlet - her seviyeye ulaştığında yeni başarılar açılır</p>
        </CardContent>
      </Card>
    </div>
  );
}
