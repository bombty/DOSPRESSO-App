import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Medal,
  Lock,
  CheckCircle2,
} from "lucide-react";

const CAREER_LEVELS = [
  { id: "stajyer", label: "Stajyer", levelNum: 1, icon: Star, colorClass: "text-blue-500 dark:text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: "bar_buddy", label: "Bar Buddy", levelNum: 2, icon: Target, colorClass: "text-green-500 dark:text-green-400 border-green-500/30 bg-green-500/10" },
  { id: "barista", label: "Barista", levelNum: 3, icon: Trophy, colorClass: "text-amber-500 dark:text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { id: "supervisor_buddy", label: "Supervisor Buddy", levelNum: 4, icon: TrendingUp, colorClass: "text-purple-500 dark:text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { id: "supervisor", label: "Supervisor", levelNum: 5, icon: Award, colorClass: "text-pink-500 dark:text-pink-400 border-pink-500/30 bg-pink-500/10" },
];

const DEFAULT_GATES = [
  { id: "moduller", title: "Modüller", progress: 0, status: "pending" },
  { id: "sinav", title: "Sınav", progress: 0, status: "pending" },
  { id: "pratik", title: "Pratik", progress: 0, status: "pending" },
  { id: "onay", title: "Onay", progress: 0, status: "pending" },
];

function CareerSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="career-skeleton">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function CareerTab() {
  const { user } = useAuth();

  const { data: homeData, isLoading: homeLoading } = useQuery<any>({
    queryKey: ["/api/v3/academy/home-data"],
    enabled: !!user,
  });

  const { data: badges, isLoading: badgesLoading } = useQuery<any[]>({
    queryKey: ["/api/academy/badges"],
    enabled: !!user,
  });

  if (homeLoading || badgesLoading) return <CareerSkeleton />;

  const career = homeData?.career;
  const gates = career?.gates || [];
  const compositeScore = Number(career?.compositeScore ?? 0);
  const currentLevelId = career?.currentLevel?.roleId || "stajyer";

  const currentIdx = CAREER_LEVELS.findIndex((l) => l.id === currentLevelId);
  const effectiveIdx = currentIdx >= 0 ? currentIdx : 0;

  const earnedBadges = badges?.filter((b: any) => b.earned || b.earnedAt) || [];
  const lockedBadges = badges?.filter((b: any) => !b.earned && !b.earnedAt) || [];
  const allBadges = [...earnedBadges, ...lockedBadges];

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="career-tab">
      <Card data-testid="score-overview">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-sm">Kariyer Puanı</h2>
          </div>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold text-foreground" data-testid="career-score">
              {Math.round(compositeScore)}
            </div>
            <div className="text-xs text-muted-foreground">/100 puan</div>
          </div>
          <Progress value={Math.min(100, compositeScore)} className="h-2 mb-2" />

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-bold text-foreground" data-testid="quiz-score">
                {Number(career?.quizAvg ?? 0).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Quiz Ort.</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-bold text-foreground" data-testid="completion-rate">
                {Number(career?.completionRate ?? 0).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Tamamlama</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-bold text-foreground" data-testid="evaluation-score">
                {Number(career?.evalAvg ?? 0).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Değerlendirme</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div data-testid="career-timeline">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Kariyer Yolu
        </h2>
        <div className="relative pl-6 space-y-1">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted" />

          {CAREER_LEVELS.map((level, idx) => {
            const Icon = level.icon;
            const isCurrent = idx === effectiveIdx;
            const isPast = idx < effectiveIdx;
            const isFuture = idx > effectiveIdx;

            return (
              <div
                key={level.id}
                className="relative flex items-start gap-3"
                data-testid={`career-level-${level.id}`}
              >
                <div
                  className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10 ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isCurrent ? (
                    <Star className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                </div>

                <Card
                  className={`flex-1 ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : isFuture
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-3 flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${level.colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`level-label-${level.id}`}>
                          {level.label}
                        </span>
                        <Badge variant="secondary">Lv.{level.levelNum}</Badge>
                        {isCurrent && (
                          <Badge variant="default" data-testid="current-level-badge">Aktif</Badge>
                        )}
                        {isPast && (
                          <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30" data-testid={`completed-${level.id}`}>
                            Tamamlandı
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <div data-testid="gate-progress-section">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap">
          <Target className="h-4 w-4 text-muted-foreground" />
          Kapı İlerlemesi
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(gates.length > 0 ? gates : DEFAULT_GATES).map((gate: any, idx: number) => {
              const gateProgress = Number(gate.progress ?? 0);
              const isActive = gate.status === "in_progress" || gate.status === "active";
              const isPassed = gate.status === "passed" || gate.status === "completed";
              return (
                <Card
                  key={gate.id || idx}
                  className={isActive ? "border-primary/30" : isPassed ? "border-green-500/30" : ""}
                  data-testid={`gate-${gate.id || idx}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`gate-title-${gate.id || idx}`}>
                        {gate.title || gate.name || `Kapı ${idx + 1}`}
                      </span>
                      <Badge
                        variant={isPassed ? "default" : isActive ? "secondary" : "outline"}
                        data-testid={`gate-status-${gate.id || idx}`}
                      >
                        {isPassed ? "Geçti" : isActive ? "Aktif" : "Bekliyor"}
                      </Badge>
                    </div>
                    <Progress value={gateProgress} className="h-1.5" />
                    <div className="text-xs text-muted-foreground mt-1" data-testid={`gate-progress-${gate.id || idx}`}>
                      %{Math.round(gateProgress)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      <div data-testid="badge-collection">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap">
          <Medal className="h-4 w-4 text-muted-foreground" />
          Rozet Koleksiyonu
          {allBadges.length > 0 && (
            <Badge variant="secondary">{earnedBadges.length}/{allBadges.length}</Badge>
          )}
        </h2>

        {allBadges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-badges">
            <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Henüz rozet tanımlanmamış</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2" data-testid="badge-grid">
            {allBadges.map((badge: any) => {
              const isEarned = badge.earned || badge.earnedAt;
              return (
                <Card
                  key={badge.id}
                  className={`text-center ${!isEarned ? "opacity-40 grayscale" : ""}`}
                  data-testid={`badge-${badge.id}`}
                >
                  <CardContent className="p-3 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isEarned ? "bg-amber-500/10" : "bg-muted"
                      }`}
                    >
                      {isEarned ? (
                        <Award className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs font-medium leading-tight" data-testid={`badge-name-${badge.id}`}>
                      {badge.name || badge.title}
                    </span>
                    {isEarned && (
                      <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-500/30" data-testid={`badge-earned-${badge.id}`}>
                        Kazanıldı
                      </Badge>
                    )}
                    {!isEarned && (
                      <span className="text-[10px] text-muted-foreground" data-testid={`badge-locked-${badge.id}`}>
                        Kilitli
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
