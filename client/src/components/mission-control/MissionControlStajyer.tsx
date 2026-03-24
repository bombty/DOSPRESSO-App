import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { DashboardKpiStrip, type KpiItem } from "@/components/dashboard-kpi-strip";
import { CareerRoadmap } from "./shared/CareerRoadmap";
import { LearningStreak } from "./shared/LearningStreak";
import { ModuleCard, type ModuleInfo } from "./shared/ModuleCard";
import { BadgeGrid, type BadgeItem } from "./shared/BadgeGrid";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { Link } from "wouter";
import {
  GraduationCap,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle2,
  Flame,
  Award,
  BookOpen,
  Target,
  Calendar,
} from "lucide-react";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BaristaQuickActions } from "@/components/mobile/BaristaQuickActions";

function getGreetingMessage(streak: number, firstName: string): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Günaydın" : hour < 17 ? "İyi günler" : "İyi akşamlar";
  if (streak >= 7) return `${timeGreeting} ${firstName}! ${streak} günlük seri — harika gidiyorsun!`;
  if (streak >= 3) return `${timeGreeting} ${firstName}! ${streak} gün seri. Bugün de devam et!`;
  if (streak === 1) return `${timeGreeting} ${firstName}! Dün başladın — bugün 2. gün olsun!`;
  return `${timeGreeting} ${firstName}! Bugün yeni bir başlangıç yapabilirsin.`;
}

