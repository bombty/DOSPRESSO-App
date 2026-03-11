import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { isHQRole } from "@shared/schema";
import {
  getAcademyViewMode,
  isAcademyCoach,
} from "@shared/permissions";
import {
  BookOpen, Trophy, TrendingUp, Target,
  CheckCircle, Flame, GraduationCap, ChevronRight,
  Clock, Star, Play, Award, Coffee,
  ShieldCheck, Heart, Wrench, Users,
  ChefHat, Sparkles, ArrowRight, Zap,
  BarChart3, Library, Settings2, Brain,
  PlayCircle, AlertTriangle,
} from "lucide-react";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  barista_temelleri: { icon: Coffee, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  hijyen_guvenlik: { icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  receteler: { icon: ChefHat, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  musteri_iliskileri: { icon: Heart, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  ekipman: { icon: Wrench, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  yonetim: { icon: Users, color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  onboarding: { icon: GraduationCap, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  genel_gelisim: { icon: BookOpen, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

const CATEGORY_LABELS: Record<string, string> = {
  barista_temelleri: "Barista Temelleri",
  hijyen_guvenlik: "Hijyen & Güvenlik",
  receteler: "Reçeteler",
  musteri_iliskileri: "Müşteri İlişkileri",
  ekipman: "Ekipman Kullanımı",
  yonetim: "Yönetim & Liderlik",
  onboarding: "Oryantasyon",
  genel_gelisim: "Genel Gelişim",
};

interface QuickLink {
  label: string;
  icon: any;
  path: string;
  color: string;
  bgColor: string;
  roles: string[];
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Reçeteler", icon: ChefHat, path: "/receteler", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", roles: ["all"] },
  { label: "Bilgi Bankası", icon: Library, path: "/akademi/bilgi-bankasi", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", roles: ["all"] },
  { label: "Rozetlerim", icon: Award, path: "/akademi/rozetler", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", roles: ["all"] },
  { label: "Sıralama", icon: Trophy, path: "/akademi/siralama", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", roles: ["all"] },
  { label: "Analitik", icon: BarChart3, path: "/akademi/analitik", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", roles: ["coach", "admin"] },
  { label: "İçerik Yönetimi", icon: Settings2, path: "/akademi/icerik-yonetimi", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30", roles: ["coach", "admin"] },
  { label: "Ekip Takibi", icon: Users, path: "/akademi/supervisor", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-900/30", roles: ["supervisor"] },
  { label: "AI Asistan", icon: Brain, path: "/akademi/ai-kanit", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30", roles: ["all"] },
];

export default function AcademyLanding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const viewMode = getAcademyViewMode(user?.role);
  const userIsHQ = isHQRole(user?.role as any) || user?.role === 'admin';
  const isCoach = isAcademyCoach(user?.role);

  const { data: dailyRec, isLoading: dailyLoading } = useQuery<{
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

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: userProgressData } = useQuery<any>({
    queryKey: ["/api/training/progress", user?.id],
    enabled: !!user?.id,
  });

  const { data: nbaData } = useQuery<any>({
    queryKey: ["/api/ai/dashboard-nba"],
    enabled: !!user?.id,
  });

  const userProgress: any[] = (() => {
    if (!userProgressData) return [];
    if (Array.isArray(userProgressData)) return userProgressData;
    if (userProgressData.summary) return userProgressData.summary;
    if (userProgressData.completions) return userProgressData.completions;
    return [];
  })();

  const getModuleStatus = (moduleId: number): string => {
    if (!Array.isArray(userProgress)) return "not_started";
    const progress = userProgress.find((p: any) => p.moduleId === moduleId);
    if (!progress) return "not_started";
    if (progress.status === "completed" || progress.completedAt) return "completed";
    if (progress.status === "in_progress") return "in_progress";
    return "not_started";
  };

  const approvedModules = modules.filter((m: any) => {
    if (m.deletedAt) return false;
    if (m.status && m.status !== "approved") return false;
    if (!m.isPublished && !m.status) return false;
    return true;
  });

  const mandatoryModules = approvedModules.filter((m: any) => {
    if (!m.isRequired) return false;
    if (m.requiredForRole && m.requiredForRole.length > 0 && user?.role) {
      return m.requiredForRole.includes(user.role);
    }
    return true;
  });

  const mandatoryIncomplete = mandatoryModules.filter((m: any) => getModuleStatus(m.id) !== "completed");
  const mandatoryCompleted = mandatoryModules.filter((m: any) => getModuleStatus(m.id) === "completed");
  const mandatoryPercent = mandatoryModules.length > 0
    ? Math.round((mandatoryCompleted.length / mandatoryModules.length) * 100)
    : 100;

  const inProgressModules = approvedModules.filter((m: any) => getModuleStatus(m.id) === "in_progress");

  const categoryGroups = approvedModules.reduce<Record<string, any[]>>((acc, m: any) => {
    const cat = m.category || "genel_gelisim";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const currentLevel = CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS.find(l => l.levelNumber === currentLevel.levelNumber + 1) : null;
  const score = Number(compositeScore?.compositeScore ?? compositeScore?.score ?? 0);

  const weeklyPercent = weeklyProgress
    ? Math.min(100, Math.round((weeklyProgress.completedThisWeek / Math.max(1, weeklyProgress.weeklyTarget)) * 100))
    : 0;

  const nbaAction = nbaData?.actions?.[0];

  const visibleQuickLinks = QUICK_LINKS.filter(link => {
    if (link.roles.includes("all")) return true;
    if (link.roles.includes("coach") && isCoach) return true;
    if (link.roles.includes("admin") && user?.role === "admin") return true;
    if (link.roles.includes("supervisor") && viewMode === "supervisor") return true;
    return false;
  }).slice(0, 6);

  const ROLE_LABELS: Record<string, string> = {
    stajyer: "Stajyer",
    bar_buddy: "Bar Buddy",
    barista: "Barista",
    supervisor_buddy: "Supervisor Buddy",
    supervisor: "Supervisor",
    mudur: "Müdür",
    coach: "Coach",
    trainer: "Eğitmen",
    admin: "Admin",
    kalite_kontrol: "Kalite Kontrol",
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-4xl mx-auto">

        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-4 sm:p-5" data-testid="hero-welcome">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground" data-testid="text-welcome-label">Hoş geldin</p>
              <h1 className="text-xl sm:text-2xl font-bold mt-0.5" data-testid="text-welcome-name">
                {user?.firstName || user?.username || "Kullanıcı"}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {user?.role && (
                  <Badge variant="secondary" data-testid="badge-role">
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                )}
                {currentLevel && (
                  <Badge variant="outline" data-testid="badge-level">
                    Seviye {currentLevel.levelNumber}
                  </Badge>
                )}
                {weeklyProgress && weeklyProgress.streakDays > 0 && (
                  <span className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400" data-testid="text-streak">
                    <Flame className="h-4 w-4" />
                    {weeklyProgress.streakDays} gün seri
                  </span>
                )}
              </div>
            </div>
            {!userIsHQ && currentLevel && (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary" data-testid="text-score">{Math.round(score)}</div>
                <div className="text-xs text-muted-foreground">Toplam Skor</div>
              </div>
            )}
          </div>

          {!userIsHQ && currentLevel && nextLevel && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium" data-testid="text-current-level">{currentLevel.titleTr}</span>
                <span className="text-muted-foreground" data-testid="text-next-level">{nextLevel.titleTr}</span>
              </div>
              <Progress value={Math.min(100, Math.round(score))} className="h-2" />
            </div>
          )}
        </div>

        {nbaAction && (
          <Card
            className="cursor-pointer hover-elevate border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
            onClick={() => navigate(nbaAction.deepLink || "/akademi/genel-egitimler")}
            data-testid="card-nba-suggestion"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Mr. Dobody Önerisi</p>
                  <p className="font-semibold text-sm" data-testid="text-nba-title">{nbaAction.title}</p>
                  {nbaAction.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{nbaAction.reason}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {dailyLoading ? (
          <Card><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ) : dailyRec?.module && !dailyRec.alreadyCompletedToday ? (
          <Card
            className="cursor-pointer hover-elevate bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20"
            onClick={() => navigate(`/akademi-modul/${dailyRec.module!.id}`)}
            data-testid="card-daily-module"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-1">Bugünün Eğitimi</Badge>
                  <h3 className="font-bold text-sm" data-testid="text-daily-title">{dailyRec.module.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dailyRec.module.duration} dk
                    </span>
                    <span>{CATEGORY_LABELS[dailyRec.module.category] || dailyRec.module.category}</span>
                  </div>
                </div>
                <Button size="sm" data-testid="button-start-daily">Başla</Button>
              </div>
            </CardContent>
          </Card>
        ) : dailyRec?.alreadyCompletedToday ? (
          <Card className="bg-gradient-to-r from-green-500/10 to-transparent border-green-500/20" data-testid="card-daily-done">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm" data-testid="text-daily-completed">Bugünkü eğitimini tamamladın!</p>
                  <p className="text-xs text-muted-foreground">Toplam {dailyRec.totalCompleted} modül tamamlandı</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {weeklyLoading ? (
          <Skeleton className="h-14 w-full rounded-lg" />
        ) : weeklyProgress ? (
          <div className="grid grid-cols-3 gap-2" data-testid="stats-weekly">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-primary" data-testid="text-weekly-completed">{weeklyProgress.completedThisWeek}</div>
                <div className="text-xs text-muted-foreground">Bu Hafta</div>
                <Progress value={weeklyPercent} className="h-1 mt-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-orange-500" data-testid="text-streak-count">
                  {weeklyProgress.streakDays}
                </div>
                <div className="text-xs text-muted-foreground">Gün Seri</div>
                <div className="flex items-center justify-center mt-1.5">
                  <Flame className={`h-4 w-4 text-orange-500 ${weeklyProgress.streakDays >= 7 ? 'animate-pulse' : ''}`} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold" data-testid="text-total-completed">{Number(dailyRec?.totalCompleted ?? 0)}</div>
                <div className="text-xs text-muted-foreground">Toplam</div>
                <div className="flex items-center justify-center mt-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {mandatoryModules.length > 0 && (
          <div data-testid="section-mandatory">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-sm">Zorunlu Eğitimler</h2>
                <Badge variant={mandatoryIncomplete.length > 0 ? "destructive" : "default"}>
                  {mandatoryCompleted.length}/{mandatoryModules.length}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">%{mandatoryPercent}</span>
            </div>
            <Progress value={mandatoryPercent} className="h-2 mb-3" />

            {mandatoryIncomplete.length > 0 ? (
              <div className="space-y-2">
                {mandatoryIncomplete.slice(0, 4).map((m: any) => {
                  const status = getModuleStatus(m.id);
                  const catCfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.genel_gelisim;
                  const CatIcon = catCfg.icon;

                  return (
                    <Card
                      key={m.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/akademi-modul/${m.id}`)}
                      data-testid={`card-mandatory-${m.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${catCfg.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <CatIcon className={`h-4 w-4 ${catCfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1" data-testid={`text-mandatory-title-${m.id}`}>{m.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {m.estimatedDuration || 30} dk
                              </span>
                              <span>{CATEGORY_LABELS[m.category] || m.category}</span>
                            </div>
                          </div>
                          {status === "in_progress" ? (
                            <Badge variant="secondary">Devam</Badge>
                          ) : (
                            <PlayCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {mandatoryIncomplete.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/akademi/genel-egitimler")}
                    data-testid="button-more-mandatory"
                  >
                    +{mandatoryIncomplete.length - 4} eğitim daha
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            ) : (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-3 text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-300" data-testid="text-mandatory-complete">
                    Tüm zorunlu eğitimler tamamlandı!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {inProgressModules.length > 0 && (
          <div data-testid="section-continue">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Kaldığın Yerden Devam Et</h2>
            </div>
            <div className="space-y-2">
              {inProgressModules.slice(0, 3).map((m: any) => {
                const catCfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.genel_gelisim;
                const CatIcon = catCfg.icon;
                return (
                  <Card
                    key={m.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/akademi-modul/${m.id}`)}
                    data-testid={`card-continue-${m.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${catCfg.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <CatIcon className={`h-4 w-4 ${catCfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1" data-testid={`text-continue-title-${m.id}`}>{m.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {CATEGORY_LABELS[m.category] || m.category}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-continue-${m.id}`}>
                          Devam
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div data-testid="section-categories">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Kategoriler</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/akademi/kesfet")}
              data-testid="button-explore-all"
            >
              Tümünü Gör
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([slug, config]) => {
              const count = categoryGroups[slug]?.length || 0;
              if (count === 0) return null;
              const CatIcon = config.icon;
              const completedInCat = (categoryGroups[slug] || []).filter((m: any) => getModuleStatus(m.id) === "completed").length;

              return (
                <Card
                  key={slug}
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate("/akademi/kesfet")}
                  data-testid={`card-category-${slug}`}
                >
                  <CardContent className="p-3">
                    <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mb-2`}>
                      <CatIcon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <p className="font-medium text-xs line-clamp-1" data-testid={`text-category-name-${slug}`}>
                      {CATEGORY_LABELS[slug]}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{count} modül</span>
                      {completedInCat > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">{completedInCat}/{count}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div data-testid="section-quick-links">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Hızlı Erişim</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {visibleQuickLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Card
                  key={link.label}
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(link.path)}
                  data-testid={`quick-link-${link.label}`}
                >
                  <CardContent className="p-3 text-center">
                    <div className={`w-9 h-9 rounded-lg ${link.bgColor} flex items-center justify-center mx-auto mb-1.5`}>
                      <LinkIcon className={`h-4 w-4 ${link.color}`} />
                    </div>
                    <p className="text-xs font-medium line-clamp-1">{link.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {(isCoach || user?.role === 'admin') && (
          <Card data-testid="section-coach-tools">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Yönetim Araçları</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/icerik-kutuphanesi")}
                  data-testid="button-coach-library"
                >
                  <Library className="h-4 w-4" />
                  <span className="text-xs">İçerik Kütüphanesi</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/onboarding-studio")}
                  data-testid="button-coach-onboarding"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs">Onboarding Studio</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/takim-ilerleme")}
                  data-testid="button-coach-progress"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Takım İlerlemesi</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/analitik")}
                  data-testid="button-coach-analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs">Analitik</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === "supervisor" && (
          <Card data-testid="section-supervisor-tools">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Ekip Yönetimi</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/supervisor")}
                  data-testid="button-supervisor-team"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Ekip Takibi</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate("/akademi/supervisor-onboarding")}
                  data-testid="button-supervisor-onboarding"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs">Onboarding Onayları</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/akademi/genel-egitimler")}
          data-testid="button-all-modules"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Tüm Eğitim Modüllerini Gör
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
}
