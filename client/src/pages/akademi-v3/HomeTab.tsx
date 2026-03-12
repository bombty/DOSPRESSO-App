import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  BookOpen,
  Clock,
  ChevronRight,
  Video,
  Shield,
  Wrench,
  Users,
  Star,
  Coffee,
  GraduationCap,
  X,
} from "lucide-react";

interface HomeTabProps {
  homeData: any;
  isLoading: boolean;
  onNavigate: (tab: string) => void;
  categoryCounts?: Record<string, number>;
}

const LEVEL_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
};

const CATEGORY_CONFIG: { id: string; label: string; icon: typeof Coffee; colorClass: string }[] = [
  { id: "barista_temelleri", label: "Barista Temelleri", icon: Coffee, colorClass: "text-orange-500 dark:text-orange-400" },
  { id: "hijyen_guvenlik", label: "Hijyen & Güvenlik", icon: Shield, colorClass: "text-green-500 dark:text-green-400" },
  { id: "ekipman", label: "Ekipman", icon: Wrench, colorClass: "text-blue-500 dark:text-blue-400" },
  { id: "musteri_iliskileri", label: "Müşteri Hizm.", icon: Star, colorClass: "text-yellow-500 dark:text-yellow-400" },
  { id: "yonetim", label: "Yönetim", icon: Users, colorClass: "text-purple-500 dark:text-purple-400" },
  { id: "genel_gelisim", label: "Genel Gelişim", icon: GraduationCap, colorClass: "text-pink-500 dark:text-pink-400" },
];

function HomeTabSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="home-tab-skeleton">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  );
}