export default function MissionControlStajyer() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const userId = user?.id || "";
  const firstName = user?.firstName || user?.username?.split(" ")[0] || "Kullanıcı";
  const role = user?.role || "stajyer";

  const { data: streakData, isLoading: loadingStreak } = useQuery<any>({
    queryKey: ["/api/academy/streak-tracker", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/streak-tracker/${userId}`, { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0 };
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: progressData, isLoading: loadingProgress } = useQuery<any>({
    queryKey: ["/api/academy/progress-overview", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/progress-overview/${userId}`, { credentials: "include" });
      if (!res.ok) return { totalModules: 0, completedModules: 0, inProgressModules: 0, modules: [] };
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: careerData } = useQuery<any>({
    queryKey: ["/api/academy/career-progress", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/career-progress/${userId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: badgesData } = useQuery<any>({
    queryKey: ["/api/academy/user-badges"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: quizResults } = useQuery<any>({
    queryKey: ["/api/academy/quiz-results", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quiz-results?userId=${userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const streak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;
  const totalModules = progressData?.totalModules ?? 0;
  const completedModules = progressData?.completedModules ?? 0;
  const inProgressModules = progressData?.inProgressModules ?? 0;
  const progressPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const certificateCount = careerData?.certificates ?? badgesData?.certificates?.length ?? 0;
  const avgQuizScore = useMemo(() => {
    if (!quizResults || !Array.isArray(quizResults) || quizResults.length === 0) return 0;
    const total = quizResults.reduce((sum: number, q: any) => sum + (q.score ?? q.percentage ?? 0), 0);
    return Math.round(total / quizResults.length);
  }, [quizResults]);

  const kpiItems = useMemo((): KpiItem[] => [
    { value: `%${progressPct}`, label: "Eğitim İlerleme", color: "#7c3aed" },
    { value: streak.toString(), label: "Gün Serisi", color: streak > 0 ? "#16a34a" : undefined },
    { value: avgQuizScore > 0 ? avgQuizScore.toString() : "—", label: "Ort. Quiz", color: avgQuizScore >= 80 ? "#16a34a" : avgQuizScore >= 60 ? "#d97706" : "#dc2626" },
    { value: `${completedModules}/${totalModules}`, label: "Tamamlanan", color: undefined },
    { value: (totalModules - completedModules - inProgressModules).toString(), label: "Kalan Modül", color: "#d97706" },
    { value: certificateCount.toString(), label: "Sertifika", color: "#16a34a" },
  ], [progressPct, streak, avgQuizScore, completedModules, totalModules, inProgressModules, certificateCount]);

  const modules = useMemo((): ModuleInfo[] => {
    if (!progressData?.modules || !Array.isArray(progressData.modules)) return [];
    return progressData.modules.slice(0, 8).map((m: any) => ({
      id: m.id,
      name: m.name || m.title,
      progress: m.progress ?? (m.completed ? 100 : 0),
      status: m.completed ? "completed" : m.inProgress ? "active" : m.required ? "required" : "locked",
      iconColor: m.completed ? "#16a34a" : m.inProgress ? "#7c3aed" : undefined,
    }));
  }, [progressData]);

  const badges = useMemo((): BadgeItem[] => {
    if (!badgesData) return [];
    const allBadges = badgesData.allBadges || badgesData.badges || [];
    const earned = badgesData.earnedBadges || badgesData.earned || [];
    const earnedIds = new Set(earned.map((b: any) => b.id || b.badgeId));
    return allBadges.map((b: any) => ({
      id: b.id,
      name: b.name || b.title,
      description: b.description,
      earned: earnedIds.has(b.id),
      earnedAt: earned.find((e: any) => (e.id || e.badgeId) === b.id)?.earnedAt,
    }));
  }, [badgesData]);

  const activeModule = careerData?.currentModule;
  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const isLoading = loadingStreak || loadingProgress;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto overflow-y-auto h-full" data-testid="mission-control-stajyer">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">{firstName[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate" data-testid="mc-stj-greeting">Merhaba, {firstName}</h1>
            <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 capitalize">{role.replace("_", " ")}</Badge>
          <DashboardModeToggle />
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-3">
          <p className="text-sm font-medium" data-testid="mc-motivation">{getGreetingMessage(streak, firstName)}</p>
        </CardContent>
      </Card>

      {isMobile && (role === "barista" || role === "bar_buddy" || role === "stajyer") && (
        <BaristaQuickActions />
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <DashboardKpiStrip items={kpiItems} />
      )}

      <Card data-testid="mc-career-path">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Kariyer Yol Haritası
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <CareerRoadmap currentRole={role} />
        </CardContent>
      </Card>

      {activeModule && (
        <Link href="/akademi">
          <Card className="border-primary/30 bg-primary/5 hover-elevate cursor-pointer" data-testid="mc-continue-module">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-primary font-medium uppercase tracking-wide">Devam Et</p>
                  <p className="text-xs font-bold truncate">{activeModule.title || activeModule.name || "Aktif Modül"}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      <Card data-testid="mc-streak-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Flame className="w-4 h-4" />
            Öğrenme Serisi
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <LearningStreak currentStreak={streak} longestStreak={longestStreak} />
        </CardContent>
      </Card>

      {modules.length > 0 && (
        <Card data-testid="mc-modules">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Modüller
            </CardTitle>
            <Link href="/akademi">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                Tümü <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </CardContent>
        </Card>
      )}

      {quizResults && Array.isArray(quizResults) && quizResults.length > 0 && (
        <Card data-testid="mc-quiz-results">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Quiz Sonuçları
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {quizResults.slice(0, 5).map((q: any, i: number) => {
              const score = q.score ?? q.percentage ?? 0;
              return (
                <div key={q.id || i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30" data-testid={`quiz-result-${i}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {score >= 80 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : score >= 60 ? (
                      <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs truncate">{q.quizName || q.name || `Quiz ${i + 1}`}</span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] h-5 ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {score}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {badges.length > 0 && (
        <Card data-testid="mc-badges">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Rozet Koleksiyonu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <BadgeGrid badges={badges} />
          </CardContent>
        </Card>
      )}

      <TodaysTasksWidget />

      <div className="grid grid-cols-2 gap-2" data-testid="mc-stj-quick-nav">
        <Link href="/akademi">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-medium">Akademi</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/akademi-leaderboard">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span className="text-xs font-medium">Sıralama</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
