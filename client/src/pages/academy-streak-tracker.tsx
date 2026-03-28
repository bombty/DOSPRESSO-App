import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Calendar, Target, Trophy, Loader, Zap, Star, Crown } from "lucide-react";

export default function AcademyStreakTracker() {
  const { user } = useAuth();

  const { data: streak = {} } = useQuery({
    queryKey: ["/api/academy/streak-tracker", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const res = await fetch(`/api/academy/streak-tracker/${user.id}`, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!user?.id,
  });

  const streakDays = streak.currentStreak || 0;
  const bestStreak = streak.bestStreak || 0;
  const totalActiveDays = streak.totalActiveDays || 0;
  const weeklyGoalTarget = streak.weeklyGoalTarget || 5;
  const weeklyGoalProgress = streak.weeklyGoalProgress || 0;
  const totalXp = streak.totalXp || 0;
  const lastActivityDate = streak.lastActivityDate || streak.lastActivityDay || null;
  const lastActivityDay = lastActivityDate
    ? new Date(lastActivityDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : "Henüz yok";

  const activityDays = (() => {
    const days = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const daysFromToday = i;
      const isActive = lastActivityDate
        ? daysFromToday < streakDays && dateStr <= todayStr
        : false;
      days.push({
        date: date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
        isActive,
        dayOfWeek: date.getDay(),
      });
    }
    return days;
  })();

  const streakMilestones = [
    { days: 7, label: "Hafta", IconComponent: Flame, unlocked: streakDays >= 7 },
    { days: 14, label: "2 Hafta", IconComponent: Star, unlocked: streakDays >= 14 },
    { days: 30, label: "Ay", IconComponent: Trophy, unlocked: streakDays >= 30 },
    { days: 100, label: "100 Gün", IconComponent: Crown, unlocked: streakDays >= 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      <div className="flex items-center gap-2">
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
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Flame className="w-5 h-5 text-warning" />
          Öğrenme Serisi
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Tutarlılık seni başarıya götürür</p>
      </div>

      {/* Main Streak Card */}
      <Card className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-950 border-warning/30 dark:border-warning/40">
        <CardContent className="p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-7 h-7 text-warning animate-pulse" />
            <div>
              <p className="text-2xl font-bold text-warning">{streakDays}</p>
              <p className="text-xs text-muted-foreground">Gün</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Son: {lastActivityDay}</p>
          {streakDays > 0 ? (
            <p className="text-success text-xs font-semibold">✓ Bugünü tamamladın!</p>
          ) : (
            <p className="text-warning text-xs font-semibold">Sınav al</p>
          )}
        </CardContent>
      </Card>

      {/* Best Streak & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              En İyi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-warning">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">gün</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Target className="w-3 h-3" />
              Haftalık Hedef
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-primary">{weeklyGoalProgress}/{weeklyGoalTarget}</p>
            <p className="text-xs text-muted-foreground">gün</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Toplam XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{totalXp}</p>
            <p className="text-xs text-muted-foreground">puan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Toplam Aktif Gün
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{totalActiveDays}</p>
            <p className="text-xs text-muted-foreground">gün</p>
          </CardContent>
        </Card>
      </div>

      {/* Streak Milestones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Başarı Mileleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {streakMilestones.map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg text-center border transition-all ${
                  m.unlocked
                    ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900 dark:to-amber-950 border-amber-300 dark:border-warning/40"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60"
                }`}
              >
                <m.IconComponent className={`w-5 h-5 mb-0.5 ${m.unlocked ? 'text-warning' : 'text-muted-foreground'}`} />
                <p className="text-xs font-semibold">{m.days}g</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Activity Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Son 30 Gün
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0.5">
            {activityDays.map((day, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all hover-elevate ${
                  day.isActive
                    ? "bg-success/100 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-muted-foreground"
                }`}
                title={day.date}
              >
                {idx % 7 === 0 && <span className="text-xs">P</span>}
                {idx % 7 === 1 && <span className="text-xs">S</span>}
                {idx % 7 === 2 && <span className="text-xs">Ç</span>}
                {idx % 7 === 3 && <span className="text-xs">P</span>}
                {idx % 7 === 4 && <span className="text-xs">C</span>}
                {idx % 7 === 5 && <span className="text-xs">C</span>}
                {idx % 7 === 6 && <span className="text-xs">P</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Motivation Card */}
      <Card className="bg-primary/10 dark:bg-blue-950 border-primary/30 dark:border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">Seri Hakkında İpuçları</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-warning shrink-0" /><span>Her gün en az bir sınav tamamla</span></div>
          <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-warning shrink-0" /><span>30 günlük seriyi tuttuğunda özel rozet kazan</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary shrink-0" /><span>Aynı saatte pratik yapmak alışkanlık oluşturur</span></div>
          <div className="flex items-center gap-2"><Star className="w-4 h-4 text-primary shrink-0" /><span>Seri kırılırsa endişelenme - yeniden başlamak hiç geç değil!</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
