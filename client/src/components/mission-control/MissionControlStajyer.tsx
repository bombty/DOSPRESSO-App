import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardModeToggle } from "./DashboardModeToggle";
import { TodaysTasksWidget } from "@/components/widgets/todays-tasks-widget";
import { Link } from "wouter";
import {
  GraduationCap,
  Trophy,
  Flame,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Star,
  Target,
} from "lucide-react";

const CAREER_PATH = [
  { role: "stajyer", label: "Stajyer" },
  { role: "bar_buddy", label: "Bar Buddy" },
  { role: "barista", label: "Barista" },
  { role: "supervisor_buddy", label: "Sup. Buddy" },
  { role: "supervisor", label: "Supervisor" },
];

function CareerPathIndicator({ currentRole }: { currentRole: string }) {
  const currentIndex = CAREER_PATH.findIndex(p => p.role === currentRole);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <Card data-testid="mc-career-path">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="w-4 h-4" />
          Kariyer Yolu
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex items-center justify-between gap-1">
          {CAREER_PATH.map((step, i) => {
            const isCompleted = i < activeIndex;
            const isCurrent = i === activeIndex;
            const isFuture = i > activeIndex;

            return (
              <div key={step.role} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Star className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                </div>
                <span className={`text-[9px] text-center leading-tight ${
                  isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        {activeIndex < CAREER_PATH.length - 1 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Sonraki: <span className="font-medium text-foreground">{CAREER_PATH[activeIndex + 1].label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StreakWidget({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/academy/streak-tracker", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/streak-tracker/${userId}`, { credentials: "include" });
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, weekDays: [] };
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;

  const streak = data?.currentStreak ?? 0;
  const longest = data?.longestStreak ?? 0;
  const weekLabels = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

  const weekStatus = (() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const result: Array<{ label: string; done: boolean; isToday: boolean }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const isToday = d.toDateString() === today.toDateString();
      const isPast = d < today && !isToday;
      result.push({
        label: weekLabels[i],
        done: isPast && i < streak,
        isToday,
      });
    }
    return result;
  })();

  return (
    <Card data-testid="mc-streak">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <span className="text-lg font-bold">{streak} gün</span>
          </div>
          <span className="text-[10px] text-muted-foreground">En uzun: {longest} gün</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {weekStatus.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-medium ${
                day.done
                  ? "bg-emerald-500 text-white"
                  : day.isToday
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-muted text-muted-foreground"
              }`}>
                {day.done ? "✓" : day.label}
              </div>
            </div>
          ))}
        </div>
        {streak > 0 && (
          <p className="text-[10px] text-center mt-2 text-muted-foreground">
            {streak === 1 ? "Harika başlangıç!" : streak < 5 ? `${5 - streak} gün daha → 5 gün seri!` : `${streak} günlük seri — muhteşem!`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AcademyProgressCard({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/academy/progress-overview", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/progress-overview/${userId}`, { credentials: "include" });
      if (!res.ok) return { totalModules: 0, completedModules: 0, inProgressModules: 0 };
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

  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;

  const total = data?.totalModules ?? 0;
  const completed = data?.completedModules ?? 0;
  const inProgress = data?.inProgressModules ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const activeModule = careerData?.currentModule;

  return (
    <Card data-testid="mc-academy-progress">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4" />
          Akademi İlerlemesi
        </CardTitle>
        <Link href="/akademi">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
            Tümü <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{completed}/{total} modül</span>
              <span className="text-xs font-bold">%{pct}</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-muted-foreground">{completed} tamamlandı</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">{inProgress} devam</span>
          </div>
        </div>

        {activeModule && (
          <Link href="/akademi">
            <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20 cursor-pointer hover-elevate" data-testid="mc-continue-module">
              <div className="min-w-0">
                <p className="text-[10px] text-primary font-medium uppercase tracking-wide">Devam Et</p>
                <p className="text-xs font-medium truncate">{activeModule.title || activeModule.name || "Aktif Modül"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

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
  const userId = user?.id || "";
  const firstName = user?.firstName || user?.username?.split(" ")[0] || "Kullanıcı";
  const role = user?.role || "stajyer";

  const { data: streakData } = useQuery<any>({
    queryKey: ["/api/academy/streak-tracker", userId],
    queryFn: async () => {
      const res = await fetch(`/api/academy/streak-tracker/${userId}`, { credentials: "include" });
      if (!res.ok) return { currentStreak: 0 };
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const streak = streakData?.currentStreak ?? 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto overflow-y-auto h-full" data-testid="mission-control-stajyer">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">Mission Control</h1>
        <DashboardModeToggle />
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-3">
          <p className="text-sm font-medium" data-testid="mc-greeting">
            {getGreetingMessage(streak, firstName)}
          </p>
        </CardContent>
      </Card>

      <CareerPathIndicator currentRole={role} />

      <StreakWidget userId={userId} />

      <AcademyProgressCard userId={userId} />

      <TodaysTasksWidget />

      <div className="grid grid-cols-2 gap-2">
        <Link href="/akademi">
          <Card className="hover-elevate cursor-pointer" data-testid="mc-go-academy">
            <CardContent className="p-3 flex flex-col items-center gap-1.5">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-medium">Akademi</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/akademi-leaderboard">
          <Card className="hover-elevate cursor-pointer" data-testid="mc-go-leaderboard">
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
