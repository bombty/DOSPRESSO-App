import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle, X,
  Calendar, ClipboardCheck, Lock,
} from "lucide-react";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1 },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2 },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3 },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4 },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5 },
];

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; gradient: string }> = {
  barista_temelleri: { icon: Coffee, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/30", gradient: "from-violet-600 to-violet-800" },
  hijyen_guvenlik: { icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", gradient: "from-emerald-600 to-emerald-800" },
  receteler: { icon: ChefHat, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", gradient: "from-amber-600 to-amber-800" },
  musteri_iliskileri: { icon: Heart, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30", gradient: "from-pink-600 to-pink-800" },
  ekipman: { icon: Wrench, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", gradient: "from-indigo-600 to-indigo-800" },
  yonetim: { icon: Users, color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-900/30", gradient: "from-sky-600 to-sky-800" },
  onboarding: { icon: GraduationCap, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30", gradient: "from-teal-600 to-teal-800" },
  genel_gelisim: { icon: BookOpen, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30", gradient: "from-slate-600 to-slate-800" },
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

function CircularScore({ value, size = 80 }: { value: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? "stroke-emerald-500" : value >= 50 ? "stroke-amber-500" : "stroke-destructive";
  const textColor = value >= 70 ? "text-emerald-600 dark:text-emerald-400" : value >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} opacity={0.2} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-extrabold ${textColor}`}>{Math.round(value)}</span>
        <span className="text-[9px] text-muted-foreground">puan</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: any }) {
  const Icon = icon;
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-destructive";
  const textColor = value >= 70 ? "text-emerald-600 dark:text-emerald-400" : value >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive";

  return (
    <div className="bg-muted/50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
      <div className={`text-xs font-bold mt-1 ${textColor}`}>{Number(value ?? 0).toFixed(0)}%</div>
    </div>
  );
}

export default function AcademyLanding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const viewMode = getAcademyViewMode(user?.role);
  const userIsHQ = isHQRole(user?.role as any) || user?.role === 'admin';
  const isCoach = isAcademyCoach(user?.role);
  const [tab, setTab] = useState("home");
  const [trainingFilter, setTrainingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dobodyDismissed, setDobodyDismissed] = useState(false);

  const { data: myPathData, isLoading: pathLoading } = useQuery<any>({
    queryKey: ["/api/academy/my-path"],
    enabled: !!user?.id,
  });

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

  const { data: nbaData } = useQuery<any>({
    queryKey: ["/api/ai/dashboard-nba"],
    enabled: !!user?.id,
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: userProgressData } = useQuery<any>({
    queryKey: ["/api/training/progress", user?.id],
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

  const getModuleProgress = (moduleId: number): number => {
    if (!Array.isArray(userProgress)) return 0;
    const progress = userProgress.find((p: any) => p.moduleId === moduleId);
    if (!progress) return 0;
    if (progress.status === "completed" || progress.completedAt) return 100;
    return Number(progress.progressPercentage ?? 0);
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

  const inProgressModules = approvedModules.filter((m: any) => getModuleStatus(m.id) === "in_progress");

  const categoryGroups = approvedModules.reduce<Record<string, any[]>>((acc, m: any) => {
    const cat = m.category || "genel_gelisim";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const currentLevel = myPathData?.currentLevel
    ? CAREER_LEVELS.find(l => l.levelNumber === myPathData.currentLevel.levelNumber)
    : CAREER_LEVELS.find(l => l.roleId === user?.role);
  const nextLevel = currentLevel ? CAREER_LEVELS.find(l => l.levelNumber === currentLevel.levelNumber + 1) : null;

  const compositeScore = Number(myPathData?.compositeScore ?? 0);
  const trainingScore = Number(myPathData?.trainingScore ?? 0);
  const practicalScore = Number(myPathData?.practicalScore ?? 0);
  const attendanceScore = Number(myPathData?.attendanceScore ?? 0);
  const managerScore = Number(myPathData?.managerScore ?? 0);

  const streakDays = Number(weeklyProgress?.streakDays ?? 0);
  const nbaAction = nbaData?.actions?.[0];

  const filteredModules = approvedModules
    .filter(m => {
      if (trainingFilter === "mandatory" && !m.isRequired) return false;
      if (trainingFilter === "optional" && m.isRequired) return false;
      if (categoryFilter) {
        const cat = m.category || "genel_gelisim";
        return cat === categoryFilter;
      }
      return true;
    });

  const activeCategories = Object.entries(CATEGORY_CONFIG).filter(([slug]) => {
    return (categoryGroups[slug]?.length || 0) > 0;
  });

  const nextGate = myPathData?.nextGate;

  return (
    <div className="min-h-screen pb-20" data-testid="academy-landing">
      <div className="p-3 sm:p-4 flex flex-col gap-3 max-w-lg mx-auto">

        <div className="flex items-center justify-between gap-3" data-testid="academy-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-extrabold text-sm flex-shrink-0">
              {(user?.firstName || user?.username || "K")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate" data-testid="text-user-name">
                {user?.firstName || user?.username || "Kullanıcı"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate" data-testid="text-user-role">
                {ROLE_LABELS[user?.role || ""] || user?.role}
                {user?.branchName ? ` · ${user.branchName}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {streakDays > 0 && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 gap-1" data-testid="badge-streak">
                <Flame className="h-3 w-3" />
                {streakDays} gün
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4" data-testid="academy-tabs">
            <TabsTrigger value="home" className="text-xs gap-1" data-testid="tab-home">
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ana Sayfa</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="text-xs gap-1" data-testid="tab-training">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eğitimler</span>
            </TabsTrigger>
            <TabsTrigger value="career" className="text-xs gap-1" data-testid="tab-career">
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kariyer</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs gap-1" data-testid="tab-tools">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Araçlar</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "home" && (
          <div className="flex flex-col gap-3">

            {!dobodyDismissed && nbaAction && (
              <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30" data-testid="card-dobody">
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2.5 items-start flex-1 min-w-0">
                      <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                          Mr. Dobody Önerisi
                        </div>
                        <div className="text-[13px] leading-relaxed" data-testid="text-dobody-message">
                          <strong>{nbaAction.title}</strong>
                          {nbaAction.reason && (
                            <span className="text-muted-foreground"> — {nbaAction.reason}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDobodyDismissed(true); }}
                      className="text-muted-foreground flex-shrink-0 p-0.5"
                      data-testid="button-dismiss-dobody"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    className="w-full mt-3"
                    onClick={() => navigate(nbaAction.deepLink || "/akademi/genel-egitimler")}
                    data-testid="button-dobody-action"
                  >
                    Devam Et
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {!userIsHQ && (
              <Card data-testid="card-career-progress">
                <CardContent className="p-4">
                  {pathLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                            Kariyer Seviyesi
                          </div>
                          <div className="text-xl font-extrabold mt-0.5" data-testid="text-career-level">
                            {myPathData?.currentLevel?.titleTr || currentLevel?.titleTr || "Stajyer"}
                          </div>
                          {nextLevel && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Hedef: {nextLevel.titleTr}
                            </div>
                          )}
                        </div>
                        <CircularScore value={compositeScore} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <ScoreBar label="Eğitim" value={trainingScore} icon={BookOpen} />
                        <ScoreBar label="Pratik" value={practicalScore} icon={Wrench} />
                        <ScoreBar label="Devam" value={attendanceScore} icon={Calendar} />
                        <ScoreBar label="Yönetici" value={managerScore} icon={Star} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {mandatoryModules.length > 0 && (
              <div data-testid="section-mandatory">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h2 className="font-extrabold text-sm">Zorunlu Eğitimler</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/akademi/genel-egitimler")} data-testid="button-see-all-mandatory">
                    Tümünü Gör
                  </Button>
                </div>

                <div className="space-y-2">
                  {mandatoryIncomplete.slice(0, 4).map((m: any) => {
                    const prog = getModuleProgress(m.id);
                    const catCfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.genel_gelisim;
                    const CatIcon = catCfg.icon;
                    const isUrgent = prog > 0;

                    return (
                      <Card
                        key={m.id}
                        className={`cursor-pointer hover-elevate ${isUrgent ? "border-destructive/30 bg-destructive/5" : ""}`}
                        onClick={() => navigate(`/akademi-modul/${m.id}`)}
                        data-testid={`card-mandatory-${m.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[13px] line-clamp-1" data-testid={`text-mandatory-title-${m.id}`}>
                                {m.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="flex items-center gap-0.5">
                                  <CatIcon className="h-3 w-3" />
                                  {CATEGORY_LABELS[m.category] || m.category}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {m.estimatedDuration || 30} dk
                                </span>
                              </p>
                            </div>
                            {isUrgent && (
                              <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                                Devam
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isUrgent ? "bg-destructive" : "bg-emerald-500"}`}
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground flex-shrink-0">{prog}%</span>
                            <Button size="sm" variant={isUrgent ? "default" : "outline"} className="flex-shrink-0" data-testid={`button-mandatory-${m.id}`}>
                              {prog > 0 ? "Devam" : "Başla"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {mandatoryIncomplete.length === 0 && mandatoryModules.length > 0 && (
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardContent className="p-3 text-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" data-testid="text-mandatory-complete">
                          Tüm zorunlu eğitimler tamamlandı!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {dailyLoading ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : dailyRec?.module && !dailyRec.alreadyCompletedToday ? (
              <Card
                className="cursor-pointer hover-elevate bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20"
                onClick={() => navigate(`/akademi-modul/${dailyRec.module!.id}`)}
                data-testid="card-daily-module"
              >
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-1 text-[10px]">Bugünün Eğitimi</Badge>
                      <h3 className="font-bold text-[13px] line-clamp-1" data-testid="text-daily-title">{dailyRec.module.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-0.5">
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
              <Card className="bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20" data-testid="card-daily-done">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" data-testid="text-daily-completed">Bugünkü eğitimini tamamladın!</p>
                      <p className="text-xs text-muted-foreground">Toplam {dailyRec.totalCompleted} modül tamamlandı</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {inProgressModules.length > 0 && (
              <div data-testid="section-resume">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-4 w-4 text-primary" />
                  <h2 className="font-extrabold text-sm">Kaldığın Yerden Devam Et</h2>
                </div>
                <div className="space-y-2">
                  {inProgressModules.slice(0, 3).map((m: any) => {
                    const catCfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.genel_gelisim;
                    const CatIcon = catCfg.icon;
                    const prog = getModuleProgress(m.id);

                    return (
                      <Card
                        key={m.id}
                        className="cursor-pointer hover-elevate border-primary/20 bg-primary/5"
                        onClick={() => navigate(`/akademi-modul/${m.id}`)}
                        data-testid={`card-resume-${m.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catCfg.gradient} flex items-center justify-center flex-shrink-0`}>
                              <CatIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[13px] line-clamp-1" data-testid={`text-resume-title-${m.id}`}>{m.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${prog}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground flex-shrink-0">{prog}%</span>
                              </div>
                            </div>
                            <Button size="sm" className="flex-shrink-0" data-testid={`button-resume-${m.id}`}>
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
                <h2 className="font-extrabold text-sm flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Kategoriler
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/akademi/kesfet")} data-testid="button-explore-all">
                  Tümünü Gör
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeCategories.map(([slug, config]) => {
                  const count = categoryGroups[slug]?.length || 0;
                  const CatIcon = config.icon;
                  const completedInCat = (categoryGroups[slug] || []).filter((m: any) => getModuleStatus(m.id) === "completed").length;

                  return (
                    <button
                      key={slug}
                      className="rounded-xl p-3 text-center cursor-pointer transition-transform bg-gradient-to-br from-muted/60 to-muted/30 border border-border/50 hover-elevate"
                      onClick={() => navigate(`/akademi/kesfet?kategori=${slug}`)}
                      data-testid={`card-category-${slug}`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center mx-auto mb-1.5`}>
                        <CatIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <p className="font-bold text-[10px] line-clamp-1 leading-tight">{CATEGORY_LABELS[slug]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {completedInCat > 0 ? `${completedInCat}/${count}` : `${count} modül`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {weeklyLoading ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : weeklyProgress ? (
              <div className="grid grid-cols-3 gap-2" data-testid="stats-weekly">
                <Card>
                  <CardContent className="p-2.5 text-center">
                    <div className="text-lg font-bold text-primary" data-testid="text-weekly-completed">{weeklyProgress.completedThisWeek}</div>
                    <div className="text-[10px] text-muted-foreground">Bu Hafta</div>
                    <Progress value={Math.min(100, Math.round((weeklyProgress.completedThisWeek / Math.max(1, weeklyProgress.weeklyTarget)) * 100))} className="h-1 mt-1" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 text-center">
                    <div className="text-lg font-bold text-amber-500" data-testid="text-streak-count">{streakDays}</div>
                    <div className="text-[10px] text-muted-foreground">Gün Seri</div>
                    <div className="flex justify-center mt-1">
                      <Flame className={`h-4 w-4 text-amber-500 ${streakDays >= 7 ? 'animate-pulse' : ''}`} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 text-center">
                    <div className="text-lg font-bold" data-testid="text-total-completed">{Number(dailyRec?.totalCompleted ?? 0)}</div>
                    <div className="text-[10px] text-muted-foreground">Toplam</div>
                    <div className="flex justify-center mt-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {user?.role === "stajyer" && (
              <Card className="border-teal-500/20 bg-gradient-to-r from-teal-500/10 to-transparent" data-testid="section-stajyer-onboarding">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">Oryantasyon Programı</h2>
                      <p className="text-[11px] text-muted-foreground">14 günlük onboarding adımları</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/kesfet?kategori=onboarding")} data-testid="button-stajyer-onboarding">
                      <Target className="h-4 w-4" />
                      <span className="text-xs">Oryantasyon</span>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/benim-yolum")} data-testid="button-stajyer-path">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Kariyer Yolum</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "training" && (
          <div className="flex flex-col gap-3">
            <div className="bg-muted/50 rounded-xl p-1 flex gap-1" data-testid="training-filter">
              {(["all", "mandatory", "optional"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTrainingFilter(f)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    trainingFilter === f
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`filter-${f}`}
                >
                  {f === "all" ? "Tümü" : f === "mandatory" ? "Zorunlu" : "İsteğe Bağlı"}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="category-chips">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  !categoryFilter
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
                data-testid="chip-all"
              >
                Tümü
              </button>
              {activeCategories.map(([slug, config]) => {
                const CatIcon = config.icon;
                return (
                  <button
                    key={slug}
                    onClick={() => setCategoryFilter(categoryFilter === slug ? null : slug)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                      categoryFilter === slug
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                    data-testid={`chip-${slug}`}
                  >
                    <CatIcon className="h-3 w-3" />
                    {CATEGORY_LABELS[slug]}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {filteredModules.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Bu filtreye uygun modül bulunamadı.</p>
                  </CardContent>
                </Card>
              )}
              {filteredModules.slice(0, 20).map((m: any) => {
                const catCfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.genel_gelisim;
                const CatIcon = catCfg.icon;
                const prog = getModuleProgress(m.id);
                const status = getModuleStatus(m.id);

                return (
                  <Card
                    key={m.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/akademi-modul/${m.id}`)}
                    data-testid={`card-module-${m.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${catCfg.gradient} flex items-center justify-center flex-shrink-0`}>
                          <CatIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-[13px] line-clamp-1 flex-1" data-testid={`text-module-title-${m.id}`}>
                              {m.title}
                            </p>
                            {m.isRequired && (
                              <Badge variant="destructive" className="text-[9px] flex-shrink-0">Zorunlu</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span>{CATEGORY_LABELS[m.category] || m.category}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {m.estimatedDuration || 30} dk
                            </span>
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${status === "completed" ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground flex-shrink-0">
                              {status === "completed" ? (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle className="h-3 w-3" /> Tamam
                                </span>
                              ) : `${prog}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredModules.length > 20 && (
                <Button variant="outline" className="w-full" onClick={() => navigate("/akademi/genel-egitimler")} data-testid="button-more-modules">
                  +{filteredModules.length - 20} modül daha
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === "career" && (
          <div className="flex flex-col gap-3">
            <Card data-testid="card-career-timeline">
              <CardContent className="p-4">
                <h3 className="font-extrabold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Kariyer Yolculuğun
                </h3>
                <div className="relative pl-8">
                  <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-border" />
                  {CAREER_LEVELS.map((l, i) => {
                    const isCurrent = currentLevel?.levelNumber === l.levelNumber;
                    const isDone = (currentLevel?.levelNumber || 1) > l.levelNumber;
                    const isLocked = !isDone && !isCurrent;

                    return (
                      <div key={l.id} className={`relative ${i < CAREER_LEVELS.length - 1 ? "mb-5" : ""}`}>
                        <div className={`absolute -left-5 top-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10 border-2 ${
                          isDone ? "bg-emerald-500 border-emerald-500" :
                          isCurrent ? "bg-primary border-primary ring-4 ring-primary/20" :
                          "bg-muted border-border"
                        }`}>
                          {isDone && <CheckCircle className="h-3 w-3 text-white" />}
                          {isCurrent && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`text-[13px] ${isCurrent ? "font-extrabold" : isDone ? "font-semibold text-muted-foreground" : "font-medium"}`}>
                              Seviye {l.levelNumber}: {l.titleTr}
                            </div>
                            {isCurrent && (
                              <div className="text-[11px] text-primary mt-0.5 font-semibold">
                                Mevcut seviyesin
                              </div>
                            )}
                          </div>
                          {isDone && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Tamamlandı</span>}
                          {isLocked && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Kilitli
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {nextGate && (
              <Card data-testid="card-next-gate">
                <CardContent className="p-4">
                  <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Sonraki Kapı: {nextGate.titleTr}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground mb-1" />
                      <div className="text-xs font-bold">Modüller</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {nextGate.requiredModulesCompleted}/{nextGate.requiredModulesTotal}
                      </div>
                      <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${nextGate.allModulesCompleted ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${nextGate.requiredModulesTotal > 0 ? (nextGate.requiredModulesCompleted / nextGate.requiredModulesTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground mb-1" />
                      <div className="text-xs font-bold">Kompozit Skor</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Number(nextGate.currentCompositeScore ?? 0).toFixed(0)} / {nextGate.compositeScoreRequired}
                      </div>
                      <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${Number(nextGate.currentCompositeScore ?? 0) >= nextGate.compositeScoreRequired ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, (Number(nextGate.currentCompositeScore ?? 0) / nextGate.compositeScoreRequired) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-3" variant="outline" onClick={() => navigate("/akademi/benim-yolum")} data-testid="button-view-path">
                    Detayları Gör
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/akademi/rozetler")}
              data-testid="card-badges-link"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">Rozetlerim</h3>
                    <p className="text-xs text-muted-foreground">Kazandığın rozetleri görüntüle</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/akademi/siralama")}
              data-testid="card-leaderboard-link"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">Sıralama</h3>
                    <p className="text-xs text-muted-foreground">Lider tablosunda yerini gör</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "tools" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2" data-testid="section-quick-links">
              {[
                { label: "Reçeteler", icon: ChefHat, path: "/receteler", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
                { label: "Bilgi Bankası", icon: Library, path: "/akademi/bilgi-bankasi", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
                { label: "AI Asistan", icon: Brain, path: "/akademi/ai-kanit", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
                { label: "Benim Yolum", icon: TrendingUp, path: "/akademi/benim-yolum", color: "text-primary", bgColor: "bg-primary/10" },
                { label: "Sınavlar", icon: ClipboardCheck, path: "/akademi/sinavlar", color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
                { label: "Rozetlerim", icon: Award, path: "/akademi/rozetler", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
                { label: "Sıralama", icon: Trophy, path: "/akademi/siralama", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
              ].map((link) => {
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
                      <p className="text-xs font-semibold line-clamp-1">{link.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {(isCoach || user?.role === 'admin') && (
              <Card data-testid="section-coach-tools">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-bold text-sm">Yönetim Araçları</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/icerik-kutuphanesi")} data-testid="button-coach-library">
                      <Library className="h-4 w-4" />
                      <span className="text-xs">İçerik Kütüphanesi</span>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/onboarding-studio")} data-testid="button-coach-onboarding">
                      <GraduationCap className="h-4 w-4" />
                      <span className="text-xs">Onboarding Studio</span>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/takim-ilerleme")} data-testid="button-coach-progress">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Takım İlerlemesi</span>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/analitik")} data-testid="button-coach-analytics">
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
                    <h2 className="font-bold text-sm">Ekip Yönetimi</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/supervisor")} data-testid="button-supervisor-team">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Ekip Takibi</span>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/akademi/supervisor-onboarding")} data-testid="button-supervisor-onboarding">
                      <GraduationCap className="h-4 w-4" />
                      <span className="text-xs">Onboarding Onayları</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate("/akademi/genel-egitimler")} data-testid="button-all-modules">
              <BookOpen className="h-4 w-4 mr-2" />
              Tüm Eğitim Modüllerini Gör
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
