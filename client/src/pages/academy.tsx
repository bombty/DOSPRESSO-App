import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { isHQRole } from "@shared/schema";
import {
  BookOpen, Trophy, TrendingUp, Target,
  CheckCircle, Flame, GraduationCap, ChevronRight,
  Clock, Star, Play, Sparkles, Award, Coffee,
} from "lucide-react";
import { Link } from "wouter";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Kolay: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
  Orta: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
  Zor: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
};

const CATEGORY_ICONS: Record<string, any> = {
  barista_temelleri: BookOpen,
  hijyen_guvenlik: Award,
  receteler: Star,
  musteri_iliskileri: Star,
  ekipman: TrendingUp,
  yonetim: TrendingUp,
  onboarding: GraduationCap,
  genel_gelisim: GraduationCap,
};

const CATEGORY_DISPLAY: Record<string, string> = {
  barista_temelleri: "Barista Temelleri",
  hijyen_guvenlik: "Hijyen & Güvenlik",
  receteler: "Reçeteler",
  musteri_iliskileri: "Müşteri İlişkileri",
  ekipman: "Ekipman Kullanımı",
  yonetim: "Yönetim & Liderlik",
  onboarding: "Oryantasyon",
  genel_gelisim: "Genel Gelişim",
};

export default function Academy() {
  const { user } = useAuth();
  const userIsHQ = isHQRole(user?.role as any) || user?.role === 'admin';

  const { data: dailyRec, isLoading: dailyLoading, isError, refetch } = useQuery<{
    module: { id: number; title: string; category: string; duration: number; difficulty: string; level: string } | null;
    alreadyCompletedToday: boolean;
    totalCompleted: number;
  }>({
    queryKey: ["/api/academy/daily-recommendation"],
    enabled: !!user?.id,
  });

  const { data: weeklyProgress, isLoading: weeklyLoading } = useQuery<{
    completedThisWeek: number;
    weeklyTarget: number;
    streakDays: number;
    lastCompletedDate: string | null;
  }>({
    queryKey: ["/api/academy/weekly-progress"],
    enabled: !!user?.id,
  });

  const { data: userProgress } = useQuery({
    queryKey: ["/api/academy/career-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/career-progress/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: compositeScore } = useQuery({
    queryKey: ["/api/career/composite-score", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/career/composite-score/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: userBadges = [] } = useQuery<any[]>({
    queryKey: ["/api/academy/user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/academy/user-badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS.find(l => l.levelNumber === currentLevel.levelNumber + 1) : null;
  const score = compositeScore?.compositeScore || compositeScore?.score || 0;
  const progressPercent = nextLevel ? Math.min(100, Math.round(score)) : 100;

  const weeklyPercent = weeklyProgress
    ? Math.min(100, Math.round((weeklyProgress.completedThisWeek / Math.max(1, weeklyProgress.weeklyTarget)) * 100))
    : 0;
  const weeklyGoalReached = weeklyProgress && weeklyProgress.completedThisWeek >= weeklyProgress.weeklyTarget;

  const CategoryIcon = dailyRec?.module?.category
    ? (CATEGORY_ICONS[dailyRec.module.category] || GraduationCap)
    : GraduationCap;

  const recentBadges = userBadges.slice(-5).reverse();

  
  if (dailyLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 flex flex-col gap-3 sm:gap-4">

        {/* Section 1: Bugünün Eğitimi Hero Card */}
        {dailyLoading ? (
          <Card data-testid="card-daily-training-skeleton">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : dailyRec?.alreadyCompletedToday ? (
          <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-green-500/20" data-testid="card-daily-completed">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-base" data-testid="text-daily-completed-title">
                    {userIsHQ ? "Bu haftanın eğitimini tamamladın!" : "Bugünkü eğitimini tamamladın!"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Toplam {dailyRec.totalCompleted} modül tamamlandı
                  </p>
                </div>
              </div>
              <Link href="/akademi?tab=kesf">
                <Button variant="outline" className="w-full" data-testid="button-explore-more">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Daha fazla öğren
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : dailyRec?.module ? (
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20" data-testid="card-daily-training">
            <CardContent className="p-5">
              <div className="flex items-center gap-1 mb-3">
                <Badge variant="secondary" data-testid="text-daily-label">
                  {userIsHQ ? "Bu Haftanın Eğitimi" : "Bugünün Eğitimi"}
                </Badge>
              </div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-base leading-tight" data-testid="text-daily-module-title">
                    {dailyRec.module.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-daily-category">
                      <BookOpen className="w-3 h-3" />
                      {CATEGORY_DISPLAY[dailyRec.module.category] || dailyRec.module.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-daily-duration">
                      <Clock className="w-3 h-3" />
                      {dailyRec.module.duration} dk
                    </span>
                    <Badge variant="secondary" className={`text-xs ${DIFFICULTY_COLORS[dailyRec.module.difficulty] || ''}`} data-testid="text-daily-difficulty">
                      {dailyRec.module.difficulty}
                    </Badge>
                  </div>
                </div>
              </div>
              <Link to={`/akademi-modul/${dailyRec.module.id}`}>
                <Button className="w-full" data-testid="button-start-daily">
                  <Play className="w-4 h-4 mr-2" />
                  Başla
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-daily-empty">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm" data-testid="text-daily-empty">Tüm modülleri tamamladın!</h3>
              <p className="text-xs text-muted-foreground mt-1">Yeni modüller eklendiğinde burada görünecek.</p>
            </CardContent>
          </Card>
        )}

        {/* Section 2: Haftalık İlerleme Özeti */}
        {weeklyLoading ? (
          <Card data-testid="card-weekly-skeleton">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ) : weeklyProgress ? (
          <Card data-testid="card-weekly-progress">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm" data-testid="text-weekly-count">
                    Bu hafta: {weeklyProgress.completedThisWeek}/{weeklyProgress.weeklyTarget}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className={`w-4 h-4 text-orange-500 ${weeklyProgress.streakDays >= 7 ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400" data-testid="text-streak-count">
                    {weeklyProgress.streakDays} Gün
                  </span>
                  {weeklyProgress.streakDays >= 30 && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" data-testid="badge-streak-monthly">
                      Ay'in Öğrencisi
                    </Badge>
                  )}
                  {weeklyProgress.streakDays >= 7 && weeklyProgress.streakDays < 30 && (
                    <Badge variant="secondary" className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" data-testid="badge-streak-weekly">
                      Haftalik Yildiz
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={weeklyPercent} className="h-2.5 mb-2" />
              {weeklyGoalReached && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30 mt-1" data-testid="text-weekly-congrats">
                  <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Haftalık hedefe ulaştın! Harika gidiyorsun!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Section 3: Kariyer Yolu Progress Bar */}
        {!userIsHQ && currentLevel ? (
          <Link href="/akademi?tab=kariyer">
            <Card className="cursor-pointer hover-elevate" data-testid="card-career-progress">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Kariyer Yolu</span>
                  </div>
                  {score > 0 && (
                    <Badge variant="default" data-testid="text-composite-score">
                      Skor: {Math.round(score)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="font-medium" data-testid="text-current-level">{currentLevel.titleTr}</span>
                      {nextLevel && (
                        <span className="text-muted-foreground" data-testid="text-next-level">{nextLevel.titleTr}</span>
                      )}
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : userIsHQ ? (
          <Card data-testid="card-hq-development">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Gelişim Alanları</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 rounded-md bg-muted/50 text-center">
                  <div className="text-lg font-bold text-primary" data-testid="text-completed-total">{dailyRec?.totalCompleted || 0}</div>
                  <div className="text-xs text-muted-foreground">Tamamlanan</div>
                </div>
                <div className="p-2 rounded-md bg-muted/50 text-center">
                  <div className="text-lg font-bold text-orange-500" data-testid="text-streak-total">{weeklyProgress?.streakDays || 0}</div>
                  <div className="text-xs text-muted-foreground">Gün Seri</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Section 3.5: Reçete Onboarding (sadece şube rolleri için) */}
        {!userIsHQ && user?.role && ['barista', 'bar_buddy', 'stajyer', 'supervisor', 'supervisor_buddy'].includes(user.role) && (
          <RecipeOnboardingCard userRole={user.role} />
        )}

        {/* Section 4: Rozetler & Başarılar */}
        <Card data-testid="card-badges">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Rozetler & Başarılar
              </CardTitle>
              <Link href="/akademi?tab=rozetler">
                <Button variant="ghost" size="sm" data-testid="button-all-badges">
                  Tüm Rozetler
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBadges.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1" data-testid="badges-scroll">
                {recentBadges.map((badge: any, idx: number) => (
                  <div
                    key={badge.id || idx}
                    className="flex flex-col items-center gap-1.5 min-w-[64px] flex-shrink-0"
                    data-testid={`badge-item-${badge.id || idx}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      {badge.icon ? (
                        <span className="text-xl">{badge.icon}</span>
                      ) : (
                        <Star className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <span className="text-xs text-center line-clamp-2 leading-tight">
                      {badge.name || badge.title || badge.badgeName || 'Rozet'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4" data-testid="text-no-badges">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Henüz rozet kazanılmadı</p>
                <p className="text-xs text-muted-foreground mt-0.5">Eğitimleri tamamlayarak rozetler kazan!</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Recipe Onboarding Card — Şube rolleri için reçete öğrenme kartı
// (TASK-ONBOARDING-001 — 4 May 2026)
// ════════════════════════════════════════════════════════════════

function RecipeOnboardingCard({ userRole }: { userRole: string }) {
  const { data, isLoading } = useQuery<{
    role: string;
    totalSteps: number;
    completedSteps: number;
    percentComplete: number;
    steps: Array<{
      id: number;
      stepNumber: number;
      title: string;
      progress: {
        totalRecipes: number;
        masteredRecipes: number;
        percentComplete: number;
        isComplete: boolean;
      };
    }>;
  }>({
    queryKey: ["/api/branch-onboarding", userRole, "progress"],
    queryFn: async () => {
      const res = await fetch(`/api/branch-onboarding/${userRole}/progress`, { credentials: "include" });
      if (!res.ok) throw new Error("İlerleme alınamadı");
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!data || data.totalSteps === 0) {
    return null; // Bu rol için onboarding tanımlanmamış
  }

  // Sıradaki tamamlanmamış adım
  const nextStep = data.steps.find(s => !s.progress.isComplete);

  return (
    <Card data-testid="card-recipe-onboarding">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Reçete Onboarding</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.completedSteps}/{data.totalSteps} adım
          </Badge>
        </div>

        <Progress value={data.percentComplete} className="h-2 mb-3" data-testid="progress-onboarding" />

        {nextStep ? (
          <Link to="/branch-recipes">
            <div className="p-3 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px]">
                  Adım {nextStep.stepNumber}
                </Badge>
                <span className="text-xs font-medium truncate flex-1">{nextStep.title}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{nextStep.progress.masteredRecipes}/{nextStep.progress.totalRecipes} reçete</span>
                <span>•</span>
                <span>%{nextStep.progress.percentComplete} tamamlandı</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              Tüm onboarding adımları tamamlandı! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