export default function HomeTab({ homeData, isLoading, onNavigate, categoryCounts }: HomeTabProps) {
  const { user } = useAuth();
  const [dobodyDismissed, setDobodyDismissed] = useState(false);

  if (isLoading || !homeData) {
    return <HomeTabSkeleton />;
  }

  const career = homeData.career;
  const mandatoryModules = homeData.mandatoryModules || [];
  const upcomingWebinars = homeData.upcomingWebinars || [];
  const liveWebinar = upcomingWebinars.find((w: any) => w.status === "live");
  const levelName = career?.currentLevel?.roleId
    ? LEVEL_LABELS[career.currentLevel.roleId] || career.currentLevel.titleTr
    : "Başlangıç";
  const levelNum = career?.currentLevel?.levelNumber || 1;
  const compositeScore = Number(career?.compositeScore ?? 0);
  const progressPercent = Math.min(100, Math.round(compositeScore));

  const urgentModule = mandatoryModules.find(
    (m: any) => (m.deadlineDays && m.deadlineDays <= 7) || Number(m.progress ?? 0) === 0
  );

  const levelKeys = Object.keys(LEVEL_LABELS);
  const currentIdx = career?.currentLevel?.roleId
    ? levelKeys.indexOf(career.currentLevel.roleId)
    : -1;
  const nextLevelName =
    currentIdx >= 0 && currentIdx < levelKeys.length - 1
      ? LEVEL_LABELS[levelKeys[currentIdx + 1]]
      : "Maksimum";

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="home-tab">
      {urgentModule && !dobodyDismissed && (
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-amber-500/25 relative" data-testid="dobody-card">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => setDobodyDismissed(true)}
            data-testid="dobody-dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="p-4 pr-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-amber-500 dark:text-amber-400 font-bold tracking-wide mb-1" data-testid="dobody-label">
                  MR. DOBODY
                </div>
                <p className="text-sm text-foreground leading-snug">
                  <strong>{user?.firstName || user?.username},</strong>{" "}
                  <span data-testid="dobody-module-title">{urgentModule.title}</span>{" "}
                  {urgentModule.deadlineDays && (
                    <span className="text-destructive font-semibold" data-testid="dobody-deadline">
                      {urgentModule.deadlineDays} gün içinde
                    </span>
                  )}{" "}
                  tamamlanmalı.
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => onNavigate("egitimler")}
                  data-testid="dobody-action-btn"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Modüle Git
                  {urgentModule.estimatedDuration && (
                    <span className="ml-auto text-xs opacity-70">
                      <Clock className="h-3 w-3 inline mr-0.5" />
                      {urgentModule.estimatedDuration} dk
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="career-progress-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" data-testid="level-badge">
                  Lv.{levelNum}
                </Badge>
                <span className="font-semibold text-sm" data-testid="level-name">{levelName}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-500 dark:text-green-400" data-testid="composite-score">
                {Math.round(compositeScore)}
              </div>
              <div className="text-xs text-muted-foreground">/100 puan</div>
            </div>
          </div>
          <Progress value={progressPercent} className="mt-3 h-2" />
          <div className="flex justify-between gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span data-testid="progress-percent">%{progressPercent} tamamlandı</span>
            <span data-testid="next-level-label">Sonraki: {nextLevelName}</span>
          </div>
        </CardContent>
      </Card>

      {mandatoryModules.length > 0 && (
        <div data-testid="mandatory-modules-section">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse inline-block" />
              Zorunlu Eğitimler
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("egitimler")}
              data-testid="view-all-mandatory"
            >
              Tümü <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {mandatoryModules.slice(0, 3).map((mod: any) => {
              const progress = Number(mod.progress ?? 0);
              const isUrgent = mod.deadlineDays && mod.deadlineDays <= 3;
              return (
                <Card
                  key={mod.id}
                  className={isUrgent ? "border-destructive/30 bg-destructive/5" : ""}
                  data-testid={`mandatory-module-${mod.id}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isUrgent ? "bg-destructive/10" : "bg-muted"
                      }`}
                    >
                      <BookOpen className={`h-4 w-4 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" data-testid={`module-title-${mod.id}`}>{mod.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {mod.estimatedDuration && (
                          <span data-testid={`module-duration-${mod.id}`}>
                            <Clock className="h-3 w-3 inline mr-0.5" />
                            {mod.estimatedDuration} dk
                          </span>
                        )}
                        {mod.deadlineDays && (
                          <span data-testid={`module-deadline-${mod.id}`}>{mod.deadlineDays} gün</span>
                        )}
                      </div>
                      {progress > 0 && (
                        <Progress value={progress} className="mt-1.5 h-1" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isUrgent ? "default" : "secondary"}
                      data-testid={`start-module-${mod.id}`}
                    >
                      {progress > 0 ? "Devam" : "Başla"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div data-testid="categories-section">
        <h2 className="text-sm font-semibold mb-2">Kategoriler</h2>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_CONFIG.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts?.[cat.id] ?? 0;
            return (
              <Button
                key={cat.id}
                variant="outline"
                onClick={() => onNavigate("egitimler")}
                className="h-auto rounded-xl p-3 flex flex-col items-start gap-1 no-default-hover-elevate hover-elevate"
                data-testid={`category-${cat.id}`}
              >
                <Icon className={`h-5 w-5 ${cat.colorClass}`} />
                <span className="text-xs font-medium leading-tight text-left">{cat.label}</span>
                <span className="text-xs text-muted-foreground" data-testid={`category-count-${cat.id}`}>
                  {count} modül
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {liveWebinar && (
        <Card
          className="border-destructive/40 bg-destructive/5 cursor-pointer hover-elevate"
          onClick={() => onNavigate("webinar")}
          data-testid="live-webinar-teaser"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-destructive text-xs font-bold uppercase tracking-widest">CANLI</span>
            </div>
            <div className="text-sm font-semibold" data-testid="live-webinar-title">{liveWebinar.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5" data-testid="live-webinar-host">
              {liveWebinar.hostName}
            </div>
            <Button className="mt-2" size="sm" data-testid="join-live-webinar">
              <Video className="h-3 w-3 mr-1" />
              Katıl
            </Button>
          </CardContent>
        </Card>
      )}

      {!liveWebinar && upcomingWebinars.length > 0 && (
        <Card
          className="cursor-pointer hover-elevate"
          onClick={() => onNavigate("webinar")}
          data-testid="upcoming-webinar-teaser"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Yaklaşan Webinar</span>
            </div>
            <div className="text-sm font-medium" data-testid="upcoming-webinar-title">{upcomingWebinars[0].title}</div>
            <div className="text-xs text-muted-foreground mt-0.5" data-testid="upcoming-webinar-host">
              {upcomingWebinars[0].hostName} ·{" "}
              {new Date(upcomingWebinars[0].webinarDate).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {homeData.teamSummary && (
        <Card data-testid="team-summary-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Ekip Özeti</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="text-lg font-bold" data-testid="team-member-count">{homeData.teamSummary.memberCount}</div>
                <div className="text-xs text-muted-foreground">Üye</div>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="text-lg font-bold" data-testid="team-avg-score">
                  {Number(homeData.teamSummary.avgCompositeScore ?? 0).toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Ort. Skor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
