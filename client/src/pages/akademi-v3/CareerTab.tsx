import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Award,
} from "lucide-react";

const CAREER_LEVELS = [
  { id: "stajyer", label: "Stajyer", num: 1 },
  { id: "bar_buddy", label: "Bar Buddy", num: 2 },
  { id: "barista", label: "Barista", num: 3 },
  { id: "supervisor_buddy", label: "Supervisor Buddy", num: 4 },
  { id: "supervisor", label: "Supervisor", num: 5 },
];

function CareerSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="career-skeleton">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export default function CareerTab() {
  const { data: myPathData, isLoading } = useQuery<any>({
    queryKey: ["/api/academy/my-path"],
  });

  const { data: homeData } = useQuery<any>({
    queryKey: ["/api/v3/academy/home-data"],
  });

  if (isLoading) return <CareerSkeleton />;

  const career = homeData?.career;
  const currentRoleId = career?.currentLevel?.roleId || myPathData?.currentLevel?.roleId || "stajyer";
  const currentLevelIdx = CAREER_LEVELS.findIndex((l) => l.id === currentRoleId);
  const compositeScore = Number(career?.compositeScore ?? myPathData?.compositeScore ?? 0);

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="career-tab">
      <Card data-testid="career-timeline">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-4">Kariyer Yolculuğun</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {CAREER_LEVELS.map((level, i) => {
                const isDone = i < currentLevelIdx;
                const isCurrent = i === currentLevelIdx;
                return (
                  <div key={level.id} className="flex items-center gap-4 relative" data-testid={`career-level-${level.id}`}>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ${
                        isDone
                          ? "bg-green-600 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground border"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        level.num
                      )}
                    </div>
                    <div className={`text-sm flex items-center gap-2 flex-wrap ${isCurrent ? "font-bold" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                      <span data-testid={`level-label-${level.id}`}>{level.label}</span>
                      {isCurrent && (
                        <Badge variant="default" data-testid="current-level-badge">
                          Şu An
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {myPathData?.nextGate && (
        <Card data-testid="gate-progress">
          <CardContent className="p-4">
            <div className="flex justify-between items-center gap-2 mb-3 flex-wrap">
              <h3 className="font-semibold text-sm" data-testid="gate-title">{myPathData.nextGate.titleTr || "Sonraki Gate"}</h3>
              <span className="text-xs text-muted-foreground" data-testid="gate-module-count">
                {myPathData.nextGate.requiredModulesCompleted}/{myPathData.nextGate.requiredModulesTotal}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Modüller", done: myPathData.nextGate.allModulesCompleted },
                { label: "Sınav", done: myPathData.activeGate?.quizPassed === true },
                { label: "Pratik", done: myPathData.activeGate?.practicalPassed === true },
                { label: "Onay", done: false },
              ].map((g, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 text-center border ${
                    g.done ? "bg-green-500/10 border-green-500/30" : "bg-muted/50 border-border"
                  }`}
                  data-testid={`gate-item-${i}`}
                >
                  <div className="mb-1">
                    {g.done ? (
                      <CheckCircle2 className="h-5 w-5 mx-auto text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 mx-auto text-muted-foreground" />
                    )}
                  </div>
                  <div className={`text-xs ${g.done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {g.label}
                  </div>
                </div>
              ))}
            </div>
            {myPathData.nextGate.compositeScoreRequired > 0 && (
              <div className="mt-3 text-xs text-muted-foreground" data-testid="gate-score-requirement">
                Gereken skor: {Math.round(Number(myPathData.nextGate.currentCompositeScore ?? 0))}/
                {myPathData.nextGate.compositeScoreRequired}
                <Progress
                  value={Math.min(
                    100,
                    Math.round(
                      (Number(myPathData.nextGate.currentCompositeScore ?? 0) / myPathData.nextGate.compositeScoreRequired) * 100
                    )
                  )}
                  className="mt-1 h-1.5"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {myPathData?.activeGate && (
        <Card className="border-amber-500/30 bg-amber-50/5 dark:bg-amber-950/10" data-testid="active-gate-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Award className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-sm" data-testid="active-gate-title">{myPathData.activeGate.gateTitleTr}</span>
              <Badge variant="secondary">Aktif</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span
                data-testid="gate-quiz-status"
                className={
                  myPathData.activeGate.quizPassed === true
                    ? "text-green-600 dark:text-green-400"
                    : myPathData.activeGate.quizPassed === false
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              >
                {myPathData.activeGate.quizPassed === true
                  ? "Quiz Geçti"
                  : myPathData.activeGate.quizPassed === false
                  ? "Quiz Kaldı"
                  : "Quiz Bekliyor"}
              </span>
              <span
                data-testid="gate-practical-status"
                className={
                  myPathData.activeGate.practicalPassed === true
                    ? "text-green-600 dark:text-green-400"
                    : myPathData.activeGate.practicalPassed === false
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              >
                {myPathData.activeGate.practicalPassed === true
                  ? "Pratik Geçti"
                  : myPathData.activeGate.practicalPassed === false
                  ? "Pratik Kaldı"
                  : "Pratik Bekliyor"}
              </span>
              <span
                data-testid="gate-attendance-status"
                className={
                  myPathData.activeGate.attendancePassed === true
                    ? "text-green-600 dark:text-green-400"
                    : myPathData.activeGate.attendancePassed === false
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              >
                {myPathData.activeGate.attendancePassed === true
                  ? "Devam OK"
                  : myPathData.activeGate.attendancePassed === false
                  ? "Devam Kaldı"
                  : "Devam Bekliyor"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="score-overview">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Skor Özeti</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-500 dark:text-green-400" data-testid="overall-score">
                {Math.round(compositeScore)}
              </div>
              <div className="text-xs text-muted-foreground">Genel Skor</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold" data-testid="training-score">
                {Number(myPathData?.trainingScore ?? career?.trainingScore ?? 0).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Eğitim Skoru</div>
            </div>
            {myPathData?.practicalScore !== undefined && (
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold" data-testid="practical-score">
                  {Number(myPathData.practicalScore ?? 0).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Pratik Skoru</div>
              </div>
            )}
            {myPathData?.completedModuleCount !== undefined && (
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold" data-testid="completed-count">
                  {myPathData.completedModuleCount}
                </div>
                <div className="text-xs text-muted-foreground">Tamamlanan</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
